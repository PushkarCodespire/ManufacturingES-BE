// Batch test script - part 2: Trial, Shot Count, Cost, Documents, AI
const http = require('http');
const req = (method, path, body, token) => new Promise((res, rej) => {
  const d = body ? JSON.stringify(body) : null;
  const opts = { hostname:'localhost', port:5000, path:'/api'+path, method,
    headers:{'Content-Type':'application/json', ...(d?{'Content-Length':Buffer.byteLength(d)}:{}), ...(token?{Authorization:'Bearer '+token}:{}) }};
  const r2 = http.request(opts, r => { let s=''; r.on('data',c=>s+=c); r.on('end',()=>{ try{res({status:r.statusCode,body:JSON.parse(s)})}catch(e){res({status:r.statusCode,body:s})} }); });
  r2.on('error',rej); if(d) r2.write(d); r2.end();
});
const get = (p,t) => req('GET',p,null,t);
const post = (p,b,t) => req('POST',p,b,t);
const patch = (p,b,t) => req('PATCH',p,b,t);

function log(label, status, body) {
  const short = JSON.stringify(body).substring(0, 250);
  const ok = status >= 200 && status < 300 ? 'OK' : 'ERR';
  console.log(`[${ok}] ${label}: ${status} ${short}`);
}

async function main() {
  const login = await post('/auth/login', {employee_id:'DT10002', password:'Dynatech@123'});
  const token = login.body?.data?.token;
  if (!token) { console.log('LOGIN FAILED:', login.status, JSON.stringify(login.body)); return; }
  console.log('LOGIN OK');

  const mold1Id = 6, machineId = 1, bd1Id = 2;

  // ── MODULE 14: MOLD TRIAL ──
  console.log('\n=== MODULE 14: MOLD TRIAL ===');
  const trialProto = await post('/mold/trial/protocols', {
    name:'Auto Clip Mold Trial Protocol', mold_id:mold1Id, machine_id:machineId,
    parameters:[
      {name:'Barrel Temperature', unit:'°C', target:220, tolerance:5},
      {name:'Injection Speed', unit:'mm/s', target:85, tolerance:10}
    ]
  }, token);
  log('POST /mold/trial/protocols', trialProto.status, trialProto.body?.data || trialProto.body);
  const protoId = trialProto.body?.data?.id;

  const allProtos = await get('/mold/trial/protocols', token);
  log('GET /mold/trial/protocols', allProtos.status, {count:allProtos.body?.data?.length});

  let trialRunId;
  if (protoId) {
    const startTrial = await post('/mold/trial/'+mold1Id+'/start', {protocol_id:protoId, machine_id:machineId, operator_id:2, trial_date:'2026-03-18', trial_type:'new_mold'}, token);
    log('POST /mold/trial/:moldId/start', startTrial.status, startTrial.body?.data || startTrial.body);
    trialRunId = startTrial.body?.data?.id;
  }

  const allRuns = await get('/mold/trial/runs', token);
  log('GET /mold/trial/runs', allRuns.status, {count:allRuns.body?.data?.length});

  if (trialRunId) {
    const oneRun = await get('/mold/trial/runs/'+trialRunId, token);
    log('GET /mold/trial/runs/:id', oneRun.status, oneRun.body?.data ? {id:oneRun.body.data.id} : oneRun.body);

    const patchRun = await patch('/mold/trial/runs/'+trialRunId, {notes:'Parameters stable after 20 shots'}, token);
    log('PATCH /mold/trial/runs/:id', patchRun.status, patchRun.body?.data || patchRun.body);

    const addParam = await post('/mold/trial/runs/'+trialRunId+'/parameters', {parameter_name:'Barrel Temperature', set_value:220, actual_value:218, unit:'°C', is_ok:true}, token);
    log('POST /mold/trial/runs/:id/parameters', addParam.status, addParam.body?.data || addParam.body);
  }

  // ── MODULE 15: MOLD SHOT COUNT ──
  console.log('\n=== MODULE 15: MOLD SHOT COUNT ===');
  const shotDash = await get('/mold/shot-count/dashboard', token);
  log('GET /mold/shot-count/dashboard', shotDash.status, shotDash.body?.data || shotDash.body);

  const shotHist = await get('/mold/shot-count/'+mold1Id+'/history', token);
  log('GET /mold/shot-count/:moldId/history', shotHist.status, {count:Array.isArray(shotHist.body?.data) ? shotHist.body.data.length : shotHist.body?.data});

  const adjustShot = await post('/mold/shot-count/'+mold1Id+'/adjust', {shots_to_add:1000, reason:'Manual correction after production run', adjusted_by:2}, token);
  log('POST /mold/shot-count/:moldId/adjust', adjustShot.status, adjustShot.body?.data || adjustShot.body);

  // ── MODULE 16: MOLD COST ──
  console.log('\n=== MODULE 16: MOLD COST ===');
  const addCost = await post('/mold/cost/'+mold1Id, {cost_type:'maintenance', amount:8500, date:'2026-03-18', description:'Cavity C2 repair'}, token);
  log('POST /mold/cost/:moldId', addCost.status, addCost.body?.data || addCost.body);

  const getMoldCost = await get('/mold/cost/'+mold1Id, token);
  log('GET /mold/cost/:moldId', getMoldCost.status, {count:Array.isArray(getMoldCost.body?.data) ? getMoldCost.body.data.length : getMoldCost.body?.data});

  const costDash = await get('/mold/cost/dashboard', token);
  log('GET /mold/cost/dashboard', costDash.status, costDash.body?.data || costDash.body);

  const costPerShot = await get('/mold/cost/'+mold1Id+'/cost-per-shot', token);
  log('GET /mold/cost/:moldId/cost-per-shot', costPerShot.status, costPerShot.body?.data || costPerShot.body);

  // ── MODULE 17: MOLD DOCUMENTS ──
  console.log('\n=== MODULE 17: MOLD DOCUMENTS ===');
  const histCard = await get('/mold/documents/'+mold1Id+'/history-card', token);
  log('GET /mold/documents/:moldId/history-card', histCard.status, histCard.body?.data || histCard.body);

  const statusCert = await get('/mold/documents/'+mold1Id+'/status-certificate', token);
  log('GET /mold/documents/:moldId/status-certificate', statusCert.status, statusCert.body?.data || statusCert.body);

  const docReport = await get('/mold/documents/report', token);
  log('GET /mold/documents/report', docReport.status, docReport.body?.data || docReport.body);

  // ── MODULE 18: MAINTENANCE AI ENDPOINTS ──
  console.log('\n=== MODULE 18: MAINTENANCE AI ENDPOINTS ===');
  const aiCrit = await get('/maintenance/ai/criticality-suggestion/2', token);
  log('GET /maintenance/ai/criticality-suggestion/:id', aiCrit.status, aiCrit.body?.data || aiCrit.body);

  const aiFailPat = await get('/maintenance/ai/failure-patterns', token);
  log('GET /maintenance/ai/failure-patterns', aiFailPat.status, aiFailPat.body?.data || aiFailPat.body);

  const aiPmOpt = await get('/maintenance/ai/pm-optimization', token);
  log('GET /maintenance/ai/pm-optimization', aiPmOpt.status, aiPmOpt.body?.data || aiPmOpt.body);

  const aiDtPat = await get('/maintenance/ai/downtime-patterns', token);
  log('GET /maintenance/ai/downtime-patterns', aiDtPat.status, aiDtPat.body?.data || aiDtPat.body);

  const aiSpareFcast = await get('/maintenance/ai/spare-demand-forecast', token);
  log('GET /maintenance/ai/spare-demand-forecast', aiSpareFcast.status, aiSpareFcast.body?.data || aiSpareFcast.body);

  const aiSmartSched = await get('/maintenance/ai/smart-schedule', token);
  log('GET /maintenance/ai/smart-schedule', aiSmartSched.status, aiSmartSched.body?.data || aiSmartSched.body);

  const aiAnomalies = await get('/maintenance/ai/spare-part-anomalies', token);
  log('GET /maintenance/ai/spare-part-anomalies', aiAnomalies.status, aiAnomalies.body?.data || aiAnomalies.body);

  const aiRootCause = await get('/maintenance/ai/root-cause/'+bd1Id, token);
  log('GET /maintenance/ai/root-cause/:breakdownId', aiRootCause.status, aiRootCause.body?.data || aiRootCause.body);

  console.log('\nDone. protoId='+protoId+' trialRunId='+trialRunId);
}

main().catch(console.error);
