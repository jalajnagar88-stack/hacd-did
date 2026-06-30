# Architecture

## System Overview

The did:hacd system consists of three main components:

1. **HACD Blockchain** - The underlying Proof-of-Work blockchain that provides the scarce identity layer
2. **SDK (@pow-agents/sdk)** - TypeScript library for DID operations, signing, and verification
3. **Web Application** - Next.js application providing the user interface and API endpoints

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              User Interface                                   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │ Landing  │  │  Chat    │  │ Resolve  │  │  Mint    │  │ Anatomy  │  │
│  │  Page    │  │  UI      │  │ Console │  │  Flow    │  │  View    │  │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘  │
│       │              │              │              │              │         │
│       └──────────────┴──────────────┴──────────────┴──────────────┘         │
│                                      │                                     │
└──────────────────────────────────────┼─────────────────────────────────────┘
                                       │
┌──────────────────────────────────────┼─────────────────────────────────────┐
│                              API Layer                                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │ /resolve │  │ /chat    │  │ /verify  │  │ /mint    │  │ /api/*   │  │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘  │
│       │              │              │              │              │         │
│       └──────────────┴──────────────┴──────────────┴──────────────┘         │
│                                      │                                     │
└──────────────────────────────────────┼─────────────────────────────────────┘
                                       │
┌──────────────────────────────────────┼─────────────────────────────────────┐
│                          Business Logic Layer                                │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │Registry  │  │ Resolver │  │ Signer   │  │ Verifier │  │ Pillar   │  │
│  │ Manager  │  │ Service  │  │ Service  │  │ Service  │  │ Store    │  │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘  │
│       │              │              │              │              │         │
│       └──────────────┴──────────────┴──────────────┴──────────────┘         │
│                                      │                                     │
└──────────────────────────────────────┼─────────────────────────────────────┘
                                       │
┌──────────────────────────────────────┼─────────────────────────────────────┐
│                              SDK Layer                                       │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │ DID      │  │ Document │  │ Crypto   │  │ Chain    │  │ Verify   │  │
│  │ Parser   │  │ Builder  │  │ Utils    │  │ Reader   │  │ Utils    │  │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘  │
│       │              │              │              │              │         │
│       └──────────────┴──────────────┴──────────────┴──────────────┘         │
│                                      │                                     │
└──────────────────────────────────────┼─────────────────────────────────────┘
                                       │
┌──────────────────────────────────────┼─────────────────────────────────────┐
│                           Storage Layer                                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │ Keystore │  │Registry  │  │ Reputation│  │Credential│  │ Memory   │  │
│  │ (Keys)   │  │ (Agents) │  │  Data    │  │  Data    │  │  Data    │  │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘  └──────────┘  │
│                                                                           │
└──────────────────────────────────────┼─────────────────────────────────────┘
                                       │
┌──────────────────────────────────────┼─────────────────────────────────────┐
│                          HACD Blockchain                                    │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                                │
│  │ HACD     │  │ AGNT     │  │ Stack    │                                │
│  │ Inscriptions│ Commitments│ Tokens   │                                │
│  └──────────┘  └──────────┘  └──────────┘                                │
│                                                                           │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Component Details

### User Interface Layer

- **Landing Page**: Hero section, featured agents, resolver console
- **Chat UI**: Real-time chat with signed agent messages
- **Resolver Console**: DID resolution and verification UI
- **Mint Flow**: Agent creation and DID document registration
- **Anatomy View**: Five-layer breakdown of agent identity

### API Layer

- **GET /api/resolve**: W3C DID resolution endpoint
- **POST /api/chat**: Agent chat with signed responses
- **POST /api/verify**: Signature verification endpoint
- **POST /api/mint**: Agent registration endpoint
- **GET/POST /api/reputation/[did]**: Reputation data management
- **GET/POST /api/credentials/[did]**: Credential management
- **GET/POST /api/memory/[did]**: Memory anchor management
- **GET/POST /api/permissions/[did]**: Permission grant management

### Business Logic Layer

- **Registry Manager**: Manages agent profiles and minted agents
- **Resolver Service**: DID resolution with chain integration
- **Signer Service**: Signs agent messages with runtime keys
- **Verifier Service**: Verifies signatures against resolved DIDs
- **Pillar Store**: Manages the four extended identity layers

### SDK Layer

- **DID Parser**: Parses and validates did:hacd identifiers
- **Document Builder**: Constructs W3C-compliant DID documents
- **Crypto Utils**: Ed25519 key generation and signing
- **Chain Reader**: Abstraction over HACD blockchain data
- **Verify Utils**: Signature verification utilities

### Storage Layer

- **Keystore**: Server-held runtime signing keys
- **Registry**: Minted agent records
- **Reputation Data**: Endorsement network data
- **Credential Data**: Verifiable credentials
- **Memory Data**: Content hash anchors
- **Permission Data**: Capability grants

### HACD Blockchain

- **HACD Inscriptions**: Six-letter PoW-mined identities
- **AGNT Commitments**: On-chain DID document commitments
- **Stack Tokens**: Document hash storage

## Data Flow

### DID Resolution Flow

1. User enters DID in resolver console
2. API calls `/api/resolve?did=did:hacd:XXXXXX`
3. Resolver Service queries Chain Reader for AGNT commitment
4. Document hash is verified against on-chain commitment
5. Owner signature is verified
6. DID document with five-layer service endpoints is returned

### Agent Chat Flow

1. User sends message to `/api/chat`
2. Chat Service retrieves agent profile and system prompt
3. Response is generated (scripted or from LLM)
4. Signer Service signs response with agent's runtime key
5. Signed proof is returned to client
6. Client displays message with verification link

### Credential Issuance Flow

1. User navigates to `/delegate` page
2. Forms credential issuance request
3. API calls `/api/credentials/[issuerDid]` with POST
4. Credential is signed with issuer's runtime key
5. Credential is added to issuer's "issued" list
6. Credential is added to subject's "held" list
7. Updated credential data is persisted

## Security Model

### Key Management

- **Owner Key**: Controls DID document (held by agent owner)
- **Runtime Key**: Signs agent messages (held by server)
- **Publishing Key**: Used for on-chain commitments (server-held)

### Verification Chain

1. DID syntax validation
2. On-chain AGNT commitment verification
3. Owner signature verification
4. Document hash integrity check
5. Runtime key verification for signed messages

### Threat Mitigations

- **Sybil Attacks**: PoW scarcity makes identity creation expensive
- **Impersonation**: Cryptographic signatures prevent forgery
- **Censorship**: Decentralized blockchain prevents single-point control
- **Key Compromise**: Key rotation supported via DID document updates

## Deployment Architecture

### Development

- Next.js dev server on localhost:3000
- In-memory chain reader for testing
- File-based storage for keystore and registry

### Production

- Vercel deployment for web application
- Real HACD node integration for chain reader
- Managed KMS for key storage
- Persistent database for pillar data

## Extension Points

### Custom LLM Integration

Replace the scripted response system in `/api/chat` with any LLM provider:

```typescript
const content = await callYourModel({
  system: profile.systemPrompt,
  messages: clean,
  model: profile.model,
});
const proof = signAgentMessage(did, content, signedAt);
```

### Custom Chain Reader

Replace `InMemoryChain` with a real HACD node implementation:

```typescript
class RealChainReader implements ChainReader {
  async getCommitment(inscription: string): Promise<Commitment | null> {
    // Query real HACD blockchain
  }
}
```

### Additional Pillars

Extend the five-layer model with custom pillars:

1. Add service endpoint to DID document
2. Create API route for pillar data
3. Add seed data structure
4. Integrate with resolver and anatomy views
