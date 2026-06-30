import type { JsonValue } from '../crypto/canonicalize.js';
import { documentHash } from '../crypto/hash.js';
import { InvalidDidError, parseDid } from '../did/did.js';
import { verifyCommitmentSignature } from '../document/builder.js';
import type {
  ChainReader,
  DidResolutionError,
  DidResolutionResult,
  DocumentFetcher,
} from './types.js';

/** Configuration for {@link HacdResolver}. */
export interface ResolverConfig {
  readonly chain: ChainReader;
  readonly fetchDocument: DocumentFetcher;
}

function failure(
  error: DidResolutionError,
  message: string,
  deactivated = false,
): DidResolutionResult {
  return {
    didResolutionMetadata: { error, message },
    didDocument: null,
    didDocumentMetadata: deactivated ? { deactivated: true } : {},
  };
}

/**
 * Resolves did:hacd identifiers per the W3C DID Resolution specification.
 *
 * The verification chain is, in order:
 *   1. Parse and validate the DID syntax.
 *   2. Read the AGNT Stack Token commitment + owner key from chain.
 *   3. Reject if the commitment marks the DID deactivated.
 *   4. Verify the commitment signature against the owner key (controller proof).
 *   5. Fetch the hosted document from the committed URL.
 *   6. Recompute the document hash and require it to equal the on-chain hash.
 *   7. Require the document `id` to equal the requested DID.
 */
export class HacdResolver {
  private readonly chain: ChainReader;
  private readonly fetchDocument: DocumentFetcher;

  constructor(config: ResolverConfig) {
    this.chain = config.chain;
    this.fetchDocument = config.fetchDocument;
  }

  async resolve(did: string): Promise<DidResolutionResult> {
    let inscription: string;
    try {
      inscription = parseDid(did).inscription;
    } catch (err) {
      const message = err instanceof InvalidDidError ? err.message : 'malformed DID';
      return failure('invalidDid', message);
    }

    let record;
    try {
      record = await this.chain.readCommitment(inscription);
    } catch (err) {
      return failure('internalError', `chain read failed: ${describe(err)}`);
    }

    if (record === null) {
      return failure('notFound', `no DID commitment found for ${did}`);
    }

    const { commitment, ownerPublicKeyMultibase } = record;

    if (commitment.deactivated) {
      return failure('deactivated', `${did} has been deactivated`, true);
    }

    if (!verifyCommitmentSignature(commitment, ownerPublicKeyMultibase)) {
      return failure('invalidSignature', 'commitment signature does not match HACD owner key');
    }

    let document;
    try {
      document = await this.fetchDocument(commitment.documentUrl);
    } catch (err) {
      return failure('notFound', `failed to fetch document: ${describe(err)}`);
    }

    const computed = documentHash(document as unknown as JsonValue);
    if (computed !== commitment.documentHash) {
      return failure(
        'integrityViolation',
        `document hash mismatch: hosted=${computed} committed=${commitment.documentHash}`,
      );
    }

    if (document.id !== did) {
      return failure(
        'integrityViolation',
        `document id "${document.id}" does not match requested DID "${did}"`,
      );
    }

    return {
      didResolutionMetadata: { contentType: 'application/did+json' },
      didDocument: document,
      didDocumentMetadata: {
        versionId: String(commitment.versionId),
        deactivated: false,
        documentHash: commitment.documentHash,
        documentUrl: commitment.documentUrl,
      },
    };
  }
}

function describe(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
