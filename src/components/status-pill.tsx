import { cn } from "@/lib/utils";

interface StatusPillProps {
  label: string;
  className: string;
}

export function StatusPill({ label, className }: StatusPillProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium capitalize",
        className
      )}
    >
      {label}
    </span>
  );
}
