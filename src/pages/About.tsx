import React, { useState, useEffect } from 'react';
import { Clock, Users, Building, Target, BookOpen, ShieldCheck, Sparkles, Award } from 'lucide-react';
import { libraryStore, getLibraryOperatingStatus } from '../services/libraryStore.service';

export default function About() {
  const [storeState, setStoreState] = useState(libraryStore.snapshot);

  useEffect(() => {
    const sub = libraryStore.getObservable().subscribe(setStoreState);
    return () => sub.unsubscribe();
  }, []);

  const operatingStatus = getLibraryOperatingStatus(new Date(), storeState.calendarEvents);
  return (
    <div className="space-y-10">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-950 via-indigo-950 to-blue-900 rounded-3xl p-8 sm:p-12 text-white shadow-xl space-y-4 text-center">
        <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-blue-300 bg-white/10 px-3.5 py-1 rounded-full">
          <BookOpen className="h-4 w-4" /> Academic Excellence Since 1995
        </div>
        <h1 className="text-3xl sm:text-5xl font-extrabold font-poppins tracking-tight">About Our University Library</h1>
        <p className="text-slate-300 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
          A premier center for intellectual growth, research, and academic excellence, empowering our college community with comprehensive physical and digital learning resources.
        </p>
      </div>

      {/* History & Overview */}
      <div className="grid md:grid-cols-2 gap-8 items-center">
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <span className="text-xs font-extrabold uppercase tracking-widest text-blue-700 bg-blue-50 px-3 py-1 rounded-full">
            Our Journey
          </span>
          <h2 className="text-2xl font-bold font-poppins text-slate-900">Over Three Decades of Knowledge & Innovation</h2>
          <p className="text-slate-600 text-sm leading-relaxed">
            Established in 1995, the University Library has evolved from a modest collection of 5,000 books into an enterprise-grade academic knowledge hub housing over 50,000 physical accessions and 15,000+ digital resources.
          </p>
          <p className="text-slate-600 text-sm leading-relaxed">
            We integrate state-of-the-art barcode accessioning, automated OPAC search, digital repository access, and quiet research halls designed for focused study.
          </p>
        </div>

        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-8 text-white shadow-lg space-y-6 flex flex-col justify-center">
          <div className="flex items-center gap-3">
            <Building className="w-8 h-8 text-blue-200" />
            <div>
              <h3 className="text-xl font-bold font-poppins">Central Library Campus</h3>
              <p className="text-xs text-blue-100">Main University Academic Quad</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 text-xs font-semibold pt-2 border-t border-white/10">
            <div>
              <p className="text-blue-200 text-[10px] uppercase">Seating Capacity</p>
              <p className="text-lg font-bold">500+ Students</p>
            </div>
            <div>
              <p className="text-blue-200 text-[10px] uppercase">Physical Accessions</p>
              <p className="text-lg font-bold">52,100+ Books</p>
            </div>
          </div>
        </div>
      </div>

      {/* Vision, Mission, Objectives */}
      <div className="grid md:grid-cols-3 gap-6">
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm text-center space-y-3 hover:border-blue-300 transition-all">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
            <Target className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-bold font-poppins text-slate-900">Our Vision</h3>
          <p className="text-slate-600 text-xs leading-relaxed">
            To be a world-class academic library that inspires learning, fosters groundbreaking research, and enriches the intellectual life of our university.
          </p>
        </div>

        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm text-center space-y-3 hover:border-blue-300 transition-all">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
            <Sparkles className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-bold font-poppins text-slate-900">Our Mission</h3>
          <p className="text-slate-600 text-xs leading-relaxed">
            Providing seamless 24/7 access to high-quality information resources, innovative digital repositories, and a supportive collaborative environment.
          </p>
        </div>

        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm text-center space-y-3 hover:border-blue-300 transition-all">
          <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto">
            <Users className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-bold font-poppins text-slate-900">Our Objectives</h3>
          <p className="text-slate-600 text-xs leading-relaxed">
            To empower curriculum learning, promote information literacy, preserve academic dissertations, and deliver efficient circulation services.
          </p>
        </div>
      </div>

      {/* Timings & Infrastructure */}
      <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm grid md:grid-cols-2 gap-8 items-center">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold font-poppins text-slate-900">Library Operating Hours</h2>
            <span className={`text-[11px] font-extrabold uppercase tracking-wide px-3 py-1 rounded-full border ${
              operatingStatus.isOpen
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-rose-50 text-rose-700 border-rose-200'
            }`}>
              {operatingStatus.isOpen ? '● Open Now' : '● Library Closed'}
            </span>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed font-medium">
            {operatingStatus.isOpen
              ? `Currently open • ${operatingStatus.nextOpenText}.`
              : `Closed • ${operatingStatus.nextOpenText}.`}
          </p>
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100">
              <Clock className="w-5 h-5 text-blue-600 shrink-0" />
              <div>
                <p className="font-bold text-slate-900">Monday – Friday</p>
                <p className="text-xs text-slate-500 font-medium">8:00 AM – 10:00 PM</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100">
              <Clock className="w-5 h-5 text-blue-600 shrink-0" />
              <div>
                <p className="font-bold text-slate-900">Saturday</p>
                <p className="text-xs text-slate-500 font-medium">9:00 AM – 4:00 PM</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100">
              <Clock className="w-5 h-5 text-rose-600 shrink-0" />
              <div>
                <p className="font-bold text-slate-900">Sunday & National Holidays</p>
                <p className="text-xs text-slate-500 font-medium">Closed — Physical Library & Attendance System unavailable (Digital Library Portal: Available 24/7)</p>
              </div>
            </div>
          </div>
        </div>

        {/* Facilities & Features List */}
        <div className="space-y-6">
          <h2 className="text-xl font-bold font-poppins text-slate-900">Key Library Infrastructure & Amenities</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-semibold text-slate-700">
            <ul className="space-y-3">
              <li className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" /> RFID & Barcode Scanning Automated Circulation System
              </li>
              <li className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" /> Full-text Institutional Repository & E-Journals Database
              </li>
              <li className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" /> High-speed Wi-Fi Access Points across all reading floors
              </li>
            </ul>
            <ul className="space-y-3">
              <li className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" /> Central Air-conditioned Reading Hall (300+ seating capacity)
              </li>
              <li className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" /> Digital Workstation Lab with 50 high-speed PCs
              </li>
              <li className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" /> Dedicated Group Study & Research Discussion Pods
              </li>
              <li className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" /> Automated Kiosks for Self-Service Catalog Search
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
