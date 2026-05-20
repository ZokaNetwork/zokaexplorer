import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Copy, ShieldCheck, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { getTransaction } from "@/lib/api";
import type { Transaction } from "@/lib/types";

const truncate = (s: string, head = 10, tail = 8) =>
  s.length > head + tail + 1 ? `${s.slice(0, head)}…${s.slice(-tail)}` : s;

const Field = ({
  label, value, mono = false, copyable = false, link,
}: {
  label: string; value: React.ReactNode; mono?: boolean; copyable?: boolean; link?: string;
}) => {
  const onCopy = () => {
    if (typeof value === "string") {
      navigator.clipboard.writeText(value);
      toast({ title: "Copied", description: truncate(value) });
    }
  };
  const content = (
    <span className={`min-w-0 flex-1 truncate text-sm text-foreground ${mono ? "font-mono-tight" : ""}`}>{value}</span>
  );
  return (
    <div className="grid grid-cols-1 gap-1 border-b border-border px-5 py-4 last:border-b-0 sm:grid-cols-[180px_1fr] sm:gap-4 sm:items-center">
      <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{label}</div>
      <div className="flex items-center gap-2">
        {link ? <Link to={link} className="text-signal hover:underline">{content}</Link> : content}
        {copyable && (
          <button onClick={onCopy} className="shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground" aria-label="Copy">
            <Copy className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};

const TxDetail = () => {
  const { hash = "" } = useParams();
  const navigate = useNavigate();
  const [tx, setTx] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    getTransaction(hash)
      .then((t) => {
        if (!t) {
          navigate("/not-found", { replace: true });
          return;
        }
        setTx(t);
      })
      .catch((e) => setError(e.message || "Failed to load transaction"))
      .finally(() => setLoading(false));
  }, [hash, navigate]);

  return (
    <main className="relative flex min-h-screen flex-col overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0 bg-grid opacity-50" aria-hidden />
      <SiteHeader />

      <section className="relative z-10 mx-auto w-full max-w-5xl flex-1 px-6 pt-4 pb-12">
        <Link to="/" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to search
        </Link>

        {error ? (
          <div className="mt-12 text-center">
            <p className="text-sm text-destructive">{error}</p>
            <Button variant="outline" size="sm" className="mt-4" onClick={() => window.location.reload()}>Retry</Button>
          </div>
        ) : loading || !tx ? (
          <div className="mt-12 text-center text-muted-foreground text-sm">Loading transaction…</div>
        ) : (
          <>
            <div className="mt-6 rounded-xl border border-border bg-card p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                    <ShieldCheck className="h-3 w-3 text-signal" />
                    {tx.status === "confirmed" ? "Confirmed · zk-SNARK verified" : tx.status}
                  </div>
                  <h1 className="mt-3 text-sm font-medium text-muted-foreground">Transaction</h1>
                  <p className="font-mono-tight mt-1 break-all text-base text-foreground sm:text-lg">{hash}</p>
                </div>
                <Button variant="outline" size="sm" className="h-9 rounded-lg border-border bg-background text-xs" onClick={() => { navigator.clipboard.writeText(hash); toast({ title: "Hash copied" }); }}>
                  <Copy className="mr-1.5 h-3.5 w-3.5" /> Copy
                </Button>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border lg:grid-cols-3">
                {[
                  { label: "Block", value: tx.blockHeight > 0 ? tx.blockHeight.toLocaleString() : "pending" },
                  { label: "Confirmations", value: tx.confirmations > 0 ? tx.confirmations.toLocaleString() : "—" },
                  { label: "Size", value: tx.size > 0 ? `${tx.size} B` : "—" },
                ].map((m) => (
                  <div key={m.label} className="bg-card px-4 py-3">
                    <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{m.label}</div>
                    <div className="font-mono-tight mt-1.5 text-sm text-foreground">{m.value}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-3">
              <div className="rounded-xl border border-border bg-card lg:col-span-2">
                <div className="border-b border-border px-5 py-3 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Details</div>
                <Field label="Status" value={<span className="text-signal capitalize">{tx.status}</span>} />
                <Field label="Timestamp" value={tx.timestamp ? new Date(tx.timestamp).toUTCString() : "—"} />
                {tx.blockHeight > 0 && (
                  <Field label="Block Height" value={tx.blockHeight.toLocaleString()} mono link={`/block/${tx.blockHeight}`} />
                )}
                <Field label="Sender" value={<span className="inline-flex items-center gap-1.5"><Lock className="h-3 w-3 text-muted-foreground" />shielded</span>} />
                <Field label="Receiver" value={<span className="inline-flex items-center gap-1.5"><Lock className="h-3 w-3 text-muted-foreground" />shielded</span>} />
                <Field label="Amount" value={<span className="inline-flex items-center gap-1.5"><Lock className="h-3 w-3 text-muted-foreground" />hidden · zk-SNARK verified</span>} />
                {tx.ringSize > 0 && <Field label="Ring Size" value={tx.ringSize} mono />}
                {tx.size > 0 && <Field label="Size" value={`${tx.size} bytes`} mono />}
              </div>

              <div className="rounded-xl border border-border bg-card">
                <div className="border-b border-border px-5 py-3 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">zk-SNARK proof</div>
                <div className="px-5 py-4">
                  <p className="text-xs text-muted-foreground">Cryptographic commitment proving validity without revealing inputs.</p>
                  <pre className="font-mono-tight mt-3 overflow-hidden rounded-lg border border-border bg-background p-3 text-[11px] leading-relaxed text-foreground">{tx.proof}</pre>
                  <div className="mt-4 flex items-center gap-2 text-[11px] text-muted-foreground">
                    <ShieldCheck className="h-3.5 w-3.5 text-signal" /> Verified on-chain
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </section>

      <SiteFooter />
    </main>
  );
};

export default TxDetail;
