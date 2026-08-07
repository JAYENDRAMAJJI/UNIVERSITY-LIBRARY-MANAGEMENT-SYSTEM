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
} from '../types/library';

// Key for LocalStorage
const STORAGE_KEY = 'college_lms_master_state_v1';

// Real Local System Date & Time Helpers (Uses local clock instead of UTC ISO strings)
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
  if (offsetDays !== 0) {
    d.setDate(d.getDate() + offsetDays);
  }
  return getLocalDateStr(d);
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

export const getLibraryOperatingStatus = (now: Date = new Date()): OperatingHoursStatus => {
  const dayOfWeek = now.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const currentMinutes = hours * 60 + minutes;

  const openMinutes = 8 * 60;   // 8:00 AM = 480 mins
  const closeMinutes = 22 * 60; // 10:00 PM = 1320 mins

  // 1. Sunday check
  if (dayOfWeek === 0) {
    return {
      isOpen: false,
      statusText: 'CLOSED (Sunday)',
      reason: 'Central Library is closed on Sundays. Reopens Monday at 8:00 AM.',
      nextOpenText: 'Opens Monday 8:00 AM',
    };
  }

  // 2. National Holiday check
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

  // 3. Operating hours check (8:00 AM - 10:00 PM)
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
    department: 'Computer Science & Engineering',
    status: 'ACTIVE',
    maxAllowedBooks: 5,
    currentActiveLoans: 2,
    pendingFines: 3.50,
    registeredDate: '2023-09-01',
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
    currentActiveLoans: 1,
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
    avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=200&q=80',
  },
];

const DEFAULT_TRANSACTIONS: IssueTransaction[] = [
  {
    id: 'tx-1001',
    bookCopyId: 'copy-102',
    bookId: 'book-1',
    bookTitle: 'Introduction to Algorithms (4th Edition)',
    accessionNo: 'ACC-2024-002',
    barcode: 'BC-99202',
    memberId: 'mem-3',
    memberName: 'Jayendra Majji',
    memberCardNo: 'STU-2026-7326',
    memberType: 'STUDENT',
    memberDepartment: 'Computer Science & Engineering',
    issuedByUserId: '1',
    issuedByName: 'Chief Admin Librarian',
    issueDate: '2026-07-01 10:14',
    dueDate: '2026-07-15',
    renewalCount: 1,
    maxRenewals: 2,
    status: 'OVERDUE',
    fineAmount: 3.50,
    fineStatus: 'UNPAID',
    notes: 'Standard borrowing issue.',
  },
  {
    id: 'tx-1002',
    bookCopyId: 'copy-202',
    bookId: 'book-2',
    bookTitle: 'Modern Operating Systems (5th Edition)',
    accessionNo: 'ACC-2024-011',
    barcode: 'BC-99302',
    memberId: 'mem-3',
    memberName: 'Jayendra Majji',
    memberCardNo: 'STU-2026-7326',
    memberType: 'STUDENT',
    memberDepartment: 'Computer Science & Engineering',
    issuedByUserId: '1',
    issuedByName: 'Chief Admin Librarian',
    issueDate: '2026-07-18 14:30',
    dueDate: '2026-08-01',
    renewalCount: 0,
    maxRenewals: 2,
    status: 'ISSUED',
    fineAmount: 0,
    notes: 'Course text reference.',
  },
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
    issueDate: '2026-07-10 09:15',
    dueDate: '2026-08-10',
    renewalCount: 0,
    maxRenewals: 3,
    status: 'ISSUED',
    fineAmount: 0,
  },
  {
    id: 'tx-1004',
    bookCopyId: 'copy-101',
    bookId: 'book-1',
    bookTitle: 'Introduction to Algorithms (4th Edition)',
    accessionNo: 'ACC-2024-001',
    barcode: 'BC-99201',
    memberId: 'mem-2',
    memberName: 'Dr. Sarah Connor',
    memberCardNo: 'FAC-2023-1102',
    memberType: 'FACULTY',
    memberDepartment: 'Electrical Engineering',
    issuedByUserId: '1',
    issuedByName: 'Chief Admin Librarian',
    issueDate: '2026-05-10 11:20',
    dueDate: '2026-06-10',
    returnDate: '2026-06-08 16:45',
    renewalCount: 0,
    maxRenewals: 3,
    status: 'RETURNED',
    fineAmount: 0,
    notes: 'Returned in good condition before due date.',
  },
  {
    id: 'tx-1005',
    bookCopyId: 'copy-103',
    bookId: 'book-1',
    bookTitle: 'Introduction to Algorithms (4th Edition)',
    accessionNo: 'ACC-2024-003',
    barcode: 'BC-99203',
    memberId: 'mem-3',
    memberName: 'Jayendra Majji',
    memberCardNo: 'STU-2026-7326',
    memberType: 'STUDENT',
    memberDepartment: 'Computer Science & Engineering',
    issuedByUserId: '1',
    issuedByName: 'Chief Admin Librarian',
    issueDate: '2026-03-01 09:00',
    dueDate: '2026-03-15',
    returnDate: '2026-03-14 15:10',
    renewalCount: 0,
    maxRenewals: 2,
    status: 'RETURNED',
    fineAmount: 0,
  },
  {
    id: 'tx-1006',
    bookCopyId: 'copy-302',
    bookId: 'book-3',
    bookTitle: 'Clean Code: A Handbook of Agile Software Craftsmanship',
    accessionNo: 'ACC-2024-021',
    barcode: 'BC-99402',
    memberId: 'mem-3',
    memberName: 'Jayendra Majji',
    memberCardNo: 'STU-2026-7326',
    memberType: 'STUDENT',
    memberDepartment: 'Computer Science & Engineering',
    issuedByUserId: '1',
    issuedByName: 'Chief Admin Librarian',
    issueDate: '2026-06-20 11:05',
    dueDate: '2026-07-04',
    returnDate: '2026-07-04 12:30',
    renewalCount: 1,
    maxRenewals: 2,
    status: 'RETURNED',
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
    issueDate: '2026-07-15 16:20',
    dueDate: '2026-08-15',
    renewalCount: 0,
    maxRenewals: 3,
    status: 'ISSUED',
    fineAmount: 0,
  },
  {
    id: 'tx-1008',
    bookCopyId: 'copy-503',
    bookId: 'book-5',
    bookTitle: 'Linear Algebra and Its Applications',
    accessionNo: 'ACC-2024-042',
    barcode: 'BC-99603',
    memberId: 'mem-3',
    memberName: 'Jayendra Majji',
    memberCardNo: 'STU-2026-7326',
    memberType: 'STUDENT',
    memberDepartment: 'Computer Science & Engineering',
    issuedByUserId: '1',
    issuedByName: 'Chief Admin Librarian',
    issueDate: '2026-07-22 10:00',
    dueDate: '2026-08-05',
    renewalCount: 0,
    maxRenewals: 2,
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
    issueDate: '2026-07-12 11:45',
    dueDate: '2026-08-12',
    renewalCount: 0,
    maxRenewals: 3,
    status: 'ISSUED',
    fineAmount: 0,
  },
];

const DEFAULT_RESERVATIONS: Reservation[] = [
  {
    id: 'res-501',
    bookId: 'book-2',
    bookTitle: 'Modern Operating Systems (5th Edition)',
    coverUrl: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=400&q=80',
    memberId: 'mem-3',
    memberName: 'Jayendra Majji',
    memberCardNo: 'STU-2026-7326',
    requestDate: '2026-07-20',
    expiryDate: '2026-07-27',
    queuePosition: 1,
    status: 'PENDING',
  },
];

const DEFAULT_FINES: FineRecord[] = [
  {
    id: 'fine-901',
    transactionId: 'tx-1001',
    memberId: 'mem-3',
    memberName: 'Jayendra Majji',
    memberCardNo: 'STU-2026-7326',
    bookTitle: 'Introduction to Algorithms (4th Edition)',
    amount: 3.50,
    paidAmount: 0,
    reason: 'OVERDUE',
    status: 'UNPAID',
    createdDate: '2026-07-16',
  },
];

const DEFAULT_DIGITAL: DigitalResource[] = [
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
  },
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
  },
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
    department: 'Electronics & Communication',
    subject: 'VLSI Design',
    semester: 'Sem 6',
    year: 2025,
    publisherName: 'Pearson Education',
    issnIsbn: '978-0134685991',
    accessLevel: 'OPEN_ACCESS',
    description: 'Reference e-book textbook covering Verilog HDL coding, CMOS logic gates, and FPGA syntheses.',
  },
  {
    id: 'dig-4',
    title: 'Computer Science & Engineering B.Tech Model Syllabus (2026 Revision)',
    resourceType: 'SYLLABUS',
    categoryName: 'Academic Administration',
    authorName: 'Academic Senate & Curriculum Committee',
    fileUrl: '/docs/cse-syllabus-2026.pdf',
    fileSizeMb: 3.4,
    downloadCount: 1250,
    uploadDate: '2026-01-10',
    department: 'Computer Science & Engineering',
    semester: 'All Semesters',
    year: 2026,
    accessLevel: 'OPEN_ACCESS',
    description: 'Complete official credit distribution, lab schemes, and course outcomes for B.Tech CSE.',
  },
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
  },
  {
    id: 'dig-6',
    title: 'SWAYAM MOOC: Financial Accounting & Enterprise Resource Planning',
    resourceType: 'SWAYAM',
    categoryName: 'Business & Management',
    authorName: 'Prof. S. K. Gupta (IIM Bangalore)',
    fileUrl: 'https://swayam.gov.in',
    fileSizeMb: 320.0,
    downloadCount: 310,
    uploadDate: '2025-10-15',
    department: 'Management Studies',
    subject: 'Financial Accounting',
    semester: 'Sem 2',
    year: 2025,
    publisherName: 'SWAYAM National Portal',
    accessLevel: 'OPEN_ACCESS',
    description: 'Government of India national online learning course materials and self-assessment quizzes.',
  },
  {
    id: 'dig-7',
    title: 'The Hindu National Daily (Digital Edition & Editorial Archive)',
    resourceType: 'NEWSPAPER',
    categoryName: 'General Knowledge & News',
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
    categoryName: 'General Knowledge & News',
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
    categoryName: 'General Knowledge & News',
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
  {
    id: 'dig-8c',
    title: 'Financial Express & Business Standard Daily e-Paper',
    resourceType: 'NEWSPAPER',
    categoryName: 'Business & Economics',
    authorName: 'Financial Bureau Desk',
    fileUrl: 'https://www.financialexpress.com',
    fileSizeMb: 10.8,
    downloadCount: 850,
    uploadDate: getLocalDateStr(),
    department: 'All Departments',
    semester: 'All Semesters',
    year: 2026,
    newspaperEdition: "Today's Financial Edition",
    newspaperRssFeedUrl: 'https://www.financialexpress.com/feed/',
    accessLevel: 'OPEN_ACCESS',
    contentSnippet: 'Stock market trends, macroeconomic analysis, corporate governance, and fiscal policy.',
    description: "Today's official digital financial newspaper edition.",
  },
  {
    id: 'dig-9',
    title: 'ACM Digital Library: Quantum Computing Algorithms & Cryptography Standards',
    resourceType: 'ACM_DIGITAL_LIBRARY',
    categoryName: 'Computer Science & Software',
    authorName: 'ACM Special Interest Group on Algorithms (SIGACT)',
    fileUrl: 'https://dl.acm.org',
    fileSizeMb: 18.6,
    downloadCount: 295,
    uploadDate: '2025-12-01',
    department: 'Computer Science & Engineering',
    subject: 'Quantum Computing',
    semester: 'Sem 8',
    year: 2025,
    publisherName: 'ACM New York',
    issnIsbn: 'ISSN 0004-5411',
    accessLevel: 'SUBSCRIBED',
    description: 'Full-text access to ACM Transactions on Quantum Computing and post-quantum cryptographic algorithms.',
  },
  {
    id: 'dig-10',
    title: 'SpringerLink: Renewable Energy Microgrids & Smart Grid Optimizations',
    resourceType: 'SPRINGER_LINK',
    categoryName: 'Electrical & Electronics',
    authorName: 'Dr. H. K. Patel & Springer Engineering Group',
    fileUrl: 'https://link.springer.com',
    fileSizeMb: 28.4,
    downloadCount: 188,
    uploadDate: '2025-07-14',
    department: 'Electrical & Electronics',
    subject: 'Smart Grids',
    year: 2025,
    publisherName: 'Springer Nature',
    issnIsbn: '978-3-030-89120-1',
    accessLevel: 'SUBSCRIBED',
    description: 'Springer international journal monographs on solar photovoltaic integrations and battery storage.',
  },
  {
    id: 'dig-11',
    title: 'ScienceDirect Elsevier: Materials Science & Nanotechnology Reviews',
    resourceType: 'SCIENCE_DIRECT',
    categoryName: 'Mechanical & Materials',
    authorName: 'Elsevier Research Panel',
    fileUrl: 'https://www.sciencedirect.com',
    fileSizeMb: 19.8,
    downloadCount: 310,
    uploadDate: '2025-11-20',
    department: 'Mechanical Engineering',
    subject: 'Nanotechnology',
    year: 2025,
    publisherName: 'Elsevier BV',
    accessLevel: 'SUBSCRIBED',
    description: 'High-impact factor review papers on carbon nanotubes and lightweight composite materials.',
  },
  {
    id: 'dig-12',
    title: 'JSTOR Archival Collection: Economics & Global Financial Policy History',
    resourceType: 'JSTOR',
    categoryName: 'Humanities & Social Sciences',
    authorName: 'JSTOR Academic Trust',
    fileUrl: 'https://www.jstor.org',
    fileSizeMb: 15.0,
    downloadCount: 220,
    uploadDate: '2025-06-10',
    department: 'Management Studies',
    subject: 'Economics',
    year: 2025,
    publisherName: 'JSTOR Org',
    accessLevel: 'SUBSCRIBED',
    description: 'Historical digitized academic journals, books, and primary research sources.',
  },
  {
    id: 'dig-13',
    title: 'Ph.D. Thesis: Distributed Blockchain Consensus Mechanisms for IoT Security',
    resourceType: 'THESIS_DISSERTATION',
    categoryName: 'Research & Doctorate',
    authorName: 'Dr. Jayendra Majji (Ph.D. Scholar)',
    fileUrl: '/docs/phd-thesis-blockchain.pdf',
    fileSizeMb: 45.0,
    downloadCount: 175,
    uploadDate: '2026-01-15',
    department: 'Computer Science & Engineering',
    subject: 'Cyber Security & Distributed Systems',
    year: 2026,
    publisherName: 'University Press',
    accessLevel: 'OPEN_ACCESS',
    description: 'Approved doctoral dissertation detailing Byzantine Fault Tolerant protocols for smart grids.',
  },
  {
    id: 'dig-14',
    title: 'Faculty Publication: Edge Computing Paradigms in Next-Gen 6G Wireless Networks',
    resourceType: 'FACULTY_PUBLICATION',
    categoryName: 'Faculty Monographs',
    authorName: 'Dr. Sarah Connor (Associate Professor, CSE)',
    fileUrl: '/docs/faculty-paper-6g.pdf',
    fileSizeMb: 11.2,
    downloadCount: 420,
    uploadDate: '2025-12-10',
    department: 'Computer Science & Engineering',
    subject: 'Wireless Communications',
    year: 2025,
    accessLevel: 'OPEN_ACCESS',
    description: 'Peer-reviewed international journal publication authored by university faculty members.',
  },
  {
    id: 'dig-15',
    title: 'Cap-Stone B.Tech Project Report: Autonomous Drone Navigation using ROS 2',
    resourceType: 'PROJECT_REPORT',
    categoryName: 'Student Projects',
    authorName: 'Senior Student Project Team (Batch 2026)',
    fileUrl: '/docs/btech-project-drone.pdf',
    fileSizeMb: 16.5,
    downloadCount: 530,
    uploadDate: '2026-01-20',
    department: 'Computer Science & Engineering',
    semester: 'Sem 8',
    year: 2026,
    accessLevel: 'OPEN_ACCESS',
    description: 'Final year capstone engineering project report complete with circuit schematics and ROS source code.',
  },
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
  },
  {
    id: 'dig-17',
    title: 'NDLI Repository: National Digital Library of India Higher Education Portal',
    resourceType: 'NDLI',
    categoryName: 'National Repositories',
    authorName: 'Ministry of Education & IIT Kharagpur',
    fileUrl: 'https://ndl.iitkgp.ac.in',
    fileSizeMb: 0.0,
    downloadCount: 840,
    uploadDate: '2025-05-01',
    department: 'All Departments',
    year: 2025,
    publisherName: 'NDLI Kharagpur',
    accessLevel: 'OPEN_ACCESS',
    description: 'Integrated virtual repository of educational resources across all disciplines and languages.',
  },
  {
    id: 'dig-18',
    title: 'Scientific American & Technology Review Digital Magazine (2026)',
    resourceType: 'MAGAZINE',
    categoryName: 'General Science & Tech',
    authorName: 'Technology Review Editors',
    fileUrl: '/docs/tech-magazine-2026.pdf',
    fileSizeMb: 24.0,
    downloadCount: 390,
    uploadDate: '2026-01-02',
    department: 'All Departments',
    year: 2026,
    publisherName: 'MIT Tech Review',
    accessLevel: 'OPEN_ACCESS',
    description: 'Monthly digital magazine spotlighting breakthrough innovations, AI ethics, and biotechnology.',
  },
  {
    id: 'dig-19',
    title: 'MIT OpenCourseWare Video Lectures: Linear Algebra & Matrix Calculus',
    resourceType: 'MULTIMEDIA',
    categoryName: 'Multimedia & Audio-Visual',
    authorName: 'Prof. Gilbert Strang (MIT Mathematics)',
    fileUrl: 'https://ocw.mit.edu',
    fileSizeMb: 520.0,
    downloadCount: 970,
    uploadDate: '2025-04-12',
    department: 'Mathematics & Basic Sciences',
    subject: 'Linear Algebra',
    semester: 'Sem 1',
    year: 2025,
    publisherName: 'MIT OCW',
    accessLevel: 'OPEN_ACCESS',
    description: 'High-definition video lectures, problem set solutions, and interactive matrix visualization scripts.',
  },
  {
    id: 'dig-20',
    title: 'Journal of Applied Physics & Energy Storage Technologies (Vol 48)',
    resourceType: 'JOURNAL',
    categoryName: 'Basic Sciences & Physics',
    authorName: 'American Institute of Physics (AIP)',
    fileUrl: '/docs/aip-journal-vol48.pdf',
    fileSizeMb: 17.8,
    downloadCount: 260,
    uploadDate: '2025-10-08',
    department: 'Mathematics & Basic Sciences',
    subject: 'Physics',
    year: 2025,
    publisherName: 'AIP Publishing',
    issnIsbn: 'ISSN 0021-8979',
    accessLevel: 'SUBSCRIBED',
    description: 'Quarterly peer-reviewed scientific journal on condensed matter physics and semiconductor devices.',
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
    details: 'Updated overdue fine rate to ₹10.00 / day.',
    timestamp: '2026-07-15 14:30:00',
  },
];

const DEFAULT_CONFIG: SystemConfig = {
  libraryName: 'University Central Library Enterprise Portal',
  fineRatePerDay: 10.00,
  studentMaxLoanDays: 14,
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
    checkInTime: `${todayDefaultStr} 09:15:00`,
    checkOutTime: `${todayDefaultStr} 11:45:00`,
    durationMinutes: 150,
    status: 'COMPLETED',
    entryGate: 'Main Gate - Central Library',
    purposeOfVisit: 'GENERAL_READING',
    verificationMethod: 'BARCODE',
    checkedInBy: 'Self Barcode Kiosk',
    checkedOutBy: 'Self Barcode Kiosk',
    date: todayDefaultStr,
  },
  {
    id: 'att-102',
    memberId: 'mem-2',
    memberName: 'Dr. Sarah Connor',
    memberCardNo: 'FAC-2023-1102',
    role: 'FACULTY',
    department: 'Computer Science & Engineering',
    email: 'faculty@college.edu',
    checkInTime: `${todayDefaultStr} 10:00:00`,
    status: 'IN_LIBRARY',
    entryGate: 'Faculty Research Wing',
    purposeOfVisit: 'RESEARCH_STUDY',
    verificationMethod: 'QR_CODE',
    checkedInBy: 'Faculty QR Scanner',
    date: todayDefaultStr,
  },
  {
    id: 'att-103',
    memberId: 'mem-1',
    memberName: 'Chief Admin Librarian',
    memberCardNo: 'ADM-2024-0001',
    role: 'ADMIN',
    department: 'Library Information Science',
    email: 'admin@college.edu',
    checkInTime: `${todayDefaultStr} 08:30:00`,
    status: 'IN_LIBRARY',
    entryGate: 'Main Gate - Central Library',
    purposeOfVisit: 'BOOK_ISSUE_RETURN',
    verificationMethod: 'CARD_SCAN',
    checkedInBy: 'Admin Desk',
    date: todayDefaultStr,
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
    const saved = localStorage.getItem(STORAGE_KEY);
    let initialState: StateSchema;

    if (saved) {
      try {
        initialState = JSON.parse(saved);
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
        if (!initialState.digitalResources || initialState.digitalResources.length < DEFAULT_DIGITAL.length) {
          const existingIds = new Set((initialState.digitalResources || []).map((d) => d.id));
          const missingDigital = DEFAULT_DIGITAL.filter((d) => !existingIds.has(d.id));
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
          const uniqueMembers: MemberProfile[] = [];
          const seenEmails = new Set<string>();

          initialState.members.forEach((m) => {
            let emailKey = m.email.toLowerCase();
            let memberObj = { ...m };

            if (
              emailKey === 'student@college.edu' ||
              emailKey === 'jayendramajji22@gmail.com' ||
              m.id === 'mem-3' ||
              m.name.toUpperCase().includes('JAYENDRA') ||
              m.name === 'Alex Johnson'
            ) {
              memberObj.name = 'Jayendra Majji';
              memberObj.email = 'jayendramajji22@gmail.com';
              memberObj.memberCardNo = 'STU-2026-7326';
              emailKey = 'jayendramajji22@gmail.com';
            }

            if (!seenEmails.has(emailKey)) {
              seenEmails.add(emailKey);
              uniqueMembers.push(memberObj);
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
      } catch (e) {
        initialState = this.getDefaultState();
      }
    } else {
      initialState = this.getDefaultState();
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

        return {
          ...b,
          availableCopies: availableCount,
          copies: updatedCopies,
        };
      });
    }

    this.state$ = new SimpleBehaviorSubject<StateSchema>(initialState);
    this.state$.subscribe((state) => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
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

      return {
        ...b,
        ...updated,
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
    const member = current.members.find((m) => m.id === memberId || m.memberCardNo === memberId);

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
    if (!cleanQuery) {
      return { success: false, message: 'Please enter or scan a valid book barcode / accession number.' };
    }

    let targetBook: Book | undefined;
    let targetCopy: BookCopy | undefined;

    for (const book of current.books) {
      if (!book.copies || book.copies.length === 0) continue;
      const copy = book.copies.find(
        (c) =>
          c.id.toLowerCase() === cleanQuery ||
          c.barcode.toLowerCase() === cleanQuery ||
          c.accessionNo.toLowerCase() === cleanQuery ||
          (c.qrCode && c.qrCode.toLowerCase() === cleanQuery)
      );
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

  public returnBook(transactionId: string, condition: CopyCondition = 'GOOD', notes?: string): { success: boolean; message: string; fineAssessed?: number } {
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
        paidAmount: 0,
        reason: 'OVERDUE',
        status: 'UNPAID',
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
            fineStatus: fineAmount > 0 ? ('UNPAID' as const) : undefined,
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
          pendingFines: m.pendingFines + fineAmount,
        };
      }
      return m;
    });

    this.state$.next({
      ...current,
      books: updatedBooks,
      transactions: updatedTransactions,
      members: updatedMembers,
      fines: newFines,
    });

    this.addAuditLog('1', 'Admin Librarian', 'ADMIN', 'RETURN_BOOK', 'CIRCULATION', `Returned ${tx.bookTitle} (${tx.accessionNo}). Fine: ₹${fineAmount.toFixed(2)}`);

    return {
      success: true,
      message: fineAmount > 0 ? `Book returned. Overdue fine assessed: ₹${fineAmount.toFixed(2)}` : 'Book returned on time cleanly.',
      fineAssessed: fineAmount,
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

    this.state$.next({
      ...current,
      extensionRequests: updatedRequests,
    });

    this.addAuditLog('1', 'Admin Librarian', 'ADMIN', 'REJECT_EXTENSION', 'CIRCULATION', `Rejected extension request for "${ext.bookTitle}" (Member: ${ext.memberName}).`);

    return { success: true, message: `Extension request for "${ext.bookTitle}" has been rejected.` };
  }

  public processFinePayment(fineId: string, action: 'PAY' | 'WAIVE', waiveReason?: string) {
    const current = this.snapshot;
    const fine = current.fines.find((f) => f.id === fineId);
    if (!fine) return;

    const receiptNo = action === 'PAY' ? `REC-${Date.now()}` : undefined;

    const updatedFines = current.fines.map((f) => {
      if (f.id === fineId) {
        return {
          ...f,
          status: action === 'PAY' ? ('PAID' as const) : ('WAIVED' as const),
          paidAmount: action === 'PAY' ? f.amount : 0,
          receiptNo,
          paidDate: getLocalDateStr(new Date()),
          waiveReason,
        };
      }
      return f;
    });

    const updatedMembers = current.members.map((m) => {
      if (m.id === fine.memberId) {
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

    this.addAuditLog('1', 'Admin Librarian', 'ADMIN', `FINE_${action}`, 'FINANCE', `Processed fine ${fine.id} (₹${fine.amount}) - Status: ${action}`);
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
    const newRes: DigitalResource = {
      ...resource,
      id: `dig-${Date.now()}`,
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
  }

  public updateDigitalResource(id: string, data: Partial<DigitalResource>, user?: { id: string; name: string; role: Role }) {
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

  public registerMember(data: { name: string; email: string; role: Role; department?: string; phone?: string }): MemberProfile {
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
    const procRequests = current.procurementRequests || [];
    const pendingProc = procRequests.filter((r) => r.status === 'PENDING').length;
    const approvedProc = procRequests.filter((r) => r.status === 'APPROVED').length;

    let csv = '';
    csv += '=========================================================================\n';
    csv += 'UNIVERSITY CENTRAL LIBRARY - EXECUTIVE MEETING & OPERATIONS OVERALL REPORT\n';
    csv += '=========================================================================\n';
    csv += `Report Generated Date,${dateStr}\n`;
    csv += `Authorized By,Chief Admin Librarian\n`;
    csv += `Report Purpose,Executive Committee & Office Administrative Review\n\n`;

    csv += '--- 1. MASTER LIBRARY INVENTORY METRICS ---\n';
    csv += `Total Book Titles Registered,${totalTitles}\n`;
    csv += `Total Book Copies Stock,${totalCopies}\n`;
    csv += `Available Copies On Shelf,${availableCopies}\n`;
    csv += `Active Checked Out Loans,${activeLoans}\n`;
    csv += `Overdue Circulation Loans,${overdueLoans}\n`;
    csv += `Returned Circulations,${returnedLoans}\n\n`;

    csv += '--- 2. FINANCIAL & FINE LEDGER SUMMARY ---\n';
    csv += `Total Fine Assessed (INR),${totalFinesSum.toFixed(2)}\n`;
    csv += `Total Fine Collected (INR),${paidFinesSum.toFixed(2)}\n`;
    csv += `Total Pending Unpaid Fines (INR),${unpaidFinesSum.toFixed(2)}\n\n`;

    csv += '--- 3. MEMBER REGISTRY SUMMARY ---\n';
    csv += `Total Active Members,${totalMembers}\n`;
    csv += `Student Profiles,${studentCount}\n`;
    csv += `Faculty Profiles,${facultyCount}\n\n`;

    csv += '--- 4. BOOK PROCUREMENT REQUESTS SUMMARY ---\n';
    csv += `Total Acquisition Requests,${procRequests.length}\n`;
    csv += `Approved Requests,${approvedProc}\n`;
    csv += `Pending Review Requests,${pendingProc}\n\n`;

    csv += '--- 5. RECENT CIRCULATION LOGS DETAIL ---\n';
    csv += 'Transaction ID,Book Title,Accession No,Member Name,Member Card No,Role,Status,Issue Date,Due Date,Fine (INR)\n';

    current.transactions.forEach((t) => {
      csv += `"${t.id}","${t.bookTitle}","${t.accessionNo}","${t.memberName}","${t.memberCardNo}","${t.memberType}","${t.status}","${t.issueDate}","${t.dueDate}","${t.fineAmount || 0}"\n`;
    });

    const filename = `University_Library_Executive_Overall_Report_${dateStr}.csv`;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    this.addAuditLog('1', 'Chief Admin Librarian', 'ADMIN', 'EXPORT_EXECUTIVE_REPORT', 'REPORTS_MODULE', 'Generated 1-click Executive Meeting Overall Report');

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
    // 0. Operating Hours & Holiday Check
    const opStatus = getLibraryOperatingStatus();
    if (!opStatus.isOpen && !allowClosedCheckIn) {
      return {
        success: false,
        message: `Check-in Failed: Central Library is currently CLOSED. Operating Hours: Mon – Sat (8:00 AM – 10:00 PM) | Closed on Sundays & National Holidays. (${opStatus.reason})`,
      };
    }

    const current = this.snapshot;
    const term = cardNoOrEmail.trim().toLowerCase();

    // 1. Find Member
    const member = current.members.find(
      (m) =>
        m.memberCardNo.toLowerCase() === term ||
        m.email.toLowerCase() === term ||
        m.id.toLowerCase() === term
    );

    if (!member) {
      return { success: false, message: `Member account not found for ID/Card "${cardNoOrEmail}".` };
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
      verificationMethod,
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
      `Checked into library at ${timeStr} via ${verificationMethod}`
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

    const activeRecord = attendanceRecords.find(
      (r) =>
        (r.id.toLowerCase() === term ||
          r.memberCardNo.toLowerCase() === term ||
          r.email.toLowerCase() === term ||
          r.memberId.toLowerCase() === term) &&
        r.status === 'IN_LIBRARY'
    );

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
    const opStatus = getLibraryOperatingStatus(now);

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

  public exportAttendanceReportCSV(records?: AttendanceRecord[]): { success: boolean; filename: string } {
    const list = records || this.snapshot.attendanceRecords || [];
    const dateStr = getLocalDateStr(new Date());

    const headers = [
      'Record ID',
      'Member Name',
      'Card No',
      'Role',
      'Department',
      'Email',
      'Check-In Time',
      'Check-Out Time',
      'Duration (Mins)',
      'Status',
      'Purpose of Visit',
      'Verification Method',
      'Gate',
      'Date',
    ];

    const rows = list.map((r) => [
      r.id,
      `"${(r.memberName || '').replace(/"/g, '""')}"`,
      r.memberCardNo,
      r.role,
      `"${(r.department || '').replace(/"/g, '""')}"`,
      r.email,
      r.checkInTime,
      r.checkOutTime || 'IN PROGRESS',
      r.durationMinutes || 0,
      r.status,
      r.purposeOfVisit || 'GENERAL_READING',
      r.verificationMethod,
      `"${(r.entryGate || 'Main Gate').replace(/"/g, '""')}"`,
      r.date,
    ]);

    const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `University_Library_Attendance_Report_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    this.addAuditLog(
      '1',
      'Chief Admin Librarian',
      'ADMIN',
      'EXPORT_ATTENDANCE_REPORT',
      'REPORTS_MODULE',
      `Exported ${list.length} attendance logs to CSV`
    );

    return { success: true, filename: `University_Library_Attendance_Report_${dateStr}.csv` };
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

  public resetToFactoryDefaults() {
    localStorage.removeItem(STORAGE_KEY);
    this.state$.next(this.getDefaultState());
  }
}

export const libraryStore = new LibraryStoreService();
