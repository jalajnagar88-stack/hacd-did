import { signPayload, verifyPayload } from './signature.js';

/**
 * The canonical signing payload for an agent message.
 *
 * The signature covers a single deterministic concatenation of the message
 * content, the signing timestamp, and the signer DID, joined by a delimiter
 * that cannot appear ambiguously. This MUST be used identically on both the
 * signing side (/api/chat) and the verifying side (/api/verify).
 *
 * The signed payload is EXACTLY this string — there is no JSON wrapping of the
 * content itself.
 */
export const MESSAGE_PAYLOAD_VERSION = 'did:hacd/msg/v1';

/** Builds the canonical agent-message string that gets signed and verified. */
export function agentMessagePayload(content: string, signedAt: string, did: string): string {
  return `${MESSAGE_PAYLOAD_VERSION}\n${did}\n${signedAt}\n${content}`;
}

/**
 * Signs an agent message with the agent's runtime private key. Returns a
 * base64url Ed25519 signature over {@link agentMessagePayload}.
 */
export function signMessage(
  content: string,
  signedAt: string,
  did: string,
  privateKeyBase64Url: string,
): string {
  return signPayload(agentMessagePayload(content, signedAt, did), privateKeyBase64Url);
}

/**
 * Verifies an agent-message signature against a public key. The caller resolves
 * the DID, selects the verification method, and passes its publicKeyMultibase.
 */
export function verifyMessage(
  content: string,
  signedAt: string,
  did: string,
  signatureBase64Url: string,
  publicKeyMultibase: string,
): boolean {
  return verifyPayload(
    agentMessagePayload(content, signedAt, did),
    signatureBase64Url,
    publicKeyMultibase,
  );
}
