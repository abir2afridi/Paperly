-- §40: Chat retention.
-- Per-user retention preference on profiles; messages carry an optional
-- expires_at (set by future integrations). A service-role sweep function
-- (invoked periodically by the web server) deletes expired chat rows.

alter table public.profiles
  add column if not exists chat_retention_days integer;

alter table public.chat_messages
  add column if not exists expires_at timestamptz;

-- Sweep: deletes messages that are explicitly expired, or whose owning
-- project's owner has set a retention window and the message is older.
create or replace function public.sweep_expired_chat()
returns integer
language sql
security definer
set search_path = public
as $$
  with deleted as (
    delete from public.chat_messages cm
    where cm.expires_at is not null and cm.expires_at < now()
       or exists (
         select 1
         from public.projects p
         join public.profiles pr on pr.id = p.owner_id
         where p.id = cm.project_id
           and pr.chat_retention_days is not null
           and cm.created_at < now() - make_interval(days => pr.chat_retention_days)
       )
    returning 1
  )
  select count(*) from deleted;
$$;

revoke all on function public.sweep_expired_chat() from public, anon, authenticated;
grant execute on function public.sweep_expired_chat() to service_role;
