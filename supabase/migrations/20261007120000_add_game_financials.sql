create table public.games (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
  title text not null, game_date date not null, start_time time, location text,
  player_price numeric(12,2) not null check (player_price > 0), notes text,
  status text not null default 'scheduled' check (status in ('scheduled','completed','canceled')),
  created_by uuid not null references auth.users(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (id, organization_id)
);
create table public.game_expenses (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
  game_id uuid not null, description text not null, category text not null default 'other' check (category in ('rental','referee','water','other')),
  amount numeric(12,2) not null check (amount > 0), status text not null default 'pending' check (status in ('pending','paid')),
  paid_at timestamptz, transaction_id uuid unique, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (id, organization_id), foreign key (game_id, organization_id) references public.games(id, organization_id) on delete cascade,
  foreign key (transaction_id, organization_id) references public.transactions(id, organization_id) on delete set null (transaction_id)
);
create table public.game_charges (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
  game_id uuid not null, player_id uuid not null, amount numeric(12,2) not null check (amount > 0),
  status text not null default 'pending' check (status in ('pending','paid')), paid_at timestamptz, transaction_id uuid unique,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique (id, organization_id), unique (game_id, player_id),
  foreign key (game_id, organization_id) references public.games(id, organization_id) on delete cascade,
  foreign key (player_id, organization_id) references public.players(id, organization_id) on delete restrict,
  foreign key (transaction_id, organization_id) references public.transactions(id, organization_id) on delete set null (transaction_id)
);
create index games_org_date_idx on public.games(organization_id, game_date desc);
create index game_expenses_game_idx on public.game_expenses(game_id);
create index game_charges_game_idx on public.game_charges(game_id);

alter table public.games enable row level security;
alter table public.game_expenses enable row level security;
alter table public.game_charges enable row level security;
do $$ declare t text; begin foreach t in array array['games','game_expenses','game_charges'] loop
  execute format('create policy %I on public.%I for select using (public.is_org_member(organization_id))', t || ' read members', t);
  execute format('create policy %I on public.%I for insert with check (public.is_org_member(organization_id))', t || ' insert members', t);
end loop; end $$;
create policy "games update members" on public.games for update using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));
create policy "game charges delete pending" on public.game_charges for delete using (public.is_org_member(organization_id) and status = 'pending');
create policy "game expenses delete pending" on public.game_expenses for delete using (public.is_org_member(organization_id) and status = 'pending');

create or replace function public.mark_game_charge_paid(_charge uuid) returns public.game_charges language plpgsql security definer set search_path = '' as $$
declare charge public.game_charges; tx uuid; game_title text; player_name text;
begin
  select * into charge from public.game_charges where id=_charge for update;
  if charge.id is null then raise exception 'charge not found'; end if;
  if not public.is_org_member(charge.organization_id) then raise exception 'access denied' using errcode='42501'; end if;
  if charge.status <> 'paid' then
    select g.title,p.name into game_title,player_name from public.games g join public.players p on p.id=charge.player_id where g.id=charge.game_id;
    insert into public.transactions(organization_id,player_id,type,category,description,amount,transaction_date)
      select charge.organization_id,charge.player_id,'income','Jogo',game_title || ' - ' || player_name,charge.amount,g.game_date from public.games g where g.id=charge.game_id returning id into tx;
    update public.game_charges set status='paid',paid_at=now(),transaction_id=tx,updated_at=now() where id=_charge returning * into charge;
  end if;
  return charge;
end $$;

create or replace function public.mark_game_expense_paid(_expense uuid) returns public.game_expenses language plpgsql security definer set search_path = '' as $$
declare expense public.game_expenses; tx uuid;
begin
  select * into expense from public.game_expenses where id=_expense for update;
  if expense.id is null then raise exception 'expense not found'; end if;
  if not public.is_org_member(expense.organization_id) then raise exception 'access denied' using errcode='42501'; end if;
  if expense.status <> 'paid' then
    insert into public.transactions(organization_id,type,category,description,amount,transaction_date)
      select expense.organization_id,'expense','Jogo',expense.description,expense.amount,g.game_date from public.games g where g.id=expense.game_id returning id into tx;
    update public.game_expenses set status='paid',paid_at=now(),transaction_id=tx,updated_at=now() where id=_expense returning * into expense;
  end if;
  return expense;
end $$;
revoke all on function public.mark_game_charge_paid(uuid),public.mark_game_expense_paid(uuid) from public;
grant execute on function public.mark_game_charge_paid(uuid),public.mark_game_expense_paid(uuid) to authenticated;
