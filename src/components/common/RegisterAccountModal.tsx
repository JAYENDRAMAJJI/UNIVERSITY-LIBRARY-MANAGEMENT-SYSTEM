import React, { useState } from 'react';
import {
  UserPlus,
  X,
  CheckCircle,
  Mail,
  Lock,
  Phone,
  Building,
  User,
  Eye,
  EyeOff,
  Hash,
  GraduationCap,
  MapPin,
  PhoneCall,
  Clock,
  ShieldCheck,
  AlertCircle,
  FileCheck,
  Sparkles,
  ArrowRight,
  Briefcase,
  Layers,
} from 'lucide-react';
import { libraryStore } from '../../services/libraryStore.service';
import { Role } from '../../types';

interface RegisterAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function RegisterAccountModal({ isOpen, onClose, onSuccess }: RegisterAccountModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    rollNo: '',
    gender: 'MALE' as 'MALE' | 'FEMALE' | 'OTHER',
    academicBatch: 'B.Tech 3rd Year',
    program: 'Computer Science & Engineering',
    emergencyContact: '',
    address: '',
    role: 'STUDENT' as Role,
    department: 'Computer Science & Engineering',
    idProofType: 'COLLEGE_ID' as 'COLLEGE_ID' | 'AADHAAR' | 'PASSPORT' | 'DRIVING_LICENSE' | 'OTHER',
    idProofNumber: '',
    password: '',
    confirmPassword: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<{
    success: boolean;
    appRef: string;
    message: string;
    submittedName: string;
    submittedEmail: string;
    submittedRole: Role;
  } | null>(null);

  if (!isOpen) return null;

  const handleClose = () => {
    setSubmissionResult(null);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim()) return;

    if (!formData.password || formData.password.length < 6) {
      setPasswordError('Password must be at least 6 characters long.');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setPasswordError('Passwords do not match. Please re-enter.');
      return;
    }

    setPasswordError(null);
    setIsSubmitting(true);

    setTimeout(() => {
      // Submit registration with status: PENDING_APPROVAL
      const result = libraryStore.submitAccountRegistration({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        role: formData.role,
        department: formData.department,
        phone: formData.phone,
        rollNo: formData.rollNo,
        gender: formData.gender,
        program: formData.program,
        academicBatch: formData.academicBatch,
        address: formData.address,
        emergencyContact: formData.emergencyContact,
        idProofType: formData.idProofType,
        idProofNumber: formData.idProofNumber || formData.rollNo,
      });

      setIsSubmitting(false);

      if (result.success && result.member) {
        setSubmissionResult({
          success: true,
          appRef: result.member.memberCardNo || `APP-${Date.now().toString().slice(-6)}`,
          message: result.message,
          submittedName: result.member.name,
          submittedEmail: result.member.email,
          submittedRole: result.member.role,
        });
        if (onSuccess) onSuccess();
      } else {
        setPasswordError(result.message);
      }
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 animate-fadeIn overflow-y-auto">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-xl w-full overflow-hidden space-y-0 my-auto max-h-[94vh] flex flex-col animate-scaleUp">
        {/* Modal Header */}
        <div className="p-6 bg-gradient-to-r from-slate-950 via-indigo-950 to-blue-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-2xl bg-blue-500/20 text-blue-300 border border-blue-400/20">
              <UserPlus className="h-6 w-6" />
            </span>
            <div>
              <h3 className="font-bold text-lg font-poppins">Library Account Registration</h3>
              <p className="text-xs text-slate-300">Submit institutional membership application for Admin approval</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* ----------------------------------------------------------- */}
        {/* SUBMISSION SUCCESS & PENDING APPROVAL CONFIRMATION SCREEN   */}
        {/* ----------------------------------------------------------- */}
        {submissionResult ? (
          <div className="p-6 sm:p-8 space-y-6 overflow-y-auto text-center animate-fadeIn">
            <div className="w-16 h-16 mx-auto rounded-3xl bg-amber-100 text-amber-700 flex items-center justify-center border-2 border-amber-300 shadow-lg shadow-amber-500/10">
              <Clock className="w-8 h-8 animate-pulse" />
            </div>

            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase px-3 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                <Clock className="w-3.5 h-3.5 text-amber-700" /> Account Status: Pending Approval
              </div>
              <h4 className="text-xl font-extrabold text-slate-900 font-poppins">
                Registration Submitted Successfully!
              </h4>
              <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
                Your application for <strong>{submissionResult.submittedName}</strong> ({submissionResult.submittedRole}) has been received and forwarded to the Central Library Administration.
              </p>
            </div>

            {/* Application Dossier Box */}
            <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 text-left space-y-2.5 text-xs max-w-md mx-auto">
              <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                <span className="text-slate-500 font-bold">Application Reference:</span>
                <span className="font-mono font-extrabold text-blue-700 text-sm">{submissionResult.appRef}</span>
              </div>
              <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                <span className="text-slate-500 font-bold">Registered Email:</span>
                <span className="font-mono font-bold text-slate-800">{submissionResult.submittedEmail}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-bold">Review Desk:</span>
                <span className="font-bold text-slate-700">Central Library Admin Governance</span>
              </div>
            </div>

            {/* Approval Requirement Notice */}
            <div className="bg-blue-50/80 border border-blue-200 rounded-2xl p-4 text-left space-y-2 text-xs text-blue-900">
              <div className="font-bold flex items-center gap-1.5 text-blue-800">
                <ShieldCheck className="w-4 h-4 text-blue-600" /> Important Access Policy:
              </div>
              <ul className="list-disc pl-5 space-y-1 text-[11.5px] text-blue-800/90 leading-relaxed">
                <li>Your account is currently waiting for Admin review and verification.</li>
                <li>You will <strong>not be able to log in</strong> to the Library Portal until the Admin approves your request.</li>
                <li>Once approved, you will receive an approval notification and your official Library Card Number.</li>
              </ul>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={handleClose}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-blue-800 hover:to-indigo-800 text-white font-bold text-xs shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
              >
                <span>Understood & Return to Login</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          /* ----------------------------------------------------------- */
          /* REGISTRATION FORM                                           */
          /* ----------------------------------------------------------- */
          <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs font-medium overflow-y-auto">
            {passwordError && (
              <div className="flex items-center gap-2 p-3 rounded-2xl bg-rose-50 text-rose-800 border border-rose-200 font-bold text-xs">
                <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                <span>{passwordError}</span>
              </div>
            )}

            {/* Role & Name */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                        : newRole === 'STAFF'
                        ? 'Library Attendant'
                        : 'Visiting Scholar';
                    setFormData({ ...formData, role: newRole, academicBatch: defaultBatch });
                  }}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white"
                >
                  <option value="STUDENT">Student Scholar</option>
                  <option value="FACULTY">Faculty Member / Professor</option>
                  <option value="STAFF">Library Staff / Administrative</option>
                  <option value="OTHER">Other Authorized Scholar / Guest</option>
                </select>
              </div>

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
            </div>

            {/* Email & Phone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-slate-700 font-bold">Institutional Email *</label>
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
                <label className="block text-slate-700 font-bold">Phone Number *</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="tel"
                    required
                    placeholder="+91 98765 43210"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>
            </div>

            {/* Roll / Employee ID & Department */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-slate-700 font-bold">
                  {formData.role === 'STUDENT'
                    ? 'Roll No / Registration ID *'
                    : formData.role === 'FACULTY'
                    ? 'Faculty Employee ID *'
                    : 'Employee / Staff ID *'}
                </label>
                <div className="relative">
                  <Hash className="absolute left-3 top-3 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    required
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
                <label className="block text-slate-700 font-bold">Department / Division *</label>
                <div className="relative">
                  <Building className="absolute left-3 top-3 h-3.5 w-3.5 text-slate-400" />
                  <select
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white"
                  >
                    <option value="Computer Science & Engineering">Computer Science & Engineering</option>
                    <option value="Electronics & Communication">Electronics & Communication</option>
                    <option value="Mechanical Engineering">Mechanical Engineering</option>
                    <option value="Civil Engineering">Civil Engineering</option>
                    <option value="Electrical Engineering">Electrical Engineering</option>
                    <option value="Biotechnology & Bioinformatics">Biotechnology & Bioinformatics</option>
                    <option value="Management Studies & MBA">Management Studies & MBA</option>
                    <option value="Basic Sciences & Humanities">Basic Sciences & Humanities</option>
                    <option value="Central Library & Circulation">Central Library & Circulation</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Academic Batch & Gender */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-slate-700 font-bold">
                  {formData.role === 'STUDENT' ? 'Academic Batch / Level' : 'Designation / Title'}
                </label>
                <div className="relative">
                  <GraduationCap className="absolute left-3 top-3 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={formData.academicBatch}
                    onChange={(e) => setFormData({ ...formData, academicBatch: e.target.value })}
                    placeholder="e.g. B.Tech 3rd Year / Assistant Professor"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-slate-700 font-bold">Gender</label>
                <select
                  value={formData.gender}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value as any })}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white"
                >
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other / Prefer not to say</option>
                </select>
              </div>
            </div>

            {/* Password & Confirm Password */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-slate-700 font-bold">Password *</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Min 6 characters"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-slate-700 font-bold">Confirm Password *</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Re-enter password"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>
            </div>

            {/* Address & Emergency Contact */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-slate-700 font-bold">Residential / Hostel Address</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="e.g. Hostel Block B, Room 304"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-slate-700 font-bold">Emergency Contact Phone</label>
                <div className="relative">
                  <PhoneCall className="absolute left-3 top-3 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="tel"
                    placeholder="+91 98000 00000"
                    value={formData.emergencyContact}
                    onChange={(e) => setFormData({ ...formData, emergencyContact: e.target.value })}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>
            </div>

            {/* Notice Callout */}
            <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200/80 text-[11px] text-amber-900 space-y-1 flex items-start gap-2">
              <Clock className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <strong>Approval Requirement Notice:</strong> All new accounts require verification and approval by the Central Library Administration before login privileges are granted.
              </div>
            </div>

            {/* Submit Action */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2.5 rounded-2xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold text-xs transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-900 hover:from-blue-800 hover:to-indigo-800 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all flex items-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Submitting Application...</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    <span>Submit for Admin Approval</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
