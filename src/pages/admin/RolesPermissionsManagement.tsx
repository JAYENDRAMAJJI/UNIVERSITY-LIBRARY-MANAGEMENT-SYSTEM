/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  ShieldCheck,
  Shield,
  UserCheck,
  Users,
  Lock,
  Unlock,
  RotateCcw,
  Save,
  CheckCircle2,
  AlertCircle,
  Search,
  Check,
  X,
  SlidersHorizontal,
  Sparkles,
  Info,
  Layers,
  ArrowRight,
  Eye,
  PlusCircle,
  Edit,
  Trash2,
  Printer,
  Download,
  Settings,
  HelpCircle,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { libraryStore } from '../../services/libraryStore.service';
import {
  ModuleKey,
  PermissionAction,
  PermissionMatrix,
  RBAC_MODULES,
  PERMISSION_ACTIONS,
  createAdminDefaultPermissions,
  createStaffDefaultPermissions,
  createEmptyModulePermissions,
  ModuleDefinition,
} from '../../types/rbac';
import { MemberProfile } from '../../types/library';

export default function RolesPermissionsManagement() {
  const { user } = useAuth();
  const [state, setState] = useState(() => libraryStore.snapshot);
  const [selectedTargetType, setSelectedTargetType] = useState<'ROLE_STAFF' | 'USER_OVERRIDE'>('ROLE_STAFF');
  const [selectedStaffId, setSelectedStaffId] = useState<string>('');
  const [searchStaffTerm, setSearchStaffTerm] = useState('');
  const [searchModuleTerm, setSearchModuleTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('ALL');

  // Working permissions state for the currently selected target
  const [matrixState, setMatrixState] = useState<PermissionMatrix>(() => libraryStore.getRolePermissions('STAFF'));
  const [isDirty, setIsDirty] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    action: () => void;
  } | null>(null);

  useEffect(() => {
    const sub = libraryStore.getObservable().subscribe(setState);
    return () => sub.unsubscribe();
  }, []);

  // Filter staff members list
  const staffMembers = useMemo(() => {
    return (state.members || []).filter(
      (m) => m.role === 'STAFF' || m.role === 'LIBRARIAN'
    );
  }, [state.members]);

  const filteredStaffMembers = useMemo(() => {
    if (!searchStaffTerm.trim()) return staffMembers;
    const q = searchStaffTerm.toLowerCase().trim();
    return staffMembers.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q) ||
        (m.memberCardNo && m.memberCardNo.toLowerCase().includes(q)) ||
        (m.department && m.department.toLowerCase().includes(q))
    );
  }, [staffMembers, searchStaffTerm]);

  // When selected target changes, load its permissions
  useEffect(() => {
    if (selectedTargetType === 'ROLE_STAFF') {
      const rolePerms = libraryStore.getRolePermissions('STAFF');
      setMatrixState(JSON.parse(JSON.stringify(rolePerms)));
      setIsDirty(false);
    } else if (selectedTargetType === 'USER_OVERRIDE' && selectedStaffId) {
      const targetUser = staffMembers.find((m) => m.id === selectedStaffId || m.userId === selectedStaffId);
      const effective = libraryStore.getEffectivePermissions(targetUser);
      setMatrixState(JSON.parse(JSON.stringify(effective)));
      setIsDirty(false);
    }
  }, [selectedTargetType, selectedStaffId, staffMembers]);

  // Set default selected staff if switching to USER_OVERRIDE
  useEffect(() => {
    if (selectedTargetType === 'USER_OVERRIDE' && !selectedStaffId && staffMembers.length > 0) {
      setSelectedStaffId(staffMembers[0].id);
    }
  }, [selectedTargetType, selectedStaffId, staffMembers]);

  // Filter modules
  const filteredModules = useMemo(() => {
    return RBAC_MODULES.filter((mod) => {
      const q = searchModuleTerm.toLowerCase().trim();
      const matchesSearch =
        !q ||
        mod.label.toLowerCase().includes(q) ||
        mod.description.toLowerCase().includes(q) ||
        mod.id.toLowerCase().includes(q);

      const matchesCategory = filterCategory === 'ALL' || mod.category === filterCategory;
      return matchesSearch && matchesCategory;
    });
  }, [searchModuleTerm, filterCategory]);

  const activeStaffMember = useMemo(() => {
    return staffMembers.find((m) => m.id === selectedStaffId || m.userId === selectedStaffId);
  }, [staffMembers, selectedStaffId]);

  const hasCustomOverride = useMemo(() => {
    if (selectedTargetType !== 'USER_OVERRIDE' || !selectedStaffId) return false;
    return Boolean(state.userPermissions?.[selectedStaffId]);
  }, [selectedTargetType, selectedStaffId, state.userPermissions]);

  // Toggle single permission checkbox
  const handleTogglePermission = (moduleId: ModuleKey, action: PermissionAction) => {
    setMatrixState((prev) => {
      const next = { ...prev };
      const modPerms = { ...(next[moduleId] || createEmptyModulePermissions()) };
      modPerms[action] = !modPerms[action];
      next[moduleId] = modPerms;
      return next;
    });
    setIsDirty(true);
  };

  // Toggle all actions for a specific module
  const handleToggleModuleRow = (moduleId: ModuleKey) => {
    setMatrixState((prev) => {
      const next = { ...prev };
      const currentMod = next[moduleId] || createEmptyModulePermissions();
      const allActive = PERMISSION_ACTIONS.every((a) => currentMod[a.id]);

      const updated: Record<PermissionAction, boolean> = { ...currentMod };
      PERMISSION_ACTIONS.forEach((a) => {
        updated[a.id] = !allActive;
      });

      next[moduleId] = updated;
      return next;
    });
    setIsDirty(true);
  };

  // Select all permissions for all visible modules
  const handleSelectAll = () => {
    setMatrixState((prev) => {
      const next = { ...prev };
      filteredModules.forEach((mod) => {
        const full = { ...(next[mod.id] || createEmptyModulePermissions()) };
        mod.supportedActions.forEach((act) => {
          full[act] = true;
        });
        next[mod.id] = full;
      });
      return next;
    });
    setIsDirty(true);
  };

  // Clear all permissions for all visible modules
  const handleClearAll = () => {
    setMatrixState((prev) => {
      const next = { ...prev };
      filteredModules.forEach((mod) => {
        const empty = { ...(next[mod.id] || createEmptyModulePermissions()) };
        PERMISSION_ACTIONS.forEach((act) => {
          empty[act.id] = false;
        });
        next[mod.id] = empty;
      });
      return next;
    });
    setIsDirty(true);
  };

  // Reset to system defaults
  const handleResetToDefault = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Reset Permissions to Default?',
      description:
        selectedTargetType === 'ROLE_STAFF'
          ? 'This will reset global Library Staff permissions to the official secure system defaults.'
          : `This will remove all custom overrides for ${activeStaffMember?.name || 'this staff member'} and revert to role defaults.`,
      action: () => {
        if (selectedTargetType === 'ROLE_STAFF') {
          const defs = createStaffDefaultPermissions();
          setMatrixState(JSON.parse(JSON.stringify(defs)));
          libraryStore.resetRolePermissions('STAFF', {
            name: user?.name,
            email: user?.email,
            role: user?.role,
          });
        } else if (selectedStaffId) {
          libraryStore.resetUserPermissions(selectedStaffId, {
            name: user?.name,
            email: user?.email,
            role: user?.role,
          });
          const roleDefaults = libraryStore.getRolePermissions('STAFF');
          setMatrixState(JSON.parse(JSON.stringify(roleDefaults)));
        }
        setIsDirty(false);
        setConfirmModal(null);
        showToast('Permissions reset to system defaults successfully.');
      },
    });
  };

  // Save changes
  const handleSavePermissions = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Save & Apply Permission Changes?',
      description:
        selectedTargetType === 'ROLE_STAFF'
          ? 'These permissions will immediately apply to all Library Staff members without custom overrides.'
          : `Custom permission overrides will be applied specifically to ${activeStaffMember?.name || 'the selected staff member'}.`,
      action: () => {
        if (selectedTargetType === 'ROLE_STAFF') {
          libraryStore.updateRolePermissions('STAFF', matrixState, {
            name: user?.name,
            email: user?.email,
            role: user?.role,
          });
        } else if (selectedStaffId) {
          libraryStore.updateUserPermissions(selectedStaffId, matrixState, {
            name: user?.name,
            email: user?.email,
            role: user?.role,
          });
        }
        setIsDirty(false);
        setConfirmModal(null);
        showToast('Permissions saved and activated successfully.');
      },
    });
  };

  const showToast = (msg: string) => {
    setSaveSuccessMsg(msg);
    setTimeout(() => {
      setSaveSuccessMsg('');
    }, 4000);
  };

  const handleCancelChanges = () => {
    if (selectedTargetType === 'ROLE_STAFF') {
      const rolePerms = libraryStore.getRolePermissions('STAFF');
      setMatrixState(JSON.parse(JSON.stringify(rolePerms)));
    } else if (selectedStaffId) {
      const targetUser = staffMembers.find((m) => m.id === selectedStaffId || m.userId === selectedStaffId);
      const effective = libraryStore.getEffectivePermissions(targetUser);
      setMatrixState(JSON.parse(JSON.stringify(effective)));
    }
    setIsDirty(false);
  };

  return (
    <div className="space-y-6 pb-12 animate-fadeIn">
      {/* Top Banner & Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-8 rounded-3xl shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-bold uppercase tracking-wider">
              <ShieldCheck className="w-3.5 h-3.5" /> Security & Access Management
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold font-poppins text-white tracking-tight">
              Roles & Permission Management
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Configure fine-grained module privileges for Library Staff. Control access to views, adding, editing, deletions, approvals, and physical item actions across the entire university portal.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0 self-start md:self-center">
            <div className="px-4 py-2.5 rounded-2xl bg-white/10 border border-white/15 text-center">
              <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider block">Staff Accounts</span>
              <span className="text-base font-black text-indigo-300 font-poppins">{staffMembers.length} Active</span>
            </div>
            <div className="px-4 py-2.5 rounded-2xl bg-white/10 border border-white/15 text-center">
              <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider block">Protected Modules</span>
              <span className="text-base font-black text-teal-300 font-poppins">{RBAC_MODULES.length} Systems</span>
            </div>
          </div>
        </div>
      </div>

      {/* Save Success Alert Banner */}
      {saveSuccessMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl flex items-center justify-between shadow-xs animate-fadeIn">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="text-xs sm:text-sm font-bold">{saveSuccessMsg}</span>
          </div>
          <button
            onClick={() => setSaveSuccessMsg('')}
            className="p-1 text-emerald-600 hover:text-emerald-800 rounded-lg hover:bg-emerald-100/60"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Target Selector Card: Global Role vs. Individual Staff Member */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div>
            <h2 className="text-base font-bold text-slate-900">Select Permission Scope</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Choose whether to edit global default permissions for all staff or configure custom overrides for a specific employee.
            </p>
          </div>

          {/* Scope Toggle Buttons */}
          <div className="flex items-center p-1 bg-slate-100 rounded-2xl shrink-0 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setSelectedTargetType('ROLE_STAFF')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                selectedTargetType === 'ROLE_STAFF'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Library Staff Role (Default)</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedTargetType('USER_OVERRIDE')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                selectedTargetType === 'USER_OVERRIDE'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Individual Staff Override</span>
            </button>
          </div>
        </div>

        {/* Individual Staff Selector (Shown when USER_OVERRIDE is selected) */}
        {selectedTargetType === 'USER_OVERRIDE' && (
          <div className="bg-indigo-50/50 p-4 sm:p-5 rounded-2xl border border-indigo-100 space-y-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <label className="text-xs font-extrabold uppercase tracking-wider text-indigo-950 flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-indigo-600" />
                Select Staff Member to Override:
              </label>

              {/* Staff search filter */}
              <div className="relative w-full md:w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search staff name or ID..."
                  value={searchStaffTerm}
                  onChange={(e) => setSearchStaffTerm(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-indigo-200 bg-white text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Staff Grid/List */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
              {filteredStaffMembers.map((staff) => {
                const isSelected = selectedStaffId === staff.id;
                const hasCustom = Boolean(state.userPermissions?.[staff.id]);

                return (
                  <div
                    key={staff.id}
                    onClick={() => setSelectedStaffId(staff.id)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'bg-white border-indigo-600 ring-2 ring-indigo-500/20 shadow-sm'
                        : 'bg-white/80 border-slate-200 hover:border-indigo-300 hover:bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                        {staff.name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 truncate">{staff.name}</p>
                        <p className="text-[11px] text-slate-500 truncate">{staff.email}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-600">
                            {staff.memberCardNo || staff.role}
                          </span>
                          {hasCustom && (
                            <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 border border-amber-200">
                              Custom Overrides
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Current Target Status Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs">
          <div className="flex items-center gap-2.5">
            <span className="font-bold text-slate-700">Currently Editing:</span>
            {selectedTargetType === 'ROLE_STAFF' ? (
              <span className="px-3 py-1 rounded-xl bg-indigo-100 text-indigo-900 font-bold border border-indigo-200 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-indigo-700" />
                Library Staff Role (Global Standard)
              </span>
            ) : (
              <span className="px-3 py-1 rounded-xl bg-purple-100 text-purple-900 font-bold border border-purple-200 flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-purple-700" />
                {activeStaffMember?.name || 'Selected Staff Member'} ({activeStaffMember?.email})
              </span>
            )}
            {selectedTargetType === 'USER_OVERRIDE' && (
              <span className="text-slate-500 text-[11px]">
                {hasCustomOverride ? '• (Has customized overrides)' : '• (Inheriting role defaults)'}
              </span>
            )}
          </div>

          {/* Quick Action Toolbar */}
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <button
              type="button"
              onClick={handleSelectAll}
              className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold rounded-xl transition-all cursor-pointer shadow-2xs"
            >
              Select All
            </button>
            <button
              type="button"
              onClick={handleClearAll}
              className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold rounded-xl transition-all cursor-pointer shadow-2xs"
            >
              Clear All
            </button>
            <button
              type="button"
              onClick={handleResetToDefault}
              className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" /> Reset to Default
            </button>
          </div>
        </div>
      </div>

      {/* Permission Matrix Table Card */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden space-y-4 p-5 sm:p-6">
        {/* Search & Category Filter for Modules */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 min-w-0">
            <Search className="w-4 h-4 text-indigo-600 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search library module name or description..."
              value={searchModuleTerm}
              onChange={(e) => setSearchModuleTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <SlidersHorizontal className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">All Categories ({RBAC_MODULES.length})</option>
              <option value="CORE">Core Dashboard</option>
              <option value="CATALOG_INVENTORY">Catalog & Inventory</option>
              <option value="CIRCULATION">Daily Circulation</option>
              <option value="MEMBERS">Members & Approvals</option>
              <option value="SERVICES">Services & Digital</option>
              <option value="ADMINISTRATION">Administration</option>
            </select>
          </div>
        </div>

        {/* Matrix Table */}
        <div className="border border-slate-200 rounded-2xl overflow-hidden overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-extrabold text-slate-600 uppercase tracking-wider">
                <th className="py-3.5 px-4 min-w-[240px]">Library Module</th>
                {PERMISSION_ACTIONS.map((action) => (
                  <th key={action.id} className="py-3.5 px-2 text-center min-w-[70px]">
                    <span title={action.description}>{action.label}</span>
                  </th>
                ))}
                <th className="py-3.5 px-3 text-right min-w-[80px]">Quick</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredModules.map((mod) => {
                const modPerms = matrixState[mod.id] || createEmptyModulePermissions();
                const allChecked = mod.supportedActions.every((a) => modPerms[a]);

                return (
                  <tr key={mod.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Module info */}
                    <td className="py-3 px-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">{mod.label}</span>
                          <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-slate-100 text-slate-500">
                            {mod.category}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">{mod.description}</p>
                      </div>
                    </td>

                    {/* Checkboxes for each action */}
                    {PERMISSION_ACTIONS.map((action) => {
                      const isSupported = mod.supportedActions.includes(action.id);
                      const isChecked = Boolean(modPerms[action.id]);

                      if (!isSupported) {
                        return (
                          <td key={action.id} className="py-3 px-2 text-center">
                            <span className="text-slate-200 select-none">&mdash;</span>
                          </td>
                        );
                      }

                      return (
                        <td key={action.id} className="py-3 px-2 text-center">
                          <label className="inline-flex items-center justify-center p-1.5 rounded-lg hover:bg-indigo-50 transition-colors cursor-pointer">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleTogglePermission(mod.id, action.id)}
                              className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                            />
                          </label>
                        </td>
                      );
                    })}

                    {/* Row quick toggle */}
                    <td className="py-3 px-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleToggleModuleRow(mod.id)}
                        className={`text-[10px] font-bold px-2 py-1 rounded-lg border transition-colors cursor-pointer ${
                          allChecked
                            ? 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                            : 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100'
                        }`}
                        title="Toggle all supported actions for this module"
                      >
                        {allChecked ? 'Uncheck' : 'All'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Floating / Bottom Sticky Save Bar */}
        <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            {isDirty ? (
              <span className="flex items-center gap-1.5 text-amber-600 font-bold animate-pulse">
                <AlertCircle className="w-4 h-4" /> Unsaved permission changes pending
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-slate-500">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" /> All permissions saved and in sync
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            {isDirty && (
              <button
                type="button"
                onClick={handleCancelChanges}
                className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200 font-bold text-xs transition-colors cursor-pointer"
              >
                Cancel Changes
              </button>
            )}

            <button
              type="button"
              onClick={handleSavePermissions}
              disabled={!isDirty}
              className={`flex-1 sm:flex-initial px-6 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer ${
                isDirty
                  ? 'bg-gradient-to-r from-indigo-600 to-teal-600 text-white hover:from-indigo-700 hover:to-teal-700 shadow-indigo-200 active:scale-95'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
              }`}
            >
              <Save className="w-4 h-4" />
              <span>Save & Apply Permissions</span>
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {confirmModal && confirmModal.isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-5 animate-scaleUp">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900">{confirmModal.title}</h3>
                <p className="text-xs text-slate-600 leading-relaxed">{confirmModal.description}</p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 space-y-1">
              <p className="font-bold text-slate-800">Security Audit Notice:</p>
              <p>This administrative action will be recorded in the system audit logs under your administrator credentials.</p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmModal(null)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmModal.action}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition-colors cursor-pointer shadow-sm active:scale-95"
              >
                Confirm & Proceed
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
