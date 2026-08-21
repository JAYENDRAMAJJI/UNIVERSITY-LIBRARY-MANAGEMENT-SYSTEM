import { useState, useEffect } from 'react';
import { Users, Search, CreditCard, Download, CheckCircle, Shield, AlertTriangle, UserPlus, RotateCw, Barcode, BookOpen, X, FileSpreadsheet, Calendar, Sparkles, Bell, Send } from 'lucide-react';
import { libraryStore, getMemberPendingFines, getLocalDateStr } from '../../services/libraryStore.service';
import { exportStyledExcelFile } from '../../utils/excelExport';
import { MemberProfile } from '../../types/library';
import RegisterAccountModal from '../../components/common/RegisterAccountModal';
import SendNotificationModal from '../../components/common/SendNotificationModal';
import { generateQrSvgString, generateBarcodeSvgString, svgToDataUrl } from '../../utils/barcodeQrGenerator';

export default function MembersManagement() {
  const [state, setState] = useState(libraryStore.snapshot);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('ALL');
  const [selectedCardModal, setSelectedCardModal] = useState<MemberProfile | null>(null);
  const [cardSide, setCardSide] = useState<'front' | 'back'>('front');
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [notificationModalData, setNotificationModalData] = useState<{ member: any; context: any } | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Export CSV Modal State
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportStartDate, setExportStartDate] = useState('');
  const [exportEndDate, setExportEndDate] = useState('');
  const [exportRoleFilter, setExportRoleFilter] = useState('ALL');
  const [exportDeptFilter, setExportDeptFilter] = useState('ALL');
  const [exportStatusFilter, setExportStatusFilter] = useState('ALL');
  const [exportActivityFilter, setExportActivityFilter] = useState('ALL');

  useEffect(() => {
    const sub = libraryStore.getObservable().subscribe(setState);
    return () => sub.unsubscribe();
  }, []);

  const filteredMembers = state.members.filter((m) => {
    const matchesSearch =
      m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.memberCardNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.department.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === 'ALL' || m.role === filterRole;
    return matchesSearch && matchesRole;
  });

  // Calculate Members matching Export Modal filters
  const getFilteredExportMembers = () => {
    return state.members.filter((m) => {
      // Role Filter
      if (exportRoleFilter !== 'ALL' && m.role !== exportRoleFilter) return false;

      // Department Filter
      if (exportDeptFilter !== 'ALL' && m.department !== exportDeptFilter) return false;

      // Status Filter
      if (exportStatusFilter !== 'ALL' && m.status !== exportStatusFilter) return false;

      // Activity Filter
      if (exportActivityFilter === 'HAS_LOANS' && (m.currentActiveLoans || 0) <= 0) return false;
      if (exportActivityFilter === 'HAS_FINES' && (getMemberPendingFines(m.id, state) || 0) <= 0) return false;

      // Registration Date Filter
      if (m.registeredDate) {
        if (exportStartDate && m.registeredDate < exportStartDate) return false;
        if (exportEndDate && m.registeredDate > exportEndDate) return false;
      }

      return true;
    });
  };

  const handleExecuteCSVExport = () => {
    const membersToExport = getFilteredExportMembers();
    if (membersToExport.length === 0) return;

    const headers = [
      'Member Card No',
      'Full Name',
      'Role',
      'Roll No / Employee ID',
      'Academic Batch / Designation',
      'Email Address',
      'Phone Number',
      'Department',
      'Status',
      'Max Allowed Books',
      'Active Loans',
      'Pending Fines (INR)',
      'Registered Date',
      'Address',
      'Emergency Contact',
    ];

    const rows = membersToExport.map((m) => [
      m.memberCardNo || '',
      m.name || '',
      m.role || '',
      m.rollNo || '',
      m.academicBatch || '',
      m.email || '',
      m.phone || '',
      m.department || '',
      m.status || 'ACTIVE',
      m.maxAllowedBooks || 0,
      m.currentActiveLoans || 0,
      `₹${(getMemberPendingFines(m.id, state) || m.pendingFines || 0).toFixed(2)}`,
      m.registeredDate || '',
      m.address || '',
      m.emergencyContact || '',
    ]);

    exportStyledExcelFile({
      filename: `members_registry_${exportRoleFilter.toLowerCase()}_${getLocalDateStr(new Date())}.xlsx`,
      sheetName: 'Members Registry',
      headers,
      data: rows,
      themeColor: '2563EB', // Blue 600 Header
    });

    setShowExportModal(false);
  };

  const handlePrintMemberCard = (member: MemberProfile) => {
    const printWindow = window.open('', '_blank', 'width=850,height=700');
    if (!printWindow) return;

    const qrSvg = generateQrSvgString(member.memberCardNo, 75);
    const barcodeSvg = generateBarcodeSvgString(member.memberCardNo, { height: 45 });

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Print Digital Library Pass - ${member.name}</title>
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
            .barcode-text { font-family: 'Courier New', Courier, monospace; font-size: 12px; font-weight: 800; color: #0f172a; letter-spacing: 2px; margin-top: 2px; text-align: center; }
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
                <div class="role-badge">${member.role}</div>
              </div>
              
              <div class="card-body-front">
                <img src="${member.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'}" class="avatar-photo" alt="${member.name}" />
                <div class="member-details">
                  <h3 class="member-name">${member.name}</h3>
                  <div class="card-no">${member.memberCardNo}</div>
                  <div class="dept-text">Dept: ${member.department}</div>
                  <div class="status-pill">● ACTIVE MEMBER</div>
                </div>
                <div class="qr-code-box">
                  ${qrSvg}
                </div>
              </div>
              
              <div class="card-footer">
                <span>Issued: ${member.registeredDate || '2026-01-15'}</span>
                <span>Valid Through: DEC 2028</span>
                <span style="color: #f59e0b; font-weight: bold;">SECURITY VERIFIED</span>
              </div>
            </div>

            <!-- BACK SIDE -->
            <div class="id-card">
              <div class="card-header">
                <div class="univ-name" style="color: #f59e0b;">BARCODE & TURNSTILE ACCESS</div>
                <div class="card-no" style="font-size: 11px; margin: 0;">${member.memberCardNo}</div>
              </div>
              
              <div class="card-body-back">
                <div class="barcode-wrapper">
                  ${barcodeSvg}
                </div>
              </div>
              
              <div class="rules-notice">
                • Present card at library turnstiles, circulation counters, and RFID gates.<br/>
                • Non-transferable official pass. Max Quota: ${member.maxAllowedBooks} Books.
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

  const handleExportCSV = () => {
    const membersToExport = filteredMembers.length > 0 ? filteredMembers : state.members;
    const headers = [
      'Member Card No',
      'Full Name',
      'Role',
      'Roll No / Employee ID',
      'Academic Batch / Designation',
      'Email Address',
      'Phone Number',
      'Department',
      'Status',
      'Max Allowed Books',
      'Active Loans',
      'Pending Fines (INR)',
      'Registered Date',
      'Address',
      'Emergency Contact',
    ];

    const csvRows = [
      headers.join(','),
      ...membersToExport.map((m) =>
        [
          `"${m.memberCardNo || ''}"`,
          `"${m.name || ''}"`,
          `"${m.role || ''}"`,
          `"${m.rollNo || ''}"`,
          `"${m.academicBatch || ''}"`,
          `"${m.email || ''}"`,
          `"${m.phone || ''}"`,
          `"${m.department || ''}"`,
          `"${m.status || 'ACTIVE'}"`,
          m.maxAllowedBooks || 0,
          m.currentActiveLoans || 0,
          getMemberPendingFines(m.id, state) || m.pendingFines || 0,
          `"${m.registeredDate || ''}"`,
          `"${m.address || ''}"`,
          `"${m.emergencyContact || ''}"`,
        ].join(',')
      ),
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + csvRows.join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `all_members_registry_data_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-sky-700 bg-sky-50 px-3 py-1 rounded-full mb-2">
            <Users className="h-3.5 w-3.5" /> Member Registry
          </div>
          <h1 className="text-2xl font-bold font-poppins text-slate-900">Student & Faculty Members</h1>
          <p className="text-sm text-slate-500 mt-1">Manage library accounts, issue digital library cards, and review borrowing limits.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowExportModal(true)}
            className="px-4 py-2.5 rounded-2xl border border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100 font-bold text-xs transition-all flex items-center gap-2 cursor-pointer shadow-2xs active:scale-95"
            title="Filter and download Student, Faculty & Staff member registry CSV file"
          >
            <Download className="h-4 w-4 text-purple-600" /> Export CSV (All Members)
          </button>
          <button
            onClick={() => setIsRegisterModalOpen(true)}
            className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-xs shadow-md hover:opacity-95 transition-all flex items-center gap-2 cursor-pointer"
          >
            <UserPlus className="h-4 w-4" /> Register New Member
          </button>
        </div>
      </div>

      {/* Filter & Search */}
      <div className="flex flex-col md:flex-row items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search member name, ID card number, or department..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-500 font-medium">Role:</span>
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-200 text-sm font-medium bg-white cursor-pointer"
          >
            <option value="ALL">All Roles</option>
            <option value="STUDENT">Student</option>
            <option value="FACULTY">Faculty</option>
            <option value="ADMIN">Admin / Staff</option>
          </select>
        </div>
      </div>

      {/* Members Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {filteredMembers.map((member) => (
          <div key={member.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 relative overflow-hidden">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <img
                  src={member.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'}
                  alt={member.name}
                  className="w-12 h-12 rounded-full object-cover border-2 border-slate-100"
                />
                <div>
                  <h3 className="font-bold text-slate-900 text-base">{member.name}</h3>
                  <p className="text-xs font-mono font-semibold text-blue-600">{member.memberCardNo}</p>
                </div>
              </div>
              <span className="text-[10px] font-bold uppercase px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
                {member.role}
              </span>
            </div>

            <div className="space-y-1.5 text-xs text-slate-600 border-t border-slate-100 pt-3">
              <div className="flex justify-between">
                <span className="text-slate-400">Department:</span>
                <span className="font-semibold text-slate-800">{member.department}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Active Borrowed Loans:</span>
                <span className="font-bold text-slate-900">
                  {member.currentActiveLoans} / {member.maxAllowedBooks} Max
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Pending Fines:</span>
                {(() => {
                  const pf = getMemberPendingFines(member.id, state);
                  return (
                    <span className={`font-bold ${pf > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                      ₹{pf.toFixed(2)}
                    </span>
                  );
                })()}
              </div>
            </div>

            <div className="pt-2 flex items-center gap-2">
              <button
                onClick={() => {
                  setSelectedCardModal(member);
                  setCardSide('front');
                }}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-800 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <CreditCard className="h-4 w-4 text-blue-600" /> Digital Card
              </button>

              <button
                type="button"
                onClick={() => {
                  const pending = getMemberPendingFines(member.id, state);
                  setNotificationModalData({
                    member: {
                      id: member.id,
                      name: member.name,
                      email: member.email,
                      memberCardNo: member.memberCardNo,
                      role: member.role,
                    },
                    context: {
                      type: pending > 0 ? 'FINE_DUE' : 'CUSTOM',
                      fineAmount: pending,
                    },
                  });
                }}
                className="p-2.5 rounded-xl border border-amber-200 bg-amber-50 hover:bg-amber-500 hover:text-white text-amber-800 transition-all cursor-pointer flex items-center justify-center shadow-2xs"
                title="Send Notification / Due Reminder to Member"
              >
                <Bell className="h-4 w-4" />
              </button>

              <button
                onClick={() => libraryStore.exportMemberCompleteProfileReportCSV(member.id)}
                className="p-2.5 rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 transition-all cursor-pointer flex items-center justify-center"
                title="Export Complete Member Activity Report (CSV)"
              >
                <Download className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Library Card Modal */}
      {selectedCardModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 space-y-4 border border-slate-200">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-900 text-lg sm:text-xl flex items-center gap-2.5 font-poppins">
                <CreditCard className="h-6 w-6 text-blue-600 shrink-0" /> Official University Library Pass
              </h3>
              <button
                onClick={() => setSelectedCardModal(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                aria-label="Close"
              >
                <X className="h-6 w-6 text-slate-500 hover:text-slate-900 shrink-0" />
              </button>
            </div>

            {/* Card Graphic */}
            <div className="bg-gradient-to-br from-slate-950 via-indigo-950 to-blue-950 text-white rounded-2xl p-5 shadow-xl space-y-3 relative overflow-hidden border-2 border-white/20 min-h-[220px] flex flex-col justify-between">
              {cardSide === 'front' ? (
                /* CARD FRONT */
                <>
                  <div className="flex justify-between items-center border-b border-white/15 pb-2">
                    <div>
                      <p className="text-[10px] font-extrabold uppercase tracking-wider text-blue-300 whitespace-nowrap">University Central Library</p>
                      <p className="text-[9px] text-slate-400 font-semibold whitespace-nowrap">Official Student / Member Pass</p>
                    </div>
                    <span className="px-2.5 py-0.5 text-[9px] font-extrabold uppercase bg-blue-500/30 border border-blue-400/30 rounded-md text-blue-200 shrink-0 whitespace-nowrap">
                      {selectedCardModal.role}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 py-1">
                    <img
                      src={selectedCardModal.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'}
                      alt={selectedCardModal.name}
                      className="w-16 h-16 rounded-xl object-cover border-2 border-amber-400/80 shadow-md shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <h4 className="text-base font-extrabold font-poppins text-white truncate leading-tight">{selectedCardModal.name}</h4>
                      <p className="font-mono text-xs font-extrabold text-amber-400 whitespace-nowrap">{selectedCardModal.memberCardNo}</p>
                      <p className="text-[11px] text-slate-300 truncate">Dept: {selectedCardModal.department}</p>
                      <p className="text-[10px] font-bold text-emerald-400 mt-0.5">● ACTIVE MEMBER</p>
                    </div>

                    <div
                      className="bg-white p-1.5 rounded-xl shadow-md shrink-0 w-16 h-16 flex items-center justify-center"
                      dangerouslySetInnerHTML={{
                        __html: generateQrSvgString(selectedCardModal.memberCardNo, 64),
                      }}
                    />
                  </div>

                  <div className="flex items-center justify-between border-t border-white/15 pt-2 text-[9px] text-slate-400 font-mono">
                    <span>Issued: {selectedCardModal.registeredDate || '2026-01-15'}</span>
                    <span>Valid Through: DEC 2028</span>
                    <span className="text-amber-400 font-bold">SECURITY VERIFIED</span>
                  </div>
                </>
              ) : (
                /* CARD BACK (CODE 128 BARCODE) */
                <>
                  <div className="flex justify-between items-center border-b border-white/15 pb-2">
                    <span className="text-xs font-bold text-amber-300 font-poppins flex items-center gap-1.5 whitespace-nowrap">
                      <Barcode className="w-4 h-4 text-amber-400" /> BARCODE & TURNSTILE ACCESS
                    </span>
                    <span className="font-mono text-xs font-bold text-slate-300 whitespace-nowrap">{selectedCardModal.memberCardNo}</span>
                  </div>

                  <div className="bg-white p-2.5 rounded-xl shadow-inner my-1 flex flex-col items-center justify-center">
                    <div
                      className="w-full flex justify-center"
                      dangerouslySetInnerHTML={{
                        __html: generateBarcodeSvgString(selectedCardModal.memberCardNo, { height: 40 }),
                      }}
                    />
                  </div>

                  <p className="text-[9px] text-slate-400 text-center border-t border-white/15 pt-1">
                    Present barcode at optical turnstiles, checkout desks, or RFID readers.
                  </p>
                </>
              )}
            </div>

            <div className="flex items-center justify-between gap-2 pt-2">
              <button
                onClick={() => setCardSide(cardSide === 'front' ? 'back' : 'front')}
                className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCw className="h-3.5 w-3.5 text-blue-600" /> Flip Pass
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePrintMemberCard(selectedCardModal)}
                  className="px-3.5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  Print Pass
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Export CSV Filter Modal */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 space-y-5 border border-slate-100 relative overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-50 border border-purple-100 text-purple-600 flex items-center justify-center font-bold shrink-0">
                  <FileSpreadsheet className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900 font-poppins">Export Member Registry Data</h2>
                  <p className="text-xs text-slate-500">Filter student and faculty records by role, department, account status, or borrowing activity.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowExportModal(false)}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Filter Selectors Grid */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Filter by Role</label>
                <select
                  value={exportRoleFilter}
                  onChange={(e) => setExportRoleFilter(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-bold text-slate-800 bg-slate-50"
                >
                  <option value="ALL">All Roles</option>
                  <option value="STUDENT">Student Scholars Only</option>
                  <option value="FACULTY">Faculty Members Only</option>
                  <option value="STAFF">Library Staff & Admin</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Academic Department</label>
                <select
                  value={exportDeptFilter}
                  onChange={(e) => setExportDeptFilter(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-medium text-slate-800 bg-slate-50"
                >
                  <option value="ALL">All Departments</option>
                  <option value="Computer Science & Engineering">Computer Science & Engineering</option>
                  <option value="Electrical & Electronics">Electrical & Electronics</option>
                  <option value="Mechanical Engineering">Mechanical Engineering</option>
                  <option value="Physics & Applied Science">Physics & Applied Science</option>
                  <option value="Mathematics & Statistics">Mathematics & Statistics</option>
                  <option value="Business Administration">Business Administration</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Account Status</label>
                <select
                  value={exportStatusFilter}
                  onChange={(e) => setExportStatusFilter(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-medium text-slate-800 bg-slate-50"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="ACTIVE">Active Accounts Only</option>
                  <option value="SUSPENDED">Suspended Accounts Only</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Borrowing & Fine Activity</label>
                <select
                  value={exportActivityFilter}
                  onChange={(e) => setExportActivityFilter(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-medium text-slate-800 bg-slate-50"
                >
                  <option value="ALL">All Members</option>
                  <option value="HAS_LOANS">Members with Active Loans</option>
                  <option value="HAS_FINES">Members with Overdue Fines</option>
                </select>
              </div>
            </div>

            {/* Filter Summary & Download Action */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <div className="text-xs font-semibold text-slate-600">
                Matching: <strong className="text-purple-700 font-bold">{getFilteredExportMembers().length}</strong> member records
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowExportModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 font-bold text-xs text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleExecuteCSVExport}
                  disabled={getFilteredExportMembers().length === 0}
                  className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Download className="h-4 w-4" /> Download CSV File
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <RegisterAccountModal
        isOpen={isRegisterModalOpen}
        onClose={() => setIsRegisterModalOpen(false)}
      />

      {notificationModalData && (
        <SendNotificationModal
          isOpen={!!notificationModalData}
          onClose={() => setNotificationModalData(null)}
          initialMember={notificationModalData.member}
          initialContext={notificationModalData.context}
          onSuccess={(msg) => {
            setToastMessage(msg);
            setTimeout(() => setToastMessage(null), 4000);
          }}
        />
      )}
    </div>
  );
}

