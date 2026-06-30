import { NextResponse } from 'next/server';
import { verifyMessage } from '@pow-agents/sdk';
import { getProfileByDid, resolveDid } from '@/lib/registry';

export const dynamic = 'force-dynamic';

interface VerifyBody {
  did?: string;
  content?: string;
  signature?: string;
  signedAt?: string;
  verificationMethod?: string;
}

interface VerifyResult {
  valid: boolean;
  reason?: string;
  agentName?: string;
  model?: string;
  did?: string;
}

/**
 * POST /api/verify
 * Resolves the DID, locates the named verification method in the resolved
 * document, and checks the signature over the canonical agent-message payload.
 */
export async function POST(request: Request): Promise<NextResponse<VerifyResult>> {
  let body: VerifyBody;
  try {
    body = (await request.json()) as VerifyBody;
  } catch {
    return NextResponse.json({ valid: false, reason: 'malformed proof JSON' });
  }

  const { did, content, signature, signedAt, verificationMethod } = body;
  if (!did || typeof content !== 'string' || !signature || !signedAt) {
    return NextResponse.json({ valid: false, reason: 'malformed proof JSON' });
  }

  const resolution = await resolveDid(did);
  const err = resolution.didResolutionMetadata.error;
  if (err === 'deactivated') {
    return NextResponse.json({ valid: false, reason: 'DID is deactivated', did });
  }
  if (err === 'invalidDid') {
    return NextResponse.json({ valid: false, reason: 'malformed DID', did });
  }
  if (err === 'notFound' || !resolution.didDocument) {
    return NextResponse.json({ valid: false, reason: 'DID not found on chain', did });
  }
  if (err) {
    return NextResponse.json({ valid: false, reason: `resolution failed: ${err}`, did });
  }

  const doc = resolution.didDocument;
  const method =
    doc.verificationMethod.find((m) => m.id === verificationMethod) ?? doc.verificationMethod[0];
  if (!method) {
    return NextResponse.json({
      valid: false,
      reason: 'verification method not found in DID document',
      did,
    });
  }

  const ok = verifyMessage(content, signedAt, did, signature, method.publicKeyMultibase);
  if (!ok) {
    return NextResponse.json({
      valid: false,
      reason: `signature did not verify against ${did}'s public key`,
      did,
    });
  }

  const profile = getProfileByDid(did);
  return NextResponse.json({
    valid: true,
    did,
    ...(profile ? { agentName: profile.name, model: profile.model } : {}),
  });
}
