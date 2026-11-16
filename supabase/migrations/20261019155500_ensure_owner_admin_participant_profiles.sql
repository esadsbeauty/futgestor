create or replace function public.ensure_management_member_player()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  profile_record public.profiles;
  organization_record public.organizations;
begin
  if new.role not in ('owner', 'admin') then
    return new;
  end if;

  if exists (
    select 1 from public.players p
    where p.organization_id = new.organization_id
      and p.user_id = new.user_id
  ) then
    return new;
  end if;

  select p.* into profile_record
  from public.profiles p
  where p.id = new.user_id;

  select o.* into organization_record
  from public.organizations o
  where o.id = new.organization_id;

  if profile_record.id is null or organization_record.id is null then
    return new;
  end if;

  insert into public.players(
    organization_id,user_id,name,phone,monthly_fee,due_day,joined_at,status,billing_type,notes
  )
  values(
    new.organization_id,
    new.user_id,
    profile_record.name,
    null,
    organization_record.default_monthly_fee,
    organization_record.default_due_day,
    current_date,
    'active',
    case when organization_record.billing_mode = 'monthly' then 'monthly' else 'per_game' end,
    'Perfil de participante criado automaticamente para proprietário/administrador.'
  );

  return new;
end;
$$;

drop trigger if exists on_management_member_create_player on public.organization_members;

create trigger on_management_member_create_player
after insert or update of role on public.organization_members
for each row
execute procedure public.ensure_management_member_player();

insert into public.players(
  organization_id,user_id,name,phone,monthly_fee,due_day,joined_at,status,billing_type,notes
)
select
  om.organization_id,
  om.user_id,
  p.name,
  null,
  o.default_monthly_fee,
  o.default_due_day,
  current_date,
  'active',
  case when o.billing_mode = 'monthly' then 'monthly' else 'per_game' end,
  'Perfil de participante criado automaticamente para proprietário/administrador.'
from public.organization_members om
join public.profiles p on p.id = om.user_id
join public.organizations o on o.id = om.organization_id
where om.role in ('owner','admin')
  and not exists (
    select 1 from public.players pl
    where pl.organization_id = om.organization_id
      and pl.user_id = om.user_id
  );
