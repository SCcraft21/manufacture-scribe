
-- Fix search_path
create or replace function public.set_updated_at()
returns trigger language plpgsql security invoker set search_path = public as $$
begin new.updated_at = now(); return new; end; $$;

-- Lock down trigger funcs from public/authenticated execute
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.set_updated_at() from public, anon, authenticated;

-- Tighten audit_logs insert
drop policy "audit_insert_auth" on public.audit_logs;
create policy "audit_insert_self" on public.audit_logs for insert to authenticated
  with check (by_user = auth.uid());
