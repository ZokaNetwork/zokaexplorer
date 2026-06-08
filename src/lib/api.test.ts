import { describe, expect, it, vi, beforeEach } from "vitest";
import { getSuggestions, isScanKeyLikeQuery, search } from "./api";

const scanKeyHex =
  "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

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

  it("offers a bare scan key as a clickable scan-key suggestion", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("{}", { status: 404 })),
    );

    await expect(getSuggestions(scanKeyHex)).resolves.toEqual([
      expect.objectContaining({
        type: "scan-key",
        id: scanKeyHex,
      }),
    ]);
  });

  it("routes an unknown bare scan key to scan-key history, not record/hash", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("{}", { status: 404 })),
    );

    await expect(search(scanKeyHex)).resolves.toMatchObject({
      type: "scan-key",
      id: scanKeyHex,
    });
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
