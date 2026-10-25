-- "Cover me": a partner pays the other's missed monthly share and is paid back over the next few months.
-- Written only through the server; with the public key a user can only read their own couple's rows.
alter table public.transactions add column covering uuid references public.profiles (id);

create table public.covers (
  id            uuid primary key,
  couple_id     uuid not null references public.couples (id) on delete cascade,
  pot_id        uuid not null references public.pots (id) on delete cascade,
  payer_id      uuid not null references public.profiles (id),
  for_user_id   uuid not null references public.profiles (id),
  month         date not null,
  amount        integer not null check (amount > 0),
  months        integer not null check (months between 1 and 6),
  status        text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'cancelled')),
  response_note text,
  responded_at  timestamptz,
  created_at    timestamptz not null default now(),
  check (payer_id <> for_user_id)
);
create index on public.covers (couple_id);
create index on public.covers (pot_id);

alter table public.covers enable row level security;
create policy "read couple covers" on public.covers for select using (couple_id = public.my_couple_id());
