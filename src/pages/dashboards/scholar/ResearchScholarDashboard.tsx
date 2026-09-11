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
  CreditCard,
  RotateCw,
  Printer,
  Barcode,
  X,
  GraduationCap,
  FlaskConical,
  FileText,
  Download,
  Building,
  Check,
  ExternalLink,
} from 'lucide-react';
import { libraryStore, formatOnlyTimeInBracket, getMemberPendingFines, getTransactionFineAmount } from '../../../services/libraryStore.service';
import { useAuth } from '../../../context/AuthContext';
import { Link, useSearchParams } from 'react-router-dom';
import { IssueTransaction } from '../../../types/library';
import NoDueCertificateModal from '../../../components/common/NoDueCertificateModal';
import { generateBarcodeSvgString, generateQrSvgString, printMemberLibraryCard } from '../../../utils/barcodeQrGenerator';

export default function ResearchScholarDashboard() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [state, setState] = useState(libraryStore.snapshot);
  const [activeTab, setActiveTab] = useState<'loans' | 'thesis' | 'reservations' | 'extensions' | 'procurement' | 'history'>('loans');
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isNoDueModalOpen, setIsNoDueModalOpen] = useState(false);
  const [isLibraryPassModalOpen, setIsLibraryPassModalOpen] = useState(false);
  const [passSide, setPassSide] = useState<'front' | 'back'>('front');

  // Procurement request modal
  const [isProcurementModalOpen, setIsProcurementModalOpen] = useState(false);
  const [procurementForm, setProcurementForm] = useState({
    bookTitle: '',
    authorName: '',
    isbn: '',
    publisherName: '',
    reason: 'Doctoral Dissertation Reference',
  });

  // Time Extension modal
  const [extensionModalTx, setExtensionModalTx] = useState<IssueTransaction | null>(null);
  const [extensionDays, setExtensionDays] = useState(30);
  const [extensionReason, setExtensionReason] = useState('');

  // Sync tab with URL search parameter
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && ['loans', 'thesis', 'reservations', 'extensions', 'procurement', 'history'].includes(tab)) {
      setActiveTab(tab as any);
    }
  }, [searchParams]);

  const handleTabChange = (tab: 'loans' | 'thesis' | 'reservations' | 'extensions' | 'procurement' | 'history') => {
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

  const scholarMember =
    state.members.find((m) => user?.email && m.email.toLowerCase() === user.email.toLowerCase()) ||
    state.members.find((m) => user?.id && m.id === user.id) ||
    state.members.find((m) => user?.name && m.name.toLowerCase() === user.name.toLowerCase()) ||
    state.members.find((m) => m.role === 'RESEARCH_SCHOLAR') || {
      id: 'mem-scholar-1',
      userId: 'scholar-1',
      name: user?.name || 'Alex Vance',
      email: user?.email || 'scholar@college.edu',
      role: 'RESEARCH_SCHOLAR' as const,
      memberCardNo: 'RS-2026-019',
      scholarId: 'RS-2026-019',
      rollNo: 'RS-2026-019',
      department: 'Computer Science & Engineering',
      researchProgram: 'Ph.D. (Doctor of Philosophy) – Regular Full-Time',
      researchSupervisor: 'Dr. Sarah Connor',
      researchArea: 'Artificial Intelligence & Distributed Systems',
      status: 'ACTIVE' as const,
      maxAllowedBooks: 8,
      currentActiveLoans: 0,
      pendingFines: 0,
      registeredDate: '2026-01-10',
      academicBatch: 'Doctoral Research Fellow',
    };

  const scholarDisplayName = user?.name || scholarMember?.name || 'Research Scholar';

  const myAttendanceRecords = (state.attendanceRecords || []).filter((r) => {
    const uEmail = user?.email?.toLowerCase();
    const uName = user?.name?.toLowerCase();
    const mId = scholarMember?.id;
    const mCard = scholarMember?.memberCardNo?.toLowerCase();
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
    const diffMs = Math.max(0, nowClock.getTime() - inT);
    const totalMinutes = Math.floor(diffMs / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    if (hours === 0) return `${mins} min${mins !== 1 ? 's' : ''}`;
    return `${hours} hr${hours !== 1 ? 's' : ''} ${mins} min${mins !== 1 ? 's' : ''}`;
  }, [myActiveAttendance, nowClock]);

  // Active borrow transactions
  const activeLoans = useMemo(() => {
    return (state.transactions || []).filter(
      (tx) =>
        (tx.memberId === scholarMember.id ||
          (tx.memberCardNo && tx.memberCardNo.toLowerCase() === scholarMember.memberCardNo?.toLowerCase())) &&
        (tx.status === 'ISSUED' || tx.status === 'RENEWED' || tx.status === 'OVERDUE')
    );
  }, [state.transactions, scholarMember]);

  // Past transaction history
  const borrowHistory = useMemo(() => {
    return (state.transactions || []).filter(
      (tx) =>
        (tx.memberId === scholarMember.id ||
          (tx.memberCardNo && tx.memberCardNo.toLowerCase() === scholarMember.memberCardNo?.toLowerCase())) &&
        (tx.status === 'RETURNED' || tx.status === 'LOST')
    );
  }, [state.transactions, scholarMember]);

  // Active reservations
  const myReservations = useMemo(() => {
    return (state.reservations || []).filter(
      (r) =>
        r.memberId === scholarMember.id ||
        (r.memberCardNo && r.memberCardNo.toLowerCase() === scholarMember.memberCardNo?.toLowerCase())
    );
  }, [state.reservations, scholarMember]);

  // Extension requests
  const myExtensions = useMemo(() => {
    return (state.extensionRequests || []).filter(
      (ext) =>
        ext.memberId === scholarMember.id ||
        (ext.memberCardNo && ext.memberCardNo.toLowerCase() === scholarMember.memberCardNo?.toLowerCase())
    );
  }, [state.extensionRequests, scholarMember]);

  // Outstanding fines
  const outstandingFines = useMemo(() => {
    return getMemberPendingFines(scholarMember.id, scholarMember.email);
  }, [scholarMember, state.transactions, state.fines]);

  // Submit new book procurement proposal
  const handleProcurementSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!procurementForm.bookTitle.trim()) {
      setAlert({ type: 'error', message: 'Please enter the book or journal monograph title.' });
      return;
    }

    libraryStore.addProcurementRequest({
      bookTitle: procurementForm.bookTitle.trim(),
      authorName: procurementForm.authorName.trim() || 'Not Specified',
      isbn: procurementForm.isbn.trim(),
      publisherName: procurementForm.publisherName.trim(),
      reason: procurementForm.reason.trim() || 'Doctoral Research Reference',
      requestedById: scholarMember.id,
      requestedByName: scholarDisplayName,
      requestedByRole: 'RESEARCH_SCHOLAR',
    });

    setProcurementForm({
      bookTitle: '',
      authorName: '',
      isbn: '',
      publisherName: '',
      reason: 'Doctoral Dissertation Reference',
    });
    setIsProcurementModalOpen(false);
    setAlert({ type: 'success', message: 'Research publication procurement proposal submitted to Library Committee.' });
    setTimeout(() => setAlert(null), 4000);
  };

  // Submit loan extension request
  const handleExtensionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!extensionModalTx) return;

    const res = libraryStore.requestBookExtension(
      extensionModalTx.id,
      scholarMember.id,
      Number(extensionDays),
      extensionReason || 'Doctoral research experiment & manuscript analysis in progress'
    );

    setExtensionModalTx(null);
    setExtensionReason('');
    if (res.success) {
      setAlert({ type: 'success', message: res.message });
    } else {
      setAlert({ type: 'error', message: res.message });
    }
    setTimeout(() => setAlert(null), 4000);
  };

  const barcodeSvg = useMemo(() => {
    return generateBarcodeSvgString(scholarMember.memberCardNo || 'RS-2026-019', {
      height: 48,
      quietZone: 8,
    });
  }, [scholarMember]);

  const qrSvg = useMemo(() => {
    return generateQrSvgString(
      JSON.stringify({
        type: 'UNIVERSITY_LIBRARY_SCHOLAR_CARD',
        id: scholarMember.id,
        name: scholarDisplayName,
        cardNo: scholarMember.memberCardNo,
        role: 'RESEARCH_SCHOLAR',
        program: scholarMember.researchProgram || 'Ph.D.',
      }),
      140
    );
  }, [scholarMember, scholarDisplayName]);

  return (
    <div className="space-y-6 sm:space-y-8 max-w-[1720px] 2xl:max-w-[1920px] mx-auto pb-12">
      {/* 1. Scholar Identity & Research Profile Hero Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-950 via-indigo-950 to-blue-950 border border-indigo-900/40 text-white shadow-2xl p-6 sm:p-8 lg:p-10">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-80 h-80 bg-blue-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="flex items-start sm:items-center gap-4 sm:gap-6">
            <div className="relative">
              <img
                src={scholarMember.avatarUrl || 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80'}
                alt={scholarDisplayName}
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-indigo-400/40 shadow-lg"
              />
              <span className="absolute -bottom-1.5 -right-1.5 p-1 rounded-lg bg-indigo-600 text-white text-[10px] font-bold shadow-md">
                <FlaskConical className="w-3.5 h-3.5" />
              </span>
            </div>

            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10.5px] font-extrabold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 px-3 py-0.5 rounded-full border border-indigo-400/30">
                  Doctoral Scholar Portal
                </span>
                <span className="text-xs text-indigo-200 font-mono font-bold bg-white/10 px-2.5 py-0.5 rounded-lg">
                  {scholarMember.scholarId || scholarMember.memberCardNo || 'RS-2026-019'}
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold font-poppins text-white tracking-tight">
                {scholarDisplayName}
              </h1>
              <p className="text-xs sm:text-sm text-indigo-200/90 font-medium">
                {scholarMember.researchProgram || 'Ph.D. in Computer Science & AI'} • {scholarMember.department || 'Computer Science & Engineering'}
              </p>
              <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-indigo-300">
                <span>Supervisor: <strong className="text-white">{scholarMember.researchSupervisor || 'Dr. Sarah Connor'}</strong></span>
                <span>•</span>
                <span>Loan Privileges: <strong className="text-white">8 Books (60 Days)</strong></span>
              </div>
            </div>
          </div>

          {/* Quick Actions & Pass Trigger */}
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 w-full lg:w-auto">
            <button
              onClick={() => setIsLibraryPassModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
            >
              <CreditCard className="w-4 h-4" />
              <span>Digital Scholar Card</span>
            </button>
            <button
              onClick={() => setIsProcurementModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/20 backdrop-blur-md transition-all cursor-pointer"
            >
              <ShoppingBag className="w-4 h-4 text-indigo-300" />
              <span>Propose Research Book</span>
            </button>
            <button
              onClick={() => setIsNoDueModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/20 backdrop-blur-md transition-all cursor-pointer"
            >
              <Award className="w-4 h-4 text-emerald-300" />
              <span>No Due Clearance</span>
            </button>
          </div>
        </div>
      </div>

      {/* Alert Banner */}
      {alert && (
        <div
          className={`p-4 rounded-2xl flex items-center justify-between text-xs font-bold animate-fadeIn ${
            alert.type === 'success' ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' : 'bg-rose-50 border border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {alert.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
            <span>{alert.message}</span>
          </div>
          <button onClick={() => setAlert(null)} className="p-1 hover:bg-black/5 rounded-lg cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 2. Key Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
        {/* Active Research Loans */}
        <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold uppercase text-slate-400 tracking-wider">Active Loans</span>
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-poppins">{activeLoans.length}</span>
            <span className="text-xs text-slate-500">/ {scholarMember.maxAllowedBooks || 8} Books</span>
          </div>
          <p className="text-[11px] text-slate-500">Doctoral loan duration: 60 days</p>
        </div>

        {/* Reservations */}
        <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold uppercase text-slate-400 tracking-wider">Hold Queue</span>
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
              <Bookmark className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-poppins">{myReservations.length}</span>
            <span className="text-xs text-slate-500">Active</span>
          </div>
          <p className="text-[11px] text-slate-500">Priority hold on issued copies</p>
        </div>

        {/* Pending Fines */}
        <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold uppercase text-slate-400 tracking-wider">Fines & Dues</span>
            <div className="p-2 rounded-xl bg-rose-50 text-rose-600 border border-rose-100">
              <IndianRupee className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-poppins">₹{outstandingFines}</span>
            <span className="text-xs text-slate-500">Pending</span>
          </div>
          <p className="text-[11px] text-slate-500">{outstandingFines === 0 ? 'Account in good standing' : 'Due for return or payment'}</p>
        </div>

        {/* Library Attendance */}
        <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold uppercase text-slate-400 tracking-wider">Research Stay</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-lg sm:text-xl font-extrabold text-slate-900 font-poppins">
              {myActiveAttendance ? 'Checked In' : 'Not In Library'}
            </span>
          </div>
          <p className="text-[11px] text-slate-500">
            {myActiveAttendance ? `Active stay: ${liveStayDurationText}` : 'Scan card at door reader'}
          </p>
        </div>
      </div>

      {/* 3. Navigation Tabs */}
      <div className="border-b border-slate-200 flex items-center gap-2 overflow-x-auto pb-px">
        {[
          { id: 'loans', label: 'Active Borrowings', icon: BookOpen, count: activeLoans.length },
          { id: 'thesis', label: 'Doctoral Dissertations & Vault', icon: GraduationCap },
          { id: 'reservations', label: 'Book Holds Queue', icon: Bookmark, count: myReservations.length },
          { id: 'extensions', label: 'Time Extension Requests', icon: RotateCw, count: myExtensions.length },
          { id: 'procurement', label: 'Book Proposals', icon: ShoppingBag },
          { id: 'history', label: 'Borrow History', icon: History, count: borrowHistory.length },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-3 border-b-2 font-bold text-xs sm:text-sm whitespace-nowrap transition-all cursor-pointer ${
              activeTab === tab.id
                ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50 rounded-t-2xl'
                : 'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            <span>{tab.label}</span>
            {tab.count !== undefined && tab.count > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${activeTab === tab.id ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700'}`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* 4. Tab Content Panels */}
      {/* TAB 1: ACTIVE LOANS */}
      {activeTab === 'loans' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 font-poppins">Currently Borrowed Resources</h2>
              <p className="text-xs text-slate-500">60-day doctoral research loan limit per item</p>
            </div>
            <Link
              to="/catalog"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-50 text-indigo-700 font-bold text-xs hover:bg-indigo-100 transition-colors"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Browse Catalog</span>
            </Link>
          </div>

          {activeLoans.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
                <BookOpen className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-slate-800">No active book loans</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Search the central library holdings and visit the circulation desk to issue research monographs.
              </p>
              <Link
                to="/catalog"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md"
              >
                Search Library Catalog
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-100">
                  <tr>
                    <th className="p-4">Book Details</th>
                    <th className="p-4">Accession / Barcode</th>
                    <th className="p-4">Issue Date</th>
                    <th className="p-4">Due Date</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {activeLoans.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-4">
                        <div className="font-bold text-slate-900 text-sm">{tx.bookTitle}</div>
                        <div className="text-slate-500 text-[11px]">{(tx as any).author || (tx as any).authorName || 'Catalog Reference'}</div>
                      </td>
                      <td className="p-4 font-mono text-slate-600">
                        {tx.accessionNo || tx.bookId}
                      </td>
                      <td className="p-4 text-slate-600">{tx.issueDate}</td>
                      <td className="p-4 font-bold text-slate-900">{tx.dueDate}</td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          tx.status === 'OVERDUE' ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
                        }`}>
                          {tx.status}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => setExtensionModalTx(tx)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-bold text-xs transition-colors cursor-pointer"
                        >
                          <RotateCw className="w-3.5 h-3.5" />
                          <span>Extend Time</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: DOCTORAL & THESIS VAULT */}
      {activeTab === 'thesis' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xs p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 font-poppins">Doctoral Dissertations & Institutional Repositories</h3>
                <p className="text-xs text-slate-500">Access peer-reviewed open access papers, thesis archives, and digital journals</p>
              </div>
              <Link
                to="/digital-resources"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-700 transition-colors shadow-md"
              >
                <span>Digital Library Vault</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div className="p-5 rounded-2xl bg-indigo-50/50 border border-indigo-100 space-y-2">
                <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-sm text-slate-900">Shodhganga National Thesis Portal</h4>
                <p className="text-xs text-slate-600">Search over 400,000 full-text Indian doctoral dissertations and synopses online.</p>
                <a
                  href="https://shodhganga.inflibnet.ac.in"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 pt-1"
                >
                  Access Shodhganga <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              <div className="p-5 rounded-2xl bg-blue-50/50 border border-blue-100 space-y-2">
                <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold">
                  <FileText className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-sm text-slate-900">IEEE Xplore & ACM Digital Library</h4>
                <p className="text-xs text-slate-600">Full institutional subscription active for computer science and engineering transactions.</p>
                <Link
                  to="/digital-resources"
                  className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800 pt-1"
                >
                  Browse Campus Access <ExternalLink className="w-3 h-3" />
                </Link>
              </div>

              <div className="p-5 rounded-2xl bg-emerald-50/50 border border-emerald-100 space-y-2">
                <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold">
                  <Download className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-sm text-slate-900">Thesis Submission & Plagiarism Check</h4>
                <p className="text-xs text-slate-600">Download official pre-submission compliance forms and Urkund/Turnitin clearance templates.</p>
                <Link
                  to="/downloads"
                  className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 hover:text-emerald-800 pt-1"
                >
                  Download Forms <Download className="w-3 h-3" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: RESERVATIONS */}
      {activeTab === 'reservations' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-5 sm:p-6 border-b border-slate-100">
            <h3 className="text-base font-bold text-slate-900 font-poppins">Hold & Reservation Queue</h3>
            <p className="text-xs text-slate-500">Books reserved when all copies are currently issued to other members</p>
          </div>
          {myReservations.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-xs font-semibold">
              No active reservations. When a catalog book is out on loan, click "Reserve Book" to hold it upon return.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {myReservations.map((r) => (
                <div key={r.id} className="p-5 flex items-center justify-between gap-4">
                  <div>
                    <h4 className="font-bold text-sm text-slate-900">{r.bookTitle}</h4>
                    <p className="text-xs text-slate-500">Hold Active • Priority Queue</p>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                    Queue Position: #{r.queuePosition || 1}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: EXTENSIONS */}
      {activeTab === 'extensions' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-5 sm:p-6 border-b border-slate-100">
            <h3 className="text-base font-bold text-slate-900 font-poppins">Time Extension Requests</h3>
            <p className="text-xs text-slate-500">Online loan duration extension requests submitted to Library Admin</p>
          </div>
          {myExtensions.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-xs font-semibold">
              No pending extension requests. Go to Active Borrowings to request extra research loan days.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {myExtensions.map((ext) => (
                <div key={ext.id} className="p-5 flex items-center justify-between gap-4">
                  <div>
                    <h4 className="font-bold text-sm text-slate-900">{ext.bookTitle}</h4>
                    <p className="text-xs text-slate-500">
                      Requested +{ext.requestedExtensionDays} days • Reason: "{ext.reason}"
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                    ext.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' : ext.status === 'REJECTED' ? 'bg-rose-100 text-rose-800' : 'bg-blue-100 text-blue-800'
                  }`}>
                    {ext.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 5: PROCUREMENT PROPOSALS */}
      {activeTab === 'procurement' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-2xs p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 font-poppins">Doctoral Research Book Recommendations</h3>
              <p className="text-xs text-slate-500">Propose specialized books or journal volumes for university library acquisition</p>
            </div>
            <button
              onClick={() => setIsProcurementModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-700 shadow-md cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>New Proposal</span>
            </button>
          </div>

          <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-100 text-xs text-indigo-900 space-y-1">
            <div className="font-bold flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-indigo-600" /> Research Faculty & Scholar Priority
            </div>
            <p>
              Recommendations submitted by Ph.D. scholars and faculty members are prioritized by the Central Library Acquisition Committee during quarterly procurement rounds.
            </p>
          </div>
        </div>
      )}

      {/* TAB 6: BORROW HISTORY */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-5 sm:p-6 border-b border-slate-100">
            <h3 className="text-base font-bold text-slate-900 font-poppins">Completed Borrowing Records</h3>
            <p className="text-xs text-slate-500">Historical archive of all returned books and resource consultations</p>
          </div>
          {borrowHistory.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-xs font-semibold">
              No historical return transactions recorded yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-100">
                  <tr>
                    <th className="p-4">Book Title</th>
                    <th className="p-4">Accession No</th>
                    <th className="p-4">Issue Date</th>
                    <th className="p-4">Return Date</th>
                    <th className="p-4">Condition</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {borrowHistory.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-50">
                      <td className="p-4 font-bold text-slate-900">{tx.bookTitle}</td>
                      <td className="p-4 font-mono text-slate-600">{tx.accessionNo}</td>
                      <td className="p-4 text-slate-600">{tx.issueDate}</td>
                      <td className="p-4 text-emerald-700 font-bold">{tx.returnDate || 'Returned'}</td>
                      <td className="p-4 text-slate-600">Good</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* MODAL: TIME EXTENSION */}
      {extensionModalTx && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-base text-slate-900">Request Loan Extension</h3>
              <button onClick={() => setExtensionModalTx(null)} className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleExtensionSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Book Title</label>
                <input
                  type="text"
                  disabled
                  value={extensionModalTx.bookTitle}
                  className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Additional Extension Days</label>
                <select
                  value={extensionDays}
                  onChange={(e) => setExtensionDays(Number(e.target.value))}
                  className="w-full p-2.5 rounded-xl bg-white border border-slate-300 text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value={15}>+15 Days</option>
                  <option value={30}>+30 Days (Standard Research)</option>
                  <option value={45}>+45 Days</option>
                  <option value={60}>+60 Days (Doctoral Experiment)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Research Reason</label>
                <textarea
                  required
                  rows={3}
                  value={extensionReason}
                  onChange={(e) => setExtensionReason(e.target.value)}
                  placeholder="e.g. Chapter 4 literature review and experimental verification ongoing."
                  className="w-full p-2.5 rounded-xl bg-white border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setExtensionModalTx(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md cursor-pointer"
                >
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: PROCUREMENT PROPOSAL */}
      {isProcurementModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-base text-slate-900">Propose Research Book / Monograph</h3>
              <button onClick={() => setIsProcurementModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleProcurementSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Publication Title *</label>
                <input
                  type="text"
                  required
                  value={procurementForm.bookTitle}
                  onChange={(e) => setProcurementForm({ ...procurementForm, bookTitle: e.target.value })}
                  placeholder="e.g. Deep Reinforcement Learning in Multi-Agent Systems"
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Author(s)</label>
                  <input
                    type="text"
                    value={procurementForm.authorName}
                    onChange={(e) => setProcurementForm({ ...procurementForm, authorName: e.target.value })}
                    placeholder="e.g. Dr. Richard Sutton"
                    className="w-full p-2.5 rounded-xl border border-slate-300 text-xs font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">ISBN / ISSN</label>
                  <input
                    type="text"
                    value={procurementForm.isbn}
                    onChange={(e) => setProcurementForm({ ...procurementForm, isbn: e.target.value })}
                    placeholder="978-0-123456-78-9"
                    className="w-full p-2.5 rounded-xl border border-slate-300 text-xs font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Publisher</label>
                <input
                  type="text"
                  value={procurementForm.publisherName}
                  onChange={(e) => setProcurementForm({ ...procurementForm, publisherName: e.target.value })}
                  placeholder="e.g. MIT Press / Springer Nature"
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-xs font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Research Relevance / Justification</label>
                <textarea
                  rows={3}
                  value={procurementForm.reason}
                  onChange={(e) => setProcurementForm({ ...procurementForm, reason: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-xs font-medium"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsProcurementModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md cursor-pointer"
                >
                  Submit Recommendation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: DIGITAL SCHOLAR PASS */}
      {isLibraryPassModalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-base text-slate-900">Doctoral Scholar Smart Card</h3>
              <button onClick={() => setIsLibraryPassModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 rounded-2xl p-5 text-white shadow-xl space-y-4 border border-indigo-800/60">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-300">Central University Library</span>
                  <h4 className="text-sm font-bold text-white">Doctoral Scholar Card</h4>
                </div>
                <FlaskConical className="w-6 h-6 text-indigo-400" />
              </div>

              <div className="flex items-center gap-4">
                <img
                  src={scholarMember.avatarUrl || 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80'}
                  alt={scholarDisplayName}
                  className="w-16 h-16 rounded-xl object-cover border-2 border-indigo-400/50"
                />
                <div className="space-y-0.5 min-w-0">
                  <div className="font-bold text-sm text-white truncate">{scholarDisplayName}</div>
                  <div className="text-xs font-mono text-indigo-300">{scholarMember.scholarId || scholarMember.memberCardNo}</div>
                  <div className="text-[11px] text-slate-300 truncate">{scholarMember.department}</div>
                </div>
              </div>

              <div className="bg-white p-2 rounded-xl flex items-center justify-center">
                <div dangerouslySetInnerHTML={{ __html: barcodeSvg }} className="scale-90" />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => printMemberLibraryCard(scholarMember)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold shadow-md cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Official Card</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: NO DUE CLEARANCE */}
      {isNoDueModalOpen && (
        <NoDueCertificateModal
          isOpen={isNoDueModalOpen}
          onClose={() => setIsNoDueModalOpen(false)}
          member={scholarMember}
        />
      )}
    </div>
  );
}
