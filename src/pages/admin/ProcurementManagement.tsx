import React, { useState, useEffect } from 'react';
import {
  ShoppingBag,
  CheckCircle2,
  XCircle,
  Clock,
  Filter,
  Search,
  Plus,
  Building2,
  FileText,
  Truck,
  Barcode,
  Sparkles,
  Printer,
  Download,
  AlertTriangle,
  History,
  Layers,
  ArrowRight,
  ShieldCheck,
  Package,
  BookOpen,
  DollarSign,
  Info,
  Check,
  ChevronRight,
  UserCheck,
  QrCode,
  Tag,
  Star,
  ExternalLink,
  ChevronDown,
} from 'lucide-react';
import { libraryStore, getLocalDateStr, formatOnlyTimeInBracket } from '../../services/libraryStore.service';
import { ProcurementRequest, ProcurementStatus, Vendor, Role } from '../../types/library';

const LIFECYCLE_STAGES: Array<{ status: ProcurementStatus; label: string; step: number; color: string }> = [
  { status: 'PENDING', label: 'Request Created', step: 1, color: 'bg-slate-100 text-slate-800 border-slate-300' },
  { status: 'UNDER_REVIEW', label: 'Committee Review', step: 2, color: 'bg-blue-100 text-blue-800 border-blue-300' },
  { status: 'ON_HOLD', label: 'On Hold', step: 3, color: 'bg-amber-100 text-amber-900 border-amber-300' },
  { status: 'APPROVED', label: 'Approved', step: 4, color: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
  { status: 'REJECTED', label: 'Rejected', step: 4, color: 'bg-rose-100 text-rose-800 border-rose-300' },
  { status: 'PO_GENERATED', label: 'PO Issued', step: 5, color: 'bg-indigo-100 text-indigo-800 border-indigo-300' },
  { status: 'ORDERED', label: 'Vendor Dispatched', step: 6, color: 'bg-purple-100 text-purple-800 border-purple-300' },
  { status: 'RECEIVED', label: 'Goods Received', step: 7, color: 'bg-teal-100 text-teal-800 border-teal-300' },
  { status: 'QUALITY_CHECKED', label: 'Quality Passed', step: 8, color: 'bg-cyan-100 text-cyan-800 border-cyan-300' },
  { status: 'CATALOGED', label: 'Cataloged & Accessioned', step: 9, color: 'bg-violet-100 text-violet-800 border-violet-300' },
  { status: 'AVAILABLE', label: 'Active in Library', step: 10, color: 'bg-emerald-600 text-white border-emerald-700' },
];

export default function ProcurementManagement() {
  const [state, setState] = useState(libraryStore.snapshot);
  const [activeTab, setActiveTab] = useState<'LIFECYCLE' | 'VENDORS' | 'DUPLICATES'>('LIFECYCLE');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterRole, setFilterRole] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [toast, setToast] = useState<string | null>(null);

  // Modals & Action Drawers
  const [selectedRequest, setSelectedRequest] = useState<ProcurementRequest | null>(null);
  const [actionModalType, setActionModalType] = useState<ProcurementStatus | 'TIMELINE' | 'PRINT_PO' | 'NEW_REQUEST' | 'NEW_VENDOR' | null>(null);

  // Form Inputs for Advancement
  const [adminNotesInput, setAdminNotesInput] = useState('');
  const [selectedVendorId, setSelectedVendorId] = useState('');
  const [poNumberInput, setPoNumberInput] = useState('');
  const [approvedPriceInput, setApprovedPriceInput] = useState(0);
  const [quantityInput, setQuantityInput] = useState(1);
  const [invoiceNoInput, setInvoiceNoInput] = useState('');
  const [receivedQtyInput, setReceivedQtyInput] = useState(1);
  const [qualityStatusInput, setQualityStatusInput] = useState<'PASSED' | 'FAILED' | 'REJECTED_DAMAGED'>('PASSED');
  const [assignedCategoryId, setAssignedCategoryId] = useState('');
  const [assignedRackInput, setAssignedRackInput] = useState('RACK-CS-01');
  const [assignedShelfInput, setAssignedShelfInput] = useState('SHELF-A1');

  // New Request Form State
  const [newBookTitle, setNewBookTitle] = useState('');
  const [newAuthorName, setNewAuthorName] = useState('');
  const [newIsbn, setNewIsbn] = useState('');
  const [newPublisher, setNewPublisher] = useState('');
  const [newEstPrice, setNewEstPrice] = useState(2500);
  const [newReason, setNewReason] = useState('');

  // Vendor Form State
  const [newVendorName, setNewVendorName] = useState('');
  const [newVendorContact, setNewVendorContact] = useState('');
  const [newVendorEmail, setNewVendorEmail] = useState('');
  const [newVendorPhone, setNewVendorPhone] = useState('');
  const [newVendorAddress, setNewVendorAddress] = useState('');

  useEffect(() => {
    const sub = libraryStore.getObservable().subscribe(setState);
    return () => sub.unsubscribe();
  }, []);

  const triggerToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  const requests = state.procurementRequests || [];
  const vendors = state.vendors || [];

  // Filter requests
  const filteredRequests = requests.filter((r) => {
    if (filterStatus !== 'ALL' && r.status !== filterStatus) return false;
    if (filterRole !== 'ALL' && r.requestedByRole !== filterRole) return false;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchTitle = r.bookTitle.toLowerCase().includes(q);
      const matchAuthor = r.authorName.toLowerCase().includes(q);
      const matchIsbn = r.isbn?.toLowerCase().includes(q);
      const matchPO = r.poNumber?.toLowerCase().includes(q);
      const matchVendor = r.vendorName?.toLowerCase().includes(q);
      const matchUser = r.requestedByName.toLowerCase().includes(q);
      return matchTitle || matchAuthor || matchIsbn || matchPO || matchVendor || matchUser;
    }
    return true;
  });

  // Calculate Metrics
  const totalRequestsCount = requests.length;
  const activePOCount = requests.filter((r) => r.status === 'PO_GENERATED' || r.status === 'ORDERED').length;
  const totalBudgetCommitted = requests.reduce((sum, r) => sum + ((r.approvedPrice || r.estimatedPrice || 0) * (r.quantityRequested || 1)), 0);
  const totalCatalogedCount = requests.filter((r) => r.status === 'CATALOGED' || r.status === 'AVAILABLE').length;

  const duplicatesList = requests.filter((r) => r.isDuplicate || (r.duplicateCount && r.duplicateCount > 0));

  // Open Action Modal
  const handleOpenAction = (req: ProcurementRequest, targetStatus: ProcurementStatus | 'TIMELINE' | 'PRINT_PO') => {
    setSelectedRequest(req);
    setActionModalType(targetStatus);
    setAdminNotesInput(req.adminNotes || '');

    // Pre-fill inputs based on request
    setSelectedVendorId(req.vendorId || vendors[0]?.id || '');
    setPoNumberInput(req.poNumber || `PO-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`);
    setApprovedPriceInput(req.approvedPrice || req.estimatedPrice || 2500);
    setQuantityInput(req.quantityRequested || 1);
    setInvoiceNoInput(req.invoiceNo || `INV-${Date.now().toString().substring(6)}`);
    setReceivedQtyInput(req.receivedQuantity || req.quantityRequested || 1);
    setQualityStatusInput(req.qualityStatus || 'PASSED');
    setAssignedCategoryId(req.assignedCategoryId || state.categories[0]?.id || '');
    setAssignedRackInput(req.assignedRackNumber || 'RACK-CS-01');
    setAssignedShelfInput(req.assignedShelfNumber || 'SHELF-A1');
  };

  // Submit Advancement Action
  const handleConfirmLifecycleAction = () => {
    if (!selectedRequest || !actionModalType) return;
    if (actionModalType === 'TIMELINE' || actionModalType === 'PRINT_PO') return;

    const vendorObj = vendors.find((v) => v.id === selectedVendorId);

    // Generate accession numbers if cataloging
    let accessionNos: string[] = [];
    let barcodes: string[] = [];
    if (actionModalType === 'CATALOGED' || actionModalType === 'AVAILABLE') {
      const startNum = Math.floor(900 + Math.random() * 100);
      for (let i = 0; i < (receivedQtyInput || quantityInput || 1); i++) {
        accessionNos.push(`ACC-${new Date().getFullYear()}-${startNum + i}`);
        barcodes.push(`BC-${Date.now().toString().substring(5)}${i}`);
      }
    }

    const payload: Partial<ProcurementRequest> = {
      vendorId: vendorObj?.id || selectedRequest.vendorId,
      vendorName: vendorObj?.name || selectedRequest.vendorName,
      vendorContact: vendorObj?.contactPerson || selectedRequest.vendorContact,
      poNumber: poNumberInput || selectedRequest.poNumber,
      poDate: selectedRequest.poDate || getLocalDateStr(new Date()),
      quantityRequested: quantityInput,
      approvedPrice: approvedPriceInput,
      invoiceNo: invoiceNoInput,
      receivedDate: actionModalType === 'RECEIVED' ? getLocalDateStr(new Date()) : selectedRequest.receivedDate,
      receivedQuantity: receivedQtyInput,
      qualityStatus: qualityStatusInput,
      assignedCategoryId,
      assignedCategoryName: state.categories.find((c) => c.id === assignedCategoryId)?.name || 'Computer Science & Engineering',
      assignedRackNumber: assignedRackInput,
      assignedShelfNumber: assignedShelfInput,
      generatedAccessionNos: accessionNos.length ? accessionNos : selectedRequest.generatedAccessionNos,
      generatedBarcodes: barcodes.length ? barcodes : selectedRequest.generatedBarcodes,
      adminNotes: adminNotesInput,
    };

    const res = libraryStore.advanceProcurementLifecycle(selectedRequest.id, actionModalType, payload, adminNotesInput);
    if (res.success) {
      triggerToast(res.message);
    }
    setActionModalType(null);
    setSelectedRequest(null);
  };

  // Create New Request
  const handleCreateRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBookTitle || !newAuthorName) return;

    const newReq = libraryStore.addProcurementRequest({
      bookTitle: newBookTitle,
      authorName: newAuthorName,
      isbn: newIsbn,
      publisherName: newPublisher,
      estimatedPrice: newEstPrice,
      reason: newReason || 'Required for library collection upgrade.',
      requestedById: '1',
      requestedByName: 'Chief Admin Librarian',
      requestedByRole: 'ADMIN',
      quantityRequested: 1,
    });

    triggerToast(`Procurement recommendation created for "${newReq.bookTitle}".`);
    setActionModalType(null);
    setNewBookTitle('');
    setNewAuthorName('');
    setNewIsbn('');
    setNewPublisher('');
    setNewReason('');
  };

  // Create New Vendor
  const handleCreateVendor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVendorName) return;

    const v = libraryStore.addVendor({
      name: newVendorName,
      contactPerson: newVendorContact || 'Sales Desk',
      email: newVendorEmail || 'sales@vendor.com',
      phone: newVendorPhone || '+91 98000 00000',
      address: newVendorAddress || 'New Delhi Institutional Area',
      rating: 4.8,
    });

    triggerToast(`Registered supplier "${v.name}".`);
    setActionModalType(null);
    setNewVendorName('');
    setNewVendorContact('');
    setNewVendorEmail('');
    setNewVendorPhone('');
    setNewVendorAddress('');
  };

  // Export to CSV
  const handleExportCSV = () => {
    const headers = ['ID', 'Book Title', 'Author', 'ISBN', 'Requester', 'Role', 'Status', 'PO Number', 'Vendor', 'Price', 'Date'];
    const rows = filteredRequests.map((r) => [
      r.id,
      `"${r.bookTitle.replace(/"/g, '""')}"`,
      `"${r.authorName.replace(/"/g, '""')}"`,
      r.isbn || '',
      `"${r.requestedByName.replace(/"/g, '""')}"`,
      r.requestedByRole,
      r.status,
      r.poNumber || '',
      `"${(r.vendorName || '').replace(/"/g, '""')}"`,
      r.approvedPrice || r.estimatedPrice || 0,
      r.requestedDate,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `procurement_register_${getLocalDateStr(new Date())}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-purple-700 bg-purple-50 px-3.5 py-1 rounded-full mb-2 border border-purple-200/80 shadow-2xs">
              <ShoppingBag className="h-3.5 w-3.5" /> University Library Purchasing System
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold font-poppins text-slate-900 tracking-tight">Book Purchasing & Orders</h1>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setActionModalType('NEW_REQUEST')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-sm hover:shadow transition-all cursor-pointer active:scale-95"
            >
              <Plus className="h-4 w-4" /> New Procurement Request
            </button>
            <button
              onClick={() => setActionModalType('NEW_VENDOR')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-bold transition-all cursor-pointer active:scale-95"
            >
              <Building2 className="h-4 w-4" /> Register Vendor
            </button>
            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-all cursor-pointer"
            >
              <Download className="h-4 w-4 text-purple-600" /> Export CSV
            </button>
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-all cursor-pointer"
            >
              <Printer className="h-4 w-4 text-slate-600" /> Print
            </button>
          </div>
        </div>

        {/* Clean Enterprise Lifecycle Breadcrumb Indicator */}
        <div className="pt-3.5 border-t border-slate-100 flex items-center gap-2 flex-wrap text-sm sm:text-base font-semibold">
          <span className="font-extrabold text-slate-900 uppercase tracking-wide text-xs sm:text-sm">Enterprise Lifecycle:</span>
          <span className="text-slate-900 font-bold">Request</span>
          <span className="text-purple-500 font-bold">→</span>
          <span className="text-slate-900 font-bold">Review</span>
          <span className="text-purple-500 font-bold">→</span>
          <span className="text-slate-900 font-bold">Purchase Order</span>
          <span className="text-purple-500 font-bold">→</span>
          <span className="text-slate-900 font-bold">Shipping</span>
          <span className="text-purple-500 font-bold">→</span>
          <span className="text-slate-900 font-bold">Goods Receipt</span>
          <span className="text-purple-500 font-bold">→</span>
          <span className="text-slate-900 font-bold">Quality Check</span>
          <span className="text-purple-500 font-bold">→</span>
          <span className="text-slate-900 font-bold">Cataloging</span>
          <span className="text-purple-500 font-bold">→</span>
          <span className="text-purple-700 font-extrabold bg-purple-50 px-3 py-1 rounded-full border border-purple-200 shadow-2xs text-xs sm:text-sm">
            Active in Library
          </span>
        </div>
      </div>

      {toast && (
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-emerald-50 text-emerald-900 border border-emerald-200 text-sm font-semibold shadow-xs animate-fadeIn">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
          <span>{toast}</span>
        </div>
      )}

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex items-center gap-4 hover:shadow-md transition-all">
          <div className="h-14 w-14 rounded-2xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-700 font-bold shrink-0 shadow-2xs">
            <ShoppingBag className="h-7 w-7" />
          </div>
          <div>
            <span className="text-xs sm:text-sm font-extrabold text-slate-500 uppercase tracking-wider block">Total Requests</span>
            <h3 className="text-3xl sm:text-4xl font-extrabold font-poppins text-slate-950 mt-0.5">{totalRequestsCount}</h3>
            <span className="text-xs text-purple-700 font-bold">Faculty & Student Submissions</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex items-center gap-4 hover:shadow-md transition-all">
          <div className="h-14 w-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700 font-bold shrink-0 shadow-2xs">
            <FileText className="h-7 w-7" />
          </div>
          <div>
            <span className="text-xs sm:text-sm font-extrabold text-slate-500 uppercase tracking-wider block">Active POs Issued</span>
            <h3 className="text-3xl sm:text-4xl font-extrabold font-poppins text-slate-950 mt-0.5">{activePOCount}</h3>
            <span className="text-xs text-indigo-700 font-bold">Budget: ₹{totalBudgetCommitted.toLocaleString()}</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex items-center gap-4 hover:shadow-md transition-all">
          <div className="h-14 w-14 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-700 font-bold shrink-0 shadow-2xs">
            <Package className="h-7 w-7" />
          </div>
          <div>
            <span className="text-xs sm:text-sm font-extrabold text-slate-500 uppercase tracking-wider block">Goods Received</span>
            <h3 className="text-3xl sm:text-4xl font-extrabold font-poppins text-slate-950 mt-0.5">
              {requests.filter((r) => r.status === 'RECEIVED' || r.status === 'QUALITY_CHECKED').length}
            </h3>
            <span className="text-xs text-teal-700 font-bold">Quality & Cataloging Queue</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex items-center gap-4 hover:shadow-md transition-all">
          <div className="h-14 w-14 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700 font-bold shrink-0 shadow-2xs">
            <CheckCircle2 className="h-7 w-7" />
          </div>
          <div>
            <span className="text-xs sm:text-sm font-extrabold text-slate-500 uppercase tracking-wider block">Cataloged & Active</span>
            <h3 className="text-3xl sm:text-4xl font-extrabold font-poppins text-slate-950 mt-0.5">{totalCatalogedCount}</h3>
            <span className="text-xs text-emerald-700 font-bold">Ready for Borrowing</span>
          </div>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="bg-white rounded-2xl border border-slate-200 p-2 flex flex-wrap items-center justify-between gap-2 shadow-xs">
        <div className="flex items-center gap-1.5 overflow-x-auto whitespace-nowrap">
          <button
            onClick={() => setActiveTab('LIFECYCLE')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'LIFECYCLE' ? 'bg-purple-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Layers className="h-4 w-4" /> Procurement Register & Lifecycle ({requests.length})
          </button>
          <button
            onClick={() => setActiveTab('VENDORS')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'VENDORS' ? 'bg-purple-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Building2 className="h-4 w-4" /> Registered Suppliers & POs ({vendors.length})
          </button>
          <button
            onClick={() => setActiveTab('DUPLICATES')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'DUPLICATES' ? 'bg-purple-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <AlertTriangle className="h-4 w-4" /> Duplicate Resolution Desk ({duplicatesList.length})
          </button>
        </div>
      </div>

      {/* TAB 1: LIFECYCLE REGISTER */}
      {activeTab === 'LIFECYCLE' && (
        <div className="space-y-4">
          {/* Filters & Search Toolbar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search Title, ISBN, Author, PO, Vendor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-purple-500/20"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
              <div className="relative">
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="pl-3.5 pr-9 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 bg-slate-50/80 focus:bg-white appearance-none cursor-pointer truncate"
                >
                  <option value="ALL">All Statuses (11 Lifecycle Stages)</option>
                  {LIFECYCLE_STAGES.map((s) => (
                    <option key={s.status} value={s.status}>
                      {s.label} ({s.status})
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
              </div>

              <div className="relative">
                <select
                  value={filterRole}
                  onChange={(e) => setFilterRole(e.target.value)}
                  className="pl-3.5 pr-9 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 bg-slate-50/80 focus:bg-white appearance-none cursor-pointer truncate"
                >
                  <option value="ALL">All Requester Roles</option>
                  <option value="STUDENT">Student Only</option>
                  <option value="FACULTY">Faculty Only</option>
                  <option value="ADMIN">Admin / Staff</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Table Register */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 border-b border-slate-200 font-extrabold uppercase tracking-wider text-slate-600 text-xs">
                  <tr>
                    <th className="py-3.5 px-4 align-middle">Requested Title & Author</th>
                    <th className="py-3.5 px-4 align-middle whitespace-nowrap">Requester</th>
                    <th className="py-3.5 px-4 align-middle whitespace-nowrap">Supplier & PO</th>
                    <th className="py-3.5 px-4 align-middle min-w-[200px]">Lifecycle Stepper Progress</th>
                    <th className="py-3.5 px-4 align-middle whitespace-nowrap">Status</th>
                    <th className="py-3.5 px-4 align-middle text-right whitespace-nowrap">Lifecycle Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRequests.map((req) => {
                    const currentStageObj = LIFECYCLE_STAGES.find((s) => s.status === req.status) || LIFECYCLE_STAGES[0];

                    return (
                      <tr key={req.id} className="hover:bg-slate-50/80 transition-colors">
                        {/* Book Info */}
                        <td className="py-4 px-4 align-middle font-semibold max-w-[260px]">
                          <p className="text-slate-900 font-bold text-sm leading-snug whitespace-nowrap truncate" title={req.bookTitle}>{req.bookTitle}</p>
                          <p className="text-slate-500 text-xs mt-0.5 whitespace-nowrap truncate">
                            By <strong className="text-slate-700">{req.authorName}</strong> {req.isbn ? `| ISBN: ${req.isbn}` : ''}
                          </p>
                          {req.isDuplicate && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-extrabold bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full mt-1">
                              <AlertTriangle className="h-3 w-3 text-amber-700" /> Duplicate Recommendation
                            </span>
                          )}
                        </td>

                        {/* Requester Info */}
                        <td className="py-4 px-4 align-middle whitespace-nowrap">
                          <p className="font-bold text-slate-900 whitespace-nowrap">{req.requestedByName}</p>
                          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-extrabold uppercase mt-0.5 ${
                            req.requestedByRole === 'FACULTY' ? 'bg-purple-100 text-purple-800' : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {req.requestedByRole}
                          </span>
                        </td>

                        {/* PO & Vendor */}
                        <td className="py-4 px-4 align-middle whitespace-nowrap">
                          {req.poNumber ? (
                            <div className="space-y-0.5">
                              <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200 block w-max">
                                {req.poNumber}
                              </span>
                              <p className="text-[11px] text-slate-600 font-medium truncate max-w-[140px]">{req.vendorName || 'Assigned Supplier'}</p>
                              <p className="text-[10px] text-slate-400 font-mono">Cost: ₹{((req.approvedPrice || req.estimatedPrice || 0) * (req.quantityRequested || 1)).toLocaleString()}</p>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">No PO Issued</span>
                          )}
                        </td>

                        {/* Visual Progress Stepper */}
                        <td className="py-4 px-4 align-middle min-w-[200px]">
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-[10px] font-bold text-slate-500">
                              <span>Step {currentStageObj.step} of 10</span>
                              <span className="font-semibold text-purple-700">{currentStageObj.label}</span>
                            </div>
                            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden flex">
                              <div
                                className={`h-full transition-all duration-500 ${
                                  req.status === 'REJECTED'
                                    ? 'bg-rose-500'
                                    : req.status === 'ON_HOLD'
                                    ? 'bg-amber-500'
                                    : 'bg-gradient-to-r from-purple-600 to-indigo-600'
                                }`}
                                style={{ width: `${(currentStageObj.step / 10) * 100}%` }}
                              />
                            </div>
                          </div>
                        </td>

                        {/* Status Badge */}
                        <td className="py-4 px-4 align-middle font-bold whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-extrabold uppercase border ${currentStageObj.color}`}>
                            {req.status}
                          </span>
                          <p className="text-[10px] text-slate-400 font-mono mt-1">{formatOnlyTimeInBracket(req.requestedDate)}</p>
                        </td>

                        {/* Action Buttons */}
                        <td className="py-4 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5 flex-wrap">
                            <button
                              onClick={() => handleOpenAction(req, 'TIMELINE')}
                              className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold flex items-center gap-1"
                              title="View History Timeline"
                            >
                              <History className="h-3.5 w-3.5 text-slate-500" /> Audit Timeline
                            </button>

                            {req.poNumber && (
                              <button
                                onClick={() => handleOpenAction(req, 'PRINT_PO')}
                                className="px-2.5 py-1.5 rounded-lg border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center gap-1"
                                title="Print Formal Purchase Order"
                              >
                                <Printer className="h-3.5 w-3.5 text-indigo-600" /> View PO
                              </button>
                            )}

                            {/* Workflow Stepper Advancements */}
                            {req.status === 'PENDING' && (
                              <>
                                <button
                                  onClick={() => handleOpenAction(req, 'UNDER_REVIEW')}
                                  className="px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold"
                                >
                                  Review
                                </button>
                                <button
                                  onClick={() => handleOpenAction(req, 'APPROVED')}
                                  className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
                                >
                                  Approve
                                </button>
                              </>
                            )}

                            {(req.status === 'APPROVED' || req.status === 'UNDER_REVIEW') && (
                              <button
                                onClick={() => handleOpenAction(req, 'PO_GENERATED')}
                                className="px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold"
                              >
                                Issue PO
                              </button>
                            )}

                            {req.status === 'PO_GENERATED' && (
                              <button
                                onClick={() => handleOpenAction(req, 'ORDERED')}
                                className="px-2.5 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold"
                              >
                                Mark Dispatched
                              </button>
                            )}

                            {req.status === 'ORDERED' && (
                              <button
                                onClick={() => handleOpenAction(req, 'RECEIVED')}
                                className="px-2.5 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold"
                              >
                                Receive Goods
                              </button>
                            )}

                            {req.status === 'RECEIVED' && (
                              <button
                                onClick={() => handleOpenAction(req, 'QUALITY_CHECKED')}
                                className="px-2.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold"
                              >
                                Quality Check
                              </button>
                            )}

                            {req.status === 'QUALITY_CHECKED' && (
                              <button
                                onClick={() => handleOpenAction(req, 'CATALOGED')}
                                className="px-2.5 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold flex items-center gap-1"
                              >
                                <Barcode className="h-3.5 w-3.5" /> Catalog & Activate
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {filteredRequests.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400 space-y-2">
                        <ShoppingBag className="h-8 w-8 mx-auto text-slate-300" />
                        <p className="font-semibold text-slate-600 text-sm">No procurement records found matching filters.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: VENDOR DIRECTORY */}
      {activeTab === 'VENDORS' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {vendors.map((vendor) => (
              <div key={vendor.id} className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-700 font-bold">
                      <Building2 className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-base">{vendor.name}</h3>
                      <p className="text-xs text-slate-500 font-medium">{vendor.contactPerson}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full text-xs font-bold">
                    <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-500" /> {vendor.rating || 4.9}
                  </div>
                </div>

                <div className="text-xs space-y-1 text-slate-600 font-medium">
                  <p>📧 {vendor.email} | 📞 {vendor.phone}</p>
                  <p>📍 {vendor.address}</p>
                </div>

                <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] font-bold uppercase text-slate-400">Specializations:</span>
                  {(vendor.specializationCategories || ['Computer Science', 'Physics']).map((cat) => (
                    <span key={cat} className="text-[10px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full">
                      {cat}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: DUPLICATE RESOLUTION DESK */}
      {activeTab === 'DUPLICATES' && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-3 bg-amber-50 text-amber-900 border border-amber-200 p-4 rounded-2xl">
            <AlertTriangle className="h-6 w-6 text-amber-600 shrink-0" />
            <div>
              <h4 className="font-bold text-sm">Duplicate Recommendation Detection Engine</h4>
              <p className="text-xs text-amber-800">
                Multiple students or faculty recommending the same textbook are automatically flagged to prevent redundant purchase orders and enable bulk supplier discount negotiation.
              </p>
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            {duplicatesList.map((req) => (
              <div key={req.id} className="py-4 flex items-center justify-between gap-4">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">{req.bookTitle}</h4>
                  <p className="text-xs text-slate-500">By {req.authorName} {req.isbn ? `| ISBN: ${req.isbn}` : ''}</p>
                  <p className="text-xs text-purple-700 font-semibold mt-1">
                    Requested by: {req.requestedByName} ({req.requestedByRole})
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 bg-amber-100 text-amber-900 text-xs font-bold rounded-full border border-amber-300">
                    Flagged Duplicate
                  </span>
                  <button
                    onClick={() => {
                      libraryStore.mergeDuplicateRequests(requests[0].id, [req.id]);
                      triggerToast(`Merged duplicate recommendation into primary order.`);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-purple-600 text-white font-bold text-xs hover:bg-purple-700 cursor-pointer"
                  >
                    Merge Order
                  </button>
                </div>
              </div>
            ))}

            {duplicatesList.length === 0 && (
              <div className="py-8 text-center text-slate-400 space-y-1">
                <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto opacity-60" />
                <p className="text-xs font-bold text-slate-600">No Pending Duplicate Flags</p>
                <p className="text-[11px] text-slate-400">All student and faculty acquisition recommendations are unique.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ACTION MODAL DIALOGS */}
      {actionModalType && selectedRequest && actionModalType !== 'TIMELINE' && actionModalType !== 'PRINT_PO' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-4">
            <h3 className="text-lg font-bold font-poppins text-slate-900">
              Advance Procurement Stage: <span className="text-purple-700">{actionModalType}</span>
            </h3>
            <p className="text-xs text-slate-600">
              Updating procurement file for <strong className="text-slate-900">"{selectedRequest.bookTitle}"</strong>.
            </p>

            {/* Stage Specific Controls */}
            {(actionModalType === 'PO_GENERATED' || actionModalType === 'ORDERED') && (
              <div className="space-y-3 pt-1">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Select Registered Book Supplier / Vendor</label>
                  <select
                    value={selectedVendorId}
                    onChange={(e) => setSelectedVendorId(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 bg-slate-50"
                  >
                    {vendors.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name} ({v.contactPerson})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Purchase Order (PO) Number</label>
                    <input
                      type="text"
                      value={poNumberInput}
                      onChange={(e) => setPoNumberInput(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Approved Unit Price (₹)</label>
                    <input
                      type="number"
                      value={approvedPriceInput}
                      onChange={(e) => setApprovedPriceInput(Number(e.target.value))}
                      className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-bold"
                    />
                  </div>
                </div>
              </div>
            )}

            {actionModalType === 'RECEIVED' && (
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Received Quantity (Copies)</label>
                  <input
                    type="number"
                    value={receivedQtyInput}
                    onChange={(e) => setReceivedQtyInput(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Invoice / Delivery Chalani No</label>
                  <input
                    type="text"
                    value={invoiceNoInput}
                    onChange={(e) => setInvoiceNoInput(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-mono font-bold"
                  />
                </div>
              </div>
            )}

            {(actionModalType === 'CATALOGED' || actionModalType === 'AVAILABLE') && (
              <div className="space-y-3 pt-1">
                <div className="p-3 bg-purple-50 rounded-2xl border border-purple-200 text-xs text-purple-950 font-medium">
                  ✨ <strong>Auto-Cataloging Enabled:</strong> Confirming will auto-create accession copies, barcodes, QR codes, and inject the textbook directly into the live library catalog!
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Assigned Rack Number</label>
                    <input
                      type="text"
                      value={assignedRackInput}
                      onChange={(e) => setAssignedRackInput(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Assigned Shelf Number</label>
                    <input
                      type="text"
                      value={assignedShelfInput}
                      onChange={(e) => setAssignedShelfInput(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-bold"
                    />
                  </div>
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Administrative Audit Note</label>
              <textarea
                rows={2}
                placeholder="Log notes for audit ledger..."
                value={adminNotesInput}
                onChange={(e) => setAdminNotesInput(e.target.value)}
                className="w-full p-3 rounded-2xl border border-slate-200 text-xs font-medium"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setActionModalType(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmLifecycleAction}
                className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-md cursor-pointer"
              >
                Confirm {actionModalType}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PRINT FORMAL PURCHASE ORDER (PO) MODAL */}
      {actionModalType === 'PRINT_PO' && selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full p-8 space-y-6 my-auto">
            <div className="flex items-center justify-between border-b pb-4">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-600 text-white font-bold">
                  <BookOpen className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="text-lg font-black font-poppins text-slate-900">University Central Library</h2>
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Formal Purchase Order Document</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-sm font-black text-purple-700 font-mono">{selectedRequest.poNumber}</span>
                <p className="text-xs text-slate-400 font-mono">Date: {selectedRequest.poDate || '2026-07-22'}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                <span className="font-bold text-slate-400 uppercase text-[10px]">Vendor / Supplier Details:</span>
                <p className="font-bold text-slate-900">{selectedRequest.vendorName || 'Oxford University Press'}</p>
                <p className="text-slate-600">{selectedRequest.vendorContact || 'Academic Sales Division'}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                <span className="font-bold text-slate-400 uppercase text-[10px]">Deliver To:</span>
                <p className="font-bold text-slate-900">University Central Library Acquisition Desk</p>
                <p className="text-slate-600">Main Campus, Institutional Area</p>
              </div>
            </div>

            <table className="w-full text-left text-xs border border-slate-200 rounded-xl overflow-hidden">
              <thead className="bg-slate-100 font-bold text-slate-700 border-b">
                <tr>
                  <th className="p-3">Item Description</th>
                  <th className="p-3 text-center">Qty</th>
                  <th className="p-3 text-right">Unit Price (₹)</th>
                  <th className="p-3 text-right">Total (₹)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="p-3 font-semibold">
                    <p className="font-bold text-slate-900">{selectedRequest.bookTitle}</p>
                    <p className="text-slate-500">Author: {selectedRequest.authorName} {selectedRequest.isbn ? `| ISBN: ${selectedRequest.isbn}` : ''}</p>
                  </td>
                  <td className="p-3 text-center font-bold">{selectedRequest.quantityRequested || 1}</td>
                  <td className="p-3 text-right font-mono">₹{(selectedRequest.approvedPrice || selectedRequest.estimatedPrice || 0).toFixed(2)}</td>
                  <td className="p-3 text-right font-mono font-bold">
                    ₹{((selectedRequest.approvedPrice || selectedRequest.estimatedPrice || 0) * (selectedRequest.quantityRequested || 1)).toFixed(2)}
                  </td>
                </tr>
              </tbody>
            </table>

            <div className="flex justify-between items-end pt-4 border-t">
              <div className="text-[11px] text-slate-400 space-y-1">
                <p>Terms: Payment within 30 days upon physical inspection.</p>
                <p>Authorized Signature: _______________________ (Head Librarian)</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setActionModalType(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600"
                >
                  Close
                </button>
                <button
                  onClick={() => window.print()}
                  className="px-5 py-2 rounded-xl bg-purple-600 text-white text-xs font-bold shadow-md cursor-pointer flex items-center gap-1"
                >
                  <Printer className="h-4 w-4" /> Print Purchase Order
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AUDIT TIMELINE DRAWER */}
      {actionModalType === 'TIMELINE' && selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-xl w-full p-6 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-lg font-bold font-poppins text-slate-900">Procurement Audit History Timeline</h3>
              <button onClick={() => setActionModalType(null)} className="text-slate-400 hover:text-slate-600 font-bold">
                ✕
              </button>
            </div>

            <div>
              <h4 className="font-bold text-slate-900 text-base">{selectedRequest.bookTitle}</h4>
              <p className="text-xs text-slate-500">By {selectedRequest.authorName}</p>
            </div>

            <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-purple-200">
              {(selectedRequest.timeline || []).map((step, idx) => (
                <div key={idx} className="relative flex items-start gap-3">
                  <div className="absolute -left-6 top-1 h-5 w-5 rounded-full bg-purple-600 border-2 border-white flex items-center justify-center text-white text-[10px]">
                    ✓
                  </div>
                  <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 w-full space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-purple-900">{step.label}</span>
                      <span className="font-mono text-[10px] text-slate-400">({step.timestamp})</span>
                    </div>
                    <p className="text-slate-600">Actor: <strong className="text-slate-800">{step.actorName}</strong> ({step.actorRole})</p>
                    {step.notes && <p className="text-slate-500 italic">"{step.notes}"</p>}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2">
              <button onClick={() => setActionModalType(null)} className="px-5 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs">
                Close Timeline
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NEW REQUEST MODAL */}
      {actionModalType === 'NEW_REQUEST' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <form onSubmit={handleCreateRequest} className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold font-poppins text-slate-900">New Procurement Recommendation</h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Book Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Distributed Operating Systems"
                  value={newBookTitle}
                  onChange={(e) => setNewBookTitle(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-bold"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Author Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="Author"
                    value={newAuthorName}
                    onChange={(e) => setNewAuthorName(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 font-medium"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">ISBN</label>
                  <input
                    type="text"
                    placeholder="978-..."
                    value={newIsbn}
                    onChange={(e) => setNewIsbn(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Publisher</label>
                <input
                  type="text"
                  placeholder="e.g. Pearson / MIT Press"
                  value={newPublisher}
                  onChange={(e) => setNewPublisher(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-medium"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Reason for Acquisition</label>
                <textarea
                  rows={2}
                  placeholder="Course requirement / syllabus..."
                  value={newReason}
                  onChange={(e) => setNewReason(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-medium"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setActionModalType(null)} className="px-4 py-2 rounded-xl border text-xs font-bold text-slate-600">
                Cancel
              </button>
              <button type="submit" className="px-5 py-2 rounded-xl bg-purple-600 text-white text-xs font-bold cursor-pointer">
                Submit Request
              </button>
            </div>
          </form>
        </div>
      )}

      {/* NEW VENDOR MODAL */}
      {actionModalType === 'NEW_VENDOR' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <form onSubmit={handleCreateVendor} className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold font-poppins text-slate-900">Register New Book Supplier / Vendor</h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Supplier Company Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Oxford Book Distributors"
                  value={newVendorName}
                  onChange={(e) => setNewVendorName(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-bold"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Contact Person</label>
                  <input
                    type="text"
                    placeholder="Sales Officer"
                    value={newVendorContact}
                    onChange={(e) => setNewVendorContact(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 font-medium"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    placeholder="sales@vendor.com"
                    value={newVendorEmail}
                    onChange={(e) => setNewVendorEmail(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 font-medium"
                  />
                </div>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Office Address</label>
                <input
                  type="text"
                  placeholder="Institutional Area..."
                  value={newVendorAddress}
                  onChange={(e) => setNewVendorAddress(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-medium"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setActionModalType(null)} className="px-4 py-2 rounded-xl border text-xs font-bold text-slate-600">
                Cancel
              </button>
              <button type="submit" className="px-5 py-2 rounded-xl bg-purple-600 text-white text-xs font-bold cursor-pointer">
                Register Supplier
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
