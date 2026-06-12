"use client";

import { useState, useTransition } from "react";
import { Building2, Check, ChevronsUpDown, Plus } from "lucide-react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createOrganizationAction,
  switchOrganizationAction,
} from "@/lib/actions/org";
import { cn } from "@/lib/utils";

interface OrgOption {
  id: string;
  name: string;
}

interface OrgSwitcherProps {
  currentOrg: OrgOption;
  organizations: OrgOption[];
}

export function OrgSwitcher({ currentOrg, organizations }: OrgSwitcherProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newOrgName, setNewOrgName] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startTransition(async () => {
      const result = await createOrganizationAction(newOrgName);
      if (result?.error) {
        toast.error(result.error);
      }
      // On success the action sets the org cookie and redirects.
    });
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          className="flex w-full items-center gap-2 px-4 py-3 text-left hover:bg-sidebar-accent"
          disabled={isPending}
        >
          <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="flex-1 truncate text-sm font-semibold">
            {currentOrg.name}
          </span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuLabel>Organizations</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {organizations.map((org: OrgOption) => (
            <DropdownMenuItem
              key={org.id}
              onSelect={() => {
                if (org.id !== currentOrg.id) {
                  startTransition(async () => {
                    await switchOrganizationAction(org.id);
                  });
                }
              }}
            >
              <Check
                className={cn(
                  "h-4 w-4",
                  org.id === currentOrg.id ? "opacity-100" : "opacity-0"
                )}
              />
              <span className="truncate">{org.name}</span>
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={() => {
              setNewOrgName("");
              setDialogOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            New organization
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New organization</DialogTitle>
            <DialogDescription>
              A separate workspace with its own clients, leads and data —
              ideal for giving a customer access to only their own activity.
              You become its owner and can invite their team from Settings.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newOrgName">Organization name</Label>
              <Input
                id="newOrgName"
                required
                placeholder="e.g. WaveROI"
                value={newOrgName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setNewOrgName(e.target.value)
                }
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Creating…" : "Create organization"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
