import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  RotateCcw,
  ScanBarcode,
  CheckCircle,
  AlertTriangle,
  Search,
  Camera,
  X,
  User,
  BookOpen,
  ArrowRight,
  Sparkles,
  ChevronRight,
  Clock,
  ShieldCheck,
  RefreshCw,
  Layers,
  ArrowLeft,
  Check,
  IndianRupee,
  CreditCard,
  Wallet,
  Banknote,
  Smartphone,
  QrCode,
  Printer,
  CheckCircle2,
  Copy,
} from 'lucide-react';
import { libraryStore, formatOnlyTimeInBracket, getTransactionFineAmount, getLocalDateStr } from '../../services/libraryStore.service';
import { CopyCondition, ExtensionRequest, IssueTransaction, MemberProfile } from '../../types/library';
import BarcodeScannerModal from '../../components/common/BarcodeScannerModal';
import { generateQrSvgString, getUpiPaymentUrl } from '../../utils/barcodeQrGenerator';
import AuthorizedCirculationSeal, { generateAuthorizedSealHtml } from '../../components/common/AuthorizedCirculationSeal';

export default function ReturnBooks() {
  const navigate = useNavigate();
  const [state, setState] = useState(libraryStore.snapshot);
  const [returnQuery, setReturnQuery] = useState('');
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Single-Window Unified Return Station State
  const [isReturnTerminalOpen, setIsReturnTerminalOpen] = useState(false);
  const [terminalStep, setTerminalStep] = useState<1 | 2 | 3 | 4>(1);
  const [terminalMemberInput, setTerminalMemberInput] = useState('');
  const [terminalMember, setTerminalMember] = useState<MemberProfile | null>(null);
  const [terminalBookInput, setTerminalBookInput] = useState('');
  const [terminalTx, setTerminalTx] = useState<IssueTransaction | null>(null);
  const [terminalCondition, setTerminalCondition] = useState<CopyCondition>('GOOD');
  const [terminalNotes, setTerminalNotes] = useState('');
  const [lastReturnedTitle, setLastReturnedTitle] = useState('');
  const [terminalAlert, setTerminalAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Helper Live Camera / Device Barcode Scanner Modal State
  const [isHelperScannerOpen, setIsHelperScannerOpen] = useState(false);
  const [helperScannerType, setHelperScannerType] = useState<'STUDENT_ID' | 'COPY_BARCODE'>('STUDENT_ID');
  const [helperScannerTitle, setHelperScannerTitle] = useState('Scan Member Library ID Card');

  // Standalone Table Return Modal State
  const [returnModalTx, setReturnModalTx] = useState<IssueTransaction | null>(null);
  const [modalCondition, setModalCondition] = useState<CopyCondition>('GOOD');
  const [modalNotes, setModalNotes] = useState('');

  // Overdue Fine Payment Modal State
  const [finePaymentModalTx, setFinePaymentModalTx] = useState<{
    tx: IssueTransaction;
    fineAmount: number;
    daysOverdue: number;
    condition: CopyCondition;
    notes?: string;
    source: 'TERMINAL' | 'TABLE';
  } | null>(null);

  // Time Extension Pending Interception Warning Modal State
  const [extensionWarningModal, setExtensionWarningModal] = useState<{
    tx: IssueTransaction;
    extension: ExtensionRequest;
    condition: CopyCondition;
    notes?: string;
    source: 'TERMINAL' | 'TABLE';
  } | null>(null);

  const [paymentMethod, setPaymentMethod] = useState<'UPI_QR' | 'CASH'>('UPI_QR');
  const [isVerifyingPayment, setIsVerifyingPayment] = useState(false);
  const [lastPaymentReceipt, setLastPaymentReceipt] = useState<{
    receiptNo: string;
    bookTitle: string;
    accessionNo: string;
    memberName: string;
    memberCardNo: string;
    fineAmount: number;
    paymentMethod: string;
    date: string;
  } | null>(null);

  const memberInputRef = useRef<HTMLInputElement>(null);
  const bookInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const sub = libraryStore.getObservable().subscribe(setState);
    return () => sub.unsubscribe();
  }, []);

  const activeTransactions = state.transactions.filter((t) => t.status === 'ISSUED' || t.status === 'OVERDUE');

  // Members who currently have active borrowed books
  const membersWithActiveLoans = useMemo(() => {
    const loanMemberIds = new Set(activeTransactions.map((t) => t.memberId || t.memberCardNo.toLowerCase()));
    const loanMemberCardNos = new Set(activeTransactions.map((t) => t.memberCardNo.toLowerCase()));

    return state.members.filter(
      (m) =>
        loanMemberIds.has(m.id) ||
        loanMemberIds.has(m.memberCardNo.toLowerCase()) ||
        loanMemberCardNos.has(m.memberCardNo.toLowerCase())
    );
  }, [activeTransactions, state.members]);

  const filteredTransactions = activeTransactions.filter((t) => {
    if (!returnQuery.trim()) return true;
    const q = returnQuery.toLowerCase().trim();
    return (
      t.accessionNo.toLowerCase().includes(q) ||
      t.barcode.toLowerCase().includes(q) ||
      t.bookTitle.toLowerCase().includes(q) ||
      t.memberName.toLowerCase().includes(q) ||
      t.memberCardNo.toLowerCase().includes(q)
    );
  });

  // Open Unified Single-Window Return Station
  const handleOpenReturnTerminal = () => {
    setTerminalStep(1);
    setTerminalMemberInput('');
    setTerminalMember(null);
    setTerminalBookInput('');
    setTerminalTx(null);
    setTerminalCondition('GOOD');
    setTerminalNotes('');
    setLastReturnedTitle('');
    setTerminalAlert(null);
    setIsReturnTerminalOpen(true);
    setTimeout(() => {
      memberInputRef.current?.focus();
    }, 150);
  };

  // Step 1: Resolve and Verify Member
  const handleSelectMember = (member: MemberProfile) => {
    setTerminalAlert(null);
    const memberLoans = activeTransactions.filter(
      (t) =>
        t.memberCardNo.toLowerCase() === member.memberCardNo.toLowerCase() ||
        t.memberId === member.id
    );

    if (memberLoans.length === 0) {
      setTerminalAlert({
        type: 'error',
        message: `Member "${member.name}" (${member.memberCardNo}) currently has 0 active borrowed books to return.`,
      });
      return;
    }

    setTerminalMember(member);
    setTerminalMemberInput(member.memberCardNo);
    setTerminalStep(2);
    setTerminalBookInput('');
    setTerminalTx(null);
    setTimeout(() => {
      bookInputRef.current?.focus();
    }, 150);
  };

  const handleProcessMemberInput = (rawCode?: string) => {
    const code = (rawCode ?? terminalMemberInput).trim();
    if (!code) return;

    let clean = code;
    if ((clean.startsWith('{') && clean.endsWith('}')) || (clean.startsWith('[') && clean.endsWith(']'))) {
      try {
        const obj = JSON.parse(clean);
        clean = obj.memberCardNo || obj.id || obj.cardNo || obj.studentId || obj.code || clean;
      } catch {}
    }
    const cleanNoPrefix = clean.replace(/^(qr-|card-|id-|stu-|fac-|adm-|mem-)/i, '').trim();

    const foundMember = state.members.find(
      (m) =>
        m.memberCardNo.toLowerCase() === clean.toLowerCase() ||
        m.id.toLowerCase() === clean.toLowerCase() ||
        m.email.toLowerCase() === clean.toLowerCase() ||
        m.memberCardNo.toLowerCase() === cleanNoPrefix.toLowerCase() ||
        m.id.toLowerCase() === cleanNoPrefix.toLowerCase() ||
        m.name.toLowerCase().includes(clean.toLowerCase())
    );

    if (foundMember) {
      handleSelectMember(foundMember);
    } else {
      setTerminalAlert({
        type: 'error',
        message: `Member not found for input "${code}". Please check ID card number or choose from active borrowers below.`,
      });
    }
  };

  // Instant Auto-Verification on Member ID Input / Hardware Scan
  const handleMemberInputChange = (val: string) => {
    setTerminalMemberInput(val);
    setTerminalAlert(null);
    const trimmed = val.trim();
    if (!trimmed) return;

    let clean = trimmed;
    if ((clean.startsWith('{') && clean.endsWith('}')) || (clean.startsWith('[') && clean.endsWith(']'))) {
      try {
        const obj = JSON.parse(clean);
        clean = obj.memberCardNo || obj.id || obj.cardNo || obj.studentId || obj.code || clean;
      } catch {}
    }
    const cleanNoPrefix = clean.replace(/^(qr-|card-|id-|stu-|fac-|adm-|mem-)/i, '').trim();

    const foundMember = state.members.find(
      (m) =>
        m.memberCardNo.toLowerCase() === clean.toLowerCase() ||
        m.id.toLowerCase() === clean.toLowerCase() ||
        m.email.toLowerCase() === clean.toLowerCase() ||
        (cleanNoPrefix.length >= 3 && (
          m.memberCardNo.toLowerCase() === cleanNoPrefix.toLowerCase() ||
          m.id.toLowerCase() === cleanNoPrefix.toLowerCase()
        ))
    );

    if (foundMember) {
      handleSelectMember(foundMember);
    }
  };

  // Step 2: Resolve and Select Book
  const handleSelectBookTx = (tx: IssueTransaction) => {
    setTerminalTx(tx);
    setTerminalCondition('GOOD');
    setTerminalNotes('');
    setTerminalAlert(null);
    setTerminalStep(3);
  };

  // Instant Auto-Verification on Book Barcode Input / Hardware Scan
  const handleBookInputChange = (val: string) => {
    setTerminalBookInput(val);
    setTerminalAlert(null);
    const trimmed = val.trim().toLowerCase();
    if (!trimmed) return;

    const queryNorm = trimmed.replace(/^(qr-|bc-|acc-|card-|id-)/i, '').replace(/[^a-z0-9]/g, '');

    if (terminalMember) {
      const memberTx = activeTransactions.find((t) => {
        const isThisMember =
          t.memberCardNo.toLowerCase() === terminalMember.memberCardNo.toLowerCase() ||
          t.memberId === terminalMember.id;
        if (!isThisMember) return false;

        const bNorm = t.barcode.toLowerCase().replace(/^(bc-|qr-|acc-|card-|id-)/i, '').replace(/[^a-z0-9]/g, '');
        const aNorm = t.accessionNo.toLowerCase().replace(/^(bc-|qr-|acc-|card-|id-)/i, '').replace(/[^a-z0-9]/g, '');
        const qNorm = ((t as any).qrCode || '').toLowerCase().replace(/^(bc-|qr-|acc-|card-|id-)/i, '').replace(/[^a-z0-9]/g, '');

        return (
          t.barcode.toLowerCase() === trimmed ||
          t.accessionNo.toLowerCase() === trimmed ||
          (t as any).qrCode?.toLowerCase() === trimmed ||
          (queryNorm.length >= 3 && (bNorm === queryNorm || aNorm === queryNorm || qNorm === queryNorm))
        );
      });

      if (memberTx) {
        handleSelectBookTx(memberTx);
      }
    }
  };

  const handleProcessBookInput = (rawCode?: string) => {
    const code = (rawCode ?? terminalBookInput).trim().toLowerCase();
    if (!code) return;

    const queryNorm = code.replace(/^(qr-|bc-|acc-|card-|id-)/i, '').replace(/[^a-z0-9]/g, '');

    // 1. Check inside the current member's loans first
    if (terminalMember) {
      const memberTx = activeTransactions.find((t) => {
        const isThisMember =
          t.memberCardNo.toLowerCase() === terminalMember.memberCardNo.toLowerCase() ||
          t.memberId === terminalMember.id;
        if (!isThisMember) return false;

        const bNorm = t.barcode.toLowerCase().replace(/^(bc-|qr-|acc-|card-|id-)/i, '').replace(/[^a-z0-9]/g, '');
        const aNorm = t.accessionNo.toLowerCase().replace(/^(bc-|qr-|acc-|card-|id-)/i, '').replace(/[^a-z0-9]/g, '');
        const qNorm = ((t as any).qrCode || '').toLowerCase().replace(/^(bc-|qr-|acc-|card-|id-)/i, '').replace(/[^a-z0-9]/g, '');

        return (
          t.barcode.toLowerCase() === code ||
          t.accessionNo.toLowerCase() === code ||
          (t as any).qrCode?.toLowerCase() === code ||
          (queryNorm.length > 0 && (bNorm === queryNorm || aNorm === queryNorm || qNorm === queryNorm)) ||
          t.bookTitle.toLowerCase().includes(code)
        );
      });

      if (memberTx) {
        handleSelectBookTx(memberTx);
        return;
      }

      // Check if book was borrowed by someone else
      const otherTx = activeTransactions.find((t) => {
        const bNorm = t.barcode.toLowerCase().replace(/^(bc-|qr-|acc-|card-|id-)/i, '').replace(/[^a-z0-9]/g, '');
        const aNorm = t.accessionNo.toLowerCase().replace(/^(bc-|qr-|acc-|card-|id-)/i, '').replace(/[^a-z0-9]/g, '');
        return (
          t.barcode.toLowerCase() === code ||
          t.accessionNo.toLowerCase() === code ||
          (queryNorm.length > 0 && (bNorm === queryNorm || aNorm === queryNorm)) ||
          t.bookTitle.toLowerCase().includes(code)
        );
      });

      if (otherTx) {
        setTerminalAlert({
          type: 'error',
          message: `Book Mismatch: "${otherTx.bookTitle}" (Barcode: ${otherTx.barcode}) is currently borrowed by ${otherTx.memberName} (${otherTx.memberCardNo}), not by ${terminalMember.name}.`,
        });
        return;
      }
    }

    setTerminalAlert({
      type: 'error',
      message: `No active borrowed book found for barcode / accession "${code}". Please select from the list below.`,
    });
  };

  // Calculate real-time overdue and fine info for a loan
  const computeOverdueInfo = (tx: IssueTransaction) => {
    const returnDate = new Date();
    const dueDate = new Date(tx.dueDate);
    if (returnDate <= dueDate && tx.status !== 'OVERDUE') {
      return { isOverdue: false, fineAmount: 0, daysOverdue: 0 };
    }
    const diffDays = Math.max(1, Math.ceil((returnDate.getTime() - dueDate.getTime()) / (1000 * 3600 * 24)));
    const fineAmount = diffDays * (state.config?.fineRatePerDay || 5);
    return { isOverdue: true, fineAmount, daysOverdue: diffDays };
  };

  // Step 3: Confirm Check-in in Terminal
  const handleConfirmTerminalReturn = () => {
    if (!terminalTx) return;

    // Check if member has a pending time extension request for this book
    const pendingExt = (state.extensionRequests || []).find(
      (r) => (r.transactionId === terminalTx.id || r.accessionNo === terminalTx.accessionNo) && r.status === 'PENDING'
    );
    if (pendingExt) {
      setExtensionWarningModal({
        tx: terminalTx,
        extension: pendingExt,
        condition: terminalCondition,
        notes: terminalNotes,
        source: 'TERMINAL',
      });
      return;
    }

    const overdue = computeOverdueInfo(terminalTx);
    if (overdue.isOverdue && overdue.fineAmount > 0) {
      // Overdue: Intercept and require fine payment via scanner first!
      setFinePaymentModalTx({
        tx: terminalTx,
        fineAmount: overdue.fineAmount,
        daysOverdue: overdue.daysOverdue,
        condition: terminalCondition,
        notes: terminalNotes,
        source: 'TERMINAL',
      });
      return;
    }

    const bookTitle = terminalTx.bookTitle;
    const res = libraryStore.returnBook(terminalTx.id, terminalCondition, terminalNotes);

    if (res.success) {
      setLastReturnedTitle(bookTitle);
      setTerminalStep(4);
      setAlert({ type: 'success', message: res.message });
    } else {
      setTerminalAlert({ type: 'error', message: res.message });
    }
  };

  // Table row quick return action
  const handleTableReturn = (txId: string, condition: CopyCondition = 'GOOD', notes?: string) => {
    const targetTx = activeTransactions.find((t) => t.id === txId);
    if (!targetTx) return;

    // Check if member has a pending time extension request for this book
    const pendingExt = (state.extensionRequests || []).find(
      (r) => (r.transactionId === targetTx.id || r.accessionNo === targetTx.accessionNo) && r.status === 'PENDING'
    );
    if (pendingExt) {
      setReturnModalTx(null);
      setExtensionWarningModal({
        tx: targetTx,
        extension: pendingExt,
        condition,
        notes,
        source: 'TABLE',
      });
      return;
    }

    const overdue = computeOverdueInfo(targetTx);
    if (overdue.isOverdue && overdue.fineAmount > 0) {
      setReturnModalTx(null);
      setFinePaymentModalTx({
        tx: targetTx,
        fineAmount: overdue.fineAmount,
        daysOverdue: overdue.daysOverdue,
        condition,
        notes,
        source: 'TABLE',
      });
      return;
    }

    const res = libraryStore.returnBook(txId, condition, notes);
    if (res.success) {
      setAlert({ type: 'success', message: res.message });
      setReturnModalTx(null);
    } else {
      setAlert({ type: 'error', message: res.message });
    }
  };

  // Handler: Un-approve/Cancel Extension and Complete Return
  const handleCancelExtensionAndReturn = () => {
    if (!extensionWarningModal) return;
    const { tx, extension, condition, notes, source } = extensionWarningModal;

    // Un-approve / reject the pending extension request with reason
    libraryStore.rejectExtensionRequest(
      extension.id,
      'Extension request un-approved/cancelled: book returned at circulation desk.'
    );

    setExtensionWarningModal(null);

    const overdue = computeOverdueInfo(tx);
    if (overdue.isOverdue && overdue.fineAmount > 0) {
      setFinePaymentModalTx({
        tx,
        fineAmount: overdue.fineAmount,
        daysOverdue: overdue.daysOverdue,
        condition,
        notes,
        source,
      });
      return;
    }

    const res = libraryStore.returnBook(tx.id, condition, notes);
    if (res.success) {
      if (source === 'TERMINAL') {
        setLastReturnedTitle(tx.bookTitle);
        setTerminalStep(4);
      }
      setAlert({
        type: 'success',
        message: `Extension request for ${tx.memberName} un-approved. ${res.message}`,
      });
    } else {
      setAlert({ type: 'error', message: res.message });
    }
  };

  // Process Fine Payment & Complete Book Return
  const handleProcessFineAndReturn = () => {
    if (!finePaymentModalTx) return;
    setIsVerifyingPayment(true);

    setTimeout(() => {
      const generatedReceiptNo = `RCP-${Date.now().toString().slice(-6)}`;
      const res = libraryStore.returnBook(
        finePaymentModalTx.tx.id,
        finePaymentModalTx.condition,
        finePaymentModalTx.notes,
        {
          paymentMethod,
          paidAmount: finePaymentModalTx.fineAmount,
          receiptNo: generatedReceiptNo,
          collectedBy: 'Central Circulation Desk',
        }
      );

      setIsVerifyingPayment(false);

      if (res.success) {
        const receiptData = {
          receiptNo: generatedReceiptNo,
          bookTitle: finePaymentModalTx.tx.bookTitle,
          accessionNo: finePaymentModalTx.tx.accessionNo,
          memberName: finePaymentModalTx.tx.memberName,
          memberCardNo: finePaymentModalTx.tx.memberCardNo,
          fineAmount: finePaymentModalTx.fineAmount,
          paymentMethod:
            paymentMethod === 'UPI_QR'
              ? 'Instant UPI QR Scanner'
              : 'Cash at Circulation Counter',
          date: new Date().toLocaleString(),
        };

        setLastPaymentReceipt(receiptData);
        setAlert({ type: 'success', message: res.message });

        if (finePaymentModalTx.source === 'TERMINAL') {
          setLastReturnedTitle(finePaymentModalTx.tx.bookTitle);
          setTerminalStep(4);
        }
        setFinePaymentModalTx(null);
      } else {
        setAlert({ type: 'error', message: res.message });
      }
    }, 1000);
  };

  // Print Fine Payment & Return Receipt
  const handlePrintReceipt = (receipt: NonNullable<typeof lastPaymentReceipt>) => {
    const printWindow = window.open('', '_blank', 'width=650,height=750');
    if (!printWindow) {
      window.print();
      return;
    }

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Overdue Fine Receipt - ${receipt.receiptNo}</title>
          <style>
            @page { size: portrait; margin: 15mm; }
            body { font-family: 'Segoe UI', system-ui, sans-serif; color: #0f172a; margin: 0; padding: 25px; font-size: 13px; line-height: 1.5; }
            .header { text-align: center; border-bottom: 2px dashed #94a3b8; padding-bottom: 15px; margin-bottom: 20px; }
            .univ { font-size: 18px; font-weight: 900; letter-spacing: 0.5px; }
            .sub { font-size: 12px; color: #64748b; font-weight: 700; text-transform: uppercase; margin-top: 2px; }
            .receipt-badge { display: inline-block; background: #ecfdf5; border: 1px solid #10b981; color: #065f46; font-weight: 800; font-size: 11px; padding: 4px 10px; border-radius: 9999px; margin-top: 8px; }
            .grid { width: 100%; border-collapse: collapse; margin: 15px 0; }
            .grid td { padding: 7px 4px; vertical-align: top; }
            .grid td.label { font-size: 11px; color: #64748b; font-weight: 700; text-transform: uppercase; width: 40%; }
            .grid td.val { font-weight: 700; color: #0f172a; }
            .total-box { background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px 16px; margin: 20px 0; display: flex; justify-content: space-between; align-items: center; }
            .total-val { font-size: 20px; font-weight: 900; color: #059669; }
            .footer { text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 15px; margin-top: 25px; }
            .no-print { margin-bottom: 15px; }
            .btn { background: #059669; color: white; border: none; padding: 8px 16px; border-radius: 6px; font-weight: bold; cursor: pointer; }
            @media print { .no-print { display: none; } }
          </style>
        </head>
        <body>
          <div class="no-print">
            <button class="btn" onclick="window.print()">🖨️ Print Receipt Slip</button>
            <button class="btn" style="background: #64748b; margin-left: 8px;" onclick="window.close()">Close</button>
          </div>
          <div class="header">
            <div class="univ">UNIVERSITY CENTRAL LIBRARY</div>
            <div class="sub">Circulation Desk & Overdue Settlement</div>
            <div class="receipt-badge">✓ PAYMENT & RETURN ACKNOWLEDGED</div>
          </div>
          <table class="grid">
            <tr><td class="label">Receipt Number</td><td class="val" style="font-family: monospace;">${receipt.receiptNo}</td></tr>
            <tr><td class="label">Payment Date & Time</td><td class="val">${receipt.date}</td></tr>
            <tr><td class="label">Borrower Name</td><td class="val">${receipt.memberName}</td></tr>
            <tr><td class="label">Member Card / ID</td><td class="val" style="font-family: monospace;">${receipt.memberCardNo}</td></tr>
            <tr><td class="label">Book Title</td><td class="val">${receipt.bookTitle}</td></tr>
            <tr><td class="label">Accession No</td><td class="val" style="font-family: monospace;">${receipt.accessionNo}</td></tr>
            <tr><td class="label">Payment Method</td><td class="val">${receipt.paymentMethod}</td></tr>
            <tr><td class="label">Circulation Status</td><td class="val" style="color: #059669;">RETURNED & RESTORED TO SHELF</td></tr>
          </table>
          <div class="total-box">
            <div>
              <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase;">Overdue Fine Paid</div>
              <div style="font-size: 11px; color: #64748b;">Fully Settled • Zero Outstanding</div>
            </div>
            <div class="total-val">₹${receipt.fineAmount.toFixed(2)}</div>
          </div>
          <div class="footer" style="display: flex; justify-content: space-between; align-items: flex-end; border-top: 1px dashed #cbd5e1; padding-top: 15px; margin-top: 25px;">
            <div style="text-align: left; font-size: 11px; color: #64748b;">
              <p>Thank you for returning the university library resource.</p>
              <p style="font-size: 10px; margin-top: 4px;">Authorized Central Library System Generated Electronic Receipt</p>
              <p style="font-size: 10px; color: #059669; font-weight: 800;">✓ CIRCULATION STATUS: RESTORED & DUES ZERO</p>
            </div>
            ${generateAuthorizedSealHtml('FINE_PAYMENT', receipt.date)}
          </div>
          <script>
            window.onload = function() { setTimeout(function() { window.print(); }, 400); };
          </script>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  };

  const currentMemberRemainingLoans = useMemo(() => {
    if (!terminalMember) return [];
    return activeTransactions.filter(
      (t) =>
        t.memberCardNo.toLowerCase() === terminalMember.memberCardNo.toLowerCase() ||
        t.memberId === terminalMember.id
    );
  }, [activeTransactions, terminalMember]);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3.5 py-1 rounded-full mb-2 border border-emerald-200/60 shadow-2xs">
            <RotateCcw className="h-3.5 w-3.5" /> Book Return Desk
          </div>
          <h1 className="text-2xl font-bold font-poppins text-slate-900">Return Circulation Processing</h1>
          <p className="text-sm text-slate-500 mt-1">
            Single-window intelligent return terminal: Scan Member ID, verify borrowed items, and check in books seamlessly.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleOpenReturnTerminal}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-sm shadow-md shadow-emerald-500/20 transition-all cursor-pointer active:scale-95 whitespace-nowrap"
            title="Open single-window return station to scan Member ID and Book Barcode"
          >
            <Camera className="w-4.5 h-4.5" />
            <span>Launch Return Station</span>
          </button>
        </div>
      </div>

      {/* Global Page Toast Alert */}
      {alert && (
        <div
          className={`flex items-center justify-between gap-3 p-4 rounded-2xl text-sm font-semibold border shadow-xs animate-fadeIn ${
            alert.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          <div className="flex items-center gap-3">
            {alert.type === 'success' ? <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0" /> : <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0" />}
            <span>{alert.message}</span>
          </div>
          <button onClick={() => setAlert(null)} className="p-1 hover:opacity-70">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SINGLE-WINDOW ALL-IN-ONE RETURN TERMINAL MODAL                            */}
      {/* ========================================================================= */}
      {isReturnTerminalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-emerald-950 p-5 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-2xl border border-emerald-500/30">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold font-poppins text-lg text-white leading-tight">Book Return Station</h3>
                  <p className="text-xs text-slate-300">Continuous 2-step verification and return check-in</p>
                </div>
              </div>
              <button
                onClick={() => setIsReturnTerminalOpen(false)}
                className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Interactive Step Navigator Bar */}
            <div className="bg-slate-50/90 px-3.5 sm:px-6 py-3 border-b border-slate-200 flex items-center justify-between text-xs sm:text-sm font-semibold shrink-0 overflow-x-auto no-scrollbar gap-2">
              <div className="flex items-center gap-2 sm:gap-3 min-w-max">
                {/* Step 1 Pill */}
                <button
                  type="button"
                  onClick={() => {
                    if (terminalStep > 1) {
                      setTerminalStep(1);
                      setTerminalAlert(null);
                    }
                  }}
                  className={`inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-2xl text-xs sm:text-sm font-bold transition-all ${
                    terminalStep === 1
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                      : terminalMember
                      ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 cursor-pointer shadow-2xs'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {terminalMember && <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-700 stroke-[2.5]" />}
                  <span className="truncate max-w-[120px] sm:max-w-none">{terminalMember ? `Member: ${terminalMember.name.split(' ')[0]}` : 'Scan Member ID'}</span>
                </button>

                <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400 shrink-0" />

                {/* Step 2 Pill */}
                <button
                  type="button"
                  onClick={() => {
                    if (terminalMember && terminalStep > 2) {
                      setTerminalStep(2);
                      setTerminalAlert(null);
                    }
                  }}
                  className={`inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-2xl text-xs sm:text-sm font-bold transition-all ${
                    terminalStep === 2
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20'
                      : terminalTx
                      ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 cursor-pointer shadow-2xs'
                      : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  }`}
                  disabled={!terminalMember}
                >
                  {terminalTx && <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-700 stroke-[2.5]" />}
                  <span className="truncate max-w-[120px] sm:max-w-none">{terminalTx ? `Book: ${terminalTx.accessionNo}` : 'Scan Book Barcode'}</span>
                </button>

                <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400 shrink-0" />

                {/* Step 3 Pill */}
                <span
                  className={`inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-2xl text-xs sm:text-sm font-bold transition-all ${
                    terminalStep === 3
                      ? 'bg-emerald-700 text-white shadow-md shadow-emerald-600/20'
                      : terminalStep === 4
                      ? 'bg-emerald-100 text-emerald-800 shadow-2xs'
                      : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  {terminalStep === 4 && <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-700 stroke-[2.5]" />}
                  <span>Confirm Check-in</span>
                </span>
              </div>
            </div>

            {/* Terminal Modal Content Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-5">
              {/* Terminal Inline Alert */}
              {terminalAlert && (
                <div
                  className={`p-3.5 rounded-2xl text-sm font-semibold flex items-center gap-2.5 animate-fadeIn ${
                    terminalAlert.type === 'error' ? 'bg-rose-50 border border-rose-200 text-rose-800' : 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                  }`}
                >
                  {terminalAlert.type === 'error' ? <AlertTriangle className="w-4.5 h-4.5 shrink-0 text-rose-600" /> : <CheckCircle className="w-4.5 h-4.5 shrink-0 text-emerald-600" />}
                  <span>{terminalAlert.message}</span>
                </div>
              )}

              {/* ============================================================= */}
              {/* STEP 1: SCAN MEMBER ID CARD                                   */}
              {/* ============================================================= */}
              {terminalStep === 1 && (
                <div className="space-y-4 animate-fadeIn">
                  <div className="space-y-1">
                    <label className="block text-sm font-bold text-slate-800 uppercase tracking-wider">
                      Scan or Enter Borrower Library ID Card
                    </label>
                    <p className="text-xs sm:text-sm text-slate-500">
                      Scan the barcode or QR code on the student/faculty ID card, or select from active borrowers below.
                    </p>
                  </div>

                  {/* Member ID Input & Camera Scanner Button */}
                  <div className="flex flex-col sm:flex-row items-center gap-3">
                    <div className="relative flex-1 w-full">
                      <ScanBarcode className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-blue-600" />
                      <input
                        ref={memberInputRef}
                        type="text"
                        placeholder="Scan card barcode or type Member ID (e.g. STU-2026-001)..."
                        value={terminalMemberInput}
                        onChange={(e) => handleMemberInputChange(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleProcessMemberInput();
                          }
                        }}
                        className="w-full pl-10 pr-4 py-3 rounded-2xl border border-slate-200 bg-slate-50 font-bold text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-2xs font-mono"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setHelperScannerType('STUDENT_ID');
                        setHelperScannerTitle('Scan Member Library ID Card');
                        setIsHelperScannerOpen(true);
                      }}
                      className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0 active:scale-95 whitespace-nowrap"
                      title="Open Live Camera or Device Barcode Reader to scan Member ID"
                    >
                      <Camera className="w-4 h-4 text-white" />
                      <span>Scan with Camera / Device</span>
                    </button>
                  </div>

                  {/* Active Borrowers Presets */}
                  <div className="space-y-2 pt-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        Active Borrowers with Issued Books ({membersWithActiveLoans.length})
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium">Click to select borrower</span>
                    </div>

                    <div className="max-h-56 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-2xl bg-slate-50/50">
                      {membersWithActiveLoans.map((m) => {
                        const loansCount = activeTransactions.filter(
                          (t) => t.memberCardNo.toLowerCase() === m.memberCardNo.toLowerCase() || t.memberId === m.id
                        ).length;

                        return (
                          <div
                            key={m.id}
                            onClick={() => handleSelectMember(m)}
                            className="p-3 hover:bg-blue-50/70 transition-all flex items-center justify-between cursor-pointer group"
                          >
                            <div className="flex items-center gap-3">
                              <img
                                src={m.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80'}
                                alt={m.name}
                                className="w-9 h-9 rounded-xl object-cover border border-slate-200 shadow-2xs shrink-0"
                              />
                              <div>
                                <h4 className="font-bold text-xs text-slate-900 group-hover:text-blue-700 transition-colors">
                                  {m.name}
                                </h4>
                                <p className="text-[10px] font-mono text-slate-500">
                                  {m.memberCardNo} • {m.department}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-blue-100 text-blue-800 font-mono">
                                {loansCount} {loansCount === 1 ? 'Book' : 'Books'} Issued
                              </span>
                              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-transform group-hover:translate-x-0.5" />
                            </div>
                          </div>
                        );
                      })}

                      {membersWithActiveLoans.length === 0 && (
                        <div className="p-6 text-center text-slate-400 text-xs font-semibold">
                          No borrowers currently have active books pending return.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ============================================================= */}
              {/* STEP 2: SCAN BOOK BARCODE FOR VERIFIED MEMBER                 */}
              {/* ============================================================= */}
              {terminalStep === 2 && terminalMember && (
                <div className="space-y-4 animate-fadeIn">
                  {/* Verified Member Sticky Banner */}
                  <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white p-4 rounded-2xl border border-blue-800 shadow-sm flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={terminalMember.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80'}
                        alt={terminalMember.name}
                        className="w-10 h-10 rounded-xl object-cover border-2 border-blue-400 shrink-0"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-bold uppercase bg-blue-500/30 px-1.5 py-0.5 rounded text-blue-200">
                            Verified Borrower
                          </span>
                          <span className="text-[11px] font-mono text-blue-300">{terminalMember.memberCardNo}</span>
                        </div>
                        <h4 className="font-bold text-sm text-white">{terminalMember.name}</h4>
                        <p className="text-[11px] text-slate-300">{terminalMember.department}</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setTerminalStep(1);
                        setTerminalAlert(null);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-slate-200 hover:text-white border border-white/20 transition-all cursor-pointer shrink-0"
                    >
                      Change Member
                    </button>
                  </div>

                  {/* Book Barcode Input & Camera Scanner Button */}
                  <div className="space-y-1">
                    <label className="block text-sm font-bold text-slate-800 uppercase tracking-wider">
                      Scan Book Barcode or Select from Issued Books Below
                    </label>
                    <div className="flex flex-col sm:flex-row items-center gap-3 pt-1">
                      <div className="relative flex-1 w-full">
                        <ScanBarcode className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-emerald-600" />
                        <input
                          ref={bookInputRef}
                          type="text"
                          placeholder="Scan Book Barcode (e.g. BC-CS-001) or Accession No..."
                          value={terminalBookInput}
                          onChange={(e) => handleBookInputChange(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleProcessBookInput();
                            }
                          }}
                          className="w-full pl-10 pr-4 py-3 rounded-2xl border border-slate-200 bg-slate-50 font-bold text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 shadow-2xs font-mono"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setHelperScannerType('COPY_BARCODE');
                          setHelperScannerTitle(`Scan Book Barcode for ${terminalMember.name}`);
                          setIsHelperScannerOpen(true);
                        }}
                        className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs shadow-md shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0 active:scale-95 whitespace-nowrap"
                        title="Open Live Camera or Device Barcode Reader to scan Book"
                      >
                        <Camera className="w-4 h-4 text-white" />
                        <span>Scan with Camera / Device</span>
                      </button>
                    </div>
                  </div>

                  {/* List of Books Currently Borrowed by This Member */}
                  <div className="space-y-2 pt-2">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                      Active Borrowings for {terminalMember.name} ({currentMemberRemainingLoans.length})
                    </span>

                    <div className="space-y-2.5">
                      {currentMemberRemainingLoans.map((tx) => {
                        const isOverdue = tx.status === 'OVERDUE';
                        const fineObj = getTransactionFineAmount(tx, state);

                        return (
                          <div
                            key={tx.id}
                            className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                              isOverdue ? 'bg-rose-50/60 border-rose-200' : 'bg-slate-50/80 border-slate-200 hover:border-emerald-300'
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <div className={`p-2.5 rounded-xl mt-0.5 shrink-0 ${isOverdue ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                <BookOpen className="w-4 h-4" />
                              </div>
                              <div>
                                <h4 className="font-bold text-xs sm:text-sm text-slate-900 leading-snug">{tx.bookTitle}</h4>
                                <div className="flex items-center gap-2 mt-1 text-[11px] font-mono text-slate-500 flex-wrap">
                                  <span className="bg-white px-2 py-0.5 rounded border border-slate-200 text-blue-700 font-bold">
                                    ACC: {tx.accessionNo}
                                  </span>
                                  <span className="bg-white px-2 py-0.5 rounded border border-slate-200 font-bold">
                                    BC: {tx.barcode}
                                  </span>
                                  <span className={isOverdue ? 'text-rose-700 font-bold' : 'text-slate-600'}>
                                    Due: {formatOnlyTimeInBracket(tx.dueDate)}
                                  </span>
                                </div>

                                {isOverdue && (
                                  <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-extrabold text-rose-700 bg-rose-100/80 px-2 py-0.5 rounded-md">
                                    <AlertTriangle className="w-3 h-3" /> Overdue Fine: ₹{fineObj.fineAmount.toFixed(2)}
                                  </span>
                                )}
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleSelectBookTx(tx)}
                              className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-500/20 transition-all cursor-pointer shrink-0 whitespace-nowrap active:scale-95"
                            >
                              Return This Book
                            </button>
                          </div>
                        );
                      })}

                      {currentMemberRemainingLoans.length === 0 && (
                        <div className="p-6 text-center text-slate-400 text-xs font-semibold bg-slate-50 rounded-2xl border border-slate-200">
                          All books have been returned by this member.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ============================================================= */}
              {/* STEP 3: REVIEW CONDITION & CONFIRM CHECK-IN                   */}
              {/* ============================================================= */}
              {terminalStep === 3 && terminalTx && terminalMember && (
                <div className="space-y-4 animate-fadeIn">
                  {/* Loan Overview Card */}
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3 text-xs">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Book Check-in</span>
                        <h4 className="font-extrabold text-slate-900 text-sm">{terminalTx.bookTitle}</h4>
                        <p className="font-mono text-blue-700 font-semibold mt-0.5 text-xs">
                          ACC: {terminalTx.accessionNo} | Barcode: {terminalTx.barcode}
                        </p>
                      </div>
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase ${
                          terminalTx.status === 'OVERDUE' ? 'bg-rose-100 text-rose-800 border border-rose-200' : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        }`}
                      >
                        {terminalTx.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/80 text-[11px]">
                      <div>
                        <span className="text-slate-400 font-semibold uppercase text-[9px]">Borrower</span>
                        <p className="font-bold text-slate-800">{terminalTx.memberName}</p>
                        <p className="font-mono text-slate-500">{terminalTx.memberCardNo}</p>
                      </div>
                      <div>
                        <span className="text-slate-400 font-semibold uppercase text-[9px]">Due Date</span>
                        <p className={`font-bold font-mono ${terminalTx.status === 'OVERDUE' ? 'text-rose-600' : 'text-slate-800'}`}>
                          {formatOnlyTimeInBracket(terminalTx.dueDate)}
                        </p>
                        <p className="text-slate-500 font-mono">Issued: {formatOnlyTimeInBracket(terminalTx.issueDate)}</p>
                      </div>
                    </div>

                    {(() => {
                      const today = new Date();
                      const dueDateObj = new Date(terminalTx.dueDate);
                      const isLate = terminalTx.status === 'OVERDUE' || today > dueDateObj;
                      if (!isLate) return null;
                      const diffDays = Math.max(1, Math.ceil((today.getTime() - dueDateObj.getTime()) / (1000 * 3600 * 24)));
                      const fineAmt = diffDays * (state.config?.fineRatePerDay || 5);
                      return (
                        <div className="bg-rose-50 border border-rose-200 p-3.5 rounded-xl text-rose-800 flex items-start gap-2.5">
                          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                          <div>
                            <p className="font-bold text-xs">
                              Late Return Overdue Fine: <span className="font-mono text-rose-700 font-extrabold">₹{fineAmt.toFixed(2)}</span> ({diffDays} Days Overdue)
                            </p>
                            <p className="text-[10px] text-rose-600 mt-0.5">
                              This fine will be automatically assigned to {terminalTx.memberName}'s account upon confirming return (Overdue fine rate: ₹{state.config?.fineRatePerDay || 5}/day).
                            </p>
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Return Condition */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-800">Book Condition Upon Return</label>
                    <select
                      value={terminalCondition}
                      onChange={(e) => setTerminalCondition(e.target.value as CopyCondition)}
                      className="w-full py-2.5 px-3.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 cursor-pointer"
                    >
                      <option value="GOOD">GOOD (Normal - Ready for immediate shelf circulation)</option>
                      <option value="NEW">NEW (Pristine / Like New condition)</option>
                      <option value="DAMAGED">DAMAGED (Requires Book Repair / Maintenance)</option>
                      <option value="LOST">LOST (Reported Lost by Borrower)</option>
                    </select>
                  </div>

                  {/* Return Remarks */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-800">
                      Return Remarks / Notes <span className="font-normal text-slate-400">(Optional)</span>
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Optional notes regarding physical book condition, spine, or fine collection..."
                      value={terminalNotes}
                      onChange={(e) => setTerminalNotes(e.target.value)}
                      className="w-full p-3 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                  </div>

                  {/* Buttons */}
                  <div className="flex items-center justify-between pt-2">
                    <button
                      type="button"
                      onClick={() => setTerminalStep(2)}
                      className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <ArrowLeft className="w-4 h-4" /> Back to Books
                    </button>

                    <button
                      type="button"
                      onClick={handleConfirmTerminalReturn}
                      className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs shadow-md shadow-emerald-500/20 transition-all flex items-center gap-2 cursor-pointer active:scale-95"
                    >
                      <CheckCircle className="w-4 h-4" /> Confirm & Check In
                    </button>
                  </div>
                </div>
              )}

              {/* ============================================================= */}
              {/* STEP 4: SUCCESS CELEBRATION & CONTINUATION                    */}
              {/* ============================================================= */}
              {terminalStep === 4 && terminalMember && (
                <div className="py-6 text-center space-y-4 animate-fadeIn">
                  <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto border-4 border-emerald-50 shadow-md">
                    <Check className="w-7 h-7 stroke-[3]" />
                  </div>

                  <div className="space-y-1">
                    <h3 className="text-lg font-bold font-poppins text-slate-900">Book Returned Successfully!</h3>
                    <p className="text-xs text-slate-600 max-w-sm mx-auto font-medium">
                      <strong className="text-slate-900">"{lastReturnedTitle}"</strong> has been checked in and restored to active catalog inventory.
                    </p>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 max-w-md mx-auto text-xs space-y-1">
                    <p className="font-semibold text-slate-700">
                      Borrower: <strong className="text-blue-700">{terminalMember.name}</strong> ({terminalMember.memberCardNo})
                    </p>
                    <p className="text-slate-500">
                      Remaining Active Borrowed Books: <strong className="text-emerald-700 font-mono">{currentMemberRemainingLoans.length}</strong>
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                    {currentMemberRemainingLoans.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setTerminalStep(2);
                          setTerminalBookInput('');
                          setTerminalTx(null);
                          setTerminalAlert(null);
                          setTimeout(() => {
                            bookInputRef.current?.focus();
                          }, 150);
                        }}
                        className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-500/20 transition-all cursor-pointer"
                      >
                        Return Another Book for {terminalMember.name.split(' ')[0]}
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        setTerminalStep(1);
                        setTerminalMember(null);
                        setTerminalMemberInput('');
                        setTerminalBookInput('');
                        setTerminalTx(null);
                        setTerminalAlert(null);
                        setTimeout(() => {
                          memberInputRef.current?.focus();
                        }, 150);
                      }}
                      className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-xs font-bold text-slate-700 transition-all cursor-pointer"
                    >
                      Process Return for Another Member
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsReturnTerminalOpen(false)}
                      className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all cursor-pointer"
                    >
                      Close Station
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Return Search & Filter Toolbar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by Accession No, Barcode, Book Title, Member Name, Card No..."
              value={returnQuery}
              onChange={(e) => setReturnQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && returnQuery.trim()) {
                  const matchingTx = activeTransactions.find(
                    (t) =>
                      t.barcode.toLowerCase() === returnQuery.trim().toLowerCase() ||
                      t.accessionNo.toLowerCase() === returnQuery.trim().toLowerCase()
                  );
                  if (matchingTx) {
                    setReturnModalTx(matchingTx);
                    setModalCondition('GOOD');
                    setModalNotes('');
                  }
                }
              }}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>

          <button
            type="button"
            onClick={() => {
              if (returnQuery.trim()) {
                const matchingTx = activeTransactions.find(
                  (t) =>
                    t.barcode.toLowerCase() === returnQuery.trim().toLowerCase() ||
                    t.accessionNo.toLowerCase() === returnQuery.trim().toLowerCase()
                );
                if (matchingTx) {
                  setReturnModalTx(matchingTx);
                  setModalCondition('GOOD');
                  setModalNotes('');
                }
              }
            }}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-emerald-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-emerald-200 hover:bg-emerald-800 transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0"
          >
            <Search className="w-4 h-4" />
            <span>Search & Process Return</span>
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 gap-2 pt-1 border-t border-slate-100">
          <span>
            Showing <strong className="text-slate-800">{filteredTransactions.length}</strong> pending returns
            {returnQuery && <span> for search "<strong className="text-emerald-700">{returnQuery}</strong>"</span>}
          </span>

          {returnQuery && (
            <button
              onClick={() => setReturnQuery('')}
              className="text-xs font-bold text-slate-500 hover:text-slate-800 hover:underline cursor-pointer"
            >
              Clear Search Filter
            </button>
          )}
        </div>
      </div>

      {/* Active Borrowed Loans Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-4 p-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h2 className="text-lg font-bold font-poppins text-slate-900 flex items-center gap-2">
            <ScanBarcode className="h-5 w-5 text-emerald-600" /> Books Pending Return ({filteredTransactions.length})
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-4">Accession / Barcode</th>
                <th className="py-3.5 px-4">Book Title</th>
                <th className="py-3.5 px-4">Member Name</th>
                <th className="py-3.5 px-4">Issue & Due Date</th>
                <th className="py-3.5 px-4">Borrowing Status</th>
                <th className="py-3.5 px-4 text-right">Return Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredTransactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-4 px-4 font-mono">
                    <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded text-xs block w-fit">{tx.accessionNo}</span>
                    <span className="text-xs text-slate-500 block mt-0.5">{tx.barcode}</span>
                  </td>
                  <td className="py-4 px-4">
                    <p className="font-semibold text-slate-900">{tx.bookTitle}</p>
                  </td>
                  <td className="py-4 px-4">
                    <p className="font-medium text-slate-800">{tx.memberName}</p>
                    <p className="text-xs text-slate-500 font-mono">{tx.memberCardNo}</p>
                  </td>
                  <td className="py-4 px-4 text-xs font-mono whitespace-nowrap">
                    <p className="text-slate-600">Issued: {formatOnlyTimeInBracket(tx.issueDate)}</p>
                    <p className={`font-bold mt-0.5 ${tx.status === 'OVERDUE' ? 'text-rose-600' : 'text-slate-900'}`}>Due: {formatOnlyTimeInBracket(tx.dueDate)}</p>
                  </td>
                  <td className="py-4 px-4">
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                        tx.status === 'OVERDUE' ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-blue-50 text-blue-700 border border-blue-200'
                      }`}
                    >
                      {tx.status}
                    </span>
                    {state.extensionRequests?.some((r) => (r.transactionId === tx.id || r.accessionNo === tx.accessionNo) && r.status === 'PENDING') && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-900 border border-amber-300 animate-pulse mt-1 block w-max">
                        <Clock className="w-3 h-3 text-amber-700" /> Extension Requested
                      </span>
                    )}
                  </td>
                  <td className="py-4 px-4 text-right">
                    <button
                      onClick={() => {
                        setReturnModalTx(tx);
                        setModalCondition('GOOD');
                        setModalNotes('');
                      }}
                      className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-semibold text-xs shadow-md shadow-emerald-200 hover:bg-emerald-700 transition-all cursor-pointer shrink-0 whitespace-nowrap"
                    >
                      Process Return
                    </button>
                  </td>
                </tr>
              ))}
              {filteredTransactions.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    {returnQuery ? `No pending returns found matching "${returnQuery}".` : 'No active book returns pending currently.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Standalone Table Process Book Return Modal */}
      {returnModalTx && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full border border-slate-200 shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-5 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-white/20 rounded-2xl">
                  <RotateCcw className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold font-poppins text-lg text-white">Process Book Return</h3>
                  <p className="text-xs text-emerald-100">Review borrowing summary & log optional remarks</p>
                </div>
              </div>
              <button
                onClick={() => setReturnModalTx(null)}
                className="p-1.5 rounded-xl text-emerald-100 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              {/* Summary Card */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2.5 text-xs">
                <div>
                  <span className="text-slate-400 font-semibold uppercase text-[10px]">Book Title</span>
                  <p className="font-bold text-slate-900 text-sm line-clamp-1">{returnModalTx.bookTitle}</p>
                  <p className="font-mono text-blue-700 font-semibold mt-0.5">ACC: {returnModalTx.accessionNo} | BC: {returnModalTx.barcode}</p>
                </div>

                <div className="pt-2 border-t border-slate-200 grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-slate-400 font-semibold uppercase text-[10px]">Borrower</span>
                    <p className="font-bold text-slate-800">{returnModalTx.memberName}</p>
                    <p className="font-mono text-slate-500 text-[11px]">{returnModalTx.memberCardNo}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 font-semibold uppercase text-[10px]">Due Date</span>
                    <p className={`font-bold font-mono ${returnModalTx.status === 'OVERDUE' ? 'text-rose-600' : 'text-slate-800'}`}>
                      {formatOnlyTimeInBracket(returnModalTx.dueDate)}
                    </p>
                    <p className="text-[11px] text-slate-500 font-mono">Issued: {formatOnlyTimeInBracket(returnModalTx.issueDate)}</p>
                  </div>
                </div>

                {returnModalTx.status === 'OVERDUE' && (
                  <div className="mt-2 bg-rose-50 border border-rose-200 p-2.5 rounded-xl text-rose-800 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                    <div>
                      <p className="font-bold text-xs">
                        Overdue Fine Assessed: <span className="font-mono text-rose-700 font-extrabold">₹{getTransactionFineAmount(returnModalTx, state).fineAmount.toFixed(2)}</span>
                      </p>
                      <p className="text-[11px] text-rose-600">Calculated based on daily rate (₹{state.config?.fineRatePerDay || 5}/day). Payment required via Scanner.</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Book Condition Selector */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">Book Condition Upon Return</label>
                <select
                  value={modalCondition}
                  onChange={(e) => setModalCondition(e.target.value as CopyCondition)}
                  className="w-full py-2.5 px-3.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 cursor-pointer"
                >
                  <option value="GOOD">GOOD (Normal - Ready for re-shelving)</option>
                  <option value="NEW">NEW (Like New - Excellent condition)</option>
                  <option value="DAMAGED">DAMAGED (Requires Repair / Maintenance)</option>
                  <option value="LOST">LOST (Reported Lost by Borrower)</option>
                </select>
              </div>

              {/* Remarks / Notes Field */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  Return Remarks / Notes <span className="font-normal text-slate-400">(Optional)</span>
                </label>
                <textarea
                  rows={3}
                  placeholder="Enter optional return remarks, condition details, or fine notes..."
                  value={modalNotes}
                  onChange={(e) => setModalNotes(e.target.value)}
                  className="w-full p-3 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-50 p-4 px-6 border-t border-slate-200 flex items-center justify-end gap-3">
              <button
                onClick={() => setReturnModalTx(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => handleTableReturn(returnModalTx.id, modalCondition, modalNotes)}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-xs shadow-md shadow-emerald-200 hover:opacity-95 transition-all flex items-center gap-2 cursor-pointer active:scale-95"
              >
                <CheckCircle className="w-4 h-4" />
                <span>{returnModalTx.status === 'OVERDUE' ? 'Pay Fine & Confirm Return →' : 'Confirm Check-in'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* OVERDUE FINE PAYMENT SCANNER & SETTLEMENT MODAL              */}
      {/* ============================================================= */}
      {finePaymentModalTx && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden my-auto">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-rose-600 via-amber-600 to-amber-500 p-5 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-white/20 rounded-2xl">
                  <AlertTriangle className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold font-poppins text-lg text-white">Overdue Fine Payment Required</h3>
                  <p className="text-xs text-amber-100">Pay overdue fine via Scanner or Counter to finalize return</p>
                </div>
              </div>
              <button
                onClick={() => setFinePaymentModalTx(null)}
                className="p-1.5 rounded-xl text-amber-100 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              {/* Overdue Telemetry Banner */}
              <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-xs space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase text-rose-700 bg-rose-100 px-2 py-0.5 rounded-md">
                      ⚠️ {finePaymentModalTx.daysOverdue} Days Past Due Date
                    </span>
                    <h4 className="font-bold text-slate-900 text-sm mt-1">{finePaymentModalTx.tx.bookTitle}</h4>
                    <p className="font-mono text-slate-600 text-[11px]">
                      Accession: {finePaymentModalTx.tx.accessionNo} | Barcode: {finePaymentModalTx.tx.barcode}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-500 font-bold uppercase block">Fine Amount</span>
                    <span className="text-xl font-black text-rose-700 font-mono">
                      ₹{finePaymentModalTx.fineAmount.toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-rose-200/80 grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-slate-500">Borrower:</span>{' '}
                    <strong className="text-slate-800">{finePaymentModalTx.tx.memberName}</strong>
                    <span className="text-slate-500 block font-mono text-[10px]">{finePaymentModalTx.tx.memberCardNo}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Scheduled Due:</span>{' '}
                    <strong className="text-rose-700 font-mono">{formatOnlyTimeInBracket(finePaymentModalTx.tx.dueDate)}</strong>
                    <span className="text-slate-500 block text-[10px]">Overdue Fine Rate: ₹{state.config?.fineRatePerDay || 5}/day</span>
                  </div>
                </div>
              </div>

              {/* Payment Mode Selector Tabs */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">Select Settlement / Scanner Method</label>
                <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-2xl">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('UPI_QR')}
                    className={`flex items-center justify-center gap-2 p-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      paymentMethod === 'UPI_QR'
                        ? 'bg-white text-purple-700 shadow-xs border border-purple-200'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Smartphone className="w-4 h-4" />
                    <span>UPI QR Scanner</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('CASH')}
                    className={`flex items-center justify-center gap-2 p-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      paymentMethod === 'CASH'
                        ? 'bg-white text-emerald-700 shadow-xs border border-emerald-200'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Banknote className="w-4 h-4" />
                    <span>Cash at Desk</span>
                  </button>
                </div>
              </div>

              {/* Payment Mode Interactive Area */}
              {paymentMethod === 'UPI_QR' && (() => {
                const upiUrl = getUpiPaymentUrl({
                  vpa: 'centralunivlibrary@bank',
                  name: 'University Central Library',
                  amount: finePaymentModalTx.fineAmount,
                  note: `Overdue Fine ${finePaymentModalTx.tx.accessionNo} ${finePaymentModalTx.tx.memberCardNo}`,
                });
                return (
                  <div className="bg-purple-50/70 border border-purple-200 rounded-2xl p-4 text-center space-y-3 animate-fadeIn">
                    <div className="flex items-center justify-between px-1">
                      <span className="text-[11px] font-bold text-purple-900 flex items-center gap-1.5">
                        <QrCode className="w-3.5 h-3.5 text-purple-600" /> Scan & Pay with Any UPI App
                      </span>
                      <span className="text-[10px] font-extrabold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full">
                        Instant Verification
                      </span>
                    </div>

                    {/* QR Code Container */}
                    <div className="relative w-44 h-44 mx-auto bg-white p-2.5 rounded-2xl border-2 border-purple-300 shadow-md flex items-center justify-center overflow-hidden">
                      <div
                        className="w-full h-full flex items-center justify-center"
                        dangerouslySetInnerHTML={{
                          __html: generateQrSvgString(upiUrl, 160),
                        }}
                      />
                      <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-purple-500 to-transparent animate-pulse" />
                    </div>

                    <div className="space-y-1.5">
                      <p className="text-[12px] font-bold text-slate-800">
                        Amount Payable: <span className="font-mono text-purple-700 font-extrabold text-base">₹{finePaymentModalTx.fineAmount.toFixed(2)}</span>
                      </p>
                      <div className="flex items-center justify-center gap-2">
                        <span className="text-[10px] font-mono bg-white px-2 py-1 rounded-lg border border-purple-200 text-slate-700 select-all">
                          UPI ID: centralunivlibrary@bank
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard?.writeText('centralunivlibrary@bank');
                          }}
                          className="text-[10px] font-bold text-purple-700 hover:text-purple-900 bg-purple-100 hover:bg-purple-200 px-2 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                        >
                          <Copy className="w-3 h-3" /> Copy
                        </button>
                      </div>
                      <p className="text-[9.5px] text-slate-500 font-medium">Google Pay • PhonePe • Paytm • BHIM • Cred • Any Banking UPI</p>
                    </div>
                  </div>
                );
              })()}

              {paymentMethod === 'CASH' && (
                <div className="bg-emerald-50/60 border border-emerald-200 rounded-2xl p-4 text-center space-y-2 animate-fadeIn">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                    <Banknote className="w-5 h-5" />
                  </div>
                  <h4 className="font-bold text-slate-900 text-xs">Cash Collection at Circulation Counter</h4>
                  <p className="text-[11px] text-slate-600">
                    Collect exact cash <strong className="text-emerald-700 font-mono">₹{finePaymentModalTx.fineAmount.toFixed(2)}</strong> from borrower and hand over physical acknowledgment.
                  </p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-50 p-4 px-6 border-t border-slate-200 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setFinePaymentModalTx(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={isVerifyingPayment}
                onClick={handleProcessFineAndReturn}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs shadow-md shadow-emerald-500/20 transition-all flex items-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
              >
                {isVerifyingPayment ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Verifying & Processing Return...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Confirm Payment (₹{finePaymentModalTx.fineAmount.toFixed(2)}) & Process Return →</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* OFFICIAL FINE PAYMENT RECEIPT & RETURN ACKNOWLEDGMENT MODAL   */}
      {/* ============================================================= */}
      {lastPaymentReceipt && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-md w-full border border-slate-200 shadow-2xl overflow-hidden my-auto">
            <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-5 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-2xl">
                  <CheckCircle2 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold font-poppins text-base text-white">Payment & Return Completed</h3>
                  <p className="text-xs text-emerald-100">Official Electronic Circulation Receipt</p>
                </div>
              </div>
              <button
                onClick={() => setLastPaymentReceipt(null)}
                className="p-1.5 rounded-xl text-emerald-100 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="text-center py-2">
                <span className="font-mono text-xs font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
                  Receipt #{lastPaymentReceipt.receiptNo}
                </span>
                <p className="text-slate-400 text-[10px] mt-1.5">{lastPaymentReceipt.date}</p>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">Book Returned:</span>
                  <strong className="text-slate-900 text-right max-w-[200px] truncate">{lastPaymentReceipt.bookTitle}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Accession No:</span>
                  <span className="font-mono font-bold text-slate-800">{lastPaymentReceipt.accessionNo}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Borrower:</span>
                  <strong className="text-slate-900">{lastPaymentReceipt.memberName}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Member ID:</span>
                  <span className="font-mono text-slate-700">{lastPaymentReceipt.memberCardNo}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Payment Channel:</span>
                  <span className="font-bold text-emerald-700">{lastPaymentReceipt.paymentMethod}</span>
                </div>
                <div className="pt-2 border-t border-slate-200 flex justify-between items-center">
                  <span className="font-extrabold text-slate-800">Settled Fine Amount:</span>
                  <span className="text-base font-black text-emerald-700 font-mono">
                    ₹{lastPaymentReceipt.fineAmount.toFixed(2)}
                  </span>
                </div>

                <div className="pt-2 border-t border-dashed border-slate-200 flex items-center justify-between">
                  <div className="text-left text-[10px] text-slate-500 font-mono">
                    <p className="font-bold text-slate-700 uppercase">Status: Restored & Cleared</p>
                    <p>Auth: Circulation Clearance</p>
                  </div>
                  <AuthorizedCirculationSeal type="FINE_PAYMENT" date={lastPaymentReceipt.date} size="sm" />
                </div>
              </div>
            </div>

            <div className="bg-slate-50 p-4 px-6 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setLastPaymentReceipt(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Done
              </button>
              <button
                type="button"
                onClick={() => handlePrintReceipt(lastPaymentReceipt)}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" /> Print Receipt
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* EXTENSION ACTIVE WARNING & UN-APPROVAL CONFIRMATION MODAL    */}
      {/* ============================================================= */}
      {extensionWarningModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden animate-scaleUp">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-5 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-white/20 rounded-2xl">
                  <Clock className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-bold font-poppins text-lg text-white">Time Extension Pending Approval!</h3>
                  <p className="text-xs text-amber-100">Member requested return date extension</p>
                </div>
              </div>
              <button
                onClick={() => setExtensionWarningModal(null)}
                className="p-1.5 rounded-xl text-amber-100 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs space-y-3">
                <div className="flex items-start gap-2.5 text-amber-900">
                  <AlertTriangle className="w-5 h-5 shrink-0 text-amber-600 mt-0.5" />
                  <p className="leading-relaxed">
                    <strong>{extensionWarningModal.extension.memberName}</strong> ({extensionWarningModal.extension.memberCardNo}) has an active request to extend this book's due date by <span className="font-extrabold text-amber-950 font-mono">+{extensionWarningModal.extension.requestedExtensionDays} Days</span>.
                  </p>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-amber-200 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Book Title:</span>
                    <strong className="text-slate-900 truncate max-w-[240px]">{extensionWarningModal.tx.bookTitle}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Current Due Date:</span>
                    <span className="font-mono font-bold text-slate-800">{formatOnlyTimeInBracket(extensionWarningModal.tx.dueDate)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Requested Extension:</span>
                    <span className="font-bold text-amber-800">+{extensionWarningModal.extension.requestedExtensionDays} Days ({extensionWarningModal.extension.requestedDate})</span>
                  </div>
                  <div className="pt-1.5 border-t border-slate-100">
                    <span className="text-slate-500 block mb-1">Reason Provided by Member:</span>
                    <p className="italic text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-200 leading-relaxed">
                      "{extensionWarningModal.extension.reason}"
                    </p>
                  </div>
                </div>

                <p className="text-[11px] text-amber-800">
                  Directly accepting this book return will <strong>un-approve / cancel</strong> the extension request and check in the volume. Or, you can review and approve the extension at the Approvals Desk.
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-50 p-4 px-6 border-t border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
              <button
                type="button"
                onClick={() => setExtensionWarningModal(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer text-center"
              >
                Keep Book Borrowed
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setExtensionWarningModal(null);
                    navigate('/admin/renew-books');
                  }}
                  className="px-4 py-2.5 rounded-xl border border-purple-300 bg-purple-50 hover:bg-purple-100 text-purple-800 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <ShieldCheck className="w-4 h-4" /> Go to Approvals Desk
                </button>

                <button
                  type="button"
                  onClick={handleCancelExtensionAndReturn}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-rose-600 hover:from-amber-700 hover:to-rose-700 text-white font-bold text-xs shadow-md shadow-amber-500/20 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                >
                  <RotateCcw className="w-4 h-4" /> Un-approve & Return Book
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Helper Barcode & Live Camera Scanner Modal */}
      <BarcodeScannerModal
        isOpen={isHelperScannerOpen}
        onClose={() => setIsHelperScannerOpen(false)}
        onScanSuccess={(scannedCode) => {
          setIsHelperScannerOpen(false);
          if (helperScannerType === 'STUDENT_ID') {
            handleProcessMemberInput(scannedCode);
          } else {
            handleProcessBookInput(scannedCode);
          }
        }}
        scannerType={helperScannerType}
        title={helperScannerTitle}
      />
    </div>
  );
}
