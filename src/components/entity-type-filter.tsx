"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ALL_ENTITY_TYPES, ENTITY_TYPE_LABELS } from "@/lib/activity-display";
import type { ActivityEntityType } from "@/lib/database.types";

const ALL = "all";

/** Entity-type dropdown that writes ?type= to the current route. */
export function EntityTypeFilter() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function handleChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === ALL) {
      params.delete("type");
    } else {
      params.set("type", value);
    }
    params.delete("page");
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  return (
    <Select value={searchParams.get("type") ?? ALL} onValueChange={handleChange}>
      <SelectTrigger className="h-8 w-40">
        <SelectValue placeholder="All types" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>All types</SelectItem>
        {ALL_ENTITY_TYPES.map((type: ActivityEntityType) => (
          <SelectItem key={type} value={type}>
            {ENTITY_TYPE_LABELS[type]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
