import React, { useState, useEffect, useMemo } from 'react';
import {
  Award,
  Search,
  CheckCircle,
  AlertTriangle,
  Printer,
  Download,
  Filter,
  Users,
  BookOpen,
  IndianRupee,
  Sparkles,
  ShieldCheck,
  Building2,
  Calendar,
  X,
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  ArrowRight,
  RefreshCw,
  Eye,
  FileText,
  ThumbsUp,
  ThumbsDown,
  History,
} from 'lucide-react';
import { libraryStore, getLocalDateStr, getMemberPendingFines } from '../../services/libraryStore.service';
import { MemberProfile, NoDueCertificate, NoDueApplication, NoDueStatus, NoDuePurpose } from '../../types/library';
import { exportStyledExcelFile } from '../../utils/excelExport';
import NoDueCertificateModal from '../../components/common/NoDueCertificateModal';

export default function NoDueClearanceDesk() {
  const [state, setState] = useState(libraryStore.snapshot);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'APPLICATIONS' | 'STUDENTS'>('APPLICATIONS');
  const [statusFilter, setStatusFilter] = useState<'ALL' | NoDueStatus>('ALL');
  const [purposeFilter, setPurposeFilter] = useState<string>('ALL');
  const [selectedDept, setSelectedDept] = useState('ALL');
  const [selectedMemberForModal, setSelectedMemberForModal] = useState<MemberProfile | null>(null);
  const [selectedAppForModal, setSelectedAppForModal] = useState<NoDueApplication | null>(null);
  const [quickActionMsg, setQuickActionMsg] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    const sub = libraryStore.getObservable().subscribe(setState);
    return () => sub.unsubscribe();
  }, []);

  const triggerToast = (type: 'success' | 'error', message: string) => {
    setQuickActionMsg({ type, message });
    setTimeout(() => setQuickActionMsg(null), 4000);
  };

  const studentMembers = useMemo(() => {
    return (state.members || []).filter((m) => m.role === 'STUDENT');
  }, [state.members]);

  const applications = useMemo(() => {
    return state.noDueApplications || [];
  }, [state.noDueApplications]);

  // Compute live clearance audits
  const studentAudits = useMemo(() => {
    const map = new Map<string, ReturnType<typeof libraryStore.getMemberNoDueAudit>>();
    studentMembers.forEach((m) => {
      map.set(m.id, libraryStore.getMemberNoDueAudit(m.id));
    });
    return map;
  }, [studentMembers, state]);

  // KPI Metrics
  const telemetry = useMemo(() => {
    let pendingVerification = 0;
    let approvedOrIssued = 0;
    let rejectedCount = 0;

    applications.forEach((a) => {
      if (a.status === 'SUBMITTED' || a.status === 'UNDER_VERIFICATION') pendingVerification++;
      if (a.status === 'APPROVED' || a.status === 'CERTIFICATE_ISSUED') approvedOrIssued++;
      if (a.status === 'REJECTED') rejectedCount++;
    });

    let studentEligible = 0;
    studentMembers.forEach((m) => {
      const audit = studentAudits.get(m.id);
      if (audit?.isEligible) studentEligible++;
    });

    return {
      totalApplications: applications.length,
      pendingVerification,
      approvedOrIssued,
      rejectedCount,
      totalStudents: studentMembers.length,
      studentEligible,
    };
  }, [applications, studentMembers, studentAudits]);

  // Filtered Applications List
  const filteredApplications = useMemo(() => {
    return applications.filter((app) => {
      if (statusFilter !== 'ALL' && app.status !== statusFilter) return false;
      if (purposeFilter !== 'ALL' && app.purpose !== purposeFilter) return false;
      if (selectedDept !== 'ALL' && app.department !== selectedDept) return false;

      if (searchTerm) {
        const q = searchTerm.toLowerCase().trim();
        const matches =
          app.studentName.toLowerCase().includes(q) ||
          app.applicationNo.toLowerCase().includes(q) ||
          app.rollNo.toLowerCase().includes(q) ||
          app.libraryMembershipId.toLowerCase().includes(q) ||
          (app.certificateNo && app.certificateNo.toLowerCase().includes(q));
        if (!matches) return false;
      }
      return true;
    });
  }, [applications, statusFilter, purposeFilter, selectedDept, searchTerm]);

  // Filtered Students List
  const filteredStudents = useMemo(() => {
    return studentMembers.filter((m) => {
      const audit = studentAudits.get(m.id);
      if (!audit) return false;

      if (selectedDept !== 'ALL' && m.department !== selectedDept) return false;

      if (searchTerm) {
        const q = searchTerm.toLowerCase().trim();
        const matches =
          m.name.toLowerCase().includes(q) ||
          m.memberCardNo.toLowerCase().includes(q) ||
          (m.rollNo && m.rollNo.toLowerCase().includes(q)) ||
          (m.department && m.department.toLowerCase().includes(q));
        if (!matches) return false;
      }

      return true;
    });
  }, [studentMembers, studentAudits, selectedDept, searchTerm]);

  // Unique Departments
  const departments = useMemo(() => {
    const set = new Set<string>();
    studentMembers.forEach((m) => {
      if (m.department) set.add(m.department);
    });
    return Array.from(set);
  }, [studentMembers]);

  const handleQuickVerify = (app: NoDueApplication) => {
    const res = libraryStore.verifyNoDueApplication(app.id, 'Dr. M. S. Ramanujan (Chief Admin Librarian)');
    if (res.success) {
      triggerToast('success', `Application ${app.applicationNo} verified.`);
    }
  };

  const handleQuickApprove = (app: NoDueApplication) => {
    const res = libraryStore.approveNoDueApplication(
      app.id,
      'Approved and certified by Head of Library Department upon database audit.',
      'Dr. M. S. Ramanujan (Chief Admin Librarian & Head of Library)'
    );
    if (res.success) {
      triggerToast('success', res.message);
    } else {
      triggerToast('error', res.message);
    }
  };

  const handleOpenModalForApp = (app: NoDueApplication) => {
    const member = studentMembers.find(
      (m) => m.id === app.studentId || m.memberCardNo.toLowerCase() === app.libraryMembershipId.toLowerCase()
    );
    if (member) {
      setSelectedMemberForModal(member);
      setSelectedAppForModal(app);
    }
  };

  const handleOpenModalForStudent = (student: MemberProfile) => {
    const app = applications.find(
      (a) => a.studentId === student.id || a.libraryMembershipId.toLowerCase() === student.memberCardNo.toLowerCase()
    );
    setSelectedMemberForModal(student);
    setSelectedAppForModal(app || null);
  };

  // Export Clearance Registry to Excel
  const handleExportExcel = () => {
    const headers = [
      'Application Ref No',
      'Student Name',
      'Roll / Registration No',
      'Library Card ID',
      'Department',
      'Program',
      'Batch',
      'Purpose',
      'Application Date',
      'Status',
      'Active Borrowed Books',
      'Pending Fines (INR)',
      'Certificate Ref No',
      'Verified By',
      'Remarks',
    ];

    const rows = filteredApplications.map((a) => {
      const audit = libraryStore.getMemberNoDueAudit(a.studentId || a.libraryMembershipId);
      return [
        a.applicationNo,
        a.studentName,
        a.rollNo,
        a.libraryMembershipId,
        a.department,
        a.program,
        a.batch,
        a.purpose.replace(/_/g, ' '),
        a.applicationDate,
        a.status,
        audit.activeLoansCount,
        `₹${audit.pendingFinesAmount.toFixed(2)}`,
        a.certificateNo || 'N/A',
        a.verifiedBy || 'Pending',
        a.adminRemarks || '',
      ];
    });

    exportStyledExcelFile({
      filename: `university_library_no_due_applications_register_${getLocalDateStr(new Date())}.xlsx`,
      sheetName: 'No Due Applications',
      headers,
      data: rows,
      themeColor: '1E3A8A', // Deep Navy Blue
    });
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-950 via-indigo-950 to-blue-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-widest text-amber-300 bg-white/10 px-3.5 py-1 rounded-full border border-white/10 shadow-2xs">
            <Award className="h-4 w-4" /> University Central Library Clearance Division
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold font-poppins tracking-tight">
            Library No Due Clearance & Certificate Desk
          </h1>
          <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
            Verify book returns, clear overdue fine liabilities, approve student clearance applications, and generate official signed Library No Due Certificates (NDC).
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExportExcel}
            className="px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer"
          >
            <Download className="h-4 w-4 text-emerald-400" /> Export Applications Excel ({filteredApplications.length})
          </button>
        </div>
      </div>

      {quickActionMsg && (
        <div
          className={`p-4 rounded-2xl text-xs font-bold flex items-center gap-2 animate-fade-in ${
            quickActionMsg.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border border-rose-200 text-rose-900'
          }`}
        >
          {quickActionMsg.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
          )}
          <span>{quickActionMsg.message}</span>
        </div>
      )}

      {/* Live Telemetry KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Applications</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <FileText className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold font-poppins text-slate-900">{telemetry.totalApplications}</p>
          <p className="text-xs text-slate-500 font-medium">Submitted student requests</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-amber-200 bg-amber-50/20 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-700">Pending Review</span>
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold font-poppins text-amber-900">{telemetry.pendingVerification}</p>
          <p className="text-xs text-amber-700 font-medium">Submitted / Under verification</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-emerald-200 bg-emerald-50/20 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">Certificates Issued</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <ShieldCheck className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold font-poppins text-emerald-900">{telemetry.approvedOrIssued}</p>
          <p className="text-xs text-emerald-600 font-medium">Approved by Head of Library</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-blue-200 bg-blue-50/20 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-700">Clearance Ready</span>
            <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
              <CheckCircle className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold font-poppins text-blue-900">{telemetry.studentEligible}</p>
          <p className="text-xs text-blue-600 font-medium">0 Borrowings & ₹0 Fines verified</p>
        </div>
      </div>

      {/* Main Control Panel: Mode Toggle, Tabs & Filters */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* View Mode Toggle */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-2xl shrink-0">
            <button
              onClick={() => setViewMode('APPLICATIONS')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'APPLICATIONS'
                  ? 'bg-white text-purple-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Clearance Applications Queue ({applications.length})
            </button>
            <button
              onClick={() => setViewMode('STUDENTS')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'STUDENTS'
                  ? 'bg-white text-purple-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Graduating Students Registry ({studentMembers.length})
            </button>
          </div>

          {/* Filters on Right */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Status Filter */}
            {viewMode === 'APPLICATIONS' && (
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 bg-slate-50 focus:bg-white cursor-pointer"
              >
                <option value="ALL">All Statuses ({applications.length})</option>
                <option value="SUBMITTED">Submitted ({applications.filter((a) => a.status === 'SUBMITTED').length})</option>
                <option value="UNDER_VERIFICATION">Under Verification ({applications.filter((a) => a.status === 'UNDER_VERIFICATION').length})</option>
                <option value="APPROVED">Approved ({applications.filter((a) => a.status === 'APPROVED').length})</option>
                <option value="CERTIFICATE_ISSUED">Certificate Issued ({applications.filter((a) => a.status === 'CERTIFICATE_ISSUED').length})</option>
                <option value="REJECTED">Rejected ({applications.filter((a) => a.status === 'REJECTED').length})</option>
              </select>
            )}

            {/* Purpose Filter */}
            {viewMode === 'APPLICATIONS' && (
              <select
                value={purposeFilter}
                onChange={(e) => setPurposeFilter(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 bg-slate-50 focus:bg-white cursor-pointer max-w-[180px] truncate"
              >
                <option value="ALL">All Clearance Purposes</option>
                <option value="COURSE_COMPLETION">Course Completion</option>
                <option value="COLLEGE_TRANSFER">College Transfer</option>
                <option value="SEMESTER_CLEARANCE">Semester Clearance</option>
                <option value="INTERNSHIP_PROJECT">Internship / Project</option>
                <option value="EXAM_HALL_TICKET">Exam Hall Ticket</option>
                <option value="HOSTEL_CLEARANCE">Hostel Clearance</option>
              </select>
            )}

            {/* Department Filter */}
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 bg-slate-50 focus:bg-white cursor-pointer max-w-[170px] truncate"
            >
              <option value="ALL">All Academic Departments</option>
              {departments.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative pt-1">
          <Search className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder={
              viewMode === 'APPLICATIONS'
                ? 'Search application ref, student name, roll no, card ID, or certificate ID...'
                : 'Search student candidate by name, roll no, card ID, or department...'
            }
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-2xl border border-slate-200 text-xs font-bold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* VIEW MODE 1: APPLICATIONS QUEUE TABLE */}
      {viewMode === 'APPLICATIONS' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-gradient-to-r from-purple-50 via-slate-50 to-purple-50 border-b border-slate-200 text-slate-700 font-extrabold uppercase tracking-wider text-[11px]">
                  <th className="py-3.5 px-4 w-[28%]">Application & Student</th>
                  <th className="py-3.5 px-4 w-[18%]">Clearance Purpose</th>
                  <th className="py-3.5 px-4 w-[18%]">Live Dues Check</th>
                  <th className="py-3.5 px-4 w-[14%]">Application Status</th>
                  <th className="py-3.5 px-4 w-[10%]">Certificate Ref</th>
                  <th className="py-3.5 px-4 w-[12%] text-right">Actions (Head of Library)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                {filteredApplications.map((app) => {
                  const audit = libraryStore.getMemberNoDueAudit(app.studentId || app.libraryMembershipId);
                  const isReady = audit.isEligible;
                  const isIssued = app.status === 'CERTIFICATE_ISSUED';

                  return (
                    <tr key={app.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-purple-50 border border-purple-100 text-purple-700 font-bold flex items-center justify-center shrink-0">
                            {app.studentName.charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900">{app.studentName}</p>
                            <p className="text-[11px] text-slate-500 font-mono">
                              Ref: <strong className="text-purple-700">{app.applicationNo}</strong> • Roll: {app.rollNo}
                            </p>
                            <p className="text-[10.5px] text-slate-400">{app.department}</p>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-bold text-slate-900 block">
                          {app.purpose.replace(/_/g, ' ')}
                        </span>
                        <span className="text-[10.5px] text-slate-400 font-mono block">
                          Applied: {app.applicationDate}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        {isIssued ? (
                          <div className="space-y-1">
                            <span className="text-[10.5px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 block w-max">
                              ✓ 0 Books Out (Cleared)
                            </span>
                            <span className="text-[10.5px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 block w-max">
                              ✓ ₹0.00 Fine Dues (Nil)
                            </span>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <div>
                              {audit.activeLoansCount === 0 ? (
                                <span className="text-[10.5px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                                  ✓ 0 Books Borrowed
                                </span>
                              ) : (
                                <span className="text-[10.5px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                                  ⚠ {audit.activeLoansCount} Books Out
                                </span>
                              )}
                            </div>
                            <div>
                              {audit.pendingFinesAmount === 0 ? (
                                <span className="text-[10.5px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                                  ✓ ₹0.00 Fine Dues
                                </span>
                              ) : (
                                <span className="text-[10.5px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                                  ⚠ ₹{audit.pendingFinesAmount.toFixed(2)} Fine Unpaid
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        {app.status === 'CERTIFICATE_ISSUED' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-900 font-extrabold text-[11px] border border-emerald-300 shadow-2xs">
                            <ShieldCheck className="h-3.5 w-3.5 text-emerald-700" /> CERTIFICATE ISSUED
                          </span>
                        )}
                        {app.status === 'APPROVED' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-100 text-blue-900 font-extrabold text-[11px] border border-blue-300 shadow-2xs">
                            <Sparkles className="h-3.5 w-3.5 text-blue-700" /> APPROVED
                          </span>
                        )}
                        {app.status === 'UNDER_VERIFICATION' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 text-blue-800 font-extrabold text-[11px] border border-blue-200">
                            <Clock className="h-3.5 w-3.5 text-blue-600" /> UNDER VERIFICATION
                          </span>
                        )}
                        {app.status === 'SUBMITTED' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 font-extrabold text-[11px] border border-amber-300">
                            <Clock className="h-3.5 w-3.5 text-amber-700" /> SUBMITTED
                          </span>
                        )}
                        {app.status === 'REJECTED' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-100 text-rose-900 font-extrabold text-[11px] border border-rose-300">
                            <AlertTriangle className="h-3.5 w-3.5 text-rose-700" /> REJECTED
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 font-mono font-bold text-purple-700">
                        {app.certificateNo || <span className="text-slate-400 font-sans font-normal">—</span>}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {app.status === 'SUBMITTED' && (
                            <button
                              type="button"
                              onClick={() => handleQuickVerify(app)}
                              className="px-2.5 py-1 rounded-lg border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs cursor-pointer flex items-center gap-1"
                              title="Perform live database verification"
                            >
                              <RefreshCw className="h-3 w-3" /> Verify
                            </button>
                          )}

                          {app.status !== 'CERTIFICATE_ISSUED' && isReady && (
                            <button
                              type="button"
                              onClick={() => handleQuickApprove(app)}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs cursor-pointer flex items-center gap-1"
                              title="Approve and issue certificate"
                            >
                              <ThumbsUp className="h-3 w-3" /> Approve & Issue
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleOpenModalForApp(app)}
                            className="px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800 font-bold text-xs cursor-pointer flex items-center gap-1 shadow-2xs"
                          >
                            {isIssued ? (
                              <>
                                <Printer className="h-3.5 w-3.5 text-emerald-600" /> Print Certificate
                              </>
                            ) : (
                              <>
                                <Eye className="h-3.5 w-3.5 text-purple-600" /> View / Process
                              </>
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {filteredApplications.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      No clearance applications match the selected filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW MODE 2: ALL GRADUATING STUDENTS REGISTRY */}
      {viewMode === 'STUDENTS' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-gradient-to-r from-indigo-50 via-slate-100 to-indigo-50 border-b border-slate-200 text-slate-700 font-extrabold uppercase tracking-wider text-[11px]">
                  <th className="py-3.5 px-4">Student Candidate</th>
                  <th className="py-3.5 px-4">Department & Batch</th>
                  <th className="py-3.5 px-4">Active Borrowings</th>
                  <th className="py-3.5 px-4">Fine Dues</th>
                  <th className="py-3.5 px-4">Clearance Status</th>
                  <th className="py-3.5 px-4 text-right">Actions (Head of Library)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredStudents.map((student) => {
                  const audit = studentAudits.get(student.id);
                  const isIssued = Boolean(audit?.existingCertificate && audit.existingCertificate.status === 'ISSUED');
                  const isEligible = audit?.isEligible;

                  return (
                    <tr key={student.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-700 font-bold flex items-center justify-center shrink-0">
                            {student.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900">{student.name}</p>
                            <p className="text-[11px] text-slate-500 font-mono">
                              Roll: {student.rollNo || 'N/A'} • Card: {student.memberCardNo}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <p className="font-semibold text-slate-800">{student.department}</p>
                        <p className="text-[11px] text-slate-500">Batch: {student.academicBatch || '2022 - 2026'}</p>
                      </td>

                      <td className="py-3.5 px-4">
                        {audit && audit.activeLoansCount === 0 ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold text-[11px]">
                            <CheckCircle className="h-3 w-3 text-emerald-600" /> 0 (CLEARED)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-50 text-rose-800 border border-rose-200 font-bold text-[11px]">
                            <AlertTriangle className="h-3 w-3 text-rose-600" /> {audit?.activeLoansCount} Books Out
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        {audit && audit.pendingFinesAmount === 0 ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold text-[11px]">
                            ₹0.00 (NIL)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-50 text-rose-800 border border-rose-200 font-bold text-[11px]">
                            ₹{(audit?.pendingFinesAmount || 0).toFixed(2)} (UNPAID)
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        {(() => {
                          const studentApp = applications.find(
                            (a) => a.studentId === student.id || a.libraryMembershipId.toLowerCase() === student.memberCardNo.toLowerCase()
                          );
                          if (studentApp?.status === 'CERTIFICATE_ISSUED') {
                            return (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-900 font-extrabold text-[11px] border border-emerald-300">
                                <ShieldCheck className="h-3.5 w-3.5 text-emerald-700" /> CERTIFIED
                              </span>
                            );
                          }
                          if (studentApp) {
                            return (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-100 text-blue-900 font-extrabold text-[11px] border border-blue-300">
                                <Clock className="h-3.5 w-3.5 text-blue-700" /> REQUESTED ({studentApp.status.replace(/_/g, ' ')})
                              </span>
                            );
                          }
                          return (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 font-semibold text-[11px] border border-slate-200">
                              NO REQUEST YET
                            </span>
                          );
                        })()}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        {(() => {
                          const studentApp = applications.find(
                            (a) => a.studentId === student.id || a.libraryMembershipId.toLowerCase() === student.memberCardNo.toLowerCase()
                          );
                          if (studentApp) {
                            return (
                              <button
                                type="button"
                                onClick={() => handleOpenModalForStudent(student)}
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs transition-all shadow-2xs cursor-pointer ${
                                  studentApp.status === 'CERTIFICATE_ISSUED'
                                    ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200'
                                    : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200'
                                }`}
                              >
                                {studentApp.status === 'CERTIFICATE_ISSUED' ? (
                                  <>
                                    <Printer className="h-3.5 w-3.5 text-emerald-600" /> Print Certificate
                                  </>
                                ) : (
                                  <>
                                    <Award className="h-3.5 w-3.5" /> Process Request
                                  </>
                                )}
                              </button>
                            );
                          }
                          return (
                            <span
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-50 text-slate-400 font-medium text-[11px] border border-slate-200 cursor-not-allowed"
                              title="The student has not applied for No Due Certificate yet. A certificate can only be issued after the student requests clearance."
                            >
                              <Clock className="h-3 w-3 text-slate-400" /> Awaiting Request
                            </span>
                          );
                        })()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Certificate / Verification Modal */}
      {selectedMemberForModal && (
        <NoDueCertificateModal
          isOpen={Boolean(selectedMemberForModal)}
          onClose={() => {
            setSelectedMemberForModal(null);
            setSelectedAppForModal(null);
          }}
          member={selectedMemberForModal}
          application={selectedAppForModal}
          isAdminView={true}
        />
      )}
    </div>
  );
}
