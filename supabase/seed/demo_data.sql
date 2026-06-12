-- ============================================================
-- CampaignDesk — DEMO DATA
-- Fills your organization with realistic sample data so every
-- screen has something to show. Safe to run once; running it
-- again is skipped automatically.
--
-- To remove the demo later: delete the demo clients in the UI
-- (ACME Industries, Lotus Boutique, MediaBuzz Network, DataPro
-- Analytics, GreenLeaf Organics) — everything cascades.
-- ============================================================

do $$
declare
  v_org uuid;
  v_actor uuid;
  v_svc_seo uuid;
  v_svc_paid uuid;
  v_svc_web uuid;
  v_svc_data uuid;
  v_svc_social uuid;
  c_acme uuid;
  c_lotus uuid;
  c_media uuid;
  c_datapro uuid;
  c_green uuid;
  e_seo uuid;
  e_perf uuid;
  e_web uuid;
  e_data uuid;
  e_social uuid;
  inv_id uuid;
  month0 date := date_trunc('month', current_date)::date;
  month1 date := (date_trunc('month', current_date) - interval '1 month')::date;
  month2 date := (date_trunc('month', current_date) - interval '2 months')::date;
begin
  -- Target org: prefer "Wide Link", otherwise the oldest org.
  select id into v_org from public.organizations
  where name ilike '%wide link%'
  order by created_at limit 1;
  if v_org is null then
    select id into v_org from public.organizations order by created_at limit 1;
  end if;
  if v_org is null then
    raise exception 'No organization found — sign up in the app first.';
  end if;

  select user_id into v_actor from public.memberships
  where organization_id = v_org and role = 'owner' limit 1;

  if exists (
    select 1 from public.clients
    where organization_id = v_org and name = 'ACME Industries'
  ) then
    raise notice 'Demo data already present — skipping.';
    return;
  end if;

  select id into v_svc_seo    from public.services where organization_id = v_org and slug = 'traffic-seo';
  select id into v_svc_paid   from public.services where organization_id = v_org and slug = 'paid-campaigns';
  select id into v_svc_web    from public.services where organization_id = v_org and slug = 'website-build';
  select id into v_svc_data   from public.services where organization_id = v_org and slug = 'data-analysis';
  select id into v_svc_social from public.services where organization_id = v_org and slug = 'social-media';

  -- ---------------- Clients & suppliers ----------------
  insert into public.clients (organization_id, name, company_name, email, phone, default_currency, type, notes)
  values (v_org, 'ACME Industries', 'ACME Industries Ltd', 'marketing@acme.example', '+852 5555 0101', 'USD', 'client', 'Flagship SEO retainer client since 2024.')
  returning id into c_acme;

  insert into public.clients (organization_id, name, company_name, email, phone, default_currency, type, notes)
  values (v_org, 'Lotus Boutique', 'Lotus Boutique HK', 'hello@lotus.example', '+852 5555 0102', 'USD', 'client', 'E-commerce site rebuild, possible SEO upsell.')
  returning id into c_lotus;

  insert into public.clients (organization_id, name, company_name, email, phone, default_currency, type, notes)
  values (v_org, 'MediaBuzz Network', 'MediaBuzz Media Group', 'partners@mediabuzz.example', '', 'USD', 'supplier', 'Publisher network — 80% rev-share on display traffic.')
  returning id into c_media;

  insert into public.clients (organization_id, name, company_name, email, phone, default_currency, type, notes)
  values (v_org, 'DataPro Analytics', 'DataPro Analytics Co', 'team@datapro.example', '', 'USD', 'both', 'Client for dashboards; also supplies enriched data feeds.')
  returning id into c_datapro;

  insert into public.clients (organization_id, name, company_name, email, phone, default_currency, type, notes)
  values (v_org, 'GreenLeaf Organics', 'GreenLeaf Organics Ltd', 'growth@greenleaf.example', '+852 5555 0105', 'USD', 'client', 'Performance deal: pays per click on display campaigns.')
  returning id into c_green;

  -- ---------------- Engagements ----------------
  -- 1. ACME × Traffic & SEO — classic retainer, auto financials.
  insert into public.engagements (organization_id, client_id, service_id, name, status, start_date, budget_amount, budget_currency, pricing_model, notes)
  values (v_org, c_acme, v_svc_seo, 'ACME — SEO retainer 2026', 'active', month2, 3000, 'USD', 'retainer', 'Monthly retainer: content + technical SEO.')
  returning id into e_seo;

  -- 2. GreenLeaf × Paid Campaigns — THE performance showcase:
  --    client pays $100 per click, publisher MediaBuzz gets 80%.
  insert into public.engagements (organization_id, client_id, service_id, name, status, start_date, budget_currency, pricing_model, unit_rate, supplier_id, payout_percent, financial_mode, notes)
  values (v_org, c_green, v_svc_paid, 'GreenLeaf — display performance (CPC)', 'active', month1, 'USD', 'cpc', 100, c_media, 80, 'performance', 'CPC $100; MediaBuzz receives 80% of earned revenue.')
  returning id into e_perf;

  -- 3. Lotus × Website Build — completed fixed-price project.
  insert into public.engagements (organization_id, client_id, service_id, name, status, start_date, end_date, budget_amount, budget_currency, pricing_model, notes)
  values (v_org, c_lotus, v_svc_web, 'Lotus — e-commerce rebuild', 'completed', month2, month1 + 20, 4500, 'USD', 'fixed', 'Shopify build, delivered on time.')
  returning id into e_web;

  -- 4. DataPro × Data Analysis — active.
  insert into public.engagements (organization_id, client_id, service_id, name, status, start_date, budget_amount, budget_currency, pricing_model, notes)
  values (v_org, c_datapro, v_svc_data, 'DataPro — attribution dashboard', 'active', month1, 2000, 'USD', 'fixed', 'Looker dashboard with multi-touch attribution.')
  returning id into e_data;

  -- 5. Lotus × Social Media — proposal (shows amber dot in matrix).
  insert into public.engagements (organization_id, client_id, service_id, name, status, start_date, budget_amount, budget_currency, pricing_model, notes)
  values (v_org, c_lotus, v_svc_social, 'Lotus — social launch campaign', 'proposal', current_date + 14, 1800, 'USD', 'fixed', 'Pending approval after the site launch.')
  returning id into e_social;

  -- ---------------- Metrics ----------------
  -- SEO retainer: organic growth over two months.
  insert into public.engagement_metrics (organization_id, engagement_id, period_start, period_end, sessions, organic_traffic, clicks, notes)
  values
    (v_org, e_seo, month2, month2 + 27, 12400, 8200, 3100, 'Baseline month'),
    (v_org, e_seo, month1, month1 + 27, 15800, 11650, 4350, 'Organic up 42% after content sprint');

  -- Performance deal: clicks drive earned revenue (clicks × $100).
  insert into public.engagement_metrics (organization_id, engagement_id, period_start, period_end, clicks, impressions, spend, notes)
  values
    (v_org, e_perf, month1, month1 + 27, 42, 156000, 950, '42 clicks → $4,200 earned, $3,360 payout'),
    (v_org, e_perf, month0, least(month0 + 27, current_date), 10, 38000, 200, 'Month to date');

  -- ---------------- Deliverables ----------------
  insert into public.deliverables (organization_id, engagement_id, type, title, status, due_date, delivered_at, url, notes)
  values
    (v_org, e_seo,  'article',          'Pillar guide: HK e-commerce SEO',        'delivered',   month1 + 18, month1 + 17, 'https://acme.example/blog/hk-ecommerce-seo', ''),
    (v_org, e_seo,  'article',          'Comparison post: marketplaces 2026',     'in_progress', current_date - 4, null, null, 'Draft at 60% — waiting for product data.'),
    (v_org, e_seo,  'audit_report',     'Q2 technical SEO audit',                 'review',      current_date + 6, null, null, 'Crawl done, writing recommendations.'),
    (v_org, e_web,  'website',          'Lotus storefront (Shopify)',             'published',   month1 + 15, month1 + 15, 'https://lotus.example', ''),
    (v_org, e_perf, 'dashboard_report', 'GreenLeaf performance dashboard',        'planned',     current_date + 9, null, null, 'Weekly CPC + margin view.'),
    (v_org, e_data, 'dashboard_report', 'Attribution model v1',                   'in_progress', current_date + 12, null, null, ''),
    (v_org, e_social, 'creative',       'Launch teaser pack (5 assets)',          'planned',     current_date + 21, null, null, '');

  -- ---------------- SEO articles ----------------
  insert into public.seo_articles (organization_id, title, engagement_id, client_id, target_keywords, status, published_url, published_at, word_count, content)
  values
    (v_org, 'HK e-commerce SEO: the 2026 playbook', e_seo, c_acme,
     array['hong kong seo','ecommerce seo','seo playbook'], 'published',
     'https://acme.example/blog/hk-ecommerce-seo', month1 + 17, 248,
     '# HK e-commerce SEO: the 2026 playbook' || chr(10) || chr(10) ||
     'Hong Kong''s e-commerce market is uniquely bilingual and mobile-first. This guide covers the three pillars we apply for every client.' || chr(10) || chr(10) ||
     '## 1. Technical foundations' || chr(10) || chr(10) ||
     'Site speed, hreflang for zh-HK/en, and clean faceted navigation. Most stores lose 30% of crawl budget to filter pages.' || chr(10) || chr(10) ||
     '## 2. Content that ranks and converts' || chr(10) || chr(10) ||
     '- Category page copy that answers buying questions' || chr(10) ||
     '- Comparison and "best of" editorial' || chr(10) ||
     '- FAQ schema on every product page' || chr(10) || chr(10) ||
     '## 3. Authority' || chr(10) || chr(10) ||
     'Digital PR beats directory links. One strong local citation is worth fifty generic ones.'),
    (v_org, 'Marketplace vs own store: where to sell in 2026', e_seo, c_acme,
     array['marketplace vs website','sell online hong kong'], 'review', '', null, 152,
     '# Marketplace vs own store' || chr(10) || chr(10) || 'Draft: comparing HKTVmall, Amazon and standalone Shopify stores on fees, data ownership and SEO upside.'),
    (v_org, 'Organic produce delivery — content angle ideas', null, c_green,
     array['organic delivery','green living hk'], 'idea', '', null, 0, '');

  -- ---------------- Invoices ----------------
  -- Paid retainer (last month) — ACME.
  insert into public.invoices (organization_id, number, direction, client_id, engagement_id, issue_date, due_date, currency, status, subtotal, tax_amount, total, paid_at, notes)
  values (v_org, 'DEMO-2026-0001', 'outbound', c_acme, e_seo, month1 + 1, month1 + 15, 'USD', 'paid', 3000, 0, 3000, month1 + 12, 'Monthly SEO retainer')
  returning id into inv_id;
  insert into public.invoice_items (organization_id, invoice_id, description, quantity, unit_price, line_total, sort_order)
  values (v_org, inv_id, 'SEO retainer — content & technical', 1, 3000, 3000, 0);

  -- Paid retainer (THIS month) — feeds the "revenue this month" card.
  insert into public.invoices (organization_id, number, direction, client_id, engagement_id, issue_date, due_date, currency, status, subtotal, tax_amount, total, paid_at, notes)
  values (v_org, 'DEMO-2026-0002', 'outbound', c_acme, e_seo, month0 + 1, month0 + 15, 'USD', 'paid', 3000, 0, 3000, least(month0 + 5, current_date), 'Monthly SEO retainer')
  returning id into inv_id;
  insert into public.invoice_items (organization_id, invoice_id, description, quantity, unit_price, line_total, sort_order)
  values (v_org, inv_id, 'SEO retainer — content & technical', 1, 3000, 3000, 0);

  -- Website build final — paid this month.
  insert into public.invoices (organization_id, number, direction, client_id, engagement_id, issue_date, due_date, currency, status, subtotal, tax_amount, total, paid_at, notes)
  values (v_org, 'DEMO-2026-0003', 'outbound', c_lotus, e_web, month1 + 16, month0 + 1, 'USD', 'paid', 1500, 0, 1500, least(month0 + 3, current_date), 'Final milestone (1/3 retained)')
  returning id into inv_id;
  insert into public.invoice_items (organization_id, invoice_id, description, quantity, unit_price, line_total, sort_order)
  values (v_org, inv_id, 'Storefront build — final milestone', 1, 1500, 1500, 0);

  -- Performance earnings invoice — SENT (outstanding).
  insert into public.invoices (organization_id, number, direction, client_id, engagement_id, issue_date, due_date, currency, status, subtotal, tax_amount, total, notes)
  values (v_org, 'DEMO-2026-0004', 'outbound', c_green, e_perf, month0 + 2, month0 + 16, 'USD', 'sent', 4200, 0, 4200, 'Display CPC — 42 clicks × $100')
  returning id into inv_id;
  insert into public.invoice_items (organization_id, invoice_id, description, quantity, unit_price, line_total, sort_order)
  values (v_org, inv_id, 'Display clicks (CPC $100)', 42, 100, 4200, 0);

  -- Dashboard project — OVERDUE (red in lists).
  insert into public.invoices (organization_id, number, direction, client_id, engagement_id, issue_date, due_date, currency, status, subtotal, tax_amount, total, notes)
  values (v_org, 'DEMO-2026-0005', 'outbound', c_datapro, e_data, month1 + 10, month1 + 24, 'USD', 'overdue', 1000, 0, 1000, 'Kickoff milestone')
  returning id into inv_id;
  insert into public.invoice_items (organization_id, invoice_id, description, quantity, unit_price, line_total, sort_order)
  values (v_org, inv_id, 'Dashboard kickoff milestone', 1, 1000, 1000, 0);

  -- Publisher payout — INBOUND, paid this month.
  insert into public.invoices (organization_id, number, direction, client_id, engagement_id, issue_date, due_date, currency, status, subtotal, tax_amount, total, paid_at, notes)
  values (v_org, 'DEMO-2026-P001', 'inbound', c_media, e_perf, month0 + 2, month0 + 9, 'USD', 'paid', 3360, 0, 3360, least(month0 + 6, current_date), 'Publisher payout — 80% of $4,200 earned')
  returning id into inv_id;
  insert into public.invoice_items (organization_id, invoice_id, description, quantity, unit_price, line_total, sort_order)
  values (v_org, inv_id, 'Rev-share payout (80% of display earnings)', 1, 3360, 3360, 0);

  -- ---------------- Activity feed ----------------
  insert into public.activity_log (organization_id, actor_user_id, entity_type, entity_id, entity_label, action, details, created_at)
  values
    (v_org, v_actor, 'client',      c_acme,  'ACME Industries',                        'created', null, now() - interval '6 days'),
    (v_org, v_actor, 'engagement',  e_seo,   'ACME — SEO retainer 2026',               'created', null, now() - interval '6 days' + interval '10 minutes'),
    (v_org, v_actor, 'engagement',  e_perf,  'GreenLeaf — display performance (CPC)',  'created', null, now() - interval '5 days'),
    (v_org, v_actor, 'deliverable', null,    'Lotus storefront (Shopify)',             'delivered', '{"to":"published"}', now() - interval '4 days'),
    (v_org, v_actor, 'article',     null,    'HK e-commerce SEO: the 2026 playbook',   'published', null, now() - interval '3 days'),
    (v_org, v_actor, 'invoice',     null,    'DEMO-2026-0002',                         'paid', '{"to":"paid"}', now() - interval '2 days'),
    (v_org, v_actor, 'invoice',     null,    'DEMO-2026-0004',                         'status_changed', '{"to":"sent"}', now() - interval '1 day'),
    (v_org, v_actor, 'metric',      null,    'GreenLeaf — display performance (CPC)',  'created', null, now() - interval '3 hours'),
    (v_org, v_actor, 'invoice',     null,    'DEMO-2026-P001',                         'paid', '{"to":"paid"}', now() - interval '1 hour');

  raise notice 'Demo data created successfully.';
end $$;
