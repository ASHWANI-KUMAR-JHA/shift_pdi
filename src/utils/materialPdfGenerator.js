/**
 * Material Report PDF Generator
 *
 * Generates the official HAREDA / New & Renewable Energy Department
 * "Material Receipt" formats exactly as per the government template.
 * Every page is A4 PORTRAIT and reproduces the source format box-for-box:
 *
 *   - Format-II    : Material Receipt of Solar Street Lighting System
 *   - Format-II(a) : List of Material Supplied of Solar Street Lighting System
 *
 * The Format-II(a) table repeats its header on every page and paginates
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
const MARGIN = 18;
const CONTENT_W = PAGE_W - MARGIN * 2; // 174 mm usable width
const FONT = 'times';
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

const toLines = (v) => {
  const s = val(v);
  if (!s.trim()) return [''];
  return s
    .split(/\r?\n|,/)
    .map((part) => part.trim())
    .filter(Boolean);
};

/**
 * Stamp manually entered page-number labels, in order, centered near the
 * bottom of each page. No footer divider line is drawn. Pass the labels from
 * formData.pageNumbers (array of { label } or strings). If none are provided,
 * nothing is stamped.
 */
const stampPageNumbers = (doc, pageNumbers = []) => {
  const labels = (pageNumbers || [])
    .map((p) => String((p && p.label !== undefined ? p.label : p) ?? '').trim());
  if (!labels.length) return;
  const total = doc.internal.getNumberOfPages();
  const footerY = PAGE_H - 10;
  for (let i = 1; i <= total && i <= labels.length; i++) {
    const label = labels[i - 1];
    if (!label) continue;
    doc.setPage(i);
    doc.setFont(FONT, 'normal');
    doc.setFontSize(9);
    doc.setTextColor(INK[0], INK[1], INK[2]);
    // Stamp the manual page number at the bottom-right corner (matches PDI/JCR).
    doc.text(label, PAGE_W - MARGIN, footerY, { align: 'right' });
  }
};

/** Draw the bold, right-aligned "Format-X" tag at the very top-right. */
const drawFormatTag = (doc, tag, y = 16) => {
  doc.setFont(FONT, 'bold');
  doc.setFontSize(12);
  doc.setTextColor(INK[0], INK[1], INK[2]);
  const textW = doc.getTextWidth(tag);
  const x = PAGE_W - MARGIN - textW;
  doc.text(tag, x, y);
  doc.setLineWidth(0.4);
  doc.line(x, y + 1, x + textW, y + 1);
};

/** Draw a centered title. Returns the Y below it. */
const drawCenterTitle = (doc, text, y, size = 12) => {
  doc.setFont(FONT, 'normal');
  doc.setFontSize(size);
  doc.setTextColor(INK[0], INK[1], INK[2]);
  const lines = doc.splitTextToSize(text, CONTENT_W);
  lines.forEach((ln, i) => {
    const lineY = y + i * (size * 0.42);
    doc.text(ln, PAGE_W / 2, lineY, { align: 'center' });
  });
  return y + lines.length * (size * 0.42);
};

/** Draw the shared header label:value rows used by both formats. */
const drawHeaderRows = (doc, formData, startY, rows) => {
  let y = startY;
  const labelX = MARGIN;
  const colonX = MARGIN + 90;
  const valueX = colonX + 4;

  rows.forEach(({ label, value, multi }) => {
    doc.setFont(FONT, 'normal');
    doc.setFontSize(11);
    const labelLines = doc.splitTextToSize(label, 86);
    doc.text(labelLines, labelX, y);
    doc.text(':', colonX, y);
    if (multi) {
      const lines = toLines(value);
      if (lines.some(Boolean)) {
        doc.text(lines, valueX, y, { lineHeightFactor: 1.4 });
      }
      const labelH = labelLines.length * 5.5;
      y += Math.max(labelH, Math.max(1, lines.length) * 6.5) + 4;
    } else {
      if (value) doc.text(val(value), valueX, y);
      const labelH = labelLines.length * 5.5;
      y += Math.max(labelH, 6) + 5;
    }
  });

  return y;
};

/* -------------------------------------------------------------------------- */
/* Format-II : Material Receipt of Solar Street Lighting System                */
/* -------------------------------------------------------------------------- */

const generateFormatII = (doc, formData) => {
  drawFormatTag(doc, 'Format-II');

  let y = 30;
  y = drawCenterTitle(doc, 'MATERIAL RECEIPT OF SOLAR STREET LIGHTING SYSTEM', y, 12);
  y += 12;

  y = drawHeaderRows(doc, formData, y, [
    { label: 'Name of the district', value: formData.district, multi: true },
    { label: 'Rate Contract No. & date', value: formData.rateContractNo, multi: true },
    { label: 'Work Order (WO) No., date &\nNo. of Systems ordered under W.O.', value: formData.workOrderNo, multi: true },
    { label: 'Material receipt for No. of Systems', value: formData.materialReceiptSystems },
    { label: 'Date of pre-dispatch inspection of material', value: formatDate(formData.preDispatchInspectionDate) },
    { label: 'Date of receipt of material', value: formatDate(formData.materialReceiptDate) },
    { label: 'Invoice No. & date vide which material supplied', value: formData.invoiceNoDate, multi: true },
    { label: 'Name of site where material supplied\n(Village/GP and Block)', value: formData.siteName, multi: true },
  ]);

  y += 4;

  // Certification paragraph with blanks filled by the data (justified).
  const nos = val(formData.materialReceiptSystems) || val(formData.systemsOrdered) || '…………………';
  const supplier = val(formData.supplierName) || '______________________________';
  const certText =
    `It is certified that duly inspected material of ${nos} nos. of Solar Street Lighting ` +
    `Systems supplied by M/s ${supplier} have been received in good condition as per the ` +
    `specifications of the Rate Contract & DNIT. The list of modules, battery & luminaire ` +
    `is attached with this receipt (Format II(a)).`;

  doc.setFont(FONT, 'normal');
  doc.setFontSize(11);
  const certLines = doc.splitTextToSize(certText, CONTENT_W);
  doc.text(certLines, MARGIN, y, { align: 'justify', maxWidth: CONTENT_W, lineHeightFactor: 1.5 });
  y += certLines.length * 6.5 + 40;

  drawSignatures(doc, formData, y);
};

/* -------------------------------------------------------------------------- */
/* Format-II(a) : List of Material Supplied of Solar Street Lighting System    */
/* -------------------------------------------------------------------------- */

const generateFormatIIa = (doc, formData) => {
  doc.addPage('a4', 'portrait');

  drawFormatTag(doc, 'Format-II(a)');

  let y = 30;
  y = drawCenterTitle(doc, 'LIST OF MATERIAL SUPPLIED OF SOLAR STREET LIGHTING SYSTEM', y, 12);
  y += 10;

  y = drawHeaderRows(doc, formData, y, [
    { label: 'Name of the district', value: formData.district, multi: true },
    { label: 'Work Order (WO) No., date &\nNo. of Systems ordered under W.O.', value: formData.workOrderNo, multi: true },
    { label: 'Material receipt for No. of Systems', value: formData.materialReceiptSystems },
    { label: 'Date of pre-dispatch inspection of material', value: formatDate(formData.preDispatchInspectionDate) },
  ]);

  y += 2;

  const items = formData.materialItems || [];
  const body = items.map((it, idx) => [
    val(it.sno) || String(idx + 1),
    val(it.moduleSerial),
    val(it.moduleMake),
    val(it.batterySerial),
    val(it.batteryMake),
    val(it.luminaireSerial),
    val(it.luminaireMake),
  ]);

  // Always render at least a few empty rows so the table looks like the form.
  while (body.length < 7) {
    body.push([String(body.length + 1), '', '', '', '', '', '']);
  }

  autoTable(doc, {
    startY: y,
    theme: 'grid',
    head: [[
      'S.No.',
      'Module Sr. Number',
      'Make of Module',
      'Battery Sr. No.',
      'Make of Battery',
      'Luminaire Sr. No.',
      'Make of Luminaire',
    ]],
    body,
    styles: {
      font: FONT,
      fontSize: 9,
      cellPadding: 2,
      textColor: INK,
      lineColor: INK,
      lineWidth: LINE_W,
      valign: 'top',
      overflow: 'linebreak',
      minCellHeight: 8,
    },
    headStyles: {
      fontStyle: 'bold',
      fontSize: 9,
      halign: 'left',
      valign: 'middle',
      fillColor: [255, 255, 255],
      textColor: INK,
      lineColor: INK,
      lineWidth: LINE_W,
    },
    columnStyles: {
      0: { cellWidth: 14, halign: 'center' },
      1: { cellWidth: 30 },
      2: { cellWidth: 26 },
      3: { cellWidth: 26 },
      4: { cellWidth: 24 },
      5: { cellWidth: 28 },
      6: { cellWidth: 26 },
    },
    margin: { left: MARGIN, right: MARGIN, top: 22, bottom: 24 },
    showHead: 'everyPage',
  });

  let afterY = doc.lastAutoTable.finalY;
  const needed = 40;
  if (afterY + needed > PAGE_H - MARGIN) {
    doc.addPage('a4', 'portrait');
    afterY = 24;
  } else {
    afterY += 24;
  }

  drawSignatures(doc, formData, afterY);
};

/* -------------------------------------------------------------------------- */
/* Shared signature block (Supplier / PO/APO)                                  */
/* -------------------------------------------------------------------------- */

const drawSignatures = (doc, formData, y) => {
  doc.setFont(FONT, 'normal');
  doc.setFontSize(11);
  doc.text('Signature of the supplier', MARGIN, y);
  doc.text('Signature of PO/APO', PAGE_W - MARGIN, y, { align: 'right' });
  y += 6;
  doc.text('With seal', MARGIN, y);
  doc.text('with Seal', PAGE_W - MARGIN, y, { align: 'right' });
  y += 6;
  doc.text(`Name : ${val(formData.supplierSignatoryName)}`, MARGIN, y);
  doc.text(`Name : ${val(formData.poApoName)}`, PAGE_W - MARGIN, y, { align: 'right' });
};

/* -------------------------------------------------------------------------- */
/* Orchestration                                                               */
/* -------------------------------------------------------------------------- */

const buildDocument = (doc, formData) => {
  generateFormatII(doc, formData);
  generateFormatIIa(doc, formData);
  stampPageNumbers(doc, formData.pageNumbers);
};

/** Generate and download the complete Material Report PDF */
export const generateMaterialPDF = async (formData) => {
  try {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    buildDocument(doc, formData);
    const fileName = `Material_Report_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
    return { success: true, fileName };
  } catch (error) {
    console.error('Failed to generate Material Report PDF:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Export the Format-II(a) material list to a real Excel (.xlsx) workbook.
 *
 * The sheet reproduces the printed table exactly: a few header-info rows at the
 * top (district / work order / etc.), a blank spacer row, then the tabular data
 * with the same 7 columns as the Format-II(a) table. SheetJS is imported lazily
 * so it stays out of the initial bundle.
 */
export const exportMaterialExcel = async (formData) => {
  try {
    const XLSX = await import('xlsx');

    // ----- Table column headers (identical to the Format-II(a) print) -----
    const TABLE_HEADERS = [
      'S.No.',
      'Module Sr. Number',
      'Make of Module',
      'Battery Sr. No.',
      'Make of Battery',
      'Luminaire Sr. No.',
      'Make of Luminaire',
    ];

    const items = formData.materialItems || [];
    const dataRows = items.map((it, idx) => [
      val(it.sno) || String(idx + 1),
      val(it.moduleSerial),
      val(it.moduleMake),
      val(it.batterySerial),
      val(it.batteryMake),
      val(it.luminaireSerial),
      val(it.luminaireMake),
    ]);

    // ----- Header info block above the table (label : value) -----
    const info = [
      ['Name of the district', val(formData.district)],
      ['Work Order (WO) No., date & No. of Systems ordered under W.O.', val(formData.workOrderNo)],
      ['Material receipt for No. of Systems', val(formData.materialReceiptSystems)],
      ['Date of pre-dispatch inspection of material', formatDate(formData.preDispatchInspectionDate)],
    ];

    // Build the full sheet as an array-of-arrays.
    const aoa = [
      ['LIST OF MATERIAL SUPPLIED OF SOLAR STREET LIGHTING SYSTEM'],
      [],
      ...info,
      [],
      TABLE_HEADERS,
      ...dataRows,
    ];

    const ws = XLSX.utils.aoa_to_sheet(aoa);

    // Column widths for readability.
    ws['!cols'] = [
      { wch: 8 },   // S.No.
      { wch: 22 },  // Module Sr. Number
      { wch: 20 },  // Make of Module
      { wch: 18 },  // Battery Sr. No.
      { wch: 18 },  // Make of Battery
      { wch: 20 },  // Luminaire Sr. No.
      { wch: 20 },  // Make of Luminaire
    ];

    // Merge the title across all 7 columns.
    ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: TABLE_HEADERS.length - 1 } }];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Material List');

    const fileName = `Material_List_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
    return { success: true, fileName };
  } catch (error) {
    console.error('Failed to export Material Excel:', error);
    return { success: false, error: error.message };
  }
};

/** Generate a blob URL for previewing the Material Report PDF in an iframe. */
export const generateMaterialPreview = async (formData) => {
  try {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    buildDocument(doc, formData);
    const url = doc.output('bloburl');
    return { success: true, url };
  } catch (error) {
    console.error('Failed to generate Material Report preview:', error);
    return { success: false, error: error.message };
  }
};
