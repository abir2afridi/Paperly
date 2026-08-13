-- =============================================================
-- Paperly - PDF Annotations (plan §23 - annotation persistence)
-- =============================================================

create table if not exists public.pdf_annotations (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  page int not null default 1,
  x float8 not null default 0,
  y float8 not null default 0,
  width float8 not null default 15,
  height float8 not null default 10,
  author_name text not null default '',
  text text not null,
  color text not null default '#DC2626',
  created_at timestamptz not null default now()
);

create index if not exists pdf_annotations_project_id_idx on public.pdf_annotations (project_id, created_at desc);

-- ----- RLS (ownership via parent project) -----
alter table public.pdf_annotations enable row level security;

drop policy if exists "pdf_annotations_select_own" on public.pdf_annotations;
create policy "pdf_annotations_select_own" on public.pdf_annotations
  for select using (public.project_owner_id(project_id) = auth.uid());

drop policy if exists "pdf_annotations_insert_own" on public.pdf_annotations;
create policy "pdf_annotations_insert_own" on public.pdf_annotations
  for insert with check (public.project_owner_id(project_id) = auth.uid());

drop policy if exists "pdf_annotations_update_own" on public.pdf_annotations;
create policy "pdf_annotations_update_own" on public.pdf_annotations
  for update using (public.project_owner_id(project_id) = auth.uid());

drop policy if exists "pdf_annotations_delete_own" on public.pdf_annotations;
create policy "pdf_annotations_delete_own" on public.pdf_annotations
  for delete using (public.project_owner_id(project_id) = auth.uid());
