import { parseDid } from '../did/did.js';
import type { DidDocument, SignedDidRecord } from '../document/types.js';
import type { ChainReader, ChainRecord, DocumentFetcher } from './types.js';

/**
 * An in-memory {@link ChainReader} + {@link DocumentFetcher} pair backing a
 * fully working resolver without a live Hacash node. Useful for tests, local
 * development, and the demo console.
 */
export class InMemoryChain implements ChainReader {
  private readonly commitments = new Map<string, ChainRecord>();
  private readonly documents = new Map<string, DidDocument>();

  /** Registers a signed record, binding it to the given owner public key. */
  publish(record: SignedDidRecord, ownerPublicKeyMultibase: string): void {
    const { inscription } = parseDid(record.did);
    this.commitments.set(inscription, {
      ownerPublicKeyMultibase,
      commitment: record.commitment,
    });
    this.documents.set(record.documentUrl, record.document);
  }

  readCommitment(inscription: string): Promise<ChainRecord | null> {
    return Promise.resolve(this.commitments.get(inscription) ?? null);
  }

  /** A {@link DocumentFetcher} that serves documents published to this chain. */
  fetcher: DocumentFetcher = (url: string) => {
    const doc = this.documents.get(url);
    if (!doc) return Promise.reject(new Error(`no document hosted at ${url}`));
    return Promise.resolve(doc);
  };
}
