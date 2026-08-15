import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FileDown, FileText, Download, CheckCircle, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Downloads() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [downloadToast, setDownloadToast] = useState<string | null>(null);

  const downloadCategories = [
    {
      title: 'Forms & Membership Applications',
      items: [
        { name: 'Library Membership Registration Form', size: '125 KB' },
        { name: 'Book Procurement Suggestion Form', size: '85 KB' },
        { name: 'No Dues Clearance Certificate Form', size: '92 KB' },
      ],
    },
    {
      title: 'Library Policies & Conduct Rules',
      items: [
        { name: 'University Library Rules & Regulations', size: '450 KB' },
        { name: 'Digital Lab & Workstation Code of Conduct', size: '210 KB' },
        { name: 'Overdue Fine & Loss Penalty Guidelines', size: '180 KB' },
      ],
    },
    {
      title: 'Academic Exam & Curriculum',
      items: [
        { name: 'University Academic Calendar 2026-2027', size: '1.2 MB' },
        { name: 'End Semester Exam Timetable & Guidelines', size: '340 KB' },
        { name: 'Library Catalog & Circulation User Manual', size: '650 KB' },
      ],
    },
  ];

  const handleDownloadFile = (name: string) => {
    if (!user) {
      navigate('/login', { state: { from: location } });
      return;
    }
    setDownloadToast(`Downloading official document: "${name}"...`);
    setTimeout(() => setDownloadToast(null), 4000);
  };

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-950 via-indigo-950 to-blue-900 rounded-3xl p-8 text-white shadow-xl text-center">
        <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-blue-300 bg-white/10 px-3.5 py-1 rounded-full mb-3">
          <FileDown className="h-4 w-4" /> Download Center
        </div>
        <h1 className="text-3xl md:text-4xl font-extrabold font-poppins tracking-tight">University Official Downloads</h1>
        <p className="text-slate-300 text-sm md:text-base max-w-xl mx-auto mt-2">
          Download official library membership forms, clearance certificates, rulebooks, and academic schedules.
        </p>
      </div>

      {downloadToast && (
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-medium animate-fadeIn">
          <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0" />
          <span>{downloadToast}</span>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {downloadCategories.map((category, index) => (
          <div key={index} className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden flex flex-col justify-between">
            <div className="bg-slate-50/80 px-6 py-4 border-b border-slate-100">
              <h2 className="text-base font-bold font-poppins text-slate-900">{category.title}</h2>
            </div>
            <ul className="divide-y divide-slate-100 flex-1">
              {category.items.map((item, itemIndex) => (
                <li key={itemIndex} className="px-6 py-4 hover:bg-slate-50/80 transition-colors flex items-center justify-between group">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-slate-900 group-hover:text-blue-700 transition-colors">{item.name}</h3>
                      <p className="text-[11px] text-slate-500 font-mono mt-0.5">{item.size} • Official PDF</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDownloadFile(item.name)}
                    className="p-2 text-slate-400 hover:text-blue-700 hover:bg-blue-50 rounded-xl transition-all"
                  >
                    <FileDown className="w-5 h-5" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
