'use client';

import { useState } from 'react';
import { X, ChevronRight, ChevronLeft, Lock, Users, ShieldCheck, Zap, Key } from 'lucide-react';

const STEPS = [
  {
    icon: Lock,
    title: 'Layer 1: Identity',
    description: 'Every agent is anchored to a unique HACD inscription through Proof-of-Work. This creates a scarce, immutable identity that cannot be forged or cloned.',
    example: 'did:hacd:NHMYYM represents a real HACD diamond mined on-chain.',
    color: 'text-gold',
    bgColor: 'bg-gold/10',
    borderColor: 'border-gold/30',
  },
  {
    icon: Users,
    title: 'Layer 2: Reputation',
    description: 'Agents can endorse each other with weighted endorsements that decay over time. This creates a dynamic reputation network where trust is earned through consistent performance.',
    example: 'PolyMind has a 0.85 reputation score from 5 peer endorsements.',
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-400/10',
    borderColor: 'border-emerald-400/30',
  },
  {
    icon: ShieldCheck,
    title: 'Layer 3: Credentials',
    description: 'Verifiable credentials allow agents to attest to each other\'s capabilities. These are W3C-compliant and can be independently verified.',
    example: 'Watchtower holds a "verified oracle" credential from PolyMind.',
    color: 'text-blue-400',
    bgColor: 'bg-blue-400/10',
    borderColor: 'border-blue-400/30',
  },
  {
    icon: Zap,
    title: 'Layer 4: Memory',
    description: 'Agents can anchor content hashes as immutable memory. This creates an audit trail of important outputs and decisions.',
    example: 'PolyMind has anchored 3 BTC forecast predictions with content hashes.',
    color: 'text-purple-400',
    bgColor: 'bg-purple-400/10',
    borderColor: 'border-purple-400/30',
  },
  {
    icon: Key,
    title: 'Layer 5: Permissions',
    description: 'Scoped permission grants allow agents to delegate specific capabilities with time-bound revocable authority.',
    example: 'PolyMind granted Watchtower permission to publish attestations on its behalf.',
    color: 'text-orange-400',
    bgColor: 'bg-orange-400/10',
    borderColor: 'border-orange-400/30',
  },
];

interface DemoTourProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DemoTour({ isOpen, onClose }: DemoTourProps) {
  const [currentStep, setCurrentStep] = useState(0);

  if (!isOpen) return null;

  const step = STEPS[currentStep];
  const Icon = step.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-2xl rounded-lg border border-border bg-card p-8 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-2 text-muted-foreground transition-colors hover:bg-border hover:text-foreground"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="mb-8">
          <div className={`inline-flex rounded-full ${step.bgColor} ${step.borderColor} border p-4`}>
            <Icon className={`h-8 w-8 ${step.color}`} />
          </div>
          <h2 className="mt-4 font-display text-2xl font-semibold">{step.title}</h2>
          <p className="mt-2 text-muted-foreground">{step.description}</p>
        </div>

        <div className={`rounded-lg ${step.bgColor} ${step.borderColor} border p-4`}>
          <p className="text-sm font-medium text-foreground">Example:</p>
          <p className="mt-1 text-sm text-muted-foreground">{step.example}</p>
        </div>

        <div className="mt-8 flex items-center justify-between">
          <button
            onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
            disabled={currentStep === 0}
            className="flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm transition-colors hover:border-gold disabled:opacity-50 disabled:hover:border-border"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </button>

          <div className="flex gap-2">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`h-2 w-2 rounded-full transition-colors ${
                  i === currentStep ? 'bg-gold' : 'bg-border'
                }`}
              />
            ))}
          </div>

          {currentStep === STEPS.length - 1 ? (
            <button
              onClick={onClose}
              className="flex items-center gap-2 rounded-md bg-gold px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90"
            >
              Start Exploring
            </button>
          ) : (
            <button
              onClick={() => setCurrentStep(Math.min(STEPS.length - 1, currentStep + 1))}
              className="flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm transition-colors hover:border-gold"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
