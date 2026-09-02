import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
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
  Bell,
  Send,
  IndianRupee,
} from 'lucide-react';
import { libraryStore, getLocalDateStr, getTransactionFineAmount } from '../../services/libraryStore.service';
import { exportStyledExcelFile } from '../../utils/excelExport';
import { Book, IssueTransaction } from '../../types/library';
import SendNotificationModal from '../../components/common/SendNotificationModal';

const splitDateTime = (rawStr?: string, defaultTimeStr = '10:00 AM') => {
  if (!rawStr) return { date: 'N/A', time: '' };

  const trimmed = rawStr.trim();

  // If already formatted like "2026-07-28 10:00 AM" or "2026-07-28 14:30"
  if (trimmed.includes(' ')) {
    const parts = trimmed.split(' ');
    if (parts.length >= 2) {
      const datePart = parts[0];
      const timePart = parts[1];
      const period = parts[2] || '';
      if (period) return { date: datePart, time: `${timePart} ${period}` };
      
      const [hh, mm] = timePart.split(':').map(Number);
      if (isNaN(hh) || isNaN(mm)) return { date: datePart, time: timePart };
      const formattedHour = hh % 12 || 12;
      const ampm = hh >= 12 ? 'PM' : 'AM';
      const padMin = String(mm).padStart(2, '0');
      return { date: datePart, time: `${String(formattedHour).padStart(2, '0')}:${padMin} ${ampm}` };
    }
  }

  // Handle 'YYYY-MM-DD' without time
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return { date: trimmed, time: defaultTimeStr || '' };
  }

  return { date: trimmed, time: defaultTimeStr || '' };
};

const formatDateTime = (rawStr?: string, defaultTimeStr = '10:00 AM') => {
  const { date, time } = splitDateTime(rawStr, defaultTimeStr);
  return time ? `${date} (${time})` : date;
};

export default function BookBorrowHistory() {
  const { user } = useAuth();
  const isAdminOrStaff = user?.role === 'ADMIN' || user?.role === 'STAFF';
  const [searchParams, setSearchParams] = useSearchParams();
  const initialBookId = searchParams.get('bookId') || '';

  const [storeState, setStoreState] = useState(libraryStore.snapshot);
  const [selectedBookId, setSelectedBookId] = useState<string>(initialBookId);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'CURRENT' | 'RETURNED' | 'OVERDUE' | 'LOST'>('ALL');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'STUDENT' | 'FACULTY'>('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isLoading, setIsLoading] = useState(false);

  // Export Modal State
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportStartDate, setExportStartDate] = useState('');
  const [exportEndDate, setExportEndDate] = useState('');
  const [exportRoleFilter, setExportRoleFilter] = useState('ALL');
  const [exportStatusFilter, setExportStatusFilter] = useState('ALL');
  const [selectedExportBookIds, setSelectedExportBookIds] = useState<string[]>([]);
  const [modalBookSearch, setModalBookSearch] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [notificationModalData, setNotificationModalData] = useState<{ member: any; context: any } | null>(null);

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

  // Open Export Modal
  const openExportModal = () => {
    setExportStartDate(startDate);
    setExportEndDate(endDate);
    setExportRoleFilter(roleFilter);
    setExportStatusFilter(statusFilter);
    setSelectedExportBookIds(selectedBookId ? [selectedBookId] : []);
    setModalBookSearch('');
    setShowExportModal(true);
  };

  // Records matched by export modal filter options
  const exportRecordsInRange = useMemo(() => {
    return baseTransactions.filter((record) => {
      // Role filter
      if (exportRoleFilter !== 'ALL' && record.memberType !== exportRoleFilter) {
        return false;
      }
      // Status filter
      if (exportStatusFilter === 'CURRENT' && !(record.status === 'ISSUED' || record.status === 'OVERDUE')) {
        return false;
      } else if (exportStatusFilter === 'RETURNED' && record.status !== 'RETURNED') {
        return false;
      } else if (exportStatusFilter === 'OVERDUE' && record.status !== 'OVERDUE') {
        return false;
      } else if (exportStatusFilter === 'LOST' && record.status !== 'LOST') {
        return false;
      }
      // Multi-Book filter
      if (selectedExportBookIds.length > 0 && !selectedExportBookIds.includes(record.bookId)) {
        return false;
      }
      // Date range filter
      if (exportStartDate) {
        const itemDate = new Date(record.issueDate);
        const start = new Date(exportStartDate);
        if (itemDate < start) return false;
      }
      if (exportEndDate) {
        const itemDate = new Date(record.issueDate);
        const end = new Date(exportEndDate + 'T23:59:59');
        if (itemDate > end) return false;
      }
      return true;
    });
  }, [baseTransactions, exportRoleFilter, exportStatusFilter, selectedExportBookIds, exportStartDate, exportEndDate]);

  // Execute Custom CSV Export from Modal
  const handleExecuteCustomExport = () => {
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

    const rows = exportRecordsInRange.map((r) => {
      const fineInfo = getTransactionFineAmount(r, storeState);
      return [
        r.id,
        r.bookId,
        r.bookTitle || '',
        r.accessionNo,
        r.barcode,
        r.memberCardNo,
        r.memberName || '',
        r.memberType,
        getMemberDept(r.memberCardNo) || '',
        r.issueDate,
        r.dueDate,
        r.returnDate || 'N/A (Still Borrowed)',
        calculateBorrowDays(r.issueDate, r.returnDate),
        `₹${fineInfo.fineAmount.toFixed(2)}`,
        r.status,
      ];
    });

    let bookSlug = '';
    if (selectedExportBookIds.length === 1) {
      const selectedBookObj = storeState.books.find((b) => b.id === selectedExportBookIds[0]);
      bookSlug = selectedBookObj ? `_${selectedBookObj.title.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 25)}` : '';
    } else if (selectedExportBookIds.length > 1) {
      bookSlug = `_${selectedExportBookIds.length}_selected_titles`;
    }

    exportStyledExcelFile({
      filename: `book_borrow_history${bookSlug}_export_${getLocalDateStr(new Date())}.xlsx`,
      sheetName: 'Borrow History Log',
      headers,
      data: rows,
      themeColor: '6D28D9', // Rich Purple header
    });

    setShowExportModal(false);
    triggerToast(`Exported ${exportRecordsInRange.length} borrow history records to formatted Excel spreadsheet!`);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-950 via-indigo-950 to-blue-900 p-6 sm:p-9 rounded-3xl border border-slate-800/80 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-blue-300 bg-white/10 px-3.5 py-1.5 rounded-full border border-blue-400/20 shadow-xs backdrop-blur-xs">
            <History className="h-4 w-4 text-blue-300" />
            <span>{isAdminOrStaff ? 'Book-Wise Borrowing History & Analytics' : 'My Personal Borrowing History Log'}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold font-poppins tracking-tight text-white leading-tight">
            {isAdminOrStaff ? (
              <>
                Book Borrow <span className="bg-gradient-to-r from-blue-300 via-indigo-200 to-sky-200 bg-clip-text text-transparent">History Log</span>
              </>
            ) : (
              <>
                My Borrowed <span className="bg-gradient-to-r from-blue-300 via-indigo-200 to-sky-200 bg-clip-text text-transparent">Books History</span>
              </>
            )}
          </h1>
          <p className="text-slate-300 text-xs sm:text-sm md:text-base max-w-2xl font-medium leading-relaxed">
            {isAdminOrStaff
              ? 'Complete historical audit trail of all student and faculty book checkouts, renewals, and returned loans.'
              : 'Complete records of books checked out by your account with issue dates, due deadlines, and return status.'}
          </p>
        </div>

        {/* Global Export & Clear Controls */}
        <div className="relative z-10 flex items-center gap-2 flex-wrap shrink-0">
          {isAdminOrStaff && (
            <button
              type="button"
              onClick={() => {
                setNotificationModalData({
                  member: null,
                  context: {
                    type: 'DUE_SOON',
                    bookTitle: '',
                  },
                });
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs sm:text-sm backdrop-blur-md border border-white/20 transition-all cursor-pointer active:scale-95"
              title="Dispatch book return reminder or circular notice to members"
            >
              <Bell className="h-4 w-4 text-amber-300" />
              <span>Send Due Notice</span>
            </button>
          )}

          <button
            type="button"
            onClick={openExportModal}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs sm:text-sm shadow-lg shadow-blue-500/25 transition-all cursor-pointer active:scale-95 border border-blue-400/30"
            title="Download CSV Report with custom date & book filters"
          >
            <Download className="h-4 w-4" />
            <span>Export CSV Report</span>
          </button>
        </div>
      </div>

      {/* Search & Filtering Bar */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
          {/* Member Name, Book Title, Card No, Accession Search */}
          <div className="relative lg:col-span-5">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search member name, ID, book title, accession..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-10 pr-9 py-2.5 rounded-2xl border border-slate-200 text-xs font-semibold text-slate-800 placeholder:text-slate-400 bg-slate-50/70 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-300 transition-all"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setCurrentPage(1);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-0.5"
                title="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Book Dropdown Selector */}
          <div className="relative lg:col-span-3" ref={bookSelectRef}>
            <button
              type="button"
              onClick={() => setIsBookSelectOpen(!isBookSelectOpen)}
              className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 text-xs font-semibold text-slate-800 bg-slate-50/70 flex items-center justify-between gap-2 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <span className="truncate">
                {selectedBookId
                  ? storeState.books.find((b) => b.id === selectedBookId)?.title || 'Selected Book'
                  : 'All Books (All Titles)'}
              </span>
              <ChevronDown className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            </button>

            {isBookSelectOpen && (
              <div className="absolute left-0 right-0 top-full mt-1.5 bg-white rounded-2xl border border-slate-200 shadow-xl z-30 p-2 space-y-1.5 max-h-64 overflow-y-auto custom-scrollbar animate-fade-in">
                <input
                  type="text"
                  placeholder="Filter books..."
                  value={bookSelectSearchTerm}
                  onChange={(e) => setBookSelectSearchTerm(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:outline-none focus:ring-1 focus:ring-purple-500/30 mb-1"
                />
                <button
                  type="button"
                  onClick={() => {
                    setSelectedBookId('');
                    setIsBookSelectOpen(false);
                    setCurrentPage(1);
                  }}
                  className={`w-full text-left px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                    !selectedBookId ? 'bg-purple-100 text-purple-900' : 'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  All Books (All Titles)
                </button>
                {storeState.books
                  .filter((b) =>
                    !bookSelectSearchTerm ||
                    b.title.toLowerCase().includes(bookSelectSearchTerm.toLowerCase()) ||
                    (b.authorName && b.authorName.toLowerCase().includes(bookSelectSearchTerm.toLowerCase()))
                  )
                  .map((book) => (
                    <button
                      key={book.id}
                      type="button"
                      onClick={() => {
                        setSelectedBookId(book.id);
                        setIsBookSelectOpen(false);
                        setCurrentPage(1);
                      }}
                      className={`w-full text-left px-3 py-1.5 rounded-xl text-xs transition-colors cursor-pointer ${
                        selectedBookId === book.id
                          ? 'bg-purple-100 text-purple-900 font-bold'
                          : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <p className="truncate font-semibold">{book.title}</p>
                      <p className="text-[10px] text-slate-400 truncate">{book.authorName}</p>
                    </button>
                  ))}
              </div>
            )}
          </div>

          {/* Status Filter */}
          <div className="relative lg:col-span-2">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as any);
                setCurrentPage(1);
              }}
              className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 text-xs font-semibold text-slate-800 bg-slate-50/70 appearance-none focus:outline-none focus:ring-2 focus:ring-purple-500/20 cursor-pointer pr-8"
            >
              <option value="ALL">All Statuses</option>
              <option value="CURRENT">Currently Borrowed</option>
              <option value="RETURNED">Returned</option>
              <option value="OVERDUE">Overdue</option>
              <option value="LOST">Lost</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
          </div>

          {/* Role Filter */}
          {isAdminOrStaff && (
            <div className="relative lg:col-span-2">
              <select
                value={roleFilter}
                onChange={(e) => {
                  setRoleFilter(e.target.value as any);
                  setCurrentPage(1);
                }}
                className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 text-xs font-semibold text-slate-800 bg-slate-50/70 appearance-none focus:outline-none focus:ring-2 focus:ring-purple-500/20 cursor-pointer pr-8"
              >
                <option value="ALL">All Roles</option>
                <option value="STUDENT">Student Only</option>
                <option value="FACULTY">Faculty Only</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            </div>
          )}
        </div>

        {/* Active Filter Indicator & Reset */}
        {hasActiveFilters && (
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
            <div className="flex items-center gap-1.5 text-slate-500 flex-wrap">
              <span className="font-semibold text-slate-700">Active Filters:</span>
              {searchTerm && (
                <span className="px-2 py-0.5 bg-purple-50 text-purple-700 border border-purple-200 rounded-full font-mono text-[11px]">
                  Keyword: "{searchTerm}"
                </span>
              )}
              {selectedBookId && (
                <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-full font-mono text-[11px]">
                  Book: {storeState.books.find((b) => b.id === selectedBookId)?.title || selectedBookId}
                </span>
              )}
              {statusFilter !== 'ALL' && (
                <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-full font-mono text-[11px]">
                  Status: {statusFilter}
                </span>
              )}
              {roleFilter !== 'ALL' && (
                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full font-mono text-[11px]">
                  Role: {roleFilter}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={handleResetAllFilters}
              className="text-purple-700 hover:text-purple-900 font-bold hover:underline cursor-pointer shrink-0 ml-auto"
            >
              Reset Filters
            </button>
          </div>
        )}
      </div>

      {/* History Data Table */}
      <div className="bg-white rounded-3xl border border-purple-100/80 shadow-sm overflow-hidden space-y-0">
        {isLoading ? (
          <div className="py-16 text-center text-slate-400 space-y-2">
            <Loader2 className="w-8 h-8 animate-spin text-purple-600 mx-auto" />
            <p className="text-xs font-semibold">Loading book borrowing transaction log...</p>
          </div>
        ) : (
          <div>
            <table className="w-full text-left border-collapse table-auto">
              <thead>
                <tr className="bg-gradient-to-r from-purple-100/90 via-indigo-50/80 to-purple-100/80 border-b border-purple-200/90 text-xs font-bold uppercase tracking-wider text-purple-950">
                  <th className="py-3.5 px-3 text-purple-950 font-bold">Borrower Details</th>
                  <th className="py-3.5 px-3 text-purple-950 font-bold">Book & Copy Info</th>
                  <th className="py-3.5 px-3 text-indigo-950 font-bold">Borrow Date</th>
                  <th className="py-3.5 px-3 text-purple-950 font-bold">Due Date</th>
                  <th className="py-3.5 px-3 text-emerald-950 font-bold">Return Date</th>
                  <th className="py-3.5 px-2 text-center text-purple-950 font-bold">Duration</th>
                  <th className="py-3.5 px-2 text-center text-rose-950 font-bold">Fine Status</th>
                  <th className="py-3.5 px-3 text-right text-purple-950 font-bold">Status</th>
                  {isAdminOrStaff && <th className="py-3.5 px-3 text-right text-indigo-950 font-bold">Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {paginatedRecords.map((record) => {
                  const duration = calculateBorrowDays(record.issueDate, record.returnDate);
                  return (
                    <tr key={record.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* User Details */}
                      <td className="py-3 px-3 align-middle">
                        <div className="space-y-0.5">
                          <p className="font-bold text-slate-900 leading-tight" title={record.memberName}>{record.memberName}</p>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-mono text-[11px] text-purple-700 font-bold">{record.memberCardNo}</span>
                            <span className="text-[9px] font-extrabold uppercase bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded">
                              {record.memberType}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Book & Copy */}
                      <td className="py-3 px-3 align-middle">
                        <div className="space-y-1">
                          <p className="font-bold text-slate-900 leading-tight line-clamp-1" title={record.bookTitle}>
                            {record.bookTitle}
                          </p>
                          <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-500 flex-wrap">
                            <span className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded text-[10px] font-semibold">
                              ACC: {record.accessionNo}
                            </span>
                            <span className="bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded text-[10px] font-bold">
                              BC: {record.barcode}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Borrow Date & Time */}
                      <td className="py-3 px-3 align-middle whitespace-nowrap">
                        {(() => {
                          const { date, time } = splitDateTime(record.issueDate, '10:00 AM');
                          return (
                            <div className="font-mono space-y-0.5">
                              <p className="text-xs font-bold text-slate-900">{date}</p>
                              {time && <p className="text-[11px] font-medium text-slate-500">{time}</p>}
                            </div>
                          );
                        })()}
                      </td>

                      {/* Due Date */}
                      <td className="py-3 px-3 align-middle font-mono text-xs font-bold text-slate-900 whitespace-nowrap">
                        {record.dueDate}
                      </td>

                      {/* Return Date & Time */}
                      <td className="py-3 px-3 align-middle whitespace-nowrap">
                        {record.returnDate ? (
                          (() => {
                            const { date, time } = splitDateTime(record.returnDate, '04:30 PM');
                            return (
                              <div className="font-mono space-y-0.5">
                                <div className="flex items-center gap-1 text-xs font-bold text-emerald-700">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                  <span>{date}</span>
                                </div>
                                <div className="text-[11px] font-medium text-emerald-600/80 pl-4.5">{time}</div>
                              </div>
                            );
                          })()
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[11px] font-medium whitespace-nowrap">
                            <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                            Pending Return
                          </span>
                        )}
                      </td>

                      {/* Duration */}
                      <td className="py-3 px-2 align-middle text-center font-semibold text-slate-700 text-xs whitespace-nowrap">
                        {record.returnDate ? (
                          <span>{duration}d</span>
                        ) : (
                          <span className="text-amber-800 font-bold">{duration}d (Active)</span>
                        )}
                      </td>

                      {/* Fine Amount & Status */}
                      <td className="py-3 px-2 align-middle text-center text-xs font-bold whitespace-nowrap">
                        {(() => {
                          const fineInfo = getTransactionFineAmount(record, storeState);
                          if (fineInfo.fineAmount <= 0) {
                            return <span className="text-slate-400 font-mono font-medium text-[11px]">₹0.00</span>;
                          }
                          if (fineInfo.fineStatus === 'PAID') {
                            return (
                              <div className="inline-flex flex-col items-center">
                                <span className="text-emerald-700 font-mono font-bold">₹{fineInfo.fineAmount.toFixed(2)}</span>
                                <span className="text-[9px] font-extrabold uppercase text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/60 mt-0.5">
                                  ✓ PAID
                                </span>
                              </div>
                            );
                          }
                          if (fineInfo.fineStatus === 'WAIVED') {
                            return (
                              <div className="inline-flex flex-col items-center">
                                <span className="text-purple-700 font-mono font-bold line-through">₹{fineInfo.fineAmount.toFixed(2)}</span>
                                <span className="text-[9px] font-extrabold uppercase text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200/60 mt-0.5">
                                  WAIVED
                                </span>
                              </div>
                            );
                          }
                          return (
                            <div className="inline-flex flex-col items-center">
                              <span className="text-rose-700 font-mono font-black">₹{fineInfo.fineAmount.toFixed(2)}</span>
                              <span className="text-[9px] font-extrabold uppercase text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200/60 mt-0.5">
                                UNPAID
                              </span>
                            </div>
                          );
                        })()}
                      </td>

                      {/* Status Badge */}
                      <td className="py-3 px-3 align-middle text-right whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase ${
                            record.status === 'RETURNED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : record.status === 'OVERDUE'
                              ? 'bg-rose-100 text-rose-800'
                              : record.status === 'LOST'
                              ? 'bg-slate-200 text-slate-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {record.status === 'RETURNED' && <CheckCircle2 className="w-3 h-3" />}
                          {record.status === 'OVERDUE' && <AlertCircle className="w-3 h-3" />}
                          {record.status === 'ISSUED' && <Clock className="w-3 h-3" />}
                          {record.status === 'ISSUED' ? 'BORROWED' : record.status}
                        </span>
                      </td>

                      {/* Action: Send Reminder / Alert */}
                      {isAdminOrStaff && (
                        <td className="py-3 px-3 align-middle text-right whitespace-nowrap">
                          {record.status === 'RETURNED' ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                              Returned
                            </span>
                          ) : (() => {
                            const isOverdue = record.status === 'OVERDUE' || (record.status === 'ISSUED' && new Date(record.dueDate).getTime() < Date.now());
                            const daysUntilDue = Math.ceil((new Date(record.dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                            const isDueSoon = !isOverdue && daysUntilDue <= 3;
                            const member = storeState.members.find((m) => m.id === record.memberId || m.memberCardNo === record.memberCardNo);

                            return (
                              <button
                                type="button"
                                onClick={() => {
                                  setNotificationModalData({
                                    member: {
                                      id: record.memberId,
                                      name: record.memberName,
                                      email: member?.email,
                                      memberCardNo: record.memberCardNo,
                                      role: record.memberType || member?.role || 'STUDENT',
                                    },
                                    context: {
                                      type: isOverdue ? 'OVERDUE' : daysUntilDue <= 1 ? 'LAST_DAY' : 'DUE_SOON',
                                      bookTitle: record.bookTitle,
                                      accessionNo: record.accessionNo,
                                      barcode: record.barcode,
                                      dueDate: record.dueDate,
                                      fineAmount: record.fineAmount || 25,
                                      daysOverdue: isOverdue ? Math.abs(daysUntilDue) : undefined,
                                    },
                                  });
                                }}
                                className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer shadow-2xs inline-flex items-center gap-1.5 font-bold text-[11px] ${
                                  isOverdue
                                    ? 'bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white border border-rose-200 animate-pulse'
                                    : isDueSoon
                                    ? 'bg-amber-50 hover:bg-amber-600 text-amber-800 hover:text-white border border-amber-300'
                                    : 'bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white border border-blue-200'
                                }`}
                                title={
                                  isOverdue
                                    ? 'Send Urgent Overdue Warning & Fine Alert'
                                    : isDueSoon
                                    ? 'Send Last Day / Due Soon Return Reminder'
                                    : 'Send Book Due Date Notice'
                                }
                              >
                                <Bell className="w-3.5 h-3.5" />
                                <span>
                                  {isOverdue
                                    ? 'Overdue Alert'
                                    : isDueSoon
                                    ? 'Last Day Remind'
                                    : 'Remind'}
                                </span>
                              </button>
                            );
                          })()}
                        </td>
                      )}
                    </tr>
                  );
                })}

                {filteredRecords.length === 0 && (
                  <tr>
                    <td colSpan={isAdminOrStaff ? 9 : 8} className="py-16 text-center text-slate-400 font-medium space-y-2">
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

      {/* Export CSV Filter Modal */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col border border-slate-100 relative overflow-hidden">
            {/* Modal Fixed Header */}
            <div className="flex items-center justify-between border-b border-slate-100 p-5 shrink-0 bg-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center font-bold shrink-0">
                  <FileSpreadsheet className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 font-poppins">Export Book Borrow CSV Report</h2>
                  <p className="text-xs text-slate-500">Filter borrowing records by dates, books, roles, and status.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowExportModal(false)}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                title="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-5 space-y-4 overflow-y-auto flex-1 custom-scrollbar">
              {/* Quick Presets */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Quick Date Presets</label>
                <div className="grid grid-cols-5 gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      const today = getLocalDateStr(new Date());
                      setExportStartDate(today);
                      setExportEndDate(today);
                    }}
                    className="px-2 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 border border-slate-200/70 text-center transition-colors cursor-pointer"
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const d = new Date();
                      d.setDate(d.getDate() - 6);
                      setExportStartDate(getLocalDateStr(d));
                      setExportEndDate(getLocalDateStr(new Date()));
                    }}
                    className="px-2 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 border border-slate-200/70 text-center transition-colors cursor-pointer"
                  >
                    7 Days
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const d = new Date();
                      d.setDate(d.getDate() - 29);
                      setExportStartDate(getLocalDateStr(d));
                      setExportEndDate(getLocalDateStr(new Date()));
                    }}
                    className="px-2 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 border border-slate-200/70 text-center transition-colors cursor-pointer"
                  >
                    30 Days
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const d = new Date();
                      d.setDate(1);
                      setExportStartDate(getLocalDateStr(d));
                      setExportEndDate(getLocalDateStr(new Date()));
                    }}
                    className="px-2 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 border border-slate-200/70 text-center transition-colors cursor-pointer"
                  >
                    Month
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setExportStartDate('');
                      setExportEndDate('');
                    }}
                    className="px-2 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 border border-slate-200/70 text-center transition-colors cursor-pointer"
                  >
                    All Time
                  </button>
                </div>
              </div>

              {/* Custom Date Range Controls */}
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200/80">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                    <Calendar className="h-3 w-3 text-blue-600" /> Start Date
                  </label>
                  <input
                    type="date"
                    value={exportStartDate}
                    onChange={(e) => setExportStartDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                    <Calendar className="h-3 w-3 text-indigo-600" /> End Date
                  </label>
                  <input
                    type="date"
                    value={exportEndDate}
                    onChange={(e) => setExportEndDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              {/* Multi-Select Book Selection */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <BookOpen className="h-3.5 w-3.5 text-purple-600" /> Select Books:
                    <span className="text-purple-700 font-semibold">
                      {selectedExportBookIds.length === 0 ? 'All Books' : `${selectedExportBookIds.length} Selected`}
                    </span>
                  </label>
                  <div className="flex items-center gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setSelectedExportBookIds(storeState.books.map((b) => b.id))}
                      className="text-[11px] font-bold text-purple-700 hover:text-purple-900 cursor-pointer"
                    >
                      Select All
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                      type="button"
                      onClick={() => setSelectedExportBookIds([])}
                      className="text-[11px] font-bold text-slate-500 hover:text-slate-700 cursor-pointer"
                    >
                      Reset
                    </button>
                  </div>
                </div>

                {/* Searchable Checkbox Container */}
                <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-200/90 space-y-2">
                  <div className="relative">
                    <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Filter books by title or author..."
                      value={modalBookSearch}
                      onChange={(e) => setModalBookSearch(e.target.value)}
                      className="w-full pl-8 pr-8 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                    />
                    {modalBookSearch && (
                      <button
                        type="button"
                        onClick={() => setModalBookSearch('')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs p-1"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>

                  <div className="max-h-36 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                    {storeState.books
                      .filter((b) =>
                        !modalBookSearch ||
                        b.title.toLowerCase().includes(modalBookSearch.toLowerCase()) ||
                        (b.authorName && b.authorName.toLowerCase().includes(modalBookSearch.toLowerCase())) ||
                        (b.categoryName && b.categoryName.toLowerCase().includes(modalBookSearch.toLowerCase()))
                      )
                      .map((book) => {
                        const isChecked = selectedExportBookIds.includes(book.id);
                        return (
                          <label
                            key={book.id}
                            className={`flex items-center gap-2.5 p-2 rounded-xl border transition-all cursor-pointer ${
                              isChecked
                                ? 'bg-purple-50 border-purple-300 text-purple-950 shadow-2xs'
                                : 'bg-white border-slate-200/70 hover:bg-slate-100/70 text-slate-700'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {
                                if (isChecked) {
                                  setSelectedExportBookIds(selectedExportBookIds.filter((id) => id !== book.id));
                                } else {
                                  setSelectedExportBookIds([...selectedExportBookIds, book.id]);
                                }
                              }}
                              className="w-3.5 h-3.5 rounded text-purple-600 focus:ring-purple-500 cursor-pointer accent-purple-600 shrink-0"
                            />
                            <div className="min-w-0 flex-1">
                              <p className={`text-xs truncate ${isChecked ? 'font-bold text-purple-950' : 'font-semibold text-slate-900'}`}>
                                {book.title}
                              </p>
                              <p className="text-[10px] text-slate-500 truncate">
                                {book.authorName ? `By ${book.authorName}` : ''} {book.categoryName ? `• ${book.categoryName}` : ''}
                              </p>
                            </div>
                          </label>
                        );
                      })}

                    {storeState.books.filter((b) =>
                      !modalBookSearch ||
                      b.title.toLowerCase().includes(modalBookSearch.toLowerCase()) ||
                      (b.authorName && b.authorName.toLowerCase().includes(modalBookSearch.toLowerCase())) ||
                      (b.categoryName && b.categoryName.toLowerCase().includes(modalBookSearch.toLowerCase()))
                    ).length === 0 && (
                      <div className="py-3 text-center text-xs text-slate-400">
                        No books match "{modalBookSearch}"
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Additional Filter Selectors */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Member Role</label>
                  <select
                    value={exportRoleFilter}
                    onChange={(e) => setExportRoleFilter(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="ALL">All Roles</option>
                    <option value="STUDENT">Student</option>
                    <option value="FACULTY">Faculty</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Borrow Status</label>
                  <select
                    value={exportStatusFilter}
                    onChange={(e) => setExportStatusFilter(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="CURRENT">Currently Borrowed</option>
                    <option value="RETURNED">Returned Records</option>
                    <option value="OVERDUE">Overdue Records</option>
                    <option value="LOST">Lost Records</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Modal Fixed Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/70 shrink-0 flex items-center justify-between">
              <div className="text-xs font-semibold text-slate-600">
                Found: <strong className="text-blue-700 font-bold">{exportRecordsInRange.length}</strong> records
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowExportModal(false)}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleExecuteCustomExport}
                  disabled={exportRecordsInRange.length === 0}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white font-bold text-xs hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-blue-200 transition-all cursor-pointer"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Download CSV ({exportRecordsInRange.length})</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Admin Send Notification Modal */}
      {notificationModalData && (
        <SendNotificationModal
          isOpen={!!notificationModalData}
          onClose={() => setNotificationModalData(null)}
          mode="BORROW_HISTORY"
          initialMember={notificationModalData.member}
          initialContext={notificationModalData.context}
          onSuccess={triggerToast}
        />
      )}
    </div>
  );
}
