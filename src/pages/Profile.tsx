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
  Printer,
  Download,
  Copy,
  Check,
  RotateCw,
  QrCode,
  Barcode,
  BookOpen,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { libraryStore } from '../services/libraryStore.service';
import { MemberProfile } from '../types/library';
import { Link, useNavigate } from 'react-router-dom';
import {
  generateBarcodeSvgString,
  generateQrSvgString,
  svgToDataUrl,
  downloadBarcodeOrQrFile,
} from '../utils/barcodeQrGenerator';

export default function Profile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [state, setState] = useState(libraryStore.snapshot);
  const [isEditing, setIsEditing] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [copiedCard, setCopiedCard] = useState(false);
  const [cardSide, setCardSide] = useState<'front' | 'back'>('front');

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
    avatarUrl:
      currentMember?.avatarUrl ||
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80',
  });

  useEffect(() => {
    if (currentMember) {
      setFormData({
        name: user?.name || currentMember.name,
        email: user?.email || currentMember.email,
        phone: currentMember.phone || '+91 98765 43210',
        department: currentMember.department,
        avatarUrl:
          currentMember.avatarUrl ||
          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80',
      });
    }
  }, [currentMember, user]);

  const cardNo = currentMember?.memberCardNo || 'LIB-2026-001';
  const qrSvgString = generateQrSvgString(cardNo, 120);
  const barcodeSvgString = generateBarcodeSvgString(cardNo, { height: 45 });
  const qrDataUrl = svgToDataUrl(qrSvgString);
  const barcodeDataUrl = svgToDataUrl(barcodeSvgString);

  const handleCopyCardNumber = () => {
    navigator.clipboard.writeText(cardNo);
    setCopiedCard(true);
    setToastMessage(`Library Card Number (${cardNo}) copied to clipboard!`);
    setTimeout(() => setCopiedCard(false), 2000);
    setTimeout(() => setToastMessage(null), 4000);
  };

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

  const handlePrintLibraryCard = () => {
    const printWindow = window.open('', '_blank', 'width=800,height=650');
    if (!printWindow) return;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Print Digital Library Card - ${formData.name}</title>
          <style>
            @page { size: A4; margin: 15mm; }
            body { font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8fafc; margin: 0; padding: 20px; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 85vh; }
            .card-container {
              width: 480px;
              background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%);
              border-radius: 20px;
              padding: 24px;
              color: #ffffff;
              box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3);
              border: 2px solid rgba(255, 255, 255, 0.2);
              box-sizing: border-box;
            }
            .card-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1.5px solid rgba(255,255,255,0.15); padding-bottom: 12px; margin-bottom: 16px; }
            .univ-title { font-size: 13px; font-weight: 800; letter-spacing: 1px; color: #60a5fa; text-transform: uppercase; }
            .card-title { font-size: 10px; font-weight: 700; background: rgba(255,255,255,0.15); padding: 3px 10px; border-radius: 12px; text-transform: uppercase; color: #f59e0b; }
            .card-body { display: flex; gap: 16px; align-items: center; }
            .avatar { width: 95px; height: 95px; border-radius: 18px; object-fit: cover; border: 3px solid rgba(255,255,255,0.3); }
            .info { flex: 1; }
            .name { font-size: 20px; font-weight: 800; margin: 0 0 4px 0; color: #ffffff; }
            .role { display: inline-block; font-size: 10px; font-weight: 800; background: #3b82f6; color: #ffffff; padding: 2px 10px; border-radius: 6px; text-transform: uppercase; margin-bottom: 8px; }
            .detail-line { font-size: 12px; margin: 4px 0; color: #cbd5e1; }
            .detail-line strong { color: #ffffff; }
            .card-footer { margin-top: 18px; padding: 12px; background: #ffffff; border-radius: 14px; display: flex; justify-content: space-between; align-items: center; gap: 10px; }
            .barcode-box { flex: 1; display: flex; justify-content: center; }
            .barcode-box svg { max-width: 100%; height: auto; }
            .qr-box { width: 75px; height: 75px; display: flex; justify-content: center; align-items: center; }
            .qr-box svg { width: 75px; height: 75px; }
            .notice { margin-top: 20px; font-size: 11px; color: #64748b; text-align: center; }
          </style>
        </head>
        <body>
          <div class="card-container">
            <div class="card-header">
              <div class="univ-title">🎓 UNIVERSITY CENTRAL LIBRARY</div>
              <div class="card-title">DIGITAL MEMBER ID PASS</div>
            </div>
            <div class="card-body">
              <img src="${formData.avatarUrl}" class="avatar" alt="${formData.name}" />
              <div class="info">
                <h2 class="name">${formData.name}</h2>
                <span class="role">${user?.role || 'MEMBER'}</span>
                <div class="detail-line">Card No: <strong style="font-family: monospace; color: #f59e0b;">${cardNo}</strong></div>
                <div class="detail-line">Department: <strong>${formData.department}</strong></div>
                <div class="detail-line">Valid Thru: <strong>DEC 2028</strong></div>
              </div>
            </div>
            <div class="card-footer">
              <div class="barcode-box">${barcodeSvgString}</div>
              <div class="qr-box">${qrSvgString}</div>
            </div>
          </div>
          <div class="notice">Official Digital Library Pass • University Library Management System</div>
          <script>
            window.onload = function() {
              setTimeout(function() { window.print(); }, 400);
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  };

  const handleDownloadQr = () => {
    downloadBarcodeOrQrFile(qrSvgString, `Library_QR_${cardNo}`, 'png');
    setToastMessage(`Downloaded QR Code image for card ${cardNo}`);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleDownloadBarcode = () => {
    downloadBarcodeOrQrFile(barcodeSvgString, `Library_Barcode_${cardNo}`, 'png');
    setToastMessage(`Downloaded Barcode image for card ${cardNo}`);
    setTimeout(() => setToastMessage(null), 4000);
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
              Member Card ID: <strong className="font-mono text-amber-300">{cardNo}</strong> | Status:{' '}
              <strong className="text-emerald-400 font-bold uppercase">● Active Member</strong>
            </p>
          </div>
        </div>

        <div className="relative z-10 hidden sm:flex items-center gap-3">
          <button
            onClick={handlePrintLibraryCard}
            className="px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-bold text-white backdrop-blur-md transition-all flex items-center gap-2 shadow-sm cursor-pointer"
          >
            <Printer className="w-4 h-4 text-amber-300" /> Print Digital ID Card
          </button>
        </div>
      </div>

      {toastMessage && (
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-semibold shadow-xs animate-fadeIn">
          <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* SECTION 1: Digital Library Membership Card Display */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-extrabold text-blue-600 bg-blue-50 px-3 py-1 rounded-full uppercase tracking-wider mb-1">
              <CreditCard className="w-3.5 h-3.5" /> Official Member Identification
            </div>
            <h2 className="text-xl font-bold font-poppins text-slate-900">Digital Library Membership Card</h2>
            <p className="text-xs text-slate-500">Official digital smart pass for library entry, checkout counters, and turnstile verification.</p>
          </div>

          {/* Action Control Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setCardSide(cardSide === 'front' ? 'back' : 'front')}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCw className="w-3.5 h-3.5 text-blue-600" /> Flip to {cardSide === 'front' ? 'Back (Barcode)' : 'Front (Photo & QR)'}
            </button>

            <button
              onClick={handlePrintLibraryCard}
              className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" /> Print Card
            </button>

            <button
              onClick={handleDownloadQr}
              className="px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" /> QR Code
            </button>

            <button
              onClick={handleDownloadBarcode}
              className="px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-blue-600" /> Barcode
            </button>
          </div>
        </div>

        {/* Centered Digital Library Card Layout */}
        <div className="flex flex-col items-center justify-center py-6 space-y-6">
          {/* Card Element */}
          <div className="w-full max-w-lg aspect-[1.6/1] rounded-3xl p-6 sm:p-7 bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 text-white shadow-2xl border-2 border-white/20 relative overflow-hidden flex flex-col justify-between transition-all duration-300 hover:shadow-indigo-500/10">
            {/* Ambient Lighting FX */}
            <div className="absolute -top-12 -right-12 w-56 h-56 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-12 -left-12 w-56 h-56 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />

            {cardSide === 'front' ? (
              /* CARD FRONT */
              <>
                {/* Header */}
                <div className="relative z-10 flex items-center justify-between border-b border-white/10 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-400 to-amber-200 flex items-center justify-center shadow-md">
                      <BookOpen className="w-5 h-5 text-slate-950 font-extrabold" />
                    </div>
                    <div>
                      <h3 className="text-xs sm:text-sm font-extrabold tracking-wider text-blue-300 uppercase font-poppins">UNIVERSITY CENTRAL LIBRARY</h3>
                      <p className="text-[10px] sm:text-xs text-slate-400 font-medium">Digital Library Member Pass</p>
                    </div>
                  </div>

                  <span className="px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-[10px] sm:text-xs font-extrabold text-emerald-300 uppercase tracking-widest">
                    ACTIVE MEMBER
                  </span>
                </div>

                {/* Body Content */}
                <div className="relative z-10 flex items-center gap-5 py-3">
                  <img
                    src={formData.avatarUrl}
                    alt={formData.name}
                    className="w-22 h-22 sm:w-24 sm:h-24 rounded-2xl object-cover border-2 border-amber-400/60 shadow-xl shrink-0"
                  />

                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="inline-block px-2.5 py-0.5 rounded-md bg-blue-500/30 border border-blue-400/20 text-[10px] font-extrabold text-blue-200 uppercase tracking-wide">
                      {user?.role || 'MEMBER'}
                    </div>
                    <h4 className="text-xl font-extrabold font-poppins truncate text-white tracking-tight">{formData.name}</h4>

                    <div className="flex items-center gap-2 text-sm text-amber-300 font-mono font-extrabold">
                      <span>{cardNo}</span>
                      <button
                        type="button"
                        onClick={handleCopyCardNumber}
                        className="p-1 hover:bg-white/10 rounded transition-all text-slate-300 hover:text-white cursor-pointer"
                        title="Copy Card Number"
                      >
                        {copiedCard ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>

                    <p className="text-xs text-slate-300 truncate">Dept: <strong>{formData.department}</strong></p>
                  </div>

                  {/* QR Code */}
                  <div className="bg-white p-2 rounded-2xl shadow-lg shrink-0">
                    <img src={qrDataUrl} alt="Member QR Code" className="w-18 h-18 sm:w-20 sm:h-20 object-contain" />
                  </div>
                </div>

                {/* Footer */}
                <div className="relative z-10 flex items-center justify-between border-t border-white/10 pt-2.5 text-[11px] text-slate-400">
                  <span>Issued: <strong className="text-slate-200 font-mono">{currentMember?.registeredDate || '2026-01-15'}</strong></span>
                  <span>Valid Thru: <strong className="text-slate-200 font-mono">DEC 2028</strong></span>
                  <span className="font-mono text-amber-300 font-bold">DIGITAL PASS</span>
                </div>
              </>
            ) : (
              /* CARD BACK */
              <>
                {/* Header */}
                <div className="relative z-10 flex items-center justify-between border-b border-white/10 pb-3">
                  <div className="flex items-center gap-2">
                    <Barcode className="w-5 h-5 text-amber-400" />
                    <span className="text-xs font-extrabold tracking-wider text-amber-300 uppercase font-poppins">BARCODE & SECURITY VERIFICATION</span>
                  </div>
                  <span className="text-xs font-mono font-bold text-slate-300">{cardNo}</span>
                </div>

                {/* Barcode Display */}
                <div className="relative z-10 my-auto bg-white p-4 rounded-2xl shadow-inner flex flex-col items-center justify-center">
                  <img src={barcodeDataUrl} alt="Member Barcode" className="max-h-20 object-contain" />
                </div>

                {/* Terms & Rules */}
                <div className="relative z-10 border-t border-white/10 pt-2.5 text-[10px] text-slate-400 leading-tight space-y-1">
                  <p>• Present this card for book issues, returns, turnstiles, and reading room access.</p>
                  <p>• Non-transferable pass. Max borrowing limit: <strong className="text-amber-300">{currentMember?.maxAllowedBooks} Books</strong>.</p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* SECTION 2: Main Profile Grid */}
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
              className="w-full py-3 rounded-2xl border border-rose-200 text-rose-600 font-bold text-xs hover:bg-rose-50 transition-all flex items-center justify-center gap-2 cursor-pointer"
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
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Edit className="w-4 h-4 text-blue-600" /> Edit Profile
              </button>
            ) : (
              <button
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs cursor-pointer"
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
                  className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold shadow-md hover:opacity-95 transition-all flex items-center gap-2 cursor-pointer"
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
