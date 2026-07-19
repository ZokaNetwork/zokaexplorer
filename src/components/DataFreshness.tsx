import { AlertTriangle } from "lucide-react";

/**
 * How old the published view is.
 *
 * The explorer reads a snapshot a node publishes on a schedule, not a live
 * RPC. That is a deliberate trade: static files cost nothing to serve and
 * cannot be knocked over, but they are always a little behind.
 *
 * The one failure this design must never have is *silently* old numbers — a
 * stalled publisher looking identical to a healthy one. So the age is always
 * on screen, and once it passes the threshold it stops being a quiet footnote
 * and says so.
 */

/**
 * Past this, the view is called out rather than merely timestamped.
 *
 * Generous on purpose. Publishing runs every twenty minutes, so a warning at
 * twenty minutes fired constantly during normal operation — and a warning that
 * is usually on teaches people to ignore it. An hour means something is
 * actually wrong.
 */
const STALE_AFTER_MS = 60 * 60 * 1000;

const formatAge = (ms: number): string => {
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return "actualizado recién";
  if (mins === 1) return "actualizado hace 1 minuto";
  if (mins < 60) return `actualizado hace ${mins} minutos`;
  const hours = Math.floor(mins / 60);
  if (hours === 1) return "actualizado hace 1 hora";
  if (hours < 24) return `actualizado hace ${hours} horas`;
  const days = Math.floor(hours / 24);
  return days === 1 ? "actualizado hace 1 día" : `actualizado hace ${days} días`;
};

interface DataFreshnessProps {
  publishedAt?: number;
  className?: string;
}

const DataFreshness = ({ publishedAt, className = "" }: DataFreshnessProps) => {
  if (!publishedAt) return null;

  const age = Date.now() - publishedAt;
  const stale = age > STALE_AFTER_MS;

  // Deliberately quiet. This was a bordered amber pill with a warning icon,
  // which shouted that something was broken when the data was half an hour
  // old — normal operation. Freshness is context, not an alert: it belongs in
  // the margin at the weight of a caption, and only earns colour once it
  // genuinely means something is wrong.
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-light ${
        stale ? "text-amber-500/80" : "text-muted-foreground/60"
      } ${className}`}
      title={new Date(publishedAt).toLocaleString()}
    >
      {stale && <AlertTriangle className="h-3 w-3" aria-hidden />}
      <span>{formatAge(age)}</span>
    </span>
  );
};

export default DataFreshness;
