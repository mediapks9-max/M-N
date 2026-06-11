import { getOrgContext } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import { ClientsManager } from "./clients-manager";

export const metadata = { title: "Clients" };

export default async function ClientsPage() {
  const { org } = await getOrgContext();
  const supabase = await createClient();

  const { data: clients } = await supabase
    .from("clients")
    .select("*")
    .eq("organization_id", org.id)
    .order("name", { ascending: true });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Clients</h1>
        <p className="text-sm text-muted-foreground">
          Clients and suppliers — invoices and engagements link back here.
        </p>
      </div>
      <ClientsManager orgId={org.id} clients={clients ?? []} />
    </div>
  );
}
