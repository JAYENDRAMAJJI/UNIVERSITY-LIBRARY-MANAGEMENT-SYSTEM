import React, { useState, useEffect, useMemo, ChangeEvent, FormEvent } from 'react';
import {
  FileDown,
  FileText,
  Download,
  Plus,
  Search,
  Edit2,
  Trash2,
  Eye,
  CheckCircle,
  X,
  UploadCloud,
  Layers,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';
import { libraryStore } from '../../services/libraryStore.service';
import { useAuth } from '../../context/AuthContext';
import { OfficialDocument } from '../../types/library';
import { getOfficialDocumentBlobUrl, downloadOfficialDocumentPdf } from '../../utils/officialDownloadsPdfGenerator';

export default function DownloadsManagement() {
  const { user } = useAuth();
  const [state, setState] = useState(libraryStore.snapshot);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'ARCHIVED'>('ALL');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modals State
  const [showModal, setShowModal] = useState(false);
  const [editingDoc, setEditingDoc] = useState<OfficialDocument | null>(null);
  const [previewDoc, setPreviewDoc] = useState<{ title: string; url: string; fileName?: string } | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Forms & Membership Applications');
  const [description, setDescription] = useState('');
  const [fileSize, setFileSize] = useState('150 KB');
  const [updatedDate, setUpdatedDate] = useState('August 2026');
  const [uploadedFileData, setUploadedFileData] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);

  useEffect(() => {
    const sub = libraryStore.getObservable().subscribe(setState);
    return () => sub.unsubscribe();
  }, []);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleOpenModal = (doc?: OfficialDocument) => {
    if (doc) {
      setEditingDoc(doc);
      setTitle(doc.title);
      setCategory(doc.category);
      setDescription(doc.description || '');
      setFileSize(doc.fileSize || '150 KB');
      setUpdatedDate(doc.updatedDate || 'August 2026');
      setUploadedFileData(doc.uploadedFileData || null);
      setUploadedFileName(doc.uploadedFileName || null);
    } else {
      setEditingDoc(null);
      setTitle('');
      setCategory('Forms & Membership Applications');
      setDescription('');
      setFileSize('150 KB');
      setUpdatedDate('August 2026');
      setUploadedFileData(null);
      setUploadedFileName(null);
    }
    setShowModal(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFileName(file.name);
      const sizeStr = file.size > 1024 * 1024
        ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
        : `${Math.round(file.size / 1024)} KB`;
      setFileSize(sizeStr);
      if (!title.trim()) {
        setTitle(file.name.replace(/\.[^/.]+$/, '').replace(/_/g, ' '));
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        setUploadedFileData(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!title.trim()) {
      alert('Please enter a document title.');
      return;
    }

    if (editingDoc) {
      const res = libraryStore.updateOfficialDocument(
        editingDoc.id,
        {
          title: title.trim(),
          category,
          description: description.trim(),
          fileSize,
          updatedDate,
          uploadedFileData: uploadedFileData || editingDoc.uploadedFileData,
          uploadedFileName: uploadedFileName || editingDoc.uploadedFileName,
          fileType: 'Official PDF',
        },
        user || undefined
      );
      triggerToast(res.message);
    } else {
      const res = libraryStore.addOfficialDocument(
        {
          title: title.trim(),
          category,
          description: description.trim() || 'Official university library publication and administrative document.',
          fileSize,
          fileType: 'Official PDF',
          updatedDate: updatedDate || 'August 2026',
          uploadedFileData: uploadedFileData || undefined,
          uploadedFileName: uploadedFileName || undefined,
          isArchived: false,
        },
        user || undefined
      );
      triggerToast(res.message);
    }

    setShowModal(false);
    setEditingDoc(null);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to permanently delete this official document?')) {
      const res = libraryStore.deleteOfficialDocument(id, user || undefined);
      triggerToast(res.message);
    }
  };

  const handlePreview = (doc: OfficialDocument) => {
    const url = getOfficialDocumentBlobUrl(doc);
    setPreviewDoc({ title: doc.title, url, fileName: doc.uploadedFileName || `${doc.title}.pdf` });
  };

  const handleDownload = (doc: OfficialDocument) => {
    libraryStore.incrementOfficialDocDownload(doc.id, user || undefined);
    downloadOfficialDocumentPdf(doc);
    triggerToast(`Downloaded "${doc.title}.pdf"`);
  };

  const filteredDocs = useMemo(() => {
    return (state.officialDocuments || []).filter((doc) => {
      const q = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !q ||
        doc.title.toLowerCase().includes(q) ||
        doc.description.toLowerCase().includes(q) ||
        doc.category.toLowerCase().includes(q);

      const matchesCat = categoryFilter === 'ALL' || doc.category === categoryFilter;
      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'ACTIVE' && !doc.isArchived) ||
        (statusFilter === 'ARCHIVED' && doc.isArchived);

      return matchesSearch && matchesCat && matchesStatus;
    });
  }, [state.officialDocuments, searchTerm, categoryFilter, statusFilter]);

  const totalDocs = (state.officialDocuments || []).length;
  const totalDownloads = (state.officialDocuments || []).reduce((acc, d) => acc + (d.downloadCount || 0), 0);

  return (
    <div className="space-y-6 pb-12 animate-fadeIn">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 flex items-center justify-between gap-3 p-4 rounded-2xl bg-slate-900 text-white border border-purple-500/30 shadow-2xl animate-fadeIn">
          <div className="flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-emerald-400 shrink-0" />
            <span className="text-xs sm:text-sm font-semibold">{toastMessage}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="text-slate-400 hover:text-white p-1">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-950 via-indigo-950 to-blue-900 rounded-3xl p-6 sm:p-9 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6 border border-slate-800/80 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-blue-300 bg-white/10 px-3.5 py-1.5 rounded-full border border-blue-400/20 shadow-xs backdrop-blur-xs">
            <FileDown className="w-4 h-4 text-blue-300" />
            <span>Librarian Administrative Portal</span>
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold font-poppins text-white tracking-tight leading-tight">
            Official Forms & <span className="bg-gradient-to-r from-blue-300 via-indigo-200 to-sky-200 bg-clip-text text-transparent">Downloads Desk</span>
          </h1>
          <p className="text-slate-300 text-xs sm:text-sm md:text-base max-w-2xl font-medium leading-relaxed">
            Upload, update, and manage official university library membership forms, institutional clearance certificates, statutory rulebooks, and academic schedules.
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-3 shrink-0">
          <button
            onClick={() => handleOpenModal()}
            className="px-5 py-3 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs sm:text-sm transition-all flex items-center gap-2 shadow-lg shadow-blue-500/25 cursor-pointer active:scale-95 whitespace-nowrap border border-blue-400/30"
          >
            <Plus className="w-4 h-4" />
            <span>Publish New Official Form</span>
          </button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="p-3 rounded-xl bg-purple-50 text-purple-600 border border-purple-100">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Documents</p>
            <h3 className="text-xl font-extrabold text-slate-900 mt-0.5">{totalDocs}</h3>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
            <Download className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Downloads</p>
            <h3 className="text-xl font-extrabold text-slate-900 mt-0.5">{totalDownloads}</h3>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="p-3 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Active Categories</p>
            <h3 className="text-xl font-extrabold text-slate-900 mt-0.5">3 Streams</h3>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="p-3 rounded-xl bg-amber-50 text-amber-600 border border-amber-100">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Governance</p>
            <h3 className="text-sm font-bold text-slate-900 mt-1">Chief Librarian</h3>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative flex-1 w-full sm:w-auto">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by document title, keyword, or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 bg-slate-50/50"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="flex-1 sm:flex-none px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 bg-slate-50/70 focus:outline-none cursor-pointer"
          >
            <option value="ALL">All Categories</option>
            <option value="Forms & Membership Applications">Forms & Applications</option>
            <option value="Library Policies & Conduct Rules">Policies & Rules</option>
            <option value="Academic Exam & Curriculum">Academic & Exams</option>
          </select>
        </div>
      </div>

      {/* Documents Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-4 px-6">Official Document</th>
                <th className="py-4 px-4">Category</th>
                <th className="py-4 px-4">Session / Date</th>
                <th className="py-4 px-4">File Size</th>
                <th className="py-4 px-4">Downloads</th>
                <th className="py-4 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
              {filteredDocs.length > 0 ? (
                filteredDocs.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-4 px-6">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-xl bg-purple-50 text-purple-600 border border-purple-100 shrink-0 mt-0.5 shadow-2xs">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 text-xs sm:text-sm">{doc.title}</p>
                          <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{doc.description}</p>
                          {doc.uploadedFileName && (
                            <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-mono text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200">
                              📎 {doc.uploadedFileName}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                        {doc.category}
                      </span>
                    </td>
                    <td className="py-4 px-4 font-semibold text-slate-600">
                      {doc.updatedDate}
                    </td>
                    <td className="py-4 px-4 font-mono font-bold text-purple-700">
                      {doc.fileSize}
                    </td>
                    <td className="py-4 px-4 font-bold text-slate-900">
                      {doc.downloadCount || 0}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handlePreview(doc)}
                          className="p-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
                          title="Preview Document"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDownload(doc)}
                          className="p-2 rounded-xl bg-purple-50 text-purple-700 hover:bg-purple-600 hover:text-white transition-colors cursor-pointer"
                          title="Download PDF"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenModal(doc)}
                          className="p-2 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white transition-colors cursor-pointer"
                          title="Edit Document"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(doc.id)}
                          className="p-2 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-600 hover:text-white transition-colors cursor-pointer"
                          title="Delete Document"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <FileDown className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                    <p className="font-semibold text-slate-600">No official documents found matching your filter.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Publish / Edit Official Document */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full border border-slate-200 flex flex-col max-h-[88vh] my-auto overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-white shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-2xl bg-purple-50 text-purple-600">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold font-poppins text-slate-900 leading-tight">
                    {editingDoc ? 'Edit Official Form Metadata' : 'Publish New Official University Form'}
                  </h2>
                  <p className="text-xs text-slate-500">Authorized by the Office of the Chief Librarian</p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSave} className="p-6 overflow-y-auto space-y-4 text-xs flex-1">
              <div>
                <label className="block font-bold text-slate-800 mb-1.5">Document Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Library Membership Registration Form"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 bg-slate-50/50"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-800 mb-1.5">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 bg-slate-50/70 focus:outline-none cursor-pointer"
                  >
                    <option value="Forms & Membership Applications">Forms & Membership Applications</option>
                    <option value="Library Policies & Conduct Rules">Library Policies & Conduct Rules</option>
                    <option value="Academic Exam & Curriculum">Academic Exam & Curriculum</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1.5">Academic Session / Version</label>
                  <input
                    type="text"
                    placeholder="e.g. August 2026 or Session 2026-27"
                    value={updatedDate}
                    onChange={(e) => setUpdatedDate(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-900 bg-slate-50/50"
                  />
                </div>
              </div>

              {/* Attach File */}
              <div className="space-y-1.5">
                <label className="block font-bold text-slate-800">Attach Custom Document / PDF File (Optional)</label>
                <label className="flex items-center justify-between p-3.5 border-2 border-dashed border-purple-200 hover:border-purple-500 rounded-2xl bg-purple-50/40 hover:bg-purple-50 transition-all cursor-pointer">
                  <div className="flex items-center gap-2.5">
                    <UploadCloud className="w-4 h-4 text-purple-600 shrink-0" />
                    <span className="text-xs font-semibold text-slate-700">
                      {uploadedFileName ? (
                        <span className="text-purple-700 font-bold">{uploadedFileName} ({fileSize})</span>
                      ) : (
                        'Click to attach custom PDF (Leaves blank to auto-generate standard official template)'
                      )}
                    </span>
                  </div>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.epub"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <span className="text-[11px] font-bold text-purple-600 bg-white px-3 py-1 rounded-xl border border-purple-200 shadow-2xs">
                    {uploadedFileName ? 'Change File' : 'Browse File'}
                  </span>
                </label>
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1.5">Description & Purpose</label>
                <textarea
                  rows={3}
                  placeholder="Summary overview of the official document..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-900 bg-slate-50/50"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  onClick={(e) => handleSave(e)}
                  className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-md shadow-purple-500/20 cursor-pointer active:scale-95"
                >
                  {editingDoc ? 'Update Official Form' : 'Publish Document'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Embedded Document Preview Modal */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-fadeIn">
          <div className="bg-slate-900 rounded-3xl shadow-2xl max-w-4xl w-full border border-slate-800 flex flex-col max-h-[92vh] my-auto overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4 bg-slate-950 text-white shrink-0 gap-4">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="p-2.5 rounded-2xl bg-purple-500/20 text-purple-300 border border-purple-500/30 shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-sm sm:text-base font-bold font-poppins text-white leading-tight truncate">
                    {previewDoc.title}
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">Authorized Official Document Preview</p>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => downloadOfficialDocumentPdf(previewDoc)}
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

            {/* Native Iframe */}
            <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-slate-950 flex flex-col items-center justify-center min-h-[550px]">
              <div className="w-full h-full min-h-[600px] flex flex-col bg-white rounded-2xl border border-slate-800 overflow-hidden shadow-2xl">
                <iframe
                  src={previewDoc.url}
                  title={previewDoc.title}
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
