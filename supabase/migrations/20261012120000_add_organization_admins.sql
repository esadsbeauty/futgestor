create table public.admin_invites (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  email text not null,
  token text not null unique,
  active boolean not null default true,
  expires_at timestamptz not null default (now() + interval '7 days'),
  accepted_at timestamptz,
  accepted_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index admin_invites_org_idx on public.admin_invites(organization_id, created_at desc);
create unique index admin_invites_org_email_active_unique
  on public.admin_invites(organization_id, lower(email))
  where active and accepted_at is null;

create or replace function public.is_org_owner(org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists(
    select 1
    from public.organization_members om
    where om.organization_id = org_id
      and om.user_id = auth.uid()
      and om.role = 'owner'
  );
$$;

revoke all on function public.is_org_owner(uuid) from public;
grant execute on function public.is_org_owner(uuid) to authenticated;

alter table public.admin_invites enable row level security;

create policy "admin invites owner read"
on public.admin_invites
for select
using (public.is_org_owner(organization_id));

create policy "admin invites owner insert"
on public.admin_invites
for insert
with check (
  public.is_org_owner(organization_id)
  and created_by = auth.uid()
);

create policy "admin invites owner update"
on public.admin_invites
for update
using (public.is_org_owner(organization_id))
with check (public.is_org_owner(organization_id));

create policy "admin invites owner delete"
on public.admin_invites
for delete
using (public.is_org_owner(organization_id));

drop policy if exists "membership insert self owner" on public.organization_members;
drop policy if exists "membership update members" on public.organization_members;
drop policy if exists "membership delete members" on public.organization_members;

create policy "membership insert owner"
on public.organization_members
for insert
with check (public.is_org_owner(organization_id));

create policy "membership update owner"
on public.organization_members
for update
using (public.is_org_owner(organization_id) and role <> 'owner')
with check (public.is_org_owner(organization_id) and role <> 'owner');

create policy "membership delete owner"
on public.organization_members
for delete
using (public.is_org_owner(organization_id) and role <> 'owner');

create or replace function public.get_organization_admins(_org uuid)
returns table(
  member_id uuid,
  user_id uuid,
  name text,
  email text,
  role public.member_role
)
language plpgsql
security definer
set search_path = ''
stable
as $$
begin
  if not public.is_org_owner(_org) then
    raise exception 'access denied' using errcode = '42501';
  end if;

  return query
  select
    om.id,
    om.user_id,
    p.name,
    p.email,
    om.role
  from public.organization_members om
  join public.profiles p on p.id = om.user_id
  where om.organization_id = _org
    and om.role in ('owner', 'admin')
  order by case when om.role = 'owner' then 0 else 1 end, p.name;
end;
$$;

revoke all on function public.get_organization_admins(uuid) from public;
grant execute on function public.get_organization_admins(uuid) to authenticated;

create or replace function public.get_admin_invite_public(_token text)
returns table(
  organization_name text,
  email text,
  expires_at timestamptz
)
language sql
security definer
set search_path = ''
stable
as $$
  select o.name, ai.email, ai.expires_at
  from public.admin_invites ai
  join public.organizations o on o.id = ai.organization_id
  where ai.token = _token
    and ai.active
    and ai.accepted_at is null
    and ai.expires_at > now()
  limit 1;
$$;

revoke all on function public.get_admin_invite_public(text) from public;
grant execute on function public.get_admin_invite_public(text) to anon, authenticated;

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
  admin_invite_record public.admin_invites;
  organization_record public.organizations;
  access_record public.player_access_tokens;
  player_record public.players;
  normalized_phone text;
  effective_type text;
  invite_token text;
  player_access_token text;
  admin_invite_token text;
begin
  insert into public.profiles(id, name, email)
  values(
    new.id,
    coalesce(nullif(new.raw_user_meta_data->>'name',''), split_part(new.email,'@',1)),
    new.email
  );

  if coalesce(new.raw_user_meta_data->>'account_type', '') = 'admin' then
    admin_invite_token := nullif(new.raw_user_meta_data->>'admin_invite_token', '');

    if admin_invite_token is null then
      raise exception 'admin invite unavailable' using errcode = 'P0001';
    end if;

    select ai.*
    into admin_invite_record
    from public.admin_invites ai
    where ai.token = admin_invite_token
    for update;

    if admin_invite_record.id is null
      or not admin_invite_record.active
      or admin_invite_record.accepted_at is not null
      or admin_invite_record.expires_at <= now()
    then
      raise exception 'admin invite unavailable' using errcode = 'P0001';
    end if;

    if lower(coalesce(new.email, '')) <> lower(admin_invite_record.email) then
      raise exception 'admin invite email mismatch' using errcode = 'P0001';
    end if;

    insert into public.organization_members(organization_id, user_id, role)
    values(admin_invite_record.organization_id, new.id, 'admin');

    update public.admin_invites
    set active = false,
        accepted_at = now(),
        accepted_user_id = new.id
    where id = admin_invite_record.id;

    return new;
  end if;

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
