import React, { useState, useEffect, useMemo } from 'react';
import {
  Tag,
  CheckCircle,
  BookOpen,
  Search,
  Filter,
  X,
  Book,
} from 'lucide-react';
import { libraryStore } from '../../services/libraryStore.service';
import { Book as BookType } from '../../types/library';

export default function MasterData() {
  const [state, setState] = useState(libraryStore.snapshot);

  // Active Taxonomy Filter
  const [taxonomyFilter, setTaxonomyFilter] = useState<{
    type: 'ALL' | 'CATEGORY' | 'AUTHOR' | 'PUBLISHER' | 'HIERARCHY';
    id?: string;
    name?: string;
    hierarchyPath?: { collection?: string; category?: string; department?: string; program?: string; subject?: string };
  }>({ type: 'ALL' });

  // Catalog Table Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('ALL');
  const [selectedFormat, setSelectedFormat] = useState<'ALL' | 'PHYSICAL' | 'DIGITAL' | 'HYBRID'>('ALL');
  const [selectedAvailability, setSelectedAvailability] = useState<'ALL' | 'AVAILABLE' | 'ISSUED'>('ALL');
  const [sortBy, setSortBy] = useState<'TITLE' | 'YEAR' | 'BORROW_COUNT'>('TITLE');

  // Toast Notice State
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    const sub = libraryStore.getObservable().subscribe(setState);
    return () => sub.unsubscribe();
  }, []);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Filtered Catalog Books List
  const filteredCatalogBooks = useMemo(() => {
    return state.books
      .filter((b) => {
        // Taxonomy Master Filter
        let matchesTaxonomy = true;
        if (taxonomyFilter.type === 'CATEGORY') {
          matchesTaxonomy = b.categoryId === taxonomyFilter.id || b.categoryName?.toLowerCase() === taxonomyFilter.name?.toLowerCase();
        } else if (taxonomyFilter.type === 'AUTHOR') {
          matchesTaxonomy = b.authorId === taxonomyFilter.id || b.authorName?.toLowerCase() === taxonomyFilter.name?.toLowerCase();
        } else if (taxonomyFilter.type === 'PUBLISHER') {
          matchesTaxonomy = b.publisherId === taxonomyFilter.id || b.publisherName?.toLowerCase() === taxonomyFilter.name?.toLowerCase();
        } else if (taxonomyFilter.type === 'HIERARCHY') {
          const hp = taxonomyFilter.hierarchyPath;
          if (hp?.category) matchesTaxonomy = matchesTaxonomy && (b.categoryName?.toLowerCase() === hp.category.toLowerCase() || b.categoryId === hp.category);
          if (hp?.department) matchesTaxonomy = matchesTaxonomy && b.department?.toLowerCase() === hp.department.toLowerCase();
          if (hp?.subject) matchesTaxonomy = matchesTaxonomy && b.subject?.toLowerCase() === hp.subject.toLowerCase();
        }

        if (!matchesTaxonomy) return false;

        // Department Filter
        const matchesDept = selectedDepartment === 'ALL' || b.department === selectedDepartment;
        if (!matchesDept) return false;

        // Format Filter
        const matchesFormat = selectedFormat === 'ALL' || b.format === selectedFormat;
        if (!matchesFormat) return false;

        // Availability Filter
        let matchesAvailability = true;
        if (selectedAvailability === 'AVAILABLE') matchesAvailability = b.availableCopies > 0;
        else if (selectedAvailability === 'ISSUED') matchesAvailability = b.availableCopies === 0;
        if (!matchesAvailability) return false;

        // Search Query Filter
        if (!searchTerm.trim()) return true;

        const q = searchTerm.toLowerCase().trim();
        const matchesTitle = b.title.toLowerCase().includes(q);
        const matchesIsbn = b.isbn.toLowerCase().includes(q);
        const matchesAuthor = b.authorName.toLowerCase().includes(q);
        const matchesPublisher = b.publisherName?.toLowerCase().includes(q) || false;
        const matchesCategoryName = b.categoryName?.toLowerCase().includes(q) || false;
        const matchesCopies = (b.copies || []).some(
          (c) => c.accessionNo.toLowerCase().includes(q) || c.barcode.toLowerCase().includes(q)
        );

        return matchesTitle || matchesIsbn || matchesAuthor || matchesPublisher || matchesCategoryName || matchesCopies;
      })
      .sort((a, b) => {
        if (sortBy === 'YEAR') return b.publishingYear - a.publishingYear;
        if (sortBy === 'BORROW_COUNT') return (b.borrowCount || 0) - (a.borrowCount || 0);
        return a.title.localeCompare(b.title);
      });
  }, [state.books, taxonomyFilter, searchTerm, selectedDepartment, selectedFormat, selectedAvailability, sortBy]);

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-medium animate-fadeIn">
          <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* CENTRALIZED LIBRARY BOOKS CATALOG TABLE */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-lg font-extrabold font-poppins text-slate-900 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-purple-600" /> Filtered Books Catalog ({filteredCatalogBooks.length})
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Showing matching books under current catalog selection.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search catalog books..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-8 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 bg-slate-50/50 focus:outline-none focus:border-purple-500"
              />
              {searchTerm && (
                <button onClick={() => setSearchTerm('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <select
              value={selectedFormat}
              onChange={(e) => setSelectedFormat(e.target.value as any)}
              className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 bg-slate-50 focus:outline-none focus:border-purple-500"
            >
              <option value="ALL">All Formats</option>
              <option value="PHYSICAL">Physical</option>
              <option value="DIGITAL">Digital</option>
              <option value="HYBRID">Both (Physical & Digital)</option>
            </select>

            <select
              value={selectedAvailability}
              onChange={(e) => setSelectedAvailability(e.target.value as any)}
              className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 bg-slate-50 focus:outline-none focus:border-purple-500"
            >
              <option value="ALL">All Stock Status</option>
              <option value="AVAILABLE">Available Only</option>
              <option value="ISSUED">All Copies Issued</option>
            </select>
          </div>
        </div>

        {/* Dynamic Filter Banner */}
        {taxonomyFilter.type !== 'ALL' && (
          <div className="flex items-center justify-between bg-purple-50 border border-purple-200 px-4 py-2.5 rounded-2xl text-xs font-bold text-purple-900 animate-fadeIn">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-purple-600 shrink-0" />
              <span>
                Filtering Catalog by <strong>{taxonomyFilter.type}</strong>: <span className="underline">{taxonomyFilter.name}</span>
              </span>
            </div>
            <button
              onClick={() => setTaxonomyFilter({ type: 'ALL' })}
              className="px-2.5 py-1 rounded-xl bg-purple-200 hover:bg-purple-300 text-purple-900 font-black cursor-pointer flex items-center gap-1 transition-colors"
            >
              <X className="w-3.5 h-3.5" /> Clear Filter
            </button>
          </div>
        )}

        {/* Clean Non-Sliding Table */}
        <div className="w-full overflow-hidden rounded-2xl border border-slate-200/80 bg-white">
          <table className="w-full table-fixed text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/90 text-[11px] font-extrabold uppercase text-slate-500 border-b border-slate-200 tracking-wider">
                <th className="w-[40%] px-4 py-3.5">Book Details</th>
                <th className="w-[20%] px-3 py-3.5">Category</th>
                <th className="w-[20%] px-3 py-3.5">Author</th>
                <th className="w-[20%] px-3 py-3.5">Publisher</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredCatalogBooks.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-slate-400 font-medium">
                    No books match the selected search or catalog filters.
                  </td>
                </tr>
              ) : (
                filteredCatalogBooks.map((book) => {
                  return (
                    <tr key={book.id} className="hover:bg-purple-50/20 transition-colors">
                      {/* Book Details */}
                      <td className="px-4 py-3.5 align-middle">
                        <div className="flex items-center gap-3">
                          <img
                            src={book.coverUrl || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=120&q=80'}
                            alt={book.title}
                            className="w-10 h-14 object-cover rounded-lg border border-slate-200 shrink-0 shadow-2xs"
                          />
                          <div className="min-w-0 flex-1 space-y-0.5">
                            <h4 className="font-extrabold text-slate-900 text-xs sm:text-sm leading-snug truncate" title={book.title}>
                              {book.title}
                            </h4>
                            <p className="text-[11px] font-bold text-purple-700 truncate">
                              {book.department || 'Academic Department'}
                            </p>
                            <div className="flex items-center gap-2 text-[11px] font-mono text-slate-500 flex-wrap">
                              <span>ISBN: {book.isbn}</span>
                              <span>•</span>
                              <span>Edition: {book.edition || '1st Edition'} ({book.publishingYear})</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="px-3 py-3.5 align-middle">
                        <span className="inline-block bg-purple-50 text-purple-800 border border-purple-200/80 px-3 py-1 rounded-xl font-extrabold text-xs truncate max-w-full">
                          {book.categoryName || 'General'}
                        </span>
                      </td>

                      {/* Author */}
                      <td className="px-3 py-3.5 align-middle">
                        <p className="font-extrabold text-slate-900 text-xs truncate">{book.authorName}</p>
                      </td>

                      {/* Publisher */}
                      <td className="px-3 py-3.5 align-middle">
                        <p className="font-bold text-slate-700 text-xs truncate">{book.publisherName || 'University Press'}</p>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
