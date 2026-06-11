import { ModulePlaceholder } from "@/components/shell/module-placeholder";

export const metadata = { title: "Reports" };

export default function ReportsPage() {
  return (
    <ModulePlaceholder
      title="Reports"
      description="Month-by-month revenue, expenses and profit with breakdowns by client and service, plus CSV export."
      phase="Phase C"
    />
  );
}
