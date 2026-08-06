import React, { useState, useEffect } from 'react';
import {
  Search,
  BookOpen,
  LibraryBig,
  MonitorSmartphone,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Users,
  Clock3,
  BookMarked,
  Award,
  ChevronRight,
  Bookmark,
  MapPin,
  Download,
  GraduationCap,
  Briefcase,
  UserCheck,
  CheckCircle,
  FileText,
  Building2,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { libraryStore } from '../services/libraryStore.service';

export default function Home() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [state, setState] = useState(libraryStore.snapshot);
  const navigate = useNavigate();

  useEffect(() => {
    const sub = libraryStore.getObservable().subscribe(setState);
    return () => sub.unsubscribe();
  }, []);

  const handleHeroSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      navigate('/login');
      return;
    }
    if (searchTerm.trim()) {
      navigate(`/book-search?query=${encodeURIComponent(searchTerm.trim())}`);
    } else {
      navigate('/book-search');
    }
  };

  const highlights = [
    { icon: BookMarked, label: 'Catalog Copies & Accessions', value: `${state.books.reduce((s, b) => s + b.totalCopies, 0)}+`, color: 'bg-blue-50 text-blue-700 border-blue-200' },
    { icon: Users, label: 'Active Registered Members', value: `${state.members.length} Users`, color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
    { icon: Award, label: 'Digital Research Repositories', value: `${state.digitalResources.length} Papers`, color: 'bg-purple-50 text-purple-700 border-purple-200' },
    { icon: Clock3, label: 'Central Library Hours', value: '8 AM - 10 PM', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  ];

  const featuredBooks = state.books.slice(0, 4);

  return (
    <div className="space-y-12 pb-16">
      {/* Compact & Premium Hero Banner */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-950 via-indigo-950 to-blue-950 text-white shadow-xl p-6 sm:p-8 lg:p-10 border border-slate-800/80">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(#3b82f6_1px,transparent_1px)] [background-size:24px_24px] opacity-10 pointer-events-none" />

        <div className="relative max-w-3xl mx-auto text-center space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-400/30 bg-blue-500/10 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-blue-300 shadow-xs backdrop-blur-md">
            <Sparkles className="h-3.5 w-3.5 text-blue-400 animate-pulse" /> Official University Library Portal
          </div>

          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight font-poppins leading-tight text-white drop-shadow-sm">
            Access Books, Research & Academic Learning in One Place.
          </h1>

          <p className="max-w-xl mx-auto text-slate-300 text-xs sm:text-sm leading-relaxed font-normal">
            Search our central university catalog, inspect physical shelf locations, access peer-reviewed research papers, and manage book borrowings seamlessly.
          </p>

          {/* Compact Embedded OPAC Search Bar */}
          <form onSubmit={handleHeroSearch} className="max-w-2xl mx-auto pt-2">
            <div className="relative flex items-center bg-white rounded-2xl shadow-xl p-1.5 border border-slate-200">
              <Search className="h-5 w-5 text-slate-400 ml-3 shrink-0" />
              <input
                type="text"
                placeholder="Search catalog by title, author, or barcode (e.g. Algorithms, Cormen, BC-99201)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2.5 text-slate-900 text-xs sm:text-sm font-medium focus:outline-none rounded-xl"
              />
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white font-bold text-xs shadow-md hover:opacity-95 transition-all whitespace-nowrap cursor-pointer"
              >
                Search OPAC
              </button>
            </div>
          </form>

          {/* Quick Hero Subject Tags */}
          <div className="flex flex-wrap justify-center items-center gap-2 pt-1 text-[11px] font-semibold text-slate-300">
            <button
              type="button"
              onClick={() => navigate('/book-search?query=Computer%20Science')}
              className="bg-white/10 hover:bg-white/20 border border-white/15 px-3 py-1 rounded-full transition-all cursor-pointer"
            >
              Computer Science
            </button>
            <button
              type="button"
              onClick={() => navigate('/book-search?query=Electrical')}
              className="bg-white/10 hover:bg-white/20 border border-white/15 px-3 py-1 rounded-full transition-all cursor-pointer"
            >
              Electrical Engineering
            </button>
            <button
              type="button"
              onClick={() => navigate('/book-search?query=Math')}
              className="bg-white/10 hover:bg-white/20 border border-white/15 px-3 py-1 rounded-full transition-all cursor-pointer"
            >
              Mathematics & Physics
            </button>
            <button
              type="button"
              onClick={() => navigate('/digital-resources')}
              className="bg-white/10 hover:bg-white/20 border border-white/15 px-3 py-1 rounded-full transition-all cursor-pointer"
            >
              Research Proceedings
            </button>
          </div>
        </div>
      </section>

      {/* Telemetry Highlights Grid */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
        {highlights.map((item) => (
          <div key={item.label} className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4 sm:gap-5 transition-transform hover:-translate-y-1">
            <div className={`p-3.5 sm:p-4 rounded-2xl border ${item.color} shrink-0`}>
              <item.icon className="h-6 w-6 sm:h-7 sm:w-7" />
            </div>
            <div className="min-w-0">
              <div className="text-lg sm:text-xl lg:text-2xl font-extrabold text-slate-950 font-poppins whitespace-nowrap leading-tight">
                {item.value}
              </div>
              <div className="text-xs sm:text-sm font-semibold text-slate-500 mt-0.5 truncate">{item.label}</div>
            </div>
          </div>
        ))}
      </section>

      {/* Portal Role Gateways Section */}
      <section className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold font-poppins text-slate-950">Role-Based Library Portals</h2>
            <p className="text-sm text-slate-500 mt-1">Dedicated workstations tailored for Students, Faculty Members, and Administration.</p>
          </div>
          {!user && (
            <Link
              to="/login"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition-all shadow-sm w-fit"
            >
              <UserCheck className="w-4 h-4 text-blue-400" /> Sign In to Portal
            </Link>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Student Portal Card */}
          <div className="p-6 rounded-2xl bg-gradient-to-br from-blue-50/50 to-indigo-50/50 border border-blue-200/80 space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md">
                <GraduationCap className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold font-poppins text-slate-900">Student Portal</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Track borrowed books, request return date extensions, reserve hold titles, and download exam question banks.
              </p>
              <div className="space-y-1.5 text-xs text-slate-700 font-medium pt-1">
                <div className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-blue-600" /> Max 3 Books / 14 Days Borrowing</div>
                <div className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-blue-600" /> Self-Service Extension Privileges</div>
              </div>
            </div>
            <Link
              to={user?.role === 'STUDENT' ? '/student/dashboard' : '/login'}
              className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs text-center shadow-xs transition-colors block"
            >
              {user?.role === 'STUDENT' ? 'Open Student Workspace' : 'Student Login'}
            </Link>
          </div>

          {/* Faculty Portal Card */}
          <div className="p-6 rounded-2xl bg-gradient-to-br from-purple-50/50 to-fuchsia-50/50 border border-purple-200/80 space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-md">
                <Briefcase className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold font-poppins text-slate-900">Faculty Portal</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Extended borrowing quotas, department book procurement suggestions, and peer-reviewed research paper uploads.
              </p>
              <div className="space-y-1.5 text-xs text-slate-700 font-medium pt-1">
                <div className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-purple-600" /> Max 10 Books / 30 Days Quota</div>
                <div className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-purple-600" /> Priority Reserve & Book Requests</div>
              </div>
            </div>
            <Link
              to={user?.role === 'FACULTY' ? '/faculty/dashboard' : '/login'}
              className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs text-center shadow-xs transition-colors block"
            >
              {user?.role === 'FACULTY' ? 'Open Faculty Workspace' : 'Faculty Login'}
            </Link>
          </div>

          {/* Admin Control Desk Card */}
          <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-900 to-indigo-950 text-white space-y-4 flex flex-col justify-between shadow-md">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center shadow-md">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold font-poppins text-white">Admin Control Desk</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Circulation desk, accession barcode scanning, fine collections, inventory cataloging, and member security management.
              </p>
              <div className="space-y-1.5 text-xs text-slate-300 font-medium pt-1">
                <div className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-amber-400" /> Issue & Return Barcode Workstations</div>
                <div className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-amber-400" /> Overdue Fine Ledger & Operations Audit</div>
              </div>
            </div>
            <Link
              to={user?.role === 'ADMIN' ? '/admin/dashboard' : '/login'}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:opacity-95 text-white font-bold text-xs text-center shadow-xs transition-all block"
            >
              {user?.role === 'ADMIN' ? 'Open Admin Control Panel' : 'Admin Sign In'}
            </Link>
          </div>
        </div>
      </section>

      {/* Primary Discovery Services */}
      <section className="space-y-6">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold font-poppins text-slate-950">Library Services & Discovery</h2>
          <p className="text-sm text-slate-500 mt-1">Direct access to physical collections, digital repositories, and member workstations.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link
            to="/book-search"
            className="group bg-white p-7 rounded-3xl border border-slate-200 shadow-sm hover:shadow-lg hover:border-blue-300 transition-all space-y-4 flex flex-col justify-between"
          >
            <div className="space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors shadow-xs">
                <Search className="h-7 w-7" />
              </div>
              <h3 className="text-xl font-bold font-poppins text-slate-900 group-hover:text-blue-700 transition-colors">
                Search OPAC Catalog
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                Search physical catalog copies, accession numbers, shelf rack locations, and check real-time copy availability.
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-blue-600 pt-2">
              <span>Open Online Catalog</span>
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1.5 transition-transform" />
            </div>
          </Link>

          <Link
            to="/collections"
            className="group bg-white p-7 rounded-3xl border border-slate-200 shadow-sm hover:shadow-lg hover:border-indigo-300 transition-all space-y-4 flex flex-col justify-between"
          >
            <div className="space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors shadow-xs">
                <LibraryBig className="h-7 w-7" />
              </div>
              <h3 className="text-xl font-bold font-poppins text-slate-900 group-hover:text-indigo-700 transition-colors">
                Academic Collections
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                Explore subject-specific academic collections, core course textbooks, reference manuals, and university archives.
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-indigo-600 pt-2">
              <span>Browse Collections</span>
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1.5 transition-transform" />
            </div>
          </Link>

          <Link
            to="/digital-resources"
            className="group bg-white p-7 rounded-3xl border border-slate-200 shadow-sm hover:shadow-lg hover:border-purple-300 transition-all space-y-4 flex flex-col justify-between"
          >
            <div className="space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-purple-50 text-purple-700 flex items-center justify-center group-hover:bg-purple-600 group-hover:text-white transition-colors shadow-xs">
                <MonitorSmartphone className="h-7 w-7" />
              </div>
              <h3 className="text-xl font-bold font-poppins text-slate-900 group-hover:text-purple-700 transition-colors">
                Digital Library & Papers
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                Download IEEE research papers, semester exam question banks, digital reference guides, and syllabus materials.
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-purple-600 pt-2">
              <span>Access Digital Library</span>
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1.5 transition-transform" />
            </div>
          </Link>
        </div>
      </section>

      {/* Featured Catalog Titles Section */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold font-poppins text-slate-950">Featured Library Books</h2>
            <p className="text-sm text-slate-500 mt-1">Highlighted catalog titles available in the university central library.</p>
          </div>
          <Link to="/book-search" className="text-xs sm:text-sm font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1">
            View All ({state.books.length}) <ChevronRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {featuredBooks.map((book) => (
            <div key={book.id} className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm hover:shadow-lg transition-all space-y-3 flex flex-col justify-between group">
              <div>
                <div className="relative overflow-hidden rounded-2xl mb-3 bg-slate-100">
                  <img
                    src={book.coverUrl}
                    alt={book.title}
                    className="w-full h-48 object-cover rounded-2xl group-hover:scale-105 transition-transform duration-300"
                  />
                  <span className="absolute top-3 left-3 text-[10px] font-extrabold uppercase tracking-wider text-white bg-slate-900/80 backdrop-blur-xs px-2.5 py-1 rounded-full border border-white/20">
                    {book.categoryName}
                  </span>
                </div>
                <h3 className="font-bold text-slate-900 text-base line-clamp-1 group-hover:text-blue-700 transition-colors">{book.title}</h3>
                <p className="text-xs text-slate-500 mt-0.5">By {book.authorName}</p>
                <p className="text-[11px] font-mono text-slate-400 mt-1">ISBN: {book.isbn}</p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-xl">
                  {book.availableCopies} Copies Available
                </span>
                <Link to="/book-search" className="font-bold text-blue-600 hover:underline">
                  View Details &rarr;
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Library Location & Hours Info Footer Card */}
      <section className="bg-slate-900 text-white p-8 rounded-3xl border border-slate-800 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="p-4 rounded-2xl bg-blue-600/20 border border-blue-500/30 text-blue-400 shrink-0">
            <Building2 className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-lg font-bold font-poppins text-white">Central University Library Building</h3>
            <p className="text-xs text-slate-400 mt-0.5">Academic Block A, Ground Floor | Circulation Desk & Reading Rooms</p>
            <p className="text-xs text-slate-300 font-medium mt-1">Operating Hours: Mon – Sat (8:00 AM – 10:00 PM) | Closed on National Holidays</p>
          </div>
        </div>
        <Link
          to="/about"
          className="px-6 py-3 rounded-2xl bg-white text-slate-950 font-bold text-xs hover:bg-blue-50 transition-all shadow-md shrink-0"
        >
          View Library Map & Help Desk
        </Link>
      </section>
    </div>
  );
}
