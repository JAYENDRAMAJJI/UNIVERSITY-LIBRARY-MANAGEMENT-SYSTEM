import React, { useState, useEffect, useMemo, useRef } from 'react';
import XLSX from 'xlsx-js-style';
import { exportStyledExcelFile } from '../../utils/excelExport';
import { Link } from 'react-router-dom';
import {
  BookOpen,
  Plus,
  Search,
  Download,
  Upload,
  Barcode,
  ScanBarcode,
  Sparkles,
  Loader2,
  Edit,
  Trash2,
  CheckCircle,
  AlertCircle,
  FileSpreadsheet,
  User,
  Clock,
  UserCheck,
  History,
  Eye,
  X,
  ChevronDown,
  Building2,
  Layers,
  ArrowUpDown,
  Check,
  QrCode,
  Printer,
  RefreshCw,
  FileDown,
  CopyCheck,
  Lock,
  Tags,
  FolderTree,
  ChevronRight,
  Settings,
  Filter,
  GitFork,
  Hash,
  MapPin,
  IndianRupee,
  FileText,
  ShieldCheck,
} from 'lucide-react';
import { libraryStore, getLocalDateStr } from '../../services/libraryStore.service';
import { Book, BookCopy, BookStatus, CopyCondition } from '../../types/library';
import BarcodeScannerModal from '../../components/common/BarcodeScannerModal';
import {
  generateBarcodeSvgString,
  generateQrSvgString,
  downloadBarcodeOrQrFile,
  printLabelStickers,
} from '../../utils/barcodeQrGenerator';

const ISBN_LOOKUP: Record<string, { title: string; author: string; publisher: string; year: number; price: number; description: string; coverUrl: string }> = {
  '978-0134610993': {
    title: 'Artificial Intelligence: A Modern Approach (4th Edition)',
    author: 'Dr. Thomas H. Cormen',
    publisher: 'Pearson Education',
    year: 2020,
    price: 110.00,
    description: 'The standard and comprehensive textbook for artificial intelligence, covering search algorithms, machine learning, deep neural networks, and robotics.',
    coverUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=400&q=80',
  },
  '978-0132350884': {
    title: 'Clean Code: A Handbook of Agile Software Craftsmanship',
    author: 'Robert C. Martin (Uncle Bob)',
    publisher: 'Prentice Hall',
    year: 2008,
    price: 49.99,
    description: 'Essential principles, patterns, and refactoring practices for writing readable, maintainable software.',
    coverUrl: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=400&q=80',
  },
  '978-0262046305': {
    title: 'Introduction to Algorithms (4th Edition)',
    author: 'Dr. Thomas H. Cormen',
    publisher: 'MIT Press',
    year: 2022,
    price: 89.99,
    description: 'Comprehensive reference text on algorithms, data structures, dynamic programming, and graph algorithms.',
    coverUrl: 'https://images.unsplash.com/photo-1532012197267-da84d127e765?auto=format&fit=crop&w=400&q=80',
  },
  '978-0137576242': {
    title: 'Modern Operating Systems (5th Edition)',
    author: 'Andrew S. Tanenbaum',
    publisher: 'Pearson Education',
    year: 2023,
    price: 94.50,
    description: 'Definitive guide on modern operating system design, process synchronization, memory virtualization, and file systems.',
    coverUrl: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=400&q=80',
  },
  '978-0596007126': {
    title: 'Head First Design Patterns: Building Extensible & Maintainable Software',
    author: 'Robert C. Martin (Uncle Bob)',
    publisher: 'Pearson Education',
    year: 2021,
    price: 65.00,
    description: 'Visually rich guide to object-oriented design patterns including Observer, Factory, Strategy, and Singleton.',
    coverUrl: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=400&q=80',
  },
  '978-0078022159': {
    title: 'Database System Concepts (7th Edition)',
    author: 'Andrew S. Tanenbaum',
    publisher: 'MIT Press',
    year: 2019,
    price: 98.00,
    description: 'Fundamental guide to relational algebra, SQL optimization, transaction management, and NoSQL databases.',
    coverUrl: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=400&q=80',
  },
  '978-1449373320': {
    title: 'Designing Data-Intensive Applications',
    author: 'Robert C. Martin (Uncle Bob)',
    publisher: 'MIT Press',
    year: 2017,
    price: 75.00,
    description: 'The definitive guide to architecture, reliability, scalability, and maintainability of data systems.',
    coverUrl: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=400&q=80',
  },
};

const DEPARTMENT_OPTIONS = [
  'Engineering & Technology',
  'Computer Applications (BCA/MCA)',
  'Management (MBA/BBA)',
  'Commerce & Finance',
  'Science & Physical Sciences',
  'Arts & Humanities',
  'Law & Jurisprudence',
  'Pharmacy & Pharmaceutical Sciences',
  'Medical & Life Sciences',
  'Nursing & Healthcare',
  'Agriculture & Environmental Science',
  'Architecture & Design',
  'Journalism & Mass Communication',
  'Library & Information Science',
  'Physical Education',
];

const COLLECTION_TYPES = [
  { id: 'ALL', label: 'All Catalog Items' },
  { id: 'ACADEMIC', label: 'Academic Books' },
  { id: 'DIGITAL', label: 'Digital Library (E-Books & Papers)' },
  { id: 'GENERAL', label: 'General Books' },
  { id: 'COMPETITIVE', label: 'Competitive Exam Books' },
  { id: 'REFERENCE', label: 'Reference Collection' },
  { id: 'RESEARCH', label: 'Research Papers & Journals' },
  { id: 'MAGAZINES', label: 'Magazines & Periodicals' },
  { id: 'RARE', label: 'Rare Books & Archives' },
  { id: 'NEW_ARRIVALS', label: 'New Arrivals' },
  { id: 'MOST_BORROWED', label: 'Most Borrowed' },
  { id: 'RECOMMENDED', label: 'Featured & Recommended' },
];

export default function BooksManagement() {
  const [state, setState] = useState(libraryStore.snapshot);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedCollectionTab, setSelectedCollectionTab] = useState('ALL');
  const [selectedDepartment, setSelectedDepartment] = useState('ALL');
  const [selectedFormat, setSelectedFormat] = useState('ALL'); // ALL, PHYSICAL, DIGITAL, HYBRID
  const [selectedAvailability, setSelectedAvailability] = useState('ALL'); // ALL, AVAILABLE, ISSUED
  const [selectedLanguage, setSelectedLanguage] = useState('ALL');
  const [sortBy, setSortBy] = useState<'TITLE' | 'YEAR' | 'BORROW_COUNT' | 'PRICE'>('TITLE');

  // Custom UI Dropdown States & Refs
  const deptDropdownRef = useRef<HTMLDivElement>(null);
  const formatDropdownRef = useRef<HTMLDivElement>(null);
  const sortDropdownRef = useRef<HTMLDivElement>(null);

  const [isDeptOpen, setIsDeptOpen] = useState(false);
  const [isFormatOpen, setIsFormatOpen] = useState(false);
  const [isSortOpen, setIsSortOpen] = useState(false);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (deptDropdownRef.current && !deptDropdownRef.current.contains(e.target as Node)) {
        setIsDeptOpen(false);
      }
      if (formatDropdownRef.current && !formatDropdownRef.current.contains(e.target as Node)) {
        setIsFormatOpen(false);
      }
      if (sortDropdownRef.current && !sortDropdownRef.current.contains(e.target as Node)) {
        setIsSortOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Modals & Action Drawers
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [csvInputText, setCsvInputText] = useState('');
  const [selectedBookCopiesModal, setSelectedBookCopiesModal] = useState<Book | null>(null);
  const [previewBookModal, setPreviewBookModal] = useState<Book | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Enterprise Barcode & QR Code Management System States
  const [previewBarcodeCopyModal, setPreviewBarcodeCopyModal] = useState<{ book: Book; copy: BookCopy } | null>(null);
  const [showBulkPrintModal, setShowBulkPrintModal] = useState(false);
  const [selectedBookIdsForPrint, setSelectedBookIdsForPrint] = useState<string[]>([]);




  // Barcode Scanner Modal states
  const [isAddBookScannerOpen, setIsAddBookScannerOpen] = useState(false);
  const [isCatalogSearchScannerOpen, setIsCatalogSearchScannerOpen] = useState(false);
  const [isFetchingIsbn, setIsFetchingIsbn] = useState(false);

  // Auto-Fetch ISBN Metadata Modal States
  const [showFetchIsbnModal, setShowFetchIsbnModal] = useState(false);
  const [fetchModalIsbn, setFetchModalIsbn] = useState('978-0134610993');
  const [previewMetadata, setPreviewMetadata] = useState<{
    title: string;
    author: string;
    publisher: string;
    year: number;
    price: number;
    description: string;
    coverUrl: string;
    isbn: string;
  } | null>(null);

  // Enterprise Add Book Form State
  const [addFormData, setAddFormData] = useState({
    title: '',
    isbn: '',
    categoryId: '',
    customCategoryName: '',
    isCustomCategory: false,
    authorId: '',
    customAuthorName: '',
    isCustomAuthor: false,
    publisherId: '',
    customPublisherName: '',
    isCustomPublisher: false,
    edition: '1st Edition',
    publishingYear: 2024,
    language: 'English',
    price: 49.99,
    description: '',
    coverUrl: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=400&q=80',
    totalCopies: 3,
    rackNumber: 'RACK-CS-01',
    shelfNumber: 'SHELF-A1',
    isFeatured: false,
    isBookOfMonth: false,
    department: 'Engineering & Technology',
    program: 'B.Tech / M.Tech',
    specialization: 'Computer Science',
    subject: 'Core Computer Science',
    collectionType: 'ACADEMIC' as any,
    isReferenceOnly: false,
    format: 'PHYSICAL' as 'PHYSICAL' | 'DIGITAL' | 'HYBRID',
    digitalUrl: '',
    keywords: 'algorithm, computer-science, textbook',
    condition: 'NEW' as CopyCondition,
  });

  // Centralized Taxonomy & Master Data Filter States
  const [taxonomyFilter, setTaxonomyFilter] = useState<{
    type: 'ALL' | 'CATEGORY' | 'AUTHOR' | 'PUBLISHER' | 'HIERARCHY';
    id?: string;
    name?: string;
    hierarchyPath?: { collection?: string; category?: string; department?: string; program?: string; subject?: string };
  }>({ type: 'ALL' });

  const [activeTaxonomyTab, setActiveTaxonomyTab] = useState<'CATEGORIES' | 'AUTHORS' | 'PUBLISHERS' | 'HIERARCHY'>('CATEGORIES');
  const [showManageTaxonomyModal, setShowManageTaxonomyModal] = useState<boolean>(false);
  const [manageTaxonomyTab, setManageTaxonomyTab] = useState<'CATEGORIES' | 'AUTHORS' | 'PUBLISHERS'>('CATEGORIES');

  // Inline Add / Edit Taxonomy States
  const [editingTaxonomyId, setEditingTaxonomyId] = useState<string | null>(null);
  const [taxonomyInputData, setTaxonomyInputData] = useState<{ name: string; code: string; extra: string }>({ name: '', code: '', extra: '' });

  // Dynamic real-time Taxonomy & Category statistics calculation
  const taxonomyCounts = useMemo(() => {
    const categoryCounts: Record<string, number> = {};
    const authorCounts: Record<string, number> = {};
    const publisherCounts: Record<string, number> = {};

    let totalBooks = state.books.length;
    let totalAvailable = 0;
    let totalIssued = 0;
    let newArrivals = 0;
    const currentYear = new Date().getFullYear();

    state.books.forEach((b) => {
      if (b.categoryId) categoryCounts[b.categoryId] = (categoryCounts[b.categoryId] || 0) + 1;
      if (b.categoryName) categoryCounts[b.categoryName.toLowerCase()] = (categoryCounts[b.categoryName.toLowerCase()] || 0) + 1;

      if (b.authorId) authorCounts[b.authorId] = (authorCounts[b.authorId] || 0) + 1;
      if (b.authorName) authorCounts[b.authorName.toLowerCase()] = (authorCounts[b.authorName.toLowerCase()] || 0) + 1;

      if (b.publisherId) publisherCounts[b.publisherId] = (publisherCounts[b.publisherId] || 0) + 1;
      if (b.publisherName) publisherCounts[b.publisherName.toLowerCase()] = (publisherCounts[b.publisherName.toLowerCase()] || 0) + 1;

      totalAvailable += b.availableCopies || 0;
      totalIssued += Math.max(0, (b.totalCopies || 0) - (b.availableCopies || 0));
      if (b.publishingYear >= currentYear - 1 || b.isBookOfMonth) newArrivals += 1;
    });

    return {
      categoryCounts,
      authorCounts,
      publisherCounts,
      stats: { totalBooks, totalAvailable, totalIssued, newArrivals },
    };
  }, [state.books]);

  // Enterprise Edit Book Form State
  const [editFormData, setEditFormData] = useState({
    title: '',
    isbn: '',
    categoryId: '',
    authorId: '',
    publisherId: '',
    edition: '',
    publishingYear: 2024,
    language: 'English',
    price: 0,
    description: '',
    coverUrl: '',
    totalCopies: 3,
    rackNumber: '',
    shelfNumber: '',
    isFeatured: false,
    isBookOfMonth: false,
    department: '',
    program: '',
    specialization: '',
    subject: '',
    format: 'PHYSICAL' as 'PHYSICAL' | 'DIGITAL' | 'HYBRID',
    digitalUrl: '',
    keywords: '',
    collectionType: 'ACADEMIC' as any,
    isReferenceOnly: false,
  });

  // Editing Book & Physical Copies State
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [editingCopyId, setEditingCopyId] = useState<string | null>(null);
  const [editingCopyData, setEditingCopyData] = useState<{
    accessionNo: string;
    barcode: string;
    rackNumber: string;
    shelfNumber: string;
    condition: CopyCondition;
    status: BookStatus;
  }>({
    accessionNo: '',
    barcode: '',
    rackNumber: '',
    shelfNumber: '',
    condition: 'NEW',
    status: 'AVAILABLE',
  });

  const handleOpenEditModal = (book: Book) => {
    setEditingBook(book);
    setEditFormData({
      title: book.title || '',
      isbn: book.isbn || '',
      categoryId: book.categoryId || state.categories[0]?.id || '',
      authorId: book.authorId || state.authors[0]?.id || '',
      publisherId: book.publisherId || state.publishers[0]?.id || '',
      edition: book.edition || '1st Edition',
      publishingYear: book.publishingYear || 2024,
      language: book.language || 'English',
      price: book.price || 0,
      description: book.description || '',
      coverUrl: book.coverUrl || '',
      totalCopies: book.totalCopies || 1,
      rackNumber: book.rackNumber || 'RACK-CS-01',
      shelfNumber: book.shelfNumber || 'SHELF-A1',
      isFeatured: !!book.isFeatured,
      isBookOfMonth: !!book.isBookOfMonth,
      department: book.department || 'Engineering & Technology',
      program: book.program || 'B.Tech / M.Tech',
      specialization: book.specialization || 'Computer Science',
      subject: book.subject || 'Core Computer Science',
      format: book.format || 'PHYSICAL',
      digitalUrl: book.digitalUrl || '',
      keywords: Array.isArray(book.keywords) ? book.keywords.join(', ') : (book.keywords || ''),
      collectionType: book.collectionType || (book.isReferenceOnly ? 'REFERENCE' : 'ACADEMIC'),
      isReferenceOnly: !!book.isReferenceOnly,
    });
  };

  const handleSaveEditBook = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBook) return;

    libraryStore.updateBook(editingBook.id, {
      ...editFormData,
      keywords: typeof editFormData.keywords === 'string'
        ? editFormData.keywords.split(',').map((s) => s.trim()).filter(Boolean)
        : editFormData.keywords,
    });
    triggerToast(`Updated catalog record for "${editFormData.title}" successfully!`);
    setEditingBook(null);
  };

  const handleStartCopyEdit = (copy: BookCopy) => {
    setEditingCopyId(copy.id);
    setEditingCopyData({
      accessionNo: copy.accessionNo,
      barcode: copy.barcode,
      rackNumber: copy.rackNumber,
      shelfNumber: copy.shelfNumber,
      condition: copy.condition || 'GOOD',
      status: copy.status || 'AVAILABLE',
    });
  };

  const handleSaveCopyEdit = (copyId: string) => {
    if (libraryStore.isDuplicateAccessionNo(editingCopyData.accessionNo, copyId)) {
      alert(`Error: Accession Number "${editingCopyData.accessionNo}" is already assigned to another book copy in the system.`);
      return;
    }
    if (libraryStore.isDuplicateBarcode(editingCopyData.barcode, copyId)) {
      alert(`Error: Barcode "${editingCopyData.barcode}" is already assigned to another book copy in the system.`);
      return;
    }

    libraryStore.updateBookCopy(copyId, editingCopyData);
    triggerToast(`Updated copy accession "${editingCopyData.accessionNo}"!`);
    setEditingCopyId(null);
    if (selectedBookCopiesModal) {
      const updatedBook = libraryStore.snapshot.books.find((b) => b.id === selectedBookCopiesModal.id);
      if (updatedBook) setSelectedBookCopiesModal(updatedBook);
    }
  };

  // Enterprise Barcode & QR Code Action Handlers
  const handleBulkGenerateBarcodes = () => {
    const res = libraryStore.bulkGenerateMissingBarcodes();
    triggerToast(res.message);
  };

  const handleRegenerateBarcodeCopy = (copyId: string) => {
    triggerToast('Barcode is permanent and locked once generated to prevent mismatch with physical book tag.');
  };

  const handleDownloadCopyBarcode = (book: Book, copy: BookCopy, format: 'png' | 'svg' = 'png') => {
    const svgStr = generateBarcodeSvgString(copy.barcode, { height: 50 });
    downloadBarcodeOrQrFile(svgStr, `Barcode_${copy.accessionNo}_${copy.barcode}`, format);
    triggerToast(`Downloaded Barcode file for Accession ${copy.accessionNo}!`);
  };

  const handleDownloadCopyQr = (book: Book, copy: BookCopy, format: 'png' | 'svg' = 'png') => {
    const svgStr = generateQrSvgString(copy.qrCode || `QR-${copy.barcode}`, 200);
    downloadBarcodeOrQrFile(svgStr, `QRCode_${copy.accessionNo}_${copy.barcode}`, format);
    triggerToast(`Downloaded QR Code file for Accession ${copy.accessionNo}!`);
  };

  const handlePrintSingleCopyLabel = (book: Book, copy: BookCopy) => {
    printLabelStickers([
      {
        bookTitle: book.title,
        authorName: book.authorName,
        accessionNo: copy.accessionNo,
        barcode: copy.barcode,
        qrCode: copy.qrCode || `QR-${copy.barcode}`,
        rackNumber: copy.rackNumber || book.rackNumber || 'RACK-CS-01',
        shelfNumber: copy.shelfNumber || book.shelfNumber || 'SHELF-A1',
        department: book.department || 'ACADEMIC',
      },
    ]);
    triggerToast(`Sent label sticker for Accession ${copy.accessionNo} to print!`);
  };

  const handlePrintBookAllLabels = (book: Book) => {
    if (!book.copies || book.copies.length === 0) {
      triggerToast('No copies available for printing.');
      return;
    }
    const labels = book.copies.map((c) => ({
      bookTitle: book.title,
      authorName: book.authorName,
      accessionNo: c.accessionNo,
      barcode: c.barcode,
      qrCode: c.qrCode || `QR-${c.barcode}`,
      rackNumber: c.rackNumber || book.rackNumber || 'RACK-CS-01',
      shelfNumber: c.shelfNumber || book.shelfNumber || 'SHELF-A1',
      department: book.department || 'ACADEMIC',
    }));
    printLabelStickers(labels);
    triggerToast(`Sent ${labels.length} copy barcode/QR labels for "${book.title}" to print!`);
  };

  const handleExecuteBulkPrint = () => {
    const targetBooks = state.books.filter((b) =>
      selectedBookIdsForPrint.length > 0 ? selectedBookIdsForPrint.includes(b.id) : filteredBooks.some((fb) => fb.id === b.id)
    );

    const labels: Array<{
      bookTitle: string;
      authorName: string;
      accessionNo: string;
      barcode: string;
      qrCode: string;
      rackNumber: string;
      shelfNumber: string;
      department?: string;
    }> = [];

    targetBooks.forEach((book) => {
      (book.copies || []).forEach((c) => {
        labels.push({
          bookTitle: book.title,
          authorName: book.authorName,
          accessionNo: c.accessionNo,
          barcode: c.barcode,
          qrCode: c.qrCode || `QR-${c.barcode}`,
          rackNumber: c.rackNumber || book.rackNumber || 'RACK-CS-01',
          shelfNumber: c.shelfNumber || book.shelfNumber || 'SHELF-A1',
          department: book.department || 'ACADEMIC',
        });
      });
    });

    if (labels.length === 0) {
      triggerToast('No book asset copies found to print.');
      return;
    }

    printLabelStickers(labels);
    setShowBulkPrintModal(false);
    triggerToast(`Printed bulk label sticker sheet for ${labels.length} book copies!`);
  };

  const handleAddNewCopyModal = (bookId: string) => {
    const newCopy = libraryStore.addBookCopy(bookId);
    triggerToast(`Added new physical copy (${newCopy?.accessionNo}) to book!`);
    const updatedBook = libraryStore.snapshot.books.find((b) => b.id === bookId);
    if (updatedBook) setSelectedBookCopiesModal(updatedBook);
  };

  const handleDeleteCopyModal = (copyId: string, accessionNo: string) => {
    if (window.confirm(`Are you sure you want to remove copy "${accessionNo}" from catalog inventory?`)) {
      libraryStore.deleteBookCopy(copyId);
      triggerToast(`Removed copy "${accessionNo}"!`);
      if (selectedBookCopiesModal) {
        const updatedBook = libraryStore.snapshot.books.find((b) => b.id === selectedBookCopiesModal.id);
        if (updatedBook) setSelectedBookCopiesModal(updatedBook);
      }
    }
  };

  useEffect(() => {
    const sub = libraryStore.getObservable().subscribe(setState);
    return () => sub.unsubscribe();
  }, []);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Filtered & Sorted Catalog List
  const filteredBooks = useMemo(() => {
    return state.books
      .filter((b) => {
        // 0. Centralized Taxonomy & Master Filter (Category, Author, Publisher, Hierarchy)
        let matchesTaxonomy = true;
        if (taxonomyFilter.type === 'CATEGORY') {
          matchesTaxonomy = b.categoryId === taxonomyFilter.id || b.categoryName?.toLowerCase() === taxonomyFilter.name?.toLowerCase();
        } else if (taxonomyFilter.type === 'AUTHOR') {
          matchesTaxonomy = b.authorId === taxonomyFilter.id || b.authorName?.toLowerCase() === taxonomyFilter.name?.toLowerCase();
        } else if (taxonomyFilter.type === 'PUBLISHER') {
          matchesTaxonomy = b.publisherId === taxonomyFilter.id || b.publisherName?.toLowerCase() === taxonomyFilter.name?.toLowerCase();
        } else if (taxonomyFilter.type === 'HIERARCHY') {
          const hp = taxonomyFilter.hierarchyPath;
          if (hp?.category) matchesTaxonomy = matchesTaxonomy && (b.categoryName?.toLowerCase() === hp.category.toLowerCase() || b.categoryId === hp.category);
          if (hp?.department) matchesTaxonomy = matchesTaxonomy && b.department?.toLowerCase() === hp.department.toLowerCase();
          if (hp?.subject) matchesTaxonomy = matchesTaxonomy && b.subject?.toLowerCase() === hp.subject.toLowerCase();
        }

        if (!matchesTaxonomy) return false;

        // 1. Category Filter
        const matchesCategory = selectedCategory === 'ALL' || b.categoryId === selectedCategory;

        // 2. Collection Tab Filter
        let matchesCollection = true;
        if (selectedCollectionTab === 'ACADEMIC') matchesCollection = !b.collectionType || b.collectionType === 'ACADEMIC';
        else if (selectedCollectionTab === 'DIGITAL') matchesCollection = b.format === 'DIGITAL' || b.format === 'HYBRID' || b.collectionType === 'DIGITAL';
        else if (selectedCollectionTab === 'NEW_ARRIVALS') matchesCollection = b.publishingYear >= 2023 || b.isBookOfMonth;
        else if (selectedCollectionTab === 'MOST_BORROWED') matchesCollection = (b.borrowCount || 0) > 3 || b.isFeatured;
        else if (selectedCollectionTab === 'RECOMMENDED') matchesCollection = b.isFeatured || b.isBookOfMonth;
        else if (selectedCollectionTab !== 'ALL') matchesCollection = b.collectionType === selectedCollectionTab;

        // 3. Department Filter
        const matchesDepartment = selectedDepartment === 'ALL' || b.department === selectedDepartment;

        // 4. Format Filter
        const matchesFormat = selectedFormat === 'ALL' || b.format === selectedFormat;

        // 5. Availability Status Filter
        let matchesAvailability = true;
        if (selectedAvailability === 'AVAILABLE') matchesAvailability = b.availableCopies > 0;
        else if (selectedAvailability === 'ISSUED') matchesAvailability = b.availableCopies === 0;

        // 6. Language Filter
        const matchesLanguage = selectedLanguage === 'ALL' || b.language.toLowerCase() === selectedLanguage.toLowerCase();

        // 7. Search Query Filter (Title, ISBN, Author, Publisher, Category, Rack, Shelf, Accessions, Barcodes)
        if (!searchTerm.trim()) {
          return matchesCategory && matchesCollection && matchesDepartment && matchesFormat && matchesAvailability && matchesLanguage;
        }

        const q = searchTerm.toLowerCase().trim();
        const matchesTitle = b.title.toLowerCase().includes(q);
        const matchesIsbn = b.isbn.toLowerCase().includes(q);
        const matchesAuthor = b.authorName.toLowerCase().includes(q);
        const matchesPublisher = b.publisherName?.toLowerCase().includes(q) || false;
        const matchesCategoryName = b.categoryName?.toLowerCase().includes(q) || false;
        const matchesRack = b.rackNumber?.toLowerCase().includes(q) || false;
        const matchesShelf = b.shelfNumber?.toLowerCase().includes(q) || false;
        const matchesSubject = b.subject?.toLowerCase().includes(q) || false;
        const matchesDept = b.department?.toLowerCase().includes(q) || false;

        const matchesCopies = (b.copies || []).some(
          (c) =>
            c.accessionNo.toLowerCase().includes(q) ||
            c.barcode.toLowerCase().includes(q) ||
            c.status.toLowerCase().includes(q) ||
            (c.rackNumber && c.rackNumber.toLowerCase().includes(q)) ||
            (c.shelfNumber && c.shelfNumber.toLowerCase().includes(q))
        );

        const matchesSearch =
          matchesTitle ||
          matchesIsbn ||
          matchesAuthor ||
          matchesPublisher ||
          matchesCategoryName ||
          matchesRack ||
          matchesShelf ||
          matchesSubject ||
          matchesDept ||
          matchesCopies;

        return (
          matchesSearch &&
          matchesCategory &&
          matchesCollection &&
          matchesDepartment &&
          matchesFormat &&
          matchesAvailability &&
          matchesLanguage
        );
      })
      .sort((a, b) => {
        if (sortBy === 'YEAR') return b.publishingYear - a.publishingYear;
        if (sortBy === 'PRICE') return b.price - a.price;
        if (sortBy === 'BORROW_COUNT') return (b.borrowCount || 0) - (a.borrowCount || 0);
        return a.title.localeCompare(b.title);
      });
  }, [
    state.books,
    searchTerm,
    selectedCategory,
    selectedCollectionTab,
    selectedDepartment,
    selectedFormat,
    selectedAvailability,
    selectedLanguage,
    sortBy,
    taxonomyFilter,
  ]);

  // Export CSV
  const handleExportCSV = (targetBooks?: Book[]) => {
    const list = targetBooks || filteredBooks;
    const headers = ['ID', 'Title', 'ISBN', 'Department', 'Category', 'Author', 'Publisher', 'Edition', 'Year', 'Format', 'Available Copies', 'Total Copies', 'Price'];
    const rows = list.map((b) => [
      b.id,
      b.title || '',
      b.isbn || '',
      b.department || 'General',
      b.categoryName || '',
      b.authorName || '',
      b.publisherName || '',
      b.edition || '1st Edition',
      b.publishingYear,
      b.format || 'PHYSICAL',
      b.availableCopies,
      b.totalCopies,
      `₹${(b.price || 0).toFixed(2)}`,
    ]);

    exportStyledExcelFile({
      filename: `enterprise_library_catalog_${getLocalDateStr(new Date())}.xlsx`,
      sheetName: 'Catalog Registry',
      headers,
      data: rows,
      themeColor: '4F46E5', // Indigo Header
    });

    triggerToast(`Exported ${list.length} catalog records to styled Excel spreadsheet successfully.`);
  };

  // Export Excel formatted Spreadsheet with auto columns
  const handleExportExcel = () => {
    const list = filteredBooks;
    const headers = [
      'Book ID',
      'Title',
      'ISBN',
      'Department',
      'Category',
      'Author',
      'Publisher',
      'Available Copies',
      'Total Copies',
      'Format',
      'Cost Per Book (INR)',
      'Total Inventory Value (INR)',
    ];
    const rows = list.map((b) => [
      b.id,
      b.title,
      b.isbn,
      b.department || 'Engineering & Technology',
      b.categoryName,
      b.authorName,
      b.publisherName,
      b.availableCopies,
      b.totalCopies,
      b.format || 'PHYSICAL',
      `₹${(b.price || 0).toFixed(2)}`,
      `₹${((b.price || 0) * (b.totalCopies || 1)).toFixed(2)}`,
    ]);

    exportStyledExcelFile({
      filename: `university_catalog_matrix_${getLocalDateStr(new Date())}.xlsx`,
      sheetName: 'Catalog Valuation',
      headers,
      data: rows,
      themeColor: '0F172A', // Slate/Navy Blue
    });

    triggerToast(`Exported ${list.length} records to formatted Excel spreadsheet!`);
  };

  // Execute Auto ISBN Fetch
  const executePreviewFetch = async (targetIsbn: string) => {
    if (!targetIsbn) return;
    const cleanIsbn = targetIsbn.trim();
    const numericIsbn = cleanIsbn.replace(/[^0-9X]/gi, '');
    setIsFetchingIsbn(true);

    let metadata = ISBN_LOOKUP[cleanIsbn] || ISBN_LOOKUP[numericIsbn];

    if (!metadata) {
      try {
        const res = await fetch(`https://openlibrary.org/api/books?bibkeys=ISBN:${numericIsbn}&format=json&jscmd=data`);
        if (res.ok) {
          const data = await res.json();
          const bookObj = data[`ISBN:${numericIsbn}`];
          if (bookObj) {
            metadata = {
              title: bookObj.title || 'Scanned Catalog Item',
              author: bookObj.authors?.[0]?.name || state.authors[0]?.name || 'Library Author',
              publisher: bookObj.publishers?.[0]?.name || state.publishers[0]?.name || 'Academic Publisher',
              year: bookObj.publish_date ? parseInt(bookObj.publish_date.match(/\d{4}/)?.[0] || '2024') : 2024,
              price: 59.99,
              description: bookObj.notes || bookObj.subtitle || `Book title cataloged via ISBN barcode ${cleanIsbn}.`,
              coverUrl: bookObj.cover?.medium || bookObj.cover?.large || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=400&q=80',
            };
          }
        }
      } catch (err) {
        console.warn('OpenLibrary fetch failed', err);
      }
    }

    if (!metadata) {
      metadata = {
        title: 'Academic Textbook Item',
        author: state.authors[0]?.name || 'Academic Author',
        publisher: state.publishers[0]?.name || 'University Press',
        year: 2024,
        price: 65.00,
        description: `Standard catalog entry auto-generated for ISBN ${cleanIsbn}.`,
        coverUrl: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=400&q=80',
      };
    }

    setPreviewMetadata({
      ...metadata,
      isbn: cleanIsbn,
    });
    setIsFetchingIsbn(false);
  };

  const applyMetadataToAddForm = (meta: { title: string; author: string; publisher: string; year: number; price: number; description: string; coverUrl: string; isbn: string }) => {
    const matchingAuth = state.authors.find((a) => a.name.toLowerCase().includes(meta.author.toLowerCase()));
    const matchingPub = state.publishers.find((p) => p.name.toLowerCase().includes(meta.publisher.toLowerCase()));

    setAddFormData((prev) => ({
      ...prev,
      isbn: meta.isbn,
      title: meta.title,
      authorId: matchingAuth?.id || prev.authorId || state.authors[0]?.id || '',
      isCustomAuthor: !matchingAuth,
      customAuthorName: !matchingAuth ? meta.author : '',
      publisherId: matchingPub?.id || prev.publisherId || state.publishers[0]?.id || '',
      isCustomPublisher: !matchingPub,
      customPublisherName: !matchingPub ? meta.publisher : '',
      publishingYear: meta.year,
      price: meta.price,
      description: meta.description,
      coverUrl: meta.coverUrl,
    }));
    triggerToast(`✨ Auto-populated book details for ISBN "${meta.isbn}"!`);
  };

  const openFetchMetadataModal = (initialIsbn?: string) => {
    const target = initialIsbn || addFormData.isbn || '978-0134610993';
    setFetchModalIsbn(target);
    setShowFetchIsbnModal(true);
    executePreviewFetch(target);
  };

  // Unique ISBN Check Validation
  const handleCreateBook = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addFormData.title || !addFormData.isbn) {
      triggerToast('Please provide book title and ISBN.');
      return;
    }

    // Duplicate ISBN validation check
    const existingBookWithIsbn = state.books.find((b) => b.isbn.replace(/-/g, '') === addFormData.isbn.replace(/-/g, ''));
    if (existingBookWithIsbn) {
      if (!window.confirm(`Warning: A book with ISBN "${addFormData.isbn}" ("${existingBookWithIsbn.title}") already exists in the catalog. Do you still want to register a duplicate edition record?`)) {
        return;
      }
    }

    // Resolve Category
    let finalCategoryId = addFormData.categoryId;
    let finalCategoryName = '';
    if (addFormData.isCustomCategory && addFormData.customCategoryName.trim()) {
      const newCat = libraryStore.addCategory({
        name: addFormData.customCategoryName.trim(),
        code: addFormData.customCategoryName.trim().substring(0, 4).toUpperCase(),
        description: 'Custom added category.',
      });
      finalCategoryId = newCat.id;
      finalCategoryName = newCat.name;
    } else {
      const cat = state.categories.find((c) => c.id === addFormData.categoryId) || state.categories[0];
      finalCategoryId = cat?.id || 'cat-1';
      finalCategoryName = cat?.name || 'General Academic';
    }

    // Resolve Author
    let finalAuthorId = addFormData.authorId;
    let finalAuthorName = '';
    if (addFormData.isCustomAuthor && addFormData.customAuthorName.trim()) {
      const newAuth = libraryStore.addAuthor({
        name: addFormData.customAuthorName.trim(),
        biography: 'Academic author catalog entry.',
        email: '',
      });
      finalAuthorId = newAuth.id;
      finalAuthorName = newAuth.name;
    } else {
      const auth = state.authors.find((a) => a.id === addFormData.authorId) || state.authors[0];
      finalAuthorId = auth?.id || 'auth-1';
      finalAuthorName = auth?.name || 'Academic Author';
    }

    // Resolve Publisher
    let finalPublisherId = addFormData.publisherId;
    let finalPublisherName = '';
    if (addFormData.isCustomPublisher && addFormData.customPublisherName.trim()) {
      const newPub = libraryStore.addPublisher({
        name: addFormData.customPublisherName.trim(),
        address: 'Academic Publishing House',
        contactPerson: 'Editorial Office',
      });
      finalPublisherId = newPub.id;
      finalPublisherName = newPub.name;
    } else {
      const pub = state.publishers.find((p) => p.id === addFormData.publisherId) || state.publishers[0];
      finalPublisherId = pub?.id || 'pub-1';
      finalPublisherName = pub?.name || 'University Press';
    }

    libraryStore.addBook(
      {
        title: addFormData.title,
        isbn: addFormData.isbn,
        categoryId: finalCategoryId,
        categoryName: finalCategoryName,
        authorId: finalAuthorId,
        authorName: finalAuthorName,
        publisherId: finalPublisherId,
        publisherName: finalPublisherName,
        edition: addFormData.edition,
        publishingYear: Number(addFormData.publishingYear),
        language: addFormData.language,
        price: Number(addFormData.price),
        description: addFormData.description || 'Standard university library catalog item.',
        coverUrl: addFormData.coverUrl,
        totalCopies: Number(addFormData.totalCopies),
        isFeatured: addFormData.isFeatured,
        isBookOfMonth: addFormData.isBookOfMonth,
        rackNumber: addFormData.rackNumber,
        shelfNumber: addFormData.shelfNumber,
        department: addFormData.department,
        program: addFormData.program,
        specialization: addFormData.specialization,
        subject: addFormData.subject,
        collectionType: addFormData.collectionType,
        isReferenceOnly: addFormData.isReferenceOnly || addFormData.collectionType === 'REFERENCE',
        format: addFormData.format,
        digitalUrl: addFormData.digitalUrl,
        keywords: addFormData.keywords.split(',').map((k) => k.trim()),
      },
      Number(addFormData.totalCopies)
    );

    setShowAddModal(false);
    triggerToast(`"${addFormData.title}" added to catalog with author "${finalAuthorName}" and ${addFormData.totalCopies} accession copies!`);
  };

  // Delete Book
  const handleDeleteBook = (book: Book) => {
    if (window.confirm(`Are you sure you want to delete "${book.title}" from the catalog?`)) {
      libraryStore.deleteBook(book.id);
      triggerToast(`Book "${book.title}" removed from catalog.`);
    }
  };

  // Handle CSV Import Submit
  const handleCSVImportSubmit = () => {
    if (!csvInputText.trim()) return;

    const lines = csvInputText.trim().split('\n');
    let importedCount = 0;

    lines.slice(1).forEach((line) => {
      const parts = line.split(',');
      if (parts.length >= 2) {
        const title = parts[0]?.trim();
        const isbn = parts[1]?.trim();
        const categoryName = parts[2]?.trim() || 'Computer Science & Software';
        const authorName = parts[3]?.trim() || 'Academic Author';
        const publisherName = parts[4]?.trim() || 'University Press';
        const price = parseFloat(parts[5]?.trim() || '500');
        const copies = parseInt(parts[6]?.trim() || '3');

        if (title && isbn) {
          const cat = state.categories.find((c) => c.name.toLowerCase().includes(categoryName.toLowerCase())) || state.categories[0];
          const auth = state.authors.find((a) => a.name.toLowerCase().includes(authorName.toLowerCase())) || state.authors[0];
          const pub = state.publishers.find((p) => p.name.toLowerCase().includes(publisherName.toLowerCase())) || state.publishers[0];

          libraryStore.addBook(
            {
              title,
              isbn,
              categoryId: cat.id,
              categoryName: cat.name,
              authorId: auth.id,
              authorName: auth.name,
              publisherId: pub.id,
              publisherName: pub.name,
              edition: '1st Edition',
              publishingYear: 2024,
              language: 'English',
              price,
              description: `Bulk imported university library record for ${title}.`,
              coverUrl: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=400&q=80',
              totalCopies: copies,
              isFeatured: false,
              isBookOfMonth: false,
              rackNumber: 'RACK-CS-01',
              shelfNumber: 'SHELF-A1',
              department: 'Engineering & Technology',
              format: 'PHYSICAL',
            },
            copies
          );
          importedCount++;
        }
      }
    });

    setShowImportModal(false);
    setCsvInputText('');
    triggerToast(`Successfully imported ${importedCount} catalog books from CSV dataset!`);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-purple-700 bg-purple-50 px-3.5 py-1 rounded-full mb-1 border border-purple-200/80 shadow-2xs">
            <BookOpen className="h-3.5 w-3.5" /> Enterprise University Library Catalog
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold font-poppins text-slate-900 tracking-tight">Manage Books</h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium max-w-xl">
            Hierarchical classification, department collections, accession numbers, barcodes, digital library resources, and bulk operations.
          </p>
        </div>

        {/* Structured Header Actions */}
        <div className="flex flex-col sm:items-end gap-2.5 shrink-0">
          {/* Row 1: Data Import / Export Tools */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                setCsvInputText(
                  'Title,ISBN,Category,Author,Publisher,Price,Copies\nQuantum Computing Primer,978-0262039246,Physics & Applied Science,Dr. Alan Turing,MIT Press,850,4\nDatabase System Concepts,978-0078022159,Computer Science,Abraham Silberschatz,McGraw-Hill,1250,5'
                );
                setShowImportModal(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-700 transition-all cursor-pointer shadow-2xs"
            >
              <Upload className="h-3.5 w-3.5 text-purple-600" /> Import CSV
            </button>
            <button
              onClick={() => handleExportCSV()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-700 transition-all cursor-pointer shadow-2xs"
            >
              <Download className="h-3.5 w-3.5 text-purple-600" /> Export CSV
            </button>
            <button
              onClick={handleExportExcel}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-xs font-bold text-emerald-700 transition-all cursor-pointer shadow-2xs"
            >
              <FileSpreadsheet className="h-3.5 w-3.5" /> Export Excel
            </button>
          </div>

          {/* Row 2: Barcode Ops & Primary Book Creation */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setIsCatalogSearchScannerOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-purple-200 bg-purple-50 hover:bg-purple-100 text-xs font-bold text-purple-700 transition-all cursor-pointer shadow-2xs"
              title="Scan ISBN / Barcode / Accession Tag to search catalog"
            >
              <ScanBarcode className="h-3.5 w-3.5 text-purple-600" /> Scan Barcode
            </button>
            <button
              onClick={handleBulkGenerateBarcodes}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-amber-200 bg-amber-50 hover:bg-amber-100 text-xs font-bold text-amber-800 transition-all cursor-pointer shadow-2xs"
              title="Auto-generate and verify unique Barcode & QR Code tags for all book copies"
            >
              <Barcode className="h-3.5 w-3.5 text-amber-600" /> Bulk Barcode & QR
            </button>
            <button
              onClick={() => {
                setSelectedBookIdsForPrint([]);
                setShowBulkPrintModal(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-xs font-bold text-indigo-800 transition-all cursor-pointer shadow-2xs"
              title="Print barcode & QR label stickers sheet for catalog items"
            >
              <Printer className="h-3.5 w-3.5 text-indigo-600" /> Bulk Print Labels
            </button>
            <button
              onClick={() => {
                setAddFormData({
                  ...addFormData,
                  categoryId: state.categories[0]?.id || '',
                  authorId: state.authors[0]?.id || '',
                  publisherId: state.publishers[0]?.id || '',
                });
                setShowAddModal(true);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-md shadow-purple-200 transition-all cursor-pointer active:scale-95 whitespace-nowrap"
            >
              <Plus className="h-4 w-4" /> Add New Book
            </button>
          </div>
        </div>
      </div>

      {/* Toast Alert */}
      {toastMessage && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-medium animate-fadeIn">
          <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ELEGANT SEARCH, DEPARTMENT & MULTI-FILTER BAR */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-4">


        {/* Clean 5-Column Responsive Filter Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs sm:text-sm">
          {/* 1. Global Search Box */}
          <div className="relative sm:col-span-2 lg:col-span-2">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by Title, ISBN, Author, Category, Accession No, Barcode, Rack..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-10 py-3 rounded-xl border border-slate-200 font-bold text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 bg-slate-50/50"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* 2. Custom Department Dropdown */}
          <div className="relative" ref={deptDropdownRef}>
            <button
              type="button"
              onClick={() => {
                setIsDeptOpen(!isDeptOpen);
                setIsFormatOpen(false);
                setIsSortOpen(false);
              }}
              className="w-full px-3.5 py-3 rounded-xl border border-slate-200 font-bold text-slate-700 bg-slate-50/70 hover:bg-slate-100/80 hover:border-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500/20 text-xs sm:text-sm flex items-center justify-between gap-2 transition-all cursor-pointer shadow-2xs"
            >
              <div className="flex items-center gap-2 truncate">
                <Building2 className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                <span className="truncate">{selectedDepartment === 'ALL' ? 'All Departments' : selectedDepartment}</span>
              </div>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform ${isDeptOpen ? 'rotate-180 text-purple-600' : ''}`} />
            </button>

            {isDeptOpen && (
              <div className="absolute left-0 right-0 top-full mt-1.5 z-40 bg-white rounded-2xl border border-slate-200 shadow-xl max-h-64 overflow-y-auto py-1.5 animate-fadeIn space-y-0.5 min-w-[210px]">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedDepartment('ALL');
                    setIsDeptOpen(false);
                  }}
                  className={`w-full px-3 py-2 text-left text-xs font-bold flex items-center justify-between transition-colors ${selectedDepartment === 'ALL' ? 'bg-purple-50 text-purple-700' : 'text-slate-700 hover:bg-slate-50'
                    }`}
                >
                  <span>All Departments</span>
                  {selectedDepartment === 'ALL' && <Check className="w-3.5 h-3.5 text-purple-600 shrink-0" />}
                </button>
                <div className="my-1 border-t border-slate-100" />
                {DEPARTMENT_OPTIONS.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => {
                      setSelectedDepartment(d);
                      setIsDeptOpen(false);
                    }}
                    className={`w-full px-3 py-2 text-left text-xs flex items-center justify-between transition-colors ${selectedDepartment === d ? 'bg-purple-50 text-purple-700 font-bold' : 'text-slate-700 hover:bg-slate-50 font-medium'
                      }`}
                  >
                    <span className="truncate">{d}</span>
                    {selectedDepartment === d && <Check className="w-3.5 h-3.5 text-purple-600 shrink-0" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 3. Custom Format Dropdown */}
          <div className="relative" ref={formatDropdownRef}>
            <button
              type="button"
              onClick={() => {
                setIsFormatOpen(!isFormatOpen);
                setIsDeptOpen(false);
                setIsSortOpen(false);
              }}
              className="w-full px-3.5 py-3 rounded-xl border border-slate-200 font-bold text-slate-700 bg-slate-50/70 hover:bg-slate-100/80 hover:border-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500/20 text-xs sm:text-sm flex items-center justify-between gap-2 transition-all cursor-pointer shadow-2xs"
            >
              <div className="flex items-center gap-2 truncate">
                <Layers className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                <span className="truncate">
                  {selectedFormat === 'ALL'
                    ? 'All Formats'
                    : selectedFormat === 'PHYSICAL'
                      ? 'Physical Hardcopy'
                      : selectedFormat === 'DIGITAL'
                        ? 'Digital E-Resource'
                        : 'Hybrid (Both)'}
                </span>
              </div>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform ${isFormatOpen ? 'rotate-180 text-purple-600' : ''}`} />
            </button>

            {isFormatOpen && (
              <div className="absolute left-0 right-0 top-full mt-1.5 z-40 bg-white rounded-2xl border border-slate-200 shadow-xl py-1.5 animate-fadeIn space-y-0.5 min-w-[180px]">
                {[
                  { id: 'ALL', label: 'All Formats' },
                  { id: 'PHYSICAL', label: 'Physical Hardcopy' },
                  { id: 'DIGITAL', label: 'Digital E-Resource' },
                  { id: 'HYBRID', label: 'Hybrid (Both)' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setSelectedFormat(item.id);
                      setIsFormatOpen(false);
                    }}
                    className={`w-full px-3 py-2 text-left text-xs flex items-center justify-between transition-colors ${selectedFormat === item.id ? 'bg-purple-50 text-purple-700 font-bold' : 'text-slate-700 hover:bg-slate-50 font-medium'
                      }`}
                  >
                    <span>{item.label}</span>
                    {selectedFormat === item.id && <Check className="w-3.5 h-3.5 text-purple-600 shrink-0" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 4. Custom Sort Dropdown */}
          <div className="relative" ref={sortDropdownRef}>
            <button
              type="button"
              onClick={() => {
                setIsSortOpen(!isSortOpen);
                setIsDeptOpen(false);
                setIsFormatOpen(false);
              }}
              className="w-full px-3.5 py-3 rounded-xl border border-purple-200 font-bold text-purple-700 bg-purple-50/70 hover:bg-purple-100/80 focus:outline-none focus:ring-2 focus:ring-purple-500/20 text-xs sm:text-sm flex items-center justify-between gap-2 transition-all cursor-pointer shadow-2xs"
            >
              <div className="flex items-center gap-2 truncate">
                <ArrowUpDown className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                <span className="truncate">
                  {sortBy === 'TITLE'
                    ? 'Sort: Title (A-Z)'
                    : sortBy === 'YEAR'
                      ? 'Sort: Publishing Year'
                      : sortBy === 'BORROW_COUNT'
                        ? 'Sort: Most Borrowed'
                        : 'Sort: Price (High-Low)'}
                </span>
              </div>
              <ChevronDown className={`w-3.5 h-3.5 text-purple-400 shrink-0 transition-transform ${isSortOpen ? 'rotate-180 text-purple-700' : ''}`} />
            </button>

            {isSortOpen && (
              <div className="absolute left-0 right-0 top-full mt-1.5 z-40 bg-white rounded-2xl border border-purple-100 shadow-xl py-1.5 animate-fadeIn space-y-0.5 min-w-[180px]">
                {[
                  { id: 'TITLE', label: 'Sort: Title (A-Z)' },
                  { id: 'YEAR', label: 'Sort: Publishing Year' },
                  { id: 'BORROW_COUNT', label: 'Sort: Most Borrowed' },
                  { id: 'PRICE', label: 'Sort: Price (High-Low)' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setSortBy(item.id as any);
                      setIsSortOpen(false);
                    }}
                    className={`w-full px-3 py-2 text-left text-xs flex items-center justify-between transition-colors ${sortBy === item.id ? 'bg-purple-50 text-purple-700 font-bold' : 'text-slate-700 hover:bg-slate-50 font-medium'
                      }`}
                  >
                    <span>{item.label}</span>
                    {sortBy === item.id && <Check className="w-3.5 h-3.5 text-purple-600 shrink-0" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>



      {/* CATALOG DATA TABLE */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden p-5 space-y-4">
        {filteredBooks.length > 0 ? (
          <div className="w-full">
            <table className="w-full text-left border-collapse table-auto">
              <thead>
                <tr className="bg-slate-50/90 border-b border-slate-200 text-[11px] font-extrabold text-slate-700 uppercase tracking-wider">
                  <th className="py-3 px-2.5 align-middle w-[32%]">Book Details</th>
                  <th className="py-3 px-2.5 align-middle w-[17%]">Dept & Subject</th>
                  <th className="py-3 px-2.5 align-middle w-[19%]">ISBN & Accession</th>
                  <th className="py-3 px-2.5 align-middle w-[12%]">Location</th>
                  <th className="py-3 px-2.5 align-middle w-[7%]">Format</th>
                  <th className="py-3 px-2.5 align-middle text-center w-[6%]">Copies</th>
                  <th className="py-3 px-2.5 align-middle text-right w-[7%]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredBooks.map((book) => {
                  const firstCopy = book.copies?.[0];
                  return (
                    <tr key={book.id} className="hover:bg-purple-50/20 transition-colors">
                      {/* Title & Author */}
                      <td className="py-3 px-2.5 align-middle max-w-[280px]">
                        <div className="flex items-center gap-2.5">
                          <img
                            src={book.coverUrl || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=400&q=80'}
                            alt={book.title}
                            className="w-9 h-12 object-cover rounded-lg border border-slate-200 shrink-0 shadow-xs"
                          />
                          <div className="space-y-0.5 min-w-0 flex-1">
                            <h3 className="font-extrabold text-slate-900 text-xs sm:text-sm truncate hover:text-purple-600 cursor-pointer leading-tight" onClick={() => setPreviewBookModal(book)} title={book.title}>
                              {book.title}
                            </h3>
                            <p className="text-[11px] font-semibold text-slate-600 truncate">By {book.authorName}</p>
                            <div className="flex items-center gap-1 flex-wrap pt-0.5">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200/80 truncate max-w-[120px]">
                                {book.categoryName}
                              </span>
                              {(book.isReferenceOnly || book.collectionType === 'REFERENCE') && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-800 border border-rose-200 flex items-center gap-0.5" title="Library Reference Book - Non-Issuable">
                                  🚫 REF ONLY
                                </span>
                              )}
                              {book.isFeatured && (
                                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-0.5">
                                  <Sparkles className="w-2.5 h-2.5" /> Featured
                                </span>
                              )}
                              {book.isBookOfMonth && (
                                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-extrabold bg-purple-100 text-purple-800 border border-purple-200">
                                  Monthly
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Department & Subject */}
                      <td className="py-3 px-2.5 align-middle max-w-[160px]">
                        <p className="font-extrabold text-slate-900 text-xs truncate" title={book.department}>{book.department || 'Engineering & Tech'}</p>
                        <p className="text-[11px] font-medium text-slate-500 truncate" title={book.subject}>{book.subject || 'Core Curriculum'}</p>
                        <p className="text-[10px] font-mono font-bold text-purple-700 mt-0.5">{book.edition || '1st Ed'} ({book.publishingYear})</p>
                      </td>

                      {/* ISBN & Accession & Barcode */}
                      <td className="py-3 px-2.5 align-middle font-mono text-xs max-w-[170px] space-y-0.5">
                        <p className="font-extrabold text-slate-900 tracking-tight truncate">{book.isbn}</p>
                        <div className="flex items-center gap-1 text-[10px] font-semibold text-slate-600 truncate">
                          <span className="text-slate-400 font-sans">ACC:</span>
                          <span className="font-bold truncate">{firstCopy?.accessionNo || 'ACC-2024-001'}</span>
                        </div>
                        <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-purple-50 text-purple-800 border border-purple-100 text-[10px] font-bold max-w-full truncate" title="Barcode Tag is Permanent & Locked to match physical sticker">
                          <Barcode className="w-3 h-3 text-purple-600 shrink-0" />
                          <span className="truncate">{firstCopy?.barcode || 'BC-00000'}</span>
                          <Lock className="w-2.5 h-2.5 text-purple-500 shrink-0" />
                        </div>
                      </td>

                      {/* Location */}
                      <td className="py-3 px-2.5 align-middle">
                        <span className="px-2 py-1 rounded-lg bg-slate-100 text-slate-800 font-mono text-[11px] font-extrabold inline-block border border-slate-200/90 whitespace-nowrap">
                          {book.rackNumber || 'RACK-CS-01'} / {book.shelfNumber || 'SHELF-A1'}
                        </span>
                      </td>

                      {/* Format */}
                      <td className="py-3 px-2.5 align-middle">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border inline-block whitespace-nowrap ${book.format === 'DIGITAL'
                            ? 'bg-purple-50 text-purple-800 border-purple-200'
                            : book.format === 'HYBRID'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : 'bg-blue-50 text-blue-800 border-blue-200'
                            }`}
                        >
                          {book.format || 'PHYSICAL'}
                        </span>
                      </td>

                      {/* Copies Availability */}
                      <td className="py-3 px-2.5 align-middle text-center">
                        <button
                          onClick={() => setSelectedBookCopiesModal(book)}
                          className="px-2.5 py-1 rounded-lg text-xs font-extrabold transition-all cursor-pointer border border-slate-200 hover:border-purple-300 bg-slate-50 hover:bg-purple-50 shadow-2xs whitespace-nowrap inline-flex items-center gap-1"
                          title="Manage copies & preview barcodes"
                        >
                          <span className={book.availableCopies > 0 ? 'text-emerald-700 font-black' : 'text-rose-600 font-black'}>
                            {book.availableCopies}
                          </span>
                          <span className="text-slate-500 font-bold"> / {book.totalCopies}</span>
                        </button>
                        {(book.isReferenceOnly || book.collectionType === 'REFERENCE') && (
                          <span className="block text-[9px] font-extrabold text-rose-700 uppercase mt-0.5">
                            NON-ISSUABLE
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-2.5 align-middle text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => {
                              if (book.copies && book.copies.length > 0) {
                                setPreviewBarcodeCopyModal({ book, copy: book.copies[0] });
                              } else {
                                setSelectedBookCopiesModal(book);
                              }
                            }}
                            className="p-1.5 rounded-lg border border-purple-200 bg-purple-50/70 hover:bg-purple-100 text-purple-700 font-bold transition-all shadow-2xs cursor-pointer"
                            title="Preview Locked Barcode & QR Code Tag"
                          >
                            <Barcode className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handlePrintBookAllLabels(book)}
                            className="p-1.5 rounded-lg border border-indigo-200 bg-indigo-50/70 hover:bg-indigo-100 text-indigo-700 font-bold transition-all shadow-2xs cursor-pointer"
                            title="Print Barcode & QR Code Labels for All Copies"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setPreviewBookModal(book)}
                            className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-bold transition-all shadow-2xs cursor-pointer"
                            title="Quick View Details & Inventory"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleOpenEditModal(book)}
                            className="p-1.5 rounded-lg border border-blue-200 bg-blue-50/70 hover:bg-blue-100 text-blue-700 font-bold transition-all shadow-2xs cursor-pointer"
                            title="Edit Book Record"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteBook(book)}
                            className="p-1.5 rounded-lg border border-rose-200 bg-rose-50/70 hover:bg-rose-100 text-rose-700 font-bold transition-all shadow-2xs cursor-pointer"
                            title="Delete Catalog Record"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-16 text-center text-slate-400 space-y-3">
            <BookOpen className="w-12 h-12 mx-auto text-slate-300" />
            <p className="text-sm font-semibold text-slate-600">No catalog books match your criteria.</p>
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedCategory('ALL');
                setSelectedCollectionTab('ALL');
                setSelectedDepartment('ALL');
                setSelectedFormat('ALL');
                setSelectedAvailability('ALL');
              }}
              className="px-4 py-2 bg-purple-600 text-white rounded-xl text-xs font-bold hover:bg-purple-700 transition-all cursor-pointer"
            >
              Reset All Search Filters
            </button>
          </div>
        )}
      </div>

      {/* QUICK PREVIEW & DETAILS DRAWER MODAL */}
      {previewBookModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/60 backdrop-blur-md transition-all duration-300 animate-fadeIn"
          onClick={(e) => {
            if (e.target === e.currentTarget) setPreviewBookModal(null);
          }}
        >
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[85vh] sm:max-h-[90vh] flex flex-col border border-slate-100 overflow-hidden animate-scaleUp">
            {/* Sticky Header */}
            <div className="p-5 sm:p-6 border-b border-slate-100 bg-white shrink-0 flex items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="relative group shrink-0">
                  <img
                    src={previewBookModal.coverUrl || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=400&q=80'}
                    alt={previewBookModal.title}
                    className="w-20 h-28 object-cover rounded-2xl border border-slate-200/80 shadow-md bg-slate-100 transition-transform duration-300 group-hover:scale-105"
                  />
                  {previewBookModal.format && (
                    <span className="absolute -bottom-2 -right-1 bg-slate-900 text-white text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-md shadow-xs border border-white">
                      {previewBookModal.format}
                    </span>
                  )}
                </div>

                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full bg-purple-100/90 text-purple-800 border border-purple-200/60 shadow-2xs">
                      <FolderTree className="w-3 h-3 text-purple-600" />
                      {previewBookModal.categoryName || 'General'}
                    </span>

                    {previewBookModal.collectionType && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200/60">
                        {previewBookModal.collectionType}
                      </span>
                    )}

                    {previewBookModal.isFeatured && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200/60">
                        <Sparkles className="w-3 h-3 text-amber-600" /> Featured
                      </span>
                    )}
                  </div>

                  <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 leading-snug tracking-tight font-poppins pt-0.5">
                    {previewBookModal.title}
                  </h2>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 font-medium">
                    <span className="flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <span className="text-slate-700 font-semibold">{previewBookModal.authorName}</span>
                    </span>
                    <span className="text-slate-300">•</span>
                    <span className="flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5 text-slate-400" />
                      <span>{previewBookModal.publisherName}</span>
                    </span>
                    {previewBookModal.edition && (
                      <>
                        <span className="text-slate-300">•</span>
                        <span className="text-slate-500 font-semibold">{previewBookModal.edition}</span>
                      </>
                    )}
                    {previewBookModal.publishingYear && (
                      <span className="text-slate-400">({previewBookModal.publishingYear})</span>
                    )}
                  </div>
                </div>
              </div>

              <button
                onClick={() => setPreviewBookModal(null)}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full border border-slate-200/60 transition-all cursor-pointer shadow-2xs shrink-0"
                title="Close Modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Content Body */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 bg-slate-50/50">
              {/* Stat Metric Cards Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-1">
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <Hash className="w-3.5 h-3.5 text-blue-500" />
                    <span className="text-[10px] font-extrabold uppercase tracking-wider">ISBN</span>
                  </div>
                  <p className="font-mono font-bold text-slate-900 text-xs sm:text-sm tracking-tight truncate">
                    {previewBookModal.isbn}
                  </p>
                </div>

                <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-1">
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <MapPin className="w-3.5 h-3.5 text-indigo-500" />
                    <span className="text-[10px] font-extrabold uppercase tracking-wider">Location</span>
                  </div>
                  <p className="font-mono font-bold text-slate-900 text-xs tracking-tight truncate">
                    {previewBookModal.rackNumber || 'RACK-CS-01'} / {previewBookModal.shelfNumber || 'SHELF-A1'}
                  </p>
                </div>

                <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-1">
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <Layers className="w-3.5 h-3.5 text-purple-500" />
                    <span className="text-[10px] font-extrabold uppercase tracking-wider">Copies Stock</span>
                  </div>
                  <p className="font-bold text-xs tracking-tight">
                    <span className="text-emerald-600">{previewBookModal.availableCopies} Available</span>
                    <span className="text-slate-400 font-normal text-[11px]"> / {previewBookModal.totalCopies} Total</span>
                  </p>
                </div>

                <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-1">
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <IndianRupee className="w-3.5 h-3.5 text-violet-600" />
                    <span className="text-[10px] font-extrabold uppercase tracking-wider">Price</span>
                  </div>
                  <p className="font-extrabold text-slate-900 text-xs sm:text-sm tracking-tight">
                    ₹{(previewBookModal.price || 0).toFixed(2)}
                  </p>
                </div>
              </div>

              {/* Book Description Box */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-purple-600" />
                  <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                    Book Description
                  </h3>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
                  <p className="text-xs text-slate-600 leading-relaxed font-normal">
                    {previewBookModal.description || 'No detailed description provided for this catalog title.'}
                  </p>
                </div>
              </div>

              {/* Accession Copies Inventory */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Barcode className="w-4 h-4 text-purple-600" />
                    <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                      Accession Copy Inventory
                    </h3>
                    <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 text-[10px] font-bold">
                      {previewBookModal.copies?.length || 0}
                    </span>
                  </div>

                  <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-full border border-purple-200/60 uppercase tracking-wider">
                    <ShieldCheck className="w-3.5 h-3.5 text-purple-600" /> Barcode & QR Verified
                  </span>
                </div>

                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {(previewBookModal.copies || []).length > 0 ? (
                    (previewBookModal.copies || []).map((copy) => (
                      <div
                        key={copy.id}
                        className="flex items-center justify-between p-3 sm:p-3.5 rounded-2xl border border-slate-200/80 bg-white hover:border-purple-300 hover:shadow-xs transition-all text-xs font-mono group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 border border-purple-100 flex items-center justify-center shrink-0 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                            <Barcode className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-bold text-slate-900">{copy.accessionNo}</p>
                              {copy.rackNumber && (
                                <span className="text-[10px] text-slate-400 font-sans">
                                  ({copy.rackNumber}-{copy.shelfNumber})
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-slate-500 font-sans">
                              Barcode: <span className="font-mono text-slate-700 font-semibold">{copy.barcode}</span>
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold tracking-wider ${copy.status === 'AVAILABLE'
                                ? 'bg-emerald-100/80 text-emerald-800 border border-emerald-200/60'
                                : copy.status === 'ISSUED'
                                  ? 'bg-amber-100/80 text-amber-800 border border-amber-200/60'
                                  : 'bg-slate-100 text-slate-700 border border-slate-200/60'
                              }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${copy.status === 'AVAILABLE' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                                }`}
                            />
                            {copy.status}
                          </span>

                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-bold font-sans uppercase">
                            {copy.condition || 'GOOD'}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-6 text-center bg-white rounded-2xl border border-dashed border-slate-200 text-slate-400 text-xs">
                      No accession physical copies registered yet.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Sticky Footer */}
            <div className="p-4 sm:px-6 bg-white border-t border-slate-100 flex items-center justify-between shrink-0">
              <button
                onClick={() => {
                  setSelectedBookCopiesModal(previewBookModal);
                  setPreviewBookModal(null);
                }}
                className="px-4 py-2 rounded-xl text-purple-700 bg-purple-50 hover:bg-purple-100 text-xs font-bold transition-all cursor-pointer border border-purple-200/60 flex items-center gap-1.5"
              >
                <Edit className="w-3.5 h-3.5" />
                Manage Copies
              </button>

              <button
                onClick={() => setPreviewBookModal(null)}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer flex items-center gap-1.5"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}



      {/* COPIES MANAGEMENT & EDIT COPIES MODAL */}
      {selectedBookCopiesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full max-h-[85vh] overflow-y-auto p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-base sm:text-lg font-bold font-poppins text-slate-900">{selectedBookCopiesModal.title}</h2>
                <p className="text-xs text-slate-500 font-medium">Physical Accession Copies Inventory ({selectedBookCopiesModal.copies?.length || 0} Total Copies)</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleAddNewCopyModal(selectedBookCopiesModal.id)}
                  className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> Add Copy
                </button>
                <button onClick={() => setSelectedBookCopiesModal(null)} className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {(selectedBookCopiesModal.copies || []).map((copy) => {
                const isEditing = editingCopyId === copy.id;

                return (
                  <div key={copy.id} className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-3">
                    {isEditing ? (
                      <div className="space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-xs">
                          <div>
                            <label className="block font-bold text-slate-700 mb-0.5">Accession No</label>
                            <input
                              type="text"
                              value={editingCopyData.accessionNo}
                              onChange={(e) => setEditingCopyData({ ...editingCopyData, accessionNo: e.target.value })}
                              className="w-full px-2.5 py-1.5 border rounded-lg font-mono font-bold text-slate-900"
                            />
                          </div>
                          <div>
                            <label className="block font-bold text-slate-700 mb-0.5 flex items-center justify-between">
                              <span>Barcode Tag</span>
                              {copy.barcode && (
                                <span className="text-[10px] text-slate-500 font-bold flex items-center gap-0.5" title="Barcode tag is locked to match physical book sticker">
                                  <Lock className="w-2.5 h-2.5 text-slate-400" /> Locked
                                </span>
                              )}
                            </label>
                            <input
                              type="text"
                              value={editingCopyData.barcode}
                              onChange={(e) => setEditingCopyData({ ...editingCopyData, barcode: e.target.value })}
                              disabled={!!copy.barcode}
                              className={`w-full px-2.5 py-1.5 border rounded-lg font-mono ${copy.barcode ? 'bg-slate-100 text-slate-500 cursor-not-allowed border-slate-200 font-semibold' : 'text-slate-800 font-bold'
                                }`}
                              title={copy.barcode ? 'Barcode is locked once generated to prevent mismatch with physical book tag' : 'Enter barcode tag'}
                            />
                          </div>
                          <div>
                            <label className="block font-bold text-slate-700 mb-0.5">Condition</label>
                            <select
                              value={editingCopyData.condition}
                              onChange={(e) => setEditingCopyData({ ...editingCopyData, condition: e.target.value as any })}
                              className="w-full px-2.5 py-1.5 border rounded-lg font-bold"
                            >
                              <option value="NEW">NEW</option>
                              <option value="GOOD">GOOD</option>
                              <option value="FAIR">FAIR</option>
                              <option value="POOR">POOR</option>
                              <option value="DAMAGED">DAMAGED</option>
                            </select>
                          </div>
                          <div>
                            <label className="block font-bold text-slate-700 mb-0.5">Availability Status</label>
                            <select
                              value={editingCopyData.status}
                              onChange={(e) => setEditingCopyData({ ...editingCopyData, status: e.target.value as any })}
                              className="w-full px-2.5 py-1.5 border rounded-lg font-bold"
                            >
                              <option value="AVAILABLE">AVAILABLE</option>
                              <option value="BORROWED">BORROWED</option>
                              <option value="MAINTENANCE">MAINTENANCE</option>
                              <option value="DAMAGED">DAMAGED</option>
                              <option value="LOST">LOST</option>
                            </select>
                          </div>
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                          <button
                            type="button"
                            onClick={() => setEditingCopyId(null)}
                            className="px-3 py-1.5 rounded-lg border text-xs font-bold text-slate-600 hover:bg-white cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveCopyEdit(copy.id)}
                            className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer"
                          >
                            Save Copy Details
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-slate-900 text-sm">{copy.accessionNo}</span>
                            <span className="font-mono text-slate-500 text-xs flex items-center gap-1" title="Barcode generated and locked to physical sticker">
                              ({copy.barcode})
                              <Lock className="w-3 h-3 text-slate-400" />
                            </span>
                          </div>
                          <p className="text-slate-500 font-medium">
                            Location: <strong>{copy.rackNumber} / {copy.shelfNumber}</strong> | Condition: <strong>{copy.condition}</strong>
                          </p>
                        </div>

                        <div className="flex items-center gap-1.5 flex-wrap justify-end">
                          {copy.isReferenceOnly ? (
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-rose-100 text-rose-800 border border-rose-200">
                              🚫 REF COPY
                            </span>
                          ) : (
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold border ${copy.status === 'AVAILABLE'
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                                : copy.status === 'ISSUED'
                                  ? 'bg-blue-100 text-blue-800 border-blue-200'
                                  : 'bg-amber-100 text-amber-800 border-amber-200'
                                }`}
                            >
                              {copy.status}
                            </span>
                          )}

                          <button
                            onClick={() => setPreviewBarcodeCopyModal({ book: selectedBookCopiesModal, copy })}
                            className="p-1.5 rounded-lg border border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold transition-all cursor-pointer"
                            title="Preview Barcode & QR Code Tag"
                          >
                            <Barcode className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handlePrintSingleCopyLabel(selectedBookCopiesModal, copy)}
                            className="p-1.5 rounded-lg border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold transition-all cursor-pointer"
                            title="Print Copy Sticker Label"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                          <span
                            className="p-1.5 rounded-lg border border-slate-200 bg-slate-100 text-slate-400 font-bold flex items-center justify-center cursor-not-allowed"
                            title="Barcode Tag is Permanent & Locked (Matches Physical Sticker)"
                          >
                            <Lock className="w-3.5 h-3.5" />
                          </span>
                          <button
                            onClick={() => handleDownloadCopyBarcode(selectedBookCopiesModal, copy, 'png')}
                            className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-bold transition-all cursor-pointer"
                            title="Download Barcode PNG Image"
                          >
                            <FileDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleStartCopyEdit(copy)}
                            className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-blue-50 text-blue-600 font-bold transition-all cursor-pointer"
                            title="Edit Copy Details"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteCopyModal(copy.id, copy.accessionNo)}
                            className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-rose-50 text-rose-600 font-bold transition-all cursor-pointer"
                            title="Delete Copy"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button onClick={() => setSelectedBookCopiesModal(null)} className="px-5 py-2.5 bg-slate-900 text-white rounded-2xl text-xs font-bold cursor-pointer hover:bg-slate-800">
                Close Copies Manager
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CSV / EXCEL IMPORT MODAL */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Upload className="w-5 h-5 text-purple-600" /> Batch Import Catalog Books (CSV / Excel)
              </h2>
              <button onClick={() => setShowImportModal(false)} className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-slate-500">Paste your CSV dataset below (Columns: Title, ISBN, Category, Author, Publisher, Price, Copies):</p>
              <textarea
                rows={6}
                value={csvInputText}
                onChange={(e) => setCsvInputText(e.target.value)}
                className="w-full p-3 border rounded-xl font-mono text-xs text-slate-800 focus:outline-none focus:border-purple-500"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                onClick={() =>
                  setCsvInputText(
                    'Title,ISBN,Category,Author,Publisher,Price,Copies\nQuantum Computing Primer,978-0262039246,Physics & Applied Science,Dr. Alan Turing,MIT Press,850,4\nDatabase System Concepts,978-0078022159,Computer Science,Abraham Silberschatz,McGraw-Hill,1250,5'
                  )
                }
                className="text-xs text-purple-600 font-bold hover:underline"
              >
                Load Sample CSV Template
              </button>
              <div className="flex gap-2">
                <button onClick={() => setShowImportModal(false)} className="px-4 py-2 border rounded-xl text-xs font-semibold">
                  Cancel
                </button>
                <button onClick={handleCSVImportSubmit} className="px-4 py-2 bg-purple-600 text-white rounded-xl text-xs font-bold hover:bg-purple-700 cursor-pointer">
                  Execute Bulk Import
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AUTO FETCH ISBN METADATA MODAL */}
      {showFetchIsbnModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-600" /> Auto-Fetch Catalog Metadata via ISBN
              </h2>
              <button onClick={() => setShowFetchIsbnModal(false)} className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={fetchModalIsbn}
                onChange={(e) => setFetchModalIsbn(e.target.value)}
                placeholder="Enter 13-digit ISBN barcode..."
                className="flex-1 px-3 py-2 border rounded-xl font-mono text-xs"
              />
              <button onClick={() => executePreviewFetch(fetchModalIsbn)} className="px-4 py-2 bg-purple-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer">
                {isFetchingIsbn ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                <span>Fetch</span>
              </button>
            </div>

            {previewMetadata && (
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                <p className="font-bold text-slate-900">{previewMetadata.title}</p>
                <p className="text-slate-600">Author: {previewMetadata.author} | Publisher: {previewMetadata.publisher}</p>
                <p className="text-slate-500">{previewMetadata.description}</p>
                <div className="pt-2 flex justify-end">
                  <button
                    onClick={() => {
                      applyMetadataToAddForm(previewMetadata);
                      setShowFetchIsbnModal(false);
                    }}
                    className="px-4 py-2 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 cursor-pointer"
                  >
                    Apply to Add Book Form
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ADD NEW BOOK MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-4">
            <div className="flex items-center justify-between pb-1">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Plus className="w-5 h-5 text-purple-600" /> Register New Book in Catalog
              </h2>
              <button onClick={() => setShowAddModal(false)} className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateBook} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">Book Title *</label>
                  <input
                    type="text"
                    required
                    value={addFormData.title}
                    onChange={(e) => setAddFormData({ ...addFormData, title: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl font-semibold"
                    placeholder="e.g. Artificial Intelligence: A Modern Approach"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">ISBN Barcode *</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      required
                      value={addFormData.isbn}
                      onChange={(e) => setAddFormData({ ...addFormData, isbn: e.target.value })}
                      className="w-full px-3 py-2 border rounded-xl font-mono"
                      placeholder="978-0134610993"
                    />
                    <button
                      type="button"
                      onClick={() => openFetchMetadataModal()}
                      className="px-3 py-2 bg-purple-100 text-purple-800 rounded-xl font-bold flex items-center gap-1 hover:bg-purple-200 cursor-pointer"
                      title="Auto-Fetch Metadata"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Department</label>
                  <select
                    value={addFormData.department}
                    onChange={(e) => setAddFormData({ ...addFormData, department: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl"
                  >
                    {DEPARTMENT_OPTIONS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Category</label>
                  <select
                    value={addFormData.categoryId}
                    onChange={(e) => setAddFormData({ ...addFormData, categoryId: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl"
                  >
                    {state.categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Author</label>
                  <select
                    value={addFormData.authorId}
                    onChange={(e) => setAddFormData({ ...addFormData, authorId: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl"
                  >
                    {state.authors.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Publisher</label>
                  <select
                    value={addFormData.publisherId}
                    onChange={(e) => setAddFormData({ ...addFormData, publisherId: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl"
                  >
                    {state.publishers.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Total Copies Stock</label>
                  <input
                    type="number"
                    min={1}
                    value={addFormData.totalCopies}
                    onChange={(e) => setAddFormData({ ...addFormData, totalCopies: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 border rounded-xl font-bold text-purple-700"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Rack & Shelf Location</label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={addFormData.rackNumber}
                      onChange={(e) => setAddFormData({ ...addFormData, rackNumber: e.target.value })}
                      placeholder="RACK-CS-01"
                      className="px-2.5 py-2 border rounded-xl font-mono text-[11px]"
                    />
                    <input
                      type="text"
                      value={addFormData.shelfNumber}
                      onChange={(e) => setAddFormData({ ...addFormData, shelfNumber: e.target.value })}
                      placeholder="SHELF-A1"
                      className="px-2.5 py-2 border rounded-xl font-mono text-[11px]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Collection Classification</label>
                  <select
                    value={addFormData.collectionType}
                    onChange={(e) => {
                      const val = e.target.value;
                      setAddFormData({
                        ...addFormData,
                        collectionType: val as any,
                        isReferenceOnly: val === 'REFERENCE',
                      });
                    }}
                    className="w-full px-3 py-2 border rounded-xl font-semibold text-slate-800"
                  >
                    <option value="ACADEMIC font-semibold">Academic Book (Issuable)</option>
                    <option value="REFERENCE" className="font-bold text-rose-700">🚫 Library Reference Book (Non-Issuable / Reading Room Only)</option>
                    <option value="GENERAL">General Book (Issuable)</option>
                    <option value="COMPETITIVE">Competitive Exam Book</option>
                    <option value="RESEARCH">Research Paper & Journal</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Format Type</label>
                  <select
                    value={addFormData.format}
                    onChange={(e) => setAddFormData({ ...addFormData, format: e.target.value as any })}
                    className="w-full px-3 py-2 border rounded-xl font-semibold"
                  >
                    <option value="PHYSICAL">Physical Hardcopy</option>
                    <option value="DIGITAL">Digital E-Resource</option>
                    <option value="HYBRID">Hybrid (Both)</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">Description</label>
                  <textarea
                    rows={3}
                    value={addFormData.description}
                    onChange={(e) => setAddFormData({ ...addFormData, description: e.target.value })}
                    className="w-full p-2.5 border rounded-xl"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 border rounded-xl font-semibold">
                  Cancel
                </button>
                <button type="submit" className="px-5 py-2 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 cursor-pointer">
                  Save to Catalog
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT BOOK MODAL */}
      {editingBook && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-4">
            <div className="flex items-center justify-between pb-2">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Edit className="w-5 h-5 text-blue-600" /> Edit Catalog Record
              </h2>
              <button onClick={() => setEditingBook(null)} className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditBook} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Book Title</label>
                <input
                  type="text"
                  required
                  value={editFormData.title}
                  onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl font-bold text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">ISBN</label>
                  <input
                    type="text"
                    required
                    value={editFormData.isbn}
                    onChange={(e) => setEditFormData({ ...editFormData, isbn: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Department</label>
                  <select
                    value={editFormData.department}
                    onChange={(e) => setEditFormData({ ...editFormData, department: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl"
                  >
                    {DEPARTMENT_OPTIONS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Collection Classification</label>
                  <select
                    value={editFormData.collectionType || (editFormData.isReferenceOnly ? 'REFERENCE' : 'ACADEMIC')}
                    onChange={(e) => {
                      const val = e.target.value;
                      setEditFormData({
                        ...editFormData,
                        collectionType: val as any,
                        isReferenceOnly: val === 'REFERENCE',
                      });
                    }}
                    className="w-full px-3 py-2 border rounded-xl font-semibold text-slate-800"
                  >
                    <option value="ACADEMIC">Academic Book (Issuable)</option>
                    <option value="REFERENCE">🚫 Library Reference Book (Non-Issuable / Reading Room Only)</option>
                    <option value="GENERAL">General Book (Issuable)</option>
                    <option value="COMPETITIVE">Competitive Exam Book</option>
                    <option value="RESEARCH">Research Paper & Journal</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Format Type</label>
                  <select
                    value={editFormData.format || 'PHYSICAL'}
                    onChange={(e) => setEditFormData({ ...editFormData, format: e.target.value as any })}
                    className="w-full px-3 py-2 border rounded-xl font-semibold text-slate-800"
                  >
                    <option value="PHYSICAL">Physical Hardcopy</option>
                    <option value="DIGITAL">Digital E-Resource</option>
                    <option value="HYBRID">Hybrid (Both Physical & Digital)</option>
                  </select>
                </div>
              </div>

              {(editFormData.format === 'DIGITAL' || editFormData.format === 'HYBRID') && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Digital Resource / PDF Access Link</label>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={editFormData.digitalUrl}
                    onChange={(e) => setEditFormData({ ...editFormData, digitalUrl: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl text-slate-900"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Rack Location</label>
                  <input
                    type="text"
                    value={editFormData.rackNumber}
                    onChange={(e) => setEditFormData({ ...editFormData, rackNumber: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Shelf Location</label>
                  <input
                    type="text"
                    value={editFormData.shelfNumber}
                    onChange={(e) => setEditFormData({ ...editFormData, shelfNumber: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button type="button" onClick={() => setEditingBook(null)} className="px-4 py-2 border rounded-xl font-semibold">
                  Cancel
                </button>
                <button type="submit" className="px-5 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 cursor-pointer">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Barcode Scanners */}
      <BarcodeScannerModal
        isOpen={isAddBookScannerOpen}
        onClose={() => setIsAddBookScannerOpen(false)}
        onScanSuccess={(code) => {
          setAddFormData((prev) => ({ ...prev, isbn: code }));
          setIsAddBookScannerOpen(false);
          openFetchMetadataModal(code);
        }}
        title="Scan Book ISBN Barcode"
      />

      <BarcodeScannerModal
        isOpen={isCatalogSearchScannerOpen}
        onClose={() => setIsCatalogSearchScannerOpen(false)}
        onScanSuccess={(code) => {
          setSearchTerm(code);
          setIsCatalogSearchScannerOpen(false);
          triggerToast(`🔍 Filtered catalog by scanned barcode "${code}"`);
        }}
        title="Scan Barcode / Accession Tag to Search Catalog"
      />

      {/* ENTERPRISE BARCODE & QR CODE PREVIEW & ACTION MODAL */}
      {previewBarcodeCopyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full p-6 space-y-5 border border-slate-100">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-purple-100 text-purple-700 rounded-2xl">
                  <Barcode className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-extrabold text-slate-900 text-base font-poppins">Enterprise Barcode & QR Code Tag</h2>
                  <p className="text-xs text-slate-500 font-mono">Accession: {previewBarcodeCopyModal.copy.accessionNo}</p>
                </div>
              </div>
              <button
                onClick={() => setPreviewBarcodeCopyModal(null)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Book Details Banner */}
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 text-xs space-y-1">
              <h3 className="font-bold text-slate-900 text-sm line-clamp-1">{previewBarcodeCopyModal.book.title}</h3>
              <p className="text-slate-600 font-medium">Author: {previewBarcodeCopyModal.book.authorName} • ISBN: {previewBarcodeCopyModal.book.isbn}</p>
              <div className="flex items-center gap-2 pt-1 font-mono text-[11px]">
                <span className="bg-white px-2 py-0.5 rounded border text-purple-700 font-bold">Rack: {previewBarcodeCopyModal.copy.rackNumber || 'RACK-CS-01'}</span>
                <span className="bg-white px-2 py-0.5 rounded border text-purple-700 font-bold">Shelf: {previewBarcodeCopyModal.copy.shelfNumber || 'SHELF-A1'}</span>
                <span className={`px-2 py-0.5 rounded font-bold ${previewBarcodeCopyModal.copy.status === 'AVAILABLE' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                  {previewBarcodeCopyModal.copy.status}
                </span>
              </div>
            </div>

            {/* Visual Barcode & QR Code Preview Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Barcode Visual SVG Box */}
              <div className="p-4 rounded-2xl border border-slate-200 bg-white shadow-2xs space-y-3 text-center">
                <p className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center justify-center gap-1.5">
                  <Barcode className="w-4 h-4 text-purple-600" /> Code 128 Barcode
                </p>
                <div
                  className="p-2 bg-white rounded-xl border border-slate-100 flex justify-center items-center overflow-x-auto min-h-[90px]"
                  dangerouslySetInnerHTML={{
                    __html: generateBarcodeSvgString(previewBarcodeCopyModal.copy.barcode, { height: 50 }),
                  }}
                />
                <p className="text-xs font-mono font-bold text-slate-900">{previewBarcodeCopyModal.copy.barcode}</p>
                <div className="flex items-center justify-center gap-1.5 pt-1">
                  <button
                    onClick={() => handleDownloadCopyBarcode(previewBarcodeCopyModal.book, previewBarcodeCopyModal.copy, 'png')}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <FileDown className="w-3 h-3 text-purple-600" /> PNG
                  </button>
                  <button
                    onClick={() => handleDownloadCopyBarcode(previewBarcodeCopyModal.book, previewBarcodeCopyModal.copy, 'svg')}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Download className="w-3 h-3 text-purple-600" /> SVG
                  </button>
                </div>
              </div>

              {/* QR Code Visual SVG Box */}
              <div className="p-4 rounded-2xl border border-slate-200 bg-white shadow-2xs space-y-3 text-center">
                <p className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center justify-center gap-1.5">
                  <QrCode className="w-4 h-4 text-purple-600" /> Standard QR Code
                </p>
                <div
                  className="p-2 bg-white rounded-xl border border-slate-100 flex justify-center items-center overflow-x-auto min-h-[90px]"
                  dangerouslySetInnerHTML={{
                    __html: generateQrSvgString(previewBarcodeCopyModal.copy.qrCode || `QR-${previewBarcodeCopyModal.copy.barcode}`, 110),
                  }}
                />
                <p className="text-xs font-mono font-bold text-slate-900 truncate">{previewBarcodeCopyModal.copy.qrCode || `QR-${previewBarcodeCopyModal.copy.barcode}`}</p>
                <div className="flex items-center justify-center gap-1.5 pt-1">
                  <button
                    onClick={() => handleDownloadCopyQr(previewBarcodeCopyModal.book, previewBarcodeCopyModal.copy, 'png')}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <FileDown className="w-3 h-3 text-purple-600" /> PNG
                  </button>
                  <button
                    onClick={() => handleDownloadCopyQr(previewBarcodeCopyModal.book, previewBarcodeCopyModal.copy, 'svg')}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Download className="w-3 h-3 text-purple-600" /> SVG
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Action Bar */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <div
                className="px-3.5 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-600 font-bold text-xs flex items-center gap-1.5"
                title="Barcode tag is permanently linked to the physical book sticker and locked against regeneration"
              >
                <Lock className="w-3.5 h-3.5 text-slate-500" /> Barcode Permanent & Locked
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPreviewBarcodeCopyModal(null)}
                  className="px-4 py-2 rounded-xl text-slate-600 font-bold text-xs border border-slate-200 hover:bg-slate-50 cursor-pointer"
                >
                  Close
                </button>
                <button
                  onClick={() => handlePrintSingleCopyLabel(previewBarcodeCopyModal.book, previewBarcodeCopyModal.copy)}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" /> Print Label Sticker
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* BULK PRINT LABELS MODAL */}
      {showBulkPrintModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full p-6 space-y-5 border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-indigo-100 text-indigo-700 rounded-2xl">
                  <Printer className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-extrabold text-slate-900 text-base font-poppins">Bulk Print Barcode & QR Code Label Sheet</h2>
                  <p className="text-xs text-slate-500 font-medium">Select book catalog titles to print formatted A4 label stickers.</p>
                </div>
              </div>
              <button
                onClick={() => setShowBulkPrintModal(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Selection Toolbar */}
            <div className="flex items-center justify-between bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-xs">
              <span className="font-bold text-slate-700">
                {selectedBookIdsForPrint.length === 0
                  ? `Printing labels for ALL ${filteredBooks.length} filtered books`
                  : `Selected ${selectedBookIdsForPrint.length} of ${filteredBooks.length} books`}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedBookIdsForPrint(filteredBooks.map((b) => b.id))}
                  className="text-purple-600 font-bold hover:underline"
                >
                  Select All
                </button>
                <span className="text-slate-300">|</span>
                <button
                  type="button"
                  onClick={() => setSelectedBookIdsForPrint([])}
                  className="text-slate-500 font-bold hover:underline"
                >
                  Clear Selection
                </button>
              </div>
            </div>

            {/* Book List with Selection Checkboxes */}
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {filteredBooks.map((book) => {
                const isSelected = selectedBookIdsForPrint.includes(book.id);
                const copiesCount = book.copies?.length || 0;

                return (
                  <div
                    key={book.id}
                    onClick={() => {
                      if (isSelected) {
                        setSelectedBookIdsForPrint(selectedBookIdsForPrint.filter((id) => id !== book.id));
                      } else {
                        setSelectedBookIdsForPrint([...selectedBookIdsForPrint, book.id]);
                      }
                    }}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 text-xs ${isSelected ? 'border-purple-500 bg-purple-50/50 shadow-2xs' : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => { }}
                        className="rounded border-slate-300 text-purple-600 focus:ring-purple-500 w-4 h-4 cursor-pointer"
                      />
                      <div>
                        <p className="font-bold text-slate-900 leading-tight">{book.title}</p>
                        <p className="text-[11px] text-slate-500">{book.authorName} • ISBN: {book.isbn}</p>
                      </div>
                    </div>
                    <span className="font-mono text-xs font-bold text-purple-700 bg-purple-100 px-2.5 py-1 rounded-full whitespace-nowrap">
                      {copiesCount} Copy Labels
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                onClick={() => setShowBulkPrintModal(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteBulkPrint}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer"
              >
                <Printer className="w-4 h-4" /> Print Label Sheet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
