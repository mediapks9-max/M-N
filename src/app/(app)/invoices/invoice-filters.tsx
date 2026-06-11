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
import type { InvoiceStatus } from "@/lib/database.types";
import { INVOICE_STATUSES } from "@/lib/domain";

const ALL = "all";

export function InvoiceFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === ALL) {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    router.push(`/invoices?${params.toString()}`);
  }

  const hasFilters =
    searchParams.has("direction") || searchParams.has("status");

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Select
        value={searchParams.get("direction") ?? ALL}
        onValueChange={(value: string) => setParam("direction", value)}
      >
        <SelectTrigger className="w-40">
          <SelectValue placeholder="Direction" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All directions</SelectItem>
          <SelectItem value="outbound">Outbound</SelectItem>
          <SelectItem value="inbound">Inbound</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={searchParams.get("status") ?? ALL}
        onValueChange={(value: string) => setParam("status", value)}
      >
        <SelectTrigger className="w-40">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All statuses</SelectItem>
          {INVOICE_STATUSES.map((status: InvoiceStatus) => (
            <SelectItem key={status} value={status} className="capitalize">
              {status}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasFilters ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/invoices")}
        >
          Clear
        </Button>
      ) : null}
    </div>
  );
}
