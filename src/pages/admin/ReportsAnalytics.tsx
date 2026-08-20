import { useState, useEffect } from 'react';
import {
  BarChart3,
  Download,
  Activity,
  FileText,
  Search,
  X,
  Info,
  Clock,
  User,
  BookOpen,
  IndianRupee,
  CheckCircle2,
  Filter,
} from 'lucide-react';
import { libraryStore, getLocalDateStr, parseMonthNumFromDate, getSystemFineSummary } from '../../services/libraryStore.service';
import { exportStyledExcelFile } from '../../utils/excelExport';

export default function ReportsAnalytics() {
  const [state, setState] = useState(libraryStore.snapshot);
  const [activeReportTab, setActiveReportTab] = useState<'OVERVIEW' | 'AUDIT_LOGS'>('OVERVIEW');
  const [auditSearchTerm, setAuditSearchTerm] = useState('');
  const [auditModuleFilter, setAuditModuleFilter] = useState('ALL');
  const [auditRoleFilter, setAuditRoleFilter] = useState('ALL');

  useEffect(() => {
    const sub = libraryStore.getObservable().subscribe(setState);
    return () => sub.unsubscribe();
  }, []);

  const fineSummary = getSystemFineSummary(state);
  const totalBooks = state.books.reduce((sum, b) => sum + b.totalCopies, 0);
  const issuedCount = state.transactions.filter((t) => t.status === 'ISSUED' || t.status === 'OVERDUE').length;
  const returnedCount = state.transactions.filter((t) => t.status === 'RETURNED').length;
  const fineCollected = fineSummary.totalPaidFines;

  // Compute month maxes for relative bar scaling
  const allMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthData = allMonths.map((monthName, idx) => {
    const monthNum = idx + 1;
    const monthTxCount = state.transactions.filter((t) => parseMonthNumFromDate(t.issueDate) === monthNum).length;

    let monthFineSum = 0;
    state.fines.forEach((f) => {
      if (parseMonthNumFromDate(f.paidDate || f.createdDate) === monthNum) {
        monthFineSum += f.status === 'PAID' ? (f.paidAmount || f.amount || 0) : (f.amount || 0);
      }
    });

    state.transactions.forEach((t) => {
      if (t.fineAmount && t.fineAmount > 0) {
        const trackedInFines = state.fines.some((f) => f.transactionId === t.id);
        if (!trackedInFines) {
          if (parseMonthNumFromDate(t.returnDate || t.issueDate) === monthNum) {
            monthFineSum += t.fineAmount;
          }
        }
      }
    });

    return {
      monthName,
      issuedVal: monthTxCount,
      finesVal: Math.round(monthFineSum * 100) / 100,
    };
  });

  const maxIssued = Math.max(...monthData.map((d) => d.issuedVal), 10);
  const maxFines = Math.max(...monthData.map((d) => d.finesVal), 100);

  // Convert technical action codes into simple human-readable text
  const getFriendlyActionName = (action: string) => {
    const map: Record<string, string> = {
      ISSUE_BOOK: 'Issued Book',
      RETURN_BOOK: 'Returned Book',
      RENEW_BOOK: 'Extended Loan Period',
      REQUEST_EXTENSION: 'Requested Loan Extension',
      APPROVE_EXTENSION: 'Approved Extension',
      REJECT_EXTENSION: 'Rejected Extension',
      PLACE_RESERVATION_HOLD: 'Placed Book Hold',
      CANCEL_RESERVATION: 'Cancelled Book Hold',
      ADD_BOOK: 'Added New Book',
      UPDATE_BOOK: 'Updated Book Info',
      DELETE_BOOK: 'Removed Book',
      ADD_COPY: 'Added Book Copy',
      UPDATE_COPY: 'Updated Copy Info',
      DELETE_COPY: 'Removed Book Copy',
      BULK_GENERATE_BARCODES: 'Generated Barcodes',
      REGISTER_MEMBER: 'Registered Member',
      UPDATE_PROFILE: 'Updated Profile Details',
      FINE_PAID: 'Collected Fine Payment',
      FINE_WAIVED: 'Waived Fine',
      CONFIG_UPDATE: 'Updated System Settings',
      PROCUREMENT_REQUEST: 'Submitted Purchase Request',
      PROCUREMENT_LIFECYCLE_ADVANCE: 'Updated Order Status',
      ADD_VENDOR: 'Added Book Vendor',
      BULK_CSV_IMPORT: 'Bulk Imported Books',
      EXPORT_EXECUTIVE_REPORT: 'Exported Executive Report',
    };
    return map[action] || action.replace(/_/g, ' ');
  };

  // Convert module codes into friendly categories
  const getFriendlyModuleName = (mod: string) => {
    const map: Record<string, string> = {
      CIRCULATION: 'Loans & Returns',
      CATALOG: 'Book Catalog',
      TAXONOMY: 'Categories & Authors',
      MEMBER_MANAGEMENT: 'Member Admin',
      USER_PROFILE: 'User Profile',
      FINANCE: 'Fines & Payments',
      SETTINGS: 'System Settings',
      PROCUREMENT: 'Purchases & Orders',
      DIGITAL_LIBRARY: 'Digital Resources',
      CATALOG_RESERVATIONS: 'Book Holds',
      REPORTS_MODULE: 'Reports Engine',
    };
    return map[mod] || mod.replace(/_/g, ' ');
  };

  // Module filter options
  const moduleFilters = [
    { id: 'ALL', label: 'All Categories' },
    { id: 'CIRCULATION', label: 'Loans & Returns' },
    { id: 'CATALOG', label: 'Book Catalog' },
    { id: 'FINANCE', label: 'Fines & Money' },
    { id: 'MEMBER_MANAGEMENT', label: 'Members & Users' },
    { id: 'SETTINGS', label: 'System Settings' },
  ];

  // Role filter options
  const roleFilters = [
    { id: 'ALL', label: 'All Roles' },
    { id: 'ADMIN', label: 'Admins & Staff' },
    { id: 'FACULTY', label: 'Faculty' },
    { id: 'STUDENT', label: 'Students' },
  ];

  // Filter audit logs based on search query, module, and role
  const filteredLogs = state.auditLogs.filter((log) => {
    const q = auditSearchTerm.toLowerCase().trim();
    const friendlyAction = getFriendlyActionName(log.action).toLowerCase();
    const friendlyModule = getFriendlyModuleName(log.module).toLowerCase();

    const matchesSearch =
      !q ||
      log.userName.toLowerCase().includes(q) ||
      log.userRole.toLowerCase().includes(q) ||
      log.action.toLowerCase().includes(q) ||
      log.module.toLowerCase().includes(q) ||
      log.details.toLowerCase().includes(q) ||
      friendlyAction.includes(q) ||
      friendlyModule.includes(q);

    const matchesModule =
      auditModuleFilter === 'ALL' ||
      log.module === auditModuleFilter ||
      (auditModuleFilter === 'CIRCULATION' && (log.module === 'CIRCULATION' || log.module === 'CATALOG_RESERVATIONS')) ||
      (auditModuleFilter === 'FINANCE' && log.module === 'FINANCE') ||
      (auditModuleFilter === 'CATALOG' && (log.module === 'CATALOG' || log.module === 'TAXONOMY')) ||
      (auditModuleFilter === 'MEMBER_MANAGEMENT' && (log.module === 'MEMBER_MANAGEMENT' || log.module === 'USER_PROFILE')) ||
      (auditModuleFilter === 'SETTINGS' && (log.module === 'SETTINGS' || log.module === 'REPORTS_MODULE'));

    const matchesRole =
      auditRoleFilter === 'ALL' ||
      (auditRoleFilter === 'ADMIN' && (log.userRole === 'ADMIN' || log.userRole === 'STAFF')) ||
      log.userRole === auditRoleFilter;

    return matchesSearch && matchesModule && matchesRole;
  });

  const exportAuditCSV = () => {
    const headers = ['Log ID', 'User Name', 'Role', 'System Category', 'Action Performed', 'Activity Details', 'Timestamp'];
    const logsToExport = filteredLogs.length > 0 ? filteredLogs : state.auditLogs;
    const rows = logsToExport.map((l) => [
      l.id,
      l.userName,
      l.userRole,
      getFriendlyModuleName(l.module),
      getFriendlyActionName(l.action),
      l.details || '',
      l.timestamp,
    ]);

    exportStyledExcelFile({
      filename: `library_audit_report_${getLocalDateStr(new Date())}.xlsx`,
      sheetName: 'Operation Audit Logs',
      headers,
      data: rows,
      themeColor: '312E81', // Deep Indigo Header
    });
  };

  const hasActiveFilters = auditSearchTerm !== '' || auditModuleFilter !== 'ALL' || auditRoleFilter !== 'ALL';

  const handleResetFilters = () => {
    setAuditSearchTerm('');
    setAuditModuleFilter('ALL');
    setAuditRoleFilter('ALL');
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-3 py-1 rounded-full mb-2">
            <BarChart3 className="h-3.5 w-3.5" /> Easy Management Hub
          </div>
          <h1 className="text-2xl font-bold font-poppins text-slate-900">Analytics & Operation Audit Logs</h1>
          <p className="text-sm text-slate-500 mt-1">
            Track library activity, review staff action history, and monitor monthly circulation trends in one simple dashboard.
          </p>
        </div>
        <button
          onClick={exportAuditCSV}
          className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-all cursor-pointer shrink-0"
        >
          <Download className="h-4 w-4" /> Download Audit Excel/CSV
        </button>
      </div>

      {/* Beginner-Friendly Quick Usage Guide */}
      <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-slate-50 p-4 sm:p-5 rounded-2xl border border-blue-100/80 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-xs">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-blue-600 text-white shrink-0 shadow-xs">
            <Info className="h-4 w-4" />
          </div>
          <div className="space-y-1">
            <h3 className="font-bold text-slate-900 text-sm">How to use this section:</h3>
            <p className="text-slate-600 leading-relaxed">
              Use the tabs below to switch between <strong>📊 Overview & Monthly Charts</strong> for quick library stats, or <strong>📜 Activity & System Logs</strong> to inspect who performed specific actions (like issuing books, adding inventory, or updating settings).
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setActiveReportTab('OVERVIEW')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
              activeReportTab === 'OVERVIEW' ? 'bg-blue-600 text-white shadow-xs' : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            📊 View Overview Charts
          </button>
          <button
            onClick={() => setActiveReportTab('AUDIT_LOGS')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
              activeReportTab === 'AUDIT_LOGS' ? 'bg-blue-600 text-white shadow-xs' : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            📜 View Activity Logs ({state.auditLogs.length})
          </button>
        </div>
      </div>

      {/* Main Content Sections */}
      {activeReportTab === 'OVERVIEW' ? (
        <div className="space-y-6 animate-fadeIn">
          {/* Key Metric Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 font-bold uppercase">Total Book Stock</span>
                <BookOpen className="h-4 w-4 text-slate-400" />
              </div>
              <p className="text-3xl font-extrabold text-slate-900">{totalBooks}</p>
              <p className="text-[11px] text-slate-500 font-medium">Physical copies in library</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-blue-200 bg-blue-50/30 shadow-2xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-blue-700 font-bold uppercase">Active Issued Books</span>
                <Activity className="h-4 w-4 text-blue-600" />
              </div>
              <p className="text-3xl font-extrabold text-blue-900">{issuedCount}</p>
              <p className="text-[11px] text-blue-600 font-medium">Currently borrowed by readers</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-emerald-200 bg-emerald-50/30 shadow-2xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-emerald-700 font-bold uppercase">Returned Books</span>
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              </div>
              <p className="text-3xl font-extrabold text-emerald-900">{returnedCount}</p>
              <p className="text-[11px] text-emerald-600 font-medium">Successfully completed loans</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-purple-200 bg-purple-50/30 shadow-2xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-purple-700 font-bold uppercase">Fine Money Collected</span>
                <IndianRupee className="h-4 w-4 text-purple-600" />
              </div>
              <p className="text-3xl font-extrabold text-purple-900">₹{fineCollected.toFixed(2)}</p>
              <p className="text-[11px] text-purple-600 font-medium">Total overdue fine revenue</p>
            </div>
          </div>

          {/* Simple Visual Chart */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h2 className="font-bold text-slate-900 text-base font-poppins">Monthly Book Circulation & Revenue Trends</h2>
                <p className="text-xs text-slate-500">Visual comparison of monthly book checkouts versus fine money collected.</p>
              </div>
              <div className="flex items-center gap-4 text-xs font-bold">
                <span className="flex items-center gap-1.5 text-blue-700">
                  <span className="h-3 w-3 rounded-full bg-blue-600 inline-block" /> Issued Books
                </span>
                <span className="flex items-center gap-1.5 text-emerald-700">
                  <span className="h-3 w-3 rounded-full bg-emerald-500 inline-block" /> Fine Revenue (₹)
                </span>
              </div>
            </div>

            <div className="relative pt-6 pb-2">
              <div className="h-48 flex items-end gap-3 sm:gap-6 px-4 relative z-10">
                {monthData.map((item) => {
                  const issuedPct = item.issuedVal > 0 ? Math.max(6, Math.round((item.issuedVal / maxIssued) * 100)) : 3;
                  const finesPct = item.finesVal > 0 ? Math.max(6, Math.round((item.finesVal / maxFines) * 100)) : 3;

                  return (
                    <div key={item.monthName} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group cursor-pointer relative">
                      <div className="opacity-0 group-hover:opacity-100 transition-all duration-200 absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[11px] font-mono font-bold px-2.5 py-1.5 rounded-xl shadow-2xl pointer-events-none z-30 whitespace-nowrap">
                        <div>Issued: <span className="text-blue-300">{item.issuedVal} Books</span></div>
                        <div>Revenue: <span className="text-emerald-300">₹{item.finesVal}</span></div>
                      </div>

                      <div className="w-full flex items-end justify-center gap-1.5 h-full">
                        <div className="w-1/2 bg-slate-100/80 rounded-t-xl h-full flex items-end">
                          <div
                            style={{ height: `${issuedPct}%` }}
                            className="w-full bg-gradient-to-t from-blue-700 to-indigo-500 rounded-t-xl group-hover:brightness-110 transition-all duration-300"
                          />
                        </div>
                        <div className="w-1/2 bg-slate-100/80 rounded-t-xl h-full flex items-end">
                          <div
                            style={{ height: `${finesPct}%` }}
                            className="w-full bg-gradient-to-t from-emerald-600 to-teal-400 rounded-t-xl group-hover:brightness-110 transition-all duration-300"
                          />
                        </div>
                      </div>

                      <span className="text-xs font-bold text-slate-600 group-hover:text-blue-600 transition-colors">
                        {item.monthName}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4 animate-fadeIn">
          {/* Easy Filter & Search Toolbar */}
          <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
              {/* Search Box */}
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search logs by staff name, action (e.g. Issued Book), or keyword..."
                  value={auditSearchTerm}
                  onChange={(e) => setAuditSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-8 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 bg-slate-50/50"
                />
                {auditSearchTerm && (
                  <button
                    type="button"
                    onClick={() => setAuditSearchTerm('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 cursor-pointer"
                    title="Clear search"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {/* Role Filter Selector */}
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-slate-500 font-bold text-xs">Role:</span>
                <select
                  value={auditRoleFilter}
                  onChange={(e) => setAuditRoleFilter(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
                >
                  {roleFilters.map((rf) => (
                    <option key={rf.id} value={rf.id}>
                      {rf.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Live Count & Reset */}
              <div className="flex items-center gap-2 shrink-0 justify-between sm:justify-end">
                <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700">
                  Showing <span className="text-blue-600">{filteredLogs.length}</span> of {state.auditLogs.length} logs
                </span>
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="px-3 py-1.5 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold hover:bg-rose-100 transition-colors cursor-pointer"
                  >
                    Reset Filters
                  </button>
                )}
              </div>
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto text-xs pt-1 border-t border-slate-100">
              <span className="text-slate-500 font-bold text-xs mr-1 shrink-0 flex items-center gap-1">
                <Filter className="h-3.5 w-3.5 text-blue-600" /> Category:
              </span>
              {moduleFilters.map((mod) => (
                <button
                  key={mod.id}
                  type="button"
                  onClick={() => setAuditModuleFilter(mod.id)}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap ${
                    auditModuleFilter === mod.id
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {mod.label}
                </button>
              ))}
            </div>
          </div>

          {/* Simple Clean Table */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden p-6">
            {filteredLogs.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                      <th className="py-3 px-4">Date & Time</th>
                      <th className="py-3 px-4">User</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4">Action Performed</th>
                      <th className="py-3 px-4">Activity Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {filteredLogs.map((log) => {
                      const isStudent = log.userRole === 'STUDENT';
                      const isAdmin = log.userRole === 'ADMIN' || log.userRole === 'STAFF';

                      return (
                        <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3.5 px-4 font-mono text-slate-500 whitespace-nowrap flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            <span>{log.timestamp}</span>
                          </td>

                          <td className="py-3.5 px-4 font-bold text-slate-900 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-slate-600 text-[10px]">
                                <User className="h-3 w-3" />
                              </span>
                              <div>
                                <span>{log.userName}</span>
                                <span
                                  className={`ml-2 text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase ${
                                    isAdmin
                                      ? 'bg-blue-100 text-blue-800'
                                      : isStudent
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : 'bg-purple-100 text-purple-800'
                                  }`}
                                >
                                  {log.userRole}
                                </span>
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span className="bg-slate-100 border border-slate-200 text-slate-700 px-2.5 py-1 rounded-xl text-[11px] font-semibold">
                              {getFriendlyModuleName(log.module)}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 font-bold text-blue-700 whitespace-nowrap">
                            <span className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-800 px-2.5 py-1 rounded-xl text-[11px]">
                              {getFriendlyActionName(log.action)}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 text-slate-600 max-w-md leading-relaxed font-medium">
                            {log.details}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-12 text-center text-slate-400 space-y-2">
                <FileText className="h-8 w-8 mx-auto text-slate-300" />
                <p className="text-sm font-semibold text-slate-600">No logs found matching your filters</p>
                <p className="text-xs text-slate-400">Try clearing your search query or selecting "All Activity".</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
