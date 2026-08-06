import React, { useState, useEffect, useMemo } from 'react';
import {
  BookOpen,
  Download,
  Bell,
  Clock,
  RefreshCw,
  CreditCard,
  AlertCircle,
  CheckCircle,
  Search,
  Bookmark,
  PlusCircle,
  Send,
  Sparkles,
  ShoppingBag,
  History,
  FileText,
  UserCheck,
} from 'lucide-react';
import { libraryStore, formatOnlyTimeInBracket } from '../../../services/libraryStore.service';
import { useAuth } from '../../../context/AuthContext';
import { Link } from 'react-router-dom';
import { IssueTransaction } from '../../../types/library';

export default function StudentDashboard() {
  const { user } = useAuth();
  const [state, setState] = useState(libraryStore.snapshot);
  const [activeTab, setActiveTab] = useState<'loans' | 'extensions' | 'reservations' | 'procurement' | 'history'>('loans');
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isProcurementModalOpen, setIsProcurementModalOpen] = useState(false);
  const [procurementForm, setProcurementForm] = useState({
    bookTitle: '',
    authorName: '',
    isbn: '',
    publisherName: '',
    reason: '',
  });

  const [extensionModalTx, setExtensionModalTx] = useState<IssueTransaction | null>(null);
  const [extensionDays, setExtensionDays] = useState(14);
  const [extensionReason, setExtensionReason] = useState('');

  useEffect(() => {
    const sub = libraryStore.getObservable().subscribe(setState);
    return () => sub.unsubscribe();
  }, []);

  const [nowClock, setNowClock] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNowClock(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const studentMember =
    state.members.find((m) => user?.email && m.email.toLowerCase() === user.email.toLowerCase()) ||
    state.members.find((m) => user?.id && m.id === user.id) ||
    state.members.find((m) => user?.name && m.name.toLowerCase() === user.name.toLowerCase()) ||
    state.members.find((m) => m.role === 'STUDENT') ||
    state.members[0];

  const studentDisplayName = user?.name || studentMember?.name || 'Student Member';

  const myAttendanceRecords = (state.attendanceRecords || []).filter((r) => {
    const uEmail = user?.email?.toLowerCase();
    const uName = user?.name?.toLowerCase();
    const mId = studentMember?.id;
    const mCard = studentMember?.memberCardNo?.toLowerCase();
    return (
      Boolean(uEmail && r.email?.toLowerCase() === uEmail) ||
      Boolean(mId && r.memberId === mId) ||
      Boolean(mCard && r.memberCardNo?.toLowerCase() === mCard) ||
      Boolean(uName && r.memberName?.toLowerCase() === uName)
    );
  });
  const myActiveAttendance = myAttendanceRecords.find((r) => r.status === 'IN_LIBRARY');

  const liveStayDurationText = useMemo(() => {
    if (!myActiveAttendance) return '';
    const inT = new Date(myActiveAttendance.checkInTime.replace(' ', 'T')).getTime();
    if (isNaN(inT)) return '0 mins';
    const elapsedMins = Math.max(0, Math.floor((nowClock.getTime() - inT) / (1000 * 60)));
    const h = Math.floor(elapsedMins / 60);
    const m = elapsedMins % 60;
    return h > 0 ? `${h}h ${m}m` : `${m} mins`;
  }, [myActiveAttendance, nowClock]);

  const studentActiveTransactions = state.transactions.filter(
    (t) => (t.memberId === studentMember.id || t.memberName === studentMember.name || t.memberName === studentDisplayName) && (t.status === 'ISSUED' || t.status === 'OVERDUE')
  );

  const studentExtensionRequests = (state.extensionRequests || []).filter(
    (r) => r.memberId === studentMember.id || r.memberName === studentMember.name || r.memberName === studentDisplayName
  );

  const handleRequestExtensionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!extensionModalTx || !extensionReason.trim()) return;

    const res = libraryStore.requestBookExtension(
      extensionModalTx.id,
      studentMember.id,
      Number(extensionDays),
      extensionReason
    );

    if (res.success) {
      setAlert({ type: 'success', message: res.message });
    } else {
      setAlert({ type: 'error', message: res.message });
    }

    setExtensionModalTx(null);
    setExtensionReason('');
  };

  const studentReservations = state.reservations.filter(
    (r) => r.memberId === studentMember.id || r.memberName === studentMember.name
  );

  const uEmail = user?.email?.toLowerCase();
  const uName = user?.name?.toLowerCase();
  const mId = studentMember?.id;
  const mCard = studentMember?.memberCardNo?.toLowerCase();

  const studentHistoryTransactions = state.transactions.filter((t) => {
    const matchMemberId = Boolean(mId && t.memberId === mId);
    const matchCardNo = Boolean(mCard && t.memberCardNo?.toLowerCase() === mCard);
    const matchName = Boolean(uName && t.memberName?.toLowerCase() === uName);
    const matchEmail = Boolean(uEmail && (t.memberCardNo?.toLowerCase() === uEmail || (t as any).email?.toLowerCase() === uEmail));
    return matchMemberId || matchCardNo || matchName || matchEmail;
  });

  const myProcurementRequests = (state.procurementRequests || []).filter(
    (r) => r.requestedById === studentMember.id || r.requestedByName === studentMember.name
  );

  const handleSelfRenew = (txId: string) => {
    const res = libraryStore.renewBook(txId);
    if (res.success) {
      setAlert({ type: 'success', message: res.message });
    } else {
      setAlert({ type: 'error', message: res.message });
    }
  };

  const handleCancelReservation = (resId: string) => {
    libraryStore.cancelReservation(resId);
    setAlert({ type: 'success', message: 'Reservation hold cancelled.' });
  };

  const handleSubmitProcurement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!procurementForm.bookTitle || !procurementForm.authorName) return;

    libraryStore.addProcurementRequest({
      bookTitle: procurementForm.bookTitle,
      authorName: procurementForm.authorName,
      isbn: procurementForm.isbn,
      publisherName: procurementForm.publisherName,
      reason: procurementForm.reason || 'Required for academic coursework.',
      requestedById: studentMember.id,
      requestedByName: studentMember.name,
      requestedByRole: 'STUDENT',
    });

    setAlert({ type: 'success', message: `Procurement request submitted for "${procurementForm.bookTitle}".` });
    setIsProcurementModalOpen(false);
    setProcurementForm({ bookTitle: '', authorName: '', isbn: '', publisherName: '', reason: '' });
  };

  const loanQuotaPercentage = Math.min(100, Math.round((studentActiveTransactions.length / studentMember.maxAllowedBooks) * 100));

  return (
    <div className="space-y-8 pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-950 via-indigo-950 to-blue-900 rounded-3xl p-8 sm:p-10 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-widest text-blue-300 bg-white/10 px-3.5 py-1 rounded-full">
            <Sparkles className="h-4 w-4" /> Student Portal & Workspace
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold font-poppins tracking-tight">Welcome back, {studentDisplayName}!</h1>
          <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-slate-300 pt-1">
            <span>Card ID: <strong className="font-mono text-amber-300">{studentMember.memberCardNo}</strong></span>
            <span>Department: <strong className="text-white">{studentMember.department}</strong></span>
            <span>Status: <strong className="text-emerald-400 uppercase font-bold">● Active Student</strong></span>
          </div>
        </div>

        <div className="relative z-10 flex flex-wrap items-center gap-3">
          <Link
            to="/attendance"
            className="px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-bold text-white backdrop-blur-md flex items-center gap-2 transition-all cursor-pointer"
          >
            <UserCheck className="w-4 h-4 text-emerald-400" />
            {myActiveAttendance ? (
              <span className="text-emerald-300 font-extrabold animate-pulse">
                ● In Library (Check-In: ({myActiveAttendance.checkInTime}) | Stay: {liveStayDurationText})
              </span>
            ) : (
              <span>My Attendance & Visits ({myAttendanceRecords.length})</span>
            )}
          </Link>
        </div>
      </div>

      {alert && (
        <div
          className={`flex items-center gap-3 p-4 rounded-2xl text-sm font-medium border shadow-xs animate-fadeIn ${
            alert.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          {alert.type === 'success' ? <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0" /> : <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />}
          <span>{alert.message}</span>
        </div>
      )}

      {/* Metrics Summary Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Metric 1: Active Borrowed Loans */}
        <div className="bg-white p-5 rounded-3xl shadow-xs border border-slate-200 space-y-3 flex flex-col justify-between min-w-0">
          <div className="flex items-center justify-between">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
              <BookOpen className="w-6 h-6" />
            </div>
            <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full">
              Quota: {studentMember.maxAllowedBooks} Books
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider truncate">Active Borrowed Books</p>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-2xl font-extrabold font-poppins text-slate-900">{studentActiveTransactions.length}</span>
              <span className="text-xs font-semibold text-slate-500">/ {studentMember.maxAllowedBooks} Allowed</span>
            </div>
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
            <div className="bg-blue-600 h-full transition-all" style={{ width: `${loanQuotaPercentage}%` }} />
          </div>
        </div>

        {/* Metric 2: Active Reservations */}
        <div className="bg-white p-5 rounded-3xl shadow-xs border border-slate-200 space-y-3 flex flex-col justify-between min-w-0">
          <div className="flex items-center justify-between">
            <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl">
              <Bookmark className="w-6 h-6" />
            </div>
            <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full">Hold Queue</span>
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider truncate">Reservations On Hold</p>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-2xl font-extrabold font-poppins text-slate-900">{studentReservations.length}</span>
              <span className="text-xs font-semibold text-slate-500">Pending Holds</span>
            </div>
          </div>
          <p className="text-xs text-slate-500 font-medium truncate">Priority queue status active</p>
        </div>

        {/* Metric 3: Fine Ledger Balance */}
        <div className="bg-white p-5 rounded-3xl shadow-xs border border-rose-200/80 bg-rose-50/20 space-y-3 flex flex-col justify-between min-w-0">
          <div className="flex items-center justify-between">
            <div className="p-3 bg-rose-100 text-rose-600 rounded-2xl">
              <CreditCard className="w-6 h-6" />
            </div>
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${studentMember.pendingFines > 0 ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'}`}>
              {studentMember.pendingFines > 0 ? 'Unpaid Dues' : 'Clear Account'}
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-bold text-rose-700 uppercase tracking-wider truncate">Pending Fines Balance</p>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-2xl font-extrabold font-poppins text-rose-900">₹{studentMember.pendingFines.toFixed(2)}</span>
            </div>
          </div>
          <p className="text-xs text-slate-500 truncate">Overdue rate: ₹{(state.config?.fineRatePerDay || 10).toFixed(2)} / day</p>
        </div>

        {/* Metric 4: Acquisition Requests */}
        <div className="bg-white p-5 rounded-3xl shadow-xs border border-emerald-200/80 bg-emerald-50/20 space-y-3 flex flex-col justify-between min-w-0">
          <div className="flex items-center justify-between">
            <div className="p-3 bg-emerald-100 text-emerald-700 rounded-2xl">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-full">Procurement</span>
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider truncate">Book Requests</p>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-2xl font-extrabold font-poppins text-emerald-950">{myProcurementRequests.length}</span>
              <span className="text-xs font-semibold text-emerald-700">Submitted</span>
            </div>
          </div>
          <p className="text-xs text-slate-500 truncate">Librarian review status</p>
        </div>
      </div>

      {/* Navigation Tabs Bar - Single Line */}
      <div className="bg-white p-3 rounded-3xl shadow-sm border border-slate-200 flex items-center gap-2 overflow-x-auto whitespace-nowrap scrollbar-none">
        <button
          onClick={() => setActiveTab('loans')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer shrink-0 whitespace-nowrap ${
            activeTab === 'loans' ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" /> Active Borrowed Books ({studentActiveTransactions.length})
        </button>

        <button
          onClick={() => setActiveTab('reservations')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer shrink-0 whitespace-nowrap ${
            activeTab === 'reservations' ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Bookmark className="w-3.5 h-3.5" /> My Holds ({studentReservations.length})
        </button>

        <button
          onClick={() => setActiveTab('extensions')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer shrink-0 whitespace-nowrap ${
            activeTab === 'extensions' ? 'bg-purple-600 text-white shadow-xs' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Clock className="w-3.5 h-3.5" /> Extension Requests ({studentExtensionRequests.length})
        </button>

        <button
          onClick={() => setActiveTab('procurement')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer shrink-0 whitespace-nowrap ${
            activeTab === 'procurement' ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
          }`}
        >
          <ShoppingBag className="w-3.5 h-3.5" /> Procurement ({myProcurementRequests.length})
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer shrink-0 whitespace-nowrap ${
            activeTab === 'history' ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
          }`}
        >
          <History className="w-3.5 h-3.5" /> Borrowing History ({studentHistoryTransactions.length})
        </button>
      </div>

      {/* Tab 1: Active Book Loans */}
      {activeTab === 'loans' && (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-lg font-bold font-poppins text-slate-900">My Borrowed Books & Return Date Extensions</h2>
              <p className="text-xs text-slate-500 mt-0.5">Manage borrowed book copies and submit return time extension requests with valid reasons.</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-700 font-bold uppercase tracking-wider">
                <tr>
                  <th className="p-3.5 rounded-l-xl">Accession & Title</th>
                  <th className="p-3.5">Issue Date</th>
                  <th className="p-3.5">Due Date</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5">Renewals Used</th>
                  <th className="p-3.5 text-right rounded-r-xl">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {studentActiveTransactions.map((tx) => {
                  const existingReq = studentExtensionRequests.find((r) => r.transactionId === tx.id);
                  return (
                    <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3.5 font-semibold">
                        <p className="text-slate-900 font-bold text-sm">{tx.bookTitle}</p>
                        <p className="font-mono text-[11px] text-slate-400">ACC: {tx.accessionNo} | Barcode: {tx.barcode}</p>
                      </td>
                      <td className="p-3.5 font-mono">{formatOnlyTimeInBracket(tx.issueDate)}</td>
                      <td className="p-3.5 font-mono font-bold text-rose-700">{formatOnlyTimeInBracket(tx.dueDate)}</td>
                      <td className="p-3.5 font-bold">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] uppercase ${
                          tx.status === 'OVERDUE' ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {tx.status}
                        </span>
                      </td>
                      <td className="p-3.5 font-bold text-slate-700">{tx.renewalCount} / {tx.maxRenewals} Used</td>
                      <td className="p-3.5 text-right">
                        {existingReq?.status === 'PENDING' ? (
                          <span className="px-3 py-1.5 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 font-bold text-xs inline-flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-amber-600 animate-pulse" /> Extension Pending Approval
                          </span>
                        ) : existingReq?.status === 'APPROVED' ? (
                          <span className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold text-xs inline-flex items-center gap-1">
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> Approved (+{existingReq.requestedExtensionDays}d)
                          </span>
                        ) : (
                          <button
                            onClick={() => {
                              setExtensionModalTx(tx);
                              setExtensionReason('');
                            }}
                            className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-xs transition-all inline-flex items-center gap-1.5 cursor-pointer"
                          >
                            <Clock className="w-3.5 h-3.5 text-purple-200" /> Request Time Extension
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {studentActiveTransactions.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-12 text-center text-slate-400 font-medium space-y-2">
                      <p className="text-base font-bold text-slate-700">No Active Borrowed Books</p>
                      <p className="text-xs text-slate-500">Search the catalog to reserve and check out physical book copies.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: My Holds (Reservations) */}
      {activeTab === 'reservations' && (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-lg font-bold font-poppins text-slate-900">My Hold Reservations Queue</h2>
              <p className="text-xs text-slate-500 mt-0.5">Track your position in queue for checked-out book copies.</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-700 font-bold uppercase tracking-wider">
                <tr>
                  <th className="p-3.5 rounded-l-xl">Reserved Book Title</th>
                  <th className="p-3.5">Request Date</th>
                  <th className="p-3.5">Hold Expiry</th>
                  <th className="p-3.5">Queue Position</th>
                  <th className="p-3.5 text-right rounded-r-xl">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {studentReservations.map((res) => (
                  <tr key={res.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3.5 font-bold text-slate-900 text-sm">{res.bookTitle}</td>
                    <td className="p-3.5 font-mono">{res.requestDate}</td>
                    <td className="p-3.5 font-mono font-bold text-slate-700">{res.expiryDate || '7 Days'}</td>
                    <td className="p-3.5 font-bold">
                      <span className="px-3 py-1 bg-amber-100 text-amber-900 rounded-full font-mono text-xs">
                        Queue Position #{res.queuePosition}
                      </span>
                    </td>
                    <td className="p-3.5 text-right">
                      {res.status === 'PENDING' && (
                        <button
                          onClick={() => handleCancelReservation(res.id)}
                          className="px-3.5 py-1.5 rounded-xl border border-rose-200 text-rose-700 font-bold text-xs hover:bg-rose-50 transition-all cursor-pointer"
                        >
                          Cancel Hold
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {studentReservations.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-12 text-center text-slate-400 font-medium space-y-2">
                      <p className="text-base font-bold text-slate-700">No Active Book Reservations</p>
                      <p className="text-xs text-slate-500">When books are currently checked out, place a reservation hold to reserve the next copy.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: My Extension Requests */}
      {activeTab === 'extensions' && (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-lg font-bold font-poppins text-slate-900">My Book Return Time Extension Requests</h2>
              <p className="text-xs text-slate-500 mt-0.5">Track your submitted due date extension requests and librarian approvals.</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-700 font-bold uppercase tracking-wider">
                <tr>
                  <th className="p-3.5 rounded-l-xl">Book Title & Accession</th>
                  <th className="p-3.5">Current Due Date</th>
                  <th className="p-3.5">Extension Days</th>
                  <th className="p-3.5">Valid Reason Provided</th>
                  <th className="p-3.5">Librarian Decision</th>
                  <th className="p-3.5 text-right rounded-r-xl">Requested Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {studentExtensionRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3.5 font-semibold text-slate-900">
                      {req.bookTitle}
                      <span className="block font-mono text-[11px] text-slate-400 font-normal">{req.accessionNo}</span>
                    </td>
                    <td className="p-3.5 font-bold text-slate-800">{req.currentDueDate}</td>
                    <td className="p-3.5 font-bold text-purple-700">+{req.requestedExtensionDays} Days</td>
                    <td className="p-3.5 text-xs text-slate-700 italic max-w-xs font-medium">"{req.reason}"</td>
                    <td className="p-3.5 font-bold">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] uppercase ${
                          req.status === 'APPROVED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : req.status === 'REJECTED'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {req.status} {req.newDueDate ? `(Extended to ${req.newDueDate})` : ''}
                      </span>
                    </td>
                    <td className="p-3.5 text-right font-mono text-slate-500">{req.requestedDate}</td>
                  </tr>
                ))}
                {studentExtensionRequests.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-12 text-center text-slate-400 font-medium space-y-1">
                      <p className="text-base font-bold text-slate-700">No Extension Requests</p>
                      <p className="text-xs text-slate-500">You can request a time extension for active borrowed books under Active Borrowed Books.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Book Procurement Requests */}
      {activeTab === 'procurement' && (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-lg font-bold font-poppins text-slate-900">Book Procurement Recommendations</h2>
              <p className="text-xs text-slate-500 mt-0.5">Recommendations submitted to library administration for purchasing new books.</p>
            </div>
            <button
              onClick={() => setIsProcurementModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-blue-600 text-white font-bold text-xs shadow-xs hover:bg-blue-700 transition-all flex items-center gap-1.5"
            >
              <PlusCircle className="w-4 h-4" /> New Acquisition Request
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-700 font-bold uppercase tracking-wider">
                <tr>
                  <th className="p-3.5 rounded-l-xl">Book Title & Author</th>
                  <th className="p-3.5">ISBN / Publisher</th>
                  <th className="p-3.5">Requested Date</th>
                  <th className="p-3.5">Reason</th>
                  <th className="p-3.5 text-right rounded-r-xl">Approval Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {myProcurementRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3.5 font-bold text-slate-900">
                      <p className="text-sm text-slate-900">{req.bookTitle}</p>
                      <p className="text-slate-500 font-normal text-xs">By {req.authorName}</p>
                      {req.adminNotes && (
                        <p className="text-[11px] text-purple-700 font-semibold mt-1">Librarian Note: {req.adminNotes}</p>
                      )}
                    </td>
                    <td className="p-3.5 font-mono">{req.isbn || '--'} / {req.publisherName || '--'}</td>
                    <td className="p-3.5 font-mono">{req.requestedDate}</td>
                    <td className="p-3.5 max-w-xs">
                      <p className="italic text-slate-700 line-clamp-2">"{req.reason}"</p>
                      {req.poNumber && (
                        <span className="inline-block mt-1 font-mono text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                          {req.poNumber} ({req.vendorName || 'Supplier Assigned'})
                        </span>
                      )}
                    </td>
                    <td className="p-3.5 text-right font-bold">
                      <span className={`px-3 py-1 rounded-full text-[10px] uppercase font-extrabold border ${
                        req.status === 'AVAILABLE' || req.status === 'CATALOGED'
                          ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                          : req.status === 'REJECTED'
                          ? 'bg-rose-100 text-rose-800 border-rose-300'
                          : req.status === 'PO_GENERATED' || req.status === 'ORDERED'
                          ? 'bg-indigo-100 text-indigo-800 border-indigo-300'
                          : 'bg-amber-100 text-amber-900 border-amber-300'
                      }`}>
                        {req.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {myProcurementRequests.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-12 text-center text-slate-400 font-medium space-y-2">
                      <p className="text-base font-bold text-slate-700">No Procurement Requests</p>
                      <p className="text-xs text-slate-500">Need a book for your coursework that isn't in catalog? Submit an acquisition request!</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 4: Borrowing History Log */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-lg font-bold font-poppins text-slate-900">Complete Borrowing & Circulation History</h2>
              <p className="text-xs text-slate-500 mt-0.5">Historical log of all past and returned book circulation transactions.</p>
            </div>
            <Link
              to="/borrow-history"
              className="px-4 py-2 rounded-xl bg-purple-50 text-purple-700 hover:bg-purple-100 font-bold text-xs border border-purple-200 transition-all flex items-center gap-1.5 shrink-0 w-fit"
            >
              <History className="w-4 h-4 text-purple-600" /> Full History & Export Report &rarr;
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-700 font-bold uppercase tracking-wider">
                <tr>
                  <th className="p-3.5 rounded-l-xl">Accession & Title</th>
                  <th className="p-3.5">Issued On</th>
                  <th className="p-3.5">Due On</th>
                  <th className="p-3.5">Returned On</th>
                  <th className="p-3.5 text-right rounded-r-xl">Borrowing Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {studentHistoryTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3.5 font-semibold text-slate-900">
                      <p className="text-slate-900 font-bold text-sm">{tx.bookTitle}</p>
                      <p className="font-mono text-[10px] text-slate-400">ACC: {tx.accessionNo}</p>
                    </td>
                    <td className="p-3.5 font-mono">{formatOnlyTimeInBracket(tx.issueDate)}</td>
                    <td className="p-3.5 font-mono">{formatOnlyTimeInBracket(tx.dueDate)}</td>
                    <td className="p-3.5 font-mono font-bold text-slate-800">{formatOnlyTimeInBracket(tx.returnDate)}</td>
                    <td className="p-3.5 text-right font-bold">
                      <span className={`px-3 py-1 rounded-full text-[10px] uppercase ${
                        tx.status === 'RETURNED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : tx.status === 'OVERDUE'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {tx.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Book Acquisition Procurement Request Modal */}
      {isProcurementModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold font-poppins text-slate-900 flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-blue-600" /> Request Book Procurement
              </h3>
              <button onClick={() => setIsProcurementModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <form onSubmit={handleSubmitProcurement} className="space-y-3.5 text-xs font-medium">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Book Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Deep Learning Specialization"
                  value={procurementForm.bookTitle}
                  onChange={(e) => setProcurementForm({ ...procurementForm, bookTitle: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-bold mb-1">Author Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ian Goodfellow"
                  value={procurementForm.authorName}
                  onChange={(e) => setProcurementForm({ ...procurementForm, authorName: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">ISBN (Optional)</label>
                  <input
                    type="text"
                    placeholder="978-0262035613"
                    value={procurementForm.isbn}
                    onChange={(e) => setProcurementForm({ ...procurementForm, isbn: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Publisher</label>
                  <input
                    type="text"
                    placeholder="MIT Press"
                    value={procurementForm.publisherName}
                    onChange={(e) => setProcurementForm({ ...procurementForm, publisherName: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>
              <div>
                <label className="block text-slate-700 font-bold mb-1">Reason / Course Syllabus Need</label>
                <textarea
                  rows={2}
                  placeholder="Explain why this book should be added to central library..."
                  value={procurementForm.reason}
                  onChange={(e) => setProcurementForm({ ...procurementForm, reason: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsProcurementModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700"
                >
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Extension Request Modal */}
      {extensionModalTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 space-y-4 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-lg font-poppins text-slate-900 flex items-center gap-2">
                <Clock className="w-5 h-5 text-purple-600" /> Request Book Return Extension
              </h3>
              <button
                onClick={() => setExtensionModalTx(null)}
                className="text-slate-400 hover:text-slate-600 text-2xl font-bold cursor-pointer"
              >
                &times;
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-purple-50/70 border border-purple-100 text-xs space-y-1">
              <p><strong className="text-slate-800">Book Title:</strong> {extensionModalTx.bookTitle}</p>
              <p><strong className="text-slate-800">Accession No:</strong> <span className="font-mono text-purple-700 font-bold">{extensionModalTx.accessionNo}</span></p>
              <p><strong className="text-slate-800">Current Due Date:</strong> <span className="font-bold text-rose-700">{extensionModalTx.dueDate}</span></p>
            </div>

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
                  <Send className="w-4 h-4" /> Submit Request for Admin Approval
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
