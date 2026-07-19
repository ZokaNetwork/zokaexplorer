/**
 * Whether the published view is reaching us, shared across the app.
 *
 * The dashboard is what actually fetches, but the header is where the state
 * belongs visually — a small live indicator reads at a glance, and does not
 * need a paragraph explaining itself. This is a minimal store so the two can
 * agree without threading props through the tree.
 */

export type DataStatus = "loading" | "live" | "stale" | "down";

let current: DataStatus = "loading";
const listeners = new Set<(status: DataStatus) => void>();

export function getDataStatus(): DataStatus {
  return current;
}

export function setDataStatus(next: DataStatus): void {
  if (next === current) return;
  current = next;
  listeners.forEach((fn) => fn(next));
}

export function onDataStatusChange(fn: (status: DataStatus) => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
