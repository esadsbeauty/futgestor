-- Run after `supabase db reset`: psql "$DATABASE_URL" -f supabase/tests/financial_rpcs.sql
begin;
do $$
declare u uuid := gen_random_uuid(); org uuid; player uuid; fee uuid; bill uuid;
begin
  insert into auth.users(id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
  values(u,'00000000-0000-0000-0000-000000000000','authenticated','authenticated','rpc-test@example.com','',now(),'{}','{"name":"Teste","organization_name":"Teste RPC","default_monthly_fee":50,"default_due_day":31}',now(),now());
  select organization_id into org from public.organization_members where user_id=u;
  perform set_config('request.jwt.claim.sub',u::text,true);
  perform set_config('request.jwt.claim.role','authenticated',true);
  insert into public.players(organization_id,name,monthly_fee,due_day,joined_at) values(org,'João',50,31,current_date) returning id into player;
  perform public.ensure_month_fees(org,'2026-02-15');
  perform public.ensure_month_fees(org,'2026-02-15');
  if (select count(*) from public.monthly_fees where player_id=player and reference_month='2026-02-01') <> 1 then raise exception 'fee generation is not idempotent'; end if;
  select id into fee from public.monthly_fees where player_id=player;
  if (select due_date from public.monthly_fees where id=fee) <> '2026-02-28' then raise exception 'due date was not clamped'; end if;
  perform public.mark_fee_paid(fee); perform public.mark_fee_paid(fee);
  if (select count(*) from public.transactions where monthly_fee_id=fee) <> 1 then raise exception 'fee payment duplicated income'; end if;
  insert into public.bills(organization_id,description,amount,due_date) values(org,'Água',10,current_date) returning id into bill;
  perform public.mark_bill_paid(bill); perform public.mark_bill_paid(bill);
  if (select count(*) from public.transactions t join public.bills b on b.transaction_id=t.id where b.id=bill) <> 1 then raise exception 'bill payment duplicated expense'; end if;
end $$;
rollback;
