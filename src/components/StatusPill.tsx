import { cn } from "@/lib/utils";
import type { ParcelStatus } from "@/lib/parbox";

const styles: Record<ParcelStatus, string> = {
  registered: "bg-muted text-muted-foreground",
  stored: "bg-primary/15 text-primary",
  notified: "bg-info/25 text-info",
  claimed: "bg-success/20 text-success",
  disputed: "bg-destructive/15 text-destructive",
  escalated: "bg-warning/30 text-warning",
  returned: "bg-secondary text-secondary-foreground",
};

const labels: Record<ParcelStatus, string> = {
  registered: "Registered",
  stored: "Stored",
  notified: "Notified",
  claimed: "Claimed",
  disputed: "Disputed",
  escalated: "Escalated",
  returned: "Returned",
};

export function StatusPill({ status, className }: { status: ParcelStatus; className?: string }) {
  return (
    <span
      className={cn(
        "clay-soft inline-flex shrink-0 items-center rounded-full px-3 py-1 text-xs font-bold uppercase",
        styles[status],
        className,
      )}
    >
      {labels[status]}
    </span>
  );
}
