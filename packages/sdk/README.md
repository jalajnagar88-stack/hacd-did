# @pow-agents/sdk

Reference implementation of the **did:hacd** method — Proof-of-Work
Decentralized Identifiers for AI agents, anchored to HACD (Hacash Diamond)
inscriptions through mutable `AGNT` Stack Tokens.

See [`docs/spec.md`](../../docs/spec.md) for the full method specification.

## Install

```bash
pnpm add @pow-agents/sdk
```

## Quick start

```ts
import {
  buildDidDocument,
  buildSignedRecord,
  generateKeyPair,
  HacdResolver,
  InMemoryChain,
  inscriptionToDid,
} from '@pow-agents/sdk';

// 1. The HACD owner holds an Ed25519 key.
const owner = generateKeyPair();

// 2. Build a DID Document for the inscription NHMYYM.
const document = buildDidDocument({
  inscription: 'NHMYYM',
  publicKeyMultibase: owner.publicKeyMultibase,
  services: [
    {
      id: `${inscriptionToDid('NHMYYM')}#agent`,
      type: 'AutonomousAgent',
      serviceEndpoint: 'https://agents.example/polymind',
    },
  ],
});

// 3. Commit it: hash the document and sign the AGNT Stack Token payload.
const record = buildSignedRecord({
  document,
  documentUrl: 'ipfs://bafyExampleCid',
  privateKeyBase64Url: owner.privateKeyBase64Url,
  versionId: 1,
});

// 4. Publish to a chain (here, an in-memory chain for demo) and resolve.
const chain = new InMemoryChain();
chain.publish(record, owner.publicKeyMultibase);

const resolver = new HacdResolver({ chain, fetchDocument: chain.fetcher });
const result = await resolver.resolve('did:hacd:NHMYYM');

console.log(result.didDocument?.id); // did:hacd:NHMYYM
console.log(result.didDocumentMetadata.documentHash); // verified on-chain hash
```

## API surface

| Area     | Exports                                                                                        |
| -------- | ---------------------------------------------------------------------------------------------- |
| DID      | `parseDid`, `inscriptionToDid`, `isValidDid`, `isValidInscription`, `HACD_ALPHABET`            |
| Crypto   | `canonicalize`, `documentHash`, `sha256Hex`, `generateKeyPair`, `signPayload`, `verifyPayload` |
| Document | `buildDidDocument`, `commitDocument`, `buildSignedRecord`, `verifyCommitmentSignature`         |
| Resolver | `HacdResolver`, `InMemoryChain`, and the `ChainReader` / `DocumentFetcher` interfaces          |

To integrate a real chain, implement `ChainReader.readCommitment(inscription)`
against a Hacash node or indexer and pass a `DocumentFetcher` that reads
`ipfs://` / `https://` URLs.

## Scripts

```bash
pnpm build   # tsc → dist/
pnpm test    # vitest
```
