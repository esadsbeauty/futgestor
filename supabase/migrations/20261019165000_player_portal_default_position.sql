create or replace function public.get_my_player_default_position()
returns text
language sql
security definer
set search_path = ''
stable
as $$
  select p.default_position
  from public.players p
  where p.user_id = auth.uid()
    and p.status = 'active'
  limit 1;
$$;

revoke all on function public.get_my_player_default_position() from public;
grant execute on function public.get_my_player_default_position() to authenticated;