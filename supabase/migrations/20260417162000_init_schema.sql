-- Extensions
create extension if not exists pgcrypto;

-- Helpers
create or replace function public.current_user_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  );
$$;

grant execute on function public.current_user_is_admin() to anon, authenticated;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    'participant'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

-- Core tables
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text not null default 'participant',
  created_at timestamptz not null default now(),
  constraint profiles_role_check check (role in ('admin', 'participant'))
);

create table if not exists public.game_sets (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  image_path text not null,
  total_items int not null default 10,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint game_sets_total_items_check check (total_items = 10)
);

create table if not exists public.game_set_answers (
  id bigserial primary key,
  game_set_id uuid not null references public.game_sets(id) on delete cascade,
  item_number int not null,
  answer_text text not null,
  accepted_aliases text[] not null default '{}',
  constraint game_set_answers_item_number_check check (item_number between 1 and 10),
  constraint game_set_answers_unique_item unique (game_set_id, item_number)
);

create table if not exists public.game_sessions (
  id uuid primary key default gen_random_uuid(),
  game_set_id uuid not null references public.game_sets(id) on delete cascade,
  title text not null,
  status text not null default 'draft',
  duration_seconds int not null,
  start_at timestamptz,
  end_at timestamptz,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  constraint game_sessions_status_check check (status in ('draft', 'scheduled', 'live', 'finished')),
  constraint game_sessions_duration_seconds_check check (duration_seconds > 0)
);

create table if not exists public.participants (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.game_sessions(id) on delete cascade,
  display_name text not null,
  joined_at timestamptz not null default now(),
  constraint participants_unique_display_name unique (session_id, display_name)
);

create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.game_sessions(id) on delete cascade,
  participant_id uuid not null references public.participants(id) on delete cascade,
  submitted_at timestamptz not null default now(),
  time_elapsed_seconds int not null,
  score int not null default 0,
  total_correct int not null default 0,
  constraint submissions_time_elapsed_check check (time_elapsed_seconds >= 0),
  constraint submissions_total_correct_check check (total_correct between 0 and 10),
  constraint submissions_unique_participant unique (session_id, participant_id)
);

create table if not exists public.submission_answers (
  id bigserial primary key,
  submission_id uuid not null references public.submissions(id) on delete cascade,
  item_number int not null,
  answer_text text not null,
  is_correct boolean not null default false,
  constraint submission_answers_item_number_check check (item_number between 1 and 10),
  constraint submission_answers_unique_item unique (submission_id, item_number)
);

-- Additional security table for participant cookie token validation
create table if not exists public.participant_tokens (
  participant_id uuid primary key references public.participants(id) on delete cascade,
  session_id uuid not null references public.game_sessions(id) on delete cascade,
  token_hash text not null,
  created_at timestamptz not null default now()
);

-- Indexes for leaderboard and session lookup
create index if not exists idx_submissions_session_ranking
  on public.submissions (session_id, total_correct desc, time_elapsed_seconds asc, submitted_at asc);

create index if not exists idx_submissions_participant
  on public.submissions (session_id, participant_id);

create index if not exists idx_game_sessions_status
  on public.game_sessions (status, start_at, end_at);

create index if not exists idx_participants_session
  on public.participants (session_id, joined_at);

create index if not exists idx_submission_answers_submission
  on public.submission_answers (submission_id, item_number);

-- Updated at trigger

drop trigger if exists trg_game_sets_updated_at on public.game_sets;
create trigger trg_game_sets_updated_at
before update on public.game_sets
for each row
execute function public.set_updated_at();

-- New user profile trigger

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

-- Leaderboard view
create or replace view public.leaderboard_view as
select
  s.session_id,
  s.participant_id,
  p.display_name,
  s.total_correct,
  s.time_elapsed_seconds,
  s.submitted_at,
  row_number() over (
    partition by s.session_id
    order by s.total_correct desc, s.time_elapsed_seconds asc, s.submitted_at asc
  )::int as rank_position
from public.submissions s
join public.participants p on p.id = s.participant_id;

-- RLS
alter table public.profiles enable row level security;
alter table public.game_sets enable row level security;
alter table public.game_set_answers enable row level security;
alter table public.game_sessions enable row level security;
alter table public.participants enable row level security;
alter table public.submissions enable row level security;
alter table public.submission_answers enable row level security;
alter table public.participant_tokens enable row level security;

-- Profiles policies
drop policy if exists profiles_select_self on public.profiles;
create policy profiles_select_self
on public.profiles
for select
using (auth.uid() = id);

drop policy if exists profiles_admin_all on public.profiles;
create policy profiles_admin_all
on public.profiles
for all
using (public.current_user_is_admin())
with check (public.current_user_is_admin());

-- Game sets policies
drop policy if exists game_sets_admin_all on public.game_sets;
create policy game_sets_admin_all
on public.game_sets
for all
using (public.current_user_is_admin())
with check (public.current_user_is_admin());

drop policy if exists game_sets_public_read_live_finished on public.game_sets;
create policy game_sets_public_read_live_finished
on public.game_sets
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.game_sessions gs
    where gs.game_set_id = game_sets.id
      and gs.status in ('live', 'finished')
  )
);

-- Game set answers policies (admin only)
drop policy if exists game_set_answers_admin_all on public.game_set_answers;
create policy game_set_answers_admin_all
on public.game_set_answers
for all
using (public.current_user_is_admin())
with check (public.current_user_is_admin());

-- Game sessions policies
drop policy if exists game_sessions_admin_all on public.game_sessions;
create policy game_sessions_admin_all
on public.game_sessions
for all
using (public.current_user_is_admin())
with check (public.current_user_is_admin());

drop policy if exists game_sessions_public_read_live_finished on public.game_sessions;
create policy game_sessions_public_read_live_finished
on public.game_sessions
for select
to anon, authenticated
using (status in ('live', 'finished'));

-- Participants policies
drop policy if exists participants_admin_read on public.participants;
create policy participants_admin_read
on public.participants
for select
using (public.current_user_is_admin());

drop policy if exists participants_public_insert_live on public.participants;
create policy participants_public_insert_live
on public.participants
for insert
to anon, authenticated
with check (
  exists (
    select 1
    from public.game_sessions gs
    where gs.id = participants.session_id
      and gs.status = 'live'
      and gs.end_at is not null
      and gs.end_at > now()
  )
);

drop policy if exists participants_public_read_for_live_leaderboard on public.participants;
create policy participants_public_read_for_live_leaderboard
on public.participants
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.game_sessions gs
    where gs.id = participants.session_id
      and gs.status in ('live', 'finished')
  )
);

-- Submissions policies
drop policy if exists submissions_admin_read on public.submissions;
create policy submissions_admin_read
on public.submissions
for select
using (public.current_user_is_admin());

drop policy if exists submissions_public_read_for_leaderboard on public.submissions;
create policy submissions_public_read_for_leaderboard
on public.submissions
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.game_sessions gs
    where gs.id = submissions.session_id
      and gs.status in ('live', 'finished')
  )
);

drop policy if exists submissions_public_insert_live on public.submissions;
create policy submissions_public_insert_live
on public.submissions
for insert
to anon, authenticated
with check (
  exists (
    select 1
    from public.participants p
    join public.game_sessions gs on gs.id = p.session_id
    where p.id = submissions.participant_id
      and p.session_id = submissions.session_id
      and gs.status = 'live'
      and gs.end_at is not null
      and gs.end_at > now()
  )
);

-- Submission answers policies
drop policy if exists submission_answers_admin_read on public.submission_answers;
create policy submission_answers_admin_read
on public.submission_answers
for select
using (public.current_user_is_admin());

drop policy if exists submission_answers_public_insert on public.submission_answers;
create policy submission_answers_public_insert
on public.submission_answers
for insert
to anon, authenticated
with check (
  exists (
    select 1
    from public.submissions s
    join public.game_sessions gs on gs.id = s.session_id
    where s.id = submission_answers.submission_id
      and gs.status = 'live'
      and gs.end_at is not null
      and gs.end_at > now()
  )
);

-- Participant token policies (server-side only by service role)
drop policy if exists participant_tokens_admin_read on public.participant_tokens;
create policy participant_tokens_admin_read
on public.participant_tokens
for select
using (public.current_user_is_admin());

-- Storage bucket and policies
insert into storage.buckets (id, name, public)
values ('game-images', 'game-images', true)
on conflict (id) do nothing;

drop policy if exists storage_game_images_public_read on storage.objects;
create policy storage_game_images_public_read
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'game-images');

drop policy if exists storage_game_images_admin_insert on storage.objects;
create policy storage_game_images_admin_insert
on storage.objects
for insert
to authenticated
with check (bucket_id = 'game-images' and public.current_user_is_admin());

drop policy if exists storage_game_images_admin_update on storage.objects;
create policy storage_game_images_admin_update
on storage.objects
for update
to authenticated
using (bucket_id = 'game-images' and public.current_user_is_admin())
with check (bucket_id = 'game-images' and public.current_user_is_admin());

drop policy if exists storage_game_images_admin_delete on storage.objects;
create policy storage_game_images_admin_delete
on storage.objects
for delete
to authenticated
using (bucket_id = 'game-images' and public.current_user_is_admin());
