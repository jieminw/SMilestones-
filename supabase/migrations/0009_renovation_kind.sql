-- A pot can now be a renovation. The kind column had a fixed list, so widen it.
alter table public.pots drop constraint if exists pots_kind_check;
alter table public.pots add constraint pots_kind_check check (kind in ('bto', 'wedding', 'renovation', 'trip', 'custom'));
