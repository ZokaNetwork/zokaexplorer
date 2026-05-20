import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Copy, Box, Hash, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { getBlock } from "@/lib/api";
import type { Block } from "@/lib/types";

const copyText = async (value: string) => {
  try {
    await navigator.clipboard.writeText(value);
  } catch {
    const textarea = document.createElement("textarea");
    textarea.value = value;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);
  }
};

const truncate = (s: string, head = 10, tail = 8) =>
  s.length > head + tail + 1 ? `${s.slice(0, head)}…${s.slice(-tail)}` : s;

const Field = ({
  label, value, mono = false, copyable = false, link,
}: {
  label: string; value: React.ReactNode; mono?: boolean; copyable?: boolean; link?: string;
}) => {
  const onCopy = async () => {
    if (typeof value === "string") {
      await copyText(value);
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

const BlockDetail = () => {
  const { heightOrHash = "" } = useParams();
  const navigate = useNavigate();
  const [block, setBlock] = useState<Block | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    getBlock(heightOrHash)
      .then((b) => {
        if (!b) {
          navigate("/not-found", { replace: true });
          return;
        }
        setBlock(b);
      })
      .catch((e) => setError(e.message || "Failed to load block"))
      .finally(() => setLoading(false));
  }, [heightOrHash, navigate]);

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
        ) : loading || !block ? (
          <div className="mt-12 text-center text-muted-foreground text-sm">Loading block…</div>
        ) : (
          <>
            <div className="mt-6 rounded-xl border border-border bg-card p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                    <Box className="h-3 w-3 text-signal" /> Block
                  </div>
                  <h1 className="mt-3 font-mono-tight text-2xl text-foreground">#{block.height.toLocaleString()}</h1>
                </div>
                <Button variant="outline" size="sm" className="h-9 rounded-lg border-border bg-background text-xs" onClick={async () => { await copyText(block.hash); toast({ title: "Hash copied" }); }}>
                  <Copy className="mr-1.5 h-3.5 w-3.5" /> Copy Hash
                </Button>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border lg:grid-cols-4">
                {[
                  { label: "Transactions", value: block.txCount.toString() },
                  { label: "Size", value: block.size > 0 ? `${block.size} B` : "Not exposed" },
                  { label: "Reward", value: block.reward > 0 ? `${block.reward} ZKA` : "Not exposed" },
                  { label: "Difficulty", value: block.difficulty > 0 ? block.difficulty.toFixed(2) : "Not exposed" },
                ].map((m) => (
                  <div key={m.label} className="bg-card px-4 py-3">
                    <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{m.label}</div>
                    <div className="font-mono-tight mt-1.5 text-sm text-foreground">{m.value}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 rounded-xl border border-border bg-card">
              <div className="border-b border-border px-5 py-3 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Details</div>
              <Field label="Block Hash" value={block.hash} mono copyable />
              {block.previousHash && <Field label="Previous Hash" value={truncate(block.previousHash, 14, 10)} mono copyable />}
              <Field label="Timestamp" value={new Date(block.timestamp).toUTCString()} />
              {block.nonce > 0 && <Field label="Nonce" value={block.nonce.toLocaleString()} mono />}
              <Field label="Miner" value={<span className="inline-flex items-center gap-1.5"><Lock className="h-3 w-3 text-muted-foreground" />shielded</span>} />
            </div>

            <div className="mt-6 rounded-xl border border-border bg-card">
              <div className="border-b border-border px-5 py-3 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                Public transactions ({block.transactions.length})
              </div>
              {block.transactions.length > 0 ? (
                block.transactions.map((txHash) => (
                  <Link key={txHash} to={`/tx/${txHash}`} className="flex items-center gap-2 border-b border-border px-5 py-3 last:border-b-0 hover:bg-accent/40 transition-colors">
                    <Hash className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="font-mono-tight text-sm text-signal truncate">{truncate(txHash, 16, 10)}</span>
                  </Link>
                ))
              ) : (
                <div className="px-5 py-3 text-sm text-muted-foreground">No public transactions</div>
              )}
            </div>

            <div className="mt-6 rounded-xl border border-border bg-card">
              <div className="border-b border-border px-5 py-3 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                Private transaction hashes ({block.privateTransactions?.length ?? 0})
              </div>
              {(block.privateTransactions?.length ?? 0) > 0 ? (
                block.privateTransactions?.map((txHash) => (
                  <Link key={txHash} to={`/record/private-tx/${txHash}`} className="flex items-center gap-2 border-b border-border px-5 py-3 last:border-b-0 hover:bg-accent/40 transition-colors">
                    <Lock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="font-mono-tight text-sm text-signal truncate">{truncate(txHash, 16, 10)}</span>
                  </Link>
                ))
              ) : (
                <div className="px-5 py-3 text-sm text-muted-foreground">No private hashes exposed for this block</div>
              )}
            </div>
          </>
        )}
      </section>

      <SiteFooter />
    </main>
  );
};

export default BlockDetail;
