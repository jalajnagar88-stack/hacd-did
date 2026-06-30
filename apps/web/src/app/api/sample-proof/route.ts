import { NextResponse } from 'next/server';
import { getSampleProof } from '@/lib/registry';

export const dynamic = 'force-dynamic';

/** GET /api/sample-proof — a cached, signed PolyMind reference proof. */
export function GET(): NextResponse {
  const proof = getSampleProof();
  if (!proof) {
    return NextResponse.json({ error: 'sample proof unavailable' }, { status: 500 });
  }
  return NextResponse.json({
    ...proof,
    hint: 'Paste at /verify',
  });
}
