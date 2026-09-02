export type Role = 'ADMIN' | 'STAFF' | 'FACULTY' | 'STUDENT' | 'GUEST';

export type UserStatus = 'ACTIVE' | 'SUSPENDED' | 'PENDING_APPROVAL' | 'INACTIVE';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  status?: UserStatus;
  phone?: string;
  avatarUrl?: string;
  department?: string;
  memberCardNo?: string;
}

export type BookStatus = 'AVAILABLE' | 'ISSUED' | 'RESERVED' | 'MAINTENANCE' | 'LOST' | 'DISPOSED';
export type CopyCondition = 'NEW' | 'GOOD' | 'DAMAGED' | 'LOST';

export interface Category {
  id: string;
  name: string;
  code: string;
  description?: string;
  bookCount?: number;
}

export interface Author {
  id: string;
  name: string;
  biography?: string;
  email?: string;
  bookCount?: number;
}

export interface Publisher {
  id: string;
  name: string;
  address?: string;
  contactPerson?: string;
  bookCount?: number;
}

export interface BookCopy {
  id: string;
  bookId: string;
  accessionNo: string;
  barcode: string;
  qrCode: string;
  rackNumber: string;
  shelfNumber: string;
  status: BookStatus;
  condition: CopyCondition;
  addedDate: string;
  isReferenceOnly?: boolean;
}

export interface Book {
  id: string;
  title: string;
  isbn: string;
  categoryId: string;
  categoryName: string;
  authorId: string;
  authorName: string;
  publisherId: string;
  publisherName: string;
  edition: string;
  publishingYear: number;
  language: string;
  price: number;
  description: string;
  coverUrl: string;
  totalCopies: number;
  availableCopies: number;
  isFeatured: boolean;
  isBookOfMonth: boolean;
  copies?: BookCopy[];
  rackNumber?: string;
  shelfNumber?: string;
  department?: string;
  program?: string;
  specialization?: string;
  subject?: string;
  collectionType?: 'ACADEMIC' | 'GENERAL' | 'COMPETITIVE' | 'REFERENCE' | 'RESEARCH' | 'JOURNAL' | 'MAGAZINE' | 'NEWSPAPER' | 'DIGITAL' | 'RARE' | 'ARCHIVE';
  format?: 'PHYSICAL' | 'DIGITAL' | 'HYBRID';
  digitalUrl?: string;
  keywords?: string[];
  borrowCount?: number;
  isReferenceOnly?: boolean;
}

export type TransactionStatus = 'ISSUED' | 'RETURNED' | 'OVERDUE' | 'LOST' | 'RENEWED';

export interface IssueTransaction {
  id: string;
  bookCopyId: string;
  bookId: string;
  bookTitle: string;
  accessionNo: string;
  barcode: string;
  memberId: string;
  memberName: string;
  memberCardNo: string;
  memberType: Role;
  memberDepartment?: string;
  issuedByUserId: string;
  issuedByName: string;
  issueDate: string;
  dueDate: string;
  returnDate?: string;
  renewalCount: number;
  maxRenewals: number;
  status: TransactionStatus;
  fineAmount?: number;
  fineStatus?: 'UNPAID' | 'PAID' | 'WAIVED';
  notes?: string;
}

export type ReservationStatus = 'PENDING' | 'APPROVED' | 'FULFILLED' | 'CANCELLED' | 'EXPIRED';

export interface Reservation {
  id: string;
  bookId: string;
  bookTitle: string;
  coverUrl?: string;
  memberId: string;
  memberName: string;
  memberCardNo: string;
  requestDate: string;
  expiryDate?: string;
  queuePosition: number;
  status: ReservationStatus;
}

export type FineReason = 'OVERDUE' | 'DAMAGED' | 'LOST';
export type FineStatus = 'UNPAID' | 'PAID' | 'WAIVED';

export interface FineRecord {
  id: string;
  transactionId: string;
  memberId: string;
  memberName: string;
  memberCardNo: string;
  bookTitle: string;
  amount: number;
  paidAmount: number;
  reason: FineReason;
  status: FineStatus;
  receiptNo?: string;
  paidDate?: string;
  paymentMethod?: string;
  waivedBy?: string;
  waiveReason?: string;
  createdDate: string;
}

export type DigitalResourceType =
  | 'EBOOK'
  | 'JOURNAL'
  | 'QUESTION_PAPER'
  | 'SYLLABUS'
  | 'LECTURE_NOTES'
  | 'RESEARCH_PAPER'
  | 'THESIS_DISSERTATION'
  | 'PROJECT_REPORT'
  | 'FACULTY_PUBLICATION'
  | 'NEWSPAPER'
  | 'MAGAZINE'
  | 'NPTEL'
  | 'SWAYAM'
  | 'NDLI'
  | 'IEEE_XPLORE'
  | 'ACM_DIGITAL_LIBRARY'
  | 'SPRINGER_LINK'
  | 'SCIENCE_DIRECT'
  | 'JSTOR'
  | 'MULTIMEDIA';

export interface DigitalResource {
  id: string;
  title: string;
  resourceType: DigitalResourceType;
  categoryName: string;
  authorName: string;
  fileUrl: string;
  fileSizeMb: number;
  downloadCount: number;
  uploadDate: string;
  description?: string;
  department?: string;
  subject?: string;
  semester?: string;
  year?: number;
  isArchived?: boolean;
  externalUrl?: string;
  publisherName?: string;
  issnIsbn?: string;
  language?: string;
  accessLevel?: 'OPEN_ACCESS' | 'CAMPUS_ONLY' | 'SUBSCRIBED' | 'RESTRICTED';
  newspaperEdition?: string;
  newspaperRssFeedUrl?: string;
  contentSnippet?: string;
  thumbnailUrl?: string;
  uploadedFileData?: string;
  uploadedFileName?: string;
  fileMimeType?: string;
}

export interface OfficialDocument {
  id: string;
  title: string;
  category: 'Forms & Membership Applications' | 'Library Policies & Conduct Rules' | 'Academic Exam & Curriculum' | string;
  description: string;
  fileSize: string;
  fileType: string;
  updatedDate: string;
  uploadedFileData?: string;
  uploadedFileName?: string;
  isArchived?: boolean;
  downloadCount: number;
  createdAt: string;
  uploadedBy?: string;
}

export interface DigitalDownloadLog {
  id: string;
  resourceId: string;
  resourceTitle: string;
  resourceType: DigitalResourceType;
  userId: string;
  userName: string;
  userRole: Role;
  timestamp: string;
  fileSizeMb: number;
}

export interface MemberProfile {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: Role;
  memberCardNo: string;
  department: string;
  status: UserStatus;
  maxAllowedBooks: number;
  currentActiveLoans: number;
  pendingFines: number;
  registeredDate: string;
  avatarUrl?: string;
  phone?: string;
  rollNo?: string;
  program?: string;
  startingYear?: number;
  passoutYear?: number;
  academicBatch?: string;
  address?: string;
  emergencyContact?: string;
  noDueStatus?: 'ELIGIBLE' | 'DUES_PENDING' | 'ISSUED';
  noDueCertificateNo?: string;
  noDueIssuedDate?: string;
  noDueIssuedBy?: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  userRole: Role;
  action: string;
  module: string;
  details: string;
  timestamp: string;
}

export interface SystemConfig {
  libraryName: string;
  fineRatePerDay: number;
  studentMaxLoanDays: number;
  studentMaxBooks: number;
  facultyMaxLoanDays: number;
  facultyMaxBooks: number;
  maxRenewalLimit: number;
  reservationHoldHours: number;
  autoSendEmailAlerts: boolean;
  enableMaintenanceMode: boolean;
}

export type ProcurementStatus =
  | 'PENDING'
  | 'UNDER_REVIEW'
  | 'ON_HOLD'
  | 'APPROVED'
  | 'REJECTED'
  | 'PO_GENERATED'
  | 'ORDERED'
  | 'RECEIVED'
  | 'QUALITY_CHECKED'
  | 'CATALOGED'
  | 'AVAILABLE'
  | 'CLOSED';

export interface ProcurementTimelineStep {
  status: ProcurementStatus;
  label: string;
  timestamp: string;
  actorName: string;
  actorRole: string;
  notes?: string;
}

export interface Vendor {
  id: string;
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  rating?: number;
  specializationCategories?: string[];
}

export interface ProcurementRequest {
  id: string;
  bookTitle: string;
  authorName: string;
  isbn?: string;
  publisherName?: string;
  estimatedPrice?: number;
  requestedById: string;
  requestedByName: string;
  requestedByRole: Role;
  reason: string;
  status: ProcurementStatus;
  requestedDate: string;
  adminNotes?: string;
  reviewedByName?: string;
  reviewedDate?: string;
  
  // Vendor & Purchase Order (PO) Details
  vendorId?: string;
  vendorName?: string;
  vendorContact?: string;
  poNumber?: string;
  poDate?: string;
  quantityRequested?: number;
  approvedPrice?: number;
  actualPrice?: number;
  
  // Goods Receipt & Quality Inspection
  invoiceNo?: string;
  receivedDate?: string;
  receivedQuantity?: number;
  qualityStatus?: 'PASSED' | 'FAILED' | 'REJECTED_DAMAGED';
  
  // Cataloging & Rack Integration
  assignedCategoryId?: string;
  assignedCategoryName?: string;
  assignedRackNumber?: string;
  assignedShelfNumber?: string;
  generatedAccessionNos?: string[];
  generatedBarcodes?: string[];
  
  // Duplicate Request Merging
  isDuplicate?: boolean;
  duplicateOfRequestId?: string;
  duplicateCount?: number;
  
  // Audit Timeline
  timeline?: ProcurementTimelineStep[];
}

export interface Notice {
  id: string;
  title: string;
  content: string;
  targetAudience?: string;
  recipientEmail?: string;
  recipientName?: string;
  recipientMemberId?: string;
  createdDate: string;
  isUrgent?: boolean;
  senderName?: string;
  category?: 'DUE_REMINDER' | 'OVERDUE_WARNING' | 'FINE_PAYMENT' | 'GENERAL' | 'EXTENSION_UPDATE';
}

export type ExtensionRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface ExtensionRequest {
  id: string;
  transactionId: string;
  bookId: string;
  bookTitle: string;
  accessionNo: string;
  barcode: string;
  memberId: string;
  memberName: string;
  memberCardNo: string;
  memberRole: Role;
  currentDueDate: string;
  requestedExtensionDays: number;
  newDueDate?: string;
  reason: string;
  status: ExtensionRequestStatus;
  requestedDate: string;
  reviewedByName?: string;
  reviewedDate?: string;
  adminNotes?: string;
}

export type AttendanceStatus = 'IN_LIBRARY' | 'COMPLETED' | 'AUTO_CHECK_OUT' | 'MANUAL_OVERRIDE';
export type VerificationMethod = 'BARCODE' | 'QR_CODE' | 'CARD_SCAN' | 'MANUAL_ID';
export type VisitPurpose = 'GENERAL_READING' | 'BOOK_ISSUE_RETURN' | 'DIGITAL_LIBRARY' | 'RESEARCH_STUDY' | 'GROUP_DISCUSSION' | 'EXAM_PREPARATION';

export interface AttendanceRecord {
  id: string;
  memberId: string;
  memberName: string;
  memberCardNo: string;
  role: Role;
  department: string;
  email: string;
  checkInTime: string;
  checkOutTime?: string;
  durationMinutes?: number;
  status: AttendanceStatus;
  entryGate?: string;
  purposeOfVisit?: VisitPurpose;
  verificationMethod: VerificationMethod;
  checkedInBy?: string;
  checkedOutBy?: string;
  notes?: string;
  date: string;
}

export type NoDueStatus = 'DRAFT' | 'SUBMITTED' | 'UNDER_VERIFICATION' | 'APPROVED' | 'REJECTED' | 'CERTIFICATE_ISSUED';
export type NoDuePurpose =
  | 'COURSE_COMPLETION'
  | 'COLLEGE_TRANSFER'
  | 'SEMESTER_CLEARANCE'
  | 'INTERNSHIP_PROJECT'
  | 'EXAM_HALL_TICKET'
  | 'HOSTEL_CLEARANCE'
  | 'OTHER';

export interface NoDueApplicationHistory {
  status: NoDueStatus;
  changedAt: string;
  changedBy: string;
  remarks?: string;
}

export interface NoDueApplication {
  id: string;
  applicationNo: string;
  studentId: string;
  studentName: string;
  rollNo: string;
  department: string;
  program: string;
  batch: string;
  semesterYear: string;
  libraryMembershipId: string;
  email: string;
  phone?: string;
  purpose: NoDuePurpose;
  purposeOtherDetails?: string;
  applicationDate: string;
  status: NoDueStatus;
  adminRemarks?: string;
  rejectionReason?: string;
  verifiedDate?: string;
  verifiedBy?: string;
  certificateNo?: string;
  certificateIssuedDate?: string;
  outstandingLoansCount: number;
  outstandingFinesAmount: number;
  history: NoDueApplicationHistory[];
}

export interface NoDueCertificate {
  id: string;
  certificateNo: string;
  applicationId?: string;
  memberId: string;
  memberName: string;
  memberCardNo: string;
  rollNo?: string;
  role: Role;
  department?: string;
  program?: string;
  academicBatch?: string;
  semesterYear?: string;
  purpose?: string;
  issuedDate: string;
  issuedBy: string; // e.g. "Dr. M. S. Ramanujan (Chief Admin Librarian & Head of Library)"
  issuedByRole?: string;
  activeLoansCount: number;
  pendingFinesAmount: number;
  status: 'ISSUED' | 'REVOKED';
  verificationQrCode?: string;
  remarks?: string;
}

export type CalendarEventType = 'HOLIDAY' | 'WORKING_DAY' | 'SPECIAL_HOURS' | 'EXAM_PERIOD' | 'ACADEMIC_EVENT';

export type CalendarEventCategory =
  | 'GAZETTED_NATIONAL'
  | 'UNIVERSITY_DECLARED'
  | 'FESTIVAL'
  | 'EXAMINATION'
  | 'MAINTENANCE'
  | 'SEMESTER_BREAK'
  | 'SPECIAL_SCHEDULE';

export interface UniversityCalendarEvent {
  id: string;
  date: string; // YYYY-MM-DD
  endDate?: string; // Optional YYYY-MM-DD for multi-day events
  title: string;
  type: CalendarEventType;
  category: CalendarEventCategory;
  isLibraryOpen: boolean;
  openTime?: string; // e.g. "08:00"
  closeTime?: string; // e.g. "22:00"
  customHoursText?: string; // e.g. "08:00 AM – 10:00 PM"
  description?: string;
  declaredBy?: string; // e.g. "Office of the Registrar", "Chief Librarian"
  affectedBranches?: string[]; // e.g. ["Central Library", "Digital Center"]
  isRecurringAnnually?: boolean;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}
