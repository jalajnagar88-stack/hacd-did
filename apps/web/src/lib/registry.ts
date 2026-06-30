import {
  buildDidDocument,
  buildSignedRecord,
  generateKeyPair,
  HacdResolver,
  InMemoryChain,
  inscriptionToDid,
  parseDid,
  signMessage,
  type DidDocument,
  type DidResolutionResult,
  type ServiceEndpoint,
} from '@pow-agents/sdk';
import {
  BUILTIN_AGENTS,
  buildMintedSystemPrompt,
  DEFAULT_CHAT_MODEL,
  type AgentProfile,
} from './agents';
import { readJsonFile, writeJsonFile } from './storage';

/**
 * The Quantwealth agent registry.
 *
 * Stands in for a live Hacash node + indexer using an in-memory HACD chain.
 * Server-held runtime signing keys are persisted to backend/keystore.json so
 * agents keep a stable identity across restarts; minted agents are persisted to
 * backend/registry.json. In production, swap InMemoryChain for a real
 * ChainReader and a managed KMS for keys.
 */

const KEYSTORE_FILE = 'keystore.json';
const REGISTRY_FILE = 'registry.json';

/** A keypair held by the server, keyed by inscription. */
interface StoredKey {
  readonly publicKeyMultibase: string;
  readonly privateKeyBase64Url: string;
}

/** keystore.json shape: inscription -> owner key + runtime key. */
interface Keystore {
  [inscription: string]: {
    owner: StoredKey;
    runtime: StoredKey;
  };
}

/** A minted agent persisted to registry.json. */
interface MintedRecord {
  readonly inscription: string;
  readonly name: string;
  readonly model: string;
  readonly description: string;
  readonly capabilities: readonly string[];
  readonly document: DidDocument;
  readonly documentUrl: string;
  readonly versionId: number;
}

interface Registry {
  readonly chain: InMemoryChain;
  readonly resolver: HacdResolver;
  readonly keystore: Keystore;
  /** inscription -> agent profile (built-in + minted). */
  readonly profiles: Map<string, AgentProfile>;
  /** inscription -> minted record (for re-persistence). */
  readonly minted: Map<string, MintedRecord>;
  sampleProof: SignedProof | null;
}

/** A signed agent-message proof (returned by /api/chat, cached for /api/sample-proof). */
export interface SignedProof {
  readonly did: string;
  readonly content: string;
  readonly signature: string;
  readonly signedAt: string;
  readonly verificationMethod: string;
}

const globalForRegistry = globalThis as unknown as { __hacdRegistry?: Registry };

const RUNTIME_KID = '#agent-runtime-1';

function runtimeVerificationMethod(
  did: string,
  publicKeyMultibase: string,
): {
  id: string;
  type: 'Ed25519VerificationKey2020';
  controller: string;
  publicKeyMultibase: string;
} {
  return {
    id: `${did}${RUNTIME_KID}`,
    type: 'Ed25519VerificationKey2020',
    controller: did,
    publicKeyMultibase,
  };
}

function builtinService(profile: AgentProfile, did: string): ServiceEndpoint {
  const type =
    profile.capabilities.includes('attestations') && profile.capabilities.length === 1
      ? 'AttestationFeed'
      : 'AutonomousAgent';
  return {
    id: `${did}#agent`,
    type,
    serviceEndpoint: `https://agents.quantwealth.example/${profile.inscription.toLowerCase()}`,
  };
}

/** Publishes a built-in agent to the chain using (and persisting) stable keys. */
function publishBuiltin(
  reg: {
    chain: InMemoryChain;
    keystore: Keystore;
  },
  profile: AgentProfile,
): void {
  const did = inscriptionToDid(profile.inscription);
  const entry =
    reg.keystore[profile.inscription] ??
    (reg.keystore[profile.inscription] = {
      owner: toStored(generateKeyPair()),
      runtime: toStored(generateKeyPair()),
    });

  const baseDoc = buildDidDocument({
    inscription: profile.inscription,
    publicKeyMultibase: entry.owner.publicKeyMultibase,
    services: [builtinService(profile, did)],
  });

  // Add the runtime signing key as a second verification method.
  const document: DidDocument = {
    ...baseDoc,
    verificationMethod: [
      ...baseDoc.verificationMethod,
      runtimeVerificationMethod(did, entry.runtime.publicKeyMultibase),
    ],
    assertionMethod: [...baseDoc.assertionMethod, `${did}${RUNTIME_KID}`],
  };

  const record = buildSignedRecord({
    document,
    documentUrl: `ipfs://bafy${profile.inscription}AgentDocument`,
    privateKeyBase64Url: entry.owner.privateKeyBase64Url,
    versionId: profile.deactivated ? 2 : 1,
    ...(profile.deactivated ? { deactivated: true } : {}),
  });
  reg.chain.publish(record, entry.owner.publicKeyMultibase);
}

function toStored(k: { publicKeyMultibase: string; privateKeyBase64Url: string }): StoredKey {
  return { publicKeyMultibase: k.publicKeyMultibase, privateKeyBase64Url: k.privateKeyBase64Url };
}

function republishMinted(
  reg: {
    chain: InMemoryChain;
    keystore: Keystore;
  },
  rec: MintedRecord,
): void {
  const entry = reg.keystore[rec.inscription];
  if (!entry) return;
  const record = buildSignedRecord({
    document: rec.document,
    documentUrl: rec.documentUrl,
    privateKeyBase64Url: entry.owner.privateKeyBase64Url,
    versionId: rec.versionId,
  });
  reg.chain.publish(record, entry.owner.publicKeyMultibase);
}

function buildRegistry(): Registry {
  const chain = new InMemoryChain();
  const keystore: Keystore = readJsonFile<Keystore>(KEYSTORE_FILE) ?? {};
  const profiles = new Map<string, AgentProfile>();
  const minted = new Map<string, MintedRecord>();

  const scratch = { chain, keystore };

  for (const profile of BUILTIN_AGENTS) {
    publishBuiltin(scratch, profile);
    profiles.set(profile.inscription, profile);
  }

  // Restore minted agents.
  const mintedRecords = readJsonFile<MintedRecord[]>(REGISTRY_FILE) ?? [];
  for (const rec of mintedRecords) {
    if (!keystore[rec.inscription]) continue; // cannot republish without owner key
    republishMinted(scratch, rec);
    minted.set(rec.inscription, rec);
    profiles.set(rec.inscription, {
      inscription: rec.inscription,
      name: rec.name,
      model: rec.model,
      description: rec.description,
      capabilities: rec.capabilities,
      systemPrompt: buildMintedSystemPrompt({
        name: rec.name,
        description: rec.description,
        capabilities: rec.capabilities,
        did: inscriptionToDid(rec.inscription),
      }),
    });
  }

  // Persist any keys generated for built-ins on first run.
  writeJsonFile(KEYSTORE_FILE, keystore);

  const resolver = new HacdResolver({ chain, fetchDocument: chain.fetcher });
  return { chain, resolver, keystore, profiles, minted, sampleProof: null };
}

export function getRegistry(): Registry {
  if (!globalForRegistry.__hacdRegistry) {
    globalForRegistry.__hacdRegistry = buildRegistry();
  }
  return globalForRegistry.__hacdRegistry;
}

export function resolveDid(did: string): Promise<DidResolutionResult> {
  return getRegistry().resolver.resolve(did);
}

export function listSeededDids(): readonly string[] {
  return [...getRegistry().profiles.keys()].map((insc) => inscriptionToDid(insc));
}

export function getProfileByDid(did: string): AgentProfile | null {
  try {
    const { inscription } = parseDid(did);
    return getRegistry().profiles.get(inscription) ?? null;
  } catch {
    return null;
  }
}

/** Returns the runtime signing key for an agent, or null if unknown. */
export function getRuntimeKey(did: string): StoredKey | null {
  try {
    const { inscription } = parseDid(did);
    return getRegistry().keystore[inscription]?.runtime ?? null;
  } catch {
    return null;
  }
}

/** The runtime verification method id this server signs with. */
export function runtimeVerificationMethodId(did: string): string {
  return `${did}${RUNTIME_KID}`;
}

/** Result of {@link registerMintedAgent}. */
export type MintResult =
  | { ok: true; did: string; runtimePublicKeyMultibase: string }
  | { ok: false; status: number; error: string };

/**
 * Registers a minted agent: stores a fresh server-held runtime key, augments the
 * client-signed DID document with the runtime verification method, publishes to
 * the chain, and persists keystore + registry.
 */
export function registerMintedAgent(input: {
  inscription: string;
  name: string;
  model: string;
  description: string;
  capabilities: readonly string[];
  ownerPublicKeyMultibase: string;
  document: DidDocument;
  documentUrl: string;
}): MintResult {
  const reg = getRegistry();
  const did = inscriptionToDid(input.inscription);

  if (reg.profiles.has(input.inscription)) {
    return { ok: false, status: 409, error: 'already minted' };
  }

  // Generate the server-held runtime signing key.
  const runtime = generateKeyPair();
  const augmented: DidDocument = {
    ...input.document,
    verificationMethod: [
      ...input.document.verificationMethod,
      runtimeVerificationMethod(did, runtime.publicKeyMultibase),
    ],
    assertionMethod: [...input.document.assertionMethod, `${did}${RUNTIME_KID}`],
  };

  reg.keystore[input.inscription] = {
    owner: { publicKeyMultibase: input.ownerPublicKeyMultibase, privateKeyBase64Url: '' },
    runtime: toStored(runtime),
  };

  const record = buildSignedRecord({
    document: augmented,
    documentUrl: input.documentUrl,
    // The owner private key lives only in the user's browser; we publish using a
    // server escrow key is NOT possible, so we re-sign the commitment with a
    // server-held publishing key derived for this inscription.
    privateKeyBase64Url: ensurePublishingKey(reg, input.inscription),
    versionId: 1,
  });
  reg.chain.publish(record, reg.keystore[input.inscription]!.owner.publicKeyMultibase);

  const mintedRecord: MintedRecord = {
    inscription: input.inscription,
    name: input.name,
    model: input.model || DEFAULT_CHAT_MODEL,
    description: input.description,
    capabilities: input.capabilities,
    document: augmented,
    documentUrl: input.documentUrl,
    versionId: 1,
  };
  reg.minted.set(input.inscription, mintedRecord);
  reg.profiles.set(input.inscription, {
    inscription: input.inscription,
    name: input.name,
    model: mintedRecord.model,
    description: input.description,
    capabilities: input.capabilities,
    systemPrompt: buildMintedSystemPrompt({
      name: input.name,
      description: input.description,
      capabilities: input.capabilities,
      did,
    }),
  });

  writeJsonFile(KEYSTORE_FILE, reg.keystore);
  writeJsonFile(REGISTRY_FILE, [...reg.minted.values()]);

  return { ok: true, did, runtimePublicKeyMultibase: runtime.publicKeyMultibase };
}

/**
 * The owner private key for a minted agent is held by the user, not the server,
 * so the on-chain commitment is published with a server-held publishing key
 * bound to the same inscription. The publishing key's public half becomes the
 * owner key recorded on chain, so the commitment verifies at resolution.
 */
function ensurePublishingKey(reg: Registry, inscription: string): string {
  const entry = reg.keystore[inscription];
  if (entry && entry.owner.privateKeyBase64Url) return entry.owner.privateKeyBase64Url;
  const pub = generateKeyPair();
  reg.keystore[inscription] = {
    owner: toStored(pub),
    runtime: entry?.runtime ?? toStored(generateKeyPair()),
  };
  return pub.privateKeyBase64Url;
}

/** Signs an agent message with the agent's runtime key. Returns a full proof. */
export function signAgentMessage(
  did: string,
  content: string,
  signedAt: string,
): SignedProof | null {
  const runtime = getRuntimeKey(did);
  if (!runtime) return null;
  const signature = signMessage(content, signedAt, did, runtime.privateKeyBase64Url);
  return {
    did,
    content,
    signature,
    signedAt,
    verificationMethod: runtimeVerificationMethodId(did),
  };
}

/** Returns (building once) the cached PolyMind reference proof for /api/sample-proof. */
export function getSampleProof(): SignedProof | null {
  const reg = getRegistry();
  if (reg.sampleProof) return reg.sampleProof;
  const did = inscriptionToDid('NHMYYM');
  const content = 'PolyMind reference proof — BTC year-end prior placeholder.';
  const signedAt = '2026-06-29T00:00:00.000Z';
  reg.sampleProof = signAgentMessage(did, content, signedAt);
  return reg.sampleProof;
}
