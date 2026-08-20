import React, { useState, useMemo } from 'react';
import {
  Award,
  CheckCircle,
  XCircle,
  Printer,
  X,
  Sparkles,
  ShieldCheck,
  Building2,
  Calendar,
  AlertTriangle,
  QrCode,
  Download,
  BookOpen,
  IndianRupee,
  User,
  CheckCircle2,
  RotateCcw,
  RefreshCw,
  History,
  FileText,
  Clock,
  ThumbsUp,
  ThumbsDown,
} from 'lucide-react';
import { libraryStore, getLocalDateStr, formatOnlyTimeInBracket } from '../../services/libraryStore.service';
import { MemberProfile, NoDueCertificate, NoDueApplication } from '../../types/library';
import { generateQrSvgString, svgToDataUrl } from '../../utils/barcodeQrGenerator';

interface NoDueCertificateModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: MemberProfile | null;
  application?: NoDueApplication | null;
  isAdminView?: boolean;
}

export default function NoDueCertificateModal({
  isOpen,
  onClose,
  member,
  application,
  isAdminView = true,
}: NoDueCertificateModalProps) {
  const [storeState, setStoreState] = useState(libraryStore.snapshot);
  const [activeTab, setActiveTab] = useState<'CERTIFICATE' | 'AUDIT' | 'TIMELINE'>('CERTIFICATE');
  const [remarksInput, setRemarksInput] = useState(
    'Cleared all library book loans, physical materials, and financial dues.'
  );
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [customSignerName, setCustomSignerName] = useState('Dr. M. S. Ramanujan');
  const [customSignerRole, setCustomSignerRole] = useState('Chief Admin Librarian & Head of Library');
  const [toastMsg, setToastMsg] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  React.useEffect(() => {
    const sub = libraryStore.getObservable().subscribe(setStoreState);
    return () => sub.unsubscribe();
  }, []);

  const audit = useMemo(() => {
    if (!member) return null;
    return libraryStore.getMemberNoDueAudit(member.id);
  }, [member, storeState]);

  // Find corresponding application if not explicitly passed
  const activeApp = useMemo(() => {
    if (application) return application;
    if (!member) return undefined;
    return (storeState.noDueApplications || []).find(
      (a) => a.studentId === member.id || a.libraryMembershipId.toLowerCase() === member.memberCardNo.toLowerCase()
    );
  }, [application, member, storeState.noDueApplications]);

  if (!isOpen || !member || !audit) return null;

  const certificate: NoDueCertificate | undefined = audit.existingCertificate;
  const isCleared = audit.isEligible;
  const isIssued = Boolean(certificate && certificate.status === 'ISSUED');

  const triggerToast = (type: 'success' | 'error', message: string) => {
    setToastMsg({ type, message });
    setTimeout(() => setToastMsg(null), 4000);
  };

  const handleApproveApplication = () => {
    if (activeApp) {
      const res = libraryStore.approveNoDueApplication(
        activeApp.id,
        remarksInput,
        `${customSignerName} (${customSignerRole})`
      );
      if (res.success) {
        triggerToast('success', res.message);
      } else {
        triggerToast('error', res.message);
      }
    } else {
      const res = libraryStore.issueNoDueCertificate(
        member.id,
        `${customSignerName} (${customSignerRole})`,
        remarksInput
      );
      if (res.success) {
        triggerToast('success', res.message);
      } else {
        triggerToast('error', res.message);
      }
    }
  };

  const handleRejectApplication = () => {
    if (!rejectionReason.trim()) {
      triggerToast('error', 'Please provide a valid rejection reason.');
      return;
    }
    if (activeApp) {
      const res = libraryStore.rejectNoDueApplication(activeApp.id, rejectionReason, `${customSignerName} (${customSignerRole})`);
      if (res.success) {
        triggerToast('success', res.message);
        setShowRejectForm(false);
      } else {
        triggerToast('error', res.message);
      }
    }
  };

  const handleReverify = () => {
    const res = libraryStore.reverifyStudentClearance(member.id);
    if (res.audit.isEligible) {
      triggerToast('success', 'Re-verification complete: Student is eligible for clearance with 0 dues!');
    } else {
      triggerToast('error', `Re-verification: ${res.audit.reasons.join(' ')}`);
    }
  };

  const handlePrintCertificate = () => {
    if (!certificate) return;

    const printWindow = window.open('', '_blank', 'width=950,height=850');
    if (!printWindow) return;

    const qrSvg = generateQrSvgString(
      `VERIFIED_LIBRARY_NDC:${certificate.certificateNo}:${member.memberCardNo}:${member.name}:${certificate.issuedDate}`,
      90
    );
    const qrDataUrl = svgToDataUrl(qrSvg);

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Library No Due Certificate - ${member.name} (${certificate.certificateNo})</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700;800&family=Poppins:wght@400;500;600;700&display=swap');
            @page {
              size: A4 portrait;
              margin: 10mm;
            }
            body {
              font-family: 'Poppins', sans-serif;
              color: #0f172a;
              margin: 0;
              padding: 16px;
              background: #fff;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .cert-outer {
              border: 5px double #1e3a8a;
              padding: 20px;
              border-radius: 14px;
              position: relative;
              background: radial-gradient(circle at center, #ffffff 0%, #f8fafc 100%);
            }
            .cert-inner {
              border: 1.5px solid #cbd5e1;
              padding: 28px 24px;
              border-radius: 10px;
              position: relative;
              text-align: center;
            }
            .univ-emblem {
              width: 58px;
              height: 58px;
              margin: 0 auto 8px;
              display: block;
            }
            .univ-name {
              font-family: 'Cinzel', serif;
              font-size: 22px;
              font-weight: 800;
              color: #1e3a8a;
              letter-spacing: 1.5px;
              margin: 0 0 4px 0;
              text-transform: uppercase;
            }
            .dept-name {
              font-size: 11px;
              font-weight: 700;
              color: #475569;
              letter-spacing: 1.5px;
              text-transform: uppercase;
              margin: 0 0 14px 0;
            }
            .cert-badge {
              display: inline-block;
              background: #1e40af;
              color: #ffffff;
              font-size: 14px;
              font-weight: 700;
              letter-spacing: 2px;
              padding: 5px 22px;
              border-radius: 50px;
              text-transform: uppercase;
              margin-bottom: 14px;
              box-shadow: 0 4px 6px -1px rgba(30, 64, 175, 0.2);
            }
            .cert-meta {
              display: flex;
              justify-content: space-between;
              font-size: 11px;
              font-weight: 600;
              color: #64748b;
              border-bottom: 1px dashed #cbd5e1;
              padding-bottom: 10px;
              margin-bottom: 18px;
            }
            .student-details-table {
              width: 94%;
              margin: 0 auto 20px auto;
              border-collapse: collapse;
              text-align: left;
              font-size: 11.5px;
              background: #f8fafc;
              border-radius: 8px;
              overflow: hidden;
              border: 1px solid #e2e8f0;
            }
            .student-details-table td {
              padding: 7px 12px;
              border-bottom: 1px solid #e2e8f0;
            }
            .student-details-table td:first-child {
              font-weight: 700;
              color: #475569;
              width: 32%;
              background: #f1f5f9;
            }
            .student-details-table td:last-child {
              font-weight: 600;
              color: #0f172a;
            }
            .cert-declaration {
              font-size: 12.5px;
              line-height: 1.8;
              color: #334155;
              text-align: justify;
              margin: 0 auto 20px auto;
              max-width: 94%;
            }
            .audit-box {
              display: flex;
              justify-content: space-around;
              width: 94%;
              margin: 0 auto 24px auto;
              padding: 10px;
              background: #ecfdf5;
              border: 1px solid #a7f3d0;
              border-radius: 10px;
              text-align: center;
            }
            .audit-item {
              flex: 1;
            }
            .audit-item-label {
              font-size: 9.5px;
              font-weight: 700;
              color: #065f46;
              text-transform: uppercase;
              margin-bottom: 2px;
            }
            .audit-item-val {
              font-size: 12px;
              font-weight: 800;
              color: #047857;
            }
            .footer-signatures {
              display: flex;
              justify-content: space-between;
              align-items: flex-end;
              margin-top: 28px;
              padding: 0 12px;
            }
            .seal-box {
              text-align: center;
            }
            .seal-circle {
              width: 76px;
              height: 76px;
              border: 2px solid #b45309;
              border-radius: 50%;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              margin: 0 auto 4px;
              color: #b45309;
              font-size: 8.5px;
              font-weight: 800;
              letter-spacing: 0.5px;
              background: #fffbeb;
            }
            .sign-box {
              text-align: right;
              min-width: 230px;
            }
            .sign-line {
              border-top: 1.5px solid #0f172a;
              padding-top: 5px;
              font-size: 11.5px;
              font-weight: 700;
              color: #0f172a;
            }
            .sign-desig {
              font-size: 10.5px;
              color: #475569;
              font-weight: 600;
            }
            .watermark {
              position: absolute;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%) rotate(-30deg);
              font-size: 55px;
              font-weight: 900;
              color: rgba(30, 58, 138, 0.04);
              letter-spacing: 8px;
              pointer-events: none;
              text-transform: uppercase;
              white-space: nowrap;
            }
          </style>
        </head>
        <body>
          <div class="cert-outer">
            <div class="cert-inner">
              <div class="watermark">OFFICIAL LIBRARY CLEARANCE • NO DUES</div>

              <!-- University Emblem -->
              <svg class="univ-emblem" viewBox="0 0 24 24" fill="none" stroke="#1e3a8a" stroke-width="1.75">
                <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/>
                <path d="M6 6h10"/>
                <path d="M6 10h10"/>
                <path d="M6 14h6"/>
              </svg>

              <h1 class="univ-name">University Central Library</h1>
              <p class="dept-name">Department of Library & Information Services • University Clearance Division</p>

              <div class="cert-badge">NO DUE CERTIFICATE (LIBRARY CLEARANCE)</div>

              <div class="cert-meta">
                <span>Certificate Ref No: <strong style="color: #1e3a8a;">${certificate.certificateNo}</strong></span>
                <span>Issue Date: <strong style="color: #1e3a8a;">${certificate.issuedDate}</strong></span>
              </div>

              <table class="student-details-table">
                <tr>
                  <td>Student Candidate:</td>
                  <td><strong>${certificate.memberName}</strong></td>
                </tr>
                <tr>
                  <td>Roll / Registration No:</td>
                  <td>${certificate.rollNo || member.rollNo || '22CS104'}</td>
                </tr>
                <tr>
                  <td>Library Membership ID:</td>
                  <td><code>${certificate.memberCardNo}</code></td>
                </tr>
                <tr>
                  <td>Academic Department:</td>
                  <td>${certificate.department || member.department || 'Computer Science & Engineering'}</td>
                </tr>
                <tr>
                  <td>Degree Program & Batch:</td>
                  <td>${certificate.program || 'B.Tech - Computer Science & Engineering'} (Batch: ${certificate.academicBatch || member.academicBatch || '2022 - 2026'})</td>
                </tr>
                <tr>
                  <td>Student Admission Date:</td>
                  <td>${member.registeredDate || '2022-08-01'}</td>
                </tr>
                <tr>
                  <td>Application Date:</td>
                  <td>${activeApp?.applicationDate || member.registeredDate || certificate.issuedDate}</td>
                </tr>
                <tr>
                  <td>Clearance Purpose:</td>
                  <td>${certificate.purpose || (activeApp?.purpose ? activeApp.purpose.replace(/_/g, ' ') : 'Course Completion & Graduation Clearance')}</td>
                </tr>
              </table>

              <p class="cert-declaration">
                This is to officially certify that <strong>${certificate.memberName}</strong>, bearing Roll No. <strong>${certificate.rollNo || member.rollNo || member.memberCardNo}</strong>, has surrendered all borrowed books, reference volumes, research documents, and digital devices to the University Central Library. As verified in the Central Library Catalog Database, there are <strong>NIL (0) active loan liabilities</strong> and <strong>NIL (₹0.00) overdue fines or damage penalties</strong> pending against the candidate. Clearance is hereby granted.
              </p>

              <div class="audit-box">
                <div class="audit-item">
                  <div class="audit-item-label">Books Borrowed</div>
                  <div class="audit-item-val">0 (ALL RETURNED)</div>
                </div>
                <div class="audit-item">
                  <div class="audit-item-label">Outstanding Fines</div>
                  <div class="audit-item-val">₹0.00 (NIL / PAID)</div>
                </div>
                <div class="audit-item">
                  <div class="audit-item-label">Clearance Verification</div>
                  <div class="audit-item-val">APPROVED & VALID</div>
                </div>
              </div>

              <!-- Signatures & Security QR -->
              <div class="footer-signatures">
                <div>
                  <img src="${qrDataUrl}" alt="Verification QR" style="width: 72px; height: 72px; border: 1px solid #cbd5e1; padding: 2px; border-radius: 6px; background: #fff;" />
                  <div style="font-size: 8px; color: #64748b; margin-top: 2px; font-weight: 600;">Scan to Verify Online</div>
                </div>

                <div class="seal-box">
                  <div class="seal-circle">
                    <span>★ VERIFIED ★</span>
                    <span style="font-size: 7px; margin-top: 2px;">LIBRARY SEAL</span>
                    <span>CENTRAL</span>
                  </div>
                  <div style="font-size: 8.5px; color: #b45309; font-weight: 700;">Official University Stamp</div>
                </div>

                <div class="sign-box">
                  <div style="height: 30px; font-family: 'Cinzel', serif; font-size: 13px; font-style: italic; color: #1e3a8a; font-weight: bold; margin-bottom: 2px;">
                    ${certificate.issuedBy.split('(')[0].trim()}
                  </div>
                  <div class="sign-line">${certificate.issuedBy}</div>
                  <div class="sign-desig">${certificate.issuedByRole || 'Chief Admin Librarian & Head of Library'}</div>
                </div>
              </div>
            </div>
          </div>
          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[92vh] flex flex-col border border-slate-100 relative overflow-hidden">
        {/* Modal Top Header */}
        <div className="p-5 border-b border-slate-100 bg-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-700 flex items-center justify-center font-bold shrink-0">
              <Award className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 font-poppins">
                  Library No Due Clearance Certificate
                </h2>
                {activeApp && (
                  <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-mono text-[10px] font-bold">
                    {activeApp.applicationNo}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">
                Official institutional clearance issuance & verification for graduating students.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            title="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Tabs Bar */}
        <div className="px-6 pt-3 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('CERTIFICATE')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'CERTIFICATE'
                ? 'border-purple-600 text-purple-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Award className="h-3.5 w-3.5" /> No Due Certificate
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('AUDIT')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'AUDIT'
                ? 'border-purple-600 text-purple-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <BookOpen className="h-3.5 w-3.5" /> Books & Dues ({audit.activeLoansCount} {audit.activeLoansCount === 1 ? 'Book' : 'Books'} • ₹{audit.pendingFinesAmount})
          </button>
          {activeApp && (
            <button
              type="button"
              onClick={() => setActiveTab('TIMELINE')}
              className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'TIMELINE'
                  ? 'border-purple-600 text-purple-700'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <History className="h-3.5 w-3.5" /> Timeline ({activeApp.history.length})
            </button>
          )}
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1 custom-scrollbar">
          {toastMsg && (
            <div
              className={`p-3.5 rounded-2xl text-xs font-bold flex items-center gap-2 animate-fade-in ${
                toastMsg.type === 'success'
                  ? 'bg-emerald-50 border border-emerald-200 text-emerald-900'
                  : 'bg-rose-50 border border-rose-200 text-rose-900'
              }`}
            >
              {toastMsg.type === 'success' ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
              )}
              <span>{toastMsg.message}</span>
            </div>
          )}

          {/* Student Overview Card */}
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-4 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-md">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-white font-bold text-lg shrink-0">
                {member.name.charAt(0)}
              </div>
              <div>
                <h3 className="text-base font-bold font-poppins">{member.name}</h3>
                <p className="text-xs text-indigo-200 font-medium">
                  Roll No: <span className="font-mono">{member.rollNo || '22CS104'}</span> • Card: <span className="font-mono">{member.memberCardNo}</span>
                </p>
                <p className="text-[11px] text-slate-300">
                  {member.department || 'Computer Science & Engineering'} • Batch: {member.academicBatch || '2022 - 2026'}
                </p>
              </div>
            </div>

            <div className="text-right shrink-0 flex flex-col items-end gap-1">
              {isIssued ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 text-xs font-bold">
                  <ShieldCheck className="h-3.5 w-3.5" /> Certificate Issued
                </span>
              ) : isCleared ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/40 text-xs font-bold">
                  <CheckCircle className="h-3.5 w-3.5" /> Clearance Eligible
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-400/40 text-xs font-bold">
                  <AlertTriangle className="h-3.5 w-3.5" /> Dues Pending
                </span>
              )}

              <button
                type="button"
                onClick={handleReverify}
                className="text-[10px] text-indigo-200 hover:text-white flex items-center gap-1 mt-1 underline cursor-pointer"
                title="Re-verify against live transactions"
              >
                <RefreshCw className="h-3 w-3" /> Re-Verify Live Status
              </button>
            </div>
          </div>

          {/* TAB 1: CERTIFICATE & ISSUANCE */}
          {activeTab === 'CERTIFICATE' && (
            <div className="space-y-4">
              {/* Application Details Strip if available */}
              {activeApp && (
                <div className="p-3.5 rounded-2xl bg-indigo-50/70 border border-indigo-100 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Clearance Purpose</span>
                    <p className="font-bold text-indigo-900 mt-0.5">{activeApp.purpose.replace(/_/g, ' ')}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Application Date</span>
                    <p className="font-semibold text-slate-800 mt-0.5">{activeApp.applicationDate}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Current Status</span>
                    <p className="font-extrabold text-indigo-700 mt-0.5">{activeApp.status.replace(/_/g, ' ')}</p>
                  </div>
                </div>
              )}

              {/* Certificate Active View */}
              {isIssued && certificate ? (
                <div className="bg-slate-50 p-5 rounded-3xl border-2 border-indigo-200/80 space-y-3 relative">
                  <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-100/70 px-2.5 py-0.5 rounded-full">
                        Official Clearance Certificate Active
                      </span>
                      <h4 className="text-sm font-bold text-slate-900 mt-1">Ref: {certificate.certificateNo}</h4>
                    </div>
                    <div className="text-right">
                      <span className="text-[11px] text-slate-500">Issued On:</span>
                      <p className="text-xs font-bold text-slate-800">{certificate.issuedDate}</p>
                    </div>
                  </div>

                  <div className="bg-white p-3.5 rounded-2xl border border-slate-200/70 text-xs space-y-1.5 text-slate-700">
                    <p className="font-semibold text-slate-900">
                      Signer Authority: <span className="text-indigo-800 font-bold">{certificate.issuedBy}</span>
                    </p>
                    <p className="text-slate-600 italic">"{certificate.remarks || 'Cleared all library borrowings and financial dues.'}"</p>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                    <button
                      type="button"
                      onClick={handlePrintCertificate}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-200 transition-all cursor-pointer"
                    >
                      <Printer className="h-4 w-4" /> Print / Download Official Certificate (A4)
                    </button>

                    <button
                      type="button"
                      onClick={handlePrintCertificate}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-indigo-200 bg-indigo-50 text-indigo-700 text-xs font-bold hover:bg-indigo-100 cursor-pointer"
                    >
                      <RotateCcw className="h-3.5 w-3.5" /> Reprint Certificate
                    </button>
                  </div>
                </div>
              ) : isCleared ? (
                /* Eligible - Ready for Admin Approval */
                <div className="bg-emerald-50/70 p-5 rounded-3xl border border-emerald-200 space-y-4">
                  <div className="flex items-center gap-2.5 text-emerald-950">
                    <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0" />
                    <div>
                      <h4 className="text-sm font-bold">Candidate Meets All Clearance Criteria!</h4>
                      <p className="text-xs text-emerald-800">
                        Zero active book loans and zero pending fines. The Head of Library can now approve and issue the official No Due Certificate.
                      </p>
                    </div>
                  </div>

                  {isAdminView ? (
                    activeApp ? (
                      <div className="space-y-3 bg-white p-4 rounded-2xl border border-emerald-200/80">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">Head of Library (Signer Name)</label>
                            <input
                              type="text"
                              value={customSignerName}
                              onChange={(e) => setCustomSignerName(e.target.value)}
                              className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">Designation</label>
                            <input
                              type="text"
                              value={customSignerRole}
                              onChange={(e) => setCustomSignerRole(e.target.value)}
                              className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">Approval & Clearance Remarks</label>
                          <input
                            type="text"
                            value={remarksInput}
                            onChange={(e) => setRemarksInput(e.target.value)}
                            placeholder="e.g. Cleared all library book loans and financial dues upon college course completion."
                            className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                          />
                        </div>

                        <div className="pt-1 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={handleApproveApplication}
                            className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-md shadow-emerald-200 transition-all cursor-pointer"
                          >
                            <Sparkles className="h-4 w-4" /> Approve & Generate Official No Due Certificate
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 bg-white rounded-2xl border border-amber-200 space-y-3">
                        <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
                          <Clock className="h-4 w-4 text-amber-600" />
                          <span>Student Has Not Requested No Due Clearance Yet</span>
                        </div>
                        <p className="text-xs text-slate-600">
                          The student is eligible (0 loans & ₹0 fines), but has not yet submitted an official request from the Student Workspace.
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            const res = libraryStore.submitNoDueApplication({
                              studentId: member.id,
                              studentName: member.name,
                              rollNo: member.rollNo || '22CS104',
                              department: member.department,
                              libraryMembershipId: member.memberCardNo,
                              email: member.email,
                              purpose: 'COURSE_COMPLETION',
                              purposeOtherDetails: 'Requested via Admin Clearance Desk on student behalf.',
                            });
                            if (res.success) {
                              triggerToast('success', 'No Due request created for student. You can now approve and issue.');
                            }
                          }}
                          className="w-full py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                        >
                          <Sparkles className="h-3.5 w-3.5" /> Create Request & Proceed with Issuance
                        </button>
                      </div>
                    )
                  ) : (
                    <div className="p-3 bg-white rounded-xl border border-emerald-200 text-xs text-emerald-800">
                      Your clearance audit has passed (0 loans & 0 fines). Your application is awaiting final digital signature by the Head of the Library.
                    </div>
                  )}
                </div>
              ) : (
                /* Dues Pending */
                <div className="bg-rose-50/70 p-5 rounded-3xl border border-rose-200 space-y-3">
                  <div className="flex items-center gap-2 text-rose-900 font-bold text-sm">
                    <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0" />
                    <span>Cannot Generate No Due Certificate (Outstanding Liabilities)</span>
                  </div>
                  <ul className="text-xs text-rose-800 space-y-1 list-disc pl-5">
                    {audit.reasons.map((r, idx) => (
                      <li key={idx}>{r}</li>
                    ))}
                  </ul>
                  <p className="text-[11px] text-slate-600">
                    The student must return all borrowed library volumes and clear any pending fines. Once cleared, click <strong>Re-Verify Live Status</strong> to unlock certificate issuance.
                  </p>

                  {isAdminView && activeApp && (
                    <div className="pt-2">
                      {!showRejectForm ? (
                        <button
                          type="button"
                          onClick={() => setShowRejectForm(true)}
                          className="text-xs font-bold text-rose-700 hover:text-rose-900 underline cursor-pointer"
                        >
                          Reject Application with Remarks
                        </button>
                      ) : (
                        <div className="p-3 bg-white rounded-xl border border-rose-200 space-y-2">
                          <label className="block text-xs font-bold text-slate-700">Rejection Reason</label>
                          <input
                            type="text"
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            placeholder="e.g. 2 books overdue; please return before clearance approval."
                            className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-800"
                          />
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setShowRejectForm(false)}
                              className="px-3 py-1 rounded-lg text-xs font-semibold text-slate-600"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={handleRejectApplication}
                              className="px-3 py-1 rounded-lg bg-rose-600 text-white text-xs font-bold"
                            >
                              Confirm Rejection
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: LIVE DUES AUDIT */}
          {activeTab === 'AUDIT' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className={`p-4 rounded-2xl border ${audit.activeLoansCount === 0 ? 'bg-emerald-50/60 border-emerald-200' : 'bg-rose-50/60 border-rose-200'}`}>
                  <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <BookOpen className="h-4 w-4 text-indigo-600" /> Active Books Borrowed
                  </span>
                  <p className={`text-lg font-extrabold mt-1 ${audit.activeLoansCount === 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {audit.activeLoansCount === 0 ? '0 (ALL RETURNED)' : `${audit.activeLoansCount} Books Outstanding`}
                  </p>
                </div>

                <div className={`p-4 rounded-2xl border ${audit.pendingFinesAmount === 0 ? 'bg-emerald-50/60 border-emerald-200' : 'bg-rose-50/60 border-rose-200'}`}>
                  <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <IndianRupee className="h-4 w-4 text-amber-600" /> Overdue Fine Liabilities
                  </span>
                  <p className={`text-lg font-extrabold mt-1 ${audit.pendingFinesAmount === 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                    ₹{audit.pendingFinesAmount.toFixed(2)} {audit.pendingFinesAmount === 0 ? '(NIL)' : '(UNPAID)'}
                  </p>
                </div>
              </div>

              {/* Active Loans List */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                  Active Loans Breakdown ({audit.activeLoans.length})
                </h4>
                {audit.activeLoans.length > 0 ? (
                  <div className="space-y-2">
                    {audit.activeLoans.map((tx) => (
                      <div key={tx.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs flex justify-between items-center">
                        <div>
                          <p className="font-bold text-slate-900">{tx.bookTitle}</p>
                          <p className="text-[11px] text-slate-500 font-mono">
                            Acc: {tx.accessionNo} • Issued: {tx.issueDate} • Due: <span className="text-rose-600 font-bold">{tx.dueDate}</span>
                          </p>
                        </div>
                        <span className="px-2 py-1 rounded-md bg-rose-100 text-rose-800 text-[10px] font-bold">
                          {tx.status}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 text-xs text-emerald-800 font-semibold">
                    ✓ No active book loans. All library copies surrendered.
                  </div>
                )}
              </div>

              {/* Fines Breakdown */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                  Unpaid Fines Breakdown ({audit.pendingFines.length})
                </h4>
                {audit.pendingFines.length > 0 ? (
                  <div className="space-y-2">
                    {audit.pendingFines.map((f) => (
                      <div key={f.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs flex justify-between items-center">
                        <div>
                          <p className="font-bold text-slate-900">{f.bookTitle || 'Library Overdue Penalty'}</p>
                          <p className="text-[11px] text-slate-500">Reason: {f.reason} • Created: {f.createdDate}</p>
                        </div>
                        <span className="font-mono font-bold text-rose-700 text-sm">
                          ₹{f.amount.toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 text-xs text-emerald-800 font-semibold">
                    ✓ No pending fine liabilities. Account is 100% financially clear.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: APPLICATION HISTORY TIMELINE */}
          {activeTab === 'TIMELINE' && activeApp && (
            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Application Audit Trail ({activeApp.applicationNo})
              </h4>
              <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                {activeApp.history.map((h, idx) => (
                  <div key={idx} className="relative">
                    <div className="absolute -left-6 top-0.5 w-4 h-4 rounded-full bg-indigo-600 border-2 border-white shadow-xs" />
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-slate-900">{h.status.replace(/_/g, ' ')}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{h.changedAt}</span>
                      </div>
                      <p className="text-[11px] text-slate-600">By: <strong className="text-slate-800">{h.changedBy}</strong></p>
                      {h.remarks && (
                        <p className="text-[11px] text-slate-700 italic bg-white p-2 rounded-lg border border-slate-100">
                          "{h.remarks}"
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Fixed Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/80 shrink-0 flex items-center justify-between">
          <span className="text-xs text-slate-500 font-medium">
            Clearance: <strong className={isIssued ? 'text-emerald-700' : isCleared ? 'text-blue-700' : 'text-rose-700'}>
              {isIssued ? 'CERTIFICATE ISSUED' : isCleared ? 'CLEARANCE ELIGIBLE' : 'DUES PENDING'}
            </strong>
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 transition-colors cursor-pointer"
            >
              Close
            </button>
            {isIssued && (
              <button
                type="button"
                onClick={handlePrintCertificate}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 shadow-md shadow-indigo-200 transition-all cursor-pointer"
              >
                <Printer className="h-3.5 w-3.5" /> Print Certificate (PDF)
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
