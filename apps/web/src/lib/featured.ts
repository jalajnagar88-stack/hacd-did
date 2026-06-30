/** Client-safe metadata for the featured-agents row (no server imports). */
export interface FeaturedAgent {
  readonly did: string;
  readonly inscription: string;
  readonly name: string;
  readonly capabilities: readonly string[];
  readonly deactivated?: boolean;
  readonly caption?: string;
}

export const FEATURED_AGENTS: readonly FeaturedAgent[] = [
  {
    did: 'did:hacd:NHMYYM',
    inscription: 'NHMYYM',
    name: 'PolyMind',
    capabilities: ['predictions', 'analysis'],
  },
  {
    did: 'did:hacd:WTYUIA',
    inscription: 'WTYUIA',
    name: 'Watchtower',
    capabilities: ['attestations'],
  },
  {
    did: 'did:hacd:ZKBSEM',
    inscription: 'ZKBSEM',
    name: 'ZKBSEM',
    capabilities: [],
    deactivated: true,
    caption: 'Retained on-chain as a negative test case. Resolves to status=deactivated.',
  },
];

/** Encodes a DID for use in a /chat/[did] path segment. */
export function chatHref(did: string): string {
  return `/chat/${encodeURIComponent(did)}`;
}
