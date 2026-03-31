'use strict';

/**
 * tally-connector.service.js
 *
 * Core service for Tally ERP XML API integration.
 * Handles XML building, HTTP transport, response parsing, and mock mode.
 *
 * Tally uses an XML-over-HTTP API (default port 9000).
 * - Push: POST XML vouchers to import data into Tally
 * - Pull: POST XML queries to export data from Tally
 */

const axios        = require('axios');
const { XMLParser, XMLBuilder } = require('fast-xml-parser');
const { Integration }           = require('../models');

// ── XML parser/builder options ──────────────────────────────────────────────
const parserOpts = {
  ignoreAttributes:    false,
  attributeNamePrefix: '@_',
  textNodeName:        '#text',
  trimValues:          true,
};

const builderOpts = {
  ignoreAttributes:    false,
  attributeNamePrefix: '@_',
  textNodeName:        '#text',
  format:              true,
  indentBy:            '  ',
  suppressEmptyNode:   true,
};

const xmlParser  = new XMLParser(parserOpts);
const xmlBuilder = new XMLBuilder(builderOpts);

// ── Voucher type mapping ────────────────────────────────────────────────────
const VOUCHER_TYPE_MAP = {
  supplier_po:   'Purchase Order',
  grn:           'Receipt Note',
  sales_invoice: 'Sales',
  debit_credit:  null, // determined per-record: 'Debit Note' or 'Credit Note'
  payment:       null, // determined per-record: 'Payment' or 'Receipt'
};

// ── Config ──────────────────────────────────────────────────────────────────

/**
 * Read Tally integration config from the Integration model.
 * Returns null if not found or not enabled.
 */
async function getTallyConfig() {
  const row = await Integration.findOne({ where: { slug: 'tally' } });
  if (!row) return null;

  const cfg = row.config || {};
  return {
    is_enabled:    row.is_enabled,
    host:          cfg.host || '127.0.0.1',
    port:          cfg.port || 9000,
    company_name:  cfg.company_name || '',
    tally_version: cfg.tally_version || 'prime_2',
    gstin:         cfg.gstin || '',
    financial_year: cfg.financial_year || '',
    mock_mode:     cfg.mock_mode === true || cfg.mock_mode === 'true',
    sync_direction: cfg.sync_direction || 'both',
    integration_id: row.id,
  };
}

// ── HTTP Transport ──────────────────────────────────────────────────────────

/**
 * POST raw XML to Tally's HTTP endpoint.
 * Returns { success, data, error }.
 */
async function postToTally(config, xmlBody) {
  const url = `http://${config.host}:${config.port}`;

  try {
    const res = await axios.post(url, xmlBody, {
      headers: { 'Content-Type': 'text/xml; charset=utf-8' },
      timeout: 30000,
      responseType: 'text',
    });
    return { success: true, data: res.data };
  } catch (err) {
    let message = err.message;
    if (err.code === 'ECONNREFUSED')  message = `Tally server unreachable at ${url}`;
    if (err.code === 'ETIMEDOUT')     message = `Connection to Tally timed out (${url})`;
    if (err.code === 'ENOTFOUND')     message = `Host not found: ${config.host}`;
    if (err.response)                 message = `Tally returned HTTP ${err.response.status}`;
    return { success: false, data: null, error: message };
  }
}

// ── Response parsing ────────────────────────────────────────────────────────

/**
 * Parse Tally's XML response into a structured result.
 * Tally import responses look like:
 *   <RESPONSE><CREATED>1</CREATED><ALTERED>0</ALTERED>...</RESPONSE>
 * On error: <LINEERROR>...</LINEERROR>
 */
function parseImportResponse(xmlString) {
  try {
    const parsed = xmlParser.parse(xmlString);
    const resp   = parsed?.RESPONSE || parsed?.ENVELOPE?.BODY?.DATA?.IMPORTRESULT || {};

    const created  = parseInt(resp.CREATED  || '0', 10);
    const altered  = parseInt(resp.ALTERED  || '0', 10);
    const deleted  = parseInt(resp.DELETED  || '0', 10);
    const lastvch  = parseInt(resp.LASTVCHID || '0', 10);

    // Collect errors
    const errors = [];
    if (resp.LINEERROR) {
      const lineErrors = Array.isArray(resp.LINEERROR) ? resp.LINEERROR : [resp.LINEERROR];
      errors.push(...lineErrors);
    }
    if (resp.ERRORS) {
      const errs = Array.isArray(resp.ERRORS) ? resp.ERRORS : [resp.ERRORS];
      errors.push(...errs);
    }

    const success = (created + altered) > 0 && errors.length === 0;
    return { success, created, altered, deleted, lastvch, errors, raw: xmlString };
  } catch (e) {
    return { success: false, created: 0, altered: 0, deleted: 0, lastvch: 0, errors: [`XML parse error: ${e.message}`], raw: xmlString };
  }
}

/**
 * Parse Tally's export (pull) response — returns array of voucher objects.
 */
function parseExportResponse(xmlString) {
  try {
    const parsed  = xmlParser.parse(xmlString);
    const body    = parsed?.ENVELOPE?.BODY;
    const data    = body?.DATA || body?.DESC || {};

    // Tally wraps collection results in TALLYMESSAGE
    let vouchers = data?.TALLYMESSAGE?.VOUCHER || data?.COLLECTION?.VOUCHER || [];
    if (!Array.isArray(vouchers)) vouchers = vouchers ? [vouchers] : [];

    return { success: true, vouchers, raw: xmlString };
  } catch (e) {
    return { success: false, vouchers: [], error: `XML parse error: ${e.message}`, raw: xmlString };
  }
}

// ── XML Builders ────────────────────────────────────────────────────────────

/**
 * Build the XML envelope for importing a single voucher into Tally.
 */
function buildVoucherXml(syncType, record, config) {
  const companyName = config.company_name;
  const voucherType = getVoucherType(syncType, record);

  const voucher = buildVoucherBody(syncType, record, voucherType);

  const envelope = {
    ENVELOPE: {
      HEADER: {
        TALLYREQUEST: 'Import Data',
      },
      BODY: {
        IMPORTDATA: {
          REQUESTDESC: {
            REPORTNAME: 'Vouchers',
            STATICVARIABLES: {
              SVCURRENTCOMPANY: companyName,
            },
          },
          REQUESTDATA: {
            TALLYMESSAGE: {
              '@_xmlns:UDF': 'TallyUDF',
              VOUCHER: {
                '@_VCHTYPE':  voucherType,
                '@_ACTION':   'Create',
                '@_OBJVIEW':  'Accounting Voucher',
                ...voucher,
              },
            },
          },
        },
      },
    },
  };

  return xmlBuilder.build(envelope);
}

/**
 * Determine the Tally voucher type for a record.
 */
function getVoucherType(syncType, record) {
  if (syncType === 'debit_credit') {
    return record.type === 'debit' ? 'Debit Note' : 'Credit Note';
  }
  if (syncType === 'payment') {
    return record.type === 'payable' ? 'Payment' : 'Receipt';
  }
  return VOUCHER_TYPE_MAP[syncType];
}

/**
 * Build voucher body fields based on sync type.
 */
function buildVoucherBody(syncType, record, voucherType) {
  const base = {
    DATE:              formatTallyDate(record.order_date || record.received_date || record.invoice_date || record.note_date || record.payment_date),
    VOUCHERTYPENAME:   voucherType,
    VOUCHERNUMBER:     record.po_no || record.grn_no || record.invoice_no || record.note_no || record.payment_no,
    NARRATION:         record.notes || record.reason || '',
  };

  switch (syncType) {
    case 'supplier_po':
      return {
        ...base,
        PARTYLEDGERNAME: record.Vendor?.name || 'Unknown Vendor',
        BASICBUYERADDRESS: record.Vendor?.address || '',
        EWAYBILLNO:     record.e_way_bill_no || '',
        'ALLLEDGERENTRIES.LIST': buildPOLedgerEntries(record),
      };

    case 'grn':
      return {
        ...base,
        PARTYLEDGERNAME: record.Vendor?.name || 'Unknown Vendor',
        EWAYBILLNO:      record.e_way_bill_no || '',
        'ALLINVENTORYENTRIES.LIST': buildGrnInventoryEntries(record),
        'ALLLEDGERENTRIES.LIST':    buildGrnLedgerEntries(record),
      };

    case 'sales_invoice':
      return {
        ...base,
        PARTYLEDGERNAME:    record.Customer?.name || 'Unknown Customer',
        BASICBUYERADDRESS:  record.Customer?.address || '',
        EWAYBILLNO:         record.e_way_bill_no || '',
        'ALLLEDGERENTRIES.LIST': buildSalesLedgerEntries(record),
      };

    case 'debit_credit':
      return {
        ...base,
        PARTYLEDGERNAME: (record.type === 'debit' ? record.Vendor?.name : record.Customer?.name) || 'Unknown Party',
        'ALLLEDGERENTRIES.LIST': buildDCNLedgerEntries(record),
      };

    case 'payment':
      return {
        ...base,
        PARTYLEDGERNAME: (record.type === 'payable' ? record.Vendor?.name : record.Customer?.name) || 'Unknown Party',
        'ALLLEDGERENTRIES.LIST': buildPaymentLedgerEntries(record),
      };

    default:
      return base;
  }
}

// ── Ledger entry builders ───────────────────────────────────────────────────

function buildPOLedgerEntries(record) {
  const entries = [];
  const items = record.Items || [];

  // Line items — each as a ledger entry under "Purchase" ledger
  items.forEach(item => {
    entries.push({
      LEDGERNAME:    'Purchase Accounts',
      ISDEEMEDPOSITIVE: 'Yes',
      AMOUNT:        -(item.total_price || item.qty_ordered * item.unit_price || 0),
    });
  });

  // Tax entries
  addGstEntries(entries, record);

  // Party ledger (credit side)
  entries.push({
    LEDGERNAME:       record.Vendor?.name || 'Sundry Creditors',
    ISDEEMEDPOSITIVE: 'No',
    AMOUNT:           record.total_amount || 0,
  });

  return entries;
}

function buildGrnInventoryEntries(record) {
  const items = record.Items || [];
  return items.map(item => ({
    STOCKITEMNAME: item.Item?.name || item.description || 'Unknown Item',
    ISDEEMEDPOSITIVE: 'Yes',
    RATE:           `${item.unit_price || 0}/${item.unit || 'pcs'}`,
    AMOUNT:         -(item.total_price || item.qty_received * (item.unit_price || 0)),
    ACTUALQTY:      `${item.qty_received} ${item.unit || 'pcs'}`,
    BILLEDQTY:      `${item.qty_received} ${item.unit || 'pcs'}`,
  }));
}

function buildGrnLedgerEntries(record) {
  const entries = [];
  const items   = record.Items || [];
  const total   = items.reduce((s, i) => s + (i.total_price || i.qty_received * (i.unit_price || 0)), 0);

  entries.push({
    LEDGERNAME:       record.Vendor?.name || 'Sundry Creditors',
    ISDEEMEDPOSITIVE: 'No',
    AMOUNT:           total,
  });

  return entries;
}

function buildSalesLedgerEntries(record) {
  const entries = [];

  // Sales account (credit)
  entries.push({
    LEDGERNAME:       'Sales Accounts',
    ISDEEMEDPOSITIVE: 'No',
    AMOUNT:           record.subtotal || 0,
  });

  // Tax entries
  addGstEntries(entries, record);

  // Customer (debit)
  entries.push({
    LEDGERNAME:       record.Customer?.name || 'Sundry Debtors',
    ISDEEMEDPOSITIVE: 'Yes',
    AMOUNT:           -(record.total_amount || 0),
  });

  return entries;
}

function buildDCNLedgerEntries(record) {
  const entries  = [];
  const isDebit  = record.type === 'debit';
  const partyName = isDebit
    ? (record.Vendor?.name  || 'Sundry Creditors')
    : (record.Customer?.name || 'Sundry Debtors');

  // Party entry
  entries.push({
    LEDGERNAME:       partyName,
    ISDEEMEDPOSITIVE: isDebit ? 'Yes' : 'No',
    AMOUNT:           isDebit ? -(record.total_amount || 0) : (record.total_amount || 0),
  });

  // Return account
  entries.push({
    LEDGERNAME:       isDebit ? 'Purchase Returns' : 'Sales Returns',
    ISDEEMEDPOSITIVE: isDebit ? 'No' : 'Yes',
    AMOUNT:           isDebit ? (record.amount || 0) : -(record.amount || 0),
  });

  // Tax
  addGstEntries(entries, record, isDebit);

  return entries;
}

function buildPaymentLedgerEntries(record) {
  const entries   = [];
  const isPayable = record.type === 'payable';
  const partyName = isPayable
    ? (record.Vendor?.name   || 'Sundry Creditors')
    : (record.Customer?.name || 'Sundry Debtors');

  // Bank / Cash
  const bankLedger = record.payment_mode === 'cash' ? 'Cash' : 'Bank Accounts';
  entries.push({
    LEDGERNAME:       bankLedger,
    ISDEEMEDPOSITIVE: isPayable ? 'No' : 'Yes',
    AMOUNT:           isPayable ? (record.amount || 0) : -(record.amount || 0),
  });

  // Party
  entries.push({
    LEDGERNAME:       partyName,
    ISDEEMEDPOSITIVE: isPayable ? 'Yes' : 'No',
    AMOUNT:           isPayable ? -(record.amount || 0) : (record.amount || 0),
  });

  return entries;
}

/**
 * Add CGST / SGST / IGST ledger entries.
 */
function addGstEntries(entries, record, reverseSign = false) {
  const sign = reverseSign ? -1 : 1;

  if (record.cgst_amount > 0) {
    entries.push({
      LEDGERNAME:       'Input CGST',
      ISDEEMEDPOSITIVE: 'Yes',
      AMOUNT:           -(record.cgst_amount * sign),
    });
  }
  if (record.sgst_amount > 0) {
    entries.push({
      LEDGERNAME:       'Input SGST',
      ISDEEMEDPOSITIVE: 'Yes',
      AMOUNT:           -(record.sgst_amount * sign),
    });
  }
  if (record.igst_amount > 0) {
    entries.push({
      LEDGERNAME:       'Input IGST',
      ISDEEMEDPOSITIVE: 'Yes',
      AMOUNT:           -(record.igst_amount * sign),
    });
  }
}

/**
 * Build XML for querying payment vouchers from Tally (pull).
 */
function buildPaymentQueryXml(config) {
  const envelope = {
    ENVELOPE: {
      HEADER: {
        TALLYREQUEST: 'Export Data',
      },
      BODY: {
        DESC: {
          STATICVARIABLES: {
            SVCURRENTCOMPANY: config.company_name,
            SVEXPORTFORMAT:   '$$SysName:XML',
          },
          TDL: {
            TDLMESSAGE: {
              REPORT: {
                '@_NAME': 'PaymentVouchers',
                FORMS:    'PaymentVoucherForm',
              },
              COLLECTION: {
                '@_NAME': 'PaymentVouchers',
                TYPE:     'Voucher',
                FILTER:   'PaymentFilter',
              },
              SYSTEM: {
                '@_TYPE': 'Formulae',
                '@_NAME': 'PaymentFilter',
                '#text':  '$VoucherTypeName = "Payment" OR $VoucherTypeName = "Receipt"',
              },
            },
          },
        },
      },
    },
  };

  return xmlBuilder.build(envelope);
}

/**
 * Build XML for testing connection — list companies.
 */
function buildListCompaniesXml() {
  const envelope = {
    ENVELOPE: {
      HEADER: {
        TALLYREQUEST: 'Export Data',
      },
      BODY: {
        DESC: {
          STATICVARIABLES: {
            SVEXPORTFORMAT: '$$SysName:XML',
          },
          TDL: {
            TDLMESSAGE: {
              REPORT: { '@_NAME': 'CompanyList', FORMS: 'CompanyListForm' },
              FORM:   { '@_NAME': 'CompanyListForm', PARTS: 'CompanyListPart' },
              PART:   { '@_NAME': 'CompanyListPart', LINES: 'CompanyListLine', REPEAT: 'CompanyListLine : CompanyCollection' },
              LINE:   { '@_NAME': 'CompanyListLine', FIELDS: 'CompanyNameField' },
              FIELD:  { '@_NAME': 'CompanyNameField', SET: '$Name' },
              COLLECTION: { '@_NAME': 'CompanyCollection', TYPE: 'Company', FETCH: 'Name' },
            },
          },
        },
      },
    },
  };
  return xmlBuilder.build(envelope);
}

// ── Mock mode ───────────────────────────────────────────────────────────────

function mockImportResponse(record) {
  // 95% success, 5% random failure for testing error paths
  const willFail = Math.random() < 0.05;
  if (willFail) {
    return {
      success: false,
      created: 0, altered: 0, deleted: 0, lastvch: 0,
      errors: [`Mock error: Ledger "${record.Vendor?.name || record.Customer?.name || 'Unknown'}" not found in Tally`],
      raw: '<RESPONSE><CREATED>0</CREATED><LINEERROR>Mock ledger not found</LINEERROR></RESPONSE>',
    };
  }
  return {
    success: true,
    created: 1, altered: 0, deleted: 0, lastvch: Math.floor(Math.random() * 99999),
    errors: [],
    raw: '<RESPONSE><CREATED>1</CREATED><ALTERED>0</ALTERED></RESPONSE>',
  };
}

function mockPullResponse() {
  return {
    success: true,
    vouchers: [
      { VOUCHERNUMBER: 'MOCK-PAY-001', VOUCHERTYPENAME: 'Payment', AMOUNT: 50000, DATE: '20260315' },
      { VOUCHERNUMBER: 'MOCK-PAY-002', VOUCHERTYPENAME: 'Receipt', AMOUNT: 125000, DATE: '20260320' },
    ],
    raw: '<MOCK>simulated payment pull</MOCK>',
  };
}

function mockTestConnection(config) {
  return {
    success: true,
    companies: [config.company_name || 'Demo Company'],
    message: `Mock mode — simulated connection to ${config.host}:${config.port}`,
  };
}

// ── High-level orchestrators ────────────────────────────────────────────────

/**
 * Push records to Tally (one voucher per HTTP request for reliable error tracking).
 * Returns array of { recordId, recordNumber, success, error }.
 */
async function pushRecords(syncType, records, config) {
  const results = [];

  for (const record of records) {
    const docNo = record.po_no || record.grn_no || record.invoice_no || record.note_no || record.payment_no;

    if (config.mock_mode) {
      const mock = mockImportResponse(record);
      results.push({
        recordId:     record.id,
        recordNumber: docNo,
        success:      mock.success,
        error:        mock.errors.join('; ') || null,
      });
      continue;
    }

    // Build and send XML
    const xml = buildVoucherXml(syncType, record, config);
    const httpResult = await postToTally(config, xml);

    if (!httpResult.success) {
      results.push({
        recordId: record.id, recordNumber: docNo,
        success: false, error: httpResult.error,
      });
      continue;
    }

    const parsed = parseImportResponse(httpResult.data);
    results.push({
      recordId:     record.id,
      recordNumber: docNo,
      success:      parsed.success,
      error:        parsed.errors.join('; ') || null,
    });
  }

  return results;
}

/**
 * Pull payment vouchers from Tally.
 * Returns { success, vouchers, error }.
 */
async function pullPayments(config) {
  if (config.mock_mode) {
    return mockPullResponse();
  }

  const xml = buildPaymentQueryXml(config);
  const httpResult = await postToTally(config, xml);

  if (!httpResult.success) {
    return { success: false, vouchers: [], error: httpResult.error };
  }

  return parseExportResponse(httpResult.data);
}

/**
 * Test connection to Tally.
 * Returns { success, companies[], message }.
 */
async function testConnection(config) {
  if (config.mock_mode) {
    return mockTestConnection(config);
  }

  const xml = buildListCompaniesXml();
  const httpResult = await postToTally(config, xml);

  if (!httpResult.success) {
    return { success: false, companies: [], message: httpResult.error };
  }

  // Parse company list
  try {
    const parsed = xmlParser.parse(httpResult.data);
    const body   = parsed?.ENVELOPE?.BODY;
    let companies = [];

    // Tally returns company names in various structures
    const data = body?.DATA || body?.DESC || {};
    if (data.COLLECTION) {
      const items = data.COLLECTION.COMPANY || data.COLLECTION;
      companies = Array.isArray(items) ? items.map(c => c.NAME || c['@_NAME'] || c) : [items];
    }

    return {
      success: true,
      companies: companies.filter(Boolean),
      message: `Connected to Tally at ${config.host}:${config.port}`,
    };
  } catch (e) {
    return { success: true, companies: [], message: `Connected but could not parse company list: ${e.message}` };
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Format a date for Tally (YYYYMMDD format).
 */
function formatTallyDate(date) {
  if (!date) return '';
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}${m}${day}`;
}

module.exports = {
  getTallyConfig,
  testConnection,
  postToTally,
  buildVoucherXml,
  buildPaymentQueryXml,
  buildListCompaniesXml,
  parseImportResponse,
  parseExportResponse,
  pushRecords,
  pullPayments,
  formatTallyDate,
};
