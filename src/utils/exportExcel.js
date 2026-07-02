import * as XLSX from 'xlsx';

/**
 * Build an Excel workbook from sheet definitions.
 * @param {{ name: string, rows?: object[], headers?: string[], data?: unknown[][] }[]} sheets
 */
export function buildWorkbook(sheets) {
  const wb = XLSX.utils.book_new();

  for (const sheet of sheets) {
    let ws;
    if (sheet.rows?.length) {
      ws = XLSX.utils.json_to_sheet(sheet.rows, sheet.headers ? { header: sheet.headers } : undefined);
    } else if (sheet.data?.length) {
      ws = XLSX.utils.aoa_to_sheet(sheet.data);
    } else {
      ws = XLSX.utils.aoa_to_sheet([['No data']]);
    }

    if (sheet.colWidths?.length) {
      ws['!cols'] = sheet.colWidths.map((w) => ({ wch: w }));
    }

    XLSX.utils.book_append_sheet(wb, ws, (sheet.name || 'Sheet').slice(0, 31));
  }

  return wb;
}

export function downloadWorkbook(workbook, filename) {
  const safeName = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
  XLSX.writeFile(workbook, safeName);
}

export function exportSheets(filename, sheets) {
  downloadWorkbook(buildWorkbook(sheets), filename);
}
