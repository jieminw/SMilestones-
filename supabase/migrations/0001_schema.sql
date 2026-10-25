-- SMilestones schema
-- Money is stored as integer cents. Balances are never stored: they are computed
-- from `transactions`, so there is exactly one source of truth.


-- ---------------------------------------------------------------- couples & people
create table public.couples (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  pet_name    text not null default 'Fluffy',
  version     integer not null default 1,          -- optimistic concurrency
  created_at  timestamptz not null default now()
);

create table public.profiles (
  id              uuid primary key references auth.users (id) on delete cascade,
  couple_id       uuid references public.couples (id) on delete set null,
  display_name    text not null,
  monthly_income  integer,
  age             integer,
  first_timer     boolean,
  created_at      timestamptz not null default now()
);
create index on public.profiles (couple_id);

create table public.invites (
  code        text primary key,
  created_by  uuid not null references public.profiles (id) on delete cascade,
  expires_at  timestamptz not null,
  used_by     uuid references public.profiles (id),
  used_at     timestamptz
);

-- ---------------------------------------------------------------- pots
create table public.pots (
  id           uuid primary key,
  couple_id    uuid not null references public.couples (id) on delete cascade,
  kind         text not null check (kind in ('bto', 'wedding', 'trip', 'custom')),
  name         text not null,
  subtitle     text not null default '',
  status       text not null check (status in ('draft', 'pending_split', 'active', 'completed')),
  sequential   boolean not null default false,
  target_date  date not null,
  created_by   uuid not null references public.profiles (id),
  created_at   timestamptz not null default now(),
  bto          jsonb
);
create index on public.pots (couple_id);

create table public.stages (
  id           uuid primary key,
  pot_id       uuid not null references public.pots (id) on delete cascade,
  idx          integer not null,
  name         text not null,
  description  text not null default '',
  target       integer not null check (target >= 0),
  due_date     date
);
create index on public.stages (pot_id);

create table public.proposals (
  id             uuid primary key,
  pot_id         uuid not null references public.pots (id) on delete cascade,
  couple_id      uuid not null references public.couples (id) on delete cascade,
  proposed_by    uuid not null references public.profiles (id),
  mode           text not null check (mode in ('equal', 'income', 'custom')),
  shares         jsonb not null,
  monthly_total  integer not null check (monthly_total > 0),
  status         text not null check (status in ('pending', 'accepted', 'declined', 'superseded')),
  response_note  text,
  responded_at   timestamptz,
  created_at     timestamptz not null default now()
);
create index on public.proposals (couple_id);

-- ---------------------------------------------------------------- the ledger
create table public.requests (
  id             uuid primary key,
  couple_id      uuid not null references public.couples (id) on delete cascade,
  kind           text not null check (kind in ('withdrawal', 'transfer')),
  pot_id         uuid not null references public.pots (id) on delete cascade,
  to_pot_id      uuid references public.pots (id) on delete cascade,
  amount         integer not null check (amount > 0),
  reason         text not null default '',
  requested_by   uuid not null references public.profiles (id),
  status         text not null check (status in ('pending', 'approved', 'declined', 'cancelled', 'expired')),
  response_note  text,
  expires_at     timestamptz not null,
  responded_at   timestamptz,
  created_at     timestamptz not null default now(),
  check ((kind = 'transfer') = (to_pot_id is not null))
);
create index on public.requests (couple_id);

create table public.transactions (
  id           uuid primary key,
  couple_id    uuid not null references public.couples (id) on delete cascade,
  pot_id       uuid not null references public.pots (id) on delete cascade,
  kind         text not null check (kind in ('contribution', 'withdrawal', 'transfer_in', 'transfer_out')),
  amount       integer not null check (amount > 0),
  user_id      uuid not null references public.profiles (id),
  note         text not null default '',
  occurred_on  date not null,
  created_at   timestamptz not null default now(),
  edited_at    timestamptz,
  voided_at    timestamptz,                         -- soft delete enables "Undo"
  request_id   uuid references public.requests (id) on delete set null
);
create index on public.transactions (couple_id);
create index on public.transactions (pot_id) where voided_at is null;

-- ---------------------------------------------------------------- pet & notifications
create table public.pet_care (
  id          uuid primary key,
  couple_id   uuid not null references public.couples (id) on delete cascade,
  user_id     uuid not null references public.profiles (id),
  action      text not null check (action in ('food', 'play', 'rest', 'outfit')),
  coins       integer not null check (coins >= 0),
  created_at  timestamptz not null default now()
);
create index on public.pet_care (couple_id);

create table public.notifications (
  id          uuid primary key,
  couple_id   uuid not null references public.couples (id) on delete cascade,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  text        text not null,
  href        text not null default '/home',
  read        boolean not null default false,
  created_at  timestamptz not null default now()
);
create index on public.notifications (user_id, read);

-- ---------------------------------------------------------------- new users get a profile
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(nullif(new.raw_user_meta_data ->> 'display_name', ''), split_part(new.email, '@', 1)));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------- row level security
-- All writes go through the Next.js server (which runs the domain engine and checks
-- membership). RLS is defence in depth: with the public key, a signed-in user can only
-- ever READ their own couple's rows, and can never write directly.

create function public.my_couple_id() returns uuid
language sql stable security definer set search_path = public as $$
  select couple_id from public.profiles where id = auth.uid()
$$;

alter table public.couples       enable row level security;
alter table public.profiles      enable row level security;
alter table public.invites       enable row level security;
alter table public.pots          enable row level security;
alter table public.stages        enable row level security;
alter table public.proposals     enable row level security;
alter table public.requests      enable row level security;
alter table public.transactions  enable row level security;
alter table public.pet_care      enable row level security;
alter table public.notifications enable row level security;

create policy "read own couple"    on public.couples       for select using (id = public.my_couple_id());
create policy "read self & partner" on public.profiles     for select using (id = auth.uid() or couple_id = public.my_couple_id());
create policy "read own invites"   on public.invites       for select using (created_by = auth.uid());
create policy "read couple pots"   on public.pots          for select using (couple_id = public.my_couple_id());
create policy "read couple stages" on public.stages        for select using (pot_id in (select id from public.pots where couple_id = public.my_couple_id()));
create policy "read couple splits" on public.proposals     for select using (couple_id = public.my_couple_id());
create policy "read couple reqs"   on public.requests      for select using (couple_id = public.my_couple_id());
create policy "read couple ledger" on public.transactions  for select using (couple_id = public.my_couple_id());
create policy "read couple pet"    on public.pet_care      for select using (couple_id = public.my_couple_id());
create policy "read my notifs"     on public.notifications for select using (user_id = auth.uid());
