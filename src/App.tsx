/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Navigate, Routes, Route } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import MainLayout from './components/layout/MainLayout';
import DashboardLayout from './components/layout/DashboardLayout';
import ProtectedRoute from './components/guards/ProtectedRoute';
import RoleRoute from './components/guards/RoleRoute';
import PermissionRoute from './components/guards/PermissionRoute';

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
import Register from './pages/auth/Register';
import NotFound from './pages/NotFound';
import AccessDenied from './pages/auth/AccessDenied';

// Dashboards
import AdminDashboard from './pages/dashboards/admin/AdminDashboard';
import StaffDashboard from './pages/dashboards/staff/StaffDashboard';
import FacultyDashboard from './pages/dashboards/faculty/FacultyDashboard';
import ResearchScholarDashboard from './pages/dashboards/scholar/ResearchScholarDashboard';
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
import RolesPermissionsManagement from './pages/admin/RolesPermissionsManagement';
import AuditLogsManagement from './pages/admin/AuditLogsManagement';
import SettingsManagement from './pages/admin/SettingsManagement';
import ProcurementManagement from './pages/admin/ProcurementManagement';
import BookBorrowHistory from './pages/admin/BookBorrowHistory';
import AttendanceManagement from './pages/admin/AttendanceManagement';
import NoDueClearanceDesk from './pages/admin/NoDueClearanceDesk';
import DownloadsManagement from './pages/admin/DownloadsManagement';
import AccountApprovals from './pages/admin/AccountApprovals';
import NoDueClearance from './pages/NoDueClearance';
import MyFines from './pages/MyFines';
import Notifications from './pages/Notifications';
import BookReservationsQueue from './pages/BookReservationsQueue';
import BookTimeExtensions from './pages/BookTimeExtensions';

import ErrorBoundary from './components/common/ErrorBoundary';

function DashboardRedirect() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div className="flex justify-center items-center h-[60vh] text-slate-500 font-semibold">Loading portal...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  switch (user.role) {
    case 'ADMIN':
      return <Navigate to="/admin/dashboard" replace />;
    case 'STAFF':
    case 'LIBRARIAN':
      return <Navigate to="/staff/dashboard" replace />;
    case 'FACULTY':
      return <Navigate to="/faculty/dashboard" replace />;
    case 'RESEARCH_SCHOLAR':
      return <Navigate to="/research-scholar/dashboard" replace />;
    case 'STUDENT':
      return <Navigate to="/student/dashboard" replace />;
    default:
      return <Navigate to="/" replace />;
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Auth & Access Control */}
            <Route path="login" element={<Login />} />
            <Route path="register" element={<Register />} />
            <Route path="access-denied" element={<AccessDenied />} />

            {/* Protected Workspace Routes (Rendered inside DashboardLayout with Fixed Stationary Sidebar) */}
            <Route element={<DashboardLayout />}>
              <Route element={<ProtectedRoute />}>
                <Route path="dashboard" element={<DashboardRedirect />} />
                <Route path="profile" element={<Profile />} />
                <Route path="catalog" element={<BookSearch />} />
                <Route path="book-search" element={<BookSearch />} />
                <Route path="borrow-history" element={<BookBorrowHistory />} />
                <Route path="fines" element={<MyFines />} />
                <Route path="my-fines" element={<Navigate to="/fines" replace />} />
                <Route path="no-due" element={<NoDueClearance />} />
                <Route path="new-arrivals" element={<Navigate to="/catalog?filter=new-arrivals" replace />} />
                <Route path="digital-resources" element={<DigitalResources />} />
                <Route path="downloads" element={<Downloads />} />
                <Route path="notices" element={<Notifications />} />
                <Route path="notifications" element={<Notifications />} />
                <Route path="events" element={<Events />} />
                <Route path="reservations" element={<BookReservationsQueue />} />
                <Route path="extensions" element={<BookTimeExtensions />} />
                <Route path="renew-books" element={<Navigate to="/extensions" replace />} />
                <Route path="extend-time" element={<Navigate to="/extensions" replace />} />

                {/* Library Staff Operations Desk */}
                <Route element={<RoleRoute allowedRoles={['STAFF', 'LIBRARIAN', 'ADMIN']} />}>
                  <Route path="staff/dashboard" element={<StaffDashboard />} />
                </Route>

                {/* Admin & Staff Exclusive Operations Modules */}
                <Route element={<RoleRoute allowedRoles={['ADMIN', 'STAFF', 'LIBRARIAN']} />}>
                  <Route path="admin" element={<Navigate to="/admin/dashboard" replace />} />

                  {/* Dashboard */}
                  <Route element={<PermissionRoute module="dashboard" />}>
                    <Route path="admin/dashboard" element={<AdminDashboard />} />
                    <Route path="admin/reports" element={<Navigate to="/admin/dashboard" replace />} />
                  </Route>

                  {/* Account Approvals */}
                  <Route element={<PermissionRoute module="approvals" />}>
                    <Route path="admin/approvals" element={<AccountApprovals />} />
                    <Route path="admin/account-approvals" element={<AccountApprovals />} />
                  </Route>

                  {/* Catalog & Inventory */}
                  <Route element={<PermissionRoute module="books" />}>
                    <Route path="admin/books" element={<BooksManagement />} />
                  </Route>
                  <Route element={<PermissionRoute module="inventory" />}>
                    <Route path="admin/inventory" element={<InventoryManagement />} />
                  </Route>
                  <Route element={<PermissionRoute module="categories" />}>
                    <Route path="admin/categories" element={<MasterData />} />
                    <Route path="admin/authors" element={<MasterData />} />
                    <Route path="admin/publishers" element={<MasterData />} />
                  </Route>

                  {/* Circulation */}
                  <Route element={<PermissionRoute module="circulation" />}>
                    <Route path="admin/issue-books" element={<IssueBooks />} />
                    <Route path="admin/return-books" element={<ReturnBooks />} />
                    <Route path="admin/renew-books" element={<RenewBooks />} />
                    <Route path="admin/borrow-history" element={<BookBorrowHistory />} />
                  </Route>
                  <Route element={<PermissionRoute module="reservations" />}>
                    <Route path="admin/reservations" element={<ReservationsManagement />} />
                  </Route>
                  <Route element={<PermissionRoute module="attendance" />}>
                    <Route path="admin/attendance" element={<AttendanceManagement />} />
                    <Route path="attendance" element={<AttendanceManagement />} />
                  </Route>
                  <Route element={<PermissionRoute module="fines" />}>
                    <Route path="admin/fines" element={<FineManagement />} />
                  </Route>
                  <Route element={<PermissionRoute module="procurement" />}>
                    <Route path="admin/procurement" element={<ProcurementManagement />} />
                  </Route>
                  <Route element={<PermissionRoute module="nodue" />}>
                    <Route path="admin/no-due" element={<NoDueClearanceDesk />} />
                  </Route>

                  {/* Members */}
                  <Route element={<PermissionRoute module="members" />}>
                    <Route path="admin/members" element={<MembersManagement />} />
                  </Route>

                  {/* Digital & Downloads */}
                  <Route element={<PermissionRoute module="digital_library" />}>
                    <Route path="admin/digital-library" element={<DigitalLibraryAdmin />} />
                  </Route>
                  <Route element={<PermissionRoute module="downloads" />}>
                    <Route path="admin/downloads" element={<DownloadsManagement />} />
                  </Route>

                  {/* Roles & Permissions / Users - Strictly Library Admin */}
                  <Route element={<PermissionRoute module="roles_permissions" allowedRoles={['ADMIN']} />}>
                    <Route path="admin/roles-permissions" element={<RolesPermissionsManagement />} />
                    <Route path="admin/users" element={<UsersManagement />} />
                  </Route>

                  {/* System Audit Logs - Strictly Library Admin */}
                  <Route element={<PermissionRoute module="audit_logs" allowedRoles={['ADMIN']} />}>
                    <Route path="admin/audit-logs" element={<AuditLogsManagement />} />
                  </Route>

                  {/* Settings & Operating Hours - Strictly Library Admin */}
                  <Route element={<PermissionRoute module="settings" allowedRoles={['ADMIN']} />}>
                    <Route path="admin/settings" element={<SettingsManagement />} />
                  </Route>
                </Route>

                {/* Faculty Exclusive Workspace */}
                <Route element={<RoleRoute allowedRoles={['FACULTY', 'ADMIN', 'STAFF', 'LIBRARIAN']} />}>
                  <Route path="faculty/dashboard" element={<FacultyDashboard />} />
                </Route>

                {/* Research Scholar Exclusive Workspace */}
                <Route element={<RoleRoute allowedRoles={['RESEARCH_SCHOLAR', 'ADMIN', 'STAFF', 'LIBRARIAN']} />}>
                  <Route path="research-scholar/dashboard" element={<ResearchScholarDashboard />} />
                </Route>

                {/* Student Exclusive Workspace */}
                <Route element={<RoleRoute allowedRoles={['STUDENT', 'ADMIN', 'STAFF', 'LIBRARIAN']} />}>
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
              <Route path="digital-resources" element={<DigitalResources />} />
              <Route path="library-services" element={<LibraryServices />} />
              <Route path="downloads" element={<Downloads />} />
              <Route path="notices" element={<Notices />} />
              <Route path="events" element={<Events />} />
              <Route path="gallery" element={<Gallery />} />
              <Route path="faq" element={<FAQ />} />
              <Route path="contact" element={<Contact />} />
              <Route path="feedback" element={<Feedback />} />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  );
}
