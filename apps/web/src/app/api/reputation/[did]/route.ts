import { NextResponse } from 'next/server';
import { inscriptionToDid, signMessage } from '@pow-agents/sdk';
import { getProfileByDid, getRuntimeKey, runtimeVerificationMethodId } from '@/lib/registry';
import { getPillarStore, computeAggregate, type Endorsement } from '@/lib/pillars';

export const dynamic = 'force-dynamic';

interface ReputationResponse {
  did: string;
  status?: 'deactivated';
  endorsements: Endorsement[];
  aggregate: {
    rawScore: number;
    decayedScore: number;
    endorserCount: number;
    lastUpdated: string;
  };
}

/**
 * GET /api/reputation/:did
 * Returns the reputation feed for a DID with aggregate scores.
 */
export async function GET(
  request: Request,
  { params }: { params: { did: string } }
): Promise<NextResponse<ReputationResponse>> {
  const did = inscriptionToDid(params.did);
  const profile = getProfileByDid(did);

  if (!profile) {
    return NextResponse.json(
      { did, endorsements: [], aggregate: { rawScore: 0, decayedScore: 0, endorserCount: 0, lastUpdated: '' } },
      { status: 404 }
    );
  }

  if (profile.deactivated) {
    return NextResponse.json({
      did,
      status: 'deactivated' as const,
      endorsements: [],
      aggregate: { rawScore: 0, decayedScore: 0, endorserCount: 0, lastUpdated: '' },
    });
  }

  const store = getPillarStore();
  const data = store.reputation[did] || { endorsements: [] };
  const aggregate = computeAggregate(data.endorsements);

  return NextResponse.json({
    did,
    endorsements: [...data.endorsements],
    aggregate,
  });
}

interface EndorseBody {
  fromDid: string;
  toDid: string;
  weight: number;
  basis: string;
}

/**
 * POST /api/endorse
 * Creates a new endorsement. Self-endorsements are filtered out.
 */
export async function POST(request: Request): Promise<NextResponse> {
  let body: EndorseBody;
  try {
    body = (await request.json()) as EndorseBody;
  } catch {
    return NextResponse.json({ error: 'malformed JSON' }, { status: 400 });
  }

  const { fromDid, toDid, weight, basis } = body;

  if (!fromDid || !toDid || typeof weight !== 'number' || !basis) {
    return NextResponse.json({ error: 'missing required fields' }, { status: 400 });
  }

  // Filter self-endorsements
  if (fromDid === toDid) {
    return NextResponse.json({ error: 'self-endorsements are not allowed' }, { status: 400 });
  }

  const fromKey = getRuntimeKey(fromDid);
  if (!fromKey) {
    return NextResponse.json({ error: 'from DID not found or no runtime key' }, { status: 404 });
  }

  const issuedAt = new Date().toISOString();
  const verificationMethod = runtimeVerificationMethodId(fromDid);
  
  // Sign the endorsement payload
  const payload = JSON.stringify({ from: fromDid, to: toDid, weight, basis, issuedAt });
  const signature = signMessage(payload, issuedAt, fromDid, fromKey.privateKeyBase64Url);

  const endorsement: Endorsement = {
    from: fromDid,
    weight,
    basis,
    issuedAt,
    signature,
    verificationMethod,
  };

  const store = getPillarStore();
  const toData = store.reputation[toDid] || { endorsements: [] };
  store.reputation[toDid] = {
    endorsements: [...toData.endorsements, endorsement],
  };

  return NextResponse.json({ endorsement });
}
