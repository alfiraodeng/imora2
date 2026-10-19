-- Run once in the Supabase SQL Editor for the IMORA project.
-- This replaces the previous "logged_in_read using (true)" policies, which
-- allowed any authenticated user to read another user's operational records.

alter table public.imora_scenarios enable row level security;
alter table public.imora_monitoring_areas enable row level security;
alter table public.imora_status_history enable row level security;

drop policy if exists "imora_scenarios_logged_in_read" on public.imora_scenarios;
drop policy if exists "imora_scenarios_read_own" on public.imora_scenarios;
create policy "imora_scenarios_read_own"
on public.imora_scenarios for select to authenticated
using (owner_id = auth.uid());

drop policy if exists "imora_areas_logged_in_read" on public.imora_monitoring_areas;
drop policy if exists "imora_areas_read_own" on public.imora_monitoring_areas;
create policy "imora_areas_read_own"
on public.imora_monitoring_areas for select to authenticated
using (owner_id = auth.uid());

drop policy if exists "imora_history_logged_in_read" on public.imora_status_history;
drop policy if exists "imora_history_read_own" on public.imora_status_history;
create policy "imora_history_read_own"
on public.imora_status_history for select to authenticated
using (owner_id = auth.uid());
