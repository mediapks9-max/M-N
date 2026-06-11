-- ============================================================
-- CampaignDesk — Phase A foundation
-- Multi-tenancy core: organizations, profiles, memberships,
-- invites, activity_log + RLS + helper functions.
-- Paste into the Supabase SQL editor and run as a single script.
-- ============================================================

create extension if not exists pgcrypto;

-- ------------------------------------------------------------
-- Tables
-- ------------------------------------------------------------

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  plan text not null default 'free',
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  email text not null default '',
  created_at timestamptz not null default now()
);

create table public.memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'member')),
  created_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

create index memberships_user_id_idx on public.memberships (user_id);
create index memberships_organization_id_idx on public.memberships (organization_id);

create table public.invites (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  email text not null,
  role text not null default 'member' check (role in ('admin', 'member')),
  token uuid not null unique default gen_random_uuid(),
  invited_by uuid references public.profiles (id) on delete set null,
  expires_at timestamptz not null default now() + interval '14 days',
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

create index invites_organization_id_idx on public.invites (organization_id);

create table public.activity_log (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  actor_user_id uuid references public.profiles (id) on delete set null,
  entity_type text not null check (
    entity_type in ('client', 'engagement', 'deliverable', 'invoice', 'article', 'metric', 'member', 'service')
  ),
  entity_id uuid,
  entity_label text not null default '',
  action text not null check (
    action in ('created', 'updated', 'status_changed', 'paid', 'published', 'delivered', 'deleted', 'invited')
  ),
  details jsonb,
  created_at timestamptz not null default now()
);

create index activity_log_org_created_idx on public.activity_log (organization_id, created_at desc);

-- ------------------------------------------------------------
-- Helper functions (SECURITY DEFINER so RLS policies can read
-- memberships without infinite recursion)
-- ------------------------------------------------------------

create or replace function public.is_org_member(org uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.memberships m
    where m.organization_id = org and m.user_id = auth.uid()
  );
$$;

create or replace function public.org_role(org uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select m.role from public.memberships m
  where m.organization_id = org and m.user_id = auth.uid();
$$;

create or replace function public.is_org_admin(org uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.memberships m
    where m.organization_id = org
      and m.user_id = auth.uid()
      and m.role in ('owner', 'admin')
  );
$$;

-- True when the current user shares at least one organization
-- with the target profile (used to show teammate names).
create or replace function public.shares_org(target uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.memberships a
    join public.memberships b on a.organization_id = b.organization_id
    where a.user_id = auth.uid() and b.user_id = target
  );
$$;

revoke execute on function public.is_org_member(uuid) from public, anon;
revoke execute on function public.org_role(uuid) from public, anon;
revoke execute on function public.is_org_admin(uuid) from public, anon;
revoke execute on function public.shares_org(uuid) from public, anon;
grant execute on function public.is_org_member(uuid) to authenticated;
grant execute on function public.org_role(uuid) to authenticated;
grant execute on function public.is_org_admin(uuid) to authenticated;
grant execute on function public.shares_org(uuid) to authenticated;

-- ------------------------------------------------------------
-- Profile bootstrap: create a profile row for every new auth user
-- ------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.email, '')
  )
  on conflict (id) do update
    set email = excluded.email;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ------------------------------------------------------------
-- Org creation (atomic: organization + owner membership).
-- SECURITY DEFINER sidesteps the chicken-and-egg problem of
-- inserting into organizations before any membership exists.
-- Phase B will extend this to seed the default service catalog.
-- ------------------------------------------------------------

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

  return new_org_id;
end;
$$;

revoke execute on function public.create_organization(text) from public, anon;
grant execute on function public.create_organization(text) to authenticated;

-- ------------------------------------------------------------
-- Invite acceptance
-- ------------------------------------------------------------

-- Public lookup so the /invite/[token] page can render before login.
-- Exposes only what the invitee needs to see; never the token list.
create or replace function public.get_invite_details(invite_token uuid)
returns table (
  organization_name text,
  email text,
  role text,
  is_expired boolean,
  is_accepted boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    o.name,
    i.email,
    i.role,
    i.expires_at < now(),
    i.accepted_at is not null
  from public.invites i
  join public.organizations o on o.id = i.organization_id
  where i.token = invite_token;
$$;

grant execute on function public.get_invite_details(uuid) to anon, authenticated;

create or replace function public.accept_invite(invite_token uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  inv record;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select * into inv from public.invites where token = invite_token;
  if not found then
    raise exception 'Invite not found';
  end if;
  if inv.accepted_at is not null then
    raise exception 'Invite has already been accepted';
  end if;
  if inv.expires_at < now() then
    raise exception 'Invite has expired';
  end if;

  insert into public.memberships (organization_id, user_id, role)
  values (inv.organization_id, auth.uid(), inv.role)
  on conflict (organization_id, user_id) do nothing;

  update public.invites set accepted_at = now() where id = inv.id;

  return inv.organization_id;
end;
$$;

revoke execute on function public.accept_invite(uuid) from public, anon;
grant execute on function public.accept_invite(uuid) to authenticated;

-- ------------------------------------------------------------
-- Safety: never allow an org to lose its last owner
-- ------------------------------------------------------------

create or replace function public.protect_last_owner()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.role = 'owner'
     and (tg_op = 'DELETE' or new.role <> 'owner')
     and not exists (
       select 1 from public.memberships m
       where m.organization_id = old.organization_id
         and m.role = 'owner'
         and m.id <> old.id
     )
  then
    raise exception 'An organization must keep at least one owner';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create trigger memberships_protect_last_owner
  before delete or update of role on public.memberships
  for each row execute function public.protect_last_owner();

-- ------------------------------------------------------------
-- Row Level Security
-- ------------------------------------------------------------

alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.memberships enable row level security;
alter table public.invites enable row level security;
alter table public.activity_log enable row level security;

-- organizations: members read; admins update; owners delete.
-- No direct insert — orgs are created via create_organization().
create policy "organizations_select_member" on public.organizations
  for select to authenticated
  using (public.is_org_member(id));

create policy "organizations_update_admin" on public.organizations
  for update to authenticated
  using (public.is_org_admin(id))
  with check (public.is_org_admin(id));

create policy "organizations_delete_owner" on public.organizations
  for delete to authenticated
  using (public.org_role(id) = 'owner');

-- profiles: read own profile and teammates' profiles; write own only.
create policy "profiles_select_own_or_teammate" on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.shares_org(id));

create policy "profiles_insert_own" on public.profiles
  for insert to authenticated
  with check (id = auth.uid());

create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- memberships: members read their orgs' rosters; admins manage;
-- anyone may remove themselves (leave). Admins cannot touch owners
-- unless they are an owner themselves.
create policy "memberships_select_member" on public.memberships
  for select to authenticated
  using (public.is_org_member(organization_id));

create policy "memberships_insert_admin" on public.memberships
  for insert to authenticated
  with check (
    public.is_org_admin(organization_id)
    and (role <> 'owner' or public.org_role(organization_id) = 'owner')
  );

create policy "memberships_update_admin" on public.memberships
  for update to authenticated
  using (
    public.is_org_admin(organization_id)
    and (role <> 'owner' or public.org_role(organization_id) = 'owner')
  )
  with check (
    public.is_org_admin(organization_id)
    and (role <> 'owner' or public.org_role(organization_id) = 'owner')
  );

create policy "memberships_delete_admin_or_self" on public.memberships
  for delete to authenticated
  using (
    user_id = auth.uid()
    or (
      public.is_org_admin(organization_id)
      and (role <> 'owner' or public.org_role(organization_id) = 'owner')
    )
  );

-- invites: admins only. Invitees interact through the
-- get_invite_details / accept_invite functions instead.
create policy "invites_select_admin" on public.invites
  for select to authenticated
  using (public.is_org_admin(organization_id));

create policy "invites_insert_admin" on public.invites
  for insert to authenticated
  with check (public.is_org_admin(organization_id));

create policy "invites_delete_admin" on public.invites
  for delete to authenticated
  using (public.is_org_admin(organization_id));

-- activity_log: members read; members append rows as themselves.
-- Immutable: no update/delete policies.
create policy "activity_log_select_member" on public.activity_log
  for select to authenticated
  using (public.is_org_member(organization_id));

create policy "activity_log_insert_member" on public.activity_log
  for insert to authenticated
  with check (
    public.is_org_member(organization_id)
    and actor_user_id = auth.uid()
  );
