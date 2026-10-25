-- Wedding pots keep their banquet tables and expected ang bao as JSON on the pot.
-- Written only through the server like every other pot field.
alter table public.pots add column wedding jsonb;
