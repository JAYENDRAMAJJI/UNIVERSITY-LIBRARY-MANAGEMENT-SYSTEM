import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  History,
  BookOpen,
  Search,
  Filter,
  SlidersHorizontal,
  Download,
  Printer,
  FileSpreadsheet,
  FileText,
  User,
  Clock,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Loader2,
  Calendar,
  Tag,
  Barcode,
  Layers,
  Sparkles,
  ArrowRightLeft,
  X,
  ShieldCheck,
} from 'lucide-react';
import { libraryStore, getLocalDateStr, getTransactionFineAmount } from '../../services/libraryStore.service';
import { Book, IssueTransaction } from '../../types/library';

const formatDateTime = (rawStr?: string, defaultTimeStr = '10:00 AM') => {
  if (!rawStr) return 'N/A';

  const trimmed = rawStr.trim();

  // If already formatted like "2026-07-28 10:00 AM" or "2026-07-28 14:30"
  if (trimmed.includes(' ')) {
    const parts = trimmed.split(' ');
    if (parts.length >= 2) {
      const datePart = parts[0];
      const timePart = parts[1];
      const period = parts[2] || '';
      if (period) return `${datePart} (${timePart} ${period})`;
      
      const [hh, mm] = timePart.split(':').map(Number);
      if (isNaN(hh) || isNaN(mm)) return `${datePart} (${timePart})`;
      const formattedHour = hh % 12 || 12;
      const ampm = hh >= 12 ? 'PM' : 'AM';
      const padMin = String(mm).padStart(2, '0');
      return `${datePart} (${String(formattedHour).padStart(2, '0')}:${padMin} ${ampm})`;
    }
  }

  // Handle 'YYYY-MM-DD' without time
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return defaultTimeStr ? `${trimmed} (${defaultTimeStr})` : trimmed;
  }

  return trimmed;
};

export default function BookBorrowHistory() {
  const { user } = useAuth();
  const isAdminOrStaff = user?.role === 'ADMIN' || user?.role === 'STAFF';
  const [searchParams, setSearchParams] = useSearchParams();
  const initialBookId = searchParams.get('bookId') || '';

  const [storeState, setStoreState] = useState(libraryStore.snapshot);
  const [selectedBookId, setSelectedBookId] = useState<string>(initialBookId);
  const [searchTerm, setSearchTerm] = useState('');
  const [nameSearchTerm, setNameSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'CURRENT' | 'RETURNED' | 'OVERDUE' | 'LOST'>('ALL');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'STUDENT' | 'FACULTY'>('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isLoading, setIsLoading] = useState(false);

  // Single Combined Export & Print Dropdown State
  const [isExportDropdownOpen, setIsExportDropdownOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const exportDropdownRef = useRef<HTMLDivElement>(null);

  // Searchable Book Select Dropdown State
  const [isBookSelectOpen, setIsBookSelectOpen] = useState(false);
  const [bookSelectSearchTerm, setBookSelectSearchTerm] = useState('');
  const bookSelectRef = useRef<HTMLDivElement>(null);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportDropdownRef.current && !exportDropdownRef.current.contains(event.target as Node)) {
        setIsExportDropdownOpen(false);
      }
      if (bookSelectRef.current && !bookSelectRef.current.contains(event.target as Node)) {
        setIsBookSelectOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const sub = libraryStore.getObservable().subscribe(setStoreState);
    return () => sub.unsubscribe();
  }, []);

  useEffect(() => {
    if (initialBookId) {
      setSelectedBookId(initialBookId);
    }
  }, [initialBookId]);

  // Current Member Object matching logged in user
  const currentUserMember = useMemo(() => {
    if (!user) return null;
    return (
      storeState.members.find(
        (m) =>
          (user.email && m.email.toLowerCase() === user.email.toLowerCase()) ||
          (user.id && m.id === user.id) ||
          (user.email && m.memberCardNo && m.memberCardNo.toLowerCase() === user.email.toLowerCase()) ||
          (user.name && m.name.toLowerCase() === user.name.toLowerCase())
      ) || null
    );
  }, [storeState.members, user]);

  // Scoped transactions per role: Admin sees all; Non-admin (Student/Faculty) ONLY sees their own
  const userScopedTransactions = useMemo(() => {
    const all = storeState.transactions || [];
    if (isAdminOrStaff) {
      return all;
    }
    const uEmail = user?.email?.toLowerCase();
    const uName = user?.name?.toLowerCase();
    const mId = currentUserMember?.id;
    const mCard = currentUserMember?.memberCardNo?.toLowerCase();

    return all.filter((t) => {
      const matchMemberId = Boolean(mId && t.memberId === mId);
      const matchCardNo = Boolean(mCard && t.memberCardNo?.toLowerCase() === mCard);
      const matchName = Boolean(uName && t.memberName?.toLowerCase() === uName);
      const matchEmail = Boolean(uEmail && (t.memberCardNo?.toLowerCase() === uEmail || (t as any).email?.toLowerCase() === uEmail));
      return matchMemberId || matchCardNo || matchName || matchEmail;
    });
  }, [isAdminOrStaff, storeState.transactions, user, currentUserMember]);

  // Handle Book switch with loading state
  const handleBookChange = (bookId: string) => {
    setIsLoading(true);
    setSelectedBookId(bookId);
    setCurrentPage(1);
    if (bookId) {
      setSearchParams({ bookId });
    } else {
      setSearchParams({});
    }
    setTimeout(() => setIsLoading(false), 300);
  };

  // Selected Book Object (or undefined if 'ALL')
  const currentBook: Book | undefined = useMemo(() => {
    if (!selectedBookId || selectedBookId === 'ALL') return undefined;
    return storeState.books.find((b) => b.id === selectedBookId);
  }, [storeState.books, selectedBookId]);

  const filteredBookOptions = useMemo(() => {
    const term = bookSelectSearchTerm.toLowerCase().trim();
    if (!term) return storeState.books;
    return storeState.books.filter(
      (b) =>
        b.title.toLowerCase().includes(term) ||
        b.isbn.toLowerCase().includes(term) ||
        b.authorName.toLowerCase().includes(term) ||
        b.categoryName.toLowerCase().includes(term)
    );
  }, [storeState.books, bookSelectSearchTerm]);

  // Target Transactions (filtered by selected book if one is chosen)
  const baseTransactions: IssueTransaction[] = useMemo(() => {
    if (currentBook) {
      return userScopedTransactions.filter((tx) => tx.bookId === currentBook.id);
    }
    return userScopedTransactions;
  }, [userScopedTransactions, currentBook]);

  // Status Badge Record Counts
  const statusCounts = useMemo(() => {
    return {
      all: baseTransactions.length,
      current: baseTransactions.filter((t) => t.status === 'ISSUED' || t.status === 'OVERDUE').length,
      returned: baseTransactions.filter((t) => t.status === 'RETURNED').length,
      overdue: baseTransactions.filter((t) => t.status === 'OVERDUE').length,
      lost: baseTransactions.filter((t) => t.status === 'LOST').length,
    };
  }, [baseTransactions]);

  const hasActiveFilters = Boolean(
    searchTerm || selectedBookId || statusFilter !== 'ALL' || roleFilter !== 'ALL' || startDate || endDate
  );

  const handleResetAllFilters = () => {
    setSearchTerm('');
    setSelectedBookId('');
    setBookSelectSearchTerm('');
    setStatusFilter('ALL');
    setRoleFilter('ALL');
    setStartDate('');
    setEndDate('');
    setCurrentPage(1);
    setSearchParams({});
  };

  // Statistics for Selection
  const stats = useMemo(() => {
    const totalBorrowCount = baseTransactions.length;
    const currentBorrowedCopies = baseTransactions.filter(
      (t) => t.status === 'ISSUED' || t.status === 'OVERDUE'
    ).length;

    const availableCopies = currentBook
      ? currentBook.availableCopies
      : storeState.books.reduce((acc, b) => acc + b.availableCopies, 0);

    const returnedCount = baseTransactions.filter((t) => t.status === 'RETURNED').length;
    const overdueCount = baseTransactions.filter((t) => t.status === 'OVERDUE').length;

    // Latest Borrow Date
    const sortedByBorrow = [...baseTransactions].sort(
      (a, b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime()
    );
    const lastBorrowDate = sortedByBorrow.length > 0 ? sortedByBorrow[0].issueDate : '-';

    // Latest Return Date
    const returnedTxs = baseTransactions
      .filter((t) => t.returnDate)
      .sort((a, b) => new Date(b.returnDate!).getTime() - new Date(a.returnDate!).getTime());
    const lastReturnDate = returnedTxs.length > 0 ? returnedTxs[0].returnDate! : '-';

    return {
      totalBorrowCount,
      currentBorrowedCopies,
      availableCopies,
      returnedCount,
      overdueCount,
      lastBorrowDate,
      lastReturnDate,
    };
  }, [currentBook, baseTransactions, storeState.books]);

  // Filtered & Sorted Borrow History Records
  const filteredRecords = useMemo(() => {
    return baseTransactions
      .filter((record) => {
        // Single Combined Unified Search (Book Name, Borrower Name, Book ID, Member ID, Card No, Accession No, Barcode, Issued By)
        const term = searchTerm.toLowerCase().trim();
        const matchesSearch =
          !term ||
          record.bookTitle.toLowerCase().includes(term) ||
          record.memberName.toLowerCase().includes(term) ||
          record.bookId.toLowerCase().includes(term) ||
          record.memberId.toLowerCase().includes(term) ||
          record.memberCardNo.toLowerCase().includes(term) ||
          record.accessionNo.toLowerCase().includes(term) ||
          record.barcode.toLowerCase().includes(term) ||
          (record.issuedByName && record.issuedByName.toLowerCase().includes(term));

        // Status Filter
        let matchesStatus = true;
        if (statusFilter === 'CURRENT') {
          matchesStatus = record.status === 'ISSUED' || record.status === 'OVERDUE';
        } else if (statusFilter === 'RETURNED') {
          matchesStatus = record.status === 'RETURNED';
        } else if (statusFilter === 'OVERDUE') {
          matchesStatus = record.status === 'OVERDUE';
        } else if (statusFilter === 'LOST') {
          matchesStatus = record.status === 'LOST';
        }

        // Role Filter
        let matchesRole = true;
        if (roleFilter !== 'ALL') {
          matchesRole = record.memberType === roleFilter;
        }

        // Date Range Filter
        let matchesDate = true;
        if (startDate) {
          matchesDate = matchesDate && new Date(record.issueDate) >= new Date(startDate);
        }
        if (endDate) {
          matchesDate = matchesDate && new Date(record.issueDate) <= new Date(endDate);
        }

        return matchesSearch && matchesStatus && matchesRole && matchesDate;
      })
      .sort((a, b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime());
  }, [baseTransactions, searchTerm, statusFilter, roleFilter, startDate, endDate]);

  // Pagination Logic
  const totalPages = Math.ceil(filteredRecords.length / pageSize) || 1;
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRecords.slice(start, start + pageSize);
  }, [filteredRecords, currentPage, pageSize]);

  // Helper for Department lookup
  const getMemberDept = (memberCardNo: string) => {
    const member = storeState.members.find((m) => m.memberCardNo === memberCardNo);
    return member?.department || 'Computer Science';
  };

  // Helper to calculate total borrow days
  const calculateBorrowDays = (issueDate: string, returnDate?: string) => {
    const start = new Date(issueDate);
    const end = returnDate ? new Date(returnDate) : new Date();
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = [
      'Transaction ID',
      'Book ID',
      'Book Title',
      'Accession No',
      'Barcode',
      'User ID / Card No',
      'User Name',
      'User Role',
      'Department',
      'Issue Date & Time',
      'Due Date',
      'Return Date & Time',
      'Borrow Duration (Days)',
      'Fine Amount',
      'Status',
    ];

    const rows = filteredRecords.map((r) => {
      const fineInfo = getTransactionFineAmount(r, storeState);
      return [
        r.id,
        r.bookId,
        `"${(r.bookTitle || '').replace(/"/g, '""')}"`,
        r.accessionNo,
        r.barcode,
        r.memberCardNo,
        `"${(r.memberName || '').replace(/"/g, '""')}"`,
        r.memberType,
        `"${(getMemberDept(r.memberCardNo) || '').replace(/"/g, '""')}"`,
        r.issueDate,
        r.dueDate,
        r.returnDate || 'N/A (Still Borrowed)',
        calculateBorrowDays(r.issueDate, r.returnDate),
        `₹${fineInfo.fineAmount.toFixed(2)}`,
        r.status,
      ];
    });

    const csvString = [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute(
      'download',
      `book_borrow_history_${currentBook ? currentBook.id : 'all'}_${getLocalDateStr(new Date())}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Print PDF / Document Report
  const handlePrint = () => {
    window.print();
  };

  const handleExportCSVOption = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsExportDropdownOpen(false);
    triggerToast('Book borrow history exported to CSV successfully!');
    setTimeout(() => {
      handleExportCSV();
    }, 50);
  };

  const handlePrintOption = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsExportDropdownOpen(false);
    triggerToast('Opening print / PDF report dialog...');
    setTimeout(() => {
      handlePrint();
    }, 150);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-purple-700 bg-purple-50 px-3 py-1 rounded-full mb-2">
            <History className="h-3.5 w-3.5" /> {isAdminOrStaff ? 'Book-Wise Borrowing History & Analytics' : 'My Personal Borrowing History Log'}
          </div>
          <h1 className="text-2xl font-bold font-poppins text-slate-900">
            {isAdminOrStaff ? 'Book Borrow History Log' : 'My Borrowed Books History'}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {isAdminOrStaff
              ? 'Complete transaction records for current borrowers, past return dates, timestamps, fines, and copy statistics.'
              : 'Your personal book borrowing history, current loans, return dates, duration, and fine records.'}
          </p>
        </div>

        {/* Single Combined Export & Print Dropdown Button */}
        <div className="relative" ref={exportDropdownRef}>
          <button
            type="button"
            onClick={() => setIsExportDropdownOpen(!isExportDropdownOpen)}
            className="inline-flex items-center gap-2.5 px-4 py-2.5 rounded-xl border border-purple-200 bg-purple-50 text-xs font-bold text-purple-900 hover:bg-purple-100 transition-all cursor-pointer shadow-2xs"
          >
            <Download className="w-4 h-4 text-purple-600" />
            <span>Export & Print Report</span>
            <ChevronDown className={`w-3.5 h-3.5 text-purple-600 transition-transform duration-200 ${isExportDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {isExportDropdownOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl border border-slate-200 shadow-xl z-50 p-2 space-y-1 animate-fadeIn">
              <div className="px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 border-b border-slate-100 mb-1">
                Select Export / Report Format
              </div>

              {/* Export CSV Option */}
              <button
                type="button"
                onClick={handleExportCSVOption}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-900 transition-all cursor-pointer text-left group"
              >
                <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100 shrink-0">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-slate-900 group-hover:text-emerald-900">Export Excel / CSV</div>
                  <div className="text-[10px] text-slate-500 font-normal">Download structured tabular log data</div>
                </div>
              </button>

              {/* Print PDF Option */}
              <button
                type="button"
                onClick={handlePrintOption}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-700 hover:bg-purple-50 hover:text-purple-900 transition-all cursor-pointer text-left group"
              >
                <div className="p-2 rounded-lg bg-purple-50 text-purple-600 group-hover:bg-purple-100 shrink-0">
                  <Printer className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-slate-900 group-hover:text-purple-900">Print Report / PDF</div>
                  <div className="text-[10px] text-slate-500 font-normal">Generate print-ready PDF document</div>
                </div>
              </button>
            </div>
          )}
        </div>
      </div>


      {/* Toast Alert */}
      {toastMessage && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-medium animate-fadeIn">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Controls & Filters Bar (Matching Attendance Management Layout & Style) */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
        {/* Top Header Row */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-purple-600" />
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Filter & Search Borrowing Records
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
              Showing {filteredRecords.length} of {baseTransactions.length} Total Logs
            </span>

            {/* Combined Export Dropdown */}
            <div className="relative" ref={exportDropdownRef}>
              <button
                type="button"
                onClick={() => setIsExportDropdownOpen(!isExportDropdownOpen)}
                className="px-3.5 py-1.5 rounded-xl bg-purple-50 text-purple-700 border border-purple-100 hover:bg-purple-100 font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="h-3.5 w-3.5" /> Export CSV <ChevronDown className="h-3 w-3" />
              </button>

              {isExportDropdownOpen && (
                <div className="absolute right-0 top-full mt-1.5 w-52 bg-white rounded-2xl shadow-xl border border-slate-200 z-50 p-1.5 space-y-1 animate-fadeIn">
                  <button
                    type="button"
                    onClick={() => {
                      setIsExportDropdownOpen(false);
                      triggerToast('Generating CSV report...');
                      setTimeout(() => {
                        const headers = ['Transaction ID', 'Book Title', 'Borrower Name', 'Card No', 'Status', 'Issue Date', 'Due Date', 'Return Date'];
                        const rows = filteredRecords.map((t) => [
                          t.id,
                          `"${t.bookTitle.replace(/"/g, '""')}"`,
                          `"${t.memberName.replace(/"/g, '""')}"`,
                          t.memberCardNo,
                          t.status,
                          t.issueDate,
                          t.dueDate,
                          t.returnDate || '',
                        ]);
                        const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
                        const encodedUri = encodeURI(csvContent);
                        const link = document.createElement('a');
                        link.setAttribute('href', encodedUri);
                        link.setAttribute('download', `borrow_history_${new Date().toISOString().split('T')[0]}.csv`);
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        triggerToast('CSV Report Downloaded Successfully');
                      }, 500);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-purple-50 hover:text-purple-700 rounded-xl transition-colors text-left cursor-pointer"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600" /> Export Filtered CSV
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsExportDropdownOpen(false);
                      triggerToast('Preparing printable history report...');
                      setTimeout(() => {
                        window.print();
                      }, 400);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-purple-50 hover:text-purple-700 rounded-xl transition-colors text-left cursor-pointer"
                  >
                    <Printer className="w-4 h-4 text-purple-600" /> Print Record Log
                  </button>
                </div>
              )}
            </div>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetAllFilters}
                className="px-3 py-1.5 rounded-xl bg-rose-50 text-rose-700 border border-rose-100 hover:bg-rose-100 font-bold text-xs transition-colors flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Reset
              </button>
            )}
          </div>
        </div>

        {/* Controls Row: Search Input + Status Dropdown + Book Catalog Dropdown + Role Filter Dropdown */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-3">
          {/* Search Bar */}
          <div className={`${isAdminOrStaff ? 'md:col-span-4' : 'md:col-span-6'} relative`}>
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search timestamp, gate, visit purpose, book title, borrower..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-10 pr-9 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 text-slate-800 font-medium"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Status Dropdown Filter */}
          <div className="md:col-span-3 relative">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as any);
                setCurrentPage(1);
              }}
              className="w-full pl-3.5 pr-9 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 bg-slate-50/80 focus:bg-white appearance-none cursor-pointer truncate"
            >
              <option value="ALL">All Statuses</option>
              <option value="CURRENT">Currently Borrowed ({statusCounts.current})</option>
              <option value="RETURNED">Returned Records ({statusCounts.returned})</option>
              <option value="OVERDUE">Overdue Records ({statusCounts.overdue})</option>
              <option value="LOST">Lost Records ({statusCounts.lost})</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
          </div>

          {/* Book Catalog Dropdown Select */}
          <div className={`${isAdminOrStaff ? 'md:col-span-3' : 'md:col-span-3'} relative`}>
            <select
              value={selectedBookId}
              onChange={(e) => {
                handleBookChange(e.target.value);
              }}
              className="w-full pl-3.5 pr-9 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 bg-slate-50/80 focus:bg-white appearance-none cursor-pointer truncate"
            >
              <option value="">All Catalog Books</option>
              {storeState.books.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.title}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
          </div>

          {/* Role Filter Dropdown (Admin & Staff Exclusive) */}
          {isAdminOrStaff && (
            <div className="md:col-span-2 relative">
              <select
                value={roleFilter}
                onChange={(e) => {
                  setRoleFilter(e.target.value as any);
                  setCurrentPage(1);
                }}
                className="w-full pl-3.5 pr-9 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 bg-slate-50/80 focus:bg-white appearance-none cursor-pointer truncate"
              >
                <option value="ALL">All Roles</option>
                <option value="STUDENT">Student</option>
                <option value="FACULTY">Faculty</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            </div>
          )}
        </div>
      </div>

      {/* History Data Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden space-y-0">
        {isLoading ? (
          <div className="py-16 text-center text-slate-400 space-y-2">
            <Loader2 className="w-8 h-8 animate-spin text-purple-600 mx-auto" />
            <p className="text-xs font-semibold">Loading book borrowing transaction log...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[1100px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4 w-[210px] min-w-[210px]">Borrower User Details</th>
                  <th className="py-3.5 px-4 w-[240px] min-w-[240px] max-w-[240px]">Book Title & Copy Info</th>
                  <th className="py-3.5 px-4 w-[160px] min-w-[160px]">Borrow Date & Time</th>
                  <th className="py-3.5 px-4 w-[110px] min-w-[110px]">Due Date</th>
                  <th className="py-3.5 px-4 w-[180px] min-w-[180px]">Return Date & Time</th>
                  <th className="py-3.5 px-4 w-[130px] min-w-[130px]">Borrow Duration</th>
                  <th className="py-3.5 px-4 w-[110px] min-w-[110px]">Fine Status</th>
                  <th className="py-3.5 px-4 w-[120px] min-w-[120px] text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {paginatedRecords.map((record) => {
                  const duration = calculateBorrowDays(record.issueDate, record.returnDate);
                  return (
                    <tr key={record.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* User Details */}
                      <td className="py-4 px-4 w-[210px] min-w-[210px] align-middle">
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 truncate" title={record.memberName}>{record.memberName}</p>
                          <p className="text-xs font-mono text-purple-700 font-bold">{record.memberCardNo}</p>
                          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                            <span className="text-[10px] font-extrabold uppercase bg-purple-100 text-purple-800 px-2 py-0.5 rounded shrink-0">
                              {record.memberType}
                            </span>
                            <span className="text-[11px] font-medium text-slate-500 truncate max-w-[130px]" title={getMemberDept(record.memberCardNo)}>
                              {getMemberDept(record.memberCardNo)}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Book & Copy */}
                      <td className="py-4 px-4 align-middle w-[240px] min-w-[240px] max-w-[240px]">
                        <div className="min-w-0 overflow-hidden">
                          <p className="font-bold text-slate-900 truncate block" title={record.bookTitle}>
                            {record.bookTitle}
                          </p>
                          <p className="text-xs font-mono text-slate-500 truncate block mt-0.5" title={`ACC: ${record.accessionNo} | BC: ${record.barcode}`}>
                            <span className="text-slate-400">ACC:</span> {record.accessionNo} <span className="text-slate-300">|</span> <span className="text-slate-400">BC:</span> {record.barcode}
                          </p>
                        </div>
                      </td>

                      {/* Borrow Date & Time */}
                      <td className="py-4 px-4 align-middle w-[160px] min-w-[160px] font-mono text-xs font-semibold text-slate-700 whitespace-nowrap">
                        {formatDateTime(record.issueDate, '10:00 AM')}
                      </td>

                      {/* Due Date */}
                      <td className="py-4 px-4 align-middle w-[110px] min-w-[110px] font-mono text-xs font-bold text-slate-900 whitespace-nowrap">
                        {record.dueDate}
                      </td>

                      {/* Return Date & Time */}
                      <td className="py-4 px-4 align-middle w-[180px] min-w-[180px]">
                        <div>
                          {record.returnDate ? (
                            <span className="inline-flex items-center gap-1 font-mono text-xs font-bold text-emerald-700 whitespace-nowrap">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              {formatDateTime(record.returnDate, '04:30 PM')}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-50 border border-amber-200/80 text-amber-800 text-[11px] font-semibold whitespace-nowrap">
                              <Clock className="w-3 h-3 text-amber-600 shrink-0" />
                              Active Borrowed
                            </span>
                          )}
                          {record.notes && (
                            <p className="text-[11px] font-sans font-medium text-slate-500 mt-1 bg-slate-50 px-2 py-0.5 rounded border border-slate-200 truncate max-w-[170px]" title={record.notes}>
                              Remark: "{record.notes}"
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Duration */}
                      <td className="py-4 px-4 align-middle w-[130px] min-w-[130px] font-semibold text-slate-700 text-xs whitespace-nowrap">
                        {record.returnDate ? (
                          <span>{duration} {duration === 1 ? 'Day' : 'Days'}</span>
                        ) : (
                          <span className="text-amber-800 font-bold">Active ({duration} {duration === 1 ? 'Day' : 'Days'})</span>
                        )}
                      </td>

                      {/* Fine Amount */}
                      <td className="py-4 px-4 align-middle w-[110px] min-w-[110px] text-xs font-bold whitespace-nowrap">
                        {(() => {
                          const fineInfo = getTransactionFineAmount(record, storeState);
                          return fineInfo.fineAmount > 0 ? (
                            <div className="flex flex-col">
                              <span className="text-rose-700 font-mono">₹{fineInfo.fineAmount.toFixed(2)}</span>
                              <span className="text-[10px] text-rose-600 font-sans uppercase font-extrabold tracking-wide">({fineInfo.fineStatus})</span>
                            </div>
                          ) : (
                            <span className="text-slate-400 font-mono">₹0.00</span>
                          );
                        })()}
                      </td>

                      {/* Status Badge */}
                      <td className="py-4 px-4 align-middle w-[120px] min-w-[120px] text-right">
                        <span
                          className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold uppercase ${
                            record.status === 'RETURNED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : record.status === 'OVERDUE'
                              ? 'bg-rose-100 text-rose-800'
                              : record.status === 'LOST'
                              ? 'bg-slate-200 text-slate-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {record.status === 'RETURNED' && <CheckCircle2 className="w-3.5 h-3.5" />}
                          {record.status === 'OVERDUE' && <AlertCircle className="w-3.5 h-3.5" />}
                          {record.status === 'ISSUED' && <Clock className="w-3.5 h-3.5" />}
                          {record.status === 'ISSUED' ? 'BORROWED' : record.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}

                {filteredRecords.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-16 text-center text-slate-400 font-medium space-y-2">
                      <p className="text-base font-bold text-slate-700">No Borrowing History Found</p>
                      <p className="text-xs text-slate-500">No checkout transaction records match your search or filter options.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        <div className="p-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-600">
          <div>
            Showing <strong className="text-slate-900">{filteredRecords.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}</strong> to{' '}
            <strong className="text-slate-900">{Math.min(currentPage * pageSize, filteredRecords.length)}</strong> of{' '}
            <strong className="text-slate-900">{filteredRecords.length}</strong> borrowing records
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-500">Per Page:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="px-2.5 py-1 rounded-xl border border-slate-200 bg-white font-bold cursor-pointer"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-3 py-1 font-bold text-slate-800">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="p-2 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
