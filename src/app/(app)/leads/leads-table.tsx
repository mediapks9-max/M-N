"use client";

import { useTransition } from "react";
import { Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Lead, LeadStatus } from "@/lib/database.types";
import { LEAD_STATUSES, LEAD_STATUS_LABELS } from "@/lib/domain";
import { relativeTime } from "@/lib/format";
import {
  convertLeadAction,
  deleteLeadAction,
  setLeadStatusAction,
} from "./actions";

interface LeadsTableProps {
  orgId: string;
  leads: Lead[];
}

function sourceLabel(lead: Lead): string {
  // Site tag from embedded forms takes priority — it says exactly
  // which property captured the lead.
  if (lead.source && lead.source !== "website") {
    return lead.utm_source
      ? `${lead.source} · ${lead.utm_source}`
      : lead.source;
  }
  if (lead.utm_source) {
    return `${lead.utm_source}${lead.utm_medium ? ` / ${lead.utm_medium}` : ""}`;
  }
  if (lead.referrer) {
    try {
      return new URL(lead.referrer).hostname;
    } catch {
      return lead.referrer;
    }
  }
  return "direct";
}

export function LeadsTable({ orgId, leads }: LeadsTableProps) {
  const [isPending, startTransition] = useTransition();

  function handleStatus(lead: Lead, status: string) {
    startTransition(async () => {
      const result = await setLeadStatusAction(
        orgId,
        lead.id,
        status as LeadStatus
      );
      if (result.error) {
        toast.error(result.error);
      }
    });
  }

  function handleConvert(lead: Lead) {
    startTransition(async () => {
      const result = await convertLeadAction(orgId, lead.id);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(`${lead.name} is now a client.`);
      }
    });
  }

  function handleDelete(lead: Lead) {
    if (!window.confirm(`Delete lead "${lead.name}"?`)) {
      return;
    }
    startTransition(async () => {
      const result = await deleteLeadAction(orgId, lead.id, lead.name);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Lead deleted.");
      }
    });
  }

  if (leads.length === 0) {
    return (
      <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
        No leads yet. They appear here the moment someone submits the form on
        your site.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Lead</TableHead>
          <TableHead>Message</TableHead>
          <TableHead>Source</TableHead>
          <TableHead>Campaign</TableHead>
          <TableHead>Landing page</TableHead>
          <TableHead>Received</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="w-24" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {leads.map((lead: Lead) => (
          <TableRow key={lead.id}>
            <TableCell>
              <p className="font-medium">{lead.name}</p>
              <p className="text-xs text-muted-foreground">{lead.email}</p>
              {lead.phone ? (
                <p className="text-xs text-muted-foreground">{lead.phone}</p>
              ) : null}
            </TableCell>
            <TableCell className="max-w-56">
              <p className="truncate text-muted-foreground" title={lead.message}>
                {lead.message || "—"}
              </p>
            </TableCell>
            <TableCell>{sourceLabel(lead)}</TableCell>
            <TableCell className="text-muted-foreground">
              {lead.utm_campaign || "—"}
            </TableCell>
            <TableCell className="max-w-44">
              <p className="truncate text-muted-foreground" title={lead.landing_page}>
                {lead.landing_page || "—"}
              </p>
            </TableCell>
            <TableCell
              className="whitespace-nowrap text-muted-foreground"
              title={new Date(lead.created_at).toLocaleString()}
            >
              {relativeTime(lead.created_at)}
            </TableCell>
            <TableCell>
              <Select
                value={lead.status}
                onValueChange={(value: string) => handleStatus(lead, value)}
              >
                <SelectTrigger className="h-8 w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LEAD_STATUSES.map((status: LeadStatus) => (
                    <SelectItem key={status} value={status}>
                      {LEAD_STATUS_LABELS[status]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </TableCell>
            <TableCell>
              <div className="flex items-center justify-end gap-1">
                {!lead.client_id ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    title="Convert to client"
                    disabled={isPending}
                    onClick={() => handleConvert(lead)}
                  >
                    <UserPlus className="h-3.5 w-3.5" />
                  </Button>
                ) : null}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  disabled={isPending}
                  onClick={() => handleDelete(lead)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
