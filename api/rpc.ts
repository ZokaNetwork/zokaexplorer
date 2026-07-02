import { proxyTo } from "../lib/rpc-proxy.js";

// Primary mainnet node (BOOT).
const NODE = "http://159.223.119.216:3000";

export default async function handler(req: any, res: any) {
  await proxyTo(NODE, req, res);
}
