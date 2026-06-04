// ─── Zoka API Service ───────────────────────────────────────────
// Maps the ZOKA node REST API (Fly bootstrap in prod, proxied via /rpc in dev)
// to the shapes the explorer components expect.
// When RPC_URL is empty → returns mock data for UI development.

import { config, ensureNetworkConfigLoaded } from "./config";
import type {
  NetworkStats,
  Block,
  Transaction,
  Address,
  SearchResult,
  SafeRecord,
  SafeRecordKind,
  PrivateActivityItem,
} from "./types";

// ── Network layer with retries ──────────────────────────────────

export class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public retryable = false,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function fetchWithTimeout(url: string, timeoutMs = config.TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) {
      const retryable = res.status >= 500 || res.status === 429;
      throw new ApiError(`HTTP ${res.status}`, res.status, retryable);
    }
    return res;
  } catch (err: any) {
    if (err.name === "AbortError") throw new ApiError("Request timeout", undefined, true);
    if (err instanceof ApiError) throw err;
    throw new ApiError(err.message ?? "Network error", undefined, true);
  } finally {
    clearTimeout(timer);
  }
}

async function apiFetch<T>(path: string): Promise<T> {
  await ensureNetworkConfigLoaded();
  const url = `${config.RPC_URL}${path}`;
  let lastError: ApiError | null = null;
  for (let attempt = 0; attempt <= config.MAX_RETRIES; attempt++) {
    try {
      const res = await fetchWithTimeout(url);
      return (await res.json()) as T;
    } catch (err) {
      lastError = err instanceof ApiError ? err : new ApiError(String(err));
      if (!lastError.retryable || attempt === config.MAX_RETRIES) break;
      await new Promise((r) => setTimeout(r, config.RETRY_DELAY_MS * 2 ** attempt));
    }
  }
  throw lastError!;
}

// ── Mock helpers ────────────────────────────────────────────────

const seedRand = (seed: string) => {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const randomChars = (rand: () => number, prefix: string, len: number) => {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let out = prefix;
  for (let i = 0; i < len; i++) out += chars[Math.floor(rand() * chars.length)];
  return out;
};

const delay = (ms = 120) => new Promise((r) => setTimeout(r, ms));

// ── ZOKA node response shapes ───────────────────────────────────

interface NodeBlock {
  hash: string;
  height: number;
  timestamp: number; // Unix seconds
  state_root: string;
  transactions_count: number;
  previous_hash?: string;
  prev_hash?: string;
  nonce?: number;
  size_bytes?: number;
  reward_atoms?: number;
  reward_zka?: number | string;
  difficulty?: number;
  difficulty_bits?: number;
}

interface NodeBlockTx {
  hash: string;
  sender: string;
  receiver: string;
  amount: number;
  nonce: number;
}

interface NodeTransaction {
  hash: string;
  sender: string;
  receiver: string;
  amount: number;
  nonce: number;
  status: string;
  timestamp?: number;
}

interface NodeAccount {
  address: string;
  balance?: number;
  nonce?: number;
  valid?: boolean;
}

const syntheticGenesisBlock = (): Block => ({
  height: 0,
  hash: "c0c75757a2502a98d60f3fedcc90541cc543c64dea51a741b2a72d02e94b1926",
  previousHash: "",
  timestamp: 0,
  difficulty: 0,
  nonce: 0,
  size: 0,
  txCount: 0,
  reward: 0,
  minerAddress: "",
  transactions: [],
  privateTransactions: [],
});

async function findPrivateTxInRecentBlocks(
  hash: string,
  lookback = 256,
): Promise<{ blockHeight: number; blockHash?: string } | null> {
  const { height } = await apiFetch<{ height: number }>("/chain/height");
  const from = Math.max(0, height - lookback + 1);
  const range = await apiFetch<{
    blocks?: Array<{ hash: string; height: number }>;
  }>(`/blocks/range/${from}/${height}`);

  for (const block of (range.blocks ?? []).slice().reverse()) {
    try {
      const privateData = await apiFetch<{
        private_tx_hashes?: string[];
      }>(`/blocks/${block.height}/private_tx_hashes`);
      if ((privateData.private_tx_hashes ?? []).includes(hash)) {
        return { blockHeight: block.height, blockHash: block.hash };
      }
    } catch { /* keep scanning */ }
  }

  return null;
}

// ── Network stats ───────────────────────────────────────────────

export async function getNetworkStats(): Promise<NetworkStats> {
  await ensureNetworkConfigLoaded();
  if (config.useMock) {
    await delay();
    return {
      height: 482931,
      difficulty: 18432.55,
      hashrate: 312.4,
      emission: 18421003.12,
      lastBlockTime: Date.now() - 14000,
      networkVersion: "0.1.0",
      mempoolSize: 2,
      privateTxsConfirmed: 1,
      minersOnline: 0,
      connectedPeers: 0,
      reportedHashrate: 0,
    };
  }

  const raw = await apiFetch<{
    height: number;
    difficulty: number;
    difficulty_bits?: number;
    hashrate_hs: number;
    emission_zka: number;
    last_block_time: number;
    network_version: string;
    connected_peers?: number;
    miners_online?: number;
    reported_hashrate_hps?: number;
  }>("/stats");

  let mempoolSize = 0;
  try {
    const mempool = await apiFetch<{ size?: number; pending_transactions?: number }>("/mempool/size");
    mempoolSize = mempool.size ?? mempool.pending_transactions ?? 0;
  } catch { /* optional */ }

  return {
    height: raw.height ?? 0,
    difficulty: raw.difficulty ?? raw.difficulty_bits ?? 0,
    hashrate: raw.hashrate_hs ?? 0,
    emission: raw.emission_zka ?? 0,
    lastBlockTime: raw.last_block_time ? raw.last_block_time * 1000 : 0,
    networkVersion: raw.network_version ?? "0.1.0",
    mempoolSize,
    minersOnline: raw.miners_online ?? 0,
    connectedPeers: raw.connected_peers ?? 0,
    reportedHashrate: raw.reported_hashrate_hps ?? 0,
  };
}

// Note: the home page builds its own metric sparklines by accumulating real
// /stats samples over time, so there is no fabricated metric-history endpoint.

// ── Mempool ─────────────────────────────────────────────────────
// Pending counts only. The public mempool is ~always empty on a private
// chain; the private count is a bare number (no amounts/parties leaked).

export async function getMempoolInfo(): Promise<{ publicPending: number; privatePending: number }> {
  await ensureNetworkConfigLoaded();
  if (config.useMock) return { publicPending: 0, privatePending: 0 };
  let publicPending = 0;
  let privatePending = 0;
  try {
    const m = await apiFetch<{ current_size?: number; size?: number; pending_transactions?: number }>(
      "/mempool/metrics",
    );
    publicPending = m.current_size ?? m.size ?? m.pending_transactions ?? 0;
  } catch { /* optional */ }
  try {
    const p = await apiFetch<{ count?: number }>("/private/pending");
    privatePending = p.count ?? 0;
  } catch { /* optional */ }
  return { publicPending, privatePending };
}

// ── Blocks ──────────────────────────────────────────────────────

export async function getBlock(heightOrHash: string | number): Promise<Block | null> {
  await ensureNetworkConfigLoaded();
  if (config.useMock) {
    await delay();
    const seed = String(heightOrHash);
    const rand = seedRand(seed);
    const height =
      typeof heightOrHash === "number"
        ? heightOrHash
        : 482000 + Math.floor(rand() * 5000);
    return {
      height,
      hash: randomChars(rand, "0x", 64),
      previousHash: randomChars(rand, "0x", 64),
      timestamp: Date.now() - Math.floor(rand() * 86400000),
      difficulty: 18000 + rand() * 1000,
      nonce: Math.floor(rand() * 2 ** 32),
      size: 2000 + Math.floor(rand() * 3000),
      txCount: 1 + Math.floor(rand() * 20),
      reward: 2.5,
      minerAddress: randomChars(rand, "zka", 60),
      transactions: Array.from({ length: 1 + Math.floor(rand() * 5) }, () =>
        randomChars(rand, "zka", 60),
      ),
    };
  }

  try {
    const isHash =
      typeof heightOrHash === "string" &&
      /^(0x)?[a-f0-9]{32,128}$/i.test(heightOrHash) &&
      !/^\d+$/.test(heightOrHash);
    const cleanHash =
      typeof heightOrHash === "string" && heightOrHash.startsWith("0x")
        ? heightOrHash.slice(2)
        : heightOrHash;
    const blockPath = isHash
      ? `/blocks/hash/${cleanHash}`
      : `/blocks/${heightOrHash}`;

    const raw = await apiFetch<NodeBlock>(blockPath);

    // Fetch tx hashes for this block
    let txHashes: string[] = [];
    try {
      const txData = await apiFetch<{ transactions: NodeBlockTx[] }>(
        `/blocks/${raw.height}/transactions`,
      );
      txHashes = txData.transactions.map((t) => t.hash);
    } catch { /* block may have no txs yet */ }

    let privateTxHashes: string[] = [];
    try {
      const privateData = await apiFetch<{ private_tx_hashes?: string[] }>(
        `/blocks/${raw.height}/private_tx_hashes`,
      );
      privateTxHashes = privateData.private_tx_hashes ?? [];
    } catch { /* optional */ }

    return {
      height: raw.height,
      hash: raw.hash,
      previousHash: raw.previous_hash ?? raw.prev_hash ?? "",
      timestamp: raw.timestamp * 1000,
      difficulty: raw.difficulty ?? raw.difficulty_bits ?? 0,
      nonce: raw.nonce ?? 0,
      size: raw.size_bytes ?? 0,
      txCount: raw.transactions_count,
      reward:
        raw.reward_zka !== undefined
          ? Number(raw.reward_zka)
          : raw.reward_atoms !== undefined
            ? raw.reward_atoms / 1_000_000
            : 0,
      minerAddress: "",
      transactions: txHashes,
      privateTransactions: privateTxHashes,
    };
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) {
      if (String(heightOrHash) === "0") return syntheticGenesisBlock();
      return null;
    }
    throw e;
  }
}

export async function getRecentBlocks(count = 10): Promise<Block[]> {
  await ensureNetworkConfigLoaded();
  if (config.useMock) {
    await delay();
    const blocks = await Promise.all(
      Array.from({ length: count }, (_, i) => getBlock(482931 - i)),
    );
    return blocks.filter(Boolean) as Block[];
  }

  const { height } = await apiFetch<{ height: number }>("/chain/height");
  if (height === 0) return [];

  const from = Math.max(0, height - count + 1);
  const raw = await apiFetch<{
    blocks: Array<{ hash: string; height: number; timestamp: number }>;
  }>(`/blocks/range/${from}/${height}`);

  // One extra call gives the private-tx count per block (hashes only, never
  // contents) so the list can flag private activity without N block fetches.
  const privateCountByHeight: Record<number, number> = {};
  try {
    const priv = await apiFetch<{
      blocks?: Array<{ height: number; private_tx_count?: number; private_tx_hashes?: string[] }>;
    }>(`/blocks/range/${from}/${height}/private_tx_hashes`);
    for (const b of priv.blocks ?? []) {
      privateCountByHeight[b.height] = b.private_tx_count ?? b.private_tx_hashes?.length ?? 0;
    }
  } catch { /* private counts are optional */ }

  return raw.blocks
    .slice()
    .reverse()
    .map((b) => ({
      height: b.height,
      hash: b.hash,
      previousHash: "",
      timestamp: b.timestamp * 1000,
      difficulty: 0,
      nonce: 0,
      size: 0,
      txCount: 0,
      reward: 0,
      minerAddress: "",
      transactions: [],
      privateTransactions: [],
      privateTxCount: privateCountByHeight[b.height] ?? 0,
    }));
}

// Recent private-tx activity: hashes anchored in recent blocks, newest first.
// Privacy-safe — exposes only the hash and the block it landed in, never
// amounts, parties or owners.
export async function getRecentPrivateActivity(count = 8): Promise<PrivateActivityItem[]> {
  await ensureNetworkConfigLoaded();
  if (config.useMock) return [];
  const { height } = await apiFetch<{ height: number }>("/chain/height");
  if (height === 0) return [];
  const lookback = 64;
  const from = Math.max(0, height - lookback + 1);
  const priv = await apiFetch<{
    blocks?: Array<{ height: number; private_tx_hashes?: string[] }>;
  }>(`/blocks/range/${from}/${height}/private_tx_hashes`);
  const items: PrivateActivityItem[] = [];
  for (const b of (priv.blocks ?? []).slice().reverse()) {
    for (const hash of b.private_tx_hashes ?? []) {
      items.push({ hash, blockHeight: b.height });
      if (items.length >= count) return items;
    }
  }
  return items;
}

// ── Transactions ────────────────────────────────────────────────

export async function getTransaction(hash: string): Promise<Transaction | null> {
  await ensureNetworkConfigLoaded();
  if (config.useMock) {
    await delay();
    const rand = seedRand(hash);
    return {
      hash,
      blockHeight: 482000 + Math.floor(rand() * 5000),
      blockHash: randomChars(rand, "0x", 64),
      timestamp: Date.now() - Math.floor(rand() * 86400000),
      status: "confirmed",
      amount: +(rand() * 50).toFixed(6),
      fee: +(rand() * 0.005).toFixed(6),
      from: randomChars(rand, "zka", 60),
      to: "shielded",
      ringSize: 8 + Math.floor(rand() * 8),
      size: 1800 + Math.floor(rand() * 1200),
      confirmations: Math.floor(rand() * 240) + 1,
      proof: randomChars(rand, "0x", 64),
    };
  }

  try {
    const raw = await apiFetch<NodeTransaction>(`/transactions/${hash}`);
    return {
      hash: raw.hash,
      blockHeight: 0,
      blockHash: "",
      timestamp: raw.timestamp ? raw.timestamp * 1000 : Date.now(),
      status: raw.status === "pending_in_mempool" ? "pending" : "confirmed",
      amount: 0,
      fee: 0,
      from: "shielded",
      to: "shielded",
      ringSize: 0,
      size: 0,
      confirmations: 0,
      proof: "",
    };
  } catch (e) {
    if (!(e instanceof ApiError) || e.status !== 404) throw e;
  }

  // Fallback: scan mempool for pending TXs not yet confirmed
  try {
    const mempool = await apiFetch<{ count?: number; pending?: NodeTransaction[] }>("/mempool/pending");
    const found = (mempool.pending ?? []).find((tx) => tx.hash === hash);
    if (found) {
      return {
        hash: found.hash,
        blockHeight: 0,
        blockHash: "",
        timestamp: found.timestamp ? found.timestamp * 1000 : Date.now(),
        status: "pending",
        amount: 0,
        fee: 0,
        from: "shielded",
        to: "shielded",
        ringSize: 0,
        size: 0,
        confirmations: 0,
        proof: "",
      };
    }
  } catch { /* mempool check is best-effort */ }

  return null;
}

export async function getSafeRecord(kind: SafeRecordKind, id: string): Promise<SafeRecord> {
  await ensureNetworkConfigLoaded();
  if (config.useMock) {
    await delay();
    return {
      kind,
      id,
      status: "unknown",
      note: "Mock mode cannot prove whether this private record exists.",
    };
  }

  if (kind === "private-tx" || kind === "hash") {
    try {
      const tx = await apiFetch<Record<string, unknown>>(`/private/tx/${id}`);
      const blockHeight =
        typeof tx.block_height === "number"
          ? tx.block_height
          : typeof tx.height === "number"
            ? tx.height
            : undefined;
      return {
        kind: "private-tx",
        id,
        status: "found",
        blockHeight,
        note: "Private transaction metadata found locally. Owners, balances and amounts remain hidden.",
      };
    } catch (e) {
      if (!(e instanceof ApiError) || e.status !== 404) throw e;
    }

    try {
      const found = await findPrivateTxInRecentBlocks(id);
      if (found) {
        return {
          kind: "private-tx",
          id,
          status: "found",
          blockHeight: found.blockHeight,
          note: "Private transaction hash is anchored in a recent block. Owners, balances and amounts remain hidden.",
        };
      }
    } catch { /* fall through to privacy-safe unknown */ }
  }

  return {
    kind,
    id,
    status: "unknown",
    note: "This explorer does not reveal owners, balances, amounts or address history for private records.",
  };
}

export async function getRecentTransactions(count = 10): Promise<Transaction[]> {
  await ensureNetworkConfigLoaded();
  if (config.useMock) {
    await delay();
    const rand = seedRand("recent-txs");
    return Array.from({ length: count }, () => {
      const hash = randomChars(rand, "zka", 60);
      return {
        hash,
        blockHeight: 482000 + Math.floor(rand() * 5000),
        blockHash: randomChars(rand, "0x", 64),
        timestamp: Date.now() - Math.floor(rand() * 86400000),
        status: "confirmed" as const,
        amount: +(rand() * 50).toFixed(6),
        fee: +(rand() * 0.005).toFixed(6),
        from: randomChars(rand, "zka", 60),
        to: "shielded",
        ringSize: 8 + Math.floor(rand() * 8),
        size: 1800 + Math.floor(rand() * 1200),
        confirmations: Math.floor(rand() * 240) + 1,
        proof: randomChars(rand, "0x", 64),
      };
    });
  }

  const raw = await apiFetch<{
    count: number;
    pending: NodeTransaction[];
  }>("/mempool/pending");

  return raw.pending.slice(0, count).map((tx) => ({
    hash: tx.hash,
    blockHeight: 0,
    blockHash: "",
    timestamp: tx.timestamp ? tx.timestamp * 1000 : Date.now(),
    status: "pending" as const,
    amount: 0,
    fee: 0,
    from: "shielded",
    to: "shielded",
    ringSize: 0,
    size: 0,
    confirmations: 0,
    proof: "",
  }));
}

// ── Addresses ───────────────────────────────────────────────────

export async function getAddress(addr: string): Promise<Address | null> {
  await ensureNetworkConfigLoaded();
  if (config.useMock) {
    await delay();
    const rand = seedRand(addr);
    return {
      address: addr,
      balance: +(rand() * 500).toFixed(6),
      totalReceived: +(rand() * 2000).toFixed(6),
      totalSent: +(rand() * 1500).toFixed(6),
      txCount: Math.floor(rand() * 200),
      firstSeen: Date.now() - Math.floor(rand() * 86400000 * 365),
      lastSeen: Date.now() - Math.floor(rand() * 86400000),
      transactions: Array.from({ length: 5 }, () => randomChars(rand, "zka", 60)),
    };
  }

  try {
    const raw = await apiFetch<NodeAccount>(`/accounts/${addr}`);
    return {
      address: raw.address,
      balance: 0,
      totalReceived: 0,
      totalSent: 0,
      txCount: 0,
      firstSeen: 0,
      lastSeen: 0,
      transactions: [],
    };
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return null;
    throw e;
  }
}

// zka1… addresses are ~100 chars; tx hashes start with zka but not zka1
const isZokaAddress = (s: string) =>
  /^zka1/i.test(s) && s.length >= 60;

const isHexLike = (s: string) => /^(0x)?[a-f0-9]{16,128}$/i.test(s);
const isLongHash = (s: string) => /^(0x)?[a-f0-9]{32,128}$/i.test(s);

function parseRecordQuery(q: string): SearchResult | null {
  const prefixed = q.match(/^(commitment|nullifier|root|private-tx|tx):(.+)$/i);
  if (prefixed) {
    const rawKind = prefixed[1].toLowerCase();
    const kind: SafeRecordKind = rawKind === "tx" ? "private-tx" : (rawKind as SafeRecordKind);
    const id = prefixed[2].trim();
    return {
      type: kind === "private-tx" ? "transaction" : "record",
      kind,
      id,
      label: `${kind} ${id.slice(0, 16)}...`,
    };
  }
  if (isHexLike(q) && q.length < 32) {
    return {
      type: "record",
      kind: "hash",
      id: q,
      label: `Record ${q.slice(0, 16)}...`,
    };
  }
  return null;
}

const classifyQuery = (q: string): SearchResult | null => {
  const record = parseRecordQuery(q);
  if (record) return record;
  if (/^\d+$/.test(q))
    return { type: "block", id: q, label: `Block #${q}` };
  if (isZokaAddress(q))
    return { type: "address", id: q, label: `Address ${q.slice(0, 16)}…` };
  if (/^zka/i.test(q))
    return { type: "transaction", id: q, label: `Tx ${q.slice(0, 16)}…` };
  if (isLongHash(q))
    return { type: "record", kind: "hash", id: q, label: `Hash ${q.slice(0, 16)}...` };
  if (/^0x/i.test(q))
    return { type: "block", id: q, label: `Block ${q.slice(0, 16)}…` };
  return null;
};

// ── Search ──────────────────────────────────────────────────────

export async function search(query: string): Promise<SearchResult | null> {
  await ensureNetworkConfigLoaded();
  const q = query.trim();
  const classified = classifyQuery(q);
  if (!classified) return null;

  if (!config.useMock && classified.type === "record" && classified.kind === "hash") {
    const clean = q.startsWith("0x") ? q.slice(2) : q;
    try {
      const block = await getBlock(clean);
      if (block) return { type: "block", id: clean, label: `Block ${clean.slice(0, 16)}...` };
    } catch { /* try tx next */ }
    try {
      const tx = await getTransaction(clean);
      if (tx) return { type: "transaction", id: clean, label: `Tx ${clean.slice(0, 16)}...` };
    } catch { /* safe fallback */ }
    try {
      const privateTx = await findPrivateTxInRecentBlocks(clean);
      if (privateTx) {
        return {
          type: "record",
          kind: "private-tx",
          id: clean,
          label: `Private tx ${clean.slice(0, 16)}...`,
        };
      }
    } catch { /* safe fallback */ }
  }

  return classified;
}

// ── Search suggestions (for autocomplete) ───────────────────────

export interface SearchSuggestion {
  type: "transaction" | "block" | "address" | "record";
  id: string;
  label: string;
  detail?: string;
  kind?: SafeRecordKind;
}

export async function getSuggestions(query: string): Promise<SearchSuggestion[]> {
  await ensureNetworkConfigLoaded();
  const q = query.trim();
  if (q.length < 2) return [];

  await delay(80);
  const suggestions: SearchSuggestion[] = [];

  if (/^\d+$/.test(q)) {
    suggestions.push({ type: "block", id: q, label: `Block #${q}`, detail: "Block height" });
    const n = parseInt(q, 10);
    if (n > 0)
      suggestions.push({ type: "block", id: String(n - 1), label: `Block #${n - 1}`, detail: "Previous block" });
    suggestions.push({ type: "block", id: String(n + 1), label: `Block #${n + 1}`, detail: "Next block" });
  } else if (isZokaAddress(q)) {
    suggestions.push({
      type: "address",
      id: q,
      label: `${q.slice(0, 20)}…`,
      detail: "🔒 Private address — no public history",
    });
  } else if (/^zka/i.test(q)) {
    suggestions.push({
      type: "transaction",
      id: q,
      label: `Tx ${q.slice(0, 16)}…`,
      detail: "Transaction hash",
    });
  } else if (/^(commitment|nullifier|root|private-tx|tx):/i.test(q)) {
    const parsed = parseRecordQuery(q);
    if (parsed) {
      suggestions.push({
        type: parsed.type,
        kind: parsed.kind,
        id: parsed.id,
        label: parsed.label,
        detail: parsed.kind === "private-tx" ? "Private tx hash" : "Private-safe record",
      });
    }
  } else if (isLongHash(q)) {
    suggestions.push({
      type: "record",
      kind: "hash",
      id: q,
      label: `Hash ${q.slice(0, 16)}...`,
      detail: "Block, tx, commitment, nullifier, or root",
    });
  } else if (/^0x/i.test(q)) {
    suggestions.push({ type: "block", id: q, label: `Block ${q.slice(0, 16)}…`, detail: "Block hash" });
  }

  return suggestions;
}
