import React, { useState, useEffect, useMemo } from 'react';
import {
  Award,
  CheckCircle,
  AlertTriangle,
  FileText,
  Clock,
  ShieldCheck,
  Printer,
  Download,
  BookOpen,
  IndianRupee,
  User,
  Building2,
  Calendar,
  Sparkles,
  ArrowRight,
  RefreshCw,
  Info,
  CheckCircle2,
  XCircle,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { libraryStore, getLocalDateStr } from '../services/libraryStore.service';
import { MemberProfile, NoDueApplication, NoDuePurpose } from '../types/library';
import NoDueCertificateModal from '../components/common/NoDueCertificateModal';
import { Link } from 'react-router-dom';

export default function NoDueClearance() {
  const { user } = useAuth();
  const [storeState, setStoreState] = useState(libraryStore.snapshot);
  const [purpose, setPurpose] = useState<NoDuePurpose>('COURSE_COMPLETION');
  const [purposeDetails, setPurposeDetails] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isCertModalOpen, setIsCertModalOpen] = useState(false);

  useEffect(() => {
    const sub = libraryStore.getObservable().subscribe(setStoreState);
    return () => sub.unsubscribe();
  }, []);

  // Find member profile for current user
  const memberProfile: MemberProfile | undefined = useMemo(() => {
    if (!user) return undefined;
    const members = storeState.members || [];
    return (
      members.find((m) => m.email?.toLowerCase() === user.email?.toLowerCase()) ||
      members.find((m) => m.name?.toLowerCase() === user.name?.toLowerCase()) ||
      members[0]
    );
  }, [user, storeState.members]);

  // Live No Due Audit
  const audit = useMemo(() => {
    if (!memberProfile) return null;
    return libraryStore.getMemberNoDueAudit(memberProfile.id);
  }, [memberProfile, storeState]);

  // User's clearance application
  const myApplication: NoDueApplication | undefined = useMemo(() => {
    if (!memberProfile) return undefined;
    const apps = storeState.noDueApplications || [];
    const found = apps.find(
      (a) =>
        a.studentId === memberProfile.id ||
        a.libraryMembershipId.toLowerCase() === memberProfile.memberCardNo.toLowerCase()
    );
    // If the student currently has unreturned loans or fines, an issued certificate cannot be active
    if (found && found.status === 'CERTIFICATE_ISSUED' && audit && !audit.isEligible) {
      return undefined;
    }
    return found;
  }, [memberProfile, storeState.noDueApplications, audit]);

  const handleReturnBook = (txId: string) => {
    const res = libraryStore.returnBook(txId, 'GOOD', 'Returned at circulation desk for No Due clearance verification.');
    if (res.success) {
      setToast({ type: 'success', message: 'Book returned to library successfully! Audit updated.' });
    } else {
      setToast({ type: 'error', message: res.message });
    }
  };

  const handleSettleFines = () => {
    if (!memberProfile || !audit) return;
    audit.pendingFines.forEach((f) => {
      libraryStore.processFinePayment(f.id, 'PAY');
    });
    setToast({ type: 'success', message: 'All outstanding library fines cleared successfully! Audit updated.' });
  };

  const handleSubmitApplication = (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberProfile) return;

    setIsSubmitting(true);
    const res = libraryStore.submitNoDueApplication({
      studentId: memberProfile.id,
      studentName: memberProfile.name,
      rollNo: memberProfile.rollNo || '22CS104',
      department: memberProfile.department || 'Computer Science & Engineering',
      program: memberProfile.role === 'FACULTY' ? 'Faculty Member' : 'Bachelor of Technology',
      batch: memberProfile.academicBatch || '2022 - 2026',
      semesterYear: memberProfile.role === 'FACULTY' ? 'Academic Department' : 'Final Year (Semester 8)',
      libraryMembershipId: memberProfile.memberCardNo,
      email: memberProfile.email,
      phone: memberProfile.phone,
      purpose,
      purposeOtherDetails: purposeDetails,
    });

    setIsSubmitting(false);
    if (res.success) {
      setToast({ type: 'success', message: res.message });
    } else {
      setToast({ type: 'error', message: res.message });
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* Top Header Card */}
      <div className="bg-gradient-to-r from-slate-950 via-indigo-950 to-blue-900 p-6 sm:p-9 rounded-3xl border border-slate-800/80 shadow-xl space-y-4 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-blue-300 bg-white/10 px-3.5 py-1.5 rounded-full border border-blue-400/20 shadow-xs backdrop-blur-xs">
              <Award className="h-4 w-4 text-blue-300" />
              <span>Library Clearance & No Due Desk</span>
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold font-poppins tracking-tight text-white leading-tight">
              Apply for <span className="bg-gradient-to-r from-blue-300 via-indigo-200 to-sky-200 bg-clip-text text-transparent">No Due Certificate (NDC)</span>
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm md:text-base max-w-2xl font-medium leading-relaxed">
              Official institutional clearance proving zero outstanding book loans, returned library materials, and nil financial fines for degree completion, transfer, or relieving.
            </p>
          </div>

          {myApplication?.status === 'CERTIFICATE_ISSUED' && (
            <button
              onClick={() => setIsCertModalOpen(true)}
              className="px-6 py-3 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-blue-500/25 cursor-pointer transition-all active:scale-95 shrink-0 border border-blue-400/30"
            >
              <Printer className="h-4 w-4" />
              <span>View & Print Certificate</span>
            </button>
          )}
        </div>
      </div>

      {/* Toast Alert */}
      {toast && (
        <div
          className={`p-4 rounded-2xl text-xs font-bold flex items-center justify-between shadow-xs animate-fadeIn ${
            toast.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
              : 'bg-rose-50 text-rose-900 border border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {toast.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            ) : (
              <XCircle className="h-4 w-4 text-rose-600 shrink-0" />
            )}
            <span>{toast.message}</span>
          </div>
          <button onClick={() => setToast(null)} className="text-slate-400 hover:text-slate-600 font-bold">
            ✕
          </button>
        </div>
      )}

      {/* Grid: Live Dues Audit & Member Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Member Profile Summary */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
              Applicant Profile
            </span>
            <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200">
              {memberProfile?.role || user?.role || 'STUDENT'}
            </span>
          </div>
          <div className="space-y-1 text-xs">
            <p className="text-slate-900 font-bold text-sm">{memberProfile?.name || user?.name}</p>
            <p className="text-slate-500 font-mono">
              Card ID: <strong className="text-purple-700">{memberProfile?.memberCardNo || 'STU-2026-7326'}</strong>
            </p>
            <p className="text-slate-500">
              Roll / Emp ID: <strong className="text-slate-700">{memberProfile?.rollNo || '22CS104'}</strong>
            </p>
            <p className="text-slate-500">
              Dept: <strong className="text-slate-700">{memberProfile?.department || 'Computer Science & Engineering'}</strong>
            </p>
          </div>
        </div>

        {/* Live Active Book Loans Check */}
        <div
          className={`p-5 rounded-3xl border shadow-xs space-y-2 flex flex-col justify-between ${
            audit?.activeLoansCount === 0
              ? 'bg-emerald-50/40 border-emerald-200 text-emerald-900'
              : 'bg-rose-50/40 border-rose-200 text-rose-900'
          }`}
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase tracking-wider">Book Loans Audit</span>
              <BookOpen className="h-4 w-4" />
            </div>
            <p className="text-2xl font-black font-poppins mt-2">
              {audit?.activeLoansCount === 0 ? '✓ 0 Books (All Returned)' : `⚠ ${audit?.activeLoansCount} Books Borrowed`}
            </p>
          </div>
          <p className="text-xs">
            {audit?.activeLoansCount === 0 ? (
              <span className="text-emerald-700 font-bold">✓ No active books in possession. Ready for clearance!</span>
            ) : (
              <Link to="/borrow-history" className="text-rose-700 font-bold hover:underline inline-flex items-center gap-1">
                View & Return Borrowed Books →
              </Link>
            )}
          </p>
        </div>

        {/* Live Pending Fines Check */}
        <div
          className={`p-5 rounded-3xl border shadow-xs space-y-2 flex flex-col justify-between ${
            audit?.pendingFinesAmount === 0
              ? 'bg-emerald-50/40 border-emerald-200 text-emerald-900'
              : 'bg-rose-50/40 border-rose-200 text-rose-900'
          }`}
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase tracking-wider">Financial Dues Audit</span>
              <IndianRupee className="h-4 w-4" />
            </div>
            <p className="text-2xl font-black font-poppins mt-2">
              {audit?.pendingFinesAmount === 0 ? '✓ ₹0.00 (Nil Dues)' : `⚠ ₹${audit?.pendingFinesAmount?.toFixed(2)} Pending`}
            </p>
          </div>
          <p className="text-xs">
            {audit?.pendingFinesAmount === 0 ? (
              <span className="text-emerald-700 font-bold">✓ Zero outstanding overdue fines or penalty fees.</span>
            ) : (
              <span className="text-rose-700 font-bold">Please settle library fine at the admin circulation desk.</span>
            )}
          </p>
        </div>
      </div>

      {/* Main Workflow Section */}
      {myApplication ? (
        /* Status & Visual Progress Stepper for Existing Application */
        <div className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold font-poppins text-slate-900">
                  Application Status: {myApplication.applicationNo}
                </h3>
                <span
                  className={`px-3 py-0.5 rounded-full text-xs font-extrabold uppercase border ${
                    myApplication.status === 'CERTIFICATE_ISSUED'
                      ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                      : myApplication.status === 'APPROVED'
                      ? 'bg-blue-100 text-blue-900 border-blue-300'
                      : myApplication.status === 'REJECTED'
                      ? 'bg-rose-100 text-rose-900 border-rose-300'
                      : 'bg-amber-100 text-amber-900 border-amber-300'
                  }`}
                >
                  {myApplication.status.replace(/_/g, ' ')}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Purpose: <strong>{myApplication.purpose.replace(/_/g, ' ')}</strong> • Applied on {myApplication.applicationDate}
              </p>
            </div>

            {myApplication.status === 'CERTIFICATE_ISSUED' && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsCertModalOpen(true)}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <Printer className="h-3.5 w-3.5" /> Print Certificate
                </button>
              </div>
            )}
          </div>

          {/* 4-Step Visual Progress Stepper */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            {[
              {
                step: 1,
                label: 'Application Submitted',
                desc: 'Received by Library System',
                isDone: true,
                isActive: myApplication.status === 'SUBMITTED',
              },
              {
                step: 2,
                label: 'Dues & Loans Verified',
                desc: 'Circulation & Book Audit',
                isDone:
                  myApplication.status === 'UNDER_VERIFICATION' ||
                  myApplication.status === 'APPROVED' ||
                  myApplication.status === 'CERTIFICATE_ISSUED',
                isActive: myApplication.status === 'UNDER_VERIFICATION',
              },
              {
                step: 3,
                label: 'Head of Library Approval',
                desc: 'Authorized Signatory Clearance',
                isDone:
                  myApplication.status === 'APPROVED' ||
                  myApplication.status === 'CERTIFICATE_ISSUED',
                isActive: myApplication.status === 'APPROVED',
              },
              {
                step: 4,
                label: 'Official NDC Certificate',
                desc: 'Digitally Signed & Ready',
                isDone: myApplication.status === 'CERTIFICATE_ISSUED',
                isActive: myApplication.status === 'CERTIFICATE_ISSUED',
              },
            ].map((s) => (
              <div
                key={s.step}
                className={`p-4 rounded-2xl border transition-all ${
                  s.isDone
                    ? 'bg-purple-50/70 border-purple-200 text-purple-950'
                    : 'bg-slate-50 border-slate-200 text-slate-400'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono font-bold text-xs">Step 0{s.step}</span>
                  {s.isDone ? (
                    <CheckCircle2 className="h-4 w-4 text-purple-600" />
                  ) : (
                    <Clock className="h-4 w-4 text-slate-300" />
                  )}
                </div>
                <h4 className="font-bold text-xs">{s.label}</h4>
                <p className="text-[11px] text-slate-500 mt-0.5">{s.desc}</p>
              </div>
            ))}
          </div>

          {/* Certificate Banner if Issued */}
          {myApplication.status === 'CERTIFICATE_ISSUED' && (
            <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white p-6 rounded-3xl shadow-md space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-1.5 text-[11px] font-bold bg-white/20 px-3 py-0.5 rounded-full">
                    <ShieldCheck className="h-4 w-4 text-emerald-200" /> Verified Institutional Clearance
                  </div>
                  <h4 className="text-xl font-extrabold font-poppins">
                    Library No Due Certificate is Ready!
                  </h4>
                  <p className="text-xs text-emerald-100 font-mono">
                    Certificate Ref: <strong>{myApplication.certificateNo || 'NDC/LIB/2026/0001'}</strong> • Issued: {myApplication.certificateIssuedDate}
                  </p>
                </div>

                <button
                  onClick={() => setIsCertModalOpen(true)}
                  className="px-6 py-3 rounded-2xl bg-white text-emerald-950 hover:bg-emerald-50 font-bold text-xs flex items-center gap-2 shadow-lg cursor-pointer transition-all active:scale-95 shrink-0"
                >
                  <Printer className="h-4 w-4 text-emerald-700" /> View & Download Certificate
                </button>
              </div>
            </div>
          )}

          {/* Audit History Timeline */}
          {myApplication.history && myApplication.history.length > 0 && (
            <div className="space-y-2 pt-2">
              <span className="text-xs font-bold text-slate-700 block uppercase tracking-wider">
                Clearance Ledger History
              </span>
              <div className="divide-y divide-slate-100 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs space-y-2">
                {myApplication.history.map((h, i) => (
                  <div key={i} className="pt-2 first:pt-0 flex items-start justify-between">
                    <div>
                      <span className="font-bold text-slate-900">{h.status.replace(/_/g, ' ')}</span>
                      <p className="text-slate-500 text-[11px]">{h.remarks}</p>
                      <p className="text-slate-400 text-[10px]">Actor: {h.changedBy}</p>
                    </div>
                    <span className="font-mono text-[10px] text-slate-400">{h.changedAt}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Application Submission Section */
        <div className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-200 shadow-sm space-y-5">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-lg font-bold font-poppins text-slate-900">
              Submit No Due Clearance Request
            </h3>
            <p className="text-xs text-slate-500">
              All physical books and overdue fine liabilities must be 100% cleared before applying for clearance.
            </p>
          </div>

          {/* INELIGIBILITY BLOCK: Show EXACT Issues and Block Submission */}
          {audit && !audit.isEligible ? (
            <div className="space-y-4">
              <div className="bg-rose-50 border-2 border-rose-300 rounded-3xl p-5 sm:p-6 text-rose-950 space-y-4">
                <div className="flex items-start gap-3.5">
                  <div className="p-2.5 rounded-2xl bg-rose-100 text-rose-700 shrink-0">
                    <XCircle className="h-6 w-6" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-base font-extrabold font-poppins text-rose-900">
                      Clearance Application Blocked: Outstanding Library Liabilities Found
                    </h4>
                    <p className="text-xs text-rose-800 leading-relaxed font-medium">
                      According to university library regulations, you <strong>cannot apply for or receive a No Due Certificate</strong> until all borrowed materials are returned to the library counter and all financial dues are paid in full.
                    </p>
                  </div>
                </div>

                {/* Specific Issue 1: Borrowed Books List */}
                {audit.activeLoans.length > 0 && (
                  <div className="bg-white/90 rounded-2xl p-4 border border-rose-200 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-rose-900 uppercase tracking-wider flex items-center gap-1.5">
                        <BookOpen className="h-4 w-4 text-rose-600" />
                        1. Books That Must Be Returned ({audit.activeLoans.length}):
                      </span>
                      <Link
                        to="/borrow-history"
                        className="text-xs font-bold text-purple-700 hover:underline flex items-center gap-1"
                      >
                        View My Loans <ExternalLink className="h-3 w-3" />
                      </Link>
                    </div>

                    <div className="divide-y divide-rose-100 text-xs">
                      {audit.activeLoans.map((loan) => (
                        <div key={loan.id} className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-3">
                          <div>
                            <p className="font-bold text-slate-900 text-xs">{loan.bookTitle}</p>
                            <p className="text-[11px] text-slate-500 font-mono">
                              Barcode/Acc: <strong className="text-slate-700">{loan.barcode || loan.accessionNumber || 'ACC-8910'}</strong> • Issued: {loan.issueDate}
                            </p>
                          </div>
                          <div className="text-right flex items-center gap-2 shrink-0">
                            <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                              Due: {loan.dueDate}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleReturnBook(loan.id)}
                              className="px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold text-[10.5px] cursor-pointer shadow-xs transition-all active:scale-95"
                            >
                              Return Book
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Specific Issue 2: Unpaid Fines */}
                {audit.pendingFinesAmount > 0 && (
                  <div className="bg-white/90 rounded-2xl p-4 border border-rose-200 space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <span className="text-xs font-extrabold text-rose-900 uppercase tracking-wider flex items-center gap-1.5">
                        <IndianRupee className="h-4 w-4 text-rose-600" />
                        2. Unpaid Library Fines: ₹{audit.pendingFinesAmount.toFixed(2)}
                      </span>
                      <div className="flex items-center gap-2">
                        <Link
                          to="/fines"
                          className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[10.5px] cursor-pointer shadow-2xs transition-all flex items-center gap-1"
                        >
                          View Breakdown & Receipts &rarr;
                        </Link>
                        <button
                          type="button"
                          onClick={handleSettleFines}
                          className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-[10.5px] cursor-pointer shadow-xs transition-all active:scale-95"
                        >
                          Settle Fines
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-slate-600">
                      Please settle fine liabilities online or at the circulation desk to unlock your clearance application.
                    </p>
                  </div>
                )}

                <div className="p-3.5 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-900 flex items-center gap-2">
                  <Info className="h-4 w-4 text-amber-700 shrink-0" />
                  <span>
                    Once you return the books at the desk and settle your dues, this page will automatically unlock and allow you to submit your application.
                  </span>
                </div>
              </div>

              {/* Locked Form Controls */}
              <div className="opacity-50 pointer-events-none p-5 rounded-3xl border border-slate-200 bg-slate-50 space-y-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1 text-xs">Clearance Purpose</label>
                  <select disabled className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-bold bg-white">
                    <option>Graduation / Final Year Course Completion</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1 text-xs">Remarks</label>
                  <textarea disabled rows={2} className="w-full p-2.5 rounded-xl border border-slate-200 text-xs" />
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  disabled
                  className="px-6 py-3 rounded-2xl bg-slate-300 text-slate-500 font-bold text-xs flex items-center gap-2 cursor-not-allowed shadow-none"
                >
                  🔒 Clear Library Dues to Unlock Application
                </button>
              </div>
            </div>
          ) : (
            /* ELIGIBLE: Unlocked Application Form */
            <form onSubmit={handleSubmitApplication} className="space-y-4 text-xs">
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-950 flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                <div>
                  <h4 className="font-bold text-sm">✓ All Library Dues 100% Cleared!</h4>
                  <p className="text-xs text-emerald-800">
                    You have 0 borrowed books and ₹0.00 fines. You are fully eligible to apply for your official No Due Certificate.
                  </p>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Clearance Purpose *</label>
                <select
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value as NoDuePurpose)}
                  className="w-full p-3 rounded-2xl border border-slate-200 font-bold text-slate-800 bg-slate-50 focus:bg-white"
                >
                  <option value="COURSE_COMPLETION">Graduation / Final Year Course Completion</option>
                  <option value="COLLEGE_TRANSFER">College / University Transfer & Migration</option>
                  <option value="SEMESTER_CLEARANCE">End of Semester Break Clearance</option>
                  <option value="INTERNSHIP_PROJECT">External Research Project / Internship Clearance</option>
                  <option value="EXAM_HALL_TICKET">End Semester Examination Hall Ticket</option>
                  <option value="HOSTEL_CLEARANCE">Hostel Vacating & Room Clearance</option>
                  <option value="COURSE_WITHDRAWAL">Course Withdrawal / Program Drop</option>
                  <option value="OTHER">Other Institutional Purpose</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Additional Remarks / Forwarding Authority Note (Optional)
                </label>
                <textarea
                  rows={3}
                  placeholder="Mention any specific instructions, submission deadline, or forwarding administrative department..."
                  value={purposeDetails}
                  onChange={(e) => setPurposeDetails(e.target.value)}
                  className="w-full p-3 rounded-2xl border border-slate-200 font-medium focus:ring-2 focus:ring-purple-500/20"
                />
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-3 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center gap-2 shadow-md cursor-pointer transition-all active:scale-95 disabled:opacity-50"
                >
                  <FileText className="h-4 w-4" /> Submit Clearance Application →
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Official Certificate Modal */}
      {isCertModalOpen && memberProfile && (
        <NoDueCertificateModal
          isOpen={isCertModalOpen}
          onClose={() => setIsCertModalOpen(false)}
          member={memberProfile}
          application={myApplication}
          isAdminView={false}
        />
      )}
    </div>
  );
}
