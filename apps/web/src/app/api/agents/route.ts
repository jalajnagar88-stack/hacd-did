import { NextResponse } from 'next/server';
import { listSeededDids } from '@/lib/registry';

export const dynamic = 'force-dynamic';

/** GET /api/agents — lists the DIDs seeded into the demo chain. */
export function GET(): NextResponse {
  return NextResponse.json({ dids: listSeededDids() });
}
