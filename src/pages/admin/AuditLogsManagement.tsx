/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  FileText,
  Search,
  Filter,
  Download,
  Calendar,
  User,
  Shield,
  Layers,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Clock,
  Printer,
  Sparkles,
  Info,
} from 'lucide-react';
import { libraryStore } from '../../services/libraryStore.service';
import { AuditLog } from '../../types/library';
import { exportStyledExcelFile } from '../../utils/excelExport';

export default function AuditLogsManagement() {
  const [state, setState] = useState(() => libraryStore.snapshot);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterModule, setFilterModule] = useState('ALL');
  const [filterRole, setFilterRole] = useState('ALL');

  useEffect(() => {
    const sub = libraryStore.getObservable().subscribe(setState);
    return () => sub.unsubscribe();
  }, []);

  const logs = state.auditLogs || [];

  const uniqueModules = useMemo(() => {
    const s = new Set<string>();
    logs.forEach((l) => {
      if (l.module) s.add(l.module);
    });
    return Array.from(s).sort();
  }, [logs]);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const q = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !q ||
        (log.userName && log.userName.toLowerCase().includes(q)) ||
        (log.userId && log.userId.toLowerCase().includes(q)) ||
        (log.action && log.action.toLowerCase().includes(q)) ||
        (log.details && log.details.toLowerCase().includes(q)) ||
        (log.module && log.module.toLowerCase().includes(q));

      const matchesModule = filterModule === 'ALL' || log.module === filterModule;
      const matchesRole = filterRole === 'ALL' || log.userRole === filterRole;

      return matchesSearch && matchesModule && matchesRole;
    });
  }, [logs, searchTerm, filterModule, filterRole]);

  const handleExportLogs = () => {
    const headers = ['Log ID', 'User Name', 'User Email / ID', 'Role', 'Module', 'Action', 'Details', 'Timestamp'];
    const rows = filteredLogs.map((l) => [
      l.id,
      l.userName,
      l.userId,
      l.userRole,
      l.module,
      l.action,
      l.details,
      l.timestamp,
    ]);

    exportStyledExcelFile({
      filename: `Library_Audit_Logs_${new Date().toISOString().split('T')[0]}.xlsx`,
      sheetName: 'System Audit Logs',
      headers,
      data: rows,
      themeColor: '312E81',
    });
  };

  return (
    <div className="space-y-6 pb-12 animate-fadeIn">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-8 rounded-3xl shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-bold uppercase tracking-wider">
              <FileText className="w-3.5 h-3.5" /> Immutable Security Log
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold font-poppins text-white tracking-tight">
              System Audit Logs & Activity Trail
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Real-time chronological record of administrative actions, account approvals, permission modifications, item deletions, fine waivers, and clearance certificates.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0 self-start md:self-center">
            <button
              onClick={handleExportLogs}
              className="px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/15 transition-all flex items-center gap-2 cursor-pointer shadow-xs"
            >
              <Download className="w-4 h-4" /> Export Logs (.xlsx)
            </button>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search user, action, module, or details..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 bg-white text-xs sm:text-sm font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Module Filter */}
          <div>
            <select
              value={filterModule}
              onChange={(e) => setFilterModule(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-xs sm:text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="ALL">All Modules ({uniqueModules.length})</option>
              {uniqueModules.map((m) => (
                <option key={m} value={m}>
                  Module: {m}
                </option>
              ))}
            </select>
          </div>

          {/* Role Filter */}
          <div>
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-xs sm:text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="ALL">All User Roles</option>
              <option value="ADMIN">ADMIN</option>
              <option value="STAFF">STAFF</option>
              <option value="FACULTY">FACULTY</option>
              <option value="STUDENT">STUDENT</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100">
          <span>
            Showing <strong className="text-slate-800">{filteredLogs.length}</strong> of{' '}
            <strong className="text-slate-800">{logs.length}</strong> total audit records
          </span>

          {(searchTerm || filterModule !== 'ALL' || filterRole !== 'ALL') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setFilterModule('ALL');
                setFilterRole('ALL');
              }}
              className="text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" /> Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-4">Timestamp & ID</th>
                <th className="py-3.5 px-4">User & Role</th>
                <th className="py-3.5 px-4">Module</th>
                <th className="py-3.5 px-4">Action</th>
                <th className="py-3.5 px-4">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <div className="font-mono text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      {log.timestamp}
                    </div>
                    <span className="font-mono text-[10px] text-slate-400 block mt-0.5">{log.id}</span>
                  </td>

                  <td className="py-3.5 px-4">
                    <div className="font-bold text-slate-900">{log.userName}</div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span
                        className={`text-[9px] font-bold font-mono px-1.5 py-0.2 rounded uppercase ${
                          log.userRole === 'ADMIN'
                            ? 'bg-purple-100 text-purple-800'
                            : log.userRole === 'STAFF'
                            ? 'bg-indigo-100 text-indigo-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {log.userRole}
                      </span>
                      <span className="text-[11px] text-slate-400 truncate max-w-[150px]">{log.userId}</span>
                    </div>
                  </td>

                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 font-mono text-xs font-bold">
                      {log.module}
                    </span>
                  </td>

                  <td className="py-3.5 px-4">
                    <span className="font-bold text-slate-900">{log.action}</span>
                  </td>

                  <td className="py-3.5 px-4">
                    <p className="text-slate-600 leading-relaxed text-xs max-w-md">{log.details}</p>
                  </td>
                </tr>
              ))}

              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500">
                    <p className="font-bold text-slate-700">No Audit Logs Found</p>
                    <p className="text-xs text-slate-400 mt-1">No activity records match your current search and filter criteria.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
