import React, { useState, useEffect } from 'react';
import { Settings, Save, Download, RefreshCw, CheckCircle, ShieldAlert } from 'lucide-react';
import { libraryStore, getLocalDateStr } from '../../services/libraryStore.service';

export default function SettingsManagement() {
  const [state, setState] = useState(libraryStore.snapshot);
  const [config, setConfig] = useState(libraryStore.snapshot.config);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    const sub = libraryStore.getObservable().subscribe((s) => {
      setState(s);
      setConfig(s.config);
    });
    return () => sub.unsubscribe();
  }, []);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
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
    link.setAttribute('download', `library_backup_${getLocalDateStr(new Date())}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    triggerToast('System database backup dump downloaded as JSON.');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-700 bg-slate-100 px-3 py-1 rounded-full mb-2">
            <Settings className="h-3.5 w-3.5 text-blue-600" /> Administrative Preferences
          </div>
          <h1 className="text-2xl font-bold font-poppins text-slate-900">System Configuration & Backup</h1>
          <p className="text-sm text-slate-500 mt-1">Configure overdue fine rates, borrowing day limits, email alerts, and perform JSON database backups.</p>
        </div>
        <button
          onClick={handleDownloadBackup}
          className="px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800 text-xs font-semibold flex items-center gap-2"
        >
          <Download className="h-4 w-4 text-blue-600" /> Export Database JSON Backup
        </button>
      </div>

      {toastMessage && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-medium">
          <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Settings Form */}
      <form onSubmit={handleSaveConfig} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
        <h2 className="text-lg font-bold text-slate-900 border-b pb-3">Library Operational Policies</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Overdue Fine Rate (₹ / Day)</label>
            <input
              type="number"
              step="0.10"
              value={config.fineRatePerDay}
              onChange={(e) => setConfig({ ...config, fineRatePerDay: Number(e.target.value) })}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Max Renewal Limit</label>
            <input
              type="number"
              value={config.maxRenewalLimit}
              onChange={(e) => setConfig({ ...config, maxRenewalLimit: Number(e.target.value) })}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Student Max Borrowing Days</label>
            <input
              type="number"
              value={config.studentMaxLoanDays}
              onChange={(e) => setConfig({ ...config, studentMaxLoanDays: Number(e.target.value) })}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Faculty Max Borrowing Days</label>
            <input
              type="number"
              value={config.facultyMaxLoanDays}
              onChange={(e) => setConfig({ ...config, facultyMaxLoanDays: Number(e.target.value) })}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
        </div>

        <div className="pt-4 border-t flex justify-end gap-3">
          <button
            type="button"
            onClick={() => libraryStore.resetToFactoryDefaults()}
            className="px-4 py-2 text-xs font-semibold text-rose-600 border border-rose-200 rounded-xl hover:bg-rose-50"
          >
            Reset Factory Defaults
          </button>
          <button type="submit" className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-semibold shadow-md flex items-center gap-2">
            <Save className="h-4 w-4" /> Save Policy Rules
          </button>
        </div>
      </form>
    </div>
  );
}
