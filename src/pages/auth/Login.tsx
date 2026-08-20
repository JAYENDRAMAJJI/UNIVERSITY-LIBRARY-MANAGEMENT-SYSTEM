import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { type Role } from '../../types';
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
} from 'lucide-react';
import RegisterAccountModal from '../../components/common/RegisterAccountModal';

function getDashboardPath(role: Role) {
  switch (role) {
    case 'ADMIN':
      return '/admin/dashboard';
    case 'FACULTY':
      return '/faculty/dashboard';
    case 'STUDENT':
      return '/student/dashboard';
    default:
      return '/';
  }
}

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('password');
  const [showPassword, setShowPassword] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role>('STUDENT');
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/';

  const quickRoles: Array<{
    role: Role;
    title: string;
    email: string;
    icon: React.ElementType;
    badge: string;
    desc: string;
    gradient: string;
    badgeStyle: string;
  }> = [
    {
      role: 'STUDENT',
      title: 'Student Portal',
      email: 'jayendramajji22@gmail.com',
      icon: GraduationCap,
      badge: 'Student Role',
      desc: 'Self-service extensions, OPAC reserves & e-books',
      gradient: 'from-emerald-500/20 to-teal-500/10 border-emerald-500/30 text-emerald-300',
      badgeStyle: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30',
    },
    {
      role: 'FACULTY',
      title: 'Faculty Portal',
      email: 'faculty@college.edu',
      icon: Briefcase,
      badge: 'Faculty Role',
      desc: '30-day borrowing period, paper uploads & procurement requests',
      gradient: 'from-purple-500/20 to-indigo-500/10 border-purple-500/30 text-purple-300',
      badgeStyle: 'bg-purple-500/20 text-purple-300 border-purple-400/30',
    },
    {
      role: 'ADMIN',
      title: 'Admin Control Desk',
      email: 'admin@college.edu',
      icon: ShieldCheck,
      badge: 'Admin Role',
      desc: 'Circulation desk, barcode scanning & fine ledger',
      gradient: 'from-blue-500/20 to-indigo-500/10 border-blue-500/30 text-blue-300',
      badgeStyle: 'bg-blue-500/20 text-blue-300 border-blue-400/30',
    },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const cleanEmail = email.trim().toLowerCase();
      let targetRole: Role | undefined = selectedRole;
      if (cleanEmail === 'faculty@college.edu' || cleanEmail.includes('faculty')) targetRole = 'FACULTY';
      else if (cleanEmail === 'admin@college.edu' || cleanEmail.includes('admin')) targetRole = 'ADMIN';
      else if (cleanEmail === 'student@college.edu' || cleanEmail.includes('student')) targetRole = 'STUDENT';
      else if (cleanEmail.includes('staff')) targetRole = 'STAFF';

      const authenticatedUser = await login(email || 'student@college.edu', targetRole);
      const targetPath = from === '/' || from === '/login' ? getDashboardPath(authenticatedUser.role) : from;
      navigate(targetPath, { replace: true });
    } catch (err: any) {
      setError(err.message || 'Failed to authenticate login credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectRole = (role: Role, demoEmail: string) => {
    setSelectedRole(role);
    setEmail(demoEmail);
    setPassword('password');
  };

  const handleInstantSignIn = async (role: Role, demoEmail: string) => {
    setSelectedRole(role);
    setEmail(demoEmail);
    setPassword('password');
    setError('');
    setIsLoading(true);

    try {
      const authenticatedUser = await login(demoEmail, role);
      const targetPath = getDashboardPath(authenticatedUser.role);
      navigate(targetPath, { replace: true });
    } catch (err: any) {
      setError(err.message || 'Failed to authenticate quick login session.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-160px)] flex flex-col justify-center items-center py-6 max-w-6xl mx-auto w-full space-y-4 my-auto">
      {/* Top Action Bar */}
      <div className="flex items-center justify-start w-full">
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl border border-slate-200 bg-white text-sm font-bold text-slate-800 hover:bg-slate-50 hover:text-blue-700 hover:border-blue-300 transition-all shadow-2xs group"
        >
          <ArrowLeft className="w-4 h-4 text-blue-600 group-hover:-translate-x-1 transition-transform" />
          <span>Return to Home Page</span>
        </Link>
      </div>

      {/* Luxury Split Glass Authentication Container */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[540px] w-full">
        {/* Left Side: Dark Hero Panel with 1-Click Role Credentials (7 Cols) */}
        <div className="lg:col-span-7 bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 text-white p-8 sm:p-10 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute inset-0 bg-[radial-gradient(#3b82f6_1px,transparent_1px)] [background-size:24px_24px] opacity-10 pointer-events-none" />

          <div className="relative z-10 space-y-6">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600 text-white shadow-lg shadow-blue-500/20">
                <BookOpen className="h-6 w-6" />
              </span>
              <div>
                <h2 className="text-xl font-extrabold font-poppins text-white leading-tight">University Library</h2>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-blue-400 block">Enterprise Portal SSO</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/15 border border-blue-400/30 text-blue-300 text-xs font-bold uppercase tracking-widest backdrop-blur-md">
                <Sparkles className="w-3.5 h-3.5 text-blue-400" /> Demo Role Credentials
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold font-poppins text-white tracking-tight">
                Select Your Role to Access Workspace
              </h1>
              <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
                Click any role card below to test instant 1-click authentication into that portal.
              </p>
            </div>

            {/* 1-Click Role Login Cards */}
            <div className="space-y-3 pt-1">
              {quickRoles.map((item) => {
                const Icon = item.icon;
                const isSelected = selectedRole === item.role;
                return (
                  <div
                    key={item.role}
                    onClick={() => handleSelectRole(item.role, item.email)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between group backdrop-blur-md ${
                      isSelected
                        ? 'bg-white/15 border-blue-400/60 shadow-lg ring-2 ring-blue-400/30'
                        : 'bg-white/5 hover:bg-white/10 border-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-3.5">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${item.gradient}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-sm text-white">{item.title}</h3>
                          <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${item.badgeStyle}`}>
                            {item.badge}
                          </span>
                        </div>
                        <p className="text-xs text-slate-300 font-mono mt-0.5">{item.email}</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleInstantSignIn(item.role, item.email);
                      }}
                      className="px-3.5 py-1.5 rounded-xl bg-white text-slate-950 font-bold text-xs hover:bg-blue-50 transition-all shadow-md shrink-0 flex items-center gap-1"
                    >
                      <KeyRound className="w-3.5 h-3.5 text-blue-600" />
                      <span>1-Click Sign In</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Side: Clean Form Panel (5 Cols) */}
        <div className="lg:col-span-5 p-8 sm:p-10 flex flex-col justify-between space-y-6 bg-white">
          <div className="space-y-6">
            <div className="space-y-1">
              <h2 className="text-2xl font-bold font-poppins text-slate-900">Sign In to Account</h2>
              <p className="text-xs text-slate-500">Enter your credentials or use the 1-click role buttons on the left.</p>
            </div>

            {error && (
              <div className="p-3.5 rounded-2xl border border-rose-200 bg-rose-50 text-xs font-semibold text-rose-700 animate-fadeIn">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="email" className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Registered Email Address *
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="student@college.edu"
                    className="w-full pl-10 pr-4 py-3 rounded-2xl border border-slate-200 text-xs sm:text-sm font-medium text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all bg-slate-50/50"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="password" className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Account Password *
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-12 py-3 rounded-2xl border border-slate-200 text-xs sm:text-sm font-medium text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all bg-slate-50/50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600 text-xs font-bold cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-600">
                  <input type="checkbox" defaultChecked className="rounded text-blue-600 focus:ring-blue-500" />
                  Remember session
                </label>
                <span className="font-semibold text-blue-600 hover:underline cursor-pointer">Forgot password?</span>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white font-bold text-xs sm:text-sm shadow-md hover:opacity-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {isLoading ? 'Authenticating Session...' : `Sign In to ${selectedRole} Workspace`}
                {!isLoading && <ArrowRight className="w-4 h-4" />}
              </button>
            </form>
          </div>

          <div className="pt-4 border-t border-slate-100 space-y-3 text-center">
            <button
              type="button"
              onClick={() => setIsRegisterModalOpen(true)}
              className="w-full py-2.5 rounded-2xl border border-blue-200 bg-blue-50/60 text-blue-700 font-bold text-sm hover:bg-blue-100/70 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <UserPlus className="w-4 h-4" /> Register New Library Account
            </button>

            <Link to="/" className="inline-flex items-center gap-2 text-sm sm:text-base font-semibold text-slate-600 hover:text-blue-600 transition-colors py-1 px-2.5 rounded-lg hover:bg-slate-100/60">
              <ArrowLeft className="w-4.5 h-4.5" /> Return to Public Home Page
            </Link>
          </div>
        </div>
      </div>

      <RegisterAccountModal
        isOpen={isRegisterModalOpen}
        onClose={() => setIsRegisterModalOpen(false)}
      />
    </div>
  );
}
