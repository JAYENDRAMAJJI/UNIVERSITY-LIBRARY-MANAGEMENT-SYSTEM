import React, { useState, useEffect } from 'react';
import {
  Bell,
  Send,
  X,
  AlertTriangle,
  Clock,
  IndianRupee,
  BookOpen,
  User,
  Sparkles,
  CheckCircle2,
  ShieldCheck,
} from 'lucide-react';
import { libraryStore } from '../../services/libraryStore.service';
import { useAuth } from '../../context/AuthContext';

export interface SendNotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode?: 'BORROW_HISTORY' | 'FINES' | 'MEMBERS' | 'GENERAL';
  initialMember?: {
    id?: string;
    name: string;
    email?: string;
    memberCardNo?: string;
    role?: string;
  } | null;
  initialContext?: {
    type?: 'DUE_SOON' | 'LAST_DAY' | 'OVERDUE' | 'FINE_DUE' | 'RENEW_RETURN' | 'CUSTOM';
    bookTitle?: string;
    accessionNo?: string;
    barcode?: string;
    dueDate?: string;
    fineAmount?: number;
    daysOverdue?: number;
  } | null;
  onSuccess?: (message: string) => void;
}

export default function SendNotificationModal({
  isOpen,
  onClose,
  mode = 'GENERAL',
  initialMember,
  initialContext,
  onSuccess,
}: SendNotificationModalProps) {
  const { user } = useAuth();
  const [recipientName, setRecipientName] = useState(initialMember?.name || '');
  const [recipientEmail, setRecipientEmail] = useState(initialMember?.email || '');
  const [recipientMemberId, setRecipientMemberId] = useState(initialMember?.id || '');
  const [targetAudience, setTargetAudience] = useState<'INDIVIDUAL' | 'STUDENTS' | 'FACULTY' | 'ALL'>('INDIVIDUAL');
  const [category, setCategory] = useState<'DUE_REMINDER' | 'OVERDUE_WARNING' | 'FINE_PAYMENT' | 'GENERAL'>('DUE_REMINDER');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);
  const [senderName, setSenderName] = useState('Central Library Circulation Desk');
  const [isSending, setIsSending] = useState(false);

  // Apply templates based on context or user selection
  const applyTemplate = (
    type: 'DUE_SOON' | 'LAST_DAY' | 'OVERDUE' | 'FINE_DUE' | 'CLEARANCE_HOLD' | 'WAIVER_ADVISORY' | 'RENEW_RETURN' | 'CUSTOM'
  ) => {
    const memberName = recipientName || 'Member';
    const bookTitle = initialContext?.bookTitle || 'Borrowed Library Book';
    const dueDate = initialContext?.dueDate || 'upcoming due date';
    const fineAmt = initialContext?.fineAmount || 25;

    if (type === 'DUE_SOON') {
      setCategory('DUE_REMINDER');
      setIsUrgent(false);
      setTitle(`Book Return Due Date Reminder: "${bookTitle}"`);
      setContent(
        `Dear ${memberName},\n\nThis is a friendly reminder from the University Central Library that your borrowed book "${bookTitle}" is scheduled for return on ${dueDate}.\n\nPlease return the book to the circulation desk or request a renewal/extension from your student/faculty dashboard before the deadline to avoid late fines (₹5.00/day).\n\nThank you,\nCentral Library Circulation Desk`
      );
    } else if (type === 'LAST_DAY') {
      setCategory('DUE_REMINDER');
      setIsUrgent(true);
      setTitle(`FINAL REMINDER: Last Day to Return "${bookTitle}" (Due: ${dueDate})`);
      setContent(
        `Dear ${memberName},\n\nThis is an urgent notice that ${dueDate} is the FINAL DUE DATE for returning your borrowed volume "${bookTitle}".\n\nPlease return the book to the circulation counter today by 05:00 PM or submit an extension request immediately. After today, an overdue fine of ₹5.00 per day will be applied automatically.\n\nCirculation Desk,\nUniversity Central Library`
      );
    } else if (type === 'OVERDUE') {
      setCategory('OVERDUE_WARNING');
      setIsUrgent(true);
      setTitle(`URGENT: Overdue Book Return Notice - "${bookTitle}"`);
      setContent(
        `Dear ${memberName},\n\nAccording to our circulation records, the book "${bookTitle}" issued to you was due on ${dueDate} and is now OVERDUE.\n\nA late return penalty of ₹5.00 per day is actively accruing on your account. Please return the book to the circulation counter immediately to prevent suspension of borrowing privileges and clearance holds.\n\nCirculation Desk,\nUniversity Central Library`
      );
    } else if (type === 'RENEW_RETURN') {
      setCategory('DUE_REMINDER');
      setIsUrgent(false);
      setTitle(`Library Borrowing Advisory: "${bookTitle}"`);
      setContent(
        `Dear ${memberName},\n\nRegarding your currently borrowed book "${bookTitle}" (Due Date: ${dueDate}):\n\nIf you have completed your reading or coursework, kindly return the book to the circulation counter so other students and faculty on the waitlist may borrow it. If you need more time, please apply for an extension in your dashboard.\n\nRegards,\nCentral Library Circulation Desk`
      );
    } else if (type === 'FINE_DUE') {
      setCategory('FINE_PAYMENT');
      setIsUrgent(true);
      setTitle(`Library Fine Notice: Outstanding Balance ₹${fineAmt.toFixed(2)}`);
      setContent(
        `Dear ${memberName},\n\nYou have an accumulated outstanding fine balance of ₹${fineAmt.toFixed(2)} for late book return(s) at the University Library.\n\nPlease settle your dues at the circulation desk or online via UPI/Card in your "My Fines & Dues" portal to ensure unrestricted borrowing privileges and eligibility for semester registration.\n\nAccounts & Circulation Desk,\nUniversity Central Library`
      );
    } else if (type === 'CLEARANCE_HOLD') {
      setCategory('FINE_PAYMENT');
      setIsUrgent(true);
      setTitle(`CRITICAL: Institutional Clearance Hold Due to Unpaid Fines (₹${fineAmt.toFixed(2)})`);
      setContent(
        `Dear ${memberName},\n\nThis is an official administrative advisory regarding your pending library fine liability of ₹${fineAmt.toFixed(2)}.\n\nUnder university regulations, uncleared library liabilities will place a temporary hold on your Semester Exam Hall Ticket, Academic Transcript, and No Due Clearance (NDC) certificate issuance.\n\nKindly clear your outstanding dues immediately online or at the library circulation desk.\n\nChief Librarian & Clearance Board`
      );
    } else if (type === 'WAIVER_ADVISORY') {
      setCategory('FINE_PAYMENT');
      setIsUrgent(false);
      setTitle(`Library Penalty Advisory & Fee Waiver Information`);
      setContent(
        `Dear ${memberName},\n\nRegarding your recorded fine liability of ₹${fineAmt.toFixed(2)}:\n\nIf you believe this penalty was assessed due to medical leave, official department duty, or institutional holidays, you may present supporting documentation at the Chief Librarian's desk (10:00 AM - 04:00 PM) for formal fee waiver review.\n\nAccounts Desk,\nUniversity Central Library`
      );
    } else {
      setCategory('GENERAL');
      setIsUrgent(false);
      setTitle(`Important Library Circular`);
      setContent(
        `Dear ${memberName},\n\nPlease be advised regarding upcoming library schedules and circulars.\n\nRegards,\nUniversity Central Library`
      );
    }
  };

  useEffect(() => {
    if (isOpen) {
      setRecipientName(initialMember?.name || '');
      setRecipientEmail(initialMember?.email || '');
      setRecipientMemberId(initialMember?.id || '');
      setSenderName(user?.name ? `${user.name} (Circulation Desk)` : 'Chief Librarian & Circulation Desk');

      if (initialContext?.type) {
        applyTemplate(initialContext.type);
      } else if (initialContext?.fineAmount && initialContext.fineAmount > 0 && mode === 'FINES') {
        applyTemplate('FINE_DUE');
      } else if (initialContext?.dueDate && new Date(initialContext.dueDate).getTime() < Date.now()) {
        applyTemplate('OVERDUE');
      } else {
        applyTemplate('DUE_SOON');
      }
    }
  }, [isOpen, initialMember, initialContext, mode]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    setIsSending(true);
    const res = libraryStore.sendMemberNotification(
      {
        recipientMemberId: targetAudience === 'INDIVIDUAL' ? recipientMemberId : undefined,
        recipientName: targetAudience === 'INDIVIDUAL' ? recipientName : targetAudience === 'STUDENTS' ? 'All Student Members' : targetAudience === 'FACULTY' ? 'All Faculty Members' : 'All University Members',
        recipientEmail: targetAudience === 'INDIVIDUAL' ? recipientEmail : undefined,
        targetAudience,
        title: title.trim(),
        content: content.trim(),
        isUrgent,
        senderName,
        category,
      },
      user
    );

    setIsSending(false);
    if (res.success) {
      if (onSuccess) onSuccess(res.message);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-950 via-indigo-950 to-blue-900 p-6 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-blue-500/20 text-blue-300 border border-blue-400/30">
              <Bell className="w-5 h-5 animate-bounce" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-widest text-blue-300">
                <Sparkles className="w-3 h-3" /> Administrative Dispatch
              </div>
              <h2 className="text-lg font-bold font-poppins text-white">Send Notification & Reminder</h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1 text-xs">
          {/* Recipient Target Info */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="font-extrabold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                <User className="w-4 h-4 text-blue-600" /> Target Member / Audience
              </span>
              <div className="flex items-center gap-1.5">
                {(['INDIVIDUAL', 'STUDENTS', 'FACULTY', 'ALL'] as const).map((aud) => (
                  <button
                    key={aud}
                    type="button"
                    onClick={() => setTargetAudience(aud)}
                    className={`px-2.5 py-1 rounded-lg text-[10.5px] font-bold transition-all cursor-pointer ${
                      targetAudience === aud
                        ? 'bg-blue-600 text-white shadow-2xs'
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {aud === 'INDIVIDUAL' ? 'Individual' : aud === 'STUDENTS' ? 'Students' : aud === 'FACULTY' ? 'Faculty' : 'All'}
                  </button>
                ))}
              </div>
            </div>

            {targetAudience === 'INDIVIDUAL' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Member Name *</label>
                  <input
                    type="text"
                    required
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    placeholder="e.g. Alex Johnson"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Email / Member ID</label>
                  <input
                    type="text"
                    value={recipientEmail || recipientMemberId}
                    onChange={(e) => setRecipientEmail(e.target.value)}
                    placeholder="e.g. student@college.edu or STU-2022-0891"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-mono text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Book Borrowing Reference Context Card (When opened from Borrow History) */}
          {mode === 'BORROW_HISTORY' && initialContext?.bookTitle && (
            <div className="p-3.5 rounded-2xl bg-indigo-50/80 border border-indigo-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-700 flex items-center gap-1">
                  <BookOpen className="w-3.5 h-3.5" /> Borrowing Reference
                </span>
                <p className="font-bold text-slate-900 text-xs sm:text-sm line-clamp-1">{initialContext.bookTitle}</p>
                <div className="flex items-center gap-2 text-[10.5px] font-medium text-slate-500">
                  {initialContext.accessionNo && <span>ACC: <strong className="font-mono text-slate-700">{initialContext.accessionNo}</strong></span>}
                  {initialContext.barcode && <span>BC: <strong className="font-mono text-slate-700">{initialContext.barcode}</strong></span>}
                </div>
              </div>
              {initialContext.dueDate && (
                <div className="bg-white px-3 py-1.5 rounded-xl border border-indigo-200 text-right shrink-0">
                  <span className="text-[9.5px] font-bold text-slate-400 uppercase block">Last Day To Return</span>
                  <span className="text-xs font-black font-mono text-indigo-900">{initialContext.dueDate}</span>
                </div>
              )}
            </div>
          )}

          {/* Fine & Penalty Context Card (When opened from Fine Management Desk) */}
          {mode === 'FINES' && (
            <div className="p-3.5 rounded-2xl bg-rose-50/80 border border-rose-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-rose-700 flex items-center gap-1">
                  <IndianRupee className="w-3.5 h-3.5" /> Fine Ledger Liability
                </span>
                <p className="font-bold text-slate-900 text-xs sm:text-sm">
                  {initialContext?.bookTitle ? `Late return for: "${initialContext.bookTitle}"` : 'Outstanding Library Dues & Penalties'}
                </p>
                <div className="flex items-center gap-2 text-[10.5px] font-medium text-slate-500">
                  <span>Borrower: <strong className="text-slate-800">{recipientName || 'Member'}</strong></span>
                </div>
              </div>
              <div className="bg-white px-4 py-2 rounded-xl border border-rose-200 text-right shrink-0">
                <span className="text-[9.5px] font-bold text-slate-400 uppercase block">Pending Due Balance</span>
                <span className="text-sm sm:text-base font-black font-mono text-rose-700">
                  ₹{initialContext?.fineAmount ? initialContext.fineAmount.toFixed(2) : '0.00'}
                </span>
              </div>
            </div>
          )}

          {/* Quick Template Selector */}
          <div className="space-y-2">
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
              {mode === 'BORROW_HISTORY'
                ? 'Book Borrowing & Return Notice Templates:'
                : mode === 'FINES'
                ? 'Fine Management & Dues Settlement Templates:'
                : '1-Click Message Templates:'}
            </label>

            {mode === 'FINES' ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => applyTemplate('FINE_DUE')}
                  className={`p-2.5 rounded-xl border text-left flex flex-col justify-between gap-1 transition-all cursor-pointer ${
                    title.includes('Fine Notice')
                      ? 'bg-rose-50 border-rose-300 text-rose-900 shadow-2xs font-bold'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-1 text-rose-600">
                    <IndianRupee className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-extrabold uppercase">Fine Due</span>
                  </div>
                  <span className="text-[11px] font-medium leading-tight">Dues Settlement</span>
                </button>

                <button
                  type="button"
                  onClick={() => applyTemplate('CLEARANCE_HOLD')}
                  className={`p-2.5 rounded-xl border text-left flex flex-col justify-between gap-1 transition-all cursor-pointer ${
                    title.includes('Clearance Hold')
                      ? 'bg-amber-50 border-amber-300 text-amber-900 shadow-2xs font-bold'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-1 text-amber-600">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-extrabold uppercase">Hold Alert</span>
                  </div>
                  <span className="text-[11px] font-medium leading-tight">Clearance Hold</span>
                </button>

                <button
                  type="button"
                  onClick={() => applyTemplate('WAIVER_ADVISORY')}
                  className={`p-2.5 rounded-xl border text-left flex flex-col justify-between gap-1 transition-all cursor-pointer ${
                    title.includes('Waiver')
                      ? 'bg-purple-50 border-purple-300 text-purple-900 shadow-2xs font-bold'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-1 text-purple-600">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-extrabold uppercase">Waiver</span>
                  </div>
                  <span className="text-[11px] font-medium leading-tight">Waiver Advisory</span>
                </button>

                <button
                  type="button"
                  onClick={() => applyTemplate('CUSTOM')}
                  className={`p-2.5 rounded-xl border text-left flex flex-col justify-between gap-1 transition-all cursor-pointer ${
                    category === 'GENERAL'
                      ? 'bg-blue-50 border-blue-300 text-blue-900 shadow-2xs font-bold'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-1 text-blue-600">
                    <BookOpen className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-extrabold uppercase">Notice</span>
                  </div>
                  <span className="text-[11px] font-medium leading-tight">Accounts Notice</span>
                </button>
              </div>
            ) : mode === 'BORROW_HISTORY' ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => applyTemplate('DUE_SOON')}
                  className={`p-2.5 rounded-xl border text-left flex flex-col justify-between gap-1 transition-all cursor-pointer ${
                    title.includes('Reminder:') && !title.includes('FINAL')
                      ? 'bg-blue-50 border-blue-300 text-blue-900 shadow-2xs font-bold'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-1 text-blue-600">
                    <Clock className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-extrabold uppercase">Due Soon</span>
                  </div>
                  <span className="text-[11px] font-medium leading-tight">Due Date Reminder</span>
                </button>

                <button
                  type="button"
                  onClick={() => applyTemplate('LAST_DAY')}
                  className={`p-2.5 rounded-xl border text-left flex flex-col justify-between gap-1 transition-all cursor-pointer ${
                    title.includes('FINAL REMINDER')
                      ? 'bg-amber-50 border-amber-300 text-amber-900 shadow-2xs font-bold'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-1 text-amber-600">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-extrabold uppercase">Last Day</span>
                  </div>
                  <span className="text-[11px] font-medium leading-tight">Return Today Notice</span>
                </button>

                <button
                  type="button"
                  onClick={() => applyTemplate('OVERDUE')}
                  className={`p-2.5 rounded-xl border text-left flex flex-col justify-between gap-1 transition-all cursor-pointer ${
                    category === 'OVERDUE_WARNING'
                      ? 'bg-rose-50 border-rose-300 text-rose-900 shadow-2xs font-bold'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-1 text-rose-600">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-extrabold uppercase">Overdue</span>
                  </div>
                  <span className="text-[11px] font-medium leading-tight">Late Return Warning</span>
                </button>

                <button
                  type="button"
                  onClick={() => applyTemplate('RENEW_RETURN')}
                  className={`p-2.5 rounded-xl border text-left flex flex-col justify-between gap-1 transition-all cursor-pointer ${
                    title.includes('Borrowing Advisory')
                      ? 'bg-purple-50 border-purple-300 text-purple-900 shadow-2xs font-bold'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-1 text-purple-600">
                    <BookOpen className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-extrabold uppercase">Advisory</span>
                  </div>
                  <span className="text-[11px] font-medium leading-tight">Renew or Return</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => applyTemplate('DUE_SOON')}
                  className={`p-2.5 rounded-xl border text-left flex flex-col justify-between gap-1 transition-all cursor-pointer ${
                    category === 'DUE_REMINDER'
                      ? 'bg-blue-50 border-blue-300 text-blue-900 shadow-2xs font-bold'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-1 text-blue-600">
                    <Clock className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-extrabold uppercase">Due Soon</span>
                  </div>
                  <span className="text-[11px] font-medium leading-tight">Return Reminder</span>
                </button>

                <button
                  type="button"
                  onClick={() => applyTemplate('OVERDUE')}
                  className={`p-2.5 rounded-xl border text-left flex flex-col justify-between gap-1 transition-all cursor-pointer ${
                    category === 'OVERDUE_WARNING'
                      ? 'bg-rose-50 border-rose-300 text-rose-900 shadow-2xs font-bold'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-1 text-rose-600">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-extrabold uppercase">Overdue</span>
                  </div>
                  <span className="text-[11px] font-medium leading-tight">Late Warning</span>
                </button>

                <button
                  type="button"
                  onClick={() => applyTemplate('FINE_DUE')}
                  className={`p-2.5 rounded-xl border text-left flex flex-col justify-between gap-1 transition-all cursor-pointer ${
                    category === 'FINE_PAYMENT'
                      ? 'bg-amber-50 border-amber-300 text-amber-900 shadow-2xs font-bold'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-1 text-amber-600">
                    <IndianRupee className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-extrabold uppercase">Fine Due</span>
                  </div>
                  <span className="text-[11px] font-medium leading-tight">Dues Settlement</span>
                </button>

                <button
                  type="button"
                  onClick={() => applyTemplate('CUSTOM')}
                  className={`p-2.5 rounded-xl border text-left flex flex-col justify-between gap-1 transition-all cursor-pointer ${
                    category === 'GENERAL'
                      ? 'bg-purple-50 border-purple-300 text-purple-900 shadow-2xs font-bold'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-1 text-purple-600">
                    <BookOpen className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-extrabold uppercase">Notice</span>
                  </div>
                  <span className="text-[11px] font-medium leading-tight">General Circular</span>
                </button>
              </div>
            )}
          </div>

          {/* Title */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
              Notification Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter notification headline..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white font-bold text-slate-900 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          {/* Content Body */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
              Message Content / Advisory Details *
            </label>
            <textarea
              required
              rows={5}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write the full advisory text or reminder instructions..."
              className="w-full p-3.5 rounded-xl border border-slate-200 bg-white font-medium text-slate-800 text-xs leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          {/* Urgency & Sender */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center pt-1 border-t border-slate-100">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isUrgent}
                onChange={(e) => setIsUrgent(e.target.checked)}
                className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 border-slate-300 cursor-pointer"
              />
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                Mark as High Priority Alert <span className="text-rose-600 font-extrabold">(Urgent)</span>
              </span>
            </label>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-0.5">Dispatched By</label>
              <input
                type="text"
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 font-semibold text-slate-700 text-xs"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSending || !title.trim() || !content.trim()}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-blue-500/20 cursor-pointer transition-all active:scale-95 disabled:opacity-50"
            >
              {isSending ? (
                <span>Dispatching...</span>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Send Notification Now</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
