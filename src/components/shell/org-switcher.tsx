"use client";

import { useTransition } from "react";
import { Building2, Check, ChevronsUpDown } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { switchOrganizationAction } from "@/lib/actions/org";
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
  const [isPending, startTransition] = useTransition();

  if (organizations.length <= 1) {
    return (
      <div className="flex items-center gap-2 px-4 py-3">
        <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className="truncate text-sm font-semibold">
          {currentOrg.name}
        </span>
      </div>
    );
  }

  return (
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
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
