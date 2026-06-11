import { getOrgContext } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import { ServicesManager } from "./services-manager";

export const metadata = { title: "Services" };

export default async function ServicesPage() {
  const { org } = await getOrgContext();
  const supabase = await createClient();

  const { data: services } = await supabase
    .from("services")
    .select("*")
    .eq("organization_id", org.id)
    .order("sort_order", { ascending: true });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Services</h1>
        <p className="text-sm text-muted-foreground">
          Your service catalog. Deactivated services stay on existing
          engagements but can&apos;t be picked for new ones.
        </p>
      </div>
      <ServicesManager orgId={org.id} services={services ?? []} />
    </div>
  );
}
