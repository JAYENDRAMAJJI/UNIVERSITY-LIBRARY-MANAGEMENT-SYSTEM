import React, { useState, useEffect, useMemo } from 'react';
import {
  Clock,
  BookOpen,
  CheckCircle2,
  AlertTriangle,
  Search,
  X,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Info,
  Calendar,
  Send,
  RefreshCw,
  Layers,
  FileText,
  History,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { libraryStore, formatOnlyTimeInBracket } from '../services/libraryStore.service';
import { IssueTransaction, ExtensionRequest, MemberProfile } from '../types/library';
import { Link } from 'react-router-dom';

export default function BookTimeExtensions() {
  const { user } = useAuth();
  const [state, setState] = useState(libraryStore.snapshot);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modal State
  const [extensionModalTx, setExtensionModalTx] = useState<IssueTransaction | null>(null);
  const [extensionDays, setExtensionDays] = useState(14);
  const [extensionReason, setExtensionReason] = useState('');

  useEffect(() => {
    const sub = libraryStore.getObservable().subscribe(setState);
    return () => sub.unsubscribe();
  }, []);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Find member profile for logged in user
  const currentMember: MemberProfile | undefined = useMemo(() => {
    if (!user) return undefined;
    const members = state.members || [];
    return (
      members.find((m) => user.email && m.email.toLowerCase() === user.email.toLowerCase()) ||
      members.find((m) => user.id && (m.userId === user.id || m.id === user.id)) ||
      members.find((m) => user.name && m.name.toLowerCase() === user.name.toLowerCase()) ||
      members.find((m) => m.role === user.role) ||
      members[0]
    );
  }, [user, state.members]);

  const memberId = currentMember?.id || '';
  const memberName = currentMember?.name || user?.name || '';
  const memberCardNo = currentMember?.memberCardNo?.toLowerCase() || '';

  // Get member's active issued transactions
  const activeTransactions: IssueTransaction[] = useMemo(() => {
    const all = state.transactions || [];
    return all.filter((t) => {
      const matchId = Boolean(memberId && t.memberId === memberId);
      const matchName = Boolean(memberName && t.memberName.toLowerCase() === memberName.toLowerCase());
      const matchCard = Boolean(memberCardNo && t.memberCardNo?.toLowerCase() === memberCardNo);
      return (matchId || matchName || matchCard) && t.status !== 'RETURNED';
    });
  }, [state.transactions, memberId, memberName, memberCardNo]);

  // Get member's submitted extension requests
  const myExtensionRequests: ExtensionRequest[] = useMemo(() => {
    const all = state.extensionRequests || [];
    return all.filter((r) => {
      const matchId = Boolean(memberId && r.memberId === memberId);
      const matchTx = activeTransactions.some((tx) => tx.id === r.transactionId);
      return matchId || matchTx;
    });
  }, [state.extensionRequests, memberId, activeTransactions]);

  // Filtered requests
  const filteredExtensionRequests = useMemo(() => {
    return myExtensionRequests.filter((req) => {
      if (statusFilter !== 'ALL' && req.status !== statusFilter) return false;
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        return (
          req.bookTitle.toLowerCase().includes(q) ||
          req.accessionNo.toLowerCase().includes(q) ||
          req.reason.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [myExtensionRequests, statusFilter, searchTerm]);

  // Counts
  const pendingCount = myExtensionRequests.filter((r) => r.status === 'PENDING').length;
  const approvedCount = myExtensionRequests.filter((r) => r.status === 'APPROVED').length;
  const rejectedCount = myExtensionRequests.filter((r) => r.status === 'REJECTED').length;
  const activeLoansCount = activeTransactions.length;

  const handleRequestExtensionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!extensionModalTx || !extensionReason.trim()) return;

    const res = libraryStore.requestBookExtension(
      extensionModalTx.id,
      currentMember?.id || '1',
      Number(extensionDays),
      extensionReason
    );

    if (res.success) {
      triggerToast(res.message);
    } else {
      triggerToast(res.message || 'Unable to submit extension request.');
    }

    setExtensionModalTx(null);
    setExtensionReason('');
  };

  return (
    <div className="space-y-6 pb-12 animate-fadeIn">
      {/* Top Banner Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-purple-950 via-slate-900 to-indigo-950 p-6 md:p-8 text-white shadow-xl border border-purple-800/30">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-80 h-80 rounded-full bg-purple-500/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-80 h-80 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 border border-purple-400/30 text-purple-300 text-[11px] font-bold uppercase tracking-wider">
              <Clock className="w-3.5 h-3.5" /> Book Loan Renewal & Extension Desk
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold font-poppins tracking-tight text-white">
              Extend Book Loan Time
            </h1>
            <p className="text-slate-300 text-xs md:text-sm leading-relaxed">
              Request due date extensions for your borrowed library books with valid academic reasons. Librarians review and approve extensions before the due date to keep your borrowing clean without late fines.
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap shrink-0">
            <button
              type="button"
              onClick={() => {
                if (activeTransactions.length === 0) {
                  triggerToast('You currently have no active borrowed books to extend.');
                } else {
                  setExtensionModalTx(activeTransactions[0]);
                }
              }}
              className="px-5 py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-purple-900/40 transition-all flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <Clock className="w-4 h-4" />
              <span>Apply for Return Extension</span>
            </button>
          </div>
        </div>
      </div>

      {/* Toast Alert */}
      {toastMessage && (
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-purple-50 border border-purple-200 text-purple-900 text-xs font-semibold shadow-xs animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-purple-600 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 3 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-purple-100 shadow-xs flex items-center gap-4">
          <div className="p-3.5 rounded-2xl bg-purple-50 text-purple-700 shrink-0">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Active Borrowed Books</p>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-2xl font-extrabold font-poppins text-purple-950">{activeLoansCount}</span>
              <span className="text-xs font-semibold text-purple-600">Checked Out</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-amber-100 shadow-xs flex items-center gap-4">
          <div className="p-3.5 rounded-2xl bg-amber-50 text-amber-700 shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Pending Extension Requests</p>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-2xl font-extrabold font-poppins text-amber-700">{pendingCount}</span>
              <span className="text-xs font-semibold text-amber-600">Awaiting Review</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-emerald-100 shadow-xs flex items-center gap-4">
          <div className="p-3.5 rounded-2xl bg-emerald-50 text-emerald-700 shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Approved Extensions</p>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-2xl font-extrabold font-poppins text-emerald-700">{approvedCount}</span>
              <span className="text-xs font-semibold text-emerald-600">Active Renewals</span>
            </div>
          </div>
        </div>
      </div>

      {/* Active Borrowed Books Eligible for Extension Card List */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="space-y-0.5">
            <h2 className="text-base font-bold font-poppins text-slate-900 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-purple-600" />
              Active Books Eligible for Return Extension
            </h2>
            <p className="text-xs text-slate-500">Click "Extend Time" on any book below to submit your extension request directly.</p>
          </div>
          <span className="text-xs font-bold text-purple-700 bg-purple-50 px-3 py-1 rounded-full border border-purple-200/80">
            {activeLoansCount} {activeLoansCount === 1 ? 'Volume' : 'Volumes'}
          </span>
        </div>

        {activeTransactions.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {activeTransactions.map((tx) => {
              const isOverdue = tx.status === 'OVERDUE' || new Date(tx.dueDate).getTime() < Date.now();
              const existingReq = myExtensionRequests.find((r) => r.transactionId === tx.id);

              return (
                <div
                  key={tx.id}
                  className={`p-4 rounded-2xl border transition-all flex flex-col justify-between gap-3 ${
                    isOverdue ? 'bg-rose-50/40 border-rose-200' : 'bg-slate-50/60 border-slate-200 hover:border-purple-300'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-[10px] font-mono font-bold text-purple-700 uppercase bg-purple-50 px-2 py-0.5 rounded-md">
                        ACC: {tx.accessionNo}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase ${
                          isOverdue ? 'bg-rose-100 text-rose-800' : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {isOverdue ? 'Overdue' : 'Active Loan'}
                      </span>
                    </div>
                    <p className="font-bold text-slate-900 text-sm line-clamp-1">{tx.bookTitle}</p>
                    <p className="text-xs text-slate-500 mt-1">
                      Due Date: <strong className={isOverdue ? 'text-rose-700 font-mono' : 'text-slate-800 font-mono'}>{tx.dueDate}</strong>
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between gap-2">
                    <span className="text-[11px] font-mono text-slate-500">
                      Renewals: {tx.renewalCount || 0}/{tx.maxRenewals || 2}
                    </span>

                    {existingReq?.status === 'PENDING' ? (
                      <span className="px-3 py-1.5 rounded-xl bg-amber-100 text-amber-800 text-[11px] font-bold inline-flex items-center gap-1 animate-pulse">
                        <Clock className="w-3 h-3 text-amber-600" /> Pending Approval
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setExtensionModalTx(tx);
                          setExtensionReason('');
                        }}
                        className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-2xs transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
                      >
                        <Clock className="w-3.5 h-3.5" /> Extend Time
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-8 text-center text-slate-400 text-xs bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            No active borrowed books checked out. Visit the Library Catalog to search and borrow books.
          </div>
        )}
      </div>

      {/* Submitted Extension Requests History Log */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden p-6 space-y-5">
        {/* Search & Filter Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-base font-bold font-poppins text-slate-900 flex items-center gap-2">
              <History className="w-4 h-4 text-purple-600" />
              Submitted Extension Requests History
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">Real-time record of all loan extension submissions and librarian review outcomes.</p>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap scrollbar-none">
            {(
              [
                { id: 'ALL', label: `All (${myExtensionRequests.length})` },
                { id: 'PENDING', label: `Pending (${pendingCount})` },
                { id: 'APPROVED', label: `Approved (${approvedCount})` },
                { id: 'REJECTED', label: `Rejected (${rejectedCount})` },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  statusFilter === tab.id
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/60'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Requests Table */}
        {filteredExtensionRequests.length > 0 ? (
          <div className="overflow-x-auto rounded-2xl border border-slate-100">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200/80">
                <tr>
                  <th className="py-3.5 px-4">Book Title & Accession</th>
                  <th className="py-3.5 px-4">Original Due Date</th>
                  <th className="py-3.5 px-4">Requested Extension</th>
                  <th className="py-3.5 px-4">Academic Reason</th>
                  <th className="py-3.5 px-4 text-center">Librarian Decision</th>
                  <th className="py-3.5 px-4 text-right">Requested Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredExtensionRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-4 px-4 font-semibold text-slate-900">
                      <p className="font-bold text-slate-900 text-sm">{req.bookTitle}</p>
                      <p className="font-mono text-[11px] text-slate-400 mt-0.5">ACC: {req.accessionNo}</p>
                    </td>
                    <td className="py-4 px-4 font-mono font-bold text-slate-700">{req.currentDueDate}</td>
                    <td className="py-4 px-4 font-bold text-purple-700 font-mono">+{req.requestedExtensionDays} Days</td>
                    <td className="py-4 px-4 text-slate-700 italic max-w-xs font-medium">"{req.reason}"</td>
                    <td className="py-4 px-4 font-bold text-center">
                      <span
                        className={`px-3 py-1 rounded-xl text-[10px] uppercase font-extrabold inline-flex flex-col items-center justify-center leading-tight shadow-2xs ${
                          req.status === 'APPROVED'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : req.status === 'REJECTED'
                            ? 'bg-rose-100 text-rose-800 border border-rose-300'
                            : 'bg-amber-100 text-amber-800 border border-amber-300'
                        }`}
                      >
                        <span className="whitespace-nowrap font-extrabold">{req.status}</span>
                        {req.newDueDate && (
                          <span className="text-[9px] font-mono font-bold opacity-80">(Extended to {req.newDueDate})</span>
                        )}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right font-mono text-slate-500">{req.requestedDate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-10 text-center text-slate-400 space-y-1 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
            <p className="text-sm font-bold text-slate-700">No Extension Requests Recorded</p>
            <p className="text-xs text-slate-500">When you submit return extension requests, their real-time approval status will appear here.</p>
          </div>
        )}
      </div>

      {/* Guidelines & Policy Card */}
      <div className="p-6 rounded-3xl bg-purple-50/50 border border-purple-100/90 text-xs text-slate-700 space-y-3">
        <div className="flex items-center gap-2 text-purple-900 font-bold text-sm">
          <Info className="w-4 h-4 text-purple-600" />
          <span>University Central Library Loan Extension & Renewal Policy</span>
        </div>
        <ul className="grid grid-cols-1 md:grid-cols-3 gap-3 text-slate-600">
          <li className="p-3 bg-white rounded-2xl border border-purple-100/80 shadow-2xs">
            <strong className="block text-slate-900 mb-0.5">1. Pre-Due Date Submission</strong>
            Please apply for return extensions at least 24 hours prior to the book's scheduled due date to prevent overdue fines.
          </li>
          <li className="p-3 bg-white rounded-2xl border border-purple-100/80 shadow-2xs">
            <strong className="block text-slate-900 mb-0.5">2. Waitlist Priority</strong>
            Extensions may be rejected or granted with shortened duration if other students/faculty are currently on the book's reservation hold queue.
          </li>
          <li className="p-3 bg-white rounded-2xl border border-purple-100/80 shadow-2xs">
            <strong className="block text-slate-900 mb-0.5">3. Institutional Renewal Cap</strong>
            Students are permitted up to 2 renewals per title, while faculty members have extended academic research borrowing allowances.
          </li>
        </ul>
      </div>

      {/* Extension Request Modal */}
      {extensionModalTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 space-y-4 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-lg font-poppins text-slate-900 flex items-center gap-2">
                <Clock className="w-5 h-5 text-purple-600" /> Request Book Return Extension
              </h3>
              <button
                type="button"
                onClick={() => setExtensionModalTx(null)}
                className="text-slate-400 hover:text-slate-600 text-2xl font-bold cursor-pointer"
              >
                &times;
              </button>
            </div>

            {/* Book Selector if multiple active loans */}
            {activeTransactions.length > 1 ? (
              <div>
                <label className="block font-bold text-slate-700 mb-1">Select Borrowed Book to Extend *</label>
                <select
                  value={extensionModalTx.id}
                  onChange={(e) => {
                    const found = activeTransactions.find((tx) => tx.id === e.target.value);
                    if (found) setExtensionModalTx(found);
                  }}
                  className="w-full p-2.5 rounded-xl border border-purple-200 text-xs font-bold focus:ring-2 focus:ring-purple-500/20 bg-purple-50/40 text-slate-900"
                >
                  {activeTransactions.map((tx) => (
                    <option key={tx.id} value={tx.id}>
                      {tx.bookTitle} (Due: {tx.dueDate} | ACC: {tx.accessionNo})
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="p-3.5 rounded-2xl bg-purple-50/70 border border-purple-100 text-xs space-y-1">
                <p><strong className="text-slate-800">Book Title:</strong> {extensionModalTx.bookTitle}</p>
                <p><strong className="text-slate-800">Accession No:</strong> <span className="font-mono text-purple-700 font-bold">{extensionModalTx.accessionNo}</span></p>
                <p><strong className="text-slate-800">Current Due Date:</strong> <span className="font-bold text-rose-700">{extensionModalTx.dueDate}</span></p>
              </div>
            )}

            <form onSubmit={handleRequestExtensionSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Requested Extension Duration *</label>
                <select
                  value={extensionDays}
                  onChange={(e) => setExtensionDays(Number(e.target.value))}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:ring-2 focus:ring-purple-500/20"
                >
                  <option value={7}>+7 Days (1 Week Extension)</option>
                  <option value={14}>+14 Days (2 Weeks Extension - Standard)</option>
                  <option value={21}>+21 Days (3 Weeks Extension)</option>
                  <option value={30}>+30 Days (1 Month Academic Extension)</option>
                  <option value={45}>+45 Days (Extended Semester Research)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Valid Reason for Extension *</label>
                <textarea
                  rows={3}
                  required
                  value={extensionReason}
                  onChange={(e) => setExtensionReason(e.target.value)}
                  placeholder="Explain why you need extra time (e.g. Preparing for end-semester CS301 examination & project lab work)..."
                  className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-purple-500/20 font-medium text-slate-900"
                />
                <p className="text-[11px] text-slate-400 mt-1">Librarians review the reason before approving due date extensions.</p>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setExtensionModalTx(null)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!extensionReason.trim()}
                  className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white font-bold shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  <Send className="w-4 h-4" /> Submit Request for Approval
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
