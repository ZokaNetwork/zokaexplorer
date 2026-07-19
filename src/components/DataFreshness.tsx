import { Clock, AlertTriangle } from "lucide-react";

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

/** Past this, the view is called out as stale rather than merely timestamped. */
const STALE_AFTER_MS = 20 * 60 * 1000;

const formatAge = (ms: number): string => {
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return "hace menos de un minuto";
  if (mins === 1) return "hace 1 minuto";
  if (mins < 60) return `hace ${mins} minutos`;
  const hours = Math.floor(mins / 60);
  if (hours === 1) return "hace 1 hora";
  if (hours < 24) return `hace ${hours} horas`;
  const days = Math.floor(hours / 24);
  return days === 1 ? "hace 1 día" : `hace ${days} días`;
};

interface DataFreshnessProps {
  publishedAt?: number;
  className?: string;
}

const DataFreshness = ({ publishedAt, className = "" }: DataFreshnessProps) => {
  if (!publishedAt) return null;

  const age = Date.now() - publishedAt;
  const stale = age > STALE_AFTER_MS;

  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-light ${
        stale
          ? "border-amber-500/40 text-amber-500/90"
          : "border-border text-muted-foreground"
      } ${className}`}
      title={new Date(publishedAt).toLocaleString()}
    >
      {stale ? (
        <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
      ) : (
        <Clock className="h-3.5 w-3.5" aria-hidden />
      )}
      {/* "Actualizado" rather than "Publicado": it is the word every explorer
          uses and the one a visitor expects, without claiming the numbers are
          being read live — which they are not. */}
      <span>
        {stale ? "Sin actualizar desde " : "Actualizado "}
        {formatAge(age)}
      </span>
    </div>
  );
};

export default DataFreshness;
