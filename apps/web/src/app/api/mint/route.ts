import { NextResponse } from 'next/server';
import {
  documentHash,
  isValidHacd,
  parseDid,
  verifyPayload,
  type DidDocument,
} from '@pow-agents/sdk';
import { registerMintedAgent, resolveDid } from '@/lib/registry';

export const dynamic = 'force-dynamic';

interface MintBody {
  inscription?: string;
  name?: string;
  model?: string;
  description?: string;
  capabilities?: string[];
  document?: DidDocument;
  documentUrl?: string;
  /** Signature by the client-held owner key over the canonical document. */
  proof?: string;
  ownerPublicKeyMultibase?: string;
}

/**
 * POST /api/mint
 * Validates a client-signed DID document, ensures the HACD is free, then
 * registers the agent with a fresh server-held runtime key.
 */
export async function POST(request: Request): Promise<NextResponse> {
  let body: MintBody;
  try {
    body = (await request.json()) as MintBody;
  } catch {
    return NextResponse.json({ error: 'invalid JSON body' }, { status: 400 });
  }

  const inscription = body.inscription?.toUpperCase().trim();
  if (!inscription || !isValidHacd(inscription)) {
    return NextResponse.json({ error: 'invalid HACD inscription' }, { status: 400 });
  }
  if (!body.name?.trim()) {
    return NextResponse.json({ error: 'missing agent name' }, { status: 400 });
  }
  if (!body.document || !body.proof || !body.ownerPublicKeyMultibase) {
    return NextResponse.json({ error: 'missing signed document' }, { status: 400 });
  }

  // The document id must match the inscription.
  let did: string;
  try {
    did = parseDid(body.document.id).did;
  } catch {
    return NextResponse.json({ error: 'document id is not a valid did:hacd' }, { status: 400 });
  }
  if (did !== `did:hacd:${inscription}`) {
    return NextResponse.json({ error: 'document id does not match inscription' }, { status: 400 });
  }

  // Reject if already on chain — inscription occupancy is independent of the
  // signature, so this guard runs first.
  const existing = await resolveDid(did);
  const err = existing.didResolutionMetadata.error;
  if (!err || err === 'deactivated') {
    return NextResponse.json({ error: 'already minted' }, { status: 409 });
  }

  // Verify the owner signed exactly this document.
  const signedOk = verifyPayload(
    { documentHash: documentHash(body.document as never) },
    body.proof,
    body.ownerPublicKeyMultibase,
  );
  if (!signedOk) {
    return NextResponse.json({ error: 'document signature did not verify' }, { status: 400 });
  }

  const result = registerMintedAgent({
    inscription,
    name: body.name.trim(),
    model: body.model?.trim() || 'claude-sonnet-4-6',
    description: body.description?.trim() ?? '',
    capabilities: body.capabilities ?? [],
    ownerPublicKeyMultibase: body.ownerPublicKeyMultibase,
    document: body.document,
    documentUrl: body.documentUrl?.trim() || `ipfs://bafy${inscription}Minted`,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({
    ok: true,
    did: result.did,
    resolveUrl: `/?did=${encodeURIComponent(result.did)}`,
    chatUrl: `/chat/${encodeURIComponent(result.did)}`,
  });
}
