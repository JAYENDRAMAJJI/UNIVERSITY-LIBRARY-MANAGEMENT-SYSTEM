import React, { useState } from 'react';
import { UserPlus, X, CheckCircle, Mail, Lock, Phone, Building, User, Eye, EyeOff, Hash, GraduationCap, MapPin, PhoneCall } from 'lucide-react';
import { libraryStore } from '../../services/libraryStore.service';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Role } from '../../types';

interface RegisterAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function RegisterAccountModal({ isOpen, onClose, onSuccess }: RegisterAccountModalProps) {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    rollNo: '',
    academicBatch: 'B.Tech 3rd Year',
    emergencyContact: '',
    address: '',
    role: 'STUDENT' as Role,
    department: 'Computer Science & Engineering',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email) return;

    if (!formData.password || formData.password.length < 6) {
      setPasswordError('Password must be at least 6 characters long.');
      return;
    }
    setPasswordError(null);

    setIsSubmitting(true);

    // Register member in store
    const registeredMember = libraryStore.registerMember({
      name: formData.name,
      email: formData.email,
      role: formData.role as Role,
      department: formData.department,
      phone: formData.phone,
      rollNo: formData.rollNo,
      academicBatch: formData.academicBatch,
      address: formData.address,
      emergencyContact: formData.emergencyContact,
    });

    setToastMessage(`Account successfully created for ${registeredMember.name}! Card ID: ${registeredMember.memberCardNo}`);

    setTimeout(async () => {
      setIsSubmitting(false);
      // Log in automatically with newly registered email & role
      await login(formData.email, registeredMember.role);

      if (onSuccess) onSuccess();
      onClose();

      // Redirect to dashboard matching registered role
      if (registeredMember.role === 'ADMIN') navigate('/admin/dashboard');
      else if (registeredMember.role === 'FACULTY') navigate('/faculty/dashboard');
      else navigate('/student/dashboard');
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in overflow-y-auto">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden space-y-0 my-auto max-h-[92vh] flex flex-col">
        {/* Modal Header */}
        <div className="p-6 bg-gradient-to-r from-slate-950 via-indigo-950 to-blue-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-2xl bg-blue-500/20 text-blue-300">
              <UserPlus className="h-6 w-6" />
            </span>
            <div>
              <h3 className="font-bold text-lg font-poppins">Create Library Account</h3>
              <p className="text-xs text-slate-300">Register new Student, Faculty, or Staff membership</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-3.5 text-xs font-medium overflow-y-auto">
          {toastMessage && (
            <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold text-xs">
              <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>{toastMessage}</span>
            </div>
          )}

          {/* Full Name & Select Role Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block text-slate-700 font-bold">Full Name *</label>
              <div className="relative">
                <User className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  required
                  placeholder="e.g. Rahul Sharma"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-slate-700 font-bold">Membership Role *</label>
              <select
                value={formData.role}
                onChange={(e) => {
                  const newRole = e.target.value as Role;
                  const defaultBatch =
                    newRole === 'STUDENT'
                      ? 'B.Tech 3rd Year'
                      : newRole === 'FACULTY'
                      ? 'Assistant Professor'
                      : 'Assistant Librarian';
                  setFormData({ ...formData, role: newRole, academicBatch: defaultBatch });
                }}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white"
              >
                <option value="STUDENT">Student Scholar</option>
                <option value="FACULTY">Faculty Member</option>
                <option value="STAFF">Library Staff / Admin</option>
              </select>
            </div>
          </div>

          {/* Email Address & Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block text-slate-700 font-bold">Institutional Email Address *</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                <input
                  type="email"
                  required
                  placeholder="e.g. rahul.sharma@college.edu"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-slate-700 font-bold">Phone Number</label>
              <div className="relative">
                <Phone className="absolute left-3 top-3 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="+91 98765 43210"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>
          </div>

          {/* Roll No / ID & Academic Level / Designation Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block text-slate-700 font-bold">
                {formData.role === 'STUDENT'
                  ? 'Roll No / Student ID'
                  : formData.role === 'FACULTY'
                  ? 'Faculty Employee ID'
                  : 'Staff / Admin ID'}
              </label>
              <div className="relative">
                <Hash className="absolute left-3 top-3 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder={
                    formData.role === 'STUDENT'
                      ? 'e.g. 2026-CS-042'
                      : formData.role === 'FACULTY'
                      ? 'e.g. FAC-2026-881'
                      : 'e.g. STF-2026-104'
                  }
                  value={formData.rollNo}
                  onChange={(e) => setFormData({ ...formData, rollNo: e.target.value })}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-slate-700 font-bold">
                {formData.role === 'STUDENT'
                  ? 'Academic Year / Level'
                  : formData.role === 'FACULTY'
                  ? 'Faculty Designation'
                  : 'Staff Position / Title'}
              </label>
              <div className="relative">
                <GraduationCap className="absolute left-3 top-3 h-3.5 w-3.5 text-slate-400" />
                <select
                  value={formData.academicBatch}
                  onChange={(e) => setFormData({ ...formData, academicBatch: e.target.value })}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white"
                >
                  {formData.role === 'STUDENT' && (
                    <>
                      <option value="B.Tech 1st Year">B.Tech 1st Year</option>
                      <option value="B.Tech 2nd Year">B.Tech 2nd Year</option>
                      <option value="B.Tech 3rd Year">B.Tech 3rd Year</option>
                      <option value="B.Tech 4th Year">B.Tech 4th Year</option>
                      <option value="M.Tech Scholar">M.Tech Scholar</option>
                      <option value="Ph.D Research Scholar">Ph.D Research Scholar</option>
                    </>
                  )}
                  {formData.role === 'FACULTY' && (
                    <>
                      <option value="Assistant Professor">Assistant Professor</option>
                      <option value="Associate Professor">Associate Professor</option>
                      <option value="Professor">Professor</option>
                      <option value="Head of Department (HOD)">Head of Department (HOD)</option>
                      <option value="Dean / Director">Dean / Director</option>
                      <option value="Visiting / Adjunct Faculty">Visiting / Adjunct Faculty</option>
                    </>
                  )}
                  {formData.role === 'STAFF' && (
                    <>
                      <option value="Chief Admin Librarian">Chief Admin Librarian</option>
                      <option value="Assistant Librarian">Assistant Librarian</option>
                      <option value="Library Attendant">Library Attendant</option>
                      <option value="IT System Administrator">IT System Administrator</option>
                      <option value="Administrative Officer">Administrative Officer</option>
                    </>
                  )}
                </select>
              </div>
            </div>
          </div>

          {/* Department & Emergency Phone Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block text-slate-700 font-bold">Academic Department</label>
              <div className="relative">
                <Building className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                <select
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white"
                >
                  <option value="Computer Science & Engineering">Computer Science & Engineering</option>
                  <option value="Electrical & Electronics">Electrical & Electronics</option>
                  <option value="Mechanical Engineering">Mechanical Engineering</option>
                  <option value="Physics & Applied Science">Physics & Applied Science</option>
                  <option value="Mathematics & Statistics">Mathematics & Statistics</option>
                  <option value="Business Administration">Business Administration</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-slate-700 font-bold">Emergency Phone</label>
              <div className="relative">
                <PhoneCall className="absolute left-3 top-3 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="+91 98100 12345"
                  value={formData.emergencyContact}
                  onChange={(e) => setFormData({ ...formData, emergencyContact: e.target.value })}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>
          </div>

          {/* Campus / Home Address (Full Width) */}
          <div className="space-y-1">
            <label className="block text-slate-700 font-bold">
              {formData.role === 'STUDENT'
                ? 'Campus Hostel / Permanent Residence Address'
                : formData.role === 'FACULTY'
                ? 'Faculty Quarters / Residential Address'
                : 'Staff Quarter / Residential Address'}
            </label>
            <div className="relative">
              <MapPin className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder={
                  formData.role === 'STUDENT'
                    ? 'e.g. Hostel Block A, Room 302 / Flat 12, Main Street, City'
                    : formData.role === 'FACULTY'
                    ? 'e.g. Faculty Staff Quarter B-4, University Main Campus'
                    : 'e.g. Admin Staff Quarter Q-12, Institutional Area'
                }
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-slate-800 font-extrabold text-xs sm:text-sm">Create Password *</label>
              <span className="text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200/80 px-2.5 py-0.5 rounded-full">
                Min. 6 characters
              </span>
            </div>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={6}
                placeholder="Enter strong password (min 6 chars)"
                value={formData.password}
                onChange={(e) => {
                  setFormData({ ...formData, password: e.target.value });
                  if (e.target.value.length >= 6) setPasswordError(null);
                }}
                className={`w-full pl-10 pr-10 py-2.5 rounded-xl border text-slate-900 focus:outline-none focus:ring-2 ${
                  passwordError
                    ? 'border-rose-300 bg-rose-50/30 focus:ring-rose-500/20'
                    : 'border-slate-200 focus:ring-blue-500/20'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {passwordError && (
              <p className="text-[11px] text-rose-600 font-semibold mt-1 flex items-center gap-1">
                <span>⚠️ {passwordError}</span>
              </p>
            )}
          </div>

          {/* Submit Action */}
          <div className="pt-3 flex items-center justify-end gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-2xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold shadow-md hover:opacity-95 disabled:opacity-50 transition-all flex items-center gap-2 cursor-pointer"
            >
              <UserPlus className="h-4 w-4" />
              <span>{isSubmitting ? 'Registering Account...' : 'Create Account & Sign In'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
