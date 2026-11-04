-- Owner can delete their household (used to undo a failed sign-up setup). Deletes cascade.
create policy "owner deletes household" on public.households for delete
  using (created_by = auth.uid());
grant delete on public.households to authenticated;

-- Clean up sign-ups that failed half-way (bug fixed 2026-11-04):
-- the last setup step sets emergency_target and creates goals, so these have neither.
delete from public.households h
where h.emergency_target = 0
  and not exists (select 1 from public.goals g where g.household_id = h.id)
  and not exists (select 1 from public.transactions t where t.household_id = h.id);

notify pgrst, 'reload schema';
