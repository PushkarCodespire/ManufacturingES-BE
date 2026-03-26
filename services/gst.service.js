// ── India GST Service ────────────────────────────────────────────────────────
// GSTIN format: 2-digit state code + 10-char PAN + 1 entity code + Z + 1 check
const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

// Indian state codes (first 2 digits of GSTIN)
const STATE_CODES = {
  '01': 'Jammu & Kashmir', '02': 'Himachal Pradesh', '03': 'Punjab',
  '04': 'Chandigarh', '05': 'Uttarakhand', '06': 'Haryana',
  '07': 'Delhi', '08': 'Rajasthan', '09': 'Uttar Pradesh',
  '10': 'Bihar', '11': 'Sikkim', '12': 'Arunachal Pradesh',
  '13': 'Nagaland', '14': 'Manipur', '15': 'Mizoram',
  '16': 'Tripura', '17': 'Meghalaya', '18': 'Assam',
  '19': 'West Bengal', '20': 'Jharkhand', '21': 'Odisha',
  '22': 'Chhattisgarh', '23': 'Madhya Pradesh', '24': 'Gujarat',
  '26': 'Dadra & Nagar Haveli and Daman & Diu', '27': 'Maharashtra',
  '28': 'Andhra Pradesh (Old)', '29': 'Karnataka', '30': 'Goa',
  '31': 'Lakshadweep', '32': 'Kerala', '33': 'Tamil Nadu',
  '34': 'Puducherry', '35': 'Andaman & Nicobar', '36': 'Telangana',
  '37': 'Andhra Pradesh', '38': 'Ladakh',
};

/**
 * Validate GSTIN format
 * @param {string} gstin
 * @returns {{ valid: boolean, stateCode: string|null, stateName: string|null, error: string|null }}
 */
function validateGSTIN(gstin) {
  if (!gstin) return { valid: false, stateCode: null, stateName: null, error: 'GSTIN is required' };
  const upper = gstin.toUpperCase().trim();
  if (upper.length !== 15) return { valid: false, stateCode: null, stateName: null, error: 'GSTIN must be exactly 15 characters' };
  if (!GSTIN_REGEX.test(upper)) return { valid: false, stateCode: null, stateName: null, error: 'Invalid GSTIN format' };
  const stateCode = upper.substring(0, 2);
  const stateName = STATE_CODES[stateCode];
  if (!stateName) return { valid: false, stateCode, stateName: null, error: `Invalid state code: ${stateCode}` };
  return { valid: true, stateCode, stateName, error: null };
}

/**
 * Determine supply type based on seller and buyer GSTINs
 * @param {string} sellerGstin - Company GSTIN
 * @param {string} buyerGstin  - Vendor/Customer GSTIN
 * @returns {'intra'|'inter'|'unknown'}
 */
function determineSupplyType(sellerGstin, buyerGstin) {
  if (!sellerGstin || !buyerGstin) return 'unknown';
  const sellerState = sellerGstin.substring(0, 2);
  const buyerState  = buyerGstin.substring(0, 2);
  return sellerState === buyerState ? 'intra' : 'inter';
}

/**
 * Calculate GST breakdown for a single amount
 * @param {number} amount    - Base taxable amount
 * @param {number} gstRate   - GST rate in % (e.g. 18)
 * @param {'intra'|'inter'} supplyType
 * @returns {{ cgst_rate, sgst_rate, igst_rate, cgst_amount, sgst_amount, igst_amount, tax_amount, total_amount }}
 */
function calculateGST(amount, gstRate, supplyType) {
  const amt   = parseFloat(amount) || 0;
  const rate  = parseFloat(gstRate) || 0;
  const taxAmt = Math.round((amt * rate / 100) * 100) / 100;

  if (supplyType === 'inter') {
    return {
      cgst_rate: 0, sgst_rate: 0, igst_rate: rate,
      cgst_amount: 0, sgst_amount: 0, igst_amount: taxAmt,
      tax_amount: taxAmt,
      total_amount: Math.round((amt + taxAmt) * 100) / 100,
    };
  }
  // intra-state: split equally between CGST and SGST
  const halfRate = rate / 2;
  const halfTax  = Math.round((amt * halfRate / 100) * 100) / 100;
  const totalTax = halfTax * 2;
  return {
    cgst_rate: halfRate, sgst_rate: halfRate, igst_rate: 0,
    cgst_amount: halfTax, sgst_amount: halfTax, igst_amount: 0,
    tax_amount: totalTax,
    total_amount: Math.round((amt + totalTax) * 100) / 100,
  };
}

/**
 * Calculate GST for an array of line items
 * @param {Array<{amount: number, gst_rate: number}>} items
 * @param {'intra'|'inter'} supplyType
 * @returns {{ items: Array, totals: { subtotal, cgst_amount, sgst_amount, igst_amount, tax_amount, total_amount } }}
 */
function calculateLineItems(items, supplyType) {
  let subtotal = 0, totalCgst = 0, totalSgst = 0, totalIgst = 0;

  const computed = items.map((item) => {
    const lineAmount = parseFloat(item.amount) || 0;
    subtotal += lineAmount;
    const gst = calculateGST(lineAmount, item.gst_rate, supplyType);
    totalCgst += gst.cgst_amount;
    totalSgst += gst.sgst_amount;
    totalIgst += gst.igst_amount;
    return { ...item, ...gst };
  });

  const taxAmount = Math.round((totalCgst + totalSgst + totalIgst) * 100) / 100;
  return {
    items: computed,
    totals: {
      subtotal: Math.round(subtotal * 100) / 100,
      cgst_amount: Math.round(totalCgst * 100) / 100,
      sgst_amount: Math.round(totalSgst * 100) / 100,
      igst_amount: Math.round(totalIgst * 100) / 100,
      tax_amount: taxAmount,
      total_amount: Math.round((subtotal + taxAmount) * 100) / 100,
    },
  };
}

/**
 * Validate HSN code (4, 6, or 8 digit numeric)
 * @param {string} hsnCode
 * @returns {{ valid: boolean, error: string|null }}
 */
function validateHSN(hsnCode) {
  if (!hsnCode) return { valid: true, error: null }; // optional
  const trimmed = hsnCode.trim();
  if (!/^\d{4}(\d{2})?(\d{2})?$/.test(trimmed)) {
    return { valid: false, error: 'HSN must be 4, 6, or 8 digits' };
  }
  return { valid: true, error: null };
}

module.exports = { validateGSTIN, determineSupplyType, calculateGST, calculateLineItems, validateHSN, STATE_CODES };
