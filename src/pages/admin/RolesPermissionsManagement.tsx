/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  Edit3,
  Trash2,
  Printer,
  Download,
  Settings,
  HelpCircle,
  Copy,
  ChevronDown,
  ChevronUp,
  FileSpreadsheet,
  AlertTriangle,
  FolderLock,
  FileCheck2,
  BadgeCheck,
  Zap,
  BookOpen,
  RotateCw,
  LayoutGrid,
  Table as TableIcon,
  CheckSquare,
  Square,
  Filter,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { libraryStore } from '../../services/libraryStore.service';
import {
  ModuleKey,
  PermissionAction,
  PermissionMatrix,
  RBAC_MODULES,
  PERMISSION_ACTIONS,
  PERMISSION_PRESETS,
  PermissionPreset,
  createAdminDefaultPermissions,
  createStaffDefaultPermissions,
  createCirculationDeskPreset,
  createCatalogerPreset,
  createAuditorPreset,
  createSeniorLibrarianPreset,
  createEmptyModulePermissions,
  ModuleDefinition,
} from '../../types/rbac';
import { MemberProfile } from '../../types/library';

// Category metadata for rich aesthetics and grouping
const CATEGORY_INFO: Record<
  string,
  { label: string; icon: any; color: string; bg: string; border: string; desc: string }
> = {
  CORE: {
    label: 'Core & Dashboard',
    icon: Sparkles,
    color: 'text-indigo-700',
    bg: 'bg-indigo-50/70',
    border: 'border-indigo-200',
    desc: 'System telemetry, KPI metrics, and central monitoring',
  },
  CATALOG_INVENTORY: {
    label: 'Catalog & Physical Inventory',
    icon: BookOpen,
    color: 'text-blue-700',
    bg: 'bg-blue-50/70',
    border: 'border-blue-200',
    desc: 'Book cataloging, copy accessioning, rack/shelf layout, and barcodes',
  },
  CIRCULATION: {
    label: 'Daily Circulation Desk',
    icon: RotateCw,
    color: 'text-teal-700',
    bg: 'bg-teal-50/70',
    border: 'border-teal-200',
    desc: 'Book issue, returns, reservations, fines, and gate check-ins',
  },
  MEMBERS: {
    label: 'Members & Institutional Clearance',
    icon: Users,
    color: 'text-purple-700',
    bg: 'bg-purple-50/70',
    border: 'border-purple-200',
    desc: 'Student/faculty profiles, membership cards, and No Due Certificates',
  },
  SERVICES: {
    label: 'Services & Digital Repositories',
    icon: Layers,
    color: 'text-amber-700',
    bg: 'bg-amber-50/70',
    border: 'border-amber-200',
    desc: 'Procurement requests, e-resources, notices, and download templates',
  },
  ADMINISTRATION: {
    label: 'System Administration & Security',
    icon: FolderLock,
    color: 'text-rose-700',
    bg: 'bg-rose-50/70',
    border: 'border-rose-200',
    desc: 'Compliance analytics, operating hours, audit logs, and security matrix',
  },
};

// Actions metadata with badge colors and safety classifications
const ACTION_BADGES: Record<
  PermissionAction,
  { label: string; isDestructive: boolean; color: string; bg: string; icon: any }
> = {
  view: { label: 'View', isDestructive: false, color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200', icon: Eye },
  add: { label: 'Add', isDestructive: false, color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200', icon: PlusCircle },
  edit: { label: 'Edit', isDestructive: false, color: 'text-indigo-700', bg: 'bg-indigo-50 border-indigo-200', icon: Edit3 },
  delete: { label: 'Delete', isDestructive: true, color: 'text-rose-700', bg: 'bg-rose-50 border-rose-200', icon: Trash2 },
  approve: { label: 'Approve', isDestructive: true, color: 'text-purple-700', bg: 'bg-purple-50 border-purple-200', icon: CheckCircle2 },
  reject: { label: 'Reject', isDestructive: true, color: 'text-orange-700', bg: 'bg-orange-50 border-orange-200', icon: X },
  print: { label: 'Print', isDestructive: false, color: 'text-sky-700', bg: 'bg-sky-50 border-sky-200', icon: Printer },
  export: { label: 'Export', isDestructive: false, color: 'text-teal-700', bg: 'bg-teal-50 border-teal-200', icon: Download },
  manage: { label: 'Manage', isDestructive: true, color: 'text-red-700', bg: 'bg-red-50 border-red-200', icon: Settings },
};

export default function RolesPermissionsManagement() {
  const { user } = useAuth();
  const [state, setState] = useState(() => libraryStore.snapshot);
  const [selectedTargetType, setSelectedTargetType] = useState<'ROLE_STAFF' | 'USER_OVERRIDE'>('ROLE_STAFF');
  const [selectedStaffId, setSelectedStaffId] = useState<string>('');
  const [searchStaffTerm, setSearchStaffTerm] = useState('');
  const [searchModuleTerm, setSearchModuleTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'TABLE' | 'CATEGORIZED'>('TABLE');
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});

  // Working permissions state for the currently selected target
  const [matrixState, setMatrixState] = useState<PermissionMatrix>(() => libraryStore.getRolePermissions('STAFF'));
  const [isDirty, setIsDirty] = useState(false);
  const [activePresetId, setActivePresetId] = useState<string>('staff_default');
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'info' | 'warn' } | null>(null);
  
  // Confirmation Modal State
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    impactCount?: number;
    action: () => void;
  } | null>(null);

  // Copy Permissions Modal
  const [copySourceStaffId, setCopySourceStaffId] = useState<string>('');
  const [isCopyModalOpen, setIsCopyModalOpen] = useState(false);

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
      setActivePresetId('staff_default');
    } else if (selectedTargetType === 'USER_OVERRIDE' && selectedStaffId) {
      const targetUser = staffMembers.find((m) => m.id === selectedStaffId || m.userId === selectedStaffId);
      const effective = libraryStore.getEffectivePermissions(targetUser);
      setMatrixState(JSON.parse(JSON.stringify(effective)));
      setIsDirty(false);
      setActivePresetId('');
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

  // Group filtered modules by category
  const categorizedModules = useMemo(() => {
    const groups: Record<string, ModuleDefinition[]> = {};
    filteredModules.forEach((mod) => {
      if (!groups[mod.category]) {
        groups[mod.category] = [];
      }
      groups[mod.category].push(mod);
    });
    return groups;
  }, [filteredModules]);

  const activeStaffMember = useMemo(() => {
    return staffMembers.find((m) => m.id === selectedStaffId || m.userId === selectedStaffId);
  }, [staffMembers, selectedStaffId]);

  const hasCustomOverride = useMemo(() => {
    if (selectedTargetType !== 'USER_OVERRIDE' || !selectedStaffId) return false;
    return Boolean(state.userPermissions?.[selectedStaffId]);
  }, [selectedTargetType, selectedStaffId, state.userPermissions]);

  // Compare custom user overrides with base role defaults
  const userOverrideDiffCount = useMemo(() => {
    if (selectedTargetType !== 'USER_OVERRIDE' || !selectedStaffId) return 0;
    const baseStaff = libraryStore.getRolePermissions('STAFF');
    let diffs = 0;
    RBAC_MODULES.forEach((mod) => {
      mod.supportedActions.forEach((act) => {
        const userVal = Boolean(matrixState[mod.id]?.[act]);
        const baseVal = Boolean(baseStaff[mod.id]?.[act]);
        if (userVal !== baseVal) diffs++;
      });
    });
    return diffs;
  }, [selectedTargetType, selectedStaffId, matrixState]);

  // Calculate live permission telemetry stats
  const permissionStats = useMemo(() => {
    let totalGranted = 0;
    let totalSupported = 0;
    let destructiveGranted = 0;

    RBAC_MODULES.forEach((mod) => {
      mod.supportedActions.forEach((act) => {
        totalSupported++;
        if (matrixState[mod.id]?.[act]) {
          totalGranted++;
          if (ACTION_BADGES[act].isDestructive) {
            destructiveGranted++;
          }
        }
      });
    });

    const percent = totalSupported > 0 ? Math.round((totalGranted / totalSupported) * 100) : 0;
    return { totalGranted, totalSupported, destructiveGranted, percent };
  }, [matrixState]);

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
    setActivePresetId('');
  };

  // Toggle all supported actions for a specific module (FIXED ACCURACY)
  const handleToggleModuleRow = (moduleId: ModuleKey) => {
    const modDef = RBAC_MODULES.find((m) => m.id === moduleId);
    if (!modDef) return;

    setMatrixState((prev) => {
      const next = { ...prev };
      const currentMod = next[moduleId] || createEmptyModulePermissions();
      const allSupportedActive = modDef.supportedActions.every((a) => currentMod[a]);

      const updated: Record<PermissionAction, boolean> = { ...currentMod };
      modDef.supportedActions.forEach((a) => {
        updated[a] = !allSupportedActive;
      });

      next[moduleId] = updated;
      return next;
    });
    setIsDirty(true);
    setActivePresetId('');
  };

  // Toggle an entire column (action) across all visible/filtered modules
  const handleToggleColumnAction = (action: PermissionAction) => {
    // Check if all visible modules that support this action currently have it enabled
    const supportedModules = filteredModules.filter((m) => m.supportedActions.includes(action));
    if (supportedModules.length === 0) return;

    const allActive = supportedModules.every((m) => matrixState[m.id]?.[action]);

    setMatrixState((prev) => {
      const next = { ...prev };
      supportedModules.forEach((mod) => {
        const modPerms = { ...(next[mod.id] || createEmptyModulePermissions()) };
        modPerms[action] = !allActive;
        next[mod.id] = modPerms;
      });
      return next;
    });
    setIsDirty(true);
    setActivePresetId('');
    showToast(
      !allActive
        ? `Granted '${ACTION_BADGES[action].label}' across ${supportedModules.length} visible modules.`
        : `Revoked '${ACTION_BADGES[action].label}' from ${supportedModules.length} visible modules.`,
      'info'
    );
  };

  // Toggle all permissions for an entire category
  const handleToggleCategory = (categoryKey: string) => {
    const modulesInCategory = filteredModules.filter((m) => m.category === categoryKey);
    if (modulesInCategory.length === 0) return;

    // Check if everything in this category is enabled
    const allActive = modulesInCategory.every((mod) =>
      mod.supportedActions.every((a) => matrixState[mod.id]?.[a])
    );

    setMatrixState((prev) => {
      const next = { ...prev };
      modulesInCategory.forEach((mod) => {
        const modPerms = { ...(next[mod.id] || createEmptyModulePermissions()) };
        mod.supportedActions.forEach((a) => {
          modPerms[a] = !allActive;
        });
        next[mod.id] = modPerms;
      });
      return next;
    });
    setIsDirty(true);
    setActivePresetId('');
    showToast(
      !allActive
        ? `All permissions granted for ${CATEGORY_INFO[categoryKey]?.label || categoryKey}.`
        : `All permissions cleared for ${CATEGORY_INFO[categoryKey]?.label || categoryKey}.`,
      'info'
    );
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
    setActivePresetId('full_admin');
    showToast(`Enabled all permissions across ${filteredModules.length} visible modules.`, 'info');
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
    setActivePresetId('');
    showToast(`Cleared all permissions across ${filteredModules.length} visible modules.`, 'warn');
  };

  // Apply a preset template
  const handleApplyPreset = (preset: PermissionPreset) => {
    const generated = preset.generator();
    setMatrixState(JSON.parse(JSON.stringify(generated)));
    setIsDirty(true);
    setActivePresetId(preset.id);
    showToast(`Applied preset: "${preset.name}". Click Save to commit changes.`, 'success');
  };

  // Copy permissions from another staff member
  const handleCopyFromStaff = (sourceStaffId: string) => {
    const sourceMember = staffMembers.find((m) => m.id === sourceStaffId || m.userId === sourceStaffId);
    if (!sourceMember) return;

    const sourcePerms = libraryStore.getEffectivePermissions(sourceMember);
    setMatrixState(JSON.parse(JSON.stringify(sourcePerms)));
    setIsDirty(true);
    setIsCopyModalOpen(false);
    showToast(`Copied permissions template from ${sourceMember.name}.`, 'success');
  };

  // Reset to system defaults
  const handleResetToDefault = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Reset Permissions to Default?',
      description:
        selectedTargetType === 'ROLE_STAFF'
          ? 'This will reset global Library Staff permissions to the official secure system defaults.'
          : `This will remove all custom overrides for ${activeStaffMember?.name || 'this staff member'} and revert to global Staff defaults.`,
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
        setActivePresetId('staff_default');
        setConfirmModal(null);
        showToast('Permissions reset to system defaults successfully.', 'success');
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
          ? 'These permissions will immediately apply to all Library Staff members without custom overrides across the entire university portal.'
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
        showToast('Permissions saved and activated successfully.', 'success');
      },
    });
  };

  const showToast = (msg: string, type: 'success' | 'info' | 'warn' = 'success') => {
    setToastMessage({ text: msg, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
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
    showToast('Unsaved changes discarded.', 'info');
  };

  // Export permission matrix to CSV
  const handleExportCSV = () => {
    const headers = ['Module ID', 'Module Name', 'Category', ...PERMISSION_ACTIONS.map((a) => a.label)];
    const rows = RBAC_MODULES.map((mod) => {
      const modPerms = matrixState[mod.id] || createEmptyModulePermissions();
      return [
        mod.id,
        `"${mod.label}"`,
        mod.category,
        ...PERMISSION_ACTIONS.map((a) => (mod.supportedActions.includes(a.id) ? (modPerms[a.id] ? 'YES' : 'NO') : 'N/A')),
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `RBAC_Permissions_${selectedTargetType === 'ROLE_STAFF' ? 'Staff_Role' : activeStaffMember?.name?.replace(/\s+/g, '_') || 'User'}_${new Date().toISOString().split('T')[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Permission matrix exported to CSV successfully.', 'success');
  };

  // Toggle category collapse
  const toggleCategoryCollapse = (category: string) => {
    setCollapsedCategories((prev) => ({
      ...prev,
      [category]: !prev[category],
    }));
  };

  return (
    <div className="space-y-6 pb-20 animate-fadeIn">
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
              Configure fine-grained module privileges for Library Staff. Control access to views, additions, edits, deletions, approvals, and physical item actions across the entire university portal.
            </p>
          </div>

          {/* Telemetry Stat Badges */}
          <div className="grid grid-cols-3 gap-2 shrink-0 self-start md:self-center">
            <div className="px-3.5 py-2.5 rounded-2xl bg-white/10 border border-white/15 text-center">
              <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider block">Staff Accounts</span>
              <span className="text-sm sm:text-base font-black text-indigo-300 font-poppins">{staffMembers.length} Active</span>
            </div>
            <div className="px-3.5 py-2.5 rounded-2xl bg-white/10 border border-white/15 text-center">
              <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider block">Modules</span>
              <span className="text-sm sm:text-base font-black text-teal-300 font-poppins">{RBAC_MODULES.length} Systems</span>
            </div>
            <div className="px-3.5 py-2.5 rounded-2xl bg-white/10 border border-white/15 text-center">
              <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider block">Coverage</span>
              <span className="text-sm sm:text-base font-black text-emerald-300 font-poppins">{permissionStats.percent}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div
          className={`p-4 rounded-2xl border flex items-center justify-between shadow-lg transition-all animate-fadeIn ${
            toastMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : toastMessage.type === 'warn'
              ? 'bg-amber-50 border-amber-200 text-amber-900'
              : 'bg-indigo-50 border-indigo-200 text-indigo-900'
          }`}
        >
          <div className="flex items-center gap-3">
            {toastMessage.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : toastMessage.type === 'warn' ? (
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            ) : (
              <Info className="w-5 h-5 text-indigo-600 shrink-0" />
            )}
            <span className="text-xs sm:text-sm font-bold">{toastMessage.text}</span>
          </div>
          <button
            onClick={() => setToastMessage(null)}
            className="p-1 rounded-lg hover:bg-black/5 text-slate-500 hover:text-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Scope Selector Card: Global Role vs. Individual Staff Member */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Shield className="w-4 h-4 text-indigo-600" />
              Select Permission Scope
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Choose whether to edit global default permissions for all staff or configure custom overrides for a specific employee.
            </p>
          </div>

          {/* Scope Toggle Tabs */}
          <div className="flex items-center p-1 bg-slate-100 rounded-2xl shrink-0 self-start sm:self-auto border border-slate-200/70">
            <button
              type="button"
              onClick={() => setSelectedTargetType('ROLE_STAFF')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                selectedTargetType === 'ROLE_STAFF'
                  ? 'bg-white text-indigo-700 shadow-xs ring-1 ring-slate-200'
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
                  ? 'bg-white text-indigo-700 shadow-xs ring-1 ring-slate-200'
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
          <div className="bg-indigo-50/50 p-4 sm:p-5 rounded-2xl border border-indigo-100 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <label className="text-xs font-extrabold uppercase tracking-wider text-indigo-950 flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-indigo-600" />
                Select Staff Member to Override:
              </label>

              <div className="flex items-center gap-2 flex-wrap">
                {/* Search input */}
                <div className="relative w-full sm:w-64">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search staff name or ID..."
                    value={searchStaffTerm}
                    onChange={(e) => setSearchStaffTerm(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-indigo-200 bg-white text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* Copy from other staff button */}
                <button
                  type="button"
                  onClick={() => setIsCopyModalOpen(true)}
                  className="px-3 py-1.5 bg-white hover:bg-indigo-100/60 text-indigo-700 border border-indigo-200 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy From...</span>
                </button>
              </div>
            </div>

            {/* Staff Member Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
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
                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                          <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-600">
                            {staff.memberCardNo || staff.role}
                          </span>
                          {hasCustom && (
                            <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 border border-amber-200">
                              Custom Override
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 1-Click Role Presets Bar */}
        <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              1-Click Role Presets:
            </span>
            <span className="text-[11px] text-slate-500 hidden sm:inline">
              Quickly load an authorized access template for this target
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 pt-1">
            {PERMISSION_PRESETS.map((preset) => {
              const isCurrentActive = activePresetId === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleApplyPreset(preset)}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    isCurrentActive
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm ring-2 ring-indigo-300'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/40'
                  }`}
                  title={preset.description}
                >
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase ${
                        isCurrentActive
                          ? 'bg-white/20 text-white'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {preset.badge}
                    </span>
                    {isCurrentActive && <Check className="w-3 h-3 text-white stroke-[3]" />}
                  </div>
                  <span className="text-xs font-bold truncate block">{preset.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Target Status Bar & Quick Actions */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="font-bold text-slate-700">Target:</span>
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
              <span className="text-slate-600 font-medium text-[11px] bg-white px-2.5 py-0.5 rounded-lg border border-slate-200">
                {hasCustomOverride
                  ? `⚡ ${userOverrideDiffCount} custom override(s) active`
                  : '🌿 Inheriting global Staff defaults'}
              </span>
            )}

            {/* Danger Security Indicator */}
            {permissionStats.destructiveGranted > 0 && (
              <span className="px-2.5 py-1 rounded-xl bg-amber-50 text-amber-800 font-bold border border-amber-200 text-[11px] flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 text-amber-600" />
                {permissionStats.destructiveGranted} Elevated Privilege(s) Active
              </span>
            )}
          </div>

          {/* Quick Action Toolbar */}
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <button
              type="button"
              onClick={handleSelectAll}
              className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold rounded-xl transition-all cursor-pointer shadow-2xs flex items-center gap-1"
            >
              <CheckSquare className="w-3.5 h-3.5 text-indigo-600" /> Select All
            </button>
            <button
              type="button"
              onClick={handleClearAll}
              className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold rounded-xl transition-all cursor-pointer shadow-2xs flex items-center gap-1"
            >
              <Square className="w-3.5 h-3.5 text-slate-400" /> Clear All
            </button>
            <button
              type="button"
              onClick={handleResetToDefault}
              className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" /> Reset Default
            </button>
            <button
              type="button"
              onClick={handleExportCSV}
              className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold rounded-xl transition-all cursor-pointer shadow-2xs flex items-center gap-1"
              title="Export matrix as CSV spreadsheet"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-teal-600" /> Export CSV
            </button>
          </div>
        </div>
      </div>

      {/* Permission Matrix Table / Cards Container */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm space-y-4 p-5 sm:p-6">
        {/* Search, Filter & View Controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 min-w-0">
            <Search className="w-4 h-4 text-indigo-600 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search library module name, system ID, or description..."
              value={searchModuleTerm}
              onChange={(e) => setSearchModuleTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap shrink-0">
            {/* Category Dropdown */}
            <div className="flex items-center gap-1.5">
              <SlidersHorizontal className="w-4 h-4 text-slate-400 shrink-0" />
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="ALL">All Categories ({RBAC_MODULES.length})</option>
                <option value="CORE">Core Dashboard (1)</option>
                <option value="CATALOG_INVENTORY">Catalog & Inventory (6)</option>
                <option value="CIRCULATION">Daily Circulation (5)</option>
                <option value="MEMBERS">Members & Clearance (3)</option>
                <option value="SERVICES">Services & Digital (4)</option>
                <option value="ADMINISTRATION">Administration (4)</option>
              </select>
            </div>

            {/* View Mode Toggle: Table vs Categorized */}
            <div className="flex items-center p-0.5 bg-slate-100 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setViewMode('TABLE')}
                className={`p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewMode === 'TABLE'
                    ? 'bg-white text-indigo-700 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Spreadsheet Table View"
              >
                <TableIcon className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('CATEGORIZED')}
                className={`p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewMode === 'CATEGORIZED'
                    ? 'bg-white text-indigo-700 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Categorized Card View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Action Legend & Safety Guide */}
        <div className="p-3 bg-slate-50/70 rounded-2xl border border-slate-200/80 flex items-center justify-between gap-4 flex-wrap text-[11px]">
          <span className="font-extrabold text-slate-700 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-indigo-600" /> Action Legend:
          </span>
          <div className="flex items-center gap-2 flex-wrap">
            {PERMISSION_ACTIONS.map((action) => {
              const meta = ACTION_BADGES[action.id];
              return (
                <span
                  key={action.id}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border font-semibold ${meta.bg} ${meta.color}`}
                  title={action.description}
                >
                  <meta.icon className="w-3 h-3" />
                  {meta.label}
                  {meta.isDestructive && <span className="text-[9px] text-rose-500 font-bold">*</span>}
                </span>
              );
            })}
          </div>
          <span className="text-slate-400 text-[10px] italic">
            * Indicates sensitive or destructive administrative action
          </span>
        </div>

        {/* VIEW MODE 1: UNIFIED SPREADSHEET TABLE */}
        {viewMode === 'TABLE' && (
          <div className="border border-slate-200 rounded-2xl overflow-hidden overflow-x-auto shadow-2xs">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-extrabold text-slate-600 uppercase tracking-wider">
                  <th className="py-3.5 px-4 min-w-[260px]">Library Module</th>
                  {PERMISSION_ACTIONS.map((action) => {
                    const meta = ACTION_BADGES[action.id];
                    // Count how many visible modules support and have this action enabled
                    const supportedCount = filteredModules.filter((m) => m.supportedActions.includes(action.id)).length;
                    const enabledCount = filteredModules.filter(
                      (m) => m.supportedActions.includes(action.id) && matrixState[m.id]?.[action.id]
                    ).length;

                    return (
                      <th
                        key={action.id}
                        className="py-3.5 px-2 text-center min-w-[76px] select-none group relative"
                      >
                        <div className="flex flex-col items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleToggleColumnAction(action.id)}
                            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-lg border transition-all cursor-pointer ${meta.bg} ${meta.color} hover:brightness-95`}
                            title={`Click to Toggle '${meta.label}' for all visible modules (${enabledCount}/${supportedCount} active)`}
                          >
                            <meta.icon className="w-3 h-3" />
                            <span>{meta.label}</span>
                          </button>
                          <span className="text-[9px] font-mono text-slate-400 font-normal">
                            {enabledCount}/{supportedCount}
                          </span>
                        </div>
                      </th>
                    );
                  })}
                  <th className="py-3.5 px-3 text-right min-w-[80px]">Quick</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredModules.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="py-12 text-center text-slate-400">
                      <Search className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                      <p className="font-bold text-slate-600">No matching library modules found</p>
                      <p className="text-xs text-slate-400 mt-1">Try clearing your search query or category filter</p>
                    </td>
                  </tr>
                ) : (
                  filteredModules.map((mod) => {
                    const modPerms = matrixState[mod.id] || createEmptyModulePermissions();
                    const allSupportedActive = mod.supportedActions.every((a) => modPerms[a]);
                    const categoryMeta = CATEGORY_INFO[mod.category];

                    return (
                      <tr key={mod.id} className="hover:bg-slate-50/80 transition-colors">
                        {/* Module info */}
                        <td className="py-3 px-4">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900">{mod.label}</span>
                              <span
                                className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${
                                  categoryMeta?.bg || 'bg-slate-100'
                                } ${categoryMeta?.color || 'text-slate-600'} ${
                                  categoryMeta?.border || 'border-slate-200'
                                }`}
                              >
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
                          const meta = ACTION_BADGES[action.id];

                          if (!isSupported) {
                            return (
                              <td key={action.id} className="py-3 px-2 text-center">
                                <span className="text-slate-200 select-none text-base font-light">&mdash;</span>
                              </td>
                            );
                          }

                          return (
                            <td key={action.id} className="py-3 px-2 text-center">
                              <label
                                className={`inline-flex items-center justify-center p-1.5 rounded-lg transition-all cursor-pointer ${
                                  isChecked
                                    ? meta.isDestructive
                                      ? 'bg-rose-50/80 text-rose-700'
                                      : 'bg-indigo-50/80 text-indigo-700'
                                    : 'hover:bg-slate-100'
                                }`}
                                title={`${isChecked ? 'Revoke' : 'Grant'} ${meta.label} for ${mod.label}`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => handleTogglePermission(mod.id, action.id)}
                                  className={`w-4 h-4 rounded border-slate-300 focus:ring-2 cursor-pointer ${
                                    meta.isDestructive
                                      ? 'text-rose-600 focus:ring-rose-500'
                                      : 'text-indigo-600 focus:ring-indigo-500'
                                  }`}
                                />
                              </label>
                            </td>
                          );
                        })}

                        {/* Row quick toggle (FIXED) */}
                        <td className="py-3 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleToggleModuleRow(mod.id)}
                            className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                              allSupportedActive
                                ? 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                                : 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100'
                            }`}
                            title="Toggle all supported actions for this module"
                          >
                            {allSupportedActive ? 'Uncheck' : 'All'}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* VIEW MODE 2: CATEGORIZED CARDS VIEW */}
        {viewMode === 'CATEGORIZED' && (
          <div className="space-y-4">
            {Object.keys(categorizedModules).map((categoryKey) => {
              const mods = categorizedModules[categoryKey];
              const meta = CATEGORY_INFO[categoryKey] || {
                label: categoryKey,
                icon: Layers,
                color: 'text-slate-700',
                bg: 'bg-slate-50',
                border: 'border-slate-200',
                desc: '',
              };
              const isCollapsed = collapsedCategories[categoryKey];
              const CategoryIcon = meta.icon;

              return (
                <div
                  key={categoryKey}
                  className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-2xs"
                >
                  {/* Category Card Header */}
                  <div className={`p-4 ${meta.bg} border-b border-slate-200 flex items-center justify-between gap-3`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-xl bg-white text-indigo-700 flex items-center justify-center font-bold shadow-2xs border ${meta.border}`}>
                        <CategoryIcon className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">{meta.label}</h3>
                        <p className="text-[11px] text-slate-500">{meta.desc}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleToggleCategory(categoryKey)}
                        className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-[11px] font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
                      >
                        Toggle Category
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleCategoryCollapse(categoryKey)}
                        className="p-1 rounded-lg hover:bg-black/5 text-slate-500 transition-colors cursor-pointer"
                      >
                        {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Modules in Category */}
                  {!isCollapsed && (
                    <div className="divide-y divide-slate-100">
                      {mods.map((mod) => {
                        const modPerms = matrixState[mod.id] || createEmptyModulePermissions();
                        const allSupportedActive = mod.supportedActions.every((a) => modPerms[a]);

                        return (
                          <div
                            key={mod.id}
                            className="p-4 hover:bg-slate-50/60 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
                          >
                            <div className="min-w-0 max-w-sm">
                              <span className="font-bold text-slate-900 text-xs sm:text-sm block">{mod.label}</span>
                              <p className="text-[11px] text-slate-500 leading-snug mt-0.5">{mod.description}</p>
                            </div>

                            {/* Action Pills Grid */}
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {PERMISSION_ACTIONS.map((action) => {
                                const isSupported = mod.supportedActions.includes(action.id);
                                const isChecked = Boolean(modPerms[action.id]);
                                const actionMeta = ACTION_BADGES[action.id];

                                if (!isSupported) return null;

                                return (
                                  <button
                                    key={action.id}
                                    type="button"
                                    onClick={() => handleTogglePermission(mod.id, action.id)}
                                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                                      isChecked
                                        ? `${actionMeta.bg} ${actionMeta.color} shadow-2xs ring-1 ring-black/5`
                                        : 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100 hover:text-slate-600'
                                    }`}
                                  >
                                    <actionMeta.icon className="w-3 h-3" />
                                    <span>{actionMeta.label}</span>
                                    {isChecked ? (
                                      <Check className="w-3 h-3 stroke-[3]" />
                                    ) : (
                                      <X className="w-3 h-3 text-slate-300" />
                                    )}
                                  </button>
                                );
                              })}

                              {/* Row toggle */}
                              <button
                                type="button"
                                onClick={() => handleToggleModuleRow(mod.id)}
                                className={`text-[10px] font-bold px-2 py-1 rounded-lg border transition-all cursor-pointer ml-1 ${
                                  allSupportedActive
                                    ? 'bg-slate-100 text-slate-600 border-slate-200'
                                    : 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100'
                                }`}
                              >
                                {allSupportedActive ? 'Clear' : 'All'}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Sticky Bottom Save / Action Bar */}
        <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            {isDirty ? (
              <span className="flex items-center gap-1.5 text-amber-600 font-bold animate-pulse">
                <AlertCircle className="w-4 h-4" /> Unsaved permission changes pending
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-slate-500">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" /> All permissions active and saved to security engine
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
                Discard Changes
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
              <span>Save & Activate Permissions</span>
            </button>
          </div>
        </div>
      </div>

      {/* COPY FROM STAFF MODAL */}
      {isCopyModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Copy className="w-4 h-4 text-indigo-600" />
                Copy Permissions Template
              </h3>
              <button
                type="button"
                onClick={() => setIsCopyModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-500">
              Select another staff member to clone their effective permissions directly onto{' '}
              <strong className="text-slate-800">{activeStaffMember?.name || 'the selected staff member'}</strong>.
            </p>

            <div className="space-y-2 max-h-60 overflow-y-auto">
              {staffMembers
                .filter((s) => s.id !== selectedStaffId)
                .map((member) => (
                  <div
                    key={member.id}
                    onClick={() => setCopySourceStaffId(member.id)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      copySourceStaffId === member.id
                        ? 'bg-indigo-50/70 border-indigo-500 text-indigo-900'
                        : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-800'
                    }`}
                  >
                    <div>
                      <p className="text-xs font-bold">{member.name}</p>
                      <p className="text-[11px] text-slate-500">{member.email}</p>
                    </div>
                    {copySourceStaffId === member.id && (
                      <Check className="w-4 h-4 text-indigo-600 stroke-[3]" />
                    )}
                  </div>
                ))}
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsCopyModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!copySourceStaffId}
                onClick={() => handleCopyFromStaff(copySourceStaffId)}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Copy & Apply
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL */}
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
              <p className="font-bold text-slate-800 flex items-center gap-1.5">
                <BadgeCheck className="w-3.5 h-3.5 text-indigo-600" /> Security Audit Notice:
              </p>
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
