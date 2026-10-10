alter table public.games
  add column if not exists game_format text not null default 'court'
    check (game_format in ('court','field')),
  add column if not exists public_invite_token text unique,
  add column if not exists public_invite_active boolean not null default true;

update public.games
set public_invite_token = replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '')
where public_invite_token is null;

alter table public.games
  alter column public_invite_token set not null;

create table public.game_guest_confirmations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  game_id uuid not null,
  name text not null,
  position text not null,
  team_number integer check (team_number between 1 and 4),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (game_id, organization_id)
    references public.games(id, organization_id) on delete cascade
);

create index game_guest_confirmations_game_idx
  on public.game_guest_confirmations(game_id, created_at);

alter table public.game_guest_confirmations enable row level security;

create policy "game guest confirmations read members"
on public.game_guest_confirmations
for select
using (public.is_org_member(organization_id));

create policy "game guest confirmations update members"
on public.game_guest_confirmations
for update
using (public.is_org_member(organization_id))
with check (public.is_org_member(organization_id));

create policy "game guest confirmations delete members"
on public.game_guest_confirmations
for delete
using (public.is_org_member(organization_id));

create or replace function public.get_public_game_invite(_token text)
returns table(
  available boolean,
  game_id uuid,
  organization_name text,
  title text,
  game_date date,
  start_time time,
  location text,
  game_format text,
  confirmed_count bigint
)
language sql
security definer
set search_path = ''
stable
as $$
  select
    true,
    g.id,
    o.name,
    g.title,
    g.game_date,
    g.start_time,
    g.location,
    g.game_format,
    (
      select count(*)
      from public.game_guest_confirmations c
      where c.game_id = g.id
        and c.organization_id = g.organization_id
    )
  from public.games g
  join public.organizations o on o.id = g.organization_id
  where g.public_invite_token = _token
    and g.public_invite_active
    and g.status = 'scheduled'
  limit 1;
$$;

revoke all on function public.get_public_game_invite(text) from public;
grant execute on function public.get_public_game_invite(text) to anon, authenticated;

create or replace function public.confirm_public_game_presence(
  _token text,
  _name text,
  _position text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  game_record public.games;
  confirmation_id uuid;
  allowed boolean := false;
begin
  select g.*
  into game_record
  from public.games g
  where g.public_invite_token = _token
    and g.public_invite_active
    and g.status = 'scheduled'
  for update;

  if game_record.id is null then
    raise exception 'invite unavailable' using errcode = 'P0001';
  end if;

  if length(trim(coalesce(_name, ''))) < 2 then
    raise exception 'invalid name' using errcode = 'P0001';
  end if;

  if game_record.game_format = 'court' then
    allowed := _position in ('goalkeeper','fixed','winger','pivot','other');
  else
    allowed := _position in ('goalkeeper','full_back','center_back','defensive_mid','midfielder','winger','striker','other');
  end if;

  if not allowed then
    raise exception 'invalid position' using errcode = 'P0001';
  end if;

  insert into public.game_guest_confirmations(
    organization_id,
    game_id,
    name,
    position
  )
  values(
    game_record.organization_id,
    game_record.id,
    trim(_name),
    _position
  )
  returning id into confirmation_id;

  return confirmation_id;
end;
$$;

revoke all on function public.confirm_public_game_presence(text,text,text) from public;
grant execute on function public.confirm_public_game_presence(text,text,text) to anon, authenticated;
