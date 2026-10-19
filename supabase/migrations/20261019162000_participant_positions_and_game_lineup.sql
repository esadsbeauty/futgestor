alter table public.players
  add column if not exists default_position text
    check (default_position in (
      'goalkeeper','fixed','winger','pivot',
      'full_back','center_back','defensive_mid','midfielder','striker','other'
    ));

alter table public.game_attendances
  add column if not exists sport_type text
    check (sport_type in ('futsal','football')),
  add column if not exists position text
    check (position in (
      'goalkeeper','fixed','winger','pivot',
      'full_back','center_back','defensive_mid','midfielder','striker','other'
    )),
  add column if not exists team_number integer
    check (team_number between 1 and 4);

update public.players p
set default_position = src.position
from (
  select distinct on (c.player_id)
    c.player_id,
    c.position
  from public.game_guest_confirmations c
  join public.games g
    on g.id = c.game_id
   and g.organization_id = c.organization_id
  where c.player_id is not null
    and c.attendance_status = 'confirmed'
    and c.position is not null
  order by c.player_id, g.game_date desc, c.updated_at desc
) src
where p.id = src.player_id
  and p.default_position is null;

update public.players p
set default_position = src.position
from (
  select distinct on (p2.id)
    p2.id as player_id,
    c.position
  from public.players p2
  join public.game_guest_confirmations c
    on lower(trim(c.name)) = lower(trim(p2.name))
  join public.games g
    on g.id = c.game_id
   and g.organization_id = c.organization_id
   and g.organization_id = p2.organization_id
  where c.attendance_status = 'confirmed'
    and c.position is not null
  order by p2.id, g.game_date desc, c.updated_at desc
) src
where p.id = src.player_id
  and p.default_position is null;

update public.game_attendances ga
set
  position = coalesce(ga.position, p.default_position),
  sport_type = coalesce(
    ga.sport_type,
    case when g.game_format = 'field' then 'football' else 'futsal' end
  )
from public.players p, public.games g
where p.id = ga.player_id
  and p.organization_id = ga.organization_id
  and g.id = ga.game_id
  and g.organization_id = ga.organization_id
  and ga.status = 'confirmed';

drop function if exists public.get_my_player_games();

create function public.get_my_player_games()
returns table(
  game_id uuid,
  title text,
  game_date date,
  start_time time,
  location text,
  player_price numeric,
  status text,
  attendance_status text,
  attendance_locked boolean,
  game_format text,
  attendance_position text,
  default_position text
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
    coalesce(ga.status, 'pending'),
    (
      g.status <> 'scheduled'
      or g.game_date < (now() at time zone 'America/Bahia')::date
      or (
        g.game_date = (now() at time zone 'America/Bahia')::date
        and g.start_time is not null
        and g.start_time <= (now() at time zone 'America/Bahia')::time
      )
    ),
    g.game_format,
    ga.position,
    p.default_position
  from public.players p
  join public.games g on g.organization_id = p.organization_id
  left join public.game_attendances ga
    on ga.organization_id = p.organization_id
   and ga.game_id = g.id
   and ga.player_id = p.id
  where p.user_id = auth.uid()
    and p.status = 'active'
    and g.game_date >= (now() at time zone 'America/Bahia')::date
  order by g.game_date, g.start_time nulls last;
$$;

create or replace function public.respond_my_game_attendance(
  _game_id uuid,
  _status text,
  _position text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  player_record public.players;
  game_record public.games;
  saved_status text;
  local_now timestamp;
  resolved_sport_type text;
  allowed boolean := false;
begin
  if _status not in ('confirmed', 'declined') then
    raise exception 'invalid attendance status' using errcode = 'P0001';
  end if;

  local_now := now() at time zone 'America/Bahia';

  select p.* into player_record
  from public.players p
  where p.user_id = auth.uid()
    and p.status = 'active'
  limit 1;

  if player_record.id is null then
    raise exception 'player unavailable' using errcode = 'P0001';
  end if;

  select g.* into game_record
  from public.games g
  where g.id = _game_id
    and g.organization_id = player_record.organization_id;

  if game_record.id is null
    or game_record.status <> 'scheduled'
    or game_record.game_date < local_now::date
    or (
      game_record.game_date = local_now::date
      and game_record.start_time is not null
      and game_record.start_time <= local_now::time
    )
  then
    raise exception 'game unavailable' using errcode = 'P0001';
  end if;

  if _status = 'confirmed' then
    resolved_sport_type := case when game_record.game_format = 'field' then 'football' else 'futsal' end;

    if resolved_sport_type = 'futsal' then
      allowed := _position in ('goalkeeper','fixed','winger','pivot','other');
    else
      allowed := _position in ('goalkeeper','full_back','center_back','defensive_mid','midfielder','winger','striker','other');
    end if;

    if not allowed then
      raise exception 'invalid position' using errcode = 'P0001';
    end if;

    update public.players
    set default_position = _position
    where id = player_record.id
      and organization_id = player_record.organization_id;
  else
    resolved_sport_type := null;
    _position := null;
  end if;

  insert into public.game_attendances(
    organization_id,game_id,player_id,status,sport_type,position,team_number,responded_at
  )
  values(
    player_record.organization_id,game_record.id,player_record.id,_status,
    resolved_sport_type,_position,null,now()
  )
  on conflict (game_id, player_id)
  do update
    set status = excluded.status,
        sport_type = excluded.sport_type,
        position = excluded.position,
        team_number = null,
        responded_at = now(),
        updated_at = now()
  returning status into saved_status;

  return saved_status;
end;
$$;

create or replace function public.respond_my_game_attendance(
  _game_id uuid,
  _status text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  saved_position text;
begin
  select p.default_position into saved_position
  from public.players p
  where p.user_id = auth.uid()
    and p.status = 'active'
  limit 1;

  return public.respond_my_game_attendance(_game_id, _status, saved_position);
end;
$$;

revoke all on function public.get_my_player_games() from public;
revoke all on function public.respond_my_game_attendance(uuid,text,text) from public;
revoke all on function public.respond_my_game_attendance(uuid,text) from public;
grant execute on function public.get_my_player_games() to authenticated;
grant execute on function public.respond_my_game_attendance(uuid,text,text) to authenticated;
grant execute on function public.respond_my_game_attendance(uuid,text) to authenticated;
