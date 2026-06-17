-- ============================================================
-- Run this in Supabase SQL Editor (once, in order)
-- ============================================================

-- 1. Add missing columns to posts --------------------------------
alter table public.posts
  add column if not exists date text not null default '';

alter table public.posts
  add column if not exists status text not null default 'published'
  check (status in ('draft','published'));

-- Populate date from created_at for existing rows
update public.posts
  set date = to_char(created_at, 'YYYY-MM-DD')
  where date = '' and created_at is not null;

-- Mark all existing rows as published
update public.posts set status = 'published' where status is null;

-- 2. Update public read policy: anon sees only published posts
drop policy if exists "posts_read_anon" on public.posts;
create policy "posts_read_anon"
  on public.posts for select
  to anon
  using (status = 'published');

-- Allow authenticated (admin via service role) to read all
drop policy if exists "posts_read_authed" on public.posts;
create policy "posts_read_authed"
  on public.posts for select
  to authenticated
  using (true);

-- 3. profiles table for user roles ----------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  role text not null default 'reader'
    check (role in ('admin','editor','reader')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Admins (via service role) can read/write all profiles
create policy "profiles_admin_all"
  on public.profiles for all
  to service_role
  using (true)
  with check (true);

-- Users can read their own profile
create policy "profiles_self_read"
  on public.profiles for select
  to authenticated
  using (id = auth.uid());

-- 4. categories table (if not already created) ----------------
create table if not exists public.categories (
  slug text primary key,
  name text not null,
  color text not null default '#64748B',
  description text not null default '',
  sort_order int not null default 0
);

alter table public.categories enable row level security;

drop policy if exists "categories_read_anon" on public.categories;
create policy "categories_read_anon"
  on public.categories for select to anon using (true);

create policy "categories_admin_all"
  on public.categories for all
  to service_role
  using (true)
  with check (true);

-- 5. Storage bucket: post-images --------------------------------
-- Run in Supabase dashboard Storage tab > New bucket
-- Name: post-images, Public: false
-- Then add this policy:

insert into storage.buckets (id, name, public)
  values ('post-images', 'post-images', false)
  on conflict do nothing;

create policy "post_images_admin_upload"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'post-images');

create policy "post_images_public_read"
  on storage.objects for select
  to anon
  using (bucket_id = 'post-images');

-- 6. Allow any category name on posts (admin-created categories) -----
-- Without this, only News / Recipes / Shopping / TV & Movies can be saved.
alter table public.posts drop constraint if exists posts_category_check;
