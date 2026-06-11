"use client";

import { useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ArticleStatus } from "@/lib/database.types";
import { ARTICLE_STATUSES } from "@/lib/domain";

const ALL = "all";

export function ArticleFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  function setStatus(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === ALL) {
      params.delete("status");
    } else {
      params.set("status", value);
    }
    router.push(`/seo-articles?${params.toString()}`);
  }

  return (
    <div className="flex items-center gap-3">
      <Select
        value={searchParams.get("status") ?? ALL}
        onValueChange={setStatus}
      >
        <SelectTrigger className="w-40">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All statuses</SelectItem>
          {ARTICLE_STATUSES.map((status: ArticleStatus) => (
            <SelectItem key={status} value={status} className="capitalize">
              {status}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {searchParams.has("status") ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/seo-articles")}
        >
          Clear
        </Button>
      ) : null}
    </div>
  );
}
