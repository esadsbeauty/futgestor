create or replace function public.get_my_group_finance()
returns table(
  cash_balance numeric,
  receivables numeric,
  payables numeric
)
language sql
security definer
set search_path = ''
stable
as $$
  with me as (
    select
      p.organization_id,
      o.show_cash_balance,
      o.show_receivables,
      o.show_payables
    from public.players p
    join public.organizations o on o.id = p.organization_id
    where p.user_id = auth.uid()
      and p.status = 'active'
    limit 1
  ),
  cash as (
    select coalesce(sum(case when t.type = 'income' then t.amount else -t.amount end), 0)::numeric as value
    from public.transactions t
    join me on me.organization_id = t.organization_id
  ),
  receivable_values as (
    select coalesce(sum(x.amount), 0)::numeric as value
    from (
      select mf.amount
      from public.monthly_fees mf
      join me on me.organization_id = mf.organization_id
      where mf.status = 'pending'
      union all
      select gc.amount
      from public.game_charges gc
      join me on me.organization_id = gc.organization_id
      where gc.status = 'pending'
      union all
      select g.player_price
      from public.game_guest_confirmations guest
      join public.games g
        on g.id = guest.game_id
       and g.organization_id = guest.organization_id
      join me on me.organization_id = guest.organization_id
      where guest.attendance_status = 'confirmed'
        and guest.payment_status = 'pending'
        and not exists (
          select 1
          from public.game_charges charge
          where charge.organization_id = guest.organization_id
            and charge.game_id = guest.game_id
            and charge.player_id = guest.player_id
            and guest.player_id is not null
        )
    ) x
  ),
  payable_values as (
    select coalesce(sum(x.amount), 0)::numeric as value
    from (
      select b.amount
      from public.bills b
      join me on me.organization_id = b.organization_id
      where b.status = 'pending'
      union all
      select ge.amount
      from public.game_expenses ge
      join me on me.organization_id = ge.organization_id
      where ge.status = 'pending'
    ) x
  )
  select
    case when me.show_cash_balance then cash.value else null end,
    case when me.show_receivables then receivable_values.value else null end,
    case when me.show_payables then payable_values.value else null end
  from me, cash, receivable_values, payable_values;
$$;

create or replace function public.get_my_group_pending_players()
returns table(
  player_name text,
  amount numeric
)
language sql
security definer
set search_path = ''
stable
as $$
  with me as (
    select
      p.organization_id,
      o.show_pending_players,
      o.show_individual_values
    from public.players p
    join public.organizations o on o.id = p.organization_id
    where p.user_id = auth.uid()
      and p.status = 'active'
    limit 1
  ),
  pending as (
    select p.name as player_name, mf.amount
    from public.monthly_fees mf
    join public.players p on p.id = mf.player_id
    join me on me.organization_id = mf.organization_id
    where mf.status = 'pending'
      and me.show_pending_players
    union all
    select p.name as player_name, gc.amount
    from public.game_charges gc
    join public.players p on p.id = gc.player_id
    join me on me.organization_id = gc.organization_id
    where gc.status = 'pending'
      and me.show_pending_players
    union all
    select guest.name as player_name, g.player_price as amount
    from public.game_guest_confirmations guest
    join public.games g
      on g.id = guest.game_id
     and g.organization_id = guest.organization_id
    join me on me.organization_id = guest.organization_id
    where guest.attendance_status = 'confirmed'
      and guest.payment_status = 'pending'
      and me.show_pending_players
      and not exists (
        select 1
        from public.game_charges charge
        where charge.organization_id = guest.organization_id
          and charge.game_id = guest.game_id
          and charge.player_id = guest.player_id
          and guest.player_id is not null
      )
  )
  select
    pending.player_name,
    case
      when bool_or(me.show_individual_values) then sum(pending.amount)::numeric
      else null
    end
  from pending
  join me on true
  group by pending.player_name
  order by sum(pending.amount) desc, pending.player_name;
$$;

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
  attendance_locked boolean
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
    ) as attendance_locked
  from public.players p
  join public.games g
    on g.organization_id = p.organization_id
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
  _status text
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

  insert into public.game_attendances(
    organization_id,
    game_id,
    player_id,
    status,
    responded_at
  )
  values(
    player_record.organization_id,
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

grant execute on function public.get_my_group_finance() to authenticated;
grant execute on function public.get_my_group_pending_players() to authenticated;
grant execute on function public.get_my_player_games() to authenticated;
grant execute on function public.respond_my_game_attendance(uuid, text) to authenticated;
