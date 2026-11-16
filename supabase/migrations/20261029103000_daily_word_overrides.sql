-- Idempotent schema for special Palavra do Dia overrides.
create table if not exists public.daily_word_overrides (
  day_key text primary key check (day_key ~ '^[0-9]{2}-[0-9]{2}$'),
  reference text not null check(length(reference) between 2 and 100),
  title text not null check(length(title) between 2 and 120),
  reflection text not null check(length(reflection) between 5 and 700),
  updated_at timestamptz not null default now()
);
alter table public.daily_word_overrides enable row level security;
drop policy if exists daily_word_public_read on public.daily_word_overrides;
create policy daily_word_public_read on public.daily_word_overrides
  for select to anon, authenticated using (true);
-- Writes are restricted to the service-role client after server-side organization admin verification.
