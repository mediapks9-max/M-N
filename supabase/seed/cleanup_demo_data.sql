-- ============================================================
-- Removes the demo dataset created by demo_data.sql so you can
-- start working with real data. Your real clients, articles
-- (content batches & spotlights), settings and members are NOT
-- touched. Run once in the SQL editor.
-- ============================================================

do $$
declare
  v_org uuid;
  demo_clients uuid[];
begin
  select id into v_org from public.organizations order by created_at limit 1;

  select array_agg(id) into demo_clients
  from public.clients
  where organization_id = v_org
    and name in (
      'ACME Industries', 'Lotus Boutique', 'MediaBuzz Network',
      'DataPro Analytics', 'GreenLeaf Organics'
    );

  if demo_clients is not null then
    -- Invoices restrict client deletion, so they go first
    -- (line items cascade with them).
    delete from public.invoices
    where organization_id = v_org and client_id = any(demo_clients);

    -- Clients cascade: engagements -> metrics & deliverables.
    delete from public.clients
    where organization_id = v_org and id = any(demo_clients);
  end if;

  -- Demo articles (the HK-themed samples), not the real content.
  delete from public.seo_articles
  where organization_id = v_org
    and title in (
      'HK e-commerce SEO: the 2026 playbook',
      'Marketplace vs own store: where to sell in 2026',
      'Organic produce delivery — content angle ideas'
    );

  -- Demo activity-feed entries.
  delete from public.activity_log
  where organization_id = v_org
    and (
      entity_label like 'DEMO-%'
      or entity_label in (
        'ACME Industries',
        'ACME — SEO retainer 2026',
        'GreenLeaf — display performance (CPC)',
        'Lotus storefront (Shopify)',
        'HK e-commerce SEO: the 2026 playbook'
      )
    );

  raise notice 'Demo data removed.';
end $$;
