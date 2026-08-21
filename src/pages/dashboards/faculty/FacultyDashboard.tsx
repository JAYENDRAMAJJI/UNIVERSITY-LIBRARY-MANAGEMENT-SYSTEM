import React, { useState, useEffect, useMemo } from 'react';
import {
  Book,
  Download,
  FileText,
  CheckCircle,
  RefreshCw,
  Clock,
  UserCheck,
  History,
  Award,
  IndianRupee,
  AlertTriangle,
  Sparkles,
  ShoppingBag,
  Send,
  X,
  Bookmark,
} from 'lucide-react';
import { libraryStore, formatOnlyTimeInBracket, getMemberPendingFines } from '../../../services/libraryStore.service';
import { useAuth } from '../../../context/AuthContext';
import { Link, useSearchParams } from 'react-router-dom';

export default function FacultyDashboard() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [state, setState] = useState(libraryStore.snapshot);
  const [activeTab, setActiveTab] = useState<'loans' | 'reservations' | 'extensions' | 'procurement'>('loans');
  const [suggestionTitle, setSuggestionTitle] = useState('');
  const [suggestionAuthor, setSuggestionAuthor] = useState('');
  const [suggestionReason, setSuggestionReason] = useState('');
  const [toast, setToast] = useState<string | null>(null);

  const [extensionModalTx, setExtensionModalTx] = useState<any | null>(null);
  const [extensionDays, setExtensionDays] = useState(30);
  const [extensionReason, setExtensionReason] = useState('');

  // Sync tab with URL search parameter
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && ['loans', 'reservations', 'extensions', 'procurement'].includes(tab)) {
      setActiveTab(tab as any);
    }
  }, [searchParams]);

  const handleTabChange = (tab: 'loans' | 'reservations' | 'extensions' | 'procurement') => {
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

  const facultyMember =
    state.members.find((m) => user?.email && m.email.toLowerCase() === user.email.toLowerCase()) ||
    state.members.find((m) => user?.id && m.id === user.id) ||
    state.members.find((m) => user?.name && m.name.toLowerCase() === user.name.toLowerCase()) ||
    state.members.find((m) => m.role === 'FACULTY') ||
    state.members[1] || {
      id: '2',
      userId: '2',
      name: user?.name || 'Dr. Sarah Connor',
      email: user?.email || 'faculty@college.edu',
      role: 'FACULTY' as const,
      memberCardNo: 'FAC-2023-1102',
      department: 'Electrical Engineering',
      status: 'ACTIVE' as const,
      maxAllowedBooks: 10,
      currentActiveLoans: 0,
      pendingFines: 0,
      registeredDate: '2021-08-15',
    };

  const myAttendanceRecords = (state.attendanceRecords || []).filter((r) => {
    const uEmail = user?.email?.toLowerCase();
    const uName = user?.name?.toLowerCase();
    const mId = facultyMember?.id;
    const mCard = facultyMember?.memberCardNo?.toLowerCase();
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

  const facultyTransactions = state.transactions.filter(
    (t) =>
      (t.memberId === facultyMember?.id || t.memberName === facultyMember?.name) &&
      (t.status === 'ISSUED' || t.status === 'OVERDUE')
  );

  const facultyExtensionRequests = (state.extensionRequests || []).filter(
    (r) => r.memberId === facultyMember?.id || r.memberName === facultyMember?.name
  );

  const handleRequestExtensionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!extensionModalTx || !extensionReason.trim()) return;

    const res = libraryStore.requestBookExtension(
      extensionModalTx.id,
      facultyMember?.id || '2',
      Number(extensionDays),
      extensionReason
    );

    if (res.success) {
      setToast(res.message);
    } else {
      setToast(res.message);
    }

    setExtensionModalTx(null);
    setExtensionReason('');
    setTimeout(() => setToast(null), 5000);
  };

  const facultyProcurementRequests = (state.procurementRequests || []).filter(
    (r) => r.requestedById === facultyMember?.id || r.requestedByName === facultyMember?.name
  );

  const facultyReservations = state.reservations.filter(
    (r) => r.memberId === facultyMember?.id || r.memberName === facultyMember?.name
  );

  const handleCancelReservation = (resId: string) => {
    libraryStore.cancelReservation(resId);
    setToast('Reservation hold cancelled.');
    setTimeout(() => setToast(null), 4000);
  };

  const handleSelfRenew = (txId: string) => {
    const res = libraryStore.renewBook(txId);
    if (res.success) {
      setToast(res.message);
      setTimeout(() => setToast(null), 4000);
    }
  };

  const handleSuggestionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!suggestionTitle) return;

    libraryStore.addProcurementRequest({
      bookTitle: suggestionTitle,
      authorName: suggestionAuthor || 'Academic Author',
      publisherName: 'Academic Press',
      reason: suggestionReason || 'Essential reference text for department curriculum & research.',
      requestedById: facultyMember?.id || '2',
      requestedByName: facultyMember?.name || user?.name || 'Dr. Sarah Connor',
      requestedByRole: 'FACULTY',
    });

    setToast(`Procurement recommendation for "${suggestionTitle}" submitted to Head Librarian for accession.`);
    setSuggestionTitle('');
    setSuggestionAuthor('');
    setSuggestionReason('');
    setTimeout(() => setToast(null), 4000);
  };

  return (
    <div className="space-y-8 pb-8">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-950 via-indigo-950 to-blue-900 rounded-3xl p-8 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="space-y-1 relative z-10">
          <div className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-widest text-blue-300 bg-white/10 px-3.5 py-1 rounded-full mb-2">
            <Sparkles className="h-3.5 w-3.5" /> Faculty Academic & Research Portal
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold font-poppins tracking-tight">
            Welcome, Professor {facultyMember?.name || 'Faculty Member'}
          </h1>
          <p className="text-slate-300 text-sm mt-1">
            Faculty ID: <span className="font-mono font-bold text-amber-300">{facultyMember?.memberCardNo}</span> | Department:{' '}
            <strong className="text-white">{facultyMember?.department}</strong> | Max Borrowing Quota:{' '}
            <span className="font-bold text-emerald-400">{facultyMember?.maxAllowedBooks} Books / 30 Days</span>
          </p>
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
              <span>My Attendance & Visits</span>
            )}
          </Link>

          {(() => {
            const facPending = getMemberPendingFines(facultyMember?.id || '', state);
            return (
              <Link
                to="/fines"
                className={`px-4 py-2.5 rounded-2xl border text-xs font-bold backdrop-blur-md flex items-center gap-2 transition-all cursor-pointer ${
                  facPending > 0
                    ? 'bg-rose-500/20 hover:bg-rose-500/30 border-rose-400/40 text-rose-200 shadow-xs animate-pulse'
                    : 'bg-white/10 hover:bg-white/20 border-white/20 text-white'
                }`}
              >
                <IndianRupee className="w-4 h-4 text-amber-300" />
                <span>My Fines {facPending > 0 ? `(₹${facPending.toFixed(0)})` : ''}</span>
              </Link>
            );
          })()}
        </div>
      </div>

      {toast && (
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-semibold shadow-xs animate-fadeIn">
          <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0" />
          <span>{toast}</span>
        </div>
      )}

      {/* Outstanding Fine Notice Banner for Faculty */}
      {(() => {
        const facPending = getMemberPendingFines(facultyMember?.id || '', state);
        if (facPending <= 0) return null;
        return (
          <div className="p-5 rounded-3xl bg-rose-50 border-2 border-rose-200 text-rose-900 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-fadeIn">
            <div className="flex items-start gap-3.5">
              <div className="p-3 bg-rose-100 rounded-2xl text-rose-700 shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-rose-950 font-poppins">
                  Circulation Fine Notice: ₹{facPending.toFixed(2)} Pending
                </h3>
                <p className="text-xs text-rose-800 mt-0.5 leading-relaxed">
                  You have accrued late return fines on your faculty borrowing profile ({facultyMember?.memberCardNo}). Please clear dues online or at the circulation counter.
                </p>
              </div>
            </div>
            <Link
              to="/fines"
              className="px-4 py-2.5 rounded-xl bg-rose-700 hover:bg-rose-800 text-white font-bold text-xs transition-all shadow-sm shrink-0 self-end md:self-center flex items-center gap-1.5 cursor-pointer"
            >
              <IndianRupee className="w-3.5 h-3.5" /> View Fine Breakdown &rarr;
            </Link>
          </div>
        );
      })()}

      {/* Grid Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Stat 1: Research Papers */}
        <div className="bg-white p-5 rounded-3xl shadow-xs border border-slate-200/90 flex items-center gap-4 min-w-0">
          <div className="p-3.5 rounded-2xl bg-blue-50 text-blue-600 shrink-0">
            <FileText className="w-6 h-6" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider truncate">Research Papers</p>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-2xl font-extrabold text-slate-900 font-poppins">
                {state.digitalResources.filter((r) => r.resourceType === 'RESEARCH_PAPER').length}
              </span>
              <span className="text-xs font-semibold text-slate-500">Available</span>
            </div>
          </div>
        </div>

        {/* Stat 2: Active Faculty Borrowed Books */}
        <div className="bg-white p-5 rounded-3xl shadow-xs border border-slate-200/90 flex items-center gap-4 min-w-0">
          <div className="p-3.5 rounded-2xl bg-emerald-50 text-emerald-600 shrink-0">
            <Book className="w-6 h-6" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider truncate">Borrowed Books</p>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-2xl font-extrabold text-slate-900 font-poppins">
                {facultyTransactions.length}
              </span>
              <span className="text-xs font-semibold text-slate-500">/ {facultyMember?.maxAllowedBooks || 10} Allowed</span>
            </div>
          </div>
        </div>

        {/* Stat 3: E-Books & Journals */}
        <div className="bg-white p-5 rounded-3xl shadow-xs border border-slate-200/90 flex items-center gap-4 min-w-0">
          <div className="p-3.5 rounded-2xl bg-purple-50 text-purple-600 shrink-0">
            <Download className="w-6 h-6" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider truncate">E-Books & Journals</p>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-2xl font-extrabold text-slate-900 font-poppins">
                {state.digitalResources.length}
              </span>
              <span className="text-xs font-semibold text-slate-500">Repositories</span>
            </div>
          </div>
        </div>

        {/* Stat 4: Fine Dues / Outstanding */}
        {(() => {
          const facPending = getMemberPendingFines(facultyMember?.id || '', state);
          return (
            <Link
              to="/fines"
              className={`p-5 rounded-3xl shadow-xs border flex items-center gap-4 min-w-0 transition-all hover:scale-[1.02] cursor-pointer ${
                facPending > 0 ? 'bg-rose-50/50 border-rose-200 hover:border-rose-300' : 'bg-white border-slate-200/90 hover:border-blue-200'
              }`}
            >
              <div className={`p-3.5 rounded-2xl shrink-0 ${facPending > 0 ? 'bg-rose-100 text-rose-700' : 'bg-emerald-50 text-emerald-600'}`}>
                <IndianRupee className="w-6 h-6" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider truncate">Fines & Dues</p>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${facPending > 0 ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'}`}>
                    {facPending > 0 ? 'Unpaid' : 'Clear'}
                  </span>
                </div>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span className={`text-2xl font-extrabold font-poppins ${facPending > 0 ? 'text-rose-700' : 'text-slate-900'}`}>
                    ₹{facPending.toFixed(2)}
                  </span>
                  <span className="text-xs text-blue-600 font-bold hover:underline">View &rarr;</span>
                </div>
              </div>
            </Link>
          );
        })()}
      </div>

      {/* Navigation Tabs Bar */}
      <div className="bg-white p-3 rounded-3xl shadow-sm border border-slate-200 flex items-center gap-2 overflow-x-auto whitespace-nowrap scrollbar-none">
        <button
          onClick={() => handleTabChange('loans')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer shrink-0 whitespace-nowrap ${
            activeTab === 'loans' ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Book className="w-3.5 h-3.5" /> Active Borrowed Books ({facultyTransactions.length})
        </button>

        <button
          onClick={() => handleTabChange('procurement')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer shrink-0 whitespace-nowrap ${
            activeTab === 'procurement' ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
          }`}
        >
          <ShoppingBag className="w-3.5 h-3.5" /> Procurement Recommendations ({facultyProcurementRequests.length})
        </button>
      </div>

      {/* Tab 1: Active Borrowed Books Table */}
      {activeTab === 'loans' && (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-lg font-bold font-poppins text-slate-900">
                Active Faculty Borrowed Books
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">Faculty privileges allow self-service due date extensions up to max renewals.</p>
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
              <Link
                to="/borrow-history"
                className="px-3.5 py-1.5 rounded-xl bg-slate-50 text-slate-700 hover:bg-slate-100 font-bold text-xs border border-slate-200 transition-all flex items-center gap-1.5"
              >
                <History className="w-3.5 h-3.5 text-slate-600" /> Full History & Report &rarr;
              </Link>
            </div>
          </div>

          {facultyTransactions.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-slate-700 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="p-3.5 rounded-l-xl">Accession & Title</th>
                    <th className="p-3.5">Issued Date</th>
                    <th className="p-3.5">Due Date</th>
                    <th className="p-3.5">Renewals</th>
                    <th className="p-3.5 text-right rounded-r-xl">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {facultyTransactions.map((tx) => {
                    const existingReq = facultyExtensionRequests.find((r) => r.transactionId === tx.id);
                    return (
                      <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3.5 font-semibold text-slate-900">
                          <p className="text-slate-900 font-bold text-sm">{tx.bookTitle}</p>
                          <p className="font-mono text-[10px] text-slate-400">ACC: {tx.accessionNo} | BC: {tx.barcode}</p>
                        </td>
                        <td className="p-3.5 font-mono">{formatOnlyTimeInBracket(tx.issueDate)}</td>
                        <td className="p-3.5 font-mono font-bold text-blue-700">{formatOnlyTimeInBracket(tx.dueDate)}</td>
                        <td className="p-3.5 font-mono">{tx.renewalCount} / {tx.maxRenewals} Max</td>
                        <td className="p-3.5 text-right">
                          {existingReq?.status === 'PENDING' ? (
                            <span className="px-3 py-1.5 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 font-bold text-xs inline-flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-amber-600 animate-pulse" /> Extension Pending Admin Approval
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
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600 text-white font-bold text-[11px] shadow-2xs hover:bg-purple-700 transition-all cursor-pointer"
                            >
                              <Clock className="w-3.5 h-3.5 text-purple-200" /> Request Time Extension
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-xs text-slate-500 py-6 text-center">
              No borrowed books currently checked out. Search the Library Catalog to reserve books.
            </p>
          )}
        </div>
      )}

      {/* Tab 4: Procurement Recommendations */}
      {activeTab === 'procurement' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recommendation Form */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center gap-2 text-purple-700">
              <ShoppingBag className="w-5 h-5" />
              <h2 className="text-lg font-bold font-poppins text-slate-900">Recommend Book Procurement</h2>
            </div>
            <p className="text-xs text-slate-500">Recommend new research titles or textbooks for the central library catalog.</p>

            <form onSubmit={handleSuggestionSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Book Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Designing Data-Intensive Applications..."
                  value={suggestionTitle}
                  onChange={(e) => setSuggestionTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Author Name</label>
                <input
                  type="text"
                  placeholder="e.g. Martin Kleppmann..."
                  value={suggestionAuthor}
                  onChange={(e) => setSuggestionAuthor(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Curriculum & Research Reason</label>
                <textarea
                  rows={2}
                  placeholder="Why should this book be added to the library catalog?"
                  value={suggestionReason}
                  onChange={(e) => setSuggestionReason(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-xs shadow-md shadow-blue-200 hover:opacity-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Send className="w-4 h-4" /> Submit Recommendation to Head Librarian
              </button>
            </form>
          </div>

          {/* Existing Recommendations Status */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
            <h2 className="text-lg font-bold font-poppins text-slate-900">My Procurement Recommendations</h2>
            <p className="text-xs text-slate-500">Track status of titles requested for accession into the university library.</p>

            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
              {facultyProcurementRequests.map((req) => (
                <div key={req.id} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-slate-900 text-sm">{req.bookTitle}</h3>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border whitespace-nowrap inline-block ${
                        req.status === 'AVAILABLE' || req.status === 'CATALOGED'
                          ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                          : req.status === 'REJECTED'
                          ? 'bg-rose-100 text-rose-800 border-rose-300'
                          : req.status === 'PO_GENERATED' || req.status === 'ORDERED'
                          ? 'bg-indigo-100 text-indigo-800 border-indigo-300'
                          : 'bg-amber-100 text-amber-900 border-amber-300'
                      }`}
                    >
                      {req.status}
                    </span>
                  </div>
                  <p className="text-slate-600">Author: <strong className="text-slate-800">{req.authorName}</strong></p>
                  {req.poNumber && (
                    <p className="text-[11px] font-mono font-bold text-indigo-700">
                      PO Issued: {req.poNumber} ({req.vendorName || 'Supplier Assigned'})
                    </p>
                  )}
                  {req.adminNotes && (
                    <p className="text-purple-900 bg-purple-50 p-2 rounded-xl border border-purple-100 font-sans italic text-[11px]">
                      Librarian Note: "{req.adminNotes}"
                    </p>
                  )}
                </div>
              ))}

              {facultyProcurementRequests.length === 0 && (
                <div className="p-8 text-center text-slate-400 text-xs">
                  No procurement recommendations submitted yet. Use the form to request new book acquisitions.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Faculty Extension Request Modal */}
      {extensionModalTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 space-y-4 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-lg font-poppins text-slate-900 flex items-center gap-2">
                <Clock className="w-5 h-5 text-purple-600" /> Faculty Return Time Extension Request
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
                <label className="block font-bold text-slate-700 mb-1">Requested Faculty Extension Duration *</label>
                <select
                  value={extensionDays}
                  onChange={(e) => setExtensionDays(Number(e.target.value))}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:ring-2 focus:ring-purple-500/20"
                >
                  <option value={15}>+15 Days (2 Weeks Extension)</option>
                  <option value={30}>+30 Days (1 Month Faculty Extension - Standard)</option>
                  <option value={45}>+45 Days (Semester Curriculum Research)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Valid Academic Reason for Extension *</label>
                <textarea
                  rows={3}
                  required
                  value={extensionReason}
                  onChange={(e) => setExtensionReason(e.target.value)}
                  placeholder="State valid academic reason (e.g. Extended research reference for preparing CS402 syllabus & lab manuals)..."
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
