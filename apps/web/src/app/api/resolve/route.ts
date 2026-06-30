import { NextResponse } from 'next/server';
import { resolveDid } from '@/lib/registry';

export const dynamic = 'force-dynamic';

/**
 * GET /api/resolve?did=did:hacd:NHMYYM
 *
 * Returns a W3C DID Resolution result. HTTP status mirrors resolution outcome:
 * 200 on success, 404 when not found/deactivated, 400 for invalid input,
 * 409 for integrity/signature failures.
 */
export async function GET(request: Request): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const did = searchParams.get('did')?.trim();

  if (!did) {
    return NextResponse.json(
      {
        didResolutionMetadata: { error: 'invalidDid', message: 'missing "did" query parameter' },
        didDocument: null,
        didDocumentMetadata: {},
      },
      { status: 400 },
    );
  }

  const result = await resolveDid(did);
  const error = result.didResolutionMetadata.error;

  const status =
    error === undefined
      ? 200
      : error === 'invalidDid'
        ? 400
        : error === 'notFound' || error === 'deactivated'
          ? 404
          : error === 'integrityViolation' || error === 'invalidSignature'
            ? 409
            : 500;

  return NextResponse.json(result, { status });
}
