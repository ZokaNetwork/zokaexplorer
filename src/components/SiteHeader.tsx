import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import {
  getActiveNetwork,
  setActiveNetwork,
  getNetworkConfig,
  getNetworks,
  onNetworkChange,
  type NetworkId,
} from "@/lib/config";

const SiteHeader = () => {
  const [, rerender] = useState(0);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsub = onNetworkChange(() => rerender((n) => n + 1));
    return () => { unsub(); };
  }, []);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const active = getNetworkConfig();
  const networks = getNetworks();

  const handleSwitch = (id: NetworkId) => {
    setActiveNetwork(id);
    setOpen(false);
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

      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        {/* Network switcher */}
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
                        net.id === getActiveNetwork() ? "bg-signal" : "bg-muted-foreground/40"
                      }`}
                    />
                    {net.label}
                    {net.badge && (
                      <span className="rounded bg-accent px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-accent-foreground">
                        {net.badge}
                      </span>
                    )}
                  </span>
                  <span className="font-mono-tight text-muted-foreground">{net.version}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <span className="h-4 w-px bg-border" />
        <span className="font-mono-tight">{active.version}</span>
      </div>
    </header>
  );
};

export default SiteHeader;
