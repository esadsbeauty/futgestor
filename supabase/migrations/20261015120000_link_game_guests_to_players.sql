alter table public.game_guest_confirmations
  add column if not exists player_id uuid;

alter table public.game_guest_confirmations
  add constraint game_guest_confirmations_player_fk
  foreign key (player_id)
  references public.players(id)
  on delete set null;

create index if not exists game_guest_confirmations_player_idx
  on public.game_guest_confirmations(player_id);
