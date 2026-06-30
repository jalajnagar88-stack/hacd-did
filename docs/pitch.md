# Proof-of-Work Agents — Incubator Pitch

**HACD Labs Incubator Season 2 · 7-Day Launch Sprint**

## One Line

The first Proof-of-Work identity layer for AI agents: every HACD inscription
becomes a W3C-conformant DID — `did:hacd:NHMYYM`.

## The Asset

`did:hacd` is the asset. A HACD diamond is no longer just a scarce collectible;
it becomes the soul-bound identity anchor for an autonomous agent. The agent's
keys, capabilities, and verifiable track record are committed on-chain through a
mutable `AGNT` Stack Token attached to that HACD.

## Why This Wins on HACD Specifically

| Property              | Generic NFT | HACD                               |
| --------------------- | ----------- | ---------------------------------- |
| Minting cost          | ~zero       | Proof-of-work + on-chain bid       |
| Sybil resistance      | none        | economic, by construction          |
| Native stacking layer | no          | Stack Protocol (FT/NFT/SFT/access) |
| Human-legible ID      | no          | six-letter inscription             |

An agent identity is only worth trusting if it is expensive to fake. HACD is the
only asset where that is true at the protocol level. This is not a project that
_could_ run on HACD — it is one that _only_ makes sense on HACD.

## What Exists Today (built in sprint)

- **Method spec v0.1** — `did:hacd` following W3C DID Core + DID Resolution.
- **Reference SDK** (`@pow-agents/sdk`) — create, resolve, update, deactivate;
  RFC 8785 canonicalization; Ed25519 signing; full verification resolver.
- **Test suite** — 19 passing tests covering the full lifecycle, including
  tamper detection, wrong-key rejection, version rollback, and deactivation.
- **Resolver console** (`apps/web`) — Next.js app to resolve any `did:hacd` and
  inspect the hash-and-signature proof chain.

## The Demo Agent

PolyMind — an autonomous prediction-market trading committee — becomes Agent
`#0001`. Its identity, its operator key, and its trade-history attestations all
resolve from a single `did:hacd`. A counterparty can verify, in one resolution,
that they are talking to the real agent and read its on-chain track record.

## Stack Layout on the Diamond

```
HACD: NHMYYM
├── AGNT (mutable SFT)  → DID Document commitment (hash + version + URL)
├── Attestation NFTs    → signed performance / audit records
└── Access-right FT     → spend / capability budget for the agent
```

## Roadmap

1. Spec + SDK + test vectors (done in sprint).
2. Public resolver service + console.
3. Bind a live agent (PolyMind) with on-chain attestations.
4. Register with the DIF Universal Resolver; submit spec for review.

## The Ask

Selection into Season 2 to launch `did:hacd` as the identity primitive for the
HACD agent economy.
