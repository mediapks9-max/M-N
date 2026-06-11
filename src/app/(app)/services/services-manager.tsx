"use client";

import { useState, useTransition } from "react";
import { ArrowDown, ArrowUp, Pencil, Plus } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import type { Service } from "@/lib/database.types";
import {
  createServiceAction,
  moveServiceAction,
  toggleServiceActiveAction,
  updateServiceAction,
  type ServiceInput,
} from "./actions";

interface ServicesManagerProps {
  orgId: string;
  services: Service[];
}

const EMPTY_FORM: ServiceInput = {
  name: "",
  color: "#6366f1",
  description: "",
};

export function ServicesManager({ orgId, services }: ServicesManagerProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Service | null>(null);
  const [form, setForm] = useState<ServiceInput>(EMPTY_FORM);
  const [isPending, startTransition] = useTransition();

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  }

  function openEdit(service: Service) {
    setEditing(service);
    setForm({
      name: service.name,
      color: service.color,
      description: service.description,
    });
    setDialogOpen(true);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startTransition(async () => {
      const result = editing
        ? await updateServiceAction(orgId, editing.id, form)
        : await createServiceAction(orgId, form);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(editing ? "Service updated." : "Service created.");
        setDialogOpen(false);
      }
    });
  }

  function handleMove(serviceId: string, direction: "up" | "down") {
    startTransition(async () => {
      const result = await moveServiceAction(orgId, serviceId, direction);
      if (result.error) {
        toast.error(result.error);
      }
    });
  }

  function handleToggle(service: Service) {
    startTransition(async () => {
      const result = await toggleServiceActiveAction(
        orgId,
        service.id,
        !service.is_active
      );
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(
          service.is_active ? "Service deactivated." : "Service activated."
        );
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Add service
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-16">Order</TableHead>
            <TableHead>Service</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-40" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {services.map((service: Service, index: number) => (
            <TableRow
              key={service.id}
              className={service.is_active ? "" : "opacity-50"}
            >
              <TableCell>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    disabled={isPending || index === 0}
                    onClick={() => handleMove(service.id, "up")}
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    disabled={isPending || index === services.length - 1}
                    onClick={() => handleMove(service.id, "down")}
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </TableCell>
              <TableCell>
                <span
                  className="mr-2 inline-block h-3 w-3 rounded-full align-middle"
                  style={{ backgroundColor: service.color }}
                />
                <span className="font-medium">{service.name}</span>
              </TableCell>
              <TableCell className="max-w-md truncate text-muted-foreground">
                {service.description || "—"}
              </TableCell>
              <TableCell>
                <Badge variant={service.is_active ? "secondary" : "outline"}>
                  {service.is_active ? "Active" : "Inactive"}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex items-center justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openEdit(service)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={isPending}
                    onClick={() => handleToggle(service)}
                  >
                    {service.is_active ? "Deactivate" : "Activate"}
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit service" : "Add service"}
            </DialogTitle>
            <DialogDescription>
              Services appear as colored badges on engagements and the
              dashboard.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="serviceName">Name</Label>
              <Input
                id="serviceName"
                required
                value={form.name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setForm({ ...form, name: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="serviceColor">Badge color</Label>
              <div className="flex items-center gap-3">
                <input
                  id="serviceColor"
                  type="color"
                  className="h-9 w-12 cursor-pointer rounded border border-input bg-transparent"
                  value={form.color}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setForm({ ...form, color: e.target.value })
                  }
                />
                <Input
                  className="w-32"
                  value={form.color}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setForm({ ...form, color: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="serviceDescription">Description</Label>
              <Textarea
                id="serviceDescription"
                rows={3}
                value={form.description}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setForm({ ...form, description: e.target.value })
                }
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Saving…" : editing ? "Save changes" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
