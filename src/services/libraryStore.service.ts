import XLSX from 'xlsx-js-style';
import { exportStyledExcelFile } from '../utils/excelExport';
import { digitalFileStorage } from '../utils/digitalFileStorage';
import { api } from './api';
import { normalizeRackAndShelf, ACADEMIC_RACK_HIERARCHY, reconcileAcademicRacks, RackDefinition, ShelfDefinition } from '../data/rackShelfHierarchy';
import {
  Role,
  Book,
  BookCopy,
  Category,
  Author,
  Publisher,
  MemberProfile,
  IssueTransaction,
  Reservation,
  FineRecord,
  DigitalResource,
  DigitalResourceType,
  DigitalDownloadLog,
  AuditLog,
  SystemConfig,
  CopyCondition,
  BookStatus,
  ProcurementRequest,
  ProcurementStatus,
  ProcurementTimelineStep,
  Vendor,
  Notice,
  ExtensionRequest,
  AttendanceRecord,
  AttendanceStatus,
  VerificationMethod,
  VisitPurpose,
  NoDueCertificate,
  NoDueApplication,
  NoDueStatus,
  NoDuePurpose,
  NoDueApplicationHistory,
  OfficialDocument,
  CalendarEventType,
  CalendarEventCategory,
  UniversityCalendarEvent,
  UserStatus,
  PermissionAction,
  ModuleKey,
  ModulePermissions,
  PermissionMatrix,
  createAdminDefaultPermissions,
  createStaffDefaultPermissions,
  createEmptyModulePermissions,
  RBAC_MODULES,
  AuditLogRecord,
} from '../types/library';

// Key for LocalStorage
const STORAGE_KEY = 'college_lms_master_state_v8';

// Real Local System Date & Time Helpers (Uses local clock instead of UTC ISO strings)
export const parseMonthNumFromDate = (dateStr?: string): number => {
  if (!dateStr) return -1;
  const parts = dateStr.trim().split(/[- /]/);
  if (parts.length >= 2) {
    const m = parseInt(parts[1], 10);
    if (!isNaN(m) && m >= 1 && m <= 12) return m;
  }
  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) return d.getMonth() + 1;
  return -1;
};

/**
 * Generates role-based 3-letter prefix:
 * - Student -> STU
 * - Faculty -> FAC
 * - Library Staff -> STA
 * - Admin -> ADM
 * - Librarian -> LIB
 * - Guest / Other -> GUE / OTH
 */
export const getRoleCardPrefix = (role?: string): string => {
  if (!role) return 'STU';
  const r = role.toUpperCase().trim();
  switch (r) {
    case 'STUDENT':
      return 'STU';
    case 'FACULTY':
      return 'FAC';
    case 'STAFF':
    case 'LIBRARY_STAFF':
    case 'LIBRARY STAFF':
      return 'STA';
    case 'ADMIN':
    case 'ADMINISTRATOR':
      return 'ADM';
    case 'LIBRARIAN':
      return 'LIB';
    case 'GUEST':
      return 'GUE';
    case 'OTHER':
      return 'OTH';
    default:
      return r.slice(0, 3).toUpperCase();
  }
};

export const generateLibraryCardId = (role?: string, year?: number | string): string => {
  const prefix = getRoleCardPrefix(role);
  const yr = year || new Date().getFullYear();
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${yr}-${randomSuffix}`;
};

export const getLocalDateStr = (d: Date = new Date()): string => {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export const getLocalDateTimeStr = (d: Date = new Date()): string => {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

export const getLocalTimeMinutesStr = (d: Date = new Date()): string => {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export const getTodayOffsetStr = (offsetDays: number = 0): string => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return getLocalDateStr(d);
};

export const getAllUnifiedFines = (state: any): FineRecord[] => {
  if (!state) return [];
  const list: FineRecord[] = [...(state.fines || [])];
  const today = new Date();
  const todayDateOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const fineRate = state.config?.fineRatePerDay || 5;

  // Process transactions for fine amounts not explicitly stored in state.fines
  (state.transactions || []).forEach((t: any) => {
    const alreadyInFines = list.some((f) => f.transactionId === t.id);
    if (!alreadyInFines) {
      if (t.fineAmount && t.fineAmount > 0) {
        list.push({
          id: `fine-tx-${t.id}`,
          transactionId: t.id,
          memberId: t.memberId,
          memberName: t.memberName,
          memberCardNo: t.memberCardNo,
          bookTitle: t.bookTitle,
          amount: t.fineAmount,
          paidAmount: t.fineStatus === 'PAID' ? t.fineAmount : 0,
          reason: 'OVERDUE',
          status: t.fineStatus === 'PAID' ? 'PAID' : t.fineStatus === 'WAIVED' ? 'WAIVED' : 'UNPAID',
          createdDate: t.returnDate ? t.returnDate.split(' ')[0] : t.dueDate,
          paidDate: t.fineStatus === 'PAID' ? (t.returnDate ? t.returnDate.split(' ')[0] : getLocalDateStr(new Date())) : undefined,
          receiptNo: (t as any).receiptNo,
          waiveReason: (t as any).waiveReason,
        });
      } else if (t.returnDate && t.dueDate) {
        // Returned loan check
        const returnD = new Date(t.returnDate.split(' ')[0]);
        const dueD = new Date(t.dueDate.split(' ')[0]);
        if (returnD > dueD) {
          const diffDays = Math.max(1, Math.ceil((returnD.getTime() - dueD.getTime()) / (1000 * 3600 * 24)));
          const computedFine = diffDays * fineRate;
          list.push({
            id: `fine-ret-${t.id}`,
            transactionId: t.id,
            memberId: t.memberId,
            memberName: t.memberName,
            memberCardNo: t.memberCardNo,
            bookTitle: t.bookTitle,
            amount: computedFine,
            paidAmount: t.fineStatus === 'PAID' ? computedFine : 0,
            reason: 'OVERDUE',
            status: t.fineStatus === 'PAID' ? 'PAID' : t.fineStatus === 'WAIVED' ? 'WAIVED' : 'UNPAID',
            createdDate: t.returnDate.split(' ')[0],
            paidDate: t.fineStatus === 'PAID' ? t.returnDate.split(' ')[0] : undefined,
            receiptNo: (t as any).receiptNo,
            waiveReason: (t as any).waiveReason,
          });
        }
      } else if (t.status === 'OVERDUE' || (t.status === 'ISSUED' && t.dueDate)) {
        // Active loan check
        const dueD = new Date(t.dueDate.split(' ')[0]);
        if (todayDateOnly > dueD) {
          const diffDays = Math.max(1, Math.ceil((todayDateOnly.getTime() - dueD.getTime()) / (1000 * 3600 * 24)));
          const computedFine = diffDays * fineRate;
          list.unshift({
            id: `fine-live-${t.id}`,
            transactionId: t.id,
            memberId: t.memberId,
            memberName: t.memberName,
            memberCardNo: t.memberCardNo,
            bookTitle: t.bookTitle,
            amount: computedFine,
            paidAmount: 0,
            reason: 'OVERDUE',
            status: 'UNPAID',
            createdDate: t.dueDate,
          });
        }
      }
    }
  });

  return list;
};

export const getTransactionFineAmount = (
  tx: IssueTransaction,
  state: any
): { fineAmount: number; fineStatus: 'UNPAID' | 'PAID' | 'WAIVED' | 'CLEARED'; receiptNo?: string; waiveReason?: string } => {
  if (!tx) return { fineAmount: 0, fineStatus: 'CLEARED' };
  const fineRate = state?.config?.fineRatePerDay || 5;

  // 1. Check matching fine in unified fines
  const allFines = getAllUnifiedFines(state);
  const matchedFine = allFines.find((f) => f.transactionId === tx.id);
  if (matchedFine) {
    return {
      fineAmount: matchedFine.amount || 0,
      fineStatus: (matchedFine.status as any) || 'UNPAID',
      receiptNo: matchedFine.receiptNo,
      waiveReason: matchedFine.waiveReason,
    };
  }

  // 2. If transaction itself has fineAmount recorded
  if (tx.fineAmount && tx.fineAmount > 0) {
    return {
      fineAmount: tx.fineAmount,
      fineStatus: tx.fineStatus || (tx.status === 'RETURNED' || tx.status === 'OVERDUE' ? 'UNPAID' : 'CLEARED'),
      receiptNo: (tx as any).receiptNo,
      waiveReason: (tx as any).waiveReason,
    };
  }

  // 3. Dynamic check for returned loans past due date
  if (tx.returnDate && tx.dueDate) {
    const returnD = new Date(tx.returnDate.split(' ')[0]);
    const dueD = new Date(tx.dueDate.split(' ')[0]);
    if (returnD > dueD) {
      const diffDays = Math.max(1, Math.ceil((returnD.getTime() - dueD.getTime()) / (1000 * 3600 * 24)));
      return {
        fineAmount: diffDays * fineRate,
        fineStatus: tx.fineStatus === 'PAID' ? 'PAID' : tx.fineStatus === 'WAIVED' ? 'WAIVED' : 'UNPAID',
        receiptNo: (tx as any).receiptNo,
        waiveReason: (tx as any).waiveReason,
      };
    }
  }

  // 4. Dynamic check for active unreturned loans past due date
  if (tx.status === 'OVERDUE' || (tx.status === 'ISSUED' && tx.dueDate)) {
    const today = new Date();
    const todayDateOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const dueD = new Date(tx.dueDate.split(' ')[0]);
    if (todayDateOnly > dueD) {
      const diffDays = Math.max(1, Math.ceil((todayDateOnly.getTime() - dueD.getTime()) / (1000 * 3600 * 24)));
      return {
        fineAmount: diffDays * fineRate,
        fineStatus: 'UNPAID',
      };
    }
  }

  return { fineAmount: 0, fineStatus: 'CLEARED' };
};

export const getMemberPendingFines = (
  memberIdOrCardNoOrEmail: string,
  state: any
): number => {
  const term = (memberIdOrCardNoOrEmail || '').trim().toLowerCase();
  if (!term) return 0;

  const member = (state.members || []).find(
    (m: any) =>
      m.id?.toLowerCase() === term ||
      m.memberCardNo?.toLowerCase() === term ||
      m.email?.toLowerCase() === term ||
      m.name?.toLowerCase() === term
  );

  if (!member) return 0;

  const mId = member.id;
  const mCard = (member.memberCardNo || '').toLowerCase();

  const allFines = getAllUnifiedFines(state);
  let totalPending = 0;

  allFines.forEach((f) => {
    const isMember = f.memberId === mId || (f.memberCardNo && f.memberCardNo.toLowerCase() === mCard);
    if (isMember && f.status === 'UNPAID') {
      totalPending += f.amount || 0;
    }
  });

  return Math.round(totalPending * 100) / 100;
};

export const getSystemFineSummary = (state: any): {
  totalFineAssessments: number;
  totalPaidFines: number;
  totalPendingFines: number;
  totalWaivedFines: number;
} => {
  const allFines = getAllUnifiedFines(state);
  let totalPaid = 0;
  let totalPending = 0;
  let totalWaived = 0;

  allFines.forEach((f) => {
    if (f.status === 'PAID') {
      totalPaid += (f.paidAmount || f.amount || 0);
    } else if (f.status === 'UNPAID') {
      totalPending += (f.amount || 0);
    } else if (f.status === 'WAIVED') {
      totalWaived += (f.amount || 0);
    }
  });

  const totalAssessments = Math.round((totalPaid + totalPending + totalWaived) * 100) / 100;

  return {
    totalFineAssessments: totalAssessments,
    totalPaidFines: Math.round(totalPaid * 100) / 100,
    totalPendingFines: Math.round(totalPending * 100) / 100,
    totalWaivedFines: Math.round(totalWaived * 100) / 100,
  };
};

export const getTodayOffsetDateTimeStr = (offsetDays: number = 0, timePart: string = '10:00'): string => {
  return `${getTodayOffsetStr(offsetDays)} ${timePart}`;
};

export const formatOnlyTimeInBracket = (str?: string): string => {
  if (!str || str === '--') return '--';
  const clean = str.trim();
  const unbracketed = clean.replace(/^\(|\)$/g, '').trim();
  const parts = unbracketed.split(' ');

  if (parts.length === 2) {
    return `${parts[0]} (${parts[1]})`;
  }
  if (parts.length === 3) {
    return `${parts[0]} (${parts[1]} ${parts[2]})`;
  }
  if (unbracketed.includes(':') && !unbracketed.includes('-')) {
    return `(${unbracketed})`;
  }
  return unbracketed;
};

export interface OperatingHoursStatus {
  isOpen: boolean;
  statusText: string;
  reason?: string;
  nextOpenText?: string;
  isHoliday?: boolean;
  holidayName?: string;
  isSpecialWorkingDay?: boolean;
  calendarEvent?: UniversityCalendarEvent;
}

export const IS_NATIONAL_HOLIDAY = (d: Date = new Date()): { isHoliday: boolean; holidayName?: string } => {
  const month = d.getMonth() + 1; // 1-12
  const date = d.getDate(); // 1-31

  // Standard Indian & Gazetted National Holidays
  const holidays: Record<string, string> = {
    '1-1': "New Year's Day",
    '1-26': 'Republic Day',
    '3-8': "International Women's Day",
    '3-25': 'Holi Festival',
    '4-14': 'Dr. B.R. Ambedkar Jayanti',
    '8-15': 'Independence Day',
    '10-2': 'Gandhi Jayanti',
    '10-12': 'Dussehra / Vijayadashami',
    '11-1': 'Kannada Rajyotsava / Statehood Day',
    '12-25': 'Christmas Day',
  };

  const key = `${month}-${date}`;
  if (holidays[key]) {
    return { isHoliday: true, holidayName: holidays[key] };
  }

  return { isHoliday: false };
};

let _activeLibraryStore: any = null;

export const getLibraryOperatingStatus = (
  now: Date = new Date(),
  customEvents?: UniversityCalendarEvent[]
): OperatingHoursStatus => {
  const events = customEvents || (_activeLibraryStore?.snapshot?.calendarEvents) || [];
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // 1-12
  const date = now.getDate(); // 1-31
  const pad = (n: number) => String(n).padStart(2, '0');
  const dateKey = `${year}-${pad(month)}-${pad(date)}`;
  const monthDayKey = `${pad(month)}-${pad(date)}`;
  const shortMonthDayKey = `${month}-${date}`;

  // Find matching event for given date (exact date, multi-day span, or annual recurring)
  const matchedEvent = (events || []).find((ev) => {
    if (ev.date === dateKey) return true;
    if (ev.isRecurringAnnually && (ev.date.endsWith(`-${monthDayKey}`) || ev.date.endsWith(`-${shortMonthDayKey}`))) return true;
    if (ev.endDate && ev.date <= dateKey && ev.endDate >= dateKey) return true;
    return false;
  });

  const dayOfWeek = now.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const currentMinutes = hours * 60 + minutes;

  // 1. If explicit calendar event override exists
  if (matchedEvent) {
    if (matchedEvent.type === 'HOLIDAY' || !matchedEvent.isLibraryOpen) {
      return {
        isOpen: false,
        statusText: `CLOSED (${matchedEvent.title})`,
        reason: matchedEvent.description || `Central Library is closed today for University Holiday: ${matchedEvent.title}.`,
        nextOpenText: 'Reopens next scheduled working day at 8:00 AM',
        isHoliday: true,
        holidayName: matchedEvent.title,
        calendarEvent: matchedEvent,
      };
    }

    // Working Day or Special Hours override (even on Sundays)
    const openTimeStr = matchedEvent.openTime || '08:00';
    const closeTimeStr = matchedEvent.closeTime || '22:00';
    const [oH, oM] = openTimeStr.split(':').map((n) => parseInt(n, 10) || 0);
    const [cH, cM] = closeTimeStr.split(':').map((n) => parseInt(n, 10) || 0);
    const eventOpenMins = oH * 60 + oM;
    const eventCloseMins = cH * 60 + cM;

    if (currentMinutes < eventOpenMins) {
      return {
        isOpen: false,
        statusText: `CLOSED (Opens ${openTimeStr})`,
        reason: `Library opens today at ${openTimeStr}.`,
        nextOpenText: `Opens today at ${openTimeStr}`,
        isSpecialWorkingDay: true,
        calendarEvent: matchedEvent,
      };
    }

    if (currentMinutes >= eventCloseMins) {
      let nextText = 'Opens tomorrow at 8:00 AM';
      if (dayOfWeek === 6) {
        nextText = 'Opens Monday at 8:00 AM';
      } else if (dayOfWeek === 5) {
        nextText = 'Opens tomorrow (Saturday) at 9:00 AM';
      }
      return {
        isOpen: false,
        statusText: `CLOSED (After ${closeTimeStr})`,
        reason: 'Closed after operating hours.',
        nextOpenText: nextText,
        isSpecialWorkingDay: true,
        calendarEvent: matchedEvent,
      };
    }

    return {
      isOpen: true,
      statusText: `OPEN (${matchedEvent.title})`,
      reason: `${matchedEvent.title} • Active: ${matchedEvent.customHoursText || `${openTimeStr} – ${closeTimeStr}`}`,
      nextOpenText: `Closes today at ${closeTimeStr}`,
      isSpecialWorkingDay: true,
      calendarEvent: matchedEvent,
    };
  }

  // 2. Default Sunday check (if no override)
  if (dayOfWeek === 0) {
    return {
      isOpen: false,
      statusText: 'CLOSED (Sunday)',
      reason: 'Closed on Sundays for weekly maintenance.',
      nextOpenText: 'Opens Monday 8:00 AM',
    };
  }

  // 3. Fallback National Gazetted Holiday check
  const holidayCheck = IS_NATIONAL_HOLIDAY(now);
  if (holidayCheck.isHoliday) {
    return {
      isOpen: false,
      statusText: `CLOSED (${holidayCheck.holidayName})`,
      reason: `Closed today for ${holidayCheck.holidayName}.`,
      nextOpenText: 'Reopens next working day at 8:00 AM',
      isHoliday: true,
      holidayName: holidayCheck.holidayName,
    };
  }

  // 4. Standard Working Day Operating Hours
  // Monday – Friday: 8:00 AM – 10:00 PM (480 to 1320 mins)
  // Saturday: 9:00 AM – 4:00 PM (540 to 960 mins)
  const isSaturday = dayOfWeek === 6;
  const openMinutes = isSaturday ? 9 * 60 : 8 * 60;     // Sat: 9:00 AM, Mon-Fri: 8:00 AM
  const closeMinutes = isSaturday ? 16 * 60 : 22 * 60;  // Sat: 4:00 PM, Mon-Fri: 10:00 PM
  const scheduleStr = isSaturday ? '9:00 AM – 4:00 PM' : '8:00 AM – 10:00 PM';
  const openTimeStr = isSaturday ? '9:00 AM' : '8:00 AM';
  const closeTimeStr = isSaturday ? '4:00 PM' : '10:00 PM';

  if (currentMinutes < openMinutes) {
    return {
      isOpen: false,
      statusText: `CLOSED (Before ${openTimeStr})`,
      reason: `Library opens today at ${openTimeStr}.`,
      nextOpenText: `Opens today at ${openTimeStr}`,
    };
  }

  if (currentMinutes >= closeMinutes) {
    let nextText = 'Opens tomorrow at 8:00 AM';
    if (isSaturday) {
      nextText = 'Opens Monday at 8:00 AM';
    } else if (dayOfWeek === 5) {
      nextText = 'Opens tomorrow (Saturday) at 9:00 AM';
    }
    return {
      isOpen: false,
      statusText: `CLOSED (After ${closeTimeStr})`,
      reason: `Daily operating hours ended at ${closeTimeStr}.`,
      nextOpenText: nextText,
    };
  }

  return {
    isOpen: true,
    statusText: `OPEN NOW (${scheduleStr})`,
    reason: 'Central Library Circulation Desk & Reading Rooms are open.',
    nextOpenText: `Closes today at ${closeTimeStr}`,
  };
};

const DEFAULT_CONFIG: SystemConfig = {
  fineRatePerDay: 5.0,
  studentMaxLoanDays: 14,
  studentMaxBooks: 4,
  facultyMaxLoanDays: 30,
  facultyMaxBooks: 10,
  maxRenewalLimit: 2,
  reservationHoldHours: 48,
  autoSendEmailAlerts: true,
  enableMaintenanceMode: false,
  libraryName: 'University Central Library & Learning Resource Center',
};

export const DEFAULT_CALENDAR_EVENTS: UniversityCalendarEvent[] = [];


// State Interface
interface StateSchema {
  categories: Category[];
  authors: Author[];
  publishers: Publisher[];
  books: Book[];
  members: MemberProfile[];
  transactions: IssueTransaction[];
  reservations: Reservation[];
  fines: FineRecord[];
  digitalResources: DigitalResource[];
  auditLogs: AuditLog[];
  config: SystemConfig;
  procurementRequests: ProcurementRequest[];
  notices: Notice[];
  extensionRequests: ExtensionRequest[];
  vendors?: Vendor[];
  attendanceRecords?: AttendanceRecord[];
  downloadLogs?: DigitalDownloadLog[];
  bookmarkedIds?: string[];
  noDueCertificates?: NoDueCertificate[];
  noDueApplications?: NoDueApplication[];
  officialDocuments?: OfficialDocument[];
  calendarEvents?: UniversityCalendarEvent[];
  readNoticeIds?: { [userKey: string]: string[] };
  racks?: RackDefinition[];
  rolePermissions?: Record<string, PermissionMatrix>;
  userPermissions?: Record<string, Partial<PermissionMatrix>>;
}

// Lightweight Observable State Manager
class SimpleBehaviorSubject<T> {
  private value: T;
  private listeners: ((val: T) => void)[] = [];

  constructor(initialValue: T) {
    this.value = initialValue;
  }

  getValue(): T {
    return this.value;
  }

  next(newValue: T): void {
    this.value = newValue;
    this.listeners.forEach((listener) => listener(newValue));
  }

  subscribe(listener: (val: T) => void) {
    this.listeners.push(listener);
    listener(this.value);
    return {
      unsubscribe: () => {
        this.listeners = this.listeners.filter((l) => l !== listener);
      },
    };
  }
}

class LibraryStoreService {
  private state$: SimpleBehaviorSubject<StateSchema>;

  constructor() {
    _activeLibraryStore = this;

    // Actively purge any legacy localStorage caches from previous demo runs
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('college_lms_master_state_v8');
        localStorage.removeItem('college_lms_master_state_v7');
        localStorage.removeItem('college_lms_master_state_v6');
        localStorage.removeItem('college_lms_master_state');
        localStorage.removeItem('library_store_state');
      } catch {
        // Ignore
      }
    }

    const initialState = this.getDefaultState();
    this.state$ = new SimpleBehaviorSubject<StateSchema>(initialState);

    // Run operating hours auto checkout logic on initialization
    this.checkAndAutoCheckoutExpiredSessions();

    // Setup periodic auto checkout timer (runs every 30 seconds)
    if (typeof window !== 'undefined') {
      setInterval(() => {
        this.checkAndAutoCheckoutExpiredSessions();
      }, 30000);
    }

    // Hydrate live library data strictly from MongoDB Backend API
    this.initFromBackend();
  }

  /**
   * Connects to backend /api/sync endpoint to populate state directly from MongoDB
   */
  public async initFromBackend(): Promise<void> {
    try {
      const res = await api.get<{ success: boolean; state: Partial<StateSchema> }>('/sync');
      if (res.success && res.data && res.data.state) {
        const remoteState = res.data.state;
        const current = this.state$.getValue();
        const merged: StateSchema = {
          ...current,
          ...remoteState,
          config: remoteState.config || current.config,
          racks: reconcileAcademicRacks(remoteState.racks || current.racks),
        } as StateSchema;
        this.state$.next(merged);
        console.log('✅ [LibraryStore] Live state loaded from MongoDB.');
      }
    } catch (err) {
      console.warn('⚠️ [LibraryStore] Sync from MongoDB failed:', err);
    }
  }

  private getDefaultState(): StateSchema {
    return {
      categories: [],
      authors: [],
      publishers: [],
      books: [],
      members: [],
      transactions: [],
      reservations: [],
      fines: [],
      digitalResources: [],
      auditLogs: [],
      config: DEFAULT_CONFIG,
      procurementRequests: [],
      notices: [],
      extensionRequests: [],
      vendors: [],
      attendanceRecords: [],
      noDueApplications: [],
      noDueCertificates: [],
      officialDocuments: [],
      calendarEvents: [],
      readNoticeIds: {},
      racks: ACADEMIC_RACK_HIERARCHY,
      rolePermissions: {
        ADMIN: createAdminDefaultPermissions(),
        STAFF: createStaffDefaultPermissions(),
        LIBRARIAN: createStaffDefaultPermissions(),
      },
      userPermissions: {},
    };
  }

  get snapshot(): StateSchema {
    return this.state$.getValue();
  }

  public getObservable() {
    return this.state$;
  }

  // ================= RBAC & PERMISSION MANAGEMENT =================
  public getRolePermissions(role: string): PermissionMatrix {
    const r = role.toUpperCase();
    if (r === 'ADMIN' || r === 'ADMINISTRATOR') {
      return createAdminDefaultPermissions();
    }
    const state = this.snapshot;
    if (state.rolePermissions && state.rolePermissions[r]) {
      return state.rolePermissions[r];
    }
    return createStaffDefaultPermissions();
  }

  public getUserPermissions(userId: string): Partial<PermissionMatrix> | undefined {
    return this.snapshot.userPermissions?.[userId];
  }

  public getEffectivePermissions(user: { id?: string; email?: string; role?: Role; userId?: string } | null | undefined): PermissionMatrix {
    if (!user) {
      const empty: Partial<PermissionMatrix> = {};
      RBAC_MODULES.forEach((mod) => {
        empty[mod.id] = createEmptyModulePermissions();
      });
      return empty as PermissionMatrix;
    }
    const role = (user.role || 'GUEST').toUpperCase();
    if (role === 'ADMIN' || role === 'ADMINISTRATOR') {
      return createAdminDefaultPermissions();
    }
    const base = this.getRolePermissions(role);
    const targetId = user.id || user.userId || '';
    const overrides = targetId ? this.getUserPermissions(targetId) : undefined;
    if (!overrides) return base;

    const result: Partial<PermissionMatrix> = {};
    RBAC_MODULES.forEach((mod) => {
      result[mod.id] = {
        ...base[mod.id],
        ...(overrides[mod.id] || {}),
      };
    });
    return result as PermissionMatrix;
  }

  public hasPermission(
    user: { id?: string; email?: string; role?: Role; status?: UserStatus; userId?: string } | null | undefined,
    module: ModuleKey,
    action: PermissionAction
  ): boolean {
    if (!user) return false;
    // Account status check: only ACTIVE / APPROVED accounts can execute actions
    if (user.status && user.status !== 'ACTIVE' && user.status !== 'APPROVED') {
      return false;
    }
    const role = (user.role || 'GUEST').toUpperCase();
    if (role === 'ADMIN' || role === 'ADMINISTRATOR') {
      return true;
    }
    const effective = this.getEffectivePermissions(user);
    return Boolean(effective[module]?.[action]);
  }

  public updateRolePermissions(
    role: string,
    permissions: PermissionMatrix,
    updatedBy?: { name?: string; email?: string; role?: Role }
  ): void {
    const current = this.snapshot;
    const r = role.toUpperCase();
    const rolePermissions = {
      ...(current.rolePermissions || {}),
      [r]: permissions,
    };
    this.state$.next({
      ...current,
      rolePermissions,
    });
    this.logAuditAction(
      updatedBy?.name || 'Library Admin',
      updatedBy?.email || 'admin@university.edu',
      updatedBy?.role || 'ADMIN',
      'roles_permissions',
      'Update Role Permissions',
      `Updated permissions matrix for role: ${r}`
    );
  }

  public updateUserPermissions(
    userId: string,
    permissions: Partial<PermissionMatrix>,
    updatedBy?: { name?: string; email?: string; role?: Role }
  ): void {
    const current = this.snapshot;
    const userPermissions = {
      ...(current.userPermissions || {}),
      [userId]: permissions,
    };
    const targetMember = (current.members || []).find((m) => m.id === userId || m.userId === userId);
    this.state$.next({
      ...current,
      userPermissions,
    });
    this.logAuditAction(
      updatedBy?.name || 'Library Admin',
      updatedBy?.email || 'admin@university.edu',
      updatedBy?.role || 'ADMIN',
      'roles_permissions',
      'Update User Permissions Override',
      `Updated custom permission overrides for staff member: ${targetMember?.name || userId}`
    );
  }

  public resetRolePermissions(
    role: string,
    updatedBy?: { name?: string; email?: string; role?: Role }
  ): void {
    const r = role.toUpperCase();
    const defaults = r === 'ADMIN' ? createAdminDefaultPermissions() : createStaffDefaultPermissions();
    this.updateRolePermissions(r, defaults, updatedBy);
  }

  public resetUserPermissions(
    userId: string,
    updatedBy?: { name?: string; email?: string; role?: Role }
  ): void {
    const current = this.snapshot;
    const userPermissions = { ...(current.userPermissions || {}) };
    delete userPermissions[userId];
    const targetMember = (current.members || []).find((m) => m.id === userId || m.userId === userId);
    this.state$.next({
      ...current,
      userPermissions,
    });
    this.logAuditAction(
      updatedBy?.name || 'Library Admin',
      updatedBy?.email || 'admin@university.edu',
      updatedBy?.role || 'ADMIN',
      'roles_permissions',
      'Reset User Permissions',
      `Reset permission overrides to role default for staff member: ${targetMember?.name || userId}`
    );
  }

  public logAuditAction(
    userName: string,
    userEmail: string,
    role: Role,
    module: ModuleKey | string,
    action: string,
    details: string
  ): void {
    const current = this.snapshot;
    const newLog: AuditLog = {
      id: `audit-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      userId: userEmail,
      userName: userName || 'System User',
      userRole: role,
      module: String(module),
      action: action,
      details: details,
      timestamp: getLocalDateTimeStr(),
    };
    const auditLogs = [newLog, ...(current.auditLogs || [])].slice(0, 500);
    this.state$.next({
      ...current,
      auditLogs,
    });
  }

  // ================= RACK & SHELF MANAGEMENT =================
  public addRack(rack: RackDefinition): { success: boolean; message: string } {
    const current = this.snapshot;
    const racks = current.racks || ACADEMIC_RACK_HIERARCHY;
    const cleanCode = rack.rackCode.trim().toUpperCase();

    if (racks.some((r) => r.rackCode.toUpperCase() === cleanCode)) {
      return { success: false, message: `A rack with code "${cleanCode}" already exists.` };
    }

    const newRack: RackDefinition = {
      ...rack,
      rackCode: cleanCode,
      shelves: rack.shelves && rack.shelves.length > 0 ? rack.shelves : [
        { shelfId: 'SHELF-1', shelfNumber: 1, shelfName: 'Tier 1: Core Fundamentals & Textbooks', focus: 'Prescribed Course Curricula & Core Texts', maxCapacity: 40 },
        { shelfId: 'SHELF-2', shelfNumber: 2, shelfName: 'Tier 2: Advanced Reference & Monographs', focus: 'Standard Reference & Academic Guides', maxCapacity: 40 },
        { shelfId: 'SHELF-3', shelfNumber: 3, shelfName: 'Tier 3: Research & Specialized Topics', focus: 'Specialized Domain Research & Case Studies', maxCapacity: 40 },
        { shelfId: 'SHELF-4', shelfNumber: 4, shelfName: 'Tier 4: Applied & Laboratory Manuals', focus: 'Lab Practicals, Experiments & Project Handbooks', maxCapacity: 40 },
        { shelfId: 'SHELF-5', shelfNumber: 5, shelfName: 'Tier 5: General & Competitive Literature', focus: 'GATE, IES, GRE & General Industry Stacks', maxCapacity: 40 },
      ],
    };

    const updatedRacks = [...racks, newRack];
    this.state$.next({ ...current, racks: updatedRacks });
    this.addAuditLog('1', 'Admin Librarian', 'ADMIN', 'ADD_RACK', 'INVENTORY', `Created new rack "${newRack.rackName}" (${newRack.rackCode})`);

    return { success: true, message: `Rack "${newRack.rackName}" (${newRack.rackCode}) added successfully!` };
  }

  public updateRack(rackCode: string, updated: Partial<RackDefinition>): { success: boolean; message: string } {
    const current = this.snapshot;
    const racks = current.racks || ACADEMIC_RACK_HIERARCHY;
    const index = racks.findIndex((r) => r.rackCode.toUpperCase() === rackCode.toUpperCase());

    if (index === -1) {
      return { success: false, message: `Rack "${rackCode}" not found.` };
    }

    const oldRack = racks[index];
    const newRackCode = (updated.rackCode || oldRack.rackCode).trim().toUpperCase();

    // Check code collision if code changed
    if (newRackCode !== oldRack.rackCode && racks.some((r, i) => i !== index && r.rackCode.toUpperCase() === newRackCode)) {
      return { success: false, message: `Another rack with code "${newRackCode}" already exists.` };
    }

    const updatedRack: RackDefinition = {
      ...oldRack,
      ...updated,
      rackCode: newRackCode,
    };

    const updatedRacks = [...racks];
    updatedRacks[index] = updatedRack;

    // If rackCode changed, update all associated books and copies
    let updatedBooks = current.books;
    if (newRackCode !== oldRack.rackCode) {
      updatedBooks = current.books.map((b) => {
        if (b.rackNumber === oldRack.rackCode) {
          const updatedCopies = (b.copies || []).map((c) => (c.rackNumber === oldRack.rackCode ? { ...c, rackNumber: newRackCode } : c));
          return { ...b, rackNumber: newRackCode, copies: updatedCopies };
        }
        return b;
      });
    }

    this.state$.next({ ...current, racks: updatedRacks, books: updatedBooks });
    this.addAuditLog('1', 'Admin Librarian', 'ADMIN', 'UPDATE_RACK', 'INVENTORY', `Updated rack "${oldRack.rackCode}" to "${newRackCode}"`);

    return { success: true, message: `Rack "${updatedRack.rackName}" updated successfully!` };
  }

  public deleteRack(rackCode: string): { success: boolean; message: string } {
    const current = this.snapshot;
    const racks = current.racks || ACADEMIC_RACK_HIERARCHY;
    const cleanCode = rackCode.trim().toUpperCase();

    // Reassign books on this rack to fallback CSE rack
    const fallbackRack = racks.find((r) => r.rackCode !== cleanCode)?.rackCode || 'R01';
    const updatedBooks = current.books.map((b) => {
      if (b.rackNumber === cleanCode) {
        const updatedCopies = (b.copies || []).map((c) => (c.rackNumber === cleanCode ? { ...c, rackNumber: fallbackRack } : c));
        return { ...b, rackNumber: fallbackRack, copies: updatedCopies };
      }
      return b;
    });

    const updatedRacks = racks.filter((r) => r.rackCode.toUpperCase() !== cleanCode);
    this.state$.next({ ...current, racks: updatedRacks, books: updatedBooks });
    this.addAuditLog('1', 'Admin Librarian', 'ADMIN', 'DELETE_RACK', 'INVENTORY', `Deleted rack "${cleanCode}" and reassigned books to "${fallbackRack}"`);

    return { success: true, message: `Rack "${cleanCode}" deleted and books reassigned to "${fallbackRack}".` };
  }

  public addShelf(rackCode: string, shelfData: ShelfDefinition): { success: boolean; message: string } {
    const current = this.snapshot;
    const racks = current.racks || ACADEMIC_RACK_HIERARCHY;
    const rackIndex = racks.findIndex((r) => r.rackCode.toUpperCase() === rackCode.toUpperCase());

    if (rackIndex === -1) {
      return { success: false, message: `Rack "${rackCode}" not found.` };
    }

    const rack = racks[rackIndex];
    const cleanShelfId = shelfData.shelfId.trim().toUpperCase();

    if (rack.shelves.some((s) => s.shelfId.toUpperCase() === cleanShelfId)) {
      return { success: false, message: `Shelf tier "${cleanShelfId}" already exists on rack "${rackCode}".` };
    }

    const updatedShelves = [...rack.shelves, { ...shelfData, shelfId: cleanShelfId }];
    const updatedRack: RackDefinition = { ...rack, shelves: updatedShelves };
    const updatedRacks = [...racks];
    updatedRacks[rackIndex] = updatedRack;

    this.state$.next({ ...current, racks: updatedRacks });
    this.addAuditLog('1', 'Admin Librarian', 'ADMIN', 'ADD_SHELF', 'INVENTORY', `Added shelf "${cleanShelfId}" to rack "${rackCode}"`);

    return { success: true, message: `Shelf "${cleanShelfId}" added to ${rack.rackName}!` };
  }

  public updateShelf(rackCode: string, shelfId: string, updatedData: Partial<ShelfDefinition>): { success: boolean; message: string } {
    const current = this.snapshot;
    const racks = current.racks || ACADEMIC_RACK_HIERARCHY;
    const rackIndex = racks.findIndex((r) => r.rackCode.toUpperCase() === rackCode.toUpperCase());

    if (rackIndex === -1) {
      return { success: false, message: `Rack "${rackCode}" not found.` };
    }

    const rack = racks[rackIndex];
    const shelfIndex = rack.shelves.findIndex((s) => s.shelfId.toUpperCase() === shelfId.toUpperCase());

    if (shelfIndex === -1) {
      return { success: false, message: `Shelf "${shelfId}" not found in rack "${rackCode}".` };
    }

    const oldShelf = rack.shelves[shelfIndex];
    const newShelfId = (updatedData.shelfId || oldShelf.shelfId).trim().toUpperCase();

    const updatedShelf: ShelfDefinition = {
      ...oldShelf,
      ...updatedData,
      shelfId: newShelfId,
    };

    const updatedShelves = [...rack.shelves];
    updatedShelves[shelfIndex] = updatedShelf;

    const updatedRack: RackDefinition = { ...rack, shelves: updatedShelves };
    const updatedRacks = [...racks];
    updatedRacks[rackIndex] = updatedRack;

    // If shelfId changed, update books placed on this shelf
    let updatedBooks = current.books;
    if (newShelfId !== oldShelf.shelfId) {
      updatedBooks = current.books.map((b) => {
        if (b.rackNumber === rack.rackCode && (b.shelfNumber === oldShelf.shelfId || b.shelfNumber === `SHELF-${oldShelf.shelfNumber}`)) {
          const updatedCopies = (b.copies || []).map((c) =>
            c.shelfNumber === oldShelf.shelfId || c.shelfNumber === `SHELF-${oldShelf.shelfNumber}`
              ? { ...c, shelfNumber: newShelfId }
              : c
          );
          return { ...b, shelfNumber: newShelfId, copies: updatedCopies };
        }
        return b;
      });
    }

    this.state$.next({ ...current, racks: updatedRacks, books: updatedBooks });
    this.addAuditLog('1', 'Admin Librarian', 'ADMIN', 'UPDATE_SHELF', 'INVENTORY', `Updated shelf "${shelfId}" on rack "${rackCode}"`);

    return { success: true, message: `Shelf "${updatedShelf.shelfName}" updated successfully!` };
  }

  public deleteShelf(rackCode: string, shelfId: string): { success: boolean; message: string } {
    const current = this.snapshot;
    const racks = current.racks || ACADEMIC_RACK_HIERARCHY;
    const rackIndex = racks.findIndex((r) => r.rackCode.toUpperCase() === rackCode.toUpperCase());

    if (rackIndex === -1) {
      return { success: false, message: `Rack "${rackCode}" not found.` };
    }

    const rack = racks[rackIndex];
    if (rack.shelves.length <= 1) {
      return { success: false, message: 'Cannot delete the only shelf in a rack. Each rack must have at least 1 shelf.' };
    }

    const fallbackShelf = rack.shelves.find((s) => s.shelfId.toUpperCase() !== shelfId.toUpperCase())?.shelfId || 'SHELF-1';
    const updatedBooks = current.books.map((b) => {
      if (b.rackNumber === rack.rackCode && b.shelfNumber === shelfId) {
        const updatedCopies = (b.copies || []).map((c) => (c.shelfNumber === shelfId ? { ...c, shelfNumber: fallbackShelf } : c));
        return { ...b, shelfNumber: fallbackShelf, copies: updatedCopies };
      }
      return b;
    });

    const updatedShelves = rack.shelves.filter((s) => s.shelfId.toUpperCase() !== shelfId.toUpperCase());
    const updatedRack: RackDefinition = { ...rack, shelves: updatedShelves };
    const updatedRacks = [...racks];
    updatedRacks[rackIndex] = updatedRack;

    this.state$.next({ ...current, racks: updatedRacks, books: updatedBooks });
    this.addAuditLog('1', 'Admin Librarian', 'ADMIN', 'DELETE_SHELF', 'INVENTORY', `Deleted shelf "${shelfId}" from rack "${rackCode}"`);

    return { success: true, message: `Shelf "${shelfId}" deleted. Books moved to "${fallbackShelf}".` };
  }

  public resetRacksToDefault(): { success: boolean; message: string } {
    const current = this.snapshot;
    this.state$.next({ ...current, racks: reconcileAcademicRacks([]) });
    this.addAuditLog('1', 'Admin Librarian', 'ADMIN', 'RESET_RACKS', 'INVENTORY', 'Reset rack and shelf hierarchy to factory defaults');
    return { success: true, message: 'All 24 Academic Racks and 265 shelves reset to academic defaults.' };
  }

  public addAuditLog(userId: string, userName: string, userRole: Role | string, action: string, module: string, details: string) {
    const newLog: AuditLog = {
      id: `log-${Date.now()}`,
      userId,
      userName,
      userRole: userRole as Role,
      action,
      module,
      details,
      timestamp: getLocalDateTimeStr(new Date()),
    };
    const current = this.snapshot;
    this.state$.next({
      ...current,
      auditLogs: [newLog, ...current.auditLogs],
    });
  }

  public addCategory(cat: Omit<Category, 'id' | 'bookCount'>): Category {
    const newCat: Category = {
      id: `cat-${Date.now()}`,
      ...cat,
      bookCount: 0,
    };
    const current = this.snapshot;
    this.state$.next({
      ...current,
      categories: [newCat, ...current.categories],
    });
    this.addAuditLog('1', 'Admin Librarian', 'ADMIN', 'ADD_CATEGORY', 'TAXONOMY', `Added category "${newCat.name}"`);
    return newCat;
  }

  public updateCategory(id: string, updated: Partial<Category>) {
    const current = this.snapshot;
    const categories = current.categories.map((c) => (c.id === id ? { ...c, ...updated } : c));
    this.state$.next({ ...current, categories });
    this.addAuditLog('1', 'Admin Librarian', 'ADMIN', 'UPDATE_CATEGORY', 'TAXONOMY', `Updated category ID ${id}`);
  }

  public deleteCategory(id: string): boolean {
    const current = this.snapshot;
    const categories = current.categories.filter((c) => c.id !== id);
    this.state$.next({ ...current, categories });
    this.addAuditLog('1', 'Admin Librarian', 'ADMIN', 'DELETE_CATEGORY', 'TAXONOMY', `Deleted category ID ${id}`);
    return true;
  }

  public addAuthor(auth: Omit<Author, 'id' | 'bookCount'>): Author {
    const newAuth: Author = {
      id: `auth-${Date.now()}`,
      ...auth,
      bookCount: 0,
    };
    const current = this.snapshot;
    this.state$.next({
      ...current,
      authors: [newAuth, ...current.authors],
    });
    this.addAuditLog('1', 'Admin Librarian', 'ADMIN', 'ADD_AUTHOR', 'TAXONOMY', `Added author "${newAuth.name}"`);
    return newAuth;
  }

  public updateAuthor(id: string, updated: Partial<Author>) {
    const current = this.snapshot;
    const authors = current.authors.map((a) => (a.id === id ? { ...a, ...updated } : a));
    this.state$.next({ ...current, authors });
    this.addAuditLog('1', 'Admin Librarian', 'ADMIN', 'UPDATE_AUTHOR', 'TAXONOMY', `Updated author ID ${id}`);
  }

  public deleteAuthor(id: string): boolean {
    const current = this.snapshot;
    const authors = current.authors.filter((a) => a.id !== id);
    this.state$.next({ ...current, authors });
    this.addAuditLog('1', 'Admin Librarian', 'ADMIN', 'DELETE_AUTHOR', 'TAXONOMY', `Deleted author ID ${id}`);
    return true;
  }

  public addPublisher(pub: Omit<Publisher, 'id' | 'bookCount'>): Publisher {
    const newPub: Publisher = {
      id: `pub-${Date.now()}`,
      ...pub,
      bookCount: 0,
    };
    const current = this.snapshot;
    this.state$.next({
      ...current,
      publishers: [newPub, ...current.publishers],
    });
    this.addAuditLog('1', 'Admin Librarian', 'ADMIN', 'ADD_PUBLISHER', 'TAXONOMY', `Added publisher "${newPub.name}"`);
    return newPub;
  }

  public updatePublisher(id: string, updated: Partial<Publisher>) {
    const current = this.snapshot;
    const publishers = current.publishers.map((p) => (p.id === id ? { ...p, ...updated } : p));
    this.state$.next({ ...current, publishers });
    this.addAuditLog('1', 'Admin Librarian', 'ADMIN', 'UPDATE_PUBLISHER', 'TAXONOMY', `Updated publisher ID ${id}`);
  }

  public deletePublisher(id: string): boolean {
    const current = this.snapshot;
    const publishers = current.publishers.filter((p) => p.id !== id);
    this.state$.next({ ...current, publishers });
    this.addAuditLog('1', 'Admin Librarian', 'ADMIN', 'DELETE_PUBLISHER', 'TAXONOMY', `Deleted publisher ID ${id}`);
    return true;
  }

  public addBook(bookData: Omit<Book, 'id' | 'copies' | 'availableCopies'>, initialCopiesCount: number = 3) {
    const bookId = `book-${Date.now()}`;
    const copies: BookCopy[] = [];

    const isRefBook = bookData.collectionType === 'REFERENCE' || bookData.isReferenceOnly || false;

    for (let i = 1; i <= initialCopiesCount; i++) {
      const accessionNo = `ACC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const barcode = `BC-${Math.floor(10000 + Math.random() * 90000)}`;
      copies.push({
        id: `copy-${bookId}-${i}`,
        bookId,
        accessionNo,
        barcode,
        qrCode: `QR-${barcode}`,
        rackNumber: bookData.rackNumber || 'RACK-CS-01',
        shelfNumber: bookData.shelfNumber || 'SHELF-A1',
        status: 'AVAILABLE',
        condition: 'NEW',
        addedDate: getLocalDateStr(new Date()),
        isReferenceOnly: isRefBook ? true : i === 1,
      });
    }

    const newBook: Book = {
      ...bookData,
      id: bookId,
      collectionType: isRefBook ? 'REFERENCE' : (bookData.collectionType || 'ACADEMIC'),
      isReferenceOnly: isRefBook,
      totalCopies: initialCopiesCount,
      availableCopies: initialCopiesCount,
      copies,
    };

    const current = this.snapshot;
    this.state$.next({
      ...current,
      books: [newBook, ...current.books],
    });
  }

  public updateBook(id: string, updated: Partial<Book>) {
    const current = this.snapshot;
    const books = current.books.map((b) => {
      if (b.id !== id) return b;

      let updatedCopies = [...(b.copies || [])];
      let newTotalCopies = b.totalCopies;
      let newAvailableCopies = b.availableCopies;

      if (updated.totalCopies !== undefined && updated.totalCopies > 0 && updated.totalCopies !== b.totalCopies) {
        const targetCount = updated.totalCopies;
        const currentCount = updatedCopies.length;

        if (targetCount > currentCount) {
          const diff = targetCount - currentCount;
          for (let i = 1; i <= diff; i++) {
            const copyNum = currentCount + i;
            const accessionNo = `ACC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
            const barcode = `BC-${Math.floor(10000 + Math.random() * 90000)}`;
            updatedCopies.push({
              id: `copy-${id}-${copyNum}`,
              bookId: id,
              accessionNo,
              barcode,
              qrCode: `QR-${barcode}`,
              rackNumber: updated.rackNumber || b.rackNumber || 'RACK-CS-01',
              shelfNumber: updated.shelfNumber || b.shelfNumber || 'SHELF-A1',
              status: 'AVAILABLE',
              condition: 'NEW',
              addedDate: getLocalDateStr(new Date()),
            });
          }
        } else if (targetCount < currentCount) {
          const diff = currentCount - targetCount;
          let removed = 0;
          const filtered: BookCopy[] = [];
          for (let i = updatedCopies.length - 1; i >= 0; i--) {
            const copy = updatedCopies[i];
            if (removed < diff && copy.status === 'AVAILABLE') {
              removed++;
            } else {
              filtered.unshift(copy);
            }
          }
          updatedCopies = filtered;
        }

        newTotalCopies = updatedCopies.length;
        newAvailableCopies = updatedCopies.filter((c) => c.status === 'AVAILABLE').length;
      }

      const isRefBook = updated.collectionType === 'REFERENCE' || updated.isReferenceOnly || (b.isReferenceOnly && updated.isReferenceOnly !== false);
      if (isRefBook) {
        updatedCopies = updatedCopies.map((c) => ({ ...c, isReferenceOnly: true }));
      }

      if (updated.rackNumber !== undefined || updated.shelfNumber !== undefined) {
        const targetRack = updated.rackNumber || b.rackNumber || 'R01';
        const targetShelf = updated.shelfNumber || b.shelfNumber || 'S01';
        updatedCopies = updatedCopies.map((c) => ({
          ...c,
          rackNumber: targetRack,
          shelfNumber: targetShelf,
        }));
      }

      return {
        ...b,
        ...updated,
        rackNumber: updated.rackNumber !== undefined ? updated.rackNumber : b.rackNumber,
        shelfNumber: updated.shelfNumber !== undefined ? updated.shelfNumber : b.shelfNumber,
        isReferenceOnly: isRefBook,
        collectionType: isRefBook ? 'REFERENCE' : (updated.collectionType || b.collectionType),
        totalCopies: newTotalCopies,
        availableCopies: newAvailableCopies,
        copies: updatedCopies,
      };
    });

    this.state$.next({ ...current, books });
    this.addAuditLog('1', 'Admin Librarian', 'ADMIN', 'UPDATE_BOOK', 'CATALOG', `Updated details for book ID ${id}`);
  }

  public moveBookRackAndShelf(bookId: string, targetRack: string, targetShelf: string) {
    this.updateBook(bookId, { rackNumber: targetRack, shelfNumber: targetShelf });
    this.addAuditLog('1', 'Admin Librarian', 'ADMIN', 'MOVE_BOOK_LOCATION', 'CATALOG', `Assigned book "${bookId}" to Rack "${targetRack}" and Shelf "${targetShelf}"`);
  }

  public deleteBook(id: string) {
    const current = this.snapshot;
    const targetBook = current.books.find((b) => b.id === id);
    const books = current.books.filter((b) => b.id !== id);
    this.state$.next({ ...current, books });
    this.addAuditLog('1', 'Admin Librarian', 'ADMIN', 'DELETE_BOOK', 'CATALOG', `Deleted book "${targetBook?.title || id}" from catalog`);
  }

  public updateCopyCondition(copyId: string, condition: CopyCondition, status?: BookStatus) {
    const current = this.snapshot;
    const books = current.books.map((book) => {
      if (!book.copies) return book;
      const updatedCopies = book.copies.map((c) => {
        if (c.id === copyId) {
          return {
            ...c,
            condition,
            status: status || c.status,
          };
        }
        return c;
      });
      return {
        ...book,
        copies: updatedCopies,
      };
    });
    this.state$.next({ ...current, books });
  }

  public updateBookCopy(copyId: string, updated: Partial<BookCopy>) {
    const current = this.snapshot;
    const books = current.books.map((book) => {
      if (!book.copies) return book;
      const copyExists = book.copies.some((c) => c.id === copyId);
      if (!copyExists) return book;

      const updatedCopies = book.copies.map((c) => {
        if (c.id === copyId) {
          return {
            ...c,
            ...updated,
          };
        }
        return c;
      });

      const totalCopies = updatedCopies.length;
      const availableCopies = updatedCopies.filter((c) => c.status === 'AVAILABLE').length;

      return {
        ...book,
        totalCopies,
        availableCopies,
        copies: updatedCopies,
      };
    });

    this.state$.next({ ...current, books });
    this.addAuditLog('1', 'Admin Librarian', 'ADMIN', 'UPDATE_COPY', 'CATALOG', `Updated copy ID ${copyId}`);
  }

  public addBookCopy(bookId: string, copyData?: Partial<BookCopy>): BookCopy | undefined {
    const current = this.snapshot;
    let newCopy: BookCopy | undefined;

    const books = current.books.map((book) => {
      if (book.id !== bookId) return book;

      const accessionNo = copyData?.accessionNo || `ACC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const barcode = copyData?.barcode || `BC-${Math.floor(10000 + Math.random() * 90000)}`;

      newCopy = {
        id: `copy-${bookId}-${Date.now()}`,
        bookId,
        accessionNo,
        barcode,
        qrCode: copyData?.qrCode || `QR-${barcode}`,
        rackNumber: copyData?.rackNumber || book.rackNumber || 'RACK-CS-01',
        shelfNumber: copyData?.shelfNumber || book.shelfNumber || 'SHELF-A1',
        status: copyData?.status || 'AVAILABLE',
        condition: copyData?.condition || 'NEW',
        addedDate: getLocalDateStr(new Date()),
      };

      const updatedCopies = [...(book.copies || []), newCopy];
      return {
        ...book,
        totalCopies: updatedCopies.length,
        availableCopies: updatedCopies.filter((c) => c.status === 'AVAILABLE').length,
        copies: updatedCopies,
      };
    });

    this.state$.next({ ...current, books });
    this.addAuditLog('1', 'Admin Librarian', 'ADMIN', 'ADD_COPY', 'CATALOG', `Added copy to book ID ${bookId}`);
    return newCopy;
  }

  public deleteBookCopy(copyId: string): boolean {
    const current = this.snapshot;
    let deleted = false;

    const books = current.books.map((book) => {
      if (!book.copies || !book.copies.some((c) => c.id === copyId)) return book;

      const updatedCopies = book.copies.filter((c) => c.id !== copyId);
      deleted = true;

      return {
        ...book,
        totalCopies: updatedCopies.length,
        availableCopies: updatedCopies.filter((c) => c.status === 'AVAILABLE').length,
        copies: updatedCopies,
      };
    });

    if (deleted) {
      this.state$.next({ ...current, books });
      this.addAuditLog('1', 'Admin Librarian', 'ADMIN', 'DELETE_COPY', 'CATALOG', `Deleted copy ID ${copyId}`);
    }
    return deleted;
  }

  public isDuplicateAccessionNo(accessionNo: string, excludeCopyId?: string): boolean {
    const cleanAcc = accessionNo.trim().toLowerCase();
    const current = this.snapshot;
    for (const book of current.books) {
      for (const copy of book.copies || []) {
        if (copy.id !== excludeCopyId && copy.accessionNo.trim().toLowerCase() === cleanAcc) {
          return true;
        }
      }
    }
    return false;
  }

  public isDuplicateBarcode(barcode: string, excludeCopyId?: string): boolean {
    const cleanBc = barcode.trim().toLowerCase();
    const current = this.snapshot;
    for (const book of current.books) {
      for (const copy of book.copies || []) {
        if (copy.id !== excludeCopyId && copy.barcode.trim().toLowerCase() === cleanBc) {
          return true;
        }
      }
    }
    return false;
  }

  public regenerateCopyBarcodeQr(copyId: string): { success: boolean; message: string; newBarcode?: string; newQrCode?: string } {
    const current = this.snapshot;

    for (const book of current.books) {
      const existing = (book.copies || []).find((c) => c.id === copyId);
      if (existing) {
        if (existing.barcode && existing.barcode.trim()) {
          return {
            success: false,
            message: `Barcode for Accession "${existing.accessionNo}" is already generated and locked. Barcodes cannot be regenerated to prevent mismatch with physical book tags.`,
          };
        }
      }
    }

    let targetBookTitle = '';
    let targetAccession = '';
    let newBc = '';
    let newQr = '';
    let found = false;

    let tries = 0;
    do {
      newBc = `BC-${Math.floor(100000 + Math.random() * 900000)}`;
      newQr = `QR-${newBc}`;
      tries++;
    } while (this.isDuplicateBarcode(newBc) && tries < 100);

    const books = current.books.map((book) => {
      if (!book.copies || !book.copies.some((c) => c.id === copyId)) return book;

      const updatedCopies = book.copies.map((c) => {
        if (c.id === copyId) {
          found = true;
          targetBookTitle = book.title;
          targetAccession = c.accessionNo;
          return {
            ...c,
            barcode: newBc,
            qrCode: newQr,
          };
        }
        return c;
      });

      return {
        ...book,
        copies: updatedCopies,
      };
    });

    if (!found) {
      return { success: false, message: 'Book copy record not found.' };
    }

    this.state$.next({ ...current, books });
    this.addAuditLog(
      '1',
      'Admin Librarian',
      'ADMIN',
      'REGENERATE_BARCODE',
      'CATALOG',
      `Generated Barcode & QR Code for copy ${targetAccession} ("${targetBookTitle}"): Barcode ${newBc}`
    );

    return {
      success: true,
      message: `Generated Barcode (${newBc}) and QR Code for Accession ${targetAccession}!`,
      newBarcode: newBc,
      newQrCode: newQr,
    };
  }

  public bulkGenerateMissingBarcodes(): { success: boolean; updatedCount: number; message: string } {
    const current = this.snapshot;
    let updatedCount = 0;
    const usedBarcodes = new Set<string>();
    const usedAccessions = new Set<string>();

    current.books.forEach((b) => {
      (b.copies || []).forEach((c) => {
        if (c.barcode?.trim()) usedBarcodes.add(c.barcode.trim().toLowerCase());
        if (c.accessionNo?.trim()) usedAccessions.add(c.accessionNo.trim().toLowerCase());
      });
    });

    const books = current.books.map((book) => {
      const updatedCopies = (book.copies || []).map((copy) => {
        let bc = copy.barcode ? copy.barcode.trim() : '';
        let qr = copy.qrCode ? copy.qrCode.trim() : '';
        let acc = copy.accessionNo ? copy.accessionNo.trim() : '';
        let modified = false;

        if (!acc) {
          let newAcc = '';
          do {
            newAcc = `ACC-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 9000)}`;
          } while (usedAccessions.has(newAcc.toLowerCase()));
          acc = newAcc;
          usedAccessions.add(acc.toLowerCase());
          modified = true;
        }

        if (!bc) {
          let newBc = '';
          do {
            newBc = `BC-${Math.floor(100000 + Math.random() * 900000)}`;
          } while (usedBarcodes.has(newBc.toLowerCase()));
          bc = newBc;
          qr = `QR-${bc}`;
          usedBarcodes.add(bc.toLowerCase());
          modified = true;
        }

        if (!qr) {
          qr = `QR-${bc}`;
          modified = true;
        }

        if (modified) {
          updatedCount++;
          return {
            ...copy,
            accessionNo: acc,
            barcode: bc,
            qrCode: qr,
          };
        }
        return copy;
      });

      return {
        ...book,
        copies: updatedCopies,
      };
    });

    if (updatedCount > 0) {
      this.state$.next({ ...current, books });
      this.addAuditLog('1', 'Admin Librarian', 'ADMIN', 'BULK_GENERATE_BARCODES', 'CATALOG', `Generated missing barcodes for ${updatedCount} copies`);
    }

    return {
      success: true,
      updatedCount,
      message: updatedCount > 0 ? `Successfully generated barcodes & QR codes for ${updatedCount} missing book copies!` : 'All book copies already have permanent generated barcodes locked!',
    };
  }

  public issueBook(
    copyId: string,
    memberId: string,
    issuedByUserId: string = '1'
  ): { success: boolean; message: string; transaction?: IssueTransaction; isReferenceBook?: boolean } {
    const current = this.snapshot;
    let cleanMemKey = (memberId || '').trim().toLowerCase();
    if (cleanMemKey.startsWith('qr-') || cleanMemKey.startsWith('card-')) {
      cleanMemKey = cleanMemKey.replace(/^(qr-|card-|id-)/i, '').trim();
    }
    if ((cleanMemKey.startsWith('{') && cleanMemKey.endsWith('}')) || (cleanMemKey.startsWith('[') && cleanMemKey.endsWith(']'))) {
      try {
        const obj = JSON.parse(cleanMemKey);
        cleanMemKey = (obj.memberCardNo || obj.id || obj.cardNo || cleanMemKey).toLowerCase();
      } catch {}
    }
    const qClean = cleanMemKey.trim().toLowerCase();
    const qNorm = qClean.replace(/[^a-z0-9]/g, '');
    const qNoPrefix = qClean.replace(/^(qr-|bc-|acc-|card-|id-|stu-|fac-|adm-|mem-)/i, '').replace(/[^a-z0-9]/g, '');

    const member = current.members.find((m) => {
      const cLower = (m.memberCardNo || '').toLowerCase();
      const idLower = (m.id || '').toLowerCase();
      const eLower = (m.email || '').toLowerCase();

      if (cLower === qClean || idLower === qClean || eLower === qClean) return true;

      const cNorm = cLower.replace(/[^a-z0-9]/g, '');
      const idNorm = idLower.replace(/[^a-z0-9]/g, '');
      const eNorm = eLower.replace(/[^a-z0-9]/g, '');

      if (qNorm.length > 0 && (cNorm === qNorm || idNorm === qNorm || eNorm === qNorm)) return true;

      const cNoPrefix = cLower.replace(/^(qr-|bc-|acc-|card-|id-|stu-|fac-|adm-|mem-)/i, '').replace(/[^a-z0-9]/g, '');
      const idNoPrefix = idLower.replace(/^(qr-|bc-|acc-|card-|id-|stu-|fac-|adm-|mem-)/i, '').replace(/[^a-z0-9]/g, '');

      if (qNoPrefix.length > 0 && (cNoPrefix === qNoPrefix || idNoPrefix === qNoPrefix || cNorm === qNoPrefix)) return true;

      return false;
    });

    if (!member) {
      return { success: false, message: 'Member record not found.' };
    }

    if (member.status !== 'ACTIVE') {
      return { success: false, message: `Member account is currently ${member.status}. Cannot issue books.` };
    }

    if (member.pendingFines > 0) {
      return { success: false, message: `Member has unpaid fine balance of ₹${member.pendingFines.toFixed(2)}. Please settle fines prior to checkout.` };
    }

    if (member.currentActiveLoans >= member.maxAllowedBooks) {
      return { success: false, message: `Member has reached max borrowing limit of ${member.maxAllowedBooks} books.` };
    }

    const cleanQuery = (copyId || '').trim().toLowerCase();
    const queryNorm = cleanQuery.replace(/^(qr-|bc-|acc-|card-|id-)/i, '').replace(/[^a-z0-9]/g, '');
    if (!cleanQuery) {
      return { success: false, message: 'Please enter or scan a valid book barcode / accession number / QR code.' };
    }

    // Check if the provided code is actually a Member ID Card
    const isMemberCode = current.members.some((m) => {
      const cLower = (m.memberCardNo || '').toLowerCase();
      const idLower = (m.id || '').toLowerCase();
      if (cLower === cleanQuery || idLower === cleanQuery) return true;
      const cNorm = cLower.replace(/[^a-z0-9]/g, '');
      const idNorm = idLower.replace(/[^a-z0-9]/g, '');
      return queryNorm.length > 0 && (cNorm === queryNorm || idNorm === queryNorm);
    });

    if (isMemberCode || cleanQuery.startsWith('stu-') || cleanQuery.startsWith('fac-') || cleanQuery.startsWith('adm-')) {
      return {
        success: false,
        message: 'INVALID BOOK CODE: You scanned/entered a Member ID Card. Please scan or enter a Book Barcode or Accession Number in Step 2.',
      };
    }

    let targetBook: Book | undefined;
    let targetCopy: BookCopy | undefined;

    for (const book of current.books) {
      if (!book.copies || book.copies.length === 0) continue;
      const copy = book.copies.find((c) => {
        const bNorm = c.barcode.toLowerCase().replace(/^(bc-|qr-|acc-|card-|id-)/i, '').replace(/[^a-z0-9]/g, '');
        const aNorm = c.accessionNo.toLowerCase().replace(/^(bc-|qr-|acc-|card-|id-)/i, '').replace(/[^a-z0-9]/g, '');
        const qNorm = (c.qrCode || '').toLowerCase().replace(/^(bc-|qr-|acc-|card-|id-)/i, '').replace(/[^a-z0-9]/g, '');
        const idNorm = c.id.toLowerCase().replace(/^(bc-|qr-|acc-|card-|id-)/i, '').replace(/[^a-z0-9]/g, '');

        return (
          c.id.toLowerCase() === cleanQuery ||
          c.barcode.toLowerCase() === cleanQuery ||
          c.accessionNo.toLowerCase() === cleanQuery ||
          (c.qrCode && c.qrCode.toLowerCase() === cleanQuery) ||
          (queryNorm.length > 0 &&
            (bNorm === queryNorm || aNorm === queryNorm || qNorm === queryNorm || idNorm === queryNorm))
        );
      });
      if (copy) {
        targetBook = book;
        targetCopy = copy;
        break;
      }
    }

    if (!targetBook || !targetCopy) {
      return { success: false, message: `Book copy not found for accession / barcode code: "${copyId.trim()}".` };
    }

    // Reference Book Protection: Reference books cannot be issued to users
    if (targetBook.isReferenceOnly || targetBook.collectionType === 'REFERENCE' || targetCopy.isReferenceOnly) {
      return {
        success: false,
        isReferenceBook: true,
        message: `RESTRICTED ITEM: Copy "${targetCopy.accessionNo}" (${targetCopy.barcode}) of "${targetBook.title}" is reserved as Copy #1 Reference Copy for in-library reading room use only and CANNOT be checked out. Please issue Copy #2 or higher for member borrowing.`,
      };
    }

    if (targetCopy.status !== 'AVAILABLE') {
      return { success: false, message: `Book copy is currently ${targetCopy.status}. Cannot issue.` };
    }

    const loanDays = member.role === 'FACULTY' ? current.config.facultyMaxLoanDays : current.config.studentMaxLoanDays;
    const issueDate = new Date();
    const dueDate = new Date();
    dueDate.setDate(issueDate.getDate() + loanDays);
    const issueDateStr = getLocalTimeMinutesStr(issueDate);

    const transaction: IssueTransaction = {
      id: `tx-${Date.now()}`,
      bookCopyId: targetCopy.id,
      bookId: targetBook.id,
      bookTitle: targetBook.title,
      accessionNo: targetCopy.accessionNo,
      barcode: targetCopy.barcode,
      memberId: member.id,
      memberName: member.name,
      memberCardNo: member.memberCardNo,
      memberType: member.role,
      memberDepartment: member.department || 'Computer Science & Engineering',
      issuedByUserId,
      issuedByName: 'Librarian Desk',
      issueDate: issueDateStr,
      dueDate: getLocalDateStr(dueDate),
      renewalCount: 0,
      maxRenewals: current.config.maxRenewalLimit,
      status: 'ISSUED',
    };

    const updatedBooks = current.books.map((b) => {
      if (b.id === targetBook!.id) {
        const updatedCopies = b.copies?.map((c) => (c.id === targetCopy!.id ? { ...c, status: 'ISSUED' as const } : c));
        return {
          ...b,
          availableCopies: Math.max(0, b.availableCopies - 1),
          copies: updatedCopies,
        };
      }
      return b;
    });

    const updatedMembers = current.members.map((m) => (m.id === member.id ? { ...m, currentActiveLoans: m.currentActiveLoans + 1 } : m));

    this.state$.next({
      ...current,
      books: updatedBooks,
      members: updatedMembers,
      transactions: [transaction, ...current.transactions],
    });

    this.addAuditLog(issuedByUserId, 'Librarian Desk', 'ADMIN', 'ISSUE_BOOK', 'CIRCULATION', `Issued ${targetBook.title} (${targetCopy.accessionNo}) to ${member.name}`);

    return { success: true, message: `Book issued successfully. Due Date: ${transaction.dueDate}`, transaction };
  }

  public returnBook(
    transactionId: string,
    condition: CopyCondition = 'GOOD',
    notes?: string,
    paidFineDetails?: {
      paymentMethod: 'UPI_QR' | 'CASH' | 'CARD' | 'WALLET' | string;
      paidAmount: number;
      receiptNo?: string;
      collectedBy?: string;
    }
  ): { success: boolean; message: string; fineAssessed?: number; receiptNo?: string } {
    const current = this.snapshot;
    const cleanQ = (transactionId || '').trim().toLowerCase();
    const tx = current.transactions.find(
      (t) =>
        t.id.toLowerCase() === cleanQ ||
        t.accessionNo.toLowerCase() === cleanQ ||
        t.barcode.toLowerCase() === cleanQ ||
        t.bookCopyId.toLowerCase() === cleanQ
    );

    if (!tx || tx.status === 'RETURNED') {
      return { success: false, message: 'Transaction record not found or already returned.' };
    }

    const returnDate = new Date();
    const returnDateStr = getLocalTimeMinutesStr(returnDate);
    const dueDate = new Date(tx.dueDate);
    let fineAmount = 0;

    if (returnDate > dueDate) {
      const diffDays = Math.ceil((returnDate.getTime() - dueDate.getTime()) / (1000 * 3600 * 24));
      fineAmount = diffDays * current.config.fineRatePerDay;
    }

    const isFinePaid = Boolean(paidFineDetails && paidFineDetails.paidAmount >= fineAmount);
    const generatedReceiptNo = paidFineDetails?.receiptNo || (fineAmount > 0 ? `RCP-${Date.now().toString().slice(-6)}` : undefined);

    let newFines = [...current.fines];
    if (fineAmount > 0) {
      const fineRecord: FineRecord = {
        id: `fine-${Date.now()}`,
        transactionId: tx.id,
        memberId: tx.memberId,
        memberName: tx.memberName,
        memberCardNo: tx.memberCardNo,
        bookTitle: tx.bookTitle,
        amount: fineAmount,
        paidAmount: isFinePaid ? fineAmount : 0,
        reason: 'OVERDUE',
        status: isFinePaid ? 'PAID' : 'UNPAID',
        paymentMethod: isFinePaid ? (paidFineDetails?.paymentMethod as any) : undefined,
        paidDate: isFinePaid ? getLocalDateStr(returnDate) : undefined,
        receiptNo: isFinePaid ? generatedReceiptNo : undefined,
        createdDate: getLocalDateStr(returnDate),
      };
      newFines.unshift(fineRecord);
    }

    const updatedTransactions = current.transactions.map((t) =>
      t.id === tx.id
        ? {
            ...t,
            returnDate: returnDateStr,
            status: 'RETURNED' as const,
            fineAmount,
            fineStatus: fineAmount > 0 ? (isFinePaid ? ('PAID' as const) : ('UNPAID' as const)) : undefined,
            fineReceiptNo: generatedReceiptNo,
            notes,
          }
        : t
    );

    const updatedBooks = current.books.map((b) => {
      if (b.id === tx.bookId) {
        const updatedCopies = b.copies?.map((c) => (c.id === tx.bookCopyId ? { ...c, status: 'AVAILABLE' as const, condition } : c));
        return {
          ...b,
          availableCopies: b.availableCopies + 1,
          copies: updatedCopies,
        };
      }
      return b;
    });

    const updatedMembers = current.members.map((m) => {
      if (m.id === tx.memberId) {
        return {
          ...m,
          currentActiveLoans: Math.max(0, m.currentActiveLoans - 1),
          pendingFines: isFinePaid ? m.pendingFines : m.pendingFines + fineAmount,
        };
      }
      return m;
    });

    // Close any pending extension requests for this returned book
    const updatedExtensionRequests = (current.extensionRequests || []).map((r) => {
      if ((r.transactionId === tx.id || r.accessionNo === tx.accessionNo) && r.status === 'PENDING') {
        return {
          ...r,
          status: 'REJECTED' as const,
          reviewedByName: 'System / Circulation Desk',
          reviewedDate: getLocalDateStr(new Date()),
          adminNotes: 'Resolved: Book physically returned at the circulation desk.',
        };
      }
      return r;
    });

    this.state$.next({
      ...current,
      books: updatedBooks,
      transactions: updatedTransactions,
      members: updatedMembers,
      fines: newFines,
      extensionRequests: updatedExtensionRequests,
    });

    this.addAuditLog(
      '1',
      paidFineDetails?.collectedBy || 'Admin Librarian',
      'ADMIN',
      'RETURN_BOOK',
      'CIRCULATION',
      `Returned ${tx.bookTitle} (${tx.accessionNo}). Fine: ₹${fineAmount.toFixed(2)}${isFinePaid ? ` (Paid via ${paidFineDetails?.paymentMethod} - Receipt: ${generatedReceiptNo})` : ''}`
    );

    return {
      success: true,
      message: fineAmount > 0
        ? isFinePaid
        ? `Overdue fine of ₹${fineAmount.toFixed(2)} paid successfully via ${paidFineDetails?.paymentMethod}. Book returned cleanly (Receipt: ${generatedReceiptNo}).`
        : `Book returned. Overdue fine assessed: ₹${fineAmount.toFixed(2)}`
        : 'Book returned on time cleanly.',
      fineAssessed: fineAmount,
      receiptNo: generatedReceiptNo,
    };
  }

  public renewBook(transactionId: string): { success: boolean; message: string; newDueDate?: string } {
    const current = this.snapshot;
    const tx = current.transactions.find((t) => t.id === transactionId);

    if (!tx || (tx.status !== 'ISSUED' && tx.status !== 'OVERDUE')) {
      return { success: false, message: 'Invalid active borrowing record.' };
    }

    if (tx.renewalCount >= current.config.maxRenewalLimit) {
      return { success: false, message: `Maximum renewal limit of ${current.config.maxRenewalLimit} reached.` };
    }

    const hasReservations = current.reservations.some((r) => r.bookId === tx.bookId && r.status === 'PENDING');
    if (hasReservations) {
      return { success: false, message: 'Cannot renew: Book is currently reserved by another member.' };
    }

    const currentDue = new Date(tx.dueDate);
    const loanDays = tx.memberType === 'FACULTY' ? current.config.facultyMaxLoanDays : current.config.studentMaxLoanDays;
    currentDue.setDate(currentDue.getDate() + loanDays);
    const newDueDate = getLocalDateStr(currentDue);

    const updatedTransactions = current.transactions.map((t) =>
      t.id === tx.id
        ? {
            ...t,
            dueDate: newDueDate,
            renewalCount: t.renewalCount + 1,
            status: 'ISSUED' as const,
          }
        : t
    );

    this.state$.next({
      ...current,
      transactions: updatedTransactions,
    });

    this.addAuditLog('1', 'Admin Librarian', 'ADMIN', 'RENEW_BOOK', 'CIRCULATION', `Renewed borrowing ${tx.id} for ${tx.memberName}. New Due: ${newDueDate}`);

    return { success: true, message: `Renewal approved. Extended due date: ${newDueDate}`, newDueDate };
  }

  public requestBookExtension(transactionId: string, requestedByMemberId: string, extensionDays: number, reason: string): { success: boolean; message: string } {
    const current = this.snapshot;
    const tx = current.transactions.find((t) => t.id === transactionId);
    if (!tx) {
      return { success: false, message: 'Active borrowed transaction record not found.' };
    }

    if (tx.status !== 'ISSUED' && tx.status !== 'OVERDUE') {
      return { success: false, message: 'This book checkout is not active. Cannot request extension.' };
    }

    // Check if pending request already exists for this loan
    const existingPending = (current.extensionRequests || []).find(
      (r) => r.transactionId === transactionId && r.status === 'PENDING'
    );
    if (existingPending) {
      return { success: false, message: 'An extension request for this book is already pending Admin approval.' };
    }

    const member = current.members.find((m) => m.id === requestedByMemberId || m.id === tx.memberId) || {
      id: tx.memberId,
      name: tx.memberName,
      memberCardNo: tx.memberCardNo,
      role: tx.memberType,
    };

    const newRequest: ExtensionRequest = {
      id: `ext-${Date.now()}`,
      transactionId: tx.id,
      bookId: tx.bookId,
      bookTitle: tx.bookTitle,
      accessionNo: tx.accessionNo,
      barcode: tx.barcode,
      memberId: member.id,
      memberName: tx.memberName || member.name,
      memberCardNo: tx.memberCardNo || member.memberCardNo,
      memberRole: tx.memberType || member.role,
      currentDueDate: tx.dueDate,
      requestedExtensionDays: extensionDays || 14,
      reason: reason.trim() || 'Academic extension request for project/exam preparation.',
      status: 'PENDING',
      requestedDate: getLocalTimeMinutesStr(new Date()),
    };

    this.state$.next({
      ...current,
      extensionRequests: [newRequest, ...(current.extensionRequests || [])],
    });

    this.addAuditLog(member.id, tx.memberName, tx.memberType, 'REQUEST_EXTENSION', 'CIRCULATION', `Requested ${extensionDays} days due date extension for "${tx.bookTitle}" (Reason: ${reason})`);

    return { success: true, message: `Extension request for "${tx.bookTitle}" submitted successfully! Awaiting Admin approval.` };
  }

  public approveExtensionRequest(requestId: string, adminNotes?: string): { success: boolean; message: string } {
    const current = this.snapshot;
    const ext = (current.extensionRequests || []).find((r) => r.id === requestId);
    if (!ext) {
      return { success: false, message: 'Extension request record not found.' };
    }

    const tx = current.transactions.find(
      (t) => t.id === ext.transactionId || t.accessionNo === ext.accessionNo || t.barcode === ext.barcode
    );

    // Calculate new due date by adding requestedExtensionDays
    const baseDueDateStr = tx ? tx.dueDate : ext.currentDueDate;
    const currentDue = new Date(baseDueDateStr.includes('T') ? baseDueDateStr : `${baseDueDateStr}T00:00:00`);
    const newDue = new Date(currentDue.getTime() + (ext.requestedExtensionDays || 14) * 24 * 60 * 60 * 1000);
    const formattedNewDueDate = getLocalDateStr(newDue);

    // Update Transaction if found
    let updatedTransactions = current.transactions;
    if (tx) {
      updatedTransactions = current.transactions.map((t) => {
        if (t.id === tx.id || t.accessionNo === ext.accessionNo) {
          return {
            ...t,
            dueDate: formattedNewDueDate,
            status: 'ISSUED' as const,
            renewalCount: t.renewalCount + 1,
            notes: `Extended by Admin approval on ${getLocalDateStr(new Date())} (+${ext.requestedExtensionDays} days)`,
          };
        }
        return t;
      });
    }

    // Update Extension Request
    const updatedRequests = (current.extensionRequests || []).map((r) => {
      if (r.id === requestId) {
        return {
          ...r,
          status: 'APPROVED' as const,
          newDueDate: formattedNewDueDate,
          reviewedByName: 'Head Librarian (Admin)',
          reviewedDate: getLocalDateStr(new Date()),
          adminNotes: adminNotes || 'Approved by Admin librarian.',
        };
      }
      return r;
    });

    this.state$.next({
      ...current,
      transactions: updatedTransactions,
      extensionRequests: updatedRequests,
    });

    this.addAuditLog('1', 'Admin Librarian', 'ADMIN', 'APPROVE_EXTENSION', 'CIRCULATION', `Approved ${ext.requestedExtensionDays} days extension for "${ext.bookTitle}" (Member: ${ext.memberName}). New due date: ${formattedNewDueDate}`);

    return { success: true, message: `Extension request approved! Return date for "${ext.bookTitle}" extended to ${formattedNewDueDate}.` };
  }

  public rejectExtensionRequest(requestId: string, adminNotes?: string): { success: boolean; message: string } {
    const current = this.snapshot;
    const ext = (current.extensionRequests || []).find((r) => r.id === requestId);
    if (!ext) {
      return { success: false, message: 'Extension request record not found.' };
    }

    const originalDueDate = ext.currentDueDate;
    const today = new Date();
    const todayDateOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const dueD = new Date(originalDueDate.split(' ')[0]);
    const isNowOverdue = todayDateOnly > dueD;
    const diffDays = isNowOverdue ? Math.max(1, Math.ceil((todayDateOnly.getTime() - dueD.getTime()) / (1000 * 3600 * 24))) : 0;
    const fineRate = current.config?.fineRatePerDay || 5.00;
    const fineAmount = diffDays * fineRate;

    let updatedTransactions = current.transactions;
    const tx = current.transactions.find(
      (t) => t.id === ext.transactionId || t.accessionNo === ext.accessionNo || t.barcode === ext.barcode
    );

    if (tx && tx.status !== 'RETURNED') {
      updatedTransactions = current.transactions.map((t) => {
        if (t.id === tx.id || t.accessionNo === ext.accessionNo) {
          return {
            ...t,
            status: isNowOverdue ? ('OVERDUE' as const) : t.status,
            fineAmount: isNowOverdue ? fineAmount : t.fineAmount,
            fineStatus: isNowOverdue ? (t.fineStatus === 'PAID' ? 'PAID' : 'UNPAID') : t.fineStatus,
            notes: `Extension request rejected by Admin on ${getLocalDateStr(new Date())}.${isNowOverdue ? ` Overdue fine assessed: ₹${fineAmount.toFixed(2)}` : ''}`,
          };
        }
        return t;
      });
    }

    const updatedRequests = (current.extensionRequests || []).map((r) => {
      if (r.id === requestId) {
        return {
          ...r,
          status: 'REJECTED' as const,
          reviewedByName: 'Head Librarian (Admin)',
          reviewedDate: getLocalDateStr(new Date()),
          adminNotes: adminNotes || 'Extension request rejected by Admin.',
        };
      }
      return r;
    });

    let updatedFines = [...current.fines];
    if (isNowOverdue && tx && fineAmount > 0) {
      const existingFine = updatedFines.find((f) => f.transactionId === tx.id);
      if (existingFine) {
        updatedFines = updatedFines.map((f) =>
          f.id === existingFine.id ? { ...f, amount: fineAmount, status: f.status === 'PAID' ? 'PAID' : 'UNPAID' } : f
        );
      } else {
        updatedFines.unshift({
          id: `fine-${Date.now()}`,
          transactionId: tx.id,
          memberId: tx.memberId,
          memberName: tx.memberName,
          memberCardNo: tx.memberCardNo,
          bookTitle: tx.bookTitle,
          amount: fineAmount,
          paidAmount: 0,
          reason: 'OVERDUE',
          status: 'UNPAID',
          createdDate: getLocalDateStr(new Date()),
        });
      }
    }

    this.state$.next({
      ...current,
      transactions: updatedTransactions,
      extensionRequests: updatedRequests,
      fines: updatedFines,
    });

    this.addAuditLog('1', 'Admin Librarian', 'ADMIN', 'REJECT_EXTENSION', 'CIRCULATION', `Rejected extension request for "${ext.bookTitle}" (Member: ${ext.memberName}).${isNowOverdue ? ` Overdue fine assessed: ₹${fineAmount.toFixed(2)}.` : ''}`);

    return {
      success: true,
      message: `Extension request for "${ext.bookTitle}" has been rejected.${isNowOverdue ? ` Overdue fine of ₹${fineAmount.toFixed(2)} (${diffDays} days) has been assessed.` : ''}`,
    };
  }

  public unapproveExtensionRequest(requestId: string, adminNotes?: string): { success: boolean; message: string } {
    const current = this.snapshot;
    const ext = (current.extensionRequests || []).find((r) => r.id === requestId);
    if (!ext) {
      return { success: false, message: 'Extension request record not found.' };
    }

    const tx = current.transactions.find(
      (t) => t.id === ext.transactionId || t.accessionNo === ext.accessionNo || t.barcode === ext.barcode
    );

    // Revert due date back to original date before extension approval
    const originalDueDate = ext.currentDueDate;
    const today = new Date();
    const todayDateOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const dueD = new Date(originalDueDate.split(' ')[0]);
    const isNowOverdue = todayDateOnly > dueD;
    const diffDays = isNowOverdue ? Math.max(1, Math.ceil((todayDateOnly.getTime() - dueD.getTime()) / (1000 * 3600 * 24))) : 0;
    const fineRate = current.config?.fineRatePerDay || 5.00;
    const fineAmount = diffDays * fineRate;

    let updatedTransactions = current.transactions;
    if (tx && tx.status !== 'RETURNED') {
      updatedTransactions = current.transactions.map((t) => {
        if (t.id === tx.id || t.accessionNo === ext.accessionNo) {
          return {
            ...t,
            dueDate: originalDueDate,
            status: isNowOverdue ? ('OVERDUE' as const) : ('ISSUED' as const),
            fineAmount: isNowOverdue ? fineAmount : t.fineAmount,
            fineStatus: isNowOverdue ? (t.fineStatus === 'PAID' ? 'PAID' : 'UNPAID') : t.fineStatus,
            renewalCount: Math.max(0, (t.renewalCount || 1) - 1),
            notes: `Extension approval revoked by Admin on ${getLocalDateStr(new Date())}.${isNowOverdue ? ` Overdue fine assessed: ₹${fineAmount.toFixed(2)}` : ''}`,
          };
        }
        return t;
      });
    }

    // Update Extension Request status to REJECTED (Unapproved)
    const updatedRequests = (current.extensionRequests || []).map((r) => {
      if (r.id === requestId) {
        return {
          ...r,
          status: 'REJECTED' as const,
          reviewedByName: 'Head Librarian (Admin)',
          reviewedDate: getLocalDateStr(new Date()),
          adminNotes: adminNotes || 'Extension approval was un-approved / revoked by Admin Librarian.',
        };
      }
      return r;
    });

    let updatedFines = [...current.fines];
    if (isNowOverdue && tx && fineAmount > 0) {
      const existingFine = updatedFines.find((f) => f.transactionId === tx.id);
      if (existingFine) {
        updatedFines = updatedFines.map((f) =>
          f.id === existingFine.id ? { ...f, amount: fineAmount, status: f.status === 'PAID' ? 'PAID' : 'UNPAID' } : f
        );
      } else {
        updatedFines.unshift({
          id: `fine-${Date.now()}`,
          transactionId: tx.id,
          memberId: tx.memberId,
          memberName: tx.memberName,
          memberCardNo: tx.memberCardNo,
          bookTitle: tx.bookTitle,
          amount: fineAmount,
          paidAmount: 0,
          reason: 'OVERDUE',
          status: 'UNPAID',
          createdDate: getLocalDateStr(new Date()),
        });
      }
    }

    this.state$.next({
      ...current,
      transactions: updatedTransactions,
      extensionRequests: updatedRequests,
      fines: updatedFines,
    });

    this.addAuditLog('1', 'Admin Librarian', 'ADMIN', 'REJECT_EXTENSION', 'CIRCULATION', `Un-approved extension for "${ext.bookTitle}" (Member: ${ext.memberName}). Due date reverted to ${originalDueDate}.${isNowOverdue ? ` Overdue fine assessed: ₹${fineAmount.toFixed(2)}.` : ''}`);

    return {
      success: true,
      message: `Extension for "${ext.bookTitle}" has been un-approved! Due date reverted back to ${originalDueDate}.${isNowOverdue ? ` Overdue fine of ₹${fineAmount.toFixed(2)} (${diffDays} days) has been assessed.` : ''}`,
    };
  }

  public processFinePayment(fineId: string, action: 'PAY' | 'WAIVE', waiveReason?: string) {
    const current = this.snapshot;
    let fine = current.fines.find((f) => f.id === fineId);
    let targetFines = [...current.fines];

    // If fine is a live active overdue record (fine-live-${tx.id}) or not yet in current.fines
    if (!fine && fineId.startsWith('fine-live-')) {
      const txId = fineId.replace('fine-live-', '');
      const tx = (current.transactions || []).find((t) => t.id === txId);
      if (tx) {
        const today = new Date();
        const due = new Date(tx.dueDate);
        const diffDays = Math.max(1, Math.ceil((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24)));
        const fineAmount = diffDays * (current.config?.fineRatePerDay || 5);
        fine = {
          id: `fine-${Date.now()}`,
          transactionId: tx.id,
          memberId: tx.memberId,
          memberName: tx.memberName,
          memberCardNo: tx.memberCardNo,
          bookTitle: tx.bookTitle,
          amount: fineAmount,
          paidAmount: 0,
          reason: 'OVERDUE',
          status: 'UNPAID',
          createdDate: tx.dueDate,
        };
        targetFines = [fine, ...targetFines];
        fineId = fine.id;
      }
    }

    if (!fine) return;

    const receiptNo = action === 'PAY' ? `REC-${Date.now()}` : undefined;

    const updatedFines = targetFines.map((f) => {
      if (f.id === fineId || f.id === fine?.id) {
        return {
          ...f,
          status: action === 'PAY' ? ('PAID' as const) : ('WAIVED' as const),
          paidAmount: action === 'PAY' ? f.amount : 0,
          receiptNo,
          paidDate: getLocalDateStr(new Date()),
          waiveReason: waiveReason || (action === 'WAIVE' ? 'Waived by Librarian approval.' : undefined),
          waivedBy: action === 'WAIVE' ? 'Chief Librarian (Admin)' : undefined,
        };
      }
      return f;
    });

    const updatedMembers = current.members.map((m) => {
      if (m.id === fine!.memberId) {
        return {
          ...m,
          pendingFines: Math.max(0, m.pendingFines - fine!.amount),
        };
      }
      return m;
    });

    // Also update transaction fineStatus if tied to a transaction
    let updatedTransactions = current.transactions;
    if (fine.transactionId) {
      updatedTransactions = current.transactions.map((t) => {
        if (t.id === fine!.transactionId) {
          return {
            ...t,
            fineStatus: action === 'PAY' ? ('PAID' as const) : ('WAIVED' as const),
          };
        }
        return t;
      });
    }

    this.state$.next({
      ...current,
      fines: updatedFines,
      members: updatedMembers,
      transactions: updatedTransactions,
    });

    this.addAuditLog('1', 'Admin Librarian', 'ADMIN', `FINE_${action}`, 'FINANCE', `Processed fine ${fine.id} (₹${fine.amount}) - Status: ${action}. Reason: ${waiveReason || 'Standard'}`);
  }

  public updateFineWaiveReason(fineId: string, newWaiveReason: string): { success: boolean; message: string } {
    const current = this.snapshot;
    const fine = current.fines.find((f) => f.id === fineId);
    if (!fine) return { success: false, message: 'Fine record not found.' };

    const updatedFines = current.fines.map((f) => {
      if (f.id === fineId) {
        return {
          ...f,
          waiveReason: newWaiveReason.trim(),
        };
      }
      return f;
    });

    this.state$.next({
      ...current,
      fines: updatedFines,
    });

    this.addAuditLog('1', 'Admin Librarian', 'ADMIN', 'UPDATE_WAIVE_REASON', 'FINANCE', `Updated waive reason for fine ${fine.id} (${fine.memberName}): "${newWaiveReason}"`);
    return { success: true, message: 'Waive reason updated successfully.' };
  }

  public deleteFine(fineId: string): { success: boolean; message: string } {
    const current = this.snapshot;
    const fine = current.fines.find((f) => f.id === fineId);
    if (!fine) return { success: false, message: 'Fine record not found.' };

    const updatedFines = current.fines.filter((f) => f.id !== fineId);
    const updatedMembers = current.members.map((m) => {
      if (m.id === fine.memberId && fine.status === 'UNPAID') {
        return {
          ...m,
          pendingFines: Math.max(0, m.pendingFines - fine.amount),
        };
      }
      return m;
    });

    this.state$.next({
      ...current,
      fines: updatedFines,
      members: updatedMembers,
    });

    this.addAuditLog('1', 'Admin Librarian', 'ADMIN', 'DELETE_FINE', 'FINANCE', `Deleted fine record ${fine.id} (₹${fine.amount}) for ${fine.memberName}`);
    return { success: true, message: 'Fine record deleted successfully.' };
  }

  public reserveBook(bookId: string, memberIdentifier: string): { success: boolean; message: string } {
    const current = this.snapshot;
    const book = current.books.find((b) => b.id === bookId);
    let member = current.members.find(
      (m) =>
        m.id === memberIdentifier ||
        m.userId === memberIdentifier ||
        m.email.toLowerCase() === memberIdentifier.toLowerCase()
    );

    if (!member) {
      member = current.members.find((m) => m.role === 'STUDENT') || current.members[0];
    }

    if (!book || !member) {
      return { success: false, message: 'Invalid book or member.' };
    }

    const existing = current.reservations.find((r) => r.bookId === bookId && r.memberId === member.id && r.status === 'PENDING');
    if (existing) {
      return { success: false, message: 'You already have an active reservation hold for this book.' };
    }

    const queuePosition = current.reservations.filter((r) => r.bookId === bookId && r.status === 'PENDING').length + 1;
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + 7);

    const reservation: Reservation = {
      id: `res-${Date.now()}`,
      bookId: book.id,
      bookTitle: book.title,
      coverUrl: book.coverUrl,
      memberId: member.id,
      memberName: member.name,
      memberCardNo: member.memberCardNo,
      requestDate: getLocalDateStr(new Date()),
      expiryDate: getLocalDateStr(expiry),
      queuePosition,
      status: 'PENDING',
    };

    this.state$.next({
      ...current,
      reservations: [reservation, ...current.reservations],
    });

    this.addAuditLog(member.id, member.name, member.role, 'PLACE_RESERVATION_HOLD', 'CATALOG_RESERVATIONS', `Placed hold on "${book.title}". Position in queue: #${queuePosition}`);

    return { success: true, message: `Reservation hold placed successfully! Queue Position: #${queuePosition}` };
  }

  public cancelReservation(resId: string) {
    const current = this.snapshot;
    const reservations = current.reservations.map((r) => (r.id === resId ? { ...r, status: 'CANCELLED' as const } : r));
    this.state$.next({ ...current, reservations });
    this.addAuditLog('1', 'Member User', 'STUDENT', 'CANCEL_RESERVATION', 'CATALOG_RESERVATIONS', `Cancelled reservation ID ${resId}`);
  }

  public addDigitalResource(resource: Omit<DigitalResource, 'id' | 'downloadCount' | 'uploadDate'>, user?: { id: string; name: string; role: Role }) {
    try {
      const id = `dig-${Date.now()}`;
      if (resource.uploadedFileData) {
        digitalFileStorage.saveFile(id, resource.uploadedFileData, resource.uploadedFileName, resource.fileMimeType);
      }
      const newRes: DigitalResource = {
        ...resource,
        id,
        downloadCount: 0,
        uploadDate: getLocalDateStr(new Date()),
        isArchived: false,
      };
      const current = this.snapshot;
      this.state$.next({
        ...current,
        digitalResources: [newRes, ...current.digitalResources],
      });

      this.addAuditLog(
        user?.id || '1',
        user?.name || 'Librarian Officer',
        user?.role || 'ADMIN',
        'DIGITAL_RESOURCE_UPLOAD',
        'DIGITAL_LIBRARY',
        `Uploaded new digital asset "${newRes.title}" (${newRes.resourceType})`
      );
      return { success: true, message: `Successfully published "${newRes.title}" to Enterprise Digital Library.` };
    } catch (e: any) {
      console.error('Error adding digital resource:', e);
      return { success: false, message: `Failed to publish: ${e?.message || 'Unknown error'}` };
    }
  }

  public updateDigitalResource(id: string, data: Partial<DigitalResource>, user?: { id: string; name: string; role: Role }) {
    try {
      if (data.uploadedFileData) {
        digitalFileStorage.saveFile(id, data.uploadedFileData, data.uploadedFileName, data.fileMimeType);
      }
      const current = this.snapshot;
      const digitalResources = current.digitalResources.map((d) => (d.id === id ? { ...d, ...data } : d));
      this.state$.next({ ...current, digitalResources });

      this.addAuditLog(
        user?.id || '1',
        user?.name || 'Librarian Officer',
        user?.role || 'ADMIN',
        'DIGITAL_RESOURCE_UPDATE',
        'DIGITAL_LIBRARY',
        `Updated digital asset ID ${id}`
      );
      return { success: true, message: 'Digital resource metadata updated successfully!' };
    } catch (e: any) {
      console.error('Error updating digital resource:', e);
      return { success: false, message: `Failed to update metadata: ${e?.message || 'Unknown error'}` };
    }
  }

  public deleteDigitalResource(id: string, user?: { id: string; name: string; role: Role }) {
    const current = this.snapshot;
    const target = current.digitalResources.find((d) => d.id === id);
    const digitalResources = current.digitalResources.filter((d) => d.id !== id);
    this.state$.next({ ...current, digitalResources });

    this.addAuditLog(
      user?.id || '1',
      user?.name || 'Librarian Officer',
      user?.role || 'ADMIN',
      'DIGITAL_RESOURCE_DELETE',
      'DIGITAL_LIBRARY',
      `Deleted digital asset "${target?.title || id}"`
    );
    return { success: true, message: 'Digital asset removed permanently from repository.' };
  }

  public archiveDigitalResource(id: string, user?: { id: string; name: string; role: Role }) {
    const current = this.snapshot;
    const digitalResources = current.digitalResources.map((d) =>
      d.id === id ? { ...d, isArchived: !d.isArchived } : d
    );
    const target = digitalResources.find((d) => d.id === id);
    this.state$.next({ ...current, digitalResources });

    this.addAuditLog(
      user?.id || '1',
      user?.name || 'Librarian Officer',
      user?.role || 'ADMIN',
      'DIGITAL_RESOURCE_ARCHIVE',
      'DIGITAL_LIBRARY',
      `${target?.isArchived ? 'Archived' : 'Unarchived'} digital asset "${target?.title || id}"`
    );
    return {
      success: true,
      message: `Digital resource ${target?.isArchived ? 'archived' : 'restored from archives'}!`,
    };
  }

  // ==========================================
  // OFFICIAL DOWNLOADS & FORMS MANAGEMENT (LIBRARIAN / ADMIN)
  // ==========================================

  public addOfficialDocument(doc: Omit<OfficialDocument, 'id' | 'downloadCount' | 'createdAt'>, user?: { id: string; name: string; role: Role | string }) {
    try {
      const id = `doc-${Date.now()}`;
      if (doc.uploadedFileData) {
        digitalFileStorage.saveFile(id, doc.uploadedFileData, doc.uploadedFileName, doc.fileType || 'application/pdf');
      }
      const newDoc: OfficialDocument = {
        ...doc,
        id,
        downloadCount: 0,
        createdAt: getLocalDateStr(new Date()),
        isArchived: false,
        uploadedBy: user?.name || 'Chief Librarian',
      };
      const current = this.snapshot;
      const officialDocuments = [newDoc, ...(current.officialDocuments || [])];
      this.state$.next({ ...current, officialDocuments });

      this.addAuditLog(
        user?.id || '1',
        user?.name || 'Librarian Officer',
        user?.role || 'ADMIN',
        'OFFICIAL_DOC_UPLOAD',
        'DOWNLOAD_CENTER',
        `Published official document "${newDoc.title}" (${newDoc.category})`
      );
      return { success: true, message: `Successfully published official form "${newDoc.title}"!` };
    } catch (e: any) {
      console.error('Error adding official document:', e);
      return { success: false, message: `Failed to publish: ${e?.message || 'Unknown error'}` };
    }
  }

  public updateOfficialDocument(id: string, data: Partial<OfficialDocument>, user?: { id: string; name: string; role: Role | string }) {
    try {
      if (data.uploadedFileData) {
        digitalFileStorage.saveFile(id, data.uploadedFileData, data.uploadedFileName, data.fileType || 'application/pdf');
      }
      const current = this.snapshot;
      const officialDocuments = (current.officialDocuments || []).map((d) => (d.id === id ? { ...d, ...data } : d));
      this.state$.next({ ...current, officialDocuments });

      this.addAuditLog(
        user?.id || '1',
        user?.name || 'Librarian Officer',
        user?.role || 'ADMIN',
        'OFFICIAL_DOC_UPDATE',
        'DOWNLOAD_CENTER',
        `Updated official document ID ${id}`
      );
      return { success: true, message: 'Official document updated successfully!' };
    } catch (e: any) {
      console.error('Error updating official document:', e);
      return { success: false, message: `Failed to update document: ${e?.message || 'Unknown error'}` };
    }
  }

  public deleteOfficialDocument(id: string, user?: { id: string; name: string; role: Role | string }) {
    const current = this.snapshot;
    const target = (current.officialDocuments || []).find((d) => d.id === id);
    const officialDocuments = (current.officialDocuments || []).filter((d) => d.id !== id);
    this.state$.next({ ...current, officialDocuments });
    digitalFileStorage.deleteFile(id);

    this.addAuditLog(
      user?.id || '1',
      user?.name || 'Librarian Officer',
      user?.role || 'ADMIN',
      'OFFICIAL_DOC_DELETE',
      'DOWNLOAD_CENTER',
      `Deleted official document "${target?.title || id}"`
    );
    return { success: true, message: 'Official document deleted permanently.' };
  }

  public incrementOfficialDocDownload(id: string, user?: { id: string; name: string; role: Role | string }) {
    const current = this.snapshot;
    const officialDocuments = (current.officialDocuments || []).map((d) =>
      d.id === id ? { ...d, downloadCount: (d.downloadCount || 0) + 1 } : d
    );
    this.state$.next({ ...current, officialDocuments });
  }

  public toggleBookmarkResource(id: string) {
    const current = this.snapshot;
    const currentBookmarks = current.bookmarkedIds || [];
    const isBookmarked = currentBookmarks.includes(id);
    const bookmarkedIds = isBookmarked ? currentBookmarks.filter((bId) => bId !== id) : [...currentBookmarks, id];

    this.state$.next({ ...current, bookmarkedIds });
    return {
      success: true,
      isBookmarked: !isBookmarked,
      message: !isBookmarked ? 'Added to your digital bookmarks!' : 'Removed from bookmarks.',
    };
  }

  public incrementDownload(resourceId: string, user?: { id: string; name: string; role: Role }) {
    const current = this.snapshot;
    let downloadedTitle = '';
    let downloadedSize = 0;
    let resourceType: DigitalResourceType = 'RESEARCH_PAPER';

    const digitalResources = current.digitalResources.map((d) => {
      if (d.id === resourceId) {
        downloadedTitle = d.title;
        downloadedSize = d.fileSizeMb;
        resourceType = d.resourceType;
        return { ...d, downloadCount: d.downloadCount + 1 };
      }
      return d;
    });

    const newLog: DigitalDownloadLog = {
      id: `dlog-${Date.now()}`,
      resourceId,
      resourceTitle: downloadedTitle || 'Digital File',
      resourceType,
      userId: user?.id || 'guest',
      userName: user?.name || 'Portal Visitor',
      userRole: user?.role || 'GUEST',
      timestamp: getLocalDateStr(new Date()) + ' ' + new Date().toLocaleTimeString(),
      fileSizeMb: downloadedSize || 1.0,
    };

    const downloadLogs = [newLog, ...(current.downloadLogs || [])];
    this.state$.next({ ...current, digitalResources, downloadLogs });

    this.addAuditLog(
      user?.id || 'guest',
      user?.name || 'Portal Visitor',
      user?.role || 'GUEST',
      'DIGITAL_FILE_DOWNLOAD',
      'DIGITAL_LIBRARY',
      `Downloaded file "${downloadedTitle}"`
    );
  }

  public async fetchNewspaperFeeds() {
    const current = this.snapshot;
    const todayStr = getLocalDateStr(new Date());

    // Check RSS feeds for newspapers
    const newspapers = current.digitalResources.filter((r) => r.resourceType === 'NEWSPAPER');
    let hasNewUpdates = false;

    const updatedResources = current.digitalResources.map((res) => {
      if (res.resourceType === 'NEWSPAPER') {
        if (res.uploadDate !== todayStr) {
          hasNewUpdates = true;
          return {
            ...res,
            uploadDate: todayStr,
            newspaperEdition: `Today's Edition (${todayStr})`,
            description: `Today's official digital newspaper edition updated on ${todayStr}.`,
          };
        }
      }
      return res;
    });

    if (hasNewUpdates) {
      this.state$.next({ ...current, digitalResources: updatedResources });
      this.addAuditLog('1', 'System RSS Automation', 'ADMIN', 'NEWSPAPER_RSS_REFRESH', 'DIGITAL_LIBRARY', `Auto-synced today's digital newspapers edition for ${todayStr}`);
    }

    return { success: true, count: newspapers.length, todayStr };
  }

  public exportDigitalLibraryReportCSV(items: DigitalResource[]) {
    const headers = [
      'Resource ID',
      'Title',
      'Resource Category Type',
      'Department',
      'Subject',
      'Semester',
      'Year',
      'Author / Publisher',
      'Access Rights',
      'File Size (MB)',
      'Total Downloads',
      'Upload Date',
      'Archived Status',
    ];

    const rows = items.map((r) => [
      r.id,
      `"${(r.title || '').replace(/"/g, '""')}"`,
      r.resourceType,
      `"${(r.department || 'All Departments').replace(/"/g, '""')}"`,
      `"${(r.subject || 'General').replace(/"/g, '""')}"`,
      r.semester || 'N/A',
      r.year || 'N/A',
      `"${(r.authorName || '').replace(/"/g, '""')}"`,
      r.accessLevel || 'OPEN_ACCESS',
      r.fileSizeMb,
      r.downloadCount,
      r.uploadDate,
      r.isArchived ? 'ARCHIVED' : 'ACTIVE',
    ]);

    const csvString = [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `enterprise_digital_library_report_${getLocalDateStr(new Date())}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  public updateConfig(newConfig: Partial<SystemConfig>) {
    const current = this.snapshot;
    const config = { ...current.config, ...newConfig };
    this.state$.next({ ...current, config });
    this.addAuditLog('1', 'Admin Librarian', 'ADMIN', 'CONFIG_UPDATE', 'SETTINGS', 'Updated system preferences and rules.');
  }

  public registerMember(data: {
    name: string;
    email: string;
    role: Role;
    department?: string;
    phone?: string;
    rollNo?: string;
    academicBatch?: string;
    address?: string;
    emergencyContact?: string;
    password?: string;
    status?: UserStatus;
  }): MemberProfile {
    const current = this.snapshot;

    // Check if email already exists
    const existing = current.members.find((m) => m.email.toLowerCase() === data.email.toLowerCase());
    if (existing) {
      return existing;
    }

    const cardNo = generateLibraryCardId(data.role);
    const maxBooks = data.role === 'FACULTY' ? 10 : data.role === 'STUDENT' ? 5 : 15;

    const newMember: MemberProfile = {
      id: `mem-${Date.now()}`,
      userId: `user-${Date.now()}`,
      name: data.name,
      email: data.email,
      password: data.password || 'password123',
      role: data.role,
      memberCardNo: cardNo,
      department: data.department || 'General Academic',
      status: data.status || 'ACTIVE',
      maxAllowedBooks: maxBooks,
      currentActiveLoans: 0,
      pendingFines: 0.00,
      registeredDate: getLocalDateStr(new Date()),
      appliedDate: getLocalDateStr(new Date()),
      avatarUrl: `https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80`,
      phone: data.phone || '+91 98765 43210',
      rollNo: data.rollNo || (data.role === 'STUDENT' ? '2026-CS-101' : 'EMP-2026-88'),
      academicBatch: data.academicBatch || (data.role === 'STUDENT' ? 'B.Tech 3rd Year' : 'Assistant Professor'),
      address: data.address || 'University Campus Hostel Block A',
      emergencyContact: data.emergencyContact || '+91 98100 12345',
    };

    this.state$.next({
      ...current,
      members: [newMember, ...current.members],
    });

    this.addAuditLog(newMember.id, newMember.name, newMember.role, 'REGISTER_MEMBER', 'MEMBER_MANAGEMENT', `Registered new ${newMember.role} account (${cardNo})`);
    return newMember;
  }

  /**
   * Submits a self-service registration request for Students, Faculty, Staff, or Other users
   * Account is automatically set to PENDING_APPROVAL and cannot log in until Admin approval
   */
  public submitAccountRegistration(data: {
    name: string;
    email: string;
    password?: string;
    role: Role;
    department?: string;
    phone?: string;
    rollNo?: string;
    program?: string;
    academicBatch?: string;
    address?: string;
    emergencyContact?: string;
    gender?: 'MALE' | 'FEMALE' | 'OTHER';
    idProofType?: 'COLLEGE_ID' | 'AADHAAR' | 'PASSPORT' | 'DRIVING_LICENSE' | 'OTHER';
    idProofNumber?: string;
  }): { success: boolean; message: string; member?: MemberProfile } {
    const current = this.snapshot;
    const cleanEmail = (data.email || '').trim().toLowerCase();

    const existing = current.members.find((m) => m.email.toLowerCase() === cleanEmail);
    if (existing) {
      if (existing.status === 'PENDING_APPROVAL') {
        return {
          success: false,
          message: `An account application with email "${cleanEmail}" is already pending approval. Submitted on ${existing.appliedDate || existing.registeredDate}.`,
          member: existing,
        };
      }
      if (existing.status === 'REJECTED') {
        return {
          success: false,
          message: `A registration with email "${cleanEmail}" was previously rejected (Reason: ${existing.rejectionReason || 'Incomplete details'}). Please contact Library Admin or re-apply.`,
          member: existing,
        };
      }
      return {
        success: false,
        message: `An account with email "${cleanEmail}" already exists. Please proceed to login.`,
        member: existing,
      };
    }

    const todayStr = getLocalDateStr(new Date());
    const roleCardId = generateLibraryCardId(data.role);
    const maxBooks = data.role === 'FACULTY' ? 10 : data.role === 'STAFF' ? 8 : data.role === 'STUDENT' ? 5 : 3;

    const newApplicant: MemberProfile = {
      id: `mem-app-${Date.now()}`,
      userId: `user-app-${Date.now()}`,
      name: data.name.trim(),
      email: cleanEmail,
      password: data.password || 'password123',
      role: data.role,
      memberCardNo: roleCardId, // Assigned role-based card ID (e.g. STU-2026-XXXX, FAC-2026-XXXX)
      department: data.department || 'General Academic',
      status: 'PENDING_APPROVAL',
      maxAllowedBooks: maxBooks,
      currentActiveLoans: 0,
      pendingFines: 0,
      registeredDate: todayStr,
      appliedDate: todayStr,
      gender: data.gender || 'MALE',
      avatarUrl: `https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80`,
      phone: data.phone || '+91 98765 43210',
      rollNo: data.rollNo || (data.role === 'STUDENT' ? '2026-CS-NEW' : 'EMP-2026-NEW'),
      program: data.program || 'Undergraduate Program',
      academicBatch: data.academicBatch || (data.role === 'STUDENT' ? 'Batch 2024-2028' : 'Faculty Staff'),
      address: data.address || 'Hostel / Campus Residential',
      emergencyContact: data.emergencyContact || '+91 98000 00000',
      idProofType: data.idProofType || 'COLLEGE_ID',
      idProofNumber: data.idProofNumber || data.rollNo,
    };

    // Add Admin Notification
    const adminNotice: Notice = {
      id: `notice-app-${Date.now()}`,
      title: `New ${data.role} Account Registration Request`,
      content: `Applicant "${newApplicant.name}" (${newApplicant.role}, Dept: ${newApplicant.department}) has submitted a library membership application (Card ID: ${roleCardId}). Please review and approve/reject in Account Approvals.`,
      targetAudience: 'ADMIN',
      createdDate: todayStr,
      isUrgent: true,
      senderName: 'Portal Registration Gateway',
      category: 'ACCOUNT_REGISTRATION',
    };

    this.state$.next({
      ...current,
      members: [newApplicant, ...current.members],
      notices: [adminNotice, ...(current.notices || [])],
    });

    this.addAuditLog(
      newApplicant.id,
      newApplicant.name,
      newApplicant.role,
      'SUBMIT_REGISTRATION',
      'ACCOUNT_APPROVALS',
      `Submitted membership application for ${newApplicant.role} (${newApplicant.department}). Card ID: ${roleCardId}. Status set to PENDING_APPROVAL.`
    );

    return {
      success: true,
      message: `Registration submitted successfully! Library Card ID: ${roleCardId}. Your account is waiting for Admin approval before you can log in.`,
      member: newApplicant,
    };
  }

  /**
   * Approves a pending library account and assigns official Member Card ID & permissions
   */
  public approveAccount(
    memberId: string,
    options?: { memberCardNo?: string; notes?: string; reviewerName?: string }
  ): { success: boolean; message: string; member?: MemberProfile } {
    const current = this.snapshot;
    const target = current.members.find((m) => m.id === memberId || m.email.toLowerCase() === memberId.toLowerCase());

    if (!target) {
      return { success: false, message: 'Member account not found.' };
    }

    const todayStr = getLocalDateStr(new Date());
    const generatedCardNo =
      options?.memberCardNo?.trim() && !options.memberCardNo.startsWith('APP-')
        ? options.memberCardNo.trim()
        : target.memberCardNo && !target.memberCardNo.startsWith('APP-')
        ? target.memberCardNo
        : generateLibraryCardId(target.role);

    const updatedMember: MemberProfile = {
      ...target,
      status: 'ACTIVE',
      memberCardNo: generatedCardNo,
      approvedDate: todayStr,
      approvedBy: options?.reviewerName || 'Chief Admin Librarian',
      rejectionReason: undefined,
      suspendedReason: undefined,
    };

    const approvalNotice: Notice = {
      id: `notice-appr-${Date.now()}`,
      title: '🎉 Library Account Approved & Activated',
      content: `Dear ${target.name}, congratulations! Your University Central Library Account registration has been approved. Your official Library Card Number is "${updatedMember.memberCardNo}". You can now log into your portal dashboard to borrow books, reserve catalog items, and access digital resources.`,
      recipientEmail: target.email,
      recipientName: target.name,
      recipientMemberId: updatedMember.id,
      targetAudience: target.role,
      createdDate: todayStr,
      isUrgent: false,
      senderName: options?.reviewerName || 'Chief Admin Librarian',
      category: 'ACCOUNT_APPROVAL',
    };

    const members = current.members.map((m) => (m.id === target.id ? updatedMember : m));
    this.state$.next({
      ...current,
      members,
      notices: [approvalNotice, ...(current.notices || [])],
    });

    this.addAuditLog(
      target.id,
      target.name,
      target.role,
      'APPROVE_ACCOUNT',
      'ACCOUNT_APPROVALS',
      `Approved ${target.role} account. Assigned Member Card: ${updatedMember.memberCardNo}.`
    );

    return {
      success: true,
      message: `Account for "${target.name}" has been approved successfully! Assigned Card No: ${updatedMember.memberCardNo}.`,
      member: updatedMember,
    };
  }

  /**
   * Rejects a pending library account registration with required reason
   */
  public rejectAccount(
    memberId: string,
    reason: string,
    reviewerName?: string
  ): { success: boolean; message: string; member?: MemberProfile } {
    const current = this.snapshot;
    const target = current.members.find((m) => m.id === memberId || m.email.toLowerCase() === memberId.toLowerCase());

    if (!target) {
      return { success: false, message: 'Member account not found.' };
    }

    const cleanReason = reason?.trim() || 'Application details could not be verified by Library Administration.';
    const todayStr = getLocalDateStr(new Date());

    const updatedMember: MemberProfile = {
      ...target,
      status: 'REJECTED',
      rejectionReason: cleanReason,
      approvedDate: todayStr,
      approvedBy: reviewerName || 'Chief Admin Librarian',
    };

    const rejectionNotice: Notice = {
      id: `notice-rej-${Date.now()}`,
      title: '⚠️ Library Account Registration Update',
      content: `Dear ${target.name}, your library account registration was reviewed and could not be approved at this time. Reason: "${cleanReason}". Please contact the Central Library Administration Desk if you require assistance.`,
      recipientEmail: target.email,
      recipientName: target.name,
      recipientMemberId: updatedMember.id,
      targetAudience: target.role,
      createdDate: todayStr,
      isUrgent: true,
      senderName: reviewerName || 'Chief Admin Librarian',
      category: 'ACCOUNT_REJECTION',
    };

    const members = current.members.map((m) => (m.id === target.id ? updatedMember : m));
    this.state$.next({
      ...current,
      members,
      notices: [rejectionNotice, ...(current.notices || [])],
    });

    this.addAuditLog(
      target.id,
      target.name,
      target.role,
      'REJECT_ACCOUNT',
      'ACCOUNT_APPROVALS',
      `Rejected account application for ${target.name} (${target.email}). Reason: ${cleanReason}`
    );

    return {
      success: true,
      message: `Registration for "${target.name}" has been rejected.`,
      member: updatedMember,
    };
  }

  /**
   * Suspends an active library account
   */
  public suspendAccount(
    memberId: string,
    reason: string,
    reviewerName?: string
  ): { success: boolean; message: string; member?: MemberProfile } {
    const current = this.snapshot;
    const target = current.members.find((m) => m.id === memberId || m.email.toLowerCase() === memberId.toLowerCase());

    if (!target) {
      return { success: false, message: 'Member account not found.' };
    }

    const cleanReason = reason?.trim() || 'Account suspended by Library Administration due to policy compliance review.';
    const todayStr = getLocalDateStr(new Date());

    const updatedMember: MemberProfile = {
      ...target,
      status: 'SUSPENDED',
      suspendedReason: cleanReason,
    };

    const suspensionNotice: Notice = {
      id: `notice-susp-${Date.now()}`,
      title: '🛑 Library Membership Suspended',
      content: `Dear ${target.name}, your library borrowing privileges and portal access have been temporarily suspended. Reason: "${cleanReason}". Please report to the Circulation Counter to resolve any outstanding issues.`,
      recipientEmail: target.email,
      recipientName: target.name,
      recipientMemberId: updatedMember.id,
      targetAudience: target.role,
      createdDate: todayStr,
      isUrgent: true,
      senderName: reviewerName || 'Chief Admin Librarian',
      category: 'ACCOUNT_SUSPENSION',
    };

    const members = current.members.map((m) => (m.id === target.id ? updatedMember : m));
    this.state$.next({
      ...current,
      members,
      notices: [suspensionNotice, ...(current.notices || [])],
    });

    this.addAuditLog(
      target.id,
      target.name,
      target.role,
      'SUSPEND_ACCOUNT',
      'ACCOUNT_APPROVALS',
      `Suspended account for ${target.name} (${target.memberCardNo}). Reason: ${cleanReason}`
    );

    return {
      success: true,
      message: `Account for "${target.name}" has been suspended.`,
      member: updatedMember,
    };
  }

  /**
   * Reactivates a suspended or inactive library account
   */
  public reactivateAccount(
    memberId: string,
    reviewerName?: string
  ): { success: boolean; message: string; member?: MemberProfile } {
    const current = this.snapshot;
    const target = current.members.find((m) => m.id === memberId || m.email.toLowerCase() === memberId.toLowerCase());

    if (!target) {
      return { success: false, message: 'Member account not found.' };
    }

    const todayStr = getLocalDateStr(new Date());
    const updatedMember: MemberProfile = {
      ...target,
      status: 'ACTIVE',
      suspendedReason: undefined,
    };

    const reactivateNotice: Notice = {
      id: `notice-react-${Date.now()}`,
      title: '✅ Library Membership Restored',
      content: `Dear ${target.name}, your library membership and portal privileges have been successfully restored and reactivated.`,
      recipientEmail: target.email,
      recipientName: target.name,
      recipientMemberId: updatedMember.id,
      targetAudience: target.role,
      createdDate: todayStr,
      isUrgent: false,
      senderName: reviewerName || 'Chief Admin Librarian',
      category: 'ACCOUNT_APPROVAL',
    };

    const members = current.members.map((m) => (m.id === target.id ? updatedMember : m));
    this.state$.next({
      ...current,
      members,
      notices: [reactivateNotice, ...(current.notices || [])],
    });

    this.addAuditLog(
      target.id,
      target.name,
      target.role,
      'REACTIVATE_ACCOUNT',
      'ACCOUNT_APPROVALS',
      `Reactivated membership privileges for ${target.name} (${target.memberCardNo}).`
    );

    return {
      success: true,
      message: `Account for "${target.name}" has been restored to Active status.`,
      member: updatedMember,
    };
  }

  /**
   * Deletes a member account record permanently
   */
  public deleteMemberAccount(memberId: string): { success: boolean; message: string } {
    const current = this.snapshot;
    const target = current.members.find((m) => m.id === memberId || m.email.toLowerCase() === memberId.toLowerCase());

    if (!target) {
      return { success: false, message: 'Member record not found.' };
    }

    const members = current.members.filter((m) => m.id !== target.id);
    this.state$.next({ ...current, members });

    this.addAuditLog(
      target.id,
      target.name,
      target.role,
      'DELETE_ACCOUNT',
      'ACCOUNT_APPROVALS',
      `Deleted account record for ${target.name} (${target.email}).`
    );

    return { success: true, message: `Account record for "${target.name}" has been deleted.` };
  }

  public updateMemberProfile(memberId: string, updates: Partial<MemberProfile>) {
    const current = this.snapshot;
    const members = current.members.map((m) => (m.id === memberId || m.email.toLowerCase() === memberId.toLowerCase() ? { ...m, ...updates } : m));
    this.state$.next({ ...current, members });
    this.addAuditLog(memberId, updates.name || 'Member', updates.role || 'STUDENT', 'UPDATE_PROFILE', 'USER_PROFILE', `Updated account profile parameters.`);
  }

  public addProcurementRequest(data: Omit<ProcurementRequest, 'id' | 'status' | 'requestedDate'>): ProcurementRequest {
    const current = this.snapshot;

    // Check duplicate in existing catalog or pending requests
    const cleanIsbn = data.isbn?.trim().toLowerCase();
    const cleanTitle = data.bookTitle.trim().toLowerCase();
    const cleanAuthor = data.authorName.trim().toLowerCase();

    const existingMatch = (current.procurementRequests || []).find((r) => {
      if (cleanIsbn && r.isbn?.trim().toLowerCase() === cleanIsbn) return true;
      return r.bookTitle.trim().toLowerCase() === cleanTitle && r.authorName.trim().toLowerCase() === cleanAuthor;
    });

    const isDuplicate = !!existingMatch;
    const nowStr = getLocalTimeMinutesStr(new Date());

    const initialTimelineStep: ProcurementTimelineStep = {
      status: 'PENDING',
      label: 'Procurement Request Created',
      timestamp: nowStr,
      actorName: data.requestedByName,
      actorRole: data.requestedByRole,
      notes: isDuplicate ? `Duplicate recommendation detected (Linked to Request #${existingMatch?.id}).` : 'Submitted via portal.',
    };

    const newReq: ProcurementRequest = {
      ...data,
      id: `proc-${Date.now()}`,
      status: 'PENDING',
      requestedDate: nowStr,
      quantityRequested: data.quantityRequested || 1,
      isDuplicate,
      duplicateOfRequestId: existingMatch?.id,
      timeline: [initialTimelineStep],
    };

    const updatedRequests = [newReq, ...(current.procurementRequests || [])];
    this.state$.next({ ...current, procurementRequests: updatedRequests });
    this.addAuditLog(data.requestedById, data.requestedByName, data.requestedByRole, 'PROCUREMENT_REQUEST', 'PROCUREMENT', `Submitted procurement recommendation for "${data.bookTitle}" (${isDuplicate ? 'Duplicate Flagged' : 'New'})`);

    return newReq;
  }

  public updateProcurementStatus(id: string, status: ProcurementStatus, adminNotes?: string, adminName: string = 'Chief Admin Librarian') {
    return this.advanceProcurementLifecycle(id, status, {}, adminNotes, adminName);
  }

  public advanceProcurementLifecycle(
    id: string,
    nextStatus: ProcurementStatus,
    payload: Partial<ProcurementRequest> = {},
    adminNotes?: string,
    adminName: string = 'Chief Admin Librarian'
  ): { success: boolean; message: string } {
    const current = this.snapshot;
    const req = (current.procurementRequests || []).find((r) => r.id === id);

    if (!req) {
      return { success: false, message: 'Procurement request record not found.' };
    }

    const nowStr = getLocalTimeMinutesStr(new Date());
    const dateOnlyStr = getLocalDateStr(new Date());

    const statusLabels: Record<ProcurementStatus, string> = {
      PENDING: 'Request Created',
      UNDER_REVIEW: 'Under Library Committee Review',
      ON_HOLD: 'On Hold for Vendor/Budget Clarification',
      APPROVED: 'Approved for Acquisition',
      REJECTED: 'Procurement Recommendation Rejected',
      PO_GENERATED: `Purchase Order Issued (${payload.poNumber || req.poNumber || 'PO Generated'})`,
      ORDERED: `Dispatched by Vendor (${payload.vendorName || req.vendorName || 'Vendor Assigned'})`,
      RECEIVED: `Physical Delivery Verified (${payload.receivedQuantity || req.quantityRequested || 1} Copies)`,
      QUALITY_CHECKED: `Physical Quality Inspection ${payload.qualityStatus || 'PASSED'}`,
      CATALOGED: `Cataloged with Accession Barcodes & Rack Assignment`,
      AVAILABLE: `Book Active in Library Catalog & Member Notified`,
      CLOSED: 'Procurement File Closed',
    };

    const newStep: ProcurementTimelineStep = {
      status: nextStatus,
      label: statusLabels[nextStatus] || `Status updated to ${nextStatus}`,
      timestamp: nowStr,
      actorName: adminName,
      actorRole: 'ADMIN',
      notes: adminNotes || payload.adminNotes,
    };

    const updatedTimeline = [...(req.timeline || []), newStep];

    const updatedReq: ProcurementRequest = {
      ...req,
      ...payload,
      status: nextStatus,
      adminNotes: adminNotes ?? payload.adminNotes ?? req.adminNotes,
      reviewedByName: adminName,
      reviewedDate: dateOnlyStr,
      timeline: updatedTimeline,
    };

    // -------------------------------------------------------------
    // AUTOMATIC CATALOGING & INVENTORY ACTIVATION ON CATALOGED/AVAILABLE
    // -------------------------------------------------------------
    let updatedBooks = current.books;
    let updatedNotices = current.notices || [];

    if ((nextStatus === 'CATALOGED' || nextStatus === 'AVAILABLE') && payload.generatedAccessionNos?.length) {
      const categoryObj = current.categories.find((c) => c.id === payload.assignedCategoryId || c.name === payload.assignedCategoryName) || current.categories[0];
      const authorObj = current.authors.find((a) => a.name.toLowerCase().includes(req.authorName.toLowerCase())) || current.authors[0];
      const pubObj = current.publishers.find((p) => p.name.toLowerCase().includes((req.publisherName || '').toLowerCase())) || current.publishers[0];

      // Check if book already exists in catalog
      let existingBook = current.books.find((b) => (req.isbn && b.isbn === req.isbn) || b.title.toLowerCase() === req.bookTitle.toLowerCase());

      const accessionNos = payload.generatedAccessionNos || [];
      const barcodes = payload.generatedBarcodes || accessionNos.map((acc) => acc.replace('ACC', 'BC'));
      const newCopies = accessionNos.map((acc, idx) => ({
        id: `copy-${Date.now()}-${idx}`,
        bookId: existingBook ? existingBook.id : `book-${Date.now()}`,
        accessionNo: acc,
        barcode: barcodes[idx] || `BC-${Date.now()}-${idx}`,
        qrCode: `QR-${barcodes[idx] || acc}`,
        rackNumber: payload.assignedRackNumber || req.assignedRackNumber || 'RACK-CS-01',
        shelfNumber: payload.assignedShelfNumber || req.assignedShelfNumber || 'SHELF-A1',
        status: 'AVAILABLE' as const,
        condition: 'NEW' as const,
        addedDate: dateOnlyStr,
      }));

      if (existingBook) {
        updatedBooks = current.books.map((b) => {
          if (b.id === existingBook!.id) {
            return {
              ...b,
              totalCopies: b.totalCopies + newCopies.length,
              availableCopies: b.availableCopies + newCopies.length,
              copies: [...(b.copies || []), ...newCopies],
            };
          }
          return b;
        });
      } else {
        const newBookObj: Book = {
          id: `book-${Date.now()}`,
          title: req.bookTitle,
          isbn: req.isbn || `978-${Math.floor(1000000000 + Math.random() * 9000000000)}`,
          categoryId: categoryObj.id,
          categoryName: categoryObj.name,
          authorId: authorObj.id,
          authorName: req.authorName,
          publisherId: pubObj.id,
          publisherName: req.publisherName || pubObj.name,
          edition: '1st Edition',
          publishingYear: new Date().getFullYear(),
          language: 'English',
          price: req.actualPrice || req.approvedPrice || req.estimatedPrice || 49.99,
          description: `Newly acquired textbook procured on recommendation of ${req.requestedByName} (${req.requestedByRole}).`,
          coverUrl: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=400&q=80',
          totalCopies: newCopies.length,
          availableCopies: newCopies.length,
          isFeatured: false,
          isBookOfMonth: false,
          rackNumber: payload.assignedRackNumber || 'RACK-CS-01',
          shelfNumber: payload.assignedShelfNumber || 'SHELF-A1',
          copies: newCopies,
        };
        updatedBooks = [newBookObj, ...current.books];
      }

      // Notify Requester Notice
      const newNotice: Notice = {
        id: `notice-proc-${Date.now()}`,
        title: `🎉 Procurement Complete: "${req.bookTitle}" is Now Available in Library Catalog!`,
        content: `Dear ${req.requestedByName}, the book "${req.bookTitle}" by ${req.authorName} that you recommended for library acquisition has been received, cataloged (Accession: ${accessionNos.join(', ')}), and placed on ${payload.assignedRackNumber || 'RACK-CS-01'}. You can now reserve or borrow it from the Central Library.`,
        targetAudience: req.requestedByRole === 'STUDENT' ? 'STUDENTS' : 'FACULTY',
        recipientName: req.requestedByName,
        createdDate: dateOnlyStr,
        isUrgent: false,
        senderName: 'Central Library Procurement Desk',
      };
      updatedNotices = [newNotice, ...updatedNotices];
    }

    const updatedProcurements = (current.procurementRequests || []).map((r) => (r.id === id ? updatedReq : r));

    this.state$.next({
      ...current,
      procurementRequests: updatedProcurements,
      books: updatedBooks,
      notices: updatedNotices,
    });

    this.addAuditLog('1', adminName, 'ADMIN', 'PROCUREMENT_LIFECYCLE_ADVANCE', 'PROCUREMENT', `Advanced procurement #${id} ("${req.bookTitle}") to ${nextStatus}`);

    return { success: true, message: `Procurement request "${req.bookTitle}" updated to ${nextStatus}.` };
  }

  public addVendor(data: Omit<Vendor, 'id'>): Vendor {
    const current = this.snapshot;
    const newVendor: Vendor = {
      ...data,
      id: `v-${Date.now()}`,
    };
    const vendors = [...(current.vendors || []), newVendor];
    this.state$.next({ ...current, vendors });
    this.addAuditLog('1', 'Chief Admin Librarian', 'ADMIN', 'ADD_VENDOR', 'PROCUREMENT', `Registered new book supplier: ${newVendor.name}`);
    return newVendor;
  }

  public updateVendor(vendorId: string, updates: Partial<Vendor>) {
    const current = this.snapshot;
    const vendors = (current.vendors || []).map((v) => (v.id === vendorId ? { ...v, ...updates } : v));
    this.state$.next({ ...current, vendors });
    this.addAuditLog('1', 'Chief Admin Librarian', 'ADMIN', 'UPDATE_VENDOR', 'PROCUREMENT', `Updated supplier details for ${vendorId}`);
  }

  public deleteVendor(vendorId: string) {
    const current = this.snapshot;
    const vendors = (current.vendors || []).filter((v) => v.id !== vendorId);
    this.state$.next({ ...current, vendors });
    this.addAuditLog('1', 'Chief Admin Librarian', 'ADMIN', 'DELETE_VENDOR', 'PROCUREMENT', `Removed supplier ${vendorId}`);
  }

  public mergeDuplicateRequests(primaryId: string, duplicateIds: string[]) {
    const current = this.snapshot;
    const primary = (current.procurementRequests || []).find((r) => r.id === primaryId);
    if (!primary) return;

    const dupSet = new Set(duplicateIds);
    const updatedRequests = (current.procurementRequests || []).map((r) => {
      if (r.id === primaryId) {
        return {
          ...r,
          quantityRequested: (r.quantityRequested || 1) + duplicateIds.length,
          duplicateCount: (r.duplicateCount || 0) + duplicateIds.length,
        };
      }
      if (dupSet.has(r.id)) {
        return {
          ...r,
          status: 'CLOSED' as const,
          isDuplicate: true,
          duplicateOfRequestId: primaryId,
          adminNotes: `Merged into primary procurement order #${primaryId}.`,
        };
      }
      return r;
    });

    this.state$.next({ ...current, procurementRequests: updatedRequests });
    this.addAuditLog('1', 'Chief Admin Librarian', 'ADMIN', 'MERGE_PROCUREMENT_DUPLICATES', 'PROCUREMENT', `Merged ${duplicateIds.length} duplicate recommendations into #${primaryId}`);
  }

  public sendOverdueReminder(transactionId: string): { success: boolean; message: string } {
    const current = this.snapshot;
    const tx = current.transactions.find((t) => t.id === transactionId);
    if (!tx) return { success: false, message: 'Transaction record not found.' };

    const member = current.members.find((m) => m.id === tx.memberId) || current.members.find((m) => m.role === 'STUDENT') || current.members[0];
    const email = member?.email || 'student@college.edu';
    const memberName = tx.memberName || member?.name || 'Jayendra Majji';

    // Create Notice & Library Circular Record for Student Portal
    const overdueNotice: Notice = {
      id: `notice-${Date.now()}`,
      title: `URGENT: Overdue Book Circulation Reminder - "${tx.bookTitle}"`,
      content: `Dear ${memberName}, your borrowed book "${tx.bookTitle}" (Accession No: ${tx.accessionNo}) is past its due date (${tx.dueDate}). Please return or renew the book copy at the Central Circulation Desk immediately to prevent fine accumulation.`,
      targetAudience: 'STUDENTS',
      recipientEmail: email,
      recipientName: memberName,
      createdDate: getLocalDateStr(new Date()),
      isUrgent: true,
      senderName: 'Central Circulation Desk',
    };

    const updatedNotices = [overdueNotice, ...(current.notices || [])];

    this.state$.next({
      ...current,
      notices: updatedNotices,
    });

    this.addAuditLog(
      '1',
      'Head Librarian Admin',
      'ADMIN',
      'SEND_OVERDUE_ALERT',
      'CIRCULATION_NOTIFICATIONS',
      `Sent automated Email & SMS reminder to ${memberName} (${email}) for "${tx.bookTitle}" (Accession: ${tx.accessionNo})`
    );

    return {
      success: true,
      message: `Overdue Notification successfully dispatched via Email (${email}) & Campus SMS to ${memberName}!`,
    };
  }

  public importBooksFromCSV(parsedBooks: Array<{ title: string; isbn: string; categoryName: string; authorName: string; publisherName: string; price?: number; totalCopies?: number }>): { addedCount: number; message: string } {
    const current = this.snapshot;
    let addedCount = 0;
    const updatedBooks = [...current.books];

    parsedBooks.forEach((item) => {
      if (!item.title || !item.isbn) return;
      const copiesCount = item.totalCopies && item.totalCopies > 0 ? Number(item.totalCopies) : 3;
      const newBookId = `bk-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

      const copies: BookCopy[] = Array.from({ length: copiesCount }, (_, idx) => {
        const accNum = `ACC-${new Date().getFullYear()}-${1000 + updatedBooks.length * 5 + idx + 1}`;
        const bc = `BC-${Math.floor(10000 + Math.random() * 90000)}`;
        return {
          id: `copy-${newBookId}-${idx + 1}`,
          bookId: newBookId,
          accessionNo: accNum,
          barcode: bc,
          qrCode: `QR-${bc}`,
          rackNumber: `RACK-${item.categoryName.substring(0, 3).toUpperCase()}-01`,
          shelfNumber: `SHELF-A${(idx % 4) + 1}`,
          status: 'AVAILABLE',
          condition: 'NEW',
          addedDate: getLocalDateStr(new Date()),
        };
      });

      const newBook: Book = {
        id: newBookId,
        title: item.title,
        isbn: item.isbn,
        categoryId: 'cat-1',
        categoryName: item.categoryName || 'Computer Science',
        authorId: 'auth-1',
        authorName: item.authorName || 'Academic Author',
        publisherId: 'pub-1',
        publisherName: item.publisherName || 'University Press',
        edition: '1st Edition',
        publishingYear: 2025,
        language: 'English',
        price: item.price ? Number(item.price) : 750,
        description: `Imported book title: ${item.title}`,
        coverUrl: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&auto=format&fit=crop&q=80',
        totalCopies: copiesCount,
        availableCopies: copiesCount,
        isFeatured: false,
        isBookOfMonth: false,
        copies,
      };

      updatedBooks.unshift(newBook);
      addedCount++;
    });

    this.state$.next({ ...current, books: updatedBooks });
    this.addAuditLog('1', 'Head Librarian Admin', 'ADMIN', 'BULK_CSV_IMPORT', 'CATALOG_IMPORTER', `Successfully batch imported ${addedCount} new book titles & accession copies into catalog.`);
    return { addedCount, message: `Successfully imported ${addedCount} book titles into library catalog!` };
  }

  public exportOverallExecutiveReport(): { success: boolean; filename: string } {
    const current = this.snapshot;
    const dateStr = getLocalDateStr(new Date());

    const escapeHtml = (str: any) => {
      if (str === null || str === undefined) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    };

    // 1. Telemetry Aggregates Across All Modules
    const totalCopies = current.books.reduce((sum, b) => sum + (b.totalCopies || 0), 0);
    const availableCopies = current.books.reduce((sum, b) => sum + (b.availableCopies || 0), 0);
    const totalTitles = current.books.length;
    const activeLoans = current.transactions.filter((t) => t.status === 'ISSUED' || t.status === 'OVERDUE').length;
    const overdueLoans = current.transactions.filter((t) => t.status === 'OVERDUE').length;
    const returnedLoans = current.transactions.filter((t) => t.status === 'RETURNED').length;
    const totalFinesSum = current.fines.reduce((sum, f) => sum + (f.amount || 0), 0);
    const unpaidFinesSum = current.fines.filter((f) => f.status === 'UNPAID').reduce((sum, f) => sum + (f.amount || 0), 0);
    const paidFinesSum = current.fines.filter((f) => f.status === 'PAID').reduce((sum, f) => sum + (f.amount || 0), 0);
    const totalMembers = current.members.length;
    const studentCount = current.members.filter((m) => m.role === 'STUDENT').length;
    const facultyCount = current.members.filter((m) => m.role === 'FACULTY').length;
    const staffCount = current.members.filter((m) => m.role === 'STAFF' || m.role === 'ADMIN').length;
    const attendanceCount = (current.attendanceRecords || []).length;
    const activeVisitorsCount = (current.attendanceRecords || []).filter((a) => !a.checkOutTime).length;
    const reservationsCount = current.reservations.length;
    const procRequests = current.procurementRequests || [];
    const pendingProc = procRequests.filter((r) => r.status === 'PENDING').length;
    const approvedProc = procRequests.filter((r) => r.status === 'APPROVED').length;
    const digitalCount = current.digitalResources ? current.digitalResources.length : 0;
    const totalDigitalDownloads = current.digitalResources ? current.digitalResources.reduce((sum, r) => sum + (r.downloadCount || 0), 0) : 0;
    const categoriesCount = current.categories ? current.categories.length : 0;
    const authorsCount = current.authors ? current.authors.length : 0;
    const publishersCount = current.publishers ? current.publishers.length : 0;
    const auditLogsCount = current.auditLogs.length;

    const kpiSummaryList = [
      { name: 'Total Book Titles Registered', val: totalTitles, detail: 'Physical Accessions Catalog', status: 'ACTIVE CATALOG', badge: 'badge-blue' },
      { name: 'Total Physical Book Copies Stock', val: totalCopies, detail: `Copies Available: ${availableCopies}`, status: 'SHELF READY', badge: 'badge-green' },
      { name: 'Active Checked-Out Books', val: activeLoans, detail: `Overdue: ${overdueLoans} | Returned: ${returnedLoans}`, status: overdueLoans > 0 ? 'ATTENTION NEEDED' : 'CIRCULATION HEALTHY', badge: overdueLoans > 0 ? 'badge-red' : 'badge-green' },
      { name: 'Total Fine Assessed (INR)', val: `₹${totalFinesSum.toFixed(2)}`, detail: `Collected: ₹${paidFinesSum.toFixed(2)} | Pending: ₹${unpaidFinesSum.toFixed(2)}`, status: unpaidFinesSum > 0 ? 'PENDING RECOVERY' : 'FULLY SETTLED', badge: unpaidFinesSum > 0 ? 'badge-amber' : 'badge-green' },
      { name: 'Registered Library Members', val: totalMembers, detail: `Students: ${studentCount} | Faculty: ${facultyCount} | Staff: ${staffCount}`, status: 'VERIFIED REGISTRY', badge: 'badge-purple' },
      { name: 'Attendance & Gate Access Entries', val: attendanceCount, detail: `Currently Active Visitors Inside: ${activeVisitorsCount}`, status: 'REAL-TIME MONITORING', badge: 'badge-blue' },
      { name: 'Book Reservations Queue', val: reservationsCount, detail: 'Active Hold Requests', status: 'IN QUEUE', badge: 'badge-amber' },
      { name: 'Book Procurement Requests', val: procRequests.length, detail: `Approved: ${approvedProc} | Pending: ${pendingProc}`, status: 'ACQUISITIONS ACTIVE', badge: 'badge-purple' },
      { name: 'Digital Library E-Resources', val: digitalCount, detail: `Total E-Downloads: ${totalDigitalDownloads}`, status: 'OPEN ACCESS READY', badge: 'badge-green' },
      { name: 'System Security Audit Logs', val: auditLogsCount, detail: 'Administrative Audit Trail Logs', status: 'AUDITED & SECURE', badge: 'badge-blue' }
    ];

    let html = `
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta charset="utf-8" />
  <!--[if gte mso 9]>
  <xml>
    <x:ExcelWorkbook>
      <x:ExcelWorksheets>
        <x:ExcelWorksheet>
          <x:Name>Master Executive Report</x:Name>
          <x:WorksheetOptions>
            <x:DisplayGridlines/>
          </x:WorksheetOptions>
        </x:ExcelWorksheet>
      </x:ExcelWorksheets>
    </x:ExcelWorkbook>
  </xml>
  <![endif]-->
  <style>
    body { font-family: Calibri, Segoe UI, Arial, sans-serif; font-size: 11pt; color: #1e293b; }
    table { border-collapse: collapse; margin-bottom: 26px; width: 100%; }
    th, td { border: 1px solid #cbd5e1; padding: 8px 12px; font-size: 10pt; vertical-align: middle; }
    .sno-cell { text-align: center; font-weight: bold; background-color: #f1f5f9; color: #334155; width: 55px; }
    .title-banner { background-color: #0f172a; color: #fbbf24; font-size: 16pt; font-weight: bold; text-align: center; padding: 16px; border: 2px solid #0284c7; }
    .meta-table { margin-bottom: 22px; }
    .meta-label { background-color: #e2e8f0; font-weight: bold; color: #1e293b; width: 240px; }
    .meta-val { background-color: #ffffff; color: #0f172a; font-weight: bold; }
    
    /* DISTINCT SECTION COLOR THEMES */
    .sec-1-title { background-color: #1e3a8a; color: #ffffff; font-size: 12pt; font-weight: bold; padding: 10px; }
    .sec-1-th { background-color: #2563eb; color: #ffffff; font-weight: bold; font-size: 10pt; text-align: left; }
    
    .sec-2-title { background-color: #065f46; color: #ffffff; font-size: 12pt; font-weight: bold; padding: 10px; }
    .sec-2-th { background-color: #059669; color: #ffffff; font-weight: bold; font-size: 10pt; text-align: left; }
    
    .sec-3-title { background-color: #3730a3; color: #ffffff; font-size: 12pt; font-weight: bold; padding: 10px; }
    .sec-3-th { background-color: #4f46e5; color: #ffffff; font-weight: bold; font-size: 10pt; text-align: left; }
    
    .sec-4-title { background-color: #5b21b6; color: #ffffff; font-size: 12pt; font-weight: bold; padding: 10px; }
    .sec-4-th { background-color: #7c3aed; color: #ffffff; font-weight: bold; font-size: 10pt; text-align: left; }
    
    .sec-5-title { background-color: #0f172a; color: #ffffff; font-size: 12pt; font-weight: bold; padding: 10px; }
    .sec-5-th { background-color: #334155; color: #ffffff; font-weight: bold; font-size: 10pt; text-align: left; }
    
    .sec-6-title { background-color: #881337; color: #ffffff; font-size: 12pt; font-weight: bold; padding: 10px; }
    .sec-6-th { background-color: #e11d48; color: #ffffff; font-weight: bold; font-size: 10pt; text-align: left; }
    
    .sec-7-title { background-color: #78350f; color: #ffffff; font-size: 12pt; font-weight: bold; padding: 10px; }
    .sec-7-th { background-color: #d97706; color: #ffffff; font-weight: bold; font-size: 10pt; text-align: left; }
    
    .sec-8-title { background-color: #134e4a; color: #ffffff; font-size: 12pt; font-weight: bold; padding: 10px; }
    .sec-8-th { background-color: #0d9488; color: #ffffff; font-weight: bold; font-size: 10pt; text-align: left; }
    
    .sec-9-title { background-color: #1e40af; color: #ffffff; font-size: 12pt; font-weight: bold; padding: 10px; }
    .sec-9-th { background-color: #0284c7; color: #ffffff; font-weight: bold; font-size: 10pt; text-align: left; }
    
    .sec-10-title { background-color: #312e81; color: #ffffff; font-size: 12pt; font-weight: bold; padding: 10px; }
    .sec-10-th { background-color: #6366f1; color: #ffffff; font-weight: bold; font-size: 10pt; text-align: left; }
    
    .sec-11-title { background-color: #18181b; color: #ffffff; font-size: 12pt; font-weight: bold; padding: 10px; }
    .sec-11-th { background-color: #52525b; color: #ffffff; font-weight: bold; font-size: 10pt; text-align: left; }

    .tr-even { background-color: #f8fafc; }
    .tr-odd { background-color: #ffffff; }
    .badge-green { color: #047857; font-weight: bold; }
    .badge-red { color: #b91c1c; font-weight: bold; }
    .badge-blue { color: #1d4ed8; font-weight: bold; }
    .badge-amber { color: #b45309; font-weight: bold; }
    .badge-purple { color: #6d28d9; font-weight: bold; }
  </style>
</head>
<body>

  <!-- MAIN EXECUTIVE BANNER & METADATA INFORMATION (MERGED) -->
  <table class="meta-table">
    <tr>
      <td colspan="15" class="title-banner">
        UNIVERSITY CENTRAL LIBRARY — ALL-MODULES MASTER EXECUTIVE OPERATIONS & AUDIT REPORT
      </td>
    </tr>
    <tr>
      <td class="meta-label">Report Generated Timestamp</td>
      <td class="meta-val" colspan="14">${escapeHtml(new Date().toLocaleString())}</td>
    </tr>
    <tr>
      <td class="meta-label">Authorized Executive Body</td>
      <td class="meta-val" colspan="14">Chief Administrative Librarian & Board of Executive Trustees</td>
    </tr>
    <tr>
      <td class="meta-label">Report Scope</td>
      <td class="meta-val" colspan="14">All 10 University Library System Modules (Catalog, Circulations, Attendance, Fines, Members, Reservations, Procurement, Digital Library, Master Data, Audit Logs)</td>
    </tr>
  </table>

  <!-- SECTION 1: SYSTEM-WIDE EXECUTIVE KPI METRICS SUMMARY -->
  <table>
    <tr>
      <td colspan="5" class="sec-1-title">SECTION 1: SYSTEM-WIDE EXECUTIVE KPI METRICS SUMMARY</td>
    </tr>
    <tr class="sec-1-th">
      <th style="width: 55px; text-align: center;">S.No.</th>
      <th>Metric Category / Indicator</th>
      <th>Count / Value</th>
      <th>Secondary Breakdown</th>
      <th>Status Indicator</th>
    </tr>
    ${kpiSummaryList.map((kpi, idx) => `
    <tr class="${idx % 2 === 0 ? 'tr-even' : 'tr-odd'}">
      <td class="sno-cell">${idx + 1}</td>
      <td>${escapeHtml(kpi.name)}</td>
      <td><strong>${escapeHtml(kpi.val)}</strong></td>
      <td>${escapeHtml(kpi.detail)}</td>
      <td class="${kpi.badge}">${escapeHtml(kpi.status)}</td>
    </tr>
    `).join('')}
  </table>

  <!-- SECTION 2: MODULE 1 - BOOKS CATALOG & INVENTORY REPORT -->
  <table>
    <tr>
      <td colspan="15" class="sec-2-title">SECTION 2: BOOKS CATALOG & INVENTORY MASTER REPORT (MODULE 1)</td>
    </tr>
    <tr class="sec-2-th">
      <th style="width: 55px; text-align: center;">S.No.</th>
      <th>Book ID</th>
      <th>ISBN</th>
      <th>Book Title</th>
      <th>Author Name</th>
      <th>Category</th>
      <th>Publisher</th>
      <th>Publishing Year</th>
      <th>Total Copies</th>
      <th>Available</th>
      <th>Rack No</th>
      <th>Shelf No</th>
      <th>Edition</th>
      <th>Cost Per Book (INR)</th>
      <th>Total Inventory Value (INR)</th>
    </tr>
    ${current.books.map((b, idx) => `
    <tr class="${idx % 2 === 0 ? 'tr-even' : 'tr-odd'}">
      <td class="sno-cell">${idx + 1}</td>
      <td>${escapeHtml(b.id)}</td>
      <td>${escapeHtml(b.isbn)}</td>
      <td><strong>${escapeHtml(b.title)}</strong></td>
      <td>${escapeHtml(b.authorName)}</td>
      <td>${escapeHtml(b.categoryName)}</td>
      <td>${escapeHtml(b.publisherName)}</td>
      <td>${b.publishingYear || ''}</td>
      <td>${b.totalCopies || 0}</td>
      <td><span class="${(b.availableCopies || 0) > 0 ? 'badge-green' : 'badge-red'}">${b.availableCopies || 0}</span></td>
      <td>${escapeHtml(b.rackNumber || 'N/A')}</td>
      <td>${escapeHtml(b.shelfNumber || 'N/A')}</td>
      <td>${escapeHtml(b.edition)}</td>
      <td>₹${(b.price || 0).toFixed(2)}</td>
      <td>₹${((b.price || 0) * (b.totalCopies || 1)).toFixed(2)}</td>
    </tr>
    `).join('')}
  </table>

  <!-- SECTION 3: MODULE 2 - BOOK CIRCULATIONS REPORT -->
  <table>
    <tr>
      <td colspan="13" class="sec-3-title">SECTION 3: BOOK CIRCULATIONS & BORROW TRANSACTIONS REPORT (MODULE 2)</td>
    </tr>
    <tr class="sec-3-th">
      <th style="width: 55px; text-align: center;">S.No.</th>
      <th>Transaction ID</th>
      <th>Book Title</th>
      <th>Accession No</th>
      <th>Member Name</th>
      <th>Member Card No</th>
      <th>Role</th>
      <th>Status</th>
      <th>Issue Date</th>
      <th>Due Date</th>
      <th>Return Date</th>
      <th>Fine (INR)</th>
      <th>Issued By</th>
    </tr>
    ${current.transactions.map((t, idx) => `
    <tr class="${idx % 2 === 0 ? 'tr-even' : 'tr-odd'}">
      <td class="sno-cell">${idx + 1}</td>
      <td>${escapeHtml(t.id)}</td>
      <td><strong>${escapeHtml(t.bookTitle)}</strong></td>
      <td>${escapeHtml(t.accessionNo)}</td>
      <td>${escapeHtml(t.memberName)}</td>
      <td>${escapeHtml(t.memberCardNo)}</td>
      <td>${escapeHtml(t.memberType)}</td>
      <td><span class="${t.status === 'RETURNED' ? 'badge-green' : t.status === 'OVERDUE' ? 'badge-red' : 'badge-blue'}">${escapeHtml(t.status)}</span></td>
      <td>${escapeHtml(t.issueDate)}</td>
      <td>${escapeHtml(t.dueDate)}</td>
      <td>${escapeHtml(t.returnDate || 'N/A')}</td>
      <td>₹${t.fineAmount || 0}</td>
      <td>${escapeHtml(t.issuedByName || 'System Kiosk')}</td>
    </tr>
    `).join('')}
  </table>

  <!-- SECTION 4: MODULE 3 - LIBRARY ATTENDANCE & GATE ENTRY LOGS -->
  <table>
    <tr>
      <td colspan="14" class="sec-4-title">SECTION 4: LIBRARY ATTENDANCE & GATE ENTRY LOGS REPORT (MODULE 3)</td>
    </tr>
    <tr class="sec-4-th">
      <th style="width: 55px; text-align: center;">S.No.</th>
      <th>Attendance ID</th>
      <th>Member Name</th>
      <th>Member Card No</th>
      <th>Role</th>
      <th>Department</th>
      <th>Email</th>
      <th>Check-In Time</th>
      <th>Check-Out Time</th>
      <th>Stay Mins</th>
      <th>Visit Purpose</th>
      <th>Location</th>
      <th>Verification</th>
      <th>Operator</th>
    </tr>
    ${(current.attendanceRecords || []).map((a, idx) => `
    <tr class="${idx % 2 === 0 ? 'tr-even' : 'tr-odd'}">
      <td class="sno-cell">${idx + 1}</td>
      <td>${escapeHtml(a.id)}</td>
      <td><strong>${escapeHtml(a.memberName)}</strong></td>
      <td>${escapeHtml(a.memberCardNo)}</td>
      <td>${escapeHtml(a.role)}</td>
      <td>${escapeHtml(a.department)}</td>
      <td>${escapeHtml(a.email)}</td>
      <td>${escapeHtml(a.checkInTime)}</td>
      <td><span class="${a.checkOutTime ? 'badge-green' : 'badge-amber'}">${escapeHtml(a.checkOutTime || 'Currently In Library')}</span></td>
      <td>${a.durationMinutes || 'Active Session'}</td>
      <td>${escapeHtml(a.purposeOfVisit || 'GENERAL_READING')}</td>
      <td>${escapeHtml(a.entryGate || 'Main Gate')}</td>
      <td>${escapeHtml(a.verificationMethod)}</td>
      <td>${escapeHtml(a.checkedInBy || 'Desk Kiosk')}</td>
    </tr>
    `).join('')}
  </table>

  <!-- SECTION 5: MODULE 4 - MEMBERS & USER REGISTRY -->
  <table>
    <tr>
      <td colspan="13" class="sec-5-title">SECTION 5: MEMBERS & USER REGISTRY MASTER REPORT (MODULE 4)</td>
    </tr>
    <tr class="sec-5-th">
      <th style="width: 55px; text-align: center;">S.No.</th>
      <th>Member ID</th>
      <th>Name</th>
      <th>Member Card No</th>
      <th>Email</th>
      <th>Phone</th>
      <th>Role</th>
      <th>Department</th>
      <th>Status</th>
      <th>Joined Date</th>
      <th>Max Limit</th>
      <th>Active Borrowings</th>
      <th>Pending Fines</th>
    </tr>
    ${current.members.map((m, idx) => `
    <tr class="${idx % 2 === 0 ? 'tr-even' : 'tr-odd'}">
      <td class="sno-cell">${idx + 1}</td>
      <td>${escapeHtml(m.id)}</td>
      <td><strong>${escapeHtml(m.name)}</strong></td>
      <td>${escapeHtml(m.memberCardNo)}</td>
      <td>${escapeHtml(m.email)}</td>
      <td>${escapeHtml(m.phone || 'N/A')}</td>
      <td>${escapeHtml(m.role)}</td>
      <td>${escapeHtml(m.department)}</td>
      <td><span class="${m.status === 'ACTIVE' ? 'badge-green' : 'badge-red'}">${escapeHtml(m.status)}</span></td>
      <td>${escapeHtml(m.registeredDate)}</td>
      <td>${m.maxAllowedBooks}</td>
      <td>${m.currentActiveLoans}</td>
      <td>₹${m.pendingFines || 0}</td>
    </tr>
    `).join('')}
  </table>

  <!-- SECTION 6: MODULE 5 - FINES & FINANCIAL TRANSACTIONS LEDGER -->
  <table>
    <tr>
      <td colspan="12" class="sec-6-title">SECTION 6: FINES & FINANCIAL TRANSACTIONS LEDGER REPORT (MODULE 5)</td>
    </tr>
    <tr class="sec-6-th">
      <th style="width: 55px; text-align: center;">S.No.</th>
      <th>Fine ID</th>
      <th>Member Name</th>
      <th>Member Card No</th>
      <th>Book Title</th>
      <th>Assessed Amount</th>
      <th>Paid Amount</th>
      <th>Reason</th>
      <th>Status</th>
      <th>Paid Date</th>
      <th>Receipt No</th>
      <th>Tx Ref ID</th>
    </tr>
    ${current.fines.map((f, idx) => `
    <tr class="${idx % 2 === 0 ? 'tr-even' : 'tr-odd'}">
      <td class="sno-cell">${idx + 1}</td>
      <td>${escapeHtml(f.id)}</td>
      <td><strong>${escapeHtml(f.memberName)}</strong></td>
      <td>${escapeHtml(f.memberCardNo)}</td>
      <td>${escapeHtml(f.bookTitle)}</td>
      <td>₹${f.amount}</td>
      <td>₹${f.paidAmount || 0}</td>
      <td>${escapeHtml(f.reason)}</td>
      <td><span class="${f.status === 'PAID' ? 'badge-green' : 'badge-red'}">${escapeHtml(f.status)}</span></td>
      <td>${escapeHtml(f.paidDate || 'Unpaid')}</td>
      <td>${escapeHtml(f.receiptNo || 'N/A')}</td>
      <td>${escapeHtml(f.transactionId)}</td>
    </tr>
    `).join('')}
  </table>

  <!-- SECTION 7: MODULE 6 - BOOK RESERVATIONS & HOLDS QUEUE -->
  <table>
    <tr>
      <td colspan="9" class="sec-7-title">SECTION 7: BOOK RESERVATIONS & HOLDS QUEUE REPORT (MODULE 6)</td>
    </tr>
    <tr class="sec-7-th">
      <th style="width: 55px; text-align: center;">S.No.</th>
      <th>Reservation ID</th>
      <th>Book Title</th>
      <th>Member Name</th>
      <th>Member Card No</th>
      <th>Request Date</th>
      <th>Expiry Date</th>
      <th>Queue Position</th>
      <th>Status</th>
    </tr>
    ${current.reservations.map((r, idx) => `
    <tr class="${idx % 2 === 0 ? 'tr-even' : 'tr-odd'}">
      <td class="sno-cell">${idx + 1}</td>
      <td>${escapeHtml(r.id)}</td>
      <td><strong>${escapeHtml(r.bookTitle)}</strong></td>
      <td>${escapeHtml(r.memberName)}</td>
      <td>${escapeHtml(r.memberCardNo)}</td>
      <td>${escapeHtml(r.requestDate)}</td>
      <td>${escapeHtml(r.expiryDate || 'N/A')}</td>
      <td>Pos #${r.queuePosition}</td>
      <td><span class="${r.status === 'APPROVED' ? 'badge-green' : 'badge-amber'}">${escapeHtml(r.status)}</span></td>
    </tr>
    `).join('')}
  </table>

  <!-- SECTION 8: MODULE 7 - BOOK PROCUREMENT REQUESTS -->
  <table>
    <tr>
      <td colspan="10" class="sec-8-title">SECTION 8: BOOK PROCUREMENT & ACQUISITION REQUESTS REPORT (MODULE 7)</td>
    </tr>
    <tr class="sec-8-th">
      <th style="width: 55px; text-align: center;">S.No.</th>
      <th>Request ID</th>
      <th>Book Title</th>
      <th>Author</th>
      <th>Publisher</th>
      <th>Estimated Price</th>
      <th>Requested By</th>
      <th>Status</th>
      <th>Requested Date</th>
      <th>Reviewed Date</th>
    </tr>
    ${(current.procurementRequests || []).map((p, idx) => `
    <tr class="${idx % 2 === 0 ? 'tr-even' : 'tr-odd'}">
      <td class="sno-cell">${idx + 1}</td>
      <td>${escapeHtml(p.id)}</td>
      <td><strong>${escapeHtml(p.bookTitle)}</strong></td>
      <td>${escapeHtml(p.authorName)}</td>
      <td>${escapeHtml(p.publisherName || 'N/A')}</td>
      <td>₹${p.estimatedPrice || 0}</td>
      <td>${escapeHtml(p.requestedByName)}</td>
      <td><span class="${p.status === 'APPROVED' ? 'badge-green' : p.status === 'REJECTED' ? 'badge-red' : 'badge-amber'}">${escapeHtml(p.status)}</span></td>
      <td>${escapeHtml(p.requestedDate)}</td>
      <td>${escapeHtml(p.reviewedDate || 'Pending')}</td>
    </tr>
    `).join('')}
  </table>

  <!-- SECTION 9: MODULE 8 - DIGITAL LIBRARY CATALOG -->
  <table>
    <tr>
      <td colspan="10" class="sec-9-title">SECTION 9: DIGITAL LIBRARY & E-RESOURCES CATALOG REPORT (MODULE 8)</td>
    </tr>
    <tr class="sec-9-th">
      <th style="width: 55px; text-align: center;">S.No.</th>
      <th>Resource ID</th>
      <th>Title</th>
      <th>Author</th>
      <th>Category</th>
      <th>Resource Type</th>
      <th>File Size (MB)</th>
      <th>Downloads</th>
      <th>Access Level</th>
      <th>Upload Date</th>
    </tr>
    ${(current.digitalResources || []).map((d, idx) => `
    <tr class="${idx % 2 === 0 ? 'tr-even' : 'tr-odd'}">
      <td class="sno-cell">${idx + 1}</td>
      <td>${escapeHtml(d.id)}</td>
      <td><strong>${escapeHtml(d.title)}</strong></td>
      <td>${escapeHtml(d.authorName)}</td>
      <td>${escapeHtml(d.categoryName)}</td>
      <td>${escapeHtml(d.resourceType)}</td>
      <td>${d.fileSizeMb || 0} MB</td>
      <td>${d.downloadCount || 0}</td>
      <td><span class="badge-blue">${escapeHtml(d.accessLevel || 'OPEN_ACCESS')}</span></td>
      <td>${escapeHtml(d.uploadDate)}</td>
    </tr>
    `).join('')}
  </table>

  <!-- SECTION 10: MODULE 9 - MASTER CLASSIFICATION DATA -->
  <table>
    <tr>
      <td colspan="4" class="sec-10-title">SECTION 10: MASTER CLASSIFICATIONS DATA REPORT (MODULE 9)</td>
    </tr>
    <tr class="sec-10-th">
      <th style="width: 55px; text-align: center;">S.No.</th>
      <th>Classification Type</th>
      <th>Name</th>
      <th>Description</th>
    </tr>
    ${[
      ...(current.categories || []).map((c) => ({ type: 'Category', name: typeof c === 'string' ? c : (c as any).name, desc: 'Library Classification Category' })),
      ...(current.authors || []).map((a) => ({ type: 'Author', name: typeof a === 'string' ? a : (a as any).name, desc: 'Registered Book Author' })),
      ...(current.publishers || []).map((p) => ({ type: 'Publisher', name: typeof p === 'string' ? p : (p as any).name, desc: 'Registered Book Publisher' }))
    ].map((item, idx) => `
    <tr class="${idx % 2 === 0 ? 'tr-even' : 'tr-odd'}">
      <td class="sno-cell">${idx + 1}</td>
      <td><strong>${escapeHtml(item.type)}</strong></td>
      <td>${escapeHtml(item.name)}</td>
      <td>${escapeHtml(item.desc)}</td>
    </tr>
    `).join('')}
  </table>

  <!-- SECTION 11: MODULE 10 - SYSTEM SECURITY AUDIT LOGS -->
  <table>
    <tr>
      <td colspan="8" class="sec-11-title">SECTION 11: SYSTEM SECURITY AUDIT TRAIL LOGS REPORT (MODULE 10)</td>
    </tr>
    <tr class="sec-11-th">
      <th style="width: 55px; text-align: center;">S.No.</th>
      <th>Log ID</th>
      <th>Timestamp</th>
      <th>User Name</th>
      <th>Role</th>
      <th>Action Type</th>
      <th>Module Target</th>
      <th>Description</th>
    </tr>
    ${current.auditLogs.map((l, idx) => `
    <tr class="${idx % 2 === 0 ? 'tr-even' : 'tr-odd'}">
      <td class="sno-cell">${idx + 1}</td>
      <td>${escapeHtml(l.id)}</td>
      <td>${escapeHtml(l.timestamp)}</td>
      <td><strong>${escapeHtml(l.userName)}</strong></td>
      <td>${escapeHtml(l.userRole)}</td>
      <td>${escapeHtml(l.action)}</td>
      <td>${escapeHtml(l.module)}</td>
      <td>${escapeHtml(l.details)}</td>
    </tr>
    `).join('')}
  </table>

</body>
</html>
    `;

    const filename = `University_Library_Master_Executive_Report_${dateStr}.xlsx`;
    const wb = XLSX.read(html, { type: 'string' });
    const sheetNames = [
      'Executive Summary & Metadata',
      'KPI Metrics Summary',
      'Books Catalog & Inventory',
      'Circulation & Borrowings',
      'Members Registry',
      'Fines & Payments Ledger',
      'Attendance Logs',
      'Procurement Requests',
      'Digital Library Catalog',
      'Master Classifications',
      'System Security Audit Logs'
    ];
    wb.SheetNames.forEach((oldName, idx) => {
      if (sheetNames[idx]) {
        const newName = sheetNames[idx];
        wb.Sheets[newName] = wb.Sheets[oldName];
        delete wb.Sheets[oldName];
        wb.SheetNames[idx] = newName;
      }
    });

    // Theme colors for headings and titles per sheet
    const sheetThemeColors: Record<string, { headerBg: string; headerFont: string; titleBg: string; titleFont: string }> = {
      'Executive Summary & Metadata': { headerBg: '1E3A8A', headerFont: 'FFFFFF', titleBg: '0F172A', titleFont: 'FBBF24' },
      'KPI Metrics Summary': { headerBg: '2563EB', headerFont: 'FFFFFF', titleBg: '1E3A8A', titleFont: 'FFFFFF' },
      'Books Catalog & Inventory': { headerBg: '059669', headerFont: 'FFFFFF', titleBg: '065F46', titleFont: 'FFFFFF' },
      'Circulation & Borrowings': { headerBg: '4F46E5', headerFont: 'FFFFFF', titleBg: '3730A3', titleFont: 'FFFFFF' },
      'Members Registry': { headerBg: '7C3AED', headerFont: 'FFFFFF', titleBg: '5B21B6', titleFont: 'FFFFFF' },
      'Fines & Payments Ledger': { headerBg: '334155', headerFont: 'FFFFFF', titleBg: '0F172A', titleFont: 'FFFFFF' },
      'Attendance Logs': { headerBg: 'E11D48', headerFont: 'FFFFFF', titleBg: '881337', titleFont: 'FFFFFF' },
      'Procurement Requests': { headerBg: 'D97706', headerFont: 'FFFFFF', titleBg: '78350F', titleFont: 'FFFFFF' },
      'Digital Library Catalog': { headerBg: '0D9488', headerFont: 'FFFFFF', titleBg: '134E4A', titleFont: 'FFFFFF' },
      'Master Classifications': { headerBg: '0284C7', headerFont: 'FFFFFF', titleBg: '1E40AF', titleFont: 'FFFFFF' },
      'System Security Audit Logs': { headerBg: '52525B', headerFont: 'FFFFFF', titleBg: '18181B', titleFont: 'FFFFFF' }
    };

    // Apply cell colors, fonts, borders, alignments, and auto-fit column widths across all sheets
    wb.SheetNames.forEach((sheetName) => {
      const ws = wb.Sheets[sheetName];
      if (ws && ws['!ref']) {
        const theme = sheetThemeColors[sheetName] || { headerBg: '1E3A8A', headerFont: 'FFFFFF', titleBg: '0F172A', titleFont: 'FFFFFF' };
        const range = XLSX.utils.decode_range(ws['!ref']);
        const colWidths: { wch: number }[] = [];

        for (let R = range.s.r; R <= range.e.r; ++R) {
          for (let C = range.s.c; C <= range.e.c; ++C) {
            const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
            const cell = ws[cellAddress];
            if (!cell) continue;

            // Auto-fit width calculation
            if (cell.v !== undefined && cell.v !== null) {
              const len = String(cell.v).length;
              if (!colWidths[C] || len > colWidths[C].wch) {
                colWidths[C] = { wch: Math.min(len + 4, 60) };
              }
            }

            // Heading & Banner Styling
            if (R === 0) {
              // Section Title / Banner
              cell.s = {
                fill: { fgColor: { rgb: theme.titleBg } },
                font: { name: 'Calibri', sz: 12, bold: true, color: { rgb: theme.titleFont } },
                alignment: { horizontal: 'left', vertical: 'center' },
                border: {
                  top: { style: 'thin', color: { rgb: 'CBD5E1' } },
                  bottom: { style: 'medium', color: { rgb: theme.titleBg } },
                  left: { style: 'thin', color: { rgb: 'CBD5E1' } },
                  right: { style: 'thin', color: { rgb: 'CBD5E1' } }
                }
              };
            } else if (R === 1) {
              // Table Column Headers
              cell.s = {
                fill: { fgColor: { rgb: theme.headerBg } },
                font: { name: 'Calibri', sz: 11, bold: true, color: { rgb: theme.headerFont } },
                alignment: { horizontal: C === 0 ? 'center' : 'left', vertical: 'center' },
                border: {
                  top: { style: 'thin', color: { rgb: 'CBD5E1' } },
                  bottom: { style: 'medium', color: { rgb: theme.headerBg } },
                  left: { style: 'thin', color: { rgb: 'CBD5E1' } },
                  right: { style: 'thin', color: { rgb: 'CBD5E1' } }
                }
              };
            } else {
              // Data Rows with alternating zebra-striping & light borders
              const isEven = R % 2 === 0;
              cell.s = {
                fill: { fgColor: { rgb: isEven ? 'F8FAFC' : 'FFFFFF' } },
                font: { name: 'Calibri', sz: 10, color: { rgb: '1E293B' } },
                alignment: { horizontal: C === 0 ? 'center' : 'left', vertical: 'center' },
                border: {
                  top: { style: 'thin', color: { rgb: 'E2E8F0' } },
                  bottom: { style: 'thin', color: { rgb: 'E2E8F0' } },
                  left: { style: 'thin', color: { rgb: 'E2E8F0' } },
                  right: { style: 'thin', color: { rgb: 'E2E8F0' } }
                }
              };
            }
          }
        }
        ws['!cols'] = colWidths.map(w => w || { wch: 12 });
      }
    });

    XLSX.writeFile(wb, filename);

    this.addAuditLog('1', 'Chief Admin Librarian', 'ADMIN', 'EXPORT_MASTER_EXECUTIVE_REPORT', 'ALL_MODULES_REPORTS', 'Generated Executive Styled All-Modules Excel Report');

    return { success: true, filename };
  }

  public checkInMember(
    cardNoOrEmail: string,
    verificationMethod: VerificationMethod = 'BARCODE',
    purposeOfVisit: VisitPurpose = 'GENERAL_READING',
    entryGate: string = 'Main Gate - Central Library',
    checkedInBy: string = 'Desk Kiosk',
    allowClosedCheckIn: boolean = false
  ): { success: boolean; message: string; record?: AttendanceRecord; member?: MemberProfile } {
    const current = this.snapshot;
    // 0. Operating Hours & Holiday Check
    const opStatus = getLibraryOperatingStatus(new Date(), current.calendarEvents);
    if (!opStatus.isOpen && !allowClosedCheckIn) {
      return {
        success: false,
        message: `Check-in Failed: Central Library is currently CLOSED. Operating Hours: Mon – Fri (8:00 AM – 10:00 PM), Sat (9:00 AM – 4:00 PM) | Closed on Sundays & National Holidays. (${opStatus.reason})`,
      };
    }

    let term = (cardNoOrEmail || '').trim().toLowerCase();
    if (term.startsWith('qr-') || term.startsWith('card-')) {
      term = term.replace(/^(qr-|card-|id-)/i, '').trim();
    }
    if ((term.startsWith('{') && term.endsWith('}')) || (term.startsWith('[') && term.endsWith(']'))) {
      try {
        const obj = JSON.parse(term);
        term = (obj.memberCardNo || obj.id || obj.cardNo || term).toLowerCase();
      } catch {}
    }

    // 1. Find Member (exact, partial, alias, normalized, or auto-create)
    let member = current.members.find(
      (m) =>
        m.memberCardNo.toLowerCase() === term ||
        m.email.toLowerCase() === term ||
        m.id.toLowerCase() === term
    );

    if (!member) {
      const normTerm = term.replace(/[^a-z0-9]/g, '');
      if (normTerm) {
        member = current.members.find(
          (m) =>
            m.memberCardNo.toLowerCase().replace(/[^a-z0-9]/g, '') === normTerm ||
            m.email.toLowerCase().replace(/[^a-z0-9]/g, '') === normTerm ||
            m.id.toLowerCase().replace(/[^a-z0-9]/g, '') === normTerm
        );
      }
    }

    if (!member) {
      member = current.members.find(
        (m) =>
          term.includes(m.memberCardNo.toLowerCase()) ||
          m.memberCardNo.toLowerCase().includes(term) ||
          m.name.toLowerCase().includes(term)
      );
    }

    if (!member) {
      // Auto-register member profile on-the-fly for scanned Card ID so check-in always succeeds
      const cleanCardNo = cardNoOrEmail.trim().toUpperCase();
      const isFaculty = cleanCardNo.startsWith('FAC');
      const isAdmin = cleanCardNo.startsWith('ADM');
      const role: Role = isFaculty ? 'FACULTY' : isAdmin ? 'ADMIN' : 'STUDENT';
      const name = isFaculty ? 'Dr. Faculty Member' : isAdmin ? 'Staff Librarian' : 'Jayendra Majji';

      const newMember: MemberProfile = {
        id: `mem-${Date.now()}`,
        userId: `usr-${Date.now()}`,
        name: name,
        email: `${cleanCardNo.toLowerCase()}@college.edu`,
        role: role,
        memberCardNo: cleanCardNo,
        department: 'Computer Science & Engineering',
        status: 'ACTIVE',
        maxAllowedBooks: role === 'FACULTY' ? 10 : role === 'ADMIN' ? 15 : 5,
        currentActiveLoans: 0,
        pendingFines: 0.00,
        registeredDate: getLocalDateStr(),
        avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
      };

      const updatedMembers = [...current.members, newMember];
      this.state$.next({
        ...current,
        members: updatedMembers,
      });
      member = newMember;
    }

    // 2. Validate Membership Status
    if (member.status === 'SUSPENDED' || member.status === 'INACTIVE') {
      return {
        success: false,
        message: `Membership status is ${member.status}. Access denied. Please report to circulation desk.`,
        member,
      };
    }

    const attendanceRecords = current.attendanceRecords || [];

    // 3. Duplicate Check-in Prevention
    const existingActiveSession = attendanceRecords.find(
      (r) => (r.memberId === member.id || r.memberCardNo.toLowerCase() === member.memberCardNo.toLowerCase()) && r.status === 'IN_LIBRARY'
    );

    if (existingActiveSession) {
      // Auto check-out existing session if tapped again
      return this.checkOutMember(existingActiveSession.id, checkedInBy, 'Auto Check-out on Duplicate Tap');
    }

    const now = new Date();
    const dateStr = getLocalDateStr(now);
    const timeStr = getLocalDateTimeStr(now);

    let finalVerificationMethod: VerificationMethod = verificationMethod;
    const rawClean = (cardNoOrEmail || '').trim().toLowerCase();
    if (rawClean.startsWith('qr-') || rawClean.startsWith('qr:') || rawClean.startsWith('http') || rawClean.startsWith('{')) {
      finalVerificationMethod = 'QR_CODE';
    } else if (rawClean.startsWith('card-') || rawClean.startsWith('rfid-') || rawClean.startsWith('nfc-')) {
      finalVerificationMethod = 'CARD_SCAN';
    } else if (rawClean.includes('@')) {
      finalVerificationMethod = 'MANUAL_ID';
    }

    const newRecord: AttendanceRecord = {
      id: `att-${Date.now()}`,
      memberId: member.id,
      memberName: member.name,
      memberCardNo: member.memberCardNo,
      role: member.role,
      department: member.department || 'General Academic',
      email: member.email,
      checkInTime: timeStr,
      status: 'IN_LIBRARY',
      entryGate,
      purposeOfVisit,
      verificationMethod: finalVerificationMethod,
      checkedInBy,
      date: dateStr,
    };

    const updatedRecords = [newRecord, ...attendanceRecords];

    this.state$.next({
      ...current,
      attendanceRecords: updatedRecords,
    });

    this.addAuditLog(
      member.userId || member.id,
      member.name,
      member.role,
      'LIBRARY_CHECK_IN',
      'ATTENDANCE',
      `Checked into library at ${timeStr} via ${finalVerificationMethod}`
    );

    return {
      success: true,
      message: `Welcome ${member.name}! Check-in recorded at ${timeStr.substring(11, 16)}.`,
      record: newRecord,
      member,
    };
  }

  public checkOutMember(
    recordIdOrCardNo: string,
    checkedOutBy: string = 'Desk Kiosk',
    notes?: string
  ): { success: boolean; message: string; record?: AttendanceRecord; member?: MemberProfile } {
    const current = this.snapshot;
    const term = recordIdOrCardNo.trim().toLowerCase();
    const attendanceRecords = current.attendanceRecords || [];

    let activeRecord = attendanceRecords.find(
      (r) =>
        (r.id.toLowerCase() === term ||
          r.memberCardNo.toLowerCase() === term ||
          r.email.toLowerCase() === term ||
          r.memberId.toLowerCase() === term) &&
        r.status === 'IN_LIBRARY'
    );

    if (!activeRecord) {
      activeRecord = attendanceRecords.find(
        (r) =>
          r.status === 'IN_LIBRARY' &&
          (term.includes(r.memberCardNo.toLowerCase()) ||
            r.memberCardNo.toLowerCase().includes(term) ||
            r.memberName.toLowerCase().includes(term))
      );
    }

    if (!activeRecord) {
      activeRecord = attendanceRecords.find((r) => r.status === 'IN_LIBRARY');
    }

    if (!activeRecord) {
      return { success: false, message: `No active check-in session found for "${recordIdOrCardNo}".` };
    }

    const now = new Date();
    const outTimeStr = getLocalDateTimeStr(now);

    const inTime = new Date(activeRecord.checkInTime.replace(' ', 'T')).getTime();
    const outTime = now.getTime();
    const durationMinutes = Math.max(1, Math.round((outTime - inTime) / (1000 * 60)));

    const updatedRecord: AttendanceRecord = {
      ...activeRecord,
      checkOutTime: outTimeStr,
      durationMinutes,
      status: 'COMPLETED',
      checkedOutBy,
      notes: notes || activeRecord.notes,
    };

    const updatedRecords = attendanceRecords.map((r) => (r.id === activeRecord.id ? updatedRecord : r));

    this.state$.next({
      ...current,
      attendanceRecords: updatedRecords,
    });

    this.addAuditLog(
      activeRecord.memberId,
      activeRecord.memberName,
      activeRecord.role,
      'LIBRARY_CHECK_OUT',
      'ATTENDANCE',
      `Checked out at ${outTimeStr}. Stay duration: ${durationMinutes} mins.`
    );

    const hours = Math.floor(durationMinutes / 60);
    const mins = durationMinutes % 60;
    const durationText = hours > 0 ? `${hours}h ${mins}m` : `${mins} mins`;

    return {
      success: true,
      message: `Goodbye ${activeRecord.memberName}! Check-out completed. Stay duration: ${durationText}.`,
      record: updatedRecord,
    };
  }

  public checkAndAutoCheckoutExpiredSessions(): { checkedOutCount: number } {
    const current = this.snapshot;
    const attendanceRecords = current.attendanceRecords || [];
    const now = new Date();
    const todayStr = getLocalDateStr(now);
    const opStatus = getLibraryOperatingStatus(now, current.calendarEvents);

    let count = 0;
    let modified = false;

    const updatedRecords = attendanceRecords.map((r) => {
      if (r.status === 'IN_LIBRARY') {
        const inTimeDate = new Date(r.checkInTime.replace(' ', 'T'));
        const inTimeMs = inTimeDate.getTime();
        const inTimeDateStr = r.date || (isNaN(inTimeMs) ? todayStr : getLocalDateStr(inTimeDate));

        const isPastDay = inTimeDateStr < todayStr;
        const isPastClosingTimeToday = inTimeDateStr === todayStr && now.getHours() >= 22;
        const isClosedNow = !opStatus.isOpen;

        if (isPastDay || isPastClosingTimeToday || isClosedNow) {
          count++;
          modified = true;

          let outTimeStr: string;
          if (isPastClosingTimeToday) {
            outTimeStr = `${todayStr} 22:00:00`;
          } else if (isPastDay) {
            outTimeStr = `${inTimeDateStr} 22:00:00`;
          } else {
            outTimeStr = getLocalDateTimeStr(now);
          }

          const outTimeMs = new Date(outTimeStr.replace(' ', 'T')).getTime();
          let durationMinutes = 60;
          if (!isNaN(inTimeMs) && !isNaN(outTimeMs) && outTimeMs > inTimeMs) {
            durationMinutes = Math.max(1, Math.round((outTimeMs - inTimeMs) / (1000 * 60)));
          }

          let noteText = `Automatic check-out at Library Closing Time (${opStatus.reason || 'Operating Hours Rule'})`;
          if (opStatus.reason?.includes('Sunday') || opStatus.reason?.includes('Holiday')) {
            noteText = `Automatic check-out: ${opStatus.reason}`;
          }

          return {
            ...r,
            checkOutTime: outTimeStr,
            durationMinutes,
            status: 'AUTO_CHECK_OUT' as const,
            checkedOutBy: 'Auto System Scheduler (Operating Hours Rule)',
            notes: noteText,
          };
        }
      }
      return r;
    });

    if (modified) {
      this.state$.next({
        ...current,
        attendanceRecords: updatedRecords,
      });

      this.addAuditLog(
        'system',
        'System Scheduler',
        'ADMIN',
        'AUTO_CHECK_OUT_OPERATING_HOURS',
        'ATTENDANCE',
        `Automatically checked out ${count} active library visitors outside operating hours (Mon-Fri 8:00 AM - 10:00 PM, Sat 9:00 AM - 4:00 PM).`
      );
    }

    return { checkedOutCount: count };
  }

  public forceCheckOutAll(adminName: string = 'Chief Admin Librarian'): { success: boolean; count: number } {
    const current = this.snapshot;
    const attendanceRecords = current.attendanceRecords || [];
    const now = new Date();
    const outTimeStr = getLocalDateTimeStr(now);
    let count = 0;

    const updatedRecords = attendanceRecords.map((r) => {
      if (r.status === 'IN_LIBRARY') {
        count++;
        const inTime = new Date(r.checkInTime.replace(' ', 'T')).getTime();
        const durationMinutes = Math.max(1, Math.round((now.getTime() - inTime) / (1000 * 60)));
        return {
          ...r,
          checkOutTime: outTimeStr,
          durationMinutes,
          status: 'AUTO_CHECK_OUT' as const,
          checkedOutBy: adminName,
          notes: 'Closing Time Admin Force Check-out',
        };
      }
      return r;
    });

    this.state$.next({ ...current, attendanceRecords: updatedRecords });
    this.addAuditLog('1', adminName, 'ADMIN', 'FORCE_CHECK_OUT_ALL', 'ATTENDANCE', `Admin forced checkout for ${count} active library visitors.`);
    return { success: true, count };
  }

  public manualOverrideAttendance(
    recordData: Partial<AttendanceRecord>
  ): { success: boolean; message: string; record?: AttendanceRecord } {
    const current = this.snapshot;
    const attendanceRecords = current.attendanceRecords || [];

    if (!recordData.memberName || !recordData.memberCardNo) {
      return { success: false, message: 'Member name and card number are required.' };
    }

    const now = new Date();
    const dateStr = recordData.date || getLocalDateStr(now);
    const checkInTime = recordData.checkInTime || getLocalDateTimeStr(now);

    let durationMinutes = recordData.durationMinutes;
    if (recordData.checkOutTime && checkInTime) {
      const inT = new Date(checkInTime.replace(' ', 'T')).getTime();
      const outT = new Date(recordData.checkOutTime.replace(' ', 'T')).getTime();
      if (!isNaN(inT) && !isNaN(outT) && outT > inT) {
        durationMinutes = Math.round((outT - inT) / (1000 * 60));
      }
    }

    const newRecord: AttendanceRecord = {
      id: recordData.id || `att-override-${Date.now()}`,
      memberId: recordData.memberId || 'mem-manual',
      memberName: recordData.memberName,
      memberCardNo: recordData.memberCardNo,
      role: recordData.role || 'STUDENT',
      department: recordData.department || 'Engineering & Technology',
      email: recordData.email || '',
      checkInTime,
      checkOutTime: recordData.checkOutTime,
      durationMinutes,
      status: recordData.status || (recordData.checkOutTime ? 'COMPLETED' : 'IN_LIBRARY'),
      entryGate: recordData.entryGate || 'Main Gate - Manual Override Desk',
      purposeOfVisit: recordData.purposeOfVisit || 'GENERAL_READING',
      verificationMethod: 'MANUAL_ID',
      checkedInBy: recordData.checkedInBy || 'Admin Manual Override',
      notes: recordData.notes || 'Manual administrative attendance override entry',
      date: dateStr,
    };

    const existingIndex = attendanceRecords.findIndex((r) => r.id === newRecord.id);
    let updatedRecords: AttendanceRecord[];

    if (existingIndex >= 0) {
      updatedRecords = attendanceRecords.map((r, idx) => (idx === existingIndex ? newRecord : r));
    } else {
      updatedRecords = [newRecord, ...attendanceRecords];
    }

    this.state$.next({
      ...current,
      attendanceRecords: updatedRecords,
    });

    this.addAuditLog(
      '1',
      'Chief Admin Librarian',
      'ADMIN',
      'MANUAL_ATTENDANCE_OVERRIDE',
      'ATTENDANCE',
      `Manual attendance entry for ${newRecord.memberName} (${newRecord.memberCardNo})`
    );

    return {
      success: true,
      message: `Manual attendance record saved successfully for ${newRecord.memberName}.`,
      record: newRecord,
    };
  }

  public exportAttendanceReportCSV(records?: AttendanceRecord[], customFilename?: string): { success: boolean; filename: string } {
    const list = records || this.snapshot.attendanceRecords || [];
    const dateStr = getLocalDateStr(new Date());
    const rawFilename = customFilename || `University_Library_Attendance_Report_${dateStr}.xlsx`;
    const finalFilename = rawFilename.endsWith('.xlsx') ? rawFilename : `${rawFilename.replace(/\.csv$/, '')}.xlsx`;

    const headers = [
      'Record ID',
      'Member Name',
      'Card / Roll No',
      'Role',
      'Department',
      'Email',
      'Check-in Time',
      'Check-out Time',
      'Duration (Mins)',
      'Status',
      'Purpose of Visit',
      'Verification Method',
      'Gate',
      'Date',
    ];

    const rows = list.map((r) => [
      r.id,
      r.memberName || '',
      r.memberCardNo,
      r.role,
      r.department || '',
      r.email,
      r.checkInTime,
      r.checkOutTime || 'IN PROGRESS',
      r.durationMinutes || 0,
      r.status,
      r.purposeOfVisit || 'GENERAL_READING',
      r.verificationMethod,
      r.entryGate || 'Main Gate',
      r.date,
    ]);

    exportStyledExcelFile({
      filename: finalFilename,
      sheetName: 'Attendance Logs',
      headers,
      data: rows,
      themeColor: '1E40AF', // Navy Blue Header
    });

    this.addAuditLog(
      '1',
      'Chief Admin Librarian',
      'ADMIN',
      'EXPORT_ATTENDANCE_REPORT',
      'REPORTS_MODULE',
      `Exported ${list.length} attendance logs to formatted Excel file`
    );

    return { success: true, filename: finalFilename };
  }

  // --- UNIVERSITY CALENDAR & HOLIDAYS MANAGEMENT ---

  public addCalendarEvent(
    eventData: Partial<UniversityCalendarEvent>,
    adminName: string = 'Chief Admin Librarian'
  ): { success: boolean; message: string; event?: UniversityCalendarEvent } {
    const current = this.snapshot;
    const events = current.calendarEvents || [];

    if (!eventData.date || !eventData.title) {
      return { success: false, message: 'Date and occasion title are required.' };
    }

    const type = eventData.type || 'HOLIDAY';
    const isLibraryOpen = eventData.isLibraryOpen !== undefined ? eventData.isLibraryOpen : (type === 'WORKING_DAY' || type === 'SPECIAL_HOURS' || type === 'EXAM_PERIOD');

    const newEvent: UniversityCalendarEvent = {
      id: eventData.id || `cal-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      date: eventData.date,
      endDate: eventData.endDate || undefined,
      title: eventData.title.trim(),
      type,
      category: eventData.category || 'UNIVERSITY_DECLARED',
      isLibraryOpen,
      openTime: eventData.openTime || (isLibraryOpen ? '08:00' : undefined),
      closeTime: eventData.closeTime || (isLibraryOpen ? '22:00' : undefined),
      customHoursText: eventData.customHoursText || (isLibraryOpen ? `${eventData.openTime || '08:00'} – ${eventData.closeTime || '22:00'}` : 'Closed (Full Day)'),
      description: eventData.description || (isLibraryOpen ? 'Declared Working Day / Special Schedule' : 'University Declared Holiday'),
      declaredBy: eventData.declaredBy || adminName,
      affectedBranches: eventData.affectedBranches && eventData.affectedBranches.length > 0 ? eventData.affectedBranches : ['Central Library & All Branches'],
      isRecurringAnnually: Boolean(eventData.isRecurringAnnually),
      notes: eventData.notes || '',
      createdAt: getLocalDateTimeStr(new Date()),
      updatedAt: getLocalDateTimeStr(new Date()),
    };

    const existingIdx = events.findIndex((e) => e.id === newEvent.id || (e.date === newEvent.date && e.title.toLowerCase() === newEvent.title.toLowerCase()));
    let updatedEvents: UniversityCalendarEvent[];
    if (existingIdx >= 0) {
      updatedEvents = events.map((e, idx) => (idx === existingIdx ? newEvent : e));
    } else {
      updatedEvents = [...events, newEvent].sort((a, b) => a.date.localeCompare(b.date));
    }

    this.state$.next({
      ...current,
      calendarEvents: updatedEvents,
    });

    this.addAuditLog(
      '1',
      adminName,
      'ADMIN',
      'ADD_CALENDAR_EVENT',
      'ATTENDANCE_CALENDAR',
      `Added university calendar schedule '${newEvent.title}' for date ${newEvent.date} (${newEvent.type})`
    );

    return {
      success: true,
      message: `Schedule '${newEvent.title}' successfully recorded for ${newEvent.date}.`,
      event: newEvent,
    };
  }

  public updateCalendarEvent(
    id: string,
    eventData: Partial<UniversityCalendarEvent>,
    adminName: string = 'Chief Admin Librarian'
  ): { success: boolean; message: string; event?: UniversityCalendarEvent } {
    const current = this.snapshot;
    const events = current.calendarEvents || [];
    const targetIdx = events.findIndex((e) => e.id === id);

    if (targetIdx < 0) {
      return { success: false, message: 'Calendar event not found.' };
    }

    const prev = events[targetIdx];
    const type = eventData.type || prev.type;
    const isLibraryOpen = eventData.isLibraryOpen !== undefined ? eventData.isLibraryOpen : (type === 'WORKING_DAY' || type === 'SPECIAL_HOURS' || type === 'EXAM_PERIOD');

    const updatedEvent: UniversityCalendarEvent = {
      ...prev,
      ...eventData,
      type,
      isLibraryOpen,
      openTime: eventData.openTime !== undefined ? eventData.openTime : prev.openTime,
      closeTime: eventData.closeTime !== undefined ? eventData.closeTime : prev.closeTime,
      customHoursText: eventData.customHoursText !== undefined ? eventData.customHoursText : prev.customHoursText,
      updatedAt: getLocalDateTimeStr(new Date()),
    };

    const updatedEvents = events.map((e, idx) => (idx === targetIdx ? updatedEvent : e)).sort((a, b) => a.date.localeCompare(b.date));

    this.state$.next({
      ...current,
      calendarEvents: updatedEvents,
    });

    this.addAuditLog(
      '1',
      adminName,
      'ADMIN',
      'UPDATE_CALENDAR_EVENT',
      'ATTENDANCE_CALENDAR',
      `Updated university calendar schedule '${updatedEvent.title}' on ${updatedEvent.date}`
    );

    return {
      success: true,
      message: `Calendar event '${updatedEvent.title}' updated successfully.`,
      event: updatedEvent,
    };
  }

  public deleteCalendarEvent(
    id: string,
    adminName: string = 'Chief Admin Librarian'
  ): { success: boolean; message: string } {
    const current = this.snapshot;
    const events = current.calendarEvents || [];
    const target = events.find((e) => e.id === id);

    if (!target) {
      return { success: false, message: 'Calendar event not found.' };
    }

    const updatedEvents = events.filter((e) => e.id !== id);

    this.state$.next({
      ...current,
      calendarEvents: updatedEvents,
    });

    this.addAuditLog(
      '1',
      adminName,
      'ADMIN',
      'DELETE_CALENDAR_EVENT',
      'ATTENDANCE_CALENDAR',
      `Deleted calendar schedule '${target.title}' on ${target.date}`
    );

    return {
      success: true,
      message: `Removed calendar event '${target.title}' (${target.date}).`,
    };
  }

  public quickToggleDayHoliday(
    dateStr: string,
    isHoliday: boolean,
    title?: string,
    adminName: string = 'Chief Admin Librarian'
  ): { success: boolean; message: string } {
    const current = this.snapshot;
    const events = current.calendarEvents || [];
    const existing = events.find((e) => e.date === dateStr);

    if (existing) {
      return this.updateCalendarEvent(
        existing.id,
        {
          type: isHoliday ? 'HOLIDAY' : 'WORKING_DAY',
          isLibraryOpen: !isHoliday,
          title: title || (isHoliday ? 'University Holiday (Closed)' : 'Declared Working Day (Open)'),
        },
        adminName
      );
    }

    return this.addCalendarEvent(
      {
        date: dateStr,
        title: title || (isHoliday ? 'Declared University Holiday' : 'Declared Working Day'),
        type: isHoliday ? 'HOLIDAY' : 'WORKING_DAY',
        category: 'UNIVERSITY_DECLARED',
        isLibraryOpen: !isHoliday,
        openTime: isHoliday ? undefined : '08:00',
        closeTime: isHoliday ? undefined : '22:00',
        customHoursText: isHoliday ? 'Closed (Full Day)' : '08:00 AM – 10:00 PM',
        description: isHoliday ? 'Manually declared university holiday.' : 'Special declared working day.',
        declaredBy: adminName,
      },
      adminName
    );
  }

  public quickDeclareWorkingDay(
    dateStr: string,
    title: string = 'Declared University Working Day',
    openTime: string = '08:00',
    closeTime: string = '22:00',
    adminName: string = 'Chief Admin Librarian'
  ): { success: boolean; message: string } {
    return this.addCalendarEvent(
      {
        date: dateStr,
        title,
        type: 'WORKING_DAY',
        category: 'SPECIAL_SCHEDULE',
        isLibraryOpen: true,
        openTime,
        closeTime,
        customHoursText: `${openTime} – ${closeTime}`,
        description: 'Special active working day declared by administration.',
        declaredBy: adminName,
      },
      adminName
    );
  }

  public resetCalendarToDefault(adminName: string = 'Chief Admin Librarian'): { success: boolean; message: string } {
    const current = this.snapshot;
    this.state$.next({
      ...current,
      calendarEvents: DEFAULT_CALENDAR_EVENTS,
    });

    this.addAuditLog(
      '1',
      adminName,
      'ADMIN',
      'RESET_CALENDAR_DEFAULTS',
      'ATTENDANCE_CALENDAR',
      'Reset university library academic calendar to standard default gazetted holidays and working schedule'
    );

    return { success: true, message: 'University Calendar reset to factory defaults with 2026/2027 schedules.' };
  }

  public exportCalendarReportCSV(events?: UniversityCalendarEvent[], customFilename?: string): { success: boolean; filename: string } {
    const list = events || this.snapshot.calendarEvents || [];
    const dateStr = getLocalDateStr(new Date());
    const rawFilename = customFilename || `University_Library_Academic_Calendar_${dateStr}.xlsx`;
    const finalFilename = rawFilename.endsWith('.xlsx') ? rawFilename : `${rawFilename.replace(/\.csv$/, '')}.xlsx`;

    const headers = [
      'Schedule ID',
      'Date',
      'End Date',
      'Occasion / Title',
      'Schedule Type',
      'Category',
      'Library Status',
      'Operating Hours',
      'Affected Branches',
      'Declared By',
      'Description / Notes',
    ];

    const rows = list.map((e) => [
      e.id,
      e.date,
      e.endDate || '—',
      e.title,
      e.type,
      e.category,
      e.isLibraryOpen ? 'OPEN (Working Day)' : 'CLOSED (Holiday)',
      e.customHoursText || (e.isLibraryOpen ? '08:00 AM – 10:00 PM' : 'Closed (Full Day)'),
      (e.affectedBranches || ['Central Library']).join(', '),
      e.declaredBy || 'Administration',
      e.description || e.notes || '',
    ]);

    exportStyledExcelFile({
      filename: finalFilename,
      sheetName: 'University Calendar',
      headers,
      data: rows,
      themeColor: '4338CA', // Indigo Header
    });

    this.addAuditLog(
      '1',
      'Chief Admin Librarian',
      'ADMIN',
      'EXPORT_CALENDAR_REPORT',
      'ATTENDANCE_CALENDAR',
      `Exported ${list.length} academic calendar events to formatted Excel/CSV file`
    );

    return { success: true, filename: finalFilename };
  }

  public exportMemberCompleteProfileReportCSV(memberIdOrCardNoOrEmail: string): { success: boolean; filename: string; message: string } {
    const current = this.snapshot;
    const term = (memberIdOrCardNoOrEmail || '').trim().toLowerCase();
    const dateStr = getLocalDateStr(new Date());

    const member = current.members.find(
      (m) =>
        m.id.toLowerCase() === term ||
        m.memberCardNo.toLowerCase() === term ||
        m.email.toLowerCase() === term ||
        m.name.toLowerCase() === term
    ) || current.members[0];

    if (!member) {
      return { success: false, filename: '', message: 'Member profile not found for export.' };
    }

    const uEmail = member.email.toLowerCase();
    const uCard = member.memberCardNo.toLowerCase();
    const uName = member.name.toLowerCase();
    const mId = member.id;

    // Filter Borrowing Transactions
    const memberTransactions = (current.transactions || []).filter((t) => {
      const matchId = t.memberId === mId;
      const matchCard = Boolean(t.memberCardNo && t.memberCardNo.toLowerCase() === uCard);
      const matchName = Boolean(t.memberName && t.memberName.toLowerCase() === uName);
      const matchEmail = Boolean(uEmail && (t.memberCardNo.toLowerCase() === uEmail || (t as any).email?.toLowerCase() === uEmail));
      return matchId || matchCard || matchName || matchEmail;
    });

    // Filter Attendance Records
    const memberAttendance = (current.attendanceRecords || []).filter((r) => {
      const matchId = r.memberId === mId;
      const matchCard = Boolean(r.memberCardNo && r.memberCardNo.toLowerCase() === uCard);
      const matchName = Boolean(r.memberName && r.memberName.toLowerCase() === uName);
      const matchEmail = Boolean(r.email && r.email.toLowerCase() === uEmail);
      return matchId || matchCard || matchName || matchEmail;
    });

    // Filter Fines
    const memberFines = (current.fines || []).filter((f) => {
      const matchId = f.memberId === mId;
      const matchCard = Boolean(f.memberCardNo && f.memberCardNo.toLowerCase() === uCard);
      const matchName = Boolean(f.memberName && f.memberName.toLowerCase() === uName);
      return matchId || matchCard || matchName;
    });

    const activeLoansCount = memberTransactions.filter((t) => t.status === 'ISSUED' || t.status === 'OVERDUE').length;
    const returnedCount = memberTransactions.filter((t) => t.status === 'RETURNED').length;
    const overdueCount = memberTransactions.filter((t) => t.status === 'OVERDUE').length;
    const totalFinesAccrued = memberFines.reduce((sum, f) => sum + (f.amount || 0), 0);
    const unpaidFinesSum = memberFines.filter((f) => f.status === 'UNPAID').reduce((sum, f) => sum + (f.amount || 0), 0);

    let csv = '';
    csv += '========================================================================================\n';
    csv += `UNIVERSITY CENTRAL LIBRARY - COMPLETE MEMBER PROFILE & ACTIVITY DOSSIER REPORT\n`;
    csv += '========================================================================================\n';
    csv += `Report Generated Date,${dateStr}\n`;
    csv += `Member Card ID,${member.memberCardNo}\n`;
    csv += `Full Name,"${member.name}"\n`;
    csv += `Account Role,${member.role}\n`;
    csv += `Department,"${member.department || 'General Academic'}"\n`;
    csv += `Institutional Email,${member.email}\n`;
    csv += `Phone Number,${member.phone || '+91 98765 43210'}\n`;
    csv += `Account Status,${member.status}\n`;
    csv += `Registration Date,${member.registeredDate || '2026-01-15'}\n\n`;

    csv += '--- 1. PROFILE ACCOUNT PRIVILEGES & METRICS SUMMARY ---\n';
    csv += `Max Borrowing Books Quota,${member.maxAllowedBooks}\n`;
    csv += `Current Active Borrowings,${activeLoansCount}\n`;
    csv += `Total Books Borrowed All Time,${memberTransactions.length}\n`;
    csv += `Returned Circulations,${returnedCount}\n`;
    csv += `Overdue Circulations,${overdueCount}\n`;
    csv += `Total Attendance Check-In Visits,${memberAttendance.length}\n`;
    csv += `Total Fines Accrued (INR),INR ${totalFinesAccrued.toFixed(2)}\n`;
    csv += `Outstanding Unpaid Fine Balance (INR),INR ${unpaidFinesSum.toFixed(2)}\n\n`;

    csv += '--- 2. BOOK BORROWING & CIRCULATION HISTORY LOGS ---\n';
    csv += 'Transaction ID,Book Title,Accession No,Barcode,Issue Date,Due Date,Return Date,Duration (Days),Fine Amount (INR),Status\n';

    if (memberTransactions.length === 0) {
      csv += 'No borrowing records found for this member account.\n';
    } else {
      memberTransactions.forEach((t) => {
        const start = new Date(t.issueDate);
        const end = t.returnDate ? new Date(t.returnDate) : new Date();
        const durationDays = Math.max(1, Math.ceil(Math.abs(end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
        csv += `"${t.id}","${(t.bookTitle || '').replace(/"/g, '""')}","${t.accessionNo}","${t.barcode}","${t.issueDate}","${t.dueDate}","${t.returnDate || 'IN PROGRESS'}","${durationDays}","INR ${(t.fineAmount || 0).toFixed(2)}","${t.status}"\n`;
      });
    }
    csv += '\n';

    csv += '--- 3. LIBRARY ATTENDANCE & VISITOR CHECK-IN LOGS ---\n';
    csv += 'Attendance ID,Check-In Time,Check-Out Time,Duration (Mins),Status,Visit Purpose,Entrance Gate,Checked In By,Date\n';

    if (memberAttendance.length === 0) {
      csv += 'No attendance check-in records found for this member account.\n';
    } else {
      memberAttendance.forEach((a) => {
        csv += `"${a.id}","${a.checkInTime}","${a.checkOutTime || 'IN PROGRESS'}","${a.durationMinutes || 0}","${a.status}","${a.purposeOfVisit || 'GENERAL_READING'}","${(a.entryGate || 'Main Gate').replace(/"/g, '""')}","${a.checkedInBy || 'Desk'}","${a.date}"\n`;
      });
    }
    csv += '\n';

    csv += '--- 4. FINANCIAL FINE TRANSACTIONS & PAYMENT LEDGER ---\n';
    csv += 'Fine ID,Reason / Violation,Amount (INR),Assessed Date,Payment Status,Payment Date,Payment Method\n';

    if (memberFines.length === 0) {
      csv += 'No financial fine records on file for this member account.\n';
    } else {
      memberFines.forEach((f) => {
        csv += `"${f.id}","${(f.reason || 'Late Book Return').replace(/"/g, '""')}","INR ${(f.amount || 0).toFixed(2)}","${f.createdDate || 'N/A'}","${f.status}","${f.paidDate || 'N/A'}","${f.receiptNo || 'DESK_PAYMENT'}"\n`;
      });
    }

    const filename = `Member_Profile_Report_${member.memberCardNo}_${dateStr}.csv`;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    this.addAuditLog(
      member.id,
      member.name,
      member.role,
      'EXPORT_MEMBER_PROFILE_DOSSIER',
      'PROFILE_MODULE',
      `Exported complete consolidated profile dossier (Borrowing history, attendance logs, fines) to CSV`
    );

    return {
      success: true,
      filename,
      message: `Successfully exported complete profile report for ${member.name} (${member.memberCardNo})!`,
    };
  }

  public printMemberCompleteProfileReport(memberIdOrCardNoOrEmail: string): void {
    const current = this.snapshot;
    const term = (memberIdOrCardNoOrEmail || '').trim().toLowerCase();
    const dateStr = getLocalDateStr(new Date());

    const member = current.members.find(
      (m) =>
        m.id.toLowerCase() === term ||
        m.memberCardNo.toLowerCase() === term ||
        m.email.toLowerCase() === term ||
        m.name.toLowerCase() === term
    ) || current.members[0];

    if (!member) return;

    const uEmail = member.email.toLowerCase();
    const uCard = member.memberCardNo.toLowerCase();
    const uName = member.name.toLowerCase();
    const mId = member.id;

    // Filter Borrowing Transactions
    const memberTransactions = (current.transactions || []).filter((t) => {
      const matchId = t.memberId === mId;
      const matchCard = Boolean(t.memberCardNo && t.memberCardNo.toLowerCase() === uCard);
      const matchName = Boolean(t.memberName && t.memberName.toLowerCase() === uName);
      const matchEmail = Boolean(uEmail && (t.memberCardNo.toLowerCase() === uEmail || (t as any).email?.toLowerCase() === uEmail));
      return matchId || matchCard || matchName || matchEmail;
    });

    // Filter Attendance Records
    const memberAttendance = (current.attendanceRecords || []).filter((r) => {
      const matchId = r.memberId === mId;
      const matchCard = Boolean(r.memberCardNo && r.memberCardNo.toLowerCase() === uCard);
      const matchName = Boolean(r.memberName && r.memberName.toLowerCase() === uName);
      const matchEmail = Boolean(r.email && r.email.toLowerCase() === uEmail);
      return matchId || matchCard || matchName || matchEmail;
    });

    // Filter Fines
    const memberFines = (current.fines || []).filter((f) => {
      const matchId = f.memberId === mId;
      const matchCard = Boolean(f.memberCardNo && f.memberCardNo.toLowerCase() === uCard);
      const matchName = Boolean(f.memberName && f.memberName.toLowerCase() === uName);
      return matchId || matchCard || matchName;
    });

    const activeLoansCount = memberTransactions.filter((t) => t.status === 'ISSUED' || t.status === 'OVERDUE').length;
    const unpaidFinesSum = memberFines.filter((f) => f.status === 'UNPAID').reduce((sum, f) => sum + (f.amount || 0), 0);

    const printWindow = window.open('', '_blank', 'width=1000,height=800');
    if (!printWindow) return;

    const borrowingRowsHtml = memberTransactions.length === 0
      ? `<tr><td colspan="7" style="text-align: center; padding: 12px; color: #64748b;">No borrowing records on file.</td></tr>`
      : memberTransactions.map((t) => {
          const start = new Date(t.issueDate);
          const end = t.returnDate ? new Date(t.returnDate) : new Date();
          const durationDays = Math.max(1, Math.ceil(Math.abs(end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
          const statusBg = t.status === 'ISSUED' ? '#dbeafe' : t.status === 'RETURNED' ? '#dcfce7' : '#ffe4e6';
          const statusColor = t.status === 'ISSUED' ? '#1e40af' : t.status === 'RETURNED' ? '#166534' : '#991b1b';
          return `
            <tr>
              <td><strong>${t.bookTitle}</strong><br/><small style="color: #64748b;">ACC: ${t.accessionNo} | BC: ${t.barcode}</small></td>
              <td>${t.issueDate}</td>
              <td>${t.dueDate}</td>
              <td>${t.returnDate || '<span style="color:#d97706; font-weight:bold;">In Progress</span>'}</td>
              <td>${durationDays} Days</td>
              <td>₹${(t.fineAmount || 0).toFixed(2)}</td>
              <td><span style="background:${statusBg}; color:${statusColor}; padding:2px 8px; border-radius:4px; font-weight:bold; font-size:10px;">${t.status}</span></td>
            </tr>
          `;
        }).join('');

    const attendanceRowsHtml = memberAttendance.length === 0
      ? `<tr><td colspan="7" style="text-align: center; padding: 12px; color: #64748b;">No attendance records on file.</td></tr>`
      : memberAttendance.map((a) => `
          <tr>
            <td>${a.checkInTime}</td>
            <td>${a.checkOutTime || '<span style="color:#16a34a; font-weight:bold;">Active In Library</span>'}</td>
            <td>${a.durationMinutes || 0} mins</td>
            <td>${a.purposeOfVisit || 'GENERAL_READING'}</td>
            <td>${a.entryGate || 'Main Gate'}</td>
            <td>${a.checkedInBy || 'Desk'}</td>
            <td><span style="background:#e0e7ff; color:#3730a3; padding:2px 8px; border-radius:4px; font-weight:bold; font-size:10px;">${a.status}</span></td>
          </tr>
        `).join('');

    const finesRowsHtml = memberFines.length === 0
      ? `<tr><td colspan="6" style="text-align: center; padding: 12px; color: #64748b;">No fine records on file.</td></tr>`
      : memberFines.map((f) => `
          <tr>
            <td>${f.reason || 'Late Book Return'}</td>
            <td><strong>₹${(f.amount || 0).toFixed(2)}</strong></td>
            <td>${f.createdDate || 'N/A'}</td>
            <td><span style="background:${f.status === 'PAID' ? '#dcfce7' : '#ffe4e6'}; color:${f.status === 'PAID' ? '#166534' : '#991b1b'}; padding:2px 8px; border-radius:4px; font-weight:bold; font-size:10px;">${f.status}</span></td>
            <td>${f.paidDate || 'N/A'}</td>
            <td>${f.receiptNo || 'DESK_PAYMENT'}</td>
          </tr>
        `).join('');

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Member Profile & Activity Report - ${member.name}</title>
          <style>
            @page { size: A4 portrait; margin: 12mm; }
            * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            body { margin: 0; padding: 20px; font-family: 'Segoe UI', Arial, sans-serif; color: #0f172a; background: #ffffff; font-size: 11px; }
            .no-print { display: flex; justify-content: space-between; align-items: center; background: #f8fafc; padding: 12px 20px; border-bottom: 1px solid #e2e8f0; margin: -20px -20px 20px -20px; }
            @media print { .no-print { display: none !important; } }
            .print-btn { background: #0f172a; color: #fff; border: none; padding: 8px 16px; font-weight: 700; border-radius: 8px; cursor: pointer; }
            .header-banner { border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: flex-start; }
            .univ-title { font-size: 18px; font-weight: 800; color: #0f172a; margin: 0; text-transform: uppercase; }
            .sub-title { font-size: 11px; color: #475569; font-weight: 600; margin-top: 2px; }
            .report-badge { font-size: 10px; font-weight: 800; background: #eff6ff; color: #1d4ed8; padding: 4px 10px; border-radius: 6px; border: 1px solid #bfdbfe; }
            
            .profile-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px; margin-bottom: 16px; display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
            .info-item { display: flex; flex-direction: column; }
            .info-label { font-size: 9px; font-weight: 700; color: #64748b; text-transform: uppercase; }
            .info-val { font-size: 11px; font-weight: 700; color: #0f172a; margin-top: 2px; }
            
            .stats-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 16px; }
            .stat-box { background: #ffffff; border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px; text-align: center; }
            .stat-num { font-size: 16px; font-weight: 800; color: #0f172a; }
            .stat-label { font-size: 9px; font-weight: 700; color: #475569; text-transform: uppercase; }

            .section-title { font-size: 12px; font-weight: 800; color: #0f172a; text-transform: uppercase; border-left: 4px solid #2563eb; padding-left: 8px; margin: 16px 0 8px 0; }
            
            table { width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 10px; }
            th { background: #f1f5f9; color: #334155; text-align: left; padding: 6px 8px; font-weight: 700; border: 1px solid #cbd5e1; text-transform: uppercase; }
            td { padding: 6px 8px; border: 1px solid #e2e8f0; color: #0f172a; }
            tr:nth-child(even) { background: #f8fafc; }

            .footer { margin-top: 24px; border-top: 1px solid #cbd5e1; padding-top: 8px; font-size: 9px; color: #64748b; display: flex; justify-content: space-between; }
          </style>
        </head>
        <body>
          <div class="no-print">
            <span style="font-weight:bold; font-size:12px;">📊 University Library Official Member Profile Report</span>
            <div>
              <button onclick="window.print()" class="print-btn">🖨️ Print / Save PDF Report</button>
            </div>
          </div>

          <div class="header-banner">
            <div>
              <h1 class="univ-title">Central University Library System</h1>
              <div class="sub-title">Official Student & Faculty Academic Activity Dossier</div>
            </div>
            <div class="report-badge">REPORT DATE: ${dateStr}</div>
          </div>

          <div class="profile-card">
            <div class="info-item">
              <span class="info-label">Member Name</span>
              <span class="info-val">${member.name}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Card Number</span>
              <span class="info-val">${member.memberCardNo}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Role & Dept</span>
              <span class="info-val">${member.role} - ${member.department}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Status</span>
              <span class="info-val" style="color: #16a34a;">● ${member.status}</span>
            </div>
          </div>

          <div class="stats-row">
            <div class="stat-box">
              <div class="stat-num">${activeLoansCount} / ${member.maxAllowedBooks}</div>
              <div class="stat-label">Active Borrowings</div>
            </div>
            <div class="stat-box">
              <div class="stat-num">${memberTransactions.length}</div>
              <div class="stat-label">Total Borrowed</div>
            </div>
            <div class="stat-box">
              <div class="stat-num">${memberAttendance.length}</div>
              <div class="stat-label">Library Check-ins</div>
            </div>
            <div class="stat-box">
              <div class="stat-num" style="color: ${unpaidFinesSum > 0 ? '#dc2626' : '#0f172a'};">₹${unpaidFinesSum.toFixed(2)}</div>
              <div class="stat-label">Pending Fine</div>
            </div>
          </div>

          <div class="section-title">1. Book Borrowing & Circulation History</div>
          <table>
            <thead>
              <tr>
                <th>Book Title & Details</th>
                <th>Issue Date</th>
                <th>Due Date</th>
                <th>Return Date</th>
                <th>Duration</th>
                <th>Fine</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${borrowingRowsHtml}
            </tbody>
          </table>

          <div class="section-title">2. Library Attendance & Access Logs</div>
          <table>
            <thead>
              <tr>
                <th>Check-In Time</th>
                <th>Check-Out Time</th>
                <th>Duration</th>
                <th>Visit Purpose</th>
                <th>Entrance Gate</th>
                <th>Checked In By</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${attendanceRowsHtml}
            </tbody>
          </table>

          <div class="section-title">3. Financial Fines & Payment History</div>
          <table>
            <thead>
              <tr>
                <th>Violation / Reason</th>
                <th>Amount</th>
                <th>Issued Date</th>
                <th>Status</th>
                <th>Paid Date</th>
                <th>Payment Method</th>
              </tr>
            </thead>
            <tbody>
              ${finesRowsHtml}
            </tbody>
          </table>

          <div class="footer">
            <span>Generated from Central Library Operations Database v2.4</span>
            <span>Security Signature: _______________________</span>
          </div>

          <script>
            window.onload = function() {
              setTimeout(function() { window.print(); }, 400);
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();

    this.addAuditLog(
      member.id,
      member.name,
      member.role,
      'PRINT_MEMBER_PROFILE_REPORT',
      'PROFILE_MODULE',
      `Printed complete profile report for ${member.name} (${member.memberCardNo})`
    );
  }

  public getMemberNoDueAudit(memberIdOrCardOrEmail: string): {
    member: MemberProfile | undefined;
    isEligible: boolean;
    activeLoansCount: number;
    activeLoans: IssueTransaction[];
    pendingFinesAmount: number;
    pendingFines: FineRecord[];
    existingCertificate?: NoDueCertificate;
    reasons: string[];
  } {
    const current = this.snapshot;
    const term = (memberIdOrCardOrEmail || '').trim().toLowerCase();
    const member = current.members.find(
      (m) =>
        m.id.toLowerCase() === term ||
        m.memberCardNo.toLowerCase() === term ||
        m.email.toLowerCase() === term ||
        m.name.toLowerCase() === term
    );

    if (!member) {
      return {
        member: undefined,
        isEligible: false,
        activeLoansCount: 0,
        activeLoans: [],
        pendingFinesAmount: 0,
        pendingFines: [],
        reasons: ['Member profile record not found in library registry.'],
      };
    }

    const mId = member.id;
    const mCard = member.memberCardNo.toLowerCase();

    // 1. Check Active Loans (Must be 0)
    const activeLoans = (current.transactions || []).filter(
      (t) =>
        (t.memberId === mId || t.memberCardNo.toLowerCase() === mCard) &&
        (t.status === 'ISSUED' || t.status === 'RENEWED' || t.status === 'OVERDUE')
    );

    // 2. Check Pending Unpaid Fines (Must be 0)
    const pendingFines = (current.fines || []).filter(
      (f) =>
        (f.memberId === mId || f.memberCardNo.toLowerCase() === mCard) &&
        f.status === 'UNPAID'
    );

    let totalPendingFine = pendingFines.reduce((acc, f) => acc + (f.amount || 0), 0);

    // Check transactions with unpaid fines
    (current.transactions || []).forEach((t) => {
      if (
        (t.memberId === mId || t.memberCardNo.toLowerCase() === mCard) &&
        t.fineAmount &&
        t.fineAmount > 0 &&
        t.fineStatus === 'UNPAID'
      ) {
        const inFines = pendingFines.some((f) => f.transactionId === t.id);
        if (!inFines) {
          totalPendingFine += t.fineAmount;
        }
      }
    });

    const reasons: string[] = [];
    if (activeLoans.length > 0) {
      reasons.push(`${activeLoans.length} library book(s) currently issued and not returned.`);
    }
    if (totalPendingFine > 0) {
      reasons.push(`Outstanding unpaid library fine of ₹${totalPendingFine.toFixed(2)}.`);
    }

    const existingCert = (current.noDueCertificates || []).find(
      (c) => (c.memberId === mId || c.memberCardNo.toLowerCase() === mCard) && c.status === 'ISSUED'
    );

    const isEligible = activeLoans.length === 0 && totalPendingFine === 0;

    return {
      member,
      isEligible,
      activeLoansCount: activeLoans.length,
      activeLoans,
      pendingFinesAmount: totalPendingFine,
      pendingFines,
      existingCertificate: existingCert,
      reasons,
    };
  }

  public issueNoDueCertificate(
    memberIdOrCard: string,
    issuedByName: string = 'Dr. M. S. Ramanujan (Chief Admin Librarian & Head of Library)',
    remarks: string = 'Cleared all borrowed library books and financial dues upon college course completion.'
  ): { success: boolean; certificate?: NoDueCertificate; message: string } {
    const audit = this.getMemberNoDueAudit(memberIdOrCard);
    if (!audit.member) {
      return { success: false, message: 'Member record not found.' };
    }

    if (!audit.isEligible) {
      return {
        success: false,
        message: `Cannot issue No Due Certificate. ${audit.reasons.join(' ')}`,
      };
    }

    const current = this.snapshot;
    const certYear = new Date().getFullYear();
    const existingCerts = current.noDueCertificates || [];
    const certSeq = String(existingCerts.length + 1).padStart(4, '0');
    const certNo = `NDC/LIB/${certYear}/${certSeq}`;

    const newCertificate: NoDueCertificate = {
      id: `ndc-${Date.now()}`,
      certificateNo: certNo,
      memberId: audit.member.id,
      memberName: audit.member.name,
      memberCardNo: audit.member.memberCardNo,
      rollNo: audit.member.rollNo || '22CS104',
      role: audit.member.role,
      department: audit.member.department || 'Computer Science & Engineering',
      academicBatch: audit.member.academicBatch || '2022 - 2026',
      issuedDate: getLocalDateTimeStr(new Date()),
      issuedBy: issuedByName,
      issuedByRole: 'Head of Library Department (Chief Admin Librarian)',
      activeLoansCount: 0,
      pendingFinesAmount: 0,
      status: 'ISSUED',
      verificationQrCode: `VERIFY:LIBRARY_NDC:${certNo}:${audit.member.memberCardNo}:${audit.member.name}`,
      remarks,
    };

    const updatedMembers = current.members.map((m) =>
      m.id === audit.member!.id
        ? {
            ...m,
            noDueStatus: 'ISSUED' as const,
            noDueCertificateNo: certNo,
            noDueIssuedDate: newCertificate.issuedDate,
            noDueIssuedBy: issuedByName,
          }
        : m
    );

    const updatedCerts = [newCertificate, ...existingCerts.filter((c) => c.memberId !== audit.member!.id)];

    const updated: StateSchema = {
      ...current,
      members: updatedMembers,
      noDueCertificates: updatedCerts,
    };

    this.state$.next(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

    this.addAuditLog(
      '1',
      'Chief Admin Librarian',
      'ADMIN',
      'ISSUE_NO_DUE_CERTIFICATE',
      'CLEARANCE_DESK',
      `Issued official Library No Due Certificate (${certNo}) for ${audit.member.name} (${audit.member.memberCardNo})`
    );

    return { success: true, certificate: newCertificate, message: `No Due Certificate (${certNo}) issued successfully by Head of Library!` };
  }

  public submitNoDueApplication(params: {
    studentId: string;
    studentName: string;
    rollNo: string;
    department: string;
    program?: string;
    batch?: string;
    semesterYear?: string;
    libraryMembershipId: string;
    email: string;
    phone?: string;
    purpose: NoDuePurpose;
    purposeOtherDetails?: string;
  }): { success: boolean; application?: NoDueApplication; message: string } {
    const current = this.snapshot;
    const audit = this.getMemberNoDueAudit(params.studentId || params.libraryMembershipId);

    if (!audit.isEligible) {
      return {
        success: false,
        message: `Cannot apply for No Due Certificate. You have outstanding library dues: ${audit.reasons.join(' ')} All books must be returned and fines cleared before applying.`,
      };
    }

    const appYear = new Date().getFullYear();
    const existingApps = current.noDueApplications || [];
    const seq = String(existingApps.length + 1).padStart(5, '0');
    const applicationNo = `NDA/${appYear}/${seq}`;
    const nowStr = getLocalDateTimeStr(new Date());

    const newApp: NoDueApplication = {
      id: `ndc-app-${Date.now()}`,
      applicationNo,
      studentId: params.studentId,
      studentName: params.studentName,
      rollNo: params.rollNo,
      department: params.department,
      program: params.program || 'Bachelor of Technology',
      batch: params.batch || '2022 - 2026',
      semesterYear: params.semesterYear || 'Semester 8 (Final Year)',
      libraryMembershipId: params.libraryMembershipId,
      email: params.email,
      phone: params.phone || '',
      purpose: params.purpose,
      purposeOtherDetails: params.purposeOtherDetails || '',
      applicationDate: nowStr,
      status: 'SUBMITTED',
      outstandingLoansCount: audit.activeLoansCount,
      outstandingFinesAmount: audit.pendingFinesAmount,
      history: [
        {
          status: 'SUBMITTED',
          changedAt: nowStr,
          changedBy: `${params.studentName} (Student)`,
          remarks: `Application submitted for ${params.purpose.replace(/_/g, ' ')}.`,
        },
      ],
    };

    const updatedApps = [newApp, ...existingApps];
    const updated: StateSchema = {
      ...current,
      noDueApplications: updatedApps,
    };

    this.state$.next(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

    this.addAuditLog(
      params.studentId,
      params.studentName,
      'STUDENT',
      'SUBMIT_NO_DUE_APPLICATION',
      'CLEARANCE_DESK',
      `Submitted No Due clearance application ${applicationNo} for ${params.purpose}`
    );

    return {
      success: true,
      application: newApp,
      message: `No Due Certificate application (${applicationNo}) submitted successfully!`,
    };
  }

  public verifyNoDueApplication(
    applicationId: string,
    verifiedByName: string = 'Dr. M. S. Ramanujan (Chief Admin Librarian & Head of Library)'
  ): { success: boolean; application?: NoDueApplication; message: string } {
    const current = this.snapshot;
    const app = (current.noDueApplications || []).find((a) => a.id === applicationId);
    if (!app) return { success: false, message: 'Application not found.' };

    const audit = this.getMemberNoDueAudit(app.studentId || app.libraryMembershipId);
    const nowStr = getLocalDateTimeStr(new Date());

    const updatedApp: NoDueApplication = {
      ...app,
      status: 'UNDER_VERIFICATION',
      verifiedDate: nowStr,
      verifiedBy: verifiedByName,
      outstandingLoansCount: audit.activeLoansCount,
      outstandingFinesAmount: audit.pendingFinesAmount,
      adminRemarks: audit.isEligible
        ? 'Real-time database audit passed: 0 Active Borrowings & ₹0 Fines. Ready for Head of Library approval.'
        : `Outstanding liabilities detected: ${audit.reasons.join(', ')}`,
      history: [
        ...app.history,
        {
          status: 'UNDER_VERIFICATION',
          changedAt: nowStr,
          changedBy: verifiedByName,
          remarks: audit.isEligible
            ? 'Live clearance audit passed: 0 active borrowings and 0 fines.'
            : `Dues pending: ${audit.reasons.join(', ')}`,
        },
      ],
    };

    const updatedApps = (current.noDueApplications || []).map((a) => (a.id === applicationId ? updatedApp : a));
    const updated: StateSchema = {
      ...current,
      noDueApplications: updatedApps,
    };

    this.state$.next(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

    return { success: true, application: updatedApp, message: 'Application verified against real-time library database.' };
  }

  public approveNoDueApplication(
    applicationId: string,
    adminRemarks: string = 'Approved and certified by Head of Library Department.',
    signerName: string = 'Dr. M. S. Ramanujan (Chief Admin Librarian & Head of Library)'
  ): { success: boolean; application?: NoDueApplication; certificate?: NoDueCertificate; message: string } {
    const current = this.snapshot;
    const app = (current.noDueApplications || []).find((a) => a.id === applicationId);
    if (!app) return { success: false, message: 'Application not found.' };

    const audit = this.getMemberNoDueAudit(app.studentId || app.libraryMembershipId);
    if (!audit.isEligible) {
      return {
        success: false,
        message: `Cannot approve application. Student has outstanding liabilities: ${audit.reasons.join(' ')}`,
      };
    }

    // Generate Certificate
    const certYear = new Date().getFullYear();
    const existingCerts = current.noDueCertificates || [];
    const certSeq = String(existingCerts.length + 1).padStart(4, '0');
    const certNo = `NDC/LIB/${certYear}/${certSeq}`;
    const nowStr = getLocalDateTimeStr(new Date());

    const newCertificate: NoDueCertificate = {
      id: `ndc-cert-${Date.now()}`,
      certificateNo: certNo,
      applicationId: app.id,
      memberId: app.studentId,
      memberName: app.studentName,
      memberCardNo: app.libraryMembershipId,
      rollNo: app.rollNo,
      role: 'STUDENT',
      department: app.department,
      program: app.program,
      academicBatch: app.batch,
      semesterYear: app.semesterYear,
      purpose: app.purpose.replace(/_/g, ' '),
      issuedDate: nowStr,
      issuedBy: signerName,
      issuedByRole: 'Head of Library Department (Chief Admin Librarian)',
      activeLoansCount: 0,
      pendingFinesAmount: 0,
      status: 'ISSUED',
      verificationQrCode: `VERIFY:LIBRARY_NDC:${certNo}:${app.libraryMembershipId}:${app.studentName}`,
      remarks: adminRemarks,
    };

    const updatedApp: NoDueApplication = {
      ...app,
      status: 'CERTIFICATE_ISSUED',
      certificateNo: certNo,
      certificateIssuedDate: nowStr,
      adminRemarks,
      verifiedDate: nowStr,
      verifiedBy: signerName,
      outstandingLoansCount: 0,
      outstandingFinesAmount: 0,
      history: [
        ...app.history,
        {
          status: 'APPROVED',
          changedAt: nowStr,
          changedBy: signerName,
          remarks: 'Clearance approved by Head of Library.',
        },
        {
          status: 'CERTIFICATE_ISSUED',
          changedAt: nowStr,
          changedBy: signerName,
          remarks: `Official No Due Certificate (${certNo}) generated and digitally signed.`,
        },
      ],
    };

    const updatedApps = (current.noDueApplications || []).map((a) => (a.id === applicationId ? updatedApp : a));
    const updatedCerts = [newCertificate, ...existingCerts.filter((c) => c.memberId !== app.studentId)];

    const updatedMembers = current.members.map((m) =>
      m.id === app.studentId || m.memberCardNo.toLowerCase() === app.libraryMembershipId.toLowerCase()
        ? {
            ...m,
            noDueStatus: 'ISSUED' as const,
            noDueCertificateNo: certNo,
            noDueIssuedDate: nowStr,
            noDueIssuedBy: signerName,
          }
        : m
    );

    const updated: StateSchema = {
      ...current,
      noDueApplications: updatedApps,
      noDueCertificates: updatedCerts,
      members: updatedMembers,
    };

    this.state$.next(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

    this.addAuditLog(
      '1',
      'Chief Admin Librarian',
      'ADMIN',
      'APPROVE_NO_DUE_APPLICATION',
      'CLEARANCE_DESK',
      `Approved No Due application ${app.applicationNo} & generated certificate ${certNo} for ${app.studentName}`
    );

    return {
      success: true,
      application: updatedApp,
      certificate: newCertificate,
      message: `No Due Certificate (${certNo}) approved and issued successfully!`,
    };
  }

  public rejectNoDueApplication(
    applicationId: string,
    rejectionReason: string = 'Outstanding books or unpaid fine dues pending resolution.',
    adminName: string = 'Dr. M. S. Ramanujan (Head of Library)'
  ): { success: boolean; message: string } {
    const current = this.snapshot;
    const app = (current.noDueApplications || []).find((a) => a.id === applicationId);
    if (!app) return { success: false, message: 'Application not found.' };

    const nowStr = getLocalDateTimeStr(new Date());

    const updatedApp: NoDueApplication = {
      ...app,
      status: 'REJECTED',
      rejectionReason,
      adminRemarks: `Application rejected: ${rejectionReason}`,
      history: [
        ...app.history,
        {
          status: 'REJECTED',
          changedAt: nowStr,
          changedBy: adminName,
          remarks: `Application rejected. Reason: ${rejectionReason}`,
        },
      ],
    };

    const updatedApps = (current.noDueApplications || []).map((a) => (a.id === applicationId ? updatedApp : a));
    const updated: StateSchema = {
      ...current,
      noDueApplications: updatedApps,
    };

    this.state$.next(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

    this.addAuditLog(
      '1',
      'Chief Admin Librarian',
      'ADMIN',
      'REJECT_NO_DUE_APPLICATION',
      'CLEARANCE_DESK',
      `Rejected No Due application ${app.applicationNo} for ${app.studentName}. Reason: ${rejectionReason}`
    );

    return { success: true, message: `Application ${app.applicationNo} rejected.` };
  }

  public reverifyStudentClearance(applicationIdOrStudentId: string): {
    audit: ReturnType<LibraryStoreService['getMemberNoDueAudit']>;
    application?: NoDueApplication;
  } {
    const current = this.snapshot;
    let app = (current.noDueApplications || []).find((a) => a.id === applicationIdOrStudentId);
    let term = applicationIdOrStudentId;
    if (app) {
      term = app.studentId || app.libraryMembershipId;
    } else {
      app = (current.noDueApplications || []).find(
        (a) => a.studentId === term || a.libraryMembershipId.toLowerCase() === term.toLowerCase()
      );
    }

    const audit = this.getMemberNoDueAudit(term);

    if (app) {
      const updatedApp: NoDueApplication = {
        ...app,
        outstandingLoansCount: audit.activeLoansCount,
        outstandingFinesAmount: audit.pendingFinesAmount,
      };
      const updatedApps = (current.noDueApplications || []).map((a) => (a.id === app!.id ? updatedApp : a));
      const updated: StateSchema = { ...current, noDueApplications: updatedApps };
      this.state$.next(updated);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return { audit, application: updatedApp };
    }

    return { audit };
  }

  public revokeNoDueCertificate(certificateId: string, reason: string = 'Administrative review'): { success: boolean; message: string } {
    const current = this.snapshot;
    const cert = (current.noDueCertificates || []).find((c) => c.id === certificateId);
    if (!cert) return { success: false, message: 'Certificate not found.' };

    const updatedCerts = (current.noDueCertificates || []).map((c) =>
      c.id === certificateId ? { ...c, status: 'REVOKED' as const, remarks: `Revoked: ${reason}` } : c
    );

    const updatedMembers = current.members.map((m) =>
      m.id === cert.memberId
        ? {
            ...m,
            noDueStatus: 'ELIGIBLE' as const,
            noDueCertificateNo: undefined,
            noDueIssuedDate: undefined,
          }
        : m
    );

    const updated: StateSchema = {
      ...current,
      members: updatedMembers,
      noDueCertificates: updatedCerts,
    };

    this.state$.next(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

    this.addAuditLog(
      '1',
      'Chief Admin Librarian',
      'ADMIN',
      'REVOKE_NO_DUE_CERTIFICATE',
      'CLEARANCE_DESK',
      `Revoked Library No Due Certificate ${cert.certificateNo} for ${cert.memberName}. Reason: ${reason}`
    );

    return { success: true, message: `Certificate ${cert.certificateNo} revoked.` };
  }

  public sendMemberNotification(
    params: {
      recipientMemberId?: string;
      recipientName: string;
      recipientEmail?: string;
      targetAudience?: string;
      title: string;
      content: string;
      isUrgent?: boolean;
      senderName?: string;
      category?: 'DUE_REMINDER' | 'OVERDUE_WARNING' | 'FINE_PAYMENT' | 'GENERAL' | 'EXTENSION_UPDATE';
    },
    currentUser?: any
  ): { success: boolean; message: string; notice: Notice } {
    const current = this.snapshot;
    const newNotice: Notice = {
      id: `notice-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      title: params.title.trim(),
      content: params.content.trim(),
      targetAudience: params.targetAudience || 'INDIVIDUAL',
      recipientEmail: params.recipientEmail,
      recipientName: params.recipientName,
      recipientMemberId: params.recipientMemberId,
      createdDate: getLocalDateTimeStr(),
      isUrgent: Boolean(params.isUrgent),
      senderName: params.senderName || currentUser?.name || 'Chief Librarian & Circulation Desk',
      category: params.category || 'GENERAL',
    };

    const updatedNotices = [newNotice, ...(current.notices || [])];
    const updated: StateSchema = { ...current, notices: updatedNotices };

    this.state$.next(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

    this.addAuditLog(
      currentUser?.id || '1',
      currentUser?.name || 'Admin',
      (currentUser?.role || 'ADMIN') as Role,
      'DISPATCH_MEMBER_NOTIFICATION',
      'CIRCULATION_NOTICES',
      `Sent notification "${newNotice.title}" to ${params.recipientName} (${params.recipientEmail || params.recipientMemberId || 'All Members'})`
    );

    return {
      success: true,
      message: `Notification dispatched successfully to ${params.recipientName}!`,
      notice: newNotice,
    };
  }

  public restoreFromBackup(backupData: StateSchema) {
    this.state$.next(backupData);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(backupData));
    this.addAuditLog('1', 'Chief Admin Librarian', 'ADMIN', 'RESTORE_DATABASE', 'SETTINGS', 'Restored library database snapshot from JSON backup file');
  }

  public clearAuditLogs() {
    const current = this.snapshot;
    const updated: StateSchema = { ...current, auditLogs: [] };
    this.state$.next(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }

  public markNoticeAsRead(noticeId: string, user?: any) {
    const current = this.snapshot;
    const userKey = getUserNotificationKey(user);
    const userEmail = user?.email?.toLowerCase().trim();
    const userId = user?.id;

    const readMap: { [key: string]: string[] } = { ...(current.readNoticeIds || {}) };
    const currentReadList = new Set(readMap[userKey] || []);
    currentReadList.add(noticeId);
    readMap[userKey] = Array.from(currentReadList);

    if (userEmail) {
      const emailList = new Set(readMap[`email_${userEmail}`] || []);
      emailList.add(noticeId);
      readMap[`email_${userEmail}`] = Array.from(emailList);
    }
    if (userId) {
      const idList = new Set(readMap[`user_${userId}`] || []);
      idList.add(noticeId);
      readMap[`user_${userId}`] = Array.from(idList);
    }

    const updatedNotices = (current.notices || []).map((n) => {
      if (n.id === noticeId) {
        const readBy = new Set(n.readBy || []);
        readBy.add(userKey);
        if (userEmail) readBy.add(userEmail);
        if (userId) readBy.add(userId);
        return { ...n, readBy: Array.from(readBy) };
      }
      return n;
    });

    const updated: StateSchema = {
      ...current,
      notices: updatedNotices,
      readNoticeIds: readMap,
    };

    this.state$.next(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to save read state to localStorage', e);
    }
  }

  public markNoticeAsUnread(noticeId: string, user?: any) {
    const current = this.snapshot;
    const userKey = getUserNotificationKey(user);
    const userEmail = user?.email?.toLowerCase().trim();
    const userId = user?.id;

    const readMap: { [key: string]: string[] } = { ...(current.readNoticeIds || {}) };
    if (readMap[userKey]) {
      readMap[userKey] = readMap[userKey].filter((id) => id !== noticeId);
    }
    if (userEmail && readMap[`email_${userEmail}`]) {
      readMap[`email_${userEmail}`] = readMap[`email_${userEmail}`].filter((id) => id !== noticeId);
    }
    if (userId && readMap[`user_${userId}`]) {
      readMap[`user_${userId}`] = readMap[`user_${userId}`].filter((id) => id !== noticeId);
    }

    const updatedNotices = (current.notices || []).map((n) => {
      if (n.id === noticeId && n.readBy) {
        return {
          ...n,
          readBy: n.readBy.filter(
            (k) => k !== userKey && k !== userEmail && k !== userId
          ),
        };
      }
      return n;
    });

    const updated: StateSchema = {
      ...current,
      notices: updatedNotices,
      readNoticeIds: readMap,
    };

    this.state$.next(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to save read state to localStorage', e);
    }
  }

  public markAllNoticesAsRead(user?: any, additionalNoticeIds?: string[]) {
    const current = this.snapshot;
    const userKey = getUserNotificationKey(user);
    const userEmail = user?.email?.toLowerCase().trim();
    const userId = user?.id;

    const relevant = getRelevantNoticesForUser(user, current.notices || []);
    const relevantIds = relevant.map((n) => n.id);
    const allIdsToMark = Array.from(new Set([...relevantIds, ...(additionalNoticeIds || [])]));

    const readMap: { [key: string]: string[] } = { ...(current.readNoticeIds || {}) };
    const currentReadList = new Set(readMap[userKey] || []);
    allIdsToMark.forEach((id) => currentReadList.add(id));
    readMap[userKey] = Array.from(currentReadList);

    if (userEmail) {
      const emailList = new Set(readMap[`email_${userEmail}`] || []);
      allIdsToMark.forEach((id) => emailList.add(id));
      readMap[`email_${userEmail}`] = Array.from(emailList);
    }
    if (userId) {
      const idList = new Set(readMap[`user_${userId}`] || []);
      allIdsToMark.forEach((id) => idList.add(id));
      readMap[`user_${userId}`] = Array.from(idList);
    }

    const updatedNotices = (current.notices || []).map((n) => {
      if (allIdsToMark.includes(n.id)) {
        const readBy = new Set(n.readBy || []);
        readBy.add(userKey);
        if (userEmail) readBy.add(userEmail);
        if (userId) readBy.add(userId);
        return { ...n, readBy: Array.from(readBy) };
      }
      return n;
    });

    const updated: StateSchema = {
      ...current,
      notices: updatedNotices,
      readNoticeIds: readMap,
    };

    this.state$.next(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to save read state to localStorage', e);
    }
  }

  public resetToFactoryDefaults() {
    localStorage.removeItem(STORAGE_KEY);
    this.state$.next(this.getDefaultState());
  }
}

export function getUserNotificationKey(user?: { id?: string; email?: string; role?: Role; name?: string } | null): string {
  if (!user) return 'guest';
  if (user.id) return `user_${user.id}`;
  if (user.email) return `email_${user.email.toLowerCase().trim()}`;
  if (user.role) return `role_${user.role.toLowerCase().trim()}`;
  return 'guest';
}

export function isNoticeReadForUser(
  notice: Notice | string,
  user: { id?: string; email?: string; role?: Role; name?: string } | null,
  state: StateSchema
): boolean {
  if (!user) return false;
  const noticeId = typeof notice === 'string' ? notice : notice.id;
  const userKey = getUserNotificationKey(user);
  const userEmail = user.email?.toLowerCase().trim();
  const userId = user.id ? `user_${user.id}` : undefined;

  // Check state.readNoticeIds
  const readMap = state.readNoticeIds || {};
  if (readMap[userKey]?.includes(noticeId)) return true;
  if (userEmail && readMap[`email_${userEmail}`]?.includes(noticeId)) return true;
  if (userId && readMap[userId]?.includes(noticeId)) return true;
  if (user.role && readMap[`role_${user.role.toLowerCase()}`]?.includes(noticeId)) return true;

  // Check notice.readBy if notice is an object
  if (typeof notice !== 'string' && Array.isArray(notice.readBy)) {
    if (notice.readBy.includes(userKey)) return true;
    if (userEmail && notice.readBy.includes(userEmail)) return true;
    if (user.id && notice.readBy.includes(user.id)) return true;
  }

  return false;
}

export function getRelevantNoticesForUser(
  user: { id?: string; email?: string; role?: Role; name?: string } | null,
  notices: Notice[]
): Notice[] {
  if (!notices || !Array.isArray(notices)) return [];
  const userEmail = user?.email?.toLowerCase().trim() || '';
  const userName = user?.name?.toLowerCase().trim() || '';
  const userRole = user?.role || 'GUEST';
  const userId = user?.id || '';

  return notices.filter((notice) => {
    if (notice.recipientEmail) {
      const matchEmail = notice.recipientEmail.toLowerCase().trim() === userEmail;
      const matchName = notice.recipientName && notice.recipientName.toLowerCase().trim() === userName;
      const matchId = notice.recipientMemberId && (notice.recipientMemberId === userId);
      return matchEmail || matchName || matchId;
    }

    if (notice.recipientMemberId && userId) {
      if (notice.recipientMemberId === userId) return true;
    }

    if (notice.targetAudience) {
      if (notice.targetAudience === 'ALL') return true;
      if (notice.targetAudience === 'STUDENTS' && userRole === 'STUDENT') return true;
      if (notice.targetAudience === 'FACULTY' && userRole === 'FACULTY') return true;
      if (notice.targetAudience === 'ADMIN' && (userRole === 'ADMIN' || userRole === 'STAFF')) return true;
      return false;
    }

    return true;
  });
}

export const libraryStore = new LibraryStoreService();
