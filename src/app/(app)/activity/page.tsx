import { ModulePlaceholder } from "@/components/shell/module-placeholder";

export const metadata = { title: "Activity" };

export default function ActivityPage() {
  return (
    <ModulePlaceholder
      title="Activity"
      description="The full paginated activity log across all modules. Logging is already wired into the foundation."
      phase="Phase C"
    />
  );
}
