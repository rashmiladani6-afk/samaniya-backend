-- Run once in Supabase → SQL Editor
-- Fixes: "new row for relation 'posts' violates check constraint posts_category_check"
-- That constraint only allowed the old 4 category names. Admin categories (e.g. xyz) need it removed.

alter table public.posts drop constraint if exists posts_category_check;
