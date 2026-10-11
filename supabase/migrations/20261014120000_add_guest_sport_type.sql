alter table public.game_guest_confirmations
  add column if not exists sport_type text
    check (sport_type in ('futsal','football')),
  add column if not exists attendance_status text not null default 'confirmed'
    check (attendance_status in ('confirmed','declined'));

alter table public.game_guest_confirmations
  alter column position drop not null;

update public.game_guest_confirmations c
set sport_type = case
  when g.game_format = 'field' then 'football'
  else 'futsal'
end
from public.games g
where g.id = c.game_id
  and g.organization_id = c.organization_id
  and c.sport_type is null
  and c.attendance_status = 'confirmed';

drop function if exists public.confirm_public_game_presence(text,text,text);
drop function if exists public.confirm_public_game_presence(text,text,text,text);

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

  if _attendance_status not in ('confirmed','declined') then
    raise exception 'invalid attendance status' using errcode = 'P0001';
  end if;

  if _attendance_status = 'confirmed' then
    if _sport_type not in ('futsal', 'football') then
      raise exception 'invalid sport type' using errcode = 'P0001';
    end if;

    if _sport_type = 'futsal' then
      allowed := _position in ('goalkeeper','fixed','winger','pivot','other');
    else
      allowed := _position in ('goalkeeper','full_back','center_back','defensive_mid','midfielder','winger','striker','other');
    end if;

    if not allowed then
      raise exception 'invalid position' using errcode = 'P0001';
    end if;
  else
    _sport_type := null;
    _position := null;
  end if;

  insert into public.game_guest_confirmations(
    organization_id,
    game_id,
    name,
    attendance_status,
    sport_type,
    position
  )
  values(
    game_record.organization_id,
    game_record.id,
    trim(_name),
    _attendance_status,
    _sport_type,
    _position
  )
  returning id into confirmation_id;

  return confirmation_id;
end;
$$;

revoke all on function public.confirm_public_game_presence(text,text,text,text,text) from public;
grant execute on function public.confirm_public_game_presence(text,text,text,text,text) to anon, authenticated;

create or replace function public.get_public_game_invite_responses(_token text)
returns table(
  name text,
  attendance_status text,
  sport_type text,
  position text,
  created_at timestamptz
)
language sql
security definer
set search_path = ''
stable
as $$
  select
    c.name,
    c.attendance_status,
    c.sport_type,
    c.position,
    c.created_at
  from public.games g
  join public.game_guest_confirmations c
    on c.game_id = g.id
   and c.organization_id = g.organization_id
  where g.public_invite_token = _token
    and g.public_invite_active
    and g.status = 'scheduled'
  order by
    case when c.attendance_status = 'confirmed' then 0 else 1 end,
    c.created_at;
$$;

revoke all on function public.get_public_game_invite_responses(text) from public;
grant execute on function public.get_public_game_invite_responses(text) to anon, authenticated;
