import { useState, useEffect } from 'react';
import { Users, Search, CreditCard, Printer, Download, CheckCircle, Shield, AlertTriangle, UserPlus, RotateCw, Barcode, BookOpen } from 'lucide-react';
import { libraryStore } from '../../services/libraryStore.service';
import { MemberProfile } from '../../types/library';
import RegisterAccountModal from '../../components/common/RegisterAccountModal';
import { generateQrSvgString, generateBarcodeSvgString, svgToDataUrl } from '../../utils/barcodeQrGenerator';

export default function MembersManagement() {
  const [state, setState] = useState(libraryStore.snapshot);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('ALL');
  const [selectedCardModal, setSelectedCardModal] = useState<MemberProfile | null>(null);
  const [cardSide, setCardSide] = useState<'front' | 'back'>('front');
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);

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
                <span>Valid Thru: DEC 2028</span>
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
                • Present card at library turnstiles, borrowing counters, and RFID gates.<br/>
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
        <button
          onClick={() => setIsRegisterModalOpen(true)}
          className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-xs shadow-md hover:opacity-95 transition-all flex items-center gap-2 cursor-pointer"
        >
          <UserPlus className="h-4 w-4" /> Register New Member
        </button>
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
                <span className={`font-bold ${member.pendingFines > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                  ₹{member.pendingFines.toFixed(2)}
                </span>
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
              <h3 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2 font-poppins">
                <CreditCard className="h-5 w-5 text-blue-600" /> Official University Library Pass
              </h3>
              <button
                onClick={() => setSelectedCardModal(null)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                &times;
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
                    <span>Valid Thru: DEC 2028</span>
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
                  onClick={() => libraryStore.printMemberCompleteProfileReport(selectedCardModal.id)}
                  className="px-3 py-2.5 bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                  title="Print / Save PDF Member Dossier Report"
                >
                  <Printer className="h-3.5 w-3.5 text-purple-600" /> Report PDF
                </button>

                <button
                  onClick={() => libraryStore.exportMemberCompleteProfileReportCSV(selectedCardModal.id)}
                  className="px-3 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                  title="Export Raw CSV Data"
                >
                  <Download className="h-3.5 w-3.5 text-blue-600" /> Export CSV
                </button>

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

      <RegisterAccountModal
        isOpen={isRegisterModalOpen}
        onClose={() => setIsRegisterModalOpen(false)}
      />
    </div>
  );
}

