import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Placement, PlacementStat } from "@/lib/database.types";
import { formatCurrency, formatNumber } from "@/lib/format";
import { getOrgContext } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import {
  DeletePlacementButton,
  PlacementsToolbar,
} from "./placements-manager";

export const metadata = { title: "Placements" };

const WINDOW_DAYS = 30;

type PlacementRow = Placement & {
  supplier: { name: string } | null;
};

export default async function PlacementsPage() {
  const { org } = await getOrgContext();
  const supabase = await createClient();

  const since = new Date(Date.now() - WINDOW_DAYS * 86_400_000)
    .toISOString()
    .slice(0, 10);

  const [{ data: placementRows }, { data: statRows }, { data: supplierRows }] =
    await Promise.all([
      supabase
        .from("placements")
        .select("*, supplier:clients(name)")
        .eq("organization_id", org.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("placement_stats")
        .select("*")
        .eq("organization_id", org.id)
        .gte("date", since),
      supabase
        .from("clients")
        .select("id, name, type")
        .eq("organization_id", org.id)
        .in("type", ["supplier", "both"])
        .order("name"),
    ]);

  const placements = (placementRows ?? []) as unknown as PlacementRow[];
  const stats = (statRows ?? []) as PlacementStat[];

  // placement -> network -> totals (the network-competition view)
  const byPlacement = new Map<string, Map<string, { revenue: number; impressions: number; clicks: number }>>();
  const networks = new Set<string>();
  for (const stat of stats) {
    networks.add(stat.network);
    const perNetwork = byPlacement.get(stat.placement_id) ?? new Map();
    const entry = perNetwork.get(stat.network) ?? {
      revenue: 0,
      impressions: 0,
      clicks: 0,
    };
    entry.revenue += stat.revenue;
    entry.impressions += stat.impressions;
    entry.clicks += stat.clicks;
    perNetwork.set(stat.network, entry);
    byPlacement.set(stat.placement_id, perNetwork);
  }
  const networkList = [...networks].sort();
  const totalRevenue = stats.reduce(
    (sum: number, stat: PlacementStat) => sum + stat.revenue,
    0
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Placements</h1>
          <p className="text-sm text-muted-foreground">
            Publisher ad inventory and how each network monetizes it (last{" "}
            {WINDOW_DAYS} days). The best-earning network per placement is
            highlighted.
          </p>
        </div>
        <PlacementsToolbar
          orgId={org.id}
          suppliers={(supplierRows ?? []).map(
            (supplier: { id: string; name: string }) => ({
              id: supplier.id,
              name: supplier.name,
            })
          )}
          placements={placements.map((placement: PlacementRow) => ({
            id: placement.id,
            name: placement.name,
          }))}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <p className="text-xs text-muted-foreground">
            Publisher revenue ({WINDOW_DAYS}d)
          </p>
          <p className="text-xl font-bold">
            {formatCurrency(totalRevenue, "USD")}
          </p>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <p className="text-xs text-muted-foreground">Active placements</p>
          <p className="text-xl font-bold">
            {placements.filter((p: PlacementRow) => p.status === "active").length}
          </p>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <p className="text-xs text-muted-foreground">Networks competing</p>
          <p className="text-xl font-bold">{networkList.length}</p>
        </div>
      </div>

      {placements.length === 0 ? (
        <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          No placements yet. Add a supplier&apos;s ad slot, then log daily
          revenue per network to compare who pays best.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Placement</TableHead>
              <TableHead>Publisher</TableHead>
              <TableHead>Format</TableHead>
              {networkList.map((network: string) => (
                <TableHead key={network} className="text-right">
                  {network}
                </TableHead>
              ))}
              <TableHead className="text-right">Total ({WINDOW_DAYS}d)</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {placements.map((placement: PlacementRow) => {
              const perNetwork = byPlacement.get(placement.id);
              const rowTotal = [...(perNetwork?.values() ?? [])].reduce(
                (sum: number, entry: { revenue: number }) => sum + entry.revenue,
                0
              );
              const best = perNetwork
                ? [...perNetwork.entries()].sort(
                    (a, b) => b[1].revenue - a[1].revenue
                  )[0]?.[0]
                : undefined;
              return (
                <TableRow key={placement.id}>
                  <TableCell className="font-medium">
                    {placement.name}
                    {placement.status === "paused" ? (
                      <span className="ml-2 text-xs text-muted-foreground">
                        (paused)
                      </span>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {placement.supplier?.name ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {placement.ad_format || "—"}
                  </TableCell>
                  {networkList.map((network: string) => {
                    const entry = perNetwork?.get(network);
                    return (
                      <TableCell
                        key={network}
                        className={cn(
                          "text-right",
                          network === best &&
                            rowTotal > 0 &&
                            "font-semibold text-emerald-700"
                        )}
                        title={
                          entry
                            ? `${formatNumber(entry.impressions)} impressions · ${formatNumber(entry.clicks)} clicks`
                            : undefined
                        }
                      >
                        {entry ? formatCurrency(entry.revenue, "USD") : "—"}
                      </TableCell>
                    );
                  })}
                  <TableCell className="text-right font-medium">
                    {formatCurrency(rowTotal, "USD")}
                  </TableCell>
                  <TableCell>
                    <DeletePlacementButton
                      orgId={org.id}
                      placementId={placement.id}
                      name={placement.name}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
