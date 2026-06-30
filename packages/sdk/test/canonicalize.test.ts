import { describe, expect, it } from 'vitest';
import { canonicalize, documentHash } from '../src/index.js';

describe('canonicalize (RFC 8785)', () => {
  it('sorts object keys by code unit', () => {
    expect(canonicalize({ b: 1, a: 2 })).toBe('{"a":2,"b":1}');
  });

  it('is independent of input key order', () => {
    const a = canonicalize({ x: 1, y: { d: 4, c: 3 } });
    const b = canonicalize({ y: { c: 3, d: 4 }, x: 1 });
    expect(a).toBe(b);
  });

  it('preserves array order', () => {
    expect(canonicalize([3, 1, 2])).toBe('[3,1,2]');
  });

  it('produces a stable hash regardless of key order', () => {
    expect(documentHash({ a: 1, b: 2 })).toBe(documentHash({ b: 2, a: 1 }));
  });
});
