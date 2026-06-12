"use client";

import { useRef, useState, useTransition } from "react";
import { Plus, Trash2, Upload } from "lucide-react";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { CampaignStat } from "@/lib/database.types";
import { formatCurrency, formatDate, formatNumber } from "@/lib/format";
import {
  deleteDailyStatAction,
  importStatsCsvAction,
  upsertDailyStatAction,
  type DailyStatInput,
} from "../actions";

interface StatsManagerProps {
  orgId: string;
  campaignId: string;
  campaignName: string;
  currency: string;
  stats: CampaignStat[];
}

const NUMERIC_FIELDS = [
  "impressions",
  "clicks",
  "leads",
  "conversions",
  "spend",
  "revenue",
] as const;
type NumericField = (typeof NUMERIC_FIELDS)[number];

function parseCsv(text: string): DailyStatInput[] {
  const lines = text
    .split(/\r?\n/)
    .map((line: string) => line.trim())
    .filter(Boolean);
  if (lines.length < 2) return [];

  const headers = lines[0]
    .split(",")
    .map((header: string) => header.trim().toLowerCase());
  const dateIndex = headers.findIndex((header: string) =>
    ["date", "day"].includes(header)
  );
  if (dateIndex === -1) return [];

  return lines.slice(1).map((line: string) => {
    const cells = line.split(",").map((cell: string) => cell.trim());
    const row: DailyStatInput = {
      date: cells[dateIndex] ?? "",
      impressions: 0,
      clicks: 0,
      leads: 0,
      conversions: 0,
      spend: 0,
      revenue: 0,
    };
    for (const field of NUMERIC_FIELDS) {
      const index = headers.findIndex((header: string) =>
        header.startsWith(field.slice(0, 4))
      );
      if (index !== -1) {
        row[field] = Number.parseFloat(cells[index] ?? "") || 0;
      }
    }
    return row;
  });
}

export function StatsManager({
  orgId,
  campaignId,
  campaignName,
  currency,
  stats,
}: StatsManagerProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    impressions: "",
    clicks: "",
    leads: "",
    conversions: "",
    spend: "",
    revenue: "",
  });

  function handleAdd(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input: DailyStatInput = {
      date: form.date,
      impressions: Number.parseFloat(form.impressions) || 0,
      clicks: Number.parseFloat(form.clicks) || 0,
      leads: Number.parseFloat(form.leads) || 0,
      conversions: Number.parseFloat(form.conversions) || 0,
      spend: Number.parseFloat(form.spend) || 0,
      revenue: Number.parseFloat(form.revenue) || 0,
    };
    startTransition(async () => {
      const result = await upsertDailyStatAction(orgId, campaignId, input);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(`Saved ${form.date}.`);
      }
    });
  }

  function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const rows = parseCsv(String(reader.result ?? ""));
      if (rows.length === 0) {
        toast.error(
          "Couldn't parse the CSV. Required: a header row with a 'date' column (YYYY-MM-DD) plus any of impressions, clicks, leads, conversions, spend, revenue."
        );
        return;
      }
      startTransition(async () => {
        const result = await importStatsCsvAction(
          orgId,
          campaignId,
          campaignName,
          rows
        );
        if (result.error) {
          toast.error(result.error);
        } else {
          toast.success(`Imported ${result.imported} day(s).`);
        }
      });
    };
    reader.readAsText(file);
    event.target.value = "";
  }

  function handleDelete(stat: CampaignStat) {
    startTransition(async () => {
      const result = await deleteDailyStatAction(orgId, campaignId, stat.id);
      if (result.error) {
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex-row items-start justify-between space-y-0">
          <div>
            <CardTitle>Daily performance</CardTitle>
            <CardDescription>
              Add a day manually, or import the CSV your ad network exports.
              Re-importing the same dates updates them.
            </CardDescription>
          </div>
          <div>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={handleFile}
            />
            <Button
              variant="outline"
              size="sm"
              disabled={isPending}
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="h-3.5 w-3.5" />
              Import CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={handleAdd}
            className="grid items-end gap-3 sm:grid-cols-4 lg:grid-cols-8"
          >
            <div className="space-y-1">
              <Label htmlFor="sDate">Date</Label>
              <Input
                id="sDate"
                type="date"
                required
                value={form.date}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setForm({ ...form, date: e.target.value })
                }
              />
            </div>
            {NUMERIC_FIELDS.map((field: NumericField) => (
              <div key={field} className="space-y-1">
                <Label htmlFor={`s-${field}`} className="capitalize">
                  {field}
                </Label>
                <Input
                  id={`s-${field}`}
                  type="number"
                  step="any"
                  min="0"
                  value={form[field]}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setForm({ ...form, [field]: e.target.value })
                  }
                />
              </div>
            ))}
            <Button type="submit" disabled={isPending}>
              <Plus className="h-4 w-4" />
              Save day
            </Button>
          </form>
        </CardContent>
      </Card>

      {stats.length === 0 ? (
        <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          No daily data yet.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Impr.</TableHead>
              <TableHead className="text-right">Clicks</TableHead>
              <TableHead className="text-right">Leads</TableHead>
              <TableHead className="text-right">Conv.</TableHead>
              <TableHead className="text-right">Spend</TableHead>
              <TableHead className="text-right">Revenue</TableHead>
              <TableHead className="text-right">CPL</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {stats.map((stat: CampaignStat) => (
              <TableRow key={stat.id}>
                <TableCell className="font-medium">
                  {formatDate(stat.date)}
                </TableCell>
                <TableCell className="text-right">
                  {formatNumber(stat.impressions)}
                </TableCell>
                <TableCell className="text-right">
                  {formatNumber(stat.clicks)}
                </TableCell>
                <TableCell className="text-right">
                  {formatNumber(stat.leads)}
                </TableCell>
                <TableCell className="text-right">
                  {formatNumber(stat.conversions)}
                </TableCell>
                <TableCell className="text-right">
                  {formatCurrency(stat.spend, currency)}
                </TableCell>
                <TableCell className="text-right">
                  {formatCurrency(stat.revenue, currency)}
                </TableCell>
                <TableCell className="text-right">
                  {stat.leads > 0
                    ? formatCurrency(stat.spend / stat.leads, currency)
                    : "—"}
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    disabled={isPending}
                    onClick={() => handleDelete(stat)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
