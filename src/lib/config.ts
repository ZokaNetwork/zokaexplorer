export type NetworkId = "mainnet" | "testnet";

export interface NetworkConfig {
  id: NetworkId;
  label: string;
  version: string;
  badge?: string;
  rpcUrl: string;
  useMock: boolean;
}

type RuntimeNetwork = {
  id?: NetworkId;
  label?: string;
  version?: string;
  rpc_url?: string;
  rpcUrl?: string;
  badge?: string;
};

type RuntimeConfig = {
  active_network?: NetworkId;
  networks?: RuntimeNetwork[];
};

const envRpcUrl =
  import.meta.env.VITE_RPC_URL_MAINNET ||
  import.meta.env.VITE_RPC_URL ||
  (import.meta.env.DEV ? "/rpc" : "");

const NETWORKS: Record<NetworkId, NetworkConfig> = {
  mainnet: {
    id: "mainnet",
    label: "Mainnet",
    version: "v0.1.0",
    rpcUrl: envRpcUrl,
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

let _activeNetwork: NetworkId =
  (localStorage.getItem("zoka_network") as NetworkId | null) || "mainnet";
let configLoadStarted: Promise<void> | null = null;

const listeners = new Set<() => void>();

export function getActiveNetwork(): NetworkId {
  return _activeNetwork;
}

export function setActiveNetwork(id: NetworkId) {
  _activeNetwork = NETWORKS[id] ? id : "mainnet";
  localStorage.setItem("zoka_network", _activeNetwork);
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
      };
    }
    if (runtime.active_network && NETWORKS[runtime.active_network]) {
      _activeNetwork = runtime.active_network;
      localStorage.setItem("zoka_network", _activeNetwork);
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
