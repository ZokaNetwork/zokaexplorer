import type { NetworkStats, Block as ChainBlock } from "./types";

/**
 * Last known chain state, kept in the browser.
 *
 * A block explorer that can show nothing is not a block explorer. The data
 * comes from a view a node publishes on a schedule, and any published source
 * can be briefly unreachable — a run that failed, a deploy, a network blip.
 * Without this the page went blank, which reads as "the chain is dead" to
 * anyone evaluating the project, and that impression is expensive to undo.
 *
 * So the last good sample is persisted and shown, always with its age. This is
 * what established explorers do: they never show an empty dashboard, they show
 * the most recent state they have. Being a few minutes behind is normal and
 * legible; being blank is not.
 *
 * It is deliberately per-browser. Nothing is sent anywhere, and a visitor with
 * an empty cache simply waits for the first fetch like before.
 */

const KEY = "zoka_last_known_v1";
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export interface LastKnown {
  stats: NetworkStats;
  recentBlocks: ChainBlock[];
  /** When this browser stored it — distinct from the publisher's published_at. */
  cachedAt: number;
}

const storage = (): Storage | null => {
  try {
    return typeof localStorage !== "undefined" && localStorage.getItem ? localStorage : null;
  } catch {
    // Private browsing and some embedded webviews throw on access.
    return null;
  }
};

export function loadLastKnown(): LastKnown | null {
  const store = storage();
  if (!store) return null;
  try {
    const raw = store.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LastKnown;
    if (!parsed?.stats || typeof parsed.cachedAt !== "number") return null;
    // Stale beyond a week is not "slightly behind", it is misleading. Better to
    // show the empty state than numbers from another era of the chain.
    if (Date.now() - parsed.cachedAt > MAX_AGE_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveLastKnown(stats: NetworkStats, recentBlocks: ChainBlock[]): void {
  const store = storage();
  if (!store) return;
  try {
    const payload: LastKnown = { stats, recentBlocks, cachedAt: Date.now() };
    store.setItem(KEY, JSON.stringify(payload));
  } catch {
    // A full or restricted store must never break the page.
  }
}
