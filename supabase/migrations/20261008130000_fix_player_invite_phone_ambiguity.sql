create or replace function public.accept_player_invite(
  _token text,
  _name text,
  _whatsapp text
)
returns table(
  organization_name text,
  player_name text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  inv public.player_invites;
  org public.organizations;
  normalized_phone text;
  effective_type text;
begin
  select *
  into inv
  from public.player_invites
  where token = _token
  for update;

  if inv.id is null
    or not inv.active
    or (inv.expires_at is not null and inv.expires_at <= now())
    or (inv.max_uses is not null and inv.uses_count >= inv.max_uses)
  then
    raise exception 'invite unavailable' using errcode = 'P0001';
  end if;

  if length(trim(_name)) < 2 then
    raise exception 'invalid name' using errcode = 'P0001';
  end if;

  normalized_phone :=
    regexp_replace(
      coalesce(_whatsapp, ''),
      '[^0-9]',
      '',
      'g'
    );

  if length(normalized_phone) < 10
    or length(normalized_phone) > 13
  then
    raise exception 'invalid whatsapp' using errcode = 'P0001';
  end if;

  select *
  into org
  from public.organizations
  where id = inv.organization_id;

  effective_type :=
    case org.billing_mode
      when 'monthly' then 'monthly'
      when 'per_game' then 'per_game'
      else inv.billing_type
    end;

  if effective_type is null
    or effective_type not in ('monthly', 'per_game')
  then
    raise exception 'invalid billing type' using errcode = 'P0001';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(
      inv.organization_id::text || normalized_phone,
      0
    )
  );

  if exists (
    select 1
    from public.players p
    where p.organization_id = inv.organization_id
      and regexp_replace(
        coalesce(p.phone, ''),
        '[^0-9]',
        '',
        'g'
      ) = normalized_phone
  ) then
    raise exception 'whatsapp already registered'
      using errcode = '23505';
  end if;

  insert into public.players(
    organization_id,
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
    inv.organization_id,
    trim(_name),
    normalized_phone,
    org.default_monthly_fee,
    org.default_due_day,
    current_date,
    'active',
    effective_type,
    null
  );

  update public.player_invites
  set
    uses_count = uses_count + 1,
    updated_at = now()
  where id = inv.id;

  return query
  select
    org.name,
    trim(_name);
end;
$$;

revoke all
on function public.accept_player_invite(text,text,text)
from public;

grant execute
on function public.accept_player_invite(text,text,text)
to anon, authenticated;