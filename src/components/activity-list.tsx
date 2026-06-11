import {
  actorName,
  describeActivity,
  ENTITY_TYPE_LABELS,
  type ActivityWithActor,
} from "@/lib/activity-display";
import { Badge } from "@/components/ui/badge";
import { relativeTime } from "@/lib/format";

interface ActivityListProps {
  entries: ActivityWithActor[];
  emptyMessage?: string;
}

export function ActivityList({ entries, emptyMessage }: ActivityListProps) {
  if (entries.length === 0) {
    return (
      <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
        {emptyMessage ?? "No activity yet."}
      </p>
    );
  }

  return (
    <ul className="divide-y">
      {entries.map((entry: ActivityWithActor) => (
        <li key={entry.id} className="flex items-start gap-3 py-3">
          <Badge variant="outline" className="mt-0.5 shrink-0 font-normal">
            {ENTITY_TYPE_LABELS[entry.entity_type]}
          </Badge>
          <div className="min-w-0 flex-1">
            <p className="text-sm">
              <span className="font-medium">{actorName(entry)}</span>{" "}
              {describeActivity(entry)}
            </p>
          </div>
          <span
            className="shrink-0 text-xs text-muted-foreground"
            title={new Date(entry.created_at).toLocaleString()}
          >
            {relativeTime(entry.created_at)}
          </span>
        </li>
      ))}
    </ul>
  );
}
