// Acceptance harness for the Quantwealth demo. Run with: node scripts/acceptance.mjs
const BASE = process.env.BASE ?? 'http://localhost:3000';

let pass = 0;
let fail = 0;
function check(name, cond, detail = '') {
  if (cond) {
    pass++;
    console.log(`  PASS  ${name}${detail ? ` — ${detail}` : ''}`);
  } else {
    fail++;
    console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

async function getJson(path) {
  const res = await fetch(`${BASE}${path}`);
  return { status: res.status, body: await res.json() };
}
async function postJson(path, payload) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return { status: res.status, body: await res.json() };
}
async function getText(path) {
  const res = await fetch(`${BASE}${path}`);
  return { status: res.status, text: await res.text() };
}

async function main() {
  console.log('\n[1] Pages render');
  for (const [path, label] of [
    ['/', 'landing'],
    ['/verify', 'verify'],
    ['/mint', 'mint'],
    ['/chat/' + encodeURIComponent('did:hacd:NHMYYM'), 'chat PolyMind'],
  ]) {
    const { status } = await getText(path);
    check(`${label} (${path})`, status === 200, `HTTP ${status}`);
  }
  const landing = await getText('/');
  check('landing shows hero headline', landing.text.includes('Anchored on Proof-of-Work'));
  check('landing shows resolver console section', landing.text.includes('Resolver console'));
  check(
    'landing shows all 3 featured agents',
    landing.text.includes('PolyMind') &&
      landing.text.includes('Watchtower') &&
      landing.text.includes('ZKBSEM'),
  );

  console.log('\n[2] Resolver console backend (existing) still works');
  const r = await getJson('/api/resolve?did=did:hacd:NHMYYM');
  check('NHMYYM resolves 200', r.status === 200 && r.body.didDocument?.id === 'did:hacd:NHMYYM');
  check(
    'NHMYYM has runtime verification method',
    r.body.didDocument?.verificationMethod?.some((m) => m.id.endsWith('#agent-runtime-1')),
    `${r.body.didDocument?.verificationMethod?.length} methods`,
  );

  console.log('\n[4] Deactivated chat page shows card, not chat UI');
  const deact = await getText('/chat/' + encodeURIComponent('did:hacd:ZKBSEM'));
  check('deactivated card shown', deact.text.includes('deactivated at versionId'));
  check('no chat composer for deactivated', !deact.text.includes('Message Retired'));

  console.log('\n[Verify chain] sample-proof -> verify (green)');
  const sample = await getJson('/api/sample-proof');
  check('sample-proof returns a proof', sample.status === 200 && !!sample.body.signature);
  const v1 = await postJson('/api/verify', sample.body);
  check('sample proof verifies VALID', v1.body.valid === true, JSON.stringify(v1.body));

  console.log('\n[3] Tampered content -> red');
  const tampered = { ...sample.body, content: sample.body.content + '!' };
  const v2 = await postJson('/api/verify', tampered);
  check('tampered proof INVALID', v2.body.valid === false, v2.body.reason);

  console.log('\n[6] Deactivated DID proof -> red with deactivated reason');
  const deactProof = {
    did: 'did:hacd:ZKBSEM',
    content: 'x',
    signature: sample.body.signature,
    signedAt: sample.body.signedAt,
    verificationMethod: 'did:hacd:ZKBSEM#agent-runtime-1',
  };
  const v3 = await postJson('/api/verify', deactProof);
  check(
    'deactivated DID -> invalid + reason mentions deactivated',
    v3.body.valid === false && /deactivat/i.test(v3.body.reason ?? ''),
    v3.body.reason,
  );

  console.log('\n[Off-chain] valid syntax, not on chain -> red notFound');
  const offChain = { ...sample.body, did: 'did:hacd:VMMMMM' };
  const v4 = await postJson('/api/verify', offChain);
  check(
    'off-chain DID -> invalid + notFound',
    v4.body.valid === false && /not found/i.test(v4.body.reason ?? ''),
    v4.body.reason,
  );

  console.log('\n[Malformed] missing fields -> red malformed');
  const v5 = await postJson('/api/verify', { did: 'did:hacd:NHMYYM' });
  check('malformed proof -> invalid', v5.body.valid === false, v5.body.reason);

  const mintBad = await postJson('/api/mint', { inscription: 'ABCDEF', name: 'x' });
  check('mint invalid inscription -> 400', mintBad.status === 400, `HTTP ${mintBad.status}`);

  console.log('\n[5] Full mint flow (server-side keypair, SDK-compatible)');
  const sdk = await import('../packages/sdk/dist/index.js');
  const owner = sdk.generateKeyPair();
  // Vary the inscription per run so re-runs don't hit "already minted".
  const ALPHA = 'WTYUIAHXVMEKBSZN';
  const inscription =
    process.env.MINT_INSCRIPTION ??
    Array.from({ length: 6 }, () => ALPHA[Math.floor(Math.random() * ALPHA.length)]).join('');
  const did = sdk.inscriptionToDid(inscription);
  const document = sdk.buildDidDocument({
    inscription,
    publicKeyMultibase: owner.publicKeyMultibase,
    services: [{ id: `${did}#agent`, type: 'AutonomousAgent', serviceEndpoint: 'https://x' }],
  });
  const proof = sdk.signPayload(
    { documentHash: sdk.documentHash(document) },
    owner.privateKeyBase64Url,
  );
  const mintRes = await postJson('/api/mint', {
    inscription,
    name: 'TestQuant',
    model: 'claude-sonnet-4-6',
    description: 'an acceptance-test agent',
    capabilities: ['research'],
    document,
    documentUrl: `ipfs://bafy${inscription}`,
    proof,
    ownerPublicKeyMultibase: owner.publicKeyMultibase,
  });
  check(
    'mint new agent -> ok',
    mintRes.status === 200 && mintRes.body.ok === true,
    JSON.stringify(mintRes.body),
  );
  const newResolve = await getJson(`/api/resolve?did=${encodeURIComponent(did)}`);
  check(
    'minted agent resolves',
    newResolve.status === 200 && newResolve.body.didDocument?.id === did,
  );
  check(
    'minted agent has runtime key',
    newResolve.body.didDocument?.verificationMethod?.some((m) => m.id.endsWith('#agent-runtime-1')),
  );

  console.log('\n[Mint guards] existing inscription -> 409 already minted');
  const mintExisting = await postJson('/api/mint', {
    inscription: 'NHMYYM',
    name: 'Dupe',
    document: {
      id: 'did:hacd:NHMYYM',
      verificationMethod: [],
      authentication: [],
      assertionMethod: [],
    },
    proof: 'x',
    ownerPublicKeyMultibase: 'zX',
  });
  check(
    'mint existing -> 409',
    mintExisting.status === 409,
    `HTTP ${mintExisting.status} ${JSON.stringify(mintExisting.body)}`,
  );

  console.log(`\nRESULT: ${pass} passed, ${fail} failed\n`);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
