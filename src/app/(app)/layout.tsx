import { NavLinks } from "@/components/shell/nav-links";
import { OrgSwitcher } from "@/components/shell/org-switcher";
import { UserMenu } from "@/components/shell/user-menu";
import { Separator } from "@/components/ui/separator";
import { branding } from "@/lib/branding";
import { getOrgContext, type OrgMembership } from "@/lib/org";

export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const { user, profile, memberships, org } = await getOrgContext();

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-60 shrink-0 flex-col border-r bg-sidebar md:flex">
        <div className="px-4 py-4 text-sm font-semibold tracking-tight text-muted-foreground">
          {branding.productName}
        </div>
        <Separator />
        <OrgSwitcher
          currentOrg={{ id: org.id, name: org.name }}
          organizations={memberships.map((m: OrgMembership) => ({
            id: m.organization.id,
            name: m.organization.name,
          }))}
        />
        <Separator className="mb-2" />
        <NavLinks />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b px-6">
          <span className="text-sm font-medium text-muted-foreground md:hidden">
            {org.name}
          </span>
          <div className="ml-auto">
            <UserMenu
              fullName={profile?.full_name ?? ""}
              email={profile?.email ?? user.email ?? ""}
            />
          </div>
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
