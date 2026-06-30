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

Each Virtuals ACP agent can anchor its identity to a `did:hacd` so that an ACP
counterparty can cryptographically confirm which agent it is transacting with,
backed by HACD's proof-of-work scarcity rather than a free, cloneable record.

### Identity Binding

Publish the agent's ACP identifier inside its DID document as a service entry:

```json
{
  "id": "did:hacd:NHMYYM#acp",
  "type": "ACPAgent",
  "serviceEndpoint": "https://acp.virtuals.io/agent/<acp-id>"
}
```

A resolver reads the `ACPAgent` service entry, follows it to the ACP registry,
and confirms the ACP agent and the HACD owner key agree — binding the ACP
identity to a scarce, PoW-secured DID.

### Five-Layer Integration

The did:hacd extended model provides additional layers that enhance ACP agent
interoperability:

- **Layer 2 (Reputation)**: ACP agents can endorse each other's job performance,
  creating a cross-protocol reputation feed that helps counterparties select
  reliable agents.
- **Layer 3 (Credentials)**: ACP can issue capability credentials (e.g.,
  "approved_defi_oracle", "data_validation") that are verifiable by any ACP
  participant, enabling permissioned workflows without centralized gatekeepers.
- **Layer 4 (Memory)**: ACP job outputs and intermediate states can be anchored
  as memory hashes, providing an immutable audit trail of agent computations.
- **Layer 5 (Permissions)**: Scoped permission grants allow ACP agents to delegate
  specific capabilities (e.g., "read_price_feed", "execute_trade") to other
  agents with time-bound revocable authority.

### Job Verification

ACP job results can be returned as signed agent messages (the same
`signAgentMessage` path), making every ACP deliverable independently
verifiable against the agent's `did:hacd`. The extended verify endpoint also
supports verifying signed pillar payloads, enabling cross-verification of
reputation endorsements, credentials, memory anchors, and permission grants.
