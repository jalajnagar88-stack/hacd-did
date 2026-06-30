import { NextResponse } from 'next/server';
import { inscriptionToDid, signMessage } from '@pow-agents/sdk';
import { getProfileByDid, getRuntimeKey, runtimeVerificationMethodId } from '@/lib/registry';
import { getPillarStore, type VerifiableCredential, type CredentialData } from '@/lib/pillars';

export const dynamic = 'force-dynamic';

interface CredentialResponse {
  did: string;
  status?: 'deactivated';
  issued: VerifiableCredential[];
  held: VerifiableCredential[];
}

/**
 * GET /api/credentials/:did
 * Returns the credential registry for a DID.
 */
export async function GET(
  request: Request,
  { params }: { params: { did: string } }
): Promise<NextResponse<CredentialResponse>> {
  const did = inscriptionToDid(params.did);
  const profile = getProfileByDid(did);

  if (!profile) {
    return NextResponse.json({ did, issued: [], held: [] }, { status: 404 });
  }

  if (profile.deactivated) {
    return NextResponse.json({
      did,
      status: 'deactivated' as const,
      issued: [],
      held: [],
    });
  }

  const store = getPillarStore();
  const data = store.credentials[did] || { issued: [], held: [] };

  return NextResponse.json({
    did,
    issued: [...data.issued],
    held: [...data.held],
  });
}

interface IssueCredentialBody {
  issuerDid: string;
  subjectDid: string;
  claim: string;
  capability?: string;
  expirationDate?: string;
}

/**
 * POST /api/issue-credential
 * Issues a new credential from issuer to subject.
 */
export async function POST(request: Request): Promise<NextResponse> {
  let body: IssueCredentialBody;
  try {
    body = (await request.json()) as IssueCredentialBody;
  } catch {
    return NextResponse.json({ error: 'malformed JSON' }, { status: 400 });
  }

  const { issuerDid, subjectDid, claim, capability, expirationDate } = body;

  if (!issuerDid || !subjectDid || !claim) {
    return NextResponse.json({ error: 'missing required fields' }, { status: 400 });
  }

  const issuerKey = getRuntimeKey(issuerDid);
  if (!issuerKey) {
    return NextResponse.json({ error: 'issuer DID not found or no runtime key' }, { status: 404 });
  }

  const issuanceDate = new Date().toISOString();
  const verificationMethod = runtimeVerificationMethodId(issuerDid);
  
  // Sign the credential payload
  const credentialSubject = {
    id: subjectDid,
    claim,
    ...(capability && { capability }),
  };
  
  const payload = JSON.stringify({
    issuer: issuerDid,
    credentialSubject,
    issuanceDate,
  });
  const signature = signMessage(payload, issuanceDate, issuerDid, issuerKey.privateKeyBase64Url);

  const credential: VerifiableCredential = {
    '@context': ['https://www.w3.org/2018/credentials/v1'],
    type: ['VerifiableCredential'],
    issuer: issuerDid,
    credentialSubject,
    issuanceDate,
    ...(expirationDate && { expirationDate }),
    proof: {
      type: 'Ed25519Signature2020',
      created: issuanceDate,
      verificationMethod,
      jws: signature,
    },
  };

  const store = getPillarStore();
  
  // Add to issuer's issued list
  const issuerData = store.credentials[issuerDid] || { issued: [], held: [] };
  store.credentials[issuerDid] = {
    ...issuerData,
    issued: [...issuerData.issued, credential],
  };

  // Add to subject's held list
  const subjectData = store.credentials[subjectDid] || { issued: [], held: [] };
  store.credentials[subjectDid] = {
    ...subjectData,
    held: [...subjectData.held, credential],
  };

  return NextResponse.json({ credential });
}
