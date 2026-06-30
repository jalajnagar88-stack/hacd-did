# Quantwealth — Verifiable AI agents on HACD

**Live demo:** _to be filled after Vercel deploy_

**Verifiable AI agents for prediction, attestation, and trading, anchored on HACD via `did:hacd`.**

`did:hacd` is the first Proof-of-Work Decentralized Identifier method. Each HACD
(Hacash Diamond) six-letter inscription — `NHMYYM`, `WTYUIA` — becomes a scarce,
PoW-secured identity slot for an autonomous AI agent. Agents resolve, sign
messages, and are independently verifiable, with no central registrar.

> Agent responses are scripted for this incubator submission; the cryptographic
> identity layer (resolve, sign, verify, mint) is fully real and the integration
> point for any LLM or agent framework is documented in
> [`docs/integration.md`](docs/integration.md).

---

## What this is

A single Next.js app plus a reference SDK (`@pow-agents/sdk`) implementing the
`did:hacd` method end to end:

- **Resolver console** — resolve any `did:hacd` and inspect its proof chain
  (on-chain AGNT commitment → owner signature → document hash integrity).
- **Live signed chat** — talk to a verifiable agent; every response is signed by
  the agent's runtime key and carries a copyable proof.
- **Public verifier** — paste any signed agent message; the DID is resolved, the
  public key looked up, and the signature checked.
- **Mint flow** — anchor a new agent to a HACD: generate a keypair in-browser,
  sign the DID document, and register it on the (in-memory) chain.

See [`docs/spec.md`](docs/spec.md) for the method specification and
[`docs/pitch.md`](docs/pitch.md) for the incubator pitch.

## Routes

| Route               | Description                                                        |
| ------------------- | ------------------------------------------------------------------ |
| `/`                 | Landing page: hero, featured agents, and the resolver console.     |
| `/chat/[did]`       | Live signed chat with an agent (deactivated agents show a notice). |
| `/verify`           | Paste a signed proof and verify it against the resolved DID.       |
| `/mint`             | Mint a new agent and anchor it to a HACD inscription.              |
| `/api/resolve`      | `GET` — W3C DID resolution for a `did:hacd`.                       |
| `/api/chat`         | `POST` — model response signed by the agent runtime key.           |
| `/api/verify`       | `POST` — verify a signed agent-message proof.                      |
| `/api/sample-proof` | `GET` — a cached, signed PolyMind reference proof.                 |
| `/api/mint`         | `POST` — register a client-signed agent document.                  |
| `/api/agents`       | `GET` — list seeded DIDs.                                          |

## Local development

```bash
pnpm install          # also builds the SDK via its prepare script
pnpm dev:web          # starts Next.js on http://localhost:3000
```

Other useful commands:

```bash
pnpm build            # build SDK + web app
pnpm --filter @pow-agents/sdk test   # 23 SDK unit tests
node scripts/acceptance.mjs          # full end-to-end harness (server must be running)
```

No LLM API key is required to run this demo. Agent responses are scripted (see
`backend/src/agentScripts.ts`); every route — resolve, chat, verify,
sample-proof, mint — works out of the box. Chat responses are still signed for
real by each agent's runtime key and verify in `/verify`.

## Environment variables

| Variable        | Required | Description                                                                                                |
| --------------- | -------- | ---------------------------------------------------------------------------------------------------------- |
| `HACD_DATA_DIR` | no       | Writable dir for `keystore.json` / `registry.json`. Defaults to `backend/` locally, OS temp on serverless. |

## Deploy to Vercel

This is a single Next.js app. When importing the repo, set the **Root Directory**
to `hacd-did` (this folder). No environment variables are required.
`vercel.json` already pins the pnpm-workspace build command.

```bash
git add -A && git commit -m "Quantwealth demo" && git push
# then: import the repo at vercel.com/new, set Root Directory = hacd-did, deploy.
```

## Architecture notes

- The HACD chain is an in-memory `ChainReader` (`apps/web/src/lib/registry.ts`)
  standing in for a Hacash node + indexer. Swap it for a real `ChainReader` to
  go on-chain.
- Each agent holds two keys: an **owner key** (controls the DID document) and a
  **runtime key** (`#agent-runtime-1`, signs chat responses). Runtime keys are
  persisted to `backend/keystore.json` (gitignored).
- Message signatures cover a single canonical payload
  (`agentMessagePayload(content, signedAt, did)`) used identically by the
  signer (`/api/chat`) and verifier (`/api/verify`).

## License

MIT — see [LICENSE](LICENSE).
