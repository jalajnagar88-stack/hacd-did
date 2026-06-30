'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  documentHash,
  ed25519Supported,
  generateBrowserKeyPair,
  type BrowserKeyPair,
} from '@/lib/browser-crypto';

const ALPHABET = 'WTYUIAHXVMEKBSZN';

/** Pure client-side inscription validator (mirrors SDK.isValidHacd). */
function isValidHacd(value: string): boolean {
  return value.length === 6 && [...value].every((c) => ALPHABET.includes(c));
}
const MODELS = [
  { value: 'claude-opus-4-7', label: 'Claude Opus 4.7' },
  { value: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6' },
  { value: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5' },
];
const CAPABILITIES = [
  'predictions',
  'attestations',
  'trading',
  'research',
  'analysis',
  'writing',
  'code',
];

function sanitizeInscription(raw: string): string {
  return [...raw.toUpperCase()]
    .filter((c) => ALPHABET.includes(c))
    .join('')
    .slice(0, 6);
}

type Phase = 'form' | 'keys' | 'registering';

export function MintClient() {
  const router = useRouter();
  const [inscription, setInscription] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [model, setModel] = useState(MODELS[1]!.value);
  const [caps, setCaps] = useState<string[]>([]);

  const [phase, setPhase] = useState<Phase>('form');
  const [keypair, setKeypair] = useState<BrowserKeyPair | null>(null);
  const [savedConfirmed, setSavedConfirmed] = useState(false);
  const [rePaste, setRePaste] = useState('');
  const [error, setError] = useState<string | null>(null);

  const inscriptionValid = isValidHacd(inscription);
  const letters = useMemo(() => inscription.padEnd(6, '·').split(''), [inscription]);
  const keyMatches = keypair !== null && rePaste.trim() === keypair.privateKeyBase64Url;

  function toggleCap(cap: string) {
    setCaps((prev) => (prev.includes(cap) ? prev.filter((c) => c !== cap) : [...prev, cap]));
  }

  async function generateKeypair() {
    setError(null);
    if (!(await ed25519Supported())) {
      setError(
        'This browser does not support Ed25519 in Web Crypto. Try a recent Chrome/Safari/Firefox.',
      );
      return;
    }
    const kp = await generateBrowserKeyPair();
    setKeypair(kp);
    setPhase('keys');
  }

  async function signAndRegister() {
    if (!keypair || !inscriptionValid) return;
    setError(null);
    setPhase('registering');
    const did = `did:hacd:${inscription}`;
    const keyId = `${did}#agent-key-1`;

    const document = {
      '@context': [
        'https://www.w3.org/ns/did/v1',
        'https://w3id.org/security/suites/ed25519-2020/v1',
      ],
      id: did,
      controller: did,
      verificationMethod: [
        {
          id: keyId,
          type: 'Ed25519VerificationKey2020',
          controller: did,
          publicKeyMultibase: keypair.publicKeyMultibase,
        },
      ],
      authentication: [keyId],
      assertionMethod: [keyId],
      service: [
        {
          id: `${did}#agent`,
          type: 'AutonomousAgent',
          serviceEndpoint: `https://agents.quantwealth.example/${inscription.toLowerCase()}`,
        },
      ],
    };

    try {
      // Sign a commitment over the document hash, matching the server's check.
      const hash = await documentHash(document);
      const proof = await keypair.sign({ documentHash: hash });

      const res = await fetch('/api/mint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inscription,
          name,
          model,
          description,
          capabilities: caps,
          document,
          documentUrl: `ipfs://bafy${inscription}Minted`,
          proof,
          ownerPublicKeyMultibase: keypair.publicKeyMultibase,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; chatUrl?: string; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error ?? `mint failed (${res.status})`);
        setPhase('keys');
        return;
      }
      router.push(data.chatUrl ?? `/chat/${encodeURIComponent(did)}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'mint failed');
      setPhase('keys');
    }
  }

  const canGenerate = inscriptionValid && name.trim().length > 0;

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col px-6 py-16">
      <Link href="/" className="mb-8 text-sm text-muted-foreground hover:text-foreground">
        ← did:hacd
      </Link>
      <h1 className="font-display text-3xl font-semibold tracking-tight">
        Mint a Quantwealth agent
      </h1>
      <p className="mt-3 text-muted-foreground">
        Anchor a new AI agent to a HACD. The 6-letter inscription becomes its did:hacd identifier.
      </p>

      {/* HACD letters display */}
      <div className="mt-8">
        <label className="text-sm text-muted-foreground">HACD inscription</label>
        <div className="mt-2 flex gap-2">
          {letters.map((ch, i) => (
            <div
              key={i}
              className="flex h-14 w-12 items-center justify-center rounded-md border border-gold/40 bg-card font-display text-2xl font-semibold text-gold"
            >
              {ch}
            </div>
          ))}
        </div>
        <input
          value={inscription}
          onChange={(e) => setInscription(sanitizeInscription(e.target.value))}
          placeholder="Type 6 letters (alphabet: WTYUIAHXVMEKBSZN)"
          disabled={phase !== 'form'}
          className="mt-3 w-full rounded-md border border-border bg-card px-4 py-2.5 font-mono text-sm uppercase outline-none focus:border-gold disabled:opacity-60"
        />
        {inscription.length === 6 && !inscriptionValid && (
          <p className="mt-1 text-xs text-red-400">Invalid inscription.</p>
        )}
      </div>

      {/* Name */}
      <div className="mt-6">
        <label className="text-sm text-muted-foreground">Agent name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={phase !== 'form'}
          className="mt-2 w-full rounded-md border border-border bg-card px-4 py-2.5 text-sm outline-none focus:border-gold disabled:opacity-60"
        />
      </div>

      {/* Description */}
      <div className="mt-6">
        <label className="text-sm text-muted-foreground">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value.slice(0, 280))}
          rows={3}
          disabled={phase !== 'form'}
          className="mt-2 w-full resize-none rounded-md border border-border bg-card px-4 py-2.5 text-sm outline-none focus:border-gold disabled:opacity-60"
        />
        <p className="mt-1 text-right text-xs text-muted-foreground">{description.length}/280</p>
      </div>

      {/* Model */}
      <div className="mt-6">
        <label className="text-sm text-muted-foreground">Model</label>
        <select
          value={model}
          onChange={(e) => setModel(e.target.value)}
          disabled={phase !== 'form'}
          className="mt-2 w-full rounded-md border border-border bg-card px-4 py-2.5 text-sm outline-none focus:border-gold disabled:opacity-60"
        >
          {MODELS.map((m) => (
            <option key={m.value} value={m.value} className="bg-card">
              {m.label}
            </option>
          ))}
        </select>
      </div>

      {/* Capabilities */}
      <div className="mt-6">
        <label className="text-sm text-muted-foreground">Capabilities</label>
        <div className="mt-2 flex flex-wrap gap-2">
          {CAPABILITIES.map((cap) => (
            <button
              key={cap}
              type="button"
              onClick={() => toggleCap(cap)}
              disabled={phase !== 'form'}
              className={`rounded-full border px-3 py-1 text-xs transition-colors disabled:opacity-60 ${
                caps.includes(cap)
                  ? 'border-gold bg-gold/15 text-gold'
                  : 'border-border text-muted-foreground hover:border-gold'
              }`}
            >
              {cap}
            </button>
          ))}
        </div>
      </div>

      {/* Step: generate keypair */}
      {phase === 'form' && (
        <button
          onClick={() => void generateKeypair()}
          disabled={!canGenerate}
          className="mt-8 rounded-md bg-gold px-6 py-3 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          Generate keypair
        </button>
      )}

      {/* Step: key reveal + confirm */}
      {phase !== 'form' && keypair && (
        <div className="mt-8 space-y-4">
          <div className="rounded-md border border-red-800/60 bg-red-950/30 px-4 py-3 text-sm text-red-300">
            This private key is shown once and is never sent to the server. Save it now — it is the
            agent owner key. If you lose it you cannot prove ownership.
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Private key (base64url)</label>
            <code className="mt-1 block break-all rounded-md border border-border bg-card p-3 font-mono text-xs text-gold">
              {keypair.privateKeyBase64Url}
            </code>
            <button
              onClick={() => void navigator.clipboard.writeText(keypair.privateKeyBase64Url)}
              className="mt-2 text-xs text-gold hover:underline"
            >
              Copy private key
            </button>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={savedConfirmed}
              onChange={(e) => setSavedConfirmed(e.target.checked)}
              className="h-4 w-4 accent-[var(--gold)]"
            />
            I have saved my private key
          </label>
          <div>
            <label className="text-xs text-muted-foreground">Re-paste private key to confirm</label>
            <input
              value={rePaste}
              onChange={(e) => setRePaste(e.target.value)}
              className="mt-1 w-full rounded-md border border-border bg-card px-4 py-2.5 font-mono text-xs outline-none focus:border-gold"
            />
            {rePaste && !keyMatches && <p className="mt-1 text-xs text-red-400">Does not match.</p>}
          </div>
          <button
            onClick={() => void signAndRegister()}
            disabled={!savedConfirmed || !keyMatches || phase === 'registering'}
            className="rounded-md bg-gold px-6 py-3 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            {phase === 'registering' ? 'Registering…' : 'Sign & register'}
          </button>
        </div>
      )}

      {error && (
        <p className="mt-6 rounded-md border border-red-800/60 bg-red-950/30 px-4 py-2 text-sm text-red-300">
          {error}
        </p>
      )}
    </main>
  );
}
