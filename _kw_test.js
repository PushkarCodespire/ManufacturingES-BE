const natural = require('natural');
const fs = require('fs');
const src = fs.readFileSync(__dirname + '/services/nlp-chatbot.service.js', 'utf8');

const kwStart = src.indexOf('const KEYWORD_RULES = [');
const kwEnd = src.indexOf('\n];', kwStart) + 3;
const kwSrc = src.slice(kwStart, kwEnd);

const nmStart = src.indexOf('function normalizeStr(');
const kmEnd = src.indexOf('\nfunction detectFollowup', nmStart);
const matchSrc = src.slice(nmStart, kmEnd);

const testSrc = kwSrc + '\n' + matchSrc + `
const tests = [
  // site_contact
  ['site ka gstin', 'site_contact'],
  ['invoice address', 'site_contact'],
  ['site email', 'site_contact'],
  ['plant ka address', 'site_contact'],
  ['shipping address', 'site_contact'],
  ['site gstin', 'site_contact'],
  // site_config
  ['machine scheduling', 'site_config'],
  ['edit lock window', 'site_config'],
  ['manual po approval', 'site_config'],
  ['production settings', 'site_config'],
  ['machine scheduling enabled', 'site_config'],
  ['production configuration', 'site_config'],
  // site_nomenclature
  ['po prefix', 'site_nomenclature'],
  ['dispatch format', 'site_nomenclature'],
  ['nomenclature', 'site_nomenclature'],
  ['document number format', 'site_nomenclature'],
  ['po year format', 'site_nomenclature'],
  // site_inventory_config
  ['rack tracking', 'site_inventory_config'],
  ['bundle tracking', 'site_inventory_config'],
  ['mrn to issue setting', 'site_inventory_config'],
  ['alternate unit', 'site_inventory_config'],
  ['site inventory config', 'site_inventory_config'],
  ['inventory tracking config', 'site_inventory_config'],
  // site_costing_config
  ['costing enabled', 'site_costing_config'],
  ['is costing on', 'site_costing_config'],
  ['site costing', 'site_costing_config'],
  ['overhead calculation', 'site_costing_config'],
  // site_maintenance_config
  ['downtime template', 'site_maintenance_config'],
  ['maintenance config', 'site_maintenance_config'],
  ['downtime format', 'site_maintenance_config'],
  // site_employees
  ['site employees', 'site_employees'],
  ['site ke employees', 'site_employees'],
  ['site assignment', 'site_employees'],
  ['site wise employees', 'site_employees'],
  ['who works at plant', 'site_employees'],
  ['site mein kaun hai', 'site_employees'],
  // sites
  ['site list', 'sites'],
  ['all plants', 'sites'],
  ['how many sites', 'sites'],
  ['active sites', 'sites'],
  ['plant locations', 'sites'],
  // shifts
  ['shift timing', 'shifts'],
  ['day shift', 'shifts'],
  ['working hours', 'shifts'],
  ['lunch break', 'shifts'],
  ['shift list', 'shifts'],
  ['night shift timing', 'shifts'],
  // warehouse_config
  ['warehouse grn prefix', 'warehouse_config'],
  ['warehouse configuration', 'warehouse_config'],
  ['year basis', 'warehouse_config'],
  ['warehouse settings', 'warehouse_config'],
  // warehouses
  ['warehouse list', 'warehouses'],
  ['godown list', 'warehouses'],
  ['raw material store', 'warehouses'],
  ['all warehouses', 'warehouses'],
  // integrations
  ['tally integration', 'integrations'],
  ['zoho connected', 'integrations'],
  ['sap status', 'integrations'],
  ['integration list', 'integrations'],
  ['tally connected', 'integrations'],
  ['is tally connected', 'integrations'],
];

let pass = 0, fail = 0;
tests.forEach(([query, expected]) => {
  const got = keywordMatch(query);
  const ok = got === expected;
  if (ok) pass++;
  else { fail++; console.log('FAIL:', JSON.stringify(query), '  got:', got, '  expected:', expected); }
});
console.log('Results:', pass + '/' + tests.length, 'pass,', fail, 'fail');
`;

try { eval(testSrc); } catch(e) { console.error('EVAL ERROR:', e.message); }
