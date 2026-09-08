import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, LayoutDashboard, Key, ShieldCheck, UserCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function AccessDenied() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const customMessage = (location.state as any)?.message || 'Access Denied — You do not have permission to access this feature.';

  const handleSwitchToAdmin = async () => {
    await login('admin@college.edu', 'ADMIN');
    navigate('/admin/dashboard', { replace: true });
  };

  const handleSwitchToStaff = async () => {
    await login('staff@college.edu', 'STAFF');
    navigate('/admin/dashboard', { replace: true });
  };

  const handleSwitchToStudent = async () => {
    await login('jayendramajji22@gmail.com', 'STUDENT');
    navigate('/student/dashboard', { replace: true });
  };

  const handleSwitchToFaculty = async () => {
    await login('faculty@college.edu', 'FACULTY');
    navigate('/faculty/dashboard', { replace: true });
  };

  return (
    <div className="min-h-[75vh] flex items-center justify-center p-4 sm:p-6">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full p-8 text-center space-y-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Icon & Title */}
        <div className="flex flex-col items-center space-y-3">
          <div className="p-4 bg-rose-100 text-rose-600 rounded-3xl shrink-0 shadow-xs">
            <ShieldAlert className="w-12 h-12" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold font-poppins text-slate-900 tracking-tight">403 Forbidden</h1>
          <h2 className="text-base sm:text-lg font-bold text-rose-700 bg-rose-50 border border-rose-200 px-4 py-2 rounded-2xl">
            {customMessage}
          </h2>
        </div>

        {/* Informative Explanation */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs text-slate-600 space-y-2 text-left">
          <p className="font-semibold text-slate-800">
            Active User: <span className="font-mono text-blue-700 font-bold">{user?.name || user?.email || 'Guest User'}</span>
          </p>
          <div className="flex items-center gap-2">
            <span className="text-slate-500">Role:</span>
            <span className="font-mono font-bold px-2 py-0.5 rounded-md bg-slate-200 text-slate-800">
              {user?.role || 'UNAUTHENTICATED'}
            </span>
            <span className="text-slate-500 ml-2">Status:</span>
            <span className="font-bold text-emerald-700">{user?.status || 'ACTIVE'}</span>
          </div>
          <p className="text-slate-500 pt-1 text-[11px]">
            Your account permissions do not grant access to this action or page. If you believe this is an error, please contact the Library Administrator.
          </p>
        </div>

        {/* Quick Switch Actions */}
        <div className="space-y-3 pt-2">
          <div className="grid grid-cols-2 gap-2.5">
            <button
              onClick={handleSwitchToAdmin}
              className="py-3 px-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-xs hover:from-blue-700 hover:to-indigo-700 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Key className="w-3.5 h-3.5" />
              <span>Switch to Admin</span>
            </button>

            <button
              onClick={handleSwitchToStaff}
              className="py-3 px-3 rounded-2xl bg-gradient-to-r from-teal-600 to-cyan-700 text-white font-bold text-xs hover:from-teal-700 hover:to-cyan-800 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Switch to Staff</span>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <button
              onClick={handleSwitchToStudent}
              className="py-2.5 px-3 rounded-2xl border border-emerald-200 bg-emerald-50 text-emerald-800 font-bold text-xs hover:bg-emerald-100 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <LayoutDashboard className="w-3.5 h-3.5 text-emerald-600" />
              <span>Student Portal</span>
            </button>

            <button
              onClick={handleSwitchToFaculty}
              className="py-2.5 px-3 rounded-2xl border border-purple-200 bg-purple-50 text-purple-800 font-bold text-xs hover:bg-purple-100 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <LayoutDashboard className="w-3.5 h-3.5 text-purple-600" />
              <span>Faculty Portal</span>
            </button>
          </div>

          <div className="pt-2 border-t border-slate-100 flex justify-center">
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-600 hover:text-blue-600 transition-colors py-1 px-2.5 rounded-lg hover:bg-slate-100"
            >
              <ArrowLeft className="w-4 h-4" /> Return to Public Home Page
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
