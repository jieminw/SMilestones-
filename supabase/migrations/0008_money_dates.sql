-- The monthly money date: one row per couple per month, with the partners who have marked it done.
-- Written only through the server; with the public key a user can only read their own couple's rows.
create table public.money_dates (
  id            uuid primary key,
  couple_id     uuid not null references public.couples (id) on delete cascade,
  month         date not null check (extract(day from month) = 1),
  completed_by  jsonb not null default '[]'::jsonb,
  created_at    timestamptz not null default now(),
  unique (couple_id, month)
);
create index on public.money_dates (couple_id);

alter table public.money_dates enable row level security;
create policy "read couple money dates" on public.money_dates for select using (couple_id = public.my_couple_id());
