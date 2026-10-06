-- Run after `supabase db reset`: psql "$DATABASE_URL" -f supabase/tests/financial_rpcs.sql
begin;
do $$
declare u uuid := gen_random_uuid(); u2 uuid := gen_random_uuid(); org uuid; org2 uuid; player uuid; player2 uuid; fee uuid; fee2 uuid; bill uuid; bill2 uuid; balance numeric;
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
  -- Editing player defaults must not rewrite history; only a later generated fee uses the new amount.
  update public.players set monthly_fee=55,due_day=15 where id=player;
  perform public.ensure_month_fees(org,'2026-03-01');
  if (select amount from public.monthly_fees where player_id=player and reference_month='2026-02-01') <> 50 then raise exception 'editing player rewrote fee history'; end if;
  if (select amount from public.monthly_fees where player_id=player and reference_month='2026-03-01') <> 55 then raise exception 'future fee ignored new player amount'; end if;
  insert into public.bills(organization_id,description,amount,due_date) values(org,'Água',10,current_date) returning id into bill;
  perform public.mark_bill_paid(bill); perform public.mark_bill_paid(bill);
  if (select count(*) from public.transactions t join public.bills b on b.transaction_id=t.id where b.id=bill) <> 1 then raise exception 'bill payment duplicated expense'; end if;
  select coalesce(sum(case when type='income' then amount else -amount end),0) into balance from public.transactions where organization_id=org;
  if balance <> 40 then raise exception 'transaction balance is inconsistent: %', balance; end if;

  -- A member of the first organization cannot pay resources belonging to another organization.
  insert into auth.users(id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
  values(u2,'00000000-0000-0000-0000-000000000000','authenticated','authenticated','rpc-test-2@example.com','',now(),'{}','{"name":"Outro","organization_name":"Outra org","default_monthly_fee":70,"default_due_day":10}',now(),now());
  select organization_id into org2 from public.organization_members where user_id=u2;
  insert into public.players(organization_id,name,monthly_fee,due_day,joined_at) values(org2,'Carlos',70,10,current_date) returning id into player2;
  perform set_config('request.jwt.claim.sub',u2::text,true);
  perform public.ensure_month_fees(org2,'2026-02-01');
  select id into fee2 from public.monthly_fees where player_id=player2;
  insert into public.bills(organization_id,description,amount,due_date) values(org2,'Conta privada',25,current_date) returning id into bill2;
  perform set_config('request.jwt.claim.sub',u::text,true);
  begin perform public.mark_fee_paid(fee2); raise exception 'cross-organization fee payment was allowed'; exception when insufficient_privilege then null; end;
  begin perform public.mark_bill_paid(bill2); raise exception 'cross-organization bill payment was allowed'; exception when insufficient_privilege then null; end;
  if exists(select 1 from public.transactions where organization_id=org2) then raise exception 'unauthorized payment created a transaction'; end if;
end $$;
rollback;
