// Server-side RPC proxy for the ZOKA explorer.
//
// The mainnet nodes expose their read API over plain HTTP on port 3000. Vercel's
// static `rewrites` proxy to such an origin (http, non-standard port) hangs and
// times out, so the browser never receives /stats and the metrics stay empty.
//
// Running the hop inside a Vercel serverless function fixes that: the function
// fetches the node server-side and returns the payload to the browser over
// HTTPS. Nothing about the node, the network, the consensus protocol or the
// binaries changes — this is purely the web transport between the explorer page
// and the already-running node.
//
// Routing: `vercel.json` rewrites `/rpc/:path*` → `/api/rpc?__p=:path*`, so the
// real upstream path arrives in the `__p` query param (this sidesteps Vercel's
// dynamic `[...path]` catch-all, which failed to match multi-segment paths like
// /mempool/metrics). Any other query params are forwarded verbatim.

// Give the node a little longer than the browser's own 8s client timeout so a
// slow-but-alive node still answers through the proxy.
const UPSTREAM_TIMEOUT_MS = 12_000;

function buildTargetUrl(base: string, req: any): string {
  const q = req.query ?? {};
  const rawPath = q.__p ?? "";
  let path = Array.isArray(rawPath) ? rawPath.join("/") : String(rawPath);
  if (!path.startsWith("/")) path = "/" + path;

  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(q)) {
    // `__p` carries the upstream path; `path` is Vercel's auto-injected copy of
    // the matched `:path*` group. Neither belongs on the upstream request.
    if (k === "__p" || k === "path") continue;
    if (Array.isArray(v)) v.forEach((item) => params.append(k, String(item)));
    else if (v !== undefined) params.append(k, String(v));
  }
  const qs = params.toString();
  return base + path + (qs ? "?" + qs : "");
}

function causeText(err: any): string {
  if (err?.name === "AbortError") return "upstream timeout";
  const cause = err?.cause;
  if (cause) {
    const code = cause.code ?? cause.errno;
    return `${err.message ?? "fetch failed"}${code ? ` (${code})` : ""}`;
  }
  return String(err?.message ?? err);
}

export async function proxyTo(base: string, req: any, res: any): Promise<void> {
  const target = buildTargetUrl(base, req);
  const method = (req.method || "GET").toUpperCase();

  const headers: Record<string, string> = {};
  const ct = req.headers?.["content-type"];
  if (ct) headers["content-type"] = Array.isArray(ct) ? ct[0] : ct;

  let body: string | undefined;
  if (method !== "GET" && method !== "HEAD") {
    if (req.body === undefined || req.body === null) body = undefined;
    else if (typeof req.body === "string") body = req.body;
    else body = JSON.stringify(req.body);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
  try {
    const upstream = await fetch(target, {
      method,
      headers,
      body,
      signal: controller.signal,
    });

    res.status(upstream.status);
    const upCt = upstream.headers.get("content-type");
    if (upCt) res.setHeader("content-type", upCt);
    const cl = upstream.headers.get("content-length");
    if (cl) res.setHeader("content-length", cl);
    // Tiny shared-edge cache to absorb bursts; the client already caches for 2s.
    res.setHeader("cache-control", "public, max-age=0, s-maxage=2");

    if (method === "HEAD") {
      res.end();
      return;
    }
    const text = await upstream.text();
    res.send(text);
  } catch (err: any) {
    res.status(502).json({
      error: "rpc_proxy_unreachable",
      target,
      detail: causeText(err),
    });
  } finally {
    clearTimeout(timer);
  }
}
