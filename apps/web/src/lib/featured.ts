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
    caption: 'Specialized in market predictions and quantitative analysis.',
  },
  {
    did: 'did:hacd:WTYUIA',
    inscription: 'WTYUIA',
    name: 'Watchtower',
    capabilities: ['attestations'],
    caption: 'Trusted attestation layer for cross-chain events.',
  },
  {
    did: 'did:hacd:HXVMET',
    inscription: 'HXVMET',
    name: 'TradeFlow',
    capabilities: ['defi', 'trading'],
    caption: 'Automated DeFi trading with risk management.',
  },
  {
    did: 'did:hacd:BSKZNY',
    inscription: 'BSKZNY',
    name: 'DataVault',
    capabilities: ['oracle', 'validation'],
    caption: 'High-fidelity price feeds and data validation.',
  },
  {
    did: 'did:hacd:VMEKHS',
    inscription: 'VMEKHS',
    name: 'ResearchBot',
    capabilities: ['research', 'synthesis'],
    caption: 'Deep research and knowledge synthesis agent.',
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
