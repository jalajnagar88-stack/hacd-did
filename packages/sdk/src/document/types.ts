/**
 * W3C DID Core data structures, narrowed to what the did:hacd method uses.
 * @see https://www.w3.org/TR/did-core/
 */

export const DID_CONTEXT = 'https://www.w3.org/ns/did/v1';

/** A verification method (public key) embedded in a DID Document. */
export interface VerificationMethod {
  readonly id: string;
  readonly type: 'Ed25519VerificationKey2020';
  readonly controller: string;
  readonly publicKeyMultibase: string;
}

/** A service endpoint advertised by the agent (e.g. an agent API or A2A endpoint). */
export interface ServiceEndpoint {
  readonly id: string;
  readonly type: string;
  readonly serviceEndpoint: string;
}

/** A W3C DID Document for a did:hacd identifier. */
export interface DidDocument {
  readonly '@context': readonly [typeof DID_CONTEXT, ...string[]];
  readonly id: string;
  readonly controller: string;
  readonly verificationMethod: readonly VerificationMethod[];
  readonly authentication: readonly string[];
  readonly assertionMethod: readonly string[];
  readonly service?: readonly ServiceEndpoint[];
}

/**
 * The payload committed on-chain inside the mutable AGNT Stack Token attached to
 * the HACD. The resolver reads this from the stack to verify a resolved
 * document. `versionId` is a monotonically increasing counter used for replay
 * protection and update ordering.
 */
export interface StackCommitment {
  /** Schema marker for the commitment payload. */
  readonly t: 'did:hacd/agnt';
  /** The DID this commitment belongs to. */
  readonly did: string;
  /** SHA-256 hex digest of the canonical (RFC 8785) DID Document. */
  readonly documentHash: string;
  /** Monotonic version counter; increments on every Update. */
  readonly versionId: number;
  /** `true` once the DID has been deactivated. */
  readonly deactivated: boolean;
  /** Resolvable location (ipfs:// or https://) where the full document is hosted. */
  readonly documentUrl: string;
  /** Ed25519 signature (base64url) over the canonical commitment with this field omitted. */
  readonly proof: string;
}

/** A signed, distributable DID record: the document, its commitment, and where it lives. */
export interface SignedDidRecord {
  readonly did: string;
  readonly document: DidDocument;
  readonly commitment: StackCommitment;
  readonly documentUrl: string;
}
