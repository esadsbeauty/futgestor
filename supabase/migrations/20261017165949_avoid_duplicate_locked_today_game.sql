drop function if exists public.get_my_player_game_history();

create function public.get_my_player_game_history()
returns table(
  game_id uuid,
  title text,
  game_date date,
  start_time time,
  location text,
  player_price numeric,
  status text
)
language sql
security definer
set search_path = ''
stable
as $$
  with me as (
    select p.organization_id
    from public.players p
    where p.user_id = auth.uid()
      and p.status = 'active'
    limit 1
  ),
  local_now as (
    select now() at time zone 'America/Bahia' as value
  )
  select
    g.id,
    g.title,
    g.game_date,
    g.start_time,
    g.location,
    g.player_price,
    g.status
  from public.games g
  join me on me.organization_id = g.organization_id
  cross join local_now
  where g.game_date < local_now.value::date
     or g.status in ('completed', 'canceled')
  order by g.game_date desc, g.start_time desc nulls last
  limit 20;
$$;

grant execute on function public.get_my_player_game_history() to authenticated;
