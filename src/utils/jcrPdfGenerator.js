/**
 * JCR PDF Generator
 *
 * Generates the official HAREDA / New & Renewable Energy Department
 * Joint Commissioning Report exactly as per the government template.
 * Every page is A4 PORTRAIT and reproduces the source format box-for-box:
 *
 *   - Format-II    : Material Receipt of Solar Street Lighting System
 *   - Format-III   : Format of Joint Commissioning Report (JCR)
 *   - Format-III(a): Site-wise list of installations (bordered table)
 *
 * The Format-III(a) table repeats its header on every page and paginates
 * automatically for any number of rows. Signatures are printed once, after
 * the final row of the table.
 */

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

/* -------------------------------------------------------------------------- */
/* Layout constants (mm) — A4 portrait = 210 x 297                             */
/* -------------------------------------------------------------------------- */

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 18;                       // side margins
const CONTENT_W = PAGE_W - MARGIN * 2;   // 174 mm usable width
const FONT = 'times';                    // serif, matches the official form
const INK = [0, 0, 0];
const LINE_W = 0.3;

/* -------------------------------------------------------------------------- */
/* Small helpers                                                               */
/* -------------------------------------------------------------------------- */

const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return String(dateString);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}/${date.getFullYear()}`;
};

const val = (v) => (v === undefined || v === null ? '' : String(v));

// Split a multi-entry field value into individual trimmed lines. Entries may
// be separated by newlines (preferred) or commas (legacy data). Returns an
// array of non-empty lines; falls back to a single empty string when blank so
// callers can still render a placeholder.
const toLines = (v) => {
  const s = val(v);
  if (!s.trim()) return [''];
  return s
    .split(/\r?\n|,/)
    .map((part) => part.trim())
    .filter(Boolean);
};

// Join multi-entry values with real newlines so jsPDF / autoTable render each
// entry on its own line.
const multiline = (v) => toLines(v).join('\n');

/** Draw the bold, right-aligned "Format-X" tag at the very top-right. */
const drawFormatTag = (doc, tag, y = 16) => {
  doc.setFont(FONT, 'bold');
  doc.setFontSize(12);
  doc.setTextColor(INK[0], INK[1], INK[2]);
  const textW = doc.getTextWidth(tag);
  const x = PAGE_W - MARGIN - textW;
  doc.text(tag, x, y);
  // underline
  doc.setLineWidth(0.4);
  doc.line(x, y + 1, x + textW, y + 1);
};

/** Draw a centered underlined title. Returns the Y below it. */
const drawCenterTitle = (doc, text, y, size = 12, underline = false, bold = false) => {
  doc.setFont(FONT, bold ? 'bold' : 'normal');
  doc.setFontSize(size);
  doc.setTextColor(INK[0], INK[1], INK[2]);
  const lines = doc.splitTextToSize(text, CONTENT_W);
  lines.forEach((ln, i) => {
    const lineY = y + i * (size * 0.42);
    doc.text(ln, PAGE_W / 2, lineY, { align: 'center' });
    if (underline) {
      const w = doc.getTextWidth(ln);
      doc.setLineWidth(0.3);
      doc.line(PAGE_W / 2 - w / 2, lineY + 1, PAGE_W / 2 + w / 2, lineY + 1);
    }
  });
  return y + lines.length * (size * 0.42);
};

/* -------------------------------------------------------------------------- */
/* Format-II : Material Receipt of Solar Street Lighting System                */
/* -------------------------------------------------------------------------- */

const generateFormatII = (doc, formData, addNewPage = false) => {
  if (addNewPage) doc.addPage('a4', 'portrait');

  drawFormatTag(doc, 'Format-II');

  let y = 32;
  y = drawCenterTitle(doc, 'MATERIAL RECEIPT OF SOLAR STREET LIGHTING SYSTEM', y, 12, false, false);
  y += 12;

  // Label : value rows, colon aligned in a fixed column (like the form)
  const labelX = MARGIN;
  const colonX = MARGIN + 78;
  const valueX = colonX + 4;

  const row = (label, value, { multi = false } = {}) => {
    doc.setFont(FONT, 'normal');
    doc.setFontSize(11);
    doc.text(label, labelX, y);
    doc.text(':', colonX, y);
    if (multi) {
      const lines = toLines(value);
      if (lines.some(Boolean)) {
        doc.text(lines, valueX, y, { lineHeightFactor: 1.4 });
      }
      // Advance by the number of rendered lines (min one row height).
      y += Math.max(1, lines.length) * 6.5 + 4.5;
    } else {
      if (value) doc.text(val(value), valueX, y);
      y += 11;
    }
  };

  row('Name of the district', formData.district, { multi: true });
  row('Rate Contract No. & date', formData.rateContractNo, { multi: true });
  row('Work Order No. & date', formData.workOrderNo, { multi: true });
  row('No. of Systems', formData.systemsInThisJCR);
  row('Date of pre-dispatch inspection of material', formatDate(formData.preDispatchInspectionDate));
  row('Date of receipt of material', formatDate(formData.materialReceiptDate));

  y += 6;

  // Certification paragraph with blanks filled by the data (justified).
  const nos = val(formData.systemsInThisJCR) || '……………';
  const supplier = val(formData.supplierName) || '____________________________________';
  const certText =
    `It is certified that duly inspected material of ${nos} nos. of Solar Street Lighting ` +
    `Systems supplied by M/s ${supplier} have been received in good condition as per the ` +
    `specifications of the Rate Contract & DNIT.`;

  doc.setFont(FONT, 'normal');
  doc.setFontSize(11);
  const certLines = doc.splitTextToSize(certText, CONTENT_W);
  doc.text(certLines, MARGIN, y, { align: 'justify', maxWidth: CONTENT_W, lineHeightFactor: 1.5 });
  y += certLines.length * 6.5 + 26;

  // Two signatures, left and right — plain text, exactly like the form.
  doc.setFont(FONT, 'normal');
  doc.setFontSize(11);
  doc.text('Signature of the supplier', MARGIN, y);
  doc.text('Signature of PO/APO', PAGE_W - MARGIN, y, { align: 'right' });
  y += 6;
  doc.text('With seal', MARGIN, y);
  doc.text('with Seal', PAGE_W - MARGIN, y, { align: 'right' });
};

/* -------------------------------------------------------------------------- */
/* Format-III : Format of Joint Commissioning Report (JCR)                     */
/* -------------------------------------------------------------------------- */

const generateFormatIII = (doc, formData) => {
  doc.addPage('a4', 'portrait');

  drawFormatTag(doc, 'Format-III');

  let y = 26;
  y = drawCenterTitle(doc, 'FORMAT OF JOINT COMMISSIONING REPORT (JCR)', y, 12, false, false);
  y += 4;

  // Two-column bordered table. Left = label, Right = value.
  const leftW = 92;
  const rightW = CONTENT_W - leftW;

  const rows = [
    ['Name of System', val(formData.systemName) || 'Solar Street Lighting System'],
    ['Name of district', multiline(formData.district)],
    ['Rate Contract No. & date', multiline(formData.rateContractNo)],
    ['Work order no. & date', multiline(formData.workOrderNo)],
    ['Name & address of Supplier', val(formData.supplierName)],
    ['Total Work Order Quantity (nos.)', val(formData.totalWorkOrderQty)],
    ['Date of Supply of Material by the firm', formatDate(formData.materialSupplyDate)],
    ['No. of systems covered under this JCR (Nos.)', val(formData.systemsInThisJCR)],
    ['Date of complete installation and commissioning of the system (s) by the firm', formatDate(formData.installationCompleteDate)],
    ['Date of Handing over the system(s) to the beneficiary', formatDate(formData.handoverDate)],
    [
      'Site-wise list of installations\n(Name, Address, date of supply of system to the beneficiary, date of installation and commissioning of system at the site,\n\n(Separate list with compete details enclosed)',
      '',
    ],
  ];

  autoTable(doc, {
    startY: y,
    theme: 'grid',
    styles: {
      font: FONT,
      fontSize: 10.5,
      cellPadding: 2,
      textColor: INK,
      lineColor: INK,
      lineWidth: LINE_W,
      valign: 'top',
      overflow: 'linebreak',
    },
    columnStyles: {
      0: { cellWidth: leftW },
      1: { cellWidth: rightW },
    },
    body: rows,
    margin: { left: MARGIN, right: MARGIN },
  });

  y = doc.lastAutoTable.finalY;

  // Certification paragraph inside a full-width bordered box (continuation of the form table).
  const nos = val(formData.systemsInThisJCR) || '…………';
  // Inside running prose, join multiple work orders with commas for readability.
  const wo = toLines(formData.workOrderNo).filter(Boolean).join(', ') || '………………';
  const inspDate = formatDate(formData.preDispatchInspectionDate) || '………………';
  const certText =
    `Certified that ${nos} nos. of Solar Street Lighting Systems in reference to work order no. ` +
    `${wo} Dated…………… and further pre-dispatch inspection carried out on ${inspDate} have been ` +
    `installed and commissioned at the place (s) mentioned in the enclosed list & these systems have ` +
    `been taken over by beneficiary/s in good working condition.`;

  autoTable(doc, {
    startY: y,
    theme: 'grid',
    styles: {
      font: FONT,
      fontSize: 10.5,
      cellPadding: 2.5,
      textColor: INK,
      lineColor: INK,
      lineWidth: LINE_W,
      valign: 'top',
      overflow: 'linebreak',
    },
    body: [[certText]],
    columnStyles: { 0: { cellWidth: CONTENT_W } },
    margin: { left: MARGIN, right: MARGIN },
  });

  y = doc.lastAutoTable.finalY + 18;

  // Three signatures across the page.
  doc.setFont(FONT, 'normal');
  doc.setFontSize(11);
  const third = CONTENT_W / 3;
  const c1 = MARGIN;
  const c2 = MARGIN + third;
  const c3 = MARGIN + third * 2;

  doc.text('Signature of Supplier', c1, y);
  doc.text('Signature of user', c2, y);
  doc.text('Signature of PO/APO', c3, y);
  y += 6;
  doc.text('Name:', c1, y);
  doc.text('Name:', c2, y);
  doc.text('Name:', c3, y);

  y += 18;
  doc.text('Countersigned by', c2, y);
  y += 14;
  const authority = val(formData.countersignAuthority) ||
    'Addl. Deputy Commissioner –cum-\nChief Project Officer … (district)';
  doc.text(authority.split('\n'), c2, y);
};

/* -------------------------------------------------------------------------- */
/* Format-III(a) : Site-wise list of installations                             */
/* -------------------------------------------------------------------------- */

const generateFormatIIIa = (doc, formData) => {
  doc.addPage('a4', 'portrait');

  drawFormatTag(doc, 'Format-III(a)');

  let y = 28;
  y = drawCenterTitle(doc, 'Site-wise list of installations of Solar Street Lighting Systems', y, 12, true, false);
  y += 8;

  // District ............   Year ............  (single centered line)
  doc.setFont(FONT, 'normal');
  doc.setFontSize(11);
  const districtLines = toLines(formData.district);
  const hasDistrict = districtLines.some(Boolean);
  const year = val(formData.year) || '.............';
  doc.text(`District  ${hasDistrict ? districtLines[0] : '.....................'}`, MARGIN + 6, y);
  doc.text(`Year  ${year}`, PAGE_W - MARGIN - 60, y);
  y += 9;
  // Render any additional district/village entries on their own lines.
  if (hasDistrict && districtLines.length > 1) {
    const extra = districtLines.slice(1);
    doc.text(extra, MARGIN + 6, y, { lineHeightFactor: 1.4 });
    y += extra.length * 6 + 2;
  }

  // Work Order + Supplier. Multiple work orders each on their own line.
  const woLines = toLines(formData.workOrderNo);
  doc.text(`Work Order No. & date:  ${woLines[0] || ''}`, MARGIN, y);
  y += 6;
  if (woLines.length > 1) {
    const extraWo = woLines.slice(1);
    doc.text(extraWo, MARGIN + 32, y, { lineHeightFactor: 1.4 });
    y += extraWo.length * 6;
  }
  const supplierLines = doc.splitTextToSize(
    `Name & address of Supplier of System(s):  ${val(formData.supplierName)}`,
    CONTENT_W
  );
  doc.text(supplierLines, MARGIN, y);
  y += supplierLines.length * 5.5 + 4;

  // Two-column make / capacity block
  const leftColX = MARGIN;
  const rightColX = MARGIN + CONTENT_W / 2;
  doc.text(`Make of Module:  ${val(formData.moduleMake)}`, leftColX, y);
  doc.text(`Capacity of PV Module:  ${val(formData.moduleCapacity)} (W)`, rightColX, y);
  y += 6;
  doc.text(`Make of Luminaire:  ${val(formData.luminaireMake)}`, leftColX, y);
  doc.text(`Capacity of Luminaire:  ${val(formData.luminaireCapacity)} (W)`, rightColX, y);
  y += 6;
  doc.text(`Make of battery:  ${val(formData.batteryMake)}`, leftColX, y);
  doc.text(`Capacity of battery:  ${val(formData.batteryCapacity)} (Wh)`, rightColX, y);
  y += 8;

  // Build the table body with separate lat/long columns (12 columns total).
  const installations = formData.installations || [];
  const body = installations.map((inst, idx) => {
    return [
      val(inst.serialNo) || String(idx + 1),
      val(inst.beneficiaryName),
      val(inst.latitude),
      val(inst.longitude),
      formatDate(inst.photoDate),
      val(inst.villageGramPanchayat),
      val(inst.block),
      val(inst.assemblyConstituency),
      formatDate(inst.commissioningDate),
      val(inst.moduleSerialNo),
      val(inst.batterySerialNo),
      val(inst.luminaireSerialNo),
      val(inst.rms || 'YES'),
    ];
  });

  // Column widths adjusted for separate lat/long columns
  const columnStyles = {
    0: { cellWidth: 8, halign: 'center' },   // S.No.
    1: { cellWidth: 22 },                    // Exact location (land mark)
    2: { cellWidth: 14, halign: 'center' },  // Latitude
    3: { cellWidth: 14, halign: 'center' },  // Longitude
    4: { cellWidth: 14, halign: 'center' },  // Photo Date
    5: { cellWidth: 18 },                    // Village & Gram Panchayat
    6: { cellWidth: 13 },                    // Block
    7: { cellWidth: 17 },                    // Assembly constituency
    8: { cellWidth: 14, halign: 'center' },  // Date of Commissioning
    9: { cellWidth: 11 },                    // Module Serial Number
    10: { cellWidth: 10 },                   // Battery Serial Number
    11: { cellWidth: 11 },                   // Luminaire Serial Number
    12: { cellWidth: 8, halign: 'center' },  // RMS
  };

  autoTable(doc, {
    startY: y,
    theme: 'grid',
    head: [[
      'S. No.',
      'Exact location of installation (land mark)',
      'Latitude',
      'Longitude',
      'Photo Date',
      'Name of village & Name of Gram Panchayat',
      'Name of Block',
      'Name of assembly constituency',
      'Date of Commissioning',
      'Module Serial Number',
      'Battery Serial Number',
      'Luminaire Serial Number',
      'RMS',
    ]],
    body: body.length ? body : [['', '', '', '', '', '', '', '', '', '', '', '', '']],
    styles: {
      font: FONT,
      fontSize: 7,
      cellPadding: 1.5,
      textColor: INK,
      lineColor: INK,
      lineWidth: LINE_W,
      valign: 'top',
      overflow: 'linebreak',
      minCellHeight: 16,
    },
    headStyles: {
      fontStyle: 'bold',
      fontSize: 6.8,
      halign: 'center',
      valign: 'middle',
      fillColor: [255, 255, 255],
      textColor: INK,
      lineColor: INK,
      lineWidth: LINE_W,
    },
    columnStyles,
    margin: { left: MARGIN, right: MARGIN, top: 22, bottom: 20 },
    // Repeat the header on every page automatically.
    // Repeat the header on every page automatically.
    showHead: 'everyPage',
  });

  let afterTableY = doc.lastAutoTable.finalY;

  // Note (matches the official wording).
  const noteText =
    'Note: Photographs of all installed systems will be retained by District Office in their record and ' +
    'at least 10% of the installed systems are to be attached with this list to be submitted with ' +
    'Directorate of New and Renewable Energy, Haryana.';

  // If the note + signatures would overflow the page, start a fresh page.
  const needed = 6 * 5 + 40;
  if (afterTableY + needed > PAGE_H - MARGIN) {
    doc.addPage('a4', 'portrait');
    afterTableY = 24;
  } else {
    afterTableY += 8;
  }

  doc.setFont(FONT, 'normal');
  doc.setFontSize(10.5);
  const noteLines = doc.splitTextToSize(noteText, CONTENT_W);
  doc.text(noteLines, MARGIN, afterTableY);
  let y2 = afterTableY + noteLines.length * 5.5 + 24;

  // Three signatures: Supplier, Beneficiary/Sarpanch, PO/APO.
  const third = CONTENT_W / 3;
  const c1 = MARGIN;
  const c2 = MARGIN + third;
  const c3 = MARGIN + third * 2;

  doc.setFontSize(11);
  doc.text('Signature of Supplier', c1, y2);
  doc.text('Signature of beneficiary /', c2, y2);
  doc.text('Signature of PO/APO', c3, y2);
  y2 += 6;
  doc.text('Name:', c1, y2);
  doc.text('Sarpanch', c2, y2);
  doc.text('Name:', c3, y2);
  y2 += 6;
  doc.text('Name:', c2, y2);
};

/* -------------------------------------------------------------------------- */
/* Orchestration                                                               */
/* -------------------------------------------------------------------------- */

const buildDocument = (doc, formData) => {
  // Format-II is drawn on the first (already existing) page.
  generateFormatII(doc, formData, false);
  generateFormatIII(doc, formData);
  generateFormatIIIa(doc, formData);
};

/** Generate and download the complete JCR PDF */
export const generateJCRPDF = async (formData) => {
  try {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    buildDocument(doc, formData);

    const timestamp = new Date().toISOString().split('T')[0];
    const workOrderShort = (formData.workOrderNo || 'JCR')
      .replace(/[^a-zA-Z0-9]/g, '_')
      .substring(0, 20);
    const filename = `JCR_${workOrderShort}_${timestamp}.pdf`;

    doc.save(filename);
    return { success: true, filename };
  } catch (error) {
    console.error('Error generating PDF:', error);
    return { success: false, error: error.message };
  }
};

/** Generate a preview blob URL for the complete JCR PDF */
export const generateJCRPreview = async (formData) => {
  try {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    buildDocument(doc, formData);

    const blob = doc.output('blob');
    const url = URL.createObjectURL(blob);
    return { success: true, url };
  } catch (error) {
    console.error('Error generating preview:', error);
    return { success: false, error: error.message };
  }
};
