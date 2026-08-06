import { useState, useEffect } from 'react';
import { IndianRupee, CheckCircle, Printer, Bell, Send, Search, X } from 'lucide-react';
import { libraryStore } from '../../services/libraryStore.service';
import { FineRecord } from '../../types/library';

export default function FineManagement() {
  const [state, setState] = useState(libraryStore.snapshot);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFineForReceipt, setSelectedFineForReceipt] = useState<FineRecord | null>(null);
  const [waiveModalFine, setWaiveModalFine] = useState<FineRecord | null>(null);
  const [waiveReasonInput, setWaiveReasonInput] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    const sub = libraryStore.getObservable().subscribe(setState);
    return () => sub.unsubscribe();
  }, []);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const filteredFines = state.fines.filter((f) => {
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

  const totalCollected = state.fines.filter((f) => f.status === 'PAID').reduce((sum, f) => sum + f.amount, 0);
  const totalPending = state.fines.filter((f) => f.status === 'UNPAID').reduce((sum, f) => sum + f.amount, 0);
  const totalWaived = state.fines.filter((f) => f.status === 'WAIVED').reduce((sum, f) => sum + f.amount, 0);

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
    const res = libraryStore.sendOverdueReminder(fine.transactionId);
    triggerToast(res.message);
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
          <h2 className="text-lg font-bold text-slate-900 shrink-0">Fine Transaction Records</h2>

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
                            onClick={() => handleSendReminder(fine)}
                            className="px-2.5 py-1.5 rounded-lg bg-amber-500 text-white font-semibold text-xs shadow-xs hover:bg-amber-600 flex items-center gap-1"
                            title="Send Automated Email & SMS Overdue Alert"
                          >
                            <Bell className="h-3.5 w-3.5" /> Send Alert
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
    </div>
  );
}
