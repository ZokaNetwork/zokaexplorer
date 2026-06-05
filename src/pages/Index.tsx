import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowUpRight,
  Box,
  CircleDot,
  Clock3,
  Hash,
  Lock,
  Search,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import MetricSparkline from "@/components/MetricSparkline";
import { getActiveNetwork, getNetworkConfig, onNetworkChange } from "@/lib/config";
import {
  getMempoolInfo,
  getNetworkStats,
  getRecentBlocks,
  getRecentPrivateActivity,
  getSuggestions,
  isScanKeyLikeQuery,
  search,
  type SearchSuggestion,
} from "@/lib/api";
import type { Block as ChainBlock, NetworkStats, PrivateActivityItem } from "@/lib/types";

const formatNumber = (n: number) =>
  n.toLocaleString("en-US", { maximumFractionDigits: 2 });

const formatHashrate = (hs: number | undefined | null): string => {
  if (hs == null || Number.isNaN(hs) || hs <= 0) return "-";
  if (hs >= 1_000_000_000_000) return `${formatNumber(hs / 1_000_000_000_000)} TH/s`;
  if (hs >= 1_000_000_000) return `${formatNumber(hs / 1_000_000_000)} GH/s`;
  if (hs >= 1_000_000) return `${formatNumber(hs / 1_000_000)} MH/s`;
  if (hs >= 1_000) return `${formatNumber(hs / 1_000)} KH/s`;
  return `${formatNumber(hs)} H/s`;
};

const formatAge = (ms: number) => {
  if (!ms) return "-";
  const seconds = Math.max(0, Math.floor((Date.now() - ms) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  return `${Math.floor(minutes / 60)}h ago`;
};

const HISTORY_LEN = 30;

const METRIC_COLORS = [
  "hsl(142, 60%, 45%)",
  "hsl(220, 60%, 55%)",
  "hsl(35, 80%, 55%)",
  "hsl(280, 50%, 60%)",
  "hsl(190, 65%, 50%)",
  "hsl(0, 0%, 72%)",
  "hsl(50, 80%, 55%)",
];

const TYPE_ICONS: Record<string, typeof Box> = {
  block: Box,
  transaction: Hash,
  address: Wallet,
  record: CircleDot,
};

const Index = () => {
  const [query, setQuery] = useState("");
  const [blockHeightInput, setBlockHeightInput] = useState("");
  const [stats, setStats] = useState<NetworkStats | null>(null);
  const [recentBlocks, setRecentBlocks] = useState<ChainBlock[]>([]);
  const [privateActivity, setPrivateActivity] = useState<PrivateActivityItem[]>([]);
  const [mempool, setMempool] = useState({ publicPending: 0, privatePending: 0 });
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(-1);
  const [network, setNetwork] = useState(getActiveNetwork);
  const historyRef = useRef<Record<string, number[]>>({
    height: [],
    lastBlockAge: [],
    difficulty: [],
    hashrate: [],
    emission: [],
    miners: [],
  });
  const suggestionsRef = useRef<HTMLFormElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const navigate = useNavigate();

  useEffect(() => {
    const unsub = onNetworkChange(() => setNetwork(getActiveNetwork()));
    return unsub;
  }, []);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [sample, blocks, activity, mem] = await Promise.all([
          getNetworkStats(),
          getRecentBlocks(5),
          getRecentPrivateActivity(6).catch(() => [] as PrivateActivityItem[]),
          getMempoolInfo().catch(() => ({ publicPending: 0, privatePending: 0 })),
        ]);
        setStats(sample);
        setRecentBlocks(blocks);
        setPrivateActivity(activity);
        setMempool(mem);
        const h = historyRef.current;
        const push = (key: keyof typeof h, value: number) => {
          h[key] = [...h[key].slice(-HISTORY_LEN + 1), value];
        };
        push("height", sample.height);
        push("lastBlockAge", Math.max(0, Math.floor((Date.now() - sample.lastBlockTime) / 1000)));
        push("difficulty", sample.difficulty);
        push("hashrate", sample.hashrate);
        push("emission", sample.emission);
        push("miners", sample.minersOnline ?? 0);
      } catch {
        // Keep the last good sample.
      }
    };
    fetchStats();
    const id = setInterval(fetchStats, 8000);
    return () => clearInterval(id);
  }, [network]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const fetchSuggestions = useCallback((q: string) => {
    clearTimeout(debounceRef.current);
    if (q.trim().length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      try {
        const results = await getSuggestions(q);
        setSuggestions(results);
        setShowSuggestions(results.length > 0);
        setSelectedIdx(-1);
      } catch {
        setSuggestions([]);
      }
    }, 150);
  }, []);

  const navigateToResult = (result: {
    type: SearchSuggestion["type"];
    id: string;
    kind?: SearchSuggestion["kind"];
  }) => {
    setShowSuggestions(false);
    if (result.type === "transaction") navigate(`/tx/${encodeURIComponent(result.id)}`);
    if (result.type === "block") navigate(`/block/${encodeURIComponent(result.id)}`);
    if (result.type === "address") navigate(`/address/${encodeURIComponent(result.id)}`);
    if (result.type === "record") {
      navigate(`/record/${result.kind ?? "hash"}/${encodeURIComponent(result.id)}`);
    }
  };

  const handleSearch = async (e: FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    setShowSuggestions(false);
    if (!q) {
      toast({
        title: "Enter a search term",
        description: "Search block height, hash, tx hash, commitment, nullifier, root, or address.",
      });
      return;
    }

    try {
      const result = await search(q);
      if (!result) {
        if (isScanKeyLikeQuery(q)) {
          toast({
            title: "Scan private key detected",
            description: "A scan key cannot be searched alone. Open the zpriv address page and paste it in Scan private key.",
            variant: "destructive",
          });
          return;
        }
        toast({
          title: "Not found",
          description: "No safe public record matched that query.",
          variant: "destructive",
        });
        return;
      }
      navigateToResult(result);
    } catch {
      toast({
        title: "Network error",
        description: "Could not reach the node API.",
        variant: "destructive",
      });
    }
  };

  const openBlockHeight = (height: number) => {
    if (!Number.isInteger(height) || height < 0) {
      toast({
        title: "Invalid block height",
        description: "Enter a non-negative block height.",
        variant: "destructive",
      });
      return;
    }
    if (stats && height > stats.height) {
      toast({
        title: "Block not reached",
        description: `Current height is ${stats.height.toLocaleString()}.`,
        variant: "destructive",
      });
      return;
    }
    navigate(`/block/${height}`);
  };

  const handleBlockLookup = (e: FormEvent) => {
    e.preventDefault();
    const raw = blockHeightInput.trim();
    if (!/^\d+$/.test(raw)) {
      toast({
        title: "Invalid block height",
        description: "Enter a block number between 0 and the current height.",
        variant: "destructive",
      });
      return;
    }
    openBlockHeight(Number(raw));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIdx((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && selectedIdx >= 0) {
      e.preventDefault();
      navigateToResult(suggestions[selectedIdx]);
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  };

  const h = historyRef.current;
  const pad = (arr: number[], fallback: number) =>
    arr.length >= HISTORY_LEN
      ? arr
      : [...Array(HISTORY_LEN - arr.length).fill(fallback), ...arr];

  const metrics = [
    {
      label: "Height",
      value: stats ? formatNumber(stats.height) : "-",
      history: pad(h.height, stats?.height ?? 0),
    },
    {
      label: "Last block",
      value: stats ? formatAge(stats.lastBlockTime) : "-",
      history: pad(h.lastBlockAge, 0),
    },
    {
      label: "Difficulty",
      value: stats ? formatNumber(stats.difficulty) : "-",
      history: pad(h.difficulty, stats?.difficulty ?? 0),
    },
    {
      label: "Hashrate",
      value: stats ? formatHashrate(stats.hashrate) : "-",
      history: pad(h.hashrate, stats?.hashrate ?? 0),
    },
    {
      label: "Emission",
      value: stats ? `${formatNumber(stats.emission)} ZKA` : "-",
      history: pad(h.emission, stats?.emission ?? 0),
    },
    {
      label: "Miners",
      value: stats ? formatNumber(stats.minersOnline ?? 0) : "-",
      history: pad(h.miners, stats?.minersOnline ?? 0),
    },
  ];
  const activeNetwork = getNetworkConfig();

  // B4: average block time, derived from the spread of recent block timestamps.
  const avgBlockSecs = (() => {
    const ts = recentBlocks.map((b) => b.timestamp).filter((t) => t > 0).sort((a, b) => b - a);
    if (ts.length < 2) return null;
    return Math.round((ts[0] - ts[ts.length - 1]) / 1000 / (ts.length - 1));
  })();
  const pendingTotal = mempool.publicPending + mempool.privatePending;

  return (
    <main className="relative flex min-h-screen flex-col overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0 bg-grid opacity-40" aria-hidden />
      <SiteHeader />

      <section className="relative z-10 mx-auto w-full max-w-5xl px-6 pt-4">
        <div className="mb-2 flex items-center justify-between gap-3 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
          <span>{activeNetwork.label} metrics</span>
          <span>{activeNetwork.rpcUrl ? "RPC linked" : "mock mode"}</span>
        </div>
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border md:grid-cols-6">
          {metrics.map((metric, idx) => (
            <div key={metric.label} className="bg-card px-4 py-4">
              <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                {metric.label}
              </div>
              <div className="font-mono-tight mt-1.5 text-lg text-foreground">
                {metric.value}
              </div>
              <div className="mt-3 h-8 opacity-80">
                <MetricSparkline
                  data={metric.history}
                  color={METRIC_COLORS[idx]}
                  width={128}
                  height={32}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="relative z-10 mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center px-6 py-14">
        <div className="mx-auto mb-7 flex h-14 w-14 items-center justify-center rounded-lg border border-border bg-card">
          <ShieldCheck className="h-6 w-6 text-signal" />
        </div>

        <p className="text-center text-xs uppercase tracking-[0.2em] text-muted-foreground">
          ZOKA private explorer
        </p>

        <form onSubmit={handleSearch} className="relative mx-auto mt-7 w-full" ref={suggestionsRef}>
          <div className="flex items-center gap-2 rounded-lg border border-border bg-card p-1.5 pl-4 shadow-lg shadow-black/30 transition-all focus-within:border-muted-foreground/40">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                fetchSuggestions(e.target.value);
              }}
              onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
              onKeyDown={handleKeyDown}
              placeholder="Search height, block hash, tx hash, commitment, nullifier, root..."
              spellCheck={false}
              autoComplete="off"
              className="font-mono-tight w-full bg-transparent py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
              aria-label="Search"
            />
            <Button type="submit" size="sm" className="h-9 rounded-md bg-signal px-4 text-[hsl(var(--signal-foreground))] hover:bg-signal/90">
              Search
              <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
            </Button>
          </div>

          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-lg border border-border bg-card shadow-xl shadow-black/40">
              {suggestions.map((s, i) => {
                const Icon = TYPE_ICONS[s.type] || Hash;
                return (
                  <button
                    key={`${s.type}-${s.id}-${i}`}
                    type="button"
                    onClick={() => navigateToResult(s)}
                    className={`flex w-full items-center gap-3 px-4 py-3 text-left text-sm transition-colors hover:bg-accent/50 ${
                      i === selectedIdx ? "bg-accent/50" : ""
                    } ${i > 0 ? "border-t border-border" : ""}`}
                  >
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border bg-background">
                      <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-mono-tight truncate text-sm text-foreground">{s.label}</div>
                      {s.detail && (
                        <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                          {s.detail}
                        </div>
                      )}
                    </div>
                    <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  </button>
                );
              })}
            </div>
          )}
        </form>

        <div className="mt-5 grid gap-2 sm:grid-cols-3">
          {[
            { icon: Box, text: "Blocks and tx hashes" },
            { icon: Lock, text: "No balances or address history" },
            { icon: Clock3, text: `${activeNetwork.label} status` },
          ].map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-center gap-2 rounded-md border border-border bg-card/60 px-3 py-2 text-xs text-muted-foreground">
              <Icon className="h-3.5 w-3.5 shrink-0" />
              <span>{text}</span>
            </div>
          ))}
        </div>
      </section>

      {pendingTotal > 0 && (
        <section className="relative z-10 mx-auto w-full max-w-5xl px-6 pb-2">
          <div className="flex items-center justify-between rounded-lg border border-border bg-card/60 px-4 py-2.5 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-2 uppercase tracking-[0.16em]">
              <Clock3 className="h-3 w-3 text-yellow-500/70" /> Mempool · pending
            </span>
            <span className="font-mono-tight">
              {mempool.privatePending} private
              {mempool.publicPending > 0 ? ` · ${mempool.publicPending} public` : ""}
            </span>
          </div>
        </section>
      )}

      {privateActivity.length > 0 && (
        <section className="relative z-10 mx-auto w-full max-w-5xl px-6 pb-6">
          <div className="flex items-center justify-between border-b border-border pb-2">
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              <Lock className="h-3 w-3 text-signal" />
              Recent private activity
            </div>
            <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              hash + block only
            </div>
          </div>
          <div className="divide-y divide-border">
            {privateActivity.map((item) => (
              <Link
                key={item.hash}
                to={`/record/private-tx/${encodeURIComponent(item.hash)}`}
                className="grid grid-cols-[64px_1fr_auto] items-center gap-3 py-3 text-sm transition-colors hover:bg-accent/20"
              >
                <span className="font-mono-tight text-signal">#{item.blockHeight.toLocaleString()}</span>
                <span className="font-mono-tight truncate text-muted-foreground">
                  {item.hash}
                </span>
                <span className="text-xs text-muted-foreground">view</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="relative z-10 mx-auto w-full max-w-5xl px-6 pb-10">
        <div className="flex items-center justify-between border-b border-border pb-2">
          <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            Latest blocks
          </div>
          <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            {avgBlockSecs != null ? `~${avgBlockSecs}s avg · ` : ""}privacy-safe
          </div>
        </div>
        <div className="divide-y divide-border">
          {recentBlocks.map((block) => (
            <Link
              key={block.hash}
              to={`/block/${block.height}`}
              className="grid grid-cols-[72px_1fr_auto] items-center gap-3 py-3 text-sm transition-colors hover:bg-accent/20"
            >
              <span className="font-mono-tight text-signal">
                #{block.height.toLocaleString()}
              </span>
              <span className="font-mono-tight truncate text-muted-foreground">
                {block.hash}
              </span>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                {(block.privateTxCount ?? 0) > 0 && (
                  <span className="inline-flex items-center gap-1 text-signal/80" title="private transactions">
                    <Lock className="h-3 w-3" />
                    {block.privateTxCount}
                  </span>
                )}
                <span>{formatAge(block.timestamp)}</span>
              </div>
            </Link>
          ))}
          {recentBlocks.length === 0 && (
            <div className="py-3 text-sm text-muted-foreground">No recent blocks available</div>
          )}
        </div>

        <div className="mt-8 border-t border-border pt-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                Block height
              </div>
              <div className="font-mono-tight mt-1 text-sm text-muted-foreground">
                0 - {stats ? stats.height.toLocaleString() : "current"}
              </div>
            </div>
            <form onSubmit={handleBlockLookup} className="flex w-full gap-2 md:max-w-sm">
              <input
                value={blockHeightInput}
                onChange={(e) => setBlockHeightInput(e.target.value.replace(/[^\d]/g, ""))}
                inputMode="numeric"
                min={0}
                max={stats?.height}
                placeholder="Height"
                className="font-mono-tight h-10 min-w-0 flex-1 rounded-md border border-border bg-card px-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-ring"
                aria-label="Block height"
              />
              <Button type="submit" size="sm" className="h-10 rounded-md bg-signal px-4 text-[hsl(var(--signal-foreground))] hover:bg-signal/90">
                Open
                <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
              </Button>
            </form>
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
};

export default Index;
