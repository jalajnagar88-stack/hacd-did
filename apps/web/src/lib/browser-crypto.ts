/**
 * Browser-side cryptography for the mint flow, byte-compatible with the
 * node-based @pow-agents/sdk. We do not import the SDK here because it relies on
 * node:crypto; instead we reuse the same canonical JSON, multibase encoding, and
 * Ed25519 primitives via Web Crypto so the server can verify what the browser
 * signs.
 */

// --- RFC 8785 canonicalization (mirror of the SDK, pure JS) ----------------

type JsonValue = null | boolean | number | string | JsonValue[] | { [k: string]: JsonValue };

export function canonicalize(value: JsonValue): string {
  if (value === null) return 'null';
  const t = typeof value;
  if (t === 'boolean') return value ? 'true' : 'false';
  if (t === 'number') return JSON.stringify(value);
  if (t === 'string') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(',')}]`;
  const obj = value as { [k: string]: JsonValue };
  const keys = Object.keys(obj).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalize(obj[k] as JsonValue)}`).join(',')}}`;
}

// --- base58btc (Bitcoin alphabet), matching the SDK ------------------------

const BASE58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const ED25519_MULTICODEC = [0xed, 0x01];

function base58btcEncode(bytes: Uint8Array): string {
  if (bytes.length === 0) return '';
  const digits = [0];
  for (const byte of bytes) {
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
  let out = '';
  for (let k = 0; bytes[k] === 0 && k < bytes.length - 1; k++) out += BASE58[0];
  for (let i = digits.length - 1; i >= 0; i--) out += BASE58[digits[i] as number];
  return out;
}

export function encodeMultibasePublic(rawPublic: Uint8Array): string {
  const tagged = new Uint8Array(ED25519_MULTICODEC.length + rawPublic.length);
  tagged.set(ED25519_MULTICODEC, 0);
  tagged.set(rawPublic, ED25519_MULTICODEC.length);
  return `z${base58btcEncode(tagged)}`;
}

// --- encoding helpers ------------------------------------------------------

function toBase64Url(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** SHA-256 hex of the canonical form of a JSON document (matches SDK.documentHash). */
export function documentHash(doc: unknown): Promise<string> {
  return sha256Hex(canonicalize(doc as JsonValue));
}

// --- Ed25519 keypair via Web Crypto ----------------------------------------

export interface BrowserKeyPair {
  readonly publicKeyMultibase: string;
  readonly privateKeyBase64Url: string;
  /** Signs the canonical form of a JSON payload, returning a base64url signature. */
  sign(payload: JsonValue): Promise<string>;
}

/** True if this browser supports Ed25519 in Web Crypto. */
export async function ed25519Supported(): Promise<boolean> {
  try {
    await crypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
    return true;
  } catch {
    return false;
  }
}

export async function generateBrowserKeyPair(): Promise<BrowserKeyPair> {
  const keyPair = (await crypto.subtle.generateKey({ name: 'Ed25519' }, true, [
    'sign',
    'verify',
  ])) as CryptoKeyPair;

  const rawPublic = new Uint8Array(await crypto.subtle.exportKey('raw', keyPair.publicKey));
  // pkcs8 export; the trailing 32 bytes are the raw seed (matches SDK format).
  const pkcs8 = new Uint8Array(await crypto.subtle.exportKey('pkcs8', keyPair.privateKey));
  const rawPrivate = pkcs8.slice(-32);

  return {
    publicKeyMultibase: encodeMultibasePublic(rawPublic),
    privateKeyBase64Url: toBase64Url(rawPrivate),
    async sign(payload: JsonValue): Promise<string> {
      const message = new TextEncoder().encode(canonicalize(payload));
      const sig = new Uint8Array(await crypto.subtle.sign('Ed25519', keyPair.privateKey, message));
      return toBase64Url(sig);
    },
  };
}
