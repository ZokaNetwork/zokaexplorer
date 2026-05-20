import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ShieldCheck, Eye, Lock } from "lucide-react";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

const AddressDetail = () => {
  const { address: addr = "" } = useParams();

  return (
    <main className="relative flex min-h-screen flex-col overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0 bg-grid opacity-50" aria-hidden />
      <SiteHeader />

      <section className="relative z-10 mx-auto w-full max-w-3xl flex-1 px-6 pt-4 pb-12">
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

          <p className="font-mono-tight mt-3 max-w-md break-all text-xs text-muted-foreground leading-relaxed">
            {addr}
          </p>

          <div className="mt-8 max-w-md rounded-xl border border-border bg-card p-6 text-left">
            <div className="flex items-start gap-3">
              <Lock className="mt-0.5 h-4 w-4 shrink-0 text-signal" />
              <div>
                <p className="text-sm font-medium text-foreground">
                  Dirección privada válida
                </p>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  Por privacidad, el historial, montos y relaciones de esta
                  dirección no son públicos. Usa tu wallet o una clave de vista
                  (<span className="text-foreground">view key</span>) para ver
                  tu historial.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 max-w-md space-y-3 text-left">
            <div className="flex items-start gap-3 rounded-lg border border-border bg-card/50 px-4 py-3">
              <Eye className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <div>
                <p className="text-xs font-medium text-foreground">
                  ¿Quieres ver tu historial?
                </p>
                <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                  Abre tu wallet local — tiene las claves para escanear y
                  descifrar tus outputs.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-lg border border-border bg-card/50 px-4 py-3">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <div>
                <p className="text-xs font-medium text-foreground">
                  View-only key (próximamente)
                </p>
                <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                  Importa una clave de vista para ver tu historial en un
                  explorador local/privado, sin poder gastar fondos.
                </p>
              </div>
            </div>
          </div>

          <p className="mt-8 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            El explorador público solo muestra: tx hashes · bloques · pruebas ·
            compromisos
          </p>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
};

export default AddressDetail;
