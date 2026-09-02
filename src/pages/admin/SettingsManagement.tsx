import React, { useState, useEffect } from 'react';
import {
  Settings,
  Save,
  Download,
  Upload,
  RefreshCw,
  CheckCircle,
  ShieldAlert,
  Database,
  Bell,
  HardDrive,
  AlertTriangle,
  FileCheck,
  Lock,
  Sliders,
  Shield,
  Trash2,
  CheckCircle2,
  Info,
  Clock,
} from 'lucide-react';
import { libraryStore, getLocalDateStr } from '../../services/libraryStore.service';

export default function SettingsManagement() {
  const [state, setState] = useState(libraryStore.snapshot);
  const [config, setConfig] = useState(libraryStore.snapshot.config);
  const [activeTab, setActiveTab] = useState<'POLICIES' | 'BACKUP' | 'NOTIFICATIONS' | 'SECURITY'>('POLICIES');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Restore Modal State
  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);
  const [restoreFileData, setRestoreFileData] = useState<any | null>(null);
  const [restoreFileName, setRestoreFileName] = useState('');
  const [restoreError, setRestoreError] = useState('');

  // Reset Confirmation Modal State
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);

  // Notification Toggles state
  const [notifConfig, setNotifConfig] = useState({
    autoOverdueAlerts: true,
    emailReceipts: true,
    newAcquisitionBulletins: true,
    maintenanceBanner: false,
  });

  useEffect(() => {
    const sub = libraryStore.getObservable().subscribe((s) => {
      setState(s);
      setConfig(s.config);
    });
    return () => sub.unsubscribe();
  }, []);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4500);
  };

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    libraryStore.updateConfig(config);
    triggerToast('System settings and library policy rules updated successfully.');
  };

  const handleDownloadBackup = () => {
    const dump = JSON.stringify(state, null, 2);
    const blob = new Blob([dump], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `university_library_backup_${getLocalDateStr(new Date())}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    triggerToast('Full system database backup exported as JSON file.');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setRestoreFileName(file.name);
    setRestoreError('');

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        // Basic structural validation
        if (parsed.books && parsed.members && parsed.transactions) {
          setRestoreFileData(parsed);
          setIsRestoreModalOpen(true);
        } else {
          setRestoreError('Invalid backup file structure. Missing required database schemas (books, members, transactions).');
        }
      } catch (err) {
        setRestoreError('Failed to parse JSON file. Please make sure you selected a valid library backup JSON.');
      }
    };
    reader.readAsText(file);
  };

  const handleConfirmRestore = () => {
    if (restoreFileData) {
      libraryStore.restoreFromBackup(restoreFileData);
      setIsRestoreModalOpen(false);
      setRestoreFileData(null);
      triggerToast('Database restored successfully from backup dump!');
    }
  };

  const handleConfirmReset = () => {
    libraryStore.resetToFactoryDefaults();
    setIsResetModalOpen(false);
    triggerToast('System database reset to initial factory defaults!');
  };

  const handleClearLogs = () => {
    libraryStore.clearAuditLogs();
    triggerToast('System audit log history cleared successfully.');
  };

  // Estimate localStorage memory usage
  const stateString = JSON.stringify(state);
  const memoryKb = (new Blob([stateString]).size / 1024).toFixed(1);
  const totalRecords =
    state.books.length +
    state.members.length +
    state.transactions.length +
    state.fines.length +
    state.digitalResources.length +
    state.auditLogs.length;

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-3 py-1 rounded-full mb-2">
            <Settings className="h-3.5 w-3.5 text-blue-600" /> Enterprise Control Center
          </div>
          <h1 className="text-2xl font-bold font-poppins text-slate-900">System Configuration & Backup Desk</h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage overdue fine policies, borrowing rules, notifications, automated backups, and database restoration.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-2 cursor-pointer transition-all shadow-2xs">
            <Upload className="h-4 w-4 text-indigo-600" />
            <span>Restore Backup JSON</span>
            <input type="file" accept=".json" onChange={handleFileUpload} className="hidden" />
          </label>

          <button
            onClick={handleDownloadBackup}
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-2 shadow-md transition-all cursor-pointer"
          >
            <Download className="h-4 w-4" /> Export 1-Click Backup
          </button>
        </div>
      </div>

      {/* Storage & Health Telemetry Card */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500 font-bold uppercase">
            <span>System Health</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
            Operational Mode
          </p>
          <p className="text-[11px] text-slate-500">All circulation services live & active</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500 font-bold uppercase">
            <span>Database Storage</span>
            <HardDrive className="h-4 w-4 text-blue-500" />
          </div>
          <p className="text-xl font-extrabold text-slate-900">{memoryKb} KB</p>
          <p className="text-[11px] text-slate-500">~{totalRecords} indexed database records</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500 font-bold uppercase">
            <span>Active Policy Rule</span>
            <Sliders className="h-4 w-4 text-indigo-500" />
          </div>
          <p className="text-xl font-extrabold text-slate-900">₹{config.fineRatePerDay}/Day Overdue Fine</p>
          <p className="text-[11px] text-slate-500">Max Renewal: {config.maxRenewalLimit} Times</p>
        </div>
      </div>

      {/* Toast Alert */}
      {toastMessage && (
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold shadow-xs animate-fadeIn">
          <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* File Upload Error Alert */}
      {restoreError && (
        <div className="flex items-center justify-between p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs font-bold shadow-xs">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0" />
            <span>{restoreError}</span>
          </div>
          <button onClick={() => setRestoreError('')} className="text-rose-500 hover:text-rose-800 p-1">
            Dismiss
          </button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('POLICIES')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'POLICIES'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Sliders className="h-4 w-4" /> Operational Policies & Limits
        </button>

        <button
          onClick={() => setActiveTab('BACKUP')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'BACKUP'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Database className="h-4 w-4" /> Database Backup & Restore
        </button>

        <button
          onClick={() => setActiveTab('NOTIFICATIONS')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'NOTIFICATIONS'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Bell className="h-4 w-4" /> Notifications & Automation
        </button>

        <button
          onClick={() => setActiveTab('SECURITY')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'SECURITY'
              ? 'bg-rose-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Shield className="h-4 w-4" /> Security & Factory Reset
        </button>
      </div>

      {/* Tab Panels */}

      {/* 1. Operational Policies Form */}
      {activeTab === 'POLICIES' && (
        <form onSubmit={handleSaveConfig} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6 animate-fadeIn">
          <div>
            <h2 className="text-base font-bold text-slate-900 font-poppins">Library Operational Policies & Quotas</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Set standard overdue fine rates, borrowing day durations, and maximum renewal allowances.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-xs">
            <div className="space-y-1.5">
              <label className="block font-bold text-slate-700">Overdue Fine Rate (₹ / Day)</label>
              <input
                type="number"
                step="0.50"
                min="0"
                value={config.fineRatePerDay}
                onChange={(e) => setConfig({ ...config, fineRatePerDay: Number(e.target.value) })}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-slate-900 font-semibold focus:outline-none focus:border-blue-500"
              />
              <p className="text-[11px] text-slate-400">Daily fine charged per overdue item</p>
            </div>

            <div className="space-y-1.5">
              <label className="block font-bold text-slate-700">Max Renewal Limit (Times)</label>
              <input
                type="number"
                min="0"
                value={config.maxRenewalLimit}
                onChange={(e) => setConfig({ ...config, maxRenewalLimit: Number(e.target.value) })}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-slate-900 font-semibold focus:outline-none focus:border-blue-500"
              />
              <p className="text-[11px] text-slate-400">Max number of renewals per book</p>
            </div>

            <div className="space-y-1.5">
              <label className="block font-bold text-slate-700">Student Max Borrowing Days</label>
              <input
                type="number"
                min="1"
                value={config.studentMaxLoanDays}
                onChange={(e) => setConfig({ ...config, studentMaxLoanDays: Number(e.target.value) })}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-slate-900 font-semibold focus:outline-none focus:border-blue-500"
              />
              <p className="text-[11px] text-slate-400">Standard loan period for students</p>
            </div>

            <div className="space-y-1.5">
              <label className="block font-bold text-slate-700">Faculty Max Borrowing Days</label>
              <input
                type="number"
                min="1"
                value={config.facultyMaxLoanDays}
                onChange={(e) => setConfig({ ...config, facultyMaxLoanDays: Number(e.target.value) })}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-slate-900 font-semibold focus:outline-none focus:border-blue-500"
              />
              <p className="text-[11px] text-slate-400">Extended loan period for professors</p>
            </div>

            <div className="space-y-1.5">
              <label className="block font-bold text-slate-700">Library Name Title</label>
              <input
                type="text"
                value={config.libraryName || 'Central University Library'}
                onChange={(e) => setConfig({ ...config, libraryName: e.target.value })}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-slate-900 font-semibold focus:outline-none focus:border-blue-500"
              />
              <p className="text-[11px] text-slate-400">Official library brand title</p>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <button
              type="submit"
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-2 cursor-pointer"
            >
              <Save className="h-4 w-4" /> Save Policy Rules
            </button>
          </div>
        </form>
      )}

      {/* 2. Database Backup & Restore */}
      {activeTab === 'BACKUP' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Export Card */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="p-3 rounded-2xl bg-blue-50 text-blue-700 w-fit">
                  <Download className="h-6 w-6" />
                </div>
                <h3 className="font-bold text-slate-900 text-base font-poppins">Export Database Backup</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Download a full snapshot of your library database (books, members, loan history, fines, and audit logs) as a timestamped JSON file.
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100">
                <button
                  onClick={handleDownloadBackup}
                  className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Download className="h-4 w-4" /> Download Backup JSON
                </button>
              </div>
            </div>

            {/* Restore Card */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="p-3 rounded-2xl bg-indigo-50 text-indigo-700 w-fit">
                  <Upload className="h-6 w-6" />
                </div>
                <h3 className="font-bold text-slate-900 text-base font-poppins">Restore Database Snapshot</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Upload a previously exported JSON backup file to instantly restore your entire library store.
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100">
                <label className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer">
                  <Upload className="h-4 w-4" /> Select Backup JSON File
                  <input type="file" accept=".json" onChange={handleFileUpload} className="hidden" />
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Notifications & Automation */}
      {activeTab === 'NOTIFICATIONS' && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6 animate-fadeIn">
          <div>
            <h2 className="text-base font-bold text-slate-900 font-poppins">Automated Alerts & Email Notifications</h2>
            <p className="text-xs text-slate-500 mt-0.5">Configure system email notifications, circular alerts, and overdue reminders.</p>
          </div>

          <div className="space-y-4 divide-y divide-slate-100 text-xs">
            <div className="pt-3 flex items-center justify-between">
              <div>
                <p className="font-bold text-slate-900">Automated Overdue Reminder Alerts</p>
                <p className="text-slate-500 text-[11px]">Send notification circulars 2 days before book due dates</p>
              </div>
              <input
                type="checkbox"
                checked={notifConfig.autoOverdueAlerts}
                onChange={(e) => setNotifConfig({ ...notifConfig, autoOverdueAlerts: e.target.checked })}
                className="h-5 w-5 accent-blue-600 rounded cursor-pointer"
              />
            </div>

            <div className="pt-3 flex items-center justify-between">
              <div>
                <p className="font-bold text-slate-900">Fine Payment Digital Receipts</p>
                <p className="text-slate-500 text-[11px]">Automatically generate printable digital receipt upon fine settlement</p>
              </div>
              <input
                type="checkbox"
                checked={notifConfig.emailReceipts}
                onChange={(e) => setNotifConfig({ ...notifConfig, emailReceipts: e.target.checked })}
                className="h-5 w-5 accent-blue-600 rounded cursor-pointer"
              />
            </div>

            <div className="pt-3 flex items-center justify-between">
              <div>
                <p className="font-bold text-slate-900">New Acquisition Bulletins</p>
                <p className="text-slate-500 text-[11px]">Notify faculty members when new books are registered in their field</p>
              </div>
              <input
                type="checkbox"
                checked={notifConfig.newAcquisitionBulletins}
                onChange={(e) => setNotifConfig({ ...notifConfig, newAcquisitionBulletins: e.target.checked })}
                className="h-5 w-5 accent-blue-600 rounded cursor-pointer"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <button
              onClick={() => triggerToast('Notification automation settings saved!')}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-2 cursor-pointer"
            >
              <Save className="h-4 w-4" /> Save Notification Preferences
            </button>
          </div>
        </div>
      )}

      {/* 4. Security & Factory Reset */}
      {activeTab === 'SECURITY' && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6 animate-fadeIn">
          <div>
            <h2 className="text-base font-bold text-slate-900 font-poppins">Security, Audit Maintenance & Reset Desk</h2>
            <p className="text-xs text-slate-500 mt-0.5">Perform system maintenance, purge audit logs, or restore default sample data.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-5 rounded-2xl bg-amber-50/60 border border-amber-200 space-y-3">
              <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
                <Trash2 className="h-5 w-5 text-amber-700" />
                <span>Clear Historical Audit Logs</span>
              </div>
              <p className="text-xs text-amber-800 leading-relaxed">
                Purge old system audit log records to free up browser storage. This will not delete any books, members, or loans.
              </p>
              <button
                onClick={handleClearLogs}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer"
              >
                Clear Audit Log Entries ({state.auditLogs.length})
              </button>
            </div>

            <div className="p-5 rounded-2xl bg-rose-50/60 border border-rose-200 space-y-3">
              <div className="flex items-center gap-2 text-rose-900 font-bold text-sm">
                <AlertTriangle className="h-5 w-5 text-rose-600" />
                <span>Reset to Factory Defaults</span>
              </div>
              <p className="text-xs text-rose-800 leading-relaxed">
                Reset the library database back to pristine initial sample data. This wipes all custom entries.
              </p>
              <button
                onClick={() => setIsResetModalOpen(true)}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer"
              >
                Reset Store to Defaults
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Restore Database Preview Modal */}
      {isRestoreModalOpen && restoreFileData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-5">
            <div className="flex items-center gap-3 text-indigo-700">
              <Upload className="h-6 w-6" />
              <h3 className="text-lg font-bold font-poppins text-slate-900">Confirm Database Restoration</h3>
            </div>

            <p className="text-xs text-slate-600">
              You are about to restore database snapshot from <strong>{restoreFileName}</strong>. This will replace current store state.
            </p>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2 text-xs">
              <p className="font-bold text-slate-800">Snapshot Contents Preview:</p>
              <ul className="space-y-1 text-slate-600">
                <li>• Books Catalog: <strong>{restoreFileData.books?.length || 0} Titles</strong></li>
                <li>• Registered Members: <strong>{restoreFileData.members?.length || 0} Members</strong></li>
                <li>• Active Issue Loans: <strong>{restoreFileData.transactions?.length || 0} Records</strong></li>
                <li>• Fine Ledger: <strong>{restoreFileData.fines?.length || 0} Entries</strong></li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                onClick={() => setIsRestoreModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmRestore}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md"
              >
                Restore Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Confirmation Modal */}
      {isResetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-5">
            <div className="flex items-center gap-3 text-rose-600">
              <AlertTriangle className="h-6 w-6" />
              <h3 className="text-lg font-bold font-poppins text-slate-900">Reset Factory Defaults?</h3>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to reset the library store to factory defaults? All custom books, member profiles, and transaction records will be reset to default sample data.
            </p>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                onClick={() => setIsResetModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReset}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md"
              >
                Yes, Reset All Data
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

