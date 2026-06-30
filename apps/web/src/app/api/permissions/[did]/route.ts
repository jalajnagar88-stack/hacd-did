import { NextResponse } from 'next/server';
import { inscriptionToDid, signMessage } from '@pow-agents/sdk';
import { getProfileByDid, getRuntimeKey, runtimeVerificationMethodId } from '@/lib/registry';
import { getPillarStore, type Permission, type PermissionData } from '@/lib/pillars';

export const dynamic = 'force-dynamic';

interface PermissionResponse {
  did: string;
  status?: 'deactivated';
  granted: Permission[];
  received: Permission[];
}

/**
 * GET /api/permissions/:did
 * Returns the permission grants for a DID.
 */
export async function GET(
  request: Request,
  { params }: { params: { did: string } }
): Promise<NextResponse<PermissionResponse>> {
  const did = inscriptionToDid(params.did);
  const profile = getProfileByDid(did);

  if (!profile) {
    return NextResponse.json({ did, granted: [], received: [] }, { status: 404 });
  }

  if (profile.deactivated) {
    return NextResponse.json({
      did,
      status: 'deactivated' as const,
      granted: [],
      received: [],
    });
  }

  const store = getPillarStore();
  const data = store.permissions[did] || { granted: [], received: [] };

  return NextResponse.json({
    did,
    granted: [...data.granted],
    received: [...data.received],
  });
}

interface GrantPermissionBody {
  grantorDid: string;
  granteeDid: string;
  scope: string;
  conditions?: Record<string, unknown>;
  expiresAt?: string;
}

/**
 * POST /api/grant-permission
 * Grants a new permission from grantor to grantee.
 */
export async function POST(request: Request): Promise<NextResponse> {
  let body: GrantPermissionBody;
  try {
    body = (await request.json()) as GrantPermissionBody;
  } catch {
    return NextResponse.json({ error: 'malformed JSON' }, { status: 400 });
  }

  const { grantorDid, granteeDid, scope, conditions, expiresAt } = body;

  if (!grantorDid || !granteeDid || !scope) {
    return NextResponse.json({ error: 'missing required fields' }, { status: 400 });
  }

  const grantorKey = getRuntimeKey(grantorDid);
  if (!grantorKey) {
    return NextResponse.json({ error: 'grantor DID not found or no runtime key' }, { status: 404 });
  }

  const issuedAt = new Date().toISOString();
  const verificationMethod = runtimeVerificationMethodId(grantorDid);
  const id = `perm-${Date.now()}`;
  
  // Default expires to 90 days if not specified
  const defaultExpires = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();
  
  // Sign the permission payload
  const payload = JSON.stringify({ id, grantor: grantorDid, grantee: granteeDid, scope, issuedAt });
  const signature = signMessage(payload, issuedAt, grantorDid, grantorKey.privateKeyBase64Url);

  const permission: Permission = {
    id,
    grantor: grantorDid,
    grantee: granteeDid,
    scope,
    conditions,
    issuedAt,
    expiresAt: expiresAt || defaultExpires,
    revoked: false,
    signature,
    verificationMethod,
  };

  const store = getPillarStore();
  
  // Add to grantor's granted list
  const grantorData = store.permissions[grantorDid] || { granted: [], received: [] };
  store.permissions[grantorDid] = {
    ...grantorData,
    granted: [...grantorData.granted, permission],
  };

  // Add to grantee's received list
  const granteeData = store.permissions[granteeDid] || { granted: [], received: [] };
  store.permissions[granteeDid] = {
    ...granteeData,
    received: [...granteeData.received, permission],
  };

  return NextResponse.json({ permission });
}

interface RevokePermissionBody {
  permissionId: string;
  grantorDid: string;
}

/**
 * POST /api/revoke-permission
 * Revokes a permission.
 */
export async function PUT(request: Request): Promise<NextResponse> {
  let body: RevokePermissionBody;
  try {
    body = (await request.json()) as RevokePermissionBody;
  } catch {
    return NextResponse.json({ error: 'malformed JSON' }, { status: 400 });
  }

  const { permissionId, grantorDid } = body;

  if (!permissionId || !grantorDid) {
    return NextResponse.json({ error: 'missing required fields' }, { status: 400 });
  }

  const grantorKey = getRuntimeKey(grantorDid);
  if (!grantorKey) {
    return NextResponse.json({ error: 'grantor DID not found or no runtime key' }, { status: 404 });
  }

  const store = getPillarStore();
  const grantorData = store.permissions[grantorDid];
  
  if (!grantorData) {
    return NextResponse.json({ error: 'grantor has no permissions' }, { status: 404 });
  }

  const permission = grantorData.granted.find((p) => p.id === permissionId);
  if (!permission) {
    return NextResponse.json({ error: 'permission not found' }, { status: 404 });
  }

  if (permission.grantor !== grantorDid) {
    return NextResponse.json({ error: 'permission does not belong to grantor' }, { status: 403 });
  }

  // Re-sign with revoked=true
  const revokedAt = new Date().toISOString();
  const verificationMethod = runtimeVerificationMethodId(grantorDid);
  const payload = JSON.stringify({ 
    ...permission, 
    revoked: true, 
    revokedAt 
  });
  const signature = signMessage(payload, revokedAt, grantorDid, grantorKey.privateKeyBase64Url);

  const revokedPermission: Permission = {
    ...permission,
    revoked: true,
    signature,
  };

  // Update in grantor's granted list
  store.permissions[grantorDid] = {
    ...grantorData,
    granted: grantorData.granted.map((p) => 
      p.id === permissionId ? revokedPermission : p
    ),
  };

  // Update in grantee's received list
  const granteeData = store.permissions[permission.grantee];
  if (granteeData) {
    store.permissions[permission.grantee] = {
      ...granteeData,
      received: granteeData.received.map((p) => 
        p.id === permissionId ? revokedPermission : p
      ),
    };
  }

  return NextResponse.json({ permission: revokedPermission });
}
