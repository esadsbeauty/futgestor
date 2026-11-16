create or replace function public.update_my_player_default_position(_position text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
begin
  if _position not in (
    'goalkeeper','fixed','winger','pivot',
    'full_back','center_back','defensive_mid','midfielder','striker','other'
  ) then
    raise exception 'invalid position' using errcode = 'P0001';
  end if;

  update public.players
  set default_position = _position
  where user_id = auth.uid()
    and status = 'active';

  if not found then
    raise exception 'player unavailable' using errcode = 'P0001';
  end if;

  return _position;
end;
$$;

revoke all on function public.update_my_player_default_position(text) from public;
grant execute on function public.update_my_player_default_position(text) to authenticated;