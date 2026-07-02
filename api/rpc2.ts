import { proxyTo } from "../lib/rpc-proxy.js";

// Secondary mainnet node (VPS2) — used when the client's retries against the
// primary node are exhausted.
const NODE = "http://157.230.5.103:3000";

export default async function handler(req: any, res: any) {
  await proxyTo(NODE, req, res);
}
