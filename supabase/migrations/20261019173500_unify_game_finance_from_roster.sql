
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

      select gp.amount
      from public.game_players gp
      join me on me.organization_id = gp.organization_id
      where gp.attendance_status = 'confirmed'
        and gp.payment_status = 'pending'
        and gp.amount > 0
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

    select gp.name as player_name, gp.amount
    from public.game_players gp
    join me on me.organization_id = gp.organization_id
    where gp.attendance_status = 'confirmed'
      and gp.payment_status = 'pending'
      and gp.amount > 0
      and me.show_pending_players
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

create or replace function public.get_my_game_payment_transparency()
returns table(
  game_id uuid,
  game_title text,
  game_date date,
  player_name text,
  payment_status text,
  amount numeric
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
  recent_games as (
    select g.id, g.title, g.game_date
    from public.games g
    join me on me.organization_id = g.organization_id
    where g.status <> 'canceled'
    order by g.game_date desc, g.created_at desc
    limit 10
  )
  select
    g.id,
    g.title,
    g.game_date,
    gp.name,
    case
      when gp.payment_status = 'not_required' then 'isento'
      else gp.payment_status
    end,
    gp.amount
  from recent_games g
  join public.game_players gp
    on gp.game_id = g.id
  where gp.attendance_status = 'confirmed'
  order by g.game_date desc, g.title, gp.name;
$$;

revoke all on function public.get_my_group_finance() from public;
revoke all on function public.get_my_group_pending_players() from public;
revoke all on function public.get_my_game_payment_transparency() from public;

grant execute on function public.get_my_group_finance() to authenticated;
grant execute on function public.get_my_group_pending_players() to authenticated;
grant execute on function public.get_my_game_payment_transparency() to authenticated;
