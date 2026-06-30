import { NextResponse } from 'next/server';
import { inscriptionToDid, signMessage } from '@pow-agents/sdk';
import { getProfileByDid, getRuntimeKey, runtimeVerificationMethodId } from '@/lib/registry';
import { getPillarStore, type MemoryAnchor, type MemoryData } from '@/lib/pillars';

export const dynamic = 'force-dynamic';

interface MemoryResponse {
  did: string;
  status?: 'deactivated';
  anchors: MemoryAnchor[];
}

/**
 * GET /api/memory/:did
 * Returns the memory anchors for a DID.
 */
export async function GET(
  request: Request,
  { params }: { params: { did: string } }
): Promise<NextResponse<MemoryResponse>> {
  const did = inscriptionToDid(params.did);
  const profile = getProfileByDid(did);

  if (!profile) {
    return NextResponse.json({ did, anchors: [] }, { status: 404 });
  }

  if (profile.deactivated) {
    return NextResponse.json({
      did,
      status: 'deactivated' as const,
      anchors: [],
    });
  }

  const store = getPillarStore();
  const data = store.memory[did] || { anchors: [] };

  return NextResponse.json({
    did,
    anchors: [...data.anchors],
  });
}

interface AnchorMemoryBody {
  did: string;
  contentHash: string;
  label: string;
}

/**
 * POST /api/anchor-memory
 * Creates a new memory anchor.
 */
export async function POST(request: Request): Promise<NextResponse> {
  let body: AnchorMemoryBody;
  try {
    body = (await request.json()) as AnchorMemoryBody;
  } catch {
    return NextResponse.json({ error: 'malformed JSON' }, { status: 400 });
  }

  const { did, contentHash, label } = body;

  if (!did || !contentHash || !label) {
    return NextResponse.json({ error: 'missing required fields' }, { status: 400 });
  }

  const key = getRuntimeKey(did);
  if (!key) {
    return NextResponse.json({ error: 'DID not found or no runtime key' }, { status: 404 });
  }

  const anchoredAt = new Date().toISOString();
  const verificationMethod = runtimeVerificationMethodId(did);
  const id = `anchor-${Date.now()}`;
  
  // Sign the anchor payload
  const payload = JSON.stringify({ id, contentHash, label, anchoredAt });
  const signature = signMessage(payload, anchoredAt, did, key.privateKeyBase64Url);

  const anchor: MemoryAnchor = {
    id,
    contentHash,
    label,
    anchoredAt,
    signature,
    verificationMethod,
  };

  const store = getPillarStore();
  const data = store.memory[did] || { anchors: [] };
  store.memory[did] = {
    anchors: [...data.anchors, anchor],
  };

  return NextResponse.json({ anchor });
}
