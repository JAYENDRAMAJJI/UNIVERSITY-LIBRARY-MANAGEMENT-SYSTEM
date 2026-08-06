import React, { useState, useEffect, useMemo } from 'react';
import {
  ShieldCheck,
  UserCheck,
  Lock,
  Unlock,
  Key,
  Plus,
  Search,
  Filter,
  X,
  RotateCcw,
  Shield,
  CheckCircle2,
  AlertCircle,
  UserPlus,
  SlidersHorizontal,
  Sparkles,
  Info,
  Users,
  Check,
  Building2,
  FileSpreadsheet,
} from 'lucide-react';
import { libraryStore } from '../../services/libraryStore.service';
import { Role, UserStatus, MemberProfile } from '../../types/library';
import RegisterAccountModal from '../../components/common/RegisterAccountModal';

export default function UsersManagement() {
  const [state, setState] = useState(libraryStore.snapshot);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterDepartment, setFilterDepartment] = useState<string>('ALL');
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [resetPassModalUser, setResetPassModalUser] = useState<MemberProfile | null>(null);
  const [generatedTempPass, setGeneratedTempPass] = useState<string>('');
  const [passCopied, setPassCopied] = useState(false);
  const [showRbacMatrix, setShowRbacMatrix] = useState(false);

  useEffect(() => {
    const sub = libraryStore.getObservable().subscribe(setState);
    return () => sub.unsubscribe();
  }, []);

  // Dynamically extract unique departments for filter dropdown
  const uniqueDepartments = useMemo(() => {
    const deps = new Set<string>();
    state.members.forEach((m) => {
      if (m.department) deps.add(m.department);
    });
    return Array.from(deps).sort();
  }, [state.members]);

  // Search and Filter Logic
  const filteredMembers = useMemo(() => {
    return state.members.filter((m) => {
      const searchLower = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !searchLower ||
        m.name.toLowerCase().includes(searchLower) ||
        m.email.toLowerCase().includes(searchLower) ||
        (m.memberCardNo && m.memberCardNo.toLowerCase().includes(searchLower)) ||
        (m.department && m.department.toLowerCase().includes(searchLower));

      const matchesRole = filterRole === 'ALL' || m.role === filterRole;
      const matchesStatus = filterStatus === 'ALL' || (m.status || 'ACTIVE') === filterStatus;
      const matchesDepartment = filterDepartment === 'ALL' || m.department === filterDepartment;

      return matchesSearch && matchesRole && matchesStatus && matchesDepartment;
    });
  }, [state.members, searchTerm, filterRole, filterStatus, filterDepartment]);

  const hasActiveFilters = searchTerm !== '' || filterRole !== 'ALL' || filterStatus !== 'ALL' || filterDepartment !== 'ALL';

  const handleResetFilters = () => {
    setSearchTerm('');
    setFilterRole('ALL');
    setFilterStatus('ALL');
    setFilterDepartment('ALL');
  };

  const handleRoleChange = (memberId: string, newRole: Role) => {
    libraryStore.updateMemberProfile(memberId, { role: newRole });
  };

  const handleStatusChange = (memberId: string, newStatus: UserStatus) => {
    libraryStore.updateMemberProfile(memberId, { status: newStatus });
  };

  const handleOpenResetPassword = (user: MemberProfile) => {
    setResetPassModalUser(user);
    const tempPass = `Reset#${Math.floor(100000 + Math.random() * 900000)}!`;
    setGeneratedTempPass(tempPass);
    setPassCopied(false);
  };

  const handleCopyPassword = () => {
    if (generatedTempPass) {
      navigator.clipboard.writeText(generatedTempPass);
      setPassCopied(true);
      setTimeout(() => setPassCopied(false), 2500);
    }
  };

  // Stats calculation
  const totalUsers = state.members.length;
  const activeCount = state.members.filter((m) => (m.status || 'ACTIVE') === 'ACTIVE').length;
  const adminStaffCount = state.members.filter((m) => m.role === 'ADMIN' || m.role === 'STAFF').length;
  const restrictedCount = state.members.filter((m) => (m.status || 'ACTIVE') === 'SUSPENDED' || (m.status || 'ACTIVE') === 'INACTIVE').length;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-700 bg-slate-100 px-3 py-1 rounded-full mb-2">
            <ShieldCheck className="h-3.5 w-3.5 text-blue-600" /> User Roles & System Security
          </div>
          <h1 className="text-2xl font-bold font-poppins text-slate-900">User Accounts & Role Permissions</h1>
          <p className="text-sm text-slate-500 mt-1">Configure role privileges (Admin, Staff, Faculty, Student, Guest) and manage system security accounts.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowRbacMatrix(!showRbacMatrix)}
            className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold text-xs transition-all flex items-center gap-2"
          >
            <Shield className="h-4 w-4 text-indigo-600" /> {showRbacMatrix ? 'Hide Role Matrix' : 'View Permissions Matrix'}
          </button>
          <button
            onClick={() => setIsRegisterModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-xs shadow-sm hover:opacity-95 transition-all flex items-center gap-2"
          >
            <UserPlus className="h-4 w-4" /> Register New Account
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Total Accounts</p>
            <p className="text-xl font-bold text-slate-900">{totalUsers}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <UserCheck className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Active Status</p>
            <p className="text-xl font-bold text-slate-900">{activeCount}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Admins & Staff</p>
            <p className="text-xl font-bold text-slate-900">{adminStaffCount}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <Lock className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Restricted / Suspended</p>
            <p className="text-xl font-bold text-slate-900">{restrictedCount}</p>
          </div>
        </div>
      </div>

      {/* RBAC Role Privileges Matrix Drawer */}
      {showRbacMatrix && (
        <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-md border border-slate-800 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-400" />
              <h3 className="font-bold text-base font-poppins">User Roles & Permissions Matrix</h3>
            </div>
            <button onClick={() => setShowRbacMatrix(false)} className="text-slate-400 hover:text-white text-xs font-semibold flex items-center gap-1">
              <X className="h-4 w-4" /> Close
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
            <div className="bg-slate-800/70 p-4 rounded-xl border border-slate-700 space-y-2">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-blue-500/20 text-blue-300 border border-blue-500/30">ADMIN</span>
                <span className="font-bold text-white">System Admin</span>
              </div>
              <ul className="space-y-1 text-slate-300 list-disc list-inside text-[11px]">
                <li>Full access to system settings & user roles</li>
                <li>Catalog, Categories, Publishers management</li>
                <li>Issue, Return & Extend Book Time</li>
                <li>Fine collection & Waiver authority</li>
                <li>Procurement approvals & CSV Import</li>
              </ul>
            </div>
            <div className="bg-slate-800/70 p-4 rounded-xl border border-slate-700 space-y-2">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-purple-500/20 text-purple-300 border border-purple-500/30">STAFF</span>
                <span className="font-bold text-white">Library Staff</span>
              </div>
              <ul className="space-y-1 text-slate-300 list-disc list-inside text-[11px]">
                <li>Circulation desk operations</li>
                <li>Book issue & return processing</li>
                <li>Member profile updates & ID cards</li>
                <li>Inventory rack and shelf management</li>
                <li>Overdue notifications dispatch</li>
              </ul>
            </div>
            <div className="bg-slate-800/70 p-4 rounded-xl border border-slate-700 space-y-2">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">FACULTY</span>
                <span className="font-bold text-white">Faculty Member</span>
              </div>
              <ul className="space-y-1 text-slate-300 list-disc list-inside text-[11px]">
                <li>OPAC search & digital resource downloads</li>
                <li>Higher borrowing limits (Up to 10 books)</li>
                <li>Extended borrowing period (30 days)</li>
                <li>Book procurement acquisition requests</li>
                <li>Reservations queue priority</li>
              </ul>
            </div>
            <div className="bg-slate-800/70 p-4 rounded-xl border border-slate-700 space-y-2">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-sky-500/20 text-sky-300 border border-sky-500/30">STUDENT</span>
                <span className="font-bold text-white">Student Account</span>
              </div>
              <ul className="space-y-1 text-slate-300 list-disc list-inside text-[11px]">
                <li>Standard borrowing (Up to 5 books)</li>
                <li>Digital library repository access</li>
                <li>Hold & reservation requests</li>
                <li>Personal fine history & receipts</li>
                <li>Self-service online renewals</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* SEARCH AND FILTER SECTION */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-blue-600" />
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Search & Filter Accounts</h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
              Showing {filteredMembers.length} of {totalUsers} Accounts
            </span>
            {hasActiveFilters && (
              <button
                onClick={handleResetFilters}
                className="text-xs text-rose-600 hover:text-rose-700 font-bold flex items-center gap-1 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-100 transition-colors"
              >
                <RotateCcw className="h-3 w-3" /> Reset Filters
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Search Bar Input */}
          <div className="md:col-span-5 relative">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search user name, email, card ID, or department..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-9 py-2.5 rounded-xl border border-slate-200 text-sm bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* System Role Filter */}
          <div className="md:col-span-3">
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-700"
            >
              <option value="ALL">All System Roles</option>
              <option value="ADMIN">ADMIN - System Authority</option>
              <option value="STAFF">STAFF - Library Desk</option>
              <option value="FACULTY">FACULTY - Professor / Staff</option>
              <option value="STUDENT">STUDENT - Undergraduate / Scholar</option>
              <option value="GUEST">GUEST - Temporary Reader</option>
            </select>
          </div>

          {/* Account Status Filter */}
          <div className="md:col-span-2">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-700"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="SUSPENDED">SUSPENDED</option>
              <option value="PENDING_APPROVAL">PENDING APPROVAL</option>
              <option value="INACTIVE">INACTIVE</option>
            </select>
          </div>

          {/* Department Filter */}
          <div className="md:col-span-2">
            <select
              value={filterDepartment}
              onChange={(e) => setFilterDepartment(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-700"
            >
              <option value="ALL">All Departments</option>
              {uniqueDepartments.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Active Filter Badges */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100 text-xs">
            <span className="text-slate-400 font-medium">Active Filters:</span>
            {searchTerm && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 font-semibold border border-blue-100">
                Search: "{searchTerm}"
                <button onClick={() => setSearchTerm('')} className="hover:text-blue-900">
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {filterRole !== 'ALL' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 font-semibold border border-indigo-100">
                Role: {filterRole}
                <button onClick={() => setFilterRole('ALL')} className="hover:text-indigo-900">
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {filterStatus !== 'ALL' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 font-semibold border border-emerald-100">
                Status: {filterStatus}
                <button onClick={() => setFilterStatus('ALL')} className="hover:text-emerald-900">
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {filterDepartment !== 'ALL' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 font-semibold border border-amber-100">
                Dept: {filterDepartment}
                <button onClick={() => setFilterDepartment('ALL')} className="hover:text-amber-900">
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
          </div>
        )}
      </div>

      {/* USER ACCOUNTS TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {filteredMembers.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4">User Details</th>
                  <th className="py-3.5 px-4">Email Address</th>
                  <th className="py-3.5 px-4">Department</th>
                  <th className="py-3.5 px-4">Assigned System Role</th>
                  <th className="py-3.5 px-4">Account Status</th>
                  <th className="py-3.5 px-4 text-right">Security Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredMembers.map((m) => {
                  const currentStatus = m.status || 'ACTIVE';
                  return (
                    <tr key={m.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={
                              m.avatarUrl ||
                              'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'
                            }
                            alt={m.name}
                            className="w-10 h-10 rounded-full object-cover border border-slate-200 shadow-xs"
                          />
                          <div>
                            <p className="font-bold text-slate-900">{m.name}</p>
                            <p className="text-xs font-mono font-semibold text-blue-600">{m.memberCardNo || `USER-${m.id}`}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4 font-mono text-slate-600 text-xs">{m.email}</td>
                      <td className="py-4 px-4 text-xs font-medium text-slate-700">
                        {m.department || 'Central Library'}
                      </td>

                      {/* Interactive System Role Selector */}
                      <td className="py-4 px-4">
                        <select
                          value={m.role}
                          onChange={(e) => handleRoleChange(m.id, e.target.value as Role)}
                          className="px-2.5 py-1 rounded-lg text-xs font-extrabold border border-slate-200 bg-white hover:bg-slate-50 cursor-pointer shadow-2xs focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        >
                          <option value="ADMIN">ADMIN</option>
                          <option value="STAFF">STAFF</option>
                          <option value="FACULTY">FACULTY</option>
                          <option value="STUDENT">STUDENT</option>
                          <option value="GUEST">GUEST</option>
                        </select>
                      </td>

                      {/* Interactive Account Status Selector */}
                      <td className="py-4 px-4">
                        <select
                          value={currentStatus}
                          onChange={(e) => handleStatusChange(m.id, e.target.value as UserStatus)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold border border-transparent cursor-pointer shadow-2xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
                            currentStatus === 'ACTIVE'
                              ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                              : currentStatus === 'SUSPENDED'
                              ? 'bg-rose-100 text-rose-800 hover:bg-rose-200'
                              : currentStatus === 'PENDING_APPROVAL'
                              ? 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                              : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                          }`}
                        >
                          <option value="ACTIVE">ACTIVE</option>
                          <option value="SUSPENDED">SUSPENDED</option>
                          <option value="PENDING_APPROVAL">PENDING</option>
                          <option value="INACTIVE">INACTIVE</option>
                        </select>
                      </td>

                      <td className="py-4 px-4 text-right">
                        <button
                          onClick={() => handleOpenResetPassword(m)}
                          className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold hover:bg-slate-100 transition-colors inline-flex items-center gap-1.5 text-slate-700"
                        >
                          <Key className="h-3.5 w-3.5 text-amber-600" /> Reset Password
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          /* Empty Search & Filter State */
          <div className="p-12 text-center space-y-4">
            <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto">
              <Search className="h-8 w-8" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">No user accounts found</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                No system user accounts match your search phrase or active filter conditions. Try adjusting your parameters.
              </p>
            </div>
            <button
              onClick={handleResetFilters}
              className="px-4 py-2 bg-blue-600 text-white rounded-xl font-bold text-xs shadow-xs hover:bg-blue-700 transition-colors inline-flex items-center gap-2"
            >
              <RotateCcw className="h-4 w-4" /> Reset All Search & Filters
            </button>
          </div>
        )}
      </div>

      {/* RESET PASSWORD MODAL */}
      {resetPassModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4 border border-slate-200">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-slate-900 font-bold">
                <Key className="h-5 w-5 text-amber-500" /> Security Reset Credentials
              </div>
              <button
                onClick={() => setResetPassModalUser(null)}
                className="text-slate-400 hover:text-slate-700 font-bold text-lg"
              >
                &times;
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <p className="text-slate-600 text-xs">
                Generated temporary access security password for account <span className="font-bold text-slate-900">{resetPassModalUser.name}</span> ({resetPassModalUser.email}).
              </p>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                <label className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Temporary Password</label>
                <div className="flex items-center justify-between bg-white p-2.5 rounded-lg border border-slate-300 font-mono text-sm font-bold text-blue-600">
                  <span>{generatedTempPass}</span>
                  <button
                    onClick={handleCopyPassword}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded text-xs font-sans font-semibold transition-colors flex items-center gap-1"
                  >
                    {passCopied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : 'Copy'}
                    {passCopied ? 'Copied!' : ''}
                  </button>
                </div>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-xs text-amber-800">
                <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  The user will be prompted to update this password upon their next successful system login.
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setResetPassModalUser(null)}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition-colors"
              >
                Done & Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REGISTER ACCOUNT MODAL */}
      <RegisterAccountModal
        isOpen={isRegisterModalOpen}
        onClose={() => setIsRegisterModalOpen(false)}
      />
    </div>
  );
}
