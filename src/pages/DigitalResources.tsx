import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Download,
  FileText,
  Database,
  Link as LinkIcon,
  CheckCircle,
  Search,
  Filter,
  BookOpen,
  Sparkles,
  FileCode,
  Layers,
  X,
  Star,
  Eye,
  Calendar,
  Building2,
  Bookmark,
  RefreshCw,
  ExternalLink,
  History,
  ShieldCheck,
  Plus,
  BarChart3,
  Globe,
  Newspaper,
  BookMarked,
  GraduationCap,
  Video,
  Library,
  Award,
  Lock,
} from 'lucide-react';
import { libraryStore } from '../services/libraryStore.service';
import { useAuth } from '../context/AuthContext';
import { DigitalResource, DigitalResourceType, DigitalDownloadLog } from '../types/library';

export default function DigitalResources() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [state, setState] = useState(libraryStore.snapshot);

  // Strictly check if current logged in user is Admin / Staff
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'STAFF';

  // Filters State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('ALL');
  const [selectedSemester, setSelectedSemester] = useState<string>('ALL');
  const [selectedYear, setSelectedYear] = useState<string>('ALL');
  const [showOnlyBookmarks, setShowOnlyBookmarks] = useState(false);

  // General Modals State
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [downloadToast, setDownloadToast] = useState<string | null>(null);
  const [isRssRefreshing, setIsRssRefreshing] = useState(false);

  // Form State for Admin Upload
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadType, setUploadType] = useState<DigitalResourceType>('RESEARCH_PAPER');
  const [uploadDept, setUploadDept] = useState('Computer Science & Engineering');
  const [uploadAuthor, setUploadAuthor] = useState(user?.name || '');
  const [uploadSubject, setUploadSubject] = useState('');
  const [uploadSemester, setUploadSemester] = useState('Sem 4');
  const [uploadDescription, setUploadDescription] = useState('');
  const [uploadExternalUrl, setUploadExternalUrl] = useState('');

  useEffect(() => {
    const sub = libraryStore.getObservable().subscribe(setState);
    return () => sub.unsubscribe();
  }, []);

  // Generate a valid PDF-1.4 blob URL for viewing or downloading
  const createPdfBlobUrl = (res: DigitalResource): string => {
    const title = (res.title || 'Digital Document').replace(/[()\\]/g, '');
    const author = (res.authorName || 'University Library').replace(/[()\\]/g, '');
    const dept = (res.department || res.categoryName || 'Academic').replace(/[()\\]/g, '');
    const typeStr = (res.resourceType || 'DOCUMENT').replace(/_/g, ' ').replace(/[()\\]/g, '');
    const desc = (res.description || 'Institutional research digital document repository item.').replace(/[()\\]/g, '');
    const snippet = (res.contentSnippet || 'Full reference materials, research papers, and academic proceedings.').replace(/[()\\]/g, '');
    const dateStr = new Date().toLocaleDateString();

    const streamText =
      `BT\n` +
      `/F1 16 Tf\n` +
      `40 740 Td\n` +
      `(UNIVERSITY CENTRAL LIBRARY - ENTERPRISE DIGITAL REPOSITORY) Tj\n` +
      `0 -24 Td\n` +
      `/F1 12 Tf\n` +
      `(TYPE: ${typeStr}) Tj\n` +
      `0 -20 Td\n` +
      `(TITLE: ${title.substring(0, 55)}) Tj\n` +
      `0 -18 Td\n` +
      `(AUTHOR: ${author.substring(0, 55)}) Tj\n` +
      `0 -18 Td\n` +
      `(DEPARTMENT: ${dept.substring(0, 55)}) Tj\n` +
      `0 -18 Td\n` +
      `(DATE: ${dateStr}) Tj\n` +
      `0 -30 Td\n` +
      `/F1 11 Tf\n` +
      `(ABSTRACT OVERVIEW:) Tj\n` +
      `0 -16 Td\n` +
      `(${desc.substring(0, 75)}) Tj\n` +
      `0 -14 Td\n` +
      `(${desc.length > 75 ? desc.substring(75, 150) : ''}) Tj\n` +
      `0 -30 Td\n` +
      `(EXTRACT CONTENT SNIPPET:) Tj\n` +
      `0 -16 Td\n` +
      `(${snippet.substring(0, 75)}) Tj\n` +
      `0 -14 Td\n` +
      `(${snippet.length > 75 ? snippet.substring(75, 150) : ''}) Tj\n` +
      `0 -45 Td\n` +
      `/F1 9 Tf\n` +
      `(Digitally Verified & Certified by University Central Digital Library Vault) Tj\n` +
      `ET`;

    const streamLength = streamText.length;

    const pdfString =
`%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /Resources << /Font << /F1 4 0 R >> >> /MediaBox [0 0 612 792] /Contents 5 0 R >>
endobj
4 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
5 0 obj
<< /Length ${streamLength} >>
stream
${streamText}
endstream
endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000224 00000 n 
0000000293 00000 n 
trailer
<< /Size 6 /Root 1 0 R >>
startxref
${350 + streamLength}
%%EOF`;

    const blob = new Blob([pdfString], { type: 'application/pdf' });
    return URL.createObjectURL(blob);
  };

  // Direct "View PDF": Opens native browser PDF viewer in a new tab
  const handleViewPdf = (res: DigitalResource) => {
    if (!user) {
      navigate('/login', { state: { from: location } });
      return;
    }

    if (res.externalUrl && res.externalUrl.startsWith('http')) {
      window.open(res.externalUrl, '_blank');
    } else {
      const pdfUrl = createPdfBlobUrl(res);
      window.open(pdfUrl, '_blank');
    }
  };

  // Direct "Download PDF": Downloads the PDF file to disk
  const handleDownload = (res: DigitalResource) => {
    if (!user) {
      navigate('/login', { state: { from: location } });
      return;
    }
    libraryStore.incrementDownload(res.id, user);

    const pdfUrl = createPdfBlobUrl(res);
    const link = document.createElement('a');
    const safeFilename = (res.title || 'digital_document')
      .replace(/[^a-zA-Z0-9\s-_]/g, '')
      .trim()
      .replace(/\s+/g, '_');

    link.href = pdfUrl;
    link.download = `${safeFilename}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    if (res.externalUrl && res.externalUrl.startsWith('http')) {
      window.open(res.externalUrl, '_blank');
    }

    setDownloadToast(`Downloaded file "${res.title}" (${res.fileSizeMb || 0} MB). Saved to your browser downloads!`);
    setTimeout(() => setDownloadToast(null), 4500);
  };

  const handleToggleBookmark = (e: React.MouseEvent, resId: string) => {
    e.stopPropagation();
    const result = libraryStore.toggleBookmarkResource(resId);
    setDownloadToast(result.message);
    setTimeout(() => setDownloadToast(null), 3000);
  };

  const handleRssRefresh = async () => {
    setIsRssRefreshing(true);
    const res = await libraryStore.fetchNewspaperFeeds();
    setIsRssRefreshing(false);
    setDownloadToast(`Auto-refreshed today's digital newspapers edition (${res.todayStr}) across RSS feeds.`);
    setTimeout(() => setDownloadToast(null), 4000);
  };

  const handleUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      alert('Only Chief Admin Librarian has permission to publish or modify digital assets.');
      return;
    }
    if (!uploadTitle.trim()) return;

    libraryStore.addDigitalResource(
      {
        title: uploadTitle.trim(),
        resourceType: uploadType,
        categoryName: uploadDept,
        authorName: uploadAuthor.trim() || user?.name || 'Chief Librarian',
        fileUrl: uploadExternalUrl.trim() || '/docs/sample-paper.pdf',
        fileSizeMb: 12.5,
        department: uploadDept,
        subject: uploadSubject || 'General',
        semester: uploadSemester,
        year: 2026,
        description: uploadDescription || 'Admin published academic digital resource.',
        accessLevel: 'OPEN_ACCESS',
        externalUrl: uploadExternalUrl.trim() || undefined,
      },
      user || undefined
    );

    setShowUploadModal(false);
    setUploadTitle('');
    setUploadDescription('');
    setUploadExternalUrl('');
    setDownloadToast(`Published "${uploadTitle}" to Enterprise Digital Library successfully!`);
    setTimeout(() => setDownloadToast(null), 4000);
  };

  // Filtered Digital Resources with Smart Sub-Filter Handling
  const filteredResources = useMemo(() => {
    const bookmarkedSet = new Set(state.bookmarkedIds || []);

    // Step 1: Base list filtered by Archival, Search, Type, and Bookmarks
    const baseList = (state.digitalResources || []).filter((r) => {
      if (r.isArchived && !isAdmin) return false;

      // Search Query
      const q = searchTerm.toLowerCase().trim();
      if (q) {
        const matchesSearch =
          r.title.toLowerCase().includes(q) ||
          r.authorName.toLowerCase().includes(q) ||
          (r.description && r.description.toLowerCase().includes(q)) ||
          (r.department && r.department.toLowerCase().includes(q)) ||
          (r.subject && r.subject.toLowerCase().includes(q)) ||
          (r.publisherName && r.publisherName.toLowerCase().includes(q)) ||
          (r.issnIsbn && r.issnIsbn.toLowerCase().includes(q));
        if (!matchesSearch) return false;
      }

      // Type Pill Filter
      if (selectedType === 'BOOKMARKS') {
        if (!bookmarkedSet.has(r.id)) return false;
      } else if (selectedType !== 'ALL') {
        if (r.resourceType !== selectedType) return false;
      }

      // Bookmarks Only Toggle
      if (showOnlyBookmarks && !bookmarkedSet.has(r.id)) return false;

      return true;
    });

    // Step 2: Apply Sub-filters (Department, Semester, Year)
    const refinedList = baseList.filter((r) => {
      const isUniversalDept =
        !r.department ||
        r.department === 'All Departments' ||
        r.department === 'All' ||
        r.department === 'General Knowledge & News' ||
        r.resourceType === 'NEWSPAPER';
      const matchesDept = selectedDepartment === 'ALL' || isUniversalDept || r.department === selectedDepartment;

      const isUniversalSem =
        !r.semester ||
        r.semester === 'All Semesters' ||
        r.semester === 'All' ||
        r.resourceType === 'NEWSPAPER';
      const matchesSem = selectedSemester === 'ALL' || isUniversalSem || r.semester === selectedSemester;

      const isUniversalYear = !r.year || String(r.year) === selectedYear || r.resourceType === 'NEWSPAPER';
      const matchesYear = selectedYear === 'ALL' || isUniversalYear;

      return matchesDept && matchesSem && matchesYear;
    });

    // Smart Fallback: If sub-filters yield zero items for a selected category, return baseList so items in that category are shown
    if (refinedList.length === 0 && baseList.length > 0 && selectedType !== 'ALL') {
      return baseList;
    }

    return refinedList;
  }, [state.digitalResources, state.bookmarkedIds, searchTerm, selectedType, selectedDepartment, selectedSemester, selectedYear, showOnlyBookmarks, isAdmin]);

  // Today's Digital Newspapers subset
  const todaysNewspapers = useMemo(() => {
    return (state.digitalResources || []).filter((r) => r.resourceType === 'NEWSPAPER');
  }, [state.digitalResources]);

  // Categories list
  const resourceCategories: Array<{ type: string; label: string; icon: React.ComponentType<any> }> = [
    { type: 'ALL', label: 'All Digital Assets', icon: Layers },
    { type: 'NEWSPAPER', label: 'Digital Newspapers', icon: Newspaper },
    { type: 'EBOOK', label: 'E-Books', icon: BookOpen },
    { type: 'JOURNAL', label: 'E-Journals', icon: FileText },
    { type: 'QUESTION_PAPER', label: 'Question Papers', icon: GraduationCap },
    { type: 'SYLLABUS', label: 'Syllabus', icon: FileCode },
    { type: 'LECTURE_NOTES', label: 'Lecture Notes', icon: FileText },
    { type: 'RESEARCH_PAPER', label: 'Research Papers', icon: Sparkles },
    { type: 'THESIS_DISSERTATION', label: 'Thesis & Dissertation', icon: Award },
    { type: 'PROJECT_REPORT', label: 'Project Reports', icon: Database },
    { type: 'FACULTY_PUBLICATION', label: 'Faculty Publications', icon: GraduationCap },
    { type: 'MAGAZINE', label: 'Digital Magazines', icon: BookMarked },
    { type: 'NPTEL', label: 'NPTEL Courseware', icon: Video },
    { type: 'SWAYAM', label: 'SWAYAM MOOCs', icon: Globe },
    { type: 'NDLI', label: 'NDLI Repository', icon: Library },
    { type: 'IEEE_XPLORE', label: 'IEEE Xplore', icon: Database },
    { type: 'ACM_DIGITAL_LIBRARY', label: 'ACM Digital Library', icon: Globe },
    { type: 'SPRINGER_LINK', label: 'SpringerLink', icon: Library },
    { type: 'SCIENCE_DIRECT', label: 'ScienceDirect', icon: Sparkles },
    { type: 'JSTOR', label: 'JSTOR Archives', icon: BookOpen },
    { type: 'MULTIMEDIA', label: 'Multimedia', icon: Video },
  ];

  const totalDownloads = (state.digitalResources || []).reduce((acc, r) => acc + (r.downloadCount || 0), 0);
  const bookmarkedCount = (state.bookmarkedIds || []).length;

  return (
    <div className="space-y-8 pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-950 via-purple-950 to-indigo-950 rounded-3xl p-6 sm:p-10 text-white shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-3 max-w-3xl">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-widest text-purple-300 bg-white/10 px-3.5 py-1 rounded-full">
              <Sparkles className="h-4 w-4 text-purple-400" /> Enterprise Digital Library Vault
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-300 bg-emerald-500/20 px-3 py-1 rounded-full border border-emerald-500/30">
              <Globe className="h-3.5 w-3.5 text-emerald-400" /> Open & Subscribed Access
            </span>
          </div>
          <h1 className="text-2xl sm:text-4xl xl:text-5xl font-extrabold font-poppins tracking-tight text-white leading-tight">
            Institutional Digital Library & Learning Repositories
          </h1>
          <p className="text-purple-200 text-xs sm:text-sm leading-relaxed max-w-2xl">
            20+ integrated digital asset modules including IEEE Xplore, ACM, SpringerLink, ScienceDirect, NPTEL, SWAYAM, NDLI, daily e-newspapers, question banks, and faculty research thesis.
          </p>
        </div>

        <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 relative z-10 shrink-0">
          {/* ONLY ADMIN / STAFF can Publish Digital Assets */}
          {isAdmin && (
            <button
              onClick={() => setShowUploadModal(true)}
              className="px-4.5 py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-xs shadow-lg transition-all flex items-center gap-2 cursor-pointer active:scale-95 whitespace-nowrap"
            >
              <Plus className="h-4 w-4" /> Publish Digital Asset
            </button>
          )}

          <button
            onClick={() => setShowHistoryModal(true)}
            className="px-4 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/20 transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap"
          >
            <History className="h-4 w-4 text-purple-300" /> Download Log
          </button>

          <button
            onClick={handleRssRefresh}
            disabled={isRssRefreshing}
            className="px-4 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/20 transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap"
            title="Auto-sync daily newspaper RSS feeds"
          >
            <RefreshCw className={`h-4 w-4 text-amber-300 ${isRssRefreshing ? 'animate-spin' : ''}`} /> Sync Newspapers
          </button>
        </div>
      </div>

      {downloadToast && (
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-semibold shadow-sm animate-fadeIn">
          <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0" />
          <span>{downloadToast}</span>
        </div>
      )}

      {/* Metrics Summary Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="p-3.5 rounded-2xl bg-purple-50 text-purple-700 border border-purple-100">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Repository</p>
            <p className="text-2xl font-bold text-slate-900 font-poppins">{state.digitalResources.length} Assets</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="p-3.5 rounded-2xl bg-blue-50 text-blue-700 border border-blue-100">
            <Download className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Downloads</p>
            <p className="text-2xl font-bold text-slate-900 font-poppins">{totalDownloads}+</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="p-3.5 rounded-2xl bg-amber-50 text-amber-700 border border-amber-100">
            <Bookmark className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">My Bookmarks</p>
            <p className="text-2xl font-bold text-slate-900 font-poppins">{bookmarkedCount} Items</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="p-3.5 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-100">
            <Newspaper className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Daily e-Papers</p>
            <p className="text-2xl font-bold text-slate-900 font-poppins">{todaysNewspapers.length} Editions</p>
          </div>
        </div>
      </div>



      {/* Advanced Filter Toolbar & Multi-Criteria Search */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 space-y-4">
        {/* Search Bar & Primary Actions */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <form onSubmit={(e) => e.preventDefault()} className="flex items-center w-full md:w-auto flex-1">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-purple-600" />
              <input
                type="text"
                placeholder="Search by title, author, subject, tags, publisher, ISSN/ISBN..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-11 pr-8 py-3 rounded-l-2xl border border-r-0 border-slate-200 text-xs sm:text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 bg-slate-50/50 focus:bg-white"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full hover:bg-slate-100 cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <button
              type="submit"
              className="px-5 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-r-2xl text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
            >
              <Search className="w-4 h-4" />
              <span>Search Vault</span>
            </button>
          </form>

          <button
            onClick={() => setShowOnlyBookmarks(!showOnlyBookmarks)}
            className={`px-4 py-3 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
              showOnlyBookmarks
                ? 'bg-amber-500 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Star className={`w-4 h-4 ${showOnlyBookmarks ? 'fill-current' : 'text-amber-500'}`} />
            <span>Bookmarked Only ({bookmarkedCount})</span>
          </button>
        </div>

        {/* Secondary Dropdown Filters: Department, Semester, Year */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-100 text-xs">
          <div>
            <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1">Department</label>
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 bg-slate-50 focus:bg-white cursor-pointer"
            >
              <option value="ALL">All Departments</option>
              <option value="Computer Science & Engineering">Computer Science & Engineering</option>
              <option value="Electronics & Communication">Electronics & Communication</option>
              <option value="Electrical & Electronics">Electrical & Electronics</option>
              <option value="Mechanical Engineering">Mechanical Engineering</option>
              <option value="Management Studies">Management Studies</option>
              <option value="Mathematics & Basic Sciences">Mathematics & Basic Sciences</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1">Semester</label>
            <select
              value={selectedSemester}
              onChange={(e) => setSelectedSemester(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 bg-slate-50 focus:bg-white cursor-pointer"
            >
              <option value="ALL">All Semesters</option>
              <option value="Sem 1">Semester 1</option>
              <option value="Sem 2">Semester 2</option>
              <option value="Sem 3">Semester 3</option>
              <option value="Sem 4">Semester 4</option>
              <option value="Sem 5">Semester 5</option>
              <option value="Sem 6">Semester 6</option>
              <option value="Sem 7">Semester 7</option>
              <option value="Sem 8">Semester 8</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1">Publication Year</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 bg-slate-50 focus:bg-white cursor-pointer"
            >
              <option value="ALL">All Years</option>
              <option value="2026">2026</option>
              <option value="2025">2025</option>
              <option value="2024">2024</option>
              <option value="2023">2023</option>
            </select>
          </div>

          <div className="flex items-end">
            {(searchTerm || selectedType !== 'ALL' || selectedDepartment !== 'ALL' || selectedSemester !== 'ALL' || selectedYear !== 'ALL' || showOnlyBookmarks) && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setSelectedType('ALL');
                  setSelectedDepartment('ALL');
                  setSelectedSemester('ALL');
                  setSelectedYear('ALL');
                  setShowOnlyBookmarks(false);
                }}
                className="w-full py-2 px-3 rounded-xl bg-purple-50 text-purple-700 hover:bg-purple-100 font-bold text-xs transition-colors cursor-pointer"
              >
                Reset All Filters
              </button>
            )}
          </div>
        </div>

        {/* 20 Resource Type Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none pt-2 border-t border-slate-100 text-xs">
          {resourceCategories.map((rc) => {
            const Icon = rc.icon;
            const isSelected = selectedType === rc.type;
            return (
              <button
                key={rc.type}
                onClick={() => setSelectedType(rc.type)}
                className={`px-3.5 py-2 rounded-xl font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                  isSelected
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{rc.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Digital Resource Grid View */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredResources.map((res) => {
          const isBookmarked = (state.bookmarkedIds || []).includes(res.id);
          return (
            <div
              key={res.id}
              className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md hover:border-purple-300 transition-all space-y-4 flex flex-col justify-between relative group"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 font-mono">
                    {res.resourceType.replace(/_/g, ' ')}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-slate-400">{res.uploadDate}</span>
                    <button
                      onClick={(e) => handleToggleBookmark(e, res.id)}
                      className={`p-1.5 rounded-full transition-colors cursor-pointer ${
                        isBookmarked ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-400 hover:text-amber-500'
                      }`}
                      title={isBookmarked ? 'Bookmarked' : 'Add to bookmarks'}
                    >
                      <Star className={`w-3.5 h-3.5 ${isBookmarked ? 'fill-current' : ''}`} />
                    </button>
                  </div>
                </div>

                <div>
                  <h3 className="font-bold text-slate-900 text-base leading-snug line-clamp-2 group-hover:text-purple-700 transition-colors">
                    {res.title}
                  </h3>
                  <p className="text-xs font-semibold text-slate-600 mt-1">Author / Faculty: {res.authorName}</p>
                </div>

                <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">{res.description}</p>

                <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px] font-medium text-slate-500">
                  {res.department && <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-700">{res.department}</span>}
                  {res.semester && <span className="bg-purple-50 px-2 py-0.5 rounded text-purple-700 font-bold">{res.semester}</span>}
                  {res.year && <span className="bg-slate-100 px-2 py-0.5 rounded">{res.year}</span>}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                <div className="text-[11px] text-slate-500 font-medium">
                  <span className="font-mono">{res.fileSizeMb || 0} MB</span> | <span className="font-bold text-purple-700">{res.downloadCount} DLs</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleViewPdf(res)}
                    className="px-3 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border border-purple-200"
                    title="View PDF Document in Native Reader"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    <span>View PDF</span>
                  </button>
                  <button
                    onClick={() => handleDownload(res)}
                    className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:opacity-95 text-white font-bold text-xs shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>Download PDF</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {filteredResources.length === 0 && (
          <div className="col-span-full bg-white p-16 rounded-3xl border border-slate-200 text-center text-slate-400 font-medium space-y-2">
            <Database className="w-12 h-12 mx-auto text-purple-400 opacity-60" />
            <p className="text-lg font-bold text-slate-700">No Digital Repository Assets Found</p>
            <p className="text-xs text-slate-500">No items match your search term or department/semester filter criteria.</p>
          </div>
        )}
      </div>

      {/* Modal 1: Download History Log Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full overflow-hidden border border-slate-200">
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-purple-900 p-5 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-purple-300" />
                <h3 className="font-bold text-base font-poppins text-white">Digital Library Download Audit Logs</h3>
              </div>
              <button onClick={() => setShowHistoryModal(false)} className="text-slate-400 hover:text-white p-1 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 max-h-[70vh] overflow-y-auto space-y-4 text-xs">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 font-bold text-slate-500 uppercase text-[10px]">
                    <th className="p-3">User</th>
                    <th className="p-3">Resource Title</th>
                    <th className="p-3">Type</th>
                    <th className="p-3">Size</th>
                    <th className="p-3 text-right">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {(state.downloadLogs || []).map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50">
                      <td className="p-3 font-bold text-slate-900">{log.userName} ({log.userRole})</td>
                      <td className="p-3 text-slate-800 max-w-xs truncate">{log.resourceTitle}</td>
                      <td className="p-3"><span className="px-2 py-0.5 rounded bg-purple-50 text-purple-700 font-mono text-[10px]">{log.resourceType}</span></td>
                      <td className="p-3 font-mono">{log.fileSizeMb} MB</td>
                      <td className="p-3 text-right font-mono text-slate-500">{log.timestamp}</td>
                    </tr>
                  ))}
                  {(!state.downloadLogs || state.downloadLogs.length === 0) && (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-400 font-medium">
                        No download history logged yet in current session.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: Admin Publish Asset Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full p-6 space-y-4 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-purple-600" />
                <h2 className="text-lg font-bold font-poppins text-slate-900">Publish Digital Resource (Admin Access)</h2>
              </div>
              <button onClick={() => setShowUploadModal(false)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {!isAdmin ? (
              <div className="p-6 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 space-y-2 text-xs font-semibold">
                <div className="flex items-center gap-2 text-rose-900 font-bold">
                  <Lock className="w-4 h-4" /> Restricted Access
                </div>
                <p>Only the Chief Admin Librarian has permission to publish, modify, or delete digital library assets.</p>
              </div>
            ) : (
              <form onSubmit={handleUploadSubmit} className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Document Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Artificial Intelligence & Edge Computing Research Paper"
                    value={uploadTitle}
                    onChange={(e) => setUploadTitle(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Resource Category</label>
                    <select
                      value={uploadType}
                      onChange={(e) => setUploadType(e.target.value as DigitalResourceType)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold bg-slate-50"
                    >
                      <option value="RESEARCH_PAPER">Research Paper</option>
                      <option value="FACULTY_PUBLICATION">Faculty Publication</option>
                      <option value="LECTURE_NOTES">Lecture Notes</option>
                      <option value="QUESTION_PAPER">Question Paper</option>
                      <option value="EBOOK">E-Book</option>
                      <option value="THESIS_DISSERTATION">Thesis & Dissertation</option>
                      <option value="PROJECT_REPORT">Project Report</option>
                      <option value="JOURNAL">E-Journal</option>
                      <option value="NEWSPAPER">Digital Newspaper</option>
                      <option value="SYLLABUS">Syllabus</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Department</label>
                    <select
                      value={uploadDept}
                      onChange={(e) => setUploadDept(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold bg-slate-50"
                    >
                      <option value="Computer Science & Engineering">Computer Science & Engineering</option>
                      <option value="Electronics & Communication">Electronics & Communication</option>
                      <option value="Electrical & Electronics">Electrical & Electronics</option>
                      <option value="Mechanical Engineering">Mechanical Engineering</option>
                      <option value="Management Studies">Management Studies</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Author / Faculty Name</label>
                    <input
                      type="text"
                      value={uploadAuthor}
                      onChange={(e) => setUploadAuthor(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Subject</label>
                    <input
                      type="text"
                      placeholder="e.g. Machine Learning"
                      value={uploadSubject}
                      onChange={(e) => setUploadSubject(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">External Resource URL / Link (Optional)</label>
                  <input
                    type="url"
                    placeholder="https://ieeexplore.ieee.org or https://nptel.ac.in"
                    value={uploadExternalUrl}
                    onChange={(e) => setUploadExternalUrl(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Abstract Description</label>
                  <textarea
                    rows={3}
                    placeholder="Provide an overview description of the digital document..."
                    value={uploadDescription}
                    onChange={(e) => setUploadDescription(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowUploadModal(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-purple-600 text-white text-xs font-bold shadow-md hover:bg-purple-700 cursor-pointer"
                  >
                    Publish Asset
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
