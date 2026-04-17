-- Waiting room lifecycle: participants join on scheduled sessions

drop policy if exists participants_public_insert_live on public.participants;
drop policy if exists participants_public_insert_scheduled on public.participants;
create policy participants_public_insert_scheduled
on public.participants
for insert
to anon, authenticated
with check (
  exists (
    select 1
    from public.game_sessions gs
    where gs.id = participants.session_id
      and gs.status = 'scheduled'
  )
);

drop policy if exists participants_public_read_for_live_leaderboard on public.participants;
drop policy if exists participants_public_read_for_waiting_and_leaderboard on public.participants;
create policy participants_public_read_for_waiting_and_leaderboard
on public.participants
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.game_sessions gs
    where gs.id = participants.session_id
      and gs.status in ('scheduled', 'live', 'finished')
  )
);
