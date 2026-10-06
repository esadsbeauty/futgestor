alter table public.organizations
  add column billing_mode text not null default 'monthly'
  constraint organizations_billing_mode_check check (billing_mode in ('monthly', 'per_game', 'hybrid'));

alter table public.players
  add column billing_type text not null default 'monthly'
  constraint players_billing_type_check check (billing_type in ('monthly', 'per_game'));

create or replace function public.ensure_month_fees(_org uuid, _month date) returns setof public.monthly_fees language plpgsql security definer set search_path = '' as $$
declare
  month_start date := date_trunc('month', _month)::date;
  month_end date := (date_trunc('month', _month) + interval '1 month - 1 day')::date;
  org_billing_mode text;
begin
  if not public.is_org_member(_org) then raise exception 'access denied' using errcode = '42501'; end if;
  select o.billing_mode into org_billing_mode from public.organizations o where o.id = _org;
  if org_billing_mode is null then raise exception 'organization not found'; end if;
  if org_billing_mode = 'per_game' then return; end if;

  return query insert into public.monthly_fees(organization_id,player_id,reference_month,amount,due_date)
    select _org,p.id,month_start,p.monthly_fee,least(month_start + (p.due_day - 1),month_end)
    from public.players p
    where p.organization_id = _org
      and p.status = 'active'
      and (org_billing_mode = 'monthly' or (org_billing_mode = 'hybrid' and p.billing_type = 'monthly'))
    on conflict (player_id,reference_month) do nothing returning *;
end $$;

revoke all on function public.ensure_month_fees(uuid,date) from public;
grant execute on function public.ensure_month_fees(uuid,date) to authenticated;
