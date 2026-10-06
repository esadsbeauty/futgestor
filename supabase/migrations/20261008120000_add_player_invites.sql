create table public.player_invites (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  token text not null unique,
  billing_type text check (billing_type is null or billing_type in ('monthly','per_game')),
  active boolean not null default true,
  expires_at timestamptz,
  max_uses integer check (max_uses is null or max_uses > 0),
  uses_count integer not null default 0 check (uses_count >= 0),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index player_invites_org_idx on public.player_invites(organization_id,created_at desc);
alter table public.player_invites enable row level security;
create policy "invites read members" on public.player_invites for select using (public.is_org_member(organization_id));
create policy "invites insert members" on public.player_invites for insert with check (public.is_org_member(organization_id) and created_by=auth.uid());
create policy "invites update members" on public.player_invites for update using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));

create or replace function public.get_player_invite(_token text)
returns table(organization_name text,billing_type text,available boolean)
language plpgsql security definer set search_path='' as $$
begin
  return query select o.name,i.billing_type,
    (i.active and (i.expires_at is null or i.expires_at > now()) and (i.max_uses is null or i.uses_count < i.max_uses))
  from public.player_invites i join public.organizations o on o.id=i.organization_id where i.token=_token;
end $$;

create or replace function public.accept_player_invite(_token text,_name text,_whatsapp text)
returns table(organization_name text,player_name text)
language plpgsql security definer set search_path='' as $$
declare inv public.player_invites; org public.organizations; phone text; effective_type text;
begin
  select * into inv from public.player_invites where token=_token for update;
  if inv.id is null or not inv.active or (inv.expires_at is not null and inv.expires_at <= now()) or (inv.max_uses is not null and inv.uses_count >= inv.max_uses) then raise exception 'invite unavailable' using errcode='P0001'; end if;
  if length(trim(_name)) < 2 then raise exception 'invalid name' using errcode='P0001'; end if;
  phone := regexp_replace(coalesce(_whatsapp,''),'[^0-9]','','g');
  if length(phone) < 10 or length(phone) > 13 then raise exception 'invalid whatsapp' using errcode='P0001'; end if;
  select * into org from public.organizations where id=inv.organization_id;
  effective_type := case org.billing_mode when 'monthly' then 'monthly' when 'per_game' then 'per_game' else inv.billing_type end;
  if effective_type is null or effective_type not in ('monthly','per_game') then raise exception 'invalid billing type' using errcode='P0001'; end if;
  perform pg_advisory_xact_lock(hashtextextended(inv.organization_id::text || phone,0));
  if exists(select 1 from public.players p where p.organization_id=inv.organization_id and regexp_replace(coalesce(p.phone,''),'[^0-9]','','g')=phone) then raise exception 'whatsapp already registered' using errcode='23505'; end if;
  insert into public.players(organization_id,name,phone,monthly_fee,due_day,joined_at,status,billing_type,notes)
    values(inv.organization_id,trim(_name),phone,org.default_monthly_fee,org.default_due_day,current_date,'active',effective_type,null);
  update public.player_invites set uses_count=uses_count+1,updated_at=now() where id=inv.id;
  return query select org.name,trim(_name);
end $$;
revoke all on function public.get_player_invite(text),public.accept_player_invite(text,text,text) from public;
grant execute on function public.get_player_invite(text),public.accept_player_invite(text,text,text) to anon,authenticated;
