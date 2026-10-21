create table if not exists public.game_players (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  game_id uuid not null,
  source text not null check (source in ('participant','guest')),
  player_id uuid,
  guest_confirmation_id uuid,
  name text not null,
  attendance_status text not null default 'confirmed' check (attendance_status in ('confirmed','declined')),
  sport_type text check (sport_type in ('futsal','football')),
  position text check (position in (
    'goalkeeper','fixed','winger','pivot',
    'full_back','center_back','defensive_mid','midfielder','striker','other'
  )),
  team_number integer check (team_number between 1 and 4),
  amount numeric(12,2) not null default 0 check (amount >= 0),
  payment_status text not null default 'pending' check (payment_status in ('pending','paid','not_required')),
  paid_at timestamptz,
  transaction_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (game_id, organization_id)
    references public.games(id, organization_id) on delete cascade,
  foreign key (player_id, organization_id)
    references public.players(id, organization_id) on delete set null (player_id),
  foreign key (guest_confirmation_id)
    references public.game_guest_confirmations(id) on delete cascade,
  foreign key (transaction_id, organization_id)
    references public.transactions(id, organization_id) on delete set null (transaction_id)
);

create unique index if not exists game_players_guest_unique
  on public.game_players(guest_confirmation_id)
  where guest_confirmation_id is not null;

create unique index if not exists game_players_participant_unique
  on public.game_players(game_id, player_id)
  where source = 'participant' and player_id is not null;

create index if not exists game_players_game_idx
  on public.game_players(game_id, attendance_status);

alter table public.game_players enable row level security;

drop policy if exists "game players read members" on public.game_players;
create policy "game players read members"
on public.game_players for select
using (public.is_org_member(organization_id));

drop policy if exists "game players insert members" on public.game_players;
create policy "game players insert members"
on public.game_players for insert
with check (public.is_org_member(organization_id));

drop policy if exists "game players update members" on public.game_players;
create policy "game players update members"
on public.game_players for update
using (public.is_org_member(organization_id))
with check (public.is_org_member(organization_id));

drop policy if exists "game players delete members" on public.game_players;
create policy "game players delete members"
on public.game_players for delete
using (public.is_org_member(organization_id));

create or replace function public.sync_guest_game_player()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  game_record public.games;
  resolved_amount numeric(12,2);
  resolved_payment text;
begin
  if tg_op = 'DELETE' then
    delete from public.game_players
    where guest_confirmation_id = old.id;
    return old;
  end if;

  select g.* into game_record
  from public.games g
  where g.id = new.game_id
    and g.organization_id = new.organization_id;

  if game_record.id is null then
    return new;
  end if;

  resolved_amount := case
    when new.attendance_status = 'confirmed' then game_record.player_price
    else 0
  end;

  resolved_payment := case
    when new.attendance_status <> 'confirmed' then 'not_required'
    when new.payment_status = 'paid' then 'paid'
    else 'pending'
  end;

  if new.player_id is not null then
    delete from public.game_players
    where game_id = new.game_id
      and player_id = new.player_id
      and source = 'participant';
  end if;

  insert into public.game_players(
    organization_id,game_id,source,player_id,guest_confirmation_id,name,
    attendance_status,sport_type,position,team_number,amount,payment_status,
    paid_at,transaction_id,created_at,updated_at
  )
  values(
    new.organization_id,new.game_id,'guest',new.player_id,new.id,new.name,
    new.attendance_status,new.sport_type,new.position,new.team_number,resolved_amount,resolved_payment,
    new.paid_at,new.payment_transaction_id,new.created_at,new.updated_at
  )
  on conflict (guest_confirmation_id) where guest_confirmation_id is not null
  do update set
    player_id = excluded.player_id,
    name = excluded.name,
    attendance_status = excluded.attendance_status,
    sport_type = excluded.sport_type,
    position = excluded.position,
    team_number = excluded.team_number,
    amount = excluded.amount,
    payment_status = excluded.payment_status,
    paid_at = excluded.paid_at,
    transaction_id = excluded.transaction_id,
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists sync_guest_game_player_trigger on public.game_guest_confirmations;
create trigger sync_guest_game_player_trigger
after insert or update or delete on public.game_guest_confirmations
for each row execute procedure public.sync_guest_game_player();

create or replace function public.sync_attendance_game_player()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  game_record public.games;
  player_record public.players;
  organization_record public.organizations;
  charge_record public.game_charges;
  chargeable boolean;
  resolved_amount numeric(12,2);
  resolved_payment text;
begin
  if tg_op = 'DELETE' then
    delete from public.game_players
    where game_id = old.game_id
      and player_id = old.player_id
      and source = 'participant';
    return old;
  end if;

  if exists (
    select 1
    from public.game_guest_confirmations c
    where c.organization_id = new.organization_id
      and c.game_id = new.game_id
      and c.player_id = new.player_id
  ) then
    delete from public.game_players
    where game_id = new.game_id
      and player_id = new.player_id
      and source = 'participant';
    return new;
  end if;

  select g.* into game_record
  from public.games g
  where g.id = new.game_id
    and g.organization_id = new.organization_id;

  select p.* into player_record
  from public.players p
  where p.id = new.player_id
    and p.organization_id = new.organization_id;

  select o.* into organization_record
  from public.organizations o
  where o.id = new.organization_id;

  if game_record.id is null or player_record.id is null or organization_record.id is null then
    return new;
  end if;

  chargeable :=
    organization_record.billing_mode = 'per_game'
    or (
      organization_record.billing_mode = 'hybrid'
      and player_record.billing_type = 'per_game'
    );

  if new.status = 'confirmed' and chargeable then
    insert into public.game_charges(
      organization_id,game_id,player_id,amount
    )
    values(
      new.organization_id,new.game_id,new.player_id,game_record.player_price
    )
    on conflict (game_id,player_id)
    do update set
      amount = excluded.amount,
      updated_at = now();

    select gc.* into charge_record
    from public.game_charges gc
    where gc.game_id = new.game_id
      and gc.player_id = new.player_id;

    resolved_amount := game_record.player_price;
    resolved_payment := case when charge_record.status = 'paid' then 'paid' else 'pending' end;
  else
    resolved_amount := 0;
    resolved_payment := 'not_required';

    if new.status <> 'confirmed' then
      delete from public.game_charges
      where game_id = new.game_id
        and player_id = new.player_id
        and status = 'pending';
    end if;
  end if;

  insert into public.game_players(
    organization_id,game_id,source,player_id,name,attendance_status,
    sport_type,position,team_number,amount,payment_status,paid_at,transaction_id,
    created_at,updated_at
  )
  values(
    new.organization_id,new.game_id,'participant',new.player_id,player_record.name,new.status,
    new.sport_type,new.position,new.team_number,resolved_amount,resolved_payment,
    charge_record.paid_at,charge_record.transaction_id,new.created_at,new.updated_at
  )
  on conflict (game_id,player_id) where source = 'participant' and player_id is not null
  do update set
    name = excluded.name,
    attendance_status = excluded.attendance_status,
    sport_type = excluded.sport_type,
    position = excluded.position,
    team_number = excluded.team_number,
    amount = excluded.amount,
    payment_status = excluded.payment_status,
    paid_at = excluded.paid_at,
    transaction_id = excluded.transaction_id,
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists sync_attendance_game_player_trigger on public.game_attendances;
create trigger sync_attendance_game_player_trigger
after insert or update or delete on public.game_attendances
for each row execute procedure public.sync_attendance_game_player();

create or replace function public.sync_charge_game_player()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    update public.game_players
    set amount = 0,
        payment_status = 'not_required',
        paid_at = null,
        transaction_id = null,
        updated_at = now()
    where game_id = old.game_id
      and player_id = old.player_id
      and source = 'participant';
    return old;
  end if;

  update public.game_players
  set amount = new.amount,
      payment_status = new.status,
      paid_at = new.paid_at,
      transaction_id = new.transaction_id,
      updated_at = now()
  where game_id = new.game_id
    and player_id = new.player_id
    and source = 'participant';

  return new;
end;
$$;

drop trigger if exists sync_charge_game_player_trigger on public.game_charges;
create trigger sync_charge_game_player_trigger
after insert or update or delete on public.game_charges
for each row execute procedure public.sync_charge_game_player();

insert into public.game_players(
  organization_id,game_id,source,player_id,guest_confirmation_id,name,
  attendance_status,sport_type,position,team_number,amount,payment_status,
  paid_at,transaction_id,created_at,updated_at
)
select
  c.organization_id,c.game_id,'guest',c.player_id,c.id,c.name,
  c.attendance_status,c.sport_type,c.position,c.team_number,
  case when c.attendance_status='confirmed' then g.player_price else 0 end,
  case
    when c.attendance_status<>'confirmed' then 'not_required'
    when c.payment_status='paid' then 'paid'
    else 'pending'
  end,
  c.paid_at,c.payment_transaction_id,c.created_at,c.updated_at
from public.game_guest_confirmations c
join public.games g
  on g.id=c.game_id and g.organization_id=c.organization_id
on conflict (guest_confirmation_id) where guest_confirmation_id is not null
do nothing;

insert into public.game_players(
  organization_id,game_id,source,player_id,name,attendance_status,
  sport_type,position,team_number,amount,payment_status,paid_at,transaction_id,
  created_at,updated_at
)
select
  ga.organization_id,ga.game_id,'participant',ga.player_id,p.name,ga.status,
  ga.sport_type,ga.position,ga.team_number,
  case
    when ga.status='confirmed'
      and (
        o.billing_mode='per_game'
        or (o.billing_mode='hybrid' and p.billing_type='per_game')
      )
    then g.player_price else 0
  end,
  case
    when ga.status='confirmed'
      and (
        o.billing_mode='per_game'
        or (o.billing_mode='hybrid' and p.billing_type='per_game')
      )
    then coalesce(gc.status,'pending')
    else 'not_required'
  end,
  gc.paid_at,gc.transaction_id,ga.created_at,ga.updated_at
from public.game_attendances ga
join public.players p
  on p.id=ga.player_id and p.organization_id=ga.organization_id
join public.games g
  on g.id=ga.game_id and g.organization_id=ga.organization_id
join public.organizations o
  on o.id=ga.organization_id
left join public.game_charges gc
  on gc.game_id=ga.game_id and gc.player_id=ga.player_id
where not exists (
  select 1 from public.game_guest_confirmations c
  where c.organization_id=ga.organization_id
    and c.game_id=ga.game_id
    and c.player_id=ga.player_id
)
on conflict (game_id,player_id) where source='participant' and player_id is not null
do nothing;

create or replace function public.mark_game_player_paid(_game_player uuid)
returns public.game_players
language plpgsql
security definer
set search_path = ''
as $$
declare
  roster public.game_players;
  charge_id uuid;
begin
  select * into roster
  from public.game_players
  where id=_game_player
  for update;

  if roster.id is null then
    raise exception 'game player not found' using errcode='P0001';
  end if;

  if not public.is_org_member(roster.organization_id) then
    raise exception 'access denied' using errcode='42501';
  end if;

  if roster.attendance_status <> 'confirmed' then
    raise exception 'player is not confirmed' using errcode='P0001';
  end if;

  if roster.payment_status = 'not_required' then
    raise exception 'payment not required' using errcode='P0001';
  end if;

  if roster.payment_status <> 'paid' then
    if roster.source = 'guest' then
      perform public.mark_game_guest_paid(roster.guest_confirmation_id);
    else
      select gc.id into charge_id
      from public.game_charges gc
      where gc.game_id=roster.game_id
        and gc.player_id=roster.player_id;

      if charge_id is null then
        insert into public.game_charges(
          organization_id,game_id,player_id,amount
        )
        values(
          roster.organization_id,roster.game_id,roster.player_id,roster.amount
        )
        returning id into charge_id;
      end if;

      perform public.mark_game_charge_paid(charge_id);
    end if;
  end if;

  select * into roster
  from public.game_players
  where id=_game_player;

  return roster;
end;
$$;

revoke all on function public.mark_game_player_paid(uuid) from public;
grant execute on function public.mark_game_player_paid(uuid) to authenticated;

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
    where p.user_id=auth.uid()
      and p.status='active'
    limit 1
  )
  select
    gp.game_id,
    gp.name,
    gp.source,
    gp.position
  from public.game_players gp
  join public.games g
    on g.id=gp.game_id and g.organization_id=gp.organization_id
  join me on me.organization_id=gp.organization_id
  where gp.attendance_status='confirmed'
    and g.status='scheduled'
    and g.game_date >= (now() at time zone 'America/Bahia')::date
  order by gp.game_id,gp.source,gp.name;
$$;

grant execute on function public.get_my_confirmed_game_roster() to authenticated;
