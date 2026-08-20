import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, LayoutDashboard, UserCheck, Sparkles, Key } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function AccessDenied() {
  const { user, login } = useAuth();
  const navigate = useNavigate();

  const handleSwitchToAdmin = async () => {
    await login('admin@college.edu', 'ADMIN');
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

  const getDashboardPath = () => {
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

  return (
    <div className="min-h-[75vh] flex items-center justify-center p-4 sm:p-6">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full p-8 text-center space-y-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Icon & Title */}
        <div className="flex flex-col items-center space-y-3">
          <div className="p-4 bg-rose-100 text-rose-600 rounded-3xl shrink-0 shadow-xs">
            <ShieldAlert className="w-12 h-12" />
          </div>
          <h1 className="text-4xl font-extrabold font-poppins text-slate-900 tracking-tight">403</h1>
          <h2 className="text-xl font-bold text-slate-800">Access Denied & Permission Restricted</h2>
        </div>

        {/* Informative Explanation */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs text-slate-600 space-y-2">
          <p className="font-semibold text-slate-800">
            Current Active Account: <span className="font-mono text-blue-700 font-bold">{user?.email || 'Guest User'}</span> ({user?.role || 'UNAUTHENTICATED'})
          </p>
          <p>
            Your current account role does not have administrative privileges to access this restricted management module. Select a role portal below to switch instantly.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3 pt-2">
          <button
            onClick={handleSwitchToAdmin}
            className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white font-bold text-xs shadow-md shadow-blue-200 hover:shadow-lg hover:shadow-blue-200/50 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Key className="w-4 h-4" />
            <span>Switch to Admin Account (Chief Librarian)</span>
          </button>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleSwitchToStudent}
              className="py-3 px-4 rounded-2xl border border-emerald-200 bg-emerald-50 text-emerald-800 font-bold text-xs hover:bg-emerald-100 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <LayoutDashboard className="w-4 h-4 text-emerald-600" />
              <span>Student Portal</span>
            </button>

            <button
              onClick={handleSwitchToFaculty}
              className="py-3 px-4 rounded-2xl border border-purple-200 bg-purple-50 text-purple-800 font-bold text-xs hover:bg-purple-100 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <LayoutDashboard className="w-4 h-4 text-purple-600" />
              <span>Faculty Portal</span>
            </button>
          </div>

          <div className="pt-2 border-t border-slate-100 flex justify-center">
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-sm sm:text-base font-semibold text-slate-600 hover:text-blue-600 transition-colors py-1 px-2.5 rounded-lg hover:bg-slate-100/60"
            >
              <ArrowLeft className="w-4.5 h-4.5" /> Return to Public Home Page
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
