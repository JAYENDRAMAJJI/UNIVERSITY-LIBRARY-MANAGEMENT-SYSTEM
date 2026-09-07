import { useState, useEffect, useMemo } from 'react';
import { IndianRupee, CheckCircle, Printer, Bell, Send, Search, X, Download, FileSpreadsheet, Calendar, Users, Trash2, Smartphone, Banknote, AlertTriangle, RotateCcw, CheckCircle2, RefreshCw, Edit2, FileText, ShieldAlert, Check, Copy, QrCode } from 'lucide-react';
import { libraryStore, getSystemFineSummary, getTransactionFineAmount, getLocalDateStr, getAllUnifiedFines } from '../../services/libraryStore.service';
import { exportStyledExcelFile } from '../../utils/excelExport';
import { FineRecord, CopyCondition, IssueTransaction } from '../../types/library';
import { generateQrSvgString, getUpiPaymentUrl } from '../../utils/barcodeQrGenerator';
import SendNotificationModal from '../../components/common/SendNotificationModal';
import AuthorizedCirculationSeal, { generateAuthorizedSealHtml } from '../../components/common/AuthorizedCirculationSeal';

export default function FineManagement() {
  const [state, setState] = useState(libraryStore.snapshot);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFineForReceipt, setSelectedFineForReceipt] = useState<FineRecord | null>(null);
  const [waiveModalFine, setWaiveModalFine] = useState<FineRecord | null>(null);
  const [waiveReasonInput, setWaiveReasonInput] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [notificationModalData, setNotificationModalData] = useState<{ member: any; context: any } | null>(null);

  // Collect Fine & Return Book Modal State
  const [collectFineModalData, setCollectFineModalData] = useState<{
    fine: FineRecord;
    activeTx?: IssueTransaction;
    condition: CopyCondition;
    paymentMethod: 'UPI_QR' | 'CASH';
    notes: string;
  } | null>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  // Export CSV/Excel Modal State
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportStartDate, setExportStartDate] = useState('');
  const [exportEndDate, setExportEndDate] = useState('');
  const [exportStatusFilter, setExportStatusFilter] = useState('ALL');
  const [exportRoleFilter, setExportRoleFilter] = useState('ALL');
  const [selectedExportMemberCards, setSelectedExportMemberCards] = useState<string[]>([]);
  const [modalMemberSearch, setModalMemberSearch] = useState('');

  useEffect(() => {
    const sub = libraryStore.getObservable().subscribe(setState);
    return () => sub.unsubscribe();
  }, []);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleDeleteFine = (fine: FineRecord) => {
    if (window.confirm(`Are you sure you want to remove this fine record for ${fine.memberName} (₹${fine.amount.toFixed(2)})?`)) {
      const res = libraryStore.deleteFine(fine.id);
      triggerToast(res.message);
    }
  };

  const handlePrintFineReceipt = (fine: FineRecord) => {
    const printWindow = window.open('', '_blank', 'width=700,height=800');
    if (!printWindow) {
      window.print();
      return;
    }

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Library Fine Payment Slip - ${fine.receiptNo || fine.id}</title>
          <style>
            @page { size: portrait; margin: 15mm; }
            body { font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; color: #0f172a; margin: 0; padding: 30px; font-size: 13px; line-height: 1.5; }
            .no-print { margin-bottom: 20px; }
            .print-btn { background: #0f172a; color: #fff; border: none; padding: 9px 18px; border-radius: 8px; font-weight: 700; cursor: pointer; }
            .close-btn { background: #64748b; color: #fff; border: none; padding: 9px 18px; border-radius: 8px; font-weight: 700; cursor: pointer; margin-left: 8px; }
            .receipt-card { border: 2px solid #e2e8f0; border-radius: 16px; padding: 28px; max-width: 580px; margin: 0 auto; background: #ffffff; }
            .header { text-align: center; border-bottom: 2px dashed #cbd5e1; padding-bottom: 16px; margin-bottom: 20px; }
            .univ-title { font-size: 18px; font-weight: 900; color: #1e3a8a; margin: 0; }
            .doc-sub { font-size: 11px; color: #64748b; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; margin-top: 4px; }
            .rcp-badge { display: inline-block; background: #ecfdf5; border: 1px solid #a7f3d0; color: #065f46; font-family: monospace; font-size: 12px; font-weight: 800; padding: 3px 12px; border-radius: 9999px; margin-top: 10px; }
            table.info-table { width: 100%; border-collapse: collapse; margin-bottom: 18px; }
            table.info-table td { padding: 8px 4px; vertical-align: top; }
            table.info-table td.label { width: 35%; color: #64748b; font-weight: 700; font-size: 11px; text-transform: uppercase; }
            table.info-table td.value { font-weight: 700; color: #0f172a; }
            .amount-box { background: #f8fafc; border: 2px solid #e2e8f0; border-radius: 12px; padding: 14px; text-align: center; margin: 20px 0; }
            .amount-box .val { font-size: 24px; font-weight: 900; color: #059669; font-family: monospace; }
            .footer { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 30px; }
            .sign-line { border-top: 1px solid #94a3b8; width: 160px; padding-top: 4px; font-size: 10px; font-weight: 700; color: #475569; text-align: center; }
            @media print { .no-print { display: none; } body { padding: 0; } .receipt-card { border: 1px solid #cbd5e1; } }
          </style>
        </head>
        <body>
          <div class="no-print">
            <button class="print-btn" onclick="window.print()">🖨️ Print Receipt Slip</button>
            <button class="close-btn" onclick="window.close()">Close</button>
          </div>
          <div class="receipt-card">
            <div class="header">
              <h1 class="univ-title">UNIVERSITY CENTRAL LIBRARY</h1>
              <div class="doc-sub">Library Fine Payment Slip</div>
              <div class="rcp-badge">RECEIPT NO: ${fine.receiptNo || fine.id}</div>
            </div>

            <table class="info-table">
              <tr>
                <td class="label">Member Name</td>
                <td class="value">${fine.memberName}</td>
              </tr>
              <tr>
                <td class="label">Member ID / Card No</td>
                <td class="value" style="font-family: monospace;">${fine.memberCardNo}</td>
              </tr>
              <tr>
                <td class="label">Associated Book</td>
                <td class="value">${fine.bookTitle}</td>
              </tr>
              <tr>
                <td class="label">Fine Assessment Reason</td>
                <td class="value">${fine.reason}</td>
              </tr>
              <tr>
                <td class="label">Settlement Date</td>
                <td class="value">${fine.paidDate || fine.createdDate}</td>
              </tr>
              ${fine.paymentMethod ? `<tr><td class="label">Payment Mode</td><td class="value">${fine.paymentMethod}</td></tr>` : ''}
            </table>

            <div class="amount-box">
              <div style="font-size: 10px; font-weight: 800; color: #64748b; text-transform: uppercase;">Amount Paid & Settled</div>
              <div class="val">₹${(fine.paidAmount || fine.amount).toFixed(2)}</div>
              <div style="font-size: 11px; color: #059669; font-weight: 700; margin-top: 2px;">✓ FULLY PAID & DUES CLEARED</div>
            </div>

            <div class="footer">
              <div style="font-size: 10px; color: #64748b;">
                <div>Authorized System Clearance</div>
                <div>Generated: ${new Date().toLocaleDateString()}</div>
                <div>Status: <strong>SETTLED & DUES CLEARED</strong></div>
              </div>
              <div style="display: flex; align-items: center; gap: 20px;">
                ${generateAuthorizedSealHtml('FINE_PAYMENT', fine.paidDate || fine.createdDate)}
                <div style="text-align: center;">
                  <div style="height: 32px;"></div>
                  <div class="sign-line">Accounts / Circulation Officer</div>
                </div>
              </div>
            </div>
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

  const allUnifiedFines = useMemo(() => {
    return getAllUnifiedFines(state);
  }, [state]);

  const filteredFines = useMemo(() => {
    return allUnifiedFines.filter((f) => {
      const q = searchTerm.toLowerCase().trim();
      if (!q) {
        return filterStatus === 'ALL' || f.status === filterStatus;
      }
      const matchesSearch =
        f.memberName.toLowerCase().includes(q) ||
        f.memberCardNo.toLowerCase().includes(q) ||
        f.bookTitle.toLowerCase().includes(q) ||
        f.reason.toLowerCase().includes(q) ||
        (f.receiptNo && f.receiptNo.toLowerCase().includes(q)) ||
        (f.transactionId && f.transactionId.toLowerCase().includes(q)) ||
        (f.id && f.id.toLowerCase().includes(q)) ||
        (f.paidDate && f.paidDate.toLowerCase().includes(q));

      const matchesStatus = filterStatus === 'ALL' || f.status === filterStatus;
      return matchesSearch && matchesStatus;
    });
  }, [allUnifiedFines, searchTerm, filterStatus]);

  const totalCollected = useMemo(() => {
    return allUnifiedFines.filter((f) => f.status === 'PAID').reduce((acc, f) => acc + (f.paidAmount || f.amount || 0), 0);
  }, [allUnifiedFines]);

  const totalPending = useMemo(() => {
    return allUnifiedFines.filter((f) => f.status === 'UNPAID').reduce((acc, f) => acc + (f.amount || 0), 0);
  }, [allUnifiedFines]);

  const totalWaived = useMemo(() => {
    return allUnifiedFines.filter((f) => f.status === 'WAIVED').reduce((acc, f) => acc + (f.amount || 0), 0);
  }, [allUnifiedFines]);

  const openExportModal = () => {
    setExportStartDate('');
    setExportEndDate('');
    setExportStatusFilter(filterStatus);
    setExportRoleFilter('ALL');
    setSelectedExportMemberCards([]);
    setModalMemberSearch('');
    setShowExportModal(true);
  };

  const exportRecordsInRange = useMemo(() => {
    return allUnifiedFines.filter((f) => {
      if (exportStatusFilter !== 'ALL' && f.status !== exportStatusFilter) {
        return false;
      }
      if (exportRoleFilter !== 'ALL') {
        const member = state.members.find(
          (m) => m.id === f.memberId || m.memberCardNo === f.memberCardNo
        );
        if (member && member.role !== exportRoleFilter) {
          return false;
        }
      }
      if (selectedExportMemberCards.length > 0 && !selectedExportMemberCards.includes(f.memberCardNo)) {
        return false;
      }
      if (exportStartDate) {
        const fDate = f.createdDate ? new Date(f.createdDate) : null;
        if (fDate && fDate < new Date(exportStartDate)) {
          return false;
        }
      }
      if (exportEndDate) {
        const fDate = f.createdDate ? new Date(f.createdDate) : null;
        if (fDate && fDate > new Date(exportEndDate + 'T23:59:59')) {
          return false;
        }
      }
      return true;
    });
  }, [allUnifiedFines, state.members, exportStatusFilter, exportRoleFilter, selectedExportMemberCards, exportStartDate, exportEndDate]);

  const handleExecuteCustomExport = () => {
    const headers = [
      'Fine ID',
      'Transaction ID',
      'Member Card No',
      'Member Name',
      'Member Role',
      'Department',
      'Book Title',
      'Fine Reason',
      'Amount (INR)',
      'Paid Amount (INR)',
      'Fine Status',
      'Created Date',
      'Paid Date',
      'Receipt No',
      'Waive Reason',
    ];

    const rows = exportRecordsInRange.map((f) => {
      const member = state.members.find(
        (m) => m.id === f.memberId || m.memberCardNo === f.memberCardNo
      );
      return [
        f.id,
        f.transactionId,
        f.memberCardNo,
        f.memberName || '',
        member?.role || 'STUDENT',
        member?.department || '',
        f.bookTitle || '',
        f.reason,
        `₹${f.amount.toFixed(2)}`,
        `₹${(f.paidAmount || 0).toFixed(2)}`,
        f.status,
        f.createdDate,
        f.paidDate || 'N/A',
        f.receiptNo || 'N/A',
        f.waiveReason || '',
      ];
    });

    let memberSlug = '';
    if (selectedExportMemberCards.length === 1) {
      const m = state.members.find((mb) => mb.memberCardNo === selectedExportMemberCards[0]);
      memberSlug = m ? `_${m.name.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 25)}` : `_${selectedExportMemberCards[0]}`;
    } else if (selectedExportMemberCards.length > 1) {
      memberSlug = `_${selectedExportMemberCards.length}_selected_members`;
    }

    exportStyledExcelFile({
      filename: `fine_management_ledger${memberSlug}_export_${getLocalDateStr(new Date())}.xlsx`,
      sheetName: 'Fines Ledger',
      headers,
      data: rows,
      themeColor: 'BE123C', // Rose/Crimson Red Header
    });

    setShowExportModal(false);
    triggerToast(`Exported ${exportRecordsInRange.length} fine records to formatted Excel spreadsheet successfully!`);
  };

  const handleOpenCollectModal = (fine: FineRecord) => {
    const targetTxId = fine.transactionId || (fine.id.startsWith('fine-live-') ? fine.id.replace('fine-live-', '') : undefined);
    const activeTx = targetTxId
      ? (state.transactions || []).find((t) => t.id === targetTxId && (t.status === 'ISSUED' || t.status === 'OVERDUE'))
      : undefined;

    setCollectFineModalData({
      fine,
      activeTx,
      condition: 'GOOD',
      paymentMethod: 'UPI_QR',
      notes: '',
    });
  };

  const handleConfirmCollectAndReturn = () => {
    if (!collectFineModalData) return;
    const { fine, activeTx, condition, paymentMethod, notes } = collectFineModalData;
    setIsProcessingPayment(true);

    setTimeout(() => {
      const generatedReceiptNo = `RCP-${Date.now().toString().slice(-6)}`;

      if (activeTx) {
        // 1. Process book return with fine payment
        libraryStore.returnBook(
          activeTx.id,
          condition,
          notes.trim() || 'Fine collected & book checked in at Fine Desk',
          {
            paymentMethod,
            paidAmount: fine.amount,
            receiptNo: generatedReceiptNo,
            collectedBy: 'Chief Admin Librarian',
          }
        );

        triggerToast(`Fine payment of ₹${fine.amount.toFixed(2)} collected. "${activeTx.bookTitle}" returned & checked in cleanly!`);

        const updated = libraryStore.snapshot.fines.find((f) => f.transactionId === activeTx.id || f.id === fine.id);
        if (updated) setSelectedFineForReceipt(updated);
      } else {
        // 2. Direct fine payment processing
        libraryStore.processFinePayment(fine.id, 'PAY');
        triggerToast(`Fine payment of ₹${fine.amount.toFixed(2)} collected successfully!`);
        const updated = libraryStore.snapshot.fines.find((f) => f.id === fine.id);
        if (updated) setSelectedFineForReceipt(updated);
      }

      setIsProcessingPayment(false);
      setCollectFineModalData(null);
    }, 500);
  };

  const handleWaiveSubmit = () => {
    if (!waiveModalFine) return;
    const isAlreadyWaived = waiveModalFine.status === 'WAIVED';

    if (isAlreadyWaived) {
      const res = libraryStore.updateFineWaiveReason(
        waiveModalFine.id,
        waiveReasonInput || 'Waived by Librarian approval.'
      );
      triggerToast(res.message);
    } else {
      libraryStore.processFinePayment(
        waiveModalFine.id,
        'WAIVE',
        waiveReasonInput || 'Waived by Librarian approval.'
      );
      triggerToast(`Fine of ₹${waiveModalFine.amount.toFixed(2)} waived for ${waiveModalFine.memberName}.`);
    }

    setWaiveModalFine(null);
    setWaiveReasonInput('');
  };

  const handleOpenWaiveModal = (fine: FineRecord) => {
    setWaiveModalFine(fine);
    setWaiveReasonInput(fine.waiveReason || '');
  };

  const handleSendReminder = (fine: FineRecord) => {
    const member = state.members.find((m) => m.id === fine.memberId || m.memberCardNo === fine.memberCardNo);
    setNotificationModalData({
      member: {
        id: fine.memberId,
        name: fine.memberName,
        email: member?.email,
        memberCardNo: fine.memberCardNo,
        role: member?.role,
      },
      context: {
        type: 'FINE_DUE',
        bookTitle: fine.bookTitle,
        fineAmount: fine.amount,
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-rose-700 bg-rose-50 px-3 py-1 rounded-full mb-2">
            <IndianRupee className="h-3.5 w-3.5" /> Finance & Penalty Ledger
          </div>
          <h1 className="text-2xl font-bold font-poppins text-slate-900">Fine Management Desk</h1>
          <p className="text-sm text-slate-500 mt-1">Collect overdue fines, issue official payment receipts, and manage fee waivers.</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap shrink-0">
          <button
            type="button"
            onClick={() => {
              setNotificationModalData({
                member: null,
                context: {
                  type: 'FINE_DUE',
                  fineAmount: 50,
                },
              });
            }}
            className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition-all flex items-center gap-2 cursor-pointer shadow-md shadow-rose-200 active:scale-95"
            title="Dispatch Fine & Dues Settlement Notice to Member"
          >
            <Bell className="h-4 w-4" />
            <span>Send Dues Notice</span>
          </button>

          {/* Export CSV Report Button */}
          <button
            type="button"
            onClick={openExportModal}
            className="px-4 py-2.5 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 font-bold text-xs transition-all flex items-center gap-2 cursor-pointer shadow-2xs active:scale-95 shrink-0"
          >
            <Download className="h-4 w-4 text-blue-600" />
            <span>Export CSV Report</span>
          </button>
        </div>
      </div>

      {toastMessage && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-medium">
          <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-rose-200 bg-rose-50/20 shadow-xs">
          <p className="text-xs font-semibold text-rose-700 uppercase">Pending Unpaid Fines</p>
          <p className="text-3xl font-bold text-rose-800 mt-2">₹{totalPending.toFixed(2)}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-emerald-200 bg-emerald-50/20 shadow-xs">
          <p className="text-xs font-semibold text-emerald-700 uppercase">Total Collected Fines</p>
          <p className="text-3xl font-bold text-emerald-800 mt-2">₹{totalCollected.toFixed(2)}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <p className="text-xs font-semibold text-slate-500 uppercase">Waived Amount</p>
          <p className="text-3xl font-bold text-slate-800 mt-2">₹{totalWaived.toFixed(2)}</p>
        </div>
      </div>

      {/* Table & Search Filter Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-6 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Fine Transaction Records</h2>
            <p className="text-xs text-slate-500">Live registry of overdue penalties, fine collections, and payment receipts.</p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Integrated Search Input */}
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search Receipt No, Member, Card, Book..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-9 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/15 bg-slate-50/50 hover:bg-white transition-all"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1 rounded-full hover:bg-slate-200/60 transition-colors cursor-pointer"
                  title="Clear search"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Status Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto text-xs shrink-0 p-1 bg-slate-100 rounded-xl">
              {[
                { id: 'ALL', label: 'All Fines' },
                { id: 'UNPAID', label: 'Unpaid' },
                { id: 'PAID', label: 'Paid' },
                { id: 'WAIVED', label: 'Waived' },
              ].map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setFilterStatus(st.id)}
                  className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all cursor-pointer whitespace-nowrap ${
                    filterStatus === st.id
                      ? 'bg-white text-rose-700 shadow-2xs border border-rose-200/60'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase">
                <th className="py-3 px-4">Member Name & Card</th>
                <th className="py-3 px-4">Book Title</th>
                <th className="py-3 px-4">Fine Amount</th>
                <th className="py-3 px-4">Reason</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredFines.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
                        <IndianRupee className="w-6 h-6" />
                      </div>
                      <p className="text-sm font-bold text-slate-700 font-poppins">No Fine Records Found</p>
                      <p className="text-xs text-slate-400 max-w-sm">
                        {searchTerm
                          ? `No fine records found matching "${searchTerm}". Try another keyword or filter tab.`
                          : `There are currently no ${filterStatus !== 'ALL' ? filterStatus.toLowerCase() : ''} fine records recorded.`}
                      </p>
                      {searchTerm && (
                        <button
                          type="button"
                          onClick={() => setSearchTerm('')}
                          className="mt-2 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer transition-colors"
                        >
                          Clear Search Filter
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredFines.map((fine) => (
                  <tr key={fine.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-4 px-4 font-medium text-slate-900">
                      <p className="font-bold">{fine.memberName}</p>
                      <p className="text-xs font-mono text-slate-500">{fine.memberCardNo}</p>
                    </td>
                    <td className="py-4 px-4 font-medium text-slate-800">{fine.bookTitle}</td>
                    <td className="py-4 px-4 font-bold text-rose-700 font-mono">₹{fine.amount.toFixed(2)}</td>
                    <td className="py-4 px-4 text-xs font-semibold text-slate-600">
                      <p className="font-bold text-slate-800">
                        {fine.reason === 'OVERDUE'
                          ? 'Overdue Fine (Late Return)'
                          : fine.reason === 'DAMAGED'
                          ? 'Book Damage Penalty'
                          : fine.reason === 'LOST'
                          ? 'Book Replacement Cost'
                          : fine.reason}
                      </p>
                      <p className="text-[10px] font-mono text-slate-400">Date: {fine.createdDate}</p>

                      {/* Waive / Payment Reason Details */}
                      {fine.status === 'WAIVED' ? (
                        <div className="mt-1.5 space-y-0.5">
                          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200/80 text-[11px] font-bold">
                            <FileText className="w-3 h-3 text-purple-600 shrink-0" />
                            <span>Waive Reason: {fine.waiveReason || 'Approved by Librarian'}</span>
                          </div>
                          {fine.waivedBy && (
                            <p className="text-[10px] text-purple-600 font-medium">By: {fine.waivedBy}</p>
                          )}
                        </div>
                      ) : fine.status === 'PAID' ? (
                        <div className="mt-1">
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60">
                            <Check className="w-3 h-3 text-emerald-600" /> Settled • Receipt #{fine.receiptNo || fine.id}
                          </span>
                        </div>
                      ) : (
                        <div className="mt-1">
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/60">
                            • Not Waived (Dues Pending)
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="py-4 px-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                          fine.status === 'PAID'
                            ? 'bg-emerald-100 text-emerald-800'
                            : fine.status === 'UNPAID'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-purple-100 text-purple-800'
                        }`}
                      >
                        {fine.status}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {fine.status === 'UNPAID' && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleSendReminder(fine)}
                              className="px-2.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-xs flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
                              title="Send Fine Settlement & Dues Notice to Member"
                            >
                              <Bell className="h-3.5 w-3.5" />
                              <span>Dues Notice</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenCollectModal(fine)}
                              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-sm transition-all cursor-pointer active:scale-95"
                            >
                              Collect ₹{fine.amount.toFixed(2)}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenWaiveModal(fine)}
                              className="px-3 py-1.5 rounded-lg border border-purple-200 bg-purple-50 text-purple-700 font-semibold text-xs hover:bg-purple-100 transition-colors cursor-pointer"
                            >
                              Waive Fine
                            </button>
                          </>
                        )}
                        {fine.status === 'WAIVED' && (
                          <button
                            type="button"
                            onClick={() => handleOpenWaiveModal(fine)}
                            className="px-2.5 py-1.5 rounded-lg border border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100 font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                            title="Update / Edit Waive Reason"
                          >
                            <Edit2 className="h-3 w-3" />
                            <span>Edit Reason</span>
                          </button>
                        )}
                        {fine.status === 'PAID' && (
                          <button
                            onClick={() => setSelectedFineForReceipt(fine)}
                            className="px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-blue-700 font-semibold text-xs hover:bg-slate-100 flex items-center gap-1 cursor-pointer"
                          >
                            <Printer className="h-3.5 w-3.5" /> View Receipt
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDeleteFine(fine)}
                          className="p-1.5 rounded-lg border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 hover:text-rose-700 transition-colors cursor-pointer"
                          title="Delete / Remove Fine Record"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ============================================================= */}
      {/* FINE COLLECTION & BOOK RETURN MODAL                          */}
      {/* ============================================================= */}
      {collectFineModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden my-auto">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-teal-700 p-5 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-white/20 rounded-2xl">
                  <RotateCcw className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold font-poppins text-lg text-white">
                    {collectFineModalData.activeTx ? 'Collect Fine & Return Book' : 'Collect Fine Payment'}
                  </h3>
                  <p className="text-xs text-emerald-100">
                    {collectFineModalData.activeTx
                      ? 'Process overdue fine settlement and check in book copy to shelf'
                      : 'Record fine payment receipt and clear member dues'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCollectFineModalData(null)}
                className="p-1.5 rounded-xl text-emerald-100 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              {/* Summary Card */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2 text-xs">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase text-rose-700 bg-rose-100 px-2 py-0.5 rounded-md">
                      {collectFineModalData.fine.reason} FINE
                    </span>
                    <h4 className="font-bold text-slate-900 text-sm mt-1">{collectFineModalData.fine.bookTitle}</h4>
                    {collectFineModalData.activeTx && (
                      <p className="font-mono text-slate-600 text-[11px] mt-0.5">
                        Accession: {collectFineModalData.activeTx.accessionNo} | Barcode: {collectFineModalData.activeTx.barcode}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-500 font-bold uppercase block">Total Due</span>
                    <span className="text-xl font-black text-rose-700 font-mono">
                      ₹{collectFineModalData.fine.amount.toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200 grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-slate-500">Borrower:</span>{' '}
                    <strong className="text-slate-800">{collectFineModalData.fine.memberName}</strong>
                    <span className="text-slate-500 block font-mono text-[10px]">{collectFineModalData.fine.memberCardNo}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Scheduled Due:</span>{' '}
                    <strong className="text-rose-700 font-mono">{collectFineModalData.fine.createdDate}</strong>
                    <span className="text-slate-500 block text-[10px]">Overdue Fine Rate: ₹{state.config?.fineRatePerDay || 5}/day</span>
                  </div>
                </div>
              </div>

              {/* Book Condition Selector (if active loan return) */}
              {collectFineModalData.activeTx && (
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">Book Condition Upon Return Check-in</label>
                  <select
                    value={collectFineModalData.condition}
                    onChange={(e) =>
                      setCollectFineModalData({
                        ...collectFineModalData,
                        condition: e.target.value as any,
                      })
                    }
                    className="w-full py-2.5 px-3.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 cursor-pointer"
                  >
                    <option value="GOOD">GOOD (Normal - Ready for re-shelving)</option>
                    <option value="NEW">NEW (Like New - Pristine condition)</option>
                    <option value="DAMAGED">DAMAGED (Requires Maintenance)</option>
                    <option value="LOST">LOST (Reported Lost)</option>
                  </select>
                </div>
              )}

              {/* Payment Mode Selector Tabs */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">Select Collection / Settlement Method</label>
                <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-2xl">
                  <button
                    type="button"
                    onClick={() =>
                      setCollectFineModalData({
                        ...collectFineModalData,
                        paymentMethod: 'UPI_QR',
                      })
                    }
                    className={`flex items-center justify-center gap-2 p-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      collectFineModalData.paymentMethod === 'UPI_QR'
                        ? 'bg-white text-purple-700 shadow-xs border border-purple-200'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Smartphone className="w-4 h-4" />
                    <span>UPI QR Scanner</span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setCollectFineModalData({
                        ...collectFineModalData,
                        paymentMethod: 'CASH',
                      })
                    }
                    className={`flex items-center justify-center gap-2 p-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      collectFineModalData.paymentMethod === 'CASH'
                        ? 'bg-white text-emerald-700 shadow-xs border border-emerald-200'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Banknote className="w-4 h-4" />
                    <span>Cash at Counter</span>
                  </button>
                </div>
              </div>

              {/* Payment Method Details Panel */}
              {collectFineModalData.paymentMethod === 'UPI_QR' && (() => {
                const upiUrl = getUpiPaymentUrl({
                  vpa: 'centralunivlibrary@bank',
                  name: 'University Central Library',
                  amount: collectFineModalData.fine.amount,
                  note: `Fine ${collectFineModalData.fine.memberCardNo} ${collectFineModalData.fine.receiptNo || collectFineModalData.fine.id}`,
                });
                return (
                  <div className="bg-purple-50/70 border border-purple-200 rounded-2xl p-4 text-center space-y-3 animate-fadeIn">
                    <div className="flex items-center justify-between px-1">
                      <span className="text-[11px] font-bold text-purple-900 flex items-center gap-1.5">
                        <QrCode className="w-3.5 h-3.5 text-purple-600" /> Scan & Pay with Any UPI App
                      </span>
                      <span className="text-[10px] font-extrabold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full">
                        Instant Settlement
                      </span>
                    </div>

                    <div className="relative w-44 h-44 mx-auto bg-white p-2.5 rounded-2xl border-2 border-purple-300 shadow-md flex items-center justify-center overflow-hidden">
                      <div
                        className="w-full h-full flex items-center justify-center"
                        dangerouslySetInnerHTML={{
                          __html: generateQrSvgString(upiUrl, 160),
                        }}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <p className="text-[12px] font-bold text-slate-800">
                        Payable Amount: <span className="font-mono text-purple-700 font-extrabold text-base">₹{collectFineModalData.fine.amount.toFixed(2)}</span>
                      </p>
                      <div className="flex items-center justify-center gap-2">
                        <span className="text-[10px] font-mono bg-white px-2 py-1 rounded-lg border border-purple-200 text-slate-700 select-all">
                          UPI ID: centralunivlibrary@bank
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard?.writeText('centralunivlibrary@bank');
                            triggerToast('UPI ID copied to clipboard: centralunivlibrary@bank');
                          }}
                          className="text-[10px] font-bold text-purple-700 hover:text-purple-900 bg-purple-100 hover:bg-purple-200 px-2 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                        >
                          <Copy className="w-3 h-3" /> Copy
                        </button>
                      </div>
                      <p className="text-[9.5px] text-slate-500 font-medium">
                        Supported: Google Pay • PhonePe • Paytm • BHIM • Cred • Any UPI App
                      </p>
                    </div>
                  </div>
                );
              })()}

              {collectFineModalData.paymentMethod === 'CASH' && (
                <div className="bg-emerald-50/60 border border-emerald-200 rounded-2xl p-3 text-center space-y-1 animate-fadeIn text-xs">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                    <Banknote className="w-4 h-4" />
                  </div>
                  <h4 className="font-bold text-slate-900">Cash Collection at Desk</h4>
                  <p className="text-[11px] text-slate-600">
                    Collect exact cash <strong className="text-emerald-700 font-mono">₹{collectFineModalData.fine.amount.toFixed(2)}</strong> from {collectFineModalData.fine.memberName}.
                  </p>
                </div>
              )}

              {/* Notes */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700">Remarks / Return Notes (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Returned in good condition. Cash fine settled."
                  value={collectFineModalData.notes}
                  onChange={(e) =>
                    setCollectFineModalData({
                      ...collectFineModalData,
                      notes: e.target.value,
                    })
                  }
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 bg-white focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-50 p-4 px-6 border-t border-slate-200 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setCollectFineModalData(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={isProcessingPayment}
                onClick={handleConfirmCollectAndReturn}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs shadow-md shadow-emerald-500/20 transition-all flex items-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
              >
                {isProcessingPayment ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Processing Return & Settlement...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>
                      {collectFineModalData.activeTx
                        ? `Confirm Payment (₹${collectFineModalData.fine.amount.toFixed(2)}) & Return Book →`
                        : `Confirm Fine Collection (₹${collectFineModalData.fine.amount.toFixed(2)}) →`}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Waive Modal */}
      {waiveModalFine && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 space-y-4 border border-slate-100">
            <div className="flex items-center justify-between pb-1">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-purple-100 text-purple-700">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 font-poppins">
                    {waiveModalFine.status === 'WAIVED' ? 'Update Waive Reason' : 'Waive Fine Request'}
                  </h2>
                  <p className="text-xs text-slate-500">Member: <strong className="text-slate-800">{waiveModalFine.memberName}</strong> ({waiveModalFine.memberCardNo})</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setWaiveModalFine(null)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-purple-50/60 border border-purple-200/80 rounded-2xl flex items-center justify-between text-xs">
              <span className="text-purple-950 font-medium">Fine Assessment Amount:</span>
              <span className="font-bold text-purple-800 font-mono text-sm">₹{waiveModalFine.amount.toFixed(2)}</span>
            </div>

            {/* Quick Preset Buttons */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider">Quick Waiver Preset Reasons</label>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  'Medical leave & hospital certificate submitted',
                  'Departmental research project exemption',
                  'Administrative approval by Head Librarian',
                  'Severe weather / campus disruption amnesty',
                ].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setWaiveReasonInput(preset)}
                    className="p-2 text-left text-[11px] rounded-xl border border-slate-200/80 bg-slate-50 hover:bg-purple-50 hover:border-purple-200 hover:text-purple-800 text-slate-700 transition-colors cursor-pointer leading-tight"
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">Official Waiver Reason / Justification *</label>
              <textarea
                rows={3}
                value={waiveReasonInput}
                onChange={(e) => setWaiveReasonInput(e.target.value)}
                placeholder="Enter specific justification for waiving this fine dues..."
                className="w-full p-3 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 bg-white"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setWaiveModalFine(null)}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-100 rounded-xl text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleWaiveSubmit}
                className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-purple-200 transition-all cursor-pointer active:scale-95"
              >
                {waiveModalFine.status === 'WAIVED' ? 'Save & Update Reason' : 'Confirm & Waive Fine'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Receipt Modal */}
      {selectedFineForReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl shadow-xl max-w-md w-full p-6 space-y-4 border border-slate-100">
            <div className="flex justify-between items-center pb-1">
              <h3 className="font-bold text-slate-900 font-poppins text-base">Official Payment Receipt</h3>
              <button
                type="button"
                onClick={() => setSelectedFineForReceipt(null)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl font-mono text-xs space-y-3">
              <p className="font-bold text-center text-slate-800 tracking-wider">UNIVERSITY LIBRARY FINE RECEIPT</p>
              <div className="flex items-center justify-between gap-3 pt-1">
                <div className="space-y-1.5 flex-1">
                  <p><span className="text-slate-500">Receipt No:</span> <strong className="text-slate-800">{selectedFineForReceipt.receiptNo || selectedFineForReceipt.id}</strong></p>
                  <p><span className="text-slate-500">Member:</span> <strong className="text-slate-800">{selectedFineForReceipt.memberName}</strong> ({selectedFineForReceipt.memberCardNo})</p>
                  <p><span className="text-slate-500">Amount Paid:</span> <strong className="text-emerald-700 font-bold">₹{selectedFineForReceipt.amount.toFixed(2)}</strong></p>
                  <p><span className="text-slate-500">Date Paid:</span> {selectedFineForReceipt.paidDate || selectedFineForReceipt.createdDate}</p>
                </div>
                <div className="shrink-0">
                  <AuthorizedCirculationSeal type="FINE_PAYMENT" date={selectedFineForReceipt.paidDate || selectedFineForReceipt.createdDate} size="sm" />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setSelectedFineForReceipt(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => handlePrintFineReceipt(selectedFineForReceipt)}
                className="px-4 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-semibold flex items-center gap-2 hover:bg-slate-800 shadow-md transition-all cursor-pointer"
              >
                <Printer className="h-4 w-4" /> Print Receipt
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Export CSV/Excel Filter Modal */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col border border-slate-100 relative overflow-hidden">
            {/* Modal Top Header */}
            <div className="flex items-center justify-between border-b border-slate-100 p-5 shrink-0 bg-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center font-bold shrink-0">
                  <FileSpreadsheet className="h-5 w-5 text-rose-600" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 font-poppins">Export Fine Ledger CSV / Excel Report</h2>
                  <p className="text-xs text-slate-500">Filter fine records by custom date range, members, roles, and payment status.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowExportModal(false)}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                title="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-5 space-y-4 overflow-y-auto flex-1 custom-scrollbar">
              {/* Quick Presets */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Quick Date Presets</label>
                <div className="grid grid-cols-5 gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      const today = getLocalDateStr(new Date());
                      setExportStartDate(today);
                      setExportEndDate(today);
                    }}
                    className="px-2 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-700 border border-slate-200/70 text-center transition-colors cursor-pointer"
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const d = new Date();
                      d.setDate(d.getDate() - 6);
                      setExportStartDate(getLocalDateStr(d));
                      setExportEndDate(getLocalDateStr(new Date()));
                    }}
                    className="px-2 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-700 border border-slate-200/70 text-center transition-colors cursor-pointer"
                  >
                    7 Days
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const d = new Date();
                      d.setDate(d.getDate() - 29);
                      setExportStartDate(getLocalDateStr(d));
                      setExportEndDate(getLocalDateStr(new Date()));
                    }}
                    className="px-2 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-700 border border-slate-200/70 text-center transition-colors cursor-pointer"
                  >
                    30 Days
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const d = new Date();
                      d.setDate(1);
                      setExportStartDate(getLocalDateStr(d));
                      setExportEndDate(getLocalDateStr(new Date()));
                    }}
                    className="px-2 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-700 border border-slate-200/70 text-center transition-colors cursor-pointer"
                  >
                    Month
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setExportStartDate('');
                      setExportEndDate('');
                    }}
                    className="px-2 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-700 border border-slate-200/70 text-center transition-colors cursor-pointer"
                  >
                    All Time
                  </button>
                </div>
              </div>

              {/* Custom Date Range Controls */}
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200/80">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                    <Calendar className="h-3 w-3 text-rose-600" /> Start Date
                  </label>
                  <input
                    type="date"
                    value={exportStartDate}
                    onChange={(e) => setExportStartDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                    <Calendar className="h-3 w-3 text-rose-600" /> End Date
                  </label>
                  <input
                    type="date"
                    value={exportEndDate}
                    onChange={(e) => setExportEndDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                  />
                </div>
              </div>

              {/* Status & Member Role Dropdowns */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Fine Status</label>
                  <select
                    value={exportStatusFilter}
                    onChange={(e) => setExportStatusFilter(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-rose-500/20 cursor-pointer"
                  >
                    <option value="ALL">All Fines (Paid & Unpaid)</option>
                    <option value="UNPAID">Unpaid / Outstanding Fines</option>
                    <option value="PAID">Paid / Cleared Fines</option>
                    <option value="WAIVED">Waived Fines</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Member Role Filter</label>
                  <select
                    value={exportRoleFilter}
                    onChange={(e) => {
                      setExportRoleFilter(e.target.value);
                      setSelectedExportMemberCards([]);
                    }}
                    className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-rose-500/20 cursor-pointer"
                  >
                    <option value="ALL">All Roles</option>
                    <option value="STUDENT">Student Only</option>
                    <option value="FACULTY">Faculty Only</option>
                    <option value="STAFF">Staff Only</option>
                  </select>
                </div>
              </div>

              {/* Multi-Select Member Selection with Tick Marks */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5 text-rose-600" /> Select Members:
                    <span className="text-rose-700 font-semibold">
                      {selectedExportMemberCards.length === 0
                        ? `All ${exportRoleFilter === 'ALL' ? 'Members' : exportRoleFilter.toLowerCase() + 's'}`
                        : `${selectedExportMemberCards.length} of ${
                            (state.members || []).filter((m) => exportRoleFilter === 'ALL' || m.role === exportRoleFilter).length
                          } Selected`}
                    </span>
                  </label>
                  <div className="flex items-center gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedExportMemberCards(
                          (state.members || [])
                            .filter((m) => exportRoleFilter === 'ALL' || m.role === exportRoleFilter)
                            .map((m) => m.memberCardNo)
                        )
                      }
                      className="text-[11px] font-bold text-rose-700 hover:text-rose-900 cursor-pointer"
                    >
                      Select All ({(state.members || []).filter((m) => exportRoleFilter === 'ALL' || m.role === exportRoleFilter).length})
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                      type="button"
                      onClick={() => setSelectedExportMemberCards([])}
                      className="text-[11px] font-bold text-slate-500 hover:text-slate-700 cursor-pointer"
                    >
                      Reset
                    </button>
                  </div>
                </div>

                {/* Searchable Checkbox Container */}
                <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-200/90 space-y-2">
                  <div className="relative">
                    <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder={`Search ${exportRoleFilter === 'ALL' ? 'members' : exportRoleFilter.toLowerCase() + 's'} by name, card no, or dept...`}
                      value={modalMemberSearch}
                      onChange={(e) => setModalMemberSearch(e.target.value)}
                      className="w-full pl-8 pr-8 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                    />
                    {modalMemberSearch && (
                      <button
                        type="button"
                        onClick={() => setModalMemberSearch('')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs p-1"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>

                  <div className="max-h-36 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                    {(state.members || [])
                      .filter((m) => exportRoleFilter === 'ALL' || m.role === exportRoleFilter)
                      .filter((m) =>
                        !modalMemberSearch ||
                        m.name.toLowerCase().includes(modalMemberSearch.toLowerCase()) ||
                        (m.memberCardNo && m.memberCardNo.toLowerCase().includes(modalMemberSearch.toLowerCase())) ||
                        (m.department && m.department.toLowerCase().includes(modalMemberSearch.toLowerCase()))
                      )
                      .map((member) => {
                        const isChecked = selectedExportMemberCards.includes(member.memberCardNo);
                        return (
                          <label
                            key={member.id}
                            className={`flex items-center gap-2.5 p-2 rounded-xl border transition-all cursor-pointer ${
                              isChecked
                                ? 'bg-rose-50 border-rose-300 text-rose-950 shadow-2xs'
                                : 'bg-white border-slate-200/70 hover:bg-slate-100/70 text-slate-700'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {
                                if (isChecked) {
                                  setSelectedExportMemberCards(selectedExportMemberCards.filter((c) => c !== member.memberCardNo));
                                } else {
                                  setSelectedExportMemberCards([...selectedExportMemberCards, member.memberCardNo]);
                                }
                              }}
                              className="w-3.5 h-3.5 rounded text-rose-600 focus:ring-rose-500 cursor-pointer accent-rose-600 shrink-0"
                            />
                            <div className="min-w-0 flex-1">
                              <p className={`text-xs truncate ${isChecked ? 'font-bold text-rose-950' : 'font-semibold text-slate-900'}`}>
                                {member.name}
                              </p>
                              <p className="text-[10px] text-slate-500 truncate">
                                Card: <span className="font-mono">{member.memberCardNo}</span> • <span className="font-semibold text-rose-700">{member.role}</span> {member.department ? `• ${member.department}` : ''}
                              </p>
                            </div>
                          </label>
                        );
                      })}

                    {(state.members || []).filter((m) => exportRoleFilter === 'ALL' || m.role === exportRoleFilter).length === 0 && (
                      <div className="py-3 text-center text-xs text-slate-400">
                        No registered members found under role "{exportRoleFilter}"
                      </div>
                    )}

                    {(state.members || []).filter((m) => exportRoleFilter === 'ALL' || m.role === exportRoleFilter).length > 0 &&
                      (state.members || [])
                        .filter((m) => exportRoleFilter === 'ALL' || m.role === exportRoleFilter)
                        .filter((m) =>
                          !modalMemberSearch ||
                          m.name.toLowerCase().includes(modalMemberSearch.toLowerCase()) ||
                          (m.memberCardNo && m.memberCardNo.toLowerCase().includes(modalMemberSearch.toLowerCase())) ||
                          (m.department && m.department.toLowerCase().includes(modalMemberSearch.toLowerCase()))
                        ).length === 0 && (
                        <div className="py-3 text-center text-xs text-slate-400">
                          No members match "{modalMemberSearch}"
                        </div>
                      )}
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Fixed Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/70 shrink-0 flex items-center justify-between">
              <div className="text-xs font-semibold text-slate-600">
                Found: <strong className="text-rose-700 font-bold">{exportRecordsInRange.length}</strong> fine records
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowExportModal(false)}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleExecuteCustomExport}
                  disabled={exportRecordsInRange.length === 0}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 text-white font-bold text-xs hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-rose-200 transition-all cursor-pointer"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Download Excel / CSV ({exportRecordsInRange.length})</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {notificationModalData && (
        <SendNotificationModal
          isOpen={!!notificationModalData}
          onClose={() => setNotificationModalData(null)}
          mode="FINES"
          initialMember={notificationModalData.member}
          initialContext={notificationModalData.context}
          onSuccess={triggerToast}
        />
      )}
    </div>
  );
}
