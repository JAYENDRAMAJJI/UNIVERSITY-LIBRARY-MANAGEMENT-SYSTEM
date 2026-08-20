import XLSX from 'xlsx-js-style';

export interface ExcelExportOptions {
  filename: string;
  sheetName?: string;
  headers: string[];
  data: (string | number | null | undefined)[][];
  themeColor?: string; // 6-char hex RGB without # (e.g. "4F46E5", "7C3AED", "059669")
}

/**
 * Universal Styled Excel (.xlsx) Exporter with:
 * - Colorized header rows with bold white typography
 * - Automatic dynamic column width calculation with auto-fit padding
 * - Alternating zebra row backgrounds
 * - Cell borders and alignment formatting
 */
export function exportStyledExcelFile({
  filename,
  sheetName = 'Report Data',
  headers,
  data,
  themeColor = '4F46E5', // Default Indigo/Purple
}: ExcelExportOptions) {
  // 1. Prepare raw table array
  const wsData = [headers, ...data];

  // 2. Create worksheet
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // 3. Compute Auto-Fit Column Widths based on max cell content length
  const colWidths = headers.map((header, colIdx) => {
    let maxLen = (header || '').length;
    for (let r = 0; r < data.length; r++) {
      const cellVal = data[r][colIdx];
      const strVal = cellVal !== null && cellVal !== undefined ? String(cellVal) : '';
      if (strVal.length > maxLen) {
        maxLen = strVal.length;
      }
    }
    // Add padding (min 14, max 65)
    return { wch: Math.min(Math.max(maxLen + 4, 14), 65) };
  });
  ws['!cols'] = colWidths;

  // 4. Style Header Row with themed background, bold white text, and borders
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:A1');
  const headerBgColor = themeColor.replace('#', '').toUpperCase();

  for (let c = range.s.c; c <= range.e.c; c++) {
    const cellAddress = XLSX.utils.encode_cell({ r: 0, c });
    if (ws[cellAddress]) {
      ws[cellAddress].s = {
        fill: {
          patternType: 'solid',
          fgColor: { rgb: headerBgColor },
        },
        font: {
          name: 'Calibri',
          sz: 11,
          bold: true,
          color: { rgb: 'FFFFFF' },
        },
        alignment: {
          vertical: 'center',
          horizontal: 'center',
          wrapText: false,
        },
        border: {
          top: { style: 'thin', color: { rgb: 'CBD5E1' } },
          bottom: { style: 'medium', color: { rgb: '64748B' } },
          left: { style: 'thin', color: { rgb: 'CBD5E1' } },
          right: { style: 'thin', color: { rgb: 'CBD5E1' } },
        },
      };
    }
  }

  // 5. Style Data Rows (Clean typography, zebra shading, proper alignment & borders)
  for (let r = range.s.r + 1; r <= range.e.r; r++) {
    const isEven = r % 2 === 0;
    for (let c = range.s.c; c <= range.e.c; c++) {
      const cellAddress = XLSX.utils.encode_cell({ r, c });
      if (ws[cellAddress]) {
        const val = ws[cellAddress].v;
        const isNum = typeof val === 'number';
        ws[cellAddress].s = {
          fill: isEven ? { patternType: 'solid', fgColor: { rgb: 'F8FAFC' } } : undefined,
          font: {
            name: 'Calibri',
            sz: 10,
            color: { rgb: '1E293B' },
          },
          alignment: {
            vertical: 'center',
            horizontal: isNum ? 'right' : 'left',
          },
          border: {
            top: { style: 'thin', color: { rgb: 'E2E8F0' } },
            bottom: { style: 'thin', color: { rgb: 'E2E8F0' } },
            left: { style: 'thin', color: { rgb: 'E2E8F0' } },
            right: { style: 'thin', color: { rgb: 'E2E8F0' } },
          },
        };
      }
    }
  }

  // 6. Create Workbook and Export
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName.substring(0, 31));

  const cleanFilename = filename.endsWith('.xlsx') ? filename : `${filename.replace(/\.csv$/, '')}.xlsx`;
  XLSX.writeFile(wb, cleanFilename);
}
