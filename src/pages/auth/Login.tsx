/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { type Role, UserStatus } from '../../types';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Eye,
  EyeOff,
  Lock,
  Mail,
  ShieldCheck,
  Sparkles,
  UserPlus,
  GraduationCap,
  Briefcase,
  CheckCircle,
  KeyRound,
  Clock,
  XCircle,
  ShieldAlert,
  AlertTriangle,
  User,
  Users,
  Building,
  HelpCircle,
  X,
  Layers,
  ChevronDown,
} from 'lucide-react';
import RegisterAccountModal from '../../components/common/RegisterAccountModal';
import BrandLogo from '../../components/common/BrandLogo';

function getDashboardPath(role: Role) {
  switch (role) {
    case 'ADMIN':
    case 'LIBRARIAN':
      return '/admin/dashboard';
    case 'FACULTY':
      return '/faculty/dashboard';
    case 'STUDENT':
      return '/student/dashboard';
    case 'STAFF':
      return '/admin/dashboard';
    default:
      return '/';
  }
}

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role>('STUDENT');
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showDemoList, setShowDemoList] = useState(false);
  const [statusModal, setStatusModal] = useState<{
    type: 'PENDING_APPROVAL' | 'REJECTED' | 'SUSPENDED';
    title: string;
    message: string;
    reason?: string;
  } | null>(null);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/';
  const incomingNotice = location.state?.accountStatusNotice;

  useEffect(() => {
    if (incomingNotice) {
      if (incomingNotice.status === 'PENDING_APPROVAL') {
        setStatusModal({
          type: 'PENDING_APPROVAL',
          title: 'Account Waiting for Admin Approval',
          message: incomingNotice.message || 'Your library account is waiting for Admin approval.',
        });
      } else if (incomingNotice.status === 'REJECTED') {
        setStatusModal({
          type: 'REJECTED',
          title: 'Account Registration Rejected',
          message: incomingNotice.message || 'Your library account registration has been rejected.',
        });
      } else if (incomingNotice.status === 'SUSPENDED') {
        setStatusModal({
          type: 'SUSPENDED',
          title: 'Account Privileges Suspended',
          message: incomingNotice.message || 'Your library account has been suspended. Please contact Library Administration.',
        });
      }
    }
  }, [incomingNotice]);

  const roleList: Array<{
    role: Role;
    title: string;
    subtitle: string;
    demoEmail: string;
    icon: React.ElementType;
    badge: string;
  }> = [
    {
      role: 'STUDENT',
      title: 'Student Scholar',
      subtitle: 'Self-service extensions, OPAC & e-books',
      demoEmail: 'jayendramajji22@gmail.com',
      icon: GraduationCap,
      badge: 'Student Portal',
    },
    {
      role: 'FACULTY',
      title: 'Faculty / Professor',
      subtitle: '30-day loans, paper uploads & procurement',
      demoEmail: 'faculty@college.edu',
      icon: Briefcase,
      badge: 'Faculty Portal',
    },
    {
      role: 'ADMIN',
      title: 'Admin Desk',
      subtitle: 'Account approvals, circulation & catalog',
      demoEmail: 'admin@college.edu',
      icon: ShieldCheck,
      badge: 'Admin Desk',
    },
    {
      role: 'STAFF',
      title: 'Library Staff',
      subtitle: 'Counter circulation & book check-in desk',
      demoEmail: 'staff@college.edu',
      icon: User,
      badge: 'Staff Desk',
    },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setStatusModal(null);
    setIsLoading(true);

    try {
      const authenticatedUser = await login(email, password, selectedRole);
      const targetPath = from === '/' || from === '/login' ? getDashboardPath(authenticatedUser.role) : from;
      navigate(targetPath, { replace: true });
    } catch (err: any) {
      const errMsg = err.message || 'Failed to authenticate credentials.';

      if (errMsg.includes('waiting for Admin approval')) {
        setStatusModal({
          type: 'PENDING_APPROVAL',
          title: 'Account Waiting for Admin Approval',
          message: errMsg,
        });
      } else if (errMsg.includes('rejected')) {
        setStatusModal({
          type: 'REJECTED',
          title: 'Account Registration Rejected',
          message: errMsg,
        });
      } else if (errMsg.includes('suspended')) {
        setStatusModal({
          type: 'SUSPENDED',
          title: 'Account Privileges Suspended',
          message: errMsg,
        });
      } else {
        setError(errMsg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectRole = (role: Role) => {
    setSelectedRole(role);
    setError('');
    setStatusModal(null);
  };

  const handleFillDemo = (demoEmail: string, role: Role) => {
    setSelectedRole(role);
    setEmail(demoEmail);
    setPassword('password123');
    setError('');
    setStatusModal(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-slate-100 flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8 relative overflow-hidden font-sans">
      {/* Background glowing gradients */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Bar Back Link */}
      <div className="w-full max-w-xl sm:absolute sm:top-6 sm:left-6 z-20 mb-3 sm:mb-0 flex justify-start">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-300 hover:text-white bg-slate-900/60 hover:bg-slate-800/80 px-4 py-2 rounded-2xl border border-slate-800 backdrop-blur-md transition-all shadow-sm group cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span>Back to Public Library Home</span>
        </Link>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center flex flex-col items-center justify-center space-y-3 z-10 pt-8 sm:pt-0">
        <BrandLogo variant="dark" size="md" showTagline={true} />
        <p className="text-xs sm:text-sm text-slate-400">
          Institutional Role-Based Portal Authentication Gateway
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-xl z-10">
        {/* Role Switcher Tabs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
          {roleList.map((r) => (
            <button
              key={r.role}
              type="button"
              onClick={() => handleSelectRole(r.role)}
              className={`p-3 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1.5 ${
                selectedRole === r.role
                  ? 'bg-blue-600/20 border-blue-400/60 text-white shadow-lg shadow-blue-500/10 ring-2 ring-blue-500/30'
                  : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
              }`}
            >
              <r.icon className={`w-5 h-5 ${selectedRole === r.role ? 'text-blue-400' : 'text-slate-500'}`} />
              <span className="text-[11px] font-bold">{r.title}</span>
            </button>
          ))}
        </div>

        {/* Login Form Card */}
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
          {/* Header Description for selected role */}
          <div className="flex flex-col items-center justify-center text-center border-b border-slate-800/80 pb-4 space-y-2">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-400 bg-blue-500/10 px-3 py-1 rounded-full border border-blue-400/20">
              {selectedRole} AUTHENTICATION
            </span>
            <h3 className="text-base sm:text-lg font-bold text-white">
              Sign in to your {selectedRole.toLowerCase()} account
            </h3>
            <p className="text-xs text-slate-400">
              Enter your registered institutional credentials to access your dashboard.
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-medium space-y-1 animate-fadeIn">
              <div className="font-bold flex items-center gap-1.5 text-rose-200">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" /> Authentication Error
              </div>
              <p className="leading-relaxed pl-5.5">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-300">
                Institutional Email or Member Card ID
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  required
                  placeholder="e.g. name@college.edu or STU-2026-7326"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-950/60 border border-slate-700/80 text-white text-xs placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all font-medium"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-300">Password</label>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Enter your account password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 rounded-2xl bg-slate-950/60 border border-slate-700/80 text-white text-xs placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3 text-slate-500 hover:text-slate-300 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-xl shadow-blue-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98 disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Verifying Credentials & Permissions...</span>
                </>
              ) : (
                <>
                  <span>Sign In to {selectedRole} Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Credentials Assistant (Optional Helper) */}
          <div className="pt-2 border-t border-slate-800/80">
            <button
              type="button"
              onClick={() => setShowDemoList(!showDemoList)}
              className="w-full py-2 px-3 text-xs text-slate-400 hover:text-slate-200 flex items-center justify-between rounded-xl hover:bg-slate-800/50 transition-colors"
            >
              <span className="flex items-center gap-1.5 font-semibold">
                <KeyRound className="w-3.5 h-3.5 text-blue-400" />
                Need test credentials? Click for Demo Accounts
              </span>
              <ChevronDown className={`w-4 h-4 transition-transform ${showDemoList ? 'rotate-180' : ''}`} />
            </button>

            {showDemoList && (
              <div className="mt-2 p-3 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2 text-xs">
                <p className="text-[11px] text-slate-400">
                  Click any account below to populate test credentials (Password: <code className="text-blue-400">password123</code>):
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {roleList.map((r) => (
                    <button
                      key={r.role}
                      type="button"
                      onClick={() => handleFillDemo(r.demoEmail, r.role)}
                      className="p-2 text-left rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-blue-500/40 transition-all flex items-center justify-between group"
                    >
                      <div className="min-w-0">
                        <span className="text-[10px] font-bold text-blue-400 block">{r.title}</span>
                        <span className="text-[11px] text-slate-300 font-mono truncate block">{r.demoEmail}</span>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-blue-600/20 text-blue-300 border border-blue-500/20 opacity-0 group-hover:opacity-100 transition-opacity">
                        Fill
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Registration CTA */}
          <div className="pt-2 border-t border-slate-800/80 text-center space-y-3">
            <p className="text-xs text-slate-400">
              Don't have an approved library membership account yet?
            </p>
            <button
              type="button"
              onClick={() => setIsRegisterModalOpen(true)}
              className="w-full py-2.5 rounded-2xl bg-slate-800/80 hover:bg-slate-700/80 text-white font-bold text-xs border border-slate-700 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <UserPlus className="w-4 h-4 text-emerald-400" />
              <span>Create Library Account (Submit for Admin Approval)</span>
            </button>
          </div>
        </div>
      </div>

      {/* ============================================================= */}
      {/* STATUS INTERCEPTION WARNING MODAL (Pending / Rejected / Suspended) */}
      {/* ============================================================= */}
      {statusModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-slate-900 rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-800 space-y-6 animate-scaleUp text-center">
            {statusModal.type === 'PENDING_APPROVAL' && (
              <div className="w-16 h-16 mx-auto rounded-3xl bg-amber-500/20 text-amber-400 flex items-center justify-center border-2 border-amber-400/40 shadow-lg shadow-amber-500/10">
                <Clock className="w-8 h-8 animate-pulse" />
              </div>
            )}

            {statusModal.type === 'REJECTED' && (
              <div className="w-16 h-16 mx-auto rounded-3xl bg-rose-500/20 text-rose-400 flex items-center justify-center border-2 border-rose-400/40 shadow-lg shadow-rose-500/10">
                <XCircle className="w-8 h-8" />
              </div>
            )}

            {statusModal.type === 'SUSPENDED' && (
              <div className="w-16 h-16 mx-auto rounded-3xl bg-red-500/20 text-red-400 flex items-center justify-center border-2 border-red-400/40 shadow-lg shadow-red-500/10">
                <ShieldAlert className="w-8 h-8" />
              </div>
            )}

            <div className="space-y-2">
              <span
                className={`inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase px-3 py-1 rounded-full border ${
                  statusModal.type === 'PENDING_APPROVAL'
                    ? 'bg-amber-500/10 text-amber-400 border-amber-400/30'
                    : statusModal.type === 'REJECTED'
                    ? 'bg-rose-500/10 text-rose-400 border-rose-400/30'
                    : 'bg-red-500/10 text-red-400 border-red-400/30'
                }`}
              >
                {statusModal.type.replace('_', ' ')}
              </span>
              <h3 className="text-xl font-extrabold text-white font-poppins">{statusModal.title}</h3>
              <p className="text-xs text-slate-300 leading-relaxed max-w-sm mx-auto">
                {statusModal.message}
              </p>
            </div>

            {/* Help Callout */}
            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-left text-xs space-y-1 text-slate-400">
              <div className="font-bold text-slate-200 flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-blue-400" /> Administrative Assistance:
              </div>
              <p className="text-[11px] leading-relaxed">
                Central Library Circulation & Help Desk: <strong className="text-slate-200">Room 102, Ground Floor</strong> or email <span className="font-mono text-blue-400">library-admin@college.edu</span>.
              </p>
            </div>

            <div className="pt-2 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => setStatusModal(null)}
                className="w-full py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-all cursor-pointer"
              >
                Close & Return
              </button>

              {statusModal.type === 'REJECTED' && (
                <button
                  type="button"
                  onClick={() => {
                    setStatusModal(null);
                    setIsRegisterModalOpen(true);
                  }}
                  className="w-full py-2.5 rounded-2xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 font-bold text-xs border border-blue-500/30 transition-all cursor-pointer"
                >
                  Submit New Registration Application
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Registration Modal */}
      <RegisterAccountModal
        isOpen={isRegisterModalOpen}
        onClose={() => setIsRegisterModalOpen(false)}
        onSuccess={() => {
          setIsRegisterModalOpen(false);
        }}
      />
    </div>
  );
}
