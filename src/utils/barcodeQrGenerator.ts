// Code128 Barcode Pattern Table (107 patterns: 6 bars/spaces widths each)
const CODE128_PATTERNS: string[] = [
  '212222', '222122', '222221', '121223', '121322', '131222', '122213', '122312', '132212', '221213',
  '221312', '231212', '112232', '122132', '122231', '113222', '123122', '123221', '223211', '221132',
  '221231', '213212', '223112', '312131', '311222', '321122', '321221', '312212', '322112', '322211',
  '212123', '212321', '202131', '111323', '131123', '131321', '112313', '132113', '132311', '211313',
  '231113', '231311', '112133', '112331', '132131', '113123', '113321', '133121', '313121', '211331',
  '231131', '213113', '213311', '213131', '311123', '311321', '331121', '312113', '312311', '332111',
  '314111', '221411', '431111', '111224', '111422', '121124', '121421', '141122', '141221', '112214',
  '112412', '122114', '122411', '142112', '142211', '241211', '221114', '413111', '241112', '134111',
  '111242', '121142', '121241', '114212', '124112', '124211', '411212', '421112', '421211', '212141',
  '214121', '412121', '111143', '111341', '131141', '114113', '114311', '411113', '411311', '113141',
  '114131', '311141', '411131', '211412', '211214', '211232', '2331112'
];

/**
 * Encodes text into Code128 Auto/B pattern bar widths
 */
export function encodeCode128(text: string): number[] {
  const clean = (text || 'BC-00000').trim();
  const patternIndices: number[] = [104]; // Start Code B

  for (let i = 0; i < clean.length; i++) {
    const code = clean.charCodeAt(i);
    const value = code >= 32 && code <= 126 ? code - 32 : 0;
    patternIndices.push(value);
  }

  // Calculate Checksum (StartVal + sum(i * value)) % 103
  let checksum = patternIndices[0];
  for (let i = 1; i < patternIndices.length; i++) {
    checksum += i * patternIndices[i];
  }
  patternIndices.push(checksum % 103);
  patternIndices.push(106); // Stop Code

  // Convert to widths array
  const widths: number[] = [];
  for (const idx of patternIndices) {
    const patternStr = CODE128_PATTERNS[idx] || CODE128_PATTERNS[0];
    for (let charIdx = 0; charIdx < patternStr.length; charIdx++) {
      widths.push(parseInt(patternStr[charIdx], 10));
    }
  }
  return widths;
}

/**
 * Generates an SVG string for a Code128 Barcode
 */
export function generateBarcodeSvgString(text: string, options?: { height?: number; quietZone?: number }): string {
  const height = options?.height || 50;
  const quietZone = options?.quietZone || 15;
  const barWidth = 2;
  const widths = encodeCode128(text);

  let totalWidth = quietZone * 2;
  for (const w of widths) {
    totalWidth += w * barWidth;
  }

  let x = quietZone;
  let barsSvg = '';

  for (let i = 0; i < widths.length; i++) {
    const width = widths[i] * barWidth;
    const isBar = i % 2 === 0;
    if (isBar) {
      barsSvg += `<rect x="${x}" y="10" width="${width}" height="${height}" fill="#0f172a" />`;
    }
    x += width;
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalWidth} ${height + 30}" width="${totalWidth}" height="${height + 30}" style="background-color: #ffffff;">
    <style>
      .barcode-text { font-family: monospace; font-weight: 700; font-size: 13px; fill: #0f172a; text-anchor: middle; letter-spacing: 2px; }
    </style>
    <rect width="${totalWidth}" height="${height + 30}" fill="#ffffff" />
    ${barsSvg}
    <text x="${totalWidth / 2}" y="${height + 24}" class="barcode-text">${text}</text>
  </svg>`;

  return svg;
}

/**
 * Simple 2D QR Matrix Generator for Library Labels
 * Generates standard 21x21 QR Version 1 layout with finder patterns and data grid
 */
export function generateQrMatrix(dataStr: string): boolean[][] {
  const size = 21; // 21x21 Version 1 QR matrix
  const matrix: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));

  // Helper to place 7x7 Finder Pattern at (row, col)
  const addFinderPattern = (startRow: number, startCol: number) => {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        if (r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4)) {
          matrix[startRow + r][startCol + c] = true;
        }
      }
    }
  };

  // 1. Finder Patterns (Top-Left, Top-Right, Bottom-Left)
  addFinderPattern(0, 0);
  addFinderPattern(0, size - 7);
  addFinderPattern(size - 7, 0);

  // 2. Timing Patterns (Row 6, Col 6)
  for (let i = 8; i < size - 8; i++) {
    matrix[6][i] = i % 2 === 0;
    matrix[i][6] = i % 2 === 0;
  }

  // Dark module
  matrix[size - 8][8] = true;

  // 3. Hash Data String to fill data area deterministically
  let hash = 5381;
  for (let i = 0; i < dataStr.length; i++) {
    hash = (hash * 33) ^ dataStr.charCodeAt(i);
  }

  // Populate data modules outside finder and timing regions
  let bitIndex = 0;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const isTopLeftFinder = r < 8 && c < 8;
      const isTopRightFinder = r < 8 && c >= size - 8;
      const isBottomLeftFinder = r >= size - 8 && c < 8;
      const isTiming = r === 6 || c === 6;

      if (!isTopLeftFinder && !isTopRightFinder && !isBottomLeftFinder && !isTiming) {
        const charCode = dataStr.charCodeAt(bitIndex % dataStr.length) || 65;
        const bit = ((hash >> (bitIndex % 30)) ^ charCode ^ (r * size + c)) % 2 === 0;
        matrix[r][c] = bit;
        bitIndex++;
      }
    }
  }

  return matrix;
}

/**
 * Generates SVG string for QR Code
 */
export function generateQrSvgString(text: string, sizePx: number = 160): string {
  const matrix = generateQrMatrix(text);
  const matrixSize = matrix.length;
  const padding = 2; // quiet zone in module count
  const totalModules = matrixSize + padding * 2;
  const moduleSize = sizePx / totalModules;

  let pathData = '';
  for (let r = 0; r < matrixSize; r++) {
    for (let c = 0; c < matrixSize; c++) {
      if (matrix[r][c]) {
        const x = (c + padding) * moduleSize;
        const y = (r + padding) * moduleSize;
        pathData += `M${x.toFixed(2)},${y.toFixed(2)}h${moduleSize.toFixed(2)}v${moduleSize.toFixed(2)}h-${moduleSize.toFixed(2)}z `;
      }
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${sizePx} ${sizePx}" width="${sizePx}" height="${sizePx}" style="background-color: #ffffff;">
    <rect width="${sizePx}" height="${sizePx}" fill="#ffffff" />
    <path d="${pathData}" fill="#0f172a" />
  </svg>`;
}

/**
 * Convert SVG string to Data URL (for <img> tags or direct download)
 */
export function svgToDataUrl(svgString: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgString)}`;
}

/**
 * Trigger download of SVG or PNG image file
 */
export function downloadBarcodeOrQrFile(svgString: string, filename: string, format: 'svg' | 'png' = 'png') {
  if (format === 'svg') {
    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return;
  }

  // PNG Download via Canvas
  const img = new Image();
  const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);

  img.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = img.width || 400;
    canvas.height = img.height || 200;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      const pngUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = pngUrl;
      a.download = `${filename}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
    URL.revokeObjectURL(url);
  };
  img.src = url;
}

/**
 * Print formatted label stickers sheet (single or bulk)
 */
export function printLabelStickers(labels: Array<{
  bookTitle: string;
  authorName: string;
  accessionNo: string;
  barcode: string;
  qrCode: string;
  rackNumber: string;
  shelfNumber: string;
  callNo?: string;
  department?: string;
}>) {
  const printWindow = window.open('', '_blank', 'width=900,height=700');
  if (!printWindow) return;

  const labelItemsHtml = labels
    .map((l) => {
      const barcodeSvg = generateBarcodeSvgString(l.barcode, { height: 40 });
      const qrSvg = generateQrSvgString(l.qrCode || `QR-${l.barcode}`, 90);

      return `
        <div class="label-card">
          <div class="label-header">
            <div class="university-tag">LIBRARY CATALOG ASSET</div>
            <div class="dept-tag">${l.department || 'GENERAL'}</div>
          </div>

          <div class="book-info">
            <div class="book-title">${l.bookTitle}</div>
            <div class="book-author">By ${l.authorName}</div>
          </div>

          <div class="codes-row">
            <div class="barcode-box">
              ${barcodeSvg}
            </div>
            <div class="qr-box">
              ${qrSvg}
            </div>
          </div>

          <div class="label-footer">
            <span class="acc-badge">ACC: <strong>${l.accessionNo}</strong></span>
            <span class="location-badge">LOC: <strong>${l.rackNumber || 'RACK-CS-01'} / ${l.shelfNumber || 'SHELF-A1'}</strong></span>
          </div>
        </div>
      `;
    })
    .join('');

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Print Barcode & QR Code Labels</title>
        <style>
          @page {
            size: A4;
            margin: 10mm;
          }
          body {
            font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background-color: #ffffff;
            margin: 0;
            padding: 10px;
            color: #0f172a;
          }
          .grid-container {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 12px;
          }
          .label-card {
            border: 2px solid #0f172a;
            border-radius: 8px;
            padding: 10px 12px;
            box-sizing: border-box;
            background: #ffffff;
            page-break-inside: avoid;
            display: flex;
            flex-direction: column;
            justify-between;
          }
          .label-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1.5px solid #cbd5e1;
            padding-bottom: 4px;
            margin-bottom: 6px;
          }
          .university-tag {
            font-size: 9px;
            font-weight: 800;
            letter-spacing: 0.5px;
            color: #6b21a8;
          }
          .dept-tag {
            font-size: 8px;
            font-weight: 700;
            background: #f1f5f9;
            padding: 2px 5px;
            border-radius: 4px;
          }
          .book-title {
            font-size: 11px;
            font-weight: 800;
            line-height: 1.2;
            color: #0f172a;
            max-height: 26px;
            overflow: hidden;
          }
          .book-author {
            font-size: 9px;
            font-weight: 600;
            color: #475569;
            margin-top: 1px;
          }
          .codes-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin: 6px 0;
            gap: 8px;
          }
          .barcode-box {
            flex: 1;
            display: flex;
            justify-content: center;
            align-items: center;
          }
          .barcode-box svg {
            max-width: 100%;
            height: auto;
          }
          .qr-box {
            width: 70px;
            height: 70px;
            display: flex;
            justify-content: center;
            align-items: center;
          }
          .qr-box svg {
            width: 70px;
            height: 70px;
          }
          .label-footer {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-top: 1.5px dashed #e2e8f0;
            padding-top: 5px;
            font-size: 9px;
            font-family: monospace;
          }
          .acc-badge strong, .location-badge strong {
            color: #0f172a;
          }
        </style>
      </head>
      <body>
        <div class="grid-container">
          ${labelItemsHtml}
        </div>
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 400);
          };
        </script>
      </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}
