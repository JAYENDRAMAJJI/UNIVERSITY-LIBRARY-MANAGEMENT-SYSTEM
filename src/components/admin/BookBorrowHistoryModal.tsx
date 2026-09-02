import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  X,
  Search,
  Filter,
  Download,
  Printer,
  FileSpreadsheet,
  FileText,
  BookOpen,
  History,
  Calendar,
  User,
  Clock,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Loader2,
  Info,
  MapPin,
  Tag,
  Barcode,
} from 'lucide-react';
import { libraryStore, getLocalDateStr, formatOnlyTimeInBracket, getTransactionFineAmount } from '../../services/libraryStore.service';
import { exportStyledExcelFile } from '../../utils/excelExport';
import { Book, IssueTransaction } from '../../types/library';

interface BookBorrowHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialBookId?: string;
}

export default function BookBorrowHistoryModal({
  isOpen,
  onClose,
  initialBookId,
}: BookBorrowHistoryModalProps) {
  const [storeState, setStoreState] = useState(libraryStore.snapshot);
  const [selectedBookId, setSelectedBookId] = useState<string>(initialBookId || '');
  const [searchTerm, setSearchTerm] = useState('');
  const [nameSearchTerm, setNameSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'CURRENT' | 'RETURNED' | 'OVERDUE' | 'LOST'>('ALL');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'STUDENT' | 'FACULTY'>('ALL');
  const [startDate, setStartDate] = useState('');

  // Searchable Book Select State in Modal
  const [isBookSelectOpen, setIsBookSelectOpen] = useState(false);
  const [bookSelectSearchTerm, setBookSelectSearchTerm] = useState('');
  const bookSelectRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (bookSelectRef.current && !bookSelectRef.current.contains(event.target as Node)) {
        setIsBookSelectOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  const [endDate, setEndDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const sub = libraryStore.getObservable().subscribe(setStoreState);
    return () => sub.unsubscribe();
  }, []);

  useEffect(() => {
    if (initialBookId) {
      setSelectedBookId(initialBookId);
    } else if (storeState.books.length > 0 && !selectedBookId) {
      setSelectedBookId(storeState.books[0].id);
    }
  }, [initialBookId, storeState.books]);

  // Handle Book switch with loading state
  const handleBookChange = (bookId: string) => {
    setIsLoading(true);
    setSelectedBookId(bookId);
    setCurrentPage(1);
    setTimeout(() => setIsLoading(false), 300);
  };

  // Selected Book Object
  const currentBook: Book | undefined = useMemo(() => {
    return storeState.books.find((b) => b.id === selectedBookId) || storeState.books[0];
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

  // Get All Transactions for Selected Book
  const bookTransactions: IssueTransaction[] = useMemo(() => {
    if (!currentBook) return [];
    return storeState.transactions.filter((tx) => tx.bookId === currentBook.id);
  }, [storeState.transactions, currentBook]);

  // Statistics for Current Book
  const stats = useMemo(() => {
    if (!currentBook) {
      return {
        totalBorrowCount: 0,
        currentBorrowedCopies: 0,
        availableCopies: 0,
        returnedCount: 0,
        overdueCount: 0,
        lastBorrowDate: '-',
        lastReturnDate: '-',
      };
    }

    const totalBorrowCount = bookTransactions.length;
    const currentBorrowedCopies = bookTransactions.filter(
      (t) => t.status === 'ISSUED' || t.status === 'OVERDUE'
    ).length;
    const availableCopies = currentBook.availableCopies;
    const returnedCount = bookTransactions.filter((t) => t.status === 'RETURNED').length;
    const overdueCount = bookTransactions.filter((t) => t.status === 'OVERDUE').length;

    // Latest Borrow Date
    const sortedByBorrow = [...bookTransactions].sort(
      (a, b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime()
    );
    const lastBorrowDate = sortedByBorrow.length > 0 ? sortedByBorrow[0].issueDate : '-';

    // Latest Return Date
    const returnedTxs = bookTransactions
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
  }, [currentBook, bookTransactions]);

  // Filtered & Sorted Borrow History Records
  const filteredRecords = useMemo(() => {
    return bookTransactions
      .filter((record) => {
        // Search by Book ID, Book Name, User ID, User Name
        const term = searchTerm.toLowerCase().trim();
        const matchesSearch =
          !term ||
          record.bookId.toLowerCase().includes(term) ||
          record.bookTitle.toLowerCase().includes(term) ||
          record.memberId.toLowerCase().includes(term) ||
          record.memberCardNo.toLowerCase().includes(term) ||
          record.memberName.toLowerCase().includes(term) ||
          record.accessionNo.toLowerCase().includes(term) ||
          record.barcode.toLowerCase().includes(term);

        // Dedicated Search by Borrower Name
        const nameTerm = nameSearchTerm.toLowerCase().trim();
        const matchesNameSearch =
          !nameTerm ||
          record.memberName.toLowerCase().includes(nameTerm) ||
          record.memberCardNo.toLowerCase().includes(nameTerm) ||
          (record.issuedByName && record.issuedByName.toLowerCase().includes(nameTerm));

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

        // Date Range Filter (issueDate)
        let matchesDate = true;
        const issueTime = new Date(record.issueDate).getTime();
        if (startDate) {
          const startTime = new Date(startDate).getTime();
          matchesDate = matchesDate && issueTime >= startTime;
        }
        if (endDate) {
          const endTime = new Date(endDate).getTime() + (24 * 60 * 60 * 1000 - 1);
          matchesDate = matchesDate && issueTime <= endTime;
        }

        return matchesSearch && matchesNameSearch && matchesStatus && matchesRole && matchesDate;
      })
      .sort((a, b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime());
  }, [bookTransactions, searchTerm, nameSearchTerm, statusFilter, roleFilter, startDate, endDate]);

  // Reset to page 1 on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, roleFilter, startDate, endDate]);

  // Pagination Logic
  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / pageSize));
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRecords.slice(start, start + pageSize);
  }, [filteredRecords, currentPage, pageSize]);

  // Helper: Calculate Total Borrow Days
  const calculateBorrowDays = (issueDateStr: string, returnDateStr?: string) => {
    const start = new Date(issueDateStr).getTime();
    const end = returnDateStr ? new Date(returnDateStr).getTime() : new Date().getTime();
    const diffTime = Math.max(0, end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Helper: Get department name
  const getMemberDepartment = (record: IssueTransaction) => {
    if (record.memberDepartment) return record.memberDepartment;
    const member = storeState.members.find((m) => m.id === record.memberId || m.memberCardNo === record.memberCardNo);
    return member?.department || 'General Academics';
  };

  // EXPORT TO EXCEL (CSV Format)
  const handleExportExcel = () => {
    if (filteredRecords.length === 0) return;
    const headers = [
      'Transaction ID',
      'Book ID',
      'Book Title',
      'User Card No / ID',
      'User Name',
      'User Role',
      'Department',
      'Copy Accession No',
      'Copy Barcode',
      'Borrow Date & Time',
      'Due Date',
      'Return Date & Time',
      'Total Borrow Days',
      'Fine Amount (INR)',
      'Status',
    ];

    const rows = filteredRecords.map((r) => [
      r.id,
      r.memberCardNo,
      r.memberName || '',
      r.memberType,
      getMemberDepartment(r),
      r.accessionNo,
      r.barcode,
      r.issueDate,
      r.dueDate,
      r.returnDate || 'N/A (Active)',
      calculateBorrowDays(r.issueDate, r.returnDate),
      `₹${(r.fineAmount || 0).toFixed(2)}`,
      r.status,
    ]);

    const bookTitleSlug = (currentBook?.title || 'Book').replace(/[^a-zA-Z0-9]/g, '_').slice(0, 25);
    exportStyledExcelFile({
      filename: `Book_Borrow_History_${bookTitleSlug}_${getLocalDateStr(new Date())}.xlsx`,
      sheetName: 'Book Borrow History',
      headers,
      data: rows,
      themeColor: '6D28D9', // Purple Header
    });
  };

  // EXPORT TO PDF & PRINT REPORT
  const handlePrintOrPdf = (isPdfDownload: boolean = false) => {
    if (!currentBook) return;
    const printWindow = window.open('', '_blank', 'width=1000,height=800');
    if (!printWindow) return;

    const rowsHtml = filteredRecords
      .map(
        (r, idx) => `
      <tr style="border-bottom: 1px solid #e2e8f0; background: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
        <td style="padding: 8px 12px; font-size: 12px; font-weight: 600; color: #1e293b;">${r.memberCardNo}<br/><span style="font-weight: 400; color: #64748b;">${r.memberName}</span></td>
        <td style="padding: 8px 12px; font-size: 12px; color: #334155;"><strong>${r.memberType}</strong><br/><span style="color: #64748b;">${getMemberDepartment(r)}</span></td>
        <td style="padding: 8px 12px; font-size: 12px; font-family: monospace; color: #0284c7;">${r.accessionNo}</td>
        <td style="padding: 8px 12px; font-size: 12px; color: #334155;">${r.issueDate}</td>
        <td style="padding: 8px 12px; font-size: 12px; color: #334155;">${r.dueDate}</td>
        <td style="padding: 8px 12px; font-size: 12px; color: #334155;">${r.returnDate || '<span style="color: #ea580c; font-weight: 600;">Still Borrowed</span>'}</td>
        <td style="padding: 8px 12px; font-size: 12px; font-weight: 600; color: #334155;">${calculateBorrowDays(r.issueDate, r.returnDate)} Days</td>
        <td style="padding: 8px 12px; font-size: 12px; font-weight: 600; color: ${r.fineAmount ? '#dc2626' : '#16a34a'};">₹${(r.fineAmount || 0).toFixed(2)}</td>
        <td style="padding: 8px 12px; font-size: 11px; font-weight: 700;">
          <span style="padding: 3px 8px; border-radius: 9999px; ${
            r.status === 'RETURNED'
              ? 'background: #dcfce7; color: #15803d;'
              : r.status === 'OVERDUE'
              ? 'background: #ffe4e6; color: #be123c;'
              : 'background: #e0f2fe; color: #0369a1;'
          }">${r.status}</span>
        </td>
      </tr>
    `
      )
      .join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Book Borrow History - ${currentBook.title}</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 24px; color: #0f172a; }
            .header { border-bottom: 2px solid #0284c7; padding-bottom: 16px; margin-bottom: 20px; }
            .header h1 { margin: 0; font-size: 22px; color: #0f172a; }
            .header p { margin: 4px 0 0 0; font-size: 13px; color: #64748b; }
            .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 20px; }
            .stat-card { background: #f1f5f9; padding: 10px 14px; border-radius: 8px; border: 1px solid #e2e8f0; }
            .stat-title { font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; }
            .stat-val { font-size: 18px; font-weight: 800; color: #0f172a; margin-top: 2px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th { background: #0f172a; color: #ffffff; text-align: left; padding: 10px 12px; font-size: 11px; font-weight: 700; text-transform: uppercase; }
            .footer { margin-top: 30px; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 10px; display: flex; justify-content: space-between; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>University Central Library - Book Borrow History</h1>
            <p><strong>Book Title:</strong> ${currentBook.title} | <strong>ISBN:</strong> ${currentBook.isbn} | <strong>Author:</strong> ${currentBook.authorName}</p>
            <p><strong>Report Generated:</strong> ${new Date().toLocaleString()}</p>
          </div>

          <div class="stats-grid">
            <div class="stat-card"><div class="stat-title">Total Borrowed</div><div class="stat-val">${stats.totalBorrowCount}</div></div>
            <div class="stat-card"><div class="stat-title">Currently Issued</div><div class="stat-val">${stats.currentBorrowedCopies}</div></div>
            <div class="stat-card"><div class="stat-title">Available Copies</div><div class="stat-val">${stats.availableCopies} / ${currentBook.totalCopies}</div></div>
            <div class="stat-card"><div class="stat-title">Returned Count</div><div class="stat-val">${stats.returnedCount}</div></div>
          </div>

          <table>
            <thead>
              <tr>
                <th>User Details</th>
                <th>Role / Dept</th>
                <th>Accession No</th>
                <th>Borrow Date</th>
                <th>Due Date</th>
                <th>Return Date</th>
                <th>Total Days</th>
                <th>Fine</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml || '<tr><td colspan="9" style="text-align:center; padding: 20px; color: #64748b;">No circulation history records found.</td></tr>'}
            </tbody>
          </table>

          <div class="footer">
            <span>Enterprise Library Management System</span>
            <span>Page 1 of 1</span>
          </div>

          <script>
            window.onload = function() {
              window.print();
              ${isPdfDownload ? 'setTimeout(function() { window.close(); }, 800);' : ''}
            }
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white px-6 py-5 flex items-center justify-between shrink-0 shadow-md">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-500/20 border border-blue-400/30 rounded-2xl">
              <History className="h-6 w-6 text-blue-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold tracking-wider uppercase bg-blue-500/20 text-blue-300 px-2.5 py-0.5 rounded-full border border-blue-400/20">
                  Admin Circulation Telemetry
                </span>
              </div>
              <h2 className="text-xl font-bold font-poppins text-white mt-0.5">Book Borrow History Log</h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
            title="Close Modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Body Container */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50">
          {/* Top Controls Bar: Book Selector & Quick Export Actions */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div className="flex items-center gap-4 w-full lg:w-auto">
              <img
                src={currentBook?.coverUrl || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=400&q=80'}
                alt={currentBook?.title}
                className="w-14 h-18 object-cover rounded-xl border border-slate-200 shadow-xs shrink-0"
              />
              <div className="space-y-1 flex-1 min-w-0">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <BookOpen className="h-3.5 w-3.5 text-blue-600" /> Select Target Catalog Book:
                </label>
                {/* Single Unified Searchable Book Select */}
                <div className="relative" ref={bookSelectRef}>
                  <div
                    onClick={() => setIsBookSelectOpen(!isBookSelectOpen)}
                    className={`w-full px-3.5 py-2 rounded-xl border bg-slate-50 flex items-center justify-between gap-2.5 cursor-pointer transition-all shadow-xs ${
                      isBookSelectOpen ? 'border-blue-600 ring-2 ring-blue-500/20 bg-white' : 'border-slate-300 hover:border-blue-400 hover:bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <Search className="h-4 w-4 text-blue-600 shrink-0" />
                      <input
                        type="text"
                        placeholder={
                          currentBook
                            ? `${currentBook.title} (ISBN: ${currentBook.isbn})`
                            : `Search or select catalog book...`
                        }
                        value={bookSelectSearchTerm}
                        onChange={(e) => {
                          setBookSelectSearchTerm(e.target.value);
                          if (!isBookSelectOpen) setIsBookSelectOpen(true);
                        }}
                        onFocus={() => setIsBookSelectOpen(true)}
                        className="w-full text-xs font-bold text-slate-900 bg-transparent outline-none placeholder:text-slate-800 placeholder:font-bold"
                      />
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {bookSelectSearchTerm && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setBookSelectSearchTerm('');
                          }}
                          className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-md transition-colors"
                          title="Clear search"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                      <ChevronDown
                        className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${
                          isBookSelectOpen ? 'rotate-180 text-blue-600' : ''
                        }`}
                      />
                    </div>
                  </div>

                  {/* Dropdown Menu */}
                  {isBookSelectOpen && (
                    <div className="absolute left-0 right-0 top-full mt-1.5 bg-white rounded-xl shadow-xl border border-slate-200 z-30 max-h-60 overflow-y-auto divide-y divide-slate-100 animate-fadeIn">
                      {filteredBookOptions.length > 0 ? (
                        filteredBookOptions.map((b) => {
                          const isSelected = selectedBookId === b.id;
                          return (
                            <div
                              key={b.id}
                              onClick={() => {
                                handleBookChange(b.id);
                                setBookSelectSearchTerm('');
                                setIsBookSelectOpen(false);
                              }}
                              className={`p-3 cursor-pointer flex items-center justify-between transition-colors ${
                                isSelected ? 'bg-blue-50/80 text-blue-900 font-semibold' : 'hover:bg-slate-50 text-slate-800'
                              }`}
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <img
                                  src={b.coverUrl}
                                  alt={b.title}
                                  className="w-7 h-9 object-cover rounded border border-blue-100 shrink-0 shadow-xs"
                                />
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-slate-900 truncate">{b.title}</span>
                                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 shrink-0">
                                      ISBN: {b.isbn}
                                    </span>
                                  </div>
                                  <div className="text-[11px] text-slate-500 truncate mt-0.5">
                                    by {b.authorName} &bull; <span className="font-semibold text-emerald-700">{b.availableCopies}/{b.totalCopies} Available</span>
                                  </div>
                                </div>
                              </div>
                              {isSelected && <CheckCircle2 className="h-4 w-4 text-blue-600 shrink-0 ml-2" />}
                            </div>
                          );
                        })
                      ) : (
                        <div className="p-4 text-center text-xs text-slate-400">
                          No books found matching &quot;{bookSelectSearchTerm}&quot;
                        </div>
                      )}
                    </div>
                  )}
                </div>
                {currentBook && (
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 pt-0.5">
                    <span><strong>Author:</strong> {currentBook.authorName}</span>
                    <span><strong>Category:</strong> {currentBook.categoryName}</span>
                    <span><strong>Location:</strong> {currentBook.rackNumber || 'RACK-01'} | {currentBook.shelfNumber || 'SHELF-A'}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Export & Action Buttons */}
            <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-end">
              <button
                onClick={handleExportExcel}
                className="px-3.5 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer"
                title="Export to Excel Spreadsheet (.csv)"
              >
                <FileSpreadsheet className="h-4 w-4" /> Excel (.csv)
              </button>
              <button
                onClick={() => handlePrintOrPdf(true)}
                className="px-3.5 py-2 bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer"
                title="Export as PDF Document"
              >
                <FileText className="h-4 w-4" /> Export PDF
              </button>
              <button
                onClick={() => handlePrintOrPdf(false)}
                className="px-3.5 py-2 bg-slate-900 text-white hover:bg-slate-800 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-xs"
                title="Print Borrow History Report"
              >
                <Printer className="h-4 w-4" /> Print
              </button>
            </div>
          </div>

          {/* Book Statistics Dashboard Header */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Borrows</span>
              <span className="text-2xl font-extrabold text-slate-900 mt-1">{stats.totalBorrowCount}</span>
              <span className="text-[10px] text-slate-500 font-medium">All Time</span>
            </div>

            <div className="bg-white p-3.5 rounded-2xl border border-blue-200 bg-blue-50/20 shadow-xs flex flex-col justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700">Currently Issued</span>
              <span className="text-2xl font-extrabold text-blue-900 mt-1">{stats.currentBorrowedCopies}</span>
              <span className="text-[10px] text-blue-600 font-medium">Active Borrowed Books</span>
            </div>

            <div className="bg-white p-3.5 rounded-2xl border border-emerald-200 bg-emerald-50/20 shadow-xs flex flex-col justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Available Stock</span>
              <span className="text-2xl font-extrabold text-emerald-900 mt-1">{stats.availableCopies}</span>
              <span className="text-[10px] text-emerald-600 font-medium">Out of {currentBook?.totalCopies || 0}</span>
            </div>

            <div className="bg-white p-3.5 rounded-2xl border border-teal-200 bg-teal-50/20 shadow-xs flex flex-col justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700">Returned Count</span>
              <span className="text-2xl font-extrabold text-teal-900 mt-1">{stats.returnedCount}</span>
              <span className="text-[10px] text-teal-600 font-medium">Completed</span>
            </div>

            <div className="bg-white p-3.5 rounded-2xl border border-rose-200 bg-rose-50/20 shadow-xs flex flex-col justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700">Overdue Loans</span>
              <span className="text-2xl font-extrabold text-rose-900 mt-1">{stats.overdueCount}</span>
              <span className="text-[10px] text-rose-600 font-medium">Action Needed</span>
            </div>

            <div className="bg-white p-3.5 rounded-2xl border border-indigo-200 bg-indigo-50/20 shadow-xs flex flex-col justify-between col-span-2 sm:col-span-2 lg:col-span-2">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700">Activity Timestamps</span>
                <Clock className="h-3.5 w-3.5 text-indigo-500" />
              </div>
              <div className="space-y-0.5 mt-1">
                <p className="text-[11px] text-indigo-950 font-medium flex justify-between">
                  <span>Last Borrowed:</span>
                  <strong className="font-mono text-indigo-700">{stats.lastBorrowDate}</strong>
                </p>
                <p className="text-[11px] text-indigo-950 font-medium flex justify-between">
                  <span>Last Returned:</span>
                  <strong className="font-mono text-indigo-700">{stats.lastReturnDate}</strong>
                </p>
              </div>
            </div>
          </div>          {/* Search, Filter & Date Controls */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
              {/* Single Combined Unified Search Bar */}
              <div className="lg:col-span-7 relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by Book Name, Borrower Name, Book ID, Member ID, Card No, Barcode..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all placeholder:text-slate-400"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                  >
                    &times;
                  </button>
                )}
              </div>

              {/* Status Filter */}
              <div className="lg:col-span-3">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
                >
                  <option value="ALL">All Statuses ({bookTransactions.length})</option>
                  <option value="CURRENT">Current Borrowers ({stats.currentBorrowedCopies})</option>
                  <option value="RETURNED">Returned Records ({stats.returnedCount})</option>
                  <option value="OVERDUE">Overdue Records ({stats.overdueCount})</option>
                  <option value="LOST">Lost Records</option>
                </select>
              </div>

              {/* Reset Filters */}
              <div className="lg:col-span-2 flex items-center">
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm('');
                    setNameSearchTerm('');
                    setStatusFilter('ALL');
                    setRoleFilter('ALL');
                    setStartDate('');
                    setEndDate('');
                  }}
                  className="w-full px-3 py-2 bg-slate-100 text-slate-700 hover:bg-rose-50 hover:text-rose-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <RotateCcw className="h-3.5 w-3.5" /> Reset Filters
                </button>
              </div>
            </div>

            {/* Date Range Row */}
            <div className="flex flex-wrap items-center gap-3 pt-1 border-t border-slate-100 text-xs">
              <span className="font-bold text-slate-500 flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 text-blue-600" /> Borrow Date Range:
              </span>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-mono text-slate-800 text-xs focus:ring-2 focus:ring-blue-500/20"
                />
                <span className="text-slate-400 font-semibold">to</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-mono text-slate-800 text-xs focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div className="ml-auto text-slate-500 font-medium">
                Showing <strong className="text-slate-900">{filteredRecords.length}</strong> matching transaction history records
              </div>
            </div>
          </div>

          {/* Borrow History Data Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden relative">
            {isLoading && (
              <div className="absolute inset-0 bg-white/75 backdrop-blur-xs z-20 flex items-center justify-center gap-2 text-blue-700 font-bold text-sm">
                <Loader2 className="h-5 w-5 animate-spin" /> Loading Book Borrow History...
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-900 text-white text-[11px] font-bold uppercase tracking-wider">
                    <th className="py-3.5 px-4">Borrower User Details</th>
                    <th className="py-3.5 px-4">Role & Department</th>
                    <th className="py-3.5 px-4">Book Copy ID</th>
                    <th className="py-3.5 px-4">Borrow Date & Time</th>
                    <th className="py-3.5 px-4">Due Date</th>
                    <th className="py-3.5 px-4">Return Date & Time</th>
                    <th className="py-3.5 px-4">Borrow Days</th>
                    <th className="py-3.5 px-4">Fine Amount</th>
                    <th className="py-3.5 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {paginatedRecords.map((tx) => {
                    const borrowDays = calculateBorrowDays(tx.issueDate, tx.returnDate);
                    const department = getMemberDepartment(tx);

                    return (
                      <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors">
                        {/* Borrower User Details */}
                        <td className="py-3.5 px-4">
                          <div>
                            <p className="font-bold text-slate-900 flex items-center gap-1.5">
                              <User className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                              {tx.memberName}
                            </p>
                            <p className="text-[11px] font-mono text-slate-500 mt-0.5">
                              ID / Card: <span className="font-semibold text-slate-700">{tx.memberCardNo || tx.memberId}</span>
                            </p>
                          </div>
                        </td>

                        {/* Role & Department */}
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                              tx.memberType === 'FACULTY'
                                ? 'bg-purple-100 text-purple-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {tx.memberType}
                          </span>
                          <p className="text-slate-600 font-medium mt-1 text-[11px]">{department}</p>
                        </td>

                        {/* Book Copy ID */}
                        <td className="py-3.5 px-4">
                          <div className="font-mono">
                            <span className="font-bold text-slate-800 block text-xs">{tx.accessionNo}</span>
                            <span className="text-[10px] text-slate-400 block">{tx.barcode}</span>
                          </div>
                        </td>

                        {/* Borrow Date & Time */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <p className="font-semibold text-slate-900 font-mono">{formatOnlyTimeInBracket(tx.issueDate)}</p>
                          <span className="text-[10px] text-slate-400">By: {tx.issuedByName || 'Admin'}</span>
                        </td>

                        {/* Due Date */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <p className="font-semibold text-slate-800 font-mono">{formatOnlyTimeInBracket(tx.dueDate)}</p>
                        </td>

                        {/* Return Date & Time */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {tx.returnDate ? (
                            <p className="font-semibold text-emerald-800 font-mono">{formatOnlyTimeInBracket(tx.returnDate)}</p>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-50 text-amber-700 text-[10px] font-bold border border-amber-200">
                              <Clock className="h-3 w-3" /> Still Borrowed
                            </span>
                          )}
                        </td>

                        {/* Borrow Days */}
                        <td className="py-3.5 px-4">
                          <span className="font-bold text-slate-800 bg-slate-100 px-2 py-1 rounded text-[11px]">
                            {borrowDays} Days
                          </span>
                        </td>

                        {/* Fine Amount & Status */}
                        <td className="py-3.5 px-4 font-mono font-bold">
                          {(() => {
                            const fineInfo = getTransactionFineAmount(tx, storeState);
                            if (fineInfo.fineAmount <= 0) {
                              return <span className="text-slate-400 font-medium">₹0.00</span>;
                            }
                            if (fineInfo.fineStatus === 'PAID') {
                              return (
                                <div className="inline-flex flex-col">
                                  <span className="text-emerald-700 font-bold">₹{fineInfo.fineAmount.toFixed(2)}</span>
                                  <span className="text-[9px] font-extrabold uppercase text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200/60 mt-0.5">
                                    ✓ PAID
                                  </span>
                                </div>
                              );
                            }
                            if (fineInfo.fineStatus === 'WAIVED') {
                              return (
                                <div className="inline-flex flex-col">
                                  <span className="text-purple-700 font-bold line-through">₹{fineInfo.fineAmount.toFixed(2)}</span>
                                  <span className="text-[9px] font-extrabold uppercase text-purple-700 bg-purple-50 px-1.5 py-0.2 rounded border border-purple-200/60 mt-0.5">
                                    WAIVED
                                  </span>
                                </div>
                              );
                            }
                            return (
                              <div className="inline-flex flex-col">
                                <span className="text-rose-700 font-black">₹{fineInfo.fineAmount.toFixed(2)}</span>
                                <span className="text-[9px] font-extrabold uppercase text-rose-700 bg-rose-50 px-1.5 py-0.2 rounded border border-rose-200/60 mt-0.5">
                                  UNPAID
                                </span>
                              </div>
                            );
                          })()}
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4 text-center">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase border whitespace-nowrap ${
                              tx.status === 'RETURNED'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : tx.status === 'OVERDUE'
                                ? 'bg-rose-50 text-rose-700 border-rose-200'
                                : tx.status === 'LOST'
                                ? 'bg-amber-50 text-amber-800 border-amber-200'
                                : 'bg-blue-50 text-blue-700 border-blue-200'
                            }`}
                          >
                            {tx.status === 'RETURNED' && <CheckCircle2 className="h-3 w-3" />}
                            {tx.status === 'OVERDUE' && <AlertCircle className="h-3 w-3" />}
                            {tx.status === 'ISSUED' && <Clock className="h-3 w-3" />}
                            {tx.status === 'ISSUED' ? 'Borrowed' : tx.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}

                  {paginatedRecords.length === 0 && (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-500 space-y-2">
                        <Info className="h-8 w-8 text-slate-300 mx-auto" />
                        <p className="font-semibold text-slate-700 text-sm">No borrow history records found matching your filters.</p>
                        <p className="text-xs text-slate-400">Try clearing your search query or expanding date range filters.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls Footer */}
            <div className="bg-slate-50 p-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                <span>Rows per page:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800"
                >
                  <option value={5}>5 records</option>
                  <option value={10}>10 records</option>
                  <option value={20}>20 records</option>
                </select>
                <span className="text-slate-400">|</span>
                <span>
                  Showing {filteredRecords.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} -{' '}
                  {Math.min(currentPage * pageSize, filteredRecords.length)} of {filteredRecords.length}
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-1 cursor-pointer"
                >
                  <ChevronLeft className="h-4 w-4" /> Previous
                </button>

                <div className="flex items-center gap-1 px-2">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`h-7 w-7 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                        page === currentPage
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                </div>

                <button
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-1 cursor-pointer"
                >
                  Next <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
