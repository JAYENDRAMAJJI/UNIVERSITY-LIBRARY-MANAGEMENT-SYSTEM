import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  UserCheck,
  LogOut,
  LogIn,
  Search,
  SlidersHorizontal,
  RotateCcw,
  Download,
  Clock,
  Building2,
  Users,
  ShieldCheck,
  AlertCircle,
  CheckCircle,
  ScanBarcode,
  QrCode,
  CreditCard,
  User,
  Sparkles,
  Layers,
  FileSpreadsheet,
  X,
  Plus,
  BarChart3,
  ChevronDown,
  Calendar,
  Zap,
} from 'lucide-react';
import { libraryStore, getLocalDateTimeStr, getLocalDateStr, formatOnlyTimeInBracket, getLibraryOperatingStatus } from '../../services/libraryStore.service';
import { useAuth } from '../../context/AuthContext';
import {
  AttendanceRecord,
  AttendanceStatus,
  Role,
  VerificationMethod,
  VisitPurpose,
  MemberProfile,
} from '../../types/library';

export default function AttendanceManagement() {
  const { user } = useAuth();
  const isAdminOrStaff = user?.role === 'ADMIN' || user?.role === 'STAFF';
  const [state, setState] = useState(libraryStore.snapshot);
  const [activeTab, setActiveTab] = useState<'DESK' | 'LIVE' | 'HISTORY' | 'ANALYTICS'>(
    isAdminOrStaff ? 'DESK' : 'HISTORY'
  );

  // Check-In / Out Desk States
  const [scanInput, setScanInput] = useState('');
  const [verificationMethod, setVerificationMethod] = useState<VerificationMethod>('BARCODE');
  const [purposeOfVisit, setPurposeOfVisit] = useState<VisitPurpose>('GENERAL_READING');
  const [entryGate, setEntryGate] = useState('Main Gate - Central Library');
  const [lastScanResult, setLastScanResult] = useState<{
    success: boolean;
    message: string;
    member?: MemberProfile;
    record?: AttendanceRecord;
  } | null>(null);

  // History & Filters State
  const [searchTerm, setSearchTerm] = useState('');
  const [liveSearchTerm, setLiveSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState<'ALL' | Role>('ALL');
  const [selectedDepartment, setSelectedDepartment] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState<'ALL' | AttendanceStatus>('ALL');
  const [dateFilter, setDateFilter] = useState<'TODAY' | 'WEEK' | 'MONTH' | 'ALL'>('TODAY');

  // Manual Override Modal
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [overrideForm, setOverrideForm] = useState({
    memberName: '',
    memberCardNo: 'STU-2026-7326',
    role: 'STUDENT' as Role,
    department: 'Computer Science & Engineering',
    email: '',
    checkInTime: getLocalDateTimeStr().substring(0, 16),
    checkOutTime: '',
    purposeOfVisit: 'GENERAL_READING' as VisitPurpose,
    entryGate: 'Main Gate - Manual Override Desk',
    notes: '',
  });

  const scanInputRef = useRef<HTMLInputElement>(null);

  // Real Clock State (Updates every second)
  const [nowClock, setNowClock] = useState(new Date());

  const operatingStatus = useMemo(() => getLibraryOperatingStatus(nowClock), [nowClock]);

  useEffect(() => {
    const timer = setInterval(() => {
      setNowClock(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Periodically enforce library closing time (10:00 PM auto check-out rule)
  useEffect(() => {
    libraryStore.checkAndAutoCheckoutExpiredSessions();
  }, [nowClock]);

  useEffect(() => {
    const sub = libraryStore.getObservable().subscribe(setState);
    return () => sub.unsubscribe();
  }, []);

  // Auto focus scan input when on Desk tab
  useEffect(() => {
    if (activeTab === 'DESK' && isAdminOrStaff) {
      scanInputRef.current?.focus();
    }
  }, [activeTab, isAdminOrStaff]);

  const currentUserMember = useMemo(() => {
    if (!user) return null;
    return (
      state.members.find(
        (m) =>
          m.email.toLowerCase() === user.email?.toLowerCase() ||
          (user.id && m.id === user.id) ||
          (m.memberCardNo && user.email && m.memberCardNo.toLowerCase() === user.email.toLowerCase())
      ) || null
    );
  }, [state.members, user]);

  // Attendance Records Scoped per Role:
  // Admins see all logs; Non-admins (Student/Faculty) ONLY see their own isolated logs
  const attendanceRecords = useMemo(() => {
    const allRecords = state.attendanceRecords || [];
    if (isAdminOrStaff) {
      return allRecords;
    }
    const uEmail = user?.email?.toLowerCase();
    const uName = user?.name?.toLowerCase();
    const mId = currentUserMember?.id;
    const mCard = currentUserMember?.memberCardNo?.toLowerCase();

    return allRecords.filter((r) => {
      const matchEmail = Boolean(uEmail && r.email?.toLowerCase() === uEmail);
      const matchMemberId = Boolean(mId && r.memberId === mId);
      const matchCardNo = Boolean(mCard && r.memberCardNo?.toLowerCase() === mCard);
      const matchName = Boolean(uName && r.memberName?.toLowerCase() === uName);
      return matchEmail || matchMemberId || matchCardNo || matchName;
    });
  }, [isAdminOrStaff, state.attendanceRecords, user, currentUserMember]);

  // Dynamic Real Date String (Local Format YYYY-MM-DD)
  const todayStr = useMemo(() => {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${nowClock.getFullYear()}-${pad(nowClock.getMonth() + 1)}-${pad(nowClock.getDate())}`;
  }, [nowClock]);

  // Format Stay Duration for Active or Completed Sessions dynamically against live real clock
  const formatStayDuration = (r: AttendanceRecord) => {
    if (r.status === 'COMPLETED' || r.status === 'AUTO_CHECK_OUT') {
      if (r.durationMinutes) {
        const h = Math.floor(r.durationMinutes / 60);
        const m = r.durationMinutes % 60;
        return h > 0 ? `${h}h ${m}m` : `${m} mins`;
      }
      if (r.checkInTime && r.checkOutTime) {
        const inT = new Date(r.checkInTime.replace(' ', 'T')).getTime();
        const outT = new Date(r.checkOutTime.replace(' ', 'T')).getTime();
        if (!isNaN(inT) && !isNaN(outT) && outT > inT) {
          const mins = Math.max(1, Math.round((outT - inT) / (1000 * 60)));
          const h = Math.floor(mins / 60);
          const m = mins % 60;
          return h > 0 ? `${h}h ${m}m` : `${m} mins`;
        }
      }
      return '1h 0m';
    }
    // Live Active Session
    const inT = new Date(r.checkInTime.replace(' ', 'T')).getTime();
    if (isNaN(inT)) return 'Active (0 mins)';
    const elapsedMins = Math.max(0, Math.floor((nowClock.getTime() - inT) / (1000 * 60)));
    const h = Math.floor(elapsedMins / 60);
    const m = elapsedMins % 60;
    const durText = h > 0 ? `${h}h ${m}m` : `${m} mins`;
    return `Active (${durText})`;
  };

  // Real Average Stay Duration Telemetry
  const avgStayDurationText = useMemo(() => {
    if (attendanceRecords.length === 0) return '0 mins';
    let totalMins = 0;
    let count = 0;
    attendanceRecords.forEach((r) => {
      if (r.durationMinutes) {
        totalMins += r.durationMinutes;
        count++;
      } else if (r.checkInTime) {
        const inT = new Date(r.checkInTime.replace(' ', 'T')).getTime();
        if (!isNaN(inT)) {
          const elapsed = Math.max(1, Math.round((nowClock.getTime() - inT) / (1000 * 60)));
          totalMins += elapsed;
          count++;
        }
      }
    });
    if (count === 0) return '0 mins';
    const avg = Math.round(totalMins / count);
    const h = Math.floor(avg / 60);
    const m = avg % 60;
    return h > 0 ? `${h}h ${m}m` : `${m} mins`;
  }, [attendanceRecords, nowClock]);
  const activeVisitors = useMemo(
    () => (state.attendanceRecords || []).filter((r) => r.status === 'IN_LIBRARY'),
    [state.attendanceRecords]
  );
  const myActiveSession = useMemo(
    () => attendanceRecords.find((r) => r.status === 'IN_LIBRARY'),
    [attendanceRecords]
  );
  const filteredActiveVisitors = useMemo(() => {
    const q = liveSearchTerm.toLowerCase().trim();
    if (!q) return activeVisitors;
    return activeVisitors.filter(
      (v) =>
        v.memberName.toLowerCase().includes(q) ||
        v.memberCardNo.toLowerCase().includes(q) ||
        v.email.toLowerCase().includes(q) ||
        (v.department && v.department.toLowerCase().includes(q))
    );
  }, [activeVisitors, liveSearchTerm]);
  const todayRecords = useMemo(
    () => attendanceRecords.filter((r) => r.date === todayStr),
    [attendanceRecords, todayStr]
  );

  const studentVisitsCount = useMemo(
    () => todayRecords.filter((r) => r.role === 'STUDENT').length,
    [todayRecords]
  );
  const facultyVisitsCount = useMemo(
    () => todayRecords.filter((r) => r.role === 'FACULTY').length,
    [todayRecords]
  );
  const staffVisitsCount = useMemo(
    () => todayRecords.filter((r) => r.role === 'STAFF' || r.role === 'ADMIN').length,
    [todayRecords]
  );

  const departmentOptions = useMemo(() => {
    const set = new Set<string>();
    state.members.forEach((m) => {
      if (m.department) set.add(m.department);
    });
    return Array.from(set);
  }, [state.members]);

  // Filtered History
  const filteredHistory = useMemo(() => {
    return attendanceRecords.filter((r) => {
      // 1. Search term (Name, Card No, Email, Department)
      const q = searchTerm.toLowerCase().trim();
      let matchesSearch = true;
      if (q) {
        matchesSearch =
          r.memberName.toLowerCase().includes(q) ||
          r.memberCardNo.toLowerCase().includes(q) ||
          r.email.toLowerCase().includes(q) ||
          (r.department && r.department.toLowerCase().includes(q)) ||
          (r.entryGate && r.entryGate.toLowerCase().includes(q));
      }

      // 2. Role filter
      const matchesRole = selectedRole === 'ALL' || r.role === selectedRole;

      // 3. Department filter
      const matchesDept = selectedDepartment === 'ALL' || r.department === selectedDepartment;

      // 4. Status filter
      const matchesStatus = selectedStatus === 'ALL' || r.status === selectedStatus;

      // 5. Date filter
      let matchesDate = true;
      if (dateFilter === 'TODAY') {
        matchesDate = r.date === todayStr;
      } else if (dateFilter === 'WEEK') {
        const d = new Date(r.date);
        const now = new Date();
        const diffDays = (now.getTime() - d.getTime()) / (1000 * 3600 * 24);
        matchesDate = diffDays <= 7;
      } else if (dateFilter === 'MONTH') {
        matchesDate = r.date.substring(0, 7) === todayStr.substring(0, 7);
      }

      return matchesSearch && matchesRole && matchesDept && matchesStatus && matchesDate;
    });
  }, [attendanceRecords, searchTerm, selectedRole, selectedDepartment, selectedStatus, dateFilter, todayStr]);

  // Handle Scan Submit (Check-In or Check-Out toggle)
  const handleScanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!scanInput.trim()) return;

    const term = scanInput.trim();
    // Check if member already in library -> execute checkout
    const activeSession = activeVisitors.find(
      (v) =>
        v.memberCardNo.toLowerCase() === term.toLowerCase() ||
        v.email.toLowerCase() === term.toLowerCase() ||
        v.memberId.toLowerCase() === term.toLowerCase()
    );

    let res;
    if (activeSession) {
      res = libraryStore.checkOutMember(activeSession.id, user?.name || 'Scan Kiosk');
    } else {
      res = libraryStore.checkInMember(
        term,
        verificationMethod,
        purposeOfVisit,
        entryGate,
        user?.name || 'Scan Kiosk'
      );
    }

    setLastScanResult(res);
    setScanInput('');
    scanInputRef.current?.focus();
  };

  const handleExplicitCheckIn = () => {
    if (!scanInput.trim()) return;
    const res = libraryStore.checkInMember(
      scanInput.trim(),
      verificationMethod,
      purposeOfVisit,
      entryGate,
      user?.name || 'Scan Kiosk'
    );
    setLastScanResult(res);
    setScanInput('');
    scanInputRef.current?.focus();
  };

  const handleExplicitCheckOut = () => {
    if (!scanInput.trim()) return;
    const res = libraryStore.checkOutMember(
      scanInput.trim(),
      user?.name || 'Scan Kiosk',
      'Counter Manual Check-out'
    );
    setLastScanResult(res);
    setScanInput('');
    scanInputRef.current?.focus();
  };

  const handleManualCheckOut = (recordId: string) => {
    const res = libraryStore.checkOutMember(recordId, user?.name || 'Desk Staff', 'Manual Desk Check-out');
    setLastScanResult(res);
  };

  const handleForceCheckoutAll = () => {
    if (window.confirm('Are you sure you want to check out all active visitors currently in the library?')) {
      const res = libraryStore.forceCheckOutAll(user?.name || 'Admin Officer');
      setLastScanResult({
        success: true,
        message: `Successfully checked out all ${res.count} active visitors.`,
      });
    }
  };

  const handleExportCSV = () => {
    libraryStore.exportAttendanceReportCSV(filteredHistory);
  };

  const handleSaveOverride = (e: React.FormEvent) => {
    e.preventDefault();
    if (!overrideForm.memberName || !overrideForm.memberCardNo) {
      alert('Please fill member name and card number.');
      return;
    }

    const res = libraryStore.manualOverrideAttendance({
      ...overrideForm,
    });
    setLastScanResult(res);
    setShowOverrideModal(false);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col xl:flex-row xl:items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="space-y-2 relative z-10">
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-widest text-blue-300 bg-white/10 px-3.5 py-1 rounded-full">
              <UserCheck className="h-4 w-4" /> University Library Attendance Portal
            </div>
            <div className="inline-flex items-center gap-2 text-xs font-mono font-bold text-amber-300 bg-white/10 px-3.5 py-1.5 rounded-full border border-amber-300/20 shadow-xs">
              <Clock className="h-3.5 w-3.5 text-amber-400" />
              <span>{nowClock.toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })} ({nowClock.toLocaleTimeString()})</span>
            </div>
          </div>
          <h1 className="text-2xl sm:text-3xl xl:text-4xl font-extrabold font-poppins tracking-tight">
            Library Attendance Management
          </h1>
          <p className="text-slate-300 text-xs sm:text-sm max-w-2xl">
            Real-time Barcode & QR Card Check-In/Out desk, live capacity occupancy monitoring, student & faculty access verification, and attendance reports.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 relative z-10">
          {isAdminOrStaff && (
            <>
              <button
                onClick={() => setActiveTab('DESK')}
                className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                  activeTab === 'DESK'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-white/10 text-white hover:bg-white/20'
                }`}
              >
                <ScanBarcode className="h-4 w-4" /> Check-In Counter
              </button>
              <button
                onClick={() => setActiveTab('LIVE')}
                className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                  activeTab === 'LIVE'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'bg-white/10 text-white hover:bg-white/20'
                }`}
              >
                <Users className="h-4 w-4 text-emerald-300" /> Live Occupancy ({activeVisitors.length})
              </button>
            </>
          )}
          <button
            onClick={handleExportCSV}
            className="px-4 py-2.5 rounded-2xl bg-white text-slate-900 hover:bg-slate-100 font-bold text-xs shadow-sm transition-all flex items-center gap-2 cursor-pointer"
          >
            <Download className="h-4 w-4 text-blue-600" /> Export CSV
          </button>
        </div>
      </div>

      {/* Official Central Library Building Location & Operating Hours Banner */}
      <div className="bg-slate-900 border border-slate-800 text-white rounded-3xl p-5 sm:p-6 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="p-3.5 rounded-2xl bg-blue-600/20 border border-blue-500/30 text-blue-400 shrink-0">
            <Building2 className="w-7 h-7 text-blue-400" />
          </div>
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base sm:text-lg font-extrabold font-poppins text-white">Central University Library Building</h2>
              <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30">
                Academic Block A, Ground Floor
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 font-medium">
              Circulation Desk & Reading Rooms | <strong>Operating Hours: Mon – Sat (8:00 AM – 10:00 PM) | Closed on National Holidays</strong>
            </p>
          </div>
        </div>

        {/* Live Operating Status Badge & Auto Check-Out Notice */}
        <div className="flex items-center gap-3 shrink-0 self-stretch md:self-auto justify-between md:justify-end border-t md:border-t-0 border-slate-800 pt-3 md:pt-0">
          <div className="text-right hidden sm:block">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
              Auto Check-Out Scheduler
            </span>
            <span className="text-xs font-semibold text-slate-300">
              Active at 10:00 PM Closing
            </span>
          </div>
          {operatingStatus.isOpen ? (
            <div className="px-4 py-2 rounded-2xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-2 text-xs font-extrabold">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
              <span>🟢 LIBRARY OPEN NOW</span>
            </div>
          ) : (
            <div className="px-4 py-2 rounded-2xl bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-2 text-xs font-extrabold">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
              <span>🔴 LIBRARY CLOSED ({operatingStatus.statusText})</span>
            </div>
          )}
        </div>
      </div>

      {/* Non-Admin Notice Banner */}
      {!isAdminOrStaff && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-4 sm:p-5 flex items-start gap-3 shadow-xs">
          <ShieldCheck className="h-6 w-6 text-blue-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h3 className="text-xs font-extrabold text-blue-950 uppercase tracking-wider">
              Admin-Managed Library Attendance System
            </h3>
            <p className="text-xs text-blue-900 font-medium leading-relaxed">
              Attendance check-in and check-out entries can <strong>only be marked by the Library Admin</strong> at the entrance desk counter.
              Your attendance records below are strictly private and visible <strong>only to you</strong>.
            </p>
          </div>
        </div>
      )}

      {/* Telemetry Dashboard Cards - High-End Premium Layout */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        {/* Card 1: Total Visits Today */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-sm hover:shadow-md transition-all duration-200 flex items-center gap-4 group">
          <div className="w-13 h-13 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <Users className="h-6 w-6 text-indigo-600" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest truncate">
              {isAdminOrStaff ? 'Total Visits Today' : 'My Visits Today'}
            </p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-extrabold font-poppins text-slate-900 leading-none">
                {todayRecords.length}
              </span>
              <span className="text-xs font-semibold text-slate-400">Visits</span>
            </div>
          </div>
        </div>

        {/* Card 2: Live Occupancy / My Status */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-sm hover:shadow-md transition-all duration-200 flex items-center gap-4 group">
          <div className="w-13 h-13 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <UserCheck className="h-6 w-6 text-emerald-600" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest truncate">
              {isAdminOrStaff ? 'Live Occupancy' : 'My Library Status'}
            </p>
            <div className="flex items-center gap-2.5 mt-1">
              {isAdminOrStaff ? (
                <>
                  <span className="text-3xl font-extrabold font-poppins text-emerald-600 leading-none">
                    {activeVisitors.length}
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100/90 text-emerald-800 border border-emerald-200">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                    In Library
                  </span>
                </>
              ) : myActiveSession ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  Currently In Library
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
                  Checked Out
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Card 3: Students / Faculty Breakdown */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-sm hover:shadow-md transition-all duration-200 flex items-center gap-4 group">
          <div className="w-13 h-13 rounded-2xl bg-purple-50 text-purple-600 border border-purple-100 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <Building2 className="h-6 w-6 text-purple-600" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest truncate">
              {isAdminOrStaff ? 'Student & Faculty Visits' : 'Total Visits Logged'}
            </p>
            {isAdminOrStaff ? (
              <div className="flex items-center gap-3 mt-1.5">
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-extrabold font-poppins text-slate-900 leading-none">{studentVisitsCount}</span>
                  <span className="text-[11px] font-bold text-slate-400 uppercase">Stu</span>
                </div>
                <span className="text-slate-300 font-light text-sm">•</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-extrabold font-poppins text-slate-900 leading-none">{facultyVisitsCount}</span>
                  <span className="text-[11px] font-bold text-slate-400 uppercase">Fac</span>
                </div>
              </div>
            ) : (
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-3xl font-extrabold font-poppins text-purple-700 leading-none">
                  {attendanceRecords.length}
                </span>
                <span className="text-xs font-semibold text-slate-400">Total</span>
              </div>
            )}
          </div>
        </div>

        {/* Card 4: Average Stay Duration */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-sm hover:shadow-md transition-all duration-200 flex items-center gap-4 group">
          <div className="w-13 h-13 rounded-2xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <Clock className="h-6 w-6 text-amber-600" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest truncate">
              Avg Stay Duration
            </p>
            <div className="mt-1">
              <span className="text-2xl sm:text-3xl font-extrabold font-poppins text-amber-700 leading-none block truncate">
                {avgStayDurationText}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Tab Navigation Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-1.5 flex flex-wrap gap-1 shadow-xs">
        {isAdminOrStaff ? (
          <>
            <button
              onClick={() => setActiveTab('DESK')}
              className={`flex-1 min-w-[140px] py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === 'DESK'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <ScanBarcode className="h-4 w-4" /> Check-In / Check-Out Desk
            </button>
            <button
              onClick={() => setActiveTab('LIVE')}
              className={`flex-1 min-w-[140px] py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === 'LIVE'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Users className="h-4 w-4" /> Live Occupancy ({activeVisitors.length})
            </button>
            <button
              onClick={() => setActiveTab('HISTORY')}
              className={`flex-1 min-w-[140px] py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === 'HISTORY'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Calendar className="h-4 w-4" /> Attendance History ({filteredHistory.length})
            </button>
            <button
              onClick={() => setActiveTab('ANALYTICS')}
              className={`flex-1 min-w-[140px] py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === 'ANALYTICS'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <BarChart3 className="h-4 w-4" /> Attendance Analytics
            </button>
          </>
        ) : (
          <button
            onClick={() => setActiveTab('HISTORY')}
            className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer bg-blue-600 text-white shadow-sm"
          >
            <Calendar className="h-4 w-4" /> My Personal Library Visits & Attendance History ({filteredHistory.length})
          </button>
        )}
      </div>

      {/* TAB 1: CHECK-IN / CHECK-OUT DESK (ADMIN & STAFF EXCLUSIVE) */}
      {activeTab === 'DESK' && isAdminOrStaff && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-7 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-lg font-bold font-poppins text-slate-900 flex items-center gap-2">
                  <ScanBarcode className="h-5 w-5 text-blue-600" /> Library Check-In & Check-Out Desk
                </h2>
                <p className="text-xs text-slate-500 mt-1 whitespace-nowrap truncate">
                  Scan member barcode / QR card or enter Member Card Number (e.g. STU-2026-7326 or FAC-2023-1102).
                </p>
              </div>
            </div>

            {/* Scan / Manual Entry Form */}
            <form onSubmit={handleScanSubmit} className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Scan Barcode / QR / Enter Member Card ID
                  </label>
                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
                    Smart Auto Tap Active
                  </span>
                </div>
                <div className="relative">
                  <ScanBarcode className="absolute left-4 top-3.5 h-5 w-5 text-blue-600" />
                  <input
                    ref={scanInputRef}
                    type="text"
                    placeholder="Scan card barcode (e.g. STU-2026-7326) or type email..."
                    value={scanInput}
                    onChange={(e) => setScanInput(e.target.value)}
                    className="w-full pl-12 pr-4 shadow-2xs py-3 rounded-2xl border-2 border-blue-200 bg-blue-50/20 text-slate-900 font-mono text-base font-bold focus:bg-white focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-500/10 transition-all"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2 mt-3">
                  <button
                    type="submit"
                    className="py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                  >
                    <Zap className="h-3.5 w-3.5" /> Smart Tap
                  </button>
                  <button
                    type="button"
                    onClick={handleExplicitCheckIn}
                    className="py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                  >
                    <LogIn className="h-3.5 w-3.5" /> Check-In (Entry)
                  </button>
                  <button
                    type="button"
                    onClick={handleExplicitCheckOut}
                    className="py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                  >
                    <LogOut className="h-3.5 w-3.5" /> Check-Out (Exit)
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 sm:gap-4 pt-2">
                <div className="space-y-1.5 min-w-0">
                  <label className="block text-xs sm:text-sm font-extrabold uppercase tracking-wider text-slate-700 truncate">
                    Verification Method
                  </label>
                  <div className="relative">
                    <select
                      value={verificationMethod}
                      onChange={(e) => setVerificationMethod(e.target.value as VerificationMethod)}
                      className="w-full pl-3.5 pr-10 py-3 rounded-2xl border border-slate-200 text-xs sm:text-sm font-bold text-slate-900 bg-slate-50/90 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all appearance-none cursor-pointer truncate shadow-2xs"
                    >
                      <option value="BARCODE">Barcode Scanner</option>
                      <option value="QR_CODE">QR Code Scanner</option>
                      <option value="CARD_SCAN">RFID Card Scan</option>
                      <option value="MANUAL_ID">Manual Card ID</option>
                    </select>
                    <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none" />
                  </div>
                </div>

                <div className="space-y-1.5 min-w-0">
                  <label className="block text-xs sm:text-sm font-extrabold uppercase tracking-wider text-slate-700 truncate">
                    Purpose of Visit
                  </label>
                  <div className="relative">
                    <select
                      value={purposeOfVisit}
                      onChange={(e) => setPurposeOfVisit(e.target.value as VisitPurpose)}
                      className="w-full pl-3.5 pr-10 py-3 rounded-2xl border border-slate-200 text-xs sm:text-sm font-bold text-slate-900 bg-slate-50/90 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all appearance-none cursor-pointer truncate shadow-2xs"
                    >
                      <option value="GENERAL_READING">General Reading / Study</option>
                      <option value="BOOK_ISSUE_RETURN">Book Issue & Return</option>
                      <option value="DIGITAL_LIBRARY">Digital Library</option>
                      <option value="RESEARCH_STUDY">Research & Study</option>
                      <option value="GROUP_DISCUSSION">Group Discussion</option>
                      <option value="EXAM_PREPARATION">Exam Preparation</option>
                    </select>
                    <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none" />
                  </div>
                </div>

                <div className="space-y-1.5 min-w-0">
                  <label className="block text-xs sm:text-sm font-extrabold uppercase tracking-wider text-slate-700 truncate">
                    Library Location
                  </label>
                  <div className="relative">
                    <select
                      value={entryGate}
                      onChange={(e) => setEntryGate(e.target.value)}
                      className="w-full pl-3.5 pr-10 py-3 rounded-2xl border border-slate-200 text-xs sm:text-sm font-bold text-slate-900 bg-slate-50/90 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all appearance-none cursor-pointer truncate shadow-2xs"
                    >
                      <option value="Main Gate - Central Library">Main Gate (Central Library)</option>
                      <option value="Faculty Research Wing Gate">Faculty Research Wing</option>
                      <option value="Digital Library Terminal Gate">Digital Library Wing</option>
                      <option value="Periodicals & Reference Section Gate">Reference & Periodicals</option>
                    </select>
                    <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none" />
                  </div>
                </div>
              </div>
            </form>

            {/* Quick Demo Tap Buttons */}
            <div className="pt-4 border-t border-slate-100 space-y-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Quick One-Click Test Taps (Sample Accounts):
              </span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setScanInput('STU-2026-7326');
                  }}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-mono font-bold cursor-pointer transition-colors"
                >
                  STU-2026-7326 (Jayendra Majji)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setScanInput('FAC-2023-1102');
                  }}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-mono font-bold cursor-pointer transition-colors"
                >
                  FAC-2023-1102 (Dr. Sarah Connor)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setScanInput('ADM-2024-0001');
                  }}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-mono font-bold cursor-pointer transition-colors"
                >
                  ADM-2024-0001 (Admin Librarian)
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Scan Result Feedback & Active Verification Banner */}
          <div className="lg:col-span-5 space-y-4">
            {lastScanResult ? (
              <div
                className={`p-6 rounded-3xl border shadow-md space-y-4 animate-fadeIn ${
                  lastScanResult.success
                    ? 'bg-gradient-to-br from-emerald-950 to-slate-900 text-white border-emerald-500/30'
                    : 'bg-gradient-to-br from-rose-950 to-slate-900 text-white border-rose-500/30'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider inline-flex items-center gap-1.5 ${
                      lastScanResult.success
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    }`}
                  >
                    {lastScanResult.success ? (
                      <>
                        <CheckCircle className="h-4 w-4 text-emerald-400" /> Tap Verified & Recorded
                      </>
                    ) : (
                      <>
                        <AlertCircle className="h-4 w-4 text-rose-400" /> Check-In Failed
                      </>
                    )}
                  </span>
                  <button
                    onClick={() => setLastScanResult(null)}
                    className="text-slate-400 hover:text-white text-xs cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div>
                  <h3 className="text-lg font-bold font-poppins">{lastScanResult.message}</h3>
                  {lastScanResult.record && (
                    <p className="text-xs text-slate-300 mt-1 font-mono">
                      Timestamp: {formatOnlyTimeInBracket(lastScanResult.record.checkInTime)} | Location: {lastScanResult.record.entryGate}
                    </p>
                  )}
                </div>

                {lastScanResult.member && (
                  <div className="bg-white/10 p-4 rounded-2xl space-y-2 text-xs border border-white/10 backdrop-blur-xs">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-base shrink-0">
                        {lastScanResult.member.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-white text-sm">{lastScanResult.member.name}</p>
                        <p className="text-blue-300 font-mono text-[11px]">{lastScanResult.member.memberCardNo}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] pt-2 border-t border-white/10">
                      <div>
                        <span className="text-slate-400">Role:</span>{' '}
                        <strong className="text-white">{lastScanResult.member.role}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400">Department:</span>{' '}
                        <strong className="text-white truncate block">{lastScanResult.member.department}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400">Status:</span>{' '}
                        <strong className="text-emerald-400">{lastScanResult.member.status}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400">Loans:</span>{' '}
                        <strong className="text-white">{lastScanResult.member.currentActiveLoans} Active</strong>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4 text-center">
                <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto">
                  <ScanBarcode className="h-8 w-8" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base font-poppins">Ready for Scanner Entry</h3>
                  <p className="text-xs text-slate-500 max-w-xs mx-auto mt-1">
                    Scan member card barcode or type card number to record entry or exit. Automatic check-out calculation applies.
                  </p>
                </div>
              </div>
            )}

            {/* Quick Actions Panel */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Administrative Desk Controls</h3>
              <div className="space-y-2">
                <button
                  onClick={() => {
                    const res = libraryStore.checkAndAutoCheckoutExpiredSessions();
                    if (res.checkedOutCount > 0) {
                      setLastScanResult({
                        success: true,
                        message: `Operating Hours Auto-Checkout: Successfully checked out ${res.checkedOutCount} visitor(s) (10:00 PM Closing Rule).`,
                      });
                    } else {
                      setLastScanResult({
                        success: true,
                        message: `Operating Hours Verified: No active visitors require auto-checkout at this time.`,
                      });
                    }
                  }}
                  className="w-full p-3 rounded-2xl bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-bold border border-amber-200/80 transition-colors flex items-center justify-between cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-amber-600" /> Run Auto Check-Out (10 PM Closing)
                  </span>
                  <span className="text-[10px] text-amber-700 font-extrabold uppercase">Auto Rule</span>
                </button>

                <button
                  onClick={() => setShowOverrideModal(true)}
                  className="w-full p-3 rounded-2xl bg-slate-50 hover:bg-slate-100 text-slate-800 text-xs font-bold border border-slate-200/80 transition-colors flex items-center justify-between cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Plus className="h-4 w-4 text-blue-600" /> Manual Attendance Override Entry
                  </span>
                  <span className="text-[10px] text-slate-400">Admin Only</span>
                </button>

                <button
                  onClick={handleForceCheckoutAll}
                  className="w-full p-3 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-800 text-xs font-bold border border-rose-200/80 transition-colors flex items-center justify-between cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <LogOut className="h-4 w-4 text-rose-600" /> Force Check-out All Active Visitors
                  </span>
                  <span className="text-[10px] text-rose-400">End of Day</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: LIVE OCCUPANCY MONITOR */}
      {activeTab === 'LIVE' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold font-poppins text-slate-900 flex items-center gap-2">
                  <Users className="h-5 w-5 text-emerald-600" /> Live Library Building Occupancy
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Currently {activeVisitors.length} active visitors inside the central library reading rooms and wings.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Building Capacity: {activeVisitors.length} / 500 Max
                </span>
                {isAdminOrStaff && (
                  <button
                    onClick={handleForceCheckoutAll}
                    className="px-3.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  >
                    Force Checkout All
                  </button>
                )}
              </div>
            </div>

            {/* Building Occupancy Progress Gauge */}
            <div className="space-y-1.5 pt-2">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-slate-600">Central Reading Room Capacity Usage</span>
                <span className="text-emerald-700 font-mono">
                  {Math.round((activeVisitors.length / 500) * 100)}% Occupied
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden p-0.5 border border-slate-200">
                <div
                  className="bg-gradient-to-r from-emerald-500 to-teal-600 h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.max(5, (activeVisitors.length / 500) * 100)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Active Visitors Search Bar & Table */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 text-sm font-poppins">
                  Active Visitors Currently Checked-In ({filteredActiveVisitors.length})
                </h3>
                {liveSearchTerm && (
                  <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                    Filtered
                  </span>
                )}
              </div>

              {/* Live Occupancy Search Bar */}
              <div className="relative min-w-[260px]">
                <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search active visitor name, card no, department..."
                  value={liveSearchTerm}
                  onChange={(e) => setLiveSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-8 py-1.5 rounded-xl border border-slate-200 text-xs bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-slate-800"
                />
                {liveSearchTerm && (
                  <button
                    onClick={() => setLiveSearchTerm('')}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>

            {filteredActiveVisitors.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-[11px] font-extrabold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                      <th className="py-3 px-4">Member Name & Card</th>
                      <th className="py-3 px-4">Role</th>
                      <th className="py-3 px-4">Department</th>
                      <th className="py-3 px-4">Check-In Time</th>
                      <th className="py-3 px-4">Live Stay Duration</th>
                      <th className="py-3 px-4">Library Location</th>
                      <th className="py-3 px-4">Purpose</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {filteredActiveVisitors.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4">
                          <div>
                            <p className="font-bold text-slate-900">{r.memberName}</p>
                            <p className="text-[11px] font-mono text-slate-500">{r.memberCardNo}</p>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                              r.role === 'FACULTY'
                                ? 'bg-purple-50 text-purple-700 border border-purple-100'
                                : r.role === 'ADMIN'
                                ? 'bg-amber-50 text-amber-700 border border-amber-100'
                                : 'bg-blue-50 text-blue-700 border border-blue-100'
                            }`}
                          >
                            {r.role}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-700 font-medium">{r.department}</td>
                        <td className="py-3.5 px-4 font-mono text-slate-800 font-semibold whitespace-nowrap">{formatOnlyTimeInBracket(r.checkInTime)}</td>
                        <td className="py-3.5 px-4 font-mono text-emerald-700 font-bold">{formatStayDuration(r)}</td>
                        <td className="py-3.5 px-4 text-slate-600">{r.entryGate}</td>
                        <td className="py-3.5 px-4">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                            {r.purposeOfVisit || 'GENERAL_READING'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          {isAdminOrStaff ? (
                            <button
                              onClick={() => handleManualCheckOut(r.id)}
                              className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-[11px] transition-colors cursor-pointer inline-flex items-center gap-1"
                            >
                              <LogOut className="h-3.5 w-3.5" /> Check-Out
                            </button>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-100">
                              Active In Library
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-12 text-center text-slate-500 space-y-2">
                <Users className="h-10 w-10 text-slate-300 mx-auto" />
                <p className="font-bold text-slate-700">No active visitors currently checked into library</p>
                <p className="text-xs">Scan member barcodes at the desk counter to record Check-In sessions.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: ATTENDANCE HISTORY LOGS */}
      {activeTab === 'HISTORY' && (
        <div className="space-y-6">
          {/* Controls & Filters Bar */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4 text-blue-600" />
                <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Filter & Search Attendance Records
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
                  Showing {filteredHistory.length} of {attendanceRecords.length} Total Logs
                </span>
                <button
                  onClick={handleExportCSV}
                  className="px-3.5 py-1.5 rounded-xl bg-blue-50 text-blue-700 border border-blue-100 hover:bg-blue-100 font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="h-3.5 w-3.5" /> Export CSV
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-3">
              {/* Search Bar */}
              <div className="md:col-span-4 relative">
                <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search name, card no, department, gate..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-9 py-2.5 rounded-xl border border-slate-200 text-sm bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Role Filter */}
              <div className="md:col-span-2 relative">
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value as any)}
                  className="w-full pl-3.5 pr-9 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 bg-slate-50/80 focus:bg-white appearance-none cursor-pointer truncate"
                >
                  <option value="ALL">All Roles</option>
                  <option value="STUDENT">Student</option>
                  <option value="FACULTY">Faculty</option>
                  <option value="STAFF">Staff / Librarian</option>
                  <option value="ADMIN">Admin</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
              </div>

              {/* Department Filter */}
              <div className="md:col-span-3 relative">
                <select
                  value={selectedDepartment}
                  onChange={(e) => setSelectedDepartment(e.target.value)}
                  className="w-full pl-3.5 pr-9 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 bg-slate-50/80 focus:bg-white appearance-none cursor-pointer truncate"
                >
                  <option value="ALL">All Departments</option>
                  {departmentOptions.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
              </div>

              {/* Date Filter */}
              <div className="md:col-span-3 relative">
                <select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value as any)}
                  className="w-full pl-3.5 pr-9 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 bg-slate-50/80 focus:bg-white appearance-none cursor-pointer truncate"
                >
                  <option value="TODAY">Today's Visits ({todayStr})</option>
                  <option value="WEEK">Past 7 Days</option>
                  <option value="MONTH">This Month</option>
                  <option value="ALL">All Time History</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Attendance History Table */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
            {filteredHistory.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-[11px] font-extrabold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                      <th className="py-3.5 px-4">Member Name & Card</th>
                      <th className="py-3.5 px-4">Role & Dept</th>
                      <th className="py-3.5 px-4">Check-In Time</th>
                      <th className="py-3.5 px-4">Check-Out Time</th>
                      <th className="py-3.5 px-4">Duration</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4">Purpose & Method</th>
                      <th className="py-3.5 px-4">Library Location</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {filteredHistory.map((r) => {
                      const durationMins = r.durationMinutes || 0;
                      const hours = Math.floor(durationMins / 60);
                      const mins = durationMins % 60;
                      const durationStr =
                        r.status === 'IN_LIBRARY'
                          ? 'IN PROGRESS'
                          : hours > 0
                          ? `${hours}h ${mins}m`
                          : `${mins} mins`;

                      return (
                        <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3.5 px-4">
                            <div>
                              <p className="font-bold text-slate-900">{r.memberName}</p>
                              <p className="text-[11px] font-mono text-slate-500">{r.memberCardNo}</p>
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <div>
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                                  r.role === 'FACULTY'
                                    ? 'bg-purple-50 text-purple-700'
                                    : r.role === 'ADMIN'
                                    ? 'bg-amber-50 text-amber-700'
                                    : 'bg-blue-50 text-blue-700'
                                }`}
                              >
                                {r.role}
                              </span>
                              <p className="text-[11px] text-slate-500 truncate max-w-[140px] mt-0.5">
                                {r.department}
                              </p>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 font-mono text-slate-800 font-semibold whitespace-nowrap">{formatOnlyTimeInBracket(r.checkInTime)}</td>
                          <td className="py-3.5 px-4 font-mono text-slate-800 whitespace-nowrap">
                            {r.checkOutTime ? formatOnlyTimeInBracket(r.checkOutTime) : <span className="text-emerald-600 font-bold">Active In Library</span>}
                          </td>
                          <td className="py-3.5 px-4 font-mono font-bold text-slate-800">{formatStayDuration(r)}</td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                                r.status === 'IN_LIBRARY'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : r.status === 'COMPLETED'
                                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                  : r.status === 'AUTO_CHECK_OUT'
                                  ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                  : 'bg-slate-100 text-slate-700 border border-slate-200'
                              }`}
                              title={r.notes}
                            >
                              {r.status === 'IN_LIBRARY'
                                ? 'IN LIBRARY'
                                : r.status === 'AUTO_CHECK_OUT'
                                ? 'AUTO CHECK-OUT (10 PM)'
                                : r.status}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 space-y-0.5">
                            <p className="font-semibold text-slate-800 text-[11px]">
                              {r.purposeOfVisit || 'GENERAL_READING'}
                            </p>
                            <p className="text-[10px] text-slate-400 font-mono">Method: {r.verificationMethod}</p>
                          </td>
                          <td className="py-3.5 px-4 text-slate-600 text-[11px]">{r.entryGate || 'Main Gate'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-12 text-center text-slate-500 space-y-2">
                <Calendar className="h-10 w-10 text-slate-300 mx-auto" />
                <p className="font-bold text-slate-700">No attendance logs matched your filter parameters</p>
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setSelectedRole('ALL');
                    setSelectedDepartment('ALL');
                    setSelectedStatus('ALL');
                    setDateFilter('ALL');
                  }}
                  className="px-4 py-2 bg-blue-600 text-white font-bold text-xs rounded-xl hover:bg-blue-700 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="h-3.5 w-3.5" /> Clear Filters
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: ATTENDANCE ANALYTICS */}
      {activeTab === 'ANALYTICS' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-blue-600">
                <BarChart3 className="h-4 w-4" /> Role Attendance Breakdown
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between font-bold">
                  <span>Student Visits:</span>
                  <span className="text-blue-700">{studentVisitsCount}</span>
                </div>
                <div className="flex justify-between font-bold">
                  <span>Faculty Visits:</span>
                  <span className="text-purple-700">{facultyVisitsCount}</span>
                </div>
                <div className="flex justify-between font-bold">
                  <span>Staff / Admin Visits:</span>
                  <span className="text-amber-700">{staffVisitsCount}</span>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-emerald-600">
                <Zap className="h-4 w-4" /> Peak Visiting Hours
              </div>
              <p className="text-2xl font-extrabold text-slate-900 font-poppins">10:00 AM - 12:30 PM</p>
              <p className="text-xs text-slate-500">Highest daily library footfall recorded during morning study hours.</p>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-purple-600">
                <Building2 className="h-4 w-4" /> Top Attending Department
              </div>
              <p className="text-lg font-extrabold text-slate-900 font-poppins">Computer Science & Engineering</p>
              <p className="text-xs text-slate-500">48% of total weekly visitor attendance records.</p>
            </div>
          </div>
        </div>
      )}

      {/* MANUAL OVERRIDE DIALOG */}
      {showOverrideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-xl max-w-md w-full p-6 space-y-5 border border-slate-200">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base font-poppins flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-blue-600" /> Manual Attendance Override Entry
              </h3>
              <button
                onClick={() => setShowOverrideModal(false)}
                className="text-slate-400 hover:text-slate-700 font-bold text-xl cursor-pointer"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveOverride} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Member Name *</label>
                <input
                  type="text"
                  required
                  value={overrideForm.memberName}
                  onChange={(e) => setOverrideForm({ ...overrideForm, memberName: e.target.value })}
                  placeholder="e.g. Jayendra Majji"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Member Card No *</label>
                <input
                  type="text"
                  required
                  value={overrideForm.memberCardNo}
                  onChange={(e) => setOverrideForm({ ...overrideForm, memberCardNo: e.target.value })}
                  placeholder="e.g. STU-2026-7326"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Role</label>
                  <select
                    value={overrideForm.role}
                    onChange={(e) => setOverrideForm({ ...overrideForm, role: e.target.value as Role })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold"
                  >
                    <option value="STUDENT">Student</option>
                    <option value="FACULTY">Faculty</option>
                    <option value="STAFF">Staff</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Department</label>
                  <input
                    type="text"
                    value={overrideForm.department}
                    onChange={(e) => setOverrideForm({ ...overrideForm, department: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Check-In Timestamp (YYYY-MM-DD HH:mm)</label>
                <input
                  type="text"
                  value={overrideForm.checkInTime}
                  onChange={(e) => setOverrideForm({ ...overrideForm, checkInTime: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Administrative Notes</label>
                <input
                  type="text"
                  value={overrideForm.notes}
                  onChange={(e) => setOverrideForm({ ...overrideForm, notes: e.target.value })}
                  placeholder="Reason for manual entry..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowOverrideModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition-colors cursor-pointer"
                >
                  Save Override Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
