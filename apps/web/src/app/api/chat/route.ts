import { NextResponse } from 'next/server';
import { parseDid, sha256Hex } from '@pow-agents/sdk';
import { getProfileByDid, resolveDid, signAgentMessage } from '@/lib/registry';
import { buildMintedResponse, getResponseBank } from '@backend/agentScripts';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

interface ChatBody {
  did?: string;
  messages?: Array<{ role: 'user' | 'assistant'; content: string }>;
}

/**
 * POST /api/chat
 *
 * Resolves the agent DID, selects a scripted response for the agent persona, and
 * signs it with the agent's runtime key. Returns the message + proof.
 *
 * Agent text is scripted for this incubator submission (no LLM key required);
 * the cryptographic identity layer is fully real. The integration point for a
 * real model is documented in /docs/integration.md.
 */
export async function POST(request: Request): Promise<NextResponse> {
  let body: ChatBody;
  try {
    body = (await request.json()) as ChatBody;
  } catch {
    return NextResponse.json({ error: 'invalid JSON body' }, { status: 400 });
  }

  const did = body.did?.trim();
  const messages = body.messages ?? [];
  if (!did) return NextResponse.json({ error: 'missing did' }, { status: 400 });

  const resolution = await resolveDid(did);
  const err = resolution.didResolutionMetadata.error;
  if (err === 'deactivated') {
    return NextResponse.json({ error: 'deactivated' }, { status: 410 });
  }
  if (err === 'invalidDid') {
    return NextResponse.json({ error: 'invalidDid' }, { status: 400 });
  }
  if (err || !resolution.didDocument) {
    return NextResponse.json({ error: err ?? 'notFound' }, { status: 404 });
  }

  const profile = getProfileByDid(did);
  if (!profile || profile.deactivated) {
    return NextResponse.json({ error: 'no active agent profile' }, { status: 404 });
  }

  const lastUser = [...messages].reverse().find((m) => m.role === 'user' && m.content.trim());
  if (!lastUser) {
    return NextResponse.json({ error: 'no user message' }, { status: 400 });
  }

  // Deterministic selection: hash the last user message and index into the
  // agent's response bank. The same question always yields the same response,
  // which makes recorded demos reproducible across re-takes.
  const { inscription } = parseDid(did);
  const bank = getResponseBank(inscription);
  let content: string;
  if (bank && bank.length > 0) {
    const digest = sha256Hex(lastUser.content.trim());
    const index = parseInt(digest.slice(0, 8), 16) % bank.length;
    content = bank[index] as string;
  } else {
    content = buildMintedResponse(
      { name: profile.name, capabilities: profile.capabilities },
      lastUser.content,
    );
  }

  const signedAt = new Date().toISOString();
  const proof = signAgentMessage(did, content, signedAt);
  if (!proof) {
    return NextResponse.json({ error: 'no runtime signing key for agent' }, { status: 500 });
  }

  return NextResponse.json(proof);
}
