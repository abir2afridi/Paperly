-- §8A: Per-user AI provider configurations.
-- Replaces the previous server-global JSON-file store. Each row belongs to
-- exactly one auth user; api_key_enc holds the AES-GCM encrypted API key
-- (server-side secret, never sent to the browser). RLS is owner-only.
-- Create providers, and is_default is enforced to at most one per user.

create table if not exists public.ai_provider_configs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  label text not null,
  provider_type text not null default 'openai'
    check (provider_type in ('openai', 'anthropic', 'custom')),
  base_url text not null,
  api_key_enc text not null,
  model text not null,
  extra_headers_json text,
  temperature numeric,
  max_tokens integer,
  is_default boolean not null default false,
  is_verified boolean not null default false,
  last_tested_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ai_provider_configs_user_id_idx
  on public.ai_provider_configs (user_id);

-- At most one default provider per user.
create unique index if not exists ai_provider_configs_one_default_per_user
  on public.ai_provider_configs (user_id) where is_default;

drop trigger if exists ai_provider_configs_set_updated_at on public.ai_provider_configs;
create trigger ai_provider_configs_set_updated_at
  before update on public.ai_provider_configs
  for each row execute procedure public.set_updated_at();

alter table public.ai_provider_configs enable row level security;

drop policy if exists ai_provider_configs_owner_select on public.ai_provider_configs;
create policy ai_provider_configs_owner_select
  on public.ai_provider_configs
  for select
  using (auth.uid() = user_id);

drop policy if exists ai_provider_configs_owner_insert on public.ai_provider_configs;
create policy ai_provider_configs_owner_insert
  on public.ai_provider_configs
  for insert
  with check (auth.uid() = user_id);

drop policy if exists ai_provider_configs_owner_update on public.ai_provider_configs;
create policy ai_provider_configs_owner_update
  on public.ai_provider_configs
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists ai_provider_configs_owner_delete on public.ai_provider_configs;
create policy ai_provider_configs_owner_delete
  on public.ai_provider_configs
  for delete
  using (auth.uid() = user_id);
