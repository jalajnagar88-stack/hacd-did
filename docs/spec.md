# The did:hacd Method Specification

**Version:** 0.2 (draft)
**Status:** Working Draft
**Date:** 2026-06-30

This document specifies the `hacd` Decentralized Identifier (DID) method. It
follows the conventions of [W3C DID Core 1.0][did-core] and
[W3C DID Resolution][did-resolution]. The method binds DIDs to HACD (Hacash
Diamond) inscriptions — scarce, proof-of-work-mined six-letter identifiers — and
anchors DID Documents on-chain through HACD's Stack Token protocol.

---

## 1. Introduction

A HACD is the first Hybrid Stack Token: a native proof-of-work asset on Hacash,
produced through PoW mining and on-chain bidding. Each HACD carries a unique,
human-legible six-letter inscription and can act as a container onto which
fungible tokens (FT), non-fungible tokens (NFT), semi-fungible tokens (SFT), and
access rights are stacked.

The `did:hacd` method treats each inscription as a globally unique identifier
and uses a mutable Stack Token (type `AGNT`) attached to the HACD as the
tamper-evident, owner-controlled anchor for a DID Document. Because the
inscription namespace is finite and minting requires real proof-of-work, a
`did:hacd` identity is inherently Sybil-resistant: an adversary cannot cheaply
manufacture identifiers.

### 1.1 Design Goals

1. **Scarcity-bound identity.** One HACD, one DID. Identifiers cannot be minted
   on demand.
2. **On-chain integrity, off-chain payload.** Only a hash and minimal metadata
   live on-chain; the full document is hosted at a resolvable URL.
3. **Owner control.** Only the current HACD owner can create, update, or
   deactivate the DID.
4. **W3C conformance.** Resolution inputs and outputs match the DID Resolution
   specification so existing tooling interoperates.

---

## 2. Method Name

The method name that identifies this DID method is:

```
hacd
```

A DID that uses this method MUST begin with the prefix `did:hacd:`.

---

## 3. Method-Specific Identifier (DID Syntax)

The method-specific identifier is exactly the HACD inscription.

```abnf
did            = "did:hacd:" inscription
inscription    = 6( hacd-letter )
hacd-letter    = "W" / "T" / "Y" / "U" / "I" / "A" / "H" / "X"
               / "V" / "M" / "E" / "K" / "B" / "S" / "Z" / "N"
```

- The inscription is **exactly six characters**.
- Each character MUST be one of the **16 uppercase letters** above. No other
  characters, lowercase letters, digits, or separators are permitted.
- The identifier is case-sensitive and MUST be uppercase.

Examples:

```
did:hacd:NHMYYM
did:hacd:WTYUIA
```

A DID whose inscription does not satisfy these rules is invalid and MUST cause
the resolver to return error `invalidDid`.

---

## 4. DID Document

A `did:hacd` DID Document is a JSON object conforming to DID Core. The minimal
document produced by the reference SDK is:

```json
{
  "@context": ["https://www.w3.org/ns/did/v1", "https://w3id.org/security/suites/ed25519-2020/v1"],
  "id": "did:hacd:NHMYYM",
  "controller": "did:hacd:NHMYYM",
  "verificationMethod": [
    {
      "id": "did:hacd:NHMYYM#agent-key-1",
      "type": "Ed25519VerificationKey2020",
      "controller": "did:hacd:NHMYYM",
      "publicKeyMultibase": "z6Mk..."
    }
  ],
  "authentication": ["did:hacd:NHMYYM#agent-key-1"],
  "assertionMethod": ["did:hacd:NHMYYM#agent-key-1"],
  "service": [
    {
      "id": "did:hacd:NHMYYM#agent",
      "type": "AutonomousAgent",
      "serviceEndpoint": "https://agents.example/polymind"
    }
  ]
}
```

- `id` and `controller` MUST equal the DID being described.
- At least one verification method MUST be present.
- `service` entries MAY advertise agent endpoints (e.g. an autonomous-agent API,
  an A2A endpoint, or an attestation feed).

---

## 4.1 Extended DID Document Model for Autonomous Agents

The `did:hacd` method extends the base DID Document model to support the full lifecycle of autonomous agents beyond identity. Four extension pillars — Reputation, Credentials, Memory, and Permissions — are expressed as W3C-compliant `service` entries, each pointing to a signed, resolvable JSON payload. This design maintains W3C compliance while enabling recursive verifiability across the agent ecosystem.

### 4.1.1 ReputationFeed

Reputation represents signed endorsements from other DIDs, with time-decayed aggregation to reflect current trustworthiness.

```json
{
  "id": "did:hacd:NHMYYM#reputation",
  "type": "ReputationFeed",
  "serviceEndpoint": "/api/reputation/did:hacd:NHMYYM"
}
```

**Endpoint response shape:**

```json
{
  "did": "did:hacd:NHMYYM",
  "endorsements": [
    {
      "from": "did:hacd:WTYUIA",
      "weight": 0.9,
      "basis": "reliable attestation cadence; no missed publications since registration",
      "issuedAt": "2026-06-15T10:30:00.000Z",
      "signature": "base64url-ed25519-signature",
      "verificationMethod": "did:hacd:WTYUIA#agent-runtime-1"
    }
  ],
  "aggregate": {
    "rawScore": 85.5,
    "decayedScore": 78.2,
    "endorserCount": 5,
    "lastUpdated": "2026-06-30T00:00:00.000Z"
  }
}
```

**Aggregate score logic:**
- `rawScore` = sum of all endorsement weights, capped at 100
- `decayedScore` = sum(endorsement.weight × exp(-ageInDays/30))
- `endorserCount` = unique count of endorsing DIDs

Each endorsement is independently verifiable by resolving the `from` DID and checking the signature against the issuer's verification method.

**Self-endorsement filtering:** Endorsements where `from` equals the subject DID MUST be rejected at write time.

### 4.1.2 CredentialRegistry

Credentials represent W3C-style Verifiable Credentials issued between agents, attesting to capabilities or claims.

```json
{
  "id": "did:hacd:NHMYYM#credentials",
  "type": "CredentialRegistry",
  "serviceEndpoint": "/api/credentials/did:hacd:NHMYYM"
}
```

**Endpoint response shape:**

```json
{
  "did": "did:hacd:NHMYYM",
  "issued": [
    {
      "@context": ["https://www.w3.org/2018/credentials/v1"],
      "type": ["VerifiableCredential"],
      "issuer": "did:hacd:NHMYYM",
      "credentialSubject": {
        "id": "did:hacd:WTYUIA",
        "claim": "attestation-publishing capability",
        "capability": "attestation-publishing"
      },
      "issuanceDate": "2026-06-01T00:00:00.000Z",
      "expirationDate": "2026-12-31T23:59:59.999Z",
      "proof": {
        "type": "Ed25519Signature2020",
        "created": "2026-06-01T00:00:00.000Z",
        "verificationMethod": "did:hacd:NHMYYM#agent-runtime-1",
        "jws": "base64url-jws"
      }
    }
  ],
  "held": [
    {
      "@context": ["https://www.w3.org/2018/credentials/v1"],
      "type": ["VerifiableCredential"],
      "issuer": "did:hacd:NHTYBW",
      "credentialSubject": {
        "id": "did:hacd:NHMYYM",
        "claim": "verified analyst 2026",
        "capability": "verified-analyst"
      },
      "issuanceDate": "2026-01-15T00:00:00.000Z",
      "proof": {
        "type": "Ed25519Signature2020",
        "created": "2026-01-15T00:00:00.000Z",
        "verificationMethod": "did:hacd:NHTYBW#agent-runtime-1",
        "jws": "base64url-jws"
      }
    }
  ]
}
```

Each credential is signed by the issuer's runtime key and verifiable by resolving the issuer's DID Document.

### 4.1.3 MemoryAnchor

Memory anchors represent claim-of-authorship for content artifacts. The agent signs a content hash with a timestamp, proving it produced that content at that time. No content is stored — only the cryptographic commitment.

```json
{
  "id": "did:hacd:NHMYYM#memory",
  "type": "MemoryAnchor",
  "serviceEndpoint": "/api/memory/did:hacd:NHMYYM"
}
```

**Endpoint response shape:**

```json
{
  "did": "did:hacd:NHMYYM",
  "anchors": [
    {
      "id": "anchor-001",
      "contentHash": "a1b2c3d4e5f6...",
      "label": "Q1-2026 BTC year-end forecast",
      "anchoredAt": "2026-03-15T14:22:00.000Z",
      "signature": "base64url-ed25519-signature",
      "verificationMethod": "did:hacd:NHMYYM#agent-runtime-1"
    }
  ]
}
```

If the content surfaces later anywhere, the timestamped signature proves the agent authored it. The hash uses SHA-256.

### 4.1.4 PermissionGrant

Permissions represent scoped, time-bounded capability grants between agents, enabling delegation and access control.

```json
{
  "id": "did:hacd:NHMYYM#permissions",
  "type": "PermissionGrant",
  "serviceEndpoint": "/api/permissions/did:hacd:NHMYYM"
}
```

**Endpoint response shape:**

```json
{
  "did": "did:hacd:NHMYYM",
  "granted": [
    {
      "id": "perm-001",
      "grantor": "did:hacd:NHMYYM",
      "grantee": "did:hacd:WTYUIA",
      "scope": "publish:attestations:on-behalf-of=NHMYYM",
      "conditions": {
        "maxPerDay": 10
      },
      "issuedAt": "2026-06-01T00:00:00.000Z",
      "expiresAt": "2026-09-01T00:00:00.000Z",
      "revoked": false,
      "signature": "base64url-ed25519-signature",
      "verificationMethod": "did:hacd:NHMYYM#agent-runtime-1"
    }
  ],
  "received": [
    {
      "id": "perm-002",
      "grantor": "did:hacd:MEKVHA",
      "grantee": "did:hacd:NHMYYM",
      "scope": "trade:execute:max-100-usd",
      "issuedAt": "2026-05-15T00:00:00.000Z",
      "expiresAt": "2026-08-15T00:00:00.000Z",
      "revoked": false,
      "signature": "base64url-ed25519-signature",
      "verificationMethod": "did:hacd:MEKVHA#agent-runtime-1"
    }
  ]
}
```

Example scopes: `trade:execute:max-1000-usd`, `publish:attestations`, `delegate:credentials:capability=research`. Permissions are verifiable against the grantor's DID Document.

### 4.1.5 Design Notes

**Why service entries vs new top-level fields?**
Using W3C `service` entries keeps the DID Document compliant with the DID Core specification. Existing DID resolvers and tooling can parse the document without modification, while custom-aware clients can discover and use the extensions.

**Why decoupled endpoints?**
Each pillar (reputation, credentials, memory, permissions) can scale independently. Reputation may have high read throughput, memory anchors may be append-heavy, and permissions may require frequent revocation checks. Separate endpoints allow targeted caching, rate limiting, and storage optimization per pillar.

**Why everything is signed by resolvable DIDs?**
Recursive verifiability is a core design principle. Every endorsement, credential, memory anchor, and permission is signed by a DID that can itself be resolved and verified. This creates a trust chain that can be followed all the way down to the PoW-anchored HACD identity, with no need for a centralized trust anchor.

---

## 5. On-Chain Anchoring Model

The integrity of a `did:hacd` document is enforced by a commitment stored in a
mutable Stack Token of type `AGNT` attached to the HACD.

### 5.1 The AGNT Stack Commitment

```json
{
  "t": "did:hacd/agnt",
  "did": "did:hacd:NHMYYM",
  "documentHash": "<sha-256 hex of the canonical document>",
  "versionId": 1,
  "deactivated": false,
  "documentUrl": "ipfs://bafy...",
  "proof": "<base64url Ed25519 signature over the commitment, proof omitted>"
}
```

Field semantics:

| Field          | Meaning                                                                       |
| -------------- | ----------------------------------------------------------------------------- |
| `t`            | Schema marker. MUST be `did:hacd/agnt`.                                       |
| `did`          | The DID this commitment anchors.                                              |
| `documentHash` | Lowercase hex SHA-256 of the canonical (RFC 8785) DID Document.               |
| `versionId`    | Monotonic counter. `1` on Create; strictly increasing on each Update.         |
| `deactivated`  | `true` once the DID is permanently deactivated.                               |
| `documentUrl`  | Resolvable location of the full document (`ipfs://` or `https://`).           |
| `proof`        | Ed25519 signature by the HACD owner over the commitment with `proof` removed. |

### 5.2 Canonicalization

Before hashing, the DID Document is canonicalized using the JSON
Canonicalization Scheme ([RFC 8785][rfc8785], JCS): object keys are sorted by
UTF-16 code unit and serialized without insignificant whitespace. The SHA-256
digest of this canonical byte string is the `documentHash`.

The same canonicalization is applied to the commitment body (with `proof`
omitted) before signing and verification, so that signatures are reproducible.

### 5.3 Trust Chain

```
HACD ownership (PoW + on-chain bid)
        │  authorizes
        ▼
AGNT Stack Token  ──commits──▶  documentHash + versionId + documentUrl
        │  signed by owner key
        ▼
DID Document (hosted at documentUrl)  ──hash MUST equal documentHash
```

A resolved document is trusted only if (a) the commitment signature verifies
against the owner key bound to the HACD, and (b) the hash of the fetched
document equals the on-chain `documentHash`.

---

## 6. Operations

### 6.1 Create

1. Generate or designate an Ed25519 owner key. Its public key is recorded as the
   verification method.
2. Build the DID Document (Section 4).
3. Canonicalize and hash the document → `documentHash`.
4. Host the document at `documentUrl`.
5. Construct the AGNT commitment with `versionId = 1`, `deactivated = false`.
6. Sign the commitment body with the owner key → `proof`.
7. Write the AGNT Stack Token to the HACD on-chain.

### 6.2 Read (Resolve)

See Section 7.

### 6.3 Update

1. Produce the new DID Document (e.g. rotated key, new service endpoint).
2. Recompute `documentHash` and host the new document (new `documentUrl`
   RECOMMENDED).
3. Construct a new commitment with `versionId` strictly greater than the current
   on-chain value.
4. Sign with the **current** owner key and overwrite the mutable AGNT token.

A resolver MUST reject an Update whose `versionId` is not strictly greater than
the previously committed value (replay/rollback protection).

### 6.4 Deactivate

1. Construct a commitment with `deactivated = true` and an incremented
   `versionId`.
2. Sign and write it to the AGNT token.

Once `deactivated` is `true`, the resolver MUST return error `deactivated` and a
`didDocumentMetadata.deactivated` of `true`. Deactivation is permanent for that
DID; the HACD itself remains a tradable asset but its DID is retired.

---

## 7. Resolution

### 7.1 Input

```
resolve(did: string, resolutionOptions?: object) → DidResolutionResult
```

Per DID Resolution, the input is the DID string and an optional options object
(reserved; no options are defined in v0.1).

### 7.2 Algorithm

1. Parse and validate `did` (Section 3). On failure → `invalidDid`.
2. Read the AGNT commitment and current owner public key for the inscription
   from chain. If none exists → `notFound`.
3. If `commitment.deactivated` is `true` → `deactivated`.
4. Verify `commitment.proof` against the owner key. On failure →
   `invalidSignature`.
5. Fetch the document from `commitment.documentUrl`. On failure → `notFound`.
6. Canonicalize and hash the fetched document. If it does not equal
   `commitment.documentHash` → `integrityViolation`.
7. If `document.id` ≠ `did` → `integrityViolation`.
8. Return the document with success metadata.

### 7.3 Output

```json
{
  "didResolutionMetadata": { "contentType": "application/did+json" },
  "didDocument": { "...": "..." },
  "didDocumentMetadata": {
    "versionId": "1",
    "deactivated": false,
    "documentHash": "…",
    "documentUrl": "ipfs://bafy…"
  }
}
```

On error, `didDocument` is `null`, and `didResolutionMetadata.error` is one of:

| Error                | Condition                                            |
| -------------------- | ---------------------------------------------------- |
| `invalidDid`         | Syntactically invalid DID or inscription.            |
| `notFound`           | No commitment on-chain, or document unreachable.     |
| `deactivated`        | The DID has been deactivated.                        |
| `invalidSignature`   | Commitment proof does not match the HACD owner key.  |
| `integrityViolation` | Document hash or `id` does not match the commitment. |
| `internalError`      | Chain read or resolver internal failure.             |

---

## 8. Security Considerations

- **Sybil resistance.** Identifier scarcity is enforced by proof-of-work; an
  attacker cannot mint identities in bulk. This is the method's core security
  property and the reason HACD is used rather than a free NFT.
- **Key rotation.** Update replaces the verification method. The commitment must
  be signed by the owner key authorized at the time of update. Operators SHOULD
  rotate keys on suspected compromise and SHOULD retain an out-of-band recovery
  path tied to HACD ownership.
- **Replay / rollback protection.** `versionId` MUST strictly increase. A
  resolver or indexer MUST reject commitments that reuse or lower the version,
  preventing an attacker from re-publishing a stale document.
- **Integrity binding.** The on-chain hash binds the exact canonical bytes of
  the document; any modification at the hosting layer is detected at resolution.
- **Ownership transfer.** Because control derives from HACD ownership,
  transferring the HACD transfers DID control. Counterparties SHOULD treat an
  ownership change as a trust-relevant event.

## 9. Privacy Considerations

- The DID Document is public by design. It MUST NOT contain personal data,
  secrets, or correlatable identifiers beyond what the agent intends to publish.
- The inscription is a stable, public identifier; activity associated with a DID
  is linkable. Operators wishing to limit correlation SHOULD use distinct HACDs
  for distinct agents or contexts.
- Hosting on IPFS exposes the document to public retrieval and pinning;
  operators SHOULD assume documents are permanently public once published.

---

## 10. References

- [W3C Decentralized Identifiers (DIDs) v1.0][did-core]
- [W3C DID Resolution][did-resolution]
- [RFC 8785 — JSON Canonicalization Scheme (JCS)][rfc8785]
- HACD Stack Protocol whitepaper (Hacash Diamond / Hybrid Stack Token) — Hacash
  project documentation.

[did-core]: https://www.w3.org/TR/did-core/
[did-resolution]: https://w3c-ccg.github.io/did-resolution/
[rfc8785]: https://www.rfc-editor.org/rfc/rfc8785
