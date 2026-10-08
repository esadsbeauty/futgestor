alter table public.players
  add column if not exists user_id uuid unique references auth.users(id) on delete set null;

create index if not exists players_user_idx on public.players(user_id);

alter table public.organizations
  add column if not exists show_cash_balance boolean not null default true,
  add column if not exists show_receivables boolean not null default true,
  add column if not exists show_payables boolean not null default true,
  add column if not exists show_pending_players boolean not null default true,
  add column if not exists show_individual_values boolean not null default true;

create table if not exists public.game_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  game_id uuid not null,
  player_id uuid not null,
  event_type text not null check (event_type in ('goal','yellow_card','red_card')),
  quantity integer not null default 1 check (quantity > 0),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (game_id, organization_id)
    references public.games(id, organization_id)
    on delete cascade,
  foreign key (player_id, organization_id)
    references public.players(id, organization_id)
    on delete cascade
);

create index if not exists game_events_game_idx
  on public.game_events(organization_id, game_id, created_at);

create index if not exists game_events_player_idx
  on public.game_events(organization_id, player_id, created_at);

alter table public.game_events enable row level security;

create policy "game events read members"
  on public.game_events
  for select
  using (public.is_org_member(organization_id));

create policy "game events insert members"
  on public.game_events
  for insert
  with check (public.is_org_member(organization_id));

create policy "game events update members"
  on public.game_events
  for update
  using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

create policy "game events delete members"
  on public.game_events
  for delete
  using (public.is_org_member(organization_id));

create or replace function public.is_player_user(_org uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists(
    select 1
    from public.players p
    where p.organization_id = _org
      and p.user_id = auth.uid()
      and p.status = 'active'
  );
$$;

revoke all on function public.is_player_user(uuid) from public;
grant execute on function public.is_player_user(uuid) to authenticated;

create or replace function public.get_my_player_portal()
returns table(
  organization_id uuid,
  player_id uuid,
  organization_name text,
  player_name text,
  player_status text,
  billing_type text,
  monthly_fee numeric,
  due_day integer,
  participant_since date,
  show_cash_balance boolean,
  show_receivables boolean,
  show_payables boolean,
  show_pending_players boolean,
  show_individual_values boolean,
  available boolean
)
language sql
security definer
set search_path = ''
stable
as $$
  select
    o.id,
    p.id,
    o.name,
    p.name,
    p.status,
    p.billing_type,
    case when p.billing_type = 'monthly' then p.monthly_fee else null end,
    case when p.billing_type = 'monthly' then p.due_day else null end,
    p.joined_at,
    o.show_cash_balance,
    o.show_receivables,
    o.show_payables,
    o.show_pending_players,
    o.show_individual_values,
    true
  from public.players p
  join public.organizations o on o.id = p.organization_id
  where p.user_id = auth.uid()
    and p.status = 'active'
  limit 1;
$$;

create or replace function public.get_my_player_games()
returns table(
  game_id uuid,
  title text,
  game_date date,
  start_time time,
  location text,
  player_price numeric,
  status text,
  attendance_status text
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
    coalesce(ga.status, 'pending')
  from public.players p
  join public.games g
    on g.organization_id = p.organization_id
  left join public.game_attendances ga
    on ga.organization_id = p.organization_id
   and ga.game_id = g.id
   and ga.player_id = p.id
  where p.user_id = auth.uid()
    and p.status = 'active'
    and g.status = 'scheduled'
    and g.game_date >= current_date
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
begin
  if _status not in ('confirmed', 'declined') then
    raise exception 'invalid attendance status' using errcode = 'P0001';
  end if;

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
    or game_record.game_date < current_date
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
    select p.organization_id
    from public.players p
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
  select cash.value, receivable_values.value, payable_values.value
  from cash, receivable_values, payable_values;
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
    select p.organization_id
    from public.players p
    where p.user_id = auth.uid()
      and p.status = 'active'
    limit 1
  ),
  pending as (
    select mf.player_id, mf.amount
    from public.monthly_fees mf
    join me on me.organization_id = mf.organization_id
    where mf.status = 'pending'
    union all
    select gc.player_id, gc.amount
    from public.game_charges gc
    join me on me.organization_id = gc.organization_id
    where gc.status = 'pending'
  )
  select p.name, sum(pending.amount)::numeric
  from pending
  join public.players p on p.id = pending.player_id
  group by p.id, p.name
  order by sum(pending.amount) desc, p.name;
$$;

create or replace function public.get_my_recent_game_events()
returns table(
  game_id uuid,
  game_title text,
  game_date date,
  player_name text,
  event_type text,
  quantity integer
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
  latest_game as (
    select g.id, g.title, g.game_date
    from public.games g
    join me on me.organization_id = g.organization_id
    where exists (
      select 1
      from public.game_events ge
      where ge.game_id = g.id
        and ge.organization_id = g.organization_id
    )
    order by g.game_date desc, g.created_at desc
    limit 1
  )
  select
    lg.id,
    lg.title,
    lg.game_date,
    p.name,
    ge.event_type,
    sum(ge.quantity)::integer
  from latest_game lg
  join public.game_events ge on ge.game_id = lg.id
  join public.players p on p.id = ge.player_id
  group by lg.id, lg.title, lg.game_date, p.id, p.name, ge.event_type
  order by
    case ge.event_type when 'goal' then 1 when 'yellow_card' then 2 else 3 end,
    sum(ge.quantity) desc,
    p.name;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  org_id uuid;
  fee numeric(12,2);
  due_day integer;
  invite_record public.player_invites;
  organization_record public.organizations;
  access_record public.player_access_tokens;
  player_record public.players;
  normalized_phone text;
  effective_type text;
  invite_token text;
  player_access_token text;
begin
  insert into public.profiles(id, name, email)
  values(
    new.id,
    coalesce(nullif(new.raw_user_meta_data->>'name',''), split_part(new.email,'@',1)),
    new.email
  );

  if coalesce(new.raw_user_meta_data->>'account_type', '') = 'player' then
    player_access_token := nullif(new.raw_user_meta_data->>'player_access_token', '');

    if player_access_token is not null then
      select pat.*
      into access_record
      from public.player_access_tokens pat
      where pat.token = player_access_token
      for update;

      if access_record.id is null
        or not access_record.active
        or (access_record.expires_at is not null and access_record.expires_at <= now())
      then
        raise exception 'access unavailable' using errcode = 'P0001';
      end if;

      select p.*
      into player_record
      from public.players p
      where p.id = access_record.player_id
        and p.organization_id = access_record.organization_id
      for update;

      if player_record.id is null or player_record.status <> 'active' then
        raise exception 'player unavailable' using errcode = 'P0001';
      end if;

      if player_record.user_id is not null then
        raise exception 'player account already exists' using errcode = '23505';
      end if;

      update public.players
      set user_id = new.id
      where id = player_record.id
        and organization_id = player_record.organization_id;

      update public.player_access_tokens
      set active = false,
          updated_at = now()
      where id = access_record.id;

      return new;
    end if;

    invite_token := nullif(new.raw_user_meta_data->>'invite_token', '');

    if invite_token is null then
      raise exception 'invite unavailable' using errcode = 'P0001';
    end if;

    select pi.*
    into invite_record
    from public.player_invites pi
    where pi.token = invite_token
    for update;

    if invite_record.id is null
      or not invite_record.active
      or (invite_record.expires_at is not null and invite_record.expires_at <= now())
      or (invite_record.max_uses is not null and invite_record.uses_count >= invite_record.max_uses)
    then
      raise exception 'invite unavailable' using errcode = 'P0001';
    end if;

    normalized_phone := regexp_replace(
      coalesce(new.raw_user_meta_data->>'whatsapp', ''),
      '[^0-9]',
      '',
      'g'
    );

    if length(normalized_phone) < 10 or length(normalized_phone) > 13 then
      raise exception 'invalid whatsapp' using errcode = 'P0001';
    end if;

    select o.*
    into organization_record
    from public.organizations o
    where o.id = invite_record.organization_id;

    effective_type := case organization_record.billing_mode
      when 'monthly' then 'monthly'
      when 'per_game' then 'per_game'
      else invite_record.billing_type
    end;

    if effective_type is null or effective_type not in ('monthly', 'per_game') then
      raise exception 'invalid billing type' using errcode = 'P0001';
    end if;

    perform pg_advisory_xact_lock(
      hashtextextended(invite_record.organization_id::text || normalized_phone, 0)
    );

    if exists (
      select 1
      from public.players p
      where p.organization_id = invite_record.organization_id
        and regexp_replace(coalesce(p.phone, ''), '[^0-9]', '', 'g') = normalized_phone
    ) then
      raise exception 'whatsapp already registered' using errcode = '23505';
    end if;

    insert into public.players(
      organization_id,
      user_id,
      name,
      phone,
      monthly_fee,
      due_day,
      joined_at,
      status,
      billing_type,
      notes
    )
    values(
      invite_record.organization_id,
      new.id,
      coalesce(nullif(trim(new.raw_user_meta_data->>'name'), ''), split_part(new.email,'@',1)),
      normalized_phone,
      organization_record.default_monthly_fee,
      organization_record.default_due_day,
      current_date,
      'active',
      effective_type,
      null
    );

    update public.player_invites pi
    set uses_count = pi.uses_count + 1,
        updated_at = now()
    where pi.id = invite_record.id;

    return new;
  end if;

  fee := greatest(
    coalesce((new.raw_user_meta_data->>'default_monthly_fee')::numeric, 0),
    0
  );

  due_day := least(
    greatest(
      coalesce((new.raw_user_meta_data->>'default_due_day')::integer, 10),
      1
    ),
    31
  );

  insert into public.organizations(
    name,
    owner_id,
    default_monthly_fee,
    default_due_day
  )
  values(
    coalesce(nullif(new.raw_user_meta_data->>'organization_name',''), 'Meu baba'),
    new.id,
    fee,
    due_day
  )
  returning id into org_id;

  insert into public.organization_members(
    organization_id,
    user_id,
    role
  )
  values(org_id, new.id, 'owner');

  return new;
end;
$$;

revoke all on function public.get_my_player_portal() from public;
revoke all on function public.get_my_player_games() from public;
revoke all on function public.respond_my_game_attendance(uuid, text) from public;
revoke all on function public.get_my_group_finance() from public;
revoke all on function public.get_my_group_pending_players() from public;
revoke all on function public.get_my_recent_game_events() from public;

grant execute on function public.get_my_player_portal() to authenticated;
grant execute on function public.get_my_player_games() to authenticated;
grant execute on function public.respond_my_game_attendance(uuid, text) to authenticated;
grant execute on function public.get_my_group_finance() to authenticated;
grant execute on function public.get_my_group_pending_players() to authenticated;
grant execute on function public.get_my_recent_game_events() to authenticated;
