import { NextResponse } from 'next/server';
import { verifyMessage, canonicalize, verifyPayload } from '@pow-agents/sdk';
import { getProfileByDid, resolveDid } from '@/lib/registry';

export const dynamic = 'force-dynamic';

interface VerifyBody {
  did?: string;
  content?: string;
  signature?: string;
  signedAt?: string;
  verificationMethod?: string;
  /** For generic signed payloads: the JCS-canonicalized payload as a string */
  payload?: string;
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
 * document, and checks the signature over the canonical payload.
 * 
 * Supports two modes:
 * 1. Agent message verification: { did, content, signature, signedAt, verificationMethod }
 * 2. Generic payload verification: { did, payload, signature, verificationMethod }
 *    where payload is the JCS-canonicalized string representation of the signed object.
 */
export async function POST(request: Request): Promise<NextResponse<VerifyResult>> {
  let body: VerifyBody;
  try {
    body = (await request.json()) as VerifyBody;
  } catch {
    return NextResponse.json({ valid: false, reason: 'malformed proof JSON' });
  }

  const { did, content, signature, signedAt, verificationMethod, payload } = body;
  if (!did || !signature || !verificationMethod) {
    return NextResponse.json({ valid: false, reason: 'missing required fields (did, signature, verificationMethod)' });
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

  let ok = false;
  
  // Mode 1: Agent message verification (legacy)
  if (content && signedAt) {
    ok = verifyMessage(content, signedAt, did, signature, method.publicKeyMultibase);
  } 
  // Mode 2: Generic payload verification (for pillars)
  else if (payload) {
    try {
      // If payload is a JSON string, parse and canonicalize it first
      let canonicalPayload = payload;
      try {
        const parsed = JSON.parse(payload);
        canonicalPayload = canonicalize(parsed);
      } catch {
        // Already canonicalized or not JSON, use as-is
      }
      ok = verifyPayload(canonicalPayload, signature, method.publicKeyMultibase);
    } catch {
      ok = false;
    }
  } else {
    return NextResponse.json({ 
      valid: false, 
      reason: 'must provide either (content + signedAt) for agent messages or (payload) for generic signed objects',
      did 
    });
  }

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
