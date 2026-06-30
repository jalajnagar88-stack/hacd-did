'use client';

import { useCallback, useEffect, useState } from 'react';
import type { DidResolutionResult } from '@pow-agents/sdk';
import { cn } from '@/lib/utils';

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

export function ResolverConsole() {
  const [did, setDid] = useState('did:hacd:NHMYYM');
  const [result, setResult] = useState<DidResolutionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [agents, setAgents] = useState<string[]>([]);

  const resolve = useCallback(async (value: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/resolve?did=${encodeURIComponent(value)}`);
      setResult((await res.json()) as DidResolutionResult);
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

      {result && (
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
            <div>
              <h2 className="mb-3 font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
                DID Document
              </h2>
              <pre className="overflow-x-auto rounded-md border border-border bg-card p-4 font-mono text-xs leading-relaxed text-muted-foreground">
                {JSON.stringify(result.didDocument, null, 2)}
              </pre>
            </div>
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
