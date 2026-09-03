import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import {
  FileDown,
  FileText,
  Download,
  CheckCircle,
  Eye,
  ShieldCheck,
  GraduationCap,
  X,
  Settings,
  Search,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { libraryStore } from '../services/libraryStore.service';
import { OfficialDocument } from '../types/library';
import { getOfficialDocumentBlobUrl, downloadOfficialDocumentPdf } from '../utils/officialDownloadsPdfGenerator';

export default function Downloads() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [state, setState] = useState(libraryStore.snapshot);
  const [downloadToast, setDownloadToast] = useState<string | null>(null);
  const [previewDoc, setPreviewDoc] = useState<{ name: string; url: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  const isAdmin = user?.role === 'ADMIN' || user?.role === 'STAFF';

  useEffect(() => {
    const sub = libraryStore.getObservable().subscribe(setState);
    return () => sub.unsubscribe();
  }, []);

  const activeDocuments = useMemo(() => {
    return (state.officialDocuments || []).filter((d) => !d.isArchived);
  }, [state.officialDocuments]);

  // Dynamically compute all unique categories from documents
  const dynamicCategories = useMemo(() => {
    const defaultCats = [
      { id: 'Forms & Membership Applications', title: 'Forms & Membership Applications', icon: FileText },
      { id: 'Library Policies & Conduct Rules', title: 'Library Policies & Conduct Rules', icon: ShieldCheck },
      { id: 'Academic Exam & Curriculum', title: 'Academic Exam & Curriculum', icon: GraduationCap },
    ];

    const existingCatIds = new Set(defaultCats.map((c) => c.id));
    const allDocCats: string[] = Array.from(new Set(activeDocuments.map((d) => d.category).filter((c): c is string => Boolean(c))));

    const extraCats = allDocCats
      .filter((catName) => !existingCatIds.has(catName))
      .map((catName) => ({
        id: catName,
        title: catName,
        icon: FileDown,
      }));

    return [...defaultCats, ...extraCats];
  }, [activeDocuments]);

  const filteredDocuments = useMemo(() => {
    return activeDocuments.filter((d) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || d.title.toLowerCase().includes(q) || d.description?.toLowerCase().includes(q) || d.category.toLowerCase().includes(q);
      const matchesCat = selectedCategory === 'ALL' || d.category === selectedCategory;
      return matchesSearch && matchesCat;
    });
  }, [activeDocuments, searchQuery, selectedCategory]);

  const handleDownloadFile = (doc: OfficialDocument) => {
    if (!user) {
      navigate('/login', { state: { from: location } });
      return;
    }
    libraryStore.incrementOfficialDocDownload(doc.id, user);
    downloadOfficialDocumentPdf(doc);
    setDownloadToast(`Downloaded official document: "${doc.title}.pdf"`);
    setTimeout(() => setDownloadToast(null), 4000);
  };

  const handlePreviewFile = (doc: OfficialDocument) => {
    if (!user) {
      navigate('/login', { state: { from: location } });
      return;
    }
    const blobUrl = getOfficialDocumentBlobUrl(doc);
    setPreviewDoc({ name: doc.title, url: blobUrl });
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-950 via-indigo-950 to-blue-900 rounded-3xl p-8 text-white shadow-xl text-center relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-blue-300 bg-white/10 px-3.5 py-1.5 rounded-full mb-3 shadow-xs backdrop-blur-xs">
            <FileDown className="h-4 w-4 text-purple-300" />
            <span>Official University Download Center</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold font-poppins tracking-tight text-white">
            University Official Downloads
          </h1>
          <p className="text-slate-300 text-sm md:text-base max-w-2xl mx-auto mt-2.5 leading-relaxed font-medium">
            Download official library membership forms, institutional clearance certificates, statutory rulebooks, and academic schedules.
          </p>

          {/* Admin Management Quick Link Button */}
          {isAdmin && (
            <div className="mt-5 flex items-center justify-center">
              <Link
                to="/admin/downloads"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-purple-600/90 hover:bg-purple-600 text-white font-bold text-xs sm:text-sm border border-purple-400/30 shadow-lg shadow-purple-900/40 backdrop-blur-xs transition-all hover:scale-105"
              >
                <Settings className="w-4 h-4 text-purple-200 animate-spin-slow" />
                <span>Manage & Upload Forms as Librarian Desk</span>
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Toast Notification */}
      {downloadToast && (
        <div className="flex items-center justify-between gap-3 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-semibold shadow-xs animate-fadeIn">
          <div className="flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0" />
            <span>{downloadToast}</span>
          </div>
          <button onClick={() => setDownloadToast(null)} className="text-emerald-600 hover:text-emerald-800 p-1 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Search & Category Filter Toolbar */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200 shadow-xs space-y-4">
        {/* Search Input */}
        <div className="relative w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search forms, guidelines, exam schedules by keyword..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-10 py-3 rounded-2xl border border-slate-200 bg-slate-50 text-xs sm:text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-200/60"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none pt-0.5">
          <button
            type="button"
            onClick={() => setSelectedCategory('ALL')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
              selectedCategory === 'ALL'
                ? 'bg-purple-600 text-white shadow-sm shadow-purple-200'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
            }`}
          >
            <span>All Forms</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
              selectedCategory === 'ALL' ? 'bg-white/20 text-white' : 'bg-slate-200/80 text-slate-600'
            }`}>
              {activeDocuments.length}
            </span>
          </button>
          {dynamicCategories.map((cat) => {
            const count = activeDocuments.filter((d) => d.category === cat.id).length;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                  selectedCategory === cat.id
                    ? 'bg-purple-600 text-white shadow-sm shadow-purple-200'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                }`}
              >
                <span>{cat.title}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                  selectedCategory === cat.id ? 'bg-white/20 text-white' : 'bg-slate-200/80 text-slate-600'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Dynamic Categories Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
        {dynamicCategories
          .filter((cat) => selectedCategory === 'ALL' || cat.id === selectedCategory)
          .map((cat) => {
            const CategoryIcon = cat.icon || FileText;
            const items = filteredDocuments.filter((d) => d.category === cat.id);

            return (
              <div
                key={cat.id}
                className="bg-white rounded-3xl shadow-xs border border-slate-200/80 hover:shadow-md hover:border-slate-300 transition-all flex flex-col justify-between overflow-hidden"
              >
                {/* Category Header */}
                <div className="bg-slate-50/90 px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-purple-50 text-purple-600 border border-purple-100 shrink-0 shadow-2xs">
                      <CategoryIcon className="w-4 h-4" />
                    </div>
                    <h2 className="text-sm sm:text-base font-bold font-poppins text-slate-900 leading-snug">
                      {cat.title}
                    </h2>
                  </div>
                  <span className="text-[11px] font-bold text-slate-400 font-mono">
                    {items.length} {items.length === 1 ? 'doc' : 'docs'}
                  </span>
                </div>

                {/* Items List */}
                <div className="divide-y divide-slate-100 flex-1 flex flex-col justify-between">
                  {items.length > 0 ? (
                    items.map((doc) => (
                      <div
                        key={doc.id}
                        className="p-5 hover:bg-slate-50/70 transition-all flex flex-col justify-between gap-3 group"
                      >
                        <div className="flex items-start gap-3.5">
                          <div className="p-2.5 rounded-2xl bg-slate-100 text-slate-600 group-hover:bg-purple-600 group-hover:text-white transition-all shrink-0 mt-0.5 shadow-2xs">
                            <FileText className="w-4 h-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-purple-700 transition-colors leading-snug">
                              {doc.title}
                            </h3>
                            <p className="text-[11px] text-slate-500 line-clamp-2 mt-1 leading-normal">
                              {doc.description}
                            </p>
                            <div className="flex items-center gap-2 mt-2 flex-wrap">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold font-mono bg-purple-50 text-purple-700 border border-purple-200/60">
                                {doc.fileSize}
                              </span>
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-600">
                                {doc.fileType}
                              </span>
                              <span className="text-[10px] text-slate-400 font-medium">
                                • {doc.updatedDate}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2 pt-2 border-t border-slate-100/80">
                          <button
                            type="button"
                            onClick={() => handlePreviewFile(doc)}
                            className="flex-1 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Preview</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDownloadFile(doc)}
                            className="flex-1 px-3 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs transition-all flex items-center justify-center gap-1.5 shadow-md shadow-purple-500/20 cursor-pointer active:scale-95"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Download</span>
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-8 text-center text-slate-400 flex flex-col items-center justify-center">
                      <FileDown className="w-8 h-8 text-slate-300 mb-1" />
                      <p className="text-xs font-semibold">No official documents in this category.</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
      </div>

      {/* Embedded Document Preview Modal */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-fadeIn">
          <div className="bg-slate-900 rounded-3xl shadow-2xl max-w-4xl w-full border border-slate-800 flex flex-col max-h-[92vh] my-auto overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4 bg-slate-950 text-white shrink-0 gap-4">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="p-2.5 rounded-2xl bg-purple-500/20 text-purple-300 border border-purple-500/30 shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-sm sm:text-base font-bold font-poppins text-white leading-tight truncate">
                    {previewDoc.name}
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">Official University Library Document Preview</p>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => downloadOfficialDocumentPdf(previewDoc.name)}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs transition-all flex items-center gap-2 shadow-md shadow-purple-500/20 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Download PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewDoc(null)}
                  className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Native Iframe PDF Preview Viewport */}
            <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-slate-950 flex flex-col items-center justify-center min-h-[550px]">
              <div className="w-full h-full min-h-[600px] flex flex-col bg-white rounded-2xl border border-slate-800 overflow-hidden shadow-2xl">
                <iframe
                  src={previewDoc.url}
                  title={previewDoc.name}
                  className="w-full flex-1 min-h-[600px] border-0 rounded-2xl bg-white"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
