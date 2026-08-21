import { useState, useEffect, useMemo } from 'react';
import { IndianRupee, CheckCircle, Printer, Bell, Send, Search, X, Download, FileSpreadsheet, Calendar, Users } from 'lucide-react';
import { libraryStore, getSystemFineSummary, getTransactionFineAmount, getLocalDateStr } from '../../services/libraryStore.service';
import { exportStyledExcelFile } from '../../utils/excelExport';
import { FineRecord } from '../../types/library';
import SendNotificationModal from '../../components/common/SendNotificationModal';

export default function FineManagement() {
  const [state, setState] = useState(libraryStore.snapshot);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFineForReceipt, setSelectedFineForReceipt] = useState<FineRecord | null>(null);
  const [waiveModalFine, setWaiveModalFine] = useState<FineRecord | null>(null);
  const [waiveReasonInput, setWaiveReasonInput] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [notificationModalData, setNotificationModalData] = useState<{ member: any; context: any } | null>(null);

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

  const fineSummary = useMemo(() => getSystemFineSummary(state), [state]);

  const filteredFines = (state.fines || []).filter((f) => {
    const q = searchTerm.toLowerCase().trim();
    const matchesSearch =
      !q ||
      f.memberName.toLowerCase().includes(q) ||
      f.memberCardNo.toLowerCase().includes(q) ||
      f.bookTitle.toLowerCase().includes(q) ||
      f.reason.toLowerCase().includes(q);

    const matchesStatus = filterStatus === 'ALL' || f.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const totalCollected = fineSummary.totalPaidFines;
  const totalPending = fineSummary.totalPendingFines;
  const totalWaived = fineSummary.totalWaivedFines;

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
    const allFines = state.fines || [];
    return allFines.filter((f) => {
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
  }, [state.fines, state.members, exportStatusFilter, exportRoleFilter, selectedExportMemberCards, exportStartDate, exportEndDate]);

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

  const handlePay = (fine: FineRecord) => {
    libraryStore.processFinePayment(fine.id, 'PAY');
    triggerToast(`Fine payment of ₹${fine.amount.toFixed(2)} processed for ${fine.memberName}.`);
    const updated = libraryStore.snapshot.fines.find((f) => f.id === fine.id);
    if (updated) setSelectedFineForReceipt(updated);
  };

  const handleWaiveSubmit = () => {
    if (!waiveModalFine) return;
    libraryStore.processFinePayment(waiveModalFine.id, 'WAIVE', waiveReasonInput || 'Waived by Librarian approval.');
    triggerToast(`Fine of ₹${waiveModalFine.amount.toFixed(2)} waived for ${waiveModalFine.memberName}.`);
    setWaiveModalFine(null);
    setWaiveReasonInput('');
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
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-slate-900 shrink-0">Fine Transaction Records</h2>
            <button
              type="button"
              onClick={openExportModal}
              className="px-3 py-1.5 rounded-xl bg-blue-50 text-blue-700 border border-blue-100 hover:bg-blue-100 font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer active:scale-95 shrink-0"
            >
              <Download className="h-3.5 w-3.5 text-blue-600" /> Export CSV
            </button>
          </div>

          {/* Integrated Search Input with Action Button */}
          <form onSubmit={(e) => e.preventDefault()} className="flex items-center w-full md:w-auto shrink-0">
            <div className="relative flex-1 md:w-72">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search member, card no, or book..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-8 py-2 rounded-l-xl border border-r-0 border-slate-200 text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 bg-white"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full hover:bg-slate-100 cursor-pointer"
                  title="Clear search"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <button
              type="submit"
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-r-xl text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Search</span>
            </button>
          </form>

          {/* Status Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto text-xs shrink-0">
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
                className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap ${
                  filterStatus === st.id
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {st.label}
              </button>
            ))}
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
              {filteredFines.map((fine) => (
                <tr key={fine.id}>
                  <td className="py-4 px-4 font-medium text-slate-900">
                    <p className="font-bold">{fine.memberName}</p>
                    <p className="text-xs font-mono text-slate-500">{fine.memberCardNo}</p>
                  </td>
                  <td className="py-4 px-4 font-medium text-slate-800">{fine.bookTitle}</td>
                  <td className="py-4 px-4 font-bold text-rose-700">₹{fine.amount.toFixed(2)}</td>
                  <td className="py-4 px-4 text-xs font-semibold text-slate-600">
                    <p>{fine.reason}</p>
                    <p className="text-[10px] font-mono text-slate-400">({fine.createdDate})</p>
                  </td>
                  <td className="py-4 px-4">
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                        fine.status === 'PAID'
                          ? 'bg-emerald-100 text-emerald-800'
                          : fine.status === 'UNPAID'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-slate-100 text-slate-800'
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
                            onClick={() => handlePay(fine)}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-semibold text-xs shadow-sm hover:bg-emerald-700"
                          >
                            Collect ₹{fine.amount.toFixed(2)}
                          </button>
                          <button
                            onClick={() => setWaiveModalFine(fine)}
                            className="px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 font-semibold text-xs hover:bg-slate-100"
                          >
                            Waive Fine
                          </button>
                        </>
                      )}
                      {fine.status === 'PAID' && (
                        <button
                          onClick={() => setSelectedFineForReceipt(fine)}
                          className="px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-blue-700 font-semibold text-xs hover:bg-slate-100 flex items-center gap-1"
                        >
                          <Printer className="h-3.5 w-3.5" /> View Receipt
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Waive Modal */}
      {waiveModalFine && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
            <h2 className="text-lg font-bold text-slate-900">Waive Fine Request</h2>
            <p className="text-xs text-slate-500">Member: {waiveModalFine.memberName} (₹{waiveModalFine.amount.toFixed(2)})</p>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Reason for Fine Waiver *</label>
              <textarea
                rows={3}
                value={waiveReasonInput}
                onChange={(e) => setWaiveReasonInput(e.target.value)}
                placeholder="e.g. Special administrative approval due to medical leave."
                className="w-full p-2.5 border border-slate-200 rounded-lg text-sm"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setWaiveModalFine(null)} className="px-4 py-2 border rounded-xl text-xs font-semibold">
                Cancel
              </button>
              <button onClick={handleWaiveSubmit} className="px-4 py-2 bg-rose-600 text-white rounded-xl text-xs font-semibold">
                Confirm Waive
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Receipt Modal */}
      {selectedFineForReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="font-bold text-slate-900">Official Payment Receipt</h3>
              <button onClick={() => setSelectedFineForReceipt(null)} className="text-xl font-bold">&times;</button>
            </div>
            <div className="p-4 bg-slate-50 border rounded-xl font-mono text-xs space-y-1">
              <p className="font-bold text-center border-b pb-1">UNIVERSITY LIBRARY FINE RECEIPT</p>
              <p><span className="text-slate-500">Receipt No:</span> {selectedFineForReceipt.receiptNo}</p>
              <p><span className="text-slate-500">Member:</span> {selectedFineForReceipt.memberName}</p>
              <p><span className="text-slate-500">Amount Paid:</span> ₹{selectedFineForReceipt.amount.toFixed(2)}</p>
              <p><span className="text-slate-500">Date Paid:</span> {selectedFineForReceipt.paidDate}</p>
            </div>
            <div className="flex justify-end">
              <button onClick={() => window.print()} className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold flex items-center gap-2">
                <Printer className="h-4 w-4" /> Print
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
