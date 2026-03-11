'use strict';

// ── Shared System Prompt ────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are Madad, a factory operations AI assistant for Dynatech One — a manufacturing ERP system.

Rules:
- Return ONLY valid JSON — no markdown fences, no explanation outside JSON.
- Be concise: bullet points, short phrases.
- You SUGGEST — the human DECIDES. Never imply certainty above the data.
- When asked for Hinglish, respond in Hindi + English mix written in English script.
- Use Indian manufacturing context (IATF 16949, PPM, OTD, FPY, COPQ).
- Currency is INR (₹). Weights in kg/g. Dimensions in mm.`;

// ── MGT-001: RFQ Auto-Fill ──────────────────────────────────────────────────
function rfqAutoFill(customer, pastRfqs, availableItems) {
  return {
    system: SYSTEM_PROMPT,
    user: `You are helping auto-fill a new RFQ for a customer. Based on their past RFQ history, suggest the most likely items, quantities, and notes for a new RFQ.

CUSTOMER:
${JSON.stringify(customer)}

PAST RFQs (most recent first, up to 10):
${JSON.stringify(pastRfqs)}

AVAILABLE ITEMS:
${JSON.stringify(availableItems)}

Return JSON:
{
  "suggestions": [
    {
      "item_id": <number>,
      "item_name": "<string>",
      "item_code": "<string>",
      "suggested_qty": <number>,
      "unit": "<string>",
      "confidence": "high" | "medium" | "low",
      "reason": "<short reason>"
    }
  ],
  "notes_suggestion": "<optional suggested notes for the RFQ>",
  "summary": "<1-2 line Hinglish summary of what you suggest>"
}`,
  };
}

// ── MGT-002: Price Suggestion ───────────────────────────────────────────────
function priceSuggestion(item, pastQuotations, costData) {
  return {
    system: SYSTEM_PROMPT,
    user: `Suggest a unit price for a quotation line item based on historical pricing, costs, and market context.

ITEM:
${JSON.stringify(item)}

PAST QUOTATIONS FOR THIS ITEM (recent first, up to 15):
${JSON.stringify(pastQuotations)}

COST DATA (if available):
${JSON.stringify(costData)}

Return JSON:
{
  "suggested_price": <number>,
  "price_range": { "min": <number>, "max": <number> },
  "confidence": "high" | "medium" | "low",
  "factors": [
    { "factor": "<e.g. material cost trend>", "impact": "up" | "down" | "neutral" }
  ],
  "margin_estimate_pct": <number or null>,
  "summary": "<1-line Hinglish explanation>"
}`,
  };
}

// ── MGT-003: PO PDF Extraction ──────────────────────────────────────────────
function poExtraction(existingCustomers, existingItems) {
  return {
    system: SYSTEM_PROMPT,
    user: `Extract structured data from the attached Purchase Order (PO) document. Match customer and items to existing records where possible.

EXISTING CUSTOMERS (id, name, partner_code):
${JSON.stringify(existingCustomers)}

EXISTING ITEMS (id, name, code, item_short_name):
${JSON.stringify(existingItems)}

Return JSON:
{
  "customer_po_no": "<PO number from document>",
  "order_date": "<ISO date or null>",
  "delivery_date": "<ISO date or null>",
  "matched_customer": { "id": <number or null>, "name": "<string>", "confidence": "high"|"medium"|"low" },
  "items": [
    {
      "line_no": <number>,
      "description": "<as written in PO>",
      "matched_item_id": <number or null>,
      "matched_item_name": "<string or null>",
      "qty": <number>,
      "unit": "<string>",
      "unit_price": <number or null>,
      "delivery_date": "<ISO date or null>",
      "match_confidence": "high"|"medium"|"low"
    }
  ],
  "terms": "<payment/delivery terms if found>",
  "notes": "<any other relevant info>",
  "extraction_quality": "good" | "partial" | "poor"
}`,
  };
}

// ── MGT-004: Delivery Risk ──────────────────────────────────────────────────
function deliveryRisk(orders) {
  return {
    system: SYSTEM_PROMPT,
    user: `Analyze these active customer orders and flag delivery risks. Consider: delivery date proximity, production progress, quality status, historical OTD.

ACTIVE ORDERS WITH PROGRESS DATA:
${JSON.stringify(orders)}

Return JSON:
{
  "at_risk_orders": [
    {
      "order_id": "<uuid>",
      "order_no": "<string>",
      "customer_name": "<string>",
      "delivery_date": "<ISO date>",
      "risk_level": "high" | "medium" | "low",
      "risk_reasons": ["<reason 1>", "<reason 2>"],
      "suggested_actions": ["<action 1>", "<action 2>"],
      "days_remaining": <number>
    }
  ],
  "summary": "<2-3 line Hinglish overall delivery status>"
}`,
  };
}

// ── MGT-005: Health Summary ─────────────────────────────────────────────────
function healthSummary(order) {
  return {
    system: SYSTEM_PROMPT,
    user: `Generate a brief Hinglish health summary for this customer order. Cover: order status, production progress, quality results, delivery timeline.

ORDER DATA (with linked work orders, inspections, dispatches):
${JSON.stringify(order)}

Return JSON:
{
  "health_status": "green" | "yellow" | "red",
  "summary_hinglish": "<3-5 bullet points in Hinglish, each on new line>",
  "key_metrics": {
    "fulfillment_pct": <number>,
    "quality_pass_pct": <number or null>,
    "days_to_delivery": <number or null>,
    "production_pct": <number or null>
  },
  "alerts": ["<any urgent items in Hinglish>"]
}`,
  };
}

// ── OQC-001: Priority Queue ─────────────────────────────────────────────────
function oqcPriorityQueue(pendingInspections, orderDeadlines) {
  return {
    system: SYSTEM_PROMPT,
    user: `Prioritize these pending OQC inspections based on dispatch urgency, customer importance, and production status.

PENDING OQC INSPECTIONS:
${JSON.stringify(pendingInspections)}

ORDER DEADLINES & DISPATCH INFO:
${JSON.stringify(orderDeadlines)}

Return JSON:
{
  "prioritized": [
    {
      "inspection_id": <number>,
      "inspection_no": "<string>",
      "item_name": "<string>",
      "priority": "urgent" | "high" | "normal" | "low",
      "priority_reason": "<short reason>",
      "dispatch_date": "<ISO date or null>",
      "days_until_dispatch": <number or null>
    }
  ],
  "summary": "<1-2 line Hinglish summary>"
}`,
  };
}

// ── OQC-002: IQC Comparison ─────────────────────────────────────────────────
function iqcComparison(oqcData, iqcData) {
  return {
    system: SYSTEM_PROMPT,
    user: `Compare this OQC inspection with the original IQC inspection for the same item/batch. Identify any degradation or improvement during production.

OQC INSPECTION (outgoing):
${JSON.stringify(oqcData)}

IQC INSPECTION (incoming, same item):
${JSON.stringify(iqcData)}

Return JSON:
{
  "comparison": [
    {
      "parameter": "<parameter name>",
      "iqc_value": "<string>",
      "oqc_value": "<string>",
      "status": "improved" | "same" | "degraded" | "na",
      "note": "<short observation>"
    }
  ],
  "overall_assessment": "good" | "acceptable" | "concerning",
  "degradation_areas": ["<area 1>"],
  "summary_hinglish": "<2-3 bullet points in Hinglish>"
}`,
  };
}

// ── OQC-004: Standards Detection ────────────────────────────────────────────
function standardsDetection(item, inspectionParams) {
  return {
    system: SYSTEM_PROMPT,
    user: `Based on the item details and inspection parameters, suggest applicable QMS standards (IATF 16949, ISO, ASTM, BIS, etc.) and which parameters should be checked.

ITEM:
${JSON.stringify(item)}

CURRENT INSPECTION PARAMETERS:
${JSON.stringify(inspectionParams)}

Return JSON:
{
  "suggested_standards": [
    {
      "standard": "<e.g. IATF 16949, ISO 2768, ASTM E18>",
      "clause": "<specific clause or section if applicable>",
      "relevance": "high" | "medium" | "low",
      "reason": "<why this standard applies>"
    }
  ],
  "missing_parameters": [
    {
      "parameter_name": "<suggested parameter>",
      "standard": "<which standard requires it>",
      "specification": "<suggested spec value>"
    }
  ],
  "summary": "<1-line Hinglish summary>"
}`,
  };
}

// ── PQC-001: Defect Patterns ────────────────────────────────────────────────
function defectPatterns(inspections) {
  return {
    system: SYSTEM_PROMPT,
    user: `Analyze these PQC inspection results and identify defect patterns. Provide Pareto analysis and root cause suggestions.

PQC INSPECTIONS (recent, with results):
${JSON.stringify(inspections)}

Return JSON:
{
  "pareto": [
    {
      "defect_type": "<parameter_name that failed>",
      "count": <number>,
      "percentage": <number>,
      "cumulative_pct": <number>,
      "affected_items": ["<item names>"]
    }
  ],
  "root_cause_suggestions": [
    {
      "defect_type": "<parameter name>",
      "possible_causes": ["<cause 1>", "<cause 2>"],
      "suggested_actions": ["<action 1>", "<action 2>"]
    }
  ],
  "trend": "improving" | "stable" | "worsening",
  "summary_hinglish": "<3-4 bullet points in Hinglish with key findings>"
}`,
  };
}

// ── IQC-001: Cascade Suggestion ───────────────────────────────────────────
function iqcCascadeSuggestion(inspection, vendorHistory, itemHistory) {
  return {
    system: SYSTEM_PROMPT,
    user: `An IQC inspection has FAILED. Suggest what corrective actions to take: full cascade (NCR + SCAR + CAPA + quarantine) or partial, severity level, urgency.

FAILED INSPECTION:
${JSON.stringify(inspection)}

VENDOR HISTORY (recent IQC results for same vendor):
${JSON.stringify(vendorHistory)}

ITEM HISTORY (recent IQC results for same item):
${JSON.stringify(itemHistory)}

Return JSON:
{
  "recommended_actions": {
    "create_ncr": true | false,
    "ncr_severity": "critical" | "major" | "minor",
    "create_scar": true | false,
    "scar_urgency": "immediate" | "standard",
    "create_capa": true | false,
    "quarantine_stock": true | false
  },
  "cascade_level": "full" | "partial" | "minimal",
  "reasoning": ["<reason 1>", "<reason 2>"],
  "vendor_risk_level": "high" | "medium" | "low",
  "repeat_offender": true | false,
  "suggested_response_days": <number>,
  "summary_hinglish": "<2-3 bullet points in Hinglish>"
}`,
  };
}

// ── IQC-002: Disposition Recommendation ───────────────────────────────────
function iqcDispositionRecommendation(inspection, results, pastDispositions) {
  return {
    system: SYSTEM_PROMPT,
    user: `Based on IQC inspection results, recommend a disposition for the inspected material.

INSPECTION:
${JSON.stringify(inspection)}

INSPECTION RESULTS (parameter-level):
${JSON.stringify(results)}

PAST DISPOSITIONS (same item/vendor, recent):
${JSON.stringify(pastDispositions)}

Return JSON:
{
  "recommended_disposition": "accepted" | "use_as_is" | "rework" | "scrap" | "return_to_supplier",
  "confidence": "high" | "medium" | "low",
  "reasoning": ["<reason 1>", "<reason 2>"],
  "failed_parameters_count": <number>,
  "critical_failures": ["<parameter names that are safety/functional critical>"],
  "alternative_disposition": "<next best option if primary is rejected>",
  "cost_impact": "high" | "medium" | "low" | "unknown",
  "summary_hinglish": "<2-3 bullet points in Hinglish>"
}`,
  };
}

// ── STR-001: Stock Level Prediction ───────────────────────────────────────
function stockLevelPrediction(item, txnHistory, upcomingOrders) {
  return {
    system: SYSTEM_PROMPT,
    user: `Predict when this item will hit its reorder point based on consumption patterns and upcoming demand.

ITEM (with current stock and reorder point):
${JSON.stringify(item)}

TRANSACTION HISTORY (last 90 days, issue_out and grn_in):
${JSON.stringify(txnHistory)}

UPCOMING CUSTOMER ORDERS (requiring this item):
${JSON.stringify(upcomingOrders)}

Return JSON:
{
  "current_stock": <number>,
  "reorder_point": <number>,
  "avg_daily_consumption": <number>,
  "consumption_trend": "increasing" | "stable" | "decreasing",
  "days_until_reorder": <number or null>,
  "estimated_reorder_date": "<ISO date or null>",
  "suggested_order_qty": <number>,
  "suggested_order_date": "<ISO date — when to place order to avoid stockout>",
  "risk_level": "high" | "medium" | "low",
  "upcoming_demand_qty": <number>,
  "summary_hinglish": "<2-3 bullet points in Hinglish>"
}`,
  };
}

// ── PRD-001: Production Shortage Alert ───────────────────────────────────
function productionShortageAlert(schedules, inventory, boms) {
  return {
    system: SYSTEM_PROMPT,
    user: `Predict material shortages based on upcoming production schedules vs current inventory. Consider BOM explosion — each scheduled item requires raw materials per its BOM.

UPCOMING PRODUCTION SCHEDULES (next 30 days):
${JSON.stringify(schedules)}

CURRENT INVENTORY (raw materials on hand):
${JSON.stringify(inventory)}

BOMs (Bill of Materials for scheduled items):
${JSON.stringify(boms)}

Return JSON:
{
  "at_risk_items": [
    {
      "item_id": <number>,
      "item_name": "<string>",
      "item_code": "<string>",
      "current_stock": <number>,
      "required_qty": <number>,
      "deficit": <number>,
      "days_until_shortage": <number or null>,
      "affected_work_orders": ["<wo_no>"],
      "urgency": "critical" | "warning" | "watch"
    }
  ],
  "summary": {
    "total_at_risk": <number>,
    "critical_count": <number>,
    "earliest_shortage_date": "<ISO date or null>"
  },
  "recommended_actions": [
    {
      "action": "<e.g. Place urgent PO for Item X>",
      "priority": "high" | "medium" | "low",
      "item_code": "<string>"
    }
  ],
  "summary_hinglish": "<3-4 bullet points in Hinglish>"
}`,
  };
}

// ── PRD-002: Production Bottleneck Detection ─────────────────────────────
function productionBottleneckDetection(schedules, machineCapacity, workOrders) {
  return {
    system: SYSTEM_PROMPT,
    user: `Detect production bottlenecks by comparing scheduled machine load vs available capacity. Identify overloaded machines and suggest rescheduling.

PRODUCTION SCHEDULES (grouped by machine & date):
${JSON.stringify(schedules)}

MACHINE CAPACITY (shifts per day, hours per shift):
${JSON.stringify(machineCapacity)}

ACTIVE WORK ORDERS (with priority and deadlines):
${JSON.stringify(workOrders)}

Return JSON:
{
  "bottlenecks": [
    {
      "machine_id": <number>,
      "machine_name": "<string>",
      "date": "<ISO date>",
      "scheduled_hours": <number>,
      "available_hours": <number>,
      "overload_pct": <number>,
      "affected_work_orders": ["<wo_no>"],
      "severity": "critical" | "warning" | "minor"
    }
  ],
  "suggestions": [
    {
      "action": "<e.g. Move WO-2026-0012 to Machine B on 15 Mar>",
      "from_machine": "<name>",
      "to_machine": "<name or null>",
      "reason": "<string>"
    }
  ],
  "summary": {
    "total_bottlenecks": <number>,
    "machines_overloaded": <number>,
    "critical_dates": ["<ISO date>"]
  },
  "summary_hinglish": "<3-4 bullet points in Hinglish>"
}`,
  };
}


// ── Sprint 4: Quality AI ───────────────────────────────────────────────────

function rootCauseSuggestion(description, containment, defectData) {
  return {
    system: SYSTEM_PROMPT,
    user: `You are a quality engineer expert in 8D methodology and root cause analysis for automotive manufacturing (IATF 16949).

Analyze this quality issue and suggest root causes:

**Problem Description:**
${description}

**Containment Actions Taken:**
${containment || 'None recorded'}

**Defect Data:**
${JSON.stringify(defectData || {}, null, 2)}

Provide your analysis as JSON:
{
  "five_whys": [
    { "level": 1, "question": "Why did [problem] occur?", "answer": "Because..." },
    { "level": 2, "question": "Why did [cause 1] happen?", "answer": "Because..." },
    "...up to 5 levels"
  ],
  "fishbone": {
    "Man": ["cause 1", "cause 2"],
    "Machine": ["cause 1"],
    "Material": ["cause 1"],
    "Method": ["cause 1"],
    "Measurement": ["cause 1"],
    "Environment": ["cause 1"]
  },
  "likely_root_cause": "The most probable root cause is...",
  "confidence": "high|medium|low"
}`,
  };
}

function capaEffectivenessPrediction(capaData, historicalCapas) {
  return {
    system: SYSTEM_PROMPT,
    user: `You are a quality management expert analyzing CAPA effectiveness.

**Current CAPA:**
${JSON.stringify(capaData, null, 2)}

**Historical CAPAs (similar issues, last 20):**
${JSON.stringify(historicalCapas || [], null, 2)}

Predict the effectiveness of this CAPA. Return JSON:
{
  "confidence": 0.0 to 1.0,
  "reasoning": "Explanation of prediction...",
  "risk_factors": ["risk 1", "risk 2"],
  "recommendations": ["recommendation 1", "recommendation 2"],
  "similar_capas_outcome": "Summary of how similar CAPAs performed"
}`,
  };
}

function dimensionExtraction(drawingContext) {
  return {
    system: SYSTEM_PROMPT,
    user: `You are a metrology expert extracting dimensional specifications from engineering drawings.

${drawingContext || 'Extract all critical dimensions from the drawing.'}

Extract every dimension you can identify. Return JSON:
{
  "dimensions": [
    {
      "balloon_no": "1",
      "dimension_desc": "Overall length",
      "nominal": 50.00,
      "tolerance_upper": 0.05,
      "tolerance_lower": -0.05,
      "unit": "mm",
      "characteristic": "dimensional",
      "critical": false
    }
  ],
  "notes": "Any observations about the drawing quality or readability"
}`,
  };
}

function failureModeSuggestion(processStep, material, historicalPfmeas) {
  return {
    system: SYSTEM_PROMPT,
    user: `You are a PFMEA expert for automotive manufacturing (IATF 16949 / AIAG FMEA 4th edition).

**Process Step:**
${processStep || 'General manufacturing'}

**Material:**
${material || 'Not specified'}

**Historical PFMEA Data:**
${JSON.stringify(historicalPfmeas || [], null, 2)}

Suggest potential failure modes for this process step. Return JSON:
{
  "process_step": "${processStep || ''}",
  "suggestions": [
    {
      "failure_mode": "Description of potential failure",
      "failure_effect": "Effect on product/customer",
      "failure_cause": "Root cause of failure",
      "severity": 7,
      "occurrence": 4,
      "detection": 5,
      "current_controls": "Existing prevention/detection methods",
      "recommended_action": "Suggested improvement"
    }
  ]
}`,
  };
}

module.exports = {
  SYSTEM_PROMPT,
  rfqAutoFill,
  priceSuggestion,
  poExtraction,
  deliveryRisk,
  healthSummary,
  oqcPriorityQueue,
  iqcComparison,
  standardsDetection,
  defectPatterns,
  iqcCascadeSuggestion,
  iqcDispositionRecommendation,
  stockLevelPrediction,
  productionShortageAlert,
  productionBottleneckDetection,
  rootCauseSuggestion,
  capaEffectivenessPrediction,
  dimensionExtraction,
  failureModeSuggestion,
};
