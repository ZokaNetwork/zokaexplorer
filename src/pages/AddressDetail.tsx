import { Link, useParams } from "react-router-dom";
import { ArrowLeft, KeyRound, Lock } from "lucide-react";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { Button } from "@/components/ui/button";

/**
 * Address lookup does not exist on ZOKA, and cannot.
 *
 * This page used to ask for a scan key and pass it to the server. That was
 * switched off for the obvious reason: a scan key given to a server grants it
 * permanent visibility into everything that person ever receives. The
 * replacement is the in-browser scan on /view-scan, where the key never leaves
 * the machine — so this page kept prompting for a key and then failing.
 *
 * Rather than 404, explain it. "You cannot look up someone's balance" is not a
 * missing feature here; it is the product working.
 */
const AddressDetail = () => {
  const { address: addr = "" } = useParams();

  return (
    <main className="relative flex min-h-screen flex-col overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0 bg-grid opacity-50" aria-hidden />
      <SiteHeader />

      <section className="relative z-10 mx-auto w-full max-w-2xl flex-1 px-6 pt-4 pb-12">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to search
        </Link>

        <div className="mt-10 rounded-2xl border border-border bg-card p-8">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-border">
            <Lock className="h-7 w-7 text-foreground/70" />
          </div>

          <h1 className="mt-6 text-lg font-semibold text-foreground">
            Balances cannot be looked up by address
          </h1>

          <div className="mt-4 space-y-4 text-sm font-light leading-relaxed text-muted-foreground">
            <p>
              The chain publishes neither recipients nor amounts, so there is
              nowhere to read a balance for{" "}
              {addr ? (
                <code className="break-all font-mono text-xs text-foreground/80">{addr}</code>
              ) : (
                "an address"
              )}
              . This is not a missing feature — it is what makes the network
              private. An explorer that could show you anyone's balance would
              mean the privacy was fake.
            </p>
            <p>
              You can still find <span className="text-foreground/90">your own</span>{" "}
              payments using your scan key. That runs entirely in your browser:
              the key is never sent to any server, including ours.
            </p>
          </div>

          <Button asChild className="mt-8">
            <Link to="/view-scan" className="inline-flex items-center gap-2">
              <KeyRound className="h-4 w-4" />
              Find my payments with my scan key
            </Link>
          </Button>

          <p className="mt-6 text-xs text-muted-foreground/70">
            To see your balance with no intermediary at all, use your wallet:
            ZSilent Core and ZKAPriv read your own node.
          </p>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
};

export default AddressDetail;
