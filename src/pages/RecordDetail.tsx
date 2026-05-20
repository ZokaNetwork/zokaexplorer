import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Copy, EyeOff, Lock, SearchCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { getSafeRecord } from "@/lib/api";
import type { SafeRecord, SafeRecordKind } from "@/lib/types";

const safeKinds: SafeRecordKind[] = ["commitment", "nullifier", "root", "private-tx", "hash"];

const truncate = (s: string, head = 16, tail = 10) =>
  s.length > head + tail + 1 ? `${s.slice(0, head)}...${s.slice(-tail)}` : s;

const RecordDetail = () => {
  const { kind = "hash", id = "" } = useParams();
  const recordKind = safeKinds.includes(kind as SafeRecordKind)
    ? (kind as SafeRecordKind)
    : "hash";
  const [record, setRecord] = useState<SafeRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    getSafeRecord(recordKind, id)
      .then(setRecord)
      .catch((e) => setError(e.message || "Failed to inspect record"))
      .finally(() => setLoading(false));
  }, [recordKind, id]);

  const copy = () => {
    navigator.clipboard.writeText(id);
    toast({ title: "Copied", description: truncate(id) });
  };

  return (
    <main className="relative flex min-h-screen flex-col overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0 bg-grid opacity-50" aria-hidden />
      <SiteHeader />

      <section className="relative z-10 mx-auto w-full max-w-4xl flex-1 px-6 pt-4 pb-12">
        <Link to="/" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to search
        </Link>

        {error ? (
          <div className="mt-12 text-center">
            <p className="text-sm text-destructive">{error}</p>
            <Button variant="outline" size="sm" className="mt-4" onClick={() => window.location.reload()}>
              Retry
            </Button>
          </div>
        ) : loading || !record ? (
          <div className="mt-12 text-center text-sm text-muted-foreground">Inspecting record...</div>
        ) : (
          <>
            <div className="mt-6 rounded-lg border border-border bg-card p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                    <SearchCheck className="h-3 w-3 text-signal" />
                    {record.kind}
                  </div>
                  <h1 className="mt-4 text-lg font-medium text-foreground">
                    Privacy-safe record
                  </h1>
                  <p className="font-mono-tight mt-2 break-all text-sm text-muted-foreground">
                    {id}
                  </p>
                </div>
                <Button variant="outline" size="sm" className="h-9 rounded-md border-border bg-background text-xs" onClick={copy}>
                  <Copy className="mr-1.5 h-3.5 w-3.5" /> Copy
                </Button>
              </div>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <div className="rounded-lg border border-border bg-card px-4 py-4">
                <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Status</div>
                <div className="mt-2 inline-flex items-center gap-2 text-sm text-foreground">
                  <CheckCircle2 className="h-4 w-4 text-signal" />
                  {record.status}
                </div>
              </div>
              <div className="rounded-lg border border-border bg-card px-4 py-4">
                <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Block</div>
                <div className="font-mono-tight mt-2 text-sm text-foreground">
                  {record.blockHeight ? (
                    <Link className="text-signal hover:underline" to={`/block/${record.blockHeight}`}>
                      #{record.blockHeight}
                    </Link>
                  ) : (
                    "-"
                  )}
                </div>
              </div>
              <div className="rounded-lg border border-border bg-card px-4 py-4">
                <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Disclosure</div>
                <div className="mt-2 inline-flex items-center gap-2 text-sm text-foreground">
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                  minimal
                </div>
              </div>
            </div>

            <div className="mt-6 rounded-lg border border-border bg-card p-5">
              <div className="flex items-start gap-3">
                <Lock className="mt-0.5 h-4 w-4 shrink-0 text-signal" />
                <div>
                  <p className="text-sm font-medium text-foreground">No private identity is exposed</p>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                    {record.note} The explorer never displays owner, sender, receiver,
                    amount, balance, recovery phrase, scan key, or spend key.
                  </p>
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

export default RecordDetail;
