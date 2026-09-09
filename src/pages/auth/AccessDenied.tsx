/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, LayoutDashboard, LogIn, Home, UserCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function AccessDenied() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const customMessage = (location.state as any)?.message || 'Access Denied — You do not have permission to access this protected area.';

  const getMyDashboardPath = () => {
    if (!user) return '/login';
    switch (user.role) {
      case 'ADMIN':
      case 'LIBRARIAN':
      case 'STAFF':
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
    <div className="min-h-[75vh] flex items-center justify-center p-4 sm:p-6 font-sans">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full p-8 text-center space-y-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Icon & Title */}
        <div className="flex flex-col items-center space-y-3">
          <div className="p-4 bg-rose-100 text-rose-600 rounded-3xl shrink-0 shadow-xs">
            <ShieldAlert className="w-12 h-12" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold font-poppins text-slate-900 tracking-tight">403 Forbidden</h1>
          <h2 className="text-sm sm:text-base font-bold text-rose-700 bg-rose-50 border border-rose-200 px-4 py-2 rounded-2xl">
            {customMessage}
          </h2>
        </div>

        {/* Informative Explanation */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs text-slate-600 space-y-2 text-left">
          <p className="font-semibold text-slate-800">
            Active User: <span className="font-mono text-blue-700 font-bold">{user?.name || user?.email || 'Unauthenticated Session'}</span>
          </p>
          <div className="flex items-center gap-2">
            <span className="text-slate-500">Role:</span>
            <span className="font-mono font-bold px-2 py-0.5 rounded-md bg-slate-200 text-slate-800">
              {user?.role || 'GUEST / NONE'}
            </span>
            <span className="text-slate-500 ml-2">Status:</span>
            <span className="font-bold text-emerald-700">{user?.status || 'N/A'}</span>
          </div>
          <p className="text-slate-500 pt-1 text-[11px] leading-relaxed">
            Your current account credentials do not grant access to this module. If you have an authorized administrator or faculty account, please sign in using your verified credentials.
          </p>
        </div>

        {/* Navigation Actions */}
        <div className="space-y-3 pt-2">
          <div className="flex flex-col sm:flex-row gap-2.5">
            <Link
              to="/login"
              className="flex-1 py-3 px-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-xs hover:from-blue-700 hover:to-indigo-700 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-blue-500/20"
            >
              <LogIn className="w-4 h-4" />
              <span>Sign In with Different Account</span>
            </Link>

            {user && (
              <button
                type="button"
                onClick={() => navigate(getMyDashboardPath(), { replace: true })}
                className="flex-1 py-3 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs border border-slate-200 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <LayoutDashboard className="w-4 h-4 text-blue-600" />
                <span>Return to My Dashboard</span>
              </button>
            )}
          </div>

          <div className="pt-2 border-t border-slate-100 flex justify-center">
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-600 hover:text-blue-600 transition-colors py-1.5 px-3 rounded-xl hover:bg-slate-100"
            >
              <ArrowLeft className="w-4 h-4" /> Return to Public Home Page
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
