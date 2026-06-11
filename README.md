# CampaignDesk

Multi-tenant SaaS for marketing agencies and freelancers: service engagements,
deliverables, SEO articles, invoices and reports.

**Stack:** Next.js 15 (App Router) · TypeScript (strict) · Tailwind CSS v4 ·
shadcn/ui (new-york, neutral) · Supabase (Auth + Postgres + RLS) · Vercel.

## Status

- **Phase A — foundation (this code):** auth, organizations, memberships,
  invites, row-level security, app shell, settings.
- **Phase B — business modules:** services, clients, engagements, metrics,
  deliverables, SEO articles, invoices.
- **Phase C — command center:** dashboard, reports, activity feed.

## Setup

### 1. Create a Supabase project

Create a project at [supabase.com](https://supabase.com), then run the
migrations from `supabase/migrations/` in the SQL editor, **in filename
order** (currently just `0001_foundation.sql`).

### 2. Configure Supabase Auth

In the Supabase dashboard:

1. **Authentication → Providers → Email**: keep Email enabled.
   - *Recommended for development:* turn **off** "Confirm email" so signup
     logs you in immediately. With confirmation **on**, the app still works —
     users get a "check your email" screen and land in onboarding after
     clicking the link.
2. **Authentication → URL Configuration**:
   - Site URL: your deployment URL (e.g. `https://yourapp.vercel.app`), or
     `http://localhost:3000` for local dev.
   - Add `http://localhost:3000/**` (and your production URL + `/**`) to
     **Redirect URLs**.

No storage buckets are needed for Phase A.

### 3. Environment variables

```bash
cp .env.local.example .env.local
# fill in NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
```

Set the same variables in Vercel project settings when deploying.

### 4. Run

```bash
npm install
npm run dev
```

## Multi-tenancy model

- `organizations` ← `memberships` (owner / admin / member) → `profiles`
  (1:1 with `auth.users`, created by trigger).
- Every business table carries `organization_id`; RLS policies built on
  `is_org_member()` / `is_org_admin()` (SECURITY DEFINER helpers) ensure users
  only ever see rows of organizations they belong to.
- Organizations are created through the `create_organization()` RPC
  (atomic org + owner membership); invites are accepted through
  `accept_invite()` and shared as `/invite/[token]` links.
- `activity_log` is append-only and written explicitly by the
  `logActivity()` helper from every mutation (no DB triggers).
