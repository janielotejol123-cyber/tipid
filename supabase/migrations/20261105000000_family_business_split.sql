-- Family / Business split. Additive only: existing rows become 'family' and nothing is removed.
-- Apply this BEFORE deploying the app version that uses it (the forms save the scope column).

-- A transaction's side comes from its income source or category, so re-labelling also re-labels history.
alter table public.incomes add column if not exists scope text not null default 'family'
  check (scope in ('family','business'));
alter table public.categories add column if not exists scope text not null default 'family'
  check (scope in ('family','business'));

-- 'transfer' = business money moved to the family. Not income or spending for the whole household.
alter table public.transactions drop constraint if exists transactions_kind_check;
alter table public.transactions add constraint transactions_kind_check
  check (kind in ('expense','income','saving','transfer'));

notify pgrst, 'reload schema';
