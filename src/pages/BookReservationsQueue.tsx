import React, { useState, useEffect, useMemo } from 'react';
import {
  Bookmark,
  BookOpen,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Search,
  X,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Info,
  Calendar,
  Layers,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { libraryStore, formatOnlyTimeInBracket } from '../services/libraryStore.service';
import { Reservation, MemberProfile } from '../types/library';
import { Link } from 'react-router-dom';

export default function BookReservationsQueue() {
  const { user } = useAuth();
  const [state, setState] = useState(libraryStore.snapshot);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'WAITLISTED' | 'READY_FOR_PICKUP' | 'EXPIRED' | 'CANCELLED'>('ALL');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

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

  // Filter reservations for current user
  const myReservations: Reservation[] = useMemo(() => {
    const all = state.reservations || [];
    return all.filter((r) => {
      const matchId = Boolean(memberId && r.memberId === memberId);
      const matchName = Boolean(memberName && r.memberName.toLowerCase() === memberName.toLowerCase());
      const matchCard = Boolean(memberCardNo && r.memberCardNo?.toLowerCase() === memberCardNo);
      return matchId || matchName || matchCard;
    });
  }, [state.reservations, memberId, memberName, memberCardNo]);

  // Filtered by status and search
  const filteredReservations = useMemo(() => {
    return myReservations.filter((r) => {
      if (statusFilter !== 'ALL' && (r.status as any) !== statusFilter) return false;
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        return (
          r.bookTitle.toLowerCase().includes(q) ||
          r.bookId.toLowerCase().includes(q) ||
          (r.id && r.id.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [myReservations, statusFilter, searchTerm]);

  // Key stats
  const readyCount = myReservations.filter((r) => (r.status as any) === 'READY_FOR_PICKUP').length;
  const waitlistedCount = myReservations.filter((r) => (r.status as any) === 'WAITLISTED' || r.status === 'PENDING').length;
  const completedCount = myReservations.filter((r) => r.status === 'FULFILLED').length;

  const handleCancelHold = (reservationId: string) => {
    libraryStore.cancelReservation(reservationId);
    triggerToast('Reservation hold cancelled successfully.');
  };

  return (
    <div className="space-y-6 pb-12 animate-fadeIn">
      {/* Top Banner Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-950 via-slate-900 to-blue-950 p-6 md:p-8 text-white shadow-xl border border-indigo-800/30">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-80 h-80 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-80 h-80 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-[11px] font-bold uppercase tracking-wider">
              <Bookmark className="w-3.5 h-3.5" /> Book Holds & Allocation Desk
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold font-poppins tracking-tight text-white">
              My Reservations & Waitlist Queue
            </h1>
            <p className="text-slate-300 text-xs md:text-sm leading-relaxed">
              Track priority reservations for high-demand checked-out books. When a copy is returned to the counter, your hold moves to the front of the queue automatically.
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap shrink-0">
            <Link
              to="/catalog"
              className="px-5 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-blue-900/40 transition-all flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <BookOpen className="w-4 h-4" />
              <span>Browse Catalog & Reserve</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Toast Alert */}
      {toastMessage && (
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold shadow-xs animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 3 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-indigo-100 shadow-xs flex items-center gap-4">
          <div className="p-3.5 rounded-2xl bg-indigo-50 text-indigo-700 shrink-0">
            <Bookmark className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Active Waitlist Holds</p>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-2xl font-extrabold font-poppins text-slate-900">{waitlistedCount}</span>
              <span className="text-xs font-semibold text-slate-500">In Queue</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-emerald-100 shadow-xs flex items-center gap-4">
          <div className="p-3.5 rounded-2xl bg-emerald-50 text-emerald-700 shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Ready For Counter Pickup</p>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-2xl font-extrabold font-poppins text-emerald-700">{readyCount}</span>
              <span className="text-xs font-semibold text-emerald-600">Reserved For You</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="p-3.5 rounded-2xl bg-blue-50 text-blue-700 shrink-0">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Fulfilled & Issued</p>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-2xl font-extrabold font-poppins text-slate-900">{completedCount}</span>
              <span className="text-xs font-semibold text-slate-500">Past Holds</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Reservation Ledger Table Container */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden p-6 space-y-5">
        {/* Search & Filter Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap pb-1 md:pb-0 scrollbar-none">
            {(
              [
                { id: 'ALL', label: `All Holds (${myReservations.length})` },
                { id: 'READY_FOR_PICKUP', label: `Ready for Pickup (${readyCount})` },
                { id: 'WAITLISTED', label: `Waitlisted (${waitlistedCount})` },
                { id: 'EXPIRED', label: 'Expired / Cancelled' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id as any)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  statusFilter === tab.id
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/60'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by book title or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
            />
          </div>
        </div>

        {/* Holds Table */}
        {filteredReservations.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50/80 text-slate-700 font-bold uppercase tracking-wider border-b border-slate-100">
                <tr>
                  <th className="p-4 rounded-l-2xl">Book Title & ID</th>
                  <th className="p-4">Reserved On</th>
                  <th className="p-4">Hold Expiry Window</th>
                  <th className="p-4">Queue Position & Status</th>
                  <th className="p-4 text-right rounded-r-2xl">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredReservations.map((res) => {
                  const isReady = res.status === 'READY_FOR_PICKUP' as any;
                  const isWaitlisted = res.status === 'PENDING' || (res.status as any) === 'WAITLISTED';
                  const isFulfilled = res.status === 'FULFILLED';
                  const isCancelled = res.status === 'CANCELLED' || res.status === 'EXPIRED';

                  return (
                    <tr key={res.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-4 font-semibold text-slate-900">
                        <p className="font-bold text-slate-900 text-sm">{res.bookTitle}</p>
                        <p className="font-mono text-[11px] text-slate-400 mt-0.5">Book Ref: {res.bookId}</p>
                      </td>
                      <td className="p-4 font-mono text-slate-700">{formatOnlyTimeInBracket(res.requestDate)}</td>
                      <td className="p-4 font-mono">
                        {res.expiryDate ? (
                          <span className="font-bold text-rose-700">{formatOnlyTimeInBracket(res.expiryDate)}</span>
                        ) : (
                          <span className="text-slate-400 font-sans">3 days once copy returned</span>
                        )}
                      </td>
                      <td className="p-4">
                        <span
                          className={`px-3 py-1 rounded-full text-[10.5px] font-extrabold uppercase inline-flex items-center gap-1.5 ${
                            isReady
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 animate-pulse'
                              : isWaitlisted
                              ? 'bg-amber-100 text-amber-800 border border-amber-300'
                              : isFulfilled
                              ? 'bg-blue-100 text-blue-800 border border-blue-300'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {isReady ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              Ready for Pickup
                            </>
                          ) : isWaitlisted ? (
                            <>
                              <Clock className="w-3.5 h-3.5 text-amber-600" />
                              Waitlist Pos #{res.queuePosition || 1}
                            </>
                          ) : isFulfilled ? (
                            'Fulfilled / Issued'
                          ) : (
                            'Cancelled / Expired'
                          )}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        {isWaitlisted || isReady ? (
                          <button
                            type="button"
                            onClick={() => handleCancelHold(res.id)}
                            className="px-3 py-1.5 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 font-bold text-xs transition-all cursor-pointer shadow-2xs active:scale-95"
                          >
                            Cancel Hold
                          </button>
                        ) : (
                          <span className="text-slate-400 text-[11px] font-semibold">No Action</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center text-slate-400 space-y-3 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
              <Bookmark className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-bold text-slate-800">No Reservations Found</p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                When titles you want to borrow are fully checked out in the catalog, click "Reserve Book" to queue your hold.
              </p>
            </div>
            <Link
              to="/catalog"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-700 shadow-sm cursor-pointer"
            >
              Explore Catalog &rarr;
            </Link>
          </div>
        )}
      </div>

      {/* Reservation Guidelines & Policy Card */}
      <div className="p-6 rounded-3xl bg-indigo-50/50 border border-indigo-100/90 text-xs text-slate-700 space-y-3">
        <div className="flex items-center gap-2 text-indigo-900 font-bold text-sm">
          <Info className="w-4 h-4 text-indigo-600" />
          <span>Library Book Reservation & Hold Allocation Guidelines</span>
        </div>
        <ul className="grid grid-cols-1 md:grid-cols-3 gap-3 text-slate-600">
          <li className="p-3 bg-white rounded-2xl border border-indigo-100/80 shadow-2xs">
            <strong className="block text-slate-900 mb-0.5">1. Automatic Queue Advance</strong>
            When a checked-out book is returned to the circulation counter, the system automatically allocates the volume to Pos #1.
          </li>
          <li className="p-3 bg-white rounded-2xl border border-indigo-100/80 shadow-2xs">
            <strong className="block text-slate-900 mb-0.5">2. 72-Hour Pickup Window</strong>
            Once marked "Ready for Pickup", collect the volume at the circulation counter within 3 working days before it moves to the next member.
          </li>
          <li className="p-3 bg-white rounded-2xl border border-indigo-100/80 shadow-2xs">
            <strong className="block text-slate-900 mb-0.5">3. Notification Alerts</strong>
            You will receive live portal and email alerts as soon as your reserved volume is ready at the circulation desk.
          </li>
        </ul>
      </div>
    </div>
  );
}
