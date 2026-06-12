-- ============================================================
-- SIMULATION DATA — lead funnel
-- Fills the Leads screen with a realistic 14-day picture:
-- tracked site visits (with UTM mix) and leads at every funnel
-- stage, from multiple sources including an embedded client-site
-- form. All simulated rows are clearly marked.
--
-- Cleanup: delete from leads where message like '%[SIM]%';
--          delete from site_visits where visitor_id like 'sim-%';
--          (and the 'SIM — Converted%' client in the UI)
-- Safe to re-run: skipped if SIM leads already exist.
-- ============================================================

do $$
declare
  v_org uuid;
  v_client uuid;
  i int;
  d timestamptz;
  utm text;
begin
  select id into v_org from public.organizations order by created_at limit 1;
  if v_org is null then
    raise exception 'No organization found.';
  end if;

  if exists (
    select 1 from public.leads
    where organization_id = v_org and message like '%[SIM]%'
  ) then
    raise notice 'Simulated leads already present — skipping.';
    return;
  end if;

  -- ---------------- 14 days of tracked visits ----------------
  -- Mix: ~55% direct/organic, ~25% google cpc, ~20% facebook.
  for i in 1..320 loop
    d := now() - (random() * interval '14 days');
    utm := case
      when random() < 0.55 then ''
      when random() < 0.55 then 'google'
      else 'facebook'
    end;
    insert into public.site_visits
      (organization_id, visitor_id, path, referrer, utm_source, utm_medium, utm_campaign, created_at)
    values (
      v_org,
      'sim-' || (1000 + floor(random() * 220))::int,
      (array['/', '/blog', '/blog/small-business-seo-playbook', '/blog/google-ads-vs-seo', '/blog/measure-marketing-roi'])[1 + floor(random() * 5)::int],
      case when utm = '' then (array['', 'https://www.google.com/', 'https://www.bing.com/'])[1 + floor(random() * 3)::int]
           when utm = 'google' then 'https://www.google.com/'
           else 'https://l.facebook.com/' end,
      utm,
      case when utm = '' then '' else 'cpc' end,
      case when utm = 'google' then 'brand-search'
           when utm = 'facebook' then 'spring-launch'
           else '' end,
      d
    );
  end loop;

  -- ---------------- Leads across the funnel ----------------
  -- (name, email, status, utm_source, utm_campaign, source tag, landing, days ago, message)
  insert into public.leads
    (organization_id, name, email, phone, message, status, source,
     utm_source, utm_medium, utm_campaign, referrer, landing_page, visitor_id, created_at)
  values
    (v_org, 'Daniel Roth', 'daniel.roth@example.com', '+44 7700 900101',
     '[SIM] We need help scaling our Google Ads — budget around $15k/month.',
     'new', 'website', 'google', 'cpc', 'brand-search',
     'https://www.google.com/', '/blog/google-ads-vs-seo?utm_source=google&utm_campaign=brand-search', 'sim-1001', now() - interval '3 hours'),
    (v_org, 'Maya Stern', 'maya@example-shop.com', '',
     '[SIM] Looking for a full SEO audit for our online store.',
     'new', 'website', '', '', '',
     'https://www.google.com/', '/blog/small-business-seo-playbook', 'sim-1002', now() - interval '9 hours'),
    (v_org, 'Tom Becker', 'tom.becker@example.io', '+1 415 555 0188',
     '[SIM] Interested in the performance marketing model you described.',
     'new', 'website', 'facebook', 'cpc', 'spring-launch',
     'https://l.facebook.com/', '/blog/performance-marketing-explained?utm_source=facebook&utm_campaign=spring-launch', 'sim-1003', now() - interval '1 day'),
    (v_org, 'Lena Hoffman', 'lena@example-agency.de', '',
     '[SIM] Question about white-label reporting for our clients.',
     'new', 'waveroi.biz', '', '', '',
     '', 'waveroi.biz', 'sim-1004', now() - interval '1 day 6 hours'),
    (v_org, 'Adam Klein', 'adam.klein@example.com', '+972 50 555 0123',
     '[SIM] Want a quote for lead generation, B2B SaaS.',
     'contacted', 'website', 'google', 'cpc', 'brand-search',
     'https://www.google.com/', '/?utm_source=google&utm_campaign=brand-search', 'sim-1005', now() - interval '2 days'),
    (v_org, 'Sara Vidal', 'sara@example-store.es', '',
     '[SIM] Our CPL doubled last quarter — can you review our funnel?',
     'contacted', 'website', 'facebook', 'cpc', 'spring-launch',
     'https://l.facebook.com/', '/blog/measure-marketing-roi', 'sim-1006', now() - interval '3 days'),
    (v_org, 'James Carter', 'jcarter@example.co', '+44 7700 900222',
     '[SIM] Following your article on landing pages — we need a rebuild.',
     'contacted', 'waveroi.biz', '', '', '',
     '', 'waveroi.biz', 'sim-1007', now() - interval '4 days'),
    (v_org, 'Nina Petrova', 'nina@example-media.com', '',
     '[SIM] Publisher with 2M monthly pageviews exploring monetization.',
     'qualified', 'website', '', '', '',
     'https://www.google.com/', '/blog/performance-marketing-explained', 'sim-1008', now() - interval '5 days'),
    (v_org, 'Oren Mizrahi', 'oren@example-tech.io', '+972 54 555 0177',
     '[SIM] Budget approved for Q3 — want to start with a 90-day plan.',
     'qualified', 'website', 'google', 'cpc', 'brand-search',
     'https://www.google.com/', '/blog/90-day-content-marketing-plan?utm_source=google&utm_campaign=brand-search', 'sim-1009', now() - interval '6 days'),
    (v_org, 'Emma Lindqvist', 'emma@example-nordic.se', '',
     '[SIM] Comparing three agencies, decision next week.',
     'lost', 'website', 'facebook', 'cpc', 'spring-launch',
     'https://l.facebook.com/', '/', 'sim-1010', now() - interval '9 days'),
    (v_org, 'Pavel Novak', 'pavel@example.cz', '',
     '[SIM] Just researching for now.',
     'lost', 'website', '', '', '',
     '', '/blog', 'sim-1011', now() - interval '11 days');

  -- One lead that completed the journey: converted into a client.
  insert into public.clients (organization_id, name, company_name, email, default_currency, type, notes)
  values (v_org, 'SIM — Converted: Rachel Adler', 'Adler Digital', 'rachel@example-adler.com', 'USD', 'client',
          'Created from a simulated lead — shows the full lead-to-client journey. Safe to delete.')
  returning id into v_client;

  insert into public.leads
    (organization_id, name, email, phone, message, status, source,
     utm_source, utm_medium, utm_campaign, referrer, landing_page, visitor_id, client_id, created_at)
  values
    (v_org, 'Rachel Adler', 'rachel@example-adler.com', '+1 212 555 0144',
     '[SIM] Saw your ROI guide — we want exactly this measurement setup.',
     'converted', 'website', 'google', 'cpc', 'brand-search',
     'https://www.google.com/', '/blog/measure-marketing-roi?utm_source=google&utm_campaign=brand-search', 'sim-1012', v_client, now() - interval '8 days');

  raise notice 'Simulated lead funnel created.';
end $$;
