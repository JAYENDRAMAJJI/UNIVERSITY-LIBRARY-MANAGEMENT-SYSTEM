// src/utils/officialDownloadsPdfGenerator.ts
// Authentic Multi-page Official University Document & PDF Generator for Download Center
import { digitalFileStorage } from './digitalFileStorage';

function escapePdfText(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function wrapText(text: string, maxCharsPerLine: number = 68): string[] {
  if (!text) return [];
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    if (!word) continue;
    if ((currentLine + (currentLine ? ' ' : '') + word).length <= maxCharsPerLine) {
      currentLine += (currentLine ? ' ' : '') + word;
    } else {
      if (currentLine) lines.push(currentLine);
      if (word.length > maxCharsPerLine) {
        let remaining = word;
        while (remaining.length > maxCharsPerLine) {
          lines.push(remaining.substring(0, maxCharsPerLine));
          remaining = remaining.substring(maxCharsPerLine);
        }
        currentLine = remaining;
      } else {
        currentLine = word;
      }
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}

interface PdfLine {
  text: string;
  isBold?: boolean;
  fontSize?: number;
  spacingAfter?: number;
}

interface PdfPage {
  lines: PdfLine[];
}

function compileTwoPagePdf(p1: PdfPage, p2: PdfPage): string {
  const buildPageStream = (page: PdfPage, pageNum: number): string => {
    let stream = 'BT\n';
    let currentY = 745;

    // Header Rule
    stream += '0.55 0.2 0.85 rg\n';
    stream += '/F1 12 Tf\n';
    stream += `1 0 0 1 45 ${currentY} Tm\n`;
    stream += `(${escapePdfText('UNIVERSITY CENTRAL LIBRARY • OFFICIAL DOCUMENT REPOSITORY')}) Tj\n`;
    currentY -= 15;

    stream += '0.3 0.35 0.45 rg\n';
    stream += '/F2 8 Tf\n';
    stream += `1 0 0 1 45 ${currentY} Tm\n`;
    stream += `(${escapePdfText(`ISO 9001:2025 Certified Academic Information System • Page ${pageNum} of 2`)}) Tj\n`;
    currentY -= 16;

    // Divider line
    stream += '0.75 0.78 0.85 rg\n';
    stream += '/F2 9 Tf\n';
    stream += `1 0 0 1 45 ${currentY} Tm\n`;
    stream += `(${escapePdfText('____________________________________________________________________________________')}) Tj\n`;
    currentY -= 22;

    for (const item of page.lines) {
      if (currentY < 65) break;
      const fSize = item.fontSize || 10;
      const isB = Boolean(item.isBold);
      const fontRef = isB ? '/F1' : '/F2';

      if (isB && fSize >= 13) {
        stream += '0.1 0.12 0.25 rg\n';
      } else if (isB) {
        stream += '0.2 0.22 0.35 rg\n';
      } else {
        stream += '0.18 0.2 0.25 rg\n';
      }

      stream += `${fontRef} ${fSize} Tf\n`;
      stream += `1 0 0 1 45 ${currentY} Tm\n`;
      stream += `(${escapePdfText(item.text)}) Tj\n`;

      const gap = item.spacingAfter !== undefined ? item.spacingAfter : Math.max(14, fSize + 4);
      currentY -= gap;
    }

    // Footer
    stream += '0.45 0.5 0.6 rg\n';
    stream += '/F2 8 Tf\n';
    stream += '1 0 0 1 45 35 Tm\n';
    stream += `(${escapePdfText('Office of the Chief Librarian • University Library & Information Services • Authorized Copy')}) Tj\n`;
    stream += 'ET\n';
    return stream;
  };

  const p1StreamText = buildPageStream(p1, 1);
  const p2StreamText = buildPageStream(p2, 2);

  const p1Len = new TextEncoder().encode(p1StreamText).length;
  const p2Len = new TextEncoder().encode(p2StreamText).length;

  const header = '%PDF-1.4\n';
  const obj1 = '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n';
  const obj2 = '2 0 obj\n<< /Type /Pages /Kids [5 0 R 7 0 R] /Count 2 >>\nendobj\n';
  const obj3 = '3 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n';
  const obj4 = '4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n';
  const obj5 = '5 0 obj\n<< /Type /Page /Parent 2 0 R /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /MediaBox [0 0 612 792] /Contents 6 0 R >>\nendobj\n';
  const obj6 = `6 0 obj\n<< /Length ${p1Len} >>\nstream\n${p1StreamText}\nendstream\nendobj\n`;
  const obj7 = '7 0 obj\n<< /Type /Page /Parent 2 0 R /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /MediaBox [0 0 612 792] /Contents 8 0 R >>\nendobj\n';
  const obj8 = `8 0 obj\n<< /Length ${p2Len} >>\nstream\n${p2StreamText}\nendstream\nendobj\n`;

  const off1 = header.length;
  const off2 = off1 + obj1.length;
  const off3 = off2 + obj2.length;
  const off4 = off3 + obj3.length;
  const off5 = off4 + obj4.length;
  const off6 = off5 + obj5.length;
  const off7 = off6 + obj6.length;
  const off8 = off7 + obj7.length;
  const startXref = off8 + obj8.length;

  const pad = (n: number) => String(n).padStart(10, '0');

  const xref = `xref\n0 9\n0000000000 65535 f \r\n${pad(off1)} 00000 n \r\n${pad(off2)} 00000 n \r\n${pad(off3)} 00000 n \r\n${pad(off4)} 00000 n \r\n${pad(off5)} 00000 n \r\n${pad(off6)} 00000 n \r\n${pad(off7)} 00000 n \r\n${pad(off8)} 00000 n \r\ntrailer\n<< /Size 9 /Root 1 0 R >>\nstartxref\n${startXref}\n%%EOF`;

  const pdfString = header + obj1 + obj2 + obj3 + obj4 + obj5 + obj6 + obj7 + obj8 + xref;
  const blob = new Blob([pdfString], { type: 'application/pdf' });
  return URL.createObjectURL(blob);
}

export function generateOfficialDownloadPdf(docTitle: string): string {
  const p1Lines: PdfLine[] = [];
  const p2Lines: PdfLine[] = [];

  // Title Section
  p1Lines.push({ text: docTitle.toUpperCase(), isBold: true, fontSize: 14, spacingAfter: 8 });
  p1Lines.push({ text: 'DOCUMENT REF: UNIV-LIB-2026-DOC-OFFICIAL • ISSUED BY CENTRAL LIBRARY', isBold: true, fontSize: 8.5, spacingAfter: 18 });

  if (docTitle.includes('Membership Registration')) {
    p1Lines.push({ text: 'SECTION 1: APPLICANT PERSONAL & ACADEMIC DETAILS', isBold: true, fontSize: 11, spacingAfter: 12 });
    p1Lines.push({ text: 'Full Name: ___________________________________  Roll / Employee No: ______________', isBold: false, fontSize: 9.5, spacingAfter: 10 });
    p1Lines.push({ text: 'Department: ________________________________  Program / Semester: ________________', isBold: false, fontSize: 9.5, spacingAfter: 10 });
    p1Lines.push({ text: 'Institutional Email: ___________________________  Mobile Contact: ___________________', isBold: false, fontSize: 9.5, spacingAfter: 10 });
    p1Lines.push({ text: 'Permanent Residential Address: __________________________________________________', isBold: false, fontSize: 9.5, spacingAfter: 18 });

    p1Lines.push({ text: 'SECTION 2: MEMBERSHIP PRIVILEGES & BORROWING LIMITS', isBold: true, fontSize: 11, spacingAfter: 12 });
    p1Lines.push({ text: '1. Undergraduate Students: Eligible to borrow up to 4 books for a duration of 14 days.', isBold: false, fontSize: 9, spacingAfter: 8 });
    p1Lines.push({ text: '2. Postgraduate & Research Scholars: Eligible for 6 books for a duration of 30 days.', isBold: false, fontSize: 9, spacingAfter: 8 });
    p1Lines.push({ text: '3. Faculty Members: Eligible for up to 10 books for an entire academic semester.', isBold: false, fontSize: 9, spacingAfter: 16 });

    p1Lines.push({ text: 'SECTION 3: TERMS OF BORROWING & CODE OF COMPLIANCE', isBold: true, fontSize: 11, spacingAfter: 10 });
    p1Lines.push({ text: 'The applicant agrees to abide by all university library circulation policies, return books on time,', isBold: false, fontSize: 9, spacingAfter: 6 });
    p1Lines.push({ text: 'and pay overdue fines in case of overdue returns. Library cards are strictly non-transferable.', isBold: false, fontSize: 9, spacingAfter: 20 });

    p2Lines.push({ text: 'SECTION 4: UNDERTAKING & SIGNATURE OF APPLICANT', isBold: true, fontSize: 11, spacingAfter: 12 });
    p2Lines.push({ text: 'I hereby declare that the information provided above is authentic. I agree to comply with', isBold: false, fontSize: 9, spacingAfter: 6 });
    p2Lines.push({ text: 'all regulations governing the University Central Library and digital databases.', isBold: false, fontSize: 9, spacingAfter: 20 });
    p2Lines.push({ text: 'Applicant Signature: _______________________      Date: ____ / ____ / 2026', isBold: true, fontSize: 9.5, spacingAfter: 24 });

    p2Lines.push({ text: 'SECTION 5: FOR OFFICIAL USE ONLY (LIBRARY CIRCULATION DESK)', isBold: true, fontSize: 11, spacingAfter: 12 });
    p2Lines.push({ text: 'Membership RFID Card Barcode No: ____________________  Issued Date: _________________', isBold: false, fontSize: 9.5, spacingAfter: 10 });
    p2Lines.push({ text: 'Account Approved By: _____________________________  Designation: _________________', isBold: false, fontSize: 9.5, spacingAfter: 18 });
    p2Lines.push({ text: 'Librarian Stamp & Signature: _______________________', isBold: true, fontSize: 9.5, spacingAfter: 10 });
  } else if (docTitle.includes('Procurement')) {
    p1Lines.push({ text: 'SECTION 1: BOOK / JOURNAL SUGGESTION REQUISITION', isBold: true, fontSize: 11, spacingAfter: 12 });
    p1Lines.push({ text: 'Requisitioner Name: ___________________________  Department: ______________________', isBold: false, fontSize: 9.5, spacingAfter: 10 });
    p1Lines.push({ text: 'Book Title: ____________________________________________________________________', isBold: false, fontSize: 9.5, spacingAfter: 10 });
    p1Lines.push({ text: 'Primary Author(s): __________________________  Publisher & Edition: _______________', isBold: false, fontSize: 9.5, spacingAfter: 10 });
    p1Lines.push({ text: 'ISBN / ISSN: _______________________________  Estimated Price: _________________', isBold: false, fontSize: 9.5, spacingAfter: 18 });

    p1Lines.push({ text: 'SECTION 2: ACADEMIC JUSTIFICATION & COURSE APPLICABILITY', isBold: true, fontSize: 11, spacingAfter: 12 });
    p1Lines.push({ text: 'Specify Subject / Course Code: _________________________________________________', isBold: false, fontSize: 9, spacingAfter: 8 });
    p1Lines.push({ text: 'Justification for Library Purchase: ____________________________________________', isBold: false, fontSize: 9, spacingAfter: 8 });
    p1Lines.push({ text: 'Number of Copies Recommended: [  ] 2 Copies  [  ] 5 Copies  [  ] Multi-volume Set', isBold: false, fontSize: 9, spacingAfter: 20 });

    p2Lines.push({ text: 'SECTION 3: DEPARTMENT HEAD APPROVAL', isBold: true, fontSize: 11, spacingAfter: 12 });
    p2Lines.push({ text: 'Head of Department Recommendation: [  ] Highly Recommended  [  ] Standard Reference', isBold: false, fontSize: 9, spacingAfter: 8 });
    p2Lines.push({ text: 'HOD Signature & Official Seal: _______________________  Date: ____ / ____ / 2026', isBold: true, fontSize: 9.5, spacingAfter: 24 });

    p2Lines.push({ text: 'SECTION 4: LIBRARY ACQUISITIONS COMMITTEE ACTION', isBold: true, fontSize: 11, spacingAfter: 12 });
    p2Lines.push({ text: 'Purchase Order No: ___________________________  Vendor Allocated: ________________', isBold: false, fontSize: 9.5, spacingAfter: 10 });
    p2Lines.push({ text: 'Chief Librarian Verification: _______________________', isBold: true, fontSize: 9.5, spacingAfter: 10 });
  } else if (docTitle.includes('No Dues')) {
    p1Lines.push({ text: 'SECTION 1: APPLICATION FOR INSTITUTIONAL NO DUES CLEARANCE', isBold: true, fontSize: 11, spacingAfter: 12 });
    p1Lines.push({ text: 'Candidate Name: _______________________________  Roll No: ________________________', isBold: false, fontSize: 9.5, spacingAfter: 10 });
    p1Lines.push({ text: 'Branch / Specialization: _______________________  Academic Year: 2025 - 2026', isBold: false, fontSize: 9.5, spacingAfter: 10 });
    p1Lines.push({ text: 'Reason for Clearance: [  ] Course Completion  [  ] Transfer / TC  [  ] Degree Certificate', isBold: false, fontSize: 9.5, spacingAfter: 18 });

    p1Lines.push({ text: 'SECTION 2: LIBRARY CIRCULATION & FINES VERIFICATION', isBold: true, fontSize: 11, spacingAfter: 12 });
    p1Lines.push({ text: '1. Active Borrowed Books Status: [  ] NIL Outstanding (0 Books)', isBold: false, fontSize: 9, spacingAfter: 8 });
    p1Lines.push({ text: '2. Overdue Fines Assessment: [  ] Zero Balance / Paid in Full', isBold: false, fontSize: 9, spacingAfter: 8 });
    p1Lines.push({ text: '3. Digital Library Lab Workstation Dues: [  ] Clear', isBold: false, fontSize: 9, spacingAfter: 20 });

    p2Lines.push({ text: 'SECTION 3: OFFICIAL CLEARANCE CERTIFICATE DECLARATION', isBold: true, fontSize: 11, spacingAfter: 12 });
    p2Lines.push({ text: 'This is to certify that the aforementioned candidate holds NO OUTSTANDING DUES, borrowed', isBold: false, fontSize: 9, spacingAfter: 6 });
    p2Lines.push({ text: 'books, or unpaid fines with the Central Library. Their membership has been cleared.', isBold: false, fontSize: 9, spacingAfter: 24 });
    p2Lines.push({ text: 'Assistant Librarian Sign: _____________________  Chief Librarian Sign: ___________________', isBold: true, fontSize: 9.5, spacingAfter: 14 });
    p2Lines.push({ text: 'Official Security Seal / Hologram Stamp Here', isBold: false, fontSize: 8.5, spacingAfter: 10 });
  } else {
    // Standard Official Policies / Curriculum / Rules Handbook
    p1Lines.push({ text: 'EXECUTIVE OVERVIEW & STATUTORY FRAMEWORK', isBold: true, fontSize: 11, spacingAfter: 12 });
    for (const paragraph of [
      'The University Library is committed to providing an exceptional environment for learning, research, and scholarly discourse. This document outlines the authoritative regulations, procedural guidelines, and operational standards applicable to all students, research scholars, and faculty members.',
      'All users are required to maintain silence, respect the intellectual property of digital and print materials, and strictly comply with the check-out and return schedules established by the University Library Committee.'
    ]) {
      const wrapped = wrapText(paragraph, 66);
      for (const line of wrapped) {
        p1Lines.push({ text: line, fontSize: 9.5, spacingAfter: 5 });
      }
      p1Lines.push({ text: '', spacingAfter: 6 });
    }

    p1Lines.push({ text: 'CORE OPERATING PRINCIPLES & GENERAL CODE OF CONDUCT', isBold: true, fontSize: 11, spacingAfter: 10 });
    p1Lines.push({ text: '1. Access: All registered members must present their RFID smart card upon entry.', isBold: false, fontSize: 9, spacingAfter: 6 });
    p1Lines.push({ text: '2. Digital Lab: Workstations are designated strictly for academic research and access to journals.', isBold: false, fontSize: 9, spacingAfter: 6 });
    p1Lines.push({ text: '3. Renewals: Books may be renewed up to 2 times online if no reservations exist.', isBold: false, fontSize: 9, spacingAfter: 14 });

    p2Lines.push({ text: 'CIRCULATION POLICIES, FINES & COMPLIANCE ENFORCEMENT', isBold: true, fontSize: 11, spacingAfter: 12 });
    p2Lines.push({ text: '1. Standard Overdue Fine: Rs. 5 per day per volume past the official due date.', isBold: false, fontSize: 9, spacingAfter: 6 });
    p2Lines.push({ text: '2. Damaged or Lost Materials: Full replacement cost plus 20% processing fee.', isBold: false, fontSize: 9, spacingAfter: 6 });
    p2Lines.push({ text: '3. Institutional Clearance: No Due certificate is mandatory prior to degree conferral.', isBold: false, fontSize: 9, spacingAfter: 16 });

    p2Lines.push({ text: 'AUTHORIZED BY THE SENATE & CHIEF LIBRARIAN', isBold: true, fontSize: 11, spacingAfter: 12 });
    p2Lines.push({ text: 'Date of Enforcement: Academic Session 2026 - 2027', isBold: false, fontSize: 9, spacingAfter: 6 });
    p2Lines.push({ text: 'University Library Management Board • All Rights Reserved.', isBold: true, fontSize: 9, spacingAfter: 10 });
  }

  return compileTwoPagePdf({ lines: p1Lines }, { lines: p2Lines });
}

export function getOfficialDocumentBlobUrl(doc: { id?: string; title: string; uploadedFileData?: string; fileType?: string }): string {
  const syncStoredData = doc.id ? digitalFileStorage.getSyncFile(doc.id) : null;
  const dataPayload = (doc.uploadedFileData && doc.uploadedFileData.startsWith('data:'))
    ? doc.uploadedFileData
    : (syncStoredData && syncStoredData.startsWith('data:'))
      ? syncStoredData
      : null;

  if (dataPayload) {
    try {
      const commaIdx = dataPayload.indexOf(',');
      if (commaIdx !== -1) {
        const header = dataPayload.substring(0, commaIdx);
        const base64 = dataPayload.substring(commaIdx + 1);
        const mimeMatch = header.match(/:(.*?);/);
        const mimeType = mimeMatch ? mimeMatch[1] : (doc.fileType || 'application/pdf');
        const byteCharacters = atob(base64);
        const byteNumbers = new Uint8Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const blob = new Blob([byteNumbers], { type: mimeType });
        return URL.createObjectURL(blob);
      }
    } catch (e) {
      console.error('Error decoding uploaded document data URL:', e);
    }
  }

  return generateOfficialDownloadPdf(doc.title);
}

export function downloadOfficialDocumentPdf(doc: { id?: string; title: string; uploadedFileData?: string; uploadedFileName?: string; fileType?: string } | string) {
  const docObj = typeof doc === 'string' ? { title: doc } : doc;
  const url = getOfficialDocumentBlobUrl(docObj);
  const rawFileName = (typeof doc !== 'string' && doc.uploadedFileName)
    ? doc.uploadedFileName
    : `${docObj.title.replace(/[^a-zA-Z0-9\s-_]/g, '').trim().replace(/\s+/g, '_')}.pdf`;
  const fileName = rawFileName.toLowerCase().endsWith('.pdf') ? rawFileName : `${rawFileName}.pdf`;

  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();

  setTimeout(() => {
    try {
      document.body.removeChild(link);
    } catch (e) {}
  }, 300);
}
