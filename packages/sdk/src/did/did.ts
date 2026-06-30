import { HACD_INSCRIPTION_LENGTH, isValidInscription } from './alphabet.js';

/** The method name for this DID method, per the did:hacd specification. */
export const DID_METHOD = 'hacd';

/** Prefix shared by every did:hacd identifier. */
export const DID_PREFIX = `did:${DID_METHOD}:`;

/** A parsed did:hacd identifier. */
export interface ParsedDid {
  /** The full identifier, e.g. `did:hacd:NHMYYM`. */
  readonly did: string;
  /** Always `hacd` for this method. */
  readonly method: typeof DID_METHOD;
  /** The method-specific identifier — the six-letter HACD inscription. */
  readonly inscription: string;
}

/** Error thrown when a string is not a valid did:hacd identifier. */
export class InvalidDidError extends Error {
  constructor(
    public readonly input: string,
    reason: string,
  ) {
    super(`Invalid did:hacd "${input}": ${reason}`);
    this.name = 'InvalidDidError';
  }
}

/** Constructs a did:hacd identifier from a HACD inscription. Throws on invalid input. */
export function inscriptionToDid(inscription: string): string {
  if (!isValidInscription(inscription)) {
    throw new InvalidDidError(
      inscription,
      `inscription must be exactly ${HACD_INSCRIPTION_LENGTH} characters from the HACD alphabet`,
    );
  }
  return `${DID_PREFIX}${inscription}`;
}

/** Returns true if `value` is a fully valid did:hacd identifier. */
export function isValidDid(value: string): boolean {
  try {
    parseDid(value);
    return true;
  } catch {
    return false;
  }
}

/**
 * Parses and validates a did:hacd identifier.
 *
 * @throws {InvalidDidError} if the scheme, method, or inscription is malformed.
 */
export function parseDid(did: string): ParsedDid {
  const parts = did.split(':');
  if (parts.length !== 3) {
    throw new InvalidDidError(did, 'expected the form did:hacd:<inscription>');
  }
  const [scheme, method, inscription] = parts as [string, string, string];
  if (scheme !== 'did') {
    throw new InvalidDidError(did, `scheme must be "did", got "${scheme}"`);
  }
  if (method !== DID_METHOD) {
    throw new InvalidDidError(did, `method must be "${DID_METHOD}", got "${method}"`);
  }
  if (!isValidInscription(inscription)) {
    throw new InvalidDidError(did, `inscription "${inscription}" is not a valid HACD inscription`);
  }
  return { did, method: DID_METHOD, inscription };
}
