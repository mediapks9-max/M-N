-- ============================================================
-- Content batch 1 — 8 published digital-marketing articles
-- (global audience, pillar + cluster structure, interlinked).
-- Inserts into the oldest organization. Safe to re-run: existing
-- slugs are skipped.
-- ============================================================

do $$
declare
  v_org uuid;
begin
  select id into v_org from public.organizations order by created_at limit 1;
  if v_org is null then
    raise exception 'No organization found.';
  end if;

  insert into public.seo_articles
    (organization_id, title, slug, target_keywords, status, published_at, word_count, content)
  values
  -- ---------------------------------------------------------- 1 (pillar)
  (v_org,
   'The Small Business SEO Playbook for 2026',
   'small-business-seo-playbook',
   array['small business seo','seo for small business','seo playbook 2026'],
   'published', now() - interval '42 days', 940,
   $md$
Most small businesses don't lose at SEO because the competition is better. They lose because they spread two hours a week across twelve tactics instead of doing three things consistently. This playbook is those three things, in order.

## 1. Win the searches you already deserve

Before chasing new keywords, capture the demand that already exists for what you do.

**Start with your money pages.** Every service you sell needs its own page with a clear, search-matching title. "Services" as a single page is invisible; "Bookkeeping for E-commerce Businesses" is findable. One page per service, one primary keyword per page.

**Answer the questions buyers actually ask.** Open your sent email folder and list the ten questions clients asked before they hired you. Each one is an article. These convert far better than generic topics because the person searching is already in a buying process.

**Fix the basics that quietly cap your rankings:**

- Every page has a unique title tag under 60 characters with the keyword near the front
- Every page has a meta description that earns the click (a benefit + a reason to choose you)
- Your site loads in under 2.5 seconds on a phone — test with PageSpeed Insights, fix the largest image first
- One H1 per page, and it matches what the page is about

## 2. Publish on a schedule you can actually keep

Google rewards sites that demonstrate ongoing expertise. The bar is lower than you think: **two good articles a month beats eight rushed ones**, and beats zero by an order of magnitude.

A good article in 2026:

- Targets one specific question or keyword (check what currently ranks — match the format)
- Says something from experience: a number, a screenshot, a mistake you made, a client scenario
- Is structured for skimmers: H2 every ~200 words, short paragraphs, lists
- Links to 2–3 other pages on your site, including one service page

If you're not sure where to start, our guide to [keyword research without expensive tools](/blog/keyword-research-without-tools) gives you a repeatable 30-minute process.

## 3. Earn mentions, not just links

Link building has a deserved reputation for spam, but the legitimate version is simple: **be citable**.

- Publish one piece of original data per quarter — even a small survey of 30 customers outranks opinion posts for press pickups
- Offer your expertise to industry newsletters and podcasts; a 20-minute interview often produces a better link than a month of outreach
- List your business consistently (same name, address, phone) on the directories that matter in your industry — quality over quantity

## What to ignore

Equally important is what *not* to spend your two hours on: daily social posting for SEO purposes (it doesn't rank), domain authority tools as a goal (they're estimates), AI-generating 100 thin articles (Google's helpful content systems specifically demote this), and rebuilding your site every year (stability compounds).

## The 90-day version

- **Weeks 1–2:** service pages + title tags + speed fixes
- **Weeks 3–12:** two articles per month from real client questions
- **Ongoing:** one citable asset per quarter, measured monthly

SEO is a compounding asset. The businesses that win are rarely the cleverest — they're the ones still publishing in month nine. For how this fits into a broader budget decision, see [Google Ads vs SEO: where should your first dollar go?](/blog/google-ads-vs-seo)
$md$),

  -- ---------------------------------------------------------- 2
  (v_org,
   'Keyword Research Without Expensive Tools: A 30-Minute Method',
   'keyword-research-without-tools',
   array['keyword research','free keyword research','keyword research without tools'],
   'published', now() - interval '35 days', 780,
   $md$
You don't need a $120/month subscription to find keywords worth ranking for. You need a repeatable process and the free data Google already gives you. Here's the 30-minute method we use.

## Minute 0–10: Mine your own data

**Google Search Console** (free, and non-negotiable) shows the queries you already appear for. Open Performance → Queries and sort by impressions. Look for:

- Queries with high impressions but a low position (11–30): you're on page two — one good content update can move these
- Queries you rank for *accidentally* with the wrong page: that's a sign a dedicated page would rank well

These are the highest-ROI keywords available to you, because Google has already decided you're relevant.

## Minute 10–20: Expand with autocomplete and "People also ask"

Type your core service into Google and harvest:

1. **Autocomplete suggestions** — add a space after your keyword, then try each letter of the alphabet ("bookkeeping a…", "bookkeeping b…")
2. **People also ask** — click two or three questions to expand the list; these map directly to article H2s
3. **Related searches** at the bottom of the page

You now have 30–50 raw phrases. The pattern to look for: questions and comparisons ("X vs Y", "how much does X cost", "best X for Y"). These have clear intent and are usually easier to rank for than head terms.

## Minute 20–30: Qualify by intent and difficulty

For each candidate phrase, search it and look at what ranks:

- **If the first page is all giant brands** (HubSpot, Forbes, Wikipedia) — skip it for now
- **If you see forums, Reddit threads, or thin pages** — that's a gap you can fill
- **If the results are a different format than you planned** (videos, product pages) — match the format or skip

Then sort survivors into three buckets:

| Bucket | Intent | What to build |
|---|---|---|
| Buy now | "hire", "pricing", "near me", "best X service" | Service / landing page |
| Comparing | "vs", "alternatives", "reviews" | Comparison article |
| Learning | "how to", "what is", "examples" | Guide that links to a service page |

Build one "buy now" page for every three "learning" articles — that ratio keeps traffic connected to revenue.

## A note on volume numbers

Free tools show rough ranges, and that's fine. A keyword with "10–100 searches/month" that exactly matches what you sell is worth more than a 10,000-volume keyword read by students and competitors. **Specificity beats volume** for any business that isn't a media site.

Once you've picked targets, the next constraint is technical: make sure your site isn't sabotaging the content. Our [technical SEO checklist](/blog/technical-seo-checklist) covers the 15 fixes that matter.
$md$),

  -- ---------------------------------------------------------- 3
  (v_org,
   'Technical SEO Checklist: 15 Fixes That Actually Move Rankings',
   'technical-seo-checklist',
   array['technical seo','technical seo checklist','site speed seo'],
   'published', now() - interval '28 days', 820,
   $md$
Technical SEO has a mystique it doesn't deserve. For most sites under a few thousand pages, fifteen fixes cover 95% of the impact. Work through this list top to bottom — it's ordered by typical impact.

## Crawling and indexing

**1. Submit a sitemap.** Generate `/sitemap.xml` and submit it in Google Search Console. Without it, you're relying on Google stumbling onto your pages.

**2. Check what's actually indexed.** Search `site:yourdomain.com`. If the count is wildly different from your page count — in either direction — investigate. Common culprits: parameter URLs, staging subdomains, and tag archives.

**3. Fix or remove noindex leftovers.** Sites regularly launch with a `noindex` from the development phase still in place. Check your most important pages first.

**4. One version of every URL.** http vs https, www vs non-www, trailing slash vs not — pick one of each, 301-redirect the rest, and use canonical tags.

## Speed (Core Web Vitals)

**5. Compress and resize images.** The single biggest win on most small-business sites. Serve WebP/AVIF, and never ship a 4000px image into a 400px slot.

**6. Eliminate render-blocking junk.** Old chat widgets, three analytics tools, an unused font weight — every third-party script is a tax on every visitor.

**7. Get LCP under 2.5 seconds on mobile.** Test with PageSpeed Insights. Usually it's the hero image: preload it, compress it, or replace it with text.

**8. Stop layout shift.** Set explicit width/height on images and embeds. A CLS score above 0.1 frustrates users and Google notices.

## Structure

**9. One H1 per page, descriptive title tags.** The title tag is still the strongest on-page signal. Keyword near the front, under 60 characters, unique per page.

**10. Internal links with real anchor text.** "Click here" wastes the strongest signal you fully control. Link the way you'd describe the destination page.

**11. Breadcrumbs + logical URL structure.** `/services/bookkeeping` beats `/page?id=84`. Humans and crawlers parse the same hierarchy.

**12. Structured data where it's honest.** Article, Product, FAQ, LocalBusiness — markup that matches visible content can earn richer search listings. Markup that doesn't match gets ignored or penalized.

## Hygiene

**13. Kill soft 404s and redirect chains.** Deleted pages should return 404/410 or redirect *once* to the closest equivalent — not bounce through three hops.

**14. Make it work on a phone first.** Google indexes the mobile version. If the desktop site is rich and the mobile site is stripped down, you're ranked on the stripped version.

**15. HTTPS everywhere, no mixed content.** Table stakes, but mixed-content warnings still quietly break trust and crawls on older sites.

## How to prioritize

If your content is weak, fix content first — technical perfection on thin pages ranks nothing. If your content is solid but stuck on page two, this list is usually what's holding it back. For picking what to write in the first place, start with the [keyword research method](/blog/keyword-research-without-tools).
$md$),

  -- ---------------------------------------------------------- 4
  (v_org,
   'Google Ads vs SEO: Where Should Your First Marketing Dollar Go?',
   'google-ads-vs-seo',
   array['google ads vs seo','ppc vs seo','marketing budget allocation'],
   'published', now() - interval '21 days', 760,
   $md$
"Should we do ads or SEO?" is the most common first question in marketing — and the honest answer is *it depends on your runway and your margins*. Here's the decision framework we use with clients.

## The fundamental trade

- **Google Ads** buys results this week, at a price that never goes down. Stop paying, traffic stops. It's renting.
- **SEO** buys results in 4–12 months at a cost that *amortizes toward zero* per visit. Stop investing, traffic decays slowly. It's building equity.

Neither is "better." They answer different questions: ads answer *"can we sell this profitably right now?"*; SEO answers *"can we own this market for years?"*

## Start with ads if…

- **You're validating.** New offer, new market, unproven landing page — ads give you data in days. Spending $1,000 to learn your conversion rate is cheaper than six months of SEO toward a page that doesn't convert.
- **Your customer's intent is urgent.** Emergency services, time-boxed events. Nobody plans a burst pipe around your content calendar.
- **Unit economics support it.** Rough check: if `(conversion rate × average order profit)` comfortably exceeds your cost per click, scale ads with confidence.

## Start with SEO if…

- **Your sales cycle involves research.** B2B services, high-ticket purchases, anything people compare for weeks. Content meets them at every stage; ads only catch the last click.
- **Your margins can't pay auction prices.** In industries where clicks cost $15–80, smaller players get priced out of ads but can still out-publish lazy incumbents.
- **You're playing a multi-year game.** A page that ranks #3 for a commercial keyword is an asset that produces leads monthly with near-zero marginal cost.

## The sequencing most businesses should use

1. **Months 1–3: small ads budget as a laboratory.** Find the keywords and messages that convert. Every winning ad headline is a future title tag.
2. **Months 2+: pour the learnings into SEO.** Build pages targeting the keywords that converted in ads — you already know they produce revenue.
3. **Month 6+: rebalance.** As organic rankings arrive for a keyword, reduce its ad spend and reinvest in the next keyword. Keep ads running where you can't yet rank.

This loop — *ads discover, SEO captures* — is how the budget compounds instead of just burning.

## The mistake to avoid

The worst allocation is the most common one: spending on both half-heartedly, then judging each in isolation after 60 days. Ads judged in 60 days look expensive; SEO judged in 60 days looks dead. Judge ads on cost per acquisition over weeks and SEO on trajectory over quarters.

To actually compare them you need a working measurement setup — see [how to measure marketing ROI](/blog/measure-marketing-roi) for the formulas and a simple model.
$md$),

  -- ---------------------------------------------------------- 5
  (v_org,
   'How to Measure Marketing ROI: Formulas, Benchmarks and a Simple Model',
   'measure-marketing-roi',
   array['marketing roi','measure marketing roi','cac payback'],
   'published', now() - interval '14 days', 800,
   $md$
Half of marketing budgets are judged on feelings because nobody set up the three numbers that matter. You don't need an analytics team — you need these formulas and an honest spreadsheet.

## The three numbers that matter

**1. Cost per lead (CPL)**

```
CPL = total channel spend ÷ leads from that channel
```

Include the labor, not just the ad spend. An "organic" lead isn't free if content costs you 20 hours a month.

**2. Customer acquisition cost (CAC)**

```
CAC = total spend ÷ new customers won
```

The bridge between CPL and CAC is your close rate. A $30 lead at a 25% close rate is a $120 customer; a $10 lead that never closes is infinitely expensive — which is why cheap-lead channels often lose to expensive-lead channels.

**3. Payback period**

```
Payback (months) = CAC ÷ monthly gross profit per customer
```

Under 3 months: scale aggressively. 3–12 months: fine if customers stay. Over 12 months: you're funding growth with hope.

## Attribution without the headache

Perfect attribution is a myth — people see an ad, read two articles, ask a friend, then search your brand name. Aim for *useful*, not perfect:

- **Tag every campaign link with UTMs** (source, medium, campaign). No exceptions — one untagged newsletter ruins a quarter of data.
- **Capture first-touch on the lead.** Whatever brought someone into your world the first time deserves the credit for existence; the last click before the form usually just collects it.
- **Ask "how did you hear about us?" on the form anyway.** Self-reported attribution catches dark channels (podcasts, word of mouth, communities) that analytics never sees. When tracked and self-reported disagree, the truth is usually in between.

## A model you can run monthly

One spreadsheet row per channel per month:

| Channel | Spend (incl. labor) | Leads | CPL | Customers | CAC | Gross profit added | ROI |
|---|---|---|---|---|---|---|---|
| Google Ads | $2,000 | 40 | $50 | 8 | $250 | $4,000 | 2.0× |
| SEO/content | $1,500 | 25 | $60 | 7 | $214 | $3,500 | 2.3× |

Two rules when reading it:

1. **Judge channels on different clocks.** Ads stabilize in weeks; SEO trends over quarters. Comparing month two of each is how good channels get killed early.
2. **Watch the trend, not the month.** A channel whose CAC drops 10% a month is your future winner even if it's the loser today.

## When ROI looks bad

Before cutting a channel, check the three usual suspects: a leaky funnel (the channel sends fine traffic to a page that doesn't convert — see [landing pages that convert](/blog/landing-pages-that-convert)), too-short measurement windows, and untagged links bleeding credit into "direct." Most "failed channels" are measurement failures wearing a disguise.
$md$),

  -- ---------------------------------------------------------- 6
  (v_org,
   'Landing Pages That Convert: 9 Evidence-Backed Rules',
   'landing-pages-that-convert',
   array['landing page conversion','landing page best practices','conversion rate optimization'],
   'published', now() - interval '10 days', 750,
   $md$
Traffic is rented or earned; conversion is designed. The difference between a 1% and a 4% landing page is the difference between a channel "not working" and a channel printing money. Nine rules, each one testable.

## 1. One page, one job

A landing page with a navigation bar, three offers and a newsletter popup is a brochure. Decide the single action — book a call, start a trial, download a guide — and remove everything that doesn't serve it. Every exit link is a leak.

## 2. The headline answers "what's in it for me" in 5 seconds

Visitors don't read; they triage. "Smart Solutions for Modern Business" fails triage. "Get your bookkeeping done for a flat $299/month" passes. Specificity is credibility.

## 3. Match the message to the click

If the ad said "fix slow checkout pages," the landing page headline says "fix slow checkout pages" — not your company tagline. Message match is the cheapest conversion lift available; mismatch is why high-CTR ads still produce zero leads.

## 4. Show the thing

Screenshot, photo, 30-second demo, before/after — concrete evidence beats abstract benefit icons every time. If you sell a service, show deliverables: a real report, a real dashboard, a real result with a number on it.

## 5. Social proof with specifics

"Great to work with! ★★★★★" persuades no one. "Cut our cost per lead from $80 to $31 in two months" persuades, because it's falsifiable. One detailed testimonial outperforms six vague ones — and logos only help if the visitor recognizes them.

## 6. Shrink the form

Every field costs conversions. Ask only what you need to take the *next step* — usually name and email, maybe one qualifying question. You can ask the rest on the call. (Exception: if you're drowning in junk leads, *add* a qualifying field deliberately and accept the lower volume.)

## 7. Make the button say what happens

"Submit" is what forms do; "Get my free audit" is what people want. Button copy in first person ("Send me the plan") consistently outperforms generic verbs in tests.

## 8. Answer the top objection right before the CTA

There's always one dominant hesitation — price, time, "will this work for my case." Name it and answer it next to the button: "No long-term contract. Cancel monthly." Pretending the objection doesn't exist doesn't make it go away.

## 9. Speed is a conversion feature

Every second of load time costs roughly 5–10% of conversions on mobile. A beautiful page that loads in six seconds converts worse than a plain one that loads in one.

## How to improve a page that's live

Don't redesign — iterate. Change one element per test, biggest levers first: headline → offer → form length → proof → button copy. With small traffic, run each version for at least two weeks or 100 conversions, whichever comes first. And before testing anything, make sure you're [measuring the funnel honestly](/blog/measure-marketing-roi) — you can't optimize what you can't see.
$md$),

  -- ---------------------------------------------------------- 7
  (v_org,
   'Performance Marketing Explained: CPL, CPA and Revenue-Share Deals',
   'performance-marketing-explained',
   array['performance marketing','cpl vs cpa','revenue share marketing'],
   'published', now() - interval '6 days', 730,
   $md$
Performance marketing flips the agency model on its head: instead of paying for effort (hours, retainers), you pay for outcomes — leads, sales, revenue. Done right it aligns everyone's incentives. Done naively it creates new ways to lose money. Here's how the three main models actually work.

## CPL — cost per lead

You pay a fixed price for every qualified lead delivered: $40 per demo request, $25 per quote form.

**Where it shines:** B2B services and any business with a sales team that closes. You know your close rate and customer value, so you can compute exactly what a lead is worth.

**The catch is the word "qualified."** Without a written definition — geography, budget, role, intent — you'll pay for students, competitors and bots. Good CPL deals define rejection criteria upfront and include an approval window (e.g., buyer flags invalid leads within 7 days).

**Fair pricing logic:** if a customer is worth $1,200 in gross profit and you close 1 in 10 leads, a lead is worth ≤ $120 at break-even — so a $40–60 CPL leaves room for everyone.

## CPA — cost per acquisition

You pay only when a defined action completes: a purchase, a signed contract, a verified signup.

**Where it shines:** e-commerce and self-serve products where the conversion happens online and is verifiable. The buyer carries almost no media risk.

**The catch:** because the partner carries all the risk, CPA prices are the highest — and partners will only send their best traffic to offers that convert. A weak landing page kills CPA partnerships faster than any contract clause. Tracking integrity matters too: agree on *whose* analytics counts and how refunds and duplicates are handled.

## Revenue share

The partner earns a percentage of the revenue they generate — common in affiliate programs, publisher monetization and long-collaboration deals (e.g., a publisher keeps 70–80% of ad revenue their traffic produces).

**Where it shines:** long-term relationships where both sides invest over time, and products with recurring revenue.

**The catch:** it requires trust *and* transparent reporting, because one side's revenue numbers are the other side's paycheck. Monthly statements, audit rights and a clear definition of "revenue" (gross? net of refunds? net of payment fees?) belong in writing.

## Choosing the model

| Your situation | Best fit |
|---|---|
| Sales team closes deals offline | CPL |
| Conversion is online and verifiable | CPA |
| Long-term traffic/content partner | Revenue share |
| Unproven offer, no conversion data | Start hybrid: small retainer + bonus per result |

## The golden rule

Every performance deal ultimately prices *risk*. The more risk the partner takes, the more of the upside they deserve — and the more your conversion funnel determines whether anyone profits. Before signing any of these, know your numbers cold: [how to measure marketing ROI](/blog/measure-marketing-roi) covers the formulas these deals are built on.
$md$),

  -- ---------------------------------------------------------- 8
  (v_org,
   'A 90-Day Content Marketing Plan for Companies With No Time',
   '90-day-content-marketing-plan',
   array['content marketing plan','content strategy small business','90 day content plan'],
   'published', now() - interval '2 days', 770,
   $md$
The default content strategy — "we should post more" — fails because it has no finish line. This is the opposite: a 90-day plan with exact deliverables, built for a team that can spare four hours a week, total.

## The math first

Four hours a week × 13 weeks = 52 hours. That's enough for: **8 articles, 1 cornerstone guide, and distribution for all of it.** It is *not* enough for daily social media, a podcast and a newsletter — so we don't pretend.

## Days 1–14: Foundation (8 hours)

- **List 20 real questions** your customers asked before buying. Email threads and sales calls are the source — not brainstorming. (2h)
- **Qualify them against search results** using the [30-minute keyword method](/blog/keyword-research-without-tools). Keep the 9 best: 8 articles + 1 big guide. (2h)
- **Write title + outline for all nine now.** Outlining in batch keeps the angle sharp and makes writing twice as fast later. (3h)
- **Fix your article template:** byline with a face, clear H2s, a relevant call-to-action block. (1h)

## Days 15–75: Production (32 hours)

Publish **one article every Tuesday** (weeks 3–11, ~3.5h each):

1. Write a draft fast — 60 minutes, no editing while writing
2. Add the thing only you can add: a client example, a number, a screenshot, an opinion. This single step is what separates content that ranks from AI filler
3. Edit for skimmers: shorter paragraphs, bolded key lines, a list or table
4. Internal-link it to one service page and one related article

In parallel, build the **cornerstone guide** in week 9–10 (6h): your single most complete page on the topic you most want to own. Link every article to it.

## Days 76–90: Distribution (12 hours)

Content without distribution is a diary. For *each* published piece:

- Cut it into 2–3 posts for the one social channel where your buyers actually are (one channel — pick it and ignore the rest)
- Send it to your email list, even if the list is 80 people — those 80 are your warmest audience
- Send one personal note to anyone quoted or referenced ("featured you here — feel free to share")

Then spend the remaining hours on the two articles showing early Search Console impressions: expand them, add an FAQ section, improve the title. **Doubling down on what's moving beats publishing something new.**

## What success looks like at day 90

Be honest about the timeline: rankings compound in months 4–9, not week 6. By day 90 you should see impressions trending up in Search Console, two or three keywords on page two, and at least one lead that says "I read your article." That last one is the signal that the engine works — the volume follows.

## After day 90

Keep the Tuesday rhythm, refresh one old article for every two new ones, and add one citable asset per quarter. The full strategic picture is in the [Small Business SEO Playbook](/blog/small-business-seo-playbook).
$md$)
  on conflict (organization_id, slug) do nothing;

  raise notice 'Content batch 1 inserted.';
end $$;
