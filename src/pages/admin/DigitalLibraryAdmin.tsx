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
} from 'lucide-react';
import { libraryStore } from '../../services/libraryStore.service';
import { useAuth } from '../../context/AuthContext';
import { DigitalResource, DigitalResourceType } from '../../types/library';

export default function DigitalLibraryAdmin() {
  const { user } = useAuth();
  const [state, setState] = useState(libraryStore.snapshot);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [editingResource, setEditingResource] = useState<DigitalResource | null>(null);
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
    }
    setShowUploadModal(true);
  };

  const handleSaveResource = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

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
          fileSizeMb: 12.4,
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
            <Download className="h-3.5 w-3.5" /> Enterprise Digital Library Administration
          </div>
          <h1 className="text-2xl font-bold font-poppins text-slate-900">Digital Assets & Repository Control</h1>
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
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Search Bar */}
          <form onSubmit={(e) => e.preventDefault()} className="flex items-center w-full md:w-auto flex-1">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search digital assets by title, author, department, subject..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-8 py-2.5 rounded-l-2xl border border-r-0 border-slate-200 text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-purple-500 bg-slate-50/50 focus:bg-white"
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
              className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-r-2xl text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Search</span>
            </button>
          </form>

          {/* Active vs Archive Toggle */}
          <div className="flex items-center gap-2 shrink-0">
            {[
              { id: 'ACTIVE', label: `Active (${activeCount})` },
              { id: 'ARCHIVED', label: `Archived (${archivedCount})` },
              { id: 'ALL', label: `All (${state.digitalResources.length})` },
            ].map((af) => (
              <button
                key={af.id}
                type="button"
                onClick={() => setArchiveFilter(af.id as any)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  archiveFilter === af.id
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {af.label}
              </button>
            ))}
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs border-t border-slate-100 pt-3">
          {[
            { id: 'ALL', label: 'All Categories' },
            { id: 'RESEARCH_PAPER', label: 'Research Papers' },
            { id: 'EBOOK', label: 'E-Books' },
            { id: 'QUESTION_PAPER', label: 'Question Papers' },
            { id: 'SYLLABUS', label: 'Syllabus' },
            { id: 'LECTURE_NOTES', label: 'Lecture Notes' },
            { id: 'NEWSPAPER', label: 'Newspapers' },
            { id: 'NPTEL', label: 'NPTEL' },
            { id: 'SWAYAM', label: 'SWAYAM' },
            { id: 'IEEE_XPLORE', label: 'IEEE' },
            { id: 'THESIS_DISSERTATION', label: 'Thesis' },
          ].map((tf) => (
            <button
              key={tf.id}
              type="button"
              onClick={() => setTypeFilter(tf.id)}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap ${
                typeFilter === tf.id
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {tf.label}
            </button>
          ))}
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
          <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full p-6 space-y-4 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-lg font-bold font-poppins text-slate-900">
                {editingResource ? 'Edit Digital Resource Metadata' : 'Publish New Digital Resource'}
              </h2>
              <button onClick={() => setShowUploadModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveResource} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Document Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. High Performance Parallel Computing Lecture Notes"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Resource Category Type</label>
                  <select
                    value={resourceType}
                    onChange={(e) => setResourceType(e.target.value as DigitalResourceType)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold bg-slate-50"
                  >
                    <option value="RESEARCH_PAPER">Research Paper</option>
                    <option value="IEEE_XPLORE">IEEE Xplore</option>
                    <option value="ACM_DIGITAL_LIBRARY">ACM Digital Library</option>
                    <option value="SPRINGER_LINK">SpringerLink</option>
                    <option value="SCIENCE_DIRECT">ScienceDirect</option>
                    <option value="JSTOR">JSTOR Archives</option>
                    <option value="NPTEL">NPTEL Courseware</option>
                    <option value="SWAYAM">SWAYAM MOOC</option>
                    <option value="NDLI">NDLI Repository</option>
                    <option value="QUESTION_PAPER">Question Paper</option>
                    <option value="SYLLABUS">Syllabus</option>
                    <option value="LECTURE_NOTES">Lecture Notes</option>
                    <option value="EBOOK">E-Book</option>
                    <option value="JOURNAL">E-Journal</option>
                    <option value="THESIS_DISSERTATION">Thesis & Dissertation</option>
                    <option value="PROJECT_REPORT">Project Report</option>
                    <option value="FACULTY_PUBLICATION">Faculty Publication</option>
                    <option value="NEWSPAPER">Digital Newspaper</option>
                    <option value="MAGAZINE">Digital Magazine</option>
                    <option value="MULTIMEDIA">Multimedia</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Department</label>
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold bg-slate-50"
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

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Author / Faculty</label>
                  <input
                    type="text"
                    value={authorName}
                    onChange={(e) => setAuthorName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Subject</label>
                  <input
                    type="text"
                    placeholder="e.g. Operating Systems"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Semester</label>
                  <select
                    value={semester}
                    onChange={(e) => setSemester(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold bg-slate-50"
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
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">External Digital Portal Link / File URL</label>
                <input
                  type="text"
                  placeholder="https://ieeexplore.ieee.org or /docs/paper.pdf"
                  value={externalUrl}
                  onChange={(e) => setExternalUrl(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Abstract Description</label>
                <textarea
                  rows={3}
                  placeholder="Enter abstract or summary description of the digital asset..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-purple-600 text-white text-xs font-bold shadow-md hover:bg-purple-700"
                >
                  {editingResource ? 'Update Metadata' : 'Publish Asset'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
