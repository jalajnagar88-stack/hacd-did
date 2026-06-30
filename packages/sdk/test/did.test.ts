import { describe, expect, it } from 'vitest';
import {
  InvalidDidError,
  inscriptionToDid,
  isValidDid,
  isValidInscription,
  parseDid,
} from '../src/index.js';

describe('inscription validation', () => {
  it('accepts a valid six-letter inscription', () => {
    expect(isValidInscription('NHMYYM')).toBe(true);
    expect(isValidInscription('WTYUIA')).toBe(true);
  });

  it('rejects wrong length', () => {
    expect(isValidInscription('NHMYY')).toBe(false);
    expect(isValidInscription('NHMYYMM')).toBe(false);
  });

  it('rejects letters outside the HACD alphabet', () => {
    // C, D, F, G, J, L, O, P, Q, R are not in the alphabet.
    expect(isValidInscription('ABCDEF')).toBe(false);
    expect(isValidInscription('nhmyym')).toBe(false);
  });
});

describe('parseDid', () => {
  it('parses a valid did:hacd', () => {
    const parsed = parseDid('did:hacd:NHMYYM');
    expect(parsed.method).toBe('hacd');
    expect(parsed.inscription).toBe('NHMYYM');
  });

  it('throws on a bad scheme or method', () => {
    expect(() => parseDid('urn:hacd:NHMYYM')).toThrow(InvalidDidError);
    expect(() => parseDid('did:key:NHMYYM')).toThrow(InvalidDidError);
  });

  it('throws on an invalid inscription', () => {
    expect(() => parseDid('did:hacd:ABCDEF')).toThrow(InvalidDidError);
  });
});

describe('inscriptionToDid / isValidDid', () => {
  it('round-trips', () => {
    expect(inscriptionToDid('NHMYYM')).toBe('did:hacd:NHMYYM');
  });

  it('validates', () => {
    expect(isValidDid('did:hacd:NHMYYM')).toBe(true);
    expect(isValidDid('did:hacd:abcdef')).toBe(false);
  });
});
