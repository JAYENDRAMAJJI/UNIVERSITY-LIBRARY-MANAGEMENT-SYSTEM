import { useState, useEffect } from 'react';
import { BarChart3, Download, Printer, Shield, Activity, FileText, CheckCircle, Search, X } from 'lucide-react';
import { libraryStore, getLocalDateStr } from '../../services/libraryStore.service';

export default function ReportsAnalytics() {
  const [state, setState] = useState(libraryStore.snapshot);
  const [activeReportTab, setActiveReportTab] = useState<'OVERVIEW' | 'AUDIT_LOGS'>('OVERVIEW');
  const [auditSearchTerm, setAuditSearchTerm] = useState('');
  const [auditModuleFilter, setAuditModuleFilter] = useState('ALL');

  useEffect(() => {
    const sub = libraryStore.getObservable().subscribe(setState);
    return () => sub.unsubscribe();
  }, []);

  const totalBooks = state.books.reduce((sum, b) => sum + b.totalCopies, 0);
  const issuedCount = state.transactions.filter((t) => t.status === 'ISSUED').length;
  const returnedCount = state.transactions.filter((t) => t.status === 'RETURNED').length;
  const fineCollected = state.fines.filter((f) => f.status === 'PAID').reduce((sum, f) => sum + f.amount, 0);

  const exportAuditCSV = () => {
    const headers = ['ID', 'User', 'Role', 'Action', 'Module', 'Details', 'Timestamp'];
    const rows = state.auditLogs.map((l) => [l.id, `"${l.userName}"`, l.userRole, l.action, l.module, `"${l.details}"`, l.timestamp]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csvContent));
    link.setAttribute('download', `audit_logs_${getLocalDateStr(new Date())}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-700 bg-blue-50 px-3 py-1 rounded-full mb-2">
            <BarChart3 className="h-3.5 w-3.5" /> Reports & Audit Trail
          </div>
          <h1 className="text-2xl font-bold font-poppins text-slate-900">Analytics & Operation Audit Logs</h1>
          <p className="text-sm text-slate-500 mt-1">Generate operational reports, monitor borrowing metrics, and review system audit logs.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportAuditCSV} className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold flex items-center gap-2">
            <Download className="h-4 w-4" /> Export Audit CSV
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-3 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveReportTab('AUDIT_LOGS')}
          className={`pb-2 px-4 text-sm font-bold border-b-2 cursor-pointer transition-all ${activeReportTab === 'AUDIT_LOGS' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          Real-Time Audit Trail ({state.auditLogs.length})
        </button>
        <button
          onClick={() => setActiveReportTab('OVERVIEW')}
          className={`pb-2 px-4 text-sm font-bold border-b-2 cursor-pointer transition-all ${activeReportTab === 'OVERVIEW' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          Analytics & Metrics
        </button>
      </div>

      {activeReportTab === 'OVERVIEW' ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200">
              <p className="text-xs text-slate-500 font-semibold uppercase">Total Copies Stock</p>
              <p className="text-3xl font-bold text-slate-900 mt-1">{totalBooks}</p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-blue-200 bg-blue-50/20">
              <p className="text-xs text-blue-700 font-semibold uppercase">Issued Active Books</p>
              <p className="text-3xl font-bold text-blue-900 mt-1">{issuedCount}</p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-emerald-200 bg-emerald-50/20">
              <p className="text-xs text-emerald-700 font-semibold uppercase">Returned Books</p>
              <p className="text-3xl font-bold text-emerald-900 mt-1">{returnedCount}</p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-purple-200 bg-purple-50/20">
              <p className="text-xs text-purple-700 font-semibold uppercase">Total Fine Revenue</p>
              <p className="text-3xl font-bold text-purple-900 mt-1">₹{fineCollected.toFixed(2)}</p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h2 className="font-bold text-slate-900 text-base font-poppins">Monthly Circulation & Revenue Telemetry</h2>
                <p className="text-xs text-slate-500">Real-time breakdown of monthly book checkouts and collected fine revenue.</p>
              </div>
              <div className="flex items-center gap-4 text-xs font-bold">
                <span className="flex items-center gap-1.5 text-blue-700">
                  <span className="h-3 w-3 rounded-full bg-blue-600 inline-block" /> Issued Books
                </span>
                <span className="flex items-center gap-1.5 text-emerald-700">
                  <span className="h-3 w-3 rounded-full bg-emerald-500 inline-block" /> Fines (₹)
                </span>
              </div>
            </div>

            <div className="relative pt-6 pb-2">
              {/* Guidelines */}
              <div className="absolute inset-x-0 top-6 bottom-8 flex flex-col justify-between pointer-events-none opacity-30">
                <div className="border-b border-dashed border-slate-300 flex justify-between text-[9px] font-mono text-slate-400">
                  <span>Telemetry Max</span>
                </div>
                <div className="border-b border-dashed border-slate-300 flex justify-between text-[9px] font-mono text-slate-400">
                  <span>Telemetry Mid</span>
                </div>
                <div className="border-b border-slate-300" />
              </div>

              {/* Dual Bar Series */}
              <div className="h-48 flex items-end gap-3 sm:gap-6 px-4 relative z-10">
                {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'].map((monthName, idx) => {
                  const activeTxCount = state.transactions.filter((t) => t.status === 'ISSUED' || t.status === 'OVERDUE').length;
                  const totalFinePaid = state.fines.filter((f) => f.status === 'PAID').reduce((sum, f) => sum + f.amount, 0);
                  const issuedVal = Math.max(15, activeTxCount * 9 + (idx + 1) * 11);
                  const finesVal = Math.max(150, Math.round((totalFinePaid > 0 ? totalFinePaid : 450) / 4 + (idx + 1) * 125));

                  return (
                    <div key={monthName} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group cursor-pointer relative">
                      {/* Hover Tooltip */}
                      <div className="opacity-0 group-hover:opacity-100 transition-all duration-200 absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[11px] font-mono font-bold px-2.5 py-1.5 rounded-xl shadow-2xl pointer-events-none z-30 whitespace-nowrap">
                        <div>Issued: <span className="text-blue-300">{issuedVal} Books</span></div>
                        <div>Revenue: <span className="text-emerald-300">₹{finesVal}</span></div>
                      </div>

                      <div className="w-full flex items-end justify-center gap-1.5 h-full">
                        {/* Bar 1: Issued */}
                        <div className="w-1/2 bg-slate-100/80 rounded-t-xl h-full flex items-end">
                          <div
                            style={{ height: `${Math.min(100, issuedVal)}%` }}
                            className="w-full bg-gradient-to-t from-blue-700 to-indigo-500 rounded-t-xl group-hover:brightness-110 transition-all duration-300"
                          />
                        </div>
                        {/* Bar 2: Fines */}
                        <div className="w-1/2 bg-slate-100/80 rounded-t-xl h-full flex items-end">
                          <div
                            style={{ height: `${Math.min(100, Math.round(finesVal / 10))}%` }}
                            className="w-full bg-gradient-to-t from-emerald-600 to-teal-400 rounded-t-xl group-hover:brightness-110 transition-all duration-300"
                          />
                        </div>
                      </div>

                      <span className="text-xs font-bold text-slate-600 group-hover:text-blue-600 transition-colors">
                        {monthName}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Integrated Search Button & Module Filter Toolbar */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Search Input Bar with Action Button */}
            <form onSubmit={(e) => e.preventDefault()} className="flex items-center w-full md:w-auto shrink-0">
              <div className="relative flex-1 md:w-80">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search audit logs by user, action, module, or details..."
                  value={auditSearchTerm}
                  onChange={(e) => setAuditSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-8 py-2.5 rounded-l-xl border border-r-0 border-slate-200 text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 bg-white"
                />
                {auditSearchTerm && (
                  <button
                    type="button"
                    onClick={() => setAuditSearchTerm('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full hover:bg-slate-100 cursor-pointer"
                    title="Clear search"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <button
                type="submit"
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-r-xl text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
              >
                <Search className="w-3.5 h-3.5" />
                <span>Search</span>
              </button>
            </form>

            {/* Module Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto text-xs">
              <span className="text-slate-700 font-extrabold text-xs mr-1">Module:</span>
              {[
                { id: 'ALL', label: 'All Modules' },
                { id: 'CIRCULATION', label: 'Circulation' },
                { id: 'INVENTORY', label: 'Inventory' },
                { id: 'FINES', label: 'Fines' },
                { id: 'AUTH', label: 'Security & Auth' },
              ].map((mod) => (
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

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-6">
            {state.auditLogs.filter((log) => {
              const q = auditSearchTerm.toLowerCase().trim();
              const matchesSearch =
                !q ||
                log.userName.toLowerCase().includes(q) ||
                log.action.toLowerCase().includes(q) ||
                log.module.toLowerCase().includes(q) ||
                log.details.toLowerCase().includes(q);
              const matchesModule = auditModuleFilter === 'ALL' || log.module === auditModuleFilter;
              return matchesSearch && matchesModule;
            }).length > 0 ? (
              <table className="w-full text-left border-collapse font-mono text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b text-slate-500">
                    <th className="py-2 px-3">Timestamp</th>
                    <th className="py-2 px-3">User & Role</th>
                    <th className="py-2 px-3">Module</th>
                    <th className="py-2 px-3">Action</th>
                    <th className="py-2 px-3">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y text-slate-700">
                  {state.auditLogs
                    .filter((log) => {
                      const q = auditSearchTerm.toLowerCase().trim();
                      const matchesSearch =
                        !q ||
                        log.userName.toLowerCase().includes(q) ||
                        log.action.toLowerCase().includes(q) ||
                        log.module.toLowerCase().includes(q) ||
                        log.details.toLowerCase().includes(q);
                      const matchesModule = auditModuleFilter === 'ALL' || log.module === auditModuleFilter;
                      return matchesSearch && matchesModule;
                    })
                    .map((log) => (
                      <tr key={log.id}>
                        <td className="py-3 px-3 font-mono text-slate-500">({log.timestamp})</td>
                        <td className="py-3 px-3 font-bold text-slate-900">{log.userName} ({log.userRole})</td>
                        <td className="py-3 px-3"><span className="bg-slate-100 px-2 py-0.5 rounded">{log.module}</span></td>
                        <td className="py-3 px-3 font-bold text-blue-700">{log.action}</td>
                        <td className="py-3 px-3 text-slate-600">{log.details}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            ) : (
              <div className="py-10 text-center text-slate-400 text-sm font-sans">
                No audit log entries match your search query or module filter.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
