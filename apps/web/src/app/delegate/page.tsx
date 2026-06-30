'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function DelegatePage() {
  const router = useRouter();
  const [issuerDid, setIssuerDid] = useState('did:hacd:NHMYYM');
  const [subjectDid, setSubjectDid] = useState('');
  const [claim, setClaim] = useState('');
  const [capability, setCapability] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      // Validate DIDs (simple format check: did:hacd:XXXXXX)
      const didRegex = /^did:hacd:[A-Z]{6}$/;
      if (!didRegex.test(issuerDid) || !didRegex.test(subjectDid)) {
        throw new Error('Invalid DID format. Expected: did:hacd:XXXXXX');
      }

      const res = await fetch(`/api/credentials/${issuerDid}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: subjectDid,
          credentialSubject: {
            claim,
            ...(capability && { capability }),
          },
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to issue credential');
      } else {
        setSuccess(true);
        // Reset form
        setSubjectDid('');
        setClaim('');
        setCapability('');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid DID format');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col px-6 py-12">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-semibold tracking-tight">Issue Credential</h1>
        <p className="mt-2 text-muted-foreground">
          Delegate capabilities and attest to other agents through verifiable credentials.
        </p>
      </div>

      <div className="rounded-lg border border-border bg-card p-6">
        <form onSubmit={handleIssue} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Issuer (your DID)
            </label>
            <input
              value={issuerDid}
              onChange={(e) => setIssuerDid(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-4 py-2 font-mono text-sm outline-none focus:border-accent"
              placeholder="did:hacd:NHMYYM"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Subject (recipient DID)
            </label>
            <input
              value={subjectDid}
              onChange={(e) => setSubjectDid(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-4 py-2 font-mono text-sm outline-none focus:border-accent"
              placeholder="did:hacd:WTYUIA"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Claim
            </label>
            <input
              value={claim}
              onChange={(e) => setClaim(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-4 py-2 text-sm outline-none focus:border-accent"
              placeholder="e.g., Trusted oracle for DeFi protocols"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Capability (optional)
            </label>
            <input
              value={capability}
              onChange={(e) => setCapability(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-4 py-2 text-sm outline-none focus:border-accent"
              placeholder="e.g., price_feed, data_validation"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-accent px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {loading ? 'Issuing...' : 'Issue Credential'}
          </button>
        </form>

        {error && (
          <div className="mt-4 rounded-md border border-red-900/60 bg-red-950/30 px-4 py-2 text-sm text-red-300">
            {error}
          </div>
        )}

        {success && (
          <div className="mt-4 rounded-md border border-emerald-900/60 bg-emerald-950/30 px-4 py-2 text-sm text-emerald-300">
            Credential issued successfully! Check the recipient's credential registry.
          </div>
        )}
      </div>

      <div className="mt-8 rounded-lg border border-border bg-card p-6">
        <h2 className="font-display text-lg font-semibold mb-3">About Credentials</h2>
        <div className="space-y-3 text-sm text-muted-foreground">
          <p>
            Verifiable Credentials are W3C-compliant attestations that allow agents to claim capabilities
            and receive endorsements from trusted peers.
          </p>
          <p>
            Each credential is signed by the issuer's runtime key and can be independently verified
            by resolving the issuer's DID and checking the signature.
          </p>
          <p>
            Credentials are stored in the issuer's "issued" list and the subject's "held" list,
            creating a bidirectional audit trail of delegated authority.
          </p>
        </div>
      </div>

      <div className="mt-6">
        <button
          onClick={() => router.back()}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Back
        </button>
      </div>
    </div>
  );
}
