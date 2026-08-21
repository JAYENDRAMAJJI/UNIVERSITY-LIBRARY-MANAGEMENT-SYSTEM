import React, { useState, useEffect, useMemo } from 'react';
import {
  IndianRupee,
  AlertTriangle,
  CheckCircle2,
  Clock,
  BookOpen,
  Receipt,
  Printer,
  ShieldCheck,
  CreditCard,
  ArrowRight,
  Search,
  Sparkles,
  Info,
  Check,
  X,
  RotateCcw,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  libraryStore,
  getMemberPendingFines,
  getTransactionFineAmount,
  getLocalDateStr,
} from '../services/libraryStore.service';
import { FineRecord, IssueTransaction, MemberProfile } from '../types/library';
import { Link } from 'react-router-dom';

export default function MyFines() {
  const { user } = useAuth();
  const [state, setState] = useState(libraryStore.snapshot);
  const [filterTab, setFilterTab] = useState<'ALL' | 'UNPAID' | 'PAID' | 'OVERDUE_LOANS'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFineForReceipt, setSelectedFineForReceipt] = useState<FineRecord | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [payingFine, setPayingFine] = useState<FineRecord | null>(null);
  const [payMethod, setPayMethod] = useState<'UPI' | 'CARD' | 'CASH_DESK'>('UPI');

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
  const memberCardNo = currentMember?.memberCardNo?.toLowerCase() || '';

  // Get all explicit fine records for this member
  const memberFines: FineRecord[] = useMemo(() => {
    if (!currentMember) return [];
    return (state.fines || []).filter(
      (f) =>
        f.memberId === memberId ||
        (f.memberCardNo && f.memberCardNo.toLowerCase() === memberCardNo) ||
        (user?.name && f.memberName.toLowerCase() === user.name.toLowerCase())
    );
  }, [state.fines, currentMember, memberId, memberCardNo, user]);

  // Calculate live pending fines
  const totalPendingFines = useMemo(() => {
    if (!currentMember) return 0;
    return getMemberPendingFines(currentMember.id, state);
  }, [currentMember, state]);

  // Member's active transactions that are currently overdue (not yet returned)
  const activeOverdueLoans: IssueTransaction[] = useMemo(() => {
    if (!currentMember) return [];
    const todayStr = getLocalDateStr(new Date());
    return (state.transactions || []).filter((tx) => {
      const isMember =
        tx.memberId === memberId ||
        tx.memberCardNo.toLowerCase() === memberCardNo ||
        (user?.name && tx.memberName.toLowerCase() === user.name.toLowerCase());
      if (!isMember) return false;
      if (tx.status === 'OVERDUE') return true;
      if (tx.status === 'ISSUED' && tx.dueDate && tx.dueDate < todayStr) return true;
      return false;
    });
  }, [state.transactions, currentMember, memberId, memberCardNo, user]);

  // Summary numbers
  const paidFinesTotal = useMemo(() => {
    return memberFines
      .filter((f) => f.status === 'PAID')
      .reduce((sum, f) => sum + (f.paidAmount || f.amount || 0), 0);
  }, [memberFines]);

  const unpaidFinesCount = useMemo(() => {
    return memberFines.filter((f) => f.status === 'UNPAID').length;
  }, [memberFines]);

  const paidFinesCount = useMemo(() => {
    return memberFines.filter((f) => f.status === 'PAID').length;
  }, [memberFines]);

  // Filtered fines list based on search and active tab
  const filteredFines = useMemo(() => {
    return memberFines.filter((f) => {
      if (filterTab === 'UNPAID' && f.status !== 'UNPAID') return false;
      if (filterTab === 'PAID' && f.status !== 'PAID') return false;

      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        return (
          f.bookTitle.toLowerCase().includes(q) ||
          f.reason.toLowerCase().includes(q) ||
          (f.receiptNo && f.receiptNo.toLowerCase().includes(q)) ||
          f.id.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [memberFines, filterTab, searchTerm]);

  // Handle Pay Fine Action
  const handleOpenPayModal = (fine: FineRecord) => {
    setPayingFine(fine);
    setIsPayModalOpen(true);
  };

  const handleConfirmPayment = () => {
    if (!payingFine) return;
    libraryStore.processFinePayment(payingFine.id, 'PAY');
    triggerToast(`Payment of ₹${payingFine.amount.toFixed(2)} received successfully! Fine status updated to PAID.`);
    setIsPayModalOpen(false);
    setPayingFine(null);
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 bg-slate-900 text-white text-sm font-semibold rounded-2xl shadow-2xl border border-slate-700 animate-fadeIn">
          <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-950 via-indigo-950 to-blue-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="space-y-2 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-blue-200 text-xs font-bold uppercase tracking-wider backdrop-blur-md border border-white/10">
            <IndianRupee className="w-3.5 h-3.5 text-amber-400" />
            <span>Circulation Fines & Overdue Dues Ledger</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold font-poppins tracking-tight text-white">
            My Fines & Penalties
          </h1>
          <p className="text-slate-300 text-xs sm:text-sm max-w-2xl leading-relaxed">
            Real-time tracking of late book return penalties, overdue loan daily charges, and official settlement receipts for{' '}
            <strong className="text-white">{currentMember?.name || user?.name}</strong> ({currentMember?.memberCardNo}).
          </p>
          <div className="pt-2 flex flex-wrap items-center gap-3 text-xs text-slate-300">
            <span>Membership: <strong className="text-white">{currentMember?.memberCardNo}</strong></span>
            <span>Department: <strong className="text-white">{currentMember?.department}</strong></span>
            <span>Role: <strong className="text-blue-300 uppercase">{currentMember?.role || user?.role}</strong></span>
          </div>
        </div>

        {/* Clearance Status Badge */}
        <div className="relative z-10 bg-white/10 backdrop-blur-md p-5 rounded-2xl border border-white/20 flex flex-col items-center sm:items-start min-w-[220px]">
          <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
            Current Clearance Status
          </span>
          {totalPendingFines === 0 && activeOverdueLoans.length === 0 ? (
            <div className="flex items-center gap-2 text-emerald-300">
              <CheckCircle2 className="w-6 h-6 shrink-0" />
              <div>
                <div className="text-lg font-bold">Zero Outstanding Dues</div>
                <div className="text-xs text-emerald-200/80">Account in 100% Good Standing</div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-rose-300">
              <AlertTriangle className="w-6 h-6 shrink-0 text-rose-400 animate-pulse" />
              <div>
                <div className="text-lg font-bold text-rose-200">₹{totalPendingFines.toFixed(2)} Dues Pending</div>
                <div className="text-xs text-rose-300/80">
                  {unpaidFinesCount} Unsettled Fine{unpaidFinesCount !== 1 ? 's' : ''}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Overdue Warning Callout if Pending Fines > 0 or Active Overdue Loans exist */}
      {(totalPendingFines > 0 || activeOverdueLoans.length > 0) && (
        <div className="p-5 rounded-3xl bg-rose-50 border-2 border-rose-200 text-rose-900 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-fadeIn">
          <div className="flex items-start gap-3.5">
            <div className="p-3 bg-rose-100 rounded-2xl text-rose-700 shrink-0">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-rose-950 font-poppins">
                Action Required: Outstanding Library Fines & Overdue Loans
              </h3>
              <p className="text-xs text-rose-800 mt-1 leading-relaxed">
                You have <strong>₹{totalPendingFines.toFixed(2)}</strong> in pending fines for late book returns.
                {activeOverdueLoans.length > 0 && ` Additionally, you have ${activeOverdueLoans.length} active borrowed book(s) currently past due date.`}{' '}
                Fines must be settled for semester registration and No Due Clearance Certificate.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 shrink-0 self-end md:self-center">
            <Link
              to="/no-due"
              className="px-4 py-2 rounded-xl bg-white hover:bg-rose-100 text-rose-800 font-bold text-xs border border-rose-200 transition-all shadow-xs"
            >
              Apply for No Due
            </Link>
            <Link
              to="/borrow-history"
              className="px-4 py-2 rounded-xl bg-rose-700 hover:bg-rose-800 text-white font-bold text-xs transition-all shadow-sm"
            >
              View Borrow History
            </Link>
          </div>
        </div>
      )}

      {/* Summary Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Metric 1: Pending Dues */}
        <div className={`p-6 rounded-3xl shadow-xs border transition-all ${totalPendingFines > 0 ? 'bg-rose-50/50 border-rose-200' : 'bg-white border-slate-200'}`}>
          <div className="flex items-center justify-between">
            <div className={`p-3 rounded-2xl ${totalPendingFines > 0 ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
              <IndianRupee className="w-6 h-6" />
            </div>
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${totalPendingFines > 0 ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'}`}>
              {totalPendingFines > 0 ? 'Action Required' : 'All Clear'}
            </span>
          </div>
          <div className="mt-4">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Pending Fines</p>
            <h3 className={`text-3xl font-extrabold font-poppins mt-1 ${totalPendingFines > 0 ? 'text-rose-700' : 'text-slate-900'}`}>
              ₹{totalPendingFines.toFixed(2)}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              {unpaidFinesCount} unpaid fine record{unpaidFinesCount !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        {/* Metric 2: Active Overdue Loans */}
        <div className={`p-6 rounded-3xl shadow-xs border transition-all ${activeOverdueLoans.length > 0 ? 'bg-amber-50/50 border-amber-200' : 'bg-white border-slate-200'}`}>
          <div className="flex items-center justify-between">
            <div className={`p-3 rounded-2xl ${activeOverdueLoans.length > 0 ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
              <Clock className="w-6 h-6" />
            </div>
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${activeOverdueLoans.length > 0 ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'}`}>
              {activeOverdueLoans.length > 0 ? 'Past Due' : 'On Track'}
            </span>
          </div>
          <div className="mt-4">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Active Overdue Books</p>
            <h3 className={`text-3xl font-extrabold font-poppins mt-1 ${activeOverdueLoans.length > 0 ? 'text-amber-700' : 'text-slate-900'}`}>
              {activeOverdueLoans.length}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Accumulating ₹{(state.config?.fineRatePerDay || 5).toFixed(2)}/day
            </p>
          </div>
        </div>

        {/* Metric 3: Total Paid Fines */}
        <div className="bg-white p-6 rounded-3xl shadow-xs border border-slate-200">
          <div className="flex items-center justify-between">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-full">
              Receipts Ready
            </span>
          </div>
          <div className="mt-4">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Paid & Cleared</p>
            <h3 className="text-3xl font-extrabold font-poppins text-slate-900 mt-1">
              ₹{paidFinesTotal.toFixed(2)}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              {paidFinesCount} settled transaction{paidFinesCount !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        {/* Metric 4: Library Policy Rate */}
        <div className="bg-white p-6 rounded-3xl shadow-xs border border-slate-200">
          <div className="flex items-center justify-between">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <span className="text-xs font-bold text-indigo-800 bg-indigo-100 px-2.5 py-1 rounded-full">
              Standard Tariff
            </span>
          </div>
          <div className="mt-4">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Overdue Tariff Rate</p>
            <h3 className="text-3xl font-extrabold font-poppins text-indigo-950 mt-1">
              ₹{(state.config?.fineRatePerDay || 5).toFixed(2)} <span className="text-sm font-semibold text-slate-400">/ day</span>
            </h3>
            <p className="text-xs text-slate-500 mt-1">Per volume past due date</p>
          </div>
        </div>
      </div>

      {/* Main Ledger Section with Filter Tabs & Search */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          {/* Filter Tabs */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setFilterTab('ALL')}
              className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                filterTab === 'ALL'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All Fine Records ({memberFines.length})
            </button>
            <button
              onClick={() => setFilterTab('UNPAID')}
              className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                filterTab === 'UNPAID'
                  ? 'bg-rose-600 text-white shadow-md shadow-rose-200'
                  : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
              }`}
            >
              <span>Unpaid Penalties</span>
              {unpaidFinesCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-white text-rose-700 text-[10px] font-extrabold">
                  {unpaidFinesCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setFilterTab('PAID')}
              className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                filterTab === 'PAID'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-200'
                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
              }`}
            >
              Paid Receipts ({paidFinesCount})
            </button>
            <button
              onClick={() => setFilterTab('OVERDUE_LOANS')}
              className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                filterTab === 'OVERDUE_LOANS'
                  ? 'bg-amber-600 text-white shadow-md shadow-amber-200'
                  : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
              }`}
            >
              <span>Currently Overdue Books</span>
              {activeOverdueLoans.length > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-white text-amber-700 text-[10px] font-extrabold">
                  {activeOverdueLoans.length}
                </span>
              )}
            </button>
          </div>

          {/* Search Input */}
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search book title, reason..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
            />
          </div>
        </div>

        {/* View: Active Overdue Loans Tab */}
        {filterTab === 'OVERDUE_LOANS' && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 text-amber-900 text-xs leading-relaxed">
              <strong className="font-bold">Active Overdue Loans:</strong> These borrowed books have passed their official due dates and are actively accumulating overdue penalty at ₹{(state.config?.fineRatePerDay || 5).toFixed(2)}/day until returned at the library desk.
            </div>

            {activeOverdueLoans.length === 0 ? (
              <div className="text-center py-12 bg-slate-50 rounded-2xl border border-slate-100">
                <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
                <h4 className="text-sm font-bold text-slate-800">No Currently Overdue Loans</h4>
                <p className="text-xs text-slate-500 mt-1">All your active borrowed books are well within their allowed due dates.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50 text-slate-700 font-bold uppercase tracking-wider">
                    <tr>
                      <th className="p-3.5 rounded-l-xl">Book Title & Accession</th>
                      <th className="p-3.5">Issued Date</th>
                      <th className="p-3.5">Due Date</th>
                      <th className="p-3.5">Days Overdue</th>
                      <th className="p-3.5">Accrued Fine</th>
                      <th className="p-3.5 text-right rounded-r-xl">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {activeOverdueLoans.map((tx) => {
                      const today = new Date();
                      const dueDate = new Date(tx.dueDate);
                      const diffDays = Math.max(1, Math.ceil((today.getTime() - dueDate.getTime()) / (1000 * 3600 * 24)));
                      const accruedFine = diffDays * (state.config?.fineRatePerDay || 5);

                      return (
                        <tr key={tx.id} className="hover:bg-amber-50/40 transition-colors">
                          <td className="p-3.5">
                            <div className="font-bold text-slate-900 flex items-center gap-2">
                              <BookOpen className="w-4 h-4 text-blue-600 shrink-0" />
                              <span>{tx.bookTitle}</span>
                            </div>
                            <div className="text-[11px] text-slate-400 mt-0.5">
                              Accession: {tx.accessionNo} | Barcode: {tx.barcode}
                            </div>
                          </td>
                          <td className="p-3.5 text-slate-600">{tx.issueDate}</td>
                          <td className="p-3.5 font-bold text-rose-600">{tx.dueDate}</td>
                          <td className="p-3.5">
                            <span className="inline-flex items-center gap-1 font-bold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-full">
                              <Clock className="w-3.5 h-3.5" /> {diffDays} Days Late
                            </span>
                          </td>
                          <td className="p-3.5 font-extrabold text-slate-900 text-sm">
                            ₹{accruedFine.toFixed(2)}
                          </td>
                          <td className="p-3.5 text-right">
                            <Link
                              to="/borrow-history"
                              className="px-3 py-1.5 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold text-xs transition-all inline-flex items-center gap-1"
                            >
                              Borrow Details <ArrowRight className="w-3.5 h-3.5" />
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* View: Fines Ledger (ALL, UNPAID, PAID) */}
        {filterTab !== 'OVERDUE_LOANS' && (
          <div className="space-y-4">
            {filteredFines.length === 0 ? (
              <div className="text-center py-16 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3 shadow-inner">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h4 className="text-base font-bold text-slate-800 font-poppins">No Fine Records Found</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                  {searchTerm
                    ? `No fines matching "${searchTerm}". Try a different search term.`
                    : filterTab === 'UNPAID'
                    ? 'Great news! You have no unpaid library fine dues.'
                    : 'No circulation penalties recorded for your account.'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50 text-slate-700 font-bold uppercase tracking-wider">
                    <tr>
                      <th className="p-3.5 rounded-l-xl">Fine ID & Book Title</th>
                      <th className="p-3.5">Assessment Date</th>
                      <th className="p-3.5">Reason</th>
                      <th className="p-3.5">Fine Amount</th>
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5 text-right rounded-r-xl">Actions & Receipts</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredFines.map((fine) => {
                      const isUnpaid = fine.status === 'UNPAID';
                      const isPaid = fine.status === 'PAID';
                      const isWaived = fine.status === 'WAIVED';

                      return (
                        <tr
                          key={fine.id}
                          className={`hover:bg-slate-50/80 transition-colors ${
                            isUnpaid ? 'bg-rose-50/20' : ''
                          }`}
                        >
                          <td className="p-3.5">
                            <div className="font-bold text-slate-900 flex items-center gap-2">
                              <BookOpen className="w-4 h-4 text-blue-600 shrink-0" />
                              <span>{fine.bookTitle}</span>
                            </div>
                            <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2">
                              <span>Ref: #{fine.id}</span>
                              {fine.receiptNo && (
                                <span className="font-semibold text-emerald-600">
                                  • Receipt: {fine.receiptNo}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-3.5 text-slate-600">
                            <div className="font-medium text-slate-800">{fine.createdDate}</div>
                            {fine.paidDate && (
                              <div className="text-[10px] text-emerald-600 font-bold">
                                Paid on {fine.paidDate}
                              </div>
                            )}
                          </td>
                          <td className="p-3.5">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold text-[11px] ${
                                fine.reason === 'OVERDUE'
                                  ? 'bg-amber-100 text-amber-800'
                                  : fine.reason === 'DAMAGED'
                                  ? 'bg-rose-100 text-rose-800'
                                  : 'bg-slate-100 text-slate-800'
                              }`}
                            >
                              {fine.reason === 'OVERDUE' ? 'Late Return Penalty' : fine.reason}
                            </span>
                          </td>
                          <td className="p-3.5 font-extrabold text-sm">
                            <span className={isUnpaid ? 'text-rose-700' : 'text-slate-900'}>
                              ₹{fine.amount.toFixed(2)}
                            </span>
                          </td>
                          <td className="p-3.5">
                            {isUnpaid && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-extrabold bg-rose-100 text-rose-800 animate-pulse">
                                <AlertTriangle className="w-3.5 h-3.5" /> UNPAID
                              </span>
                            )}
                            {isPaid && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-800">
                                <Check className="w-3.5 h-3.5" /> PAID
                              </span>
                            )}
                            {isWaived && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-extrabold bg-slate-100 text-slate-700">
                                WAIVED
                              </span>
                            )}
                          </td>
                          <td className="p-3.5 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {isUnpaid && (
                                <button
                                  onClick={() => handleOpenPayModal(fine)}
                                  className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs shadow-xs transition-all cursor-pointer flex items-center gap-1"
                                >
                                  <CreditCard className="w-3.5 h-3.5" /> Pay Now
                                </button>
                              )}
                              <button
                                onClick={() => setSelectedFineForReceipt(fine)}
                                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all cursor-pointer flex items-center gap-1"
                              >
                                <Receipt className="w-3.5 h-3.5 text-slate-500" />
                                <span>{isPaid ? 'View Receipt' : 'Assessment Slip'}</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Circulation Fine Policies & Info Box */}
      <div className="bg-gradient-to-br from-blue-50/60 to-indigo-50/60 rounded-3xl p-6 sm:p-8 border border-blue-100 shadow-sm space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-600 text-white rounded-2xl">
            <Info className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 font-poppins">
              University Central Library Fine & Overdue Rules
            </h3>
            <p className="text-xs text-slate-600">Standard circulation guidelines prescribed by the University Senate</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 text-xs text-slate-700">
          <div className="bg-white/80 backdrop-blur-xs p-4 rounded-2xl border border-blue-200/60 space-y-1.5">
            <div className="font-bold text-slate-900 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-blue-600" /> Overdue Calculation
            </div>
            <p className="text-slate-600 leading-relaxed">
              Fines are automatically assessed at <strong>₹{(state.config?.fineRatePerDay || 5).toFixed(2)}/day per book</strong> past the due date upon return or renewal.
            </p>
          </div>

          <div className="bg-white/80 backdrop-blur-xs p-4 rounded-2xl border border-blue-200/60 space-y-1.5">
            <div className="font-bold text-slate-900 flex items-center gap-1.5">
              <CreditCard className="w-4 h-4 text-emerald-600" /> Settlement Methods
            </div>
            <p className="text-slate-600 leading-relaxed">
              Fines can be paid directly at the <strong>Central Circulation Desk (Cash/Card)</strong> or settled online via instant UPI / Net Banking.
            </p>
          </div>

          <div className="bg-white/80 backdrop-blur-xs p-4 rounded-2xl border border-blue-200/60 space-y-1.5">
            <div className="font-bold text-slate-900 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-indigo-600" /> No Due Clearance
            </div>
            <p className="text-slate-600 leading-relaxed">
              A zero pending fine balance is mandatory to obtain the <strong>Official Library No Due Certificate (NDC)</strong> for hall tickets and degree conferral.
            </p>
          </div>
        </div>
      </div>

      {/* Pay Fine Modal */}
      {isPayModalOpen && payingFine && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-5 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-2xl">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 font-poppins">Pay Overdue Fine</h3>
                  <p className="text-xs text-slate-500">Fine Assessment #{payingFine.id}</p>
                </div>
              </div>
              <button
                onClick={() => setIsPayModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Book Title:</span>
                <span className="font-bold text-slate-900 text-right max-w-[200px] truncate">{payingFine.bookTitle}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Reason:</span>
                <span className="font-bold text-amber-700">{payingFine.reason === 'OVERDUE' ? 'Late Return' : payingFine.reason}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Assessment Date:</span>
                <span className="font-semibold text-slate-700">{payingFine.createdDate}</span>
              </div>
              <div className="pt-2 border-t border-slate-200 flex justify-between items-baseline">
                <span className="text-sm font-bold text-slate-800">Total Payable:</span>
                <span className="text-xl font-extrabold text-emerald-600 font-poppins">₹{payingFine.amount.toFixed(2)}</span>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Select Payment Mode</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setPayMethod('UPI')}
                  className={`p-3 rounded-2xl border text-xs font-bold text-center transition-all cursor-pointer ${
                    payMethod === 'UPI'
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-800 shadow-xs'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Sparkles className="w-4 h-4 mx-auto mb-1 text-emerald-600" />
                  UPI / QR
                </button>
                <button
                  type="button"
                  onClick={() => setPayMethod('CARD')}
                  className={`p-3 rounded-2xl border text-xs font-bold text-center transition-all cursor-pointer ${
                    payMethod === 'CARD'
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-800 shadow-xs'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <CreditCard className="w-4 h-4 mx-auto mb-1 text-blue-600" />
                  Debit/Credit
                </button>
                <button
                  type="button"
                  onClick={() => setPayMethod('CASH_DESK')}
                  className={`p-3 rounded-2xl border text-xs font-bold text-center transition-all cursor-pointer ${
                    payMethod === 'CASH_DESK'
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-800 shadow-xs'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <RotateCcw className="w-4 h-4 mx-auto mb-1 text-purple-600" />
                  Desk Cash
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsPayModalOpen(false)}
                className="px-4 py-2.5 rounded-2xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold text-xs transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmPayment}
                className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs shadow-md shadow-emerald-200 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" /> Confirm & Pay ₹{payingFine.amount.toFixed(2)}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Official Fine Receipt / Assessment Slip Modal */}
      {selectedFineForReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-100 space-y-6 animate-scaleUp">
            {/* Header with University Emblem Info */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 text-[11px] font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  <ShieldCheck className="w-3.5 h-3.5" /> Central University Library
                </div>
                <h3 className="text-lg font-bold text-slate-900 font-poppins">
                  {selectedFineForReceipt.status === 'PAID' ? 'Official Fine Payment Receipt' : 'Fine Assessment Demand Slip'}
                </h3>
                <p className="text-xs text-slate-500">
                  {selectedFineForReceipt.receiptNo ? `Receipt #${selectedFineForReceipt.receiptNo}` : `Assessment Ref #${selectedFineForReceipt.id}`}
                </p>
              </div>
              <button
                onClick={() => setSelectedFineForReceipt(null)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Slip Body */}
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <div>
                  <span className="text-slate-400 font-semibold block text-[10px] uppercase">Member Name</span>
                  <span className="font-bold text-slate-900">{selectedFineForReceipt.memberName}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold block text-[10px] uppercase">Library Card No</span>
                  <span className="font-bold text-slate-900">{selectedFineForReceipt.memberCardNo}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold block text-[10px] uppercase">Assessment Date</span>
                  <span className="font-semibold text-slate-800">{selectedFineForReceipt.createdDate}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold block text-[10px] uppercase">Status</span>
                  <span className={`font-bold ${selectedFineForReceipt.status === 'PAID' ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {selectedFineForReceipt.status}
                  </span>
                </div>
              </div>

              <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100 space-y-2">
                <div className="font-bold text-slate-900 text-sm">{selectedFineForReceipt.bookTitle}</div>
                <div className="flex justify-between text-slate-600 text-[11px]">
                  <span>Reason for Charge:</span>
                  <span className="font-bold text-slate-800">{selectedFineForReceipt.reason === 'OVERDUE' ? 'Late Return Overdue Fine' : selectedFineForReceipt.reason}</span>
                </div>
                <div className="flex justify-between text-slate-600 text-[11px]">
                  <span>Circulation Rate:</span>
                  <span>₹{(state.config?.fineRatePerDay || 5).toFixed(2)} per day overdue</span>
                </div>
                <div className="pt-2 border-t border-blue-200/60 flex justify-between items-baseline">
                  <span className="font-bold text-slate-900 text-sm">Fine Amount:</span>
                  <span className="text-xl font-extrabold text-blue-900 font-poppins">
                    ₹{selectedFineForReceipt.amount.toFixed(2)}
                  </span>
                </div>
              </div>

              {selectedFineForReceipt.status === 'PAID' && (
                <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 text-emerald-800 flex items-center justify-between text-xs font-semibold">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Settled on {selectedFineForReceipt.paidDate || selectedFineForReceipt.createdDate}</span>
                  </div>
                  <span className="text-[10px] uppercase tracking-wider bg-emerald-100 px-2 py-0.5 rounded-full font-bold">
                    Official Stamp
                  </span>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 rounded-2xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Printer className="w-4 h-4 text-slate-500" /> Print Slip
              </button>
              <button
                type="button"
                onClick={() => setSelectedFineForReceipt(null)}
                className="px-5 py-2 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-all cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
