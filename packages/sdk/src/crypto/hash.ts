import { createHash } from 'node:crypto';
import { canonicalize, type JsonValue } from './canonicalize.js';

/**
 * Computes the SHA-256 digest of an arbitrary byte string or UTF-8 text,
 * returned as a lowercase hex string.
 */
export function sha256Hex(input: string | Uint8Array): string {
  return createHash('sha256').update(input).digest('hex');
}

/**
 * Canonicalizes a JSON document (RFC 8785) and returns the SHA-256 digest of
 * its canonical form as a lowercase hex string. This is the value committed
 * on-chain inside the AGNT Stack Token.
 */
export function documentHash(document: JsonValue): string {
  return sha256Hex(canonicalize(document));
}
