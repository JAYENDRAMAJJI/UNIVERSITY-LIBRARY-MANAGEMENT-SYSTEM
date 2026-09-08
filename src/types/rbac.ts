/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Role } from './library';

export type PermissionAction =
  | 'view'
  | 'add'
  | 'edit'
  | 'delete'
  | 'approve'
  | 'reject'
  | 'print'
  | 'export'
  | 'manage';

export const PERMISSION_ACTIONS: { id: PermissionAction; label: string; description: string }[] = [
  { id: 'view', label: 'View', description: 'Can view records and browse module data' },
  { id: 'add', label: 'Add', description: 'Can create and register new items/records' },
  { id: 'edit', label: 'Edit', description: 'Can modify existing records' },
  { id: 'delete', label: 'Delete', description: 'Can remove or archive records' },
  { id: 'approve', label: 'Approve', description: 'Can grant approvals (accounts, no-due, requests)' },
  { id: 'reject', label: 'Reject', description: 'Can reject requests or applications' },
  { id: 'print', label: 'Print', description: 'Can print cards, barcodes, tags, and certificates' },
  { id: 'export', label: 'Export', description: 'Can export reports and spreadsheets' },
  { id: 'manage', label: 'Manage', description: 'Full administrative control over settings and configurations' },
];

export type ModuleKey =
  | 'dashboard'
  | 'books'
  | 'inventory'
  | 'categories'
  | 'racks'
  | 'shelves'
  | 'barcodes'
  | 'circulation'
  | 'reservations'
  | 'members'
  | 'approvals'
  | 'fines'
  | 'payments'
  | 'attendance'
  | 'nodue'
  | 'reports'
  | 'procurement'
  | 'digital_library'
  | 'downloads'
  | 'notifications'
  | 'settings'
  | 'audit_logs'
  | 'roles_permissions';

export interface ModuleDefinition {
  id: ModuleKey;
  label: string;
  category: 'CORE' | 'CATALOG_INVENTORY' | 'CIRCULATION' | 'MEMBERS' | 'SERVICES' | 'ADMINISTRATION';
  description: string;
  supportedActions: PermissionAction[];
}

export const RBAC_MODULES: ModuleDefinition[] = [
  // Core
  {
    id: 'dashboard',
    label: 'Admin Dashboard',
    category: 'CORE',
    description: 'System metrics, analytics, quick actions, and loan tracking',
    supportedActions: ['view', 'export'],
  },

  // Catalog & Inventory
  {
    id: 'books',
    label: 'Books Management',
    category: 'CATALOG_INVENTORY',
    description: 'Book catalog, ISBN, metadata, and physical book details',
    supportedActions: ['view', 'add', 'edit', 'delete', 'export'],
  },
  {
    id: 'inventory',
    label: 'Inventory & Accession Copies',
    category: 'CATALOG_INVENTORY',
    description: 'Physical copies, accession numbers, and barcode allocation',
    supportedActions: ['view', 'add', 'edit', 'delete', 'print', 'export'],
  },
  {
    id: 'categories',
    label: 'Categories & Master Data',
    category: 'CATALOG_INVENTORY',
    description: 'Book categories, authors, and publisher records',
    supportedActions: ['view', 'add', 'edit', 'delete', 'export'],
  },
  {
    id: 'racks',
    label: 'Rack Management',
    category: 'CATALOG_INVENTORY',
    description: 'Physical rack layouts, academic domains, and shelf capacities',
    supportedActions: ['view', 'add', 'edit', 'delete', 'print', 'manage'],
  },
  {
    id: 'shelves',
    label: 'Shelf Management',
    category: 'CATALOG_INVENTORY',
    description: 'Shelf tiers, capacities, subject mappings, and book transfers',
    supportedActions: ['view', 'add', 'edit', 'delete', 'print', 'manage'],
  },
  {
    id: 'barcodes',
    label: 'Barcode & QR Code Desk',
    category: 'CATALOG_INVENTORY',
    description: 'Generate, scan, and print library barcodes and QR tags',
    supportedActions: ['view', 'add', 'print', 'export', 'manage'],
  },

  // Circulation
  {
    id: 'circulation',
    label: 'Book Issue, Return & Renewal',
    category: 'CIRCULATION',
    description: 'Daily book transactions, returns, and time extension requests',
    supportedActions: ['view', 'add', 'edit', 'approve', 'reject', 'print', 'export'],
  },
  {
    id: 'reservations',
    label: 'Reservations Queue',
    category: 'CIRCULATION',
    description: 'Book hold requests, queue ordering, and allocation',
    supportedActions: ['view', 'add', 'edit', 'approve', 'reject', 'export'],
  },
  {
    id: 'attendance',
    label: 'Attendance & Gate Check-In/Out',
    category: 'CIRCULATION',
    description: 'Library entry/exit attendance desk, pass scanning, and logs',
    supportedActions: ['view', 'add', 'edit', 'delete', 'export', 'manage'],
  },
  {
    id: 'fines',
    label: 'Fine Management & Dues',
    category: 'CIRCULATION',
    description: 'Fine calculation, fine records, and overdue tracking',
    supportedActions: ['view', 'add', 'edit', 'delete', 'approve', 'export'],
  },
  {
    id: 'payments',
    label: 'Fee Payments & Fine Waivers',
    category: 'CIRCULATION',
    description: 'Payment collection, receipt generation, and fine waiver requests',
    supportedActions: ['view', 'add', 'approve', 'print', 'export'],
  },

  // Members
  {
    id: 'members',
    label: 'Member Management',
    category: 'MEMBERS',
    description: 'Student & Faculty library accounts, profiles, and cards',
    supportedActions: ['view', 'add', 'edit', 'delete', 'print', 'export', 'manage'],
  },
  {
    id: 'approvals',
    label: 'Account Approvals & Rejections',
    category: 'MEMBERS',
    description: 'Pending member registrations, identity verification, and status approval',
    supportedActions: ['view', 'approve', 'reject', 'export'],
  },
  {
    id: 'nodue',
    label: 'No Due Clearance Certificates',
    category: 'MEMBERS',
    description: 'No due applications, clearance checks, and certificate issuance',
    supportedActions: ['view', 'add', 'edit', 'approve', 'reject', 'print', 'export'],
  },

  // Services
  {
    id: 'procurement',
    label: 'Book Purchasing & Procurement',
    category: 'SERVICES',
    description: 'Book acquisition requests, vendor quotes, and purchase orders',
    supportedActions: ['view', 'add', 'edit', 'approve', 'reject', 'export'],
  },
  {
    id: 'digital_library',
    label: 'Digital Library & Research',
    category: 'SERVICES',
    description: 'Digital resources, e-books, research papers, and downloads',
    supportedActions: ['view', 'add', 'edit', 'delete', 'export'],
  },
  {
    id: 'downloads',
    label: 'Official Forms & Downloads',
    category: 'SERVICES',
    description: 'Library rules, clearance templates, and downloadable documents',
    supportedActions: ['view', 'add', 'edit', 'delete', 'print'],
  },
  {
    id: 'notifications',
    label: 'Notifications & Alerts',
    category: 'SERVICES',
    description: 'Broadcast notices, overdue warnings, and announcement banners',
    supportedActions: ['view', 'add', 'edit', 'delete', 'manage'],
  },

  // Administration
  {
    id: 'reports',
    label: 'Library Analytics & Reports',
    category: 'ADMINISTRATION',
    description: 'Comprehensive circulation, member, inventory, and financial reports',
    supportedActions: ['view', 'print', 'export'],
  },
  {
    id: 'settings',
    label: 'Library Settings & Operating Hours',
    category: 'ADMINISTRATION',
    description: 'Library timings, holiday calendars, borrowing limits, fine policies',
    supportedActions: ['view', 'edit', 'manage'],
  },
  {
    id: 'audit_logs',
    label: 'System Audit Logs',
    category: 'ADMINISTRATION',
    description: 'Complete audit trail of user actions, approvals, and configuration changes',
    supportedActions: ['view', 'export'],
  },
  {
    id: 'roles_permissions',
    label: 'Roles & Permissions Control',
    category: 'ADMINISTRATION',
    description: 'Configure Staff permissions, granular overrides, and security matrix',
    supportedActions: ['view', 'edit', 'manage'],
  },
];

export type ModulePermissions = Record<PermissionAction, boolean>;
export type PermissionMatrix = Record<ModuleKey, ModulePermissions>;

/**
 * Creates an empty/false permission set for a module
 */
export const createEmptyModulePermissions = (): ModulePermissions => ({
  view: false,
  add: false,
  edit: false,
  delete: false,
  approve: false,
  reject: false,
  print: false,
  export: false,
  manage: false,
});

/**
 * Creates a full/true permission set for a module
 */
export const createFullModulePermissions = (): ModulePermissions => ({
  view: true,
  add: true,
  edit: true,
  delete: true,
  approve: true,
  reject: true,
  print: true,
  export: true,
  manage: true,
});

/**
 * Generate full admin permission matrix (all true)
 */
export const createAdminDefaultPermissions = (): PermissionMatrix => {
  const matrix: Partial<PermissionMatrix> = {};
  RBAC_MODULES.forEach((mod) => {
    matrix[mod.id] = createFullModulePermissions();
  });
  return matrix as PermissionMatrix;
};

/**
 * Generate safe, default Library Staff permission matrix based on strict specifications:
 *
 * DEFAULT STAFF ACCESS:
 * - Books & Copies: View, Add, Edit (NO Delete)
 * - Racks & Shelves: View, Add, Limited Edit (NO Delete, NO Manage)
 * - Barcode/QR: Scan & Print
 * - Book Issue/Return/Renewal: Process (View, Add, Edit, Approve, Print)
 * - Members: View (NO Delete, NO Manage)
 * - Fine Payments: View & Record (NO Fine Waiver / NO Delete)
 * - Attendance: View, Check-In & Check-Out (View, Add, Edit)
 * - No Due: View & Verify (NO Final Approval or Issue)
 * - Reports: View & Print permitted reports
 *
 * STAFF RESTRICTIONS (DENIED):
 * - Critical Delete actions
 * - Account Approval or Rejection
 * - Admin Management
 * - Staff Management
 * - Roles & Permissions
 * - Library Settings
 * - Operating Hours
 * - Fine Rules & Waivers
 * - Final No Due Approval or Issue
 * - Sensitive Audit Logs
 */
export const createStaffDefaultPermissions = (): PermissionMatrix => {
  const matrix: Partial<PermissionMatrix> = {};

  // Initialize all with empty permissions
  RBAC_MODULES.forEach((mod) => {
    matrix[mod.id] = createEmptyModulePermissions();
  });

  // 1. Dashboard
  matrix.dashboard = { ...createEmptyModulePermissions(), view: true, export: true };

  // 2. Books & Inventory
  matrix.books = { ...createEmptyModulePermissions(), view: true, add: true, edit: true, export: true };
  matrix.inventory = { ...createEmptyModulePermissions(), view: true, add: true, edit: true, print: true, export: true };
  matrix.categories = { ...createEmptyModulePermissions(), view: true, add: true, edit: true };
  matrix.racks = { ...createEmptyModulePermissions(), view: true, add: true, edit: true, print: true };
  matrix.shelves = { ...createEmptyModulePermissions(), view: true, add: true, edit: true, print: true };
  matrix.barcodes = { ...createEmptyModulePermissions(), view: true, add: true, print: true, export: true };

  // 3. Daily Circulation
  matrix.circulation = { ...createEmptyModulePermissions(), view: true, add: true, edit: true, approve: true, print: true, export: true };
  matrix.reservations = { ...createEmptyModulePermissions(), view: true, add: true, edit: true, approve: true, export: true };
  matrix.attendance = { ...createEmptyModulePermissions(), view: true, add: true, edit: true, export: true };
  matrix.fines = { ...createEmptyModulePermissions(), view: true, add: true, edit: false, delete: false, approve: false, export: true };
  matrix.payments = { ...createEmptyModulePermissions(), view: true, add: true, print: true };

  // 4. Members & Approvals (Staff can only view members, cannot approve accounts or delete)
  matrix.members = { ...createEmptyModulePermissions(), view: true, print: true };
  matrix.approvals = { ...createEmptyModulePermissions(), view: false, approve: false, reject: false };
  matrix.nodue = { ...createEmptyModulePermissions(), view: true, edit: false, approve: false, reject: false, print: false };

  // 5. Services & Resources
  matrix.procurement = { ...createEmptyModulePermissions(), view: true, add: true };
  matrix.digital_library = { ...createEmptyModulePermissions(), view: true, add: true, edit: true, export: true };
  matrix.downloads = { ...createEmptyModulePermissions(), view: true, print: true };
  matrix.notifications = { ...createEmptyModulePermissions(), view: true };

  // 6. Administration (All restricted for Staff by default)
  matrix.reports = { ...createEmptyModulePermissions(), view: true, print: true, export: true };
  matrix.settings = { ...createEmptyModulePermissions() };
  matrix.audit_logs = { ...createEmptyModulePermissions() };
  matrix.roles_permissions = { ...createEmptyModulePermissions() };

  return matrix as PermissionMatrix;
};

export interface AuditLogRecord {
  id: string;
  userName: string;
  userEmail: string;
  role: Role;
  module: ModuleKey | string;
  action: string;
  details: string;
  timestamp: string;
  ipAddress?: string;
}
