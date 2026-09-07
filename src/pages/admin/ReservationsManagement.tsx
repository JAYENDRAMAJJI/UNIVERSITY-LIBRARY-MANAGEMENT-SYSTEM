import React, { useState, useEffect } from 'react';
import { Bell, CheckCircle, Clock, XCircle, AlertCircle, Search, X } from 'lucide-react';
import { libraryStore } from '../../services/libraryStore.service';

export default function ReservationsManagement() {
  const [state, setState] = useState(libraryStore.snapshot);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  useEffect(() => {
    const sub = libraryStore.getObservable().subscribe(setState);
    return () => sub.unsubscribe();
  }, []);

  const filteredReservations = state.reservations.filter((r) => {
    const q = searchTerm.toLowerCase().trim();
    const matchesSearch =
      !q ||
      (r.bookTitle && r.bookTitle.toLowerCase().includes(q)) ||
      (r.memberName && r.memberName.toLowerCase().includes(q)) ||
      (r.memberCardNo && r.memberCardNo.toLowerCase().includes(q));

    const matchesStatus = statusFilter === 'ALL' || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-purple-700 bg-purple-50 px-3 py-1 rounded-full mb-2">
            <Bell className="h-3.5 w-3.5" /> Hold Queues & Reservations
          </div>
          <h1 className="text-2xl font-bold font-poppins text-slate-900">Manage Reservations Queue</h1>
          <p className="text-sm text-slate-500 mt-1">Review pending member reservations, queue positions, and hold window expirations.</p>
        </div>
      </div>

      {/* Integrated Search Button & Status Filter Toolbar */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search Input Bar with Action Button */}
        <form onSubmit={(e) => e.preventDefault()} className="flex items-center w-full md:w-auto shrink-0">
          <div className="relative flex-1 md:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search reservation by Book, Member Name, Card No..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-8 py-2.5 rounded-l-xl border border-r-0 border-slate-200 text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/20 bg-white"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full hover:bg-slate-100 cursor-pointer"
                title="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <button
            type="submit"
            className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-r-xl text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Search</span>
          </button>
        </form>

        {/* Status Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto text-xs">
          <span className="text-slate-700 font-extrabold text-xs mr-1">Status:</span>
          {[
            { id: 'ALL', label: 'All Holds' },
            { id: 'PENDING', label: 'Pending Queue' },
            { id: 'FULFILLED', label: 'Fulfilled' },
            { id: 'CANCELLED', label: 'Cancelled' },
          ].map((st) => (
            <button
              key={st.id}
              type="button"
              onClick={() => setStatusFilter(st.id)}
              className={`px-3.5 py-2 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap ${
                statusFilter === st.id
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>
      </div>

      {/* Reservations Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-6">
        {filteredReservations.length > 0 ? (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase">
                <th className="py-3 px-4">Book Title</th>
                <th className="py-3 px-4">Member Name</th>
                <th className="py-3 px-4">Card No</th>
                <th className="py-3 px-4">Queue Pos</th>
                <th className="py-3 px-4">Request Date</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredReservations.map((r) => (
                <tr key={r.id}>
                  <td className="py-4 px-4 font-semibold text-slate-900">{r.bookTitle}</td>
                  <td className="py-4 px-4 font-medium text-slate-800">{r.memberName}</td>
                  <td className="py-4 px-4 font-mono text-slate-500">{r.memberCardNo}</td>
                  <td className="py-4 px-4 font-bold text-purple-700">#{r.queuePosition}</td>
                  <td className="py-4 px-4 text-xs font-mono text-slate-600">({r.requestDate})</td>
                  <td className="py-4 px-4">
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-800 border border-purple-200">
                      {r.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="py-12 text-center text-slate-400 text-sm">
            No reservation queue records match your search criteria.
          </div>
        )}
      </div>
    </div>
  );
}
