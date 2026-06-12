"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus } from "lucide-react";
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
import type {
  Campaign,
  CampaignChannel,
  CampaignStatus,
} from "@/lib/database.types";
import {
  CAMPAIGN_CHANNELS,
  CAMPAIGN_CHANNEL_LABELS,
  CAMPAIGN_STATUSES,
  CURRENCIES,
} from "@/lib/domain";
import {
  createCampaignAction,
  updateCampaignAction,
  type CampaignInput,
} from "./actions";

export interface EngagementOption {
  id: string;
  name: string;
  clientName: string;
}

interface CampaignDialogProps {
  orgId: string;
  engagements: EngagementOption[];
  /** When set, the dialog edits this campaign instead of creating. */
  campaign?: Campaign;
}

function num(value: string): number | null {
  return value ? Number.parseFloat(value) : null;
}

export function CampaignDialog({
  orgId,
  engagements,
  campaign,
}: CampaignDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [form, setForm] = useState({
    engagement_id: campaign?.engagement_id ?? "",
    name: campaign?.name ?? "",
    channel: (campaign?.channel ?? "google_ads") as CampaignChannel,
    network: campaign?.network ?? "",
    status: (campaign?.status ?? "active") as CampaignStatus,
    daily_budget: campaign?.daily_budget?.toString() ?? "",
    total_budget: campaign?.total_budget?.toString() ?? "",
    target_cpl: campaign?.target_cpl?.toString() ?? "",
    target_cpa: campaign?.target_cpa?.toString() ?? "",
    target_roas: campaign?.target_roas?.toString() ?? "",
    currency: campaign?.currency ?? "USD",
    start_date: campaign?.start_date ?? "",
    end_date: campaign?.end_date ?? "",
    notes: campaign?.notes ?? "",
  });

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input: CampaignInput = {
      engagement_id: form.engagement_id,
      name: form.name,
      channel: form.channel,
      network: form.network,
      status: form.status,
      daily_budget: num(form.daily_budget),
      total_budget: num(form.total_budget),
      target_cpl: num(form.target_cpl),
      target_cpa: num(form.target_cpa),
      target_roas: num(form.target_roas),
      currency: form.currency,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      notes: form.notes,
    };
    startTransition(async () => {
      const result = campaign
        ? await updateCampaignAction(orgId, campaign.id, input)
        : await createCampaignAction(orgId, input);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(campaign ? "Campaign updated." : "Campaign created.");
        setOpen(false);
        router.refresh();
      }
    });
  }

  return (
    <>
      {campaign ? (
        <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
          <Pencil className="h-3.5 w-3.5" />
          Edit campaign
        </Button>
      ) : (
        <Button onClick={() => setOpen(true)} disabled={engagements.length === 0}>
          <Plus className="h-4 w-4" />
          New campaign
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {campaign ? "Edit campaign" : "New campaign"}
            </DialogTitle>
            <DialogDescription>
              A running ad campaign — daily performance is logged against it.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="cName">Name</Label>
                <Input
                  id="cName"
                  required
                  placeholder="e.g. Search — brand keywords"
                  value={form.name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setForm({ ...form, name: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Engagement</Label>
                <Select
                  value={form.engagement_id}
                  onValueChange={(value: string) =>
                    setForm({ ...form, engagement_id: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pick an engagement" />
                  </SelectTrigger>
                  <SelectContent>
                    {engagements.map((engagement: EngagementOption) => (
                      <SelectItem key={engagement.id} value={engagement.id}>
                        {engagement.name} — {engagement.clientName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>Channel</Label>
                <Select
                  value={form.channel}
                  onValueChange={(value: string) =>
                    setForm({ ...form, channel: value as CampaignChannel })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CAMPAIGN_CHANNELS.map((channel: CampaignChannel) => (
                      <SelectItem key={channel} value={channel}>
                        {CAMPAIGN_CHANNEL_LABELS[channel]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="cNetwork">Network / account</Label>
                <Input
                  id="cNetwork"
                  placeholder="e.g. Taboola, MCC #2"
                  value={form.network}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setForm({ ...form, network: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(value: string) =>
                    setForm({ ...form, status: value as CampaignStatus })
                  }
                >
                  <SelectTrigger className="capitalize">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CAMPAIGN_STATUSES.map((status: CampaignStatus) => (
                      <SelectItem
                        key={status}
                        value={status}
                        className="capitalize"
                      >
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="cDaily">Daily budget</Label>
                <Input
                  id="cDaily"
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.daily_budget}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setForm({ ...form, daily_budget: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cTotal">Total budget</Label>
                <Input
                  id="cTotal"
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.total_budget}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setForm({ ...form, total_budget: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Currency</Label>
                <Select
                  value={form.currency}
                  onValueChange={(value: string) =>
                    setForm({ ...form, currency: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((currency: string) => (
                      <SelectItem key={currency} value={currency}>
                        {currency}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="cCpl">Target CPL</Label>
                <Input
                  id="cCpl"
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.target_cpl}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setForm({ ...form, target_cpl: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cCpa">Target CPA</Label>
                <Input
                  id="cCpa"
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.target_cpa}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setForm({ ...form, target_cpa: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cRoas">Target ROAS</Label>
                <Input
                  id="cRoas"
                  type="number"
                  step="0.1"
                  min="0"
                  placeholder="e.g. 2.0"
                  value={form.target_roas}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setForm({ ...form, target_roas: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="cStart">Start date</Label>
                <Input
                  id="cStart"
                  type="date"
                  value={form.start_date}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setForm({ ...form, start_date: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cEnd">End date</Label>
                <Input
                  id="cEnd"
                  type="date"
                  value={form.end_date}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setForm({ ...form, end_date: e.target.value })
                  }
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="submit"
                disabled={isPending || !form.engagement_id}
              >
                {isPending
                  ? "Saving…"
                  : campaign
                    ? "Save changes"
                    : "Create campaign"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
