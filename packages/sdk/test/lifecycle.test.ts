import { describe, expect, it } from 'vitest';
import {
  buildDidDocument,
  buildSignedRecord,
  commitDocument,
  generateKeyPair,
  HacdResolver,
  inscriptionToDid,
  InMemoryChain,
  verifyCommitmentSignature,
} from '../src/index.js';

const INSCRIPTION = 'NHMYYM';

function setup() {
  const owner = generateKeyPair();
  const document = buildDidDocument({
    inscription: INSCRIPTION,
    publicKeyMultibase: owner.publicKeyMultibase,
    services: [
      {
        id: `${inscriptionToDid(INSCRIPTION)}#agent`,
        type: 'AutonomousAgent',
        serviceEndpoint: 'https://agents.example/polymind',
      },
    ],
  });
  return { owner, document };
}

describe('did:hacd lifecycle', () => {
  it('Create → Resolve verifies end to end', async () => {
    const { owner, document } = setup();
    const documentUrl = 'ipfs://bafyDemoDocumentCid';
    const record = buildSignedRecord({
      document,
      documentUrl,
      privateKeyBase64Url: owner.privateKeyBase64Url,
      versionId: 1,
    });

    expect(verifyCommitmentSignature(record.commitment, owner.publicKeyMultibase)).toBe(true);

    const chain = new InMemoryChain();
    chain.publish(record, owner.publicKeyMultibase);
    const resolver = new HacdResolver({ chain, fetchDocument: chain.fetcher });

    const result = await resolver.resolve(inscriptionToDid(INSCRIPTION));
    expect(result.didResolutionMetadata.error).toBeUndefined();
    expect(result.didDocument?.id).toBe(inscriptionToDid(INSCRIPTION));
    expect(result.didDocumentMetadata.versionId).toBe('1');
    expect(result.didDocumentMetadata.documentHash).toBe(record.commitment.documentHash);
  });

  it('detects a tampered document (integrity violation)', async () => {
    const { owner, document } = setup();
    const documentUrl = 'ipfs://bafyTamper';
    const record = buildSignedRecord({
      document,
      documentUrl,
      privateKeyBase64Url: owner.privateKeyBase64Url,
    });

    const chain = new InMemoryChain();
    chain.publish(record, owner.publicKeyMultibase);

    // Serve a different document at the same URL than what was committed.
    const tampered = buildDidDocument({
      inscription: INSCRIPTION,
      publicKeyMultibase: generateKeyPair().publicKeyMultibase,
    });
    const resolver = new HacdResolver({
      chain,
      fetchDocument: () => Promise.resolve(tampered),
    });

    const result = await resolver.resolve(inscriptionToDid(INSCRIPTION));
    expect(result.didResolutionMetadata.error).toBe('integrityViolation');
    expect(result.didDocument).toBeNull();
  });

  it('rejects a commitment signed by the wrong key', () => {
    const { owner, document } = setup();
    const attacker = generateKeyPair();
    const commitment = commitDocument({
      document,
      documentUrl: 'ipfs://x',
      privateKeyBase64Url: attacker.privateKeyBase64Url,
    });
    expect(verifyCommitmentSignature(commitment, owner.publicKeyMultibase)).toBe(false);
  });

  it('Update increments versionId and re-resolves', async () => {
    const { owner, document } = setup();
    const chain = new InMemoryChain();
    const resolver = new HacdResolver({ chain, fetchDocument: chain.fetcher });

    chain.publish(
      buildSignedRecord({
        document,
        documentUrl: 'ipfs://v1',
        privateKeyBase64Url: owner.privateKeyBase64Url,
        versionId: 1,
      }),
      owner.publicKeyMultibase,
    );

    const rotated = generateKeyPair();
    const updated = buildDidDocument({
      inscription: INSCRIPTION,
      publicKeyMultibase: rotated.publicKeyMultibase,
    });
    chain.publish(
      buildSignedRecord({
        document: updated,
        documentUrl: 'ipfs://v2',
        privateKeyBase64Url: owner.privateKeyBase64Url,
        versionId: 2,
      }),
      owner.publicKeyMultibase,
    );

    const result = await resolver.resolve(inscriptionToDid(INSCRIPTION));
    expect(result.didDocumentMetadata.versionId).toBe('2');
    expect(result.didDocument?.verificationMethod[0]?.publicKeyMultibase).toBe(
      rotated.publicKeyMultibase,
    );
  });

  it('Deactivate makes the DID unresolvable', async () => {
    const { owner, document } = setup();
    const chain = new InMemoryChain();
    const resolver = new HacdResolver({ chain, fetchDocument: chain.fetcher });

    chain.publish(
      buildSignedRecord({
        document,
        documentUrl: 'ipfs://gone',
        privateKeyBase64Url: owner.privateKeyBase64Url,
        versionId: 2,
        deactivated: true,
      }),
      owner.publicKeyMultibase,
    );

    const result = await resolver.resolve(inscriptionToDid(INSCRIPTION));
    expect(result.didResolutionMetadata.error).toBe('deactivated');
    expect(result.didDocumentMetadata.deactivated).toBe(true);
  });

  it('returns notFound for an unregistered inscription', async () => {
    const chain = new InMemoryChain();
    const resolver = new HacdResolver({ chain, fetchDocument: chain.fetcher });
    const result = await resolver.resolve('did:hacd:WTYUIA');
    expect(result.didResolutionMetadata.error).toBe('notFound');
  });

  it('returns invalidDid for malformed input', async () => {
    const chain = new InMemoryChain();
    const resolver = new HacdResolver({ chain, fetchDocument: chain.fetcher });
    const result = await resolver.resolve('did:hacd:abcdef');
    expect(result.didResolutionMetadata.error).toBe('invalidDid');
  });
});
