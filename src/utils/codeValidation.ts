/**
 * Section-Specific Barcode & QR Code Classifier and Validator
 *
 * Enforces strict module isolation:
 * - BOOK_COPY: Book Issue (Step 2), Return, Renewal, Book Inventory, Catalog
 * - MEMBER_CARD: Attendance Gate, Member Identification, Issue (Step 1), Return (Step 1)
 * - RACK_SHELF: Rack & Shelf Location Layout, Shelf Inventory
 * - ISBN: Book Catalog ISBN Lookup & Auto-Fetch
 * - NO_DUE: No Due Clearance Certificate Desk
 */

export type CodeType =
  | 'BOOK_COPY'
  | 'MEMBER_CARD'
  | 'RACK_SHELF'
  | 'ISBN'
  | 'NO_DUE'
  | 'UNKNOWN';

export const INVALID_SECTION_SCAN_MESSAGE =
  'Invalid scan for this section. Please scan the correct code.';

/**
 * Normalizes and cleans raw scanned strings from hardware scanners,
 * JSON payloads, URL queries, and camera decoders.
 */
export function normalizeScannedCode(raw: string): string {
  let str = (raw || '').trim();

  // Strip JSON wrapper if scanned as QR object
  if ((str.startsWith('{') && str.endsWith('}')) || (str.startsWith('[') && str.endsWith(']'))) {
    try {
      const obj = JSON.parse(str);
      str =
        obj.barcode ||
        obj.accessionNo ||
        obj.memberCardNo ||
        obj.studentId ||
        obj.isbn ||
        obj.rackNumber ||
        obj.shelfNumber ||
        obj.certificateNumber ||
        obj.id ||
        str;
    } catch {}
  }

  // Strip URL query params if QR encoded URL
  if (str.startsWith('http://') || str.startsWith('https://')) {
    try {
      const url = new URL(str);
      const q =
        url.searchParams.get('barcode') ||
        url.searchParams.get('isbn') ||
        url.searchParams.get('code') ||
        url.searchParams.get('id') ||
        url.searchParams.get('acc');
      if (q) str = q;
    } catch {}
  }

  // Strip control chars and outer whitespace
  str = str.replace(/[\r\n"']/g, '').trim();

  return str;
}

/**
 * Identifies the specific CodeType of a given barcode or QR code.
 */
export function detectCodeType(rawCode: string, state?: any): CodeType {
  const code = normalizeScannedCode(rawCode);
  if (!code) return 'UNKNOWN';

  const lower = code.toLowerCase();
  const upper = code.toUpperCase();

  // 1. NO DUE CERTIFICATES
  if (
    upper.startsWith('NDC-') ||
    upper.startsWith('QR-NDC-') ||
    upper.startsWith('CERT-') ||
    upper.includes('NO-DUE')
  ) {
    return 'NO_DUE';
  }

  // 2. MEMBER / STUDENT / FACULTY / ADMIN LIBRARY CARDS & BARCODES
  if (
    upper.startsWith('STU-') ||
    upper.startsWith('QR-STU-') ||
    upper.startsWith('FAC-') ||
    upper.startsWith('QR-FAC-') ||
    upper.startsWith('ADM-') ||
    upper.startsWith('QR-ADM-') ||
    upper.startsWith('LIB-') ||
    upper.startsWith('QR-LIB-') ||
    upper.startsWith('STA-') ||
    upper.startsWith('QR-STA-') ||
    upper.startsWith('RES-') ||
    upper.startsWith('QR-RES-') ||
    upper.startsWith('OTH-') ||
    upper.startsWith('QR-OTH-') ||
    upper.startsWith('CARD-') ||
    upper.startsWith('QR-CARD-') ||
    upper.startsWith('MEM-') ||
    upper.startsWith('QR-MEM-') ||
    upper.startsWith('MBC-') ||
    upper.startsWith('QR-MBC-') ||
    upper.startsWith('APP-') ||
    lower.includes('@')
  ) {
    return 'MEMBER_CARD';
  }

  // 3. RACK & SHELF LOCATION TAGS
  if (
    upper.startsWith('RACK-') ||
    upper.startsWith('RACK:') ||
    upper.startsWith('SHELF-') ||
    upper.startsWith('SHELF:') ||
    /^R\d{2}$/i.test(code) ||
    /^R\d{2}-S\d{2}$/i.test(code) ||
    /^RC-[A-Z0-9]+$/i.test(code) ||
    /^SH-[A-Z0-9]+$/i.test(code)
  ) {
    return 'RACK_SHELF';
  }

  // 4. ISBN (10-digit or 13-digit standard book barcode)
  if (
    /^(978|979)[-0-9]{10,14}$/.test(code.replace(/\s/g, '')) ||
    /^[0-9]{13}$/.test(code.replace(/[^0-9]/g, ''))
  ) {
    return 'ISBN';
  }

  // 5. BOOK PHYSICAL COPIES (Barcodes & Accession Numbers)
  if (
    upper.startsWith('BC-') ||
    upper.startsWith('QR-BC-') ||
    upper.startsWith('ACC-') ||
    upper.startsWith('QR-ACC-') ||
    upper.startsWith('COPY-') ||
    upper.startsWith('BOOK-')
  ) {
    return 'BOOK_COPY';
  }

  // 6. Cross-check against active store data if available
  if (state) {
    // Check if it belongs to any Member
    if (state.members && Array.isArray(state.members)) {
      const isMember = state.members.some(
        (m: any) =>
          m.memberCardNo?.toLowerCase() === lower ||
          m.barcode?.toLowerCase() === lower ||
          m.id?.toLowerCase() === lower ||
          m.rollNo?.toLowerCase() === lower ||
          `qr-${m.memberCardNo?.toLowerCase()}` === lower ||
          `qr-${m.barcode?.toLowerCase()}` === lower
      );
      if (isMember) return 'MEMBER_CARD';
    }

    // Check if it belongs to any Book Copy
    if (state.books && Array.isArray(state.books)) {
      for (const b of state.books) {
        if (b.copies && Array.isArray(b.copies)) {
          const isCopy = b.copies.some(
            (c: any) =>
              c.barcode?.toLowerCase() === lower ||
              c.accessionNo?.toLowerCase() === lower ||
              c.id?.toLowerCase() === lower ||
              c.qrCode?.toLowerCase() === lower ||
              `qr-${c.barcode?.toLowerCase()}` === lower
          );
          if (isCopy) return 'BOOK_COPY';
        }
      }
    }

    // Check if it belongs to Racks/Shelves
    if (state.racks && Array.isArray(state.racks)) {
      const isRack = state.racks.some(
        (r: any) =>
          r.rackCode?.toLowerCase() === lower ||
          r.rackId?.toLowerCase() === lower ||
          r.shelves?.some((s: any) => s.shelfId?.toLowerCase() === lower || `${r.shortCode}-${s.shelfId}`.toLowerCase() === lower)
      );
      if (isRack) return 'RACK_SHELF';
    }
  }

  // Default fallback check
  return 'UNKNOWN';
}

/**
 * Validates whether a scanned code is allowed for the target section.
 * Rejects invalid scans with the standardized error message.
 */
export function validateCodeForSection(
  rawCode: string,
  expectedSection: CodeType | CodeType[],
  state?: any
): {
  isValid: boolean;
  detectedType: CodeType;
  cleanCode: string;
  error?: string;
} {
  const cleanCode = normalizeScannedCode(rawCode);
  if (!cleanCode) {
    return {
      isValid: false,
      detectedType: 'UNKNOWN',
      cleanCode: '',
      error: INVALID_SECTION_SCAN_MESSAGE,
    };
  }

  const detectedType = detectCodeType(cleanCode, state);
  const allowedTypes = Array.isArray(expectedSection) ? expectedSection : [expectedSection];

  // If section allows ANY code (e.g. general search)
  if (allowedTypes.includes('UNKNOWN')) {
    return { isValid: true, detectedType, cleanCode };
  }

  // If detected type matches allowed types
  if (allowedTypes.includes(detectedType)) {
    return { isValid: true, detectedType, cleanCode };
  }

  // Rejection with mandatory standardized message
  return {
    isValid: false,
    detectedType,
    cleanCode,
    error: INVALID_SECTION_SCAN_MESSAGE,
  };
}

/**
 * Resolves a Member from a raw scanned string (Barcode, Card ID, Email, Roll No)
 * and validates their approval and activation status.
 */
export function findMemberByScannedCode(
  rawCode: string,
  state: any
): {
  found: boolean;
  member?: any;
  status?: string;
  error?: string;
  cleanCode: string;
} {
  const cleanCode = normalizeScannedCode(rawCode);
  if (!cleanCode) {
    return { found: false, cleanCode: '', error: 'Please scan or enter a valid Member Barcode / ID.' };
  }

  // 1. Cross-section check
  const val = validateCodeForSection(cleanCode, 'MEMBER_CARD', state);
  if (!val.isValid) {
    return { found: false, cleanCode, error: INVALID_SECTION_SCAN_MESSAGE };
  }

  const lower = cleanCode.toLowerCase();
  const norm = lower.replace(/[^a-z0-9]/g, '');
  const noPrefix = lower.replace(/^(qr-|bc-|card-|id-|stu-|fac-|adm-|lib-|sta-|res-|mem-|mbc-)/i, '').replace(/[^a-z0-9]/g, '');

  const members: any[] = state?.members || [];

  const member = members.find((m) => {
    const cLower = (m.memberCardNo || '').toLowerCase();
    const bLower = (m.barcode || '').toLowerCase();
    const idLower = (m.id || '').toLowerCase();
    const eLower = (m.email || '').toLowerCase();
    const rLower = (m.rollNo || '').toLowerCase();

    // Exact matches
    if (cLower === lower || bLower === lower || idLower === lower || eLower === lower || rLower === lower) {
      return true;
    }

    // Normalized matches
    const cNorm = cLower.replace(/[^a-z0-9]/g, '');
    const bNorm = bLower.replace(/[^a-z0-9]/g, '');
    const idNorm = idLower.replace(/[^a-z0-9]/g, '');
    const eNorm = eLower.replace(/[^a-z0-9]/g, '');
    const rNorm = rLower.replace(/[^a-z0-9]/g, '');

    if (norm.length > 0 && (cNorm === norm || bNorm === norm || idNorm === norm || eNorm === norm || rNorm === norm)) {
      return true;
    }

    // Prefix-stripped match
    const cNoPrefix = cLower.replace(/^(qr-|bc-|card-|id-|stu-|fac-|adm-|lib-|sta-|res-|mem-|mbc-)/i, '').replace(/[^a-z0-9]/g, '');
    const bNoPrefix = bLower.replace(/^(qr-|bc-|card-|id-|stu-|fac-|adm-|lib-|sta-|res-|mem-|mbc-)/i, '').replace(/[^a-z0-9]/g, '');

    if (noPrefix.length > 0 && (cNoPrefix === noPrefix || bNoPrefix === noPrefix || cNorm === noPrefix)) {
      return true;
    }

    return false;
  });

  if (!member) {
    return {
      found: false,
      cleanCode,
      error: `No registered member found matching Barcode / ID "${cleanCode}".`,
    };
  }

  // 2. Validate member account approval & status
  if (member.status === 'PENDING_APPROVAL') {
    return {
      found: false,
      member,
      status: 'PENDING_APPROVAL',
      cleanCode,
      error: `Member "${member.name}" is pending administrator approval. Barcode is inactive.`,
    };
  }

  if (member.status === 'SUSPENDED') {
    return {
      found: false,
      member,
      status: 'SUSPENDED',
      cleanCode,
      error: `Member account for "${member.name}" is SUSPENDED (${member.suspendedReason || 'Administrative hold'}). Library privileges disabled.`,
    };
  }

  if (member.status === 'REJECTED') {
    return {
      found: false,
      member,
      status: 'REJECTED',
      cleanCode,
      error: `Member application for "${member.name}" was REJECTED. Barcode is invalid.`,
    };
  }

  if (member.status === 'INACTIVE') {
    return {
      found: false,
      member,
      status: 'INACTIVE',
      cleanCode,
      error: `Member account for "${member.name}" is INACTIVE. Please contact the library administration.`,
    };
  }

  // Active member
  return {
    found: true,
    member,
    status: 'ACTIVE',
    cleanCode,
  };
}
