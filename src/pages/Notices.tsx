import React from 'react';
import { Bell, AlertCircle, Calendar } from 'lucide-react';

export default function Notices() {
  const notices = [
    { id: 1, title: 'Library Second Floor Maintenance Schedule', date: 'Oct 15, 2026', type: 'Alert', content: 'The second floor quiet reading hall will undergo HVAC maintenance from Oct 20 to Oct 22. Digital lab remains fully operational.' },
    { id: 2, title: 'New IEEE Xplore Digital Subscription Active', date: 'Oct 10, 2026', type: 'Info', content: 'We have renewed the campus-wide IEEE Xplore digital library access. All students and faculty can access full-text proceedings remotely.' },
    { id: 3, title: 'Notice: Return Overdue Books Prior to Exams', date: 'Oct 05, 2026', type: 'Warning', content: 'Members with active overdue books are advised to return books at the circulation desk prior to mid-term examination week.' },
    { id: 4, title: 'University Library Holiday Schedule', date: 'Oct 01, 2026', type: 'Info', content: 'The physical circulation desk will remain closed on Nov 1st and Nov 15th for public holidays. Digital portal remains 24/7 active.' },
  ];

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-950 via-indigo-950 to-blue-900 rounded-3xl p-8 text-white shadow-xl text-center">
        <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-blue-300 bg-white/10 px-3.5 py-1 rounded-full mb-3">
          <Bell className="h-4 w-4" /> Official Announcements & Circulars
        </div>
        <h1 className="text-3xl md:text-4xl font-extrabold font-poppins tracking-tight">Notices & Library Circulars</h1>
        <p className="text-slate-300 text-sm md:text-base max-w-xl mx-auto mt-2">
          Stay updated with official library announcements, holiday schedules, and subscription updates.
        </p>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        <ul className="divide-y divide-slate-100">
          {notices.map((notice) => (
            <li key={notice.id} className="p-6 hover:bg-slate-50/80 transition-colors flex flex-col md:flex-row gap-4 items-start">
              <div className="md:w-48 flex-shrink-0 flex items-center gap-2 text-xs font-mono font-semibold text-slate-500 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200/60">
                <Calendar className="w-4 h-4 text-blue-600" />
                <span>{notice.date}</span>
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  {notice.type === 'Alert' && <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />}
                  {notice.type === 'Warning' && <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />}
                  {notice.type === 'Info' && <Bell className="w-5 h-5 text-blue-600 shrink-0" />}
                  <h2 className="text-base font-bold font-poppins text-slate-900">{notice.title}</h2>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">{notice.content}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
