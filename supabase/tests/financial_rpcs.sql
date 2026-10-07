-- Run after `supabase db reset`: psql "$DATABASE_URL" -f supabase/tests/financial_rpcs.sql
begin;
do $$
declare u uuid := gen_random_uuid(); u2 uuid := gen_random_uuid(); u3 uuid := gen_random_uuid(); u4 uuid := gen_random_uuid(); org uuid; org2 uuid; org3 uuid; org4 uuid; player uuid; player2 uuid; player3 uuid; player4 uuid; player5 uuid; player6 uuid; invited_player uuid; fee uuid; fee2 uuid; bill uuid; bill2 uuid; game_id uuid; charge_id uuid; expense_id uuid; balance numeric; access_token text; regenerated_token text;
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
  update public.organizations set billing_mode='per_game' where id=org;
  perform public.ensure_month_fees(org,'2026-04-01');
  if not exists(select 1 from public.monthly_fees where player_id=player and reference_month='2026-02-01' and amount=50) then raise exception 'historical fee was changed'; end if;
  if exists(select 1 from public.monthly_fees where player_id=player and reference_month='2026-04-01') then raise exception 'per-game organization generated a fee'; end if;

  -- A per-game organization generates no monthly fees.
  insert into auth.users(id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
  values(u3,'00000000-0000-0000-0000-000000000000','authenticated','authenticated','rpc-per-game@example.com','',now(),'{}','{"name":"Jogo","organization_name":"Por jogo","default_monthly_fee":30,"default_due_day":10}',now(),now());
  select organization_id into org3 from public.organization_members where user_id=u3;
  update public.organizations set billing_mode='per_game' where id=org3;
  insert into public.players(organization_id,name,monthly_fee,due_day,joined_at,billing_type) values(org3,'Avulso',30,10,current_date,'per_game') returning id into player3;
  perform set_config('request.jwt.claim.sub',u3::text,true); perform public.ensure_month_fees(org3,'2026-05-01');
  if exists(select 1 from public.monthly_fees where player_id=player3) then raise exception 'per-game participant received a fee'; end if;

  -- A hybrid organization generates only for active monthly players and remains idempotent.
  insert into auth.users(id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
  values(u4,'00000000-0000-0000-0000-000000000000','authenticated','authenticated','rpc-hybrid@example.com','',now(),'{}','{"name":"Híbrido","organization_name":"Híbrida","default_monthly_fee":40,"default_due_day":10}',now(),now());
  select organization_id into org4 from public.organization_members where user_id=u4;
  update public.organizations set billing_mode='hybrid' where id=org4;
  insert into public.players(organization_id,name,monthly_fee,due_day,joined_at,billing_type) values(org4,'Mensalista',40,10,current_date,'monthly') returning id into player4;
  insert into public.players(organization_id,name,monthly_fee,due_day,joined_at,billing_type) values(org4,'Avulso',40,10,current_date,'per_game') returning id into player5;
  insert into public.players(organization_id,name,monthly_fee,due_day,joined_at,billing_type,status) values(org4,'Inativo',40,10,current_date,'monthly','inactive') returning id into player6;
  perform set_config('request.jwt.claim.sub',u4::text,true); perform public.ensure_month_fees(org4,'2026-05-01'); perform public.ensure_month_fees(org4,'2026-05-01');
  if (select count(*) from public.monthly_fees where organization_id=org4) <> 1 then raise exception 'hybrid generation was incorrect or duplicated'; end if;
  if not exists(select 1 from public.monthly_fees where player_id=player4) or exists(select 1 from public.monthly_fees where player_id in (player5,player6)) then raise exception 'hybrid eligibility is incorrect'; end if;

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

  -- Per-game ledger entries are idempotent, organization-safe and preserve charge amounts.
  perform set_config('request.jwt.claim.sub',u::text,true);
  insert into public.games(organization_id,title,game_date,player_price,created_by) values(org,'Baba teste','2026-06-01',10,u) returning id into game_id;
  insert into public.game_charges(organization_id,game_id,player_id,amount) values(org,game_id,player,10) returning id into charge_id;
  begin insert into public.game_charges(organization_id,game_id,player_id,amount) values(org,game_id,player,10); raise exception 'duplicate game charge was allowed'; exception when unique_violation then null; end;
  update public.games set player_price=15 where id=game_id;
  if (select amount from public.game_charges where id=charge_id) <> 10 then raise exception 'game price rewrote existing charge'; end if;
  perform public.mark_game_charge_paid(charge_id); perform public.mark_game_charge_paid(charge_id);
  if (select count(*) from public.transactions where id=(select transaction_id from public.game_charges where id=charge_id)) <> 1 then raise exception 'game charge duplicated income'; end if;
  insert into public.game_expenses(organization_id,game_id,description,category,amount) values(org,game_id,'Aluguel','rental',6) returning id into expense_id;
  perform public.mark_game_expense_paid(expense_id); perform public.mark_game_expense_paid(expense_id);
  if (select count(*) from public.transactions where id=(select transaction_id from public.game_expenses where id=expense_id)) <> 1 then raise exception 'game expense duplicated expense'; end if;
  select coalesce(sum(case when type='income' then amount else -amount end),0) into balance from public.transactions where organization_id=org;
  if balance <> 44 then raise exception 'game ledger balance is inconsistent: %',balance; end if;
  perform set_config('request.jwt.claim.sub',u2::text,true);
  begin perform public.mark_game_charge_paid(charge_id); raise exception 'cross-organization game charge payment was allowed'; exception when insufficient_privilege then null; end;
  begin perform public.mark_game_expense_paid(expense_id); raise exception 'cross-organization game expense payment was allowed'; exception when insufficient_privilege then null; end;

  -- Public player invites enforce availability, organization defaults and billing rules.
  insert into public.player_invites(organization_id,token,billing_type,created_by,max_uses)
    values(org2,'monthly-invite','per_game',u2,1);
  perform public.accept_player_invite('monthly-invite','Convidado mensal','(71) 99999-1001');
  select id into invited_player from public.players where organization_id=org2 and phone='71999991001';
  select token into access_token from public.player_access_tokens where player_id=invited_player and active;
  if access_token is null then raise exception 'invite did not create player access'; end if;
  if not exists(select 1 from public.players where organization_id=org2 and phone='71999991001' and billing_type='monthly' and monthly_fee=70 and due_day=10) then raise exception 'monthly invite did not enforce organization defaults'; end if;
  if (select uses_count from public.player_invites where token='monthly-invite') <> 1 then raise exception 'invite use was not counted'; end if;
  begin perform public.accept_player_invite('monthly-invite','Limite','71999991002'); raise exception 'exhausted invite was accepted'; exception when raise_exception then if sqlerrm='exhausted invite was accepted' then raise; end if; end;

  insert into public.player_invites(organization_id,token,billing_type,created_by) values(org2,'inactive-invite','monthly',u2);
  update public.player_invites set active=false where token='inactive-invite';
  begin perform public.accept_player_invite('inactive-invite','Inativo','71999991003'); raise exception 'inactive invite was accepted'; exception when raise_exception then if sqlerrm='inactive invite was accepted' then raise; end if; end;
  insert into public.player_invites(organization_id,token,billing_type,created_by,expires_at) values(org2,'expired-invite','monthly',u2,now()-interval '1 minute');
  begin perform public.accept_player_invite('expired-invite','Expirado','71999991004'); raise exception 'expired invite was accepted'; exception when raise_exception then if sqlerrm='expired invite was accepted' then raise; end if; end;

  insert into public.player_invites(organization_id,token,billing_type,created_by) values(org2,'duplicate-phone','monthly',u2);
  begin perform public.accept_player_invite('duplicate-phone','Duplicado','71 99999-1001'); raise exception 'duplicate whatsapp was accepted'; exception when unique_violation then null; end;
  if (select uses_count from public.player_invites where token='duplicate-phone') <> 0 then raise exception 'failed invite acceptance incremented use count'; end if;

  insert into public.player_invites(organization_id,token,billing_type,created_by) values(org3,'per-game-invite','monthly',u3);
  perform public.accept_player_invite('per-game-invite','Convidado avulso','71999991005');
  if not exists(select 1 from public.players where organization_id=org3 and phone='71999991005' and billing_type='per_game') then raise exception 'per-game invite did not force per-game billing'; end if;

  insert into public.player_invites(organization_id,token,billing_type,created_by) values(org4,'hybrid-invite','per_game',u4);
  perform public.accept_player_invite('hybrid-invite','Convidado híbrido','71999991006');
  if not exists(select 1 from public.players where organization_id=org4 and phone='71999991006' and billing_type='per_game') then raise exception 'hybrid invite ignored its billing type'; end if;

  -- The public portal only accepts a valid active player and exposes future games from that organization.
  if not exists(select 1 from public.get_player_portal(access_token) where available and player_name='Convidado mensal' and organization_name='Outra org') then raise exception 'valid portal did not return its player'; end if;
  if (select last_used_at from public.player_access_tokens where token=access_token) is null then raise exception 'portal did not update last use'; end if;
  if exists(select 1 from public.get_player_portal('invalid-token')) then raise exception 'invalid portal token returned data'; end if;
  insert into public.games(organization_id,title,game_date,player_price,created_by) values(org2,'Jogo futuro',current_date+1,10,u2);
  insert into public.games(organization_id,title,game_date,player_price,created_by) values(org2,'Jogo passado',current_date-1,10,u2);
  insert into public.games(organization_id,title,game_date,player_price,created_by) values(org3,'Jogo de outra organização',current_date+1,10,u3);
  if (select count(*) from public.get_player_portal_games(access_token)) <> 1 then raise exception 'portal games leaked another organization or returned a past game'; end if;

  update public.player_access_tokens set expires_at=now()-interval '1 minute' where token=access_token;
  if exists(select 1 from public.get_player_portal(access_token) where available) then raise exception 'expired access remained available'; end if;
  update public.player_access_tokens set expires_at=null,active=false where token=access_token;
  if exists(select 1 from public.get_player_portal(access_token) where available) then raise exception 'inactive access remained available'; end if;
  update public.player_access_tokens set active=true where token=access_token;
  update public.players set status='inactive' where id=invited_player;
  if exists(select 1 from public.get_player_portal(access_token) where available) then raise exception 'inactive player accessed portal'; end if;
  update public.players set status='active' where id=invited_player;

  perform set_config('request.jwt.claim.sub',u2::text,true);
  regenerated_token := public.regenerate_player_access(invited_player);
  if regenerated_token=access_token or not exists(select 1 from public.player_access_tokens where token=regenerated_token and active) then raise exception 'access regeneration failed'; end if;
  if exists(select 1 from public.player_access_tokens where token=access_token and active) then raise exception 'regeneration left old token active'; end if;
  begin insert into public.player_access_tokens(organization_id,player_id,token) values(org3,invited_player,'cross-org-token'); raise exception 'cross-organization player token was allowed'; exception when foreign_key_violation then null; end;
  if exists(select 1 from pg_policies where schemaname='public' and tablename='player_access_tokens' and policyname ilike '%anon%') then raise exception 'anonymous direct token policy exists'; end if;
end $$;
rollback;
