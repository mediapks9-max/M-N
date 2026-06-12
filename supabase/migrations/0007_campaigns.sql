-- ============================================================
-- CampaignDesk — Phase G: campaign operations layer
-- campaigns + daily stats, publisher placements + per-network
-- daily revenue. The data backbone for KPIs, charts and the
-- recommendation engine. Run AFTER 0006.
-- ============================================================

-- ---------------- campaigns ----------------
create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  engagement_id uuid not null,
  name text not null,
  channel text not null default 'other' check (channel in (
    'google_ads', 'meta', 'tiktok', 'native', 'display', 'email', 'affiliate', 'other'
  )),
  network text not null default '',
  status text not null default 'active'
    check (status in ('draft', 'active', 'paused', 'ended')),
  daily_budget numeric,
  total_budget numeric,
  target_cpl numeric,
  target_cpa numeric,
  target_roas numeric,
  currency text not null default 'USD',
  start_date date,
  end_date date,
  notes text not null default '',
  created_at timestamptz not null default now(),
  unique (id, organization_id),
  foreign key (engagement_id, organization_id)
    references public.engagements (id, organization_id) on delete cascade
);

create index campaigns_org_idx on public.campaigns (organization_id);
create index campaigns_engagement_idx on public.campaigns (engagement_id);

-- Daily performance rows — the "real-time" data layer.
create table public.campaign_stats (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  campaign_id uuid not null,
  date date not null,
  impressions numeric not null default 0,
  clicks numeric not null default 0,
  leads numeric not null default 0,
  conversions numeric not null default 0,
  spend numeric not null default 0,
  revenue numeric not null default 0,
  unique (campaign_id, date),
  foreign key (campaign_id, organization_id)
    references public.campaigns (id, organization_id) on delete cascade
);

create index campaign_stats_org_date_idx on public.campaign_stats (organization_id, date desc);
create index campaign_stats_campaign_idx on public.campaign_stats (campaign_id, date desc);

-- ---------------- publisher placements ----------------
create table public.placements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  supplier_id uuid not null,
  name text not null,
  ad_format text not null default '',
  status text not null default 'active' check (status in ('active', 'paused')),
  created_at timestamptz not null default now(),
  unique (id, organization_id),
  foreign key (supplier_id, organization_id)
    references public.clients (id, organization_id) on delete cascade
);

create index placements_org_idx on public.placements (organization_id);

-- Daily revenue per placement per ad network — powers the
-- "which network monetizes this placement best" comparison.
create table public.placement_stats (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  placement_id uuid not null,
  network text not null,
  date date not null,
  impressions numeric not null default 0,
  clicks numeric not null default 0,
  revenue numeric not null default 0,
  unique (placement_id, network, date),
  foreign key (placement_id, organization_id)
    references public.placements (id, organization_id) on delete cascade
);

create index placement_stats_org_date_idx on public.placement_stats (organization_id, date desc);

-- ---------------- activity log: new entities ----------------
alter table public.activity_log drop constraint activity_log_entity_type_check;
alter table public.activity_log add constraint activity_log_entity_type_check
  check (entity_type in (
    'client', 'engagement', 'deliverable', 'invoice', 'article',
    'metric', 'member', 'service', 'lead', 'campaign', 'placement'
  ));

-- ---------------- RLS ----------------
alter table public.campaigns enable row level security;
alter table public.campaign_stats enable row level security;
alter table public.placements enable row level security;
alter table public.placement_stats enable row level security;

create policy "campaigns_select" on public.campaigns
  for select to authenticated using (public.is_org_member(organization_id));
create policy "campaigns_insert" on public.campaigns
  for insert to authenticated with check (public.is_org_member(organization_id));
create policy "campaigns_update" on public.campaigns
  for update to authenticated
  using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));
create policy "campaigns_delete" on public.campaigns
  for delete to authenticated using (public.is_org_member(organization_id));

create policy "campaign_stats_select" on public.campaign_stats
  for select to authenticated using (public.is_org_member(organization_id));
create policy "campaign_stats_insert" on public.campaign_stats
  for insert to authenticated with check (public.is_org_member(organization_id));
create policy "campaign_stats_update" on public.campaign_stats
  for update to authenticated
  using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));
create policy "campaign_stats_delete" on public.campaign_stats
  for delete to authenticated using (public.is_org_member(organization_id));

create policy "placements_select" on public.placements
  for select to authenticated using (public.is_org_member(organization_id));
create policy "placements_insert" on public.placements
  for insert to authenticated with check (public.is_org_member(organization_id));
create policy "placements_update" on public.placements
  for update to authenticated
  using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));
create policy "placements_delete" on public.placements
  for delete to authenticated using (public.is_org_member(organization_id));

create policy "placement_stats_select" on public.placement_stats
  for select to authenticated using (public.is_org_member(organization_id));
create policy "placement_stats_insert" on public.placement_stats
  for insert to authenticated with check (public.is_org_member(organization_id));
create policy "placement_stats_update" on public.placement_stats
  for update to authenticated
  using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));
create policy "placement_stats_delete" on public.placement_stats
  for delete to authenticated using (public.is_org_member(organization_id));
