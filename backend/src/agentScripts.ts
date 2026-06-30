/**
 * Scripted response banks for the built-in Quantwealth agents.
 *
 * Agent responses are scripted for this incubator submission — the LLM call is
 * intentionally absent so the demo runs with no API key. The cryptographic
 * identity layer is fully real: every response below is signed server-side by
 * the agent's runtime key and verifies in /verify. See /docs/integration.md for
 * where to swap this engine for a real model.
 */

/** Per-agent response banks, keyed by HACD inscription. */
const RESPONSE_BANKS: Record<string, readonly string[]> = {
  // PolyMind — did:hacd:NHMYYM — probability-laden forecasts, JSON block last.
  NHMYYM: [
    'Prior: 0.34 on BTC closing above 100k by year end. Base rate from realized-vol-adjusted year-end closes since 2017 is ~0.28; conditioning on current 90-day momentum and net ETF inflows pushes the prior to ~0.34. Tail risks: a US regulatory shock (-0.08), a credit event in crypto-adjacent treasuries (-0.05). I do not give advice — I give priors.\n{"forecast": "BTC > 100k by Dec 31", "prior": 0.34, "confidence": "medium"}',
    'Prior: 0.62 that ETH outperforms BTC over the next 90 days, conditional on no L1 incident. Driver: ETF rotation flows and post-Pectra staking yield compression have historically front-run BTC dominance reversals by ~5 weeks. Counter-evidence: BTC dominance trend strength is still positive on a 200-day basis.\n{"forecast": "ETH/BTC up over 90d", "prior": 0.62, "confidence": "medium"}',
    'Prior: 0.18 that the Fed cuts more than 75bps cumulatively over the next two meetings. The market-implied path overshoots historical realized cut speeds outside of clear recession signals. Confidence is low — labor data revisions could shift this materially in either direction within a week.\n{"forecast": "Fed > 75bps cumulative", "prior": 0.18, "confidence": "low"}',
    'Prior: 0.41 that at least one stablecoin in the top 5 by market cap depegs by more than 2% intraday in the next 6 months. Base rate is ~0.55 over any 6-month window historically; current improved attestation cadence and treasury composition argue for a lower number, but concentration risk in short-duration treasuries adds a fat tail.\n{"forecast": "Top-5 stablecoin >2% intraday depeg in 6m", "prior": 0.41, "confidence": "medium"}',
  ],
  // Watchtower — did:hacd:WTYUIA — brief preamble then a JSON attestation block.
  WTYUIA: [
    'Publishing attestation on BTC spot ETF net flows for the trailing 5 sessions.\n{"attestation": "BTC spot ETF flows trailing-5d", "subject": "US BTC spot ETF complex", "belief": "Net positive, regime-consistent with accumulation", "basis": "Aggregated issuer end-of-day disclosures; cross-checked against tape", "timestamp": "2026-06-30T00:00:00Z"}',
    'Publishing attestation on ETH staking yield post-Pectra.\n{"attestation": "ETH staking yield, post-Pectra steady state", "subject": "Ethereum L1 validator yield", "belief": "Compressed to ~2.6% net, durable for the next 2 quarters absent activity shock", "basis": "On-chain issuance + MEV-Boost relay aggregates", "timestamp": "2026-06-30T00:00:00Z"}',
    'Publishing attestation on stablecoin reserve composition trend.\n{"attestation": "Top-5 stablecoin reserve composition Q2 2026", "subject": "USDC, USDT, USDe, PYUSD, FDUSD", "belief": "Average duration of reserves shortening; T-bill concentration rising", "basis": "Issuer monthly attestations + third-party auditor reports", "timestamp": "2026-06-30T00:00:00Z"}',
    'Publishing attestation on Hacash diamond mining difficulty trajectory.\n{"attestation": "HACD mining difficulty trend", "subject": "Hacash L1 HACD issuance", "belief": "Monotonically increasing; consistent with whitepaper schedule, no deviation observed", "basis": "Public node difficulty target sampling over trailing 14 days", "timestamp": "2026-06-30T00:00:00Z"}',
  ],
};

/** Returns the response bank for an inscription, or null if none is scripted. */
export function getResponseBank(inscription: string): readonly string[] | null {
  return RESPONSE_BANKS[inscription] ?? null;
}

/** Metadata used to template a response for a minted agent with no script bank. */
export interface MintedAgentContext {
  name: string;
  capabilities: readonly string[];
}

/** Builds a generic scripted response for a minted agent from its metadata. */
export function buildMintedResponse(ctx: MintedAgentContext, lastUserMessage: string): string {
  const caps = ctx.capabilities.length > 0 ? ctx.capabilities.join(', ') : 'general tasks';
  const echo = lastUserMessage.trim().slice(-80);
  return (
    `Agent ${ctx.name} received your message. Capabilities: ${caps}. ` +
    `This is a scripted demo response — production would route through the agent's ` +
    `declared model endpoint. Echoed prompt: ${echo}`
  );
}
