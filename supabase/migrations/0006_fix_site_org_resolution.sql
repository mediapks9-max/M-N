-- ============================================================
-- Fix: resolve_site_org must fall back to the OLDEST org when no
-- slug is given (previously it ordered by uuid, which becomes
-- nondeterministic once a second organization exists). An explicit
-- but unknown slug still resolves to null (request rejected).
-- Run AFTER 0005_external_lead_capture.sql.
-- ============================================================

create or replace function public.resolve_site_org(org_slug text)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select case
    when org_slug is null or org_slug = '' then
      (select id from public.organizations order by created_at limit 1)
    else
      (select id from public.organizations where slug = org_slug limit 1)
  end;
$$;

revoke execute on function public.resolve_site_org(text) from public, anon, authenticated;
