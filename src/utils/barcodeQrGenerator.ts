// Code128 Barcode Pattern Table (107 patterns: 6 bars/spaces widths each, stop pattern has 7)
const CODE128_PATTERNS: string[] = [
  '212222', '222122', '222221', '121223', '121322', '131222', '122213', '122312', '132212', '221213',
  '221312', '231212', '112232', '122132', '122231', '113222', '123122', '123221', '223211', '221132',
  '221231', '213212', '223112', '312131', '311222', '321122', '321221', '312212', '322112', '322211',
  '212123', '212321', '232121', '111323', '131123', '131321', '112313', '132113', '132311', '211313',
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
 * Generates an SVG string for a Code128 Barcode with proper quiet zones (min 10x module width) and pure black contrast
 */
export function generateBarcodeSvgString(text: string, options?: { height?: number; quietZone?: number }): string {
  const height = options?.height || 50;
  const barWidth = 2;
  // Code 128 standard requires quiet zone of at least 10x module width (10 * 2 = 20px)
  const quietZone = Math.max(options?.quietZone || 20, 20);
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
      barsSvg += `<rect x="${x}" y="10" width="${width}" height="${height}" fill="#000000" />`;
    }
    x += width;
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalWidth} ${height + 30}" width="${totalWidth}" height="${height + 30}" style="background-color: #ffffff;">
    <style>
      .barcode-text { font-family: monospace; font-weight: 700; font-size: 13px; fill: #000000; text-anchor: middle; letter-spacing: 2px; }
    </style>
    <rect width="${totalWidth}" height="${height + 30}" fill="#ffffff" />
    ${barsSvg}
    <text x="${totalWidth / 2}" y="${height + 24}" class="barcode-text">${text}</text>
  </svg>`;

  return svg;
}

/**
 * Standard ISO/IEC 18004 2D QR Matrix Engine
 */
class QrCodeGenerator {
  typeNumber: number;
  errorCorrectionLevel: number;
  modules: boolean[][] | null = null;
  moduleCount = 0;
  dataCache: number[] | null = null;
  dataList: Qr8BitByte[] = [];

  constructor(typeNumber: number, errorCorrectionLevel: number) {
    this.typeNumber = typeNumber;
    this.errorCorrectionLevel = errorCorrectionLevel; // L:1, M:0, Q:3, H:2
  }

  addData(data: string) {
    this.dataList.push(new Qr8BitByte(data));
  }

  make() {
    this.makeImpl(false, this.getBestMaskPattern());
  }

  makeImpl(test: boolean, maskPattern: number) {
    this.moduleCount = this.typeNumber * 4 + 17;
    this.modules = new Array(this.moduleCount);
    for (let row = 0; row < this.moduleCount; row++) {
      this.modules[row] = new Array(this.moduleCount).fill(false);
    }
    this.setupPositionProbePattern(0, 0);
    this.setupPositionProbePattern(this.moduleCount - 7, 0);
    this.setupPositionProbePattern(0, this.moduleCount - 7);
    this.setupPositionAdjustPattern();
    this.setupTimingPattern();
    this.setupTypeInfo(test, maskPattern);
    if (this.typeNumber >= 7) {
      this.setupTypeNumber(test);
    }
    if (this.dataCache == null) {
      this.dataCache = QrCodeGenerator.createData(this.typeNumber, this.errorCorrectionLevel, this.dataList);
    }
    this.mapData(this.dataCache, maskPattern);
  }

  setupPositionProbePattern(row: number, col: number) {
    for (let r = -1; r <= 7; r++) {
      if (row + r <= -1 || this.moduleCount <= row + r) continue;
      for (let c = -1; c <= 7; c++) {
        if (col + c <= -1 || this.moduleCount <= col + c) continue;
        if (
          (0 <= r && r <= 6 && (c === 0 || c === 6)) ||
          (0 <= c && c <= 6 && (r === 0 || r === 6)) ||
          (2 <= r && r <= 4 && 2 <= c && c <= 4)
        ) {
          this.modules![row + r][col + c] = true;
        } else {
          this.modules![row + r][col + c] = false;
        }
      }
    }
  }

  getBestMaskPattern(): number {
    let minLostPoint = 0;
    let pattern = 0;
    for (let i = 0; i < 8; i++) {
      this.makeImpl(true, i);
      const lostPoint = QrUtil.getLostPoint(this);
      if (i === 0 || minLostPoint > lostPoint) {
        minLostPoint = lostPoint;
        pattern = i;
      }
    }
    return pattern;
  }

  setupTimingPattern() {
    for (let r = 8; r < this.moduleCount - 8; r++) {
      if (this.modules![r][6] !== false) continue;
      this.modules![r][6] = r % 2 === 0;
    }
    for (let c = 8; c < this.moduleCount - 8; c++) {
      if (this.modules![6][c] !== false) continue;
      this.modules![6][c] = c % 2 === 0;
    }
  }

  setupPositionAdjustPattern() {
    const pos = QrUtil.getPatternPosition(this.typeNumber);
    for (let i = 0; i < pos.length; i++) {
      for (let j = 0; j < pos.length; j++) {
        const row = pos[i];
        const col = pos[j];
        if (this.modules![row][col] !== false) continue;
        for (let r = -2; r <= 2; r++) {
          for (let c = -2; c <= 2; c++) {
            if (r === -2 || r === 2 || c === -2 || c === 2 || (r === 0 && c === 0)) {
              this.modules![row + r][col + c] = true;
            } else {
              this.modules![row + r][col + c] = false;
            }
          }
        }
      }
    }
  }

  setupTypeInfo(test: boolean, maskPattern: number) {
    const data = (this.errorCorrectionLevel << 3) | maskPattern;
    const bits = QrUtil.getBCHTypeInfo(data);
    for (let i = 0; i < 15; i++) {
      const mod = !test && ((bits >> i) & 1) === 1;
      if (i < 6) {
        this.modules![i][8] = mod;
      } else if (i < 8) {
        this.modules![i + 1][8] = mod;
      } else {
        this.modules![this.moduleCount - 15 + i][8] = mod;
      }
    }
    for (let i = 0; i < 15; i++) {
      const mod = !test && ((bits >> i) & 1) === 1;
      if (i < 8) {
        this.modules![8][this.moduleCount - i - 1] = mod;
      } else if (i < 9) {
        this.modules![8][15 - i - 1 + 1] = mod;
      } else {
        this.modules![8][15 - i - 1] = mod;
      }
    }
    this.modules![this.moduleCount - 8][8] = !test;
  }

  setupTypeNumber(test: boolean) {
    const bits = QrUtil.getBCHTypeNumber(this.typeNumber);
    for (let i = 0; i < 18; i++) {
      const mod = !test && ((bits >> i) & 1) === 1;
      this.modules![Math.floor(i / 3)][(i % 3) + this.moduleCount - 8 - 3] = mod;
      this.modules![(i % 3) + this.moduleCount - 8 - 3][Math.floor(i / 3)] = mod;
    }
  }

  mapData(data: number[], maskPattern: number) {
    let inc = -1;
    let row = this.moduleCount - 1;
    let bitIndex = 7;
    let byteIndex = 0;

    for (let col = this.moduleCount - 1; col > 0; col -= 2) {
      if (col === 6) col--;
      while (true) {
        for (let c = 0; c < 2; c++) {
          if (this.modules![row][col - c] === false) {
            let dark = false;
            if (byteIndex < data.length) {
              dark = ((data[byteIndex] >>> bitIndex) & 1) === 1;
            }
            const mask = QrUtil.getMask(maskPattern, row, col - c);
            if (mask) {
              dark = !dark;
            }
            this.modules![row][col - c] = dark;
            bitIndex--;
            if (bitIndex === -1) {
              byteIndex++;
              bitIndex = 7;
            }
          }
        }
        row += inc;
        if (row < 0 || this.moduleCount <= row) {
          row -= inc;
          inc = -inc;
          break;
        }
      }
    }
  }

  static createData(typeNumber: number, errorCorrectionLevel: number, dataList: Qr8BitByte[]): number[] {
    const rsBlocks = QrRSBlock.getRSBlocks(typeNumber, errorCorrectionLevel);
    const buffer = new QrBitBuffer();
    for (let i = 0; i < dataList.length; i++) {
      const data = dataList[i];
      buffer.put(data.mode, 4);
      buffer.put(data.getLength(), QrUtil.getLengthInBits(data.mode, typeNumber));
      data.write(buffer);
    }
    let totalDataCount = 0;
    for (let i = 0; i < rsBlocks.length; i++) {
      totalDataCount += rsBlocks[i].dataCount;
    }
    if (buffer.getLengthInBits() > totalDataCount * 8) {
      throw new Error('Code length overflow');
    }
    if (buffer.getLengthInBits() + 4 <= totalDataCount * 8) {
      buffer.put(0, 4);
    }
    while (buffer.getLengthInBits() % 8 !== 0) {
      buffer.putBit(false);
    }
    while (true) {
      if (buffer.getLengthInBits() >= totalDataCount * 8) break;
      buffer.put(0xec, 8);
      if (buffer.getLengthInBits() >= totalDataCount * 8) break;
      buffer.put(0x11, 8);
    }
    return QrCodeGenerator.createBytes(buffer, rsBlocks);
  }

  static createBytes(buffer: QrBitBuffer, rsBlocks: QrRSBlock[]): number[] {
    let offset = 0;
    let maxDcCount = 0;
    let maxEcCount = 0;
    const dcdata: number[][] = new Array(rsBlocks.length);
    const ecdata: number[][] = new Array(rsBlocks.length);

    for (let r = 0; r < rsBlocks.length; r++) {
      const dcCount = rsBlocks[r].dataCount;
      const ecCount = rsBlocks[r].totalCount - dcCount;
      maxDcCount = Math.max(maxDcCount, dcCount);
      maxEcCount = Math.max(maxEcCount, ecCount);
      dcdata[r] = new Array(dcCount);
      for (let i = 0; i < dcdata[r].length; i++) {
        dcdata[r][i] = 0xff & buffer.buffer[i + offset];
      }
      offset += dcCount;
      const rsPoly = QrUtil.getErrorCorrectionPolynomial(ecCount);
      const rawPoly = new QrPolynomial(dcdata[r], rsPoly.getLength() - 1);
      const modPoly = rawPoly.mod(rsPoly);
      ecdata[r] = new Array(rsPoly.getLength() - 1);
      for (let i = 0; i < ecdata[r].length; i++) {
        const modIndex = i + modPoly.getLength() - ecdata[r].length;
        ecdata[r][i] = modIndex >= 0 ? modPoly.get(modIndex) : 0;
      }
    }

    let totalCodeCount = 0;
    for (let i = 0; i < rsBlocks.length; i++) {
      totalCodeCount += rsBlocks[i].totalCount;
    }
    const data: number[] = new Array(totalCodeCount);
    let index = 0;

    for (let i = 0; i < maxDcCount; i++) {
      for (let r = 0; r < rsBlocks.length; r++) {
        if (i < dcdata[r].length) {
          data[index++] = dcdata[r][i];
        }
      }
    }
    for (let i = 0; i < maxEcCount; i++) {
      for (let r = 0; r < rsBlocks.length; r++) {
        if (i < ecdata[r].length) {
          data[index++] = ecdata[r][i];
        }
      }
    }
    return data;
  }
}

class Qr8BitByte {
  mode = 1 << 2; // 8-bit byte mode
  data: string;
  constructor(data: string) {
    this.data = data;
  }
  getLength(): number {
    return this.data.length;
  }
  write(buffer: QrBitBuffer) {
    for (let i = 0; i < this.data.length; i++) {
      buffer.put(this.data.charCodeAt(i), 8);
    }
  }
}

class QrBitBuffer {
  buffer: number[] = [];
  length = 0;
  getLengthInBits(): number {
    return this.length;
  }
  put(num: number, length: number) {
    for (let i = 0; i < length; i++) {
      this.putBit(((num >>> (length - i - 1)) & 1) === 1);
    }
  }
  putBit(bit: boolean) {
    const bufIndex = Math.floor(this.length / 8);
    if (this.buffer.length <= bufIndex) {
      this.buffer.push(0);
    }
    if (bit) {
      this.buffer[bufIndex] |= 0x80 >>> (this.length % 8);
    }
    this.length++;
  }
}

class QrMath {
  static EXP_TABLE = new Array<number>(256);
  static LOG_TABLE = new Array<number>(256);

  static init() {
    for (let i = 0; i < 8; i++) QrMath.EXP_TABLE[i] = 1 << i;
    for (let i = 8; i < 256; i++) {
      QrMath.EXP_TABLE[i] =
        QrMath.EXP_TABLE[i - 4] ^ QrMath.EXP_TABLE[i - 5] ^ QrMath.EXP_TABLE[i - 6] ^ QrMath.EXP_TABLE[i - 8];
    }
    for (let i = 0; i < 255; i++) QrMath.LOG_TABLE[QrMath.EXP_TABLE[i]] = i;
  }

  static glog(n: number): number {
    if (n < 1) throw new Error('glog(' + n + ')');
    return QrMath.LOG_TABLE[n];
  }
  static gexp(n: number): number {
    while (n < 0) n += 255;
    while (n >= 255) n -= 255;
    return QrMath.EXP_TABLE[n];
  }
}
QrMath.init();

class QrPolynomial {
  num: number[];
  constructor(num: number[], shift: number) {
    if (num.length === undefined) throw new Error(num.length + '/' + shift);
    let offset = 0;
    while (offset < num.length && num[offset] === 0) offset++;
    this.num = new Array(num.length - offset + shift);
    for (let i = 0; i < num.length - offset; i++) this.num[i] = num[offset + i];
  }
  get(index: number): number {
    return this.num[index];
  }
  getLength(): number {
    return this.num.length;
  }
  multiply(e: QrPolynomial): QrPolynomial {
    const num = new Array(this.getLength() + e.getLength() - 1).fill(0);
    for (let i = 0; i < this.getLength(); i++) {
      for (let j = 0; j < e.getLength(); j++) {
        num[i + j] ^= QrMath.gexp(QrMath.glog(this.get(i)) + QrMath.glog(e.get(j)));
      }
    }
    return new QrPolynomial(num, 0);
  }
  mod(e: QrPolynomial): QrPolynomial {
    if (this.getLength() - e.getLength() < 0) return this;
    const ratio = QrMath.glog(this.get(0)) - QrMath.glog(e.get(0));
    const num = new Array(this.getLength());
    for (let i = 0; i < this.getLength(); i++) num[i] = this.get(i);
    for (let i = 0; i < e.getLength(); i++) {
      num[i] ^= QrMath.gexp(QrMath.glog(e.get(i)) + ratio);
    }
    return new QrPolynomial(num, 0).mod(e);
  }
}

class QrRSBlock {
  totalCount: number;
  dataCount: number;
  constructor(totalCount: number, dataCount: number) {
    this.totalCount = totalCount;
    this.dataCount = dataCount;
  }
  static getRSBlocks(typeNumber: number, errorCorrectionLevel: number): QrRSBlock[] {
    const rsBlock = QrRSBlock.getRsBlockTable(typeNumber, errorCorrectionLevel);
    if (!rsBlock) throw new Error('bad rs block @ typeNumber:' + typeNumber);
    const length = rsBlock.length / 3;
    const list: QrRSBlock[] = [];
    for (let i = 0; i < length; i++) {
      const count = rsBlock[i * 3 + 0];
      const totalCount = rsBlock[i * 3 + 1];
      const dataCount = rsBlock[i * 3 + 2];
      for (let j = 0; j < count; j++) list.push(new QrRSBlock(totalCount, dataCount));
    }
    return list;
  }
  static getRsBlockTable(typeNumber: number, errorCorrectionLevel: number): number[] | undefined {
    switch (errorCorrectionLevel) {
      case 1: // L
        return [
          [1, 26, 19], [1, 44, 34], [1, 70, 55], [1, 100, 80], [1, 134, 108],
          [2, 86, 68], [2, 98, 78], [2, 121, 97], [2, 146, 116], [2, 86, 68, 2, 87, 69]
        ][typeNumber - 1];
      case 0: // M
        return [
          [1, 26, 16], [1, 44, 28], [1, 70, 44], [1, 100, 64], [1, 134, 86],
          [2, 86, 52], [2, 98, 60], [2, 121, 65], [3, 146, 84], [4, 86, 43]
        ][typeNumber - 1];
      default:
        return [1, 26, 19];
    }
  }
}

class QrUtil {
  static getBCHTypeInfo(data: number): number {
    let d = data << 10;
    while (QrUtil.getBCHDigit(d) - QrUtil.getBCHDigit(0x537) >= 0) {
      d ^= 0x537 << (QrUtil.getBCHDigit(d) - QrUtil.getBCHDigit(0x537));
    }
    return ((data << 10) | d) ^ 0x5412;
  }
  static getBCHTypeNumber(data: number): number {
    let d = data << 12;
    while (QrUtil.getBCHDigit(d) - QrUtil.getBCHDigit(0x1f25) >= 0) {
      d ^= 0x1f25 << (QrUtil.getBCHDigit(d) - QrUtil.getBCHDigit(0x1f25));
    }
    return (data << 12) | d;
  }
  static getBCHDigit(data: number): number {
    let digit = 0;
    while (data !== 0) {
      digit++;
      data >>>= 1;
    }
    return digit;
  }
  static getPatternPosition(typeNumber: number): number[] {
    return [
      [], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34], [6, 22, 38], [6, 24, 42], [6, 26, 46], [6, 28, 50]
    ][typeNumber - 1];
  }
  static getMask(maskPattern: number, i: number, j: number): boolean {
    switch (maskPattern) {
      case 0: return (i + j) % 2 === 0;
      case 1: return i % 2 === 0;
      case 2: return j % 3 === 0;
      case 3: return (i + j) % 3 === 0;
      case 4: return (Math.floor(i / 2) + Math.floor(j / 3)) % 2 === 0;
      case 5: return (i * j) % 2 + (i * j) % 3 === 0;
      case 6: return ((i * j) % 2 + (i * j) % 3) % 2 === 0;
      case 7: return ((i * j) % 3 + (i + j) % 2) % 2 === 0;
      default: throw new Error('bad maskPattern:' + maskPattern);
    }
  }
  static getErrorCorrectionPolynomial(errorCorrectionLength: number): QrPolynomial {
    let a = new QrPolynomial([1], 0);
    for (let i = 0; i < errorCorrectionLength; i++) {
      a = a.multiply(new QrPolynomial([1, QrMath.gexp(i)], 0));
    }
    return a;
  }
  static getLengthInBits(mode: number, type: number): number {
    if (1 <= type && type < 10) {
      return 8;
    } else {
      return 16;
    }
  }
  static getLostPoint(qrCode: QrCodeGenerator): number {
    const moduleCount = qrCode.moduleCount;
    let lostPoint = 0;
    for (let row = 0; row < moduleCount; row++) {
      for (let col = 0; col < moduleCount; col++) {
        let sameCount = 0;
        const dark = qrCode.modules![row][col];
        for (let r = -1; r <= 1; r++) {
          if (row + r < 0 || moduleCount <= row + r) continue;
          for (let c = -1; c <= 1; c++) {
            if (col + c < 0 || moduleCount <= col + c) continue;
            if (r === 0 && c === 0) continue;
            if (dark === qrCode.modules![row + r][col + c]) sameCount++;
          }
        }
        if (sameCount > 5) lostPoint += 3 + sameCount - 5;
      }
    }
    return lostPoint;
  }
}

/**
 * Standard ISO/IEC 18004 2D QR Matrix Generator
 */
export function generateQrMatrix(dataStr: string): boolean[][] {
  const clean = (dataStr || 'LIB-0000').trim();
  const typeNum = clean.length <= 14 ? 1 : clean.length <= 26 ? 2 : clean.length <= 42 ? 3 : 4;
  const qr = new QrCodeGenerator(typeNum, 1); // Level L
  qr.addData(clean);
  qr.make();
  return qr.modules || [];
}

/**
 * Generates SVG string for QR Code with 100% black contrast
 */
export function generateQrSvgString(text: string, sizePx: number = 160): string {
  const matrix = generateQrMatrix(text);
  const matrixSize = matrix.length || 21;
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
    <path d="${pathData}" fill="#000000" />
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
            justify-between: space-between;
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
