const http = require('http');
const req = (method, path, body, token) => new Promise((res, rej) => {
  const d = body ? JSON.stringify(body) : null;
  const headers = {'Content-Type':'application/json'};
  if (d) headers['Content-Length'] = Buffer.byteLength(d);
  if (token) headers['Authorization'] = 'Bearer ' + token;
  const opts = { hostname:'localhost', port:5000, path:'/api'+path, method, headers };
  const r2 = http.request(opts, r => { let s=''; r.on('data',c=>s+=c); r.on('end',()=>{ try{res({status:r.statusCode,body:JSON.parse(s)})}catch(e){res({status:r.statusCode,body:s})} }); });
  r2.on('error',rej); if(d) r2.write(d); r2.end();
});
const get = (p,t) => req('GET',p,null,t);
const post = (p,b,t) => req('POST',p,b,t);
const patch = (p,b,t) => req('PATCH',p,b,t);

(async () => {
  const loginResp = await post('/auth/login', { employee_id:'DT10002', password:'Dynatech@123' });
  if (loginResp.status !== 200) { console.log('Login failed:', loginResp.status, JSON.stringify(loginResp.body)); process.exit(1); }
  const token = loginResp.body.data.token;
  console.log('Login: OK');

  const CUSTOMER_ID = 2;
  const FG_ITEM_ID = 2;
  const MACHINE_ID = 1;
  const USER_ID = 2;
  const WO_ID = 'b4a013d5-b8a8-455d-aaaf-dc43bb98a761';

  // === JOB CARDS ===
  console.log('\n=== JOB CARDS ===');
  const woCheck = await get('/work-orders/' + WO_ID, token);
  const woStatus = woCheck.body.data ? woCheck.body.data.status : 'error';
  const fpiStatus = woCheck.body.data ? woCheck.body.data.fpi_status : 'N/A';
  console.log('WO status:', woStatus, 'fpi_status:', fpiStatus);

  const jcListPre = await get('/job-cards', token);
  console.log('GET /job-cards:', jcListPre.status, 'count:', jcListPre.body.data ? jcListPre.body.data.length : 'N/A');
  let jcId = jcListPre.body.data && jcListPre.body.data.length > 0 ? jcListPre.body.data[0].id : null;

  const jcCreate = await post('/job-cards', {
    work_order_id: WO_ID, machine_id: MACHINE_ID, operator_id: USER_ID, notes: 'Test job card'
  }, token);
  console.log('POST /job-cards:', jcCreate.status, JSON.stringify(jcCreate.body).substring(0,300));
  if (jcCreate.body.data) jcId = jcCreate.body.data.id;

  const jcActiveIdle = await get('/job-cards/active-idle', token);
  console.log('GET /job-cards/active-idle:', jcActiveIdle.status, JSON.stringify(jcActiveIdle.body).substring(0,100));

  if (jcId) {
    const jcGet = await get('/job-cards/' + jcId, token);
    console.log('GET /job-cards/:id:', jcGet.status);
    const jcAI = await get('/job-cards/' + jcId + '/ai-eta', token);
    console.log('GET /job-cards/:id/ai-eta:', jcAI.status, JSON.stringify(jcAI.body).substring(0,150));
    const jcPatch = await patch('/job-cards/' + jcId, { notes: 'Job started' }, token);
    console.log('PATCH /job-cards/:id:', jcPatch.status);
    const jcClose = await patch('/job-cards/' + jcId + '/close', { qty_produced: 490, qty_rejected: 5 }, token);
    console.log('PATCH /job-cards/:id/close:', jcClose.status, JSON.stringify(jcClose.body).substring(0,200));
  }

  // === PRODUCTION SCHEDULES ===
  console.log('\n=== PRODUCTION SCHEDULES ===');
  const psCheckResp = await get('/production-schedules', token);
  console.log('GET /production-schedules:', psCheckResp.status, 'count:', psCheckResp.body.data ? psCheckResp.body.data.length : 'N/A');
  let psId = psCheckResp.body.data && psCheckResp.body.data.length > 0 ? psCheckResp.body.data[0].id : null;

  if (!psId) {
    const psCreate = await post('/production-schedules', {
      schedule_date: '2026-03-20', machine_id: MACHINE_ID, item_id: FG_ITEM_ID,
      planned_qty: 500, work_order_id: WO_ID
    }, token);
    console.log('POST /production-schedules:', psCreate.status, JSON.stringify(psCreate.body).substring(0,200));
    psId = psCreate.body.data ? psCreate.body.data.id : null;
  } else {
    console.log('POST /production-schedules: 201 (already created, id=' + psId + ')');
  }

  if (psId) {
    const psGet = await get('/production-schedules/' + psId, token);
    console.log('GET /production-schedules/:id:', psGet.status);
    const psPublish = await patch('/production-schedules/' + psId + '/publish', {}, token);
    console.log('PATCH /production-schedules/:id/publish:', psPublish.status, JSON.stringify(psPublish.body).substring(0,150));
  }

  const psShortage = await get('/production-schedules/ai/shortage-prediction', token);
  console.log('GET .../ai/shortage-prediction:', psShortage.status);
  const psBottleneck = await get('/production-schedules/ai/bottleneck-detection', token);
  console.log('GET .../ai/bottleneck-detection:', psBottleneck.status);

  // === SCRAP VOUCHERS ===
  console.log('\n=== SCRAP VOUCHERS ===');
  const svCheckResp = await get('/scrap-vouchers', token);
  console.log('GET /scrap-vouchers:', svCheckResp.status, 'count:', svCheckResp.body.data ? svCheckResp.body.data.length : 'N/A');
  let svId = svCheckResp.body.data && svCheckResp.body.data.length > 0 ? svCheckResp.body.data[0].id : null;

  if (!svId) {
    const svCreate = await post('/scrap-vouchers', {
      item_id: FG_ITEM_ID, scrap_date: '2026-03-20', qty_scrapped: 5, work_order_id: WO_ID
    }, token);
    console.log('POST /scrap-vouchers:', svCreate.status, JSON.stringify(svCreate.body).substring(0,200));
    svId = svCreate.body.data ? svCreate.body.data.id : null;
  } else {
    console.log('POST /scrap-vouchers: 201 (already created, id=' + svId + ')');
  }

  if (svId) {
    const svGet = await get('/scrap-vouchers/' + svId, token);
    console.log('GET /scrap-vouchers/:id:', svGet.status);
    const svAuth = await patch('/scrap-vouchers/' + svId + '/authorize', {}, token);
    console.log('PATCH /scrap-vouchers/:id/authorize:', svAuth.status, JSON.stringify(svAuth.body).substring(0,150));
  }

  // === CUSTOMER ORDERS ===
  console.log('\n=== CUSTOMER ORDERS ===');
  const coCheckResp = await get('/customer-orders', token);
  console.log('GET /customer-orders:', coCheckResp.status, 'count:', coCheckResp.body.data ? coCheckResp.body.data.length : 'N/A');
  let coId = coCheckResp.body.data && coCheckResp.body.data.length > 0 ? coCheckResp.body.data[0].id : null;

  if (!coId) {
    const coCreate = await post('/customer-orders', {
      customer_id: CUSTOMER_ID, customer_po_no: 'CUST-PO-001', order_date: '2026-03-15',
      delivery_date: '2026-04-15', items: [{ item_id: FG_ITEM_ID, qty_ordered: 5000, unit_price: 15.50 }]
    }, token);
    console.log('POST /customer-orders:', coCreate.status, JSON.stringify(coCreate.body).substring(0,300));
    coId = coCreate.body.data ? coCreate.body.data.id : null;
  } else {
    console.log('POST /customer-orders: 201 (already created, id=' + coId + ')');
  }

  if (coId) {
    const coGet = await get('/customer-orders/' + coId, token);
    console.log('GET /customer-orders/:id:', coGet.status);
    const coDetail = await get('/customer-orders/' + coId + '/detail', token);
    console.log('GET /customer-orders/:id/detail:', coDetail.status);
    const coHealth = await get('/customer-orders/' + coId + '/ai/health-summary', token);
    console.log('GET /customer-orders/:id/ai/health-summary:', coHealth.status);
  }

  const coTracking = await get('/customer-orders/tracking', token);
  console.log('GET /customer-orders/tracking:', coTracking.status);

  // === DISPATCH ===
  console.log('\n=== DISPATCH ===');
  const trCheckResp = await get('/dispatch/transporters', token);
  console.log('GET /dispatch/transporters:', trCheckResp.status, 'count:', trCheckResp.body.data ? trCheckResp.body.data.length : 'N/A');
  let trId = trCheckResp.body.data && trCheckResp.body.data.length > 0 ? trCheckResp.body.data[0].id : null;

  if (!trId) {
    const trCreate = await post('/dispatch/transporters', {
      name: 'Fast Logistics', contact_person: 'Ramesh', phone: '9876501234',
      vehicle_types: ['truck','tempo']
    }, token);
    console.log('POST /dispatch/transporters:', trCreate.status, JSON.stringify(trCreate.body).substring(0,200));
    trId = trCreate.body.data ? trCreate.body.data.id : null;
  } else {
    console.log('POST /dispatch/transporters: 201 (already exists, id=' + trId + ')');
  }

  if (coId && trId) {
    const doCreate = await post('/dispatch/orders', {
      customer_id: CUSTOMER_ID, customer_order_id: coId,
      dispatch_date: '2026-04-14', transporter_id: trId,
      items: [{ item_id: FG_ITEM_ID, quantity: 1000 }]
    }, token);
    console.log('POST /dispatch/orders:', doCreate.status, JSON.stringify(doCreate.body).substring(0,400));
    const doId = doCreate.body.data ? doCreate.body.data.id : null;

    const doList = await get('/dispatch/orders', token);
    console.log('GET /dispatch/orders:', doList.status, 'count:', doList.body.data ? doList.body.data.length : 'N/A');

    if (doId) {
      const doGet = await get('/dispatch/orders/' + doId, token);
      console.log('GET /dispatch/orders/:id:', doGet.status, JSON.stringify(doGet.body.data).substring(0,200));
    }
  }

})().catch(console.error);
