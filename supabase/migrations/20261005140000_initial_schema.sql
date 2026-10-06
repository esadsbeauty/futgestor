create extension if not exists pgcrypto;
create type public.member_role as enum ('owner', 'admin', 'member');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text,
  created_at timestamptz not null default now()
);
create table public.organizations (
  id uuid primary key default gen_random_uuid(), name text not null, owner_id uuid not null references auth.users(id),
  default_monthly_fee numeric(12,2) not null default 0 check (default_monthly_fee >= 0),
  default_due_day integer not null check (default_due_day between 1 and 31), manager_name text, manager_phone text,
  created_at timestamptz not null default now()
);
create table public.organization_members (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade, role public.member_role not null default 'member',
  created_at timestamptz not null default now(), unique (organization_id, user_id)
);
create table public.players (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null, phone text, monthly_fee numeric(12,2) not null check (monthly_fee >= 0), due_day integer not null check (due_day between 1 and 31),
  joined_at date not null, status text not null default 'active' check (status in ('active','inactive')), notes text,
  created_at timestamptz not null default now()
);
create table public.monthly_fees (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
  player_id uuid not null, reference_month date not null check (reference_month = date_trunc('month', reference_month)::date),
  amount numeric(12,2) not null check (amount >= 0), due_date date not null, status text not null default 'pending' check (status in ('pending','paid')),
  paid_at timestamptz, created_at timestamptz not null default now(), unique (player_id, reference_month)
);
create table public.transactions (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
  player_id uuid, monthly_fee_id uuid,
  type text not null check (type in ('income','expense')), category text not null, description text,
  amount numeric(12,2) not null check (amount > 0), transaction_date date not null default current_date, created_at timestamptz not null default now()
);
create unique index transactions_monthly_fee_unique on public.transactions(monthly_fee_id) where monthly_fee_id is not null;
create table public.bills (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
  description text not null, amount numeric(12,2) not null check (amount > 0), due_date date not null,
  status text not null default 'pending' check (status in ('pending','paid')), paid_at timestamptz,
  transaction_id uuid unique, created_at timestamptz not null default now()
);
-- Composite keys prevent a client from linking records that belong to different organizations.
alter table public.players add constraint players_id_organization_unique unique (id, organization_id);
alter table public.monthly_fees add constraint fees_id_organization_unique unique (id, organization_id);
alter table public.transactions add constraint transactions_id_organization_unique unique (id, organization_id);
alter table public.monthly_fees add constraint fees_player_same_org foreign key (player_id, organization_id) references public.players(id, organization_id) on delete cascade;
alter table public.transactions add constraint transactions_player_same_org foreign key (player_id, organization_id) references public.players(id, organization_id) on delete set null (player_id);
alter table public.transactions add constraint transactions_fee_same_org foreign key (monthly_fee_id, organization_id) references public.monthly_fees(id, organization_id) on delete set null (monthly_fee_id);
alter table public.bills add constraint bills_transaction_same_org foreign key (transaction_id, organization_id) references public.transactions(id, organization_id) on delete set null (transaction_id);
create index players_organization_idx on public.players(organization_id);
create index monthly_fees_org_month_idx on public.monthly_fees(organization_id, reference_month);
create index transactions_org_date_idx on public.transactions(organization_id, transaction_date desc);
create index bills_org_due_idx on public.bills(organization_id, due_date);

create or replace function public.is_org_member(org_id uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.organization_members om where om.organization_id = org_id and om.user_id = auth.uid());
$$;
revoke all on function public.is_org_member(uuid) from public;
grant execute on function public.is_org_member(uuid) to authenticated;

alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.players enable row level security;
alter table public.monthly_fees enable row level security;
alter table public.transactions enable row level security;
alter table public.bills enable row level security;
create policy "profiles read own" on public.profiles for select using (id = auth.uid());
create policy "profiles update own" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());
create policy "organizations read members" on public.organizations for select using (public.is_org_member(id));
create policy "organizations insert owner" on public.organizations for insert with check (owner_id = auth.uid());
create policy "organizations update members" on public.organizations for update using (public.is_org_member(id)) with check (public.is_org_member(id));
create policy "organizations delete members" on public.organizations for delete using (public.is_org_member(id));
create policy "membership read members" on public.organization_members for select using (public.is_org_member(organization_id));
create policy "membership insert self owner" on public.organization_members for insert with check (user_id = auth.uid() and exists(select 1 from public.organizations o where o.id = organization_id and o.owner_id = auth.uid()));
create policy "membership update members" on public.organization_members for update using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));
create policy "membership delete members" on public.organization_members for delete using (public.is_org_member(organization_id));
do $$ declare t text; begin foreach t in array array['players','monthly_fees','transactions','bills'] loop
  execute format('create policy %I on public.%I for select using (public.is_org_member(organization_id))', t || ' read members', t);
  execute format('create policy %I on public.%I for insert with check (public.is_org_member(organization_id))', t || ' insert members', t);
  execute format('create policy %I on public.%I for update using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id))', t || ' update members', t);
  execute format('create policy %I on public.%I for delete using (public.is_org_member(organization_id))', t || ' delete members', t);
end loop; end $$;

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = '' as $$
declare org_id uuid; fee numeric(12,2); due_day integer;
begin
  fee := greatest(coalesce((new.raw_user_meta_data->>'default_monthly_fee')::numeric, 0), 0);
  due_day := least(greatest(coalesce((new.raw_user_meta_data->>'default_due_day')::integer, 10), 1), 31);
  insert into public.profiles(id,name,email) values(new.id,coalesce(nullif(new.raw_user_meta_data->>'name',''),split_part(new.email,'@',1)),new.email);
  insert into public.organizations(name,owner_id,default_monthly_fee,default_due_day) values(coalesce(nullif(new.raw_user_meta_data->>'organization_name',''),'Meu baba'),new.id,fee,due_day) returning id into org_id;
  insert into public.organization_members(organization_id,user_id,role) values(org_id,new.id,'owner');
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

create or replace function public.ensure_month_fees(_org uuid, _month date) returns setof public.monthly_fees language plpgsql security definer set search_path = '' as $$
declare month_start date := date_trunc('month', _month)::date; month_end date := (date_trunc('month', _month) + interval '1 month - 1 day')::date;
begin
  if not public.is_org_member(_org) then raise exception 'access denied' using errcode = '42501'; end if;
  return query insert into public.monthly_fees(organization_id,player_id,reference_month,amount,due_date)
    select _org,p.id,month_start,p.monthly_fee,least(month_start + (p.due_day - 1),month_end)
    from public.players p where p.organization_id = _org and p.status = 'active'
    on conflict (player_id,reference_month) do nothing returning *;
end $$;

create or replace function public.mark_fee_paid(_fee uuid) returns public.monthly_fees language plpgsql security definer set search_path = '' as $$
declare fee public.monthly_fees;
begin
  select * into fee from public.monthly_fees where id = _fee for update;
  if fee.id is null then raise exception 'fee not found'; end if;
  if not public.is_org_member(fee.organization_id) then raise exception 'access denied' using errcode = '42501'; end if;
  if fee.status <> 'paid' then
    update public.monthly_fees set status='paid',paid_at=now() where id=_fee returning * into fee;
    insert into public.transactions(organization_id,player_id,monthly_fee_id,type,category,description,amount,transaction_date)
      values(fee.organization_id,fee.player_id,fee.id,'income','Mensalidade','Pagamento de mensalidade',fee.amount,current_date)
      on conflict (monthly_fee_id) where monthly_fee_id is not null do nothing;
  end if;
  return fee;
end $$;

create or replace function public.mark_bill_paid(_bill uuid) returns public.bills language plpgsql security definer set search_path = '' as $$
declare bill public.bills; tx_id uuid;
begin
  select * into bill from public.bills where id = _bill for update;
  if bill.id is null then raise exception 'bill not found'; end if;
  if not public.is_org_member(bill.organization_id) then raise exception 'access denied' using errcode = '42501'; end if;
  if bill.status <> 'paid' then
    insert into public.transactions(organization_id,type,category,description,amount,transaction_date)
      values(bill.organization_id,'expense','Conta a pagar',bill.description,bill.amount,current_date) returning id into tx_id;
    update public.bills set status='paid',paid_at=now(),transaction_id=tx_id where id=_bill returning * into bill;
  end if;
  return bill;
end $$;
revoke all on function public.ensure_month_fees(uuid,date), public.mark_fee_paid(uuid), public.mark_bill_paid(uuid) from public;
grant execute on function public.ensure_month_fees(uuid,date), public.mark_fee_paid(uuid), public.mark_bill_paid(uuid) to authenticated;
