import React, { useState, useEffect, useMemo } from 'react';
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
  X,
  Edit2,
  Trash2,
  CheckCircle,
  ArrowUpDown,
  Kanban,
  FileSpreadsheet,
  IndianRupee,
  RefreshCw,
  Eye,
  Send,
  SlidersHorizontal,
  FolderPlus,
} from 'lucide-react';
import { libraryStore, getLocalDateStr, formatOnlyTimeInBracket } from '../../services/libraryStore.service';
import { exportStyledExcelFile } from '../../utils/excelExport';
import { useAuth } from '../../context/AuthContext';
import { ProcurementRequest, ProcurementStatus, Vendor, Role } from '../../types/library';
import {
  generateBarcodeSvgString,
  generateQrSvgString,
  printLabelStickers,
} from '../../utils/barcodeQrGenerator';

const LIFECYCLE_STAGES: Array<{ status: ProcurementStatus; label: string; step: number; color: string; badgeColor: string }> = [
  { status: 'PENDING', label: 'Requisition Created', step: 1, color: 'bg-slate-100 text-slate-800 border-slate-300', badgeColor: 'bg-slate-100 text-slate-700 border-slate-200' },
  { status: 'UNDER_REVIEW', label: 'Committee Review', step: 2, color: 'bg-blue-100 text-blue-800 border-blue-300', badgeColor: 'bg-blue-50 text-blue-700 border-blue-200' },
  { status: 'ON_HOLD', label: 'On Hold (Clarification)', step: 3, color: 'bg-amber-100 text-amber-900 border-amber-300', badgeColor: 'bg-amber-50 text-amber-800 border-amber-200' },
  { status: 'APPROVED', label: 'Approved for Acquisition', step: 4, color: 'bg-emerald-100 text-emerald-800 border-emerald-300', badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { status: 'REJECTED', label: 'Requisition Rejected', step: 4, color: 'bg-rose-100 text-rose-800 border-rose-300', badgeColor: 'bg-rose-50 text-rose-700 border-rose-200' },
  { status: 'PO_GENERATED', label: 'PO Issued to Vendor', step: 5, color: 'bg-indigo-100 text-indigo-800 border-indigo-300', badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  { status: 'ORDERED', label: 'Dispatched & In-Transit', step: 6, color: 'bg-purple-100 text-purple-800 border-purple-300', badgeColor: 'bg-purple-50 text-purple-700 border-purple-200' },
  { status: 'RECEIVED', label: 'Goods Received (Challan)', step: 7, color: 'bg-teal-100 text-teal-800 border-teal-300', badgeColor: 'bg-teal-50 text-teal-700 border-teal-200' },
  { status: 'QUALITY_CHECKED', label: 'Quality Verification Passed', step: 8, color: 'bg-cyan-100 text-cyan-800 border-cyan-300', badgeColor: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
  { status: 'CATALOGED', label: 'Cataloged & Accessioned', step: 9, color: 'bg-violet-100 text-violet-800 border-violet-300', badgeColor: 'bg-violet-50 text-violet-700 border-violet-200' },
  { status: 'AVAILABLE', label: 'Active on Library Shelf', step: 10, color: 'bg-emerald-600 text-white border-emerald-700', badgeColor: 'bg-emerald-600 text-white border-emerald-700' },
  { status: 'CLOSED', label: 'Procurement File Closed', step: 10, color: 'bg-slate-700 text-white border-slate-800', badgeColor: 'bg-slate-100 text-slate-600 border-slate-200' },
];

const PRESET_BOOK_TEMPLATES = [
  {
    title: 'Designing Data-Intensive Applications',
    author: 'Martin Kleppmann',
    isbn: '978-1449373320',
    publisher: "O'Reilly Media",
    price: 3200,
    categoryName: 'Computer Science & Software Engineering',
  },
  {
    title: 'Artificial Intelligence: A Modern Approach (4th Edition)',
    author: 'Stuart Russell & Peter Norvig',
    isbn: '978-0134610993',
    publisher: 'Pearson Education',
    price: 4500,
    categoryName: 'Artificial Intelligence & Data Science',
  },
  {
    title: 'Introduction to Algorithms (4th Edition)',
    author: 'Thomas H. Cormen, Charles E. Leiserson',
    isbn: '978-0262046305',
    publisher: 'MIT Press',
    price: 4200,
    categoryName: 'Computer Science & Software Engineering',
  },
  {
    title: 'Cloud Native DevOps with Kubernetes',
    author: 'John Arundel & Domingus Salgado',
    isbn: '978-1492040767',
    publisher: "O'Reilly Media",
    price: 2800,
    categoryName: 'Information Technology & Cloud Systems',
  },
  {
    title: 'Deep Learning & Neural Networks Handbook',
    author: 'Ian Goodfellow, Yoshua Bengio',
    isbn: '978-0262035613',
    publisher: 'MIT Press',
    price: 3900,
    categoryName: 'Artificial Intelligence & Data Science',
  },
];

export default function ProcurementManagement() {
  const { user } = useAuth();
  const [state, setState] = useState(libraryStore.snapshot);
  const [activeTab, setActiveTab] = useState<'LIFECYCLE' | 'PIPELINE' | 'VENDORS' | 'DUPLICATES' | 'PO_ARCHIVE'>('LIFECYCLE');
  
  // Filters & Searching
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterRole, setFilterRole] = useState<string>('ALL');
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'NEWEST' | 'OLDEST' | 'PRICE_HIGH' | 'PRICE_LOW' | 'TITLE'>('NEWEST');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  // Modals & Action Drawers
  const [selectedRequest, setSelectedRequest] = useState<ProcurementRequest | null>(null);
  const [actionModalType, setActionModalType] = useState<
    ProcurementStatus | 'TIMELINE' | 'PRINT_PO' | 'NEW_REQUEST' | 'NEW_VENDOR' | 'EDIT_VENDOR' | 'PRINT_BARCODES' | null
  >(null);

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
  const [newQuantity, setNewQuantity] = useState(1);
  const [newCategoryName, setNewCategoryName] = useState('Computer Science & Software Engineering');
  const [newMemberCardNo, setNewMemberCardNo] = useState('');
  const [newRequesterRole, setNewRequesterRole] = useState<Role>('FACULTY');
  const [newRequesterName, setNewRequesterName] = useState('Dr. Sarah Connor');
  const [newUrgency, setNewUrgency] = useState<'NORMAL' | 'HIGH' | 'CRITICAL_SYLLABUS'>('HIGH');
  const [newReason, setNewReason] = useState('');

  // Handle Member lookup by Card No / Student ID / Roll No / Email
  const handleMemberLookup = (val: string) => {
    setNewMemberCardNo(val);
    const query = val.trim().toLowerCase();
    if (!query) return;

    const found = (state.members || []).find(
      (m) =>
        m.memberCardNo?.toLowerCase() === query ||
        m.id?.toLowerCase() === query ||
        m.email?.toLowerCase() === query ||
        m.name?.toLowerCase() === query ||
        (m.memberCardNo && m.memberCardNo.toLowerCase().includes(query))
    );

    if (found) {
      setNewRequesterName(found.name);
      setNewRequesterRole(found.role);
      if (found.department) {
        const matchedCat = categories.find(
          (c) =>
            c.name.toLowerCase().includes(found.department!.toLowerCase()) ||
            found.department!.toLowerCase().includes(c.name.toLowerCase())
        );
        if (matchedCat) setNewCategoryName(matchedCat.name);
      }
    }
  };

  // Vendor Form State (Add / Edit)
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [newVendorName, setNewVendorName] = useState('');
  const [newVendorContact, setNewVendorContact] = useState('');
  const [newVendorEmail, setNewVendorEmail] = useState('');
  const [newVendorPhone, setNewVendorPhone] = useState('');
  const [newVendorAddress, setNewVendorAddress] = useState('');
  const [newVendorCategories, setNewVendorCategories] = useState('Computer Science, AI & ML, General Sciences');
  const [newVendorRating, setNewVendorRating] = useState(4.8);

  useEffect(() => {
    const sub = libraryStore.getObservable().subscribe(setState);
    return () => sub.unsubscribe();
  }, []);

  const triggerToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const requests = state.procurementRequests || [];
  const vendors = state.vendors || [];
  const categories = state.categories || [];

  // Filter & Sort requests
  const filteredRequests = useMemo(() => {
    return requests
      .filter((r) => {
        if (filterStatus !== 'ALL' && r.status !== filterStatus) return false;
        if (filterRole !== 'ALL' && r.requestedByRole !== filterRole) return false;
        if (filterCategory !== 'ALL') {
          if (r.assignedCategoryName && r.assignedCategoryName !== filterCategory) return false;
          if (r.assignedCategoryId && r.assignedCategoryId !== filterCategory) return false;
        }
        if (searchTerm.trim()) {
          const q = searchTerm.toLowerCase();
          const matchTitle = r.bookTitle?.toLowerCase().includes(q);
          const matchAuthor = r.authorName?.toLowerCase().includes(q);
          const matchIsbn = r.isbn?.toLowerCase().includes(q);
          const matchPO = r.poNumber?.toLowerCase().includes(q);
          const matchVendor = r.vendorName?.toLowerCase().includes(q);
          const matchUser = r.requestedByName?.toLowerCase().includes(q);
          const matchReason = r.reason?.toLowerCase().includes(q);
          return matchTitle || matchAuthor || matchIsbn || matchPO || matchVendor || matchUser || matchReason;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'NEWEST') return new Date(b.requestedDate).getTime() - new Date(a.requestedDate).getTime();
        if (sortBy === 'OLDEST') return new Date(a.requestedDate).getTime() - new Date(b.requestedDate).getTime();
        if (sortBy === 'PRICE_HIGH') {
          const priceA = (a.approvedPrice || a.estimatedPrice || 0) * (a.quantityRequested || 1);
          const priceB = (b.approvedPrice || b.estimatedPrice || 0) * (b.quantityRequested || 1);
          return priceB - priceA;
        }
        if (sortBy === 'PRICE_LOW') {
          const priceA = (a.approvedPrice || a.estimatedPrice || 0) * (a.quantityRequested || 1);
          const priceB = (b.approvedPrice || b.estimatedPrice || 0) * (b.quantityRequested || 1);
          return priceA - priceB;
        }
        if (sortBy === 'TITLE') return a.bookTitle.localeCompare(b.bookTitle);
        return 0;
      });
  }, [requests, filterStatus, filterRole, filterCategory, searchTerm, sortBy]);

  // Calculate Metrics
  const totalRequestsCount = requests.length;
  const facultyRequestsCount = requests.filter((r) => r.requestedByRole === 'FACULTY').length;
  const studentRequestsCount = requests.filter((r) => r.requestedByRole === 'STUDENT').length;
  const activePOCount = requests.filter((r) => r.status === 'PO_GENERATED' || r.status === 'ORDERED').length;
  const totalBudgetCommitted = requests.reduce(
    (sum, r) => sum + (r.approvedPrice || r.estimatedPrice || 0) * (r.quantityRequested || 1),
    0
  );
  const totalReceivedCount = requests.filter(
    (r) => r.status === 'RECEIVED' || r.status === 'QUALITY_CHECKED'
  ).length;
  const totalCatalogedCount = requests.filter(
    (r) => r.status === 'CATALOGED' || r.status === 'AVAILABLE'
  ).length;
  const pendingReviewCount = requests.filter(
    (r) => r.status === 'PENDING' || r.status === 'UNDER_REVIEW'
  ).length;

  const duplicatesList = useMemo(() => {
    return requests.filter((r) => r.isDuplicate || (r.duplicateCount && r.duplicateCount > 0));
  }, [requests]);

  const poIssuedList = useMemo(() => {
    return requests.filter((r) => !!r.poNumber);
  }, [requests]);

  // Open Action Modal
  const handleOpenAction = (
    req: ProcurementRequest,
    targetStatus: ProcurementStatus | 'TIMELINE' | 'PRINT_PO' | 'PRINT_BARCODES'
  ) => {
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
    setAssignedCategoryId(req.assignedCategoryId || categories[0]?.id || '');
    setAssignedRackInput(req.assignedRackNumber || 'RACK-CS-01');
    setAssignedShelfInput(req.assignedShelfNumber || 'SHELF-A1');
  };

  // Submit Advancement Action
  const handleConfirmLifecycleAction = () => {
    if (!selectedRequest || !actionModalType) return;
    if (
      actionModalType === 'TIMELINE' ||
      actionModalType === 'PRINT_PO' ||
      actionModalType === 'PRINT_BARCODES' ||
      actionModalType === 'NEW_REQUEST' ||
      actionModalType === 'NEW_VENDOR' ||
      actionModalType === 'EDIT_VENDOR'
    )
      return;

    const vendorObj = vendors.find((v) => v.id === selectedVendorId);

    // Generate accession numbers and barcodes if cataloging
    let accessionNos: string[] = [];
    let barcodes: string[] = [];
    if (actionModalType === 'CATALOGED' || actionModalType === 'AVAILABLE') {
      const startNum = Math.floor(900 + Math.random() * 100);
      const copiesCount = receivedQtyInput || quantityInput || 1;
      for (let i = 0; i < copiesCount; i++) {
        accessionNos.push(`ACC-${new Date().getFullYear()}-${startNum + i}`);
        barcodes.push(`BC-${Date.now().toString().substring(6)}${i}`);
      }
    }

    const targetCategory = categories.find((c) => c.id === assignedCategoryId);

    const payload: Partial<ProcurementRequest> = {
      vendorId: vendorObj?.id || selectedRequest.vendorId,
      vendorName: vendorObj?.name || selectedRequest.vendorName,
      vendorContact: vendorObj?.contactPerson || selectedRequest.vendorContact,
      poNumber: poNumberInput || selectedRequest.poNumber,
      poDate: selectedRequest.poDate || getLocalDateStr(new Date()),
      quantityRequested: quantityInput,
      approvedPrice: approvedPriceInput,
      actualPrice: approvedPriceInput,
      invoiceNo: invoiceNoInput,
      receivedDate: actionModalType === 'RECEIVED' ? getLocalDateStr(new Date()) : selectedRequest.receivedDate,
      receivedQuantity: receivedQtyInput,
      qualityStatus: qualityStatusInput,
      assignedCategoryId: targetCategory?.id || assignedCategoryId,
      assignedCategoryName: targetCategory?.name || selectedRequest.assignedCategoryName || 'Computer Science & Software Engineering',
      assignedRackNumber: assignedRackInput,
      assignedShelfNumber: assignedShelfInput,
      generatedAccessionNos: accessionNos.length ? accessionNos : selectedRequest.generatedAccessionNos,
      generatedBarcodes: barcodes.length ? barcodes : selectedRequest.generatedBarcodes,
      adminNotes: adminNotesInput,
    };

    const res = libraryStore.advanceProcurementLifecycle(
      selectedRequest.id,
      actionModalType,
      payload,
      adminNotesInput,
      'Chief Admin Librarian'
    );

    if (res.success) {
      triggerToast(res.message, 'success');
    } else {
      triggerToast(res.message, 'error');
    }
    setActionModalType(null);
    setSelectedRequest(null);
  };

  // Auto-fill form from template
  const handleSelectTemplate = (tmpl: (typeof PRESET_BOOK_TEMPLATES)[0]) => {
    setNewBookTitle(tmpl.title);
    setNewAuthorName(tmpl.author);
    setNewIsbn(tmpl.isbn);
    setNewPublisher(tmpl.publisher);
    setNewEstPrice(tmpl.price);
    setNewCategoryName(tmpl.categoryName);
  };

  // Create New Request
  const handleCreateRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBookTitle.trim() || !newAuthorName.trim()) {
      triggerToast('Please provide both book title and author name.', 'error');
      return;
    }

    const newReq = libraryStore.addProcurementRequest({
      bookTitle: newBookTitle.trim(),
      authorName: newAuthorName.trim(),
      isbn: newIsbn.trim() || undefined,
      publisherName: newPublisher.trim() || undefined,
      estimatedPrice: Number(newEstPrice) || 2500,
      reason: newReason.trim() || `Course requirement & syllabus reference for ${newCategoryName}. Priority: ${newUrgency}.`,
      requestedById: '1',
      requestedByName: newRequesterName || 'Chief Admin Librarian',
      requestedByRole: newRequesterRole || 'ADMIN',
      quantityRequested: Number(newQuantity) || 1,
      assignedCategoryName: newCategoryName,
    });

    triggerToast(`Procurement recommendation created for "${newReq.bookTitle}".`, 'success');
    setActionModalType(null);
    setNewBookTitle('');
    setNewAuthorName('');
    setNewIsbn('');
    setNewPublisher('');
    setNewReason('');
  };

  // Create or Update Vendor
  const handleSaveVendor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVendorName.trim()) return;

    const cats = newVendorCategories
      .split(',')
      .map((c) => c.trim())
      .filter(Boolean);

    if (editingVendor) {
      libraryStore.updateVendor(editingVendor.id, {
        name: newVendorName.trim(),
        contactPerson: newVendorContact.trim() || 'Sales Desk',
        email: newVendorEmail.trim() || 'sales@vendor.com',
        phone: newVendorPhone.trim() || '+91 98000 00000',
        address: newVendorAddress.trim() || 'New Delhi Institutional Area',
        specializationCategories: cats.length ? cats : ['Computer Science', 'General Sciences'],
        rating: newVendorRating,
      });
      triggerToast(`Supplier profile for "${newVendorName}" updated.`, 'success');
    } else {
      const v = libraryStore.addVendor({
        name: newVendorName.trim(),
        contactPerson: newVendorContact.trim() || 'Sales Desk',
        email: newVendorEmail.trim() || 'sales@vendor.com',
        phone: newVendorPhone.trim() || '+91 98000 00000',
        address: newVendorAddress.trim() || 'New Delhi Institutional Area',
        specializationCategories: cats.length ? cats : ['Computer Science', 'General Sciences'],
        rating: newVendorRating,
      });
      triggerToast(`Registered new supplier "${v.name}".`, 'success');
    }

    setActionModalType(null);
    setEditingVendor(null);
    setNewVendorName('');
    setNewVendorContact('');
    setNewVendorEmail('');
    setNewVendorPhone('');
    setNewVendorAddress('');
  };

  const handleOpenEditVendor = (v: Vendor) => {
    setEditingVendor(v);
    setNewVendorName(v.name);
    setNewVendorContact(v.contactPerson);
    setNewVendorEmail(v.email);
    setNewVendorPhone(v.phone);
    setNewVendorAddress(v.address);
    setNewVendorCategories((v.specializationCategories || []).join(', '));
    setNewVendorRating(v.rating || 4.8);
    setActionModalType('NEW_VENDOR');
  };

  const handleDeleteVendor = (vendorId: string, vendorName: string) => {
    if (window.confirm(`Are you sure you want to remove supplier "${vendorName}" from registered list?`)) {
      libraryStore.deleteVendor(vendorId);
      triggerToast(`Supplier "${vendorName}" removed.`, 'info');
    }
  };

  // Export to Styled Excel
  const handleExportExcel = () => {
    const headers = [
      'Requisition ID',
      'Book Title',
      'Author Name',
      'ISBN',
      'Publisher',
      'Requester Name',
      'Role',
      'Lifecycle Status',
      'PO Number',
      'Supplier / Vendor',
      'Qty',
      'Approved Price (INR)',
      'Total Budget (INR)',
      'Invoice #',
      'Rack / Shelf',
      'Accession Numbers',
      'Requisition Date',
    ];

    const rows = filteredRequests.map((r) => [
      r.id,
      r.bookTitle || '',
      r.authorName || '',
      r.isbn || '',
      r.publisherName || '',
      r.requestedByName || '',
      r.requestedByRole,
      r.status,
      r.poNumber || 'N/A',
      r.vendorName || 'Not Assigned',
      r.quantityRequested || 1,
      `₹${(r.approvedPrice || r.estimatedPrice || 0).toFixed(2)}`,
      `₹${((r.approvedPrice || r.estimatedPrice || 0) * (r.quantityRequested || 1)).toFixed(2)}`,
      r.invoiceNo || 'N/A',
      r.assignedRackNumber ? `${r.assignedRackNumber} / ${r.assignedShelfNumber || 'A1'}` : 'Unassigned',
      (r.generatedAccessionNos || []).join(', ') || 'Pending Cataloging',
      r.requestedDate,
    ]);

    exportStyledExcelFile({
      filename: `procurement_register_${getLocalDateStr(new Date())}.xlsx`,
      sheetName: 'Procurement Master',
      headers,
      data: rows,
      themeColor: '6D28D9', // Rich Purple
    });

    triggerToast('Procurement register successfully exported to Excel.', 'success');
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank', 'width=1100,height=800');
    if (!printWindow) {
      window.print();
      return;
    }

    const rowsHtml = filteredRequests
      .map(
        (r, idx) => `
        <tr>
          <td style="text-align: center; font-weight: 700;">${idx + 1}</td>
          <td>
            <div style="font-weight: 700; color: #0f172a;">${r.bookTitle}</div>
            <div style="font-size: 11px; color: #64748b;">Author: ${r.authorName} ${r.isbn ? `• ISBN: ${r.isbn}` : ''}</div>
          </td>
          <td>${r.assignedCategoryName || 'General'}</td>
          <td>
            <div style="font-weight: 600;">${r.requestedByName}</div>
            <div style="font-size: 10px; color: #64748b;">${r.requestedByRole}</div>
          </td>
          <td style="text-align: center; font-weight: 700;">${r.quantityRequested || 1}</td>
          <td style="text-align: right; font-weight: 700;">₹${((r.approvedPrice || r.estimatedPrice || 0) * (r.quantityRequested || 1)).toLocaleString()}</td>
          <td style="text-align: center;">
            <span style="display: inline-block; padding: 3px 8px; border-radius: 6px; font-size: 10px; font-weight: 800; background: #f1f5f9; color: #334155;">
              ${r.status.replace(/_/g, ' ')}
            </span>
          </td>
          <td style="font-family: monospace; font-size: 11px;">${r.poNumber || '—'}</td>
        </tr>
      `
      )
      .join('');

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Procurement & Acquisition Register - Central University Library</title>
          <style>
            @page { size: landscape; margin: 15mm; }
            body { font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; color: #1e293b; margin: 0; padding: 20px; font-size: 12px; }
            .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #7c3aed; padding-bottom: 15px; margin-bottom: 20px; }
            .univ-title { font-size: 20px; font-weight: 800; color: #0f172a; margin: 0; }
            .doc-title { font-size: 13px; font-weight: 700; color: #6d28d9; margin-top: 4px; text-transform: uppercase; letter-spacing: 0.5px; }
            .meta { font-size: 11px; color: #64748b; text-align: right; }
            .summary-cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 20px; }
            .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 12px; }
            .card-label { font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; }
            .card-value { font-size: 18px; font-weight: 800; color: #0f172a; margin-top: 2px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
            th { background: #f1f5f9; color: #475569; font-weight: 800; font-size: 11px; text-transform: uppercase; text-align: left; padding: 8px 10px; border: 1px solid #cbd5e1; }
            td { padding: 8px 10px; border: 1px solid #e2e8f0; vertical-align: middle; }
            tr:nth-child(even) { background: #f8fafc; }
            .footer { display: flex; justify-content: space-between; margin-top: 30px; padding-top: 15px; border-top: 1px solid #cbd5e1; font-size: 11px; color: #64748b; }
            .no-print { margin-bottom: 15px; }
            .btn { background: #7c3aed; color: white; border: none; padding: 8px 16px; border-radius: 6px; font-weight: bold; cursor: pointer; }
            @media print { .no-print { display: none; } }
          </style>
        </head>
        <body>
          <div class="no-print">
            <button class="btn" onclick="window.print()">🖨️ Print Document</button>
            <button class="btn" style="background: #64748b; margin-left: 8px;" onclick="window.close()">Close</button>
          </div>
          <div class="header">
            <div>
              <h1 class="univ-title">UNIVERSITY CENTRAL LIBRARY</h1>
              <div class="doc-title">Book Acquisition & Procurement Register Report</div>
              <div style="font-size: 11px; color: #64748b; margin-top: 2px;">Main Administrative Campus • Acquisition & Technical Services Division</div>
            </div>
            <div class="meta">
              <div><strong>Generated Date:</strong> ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
              <div><strong>Filter:</strong> Status: ${filterStatus} | Role: ${filterRole}</div>
              <div><strong>Total Records:</strong> ${filteredRequests.length}</div>
            </div>
          </div>

          <div class="summary-cards">
            <div class="card">
              <div class="card-label">Total Requisitions</div>
              <div class="card-value">${totalRequestsCount}</div>
            </div>
            <div class="card">
              <div class="card-label">Active POs Issued</div>
              <div class="card-value">${activePOCount}</div>
            </div>
            <div class="card">
              <div class="card-label">Total Budget Committed</div>
              <div class="card-value">₹${totalBudgetCommitted.toLocaleString()}</div>
            </div>
            <div class="card">
              <div class="card-label">Cataloged & On Shelf</div>
              <div class="card-value">${totalCatalogedCount}</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 40px; text-align: center;">#</th>
                <th>Book Details</th>
                <th>Department</th>
                <th>Requester</th>
                <th style="width: 60px; text-align: center;">Qty</th>
                <th style="width: 100px; text-align: right;">Total Est. (₹)</th>
                <th style="width: 120px; text-align: center;">Lifecycle Status</th>
                <th style="width: 120px;">PO Reference</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>

          <div class="footer">
            <div>Official Report from University Library Management System</div>
            <div>Authorized Signatory: <strong>${user?.name || 'Chief University Librarian'}</strong></div>
          </div>
          <script>
            window.onload = function() {
              setTimeout(function() { window.print(); }, 400);
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  };

  // Dedicated High-Fidelity Formal Purchase Order Print Window
  const handlePrintFormalPO = (req: ProcurementRequest) => {
    const printWindow = window.open('', '_blank', 'width=950,height=850');
    if (!printWindow) {
      alert('Please allow popups to print official Purchase Orders.');
      return;
    }

    const vendorObj = vendors.find((v) => v.id === req.vendorId || v.name === req.vendorName);
    const poNum = req.poNumber || `PO-${new Date().getFullYear()}-0891`;
    const poDate = req.poDate || getLocalDateStr(new Date());
    const qty = req.quantityRequested || 1;
    const unitPrice = req.approvedPrice || req.estimatedPrice || 2500;
    const subtotal = unitPrice * qty;
    const gstRate = 0.05;
    const gstAmount = subtotal * gstRate;
    const grandTotal = subtotal + gstAmount;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Purchase Order - ${poNum}</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 12mm 15mm;
            }
            * {
              box-sizing: border-box;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            body {
              font-family: 'Segoe UI', system-ui, -apple-system, Roboto, Helvetica, Arial, sans-serif;
              color: #0f172a;
              background: #f8fafc;
              margin: 0;
              padding: 24px;
              font-size: 13px;
              line-height: 1.5;
            }
            @media print {
              body {
                background: #ffffff;
                padding: 0;
              }
              .no-print {
                display: none !important;
              }
              .po-container {
                box-shadow: none !important;
                border: 1px solid #cbd5e1 !important;
                border-radius: 0 !important;
                max-width: 100% !important;
                margin: 0 !important;
                padding: 24px !important;
              }
            }
            .no-print-bar {
              max-width: 800px;
              margin: 0 auto 16px auto;
              display: flex;
              justify-content: space-between;
              align-items: center;
            }
            .print-btn {
              background: #6d28d9;
              color: #ffffff;
              border: none;
              padding: 10px 22px;
              border-radius: 10px;
              font-size: 13px;
              font-weight: 700;
              cursor: pointer;
              box-shadow: 0 4px 12px rgba(109, 40, 217, 0.25);
            }
            .print-btn:hover {
              background: #5b21b6;
            }
            .close-btn {
              background: #e2e8f0;
              color: #334155;
              border: none;
              padding: 10px 18px;
              border-radius: 10px;
              font-size: 13px;
              font-weight: 600;
              cursor: pointer;
            }
            .po-container {
              max-width: 800px;
              margin: 0 auto;
              background: #ffffff;
              padding: 36px 40px;
              border-radius: 16px;
              border: 1px solid #e2e8f0;
              box-shadow: 0 10px 30px rgba(0, 0, 0, 0.05);
            }
            .header-table {
              width: 100%;
              border-collapse: collapse;
              border-bottom: 2px solid #6d28d9;
              padding-bottom: 16px;
              margin-bottom: 20px;
            }
            .univ-title {
              font-size: 20px;
              font-weight: 900;
              color: #0f172a;
              margin: 0;
              letter-spacing: -0.5px;
              text-transform: uppercase;
            }
            .univ-sub {
              font-size: 11px;
              font-weight: 700;
              color: #6d28d9;
              text-transform: uppercase;
              letter-spacing: 1px;
              margin-top: 2px;
            }
            .po-badge {
              font-size: 16px;
              font-weight: 800;
              color: #6d28d9;
              font-family: monospace;
            }
            .meta-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 16px;
              margin-bottom: 24px;
            }
            .meta-box {
              background: #f8fafc;
              border: 1px solid #e2e8f0;
              border-radius: 10px;
              padding: 12px 14px;
            }
            .meta-box-title {
              font-size: 10px;
              font-weight: 800;
              color: #64748b;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              margin-bottom: 6px;
            }
            .items-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 20px;
              font-size: 12px;
            }
            .items-table th {
              background: #f1f5f9;
              color: #334155;
              font-weight: 800;
              text-transform: uppercase;
              font-size: 10px;
              letter-spacing: 0.5px;
              padding: 10px 12px;
              border-top: 1px solid #cbd5e1;
              border-bottom: 2px solid #cbd5e1;
              text-align: left;
            }
            .items-table td {
              padding: 12px;
              border-bottom: 1px solid #e2e8f0;
              vertical-align: top;
            }
            .text-right { text-align: right; }
            .text-center { text-align: center; }
            .totals-table {
              width: 320px;
              margin-left: auto;
              border-collapse: collapse;
              font-size: 12px;
              margin-bottom: 24px;
            }
            .totals-table td {
              padding: 6px 12px;
            }
            .totals-table tr.grand-total {
              border-top: 2px solid #0f172a;
              border-bottom: 2px solid #0f172a;
              font-weight: 800;
              font-size: 14px;
              color: #0f172a;
            }
            .terms-box {
              background: #f8fafc;
              border: 1px solid #e2e8f0;
              border-radius: 8px;
              padding: 12px 14px;
              font-size: 11px;
              color: #475569;
              margin-bottom: 30px;
            }
            .terms-box ol {
              margin: 4px 0 0 16px;
              padding: 0;
            }
            .signatures-grid {
              display: grid;
              grid-template-columns: 1fr 1fr 1fr;
              gap: 20px;
              text-align: center;
              margin-top: 30px;
              padding-top: 20px;
            }
            .sign-line {
              border-top: 1px solid #94a3b8;
              padding-top: 6px;
              font-size: 11px;
              font-weight: 700;
              color: #1e293b;
            }
            .sign-role {
              font-size: 10px;
              color: #64748b;
            }
          </style>
        </head>
        <body>
          <div class="no-print no-print-bar">
            <button onclick="window.print()" class="print-btn">🖨️ Print Purchase Order Document</button>
            <button onclick="window.close()" class="close-btn">Close</button>
          </div>

          <div class="po-container">
            <table class="header-table">
              <tr>
                <td style="vertical-align: middle;">
                  <h1 class="univ-title">University Central Library</h1>
                  <div class="univ-sub">Institutional Acquisition & Procurement Division</div>
                  <div style="font-size: 11px; color: #64748b; margin-top: 2px;">Main Administrative Campus, Institutional Area, Sector 5</div>
                </td>
                <td style="text-align: right; vertical-align: middle;">
                  <div style="font-size: 11px; font-weight: 800; color: #64748b; text-transform: uppercase;">Purchase Order #</div>
                  <div class="po-badge">${poNum}</div>
                  <div style="font-size: 11px; color: #64748b; margin-top: 2px;">Date: <strong>${poDate}</strong></div>
                  <div style="font-size: 10px; color: #94a3b8; font-family: monospace;">Ref: ACQ-LIB-${req.id}</div>
                </td>
              </tr>
            </table>

            <div class="meta-grid">
              <div class="meta-box">
                <div class="meta-box-title">Vendor / Supplier Details</div>
                <div style="font-weight: 800; font-size: 13px; color: #0f172a;">${vendorObj?.name || req.vendorName || 'Oxford University Press & Book Distributors'}</div>
                <div style="color: #334155; margin-top: 2px;">Attn: ${vendorObj?.contactPerson || req.vendorContact || 'Academic Sales Division'}</div>
                <div style="color: #64748b; font-size: 11px; margin-top: 2px;">Email: ${vendorObj?.email || 'orders@vendor.com'} | Phone: ${vendorObj?.phone || '+91 98000 00000'}</div>
                <div style="color: #64748b; font-size: 11px; margin-top: 2px;">${vendorObj?.address || 'Institutional Area, New Delhi - 110027'}</div>
              </div>

              <div class="meta-box">
                <div class="meta-box-title">Delivery & Invoice Destination</div>
                <div style="font-weight: 800; font-size: 13px; color: #0f172a;">Central Library Acquisition Desk</div>
                <div style="color: #334155; margin-top: 2px;">University Central Library - Main Complex</div>
                <div style="color: #64748b; font-size: 11px; margin-top: 2px;">Receiving Desk: Ground Floor, Technical Processing Unit</div>
                <div style="color: #64748b; font-size: 11px; margin-top: 2px;">Contact: Chief Admin Librarian (+91 11 2659 0000)</div>
              </div>
            </div>

            <table class="items-table">
              <thead>
                <tr>
                  <th style="width: 5%;">#</th>
                  <th style="width: 45%;">Item Description & Academic Subject</th>
                  <th class="text-center" style="width: 10%;">Qty</th>
                  <th class="text-right" style="width: 18%;">Unit Price (INR)</th>
                  <th class="text-right" style="width: 22%;">Total (INR)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td class="text-center">1</td>
                  <td>
                    <div style="font-weight: 800; font-size: 13px; color: #0f172a;">${req.bookTitle}</div>
                    <div style="color: #475569; font-size: 11px; margin-top: 2px;">Author(s): <strong>${req.authorName}</strong></div>
                    <div style="color: #64748b; font-size: 11px; margin-top: 1px;">
                      ${req.isbn ? `ISBN: ${req.isbn} • ` : ''}Publisher: ${req.publisherName || 'Academic Press'}
                    </div>
                    <div style="color: #6d28d9; font-size: 10px; font-weight: 700; margin-top: 3px;">
                      Department Allocation: ${req.assignedCategoryName || 'Computer Science & Engineering'}
                    </div>
                  </td>
                  <td class="text-center" style="font-weight: 800; font-size: 13px;">${qty}</td>
                  <td class="text-right" style="font-family: monospace; font-weight: 700;">₹${unitPrice.toFixed(2)}</td>
                  <td class="text-right" style="font-family: monospace; font-weight: 800; color: #0f172a;">₹${subtotal.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>

            <table class="totals-table">
              <tr>
                <td style="color: #64748b;">Subtotal (Excl. Tax):</td>
                <td class="text-right" style="font-family: monospace; font-weight: 700;">₹${subtotal.toFixed(2)}</td>
              </tr>
              <tr>
                <td style="color: #64748b;">GST / Tax (5% Books):</td>
                <td class="text-right" style="font-family: monospace;">₹${gstAmount.toFixed(2)}</td>
              </tr>
              <tr>
                <td style="color: #64748b;">Institutional Shipping:</td>
                <td class="text-right" style="color: #059669; font-weight: 700;">FREE (Included)</td>
              </tr>
              <tr class="grand-total">
                <td>Grand Total (INR):</td>
                <td class="text-right" style="font-family: monospace; color: #6d28d9;">₹${grandTotal.toFixed(2)}</td>
              </tr>
            </table>

            <div class="terms-box">
              <div style="font-weight: 800; color: #1e293b; margin-bottom: 4px; text-transform: uppercase; font-size: 10px; letter-spacing: 0.5px;">Terms & Conditions of Procurement</div>
              <ol>
                <li>Delivery must be completed within 14 working days of purchase order issuance.</li>
                <li>Books must be brand new, latest edition, undamaged, and supplied with valid publisher invoices.</li>
                <li>Invoice and Delivery Challan must clearly quote Purchase Order Number <strong>${poNum}</strong>.</li>
                <li>Payment will be processed via direct bank transfer within 30 days of physical receipt and quality clearance.</li>
              </ol>
            </div>

            <div class="signatures-grid">
              <div>
                <div style="height: 40px;"></div>
                <div class="sign-line">Procurement Officer</div>
                <div class="sign-role">Acquisition Section</div>
              </div>
              <div>
                <div style="height: 40px;"></div>
                <div class="sign-line">Finance & Accounts Officer</div>
                <div class="sign-role">Budget Clearance</div>
              </div>
              <div>
                <div style="height: 40px; display: flex; align-items: flex-end; justify-content: center;">
                  <span style="font-family: serif; font-style: italic; font-weight: bold; color: #6d28d9;">${user?.name || 'Chief University Librarian'}</span>
                </div>
                <div class="sign-line">Chief University Librarian</div>
                <div class="sign-role">Authorized Signatory & Seal</div>
              </div>
            </div>
          </div>

          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
              }, 400);
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-12">
      {/* ------------------------------------------------------------- */}
      {/* 1. TOP HEADER */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-200/90 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-purple-700 bg-purple-50 px-3.5 py-1 rounded-full border border-purple-200/80 shadow-2xs">
              <ShoppingBag className="h-3.5 w-3.5 text-purple-600" /> University Library Purchasing System
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold font-poppins text-slate-900 tracking-tight">
              Book Purchasing & Orders
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 max-w-2xl font-medium">
              Complete Requisition-to-Shelf Acquisition Pipeline: Faculty & Student Suggestions, Vendor Quotations, PO Generation, Quality Inspection, and Catalog Accession.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 shrink-0 flex-wrap sm:flex-nowrap">
            <button
              onClick={() => {
                setEditingVendor(null);
                setActionModalType('NEW_REQUEST');
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-xs hover:shadow transition-all cursor-pointer whitespace-nowrap"
            >
              <Plus className="h-4 w-4" /> New Book Request
            </button>
            <button
              onClick={() => {
                setEditingVendor(null);
                setNewVendorName('');
                setNewVendorContact('');
                setNewVendorEmail('');
                setNewVendorPhone('');
                setNewVendorAddress('');
                setActionModalType('NEW_VENDOR');
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-bold transition-all cursor-pointer whitespace-nowrap"
            >
              <Building2 className="h-4 w-4" /> Add Supplier
            </button>
            <button
              onClick={handleExportExcel}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-all cursor-pointer whitespace-nowrap"
            >
              <Download className="h-4 w-4 text-purple-600" /> Export Excel
            </button>
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-all cursor-pointer whitespace-nowrap"
            >
              <Printer className="h-4 w-4 text-slate-600" /> Print
            </button>
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      {toast && (
        <div
          className={`flex items-center justify-between gap-3 p-4 rounded-2xl text-sm font-semibold shadow-md animate-fadeIn ${
            toast.type === 'error'
              ? 'bg-rose-50 text-rose-900 border border-rose-200'
              : toast.type === 'info'
              ? 'bg-blue-50 text-blue-900 border border-blue-200'
              : 'bg-emerald-50 text-emerald-900 border border-emerald-200'
          }`}
        >
          <div className="flex items-center gap-3">
            {toast.type === 'error' ? (
              <XCircle className="h-5 w-5 text-rose-600 shrink-0" />
            ) : toast.type === 'info' ? (
              <Info className="h-5 w-5 text-blue-600 shrink-0" />
            ) : (
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            )}
            <span>{toast.message}</span>
          </div>
          <button onClick={() => setToast(null)} className="text-slate-400 hover:text-slate-600 font-bold">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 2. METRIC SUMMARY CARDS */}
      {/* ------------------------------------------------------------- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Card 1: Total Book Requests */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs hover:shadow-md transition-all space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">Total Requests</span>
            <div className="h-10 w-10 rounded-2xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-700 font-bold">
              <ShoppingBag className="h-5 w-5" />
            </div>
          </div>
          <div>
            <h3 className="text-3xl font-extrabold font-poppins text-slate-950">{totalRequestsCount}</h3>
            <p className="text-xs text-purple-700 font-bold mt-0.5">
              👨‍🏫 {facultyRequestsCount} Faculty • 🎓 {studentRequestsCount} Students
            </p>
          </div>
        </div>

        {/* Card 2: Active Orders */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs hover:shadow-md transition-all space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">Active Orders</span>
            <div className="h-10 w-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700 font-bold">
              <FileText className="h-5 w-5" />
            </div>
          </div>
          <div>
            <h3 className="text-3xl font-extrabold font-poppins text-slate-950">{activePOCount}</h3>
            <p className="text-xs text-indigo-700 font-bold mt-0.5">
              Budget: ₹{totalBudgetCommitted.toLocaleString('en-IN')}
            </p>
          </div>
        </div>

        {/* Card 3: Books Received */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs hover:shadow-md transition-all space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">Books Received</span>
            <div className="h-10 w-10 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-700 font-bold">
              <Package className="h-5 w-5" />
            </div>
          </div>
          <div>
            <h3 className="text-3xl font-extrabold font-poppins text-slate-950">{totalReceivedCount}</h3>
            <p className="text-xs text-teal-700 font-bold mt-0.5">Ready for Shelves</p>
          </div>
        </div>

        {/* Card 4: In Library */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs hover:shadow-md transition-all space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">In Library</span>
            <div className="h-10 w-10 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700 font-bold">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </div>
          <div>
            <h3 className="text-3xl font-extrabold font-poppins text-slate-950">{totalCatalogedCount}</h3>
            <p className="text-xs text-emerald-700 font-bold mt-0.5">Ready for Borrowing</p>
          </div>
        </div>

        {/* Card 5: Pending Approvals */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs hover:shadow-md transition-all space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">Pending Approvals</span>
            <div className="h-10 w-10 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-700 font-bold">
              <Clock className="h-5 w-5" />
            </div>
          </div>
          <div>
            <h3 className="text-3xl font-extrabold font-poppins text-slate-950">{pendingReviewCount}</h3>
            <p className="text-xs text-amber-700 font-bold mt-0.5">Needs Review</p>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 3. TABS NAVIGATION */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-white rounded-2xl border border-slate-200 p-1.5 shadow-xs">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-1">
          <button
            onClick={() => setActiveTab('LIFECYCLE')}
            className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'LIFECYCLE'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Layers className="h-4 w-4" /> All Requests ({requests.length})
          </button>
          <button
            onClick={() => setActiveTab('PIPELINE')}
            className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'PIPELINE'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Kanban className="h-4 w-4" /> Order Pipeline
          </button>
          <button
            onClick={() => setActiveTab('VENDORS')}
            className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'VENDORS'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Building2 className="h-4 w-4" /> Suppliers ({vendors.length})
          </button>
          <button
            onClick={() => setActiveTab('DUPLICATES')}
            className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'DUPLICATES'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <AlertTriangle className="h-4 w-4" /> Duplicates ({duplicatesList.length})
          </button>
          <button
            onClick={() => setActiveTab('PO_ARCHIVE')}
            className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'PO_ARCHIVE'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <FileText className="h-4 w-4" /> Purchase Orders ({poIssuedList.length})
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* TAB 1: ALL REQUISITIONS & ORDERS REGISTER */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'LIFECYCLE' && (
        <div className="space-y-4">
          {/* Filters & Search Toolbar */}
          <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-2.5">
              {/* Search Bar */}
              <div className="relative flex-1 min-w-[220px]">
                <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search Title, Author, ISBN, PO, Supplier, Requester..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Dropdown Filters */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Status Dropdown */}
                <div className="relative">
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="pl-3 pr-8 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 bg-slate-50/80 focus:bg-white appearance-none cursor-pointer"
                  >
                    <option value="ALL">All Statuses ({requests.length})</option>
                    <option value="PENDING">Pending Review ({requests.filter((r) => r.status === 'PENDING').length})</option>
                    <option value="APPROVED">Approved ({requests.filter((r) => r.status === 'APPROVED').length})</option>
                    <option value="PO_GENERATED">PO Issued ({requests.filter((r) => r.status === 'PO_GENERATED').length})</option>
                    <option value="ORDERED">Dispatched ({requests.filter((r) => r.status === 'ORDERED').length})</option>
                    <option value="RECEIVED">Received ({requests.filter((r) => r.status === 'RECEIVED').length})</option>
                    <option value="QUALITY_CHECKED">Quality Passed ({requests.filter((r) => r.status === 'QUALITY_CHECKED').length})</option>
                    <option value="CATALOGED">Cataloged & Ready ({requests.filter((r) => r.status === 'CATALOGED' || r.status === 'AVAILABLE').length})</option>
                    <option value="REJECTED">Rejected ({requests.filter((r) => r.status === 'REJECTED').length})</option>
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                </div>

                {/* Role Filter */}
                <div className="relative">
                  <select
                    value={filterRole}
                    onChange={(e) => setFilterRole(e.target.value)}
                    className="pl-3 pr-8 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 bg-slate-50/80 focus:bg-white appearance-none cursor-pointer"
                  >
                    <option value="ALL">All Roles</option>
                    <option value="FACULTY">Faculty</option>
                    <option value="STUDENT">Student</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                </div>

                {/* Category Filter */}
                <div className="relative">
                  <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className="pl-3 pr-8 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 bg-slate-50/80 focus:bg-white appearance-none cursor-pointer max-w-[160px] truncate"
                  >
                    <option value="ALL">All Subjects</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                </div>

                {/* Sort Option */}
                <div className="relative">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="pl-3 pr-8 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 bg-slate-50/80 focus:bg-white appearance-none cursor-pointer"
                  >
                    <option value="NEWEST">Newest First</option>
                    <option value="OLDEST">Oldest First</option>
                    <option value="PRICE_HIGH">Price: High to Low</option>
                    <option value="PRICE_LOW">Price: Low to High</option>
                    <option value="TITLE">Title (A-Z)</option>
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                </div>
              </div>
            </div>
          </div>

          {/* Master Table Register */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
            <table className="w-full text-left text-xs text-slate-600 border-collapse">
              <thead className="bg-slate-50/90 border-b border-slate-200 font-extrabold uppercase tracking-wider text-slate-600 text-[11px]">
                <tr>
                  <th className="py-3.5 px-4 w-[26%]">Book Details & Subject</th>
                  <th className="py-3.5 px-4 w-[18%]">Requester</th>
                  <th className="py-3.5 px-4 w-[18%]">Supplier, PO & Cost</th>
                  <th className="py-3.5 px-4 w-[14%]">Lifecycle Stage</th>
                  <th className="py-3.5 px-4 w-[10%]">Status</th>
                  <th className="py-3.5 px-4 w-[14%] text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredRequests.map((req) => {
                  const currentStageObj =
                    LIFECYCLE_STAGES.find((s) => s.status === req.status) || LIFECYCLE_STAGES[0];
                  const unitPrice = req.approvedPrice || req.estimatedPrice || 0;
                  const totalCost = unitPrice * (req.quantityRequested || 1);

                  return (
                    <tr key={req.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* 1. Book Details */}
                      <td className="py-3.5 px-4 align-top">
                        <div className="space-y-1">
                          <p className="text-slate-900 font-bold text-sm leading-snug" title={req.bookTitle}>
                            {req.bookTitle}
                          </p>
                          <p className="text-slate-500 text-xs">
                            By <strong className="text-slate-700">{req.authorName}</strong>
                          </p>
                          <div className="flex flex-wrap items-center gap-1 pt-0.5">
                            {req.isbn && (
                              <span className="font-mono text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded border border-slate-200">
                                ISBN: {req.isbn}
                              </span>
                            )}
                            {req.publisherName && (
                              <span className="text-[10px] text-slate-500">
                                {req.publisherName}
                              </span>
                            )}
                          </div>
                          {req.assignedCategoryName && (
                            <span className="inline-block text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
                              📚 {req.assignedCategoryName}
                            </span>
                          )}
                          {req.isDuplicate && (
                            <div>
                              <span className="inline-flex items-center gap-1 text-[10px] font-extrabold bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full">
                                <AlertTriangle className="h-3 w-3 text-amber-700" /> Multi-Student Request
                              </span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* 2. Requester Details */}
                      <td className="py-3.5 px-4 align-top">
                        <div className="space-y-1">
                          <p className="font-bold text-slate-900 text-xs">{req.requestedByName}</p>
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                              req.requestedByRole === 'FACULTY'
                                ? 'bg-purple-100 text-purple-800 border border-purple-200'
                                : req.requestedByRole === 'STUDENT'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : 'bg-slate-100 text-slate-800 border border-slate-200'
                            }`}
                          >
                            {req.requestedByRole}
                          </span>
                          <p className="text-[11px] text-slate-500 italic line-clamp-2" title={req.reason}>
                            "{req.reason}"
                          </p>
                          <p className="text-[10px] text-slate-400 font-mono">
                            {req.requestedDate}
                          </p>
                        </div>
                      </td>

                      {/* 3. PO & Vendor Details */}
                      <td className="py-3.5 px-4 align-top">
                        <div className="space-y-1">
                          {req.poNumber ? (
                            <div className="space-y-0.5">
                              <span className="font-mono font-extrabold text-xs text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-200 block w-max">
                                {req.poNumber}
                              </span>
                              <p className="text-xs text-slate-700 font-bold truncate">
                                🏢 {req.vendorName || 'Assigned Supplier'}
                              </p>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic text-xs block">No PO Issued Yet</span>
                          )}
                          <div className="pt-0.5">
                            <span className="text-xs font-bold text-slate-900 block">
                              ₹{totalCost.toLocaleString('en-IN')}
                            </span>
                            <span className="text-[10px] text-slate-400 font-normal font-mono">
                              ({req.quantityRequested || 1} × ₹{unitPrice.toLocaleString('en-IN')})
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* 4. Lifecycle Stage */}
                      <td className="py-3.5 px-4 align-top">
                        <div className="space-y-1">
                          <span className="font-mono text-[10px] font-extrabold bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full inline-block">
                            Step {currentStageObj.step}/10
                          </span>
                          <p className="text-slate-800 font-bold text-xs leading-tight">{currentStageObj.label}</p>
                          {req.generatedAccessionNos && req.generatedAccessionNos.length > 0 && (
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 block w-max mt-1">
                              ACC: {req.generatedAccessionNos.join(', ')}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 5. Status Badge */}
                      <td className="py-3.5 px-4 align-top">
                        <div className="space-y-1">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${currentStageObj.badgeColor}`}
                          >
                            {req.status}
                          </span>
                          {req.qualityStatus && (
                            <p className="text-[10px] font-bold text-cyan-800">
                              Quality: {req.qualityStatus}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* 6. Contextual Action Buttons */}
                      <td className="py-3.5 px-4 align-top text-right">
                        <div className="flex flex-col items-end gap-1">
                          {/* Primary Workflow Advancement Button */}
                          {req.status === 'PENDING' && (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleOpenAction(req, 'UNDER_REVIEW')}
                                className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold transition-all cursor-pointer"
                              >
                                Review
                              </button>
                              <button
                                onClick={() => handleOpenAction(req, 'APPROVED')}
                                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold transition-all cursor-pointer"
                              >
                                Approve
                              </button>
                            </div>
                          )}

                          {(req.status === 'APPROVED' || req.status === 'UNDER_REVIEW') && (
                            <button
                              onClick={() => handleOpenAction(req, 'PO_GENERATED')}
                              className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer"
                            >
                              <FileText className="h-3 w-3" /> Issue PO
                            </button>
                          )}

                          {req.status === 'PO_GENERATED' && (
                            <button
                              onClick={() => handleOpenAction(req, 'ORDERED')}
                              className="px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer"
                            >
                              <Truck className="h-3 w-3" /> Dispatch
                            </button>
                          )}

                          {req.status === 'ORDERED' && (
                            <button
                              onClick={() => handleOpenAction(req, 'RECEIVED')}
                              className="px-2.5 py-1 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer"
                            >
                              <Package className="h-3 w-3" /> Receive Goods
                            </button>
                          )}

                          {req.status === 'RECEIVED' && (
                            <button
                              onClick={() => handleOpenAction(req, 'QUALITY_CHECKED')}
                              className="px-2.5 py-1 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer"
                            >
                              <ShieldCheck className="h-3 w-3" /> Quality Check
                            </button>
                          )}

                          {req.status === 'QUALITY_CHECKED' && (
                            <button
                              onClick={() => handleOpenAction(req, 'CATALOGED')}
                              className="px-2.5 py-1 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer"
                            >
                              <Barcode className="h-3 w-3" /> Catalog Book
                            </button>
                          )}

                          {/* Secondary Actions */}
                          <div className="flex items-center gap-1 pt-0.5">
                            <button
                              onClick={() => handleOpenAction(req, 'TIMELINE')}
                              className="px-1.5 py-0.5 rounded border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                              title="View History Audit"
                            >
                              <History className="h-3 w-3 text-slate-500" /> Timeline
                            </button>

                            {req.poNumber && (
                              <button
                                onClick={() => handleOpenAction(req, 'PRINT_PO')}
                                className="px-1.5 py-0.5 rounded border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                                title="Print PO"
                              >
                                <Printer className="h-3 w-3 text-indigo-600" /> View PO
                              </button>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                  {filteredRequests.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-16 text-center text-slate-400 space-y-3">
                        <ShoppingBag className="h-10 w-10 mx-auto text-slate-300" />
                        <div className="space-y-1">
                          <p className="font-bold text-slate-700 text-base">No procurement records found</p>
                          <p className="text-xs text-slate-400">
                            Try adjusting your search query, status filters, or academic department selectors.
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 2: VISUAL KANBAN PIPELINE BOARD */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'PIPELINE' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Column 1: Requisition & Review */}
          <div className="bg-slate-50/80 p-4 rounded-3xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-blue-500"></span>
                <h3 className="font-extrabold text-slate-900 text-sm">1. Requisition & Review</h3>
              </div>
              <span className="text-xs font-bold bg-white text-slate-700 px-2 py-0.5 rounded-full border border-slate-200">
                {requests.filter((r) => r.status === 'PENDING' || r.status === 'UNDER_REVIEW' || r.status === 'ON_HOLD').length}
              </span>
            </div>

            <div className="space-y-2.5">
              {requests
                .filter((r) => r.status === 'PENDING' || r.status === 'UNDER_REVIEW' || r.status === 'ON_HOLD')
                .map((req) => (
                  <div
                    key={req.id}
                    className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-2 hover:shadow-md transition-all"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-bold text-slate-900 text-xs leading-snug">{req.bookTitle}</h4>
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200">
                        {req.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500">By {req.authorName}</p>
                    <p className="text-[10px] text-purple-700 font-semibold">
                      👤 {req.requestedByName} ({req.requestedByRole})
                    </p>
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-900">
                        ₹{((req.approvedPrice || req.estimatedPrice || 0) * (req.quantityRequested || 1)).toLocaleString('en-IN')}
                      </span>
                      <button
                        onClick={() => handleOpenAction(req, 'APPROVED')}
                        className="px-2.5 py-1 rounded-xl bg-emerald-600 text-white text-[10px] font-bold hover:bg-emerald-700"
                      >
                        Approve →
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Column 2: PO & Vendor Dispatch */}
          <div className="bg-slate-50/80 p-4 rounded-3xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-indigo-500"></span>
                <h3 className="font-extrabold text-slate-900 text-sm">2. PO & Supplier Dispatch</h3>
              </div>
              <span className="text-xs font-bold bg-white text-slate-700 px-2 py-0.5 rounded-full border border-slate-200">
                {requests.filter((r) => r.status === 'APPROVED' || r.status === 'PO_GENERATED' || r.status === 'ORDERED').length}
              </span>
            </div>

            <div className="space-y-2.5">
              {requests
                .filter((r) => r.status === 'APPROVED' || r.status === 'PO_GENERATED' || r.status === 'ORDERED')
                .map((req) => (
                  <div
                    key={req.id}
                    className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-2 hover:shadow-md transition-all"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-bold text-slate-900 text-xs leading-snug">{req.bookTitle}</h4>
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-indigo-50 text-indigo-800 border border-indigo-200">
                        {req.status}
                      </span>
                    </div>
                    {req.poNumber && (
                      <span className="font-mono text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200 block w-max">
                        {req.poNumber}
                      </span>
                    )}
                    <p className="text-[11px] text-slate-600 font-medium">🏢 {req.vendorName || 'Vendor Pending'}</p>
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-900">
                        ₹{((req.approvedPrice || req.estimatedPrice || 0) * (req.quantityRequested || 1)).toLocaleString('en-IN')}
                      </span>
                      {req.status === 'APPROVED' ? (
                        <button
                          onClick={() => handleOpenAction(req, 'PO_GENERATED')}
                          className="px-2.5 py-1 rounded-xl bg-indigo-600 text-white text-[10px] font-bold hover:bg-indigo-700"
                        >
                          Issue PO →
                        </button>
                      ) : req.status === 'PO_GENERATED' ? (
                        <button
                          onClick={() => handleOpenAction(req, 'ORDERED')}
                          className="px-2.5 py-1 rounded-xl bg-purple-600 text-white text-[10px] font-bold hover:bg-purple-700"
                        >
                          Dispatch →
                        </button>
                      ) : (
                        <button
                          onClick={() => handleOpenAction(req, 'RECEIVED')}
                          className="px-2.5 py-1 rounded-xl bg-teal-600 text-white text-[10px] font-bold hover:bg-teal-700"
                        >
                          Receive →
                        </button>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Column 3: Goods Receipt & Quality Check */}
          <div className="bg-slate-50/80 p-4 rounded-3xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-teal-500"></span>
                <h3 className="font-extrabold text-slate-900 text-sm">3. Receipt & Quality Inspection</h3>
              </div>
              <span className="text-xs font-bold bg-white text-slate-700 px-2 py-0.5 rounded-full border border-slate-200">
                {requests.filter((r) => r.status === 'RECEIVED' || r.status === 'QUALITY_CHECKED').length}
              </span>
            </div>

            <div className="space-y-2.5">
              {requests
                .filter((r) => r.status === 'RECEIVED' || r.status === 'QUALITY_CHECKED')
                .map((req) => (
                  <div
                    key={req.id}
                    className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-2 hover:shadow-md transition-all"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-bold text-slate-900 text-xs leading-snug">{req.bookTitle}</h4>
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-teal-50 text-teal-800 border border-teal-200">
                        {req.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600">
                      📦 Delivery Qty: <strong>{req.receivedQuantity || req.quantityRequested || 1} Copies</strong>
                    </p>
                    {req.invoiceNo && (
                      <p className="text-[10px] text-slate-500 font-mono">Invoice: {req.invoiceNo}</p>
                    )}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                      {req.status === 'RECEIVED' ? (
                        <button
                          onClick={() => handleOpenAction(req, 'QUALITY_CHECKED')}
                          className="w-full py-1.5 rounded-xl bg-cyan-600 text-white text-[10px] font-bold hover:bg-cyan-700"
                        >
                          Conduct Quality Check →
                        </button>
                      ) : (
                        <button
                          onClick={() => handleOpenAction(req, 'CATALOGED')}
                          className="w-full py-1.5 rounded-xl bg-violet-600 text-white text-[10px] font-bold hover:bg-violet-700 flex items-center justify-center gap-1"
                        >
                          <Barcode className="h-3 w-3" /> Catalog & Activate Shelf →
                        </button>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Column 4: Cataloged & Live on Shelves */}
          <div className="bg-slate-50/80 p-4 rounded-3xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-emerald-500"></span>
                <h3 className="font-extrabold text-slate-900 text-sm">4. Active on Library Shelf</h3>
              </div>
              <span className="text-xs font-bold bg-white text-slate-700 px-2 py-0.5 rounded-full border border-slate-200">
                {requests.filter((r) => r.status === 'CATALOGED' || r.status === 'AVAILABLE').length}
              </span>
            </div>

            <div className="space-y-2.5">
              {requests
                .filter((r) => r.status === 'CATALOGED' || r.status === 'AVAILABLE')
                .map((req) => (
                  <div
                    key={req.id}
                    className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-2 hover:shadow-md transition-all"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-bold text-slate-900 text-xs leading-snug">{req.bookTitle}</h4>
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                        ACTIVE
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600">
                      📍 Rack: <strong>{req.assignedRackNumber || 'RACK-CS-01'}</strong> • Shelf:{' '}
                      <strong>{req.assignedShelfNumber || 'SHELF-A1'}</strong>
                    </p>
                    {req.generatedAccessionNos && (
                      <span className="text-[10px] font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 block truncate">
                        ACC: {req.generatedAccessionNos.join(', ')}
                      </span>
                    )}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                      <button
                        onClick={() => handleOpenAction(req, 'PRINT_BARCODES')}
                        className="px-2.5 py-1 rounded-xl bg-violet-50 hover:bg-violet-100 text-violet-700 border border-violet-200 text-[10px] font-bold flex items-center gap-1"
                      >
                        <Barcode className="h-3 w-3" /> Labels
                      </button>
                      <button
                        onClick={() => handleOpenAction(req, 'TIMELINE')}
                        className="px-2.5 py-1 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 text-[10px] font-bold"
                      >
                        Audit Trail
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 3: REGISTERED SUPPLIERS & VENDORS DIRECTORY */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'VENDORS' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white p-4 rounded-3xl border border-slate-200 shadow-xs">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Empaneled Library Book Distributors & Publishers</h3>
              <p className="text-xs text-slate-500">
                Authorized suppliers for direct purchase orders, volume discounts, and physical shelf fulfillment.
              </p>
            </div>
            <button
              onClick={() => {
                setEditingVendor(null);
                setNewVendorName('');
                setNewVendorContact('');
                setNewVendorEmail('');
                setNewVendorPhone('');
                setNewVendorAddress('');
                setActionModalType('NEW_VENDOR');
              }}
              className="px-4 py-2 rounded-2xl bg-purple-600 text-white text-xs font-bold hover:bg-purple-700 flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Plus className="h-4 w-4" /> Add New Supplier
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {vendors.map((vendor) => {
              const vendorPOs = requests.filter((r) => r.vendorId === vendor.id || r.vendorName === vendor.name);
              const vendorSpend = vendorPOs.reduce(
                (sum, r) => sum + (r.approvedPrice || r.estimatedPrice || 0) * (r.quantityRequested || 1),
                0
              );

              return (
                <div
                  key={vendor.id}
                  className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-3.5 hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-2xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-700 font-bold shrink-0 shadow-2xs">
                          <Building2 className="h-6 w-6" />
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-900 text-sm leading-tight">{vendor.name}</h3>
                          <p className="text-xs text-slate-500 font-medium">Rep: {vendor.contactPerson}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 bg-amber-50 text-amber-800 border border-amber-200 px-2.5 py-0.5 rounded-full text-xs font-bold shrink-0">
                        <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-500" /> {vendor.rating || 4.9}
                      </div>
                    </div>

                    <div className="text-xs space-y-1.5 text-slate-600 bg-slate-50/70 p-3 rounded-2xl border border-slate-100">
                      <p className="flex items-center gap-2">
                        <span>📧</span>
                        <a href={`mailto:${vendor.email}`} className="text-purple-700 font-semibold hover:underline">
                          {vendor.email}
                        </a>
                      </p>
                      <p className="flex items-center gap-2">
                        <span>📞</span>
                        <span>{vendor.phone}</span>
                      </p>
                      <p className="flex items-start gap-2">
                        <span className="shrink-0">📍</span>
                        <span className="truncate">{vendor.address}</span>
                      </p>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
                        Specializations:
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {(vendor.specializationCategories || ['Computer Science', 'General Sciences']).map((cat) => (
                          <span
                            key={cat}
                            className="text-[10px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md"
                          >
                            {cat}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-extrabold block">Spend / Orders</span>
                      <span className="text-xs font-bold text-slate-900">
                        ₹{vendorSpend.toLocaleString('en-IN')} ({vendorPOs.length} POs)
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleOpenEditVendor(vendor)}
                        className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 cursor-pointer"
                        title="Edit Supplier Profile"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteVendor(vendor.id, vendor.name)}
                        className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 cursor-pointer"
                        title="Remove Supplier"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 4: DUPLICATE & DEMAND CLUSTERING ENGINE */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'DUPLICATES' && (
        <div className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-200 shadow-xs space-y-5">
          <div className="flex items-start gap-4 bg-amber-50 text-amber-900 border border-amber-200 p-4 sm:p-5 rounded-3xl">
            <AlertTriangle className="h-6 w-6 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="font-extrabold text-sm sm:text-base">Intelligent Demand & Duplicate Clustering</h4>
              <p className="text-xs text-amber-800 leading-relaxed">
                When multiple students or professors suggest the same textbook title or ISBN, our acquisition engine flags them for bulk supplier discounts and consolidated PO processing.
              </p>
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            {duplicatesList.map((req) => (
              <div key={req.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-slate-900 text-sm">{req.bookTitle}</h4>
                    <span className="px-2.5 py-0.5 bg-amber-100 text-amber-900 text-[10px] font-extrabold rounded-full border border-amber-300">
                      Demand: {req.duplicateCount || 2}+ Requests
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Author: <strong className="text-slate-700">{req.authorName}</strong>{' '}
                    {req.isbn ? `| ISBN: ${req.isbn}` : ''}
                  </p>
                  <p className="text-xs text-purple-700 font-semibold">
                    Requesters: {req.requestedByName} ({req.requestedByRole})
                  </p>
                  <p className="text-xs text-slate-400 italic">"{req.reason}"</p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => {
                      const primary = requests[0];
                      if (primary) {
                        libraryStore.mergeDuplicateRequests(primary.id, [req.id]);
                        triggerToast(`Merged duplicate demand into primary requisition #${primary.id}.`, 'success');
                      }
                    }}
                    className="px-4 py-2 rounded-2xl bg-purple-600 text-white font-bold text-xs hover:bg-purple-700 cursor-pointer shadow-xs"
                  >
                    Merge into Bulk Order
                  </button>
                  <button
                    onClick={() => handleOpenAction(req, 'APPROVED')}
                    className="px-3.5 py-2 rounded-2xl border border-emerald-300 bg-emerald-50 text-emerald-800 font-bold text-xs hover:bg-emerald-100 cursor-pointer"
                  >
                    Approve Order
                  </button>
                </div>
              </div>
            ))}

            {duplicatesList.length === 0 && (
              <div className="py-12 text-center text-slate-400 space-y-2">
                <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto opacity-70" />
                <p className="text-sm font-bold text-slate-700">No Pending Duplicate Flags</p>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  All current faculty and student procurement requisitions are unique with no conflicting multi-requisitions.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 5: PURCHASE ORDERS ARCHIVE & PRINT DESK */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'PO_ARCHIVE' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Purchase Order (PO) Official Registry</h3>
              <p className="text-xs text-slate-500">
                Formal legal purchase agreements issued to publishers and academic distributors.
              </p>
            </div>
            <button
              onClick={handleExportExcel}
              className="px-4 py-2 rounded-2xl border border-slate-200 bg-slate-50 text-slate-700 text-xs font-bold hover:bg-slate-100 flex items-center gap-1.5"
            >
              <Download className="h-4 w-4 text-purple-600" /> Export PO Ledger
            </button>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 border-b border-slate-200 font-extrabold uppercase tracking-wider text-slate-600 text-xs">
                  <tr>
                    <th className="py-3.5 px-4">PO Number & Date</th>
                    <th className="py-3.5 px-4">Supplier / Vendor</th>
                    <th className="py-3.5 px-4">Book Title & Author</th>
                    <th className="py-3.5 px-4">Quantity & Amount</th>
                    <th className="py-3.5 px-4">Lifecycle Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {poIssuedList.map((req) => (
                    <tr key={req.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-4 px-4 font-mono font-bold text-indigo-700">
                        <span>{req.poNumber}</span>
                        <p className="text-[10px] text-slate-400 font-normal">{req.poDate || req.requestedDate}</p>
                      </td>
                      <td className="py-4 px-4">
                        <p className="font-bold text-slate-900">{req.vendorName || 'Oxford Book Distributors'}</p>
                        <p className="text-[11px] text-slate-500">{req.vendorContact || 'Academic Sales Division'}</p>
                      </td>
                      <td className="py-4 px-4">
                        <p className="font-bold text-slate-900">{req.bookTitle}</p>
                        <p className="text-slate-500">By {req.authorName}</p>
                      </td>
                      <td className="py-4 px-4 font-bold text-slate-900">
                        ₹{((req.approvedPrice || req.estimatedPrice || 0) * (req.quantityRequested || 1)).toLocaleString('en-IN')}
                        <p className="text-[10px] text-slate-400 font-normal font-mono">
                          {req.quantityRequested || 1} Copies @ ₹{(req.approvedPrice || req.estimatedPrice || 0).toLocaleString('en-IN')}
                        </p>
                      </td>
                      <td className="py-4 px-4">
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase bg-indigo-50 text-indigo-700 border border-indigo-200">
                          {req.status}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <button
                          onClick={() => handleOpenAction(req, 'PRINT_PO')}
                          className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-xs cursor-pointer"
                        >
                          <Printer className="h-3.5 w-3.5" /> View / Print PO
                        </button>
                      </td>
                    </tr>
                  ))}

                  {poIssuedList.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        No purchase orders issued yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 4. DIALOG MODAL: ADVANCE PROCUREMENT STAGE */}
      {/* ------------------------------------------------------------- */}
      {actionModalType &&
        selectedRequest &&
        actionModalType !== 'TIMELINE' &&
        actionModalType !== 'PRINT_PO' &&
        actionModalType !== 'PRINT_BARCODES' &&
        actionModalType !== 'NEW_REQUEST' &&
        actionModalType !== 'NEW_VENDOR' && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
            <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-4 my-auto">
              <div className="flex items-center justify-between pb-1">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                    <Layers className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold font-poppins text-slate-900">
                      Advance Lifecycle Stage: <span className="text-purple-700">{actionModalType}</span>
                    </h3>
                    <p className="text-xs text-slate-500">Record verification and trigger downstream automated actions.</p>
                  </div>
                </div>
                <button
                  onClick={() => setActionModalType(null)}
                  className="text-slate-400 hover:text-slate-600 font-bold p-1"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Book Summary Banner */}
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-0.5">
                <p className="font-bold text-slate-900">{selectedRequest.bookTitle}</p>
                <p className="text-slate-500">
                  By {selectedRequest.authorName} • Requested by {selectedRequest.requestedByName} ({selectedRequest.requestedByRole})
                </p>
              </div>

              {/* 1. PO Issuance Controls */}
              {(actionModalType === 'PO_GENERATED' || actionModalType === 'ORDERED') && (
                <div className="space-y-3 pt-1">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Select Registered Book Supplier / Publisher *
                    </label>
                    <select
                      value={selectedVendorId}
                      onChange={(e) => setSelectedVendorId(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 bg-slate-50"
                    >
                      {vendors.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.name} ({v.contactPerson}) - ★{v.rating || 4.9}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Purchase Order (PO) #</label>
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
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Requisition Copies</label>
                      <input
                        type="number"
                        min={1}
                        value={quantityInput}
                        onChange={(e) => setQuantityInput(Number(e.target.value))}
                        className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Total Committed Budget</label>
                      <div className="p-2.5 rounded-xl bg-purple-50 border border-purple-200 font-bold text-xs text-purple-900">
                        ₹{(approvedPriceInput * quantityInput).toLocaleString('en-IN')}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 2. Physical Goods Receipt Controls */}
              {actionModalType === 'RECEIVED' && (
                <div className="space-y-3 pt-1">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Received Copies Quantity</label>
                      <input
                        type="number"
                        min={1}
                        value={receivedQtyInput}
                        onChange={(e) => setReceivedQtyInput(Number(e.target.value))}
                        className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Delivery Challan / Invoice #</label>
                      <input
                        type="text"
                        value={invoiceNoInput}
                        onChange={(e) => setInvoiceNoInput(e.target.value)}
                        className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-mono font-bold"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* 3. Physical Quality Check Controls */}
              {actionModalType === 'QUALITY_CHECKED' && (
                <div className="space-y-3 pt-1">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Physical Condition Inspection</label>
                    <select
                      value={qualityStatusInput}
                      onChange={(e) => setQualityStatusInput(e.target.value as any)}
                      className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 bg-slate-50"
                    >
                      <option value="PASSED">PASSED - Brand New Condition & Complete Pages</option>
                      <option value="FAILED">FAILED - Missing Pages / Binding Defects</option>
                      <option value="REJECTED_DAMAGED">REJECTED - Damaged in Shipping</option>
                    </select>
                  </div>
                </div>
              )}

              {/* 4. Auto-Cataloging & Live Inventory Activation */}
              {(actionModalType === 'CATALOGED' || actionModalType === 'AVAILABLE') && (
                <div className="space-y-3 pt-1">
                  <div className="p-3 bg-purple-50 rounded-2xl border border-purple-200 text-xs text-purple-950 font-medium leading-relaxed">
                    ✨ <strong>Autonomous Cataloging Pipeline:</strong> Confirming will generate accession numbers, barcodes, QR codes, assign physical shelf location, add to library OPAC, and notify the requester!
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Assigned Academic Department</label>
                    <select
                      value={assignedCategoryId}
                      onChange={(e) => setAssignedCategoryId(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 bg-slate-50"
                    >
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
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

              {/* Audit Comment */}
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                  Administrative Audit & Action Note
                </label>
                <textarea
                  rows={2}
                  placeholder="Record justification, budget clearance notes, or inspection comments..."
                  value={adminNotesInput}
                  onChange={(e) => setAdminNotesInput(e.target.value)}
                  className="w-full p-3 rounded-2xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-purple-500/20"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  onClick={() => setActionModalType(null)}
                  className="px-4 py-2.5 rounded-2xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmLifecycleAction}
                  className="px-5 py-2.5 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-md cursor-pointer transition-all"
                >
                  Confirm Advancement →
                </button>
              </div>
            </div>
          </div>
        )}

      {/* ------------------------------------------------------------- */}
      {/* 5. DIALOG MODAL: PRINT FORMAL PURCHASE ORDER (PO) */}
      {/* ------------------------------------------------------------- */}
      {actionModalType === 'PRINT_PO' && selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4 overflow-y-auto print:p-0 print:static print:bg-transparent">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-3xl w-full p-8 space-y-6 my-auto print:shadow-none print:border-none print:w-full print:p-0">
            {/* PO Document Header */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-5">
              <div className="flex items-center gap-3.5">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-600 text-white font-bold shadow-sm">
                  <BookOpen className="h-6 w-6" />
                </span>
                <div>
                  <h2 className="text-xl font-black font-poppins text-slate-900 tracking-tight">
                    UNIVERSITY CENTRAL LIBRARY
                  </h2>
                  <p className="text-xs text-purple-700 font-extrabold uppercase tracking-widest">
                    Official Acquisition & Purchase Order Document
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-base font-black text-purple-700 font-mono block">
                  {selectedRequest.poNumber || 'PO-2026-0891'}
                </span>
                <p className="text-xs text-slate-400 font-mono">Date: {selectedRequest.poDate || getLocalDateStr(new Date())}</p>
              </div>
            </div>

            {/* Vendor & Shipping Address Grid */}
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                <span className="font-extrabold text-slate-400 uppercase text-[10px] tracking-wider block">
                  Vendor / Supplier Order Recipient:
                </span>
                <p className="font-bold text-slate-900 text-sm">{selectedRequest.vendorName || 'Oxford University Press & Book Distributors'}</p>
                <p className="text-slate-600">{selectedRequest.vendorContact || 'Academic Sales & Institutional Desk'}</p>
                <p className="text-slate-500 font-mono">Status: Authorized Institutional Supplier</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                <span className="font-extrabold text-slate-400 uppercase text-[10px] tracking-wider block">
                  Shipping & Physical Delivery Address:
                </span>
                <p className="font-bold text-slate-900 text-sm">University Central Library Acquisition Desk</p>
                <p className="text-slate-600">Main Administrative Campus, Institutional Area, Sector 5</p>
                <p className="text-slate-500">Contact: Chief Admin Librarian (+91 11 2659 0000)</p>
              </div>
            </div>

            {/* Itemized PO Table */}
            <table className="w-full text-left text-xs border border-slate-200 rounded-2xl overflow-hidden">
              <thead className="bg-slate-100 font-extrabold text-slate-700 border-b border-slate-200 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="p-3.5">Item Description & ISBN</th>
                  <th className="p-3.5 text-center">Qty</th>
                  <th className="p-3.5 text-right">Unit Price (₹)</th>
                  <th className="p-3.5 text-right">Tax (GST 5%)</th>
                  <th className="p-3.5 text-right">Total Net (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                <tr>
                  <td className="p-3.5 font-semibold">
                    <p className="font-bold text-slate-900 text-sm">{selectedRequest.bookTitle}</p>
                    <p className="text-slate-500 text-xs">
                      Author: {selectedRequest.authorName} {selectedRequest.isbn ? `| ISBN: ${selectedRequest.isbn}` : ''}
                    </p>
                    <p className="text-[10px] text-purple-700 font-bold mt-0.5">
                      Requisitioned for: {selectedRequest.assignedCategoryName || 'Computer Science Department'}
                    </p>
                  </td>
                  <td className="p-3.5 text-center font-extrabold text-sm">{selectedRequest.quantityRequested || 1}</td>
                  <td className="p-3.5 text-right font-mono font-bold">
                    ₹{(selectedRequest.approvedPrice || selectedRequest.estimatedPrice || 0).toFixed(2)}
                  </td>
                  <td className="p-3.5 text-right font-mono text-slate-500">
                    ₹{(((selectedRequest.approvedPrice || selectedRequest.estimatedPrice || 0) * (selectedRequest.quantityRequested || 1)) * 0.05).toFixed(2)}
                  </td>
                  <td className="p-3.5 text-right font-mono font-extrabold text-slate-900 text-sm">
                    ₹{(
                      ((selectedRequest.approvedPrice || selectedRequest.estimatedPrice || 0) * (selectedRequest.quantityRequested || 1)) * 1.05
                    ).toFixed(2)}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Terms & Authorized Stamp */}
            <div className="flex flex-col sm:flex-row justify-between items-end gap-4 pt-4 border-t border-slate-200">
              <div className="text-[11px] text-slate-500 space-y-1 max-w-sm">
                <p className="font-bold text-slate-700">Commercial Terms & Warranty:</p>
                <p>1. Delivery within 14 working days of purchase order dispatch.</p>
                <p>2. Payment released within 30 days of physical quality verification.</p>
                <p>3. Defective / damaged copies must be replaced within 7 days.</p>
              </div>

              <div className="text-right space-y-2">
                <div className="h-12 flex items-end justify-end">
                  <span className="font-serif italic font-bold text-purple-900 border-b border-slate-400 pb-1">
                    {user?.name || 'Chief University Librarian'}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 uppercase font-extrabold">Authorized University Signatory</p>
              </div>
            </div>

            {/* Print & Close Buttons */}
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 print:hidden">
              <button
                onClick={() => setActionModalType(null)}
                className="px-4 py-2.5 rounded-2xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Close Preview
              </button>
              <button
                onClick={() => handlePrintFormalPO(selectedRequest)}
                className="px-5 py-2.5 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-md cursor-pointer flex items-center gap-1.5"
              >
                <Printer className="h-4 w-4" /> Print Formal Purchase Order
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 6. DIALOG DRAWER: COMPLETE AUDIT TIMELINE */}
      {/* ------------------------------------------------------------- */}
      {actionModalType === 'TIMELINE' && selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-xl w-full p-6 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-1">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                  <History className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold font-poppins text-slate-900">Procurement Audit Trail</h3>
                  <p className="text-xs text-slate-500">Immutable ledger of stage advancements and authorizations.</p>
                </div>
              </div>
              <button onClick={() => setActionModalType(null)} className="text-slate-400 hover:text-slate-600 font-bold p-1">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-0.5">
              <h4 className="font-bold text-slate-900 text-sm">{selectedRequest.bookTitle}</h4>
              <p className="text-slate-500">
                Author: {selectedRequest.authorName} • ID: <span className="font-mono">{selectedRequest.id}</span>
              </p>
            </div>

            <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-purple-200">
              {(selectedRequest.timeline || []).map((step, idx) => (
                <div key={idx} className="relative flex items-start gap-3">
                  <div className="absolute -left-6 top-1 h-5 w-5 rounded-full bg-purple-600 border-2 border-white flex items-center justify-center text-white text-[10px] shadow-2xs font-bold">
                    ✓
                  </div>
                  <div className="bg-slate-50/90 p-3.5 rounded-2xl border border-slate-200 w-full space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-purple-900">{step.label}</span>
                      <span className="font-mono text-[10px] text-slate-400">{step.timestamp}</span>
                    </div>
                    <p className="text-slate-600">
                      Authorized by: <strong className="text-slate-800">{step.actorName}</strong>{' '}
                      <span className="text-[10px] px-1.5 py-0.2 bg-purple-100 text-purple-800 rounded font-bold uppercase">
                        {step.actorRole}
                      </span>
                    </p>
                    {step.notes && (
                      <p className="text-slate-500 italic bg-white p-2 rounded-xl border border-slate-100 mt-1">
                        "{step.notes}"
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                onClick={() => setActionModalType(null)}
                className="px-5 py-2 rounded-2xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 cursor-pointer"
              >
                Close Timeline
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 7. DIALOG MODAL: PRINT BARCODE & QR CODE STICKERS */}
      {/* ------------------------------------------------------------- */}
      {actionModalType === 'PRINT_BARCODES' && selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-xl w-full p-6 space-y-4 my-auto">
            <div className="flex items-center justify-between pb-1">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center font-bold">
                  <Barcode className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold font-poppins text-slate-900">Physical Book Label Stickers</h3>
                  <p className="text-xs text-slate-500">Accession barcodes generated during autonomous cataloging.</p>
                </div>
              </div>
              <button onClick={() => setActionModalType(null)} className="text-slate-400 hover:text-slate-600 font-bold p-1">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3">
              {(selectedRequest.generatedAccessionNos || ['ACC-2026-901']).map((acc, idx) => {
                const barcode = (selectedRequest.generatedBarcodes && selectedRequest.generatedBarcodes[idx]) || `BC-${acc}`;
                return (
                  <div
                    key={acc}
                    className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4"
                  >
                    <div className="space-y-1 text-center sm:text-left">
                      <span className="text-[10px] font-extrabold text-purple-700 uppercase bg-purple-100 px-2 py-0.5 rounded-full">
                        Copy #{idx + 1} • {selectedRequest.assignedRackNumber || 'RACK-CS-01'}
                      </span>
                      <p className="font-bold text-slate-900 text-xs max-w-xs truncate">{selectedRequest.bookTitle}</p>
                      <p className="font-mono text-xs font-bold text-slate-700">Accession: {acc}</p>
                    </div>

                    <div className="text-center bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
                      <div
                        dangerouslySetInnerHTML={{
                          __html: generateBarcodeSvgString(barcode, { height: 36 }),
                        }}
                      />
                      <span className="font-mono font-bold text-[10px] text-slate-800 tracking-wider block mt-0.5">
                        {barcode}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setActionModalType(null)}
                className="px-4 py-2.5 rounded-2xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
              >
                Close
              </button>
              <button
                onClick={() => window.print()}
                className="px-5 py-2.5 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md"
              >
                <Printer className="h-4 w-4" /> Print Label Stickers
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 8. DIALOG MODAL: NEW PROCUREMENT REQUISITION */}
      {/* ------------------------------------------------------------- */}
      {actionModalType === 'NEW_REQUEST' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <form
            onSubmit={handleCreateRequest}
            className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-xl w-full p-6 space-y-4 my-auto"
          >
            <div className="flex items-center justify-between pb-1">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                  <ShoppingBag className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold font-poppins text-slate-900">
                    New Book Acquisition Requisition
                  </h3>
                  <p className="text-xs text-slate-500">Initiate procurement workflow for syllabus or research textbooks.</p>
                </div>
              </div>
              <button onClick={() => setActionModalType(null)} className="text-slate-400 hover:text-slate-600 font-bold p-1">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Quick Preset Templates */}
            <div className="space-y-1">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                ✨ Quick Auto-Fill Academic Suggestions:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {PRESET_BOOK_TEMPLATES.map((tmpl) => (
                  <button
                    key={tmpl.isbn}
                    type="button"
                    onClick={() => handleSelectTemplate(tmpl)}
                    className="text-[10px] font-bold bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 px-2.5 py-1 rounded-xl transition-all cursor-pointer truncate max-w-[240px]"
                  >
                    + {tmpl.title}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Book Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Designing Data-Intensive Applications"
                  value={newBookTitle}
                  onChange={(e) => setNewBookTitle(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-bold text-slate-800 focus:ring-2 focus:ring-purple-500/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Author Name(s) *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Martin Kleppmann"
                    value={newAuthorName}
                    onChange={(e) => setNewAuthorName(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 font-medium"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">ISBN Number</label>
                  <input
                    type="text"
                    placeholder="978-..."
                    value={newIsbn}
                    onChange={(e) => setNewIsbn(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Publisher</label>
                  <input
                    type="text"
                    placeholder="e.g. O'Reilly Media"
                    value={newPublisher}
                    onChange={(e) => setNewPublisher(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 font-medium"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Estimated Unit Price (₹)</label>
                  <input
                    type="number"
                    min={100}
                    value={newEstPrice}
                    onChange={(e) => setNewEstPrice(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl border border-slate-200 font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Requested Copies</label>
                  <input
                    type="number"
                    min={1}
                    value={newQuantity}
                    onChange={(e) => setNewQuantity(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl border border-slate-200 font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Academic Department</label>
                  <select
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 font-bold text-slate-800 bg-slate-50"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Urgency / Priority</label>
                  <select
                    value={newUrgency}
                    onChange={(e) => setNewUrgency(e.target.value as any)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 font-bold text-slate-800 bg-slate-50"
                  >
                    <option value="NORMAL">Standard Acquisition (Semester Start)</option>
                    <option value="HIGH">High Priority (Exam Reference)</option>
                    <option value="CRITICAL_SYLLABUS">Critical - Mandatory Syllabus Text</option>
                  </select>
                </div>
              </div>

              {/* Student / Faculty ID / Card Number Search (Auto-Fill) */}
              <div className="bg-purple-50/50 p-3.5 rounded-2xl border border-purple-100 space-y-2">
                <div>
                  <label className="block font-extrabold text-purple-900 mb-1 flex items-center justify-between">
                    <span>Student ID / Faculty Card Number / Member Search</span>
                    <span className="text-[10px] text-purple-600 font-bold">Auto-fills Name & Role</span>
                  </label>
                  <input
                    type="text"
                    list="procurement-members-list"
                    placeholder="Type or select Student ID (e.g. STU-2026-7326, FAC-2023-1102, or Name)..."
                    value={newMemberCardNo}
                    onChange={(e) => handleMemberLookup(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-purple-200 bg-white font-mono text-xs font-bold text-slate-900 focus:ring-2 focus:ring-purple-500/30 focus:outline-none"
                  />
                  <datalist id="procurement-members-list">
                    {(state.members || []).map((m) => (
                      <option key={m.id} value={m.memberCardNo || m.id}>
                        {m.name} ({m.role} • {m.department || 'General'})
                      </option>
                    ))}
                  </datalist>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Requester Role (Auto-Selected)</label>
                    <select
                      value={newRequesterRole}
                      onChange={(e) => setNewRequesterRole(e.target.value as any)}
                      className="w-full p-2.5 rounded-xl border border-slate-200 font-bold text-slate-800 bg-white"
                    >
                      <option value="STUDENT">Student Requisition</option>
                      <option value="FACULTY">Faculty Member / Professor</option>
                      <option value="ADMIN">Library Staff / Admin</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Requester Name (Auto-Filled)</label>
                    <input
                      type="text"
                      required
                      placeholder="Student / Faculty Full Name"
                      value={newRequesterName}
                      onChange={(e) => setNewRequesterName(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-slate-200 font-bold text-slate-900 bg-white"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Academic Justification / Course Syllabus Note</label>
                <textarea
                  rows={2}
                  placeholder="Specify curriculum course code, research justification, or syllabus reference..."
                  value={newReason}
                  onChange={(e) => setNewReason(e.target.value)}
                  className="w-full p-3 rounded-2xl border border-slate-200 font-medium focus:ring-2 focus:ring-purple-500/20"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setActionModalType(null)}
                className="px-4 py-2.5 rounded-2xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold cursor-pointer shadow-md"
              >
                Submit Requisition →
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 9. DIALOG MODAL: REGISTER / EDIT SUPPLIER */}
      {/* ------------------------------------------------------------- */}
      {actionModalType === 'NEW_VENDOR' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <form
            onSubmit={handleSaveVendor}
            className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4 my-auto"
          >
            <div className="flex items-center justify-between pb-1">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                  <Building2 className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold font-poppins text-slate-900">
                    {editingVendor ? 'Edit Supplier Profile' : 'Register New Book Supplier / Vendor'}
                  </h3>
                  <p className="text-xs text-slate-500">Official distributor for purchase order generation.</p>
                </div>
              </div>
              <button onClick={() => setActionModalType(null)} className="text-slate-400 hover:text-slate-600 font-bold p-1">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Company / Publisher Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Oxford Book Distributors & Logistics"
                  value={newVendorName}
                  onChange={(e) => setNewVendorName(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-bold text-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Contact Officer / Representative</label>
                  <input
                    type="text"
                    placeholder="e.g. Dr. S. K. Mukherjee"
                    value={newVendorContact}
                    onChange={(e) => setNewVendorContact(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 font-medium"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Official Email</label>
                  <input
                    type="email"
                    placeholder="orders@vendor.com"
                    value={newVendorEmail}
                    onChange={(e) => setNewVendorEmail(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Phone / WhatsApp</label>
                  <input
                    type="text"
                    placeholder="+91 98000 00000"
                    value={newVendorPhone}
                    onChange={(e) => setNewVendorPhone(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 font-medium"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Performance Rating (1-5)</label>
                  <input
                    type="number"
                    step="0.1"
                    min={1}
                    max={5}
                    value={newVendorRating}
                    onChange={(e) => setNewVendorRating(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl border border-slate-200 font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Commercial Office / Warehouse Address</label>
                <input
                  type="text"
                  placeholder="e.g. Institutional Area, Sector 62, New Delhi"
                  value={newVendorAddress}
                  onChange={(e) => setNewVendorAddress(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Specialization Categories (Comma Separated)</label>
                <input
                  type="text"
                  placeholder="Computer Science, AI & ML, Physics, Law"
                  value={newVendorCategories}
                  onChange={(e) => setNewVendorCategories(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-medium"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setActionModalType(null)}
                className="px-4 py-2.5 rounded-2xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold cursor-pointer shadow-md"
              >
                {editingVendor ? 'Save Changes' : 'Register Supplier'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
