import { readJsonFile } from './storage';

/** Shared in-memory storage for the four pillar extensions. */

export interface Endorsement {
  readonly from: string;
  readonly weight: number;
  readonly basis: string;
  readonly issuedAt: string;
  readonly signature: string;
  readonly verificationMethod: string;
}

export interface ReputationData {
  readonly endorsements: readonly Endorsement[];
}

export interface CredentialProof {
  readonly type: string;
  readonly created: string;
  readonly verificationMethod: string;
  readonly jws: string;
}

export interface CredentialSubject {
  readonly id: string;
  readonly claim: string;
  readonly capability?: string;
}

export interface VerifiableCredential {
  readonly '@context': readonly string[];
  readonly type: readonly string[];
  readonly issuer: string;
  readonly credentialSubject: CredentialSubject;
  readonly issuanceDate: string;
  readonly expirationDate?: string;
  readonly proof: CredentialProof;
}

export interface CredentialData {
  readonly issued: readonly VerifiableCredential[];
  readonly held: readonly VerifiableCredential[];
}

export interface MemoryAnchor {
  readonly id: string;
  readonly contentHash: string;
  readonly label: string;
  readonly anchoredAt: string;
  readonly signature: string;
  readonly verificationMethod: string;
}

export interface MemoryData {
  readonly anchors: readonly MemoryAnchor[];
}

export interface Permission {
  readonly id: string;
  readonly grantor: string;
  readonly grantee: string;
  readonly scope: string;
  readonly conditions?: Record<string, unknown>;
  readonly issuedAt: string;
  readonly expiresAt: string;
  readonly revoked: boolean;
  readonly signature: string;
  readonly verificationMethod: string;
}

export interface PermissionData {
  readonly granted: readonly Permission[];
  readonly received: readonly Permission[];
}

interface PillarStore {
  reputation: Record<string, ReputationData>;
  credentials: Record<string, CredentialData>;
  memory: Record<string, MemoryData>;
  permissions: Record<string, PermissionData>;
}

const globalForPillars = globalThis as unknown as { __hacdPillars?: PillarStore };

function buildPillarStore(): PillarStore {
  return {
    reputation: readJsonFile<Record<string, ReputationData>>('backend/seed/reputation.json') ?? {},
    credentials: readJsonFile<Record<string, CredentialData>>('backend/seed/credentials.json') ?? {},
    memory: readJsonFile<Record<string, MemoryData>>('backend/seed/memory.json') ?? {},
    permissions: readJsonFile<Record<string, PermissionData>>('backend/seed/permissions.json') ?? {},
  };
}

export function getPillarStore(): PillarStore {
  if (!globalForPillars.__hacdPillars) {
    globalForPillars.__hacdPillars = buildPillarStore();
  }
  return globalForPillars.__hacdPillars;
}

/**
 * Compute aggregate reputation scores.
 * rawScore = sum of endorsement weights, capped at 100
 * decayedScore = sum(weight * exp(-ageInDays/30))
 * endorserCount = unique count of endorsing DIDs
 */
export function computeAggregate(endorsements: readonly Endorsement[]): {
  rawScore: number;
  decayedScore: number;
  endorserCount: number;
  lastUpdated: string;
} {
  const now = new Date();
  let rawScore = 0;
  let decayedScore = 0;
  const endorsers = new Set<string>();
  let lastUpdated = '';

  for (const e of endorsements) {
    rawScore += e.weight;
    endorsers.add(e.from);
    
    const issuedAt = new Date(e.issuedAt);
    if (issuedAt > new Date(lastUpdated)) {
      lastUpdated = e.issuedAt;
    }
    
    const ageInDays = (now.getTime() - issuedAt.getTime()) / (1000 * 60 * 60 * 24);
    const decay = Math.exp(-ageInDays / 30);
    decayedScore += e.weight * decay;
  }

  return {
    rawScore: Math.min(rawScore, 100),
    decayedScore,
    endorserCount: endorsers.size,
    lastUpdated: lastUpdated || now.toISOString(),
  };
}
