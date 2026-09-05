import React, { useState, useEffect, useMemo } from 'react';
import {
  Bell,
  AlertTriangle,
  CheckCircle,
  Clock,
  IndianRupee,
  BookOpen,
  Bookmark,
  ShieldCheck,
  Search,
  ArrowRight,
  Sparkles,
  Filter,
  Send,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { libraryStore, formatOnlyTimeInBracket, getMemberPendingFines, isNoticeReadForUser } from '../services/libraryStore.service';
import { Link } from 'react-router-dom';
import SendNotificationModal from '../components/common/SendNotificationModal';

interface LiveNotification {
  id: string;
  type: 'FINE' | 'OVERDUE' | 'EXTENSION' | 'RESERVATION' | 'NO_DUE' | 'CIRCULAR';
  title: string;
  description: string;
  timestamp: string;
  urgency: 'HIGH' | 'MEDIUM' | 'INFO';
  actionUrl?: string;
  actionText?: string;
  sender?: string;
}

export default function Notifications() {
  const { user } = useAuth();
  const [state, setState] = useState(libraryStore.snapshot);
  const [filterType, setFilterType] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSendModalOpen, setIsSendModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const isAdminOrStaff = user?.role === 'ADMIN' || user?.role === 'STAFF';

  useEffect(() => {
    const sub = libraryStore.getObservable().subscribe(setState);
    return () => sub.unsubscribe();
  }, []);

  const userEmail = user?.email?.toLowerCase() || '';
  const userName = user?.name?.toLowerCase() || '';
  const userRole = user?.role || 'STUDENT';

  // Find user member profile
  const memberProfile =
    state.members.find((m) => user?.email && m.email.toLowerCase() === user.email.toLowerCase()) ||
    state.members.find((m) => user?.id && m.id === user.id) ||
    state.members.find((m) => user?.name && m.name.toLowerCase() === user.name.toLowerCase()) ||
    state.members[0];

  const mId = memberProfile?.id;
  const mCard = memberProfile?.memberCardNo?.toLowerCase();

  // Dynamically compile live personalized notifications
  const liveNotifications = useMemo(() => {
    const list: LiveNotification[] = [];

    // 1. Pending Fine Balance Alert
    const pendingFineVal = getMemberPendingFines(mId || user?.email || '', state);
    if (pendingFineVal > 0) {
      list.push({
        id: 'notif-pending-fine',
        type: 'FINE',
        title: 'Outstanding Library Dues Pending Settlement',
        description: `Your account has an accumulated fine balance of ₹${pendingFineVal.toFixed(2)} for late book returns. Please settle your dues to maintain active borrowing privileges.`,
        timestamp: 'Active Balance',
        urgency: 'HIGH',
        actionUrl: '/fines',
        actionText: 'View Fine Details & Pay',
        sender: 'Accounts & Circulation Desk',
      });
    }

    // 2. Overdue Books
    const overdueLoans = (state.transactions || []).filter((t) => {
      const isMyTx = (mId && t.memberId === mId) || (mCard && t.memberCardNo?.toLowerCase() === mCard) || (userName && t.memberName.toLowerCase() === userName);
      return isMyTx && (t.status === 'OVERDUE' || (t.status === 'ISSUED' && new Date(t.dueDate).getTime() < Date.now()));
    });

    overdueLoans.forEach((tx) => {
      list.push({
        id: `notif-overdue-${tx.id}`,
        type: 'OVERDUE',
        title: `Overdue Book Notice: "${tx.bookTitle}"`,
        description: `This volume was due for return on ${formatOnlyTimeInBracket(tx.dueDate)}. Accruing late return fine: ₹${(state.config?.fineRatePerDay || 5).toFixed(2)}/day. Please return it to the circulation counter or request an extension.`,
        timestamp: `Due: ${tx.dueDate}`,
        urgency: 'HIGH',
        actionUrl: userRole === 'FACULTY' ? '/faculty/dashboard' : '/student/dashboard',
        actionText: 'Request Return Extension',
        sender: 'Circulation Desk',
      });
    });

    // 3. Extension Requests
    const myExtensions = (state.extensionRequests || []).filter((r) => {
      return (mId && r.memberId === mId) || (userName && r.memberName?.toLowerCase() === userName);
    });

    myExtensions.forEach((ext) => {
      list.push({
        id: `notif-ext-${ext.id}`,
        type: 'EXTENSION',
        title: `Book Extension Request: ${ext.status === 'APPROVED' ? 'Approved (+14 Days)' : ext.status === 'REJECTED' ? 'Declined by Admin' : 'Under Review'}`,
        description: `Your renewal request for "${ext.bookTitle}" is currently marked as ${ext.status}. ${ext.adminNotes ? `Note: ${ext.adminNotes}` : ''}`,
        timestamp: ext.requestedDate,
        urgency: ext.status === 'APPROVED' ? 'INFO' : ext.status === 'REJECTED' ? 'HIGH' : 'MEDIUM',
        actionUrl: userRole === 'FACULTY' ? '/faculty/dashboard' : '/student/dashboard',
        actionText: 'View Borrowing Status',
        sender: 'Head Librarian',
      });
    });

    // 4. Book Holds / Reservations
    const myReservations = (state.reservations || []).filter((r) => {
      return (mId && r.memberId === mId) || (userName && r.memberName?.toLowerCase() === userName);
    });

    myReservations.forEach((res) => {
      list.push({
        id: `notif-res-${res.id}`,
        type: 'RESERVATION',
        title: `Book Reservation: "${res.bookTitle}"`,
        description: res.status === 'APPROVED'
          ? `Your reserved copy is waiting at the counter! Collect it before ${res.expiryDate || 'the expiry window'}.`
          : `You are at Queue Position #${res.queuePosition} in the waitlist. We will notify you once a copy is returned.`,
        timestamp: res.requestDate,
        urgency: res.status === 'APPROVED' ? 'HIGH' : 'MEDIUM',
        actionUrl: '/catalog',
        actionText: 'View Catalog Listing',
        sender: 'Automated Hold Queue',
      });
    });

    // 5. No Due Clearance Applications
    const myNoDueApp = (state.noDueApplications || []).find((a) => {
      return (mId && a.studentId === mId) || (mCard && a.libraryMembershipId?.toLowerCase() === mCard);
    });

    if (myNoDueApp) {
      list.push({
        id: `notif-nodue-${myNoDueApp.id}`,
        type: 'NO_DUE',
        title: `Institutional No Due Clearance: ${myNoDueApp.status === 'APPROVED' ? 'Certificate Issued' : myNoDueApp.status === 'REJECTED' ? 'Action Required' : 'Under Verification'}`,
        description: myNoDueApp.status === 'APPROVED'
          ? `Your official digital No Due Clearance Certificate #${myNoDueApp.certificateNo} is ready for download and verification.`
          : `Clearance request for purpose: "${myNoDueApp.purpose.replace(/_/g, ' ')}" is currently ${myNoDueApp.status.replace(/_/g, ' ')}.`,
        timestamp: myNoDueApp.applicationDate,
        urgency: myNoDueApp.status === 'APPROVED' ? 'INFO' : myNoDueApp.status === 'REJECTED' ? 'HIGH' : 'MEDIUM',
        actionUrl: '/no-due',
        actionText: 'View Certificate / Application',
        sender: 'Institutional Clearance Board',
      });
    }

    // 6. Broadcast Notices & Circulars from Library Store
    (state.notices || []).forEach((notice) => {
      const matchMemberId = notice.recipientMemberId && notice.recipientMemberId === mId;
      const matchEmail = notice.recipientEmail && notice.recipientEmail.toLowerCase() === userEmail;
      const matchName = notice.recipientName && notice.recipientName.toLowerCase() === userName;
      const matchAudience =
        !notice.targetAudience ||
        notice.targetAudience === 'ALL' ||
        (notice.targetAudience === 'STUDENTS' && userRole === 'STUDENT') ||
        (notice.targetAudience === 'FACULTY' && userRole === 'FACULTY') ||
        (notice.targetAudience === 'ADMIN' && (userRole === 'ADMIN' || userRole === 'STAFF'));

      if (matchMemberId || matchEmail || matchName || matchAudience) {
        let nType: 'FINE' | 'OVERDUE' | 'EXTENSION' | 'RESERVATION' | 'NO_DUE' | 'CIRCULAR' = 'CIRCULAR';
        let actionUrl: string | undefined = undefined;
        let actionText: string | undefined = undefined;

        if (notice.category === 'DUE_REMINDER') {
          nType = 'OVERDUE';
          actionUrl = userRole === 'FACULTY' ? '/faculty/dashboard' : '/student/dashboard';
          actionText = 'View Borrowed Books';
        } else if (notice.category === 'OVERDUE_WARNING') {
          nType = 'OVERDUE';
          actionUrl = '/fines';
          actionText = 'View Fine & Return Desk';
        } else if (notice.category === 'FINE_PAYMENT') {
          nType = 'FINE';
          actionUrl = '/fines';
          actionText = 'Settle Dues Online';
        }

        list.push({
          id: notice.id,
          type: nType,
          title: notice.title,
          description: notice.content,
          timestamp: notice.createdDate,
          urgency: notice.isUrgent ? 'HIGH' : 'INFO',
          sender: notice.senderName || 'Central Library Circulation Desk',
          actionUrl,
          actionText,
        });
      }
    });

    return list;
  }, [state, mId, mCard, userName, userEmail, userRole]);

  const unreadAlerts = useMemo(() => {
    return liveNotifications.filter((n) => !isNoticeReadForUser(n.id, user, state));
  }, [liveNotifications, user, state]);

  const unreadCount = unreadAlerts.length;

  // Filtered list
  const filteredList = useMemo(() => {
    return liveNotifications.filter((n) => {
      if (filterType !== 'ALL' && n.type !== filterType) return false;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || n.title.toLowerCase().includes(q) || n.description.toLowerCase().includes(q) || n.sender?.toLowerCase().includes(q);
      return matchesSearch;
    });
  }, [liveNotifications, filterType, searchQuery]);

  const urgentCount = liveNotifications.filter((n) => n.urgency === 'HIGH').length;

  return (
    <div className="space-y-8 animate-fadeIn pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-950 via-indigo-950 to-blue-900 rounded-3xl p-8 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="space-y-2 relative z-10">
          <div className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-widest text-blue-300 bg-white/10 px-3.5 py-1.5 rounded-full backdrop-blur-xs">
            <Sparkles className="h-4 w-4" /> Live Notification Desk
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold font-poppins tracking-tight">
            Library Notifications & Alerts
          </h1>
          <p className="text-slate-300 text-xs sm:text-sm md:text-base max-w-2xl font-medium leading-relaxed">
            Real-time personalized circulars, overdue warnings, fine assessments, extension confirmations, and institutional clearance updates.
          </p>
        </div>

        <div className="relative z-10 flex flex-wrap items-center gap-3 shrink-0">
          {isAdminOrStaff && (
            <button
              type="button"
              onClick={() => setIsSendModalOpen(true)}
              className="px-4 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs shadow-lg shadow-blue-500/30 flex items-center gap-2 transition-all cursor-pointer active:scale-95 border border-blue-400/40"
            >
              <Send className="w-4 h-4" />
              <span>Send Notice / Reminder</span>
            </button>
          )}

          <div className="bg-white/10 backdrop-blur-md px-4 py-3 rounded-2xl border border-white/20 text-center">
            <span className="text-[10px] uppercase font-bold text-slate-300 tracking-wider">Total Alerts</span>
            <p className="text-2xl font-black font-poppins text-white">{liveNotifications.length}</p>
          </div>

          {unreadCount > 0 && (
            <div className="bg-blue-500/20 border border-blue-400/40 px-4 py-3 rounded-2xl text-center">
              <span className="text-[10px] uppercase font-bold text-blue-300 tracking-wider">Unread</span>
              <p className="text-2xl font-black font-poppins text-blue-300">{unreadCount}</p>
            </div>
          )}

          {urgentCount > 0 && (
            <div className="bg-rose-500/20 border border-rose-500/40 px-4 py-3 rounded-2xl text-center">
              <span className="text-[10px] uppercase font-bold text-rose-300 tracking-wider">High Priority</span>
              <p className="text-2xl font-black font-poppins text-rose-400">{urgentCount}</p>
            </div>
          )}
        </div>
      </div>

      {toastMessage && (
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-semibold shadow-xs animate-fadeIn">
          <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200 shadow-xs space-y-4">
        {/* Search Input */}
        <div className="relative w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search alerts by title, keyword, or issuer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-10 py-3 rounded-2xl border border-slate-200 bg-slate-50 text-xs sm:text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-200/60"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none pt-0.5">
          {[
            { id: 'ALL', label: 'All Alerts', count: liveNotifications.length },
            { id: 'FINE', label: 'Fines & Dues', count: liveNotifications.filter((n) => n.type === 'FINE').length },
            { id: 'OVERDUE', label: 'Overdue Books', count: liveNotifications.filter((n) => n.type === 'OVERDUE').length },
            { id: 'EXTENSION', label: 'Extensions', count: liveNotifications.filter((n) => n.type === 'EXTENSION').length },
            { id: 'RESERVATION', label: 'Reservations', count: liveNotifications.filter((n) => n.type === 'RESERVATION').length },
            { id: 'NO_DUE', label: 'No Due Clearance', count: liveNotifications.filter((n) => n.type === 'NO_DUE').length },
            { id: 'CIRCULAR', label: 'Circulars', count: liveNotifications.filter((n) => n.type === 'CIRCULAR').length },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterType(tab.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                filterType === tab.id
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-200'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                filterType === tab.id ? 'bg-white/20 text-white' : 'bg-slate-200/80 text-slate-600'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Notifications List */}
      <div className="space-y-4">
        {filteredList.length > 0 ? (
          filteredList.map((notif) => {
            const isUrgent = notif.urgency === 'HIGH';
            const isRead = isNoticeReadForUser(notif.id, user, state);

            return (
              <div
                key={notif.id}
                onClick={() => {
                  if (!isRead) {
                    libraryStore.markNoticeAsRead(notif.id, user);
                  }
                }}
                className={`p-6 rounded-3xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-5 group shadow-xs cursor-pointer ${
                  !isRead
                    ? isUrgent
                      ? 'bg-rose-50/90 border-rose-300 shadow-sm ring-1 ring-rose-500/20'
                      : notif.type === 'FINE'
                      ? 'bg-amber-50/80 border-amber-300 shadow-sm'
                      : 'bg-blue-50/60 border-blue-200 shadow-sm ring-1 ring-blue-500/10'
                    : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-md opacity-85 hover:opacity-100'
                }`}
              >
                <div className="flex items-start gap-4 min-w-0 flex-1">
                  <div
                    className={`p-3 rounded-2xl shrink-0 mt-0.5 shadow-2xs ${
                      isUrgent
                        ? 'bg-rose-600 text-white'
                        : notif.type === 'FINE'
                        ? 'bg-amber-100 text-amber-800'
                        : notif.type === 'EXTENSION'
                        ? 'bg-purple-100 text-purple-700'
                        : notif.type === 'NO_DUE'
                        ? 'bg-emerald-100 text-emerald-800'
                        : notif.type === 'RESERVATION'
                        ? 'bg-indigo-100 text-indigo-700'
                        : 'bg-blue-100 text-blue-700'
                    }`}
                  >
                    {notif.type === 'FINE' && <IndianRupee className="w-5 h-5" />}
                    {notif.type === 'OVERDUE' && <AlertTriangle className="w-5 h-5" />}
                    {notif.type === 'EXTENSION' && <Clock className="w-5 h-5" />}
                    {notif.type === 'RESERVATION' && <Bookmark className="w-5 h-5" />}
                    {notif.type === 'NO_DUE' && <ShieldCheck className="w-5 h-5" />}
                    {notif.type === 'CIRCULAR' && <Bell className="w-5 h-5" />}
                  </div>

                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full ${
                          isUrgent
                            ? 'bg-rose-600 text-white'
                            : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {notif.type.replace(/_/g, ' ')}
                      </span>

                      {!isRead ? (
                        <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-blue-600 text-white animate-pulse">
                          NEW
                        </span>
                      ) : (
                        <span className="text-[10px] font-medium text-slate-400">
                          Seen
                        </span>
                      )}

                      <span className="text-[11px] font-mono font-semibold text-slate-400">
                        {notif.timestamp}
                      </span>
                    </div>

                    <h3 className={`text-sm sm:text-base leading-snug transition-colors ${
                      !isRead ? 'font-black font-poppins text-slate-950' : 'font-normal font-sans text-slate-600'
                    }`}>
                      {notif.title}
                    </h3>
                    <p className={`text-xs leading-relaxed max-w-3xl transition-colors ${
                      !isRead ? 'text-slate-700 font-medium' : 'text-slate-500 font-normal'
                    }`}>
                      {notif.description}
                    </p>

                    <div className="pt-1.5 flex items-center gap-3 text-[11px] text-slate-400 font-medium">
                      <span>Issued by: <strong className={!isRead ? 'text-slate-800 font-bold' : 'text-slate-600 font-normal'}>{notif.sender || 'Central Library Desk'}</strong></span>
                    </div>
                  </div>
                </div>

                {notif.actionUrl && (
                  <div className="shrink-0 pt-2 md:pt-0 self-end md:self-center">
                    <Link
                      to={notif.actionUrl}
                      onClick={(e) => {
                        e.stopPropagation();
                        libraryStore.markNoticeAsRead(notif.id, user);
                      }}
                      className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-sm ${
                        isUrgent
                          ? 'bg-rose-700 hover:bg-rose-800 text-white shadow-rose-200'
                          : 'bg-slate-900 hover:bg-blue-600 text-white shadow-slate-200'
                      }`}
                    >
                      <span>{notif.actionText || 'Take Action'}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-xs space-y-3">
            <div className="p-4 bg-emerald-50 text-emerald-600 rounded-full w-16 h-16 mx-auto flex items-center justify-center">
              <CheckCircle className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold font-poppins text-slate-900">All Caught Up!</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              You have no notifications matching this filter. Active book notices, dues, and announcements will appear here automatically.
            </p>
          </div>
        )}
      </div>

      {isSendModalOpen && (
        <SendNotificationModal
          isOpen={isSendModalOpen}
          onClose={() => setIsSendModalOpen(false)}
          onSuccess={(msg) => {
            setToastMessage(msg);
            setTimeout(() => setToastMessage(null), 4000);
          }}
        />
      )}
    </div>
  );
}
