import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  ScanBarcode,
  UserCheck,
  CheckCircle,
  AlertCircle,
  Clock,
  Printer,
  BookOpen,
  Calendar,
  CreditCard,
  Camera,
  Search,
  ChevronDown,
  X,
  User,
  ShieldAlert,
} from 'lucide-react';
import { libraryStore, formatOnlyTimeInBracket } from '../../services/libraryStore.service';
import { MemberProfile, IssueTransaction } from '../../types/library';
import BarcodeScannerModal from '../../components/common/BarcodeScannerModal';
import { generateBarcodeSvgString } from '../../utils/barcodeQrGenerator';
import AuthorizedCirculationSeal, { generateAuthorizedSealHtml } from '../../components/common/AuthorizedCirculationSeal';

export default function IssueBooks() {
  const [searchParams] = useSearchParams();
  const [state, setState] = useState(libraryStore.snapshot);
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [accessionOrBarcode, setAccessionOrBarcode] = useState('');
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [lastIssuedReceipt, setLastIssuedReceipt] = useState<IssueTransaction | null>(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isMemberScannerOpen, setIsMemberScannerOpen] = useState(false);
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'STUDENT' | 'FACULTY' | 'STAFF'>('ALL');
  const [memberSearchTerm, setMemberSearchTerm] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [refModalBook, setRefModalBook] = useState<{ title: string; barcode: string; accessionNo: string; rack: string } | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Dedicated High-Quality Circulation Issue Slip Print
  const handlePrintIssueReceipt = (tx: IssueTransaction) => {
    const printWindow = window.open('', '_blank', 'width=750,height=850');
    if (!printWindow) {
      window.print();
      return;
    }

    const member = state.members.find((m) => m.id === tx.memberId || m.memberCardNo === tx.memberCardNo);
    const barcodeSvg = generateBarcodeSvgString(tx.barcode || tx.accessionNo, { height: 42 });

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Circulation Borrowing Receipt - ${tx.accessionNo}</title>
          <style>
            @page { size: portrait; margin: 15mm; }
            body { font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; color: #0f172a; margin: 0; padding: 30px; font-size: 13px; line-height: 1.5; }
            .no-print { margin-bottom: 20px; }
            .print-btn { background: #2563eb; color: #fff; border: none; padding: 9px 18px; border-radius: 8px; font-weight: 700; cursor: pointer; }
            .close-btn { background: #64748b; color: #fff; border: none; padding: 9px 18px; border-radius: 8px; font-weight: 700; cursor: pointer; margin-left: 8px; }
            .receipt-card { border: 2px solid #e2e8f0; border-radius: 16px; padding: 28px; max-width: 620px; margin: 0 auto; background: #ffffff; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
            .header { text-align: center; border-bottom: 2px dashed #cbd5e1; padding-bottom: 18px; margin-bottom: 20px; }
            .univ-title { font-size: 20px; font-weight: 900; color: #1e3a8a; letter-spacing: 0.5px; margin: 0; }
            .doc-sub { font-size: 12px; color: #64748b; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; margin-top: 4px; }
            .tx-badge { display: inline-block; background: #eff6ff; border: 1px solid #bfdbfe; color: #1d4ed8; font-family: monospace; font-size: 11px; font-weight: 800; padding: 3px 12px; border-radius: 9999px; margin-top: 10px; }
            .section-title { font-size: 11px; font-weight: 800; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px; margin-bottom: 8px; border-bottom: 1px solid #f1f5f9; padding-bottom: 4px; }
            table.info-table { width: 100%; border-collapse: collapse; margin-bottom: 18px; }
            table.info-table td { padding: 6px 4px; vertical-align: top; }
            table.info-table td.label { width: 35%; color: #64748b; font-weight: 700; font-size: 11px; text-transform: uppercase; }
            table.info-table td.value { font-weight: 700; color: #0f172a; }
            .dates-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 18px 0; }
            .date-box { border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px; text-align: center; background: #f8fafc; }
            .date-box.due { border-color: #fde68a; background: #fffbeb; }
            .date-box .lbl { font-size: 10px; font-weight: 800; text-transform: uppercase; color: #64748b; }
            .date-box.due .lbl { color: #b45309; }
            .date-box .val { font-size: 14px; font-weight: 800; font-family: monospace; margin-top: 4px; color: #0f172a; }
            .date-box.due .val { color: #92400e; }
            .barcode-area { text-align: center; padding: 15px 0; border-top: 1px dashed #cbd5e1; border-bottom: 1px dashed #cbd5e1; margin: 20px 0; }
            .terms-box { font-size: 11px; color: #64748b; background: #f8fafc; border-radius: 8px; padding: 10px 14px; margin: 18px 0; }
            .terms-box ol { margin: 4px 0 0 16px; padding: 0; }
            .footer { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 25px; padding-top: 12px; }
            .sign-block { text-align: center; }
            .sign-line { border-top: 1px solid #94a3b8; width: 160px; padding-top: 4px; font-size: 10px; font-weight: 700; color: #475569; }
            @media print { .no-print { display: none; } body { padding: 0; } .receipt-card { box-shadow: none; border: 1px solid #cbd5e1; } }
          </style>
        </head>
        <body>
          <div class="no-print">
            <button class="print-btn" onclick="window.print()">🖨️ Print Official Issue Slip</button>
            <button class="close-btn" onclick="window.close()">Close</button>
          </div>
          <div class="receipt-card">
            <div class="header">
              <h1 class="univ-title">UNIVERSITY CENTRAL LIBRARY</h1>
              <div class="doc-sub">Circulation Issue Slip</div>
              <div style="font-size: 11px; color: #64748b; margin-top: 2px;">Main Administrative Campus • Automated Circulation Desk</div>
              <div class="tx-badge">TRANSACTION ID: ${tx.id}</div>
            </div>

            <div class="section-title">Borrower Details</div>
            <table class="info-table">
              <tr>
                <td class="label">Member Name</td>
                <td class="value">${tx.memberName}</td>
              </tr>
              <tr>
                <td class="label">Library Card No / ID</td>
                <td class="value" style="font-family: monospace;">${tx.memberCardNo}</td>
              </tr>
              <tr>
                <td class="label">Member Category</td>
                <td class="value">${member?.role || tx.memberType || 'STUDENT'} • ${member?.department || 'General'}</td>
              </tr>
            </table>

            <div class="section-title">Borrowed Resource Details</div>
            <table class="info-table">
              <tr>
                <td class="label">Book Title</td>
                <td class="value" style="font-size: 14px;">${tx.bookTitle}</td>
              </tr>
              <tr>
                <td class="label">Accession Number</td>
                <td class="value" style="font-family: monospace; color: #1d4ed8;">${tx.accessionNo}</td>
              </tr>
              <tr>
                <td class="label">Barcode Number</td>
                <td class="value" style="font-family: monospace;">${tx.barcode}</td>
              </tr>
            </table>

            <div class="dates-grid">
              <div class="date-box">
                <div class="lbl">Date of Issue</div>
                <div class="val">${tx.issueDate}</div>
              </div>
              <div class="date-box due">
                <div class="lbl">Mandatory Due Return Date</div>
                <div class="val">${tx.dueDate}</div>
              </div>
            </div>

            <div class="barcode-area">
              <div style="display: flex; justify-content: center;">
                ${barcodeSvg}
              </div>
              <div style="font-family: monospace; font-size: 11px; font-weight: 700; color: #334155; margin-top: 4px;">
                ${tx.barcode || tx.accessionNo}
              </div>
            </div>

            <div class="terms-box">
              <strong>Circulation Rules & Advisory:</strong>
              <ol>
                <li>Please return or renew on or before the due date (${tx.dueDate}) to avoid overdue fines (₹5/day).</li>
                <li>Keep this issue receipt for your records until the book copy is officially returned and cleared.</li>
                <li>Marking, underlining, or tearing pages in library books is strictly prohibited.</li>
              </ol>
            </div>

            <div class="footer">
              <div style="font-size: 10px; color: #64748b;">
                <div>Issued By: <strong>${tx.issuedByName || 'Central Circulation Desk'}</strong></div>
                <div>System Timestamp: ${new Date().toLocaleDateString()}</div>
              </div>
              <div style="display: flex; align-items: center; gap: 20px;">
                ${generateAuthorizedSealHtml('CIRCULATION', tx.issueDate)}
                <div class="sign-block">
                  <div style="height: 32px;"></div>
                  <div class="sign-line">Librarian / Officer Signature</div>
                </div>
              </div>
            </div>
          </div>
          <script>
            window.onload = function() {
              setTimeout(function() { window.print(); }, 400);
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  };

  useEffect(() => {
    const sub = libraryStore.getObservable().subscribe(setState);
    return () => sub.unsubscribe();
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const acc = searchParams.get('accessionNo') || searchParams.get('barcode');
    if (acc) {
      setAccessionOrBarcode(acc);
    }
  }, [searchParams]);

  // Auto-dismiss alert notification banner after 20 seconds
  useEffect(() => {
    if (!alert) return;
    const timer = setTimeout(() => {
      setAlert(null);
    }, 20000);
    return () => clearTimeout(timer);
  }, [alert]);

  const filteredMembers = state.members.filter((m) => {
    const matchesRole = roleFilter === 'ALL' || m.role === roleFilter;
    const term = memberSearchTerm.toLowerCase().trim();
    const matchesSearch =
      !term ||
      m.name.toLowerCase().includes(term) ||
      m.memberCardNo.toLowerCase().includes(term) ||
      m.email.toLowerCase().includes(term) ||
      (m.department && m.department.toLowerCase().includes(term));
    return matchesRole && matchesSearch;
  });

  const selectedMember: MemberProfile | undefined = useMemo(() => {
    if (!selectedMemberId) return undefined;
    const qClean = selectedMemberId.trim().toLowerCase();
    const qNorm = qClean.replace(/[^a-z0-9]/g, '');
    const qNoPrefix = qClean.replace(/^(qr-|bc-|barcode-|bar-|acc-|card-|id-|stu-|fac-|adm-|mem-)/i, '').replace(/[^a-z0-9]/g, '');

    return state.members.find((m) => {
      const cLower = m.memberCardNo.toLowerCase();
      const idLower = m.id.toLowerCase();
      const eLower = m.email.toLowerCase();

      if (cLower === qClean || idLower === qClean || eLower === qClean) return true;

      const cNorm = cLower.replace(/[^a-z0-9]/g, '');
      const idNorm = idLower.replace(/[^a-z0-9]/g, '');
      const eNorm = eLower.replace(/[^a-z0-9]/g, '');

      if (qNorm.length > 0 && (cNorm === qNorm || idNorm === qNorm || eNorm === qNorm)) return true;

      const cNoPrefix = cLower.replace(/^(qr-|bc-|barcode-|bar-|acc-|card-|id-|stu-|fac-|adm-|mem-)/i, '').replace(/[^a-z0-9]/g, '');
      const idNoPrefix = idLower.replace(/^(qr-|bc-|barcode-|bar-|acc-|card-|id-|stu-|fac-|adm-|mem-)/i, '').replace(/[^a-z0-9]/g, '');

      if (qNoPrefix.length > 0 && (cNoPrefix === qNoPrefix || idNoPrefix === qNoPrefix || cNorm === qNoPrefix)) return true;

      return false;
    });
  }, [selectedMemberId, state.members]);

  const availableCopiesList = useMemo(() => {
    const list: Array<{ barcode: string; accessionNo: string; bookTitle: string; rack: string }> = [];
    (state.books || []).forEach((b) => {
      (b.copies || []).forEach((c) => {
        if (c.status === 'AVAILABLE') {
          list.push({
            barcode: c.barcode,
            accessionNo: c.accessionNo,
            bookTitle: b.title,
            rack: `${c.rackNumber} / ${c.shelfNumber}`,
          });
        }
      });
    });
    return list;
  }, [state.books]);

  const checkAndTriggerReferenceModal = (code: string): boolean => {
    const clean = code.trim().toLowerCase();
    if (!clean) return false;
    const queryNorm = clean.replace(/^(qr-|bc-|acc-|card-|id-)/i, '').replace(/[^a-z0-9]/g, '');

    for (const b of state.books) {
      const isRefBook = b.isReferenceOnly || b.collectionType === 'REFERENCE';
      for (const c of b.copies || []) {
        const bNorm = c.barcode.toLowerCase().replace(/^(bc-|qr-|acc-|card-|id-)/i, '').replace(/[^a-z0-9]/g, '');
        const aNorm = c.accessionNo.toLowerCase().replace(/^(bc-|qr-|acc-|card-|id-)/i, '').replace(/[^a-z0-9]/g, '');
        const qNorm = (c.qrCode || '').toLowerCase().replace(/^(bc-|qr-|acc-|card-|id-)/i, '').replace(/[^a-z0-9]/g, '');

        const match =
          c.barcode.toLowerCase() === clean ||
          c.accessionNo.toLowerCase() === clean ||
          c.id.toLowerCase() === clean ||
          (c.qrCode && c.qrCode.toLowerCase() === clean) ||
          (queryNorm.length > 0 && (bNorm === queryNorm || aNorm === queryNorm || qNorm === queryNorm));

        if (match && (isRefBook || c.isReferenceOnly)) {
          setRefModalBook({
            title: b.title,
            barcode: c.barcode,
            accessionNo: c.accessionNo,
            rack: `${c.rackNumber || b.rackNumber || 'RACK-REF'} / ${c.shelfNumber || b.shelfNumber || 'SHELF-A1'}`,
          });
          return true;
        }
      }
    }
    return false;
  };

  const handleSelectCode = (code: string) => {
    const clean = code.trim();
    if (!clean) return;

    const isMemberCard = state.members.some((m) => {
      const cLower = m.memberCardNo.toLowerCase();
      const idLower = m.id.toLowerCase();
      const qClean = clean.toLowerCase();
      if (cLower === qClean || idLower === qClean) return true;
      const qNorm = qClean.replace(/[^a-z0-9]/g, '');
      const cNorm = cLower.replace(/[^a-z0-9]/g, '');
      const idNorm = idLower.replace(/[^a-z0-9]/g, '');
      return qNorm.length > 0 && (cNorm === qNorm || idNorm === qNorm);
    }) || clean.toLowerCase().startsWith('stu-') || clean.toLowerCase().startsWith('fac-') || clean.toLowerCase().startsWith('adm-');

    if (isMemberCard) {
      setAlert({
        type: 'error',
        message: 'INVALID BOOK CODE: You scanned/entered a Member ID Card. Step 2 requires a Book Barcode or Accession Number.',
      });
      setAccessionOrBarcode('');
      return;
    }

    setAccessionOrBarcode(clean);
    checkAndTriggerReferenceModal(clean);
  };

  const handleIssueBook = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = accessionOrBarcode.trim();
    if (!selectedMemberId || !cleanCode) {
      setAlert({ type: 'error', message: 'Please select a member and enter a book barcode / accession number.' });
      return;
    }

    const isMemberCard = state.members.some((m) => {
      const cLower = m.memberCardNo.toLowerCase();
      const idLower = m.id.toLowerCase();
      const qClean = cleanCode.toLowerCase();
      if (cLower === qClean || idLower === qClean) return true;
      const qNorm = qClean.replace(/[^a-z0-9]/g, '');
      const cNorm = cLower.replace(/[^a-z0-9]/g, '');
      const idNorm = idLower.replace(/[^a-z0-9]/g, '');
      return qNorm.length > 0 && (cNorm === qNorm || idNorm === qNorm);
    }) || cleanCode.toLowerCase().startsWith('stu-') || cleanCode.toLowerCase().startsWith('fac-') || cleanCode.toLowerCase().startsWith('adm-');

    if (isMemberCard) {
      setAlert({
        type: 'error',
        message: 'INVALID BOOK CODE: You entered a Member ID Card instead of a Book Barcode or Accession Number.',
      });
      return;
    }

    if (checkAndTriggerReferenceModal(cleanCode)) {
      setAlert({
        type: 'error',
        message: 'RESTRICTED ITEM: This book is a Library Reference Book and CANNOT be issued to members.',
      });
      return;
    }

    const result = libraryStore.issueBook(cleanCode, selectedMemberId, '1');

    if (result.success && result.transaction) {
      setAlert({ type: 'success', message: result.message });
      setLastIssuedReceipt(result.transaction);
      setAccessionOrBarcode('');
    } else {
      setAlert({ type: 'error', message: result.message });
      if ((result as any).isReferenceBook) {
        checkAndTriggerReferenceModal(cleanCode);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-700 bg-blue-50 px-3 py-1 rounded-full mb-2">
            <ScanBarcode className="h-3.5 w-3.5" /> Circulation Desk
          </div>
          <h1 className="text-2xl font-bold font-poppins text-slate-900">Issue Book to Member</h1>
          <p className="text-sm text-slate-500 mt-1">Perform real-time eligibility checks, borrowing validations, and issue receipts.</p>
        </div>
      </div>

      {alert && (
        <div
          className={`flex items-center justify-between gap-3 p-4 rounded-xl text-sm font-medium border animate-fade-in ${
            alert.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          <div className="flex items-center gap-3">
            {alert.type === 'success' ? <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0" /> : <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />}
            <span>{alert.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setAlert(null)}
            className="p-1 rounded-lg hover:bg-black/5 transition-colors cursor-pointer text-slate-500 hover:text-slate-700 shrink-0"
            title="Dismiss notification"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Issue Form */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
          <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
            <ScanBarcode className="h-5 w-5 text-blue-600" /> Book Issue Desk
          </h2>

          <form onSubmit={handleIssueBook} className="space-y-5">
            {/* Step 1: Select Member */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-semibold text-slate-700">1. Select Library Member *</label>
                <button
                  type="button"
                  onClick={() => setIsMemberScannerOpen(true)}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50 px-3 py-1 rounded-full transition-colors cursor-pointer"
                >
                  <Camera className="w-3.5 h-3.5" /> Scan Member ID
                </button>
              </div>

              <BarcodeScannerModal
                isOpen={isMemberScannerOpen}
                onClose={() => setIsMemberScannerOpen(false)}
                onScanSuccess={(scannedCode) => {
                  let clean = (scannedCode || '').trim();
                  if ((clean.startsWith('{') && clean.endsWith('}')) || (clean.startsWith('[') && clean.endsWith(']'))) {
                    try {
                      const obj = JSON.parse(clean);
                      clean = obj.memberCardNo || obj.id || obj.cardNo || obj.studentId || obj.code || clean;
                    } catch {}
                  }
                  const qClean = clean.toLowerCase();
                  const qNorm = qClean.replace(/[^a-z0-9]/g, '');
                  const qNoPrefix = qClean.replace(/^(qr-|bc-|acc-|card-|id-|stu-|fac-|adm-|mem-)/i, '').replace(/[^a-z0-9]/g, '');

                  const m = state.members.find((mem) => {
                    const cLower = mem.memberCardNo.toLowerCase();
                    const idLower = mem.id.toLowerCase();
                    const eLower = mem.email.toLowerCase();

                    if (cLower === qClean || idLower === qClean || eLower === qClean) return true;

                    const cNorm = cLower.replace(/[^a-z0-9]/g, '');
                    const idNorm = idLower.replace(/[^a-z0-9]/g, '');
                    const eNorm = eLower.replace(/[^a-z0-9]/g, '');

                    if (qNorm.length > 0 && (cNorm === qNorm || idNorm === qNorm || eNorm === qNorm)) return true;

                    const cNoPrefix = cLower.replace(/^(qr-|bc-|acc-|card-|id-|stu-|fac-|adm-|mem-)/i, '').replace(/[^a-z0-9]/g, '');
                    const idNoPrefix = idLower.replace(/^(qr-|bc-|acc-|card-|id-|stu-|fac-|adm-|mem-)/i, '').replace(/[^a-z0-9]/g, '');

                    if (qNoPrefix.length > 0 && (cNoPrefix === qNoPrefix || idNoPrefix === qNoPrefix || cNorm === qNoPrefix)) return true;

                    return false;
                  });

                  if (m) {
                    setSelectedMemberId(m.id);
                  } else {
                    setSelectedMemberId(clean);
                  }
                  setMemberSearchTerm('');
                }}
                scannerType="STUDENT_ID"
                title="Scan Member Library ID Card"
              />

              {/* Role Filter Tabs */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
                <button
                  type="button"
                  onClick={() => setRoleFilter('ALL')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                    roleFilter === 'ALL' ? 'bg-blue-600 text-white shadow-2xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  All Members ({state.members.length})
                </button>
                <button
                  type="button"
                  onClick={() => setRoleFilter('STUDENT')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                    roleFilter === 'STUDENT' ? 'bg-blue-600 text-white shadow-2xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Students ({state.members.filter((m) => m.role === 'STUDENT').length})
                </button>
                <button
                  type="button"
                  onClick={() => setRoleFilter('FACULTY')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                    roleFilter === 'FACULTY' ? 'bg-blue-600 text-white shadow-2xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Faculty ({state.members.filter((m) => m.role === 'FACULTY').length})
                </button>
                <button
                  type="button"
                  onClick={() => setRoleFilter('STAFF')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                    roleFilter === 'STAFF' ? 'bg-blue-600 text-white shadow-2xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Staff ({state.members.filter((m) => m.role === 'STAFF').length})
                </button>
              </div>

              {/* Single Unified Searchable Member Select Button/Dropdown */}
              <div className="relative" ref={dropdownRef}>
                <div
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className={`w-full px-4 py-3 rounded-xl border bg-white flex items-center justify-between gap-3 cursor-pointer transition-all shadow-xs ${
                    isDropdownOpen ? 'border-blue-500 ring-2 ring-blue-500/20' : selectedMember ? 'border-emerald-400 bg-emerald-50/30' : 'border-slate-200 hover:border-blue-300'
                  }`}
                >
                  <div className="flex items-center gap-2.5 flex-1 min-w-0">
                    <Search className="h-4 w-4 text-blue-600 shrink-0" />
                    {selectedMember && !memberSearchTerm ? (
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-mono font-bold text-xs shrink-0 flex items-center gap-1">
                          <CheckCircle className="w-3 h-3 text-emerald-600" />
                          {selectedMember.memberCardNo}
                        </span>
                        <span className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                          {selectedMember.name}
                        </span>
                        <span className="text-xs text-slate-500 truncate hidden sm:inline">
                          ({selectedMember.department || 'General'})
                        </span>
                      </div>
                    ) : (
                      <input
                        type="text"
                        placeholder={
                          selectedMember
                            ? `${selectedMember.name} (${selectedMember.memberCardNo}) — ${selectedMember.department}`
                            : `-- Select Library Member (${filteredMembers.length} Available) --`
                        }
                        value={memberSearchTerm}
                        onChange={(e) => {
                          setMemberSearchTerm(e.target.value);
                          if (!isDropdownOpen) setIsDropdownOpen(true);
                        }}
                        onFocus={() => setIsDropdownOpen(true)}
                        className="w-full text-xs sm:text-sm font-semibold text-slate-900 bg-transparent outline-none placeholder:text-slate-500 placeholder:font-normal"
                      />
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {(selectedMemberId || memberSearchTerm) && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedMemberId('');
                          setMemberSearchTerm('');
                        }}
                        className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
                        title="Clear selection"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                    <ChevronDown
                      className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${
                        isDropdownOpen ? 'rotate-180 text-blue-600' : ''
                      }`}
                    />
                  </div>
                </div>

                {/* Dropdown Options List */}
                {isDropdownOpen && (
                  <div className="absolute left-0 right-0 top-full mt-1.5 bg-white rounded-2xl shadow-xl border border-slate-200 z-30 max-h-64 overflow-y-auto divide-y divide-slate-100 animate-fadeIn">
                    {filteredMembers.length > 0 ? (
                      filteredMembers.map((m) => {
                        const isSelected = selectedMemberId === m.id || selectedMemberId === m.memberCardNo;
                        return (
                          <div
                            key={m.id}
                            onClick={() => {
                              setSelectedMemberId(m.id);
                              setMemberSearchTerm('');
                              setIsDropdownOpen(false);
                            }}
                            className={`p-3.5 cursor-pointer flex items-center justify-between transition-colors ${
                              isSelected ? 'bg-blue-50/80 text-blue-900 font-semibold' : 'hover:bg-slate-50 text-slate-800'
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <img
                                src={m.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'}
                                alt={m.name}
                                className="w-8 h-8 rounded-full object-cover border border-blue-100 shrink-0"
                              />
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-bold text-slate-900 truncate">{m.name}</span>
                                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 shrink-0">
                                    {m.memberCardNo}
                                  </span>
                                </div>
                                <div className="text-[11px] text-slate-500 truncate mt-0.5">
                                  {m.department || 'General'} &bull; <span className="uppercase text-[10px] font-semibold text-slate-400">{m.role}</span>
                                </div>
                              </div>
                            </div>
                            {isSelected && <CheckCircle className="h-4 w-4 text-blue-600 shrink-0 ml-2" />}
                          </div>
                        );
                      })
                    ) : (
                      <div className="p-4 text-center text-xs text-slate-400">
                        No members found matching &quot;{memberSearchTerm}&quot;
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Step 2: Book Accession or Barcode */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-semibold text-slate-700">2. Scan / Enter Book Barcode or Accession No *</label>
                <button
                  type="button"
                  onClick={() => setIsScannerOpen(true)}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50 px-3 py-1 rounded-full transition-colors"
                >
                  <Camera className="w-3.5 h-3.5" /> Barcode Scanner
                </button>
              </div>
              <div className="relative">
                <ScanBarcode className="absolute left-3.5 top-3 h-5 w-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="e.g. ACC-2024-001, BC-99201 or BC-REF-001"
                  value={accessionOrBarcode}
                  onChange={(e) => {
                    const val = e.target.value;
                    setAccessionOrBarcode(val);

                    const clean = val.trim();
                    const isMemberCard = clean.length >= 4 && (
                      state.members.some((m) => {
                        const cLower = m.memberCardNo.toLowerCase();
                        const idLower = m.id.toLowerCase();
                        const qClean = clean.toLowerCase();
                        if (cLower === qClean || idLower === qClean) return true;
                        const qNorm = qClean.replace(/[^a-z0-9]/g, '');
                        const cNorm = cLower.replace(/[^a-z0-9]/g, '');
                        const idNorm = idLower.replace(/[^a-z0-9]/g, '');
                        return qNorm.length > 0 && (cNorm === qNorm || idNorm === qNorm);
                      }) || clean.toLowerCase().startsWith('stu-') || clean.toLowerCase().startsWith('fac-') || clean.toLowerCase().startsWith('adm-')
                    );

                    if (isMemberCard) {
                      setAlert({
                        type: 'error',
                        message: 'INVALID BOOK CODE: You scanned/entered a Member ID Card. Step 2 requires a Book Barcode or Accession Number.',
                      });
                      setAccessionOrBarcode('');
                      return;
                    }

                    checkAndTriggerReferenceModal(val);
                  }}
                  list="available-book-copies-list"
                  className="w-full pl-11 pr-24 py-2.5 rounded-xl border border-slate-200 text-sm font-mono focus:ring-2 focus:ring-blue-500/20"
                />
                <datalist id="available-book-copies-list">
                  {availableCopiesList.map((item) => (
                    <option key={item.barcode} value={item.barcode}>
                      {item.accessionNo} — {item.bookTitle} ({item.rack || 'General'})
                    </option>
                  ))}
                </datalist>
                <button
                  type="button"
                  onClick={() => setIsScannerOpen(true)}
                  className="absolute right-2 top-2 px-3 py-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg text-xs font-bold shadow-xs hover:opacity-95 transition-all flex items-center gap-1"
                >
                  <ScanBarcode className="w-3.5 h-3.5" /> Scan
                </button>
              </div>
              {availableCopiesList.length > 0 && (
                <div className="flex items-center justify-end pt-1">
                  <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    {availableCopiesList.length} Copies Available On Shelf
                  </span>
                </div>
              )}
            </div>

            <BarcodeScannerModal
              isOpen={isScannerOpen}
              onClose={() => setIsScannerOpen(false)}
              onScanSuccess={(scannedCode) => handleSelectCode(scannedCode)}
              scannerType="COPY_BARCODE"
              title="Barcode Reader Simulator (Issue Desk)"
            />

            {/* Submit Action */}
            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold text-sm shadow-md shadow-blue-200 hover:opacity-95 transition-all flex items-center justify-center gap-2"
            >
              <CheckCircle className="h-5 w-5" /> Issue Book & Generate Receipt
            </button>
          </form>
        </div>

        {/* Member Verification Preview Panel */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
            <UserCheck className="h-5 w-5 text-emerald-600" /> Member Verification Card
          </h3>

          {selectedMember ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <img
                  src={selectedMember.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'}
                  alt={selectedMember.name}
                  className="w-14 h-14 rounded-full object-cover border-2 border-blue-100 shadow-xs"
                />
                <div>
                  <h4 className="font-bold text-slate-900 text-base">{selectedMember.name}</h4>
                  <p className="text-xs font-mono font-bold text-blue-700">{selectedMember.memberCardNo}</p>
                  <span className="text-[11px] font-semibold uppercase text-slate-500">{selectedMember.role}</span>
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-100 text-xs text-slate-600">
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-500">Department:</span>
                  <span className="font-semibold text-slate-800">{selectedMember.department}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-500">Account Status:</span>
                  <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">{selectedMember.status}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-500">Allowed Borrowing Duration:</span>
                  <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                    {selectedMember.role === 'FACULTY' ? `${state.config.facultyMaxLoanDays} Days (Faculty)` : `${state.config.studentMaxLoanDays} Days (Student)`}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-500">Currently Borrowed Books:</span>
                  <span className="font-semibold text-slate-900">
                    {selectedMember.currentActiveLoans} / {selectedMember.maxAllowedBooks} Books
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">Pending Fines Balance:</span>
                  <span className={`font-bold ${selectedMember.pendingFines > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                    ₹{selectedMember.pendingFines.toFixed(2)}
                  </span>
                </div>
              </div>

              {selectedMember.pendingFines > 0 && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>Member has unpaid fines. Issue blocked until settled.</span>
                </div>
              )}
            </div>
          ) : (
            <div className="py-12 text-center text-slate-400 text-sm">Select a member from the checkout workstation to view eligibility details.</div>
          )}
        </div>
      </div>

      {/* Printable Receipt Modal */}
      {lastIssuedReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 space-y-4 border border-slate-100">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-1">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2 font-poppins">
                <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0" /> Book Issue Receipt
              </h2>
              <button
                onClick={() => setLastIssuedReceipt(null)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                title="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Receipt Card Body */}
            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-4 space-y-3 relative overflow-hidden shadow-inner">
              {/* Top Accent Stripe */}
              <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-emerald-500 via-blue-600 to-indigo-600" />

              {/* Institution Header */}
              <div className="text-center pt-1 pb-3 border-b border-dashed border-slate-200 space-y-0.5">
                <div className="inline-flex items-center justify-center gap-1.5 text-xs font-bold text-slate-900 tracking-wide uppercase font-poppins">
                  <BookOpen className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  UNIVERSITY CENTRAL LIBRARY
                </div>
                <p className="text-[10px] font-semibold text-slate-500 tracking-wider uppercase">Circulation Issue Slip</p>
                <div className="inline-block mt-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-mono font-bold">
                  ID: {lastIssuedReceipt.id}
                </div>
              </div>

              {/* Detail Fields */}
              <div className="space-y-2 text-xs">
                {/* Member */}
                <div className="flex items-start justify-between gap-2 bg-white p-2.5 rounded-xl border border-slate-200/60 shadow-2xs">
                  <span className="text-slate-500 font-medium shrink-0">Member:</span>
                  <div className="text-right">
                    <span className="font-bold text-slate-900 block">{lastIssuedReceipt.memberName}</span>
                    <span className="text-[10px] font-mono font-semibold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">{lastIssuedReceipt.memberCardNo}</span>
                  </div>
                </div>

                {/* Book & Accession */}
                <div className="bg-white p-2.5 rounded-xl border border-slate-200/60 space-y-1 shadow-2xs">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-slate-500 font-medium shrink-0">Book Title:</span>
                    <span className="font-bold text-slate-900 text-right leading-snug">{lastIssuedReceipt.bookTitle}</span>
                  </div>
                  <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[11px]">
                    <span className="text-slate-500">Accession No:</span>
                    <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">{lastIssuedReceipt.accessionNo}</span>
                  </div>
                </div>

                {/* Dates Grid */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200/60 text-center shadow-2xs">
                    <span className="text-[10px] font-semibold uppercase text-slate-400 block tracking-wider">Issue Date</span>
                    <span className="font-mono font-semibold text-slate-800 text-[11px] mt-0.5 block">{formatOnlyTimeInBracket(lastIssuedReceipt.issueDate)}</span>
                  </div>
                  <div className="bg-amber-50/80 p-2.5 rounded-xl border border-amber-200/70 text-center shadow-2xs">
                    <span className="text-[10px] font-bold uppercase text-amber-700 block tracking-wider">Due Return Date</span>
                    <span className="font-mono font-bold text-amber-900 text-xs mt-0.5 block">{formatOnlyTimeInBracket(lastIssuedReceipt.dueDate)}</span>
                  </div>
                </div>
              </div>

              {/* Decorative Barcode & Authorized Circulation Seal */}
              <div className="pt-2 text-center border-t border-dashed border-slate-200 flex items-center justify-between gap-2">
                <div className="text-left">
                  <p className="font-mono text-[9px] tracking-widest text-slate-400 uppercase select-none">
                    ||| | |||| | ||||| ||| |||| | ||| ||||
                  </p>
                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mt-0.5">
                    SYSTEM VERIFIED & ISSUED
                  </p>
                </div>
                <AuthorizedCirculationSeal type="CIRCULATION" date={lastIssuedReceipt.issueDate} size="sm" />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-1">
              <button
                type="button"
                onClick={() => setLastIssuedReceipt(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => handlePrintIssueReceipt(lastIssuedReceipt)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 text-white font-semibold text-xs hover:bg-slate-800 shadow-md transition-all cursor-pointer"
              >
                <Printer className="h-4 w-4" /> Print Receipt
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reference Book Restriction Pop-Up Alert Modal */}
      {refModalBook && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl border border-rose-200 shadow-2xl max-w-md w-full p-6 space-y-5 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-100 text-rose-600 shadow-inner">
              <ShieldAlert className="h-9 w-9" />
            </div>

            <div className="space-y-2">
              <span className="px-3.5 py-1 bg-rose-100 text-rose-800 text-[11px] font-extrabold uppercase rounded-full tracking-wider">
                🚫 Reserved Library Reference Copy — Non-Issuable
              </span>
              <h3 className="text-xl font-bold font-poppins text-slate-900">Reference Copy Restriction</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Copy #1 of this book is reserved as an <strong>In-Library Reference Copy</strong> for reading room reference only. It has a barcode for catalog inventory tracking, but <strong>CANNOT be issued or checked out to members</strong>. Please issue Copy #2 or higher for member borrowing.
              </p>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-left text-xs space-y-1.5 font-sans">
              <p className="font-bold text-slate-900 leading-snug">{refModalBook.title}</p>
              <p className="text-slate-500 font-mono">
                Barcode: <strong className="text-slate-900">{refModalBook.barcode}</strong> | Accession: <strong className="text-slate-900">{refModalBook.accessionNo}</strong>
              </p>
              <p className="text-slate-500 font-mono">
                Location: <strong className="text-slate-900">{refModalBook.rack}</strong>
              </p>
            </div>

            <button
              onClick={() => setRefModalBook(null)}
              className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer"
            >
              I Understand — Close Alert
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
