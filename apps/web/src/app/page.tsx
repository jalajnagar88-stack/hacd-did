'use client';

import Link from 'next/link';
import { Gem, Key, ShieldCheck, Zap, Users, Lock, Play } from 'lucide-react';
import { SiteNav } from '@/components/site-nav';
import { Diamond } from '@/components/diamond';
import { Reveal } from '@/components/reveal';
import { ResolverConsole } from '@/components/resolver-console';
import { DemoTour } from '@/components/demo-tour';
import { FEATURED_AGENTS, chatHref } from '@/lib/featured';
import { useState } from 'react';

const PILLARS = [
  {
    icon: Gem,
    title: 'Scarcity',
    body: 'Every HACD is mined through proof-of-work and won at auction. There are roughly 16.7 million possible six-letter inscriptions and no more — so an identity cannot be minted on demand, and Sybil attacks become economically irrational rather than merely discouraged.',
  },
  {
    icon: Key,
    title: 'Sovereignty',
    body: 'The HACD owner holds the keys. They sign the DID document, control rotation, and decide deactivation. No registrar can revoke, censor, or impersonate an agent — control derives entirely from on-chain ownership of the diamond.',
  },
  {
    icon: ShieldCheck,
    title: 'Auditability',
    body: 'The document hash is committed on-chain inside a Stack Token; every signed agent message is verifiable against the resolved public key. Anyone can independently confirm who said what, with no trust in our servers.',
  },
];

const FIVE_LAYERS = [
  {
    icon: Lock,
    title: 'Identity',
    description: 'PoW-anchored DID with on-chain commitment',
    color: 'text-gold',
  },
  {
    icon: Users,
    title: 'Reputation',
    description: 'Endorsement network with decayed scoring',
    color: 'text-emerald-400',
  },
  {
    icon: ShieldCheck,
    title: 'Credentials',
    description: 'Verifiable capability attestations',
    color: 'text-blue-400',
  },
  {
    icon: Zap,
    title: 'Memory',
    description: 'Immutable content hash anchors',
    color: 'text-purple-400',
  },
  {
    icon: Key,
    title: 'Permissions',
    description: 'Scoped, revocable capability grants',
    color: 'text-orange-400',
  },
];

export default function Home() {
  const [showTour, setShowTour] = useState(false);

  return (
    <>
      <SiteNav />
      <DemoTour isOpen={showTour} onClose={() => setShowTour(false)} />

      {/* Hero */}
      <section className="relative mx-auto grid min-h-[85vh] max-w-6xl items-center gap-12 px-6 py-16 lg:grid-cols-2">
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-gold/5 via-transparent to-transparent opacity-50" />
        <div>
          <Reveal>
            <p className="font-mono text-xs uppercase tracking-[0.3em] text-gold">
              Quantwealth · did:hacd
            </p>
          </Reveal>
          <Reveal delay={0.1}>
            <h1 className="mt-5 font-display text-5xl font-semibold leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl">
              Verifiable AI agents.
              <br />
              <span className="text-gold">Anchored on Proof-of-Work.</span>
            </h1>
          </Reveal>
          <Reveal delay={0.2}>
            <p className="mt-6 max-w-xl text-lg text-muted-foreground">
              did:hacd is more than identity. It is reputation, credentials, memory, and permissions — all signed, all resolvable, all anchored on Proof-of-Work.
            </p>
          </Reveal>
          <Reveal delay={0.3}>
            <div className="mt-8 flex flex-wrap gap-3">
              <button
                onClick={() => setShowTour(true)}
                className="flex items-center gap-2 rounded-md border border-gold/50 bg-card px-6 py-3 text-sm font-medium text-gold transition-colors hover:bg-gold hover:text-background"
              >
                <Play className="h-4 w-4" />
                Take a tour
              </button>
              <Link
                href="/mint"
                className="rounded-md bg-gold px-6 py-3 text-sm font-medium text-background transition-opacity hover:opacity-90"
              >
                Mint your agent
              </Link>
              <Link
                href={chatHref('did:hacd:NHMYYM')}
                className="rounded-md border border-border px-6 py-3 text-sm font-medium text-foreground transition-colors hover:border-gold"
              >
                Chat with PolyMind
              </Link>
              <Link
                href="/anatomy/did:hacd:NHMYYM"
                className="rounded-md border border-border px-6 py-3 text-sm font-medium text-foreground transition-colors hover:border-gold"
              >
                See an agent anatomy →
              </Link>
            </div>
          </Reveal>
          <Reveal delay={0.4}>
            <div className="mt-10 grid grid-cols-3 gap-6">
              <div>
                <div className="font-display text-3xl font-semibold text-gold">16.7M</div>
                <div className="mt-1 text-xs text-muted-foreground">Possible identities</div>
              </div>
              <div>
                <div className="font-display text-3xl font-semibold text-gold">5</div>
                <div className="mt-1 text-xs text-muted-foreground">Identity layers</div>
              </div>
              <div>
                <div className="font-display text-3xl font-semibold text-gold">100%</div>
                <div className="mt-1 text-xs text-muted-foreground">Verifiable</div>
              </div>
            </div>
          </Reveal>
        </div>
        <div className="flex justify-center lg:justify-end">
          <Reveal delay={0.2}>
            <Diamond />
          </Reveal>
        </div>
      </section>

      {/* Why PoW identity */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <Reveal>
          <h2 className="font-display text-3xl font-semibold tracking-tight">Why PoW identity</h2>
        </Reveal>
        <div className="mt-10 grid gap-8 md:grid-cols-3">
          {PILLARS.map((pillar, i) => (
            <Reveal key={pillar.title} delay={i * 0.08}>
              <div className="rounded-lg border border-border bg-card p-6">
                <pillar.icon className="h-6 w-6 text-gold" />
                <h3 className="mt-4 font-display text-xl font-semibold">{pillar.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{pillar.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Five layers */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <Reveal>
          <h2 className="font-display text-3xl font-semibold tracking-tight">Five layers of agent identity</h2>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Beyond basic identity, did:hacd provides a complete framework for agent reputation, credentials, memory, and permissions — all cryptographically verifiable.
          </p>
        </Reveal>
        <div className="mt-10 grid gap-6 md:grid-cols-5">
          {FIVE_LAYERS.map((layer, i) => (
            <Reveal key={layer.title} delay={i * 0.1}>
              <div className="flex h-full flex-col items-center rounded-lg border border-border bg-card p-6 text-center transition-all hover:border-gold/50 hover:shadow-lg">
                <layer.icon className={`h-8 w-8 ${layer.color}`} />
                <h3 className="mt-4 font-display text-lg font-semibold">{layer.title}</h3>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{layer.description}</p>
                <div className="mt-4 text-xs font-mono text-muted-foreground">Layer {i + 1}</div>
              </div>
            </Reveal>
          ))}
        </div>
        <Reveal delay={0.5}>
          <div className="mt-10 text-center">
            <Link
              href="/anatomy/did:hacd:NHMYYM"
              className="inline-flex items-center gap-2 rounded-md border border-gold/50 bg-card px-6 py-3 text-sm font-medium text-gold transition-colors hover:bg-gold hover:text-background"
            >
              Explore full anatomy →
            </Link>
          </div>
        </Reveal>
      </section>

      {/* Featured agents */}
      <section className="mx-auto max-w-6xl px-6 py-10">
        <Reveal>
          <h2 className="font-display text-3xl font-semibold tracking-tight">Featured agents</h2>
        </Reveal>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {FEATURED_AGENTS.map((agent, i) => (
            <Reveal key={agent.did} delay={i * 0.08}>
              <div className="flex h-full flex-col rounded-lg border border-border bg-card p-6">
                <div className="flex items-center justify-between">
                  <span className="font-display text-2xl font-semibold text-gold">
                    {agent.inscription}
                  </span>
                  {agent.deactivated && (
                    <span className="rounded border border-red-900/60 bg-red-950/40 px-2 py-0.5 text-xs text-red-300">
                      Deactivated
                    </span>
                  )}
                </div>
                <h3 className="mt-3 font-display text-lg font-semibold">{agent.name}</h3>
                <p className="mt-1 font-mono text-xs text-muted-foreground">{agent.did}</p>
                {agent.capabilities.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {agent.capabilities.map((cap) => (
                      <span
                        key={cap}
                        className="rounded border border-border px-2 py-0.5 text-xs text-muted-foreground"
                      >
                        {cap}
                      </span>
                    ))}
                  </div>
                )}
                {agent.caption && (
                  <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
                    {agent.caption}
                  </p>
                )}
                <div className="mt-auto pt-6">
                  {agent.deactivated ? (
                    <button
                      disabled
                      className="w-full cursor-not-allowed rounded-md border border-border px-4 py-2 text-sm text-muted-foreground opacity-50"
                    >
                      Chat
                    </button>
                  ) : (
                    <Link
                      href={chatHref(agent.did)}
                      className="block w-full rounded-md border border-border px-4 py-2 text-center text-sm transition-colors hover:border-gold"
                    >
                      Chat →
                    </Link>
                  )}
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Resolver console */}
      <section id="resolver" className="mx-auto max-w-6xl px-6 py-20">
        <Reveal>
          <h2 className="font-display text-3xl font-semibold tracking-tight">
            Resolver console — try any did:hacd
          </h2>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Resolve a Proof-of-Work Decentralized Identifier and inspect its proof chain: on-chain
            AGNT commitment, owner signature, and document hash integrity.
          </p>
        </Reveal>
        <div className="mt-8">
          <ResolverConsole />
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-8 text-sm text-muted-foreground">
          <span>Quantwealth · did:hacd · HACD Labs Incubator Season 2</span>
          <div className="flex gap-5">
            <a
              href="https://github.com"
              target="_blank"
              rel="noreferrer"
              className="hover:text-foreground"
            >
              Spec
            </a>
            <Link href="/verify" className="hover:text-foreground">
              Verify
            </Link>
            <a
              href="https://github.com"
              target="_blank"
              rel="noreferrer"
              className="hover:text-foreground"
            >
              GitHub
            </a>
            <a
              href="https://x.com"
              target="_blank"
              rel="noreferrer"
              className="hover:text-foreground"
            >
              X
            </a>
          </div>
        </div>
      </footer>
    </>
  );
}
