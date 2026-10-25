-- A contribution can be confirmed against the user's own bank statement.
-- The statement is parsed in the browser and never uploaded; only this timestamp is stored.
alter table public.transactions add column verified_at timestamptz;
