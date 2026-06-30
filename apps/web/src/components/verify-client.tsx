'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VerifyResult {
  valid: boolean;
  reason?: string;
  agentName?: string;
  model?: string;
  did?: string;
}

export function VerifyClient() {
  const [text, setText] = useState('');
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [signedAt, setSignedAt] = useState<string | null>(null);

  async function verify() {
    setLoading(true);
    setResult(null);
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(text) as Record<string, unknown>;
    } catch {
      setResult({ valid: false, reason: 'malformed proof JSON' });
      setLoading(false);
      return;
    }
    setSignedAt(typeof parsed.signedAt === 'string' ? parsed.signedAt : null);
    try {
      const res = await fetch('/api/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed),
      });
      setResult((await res.json()) as VerifyResult);
    } catch {
      setResult({ valid: false, reason: 'network error' });
    } finally {
      setLoading(false);
    }
  }

  async function loadSample() {
    try {
      const res = await fetch('/api/sample-proof');
      const proof = (await res.json()) as Record<string, unknown>;
      setText(JSON.stringify(proof, null, 2));
    } catch {
      /* ignore */
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col px-6 py-16">
      <Link href="/" className="mb-8 text-sm text-muted-foreground hover:text-foreground">
        ← did:hacd
      </Link>
      <h1 className="font-display text-3xl font-semibold tracking-tight">
        Verify a signed agent proof
      </h1>
      <p className="mt-3 text-muted-foreground">
        Paste any signed message produced by a did:hacd agent. We resolve the DID, look up the
        agent&apos;s public key, and check the signature.
      </p>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={10}
        spellCheck={false}
        placeholder='{ "did": "did:hacd:NHMYYM", "content": "…", "signature": "…", "signedAt": "…", "verificationMethod": "…" }'
        className="mt-6 w-full resize-y rounded-md border border-border bg-card p-4 font-mono text-xs outline-none focus:border-gold"
      />

      <div className="mt-3 flex items-center justify-between">
        <button onClick={() => void loadSample()} className="text-sm text-gold hover:underline">
          Try a sample proof
        </button>
        <button
          onClick={() => void verify()}
          disabled={loading || !text.trim()}
          className="rounded-md bg-gold px-6 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {loading ? 'Verifying…' : 'Verify'}
        </button>
      </div>

      {result && (
        <div
          className={cn(
            'mt-8 rounded-lg border p-6 ring-1',
            result.valid
              ? 'border-emerald-700/60 bg-emerald-950/20 ring-emerald-700/30'
              : 'border-red-800/60 bg-red-950/20 ring-red-800/30',
          )}
        >
          <div className="flex items-center gap-3">
            {result.valid ? (
              <CheckCircle2 className="h-7 w-7 text-emerald-400" />
            ) : (
              <XCircle className="h-7 w-7 text-red-400" />
            )}
            <p
              className={cn(
                'text-lg font-medium',
                result.valid ? 'text-emerald-300' : 'text-red-300',
              )}
            >
              {result.valid
                ? `Signature valid · Verified against ${result.did}`
                : 'Signature invalid'}
            </p>
          </div>

          {result.valid ? (
            <div className="mt-5 space-y-1 border-t border-emerald-800/40 pt-4 text-sm text-muted-foreground">
              {result.agentName && (
                <p>
                  <span className="text-foreground">Agent:</span> {result.agentName}
                </p>
              )}
              {result.model && (
                <p>
                  <span className="text-foreground">Model:</span> {result.model}
                </p>
              )}
              {signedAt && (
                <p>
                  <span className="text-foreground">Signed at:</span>{' '}
                  {new Date(signedAt).toLocaleString()}
                </p>
              )}
              {result.did && (
                <Link
                  href={`/chat/${encodeURIComponent(result.did)}`}
                  className="mt-2 inline-block text-gold hover:underline"
                >
                  Open agent →
                </Link>
              )}
            </div>
          ) : (
            <p className="mt-3 text-sm text-red-300/90">{result.reason}</p>
          )}
        </div>
      )}
    </main>
  );
}
