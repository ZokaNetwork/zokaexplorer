import { FormEvent, useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowLeft, Eye, KeyRound, Loader2, Lock, ShieldCheck } from "lucide-react";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { scanMiningRewardsClientSide, type RewardScan } from "@/lib/api";

const SESSION_SCAN_KEY = "zoka_scan_key_for_history";

const formatZka = (atoms: number) =>
  (atoms / 1_000_000).toLocaleString(undefined, { maximumFractionDigits: 6 });

const cleanScanKey = (value: string) => value.trim().replace(/^0x/i, "");
const isValidScanKey = (value: string) => /^[a-f0-9]{32}$|^[a-f0-9]{64}$/i.test(value);

const ViewScanDetail = () => {
  const location = useLocation();
  const stateKey =
    typeof location.state === "object" && location.state && "scanKey" in location.state
      ? String((location.state as { scanKey?: string }).scanKey ?? "")
      : "";
  const initialKey = stateKey || sessionStorage.getItem(SESSION_SCAN_KEY) || "";
  const [scanKey, setScanKey] = useState(initialKey);
  const [scan, setScan] = useState<RewardScan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const runScan = async (rawKey: string) => {
    setError(null);
    setScan(null);
    const cleanKey = cleanScanKey(rawKey);
    if (!isValidScanKey(cleanKey)) {
      setError("La scan private key debe ser hex de 16 o 32 bytes.");
      return;
    }
    // The key stays in this tab only; it never goes to a server.
    sessionStorage.setItem(SESSION_SCAN_KEY, cleanKey);
    setScanKey(cleanKey);
    setLoading(true);
    try {
      setScan(await scanMiningRewardsClientSide(cleanKey));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "No se pudo escanear esta scan key.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialKey) void runScan(initialKey);
    // Run once for the key passed by the search page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    void runScan(scanKey);
  };

  return (
    <main className="relative flex min-h-screen flex-col overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0 bg-grid opacity-50" aria-hidden />
      <SiteHeader />

      <section className="relative z-10 mx-auto w-full max-w-4xl flex-1 px-6 pt-4 pb-12">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to search
        </Link>

        <div className="mt-10 flex flex-col items-center text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-border bg-card">
            <KeyRound className="h-8 w-8 text-signal" />
          </div>

          <h1 className="mt-6 text-lg font-semibold text-foreground">Mining rewards by scan key</h1>

          <p className="mt-3 max-w-2xl text-xs leading-relaxed text-muted-foreground">
            El escaneo corre <span className="text-foreground">100% en tu navegador</span>: la scan
            key nunca sale de este dispositivo. Deriva tu dirección privada y la compara contra los
            coinbases públicos de la cadena para encontrar tus recompensas de minería. (Las tx
            privadas recibidas todavía no se listan acá — vé tu wallet para el balance completo.)
          </p>

          <form onSubmit={onSubmit} className="mt-8 w-full rounded-xl border border-border bg-card p-6 text-left">
            <div className="flex items-start gap-3">
              <Lock className="mt-0.5 h-4 w-4 shrink-0 text-signal" />
              <div className="min-w-0 flex-1">
                <label htmlFor="scan-key-history" className="text-sm font-medium text-foreground">
                  Scan private key
                </label>
                <Input
                  id="scan-key-history"
                  value={scanKey}
                  onChange={(event) => setScanKey(event.target.value)}
                  placeholder="hex (32 o 64 caracteres)"
                  autoComplete="off"
                  spellCheck={false}
                  className="font-mono-tight mt-3 h-10 text-xs"
                />
                <Button type="submit" className="mt-4 h-9 w-full" disabled={loading}>
                  {loading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Eye className="mr-2 h-4 w-4" />
                  )}
                  Escanear recompensas
                </Button>
              </div>
            </div>
          </form>

          {error && (
            <div className="mt-4 w-full rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-left text-xs text-destructive-foreground">
              {error}
            </div>
          )}

          {scan && (
            <div className="mt-6 w-full rounded-xl border border-border bg-card text-left">
              <div className="border-b border-border px-5 py-4">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm font-medium text-foreground">
                    {scan.matches.length} coinbase(s) de minería
                  </p>
                  <p className="text-base font-semibold text-signal">
                    {formatZka(scan.total_amount_atoms)} ZKA
                  </p>
                </div>
                <p className="font-mono-tight mt-2 break-all text-[11px] text-muted-foreground">
                  {scan.address}
                </p>
                <p className="mt-2 inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <ShieldCheck className="h-3 w-3 text-signal" />
                  Escaneado client-side · {scan.blocks_scanned.toLocaleString()} bloques · key no enviada
                </p>
              </div>

              {scan.matches.length > 0 ? (
                <div className="divide-y divide-border">
                  {scan.matches.map((item) => {
                    const matured = scan.blocks_scanned >= item.unlock_height;
                    return (
                      <div key={item.height} className="flex items-center justify-between px-5 py-4">
                        <Link
                          to={`/block/${item.height}`}
                          className="font-mono-tight text-xs text-foreground hover:text-signal"
                        >
                          Block #{item.height.toLocaleString()}
                        </Link>
                        <div className="flex items-center gap-3">
                          <span
                            className={`text-[10px] uppercase tracking-[0.14em] ${
                              matured ? "text-signal/80" : "text-yellow-500/80"
                            }`}
                          >
                            {matured ? "matured" : `locks #${item.unlock_height.toLocaleString()}`}
                          </span>
                          <span className="text-sm font-semibold text-foreground">
                            {formatZka(item.amount_atoms)} ZKA
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="px-5 py-4 text-sm text-muted-foreground">
                  No se encontraron coinbases de minería para esta scan key en la cadena.
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      <SiteFooter />
    </main>
  );
};

export default ViewScanDetail;
