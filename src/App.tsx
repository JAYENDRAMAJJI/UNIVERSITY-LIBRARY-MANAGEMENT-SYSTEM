/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { type ReactNode } from 'react';
import { BrowserRouter, Navigate, Routes, Route } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import MainLayout from './components/layout/MainLayout';
import DashboardLayout from './components/layout/DashboardLayout';
import ProtectedRoute from './components/guards/ProtectedRoute';
import RoleRoute from './components/guards/RoleRoute';

// Public & Workspace Pages
import Home from './pages/Home';
import About from './pages/About';
import Collections from './pages/Collections';
import BookSearch from './pages/BookSearch';
import DigitalResources from './pages/DigitalResources';
import LibraryServices from './pages/LibraryServices';
import Downloads from './pages/Downloads';
import Notices from './pages/Notices';
import Events from './pages/Events';
import Gallery from './pages/Gallery';
import FAQ from './pages/FAQ';
import Contact from './pages/Contact';
import Feedback from './pages/Feedback';
import Profile from './pages/Profile';

import Login from './pages/auth/Login';
import NotFound from './pages/NotFound';
import AccessDenied from './pages/auth/AccessDenied';

// Dashboards
import AdminDashboard from './pages/dashboards/admin/AdminDashboard';
import FacultyDashboard from './pages/dashboards/faculty/FacultyDashboard';
import StudentDashboard from './pages/dashboards/student/StudentDashboard';

// Enterprise Admin Modules
import BooksManagement from './pages/admin/BooksManagement';
import InventoryManagement from './pages/admin/InventoryManagement';
import IssueBooks from './pages/admin/IssueBooks';
import ReturnBooks from './pages/admin/ReturnBooks';
import RenewBooks from './pages/admin/RenewBooks';
import ReservationsManagement from './pages/admin/ReservationsManagement';
import FineManagement from './pages/admin/FineManagement';
import MembersManagement from './pages/admin/MembersManagement';
import MasterData from './pages/admin/MasterData';
import DigitalLibraryAdmin from './pages/admin/DigitalLibraryAdmin';
import UsersManagement from './pages/admin/UsersManagement';
import ReportsAnalytics from './pages/admin/ReportsAnalytics';
import SettingsManagement from './pages/admin/SettingsManagement';
import ProcurementManagement from './pages/admin/ProcurementManagement';
import BookBorrowHistory from './pages/admin/BookBorrowHistory';
import AttendanceManagement from './pages/admin/AttendanceManagement';

function PortalPage({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-poppins text-slate-900">{title}</h1>
        <p className="mt-2 text-slate-600">{description}</p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        {children ?? <p className="text-slate-600">This section is available and ready for content.</p>}
      </div>
    </div>
  );
}

function ListPage({ title, description, items }: { title: string; description: string; items: string[] }) {
  return (
    <PortalPage title={title} description={description}>
      <ul className="space-y-3 text-slate-700">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-3">
            <span className="mt-2 h-2 w-2 rounded-full bg-blue-600 shrink-0" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </PortalPage>
  );
}

function DashboardRedirect() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div className="flex justify-center items-center h-[60vh] text-slate-500">Loading portal...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  switch (user.role) {
    case 'ADMIN':
      return <Navigate to="/admin/dashboard" replace />;
    case 'FACULTY':
      return <Navigate to="/faculty/dashboard" replace />;
    case 'STUDENT':
      return <Navigate to="/student/dashboard" replace />;
    default:
      return <Navigate to="/" replace />;
  }
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Auth & Access Control */}
          <Route path="login" element={<Login />} />
          <Route path="access-denied" element={<AccessDenied />} />

          {/* Protected Workspace Routes (Rendered inside DashboardLayout with Fixed Stationary Sidebar) */}
          <Route element={<DashboardLayout />}>
            <Route element={<ProtectedRoute />}>
              <Route path="dashboard" element={<DashboardRedirect />} />
              <Route path="profile" element={<Profile />} />
              <Route path="catalog" element={<BookSearch />} />
              <Route path="book-search" element={<BookSearch />} />
              <Route path="attendance" element={<AttendanceManagement />} />
              <Route path="borrow-history" element={<BookBorrowHistory />} />
              <Route path="new-arrivals" element={<Navigate to="/catalog?filter=new-arrivals" replace />} />
              <Route path="digital-resources" element={<DigitalResources />} />
              <Route path="downloads" element={<Downloads />} />
              <Route path="notices" element={<Notices />} />
              <Route path="events" element={<Events />} />
              <Route
                path="notifications"
                element={
                  <ListPage
                    title="Notifications"
                    description="Recent alerts, reminders, and system updates appear here."
                    items={['No unread notifications right now.', 'New activity will show up here as soon as it arrives.']}
                  />
                }
              />

              {/* Admin & Staff Exclusive Modules */}
              <Route element={<RoleRoute allowedRoles={['ADMIN', 'STAFF']} />}>
                <Route path="admin" element={<Navigate to="/admin/dashboard" replace />} />
                <Route path="admin/dashboard" element={<AdminDashboard />} />
                <Route path="admin/books" element={<BooksManagement />} />
                <Route path="admin/inventory" element={<InventoryManagement />} />
                <Route path="admin/issue-books" element={<IssueBooks />} />
                <Route path="admin/return-books" element={<ReturnBooks />} />
                <Route path="admin/renew-books" element={<RenewBooks />} />
                <Route path="admin/attendance" element={<AttendanceManagement />} />
                <Route path="admin/borrow-history" element={<BookBorrowHistory />} />
                <Route path="admin/reservations" element={<ReservationsManagement />} />
                <Route path="admin/fines" element={<FineManagement />} />
                <Route path="admin/procurement" element={<ProcurementManagement />} />
                <Route path="admin/members" element={<MembersManagement />} />
                <Route path="admin/categories" element={<MasterData />} />
                <Route path="admin/authors" element={<MasterData />} />
                <Route path="admin/publishers" element={<MasterData />} />
                <Route path="admin/digital-library" element={<DigitalLibraryAdmin />} />
                <Route path="admin/users" element={<UsersManagement />} />
                <Route path="admin/reports" element={<ReportsAnalytics />} />
                <Route path="admin/settings" element={<SettingsManagement />} />
              </Route>

              {/* Faculty Exclusive Workspace */}
              <Route element={<RoleRoute allowedRoles={['FACULTY']} />}>
                <Route path="faculty/dashboard" element={<FacultyDashboard />} />
              </Route>

              {/* Student Exclusive Workspace */}
              <Route element={<RoleRoute allowedRoles={['STUDENT']} />}>
                <Route path="student/dashboard" element={<StudentDashboard />} />
              </Route>
            </Route>
          </Route>

          {/* Public Website Routes (Navbar + Footer) */}
          <Route path="/" element={<MainLayout />}>
            <Route index element={<Home />} />
            <Route path="about" element={<About />} />
            <Route path="catalog" element={<BookSearch />} />
            <Route path="book-search" element={<BookSearch />} />
            <Route path="collections" element={<Collections />} />
            <Route path="library-services" element={<LibraryServices />} />
            <Route path="gallery" element={<Gallery />} />
            <Route path="faq" element={<FAQ />} />
            <Route path="contact" element={<Contact />} />
            <Route path="feedback" element={<Feedback />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
