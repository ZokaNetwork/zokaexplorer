import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, Menu, X, Download } from "lucide-react";
import {
  getActiveNetwork,
  setActiveNetwork,
  getNetworkConfig,
  getNetworks,
  onNetworkChange,
  type NetworkId,
} from "@/lib/config";

const ZSILENT_RELEASE =
  "https://github.com/ZokaNetwork/zsilent-core/releases/latest";

const SiteHeader = () => {
  const [, rerender] = useState(0);
  const [open, setOpen] = useState(false); // desktop network dropdown
  const [menuOpen, setMenuOpen] = useState(false); // mobile hamburger
  const ref = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsub = onNetworkChange(() => rerender((n) => n + 1));
    return () => {
      unsub();
    };
  }, []);

  // Close popovers on outside click
  useEffect(() => {
    if (!open && !menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (open && ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
      if (menuOpen && menuRef.current && !menuRef.current.contains(e.target as Node))
        setMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, menuOpen]);

  const active = getNetworkConfig();
  const networks = getNetworks();

  const handleSwitch = (id: NetworkId) => {
    setActiveNetwork(id);
    setOpen(false);
    setMenuOpen(false);
  };

  return (
    <header className="relative z-50 flex items-center justify-between px-6 py-6">
      <Link to="/" className="flex items-center gap-2.5">
        <div className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-card">
          <span className="font-mono-tight text-xs font-bold text-foreground">Z</span>
        </div>
        <span className="font-mono-tight text-sm tracking-tight text-foreground">
          zokaexplorer
        </span>
      </Link>

      {/* ---------- desktop cluster ---------- */}
      <div className="hidden items-center gap-4 text-xs text-muted-foreground md:flex">
        {/* Network deployment + switcher */}
        <div ref={ref} className="relative">
          <button
            onClick={() => setOpen((o) => !o)}
            className="flex items-center gap-2 rounded-md border border-border bg-card px-2.5 py-1.5 text-xs transition-colors hover:bg-accent/40"
          >
            <span className="relative flex h-1.5 w-1.5">
              <span className="pulse-dot absolute inline-flex h-1.5 w-1.5 rounded-full bg-signal" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-signal" />
            </span>
            <span className="text-foreground">{active.label}</span>
            {active.badge && (
              <span className="rounded bg-accent px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-accent-foreground">
                {active.badge}
              </span>
            )}
            <ChevronDown className="h-3 w-3 text-muted-foreground" />
          </button>

          {open && (
            <div className="absolute right-0 mt-1.5 w-48 rounded-lg border border-border bg-card shadow-lg">
              {networks.map((net) => (
                <button
                  key={net.id}
                  onClick={() => handleSwitch(net.id)}
                  className={`flex w-full items-center justify-between px-3 py-2.5 text-left text-xs transition-colors hover:bg-accent/40 first:rounded-t-lg last:rounded-b-lg ${
                    net.id === getActiveNetwork()
                      ? "text-foreground"
                      : "text-muted-foreground"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        net.id === getActiveNetwork()
                          ? "bg-signal"
                          : "bg-muted-foreground/40"
                      }`}
                    />
                    {net.label}
                    {net.badge && (
                      <span className="rounded bg-accent px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-accent-foreground">
                        {net.badge}
                      </span>
                    )}
                  </span>
                  <span className="font-mono-tight text-muted-foreground">
                    {net.version}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        <span className="h-4 w-px bg-border" />
        <span className="font-mono-tight">{active.version}</span>

        {/* Novedad: download the latest ZSilent */}
        <a
          href={ZSILENT_RELEASE}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 rounded-md border border-signal/40 bg-signal/10 px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-signal/20"
        >
          <span className="rounded bg-signal px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-[hsl(var(--signal-foreground))]">
            New
          </span>
          <Download className="h-3.5 w-3.5 text-signal" />
          <span>ZSilent 1.8.2</span>
        </a>
      </div>

      {/* ---------- mobile hamburger ---------- */}
      <div ref={menuRef} className="relative md:hidden">
        <button
          onClick={() => setMenuOpen((o) => !o)}
          aria-label="Menu"
          aria-expanded={menuOpen}
          className="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-card text-foreground transition-colors hover:bg-accent/40"
        >
          {menuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </button>

        {menuOpen && (
          <div className="absolute right-0 mt-2 w-64 rounded-lg border border-border bg-card p-1.5 shadow-xl shadow-black/40">
            {/* Novedad: prominent ZSilent download */}
            <a
              href={ZSILENT_RELEASE}
              target="_blank"
              rel="noreferrer"
              className="mb-1.5 flex items-center gap-2 rounded-md border border-signal/40 bg-signal/10 px-3 py-2.5 text-xs font-medium text-foreground transition-colors hover:bg-signal/20"
            >
              <span className="rounded bg-signal px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-[hsl(var(--signal-foreground))]">
                New
              </span>
              <Download className="h-3.5 w-3.5 text-signal" />
              <span>Download ZSilent 1.8.2</span>
            </a>

            <div className="px-2 pb-1 pt-1.5 text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
              Network
            </div>
            {networks.map((net) => (
              <button
                key={net.id}
                onClick={() => handleSwitch(net.id)}
                className={`flex w-full items-center justify-between rounded-md px-2.5 py-2 text-left text-xs transition-colors hover:bg-accent/40 ${
                  net.id === getActiveNetwork()
                    ? "text-foreground"
                    : "text-muted-foreground"
                }`}
              >
                <span className="flex items-center gap-2">
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      net.id === getActiveNetwork()
                        ? "bg-signal"
                        : "bg-muted-foreground/40"
                    }`}
                  />
                  {net.label}
                  {net.badge && (
                    <span className="rounded bg-accent px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-accent-foreground">
                      {net.badge}
                    </span>
                  )}
                </span>
                <span className="font-mono-tight text-muted-foreground">
                  {net.version}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </header>
  );
};

export default SiteHeader;
