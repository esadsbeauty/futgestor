create table public.game_attendances (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  game_id uuid not null,
  player_id uuid not null,
  status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'declined')),
  responded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (id, organization_id),
  unique (game_id, player_id),

  foreign key (game_id, organization_id)
    references public.games(id, organization_id)
    on delete cascade,

  foreign key (player_id, organization_id)
    references public.players(id, organization_id)
    on delete cascade
);

create index game_attendances_game_idx
  on public.game_attendances(game_id);

create index game_attendances_player_idx
  on public.game_attendances(player_id);

create index game_attendances_org_game_idx
  on public.game_attendances(organization_id, game_id);

alter table public.game_attendances enable row level security;

create policy "game attendances read members"
  on public.game_attendances
  for select
  using (public.is_org_member(organization_id));

create policy "game attendances insert members"
  on public.game_attendances
  for insert
  with check (public.is_org_member(organization_id));

create policy "game attendances update members"
  on public.game_attendances
  for update
  using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

create policy "game attendances delete members"
  on public.game_attendances
  for delete
  using (public.is_org_member(organization_id));


-- A assinatura muda porque agora retornamos attendance_status.
drop function if exists public.get_player_portal_games(text);

create function public.get_player_portal_games(_token text)
returns table(
  game_id uuid,
  title text,
  game_date date,
  start_time time,
  location text,
  player_price numeric,
  status text,
  attendance_status text
)
language sql
security definer
set search_path = ''
stable
as $$
  select
    g.id,
    g.title,
    g.game_date,
    g.start_time,
    g.location,
    g.player_price,
    g.status,
    coalesce(ga.status, 'pending') as attendance_status
  from public.player_access_tokens pat
  join public.players p
    on p.id = pat.player_id
   and p.organization_id = pat.organization_id
  join public.games g
    on g.organization_id = pat.organization_id
  left join public.game_attendances ga
    on ga.game_id = g.id
   and ga.player_id = pat.player_id
   and ga.organization_id = pat.organization_id
  where pat.token = _token
    and pat.active
    and (pat.expires_at is null or pat.expires_at > now())
    and p.status = 'active'
    and g.status = 'scheduled'
    and g.game_date >= current_date
  order by g.game_date, g.start_time nulls last;
$$;


create or replace function public.respond_game_attendance(
  _token text,
  _game_id uuid,
  _status text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  access_record public.player_access_tokens;
  player_record public.players;
  game_record public.games;
  saved_status text;
begin
  if _status not in ('confirmed', 'declined') then
    raise exception 'invalid attendance status'
      using errcode = 'P0001';
  end if;

  select pat.*
  into access_record
  from public.player_access_tokens pat
  where pat.token = _token;

  if access_record.id is null then
    raise exception 'access unavailable'
      using errcode = 'P0001';
  end if;

  if not access_record.active
    or (
      access_record.expires_at is not null
      and access_record.expires_at <= now()
    )
  then
    raise exception 'access unavailable'
      using errcode = 'P0001';
  end if;

  select p.*
  into player_record
  from public.players p
  where p.id = access_record.player_id
    and p.organization_id = access_record.organization_id;

  if player_record.id is null
    or player_record.status <> 'active'
  then
    raise exception 'player unavailable'
      using errcode = 'P0001';
  end if;

  select g.*
  into game_record
  from public.games g
  where g.id = _game_id
    and g.organization_id = access_record.organization_id;

  if game_record.id is null then
    raise exception 'game unavailable'
      using errcode = 'P0001';
  end if;

  if game_record.status <> 'scheduled'
    or game_record.game_date < current_date
  then
    raise exception 'game unavailable'
      using errcode = 'P0001';
  end if;

  insert into public.game_attendances (
    organization_id,
    game_id,
    player_id,
    status,
    responded_at
  )
  values (
    access_record.organization_id,
    game_record.id,
    player_record.id,
    _status,
    now()
  )
  on conflict (game_id, player_id)
  do update
    set status = excluded.status,
        responded_at = now(),
        updated_at = now()
  returning status into saved_status;

  return saved_status;
end;
$$;


revoke all
  on function public.get_player_portal_games(text)
  from public;

revoke all
  on function public.respond_game_attendance(text, uuid, text)
  from public;

grant execute
  on function public.get_player_portal_games(text)
  to anon, authenticated;

grant execute
  on function public.respond_game_attendance(text, uuid, text)
  to anon, authenticated;