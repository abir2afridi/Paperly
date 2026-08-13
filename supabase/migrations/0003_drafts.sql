-- =============================================================
-- Paperly - Drafts / Autosave (plan §41)
-- One row per (project, file). Draft rows hold unsaved edits when
-- autosave is OFF or immediately after a failed real-file save.
-- =============================================================

create table if not exists public.drafts (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  file_path text not null,
  content text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, file_path)
);

create index if not exists drafts_project_id_idx on public.drafts (project_id, updated_at desc);

create or replace function public.touch_drafts()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists drafts_touch_updated_at on public.drafts;
create trigger drafts_touch_updated_at
  before update on public.drafts
  for each row execute procedure public.touch_drafts();

-- ----- RLS (ownership via parent project) -----
alter table public.drafts enable row level security;

drop policy if exists "drafts_select_own" on public.drafts;
create policy "drafts_select_own" on public.drafts
  for select using (public.project_owner_id(project_id) = auth.uid());

drop policy if exists "drafts_insert_own" on public.drafts;
create policy "drafts_insert_own" on public.drafts
  for insert with check (public.project_owner_id(project_id) = auth.uid());

drop policy if exists "drafts_update_own" on public.drafts;
create policy "drafts_update_own" on public.drafts
  for update using (public.project_owner_id(project_id) = auth.uid());

drop policy if exists "drafts_delete_own" on public.drafts;
create policy "drafts_delete_own" on public.drafts
  for delete using (public.project_owner_id(project_id) = auth.uid());