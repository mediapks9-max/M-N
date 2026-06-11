"use client";

import { useState, useTransition } from "react";
import { ExternalLink, Plus, Trash2 } from "lucide-react";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import type {
  Deliverable,
  DeliverableStatus,
  DeliverableType,
} from "@/lib/database.types";
import {
  DELIVERABLE_STATUSES,
  DELIVERABLE_STATUS_LABELS,
  DELIVERABLE_TYPES,
  DELIVERABLE_TYPE_LABELS,
} from "@/lib/domain";
import { formatDate, isOverdue } from "@/lib/format";
import {
  createDeliverableAction,
  deleteDeliverableAction,
  updateDeliverableStatusAction,
  type DeliverableInput,
} from "../../deliverables/actions";

interface DeliverablesSectionProps {
  orgId: string;
  engagementId: string;
  deliverables: Deliverable[];
}

const EMPTY_FORM: DeliverableInput = {
  type: "other",
  title: "",
  status: "planned",
  due_date: null,
  url: "",
  notes: "",
};

export function DeliverablesSection({
  orgId,
  engagementId,
  deliverables,
}: DeliverablesSectionProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<DeliverableInput>(EMPTY_FORM);
  const [dueDate, setDueDate] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startTransition(async () => {
      const result = await createDeliverableAction(orgId, engagementId, {
        ...form,
        due_date: dueDate || null,
      });
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Deliverable added.");
        setDialogOpen(false);
        setForm(EMPTY_FORM);
        setDueDate("");
      }
    });
  }

  function handleStatusChange(deliverable: Deliverable, status: string) {
    startTransition(async () => {
      const result = await updateDeliverableStatusAction(
        orgId,
        engagementId,
        deliverable.id,
        status as DeliverableStatus
      );
      if (result.error) {
        toast.error(result.error);
      }
    });
  }

  function handleDelete(deliverable: Deliverable) {
    startTransition(async () => {
      const result = await deleteDeliverableAction(
        orgId,
        engagementId,
        deliverable.id,
        deliverable.title
      );
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Deliverable removed.");
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4" />
          Add deliverable
        </Button>
      </div>

      {deliverables.length === 0 ? (
        <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          No deliverables yet for this engagement.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Due</TableHead>
              <TableHead>Delivered</TableHead>
              <TableHead className="w-20" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {deliverables.map((deliverable: Deliverable) => {
              const overdue =
                isOverdue(deliverable.due_date) &&
                deliverable.status !== "delivered" &&
                deliverable.status !== "published";
              return (
                <TableRow key={deliverable.id}>
                  <TableCell className="font-medium">
                    {deliverable.title}
                    {deliverable.url ? (
                      <a
                        href={deliverable.url}
                        target="_blank"
                        rel="noreferrer"
                        className="ml-2 inline-block align-middle text-muted-foreground hover:text-foreground"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {DELIVERABLE_TYPE_LABELS[deliverable.type]}
                  </TableCell>
                  <TableCell>
                    <Select
                      value={deliverable.status}
                      onValueChange={(value: string) =>
                        handleStatusChange(deliverable, value)
                      }
                    >
                      <SelectTrigger className="h-8 w-36">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DELIVERABLE_STATUSES.map(
                          (status: DeliverableStatus) => (
                            <SelectItem key={status} value={status}>
                              {DELIVERABLE_STATUS_LABELS[status]}
                            </SelectItem>
                          )
                        )}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell
                    className={overdue ? "font-medium text-red-600" : ""}
                  >
                    {formatDate(deliverable.due_date)}
                    {overdue ? " (overdue)" : ""}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(deliverable.delivered_at)}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      disabled={isPending}
                      onClick={() => handleDelete(deliverable)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add deliverable</DialogTitle>
            <DialogDescription>
              A work output tied to this engagement.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="dTitle">Title</Label>
              <Input
                id="dTitle"
                required
                value={form.title}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setForm({ ...form, title: e.target.value })
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={form.type}
                  onValueChange={(value: string) =>
                    setForm({ ...form, type: value as DeliverableType })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DELIVERABLE_TYPES.map((type: DeliverableType) => (
                      <SelectItem key={type} value={type}>
                        {DELIVERABLE_TYPE_LABELS[type]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(value: string) =>
                    setForm({ ...form, status: value as DeliverableStatus })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DELIVERABLE_STATUSES.map((status: DeliverableStatus) => (
                      <SelectItem key={status} value={status}>
                        {DELIVERABLE_STATUS_LABELS[status]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dDue">Due date</Label>
                <Input
                  id="dDue"
                  type="date"
                  value={dueDate}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setDueDate(e.target.value)
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dUrl">URL</Label>
                <Input
                  id="dUrl"
                  type="url"
                  placeholder="https://"
                  value={form.url}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setForm({ ...form, url: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="dNotes">Notes</Label>
              <Textarea
                id="dNotes"
                rows={2}
                value={form.notes}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setForm({ ...form, notes: e.target.value })
                }
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Adding…" : "Add deliverable"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
