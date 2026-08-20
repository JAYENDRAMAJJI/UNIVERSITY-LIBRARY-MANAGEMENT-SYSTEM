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
  UploadCloud,
} from 'lucide-react';
import { libraryStore } from '../services/libraryStore.service';
import { useAuth } from '../context/AuthContext';
import { DigitalResource, DigitalResourceType } from '../types/library';
import { getDigitalResourceBlobUrl, downloadDigitalResource } from '../utils/digitalPdfGenerator';

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
  const [uploadPublisher, setUploadPublisher] = useState('University Press & Academic Library');
  const [uploadIssnIsbn, setUploadIssnIsbn] = useState('');
  const [uploadSubject, setUploadSubject] = useState('');
  const [uploadSemester, setUploadSemester] = useState('Sem 4');
  const [uploadYear, setUploadYear] = useState<string | number>(2026);
  const [uploadAccessLevel, setUploadAccessLevel] = useState<'OPEN_ACCESS' | 'CAMPUS_ONLY' | 'SUBSCRIBED' | 'RESTRICTED'>('OPEN_ACCESS');
  const [uploadDescription, setUploadDescription] = useState('');
  const [uploadSnippet, setUploadSnippet] = useState('');
  const [uploadExternalUrl, setUploadExternalUrl] = useState('');
  const [uploadedFileData, setUploadedFileData] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [uploadFileSizeMb, setUploadFileSizeMb] = useState<number>(3.5);

  useEffect(() => {
    const sub = libraryStore.getObservable().subscribe(setState);
    return () => sub.unsubscribe();
  }, []);

  const handleModalFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFileName(file.name);
      const sizeMb = Number((file.size / (1024 * 1024)).toFixed(2)) || 2.5;
      setUploadFileSizeMb(sizeMb);
      if (!uploadTitle.trim()) {
        setUploadTitle(file.name.replace(/\.[^/.]+$/, '').replace(/_/g, ' '));
      }
      const dataReader = new FileReader();
      dataReader.onload = (event) => {
        setUploadedFileData(event.target?.result as string);
      };
      dataReader.readAsDataURL(file);
    }
  };

  // Direct "View PDF": Opens native browser PDF viewer in a new tab with REAL uploaded PDF
  const handleViewPdf = (res: DigitalResource) => {
    if (!user) {
      navigate('/login', { state: { from: location } });
      return;
    }
    const pdfUrl = getDigitalResourceBlobUrl(res);
    window.open(pdfUrl, '_blank');
  };

  // Direct "Download PDF": Downloads the EXACT uploaded PDF file
  const handleDownload = (res: DigitalResource) => {
    if (!user) {
      navigate('/login', { state: { from: location } });
      return;
    }
    libraryStore.incrementDownload(res.id, user);
    downloadDigitalResource(res);
    setDownloadToast(`Downloaded "${res.title}" (${res.fileSizeMb || 0} MB). Saved to your downloads!`);
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
        publisherName: uploadPublisher.trim() || 'University Press & Academic Library',
        issnIsbn: uploadIssnIsbn.trim() || undefined,
        fileUrl: uploadExternalUrl.trim() || '/docs/sample-paper.pdf',
        fileSizeMb: uploadFileSizeMb,
        uploadedFileData: uploadedFileData || undefined,
        uploadedFileName: uploadedFileName || undefined,
        fileMimeType: 'application/pdf',
        department: uploadDept,
        subject: uploadSubject || 'General Studies',
        semester: uploadSemester,
        year: Number(uploadYear) || 2026,
        description: uploadDescription || 'Admin published academic digital resource.',
        contentSnippet: uploadSnippet.trim() || undefined,
        accessLevel: uploadAccessLevel,
        externalUrl: uploadExternalUrl.trim() || undefined,
      },
      user || undefined
    );

    // Reset upload state
    setUploadedFileData(null);
    setUploadedFileName(null);
    setUploadTitle('');
    setUploadDescription('');
    setUploadExternalUrl('');
    setShowUploadModal(false);
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

  // Categories list with simplified easy names
  const resourceCategories: Array<{ type: string; label: string; icon: React.ComponentType<any> }> = [
    { type: 'ALL', label: 'All Assets', icon: Layers },
    { type: 'NEWSPAPER', label: 'Newspapers', icon: Newspaper },
    { type: 'EBOOK', label: 'E-Books', icon: BookOpen },
    { type: 'JOURNAL', label: 'E-Journals', icon: FileText },
    { type: 'QUESTION_PAPER', label: 'Question Papers', icon: GraduationCap },
    { type: 'SYLLABUS', label: 'Syllabus', icon: FileCode },
    { type: 'LECTURE_NOTES', label: 'Lecture Notes', icon: FileText },
    { type: 'RESEARCH_PAPER', label: 'Research Papers', icon: Sparkles },
    { type: 'THESIS_DISSERTATION', label: 'Theses & Dissertations', icon: Award },
    { type: 'PROJECT_REPORT', label: 'Project Reports', icon: Database },
    { type: 'FACULTY_PUBLICATION', label: 'Faculty Papers', icon: GraduationCap },
    { type: 'MAGAZINE', label: 'Magazines', icon: BookMarked },
    { type: 'NPTEL', label: 'NPTEL', icon: Video },
    { type: 'SWAYAM', label: 'SWAYAM', icon: Globe },
    { type: 'NDLI', label: 'NDLI', icon: Library },
    { type: 'IEEE_XPLORE', label: 'IEEE Xplore', icon: Database },
    { type: 'ACM_DIGITAL_LIBRARY', label: 'ACM Library', icon: Globe },
    { type: 'SPRINGER_LINK', label: 'SpringerLink', icon: Library },
    { type: 'SCIENCE_DIRECT', label: 'ScienceDirect', icon: Sparkles },
    { type: 'JSTOR', label: 'JSTOR', icon: BookOpen },
    { type: 'MULTIMEDIA', label: 'Videos & Media', icon: Video },
  ];

  const totalDownloads = (state.digitalResources || []).reduce((acc, r) => acc + (r.downloadCount || 0), 0);
  const bookmarkedCount = (state.bookmarkedIds || []).length;

  return (
    <div className="space-y-8 pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-950 via-indigo-950 to-blue-900 rounded-2xl p-5 sm:p-6 lg:p-7 text-white shadow-lg flex flex-col lg:flex-row lg:items-center justify-between gap-5 relative overflow-hidden border border-slate-800/80">
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-48 h-48 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 space-y-2 max-w-3xl">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-blue-300 bg-white/10 px-3 py-1 rounded-full border border-blue-400/20 shadow-xs backdrop-blur-xs">
              <Sparkles className="h-3.5 w-3.5 text-blue-300" /> Digital Resource Hub & Control
            </span>
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-300 bg-emerald-500/15 px-2.5 py-1 rounded-full border border-emerald-400/30 shadow-xs backdrop-blur-xs">
              <Globe className="h-3 w-3 text-emerald-400" /> Open & Subscribed Access
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold font-poppins tracking-tight text-white leading-tight">
            Digital Resource Hub & <span className="bg-gradient-to-r from-blue-300 via-indigo-200 to-sky-200 bg-clip-text text-transparent">Learning Repositories</span>
          </h1>
          <p className="text-slate-300 text-xs sm:text-sm leading-relaxed max-w-2xl font-medium">
            20+ integrated digital asset modules including IEEE Xplore, ACM, SpringerLink, ScienceDirect, NPTEL, SWAYAM, NDLI, daily e-newspapers, question banks, and faculty research thesis.
          </p>
        </div>

        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 relative z-10 shrink-0">
          {/* ONLY ADMIN / STAFF can Publish Digital Assets */}
          {isAdmin && (
            <button
              onClick={() => setShowUploadModal(true)}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs shadow-md shadow-blue-500/25 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 whitespace-nowrap border border-blue-400/30"
            >
              <Plus className="h-3.5 w-3.5" /> Publish Digital Asset
            </button>
          )}

          <button
            onClick={() => setShowHistoryModal(true)}
            className="px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-blue-400/20 backdrop-blur-md transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap shadow-xs"
          >
            <History className="h-3.5 w-3.5 text-blue-300" /> Download Log
          </button>

          <button
            onClick={handleRssRefresh}
            disabled={isRssRefreshing}
            className="px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-blue-400/20 backdrop-blur-md transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap shadow-xs"
            title="Auto-sync daily newspaper RSS feeds"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-amber-300 ${isRssRefreshing ? 'animate-spin' : ''}`} /> Sync Newspapers
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

        {/* Dropdown Filters: Category, Department, Semester, Year */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3 pt-3 border-t border-slate-100 text-xs">
          <div>
            <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1">Resource Category</label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 bg-slate-50 focus:bg-white cursor-pointer"
            >
              {resourceCategories.map((rc) => (
                <option key={rc.type} value={rc.type}>
                  {rc.label}
                </option>
              ))}
            </select>
          </div>

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
                Reset Filters
              </button>
            )}
          </div>
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
                      {resourceCategories.map((rc) => (
                        <option key={rc.type} value={rc.type}>
                          {rc.label}
                        </option>
                      ))}
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
                      <option value="Mathematics & Basic Sciences">Mathematics & Basic Sciences</option>
                      <option value="All Departments">All Departments</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Author / Faculty Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Prof. R. Vance"
                      value={uploadAuthor}
                      onChange={(e) => setUploadAuthor(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Subject / Domain</label>
                    <input
                      type="text"
                      placeholder="e.g. VLSI Circuit Design"
                      value={uploadSubject}
                      onChange={(e) => setUploadSubject(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold"
                    />
                  </div>
                </div>

                {/* Publisher & ISSN / ISBN */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Publisher / Institution</label>
                    <input
                      type="text"
                      placeholder="e.g. IEEE Press, Pearson, MIT Press, Springer"
                      value={uploadPublisher}
                      onChange={(e) => setUploadPublisher(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">ISSN / ISBN / DOI (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. ISBN 978-0134685991, ISSN 0975-8887"
                      value={uploadIssnIsbn}
                      onChange={(e) => setUploadIssnIsbn(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold font-mono"
                    />
                  </div>
                </div>

                {/* Semester, Year & Access Rights */}
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Target Semester</label>
                    <select
                      value={uploadSemester}
                      onChange={(e) => setUploadSemester(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold bg-slate-50"
                    >
                      <option value="Sem 1">Semester 1</option>
                      <option value="Sem 2">Semester 2</option>
                      <option value="Sem 3">Semester 3</option>
                      <option value="Sem 4">Semester 4</option>
                      <option value="Sem 5">Semester 5</option>
                      <option value="Sem 6">Semester 6</option>
                      <option value="Sem 7">Semester 7</option>
                      <option value="Sem 8">Semester 8</option>
                      <option value="All Semesters">All Semesters</option>
                      <option value="Faculty Research">Faculty Research</option>
                      <option value="Doctoral / Ph.D.">Doctoral / Ph.D.</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Publication Year</label>
                    <input
                      type="number"
                      min={1900}
                      max={2099}
                      placeholder="e.g. 2026"
                      value={uploadYear}
                      onChange={(e) => setUploadYear(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Access Rights</label>
                    <select
                      value={uploadAccessLevel}
                      onChange={(e) => setUploadAccessLevel(e.target.value as any)}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold bg-slate-50"
                    >
                      <option value="OPEN_ACCESS">🌐 Open Access</option>
                      <option value="CAMPUS_ONLY">🏫 Campus Wi-Fi Only</option>
                      <option value="SUBSCRIBED">🔐 Subscribed Only</option>
                      <option value="RESTRICTED">🔒 Faculty Only</option>
                    </select>
                  </div>
                </div>

                {/* Attach File Option */}
                <div className="space-y-1">
                  <label className="block font-bold text-slate-700">Attach Document File (PDF, DOCX, EPUB)</label>
                  <label className="flex items-center justify-between p-3 border-2 border-dashed border-purple-200 hover:border-purple-500 rounded-xl bg-purple-50/40 hover:bg-purple-50 transition-all cursor-pointer">
                    <div className="flex items-center gap-2.5">
                      <UploadCloud className="w-4 h-4 text-purple-600 shrink-0" />
                      <span className="text-xs font-semibold text-slate-700">
                        {uploadedFileName ? (
                          <span className="text-purple-700 font-bold">{uploadedFileName} ({uploadFileSizeMb} MB)</span>
                        ) : (
                          'Click to select PDF/DOCX file from computer'
                        )}
                      </span>
                    </div>
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,.epub,.pptx,.zip,.csv"
                      onChange={handleModalFileChange}
                      className="hidden"
                    />
                    <span className="text-[11px] font-bold text-purple-600 bg-white px-2.5 py-1 rounded-lg border border-purple-200 shadow-2xs">
                      {uploadedFileName ? 'Change File' : 'Browse File'}
                    </span>
                  </label>
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

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Abstract Description</label>
                    <textarea
                      rows={2}
                      placeholder="Summary overview of the digital document..."
                      value={uploadDescription}
                      onChange={(e) => setUploadDescription(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Key Excerpt / Content Snippet</label>
                    <textarea
                      rows={2}
                      placeholder="Formulas, key takeaways, chapter summary..."
                      value={uploadSnippet}
                      onChange={(e) => setUploadSnippet(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold"
                    />
                  </div>
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
