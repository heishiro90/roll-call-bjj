-- ============================================
-- BJJ APP — Full Database Schema
-- Run this in Supabase SQL Editor
-- ============================================
-- STEP 1: Create all tables first
-- STEP 2: Enable RLS
-- STEP 3: Add all policies (all tables exist)
-- STEP 4: Trigger + Views
-- ============================================


-- ==========================================
-- STEP 1: TABLES
-- ==========================================

create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  display_name text not null,
  belt text not null default 'white' check (belt in ('white','blue','purple','brown','black')),
  stripes int not null default 0 check (stripes between 0 and 4),
  avatar_emoji text default '🥋',
  created_at timestamptz default now()
);

create table public.gyms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invite_code text unique not null,
  owner_id uuid references public.profiles(id) not null,
  created_at timestamptz default now()
);

create table public.gym_members (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid references public.gyms(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  role text not null default 'member' check (role in ('owner','admin','member')),
  joined_at timestamptz default now(),
  unique(gym_id, user_id)
);

create table public.checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  gym_id uuid references public.gyms(id) on delete cascade not null,
  session_type text not null check (session_type in ('gi','nogi','open_mat','comp_class','private')),
  checked_in_at timestamptz not null default now(),
  checked_out_at timestamptz,
  duration_minutes int generated always as (
    case when checked_out_at is not null
      then extract(epoch from (checked_out_at - checked_in_at))::int / 60
      else null
    end
  ) stored,
  energy_rating int check (energy_rating between 1 and 5),
  note text,
  created_at timestamptz default now()
);

create table public.badges (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid references public.gyms(id) on delete cascade not null,
  name text not null,
  emoji text not null default '🏅',
  description text,
  created_by uuid references public.profiles(id),
  created_at timestamptz default now()
);

create table public.user_badges (
  id uuid primary key default gen_random_uuid(),
  badge_id uuid references public.badges(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  gym_id uuid references public.gyms(id) on delete cascade not null,
  awarded_by uuid references public.profiles(id),
  awarded_at timestamptz default now()
);


-- ==========================================
-- STEP 2: ENABLE RLS ON ALL TABLES
-- ==========================================

alter table public.profiles enable row level security;
alter table public.gyms enable row level security;
alter table public.gym_members enable row level security;
alter table public.checkins enable row level security;
alter table public.badges enable row level security;
alter table public.user_badges enable row level security;


-- ==========================================
-- STEP 3: ALL POLICIES
-- ==========================================

-- PROFILES
create policy "profiles_select" on public.profiles
  for select using (true);
create policy "profiles_insert" on public.profiles
  for insert with check (auth.uid() = id);
create policy "profiles_update" on public.profiles
  for update using (auth.uid() = id);

-- GYMS
create policy "gyms_select" on public.gyms
  for select using (true);
create policy "gyms_insert" on public.gyms
  for insert with check (auth.uid() = owner_id);
create policy "gyms_update" on public.gyms
  for update using (auth.uid() = owner_id);

-- GYM MEMBERS
create policy "gym_members_select" on public.gym_members
  for select using (
    gym_id in (select gm.gym_id from public.gym_members gm where gm.user_id = auth.uid())
  );
create policy "gym_members_insert" on public.gym_members
  for insert with check (auth.uid() = user_id);
create policy "gym_members_delete" on public.gym_members
  for delete using (
    gym_id in (select g.id from public.gyms g where g.owner_id = auth.uid())
  );

-- CHECKINS
create policy "checkins_select_own" on public.checkins
  for select using (auth.uid() = user_id);
create policy "checkins_select_gym" on public.checkins
  for select using (
    gym_id in (select gm.gym_id from public.gym_members gm where gm.user_id = auth.uid())
  );
create policy "checkins_insert" on public.checkins
  for insert with check (auth.uid() = user_id);
create policy "checkins_update" on public.checkins
  for update using (auth.uid() = user_id);

-- BADGES
create policy "badges_select" on public.badges
  for select using (
    gym_id in (select gm.gym_id from public.gym_members gm where gm.user_id = auth.uid())
  );
create policy "badges_insert" on public.badges
  for insert with check (
    gym_id in (select g.id from public.gyms g where g.owner_id = auth.uid())
  );
create policy "badges_delete" on public.badges
  for delete using (
    gym_id in (select g.id from public.gyms g where g.owner_id = auth.uid())
  );

-- USER BADGES
create policy "user_badges_select" on public.user_badges
  for select using (
    gym_id in (select gm.gym_id from public.gym_members gm where gm.user_id = auth.uid())
  );
create policy "user_badges_insert" on public.user_badges
  for insert with check (
    gym_id in (select g.id from public.gyms g where g.owner_id = auth.uid())
  );


-- ==========================================
-- STEP 4: AUTO-CREATE PROFILE ON SIGNUP
-- ==========================================

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', 'New Member'));
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- ==========================================
-- STEP 5: VIEWS
-- ==========================================

create or replace view public.gym_leaderboard as
select
  c.gym_id,
  c.user_id,
  p.display_name,
  p.belt,
  p.stripes,
  p.avatar_emoji,
  count(*) as total_sessions,
  coalesce(sum(c.duration_minutes), 0) as total_minutes,
  count(distinct date(c.checked_in_at)) as unique_days,
  count(*) filter (where c.session_type = 'gi') as gi_sessions,
  count(*) filter (where c.session_type = 'nogi') as nogi_sessions,
  count(*) filter (where c.session_type = 'open_mat') as open_mat_sessions
from public.checkins c
join public.profiles p on p.id = c.user_id
where c.checked_in_at >= date_trunc('month', now())
  and c.checked_out_at is not null
group by c.gym_id, c.user_id, p.display_name, p.belt, p.stripes, p.avatar_emoji;

create or replace view public.user_stats as
select
  c.gym_id,
  c.user_id,
  count(*) as total_sessions,
  coalesce(sum(c.duration_minutes), 0) as total_minutes,
  count(distinct date(c.checked_in_at)) as unique_days,
  min(c.checked_in_at) as first_checkin,
  max(c.checked_in_at) as last_checkin,
  round(avg(c.energy_rating)::numeric, 1) as avg_energy
from public.checkins c
where c.checked_out_at is not null
group by c.gym_id, c.user_id;
