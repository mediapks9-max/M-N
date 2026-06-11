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
import { ENGAGEMENT_STATUSES } from "@/lib/domain";
import type { EngagementStatus } from "@/lib/database.types";

export interface FilterOption {
  id: string;
  name: string;
}

interface EngagementFiltersProps {
  services: FilterOption[];
  clients: FilterOption[];
}

const ALL = "all";

export function EngagementFilters({
  services,
  clients,
}: EngagementFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === ALL) {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    router.push(`/engagements?${params.toString()}`);
  }

  const hasFilters =
    searchParams.has("service") ||
    searchParams.has("client") ||
    searchParams.has("status");

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Select
        value={searchParams.get("service") ?? ALL}
        onValueChange={(value: string) => setParam("service", value)}
      >
        <SelectTrigger className="w-44">
          <SelectValue placeholder="Service" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All services</SelectItem>
          {services.map((service: FilterOption) => (
            <SelectItem key={service.id} value={service.id}>
              {service.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={searchParams.get("client") ?? ALL}
        onValueChange={(value: string) => setParam("client", value)}
      >
        <SelectTrigger className="w-44">
          <SelectValue placeholder="Client" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All clients</SelectItem>
          {clients.map((client: FilterOption) => (
            <SelectItem key={client.id} value={client.id}>
              {client.name}
            </SelectItem>
          ))}
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
          {ENGAGEMENT_STATUSES.map((status: EngagementStatus) => (
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
          onClick={() => router.push("/engagements")}
        >
          Clear
        </Button>
      ) : null}
    </div>
  );
}
