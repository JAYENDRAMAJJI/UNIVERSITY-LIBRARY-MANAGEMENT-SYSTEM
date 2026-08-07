import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  ScanBarcode,
  UserCheck,
  CheckCircle,
  AlertCircle,
  Clock,
  Printer,
  BookOpen,
  Calendar,
  CreditCard,
  Camera,
  Search,
  ChevronDown,
  X,
  User,
  ShieldAlert,
} from 'lucide-react';
import { libraryStore, formatOnlyTimeInBracket } from '../../services/libraryStore.service';
import { MemberProfile, IssueTransaction } from '../../types/library';
import BarcodeScannerModal from '../../components/common/BarcodeScannerModal';

export default function IssueBooks() {
  const [searchParams] = useSearchParams();
  const [state, setState] = useState(libraryStore.snapshot);
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [accessionOrBarcode, setAccessionOrBarcode] = useState('');
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [lastIssuedReceipt, setLastIssuedReceipt] = useState<IssueTransaction | null>(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'STUDENT' | 'FACULTY' | 'STAFF'>('ALL');
  const [memberSearchTerm, setMemberSearchTerm] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [refModalBook, setRefModalBook] = useState<{ title: string; barcode: string; accessionNo: string; rack: string } | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sub = libraryStore.getObservable().subscribe(setState);
    return () => sub.unsubscribe();
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const acc = searchParams.get('accessionNo') || searchParams.get('barcode');
    if (acc) {
      setAccessionOrBarcode(acc);
    }
  }, [searchParams]);

  const filteredMembers = state.members.filter((m) => {
    const matchesRole = roleFilter === 'ALL' || m.role === roleFilter;
    const term = memberSearchTerm.toLowerCase().trim();
    const matchesSearch =
      !term ||
      m.name.toLowerCase().includes(term) ||
      m.memberCardNo.toLowerCase().includes(term) ||
      m.email.toLowerCase().includes(term) ||
      (m.department && m.department.toLowerCase().includes(term));
    return matchesRole && matchesSearch;
  });

  const selectedMember: MemberProfile | undefined = state.members.find(
    (m) => m.id === selectedMemberId || m.memberCardNo === selectedMemberId
  );

  const availableCopiesList = useMemo(() => {
    const list: Array<{ barcode: string; accessionNo: string; bookTitle: string; rack: string }> = [];
    (state.books || []).forEach((b) => {
      (b.copies || []).forEach((c) => {
        if (c.status === 'AVAILABLE') {
          list.push({
            barcode: c.barcode,
            accessionNo: c.accessionNo,
            bookTitle: b.title,
            rack: `${c.rackNumber} / ${c.shelfNumber}`,
          });
        }
      });
    });
    return list;
  }, [state.books]);

  const checkAndTriggerReferenceModal = (code: string): boolean => {
    const clean = code.trim().toLowerCase();
    if (!clean) return false;

    for (const b of state.books) {
      const isRefBook = b.isReferenceOnly || b.collectionType === 'REFERENCE';
      for (const c of b.copies || []) {
        const match =
          c.barcode.toLowerCase() === clean ||
          c.accessionNo.toLowerCase() === clean ||
          c.id.toLowerCase() === clean ||
          (c.qrCode && c.qrCode.toLowerCase() === clean);

        if (match && (isRefBook || c.isReferenceOnly)) {
          setRefModalBook({
            title: b.title,
            barcode: c.barcode,
            accessionNo: c.accessionNo,
            rack: `${c.rackNumber || b.rackNumber || 'RACK-REF'} / ${c.shelfNumber || b.shelfNumber || 'SHELF-A1'}`,
          });
          return true;
        }
      }
    }
    return false;
  };

  const handleSelectCode = (code: string) => {
    setAccessionOrBarcode(code);
    checkAndTriggerReferenceModal(code);
  };

  const handleIssueBook = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = accessionOrBarcode.trim();
    if (!selectedMemberId || !cleanCode) {
      setAlert({ type: 'error', message: 'Please select a member and enter a book barcode / accession number.' });
      return;
    }

    if (checkAndTriggerReferenceModal(cleanCode)) {
      setAlert({
        type: 'error',
        message: 'RESTRICTED ITEM: This book is a Library Reference Book and CANNOT be issued to members.',
      });
      return;
    }

    const result = libraryStore.issueBook(cleanCode, selectedMemberId, '1');

    if (result.success && result.transaction) {
      setAlert({ type: 'success', message: result.message });
      setLastIssuedReceipt(result.transaction);
      setAccessionOrBarcode('');
    } else {
      setAlert({ type: 'error', message: result.message });
      if ((result as any).isReferenceBook) {
        checkAndTriggerReferenceModal(cleanCode);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-700 bg-blue-50 px-3 py-1 rounded-full mb-2">
            <ScanBarcode className="h-3.5 w-3.5" /> Circulation Desk
          </div>
          <h1 className="text-2xl font-bold font-poppins text-slate-900">Issue Book to Member</h1>
          <p className="text-sm text-slate-500 mt-1">Perform real-time eligibility checks, loan validations, and issue receipts.</p>
        </div>
      </div>

      {alert && (
        <div
          className={`flex items-center gap-3 p-4 rounded-xl text-sm font-medium border ${
            alert.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          {alert.type === 'success' ? <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0" /> : <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />}
          <span>{alert.message}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Issue Form */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
          <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
            <ScanBarcode className="h-5 w-5 text-blue-600" /> Book Checkout Workstation
          </h2>

          <form onSubmit={handleIssueBook} className="space-y-5">
            {/* Step 1: Select Member */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-700">1. Select Library Member *</label>

              {/* Role Filter Tabs */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
                <button
                  type="button"
                  onClick={() => setRoleFilter('ALL')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                    roleFilter === 'ALL' ? 'bg-blue-600 text-white shadow-2xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  All Members ({state.members.length})
                </button>
                <button
                  type="button"
                  onClick={() => setRoleFilter('STUDENT')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                    roleFilter === 'STUDENT' ? 'bg-blue-600 text-white shadow-2xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Students ({state.members.filter((m) => m.role === 'STUDENT').length})
                </button>
                <button
                  type="button"
                  onClick={() => setRoleFilter('FACULTY')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                    roleFilter === 'FACULTY' ? 'bg-blue-600 text-white shadow-2xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Faculty ({state.members.filter((m) => m.role === 'FACULTY').length})
                </button>
                <button
                  type="button"
                  onClick={() => setRoleFilter('STAFF')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                    roleFilter === 'STAFF' ? 'bg-blue-600 text-white shadow-2xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Staff ({state.members.filter((m) => m.role === 'STAFF').length})
                </button>
              </div>

              {/* Single Unified Searchable Member Select Button/Dropdown */}
              <div className="relative" ref={dropdownRef}>
                <div
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className={`w-full px-4 py-3 rounded-xl border bg-white flex items-center justify-between gap-3 cursor-pointer transition-all shadow-xs ${
                    isDropdownOpen ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-slate-200 hover:border-blue-300'
                  }`}
                >
                  <div className="flex items-center gap-2.5 flex-1 min-w-0">
                    <Search className="h-4 w-4 text-blue-600 shrink-0" />
                    <input
                      type="text"
                      placeholder={
                        selectedMember
                          ? `${selectedMember.name} (${selectedMember.memberCardNo}) — ${selectedMember.department}`
                          : `-- Select Library Member (${filteredMembers.length} Available) --`
                      }
                      value={memberSearchTerm}
                      onChange={(e) => {
                        setMemberSearchTerm(e.target.value);
                        if (!isDropdownOpen) setIsDropdownOpen(true);
                      }}
                      onFocus={() => setIsDropdownOpen(true)}
                      className="w-full text-xs sm:text-sm font-semibold text-slate-900 bg-transparent outline-none placeholder:text-slate-500 placeholder:font-normal"
                    />
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {(selectedMemberId || memberSearchTerm) && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedMemberId('');
                          setMemberSearchTerm('');
                        }}
                        className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
                        title="Clear selection"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                    <ChevronDown
                      className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${
                        isDropdownOpen ? 'rotate-180 text-blue-600' : ''
                      }`}
                    />
                  </div>
                </div>

                {/* Dropdown Options List */}
                {isDropdownOpen && (
                  <div className="absolute left-0 right-0 top-full mt-1.5 bg-white rounded-2xl shadow-xl border border-slate-200 z-30 max-h-64 overflow-y-auto divide-y divide-slate-100 animate-fadeIn">
                    {filteredMembers.length > 0 ? (
                      filteredMembers.map((m) => {
                        const isSelected = selectedMemberId === m.id || selectedMemberId === m.memberCardNo;
                        return (
                          <div
                            key={m.id}
                            onClick={() => {
                              setSelectedMemberId(m.id);
                              setMemberSearchTerm('');
                              setIsDropdownOpen(false);
                            }}
                            className={`p-3.5 cursor-pointer flex items-center justify-between transition-colors ${
                              isSelected ? 'bg-blue-50/80 text-blue-900 font-semibold' : 'hover:bg-slate-50 text-slate-800'
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <img
                                src={m.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'}
                                alt={m.name}
                                className="w-8 h-8 rounded-full object-cover border border-blue-100 shrink-0"
                              />
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-bold text-slate-900 truncate">{m.name}</span>
                                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 shrink-0">
                                    {m.memberCardNo}
                                  </span>
                                </div>
                                <div className="text-[11px] text-slate-500 truncate mt-0.5">
                                  {m.department || 'General'} &bull; <span className="uppercase text-[10px] font-semibold text-slate-400">{m.role}</span>
                                </div>
                              </div>
                            </div>
                            {isSelected && <CheckCircle className="h-4 w-4 text-blue-600 shrink-0 ml-2" />}
                          </div>
                        );
                      })
                    ) : (
                      <div className="p-4 text-center text-xs text-slate-400">
                        No members found matching &quot;{memberSearchTerm}&quot;
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Step 2: Book Accession or Barcode */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-semibold text-slate-700">2. Scan / Enter Book Barcode or Accession No *</label>
                <button
                  type="button"
                  onClick={() => setIsScannerOpen(true)}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50 px-3 py-1 rounded-full transition-colors"
                >
                  <Camera className="w-3.5 h-3.5" /> Barcode Scanner
                </button>
              </div>
              <div className="relative">
                <ScanBarcode className="absolute left-3.5 top-3 h-5 w-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="e.g. ACC-2024-001, BC-99201 or BC-REF-001"
                  value={accessionOrBarcode}
                  onChange={(e) => {
                    setAccessionOrBarcode(e.target.value);
                    checkAndTriggerReferenceModal(e.target.value);
                  }}
                  className="w-full pl-11 pr-24 py-2.5 rounded-xl border border-slate-200 text-sm font-mono focus:ring-2 focus:ring-blue-500/20"
                />
                <button
                  type="button"
                  onClick={() => setIsScannerOpen(true)}
                  className="absolute right-2 top-2 px-3 py-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg text-xs font-bold shadow-xs hover:opacity-95 transition-all flex items-center gap-1"
                >
                  <ScanBarcode className="w-3.5 h-3.5" /> Scan
                </button>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Quick Barcode Shortcuts:</span>
                  <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    {availableCopiesList.length} Copies Available On Shelf
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {['BC-99201', 'BC-99203', 'BC-99301', 'BC-99401', 'BC-REF-001', 'BC-99501'].map((code) => {
                    const isRef = code === 'BC-REF-001';
                    return (
                      <button
                        key={code}
                        type="button"
                        onClick={() => handleSelectCode(code)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer border flex items-center gap-1 ${
                          isRef
                            ? 'bg-rose-50 text-rose-700 border-rose-300 hover:bg-rose-600 hover:text-white'
                            : accessionOrBarcode.trim().toUpperCase() === code.toUpperCase()
                            ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                            : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300'
                        }`}
                      >
                        <span>{code}</span>
                        {isRef && <span className="text-[9px] font-extrabold px-1 bg-rose-200 text-rose-900 rounded uppercase">REF ONLY</span>}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Available Catalog Copies Dropdown Selector */}
              {availableCopiesList.length > 0 && (
                <div className="pt-1">
                  <select
                    onChange={(e) => {
                      if (e.target.value) handleSelectCode(e.target.value);
                    }}
                    value=""
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono text-slate-700 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
                  >
                    <option value="" disabled>
                      -- Or Pick Directly From Available Book Copies ({availableCopiesList.length}) --
                    </option>
                    {availableCopiesList.slice(0, 30).map((item) => (
                      <option key={item.barcode} value={item.barcode}>
                        {item.barcode} | {item.accessionNo} — {item.bookTitle.substring(0, 40)}... ({item.rack})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <BarcodeScannerModal
              isOpen={isScannerOpen}
              onClose={() => setIsScannerOpen(false)}
              onScanSuccess={(scannedCode) => handleSelectCode(scannedCode)}
              title="Barcode Reader Simulator (Issue Desk)"
            />

            {/* Submit Action */}
            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold text-sm shadow-md shadow-blue-200 hover:opacity-95 transition-all flex items-center justify-center gap-2"
            >
              <CheckCircle className="h-5 w-5" /> Issue Book & Generate Receipt
            </button>
          </form>
        </div>

        {/* Member Verification Preview Panel */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
            <UserCheck className="h-5 w-5 text-emerald-600" /> Member Verification Card
          </h3>

          {selectedMember ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <img
                  src={selectedMember.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'}
                  alt={selectedMember.name}
                  className="w-14 h-14 rounded-full object-cover border-2 border-blue-100 shadow-xs"
                />
                <div>
                  <h4 className="font-bold text-slate-900 text-base">{selectedMember.name}</h4>
                  <p className="text-xs font-mono font-bold text-blue-700">{selectedMember.memberCardNo}</p>
                  <span className="text-[11px] font-semibold uppercase text-slate-500">{selectedMember.role}</span>
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-100 text-xs text-slate-600">
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-500">Department:</span>
                  <span className="font-semibold text-slate-800">{selectedMember.department}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-500">Account Status:</span>
                  <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">{selectedMember.status}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-500">Currently Borrowed Books:</span>
                  <span className="font-semibold text-slate-900">
                    {selectedMember.currentActiveLoans} / {selectedMember.maxAllowedBooks} Books
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">Pending Fines Balance:</span>
                  <span className={`font-bold ${selectedMember.pendingFines > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                    ₹{selectedMember.pendingFines.toFixed(2)}
                  </span>
                </div>
              </div>

              {selectedMember.pendingFines > 0 && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>Member has unpaid fines. Issue blocked until settled.</span>
                </div>
              )}
            </div>
          ) : (
            <div className="py-12 text-center text-slate-400 text-sm">Select a member from the checkout workstation to view eligibility details.</div>
          )}
        </div>
      </div>

      {/* Printable Receipt Modal */}
      {lastIssuedReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-emerald-600" /> Book Issue Receipt
              </h2>
              <button onClick={() => setLastIssuedReceipt(null)} className="text-slate-400 hover:text-slate-600 text-xl font-bold">
                &times;
              </button>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 font-mono text-xs space-y-2">
              <div className="text-center pb-2 border-b border-slate-200">
                <p className="font-bold text-slate-900 text-sm">UNIVERSITY CENTRAL LIBRARY</p>
                <p className="text-[10px] text-slate-500">Official Circulation Issue Receipt</p>
              </div>

              <div className="pt-2 space-y-1">
                <p>
                  <span className="text-slate-500">Receipt ID:</span> {lastIssuedReceipt.id}
                </p>
                <p>
                  <span className="text-slate-500">Member:</span> {lastIssuedReceipt.memberName} ({lastIssuedReceipt.memberCardNo})
                </p>
                <p>
                  <span className="text-slate-500">Book Title:</span> {lastIssuedReceipt.bookTitle}
                </p>
                <p>
                  <span className="text-slate-500">Accession No:</span> {lastIssuedReceipt.accessionNo}
                </p>
                <p>
                  <span className="text-slate-500">Issue Date:</span> {formatOnlyTimeInBracket(lastIssuedReceipt.issueDate)}
                </p>
                <p className="font-bold text-blue-700">
                  <span className="text-slate-500">Due Date:</span> {formatOnlyTimeInBracket(lastIssuedReceipt.dueDate)}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => {
                  window.print();
                }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white font-semibold text-sm hover:bg-slate-800"
              >
                <Printer className="h-4 w-4" /> Print Receipt
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reference Book Restriction Pop-Up Alert Modal */}
      {refModalBook && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl border border-rose-200 shadow-2xl max-w-md w-full p-6 space-y-5 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-100 text-rose-600 shadow-inner">
              <ShieldAlert className="h-9 w-9" />
            </div>

            <div className="space-y-2">
              <span className="px-3.5 py-1 bg-rose-100 text-rose-800 text-[11px] font-extrabold uppercase rounded-full tracking-wider">
                🚫 Reserved Library Reference Copy — Non-Issuable
              </span>
              <h3 className="text-xl font-bold font-poppins text-slate-900">Reference Copy Restriction</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Copy #1 of this book is reserved as an <strong>In-Library Reference Copy</strong> for reading room reference only. It has a barcode for catalog inventory tracking, but <strong>CANNOT be issued or checked out to members</strong>. Please issue Copy #2 or higher for member loans.
              </p>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-left text-xs space-y-1.5 font-sans">
              <p className="font-bold text-slate-900 leading-snug">{refModalBook.title}</p>
              <p className="text-slate-500 font-mono">
                Barcode: <strong className="text-slate-900">{refModalBook.barcode}</strong> | Accession: <strong className="text-slate-900">{refModalBook.accessionNo}</strong>
              </p>
              <p className="text-slate-500 font-mono">
                Location: <strong className="text-slate-900">{refModalBook.rack}</strong>
              </p>
            </div>

            <button
              onClick={() => setRefModalBook(null)}
              className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer"
            >
              I Understand — Close Alert
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
