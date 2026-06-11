"use client";

import { useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  DeliverableStatus,
  DeliverableType,
} from "@/lib/database.types";
import {
  DELIVERABLE_STATUSES,
  DELIVERABLE_STATUS_LABELS,
  DELIVERABLE_TYPES,
  DELIVERABLE_TYPE_LABELS,
} from "@/lib/domain";

const ALL = "all";

export function DeliverablesFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === ALL) {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    router.push(`/deliverables?${params.toString()}`);
  }

  const hasFilters = searchParams.has("status") || searchParams.has("type");

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Select
        value={searchParams.get("status") ?? ALL}
        onValueChange={(value: string) => setParam("status", value)}
      >
        <SelectTrigger className="w-40">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All statuses</SelectItem>
          {DELIVERABLE_STATUSES.map((status: DeliverableStatus) => (
            <SelectItem key={status} value={status}>
              {DELIVERABLE_STATUS_LABELS[status]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={searchParams.get("type") ?? ALL}
        onValueChange={(value: string) => setParam("type", value)}
      >
        <SelectTrigger className="w-44">
          <SelectValue placeholder="Type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All types</SelectItem>
          {DELIVERABLE_TYPES.map((type: DeliverableType) => (
            <SelectItem key={type} value={type}>
              {DELIVERABLE_TYPE_LABELS[type]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasFilters ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/deliverables")}
        >
          Clear
        </Button>
      ) : null}
    </div>
  );
}
