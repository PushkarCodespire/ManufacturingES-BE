const PDFDocument = require('pdfkit');
const { sendEmail } = require('../config/email');

// ── Generate RFQ PDF as Buffer ──────────────────────────────────────────────
function generateRfqPdf(rfq, items, companyInfo) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const company = companyInfo || {
      name: 'Dynatech ONE',
      tagline: 'Manufacturing Execution System',
    };

    // ── Header ──
    doc.fontSize(18).font('Helvetica-Bold').text(company.name, { align: 'center' });
    doc.fontSize(9).font('Helvetica').fillColor('#666').text(company.tagline, { align: 'center' });
    doc.moveDown(0.5);

    // Title bar
    doc.rect(50, doc.y, 495, 28).fill('#1d4ed8');
    doc.fillColor('#fff').fontSize(13).font('Helvetica-Bold')
      .text('REQUEST FOR QUOTATION', 60, doc.y - 22, { width: 475, align: 'center' });
    doc.fillColor('#000');
    doc.moveDown(1.5);

    // ── RFQ Details ──
    const detailY = doc.y;
    doc.fontSize(10).font('Helvetica-Bold').text('RFQ No:', 50, detailY);
    doc.font('Helvetica').text(rfq.rfq_no || '—', 130, detailY);

    doc.font('Helvetica-Bold').text('Date:', 350, detailY);
    doc.font('Helvetica').text(formatDate(rfq.rfq_date || rfq.createdAt), 400, detailY);

    doc.font('Helvetica-Bold').text('Response By:', 50, detailY + 18);
    doc.font('Helvetica').text(formatDate(rfq.response_deadline) || '—', 130, detailY + 18);

    doc.font('Helvetica-Bold').text('Priority:', 350, detailY + 18);
    doc.font('Helvetica').text((rfq.priority || 'normal').toUpperCase(), 400, detailY + 18);

    doc.moveDown(3);

    // ── Notes ──
    if (rfq.notes) {
      doc.fontSize(10).font('Helvetica-Bold').text('Notes / Special Requirements:');
      doc.font('Helvetica').fontSize(9).text(rfq.notes, { width: 495 });
      doc.moveDown(1);
    }

    // ── Items Table ──
    doc.fontSize(11).font('Helvetica-Bold').text('Items Required:', 50);
    doc.moveDown(0.5);

    // Table header
    const tableTop = doc.y;
    const colX = { no: 50, item: 80, desc: 220, qty: 350, unit: 410, delivery: 460 };

    doc.rect(50, tableTop, 495, 20).fill('#f1f5f9');
    doc.fillColor('#1e293b').fontSize(9).font('Helvetica-Bold');
    doc.text('#', colX.no + 5, tableTop + 5);
    doc.text('Item', colX.item, tableTop + 5);
    doc.text('Description', colX.desc, tableTop + 5);
    doc.text('Qty', colX.qty, tableTop + 5);
    doc.text('Unit', colX.unit, tableTop + 5);
    doc.text('Delivery', colX.delivery, tableTop + 5);
    doc.fillColor('#000');

    let rowY = tableTop + 22;
    doc.font('Helvetica').fontSize(9);

    (items || []).forEach((item, i) => {
      if (rowY > 720) {
        doc.addPage();
        rowY = 50;
      }

      // Alternating row bg
      if (i % 2 === 1) {
        doc.rect(50, rowY - 2, 495, 18).fill('#f8fafc').fillColor('#000');
      }

      doc.text(String(i + 1), colX.no + 5, rowY);
      doc.text(item.Item?.code || item.item_code || '—', colX.item, rowY, { width: 135 });
      doc.text(item.Item?.name || item.description || '—', colX.desc, rowY, { width: 125 });
      doc.text(String(item.qty || item.quantity || '—'), colX.qty, rowY);
      doc.text(item.unit || item.Item?.unit || 'pcs', colX.unit, rowY);
      doc.text(formatDate(item.required_date) || '—', colX.delivery, rowY);
      rowY += 20;
    });

    // Bottom line
    doc.moveTo(50, rowY + 5).lineTo(545, rowY + 5).strokeColor('#e2e8f0').stroke();
    doc.moveDown(2);

    // ── Footer ──
    const footerY = 750;
    doc.fontSize(8).fillColor('#9ca3af')
      .text('This is a system-generated document from Dynatech ONE.', 50, footerY, { align: 'center', width: 495 })
      .text('Please respond with your quotation before the deadline mentioned above.', { align: 'center', width: 495 });

    doc.end();
  });
}

// ── Build HTML Email Body ───────────────────────────────────────────────────
function buildRfqEmailHtml(rfq, items, vendorName) {
  const itemRows = (items || []).map((item, i) => `
    <tr style="border-bottom: 1px solid #e5e7eb;">
      <td style="padding: 8px 12px; font-size: 13px;">${i + 1}</td>
      <td style="padding: 8px 12px; font-size: 13px; font-weight: 600;">${item.Item?.code || '—'}</td>
      <td style="padding: 8px 12px; font-size: 13px;">${item.Item?.name || item.description || '—'}</td>
      <td style="padding: 8px 12px; font-size: 13px; text-align: center;">${item.qty || item.quantity || '—'}</td>
      <td style="padding: 8px 12px; font-size: 13px;">${item.unit || 'pcs'}</td>
    </tr>
  `).join('');

  return `
  <!DOCTYPE html>
  <html>
  <head><meta charset="utf-8"></head>
  <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f4f6f9;">
    <div style="max-width: 640px; margin: 0 auto; padding: 24px;">

      <!-- Header -->
      <div style="background: #1d4ed8; border-radius: 12px 12px 0 0; padding: 24px 32px; text-align: center;">
        <h1 style="color: #fff; margin: 0; font-size: 22px;">Dynatech ONE</h1>
        <p style="color: #93c5fd; margin: 4px 0 0; font-size: 12px;">Manufacturing Execution System</p>
      </div>

      <!-- Body -->
      <div style="background: #fff; padding: 32px; border: 1px solid #e5e7eb; border-top: none;">
        <p style="font-size: 15px; color: #111827;">Dear <strong>${vendorName || 'Vendor'}</strong>,</p>

        <p style="font-size: 14px; color: #374151; line-height: 1.6;">
          We would like to invite you to submit your quotation for the following items.
          Please find the details below and the attached RFQ document.
        </p>

        <!-- RFQ Info -->
        <div style="background: #f8fafc; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <table style="width: 100%; font-size: 13px; color: #374151;">
            <tr>
              <td style="padding: 4px 0;"><strong>RFQ Number:</strong></td>
              <td>${rfq.rfq_no || '—'}</td>
              <td style="padding: 4px 0;"><strong>Priority:</strong></td>
              <td>${(rfq.priority || 'normal').toUpperCase()}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0;"><strong>RFQ Date:</strong></td>
              <td>${formatDate(rfq.rfq_date || rfq.createdAt)}</td>
              <td style="padding: 4px 0;"><strong>Response By:</strong></td>
              <td style="color: #dc2626; font-weight: 600;">${formatDate(rfq.response_deadline) || '—'}</td>
            </tr>
          </table>
        </div>

        ${rfq.notes ? `
        <div style="background: #fffbeb; border-left: 3px solid #f59e0b; padding: 12px 16px; margin: 16px 0; border-radius: 0 8px 8px 0;">
          <strong style="font-size: 12px; color: #92400e;">Notes:</strong>
          <p style="font-size: 13px; color: #78350f; margin: 4px 0 0;">${rfq.notes}</p>
        </div>
        ` : ''}

        <!-- Items Table -->
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0; border: 1px solid #e5e7eb; border-radius: 8px;">
          <thead>
            <tr style="background: #1d4ed8;">
              <th style="padding: 10px 12px; color: #fff; font-size: 12px; text-align: left;">#</th>
              <th style="padding: 10px 12px; color: #fff; font-size: 12px; text-align: left;">Item Code</th>
              <th style="padding: 10px 12px; color: #fff; font-size: 12px; text-align: left;">Description</th>
              <th style="padding: 10px 12px; color: #fff; font-size: 12px; text-align: center;">Qty</th>
              <th style="padding: 10px 12px; color: #fff; font-size: 12px; text-align: left;">Unit</th>
            </tr>
          </thead>
          <tbody>
            ${itemRows}
          </tbody>
        </table>

        <p style="font-size: 14px; color: #374151; line-height: 1.6;">
          Please reply with your best quotation including unit price, delivery timeline, and payment terms.
        </p>

        <p style="font-size: 13px; color: #6b7280; margin-top: 24px;">
          Regards,<br>
          <strong style="color: #111827;">Procurement Team</strong><br>
          Dynatech ONE
        </p>
      </div>

      <!-- Footer -->
      <div style="text-align: center; padding: 16px; font-size: 11px; color: #9ca3af;">
        This is an automated email from Dynatech ONE. Please do not reply directly to this email.
      </div>
    </div>
  </body>
  </html>
  `;
}

// ── Helper ──
function formatDate(d) {
  if (!d) return '';
  const dt = new Date(d);
  if (isNaN(dt)) return '';
  return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ── Main: Send RFQ Email to Vendor ──────────────────────────────────────────
async function sendRfqEmail(rfq, items, vendor) {
  if (!vendor.email) {
    throw new Error(`Vendor ${vendor.name} has no email address`);
  }

  // Generate PDF
  const pdfBuffer = await generateRfqPdf(rfq, items);

  // Build email HTML
  const html = buildRfqEmailHtml(rfq, items, vendor.name);

  // Send
  await sendEmail({
    to: vendor.email,
    subject: `RFQ ${rfq.rfq_no} — Request for Quotation from Dynatech ONE`,
    html,
    attachments: [
      {
        filename: `${rfq.rfq_no || 'RFQ'}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf',
      },
    ],
  });

  return { vendor: vendor.name, email: vendor.email };
}

module.exports = { sendRfqEmail, generateRfqPdf, buildRfqEmailHtml };
