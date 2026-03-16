'use strict';
/**
 * Mold Module — HTTP API smoke-test
 * Run after seedMoldData.js: node scripts/testMoldApi.js
 * Starts its own server on port 5001 for isolated testing.
 */
const http  = require('http');
const https = require('https');

const BASE = 'http://localhost:5000/api';
let TOKEN  = '';
let PASS = 0, FAIL = 0;
const failures = [];

// ── tiny HTTP client ──────────────────────────────────────────────────────────
function req(method, path, body) {
  return new Promise((resolve, reject) => {
    const url   = new URL(BASE + path);
    const data  = body ? JSON.stringify(body) : null;
    const opts  = {
      hostname: url.hostname, port: url.port || 80,
      path: url.pathname + url.search, method,
      headers: {
        'Content-Type': 'application/json',
        ...(TOKEN ? { 'Authorization': `Bearer ${TOKEN}` } : {}),
        ...(data  ? { 'Content-Length': Buffer.byteLength(data) } : {}),
      },
    };
    const lib = url.protocol === 'https:' ? https : http;
    const r = lib.request(opts, (res) => {
      let raw = '';
      res.on('data', d => raw += d);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(raw) }); }
        catch { resolve({ status: res.statusCode, body: raw }); }
      });
    });
    r.on('error', reject);
    if (data) r.write(data);
    r.end();
  });
}

function ok(label, extra) {
  PASS++;
  console.log(`  ✅  ${label}${extra ? ` — ${extra}` : ''}`);
}
function fail(label, reason) {
  FAIL++;
  failures.push({ label, reason });
  console.log(`  ❌  ${label} — ${reason}`);
}

async function test(label, method, path, body, expectedStatus = 200, extract) {
  try {
    const r = await req(method, path, body);
    if (r.status === expectedStatus) {
      const extra = extract ? extract(r.body) : null;
      ok(label, extra);
      return r.body;
    } else {
      fail(label, `Expected ${expectedStatus}, got ${r.status}: ${JSON.stringify(r.body).slice(0,120)}`);
      return null;
    }
  } catch(e) {
    fail(label, `Network: ${e.message}`);
    return null;
  }
}

// ─── MAIN ────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  Mold Module — HTTP API Test (server must be running on :5000)');
  console.log('═══════════════════════════════════════════════════════════\n');

  // ── A. Auth ─────────────────────────────────────────────────────────────
  console.log('── A. Authentication ────────────────────────────────────');
  const loginRes = await req('POST', '/auth/login', { employee_id: 'DT10002', password: 'Dynatech@123' });
  if (loginRes.status === 200 && loginRes.body?.token) {
    TOKEN = loginRes.body.token;
    ok('Login — got JWT token');
  } else if (loginRes.body?.data?.token) {
    TOKEN = loginRes.body.data.token;
    ok('Login — got JWT token');
  } else {
    fail('Login', `status ${loginRes.status}: ${JSON.stringify(loginRes.body).slice(0,200)}`);
    console.log('\n⚠️  Cannot continue without auth token. Check credentials.\n');
    process.exit(1);
  }
  console.log('');

  // ── B. Mold Master ───────────────────────────────────────────────────────
  console.log('── B. Mold Master ───────────────────────────────────────');
  const moldsRes = await test('GET  /mold/masters — list all', 'GET', '/mold/masters',
    null, 200, b => `${(b?.data?.length ?? b?.length ?? '?')} molds`);

  // Extract first mold ID
  const moldList = moldsRes?.data ?? (Array.isArray(moldsRes) ? moldsRes : []);
  const mold1 = moldList[0];
  const mold1Id = mold1?.id;

  if (mold1Id) {
    await test(`GET  /mold/masters/${mold1Id} — single mold`, 'GET', `/mold/masters/${mold1Id}`,
      null, 200, b => `${b?.data?.mold_code ?? b?.mold_code}`);
  }

  // Create new mold via API
  const newMoldRes = await test('POST /mold/masters — create mold', 'POST', '/mold/masters',
    { name: 'API Test Mold', owner_type: 'company', status: 'registered', total_cavities: 4, active_cavities: 4 },
    201, b => `id=${b?.data?.id}, code=${b?.data?.mold_code}`);
  const newMoldId = newMoldRes?.data?.id;

  if (newMoldId) {
    await test(`PATCH /mold/masters/${newMoldId} — update mold`, 'PATCH', `/mold/masters/${newMoldId}`,
      { notes: 'Updated via API test', material: 'P20 Steel' }, 200);
    await test(`DELETE /mold/masters/${newMoldId} — delete mold`, 'DELETE', `/mold/masters/${newMoldId}`,
      null, 200);
  }

  // QR scan
  if (mold1) {
    const qrCode = mold1?.QrRegistry?.qr_code_data ?? `QR:${mold1?.mold_code}`;
    await test('GET  /mold/masters/scan/:qrCode — QR lookup', 'GET',
      `/mold/masters/scan/${encodeURIComponent(qrCode)}`, null, 200);
  }
  console.log('');

  // ── C. Cavity Tracking ───────────────────────────────────────────────────
  console.log('── C. Cavity Tracking ───────────────────────────────────');
  if (mold1Id) {
    const cavRes = await test(`GET  /mold/cavities/${mold1Id}/cavities — list`, 'GET',
      `/mold/cavities/${mold1Id}/cavities`, null, 200,
      b => `${(b?.data?.length ?? b?.length ?? '?')} cavities`);

    const cav1 = (cavRes?.data ?? cavRes)?.[0];
    const cavId = cav1?.id;

    // Pick an unused cavity number (find first gap within total_cavities)
    const existingNums = new Set((cavRes?.data ?? cavRes ?? []).map(c => c.cavity_number));
    const mold1Detail = await req('GET', `/mold/masters/${mold1Id}`, null);
    const totalCavities = mold1Detail?.body?.data?.total_cavities ?? 16;
    let freeCavNum = null;
    for (let n = totalCavities; n >= 1; n--) {
      if (!existingNums.has(n)) { freeCavNum = n; break; }
    }
    if (!freeCavNum) freeCavNum = totalCavities; // fallback — will fail, but at least clear why

    // Create cavity
    const newCavRes = await test(`POST /mold/cavities/${mold1Id}/cavities — create`, 'POST',
      `/mold/cavities/${mold1Id}/cavities`,
      { cavity_number: freeCavNum, position: `CAV-${freeCavNum}`, status: 'active' }, 201,
      b => `id=${b?.data?.id}`);
    const newCavId = newCavRes?.data?.id;

    // Block cavity
    if (newCavId) {
      await test(`POST /mold/cavities/${mold1Id}/cavities/${newCavId}/block — block`, 'POST',
        `/mold/cavities/${mold1Id}/cavities/${newCavId}/block`,
        { block_reason: 'API test block' }, 200);
      await test(`POST /mold/cavities/${mold1Id}/cavities/${newCavId}/unblock — unblock`, 'POST',
        `/mold/cavities/${mold1Id}/cavities/${newCavId}/unblock`,
        { notes: 'API test unblock' }, 200);
    }

    // Heatmap
    await test(`GET  /mold/cavities/${mold1Id}/cavity-heatmap — heatmap`, 'GET',
      `/mold/cavities/${mold1Id}/cavity-heatmap`, null, 200);
  }
  console.log('');

  // ── D. Shot Count ────────────────────────────────────────────────────────
  console.log('── D. Shot Count Dashboard ──────────────────────────────');
  await test('GET  /mold/shot-count/dashboard', 'GET', '/mold/shot-count/dashboard',
    null, 200, b => `${(b?.data?.length ?? '?')} molds`);

  if (mold1Id) {
    await test(`GET  /mold/shot-count/${mold1Id}/history`, 'GET',
      `/mold/shot-count/${mold1Id}/history`, null, 200,
      b => `${(b?.data?.rows?.length ?? b?.data?.length ?? '?')} log entries`);

    // Manual adjustment (supervisor feature)
    await test(`POST /mold/shot-count/${mold1Id}/adjust — manual adjust`, 'POST',
      `/mold/shot-count/${mold1Id}/adjust`,
      { adjustment: 100, reason: 'API test adjustment — +100 shots' }, 200);
  }
  console.log('');

  // ── E. Life Management ────────────────────────────────────────────────────
  console.log('── E. Life Management ───────────────────────────────────');
  await test('GET  /mold/life/dashboard', 'GET', '/mold/life/dashboard',
    null, 200, b => `${(b?.data?.length ?? '?')} molds`);
  await test('GET  /mold/life/alerts', 'GET', '/mold/life/alerts',
    null, 200, b => `${(b?.data?.length ?? '?')} alerts`);

  if (mold1Id) {
    await test(`GET  /mold/life/${mold1Id}/status`, 'GET',
      `/mold/life/${mold1Id}/status`, null, 200);
    await test(`PUT  /mold/life/${mold1Id}/config — update thresholds`, 'PUT',
      `/mold/life/${mold1Id}/config`,
      { threshold_70: 70, threshold_85: 85, threshold_95: 95, threshold_100: 100, action_at_100: 'hard_block' }, 200);
    await test(`POST /mold/life/${mold1Id}/extend — request extension`, 'POST',
      `/mold/life/${mold1Id}/extend`,
      { extended_from: 500000, extended_to: 600000, reason: 'API test extension request' }, 201);
  }

  // Acknowledge an alert
  const alertsData = await req('GET', '/mold/life/alerts', null);
  const firstAlertId = alertsData?.body?.data?.[0]?.id;
  if (firstAlertId) {
    await test(`POST /mold/life/alerts/${firstAlertId}/acknowledge`, 'POST',
      `/mold/life/alerts/${firstAlertId}/acknowledge`, {}, 200);
  }
  console.log('');

  // ── F. Issue / Return ────────────────────────────────────────────────────
  console.log('── F. Issue / Return ────────────────────────────────────');
  if (mold1Id) {
    await test(`GET  /mold/issue-return/${mold1Id}/history`, 'GET',
      `/mold/issue-return/${mold1Id}/history`, null, 200,
      b => `${(b?.data?.length ?? '?')} records`);

    // Verify for issue
    await test(`GET  /mold/issue-return/${mold1Id}/verify/1/2 — verify`, 'GET',
      `/mold/issue-return/${mold1Id}/verify/1/2`, null, 200,
      b => `${Object.keys(b?.checks ?? {}).length} checks`);
  }
  console.log('');

  // ── G. Mold Store ────────────────────────────────────────────────────────
  console.log('── G. Mold Store Dashboard ──────────────────────────────');
  await test('GET  /mold/store/dashboard', 'GET', '/mold/store/dashboard',
    null, 200, b => `total=${b?.data?.summary?.total ?? b?.data?.total ?? '?'}`);
  await test('GET  /mold/store/rack-map', 'GET', '/mold/store/rack-map',
    null, 200, b => `${(b?.data?.length ?? '?')} locations`);
  await test('GET  /mold/store/movement-forecast', 'GET', '/mold/store/movement-forecast',
    null, 200, b => `${(b?.data?.length ?? '?')} movements`);
  console.log('');

  // ── H. Part Mappings via master ──────────────────────────────────────────
  console.log('── H. Part Mappings & Machine Compat ────────────────────');
  if (mold1Id) {
    // Add part mapping
    const pmRes = await test(`POST /mold/masters/${mold1Id}/part-mappings — add`, 'POST',
      `/mold/masters/${mold1Id}/part-mappings`,
      { item_id: 6, cavities_for_part: 2, is_primary: false, notes: 'API test mapping' }, 201);
    const pmId = pmRes?.data?.id;
    if (pmId) {
      await test(`DELETE /mold/masters/${mold1Id}/part-mappings/${pmId} — remove`, 'DELETE',
        `/mold/masters/${mold1Id}/part-mappings/${pmId}`, null, 200);
    }

    // Add machine compat
    await test(`POST /mold/masters/${mold1Id}/machine-compat — add`, 'POST',
      `/mold/masters/${mold1Id}/machine-compat`,
      { machine_id: 6, compatibility_status: 'compatible', notes: 'API test compat' }, 201);
  }
  console.log('');

  // ── Final report ─────────────────────────────────────────────────────────
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`  API Results: ${PASS} PASSED  |  ${FAIL} FAILED`);
  console.log('═══════════════════════════════════════════════════════════');
  if (failures.length) {
    console.log('\nFailed:');
    failures.forEach(f => console.log(`  ❌  ${f.label}\n      ${f.reason}`));
  }
  console.log('');
  process.exit(FAIL > 0 ? 1 : 0);
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });
