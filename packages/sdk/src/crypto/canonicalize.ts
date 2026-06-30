/**
 * JSON Canonicalization Scheme (RFC 8785, JCS).
 *
 * Produces a deterministic UTF-8 serialization of a JSON value so that two
 * parties hashing the "same" document arrive at the same digest. Object keys are
 * sorted by their UTF-16 code units, and JSON.stringify is relied upon for
 * RFC 8785-conformant string and number formatting for the value ranges used by
 * DID Documents.
 */
export type JsonValue =
  null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

export function canonicalize(value: JsonValue): string {
  return serialize(value);
}

function serialize(value: JsonValue): string {
  if (value === null) return 'null';

  const type = typeof value;

  if (type === 'boolean') return value ? 'true' : 'false';

  if (type === 'number') {
    if (!Number.isFinite(value as number)) {
      throw new TypeError('Cannot canonicalize a non-finite number');
    }
    return JSON.stringify(value);
  }

  if (type === 'string') return JSON.stringify(value);

  if (Array.isArray(value)) {
    return `[${value.map((item) => serialize(item)).join(',')}]`;
  }

  if (type === 'object') {
    const obj = value as { [key: string]: JsonValue };
    const keys = Object.keys(obj).sort(compareCodeUnits);
    const members = keys.map((key) => `${JSON.stringify(key)}:${serialize(obj[key] as JsonValue)}`);
    return `{${members.join(',')}}`;
  }

  throw new TypeError(`Cannot canonicalize value of type ${type}`);
}

/** Compares two strings by UTF-16 code unit, as required by RFC 8785. */
function compareCodeUnits(a: string, b: string): number {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}
