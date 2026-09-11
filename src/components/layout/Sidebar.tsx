import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { usePermission } from '../../hooks/usePermission';
import { libraryStore, getRelevantNoticesForUser, isNoticeReadForUser } from '../../services/libraryStore.service';
import { ModuleKey } from '../../types/rbac';
import {
  LayoutDashboard,
  BookOpen,
  Layers,
  ScanBarcode,
  RotateCcw,
  RefreshCw,
  Bell,
  IndianRupee,
  Users,
  Tag,
  Download,
  ShieldCheck,
  BarChart3,
  ShoppingBag,
  Sparkles,
  FileText,
  History,
  X,
  UserCheck,
  Award,
  FileDown,
  Bookmark,
  Shield,
  KeyRound,
  Sliders,
  Settings,
} from 'lucide-react';

interface SidebarProps {
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export default function Sidebar({ isOpenMobile, onCloseMobile }: SidebarProps) {
  const { user } = useAuth();
  const { canView, isAdmin } = usePermission();
  const location = useLocation();
  const [state, setState] = useState(libraryStore.snapshot);

  useEffect(() => {
    const sub = libraryStore.getObservable().subscribe(setState);
    return () => sub.unsubscribe();
  }, []);

  const notices = getRelevantNoticesForUser(user, state.notices || []);
  const unreadNotices = notices.filter((n) => !isNoticeReadForUser(n, user, state));
  const unreadCount = unreadNotices.length;

  const isLinkActive = (to: string) => {
    const [targetPath, targetSearch] = to.split('?');
    const currentPath = location.pathname;
    const currentSearch = location.search.replace(/^\?/, '');

    if (targetSearch) {
      return currentPath === targetPath && currentSearch.includes(targetSearch);
    } else {
      if (currentPath === targetPath) {
        if (currentPath.includes('/dashboard')) {
          return !currentSearch || currentSearch.includes('tab=loans');
        }
        return true;
      }
      return false;
    }
  };

  const pendingApprovalsCount = (state.members || []).filter((m) => m.status === 'PENDING_APPROVAL').length;

  const getAdminSections = () => {
    const allSections: {
      title: string;
      links: {
        to: string;
        icon: any;
        label: string;
        module?: ModuleKey;
        adminOnly?: boolean;
        badgeCount?: number;
      }[];
    }[] = [
      {
        title: 'MAIN CONTROL',
        links: [
          { to: '/admin/dashboard', icon: LayoutDashboard, label: 'Admin Dashboard', module: 'dashboard' },
        ],
      },
      {
        title: 'DAILY CIRCULATION',
        links: [
          { to: '/admin/issue-books', icon: ScanBarcode, label: 'Issue Books', module: 'circulation' },
          { to: '/admin/return-books', icon: RotateCcw, label: 'Return Books', module: 'circulation' },
          { to: '/admin/renew-books', icon: RefreshCw, label: 'Extend Book Time', module: 'circulation' },
          { to: '/admin/attendance', icon: UserCheck, label: 'Library Attendance Desk', module: 'attendance' },
          { to: '/admin/borrow-history', icon: History, label: 'Book Borrow History', module: 'circulation' },
          { to: '/admin/reservations', icon: Bell, label: 'Reservations Queue', module: 'reservations' },
          { to: '/admin/fines', icon: IndianRupee, label: 'Fine Management', module: 'fines' },
          { to: '/admin/procurement', icon: ShoppingBag, label: 'Book Purchasing & Orders', module: 'procurement' },
          { to: '/admin/no-due', icon: Award, label: 'Issue No Due Certificate', module: 'nodue' },
        ],
      },
      {
        title: 'CATALOG & INVENTORY',
        links: [
          { to: '/catalog', icon: BookOpen, label: 'Books Catalog', module: 'books' },
          { to: '/admin/books', icon: Layers, label: 'Manage Books', module: 'books' },
          { to: '/admin/inventory', icon: Tag, label: 'Inventory & Shelves', module: 'inventory' },
          { to: '/admin/digital-library', icon: Download, label: 'Digital Library', module: 'digital_library' },
          { to: '/admin/downloads', icon: FileDown, label: 'Official Forms & Downloads', module: 'downloads' },
        ],
      },
      {
        title: 'MEMBER & USER ADMIN',
        links: [
          { to: '/admin/approvals', icon: UserCheck, label: 'Account Approvals', badgeCount: pendingApprovalsCount, module: 'approvals' },
          { to: '/admin/members', icon: Users, label: 'Student & Faculty Members', module: 'members' },
          { to: '/admin/users', icon: ShieldCheck, label: 'User Directory & Roles', module: 'members' },
          { to: '/notifications', icon: Bell, label: 'Notifications & Alerts', module: 'notifications' },
        ],
      },
      {
        title: 'SETTINGS & ADMINISTRATION',
        links: [
          { to: '/admin/roles-permissions', icon: Shield, label: 'Roles & Permissions', module: 'roles_permissions', adminOnly: true },
          { to: '/admin/audit-logs', icon: FileText, label: 'System Audit Logs', module: 'audit_logs', adminOnly: true },
          { to: '/admin/settings', icon: Settings, label: 'Library Settings & Hours', module: 'settings', adminOnly: true },
        ],
      },
    ];

    // Filter each section based on user's active permissions and role
    return allSections
      .map((sec) => ({
        ...sec,
        links: sec.links.filter((l) => {
          if (l.adminOnly && !isAdmin) return false;
          if (l.module) {
            return canView(l.module);
          }
          return true;
        }),
      }))
      .filter((sec) => sec.links.length > 0);
  };

  const getStaffSections = () => [
    {
      title: 'CIRCULATION DESK',
      links: [
        { to: '/staff/dashboard', icon: LayoutDashboard, label: 'Staff Operations Desk' },
        { to: '/admin/issue-books', icon: ScanBarcode, label: 'Issue Books Desk' },
        { to: '/admin/return-books', icon: RotateCcw, label: 'Return Books Desk' },
        { to: '/admin/renew-books', icon: RefreshCw, label: 'Extend Book Time' },
        { to: '/admin/attendance', icon: UserCheck, label: 'Door Attendance Desk' },
        { to: '/admin/borrow-history', icon: History, label: 'Circulation History' },
        { to: '/admin/reservations', icon: Bell, label: 'Hold Requests Queue' },
        { to: '/admin/fines', icon: IndianRupee, label: 'Fine Collections' },
      ],
    },
    {
      title: 'CATALOG & MEMBERS',
      links: [
        { to: '/catalog', icon: BookOpen, label: 'Books Catalog' },
        { to: '/admin/inventory', icon: Tag, label: 'Inventory & Shelves' },
        { to: '/admin/approvals', icon: UserCheck, label: 'Account Approvals', badgeCount: pendingApprovalsCount },
        { to: '/admin/members', icon: Users, label: 'Member Directory' },
        { to: '/notifications', icon: Bell, label: 'Notifications & Alerts' },
      ],
    },
  ];

  const getFacultySections = () => [
    {
      title: 'FACULTY WORKSPACE',
      links: [
        { to: '/faculty/dashboard', icon: LayoutDashboard, label: 'Faculty Portal' },
        { to: '/reservations', icon: Bookmark, label: 'Reservations Queue' },
        { to: '/extensions', icon: RefreshCw, label: 'Extend Book Time' },
        { to: '/fines', icon: IndianRupee, label: 'My Fines & Dues' },
        { to: '/no-due', icon: Award, label: 'Apply for No Due' },
        { to: '/borrow-history', icon: History, label: 'My Borrowed Books' },
      ],
    },
    {
      title: 'RESEARCH & CATALOG',
      links: [
        { to: '/catalog', icon: BookOpen, label: 'Books Catalog' },
        { to: '/digital-resources', icon: Download, label: 'Digital Research Papers' },
      ],
    },
    {
      title: 'RESOURCES & GUIDELINES',
      links: [
        { to: '/downloads', icon: FileText, label: 'Library Forms & Downloads' },
        { to: '/notifications', icon: Bell, label: 'Notifications & Alerts' },
      ],
    },
  ];

  const getScholarSections = () => [
    {
      title: 'DOCTORAL WORKSPACE',
      links: [
        { to: '/research-scholar/dashboard', icon: LayoutDashboard, label: 'Doctoral Scholar Portal' },
        { to: '/reservations', icon: Bookmark, label: 'Reservations Queue' },
        { to: '/extensions', icon: RefreshCw, label: 'Extend Book Time' },
        { to: '/fines', icon: IndianRupee, label: 'My Fines & Dues' },
        { to: '/no-due', icon: Award, label: 'Apply for No Due' },
        { to: '/borrow-history', icon: History, label: 'My Borrowed Books' },
      ],
    },
    {
      title: 'RESEARCH & THESIS VAULT',
      links: [
        { to: '/catalog', icon: BookOpen, label: 'Books Catalog' },
        { to: '/digital-resources', icon: Download, label: 'Digital Library & Papers' },
      ],
    },
    {
      title: 'RESOURCES & DOWNLOADS',
      links: [
        { to: '/downloads', icon: FileText, label: 'Library Downloads & Forms' },
        { to: '/notifications', icon: Bell, label: 'Notifications & Alerts' },
      ],
    },
  ];

  const getStudentSections = () => [
    {
      title: 'ACADEMIC WORKSPACE',
      links: [
        { to: '/student/dashboard', icon: LayoutDashboard, label: 'Student Academic Portal' },
        { to: '/reservations', icon: Bookmark, label: 'Reservations Queue' },
        { to: '/extensions', icon: RefreshCw, label: 'Extend Book Time' },
        { to: '/fines', icon: IndianRupee, label: 'My Fines & Dues' },
        { to: '/no-due', icon: Award, label: 'Apply for No Due' },
        { to: '/borrow-history', icon: History, label: 'My Borrowed Books' },
      ],
    },
    {
      title: 'CATALOG & DIGITAL',
      links: [
        { to: '/catalog', icon: BookOpen, label: 'Books Catalog' },
        { to: '/digital-resources', icon: Download, label: 'Digital Library & Papers' },
      ],
    },
    {
      title: 'SERVICES & RESOURCES',
      links: [
        { to: '/downloads', icon: FileText, label: 'Library Downloads & Forms' },
        { to: '/notifications', icon: Bell, label: 'Notifications & Alerts' },
      ],
    },
  ];

  const sections =
    user?.role === 'ADMIN'
      ? getAdminSections()
      : user?.role === 'STAFF' || user?.role === 'LIBRARIAN'
      ? getStaffSections()
      : user?.role === 'FACULTY'
      ? getFacultySections()
      : user?.role === 'RESEARCH_SCHOLAR'
      ? getScholarSections()
      : getStudentSections();

  const renderNavContent = () => (
    <nav className="p-3.5 sm:p-4 space-y-4 sm:space-y-5">
      {sections.map((section) => (
        <div key={section.title} className="space-y-1">
          <p className="px-2.5 text-[10.5px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">{section.title}</p>
          {section.links.map((link) => {
            const active = isLinkActive(link.to);
            return (
              <Link
                key={link.to}
                to={link.to}
                onClick={onCloseMobile}
                className={`group relative flex items-center gap-2.5 rounded-xl px-3 py-2 transition-all duration-200 text-xs sm:text-[13px] font-semibold cursor-pointer ${
                  active
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-200 font-bold'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <link.icon className="h-4.5 w-4.5 shrink-0" />
                <span className="flex-1 truncate">{link.label}</span>
                {link.to === '/notifications' && unreadCount > 0 && (
                  <span
                    className={`text-[9.5px] font-extrabold px-1.5 py-0.2 rounded-full shadow-xs shrink-0 ${
                      active
                        ? 'bg-white text-blue-700'
                        : 'bg-rose-600 text-white animate-pulse'
                    }`}
                  >
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
                {(link as any).badgeCount !== undefined && (link as any).badgeCount > 0 && (
                  <span
                    className={`text-[9.5px] font-extrabold px-1.5 py-0.2 rounded-full shadow-xs shrink-0 ${
                      active
                        ? 'bg-white text-amber-800'
                        : 'bg-amber-500 text-white animate-pulse'
                    }`}
                  >
                    {(link as any).badgeCount}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );

  return (
    <>
      {/* Fixed Desktop Sidebar */}
      <aside className="w-56 md:w-60 lg:w-64 xl:w-72 hidden md:flex flex-col shrink-0 bg-white border-r border-slate-200/80 h-full overflow-y-auto z-30 select-none">
        {renderNavContent()}
      </aside>

      {/* Mobile Drawer Overlay */}
      {isOpenMobile && (
        <div className="md:hidden fixed inset-0 z-50 flex bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="w-72 sm:w-80 max-w-[85vw] bg-white h-full overflow-y-auto flex flex-col shadow-2xl">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <span className="font-bold text-slate-900 text-sm font-poppins">{user?.role || 'Portal'} Menu</span>
              <button onClick={onCloseMobile} className="p-2 text-slate-500 hover:text-slate-900 cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>
            {renderNavContent()}
          </div>
          <div className="flex-1" onClick={onCloseMobile} />
        </div>
      )}
    </>
  );
}
