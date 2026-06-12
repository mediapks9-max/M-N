"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Pause, Play } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { simulationTickAction } from "./actions";

const TICK_MS = 5000;

export function LiveSimulator({ orgId }: { orgId: string }) {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const tickingRef = useRef(false);

  useEffect(() => {
    if (!running) return;

    let cancelled = false;

    async function tick() {
      // Skip a beat if the previous tick is still in flight.
      if (tickingRef.current || cancelled) return;
      tickingRef.current = true;
      try {
        const result = await simulationTickAction(orgId);
        if (result.error) {
          toast.error(result.error);
          setRunning(false);
          return;
        }
        if (!cancelled) {
          router.refresh();
        }
      } finally {
        tickingRef.current = false;
      }
    }

    void tick();
    const interval = setInterval(() => void tick(), TICK_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [running, orgId, router]);

  return (
    <div className="flex items-center gap-3">
      {running ? (
        <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-600">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
          </span>
          LIVE
        </span>
      ) : null}
      <Button
        variant={running ? "secondary" : "default"}
        size="sm"
        onClick={() => {
          const next = !running;
          setRunning(next);
          toast(
            next
              ? "Live demo started — numbers update every few seconds."
              : "Live demo stopped."
          );
        }}
      >
        {running ? (
          <>
            <Pause className="h-3.5 w-3.5" /> Stop demo
          </>
        ) : (
          <>
            <Play className="h-3.5 w-3.5" /> Live demo
          </>
        )}
      </Button>
    </div>
  );
}
