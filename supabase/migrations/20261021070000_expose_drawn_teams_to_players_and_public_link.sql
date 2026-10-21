create or replace function public.get_public_game_teams(_token text)
returns table(
  player_name text,
  source text,
  "position" text,
  team_number integer
)
language sql
security definer
set search_path = ''
stable
as $$
  select
    gp.name,
    gp.source,
    gp.position,
    gp.team_number
  from public.games g
  join public.game_players gp
    on gp.game_id = g.id
   and gp.organization_id = g.organization_id
  where g.public_invite_token = _token
    and g.public_invite_active = true
    and gp.attendance_status = 'confirmed'
    and gp.team_number is not null
  order by gp.team_number, gp.name;
$$;

revoke all on function public.get_public_game_teams(text) from public;
grant execute on function public.get_public_game_teams(text) to anon, authenticated;

drop function if exists public.get_my_confirmed_game_roster();

create function public.get_my_confirmed_game_roster()
returns table(
  game_id uuid,
  player_name text,
  source text,
  "position" text,
  team_number integer
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
  )
  select
    gp.game_id,
    gp.name,
    gp.source,
    gp.position,
    gp.team_number
  from public.game_players gp
  join public.games g
    on g.id = gp.game_id
   and g.organization_id = gp.organization_id
  join me
    on me.organization_id = gp.organization_id
  where gp.attendance_status = 'confirmed'
    and g.status = 'scheduled'
    and g.game_date >= (now() at time zone 'America/Bahia')::date
  order by gp.game_id, gp.team_number nulls last, gp.source, gp.name;
$$;

revoke all on function public.get_my_confirmed_game_roster() from public;
grant execute on function public.get_my_confirmed_game_roster() to authenticated;
