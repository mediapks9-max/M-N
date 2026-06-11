import Link from "next/link";
import { Suspense } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { ActivityList } from "@/components/activity-list";
import { EntityTypeFilter } from "@/components/entity-type-filter";
import { Button } from "@/components/ui/button";
import {
  ALL_ENTITY_TYPES,
  type ActivityWithActor,
} from "@/lib/activity-display";
import type { ActivityEntityType } from "@/lib/database.types";
import { getOrgContext } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Activity" };

const PAGE_SIZE = 25;

interface ActivityPageProps {
  searchParams: Promise<{ type?: string; page?: string }>;
}

export default async function ActivityPage({
  searchParams,
}: ActivityPageProps) {
  const params = await searchParams;
  const { org } = await getOrgContext();
  const supabase = await createClient();

  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);
  const from = (page - 1) * PAGE_SIZE;

  let query = supabase
    .from("activity_log")
    .select("*, actor:profiles(full_name, email)", { count: "exact" })
    .eq("organization_id", org.id)
    .order("created_at", { ascending: false })
    .range(from, from + PAGE_SIZE - 1);

  if (params.type && (ALL_ENTITY_TYPES as string[]).includes(params.type)) {
    query = query.eq("entity_type", params.type as ActivityEntityType);
  }

  const { data: rows, count } = await query;
  const entries = (rows ?? []) as unknown as ActivityWithActor[];
  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function pageHref(target: number): string {
    const qs = new URLSearchParams();
    if (params.type) qs.set("type", params.type);
    if (target > 1) qs.set("page", String(target));
    const str = qs.toString();
    return str ? `/activity?${str}` : "/activity";
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Activity</h1>
          <p className="text-sm text-muted-foreground">
            Everything that happened in {org.name} — {total.toLocaleString()}{" "}
            event{total === 1 ? "" : "s"}.
          </p>
        </div>
        <Suspense>
          <EntityTypeFilter />
        </Suspense>
      </div>

      <ActivityList entries={entries} />

      {totalPages > 1 ? (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} asChild={page > 1}>
              {page > 1 ? (
                <Link href={pageHref(page - 1)}>
                  <ChevronLeft className="h-4 w-4" /> Previous
                </Link>
              ) : (
                <span className="inline-flex items-center gap-1">
                  <ChevronLeft className="h-4 w-4" /> Previous
                </span>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              asChild={page < totalPages}
            >
              {page < totalPages ? (
                <Link href={pageHref(page + 1)}>
                  Next <ChevronRight className="h-4 w-4" />
                </Link>
              ) : (
                <span className="inline-flex items-center gap-1">
                  Next <ChevronRight className="h-4 w-4" />
                </span>
              )}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
