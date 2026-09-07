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
  SlidersHorizontal,
  QrCode,
  FileCheck2,
  Sparkles,
  Star,
  FlaskConical,
  Cpu,
  Stethoscope,
  Palette,
  MoreHorizontal,
  Compass,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { libraryStore } from '../services/libraryStore.service';

export default function Home() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [searchCategory, setSearchCategory] = useState('All');
  const [activeBookTab, setActiveBookTab] = useState<'recent' | 'borrowed' | 'popular' | 'recommended'>('recent');
  const [state, setState] = useState(libraryStore.snapshot);
  const navigate = useNavigate();

  useEffect(() => {
    const sub = libraryStore.getObservable().subscribe(setState);
    return () => sub.unsubscribe();
  }, []);

  const handleHeroSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      const categoryParam = searchCategory !== 'All' ? `&category=${encodeURIComponent(searchCategory)}` : '';
      navigate(`/book-search?query=${encodeURIComponent(searchTerm.trim())}${categoryParam}`);
    } else {
      navigate('/catalog');
    }
  };

  const metrics = [
    {
      value: `${state.books.reduce((s, b) => s + b.totalCopies, 0) || 10000}+`,
      title: 'Books Available',
      subtitle: 'Wide range of academic resources',
      icon: BookMarked,
      iconColor: 'bg-cyan-50 text-cyan-600 border-cyan-100',
    },
    {
      value: '24',
      title: 'Academic Programs',
      subtitle: 'From Engineering to Humanities',
      icon: Building2,
      iconColor: 'bg-blue-50 text-blue-600 border-blue-100',
    },
    {
      value: `${state.members.length || 5000}+`,
      title: 'Students Registered',
      subtitle: 'Active library members',
      icon: Users,
      iconColor: 'bg-indigo-50 text-indigo-600 border-indigo-100',
    },
    {
      value: `${state.digitalResources.length ? state.digitalResources.length + '+' : '2,000+'}`,
      title: 'Digital Resources',
      subtitle: 'eBooks, Journals & More',
      icon: MonitorSmartphone,
      iconColor: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    },
  ];

  const academicPrograms = [
    { title: 'B.Tech / B.E.', subtitle: 'Engineering', icon: Cpu, color: 'bg-blue-50 text-blue-600 border-blue-100', query: 'Engineering' },
    { title: 'B.Sc.', subtitle: 'Science', icon: FlaskConical, color: 'bg-cyan-50 text-cyan-600 border-cyan-100', query: 'Science' },
    { title: 'M.Sc.', subtitle: 'Science', icon: GraduationCap, color: 'bg-amber-50 text-amber-600 border-amber-100', query: 'Research' },
    { title: 'BCA', subtitle: 'Computer Applications', icon: MonitorSmartphone, color: 'bg-sky-50 text-sky-600 border-sky-100', query: 'Computer' },
    { title: 'MCA', subtitle: 'Computer Applications', icon: Layers, color: 'bg-indigo-50 text-indigo-600 border-indigo-100', query: 'Software' },
    { title: 'BBA', subtitle: 'Management', icon: Users, color: 'bg-rose-50 text-rose-600 border-rose-100', query: 'Management' },
    { title: 'MBA', subtitle: 'Management', icon: Briefcase, color: 'bg-orange-50 text-orange-600 border-orange-100', query: 'Business' },
    { title: 'BA', subtitle: 'Arts', icon: Palette, color: 'bg-purple-50 text-purple-600 border-purple-100', query: 'Humanities' },
    { title: 'Medical Sciences', subtitle: '(MBBS / MD / MS)', icon: Stethoscope, color: 'bg-emerald-50 text-emerald-600 border-emerald-100', query: 'Medical' },
    { title: 'More', subtitle: 'Programs', icon: MoreHorizontal, color: 'bg-slate-50 text-slate-600 border-slate-200', query: '' },
  ];

  const servicesList = [
    {
      title: 'Book Borrowing',
      description: 'Borrow books easily using your library account.',
      icon: BookOpen,
      iconColor: 'bg-sky-50 text-sky-600 border-sky-200',
      link: '/catalog',
    },
    {
      title: 'Smart Book Search',
      description: 'Find books instantly using title, author, ISBN or barcode.',
      icon: Search,
      iconColor: 'bg-blue-50 text-blue-600 border-blue-200',
      link: '/book-search',
    },
    {
      title: 'QR & Barcode Scan',
      description: 'Scan a book barcode to instantly find details.',
      icon: QrCode,
      iconColor: 'bg-amber-50 text-amber-600 border-amber-200',
      link: '/book-search',
    },
    {
      title: 'Digital Resources',
      description: 'Access eBooks, journals and learning materials.',
      icon: MonitorSmartphone,
      iconColor: 'bg-purple-50 text-purple-600 border-purple-200',
      link: '/digital-resources',
    },
    {
      title: 'No Due Certificate',
      description: 'Apply online and receive your library clearance.',
      icon: FileCheck2,
      iconColor: 'bg-rose-50 text-rose-600 border-rose-200',
      link: '/no-due-clearance',
    },
    {
      title: 'Smart Inventory',
      description: 'Track books, copies, shelves and inventory.',
      icon: LibraryBig,
      iconColor: 'bg-emerald-50 text-emerald-600 border-emerald-200',
      link: '/collections',
    },
    {
      title: 'Theses & Research',
      description: 'Explore peer-reviewed publications and theses.',
      icon: GraduationCap,
      iconColor: 'bg-indigo-50 text-indigo-600 border-indigo-200',
      link: '/digital-resources',
    },
    {
      title: 'Hold & Reservations',
      description: 'Reserve issued books and track queue priority.',
      icon: BookMarked,
      iconColor: 'bg-teal-50 text-teal-600 border-teal-200',
      link: '/book-search',
    },
  ];

  // Tab filtering logic for books
  const getTabFilteredBooks = () => {
    const all = [...state.books];
    if (activeBookTab === 'borrowed') {
      return [...all].sort((a, b) => b.borrowCount - a.borrowCount).slice(0, 4);
    }
    if (activeBookTab === 'popular') {
      return [...all].reverse().slice(0, 4);
    }
    if (activeBookTab === 'recommended') {
      return all.filter((b) => b.isFeatured || (b as any).featured || (b.totalCopies || 0) > 2).slice(0, 4);
    }
    return all.slice(0, 4);
  };

  const displayedBooks = getTabFilteredBooks();

  return (
    <div className="space-y-8 sm:space-y-10 pb-16">
      {/* 1. Hero Banner with Architecture Background & Overlapping Search */}
      <div className="relative">
        <section className="relative overflow-hidden rounded-3xl shadow-2xl border border-slate-700/60 min-h-[460px] lg:min-h-[500px] flex items-center">
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
                d="M 0 0 L 520 0 C 540 80, 500 190, 530 280 C 560 370, 610 440, 650 500 L 0 500 Z"
                fill="#1d4ed8"
                opacity="0.35"
              />
              {/* Main solid royal blue curve */}
              <path
                d="M 0 0 L 490 0 C 510 80, 470 190, 500 280 C 530 370, 580 440, 620 500 L 0 500 Z"
                fill="url(#heroWaveGradient)"
              />
            </svg>
          </div>
          <div className="absolute -top-20 -left-20 w-[450px] h-[450px] bg-blue-500/25 rounded-full blur-3xl pointer-events-none z-0" />

          {/* Hero Content Container */}
          <div className="relative z-10 w-full p-6 sm:p-8 lg:p-12 pb-16 lg:pb-20">
            {/* Hero Content */}
            <div className="max-w-2xl lg:max-w-3xl space-y-4 text-left">
              {/* Tagline */}
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
                Knowledge Opens Doors to<br />
                <span className="text-[#38bdf8] font-extrabold">Infinite Possibilities</span>
              </h1>

              {/* Subtitle */}
              <p className="text-sm sm:text-base text-blue-100/90 leading-relaxed max-w-xl font-normal">
                Search catalog holdings, inspect physical shelf locations, access research papers, and manage borrowings seamlessly.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Link
                  to="/catalog"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-teal-500 hover:bg-teal-600 text-white font-bold text-xs sm:text-sm shadow-lg hover:shadow-teal-500/30 transition-all cursor-pointer"
                >
                  <BookOpen className="w-4 h-4" />
                  <span>Explore Library</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  to="/book-search"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs sm:text-sm border border-white/20 backdrop-blur-md transition-all cursor-pointer"
                >
                  <LibraryBig className="w-4 h-4 text-sky-300" />
                  <span>Browse Books</span>
                </Link>
              </div>

              {/* Value Highlights Pill Row */}
              <div className="flex flex-wrap items-center gap-4 sm:gap-6 pt-3 text-xs text-blue-100/90 font-medium">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-blue-500/25 text-sky-300 border border-blue-400/25">
                    <GraduationCap className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-white block leading-tight text-xs">Learn</span>
                    <span className="text-[10px] text-blue-200/80">Something New</span>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-amber-500/25 text-amber-300 border border-amber-400/25">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-white block leading-tight text-xs">Discover</span>
                    <span className="text-[10px] text-blue-200/80">New Ideas</span>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-emerald-500/25 text-emerald-300 border border-emerald-400/25">
                    <Award className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-white block leading-tight text-xs">Grow</span>
                    <span className="text-[10px] text-blue-200/80">A Better Tomorrow</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Overlapping Floating Search Bar */}
        <div className="relative -mt-7 sm:-mt-8 z-20 px-3 sm:px-6 max-w-5xl mx-auto">
          <form onSubmit={handleHeroSearch} className="bg-white rounded-2xl shadow-xl border border-slate-200/80 p-2 flex flex-col md:flex-row items-center gap-2">
            {/* Category Dropdown */}
            <div className="w-full md:w-auto shrink-0 px-2 py-1 flex items-center border-b md:border-b-0 md:border-r border-slate-200">
              <select
                value={searchCategory}
                onChange={(e) => setSearchCategory(e.target.value)}
                className="w-full md:w-auto bg-transparent text-xs sm:text-sm font-bold text-slate-700 focus:outline-none cursor-pointer pr-3 py-1.5"
              >
                <option value="All">All Books</option>
                <option value="Computer Science">Computer Science</option>
                <option value="Engineering">Engineering</option>
                <option value="Business">Business & Management</option>
                <option value="Mathematics">Mathematics</option>
                <option value="Science">Natural Sciences</option>
              </select>
            </div>

            {/* Search Input */}
            <div className="flex-1 flex items-center w-full px-2">
              <Search className="w-4 h-4 text-slate-400 mr-2 shrink-0 stroke-[2.2]" />
              <input
                type="text"
                placeholder="Search for books, authors, subjects, ISBN or departments..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full py-2 text-xs sm:text-sm text-slate-800 font-medium placeholder:text-slate-400 focus:outline-none bg-transparent min-w-0"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 w-full md:w-auto shrink-0 justify-end">
              <button
                type="submit"
                className="w-full md:w-auto px-5 sm:px-7 py-2.5 rounded-xl bg-[#009688] hover:bg-[#00796b] text-white font-bold text-xs sm:text-sm shadow-md hover:shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Search className="w-4 h-4" />
                <span>Search</span>
              </button>
              <Link
                to="/book-search"
                className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs sm:text-sm transition-all whitespace-nowrap"
              >
                <SlidersHorizontal className="w-4 h-4 text-slate-500" />
                <span>Advanced Search</span>
              </Link>
            </div>
          </form>
        </div>
      </div>

      {/* 2. Key Metrics Stats Counter Strip (4 Columns) */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 pt-2">
        {metrics.map((item) => (
          <div
            key={item.title}
            className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-sm flex items-center gap-3.5 transition-transform hover:-translate-y-0.5"
          >
            <div className={`p-3 rounded-2xl border ${item.iconColor} shrink-0`}>
              <item.icon className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-lg sm:text-xl xl:text-2xl font-black text-slate-900 font-poppins leading-tight truncate">
                {item.value}
              </div>
              <div className="text-xs font-bold text-slate-800 truncate">{item.title}</div>
              <div className="text-[10px] text-slate-500 truncate">{item.subtitle}</div>
            </div>
          </div>
        ))}
      </section>

      {/* 3. Browse by Academic Program Strip */}
      <section className="space-y-3.5">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-teal-600 block">
              — EXPLORE OUR COLLECTION
            </span>
            <h2 className="text-xl sm:text-2xl font-bold font-poppins text-slate-950">
              Browse by Academic Program
            </h2>
          </div>
          <Link
            to="/collections"
            className="text-xs sm:text-sm font-bold text-teal-600 hover:text-teal-700 flex items-center gap-1 group"
          >
            <span>View All Programs</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-10 gap-2.5">
          {academicPrograms.map((prog) => (
            <button
              key={prog.title}
              onClick={() => navigate(prog.query ? `/book-search?query=${encodeURIComponent(prog.query)}` : '/collections')}
              className="group bg-white p-3 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-teal-400 transition-all flex flex-col items-center text-center cursor-pointer space-y-1.5"
            >
              <div className={`p-2 rounded-xl border ${prog.color} group-hover:scale-110 transition-transform`}>
                <prog.icon className="w-4 h-4" />
              </div>
              <div className="min-w-0 w-full">
                <h3 className="text-xs font-bold font-poppins text-slate-900 group-hover:text-teal-600 transition-colors truncate">
                  {prog.title}
                </h3>
                <p className="text-[9px] text-slate-500 truncate">{prog.subtitle}</p>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* 4. Split Section: Featured Books (Left) & Our Services (Right) */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left: FEATURED BOOKS (7 Columns, Full Stretch Height) */}
        <div className="lg:col-span-7 bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4 flex flex-col justify-between h-full">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-slate-100 pb-3">
              <div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-teal-600 uppercase tracking-wide">
                  <Compass className="w-4 h-4" />
                  <span>Featured Books</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">Discover popular and recently added books from our collection.</p>
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl shrink-0 overflow-x-auto max-w-full">
                <button
                  onClick={() => setActiveBookTab('recent')}
                  className={`px-2 py-1 rounded-lg text-[10.5px] font-bold transition-all cursor-pointer whitespace-nowrap ${
                    activeBookTab === 'recent' ? 'bg-[#009688] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Recently Added
                </button>
                <button
                  onClick={() => setActiveBookTab('borrowed')}
                  className={`px-2 py-1 rounded-lg text-[10.5px] font-bold transition-all cursor-pointer whitespace-nowrap ${
                    activeBookTab === 'borrowed' ? 'bg-[#009688] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Most Borrowed
                </button>
                <button
                  onClick={() => setActiveBookTab('popular')}
                  className={`px-2 py-1 rounded-lg text-[10.5px] font-bold transition-all cursor-pointer whitespace-nowrap ${
                    activeBookTab === 'popular' ? 'bg-[#009688] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Popular
                </button>
                <button
                  onClick={() => setActiveBookTab('recommended')}
                  className={`px-2 py-1 rounded-lg text-[10.5px] font-bold transition-all cursor-pointer whitespace-nowrap ${
                    activeBookTab === 'recommended' ? 'bg-[#009688] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Recommended
                </button>
              </div>
            </div>

            {/* Book Cards Grid (4 Columns) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3">
              {displayedBooks.map((book) => (
                <Link
                  key={book.id}
                  to={`/book-search?query=${encodeURIComponent(book.title)}`}
                  className="group bg-slate-50/70 hover:bg-white p-3 rounded-2xl border border-slate-200/80 hover:border-teal-400 hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="relative w-full h-36 sm:h-40 rounded-xl overflow-hidden bg-slate-100 mb-2.5 shadow-2xs">
                      <img
                        src={book.coverUrl || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=400&q=80'}
                        alt={book.title}
                        loading="lazy"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=400&q=80';
                        }}
                        className="absolute inset-0 w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300 block"
                      />
                      <span className="absolute top-1.5 left-1.5 z-10 text-[8.5px] font-extrabold uppercase tracking-wider text-white bg-slate-950/85 backdrop-blur-xs px-1.5 py-0.5 rounded border border-white/15 shadow-2xs max-w-[85%] truncate">
                        {book.categoryName}
                      </span>
                    </div>
                    <h4 className="text-xs font-bold text-slate-900 group-hover:text-teal-600 transition-colors line-clamp-2 min-h-[2rem] leading-snug">
                      {book.title}
                    </h4>
                    <p className="text-[10px] text-slate-500 line-clamp-1 mt-0.5">{book.authorName}</p>
                    <div className="flex items-center gap-0.5 text-amber-400 mt-1">
                      <Star className="w-3 h-3 fill-amber-400" />
                      <Star className="w-3 h-3 fill-amber-400" />
                      <Star className="w-3 h-3 fill-amber-400" />
                      <Star className="w-3 h-3 fill-amber-400" />
                      <Star className="w-3 h-3 fill-amber-400" />
                    </div>
                  </div>
                  <div className="pt-2 text-[10px] font-bold text-teal-600 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                    <span>View Book</span>
                    <ArrowRight className="w-3 h-3" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Right: OUR SERVICES (5 Columns, Full Stretch Height) */}
        <div className="lg:col-span-5 bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4 flex flex-col justify-between h-full">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-teal-600 uppercase tracking-wide">
                  <Sparkles className="w-4 h-4" />
                  <span>Our Services</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">Everything you need for a better learning experience.</p>
              </div>
              <Link
                to="/about"
                className="text-xs font-bold text-teal-600 hover:text-teal-700 flex items-center gap-1"
              >
                <span>View All</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              {servicesList.map((srv) => (
                <Link
                  key={srv.title}
                  to={srv.link}
                  className="group p-2.5 sm:p-3 rounded-2xl bg-slate-50/70 hover:bg-white border border-slate-200/80 hover:border-teal-400 hover:shadow-xs transition-all flex items-start gap-2.5"
                >
                  <div className={`p-2 rounded-xl border ${srv.iconColor} shrink-0 group-hover:scale-105 transition-transform`}>
                    <srv.icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs font-bold text-slate-900 group-hover:text-teal-600 transition-colors truncate">
                      {srv.title}
                    </h4>
                    <p className="text-[10px] text-slate-500 leading-snug line-clamp-2 mt-0.5">
                      {srv.description}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Bottom Operational Assistance / Helpdesk Banner */}
          <div className="pt-2">
            <div className="p-3 sm:p-3.5 rounded-2xl bg-gradient-to-r from-teal-50/90 via-sky-50/70 to-indigo-50/80 border border-teal-100/90 flex items-center justify-between gap-3 shadow-2xs">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-teal-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Clock3 className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-bold text-slate-900">Library Desk & Reading Wing</span>
                    <span className="text-[9px] font-extrabold text-teal-700 bg-teal-100/90 px-1.5 py-0.5 rounded-full border border-teal-200">
                      Open Today
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 truncate mt-0.5">
                    Mon – Sat: 8:00 AM – 10:00 PM • Central Wing
                  </p>
                </div>
              </div>
              <Link
                to="/faq"
                className="shrink-0 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-[10.5px] font-bold text-teal-700 hover:text-teal-800 shadow-2xs hover:shadow-xs transition-all flex items-center gap-1"
              >
                <span>Help</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Role Gateways Workstations Section */}
      <section className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold font-poppins text-slate-950">Role-Based Library Portals</h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">Dedicated workstations tailored for Students, Faculty Members, and Administration.</p>
          </div>
          {!user && (
            <Link
              to="/login"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition-all shadow-sm w-fit"
            >
              <UserCheck className="w-4 h-4 text-blue-400" /> Sign In to Portal
            </Link>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Student Portal Card */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-blue-50/60 to-indigo-50/60 border border-blue-200/80 space-y-3.5 flex flex-col justify-between">
            <div className="space-y-2.5">
              <div className="w-11 h-11 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md">
                <GraduationCap className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold font-poppins text-slate-900">Student Portal</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Track borrowed books, request return date extensions, reserve hold titles, and download exam question banks.
              </p>
              <div className="space-y-1 text-xs text-slate-700 font-medium pt-1">
                <div className="flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5 text-blue-600" /> Max 3 Books / 7 Days Borrowing</div>
                <div className="flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5 text-blue-600" /> Self-Service Extension Privileges</div>
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
          <div className="p-5 rounded-2xl bg-gradient-to-br from-purple-50/60 to-fuchsia-50/60 border border-purple-200/80 space-y-3.5 flex flex-col justify-between">
            <div className="space-y-2.5">
              <div className="w-11 h-11 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-md">
                <Briefcase className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold font-poppins text-slate-900">Faculty Portal</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Extended borrowing quotas, department book procurement suggestions, and peer-reviewed research paper uploads.
              </p>
              <div className="space-y-1 text-xs text-slate-700 font-medium pt-1">
                <div className="flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5 text-purple-600" /> Max 10 Books / 30 Days Quota</div>
                <div className="flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5 text-purple-600" /> Priority Reserve & Book Requests</div>
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
          <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 to-indigo-950 text-white space-y-3.5 flex flex-col justify-between shadow-md">
            <div className="space-y-2.5">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center shadow-md">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold font-poppins text-white">Admin Control Desk</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Circulation desk, accession barcode scanning, fine collections, inventory cataloging, and member security management.
              </p>
              <div className="space-y-1 text-xs text-slate-300 font-medium pt-1">
                <div className="flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5 text-amber-400" /> Issue & Return Workstations</div>
                <div className="flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5 text-amber-400" /> Overdue Fine Ledger & Audit</div>
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

      {/* 6. Library Location & Hours Card */}
      <section className="bg-slate-900 text-white p-7 sm:p-8 rounded-3xl border border-slate-800 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4 sm:gap-5">
          <div className="p-3.5 sm:p-4 rounded-2xl bg-blue-600/20 border border-blue-500/30 text-blue-400 shrink-0">
            <Building2 className="w-7 h-7 sm:w-8 sm:h-8" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold font-poppins text-white">Central University Library Building</h3>
            <p className="text-xs text-slate-400 mt-0.5">Academic Block A, Ground Floor | Circulation Desk & Reading Rooms</p>
            <p className="text-xs text-slate-300 font-medium mt-1">Operating Hours: Mon – Fri (8:00 AM – 10:00 PM) | Sat (9:00 AM – 4:00 PM) | Closed on Sundays & Holidays (24/7 Digital Access)</p>
          </div>
        </div>
        <Link
          to="/about"
          className="px-6 py-3 rounded-xl bg-white text-slate-950 font-bold text-xs hover:bg-blue-50 transition-all shadow-md shrink-0"
        >
          View Library Map & Help Desk
        </Link>
      </section>
    </div>
  );
}
