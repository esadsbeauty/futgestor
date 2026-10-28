alter table public.game_guest_confirmations
  add column if not exists payment_status text not null default 'pending'
    check (payment_status in ('pending','paid')),
  add column if not exists paid_at timestamptz,
  add column if not exists payment_transaction_id uuid;

alter table public.game_guest_confirmations
  add constraint game_guest_confirmations_payment_transaction_fk
  foreign key (payment_transaction_id, organization_id)
  references public.transactions(id, organization_id)
  on delete set null (payment_transaction_id);

create unique index if not exists game_guest_confirmations_payment_transaction_uidx
  on public.game_guest_confirmations(payment_transaction_id)
  where payment_transaction_id is not null;

create or replace function public.mark_game_guest_paid(_confirmation uuid)
returns public.game_guest_confirmations
language plpgsql
security definer
set search_path = ''
as $$
declare
  confirmation public.game_guest_confirmations;
  game_record public.games;
  tx uuid;
begin
  select *
  into confirmation
  from public.game_guest_confirmations
  where id = _confirmation
  for update;

  if confirmation.id is null then
    raise exception 'confirmation not found' using errcode = 'P0001';
  end if;

  if not public.is_org_member(confirmation.organization_id) then
    raise exception 'access denied' using errcode = '42501';
  end if;

  if confirmation.attendance_status <> 'confirmed' then
    raise exception 'player is not confirmed' using errcode = 'P0001';
  end if;

  if confirmation.payment_status <> 'paid' then
    select *
    into game_record
    from public.games
    where id = confirmation.game_id
      and organization_id = confirmation.organization_id;

    insert into public.transactions(
      organization_id,
      player_id,
      type,
      category,
      description,
      amount,
      transaction_date
    )
    values(
      confirmation.organization_id,
      confirmation.player_id,
      'income',
      'Jogo',
      game_record.title || ' - ' || confirmation.name,
      game_record.player_price,
      game_record.game_date
    )
    returning id into tx;

    update public.game_guest_confirmations
    set payment_status = 'paid',
        paid_at = now(),
        payment_transaction_id = tx,
        updated_at = now()
    where id = _confirmation
    returning * into confirmation;
  end if;

  return confirmation;
end;
$$;

revoke all on function public.mark_game_guest_paid(uuid) from public;
grant execute on function public.mark_game_guest_paid(uuid) to authenticated;
