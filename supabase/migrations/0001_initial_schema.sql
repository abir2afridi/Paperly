-- =============================================================
-- TeXForge / Paperly — Initial Supabase Schema
-- Run this in: Supabase Dashboard -> SQL Editor -> New Query
-- =============================================================

-- -------------------------------------------------------------
-- Helper: bump updated_at on row changes
-- -------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- -------------------------------------------------------------
-- profiles — one row per auth user
-- -------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  display_name text not null default '',
  academic_role text not null default '',
  created_at timestamptz not null default now()
);

-- Auto-create a profile row when a user signs up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name, academic_role)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'display_name', ''),
    coalesce(new.raw_user_meta_data ->> 'academic_role', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- -------------------------------------------------------------
-- projects
-- -------------------------------------------------------------
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  serial_number int not null default 1,
  name text not null,
  description text not null default '',
  owner_id uuid not null references public.profiles (id) on delete cascade,
  compiler text not null default 'PDFLATEX'
    check (compiler in ('PDFLATEX', 'XELATEX', 'LUALATEX')),
  bib_tool text not null default 'BIBTEX'
    check (bib_tool in ('BIBTEX', 'BIBER', 'NONE')),
  main_file text not null default 'main.tex',
  auto_compile boolean not null default true,
  is_public boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists projects_owner_id_idx on public.projects (owner_id);

drop trigger if exists projects_set_updated_at on public.projects;
create trigger projects_set_updated_at
  before update on public.projects
  for each row execute procedure public.set_updated_at();

-- -------------------------------------------------------------
-- project_files
-- -------------------------------------------------------------
create table if not exists public.project_files (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  path text not null,
  type text not null default 'TEX'
    check (type in ('TEX', 'BIB', 'CLS', 'STY', 'IMAGE', 'PDF', 'OTHER')),
  content text not null default '',
  size_bytes int not null default 0,
  updated_at timestamptz not null default now(),
  unique (project_id, path)
);

create index if not exists project_files_project_id_idx on public.project_files (project_id);

-- -------------------------------------------------------------
-- chat_messages
-- -------------------------------------------------------------
create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  author_name text not null default '',
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists chat_messages_project_id_idx on public.chat_messages (project_id, created_at desc);

-- -------------------------------------------------------------
-- activity_events
-- -------------------------------------------------------------
create table if not exists public.activity_events (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  actor_id uuid not null references public.profiles (id) on delete cascade,
  actor_name text not null default '',
  type text not null
    check (type in ('FILE_CREATE', 'FILE_DELETE', 'COMPILE_SUCCESS', 'COMPILE_ERROR', 'MEMBER_JOIN', 'COMMENT_ADD', 'VERSION_RESTORE')),
  description text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists activity_events_project_id_idx on public.activity_events (project_id, created_at desc);

-- -------------------------------------------------------------
-- comments
-- -------------------------------------------------------------
create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  file_path text not null,
  anchor_line int,
  author_id uuid not null references public.profiles (id) on delete cascade,
  author_name text not null default '',
  body text not null,
  resolved boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists comments_project_id_idx on public.comments (project_id, created_at desc);

-- -------------------------------------------------------------
-- project_snapshots
-- -------------------------------------------------------------
create table if not exists public.project_snapshots (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  title text not null,
  files jsonb not null default '[]',
  created_at timestamptz not null default now()
);

create index if not exists project_snapshots_project_id_idx on public.project_snapshots (project_id, created_at desc);

-- -------------------------------------------------------------
-- ROW LEVEL SECURITY
-- -------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.project_files enable row level security;
alter table public.chat_messages enable row level security;
alter table public.activity_events enable row level security;
alter table public.comments enable row level security;
alter table public.project_snapshots enable row level security;

-- Helper: owner id of a project (shared across tables)
create or replace function public.project_owner_id(p_project_id uuid)
returns uuid
language sql
security definer set search_path = public
stable
as $$
  select owner_id from public.projects where id = p_project_id;
$$;

-- ----- profiles -----
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

-- ----- projects -----
drop policy if exists "projects_select_own" on public.projects;
create policy "projects_select_own" on public.projects
  for select using (auth.uid() = owner_id);

drop policy if exists "projects_insert_own" on public.projects;
create policy "projects_insert_own" on public.projects
  for insert with check (auth.uid() = owner_id);

drop policy if exists "projects_update_own" on public.projects;
create policy "projects_update_own" on public.projects
  for update using (auth.uid() = owner_id);

drop policy if exists "projects_delete_own" on public.projects;
create policy "projects_delete_own" on public.projects
  for delete using (auth.uid() = owner_id);

-- ----- project_files (ownership via parent project) -----
drop policy if exists "files_select_own" on public.project_files;
create policy "files_select_own" on public.project_files
  for select using (public.project_owner_id(project_id) = auth.uid());

drop policy if exists "files_insert_own" on public.project_files;
create policy "files_insert_own" on public.project_files
  for insert with check (public.project_owner_id(project_id) = auth.uid());

drop policy if exists "files_update_own" on public.project_files;
create policy "files_update_own" on public.project_files
  for update using (public.project_owner_id(project_id) = auth.uid());

drop policy if exists "files_delete_own" on public.project_files;
create policy "files_delete_own" on public.project_files
  for delete using (public.project_owner_id(project_id) = auth.uid());

-- ----- chat_messages -----
drop policy if exists "chat_select_own" on public.chat_messages;
create policy "chat_select_own" on public.chat_messages
  for select using (public.project_owner_id(project_id) = auth.uid());

drop policy if exists "chat_insert_own" on public.chat_messages;
create policy "chat_insert_own" on public.chat_messages
  for insert with check (public.project_owner_id(project_id) = auth.uid());

drop policy if exists "chat_delete_own" on public.chat_messages;
create policy "chat_delete_own" on public.chat_messages
  for delete using (public.project_owner_id(project_id) = auth.uid());

-- ----- activity_events -----
drop policy if exists "activity_select_own" on public.activity_events;
create policy "activity_select_own" on public.activity_events
  for select using (public.project_owner_id(project_id) = auth.uid());

drop policy if exists "activity_insert_own" on public.activity_events;
create policy "activity_insert_own" on public.activity_events
  for insert with check (public.project_owner_id(project_id) = auth.uid());

drop policy if exists "activity_delete_own" on public.activity_events;
create policy "activity_delete_own" on public.activity_events
  for delete using (public.project_owner_id(project_id) = auth.uid());

-- ----- comments -----
drop policy if exists "comments_select_own" on public.comments;
create policy "comments_select_own" on public.comments
  for select using (public.project_owner_id(project_id) = auth.uid());

drop policy if exists "comments_insert_own" on public.comments;
create policy "comments_insert_own" on public.comments
  for insert with check (public.project_owner_id(project_id) = auth.uid());

drop policy if exists "comments_update_own" on public.comments;
create policy "comments_update_own" on public.comments
  for update using (public.project_owner_id(project_id) = auth.uid());

drop policy if exists "comments_delete_own" on public.comments;
create policy "comments_delete_own" on public.comments
  for delete using (public.project_owner_id(project_id) = auth.uid());

-- ----- project_snapshots -----
drop policy if exists "snapshots_select_own" on public.project_snapshots;
create policy "snapshots_select_own" on public.project_snapshots
  for select using (public.project_owner_id(project_id) = auth.uid());

drop policy if exists "snapshots_insert_own" on public.project_snapshots;
create policy "snapshots_insert_own" on public.project_snapshots
  for insert with check (public.project_owner_id(project_id) = auth.uid());

drop policy if exists "snapshots_delete_own" on public.project_snapshots;
create policy "snapshots_delete_own" on public.project_snapshots
  for delete using (public.project_owner_id(project_id) = auth.uid());
