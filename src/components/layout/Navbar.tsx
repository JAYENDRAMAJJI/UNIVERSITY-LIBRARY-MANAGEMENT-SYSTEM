import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  BookOpen,
  Menu,
  X,
  User as UserIcon,
  LogOut,
  Bell,
  CheckCircle2,
  ChevronDown,
  Settings,
  HelpCircle,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { libraryStore } from '../../services/libraryStore.service';
import { Notice } from '../../types/library';

interface NavbarProps {
  onToggleMobileSidebar?: () => void;
}

export default function Navbar({ onToggleMobileSidebar }: NavbarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [state, setState] = useState(libraryStore.snapshot);

  const notifRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const sub = libraryStore.getObservable().subscribe(setState);
    return () => sub.unsubscribe();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setIsNotifOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLogout = () => {
    navigate('/', { replace: true });
    logout();
  };

  const getDashboardLink = () => {
    if (!user) return '/login';
    switch (user.role) {
      case 'ADMIN':
        return '/admin/dashboard';
      case 'FACULTY':
        return '/faculty/dashboard';
      case 'STUDENT':
        return '/student/dashboard';
      default:
        return '/';
    }
  };

  const brandLink = user ? getDashboardLink() : '/';

  const handleLogoClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey) return;
    e.preventDefault();
    if (location.pathname === brandLink) {
      window.location.reload();
    } else {
      window.location.href = brandLink;
    }
  };

  const navLinks = [
    { to: '/', label: 'Home' },
    { to: '/catalog', label: 'Books Catalog' },
    { to: '/about', label: 'About' },
    { to: '/collections', label: 'Collections' },
    { to: '/digital-resources', label: 'Digital Library' },
    { to: '/feedback', label: 'Feedback' },
  ];

  const handleMobileMenuClick = () => {
    if (onToggleMobileSidebar) {
      onToggleMobileSidebar();
    } else {
      setIsOpen(!isOpen);
    }
  };

  const userEmail = user?.email?.toLowerCase() || '';
  const userName = user?.name?.toLowerCase() || '';
  const userRole = user?.role || 'GUEST';

  const notices: Notice[] = (state.notices || []).filter((notice) => {
    if (notice.recipientEmail) {
      const matchEmail = notice.recipientEmail.toLowerCase() === userEmail;
      const matchName = notice.recipientName && notice.recipientName.toLowerCase() === userName;
      return matchEmail || matchName;
    }

    if (notice.targetAudience) {
      if (notice.targetAudience === 'ALL') return true;
      if (notice.targetAudience === 'STUDENTS' && userRole === 'STUDENT') return true;
      if (notice.targetAudience === 'FACULTY' && userRole === 'FACULTY') return true;
      if (notice.targetAudience === 'ADMIN' && userRole === 'ADMIN') return true;
      return false;
    }

    return true;
  });

  const unreadCount = notices.length;

  // Active member profile details for header user card
  const currentMember =
    state.members.find((m) => user?.email && m.email.toLowerCase() === user.email.toLowerCase()) ||
    state.members.find((m) => user?.id && m.id === user.id) ||
    state.members.find((m) => user?.name && m.name.toLowerCase() === user.name.toLowerCase()) ||
    state.members[0];

  const displayName = user?.name || currentMember?.name || 'Jayendra Majji';
  const displayEmail = user?.email || currentMember?.email || 'jayendramajji22@gmail.com';
  const displayDept = user?.department || currentMember?.department || 'Computer Science & Engineering';
  const displayId = user?.memberCardNo || currentMember?.memberCardNo || 'STU-2026-7326';
  const displayAvatar = user?.avatarUrl || currentMember?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80';

  return (
    <nav className="h-20 shrink-0 bg-white/95 shadow-2xs backdrop-blur-xl transition-all z-40 w-full relative">
      <div className="w-full px-4 sm:px-6 lg:px-8 h-full">
        <div className="flex h-full justify-between items-center gap-4">
          {/* Brand Logo */}
          <div className="flex items-center shrink-0">
            <Link
              to={brandLink}
              onClick={handleLogoClick}
              className="flex items-center gap-3 group cursor-pointer"
              title="Click to refresh portal"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600 text-white shadow-md shadow-blue-200 group-hover:scale-105 transition-transform">
                <BookOpen className="h-5.5 w-5.5" />
              </span>
              <div>
                <span className="text-lg xl:text-xl font-bold font-poppins text-slate-900 block leading-tight">University Library</span>
                <span className="text-[10px] xl:text-xs font-bold uppercase tracking-widest text-blue-600 block">Enterprise Portal</span>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation Links */}
          <div className="hidden lg:flex items-center gap-1 xl:gap-2">
            {!user && (
              <>
                {navLinks.map((link) => {
                  const isActive = location.pathname === link.to;
                  return (
                    <Link
                      key={link.to}
                      to={link.to}
                      className={`px-3 py-2 rounded-xl text-xs xl:text-sm font-semibold transition-all whitespace-nowrap ${
                        isActive ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                      }`}
                    >
                      {link.label}
                    </Link>
                  );
                })}
                <div className="h-6 w-px bg-slate-200 mx-1.5" />
              </>
            )}

            {/* Corner of the site: Notification Bell & User Profile Dropdown Pill */}
            <div className="flex items-center gap-3">
              {/* Notification Bell Icon */}
              <div className="relative" ref={notifRef}>
                <button
                  type="button"
                  onClick={() => {
                    setIsNotifOpen(!isNotifOpen);
                    setIsUserMenuOpen(false);
                  }}
                  className="relative p-2.5 rounded-2xl border border-slate-200 bg-slate-50/80 hover:bg-blue-50 hover:border-blue-200 text-slate-700 hover:text-blue-600 transition-all cursor-pointer shadow-2xs"
                  title="Library Notifications & Circulars"
                >
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-rose-600 text-[10px] font-extrabold text-white shadow-xs animate-pulse">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {/* Notification Dropdown Panel */}
                {isNotifOpen && (
                  <div className="absolute right-0 mt-3 w-80 sm:w-96 rounded-3xl bg-white border border-slate-200 shadow-2xl overflow-hidden z-50 animate-fadeIn">
                    <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 p-4 text-white flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Bell className="h-4 w-4 text-blue-400" />
                        <h3 className="font-bold text-sm font-poppins text-white">Notifications & Circulars</h3>
                      </div>
                      <button
                        onClick={() => setIsNotifOpen(false)}
                        className="text-slate-400 hover:text-white p-1"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="max-h-96 overflow-y-auto divide-y divide-slate-100 p-2 space-y-2">
                      {notices.map((notice) => (
                        <div
                          key={notice.id}
                          className={`p-3.5 rounded-2xl text-xs space-y-1.5 transition-all ${
                            notice.isUrgent
                              ? 'bg-rose-50/70 border border-rose-200/80 text-rose-950'
                              : 'bg-slate-50/80 border border-slate-200/60 text-slate-800'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase ${
                              notice.isUrgent ? 'bg-rose-600 text-white' : 'bg-blue-100 text-blue-800'
                            }`}>
                              {notice.isUrgent ? 'URGENT ALERT' : 'CIRCULAR'}
                            </span>
                            <span className="text-[10px] font-mono text-slate-400">{notice.createdDate}</span>
                          </div>
                          <h4 className="font-bold text-slate-900 text-xs leading-snug">{notice.title}</h4>
                          <p className="text-[11px] text-slate-600 leading-relaxed">{notice.content}</p>
                          <div className="pt-1 text-[10px] text-slate-400 font-medium flex items-center justify-between border-t border-slate-200/40">
                            <span>Issued: <strong>{notice.senderName || 'Circulation Desk'}</strong></span>
                            {notice.recipientName && <span className="text-blue-700 font-bold">{notice.recipientName}</span>}
                          </div>
                        </div>
                      ))}

                      {notices.length === 0 && (
                        <div className="p-8 text-center text-slate-400 space-y-2">
                          <CheckCircle2 className="h-8 w-8 mx-auto text-emerald-500 opacity-60" />
                          <p className="text-xs font-semibold text-slate-600">No Notifications</p>
                          <p className="text-[11px] text-slate-400">All clear! Overdue alerts and announcements will appear here.</p>
                        </div>
                      )}
                    </div>

                    <div className="p-2.5 bg-slate-50 border-t border-slate-100 text-center">
                      <Link
                        to="/notifications"
                        onClick={() => setIsNotifOpen(false)}
                        className="text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline inline-flex items-center gap-1"
                      >
                        Open Notification Center &rarr;
                      </Link>
                    </div>
                  </div>
                )}
              </div>

              {/* User Profile Pill & Interactive Dropdown Menu */}
              {user ? (
                <div className="relative" ref={userMenuRef}>
                  <button
                    type="button"
                    onClick={() => {
                      setIsUserMenuOpen(!isUserMenuOpen);
                      setIsNotifOpen(false);
                    }}
                    className="flex items-center gap-3 rounded-2xl bg-slate-100/90 border border-slate-200/80 hover:bg-slate-200/70 px-2.5 py-1.5 transition-all cursor-pointer shadow-2xs group select-none"
                    title={`${displayName} (${displayId}) - Profile & Account Settings`}
                  >
                    <img
                      src={displayAvatar}
                      alt={displayName}
                      className="w-10 h-10 rounded-xl object-cover border border-white shadow-2xs shrink-0"
                    />
                    <div className="text-left hidden sm:block leading-tight">
                      <span className="text-xs sm:text-sm font-extrabold font-poppins text-slate-900 block truncate max-w-[140px]">
                        {displayName}
                      </span>
                      <span className="text-[11px] font-bold font-mono text-blue-600 block truncate max-w-[140px]">
                        {displayId}
                      </span>
                    </div>
                    <ChevronDown
                      className={`h-4 w-4 text-slate-400 group-hover:text-slate-600 transition-transform duration-200 shrink-0 ${
                        isUserMenuOpen ? 'rotate-180 text-blue-600' : ''
                      }`}
                    />
                  </button>

                  {/* Dropdown Menu Card */}
                  {isUserMenuOpen && (
                    <div className="absolute right-0 mt-3 w-72 sm:w-80 rounded-3xl bg-white border border-slate-200 shadow-2xl p-4 sm:p-5 z-50 animate-fadeIn text-left space-y-3">
                      {/* Header Details */}
                      <div className="space-y-0.5">
                        <h3 className="font-extrabold text-base sm:text-lg font-poppins text-slate-900 leading-tight">
                          {displayName}
                        </h3>
                        <p className="text-xs font-mono font-medium text-slate-500 truncate">
                          {displayEmail}
                        </p>
                        <p className="text-xs font-bold text-blue-600 pt-1 tracking-wide">
                          {displayDept}
                        </p>
                      </div>

                      <hr className="border-slate-100" />

                      {/* Navigation Links */}
                      <div className="space-y-1 text-xs sm:text-sm font-semibold">
                        <Link
                          to="/profile"
                          onClick={() => setIsUserMenuOpen(false)}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-700 hover:text-blue-700 hover:bg-blue-50/70 transition-colors"
                        >
                          <UserIcon className="h-4.5 w-4.5 text-slate-500 shrink-0" />
                          <span>My Profile</span>
                        </Link>

                        <Link
                          to={user.role === 'ADMIN' ? '/admin/settings' : '/profile'}
                          onClick={() => setIsUserMenuOpen(false)}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-700 hover:text-blue-700 hover:bg-blue-50/70 transition-colors"
                        >
                          <Settings className="h-4.5 w-4.5 text-slate-500 shrink-0" />
                          <span>Settings & Preferences</span>
                        </Link>

                        <Link
                          to="/feedback"
                          onClick={() => setIsUserMenuOpen(false)}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-700 hover:text-blue-700 hover:bg-blue-50/70 transition-colors"
                        >
                          <HelpCircle className="h-4.5 w-4.5 text-slate-500 shrink-0" />
                          <span>Help & Support Center</span>
                        </Link>
                      </div>

                      <hr className="border-slate-100" />

                      {/* Sign Out Action */}
                      <button
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          handleLogout();
                        }}
                          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer text-left"
                        >
                          <LogOut className="h-4.5 w-4.5 text-rose-600 shrink-0 stroke-[2.5]" />
                          <span>Sign Out</span>
                        </button>
                      </div>
                  )}
                </div>
              ) : (
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2.5 text-xs xl:text-sm font-bold text-white shadow-md shadow-blue-200 hover:opacity-95 hover:shadow-lg transition-all whitespace-nowrap shrink-0 ml-1"
                >
                  <UserIcon className="h-4 w-4" />
                  <span>Portal Login</span>
                </Link>
              )}
            </div>
          </div>

          {/* Mobile Toggle */}
          <div className="flex items-center gap-2 lg:hidden">
            <button
              type="button"
              onClick={() => setIsNotifOpen(!isNotifOpen)}
              className="relative p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            >
              <Bell className="h-6 w-6" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-600 text-[9px] font-bold text-white">
                  {unreadCount}
                </span>
              )}
            </button>
            <button
              onClick={handleMobileMenuClick}
              className="p-2.5 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            >
              {isOpen ? <X className="h-7 w-7" /> : <Menu className="h-7 w-7" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {isOpen && !onToggleMobileSidebar && (
        <div className="md:hidden border-b border-slate-200 bg-white/95 backdrop-blur-xl px-4 pb-4 pt-2 space-y-2">
          {!user &&
            navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setIsOpen(false)}
                className="block rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                {link.label}
              </Link>
            ))}

          <div className="pt-2 border-t border-slate-100">
            {user ? (
              <>
                <div className="px-4 py-2 border-b border-slate-100 space-y-0.5 mb-2">
                  <p className="font-extrabold text-sm text-slate-900">{displayName}</p>
                  <p className="text-xs font-mono text-blue-600">{displayId}</p>
                  <p className="text-xs text-slate-500">{displayEmail}</p>
                </div>
                <Link
                  to={getDashboardLink()}
                  onClick={() => setIsOpen(false)}
                  className="block rounded-xl px-4 py-2.5 text-sm font-bold text-blue-700 bg-blue-50 mb-1"
                >
                  {user.role} Dashboard
                </Link>
                <Link
                  to="/profile"
                  onClick={() => setIsOpen(false)}
                  className="block rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  My Profile
                </Link>
                <button
                  onClick={() => {
                    setIsOpen(false);
                    handleLogout();
                  }}
                  className="block w-full text-left rounded-xl px-4 py-2.5 text-sm font-bold text-rose-600 hover:bg-rose-50"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <Link
                to="/login"
                onClick={() => setIsOpen(false)}
                className="block text-center rounded-xl bg-blue-600 py-3 text-sm font-bold text-white shadow-md"
              >
                Portal Login
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
