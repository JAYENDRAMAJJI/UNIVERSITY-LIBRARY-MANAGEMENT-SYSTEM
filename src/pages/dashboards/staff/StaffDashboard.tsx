import React, { useState, useEffect, useMemo } from 'react';
import {
  ScanBarcode,
  RotateCcw,
  RefreshCw,
  UserCheck,
  Users,
  BookOpen,
  Layers,
  Search,
  CheckCircle,
  AlertTriangle,
  Clock,
  ShieldCheck,
  Award,
  ArrowRight,
  TrendingUp,
  Tag,
  IndianRupee,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { libraryStore, formatOnlyTimeInBracket } from '../../../services/libraryStore.service';
import { useAuth } from '../../../context/AuthContext';
import { Link } from 'react-router-dom';

export default function StaffDashboard() {
  const { user } = useAuth();
  const [state, setState] = useState(libraryStore.snapshot);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const sub = libraryStore.getObservable().subscribe(setState);
    return () => sub.unsubscribe();
  }, []);

  const staffName = user?.name || 'Library Circulation Officer';

  // Metrics
  const totalBooks = state.books.reduce((acc, b) => acc + (b.totalCopies || 0), 0);
  const activeLoans = (state.transactions || []).filter(
    (tx) => tx.status === 'ISSUED' || tx.status === 'RENEWED' || tx.status === 'OVERDUE'
  );
  const overdueLoans = activeLoans.filter((tx) => tx.status === 'OVERDUE');
  const activePatronsInLibrary = (state.attendanceRecords || []).filter((r) => r.status === 'IN_LIBRARY').length;
  const pendingApprovals = (state.members || []).filter((m) => m.status === 'PENDING_APPROVAL').length;
  const pendingNoDue = (state.members || []).filter((m) => (m as any).noDueStatus === 'PENDING').length;

  // Recent transactions
  const recentTransactions = useMemo(() => {
    return (state.transactions || []).slice(-6).reverse();
  }, [state.transactions]);

  // Quick lookup search
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return null;
    const q = searchQuery.toLowerCase().trim();
    const matchedBooks = state.books.filter(
      (b) =>
        b.title.toLowerCase().includes(q) ||
        b.isbn?.toLowerCase().includes(q) ||
        ((b as any).author || b.authorId || '').toLowerCase().includes(q) ||
        (b.copies || []).some((c) => c.barcode?.toLowerCase().includes(q) || c.accessionNo?.toLowerCase().includes(q))
    ).slice(0, 4);

    const matchedMembers = state.members.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q) ||
        m.memberCardNo?.toLowerCase().includes(q) ||
        m.rollNo?.toLowerCase().includes(q)
    ).slice(0, 4);

    return { books: matchedBooks, members: matchedMembers };
  }, [searchQuery, state.books, state.members]);

  return (
    <div className="space-y-6 sm:space-y-8 max-w-[1720px] 2xl:max-w-[1920px] mx-auto pb-12">
      {/* 1. Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 border border-slate-800 text-white shadow-2xl p-6 sm:p-8">
        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 text-[10.5px] font-extrabold uppercase tracking-wider bg-blue-500/20 text-blue-300 px-3 py-1 rounded-full border border-blue-400/30">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Library Operations & Circulation Desk</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold font-poppins text-white tracking-tight">
              Welcome, {staffName}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300">
              Counter circulation, patron check-in monitoring, and daily desk operations hub.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              to="/admin/issue-books"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-500/20 transition-all"
            >
              <ScanBarcode className="w-4 h-4" />
              <span>Issue Book</span>
            </Link>
            <Link
              to="/admin/return-books"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-500/20 transition-all"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Return Book</span>
            </Link>
            <Link
              to="/admin/attendance"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/20 backdrop-blur-md transition-all"
            >
              <UserCheck className="w-4 h-4 text-emerald-300" />
              <span>Door Attendance Desk</span>
            </Link>
          </div>
        </div>
      </div>

      {/* 2. Operations Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
        {/* Live Active Patrons in Library */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold uppercase text-slate-400 tracking-wider">Patrons Inside</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-poppins">{activePatronsInLibrary}</div>
          <p className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Live occupancy tracking
          </p>
        </div>

        {/* Active Circulating Loans */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold uppercase text-slate-400 tracking-wider">Active Loans</span>
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-poppins">{activeLoans.length}</div>
          <p className="text-[11px] text-slate-500">Books currently issued to members</p>
        </div>

        {/* Overdue Returns */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold uppercase text-slate-400 tracking-wider">Overdue Items</span>
            <div className="p-2 rounded-xl bg-rose-50 text-rose-600 border border-rose-100">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-poppins">{overdueLoans.length}</div>
          <p className="text-[11px] text-rose-600 font-medium">Items past scheduled due date</p>
        </div>

        {/* Pending Member Approvals */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold uppercase text-slate-400 tracking-wider">Pending Registrations</span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600 border border-amber-100">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-poppins">{pendingApprovals}</div>
          <p className="text-[11px] text-amber-700 font-medium">Awaiting verification & activation</p>
        </div>
      </div>

      {/* 3. Fast Circulation Quick Desk Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
        <Link
          to="/admin/issue-books"
          className="group p-6 rounded-3xl bg-white border border-slate-200 shadow-2xs hover:shadow-md hover:border-blue-300 transition-all flex items-start gap-4"
        >
          <div className="p-3 rounded-2xl bg-blue-50 text-blue-600 border border-blue-100 group-hover:scale-105 transition-transform">
            <ScanBarcode className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="font-bold text-slate-900 text-sm group-hover:text-blue-600 transition-colors">Issue Books Desk</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Scan member smart cards and book accession barcodes for instant lending.
            </p>
          </div>
        </Link>

        <Link
          to="/admin/return-books"
          className="group p-6 rounded-3xl bg-white border border-slate-200 shadow-2xs hover:shadow-md hover:border-indigo-300 transition-all flex items-start gap-4"
        >
          <div className="p-3 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100 group-hover:scale-105 transition-transform">
            <RotateCcw className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="font-bold text-slate-900 text-sm group-hover:text-indigo-600 transition-colors">Return & Check-in</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Scan returned book barcodes, compute automatic overdue fines, and return copies to inventory.
            </p>
          </div>
        </Link>

        <Link
          to="/admin/renew-books"
          className="group p-6 rounded-3xl bg-white border border-slate-200 shadow-2xs hover:shadow-md hover:border-emerald-300 transition-all flex items-start gap-4"
        >
          <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 group-hover:scale-105 transition-transform">
            <RefreshCw className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="font-bold text-slate-900 text-sm group-hover:text-emerald-600 transition-colors">Extend Loan Duration</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Extend due dates for student, faculty, and research scholar borrowings.
            </p>
          </div>
        </Link>
      </div>

      {/* 4. Quick Barcode & Member Lookup */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xs p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h3 className="font-bold text-base text-slate-900 font-poppins">Quick Catalog & Member Search</h3>
            <p className="text-xs text-slate-500">Search by Title, ISBN, Barcode, Member ID or Email</p>
          </div>
          <div className="relative max-w-sm w-full">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Type barcode, ID, or title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>
        </div>

        {searchResults && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            {/* Matched Books */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
              <h4 className="font-bold text-xs uppercase text-slate-400 tracking-wider">Catalog Matches</h4>
              {searchResults.books.length === 0 ? (
                <p className="text-xs text-slate-500">No books found matching query.</p>
              ) : (
                <div className="space-y-2">
                  {searchResults.books.map((b) => (
                    <div key={b.id} className="p-2.5 rounded-xl bg-white border border-slate-200/60 text-xs space-y-0.5">
                      <div className="font-bold text-slate-900">{b.title}</div>
                      <div className="text-slate-500 text-[11px]">{(b as any).author || b.authorId} • ISBN: {b.isbn}</div>
                      <div className="text-[10.5px] text-blue-600 font-semibold">Available: {b.availableCopies} of {b.totalCopies}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Matched Members */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
              <h4 className="font-bold text-xs uppercase text-slate-400 tracking-wider">Member Matches</h4>
              {searchResults.members.length === 0 ? (
                <p className="text-xs text-slate-500">No registered members found matching query.</p>
              ) : (
                <div className="space-y-2">
                  {searchResults.members.map((m) => (
                    <div key={m.id} className="p-2.5 rounded-xl bg-white border border-slate-200/60 text-xs space-y-0.5">
                      <div className="font-bold text-slate-900">{m.name} ({m.role})</div>
                      <div className="text-slate-500 text-[11px] font-mono">{m.memberCardNo} • {m.email}</div>
                      <div className="text-[10.5px] text-emerald-600 font-semibold">Status: {m.status}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 5. Live Desk Activity Stream */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 font-poppins">Recent Circulation Desk Activity</h3>
            <p className="text-xs text-slate-500">Live transactions recorded across circulation counters</p>
          </div>
          <Link
            to="/admin/borrow-history"
            className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
          >
            <span>Full History</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {recentTransactions.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs font-semibold">
            No circulation transactions recorded yet today.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-100">
                <tr>
                  <th className="p-4">Book Title</th>
                  <th className="p-4">Member Name</th>
                  <th className="p-4">Card ID</th>
                  <th className="p-4">Action Date</th>
                  <th className="p-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {recentTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50">
                    <td className="p-4 font-bold text-slate-900">{tx.bookTitle}</td>
                    <td className="p-4 text-slate-700">{tx.memberName}</td>
                    <td className="p-4 font-mono text-slate-500">{tx.memberCardNo}</td>
                    <td className="p-4 text-slate-500">{tx.issueDate}</td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        tx.status === 'ISSUED' ? 'bg-blue-100 text-blue-800' : tx.status === 'RETURNED' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {tx.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
