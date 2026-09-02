import React, { useState, useEffect, useRef } from 'react';
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
  Copy,
  Check,
  RotateCw,
  QrCode,
  Barcode,
  BookOpen,
  Hash,
  GraduationCap,
  MapPin,
  PhoneCall,
  FileCheck,
  BadgeCheck,
  Upload,
  Image as ImageIcon,
  Camera,
  Globe,
  Trash2,
  Calendar,
  Award,
  Clock,
  CheckCircle2,
  Briefcase,
  Shield,
  Layers,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { libraryStore, getMemberPendingFines } from '../services/libraryStore.service';
import { MemberProfile } from '../types/library';
import { Link, useNavigate } from 'react-router-dom';
import {
  generateBarcodeSvgString,
  generateQrSvgString,
  svgToDataUrl,
} from '../utils/barcodeQrGenerator';

export interface DegreeProgram {
  code: string;
  name: string;
  level: 'BACHELOR' | 'MASTER' | 'DOCTORAL' | 'DIPLOMA' | 'INTEGRATED';
  durationYears: number;
  category: string;
}

export const UNIVERSITY_PROGRAMS: DegreeProgram[] = [
  // Bachelor / Undergraduate Degrees
  { code: 'B.TECH', name: 'Bachelor of Technology (B.Tech)', level: 'BACHELOR', durationYears: 4, category: 'Engineering & Technology' },
  { code: 'B.E.', name: 'Bachelor of Engineering (B.E.)', level: 'BACHELOR', durationYears: 4, category: 'Engineering & Technology' },
  { code: 'B.SC', name: 'Bachelor of Science (B.Sc)', level: 'BACHELOR', durationYears: 3, category: 'Science' },
  { code: 'B.SC (HONS)', name: 'Bachelor of Science with Honours (B.Sc Hons)', level: 'BACHELOR', durationYears: 4, category: 'Science' },
  { code: 'B.C.A.', name: 'Bachelor of Computer Applications (BCA)', level: 'BACHELOR', durationYears: 3, category: 'Computer Science' },
  { code: 'B.B.A.', name: 'Bachelor of Business Administration (BBA)', level: 'BACHELOR', durationYears: 3, category: 'Management' },
  { code: 'B.COM', name: 'Bachelor of Commerce (B.Com)', level: 'BACHELOR', durationYears: 3, category: 'Commerce & Finance' },
  { code: 'B.COM (HONS)', name: 'Bachelor of Commerce with Honours (B.Com Hons)', level: 'BACHELOR', durationYears: 3, category: 'Commerce & Finance' },
  { code: 'B.A.', name: 'Bachelor of Arts (B.A.)', level: 'BACHELOR', durationYears: 3, category: 'Humanities & Social Sciences' },
  { code: 'B.ARCH', name: 'Bachelor of Architecture (B.Arch)', level: 'BACHELOR', durationYears: 5, category: 'Architecture & Planning' },
  { code: 'B.PHARM', name: 'Bachelor of Pharmacy (B.Pharm)', level: 'BACHELOR', durationYears: 4, category: 'Pharmacy & Medical' },
  { code: 'B.DES', name: 'Bachelor of Design (B.Des)', level: 'BACHELOR', durationYears: 4, category: 'Design & Arts' },
  { code: 'LL.B', name: 'Bachelor of Laws (LL.B)', level: 'BACHELOR', durationYears: 3, category: 'Law' },
  { code: 'B.A. LL.B', name: 'Integrated Bachelor of Arts & Bachelor of Laws (B.A. LL.B)', level: 'INTEGRATED', durationYears: 5, category: 'Law' },
  { code: 'B.B.A. LL.B', name: 'Integrated Bachelor of Business Administration & Bachelor of Laws (B.B.A. LL.B)', level: 'INTEGRATED', durationYears: 5, category: 'Law' },

  // Master / Postgraduate Degrees
  { code: 'M.TECH', name: 'Master of Technology (M.Tech)', level: 'MASTER', durationYears: 2, category: 'Engineering & Technology' },
  { code: 'M.SC', name: 'Master of Science (M.Sc)', level: 'MASTER', durationYears: 2, category: 'Science' },
  { code: 'M.C.A.', name: 'Master of Computer Applications (MCA)', level: 'MASTER', durationYears: 2, category: 'Computer Science' },
  { code: 'M.B.A.', name: 'Master of Business Administration (MBA)', level: 'MASTER', durationYears: 2, category: 'Management' },
  { code: 'M.COM', name: 'Master of Commerce (M.Com)', level: 'MASTER', durationYears: 2, category: 'Commerce & Finance' },
  { code: 'M.A.', name: 'Master of Arts (M.A.)', level: 'MASTER', durationYears: 2, category: 'Humanities & Social Sciences' },
  { code: 'M.PHARM', name: 'Master of Pharmacy (M.Pharm)', level: 'MASTER', durationYears: 2, category: 'Pharmacy & Medical' },
  { code: 'M.DES', name: 'Master of Design (M.Des)', level: 'MASTER', durationYears: 2, category: 'Design & Arts' },
  { code: 'LL.M', name: 'Master of Laws (LL.M)', level: 'MASTER', durationYears: 1, category: 'Law' },

  // Integrated & Dual Degrees
  { code: 'DUAL DEGREE', name: 'Dual Degree Integrated (B.Tech + M.Tech)', level: 'INTEGRATED', durationYears: 5, category: 'Engineering & Technology' },
  { code: 'INTEGRATED M.SC', name: 'Integrated Master of Science (Integrated M.Sc)', level: 'INTEGRATED', durationYears: 5, category: 'Science' },

  // Doctoral & Research
  { code: 'PH.D.', name: 'Doctor of Philosophy (Ph.D.)', level: 'DOCTORAL', durationYears: 4, category: 'Research' },
  { code: 'M.PHIL', name: 'Master of Philosophy (M.Phil)', level: 'DOCTORAL', durationYears: 2, category: 'Research' },

  // Diploma
  { code: 'DIPLOMA', name: 'Polytechnic Diploma in Engineering (Diploma)', level: 'DIPLOMA', durationYears: 3, category: 'Polytechnic' },
  { code: 'PG DIPLOMA', name: 'Postgraduate Diploma (PG Diploma)', level: 'DIPLOMA', durationYears: 1, category: 'Management' },
];

export const getProgramDurationYears = (code: string): number => {
  if (!code) return 4;
  const match = UNIVERSITY_PROGRAMS.find(
    (p) => p.code.toLowerCase() === code.trim().toLowerCase() ||
           p.name.toLowerCase().includes(code.trim().toLowerCase())
  );
  return match ? match.durationYears : 4;
};

const AVATAR_PRESETS = [
  { id: '1', label: 'Student Female', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80' },
  { id: '2', label: 'Student Male', url: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=300&auto=format&fit=crop&q=80' },
  { id: '3', label: 'Researcher', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80' },
  { id: '4', label: 'Faculty Male', url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&auto=format&fit=crop&q=80' },
  { id: '5', label: 'Faculty Female', url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=300&auto=format&fit=crop&q=80' },
  { id: '6', label: 'Library Staff', url: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=300&auto=format&fit=crop&q=80' },
];

export default function Profile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState(libraryStore.snapshot);
  const [isEditing, setIsEditing] = useState(false);
  const [avatarMode, setAvatarMode] = useState<'FILE' | 'URL' | 'PRESETS'>('FILE');
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

  const userRole = user?.role || currentMember?.role || 'STUDENT';
  const isStudent = userRole === 'STUDENT';
  const isFaculty = userRole === 'FACULTY';
  const isAdmin = userRole === 'ADMIN' || userRole === 'STAFF';

  const [formData, setFormData] = useState({
    name: user?.name || currentMember?.name || 'User Profile',
    email: user?.email || currentMember?.email || 'user@college.edu',
    phone: currentMember?.phone || '+91 98765 43210',
    department: currentMember?.department || (isFaculty ? 'Computer Science & AI' : isAdmin ? 'Central Library Administration & Operations' : 'Computer Science & Engineering'),
    avatarUrl:
      currentMember?.avatarUrl ||
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80',
    rollNo: currentMember?.rollNo || (isFaculty ? 'FAC-EMP-882' : isAdmin ? 'ADM-OFFICER-001' : 'UNIV-2026-CS-042'),
    program: currentMember?.program || 'B.TECH',
    startingYear: currentMember?.startingYear || 2023,
    passoutYear: currentMember?.passoutYear || 2027,
    academicBatch: currentMember?.academicBatch || (isFaculty ? 'Associate Professor' : isAdmin ? 'Chief Librarian & Director' : 'B.Tech (2023–2027)'),
    designation: currentMember?.academicBatch || (isFaculty ? 'Associate Professor' : isAdmin ? 'Chief Librarian & Director' : ''),
    qualification: isFaculty ? (currentMember?.academicBatch?.includes('Ph.D') ? currentMember.academicBatch : 'Ph.D. in Computer Science & Engineering') : '',
    address: currentMember?.address || (isFaculty ? 'Faculty Academic Block 3, Cabin 412' : isAdmin ? 'Central Library 1st Floor, Admin Chamber 102' : 'Campus Hostel Block B, Room 304'),
    emergencyContact: currentMember?.emergencyContact || (isFaculty ? '+91 98765 01234 (Dept Office)' : isAdmin ? '+91 98765 11111 (Security Desk)' : '+91 98123 45678 (Guardian)'),
  });

  useEffect(() => {
    if (currentMember) {
      const initialProgram = currentMember.program || 'B.TECH';
      const duration = getProgramDurationYears(initialProgram);
      const sYear = currentMember.startingYear || 2023;
      const pYear = currentMember.passoutYear || (sYear + duration);

      setFormData({
        name: user?.name || currentMember.name,
        email: user?.email || currentMember.email,
        phone: currentMember.phone || '+91 98765 43210',
        department: currentMember.department,
        avatarUrl:
          currentMember.avatarUrl ||
          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80',
        rollNo: currentMember.rollNo || (currentMember.role === 'FACULTY' ? 'FAC-EMP-882' : currentMember.role === 'ADMIN' || currentMember.role === 'STAFF' ? 'ADM-OFFICER-001' : 'UNIV-2026-CS-042'),
        program: initialProgram,
        startingYear: sYear,
        passoutYear: pYear,
        academicBatch: currentMember.academicBatch || (currentMember.role === 'FACULTY' ? 'Associate Professor' : currentMember.role === 'ADMIN' || currentMember.role === 'STAFF' ? 'Chief Librarian & Director' : `${initialProgram} (${sYear}–${pYear})`),
        designation: currentMember.academicBatch || (currentMember.role === 'FACULTY' ? 'Associate Professor' : currentMember.role === 'ADMIN' || currentMember.role === 'STAFF' ? 'Chief Librarian & Director' : ''),
        qualification: currentMember.role === 'FACULTY' ? 'Ph.D. in Computer Science & Engineering' : '',
        address: currentMember.address || (currentMember.role === 'FACULTY' ? 'Faculty Academic Block 3, Cabin 412' : currentMember.role === 'ADMIN' || currentMember.role === 'STAFF' ? 'Central Library 1st Floor, Admin Chamber 102' : 'Campus Hostel Block B, Room 304'),
        emergencyContact: currentMember.emergencyContact || (currentMember.role === 'FACULTY' ? '+91 98765 01234 (Dept Office)' : currentMember.role === 'ADMIN' || currentMember.role === 'STAFF' ? '+91 98765 11111 (Security Desk)' : '+91 98123 45678 (Guardian)'),
      });
    }
  }, [currentMember, user]);

  const handleSelectProgram = (programCode: string) => {
    const duration = getProgramDurationYears(programCode);
    const sYear = Number(formData.startingYear) || 2023;
    const pYear = sYear + duration;
    setFormData((prev) => ({
      ...prev,
      program: programCode,
      startingYear: sYear,
      passoutYear: pYear,
      academicBatch: `${programCode} (${sYear}–${pYear})`,
    }));
  };

  const handleStartingYearChange = (newStartYear: number) => {
    const sYear = Number(newStartYear);
    const duration = getProgramDurationYears(formData.program);
    const pYear = sYear + duration;
    setFormData((prev) => ({
      ...prev,
      startingYear: sYear,
      passoutYear: pYear,
      academicBatch: `${formData.program} (${sYear}–${pYear})`,
    }));
  };

  const handlePassoutYearChange = (newPassoutYear: number) => {
    const pYear = Number(newPassoutYear);
    setFormData((prev) => ({
      ...prev,
      passoutYear: pYear,
      academicBatch: `${formData.program} (${formData.startingYear}–${pYear})`,
    }));
  };

  const cardNo = currentMember?.memberCardNo || 'LIB-2026-001';
  const qrSvgString = generateQrSvgString(cardNo, 110);
  const barcodeSvgString = generateBarcodeSvgString(cardNo, { height: 40 });
  const qrDataUrl = svgToDataUrl(qrSvgString);
  const barcodeDataUrl = svgToDataUrl(barcodeSvgString);

  const handleCopyCardNumber = () => {
    navigator.clipboard.writeText(cardNo);
    setCopiedCard(true);
    setToastMessage(`Library Card Number (${cardNo}) copied to clipboard!`);
    setTimeout(() => setCopiedCard(false), 2000);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handlePrintProfileReport = () => {
    const targetId = currentMember?.id || user?.email || cardNo;
    libraryStore.printMemberCompleteProfileReport(targetId);
  };

  const handleImageFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setToastMessage('Please select a valid image file (PNG, JPG, JPEG, WEBP).');
      setTimeout(() => setToastMessage(null), 4000);
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setToastMessage('Image file size exceeds 5MB limit. Please choose a smaller photo.');
      setTimeout(() => setToastMessage(null), 4000);
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setFormData((prev) => ({ ...prev, avatarUrl: dataUrl }));
      setToastMessage('Photo uploaded from device successfully! Click "Save Profile Changes" to save.');
      setTimeout(() => setToastMessage(null), 4000);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentMember) {
      const finalBatch = isFaculty
        ? (formData.designation || formData.academicBatch)
        : isAdmin
        ? (formData.designation || 'Chief Librarian & Director')
        : formData.academicBatch;

      libraryStore.updateMemberProfile(currentMember.id, {
        name: formData.name,
        phone: formData.phone,
        department: formData.department,
        avatarUrl: formData.avatarUrl,
        rollNo: formData.rollNo,
        program: isStudent ? formData.program : undefined,
        startingYear: isStudent ? formData.startingYear : undefined,
        passoutYear: isStudent ? formData.passoutYear : undefined,
        academicBatch: finalBatch,
        address: formData.address,
        emergencyContact: formData.emergencyContact,
      });
    }

    if (user) {
      const updatedUser = { ...user, name: formData.name, department: formData.department };
      sessionStorage.setItem('library_user', JSON.stringify(updatedUser));
    }

    setIsEditing(false);
    setToastMessage('Profile details & parameters updated successfully!');
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handlePrintLibraryCard = () => {
    const printWindow = window.open('', '_blank', 'width=850,height=700');
    if (!printWindow) return;

    const qrSvg = generateQrSvgString(cardNo, 75);
    const barcodeSvg = generateBarcodeSvgString(cardNo, { height: 45 });

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Print Digital Library Pass - ${formData.name}</title>
          <style>
            @page { size: A4; margin: 10mm; }
            * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            body { margin: 0; padding: 24px; background: #f1f5f9; font-family: 'Segoe UI', system-ui, -apple-system, Roboto, sans-serif; color: #0f172a; }
            @media print {
              body { background: #ffffff; padding: 0; }
              .no-print { display: none !important; }
            }
            .page-title { text-align: center; margin-bottom: 20px; }
            .print-btn { background: #0f172a; color: #ffffff; border: none; padding: 12px 24px; font-size: 13px; font-weight: 700; border-radius: 12px; cursor: pointer; box-shadow: 0 4px 12px rgba(15, 23, 42, 0.2); }
            .print-btn:hover { background: #1e293b; }
            
            .cards-container { display: flex; flex-direction: column; align-items: center; gap: 24px; max-width: 480px; margin: 0 auto; }
            
            /* STANDARD CR80 ID CARD BOX (400px x 240px) */
            .id-card {
              width: 400px;
              height: 240px;
              border-radius: 16px;
              background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #090d16 100%);
              color: #ffffff;
              padding: 16px 20px;
              position: relative;
              overflow: hidden;
              box-shadow: 0 12px 30px rgba(15, 23, 42, 0.25);
              border: 2px solid rgba(255, 255, 255, 0.15);
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              page-break-inside: avoid;
            }
            
            .card-header { display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid rgba(255, 255, 255, 0.15); padding-bottom: 8px; }
            .univ-name { font-size: 11px; font-weight: 800; letter-spacing: 0.5px; color: #93c5fd; text-transform: uppercase; white-space: nowrap; }
            .pass-subtitle { font-size: 8.5px; color: #94a3b8; font-weight: 600; white-space: nowrap; }
            .role-badge { font-size: 9px; font-weight: 800; text-transform: uppercase; background: rgba(59, 130, 246, 0.3); border: 1px solid rgba(147, 197, 253, 0.4); color: #bfdbfe; padding: 3px 9px; border-radius: 6px; white-space: nowrap; }
            
            .card-body-front { display: flex; align-items: center; gap: 12px; margin: 6px 0; }
            .avatar-photo { width: 72px; height: 72px; border-radius: 12px; object-fit: cover; border: 2px solid #f59e0b; box-shadow: 0 4px 10px rgba(0,0,0,0.3); flex-shrink: 0; }
            .member-details { flex: 1; min-width: 0; }
            .member-name { font-size: 15px; font-weight: 800; color: #ffffff; margin: 0 0 2px 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
            .card-no { font-family: 'Courier New', Courier, monospace; font-size: 13px; font-weight: 800; color: #f59e0b; white-space: nowrap; margin-bottom: 2px; }
            .dept-text { font-size: 10px; color: #cbd5e1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
            .status-pill { font-size: 9px; font-weight: 700; color: #34d399; margin-top: 2px; }
            
            .qr-code-box { width: 72px; height: 72px; background: #ffffff; padding: 4px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; box-shadow: 0 2px 8px rgba(0,0,0,0.2); }
            .qr-code-box svg { width: 100%; height: 100%; display: block; }
            
            .card-footer { display: flex; align-items: center; justify-content: space-between; border-top: 1px solid rgba(255, 255, 255, 0.15); padding-top: 6px; font-size: 8.5px; color: #94a3b8; font-family: monospace; }
            
            .card-body-back { display: flex; flex-direction: column; align-items: center; justify-content: center; margin: 6px 0; }
            .barcode-wrapper { width: 100%; background: #ffffff; padding: 8px 12px 4px 12px; border-radius: 10px; display: flex; flex-direction: column; align-items: center; justify-content: center; box-shadow: inset 0 2px 4px rgba(0,0,0,0.05); }
            .barcode-wrapper svg { width: 100%; max-width: 320px; height: 48px; display: block; }
            .rules-notice { font-size: 8px; color: #94a3b8; text-align: center; line-height: 1.3; margin-top: 4px; }
          </style>
        </head>
        <body>
          <div class="no-print page-title">
            <button onclick="window.print()" class="print-btn">🖨️ Print Digital Library Pass (Front & Back)</button>
          </div>
          
          <div class="cards-container">
            <!-- FRONT SIDE -->
            <div class="id-card">
              <div class="card-header">
                <div>
                  <div class="univ-name">University Central Library</div>
                  <div class="pass-subtitle">Official Student / Member Pass</div>
                </div>
                <div class="role-badge">${user?.role || 'MEMBER'}</div>
              </div>
              
              <div class="card-body-front">
                <img src="${formData.avatarUrl}" class="avatar-photo" alt="${formData.name}" />
                <div class="member-details">
                  <h3 class="member-name">${formData.name}</h3>
                  <div class="card-no">${cardNo}</div>
                  <div class="dept-text">Dept: ${formData.department}</div>
                  <div class="status-pill">● ACTIVE MEMBER</div>
                </div>
                <div class="qr-code-box">
                  ${qrSvg}
                </div>
              </div>
              
              <div class="card-footer">
                <span>Issued: ${currentMember?.registeredDate || '2026-01-15'}</span>
                <span>Valid Through: DEC 2028</span>
                <span style="color: #f59e0b; font-weight: bold;">SECURITY VERIFIED</span>
              </div>
            </div>

            <!-- BACK SIDE -->
            <div class="id-card">
              <div class="card-header">
                <div class="univ-name" style="color: #f59e0b;">BARCODE & TURNSTILE ACCESS</div>
                <div class="card-no" style="font-size: 11px; margin: 0;">${cardNo}</div>
              </div>
              
              <div class="card-body-back">
                <div class="barcode-wrapper">
                  ${barcodeSvg}
                </div>
              </div>
              
              <div class="rules-notice">
                • Present card at library turnstiles, circulation counters, and RFID gates.<br/>
                • Non-transferable official pass. Max Quota: ${currentMember?.maxAllowedBooks || 5} Books.
              </div>
              
              <div class="card-footer" style="padding-top: 4px;">
                <span>Library System v2.4</span>
                <span>Help: library@university.edu</span>
              </div>
            </div>
          </div>

          <script>
            window.onload = function() {
              setTimeout(function() { window.print(); }, 300);
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
            onClick={handlePrintProfileReport}
            className="px-4 py-2.5 rounded-2xl bg-white text-slate-900 hover:bg-slate-100 text-xs font-bold transition-all flex items-center gap-2 shadow-md cursor-pointer"
          >
            <Printer className="w-4 h-4 text-blue-600" /> Print Profile Report (PDF)
          </button>
          <button
            onClick={handlePrintLibraryCard}
            className="px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-bold text-white backdrop-blur-md transition-all flex items-center gap-2 shadow-sm cursor-pointer"
          >
            <CreditCard className="w-4 h-4 text-emerald-300" /> Print Pass
          </button>
        </div>
      </div>

      {toastMessage && (
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-semibold shadow-xs animate-fadeIn">
          <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* SECTION 1: Personal Information & Account Privileges Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left Column: Account Privileges & Quotas */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between pb-1">
            <div>
              <h2 className="text-lg font-bold font-poppins text-slate-900">
                Account Privileges
              </h2>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md ${
                  isStudent
                    ? 'bg-blue-100 text-blue-700'
                    : isFaculty
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'bg-slate-900 text-white'
                }`}>
                  {isStudent ? '🎓 Student Account' : isFaculty ? '👨‍🏫 Faculty Account' : '🛡️ Admin Account'}
                </span>
              </div>
            </div>

            <span
              className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1 ${
                currentMember?.status === 'ACTIVE'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border border-amber-200'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              {currentMember?.status || 'ACTIVE'}
            </span>
          </div>

          {/* Member Card ID Pill */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-gradient-to-r from-slate-900 to-indigo-950 text-white text-xs shadow-xs">
            <div className="space-y-0.5">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Library Card ID</span>
              <p className="font-mono font-extrabold text-amber-300 tracking-wider text-sm">{cardNo}</p>
            </div>
            <button
              type="button"
              onClick={handleCopyCardNumber}
              className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 hover:text-white transition-all cursor-pointer"
              title="Copy Library Card ID"
            >
              {copiedCard ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>

          {/* Role-Specific Parameters List */}
          <div className="space-y-2.5 text-xs font-medium">
            {/* 1. STUDENT PRIVILEGES */}
            {isStudent && (
              <>
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-600 font-bold">Borrowing Allowance</span>
                  <span className="font-bold text-slate-900 font-mono">{currentMember?.maxAllowedBooks || 5} Books / 7 Days</span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-600 font-bold">Active Borrowed Books</span>
                  <span className="font-bold text-blue-700 font-mono">{currentMember?.currentActiveLoans || 0} Books in hand</span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-600 font-bold">Online Renewals</span>
                  <span className="font-bold text-slate-800">Up to 2 Times / Book</span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-rose-50/50 border border-rose-100">
                  <div className="flex flex-col">
                    <span className="text-rose-700 font-bold">Pending Fine Balance</span>
                    <Link to="/fines" className="text-[10px] text-rose-600 hover:underline font-semibold flex items-center gap-0.5 mt-0.5">
                      View Receipts & Settle &rarr;
                    </Link>
                  </div>
                  <span className="font-bold text-rose-900 font-mono text-sm">
                    ₹{getMemberPendingFines(currentMember?.id || user?.email || '', state).toFixed(2)}
                  </span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-600 font-bold">Overdue Fine Rate</span>
                  <span className="font-bold text-rose-700 font-mono text-xs">₹{(state.config?.fineRatePerDay || 5).toFixed(2)} / Day</span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="flex flex-col">
                    <span className="text-slate-600 font-bold">Institutional Clearance (NDC)</span>
                    <Link to="/no-due" className="text-[10px] text-blue-600 hover:underline font-semibold flex items-center gap-0.5 mt-0.5">
                      Check Clearance Status &rarr;
                    </Link>
                  </div>
                  <span className={`font-extrabold px-2 py-0.5 rounded-md text-[10px] uppercase ${
                    currentMember?.noDueStatus === 'ISSUED'
                      ? 'bg-indigo-100 text-indigo-800'
                      : currentMember?.noDueStatus === 'DUES_PENDING'
                      ? 'bg-rose-100 text-rose-800'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    {currentMember?.noDueStatus || 'ELIGIBLE'}
                  </span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-blue-50/50 border border-blue-100">
                  <span className="text-blue-900 font-bold">Digital E-Resources</span>
                  <span className="font-bold text-blue-700 text-[11px]">Full Campus Access</span>
                </div>
              </>
            )}

            {/* 2. FACULTY PRIVILEGES */}
            {isFaculty && (
              <>
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-indigo-50/50 border border-indigo-100">
                  <span className="text-indigo-900 font-bold">Faculty Borrowing Quota</span>
                  <span className="font-bold text-indigo-700 font-mono">{currentMember?.maxAllowedBooks || 10} Books</span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-600 font-bold">Standard Loan Period</span>
                  <span className="font-bold text-slate-900 font-mono">30 Days / Issue</span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-600 font-bold">Active Borrowed Books</span>
                  <span className="font-bold text-indigo-700 font-mono">{currentMember?.currentActiveLoans || 0} Books in hand</span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-50/50 border border-emerald-100">
                  <span className="text-emerald-800 font-bold">Online Renewal Privileges</span>
                  <span className="font-bold text-emerald-700 text-[11px]">Unlimited Online</span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-rose-50/50 border border-rose-100">
                  <div className="flex flex-col">
                    <span className="text-rose-700 font-bold">Pending Fine Balance</span>
                    <Link to="/fines" className="text-[10px] text-rose-600 hover:underline font-semibold flex items-center gap-0.5 mt-0.5">
                      View Receipts & Settle &rarr;
                    </Link>
                  </div>
                  <span className="font-bold text-rose-900 font-mono text-sm">
                    ₹{getMemberPendingFines(currentMember?.id || user?.email || '', state).toFixed(2)}
                  </span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-600 font-bold">Overdue Fine Rate</span>
                  <span className="font-bold text-slate-800 font-mono text-xs">₹{(state.config?.fineRatePerDay || 5).toFixed(2)} / Day</span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-600 font-bold">Faculty Clearance Status</span>
                  <span className="font-extrabold px-2 py-0.5 rounded-md text-[10px] uppercase bg-emerald-100 text-emerald-800">
                    {currentMember?.noDueStatus || 'ELIGIBLE'}
                  </span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-indigo-50/50 border border-indigo-100">
                  <span className="text-indigo-900 font-bold">Research Journal Access</span>
                  <span className="font-bold text-indigo-700 text-[11px]">IEEE / ScienceDirect</span>
                </div>
              </>
            )}

            {/* 3. ADMIN / STAFF PRIVILEGES */}
            {isAdmin && (
              <>
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900 text-white shadow-2xs">
                  <span className="text-slate-300 font-bold">System Clearance Level</span>
                  <span className="font-bold text-amber-300 text-[11px]">ROOT LIBRARIAN</span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-600 font-bold">Circulation Desk Control</span>
                  <span className="font-bold text-emerald-700 text-[11px]">UNRESTRICTED</span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-600 font-bold">Fine Waiver Authority</span>
                  <span className="font-bold text-blue-700 text-[11px]">FULL SIGNATORY</span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-600 font-bold">No Due Certificate Authority</span>
                  <span className="font-bold text-indigo-700 text-[11px]">OFFICIAL ISSUER</span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-600 font-bold">Admin Management Desks</span>
                  <span className="font-mono font-bold text-slate-800 text-[11px]">18 Core Desks</span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-600 font-bold">Audit Logs & Database Access</span>
                  <span className="font-bold text-slate-800 text-[11px]">Full Read / Write</span>
                </div>
              </>
            )}

            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-slate-600 font-bold">Account Registered Date</span>
              <span className="font-mono text-slate-800">{currentMember?.registeredDate || '2026-01-15'}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 space-y-2">
            <button
              onClick={handlePrintProfileReport}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-xs shadow-md hover:opacity-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Printer className="w-4 h-4 text-white" /> Print Complete Profile Report (PDF)
            </button>
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

        {/* Right Column: Editable Personal Information */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-1">
            <div>
              <h2 className="text-lg font-bold font-poppins text-slate-900">
                {isStudent ? 'Student Profile & Academic Timeline' : isFaculty ? 'Faculty Profile & Academic Credentials' : 'Administrator & Library Operations Profile'}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {isStudent ? 'Manage student details, enrollment parameters, and graduation timeline.' : isFaculty ? 'Manage faculty academic credentials, department, and office cabin.' : 'Manage library administration authority, staff credentials, and operations wing.'}
              </p>
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
            {/* Common: Full Name & SSO Email */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

              <div className="space-y-1">
                <label className="block text-slate-700 font-bold">Institutional Email (SSO)</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                  <input
                    type="email"
                    disabled
                    value={formData.email}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-mono bg-slate-50 cursor-not-allowed"
                  />
                </div>
              </div>
            </div>

            {/* ========================================================================= */}
            {/* 1. STUDENT-SPECIFIC SECTION */}
            {/* ========================================================================= */}
            {isStudent && (
              <>
                {/* Roll No & Department */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-slate-700 font-bold">Student Roll No / Enrollment ID</label>
                    <div className="relative">
                      <Hash className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                      <input
                        type="text"
                        disabled={!isEditing}
                        value={formData.rollNo}
                        onChange={(e) => setFormData({ ...formData, rollNo: e.target.value })}
                        placeholder="e.g. UNIV-2026-CS-042"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-slate-900 font-mono font-medium disabled:bg-slate-50 disabled:text-slate-600 focus:ring-2 focus:ring-blue-500/20"
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

                {/* University Degrees, Starting Year & Passout Year */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* 1. University Degrees */}
                  <div className="space-y-1">
                    <label className="block text-slate-700 font-bold">University Degrees</label>
                    <div className="relative">
                      <GraduationCap className="absolute left-3.5 top-3 h-4 w-4 text-slate-400 pointer-events-none" />
                      <select
                        disabled={!isEditing}
                        value={formData.program}
                        onChange={(e) => handleSelectProgram(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-slate-900 font-medium disabled:bg-slate-50 disabled:text-slate-600 focus:ring-2 focus:ring-blue-500/20 bg-white truncate text-xs"
                      >
                        <optgroup label="Bachelor Degrees">
                          {UNIVERSITY_PROGRAMS.filter((p) => p.level === 'BACHELOR' || p.level === 'INTEGRATED').map((p) => (
                            <option key={p.code} value={p.code}>
                              {p.name} ({p.durationYears} Years)
                            </option>
                          ))}
                        </optgroup>
                        <optgroup label="Master Degrees">
                          {UNIVERSITY_PROGRAMS.filter((p) => p.level === 'MASTER').map((p) => (
                            <option key={p.code} value={p.code}>
                              {p.name} ({p.durationYears} Years)
                            </option>
                          ))}
                        </optgroup>
                        <optgroup label="Doctoral Degrees">
                          {UNIVERSITY_PROGRAMS.filter((p) => p.level === 'DOCTORAL').map((p) => (
                            <option key={p.code} value={p.code}>
                              {p.name} ({p.durationYears} Years)
                            </option>
                          ))}
                        </optgroup>
                        <optgroup label="Diplomas">
                          {UNIVERSITY_PROGRAMS.filter((p) => p.level === 'DIPLOMA').map((p) => (
                            <option key={p.code} value={p.code}>
                              {p.name} ({p.durationYears} Year)
                            </option>
                          ))}
                        </optgroup>
                      </select>
                    </div>
                  </div>

                  {/* 2. Starting Year */}
                  <div className="space-y-1">
                    <label className="block text-slate-700 font-bold">Starting Year</label>
                    <div className="relative">
                      <Calendar className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                      <input
                        type="number"
                        min={2015}
                        max={2035}
                        disabled={!isEditing}
                        value={formData.startingYear}
                        onChange={(e) => handleStartingYearChange(parseInt(e.target.value) || 2023)}
                        placeholder="e.g. 2023"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-slate-900 font-mono font-medium disabled:bg-slate-50 disabled:text-slate-600 focus:ring-2 focus:ring-blue-500/20"
                      />
                    </div>
                  </div>

                  {/* 3. Passout Year */}
                  <div className="space-y-1">
                    <label className="block text-slate-700 font-bold">Passout Year</label>
                    <div className="relative">
                      <Award className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                      <input
                        type="number"
                        min={2015}
                        max={2040}
                        disabled={!isEditing}
                        value={formData.passoutYear}
                        onChange={(e) => handlePassoutYearChange(parseInt(e.target.value) || 2027)}
                        placeholder="e.g. 2027"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-slate-900 font-mono font-medium disabled:bg-slate-50 disabled:text-slate-600 focus:ring-2 focus:ring-blue-500/20"
                      />
                    </div>
                  </div>
                </div>

                {/* Phone Number */}
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

                {/* Emergency Contact & Address */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-slate-700 font-bold">Emergency / Guardian Contact</label>
                    <div className="relative">
                      <PhoneCall className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                      <input
                        type="text"
                        disabled={!isEditing}
                        value={formData.emergencyContact}
                        onChange={(e) => setFormData({ ...formData, emergencyContact: e.target.value })}
                        placeholder="e.g. +91 98123 45678 (Parent)"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-slate-900 font-medium disabled:bg-slate-50 disabled:text-slate-600 focus:ring-2 focus:ring-blue-500/20"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-slate-700 font-bold">Campus Hostel / Residential Address</label>
                    <div className="relative">
                      <MapPin className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                      <input
                        type="text"
                        disabled={!isEditing}
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        placeholder="e.g. Hostel Block B, Room 304"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-slate-900 font-medium disabled:bg-slate-50 disabled:text-slate-600 focus:ring-2 focus:ring-blue-500/20"
                      />
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* ========================================================================= */}
            {/* 2. FACULTY-SPECIFIC SECTION */}
            {/* ========================================================================= */}
            {isFaculty && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-slate-700 font-bold">Faculty Employee ID</label>
                    <div className="relative">
                      <Hash className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                      <input
                        type="text"
                        disabled={!isEditing}
                        value={formData.rollNo}
                        onChange={(e) => setFormData({ ...formData, rollNo: e.target.value })}
                        placeholder="e.g. FAC-EMP-882"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-slate-900 font-mono font-bold disabled:bg-slate-50 disabled:text-slate-600 focus:ring-2 focus:ring-blue-500/20"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-slate-700 font-bold">Academic Department / School</label>
                    <div className="relative">
                      <Building className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                      <input
                        type="text"
                        disabled={!isEditing}
                        value={formData.department}
                        onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                        placeholder="e.g. Department of Computer Science & AI"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-slate-900 font-medium disabled:bg-slate-50 disabled:text-slate-600 focus:ring-2 focus:ring-blue-500/20"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-slate-700 font-bold">Faculty Academic Designation</label>
                    <div className="relative">
                      <Briefcase className="absolute left-3.5 top-3 h-4 w-4 text-indigo-600 pointer-events-none" />
                      <select
                        disabled={!isEditing}
                        value={formData.designation}
                        onChange={(e) => setFormData({ ...formData, designation: e.target.value, academicBatch: e.target.value })}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-slate-900 font-semibold disabled:bg-slate-50 disabled:text-slate-600 focus:ring-2 focus:ring-indigo-500/20 bg-white text-xs cursor-pointer shadow-2xs"
                      >
                        <option value="Professor & Senior Researcher">Professor & Senior Researcher</option>
                        <option value="Associate Professor">Associate Professor</option>
                        <option value="Assistant Professor">Assistant Professor</option>
                        <option value="Head of Department (HOD)">Head of Department (HOD)</option>
                        <option value="Dean / Associate Dean">Dean / Associate Dean</option>
                        <option value="Visiting Professor / Guest Faculty">Visiting Professor / Guest Faculty</option>
                        <option value="Postdoctoral Research Fellow">Postdoctoral Research Fellow</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-slate-700 font-bold">Highest Academic Qualification</label>
                    <div className="relative">
                      <Award className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                      <input
                        type="text"
                        disabled={!isEditing}
                        value={formData.qualification}
                        onChange={(e) => setFormData({ ...formData, qualification: e.target.value })}
                        placeholder="e.g. Ph.D. in Computer Science & AI"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-slate-900 font-medium disabled:bg-slate-50 disabled:text-slate-600 focus:ring-2 focus:ring-blue-500/20"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-slate-700 font-bold">Faculty Cabin / Office Room Number</label>
                    <div className="relative">
                      <MapPin className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                      <input
                        type="text"
                        disabled={!isEditing}
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        placeholder="e.g. Faculty Block 3, Cabin 412"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-slate-900 font-medium disabled:bg-slate-50 disabled:text-slate-600 focus:ring-2 focus:ring-blue-500/20"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-slate-700 font-bold">Official Contact Phone</label>
                    <div className="relative">
                      <Phone className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                      <input
                        type="text"
                        disabled={!isEditing}
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="e.g. +91 98765 43210"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-slate-900 font-medium disabled:bg-slate-50 disabled:text-slate-600 focus:ring-2 focus:ring-blue-500/20"
                      />
                    </div>
                  </div>
                </div>

                {/* Faculty Privileges Badge */}
                <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-200 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <Shield className="w-5 h-5 text-indigo-600 shrink-0" />
                    <div>
                      <span className="font-bold text-indigo-950">Faculty Research & Circulation Privileges Active</span>
                      <p className="text-[11px] text-indigo-700">10 Books Borrowing Quota • 30 Days Period • Unlimited Online Renewals</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-xl bg-indigo-600 text-white font-bold text-[10px] uppercase">
                    GRANTED
                  </span>
                </div>
              </>
            )}

            {/* ========================================================================= */}
            {/* 3. ADMIN / STAFF-SPECIFIC SECTION */}
            {/* ========================================================================= */}
            {isAdmin && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-slate-700 font-bold">Library Staff Officer ID</label>
                    <div className="relative">
                      <Hash className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                      <input
                        type="text"
                        disabled={!isEditing}
                        value={formData.rollNo}
                        onChange={(e) => setFormData({ ...formData, rollNo: e.target.value })}
                        placeholder="e.g. ADM-OFFICER-001"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-slate-900 font-mono font-bold disabled:bg-slate-50 disabled:text-slate-600 focus:ring-2 focus:ring-blue-500/20"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-slate-700 font-bold">Library Operations Wing / Department</label>
                    <div className="relative">
                      <Building className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                      <input
                        type="text"
                        disabled={!isEditing}
                        value={formData.department}
                        onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                        placeholder="e.g. Central Library Administration & Operations"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-slate-900 font-medium disabled:bg-slate-50 disabled:text-slate-600 focus:ring-2 focus:ring-blue-500/20"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-slate-700 font-bold">Administrative Title & Role</label>
                    <div className="relative">
                      <Briefcase className="absolute left-3.5 top-3 h-4 w-4 text-blue-600 pointer-events-none" />
                      <select
                        disabled={!isEditing}
                        value={formData.designation}
                        onChange={(e) => setFormData({ ...formData, designation: e.target.value, academicBatch: e.target.value })}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-slate-900 font-semibold disabled:bg-slate-50 disabled:text-slate-600 focus:ring-2 focus:ring-blue-500/20 bg-white text-xs cursor-pointer shadow-2xs"
                      >
                        <option value="Chief Librarian & Director">Chief Librarian & Director</option>
                        <option value="Deputy Librarian & Operations Lead">Deputy Librarian & Operations Lead</option>
                        <option value="Assistant Librarian & Clearance Officer">Assistant Librarian & Clearance Officer</option>
                        <option value="Senior Library Information Assistant">Senior Library Information Assistant</option>
                        <option value="Systems & Database Administrator">Systems & Database Administrator</option>
                        <option value="Cataloging & Technical Processing In-Charge">Cataloging & Technical Processing In-Charge</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-slate-700 font-bold">Admin Chamber / Control Office</label>
                    <div className="relative">
                      <MapPin className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                      <input
                        type="text"
                        disabled={!isEditing}
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        placeholder="e.g. Central Library 1st Floor, Admin Chamber 102"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-slate-900 font-medium disabled:bg-slate-50 disabled:text-slate-600 focus:ring-2 focus:ring-blue-500/20"
                      />
                    </div>
                  </div>
                </div>

                {/* Admin Quick Desks Portal */}
                <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-blue-600" />
                      <span className="font-bold text-slate-900 text-xs">Librarian Administrative Desks Quick Portal</span>
                    </div>
                    <span className="text-[10px] text-blue-700 font-bold bg-blue-100 px-2 py-0.5 rounded-md">
                      ROOT ACCESS
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                    <Link
                      to="/admin/circulation"
                      className="p-2.5 rounded-xl bg-white border border-slate-200 hover:border-blue-500 text-slate-800 font-bold flex items-center justify-between shadow-2xs hover:text-blue-600 transition-all"
                    >
                      <span>🔄 Circulation Desk</span>
                      <ExternalLink className="w-3 h-3 text-slate-400" />
                    </Link>
                    <Link
                      to="/admin/no-due"
                      className="p-2.5 rounded-xl bg-white border border-slate-200 hover:border-blue-500 text-slate-800 font-bold flex items-center justify-between shadow-2xs hover:text-blue-600 transition-all"
                    >
                      <span>📜 No Due Clearance</span>
                      <ExternalLink className="w-3 h-3 text-slate-400" />
                    </Link>
                    <Link
                      to="/admin/fines"
                      className="p-2.5 rounded-xl bg-white border border-slate-200 hover:border-blue-500 text-slate-800 font-bold flex items-center justify-between shadow-2xs hover:text-blue-600 transition-all"
                    >
                      <span>💰 Fine Accounting</span>
                      <ExternalLink className="w-3 h-3 text-slate-400" />
                    </Link>
                    <Link
                      to="/admin/books"
                      className="p-2.5 rounded-xl bg-white border border-slate-200 hover:border-blue-500 text-slate-800 font-bold flex items-center justify-between shadow-2xs hover:text-blue-600 transition-all"
                    >
                      <span>📚 Catalog Inventory</span>
                      <ExternalLink className="w-3 h-3 text-slate-400" />
                    </Link>
                    <Link
                      to="/admin/members"
                      className="p-2.5 rounded-xl bg-white border border-slate-200 hover:border-blue-500 text-slate-800 font-bold flex items-center justify-between shadow-2xs hover:text-blue-600 transition-all"
                    >
                      <span>👥 Member Records</span>
                      <ExternalLink className="w-3 h-3 text-slate-400" />
                    </Link>
                    <Link
                      to="/admin/settings"
                      className="p-2.5 rounded-xl bg-white border border-slate-200 hover:border-blue-500 text-slate-800 font-bold flex items-center justify-between shadow-2xs hover:text-blue-600 transition-all"
                    >
                      <span>⚙️ Policy Settings</span>
                      <ExternalLink className="w-3 h-3 text-slate-400" />
                    </Link>
                  </div>
                </div>
              </>
            )}

            {/* Profile Photo Uploader */}
            <div className="space-y-2 pt-0.5">
              <label className="block text-slate-700 font-bold">Profile Photo</label>

              {/* Photo Preview & Action Bar */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                <div className="relative group shrink-0">
                  <img
                    src={formData.avatarUrl}
                    alt="Preview"
                    className="w-16 h-16 rounded-2xl object-cover border-2 border-blue-500 shadow-md"
                  />
                  {isEditing && (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute inset-0 bg-slate-900/60 rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white cursor-pointer"
                      title="Click to change photo"
                    >
                      <Camera className="w-5 h-5" />
                    </button>
                  )}
                </div>

                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-800 text-xs">Official Identification Photo</span>
                    {formData.avatarUrl.startsWith('data:image') && (
                      <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-700 text-[10px] font-bold">
                        Local File Uploaded
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500">
                    {isEditing
                      ? 'Upload a local image from your device, choose from avatar presets, or provide an image link.'
                      : 'To update your photo, click "Edit Profile" above.'}
                  </p>
                </div>

                {isEditing && (
                  <button
                    type="button"
                    onClick={() =>
                      setFormData((prev) => ({
                        ...prev,
                        avatarUrl:
                          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80',
                      }))
                    }
                    className="px-2.5 py-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-200/60 text-[11px] font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                    title="Reset to default photo"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-500" /> Reset
                  </button>
                )}
              </div>

              {/* Upload Method Tabs (Visible in Editing Mode) */}
              {isEditing && (
                <div className="space-y-3 pt-1">
                  {/* Mode Tabs */}
                  <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200 w-fit">
                    <button
                      type="button"
                      onClick={() => setAvatarMode('FILE')}
                      className={`px-3 py-1.5 rounded-lg font-bold text-[11px] transition-all flex items-center gap-1.5 cursor-pointer ${
                        avatarMode === 'FILE'
                          ? 'bg-white text-blue-700 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Upload className="w-3.5 h-3.5" /> Upload File
                    </button>
                    <button
                      type="button"
                      onClick={() => setAvatarMode('PRESETS')}
                      className={`px-3 py-1.5 rounded-lg font-bold text-[11px] transition-all flex items-center gap-1.5 cursor-pointer ${
                        avatarMode === 'PRESETS'
                          ? 'bg-white text-blue-700 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Presets
                    </button>
                    <button
                      type="button"
                      onClick={() => setAvatarMode('URL')}
                      className={`px-3 py-1.5 rounded-lg font-bold text-[11px] transition-all flex items-center gap-1.5 cursor-pointer ${
                        avatarMode === 'URL'
                          ? 'bg-white text-blue-700 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Globe className="w-3.5 h-3.5" /> Web Link
                    </button>
                  </div>

                  {/* TAB 1: File Upload */}
                  {avatarMode === 'FILE' && (
                    <div className="p-4 rounded-2xl border-2 border-dashed border-slate-300 bg-white hover:border-blue-400 transition-colors flex flex-col items-center justify-center text-center gap-2">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/png, image/jpeg, image/jpg, image/webp"
                        onChange={handleImageFileUpload}
                        className="hidden"
                      />
                      <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-xs">
                        <ImageIcon className="w-5 h-5" />
                      </div>
                      <div className="space-y-0.5">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="text-xs font-bold text-blue-600 hover:underline cursor-pointer"
                        >
                          Click to browse device photos
                        </button>
                        <p className="text-[10px] text-slate-400">Supports PNG, JPG, JPEG, WEBP (Max 5MB)</p>
                      </div>
                    </div>
                  )}

                  {/* TAB 2: Presets Grid */}
                  {avatarMode === 'PRESETS' && (
                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                      <p className="text-[11px] font-bold text-slate-700 mb-2">Choose an academic profile avatar:</p>
                      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                        {AVATAR_PRESETS.map((preset) => {
                          const isSelected = formData.avatarUrl === preset.url;
                          return (
                            <button
                              key={preset.id}
                              type="button"
                              onClick={() => setFormData((prev) => ({ ...prev, avatarUrl: preset.url }))}
                              className={`group relative flex flex-col items-center gap-1 p-1.5 rounded-xl border transition-all cursor-pointer ${
                                isSelected
                                  ? 'border-blue-600 bg-blue-50/80 ring-2 ring-blue-500/20'
                                  : 'border-slate-200 hover:border-slate-300 bg-white'
                              }`}
                            >
                              <img
                                src={preset.url}
                                alt={preset.label}
                                className="w-12 h-12 rounded-lg object-cover shadow-xs"
                              />
                              <span className="text-[9px] font-medium text-slate-600 truncate w-full text-center">
                                {preset.label}
                              </span>
                              {isSelected && (
                                <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-xs">
                                  <Check className="w-2.5 h-2.5" />
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* TAB 3: Web Image URL */}
                  {avatarMode === 'URL' && (
                    <div className="space-y-1">
                      <div className="relative">
                        <Globe className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                        <input
                          type="text"
                          value={formData.avatarUrl}
                          onChange={(e) => setFormData({ ...formData, avatarUrl: e.target.value })}
                          placeholder="https://example.com/photo.jpg"
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-slate-900 font-mono text-[11px] focus:ring-2 focus:ring-blue-500/20"
                        />
                      </div>
                      <p className="text-[10px] text-slate-400">Enter a direct HTTPS image URL.</p>
                    </div>
                  )}
                </div>
              )}
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

      {/* SECTION 2: Digital Library Membership Card Display (Positioned AFTER Personal Information) */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-extrabold text-blue-600 bg-blue-50 px-3 py-1 rounded-full uppercase tracking-wider mb-1">
              <CreditCard className="w-3.5 h-3.5" /> Official Member Identification
            </div>
            <h2 className="text-xl font-bold font-poppins text-slate-900">Digital Library Membership Card</h2>
            <p className="text-xs text-slate-500">Official digital smart pass for library entry, checkout counters, and turnstile verification.</p>
          </div>

          {/* Action Control Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCardSide(cardSide === 'front' ? 'back' : 'front')}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all flex items-center gap-2 cursor-pointer"
            >
              <RotateCw className="w-3.5 h-3.5 text-blue-600" /> Flip to {cardSide === 'front' ? 'Back (Barcode)' : 'Front (Photo & QR)'}
            </button>

            <button
              onClick={handlePrintLibraryCard}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-all flex items-center gap-2 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" /> Print Card
            </button>
          </div>
        </div>

        {/* Medium-Sized Perfectly Scaled Digital Library Pass */}
        <div className="flex flex-col items-center justify-center py-4">
          {/* Mid-sized Card Element (max-w-md, compact aspect ratio) */}
          <div className="w-full max-w-md rounded-2xl p-5 sm:p-6 bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 text-white shadow-xl border-2 border-white/20 relative overflow-hidden flex flex-col justify-between transition-all duration-300 hover:shadow-indigo-500/10">
            {/* Ambient Lighting FX */}
            <div className="absolute -top-10 -right-10 w-44 h-44 bg-blue-500/20 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute -bottom-10 -left-10 w-44 h-44 bg-indigo-500/20 rounded-full blur-2xl pointer-events-none" />

            {cardSide === 'front' ? (
              /* CARD FRONT */
              <>
                {/* Header */}
                <div className="relative z-10 flex items-center justify-between border-b border-white/10 pb-2.5 mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-amber-400 to-amber-200 flex items-center justify-center shadow-md">
                      <BookOpen className="w-4 h-4 text-slate-950 font-extrabold" />
                    </div>
                    <div>
                      <h3 className="text-xs font-extrabold tracking-wider text-blue-300 uppercase font-poppins">UNIVERSITY CENTRAL LIBRARY</h3>
                      <p className="text-[9px] text-slate-400 font-medium">Digital Member ID Pass</p>
                    </div>
                  </div>

                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-[9px] font-extrabold text-emerald-300 uppercase tracking-widest">
                    ACTIVE MEMBER
                  </span>
                </div>

                {/* Body Content */}
                <div className="relative z-10 flex items-center gap-3.5 py-2">
                  <img
                    src={formData.avatarUrl}
                    alt={formData.name}
                    className="w-18 h-18 sm:w-20 sm:h-20 rounded-xl object-cover border-2 border-amber-400/60 shadow-md shrink-0"
                  />

                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="inline-block px-2 py-0.5 rounded-md bg-blue-500/30 border border-blue-400/20 text-[9px] font-extrabold text-blue-200 uppercase tracking-wide">
                      {user?.role || 'MEMBER'}
                    </div>
                    <h4 className="text-base font-extrabold font-poppins truncate text-white tracking-tight leading-snug">{formData.name}</h4>

                    <div className="flex items-center gap-1.5 text-xs text-amber-300 font-mono font-extrabold">
                      <span>{cardNo}</span>
                      <button
                        type="button"
                        onClick={handleCopyCardNumber}
                        className="p-0.5 hover:bg-white/10 rounded transition-all text-slate-300 hover:text-white cursor-pointer"
                        title="Copy Card Number"
                      >
                        {copiedCard ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>

                    <p className="text-[11px] text-slate-300 truncate">Dept: <strong>{formData.department}</strong></p>
                  </div>

                  {/* QR Code */}
                  <div
                    className="bg-white p-2 rounded-2xl shadow-lg shrink-0 w-20 h-20 flex items-center justify-center overflow-hidden border border-white/40 ring-2 ring-white/10"
                    dangerouslySetInnerHTML={{
                      __html: generateQrSvgString(cardNo, 72),
                    }}
                  />
                </div>

                {/* Footer */}
                <div className="relative z-10 flex items-center justify-between border-t border-white/10 pt-2 mt-1 text-[10px] text-slate-400">
                  <span>Issued: <strong className="text-slate-200 font-mono">{currentMember?.registeredDate || '2026-01-15'}</strong></span>
                  <span>Valid Through: <strong className="text-slate-200 font-mono">DEC 2028</strong></span>
                  <span className="font-mono text-amber-300 font-bold">DIGITAL PASS</span>
                </div>
              </>
            ) : (
              /* CARD BACK */
              <>
                {/* Header */}
                <div className="relative z-10 flex items-center justify-between border-b border-white/10 pb-2.5 mb-2">
                  <div className="flex items-center gap-2">
                    <Barcode className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-extrabold tracking-wider text-amber-300 uppercase font-poppins">BARCODE & ACCESS TURNSTILES</span>
                  </div>
                  <span className="text-xs font-mono font-bold text-slate-300">{cardNo}</span>
                </div>

                {/* Barcode Display */}
                <div className="relative z-10 my-2 bg-white p-3 rounded-2xl shadow-lg flex flex-col items-center justify-center overflow-x-auto border border-white/40 ring-2 ring-white/10">
                  <div
                    className="w-full flex justify-center"
                    dangerouslySetInnerHTML={{
                      __html: generateBarcodeSvgString(cardNo, { height: 44 }),
                    }}
                  />
                  <p className="text-[10px] font-mono font-extrabold text-slate-900 tracking-widest mt-1">{cardNo}</p>
                </div>

                {/* Terms & Rules */}
                <div className="relative z-10 border-t border-white/10 pt-2 text-[9px] text-slate-400 leading-tight space-y-1">
                  <p>• Present this card for book issues, returns, entry turnstiles, and reading room access.</p>
                  <p>• Non-transferable pass. Max borrowing limit: <strong className="text-amber-300">{currentMember?.maxAllowedBooks} Books</strong>.</p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
