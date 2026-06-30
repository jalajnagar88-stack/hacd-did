import Link from 'next/link';
import { parseDid } from '@pow-agents/sdk';
import { ChatClient } from '@/components/chat-client';
import { getProfileByDid, resolveDid } from '@/lib/registry';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: { did: string };
}

export default async function ChatPage({ params }: PageProps) {
  const did = decodeURIComponent(params.did);

  // Validate syntax up front.
  let inscription: string;
  try {
    inscription = parseDid(did).inscription;
  } catch {
    return (
      <CenteredCard title="Invalid DID">
        <p className="text-sm text-muted-foreground">
          <span className="font-mono">{did}</span> is not a valid did:hacd identifier.
        </p>
      </CenteredCard>
    );
  }

  const resolution = await resolveDid(did);
  const error = resolution.didResolutionMetadata.error;

  if (error === 'deactivated') {
    const version = resolution.didDocumentMetadata.versionId ?? 'N';
    return (
      <CenteredCard title="Agent deactivated">
        <p className="text-sm text-muted-foreground">
          This agent was deactivated at versionId {version}.
        </p>
      </CenteredCard>
    );
  }

  const profile = getProfileByDid(did);
  if (error || !resolution.didDocument || !profile) {
    return (
      <CenteredCard title="Agent not found">
        <p className="text-sm text-muted-foreground">
          <span className="font-mono">{did}</span> does not resolve to an active agent.
        </p>
      </CenteredCard>
    );
  }

  return (
    <ChatClient
      agent={{
        did,
        inscription,
        name: profile.name,
        model: profile.model,
        ...(profile.samplePrompt ? { samplePrompt: profile.samplePrompt } : {}),
      }}
    />
  );
}

function CenteredCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 text-center">
      <div className="w-full rounded-lg border border-border bg-card p-8">
        <h1 className="font-display text-2xl font-semibold">{title}</h1>
        <div className="mt-3">{children}</div>
        <Link
          href="/"
          className="mt-6 inline-block rounded-md border border-border px-4 py-2 text-sm transition-colors hover:border-gold"
        >
          ← Back to home
        </Link>
      </div>
    </main>
  );
}
