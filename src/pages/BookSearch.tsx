import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Search,
  Book as BookIcon,
  MapPin,
  CheckCircle,
  Bookmark,
  X,
  RotateCcw,
  SlidersHorizontal,
  Barcode,
  Info,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Building2,
} from 'lucide-react';
import { libraryStore } from '../services/libraryStore.service';
import { useAuth } from '../context/AuthContext';
import { Book } from '../types/library';

export default function BookSearch() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [state, setState] = useState(libraryStore.snapshot);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchBy, setSearchBy] = useState<'all' | 'title' | 'author' | 'isbn' | 'category'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('ALL');
  const [reservationMessage, setReservationMessage] = useState<string | null>(null);
  const [cardMessages, setCardMessages] = useState<Record<string, string>>({});
  const [selectedBookModal, setSelectedBookModal] = useState<Book | null>(null);

  useEffect(() => {
    const sub = libraryStore.getObservable().subscribe(setState);
    return () => sub.unsubscribe();
  }, []);

  // Unique Departments from catalog
  const departmentOptions = useMemo(() => {
    const set = new Set<string>();
    state.books.forEach((b) => {
      if (b.department) set.add(b.department);
    });
    return Array.from(set);
  }, [state.books]);

  // Current active member
  const currentUserMember = useMemo(() => {
    if (!user) return state.members.find((m) => m.role === 'STUDENT') || state.members[0];
    return (
      state.members.find((m) => m.email.toLowerCase() === user.email?.toLowerCase() || m.id === user.id) ||
      state.members.find((m) => m.role === 'STUDENT') ||
      state.members[0]
    );
  }, [state.members, user]);

  // Search & Filter Logic
  const filteredBooks = useMemo(() => {
    return state.books.filter((book) => {
      const term = searchTerm.toLowerCase().trim();
      let matchesSearch = true;

      if (term) {
        switch (searchBy) {
          case 'title':
            matchesSearch = book.title.toLowerCase().includes(term);
            break;
          case 'author':
            matchesSearch = book.authorName.toLowerCase().includes(term);
            break;
          case 'isbn':
            matchesSearch = book.isbn.toLowerCase().includes(term);
            break;
          case 'category':
            matchesSearch = book.categoryName.toLowerCase().includes(term);
            break;
          default:
            matchesSearch =
              book.title.toLowerCase().includes(term) ||
              book.authorName.toLowerCase().includes(term) ||
              book.isbn.toLowerCase().includes(term) ||
              book.categoryName.toLowerCase().includes(term) ||
              book.publisherName.toLowerCase().includes(term) ||
              (book.department && book.department.toLowerCase().includes(term));
            break;
        }
      }

      const matchesCat = selectedCategory === 'ALL' || book.categoryId === selectedCategory;
      const matchesDept = selectedDepartment === 'ALL' || book.department === selectedDepartment;

      return matchesSearch && matchesCat && matchesDept;
    });
  }, [state.books, searchTerm, searchBy, selectedCategory, selectedDepartment]);

  const hasActiveFilters =
    searchTerm !== '' ||
    selectedCategory !== 'ALL' ||
    selectedDepartment !== 'ALL' ||
    searchBy !== 'all';

  const handleResetFilters = () => {
    setSearchTerm('');
    setSearchBy('all');
    setSelectedCategory('ALL');
    setSelectedDepartment('ALL');
  };

  const handleReserve = (book: Book) => {
    const memberIdToUse = currentUserMember?.email || currentUserMember?.id || 'mem-1';
    const result = libraryStore.reserveBook(book.id, memberIdToUse);

    setReservationMessage(result.message);
    setCardMessages((prev) => ({
      ...prev,
      [book.id]: result.message,
    }));

    setTimeout(() => {
      setReservationMessage(null);
      setCardMessages((prev) => {
        const copy = { ...prev };
        delete copy[book.id];
        return copy;
      });
    }, 5000);
  };



  // Telemetry Calculations
  const totalBooks = state.books.length;
  const totalCopies = state.books.reduce((acc, b) => acc + (b.totalCopies || 0), 0);
  const availableCopies = state.books.reduce((acc, b) => acc + (b.availableCopies || 0), 0);
  const totalReservations = state.reservations.length;

  return (
    <div className="space-y-6 pb-10">
      {/* Books Catalog Header Banner */}
      <div className="bg-gradient-to-r from-slate-950 via-indigo-950 to-blue-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="space-y-2 relative z-10">
          <div className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-widest text-blue-300 bg-white/10 px-3.5 py-1 rounded-full">
            <BookIcon className="h-4 w-4" /> Centralized Library Catalog
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold font-poppins tracking-tight">
            Library Books Catalog
          </h1>
          <p className="text-slate-300 text-xs sm:text-sm max-w-2xl">
            Browse, search, and view all registered library books across all academic departments. Unified real-time view shared for Admin, Faculty, and Students.
          </p>
        </div>
      </div>

      {reservationMessage && (
        <div className="flex items-center justify-between gap-3 p-4 rounded-2xl bg-blue-50 border border-blue-200 text-blue-900 text-sm font-semibold shadow-sm animate-fadeIn">
          <div className="flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-blue-600 shrink-0" />
            <span>{reservationMessage}</span>
          </div>
          <button
            onClick={() => setReservationMessage(null)}
            className="text-blue-500 hover:text-blue-700 font-bold text-xs cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Telemetry Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs flex items-center gap-3.5 min-w-0">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl shrink-0">
            <BookIcon className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">Total Library Books</p>
            <p className="text-xl font-extrabold text-slate-900 font-poppins mt-0.5">{totalBooks}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs flex items-center gap-3.5 min-w-0">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl shrink-0">
            <CheckCircle className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">Available Titles</p>
            <p className="text-xl font-extrabold text-emerald-700 font-poppins mt-0.5">
              {state.books.filter((b) => b.availableCopies > 0).length}
            </p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs flex items-center gap-3.5 min-w-0">
          <div className="p-3 bg-purple-50 text-purple-600 rounded-xl shrink-0">
            <Building2 className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">Departments</p>
            <p className="text-xl font-extrabold text-purple-700 font-poppins mt-0.5">{departmentOptions.length}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs flex items-center gap-3.5 min-w-0">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl shrink-0">
            <Bookmark className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">Active Holds</p>
            <p className="text-xl font-extrabold text-amber-700 font-poppins mt-0.5">{totalReservations}</p>
          </div>
        </div>
      </div>

      {/* SEARCH AND FILTER CONTROLS */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-blue-600" />
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Search & Filter Catalog</h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
              Showing {filteredBooks.length} of {totalBooks} Catalog Titles
            </span>
            {hasActiveFilters && (
              <button
                onClick={handleResetFilters}
                className="text-xs text-rose-600 hover:text-rose-700 font-bold flex items-center gap-1 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-100 transition-colors cursor-pointer"
              >
                <RotateCcw className="h-3 w-3" /> Reset
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Main Search Input */}
          <div className="md:col-span-6 relative">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search title, author, ISBN, publisher..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-9 py-2.5 rounded-xl border border-slate-200 text-sm bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Category Select Filter Dropdown */}
          <div className="md:col-span-2">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-700"
            >
              <option value="ALL">All Categories ({totalBooks})</option>
              {state.categories.map((c) => {
                const count = state.books.filter((b) => b.categoryId === c.id).length;
                return (
                  <option key={c.id} value={c.id}>
                    {c.name} ({count})
                  </option>
                );
              })}
            </select>
          </div>

          {/* Department Select Filter Dropdown */}
          <div className="md:col-span-2">
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-700"
            >
              <option value="ALL">All Departments</option>
              {departmentOptions.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>

          {/* Search Target Field Dropdown */}
          <div className="md:col-span-2">
            <select
              value={searchBy}
              onChange={(e) => setSearchBy(e.target.value as any)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-700"
            >
              <option value="all">Search All Fields</option>
              <option value="title">Search Title</option>
              <option value="author">Search Author</option>
              <option value="isbn">Search ISBN</option>
            </select>
          </div>
        </div>

        {/* Active Filter Badges */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100 text-xs">
            <span className="text-slate-400 font-medium">Active Filters:</span>
            {searchTerm && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 font-semibold border border-blue-100">
                Search: "{searchTerm}"
                <button onClick={() => setSearchTerm('')} className="hover:text-blue-900 cursor-pointer">
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {selectedCategory !== 'ALL' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 font-semibold border border-indigo-100">
                Category: {state.categories.find((c) => c.id === selectedCategory)?.name || selectedCategory}
                <button onClick={() => setSelectedCategory('ALL')} className="hover:text-indigo-900 cursor-pointer">
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {selectedDepartment !== 'ALL' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-50 text-purple-700 font-semibold border border-purple-100">
                Department: {selectedDepartment}
                <button onClick={() => setSelectedDepartment('ALL')} className="hover:text-purple-900 cursor-pointer">
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
          </div>
        )}
      </div>

      {/* CATALOG RESULTS GRID */}
      <div className="space-y-4">
        {filteredBooks.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            {filteredBooks.map((book) => {
              const userReservation = state.reservations.find(
                (r) =>
                  r.bookId === book.id &&
                  (r.memberId === currentUserMember?.id || r.memberCardNo === currentUserMember?.memberCardNo) &&
                  r.status === 'PENDING'
              );

              return (
                <div
                  key={book.id}
                  className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-xs hover:shadow-md hover:border-blue-300 transition-all space-y-4 flex flex-col justify-between"
                >
                  <div className="flex flex-col sm:flex-row gap-4 items-start">
                    <img
                      src={book.coverUrl}
                      alt={book.title}
                      className="w-24 h-32 sm:w-28 sm:h-36 object-cover rounded-2xl border border-slate-200 shadow-2xs shrink-0 self-center sm:self-start"
                    />

                    <div className="flex-1 space-y-2 min-w-0 w-full">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100">
                            {book.categoryName}
                          </span>
                          {book.department && (
                            <span className="text-[10px] font-extrabold uppercase tracking-wider text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-100">
                              {book.department}
                            </span>
                          )}
                          {(book.publishingYear >= 2024 || book.isBookOfMonth) && (
                            <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 inline-flex items-center gap-1">
                              <Sparkles className="h-3 w-3 text-amber-500" /> New Arrival
                            </span>
                          )}
                        </div>
                      </div>

                      <div>
                        <h3 className="font-bold text-slate-900 text-base font-poppins line-clamp-2 leading-snug">
                          {book.title}
                        </h3>
                        <p className="text-xs text-slate-600 font-semibold mt-0.5">By {book.authorName}</p>
                      </div>

                      <div className="space-y-1 text-xs text-slate-500 pt-1 border-t border-slate-100">
                        <div className="flex justify-between">
                          <span>Publisher:</span>
                          <span className="font-semibold text-slate-800">{book.publisherName}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Edition / Year:</span>
                          <span className="font-mono text-slate-800">{book.edition} ({book.publishingYear})</span>
                        </div>
                        <div className="flex justify-between font-mono text-[11px]">
                          <span>ISBN:</span>
                          <span className="font-bold text-slate-700">{book.isbn}</span>
                        </div>
                      </div>
                    </div>
                  </div>



                  {/* Card Inline Feedback Toast */}
                  {cardMessages[book.id] && (
                    <div className="p-3 rounded-2xl bg-blue-50 border border-blue-200 text-blue-900 text-xs font-semibold flex items-center justify-between animate-fadeIn">
                      <span>{cardMessages[book.id]}</span>
                      <button
                        onClick={() =>
                          setCardMessages((prev) => {
                            const c = { ...prev };
                            delete c[book.id];
                            return c;
                          })
                        }
                        className="text-blue-500 hover:text-blue-700 font-bold"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}

                  {/* Actions Footer */}
                  <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
                    <button
                      onClick={() => setSelectedBookModal(book)}
                      className="px-4 py-2 rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 text-xs font-bold text-blue-700 transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <Info className="h-4 w-4 text-blue-600" /> View Details
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Empty Search & Filter State */
          <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center space-y-4 shadow-xs">
            <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto">
              <BookIcon className="h-8 w-8" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">No matching catalog books found</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                No OPAC catalog records matched your search phrase or category filter. Try clearing your parameters.
              </p>
            </div>
            <button
              onClick={handleResetFilters}
              className="px-4 py-2 bg-blue-600 text-white rounded-xl font-bold text-xs shadow-xs hover:bg-blue-700 transition-colors inline-flex items-center gap-2 cursor-pointer"
            >
              <RotateCcw className="h-4 w-4" /> Reset Search & Filters
            </button>
          </div>
        )}
      </div>

      {/* BOOK DETAILS MODAL */}
      {selectedBookModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl shadow-xl max-w-lg w-full p-6 space-y-5 border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-slate-900 font-bold font-poppins">
                <BookIcon className="h-5 w-5 text-blue-600" /> Library Book Details
              </div>
              <button
                onClick={() => setSelectedBookModal(null)}
                className="text-slate-400 hover:text-slate-700 font-bold text-xl cursor-pointer"
              >
                &times;
              </button>
            </div>

            <div className="flex gap-4">
              <img
                src={selectedBookModal.coverUrl}
                alt={selectedBookModal.title}
                className="w-28 h-36 object-cover rounded-2xl border border-slate-200 shadow-xs shrink-0"
              />
              <div className="space-y-1 text-xs">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-blue-50 text-blue-700">
                  {selectedBookModal.categoryName}
                </span>
                <h3 className="text-base font-bold text-slate-900 font-poppins pt-1">{selectedBookModal.title}</h3>
                <p className="text-slate-600 font-semibold">Author: {selectedBookModal.authorName}</p>
                <p className="text-slate-500 font-mono text-[11px]">Publisher: {selectedBookModal.publisherName}</p>
                <p className="text-slate-500 font-mono text-[11px]">Edition / Year: {selectedBookModal.edition} ({selectedBookModal.publishingYear})</p>
                <p className="text-slate-500 font-mono text-[11px]">ISBN: {selectedBookModal.isbn}</p>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <h4 className="font-bold text-slate-900">Book Description</h4>
              <p className="text-slate-600 leading-relaxed bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                {selectedBookModal.description || 'Comprehensive textbook reference edition for university curriculum and research.'}
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setSelectedBookModal(null)}
                className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
