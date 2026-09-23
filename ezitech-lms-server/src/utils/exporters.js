const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');

function toCsv({ columns, rows }) {
  const escape = (value) => {
    let str = value === null || value === undefined ? '' : String(value);
    if (typeof value === 'string' && /^[=+\-@\t\r]/.test(str)) {
      str = `'${str}`;
    }
    return /[",\r\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
  };

  const header = columns.map((c) => escape(c.label)).join(',');
  const lines = rows.map((row) => columns.map((c) => escape(row[c.key])).join(','));
  return [header, ...lines].join('\n');
}

async function toExcelBuffer({ columns, rows }, sheetTitle = 'Report') {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(sheetTitle);

  sheet.columns = columns.map((c) => ({ header: c.label, key: c.key, width: c.width || 20 }));
  sheet.getRow(1).font = { bold: true };
  rows.forEach((row) => sheet.addRow(row));

  return workbook.xlsx.writeBuffer();
}

function streamPdfTable({ columns, rows, title }, res) {
  const doc = new PDFDocument({ margin: 40, size: 'A4', layout: rows.length && columns.length > 5 ? 'landscape' : 'portrait' });
  doc.pipe(res);

  doc.fontSize(18).text(title, { align: 'center' }).moveDown(1);

  const startX = doc.page.margins.left;
  const usableWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const colWidth = usableWidth / columns.length;
  const rowHeight = 20;
  let y = doc.y;

  function drawRow(values, isHeader) {
    doc.fontSize(9).fillColor(isHeader ? '#ffffff' : '#000000');
    if (isHeader) {
      doc.rect(startX, y, usableWidth, rowHeight).fill('#1a237e');
      doc.fillColor('#ffffff');
    }
    values.forEach((val, i) => {
      doc.text(String(val ?? ''), startX + i * colWidth + 4, y + 5, { width: colWidth - 8, height: rowHeight });
    });
    y += rowHeight;

    if (y > doc.page.height - doc.page.margins.bottom - rowHeight) {
      doc.addPage();
      y = doc.page.margins.top;
    }
  }

  drawRow(columns.map((c) => c.label), true);
  rows.forEach((row) => drawRow(columns.map((c) => row[c.key])));

  doc.end();
}

module.exports = { toCsv, toExcelBuffer, streamPdfTable };
