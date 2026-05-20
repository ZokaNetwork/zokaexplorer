import { Link } from "react-router-dom";
import { ArrowLeft, SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

const NotFound = () => (
  <main className="relative flex min-h-screen flex-col overflow-hidden bg-background text-foreground">
    <div className="pointer-events-none absolute inset-0 bg-grid opacity-40" aria-hidden />
    <SiteHeader />

    <section className="relative z-10 mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center px-6 py-16 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-border bg-card shadow-lg shadow-black/30">
        <SearchX className="h-7 w-7 text-muted-foreground" />
      </div>

      <h1 className="mt-6 font-mono-tight text-3xl tracking-tight text-foreground">
        404
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        The page, transaction, block, or address you're looking for doesn't exist or hasn't been indexed yet.
      </p>

      <div className="mt-8 flex items-center gap-3">
        <Button asChild variant="outline" size="sm" className="h-9 rounded-lg border-border bg-card text-xs">
          <Link to="/">
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
            Back to Explorer
          </Link>
        </Button>
      </div>

      <p className="mt-8 text-[11px] text-muted-foreground/60">
        If you believe this is an error, try searching again from the home page.
      </p>
    </section>

    <SiteFooter />
  </main>
);

export default NotFound;
