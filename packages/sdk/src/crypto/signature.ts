import { createPrivateKey, createPublicKey, generateKeyPairSync, sign, verify } from 'node:crypto';
import { canonicalize, type JsonValue } from './canonicalize.js';

/**
 * A minimal Ed25519 keypair, encoded as raw 32-byte keys in base64url. The HACD
 * owner key controls the DID; in production this is the key that also authorizes
 * the on-chain AGNT Stack Token update, binding document control to HACD
 * ownership.
 */
export interface KeyPair {
  readonly publicKeyMultibase: string;
  readonly privateKeyBase64Url: string;
}

const ED25519_OID_DER_PREFIX_PUBLIC = Buffer.from('302a300506032b6570032100', 'hex');
const ED25519_OID_DER_PREFIX_PRIVATE = Buffer.from('302e020100300506032b657004220420', 'hex');
// Multicodec prefix 0xed01 marks an Ed25519 public key in a did:key-style multibase value.
const ED25519_MULTICODEC_PREFIX = Buffer.from('ed01', 'hex');

function base64url(buf: Buffer): string {
  return buf.toString('base64url');
}

function fromBase64url(value: string): Buffer {
  return Buffer.from(value, 'base64url');
}

/** Generates a fresh Ed25519 keypair for signing DID Documents. */
export function generateKeyPair(): KeyPair {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519');
  const rawPublic = publicKey.export({ type: 'spki', format: 'der' }).subarray(-32);
  const rawPrivate = privateKey.export({ type: 'pkcs8', format: 'der' }).subarray(-32);
  return {
    publicKeyMultibase: encodeMultibasePublic(rawPublic),
    privateKeyBase64Url: base64url(rawPrivate),
  };
}

/** Encodes a 32-byte Ed25519 public key as a `z`-prefixed base58btc multibase value. */
export function encodeMultibasePublic(rawPublic: Buffer): string {
  const tagged = Buffer.concat([ED25519_MULTICODEC_PREFIX, rawPublic]);
  return `z${base58btcEncode(tagged)}`;
}

/** Decodes a `z`-prefixed multibase Ed25519 public key back to its 32 raw bytes. */
export function decodeMultibasePublic(multibase: string): Buffer {
  if (!multibase.startsWith('z')) {
    throw new Error('Unsupported multibase prefix; expected base58btc "z"');
  }
  const decoded = base58btcDecode(multibase.slice(1));
  if (!decoded.subarray(0, 2).equals(ED25519_MULTICODEC_PREFIX)) {
    throw new Error('Public key is not tagged as Ed25519 (multicodec 0xed01)');
  }
  return decoded.subarray(2);
}

function rawPrivateToKeyObject(rawPrivate: Buffer) {
  const der = Buffer.concat([ED25519_OID_DER_PREFIX_PRIVATE, rawPrivate]);
  return createPrivateKey({ key: der, format: 'der', type: 'pkcs8' });
}

function rawPublicToKeyObject(rawPublic: Buffer) {
  const der = Buffer.concat([ED25519_OID_DER_PREFIX_PUBLIC, rawPublic]);
  return createPublicKey({ key: der, format: 'der', type: 'spki' });
}

/**
 * Signs the canonical form (RFC 8785) of `payload` with an Ed25519 private key.
 * Returns the signature as a base64url string.
 */
export function signPayload(payload: JsonValue, privateKeyBase64Url: string): string {
  const key = rawPrivateToKeyObject(fromBase64url(privateKeyBase64Url));
  const message = Buffer.from(canonicalize(payload), 'utf8');
  const sig = sign(null, message, key);
  return base64url(sig);
}

/**
 * Verifies that `signatureBase64Url` is a valid Ed25519 signature over the
 * canonical form of `payload`, made by the holder of `publicKeyMultibase`.
 */
export function verifyPayload(
  payload: JsonValue,
  signatureBase64Url: string,
  publicKeyMultibase: string,
): boolean {
  try {
    const key = rawPublicToKeyObject(decodeMultibasePublic(publicKeyMultibase));
    const message = Buffer.from(canonicalize(payload), 'utf8');
    return verify(null, message, key, fromBase64url(signatureBase64Url));
  } catch {
    return false;
  }
}

// --- base58btc (Bitcoin alphabet) -----------------------------------------

const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

function base58btcEncode(buffer: Buffer): string {
  if (buffer.length === 0) return '';
  const digits: number[] = [0];
  for (const byte of buffer) {
    let carry = byte;
    for (let i = 0; i < digits.length; i++) {
      carry += (digits[i] as number) << 8;
      digits[i] = carry % 58;
      carry = (carry / 58) | 0;
    }
    while (carry > 0) {
      digits.push(carry % 58);
      carry = (carry / 58) | 0;
    }
  }
  let result = '';
  for (let k = 0; buffer[k] === 0 && k < buffer.length - 1; k++) {
    result += BASE58_ALPHABET[0];
  }
  for (let i = digits.length - 1; i >= 0; i--) {
    result += BASE58_ALPHABET[digits[i] as number];
  }
  return result;
}

function base58btcDecode(value: string): Buffer {
  if (value.length === 0) return Buffer.alloc(0);
  const bytes: number[] = [0];
  for (const char of value) {
    const carryStart = BASE58_ALPHABET.indexOf(char);
    if (carryStart < 0) throw new Error(`Invalid base58 character: ${char}`);
    let carry = carryStart;
    for (let i = 0; i < bytes.length; i++) {
      carry += (bytes[i] as number) * 58;
      bytes[i] = carry & 0xff;
      carry >>= 8;
    }
    while (carry > 0) {
      bytes.push(carry & 0xff);
      carry >>= 8;
    }
  }
  let leadingZeros = 0;
  for (let k = 0; value[k] === BASE58_ALPHABET[0] && k < value.length - 1; k++) {
    leadingZeros++;
  }
  return Buffer.concat([Buffer.alloc(leadingZeros), Buffer.from(bytes.reverse())]);
}
