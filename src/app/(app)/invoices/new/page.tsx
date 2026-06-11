import { getOrgContext } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import { InvoiceForm } from "../invoice-form";

export const metadata = { title: "New invoice" };

interface NewInvoicePageProps {
  searchParams: Promise<{
    engagement?: string;
    direction?: string;
    client?: string;
    amount?: string;
    description?: string;
  }>;
}

export default async function NewInvoicePage({
  searchParams,
}: NewInvoicePageProps) {
  const { engagement, direction, client, amount, description } =
    await searchParams;
  const { org } = await getOrgContext();
  const supabase = await createClient();

  const [{ data: clients }, { data: engagements }] = await Promise.all([
    supabase
      .from("clients")
      .select("id, name, default_currency")
      .eq("organization_id", org.id)
      .order("name"),
    supabase
      .from("engagements")
      .select("id, name, client_id")
      .eq("organization_id", org.id)
      .order("created_at", { ascending: false }),
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">New invoice</h1>
      <InvoiceForm
        orgId={org.id}
        clients={clients ?? []}
        engagements={engagements ?? []}
        preselectedEngagementId={engagement}
        prefill={{ direction, clientId: client, amount, description }}
      />
    </div>
  );
}
