import Link from 'next/link';
import { Gem, Key, ShieldCheck } from 'lucide-react';
import { SiteNav } from '@/components/site-nav';
import { Diamond } from '@/components/diamond';
import { Reveal } from '@/components/reveal';
import { ResolverConsole } from '@/components/resolver-console';
import { FEATURED_AGENTS, chatHref } from '@/lib/featured';

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

export default function Home() {
  return (
    <>
      <SiteNav />

      {/* Hero */}
      <section className="mx-auto grid min-h-[80vh] max-w-6xl items-center gap-12 px-6 py-16 lg:grid-cols-2">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-gold">
            Quantwealth · did:hacd
          </p>
          <h1 className="mt-5 font-display text-5xl font-semibold leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl">
            Verifiable AI agents.
            <br />
            Anchored on Proof-of-Work.
          </h1>
          <p className="mt-6 max-w-xl text-lg text-muted-foreground">
            did:hacd is more than identity. It is reputation, credentials, memory, and permissions — all signed, all resolvable, all anchored on Proof-of-Work.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
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
        </div>
        <div className="flex justify-center lg:justify-end">
          <Diamond />
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
