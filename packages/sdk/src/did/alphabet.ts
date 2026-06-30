/**
 * The HACD inscription alphabet.
 *
 * Every HACD inscription is exactly six characters drawn from this fixed set of
 * 16 uppercase letters. The alphabet is part of the consensus rules of Hacash
 * and is reproduced here so the SDK can validate inscriptions offline.
 */
export const HACD_ALPHABET = [
  'W',
  'T',
  'Y',
  'U',
  'I',
  'A',
  'H',
  'X',
  'V',
  'M',
  'E',
  'K',
  'B',
  'S',
  'Z',
  'N',
] as const;

export type HacdLetter = (typeof HACD_ALPHABET)[number];

/** Number of characters in a valid HACD inscription. */
export const HACD_INSCRIPTION_LENGTH = 6;

const ALPHABET_SET: ReadonlySet<string> = new Set(HACD_ALPHABET);

/** Returns true if `char` is a single letter belonging to the HACD alphabet. */
export function isHacdLetter(char: string): char is HacdLetter {
  return char.length === 1 && ALPHABET_SET.has(char);
}

/**
 * Returns true if `value` is a syntactically valid HACD inscription:
 * exactly six uppercase characters, each from {@link HACD_ALPHABET}.
 */
export function isValidInscription(value: string): boolean {
  if (value.length !== HACD_INSCRIPTION_LENGTH) return false;
  for (const char of value) {
    if (!ALPHABET_SET.has(char)) return false;
  }
  return true;
}

/** Alias for {@link isValidInscription}, named for the HACD inscription it validates. */
export const isValidHacd = isValidInscription;
