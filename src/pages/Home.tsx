import React, { useState, useEffect } from 'react';
import {
  Search,
  BookOpen,
  LibraryBig,
  MonitorSmartphone,
  ArrowRight,
  ShieldCheck,
  Users,
  Clock3,
  BookMarked,
  Award,
  ChevronRight,
  UserCheck,
  CheckCircle,
  GraduationCap,
  Briefcase,
  Building2,
  Layers,
  HelpCircle,
  Info,
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
    if (searchTerm.trim()) {
      navigate(`/book-search?query=${encodeURIComponent(searchTerm.trim())}`);
    } else {
      navigate('/catalog');
    }
  };

  const quickNavCards = [
    {
      title: 'Books Catalog',
      subtitle: 'Search & Explore',
      icon: BookOpen,
      iconBg: 'bg-blue-50 text-blue-600 border-blue-100',
      link: '/catalog',
    },
    {
      title: 'Digital Library',
      subtitle: 'e-Books & Journals',
      icon: MonitorSmartphone,
      iconBg: 'bg-purple-50 text-purple-600 border-purple-100',
      link: '/digital-resources',
    },
    {
      title: 'New Arrivals',
      subtitle: 'Latest Additions',
      icon: Layers,
      iconBg: 'bg-emerald-50 text-emerald-600 border-emerald-100',
      link: '/catalog',
    },
    {
      title: 'Research Resources',
      subtitle: 'Thesis, Papers & More',
      icon: Users,
      iconBg: 'bg-amber-50 text-amber-600 border-amber-100',
      link: '/digital-resources',
    },
    {
      title: 'Library Guidelines',
      subtitle: 'Rules & Support',
      icon: HelpCircle,
      iconBg: 'bg-rose-50 text-rose-600 border-rose-100',
      link: '/about',
    },
    {
      title: 'Contact Us',
      subtitle: 'Get in Touch',
      icon: Info,
      iconBg: 'bg-sky-50 text-sky-600 border-sky-100',
      link: '/feedback',
    },
  ];

  const highlights = [
    { icon: BookMarked, label: 'Catalog Copies & Accessions', value: `${state.books.reduce((s, b) => s + b.totalCopies, 0)}+`, color: 'bg-blue-50 text-blue-700 border-blue-200' },
    { icon: Users, label: 'Active Registered Members', value: `${state.members.length} Users`, color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
    { icon: Award, label: 'Digital Research Repositories', value: `${state.digitalResources.length} Papers`, color: 'bg-purple-50 text-purple-700 border-purple-200' },
    { icon: Clock3, label: 'Central Library Hours', value: '8 AM – 10 PM', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  ];

  const featuredBooks = state.books.slice(0, 4);

  return (
    <div className="space-y-8 sm:space-y-10 pb-16">
      {/* Modern Panoramic Library Hero Banner */}
      <section className="relative overflow-hidden rounded-3xl shadow-2xl border border-slate-700/60 min-h-[420px] lg:min-h-[460px] flex items-center">
        {/* Background Full Library Interior Photo */}
        <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none">
          <img
            src="/images/hero-bg.jpg"
            alt="University Central Library"
            className="w-full h-full object-cover [object-position:78%_center] lg:[object-position:74%_center] select-none"
          />
        </div>

        {/* Deep Royal Blue Smooth Curved Wave SVG Overlay */}
        <div className="absolute inset-0 w-full h-full pointer-events-none z-0">
          <svg
            className="w-full h-full"
            viewBox="0 0 1000 500"
            preserveAspectRatio="none"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <linearGradient id="heroWaveGradient" x1="0%" y1="0%" x2="100%" y2="80%">
                <stop offset="0%" stopColor="#003db3" />
                <stop offset="35%" stopColor="#002d87" />
                <stop offset="70%" stopColor="#001d5e" />
                <stop offset="100%" stopColor="#001038" />
              </linearGradient>
            </defs>
            {/* Ambient soft glow curve behind */}
            <path
              d="M 0 0 L 460 0 C 480 80, 450 190, 470 280 C 495 370, 540 440, 575 500 L 0 500 Z"
              fill="#1d4ed8"
              opacity="0.3"
            />
            {/* Main solid royal blue curve */}
            <path
              d="M 0 0 L 430 0 C 450 80, 420 190, 440 280 C 465 370, 510 440, 540 500 L 0 500 Z"
              fill="url(#heroWaveGradient)"
            />
          </svg>
        </div>
        <div className="absolute -top-20 -left-20 w-[450px] h-[450px] bg-blue-500/25 rounded-full blur-3xl pointer-events-none z-0" />

        <div className="relative z-10 w-full p-6 sm:p-8 lg:p-10 xl:p-12">
          {/* Left Hero Content Area */}
          <div className="max-w-2xl space-y-4 text-left">
            {/* Top Category Tag */}
            <div className="text-[11px] sm:text-xs font-bold uppercase tracking-[0.25em] text-sky-300 flex items-center gap-2">
              <span>LEARN</span>
              <span className="text-sky-400">•</span>
              <span>RESEARCH</span>
              <span className="text-sky-400">•</span>
              <span>DISCOVER</span>
              <span className="text-sky-400">•</span>
              <span>GROW</span>
            </div>

            {/* Headline */}
            <h1 className="text-3xl sm:text-4xl lg:text-[42px] xl:text-[46px] font-extrabold font-poppins text-white tracking-tight leading-[1.14]">
              Access Books, Research &<br />
              <span className="text-[#38bdf8] font-extrabold">Academic Learning</span> in One Place.
            </h1>

            {/* Subtitle */}
            <p className="text-xs sm:text-sm text-blue-100/90 leading-relaxed max-w-xl font-normal">
              Search our central university catalog, inspect physical shelf locations, access peer-reviewed research papers, and manage book borrowings seamlessly.
            </p>

            {/* Real Search Form Bar */}
            <form onSubmit={handleHeroSearch} className="max-w-2xl pt-2">
              <div className="relative flex items-center bg-white rounded-2xl shadow-2xl p-1.5 focus-within:ring-2 focus-within:ring-blue-400 transition-all">
                <Search className="w-5 h-5 text-slate-400 ml-4 shrink-0 stroke-[2.2]" />
                <input
                  type="text"
                  placeholder="Search catalog by title, author, ISBN, subject, or keyword..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-2.5 text-xs sm:text-sm text-slate-800 font-medium placeholder:text-slate-400 focus:outline-none bg-transparent min-w-0"
                />
                <button
                  type="submit"
                  className="px-6 sm:px-8 py-3 rounded-xl bg-[#3b52f5] hover:bg-[#2f43e0] text-white font-bold text-xs sm:text-sm shadow-md hover:shadow-lg transition-all whitespace-nowrap cursor-pointer shrink-0"
                >
                  Explore Library Catalog
                </button>
              </div>
            </form>

            {/* Real Popular Searches Pills */}
            <div className="flex flex-wrap items-center gap-2 pt-2">
              <span className="text-blue-200/90 text-xs font-semibold mr-1">Popular searches:</span>
              {['Artificial Intelligence', 'Data Science', 'Operating Systems', 'Research Methods'].map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => navigate(`/book-search?query=${encodeURIComponent(tag)}`)}
                  className="px-4 py-1.5 rounded-full bg-[#0a1e4a]/60 hover:bg-[#0a1e4a]/90 text-white text-xs font-medium transition-all border border-white/15 backdrop-blur-xs cursor-pointer shadow-2xs"
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 6 Quick Navigation Feature Cards Strip */}
      <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {quickNavCards.map((card) => (
          <Link
            key={card.title}
            to={card.link}
            className="group bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-md hover:border-blue-300 transition-all flex items-center gap-3"
          >
            <div className={`p-2 rounded-xl border ${card.iconBg} shrink-0 group-hover:scale-105 transition-transform`}>
              <card.icon className="w-4.5 h-4.5" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-xs font-bold font-poppins text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                {card.title}
              </h3>
              <p className="text-[10px] text-slate-500 font-medium truncate">
                {card.subtitle}
              </p>
            </div>
          </Link>
        ))}
      </section>

      {/* Telemetry Highlights Grid */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
        {highlights.map((item) => (
          <div key={item.label} className="bg-white p-4 sm:p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-3.5 sm:gap-4 transition-transform hover:-translate-y-1">
            <div className={`p-3 sm:p-4 rounded-2xl border ${item.color} shrink-0`}>
              <item.icon className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-base sm:text-lg lg:text-xl xl:text-2xl font-extrabold text-slate-950 font-poppins leading-tight truncate" title={item.value}>
                {item.value}
              </div>
              <div className="text-[11px] sm:text-xs font-semibold text-slate-500 mt-0.5 truncate" title={item.label}>{item.label}</div>
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
                <div className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-blue-600" /> Max 3 Books / 7 Days Borrowing</div>
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
                Explore Library Catalog
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

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
          {featuredBooks.map((book) => (
            <Link
              key={book.id}
              to={`/book-search?query=${encodeURIComponent(book.title)}`}
              className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-sm hover:shadow-xl hover:border-blue-300 transition-all flex flex-col justify-between group h-full block"
            >
              <div>
                <div className="relative w-full h-48 overflow-hidden rounded-2xl mb-3.5 bg-slate-100 shrink-0">
                  <img
                    src={book.coverUrl}
                    alt={book.title}
                    className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                  />
                  <span className="absolute top-2.5 left-2.5 text-[10px] font-extrabold uppercase tracking-wider text-white bg-slate-950/80 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/20 shadow-xs max-w-[85%] truncate">
                    {book.categoryName}
                  </span>
                </div>
                <h3 className="font-bold text-slate-900 text-sm sm:text-base line-clamp-2 leading-snug group-hover:text-blue-700 transition-colors min-h-[2.5rem]">
                  {book.title}
                </h3>
                <p className="text-xs text-slate-500 mt-1 line-clamp-1">By {book.authorName}</p>
                <p className="text-[11px] font-mono text-slate-400 mt-0.5">ISBN: {book.isbn}</p>
              </div>
            </Link>
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
            <p className="text-xs text-slate-300 font-medium mt-1">Operating Hours: Mon – Fri (8:00 AM – 10:00 PM) | Sat (9:00 AM – 4:00 PM) | Closed on Sundays & Holidays (24/7 Digital Access)</p>
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
