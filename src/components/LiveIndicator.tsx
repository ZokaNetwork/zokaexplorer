import { useEffect, useState } from "react";
import { getDataStatus, onDataStatusChange, type DataStatus } from "@/lib/dataStatus";

/**
 * A small dot in place of the version label.
 *
 * This replaced a paragraph explaining that the published view was
 * unreachable. On a block explorer that paragraph is the wrong shape of
 * message: people scan a dashboard, they do not read an apology, and a wall of
 * text about data sources makes a working chain look broken. A dot that
 * breathes says "tracking" and a dot that stops says "not right now" — and the
 * exact age is already one line below, for whoever wants it.
 */

const STYLES: Record<DataStatus, { dot: string; label: string; title: string }> = {
  loading: {
    dot: "bg-muted-foreground/60 animate-pulse",
    label: "text-muted-foreground/70",
    title: "Connecting to the published view",
  },
  live: {
    dot: "bg-emerald-500 animate-pulse",
    label: "text-muted-foreground",
    title: "Tracking the chain",
  },
  stale: {
    dot: "bg-amber-500",
    label: "text-amber-500/80",
    title: "The published view is behind",
  },
  down: {
    dot: "bg-muted-foreground/40",
    label: "text-muted-foreground/60",
    title: "The published view is unreachable — the chain is unaffected",
  },
};

const LiveIndicator = () => {
  const [status, setStatus] = useState<DataStatus>(getDataStatus);

  useEffect(() => onDataStatusChange(setStatus), []);

  const style = STYLES[status];

  return (
    <span
      className={`inline-flex items-center gap-1.5 ${style.label}`}
      title={style.title}
      aria-label={style.title}
    >
      <span className={`inline-block h-1.5 w-1.5 rounded-full ${style.dot}`} aria-hidden />
    </span>
  );
};

export default LiveIndicator;
