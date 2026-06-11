"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import type { InvoiceStatus } from "@/lib/database.types";
import { deleteInvoiceAction, setInvoiceStatusAction } from "../actions";

interface InvoiceStatusActionsProps {
  orgId: string;
  invoiceId: string;
  invoiceNumber: string;
  status: InvoiceStatus;
}

export function InvoiceStatusActions({
  orgId,
  invoiceId,
  invoiceNumber,
  status,
}: InvoiceStatusActionsProps) {
  const [isPending, startTransition] = useTransition();

  function setStatus(next: InvoiceStatus, successMessage: string) {
    startTransition(async () => {
      const result = await setInvoiceStatusAction(orgId, invoiceId, next);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(successMessage);
      }
    });
  }

  function handleDelete() {
    if (
      !window.confirm(
        `Delete invoice ${invoiceNumber}? This cannot be undone.`
      )
    ) {
      return;
    }
    startTransition(async () => {
      const result = await deleteInvoiceAction(orgId, invoiceId, invoiceNumber);
      if (result?.error) {
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {status === "draft" ? (
        <Button
          variant="outline"
          size="sm"
          disabled={isPending}
          onClick={() => setStatus("sent", "Marked as sent.")}
        >
          Mark sent
        </Button>
      ) : null}
      {status !== "paid" && status !== "cancelled" ? (
        <Button
          size="sm"
          disabled={isPending}
          onClick={() => setStatus("paid", "Marked as paid.")}
        >
          Mark paid
        </Button>
      ) : null}
      {(status === "sent" || status === "overdue") ? (
        <Button
          variant="outline"
          size="sm"
          disabled={isPending}
          onClick={() => setStatus("overdue", "Marked as overdue.")}
        >
          Mark overdue
        </Button>
      ) : null}
      {status !== "cancelled" ? (
        <Button
          variant="ghost"
          size="sm"
          disabled={isPending}
          onClick={() => setStatus("cancelled", "Invoice cancelled.")}
        >
          Cancel invoice
        </Button>
      ) : null}
      <Button
        variant="ghost"
        size="sm"
        className="text-destructive hover:text-destructive"
        disabled={isPending}
        onClick={handleDelete}
      >
        Delete
      </Button>
    </div>
  );
}
