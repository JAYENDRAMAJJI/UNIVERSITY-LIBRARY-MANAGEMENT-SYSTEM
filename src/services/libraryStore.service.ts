import XLSX from 'xlsx-js-style';
import { exportStyledExcelFile } from '../utils/excelExport';
import { digitalFileStorage } from '../utils/digitalFileStorage';
import { normalizeRackAndShelf, ACADEMIC_RACK_HIERARCHY } from '../data/rackShelfHierarchy';
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
      m.id.toLowerCase() === term ||
      m.memberCardNo.toLowerCase() === term ||
      m.email.toLowerCase() === term ||
      m.name.toLowerCase() === term
  );

  if (!member) return 0;

  const mId = member.id;
  const mCard = member.memberCardNo.toLowerCase();

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
        reason: `${matchedEvent.title}: Library opens today at ${matchedEvent.customHoursText || openTimeStr}.`,
        nextOpenText: `Opens today at ${openTimeStr}`,
        isSpecialWorkingDay: true,
        calendarEvent: matchedEvent,
      };
    }

    if (currentMinutes >= eventCloseMins) {
      return {
        isOpen: false,
        statusText: `CLOSED (Closed at ${closeTimeStr})`,
        reason: `${matchedEvent.title}: Library closed for today at ${matchedEvent.customHoursText || closeTimeStr}.`,
        nextOpenText: 'Opens tomorrow at 8:00 AM',
        isSpecialWorkingDay: true,
        calendarEvent: matchedEvent,
      };
    }

    return {
      isOpen: true,
      statusText: `OPEN (${matchedEvent.title})`,
      reason: `${matchedEvent.title} — Active Schedule: ${matchedEvent.customHoursText || `${openTimeStr} – ${closeTimeStr}`}`,
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
      reason: 'Central Library is closed on Sundays. Reopens Monday at 8:00 AM.',
      nextOpenText: 'Opens Monday 8:00 AM',
    };
  }

  // 3. Fallback National Gazetted Holiday check
  const holidayCheck = IS_NATIONAL_HOLIDAY(now);
  if (holidayCheck.isHoliday) {
    return {
      isOpen: false,
      statusText: `CLOSED (${holidayCheck.holidayName})`,
      reason: `Central Library is closed today for National Holiday (${holidayCheck.holidayName}).`,
      nextOpenText: 'Reopens next working day 8:00 AM',
      isHoliday: true,
      holidayName: holidayCheck.holidayName,
    };
  }

  // 4. Standard Working Day Operating Hours (8:00 AM - 10:00 PM)
  const openMinutes = 8 * 60;   // 8:00 AM = 480 mins
  const closeMinutes = 22 * 60; // 10:00 PM = 1320 mins

  if (currentMinutes < openMinutes) {
    return {
      isOpen: false,
      statusText: 'CLOSED (Before 8:00 AM)',
      reason: 'Central Library opens at 8:00 AM (Mon – Sat).',
      nextOpenText: 'Opens today at 8:00 AM',
    };
  }

  if (currentMinutes >= closeMinutes) {
    return {
      isOpen: false,
      statusText: 'CLOSED (After 10:00 PM)',
      reason: 'Central Library closes automatically at 10:00 PM. Active visitors auto-checked out.',
      nextOpenText: 'Opens tomorrow at 8:00 AM',
    };
  }

  return {
    isOpen: true,
    statusText: 'OPEN NOW (8:00 AM – 10:00 PM)',
    reason: 'Central Library Circulation Desk & Reading Rooms are open.',
    nextOpenText: 'Closes today at 10:00 PM',
  };
};


const INITIAL_EXTENSION_REQUESTS: ExtensionRequest[] = [
  {
    id: 'ext-1',
    transactionId: 'tx-1001',
    bookId: 'book-1',
    bookTitle: 'Introduction to Algorithms (4th Edition)',
    accessionNo: 'ACC-2024-002',
    barcode: 'BC-99202',
    memberId: 'mem-3',
    memberName: 'Jayendra Majji',
    memberCardNo: 'STU-2026-7326',
    memberRole: 'STUDENT',
    currentDueDate: '2026-08-10',
    requestedExtensionDays: 14,
    reason: 'Requires additional 2 weeks for completing Senior Capstone CS301 project implementation & benchmark testing.',
    status: 'PENDING',
    requestedDate: '2026-07-25 11:30',
  },
  {
    id: 'ext-2',
    transactionId: 'tx-1002',
    bookId: 'book-2',
    bookTitle: 'Modern Operating Systems (5th Edition)',
    accessionNo: 'ACC-2024-011',
    barcode: 'BC-99302',
    memberId: 'mem-2',
    memberName: 'Dr. Sarah Connor',
    memberCardNo: 'FAC-2023-1102',
    memberRole: 'FACULTY',
    currentDueDate: '2026-08-15',
    requestedExtensionDays: 30,
    reason: 'Extended research reference for preparing Advanced Operating Systems lecture notes & lab manual.',
    status: 'PENDING',
    requestedDate: '2026-07-26 14:15',
  },
];

const DEFAULT_VENDORS: Vendor[] = [
  {
    id: 'v-101',
    name: 'Oxford University Press & Book Distributors',
    contactPerson: 'Mr. Rajesh Verma (Senior Sales Director)',
    email: 'academic.orders@oxfordpress.edu.in',
    phone: '+91 98112 34567',
    address: 'Plot 45, Okhla Industrial Area Phase III, New Delhi - 110020',
    rating: 4.9,
    specializationCategories: ['Computer Science', 'Physics', 'Mathematics', 'Literature'],
  },
  {
    id: 'v-102',
    name: 'Pearson Academic Education Supplies Ltd',
    contactPerson: 'Ms. Anita Sharma (Key Accounts Manager)',
    email: 'institutional.sales@pearson.com',
    phone: '+91 98223 45678',
    address: '15th Floor, World Trade Tower, Sector 16, Noida - 201301',
    rating: 4.8,
    specializationCategories: ['Software Engineering', 'Electronics', 'Business & Management'],
  },
  {
    id: 'v-103',
    name: 'McGraw-Hill Higher Education India Pvt Ltd',
    contactPerson: 'Mr. Vikramaditya Singh (Supply Chain Manager)',
    email: 'procurement@mcgrawhill.co.in',
    phone: '+91 98334 56789',
    address: 'B-9, Sector 63, Institutional Area, Noida - 201307',
    rating: 4.7,
    specializationCategories: ['Civil Engineering', 'Mechanical Engineering', 'Chemistry'],
  },
  {
    id: 'v-104',
    name: 'Cambridge University Press Book Logistics',
    contactPerson: 'Dr. S. K. Mukherjee (Academic Liaison)',
    email: 'orders.cambridge@cup.org',
    phone: '+91 98445 67890',
    address: 'C-22, Rajouri Garden Commercial Complex, New Delhi - 110027',
    rating: 4.9,
    specializationCategories: ['AI & ML', 'Biotechnology', 'Law & Social Sciences'],
  },
];

const INITIAL_PROCUREMENT_REQUESTS: ProcurementRequest[] = [
  {
    id: 'proc-1',
    bookTitle: 'Designing Data-Intensive Applications',
    authorName: 'Martin Kleppmann',
    isbn: '978-1449373320',
    publisherName: "O'Reilly Media",
    estimatedPrice: 3200,
    requestedById: '2',
    requestedByName: 'Dr. Sarah Connor',
    requestedByRole: 'FACULTY',
    reason: 'Essential reference text for CS402 Distributed Systems curriculum.',
    status: 'PO_GENERATED',
    requestedDate: '2026-07-20 10:15',
    vendorId: 'v-101',
    vendorName: 'Oxford University Press & Book Distributors',
    poNumber: 'PO-2026-0891',
    poDate: '2026-07-22',
    quantityRequested: 3,
    approvedPrice: 3200,
    timeline: [
      { status: 'PENDING', label: 'Procurement Request Created', timestamp: '2026-07-20 10:15', actorName: 'Dr. Sarah Connor', actorRole: 'FACULTY', notes: 'Submitted via Faculty Portal.' },
      { status: 'UNDER_REVIEW', label: 'Under Library Committee Review', timestamp: '2026-07-21 11:30', actorName: 'Chief Admin Librarian', actorRole: 'ADMIN', notes: 'Syllabus requirement verified.' },
      { status: 'APPROVED', label: 'Approved for Acquisition', timestamp: '2026-07-21 16:45', actorName: 'Head Librarian', actorRole: 'ADMIN', notes: 'Approved for Q3 library budget.' },
      { status: 'PO_GENERATED', label: 'Purchase Order Issued to Vendor', timestamp: '2026-07-22 09:30', actorName: 'Chief Admin Librarian', actorRole: 'ADMIN', notes: 'PO-2026-0891 dispatched to Oxford Press.' },
    ],
  },
  {
    id: 'proc-2',
    bookTitle: 'Reinforcement Learning: An Introduction (2nd Edition)',
    authorName: 'Richard S. Sutton & Andrew G. Barto',
    isbn: '978-0262039246',
    publisherName: 'MIT Press',
    estimatedPrice: 4500,
    requestedById: '3',
    requestedByName: 'Jayendra Majji',
    requestedByRole: 'STUDENT',
    reason: 'Required for B.Tech Senior Year AI/ML Capstone Project.',
    status: 'CATALOGED',
    requestedDate: '2026-07-18 14:20',
    adminNotes: 'Cataloged with Accession No: ACC-2026-901 and assigned to RACK-CS-04.',
    vendorId: 'v-104',
    vendorName: 'Cambridge University Press Book Logistics',
    poNumber: 'PO-2026-0842',
    poDate: '2026-07-19',
    quantityRequested: 2,
    approvedPrice: 4500,
    actualPrice: 4350,
    invoiceNo: 'INV-CUP-9920',
    receivedDate: '2026-07-24',
    receivedQuantity: 2,
    qualityStatus: 'PASSED',
    assignedCategoryId: 'cat-2',
    assignedCategoryName: 'Artificial Intelligence & Data Science',
    assignedRackNumber: 'RACK-CS-04',
    assignedShelfNumber: 'SHELF-A1',
    generatedAccessionNos: ['ACC-2026-901', 'ACC-2026-902'],
    generatedBarcodes: ['BC-99901', 'BC-99902'],
    timeline: [
      { status: 'PENDING', label: 'Procurement Request Created', timestamp: '2026-07-18 14:20', actorName: 'Jayendra Majji', actorRole: 'STUDENT' },
      { status: 'APPROVED', label: 'Approved by Admin Librarian', timestamp: '2026-07-19 10:00', actorName: 'Chief Admin Librarian', actorRole: 'ADMIN' },
      { status: 'PO_GENERATED', label: 'Purchase Order Issued (PO-2026-0842)', timestamp: '2026-07-19 14:00', actorName: 'Chief Admin Librarian', actorRole: 'ADMIN' },
      { status: 'ORDERED', label: 'Dispatched by Supplier', timestamp: '2026-07-20 09:00', actorName: 'Cambridge Logistics', actorRole: 'VENDOR' },
      { status: 'RECEIVED', label: 'Physical Delivery Verified (2 Copies)', timestamp: '2026-07-24 11:30', actorName: 'Library Staff', actorRole: 'ADMIN' },
      { status: 'QUALITY_CHECKED', label: 'Quality Verification PASSED', timestamp: '2026-07-24 14:00', actorName: 'Library Staff', actorRole: 'ADMIN' },
      { status: 'CATALOGED', label: 'Cataloged & Accession Barcodes Generated', timestamp: '2026-07-25 10:15', actorName: 'Chief Admin Librarian', actorRole: 'ADMIN' },
    ],
  },
  {
    id: 'proc-3',
    bookTitle: 'Deep Learning & Computer Vision Handbook',
    authorName: 'Dr. Ian Goodfellow',
    isbn: '978-0262035613',
    publisherName: 'MIT Press',
    estimatedPrice: 3800,
    requestedById: '3',
    requestedByName: 'Jayendra Majji',
    requestedByRole: 'STUDENT',
    reason: 'Neural Networks reference text.',
    status: 'PENDING',
    requestedDate: '2026-07-27 16:30',
    timeline: [
      { status: 'PENDING', label: 'Procurement Request Submitted', timestamp: '2026-07-27 16:30', actorName: 'Jayendra Majji', actorRole: 'STUDENT' },
    ],
  },
];

// Initial Seed Data - All University Academic Departments
const DEFAULT_CATEGORIES: Category[] = [
  { id: 'cat-1', name: 'Computer Science & Software Engineering', code: 'CS', description: 'Algorithms, Software Architecture, Artificial Intelligence, Cybersecurity & Systems', bookCount: 18 },
  { id: 'cat-2', name: 'Artificial Intelligence & Data Science', code: 'AIDS', description: 'Machine Learning, Deep Learning, Neural Networks, Computer Vision & Big Analytics', bookCount: 15 },
  { id: 'cat-3', name: 'Information Technology & Cloud Systems', code: 'IT', description: 'Cloud Computing, DevOps, Networking, Web Technologies & Database Engineering', bookCount: 14 },
  { id: 'cat-4', name: 'Electronics & Communication Engineering', code: 'ECE', description: 'VLSI, Embedded Systems, Signal Processing, Telecommunications & Wireless Networks', bookCount: 12 },
  { id: 'cat-5', name: 'Electrical & Electronics Engineering', code: 'EEE', description: 'Power Systems, Control Engineering, Electrical Machines & Microcontrollers', bookCount: 10 },
  { id: 'cat-6', name: 'Mechanical Engineering & Mechatronics', code: 'ME', description: 'Thermodynamics, CAD/CAM, Robotics, Fluid Mechanics & Automobile Systems', bookCount: 11 },
  { id: 'cat-7', name: 'Civil & Structural Engineering', code: 'CIVIL', description: 'Structural Analysis, Transportation Engineering, Surveying & Geotechnical Studies', bookCount: 9 },
  { id: 'cat-8', name: 'Chemical & Materials Engineering', code: 'CHEM-ENG', description: 'Process Engineering, Chemical Reaction, Polymer Science & Nanotechnology', bookCount: 8 },
  { id: 'cat-9', name: 'Aerospace & Aeronautical Engineering', code: 'AERO', description: 'Aerodynamics, Propulsion, Flight Mechanics, Avionics & Space Systems', bookCount: 7 },
  { id: 'cat-10', name: 'Biotechnology & Bio-Engineering', code: 'BIOTECH', description: 'Genomics, Molecular Biology, Bioinformatics, Bioprocess & Genetics', bookCount: 8 },
  { id: 'cat-11', name: 'Physics & Applied Physical Sciences', code: 'PHY', description: 'Quantum Physics, Semiconductor Physics, Optics, Electromagnetism & Thermodynamics', bookCount: 9 },
  { id: 'cat-12', name: 'Chemistry & Chemical Sciences', code: 'CHEM', description: 'Organic Chemistry, Inorganic Chemistry, Physical Chemistry & Spectroscopy', bookCount: 7 },
  { id: 'cat-13', name: 'Mathematics & Statistics', code: 'MATH', description: 'Linear Algebra, Calculus, Discrete Mathematics, Probability & Differential Equations', bookCount: 10 },
  { id: 'cat-14', name: 'Business Administration & Management (MBA)', code: 'MBA', description: 'Strategic Management, Operations, Financial Accounting, HR & Marketing', bookCount: 12 },
  { id: 'cat-15', name: 'Commerce, Finance & Banking', code: 'BCOM', description: 'Corporate Accounting, Taxation, Investment Banking & Financial Markets', bookCount: 9 },
  { id: 'cat-16', name: 'Economics & Public Policy', code: 'ECON', description: 'Microeconomics, Macroeconomics, Econometrics, International Trade & Public Policy', bookCount: 8 },
  { id: 'cat-17', name: 'Humanities & Social Sciences', code: 'HUM', description: 'Philosophy, Sociology, Technical Communication, Ethics & World History', bookCount: 10 },
  { id: 'cat-18', name: 'Law, Legal Studies & Intellectual Property', code: 'LAW', description: 'Constitutional Law, Cyber Law, IP Rights, Corporate Jurisprudence & Ethics', bookCount: 7 },
  { id: 'cat-19', name: 'Medical Sciences, Nursing & Pharmacy', code: 'MED', description: 'Anatomy, Pharmacology, Pathology, Biochemistry & Healthcare Administration', bookCount: 11 },
  { id: 'cat-20', name: 'Architecture, Urban Planning & Design', code: 'ARCH', description: 'Building Construction, Environmental Planning, Interior Design & Urban Architecture', bookCount: 6 },
  { id: 'cat-21', name: 'Environmental Science & Sustainability', code: 'ENV', description: 'Ecology, Renewable Energy, Environmental Impact Assessment & Sustainability', bookCount: 7 },
  { id: 'cat-22', name: 'Psychology & Behavioral Sciences', code: 'PSY', description: 'Cognitive Psychology, Organizational Behavior, Neuropsychology & Psychometrics', bookCount: 6 },
];

const DEFAULT_AUTHORS: Author[] = [
  { id: 'auth-1', name: 'Dr. Thomas H. Cormen', biography: 'Professor Emeritus of Computer Science at Dartmouth College.', email: 'cormen@dartmouth.edu', bookCount: 4 },
  { id: 'auth-2', name: 'Andrew S. Tanenbaum', biography: 'Renowned computer scientist and author of operating system textbooks.', email: 'ast@vu.nl', bookCount: 3 },
  { id: 'auth-3', name: 'Robert C. Martin (Uncle Bob)', biography: 'Acclaimed software engineer and author of Clean Code.', email: 'unclebob@cleancoder.com', bookCount: 2 },
  { id: 'auth-4', name: 'Dr. Ben G. Streetman', biography: 'Pioneer in Solid State Electronic Devices research.', email: 'streetman@engr.utexas.edu', bookCount: 2 },
  { id: 'auth-5', name: 'Gilbert Strang', biography: 'Professor of Mathematics at MIT.', email: 'strang@math.mit.edu', bookCount: 3 },
];

const DEFAULT_PUBLISHERS: Publisher[] = [
  { id: 'pub-1', name: 'MIT Press', address: 'Cambridge, MA, USA', contactPerson: 'John Executive', bookCount: 10 },
  { id: 'pub-2', name: 'Pearson Education', address: 'London, UK', contactPerson: 'Sarah Senior', bookCount: 15 },
  { id: 'pub-3', name: 'Prentice Hall', address: 'Upper Saddle River, NJ', contactPerson: 'David Editor', bookCount: 8 },
  { id: 'pub-4', name: 'Springer Nature', address: 'Berlin, Germany', contactPerson: 'Dr. Klaus Muller', bookCount: 9 },
];

const DEFAULT_BOOKS: Book[] = [
  {
    id: 'book-1',
    title: 'Artificial Intelligence: A Modern Approach (4th Edition)',
    isbn: '978-0134610993',
    categoryId: 'cat-1',
    categoryName: 'Computer Science & Software',
    authorId: 'auth-1',
    authorName: 'Dr. Thomas H. Cormen',
    publisherId: 'pub-2',
    publisherName: 'Pearson Education',
    edition: '4th Edition',
    publishingYear: 2020,
    language: 'English',
    price: 110.00,
    description: 'The standard and comprehensive textbook for artificial intelligence, covering search algorithms, machine learning, deep neural networks, and robotics.',
    coverUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=400&q=80',
    totalCopies: 10,
    availableCopies: 7,
    isFeatured: true,
    isBookOfMonth: true,
    rackNumber: 'RACK-CS-01',
    shelfNumber: 'SHELF-A1',
    department: 'Computer Applications (BCA/MCA)',
    format: 'HYBRID',
    digitalUrl: 'https://openlibrary.org/books/OL28259468M/Artificial_Intelligence',
    borrowCount: 42,
    copies: Array.from({ length: 10 }, (_, i) => ({
      id: `copy-10${i + 1}`,
      bookId: 'book-1',
      accessionNo: `ACC-2024-00${i + 1}`,
      barcode: `BC-9910${i + 1}`,
      qrCode: `QR-9910${i + 1}`,
      rackNumber: 'RACK-CS-01',
      shelfNumber: 'SHELF-A1',
      status: i < 7 ? 'AVAILABLE' : 'ISSUED',
      condition: i % 4 === 0 ? 'NEW' : 'GOOD',
      addedDate: '2024-01-10',
      isReferenceOnly: i === 0,
    })),
  },
  {
    id: 'book-2',
    title: 'Introduction to Algorithms (4th Edition)',
    isbn: '978-0262046305',
    categoryId: 'cat-1',
    categoryName: 'Computer Science & Software',
    authorId: 'auth-1',
    authorName: 'Dr. Thomas H. Cormen',
    publisherId: 'pub-1',
    publisherName: 'MIT Press',
    edition: '4th Edition',
    publishingYear: 2022,
    language: 'English',
    price: 89.99,
    description: 'Comprehensive reference text on algorithms, data structures, dynamic programming, and graph algorithms.',
    coverUrl: 'https://images.unsplash.com/photo-1532012197267-da84d127e765?auto=format&fit=crop&w=400&q=80',
    totalCopies: 10,
    availableCopies: 8,
    isFeatured: true,
    isBookOfMonth: false,
    rackNumber: 'RACK-CS-01',
    shelfNumber: 'SHELF-A2',
    department: 'Engineering & Technology',
    format: 'PHYSICAL',
    borrowCount: 56,
    copies: Array.from({ length: 10 }, (_, i) => ({
      id: `copy-20${i + 1}`,
      bookId: 'book-2',
      accessionNo: `ACC-2024-01${i + 1}`,
      barcode: `BC-9920${i + 1}`,
      qrCode: `QR-9920${i + 1}`,
      rackNumber: 'RACK-CS-01',
      shelfNumber: 'SHELF-A2',
      status: i < 8 ? 'AVAILABLE' : 'ISSUED',
      condition: i % 3 === 0 ? 'NEW' : 'GOOD',
      addedDate: '2024-01-12',
      isReferenceOnly: i === 0,
    })),
  },
  {
    id: 'book-3',
    title: 'Modern Operating Systems (5th Edition)',
    isbn: '978-0137576242',
    categoryId: 'cat-1',
    categoryName: 'Computer Science & Software',
    authorId: 'auth-2',
    authorName: 'Andrew S. Tanenbaum',
    publisherId: 'pub-2',
    publisherName: 'Pearson Education',
    edition: '5th Edition',
    publishingYear: 2023,
    language: 'English',
    price: 94.50,
    description: 'Definitive guide on modern operating system design, process synchronization, memory virtualization, and file systems.',
    coverUrl: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=400&q=80',
    totalCopies: 10,
    availableCopies: 6,
    isFeatured: true,
    isBookOfMonth: false,
    rackNumber: 'RACK-CS-02',
    shelfNumber: 'SHELF-B1',
    department: 'Computer Applications (BCA/MCA)',
    format: 'PHYSICAL',
    borrowCount: 38,
    copies: Array.from({ length: 10 }, (_, i) => ({
      id: `copy-30${i + 1}`,
      bookId: 'book-3',
      accessionNo: `ACC-2024-02${i + 1}`,
      barcode: `BC-9930${i + 1}`,
      qrCode: `QR-9930${i + 1}`,
      rackNumber: 'RACK-CS-02',
      shelfNumber: 'SHELF-B1',
      status: i < 6 ? 'AVAILABLE' : 'ISSUED',
      condition: 'GOOD',
      addedDate: '2024-01-15',
      isReferenceOnly: i === 0,
    })),
  },
  {
    id: 'book-4',
    title: 'Clean Code: A Handbook of Agile Software Craftsmanship',
    isbn: '978-0132350884',
    categoryId: 'cat-1',
    categoryName: 'Computer Science & Software',
    authorId: 'auth-3',
    authorName: 'Robert C. Martin (Uncle Bob)',
    publisherId: 'pub-3',
    publisherName: 'Prentice Hall',
    edition: '1st Edition',
    publishingYear: 2008,
    language: 'English',
    price: 49.99,
    description: 'Essential principles, patterns, and refactoring practices for writing readable, maintainable software.',
    coverUrl: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=400&q=80',
    totalCopies: 10,
    availableCopies: 9,
    isFeatured: true,
    isBookOfMonth: false,
    rackNumber: 'RACK-CS-03',
    shelfNumber: 'SHELF-C2',
    department: 'Engineering & Technology',
    format: 'HYBRID',
    digitalUrl: 'https://openlibrary.org/books/OL22854907M/Clean_Code',
    borrowCount: 65,
    copies: Array.from({ length: 10 }, (_, i) => ({
      id: `copy-40${i + 1}`,
      bookId: 'book-4',
      accessionNo: `ACC-2024-03${i + 1}`,
      barcode: `BC-9940${i + 1}`,
      qrCode: `QR-9940${i + 1}`,
      rackNumber: 'RACK-CS-03',
      shelfNumber: 'SHELF-C2',
      status: i < 9 ? 'AVAILABLE' : 'ISSUED',
      condition: 'GOOD',
      addedDate: '2024-01-18',
      isReferenceOnly: i === 0,
    })),
  },
  {
    id: 'book-5',
    title: 'Database System Concepts (7th Edition)',
    isbn: '978-0078022159',
    categoryId: 'cat-1',
    categoryName: 'Computer Science & Software',
    authorId: 'auth-2',
    authorName: 'Andrew S. Tanenbaum',
    publisherId: 'pub-1',
    publisherName: 'MIT Press',
    edition: '7th Edition',
    publishingYear: 2019,
    language: 'English',
    price: 98.00,
    description: 'Fundamental guide to relational algebra, SQL optimization, transaction management, and NoSQL databases.',
    coverUrl: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=400&q=80',
    totalCopies: 10,
    availableCopies: 8,
    isFeatured: false,
    isBookOfMonth: false,
    rackNumber: 'RACK-CS-04',
    shelfNumber: 'SHELF-C3',
    department: 'Computer Applications (BCA/MCA)',
    format: 'PHYSICAL',
    borrowCount: 31,
    copies: Array.from({ length: 10 }, (_, i) => ({
      id: `copy-50${i + 1}`,
      bookId: 'book-5',
      accessionNo: `ACC-2024-04${i + 1}`,
      barcode: `BC-9950${i + 1}`,
      qrCode: `QR-9950${i + 1}`,
      rackNumber: 'RACK-CS-04',
      shelfNumber: 'SHELF-C3',
      status: i < 8 ? 'AVAILABLE' : 'ISSUED',
      condition: 'NEW',
      addedDate: '2024-01-20',
      isReferenceOnly: i === 0,
    })),
  },
  {
    id: 'book-6',
    title: 'Solid State Electronic Devices',
    isbn: '978-0133356038',
    categoryId: 'cat-4',
    categoryName: 'Electronics & Communication Engineering',
    authorId: 'auth-4',
    authorName: 'Dr. Ben G. Streetman',
    publisherId: 'pub-2',
    publisherName: 'Pearson Education',
    edition: '7th Edition',
    publishingYear: 2016,
    language: 'English',
    price: 78.00,
    description: 'Fundamental concepts of semiconductor physics, PN junctions, MOSFETs, and optoelectronic devices.',
    coverUrl: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=400&q=80',
    totalCopies: 10,
    availableCopies: 7,
    isFeatured: false,
    isBookOfMonth: false,
    rackNumber: 'RACK-ECE-01',
    shelfNumber: 'SHELF-A1',
    department: 'Engineering & Technology',
    format: 'PHYSICAL',
    borrowCount: 22,
    copies: Array.from({ length: 10 }, (_, i) => ({
      id: `copy-60${i + 1}`,
      bookId: 'book-6',
      accessionNo: `ACC-2024-05${i + 1}`,
      barcode: `BC-9960${i + 1}`,
      qrCode: `QR-9960${i + 1}`,
      rackNumber: 'RACK-ECE-01',
      shelfNumber: 'SHELF-A1',
      status: i < 7 ? 'AVAILABLE' : 'ISSUED',
      condition: 'GOOD',
      addedDate: '2024-02-01',
      isReferenceOnly: i === 0,
    })),
  },
  {
    id: 'book-7',
    title: "Shigley's Mechanical Engineering Design",
    isbn: '978-0073398204',
    categoryId: 'cat-6',
    categoryName: 'Mechanical Engineering & Mechatronics',
    authorId: 'auth-4',
    authorName: 'Dr. Ben G. Streetman',
    publisherId: 'pub-4',
    publisherName: 'Springer Nature',
    edition: '11th Edition',
    publishingYear: 2020,
    language: 'English',
    price: 115.00,
    description: 'Comprehensive guide to machine element design, stress analysis, fatigue failure, gear systems, and shafts.',
    coverUrl: 'https://images.unsplash.com/photo-1537462715879-360eeb61a0ad?auto=format&fit=crop&w=400&q=80',
    totalCopies: 10,
    availableCopies: 8,
    isFeatured: true,
    isBookOfMonth: false,
    rackNumber: 'RACK-ME-01',
    shelfNumber: 'SHELF-A3',
    department: 'Engineering & Technology',
    format: 'PHYSICAL',
    borrowCount: 28,
    copies: Array.from({ length: 10 }, (_, i) => ({
      id: `copy-70${i + 1}`,
      bookId: 'book-7',
      accessionNo: `ACC-2024-06${i + 1}`,
      barcode: `BC-9970${i + 1}`,
      qrCode: `QR-9970${i + 1}`,
      rackNumber: 'RACK-ME-01',
      shelfNumber: 'SHELF-A3',
      status: i < 8 ? 'AVAILABLE' : 'ISSUED',
      condition: 'GOOD',
      addedDate: '2024-02-05',
      isReferenceOnly: i === 0,
    })),
  },
  {
    id: 'book-8',
    title: 'Linear Algebra and Its Applications',
    isbn: '978-0321982384',
    categoryId: 'cat-13',
    categoryName: 'Mathematics & Statistics',
    authorId: 'auth-5',
    authorName: 'Gilbert Strang',
    publisherId: 'pub-4',
    publisherName: 'Springer Nature',
    edition: '5th Edition',
    publishingYear: 2021,
    language: 'English',
    price: 65.00,
    description: 'Matrix theory, vector spaces, eigenvalues, singular value decomposition, and computational application.',
    coverUrl: 'https://images.unsplash.com/photo-1509228468518-180dd4864904?auto=format&fit=crop&w=400&q=80',
    totalCopies: 10,
    availableCopies: 9,
    isFeatured: true,
    isBookOfMonth: false,
    rackNumber: 'RACK-MATH-02',
    shelfNumber: 'SHELF-D3',
    department: 'Science & Physical Sciences',
    format: 'HYBRID',
    digitalUrl: 'https://openlibrary.org/books/OL3142828M/Linear_Algebra',
    borrowCount: 47,
    copies: Array.from({ length: 10 }, (_, i) => ({
      id: `copy-80${i + 1}`,
      bookId: 'book-8',
      accessionNo: `ACC-2024-07${i + 1}`,
      barcode: `BC-9980${i + 1}`,
      qrCode: `QR-9980${i + 1}`,
      rackNumber: 'RACK-MATH-02',
      shelfNumber: 'SHELF-D3',
      status: i < 9 ? 'AVAILABLE' : 'ISSUED',
      condition: 'NEW',
      addedDate: '2024-02-10',
      isReferenceOnly: i === 0,
    })),
  },
  {
    id: 'book-ref-1',
    title: 'Oxford Reference Handbook of Computer Science & Engineering (Library Reference Edition)',
    isbn: '978-0199571123',
    categoryId: 'cat-1',
    categoryName: 'Computer Science & Software',
    authorId: 'auth-1',
    authorName: 'Dr. Thomas H. Cormen',
    publisherId: 'pub-1',
    publisherName: 'Oxford University Press',
    edition: 'Reference Edition',
    publishingYear: 2024,
    language: 'English',
    price: 185.00,
    description: 'Library Reading Room Reference Handbook. Restricted for reference use inside the library only. Barcode generated for catalog audit, not for checkout.',
    coverUrl: 'https://images.unsplash.com/photo-1532012197267-da84d127e765?auto=format&fit=crop&w=400&q=80',
    totalCopies: 5,
    availableCopies: 5,
    isFeatured: true,
    isBookOfMonth: false,
    rackNumber: 'RACK-REF-01',
    shelfNumber: 'SHELF-REF-A1',
    department: 'Computer Science & Engineering',
    format: 'PHYSICAL',
    collectionType: 'REFERENCE',
    isReferenceOnly: true,
    borrowCount: 0,
    copies: Array.from({ length: 5 }, (_, i) => ({
      id: `copy-ref-0${i + 1}`,
      bookId: 'book-ref-1',
      accessionNo: `ACC-REF-00${i + 1}`,
      barcode: `BC-REF-00${i + 1}`,
      qrCode: `QR-REF-00${i + 1}`,
      rackNumber: 'RACK-REF-01',
      shelfNumber: 'SHELF-REF-A1',
      status: 'AVAILABLE',
      condition: 'NEW',
      addedDate: '2024-03-01',
      isReferenceOnly: true,
    })),
  },
  {
    id: 'book-ref-2',
    title: 'Encyclopedic Dictionary of Electronics & Communication Engineering (Reference Edition)',
    isbn: '978-0471393740',
    categoryId: 'cat-4',
    categoryName: 'Electronics & Communication Engineering',
    authorId: 'auth-4',
    authorName: 'Dr. Ben G. Streetman',
    publisherId: 'pub-4',
    publisherName: 'Springer Nature',
    edition: 'Reference Edition',
    publishingYear: 2023,
    language: 'English',
    price: 210.00,
    description: 'Specialized Reference Encyclopedia for semiconductor physics, RF communication, and signal processing. Restricted for reading room reference only.',
    coverUrl: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=400&q=80',
    totalCopies: 4,
    availableCopies: 4,
    isFeatured: true,
    isBookOfMonth: false,
    rackNumber: 'RACK-REF-02',
    shelfNumber: 'SHELF-REF-B1',
    department: 'Electronics & Communication Engineering',
    format: 'PHYSICAL',
    collectionType: 'REFERENCE',
    isReferenceOnly: true,
    borrowCount: 0,
    copies: Array.from({ length: 4 }, (_, i) => ({
      id: `copy-ref-1${i + 1}`,
      bookId: 'book-ref-2',
      accessionNo: `ACC-REF-10${i + 1}`,
      barcode: `BC-REF-10${i + 1}`,
      qrCode: `QR-REF-10${i + 1}`,
      rackNumber: 'RACK-REF-02',
      shelfNumber: 'SHELF-REF-B1',
      status: 'AVAILABLE',
      condition: 'NEW',
      addedDate: '2024-03-05',
      isReferenceOnly: true,
    })),
  },
  {
    id: 'book-ref-3',
    title: 'CRC Handbook of Mechanical Engineering Reference Data',
    isbn: '978-0849308666',
    categoryId: 'cat-6',
    categoryName: 'Mechanical Engineering & Mechatronics',
    authorId: 'auth-4',
    authorName: 'Dr. Ben G. Streetman',
    publisherId: 'pub-4',
    publisherName: 'Springer Nature',
    edition: 'Reference Edition',
    publishingYear: 2024,
    language: 'English',
    price: 195.00,
    description: 'Comprehensive engineering tables, formulas, and material property reference manual. Restricted for reading room reference only.',
    coverUrl: 'https://images.unsplash.com/photo-1537462715879-360eeb61a0ad?auto=format&fit=crop&w=400&q=80',
    totalCopies: 4,
    availableCopies: 4,
    isFeatured: true,
    isBookOfMonth: false,
    rackNumber: 'RACK-REF-03',
    shelfNumber: 'SHELF-REF-C1',
    department: 'Mechanical Engineering',
    format: 'PHYSICAL',
    collectionType: 'REFERENCE',
    isReferenceOnly: true,
    borrowCount: 0,
    copies: Array.from({ length: 4 }, (_, i) => ({
      id: `copy-ref-2${i + 1}`,
      bookId: 'book-ref-3',
      accessionNo: `ACC-REF-20${i + 1}`,
      barcode: `BC-REF-20${i + 1}`,
      qrCode: `QR-REF-20${i + 1}`,
      rackNumber: 'RACK-REF-03',
      shelfNumber: 'SHELF-REF-C1',
      status: 'AVAILABLE',
      condition: 'NEW',
      addedDate: '2024-03-10',
      isReferenceOnly: true,
    })),
  },
  {
    id: 'book-9',
    title: 'Principles of Marketing (18th Edition)',
    isbn: '978-0135766606',
    categoryId: 'cat-14',
    categoryName: 'Business Administration & Management (MBA)',
    authorId: 'auth-3',
    authorName: 'Robert C. Martin (Uncle Bob)',
    publisherId: 'pub-2',
    publisherName: 'Pearson Education',
    edition: '18th Edition',
    publishingYear: 2021,
    language: 'English',
    price: 85.00,
    description: 'Framework for customer value creation, digital brand positioning, analytics, and market segmentation.',
    coverUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=400&q=80',
    totalCopies: 10,
    availableCopies: 7,
    isFeatured: false,
    isBookOfMonth: false,
    rackNumber: 'RACK-MBA-01',
    shelfNumber: 'SHELF-A1',
    department: 'Management (MBA/BBA)',
    format: 'PHYSICAL',
    borrowCount: 33,
    copies: Array.from({ length: 10 }, (_, i) => ({
      id: `copy-90${i + 1}`,
      bookId: 'book-9',
      accessionNo: `ACC-2024-08${i + 1}`,
      barcode: `BC-9990${i + 1}`,
      qrCode: `QR-9990${i + 1}`,
      rackNumber: 'RACK-MBA-01',
      shelfNumber: 'SHELF-A1',
      status: i < 7 ? 'AVAILABLE' : 'ISSUED',
      condition: 'GOOD',
      addedDate: '2024-02-12',
    })),
  },
  {
    id: 'book-10',
    title: 'Guyton and Hall Textbook of Medical Physiology',
    isbn: '978-0323597128',
    categoryId: 'cat-19',
    categoryName: 'Medical Sciences, Nursing & Pharmacy',
    authorId: 'auth-4',
    authorName: 'Dr. Ben G. Streetman',
    publisherId: 'pub-4',
    publisherName: 'Springer Nature',
    edition: '14th Edition',
    publishingYear: 2021,
    language: 'English',
    price: 140.00,
    description: 'Gold standard textbook covering human organ systems, cardiovascular dynamics, neurophysiology, and metabolic control.',
    coverUrl: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=400&q=80',
    totalCopies: 10,
    availableCopies: 8,
    isFeatured: true,
    isBookOfMonth: false,
    rackNumber: 'RACK-MED-01',
    shelfNumber: 'SHELF-A1',
    department: 'Medical & Life Sciences',
    format: 'HYBRID',
    digitalUrl: 'https://openlibrary.org/books/OL28192301M/Medical_Physiology',
    borrowCount: 51,
    copies: Array.from({ length: 10 }, (_, i) => ({
      id: `copy-100${i + 1}`,
      bookId: 'book-10',
      accessionNo: `ACC-2024-09${i + 1}`,
      barcode: `BC-9991${i + 1}`,
      qrCode: `QR-9991${i + 1}`,
      rackNumber: 'RACK-MED-01',
      shelfNumber: 'SHELF-A1',
      status: i < 8 ? 'AVAILABLE' : 'ISSUED',
      condition: 'NEW',
      addedDate: '2024-02-15',
    })),
  },
  {
    id: 'book-11',
    title: 'Corporate Finance (12th Edition)',
    isbn: '978-1259918940',
    categoryId: 'cat-15',
    categoryName: 'Commerce, Finance & Banking',
    authorId: 'auth-3',
    authorName: 'Robert C. Martin (Uncle Bob)',
    publisherId: 'pub-2',
    publisherName: 'Pearson Education',
    edition: '12th Edition',
    publishingYear: 2020,
    language: 'English',
    price: 92.00,
    description: 'Capital structure, risk management, asset pricing, valuation models, and dividend policies.',
    coverUrl: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=400&q=80',
    totalCopies: 10,
    availableCopies: 9,
    isFeatured: false,
    isBookOfMonth: false,
    rackNumber: 'RACK-FIN-01',
    shelfNumber: 'SHELF-A1',
    department: 'Commerce & Finance',
    format: 'PHYSICAL',
    borrowCount: 26,
    copies: Array.from({ length: 10 }, (_, i) => ({
      id: `copy-110${i + 1}`,
      bookId: 'book-11',
      accessionNo: `ACC-2024-10${i + 1}`,
      barcode: `BC-9992${i + 1}`,
      qrCode: `QR-9992${i + 1}`,
      rackNumber: 'RACK-FIN-01',
      shelfNumber: 'SHELF-A1',
      status: i < 9 ? 'AVAILABLE' : 'ISSUED',
      condition: 'GOOD',
      addedDate: '2024-02-18',
    })),
  },
  {
    id: 'book-12',
    title: 'Constitutional Law of India (5th Edition)',
    isbn: '978-9388548234',
    categoryId: 'cat-18',
    categoryName: 'Law, Legal Studies & Intellectual Property',
    authorId: 'auth-5',
    authorName: 'Gilbert Strang',
    publisherId: 'pub-4',
    publisherName: 'Springer Nature',
    edition: '5th Edition',
    publishingYear: 2022,
    language: 'English',
    price: 110.00,
    description: 'Authoritative analysis of fundamental rights, judicial precedents, constitutional amendments, and federal principles.',
    coverUrl: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=400&q=80',
    totalCopies: 10,
    availableCopies: 8,
    isFeatured: true,
    isBookOfMonth: false,
    rackNumber: 'RACK-LAW-01',
    shelfNumber: 'SHELF-A1',
    department: 'Law & Jurisprudence',
    format: 'PHYSICAL',
    borrowCount: 39,
    copies: Array.from({ length: 10 }, (_, i) => ({
      id: `copy-120${i + 1}`,
      bookId: 'book-12',
      accessionNo: `ACC-2024-11${i + 1}`,
      barcode: `BC-9993${i + 1}`,
      qrCode: `QR-9993${i + 1}`,
      rackNumber: 'RACK-LAW-01',
      shelfNumber: 'SHELF-A1',
      status: i < 8 ? 'AVAILABLE' : 'ISSUED',
      condition: 'NEW',
      addedDate: '2024-02-20',
    })),
  },
  {
    id: 'book-13',
    title: 'Pharmacology & Therapeutics (8th Edition)',
    isbn: '978-0702074486',
    categoryId: 'cat-19',
    categoryName: 'Medical Sciences, Nursing & Pharmacy',
    authorId: 'auth-4',
    authorName: 'Dr. Ben G. Streetman',
    publisherId: 'pub-4',
    publisherName: 'Springer Nature',
    edition: '8th Edition',
    publishingYear: 2021,
    language: 'English',
    price: 125.00,
    description: 'Pharmacokinetics, drug interactions, clinical dosage, and therapeutic mechanisms across organ systems.',
    coverUrl: 'https://images.unsplash.com/photo-1471864190281-a93a3070b6de?auto=format&fit=crop&w=400&q=80',
    totalCopies: 10,
    availableCopies: 7,
    isFeatured: false,
    isBookOfMonth: false,
    rackNumber: 'RACK-PHARM-01',
    shelfNumber: 'SHELF-A1',
    department: 'Pharmacy & Pharmaceutical Sciences',
    format: 'HYBRID',
    digitalUrl: 'https://openlibrary.org/books/OL29103982M/Pharmacology',
    borrowCount: 29,
    copies: Array.from({ length: 10 }, (_, i) => ({
      id: `copy-130${i + 1}`,
      bookId: 'book-13',
      accessionNo: `ACC-2024-12${i + 1}`,
      barcode: `BC-9994${i + 1}`,
      qrCode: `QR-9994${i + 1}`,
      rackNumber: 'RACK-PHARM-01',
      shelfNumber: 'SHELF-A1',
      status: i < 7 ? 'AVAILABLE' : 'ISSUED',
      condition: 'GOOD',
      addedDate: '2024-02-22',
    })),
  },
  {
    id: 'book-14',
    title: 'Building Construction & Architecture Design',
    isbn: '978-1118886885',
    categoryId: 'cat-20',
    categoryName: 'Architecture, Urban Planning & Design',
    authorId: 'auth-1',
    authorName: 'Dr. Thomas H. Cormen',
    publisherId: 'pub-1',
    publisherName: 'MIT Press',
    edition: '6th Edition',
    publishingYear: 2019,
    language: 'English',
    price: 105.00,
    description: 'Architectural structural design, building materials, sustainable urban construction, and spatial planning.',
    coverUrl: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=400&q=80',
    totalCopies: 10,
    availableCopies: 8,
    isFeatured: true,
    isBookOfMonth: false,
    rackNumber: 'RACK-ARCH-01',
    shelfNumber: 'SHELF-A1',
    department: 'Architecture & Design',
    format: 'PHYSICAL',
    borrowCount: 34,
    copies: Array.from({ length: 10 }, (_, i) => ({
      id: `copy-140${i + 1}`,
      bookId: 'book-14',
      accessionNo: `ACC-2024-13${i + 1}`,
      barcode: `BC-9995${i + 1}`,
      qrCode: `QR-9995${i + 1}`,
      rackNumber: 'RACK-ARCH-01',
      shelfNumber: 'SHELF-A1',
      status: i < 8 ? 'AVAILABLE' : 'ISSUED',
      condition: 'NEW',
      addedDate: '2024-02-25',
    })),
  },
  {
    id: 'book-15',
    title: 'Principles of Agricultural Science & Agronomy',
    isbn: '978-0135124185',
    categoryId: 'cat-21',
    categoryName: 'Environmental Science & Sustainability',
    authorId: 'auth-5',
    authorName: 'Gilbert Strang',
    publisherId: 'pub-2',
    publisherName: 'Pearson Education',
    edition: '4th Edition',
    publishingYear: 2021,
    language: 'English',
    price: 79.00,
    description: 'Soil management, crop biotechnology, precision agriculture technology, and environmental sustainability.',
    coverUrl: 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=400&q=80',
    totalCopies: 10,
    availableCopies: 9,
    isFeatured: false,
    isBookOfMonth: false,
    rackNumber: 'RACK-AGRI-01',
    shelfNumber: 'SHELF-A1',
    department: 'Agriculture & Environmental Science',
    format: 'PHYSICAL',
    borrowCount: 21,
    copies: Array.from({ length: 10 }, (_, i) => ({
      id: `copy-150${i + 1}`,
      bookId: 'book-15',
      accessionNo: `ACC-2024-14${i + 1}`,
      barcode: `BC-9996${i + 1}`,
      qrCode: `QR-9996${i + 1}`,
      rackNumber: 'RACK-AGRI-01',
      shelfNumber: 'SHELF-A1',
      status: i < 9 ? 'AVAILABLE' : 'ISSUED',
      condition: 'GOOD',
      addedDate: '2024-02-28',
    })),
  },
  {
    id: 'book-16',
    title: 'Ethics & Professional Values in Technical World',
    isbn: '978-0072831535',
    categoryId: 'cat-17',
    categoryName: 'Humanities & Social Sciences',
    authorId: 'auth-3',
    authorName: 'Robert C. Martin (Uncle Bob)',
    publisherId: 'pub-3',
    publisherName: 'Prentice Hall',
    edition: '3rd Edition',
    publishingYear: 2020,
    language: 'English',
    price: 55.00,
    description: 'Professional engineering codes of ethics, corporate social responsibility, and human rights.',
    coverUrl: 'https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=400&q=80',
    totalCopies: 10,
    availableCopies: 8,
    isFeatured: false,
    isBookOfMonth: false,
    rackNumber: 'RACK-HUM-01',
    shelfNumber: 'SHELF-A1',
    department: 'Arts & Humanities',
    format: 'PHYSICAL',
    borrowCount: 19,
    copies: Array.from({ length: 10 }, (_, i) => ({
      id: `copy-160${i + 1}`,
      bookId: 'book-16',
      accessionNo: `ACC-2024-15${i + 1}`,
      barcode: `BC-9997${i + 1}`,
      qrCode: `QR-9997${i + 1}`,
      rackNumber: 'RACK-HUM-01',
      shelfNumber: 'SHELF-A1',
      status: i < 8 ? 'AVAILABLE' : 'ISSUED',
      condition: 'GOOD',
      addedDate: '2024-03-01',
    })),
  },
  {
    id: 'book-17',
    title: 'Brunner & Suddarth Textbook of Medical-Surgical Nursing',
    isbn: '978-1975161033',
    categoryId: 'cat-19',
    categoryName: 'Medical Sciences, Nursing & Pharmacy',
    authorId: 'auth-4',
    authorName: 'Dr. Ben G. Streetman',
    publisherId: 'pub-4',
    publisherName: 'Springer Nature',
    edition: '15th Edition',
    publishingYear: 2022,
    language: 'English',
    price: 135.00,
    description: 'Clinical nursing management, patient care protocols, surgical interventions, and critical care nursing.',
    coverUrl: 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=400&q=80',
    totalCopies: 10,
    availableCopies: 7,
    isFeatured: true,
    isBookOfMonth: false,
    rackNumber: 'RACK-NURS-01',
    shelfNumber: 'SHELF-A1',
    department: 'Nursing & Healthcare',
    format: 'HYBRID',
    digitalUrl: 'https://openlibrary.org/books/OL32910291M/Surgical_Nursing',
    borrowCount: 44,
    copies: Array.from({ length: 10 }, (_, i) => ({
      id: `copy-170${i + 1}`,
      bookId: 'book-17',
      accessionNo: `ACC-2024-16${i + 1}`,
      barcode: `BC-9998${i + 1}`,
      qrCode: `QR-9998${i + 1}`,
      rackNumber: 'RACK-NURS-01',
      shelfNumber: 'SHELF-A1',
      status: i < 7 ? 'AVAILABLE' : 'ISSUED',
      condition: 'NEW',
      addedDate: '2024-03-05',
    })),
  },
  {
    id: 'book-18',
    title: 'Mass Communication & Digital Journalism Principles',
    isbn: '978-1544382999',
    categoryId: 'cat-17',
    categoryName: 'Humanities & Social Sciences',
    authorId: 'auth-2',
    authorName: 'Andrew S. Tanenbaum',
    publisherId: 'pub-2',
    publisherName: 'Pearson Education',
    edition: '5th Edition',
    publishingYear: 2021,
    language: 'English',
    price: 68.00,
    description: 'Media broadcasting, investigative reporting, digital news publishing, and media ethics.',
    coverUrl: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&w=400&q=80',
    totalCopies: 10,
    availableCopies: 9,
    isFeatured: false,
    isBookOfMonth: false,
    rackNumber: 'RACK-JMC-01',
    shelfNumber: 'SHELF-A1',
    department: 'Journalism & Mass Communication',
    format: 'PHYSICAL',
    borrowCount: 25,
    copies: Array.from({ length: 10 }, (_, i) => ({
      id: `copy-180${i + 1}`,
      bookId: 'book-18',
      accessionNo: `ACC-2024-17${i + 1}`,
      barcode: `BC-9999${i + 1}`,
      qrCode: `QR-9999${i + 1}`,
      rackNumber: 'RACK-JMC-01',
      shelfNumber: 'SHELF-A1',
      status: i < 9 ? 'AVAILABLE' : 'ISSUED',
      condition: 'GOOD',
      addedDate: '2024-03-08',
    })),
  },
  {
    id: 'book-19',
    title: 'Modern Library Systems & Information Science',
    isbn: '978-1538118023',
    categoryId: 'cat-17',
    categoryName: 'Humanities & Social Sciences',
    authorId: 'auth-1',
    authorName: 'Dr. Thomas H. Cormen',
    publisherId: 'pub-1',
    publisherName: 'MIT Press',
    edition: '4th Edition',
    publishingYear: 2020,
    language: 'English',
    price: 75.00,
    description: 'Digital cataloging, MARC21 standards, RFID automation, and university library management.',
    coverUrl: 'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?auto=format&fit=crop&w=400&q=80',
    totalCopies: 10,
    availableCopies: 8,
    isFeatured: true,
    isBookOfMonth: false,
    rackNumber: 'RACK-LIS-01',
    shelfNumber: 'SHELF-A1',
    department: 'Library & Information Science',
    format: 'HYBRID',
    digitalUrl: 'https://openlibrary.org/books/OL28190182M/Library_Science',
    borrowCount: 30,
    copies: Array.from({ length: 10 }, (_, i) => ({
      id: `copy-190${i + 1}`,
      bookId: 'book-19',
      accessionNo: `ACC-2024-18${i + 1}`,
      barcode: `BC-99991`,
      qrCode: `QR-99991`,
      rackNumber: 'RACK-LIS-01',
      shelfNumber: 'SHELF-A1',
      status: i < 8 ? 'AVAILABLE' : 'ISSUED',
      condition: 'GOOD',
      addedDate: '2024-03-10',
    })),
  },
  {
    id: 'book-20',
    title: 'Foundations of Physical Education & Sports Science',
    isbn: '978-1260253245',
    categoryId: 'cat-17',
    categoryName: 'Humanities & Social Sciences',
    authorId: 'auth-5',
    authorName: 'Gilbert Strang',
    publisherId: 'pub-2',
    publisherName: 'Pearson Education',
    edition: '18th Edition',
    publishingYear: 2021,
    language: 'English',
    price: 62.00,
    description: 'Exercise physiology, sports kinesiology, athletic coaching, and physical fitness methodology.',
    coverUrl: 'https://images.unsplash.com/photo-1517649763962-0c623266010b?auto=format&fit=crop&w=400&q=80',
    totalCopies: 10,
    availableCopies: 9,
    isFeatured: false,
    isBookOfMonth: false,
    rackNumber: 'RACK-PED-01',
    shelfNumber: 'SHELF-A1',
    department: 'Physical Education',
    format: 'PHYSICAL',
    borrowCount: 18,
    copies: Array.from({ length: 10 }, (_, i) => ({
      id: `copy-200${i + 1}`,
      bookId: 'book-20',
      accessionNo: `ACC-2024-19${i + 1}`,
      barcode: `BC-99992`,
      qrCode: `QR-99992`,
      rackNumber: 'RACK-PED-01',
      shelfNumber: 'SHELF-A1',
      status: i < 9 ? 'AVAILABLE' : 'ISSUED',
      condition: 'GOOD',
      addedDate: '2024-03-12',
    })),
  },
];

const DEFAULT_MEMBERS: MemberProfile[] = [
  {
    id: 'mem-3',
    userId: '3',
    name: 'Jayendra Majji',
    email: 'jayendramajji22@gmail.com',
    role: 'STUDENT',
    memberCardNo: 'STU-2026-7326',
    rollNo: '22CS104',
    academicBatch: '2022 - 2026',
    department: 'Computer Science & Engineering',
    status: 'ACTIVE',
    maxAllowedBooks: 5,
    currentActiveLoans: 0,
    pendingFines: 0.00,
    registeredDate: '2022-08-01',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
  },
  {
    id: 'mem-2',
    userId: '2',
    name: 'Dr. Sarah Connor',
    email: 'faculty@college.edu',
    role: 'FACULTY',
    memberCardNo: 'FAC-2023-1102',
    department: 'Electrical Engineering',
    status: 'ACTIVE',
    maxAllowedBooks: 10,
    currentActiveLoans: 3,
    pendingFines: 0.00,
    registeredDate: '2021-08-15',
    avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80',
  },
  {
    id: 'mem-1',
    userId: '1',
    name: 'Chief Admin Librarian',
    email: 'admin@college.edu',
    role: 'ADMIN',
    memberCardNo: 'ADM-2020-0001',
    department: 'Central University Library',
    status: 'ACTIVE',
    maxAllowedBooks: 15,
    currentActiveLoans: 0,
    pendingFines: 0.00,
    registeredDate: '2020-01-01',
  },
];

const DEFAULT_TRANSACTIONS: IssueTransaction[] = [
  {
    id: 'tx-1003',
    bookCopyId: 'copy-402',
    bookId: 'book-4',
    bookTitle: 'Solid State Electronic Devices',
    accessionNo: 'ACC-2024-031',
    barcode: 'BC-99502',
    memberId: 'mem-2',
    memberName: 'Dr. Sarah Connor',
    memberCardNo: 'FAC-2023-1102',
    memberType: 'FACULTY',
    memberDepartment: 'Electrical Engineering',
    issuedByUserId: '1',
    issuedByName: 'Chief Admin Librarian',
    issueDate: '2026-08-01 09:15',
    dueDate: '2026-08-25',
    renewalCount: 0,
    maxRenewals: 3,
    status: 'ISSUED',
    fineAmount: 0,
  },
  {
    id: 'tx-1007',
    bookCopyId: 'copy-305',
    bookId: 'book-3',
    bookTitle: 'Clean Code: A Handbook of Agile Software Craftsmanship',
    accessionNo: 'ACC-2024-024',
    barcode: 'BC-99405',
    memberId: 'mem-2',
    memberName: 'Dr. Sarah Connor',
    memberCardNo: 'FAC-2023-1102',
    memberType: 'FACULTY',
    memberDepartment: 'Electrical Engineering',
    issuedByUserId: '1',
    issuedByName: 'Chief Admin Librarian',
    issueDate: '2026-08-03 14:20',
    dueDate: '2026-08-28',
    renewalCount: 0,
    maxRenewals: 3,
    status: 'ISSUED',
    fineAmount: 0,
  },
  {
    id: 'tx-1009',
    bookCopyId: 'copy-104',
    bookId: 'book-1',
    bookTitle: 'Introduction to Algorithms (4th Edition)',
    accessionNo: 'ACC-2024-004',
    barcode: 'BC-99204',
    memberId: 'mem-2',
    memberName: 'Dr. Sarah Connor',
    memberCardNo: 'FAC-2023-1102',
    memberType: 'FACULTY',
    memberDepartment: 'Electrical Engineering',
    issuedByUserId: '1',
    issuedByName: 'Chief Admin Librarian',
    issueDate: '2026-08-05 11:45',
    dueDate: '2026-08-30',
    renewalCount: 0,
    maxRenewals: 3,
    status: 'ISSUED',
    fineAmount: 0,
  },

  // --- HISTORICAL COMPLETED CIRCULATIONS (JAN - AUG 2026) ---
  ...Array.from({ length: 24 }).map((_, i): IssueTransaction => {
    const isLate = i % 3 === 0; // Every 3rd transaction was returned late
    const borrowMonth = (i % 7) + 1;
    const borrowDay = 10;
    const dueDay = 17; // 7 days standard loan
    const returnDay = isLate ? 20 : 16; // Late return: 10 days duration (3 days late). On time: 6 days duration.
    const overdueDays = isLate ? returnDay - dueDay : 0; // 3 days late
    const fineAmt = overdueDays * 5; // 3 * 5 = ₹15.00
    const isPaid = i % 2 === 0;

    return {
      id: `tx-2026-hist-${i + 1}`,
      bookCopyId: `copy-10${(i % 5) + 1}`,
      bookId: `book-${(i % 5) + 1}`,
      bookTitle: ['Introduction to Algorithms (4th Edition)', 'Modern Operating Systems (5th Edition)', 'Clean Code: A Handbook of Agile Software Craftsmanship', 'Solid State Electronic Devices', 'Linear Algebra and Its Applications'][i % 5],
      accessionNo: `ACC-2024-0${(i % 9) + 1}0`,
      barcode: `BC-9900${i + 1}`,
      memberId: 'mem-2',
      memberName: 'Dr. Sarah Connor',
      memberCardNo: 'FAC-2023-1102',
      memberType: 'FACULTY' as const,
      memberDepartment: 'Electrical Engineering',
      issuedByUserId: '1',
      issuedByName: 'Chief Admin Librarian',
      issueDate: `2026-0${borrowMonth}-${borrowDay < 10 ? '0' + borrowDay : borrowDay} 09:30`,
      dueDate: `2026-0${borrowMonth}-${dueDay < 10 ? '0' + dueDay : dueDay}`,
      returnDate: `2026-0${borrowMonth}-${returnDay < 10 ? '0' + returnDay : returnDay} 16:40`,
      renewalCount: 0,
      maxRenewals: 3,
      status: 'RETURNED' as const,
      fineAmount: fineAmt,
      fineStatus: fineAmt > 0 ? (isPaid ? 'PAID' : 'UNPAID') : undefined,
    };
  }),
];

const DEFAULT_RESERVATIONS: Reservation[] = [];

const DEFAULT_FINES: FineRecord[] = [];

const DEFAULT_DIGITAL: DigitalResource[] = [
  // 1. RESEARCH PAPERS (RESEARCH_PAPER)
  {
    id: 'dig-rp-1',
    title: 'Transformer Architectures & Attention Mechanism Benchmarks in Generative AI',
    resourceType: 'RESEARCH_PAPER',
    categoryName: 'Computer Science & Software',
    authorName: 'Dr. Aris Thorne & IEEE AI Society',
    fileUrl: '/docs/transformer-ai-research.pdf',
    fileSizeMb: 8.4,
    downloadCount: 512,
    uploadDate: '2025-11-12',
    department: 'Computer Science & Engineering',
    subject: 'Artificial Intelligence',
    semester: 'Sem 7',
    year: 2025,
    publisherName: 'IEEE Computer Society',
    issnIsbn: 'ISSN 1941-0131',
    accessLevel: 'OPEN_ACCESS',
    description: 'Peer-reviewed research paper on transformer network scalability, attention mechanisms, and deep neural LLMs.',
    contentSnippet: 'ABSTRACT: Large language models rely heavily on self-attention mechanisms. This paper presents empirical performance benchmarks across 100M-70B parameter models.',
  },
  {
    id: 'dig-rp-2',
    title: 'Quantum Dot Solar Cells: Photovoltaic Efficiency & Nanomaterial Optimization',
    resourceType: 'RESEARCH_PAPER',
    categoryName: 'Physics & Applied Physical Sciences',
    authorName: 'Dr. Meera Reddy & Dr. K. V. Sharma',
    fileUrl: '/docs/quantum-dot-solar-research.pdf',
    fileSizeMb: 6.2,
    downloadCount: 380,
    uploadDate: '2025-10-05',
    department: 'Physics & Applied Physical Sciences',
    subject: 'Nanotechnology & Quantum Physics',
    semester: 'Sem 6',
    year: 2025,
    publisherName: 'Elsevier Materials Science',
    issnIsbn: 'ISSN 0925-8388',
    accessLevel: 'OPEN_ACCESS',
    description: 'Comparative study on colloidal quantum dot solar cell efficiency, bandgap tuning, and electron transport layers.',
    contentSnippet: 'ABSTRACT: Perovskite and quantum dot hybrid structures offer up to 28.5% theoretical power conversion efficiency under AM1.5G illumination.',
  },
  {
    id: 'dig-rp-3',
    title: 'Autonomous Robotic Surgery: Real-Time Haptic Feedback & Computer Vision',
    resourceType: 'RESEARCH_PAPER',
    categoryName: 'Medical & Life Sciences',
    authorName: 'Dr. Jonathan Kim & Surgical Robotics Lab',
    fileUrl: '/docs/robotic-surgery-haptic.pdf',
    fileSizeMb: 12.1,
    downloadCount: 290,
    uploadDate: '2026-01-08',
    department: 'Medical & Life Sciences',
    subject: 'Biomedical Engineering',
    semester: 'Sem 8',
    year: 2026,
    publisherName: 'Springer Biomedical Engineering',
    issnIsbn: 'ISSN 2190-3824',
    accessLevel: 'OPEN_ACCESS',
    description: 'Investigation into low-latency haptic sensor arrays and sub-millimeter tracking accuracy for laparoscopic robot surgery.',
    contentSnippet: 'ABSTRACT: Tactile feedback is essential for minimally invasive surgery. We introduce a 1kHz optical force-sensing array operating with zero phase lag.',
  },

  // 2. E-BOOKS (EBOOK)
  {
    id: 'dig-3',
    title: 'VLSI Circuit Design Fundamentals & FPGA Hardware Implementation',
    resourceType: 'EBOOK',
    categoryName: 'Electrical & Electronics',
    authorName: 'Prof. R. Vance',
    fileUrl: '/docs/vlsi-design-handbook.pdf',
    fileSizeMb: 22.1,
    downloadCount: 214,
    uploadDate: '2025-08-20',
    department: 'Electronics & Communication Engineering',
    subject: 'VLSI Design',
    semester: 'Sem 6',
    year: 2025,
    publisherName: 'Pearson Education',
    issnIsbn: '978-0134685991',
    accessLevel: 'OPEN_ACCESS',
    description: 'Reference e-book textbook covering Verilog HDL coding, CMOS logic gates, and FPGA syntheses.',
    contentSnippet: 'CHAPTER 1: Introduction to Very Large Scale Integration (VLSI), MOSFET operation modes, and layout design rules.',
  },
  {
    id: 'dig-eb-2',
    title: 'Clean Architecture & Distributed Microservice Engineering (2nd Ed)',
    resourceType: 'EBOOK',
    categoryName: 'Computer Science & Software',
    authorName: 'Robert C. Martin & Dr. Alex Xu',
    fileUrl: '/docs/clean-microservices-ebook.pdf',
    fileSizeMb: 18.5,
    downloadCount: 640,
    uploadDate: '2025-09-14',
    department: 'Computer Science & Engineering',
    subject: 'Software Architecture',
    semester: 'Sem 5',
    year: 2025,
    publisherName: "O'Reilly Media",
    issnIsbn: '978-1491950357',
    accessLevel: 'OPEN_ACCESS',
    description: 'Definitive digital textbook on decoupled service design, domain-driven design (DDD), gRPC, and event sourcing.',
    contentSnippet: 'PREFACE: Software architecture is the art of drawing lines. This book teaches engineers how to keep options open as systems grow.',
  },
  {
    id: 'dig-eb-3',
    title: 'Principles of Financial Economics & Corporate Valuation',
    resourceType: 'EBOOK',
    categoryName: 'Commerce, Finance & Banking',
    authorName: 'Prof. Eugene Fama & Dr. S. K. Roy',
    fileUrl: '/docs/financial-economics-ebook.pdf',
    fileSizeMb: 14.8,
    downloadCount: 310,
    uploadDate: '2025-07-22',
    department: 'Commerce & Finance',
    subject: 'Corporate Finance',
    semester: 'Sem 3',
    year: 2025,
    publisherName: 'McGraw-Hill Education',
    issnIsbn: '978-0078034763',
    accessLevel: 'OPEN_ACCESS',
    description: 'Comprehensive digital text on Discounted Cash Flow (DCF), CAPM model, capital structure, and risk management.',
    contentSnippet: 'EXECUTIVE SUMMARY: Valuation is at the heart of corporate decision-making. We explore modern financial derivatives and risk hedging strategies.',
  },

  // 3. QUESTION PAPERS (QUESTION_PAPER)
  {
    id: 'dig-2',
    title: 'Data Structures & Algorithms Semester IV Exam Question Papers (2020-2025)',
    resourceType: 'QUESTION_PAPER',
    categoryName: 'Computer Science & Software',
    authorName: 'University Examination Board',
    fileUrl: '/docs/dsa-question-bank.pdf',
    fileSizeMb: 8.5,
    downloadCount: 890,
    uploadDate: '2026-01-05',
    department: 'Computer Science & Engineering',
    subject: 'Data Structures & Algorithms',
    semester: 'Sem 4',
    year: 2025,
    accessLevel: 'OPEN_ACCESS',
    description: 'Official compiled university semester examination question paper archives with solution keys.',
    contentSnippet: 'EXAM SECTION A: Answer all 10 short questions (20 marks). 1. Define AVL tree rotation. 2. Compare QuickSort vs MergeSort space complexity.',
  },
  {
    id: 'dig-qp-2',
    title: 'Thermodynamics & Fluid Mechanics Semester III Question Bank',
    resourceType: 'QUESTION_PAPER',
    categoryName: 'Mechanical Engineering',
    authorName: 'Board of Examiners (Mechanical Dept)',
    fileUrl: '/docs/thermo-question-bank.pdf',
    fileSizeMb: 6.4,
    downloadCount: 420,
    uploadDate: '2025-12-18',
    department: 'Mechanical Engineering & Mechatronics',
    subject: 'Thermodynamics',
    semester: 'Sem 3',
    year: 2025,
    accessLevel: 'OPEN_ACCESS',
    description: 'Previous 5-year end-semester exam question papers with step-by-step numerical calculations.',
    contentSnippet: 'SECTION B: 1. Derive the Rankine Cycle efficiency equation. 2. A Carnot engine operates between 800K and 300K. Calculate maximum work output.',
  },
  {
    id: 'dig-qp-3',
    title: 'Embedded Systems & Microcontroller Design Semester VI Examination Archive',
    resourceType: 'QUESTION_PAPER',
    categoryName: 'Electronics & Communication Engineering',
    authorName: 'ECE Examination Council',
    fileUrl: '/docs/embedded-question-bank.pdf',
    fileSizeMb: 7.1,
    downloadCount: 360,
    uploadDate: '2026-01-12',
    department: 'Electronics & Communication Engineering',
    subject: 'Embedded Systems',
    semester: 'Sem 6',
    year: 2026,
    accessLevel: 'OPEN_ACCESS',
    description: 'Comprehensive exam paper repository for ARM Cortex-M architecture, UART/SPI interfaces, and RTOS timers.',
    contentSnippet: 'QUESTION 3: Write an Embedded C program for ARM Cortex-M4 to configure SysTick timer interrupts at 1ms intervals.',
  },

  // 4. SYLLABUS (SYLLABUS)
  {
    id: 'dig-4',
    title: 'Computer Science & Engineering B.Tech Model Syllabus (2026 Revision)',
    resourceType: 'SYLLABUS',
    categoryName: 'Computer Science & Software',
    authorName: 'Academic Senate & Curriculum Committee',
    fileUrl: '/docs/cse-syllabus-2026.pdf',
    fileSizeMb: 3.4,
    downloadCount: 1250,
    uploadDate: '2026-01-10',
    department: 'Computer Science & Engineering',
    subject: 'Curriculum & Academic Regulations',
    semester: 'All Semesters',
    year: 2026,
    accessLevel: 'OPEN_ACCESS',
    description: 'Complete official credit distribution, lab schemes, prerequisite graphs, and course outcomes for B.Tech CSE.',
    contentSnippet: 'PROGRAM STRUCTURE: Total Credits Required = 160. Core Subjects: 78 Credits, Electives: 30 Credits, Labs & Projects: 52 Credits.',
  },
  {
    id: 'dig-syl-2',
    title: 'Master of Business Administration (MBA) Curriculum & Credit Scheme 2026',
    resourceType: 'SYLLABUS',
    categoryName: 'Business Administration & Management (MBA)',
    authorName: 'MBA Board of Studies',
    fileUrl: '/docs/mba-syllabus-2026.pdf',
    fileSizeMb: 2.8,
    downloadCount: 610,
    uploadDate: '2026-01-04',
    department: 'Business Administration & Management (MBA)',
    subject: 'Management Curriculum',
    semester: 'All Semesters',
    year: 2026,
    accessLevel: 'OPEN_ACCESS',
    description: 'Detailed syllabus breakdown for MBA Specializations in Marketing, Finance, HR, and Business Analytics.',
    contentSnippet: 'SEMESTER I CORE: Financial Accounting, Managerial Economics, Organizational Behavior, Marketing Management, Quantitative Methods.',
  },

  // 5. LECTURE_NOTES (Lecture Notes)
  {
    id: 'dig-16',
    title: 'Operating Systems & System Programming Unit-Wise Lecture Notes',
    resourceType: 'LECTURE_NOTES',
    categoryName: 'Computer Science & Software',
    authorName: 'Department of CSE Faculty Council',
    fileUrl: '/docs/os-lecture-notes.pdf',
    fileSizeMb: 9.8,
    downloadCount: 1420,
    uploadDate: '2025-08-10',
    department: 'Computer Science & Engineering',
    subject: 'Operating Systems',
    semester: 'Sem 4',
    year: 2025,
    accessLevel: 'OPEN_ACCESS',
    description: 'Unit-by-unit classroom lecture notes covering process scheduling, memory virtualization, and IPC.',
    contentSnippet: 'UNIT 2: Process Synchronization & Deadlocks. Dining Philosophers problem, Semaphore implementation, and Banker\'s Algorithm.',
  },
  {
    id: 'dig-ln-2',
    title: 'Artificial Intelligence & Neural Networks Classroom Lecture Modules',
    resourceType: 'LECTURE_NOTES',
    categoryName: 'Artificial Intelligence & Data Science',
    authorName: 'Dr. S. R. Varma & AI Faculty Team',
    fileUrl: '/docs/ai-lecture-notes.pdf',
    fileSizeMb: 11.4,
    downloadCount: 890,
    uploadDate: '2025-09-22',
    department: 'Artificial Intelligence & Data Science',
    subject: 'Deep Learning',
    semester: 'Sem 5',
    year: 2025,
    accessLevel: 'OPEN_ACCESS',
    description: 'Comprehensive slides and notes on Backpropagation, Convolutional Neural Networks (CNN), and RNN architectures.',
    contentSnippet: 'MODULE 4: Gradient Descent Variants (Adam, RMSprop, SGD with Momentum) and vanishing gradient mitigation techniques.',
  },

  // 6. NEWSPAPERS & E-PAPERS (NEWSPAPER)
  {
    id: 'dig-7',
    title: 'The Hindu National Daily (Digital Edition & Editorial Archive)',
    resourceType: 'NEWSPAPER',
    categoryName: 'Humanities & Social Sciences',
    authorName: 'The Hindu Editorial Desk',
    fileUrl: 'https://www.thehindu.com',
    fileSizeMb: 12.0,
    downloadCount: 1540,
    uploadDate: getLocalDateStr(),
    department: 'All Departments',
    semester: 'All Semesters',
    year: 2026,
    newspaperEdition: "Today's National Edition",
    newspaperRssFeedUrl: 'https://www.thehindu.com/feeder/default.rss',
    accessLevel: 'OPEN_ACCESS',
    contentSnippet: 'Daily national newspaper covering current affairs, technology news, economy, and competitive exam editorials.',
    description: "Today's official digital newspaper e-paper edition with searchable editorial columns.",
  },
  {
    id: 'dig-8',
    title: 'Indian Express Daily e-Paper & Civil Services Special Edition',
    resourceType: 'NEWSPAPER',
    categoryName: 'Humanities & Social Sciences',
    authorName: 'Indian Express Bureau',
    fileUrl: 'https://indianexpress.com',
    fileSizeMb: 11.5,
    downloadCount: 1120,
    uploadDate: getLocalDateStr(),
    department: 'All Departments',
    semester: 'All Semesters',
    year: 2026,
    newspaperEdition: "Today's Express Edition",
    newspaperRssFeedUrl: 'https://indianexpress.com/feed/',
    accessLevel: 'OPEN_ACCESS',
    contentSnippet: 'Leading daily newspaper with explainers, opinion columns, and national policy analysis.',
    description: "Today's official digital Indian Express newspaper edition.",
  },
  {
    id: 'dig-8b',
    title: 'Times of India National Daily Edition & Tech Frontline',
    resourceType: 'NEWSPAPER',
    categoryName: 'Humanities & Social Sciences',
    authorName: 'Times News Network',
    fileUrl: 'https://timesofindia.indiatimes.com',
    fileSizeMb: 14.0,
    downloadCount: 980,
    uploadDate: getLocalDateStr(),
    department: 'All Departments',
    semester: 'All Semesters',
    year: 2026,
    newspaperEdition: "Today's TOI Edition",
    newspaperRssFeedUrl: 'https://timesofindia.indiatimes.com/rssfeedstopstories.cms',
    accessLevel: 'OPEN_ACCESS',
    contentSnippet: 'National & international headlines, business tech news, and education bulletins.',
    description: "Today's official digital Times of India e-paper daily issue.",
  },

  // 7. NPTEL COURSEWARE (NPTEL)
  {
    id: 'dig-5',
    title: 'NPTEL Courseware: High Performance Computer Architecture & Parallel Systems',
    resourceType: 'NPTEL',
    categoryName: 'Computer Science & Software',
    authorName: 'Prof. Mainak Chaudhuri (IIT Kanpur)',
    fileUrl: 'https://nptel.ac.in',
    fileSizeMb: 450.0,
    downloadCount: 680,
    uploadDate: '2025-09-01',
    department: 'Computer Science & Engineering',
    subject: 'Computer Architecture',
    semester: 'Sem 5',
    year: 2025,
    publisherName: 'NPTEL / IIT Kanpur',
    accessLevel: 'OPEN_ACCESS',
    description: 'Complete 40-lecture video module and PDF lecture notes for multi-core cache coherence and pipelining.',
    contentSnippet: 'LECTURE 12: Directory-Based Cache Coherence Protocols in Large-Scale Distributed Shared Memory Architectures.',
  },

  // 8. SWAYAM MOOCS (SWAYAM)
  {
    id: 'dig-6',
    title: 'SWAYAM MOOC: Financial Accounting & Enterprise Resource Planning',
    resourceType: 'SWAYAM',
    categoryName: 'Business Administration & Management (MBA)',
    authorName: 'Prof. S. K. Gupta (IIM Bangalore)',
    fileUrl: 'https://swayam.gov.in',
    fileSizeMb: 320.0,
    downloadCount: 310,
    uploadDate: '2025-10-15',
    department: 'Business Administration & Management (MBA)',
    subject: 'Financial Accounting',
    semester: 'Sem 2',
    year: 2025,
    publisherName: 'SWAYAM National Portal',
    accessLevel: 'OPEN_ACCESS',
    description: 'Government of India national online learning course materials and self-assessment quizzes.',
    contentSnippet: 'WEEK 6: Balance Sheet Analysis, Cash Flow Statements (IAS 7), and ERP SAP Financial Modules.',
  },

  // 9. IEEE XPLORE (IEEE_XPLORE)
  {
    id: 'dig-1',
    title: 'Advanced Machine Learning & Deep Neural Architectures (2025 Proceedings)',
    resourceType: 'IEEE_XPLORE',
    categoryName: 'Computer Science & Software',
    authorName: 'Dr. A. Sharma & IEEE AI Society',
    fileUrl: 'https://ieeexplore.ieee.org',
    fileSizeMb: 14.2,
    downloadCount: 412,
    uploadDate: '2025-11-12',
    department: 'Computer Science & Engineering',
    subject: 'Artificial Intelligence',
    semester: 'Sem 7',
    year: 2025,
    publisherName: 'IEEE Press',
    issnIsbn: 'ISSN 1941-0131',
    accessLevel: 'SUBSCRIBED',
    description: 'Peer-reviewed IEEE Transactions research proceedings on transformer networks and deep learning.',
    contentSnippet: 'IEEE TRANSACTIONS: Distributed training optimization for trillion-token transformer models over high-speed interconnects.',
  },

  // 10. RESEARCH & ACADEMIC THESES (THESIS_DISSERTATION)
  {
    id: 'dig-13',
    title: 'Ph.D. Thesis: Distributed Blockchain Consensus Mechanisms for IoT Security',
    resourceType: 'THESIS_DISSERTATION',
    categoryName: 'Computer Science & Software',
    authorName: 'Dr. Jayendra Majji (Ph.D. Scholar)',
    fileUrl: '/docs/phd-thesis-blockchain.pdf',
    fileSizeMb: 45.0,
    downloadCount: 175,
    uploadDate: '2026-01-15',
    department: 'Computer Science & Engineering',
    subject: 'Cyber Security & Distributed Systems',
    semester: 'Doctoral',
    year: 2026,
    publisherName: 'University Press',
    accessLevel: 'OPEN_ACCESS',
    description: 'Approved doctoral dissertation detailing Byzantine Fault Tolerant protocols for smart grids.',
    contentSnippet: 'DISSERTATION CHAPTER 4: Practical Byzantine Fault Tolerance (PBFT) performance in resource-constrained IoT gateways.',
  },
  {
    id: 'dig-th-2',
    title: 'Ph.D. Dissertation: Nanomaterial Catalyst Synthesis for Green Hydrogen Production',
    resourceType: 'THESIS_DISSERTATION',
    categoryName: 'Chemical & Materials Engineering',
    authorName: 'Dr. Ananya Sen (Ph.D. Scholar)',
    fileUrl: '/docs/phd-thesis-hydrogen.pdf',
    fileSizeMb: 38.5,
    downloadCount: 140,
    uploadDate: '2025-11-30',
    department: 'Chemical & Materials Engineering',
    subject: 'Green Energy Chemistry',
    semester: 'Doctoral',
    year: 2025,
    publisherName: 'University Central Library Repository',
    accessLevel: 'OPEN_ACCESS',
    description: 'Doctoral research on electrocatalytic water splitting using nickel-iron layered double hydroxides.',
    contentSnippet: 'DISSERTATION CHAPTER 3: Overpotential reduction techniques during oxygen evolution reaction (OER) in alkaline electrolyzers.',
  },

  // 11. PROJECT REPORTS (PROJECT_REPORT)
  {
    id: 'dig-15',
    title: 'Cap-Stone B.Tech Project Report: Autonomous Drone Navigation using ROS 2',
    resourceType: 'PROJECT_REPORT',
    categoryName: 'Computer Science & Software',
    authorName: 'Senior Student Project Team (Batch 2026)',
    fileUrl: '/docs/btech-project-drone.pdf',
    fileSizeMb: 16.5,
    downloadCount: 530,
    uploadDate: '2026-01-20',
    department: 'Computer Science & Engineering',
    subject: 'Robotics & Computer Vision',
    semester: 'Sem 8',
    year: 2026,
    accessLevel: 'OPEN_ACCESS',
    description: 'Final year capstone engineering project report complete with circuit schematics and ROS source code.',
    contentSnippet: 'PROJECT SUMMARY: Real-time obstacle avoidance utilizing LiDAR PointClouds and OctoMap 3D occupancy grid mapping.',
  },
  {
    id: 'dig-pr-2',
    title: 'B.Tech Final Project Report: IoT Smart Agriculture & Soil Health Telemetry Node',
    resourceType: 'PROJECT_REPORT',
    categoryName: 'Electronics & Communication Engineering',
    authorName: 'ECE Final Year Project Group',
    fileUrl: '/docs/btech-project-iot-agri.pdf',
    fileSizeMb: 19.2,
    downloadCount: 480,
    uploadDate: '2025-12-05',
    department: 'Electronics & Communication Engineering',
    subject: 'Internet of Things (IoT)',
    semester: 'Sem 8',
    year: 2025,
    accessLevel: 'OPEN_ACCESS',
    description: 'Solar-powered wireless sensor node design for NPK soil nutrient monitoring via LoRaWAN.',
    contentSnippet: 'PROJECT ARCHITECTURE: ESP32 microcontroller interfaced with soil moisture & EC sensors, streaming telemetry to AWS IoT Core.',
  },

  // 12. FACULTY PUBLICATIONS (FACULTY_PUBLICATION)
  {
    id: 'dig-14',
    title: 'Faculty Publication: Edge Computing Paradigms in Next-Gen 6G Wireless Networks',
    resourceType: 'FACULTY_PUBLICATION',
    categoryName: 'Electronics & Communication Engineering',
    authorName: 'Dr. Sarah Connor (Associate Professor, CSE)',
    fileUrl: '/docs/faculty-paper-6g.pdf',
    fileSizeMb: 11.2,
    downloadCount: 420,
    uploadDate: '2025-12-10',
    department: 'Computer Science & Engineering',
    subject: 'Wireless Communications',
    semester: 'Faculty Research',
    year: 2025,
    accessLevel: 'OPEN_ACCESS',
    description: 'Peer-reviewed international journal publication authored by university faculty members.',
    contentSnippet: 'JOURNAL ABSTRACT: Ultra-reliable low-latency communication (URLLC) requirements for 6G networks using Multi-access Edge Computing (MEC).',
  },
  {
    id: 'dig-fp-2',
    title: 'Faculty Monograph: Strategic Supply Chain Resiliency in Post-Pandemic Economies',
    resourceType: 'FACULTY_PUBLICATION',
    categoryName: 'Business Administration & Management (MBA)',
    authorName: 'Prof. Vikram Malhotra (Department Head, Management)',
    fileUrl: '/docs/faculty-paper-supply-chain.pdf',
    fileSizeMb: 15.6,
    downloadCount: 310,
    uploadDate: '2025-11-18',
    department: 'Business Administration & Management (MBA)',
    subject: 'Operations Management',
    semester: 'Faculty Research',
    year: 2025,
    accessLevel: 'OPEN_ACCESS',
    description: 'Peer-reviewed monograph analyzing global logistics bottlenecks and predictive AI inventory models.',
    contentSnippet: 'MONOGRAPH SECTION 2: Quantitative risk mitigation strategies, dual-sourcing frameworks, and buffer inventory optimization.',
  },

  // 13. E-JOURNALS (JOURNAL)
  {
    id: 'dig-jr-1',
    title: 'International Journal of Computer Applications & Software Engineering (IJCASE Vol. 28)',
    resourceType: 'JOURNAL',
    categoryName: 'Computer Science & Software',
    authorName: 'Editorial Board (Dr. R. K. Swaminathan)',
    fileUrl: '/docs/journal-ijcase-2026.pdf',
    fileSizeMb: 18.4,
    downloadCount: 560,
    uploadDate: '2026-01-10',
    department: 'Computer Science & Engineering',
    subject: 'Computer Science & Engineering',
    semester: 'All Semesters',
    year: 2026,
    publisherName: 'Foundation of Computer Science (FCS)',
    issnIsbn: 'ISSN 0975-8887',
    accessLevel: 'SUBSCRIBED',
    description: 'Peer-reviewed open & subscribed research journal covering distributed computing, compiler design, and cyber physical security.',
    contentSnippet: 'JOURNAL ARTICLE: Energy-efficient load balancing algorithms for hyper-scale cloud data centers.',
  },
  {
    id: 'dig-jr-2',
    title: 'Journal of Business Strategy, Fintech & Financial Management (Vol. 14)',
    resourceType: 'JOURNAL',
    categoryName: 'Business Administration & Management (MBA)',
    authorName: 'Dr. Ananya Roy & Prof. K. Deshmukh',
    fileUrl: '/docs/journal-business-strategy.pdf',
    fileSizeMb: 12.0,
    downloadCount: 380,
    uploadDate: '2025-12-05',
    department: 'Business Administration & Management (MBA)',
    subject: 'Financial Management',
    semester: 'All Semesters',
    year: 2025,
    publisherName: 'Academic Management Press',
    issnIsbn: 'ISSN 2198-4421',
    accessLevel: 'OPEN_ACCESS',
    description: 'Quarterly academic journal focusing on algorithmic trading, corporate governance, and ESG compliance.',
    contentSnippet: 'PAPER: Impact of decentralized finance (DeFi) protocols on cross-border merchant settlement latencies.',
  },

  // 14. DIGITAL MAGAZINES (MAGAZINE)
  {
    id: 'dig-mag-1',
    title: 'MIT Technology Review: The Breakthrough Technologies of 2026',
    resourceType: 'MAGAZINE',
    categoryName: 'Computer Science & Software',
    authorName: 'MIT Technology Review Editorial Team',
    fileUrl: 'https://technologyreview.com',
    fileSizeMb: 24.5,
    downloadCount: 920,
    uploadDate: '2026-02-01',
    department: 'Computer Science & Engineering',
    subject: 'Emerging Technologies',
    semester: 'All Semesters',
    year: 2026,
    publisherName: 'MIT Press',
    issnIsbn: 'ISSN 0040-1692',
    accessLevel: 'OPEN_ACCESS',
    description: 'Special annual issue detailing generative AI models, quantum fault-tolerant computing, and solid-state battery breakthroughs.',
    contentSnippet: 'COVER STORY: How multimodal foundational models are revolutionizing autonomous scientific discovery and robotics.',
  },
  {
    id: 'dig-mag-2',
    title: 'Harvard Business Review: Navigating Strategic Uncertainty & AI Transformation',
    resourceType: 'MAGAZINE',
    categoryName: 'Business Administration & Management (MBA)',
    authorName: 'Harvard Business Publishing Group',
    fileUrl: 'https://hbr.org',
    fileSizeMb: 28.0,
    downloadCount: 740,
    uploadDate: '2026-01-15',
    department: 'Business Administration & Management (MBA)',
    subject: 'Leadership & Strategy',
    semester: 'All Semesters',
    year: 2026,
    publisherName: 'Harvard Business Publishing',
    issnIsbn: 'ISSN 0017-8012',
    accessLevel: 'SUBSCRIBED',
    description: 'Executive management magazine featuring executive case studies, generative AI productivity metrics, and leadership frameworks.',
    contentSnippet: 'FEATURE ARTICLE: The Chief AI Officer Playbook: Scaling enterprise intelligence while mitigating algorithmic risk.',
  },

  // 15. NDLI REPOSITORY (NDLI)
  {
    id: 'dig-ndli-1',
    title: 'National Digital Library of India (NDLI): GATE & National Competitive Exam Courseware',
    resourceType: 'NDLI',
    categoryName: 'All Departments',
    authorName: 'Ministry of Education & IIT Kharagpur',
    fileUrl: 'https://ndl.iitkgp.ac.in',
    fileSizeMb: 150.0,
    downloadCount: 1450,
    uploadDate: '2025-08-20',
    department: 'All Departments',
    subject: 'Engineering & Competitive Examinations',
    semester: 'All Semesters',
    year: 2025,
    publisherName: 'National Digital Library of India (NDLI)',
    accessLevel: 'OPEN_ACCESS',
    description: 'Centralized government repository containing 50,000+ curated video lectures, solved problem sets, and syllabus modules.',
    contentSnippet: 'NDLI MODULE 4: Solved GATE Engineering Mathematics and Digital Electronics previous 15-year examination papers.',
  },

  // 16. ACM DIGITAL LIBRARY (ACM_DIGITAL_LIBRARY)
  {
    id: 'dig-acm-1',
    title: 'ACM Digital Library: Proceedings of the ACM SIGCOMM / SIGMOD Conferences (2025)',
    resourceType: 'ACM_DIGITAL_LIBRARY',
    categoryName: 'Computer Science & Software',
    authorName: 'Association for Computing Machinery (ACM)',
    fileUrl: 'https://dl.acm.org',
    fileSizeMb: 35.0,
    downloadCount: 880,
    uploadDate: '2025-11-10',
    department: 'Computer Science & Engineering',
    subject: 'Computer Networks & Database Systems',
    semester: 'Sem 6',
    year: 2025,
    publisherName: 'ACM Press',
    issnIsbn: 'ISBN 979-8-4007-0000-0',
    accessLevel: 'SUBSCRIBED',
    description: 'Full-text access to ACM digital collection covering cloud networking, data systems, and algorithmic theory.',
    contentSnippet: 'SIGCOMM PAPER: Programmable P4 switches with in-band network telemetry for 800 Gbps Ethernet fabrics.',
  },

  // 17. SPRINGERLINK (SPRINGER_LINK)
  {
    id: 'dig-springer-1',
    title: 'SpringerLink: Advances in Intelligent Systems, Robotics & Autonomous Control',
    resourceType: 'SPRINGER_LINK',
    categoryName: 'Electronics & Communication Engineering',
    authorName: 'Prof. Hans Weber & Springer Editorial Board',
    fileUrl: 'https://link.springer.com',
    fileSizeMb: 42.0,
    downloadCount: 650,
    uploadDate: '2025-10-25',
    department: 'Electronics & Communication',
    subject: 'Robotics & Control Systems',
    semester: 'Sem 7',
    year: 2025,
    publisherName: 'Springer Nature',
    issnIsbn: 'ISBN 978-3-030-99999-9',
    accessLevel: 'SUBSCRIBED',
    description: 'Comprehensive research monographs on reinforcement learning algorithms in industrial robotic manipulator control.',
    contentSnippet: 'SPRINGER CHAPTER 8: Model Predictive Control (MPC) and Kalman filtering for unmanned aerial vehicles (UAVs).',
  },

  // 18. SCIENCEDIRECT (SCIENCE_DIRECT)
  {
    id: 'dig-scidirect-1',
    title: 'ScienceDirect / Elsevier: Renewable Energy Systems, Green Hydrogen & Solar Microgrids',
    resourceType: 'SCIENCE_DIRECT',
    categoryName: 'Electrical & Electronics Engineering',
    authorName: 'Dr. Elena Rostova & Elsevier Energy Editorial',
    fileUrl: 'https://sciencedirect.com',
    fileSizeMb: 38.5,
    downloadCount: 790,
    uploadDate: '2026-01-05',
    department: 'Electrical & Electronics',
    subject: 'Power Systems & Renewable Energy',
    semester: 'Sem 8',
    year: 2026,
    publisherName: 'Elsevier Press',
    issnIsbn: 'ISSN 0960-1481',
    accessLevel: 'SUBSCRIBED',
    description: 'High-impact Elsevier research journal papers detailing hybrid renewable energy grid integration and battery storage analytics.',
    contentSnippet: 'ARTICLE: Maximum Power Point Tracking (MPPT) under partial shading conditions using genetic neural optimization.',
  },

  // 19. JSTOR ARCHIVES (JSTOR)
  {
    id: 'dig-jstor-1',
    title: 'JSTOR Archival Collection: Economic Theory, Industrial Organization & Macroeconomic Policy',
    resourceType: 'JSTOR',
    categoryName: 'Business Administration & Management (MBA)',
    authorName: 'JSTOR Academic Repository Curators',
    fileUrl: 'https://jstor.org',
    fileSizeMb: 19.8,
    downloadCount: 520,
    uploadDate: '2025-09-15',
    department: 'Management Studies',
    subject: 'Macroeconomics & Public Policy',
    semester: 'Sem 3',
    year: 2025,
    publisherName: 'ITHAKA / JSTOR',
    issnIsbn: 'ISSN 0022-0515',
    accessLevel: 'SUBSCRIBED',
    description: 'Primary source archival papers and historical economic journals on central bank balance sheets and market competition.',
    contentSnippet: 'JSTOR HISTORICAL: Empirical evaluations of fiscal stimulus multiplier effects in emerging market economies.',
  },

  // 20. MULTIMEDIA & VIDEO LECTURES (MULTIMEDIA)
  {
    id: 'dig-multi-1',
    title: 'Interactive Multimedia Video Series: Mechanical 3D CAD & Finite Element Analysis (FEA)',
    resourceType: 'MULTIMEDIA',
    categoryName: 'Mechanical Engineering',
    authorName: 'Prof. David Miller (MIT / Central Library Media Lab)',
    fileUrl: '/docs/video-cad-fea-masterclass.mp4',
    fileSizeMb: 650.0,
    downloadCount: 1120,
    uploadDate: '2026-01-20',
    department: 'Mechanical Engineering',
    subject: 'Computer Aided Design (CAD)',
    semester: 'Sem 5',
    year: 2026,
    publisherName: 'University Media & E-Learning Lab',
    accessLevel: 'OPEN_ACCESS',
    description: '10-part high-definition video masterclass with interactive 3D stress-strain animation simulations and SolidWorks tutorials.',
    contentSnippet: 'VIDEO CHAPTER 4: Von Mises stress tensor analysis on cantilever truss structures under dynamic cyclic loading.',
  },
];

const DEFAULT_AUDIT_LOGS: AuditLog[] = [
  {
    id: 'log-1',
    userId: '1',
    userName: 'Chief Admin Librarian',
    userRole: 'ADMIN',
    action: 'BOOK_ISSUED',
    module: 'CIRCULATION',
    details: 'Issued copy ACC-2024-002 to Jayendra Majji (STU-2026-7326)',
    timestamp: '2026-07-01 10:14:22',
  },
  {
    id: 'log-2',
    userId: '1',
    userName: 'Chief Admin Librarian',
    userRole: 'ADMIN',
    action: 'SYSTEM_SETTINGS_UPDATED',
    module: 'ADMINISTRATION',
    details: 'Updated overdue fine rate to ₹5.00 / day.',
    timestamp: '2026-07-15 14:30:00',
  },
];

const DEFAULT_CONFIG: SystemConfig = {
  libraryName: 'University Central Library Enterprise Portal',
  fineRatePerDay: 5.00,
  studentMaxLoanDays: 7,
  studentMaxBooks: 5,
  facultyMaxLoanDays: 30,
  facultyMaxBooks: 10,
  maxRenewalLimit: 2,
  reservationHoldHours: 48,
  autoSendEmailAlerts: true,
  enableMaintenanceMode: false,
};

const DEFAULT_NOTICES: Notice[] = [
  {
    id: 'notice-101',
    title: 'URGENT: Overdue Book Circulation Reminder - "Introduction to Algorithms (4th Edition)"',
    content: 'Dear Jayendra Majji, your borrowed book "Introduction to Algorithms (4th Edition)" (Accession No: ACC-2024-002) is past its due date (2026-07-15). Please return or renew the book copy at the Central Circulation Desk immediately to prevent fine accumulation.',
    targetAudience: 'STUDENTS',
    recipientEmail: 'student@college.edu',
    recipientName: 'Jayendra Majji',
    createdDate: '2026-07-20',
    isUrgent: true,
    senderName: 'Central Circulation Desk',
  },
  {
    id: 'notice-102',
    title: 'Central Library Monsoon Operating Hours & Reading Room Schedule',
    content: 'The Central Library reading rooms will remain open from 8:00 AM to 10:00 PM on all weekdays. Digital Library terminals and catalog search kiosks are fully operational.',
    targetAudience: 'ALL',
    createdDate: '2026-07-18',
    isUrgent: false,
    senderName: 'Head Librarian Control Desk',
  },
];

const todayDefaultStr = getLocalDateStr();

const DEFAULT_ATTENDANCE_RECORDS: AttendanceRecord[] = [
  {
    id: 'att-101',
    memberId: 'mem-3',
    memberName: 'Jayendra Majji',
    memberCardNo: 'STU-2026-7326',
    role: 'STUDENT',
    department: 'Computer Science & Engineering',
    email: 'jayendramajji22@gmail.com',
    checkInTime: `2026-09-01 09:15:00`,
    checkOutTime: `2026-09-01 11:45:00`,
    durationMinutes: 150,
    status: 'COMPLETED',
    entryGate: 'Main Gate - Central Library',
    purposeOfVisit: 'GENERAL_READING',
    verificationMethod: 'BARCODE',
    checkedInBy: 'Self Barcode Kiosk',
    checkedOutBy: 'Self Barcode Kiosk',
    date: '2026-09-01',
  },
  {
    id: 'att-102',
    memberId: 'mem-2',
    memberName: 'Dr. Sarah Connor',
    memberCardNo: 'FAC-2023-1102',
    role: 'FACULTY',
    department: 'Computer Science & Engineering',
    email: 'faculty@college.edu',
    checkInTime: `2026-09-01 10:00:00`,
    checkOutTime: `2026-09-01 12:30:00`,
    durationMinutes: 150,
    status: 'COMPLETED',
    entryGate: 'Faculty Research Wing',
    purposeOfVisit: 'RESEARCH_STUDY',
    verificationMethod: 'QR_CODE',
    checkedInBy: 'Faculty QR Scanner',
    checkedOutBy: 'Faculty QR Scanner',
    date: '2026-09-01',
  },
  {
    id: 'att-103',
    memberId: 'mem-1',
    memberName: 'Chief Admin Librarian',
    memberCardNo: 'ADM-2024-0001',
    role: 'ADMIN',
    department: 'Library Information Science',
    email: 'admin@college.edu',
    checkInTime: `2026-09-01 08:30:00`,
    checkOutTime: `2026-09-01 17:00:00`,
    durationMinutes: 510,
    status: 'COMPLETED',
    entryGate: 'Main Gate - Central Library',
    purposeOfVisit: 'BOOK_ISSUE_RETURN',
    verificationMethod: 'CARD_SCAN',
    checkedInBy: 'Admin Desk',
    checkedOutBy: 'Admin Desk',
    date: '2026-09-01',
  },
];

const DEFAULT_NO_DUE_CERTIFICATES: NoDueCertificate[] = [];

const DEFAULT_NO_DUE_APPLICATIONS: NoDueApplication[] = [];

const DEFAULT_OFFICIAL_DOCUMENTS: OfficialDocument[] = [
  {
    id: 'doc-form-1',
    title: 'Library Membership Registration Form',
    category: 'Forms & Membership Applications',
    fileSize: '125 KB',
    fileType: 'Official PDF',
    description: 'Standard application for student, faculty & research scholar library smartcard registration.',
    updatedDate: 'August 2026',
    downloadCount: 142,
    createdAt: '2026-08-01',
    uploadedBy: 'Chief Librarian',
  },
  {
    id: 'doc-form-2',
    title: 'Book Procurement Suggestion Form',
    category: 'Forms & Membership Applications',
    fileSize: '85 KB',
    fileType: 'Official PDF',
    description: 'Official requisition slip to recommend new reference books and subscriptions.',
    updatedDate: 'August 2026',
    downloadCount: 68,
    createdAt: '2026-08-01',
    uploadedBy: 'Chief Librarian',
  },
  {
    id: 'doc-form-3',
    title: 'No Dues Clearance Certificate Form',
    category: 'Forms & Membership Applications',
    fileSize: '92 KB',
    fileType: 'Official PDF',
    description: 'Institutional clearance declaration for student graduation and employee exit.',
    updatedDate: 'August 2026',
    downloadCount: 310,
    createdAt: '2026-08-01',
    uploadedBy: 'Chief Librarian',
  },
  {
    id: 'doc-policy-1',
    title: 'University Library Rules & Regulations',
    category: 'Library Policies & Conduct Rules',
    fileSize: '450 KB',
    fileType: 'Official PDF',
    description: 'Authoritative code of conduct, quiet zone etiquette, and circulation policies.',
    updatedDate: 'Academic Year 2026',
    downloadCount: 220,
    createdAt: '2026-08-01',
    uploadedBy: 'Chief Librarian',
  },
  {
    id: 'doc-policy-2',
    title: 'Digital Lab & Workstation Code of Conduct',
    category: 'Library Policies & Conduct Rules',
    fileSize: '210 KB',
    fileType: 'Official PDF',
    description: 'Acceptable use guidelines for multimedia lab terminals and high-speed network access.',
    updatedDate: 'Academic Year 2026',
    downloadCount: 95,
    createdAt: '2026-08-01',
    uploadedBy: 'Chief Librarian',
  },
  {
    id: 'doc-policy-3',
    title: 'Overdue Fine & Loss Penalty Guidelines',
    category: 'Library Policies & Conduct Rules',
    fileSize: '180 KB',
    fileType: 'Official PDF',
    description: 'Statutory fine schedules, lost item replacement costs, and waiver procedures.',
    updatedDate: 'Academic Year 2026',
    downloadCount: 180,
    createdAt: '2026-08-01',
    uploadedBy: 'Chief Librarian',
  },
  {
    id: 'doc-acad-1',
    title: 'University Academic Calendar 2026-2027',
    category: 'Academic Exam & Curriculum',
    fileSize: '1.2 MB',
    fileType: 'Official PDF',
    description: 'Comprehensive schedule of semesters, instructional days, holidays, and milestones.',
    updatedDate: 'Session 2026-27',
    downloadCount: 520,
    createdAt: '2026-08-01',
    uploadedBy: 'Office of Academic Affairs',
  },
  {
    id: 'doc-acad-2',
    title: 'End Semester Exam Timetable & Guidelines',
    category: 'Academic Exam & Curriculum',
    fileSize: '340 KB',
    fileType: 'Official PDF',
    description: 'Examination hall rules, schedule of core theory and lab examinations.',
    updatedDate: 'Session 2026-27',
    downloadCount: 430,
    createdAt: '2026-08-01',
    uploadedBy: 'Controller of Examinations',
  },
  {
    id: 'doc-acad-3',
    title: 'Library Catalog & Circulation User Manual',
    category: 'Academic Exam & Curriculum',
    fileSize: '650 KB',
    fileType: 'Official PDF',
    description: 'Complete user guide for OPAC search, online renewals, and digital resource access.',
    updatedDate: 'Session 2026-27',
    downloadCount: 165,
    createdAt: '2026-08-01',
    uploadedBy: 'Chief Librarian',
  },
];

export const DEFAULT_CALENDAR_EVENTS: UniversityCalendarEvent[] = [
  {
    id: 'cal-2026-001',
    date: '2026-01-01',
    title: "New Year's Day",
    type: 'HOLIDAY',
    category: 'GAZETTED_NATIONAL',
    isLibraryOpen: false,
    description: 'National and University Holiday on occasion of New Year 2026.',
    declaredBy: 'Office of the Registrar',
    affectedBranches: ['All Library Branches'],
    isRecurringAnnually: true,
    createdAt: '2026-01-01',
  },
  {
    id: 'cal-2026-002',
    date: '2026-01-14',
    title: 'Makar Sankranti / Pongal Festival',
    type: 'HOLIDAY',
    category: 'FESTIVAL',
    isLibraryOpen: false,
    description: 'Harvest festival holiday declared for all faculty and students.',
    declaredBy: 'Office of the Registrar',
    affectedBranches: ['All Library Branches'],
    isRecurringAnnually: true,
    createdAt: '2026-01-01',
  },
  {
    id: 'cal-2026-003',
    date: '2026-01-26',
    title: 'Republic Day of India',
    type: 'HOLIDAY',
    category: 'GAZETTED_NATIONAL',
    isLibraryOpen: false,
    description: 'Gazetted National Holiday. Flag hoisting ceremony at University Main Quadrangle at 8:30 AM.',
    declaredBy: 'Government of India / University Administration',
    affectedBranches: ['All Library Branches'],
    isRecurringAnnually: true,
    createdAt: '2026-01-01',
  },
  {
    id: 'cal-2026-004',
    date: '2026-03-08',
    title: "International Women's Day & Special Literary Showcase",
    type: 'HOLIDAY',
    category: 'UNIVERSITY_DECLARED',
    isLibraryOpen: false,
    description: 'University Holiday celebrating Women in Higher Education and Research.',
    declaredBy: 'Office of the Vice Chancellor',
    affectedBranches: ['All Library Branches'],
    isRecurringAnnually: true,
    createdAt: '2026-01-01',
  },
  {
    id: 'cal-2026-005',
    date: '2026-03-25',
    title: 'Holi Festival of Colors',
    type: 'HOLIDAY',
    category: 'FESTIVAL',
    isLibraryOpen: false,
    description: 'Official University Holiday for Holi celebration. All reading halls closed.',
    declaredBy: 'Office of the Registrar',
    affectedBranches: ['All Library Branches'],
    isRecurringAnnually: false,
    createdAt: '2026-01-01',
  },
  {
    id: 'cal-2026-006',
    date: '2026-04-14',
    title: 'Dr. B.R. Ambedkar Jayanti',
    type: 'HOLIDAY',
    category: 'GAZETTED_NATIONAL',
    isLibraryOpen: false,
    description: 'Gazetted National Holiday commemorating Bharat Ratna Dr. B.R. Ambedkar.',
    declaredBy: 'Government of India',
    affectedBranches: ['All Library Branches'],
    isRecurringAnnually: true,
    createdAt: '2026-01-01',
  },
  {
    id: 'cal-2026-007',
    date: '2026-05-01',
    title: "International Workers' Day / May Day",
    type: 'HOLIDAY',
    category: 'GAZETTED_NATIONAL',
    isLibraryOpen: false,
    description: 'Gazetted Holiday honoring workforce and university staff.',
    declaredBy: 'Office of the Registrar',
    affectedBranches: ['All Library Branches'],
    isRecurringAnnually: true,
    createdAt: '2026-01-01',
  },
  {
    id: 'cal-2026-008',
    date: '2026-06-21',
    title: 'International Yoga Day & Digital Library Orientation',
    type: 'WORKING_DAY',
    category: 'SPECIAL_SCHEDULE',
    isLibraryOpen: true,
    openTime: '08:00',
    closeTime: '22:00',
    customHoursText: '08:00 AM – 10:00 PM',
    description: 'Special active academic session with morning yoga and digital e-resource training workshops.',
    declaredBy: 'Chief Librarian & Director of Physical Education',
    affectedBranches: ['Central Library', 'Digital Resource Lab'],
    createdAt: '2026-01-01',
  },
  {
    id: 'cal-2026-009',
    date: '2026-08-15',
    title: 'Independence Day of India (80th)',
    type: 'HOLIDAY',
    category: 'GAZETTED_NATIONAL',
    isLibraryOpen: false,
    description: 'Gazetted National Holiday. Independence Day parade and address by the Vice Chancellor.',
    declaredBy: 'Government of India / University Administration',
    affectedBranches: ['All Library Branches'],
    isRecurringAnnually: true,
    createdAt: '2026-01-01',
  },
  {
    id: 'cal-2026-010',
    date: '2026-09-05',
    title: "Teachers' Day & Special Academic Reading Hours",
    type: 'SPECIAL_HOURS',
    category: 'SPECIAL_SCHEDULE',
    isLibraryOpen: true,
    openTime: '08:00',
    closeTime: '22:00',
    customHoursText: '08:00 AM – 10:00 PM',
    description: "Honoring Dr. Sarvepalli Radhakrishnan with special faculty research access and open reading desks.",
    declaredBy: 'Chief Librarian',
    affectedBranches: ['Central Library', 'Faculty Research Wing'],
    isRecurringAnnually: true,
    createdAt: '2026-01-01',
  },
  {
    id: 'cal-2026-011',
    date: '2026-09-06',
    title: 'Sunday Mid-Term Exam Special Study Session (Declared Working Day)',
    type: 'WORKING_DAY',
    category: 'EXAMINATION',
    isLibraryOpen: true,
    openTime: '09:00',
    closeTime: '21:00',
    customHoursText: '09:00 AM – 09:00 PM',
    description: 'Declared working Sunday by Academic Senate to support students preparing for upcoming mid-term exams.',
    declaredBy: 'Controller of Examinations & Chief Librarian',
    affectedBranches: ['Central Library', 'Reading Hall A & B'],
    createdAt: '2026-01-01',
  },
  {
    id: 'cal-2026-012',
    date: '2026-10-02',
    title: 'Mahatma Gandhi Jayanti & Shastri Jayanti',
    type: 'HOLIDAY',
    category: 'GAZETTED_NATIONAL',
    isLibraryOpen: false,
    description: 'Gazetted National Holiday. National Cleanliness Drive (Swachhata Pakhwada) observed.',
    declaredBy: 'Government of India',
    affectedBranches: ['All Library Branches'],
    isRecurringAnnually: true,
    createdAt: '2026-01-01',
  },
  {
    id: 'cal-2026-013',
    date: '2026-10-12',
    title: 'Dussehra / Vijayadashami',
    type: 'HOLIDAY',
    category: 'FESTIVAL',
    isLibraryOpen: false,
    description: 'University Holiday for Vijayadashami celebration and Ayudha Puja.',
    declaredBy: 'Office of the Registrar',
    affectedBranches: ['All Library Branches'],
    createdAt: '2026-01-01',
  },
  {
    id: 'cal-2026-014',
    date: '2026-11-01',
    title: 'Statehood Day / Kannada Rajyotsava',
    type: 'HOLIDAY',
    category: 'GAZETTED_NATIONAL',
    isLibraryOpen: false,
    description: 'State Gazette Holiday celebrated across the university campus.',
    declaredBy: 'State Higher Education Board',
    affectedBranches: ['All Library Branches'],
    isRecurringAnnually: true,
    createdAt: '2026-01-01',
  },
  {
    id: 'cal-2026-015',
    date: '2026-11-08',
    endDate: '2026-11-09',
    title: 'Diwali / Deepavali & Govardhan Puja Break',
    type: 'HOLIDAY',
    category: 'FESTIVAL',
    isLibraryOpen: false,
    description: 'University Festival Holiday for Deepavali. Library desk and physical study halls remain closed.',
    declaredBy: 'Office of the Registrar',
    affectedBranches: ['All Library Branches'],
    createdAt: '2026-01-01',
  },
  {
    id: 'cal-2026-016',
    date: '2026-11-15',
    title: 'University Foundation Day & Heritage Exhibition',
    type: 'SPECIAL_HOURS',
    category: 'UNIVERSITY_DECLARED',
    isLibraryOpen: true,
    openTime: '09:00',
    closeTime: '18:00',
    customHoursText: '09:00 AM – 06:00 PM',
    description: 'Special commemorative schedule for University Foundation Day. Rare manuscripts archive open for viewing.',
    declaredBy: 'Office of the Vice Chancellor',
    affectedBranches: ['Central Library', 'Archives & Special Collections'],
    createdAt: '2026-01-01',
  },
  {
    id: 'cal-2026-017',
    date: '2026-12-25',
    title: 'Christmas Day',
    type: 'HOLIDAY',
    category: 'GAZETTED_NATIONAL',
    isLibraryOpen: false,
    description: 'Gazetted National Holiday. Central Library and departmental branches closed.',
    declaredBy: 'Government of India',
    affectedBranches: ['All Library Branches'],
    isRecurringAnnually: true,
    createdAt: '2026-01-01',
  },
  {
    id: 'cal-2026-018',
    date: '2026-12-28',
    endDate: '2026-12-31',
    title: 'End-Semester Final Examination Study Week (Extended Night Hours)',
    type: 'EXAM_PERIOD',
    category: 'EXAMINATION',
    isLibraryOpen: true,
    openTime: '07:00',
    closeTime: '23:59',
    customHoursText: '07:00 AM – 11:59 PM (Extended Study Desk)',
    description: 'Special extended reading hall hours to support students during end-semester comprehensive examinations.',
    declaredBy: 'Academic Council & Chief Librarian',
    affectedBranches: ['Central Library Reading Halls', 'Digital Center'],
    createdAt: '2026-01-01',
  },
];

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
    const saved = localStorage.getItem(STORAGE_KEY);
    let initialState: StateSchema;

    if (saved) {
      try {
        initialState = JSON.parse(saved);
        if (!initialState.config) {
          initialState.config = DEFAULT_CONFIG;
        } else {
          // Normalize fineRatePerDay to 5.00 across all persistent stores
          initialState.config.fineRatePerDay = 5.00;
        }
        if (!initialState.procurementRequests) {
          initialState.procurementRequests = INITIAL_PROCUREMENT_REQUESTS;
        }
        if (!initialState.vendors || initialState.vendors.length === 0) {
          initialState.vendors = DEFAULT_VENDORS;
        }
        if (!initialState.extensionRequests || initialState.extensionRequests.length === 0) {
          initialState.extensionRequests = INITIAL_EXTENSION_REQUESTS;
        }
        if (!initialState.notices || initialState.notices.length === 0) {
          initialState.notices = DEFAULT_NOTICES;
        }
        if (!initialState.attendanceRecords || initialState.attendanceRecords.length === 0) {
          initialState.attendanceRecords = DEFAULT_ATTENDANCE_RECORDS;
        } else {
          // Clean up any stale mock active sessions so nobody is automatically checked in without a scan
          initialState.attendanceRecords = initialState.attendanceRecords.map((r) => {
            if (r.status === 'IN_LIBRARY' && (r.id === 'att-102' || r.id === 'att-103')) {
              return {
                ...r,
                status: 'COMPLETED',
                checkOutTime: r.checkOutTime || `${r.date || '2026-09-01'} 12:30:00`,
                durationMinutes: r.durationMinutes || 150,
              };
            }
            return r;
          });
        }
        if (!initialState.noDueApplications || initialState.noDueApplications.length === 0) {
          initialState.noDueApplications = DEFAULT_NO_DUE_APPLICATIONS;
        }
        if (initialState.fines && initialState.fines.length > 0) {
          // Remove old mock fines that reference outdated mock transactions or names
          initialState.fines = initialState.fines.filter(
            (f: any) =>
              !f.id.startsWith('fine-101') &&
              !f.id.startsWith('fine-102') &&
              !f.id.startsWith('fine-201') &&
              !f.id.startsWith('fine-301') &&
              !f.id.startsWith('fine-401') &&
              !f.id.startsWith('fine-501') &&
              !f.id.startsWith('fine-601') &&
              !f.id.startsWith('fine-701') &&
              !f.id.startsWith('fine-801') &&
              f.memberName !== 'Dr. Sarah Connor'
          );
        }
        if (!initialState.noDueCertificates || initialState.noDueCertificates.length === 0) {
          initialState.noDueCertificates = DEFAULT_NO_DUE_CERTIFICATES;
        }
        if (!initialState.officialDocuments || initialState.officialDocuments.length === 0) {
          initialState.officialDocuments = DEFAULT_OFFICIAL_DOCUMENTS;
        }
        if (!initialState.calendarEvents || initialState.calendarEvents.length === 0) {
          initialState.calendarEvents = DEFAULT_CALENDAR_EVENTS;
        }

        // Sanitize: ensure no member with active loans has an active certificate or application
        if (initialState.noDueCertificates || initialState.noDueApplications) {
          const activeLoanMemberIds = new Set(
            (initialState.transactions || [])
              .filter((t) => t.status === 'ISSUED' || t.status === 'RENEWED' || t.status === 'OVERDUE')
              .map((t) => (t.memberId || '').toLowerCase())
          );
          const activeLoanMemberCards = new Set(
            (initialState.transactions || [])
              .filter((t) => t.status === 'ISSUED' || t.status === 'RENEWED' || t.status === 'OVERDUE')
              .map((t) => (t.memberCardNo || '').toLowerCase())
          );

          if (initialState.noDueCertificates) {
            initialState.noDueCertificates = initialState.noDueCertificates.filter(
              (c) =>
                !activeLoanMemberIds.has((c.memberId || '').toLowerCase()) &&
                !activeLoanMemberCards.has((c.memberCardNo || '').toLowerCase())
            );
          }
          if (initialState.noDueApplications) {
            initialState.noDueApplications = initialState.noDueApplications.filter(
              (a) =>
                !activeLoanMemberIds.has((a.studentId || '').toLowerCase()) &&
                !activeLoanMemberCards.has((a.libraryMembershipId || '').toLowerCase())
            );
          }
        }

        // Auto-merge all 22 university department categories into existing state
        if (!initialState.categories || initialState.categories.length < DEFAULT_CATEGORIES.length) {
          const existingCodes = new Set((initialState.categories || []).map((c) => c.code));
          const missing = DEFAULT_CATEGORIES.filter((c) => !existingCodes.has(c.code));
          initialState.categories = [...(initialState.categories || []), ...missing];
        }

        // Auto-merge all default university department books into stored state if missing
        if (initialState.books) {
          const existingIds = new Set(initialState.books.map((b) => b.id));
          const existingIsbns = new Set(initialState.books.map((b) => b.isbn));
          const missingBooks = DEFAULT_BOOKS.filter((b) => !existingIds.has(b.id) && !existingIsbns.has(b.isbn));
          if (missingBooks.length > 0) {
            initialState.books = [...initialState.books, ...missingBooks];
          }

          // Force sync missing reference books from DEFAULT_BOOKS definitions
          DEFAULT_BOOKS.forEach((def) => {
            const idx = initialState.books.findIndex((b) => b.id === def.id || b.isbn === def.isbn);
            if (idx === -1) {
              initialState.books.push(def);
            }
          });

          // Reserve EXACTLY Copy #1 (idx === 0) of EVERY book as a Reference Copy for in-library use only!
          initialState.books = initialState.books.map((b) => {
            const copies = (b.copies || []).map((c, idx) => ({
              ...c,
              isReferenceOnly: idx === 0,
            }));
            return {
              ...b,
              isReferenceOnly: false,
              collectionType: b.collectionType === 'REFERENCE' ? 'ACADEMIC' : (b.collectionType || 'ACADEMIC'),
              copies,
            };
          });
        }

        // Auto-merge all default enterprise digital resources into stored state if missing or incomplete
        const existingDigitalIds = new Set((initialState.digitalResources || []).map((d) => d.id));
        const missingDigital = DEFAULT_DIGITAL.filter((d) => !existingDigitalIds.has(d.id));
        if (missingDigital.length > 0) {
          initialState.digitalResources = [...(initialState.digitalResources || []), ...missingDigital];
        }

        // Ensure all digital resources have complete metadata
        if (initialState.digitalResources) {
          initialState.digitalResources = initialState.digitalResources.map((d) => {
            const defaultMatch = DEFAULT_DIGITAL.find((def) => def.id === d.id);
            if (defaultMatch) {
              return {
                ...defaultMatch,
                ...d,
                department: d.department || defaultMatch.department || 'All Departments',
                semester: d.semester || defaultMatch.semester || 'All Semesters',
                year: d.year || defaultMatch.year || 2026,
              };
            }
            return d;
          });
        }

        // Auto-heal missing or empty copies for any book in stored state
        if (initialState.books) {
          initialState.books = initialState.books.map((b) => {
            const defaultMatch = DEFAULT_BOOKS.find((db) => db.id === b.id || db.isbn === b.isbn);
            let copies = b.copies && b.copies.length > 0 ? b.copies : defaultMatch?.copies;
            if (!copies || copies.length === 0) {
              const totalCount = b.totalCopies || 3;
              copies = Array.from({ length: totalCount }, (_, i) => ({
                id: `copy-${b.id}-${i + 1}`,
                bookId: b.id,
                accessionNo: `ACC-2024-${b.id.replace('book-', '')}0${i + 1}`,
                barcode: `BC-99${b.id.replace('book-', '')}0${i + 1}`,
                qrCode: `QR-99${b.id.replace('book-', '')}0${i + 1}`,
                rackNumber: b.rackNumber || 'RACK-CS-01',
                shelfNumber: b.shelfNumber || 'SHELF-A1',
                status: 'AVAILABLE' as const,
                condition: 'NEW' as const,
                addedDate: getLocalDateStr(),
              }));
            }
            return {
              ...b,
              copies,
            };
          });
        }

        // Auto-migrate and deduplicate student member records in stored state
        if (initialState.members) {
          // Remove Vijayendra Majji if present in stored members array
          initialState.members = initialState.members.filter(
            (m) => m.id !== 'mem-4' && m.name !== 'Vijayendra Majji' && m.email !== 'student@cutm.ac.in' && m.memberCardNo !== '220301120045'
          );

          const uniqueMembers: MemberProfile[] = [];
          const seenCardNos = new Set<string>();

          initialState.members = initialState.members.map((m) => {
            if (m.id === 'mem-3' || m.memberCardNo === 'STU-2026-7326' || m.name === 'Jayendra Majji') {
              return {
                ...m,
                rollNo: m.rollNo || '22CS104',
                academicBatch: m.academicBatch || '2022 - 2026',
                registeredDate: '2022-08-01',
              };
            }
            return m;
          });

          const hasJayendra = initialState.members.some(
            (m) => m.memberCardNo === 'STU-2026-7326' || m.name === 'Jayendra Majji'
          );
          if (!hasJayendra) {
            initialState.members.unshift({
              id: 'mem-3',
              userId: '3',
              name: 'Jayendra Majji',
              email: 'jayendramajji22@gmail.com',
              role: 'STUDENT',
              memberCardNo: 'STU-2026-7326',
              rollNo: '22CS104',
              academicBatch: '2022 - 2026',
              department: 'Computer Science & Engineering',
              status: 'ACTIVE',
              maxAllowedBooks: 5,
              currentActiveLoans: 0,
              pendingFines: 0.00,
              registeredDate: '2022-08-01',
              avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
            });
          }

          initialState.members.forEach((m) => {
            const cardKey = (m.memberCardNo || m.email).toLowerCase();
            if (!seenCardNos.has(cardKey)) {
              seenCardNos.add(cardKey);
              uniqueMembers.push(m);
            }
          });

          initialState.members = uniqueMembers;
        }

        if (initialState.transactions) {
          initialState.transactions = initialState.transactions.map((t) =>
            t.memberName === 'Alex Johnson' || t.memberId === 'mem-3' || t.memberName?.includes('Jayendra') || t.memberCardNo === 'STU-2024-8841'
              ? { ...t, memberName: 'Jayendra Majji', memberCardNo: 'STU-2026-7326' }
              : t
          );
        }
        if (initialState.reservations) {
          initialState.reservations = initialState.reservations.map((r) =>
            r.memberName === 'Alex Johnson' || r.memberId === 'mem-3' || r.memberName?.includes('Jayendra') || r.memberCardNo === 'STU-2024-8841'
              ? { ...r, memberName: 'Jayendra Majji', memberCardNo: 'STU-2026-7326' }
              : r
          );
        }
        if (initialState.fines) {
          initialState.fines = initialState.fines.map((f) =>
            f.memberName === 'Alex Johnson' || f.memberId === 'mem-3' || f.memberName?.includes('Jayendra') || f.memberCardNo === 'STU-2024-8841'
              ? { ...f, memberName: 'Jayendra Majji', memberCardNo: 'STU-2026-7326' }
              : f
          );
        }
        if (initialState.notices) {
          initialState.notices = initialState.notices.map((n) => ({
            ...n,
            title: n.title.replace(/Alex Johnson/g, 'Jayendra Majji'),
            content: n.content.replace(/Alex Johnson/g, 'Jayendra Majji'),
            recipientEmail: n.recipientEmail === 'student@college.edu' ? 'jayendramajji22@gmail.com' : n.recipientEmail,
            recipientName: n.recipientName === 'Alex Johnson' || !n.recipientName ? 'Jayendra Majji' : n.recipientName,
          }));
        }

        // Strict cleanup: Purge any unregistered people from all store arrays
        if (initialState.members) {
          const validMemberIds = new Set(initialState.members.map((m) => m.id.toLowerCase()));
          const validCardNos = new Set(initialState.members.map((m) => (m.memberCardNo || '').toLowerCase()));
          const validEmails = new Set(initialState.members.map((m) => (m.email || '').toLowerCase()));

          if (initialState.noDueApplications) {
            initialState.noDueApplications = initialState.noDueApplications.filter(
              (a) =>
                validMemberIds.has((a.studentId || '').toLowerCase()) ||
                validCardNos.has((a.libraryMembershipId || '').toLowerCase()) ||
                validEmails.has((a.email || '').toLowerCase())
            );
          }

          if (initialState.noDueCertificates) {
            initialState.noDueCertificates = initialState.noDueCertificates.filter(
              (c) =>
                validMemberIds.has((c.memberId || '').toLowerCase()) ||
                validCardNos.has((c.memberCardNo || '').toLowerCase())
            );
          }

          if (initialState.attendanceRecords) {
            initialState.attendanceRecords = initialState.attendanceRecords.filter(
              (r) =>
                validMemberIds.has((r.memberId || '').toLowerCase()) ||
                validCardNos.has((r.memberCardNo || '').toLowerCase()) ||
                validEmails.has((r.email || '').toLowerCase())
            );
          }
        }
      } catch (e) {
        initialState = this.getDefaultState();
      }
    } else {
      initialState = this.getDefaultState();
    }

    // Auto-normalize transactions and compute overdue fines for any transaction that crossed due date
    if (initialState.transactions) {
      const today = new Date();
      const todayDateOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const fineRate = initialState.config?.fineRatePerDay || 5.00;

      initialState.transactions = initialState.transactions.map((t) => {
        const dueD = new Date(t.dueDate.split(' ')[0]);
        if (t.returnDate) {
          const retD = new Date(t.returnDate.split(' ')[0]);
          if (retD > dueD) {
            const diffDays = Math.max(1, Math.ceil((retD.getTime() - dueD.getTime()) / (1000 * 3600 * 24)));
            const fineAmt = diffDays * fineRate;
            return {
              ...t,
              fineAmount: t.fineAmount && t.fineAmount > 0 ? t.fineAmount : fineAmt,
              fineStatus: t.fineStatus || 'PAID',
            };
          }
        } else if (todayDateOnly > dueD) {
          const diffDays = Math.max(1, Math.ceil((todayDateOnly.getTime() - dueD.getTime()) / (1000 * 3600 * 24)));
          const fineAmt = diffDays * fineRate;
          return {
            ...t,
            status: 'OVERDUE' as const,
            fineAmount: fineAmt,
            fineStatus: (t.fineStatus === 'PAID' ? 'PAID' : 'UNPAID') as 'PAID' | 'UNPAID',
          };
        }
        return t;
      });
    }

    // Auto-deduplicate books by ID, ISBN, or Title combination
    if (initialState.books) {
      const seenBookIds = new Set<string>();
      const seenIsbns = new Set<string>();
      const seenTitles = new Set<string>();

      const uniqueBooks: Book[] = [];
      initialState.books.forEach((b) => {
        const titleKey = (b.title || '').trim().toLowerCase();
        const isbnKey = b.isbn ? b.isbn.trim() : '';

        const isDuplicate =
          seenBookIds.has(b.id) ||
          (isbnKey !== '' && seenIsbns.has(isbnKey)) ||
          (titleKey !== '' && seenTitles.has(titleKey));

        if (!isDuplicate) {
          seenBookIds.add(b.id);
          if (isbnKey) seenIsbns.add(isbnKey);
          if (titleKey) seenTitles.add(titleKey);
          uniqueBooks.push(b);
        }
      });

      initialState.books = uniqueBooks;
    }

    // Auto-synchronize book copy statuses with active issue transactions
    if (initialState.books && initialState.transactions) {
      initialState.books = initialState.books.map((b) => {
        const updatedCopies = (b.copies || []).map((copy) => {
          const activeTx = (initialState.transactions || []).find(
            (t) =>
              (t.status === 'ISSUED' || t.status === 'OVERDUE' || t.status === 'RENEWED') &&
              (t.accessionNo === copy.accessionNo || t.barcode === copy.barcode || t.bookCopyId === copy.id)
          );
          const expectedStatus: BookStatus = activeTx ? 'ISSUED' : 'AVAILABLE';
          if (copy.status !== expectedStatus) {
            return { ...copy, status: expectedStatus };
          }
          return copy;
        });

        const issuedCount = updatedCopies.filter((c) => c.status === 'ISSUED').length;
        const availableCount = Math.max(0, b.totalCopies - issuedCount);

        const loc = normalizeRackAndShelf(b.rackNumber, b.shelfNumber, b.department || b.categoryName, b.title);
        const normRack = loc.rackCode;
        const normShelf = loc.shelfCode;
        const copiesWithNormRack = updatedCopies.map((c) => ({
          ...c,
          rackNumber: normRack,
          shelfNumber: normShelf,
        }));

        return {
          ...b,
          rackNumber: normRack,
          shelfNumber: normShelf,
          availableCopies: availableCount,
          copies: copiesWithNormRack,
        };
      });
    }

    // Auto-synchronize member active loan counts and pending fines with transactions & fine ledgers
    if (initialState.members && initialState.transactions) {
      initialState.members = initialState.members.map((m) => {
        const uId = m.id;
        const uCard = (m.memberCardNo || '').toLowerCase();
        const uEmail = (m.email || '').toLowerCase();

        const activeLoansCount = (initialState.transactions || []).filter(
          (t) =>
            (t.status === 'ISSUED' || t.status === 'OVERDUE' || t.status === 'RENEWED') &&
            (t.memberId === uId || (t.memberCardNo && t.memberCardNo.toLowerCase() === uCard) || (uEmail && (t.memberCardNo?.toLowerCase() === uEmail || (t as any).email?.toLowerCase() === uEmail)))
        ).length;

        const livePendingFines = getMemberPendingFines(m.id, initialState);

        return {
          ...m,
          currentActiveLoans: activeLoansCount,
          pendingFines: livePendingFines,
        };
      });
    }

    this.state$ = new SimpleBehaviorSubject<StateSchema>(initialState);
    this.state$.subscribe((state) => {
      try {
        // Strip heavy base64 strings from localStorage to stay far below 5MB browser quota
        const safeState = {
          ...state,
          digitalResources: (state.digitalResources || []).map((d) => {
            if (d.uploadedFileData && d.uploadedFileData.length > 50000) {
              digitalFileStorage.saveFile(d.id, d.uploadedFileData, d.uploadedFileName, d.fileMimeType);
              const { uploadedFileData, ...rest } = d;
              return rest;
            }
            return d;
          }),
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(safeState));
      } catch (err) {
        console.warn('LocalStorage save quota exceeded or failed:', err);
      }
    });

    // Run operating hours auto checkout logic on initialization
    this.checkAndAutoCheckoutExpiredSessions();

    // Setup periodic auto checkout timer (runs every 30 seconds)
    if (typeof window !== 'undefined') {
      setInterval(() => {
        this.checkAndAutoCheckoutExpiredSessions();
      }, 30000);
    }
  }

  private getDefaultState(): StateSchema {
    return {
      categories: DEFAULT_CATEGORIES,
      authors: DEFAULT_AUTHORS,
      publishers: DEFAULT_PUBLISHERS,
      books: DEFAULT_BOOKS,
      members: DEFAULT_MEMBERS,
      transactions: DEFAULT_TRANSACTIONS,
      reservations: DEFAULT_RESERVATIONS,
      fines: DEFAULT_FINES,
      digitalResources: DEFAULT_DIGITAL,
      auditLogs: DEFAULT_AUDIT_LOGS,
      config: DEFAULT_CONFIG,
      procurementRequests: INITIAL_PROCUREMENT_REQUESTS,
      notices: DEFAULT_NOTICES,
      extensionRequests: INITIAL_EXTENSION_REQUESTS,
      vendors: DEFAULT_VENDORS,
      attendanceRecords: DEFAULT_ATTENDANCE_RECORDS,
      noDueApplications: DEFAULT_NO_DUE_APPLICATIONS,
      noDueCertificates: DEFAULT_NO_DUE_CERTIFICATES,
      officialDocuments: DEFAULT_OFFICIAL_DOCUMENTS,
      calendarEvents: DEFAULT_CALENDAR_EVENTS,
      readNoticeIds: {},
    };
  }

  get snapshot(): StateSchema {
    return this.state$.getValue();
  }

  public getObservable() {
    return this.state$;
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
        const targetRack = updated.rackNumber || b.rackNumber || 'RACK-BTECH-CSE-01';
        const targetShelf = updated.shelfNumber || b.shelfNumber || 'SHELF-1';
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
      const cLower = m.memberCardNo.toLowerCase();
      const idLower = m.id.toLowerCase();
      const eLower = m.email.toLowerCase();

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
      const cLower = m.memberCardNo.toLowerCase();
      const idLower = m.id.toLowerCase();
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
        message: `RESTRICTED ITEM: Copy "${targetCopy.accessionNo}" (${targetCopy.barcode}) of "${targetBook.title}" is reserved as Copy #1 Reference Copy for in-library reading room use only and CANNOT be checked out. Please issue Copy #2 or higher for member loans.`,
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

    this.addAuditLog('1', 'Admin Librarian', 'ADMIN', 'RENEW_BOOK', 'CIRCULATION', `Renewed loan ${tx.id} for ${tx.memberName}. New Due: ${newDueDate}`);

    return { success: true, message: `Renewal approved. Extended due date: ${newDueDate}`, newDueDate };
  }

  public requestBookExtension(transactionId: string, requestedByMemberId: string, extensionDays: number, reason: string): { success: boolean; message: string } {
    const current = this.snapshot;
    const tx = current.transactions.find((t) => t.id === transactionId);
    if (!tx) {
      return { success: false, message: 'Active borrowed loan transaction record not found.' };
    }

    if (tx.status !== 'ISSUED' && tx.status !== 'OVERDUE') {
      return { success: false, message: 'This book loan is not active. Cannot request extension.' };
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
  }): MemberProfile {
    const current = this.snapshot;

    // Check if email already exists
    const existing = current.members.find((m) => m.email.toLowerCase() === data.email.toLowerCase());
    if (existing) {
      return existing;
    }

    const prefix = data.role === 'STUDENT' ? 'STU' : data.role === 'FACULTY' ? 'FAC' : data.role === 'STAFF' ? 'STF' : 'ADM';
    const cardNo = `${prefix}-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const maxBooks = data.role === 'FACULTY' ? 10 : data.role === 'STUDENT' ? 5 : 15;

    const newMember: MemberProfile = {
      id: `mem-${Date.now()}`,
      userId: `user-${Date.now()}`,
      name: data.name,
      email: data.email,
      role: data.role,
      memberCardNo: cardNo,
      department: data.department || 'General Academic',
      status: 'ACTIVE',
      maxAllowedBooks: maxBooks,
      currentActiveLoans: 0,
      pendingFines: 0.00,
      registeredDate: getLocalDateStr(new Date()),
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
      { name: 'Active Checked-Out Loans', val: activeLoans, detail: `Overdue: ${overdueLoans} | Returned: ${returnedLoans}`, status: overdueLoans > 0 ? 'ATTENTION NEEDED' : 'CIRCULATION HEALTHY', badge: overdueLoans > 0 ? 'badge-red' : 'badge-green' },
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
      <th>Active Loans</th>
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
      'Circulation & Loans',
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
      'Circulation & Loans': { headerBg: '4F46E5', headerFont: 'FFFFFF', titleBg: '3730A3', titleFont: 'FFFFFF' },
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
        message: `Check-in Failed: Central Library is currently CLOSED. Operating Hours: Mon – Sat (8:00 AM – 10:00 PM) | Closed on Sundays & National Holidays. (${opStatus.reason})`,
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

          let noteText = 'Automatic check-out at Library Closing Time (10:00 PM Operating Hours Rule)';
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
        `Automatically checked out ${count} active library visitors outside operating hours (Mon-Sat 8:00 AM - 10:00 PM).`
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
    csv += `Current Active Loans,${activeLoansCount}\n`;
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
              <div class="stat-label">Active Loans</div>
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
    remarks: string = 'Cleared all library book loans and financial dues upon college course completion.'
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
        ? 'Real-time database audit passed: 0 Active Loans & ₹0 Fines. Ready for Head of Library approval.'
        : `Outstanding liabilities detected: ${audit.reasons.join(', ')}`,
      history: [
        ...app.history,
        {
          status: 'UNDER_VERIFICATION',
          changedAt: nowStr,
          changedBy: verifiedByName,
          remarks: audit.isEligible
            ? 'Live clearance audit passed: 0 active loans and 0 fines.'
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
