import React, { useState, useEffect, useMemo } from 'react';
import {
  UserCheck,
  UserX,
  Clock,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ShieldAlert,
  RotateCcw,
  Eye,
  Trash2,
  FileSpreadsheet,
  Users,
  GraduationCap,
  Briefcase,
  User,
  Shield,
  Phone,
  Mail,
  Building,
  Calendar,
  CreditCard,
  X,
  Check,
  Sparkles,
  Info,
  ChevronRight,
  Printer,
  FileText,
} from 'lucide-react';
import { libraryStore, getLocalDateStr } from '../../services/libraryStore.service';
import { MemberProfile, Role, UserStatus } from '../../types/library';
import { exportStyledExcelFile } from '../../utils/excelExport';
import { generateAuthorizedSealHtml } from '../../components/common/AuthorizedCirculationSeal';

export default function AccountApprovals() {
  const [state, setState] = useState(libraryStore.snapshot);
  const [activeTab, setActiveTab] = useState<'PENDING' | 'ACTIVE' | 'REJECTED' | 'SUSPENDED' | 'ALL'>('PENDING');
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [departmentFilter, setDepartmentFilter] = useState<string>('ALL');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modals state
  const [inspectingMember, setInspectingMember] = useState<MemberProfile | null>(null);
  const [approvingMember, setApprovingMember] = useState<MemberProfile | null>(null);
  const [assignedCardInput, setAssignedCardInput] = useState('');
  const [rejectingMember, setRejectingMember] = useState<MemberProfile | null>(null);
  const [rejectionReason, setRejectionReason] = useState('Incomplete or unverified enrollment details.');
  const [customRejectNote, setCustomRejectNote] = useState('');
  const [suspendingMember, setSuspendingMember] = useState<MemberProfile | null>(null);
  const [suspensionReason, setSuspensionReason] = useState('Administrative compliance review.');

  useEffect(() => {
    const sub = libraryStore.getObservable().subscribe(setState);
    return () => sub.unsubscribe();
  }, []);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const members = state.members || [];

  // Summary Metrics
  const pendingCount = useMemo(() => members.filter((m) => m.status === 'PENDING_APPROVAL').length, [members]);
  const activeCount = useMemo(() => members.filter((m) => m.status === 'ACTIVE' || m.status === 'APPROVED').length, [members]);
  const rejectedCount = useMemo(() => members.filter((m) => m.status === 'REJECTED').length, [members]);
  const suspendedCount = useMemo(() => members.filter((m) => m.status === 'SUSPENDED').length, [members]);
  const totalCount = members.length;

  const departmentsList = useMemo(() => {
    const set = new Set<string>();
    members.forEach((m) => {
      if (m.department) set.add(m.department);
    });
    return Array.from(set).sort();
  }, [members]);

  // Filtered list
  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      // Tab filter
      if (activeTab === 'PENDING' && m.status !== 'PENDING_APPROVAL') return false;
      if (activeTab === 'ACTIVE' && m.status !== 'ACTIVE' && m.status !== 'APPROVED') return false;
      if (activeTab === 'REJECTED' && m.status !== 'REJECTED') return false;
      if (activeTab === 'SUSPENDED' && m.status !== 'SUSPENDED') return false;

      // Role filter
      if (roleFilter !== 'ALL' && m.role !== roleFilter) return false;

      // Department filter
      if (departmentFilter !== 'ALL' && m.department !== departmentFilter) return false;

      // Search term
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const matches =
          (m.name && m.name.toLowerCase().includes(q)) ||
          (m.email && m.email.toLowerCase().includes(q)) ||
          (m.memberCardNo && m.memberCardNo.toLowerCase().includes(q)) ||
          (m.rollNo && m.rollNo.toLowerCase().includes(q)) ||
          (m.department && m.department.toLowerCase().includes(q)) ||
          (m.phone && m.phone.toLowerCase().includes(q));
        if (!matches) return false;
      }

      return true;
    });
  }, [members, activeTab, roleFilter, departmentFilter, searchTerm]);

  // Approve Handler
  const handleOpenApproveModal = (member: MemberProfile) => {
    const prefix = member.role === 'STUDENT' ? 'STU' : member.role === 'FACULTY' ? 'FAC' : member.role === 'STAFF' ? 'STF' : 'LIB';
    const autoCard = `${prefix}-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    setAssignedCardInput(member.memberCardNo && !member.memberCardNo.startsWith('APP-') ? member.memberCardNo : autoCard);
    setApprovingMember(member);
  };

  const handleConfirmApprove = () => {
    if (!approvingMember) return;
    const res = libraryStore.approveAccount(approvingMember.id, {
      memberCardNo: assignedCardInput,
      reviewerName: 'Chief Admin Librarian',
    });
    triggerToast(res.message);
    setApprovingMember(null);
    if (inspectingMember?.id === approvingMember.id) {
      setInspectingMember(null);
    }
  };

  // Reject Handler
  const handleOpenRejectModal = (member: MemberProfile) => {
    setRejectionReason('Incomplete or unverified enrollment details.');
    setCustomRejectNote('');
    setRejectingMember(member);
  };

  const handleConfirmReject = () => {
    if (!rejectingMember) return;
    const finalReason = customRejectNote.trim() ? `${rejectionReason} - ${customRejectNote.trim()}` : rejectionReason;
    const res = libraryStore.rejectAccount(rejectingMember.id, finalReason, 'Chief Admin Librarian');
    triggerToast(res.message);
    setRejectingMember(null);
    if (inspectingMember?.id === rejectingMember.id) {
      setInspectingMember(null);
    }
  };

  // Suspend Handler
  const handleOpenSuspendModal = (member: MemberProfile) => {
    setSuspensionReason('Administrative compliance review.');
    setSuspendingMember(member);
  };

  const handleConfirmSuspend = () => {
    if (!suspendingMember) return;
    const res = libraryStore.suspendAccount(suspendingMember.id, suspensionReason, 'Chief Admin Librarian');
    triggerToast(res.message);
    setSuspendingMember(null);
    if (inspectingMember?.id === suspendingMember.id) {
      setInspectingMember(null);
    }
  };

  // Reactivate Handler
  const handleReactivate = (member: MemberProfile) => {
    if (window.confirm(`Are you sure you want to restore active library privileges for "${member.name}" (${member.memberCardNo})?`)) {
      const res = libraryStore.reactivateAccount(member.id, 'Chief Admin Librarian');
      triggerToast(res.message);
      if (inspectingMember?.id === member.id) {
        setInspectingMember(null);
      }
    }
  };

  // Delete Handler
  const handleDelete = (member: MemberProfile) => {
    if (window.confirm(`Permanently remove account record for "${member.name}" (${member.email})? This action cannot be undone.`)) {
      const res = libraryStore.deleteMemberAccount(member.id);
      triggerToast(res.message);
      if (inspectingMember?.id === member.id) {
        setInspectingMember(null);
      }
    }
  };

  // Export Excel
  const handleExportExcel = () => {
    const headers = [
      'Account ID',
      'Full Name',
      'Email',
      'Role',
      'Status',
      'Library Card No',
      'Roll / Employee No',
      'Department',
      'Academic Batch',
      'Phone',
      'Gender',
      'Applied Date',
      'Approved Date',
      'Approved By',
      'Rejection Reason',
      'Suspension Reason',
      'Active Borrowed Books',
      'Max Books Allowed',
    ];

    const rows = filteredMembers.map((m) => [
      m.id,
      m.name,
      m.email,
      m.role,
      m.status,
      m.memberCardNo || 'N/A',
      m.rollNo || 'N/A',
      m.department || 'N/A',
      m.academicBatch || 'N/A',
      m.phone || 'N/A',
      m.gender || 'N/A',
      m.appliedDate || m.registeredDate,
      m.approvedDate || 'N/A',
      m.approvedBy || 'N/A',
      m.rejectionReason || '',
      m.suspendedReason || '',
      m.currentActiveLoans || 0,
      m.maxAllowedBooks || 5,
    ]);

    exportStyledExcelFile({
      filename: `library_account_approvals_ledger_${getLocalDateStr(new Date())}.xlsx`,
      sheetName: 'Account Approvals',
      headers,
      data: rows,
      themeColor: '1E3A8A',
    });

    triggerToast(`Exported ${filteredMembers.length} accounts to formatted Excel file.`);
  };

  const getRoleBadge = (role: Role) => {
    switch (role) {
      case 'ADMIN':
        return <span className="inline-flex items-center gap-1 text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200"><Shield className="w-3 h-3" /> Admin</span>;
      case 'FACULTY':
        return <span className="inline-flex items-center gap-1 text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200"><Briefcase className="w-3 h-3" /> Faculty</span>;
      case 'STAFF':
        return <span className="inline-flex items-center gap-1 text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200"><User className="w-3 h-3" /> Staff</span>;
      case 'STUDENT':
      default:
        return <span className="inline-flex items-center gap-1 text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200"><GraduationCap className="w-3 h-3" /> Student</span>;
    }
  };

  const getStatusBadge = (status: UserStatus) => {
    switch (status) {
      case 'PENDING_APPROVAL':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-extrabold px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-300 animate-pulse">
            <Clock className="w-3 h-3 text-amber-600" /> Pending Approval
          </span>
        );
      case 'ACTIVE':
      case 'APPROVED':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-extrabold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300">
            <CheckCircle className="w-3 h-3 text-emerald-600" /> Approved & Active
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-extrabold px-2.5 py-1 rounded-full bg-rose-50 text-rose-800 border border-rose-300">
            <XCircle className="w-3 h-3 text-rose-600" /> Rejected
          </span>
        );
      case 'SUSPENDED':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-extrabold px-2.5 py-1 rounded-full bg-red-100 text-red-900 border border-red-300">
            <ShieldAlert className="w-3 h-3 text-red-700" /> Suspended
          </span>
        );
      default:
        return <span className="text-[11px] font-semibold text-slate-500">{status}</span>;
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 flex items-center gap-2.5 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl border border-slate-700 text-xs font-bold animate-slideDown">
          <Sparkles className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-950 via-indigo-950 to-blue-900 p-6 sm:p-8 text-white shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-bold border border-blue-400/30">
              <UserCheck className="w-3.5 h-3.5" /> Identity & Access Control
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold font-poppins tracking-tight">
              Account Approvals
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm max-w-2xl">
              Review new self-service registration applications, verify institutional enrollment, grant borrowing privileges, and manage member credentials.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleExportExcel}
              className="px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/20 shadow-md transition-all flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" /> Export Excel
            </button>
          </div>
        </div>

        {/* Decorative subtle background shapes */}
        <div className="absolute right-0 top-0 -mr-16 -mt-16 w-80 h-80 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div
          onClick={() => setActiveTab('PENDING')}
          className={`p-4 sm:p-5 rounded-3xl border transition-all cursor-pointer ${
            activeTab === 'PENDING'
              ? 'bg-amber-500/10 border-amber-400 shadow-md shadow-amber-500/10 ring-2 ring-amber-400/20'
              : 'bg-white border-slate-200 hover:border-amber-300 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pending Review</span>
            <span className="p-2 rounded-2xl bg-amber-100 text-amber-700">
              <Clock className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-amber-700 font-poppins">{pendingCount}</span>
            {pendingCount > 0 && (
              <span className="text-[10px] font-extrabold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full animate-pulse">
                Needs Action
              </span>
            )}
          </div>
        </div>

        <div
          onClick={() => setActiveTab('ACTIVE')}
          className={`p-4 sm:p-5 rounded-3xl border transition-all cursor-pointer ${
            activeTab === 'ACTIVE'
              ? 'bg-emerald-500/10 border-emerald-400 shadow-md shadow-emerald-500/10 ring-2 ring-emerald-400/20'
              : 'bg-white border-slate-200 hover:border-emerald-300 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Approved & Active</span>
            <span className="p-2 rounded-2xl bg-emerald-100 text-emerald-700">
              <CheckCircle className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-emerald-700 font-poppins">{activeCount}</span>
          </div>
        </div>

        <div
          onClick={() => setActiveTab('REJECTED')}
          className={`p-4 sm:p-5 rounded-3xl border transition-all cursor-pointer ${
            activeTab === 'REJECTED'
              ? 'bg-rose-500/10 border-rose-400 shadow-md shadow-rose-500/10 ring-2 ring-rose-400/20'
              : 'bg-white border-slate-200 hover:border-rose-300 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Rejected Requests</span>
            <span className="p-2 rounded-2xl bg-rose-100 text-rose-700">
              <XCircle className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-rose-700 font-poppins">{rejectedCount}</span>
          </div>
        </div>

        <div
          onClick={() => setActiveTab('SUSPENDED')}
          className={`p-4 sm:p-5 rounded-3xl border transition-all cursor-pointer ${
            activeTab === 'SUSPENDED'
              ? 'bg-red-500/10 border-red-400 shadow-md shadow-red-500/10 ring-2 ring-red-400/20'
              : 'bg-white border-slate-200 hover:border-red-300 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Suspended</span>
            <span className="p-2 rounded-2xl bg-red-100 text-red-700">
              <ShieldAlert className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-red-700 font-poppins">{suspendedCount}</span>
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Tab Header */}
        <div className="border-b border-slate-200 p-4 sm:p-6 bg-slate-50/50 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('PENDING')}
              className={`px-4 py-2 rounded-2xl font-bold text-xs transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'PENDING'
                  ? 'bg-amber-600 text-white shadow-md shadow-amber-500/20'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Clock className="w-3.5 h-3.5" /> Pending Review
              {pendingCount > 0 && (
                <span className={`text-[10px] font-extrabold px-1.5 py-0.2 rounded-full ${
                  activeTab === 'PENDING' ? 'bg-amber-800 text-white' : 'bg-amber-100 text-amber-800'
                }`}>
                  {pendingCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('ACTIVE')}
              className={`px-4 py-2 rounded-2xl font-bold text-xs transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'ACTIVE'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <CheckCircle className="w-3.5 h-3.5" /> Approved & Active ({activeCount})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('REJECTED')}
              className={`px-4 py-2 rounded-2xl font-bold text-xs transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'REJECTED'
                  ? 'bg-rose-600 text-white shadow-md shadow-rose-500/20'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <XCircle className="w-3.5 h-3.5" /> Rejected ({rejectedCount})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('SUSPENDED')}
              className={`px-4 py-2 rounded-2xl font-bold text-xs transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'SUSPENDED'
                  ? 'bg-red-700 text-white shadow-md shadow-red-700/20'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5" /> Suspended ({suspendedCount})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('ALL')}
              className={`px-4 py-2 rounded-2xl font-bold text-xs transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'ALL'
                  ? 'bg-slate-900 text-white shadow-md'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Users className="w-3.5 h-3.5" /> All Accounts ({totalCount})
            </button>
          </div>
        </div>

        {/* Filters and Search Bar */}
        <div className="p-4 sm:p-6 border-b border-slate-100 bg-white grid grid-cols-1 sm:grid-cols-12 gap-3">
          <div className="sm:col-span-6 relative">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, institutional email, card ID, roll number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-slate-50/50"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-2.5 p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="sm:col-span-3">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full px-3 py-2.5 rounded-2xl border border-slate-200 text-xs font-semibold text-slate-700 bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="ALL">All Roles (Student, Faculty, Staff)</option>
              <option value="STUDENT">Students Only</option>
              <option value="FACULTY">Faculty Only</option>
              <option value="STAFF">Library Staff</option>
              <option value="ADMIN">Administrators</option>
            </select>
          </div>

          <div className="sm:col-span-3">
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="w-full px-3 py-2.5 rounded-2xl border border-slate-200 text-xs font-semibold text-slate-700 bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="ALL">All Departments</option>
              {departmentsList.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-4 sm:px-6">Applicant / Member</th>
                <th className="py-3.5 px-4">Role</th>
                <th className="py-3.5 px-4">ID / Card No</th>
                <th className="py-3.5 px-4">Department & Batch</th>
                <th className="py-3.5 px-4">Submission Date</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 sm:px-6 text-right">Review Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredMembers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400">
                    <UserCheck className="w-12 h-12 mx-auto mb-3 text-slate-300 opacity-60" />
                    <p className="font-bold text-sm text-slate-700">No accounts matching the selected criteria</p>
                    <p className="text-xs text-slate-400 mt-1">Try resetting search filters or check other tabs.</p>
                  </td>
                </tr>
              ) : (
                filteredMembers.map((member) => (
                  <tr key={member.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 sm:px-6">
                      <div className="flex items-center gap-3">
                        <img
                          src={member.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'}
                          alt={member.name}
                          className="w-10 h-10 rounded-2xl object-cover border border-slate-200 shrink-0 shadow-xs"
                        />
                        <div>
                          <div className="font-bold text-slate-900 flex items-center gap-1.5">
                            <span>{member.name}</span>
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono">{member.email}</div>
                          {member.phone && <div className="text-[10px] text-slate-400">{member.phone}</div>}
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">{getRoleBadge(member.role)}</td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="font-mono font-bold text-slate-800 text-[11px]">
                        {member.memberCardNo}
                      </div>
                      {member.rollNo && (
                        <div className="text-[10px] text-slate-500">Roll: {member.rollNo}</div>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-800 text-[11px] line-clamp-1">{member.department}</div>
                      <div className="text-[10px] text-slate-500">{member.academicBatch || member.program || '--'}</div>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap text-slate-600 text-[11px]">
                      {member.appliedDate || member.registeredDate}
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">{getStatusBadge(member.status)}</td>

                    <td className="py-3.5 px-4 sm:px-6 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Inspect Button */}
                        <button
                          type="button"
                          onClick={() => setInspectingMember(member)}
                          className="p-1.5 rounded-xl text-slate-600 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                          title="Inspect Application Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {/* Actions for Pending */}
                        {member.status === 'PENDING_APPROVAL' && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleOpenApproveModal(member)}
                              className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] shadow-xs transition-all flex items-center gap-1 cursor-pointer active:scale-95"
                              title="Approve & Activate"
                            >
                              <Check className="w-3.5 h-3.5" /> Approve
                            </button>

                            <button
                              type="button"
                              onClick={() => handleOpenRejectModal(member)}
                              className="px-2.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-[11px] border border-rose-200 transition-all flex items-center gap-1 cursor-pointer"
                              title="Reject Application"
                            >
                              <X className="w-3.5 h-3.5" /> Reject
                            </button>
                          </>
                        )}

                        {/* Actions for Active */}
                        {(member.status === 'ACTIVE' || member.status === 'APPROVED') && (
                          <button
                            type="button"
                            onClick={() => handleOpenSuspendModal(member)}
                            className="p-1.5 rounded-xl text-amber-600 hover:text-amber-800 hover:bg-amber-50 transition-colors cursor-pointer"
                            title="Suspend Privileges"
                          >
                            <ShieldAlert className="w-4 h-4" />
                          </button>
                        )}

                        {/* Actions for Suspended */}
                        {member.status === 'SUSPENDED' && (
                          <button
                            type="button"
                            onClick={() => handleReactivate(member)}
                            className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] shadow-xs transition-all flex items-center gap-1 cursor-pointer"
                            title="Reactivate Account"
                          >
                            <RotateCcw className="w-3.5 h-3.5" /> Reactivate
                          </button>
                        )}

                        {/* Delete Record */}
                        <button
                          type="button"
                          onClick={() => handleDelete(member)}
                          className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Delete Account Record"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ============================================================= */}
      {/* 1. INSPECT APPLICANT DOSSIER MODAL                            */}
      {/* ============================================================= */}
      {inspectingMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fadeIn overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-slate-100 space-y-6 animate-scaleUp my-auto max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <img
                  src={inspectingMember.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'}
                  alt={inspectingMember.name}
                  className="w-14 h-14 rounded-2xl object-cover border-2 border-slate-200 shadow-sm"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-slate-900 font-poppins">{inspectingMember.name}</h3>
                    {getRoleBadge(inspectingMember.role)}
                  </div>
                  <p className="text-xs text-slate-500 font-mono">{inspectingMember.email}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setInspectingMember(null)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Status Callout */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
              <span className="font-bold text-slate-600">Current Membership Status:</span>
              <span>{getStatusBadge(inspectingMember.status)}</span>
            </div>

            {inspectingMember.rejectionReason && (
              <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-800 space-y-1">
                <span className="font-bold flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5" /> Rejection Remarks:</span>
                <p className="text-[11px]">{inspectingMember.rejectionReason}</p>
              </div>
            )}

            {inspectingMember.suspendedReason && (
              <div className="p-3 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-800 space-y-1">
                <span className="font-bold flex items-center gap-1.5"><ShieldAlert className="w-3.5 h-3.5" /> Suspension Remarks:</span>
                <p className="text-[11px]">{inspectingMember.suspendedReason}</p>
              </div>
            )}

            {/* Information Grid */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Roll / Employee ID</span>
                <p className="font-bold text-slate-800 font-mono mt-0.5">{inspectingMember.rollNo || 'N/A'}</p>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Library Card ID</span>
                <p className="font-bold text-slate-800 font-mono mt-0.5">{inspectingMember.memberCardNo || 'PENDING'}</p>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Department</span>
                <p className="font-semibold text-slate-800 mt-0.5">{inspectingMember.department}</p>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Academic Batch / Level</span>
                <p className="font-semibold text-slate-800 mt-0.5">{inspectingMember.academicBatch || inspectingMember.program || 'N/A'}</p>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Phone Number</span>
                <p className="font-semibold text-slate-800 mt-0.5">{inspectingMember.phone || 'N/A'}</p>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Gender</span>
                <p className="font-semibold text-slate-800 mt-0.5">{inspectingMember.gender || 'Not Specified'}</p>
              </div>

              <div className="col-span-2 p-3 rounded-2xl bg-slate-50 border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Residential / Campus Address</span>
                <p className="font-semibold text-slate-800 mt-0.5">{inspectingMember.address || 'University Campus'}</p>
              </div>

              <div className="col-span-2 p-3 rounded-2xl bg-slate-50 border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Emergency Contact</span>
                <p className="font-semibold text-slate-800 mt-0.5">{inspectingMember.emergencyContact || 'N/A'}</p>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              {inspectingMember.status === 'PENDING_APPROVAL' && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      const m = inspectingMember;
                      setInspectingMember(null);
                      handleOpenRejectModal(m);
                    }}
                    className="px-4 py-2.5 rounded-2xl border border-rose-200 text-rose-700 hover:bg-rose-50 font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <X className="w-4 h-4" /> Reject Request
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const m = inspectingMember;
                      setInspectingMember(null);
                      handleOpenApproveModal(m);
                    }}
                    className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs shadow-md shadow-emerald-500/20 transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Check className="w-4 h-4" /> Approve & Issue Card
                  </button>
                </>
              )}

              {inspectingMember.status !== 'PENDING_APPROVAL' && (
                <button
                  type="button"
                  onClick={() => setInspectingMember(null)}
                  className="px-5 py-2.5 rounded-2xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition-all cursor-pointer"
                >
                  Close Dossier
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* 2. APPROVE ACCOUNT MODAL                                      */}
      {/* ============================================================= */}
      {approvingMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-100 space-y-5 animate-scaleUp">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-emerald-100 text-emerald-700">
                <CheckCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 font-poppins">Approve Library Membership</h3>
                <p className="text-xs text-slate-500">Assign library credentials and activate privileges</p>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-emerald-50/70 border border-emerald-200 text-xs text-emerald-900 space-y-1">
              <p>
                Approving <strong>{approvingMember.name}</strong> ({approvingMember.role}, {approvingMember.department}).
              </p>
              <p className="text-[11px] text-emerald-700">
                Max Loans Quota: <strong>{approvingMember.role === 'FACULTY' ? '10 Books (30 Days)' : approvingMember.role === 'STAFF' ? '8 Books (21 Days)' : '5 Books (14 Days)'}</strong>.
              </p>
            </div>

            <div className="space-y-1.5 text-xs">
              <label className="block font-bold text-slate-700">Official Library Card Number *</label>
              <input
                type="text"
                value={assignedCardInput}
                onChange={(e) => setAssignedCardInput(e.target.value)}
                placeholder="e.g. STU-2026-7326"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
              <p className="text-[10px] text-slate-400">Card number will be printed on physical badge and scannable barcode.</p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setApprovingMember(null)}
                className="px-4 py-2.5 rounded-2xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold text-xs transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmApprove}
                className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs shadow-md shadow-emerald-500/20 transition-all cursor-pointer"
              >
                Confirm Approval & Activate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* 3. REJECT ACCOUNT MODAL                                       */}
      {/* ============================================================= */}
      {rejectingMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-100 space-y-5 animate-scaleUp">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-rose-100 text-rose-700">
                <XCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 font-poppins">Reject Membership Request</h3>
                <p className="text-xs text-slate-500">Provide official reason for rejection notice</p>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-700">
              Applicant: <strong>{rejectingMember.name}</strong> ({rejectingMember.email})
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Standard Rejection Reason *</label>
                <select
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 font-semibold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                >
                  <option value="Incomplete or unverified enrollment details.">Incomplete or unverified enrollment details</option>
                  <option value="Institutional Roll Number / Employee ID does not match records.">Institutional Roll Number / Employee ID mismatch</option>
                  <option value="Duplicate membership application detected.">Duplicate membership application detected</option>
                  <option value="Applicant has outstanding dues / non-clearance from previous semester.">Outstanding dues from previous semester</option>
                  <option value="Invalid institutional email domain submitted.">Invalid institutional email domain</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Additional Specific Remarks (Optional)</label>
                <textarea
                  rows={2}
                  value={customRejectNote}
                  onChange={(e) => setCustomRejectNote(e.target.value)}
                  placeholder="Provide additional instructions for the applicant to rectify..."
                  className="w-full p-3 rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setRejectingMember(null)}
                className="px-4 py-2.5 rounded-2xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold text-xs transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                className="px-5 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md shadow-rose-500/20 transition-all cursor-pointer"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* 4. SUSPEND ACCOUNT MODAL                                      */}
      {/* ============================================================= */}
      {suspendingMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-100 space-y-5 animate-scaleUp">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-red-100 text-red-700">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 font-poppins">Suspend Member Privileges</h3>
                <p className="text-xs text-slate-500">Temporarily block borrowing & portal login</p>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-800">
              Suspending: <strong>{suspendingMember.name}</strong> ({suspendingMember.memberCardNo})
            </div>

            <div className="space-y-1.5 text-xs">
              <label className="block font-bold text-slate-700">Reason for Suspension *</label>
              <input
                type="text"
                value={suspensionReason}
                onChange={(e) => setSuspensionReason(e.target.value)}
                placeholder="e.g. Overdue fine non-payment exceeding 60 days"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500/20"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSuspendingMember(null)}
                className="px-4 py-2.5 rounded-2xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold text-xs transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSuspend}
                className="px-5 py-2.5 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-md shadow-red-500/20 transition-all cursor-pointer"
              >
                Suspend Membership
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
