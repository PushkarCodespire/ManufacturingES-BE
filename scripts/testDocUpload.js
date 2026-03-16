/**
 * Quick test: upload Mold_Spec_Sheet_Test.pdf to mold ID 3
 * Run: node scripts/testDocUpload.js
 */
require('dotenv').config();
const http = require('http');
const fs   = require('fs');
const path = require('path');

const BASE    = 'localhost';
const PORT    = 5000;
const MOLD_ID = 3;
const FILE    = path.join(__dirname, '..', '..', 'Mold_Spec_Sheet_Test.pdf');

function post(reqPath, body, headers) {
  return new Promise((resolve, reject) => {
    const buf = Buffer.isBuffer(body) ? body : Buffer.from(body);
    const req = http.request(
      { hostname: BASE, port: PORT, path: reqPath, method: 'POST',
        headers: { 'Content-Length': buf.length, ...headers } },
      (res) => {
        let d = '';
        res.on('data', c => d += c);
        res.on('end', () => resolve({ status: res.statusCode, body: d }));
      }
    );
    req.on('error', reject);
    req.write(buf);
    req.end();
  });
}

(async () => {
  // 1. Login
  const loginRes = await post('/api/auth/login',
    JSON.stringify({ employee_id: 'DT10002', password: 'Dynatech@123' }),
    { 'Content-Type': 'application/json' }
  );
  const login = JSON.parse(loginRes.body);
  const TOKEN = login.token || login.data?.token;
  if (!TOKEN) { console.error('Login failed:', loginRes.body); process.exit(1); }
  console.log('✅ Login OK');

  // 2. Build multipart body
  if (!fs.existsSync(FILE)) { console.error('Test file not found:', FILE); process.exit(1); }
  const fileContent = fs.readFileSync(FILE);
  const boundary    = '----FormBoundary' + Date.now();
  const CRLF        = '\r\n';

  const body = Buffer.concat([
    Buffer.from(
      '--' + boundary + CRLF +
      'Content-Disposition: form-data; name="file"; filename="Mold_Spec_Sheet_Test.pdf"' + CRLF +
      'Content-Type: application/pdf' + CRLF + CRLF
    ),
    fileContent,
    Buffer.from(
      CRLF + '--' + boundary + CRLF +
      'Content-Disposition: form-data; name="document_type"' + CRLF + CRLF +
      'certificate' + CRLF +
      '--' + boundary + '--' + CRLF
    ),
  ]);

  // 3. Upload
  const uploadRes = await post(
    `/api/mold/masters/${MOLD_ID}/documents`,
    body,
    {
      'Authorization': `Bearer ${TOKEN}`,
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
    }
  );

  const result = JSON.parse(uploadRes.body);
  if (uploadRes.status === 201 && result.success) {
    console.log('✅ Upload OK — document ID:', result.data?.id);
    console.log('   file_name :', result.data?.file_name);
    console.log('   file_url  :', result.data?.file_url);
    console.log('   type      :', result.data?.document_type);
    console.log('\n   Access at : http://localhost:5000' + result.data?.file_url);
  } else {
    console.error('❌ Upload failed (' + uploadRes.status + '):', uploadRes.body);
    process.exit(1);
  }
})().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
