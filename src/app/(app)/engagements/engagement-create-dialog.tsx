"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import type { EngagementStatus, PricingModel } from "@/lib/database.types";
import {
  CURRENCIES,
  ENGAGEMENT_STATUSES,
  PRICING_MODELS,
  PRICING_MODEL_LABELS,
} from "@/lib/domain";
import {
  createEngagementAction,
  type EngagementCreateInput,
} from "./actions";

export interface SelectOption {
  id: string;
  name: string;
}

interface EngagementCreateDialogProps {
  orgId: string;
  clients: SelectOption[];
  services: SelectOption[];
}

const EMPTY_FORM = {
  client_id: "",
  service_id: "",
  name: "",
  status: "proposal" as EngagementStatus,
  start_date: "",
  end_date: "",
  budget_amount: "",
  budget_currency: "USD",
  pricing_model: "fixed" as PricingModel,
  unit_rate: "",
  rev_share_percent: "",
  notes: "",
};

export function EngagementCreateDialog({
  orgId,
  clients,
  services,
}: EngagementCreateDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input: EngagementCreateInput = {
      client_id: form.client_id,
      service_id: form.service_id,
      name: form.name,
      status: form.status,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      budget_amount: form.budget_amount
        ? Number.parseFloat(form.budget_amount)
        : null,
      budget_currency: form.budget_currency,
      pricing_model: form.pricing_model,
      unit_rate: form.unit_rate ? Number.parseFloat(form.unit_rate) : null,
      rev_share_percent: form.rev_share_percent
        ? Number.parseFloat(form.rev_share_percent)
        : null,
      notes: form.notes,
    };
    startTransition(async () => {
      const result = await createEngagementAction(orgId, input);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Engagement created.");
        setOpen(false);
        setForm(EMPTY_FORM);
        router.refresh();
      }
    });
  }

  return (
    <>
      <Button onClick={() => setOpen(true)} disabled={clients.length === 0}>
        <Plus className="h-4 w-4" />
        New engagement
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>New engagement</DialogTitle>
            <DialogDescription>
              A unit of work for a client within one of your services.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="engName">Name</Label>
              <Input
                id="engName"
                required
                placeholder="e.g. ACME — SEO retainer 2026"
                value={form.name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setForm({ ...form, name: e.target.value })
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Client</Label>
                <Select
                  value={form.client_id}
                  onValueChange={(value: string) =>
                    setForm({ ...form, client_id: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pick a client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client: SelectOption) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Service</Label>
                <Select
                  value={form.service_id}
                  onValueChange={(value: string) =>
                    setForm({ ...form, service_id: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pick a service" />
                  </SelectTrigger>
                  <SelectContent>
                    {services.map((service: SelectOption) => (
                      <SelectItem key={service.id} value={service.id}>
                        {service.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(value: string) =>
                    setForm({ ...form, status: value as EngagementStatus })
                  }
                >
                  <SelectTrigger className="capitalize">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ENGAGEMENT_STATUSES.map((status: EngagementStatus) => (
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
              <div className="space-y-2">
                <Label htmlFor="engStart">Start date</Label>
                <Input
                  id="engStart"
                  type="date"
                  value={form.start_date}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setForm({ ...form, start_date: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="engEnd">End date</Label>
                <Input
                  id="engEnd"
                  type="date"
                  value={form.end_date}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setForm({ ...form, end_date: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="engBudget">Budget</Label>
                <Input
                  id="engBudget"
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.budget_amount}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setForm({ ...form, budget_amount: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Currency</Label>
                <Select
                  value={form.budget_currency}
                  onValueChange={(value: string) =>
                    setForm({ ...form, budget_currency: value })
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
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Pricing model</Label>
                <Select
                  value={form.pricing_model}
                  onValueChange={(value: string) =>
                    setForm({ ...form, pricing_model: value as PricingModel })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRICING_MODELS.map((model: PricingModel) => (
                      <SelectItem key={model} value={model}>
                        {PRICING_MODEL_LABELS[model]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {form.pricing_model === "rev_share" ? (
                <div className="space-y-2">
                  <Label htmlFor="engRevShare">Revenue share %</Label>
                  <Input
                    id="engRevShare"
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    placeholder="e.g. 20"
                    value={form.rev_share_percent}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setForm({ ...form, rev_share_percent: e.target.value })
                    }
                  />
                </div>
              ) : null}
              {form.pricing_model === "cpl" ||
              form.pricing_model === "cpa" ||
              form.pricing_model === "cpc" ? (
                <div className="space-y-2">
                  <Label htmlFor="engRate">
                    Rate per{" "}
                    {form.pricing_model === "cpl"
                      ? "lead"
                      : form.pricing_model === "cpa"
                        ? "acquisition"
                        : "click"}
                  </Label>
                  <Input
                    id="engRate"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="e.g. 100"
                    value={form.unit_rate}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setForm({ ...form, unit_rate: e.target.value })
                    }
                  />
                </div>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="engNotes">Notes</Label>
              <Textarea
                id="engNotes"
                rows={2}
                value={form.notes}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setForm({ ...form, notes: e.target.value })
                }
              />
            </div>
            <DialogFooter>
              <Button
                type="submit"
                disabled={isPending || !form.client_id || !form.service_id}
              >
                {isPending ? "Creating…" : "Create engagement"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
