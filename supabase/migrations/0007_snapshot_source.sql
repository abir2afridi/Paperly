-- 0007_snapshot_source.sql — §51: tag version-history snapshots with their origin
-- ('human' | 'ai' | 'collab-session') so the History view can visually
-- distinguish who/what made each change, and AI-applied edits can be reverted
-- scoped to the touched files.

alter table public.project_snapshots
  add column if not exists source text not null default 'human';

comment on column public.project_snapshots.source is
  'Origin of the snapshot: human (manual save), ai (agentic AI edit, §50/§51), or collab-session (§6).';