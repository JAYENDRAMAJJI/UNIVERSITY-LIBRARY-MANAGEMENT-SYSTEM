import React, { useState, useEffect, useMemo } from 'react';
import {
  Download,
  FileText,
  UploadCloud,
  Plus,
  CheckCircle,
  Search,
  X,
  Archive,
  Trash2,
  Edit3,
  RefreshCw,
  FileSpreadsheet,
  Layers,
  Globe,
  Newspaper,
  BookOpen,
  Eye,
  History,
  ShieldCheck,
  Sparkles,
  Filter,
  ChevronDown,
  RotateCcw,
  Tag,
  GraduationCap,
} from 'lucide-react';
import { libraryStore } from '../../services/libraryStore.service';
import { useAuth } from '../../context/AuthContext';
import { DigitalResource, DigitalResourceType } from '../../types/library';

export default function DigitalLibraryAdmin() {
  const { user } = useAuth();
  const [state, setState] = useState(libraryStore.snapshot);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [editingResource, setEditingResource] = useState<DigitalResource | null>(null);
  const [previewDoc, setPreviewDoc] = useState<{
    title: string;
    author: string;
    url: string;
    department: string;
    type: string;
    description?: string;
    fileName?: string;
    fileObject?: File | null;
    textContent?: string | null;
  } | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isRssRefreshing, setIsRssRefreshing] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [resourceType, setResourceType] = useState<DigitalResourceType>('RESEARCH_PAPER');
  const [categoryName, setCategoryName] = useState('Computer Science & Engineering');
  const [authorName, setAuthorName] = useState('');
  const [department, setDepartment] = useState('Computer Science & Engineering');
  const [subject, setSubject] = useState('');
  const [semester, setSemester] = useState('Sem 4');
  const [year, setYear] = useState(2026);
  const [description, setDescription] = useState('');
  const [externalUrl, setExternalUrl] = useState('');
  const [accessLevel, setAccessLevel] = useState<'OPEN_ACCESS' | 'CAMPUS_ONLY' | 'SUBSCRIBED' | 'RESTRICTED'>('OPEN_ACCESS');
  const [uploadMode, setUploadMode] = useState<'FILE' | 'URL'>('FILE');
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [uploadedFileSize, setUploadedFileSize] = useState<string | null>(null);
  const [uploadedFileObject, setUploadedFileObject] = useState<File | null>(null);
  const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null);
  const [uploadedFileText, setUploadedFileText] = useState<string | null>(null);

  // Filters State
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [archiveFilter, setArchiveFilter] = useState<'ACTIVE' | 'ARCHIVED' | 'ALL'>('ACTIVE');

  useEffect(() => {
    const sub = libraryStore.getObservable().subscribe(setState);
    return () => sub.unsubscribe();
  }, []);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFileName(file.name);
      setUploadedFileObject(file);
      const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
      setUploadedFileSize(`${sizeMb} MB`);
      const blobUrl = URL.createObjectURL(file);
      setPreviewBlobUrl(blobUrl);
      setExternalUrl(blobUrl);

      if (file.type.startsWith('text/') || file.name.endsWith('.txt') || file.name.endsWith('.csv') || file.name.endsWith('.json') || file.name.endsWith('.md')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          setUploadedFileText(event.target?.result as string);
        };
        reader.readAsText(file);
      } else {
        setUploadedFileText(null);
      }
    }
  };

  const handleOpenUploadModal = (resToEdit?: DigitalResource) => {
    if (resToEdit) {
      setEditingResource(resToEdit);
      setTitle(resToEdit.title);
      setResourceType(resToEdit.resourceType);
      setCategoryName(resToEdit.categoryName);
      setAuthorName(resToEdit.authorName);
      setDepartment(resToEdit.department || 'Computer Science & Engineering');
      setSubject(resToEdit.subject || '');
      setSemester(resToEdit.semester || 'Sem 4');
      setYear(resToEdit.year || 2026);
      setDescription(resToEdit.description || '');
      setExternalUrl(resToEdit.externalUrl || '');
      setAccessLevel(resToEdit.accessLevel || 'OPEN_ACCESS');
      setUploadedFileName(resToEdit.externalUrl ? resToEdit.externalUrl.split('/').pop() || null : null);
      setUploadedFileSize(resToEdit.fileSizeMb ? `${resToEdit.fileSizeMb} MB` : '2.4 MB');
      setUploadedFileObject(null);
      setPreviewBlobUrl(resToEdit.externalUrl || null);
      setUploadedFileText(null);
      setUploadMode(resToEdit.externalUrl?.startsWith('http') ? 'URL' : 'FILE');
    } else {
      setEditingResource(null);
      setTitle('');
      setResourceType('RESEARCH_PAPER');
      setCategoryName('Computer Science & Engineering');
      setAuthorName(user?.name || 'Librarian Officer');
      setDepartment('Computer Science & Engineering');
      setSubject('');
      setSemester('Sem 4');
      setYear(2026);
      setDescription('');
      setExternalUrl('');
      setAccessLevel('OPEN_ACCESS');
      setUploadedFileName(null);
      setUploadedFileSize(null);
      setUploadedFileObject(null);
      setPreviewBlobUrl(null);
      setUploadedFileText(null);
      setUploadMode('FILE');
    }
    setShowUploadModal(true);
  };

  const handleSaveResource = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const calcFileSizeMb = uploadedFileObject ? Number((uploadedFileObject.size / (1024 * 1024)).toFixed(1)) : 3.5;

    if (editingResource) {
      const res = libraryStore.updateDigitalResource(
        editingResource.id,
        {
          title: title.trim(),
          resourceType,
          categoryName: department,
          authorName: authorName.trim(),
          department,
          subject,
          semester,
          year: Number(year),
          description,
          externalUrl: externalUrl.trim() || undefined,
          accessLevel,
          fileSizeMb: calcFileSizeMb,
        },
        user || undefined
      );
      triggerToast(res.message);
    } else {
      const res = libraryStore.addDigitalResource(
        {
          title: title.trim(),
          resourceType,
          categoryName: department,
          authorName: authorName.trim() || 'Librarian Officer',
          fileUrl: externalUrl.trim() || '/docs/digital-paper.pdf',
          fileSizeMb: calcFileSizeMb,
          department,
          subject: subject || 'General Studies',
          semester,
          year: Number(year),
          description,
          externalUrl: externalUrl.trim() || undefined,
          accessLevel,
        },
        user || undefined
      );
      triggerToast(res.message);
    }

    setShowUploadModal(false);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to permanently delete this digital resource?')) {
      const res = libraryStore.deleteDigitalResource(id, user || undefined);
      triggerToast(res.message);
    }
  };

  const handleArchiveToggle = (id: string) => {
    const res = libraryStore.archiveDigitalResource(id, user || undefined);
    triggerToast(res.message);
  };

  const handleRssSync = async () => {
    setIsRssRefreshing(true);
    const res = await libraryStore.fetchNewspaperFeeds();
    setIsRssRefreshing(false);
    triggerToast(`Auto-synced today's digital e-paper RSS feeds (${res.todayStr})`);
  };

  const handleExportCSV = () => {
    libraryStore.exportDigitalLibraryReportCSV(filteredDigitalResources);
  };

  const filteredDigitalResources = useMemo(() => {
    return (state.digitalResources || []).filter((res) => {
      // Search
      const q = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !q ||
        res.title.toLowerCase().includes(q) ||
        res.authorName.toLowerCase().includes(q) ||
        res.categoryName.toLowerCase().includes(q) ||
        (res.department && res.department.toLowerCase().includes(q)) ||
        (res.subject && res.subject.toLowerCase().includes(q));

      // Type Filter
      const matchesType = typeFilter === 'ALL' || res.resourceType === typeFilter;

      // Archive Filter
      let matchesArchive = true;
      if (archiveFilter === 'ACTIVE') {
        matchesArchive = !res.isArchived;
      } else if (archiveFilter === 'ARCHIVED') {
        matchesArchive = Boolean(res.isArchived);
      }

      return matchesSearch && matchesType && matchesArchive;
    });
  }, [state.digitalResources, searchTerm, typeFilter, archiveFilter]);

  const totalDownloadsCount = (state.digitalResources || []).reduce((acc, r) => acc + (r.downloadCount || 0), 0);
  const archivedCount = (state.digitalResources || []).filter((r) => r.isArchived).length;
  const activeCount = (state.digitalResources || []).filter((r) => !r.isArchived).length;

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-purple-700 bg-purple-50 px-3 py-1 rounded-full mb-2">
            <Download className="h-3.5 w-3.5" /> Digital Resource Hub & Control
          </div>
          <h1 className="text-2xl font-bold font-poppins text-slate-900">Digital Resource Hub & Control</h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage 20+ digital resource categories, RSS newspaper sync, document archival, access rights, and usage telemetry reports.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            onClick={handleRssSync}
            disabled={isRssRefreshing}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-amber-200 bg-amber-50 text-amber-900 font-bold text-xs hover:bg-amber-100 transition-all cursor-pointer"
            title="Fetch today's RSS e-paper feeds"
          >
            <RefreshCw className={`h-4 w-4 text-amber-600 ${isRssRefreshing ? 'animate-spin' : ''}`} />
            <span>Sync Daily RSS</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 font-bold text-xs hover:bg-slate-100 transition-all cursor-pointer"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-600" /> Export Report CSV
          </button>

          <button
            onClick={() => handleOpenUploadModal()}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 text-white font-bold text-xs shadow-md hover:bg-purple-700 cursor-pointer"
          >
            <Plus className="h-4 w-4" /> Publish Digital Asset
          </button>
        </div>
      </div>

      {toastMessage && (
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-semibold shadow-xs animate-fadeIn">
          <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Admin Telemetry Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="p-3.5 rounded-2xl bg-purple-50 text-purple-700">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Active Assets</p>
            <p className="text-2xl font-extrabold text-slate-900 font-poppins">{activeCount} Items</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="p-3.5 rounded-2xl bg-blue-50 text-blue-700">
            <Download className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Downloads</p>
            <p className="text-2xl font-extrabold text-slate-900 font-poppins">{totalDownloadsCount}+</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="p-3.5 rounded-2xl bg-amber-50 text-amber-700">
            <Archive className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Archived Assets</p>
            <p className="text-2xl font-extrabold text-slate-900 font-poppins">{archivedCount} Items</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="p-3.5 rounded-2xl bg-emerald-50 text-emerald-700">
            <Newspaper className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Daily e-Papers</p>
            <p className="text-2xl font-extrabold text-slate-900 font-poppins">
              {state.digitalResources.filter((r) => r.resourceType === 'NEWSPAPER').length} Papers
            </p>
          </div>
        </div>
      </div>

      {/* Integrated Toolbar Filters */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        {/* Top Controls: Search Bar + Segmented Status Switcher */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Search Bar */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-purple-500" />
            <input
              type="text"
              placeholder="Search digital assets by title, author, department, subject..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-9 py-2.5 rounded-2xl border border-slate-200 text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 bg-slate-50/60 focus:bg-white transition-all shadow-xs"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
                title="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Status Filter Segmented Control */}
          <div className="bg-slate-100/90 p-1 rounded-2xl flex items-center gap-1 shrink-0 border border-slate-200/60 shadow-xs">
            {[
              { id: 'ACTIVE', label: `Active (${activeCount})` },
              { id: 'ARCHIVED', label: `Archived (${archivedCount})` },
              { id: 'ALL', label: `All (${state.digitalResources.length})` },
            ].map((af) => (
              <button
                key={af.id}
                type="button"
                onClick={() => setArchiveFilter(af.id as any)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  archiveFilter === af.id
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                {af.label}
              </button>
            ))}
          </div>
        </div>

        {/* Category Filter Dropdown & Quick Access Tags */}
        <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-[260px]">
            <div className="relative flex-1 sm:flex-initial min-w-[220px]">
              <Filter className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-purple-600 pointer-events-none" />
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full pl-9 pr-8 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all cursor-pointer shadow-xs appearance-none"
              >
                <option value="ALL">📁 All Categories ({state.digitalResources.length})</option>
                <option value="RESEARCH_PAPER">📄 Research Papers</option>
                <option value="EBOOK">📚 E-Books</option>
                <option value="QUESTION_PAPER">📝 Question Papers</option>
                <option value="SYLLABUS">📋 Syllabus</option>
                <option value="LECTURE_NOTES">📒 Lecture Notes</option>
                <option value="NEWSPAPER">📰 Newspapers & E-Papers</option>
                <option value="NPTEL">💻 NPTEL Courseware</option>
                <option value="SWAYAM">🎓 SWAYAM MOOCs</option>
                <option value="IEEE_XPLORE">⚡ IEEE Xplore</option>
                <option value="THESIS_DISSERTATION">🎓 Research & Academic Theses</option>
                <option value="PROJECT_REPORT">📂 Project Reports</option>
                <option value="FACULTY_PUBLICATION">🖋️ Faculty Publications</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            </div>

            {/* Quick Access Filter Tags */}
            <div className="hidden md:flex items-center gap-1.5 text-xs">
              {[
                { id: 'ALL', label: 'All' },
                { id: 'RESEARCH_PAPER', label: 'Research' },
                { id: 'EBOOK', label: 'E-Books' },
                { id: 'THESIS_DISSERTATION', label: 'Theses' },
                { id: 'NEWSPAPER', label: 'Newspapers' },
              ].map((qp) => (
                <button
                  key={qp.id}
                  type="button"
                  onClick={() => setTypeFilter(qp.id)}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer text-xs ${
                    typeFilter === qp.id
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {qp.label}
                </button>
              ))}
            </div>
          </div>

          {(typeFilter !== 'ALL' || searchTerm) && (
            <button
              type="button"
              onClick={() => {
                setTypeFilter('ALL');
                setSearchTerm('');
              }}
              className="inline-flex items-center gap-1 text-xs font-bold text-purple-600 hover:text-purple-800 bg-purple-50 hover:bg-purple-100 px-3.5 py-1.5 rounded-xl transition-all border border-purple-200 cursor-pointer ml-auto"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Reset Filters</span>
            </button>
          )}
        </div>
      </div>

      {/* Resource Cards Table & Actions */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold">
                <th className="p-4">Document Title & Author</th>
                <th className="p-4">Category / Type</th>
                <th className="p-4">Department & Subject</th>
                <th className="p-4">Access Rights</th>
                <th className="p-4">Size & Downloads</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredDigitalResources.map((res) => (
                <tr key={res.id} className={`hover:bg-slate-50 transition-colors ${res.isArchived ? 'opacity-60 bg-slate-50/50' : ''}`}>
                  <td className="p-4 max-w-sm">
                    <p className="font-bold text-slate-900 text-sm line-clamp-2">{res.title}</p>
                    <p className="text-slate-500 font-medium">By {res.authorName}</p>
                  </td>
                  <td className="p-4">
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase bg-purple-100 text-purple-800 font-mono">
                      {res.resourceType.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="p-4 font-medium">
                    <p className="text-slate-800 font-bold">{res.department || res.categoryName}</p>
                    <p className="text-slate-500">{res.subject || 'General'}</p>
                  </td>
                  <td className="p-4">
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                      {res.accessLevel || 'OPEN_ACCESS'}
                    </span>
                  </td>
                  <td className="p-4 font-mono">
                    <p className="text-slate-800 font-bold">{res.fileSizeMb || 0} MB</p>
                    <p className="text-purple-700 font-bold">{res.downloadCount} DLs</p>
                  </td>
                  <td className="p-4 text-right space-x-1 whitespace-nowrap">
                    <button
                      onClick={() => setPreviewDoc({
                        title: res.title,
                        author: res.authorName,
                        url: res.externalUrl,
                        department: res.department || res.categoryName,
                        type: res.resourceType,
                        description: res.description
                      })}
                      className="p-2 rounded-xl text-slate-600 hover:text-purple-700 hover:bg-purple-50 transition-colors cursor-pointer"
                      title="Preview Document File"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleOpenUploadModal(res)}
                      className="p-2 rounded-xl text-slate-600 hover:text-purple-700 hover:bg-purple-50 transition-colors cursor-pointer"
                      title="Edit Document Metadata"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleArchiveToggle(res.id)}
                      className={`p-2 rounded-xl transition-colors cursor-pointer ${
                        res.isArchived ? 'text-amber-600 bg-amber-50 hover:bg-amber-100' : 'text-slate-600 hover:text-amber-700 hover:bg-amber-50'
                      }`}
                      title={res.isArchived ? 'Unarchive Asset' : 'Archive Asset'}
                    >
                      <Archive className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(res.id)}
                      className="p-2 rounded-xl text-slate-600 hover:text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
                      title="Delete Asset Permanently"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredDigitalResources.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-slate-400 font-medium">
                    No digital repository resources match your search or archive filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Publish / Edit Digital Document */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl sm:max-w-3xl w-full border border-slate-200 flex flex-col max-h-[88vh] my-auto overflow-hidden">
            {/* Fixed Header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-white shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-2xl bg-purple-50 text-purple-600">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold font-poppins text-slate-900 leading-tight">
                    {editingResource ? 'Edit Digital Resource Metadata' : 'Publish New Digital Resource'}
                  </h2>
                  <p className="text-xs text-slate-500">Update catalog parameters, institutional access, and file links</p>
                </div>
              </div>
              <button
                onClick={() => setShowUploadModal(false)}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form onSubmit={handleSaveResource} className="p-6 overflow-y-auto space-y-4 text-xs flex-1">
              {/* Document Title */}
              <div>
                <label className="block font-bold text-slate-800 mb-1.5 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-purple-600" />
                  <span>Document Title *</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ph.D. Thesis: Distributed Blockchain Consensus Mechanisms for IoT"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 bg-slate-50/50 focus:bg-white transition-all shadow-xs"
                />
              </div>

              {/* Category & Department */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-800 mb-1.5 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-purple-600" />
                    <span>Resource Category Type</span>
                  </label>
                  <select
                    value={resourceType}
                    onChange={(e) => setResourceType(e.target.value as DigitalResourceType)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 bg-slate-50/70 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 cursor-pointer shadow-xs"
                  >
                    <option value="RESEARCH_PAPER">📄 Research Paper</option>
                    <option value="IEEE_XPLORE">⚡ IEEE Xplore</option>
                    <option value="ACM_DIGITAL_LIBRARY">🌐 ACM Digital Library</option>
                    <option value="SPRINGER_LINK">📚 SpringerLink</option>
                    <option value="SCIENCE_DIRECT">🔬 ScienceDirect</option>
                    <option value="JSTOR">🏛️ JSTOR Archives</option>
                    <option value="NPTEL">💻 NPTEL Courseware</option>
                    <option value="SWAYAM">🎓 SWAYAM MOOC</option>
                    <option value="NDLI">📖 NDLI Repository</option>
                    <option value="QUESTION_PAPER">📝 Question Paper</option>
                    <option value="SYLLABUS">📋 Syllabus</option>
                    <option value="LECTURE_NOTES">📒 Lecture Notes</option>
                    <option value="EBOOK">📕 E-Book</option>
                    <option value="JOURNAL">📰 E-Journal</option>
                    <option value="THESIS_DISSERTATION">🎓 Research & Academic Theses</option>
                    <option value="PROJECT_REPORT">📂 Project Report</option>
                    <option value="FACULTY_PUBLICATION">🖋️ Faculty Publication</option>
                    <option value="NEWSPAPER">🗞️ Digital Newspaper</option>
                    <option value="MAGAZINE">📙 Digital Magazine</option>
                    <option value="MULTIMEDIA">🎥 Multimedia</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1.5 flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-purple-600" />
                    <span>Department</span>
                  </label>
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 bg-slate-50/70 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 cursor-pointer shadow-xs"
                  >
                    <option value="Computer Science & Engineering">Computer Science & Engineering</option>
                    <option value="Electronics & Communication">Electronics & Communication</option>
                    <option value="Electrical & Electronics">Electrical & Electronics</option>
                    <option value="Mechanical Engineering">Mechanical Engineering</option>
                    <option value="Management Studies">Management Studies</option>
                    <option value="Mathematics & Basic Sciences">Mathematics & Basic Sciences</option>
                  </select>
                </div>
              </div>

              {/* Author & Subject */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-800 mb-1.5 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                    <span>Author / Faculty</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Dr. Jayendra Majji"
                    value={authorName}
                    onChange={(e) => setAuthorName(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 bg-slate-50/50 focus:bg-white transition-all shadow-xs"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-800 mb-1.5 flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-purple-600" />
                    <span>Subject / Discipline</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Cyber Security & Cryptography"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 bg-slate-50/50 focus:bg-white transition-all shadow-xs"
                  />
                </div>
              </div>

              {/* Semester & Access Level */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-800 mb-1.5 flex items-center gap-1.5">
                    <GraduationCap className="w-3.5 h-3.5 text-purple-600" />
                    <span>Target Semester</span>
                  </label>
                  <select
                    value={semester}
                    onChange={(e) => setSemester(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 bg-slate-50/70 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 cursor-pointer shadow-xs"
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
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1.5 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
                    <span>Access Rights / Permission</span>
                  </label>
                  <select
                    value={accessLevel}
                    onChange={(e) => setAccessLevel(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 bg-slate-50/70 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 cursor-pointer shadow-xs"
                  >
                    <option value="OPEN_ACCESS">🌐 Open Access (All Members)</option>
                    <option value="CAMPUS_ONLY">🏫 Campus Wi-Fi Only</option>
                    <option value="SUBSCRIBED">🔐 Subscribed Members Only</option>
                    <option value="RESTRICTED">🔒 Restricted / Faculty Only</option>
                  </select>
                </div>
              </div>

              {/* Document File Upload & External Link Switcher */}
              <div className="space-y-2.5 pt-2 border-t border-slate-100">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <label className="block font-bold text-slate-800 flex items-center gap-1.5">
                    <UploadCloud className="w-4 h-4 text-purple-600" />
                    <span>Attach Resource File or Digital Link *</span>
                  </label>
                  <div className="flex items-center gap-1 bg-slate-100/90 p-1 rounded-xl border border-slate-200/80 shadow-xs shrink-0 self-start sm:self-auto">
                    <button
                      type="button"
                      onClick={() => setUploadMode('FILE')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        uploadMode === 'FILE'
                          ? 'bg-purple-600 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                      }`}
                    >
                      📁 Browse & Upload File
                    </button>
                    <button
                      type="button"
                      onClick={() => setUploadMode('URL')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        uploadMode === 'URL'
                          ? 'bg-purple-600 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                      }`}
                    >
                      🔗 Web Portal Link
                    </button>
                  </div>
                </div>

                {uploadMode === 'FILE' ? (
                  <div className="space-y-2">
                    <label className="flex flex-col items-center justify-center p-4 sm:p-5 border-2 border-dashed border-purple-200 hover:border-purple-500 rounded-2xl bg-purple-50/40 hover:bg-purple-50 transition-all cursor-pointer text-center space-y-1.5 group shadow-xs">
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx,.epub,.pptx,.zip,.csv"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                      <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center group-hover:scale-110 transition-transform shadow-xs">
                        <UploadCloud className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900">
                          {uploadedFileName ? (
                            <span className="text-purple-700 font-extrabold">{uploadedFileName}</span>
                          ) : (
                            <span>Click here to select a file from your computer or drag & drop</span>
                          )}
                        </p>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Supported formats: PDF, DOCX, EPUB, PPTX, ZIP (Up to 100 MB)
                        </p>
                      </div>
                    </label>

                    {uploadedFileName && (
                      <div className="flex items-center justify-between p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs shadow-xs animate-fadeIn">
                        <div className="flex items-center gap-2.5">
                          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                          <div>
                            <p className="font-bold text-slate-900">{uploadedFileName}</p>
                            <p className="text-[11px] font-mono text-emerald-700 font-medium">Ready for upload • {uploadedFileSize || '3.4 MB'}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setPreviewDoc({
                                title: title || uploadedFileName || 'Attached Document',
                                author: authorName || user?.name || 'Librarian Officer',
                                url: previewBlobUrl || externalUrl || `/uploads/digital-docs/${uploadedFileName}`,
                                department: department || 'Computer Science & Engineering',
                                type: resourceType || 'PDF',
                                description: description || 'Attached digital resource file preview.',
                                fileName: uploadedFileName || 'document.pdf',
                                fileObject: uploadedFileObject,
                                textContent: uploadedFileText,
                              });
                            }}
                            className="px-3 py-1 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-[11px] transition-all flex items-center gap-1 cursor-pointer shadow-2xs"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Preview File</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setUploadedFileName(null);
                              setUploadedFileSize(null);
                              setExternalUrl('');
                              setUploadedFileObject(null);
                              setPreviewBlobUrl(null);
                              setUploadedFileText(null);
                            }}
                            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-full hover:bg-emerald-100 transition-colors cursor-pointer"
                            title="Remove file"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <div className="relative">
                      <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-purple-500" />
                      <input
                        type="text"
                        placeholder="https://ieeexplore.ieee.org or /docs/paper.pdf"
                        value={externalUrl}
                        onChange={(e) => setExternalUrl(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold font-mono text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 bg-slate-50/50 focus:bg-white transition-all shadow-xs"
                      />
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">Direct URL to publisher digital repository, journal portal, or remote PDF server.</p>
                  </div>
                )}
              </div>

              {/* Abstract Description */}
              <div>
                <label className="block font-bold text-slate-800 mb-1.5">Abstract Description</label>
                <textarea
                  rows={3}
                  placeholder="Enter abstract or summary description of the digital asset..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 bg-slate-50/50 focus:bg-white transition-all shadow-xs"
                />
              </div>

              {/* Fixed Footer Actions */}
              <div className="flex items-center justify-end gap-3 pt-3.5 border-t border-slate-100 bg-white sticky bottom-0">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-md shadow-purple-500/20 transition-all cursor-pointer"
                >
                  {editingResource ? 'Update Metadata' : 'Publish Asset'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Document Preview Viewer (Pure Uploaded File Only) */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-xs animate-fadeIn">
          <div className="bg-slate-900 rounded-3xl shadow-2xl max-w-5xl w-full border border-slate-800 flex flex-col max-h-[92vh] my-auto overflow-hidden">
            {/* Toolbar Header */}
            <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4 bg-slate-950 text-white shrink-0 gap-4">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="p-2.5 rounded-2xl bg-purple-500/20 text-purple-300 border border-purple-500/30 shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <h2 className="text-sm sm:text-base font-bold font-poppins text-white leading-tight truncate">
                      {previewDoc.title}
                    </h2>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-purple-500/30 text-purple-200 border border-purple-400/30 shrink-0 whitespace-nowrap">
                      {previewDoc.fileName || previewDoc.type.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 truncate mt-0.5">Uploaded File • {previewDoc.author}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <a
                  href={previewDoc.url}
                  download={previewDoc.fileName || 'uploaded_document'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs transition-all flex items-center gap-2 shadow-md shadow-purple-500/20 whitespace-nowrap shrink-0"
                >
                  <Download className="w-4 h-4 shrink-0" />
                  <span className="whitespace-nowrap">Download File</span>
                </a>
                <button
                  onClick={() => setPreviewDoc(null)}
                  className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Pure Uploaded File Display Viewport */}
            <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-slate-950 flex flex-col items-center justify-center min-h-[550px]">
              {/* 1. Image File Preview */}
              {previewDoc.url && (previewDoc.url.startsWith('data:image') || previewDoc.url.match(/\.(jpeg|jpg|gif|png|svg|webp)($|\?)/i) || previewDoc.fileObject?.type.startsWith('image/')) ? (
                <div className="flex flex-col items-center justify-center p-4 bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl max-w-4xl w-full">
                  <img
                    src={previewDoc.url}
                    alt={previewDoc.title}
                    className="max-h-[650px] w-auto max-w-full object-contain rounded-xl shadow-lg"
                  />
                  <p className="text-xs text-slate-400 font-mono mt-3">Uploaded Image: {previewDoc.fileName || 'Image File'}</p>
                </div>
              ) : previewDoc.textContent ? (
                /* 2. Text / CSV / Code File Content Preview */
                <div className="w-full max-w-4xl bg-slate-900 rounded-2xl p-6 border border-slate-800 text-slate-200 font-mono text-xs overflow-auto max-h-[650px] shadow-2xl space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3 text-purple-400 font-bold">
                    <span>📄 File Contents: {previewDoc.fileName}</span>
                    <span className="text-[10px] text-slate-500 font-mono">{previewDoc.textContent.length} bytes</span>
                  </div>
                  <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-slate-300">
                    {previewDoc.textContent}
                  </pre>
                </div>
              ) : previewDoc.url && (previewDoc.url.startsWith('blob:') || previewDoc.url.startsWith('http') || previewDoc.url.endsWith('.pdf')) ? (
                /* 3. Embedded Local PDF / Document File Preview */
                <div className="w-full h-full min-h-[620px] flex flex-col bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-2xl">
                  <object
                    data={previewDoc.url}
                    type="application/pdf"
                    className="w-full flex-1 min-h-[600px] bg-slate-900 rounded-2xl"
                  >
                    <div className="flex flex-col items-center justify-center p-12 text-center text-slate-300 space-y-4">
                      <FileText className="w-16 h-16 text-purple-400" />
                      <div>
                        <p className="text-base font-bold text-white">{previewDoc.fileName || 'Uploaded Document'}</p>
                        <p className="text-xs text-slate-400 mt-1">Uploaded document file is ready.</p>
                      </div>
                      <a
                        href={previewDoc.url}
                        download={previewDoc.fileName || 'document.pdf'}
                        className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-md transition-all"
                      >
                        Download File
                      </a>
                    </div>
                  </object>
                </div>
              ) : (
                /* 4. Fallback File Info Card if no binary file object is attached */
                <div className="max-w-md w-full bg-slate-900 rounded-2xl p-8 border border-slate-800 text-center space-y-4 shadow-2xl">
                  <div className="w-16 h-16 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center mx-auto border border-purple-500/30">
                    <FileText className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">{previewDoc.fileName || 'No Local File Selected'}</h3>
                    <p className="text-xs text-slate-400 mt-1">Select or upload a PDF, image, or document file from your computer to preview it directly here.</p>
                  </div>
                </div>
              )}
            </div>

            {/* Viewer Bottom Footer */}
            <div className="flex items-center justify-between px-6 py-3 bg-slate-950 border-t border-slate-800 text-xs font-medium text-slate-400 shrink-0">
              <span className="flex items-center gap-1.5 font-mono text-[11px]">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span>Uploaded File Viewer</span>
              </span>
              <button
                onClick={() => setPreviewDoc(null)}
                className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-all cursor-pointer"
              >
                Close Viewer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
