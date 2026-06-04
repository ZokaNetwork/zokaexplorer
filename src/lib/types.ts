// ─── Zoka Core Types ────────────────────────────────────────────
// These types define the shape of data from the real blockchain.
// When connecting to the real network, only the API service layer
// needs to change — components consume these types unchanged.

export interface NetworkStats {
  height: number;
  difficulty: number;       // PoW leading-zero bits
  hashrate: number;         // estimated network MH/s
  emission: number;         // total ZKA in circulation
  lastBlockTime: number;    // unix ms
  networkVersion: string;
  mempoolSize?: number;
  privateTxsConfirmed?: number;
  minersOnline?: number;
  connectedPeers?: number;
  reportedHashrate?: number;
}

export interface Block {
  height: number;
  hash: string;
  previousHash: string;
  timestamp: number;       // unix ms
  difficulty: number;
  nonce: number;
  size: number;            // bytes
  txCount: number;
  reward: number;          // ZKA
  minerAddress: string;
  transactions: string[];  // tx hashes
  privateTransactions?: string[]; // privacy-safe private tx hashes
  privateTxCount?: number; // count when hashes aren't fetched (list views)
}

// A privacy-safe pointer to a private tx anchored in a block. Only the hash
// and the block it landed in are public — never amounts, parties or owners.
export interface PrivateActivityItem {
  hash: string;
  blockHeight: number;
}

export interface Transaction {
  hash: string;
  blockHeight: number;
  blockHash: string;
  timestamp: number;
  status: "confirmed" | "pending" | "failed";
  amount: number;
  fee: number;
  from: string;
  to: string;              // "shielded" when hidden
  ringSize: number;
  size: number;            // bytes
  confirmations: number;
  proof: string;           // zk-SNARK proof hex
}

export interface Address {
  address: string;
  balance: number;
  totalReceived: number;
  totalSent: number;
  txCount: number;
  firstSeen: number;       // unix ms
  lastSeen: number;        // unix ms
  transactions: string[];  // tx hashes (most recent)
}

export interface SearchResult {
  type: "transaction" | "block" | "address" | "record";
  id: string;              // hash, height, or address
  label: string;           // short display text
  kind?: SafeRecordKind;
}

export type SafeRecordKind =
  | "commitment"
  | "nullifier"
  | "root"
  | "private-tx"
  | "hash";

export interface SafeRecord {
  kind: SafeRecordKind;
  id: string;
  status: "found" | "unknown";
  blockHeight?: number;
  timestamp?: number;
  note: string;
}

export type MetricKey = "height" | "difficulty" | "hashrate" | "emission" | "miners";

export interface MetricDataPoint {
  timestamp: number;
  value: number;
}
