import { ModulePlaceholder } from "@/components/shell/module-placeholder";

export const metadata = { title: "Invoices" };

export default function InvoicesPage() {
  return (
    <ModulePlaceholder
      title="Invoices"
      description="Outbound and inbound invoices with line items, statuses and PDF export."
      phase="Phase B"
    />
  );
}
