alter table public.players
  add column if not exists default_futsal_position text
    check (default_futsal_position in ('goalkeeper','fixed','winger','pivot','other')),
  add column if not exists default_field_position text
    check (default_field_position in ('goalkeeper','full_back','center_back','defensive_mid','midfielder','winger','striker','other'));

update public.players
set
  default_futsal_position = case
    when default_futsal_position is not null then default_futsal_position
    when default_position in ('goalkeeper','fixed','winger','pivot','other') then default_position
    else null
  end,
  default_field_position = case
    when default_field_position is not null then default_field_position
    when default_position in ('goalkeeper','full_back','center_back','defensive_mid','midfielder','winger','striker','other') then default_position
    else null
  end;

create or replace function public.confirm_public_game_presence(
  _token text,
  _name text,
  _attendance_status text,
  _sport_type text,
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
  resolved_sport_type text;
  allowed boolean := false;
begin
  select g.* into game_record
  from public.games g
  where g.public_invite_token = _token
    and g.public_invite_active
    and g.status = 'scheduled'
  for update;

  if game_record.id is null then raise exception 'invite unavailable' using errcode = 'P0001'; end if;
  if length(trim(coalesce(_name, ''))) < 2 then raise exception 'invalid name' using errcode = 'P0001'; end if;
  if _attendance_status not in ('confirmed','declined') then raise exception 'invalid attendance status' using errcode = 'P0001'; end if;

  if _attendance_status = 'confirmed' then
    resolved_sport_type := case when game_record.game_format = 'field' then 'football' else 'futsal' end;
    if resolved_sport_type = 'futsal' then
      allowed := _position in ('goalkeeper','fixed','winger','pivot','other');
    else
      allowed := _position in ('goalkeeper','full_back','center_back','defensive_mid','midfielder','winger','striker','other');
    end if;
    if not allowed then raise exception 'invalid position' using errcode = 'P0001'; end if;
  else
    resolved_sport_type := null;
    _position := null;
  end if;

  insert into public.game_guest_confirmations(organization_id,game_id,name,attendance_status,sport_type,position)
  values(game_record.organization_id,game_record.id,trim(_name),_attendance_status,resolved_sport_type,_position)
  returning id into confirmation_id;
  return confirmation_id;
end;
$$;

create or replace function public.respond_my_game_attendance(_game_id uuid,_status text,_position text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  player_record public.players;
  game_record public.games;
  roster_record public.game_players;
  saved_status text;
  local_now timestamp;
  resolved_sport_type text;
  allowed boolean := false;
begin
  if _status not in ('confirmed', 'declined') then raise exception 'invalid attendance status' using errcode = 'P0001'; end if;
  local_now := now() at time zone 'America/Bahia';

  select p.* into player_record
  from public.players p
  where p.user_id = auth.uid() and p.status = 'active'
  limit 1;

  if player_record.id is null then raise exception 'player unavailable' using errcode = 'P0001'; end if;

  select g.* into game_record
  from public.games g
  where g.id = _game_id and g.organization_id = player_record.organization_id;

  if game_record.id is null
    or game_record.status <> 'scheduled'
    or game_record.game_date < local_now::date
    or (game_record.game_date = local_now::date and game_record.start_time is not null and game_record.start_time <= local_now::time)
  then raise exception 'game unavailable' using errcode = 'P0001'; end if;

  if _status = 'declined' then
    select gp.* into roster_record
    from public.game_players gp
    where gp.game_id = game_record.id and gp.player_id = player_record.id and gp.attendance_status = 'confirmed'
    limit 1;
    if roster_record.id is not null and roster_record.payment_status = 'paid' then
      raise exception 'payment already registered' using errcode = 'P0001';
    end if;
  end if;

  if _status = 'confirmed' then
    resolved_sport_type := case when game_record.game_format = 'field' then 'football' else 'futsal' end;
    if resolved_sport_type = 'futsal' then
      allowed := _position in ('goalkeeper','fixed','winger','pivot','other');
    else
      allowed := _position in ('goalkeeper','full_back','center_back','defensive_mid','midfielder','winger','striker','other');
    end if;
    if not allowed then raise exception 'invalid position' using errcode = 'P0001'; end if;

    update public.players
    set
      default_position = _position,
      default_futsal_position = case when resolved_sport_type = 'futsal' then _position else default_futsal_position end,
      default_field_position = case when resolved_sport_type = 'football' then _position else default_field_position end
    where id = player_record.id and organization_id = player_record.organization_id;
  else
    resolved_sport_type := null;
    _position := null;
  end if;

  insert into public.game_attendances(organization_id,game_id,player_id,status,sport_type,position,team_number,responded_at)
  values(player_record.organization_id,game_record.id,player_record.id,_status,resolved_sport_type,_position,null,now())
  on conflict (game_id, player_id)
  do update set
    status = excluded.status,
    sport_type = excluded.sport_type,
    position = excluded.position,
    team_number = null,
    responded_at = now(),
    updated_at = now()
  returning status into saved_status;
  return saved_status;
end;
$$;

create or replace function public.respond_my_game_attendance(_game_id uuid,_status text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  saved_position text;
  game_format text;
begin
  select g.game_format into game_format from public.games g where g.id = _game_id;
  select case
    when game_format = 'field' then coalesce(p.default_field_position, p.default_position)
    else coalesce(p.default_futsal_position, p.default_position)
  end
  into saved_position
  from public.players p
  where p.user_id = auth.uid() and p.status = 'active'
  limit 1;
  return public.respond_my_game_attendance(_game_id, _status, saved_position);
end;
$$;

drop function if exists public.get_my_player_games();
create function public.get_my_player_games()
returns table(game_id uuid,title text,game_date date,start_time time,location text,player_price numeric,status text,attendance_status text,attendance_locked boolean,game_format text,attendance_position text,default_position text)
language sql security definer set search_path = '' stable
as $$
  select g.id,g.title,g.game_date,g.start_time,g.location,g.player_price,g.status,
    coalesce(gp.attendance_status, 'pending'),
    (g.status <> 'scheduled'
      or g.game_date < (now() at time zone 'America/Bahia')::date
      or (g.game_date = (now() at time zone 'America/Bahia')::date and g.start_time is not null and g.start_time <= (now() at time zone 'America/Bahia')::time)),
    g.game_format,
    gp.position,
    case when g.game_format = 'field' then coalesce(p.default_field_position,p.default_position) else coalesce(p.default_futsal_position,p.default_position) end
  from public.players p
  join public.games g on g.organization_id = p.organization_id
  left join public.game_players gp on gp.organization_id = p.organization_id and gp.game_id = g.id and gp.player_id = p.id
  where p.user_id = auth.uid() and p.status = 'active'
    and g.game_date >= (now() at time zone 'America/Bahia')::date
  order by g.game_date,g.start_time nulls last;
$$;

drop function if exists public.get_my_player_default_positions();
create function public.get_my_player_default_positions()
returns table(futsal_position text,field_position text)
language sql security definer set search_path = '' stable
as $$
  select p.default_futsal_position,p.default_field_position
  from public.players p
  where p.user_id = auth.uid() and p.status = 'active'
  limit 1;
$$;

create or replace function public.update_my_player_positions(_futsal_position text,_field_position text)
returns boolean
language plpgsql security definer set search_path = ''
as $$
begin
  if _futsal_position is not null and _futsal_position not in ('goalkeeper','fixed','winger','pivot','other')
  then raise exception 'invalid futsal position' using errcode = 'P0001'; end if;
  if _field_position is not null and _field_position not in ('goalkeeper','full_back','center_back','defensive_mid','midfielder','winger','striker','other')
  then raise exception 'invalid field position' using errcode = 'P0001'; end if;

  update public.players
  set default_futsal_position = _futsal_position,
      default_field_position = _field_position,
      default_position = coalesce(_futsal_position,_field_position,default_position)
  where user_id = auth.uid() and status = 'active';

  if not found then raise exception 'player unavailable' using errcode = 'P0001'; end if;
  return true;
end;
$$;

drop function if exists public.get_my_confirmed_game_roster();
create function public.get_my_confirmed_game_roster()
returns table(game_id uuid,player_name text,source text,"position" text,team_number integer,is_current_user boolean)
language sql security definer set search_path = '' stable
as $$
  with me as (
    select p.id as player_id,p.organization_id
    from public.players p
    where p.user_id = auth.uid() and p.status = 'active'
    limit 1
  )
  select gp.game_id,gp.name,gp.source,gp.position,gp.team_number,gp.player_id = me.player_id
  from public.game_players gp
  join public.games g on g.id = gp.game_id and g.organization_id = gp.organization_id
  join me on me.organization_id = gp.organization_id
  where gp.attendance_status = 'confirmed'
    and g.status = 'scheduled'
    and g.game_date >= (now() at time zone 'America/Bahia')::date
  order by gp.game_id,gp.team_number nulls last,gp.source,gp.name;
$$;

create or replace function public.get_public_game_roster(_token text)
returns table(player_name text,source text,"position" text,team_number integer)
language sql security definer set search_path = '' stable
as $$
  select gp.name,gp.source,gp.position,gp.team_number
  from public.games g
  join public.game_players gp on gp.game_id = g.id and gp.organization_id = g.organization_id
  where g.public_invite_token = _token
    and g.public_invite_active
    and g.status = 'scheduled'
    and gp.attendance_status = 'confirmed'
  order by gp.team_number nulls last,gp.source,gp.name;
$$;

drop function if exists public.get_my_player_game_history();
create function public.get_my_player_game_history()
returns table(game_id uuid,title text,game_date date,start_time time,location text,player_price numeric,status text,attendance_status text,"position" text,team_number integer,payment_status text,amount numeric,goals bigint,yellow_cards bigint,red_cards bigint)
language sql security definer set search_path = '' stable
as $$
  with me as (
    select p.id as player_id,p.organization_id
    from public.players p
    where p.user_id = auth.uid() and p.status = 'active'
    limit 1
  ),
  events as (
    select ge.game_id,
      coalesce(sum(ge.quantity) filter (where ge.event_type = 'goal'),0)::bigint as goals,
      coalesce(sum(ge.quantity) filter (where ge.event_type = 'yellow_card'),0)::bigint as yellow_cards,
      coalesce(sum(ge.quantity) filter (where ge.event_type = 'red_card'),0)::bigint as red_cards
    from public.game_events ge
    join me on me.organization_id = ge.organization_id
    left join public.game_guest_confirmations gc on gc.id = ge.guest_confirmation_id
    where ge.player_id = me.player_id or gc.player_id = me.player_id
    group by ge.game_id
  )
  select g.id,g.title,g.game_date,g.start_time,g.location,g.player_price,g.status,
    gp.attendance_status,gp.position,gp.team_number,gp.payment_status,gp.amount,
    coalesce(events.goals,0),coalesce(events.yellow_cards,0),coalesce(events.red_cards,0)
  from me
  join public.game_players gp on gp.organization_id = me.organization_id and gp.player_id = me.player_id
  join public.games g on g.id = gp.game_id and g.organization_id = gp.organization_id
  left join events on events.game_id = g.id
  where g.game_date < (now() at time zone 'America/Bahia')::date or g.status in ('completed','canceled')
  order by g.game_date desc,g.start_time desc nulls last
  limit 30;
$$;

revoke all on function public.get_my_player_games() from public;
revoke all on function public.get_my_player_default_positions() from public;
revoke all on function public.update_my_player_positions(text,text) from public;
revoke all on function public.get_my_confirmed_game_roster() from public;
revoke all on function public.get_public_game_roster(text) from public;
revoke all on function public.get_my_player_game_history() from public;

grant execute on function public.get_my_player_games() to authenticated;
grant execute on function public.get_my_player_default_positions() to authenticated;
grant execute on function public.update_my_player_positions(text,text) to authenticated;
grant execute on function public.get_my_confirmed_game_roster() to authenticated;
grant execute on function public.get_public_game_roster(text) to anon, authenticated;
grant execute on function public.get_my_player_game_history() to authenticated;
