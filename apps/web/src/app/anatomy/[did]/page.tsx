'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

interface PillarData {
  reputation: any | null;
  credentials: any | null;
  memory: any | null;
  permissions: any | null;
}

export default function AnatomyPage() {
  const params = useParams();
  const router = useRouter();
  const did = `did:hacd:${params.did}`;
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [pillars, setPillars] = useState<PillarData>({
    reputation: null,
    credentials: null,
    memory: null,
    permissions: null,
  });
  const [showRawDoc, setShowRawDoc] = useState(false);
  const [didDocument, setDidDocument] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch DID document
        const resolveRes = await fetch(`/api/resolve?did=${encodeURIComponent(did)}`);
        const resolveData = await resolveRes.json();
        
        if (resolveData.didDocument) {
          setDidDocument(resolveData.didDocument);
          
          // Extract inscription from DID (format: did:hacd:XXXXXX)
          const inscription = did.split(':')[2] || did;
          
          // Fetch pillar data
          const [reputation, credentials, memory, permissions] = await Promise.all([
            fetch(`/api/reputation/${did}`).then(r => r.json()).catch(() => null),
            fetch(`/api/credentials/${did}`).then(r => r.json()).catch(() => null),
            fetch(`/api/memory/${did}`).then(r => r.json()).catch(() => null),
            fetch(`/api/permissions/${did}`).then(r => r.json()).catch(() => null),
          ]);
          
          setPillars({ reputation, credentials, memory, permissions });
          
          // Set profile info from DID document
          const name = inscription === 'NHMYYM' ? 'PolyMind' :
                       inscription === 'WTYUIA' ? 'Watchtower' :
                       inscription === 'ZKBSEM' ? 'Retired Agent' :
                       inscription.toUpperCase();
          const model = inscription === 'ZKBSEM' ? 'N/A' : 'claude-sonnet-4-6';
          
          setProfile({ name, model, inscription });
        }
      } catch (error) {
        console.error('Failed to fetch anatomy data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [did]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground">Loading agent anatomy...</div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground">Agent not found</div>
      </div>
    );
  }

  const isDeactivated = pillars.reputation?.status === 'deactivated' ||
                       pillars.credentials?.status === 'deactivated';

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="mx-auto max-w-7xl px-4 py-6">
          <h1 className="text-center font-mono text-sm uppercase tracking-[0.2em] text-muted-foreground">
            Beyond identity: a sovereign agent in five layers
          </h1>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-12">
        {/* Agent Header */}
        <div className="mb-12 text-center">
          <div className="mb-4 text-7xl font-bold text-accent tracking-tight">
            {profile.inscription}
          </div>
          <div className="mb-2 font-mono text-xl text-muted-foreground">{did}</div>
          <div className="mb-1 text-2xl font-semibold text-foreground">{profile.name}</div>
          <div className="text-sm text-muted-foreground">Model: {profile.model}</div>
          {isDeactivated && (
            <div className="mt-4 inline-flex rounded-full bg-red-500/20 px-4 py-1 text-sm text-red-300">
              Deactivated
            </div>
          )}
        </div>

        {/* Five Layers */}
        <div className="space-y-6">
          {/* Layer 1: Identity */}
          <div className="rounded-lg border border-border bg-card p-6">
            <div className="mb-4 flex items-center gap-2">
              <span className="rounded bg-accent/20 px-2 py-0.5 text-xs font-medium text-accent">
                Layer 1
              </span>
              <h2 className="font-semibold text-foreground">Identity</h2>
            </div>
            {didDocument ? (
              <div className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-muted-foreground">Controller:</span>
                    <span className="ml-2 font-mono text-foreground">{didDocument.controller}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Verification Methods:</span>
                    <span className="ml-2 font-mono text-foreground">{didDocument.verificationMethod?.length || 0}</span>
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">Public Key:</span>
                  <code className="ml-2 block font-mono text-xs text-muted-foreground">
                    {didDocument.verificationMethod?.[0]?.publicKeyMultibase?.slice(0, 32)}...
                  </code>
                </div>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">No identity data available</div>
            )}
          </div>

          {/* Layer 2: Reputation */}
          <div className="rounded-lg border border-border bg-card p-6">
            <div className="mb-4 flex items-center gap-2">
              <span className="rounded bg-accent/20 px-2 py-0.5 text-xs font-medium text-accent">
                Layer 2
              </span>
              <h2 className="font-semibold text-foreground">Reputation</h2>
            </div>
            {pillars.reputation && !pillars.reputation.status ? (
              <div className="space-y-4">
                <div className="flex items-baseline gap-6">
                  <div className="text-5xl font-bold text-accent">
                    {pillars.reputation.aggregate.rawScore.toFixed(1)}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <div>decayed: {pillars.reputation.aggregate.decayedScore.toFixed(1)}</div>
                    <div>endorsers: {pillars.reputation.aggregate.endorserCount}</div>
                  </div>
                </div>
                <div className="h-3 w-full overflow-hidden rounded-full bg-border">
                  <div
                    className="h-full bg-accent transition-all"
                    style={{ width: `${Math.min(pillars.reputation.aggregate.rawScore, 100)}%` }}
                  />
                </div>
                {pillars.reputation.endorsements.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-xs font-medium text-muted-foreground">Top endorsements</div>
                    {pillars.reputation.endorsements.slice(0, 3).map((e: any, i: number) => (
                      <div key={i} className="flex items-center justify-between rounded bg-background p-2 text-sm">
                        <span className="font-mono text-muted-foreground">{e.from}</span>
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-16 rounded bg-accent" style={{ width: `${e.weight * 100}%` }} />
                          <span className="text-xs text-muted-foreground">{e.weight}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">
                {isDeactivated ? 'Agent deactivated — no reputation data' : 'No reputation data'}
              </div>
            )}
          </div>

          {/* Layer 3: Credentials */}
          <div className="rounded-lg border border-border bg-card p-6">
            <div className="mb-4 flex items-center gap-2">
              <span className="rounded bg-accent/20 px-2 py-0.5 text-xs font-medium text-accent">
                Layer 3
              </span>
              <h2 className="font-semibold text-foreground">Credentials</h2>
            </div>
            {pillars.credentials && !pillars.credentials.status ? (
              <div className="space-y-4">
                <div className="flex gap-6">
                  <div>
                    <span className="text-2xl font-bold text-foreground">
                      {pillars.credentials.issued.length}
                    </span>
                    <span className="ml-1 text-sm text-muted-foreground">issued</span>
                  </div>
                  <div>
                    <span className="text-2xl font-bold text-foreground">
                      {pillars.credentials.held.length}
                    </span>
                    <span className="ml-1 text-sm text-muted-foreground">held</span>
                  </div>
                </div>
                {pillars.credentials.issued.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-xs font-medium text-muted-foreground">Top issued credentials</div>
                    {pillars.credentials.issued.slice(0, 3).map((vc: any, i: number) => (
                      <div key={i} className="flex items-center justify-between rounded bg-background p-2 text-sm">
                        <span className="text-foreground">{vc.credentialSubject.claim}</span>
                        {vc.credentialSubject.capability && (
                          <span className="rounded bg-accent/20 px-2 py-0.5 text-xs text-accent">
                            {vc.credentialSubject.capability}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">
                {isDeactivated ? 'Agent deactivated — no credentials' : 'No credentials'}
              </div>
            )}
          </div>

          {/* Layer 4: Memory */}
          <div className="rounded-lg border border-border bg-card p-6">
            <div className="mb-4 flex items-center gap-2">
              <span className="rounded bg-accent/20 px-2 py-0.5 text-xs font-medium text-accent">
                Layer 4
              </span>
              <h2 className="font-semibold text-foreground">Memory ownership</h2>
            </div>
            {pillars.memory && !pillars.memory.status ? (
              <div className="space-y-4">
                <div>
                  <span className="text-2xl font-bold text-foreground">
                    {pillars.memory.anchors.length}
                  </span>
                  <span className="ml-1 text-sm text-muted-foreground">memory anchors</span>
                </div>
                {pillars.memory.anchors.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-xs font-medium text-muted-foreground">Latest anchors</div>
                    {pillars.memory.anchors.slice(0, 3).map((a: any, i: number) => (
                      <div key={i} className="rounded bg-background p-2 text-sm">
                        <div className="text-foreground">{a.label}</div>
                        <code className="mt-1 font-mono text-xs text-muted-foreground">
                          {a.contentHash.slice(0, 20)}...
                        </code>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">
                {isDeactivated ? 'Agent deactivated — no memory anchors' : 'No memory anchors'}
              </div>
            )}
          </div>

          {/* Layer 5: Permissions */}
          <div className="rounded-lg border border-border bg-card p-6">
            <div className="mb-4 flex items-center gap-2">
              <span className="rounded bg-accent/20 px-2 py-0.5 text-xs font-medium text-accent">
                Layer 5
              </span>
              <h2 className="font-semibold text-foreground">Permissions</h2>
            </div>
            {pillars.permissions && !pillars.permissions.status ? (
              <div className="space-y-4">
                <div className="flex gap-6">
                  <div>
                    <span className="text-2xl font-bold text-foreground">
                      {pillars.permissions.granted.filter((p: any) => !p.revoked && new Date(p.expiresAt) > new Date()).length}
                    </span>
                    <span className="ml-1 text-sm text-muted-foreground">active granted</span>
                  </div>
                  <div>
                    <span className="text-2xl font-bold text-foreground">
                      {pillars.permissions.received.filter((p: any) => !p.revoked && new Date(p.expiresAt) > new Date()).length}
                    </span>
                    <span className="ml-1 text-sm text-muted-foreground">active received</span>
                  </div>
                </div>
                {pillars.permissions.granted.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-xs font-medium text-muted-foreground">Key permissions</div>
                    {pillars.permissions.granted.slice(0, 2).map((p: any, i: number) => (
                      <div key={i} className="rounded bg-background p-2 text-sm">
                        <code className="font-mono text-foreground">{p.scope}</code>
                        <div className="mt-1 text-xs text-muted-foreground">
                          to: {p.grantee}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">
                {isDeactivated ? 'Agent deactivated — no permissions' : 'No permissions'}
              </div>
            )}
          </div>
        </div>

        {/* View Raw Document Button */}
        <div className="mt-8 text-center">
          <button
            onClick={() => setShowRawDoc(!showRawDoc)}
            className="rounded-md border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:border-accent"
          >
            {showRawDoc ? 'Hide' : 'View'} raw DID Document
          </button>
        </div>

        {/* Raw Document Modal */}
        {showRawDoc && didDocument && (
          <div className="mt-4 rounded-lg border border-border bg-card p-4">
            <pre className="overflow-x-auto font-mono text-xs text-muted-foreground">
              {JSON.stringify(didDocument, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
