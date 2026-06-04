# ZokaScan Explorer — Roadmap

Goal: surface everything the chain can show **as transparency**, while never
de-anonymizing a user. Implement all of it without making the UI busier than it
is today.

## Principles (apply to every phase)

- **Privacy first.** The explorer shows aggregate chain/transparency data and
  the *existence* of private activity — never amounts, parties, address
  balances/history, or any link between a private hash and an address.
- **Stay visually clean.** The home keeps its current minimal layout. Rich
  detail lives on the detail pages (Block / Tx) and inside collapsible / tabbed
  sections, not the home. Reuse the existing shadcn/ui components and style — no
  new heavy UI.
- **Honest data only.** No fabricated/mock values on a public site.

## Privacy guardrails (must hold — C1–C5)

- C1 Private tx amounts/parties → always "shielded".
- C2 Address pages → no balance, no history ("private address — no public history").
- C3 Never link a private hash to an address.
- C4 Coinbase recipient (miner) stays hidden — the node exposes only a
  `private_coinbase` flag, so label it "Private coinbase (shielded miner)".
- C5 No fabricated charts/metrics.

---

## Phase 0 — Routing & 404 (foundation) ✅ DONE

- [x] SPA fallback in `vercel.json` so `/tx/:hash`, `/block/:x`, `/address/:x`
      load on direct hit/refresh instead of returning Vercel's 404. This ALSO
      makes the app's own `NotFound` page render for unknown paths.
- [x] Page-level "not found": `BlockDetail` redirects to `NotFound` on a missing
      block; `TxDetail` shows its "broadcast / awaiting confirmation" panel for
      an unindexed hash. (Already in the same style.)

## Phase 1 — Honest data (fix broken / misleading) ✅ DONE

- [x] **A1** Removed the fabricated `getMetricHistory` mock. The home sparklines
      already accumulate REAL `/stats` samples over time — no fake data shipped.
- [x] **A2** "Recent blocks" now shows real **age** + a **private-tx count**
      badge per block (via one `/blocks/range/.../private_tx_hashes` call). Full
      per-block detail (reward/size/tx list) stays on the block page to keep the
      list visually clean.
- [x] **A3** Replaced the (empty) public-mempool strip with **Recent private
      activity**: real private tx hashes from recent blocks (hash + height only).

## Phase 2 — Richer block & tx detail ✅ mostly DONE

- [x] **B1** Block reward — already rendered on `BlockDetail` (`reward_zka`).
- [x] **B2** Private tx count per block — shown in the "Private transaction
      hashes (N)" section + the home badge.
- [~] **B3** `size_bytes`, `nonce`, `difficulty_bits`, `previous_hash` already on
      `BlockDetail`. `state_root` is `"0"` from the node (not meaningful) and
      `private_coinbase` is conveyed by the miner label → skipped as low value.
- [ ] **A4** Public coinbase reward amount in tx detail — deferred: the reward
      is already shown on the block page; the coinbase recipient must stay
      shielded, so there's little extra to show without a node change.
- [x] **A5** Miner labelled "Private coinbase (shielded miner)".

## Phase 3 — Network stats & mempool

- [~] **B5** The home already shows real height, last-block age, difficulty,
      hashrate, emission/supply and miners online. Connected peers / network
      version are available but left off the home to keep it clean (candidate
      for the footer later).
- [ ] **B6** Mempool view — deferred: the public mempool is ~always empty on a
      private chain and the private pending count is usually 0; low value vs the
      Recent-private-activity feed that replaced it.
- [ ] **B4** Average block time (computed from recent block timestamps) — nice
      to add later without cluttering (candidate to replace/extend a metric).

## Phase 4 — Private-tx transparency

- [x] **B8** "Recent private activity" feed shipped (see A3).
- [ ] **B7** Nullifier count per block — **needs a node change**: `/blocks/{h}`
      does not yet serialize the block's `private_nullifiers`. Defer until the
      node exposes them; then show the count (privacy-safe).

---

## Layout intent (keep it clean)

- **Home:** key network stats (Phase 3) + recent blocks (enriched, Phase 1/2) +
  a compact recent-private-activity strip (Phase 4). That's it.
- **Block detail:** all block fields (Phase 2) + its public tx(s) + private tx
  hash list + nullifier count, in tidy sections.
- **Tx detail:** public coinbase reward when applicable; otherwise the
  privacy-safe "shielded" record view.
- **Address detail:** unchanged privacy stance (no balance/history).

## Deploy

All changes land together, tested locally, then one push to
`zokaexplorer/main` → Vercel auto-deploys zokascan.cc.
