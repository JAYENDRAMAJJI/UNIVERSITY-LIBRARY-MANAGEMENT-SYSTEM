import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
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
} from 'lucide-react';

interface SidebarProps {
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export default function Sidebar({ isOpenMobile, onCloseMobile }: SidebarProps) {
  const { user } = useAuth();

  const getAdminSections = () => [
    {
      title: 'MAIN CONTROL',
      links: [
        { to: '/admin/dashboard', icon: LayoutDashboard, label: 'Admin Dashboard' },
      ],
    },
    {
      title: 'DAILY CIRCULATION',
      links: [
        { to: '/admin/issue-books', icon: ScanBarcode, label: 'Issue Books' },
        { to: '/admin/return-books', icon: RotateCcw, label: 'Return Books' },
        { to: '/admin/renew-books', icon: RefreshCw, label: 'Extend Book Time' },
        { to: '/attendance', icon: UserCheck, label: 'Library Attendance' },
        { to: '/admin/borrow-history', icon: History, label: 'Book Borrow History' },
        { to: '/admin/reservations', icon: Bell, label: 'Reservations Queue' },
        { to: '/admin/fines', icon: IndianRupee, label: 'Fine Management' },
        { to: '/admin/procurement', icon: ShoppingBag, label: 'Book Purchasing & Orders' },
        { to: '/admin/no-due', icon: Award, label: 'Issue No Due Certificate' },
      ],
    },
    {
      title: 'CATALOG & INVENTORY',
      links: [
        { to: '/catalog', icon: BookOpen, label: 'Books Catalog' },
        { to: '/admin/books', icon: Layers, label: 'Manage Books' },
        { to: '/admin/inventory', icon: Tag, label: 'Inventory & Shelves' },
        { to: '/admin/digital-library', icon: Download, label: 'Digital Library' },
        { to: '/admin/downloads', icon: FileDown, label: 'Official Forms & Downloads' },
      ],
    },
    {
      title: 'MEMBER & USER ADMIN',
      links: [
        { to: '/admin/members', icon: Users, label: 'Student & Faculty Members' },
        { to: '/admin/users', icon: ShieldCheck, label: 'User Roles & Permissions' },
      ],
    },
  ];

  const getFacultySections = () => [
    {
      title: 'FACULTY WORKSPACE',
      links: [
        { to: '/faculty/dashboard', icon: LayoutDashboard, label: 'Faculty Portal' },
        { to: '/no-due', icon: Award, label: 'Apply for No Due' },
        { to: '/borrow-history', icon: History, label: 'My Borrowed Books' },
        { to: '/attendance', icon: UserCheck, label: 'Library Attendance' },
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
        { to: '/notices', icon: Bell, label: 'Notices & Circulars' },
      ],
    },
  ];

  const getStudentSections = () => [
    {
      title: 'ACADEMIC WORKSPACE',
      links: [
        { to: '/student/dashboard', icon: LayoutDashboard, label: 'Student Academic Portal' },
        { to: '/no-due', icon: Award, label: 'Apply for No Due' },
        { to: '/borrow-history', icon: History, label: 'My Borrowed Books' },
        { to: '/attendance', icon: UserCheck, label: 'Library Attendance' },
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
        { to: '/notices', icon: Bell, label: 'Notices & Circulars' },
      ],
    },
  ];

  const sections =
    user?.role === 'ADMIN' || user?.role === 'STAFF'
      ? getAdminSections()
      : user?.role === 'FACULTY'
      ? getFacultySections()
      : getStudentSections();

  const renderNavContent = () => (
    <nav className="p-5 space-y-6">
      {sections.map((section) => (
        <div key={section.title} className="space-y-1">
          <p className="px-3 text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">{section.title}</p>
          {section.links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              onClick={onCloseMobile}
              className={({ isActive }) =>
                `group relative flex items-center gap-3.5 rounded-2xl px-3.5 py-2.5 transition-all duration-200 text-sm font-semibold ${
                  isActive
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-200 font-bold'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`
              }
            >
              <link.icon className="h-5 w-5 shrink-0" />
              <span>{link.label}</span>
            </NavLink>
          ))}
        </div>
      ))}
    </nav>
  );

  return (
    <>
      {/* Fixed Desktop Sidebar */}
      <aside className="w-72 sm:w-80 hidden md:flex flex-col shrink-0 bg-white border-r border-slate-200 h-full overflow-y-auto z-30 select-none">
        {renderNavContent()}
      </aside>

      {/* Mobile Drawer Overlay */}
      {isOpenMobile && (
        <div className="md:hidden fixed inset-0 z-50 flex bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="w-80 max-w-[80vw] bg-white h-full overflow-y-auto flex flex-col shadow-2xl">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <span className="font-bold text-slate-900 text-sm font-poppins">{user?.role || 'Portal'} Menu</span>
              <button onClick={onCloseMobile} className="p-2 text-slate-500 hover:text-slate-900">
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
