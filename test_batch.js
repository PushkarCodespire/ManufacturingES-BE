// Batch test script for all remaining modules
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
const put = (p,b,t) => req('PUT',p,b,t);
const del = (p,t) => req('DELETE',p,null,t);

function log(label, status, body) {
  const short = JSON.stringify(body).substring(0, 200);
  const ok = status >= 200 && status < 300 ? 'OK' : 'ERR';
  console.log(`[${ok}] ${label}: ${status} ${short}`);
}

async function main() {
  // Login
  const login = await post('/auth/login', {employee_id:'DT10002', password:'Dynatech@123'});
  const token = login.body?.data?.token;
  if (!token) { console.log('LOGIN FAILED:', login.status, JSON.stringify(login.body)); return; }
  console.log('LOGIN OK');

  const mold1Id = 6, mold2Id = 7;

  // ── MOLD MASTERS (GET/PATCH/part-mappings/machine-compat) ──
  console.log('\n=== MODULE 8: MOLD MASTERS (GET/PATCH) ===');
  const allMolds = await get('/mold/masters', token);
  log('GET /mold/masters', allMolds.status, {count: allMolds.body?.data?.length});

  const oneMold = await get('/mold/masters/'+mold1Id, token);
  log('GET /mold/masters/:id', oneMold.status, oneMold.body?.data ? {id:oneMold.body.data.id, name:oneMold.body.data.name} : oneMold.body);

  const patchMold = await patch('/mold/masters/'+mold1Id, {weight_kg:86.0}, token);
  log('PATCH /mold/masters/:id', patchMold.status, patchMold.body?.data ? {id:patchMold.body.data.id} : patchMold.body);

  const partMap = await post('/mold/masters/'+mold1Id+'/part-mappings', {item_id:2, is_primary:true}, token);
  log('POST /mold/masters/:id/part-mappings', partMap.status, partMap.body?.data || partMap.body);

  const machComp = await post('/mold/masters/'+mold1Id+'/machine-compat', {machine_id:1, compatibility_status:'compatible'}, token);
  log('POST /mold/masters/:id/machine-compat', machComp.status, machComp.body?.data || machComp.body);

  // POST /mold/masters (known 500 bug)
  const moldCreate = await post('/mold/masters', {name:'Test Create', status:'registered'}, token);
  log('POST /mold/masters', moldCreate.status, moldCreate.body);

  // ── MODULE 9: MOLD CAVITIES ──
  console.log('\n=== MODULE 9: MOLD CAVITIES ===');
  const cav1 = await post('/mold/cavities/'+mold1Id+'/cavities', {cavity_number:1, status:'active'}, token);
  log('POST /mold/cavities (C1)', cav1.status, cav1.body?.data || cav1.body);
  const cav1Id = cav1.body?.data?.id;

  const cav2 = await post('/mold/cavities/'+mold1Id+'/cavities', {cavity_number:2, status:'active'}, token);
  log('POST /mold/cavities (C2)', cav2.status, cav2.body?.data || cav2.body);
  const cav2Id = cav2.body?.data?.id;

  const cav3 = await post('/mold/cavities/'+mold1Id+'/cavities', {cavity_number:3, status:'active'}, token);
  log('POST /mold/cavities (C3)', cav3.status, {id:cav3.body?.data?.id});

  const cav4 = await post('/mold/cavities/'+mold1Id+'/cavities', {cavity_number:4, status:'active'}, token);
  log('POST /mold/cavities (C4)', cav4.status, {id:cav4.body?.data?.id});

  const allCavs = await get('/mold/cavities/'+mold1Id+'/cavities', token);
  log('GET /mold/cavities', allCavs.status, {count:allCavs.body?.data?.length});

  const heatmap = await get('/mold/cavities/'+mold1Id+'/cavity-heatmap', token);
  log('GET /mold/cavities/cavity-heatmap', heatmap.status, heatmap.body?.data || heatmap.body);

  if (cav2Id) {
    const blockCav = await post('/mold/cavities/'+mold1Id+'/cavities/'+cav2Id+'/block', {block_reason:'Dimensional issue in C2'}, token);
    log('POST .../block', blockCav.status, blockCav.body?.data || blockCav.body);

    const unblockCav = await post('/mold/cavities/'+mold1Id+'/cavities/'+cav2Id+'/unblock', {notes:'Repair completed'}, token);
    log('POST .../unblock', unblockCav.status, unblockCav.body?.data || unblockCav.body);
  }

  // ── MODULE 10: MOLD LIFE CONFIG ──
  console.log('\n=== MODULE 10: MOLD LIFE CONFIG ===');
  const lifeConfig = await put('/mold/life/'+mold1Id+'/config', {warning_pct:80, critical_pct:95, auto_alert:true}, token);
  log('PUT /mold/life/:moldId/config', lifeConfig.status, lifeConfig.body?.data || lifeConfig.body);

  const lifeStatus = await get('/mold/life/'+mold1Id+'/status', token);
  log('GET /mold/life/:moldId/status', lifeStatus.status, lifeStatus.body?.data || lifeStatus.body);

  const lifeDash = await get('/mold/life/dashboard', token);
  log('GET /mold/life/dashboard', lifeDash.status, {count: Array.isArray(lifeDash.body?.data) ? lifeDash.body.data.length : lifeDash.body?.data});

  const lifeAlerts = await get('/mold/life/alerts', token);
  log('GET /mold/life/alerts', lifeAlerts.status, {count: Array.isArray(lifeAlerts.body?.data) ? lifeAlerts.body.data.length : lifeAlerts.body?.data});

  const extendLife = await post('/mold/life/'+mold1Id+'/extend', {extension_shots:50000, reason:'Mold in good condition after inspection', approved_by:2}, token);
  log('POST /mold/life/:moldId/extend', extendLife.status, extendLife.body?.data || extendLife.body);

  // ── MODULE 11: MOLD STORE ──
  console.log('\n=== MODULE 11: MOLD STORE ===');
  const loc1 = await post('/mold/store/locations', {location_code:'RACK-A-01', rack:'A', bay:'01', level:'1', capacity:2}, token);
  log('POST /mold/store/locations (1)', loc1.status, loc1.body?.data || loc1.body);
  const loc1Id = loc1.body?.data?.id;

  const loc2 = await post('/mold/store/locations', {location_code:'RACK-A-02', rack:'A', bay:'02', level:'1', capacity:2}, token);
  log('POST /mold/store/locations (2)', loc2.status, loc2.body?.data || loc2.body);

  const storeDash = await get('/mold/store/dashboard', token);
  log('GET /mold/store/dashboard', storeDash.status, storeDash.body?.data || storeDash.body);

  const rackMap = await get('/mold/store/rack-map', token);
  log('GET /mold/store/rack-map', rackMap.status, rackMap.body?.data || rackMap.body);

  if (loc1Id) {
    const setLoc = await patch('/mold/store/'+mold1Id+'/location', {location_id:loc1Id}, token);
    log('PATCH /mold/store/:moldId/location', setLoc.status, setLoc.body?.data || setLoc.body);
  }

  // ── MODULE 12: MOLD PM ──
  console.log('\n=== MODULE 12: MOLD PM ===');
  const pmTmpl = await post('/mold/pm/templates', {
    name:'Mold Monthly PM', frequency_type:'shot_count', frequency_value:50000,
    checklist:[
      {task:'Clean cooling channels', is_critical:true},
      {task:'Check parting line condition', is_critical:true},
      {task:'Lubricate ejector pins', is_critical:false}
    ]
  }, token);
  log('POST /mold/pm/templates', pmTmpl.status, pmTmpl.body?.data || pmTmpl.body);
  const pmTmplId = pmTmpl.body?.data?.id;

  const allPmTmpls = await get('/mold/pm/templates', token);
  log('GET /mold/pm/templates', allPmTmpls.status, {count:allPmTmpls.body?.data?.length});

  if (pmTmplId) {
    const pmSched = await post('/mold/pm/'+mold1Id+'/schedule', {template_id:pmTmplId, next_due_shot:50000}, token);
    log('POST /mold/pm/:moldId/schedule', pmSched.status, pmSched.body?.data || pmSched.body);
  }

  const allPmScheds = await get('/mold/pm/schedules', token);
  log('GET /mold/pm/schedules', allPmScheds.status, {count:Array.isArray(allPmScheds.body?.data) ? allPmScheds.body.data.length : allPmScheds.body?.data});

  // ── MODULE 13: MOLD REPAIR ──
  console.log('\n=== MODULE 13: MOLD REPAIR ===');
  const repType = await post('/mold/repair/types', {name:'Cavity Repair', code:'REP-CAV', description:'Cavity welding and rework'}, token);
  log('POST /mold/repair/types', repType.status, repType.body?.data || repType.body);
  const repTypeId = repType.body?.data?.id;

  const allRepTypes = await get('/mold/repair/types', token);
  log('GET /mold/repair/types', allRepTypes.status, {count:allRepTypes.body?.data?.length});

  let repReqId;
  if (repTypeId) {
    const repReq = await post('/mold/repair/'+mold1Id+'/request', {repair_type_id:repTypeId, description:'Cavity C2 shows wear marks', priority:'high', requested_by:2}, token);
    log('POST /mold/repair/:moldId/request', repReq.status, repReq.body?.data || repReq.body);
    repReqId = repReq.body?.data?.id;
  }

  const allRepReqs = await get('/mold/repair/requests', token);
  log('GET /mold/repair/requests', allRepReqs.status, {count:allRepReqs.body?.data?.length});

  if (repReqId) {
    const oneRepReq = await get('/mold/repair/requests/'+repReqId, token);
    log('GET /mold/repair/requests/:id', oneRepReq.status, oneRepReq.body?.data ? {id:oneRepReq.body.data.id} : oneRepReq.body);

    const approveRep = await patch('/mold/repair/requests/'+repReqId+'/approve', {approved_by:2}, token);
    log('PATCH /mold/repair/requests/:id/approve', approveRep.status, approveRep.body?.data || approveRep.body);

    const trackRep = await post('/mold/repair/requests/'+repReqId+'/track', {status:'in_progress', notes:'Welding work started', updated_by:2}, token);
    log('POST /mold/repair/requests/:id/track', trackRep.status, trackRep.body?.data || trackRep.body);

    const repCost = await post('/mold/repair/requests/'+repReqId+'/costs', {amount:8500, description:'Welding + machining charges', date:'2026-03-18'}, token);
    log('POST /mold/repair/requests/:id/costs', repCost.status, repCost.body?.data || repCost.body);

    const completeRep = await patch('/mold/repair/requests/'+repReqId+'/complete', {completion_date:'2026-03-20', completion_notes:'Cavity repaired and verified'}, token);
    log('PATCH /mold/repair/requests/:id/complete', completeRep.status, completeRep.body?.data || completeRep.body);
  }

  console.log('\nIDs: cav1Id='+cav1Id+' cav2Id='+cav2Id+' loc1Id='+loc1Id+' pmTmplId='+pmTmplId+' repTypeId='+repTypeId+' repReqId='+repReqId);
}

main().catch(console.error);
