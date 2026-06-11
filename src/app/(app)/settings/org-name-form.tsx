"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateOrganizationNameAction } from "./actions";

interface OrgNameFormProps {
  orgId: string;
  currentName: string;
}

export function OrgNameForm({ orgId, currentName }: OrgNameFormProps) {
  const [name, setName] = useState(currentName);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startTransition(async () => {
      const result = await updateOrganizationNameAction(orgId, name);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Organization name updated.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-md items-end gap-3">
      <div className="flex-1 space-y-2">
        <Label htmlFor="orgName">Organization name</Label>
        <Input
          id="orgName"
          required
          value={name}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setName(e.target.value)
          }
        />
      </div>
      <Button type="submit" disabled={isPending || name.trim() === currentName}>
        {isPending ? "Saving…" : "Save"}
      </Button>
    </form>
  );
}
