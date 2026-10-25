-- Parents (and others) as limited contributors on a single pot.
-- The couple stay the owners. A contributor can read that one pot, its stages and its ledger, and nothing else:
-- no other pots, no splits, requests, covers, partner profiles or incomes. Writes go through the server, which
-- enforces the same rule in the domain engine (a contributor may only log a gift to a pot they belong to).

create table public.pot_members (
  id            uuid primary key,
  couple_id     uuid not null references public.couples (id) on delete cascade,
  pot_id        uuid not null references public.pots (id) on delete cascade,
  user_id       uuid not null references public.profiles (id) on delete cascade,
  role          text not null default 'contributor' check (role in ('partner', 'contributor')),
  display_name  text not null,
  created_at    timestamptz not null default now(),
  unique (pot_id, user_id)
);
create index on public.pot_members (couple_id);
create index on public.pot_members (user_id);

-- Pot-specific invitation codes created by a partner.
create table public.pot_invites (
  code        text primary key,
  couple_id   uuid not null references public.couples (id) on delete cascade,
  pot_id      uuid not null references public.pots (id) on delete cascade,
  created_by  uuid not null references public.profiles (id) on delete cascade,
  label       text not null,
  expires_at  timestamptz not null,
  used_by     uuid references public.profiles (id),
  used_at     timestamptz,
  created_at  timestamptz not null default now()
);
create index on public.pot_invites (pot_id);

create function public.my_contributor_pot_ids() returns setof uuid
language sql stable security definer set search_path = public as $$
  select pot_id from public.pot_members where user_id = auth.uid() and role = 'contributor'
$$;

alter table public.pot_members enable row level security;
alter table public.pot_invites enable row level security;

create policy "read couple members"        on public.pot_members for select using (couple_id = public.my_couple_id() or user_id = auth.uid());
create policy "read own pot invites"       on public.pot_invites for select using (created_by = auth.uid());
-- Contributors: only the pot they were invited to, its stages and its ledger.
create policy "contributor reads pot"      on public.pots         for select using (id in (select public.my_contributor_pot_ids()));
create policy "contributor reads stages"   on public.stages       for select using (pot_id in (select public.my_contributor_pot_ids()));
create policy "contributor reads ledger"   on public.transactions for select using (pot_id in (select public.my_contributor_pot_ids()));
create policy "contributor reads couple"   on public.couples      for select using (id in (select couple_id from public.pot_members where user_id = auth.uid()));
