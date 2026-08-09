import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured: boolean = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

// ---- Database row shapes (mirror supabase/migrations/0001_initial_schema.sql) ----

export interface ProfileRow {
  id: string;
  email: string;
  display_name: string;
  academic_role: string;
  created_at: string;
}

export interface ProjectRow {
  id: string;
  serial_number: number;
  name: string;
  description: string;
  owner_id: string;
  compiler: string;
  bib_tool: string;
  main_file: string;
  auto_compile: boolean;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProjectFileRow {
  id: string;
  project_id: string;
  path: string;
  type: string;
  content: string;
  size_bytes: number;
  updated_at: string;
}

export interface ChatMessageRow {
  id: string;
  project_id: string;
  author_id: string;
  author_name: string;
  body: string;
  created_at: string;
}

export interface ActivityEventRow {
  id: string;
  project_id: string;
  actor_id: string;
  actor_name: string;
  type: string;
  description: string;
  created_at: string;
}

export interface CommentRow {
  id: string;
  project_id: string;
  file_path: string;
  anchor_line: number | null;
  author_id: string;
  author_name: string;
  body: string;
  resolved: boolean;
  created_at: string;
}

export interface SnapshotRow {
  id: string;
  project_id: string;
  title: string;
  files: { path: string; content: string }[];
  created_at: string;
}
