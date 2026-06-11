"use client";

import { useTransition } from "react";
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
import type { OrgRole } from "@/lib/database.types";
import { removeMemberAction } from "./actions";

export interface MemberRowData {
  membershipId: string;
  userId: string;
  fullName: string;
  email: string;
  role: OrgRole;
}

interface MembersTableProps {
  orgId: string;
  members: MemberRowData[];
  currentUserId: string;
  canManage: boolean;
}

export function MembersTable({
  orgId,
  members,
  currentUserId,
  canManage,
}: MembersTableProps) {
  const [isPending, startTransition] = useTransition();

  function handleRemove(member: MemberRowData) {
    startTransition(async () => {
      const result = await removeMemberAction(
        orgId,
        member.membershipId,
        member.fullName || member.email
      );
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Member removed.");
      }
    });
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Role</TableHead>
          {canManage ? <TableHead className="w-24" /> : null}
        </TableRow>
      </TableHeader>
      <TableBody>
        {members.map((member: MemberRowData) => (
          <TableRow key={member.membershipId}>
            <TableCell className="font-medium">
              {member.fullName || "—"}
              {member.userId === currentUserId ? (
                <span className="ml-2 text-xs text-muted-foreground">(you)</span>
              ) : null}
            </TableCell>
            <TableCell>{member.email}</TableCell>
            <TableCell>
              <Badge variant={member.role === "owner" ? "default" : "secondary"}>
                {member.role}
              </Badge>
            </TableCell>
            {canManage ? (
              <TableCell>
                {member.userId !== currentUserId && member.role !== "owner" ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={isPending}
                    onClick={() => handleRemove(member)}
                  >
                    Remove
                  </Button>
                ) : null}
              </TableCell>
            ) : null}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
