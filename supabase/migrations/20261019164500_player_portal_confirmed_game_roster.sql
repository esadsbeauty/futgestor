
create or replace function public.get_my_confirmed_game_roster()
returns table(
  game_id uuid,
  player_name text,
  source text,
  "position" text
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
  guest_rows as (
    select
      c.game_id,
      c.name as player_name,
      'guest'::text as source,
      c.position
    from public.game_guest_confirmations c
    join public.games g
      on g.id = c.game_id
     and g.organization_id = c.organization_id
    join me on me.organization_id = c.organization_id
    where c.attendance_status = 'confirmed'
      and g.status = 'scheduled'
      and g.game_date >= (now() at time zone 'America/Bahia')::date
  ),
  participant_rows as (
    select
      ga.game_id,
      p.name as player_name,
      'participant'::text as source,
      ga.position
    from public.game_attendances ga
    join public.players p
      on p.id = ga.player_id
     and p.organization_id = ga.organization_id
    join public.games g
      on g.id = ga.game_id
     and g.organization_id = ga.organization_id
    join me on me.organization_id = ga.organization_id
    where ga.status = 'confirmed'
      and g.status = 'scheduled'
      and g.game_date >= (now() at time zone 'America/Bahia')::date
      and not exists (
        select 1
        from public.game_guest_confirmations c
        where c.organization_id = ga.organization_id
          and c.game_id = ga.game_id
          and c.player_id = ga.player_id
          and c.attendance_status = 'confirmed'
      )
  )
  select * from guest_rows
  union all
  select * from participant_rows
  order by game_id, source, player_name;
$$;

revoke all on function public.get_my_confirmed_game_roster() from public;
grant execute on function public.get_my_confirmed_game_roster() to authenticated;
