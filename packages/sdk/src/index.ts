/**
 * @pow-agents/sdk — reference implementation of the did:hacd method.
 *
 * Proof-of-Work Decentralized Identifiers for AI agents, anchored to HACD
 * (Hacash Diamond) inscriptions via mutable AGNT Stack Tokens.
 */

// DID identifier
export {
  HACD_ALPHABET,
  HACD_INSCRIPTION_LENGTH,
  isHacdLetter,
  isValidHacd,
  isValidInscription,
  type HacdLetter,
} from './did/alphabet.js';
export {
  DID_METHOD,
  DID_PREFIX,
  InvalidDidError,
  inscriptionToDid,
  isValidDid,
  parseDid,
  type ParsedDid,
} from './did/did.js';

// Crypto primitives
export { canonicalize, type JsonValue } from './crypto/canonicalize.js';
export { documentHash, sha256Hex } from './crypto/hash.js';
export {
  agentMessagePayload,
  signMessage,
  verifyMessage,
  MESSAGE_PAYLOAD_VERSION,
} from './crypto/message.js';
export {
  decodeMultibasePublic,
  encodeMultibasePublic,
  generateKeyPair,
  signPayload,
  verifyPayload,
  type KeyPair,
} from './crypto/signature.js';

// DID Document + Stack Token commitment
export {
  DID_CONTEXT,
  type DidDocument,
  type ServiceEndpoint,
  type SignedDidRecord,
  type StackCommitment,
  type VerificationMethod,
} from './document/types.js';
export {
  buildDidDocument,
  buildSignedRecord,
  commitDocument,
  verifyCommitmentSignature,
  type BuildDocumentOptions,
  type CommitOptions,
} from './document/builder.js';

// Resolver
export { HacdResolver, type ResolverConfig } from './resolver/resolver.js';
export { InMemoryChain } from './resolver/memory.js';
export {
  type ChainReader,
  type ChainRecord,
  type DidDocumentMetadata,
  type DidResolutionError,
  type DidResolutionMetadata,
  type DidResolutionResult,
  type DocumentFetcher,
} from './resolver/types.js';
