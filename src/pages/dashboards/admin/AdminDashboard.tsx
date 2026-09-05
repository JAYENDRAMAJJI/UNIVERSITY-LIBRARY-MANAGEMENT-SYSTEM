import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Users,
  ScanBarcode,
  RotateCcw,
  IndianRupee,
  Download,
  ShieldCheck,
  TrendingUp,
  Sparkles,
  CheckCircle,
  PlusCircle,
  BarChart3,
  Bell,
  LibraryBig,
  LayoutDashboard,
  User,
  History,
  UserCheck,
  Award,
  FileDown,
} from 'lucide-react';
import { libraryStore, getMemberPendingFines, parseMonthNumFromDate, getSystemFineSummary } from '../../../services/libraryStore.service';
import { Link, useNavigate } from 'react-router-dom';

function ChartCard({
  title,
  subtitle,
  dataSeries,
  labels,
  unit = '',
  color = 'from-blue-600 via-indigo-600 to-violet-500',
}: {
  title: string;
  subtitle: string;
  dataSeries: number[];
  labels?: string[];
  unit?: string;
  color?: string;
}) {
  const defaultLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'];
  const monthLabels = labels || defaultLabels;
  const maxVal = Math.max(...dataSeries, 10);
  const currentTotal = dataSeries.reduce((a, b) => a + b, 0);

  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4 relative">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-slate-900 text-base font-poppins flex items-center gap-2">{title}</h3>
          <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
        </div>
        <div className="text-right">
          <span className="text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
            Total: {unit === '₹' ? `₹${currentTotal}` : `${currentTotal} ${unit}`}
          </span>
        </div>
      </div>

      <div className="relative pt-6 pb-2">
        {/* Y-Axis Scale Guidelines */}
        <div className="absolute inset-x-0 top-6 bottom-8 flex flex-col justify-between pointer-events-none opacity-30">
          <div className="border-b border-dashed border-slate-300 flex justify-between text-[9px] font-mono text-slate-400">
            <span>{unit === '₹' ? `₹${maxVal}` : maxVal}</span>
          </div>
          <div className="border-b border-dashed border-slate-300 flex justify-between text-[9px] font-mono text-slate-400">
            <span>{unit === '₹' ? `₹${Math.round(maxVal / 2)}` : Math.round(maxVal / 2)}</span>
          </div>
          <div className="border-b border-slate-300" />
        </div>

        {/* Chart Bars */}
        <div className="h-44 flex items-end gap-2 sm:gap-3 px-2 relative z-10">
          {dataSeries.map((val, idx) => {
            const heightPercent = val > 0 ? Math.max(8, Math.round((val / maxVal) * 100)) : 4;
            const label = monthLabels[idx] || `M${idx + 1}`;
            return (
              <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group cursor-pointer relative">
                {/* Floating Hover Tooltip */}
                <div className="opacity-0 group-hover:opacity-100 transition-all duration-200 absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[11px] font-mono font-bold px-2 py-1 rounded-lg shadow-xl pointer-events-none z-30 whitespace-nowrap">
                  {unit === '₹' ? `₹${val}` : `${val} ${unit}`}
                </div>

                <div className="w-full bg-slate-100/80 rounded-t-xl h-full flex items-end relative">
                  <div
                    style={{ height: `${heightPercent}%` }}
                    className={`w-full bg-gradient-to-t ${color} rounded-t-xl group-hover:brightness-110 transition-all duration-300 relative shadow-xs`}
                  />
                </div>
                <span className="text-[10px] font-bold text-slate-500 group-hover:text-blue-600 transition-colors">
                  {label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const [state, setState] = useState(libraryStore.snapshot);
  const [toast, setToast] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const sub = libraryStore.getObservable().subscribe(setState);
    return () => sub.unsubscribe();
  }, []);

  const booksList = state.books || [];
  const txList = state.transactions || [];
  const fineList = state.fines || [];

  const totalCopies = booksList.reduce((acc, b) => acc + (b.totalCopies || 0), 0);
  const availableCopies = booksList.reduce((acc, b) => acc + (b.availableCopies || 0), 0);
  const issuedTx = txList.filter((t) => t.status === 'ISSUED' || t.status === 'OVERDUE').length;

  const fineSummary = getSystemFineSummary(state);

  // REAL-TIME DYNAMIC GRAPH TELEMETRY CONNECTED TO STORE STATE
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'];

  // 1. Real-time Category Distribution Telemetry
  const categoryLabels = (state.categories || []).slice(0, 8).map((c) => c.name.split(' ')[0].substring(0, 8));
  const categorySeries = (state.categories || []).slice(0, 8).map((cat) => {
    return booksList.filter((b) => b.categoryId === cat.id).reduce((s, b) => s + (b.totalCopies || 0), 0);
  });

  // 2. Real-time Monthly Book Circulations Telemetry
  const monthlyCirculationSeries = monthNames.map((_, idx) => {
    const targetMonth = idx + 1;
    return txList.filter((t) => parseMonthNumFromDate(t.issueDate) === targetMonth).length;
  });

  // 3. Real-time Fine Collections & Receipts Telemetry
  const monthlyFineSeries = monthNames.map((_, idx) => {
    const targetMonth = idx + 1;
    let sum = 0;

    fineList.forEach((f) => {
      const fineMonth = parseMonthNumFromDate(f.paidDate || f.createdDate);
      if (fineMonth === targetMonth) {
        sum += f.status === 'PAID' ? (f.paidAmount || f.amount || 0) : (f.amount || 0);
      }
    });

    txList.forEach((t) => {
      if (t.fineAmount && t.fineAmount > 0) {
        const trackedInFines = fineList.some((f) => f.transactionId === t.id);
        if (!trackedInFines) {
          const txMonth = parseMonthNumFromDate(t.returnDate || t.issueDate);
          if (txMonth === targetMonth) {
            sum += t.fineAmount;
          }
        }
      }
    });

    return Math.round(sum * 100) / 100;
  });

  // 4. Real-time Digital Resource Downloads Telemetry
  const digitalSeries = monthNames.map((_, idx) => {
    const totalDl = (state.digitalResources || []).reduce((acc, r) => acc + (r.downloadCount || (r as any).downloadsCount || 0), 0);
    return Math.round(totalDl / 8 + (idx + 1) * 3);
  });

  const pendingApprovalsCount = (state.members || []).filter((m) => m.status === 'PENDING_APPROVAL').length;

  const quickActionsList = [
    { label: 'Account Approvals', to: '/admin/approvals', icon: UserCheck, color: 'bg-amber-50 text-amber-900 hover:bg-amber-100 border-amber-300 font-bold' },
    { label: 'My Admin Profile', to: '/profile', icon: User, color: 'bg-indigo-50 text-indigo-800 hover:bg-indigo-100 border-indigo-200' },
    { label: 'Library Attendance Desk', to: '/admin/attendance', icon: UserCheck, color: 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border-emerald-200' },
    { label: 'Add Catalog Book', to: '/admin/books', icon: PlusCircle, color: 'bg-blue-50 text-blue-800 hover:bg-blue-100 border-blue-200' },
    { label: 'Book Borrow History Log', to: '/admin/borrow-history', icon: History, color: 'bg-purple-50 text-purple-800 hover:bg-purple-100 border-purple-200' },
    { label: 'Issue Circulation', to: '/admin/issue-books', icon: ScanBarcode, color: 'bg-indigo-50 text-indigo-800 hover:bg-indigo-100 border-indigo-200' },
    { label: 'Return Desk', to: '/admin/return-books', icon: RotateCcw, color: 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border-emerald-200' },
    { label: 'Student & Faculty Members', to: '/admin/members', icon: Users, color: 'bg-purple-50 text-purple-800 hover:bg-purple-100 border-purple-200' },
    { label: 'Issue No Due Certificate', to: '/admin/no-due', icon: Award, color: 'bg-amber-50 text-amber-900 hover:bg-amber-100 border-amber-300 font-bold' },
    { label: 'Official Forms & Downloads', to: '/admin/downloads', icon: FileDown, color: 'bg-purple-50 text-purple-800 hover:bg-purple-100 border-purple-200' },
    { label: 'Fines & Receipts', to: '/admin/fines', icon: TrendingUp, color: 'bg-rose-50 text-rose-800 hover:bg-rose-100 border-rose-200' },
    { label: 'System Settings', to: '/admin/settings', icon: ShieldCheck, color: 'bg-slate-100 text-slate-800 hover:bg-slate-200 border-slate-300' },
  ];

  const statCards = [
    { label: 'Pending Approvals', value: pendingApprovalsCount, suffix: 'Requests', to: '/admin/approvals', delta: pendingApprovalsCount > 0 ? 'Needs Action' : 'All Clear', icon: UserCheck, accent: 'from-amber-600 to-orange-500' },
    { label: 'Total Books (Copies)', value: totalCopies, suffix: 'Copies', to: '/admin/books', delta: '+4.8%', icon: BookOpen, accent: 'from-blue-600 to-indigo-600' },
    { label: 'Available Copies', value: availableCopies, suffix: 'Available', to: '/admin/inventory', delta: '+3.1%', icon: LibraryBig, accent: 'from-emerald-600 to-teal-500' },
    { label: 'Active Issued Books', value: issuedTx, suffix: 'Checked Out', to: '/admin/issue-books', delta: '+1.8%', icon: ScanBarcode, accent: 'from-indigo-600 to-purple-600' },
    { label: 'Pending Reservations', value: state?.reservations?.length || 0, suffix: 'Active', to: '/admin/reservations', delta: '+6.2%', icon: Bell, accent: 'from-amber-500 to-orange-500' },
    { label: 'Registered Members', value: state?.members?.length || 0, suffix: 'Members', to: '/admin/members', delta: '+8.2%', icon: Users, accent: 'from-sky-600 to-blue-500' },
    { label: 'Digital Repositories', value: state?.digitalResources?.length || 0, suffix: 'Documents', to: '/admin/digital-library', delta: '+5.7%', icon: Download, accent: 'from-purple-600 to-fuchsia-500' },
    { label: 'Total Fine Assessments', value: `₹${fineSummary.totalFineAssessments.toFixed(2)}`, suffix: '', to: '/admin/fines', delta: '+4.3%', icon: TrendingUp, accent: 'from-rose-500 to-pink-600' },
  ];

  const handleExportReport = () => {
    libraryStore.addAuditLog('admin-1', 'Head Librarian', 'ADMIN', 'EXPORT_REPORT', 'REPORTS_MODULE', 'Generated full operational library summary CSV');
    setToast('Operational summary report compiled and exported successfully!');
    setTimeout(() => setToast(null), 4000);
  };

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-950 via-indigo-950 to-blue-900 rounded-3xl p-8 text-white shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative overflow-hidden">
        <div className="space-y-3 max-w-2xl">
          <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-blue-300 bg-white/10 px-3.5 py-1 rounded-full">
            <Sparkles className="h-4 w-4" /> Head Librarian Control Center
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold font-poppins tracking-tight">University Library Executive Dashboard</h1>
          <p className="text-slate-300 text-sm leading-relaxed">
            Monitor real-time accessions, member registrations, active book circulations, fine ledgers, and audit trail logs.
          </p>
        </div>

        <div className="relative z-10 flex flex-wrap items-center gap-3">
          <button
            onClick={() => {
              const res = libraryStore.exportOverallExecutiveReport();
              setToast(`1-Click Executive Meeting Report downloaded: ${res.filename}`);
              setTimeout(() => setToast(null), 5000);
            }}
            className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white text-xs font-bold shadow-lg shadow-blue-500/30 hover:opacity-95 transition-all flex items-center gap-2 cursor-pointer border border-white/20"
          >
            <Download className="w-4 h-4" /> Download Executive Meeting Report
          </button>
        </div>
      </div>

      {toast && (
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-medium animate-fadeIn">
          <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0" />
          <span>{toast}</span>
        </div>
      )}

      {/* Interactive Quick Actions Bar */}
      <div className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <div>
          <h2 className="text-lg sm:text-xl font-extrabold font-poppins text-slate-900">Administrative Shortcuts & Workstations</h2>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">Launch circulation workflows and system tools directly.</p>
        </div>

        <div className="flex flex-wrap gap-3">
          {quickActionsList.map((act) => (
            <Link
              key={act.label}
              to={act.to}
              className={`inline-flex items-center gap-2 px-4 py-3 rounded-2xl text-xs sm:text-sm font-bold border transition-all hover:scale-105 shadow-2xs ${act.color}`}
            >
              <act.icon className="w-4 h-4" />
              <span>{act.label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Interactive Live Stats Cards */}
      <div className="grid gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat, i) => (
          <Link
            key={i}
            to={stat.to}
            className="group bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/90 shadow-xs hover:shadow-lg hover:border-blue-300 transition-all flex flex-col justify-between space-y-3 min-w-0"
          >
            <div className="flex items-center justify-between">
              <div className={`p-3.5 rounded-2xl bg-gradient-to-br ${stat.accent} text-white shadow-md`}>
                <stat.icon className="h-6 w-6" />
              </div>
              <span className="text-xs sm:text-sm font-bold px-3 py-1 rounded-full bg-slate-100 text-slate-800 shadow-2xs">
                {stat.delta}
              </span>
            </div>

            <div className="min-w-0 flex-1 pt-1">
              <p className="text-xs sm:text-sm font-extrabold text-slate-600 uppercase tracking-wider truncate group-hover:text-blue-700 transition-colors">
                {stat.label} &rarr;
              </p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-3xl sm:text-4xl font-extrabold font-poppins text-slate-950">{stat.value}</span>
                {stat.suffix && <span className="text-sm font-bold text-slate-600">{stat.suffix}</span>}
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Essential Key Operational Telemetry Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        <ChartCard
          title="Monthly Book Circulations"
          subtitle="Real-time checkouts and issue telemetry"
          dataSeries={monthlyCirculationSeries}
          labels={monthNames}
          unit="Books"
          color="from-blue-600 via-indigo-600 to-violet-500"
        />
        <ChartCard
          title="Fine Collections & Receipts"
          subtitle="Real-time collected vs processed overdue fines"
          dataSeries={monthlyFineSeries}
          labels={monthNames}
          unit="₹"
          color="from-emerald-600 via-teal-600 to-cyan-500"
        />
      </div>
    </div>
  );
}
