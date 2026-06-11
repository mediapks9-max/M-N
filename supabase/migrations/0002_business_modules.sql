-- ============================================================
-- CampaignDesk — Phase B business modules
-- services, clients, engagements, engagement_metrics,
-- deliverables, seo_articles, invoices (+ items, race-safe
-- per-org numbering) with RLS on every table.
-- Run AFTER 0001_foundation.sql.
-- ============================================================

-- Note: parent tables declare unique (id, organization_id) so child
-- tables can use composite FKs that enforce same-org references.

-- ------------------------------------------------------------
-- services (per-org catalog)
-- ------------------------------------------------------------

create table public.services (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  slug text not null,
  color text not null default '#6366f1',
  description text not null default '',
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  unique (organization_id, slug),
  unique (id, organization_id)
);

create index services_org_idx on public.services (organization_id, sort_order);

-- ------------------------------------------------------------
-- clients
-- ------------------------------------------------------------

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  company_name text not null default '',
  email text not null default '',
  phone text not null default '',
  default_currency text not null default 'USD',
  notes text not null default '',
  type text not null default 'client' check (type in ('client', 'supplier', 'both')),
  created_at timestamptz not null default now(),
  unique (id, organization_id)
);

create index clients_org_idx on public.clients (organization_id);

-- ------------------------------------------------------------
-- engagements (client × service)
-- ------------------------------------------------------------

create table public.engagements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  client_id uuid not null,
  service_id uuid not null,
  name text not null,
  status text not null default 'proposal'
    check (status in ('proposal', 'active', 'paused', 'completed', 'cancelled')),
  start_date date,
  end_date date,
  budget_amount numeric,
  budget_currency text not null default 'USD',
  financial_mode text not null default 'auto' check (financial_mode in ('auto', 'manual')),
  manual_revenue numeric,
  manual_cost numeric,
  notes text not null default '',
  created_at timestamptz not null default now(),
  unique (id, organization_id),
  -- same-org references enforced by composite FKs
  foreign key (client_id, organization_id)
    references public.clients (id, organization_id) on delete cascade,
  foreign key (service_id, organization_id)
    references public.services (id, organization_id) on delete restrict
);

create index engagements_org_idx on public.engagements (organization_id);
create index engagements_client_idx on public.engagements (client_id);
create index engagements_service_idx on public.engagements (service_id);

-- ------------------------------------------------------------
-- engagement_metrics (manual KPI entries per period)
-- ------------------------------------------------------------

create table public.engagement_metrics (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  engagement_id uuid not null,
  period_start date not null,
  period_end date not null,
  spend numeric,
  impressions numeric,
  clicks numeric,
  leads numeric,
  conversions numeric,
  sessions numeric,
  organic_traffic numeric,
  revenue_generated numeric,
  notes text not null default '',
  created_at timestamptz not null default now(),
  unique (engagement_id, period_start),
  foreign key (engagement_id, organization_id)
    references public.engagements (id, organization_id) on delete cascade
);

create index engagement_metrics_org_idx on public.engagement_metrics (organization_id);

-- ------------------------------------------------------------
-- deliverables
-- ------------------------------------------------------------

create table public.deliverables (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  engagement_id uuid not null,
  type text not null check (type in (
    'article', 'audit_report', 'website', 'dashboard_report',
    'video', 'creative', 'landing_page', 'other'
  )),
  title text not null,
  status text not null default 'planned'
    check (status in ('planned', 'in_progress', 'review', 'delivered', 'published')),
  due_date date,
  delivered_at timestamptz,
  url text,
  notes text not null default '',
  created_at timestamptz not null default now(),
  foreign key (engagement_id, organization_id)
    references public.engagements (id, organization_id) on delete cascade
);

create index deliverables_org_idx on public.deliverables (organization_id);
create index deliverables_engagement_idx on public.deliverables (engagement_id);

-- ------------------------------------------------------------
-- seo_articles
-- ------------------------------------------------------------

create table public.seo_articles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  title text not null,
  engagement_id uuid,
  client_id uuid,
  target_keywords text[] not null default '{}',
  status text not null default 'idea' check (status in ('idea', 'draft', 'review', 'published')),
  published_url text not null default '',
  published_at timestamptz,
  word_count int not null default 0,
  content text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (engagement_id, organization_id)
    references public.engagements (id, organization_id) on delete set null (engagement_id),
  foreign key (client_id, organization_id)
    references public.clients (id, organization_id) on delete set null (client_id)
);

create index seo_articles_org_idx on public.seo_articles (organization_id);

-- ------------------------------------------------------------
-- invoices + items + race-safe per-org numbering
-- ------------------------------------------------------------

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  number text not null,
  direction text not null check (direction in ('outbound', 'inbound')),
  client_id uuid not null,
  engagement_id uuid,
  issue_date date not null default current_date,
  due_date date,
  currency text not null default 'USD',
  status text not null default 'draft'
    check (status in ('draft', 'sent', 'paid', 'overdue', 'cancelled')),
  notes text not null default '',
  subtotal numeric not null default 0,
  tax_amount numeric not null default 0,
  total numeric not null default 0,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  unique (organization_id, number),
  unique (id, organization_id),
  foreign key (client_id, organization_id)
    references public.clients (id, organization_id) on delete restrict,
  foreign key (engagement_id, organization_id)
    references public.engagements (id, organization_id) on delete set null (engagement_id)
);

create index invoices_org_idx on public.invoices (organization_id);
create index invoices_client_idx on public.invoices (client_id);
create index invoices_engagement_idx on public.invoices (engagement_id);

create table public.invoice_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  invoice_id uuid not null,
  description text not null default '',
  quantity numeric not null default 1,
  unit_price numeric not null default 0,
  line_total numeric not null default 0,
  sort_order int not null default 0,
  foreign key (invoice_id, organization_id)
    references public.invoices (id, organization_id) on delete cascade
);

create index invoice_items_invoice_idx on public.invoice_items (invoice_id);

-- Race-safe counter: one row per org per year, bumped atomically.
create table public.invoice_counters (
  organization_id uuid not null references public.organizations (id) on delete cascade,
  year int not null,
  counter int not null default 0,
  primary key (organization_id, year)
);

alter table public.invoice_counters enable row level security;
-- No policies: only the SECURITY DEFINER function below touches it.

create or replace function public.next_invoice_number(org uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  y int := extract(year from now())::int;
  c int;
  org_slug text;
  prefix text;
begin
  if not public.is_org_member(org) then
    raise exception 'Not a member of this organization';
  end if;

  insert into public.invoice_counters (organization_id, year, counter)
  values (org, y, 1)
  on conflict (organization_id, year)
  do update set counter = public.invoice_counters.counter + 1
  returning counter into c;

  select slug into org_slug from public.organizations where id = org;
  prefix := upper(left(regexp_replace(coalesce(org_slug, ''), '[^a-zA-Z]', '', 'g'), 3));
  if prefix = '' then
    prefix := 'ORG';
  end if;

  return prefix || '-' || y || '-' || lpad(c::text, 4, '0');
end;
$$;

revoke execute on function public.next_invoice_number(uuid) from public, anon;
grant execute on function public.next_invoice_number(uuid) to authenticated;

-- ------------------------------------------------------------
-- Default service catalog seeding
-- ------------------------------------------------------------

create or replace function public.seed_default_services(org uuid)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.services (organization_id, name, slug, color, sort_order)
  values
    (org, 'Traffic & SEO',         'traffic-seo',         '#22c55e', 1),
    (org, 'Monetization',          'monetization',        '#f59e0b', 2),
    (org, 'Optimization & Audits', 'optimization-audits', '#3b82f6', 3),
    (org, 'Website Build',         'website-build',       '#8b5cf6', 4),
    (org, 'Data Analysis',         'data-analysis',       '#06b6d4', 5),
    (org, 'Social Media',          'social-media',        '#ec4899', 6),
    (org, 'Video',                 'video',               '#ef4444', 7),
    (org, 'Paid Campaigns',        'paid-campaigns',      '#eab308', 8)
  on conflict (organization_id, slug) do nothing;
$$;

revoke execute on function public.seed_default_services(uuid) from public, anon;
grant execute on function public.seed_default_services(uuid) to authenticated;

-- Recreate create_organization so every NEW org gets the default catalog.
create or replace function public.create_organization(org_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_org_id uuid;
  base_slug text;
  candidate text;
  n int := 1;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  if coalesce(trim(org_name), '') = '' then
    raise exception 'Organization name is required';
  end if;

  base_slug := trim(both '-' from lower(regexp_replace(trim(org_name), '[^a-zA-Z0-9]+', '-', 'g')));
  if base_slug = '' then
    base_slug := 'org';
  end if;

  candidate := base_slug;
  while exists (select 1 from public.organizations where slug = candidate) loop
    n := n + 1;
    candidate := base_slug || '-' || n;
  end loop;

  insert into public.organizations (name, slug)
  values (trim(org_name), candidate)
  returning id into new_org_id;

  insert into public.memberships (organization_id, user_id, role)
  values (new_org_id, auth.uid(), 'owner');

  perform public.seed_default_services(new_org_id);

  return new_org_id;
end;
$$;

-- Backfill: seed the catalog for any org created before this migration.
select public.seed_default_services(o.id)
from public.organizations o
where not exists (
  select 1 from public.services s where s.organization_id = o.id
);

-- ------------------------------------------------------------
-- RLS: org members can read and write their org's business data
-- ------------------------------------------------------------

alter table public.services enable row level security;
alter table public.clients enable row level security;
alter table public.engagements enable row level security;
alter table public.engagement_metrics enable row level security;
alter table public.deliverables enable row level security;
alter table public.seo_articles enable row level security;
alter table public.invoices enable row level security;
alter table public.invoice_items enable row level security;

create policy "services_select" on public.services
  for select to authenticated using (public.is_org_member(organization_id));
create policy "services_insert" on public.services
  for insert to authenticated with check (public.is_org_member(organization_id));
create policy "services_update" on public.services
  for update to authenticated
  using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));
create policy "services_delete" on public.services
  for delete to authenticated using (public.is_org_member(organization_id));

create policy "clients_select" on public.clients
  for select to authenticated using (public.is_org_member(organization_id));
create policy "clients_insert" on public.clients
  for insert to authenticated with check (public.is_org_member(organization_id));
create policy "clients_update" on public.clients
  for update to authenticated
  using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));
create policy "clients_delete" on public.clients
  for delete to authenticated using (public.is_org_member(organization_id));

create policy "engagements_select" on public.engagements
  for select to authenticated using (public.is_org_member(organization_id));
create policy "engagements_insert" on public.engagements
  for insert to authenticated with check (public.is_org_member(organization_id));
create policy "engagements_update" on public.engagements
  for update to authenticated
  using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));
create policy "engagements_delete" on public.engagements
  for delete to authenticated using (public.is_org_member(organization_id));

create policy "engagement_metrics_select" on public.engagement_metrics
  for select to authenticated using (public.is_org_member(organization_id));
create policy "engagement_metrics_insert" on public.engagement_metrics
  for insert to authenticated with check (public.is_org_member(organization_id));
create policy "engagement_metrics_update" on public.engagement_metrics
  for update to authenticated
  using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));
create policy "engagement_metrics_delete" on public.engagement_metrics
  for delete to authenticated using (public.is_org_member(organization_id));

create policy "deliverables_select" on public.deliverables
  for select to authenticated using (public.is_org_member(organization_id));
create policy "deliverables_insert" on public.deliverables
  for insert to authenticated with check (public.is_org_member(organization_id));
create policy "deliverables_update" on public.deliverables
  for update to authenticated
  using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));
create policy "deliverables_delete" on public.deliverables
  for delete to authenticated using (public.is_org_member(organization_id));

create policy "seo_articles_select" on public.seo_articles
  for select to authenticated using (public.is_org_member(organization_id));
create policy "seo_articles_insert" on public.seo_articles
  for insert to authenticated with check (public.is_org_member(organization_id));
create policy "seo_articles_update" on public.seo_articles
  for update to authenticated
  using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));
create policy "seo_articles_delete" on public.seo_articles
  for delete to authenticated using (public.is_org_member(organization_id));

create policy "invoices_select" on public.invoices
  for select to authenticated using (public.is_org_member(organization_id));
create policy "invoices_insert" on public.invoices
  for insert to authenticated with check (public.is_org_member(organization_id));
create policy "invoices_update" on public.invoices
  for update to authenticated
  using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));
create policy "invoices_delete" on public.invoices
  for delete to authenticated using (public.is_org_member(organization_id));

create policy "invoice_items_select" on public.invoice_items
  for select to authenticated using (public.is_org_member(organization_id));
create policy "invoice_items_insert" on public.invoice_items
  for insert to authenticated with check (public.is_org_member(organization_id));
create policy "invoice_items_update" on public.invoice_items
  for update to authenticated
  using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));
create policy "invoice_items_delete" on public.invoice_items
  for delete to authenticated using (public.is_org_member(organization_id));
