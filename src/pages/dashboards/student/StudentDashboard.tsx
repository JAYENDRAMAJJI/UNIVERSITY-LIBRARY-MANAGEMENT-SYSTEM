import React, { useState, useEffect, useMemo } from 'react';
import {
  BookOpen,
  Bookmark,
  ShoppingBag,
  UserCheck,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  IndianRupee,
  Sparkles,
  Clock,
  History,
  PlusCircle,
  Send,
  Award,
  ShieldCheck,
  X,
} from 'lucide-react';
import { libraryStore, formatOnlyTimeInBracket, getMemberPendingFines, getTransactionFineAmount } from '../../../services/libraryStore.service';
import { useAuth } from '../../../context/AuthContext';
import { Link, useSearchParams } from 'react-router-dom';
import { IssueTransaction } from '../../../types/library';
import NoDueCertificateModal from '../../../components/common/NoDueCertificateModal';

export default function StudentDashboard() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [state, setState] = useState(libraryStore.snapshot);
  const [activeTab, setActiveTab] = useState<'loans' | 'extensions' | 'reservations' | 'procurement' | 'history'>('loans');
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isNoDueModalOpen, setIsNoDueModalOpen] = useState(false);
  const [isApplyNoDueModalOpen, setIsApplyNoDueModalOpen] = useState(false);
  const [applyPurpose, setApplyPurpose] = useState<string>('COURSE_COMPLETION');
  const [applyPurposeOther, setApplyPurposeOther] = useState('');
  const [applyPhone, setApplyPhone] = useState('+91 98765 43210');
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

  // Sync tab with URL search parameter
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && ['loans', 'extensions', 'reservations', 'procurement', 'history'].includes(tab)) {
      setActiveTab(tab as any);
    }
  }, [searchParams]);

  const handleTabChange = (tab: 'loans' | 'extensions' | 'reservations' | 'procurement' | 'history') => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

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
    state.members[0] || {
      id: '3',
      userId: '3',
      name: user?.name || 'Alex Johnson',
      email: user?.email || 'student@college.edu',
      role: 'STUDENT' as const,
      memberCardNo: 'STU-2022-0891',
      rollNo: '22CS104',
      department: 'Computer Science & Engineering',
      status: 'ACTIVE' as const,
      maxAllowedBooks: 5,
      currentActiveLoans: 0,
      pendingFines: 0,
      registeredDate: '2022-08-01',
      academicBatch: '2022 - 2026',
    };

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
    (t) => (t.memberId === studentMember?.id || t.memberName === studentMember?.name || t.memberName === studentDisplayName) && (t.status === 'ISSUED' || t.status === 'OVERDUE')
  );

  const loanQuotaPercentage = useMemo(() => {
    const maxAllowed = studentMember?.maxAllowedBooks || 5;
    return Math.min(100, Math.round((studentActiveTransactions.length / maxAllowed) * 100));
  }, [studentActiveTransactions, studentMember]);

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

  const myNoDueApplication = useMemo(() => {
    return (state.noDueApplications || []).find(
      (a) => a.studentId === studentMember.id || a.libraryMembershipId.toLowerCase() === studentMember.memberCardNo?.toLowerCase()
    );
  }, [state.noDueApplications, studentMember]);

  const myNoDueAudit = useMemo(() => {
    return libraryStore.getMemberNoDueAudit(studentMember.id);
  }, [studentMember, state]);

  const handleSubmitNoDueApplication = (e: React.FormEvent) => {
    e.preventDefault();
    const res = libraryStore.submitNoDueApplication({
      studentId: studentMember.id,
      studentName: studentDisplayName,
      rollNo: studentMember.rollNo || '22CS104',
      department: studentMember.department || 'Computer Science & Engineering',
      program: 'Bachelor of Technology (B.Tech)',
      batch: studentMember.academicBatch || '2022 - 2026',
      semesterYear: 'Semester 8 (Final Year)',
      libraryMembershipId: studentMember.memberCardNo,
      email: studentMember.email,
      phone: applyPhone,
      purpose: applyPurpose as any,
      purposeOtherDetails: applyPurposeOther,
    });

    if (res.success) {
      setAlert({ type: 'success', message: res.message });
      setIsApplyNoDueModalOpen(false);
    } else {
      setAlert({ type: 'error', message: res.message });
    }
  };

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
      requestedById: studentMember?.id || '3',
      requestedByName: studentMember?.name || studentDisplayName,
      requestedByRole: 'STUDENT',
    });

    setAlert({ type: 'success', message: `Procurement request submitted for "${procurementForm.bookTitle}".` });
    setIsProcurementModalOpen(false);
    setProcurementForm({ bookTitle: '', authorName: '', isbn: '', publisherName: '', reason: '' });
  };

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

        <div className="relative z-10 flex flex-wrap items-center gap-2.5">
          <Link
            to="/catalog"
            className="px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-bold text-white backdrop-blur-md flex items-center gap-2 transition-all cursor-pointer"
          >
            <BookOpen className="w-4 h-4 text-blue-300" />
            <span>Search Catalog</span>
          </Link>

          <Link
            to="/attendance"
            className="px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-bold text-white backdrop-blur-md flex items-center gap-2 transition-all cursor-pointer"
          >
            <UserCheck className="w-4 h-4 text-emerald-400" />
            {myActiveAttendance ? (
              <span className="text-emerald-300 font-extrabold animate-pulse">
                ● In Library ({myActiveAttendance.checkInTime})
              </span>
            ) : (
              <span>My Attendance</span>
            )}
          </Link>

          {(() => {
            const pendingFineVal = getMemberPendingFines(studentMember.id, state);
            return (
              <Link
                to="/fines"
                className={`px-4 py-2.5 rounded-2xl border text-xs font-bold backdrop-blur-md flex items-center gap-2 transition-all cursor-pointer ${
                  pendingFineVal > 0
                    ? 'bg-rose-500/20 hover:bg-rose-500/30 border-rose-400/40 text-rose-200 shadow-xs animate-pulse'
                    : 'bg-white/10 hover:bg-white/20 border-white/20 text-white'
                }`}
              >
                <IndianRupee className="w-4 h-4 text-amber-300" />
                <span>My Fines {pendingFineVal > 0 ? `(₹${pendingFineVal.toFixed(0)})` : ''}</span>
              </Link>
            );
          })()}
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

      {/* Outstanding Fine Notice Banner if member has pending dues */}
      {(() => {
        const pendingFineVal = getMemberPendingFines(studentMember.id, state);
        if (pendingFineVal <= 0) return null;
        return (
          <div className="p-5 rounded-3xl bg-rose-50 border-2 border-rose-200 text-rose-900 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-fadeIn">
            <div className="flex items-start gap-3.5">
              <div className="p-3 bg-rose-100 rounded-2xl text-rose-700 shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-rose-950 font-poppins">
                  Outstanding Overdue Fine: ₹{pendingFineVal.toFixed(2)} Pending
                </h3>
                <p className="text-xs text-rose-800 mt-0.5 leading-relaxed">
                  Fines have been assessed on your account for late book returns. Please settle your dues at the circulation desk or online to maintain full borrowing privileges.
                </p>
              </div>
            </div>
            <Link
              to="/fines"
              className="px-4 py-2.5 rounded-xl bg-rose-700 hover:bg-rose-800 text-white font-bold text-xs transition-all shadow-sm shrink-0 self-end md:self-center flex items-center gap-1.5 cursor-pointer"
            >
              <IndianRupee className="w-3.5 h-3.5" /> View Fine Details &rarr;
            </Link>
          </div>
        );
      })()}

      {/* Metrics Summary Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Metric 1: Active Borrowed Loans */}
        <div className="bg-white p-5 rounded-3xl shadow-xs border border-slate-200/90 flex flex-col justify-between min-w-0 transition-all hover:shadow-md hover:border-blue-200 space-y-3.5">
          <div className="flex items-center justify-between">
            <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
              <BookOpen className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-extrabold uppercase tracking-wide text-blue-800 bg-blue-50 border border-blue-200/70 px-2.5 py-1 rounded-full">
              Quota: {studentMember.maxAllowedBooks} Books
            </span>
          </div>

          <div className="min-w-0">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider truncate">Active Borrowed Books</p>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-2xl sm:text-3xl font-extrabold font-poppins text-slate-900">{studentActiveTransactions.length}</span>
              <span className="text-xs font-semibold text-slate-500">/ {studentMember.maxAllowedBooks} Allowed</span>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500">
              <span>Quota Usage</span>
              <span className="font-mono font-bold text-blue-700">{loanQuotaPercentage}%</span>
            </div>
            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
              <div className="bg-blue-600 h-full rounded-full transition-all" style={{ width: `${loanQuotaPercentage}%` }} />
            </div>
          </div>
        </div>

        {/* Metric 2: Active Reservations */}
        <div className="bg-white p-5 rounded-3xl shadow-xs border border-slate-200/90 flex flex-col justify-between min-w-0 transition-all hover:shadow-md hover:border-amber-200 space-y-3.5">
          <div className="flex items-center justify-between">
            <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100">
              <Bookmark className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-extrabold uppercase tracking-wide text-amber-800 bg-amber-50 border border-amber-200/70 px-2.5 py-1 rounded-full">
              Hold Queue
            </span>
          </div>

          <div className="min-w-0">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider truncate">Reservations On Hold</p>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-2xl sm:text-3xl font-extrabold font-poppins text-slate-900">{studentReservations.length}</span>
              <span className="text-xs font-semibold text-slate-500">Pending Holds</span>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span className="truncate">Priority Queue Active</span>
            <Link to="/reservations" className="text-amber-700 font-bold hover:underline shrink-0 flex items-center gap-0.5">
              Queue &rarr;
            </Link>
          </div>
        </div>

        {/* Metric 3: Fine Ledger Balance */}
        {(() => {
          const calculatedPendingFine = getMemberPendingFines(studentMember.id, state);
          return (
            <Link
              to="/fines"
              className={`p-5 rounded-3xl shadow-xs border flex flex-col justify-between min-w-0 transition-all hover:shadow-md hover:scale-[1.02] cursor-pointer space-y-3.5 ${
                calculatedPendingFine > 0
                  ? 'bg-rose-50/40 border-rose-200 hover:border-rose-300'
                  : 'bg-white border-slate-200/90 hover:border-emerald-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border ${
                  calculatedPendingFine > 0
                    ? 'bg-rose-100 text-rose-700 border-rose-200'
                    : 'bg-emerald-50 text-emerald-600 border-emerald-100'
                }`}>
                  <IndianRupee className="w-5 h-5" />
                </div>
                <span className={`text-[11px] font-extrabold uppercase tracking-wide px-2.5 py-1 rounded-full border ${
                  calculatedPendingFine > 0
                    ? 'bg-rose-100 text-rose-800 border-rose-300'
                    : 'bg-emerald-50 text-emerald-800 border-emerald-200/70'
                }`}>
                  {calculatedPendingFine > 0 ? 'Unpaid Dues' : 'Clear Account'}
                </span>
              </div>

              <div className="min-w-0">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider truncate">Pending Fines Balance</p>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span className={`text-2xl sm:text-3xl font-extrabold font-poppins ${
                    calculatedPendingFine > 0 ? 'text-rose-700' : 'text-slate-900'
                  }`}>
                    ₹{calculatedPendingFine.toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>Overdue: ₹{(state.config?.fineRatePerDay || 5).toFixed(2)}/day</span>
                <span className="text-blue-600 font-bold hover:underline flex items-center gap-0.5">
                  View &rarr;
                </span>
              </div>
            </Link>
          );
        })()}

        {/* Metric 4: Acquisition Requests */}
        <div className="bg-white p-5 rounded-3xl shadow-xs border border-slate-200/90 flex flex-col justify-between min-w-0 transition-all hover:shadow-md hover:border-purple-200 space-y-3.5">
          <div className="flex items-center justify-between">
            <div className="w-11 h-11 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 border border-purple-100">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-extrabold uppercase tracking-wide text-purple-800 bg-purple-50 border border-purple-200/70 px-2.5 py-1 rounded-full">
              Procurement
            </span>
          </div>

          <div className="min-w-0">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider truncate">Book Requests</p>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-2xl sm:text-3xl font-extrabold font-poppins text-slate-900">{myProcurementRequests.length}</span>
              <span className="text-xs font-semibold text-slate-500">Submitted</span>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span className="truncate">Librarian Review Active</span>
            <button
              type="button"
              onClick={() => handleTabChange('procurement')}
              className="text-purple-700 font-bold hover:underline shrink-0 flex items-center gap-0.5 cursor-pointer"
            >
              Track &rarr;
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Tabs Bar - Single Line */}
      <div className="bg-white p-3 rounded-3xl shadow-sm border border-slate-200 flex items-center gap-2 overflow-x-auto whitespace-nowrap scrollbar-none">
        <button
          onClick={() => handleTabChange('loans')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer shrink-0 whitespace-nowrap ${
            activeTab === 'loans' ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" /> Active Borrowed Books ({studentActiveTransactions.length})
        </button>

        <button
          onClick={() => handleTabChange('procurement')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer shrink-0 whitespace-nowrap ${
            activeTab === 'procurement' ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
          }`}
        >
          <ShoppingBag className="w-3.5 h-3.5" /> Procurement ({myProcurementRequests.length})
        </button>

        <button
          onClick={() => handleTabChange('history')}
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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-lg font-bold font-poppins text-slate-900">My Borrowed Books & Return Dates</h2>
              <p className="text-xs text-slate-500 mt-0.5">Manage borrowed book copies and submit return time extension requests with valid reasons.</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Link
                to="/extensions"
                className="px-3.5 py-1.5 rounded-xl bg-purple-50 text-purple-700 hover:bg-purple-100 font-bold text-xs border border-purple-200 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <Clock className="w-3.5 h-3.5 text-purple-600" />
                <span>Extend Book Time Desk &rarr;</span>
              </Link>
              <Link
                to="/reservations"
                className="px-3.5 py-1.5 rounded-xl bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-bold text-xs border border-indigo-200 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <Bookmark className="w-3.5 h-3.5 text-indigo-600" />
                <span>Reservations Queue &rarr;</span>
              </Link>
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
                        <span className={`px-2.5 py-1 rounded-full text-[10px] uppercase font-extrabold whitespace-nowrap inline-block ${
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
                          <span className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold text-xs inline-flex items-center gap-1.5">
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span>Approved (+{existingReq.requestedExtensionDays}d • Extended to <strong className="font-mono">{existingReq.newDueDate || formatOnlyTimeInBracket(tx.dueDate)}</strong>)</span>
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

      {/* Tab 2: Book Procurement Requests */}
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
                      <span className={`px-3 py-1 rounded-full text-[10px] uppercase font-extrabold border whitespace-nowrap inline-block ${
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
                  <th className="p-3.5">Fine Amount</th>
                  <th className="p-3.5 text-right rounded-r-xl">Borrowing Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {studentHistoryTransactions.map((tx) => {
                  const fineInfo = getTransactionFineAmount(tx, state);
                  return (
                    <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3.5 font-semibold text-slate-900">
                        <p className="text-slate-900 font-bold text-sm">{tx.bookTitle}</p>
                        <p className="font-mono text-[10px] text-slate-400">ACC: {tx.accessionNo} | BC: {tx.barcode}</p>
                      </td>
                      <td className="p-3.5 font-mono">{formatOnlyTimeInBracket(tx.issueDate)}</td>
                      <td className="p-3.5 font-mono">{formatOnlyTimeInBracket(tx.dueDate)}</td>
                      <td className="p-3.5 font-mono font-bold text-slate-800">{formatOnlyTimeInBracket(tx.returnDate)}</td>
                      <td className="p-3.5 font-mono font-bold">
                        {fineInfo.fineAmount > 0 ? (
                          <span className="text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                            ₹{fineInfo.fineAmount.toFixed(2)} ({fineInfo.fineStatus})
                          </span>
                        ) : (
                          <span className="text-slate-400">₹0.00</span>
                        )}
                      </td>
                      <td className="p-3.5 text-right font-bold">
                        <span className={`px-3 py-1 rounded-full text-[10px] uppercase font-extrabold whitespace-nowrap inline-block ${
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
                  );
                })}
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

            {studentActiveTransactions.length > 1 ? (
              <div>
                <label className="block font-bold text-slate-700 mb-1">Select Borrowed Book to Extend *</label>
                <select
                  value={extensionModalTx.id}
                  onChange={(e) => {
                    const found = studentActiveTransactions.find((tx) => tx.id === e.target.value);
                    if (found) setExtensionModalTx(found);
                  }}
                  className="w-full p-2.5 rounded-xl border border-purple-200 text-xs font-bold focus:ring-2 focus:ring-purple-500/20 bg-purple-50/40 text-slate-900"
                >
                  {studentActiveTransactions.map((tx) => (
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

      {/* Student Application Form Modal for Library No Due Certificate */}
      {isApplyNoDueModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full max-h-[92vh] flex flex-col border border-slate-100 relative overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 bg-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-100 text-amber-700 flex items-center justify-center font-bold shrink-0">
                  <Award className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold font-poppins text-slate-900">
                    Apply for Library No Due Certificate
                  </h3>
                  <p className="text-xs text-slate-500">
                    Central University Library Clearance Application Form
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsApplyNoDueModalOpen(false)}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                &times;
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmitNoDueApplication} className="p-6 space-y-4 overflow-y-auto flex-1 custom-scrollbar text-xs">
              {/* Pre-populated Student Info Strip */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 grid grid-cols-2 gap-2 text-slate-700">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Student Name</span>
                  <p className="font-bold text-slate-900">{studentDisplayName}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Roll / Reg No</span>
                  <p className="font-mono font-bold text-slate-900">{studentMember.rollNo || '22CS104'}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Library Card ID</span>
                  <p className="font-mono font-bold text-indigo-700">{studentMember.memberCardNo}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Academic Batch</span>
                  <p className="font-semibold text-slate-800">{studentMember.academicBatch || '2022 - 2026'}</p>
                </div>
              </div>

              {/* Purpose Selection */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Clearance Purpose *</label>
                <select
                  value={applyPurpose}
                  onChange={(e) => setApplyPurpose(e.target.value)}
                  required
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-amber-500/20 bg-slate-50"
                >
                  <option value="COURSE_COMPLETION">Course Completion & College Graduation (Standard)</option>
                  <option value="COLLEGE_TRANSFER">College Transfer / Migration Certificate</option>
                  <option value="SEMESTER_CLEARANCE">Semester Clearance & Year Progression</option>
                  <option value="INTERNSHIP_PROJECT">Off-Campus Internship / Capstone Project Clearance</option>
                  <option value="EXAM_HALL_TICKET">Exam Hall Ticket Clearance</option>
                  <option value="HOSTEL_CLEARANCE">Hostel & Department Clearance</option>
                  <option value="OTHER">Other Purpose (Specify Details Below)</option>
                </select>
              </div>

              {applyPurpose === 'OTHER' && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Specify Purpose Details *</label>
                  <input
                    type="text"
                    required
                    value={applyPurposeOther}
                    onChange={(e) => setApplyPurposeOther(e.target.value)}
                    placeholder="Provide specific institutional reason for certificate..."
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs"
                  />
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 mb-1">Contact Phone Number</label>
                <input
                  type="text"
                  value={applyPhone}
                  onChange={(e) => setApplyPhone(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-medium"
                />
              </div>

              {/* Live Real-time Auto-Verification Matrix */}
              <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100 space-y-2">
                <span className="font-extrabold text-[11px] uppercase tracking-wider text-indigo-900 flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-indigo-600" /> Automated Live Dues Verification
                </span>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div className={`p-2.5 rounded-xl border ${myNoDueAudit.activeLoansCount === 0 ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'}`}>
                    <span className="text-[10px] font-bold block">Active Borrowed Books</span>
                    <strong className="text-xs">{myNoDueAudit.activeLoansCount === 0 ? '✓ 0 (All Returned)' : `⚠ ${myNoDueAudit.activeLoansCount} Books Out`}</strong>
                  </div>
                  <div className={`p-2.5 rounded-xl border ${myNoDueAudit.pendingFinesAmount === 0 ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'}`}>
                    <span className="text-[10px] font-bold block">Pending Fine Dues</span>
                    <strong className="text-xs">{myNoDueAudit.pendingFinesAmount === 0 ? '✓ ₹0.00 (Nil / Clear)' : `⚠ ₹${myNoDueAudit.pendingFinesAmount.toFixed(2)}`}</strong>
                  </div>
                </div>

                {!myNoDueAudit.isEligible && (
                  <p className="text-[11px] text-rose-700 mt-1 font-medium">
                    Note: You can submit your application now, but please return any active books and clear unpaid fines so the Head of Library can approve your certificate.
                  </p>
                )}
              </div>

              {/* Submit Action */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsApplyNoDueModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-bold shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" /> Submit Application
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Official Library No Due Clearance Certificate Modal */}
      {isNoDueModalOpen && studentMember && (
        <NoDueCertificateModal
          isOpen={isNoDueModalOpen}
          onClose={() => setIsNoDueModalOpen(false)}
          member={studentMember}
          application={myNoDueApplication}
          isAdminView={false}
        />
      )}
    </div>
  );
}
