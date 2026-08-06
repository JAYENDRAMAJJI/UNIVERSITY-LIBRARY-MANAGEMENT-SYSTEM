import React, { useState, useEffect } from 'react';
import {
  User as UserIcon,
  Mail,
  Phone,
  Building,
  CreditCard,
  CheckCircle,
  AlertCircle,
  ShieldCheck,
  Edit,
  Save,
  LogOut,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { libraryStore } from '../services/libraryStore.service';
import { MemberProfile } from '../types/library';
import { Link, useNavigate } from 'react-router-dom';

export default function Profile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [state, setState] = useState(libraryStore.snapshot);
  const [isEditing, setIsEditing] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    const sub = libraryStore.getObservable().subscribe(setState);
    return () => sub.unsubscribe();
  }, []);

  const currentMember: MemberProfile =
    state.members.find((m) => user?.email && m.email.toLowerCase() === user.email.toLowerCase()) ||
    state.members.find((m) => user?.id && m.id === user.id) ||
    state.members.find((m) => user?.name && m.name.toLowerCase() === user.name.toLowerCase()) ||
    state.members.find((m) => m.role === user?.role) ||
    state.members[0];

  const [formData, setFormData] = useState({
    name: user?.name || currentMember?.name || 'User Profile',
    email: user?.email || currentMember?.email || 'user@college.edu',
    phone: currentMember?.phone || '+91 98765 43210',
    department: currentMember?.department || 'General Academic',
    avatarUrl: currentMember?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80',
  });

  useEffect(() => {
    if (currentMember) {
      setFormData({
        name: user?.name || currentMember.name,
        email: user?.email || currentMember.email,
        phone: currentMember.phone || '+91 98765 43210',
        department: currentMember.department,
        avatarUrl: currentMember.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80',
      });
    }
  }, [currentMember, user]);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentMember) {
      libraryStore.updateMemberProfile(currentMember.id, {
        name: formData.name,
        phone: formData.phone,
        department: formData.department,
        avatarUrl: formData.avatarUrl,
      });
    }

    if (user) {
      const updatedUser = { ...user, name: formData.name, department: formData.department };
      localStorage.setItem('library_user', JSON.stringify(updatedUser));
    }

    setIsEditing(false);
    setToastMessage('Profile details updated and synchronized successfully!');
    setTimeout(() => setToastMessage(null), 4000);
    window.location.reload();
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
    <div className="space-y-8 pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-950 via-indigo-950 to-blue-900 rounded-3xl p-8 sm:p-10 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex items-center gap-6">
          <img
            src={formData.avatarUrl}
            alt={formData.name}
            className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl object-cover border-4 border-white/20 shadow-xl shrink-0"
          />
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-widest text-blue-300 bg-white/10 px-3 py-0.5 rounded-full">
              <ShieldCheck className="h-3.5 w-3.5" /> {user?.role || 'MEMBER'} Account Profile
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold font-poppins tracking-tight">{formData.name}</h1>
            <p className="text-slate-300 text-xs sm:text-sm">
              Member ID: <strong className="font-mono text-amber-300">{currentMember?.memberCardNo}</strong> | Status:{' '}
              <strong className="text-emerald-400 font-bold uppercase">● Active Member</strong>
            </p>
          </div>
        </div>

        <div className="relative z-10 hidden sm:flex items-center gap-2">
          <span className="px-4 py-2 rounded-2xl bg-white/10 border border-white/20 text-xs font-bold text-emerald-300 backdrop-blur-md flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-400" /> Verified Library Account
          </span>
        </div>
      </div>

      {toastMessage && (
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-semibold shadow-xs animate-fadeIn">
          <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Profile Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left Column: Account Privileges & Quotas */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-6">
          <h2 className="text-lg font-bold font-poppins text-slate-900 border-b border-slate-100 pb-3">
            Account Privileges & Quota
          </h2>

          <div className="space-y-4 text-xs font-medium">
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
              <span className="text-slate-500 font-bold">Max Borrowing Quota</span>
              <span className="font-bold text-slate-900 font-mono text-sm">{currentMember?.maxAllowedBooks} Books</span>
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
              <span className="text-slate-500 font-bold">Active Borrowed Books</span>
              <span className="font-bold text-blue-700 font-mono text-sm">{currentMember?.currentActiveLoans} Books</span>
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-rose-50/40 border border-rose-100">
              <span className="text-rose-700 font-bold">Pending Fine Balance</span>
              <span className="font-bold text-rose-900 font-mono text-sm">₹{(currentMember?.pendingFines || 0).toFixed(2)}</span>
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
              <span className="text-slate-500 font-bold">Registered Date</span>
              <span className="font-mono text-slate-800">{currentMember?.registeredDate}</span>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100">
            <button
              onClick={() => {
                logout();
                navigate('/');
              }}
              className="w-full py-3 rounded-2xl border border-rose-200 text-rose-600 font-bold text-xs hover:bg-rose-50 transition-all flex items-center justify-center gap-2"
            >
              <LogOut className="w-4 h-4" /> End Session & Sign Out
            </button>
          </div>
        </div>

        {/* Right Column: Editable Profile Information */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-lg font-bold font-poppins text-slate-900">Personal Information & Parameters</h2>
              <p className="text-xs text-slate-500 mt-0.5">Manage member profile parameters and contact info.</p>
            </div>
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all flex items-center gap-1.5"
              >
                <Edit className="w-4 h-4 text-blue-600" /> Edit Profile
              </button>
            ) : (
              <button
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs"
              >
                Cancel
              </button>
            )}
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-4 text-xs font-medium">
            {/* Full Name */}
            <div className="space-y-1">
              <label className="block text-slate-700 font-bold">Full Name</label>
              <div className="relative">
                <UserIcon className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  disabled={!isEditing}
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-slate-900 font-semibold disabled:bg-slate-50 disabled:text-slate-600 focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>

            {/* Email Address */}
            <div className="space-y-1">
              <label className="block text-slate-700 font-bold">Institutional Email</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                <input
                  type="email"
                  disabled
                  value={formData.email}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-mono bg-slate-50 cursor-not-allowed"
                />
              </div>
              <p className="text-[11px] text-slate-400">Institutional email is managed by Single Sign-On system.</p>
            </div>

            {/* Phone & Department */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-slate-700 font-bold">Contact Phone Number</label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    disabled={!isEditing}
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-slate-900 font-medium disabled:bg-slate-50 disabled:text-slate-600 focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-slate-700 font-bold">Academic Department</label>
                <div className="relative">
                  <Building className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    disabled={!isEditing}
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-slate-900 font-medium disabled:bg-slate-50 disabled:text-slate-600 focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>
            </div>

            {/* Avatar Image URL */}
            <div className="space-y-1">
              <label className="block text-slate-700 font-bold">Profile Picture URL</label>
              <input
                type="text"
                disabled={!isEditing}
                value={formData.avatarUrl}
                onChange={(e) => setFormData({ ...formData, avatarUrl: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-slate-900 font-mono text-[11px] disabled:bg-slate-50 disabled:text-slate-600 focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            {/* Save Action */}
            {isEditing && (
              <div className="pt-3 flex justify-end">
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold shadow-md hover:opacity-95 transition-all flex items-center gap-2"
                >
                  <Save className="w-4 h-4" /> Save Profile Changes
                </button>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
