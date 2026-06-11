-- ============================================================
-- CampaignDesk — Phase D: performance-based deals
-- Pricing models (CPL/CPA/CPC/rev-share) on engagements,
-- supplier (publisher) revenue-share payouts, approved leads.
-- Run AFTER 0002_business_modules.sql.
-- ============================================================

-- How the engagement earns from the client:
--   fixed/retainer  -> invoices only (existing behavior)
--   cpl             -> unit_rate × (approved_leads, falling back to leads)
--   cpa             -> unit_rate × conversions
--   cpc             -> unit_rate × clicks
--   rev_share       -> rev_share_percent × revenue_generated
alter table public.engagements
  add column pricing_model text not null default 'fixed'
    check (pricing_model in ('fixed', 'retainer', 'cpl', 'cpa', 'cpc', 'rev_share')),
  add column unit_rate numeric,
  add column rev_share_percent numeric,
  -- Publisher/supplier who provides the traffic and receives an
  -- agreed share of the engagement's earned revenue.
  add column supplier_id uuid,
  add column payout_percent numeric;

alter table public.engagements
  add constraint engagements_supplier_fk
    foreign key (supplier_id, organization_id)
    references public.clients (id, organization_id)
    on delete set null (supplier_id);

-- Third financial mode: revenue/cost computed from performance metrics.
alter table public.engagements
  drop constraint engagements_financial_mode_check;
alter table public.engagements
  add constraint engagements_financial_mode_check
    check (financial_mode in ('auto', 'manual', 'performance'));

-- Client-approved lead count for CPL billing (raw `leads` stays as tracked).
alter table public.engagement_metrics
  add column approved_leads numeric;
