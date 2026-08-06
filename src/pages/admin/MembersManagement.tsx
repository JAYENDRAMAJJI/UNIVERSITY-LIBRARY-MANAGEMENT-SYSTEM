import { useState, useEffect } from 'react';
import { Users, Search, QrCode, CreditCard, Printer, CheckCircle, Shield, AlertTriangle, UserPlus } from 'lucide-react';
import { libraryStore } from '../../services/libraryStore.service';
import { MemberProfile } from '../../types/library';
import RegisterAccountModal from '../../components/common/RegisterAccountModal';

export default function MembersManagement() {
  const [state, setState] = useState(libraryStore.snapshot);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('ALL');
  const [selectedCardModal, setSelectedCardModal] = useState<MemberProfile | null>(null);
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
          className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-xs shadow-md hover:opacity-95 transition-all flex items-center gap-2"
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
            className="px-3 py-2 rounded-lg border border-slate-200 text-sm font-medium bg-white"
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

            <div className="pt-2">
              <button
                onClick={() => setSelectedCardModal(member)}
                className="w-full py-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-800 transition-all flex items-center justify-center gap-2"
              >
                <CreditCard className="h-4 w-4 text-blue-600" /> Digital Library Card
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Library Card Modal */}
      {selectedCardModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-blue-600" /> Official University Library Card
              </h3>
              <button onClick={() => setSelectedCardModal(null)} className="text-xl font-bold">&times;</button>
            </div>

            {/* Card Graphic */}
            <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-blue-900 text-white rounded-2xl p-5 shadow-lg space-y-4 relative overflow-hidden">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-blue-300">University Library Services</p>
                  <h4 className="text-base font-bold font-poppins mt-0.5">{selectedCardModal.name}</h4>
                  <p className="text-xs text-slate-300">{selectedCardModal.department}</p>
                </div>
                <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase bg-blue-500/30 border border-blue-400/40 rounded text-blue-200">
                  {selectedCardModal.role}
                </span>
              </div>

              <div className="flex items-end justify-between pt-4 border-t border-white/10">
                <div>
                  <p className="text-[9px] uppercase tracking-wider text-slate-400">Library ID Card Number</p>
                  <p className="font-mono text-sm font-bold text-amber-400">{selectedCardModal.memberCardNo}</p>
                </div>
                <div className="bg-white p-1.5 rounded-lg shadow-sm">
                  <QrCode className="h-10 w-10 text-slate-950" />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => window.print()} className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold flex items-center gap-2">
                <Printer className="h-4 w-4" /> Print Library Card
              </button>
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
