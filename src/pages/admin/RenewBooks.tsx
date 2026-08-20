import React, { useState, useEffect } from 'react';
import { RefreshCw, CheckCircle, AlertCircle, Clock, ShieldCheck, XCircle, Search, X } from 'lucide-react';
import { libraryStore } from '../../services/libraryStore.service';
import { ExtensionRequest } from '../../types/library';

export default function RenewBooks() {
  const [state, setState] = useState(libraryStore.snapshot);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'pending' | 'approved'>('pending');
  const [searchTerm, setSearchTerm] = useState('');

  // Reject Modal state
  const [rejectingRequest, setRejectingRequest] = useState<ExtensionRequest | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    const sub = libraryStore.getObservable().subscribe(setState);
    return () => sub.unsubscribe();
  }, []);

  const triggerAlert = (type: 'success' | 'error', message: string) => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 5000);
  };

  const extensionRequests = state.extensionRequests || [];
  const pendingRequests = extensionRequests.filter((r) => r.status === 'PENDING');
  const approvedRequests = extensionRequests.filter((r) => r.status === 'APPROVED');

  const filteredPending = pendingRequests.filter(
    (r) =>
      r.memberName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.bookTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.memberCardNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.reason.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredApproved = approvedRequests.filter(
    (r) =>
      r.memberName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.bookTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.memberCardNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.reason.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleApprove = (requestId: string) => {
    const res = libraryStore.approveExtensionRequest(requestId);
    if (res.success) {
      triggerAlert('success', res.message);
    } else {
      triggerAlert('error', res.message);
    }
  };

  const handleConfirmReject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingRequest) return;
    const res = libraryStore.rejectExtensionRequest(rejectingRequest.id, rejectReason || 'Extension request rejected by Admin.');
    if (res.success) {
      triggerAlert('success', res.message);
    } else {
      triggerAlert('error', res.message);
    }
    setRejectingRequest(null);
    setRejectReason('');
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-purple-700 bg-purple-50 px-3.5 py-1 rounded-full mb-2">
            <RefreshCw className="h-3.5 w-3.5" /> Book Return Time & Extension Approval Desk
          </div>
          <h1 className="text-2xl font-bold font-poppins text-slate-900">Extend Book Time & Renewal Approvals</h1>
          <p className="text-sm text-slate-500 mt-1">Review member extension requests submitted by students and faculty, and manage approved extension history.</p>
        </div>
      </div>

      {/* Alert Banner */}
      {alert && (
        <div
          className={`flex items-center justify-between gap-3 p-4 rounded-2xl text-sm font-medium border shadow-xs animate-fadeIn ${
            alert.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          <div className="flex items-center gap-3">
            {alert.type === 'success' ? <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0" /> : <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />}
            <span>{alert.message}</span>
          </div>
          <button onClick={() => setAlert(null)} className="p-1 text-slate-400 hover:text-slate-700">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Navigation Tabs & Search Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white p-4 rounded-3xl border border-slate-200 shadow-sm">
        {/* Search Bar on Left */}
        <div className="relative w-full sm:w-80 md:w-96">
          <Search className={`absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors ${searchTerm ? 'text-purple-600 font-bold' : 'text-slate-400'}`} />
          <input
            type="text"
            placeholder="Search member name, book title, card..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-9 py-2.5 rounded-2xl border border-slate-200 text-xs font-semibold text-slate-800 placeholder:text-slate-400 placeholder:font-normal focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all bg-slate-50/70 focus:bg-white shadow-2xs"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              title="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* 2 Navigation Tab Buttons on Right */}
        <div className="flex items-center gap-2 overflow-x-auto shrink-0 justify-start sm:justify-end">
          <button
            type="button"
            onClick={() => setActiveTab('pending')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'pending'
                ? 'bg-amber-500 text-white shadow-md shadow-amber-200'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80'
            }`}
          >
            <Clock className="w-4 h-4" /> Pending Extension Requests ({pendingRequests.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('approved')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'approved'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-200'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80'
            }`}
          >
            <ShieldCheck className="w-4 h-4" /> Extension Approval History ({approvedRequests.length})
          </button>
        </div>
      </div>

      {/* TAB 1: PENDING MEMBER EXTENSION REQUESTS */}
      {activeTab === 'pending' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden space-y-0">
          <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <h2 className="font-bold text-slate-900 text-base flex items-center gap-2 font-poppins">
              <Clock className="w-5 h-5 text-amber-500" /> Pending Return Date Extension Requests
            </h2>
            <span className="text-xs font-semibold text-slate-500">Student & Faculty member requests requiring librarian approval</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-extrabold text-slate-600 uppercase tracking-wider">
                  <th className="py-3.5 px-4 align-middle whitespace-nowrap">Member Details</th>
                  <th className="py-3.5 px-4 align-middle">Book Title & Accession</th>
                  <th className="py-3.5 px-4 align-middle whitespace-nowrap">Current Due Date</th>
                  <th className="py-3.5 px-4 align-middle whitespace-nowrap">Requested Extension</th>
                  <th className="py-3.5 px-4 align-middle">Valid Reason Provided</th>
                  <th className="py-3.5 px-4 align-middle text-right whitespace-nowrap">Approval Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredPending.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4 align-middle whitespace-nowrap">
                      <div className="space-y-1">
                        <p className="font-bold text-slate-900 leading-tight">{req.memberName}</p>
                        <p className="text-xs font-mono text-purple-700 font-bold">{req.memberCardNo}</p>
                        <span className="inline-block text-[10px] font-extrabold uppercase bg-purple-100 text-purple-800 px-2 py-0.5 rounded">
                          {req.memberRole}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 align-middle max-w-xs">
                      <div className="space-y-1 min-w-0">
                        <p className="font-bold text-slate-900 leading-tight break-words" title={req.bookTitle}>{req.bookTitle}</p>
                        <p className="text-xs font-mono text-slate-500">{req.accessionNo} ({req.barcode})</p>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 align-middle font-bold text-slate-800 font-mono whitespace-nowrap text-xs">
                      {req.currentDueDate}
                    </td>
                    <td className="py-3.5 px-4 align-middle whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 bg-amber-100/80 text-amber-900 border border-amber-200/80 px-2.5 py-1 rounded-full text-xs font-extrabold shadow-2xs">
                        +{req.requestedExtensionDays} Days
                      </span>
                    </td>
                    <td className="py-3.5 px-4 align-middle max-w-xs">
                      <div className="p-2.5 rounded-xl bg-amber-50/90 border border-amber-200/80 text-xs text-amber-950 font-medium italic shadow-2xs leading-relaxed break-words">
                        "{req.reason}"
                      </div>
                    </td>
                    <td className="py-3.5 px-4 align-middle text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleApprove(req.id)}
                          className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs hover:shadow transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
                        >
                          <CheckCircle className="w-4 h-4" /> Approve
                        </button>
                        <button
                          onClick={() => setRejectingRequest(req)}
                          className="px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/90 font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
                        >
                          <XCircle className="w-4 h-4" /> Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredPending.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-500 text-sm">
                      {searchTerm
                        ? `No pending extension requests matching "${searchTerm}".`
                        : 'No pending extension requests. Member extension requests submitted by students and faculty will appear here for review.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: APPROVED EXTENSIONS LOG */}
      {activeTab === 'approved' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <h2 className="font-bold text-slate-900 text-base flex items-center gap-2 font-poppins">
              <ShieldCheck className="w-5 h-5 text-emerald-600" /> Extension Approval History Docket
            </h2>
            <span className="text-xs font-semibold text-slate-500">Official history log of librarian-approved extension requests</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase">
                  <th className="py-3 px-4">Member Name</th>
                  <th className="py-3 px-4">Book Title</th>
                  <th className="py-3 px-4">Reason Provided</th>
                  <th className="py-3 px-4">Decision & New Due Date</th>
                  <th className="py-3 px-4">Approved Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredApproved.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4 align-middle font-semibold text-slate-900 whitespace-nowrap">
                      {req.memberName} <span className="text-xs text-slate-400 font-normal">({req.memberRole})</span>
                    </td>
                    <td className="py-3.5 px-4 align-middle font-medium text-slate-800">{req.bookTitle}</td>
                    <td className="py-3.5 px-4 align-middle text-xs text-slate-600 italic font-medium max-w-xs break-words">"{req.reason}"</td>
                    <td className="py-3.5 px-4 align-middle">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                        Approved {req.newDueDate ? `(Extended to ${req.newDueDate})` : ''}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 align-middle text-xs font-mono text-slate-500">{req.reviewedDate || req.requestedDate}</td>
                  </tr>
                ))}
                {filteredApproved.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400 text-sm">
                      {searchTerm
                        ? `No extension approval history matching "${searchTerm}".`
                        : 'No approved extension history records found.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectingRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 space-y-4 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                <XCircle className="w-5 h-5 text-rose-600" /> Reject Extension Request
              </h3>
              <button onClick={() => setRejectingRequest(null)} className="text-slate-400 hover:text-slate-600 text-xl font-bold cursor-pointer">
                &times;
              </button>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 text-xs space-y-1">
              <p><strong className="text-slate-700">Member:</strong> {rejectingRequest.memberName} ({rejectingRequest.memberCardNo})</p>
              <p><strong className="text-slate-700">Book:</strong> {rejectingRequest.bookTitle}</p>
              <p><strong className="text-slate-700">Reason Given:</strong> "{rejectingRequest.reason}"</p>
            </div>

            <form onSubmit={handleConfirmReject} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Reason for Rejection (Optional Notes):</label>
                <textarea
                  rows={3}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="e.g. Maximum borrowing period reached / Book has pending reservation holds."
                  className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-rose-500/20"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setRejectingRequest(null)}
                  className="px-4 py-2 rounded-xl text-slate-600 font-bold border border-slate-200 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button type="submit" className="px-5 py-2 rounded-xl bg-rose-600 text-white font-bold hover:bg-rose-700 shadow-md cursor-pointer">
                  Confirm Rejection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
