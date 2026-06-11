import { createClient } from "@/lib/supabase/server";
import type {
  ActivityAction,
  ActivityEntityType,
  Json,
} from "@/lib/database.types";

export interface LogActivityParams {
  organizationId: string;
  entityType: ActivityEntityType;
  entityId?: string | null;
  /** Denormalized human-readable label, e.g. the client or invoice name. */
  entityLabel: string;
  action: ActivityAction;
  details?: Json | null;
}

/**
 * Appends a row to activity_log as the current user.
 * Call this explicitly from EVERY mutation (no DB triggers by design).
 * Logging failures are swallowed: the feed must never break a mutation.
 */
export async function logActivity(params: LogActivityParams): Promise<void> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return;
  }

  const { error } = await supabase.from("activity_log").insert({
    organization_id: params.organizationId,
    actor_user_id: user.id,
    entity_type: params.entityType,
    entity_id: params.entityId ?? null,
    entity_label: params.entityLabel,
    action: params.action,
    details: params.details ?? null,
  });

  if (error) {
    console.error("logActivity failed:", error.message);
  }
}
