-- ============================================================================
-- Fix: "new row violates row-level security policy" when uploading files
-- on the Work Order Tracking page.
--
-- Root causes:
--   1. The 'work_order_files' storage bucket had NO policies (and may not
--      exist), so uploads to storage.objects were blocked by RLS.
--   2. The jcr_* table policies were scoped `TO authenticated`, but this app
--      uses a custom (localStorage) login and talks to Supabase with the
--      public ANON key. So requests run as the `anon` role and were denied.
--
-- This migration:
--   - Creates/ensures a public 'work_order_files' bucket.
--   - Adds storage.objects policies for that bucket (anon + authenticated).
--   - Rewrites the jcr_* table policies to allow anon + authenticated.
--
-- Safe to run multiple times (drops policies first, uses IF NOT EXISTS, etc.).
-- Run this in the Supabase SQL editor.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) Storage bucket for JCR / Work Order file attachments
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('work_order_files', 'work_order_files', true)
on conflict (id) do update set public = true;

-- Allow read / upload / update / delete for the bucket.
-- Applies to both anon and authenticated roles so the app works with the
-- public anon key. Tighten (e.g. `to authenticated`) once real auth is added.
drop policy if exists "work_order_files read" on storage.objects;
create policy "work_order_files read"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'work_order_files');

drop policy if exists "work_order_files insert" on storage.objects;
create policy "work_order_files insert"
  on storage.objects for insert
  to anon, authenticated
  with check (bucket_id = 'work_order_files');

drop policy if exists "work_order_files update" on storage.objects;
create policy "work_order_files update"
  on storage.objects for update
  to anon, authenticated
  using (bucket_id = 'work_order_files')
  with check (bucket_id = 'work_order_files');

drop policy if exists "work_order_files delete" on storage.objects;
create policy "work_order_files delete"
  on storage.objects for delete
  to anon, authenticated
  using (bucket_id = 'work_order_files');

-- ---------------------------------------------------------------------------
-- 2) Table policies: allow anon + authenticated on all jcr_* tables
--    (replace the old authenticated-only policies with permissive ones)
-- ---------------------------------------------------------------------------
alter table public.jcr_work_orders enable row level security;
alter table public.jcr_comments    enable row level security;
alter table public.jcr_files       enable row level security;

-- Drop old authenticated-only policies (names from supabase_jcr_tracking.sql)
drop policy if exists "Allow authenticated users to read work orders"   on public.jcr_work_orders;
drop policy if exists "Allow authenticated users to insert work orders" on public.jcr_work_orders;
drop policy if exists "Allow authenticated users to update work orders" on public.jcr_work_orders;
drop policy if exists "Allow authenticated users to delete work orders" on public.jcr_work_orders;

drop policy if exists "Allow authenticated users to read comments"   on public.jcr_comments;
drop policy if exists "Allow authenticated users to insert comments" on public.jcr_comments;
drop policy if exists "Allow authenticated users to update comments" on public.jcr_comments;
drop policy if exists "Allow authenticated users to delete comments" on public.jcr_comments;

drop policy if exists "Allow authenticated users to read files"   on public.jcr_files;
drop policy if exists "Allow authenticated users to insert files" on public.jcr_files;
drop policy if exists "Allow authenticated users to delete files" on public.jcr_files;

-- New permissive "all" policies (anon + authenticated via public role)
drop policy if exists "jcr_work_orders all" on public.jcr_work_orders;
create policy "jcr_work_orders all" on public.jcr_work_orders
  for all using (true) with check (true);

drop policy if exists "jcr_comments all" on public.jcr_comments;
create policy "jcr_comments all" on public.jcr_comments
  for all using (true) with check (true);

drop policy if exists "jcr_files all" on public.jcr_files;
create policy "jcr_files all" on public.jcr_files
  for all using (true) with check (true);
