'use client';

import { useCallback, useEffect, useState } from 'react';
import type { DidResolutionResult } from '@pow-agents/sdk';
import { cn } from '@/lib/utils';
import { Skeleton, CardSkeleton } from '@/components/skeleton';

interface ProofStep {
  readonly label: string;
  readonly ok: boolean;
  readonly detail?: string;
}

function deriveSteps(result: DidResolutionResult): ProofStep[] {
  const meta = result.didResolutionMetadata;
  const docMeta = result.didDocumentMetadata;
  const err = meta.error;
  const reached = (failAt: string[]) => (err ? !failAt.includes(err) : true);

  return [
    {
      label: 'DID syntax valid',
      ok: reached(['invalidDid']),
      detail: err === 'invalidDid' ? meta.message : undefined,
    },
    {
      label: 'On-chain AGNT commitment found',
      ok: reached(['invalidDid', 'notFound', 'deactivated']),
      detail: err === 'notFound' || err === 'deactivated' ? meta.message : undefined,
    },
    {
      label: 'Owner signature verified',
      ok: reached(['invalidDid', 'notFound', 'deactivated', 'invalidSignature']),
      detail: err === 'invalidSignature' ? meta.message : undefined,
    },
    {
      label: 'Document hash matches chain',
      ok: err === undefined,
      detail: err === 'integrityViolation' ? meta.message : docMeta.documentHash,
    },
  ];
}

const EXAMPLES = ['did:hacd:NHMYYM', 'did:hacd:WTYUIA', 'did:hacd:ZKBSEM', 'did:hacd:ABCDEF'];

interface PillarData {
  reputation: any | null;
  credentials: any | null;
  memory: any | null;
  permissions: any | null;
}

interface VerifyStatus {
  [key: string]: 'valid' | 'invalid' | 'pending' | null;
}

export function ResolverConsole() {
  const [did, setDid] = useState('did:hacd:NHMYYM');
  const [result, setResult] = useState<DidResolutionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [agents, setAgents] = useState<string[]>([]);
  const [pillars, setPillars] = useState<PillarData>({
    reputation: null,
    credentials: null,
    memory: null,
    permissions: null,
  });
  const [expandedPanels, setExpandedPanels] = useState<Set<string>>(new Set());
  const [verifyStatus, setVerifyStatus] = useState<VerifyStatus>({});

  const resolve = useCallback(async (value: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/resolve?did=${encodeURIComponent(value)}`);
      setResult((await res.json()) as DidResolutionResult);
      
      // Fetch pillar data on successful resolve
      if (res.ok) {
        await Promise.all([
          fetch(`/api/reputation/${value}`).then(r => r.json()).then(d => setPillars(prev => ({ ...prev, reputation: d }))).catch(() => {}),
          fetch(`/api/credentials/${value}`).then(r => r.json()).then(d => setPillars(prev => ({ ...prev, credentials: d }))).catch(() => {}),
          fetch(`/api/memory/${value}`).then(r => r.json()).then(d => setPillars(prev => ({ ...prev, memory: d }))).catch(() => {}),
          fetch(`/api/permissions/${value}`).then(r => r.json()).then(d => setPillars(prev => ({ ...prev, permissions: d }))).catch(() => {}),
        ]);
      }
    } catch {
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetch('/api/agents')
      .then((r) => r.json())
      .then((d: { dids: string[] }) => setAgents(d.dids))
      .catch(() => undefined);
    // Pre-fill from ?did= if present (e.g. the "Verified ✓" badge links here).
    const fromQuery =
      typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('did') : null;
    const initial = fromQuery?.trim() || 'did:hacd:NHMYYM';
    setDid(initial);
    void resolve(initial);
  }, [resolve]);

  const error = result?.didResolutionMetadata.error;
  const steps = result ? deriveSteps(result) : [];

  const togglePanel = (panel: string) => {
    setExpandedPanels(prev => {
      const next = new Set(prev);
      if (next.has(panel)) {
        next.delete(panel);
      } else {
        next.add(panel);
      }
      return next;
    });
  };

  const verifySignature = async (payload: any, signature: string, verificationMethod: string, id: string) => {
    setVerifyStatus(prev => ({ ...prev, [id]: 'pending' }));
    try {
      // Send the raw payload to the server for canonicalization and verification
      const res = await fetch('/api/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          did,
          payload: JSON.stringify(payload), // Server will canonicalize
          signature,
          verificationMethod,
        }),
      });
      const data = await res.json();
      setVerifyStatus(prev => ({ ...prev, [id]: data.valid ? 'valid' : 'invalid' }));
    } catch {
      setVerifyStatus(prev => ({ ...prev, [id]: 'invalid' }));
    }
  };

  const formatRelativeTime = (isoString: string) => {
    const now = new Date();
    const then = new Date(isoString);
    const days = Math.floor((now.getTime() - then.getTime()) / (1000 * 60 * 60 * 24));
    if (days === 0) return 'today';
    if (days === 1) return 'yesterday';
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
    return `${Math.floor(days / 30)} months ago`;
  };

  return (
    <div className="w-full max-w-3xl">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void resolve(did.trim());
        }}
        className="flex gap-2"
      >
        <input
          value={did}
          onChange={(e) => setDid(e.target.value)}
          spellCheck={false}
          className="flex-1 rounded-md border border-border bg-card px-4 py-3 font-mono text-sm text-foreground outline-none focus:border-accent"
          placeholder="did:hacd:NHMYYM"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-accent px-5 py-3 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {loading ? 'Resolving…' : 'Resolve'}
        </button>
      </form>

      <div className="mt-3 flex flex-wrap gap-2">
        {EXAMPLES.map((ex) => (
          <button
            key={ex}
            onClick={() => {
              setDid(ex);
              void resolve(ex);
            }}
            className="rounded border border-border px-2.5 py-1 font-mono text-xs text-muted-foreground transition-colors hover:border-accent hover:text-foreground"
          >
            {ex}
          </button>
        ))}
      </div>

      {loading && (
        <div className="mt-8 space-y-6">
          <Skeleton className="h-12 w-full rounded-md" />
          <div>
            <h2 className="mb-3 font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Proof chain
            </h2>
            <ol className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <li key={i} className="flex items-start gap-3 rounded-md border border-border bg-card px-4 py-3">
                  <Skeleton className="mt-0.5 h-5 w-5 shrink-0 rounded-full" />
                  <div className="min-w-0 flex-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="mt-2 h-3 w-full" />
                  </div>
                </li>
              ))}
            </ol>
          </div>
          <div>
            <h2 className="mb-3 font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Extended layers
            </h2>
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <CardSkeleton key={i} />
              ))}
            </div>
          </div>
        </div>
      )}

      {result && !loading && (
        <div className="mt-8 space-y-6">
          <div
            className={cn(
              'rounded-md border px-4 py-3 text-sm',
              error
                ? 'border-red-900/60 bg-red-950/30 text-red-300'
                : 'border-emerald-900/60 bg-emerald-950/30 text-emerald-300',
            )}
          >
            {error ? `Resolution failed — ${error}` : 'Resolved and verified'}
          </div>

          <div>
            <h2 className="mb-3 font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Proof chain
            </h2>
            <ol className="space-y-2">
              {steps.map((step) => (
                <li
                  key={step.label}
                  className="flex items-start gap-3 rounded-md border border-border bg-card px-4 py-3"
                >
                  <span
                    className={cn(
                      'mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                      step.ok ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300',
                    )}
                  >
                    {step.ok ? '✓' : '✕'}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm text-foreground">{step.label}</p>
                    {step.detail && (
                      <p className="mt-1 break-all font-mono text-xs text-muted-foreground">
                        {step.detail}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </div>

          {result.didDocument && (
            <>
              <div>
                <h2 className="mb-3 font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  DID Document
                </h2>
                <pre className="overflow-x-auto rounded-md border border-border bg-card p-4 font-mono text-xs leading-relaxed text-muted-foreground">
                  {JSON.stringify(result.didDocument, null, 2)}
                </pre>
              </div>

              {/* Reputation Panel */}
              <div className="rounded-md border border-border bg-card">
                <button
                  onClick={() => togglePanel('reputation')}
                  className="flex w-full items-center justify-between px-4 py-3 text-left"
                >
                  <span className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    Layer 2 · Reputation
                  </span>
                  <span className="text-muted-foreground">{expandedPanels.has('reputation') ? '▼' : '▶'}</span>
                </button>
                {expandedPanels.has('reputation') && pillars.reputation && (
                  <div className="border-t border-border px-4 py-3">
                    {pillars.reputation.status === 'deactivated' ? (
                      <p className="text-sm text-muted-foreground">Agent deactivated — no reputation data</p>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex items-baseline gap-4">
                          <div className="text-4xl font-bold text-accent">{pillars.reputation.aggregate.rawScore.toFixed(1)}</div>
                          <div className="text-sm text-muted-foreground">
                            <div>decayed: {pillars.reputation.aggregate.decayedScore.toFixed(1)}</div>
                            <div>endorsers: {pillars.reputation.aggregate.endorserCount}</div>
                          </div>
                        </div>
                        <div className="space-y-2">
                          {pillars.reputation.endorsements.map((e: any, i: number) => (
                            <div key={i} className="rounded border border-border bg-background p-3">
                              <div className="flex items-center justify-between">
                                <a
                                  href={`/resolve?did=${e.from}`}
                                  className="font-mono text-xs text-accent hover:underline"
                                >
                                  {e.from}
                                </a>
                                <div className="flex items-center gap-2">
                                  <div className="h-2 w-12 rounded bg-accent" style={{ width: `${e.weight * 100}%` }} />
                                  <span className="text-xs text-muted-foreground">{e.weight}</span>
                                </div>
                              </div>
                              <p className="mt-2 text-sm text-foreground">{e.basis}</p>
                              <div className="mt-2 flex items-center justify-between">
                                <span className="text-xs text-muted-foreground">{formatRelativeTime(e.issuedAt)}</span>
                                <button
                                  onClick={() => verifySignature(e, e.signature, e.verificationMethod, `endorsement-${i}`)}
                                  className="rounded border border-border px-2 py-1 text-xs hover:border-accent"
                                >
                                  {verifyStatus[`endorsement-${i}`] === 'valid' ? '✓ Valid' :
                                   verifyStatus[`endorsement-${i}`] === 'invalid' ? '✕ Invalid' :
                                   verifyStatus[`endorsement-${i}`] === 'pending' ? 'Verifying...' :
                                   'Verify'}
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Credentials Panel */}
              <div className="rounded-md border border-border bg-card">
                <button
                  onClick={() => togglePanel('credentials')}
                  className="flex w-full items-center justify-between px-4 py-3 text-left"
                >
                  <span className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    Layer 3 · Credentials
                  </span>
                  <span className="text-muted-foreground">{expandedPanels.has('credentials') ? '▼' : '▶'}</span>
                </button>
                {expandedPanels.has('credentials') && pillars.credentials && (
                  <div className="border-t border-border px-4 py-3">
                    {pillars.credentials.status === 'deactivated' ? (
                      <p className="text-sm text-muted-foreground">Agent deactivated — no credentials</p>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex gap-4 border-b border-border pb-2">
                          <button
                            className="text-sm font-medium text-foreground"
                            onClick={() => {}}
                          >
                            Issued ({pillars.credentials.issued.length})
                          </button>
                          <button
                            className="text-sm text-muted-foreground"
                            onClick={() => {}}
                          >
                            Held ({pillars.credentials.held.length})
                          </button>
                        </div>
                        <div className="space-y-2">
                          {pillars.credentials.issued.map((vc: any, i: number) => (
                            <div key={i} className="rounded border border-border bg-background p-3">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-foreground">{vc.credentialSubject.claim}</span>
                                {vc.credentialSubject.capability && (
                                  <span className="rounded bg-accent/20 px-2 py-0.5 text-xs text-accent">
                                    {vc.credentialSubject.capability}
                                  </span>
                                )}
                              </div>
                              <div className="mt-2 flex items-center justify-between">
                                <a
                                  href={`/resolve?did=${vc.issuer}`}
                                  className="font-mono text-xs text-accent hover:underline"
                                >
                                  Issuer: {vc.issuer}
                                </a>
                                <button
                                  onClick={() => verifySignature(vc, vc.proof.jws, vc.proof.verificationMethod, `credential-issued-${i}`)}
                                  className="rounded border border-border px-2 py-1 text-xs hover:border-accent"
                                >
                                  {verifyStatus[`credential-issued-${i}`] === 'valid' ? '✓ Valid' :
                                   verifyStatus[`credential-issued-${i}`] === 'invalid' ? '✕ Invalid' :
                                   verifyStatus[`credential-issued-${i}`] === 'pending' ? 'Verifying...' :
                                   'Verify'}
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Memory Panel */}
              <div className="rounded-md border border-border bg-card">
                <button
                  onClick={() => togglePanel('memory')}
                  className="flex w-full items-center justify-between px-4 py-3 text-left"
                >
                  <span className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    Layer 4 · Memory ownership
                  </span>
                  <span className="text-muted-foreground">{expandedPanels.has('memory') ? '▼' : '▶'}</span>
                </button>
                {expandedPanels.has('memory') && pillars.memory && (
                  <div className="border-t border-border px-4 py-3">
                    {pillars.memory.status === 'deactivated' ? (
                      <p className="text-sm text-muted-foreground">Agent deactivated — no memory anchors</p>
                    ) : (
                      <div className="space-y-3">
                        <div className="relative border-l-2 border-border pl-4 space-y-4">
                          {pillars.memory.anchors.map((a: any, i: number) => (
                            <div key={i} className="relative">
                              <div className="absolute -left-[21px] top-1 h-3 w-3 rounded-full border-2 border-accent bg-background" />
                              <div className="rounded border border-border bg-background p-3">
                                <p className="text-sm font-medium text-foreground">{a.label}</p>
                                <div className="mt-2 flex items-center justify-between">
                                  <code className="font-mono text-xs text-muted-foreground">
                                    {a.contentHash.slice(0, 16)}...
                                  </code>
                                  <span className="text-xs text-muted-foreground">{formatRelativeTime(a.anchoredAt)}</span>
                                </div>
                                <div className="mt-2 flex justify-end">
                                  <button
                                    onClick={() => verifySignature(a, a.signature, a.verificationMethod, `memory-${i}`)}
                                    className="rounded border border-border px-2 py-1 text-xs hover:border-accent"
                                  >
                                    {verifyStatus[`memory-${i}`] === 'valid' ? '✓ Valid' :
                                     verifyStatus[`memory-${i}`] === 'invalid' ? '✕ Invalid' :
                                     verifyStatus[`memory-${i}`] === 'pending' ? 'Verifying...' :
                                     'Verify'}
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Permissions Panel */}
              <div className="rounded-md border border-border bg-card">
                <button
                  onClick={() => togglePanel('permissions')}
                  className="flex w-full items-center justify-between px-4 py-3 text-left"
                >
                  <span className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    Layer 5 · Permissions
                  </span>
                  <span className="text-muted-foreground">{expandedPanels.has('permissions') ? '▼' : '▶'}</span>
                </button>
                {expandedPanels.has('permissions') && pillars.permissions && (
                  <div className="border-t border-border px-4 py-3">
                    {pillars.permissions.status === 'deactivated' ? (
                      <p className="text-sm text-muted-foreground">Agent deactivated — no permissions</p>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex gap-4 border-b border-border pb-2">
                          <button
                            className="text-sm font-medium text-foreground"
                            onClick={() => {}}
                          >
                            Granted ({pillars.permissions.granted.length})
                          </button>
                          <button
                            className="text-sm text-muted-foreground"
                            onClick={() => {}}
                          >
                            Received ({pillars.permissions.received.length})
                          </button>
                        </div>
                        <div className="space-y-2">
                          {pillars.permissions.granted.map((p: any, i: number) => (
                            <div key={i} className="rounded border border-border bg-background p-3">
                              <div className="flex items-center justify-between">
                                <code className="font-mono text-sm text-foreground">{p.scope}</code>
                                <span className={cn(
                                  'rounded px-2 py-0.5 text-xs',
                                  p.revoked ? 'bg-red-500/20 text-red-300' :
                                  new Date(p.expiresAt) < new Date() ? 'bg-yellow-500/20 text-yellow-300' :
                                  'bg-emerald-500/20 text-emerald-300'
                                )}>
                                  {p.revoked ? 'revoked' : new Date(p.expiresAt) < new Date() ? 'expired' : 'active'}
                                </span>
                              </div>
                              <div className="mt-2 flex items-center justify-between">
                                <a
                                  href={`/resolve?did=${p.grantee}`}
                                  className="font-mono text-xs text-accent hover:underline"
                                >
                                  Grantee: {p.grantee}
                                </a>
                                <button
                                  onClick={() => verifySignature(p, p.signature, p.verificationMethod, `permission-granted-${i}`)}
                                  className="rounded border border-border px-2 py-1 text-xs hover:border-accent"
                                >
                                  {verifyStatus[`permission-granted-${i}`] === 'valid' ? '✓ Valid' :
                                   verifyStatus[`permission-granted-${i}`] === 'invalid' ? '✕ Invalid' :
                                   verifyStatus[`permission-granted-${i}`] === 'pending' ? 'Verifying...' :
                                   'Verify'}
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {agents.length > 0 && (
        <p className="mt-10 font-mono text-xs text-muted-foreground">
          Seeded on-chain: {agents.join('  ·  ')}
        </p>
      )}
    </div>
  );
}
