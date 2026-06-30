'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';

interface AgentMeta {
  did: string;
  inscription: string;
  name: string;
  model: string;
  samplePrompt?: string;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  signature?: string;
  signedAt?: string;
  verificationMethod?: string;
}

interface ProofResponse {
  did: string;
  content: string;
  signature: string;
  signedAt: string;
  verificationMethod: string;
  error?: string;
}

/** Renders a minimal markdown subset (code blocks, inline code, bold, line breaks). */
function renderContent(text: string): React.ReactNode {
  const parts = text.split(/(```[\s\S]*?```)/g);
  return parts.map((part, i) => {
    if (part.startsWith('```')) {
      const code = part.replace(/^```[a-zA-Z]*\n?/, '').replace(/```$/, '');
      return (
        <pre
          key={i}
          className="my-2 overflow-x-auto rounded-md border border-border bg-background p-3 font-mono text-xs text-gold"
        >
          {code.trim()}
        </pre>
      );
    }
    const lines = part.split('\n');
    return (
      <span key={i}>
        {lines.map((line, j) => (
          <span key={j}>
            {renderInline(line)}
            {j < lines.length - 1 && <br />}
          </span>
        ))}
      </span>
    );
  });
}

function renderInline(line: string): React.ReactNode {
  const segments = line.split(/(`[^`]+`|\*\*[^*]+\*\*)/g);
  return segments.map((seg, i) => {
    if (seg.startsWith('`') && seg.endsWith('`')) {
      return (
        <code key={i} className="rounded bg-background px-1 py-0.5 font-mono text-xs text-gold">
          {seg.slice(1, -1)}
        </code>
      );
    }
    if (seg.startsWith('**') && seg.endsWith('**')) {
      return <strong key={i}>{seg.slice(2, -2)}</strong>;
    }
    return <span key={i}>{seg}</span>;
  });
}

export function ChatClient({ agent }: { agent: AgentMeta }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<number | null>(null);
  const listEndRef = useRef<HTMLDivElement>(null);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    setError(null);
    const nextMessages: ChatMessage[] = [...messages, { role: 'user', content: trimmed }];
    setMessages(nextMessages);
    setInput('');
    setLoading(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          did: agent.did,
          messages: nextMessages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      const data = (await res.json()) as ProofResponse;
      if (!res.ok) {
        setError(data.error ?? `request failed (${res.status})`);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: data.content,
            signature: data.signature,
            signedAt: data.signedAt,
            verificationMethod: data.verificationMethod,
          },
        ]);
      }
    } catch {
      setError('network error');
    } finally {
      setLoading(false);
      requestAnimationFrame(() => listEndRef.current?.scrollIntoView({ behavior: 'smooth' }));
    }
  }

  function copyProof(msg: ChatMessage, index: number) {
    const proof = {
      did: agent.did,
      content: msg.content,
      signature: msg.signature,
      signedAt: msg.signedAt,
      verificationMethod: msg.verificationMethod,
      hint: 'Paste at /verify',
    };
    void navigator.clipboard.writeText(JSON.stringify(proof, null, 2));
    setCopied(index);
    setTimeout(() => setCopied(null), 1500);
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col px-6">
      {/* Sticky header */}
      <header className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-border bg-background/85 py-4 backdrop-blur">
        <div className="flex items-center gap-3">
          <Link href="/" className="font-display text-3xl font-semibold text-gold">
            {agent.inscription}
          </Link>
          <div>
            <p className="font-display text-lg font-semibold leading-tight">{agent.name}</p>
            <p className="font-mono text-xs text-muted-foreground">{agent.model}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="rounded-full border border-border px-2.5 py-1 text-[11px] text-muted-foreground"
            title="Responses are scripted for this demo; every signature is produced by the agent's real runtime key and verifies in /verify."
          >
            scripted demo · signatures real
          </span>
          <Link
            href={`/?did=${encodeURIComponent(agent.did)}#resolver`}
            className="rounded-full border border-gold/50 px-3 py-1 text-xs text-gold transition-colors hover:bg-gold hover:text-background"
          >
            Verified ✓
          </Link>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 space-y-5 py-8">
        {messages.length === 0 && (
          <button
            onClick={() => void send(agent.samplePrompt ?? 'Introduce yourself.')}
            className="rounded-lg border border-dashed border-border px-4 py-3 text-left text-sm text-muted-foreground transition-colors hover:border-gold hover:text-foreground"
          >
            Ask {agent.name}: &ldquo;{agent.samplePrompt ?? 'Introduce yourself.'}&rdquo;
          </button>
        )}

        {messages.map((msg, i) =>
          msg.role === 'user' ? (
            <div key={i} className="flex justify-end">
              <div className="max-w-[80%] rounded-2xl rounded-br-sm bg-gold/15 px-4 py-2.5 text-sm">
                {msg.content}
              </div>
            </div>
          ) : (
            <div key={i} className="flex flex-col items-start">
              <div className="max-w-[90%] rounded-2xl rounded-bl-sm border border-border bg-card px-4 py-3 text-sm leading-relaxed">
                {renderContent(msg.content)}
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 pl-1 text-xs text-muted-foreground">
                <span>{msg.signedAt ? new Date(msg.signedAt).toLocaleTimeString() : ''}</span>
                <span className="font-mono">Signed by {agent.did}</span>
                <Link href="/verify" className="text-gold hover:underline">
                  Verify
                </Link>
                <button onClick={() => copyProof(msg, i)} className="text-gold hover:underline">
                  {copied === i ? 'Copied' : 'Copy proof'}
                </button>
              </div>
            </div>
          ),
        )}

        {loading && <p className="pl-1 text-sm text-muted-foreground">{agent.name} is thinking…</p>}
        {error && (
          <p className="rounded-md border border-red-900/60 bg-red-950/30 px-4 py-2 text-sm text-red-300">
            {error}
          </p>
        )}
        <div ref={listEndRef} />
      </div>

      {/* Sticky composer */}
      <div className="sticky bottom-0 border-t border-border bg-background/85 py-4 backdrop-blur">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void send(input);
          }}
          className="flex gap-2"
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void send(input);
              }
            }}
            rows={1}
            placeholder={`Message ${agent.name}…`}
            className="flex-1 resize-none rounded-md border border-border bg-card px-4 py-3 text-sm outline-none focus:border-gold"
          />
          <button
            type="submit"
            disabled={loading}
            className="rounded-md bg-gold px-5 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
