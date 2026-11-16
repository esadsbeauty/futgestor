
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
  charge_record public.game_charges;
  saved_status text;
  local_now timestamp;
  resolved_sport_type text;
  allowed boolean := false;
begin
  if _status not in ('confirmed', 'declined') then
    raise exception 'invalid attendance status' using errcode = 'P0001';
  end if;

  local_now := now() at time zone 'America/Bahia';

  select p.*
  into player_record
  from public.players p
  where p.user_id = auth.uid()
    and p.status = 'active'
  limit 1;

  if player_record.id is null then
    raise exception 'player unavailable' using errcode = 'P0001';
  end if;

  select g.*
  into game_record
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

  if _status = 'declined' then
    select gc.*
    into charge_record
    from public.game_charges gc
    where gc.game_id = game_record.id
      and gc.player_id = player_record.id;

    if charge_record.id is not null and charge_record.status = 'paid' then
      raise exception 'payment already registered' using errcode = 'P0001';
    end if;
  end if;

  if _status = 'confirmed' then
    resolved_sport_type := case
      when game_record.game_format = 'field' then 'football'
      else 'futsal'
    end;

    if resolved_sport_type = 'futsal' then
      allowed := _position in ('goalkeeper','fixed','winger','pivot','other');
    else
      allowed := _position in (
        'goalkeeper','full_back','center_back','defensive_mid',
        'midfielder','winger','striker','other'
      );
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
    organization_id,
    game_id,
    player_id,
    status,
    sport_type,
    position,
    team_number,
    responded_at
  )
  values(
    player_record.organization_id,
    game_record.id,
    player_record.id,
    _status,
    resolved_sport_type,
    _position,
    null,
    now()
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
  select p.default_position
  into saved_position
  from public.players p
  where p.user_id = auth.uid()
    and p.status = 'active'
  limit 1;

  return public.respond_my_game_attendance(_game_id, _status, saved_position);
end;
$$;

revoke all on function public.respond_my_game_attendance(uuid,text,text) from public;
revoke all on function public.respond_my_game_attendance(uuid,text) from public;
grant execute on function public.respond_my_game_attendance(uuid,text,text) to authenticated;
grant execute on function public.respond_my_game_attendance(uuid,text) to authenticated;
