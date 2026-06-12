-- ============================================================
-- CampaignDesk — Phase E: public site, lead capture & tracking
-- - leads table with first-touch attribution (UTM / referrer)
-- - site_visits table (every public page view / ad click-through)
-- - anon-callable RPCs for the public site: track_visit,
--   submit_lead, get_public_articles, get_public_article
-- - public slug on seo_articles so published articles power /blog
-- Run AFTER 0003_performance_deals.sql.
-- ============================================================

-- ---------------- leads ----------------
create table public.leads (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  email text not null,
  phone text not null default '',
  message text not null default '',
  status text not null default 'new'
    check (status in ('new', 'contacted', 'qualified', 'converted', 'lost')),
  source text not null default 'website',
  utm_source text not null default '',
  utm_medium text not null default '',
  utm_campaign text not null default '',
  utm_term text not null default '',
  utm_content text not null default '',
  referrer text not null default '',
  landing_page text not null default '',
  visitor_id text not null default '',
  client_id uuid,
  created_at timestamptz not null default now(),
  foreign key (client_id, organization_id)
    references public.clients (id, organization_id) on delete set null (client_id)
);

create index leads_org_created_idx on public.leads (organization_id, created_at desc);

-- ---------------- site visits (click / pageview tracking) ----------------
create table public.site_visits (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  visitor_id text not null default '',
  path text not null default '',
  referrer text not null default '',
  utm_source text not null default '',
  utm_medium text not null default '',
  utm_campaign text not null default '',
  utm_term text not null default '',
  utm_content text not null default '',
  created_at timestamptz not null default now()
);

create index site_visits_org_created_idx on public.site_visits (organization_id, created_at desc);

-- ---------------- RLS ----------------
alter table public.leads enable row level security;
alter table public.site_visits enable row level security;

create policy "leads_select" on public.leads
  for select to authenticated using (public.is_org_member(organization_id));
create policy "leads_insert" on public.leads
  for insert to authenticated with check (public.is_org_member(organization_id));
create policy "leads_update" on public.leads
  for update to authenticated
  using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));
create policy "leads_delete" on public.leads
  for delete to authenticated using (public.is_org_member(organization_id));

-- site_visits: members read; the public writes only through track_visit().
create policy "site_visits_select" on public.site_visits
  for select to authenticated using (public.is_org_member(organization_id));

-- ---------------- activity log: allow 'lead' entity ----------------
alter table public.activity_log drop constraint activity_log_entity_type_check;
alter table public.activity_log add constraint activity_log_entity_type_check
  check (entity_type in (
    'client', 'engagement', 'deliverable', 'invoice', 'article',
    'metric', 'member', 'service', 'lead'
  ));

-- ---------------- public slug for articles ----------------
alter table public.seo_articles add column slug text not null default '';

update public.seo_articles
set slug = trim(both '-' from lower(regexp_replace(title, '[^a-zA-Z0-9]+', '-', 'g')))
where slug = '';

-- Titles without latin characters (e.g. Hebrew) slugify to '' — give
-- them a stable id-based slug instead.
update public.seo_articles
set slug = 'article-' || substr(id::text, 1, 8)
where slug = '';

-- De-duplicate within an org before adding the unique index.
update public.seo_articles a
set slug = a.slug || '-' || substr(a.id::text, 1, 4)
where exists (
  select 1 from public.seo_articles b
  where b.organization_id = a.organization_id
    and b.slug = a.slug
    and b.id < a.id
);

create unique index seo_articles_org_slug_idx
  on public.seo_articles (organization_id, slug);

-- ---------------- helper: resolve the public site's org ----------------
-- The public site serves one organization: the one matching the given
-- slug, or (when slug is empty) the oldest org in the database.
create or replace function public.resolve_site_org(org_slug text)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.organizations
  where (org_slug is not null and org_slug <> '' and slug = org_slug)
  union all
  select id from public.organizations
  where org_slug is null or org_slug = ''
  order by 1
  limit 1;
$$;

-- (internal helper — not exposed)
revoke execute on function public.resolve_site_org(text) from public, anon, authenticated;

-- ---------------- anon RPCs for the public site ----------------

create or replace function public.track_visit(
  org_slug text,
  visitor text,
  page_path text,
  page_referrer text,
  utm_source text default '',
  utm_medium text default '',
  utm_campaign text default '',
  utm_term text default '',
  utm_content text default ''
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org uuid;
begin
  select public.resolve_site_org(org_slug) into v_org;
  if v_org is null then
    return;
  end if;

  insert into public.site_visits (
    organization_id, visitor_id, path, referrer,
    utm_source, utm_medium, utm_campaign, utm_term, utm_content
  ) values (
    v_org,
    left(coalesce(visitor, ''), 64),
    left(coalesce(page_path, ''), 512),
    left(coalesce(page_referrer, ''), 512),
    left(coalesce(utm_source, ''), 128),
    left(coalesce(utm_medium, ''), 128),
    left(coalesce(utm_campaign, ''), 128),
    left(coalesce(utm_term, ''), 128),
    left(coalesce(utm_content, ''), 128)
  );
end;
$$;

grant execute on function public.track_visit(text, text, text, text, text, text, text, text, text) to anon, authenticated;

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
  utm_content text default ''
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
    organization_id, name, email, phone, message,
    visitor_id, landing_page, referrer,
    utm_source, utm_medium, utm_campaign, utm_term, utm_content
  ) values (
    v_org,
    left(trim(lead_name), 200),
    left(lower(trim(lead_email)), 320),
    left(coalesce(lead_phone, ''), 50),
    left(coalesce(lead_message, ''), 4000),
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

grant execute on function public.submit_lead(text, text, text, text, text, text, text, text, text, text, text, text, text) to anon, authenticated;

create or replace function public.get_public_articles(org_slug text)
returns table (
  id uuid,
  title text,
  slug text,
  excerpt text,
  published_at timestamptz,
  word_count int
)
language sql
stable
security definer
set search_path = public
as $$
  select
    a.id,
    a.title,
    a.slug,
    left(regexp_replace(a.content, '[#*`>\[\]]', '', 'g'), 240),
    a.published_at,
    a.word_count
  from public.seo_articles a
  where a.organization_id = public.resolve_site_org(org_slug)
    and a.status = 'published'
    and a.slug <> ''
  order by a.published_at desc nulls last, a.created_at desc;
$$;

grant execute on function public.get_public_articles(text) to anon, authenticated;

create or replace function public.get_public_article(org_slug text, article_slug text)
returns table (
  id uuid,
  title text,
  slug text,
  content text,
  published_at timestamptz,
  word_count int
)
language sql
stable
security definer
set search_path = public
as $$
  select a.id, a.title, a.slug, a.content, a.published_at, a.word_count
  from public.seo_articles a
  where a.organization_id = public.resolve_site_org(org_slug)
    and a.status = 'published'
    and a.slug = article_slug
  limit 1;
$$;

grant execute on function public.get_public_article(text, text) to anon, authenticated;
