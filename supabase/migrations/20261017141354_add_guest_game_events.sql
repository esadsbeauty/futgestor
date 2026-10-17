-- Applied to production as migration 20261017141354.
-- Preserve existing participant events; game-only players need no permanent account.
alter table public.game_guest_confirmations
  add constraint game_guest_confirmations_event_key unique (id, game_id, organization_id);

alter table public.game_events
  alter column player_id drop not null,
  add column guest_confirmation_id uuid,
  add constraint game_events_exactly_one_player check (
    num_nonnulls(player_id, guest_confirmation_id) = 1
  ),
  add constraint game_events_guest_game_fk
    foreign key (guest_confirmation_id, game_id, organization_id)
    references public.game_guest_confirmations(id, game_id, organization_id)
    on delete cascade;

create index game_events_guest_idx on public.game_events(guest_confirmation_id)
  where guest_confirmation_id is not null;
-- Existing organization-scoped RLS continues to protect these records.
