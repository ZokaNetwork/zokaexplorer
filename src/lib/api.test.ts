import { describe, expect, it, vi, beforeEach } from "vitest";
import { getSuggestions, isScanKeyLikeQuery, search } from "./api";

const scanKeyHex =
  "5093c55a2486b032c1a4ec1495527c86406541c4caca4d785c4302b86dafc9cd";

beforeEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("explorer search routing", () => {
  it("detects bare scan-key-shaped queries for the UI guard", () => {
    expect(isScanKeyLikeQuery(scanKeyHex)).toBe(true);
    expect(isScanKeyLikeQuery(`0x${scanKeyHex}`)).toBe(true);
    expect(isScanKeyLikeQuery(scanKeyHex.slice(0, 32))).toBe(false);
  });

  it("does not offer a bare scan key as a clickable hash suggestion", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("{}", { status: 404 })),
    );

    await expect(getSuggestions(scanKeyHex)).resolves.toEqual([]);
  });

  it("does not route an unknown bare scan key to record/hash", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("{}", { status: 404 })),
    );

    await expect(search(scanKeyHex)).resolves.toBeNull();
  });

  it("routes tx-prefixed private hashes to the private record view", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("{}", { status: 404 })),
    );

    await expect(search(`tx:${scanKeyHex.slice(0, 32)}`)).resolves.toMatchObject({
      type: "record",
      kind: "private-tx",
      id: scanKeyHex.slice(0, 32),
    });
  });
});
