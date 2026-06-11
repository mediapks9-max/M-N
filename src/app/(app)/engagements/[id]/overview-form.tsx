"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import type {
  Engagement,
  EngagementStatus,
  FinancialMode,
} from "@/lib/database.types";
import { CURRENCIES, ENGAGEMENT_STATUSES } from "@/lib/domain";
import {
  deleteEngagementAction,
  updateEngagementAction,
  type EngagementUpdateInput,
} from "../actions";

export interface SelectOption {
  id: string;
  name: string;
}

interface OverviewFormProps {
  orgId: string;
  engagement: Engagement;
  clients: SelectOption[];
  services: SelectOption[];
}

export function OverviewForm({
  orgId,
  engagement,
  clients,
  services,
}: OverviewFormProps) {
  const [form, setForm] = useState({
    client_id: engagement.client_id,
    service_id: engagement.service_id,
    name: engagement.name,
    status: engagement.status as EngagementStatus,
    start_date: engagement.start_date ?? "",
    end_date: engagement.end_date ?? "",
    budget_amount:
      engagement.budget_amount !== null
        ? String(engagement.budget_amount)
        : "",
    budget_currency: engagement.budget_currency,
    financial_mode: engagement.financial_mode as FinancialMode,
    manual_revenue:
      engagement.manual_revenue !== null
        ? String(engagement.manual_revenue)
        : "",
    manual_cost:
      engagement.manual_cost !== null ? String(engagement.manual_cost) : "",
    notes: engagement.notes,
  });
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input: EngagementUpdateInput = {
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
      financial_mode: form.financial_mode,
      manual_revenue: form.manual_revenue
        ? Number.parseFloat(form.manual_revenue)
        : null,
      manual_cost: form.manual_cost
        ? Number.parseFloat(form.manual_cost)
        : null,
      notes: form.notes,
    };
    startTransition(async () => {
      const result = await updateEngagementAction(orgId, engagement.id, input);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Engagement updated.");
      }
    });
  }

  function handleDelete() {
    if (
      !window.confirm(
        `Delete "${engagement.name}"? Metrics and deliverables go with it. This cannot be undone.`
      )
    ) {
      return;
    }
    startTransition(async () => {
      const result = await deleteEngagementAction(
        orgId,
        engagement.id,
        engagement.name
      );
      if (result?.error) {
        toast.error(result.error);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ovName">Name</Label>
            <Input
              id="ovName"
              required
              value={form.name}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setForm({ ...form, name: e.target.value })
              }
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Client</Label>
              <Select
                value={form.client_id}
                onValueChange={(value: string) =>
                  setForm({ ...form, client_id: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
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
                  <SelectValue />
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
          <div className="grid gap-4 sm:grid-cols-3">
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
              <Label htmlFor="ovStart">Start date</Label>
              <Input
                id="ovStart"
                type="date"
                value={form.start_date}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setForm({ ...form, start_date: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ovEnd">End date</Label>
              <Input
                id="ovEnd"
                type="date"
                value={form.end_date}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setForm({ ...form, end_date: e.target.value })
                }
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="ovBudget">Budget</Label>
              <Input
                id="ovBudget"
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
          <div className="space-y-2">
            <Label htmlFor="ovNotes">Notes</Label>
            <Textarea
              id="ovNotes"
              rows={3}
              value={form.notes}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                setForm({ ...form, notes: e.target.value })
              }
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Financial mode</CardTitle>
          <CardDescription>
            <strong>Auto</strong> computes revenue and cost from linked
            invoices (sent, paid or overdue). <strong>Manual</strong> lets you
            override both numbers yourself.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button
              type="button"
              variant={form.financial_mode === "auto" ? "default" : "outline"}
              size="sm"
              onClick={() => setForm({ ...form, financial_mode: "auto" })}
            >
              Auto (computed)
            </Button>
            <Button
              type="button"
              variant={
                form.financial_mode === "manual" ? "default" : "outline"
              }
              size="sm"
              onClick={() => setForm({ ...form, financial_mode: "manual" })}
            >
              Manual
            </Button>
          </div>
          {form.financial_mode === "manual" ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="ovManualRevenue">Manual revenue</Label>
                <Input
                  id="ovManualRevenue"
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.manual_revenue}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setForm({ ...form, manual_revenue: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ovManualCost">Manual cost</Label>
                <Input
                  id="ovManualCost"
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.manual_cost}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setForm({ ...form, manual_cost: e.target.value })
                  }
                />
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="ghost"
          className="text-destructive hover:text-destructive"
          disabled={isPending}
          onClick={handleDelete}
        >
          Delete engagement
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
