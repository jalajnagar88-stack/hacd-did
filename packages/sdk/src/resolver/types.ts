import type { DidDocument, StackCommitment } from '../document/types.js';

/**
 * Reads the on-chain state for a HACD inscription. Implementations talk to a
 * Hacash node, an indexer, or (for tests and demos) an in-memory map.
 */
export interface ChainReader {
  /**
   * Returns the AGNT Stack Token commitment attached to the HACD with the given
   * inscription, the owner public key currently bound to that HACD, or `null`
   * if the inscription has no DID commitment.
   */
  readCommitment(inscription: string): Promise<ChainRecord | null>;
}

/** On-chain state for a single HACD inscription. */
export interface ChainRecord {
  /** Owner public key as a base58btc multibase string (z...). */
  readonly ownerPublicKeyMultibase: string;
  /** The committed AGNT Stack Token payload. */
  readonly commitment: StackCommitment;
}

/** Fetches a hosted DID Document from a resolvable URL (ipfs:// or https://). */
export type DocumentFetcher = (url: string) => Promise<DidDocument>;

/** Resolution metadata, per the W3C DID Resolution specification. */
export interface DidResolutionMetadata {
  readonly contentType?: string;
  /** Set when resolution fails. */
  readonly error?: DidResolutionError;
  /** Human-readable detail accompanying an error. */
  readonly message?: string;
}

export type DidResolutionError =
  | 'invalidDid'
  | 'notFound'
  | 'deactivated'
  | 'integrityViolation'
  | 'invalidSignature'
  | 'internalError';

/** DID document metadata, per W3C DID Resolution. */
export interface DidDocumentMetadata {
  readonly versionId?: string;
  readonly deactivated?: boolean;
  /** SHA-256 hex digest verified against the on-chain commitment. */
  readonly documentHash?: string;
  /** The resolvable URL the document was fetched from. */
  readonly documentUrl?: string;
}

/** The full result of resolving a did:hacd identifier. */
export interface DidResolutionResult {
  readonly didResolutionMetadata: DidResolutionMetadata;
  readonly didDocument: DidDocument | null;
  readonly didDocumentMetadata: DidDocumentMetadata;
}
