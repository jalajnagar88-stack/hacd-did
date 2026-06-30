import { inscriptionToDid, parseDid } from '../did/did.js';
import type { JsonValue } from '../crypto/canonicalize.js';
import { documentHash } from '../crypto/hash.js';
import { signPayload, verifyPayload } from '../crypto/signature.js';
import {
  DID_CONTEXT,
  type DidDocument,
  type ServiceEndpoint,
  type SignedDidRecord,
  type StackCommitment,
  type VerificationMethod,
} from './types.js';

/** Options for constructing a new DID Document. */
export interface BuildDocumentOptions {
  /** HACD inscription (six letters) or a full did:hacd identifier. */
  readonly inscription: string;
  /** Owner public key as a base58btc multibase string (z...). */
  readonly publicKeyMultibase: string;
  /** Optional service endpoints to advertise. */
  readonly services?: readonly ServiceEndpoint[];
}

function resolveDid(inscriptionOrDid: string): string {
  return inscriptionOrDid.startsWith('did:')
    ? parseDid(inscriptionOrDid).did
    : inscriptionToDid(inscriptionOrDid);
}

/**
 * Builds a canonical, deterministic DID Document for a HACD inscription. The
 * primary verification method id is always `<did>#agent-key-1`.
 */
export function buildDidDocument(options: BuildDocumentOptions): DidDocument {
  const did = resolveDid(options.inscription);
  const keyId = `${did}#agent-key-1`;

  const verificationMethod: VerificationMethod = {
    id: keyId,
    type: 'Ed25519VerificationKey2020',
    controller: did,
    publicKeyMultibase: options.publicKeyMultibase,
  };

  const base: DidDocument = {
    '@context': [DID_CONTEXT, 'https://w3id.org/security/suites/ed25519-2020/v1'],
    id: did,
    controller: did,
    verificationMethod: [verificationMethod],
    authentication: [keyId],
    assertionMethod: [keyId],
  };

  if (options.services && options.services.length > 0) {
    return { ...base, service: options.services };
  }
  return base;
}

/** Strips the `proof` field so a commitment can be signed/verified over its body. */
function commitmentBody(commitment: StackCommitment): JsonValue {
  const { proof: _proof, ...body } = commitment;
  return body as unknown as JsonValue;
}

/** Options for committing a document into an AGNT Stack Token payload. */
export interface CommitOptions {
  readonly document: DidDocument;
  /** Resolvable location of the hosted document (ipfs:// or https://). */
  readonly documentUrl: string;
  /** Owner private key (base64url) used to sign the commitment. */
  readonly privateKeyBase64Url: string;
  /** Version counter; 1 for Create, incremented for each Update. */
  readonly versionId?: number;
  /** Whether this commitment deactivates the DID. */
  readonly deactivated?: boolean;
}

/**
 * Produces a signed {@link StackCommitment} for a DID Document — the exact
 * payload written into the mutable AGNT Stack Token on-chain.
 */
export function commitDocument(options: CommitOptions): StackCommitment {
  const unsigned: Omit<StackCommitment, 'proof'> = {
    t: 'did:hacd/agnt',
    did: options.document.id,
    documentHash: documentHash(options.document as unknown as JsonValue),
    versionId: options.versionId ?? 1,
    deactivated: options.deactivated ?? false,
    documentUrl: options.documentUrl,
  };
  const proof = signPayload(unsigned as unknown as JsonValue, options.privateKeyBase64Url);
  return { ...unsigned, proof };
}

/** Bundles a document, its on-chain commitment, and its hosting URL into one record. */
export function buildSignedRecord(options: CommitOptions): SignedDidRecord {
  const commitment = commitDocument(options);
  return {
    did: options.document.id,
    document: options.document,
    commitment,
    documentUrl: options.documentUrl,
  };
}

/**
 * Verifies the signature on a Stack Token commitment against an owner public key.
 * Does not check the document hash — see the resolver for full verification.
 */
export function verifyCommitmentSignature(
  commitment: StackCommitment,
  publicKeyMultibase: string,
): boolean {
  return verifyPayload(commitmentBody(commitment), commitment.proof, publicKeyMultibase);
}
