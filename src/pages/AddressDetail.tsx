import { FormEvent, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Eye, KeyRound, Loader2, Lock, ShieldCheck } from "lucide-react";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { scanPrivateAddress } from "@/lib/api";
import type { PrivateViewScan } from "@/lib/types";

const formatZka = (atoms: number) => (atoms / 1_000_000).toLocaleString(undefined, {
  maximumFractionDigits: 6,
});

const shortHash = (value: string) =>
  value.length > 24 ? `${value.slice(0, 12)}...${value.slice(-10)}` : value;

const AddressDetail = () => {
  const { address: addr = "" } = useParams();
  const [scanKey, setScanKey] = useState("");
  const [scan, setScan] = useState<PrivateViewScan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onScan = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setScan(null);
    const cleanKey = scanKey.trim().replace(/^0x/i, "");
    if (!/^[a-f0-9]{32}$|^[a-f0-9]{64}$/i.test(cleanKey)) {
      setError("La scan private key debe ser hex de 16 o 32 bytes.");
      return;
    }
    setLoading(true);
    try {
      setScan(await scanPrivateAddress(addr, cleanKey));
    } catch (e: any) {
      setError(e?.message || "No se pudo escanear esta direccion.");
    } finally {
      setLoading(false);
    }
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
            <ShieldCheck className="h-8 w-8 text-signal" />
          </div>

          <h1 className="mt-6 text-lg font-semibold text-foreground">
            Private Address
          </h1>

          <p className="font-mono-tight mt-3 max-w-2xl break-all text-xs leading-relaxed text-muted-foreground">
            {addr}
          </p>

          <div className="mt-8 grid w-full gap-4 md:grid-cols-[0.95fr_1.05fr]">
            <div className="rounded-xl border border-border bg-card p-6 text-left">
              <div className="flex items-start gap-3">
                <Lock className="mt-0.5 h-4 w-4 shrink-0 text-signal" />
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Direccion privada valida
                  </p>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                    El historial no es publico. Con la scan private key el nodo
                    puede detectar outputs de esta direccion y revelar montos
                    recibidos, pero no puede gastar fondos.
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={onScan} className="rounded-xl border border-border bg-card p-6 text-left">
              <div className="flex items-start gap-3">
                <KeyRound className="mt-0.5 h-4 w-4 shrink-0 text-signal" />
                <div className="min-w-0 flex-1">
                  <label htmlFor="scan-key" className="text-sm font-medium text-foreground">
                    Scan private key
                  </label>
                  <Input
                    id="scan-key"
                    value={scanKey}
                    onChange={(event) => setScanKey(event.target.value)}
                    placeholder="hex"
                    autoComplete="off"
                    spellCheck={false}
                    className="font-mono-tight mt-3 h-10 text-xs"
                  />
                  <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                    Usala en un explorer local o privado. Una scan key permite
                    ver tus entradas, aunque no firmar gastos.
                  </p>
                  <Button type="submit" className="mt-4 h-9 w-full" disabled={loading}>
                    {loading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Eye className="mr-2 h-4 w-4" />
                    )}
                    Escanear outputs
                  </Button>
                </div>
              </div>
            </form>
          </div>

          {error && (
            <div className="mt-4 w-full rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-left text-xs text-destructive-foreground">
              {error}
            </div>
          )}

          {scan && (
            <div className="mt-6 w-full rounded-xl border border-border bg-card text-left">
              <div className="flex flex-col gap-1 border-b border-border px-5 py-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {scan.matching_outputs} outputs encontrados
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {scan.scanned_transactions} private tx archivadas escaneadas
                  </p>
                </div>
                <p className="text-sm font-semibold text-signal">
                  {formatZka(scan.total_amount_atoms)} ZKA
                </p>
              </div>

              {scan.matches.length > 0 ? (
                <div className="divide-y divide-border">
                  {scan.matches.map((item) => (
                    <div key={`${item.tx_hash}:${item.output_id}`} className="px-5 py-4">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <Link
                          to={`/record/private-tx/${encodeURIComponent(item.tx_hash)}`}
                          className="font-mono-tight text-xs text-foreground hover:text-signal"
                        >
                          {shortHash(item.tx_hash)}
                        </Link>
                        <span className="text-sm font-semibold text-foreground">
                          {formatZka(item.amount)} {item.asset_tag || "ZKA"}
                        </span>
                      </div>
                      <div className="font-mono-tight mt-2 grid gap-1 text-[11px] text-muted-foreground sm:grid-cols-2">
                        <span className="truncate">output {item.output_index}</span>
                        <span className="truncate">commitment {shortHash(item.commitment)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="px-5 py-4 text-sm text-muted-foreground">
                  No hay outputs para esta direccion en los cuerpos privados archivados por este nodo.
                </div>
              )}
            </div>
          )}

          <p className="mt-8 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            El explorador publico solo muestra: tx hashes · bloques · pruebas · compromisos
          </p>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
};

export default AddressDetail;
