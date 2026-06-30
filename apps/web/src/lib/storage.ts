import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';

/**
 * Resolves a writable data directory for server-held state (keystore, registry).
 *
 * Order of preference:
 *   1. HACD_DATA_DIR env var (set this on platforms with a writable volume).
 *   2. The repo's `backend/` directory (works in local dev).
 *   3. The OS temp dir (works on read-only serverless filesystems like Vercel,
 *      but is ephemeral — state does not survive cold starts).
 *
 * The chosen directory is cached for the process.
 */
let cachedDir: string | null = null;

function findRepoBackendDir(): string | null {
  let dir = process.cwd();
  for (let i = 0; i < 6; i++) {
    if (existsSync(join(dir, 'pnpm-workspace.yaml'))) {
      return join(dir, 'backend');
    }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

function canWrite(dir: string): boolean {
  try {
    mkdirSync(dir, { recursive: true });
    const probe = join(dir, '.write-probe');
    writeFileSync(probe, 'ok');
    return true;
  } catch {
    return false;
  }
}

export function dataDir(): string {
  if (cachedDir) return cachedDir;

  const candidates = [
    process.env.HACD_DATA_DIR ? resolve(process.env.HACD_DATA_DIR) : null,
    findRepoBackendDir(),
    join(tmpdir(), 'hacd-data'),
  ].filter((d): d is string => d !== null);

  for (const candidate of candidates) {
    if (canWrite(candidate)) {
      cachedDir = candidate;
      return candidate;
    }
  }

  // Last resort — return tmp even if probe failed; writes will throw and be caught.
  cachedDir = join(tmpdir(), 'hacd-data');
  return cachedDir;
}

export function readJsonFile<T>(name: string): T | null {
  try {
    const path = join(dataDir(), name);
    if (!existsSync(path)) return null;
    return JSON.parse(readFileSync(path, 'utf8')) as T;
  } catch {
    return null;
  }
}

export function writeJsonFile(name: string, value: unknown): void {
  try {
    const dir = dataDir();
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, name), `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  } catch {
    // Persistence is best-effort; the in-memory registry remains authoritative.
  }
}
