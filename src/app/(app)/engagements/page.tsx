import { ModulePlaceholder } from "@/components/shell/module-placeholder";

export const metadata = { title: "Engagements" };

export default function EngagementsPage() {
  return (
    <ModulePlaceholder
      title="Engagements"
      description="The central unit of work: a client × service with status, budget, metrics, deliverables and invoices."
      phase="Phase B"
    />
  );
}
