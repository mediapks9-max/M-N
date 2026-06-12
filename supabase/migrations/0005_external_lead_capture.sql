-- ============================================================
-- CampaignDesk — Phase F: external lead capture
-- Adds a source tag to submit_lead so leads from embedded forms
-- on client sites (e.g. waveroi.biz) are attributed to the site
-- they came from. Run AFTER 0004_leads_and_public_site.sql.
-- ============================================================

drop function public.submit_lead(
  text, text, text, text, text, text, text, text, text, text, text, text, text
);

create or replace function public.submit_lead(
  org_slug text,
  lead_name text,
  lead_email text,
  lead_phone text default '',
  lead_message text default '',
  visitor text default '',
  landing text default '',
  page_referrer text default '',
  utm_source text default '',
  utm_medium text default '',
  utm_campaign text default '',
  utm_term text default '',
  utm_content text default '',
  lead_source text default 'website'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org uuid;
  v_lead uuid;
begin
  select public.resolve_site_org(org_slug) into v_org;
  if v_org is null then
    raise exception 'Site is not configured';
  end if;
  if coalesce(trim(lead_name), '') = '' then
    raise exception 'Name is required';
  end if;
  if position('@' in coalesce(lead_email, '')) = 0 then
    raise exception 'A valid email is required';
  end if;

  insert into public.leads (
    organization_id, name, email, phone, message, source,
    visitor_id, landing_page, referrer,
    utm_source, utm_medium, utm_campaign, utm_term, utm_content
  ) values (
    v_org,
    left(trim(lead_name), 200),
    left(lower(trim(lead_email)), 320),
    left(coalesce(lead_phone, ''), 50),
    left(coalesce(lead_message, ''), 4000),
    left(coalesce(nullif(trim(lead_source), ''), 'website'), 128),
    left(coalesce(visitor, ''), 64),
    left(coalesce(landing, ''), 512),
    left(coalesce(page_referrer, ''), 512),
    left(coalesce(utm_source, ''), 128),
    left(coalesce(utm_medium, ''), 128),
    left(coalesce(utm_campaign, ''), 128),
    left(coalesce(utm_term, ''), 128),
    left(coalesce(utm_content, ''), 128)
  ) returning id into v_lead;

  return v_lead;
end;
$$;

grant execute on function public.submit_lead(
  text, text, text, text, text, text, text, text, text, text, text, text, text, text
) to anon, authenticated;
