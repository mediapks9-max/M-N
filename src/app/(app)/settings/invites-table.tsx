"use client";

import { useTransition } from "react";
import { Copy } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { InviteRole } from "@/lib/database.types";
import { revokeInviteAction } from "./actions";

export interface InviteRowData {
  id: string;
  email: string;
  role: InviteRole;
  token: string;
  expiresAt: string;
}

interface InvitesTableProps {
  orgId: string;
  invites: InviteRowData[];
}

export function InvitesTable({ orgId, invites }: InvitesTableProps) {
  const [isPending, startTransition] = useTransition();

  async function handleCopy(token: string) {
    const url = `${window.location.origin}/invite/${token}`;
    await navigator.clipboard.writeText(url);
    toast.success("Invite link copied to clipboard.");
  }

  function handleRevoke(invite: InviteRowData) {
    startTransition(async () => {
      const result = await revokeInviteAction(orgId, invite.id, invite.email);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Invite revoked.");
      }
    });
  }

  if (invites.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No pending invites.</p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Email</TableHead>
          <TableHead>Role</TableHead>
          <TableHead>Expires</TableHead>
          <TableHead className="w-48" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {invites.map((invite: InviteRowData) => (
          <TableRow key={invite.id}>
            <TableCell className="font-medium">{invite.email}</TableCell>
            <TableCell>
              <Badge variant="secondary">{invite.role}</Badge>
            </TableCell>
            <TableCell>
              {new Date(invite.expiresAt).toLocaleDateString()}
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopy(invite.token)}
                >
                  <Copy className="h-3.5 w-3.5" />
                  Copy link
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={isPending}
                  onClick={() => handleRevoke(invite)}
                >
                  Revoke
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
