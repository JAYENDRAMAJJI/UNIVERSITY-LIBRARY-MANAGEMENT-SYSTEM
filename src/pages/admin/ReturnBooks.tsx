import { useState, useEffect } from 'react';
import {
  RotateCcw,
  ScanBarcode,
  CheckCircle,
  AlertTriangle,
  Search,
  Camera,
  X,
} from 'lucide-react';
import { libraryStore, formatOnlyTimeInBracket } from '../../services/libraryStore.service';
import { CopyCondition, IssueTransaction } from '../../types/library';
import BarcodeScannerModal from '../../components/common/BarcodeScannerModal';

export default function ReturnBooks() {
  const [state, setState] = useState(libraryStore.snapshot);
  const [returnQuery, setReturnQuery] = useState('');
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isStudentScannerOpen, setIsStudentScannerOpen] = useState(false);

  // Return Processing Modal State
  const [returnModalTx, setReturnModalTx] = useState<IssueTransaction | null>(null);
  const [modalCondition, setModalCondition] = useState<CopyCondition>('GOOD');
  const [modalNotes, setModalNotes] = useState('');

  useEffect(() => {
    const sub = libraryStore.getObservable().subscribe(setState);
    return () => sub.unsubscribe();
  }, []);

  const activeTransactions = state.transactions.filter((t) => t.status === 'ISSUED' || t.status === 'OVERDUE');

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

  const handleReturn = (txId: string, customCondition: CopyCondition = 'GOOD', customNotes?: string) => {
    const result = libraryStore.returnBook(txId, customCondition, customNotes);
    if (result.success) {
      setAlert({ type: 'success', message: result.message });
      setReturnQuery('');
    } else {
      setAlert({ type: 'error', message: result.message });
    }
  };

  const handleOpenReturnModal = (tx: IssueTransaction) => {
    setReturnModalTx(tx);
    setModalCondition('GOOD');
    setModalNotes('');
  };

  const handleScannedBarcode = (code: string) => {
    const matchingTx = activeTransactions.find(
      (t) => t.barcode.toLowerCase() === code.toLowerCase() || t.accessionNo.toLowerCase() === code.toLowerCase()
    );
    if (matchingTx) {
      handleOpenReturnModal(matchingTx);
    } else {
      setAlert({ type: 'error', message: `No active borrowing record found for scanned barcode / accession: ${code}` });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full mb-2">
            <RotateCcw className="h-3.5 w-3.5" /> Book Return Desk
          </div>
          <h1 className="text-2xl font-bold font-poppins text-slate-900">Return Circulation Processing</h1>
          <p className="text-sm text-slate-500 mt-1">Search, scan barcodes, enter optional remarks, and process book check-ins into library inventory.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsStudentScannerOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md transition-all cursor-pointer"
          >
            <Camera className="w-4 h-4" />
            <span>Scan Student ID</span>
          </button>
          <button
            onClick={() => setIsScannerOpen(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-sm shadow-md hover:opacity-95 transition-all cursor-pointer"
          >
            <Camera className="w-4 h-4" />
            <span>Book Barcode Scanner</span>
          </button>
        </div>
      </div>

      <BarcodeScannerModal
        isOpen={isStudentScannerOpen}
        onClose={() => setIsStudentScannerOpen(false)}
        onScanSuccess={(scannedCode) => {
          setReturnQuery(scannedCode);
        }}
        scannerType="STUDENT_ID"
        title="Scan Student / Library Member ID Card"
      />

      <BarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanSuccess={handleScannedBarcode}
        scannerType="COPY_BARCODE"
        title="Return Barcode Reader Simulator"
      />

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
                    handleOpenReturnModal(matchingTx);
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
                  handleOpenReturnModal(matchingTx);
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

      {alert && (
        <div
          className={`flex items-center gap-3 p-4 rounded-xl text-sm font-medium border ${
            alert.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          {alert.type === 'success' ? <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0" /> : <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0" />}
          <span>{alert.message}</span>
        </div>
      )}

      {/* Active Borrowed Loans Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-4 p-6">
        <h2 className="text-lg font-bold font-poppins text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
          <ScanBarcode className="h-5 w-5 text-emerald-600" /> Books Pending Return ({filteredTransactions.length})
        </h2>

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
                  </td>
                  <td className="py-4 px-4 text-right">
                    <button
                      onClick={() => handleOpenReturnModal(tx)}
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

      {/* Process Book Return Modal */}
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
                  <p className="text-xs text-emerald-100">Review loan summary & log optional remarks</p>
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
                      <p className="font-bold text-xs">Overdue Fine Will Be Assessed</p>
                      <p className="text-[11px] text-rose-600">Calculated based on daily rate ({state.config.fineRatePerDay}/day).</p>
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
                  className="w-full py-2.5 px-3.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
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
                onClick={() => {
                  handleReturn(returnModalTx.id, modalCondition, modalNotes);
                  setReturnModalTx(null);
                }}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-xs shadow-md shadow-emerald-200 hover:opacity-95 transition-all flex items-center gap-2 cursor-pointer"
              >
                <CheckCircle className="w-4 h-4" />
                <span>Confirm Check-in</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


