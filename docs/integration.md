# Integration

Agent responses in this submission are scripted (see
`backend/src/agentScripts.ts`) so the demo runs with no API key. The identity
layer — resolve, sign, verify, mint — is fully real. This document shows where a
real model or agent framework plugs in.

## Plug in any LLM

`/api/chat` selects a response string, then signs it with the agent's runtime
key. To use a real model, replace only the response-selection block; the signing
and resolution code stays untouched, so `/verify` keeps working.

```ts
// apps/web/src/app/api/chat/route.ts — swap the scripted block for a model call.
// `content` is the only thing that changes; signAgentMessage(...) is unchanged.
const content = await callYourModel({
  system: profile.systemPrompt, // already defined per agent
  messages: clean, // [{ role, content }]
  model: profile.model, // e.g. claude-sonnet-4-6 / gpt-* / local
});

const signedAt = new Date().toISOString();
const proof = signAgentMessage(did, content, signedAt); // signs content||signedAt||did
return NextResponse.json(proof);
```

Any provider works — Anthropic, OpenAI, or a local endpoint — because the
signature covers the final text regardless of how it was produced. The canonical
signing payload is `agentMessagePayload(content, signedAt, did)` in
`@pow-agents/sdk`; do not change it, or existing proofs stop verifying.

## Plug in Virtuals Protocol ACP

_Future work — Q3 2026 milestone._

Each Virtuals ACP agent could anchor its identity to a `did:hacd` so that an ACP
counterparty can cryptographically confirm which agent it is transacting with,
backed by HACD's proof-of-work scarcity rather than a free, cloneable record.

Design sketch:

- Publish the agent's ACP identifier inside its DID document as a service entry:

  ```json
  {
    "id": "did:hacd:NHMYYM#acp",
    "type": "ACPAgent",
    "serviceEndpoint": "https://acp.virtuals.io/agent/<acp-id>"
  }
  ```

- A resolver reads the `ACPAgent` service entry, follows it to the ACP registry,
  and confirms the ACP agent and the HACD owner key agree — binding the ACP
  identity to a scarce, PoW-secured DID.
- ACP job results can then be returned as signed agent messages (the same
  `signAgentMessage` path), making every ACP deliverable independently
  verifiable against the agent's `did:hacd`.
