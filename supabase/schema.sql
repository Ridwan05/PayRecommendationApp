-- =====================================================================
-- Pay Recommendation App — Supabase schema, RLS policies, and triggers
-- Run this in Supabase Dashboard -> SQL Editor (one time).
-- =====================================================================

-- ---------- Enums -------------------------------------------------------
do $$ begin
  create type user_role as enum ('admin', 'ceo', 'hr');
exception when duplicate_object then null; end $$;

do $$ begin
  create type rec_status as enum ('pending', 'approved', 'rejected');
exception when duplicate_object then null; end $$;

-- ---------- Profiles ----------------------------------------------------
-- One row per auth user, holding their role.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  role user_role not null default 'hr',
  created_at timestamptz not null default now()
);

-- Helper: return current user's role (SECURITY DEFINER avoids RLS recursion).
create or replace function public.current_role()
returns user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

-- Auto-create a profile when a new auth user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'hr')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- Recommendations --------------------------------------------
create table if not exists public.recommendations (
  id uuid primary key default gen_random_uuid(),

  -- Section 1: Details
  staff_name text not null,
  designation text,
  components text,
  current_pay numeric(14,2),
  expectation numeric(14,2),
  years_experience numeric(5,1),

  -- Section 2: Recommendation (base inputs)
  monthly_consultancy_fee numeric(14,2) default 0,
  year_end_fee numeric(14,2) default 0,
  performance_fee numeric(14,2) default 0,
  upkeep_fee numeric(14,2) default 0,

  -- Auto-calculated (generated) columns
  annual_consultancy_pay numeric(14,2)
    generated always as (coalesce(monthly_consultancy_fee,0) * 12) stored,
  annual_gross_fee numeric(14,2)
    generated always as (
      coalesce(monthly_consultancy_fee,0) * 12
      + coalesce(year_end_fee,0)
      + coalesce(performance_fee,0)
      + coalesce(upkeep_fee,0)
    ) stored,

  -- Workflow
  status rec_status not null default 'pending',
  review_note text,
  created_by uuid references public.profiles(id),
  reviewed_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create index if not exists recommendations_status_idx on public.recommendations(status);
create index if not exists recommendations_created_by_idx on public.recommendations(created_by);

-- keep updated_at fresh
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_touch_recommendations on public.recommendations;
create trigger trg_touch_recommendations
  before update on public.recommendations
  for each row execute function public.touch_updated_at();

-- =====================================================================
-- Row Level Security
-- =====================================================================
alter table public.profiles enable row level security;
alter table public.recommendations enable row level security;

-- ---- profiles ----
drop policy if exists "profiles: read own or admin reads all" on public.profiles;
create policy "profiles: read own or admin reads all"
  on public.profiles for select
  using (id = auth.uid() or public.current_role() = 'admin');

drop policy if exists "profiles: admin manages all" on public.profiles;
create policy "profiles: admin manages all"
  on public.profiles for all
  using (public.current_role() = 'admin')
  with check (public.current_role() = 'admin');

-- ---- recommendations ----
-- Everyone signed in (hr, ceo, admin) can view all recommendations.
drop policy if exists "rec: authenticated can read" on public.recommendations;
create policy "rec: authenticated can read"
  on public.recommendations for select
  using (auth.uid() is not null);

-- HR and Admin can create recommendations.
drop policy if exists "rec: hr/admin insert" on public.recommendations;
create policy "rec: hr/admin insert"
  on public.recommendations for insert
  with check (public.current_role() in ('hr', 'admin'));

-- HR/Admin can EDIT details+fees ONLY while pending or rejected.
drop policy if exists "rec: hr/admin edit when pending/rejected" on public.recommendations;
create policy "rec: hr/admin edit when pending/rejected"
  on public.recommendations for update
  using (public.current_role() in ('hr', 'admin') and status in ('pending','rejected'))
  with check (public.current_role() in ('hr', 'admin'));

-- CEO/Admin can review (approve/reject) — ONLY while pending.
-- Approved/rejected records are locked against further review decisions.
drop policy if exists "rec: ceo/admin review" on public.recommendations;
create policy "rec: ceo/admin review"
  on public.recommendations for update
  using (public.current_role() in ('ceo', 'admin') and status = 'pending')
  with check (public.current_role() in ('ceo', 'admin'));

-- Admin can delete.
drop policy if exists "rec: admin delete" on public.recommendations;
create policy "rec: admin delete"
  on public.recommendations for delete
  using (public.current_role() = 'admin');
