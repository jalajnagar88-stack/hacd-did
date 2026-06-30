import { describe, expect, it } from 'vitest';
import { generateKeyPair, signMessage, verifyMessage } from '../src/index.js';

const DID = 'did:hacd:NHMYYM';
const SIGNED_AT = '2026-06-29T00:00:00.000Z';

describe('agent message signing', () => {
  it('verifies a correctly signed message', () => {
    const key = generateKeyPair();
    const content = 'Prior on BTC > 100k by year end: 0.62.';
    const sig = signMessage(content, SIGNED_AT, DID, key.privateKeyBase64Url);
    expect(verifyMessage(content, SIGNED_AT, DID, sig, key.publicKeyMultibase)).toBe(true);
  });

  it('rejects tampered content', () => {
    const key = generateKeyPair();
    const content = 'Original message.';
    const sig = signMessage(content, SIGNED_AT, DID, key.privateKeyBase64Url);
    expect(verifyMessage('Original message!', SIGNED_AT, DID, sig, key.publicKeyMultibase)).toBe(
      false,
    );
  });

  it('rejects a different signing key', () => {
    const signer = generateKeyPair();
    const other = generateKeyPair();
    const content = 'Hello.';
    const sig = signMessage(content, SIGNED_AT, DID, signer.privateKeyBase64Url);
    expect(verifyMessage(content, SIGNED_AT, DID, sig, other.publicKeyMultibase)).toBe(false);
  });

  it('rejects a mismatched timestamp or did', () => {
    const key = generateKeyPair();
    const sig = signMessage('x', SIGNED_AT, DID, key.privateKeyBase64Url);
    expect(verifyMessage('x', '2026-06-30T00:00:00.000Z', DID, sig, key.publicKeyMultibase)).toBe(
      false,
    );
    expect(verifyMessage('x', SIGNED_AT, 'did:hacd:WTYUIA', sig, key.publicKeyMultibase)).toBe(
      false,
    );
  });
});
