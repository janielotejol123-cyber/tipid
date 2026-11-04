-- Income that varies (business, projects): frequency 'variable', amount = typical month (estimate)
alter table public.incomes drop constraint if exists incomes_frequency_check;
alter table public.incomes add constraint incomes_frequency_check
  check (frequency in ('monthly','semi_monthly','weekly','variable'));

-- Money received is recorded as an income transaction linked to its source
alter table public.transactions add column if not exists income_id uuid references public.incomes(id) on delete set null;

notify pgrst, 'reload schema';
