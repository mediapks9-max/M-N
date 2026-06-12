-- ============================================================
-- SIMULATION DATA for the campaign operations layer.
-- Creates clearly-labeled "SIM —" clients, engagements, campaigns
-- with 30 days of realistic trended daily data, plus publisher
-- placements with three competing networks.
--
-- To remove later: delete the two "SIM —" clients in the Clients
-- screen (everything cascades), or run the delete at the bottom.
-- Safe to re-run: skipped if SIM data already exists.
-- ============================================================

do $$
declare
  v_org uuid;
  v_svc uuid;
  c_adv uuid;
  c_pub uuid;
  e_perf uuid;
  cmp_search uuid;
  cmp_meta uuid;
  cmp_native uuid;
  pl_home uuid;
  pl_article uuid;
  d date;
  i int;
  base_clicks numeric;
  trend numeric;
begin
  select id into v_org from public.organizations order by created_at limit 1;
  if v_org is null then
    raise exception 'No organization found.';
  end if;

  if exists (
    select 1 from public.clients
    where organization_id = v_org and name like 'SIM —%'
  ) then
    raise notice 'Simulation data already present — skipping.';
    return;
  end if;

  select id into v_svc from public.services
  where organization_id = v_org and slug = 'paid-campaigns';
  if v_svc is null then
    select id into v_svc from public.services
    where organization_id = v_org order by sort_order limit 1;
  end if;

  -- Actors
  insert into public.clients (organization_id, name, company_name, default_currency, type, notes)
  values (v_org, 'SIM — NovaTech (advertiser)', 'NovaTech Ltd', 'USD', 'client', 'Simulation data — safe to delete.')
  returning id into c_adv;

  insert into public.clients (organization_id, name, company_name, default_currency, type, notes)
  values (v_org, 'SIM — DailySpark (publisher)', 'DailySpark Media', 'USD', 'supplier', 'Simulation data — safe to delete.')
  returning id into c_pub;

  insert into public.engagements (organization_id, client_id, service_id, name, status, start_date, budget_currency, pricing_model, unit_rate, supplier_id, payout_percent, financial_mode)
  values (v_org, c_adv, v_svc, 'SIM — NovaTech performance program', 'active', current_date - 35, 'USD', 'cpl', 45, c_pub, 70, 'performance')
  returning id into e_perf;

  -- Campaigns
  insert into public.campaigns (organization_id, engagement_id, name, channel, network, status, daily_budget, target_cpl, target_roas, currency, start_date)
  values (v_org, e_perf, 'SIM — Search: brand + category', 'google_ads', 'MCC main', 'active', 250, 40, 2.0, 'USD', current_date - 30)
  returning id into cmp_search;

  insert into public.campaigns (organization_id, engagement_id, name, channel, network, status, daily_budget, target_cpl, target_roas, currency, start_date)
  values (v_org, e_perf, 'SIM — Meta: lookalike prospecting', 'meta', 'BM 014', 'active', 180, 45, 1.8, 'USD', current_date - 30)
  returning id into cmp_meta;

  insert into public.campaigns (organization_id, engagement_id, name, channel, network, status, daily_budget, target_cpl, target_roas, currency, start_date)
  values (v_org, e_perf, 'SIM — Native: content discovery', 'native', 'Taboola', 'active', 120, 50, 1.5, 'USD', current_date - 30)
  returning id into cmp_native;

  -- 30 days of daily data with distinct stories per campaign:
  --   Search: healthy and improving (the winner)
  --   Meta:   decent but CPL creeping above target (warning)
  --   Native: spending with poor returns (action needed)
  for i in 0..29 loop
    d := current_date - 29 + i;
    trend := i / 29.0;

    -- Search: clicks grow, CPL shrinks
    base_clicks := 60 + i * 1.5 + (random() * 14 - 7);
    insert into public.campaign_stats (organization_id, campaign_id, date, impressions, clicks, leads, conversions, spend, revenue)
    values (
      v_org, cmp_search, d,
      round(base_clicks * (30 + random() * 12)),
      round(base_clicks),
      greatest(1, round(base_clicks * (0.075 + trend * 0.02 + random() * 0.012))),
      greatest(0, round(base_clicks * (0.022 + random() * 0.008))),
      round((base_clicks * (3.1 - trend * 0.5 + random() * 0.4))::numeric, 2),
      round((base_clicks * (6.2 + trend * 1.6 + random() * 0.9))::numeric, 2)
    );

    -- Meta: steady volume, costs drifting up
    base_clicks := 48 + (random() * 12 - 6);
    insert into public.campaign_stats (organization_id, campaign_id, date, impressions, clicks, leads, conversions, spend, revenue)
    values (
      v_org, cmp_meta, d,
      round(base_clicks * (42 + random() * 15)),
      round(base_clicks),
      greatest(0, round(base_clicks * (0.062 - trend * 0.012 + random() * 0.01))),
      greatest(0, round(base_clicks * (0.015 + random() * 0.006))),
      round((base_clicks * (3.4 + trend * 1.1 + random() * 0.4))::numeric, 2),
      round((base_clicks * (5.0 - trend * 0.6 + random() * 0.8))::numeric, 2)
    );

    -- Native: cheap clicks, weak conversion, negative ROAS
    base_clicks := 85 + (random() * 22 - 11);
    insert into public.campaign_stats (organization_id, campaign_id, date, impressions, clicks, leads, conversions, spend, revenue)
    values (
      v_org, cmp_native, d,
      round(base_clicks * (60 + random() * 25)),
      round(base_clicks),
      greatest(0, round(base_clicks * (0.018 + random() * 0.008))),
      greatest(0, round(base_clicks * 0.004)),
      round((base_clicks * (1.45 + random() * 0.25))::numeric, 2),
      round((base_clicks * (0.95 + random() * 0.3))::numeric, 2)
    );
  end loop;

  -- Publisher placements + 3 networks competing for 30 days
  insert into public.placements (organization_id, supplier_id, name, ad_format)
  values (v_org, c_pub, 'SIM — Homepage sidebar 300×600', 'display')
  returning id into pl_home;

  insert into public.placements (organization_id, supplier_id, name, ad_format)
  values (v_org, c_pub, 'SIM — Article footer native', 'native')
  returning id into pl_article;

  for i in 0..29 loop
    d := current_date - 29 + i;

    -- Homepage: Taboola clearly wins, AdSense second, Ezoic weak
    insert into public.placement_stats (organization_id, placement_id, network, date, impressions, clicks, revenue) values
      (v_org, pl_home, 'Taboola', d, round(2200 + random() * 800), round(10 + random() * 8), round((22 + random() * 9)::numeric, 2)),
      (v_org, pl_home, 'AdSense', d, round(2100 + random() * 700), round(8 + random() * 6),  round((14 + random() * 6)::numeric, 2)),
      (v_org, pl_home, 'Ezoic',   d, round(1500 + random() * 600), round(4 + random() * 4),  round((7 + random() * 4)::numeric, 2));

    -- Article footer: AdSense wins here — different placement, different winner
    insert into public.placement_stats (organization_id, placement_id, network, date, impressions, clicks, revenue) values
      (v_org, pl_article, 'AdSense', d, round(3400 + random() * 900), round(14 + random() * 9), round((19 + random() * 7)::numeric, 2)),
      (v_org, pl_article, 'Taboola', d, round(3100 + random() * 800), round(9 + random() * 7),  round((12 + random() * 5)::numeric, 2)),
      (v_org, pl_article, 'Ezoic',   d, round(2300 + random() * 700), round(6 + random() * 5),  round((9 + random() * 4)::numeric, 2));
  end loop;

  raise notice 'Simulation campaign data created.';
end $$;

-- To remove the simulation later, run:
--   delete from public.clients where name like 'SIM —%';
