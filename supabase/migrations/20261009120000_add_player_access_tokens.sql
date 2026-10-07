create table public.player_access_tokens (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  player_id uuid not null,
  token text not null unique,
  active boolean not null default true,
  expires_at timestamptz,
  last_used_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (player_id, organization_id) references public.players(id, organization_id) on delete cascade
);

create unique index player_access_tokens_one_active_player_idx
  on public.player_access_tokens(player_id) where active;
create index player_access_tokens_org_player_idx
  on public.player_access_tokens(organization_id, player_id, created_at desc);

alter table public.player_access_tokens enable row level security;
create policy "player access read members" on public.player_access_tokens
  for select using (public.is_org_member(organization_id));
create policy "player access insert members" on public.player_access_tokens
  for insert with check (public.is_org_member(organization_id));
create policy "player access update members" on public.player_access_tokens
  for update using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

create or replace function public.get_player_portal(_token text)
returns table(
  organization_name text,
  player_name text,
  player_status text,
  billing_type text,
  monthly_fee numeric,
  due_day integer,
  participant_since date,
  available boolean
)
language plpgsql security definer set search_path = '' as $$
declare access_record public.player_access_tokens;
begin
  select pat.* into access_record
  from public.player_access_tokens pat
  where pat.token = _token
  for update;

  if access_record.id is null then return; end if;

  if not access_record.active or (access_record.expires_at is not null and access_record.expires_at <= now()) then
    return query select null::text, null::text, null::text, null::text, null::numeric, null::integer, null::date, false;
    return;
  end if;

  if not exists (
    select 1 from public.players p
    where p.id = access_record.player_id
      and p.organization_id = access_record.organization_id
      and p.status = 'active'
  ) then
    return query select null::text, null::text, null::text, null::text, null::numeric, null::integer, null::date, false;
    return;
  end if;

  update public.player_access_tokens pat
  set last_used_at = now(), updated_at = now()
  where pat.id = access_record.id;

  return query
    select o.name, p.name, p.status, p.billing_type,
      case when p.billing_type = 'monthly' then p.monthly_fee else null end,
      case when p.billing_type = 'monthly' then p.due_day else null end,
      p.joined_at, true
    from public.players p
    join public.organizations o on o.id = p.organization_id
    where p.id = access_record.player_id
      and p.organization_id = access_record.organization_id;
end $$;

create or replace function public.get_player_portal_games(_token text)
returns table(game_id uuid, title text, game_date date, start_time time, location text, player_price numeric, status text)
language sql security definer set search_path = '' stable as $$
  select g.id, g.title, g.game_date, g.start_time, g.location, g.player_price, g.status
  from public.player_access_tokens pat
  join public.players p on p.id = pat.player_id and p.organization_id = pat.organization_id
  join public.games g on g.organization_id = pat.organization_id
  where pat.token = _token
    and pat.active
    and (pat.expires_at is null or pat.expires_at > now())
    and p.status = 'active'
    and g.status = 'scheduled'
    and g.game_date >= current_date
  order by g.game_date, g.start_time nulls last;
$$;

create or replace function public.regenerate_player_access(_player uuid)
returns text language plpgsql security definer set search_path = '' as $$
declare player_record public.players; new_token text;
begin
  select p.* into player_record from public.players p where p.id = _player;
  if player_record.id is null then raise exception 'player not found' using errcode = 'P0001'; end if;
  if not public.is_org_member(player_record.organization_id) then raise exception 'access denied' using errcode = '42501'; end if;

  update public.player_access_tokens pat
  set active = false, updated_at = now()
  where pat.player_id = player_record.id and pat.active;

  new_token := gen_random_uuid()::text || replace(gen_random_uuid()::text, '-', '');
  insert into public.player_access_tokens(organization_id, player_id, token)
    values(player_record.organization_id, player_record.id, new_token);
  return new_token;
end $$;

drop function public.accept_player_invite(text, text, text);

create function public.accept_player_invite(_token text, _name text, _whatsapp text)
returns table(organization_name text, player_name text, access_token text)
language plpgsql security definer set search_path = '' as $$
declare
  invite_record public.player_invites;
  organization_record public.organizations;
  normalized_phone text;
  effective_type text;
  new_player_id uuid;
  new_access_token text;
begin
  select pi.* into invite_record from public.player_invites pi where pi.token = _token for update;
  if invite_record.id is null or not invite_record.active
    or (invite_record.expires_at is not null and invite_record.expires_at <= now())
    or (invite_record.max_uses is not null and invite_record.uses_count >= invite_record.max_uses)
  then raise exception 'invite unavailable' using errcode = 'P0001'; end if;
  if length(trim(_name)) < 2 then raise exception 'invalid name' using errcode = 'P0001'; end if;

  normalized_phone := regexp_replace(coalesce(_whatsapp, ''), '[^0-9]', '', 'g');
  if length(normalized_phone) < 10 or length(normalized_phone) > 13 then raise exception 'invalid whatsapp' using errcode = 'P0001'; end if;
  select o.* into organization_record from public.organizations o where o.id = invite_record.organization_id;
  effective_type := case organization_record.billing_mode when 'monthly' then 'monthly' when 'per_game' then 'per_game' else invite_record.billing_type end;
  if effective_type is null or effective_type not in ('monthly', 'per_game') then raise exception 'invalid billing type' using errcode = 'P0001'; end if;

  perform pg_advisory_xact_lock(hashtextextended(invite_record.organization_id::text || normalized_phone, 0));
  if exists (
    select 1 from public.players p
    where p.organization_id = invite_record.organization_id
      and regexp_replace(coalesce(p.phone, ''), '[^0-9]', '', 'g') = normalized_phone
  ) then raise exception 'whatsapp already registered' using errcode = '23505'; end if;

  insert into public.players(organization_id, name, phone, monthly_fee, due_day, joined_at, status, billing_type, notes)
    values(invite_record.organization_id, trim(_name), normalized_phone, organization_record.default_monthly_fee,
      organization_record.default_due_day, current_date, 'active', effective_type, null)
    returning id into new_player_id;

  new_access_token := gen_random_uuid()::text || replace(gen_random_uuid()::text, '-', '');
  insert into public.player_access_tokens(organization_id, player_id, token)
    values(invite_record.organization_id, new_player_id, new_access_token);
  update public.player_invites pi set uses_count = pi.uses_count + 1, updated_at = now() where pi.id = invite_record.id;

  return query select organization_record.name, trim(_name), new_access_token;
end $$;

revoke all on function public.get_player_portal(text), public.get_player_portal_games(text), public.regenerate_player_access(uuid), public.accept_player_invite(text,text,text) from public;
grant execute on function public.get_player_portal(text), public.get_player_portal_games(text), public.accept_player_invite(text,text,text) to anon, authenticated;
grant execute on function public.regenerate_player_access(uuid) to authenticated;
