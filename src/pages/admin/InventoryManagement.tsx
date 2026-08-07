import { useState, useEffect, useMemo, useRef } from 'react';
import {
  Layers,
  CheckCircle,
  CheckCircle2,
  AlertTriangle,
  MapPin,
  Search,
  BookOpen,
  Barcode,
  ChevronDown,
  ChevronUp,
  Tag,
  Filter,
  X,
} from 'lucide-react';
import { libraryStore } from '../../services/libraryStore.service';
import { Book, BookCopy, CopyCondition, BookStatus } from '../../types/library';

export default function InventoryManagement() {
  const [state, setState] = useState(libraryStore.snapshot);
  const [viewMode, setViewMode] = useState<'BOOK_WISE' | 'ALL_COPIES'>('BOOK_WISE');
  const [selectedBookId, setSelectedBookId] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCondition, setFilterCondition] = useState('ALL');
  const [expandedBookId, setExpandedBookId] = useState<string | null>(null);
  const [selectedCopy, setSelectedCopy] = useState<BookCopy | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Searchable Book Select State
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

  useEffect(() => {
    const sub = libraryStore.getObservable().subscribe(setState);
    return () => sub.unsubscribe();
  }, []);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Flatten all copies across all books
  const allCopies: (BookCopy & { bookTitle: string; isbn: string; bookId: string; isReferenceOnly: boolean; collectionType?: string })[] = [];
  state.books.forEach((book) => {
    const isRef = book.isReferenceOnly || book.collectionType === 'REFERENCE';
    book.copies?.forEach((copy) => {
      allCopies.push({
        ...copy,
        bookTitle: book.title,
        isbn: book.isbn,
        bookId: book.id,
        isReferenceOnly: isRef || copy.isReferenceOnly || false,
        collectionType: book.collectionType,
      });
    });
  });

  // Calculate summary metrics
  const totalCopies = allCopies.length;
  const availableCopies = allCopies.filter((c) => c.status === 'AVAILABLE' && !c.isReferenceOnly && c.collectionType !== 'REFERENCE').length;
  const referenceCopies = allCopies.filter((c) => c.isReferenceOnly || c.collectionType === 'REFERENCE').length;
  const issuedCopies = allCopies.filter((c) => c.status === 'ISSUED').length;
  const damagedCopies = allCopies.filter((c) => c.condition === 'DAMAGED').length;
  const lostCopies = allCopies.filter((c) => c.condition === 'LOST').length;

  // Filter books for Book-Wise View
  const selectedBook = useMemo(() => {
    if (!selectedBookId || selectedBookId === 'ALL') return undefined;
    return state.books.find((b) => b.id === selectedBookId);
  }, [state.books, selectedBookId]);

  const filteredBookOptions = useMemo(() => {
    const term = bookSelectSearchTerm.toLowerCase().trim();
    if (!term) return state.books;
    return state.books.filter(
      (b) =>
        b.title.toLowerCase().includes(term) ||
        b.isbn.toLowerCase().includes(term) ||
        b.authorName.toLowerCase().includes(term) ||
        b.categoryName.toLowerCase().includes(term)
    );
  }, [state.books, bookSelectSearchTerm]);

  const filteredBooks = state.books.filter((book) => {
    if (selectedBookId !== 'ALL' && book.id !== selectedBookId) return false;

    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase().trim();

    const matchesTitle = book.title.toLowerCase().includes(q);
    const matchesIsbn = book.isbn.toLowerCase().includes(q);
    const matchesAuthor = book.authorName.toLowerCase().includes(q);
    const matchesCategory = book.categoryName?.toLowerCase().includes(q) || false;
    const matchesRack = book.rackNumber?.toLowerCase().includes(q) || false;
    const matchesShelf = book.shelfNumber?.toLowerCase().includes(q) || false;

    const matchesCopies = (book.copies || []).some(
      (c) =>
        c.accessionNo.toLowerCase().includes(q) ||
        c.barcode.toLowerCase().includes(q) ||
        c.status.toLowerCase().includes(q) ||
        c.condition.toLowerCase().includes(q)
    );

    return matchesTitle || matchesIsbn || matchesAuthor || matchesCategory || matchesRack || matchesShelf || matchesCopies;
  });

  // Filter copies for Flat View
  const filteredCopies = allCopies.filter((c) => {
    if (selectedBookId !== 'ALL' && c.bookId !== selectedBookId) return false;

    const q = searchTerm.toLowerCase().trim();
    const matchesSearch =
      !q ||
      c.accessionNo.toLowerCase().includes(q) ||
      c.barcode.toLowerCase().includes(q) ||
      c.bookTitle.toLowerCase().includes(q) ||
      c.isbn.toLowerCase().includes(q);

    let matchesCondition = true;
    if (filterCondition === 'REFERENCE') matchesCondition = c.isReferenceOnly || c.collectionType === 'REFERENCE';
    else if (filterCondition !== 'ALL') matchesCondition = c.condition === filterCondition;

    return matchesSearch && matchesCondition;
  });

  const handleUpdateCondition = (copyId: string, newCondition: CopyCondition, newStatus?: BookStatus) => {
    libraryStore.updateCopyCondition(copyId, newCondition, newStatus);
    setSelectedCopy(null);
    triggerToast(`Inventory copy updated to condition: ${newCondition}`);
  };

  const toggleExpandBook = (bookId: string) => {
    setExpandedBookId((prev) => (prev === bookId ? null : bookId));
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full mb-2">
            <Layers className="h-3.5 w-3.5" /> Physical Inventory & Location Tracking
          </div>
          <h1 className="text-2xl font-bold font-poppins text-slate-900">Inventory & Shelf Allocation</h1>
          <p className="text-sm text-slate-500 mt-1">Book-wise copy breakdown, rack & shelf allocations, and physical condition tracking.</p>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200 text-xs font-bold shrink-0">
          <button
            onClick={() => setViewMode('BOOK_WISE')}
            className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
              viewMode === 'BOOK_WISE'
                ? 'bg-white text-indigo-900 shadow-sm border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BookOpen className="w-4 h-4 text-indigo-600" />
            <span>Book-Wise Inventory</span>
          </button>

          <button
            onClick={() => setViewMode('ALL_COPIES')}
            className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
              viewMode === 'ALL_COPIES'
                ? 'bg-white text-indigo-900 shadow-sm border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Barcode className="w-4 h-4 text-indigo-600" />
            <span>All Accession Copies ({allCopies.length})</span>
          </button>
        </div>
      </div>

      {toastMessage && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-medium animate-fadeIn">
          <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1.5">
          <p className="text-xs sm:text-sm font-extrabold uppercase tracking-wide text-slate-600">Total Copies</p>
          <p className="text-2xl sm:text-3xl font-black font-poppins text-slate-900">{totalCopies}</p>
        </div>
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-emerald-200 bg-emerald-50/20 shadow-xs space-y-1.5">
          <p className="text-xs sm:text-sm font-extrabold uppercase tracking-wide text-emerald-800">Issuable On Shelf</p>
          <p className="text-2xl sm:text-3xl font-black font-poppins text-emerald-900">{availableCopies}</p>
        </div>
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-rose-200 bg-rose-50/20 shadow-xs space-y-1.5">
          <p className="text-xs sm:text-sm font-extrabold uppercase tracking-wide text-rose-800">🚫 Reference Copies</p>
          <p className="text-2xl sm:text-3xl font-black font-poppins text-rose-900">{referenceCopies}</p>
          <p className="text-[10px] font-bold text-rose-700">Reading Room Only</p>
        </div>
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-blue-200 bg-blue-50/20 shadow-xs space-y-1.5">
          <p className="text-xs sm:text-sm font-extrabold uppercase tracking-wide text-blue-800">On Active Loan</p>
          <p className="text-2xl sm:text-3xl font-black font-poppins text-blue-900">{issuedCopies}</p>
        </div>
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-amber-200 bg-amber-50/20 shadow-xs space-y-1.5">
          <p className="text-xs sm:text-sm font-extrabold uppercase tracking-wide text-amber-800">Damaged Copies</p>
          <p className="text-2xl sm:text-3xl font-black font-poppins text-amber-900">{damagedCopies}</p>
        </div>
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 bg-slate-100/50 shadow-xs space-y-1.5">
          <p className="text-xs sm:text-sm font-extrabold uppercase tracking-wide text-slate-700">Lost Copies</p>
          <p className="text-2xl sm:text-3xl font-black font-poppins text-slate-800">{lostCopies}</p>
        </div>
      </div>

      {/* Unified Search & Book Selector Toolbar */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        {/* Single Integrated Search & Book Selector Bar */}
        <div className="space-y-1">
          <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
            Search Inventory & Filter Catalog:
          </label>
          <div className="relative" ref={bookSelectRef}>
            <div
              className={`w-full px-4 py-3 rounded-2xl border bg-white flex items-center justify-between gap-3 transition-all shadow-xs ${
                isBookSelectOpen ? 'border-indigo-500 ring-2 ring-indigo-500/20' : 'border-slate-200 hover:border-indigo-300'
              }`}
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <Search className="h-4.5 w-4.5 text-indigo-600 shrink-0" />
                <input
                  type="text"
                  placeholder={
                    selectedBook
                      ? `Filter: ${selectedBook.title} (ISBN: ${selectedBook.isbn}) — Type to search copies...`
                      : `Search inventory by Accession No, Barcode, Book Title, ISBN, Author, Shelf/Rack...`
                  }
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setBookSelectSearchTerm(e.target.value);
                  }}
                  onFocus={() => setIsBookSelectOpen(true)}
                  className="w-full text-xs sm:text-sm font-semibold text-slate-900 bg-transparent outline-none placeholder:text-slate-400"
                />
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {(selectedBookId !== 'ALL' || searchTerm) && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedBookId('ALL');
                      setSearchTerm('');
                      setBookSelectSearchTerm('');
                    }}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
                    title="Reset all filters"
                  >
                    <X className="h-3.5 w-3.5" /> Clear Filter
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsBookSelectOpen(!isBookSelectOpen)}
                  className="p-1 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-indigo-50 transition-colors cursor-pointer"
                  title="Select Book Catalog Record"
                >
                  <ChevronDown
                    className={`h-4 w-4 transition-transform duration-200 ${
                      isBookSelectOpen ? 'rotate-180 text-indigo-600' : ''
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Dropdown Options */}
            {isBookSelectOpen && (
              <div className="absolute left-0 right-0 top-full mt-1.5 bg-white rounded-2xl shadow-xl border border-slate-200 z-30 max-h-64 overflow-y-auto divide-y divide-slate-100 animate-fadeIn">
                <div
                  onClick={() => {
                    setSelectedBookId('ALL');
                    setIsBookSelectOpen(false);
                  }}
                  className={`p-3.5 cursor-pointer flex items-center justify-between transition-colors ${
                    selectedBookId === 'ALL' ? 'bg-indigo-50/80 text-indigo-900 font-extrabold' : 'hover:bg-slate-50 text-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs shrink-0">
                      📚
                    </div>
                    <div>
                      <p className="text-xs font-extrabold text-slate-900">All Books (Complete Library Catalog Inventory)</p>
                      <p className="text-[11px] text-slate-500">View inventory items across all cataloged books</p>
                    </div>
                  </div>
                  {selectedBookId === 'ALL' && <CheckCircle2 className="h-4 w-4 text-indigo-600 shrink-0 ml-2" />}
                </div>

                {filteredBookOptions.length > 0 ? (
                  filteredBookOptions.map((b) => {
                    const isSelected = selectedBookId === b.id;
                    return (
                      <div
                        key={b.id}
                        onClick={() => {
                          setSelectedBookId(b.id);
                          setIsBookSelectOpen(false);
                        }}
                        className={`p-3.5 cursor-pointer flex items-center justify-between transition-colors ${
                          isSelected ? 'bg-indigo-50/80 text-indigo-900 font-semibold' : 'hover:bg-slate-50 text-slate-800'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <img
                            src={b.coverUrl}
                            alt={b.title}
                            className="w-8 h-10 object-cover rounded border border-indigo-100 shrink-0 shadow-xs"
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-900 truncate">{b.title}</span>
                              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 shrink-0">
                                ISBN: {b.isbn}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500 truncate mt-0.5">
                              by {b.authorName} &bull; <span className="font-semibold text-emerald-700">{b.availableCopies}/{b.totalCopies} Available</span>
                            </div>
                          </div>
                        </div>
                        {isSelected && <CheckCircle2 className="h-4 w-4 text-indigo-600 shrink-0 ml-2" />}
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
        </div>

        {/* Condition Filter Pill Tabs in Flat View */}
        {viewMode === 'ALL_COPIES' && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
            <span className="text-slate-400 font-extrabold uppercase text-[10px] mr-1">Filter Inventory:</span>
            {[
              { id: 'ALL', label: 'All Conditions' },
              { id: 'REFERENCE', label: '🚫 Reference Copies Only' },
              { id: 'NEW', label: 'New Condition' },
              { id: 'GOOD', label: 'Good Condition' },
              { id: 'DAMAGED', label: 'Damaged' },
              { id: 'LOST', label: 'Lost' },
            ].map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setFilterCondition(c.id)}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                  filterCondition === c.id
                    ? c.id === 'REFERENCE'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* VIEW MODE 1: BOOK-WISE GROUPED INVENTORY VIEW */}
      {viewMode === 'BOOK_WISE' && (
        <div className="space-y-4">
          {filteredBooks.map((book) => {
            const copiesList = book.copies || [];
            const isRefBook = book.isReferenceOnly || book.collectionType === 'REFERENCE';
            const availCount = copiesList.filter((c) => c.status === 'AVAILABLE').length;
            const isIssuedCount = copiesList.filter((c) => c.status === 'ISSUED').length;
            const isDamagedCount = copiesList.filter((c) => c.condition === 'DAMAGED').length;
            const isLostCount = copiesList.filter((c) => c.condition === 'LOST').length;
            const isExpanded = expandedBookId === book.id || filteredBooks.length === 1;

            return (
              <div key={book.id} className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden transition-all">
                {/* Book Header Card */}
                <div className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-50/40">
                  <div className="flex items-start gap-4 min-w-0 flex-1">
                    <img
                      src={book.coverUrl}
                      alt={book.title}
                      className="w-14 h-20 object-cover rounded-xl border border-slate-200 shadow-xs shrink-0"
                    />
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-md bg-purple-100 text-purple-800 text-[10px] font-mono font-bold">
                          ISBN: {book.isbn}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-semibold">
                          {book.categoryName}
                        </span>
                        {isRefBook && (
                          <span className="px-2.5 py-0.5 rounded-md bg-rose-100 text-rose-800 border border-rose-200 text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1">
                            🚫 REFERENCE BOOK (NON-ISSUABLE)
                          </span>
                        )}
                      </div>
                      <h3 className="text-base font-bold font-poppins text-slate-900 line-clamp-1">{book.title}</h3>
                      <p className="text-xs text-slate-600">
                        <span className="font-semibold text-slate-700">Author:</span> {book.authorName} &bull; <span className="font-semibold text-slate-700">Publisher:</span> {book.publisherName} ({book.publishingYear})
                      </p>
                      <div className="flex items-center gap-2 pt-1 text-xs text-slate-700 font-semibold">
                        <MapPin className="h-4 w-4 text-rose-500 shrink-0" />
                        <span className="bg-white px-2.5 py-1 rounded-lg border border-slate-200 font-mono text-[11px]">
                          Physical Location: <strong className="text-indigo-900">{book.rackNumber || 'RACK-CS-01'} / {book.shelfNumber || 'SHELF-A1'}</strong>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Copy Counters & Expand Drawer Button */}
                  <div className="flex flex-col sm:items-end gap-2 w-full sm:w-auto shrink-0 border-t sm:border-t-0 border-slate-100 pt-3 sm:pt-0">
                    <div className="flex items-center gap-2 flex-wrap text-xs">
                      <span className="px-2.5 py-1 rounded-xl bg-emerald-100 text-emerald-900 font-bold border border-emerald-200">
                        {availCount} Available
                      </span>
                      <span className="px-2.5 py-1 rounded-xl bg-blue-100 text-blue-900 font-bold border border-blue-200">
                        {isIssuedCount} Issued
                      </span>
                      {isDamagedCount > 0 && (
                        <span className="px-2 py-1 rounded-xl bg-amber-100 text-amber-900 font-bold border border-amber-200">
                          {isDamagedCount} Damaged
                        </span>
                      )}
                      {isLostCount > 0 && (
                        <span className="px-2 py-1 rounded-xl bg-rose-100 text-rose-900 font-bold border border-rose-200">
                          {isLostCount} Lost
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => toggleExpandBook(book.id)}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-xl border border-indigo-200 transition-all cursor-pointer"
                    >
                      <span>{isExpanded ? 'Hide Accession Copies' : `View All ${copiesList.length} Accession Copies`}</span>
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Accession Copies Inventory Grid Drawer */}
                {isExpanded && (
                  <div className="p-5 border-t border-slate-200 bg-white space-y-3 animate-fadeIn">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                      <Barcode className="w-4 h-4 text-indigo-600" /> Book Accession Inventory Copies ({copiesList.length} Total Copies):
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {copiesList.map((copy) => (
                        <div
                          key={copy.id}
                          className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-2 hover:border-indigo-200 transition-all"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs font-mono bg-blue-100 text-blue-900 px-2.5 py-0.5 rounded-lg border border-blue-200">
                              {copy.accessionNo}
                            </span>
                            <span
                              className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase border ${
                                copy.status === 'AVAILABLE'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : 'bg-amber-50 text-amber-800 border-amber-200'
                              }`}
                            >
                              {copy.status}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 pt-1">
                            <Barcode className="h-8 w-12 text-slate-700 shrink-0" />
                            <div className="min-w-0 flex-1 text-xs">
                              <p className="font-mono text-slate-900 font-bold">{copy.barcode}</p>
                              <p className="text-[11px] text-slate-500 font-medium truncate">
                                Rack: {copy.rackNumber || book.rackNumber || 'RACK-01'} | Shelf: {copy.shelfNumber || book.shelfNumber || 'A1'}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 text-xs">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                                copy.condition === 'NEW'
                                  ? 'bg-cyan-100 text-cyan-800'
                                  : copy.condition === 'GOOD'
                                  ? 'bg-slate-200 text-slate-800'
                                  : copy.condition === 'DAMAGED'
                                  ? 'bg-amber-100 text-amber-900'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              Condition: {copy.condition}
                            </span>

                            <button
                              onClick={() => setSelectedCopy(copy)}
                              className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-[11px] font-bold text-slate-700 hover:bg-slate-100 cursor-pointer shadow-2xs"
                            >
                              Update Item
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {filteredBooks.length === 0 && (
            <div className="py-16 text-center text-slate-500 bg-white rounded-3xl border border-slate-200">
              <p className="text-base font-bold text-slate-700">No Catalog Books Found</p>
              <p className="text-xs text-slate-500 mt-1">No book inventory records match your search query or filter selection.</p>
            </div>
          )}
        </div>
      )}

      {/* VIEW MODE 2: ALL COPIES FLAT LIST VIEW */}
      {viewMode === 'ALL_COPIES' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Accession & Barcode</th>
                  <th className="py-3.5 px-4">Book Title & ISBN</th>
                  <th className="py-3.5 px-4">Physical Location</th>
                  <th className="py-3.5 px-4">Availability Status</th>
                  <th className="py-3.5 px-4">Physical Condition</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredCopies.map((copy) => (
                  <tr key={copy.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-4 px-4 font-mono">
                      <span className="font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded text-xs block w-fit">{copy.accessionNo}</span>
                      <span className="text-xs text-slate-500 block mt-0.5">{copy.barcode}</span>
                    </td>
                    <td className="py-4 px-4">
                      <span className="font-semibold text-slate-900 line-clamp-1">{copy.bookTitle}</span>
                      <span className="text-xs text-slate-500 font-mono">ISBN: {copy.isbn}</span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-1.5 text-xs text-slate-700 font-medium">
                        <MapPin className="h-3.5 w-3.5 text-rose-500" />
                        <span className="font-mono">
                          {copy.rackNumber || 'RACK-01'} / {copy.shelfNumber || 'SHELF-A'}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="space-y-1">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold uppercase ${
                            copy.isReferenceOnly
                              ? 'bg-rose-100 text-rose-800 border border-rose-300'
                              : copy.status === 'AVAILABLE'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : copy.status === 'ISSUED'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {copy.isReferenceOnly ? '🚫 REF COPY' : copy.status}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${
                          copy.condition === 'NEW'
                            ? 'bg-cyan-100 text-cyan-800'
                            : copy.condition === 'GOOD'
                            ? 'bg-slate-200 text-slate-800'
                            : copy.condition === 'DAMAGED'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {copy.condition}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <button
                        onClick={() => setSelectedCopy(copy)}
                        className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-700 transition-all cursor-pointer"
                      >
                        Update Item
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredCopies.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-500 font-medium">
                      No accession copies match your search or condition filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit Copy Condition Modal */}
      {selectedCopy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 space-y-4 border border-slate-200">
            <h2 className="text-lg font-bold font-poppins text-slate-900">Update Accession Item Condition</h2>
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-xs space-y-1">
              <p className="font-bold text-slate-900">{selectedCopy.accessionNo}</p>
              <p className="text-slate-600 font-mono">Barcode: {selectedCopy.barcode}</p>
            </div>

            <div className="space-y-3 text-sm">
              <div>
                <label className="block font-bold text-slate-700 text-xs mb-1">Physical Copy Condition</label>
                <select
                  id="modalConditionSelect"
                  defaultValue={selectedCopy.condition}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold"
                >
                  <option value="NEW">New Condition</option>
                  <option value="GOOD">Good Condition</option>
                  <option value="DAMAGED">Damaged (Needs Maintenance)</option>
                  <option value="LOST">Lost Item</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
              <button onClick={() => setSelectedCopy(null)} className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold cursor-pointer">
                Cancel
              </button>
              <button
                onClick={() => {
                  const select = document.getElementById('modalConditionSelect') as HTMLSelectElement;
                  handleUpdateCondition(selectedCopy.id, select.value as CopyCondition);
                }}
                className="px-5 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold shadow-md hover:bg-indigo-700 cursor-pointer"
              >
                Save Condition Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
