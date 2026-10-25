-- BTO applications per pot: exercise, project, flat type, result and queue number.
-- Written only through the server; with the public key a user can only read their own couple's rows.
create table public.bto_applications (
  id            uuid primary key,
  couple_id     uuid not null references public.couples (id) on delete cascade,
  pot_id        uuid not null references public.pots (id) on delete cascade,
  exercise      text not null,
  project_id    text,
  flat_type     text not null,
  applied_on    date not null,
  result        text not null default 'pending' check (result in ('pending', 'successful', 'unsuccessful', 'declined')),
  queue_number  integer check (queue_number is null or queue_number > 0),
  created_at    timestamptz not null default now()
);
create index on public.bto_applications (couple_id);
create index on public.bto_applications (pot_id);

alter table public.bto_applications enable row level security;
create policy "read couple applications" on public.bto_applications for select using (couple_id = public.my_couple_id());
