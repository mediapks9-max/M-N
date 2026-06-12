"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createPlacementAction,
  deletePlacementAction,
  upsertPlacementStatAction,
} from "./actions";

export interface SupplierOption {
  id: string;
  name: string;
}

interface PlacementsToolbarProps {
  orgId: string;
  suppliers: SupplierOption[];
  /** Placements for the daily-revenue entry form. */
  placements: { id: string; name: string }[];
}

export function PlacementsToolbar({
  orgId,
  suppliers,
  placements,
}: PlacementsToolbarProps) {
  const [createOpen, setCreateOpen] = useState(false);
  const [statOpen, setStatOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [supplierId, setSupplierId] = useState("");
  const [name, setName] = useState("");
  const [adFormat, setAdFormat] = useState("");

  const [stat, setStat] = useState({
    placement_id: "",
    network: "",
    date: new Date().toISOString().slice(0, 10),
    impressions: "",
    clicks: "",
    revenue: "",
  });

  function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startTransition(async () => {
      const result = await createPlacementAction(
        orgId,
        supplierId,
        name,
        adFormat
      );
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Placement created.");
        setCreateOpen(false);
        setName("");
        setAdFormat("");
      }
    });
  }

  function handleStat(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startTransition(async () => {
      const result = await upsertPlacementStatAction(
        orgId,
        stat.placement_id,
        {
          network: stat.network,
          date: stat.date,
          impressions: Number.parseFloat(stat.impressions) || 0,
          clicks: Number.parseFloat(stat.clicks) || 0,
          revenue: Number.parseFloat(stat.revenue) || 0,
        }
      );
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Revenue recorded.");
        setStatOpen(false);
      }
    });
  }

  return (
    <div className="flex gap-2">
      <Button
        variant="outline"
        onClick={() => setStatOpen(true)}
        disabled={placements.length === 0}
      >
        <Plus className="h-4 w-4" />
        Log revenue
      </Button>
      <Button onClick={() => setCreateOpen(true)} disabled={suppliers.length === 0}>
        <Plus className="h-4 w-4" />
        New placement
      </Button>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New placement</DialogTitle>
            <DialogDescription>
              An ad slot on a publisher&apos;s site that earns revenue from ad
              networks.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label>Publisher (supplier)</Label>
              <Select value={supplierId} onValueChange={setSupplierId}>
                <SelectTrigger>
                  <SelectValue placeholder="Pick a supplier" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map((supplier: SupplierOption) => (
                    <SelectItem key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Only clients marked as supplier appear here.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pName">Placement name</Label>
              <Input
                id="pName"
                required
                placeholder="e.g. Homepage — sidebar 300×600"
                value={name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setName(e.target.value)
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pFormat">Ad format</Label>
              <Input
                id="pFormat"
                placeholder="e.g. display, native, video"
                value={adFormat}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setAdFormat(e.target.value)
                }
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={isPending || !supplierId}>
                {isPending ? "Creating…" : "Create placement"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={statOpen} onOpenChange={setStatOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log daily revenue</DialogTitle>
            <DialogDescription>
              One row per placement × network × day. Re-logging the same
              combination updates it.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleStat} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Placement</Label>
                <Select
                  value={stat.placement_id}
                  onValueChange={(value: string) =>
                    setStat({ ...stat, placement_id: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pick a placement" />
                  </SelectTrigger>
                  <SelectContent>
                    {placements.map(
                      (placement: { id: string; name: string }) => (
                        <SelectItem key={placement.id} value={placement.id}>
                          {placement.name}
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="psNetwork">Ad network</Label>
                <Input
                  id="psNetwork"
                  required
                  placeholder="e.g. AdSense, Taboola, Ezoic"
                  value={stat.network}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setStat({ ...stat, network: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-4">
              <div className="space-y-2">
                <Label htmlFor="psDate">Date</Label>
                <Input
                  id="psDate"
                  type="date"
                  required
                  value={stat.date}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setStat({ ...stat, date: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="psImpr">Impressions</Label>
                <Input
                  id="psImpr"
                  type="number"
                  step="any"
                  min="0"
                  value={stat.impressions}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setStat({ ...stat, impressions: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="psClicks">Clicks</Label>
                <Input
                  id="psClicks"
                  type="number"
                  step="any"
                  min="0"
                  value={stat.clicks}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setStat({ ...stat, clicks: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="psRev">Revenue</Label>
                <Input
                  id="psRev"
                  type="number"
                  step="0.01"
                  min="0"
                  value={stat.revenue}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setStat({ ...stat, revenue: e.target.value })
                  }
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={isPending || !stat.placement_id}>
                {isPending ? "Saving…" : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function DeletePlacementButton({
  orgId,
  placementId,
  name,
}: {
  orgId: string;
  placementId: string;
  name: string;
}) {
  const [isPending, startTransition] = useTransition();
  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-8 w-8"
      disabled={isPending}
      onClick={() => {
        if (!window.confirm(`Delete placement "${name}" and its data?`)) return;
        startTransition(async () => {
          const result = await deletePlacementAction(orgId, placementId, name);
          if (result.error) {
            toast.error(result.error);
          }
        });
      }}
    >
      <Trash2 className="h-3.5 w-3.5" />
    </Button>
  );
}
