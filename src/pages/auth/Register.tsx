import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import RegisterAccountModal from '../../components/common/RegisterAccountModal';
import BrandLogo from '../../components/common/BrandLogo';
import { ArrowLeft, UserPlus, ShieldCheck, CheckCircle2, BookOpen, GraduationCap, Briefcase, FlaskConical } from 'lucide-react';

export default function Register() {
  const [isModalOpen, setIsModalOpen] = useState(true);
  const [isSuccess, setIsSuccess] = useState(false);
  const navigate = useNavigate();

  const handleClose = () => {
    navigate('/', { replace: true });
  };

  const handleSuccess = () => {
    setIsSuccess(true);
    setIsModalOpen(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-slate-100 flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8 relative overflow-hidden font-sans">
      {/* Background glowing gradients */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Bar Back Link */}
      <div className="w-full max-w-2xl mx-auto mb-6 flex justify-between items-center z-20">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-300 hover:text-white bg-slate-900/60 hover:bg-slate-800/80 px-4 py-2 rounded-2xl border border-slate-800 backdrop-blur-md transition-all shadow-sm group cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span>Back to Library Home</span>
        </Link>
        <Link
          to="/login"
          className="inline-flex items-center gap-2 text-xs font-bold text-blue-400 hover:text-blue-300 bg-blue-950/40 hover:bg-blue-900/50 px-4 py-2 rounded-2xl border border-blue-800/50 transition-all cursor-pointer"
        >
          <span>Already registered? Sign In</span>
        </Link>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center flex flex-col items-center justify-center space-y-3 z-10 mb-6">
        <BrandLogo variant="dark" size="md" showTagline={true} />
        <h1 className="text-xl sm:text-2xl font-extrabold text-white">University Library Account Registration</h1>
        <p className="text-xs sm:text-sm text-slate-400">
          Apply online for institutional membership as Student, Faculty, or Research Scholar.
        </p>
      </div>

      {isSuccess ? (
        <div className="max-w-md mx-auto bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 text-center space-y-4 shadow-2xl z-10">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-bold text-white">Registration Application Submitted</h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            Your membership application has been received and is waiting for Central Library Admin verification. You will receive activation confirmation shortly.
          </p>
          <div className="pt-2 flex flex-col gap-2">
            <Link
              to="/login"
              className="w-full py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg transition-all"
            >
              Go to Portal Login
            </Link>
            <Link
              to="/"
              className="w-full py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-all"
            >
              Return to Public Home
            </Link>
          </div>
        </div>
      ) : (
        <div className="max-w-2xl mx-auto bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 text-center space-y-6 shadow-2xl z-10">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
            <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60 space-y-2">
              <GraduationCap className="w-6 h-6 text-blue-400" />
              <div className="font-bold text-xs text-white">Student Scholar</div>
              <p className="text-[11px] text-slate-400">Undergraduate & postgraduate degree students</p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60 space-y-2">
              <FlaskConical className="w-6 h-6 text-indigo-400" />
              <div className="font-bold text-xs text-white">Research Scholar</div>
              <p className="text-[11px] text-slate-400">Doctoral Ph.D. & postdoctoral research fellows</p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60 space-y-2">
              <Briefcase className="w-6 h-6 text-amber-400" />
              <div className="font-bold text-xs text-white">Faculty / Professor</div>
              <p className="text-[11px] text-slate-400">Professors, lecturers & academic staff</p>
            </div>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm shadow-xl shadow-blue-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Open Online Registration Form</span>
          </button>
        </div>
      )}

      {/* Registration Modal */}
      <RegisterAccountModal
        isOpen={isModalOpen}
        onClose={handleClose}
        onSuccess={handleSuccess}
      />
    </div>
  );
}
