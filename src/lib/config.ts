export type NetworkId = "mainnet" | "testnet";

export interface NetworkConfig {
  id: NetworkId;
  label: string;
  version: string;
  badge?: string;
  rpcUrl: string;
  // Secondary RPC node tried only when every retry against rpcUrl fails.
  // Keeps the explorer up when the primary node (BOOT) has a momentary
  // hiccup (restart, log cleanup, sync) — mirrors the primary+fallback
  // setup the wallets (ZSilent/ZKAPriv) already use.
  rpcUrlFallback?: string;
  useMock: boolean;
}

type RuntimeNetwork = {
  id?: NetworkId;
  label?: string;
  version?: string;
  rpc_url?: string;
  rpcUrl?: string;
  rpc_url_fallback?: string;
  rpcUrlFallback?: string;
  badge?: string;
};

type RuntimeConfig = {
  active_network?: NetworkId;
  networks?: RuntimeNetwork[];
};

// The explorer reads a published static view of the chain, not a live RPC.
//
// It used to proxy every request through a serverless function to a central
// RPC host. That host was decommissioned, and the per-request function calls
// are what exhausted the hosting plan — so the proxy died twice over. A node
// now publishes plain JSON on a schedule and this reads the files.
//
// This is a *view*, not an authority: it carries a published_at timestamp so
// the UI can show its age instead of implying it is live. For data with no
// intermediary at all, run ZSilent and read your own node.
const PUBLISHED_DATA_URL = "https://zokanetwork.github.io/ZokaNetwork";

const envRpcUrl = import.meta.env.DEV
  ? (import.meta.env.VITE_RPC_URL_MAINNET || import.meta.env.VITE_RPC_URL || PUBLISHED_DATA_URL)
  : PUBLISHED_DATA_URL;
const envRpcUrlFallback = import.meta.env.DEV
  ? (import.meta.env.VITE_RPC_URL_MAINNET_FALLBACK || "")
  : "";

const NETWORKS: Record<NetworkId, NetworkConfig> = {
  mainnet: {
    id: "mainnet",
    label: "Mainnet Zenith",
    version: "v1.8.2",
    badge: "Zenith",
    rpcUrl: envRpcUrl,
    rpcUrlFallback: envRpcUrlFallback,
    get useMock() {
      return !this.rpcUrl;
    },
  },
  testnet: {
    id: "testnet",
    label: "Testnet",
    version: "v0.1.0",
    rpcUrl: import.meta.env.VITE_RPC_URL_TESTNET || "",
    get useMock() {
      return !this.rpcUrl;
    },
  },
};

const storage = typeof localStorage !== "undefined" && localStorage.getItem
  ? localStorage
  : null;

let _activeNetwork: NetworkId =
  (storage?.getItem("zoka_network") as NetworkId | null) || "mainnet";
let configLoadStarted: Promise<void> | null = null;

const listeners = new Set<() => void>();

export function getActiveNetwork(): NetworkId {
  return _activeNetwork;
}

export function setActiveNetwork(id: NetworkId) {
  _activeNetwork = NETWORKS[id] ? id : "mainnet";
  storage?.setItem("zoka_network", _activeNetwork);
  listeners.forEach((fn) => fn());
}

export function onNetworkChange(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function getNetworkConfig(): NetworkConfig {
  return NETWORKS[_activeNetwork];
}

export function getNetworks(): NetworkConfig[] {
  return Object.values(NETWORKS).filter((network) => network.rpcUrl || network.id === "mainnet");
}

export async function ensureNetworkConfigLoaded(): Promise<void> {
  if (!configLoadStarted) {
    configLoadStarted = loadRuntimeNetworkConfig();
  }
  return configLoadStarted;
}

async function loadRuntimeNetworkConfig(): Promise<void> {
  try {
    const res = await fetch("/zoka-network.json", { cache: "no-store" });
    if (!res.ok) return;
    const runtime = (await res.json()) as RuntimeConfig;
    for (const network of runtime.networks ?? []) {
      const id = network.id ?? "mainnet";
      if (!NETWORKS[id]) continue;
      NETWORKS[id] = {
        ...NETWORKS[id],
        label: network.label || NETWORKS[id].label,
        version: network.version || NETWORKS[id].version,
        badge: network.badge,
        rpcUrl: network.rpc_url || network.rpcUrl || NETWORKS[id].rpcUrl,
        rpcUrlFallback:
          network.rpc_url_fallback || network.rpcUrlFallback || NETWORKS[id].rpcUrlFallback,
      };
    }
    if (runtime.active_network && NETWORKS[runtime.active_network]) {
      _activeNetwork = runtime.active_network;
      storage?.setItem("zoka_network", _activeNetwork);
    }
    listeners.forEach((fn) => fn());
  } catch {
    // A missing runtime config is valid; deployments may use VITE_* env vars.
  }
}

export const config = {
  get RPC_URL() {
    return getNetworkConfig().rpcUrl;
  },
  get RPC_URL_FALLBACK() {
    return getNetworkConfig().rpcUrlFallback || "";
  },
  get useMock() {
    return getNetworkConfig().useMock;
  },
  TIMEOUT_MS: 8000,
  MAX_RETRIES: 3,
  RETRY_DELAY_MS: 1000,
  get NETWORK_NAME() {
    return getNetworkConfig().label;
  },
  get NETWORK_VERSION() {
    return getNetworkConfig().version;
  },
} as const;
