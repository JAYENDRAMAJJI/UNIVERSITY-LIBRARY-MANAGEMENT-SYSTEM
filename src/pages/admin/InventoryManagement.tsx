import { useState, useEffect, useMemo, useRef } from 'react';
import {
  Layers,
  CheckCircle,
  CheckCircle2,
  AlertTriangle,
  MapPin,
  Search,
  BookOpen,
  Barcode,
  ChevronDown,
  ChevronUp,
  Tag,
  Filter,
  X,
  BookmarkCheck,
  UserCheck,
  XCircle,
  Download,
  Printer,
  ScanBarcode,
  ArrowRightLeft,
  GraduationCap,
  Sparkles,
  Compass,
  Eye,
  Info,
  Plus,
  Pencil,
  Trash2,
  RotateCcw,
  RefreshCw,
  Lock,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { libraryStore, getLocalDateStr } from '../../services/libraryStore.service';
import { exportStyledExcelFile } from '../../utils/excelExport';
import { Book, BookCopy, CopyCondition, BookStatus } from '../../types/library';
import {
  ACADEMIC_RACK_HIERARCHY,
  RackDefinition,
  ShelfDefinition,
  STANDARD_5_SHELVES,
  calculatePhysicalShelves,
  PHYSICAL_SHELF_CAPACITY,
  generateLocationCode,
  AcademicProgram,
  normalizeRackAndShelf,
  findRackDefinition,
} from '../../data/rackShelfHierarchy';
import { printRackShelfPlacards, RackShelfPlacard } from '../../utils/barcodeQrGenerator';
import BarcodeScannerModal from '../../components/common/BarcodeScannerModal';
import {
  validateCodeForSection,
  detectCodeType,
  INVALID_SECTION_SCAN_MESSAGE,
} from '../../utils/codeValidation';

interface LocatedBookResult {
  book: Book;
  copy?: BookCopy;
  rack: RackDefinition;
  shelf: ShelfDefinition;
  matchedBy: string;
}

export default function InventoryManagement() {
  const { user } = useAuth();
  // Authorization: Only Admin, Librarian, or Staff roles have permission to view/manage physical shelf configurations
  const hasShelfViewPermission = !user || user.role === 'ADMIN' || user.role === 'LIBRARIAN' || user.role === 'STAFF';

  const [state, setState] = useState(libraryStore.snapshot);
  const [viewMode, setViewMode] = useState<'RACK_SHELF' | 'BOOK_WISE' | 'ALL_COPIES'>('RACK_SHELF');
  const [selectedBookId, setSelectedBookId] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCondition, setFilterCondition] = useState('ALL');
  const [expandedBookId, setExpandedBookId] = useState<string | null>(null);
  const [selectedCopy, setSelectedCopy] = useState<BookCopy | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Rack & Shelf Specific States (Supports all 26 Academic Degree Racks)
  const [academicProgramTab, setAcademicProgramTab] = useState<string>('ALL');
  const [rackShelfSearchTerm, setRackShelfSearchTerm] = useState('');
  const [highlightedRackCode, setHighlightedRackCode] = useState<string | null>(null);
  const [highlightedShelfId, setHighlightedShelfId] = useState<string | null>(null);
  const [highlightedBookId, setHighlightedBookId] = useState<string | null>(null);
  const [locatedBookResult, setLocatedBookResult] = useState<LocatedBookResult | null>(null);
  // Default all racks to collapsed (empty object) — never open automatically without user click
  const [expandedRackCodes, setExpandedRackCodes] = useState<Record<string, boolean>>({});

  // Add / Edit Rack Modal State
  const [rackFormModal, setRackFormModal] = useState<{
    mode: 'ADD' | 'EDIT';
    rackCode: string;
    program: string;
    rackName: string;
    department: string;
    domain: string;
    shortCode: string;
    description: string;
    colorTheme: string;
  } | null>(null);

  // Add / Edit Shelf Modal State
  const [shelfFormModal, setShelfFormModal] = useState<{
    mode: 'ADD' | 'EDIT';
    rackCode: string;
    rackName: string;
    shelfId: string;
    shelfNumber: number;
    shelfName: string;
    focus: string;
    maxCapacity: number;
  } | null>(null);

  // Delete Confirmation Modal
  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{
    type: 'RACK' | 'SHELF' | 'RESET';
    rackCode: string;
    rackName?: string;
    shelfId?: string;
    shelfName?: string;
  } | null>(null);

  const toggleRackExpanded = (rackCode: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    if (!hasShelfViewPermission) {
      triggerToast('🔒 Access Restricted: Administrative or Librarian permission is required to view physical shelf tiers.');
      return;
    }
    setExpandedRackCodes((prev) => ({
      ...prev,
      [rackCode]: !prev[rackCode],
    }));
  };

  // Reassign / Move Book Placement Modal State
  const [movePlacementModal, setMovePlacementModal] = useState<{
    book: Book;
    currentRack: string;
    currentShelf: string;
  } | null>(null);
  const [selectedMoveRack, setSelectedMoveRack] = useState<string>('R01');
  const [selectedMoveShelf, setSelectedMoveShelf] = useState<string>('S01');

  // Barcode & QR Scanner Modal State
  const [isRackScannerOpen, setIsRackScannerOpen] = useState(false);

  // Searchable Book Select State for Book-Wise View
  const [isBookSelectOpen, setIsBookSelectOpen] = useState(false);
  const [bookSelectSearchTerm, setBookSelectSearchTerm] = useState('');
  const bookSelectRef = useRef<HTMLDivElement>(null);

  // Print Rack & Shelf Tags Dropdown / Filter Panel State
  const [isPrintPanelOpen, setIsPrintPanelOpen] = useState(false);
  const [printScope, setPrintScope] = useState<'BOTH' | 'RACKS_ONLY' | 'SHELVES_ONLY'>('BOTH');
  const [printRackTarget, setPrintRackTarget] = useState<string>('ALL');
  const [selectedShelfIds, setSelectedShelfIds] = useState<string[]>([]);
  const printPanelRef = useRef<HTMLDivElement>(null);

  // Sync printRackTarget with academicProgramTab when changed
  useEffect(() => {
    if (academicProgramTab !== 'ALL') {
      setPrintRackTarget(academicProgramTab);
      setSelectedShelfIds([]);
    } else {
      setPrintRackTarget('ALL');
      setSelectedShelfIds([]);
    }
  }, [academicProgramTab]);

  useEffect(() => {
    function handleClickOutsidePrintPanel(event: MouseEvent) {
      if (printPanelRef.current && !printPanelRef.current.contains(event.target as Node)) {
        setIsPrintPanelOpen(false);
      }
    }
    if (isPrintPanelOpen) {
      document.addEventListener('mousedown', handleClickOutsidePrintPanel);
      return () => document.removeEventListener('mousedown', handleClickOutsidePrintPanel);
    }
  }, [isPrintPanelOpen]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (bookSelectRef.current && !bookSelectRef.current.contains(event.target as Node)) {
        setIsBookSelectOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const sub = libraryStore.getObservable().subscribe(setState);
    return () => sub.unsubscribe();
  }, []);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4500);
  };

  // Flatten all copies across all books
  const allCopies: (BookCopy & { bookTitle: string; isbn: string; bookId: string; isReferenceOnly: boolean; collectionType?: string })[] = [];
  state.books.forEach((book) => {
    const isRef = book.isReferenceOnly || book.collectionType === 'REFERENCE';
    book.copies?.forEach((copy) => {
      allCopies.push({
        ...copy,
        bookTitle: book.title,
        isbn: book.isbn,
        bookId: book.id,
        isReferenceOnly: isRef || copy.isReferenceOnly || false,
        collectionType: book.collectionType,
      });
    });
  });

  // Calculate summary metrics
  const totalCopies = allCopies.length;
  const availableCopies = allCopies.filter((c) => c.status === 'AVAILABLE' && !c.isReferenceOnly && c.collectionType !== 'REFERENCE').length;
  const referenceCopies = allCopies.filter((c) => c.isReferenceOnly || c.collectionType === 'REFERENCE').length;
  const issuedCopies = allCopies.filter((c) => c.status === 'ISSUED').length;
  const damagedCopies = allCopies.filter((c) => c.condition === 'DAMAGED').length;
  const lostCopies = allCopies.filter((c) => c.condition === 'LOST').length;

  // Canonical Academic Rack and Shelf Hierarchical Inventory Extraction
  const currentRacks = state.racks && state.racks.length > 0 ? state.racks : ACADEMIC_RACK_HIERARCHY;

  const academicRackInventories = useMemo(() => {
    return currentRacks.map((def) => {
      // Books assigned to this rack
      const rackBooks = state.books.filter((b) => {
        const norm = normalizeRackAndShelf(b.rackNumber, b.shelfNumber, b.department || b.categoryName, b.title);
        return norm.rackCode === def.rackCode || norm.rackId === def.rackId || norm.domain === def.domain;
      });

      // Shelves breakdown
      const shelvesData = def.shelves.map((sDef) => {
        const shelfBooks = rackBooks.filter((b) => {
          const norm = normalizeRackAndShelf(b.rackNumber, b.shelfNumber, b.department || b.categoryName, b.title);
          return norm.shelfNumber === sDef.shelfNumber || b.shelfNumber === sDef.shelfId;
        });
        const totalCopies = shelfBooks.reduce((acc, b) => acc + (b.totalCopies || b.copies?.length || 1), 0);
        const availableCopies = shelfBooks.reduce((acc, b) => acc + (b.availableCopies || 0), 0);

        return {
          ...sDef,
          books: shelfBooks,
          totalCopies,
          availableCopies,
          parentRack: def,
        };
      });

      const totalRackCopies = rackBooks.reduce((acc, b) => acc + (b.totalCopies || b.copies?.length || 1), 0);
      const availableRackCopies = rackBooks.reduce((acc, b) => acc + (b.availableCopies || 0), 0);

      return {
        ...def,
        books: rackBooks,
        shelvesData,
        totalCopies: totalRackCopies,
        availableCopies: availableRackCopies,
      };
    });
  }, [state.books, state.racks]);

  // Filtered Academic Racks based on dropdown selection (academicProgramTab) and search query (rackShelfSearchTerm)
  const filteredAcademicRacks = useMemo(() => {
    return academicRackInventories.filter((r) => {
      if (academicProgramTab !== 'ALL' && r.rackCode !== academicProgramTab && r.program !== academicProgramTab) {
        return false;
      }
      if (!rackShelfSearchTerm.trim()) return true;
      const term = rackShelfSearchTerm.toLowerCase();
      return (
        r.rackName.toLowerCase().includes(term) ||
        r.rackCode.toLowerCase().includes(term) ||
        r.shortCode.toLowerCase().includes(term) ||
        r.department.toLowerCase().includes(term) ||
        r.domain.toLowerCase().includes(term) ||
        r.shelvesData.some(
          (s) =>
            s.shelfId.toLowerCase().includes(term) ||
            s.shelfName.toLowerCase().includes(term) ||
            s.focus.toLowerCase().includes(term) ||
            s.books.some(
              (b) =>
                b.title.toLowerCase().includes(term) ||
                b.authorName.toLowerCase().includes(term) ||
                b.isbn.toLowerCase().includes(term)
            )
        )
      );
    });
  }, [academicRackInventories, academicProgramTab, rackShelfSearchTerm]);

  // Filtered Shelves based on current rack and search filter
  const filteredShelves = useMemo(() => {
    const term = rackShelfSearchTerm.toLowerCase().trim();
    if (!term) {
      return filteredAcademicRacks.flatMap((r) => r.shelvesData);
    }
    return filteredAcademicRacks.flatMap((r) => {
      const rackDirectlyMatches =
        r.rackName.toLowerCase().includes(term) ||
        r.rackCode.toLowerCase().includes(term) ||
        r.shortCode.toLowerCase().includes(term) ||
        r.department.toLowerCase().includes(term) ||
        r.domain.toLowerCase().includes(term);

      if (rackDirectlyMatches) {
        return r.shelvesData;
      }

      return r.shelvesData.filter(
        (s) =>
          s.shelfId.toLowerCase().includes(term) ||
          s.shelfName.toLowerCase().includes(term) ||
          s.focus.toLowerCase().includes(term) ||
          s.books.some(
            (b) =>
              b.title.toLowerCase().includes(term) ||
              b.authorName.toLowerCase().includes(term) ||
              b.isbn.toLowerCase().includes(term)
          )
      );
    });
  }, [filteredAcademicRacks, rackShelfSearchTerm]);

  // Selected Rack helper (when a specific rack is chosen or isolated by filter)
  const selectedRack = useMemo(() => {
    if (academicProgramTab !== 'ALL') {
      return academicRackInventories.find((r) => r.rackCode === academicProgramTab || r.program === academicProgramTab) || null;
    }
    if (filteredAcademicRacks.length === 1 && rackShelfSearchTerm.trim() !== '') {
      return filteredAcademicRacks[0];
    }
    return null;
  }, [academicProgramTab, academicRackInventories, filteredAcademicRacks, rackShelfSearchTerm])  // Filter books for Book-Wise and Flat Copy Views
  const selectedBook = useMemo(() => {
    if (!selectedBookId || selectedBookId === 'ALL') return undefined;
    return state.books.find((b) => b.id === selectedBookId);
  }, [state.books, selectedBookId]);

  const filteredBookOptions = useMemo(() => {
    const term = bookSelectSearchTerm.toLowerCase().trim();
    if (!term) return state.books;
    return state.books.filter(
      (b) =>
        b.title.toLowerCase().includes(term) ||
        b.isbn.toLowerCase().includes(term) ||
        b.authorName.toLowerCase().includes(term) ||
        b.categoryName.toLowerCase().includes(term)
    );
  }, [state.books, bookSelectSearchTerm]);

  const filteredBooks = useMemo(() => {
    return state.books.filter((book) => {
      if (selectedBookId !== 'ALL' && book.id !== selectedBookId) return false;

      if (!searchTerm.trim()) return true;
      const q = searchTerm.toLowerCase().trim();

      const matchesTitle = book.title.toLowerCase().includes(q);
      const matchesIsbn = book.isbn.toLowerCase().includes(q);
      const matchesAuthor = book.authorName.toLowerCase().includes(q);
      const matchesCategory = book.categoryName?.toLowerCase().includes(q) || false;
      const matchesRack = book.rackNumber?.toLowerCase().includes(q) || false;
      const matchesShelf = book.shelfNumber?.toLowerCase().includes(q) || false;

      const matchesCopies = (book.copies || []).some(
        (c) =>
          c.accessionNo.toLowerCase().includes(q) ||
          c.barcode.toLowerCase().includes(q) ||
          c.status.toLowerCase().includes(q) ||
          c.condition.toLowerCase().includes(q)
      );

      return matchesTitle || matchesIsbn || matchesAuthor || matchesCategory || matchesRack || matchesShelf || matchesCopies;
    });
  }, [state.books, selectedBookId, searchTerm]);

  // Filter copies for Flat View
  const filteredCopies = useMemo(() => {
    return allCopies.filter((c) => {
      if (selectedBookId !== 'ALL' && c.bookId !== selectedBookId) return false;

      const q = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !q ||
        c.accessionNo.toLowerCase().includes(q) ||
        c.barcode.toLowerCase().includes(q) ||
        c.bookTitle.toLowerCase().includes(q) ||
        c.isbn.toLowerCase().includes(q);

      let matchesCondition = true;
      if (filterCondition === 'REFERENCE') matchesCondition = c.isReferenceOnly || c.collectionType === 'REFERENCE';
      else if (filterCondition !== 'ALL') matchesCondition = c.condition === filterCondition;

      return matchesSearch && matchesCondition;
    });
  }, [allCopies, selectedBookId, searchTerm, filterCondition]);

  // Dynamic Scanner Search Scope, Target Dataset & Button Labels based on active top filter (viewMode) & sub-filters
  const dynamicScanScope = useMemo(() => {
    // ----------------------------------------------------
    // TOP FILTER 1: RACK & SHELF BARCODES VIEW
    // ----------------------------------------------------
    if (viewMode === 'RACK_SHELF') {
      // 1a. Specific shelf highlighted or selected
      if (selectedRack && highlightedShelfId) {
        const shelfObj = selectedRack.shelvesData.find((s) => s.shelfId === highlightedShelfId);
        const shelfName = shelfObj ? `${shelfObj.shelfId}` : highlightedShelfId;
        return {
          mode: 'RACK_SHELF' as const,
          scopeLabel: `Scan to Find Book in ${selectedRack.rackCode} • ${shelfName}`,
          shortLabel: `Scan in ${shelfName}`,
          scopeDesc: `Shelf ${shelfName} on ${selectedRack.rackCode}`,
          targetRacks: [selectedRack],
          targetShelves: shelfObj ? [shelfObj] : selectedRack.shelvesData,
        };
      }

      // 1b. Specific shelves selected in print filter panel
      if (selectedRack && selectedShelfIds.length > 0) {
        const shelfList = selectedRack.shelvesData.filter((s) => selectedShelfIds.includes(s.shelfId));
        return {
          mode: 'RACK_SHELF' as const,
          scopeLabel:
            selectedShelfIds.length === 1
              ? `Scan to Find Book in ${selectedShelfIds[0]}`
              : `Scan to Find Book in Selected Shelves (${selectedShelfIds.length})`,
          shortLabel: `Scan in ${selectedShelfIds.length === 1 ? selectedShelfIds[0] : 'Selected Shelves'}`,
          scopeDesc: `${selectedShelfIds.length} Shelves in ${selectedRack.rackCode}`,
          targetRacks: [selectedRack],
          targetShelves: shelfList,
        };
      }

      // 1c. Single rack selected
      if (selectedRack) {
        return {
          mode: 'RACK_SHELF' as const,
          scopeLabel: `Scan to Find Book in ${selectedRack.rackCode}`,
          shortLabel: `Scan in ${selectedRack.rackCode}`,
          scopeDesc: `Rack ${selectedRack.rackCode} (${selectedRack.rackName})`,
          targetRacks: [selectedRack],
          targetShelves: selectedRack.shelvesData,
        };
      }

      // 1d. Search query or domain filter applied with multiple matching racks
      if (rackShelfSearchTerm.trim() !== '') {
        if (filteredAcademicRacks.length === 1) {
          return {
            mode: 'RACK_SHELF' as const,
            scopeLabel: `Scan to Find Book in ${filteredAcademicRacks[0].rackCode}`,
            shortLabel: `Scan in ${filteredAcademicRacks[0].rackCode}`,
            scopeDesc: `Filtered Rack ${filteredAcademicRacks[0].rackCode}`,
            targetRacks: filteredAcademicRacks,
            targetShelves: filteredShelves,
          };
        }
        return {
          mode: 'RACK_SHELF' as const,
          scopeLabel: `Scan to Find Book in Filtered Racks (${filteredAcademicRacks.length})`,
          shortLabel: `Scan Filtered Racks`,
          scopeDesc: `${filteredAcademicRacks.length} Filtered Racks`,
          targetRacks: filteredAcademicRacks,
          targetShelves: filteredShelves,
        };
      }

      // 1e. Default / No filter (ALL Racks & Shelves)
      return {
        mode: 'RACK_SHELF' as const,
        scopeLabel: 'Scan Rack & Shelf Barcode',
        shortLabel: 'Scan Rack & Shelf Barcode',
        scopeDesc: `All ${currentRacks.length} Academic Racks & Physical Shelves`,
        targetRacks: academicRackInventories,
        targetShelves: academicRackInventories.flatMap((r) => r.shelvesData),
      };
    }

    // ----------------------------------------------------
    // TOP FILTER 2: BOOK-WISE INVENTORY VIEW
    // ----------------------------------------------------
    if (viewMode === 'BOOK_WISE') {
      if (selectedBook) {
        const titleSnippet = selectedBook.title.length > 24 ? selectedBook.title.slice(0, 24) + '...' : selectedBook.title;
        return {
          mode: 'BOOK_WISE' as const,
          scopeLabel: `Scan Book: ${titleSnippet}`,
          shortLabel: `Scan Book Copy`,
          scopeDesc: `Book "${selectedBook.title}" (${selectedBook.copies?.length || 0} copies)`,
          targetBooks: [selectedBook],
          targetRacks: [],
          targetShelves: [],
        };
      }

      if (searchTerm.trim() !== '') {
        return {
          mode: 'BOOK_WISE' as const,
          scopeLabel: `Scan Filtered Book Inventory (${filteredBooks.length})`,
          shortLabel: `Scan Filtered Books`,
          scopeDesc: `${filteredBooks.length} Filtered Books in Catalog`,
          targetBooks: filteredBooks,
          targetRacks: [],
          targetShelves: [],
        };
      }

      return {
        mode: 'BOOK_WISE' as const,
        scopeLabel: 'Scan Book-Wise Inventory',
        shortLabel: 'Scan Book-Wise Inventory',
        scopeDesc: `All ${state.books.length} Books in Catalog`,
        targetBooks: state.books,
        targetRacks: [],
        targetShelves: [],
      };
    }

    // ----------------------------------------------------
    // TOP FILTER 3: ALL ACCESSION COPIES VIEW
    // ----------------------------------------------------
    if (selectedBook) {
      const titleSnippet = selectedBook.title.length > 20 ? selectedBook.title.slice(0, 20) + '...' : selectedBook.title;
      return {
        mode: 'ALL_COPIES' as const,
        scopeLabel: `Scan Accession Copy for ${titleSnippet}`,
        shortLabel: `Scan Book Accession`,
        scopeDesc: `Copies of "${selectedBook.title}" (${filteredCopies.length} items)`,
        targetCopies: filteredCopies,
        targetRacks: [],
        targetShelves: [],
      };
    }

    if (filterCondition !== 'ALL') {
      const condName = filterCondition === 'REFERENCE' ? 'Reference' : filterCondition;
      return {
        mode: 'ALL_COPIES' as const,
        scopeLabel: `Scan ${condName} Accession Copy (${filteredCopies.length})`,
        shortLabel: `Scan ${condName} Copies`,
        scopeDesc: `${filteredCopies.length} ${condName} Copies`,
        targetCopies: filteredCopies,
        targetRacks: [],
        targetShelves: [],
      };
    }

    if (searchTerm.trim() !== '') {
      return {
        mode: 'ALL_COPIES' as const,
        scopeLabel: `Scan Accession Copy (${filteredCopies.length} Filtered)`,
        shortLabel: `Scan Filtered Copies`,
        scopeDesc: `${filteredCopies.length} Filtered Accession Records`,
        targetCopies: filteredCopies,
        targetRacks: [],
        targetShelves: [],
      };
    }

    return {
      mode: 'ALL_COPIES' as const,
      scopeLabel: 'Scan Accession Copy',
      shortLabel: 'Scan Accession Copy',
      scopeDesc: `All ${allCopies.length} Physical Accession Copies`,
      targetCopies: allCopies,
      targetRacks: [],
      targetShelves: [],
    };
  }, [
    viewMode,
    selectedRack,
    highlightedShelfId,
    selectedShelfIds,
    rackShelfSearchTerm,
    filteredAcademicRacks,
    filteredShelves,
    academicRackInventories,
    currentRacks.length,
    selectedBook,
    searchTerm,
    filteredBooks,
    filterCondition,
    filteredCopies,
    state.books,
    allCopies,
  ]);

  // Scannable Books strictly filtered to current dynamic scope in Rack & Shelf mode
  const scannableBooks = useMemo(() => {
    const allowedShelves = dynamicScanScope.targetShelves;
    const allowedRackCodes = new Set(dynamicScanScope.targetRacks.map((r) => r.rackCode));

    return state.books.filter((b) => {
      const norm = normalizeRackAndShelf(b.rackNumber, b.shelfNumber, b.department || b.categoryName, b.title);
      if (!allowedRackCodes.has(norm.rackCode)) return false;

      return allowedShelves.some((s) => s.shelfNumber === norm.shelfNumber || s.shelfId === norm.shelfCode);
    });
  }, [dynamicScanScope, state.books]);

  // Handle Scanner Result: Locate Book, Shelf, Rack, or Accession Copy strictly within current dynamic scope
  const handleScanSuccessToLocate = (scannedCode: string, detectedMethod?: string) => {
    setIsRackScannerOpen(false);
    const raw = (scannedCode || '').trim();

    const validation = validateCodeForSection(raw, ['RACK_SHELF', 'BOOK_COPY'], state);
    if (!validation.isValid) {
      triggerToast(INVALID_SECTION_SCAN_MESSAGE);
      return;
    }

    const clean = raw.toUpperCase().replace(/^QR-/, '').replace(/^RACK:/, '').replace(/^SHELF:/, '').trim();

    // ==========================================
    // 1. VIEW MODE: RACK & SHELF BARCODES VIEW
    // ==========================================
    if (viewMode === 'RACK_SHELF') {
      // 1a. Check if scanned code directly matches a Rack QR/Barcode
      const directRack = currentRacks.find(
        (r) =>
          r.rackCode.toUpperCase() === clean ||
          r.rackId.toUpperCase() === clean ||
          r.shortCode.toUpperCase() === clean ||
          clean.startsWith(r.rackCode.toUpperCase())
      );

      if (directRack && !state.books.some((b) => b.isbn === raw || b.id === raw || b.copies?.some((c) => c.barcode === raw))) {
        const isWithinScope = dynamicScanScope.targetRacks.some((r) => r.rackCode === directRack.rackCode);
        if (!isWithinScope && dynamicScanScope.targetRacks.length < currentRacks.length) {
          triggerToast(`⚠️ Scanned Rack ${directRack.rackCode} is outside current search scope (${dynamicScanScope.scopeDesc}).`);
          return;
        }

        setAcademicProgramTab(directRack.program as any);
        setHighlightedRackCode(directRack.rackCode);
        setRackShelfSearchTerm(directRack.rackCode);
        if (hasShelfViewPermission) {
          setExpandedRackCodes((prev) => ({ ...prev, [directRack.rackCode]: true }));
        }
        triggerToast(`📍 Scanned Rack Identified: ${directRack.rackName} (${directRack.rackCode})`);

        setTimeout(() => {
          const elem = document.getElementById(`rack-card-${directRack.rackCode}`);
          if (elem) elem.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 200);
        return;
      }

      // 1b. Check if scanned code directly matches a Physical Shelf Tag
      for (const r of currentRacks) {
        const directShelf = r.shelves.find(
          (s) =>
            s.shelfId.toUpperCase() === clean ||
            `${r.shortCode}-${s.shelfId}`.toUpperCase() === clean ||
            `${r.rackCode}/${s.shelfId}`.toUpperCase() === clean ||
            clean.includes(s.shelfId.toUpperCase())
        );
        if (directShelf && !state.books.some((b) => b.isbn === raw || b.id === raw)) {
          const isWithinScope = dynamicScanScope.targetShelves.some(
            (s) => s.shelfId === directShelf.shelfId && (s.parentRack?.rackCode === r.rackCode || r.rackCode === dynamicScanScope.targetRacks[0]?.rackCode)
          );
          if (!isWithinScope && dynamicScanScope.targetShelves.length < academicRackInventories.reduce((a, x) => a + x.shelvesData.length, 0)) {
            triggerToast(`⚠️ Scanned Shelf ${directShelf.shelfId} on ${r.rackCode} is outside current search scope (${dynamicScanScope.scopeDesc}).`);
            return;
          }

          setAcademicProgramTab(r.program as any);
          setHighlightedRackCode(r.rackCode);
          setHighlightedShelfId(directShelf.shelfId);
          setRackShelfSearchTerm(directShelf.shelfId);
          if (hasShelfViewPermission) {
            setExpandedRackCodes((prev) => ({ ...prev, [r.rackCode]: true }));
          }
          triggerToast(`📌 Scanned Shelf Identified: ${directShelf.shelfName} on Rack ${r.rackCode}`);

          setTimeout(() => {
            const elem = document.getElementById(`rack-card-${r.rackCode}`);
            if (elem) elem.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }, 200);
          return;
        }
      }

      // 1c. Locate Book strictly within scannableBooks
      let matchedBook: Book | undefined;
      let matchedCopy: BookCopy | undefined;
      let matchType = 'Scanned Code';

      for (const book of scannableBooks) {
        if (book.copies) {
          for (const copy of book.copies) {
            if (
              copy.barcode.toUpperCase() === clean ||
              copy.accessionNo.toUpperCase() === clean ||
              (copy.qrCode && copy.qrCode.toUpperCase() === clean) ||
              clean.includes(copy.barcode.toUpperCase())
            ) {
              matchedBook = book;
              matchedCopy = copy;
              matchType = `Accession ${copy.accessionNo} (Barcode: ${copy.barcode})`;
              break;
            }
          }
        }
        if (matchedBook) break;
      }

      if (!matchedBook) {
        matchedBook = scannableBooks.find(
          (b) =>
            b.isbn.replace(/-/g, '').toUpperCase() === clean.replace(/-/g, '') ||
            b.isbn.toUpperCase() === clean ||
            b.id === raw ||
            b.title.toUpperCase().includes(clean)
        );
        if (matchedBook) {
          matchType = `ISBN ${matchedBook.isbn}`;
        }
      }

      if (matchedBook) {
        const norm = normalizeRackAndShelf(
          matchedBook.rackNumber,
          matchedBook.shelfNumber,
          matchedBook.department || matchedBook.categoryName,
          matchedBook.title
        );

        const targetRack = currentRacks.find((r) => r.rackCode === norm.rackCode) || currentRacks[0];
        const targetShelf = targetRack.shelves.find((s) => s.shelfNumber === norm.shelfNumber || s.shelfId === norm.shelfCode) || targetRack.shelves[0];

        setLocatedBookResult({
          book: matchedBook,
          copy: matchedCopy,
          rack: targetRack,
          shelf: targetShelf,
          matchedBy: matchType,
        });

        setAcademicProgramTab(targetRack.program as any);
        setHighlightedRackCode(targetRack.rackCode);
        setHighlightedShelfId(targetShelf.shelfId);
        setHighlightedBookId(matchedBook.id);
        if (hasShelfViewPermission) {
          setExpandedRackCodes((prev) => ({ ...prev, [targetRack.rackCode]: true }));
        }

        triggerToast(`🎯 Found in ${dynamicScanScope.scopeDesc}! "${matchedBook.title}" is on ${targetRack.rackCode} → ${targetShelf.shelfName}`);

        setTimeout(() => {
          const elem = document.getElementById(`rack-card-${targetRack.rackCode}`);
          if (elem) {
            elem.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 300);
      } else {
        // Check if book exists in catalog outside current scope
        const outOfScopeBook = state.books.find(
          (b) =>
            b.isbn.replace(/-/g, '').toUpperCase() === clean.replace(/-/g, '') ||
            b.isbn.toUpperCase() === clean ||
            b.id === raw ||
            b.title.toUpperCase().includes(clean) ||
            b.copies?.some((c) => c.barcode.toUpperCase() === clean || c.accessionNo.toUpperCase() === clean)
        );

        if (outOfScopeBook) {
          const norm = normalizeRackAndShelf(outOfScopeBook.rackNumber, outOfScopeBook.shelfNumber, outOfScopeBook.department || outOfScopeBook.categoryName, outOfScopeBook.title);
          triggerToast(`⚠️ Book "${outOfScopeBook.title}" is located on ${norm.rackCode} (${norm.domain}), which is outside ${dynamicScanScope.scopeDesc}. Clear filter to view.`);
        } else {
          triggerToast(`⚠️ No book found matching "${raw}" in ${dynamicScanScope.scopeDesc}.`);
        }
      }
      return;
    }

    // ==========================================
    // 2. VIEW MODE: BOOK-WISE INVENTORY VIEW
    // ==========================================
    if (viewMode === 'BOOK_WISE') {
      const targetBooks = ('targetBooks' in dynamicScanScope && dynamicScanScope.targetBooks) ? dynamicScanScope.targetBooks : filteredBooks;
      let matchedBook: Book | undefined;
      let matchedCopy: BookCopy | undefined;

      for (const book of targetBooks) {
        if (
          book.isbn.replace(/-/g, '').toUpperCase() === clean.replace(/-/g, '') ||
          book.isbn.toUpperCase() === clean ||
          book.id === raw ||
          book.title.toUpperCase().includes(clean)
        ) {
          matchedBook = book;
          break;
        }
        if (book.copies) {
          for (const copy of book.copies) {
            if (
              copy.barcode.toUpperCase() === clean ||
              copy.accessionNo.toUpperCase() === clean ||
              (copy.qrCode && copy.qrCode.toUpperCase() === clean)
            ) {
              matchedBook = book;
              matchedCopy = copy;
              break;
            }
          }
        }
        if (matchedBook) break;
      }

      if (matchedBook) {
        setExpandedBookId(matchedBook.id);
        setHighlightedBookId(matchedBook.id);
        triggerToast(`🎯 Found Book in Inventory: "${matchedBook.title}" (ISBN: ${matchedBook.isbn})${matchedCopy ? ` • Accession: ${matchedCopy.accessionNo}` : ''}`);

        setTimeout(() => {
          const elem = document.getElementById(`book-card-${matchedBook.id}`);
          if (elem) elem.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 200);
      } else {
        const outOfScopeBook = state.books.find(
          (b) =>
            b.isbn.replace(/-/g, '').toUpperCase() === clean.replace(/-/g, '') ||
            b.isbn.toUpperCase() === clean ||
            b.id === raw ||
            b.title.toUpperCase().includes(clean) ||
            b.copies?.some((c) => c.barcode.toUpperCase() === clean || c.accessionNo.toUpperCase() === clean)
        );

        if (outOfScopeBook) {
          triggerToast(`⚠️ Book "${outOfScopeBook.title}" exists in catalog but is excluded by active Book filter (${dynamicScanScope.scopeDesc}). Clear search to view.`);
        } else {
          triggerToast(`⚠️ No book found matching "${raw}" in ${dynamicScanScope.scopeDesc}.`);
        }
      }
      return;
    }

    // ==========================================
    // 3. VIEW MODE: ALL ACCESSION COPIES VIEW
    // ==========================================
    if (viewMode === 'ALL_COPIES') {
      const targetCopies = ('targetCopies' in dynamicScanScope && dynamicScanScope.targetCopies) ? dynamicScanScope.targetCopies : filteredCopies;
      const matchedCopy = targetCopies.find(
        (c) =>
          c.barcode.toUpperCase() === clean ||
          c.accessionNo.toUpperCase() === clean ||
          (c.qrCode && c.qrCode.toUpperCase() === clean) ||
          c.id === raw ||
          c.isbn.replace(/-/g, '').toUpperCase() === clean.replace(/-/g, '')
      );

      if (matchedCopy) {
        setSelectedCopy(matchedCopy);
        triggerToast(`🎯 Found Accession Copy: ${matchedCopy.accessionNo} (${matchedCopy.bookTitle}) • Status: ${matchedCopy.status}`);

        setTimeout(() => {
          const elem = document.getElementById(`copy-row-${matchedCopy.id}`);
          if (elem) elem.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 200);
      } else {
        const outOfScopeCopy = allCopies.find(
          (c) =>
            c.barcode.toUpperCase() === clean ||
            c.accessionNo.toUpperCase() === clean ||
            c.id === raw ||
            c.isbn.replace(/-/g, '').toUpperCase() === clean.replace(/-/g, '')
        );

        if (outOfScopeCopy) {
          triggerToast(`⚠️ Scanned Copy ${outOfScopeCopy.accessionNo} (${outOfScopeCopy.condition}) is excluded by active Accession filter (${dynamicScanScope.scopeDesc}).`);
        } else {
          triggerToast(`⚠️ No accession copy found matching "${raw}" in ${dynamicScanScope.scopeDesc}.`);
        }
      }
    }
  };

  // Rack & Shelf Form Submit Handlers
  const handleSaveRackForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rackFormModal) return;

    const { mode, rackCode, program, rackName, department, domain, shortCode, description, colorTheme } = rackFormModal;
    if (!rackName.trim() || !shortCode.trim()) {
      triggerToast('⚠️ Please enter Rack Name and Short Code.');
      return;
    }

    const generatedCode = rackCode.trim() ? rackCode.trim().toUpperCase() : `RACK-${program.toUpperCase()}-${shortCode.toUpperCase()}-01`;

    if (mode === 'ADD') {
      const newRackDef: RackDefinition = {
        rackId: `RACK-${shortCode.toUpperCase()}`,
        rackCode: generatedCode,
        rackName: rackName.trim(),
        degreeName: rackName.trim(),
        program: program || 'B.Tech / B.E.',
        department: department.trim() || rackName.trim(),
        domain: domain.trim() || department.trim() || rackName.trim(),
        shortCode: shortCode.trim().toUpperCase(),
        description: description.trim() || `Departmental stacks for ${rackName}.`,
        colorTheme: colorTheme || 'from-blue-600 to-indigo-700',
        shelves: [
          { shelfId: 'S01', shelfNumber: 1, shelfName: 'Branch 01: Core Curricula & Prescribed Textbooks', focus: 'Core Curricula, Introductory Texts & Syllabi', maxCapacity: 50 },
          { shelfId: 'S02', shelfNumber: 2, shelfName: 'Branch 02: Advanced Reference & Monographs', focus: 'Standard Reference & Academic Handbooks', maxCapacity: 50 },
          { shelfId: 'S03', shelfNumber: 3, shelfName: 'Branch 03: Specialized Domain Research', focus: 'Research Papers, Monographs & Case Studies', maxCapacity: 50 },
        ],
      };

      const res = libraryStore.addRack(newRackDef);
      if (res.success) {
        setRackFormModal(null);
        setExpandedRackCodes((prev) => ({ ...prev, [newRackDef.rackCode]: true }));
        triggerToast(res.message);
      } else {
        triggerToast(`⚠️ ${res.message}`);
      }
    } else {
      // EDIT MODE
      const res = libraryStore.updateRack(rackCode, {
        rackName: rackName.trim(),
        program: (program === 'B.Tech' || program === 'B.Sc' ? program : 'B.Tech') as any,
        department: department.trim(),
        domain: domain.trim(),
        shortCode: shortCode.trim().toUpperCase(),
        description: description.trim(),
        colorTheme,
      });

      if (res.success) {
        setRackFormModal(null);
        triggerToast(res.message);
      } else {
        triggerToast(`⚠️ ${res.message}`);
      }
    }
  };

  const handleSaveShelfForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!shelfFormModal) return;

    const { mode, rackCode, shelfId, shelfNumber, shelfName, focus, maxCapacity } = shelfFormModal;
    if (!shelfId.trim() || !shelfName.trim()) {
      triggerToast('⚠️ Please enter Shelf ID and Shelf Name.');
      return;
    }

    if (mode === 'ADD') {
      const res = libraryStore.addShelf(rackCode, {
        shelfId: shelfId.trim().toUpperCase(),
        shelfNumber: Number(shelfNumber) || 1,
        shelfName: shelfName.trim(),
        focus: focus.trim() || 'General Academic Focus',
        maxCapacity: Number(maxCapacity) || 40,
      });

      if (res.success) {
        setShelfFormModal(null);
        setExpandedRackCodes((prev) => ({ ...prev, [rackCode]: true }));
        triggerToast(res.message);
      } else {
        triggerToast(`⚠️ ${res.message}`);
      }
    } else {
      // EDIT MODE
      const res = libraryStore.updateShelf(rackCode, shelfId, {
        shelfName: shelfName.trim(),
        focus: focus.trim(),
        maxCapacity: Number(maxCapacity) || 40,
      });

      if (res.success) {
        setShelfFormModal(null);
        triggerToast(res.message);
      } else {
        triggerToast(`⚠️ ${res.message}`);
      }
    }
  };

  const handleExecuteDeleteConfirm = () => {
    if (!deleteConfirmModal) return;

    if (deleteConfirmModal.type === 'RACK') {
      const res = libraryStore.deleteRack(deleteConfirmModal.rackCode);
      setDeleteConfirmModal(null);
      triggerToast(res.message);
    } else if (deleteConfirmModal.type === 'SHELF') {
      const res = libraryStore.deleteShelf(deleteConfirmModal.rackCode, deleteConfirmModal.shelfId || '');
      setDeleteConfirmModal(null);
      triggerToast(res.message);
    } else if (deleteConfirmModal.type === 'RESET') {
      const res = libraryStore.resetRacksToDefault();
      setDeleteConfirmModal(null);
      triggerToast(res.message);
    }
  };

  // Handle Move / Reassign Book Location
  const handleExecuteMovePlacement = () => {
    if (!movePlacementModal) return;
    const targetBook = movePlacementModal.book;
    libraryStore.moveBookRackAndShelf(targetBook.id, selectedMoveRack, selectedMoveShelf);
    setMovePlacementModal(null);
    triggerToast(`Moved "${targetBook.title}" to ${selectedMoveRack} - ${selectedMoveShelf}!`);
  };

  // Dynamic Add Action (Add New Rack or Add Shelf to Selected Rack)
  const handleDynamicAddAction = () => {
    if (selectedRack) {
      const nextShelfNum = (selectedRack.shelvesData?.length || selectedRack.shelves?.length || 0) + 1;
      const nextShelfId = `S${String(nextShelfNum).padStart(2, '0')}`;
      setShelfFormModal({
        mode: 'ADD',
        rackCode: selectedRack.rackCode,
        rackName: selectedRack.rackName,
        shelfId: nextShelfId,
        shelfNumber: nextShelfNum,
        shelfName: `Branch 0${nextShelfNum}: Additional Domain Stack`,
        focus: 'Academic Focus & Reference',
        maxCapacity: 50,
      });
    } else {
      setRackFormModal({
        mode: 'ADD',
        rackCode: '',
        program: 'B.Tech / B.E.',
        rackName: '',
        department: '',
        domain: '',
        shortCode: '',
        description: '',
        colorTheme: 'from-blue-600 to-indigo-700',
      });
    }
  };

  // Target Racks for Print Panel
  const panelTargetRacks = useMemo(() => {
    if (printRackTarget === 'ALL') {
      return filteredAcademicRacks;
    }
    return academicRackInventories.filter((r) => r.rackCode === printRackTarget || r.program === printRackTarget);
  }, [printRackTarget, filteredAcademicRacks, academicRackInventories]);

  // Active Selected Rack for Shelf Selection
  const activeRackForShelfSelection = useMemo(() => {
    if (printRackTarget === 'ALL') return null;
    return academicRackInventories.find((r) => r.rackCode === printRackTarget || r.program === printRackTarget) || null;
  }, [printRackTarget, academicRackInventories]);

  // Target Shelves for Print Panel
  const panelTargetShelves = useMemo(() => {
    if (printRackTarget === 'ALL') {
      return filteredShelves;
    }
    if (!activeRackForShelfSelection) return [];
    if (selectedShelfIds.length > 0) {
      return activeRackForShelfSelection.shelvesData.filter((s) => selectedShelfIds.includes(s.shelfId));
    }
    return activeRackForShelfSelection.shelvesData;
  }, [printRackTarget, filteredShelves, activeRackForShelfSelection, selectedShelfIds]);

  // Dynamic counts for print panel
  const rackSignsCount = printScope === 'SHELVES_ONLY' ? 0 : panelTargetRacks.length;
  const shelfTagsCount = printScope === 'RACKS_ONLY' ? 0 : panelTargetShelves.length;
  const totalPrintCount = rackSignsCount + shelfTagsCount;

  // Execute printing from dropdown panel
  const handleExecutePrintFromPanel = () => {
    const items: RackShelfPlacard[] = [];

    // 1. Rack placards
    if (printScope === 'BOTH' || printScope === 'RACKS_ONLY') {
      panelTargetRacks.forEach((r) => {
        items.push({
          type: 'RACK',
          rackNumber: r.rackCode,
          department: `${r.program} • ${r.department}`,
          totalBooksCount: r.books.length,
          totalCopiesCount: r.totalCopies,
          barcode: r.rackCode,
          qrPayload: `RACK:${r.rackCode}`,
        });
      });
    }

    // 2. Shelf tags
    if (printScope === 'BOTH' || printScope === 'SHELVES_ONLY') {
      panelTargetShelves.forEach((s) => {
        const parent = s.parentRack || academicRackInventories.find((r) => r.shelvesData.some((sh) => sh.shelfId === s.shelfId)) || academicRackInventories[0];
        items.push({
          type: 'SHELF',
          rackNumber: parent.rackCode,
          shelfNumber: s.shelfId,
          department: `${parent.shortCode} • ${s.shelfName}`,
          totalBooksCount: s.books.length,
          totalCopiesCount: s.totalCopies,
          barcode: `${parent.shortCode}-${s.shelfId}`,
          qrPayload: `SHELF:${parent.rackCode}/${s.shelfId}`,
        });
      });
    }

    if (items.length === 0) return;
    printRackShelfPlacards(items);
    setIsPrintPanelOpen(false);

    if (printScope === 'BOTH') {
      triggerToast(`Printed ${items.length} items (${rackSignsCount} Rack Signs & ${shelfTagsCount} Shelf Tags)!`);
    } else if (printScope === 'RACKS_ONLY') {
      triggerToast(`Printed ${items.length} official Rack Sign${items.length === 1 ? '' : 's'}!`);
    } else {
      triggerToast(`Printed ${items.length} official Shelf Tag${items.length === 1 ? '' : 's'}!`);
    }
  };

  // Print Single Rack Placard
  const handlePrintSingleRackPlacard = (r: typeof academicRackInventories[0]) => {
    const item: RackShelfPlacard = {
      type: 'RACK',
      rackNumber: r.rackCode,
      department: `${r.program} • ${r.department}`,
      totalBooksCount: r.books.length,
      totalCopiesCount: r.totalCopies,
      barcode: r.rackCode,
      qrPayload: `RACK:${r.rackCode}`,
    };
    printRackShelfPlacards([item]);
    triggerToast(`Printed official rack sign for ${r.rackName}!`);
  };

  // Print Single Shelf Tag
  const handlePrintSingleShelfTag = (r: typeof academicRackInventories[0], s: typeof academicRackInventories[0]['shelvesData'][0]) => {
    const item: RackShelfPlacard = {
      type: 'SHELF',
      rackNumber: r.rackCode,
      shelfNumber: s.shelfId,
      department: `${r.shortCode} • ${s.shelfName}`,
      totalBooksCount: s.books.length,
      totalCopiesCount: s.totalCopies,
      barcode: `${r.shortCode}-${s.shelfId}`,
      qrPayload: `SHELF:${r.rackCode}/${s.shelfId}`,
    };
    printRackShelfPlacards([item]);
    triggerToast(`Printed official shelf tag for "${s.shelfId}" on ${r.shortCode}!`);
  };

  const handleUpdateCondition = (copyId: string, newCondition: CopyCondition, newStatus?: BookStatus) => {
    libraryStore.updateCopyCondition(copyId, newCondition, newStatus);
    setSelectedCopy(null);
    triggerToast(`Inventory copy updated to condition: ${newCondition}`);
  };

  const toggleExpandBook = (bookId: string) => {
    setExpandedBookId((prev) => (prev === bookId ? null : bookId));
  };

  const handleDirectExportCSV = () => {
    const targetBooks = filteredBooks.length > 0 ? filteredBooks : state.books;

    const headers = [
      'S. NO.',
      'BOOK ID',
      'ISBN',
      'BOOK TITLE',
      'AUTHOR NAME',
      'CATEGORY',
      'PUBLISHER',
      'PUBLISHING YEAR',
      'TOTAL COPIES',
      'RACK NO',
      'SHELF NO',
      'POSITION',
      'COST PER BOOK (INR)',
      'TOTAL INVENTORY VALUE (INR)',
    ];

    const rows = targetBooks.map((b, index) => {
      const cost = b.price || 0;
      const totalCopiesCount = b.totalCopies || (b.copies ? b.copies.length : 0);
      const totalValue = cost * totalCopiesCount;
      const norm = normalizeRackAndShelf(b.rackNumber, b.shelfNumber, b.department || b.categoryName, b.title);
      const rack = norm.rackCode;
      const shelf = norm.shelfCode;
      const position = `${norm.domain} Stack Bay`;

      return [
        index + 1,
        b.id,
        b.isbn,
        b.title || '',
        b.authorName || '',
        b.categoryName || '',
        b.publisherName || '',
        b.publishingYear || 'N/A',
        totalCopiesCount,
        rack,
        shelf,
        position,
        `₹${cost.toFixed(2)}`,
        `₹${totalValue.toFixed(2)}`,
      ];
    });

    exportStyledExcelFile({
      filename: `inventory_shelf_allocation_${getLocalDateStr(new Date())}.xlsx`,
      sheetName: 'Shelf Allocation Inventory',
      headers,
      data: rows,
      themeColor: '0284C7',
    });

    triggerToast(`Inventory Excel exported successfully (${targetBooks.length} books)!`);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-5">
        {/* Top Row: Title & Action Buttons */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <span className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-teal-800 bg-teal-50 border border-teal-200/60 px-3 py-1 rounded-full whitespace-nowrap">
              <Layers className="h-3.5 w-3.5 text-teal-600 shrink-0" /> Physical Inventory & Smart Rack Allocation
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold font-poppins text-slate-900 tracking-tight">
              Inventory & Shelf Allocation
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 font-medium">
              Academic domain racks, dynamic shelf tier allocation, barcode & QR sign & shelf tag printing, and instant scanner book lookup.
            </p>
          </div>

          {/* Action Buttons: Scanner & Export */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0 self-stretch sm:self-auto">
            <button
              type="button"
              onClick={() => setIsRackScannerOpen(true)}
              className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-teal-600 to-indigo-600 hover:from-teal-700 hover:to-indigo-700 text-white font-bold text-xs transition-all flex items-center gap-2 cursor-pointer shadow-md shadow-teal-500/20 active:scale-95 whitespace-nowrap"
              title={`Scan book barcode, ISBN, accession number, or rack QR within ${dynamicScanScope.scopeDesc}`}
            >
              <ScanBarcode className="h-4 w-4 shrink-0" />
              <span>{dynamicScanScope.scopeLabel}</span>
            </button>

            <button
              type="button"
              onClick={handleDirectExportCSV}
              className="px-4 py-2.5 rounded-2xl bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100 font-bold text-xs transition-all flex items-center gap-2 cursor-pointer shadow-2xs active:scale-95 whitespace-nowrap"
              title="Export complete inventory dataset to Excel (.xlsx)"
            >
              <Download className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>Export Excel</span>
            </button>
          </div>
        </div>

        {/* Bottom Row: 3-Way Primary View Mode Segmented Controls */}
        <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 overflow-x-auto">
          <div className="inline-flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200 text-xs font-bold shrink-0">
            <button
              type="button"
              onClick={() => setViewMode('RACK_SHELF')}
              className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${viewMode === 'RACK_SHELF'
                  ? 'bg-white text-teal-900 shadow-sm border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                }`}
            >
              <Layers className="w-4 h-4 text-teal-600 shrink-0" />
              <span>Rack & Shelf Barcodes</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('BOOK_WISE')}
              className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${viewMode === 'BOOK_WISE'
                  ? 'bg-white text-indigo-900 shadow-sm border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                }`}
            >
              <BookOpen className="w-4 h-4 text-indigo-600 shrink-0" />
              <span>Book-Wise Inventory</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('ALL_COPIES')}
              className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${viewMode === 'ALL_COPIES'
                  ? 'bg-white text-indigo-900 shadow-sm border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                }`}
            >
              <Barcode className="w-4 h-4 text-indigo-600 shrink-0" />
              <span>All Accession Copies ({allCopies.length})</span>
            </button>
          </div>

          <span className="text-[11px] font-semibold text-slate-400 hidden md:inline whitespace-nowrap">
            Active Mode: <strong className="text-slate-700">{viewMode === 'RACK_SHELF' ? `${currentRacks.length} Academic Racks & ${academicRackInventories.reduce((acc, r) => acc + r.shelvesData.length, 0)} Shelves` : viewMode === 'BOOK_WISE' ? 'Catalog Book Breakdown' : 'All Individual Copies'}</strong>
          </span>
        </div>
      </div>

      {toastMessage && (
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-medium animate-fadeIn shadow-2xs">
          <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* LOCATED BOOK HIGHLIGHT HERO CARD (Triggered by Scanner or Search) */}
      {locatedBookResult && (
        <div className="p-5 rounded-3xl bg-gradient-to-r from-teal-950 via-slate-900 to-indigo-950 text-white border-2 border-teal-400/40 shadow-xl space-y-4 animate-fadeIn">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-teal-500/20 text-teal-300 border border-teal-400/30">
                <Compass className="w-5 h-5 animate-spin" style={{ animationDuration: '8s' }} />
              </span>
              <div>
                <h3 className="text-base font-black font-poppins text-white flex items-center gap-2">
                  📍 Physical Shelf Location Identified
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/30 text-emerald-300 border border-emerald-400/30">
                    Matched by {locatedBookResult.matchedBy}
                  </span>
                </h3>
                <p className="text-xs text-slate-300">Target book found under academic department stacks.</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const elem = document.getElementById(`rack-card-${locatedBookResult.rack.rackCode}`);
                  if (elem) elem.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }}
                className="px-3 py-1.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5" /> Jump to Shelf in Rack Layout
              </button>
              <button
                type="button"
                onClick={() => setLocatedBookResult(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="Dismiss location highlight"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
            {/* Book Meta Left */}
            <div className="md:col-span-6 flex items-start gap-3.5">
              <img
                src={locatedBookResult.book.coverUrl}
                alt={locatedBookResult.book.title}
                className="w-16 h-24 object-cover rounded-xl border border-white/20 shadow-md shrink-0"
              />
              <div className="space-y-1 min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-teal-500/30 text-teal-200 border border-teal-400/30">
                    ISBN: {locatedBookResult.book.isbn}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-white/10 text-slate-200">
                    {locatedBookResult.book.categoryName}
                  </span>
                </div>
                <h4 className="text-sm sm:text-base font-bold text-white line-clamp-1">{locatedBookResult.book.title}</h4>
                <p className="text-xs text-slate-300">
                  by <span className="font-semibold text-white">{locatedBookResult.book.authorName}</span> &bull; {locatedBookResult.book.publisherName}
                </p>
                {locatedBookResult.copy && (
                  <p className="text-[11px] font-mono font-bold text-emerald-300 pt-0.5">
                    Accession No: {locatedBookResult.copy.accessionNo} • Status: {locatedBookResult.copy.status}
                  </p>
                )}
              </div>
            </div>

            {/* Target Location Right */}
            <div className="md:col-span-6 bg-white/10 rounded-2xl p-3.5 border border-white/15 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-teal-300">Allocated Domain Rack</span>
                <span className="text-xs font-mono font-black text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded border border-amber-400/30">
                  {locatedBookResult.rack.rackCode}
                </span>
              </div>
              <p className="text-sm font-bold text-white">{locatedBookResult.rack.rackName}</p>

              <div className="pt-2 border-t border-white/10 flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-slate-300 block font-medium">Physical Tier:</span>
                  <span className="text-xs font-extrabold text-teal-200 font-poppins">{locatedBookResult.shelf.shelfName}</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedMoveRack(locatedBookResult.rack.rackCode);
                    setSelectedMoveShelf(locatedBookResult.shelf.shelfId);
                    setMovePlacementModal({
                      book: locatedBookResult.book,
                      currentRack: locatedBookResult.rack.rackCode,
                      currentShelf: locatedBookResult.shelf.shelfId,
                    });
                  }}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                >
                  <ArrowRightLeft className="w-3 h-3" /> Move Shelf
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Summary KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {/* Total Copies */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between h-full group">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 truncate" title="Total Copies">
              Total Copies
            </span>
            <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0 group-hover:bg-slate-900 group-hover:text-white transition-colors">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl sm:text-3xl font-black font-poppins text-slate-900 tracking-tight">
              {totalCopies}
            </p>
            <p className="text-[10px] font-bold text-slate-400 mt-0.5">Across catalog</p>
          </div>
        </div>

        {/* Issuable Stock */}
        <div className="bg-white p-4 rounded-2xl border border-emerald-200/80 bg-emerald-50/20 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between h-full group">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-800 truncate" title="Issuable On Shelf">
              Issuable Stock
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <CheckCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl sm:text-3xl font-black font-poppins text-emerald-900 tracking-tight">
              {availableCopies}
            </p>
            <p className="text-[10px] font-bold text-emerald-600 mt-0.5">Available on shelf</p>
          </div>
        </div>

        {/* Reference Only */}
        <div className="bg-white p-4 rounded-2xl border border-rose-200/80 bg-rose-50/20 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between h-full group">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-rose-800 truncate" title="Reference Copies Only">
              Reference Only
            </span>
            <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0 group-hover:bg-rose-600 group-hover:text-white transition-colors">
              <BookmarkCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl sm:text-3xl font-black font-poppins text-rose-900 tracking-tight">
              {referenceCopies}
            </p>
            <p className="text-[10px] font-bold text-rose-700 mt-0.5">Reading room only</p>
          </div>
        </div>

        {/* Active Borrowings */}
        <div className="bg-white p-4 rounded-2xl border border-blue-200/80 bg-blue-50/20 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between h-full group">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-blue-800 truncate" title="Currently Borrowed">
              Active Borrowings
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl sm:text-3xl font-black font-poppins text-blue-900 tracking-tight">
              {issuedCopies}
            </p>
            <p className="text-[10px] font-bold text-blue-600 mt-0.5">Currently issued</p>
          </div>
        </div>

        {/* Damaged Copies */}
        <div className="bg-white p-4 rounded-2xl border border-amber-200/80 bg-amber-50/20 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between h-full group">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-800 truncate" title="Damaged Copies">
              Damaged Copies
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 group-hover:bg-amber-600 group-hover:text-white transition-colors">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl sm:text-3xl font-black font-poppins text-amber-900 tracking-tight">
              {damagedCopies}
            </p>
            <p className="text-[10px] font-bold text-amber-600 mt-0.5">Requires repair</p>
          </div>
        </div>

        {/* Lost Copies */}
        <div className="bg-white p-4 rounded-2xl border border-slate-300/80 bg-slate-100/50 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between h-full group">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-700 truncate" title="Lost Copies">
              Lost Copies
            </span>
            <div className="w-8 h-8 rounded-xl bg-slate-200 text-slate-700 flex items-center justify-center shrink-0 group-hover:bg-slate-800 group-hover:text-white transition-colors">
              <XCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl sm:text-3xl font-black font-poppins text-slate-800 tracking-tight">
              {lostCopies}
            </p>
            <p className="text-[10px] font-bold text-slate-500 mt-0.5">Unaccounted asset</p>
          </div>
        </div>
      </div>

      {/* VIEW MODE 1: RACK & 5-SHELF HIERARCHICAL BARCODES & STACKS VIEW */}
      {viewMode === 'RACK_SHELF' && (
        <div className="space-y-5">
          {/* Sub-toolbar: Academic Degree Filters, Search & Bulk Actions */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col gap-4">
            {/* Row 1: Spacious Search Bar, Rack Dropdown & Scan Button */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 w-full">
              {/* Search Filter */}
              <div className="relative flex-1 min-w-0">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search racks, shelves, books, or codes..."
                  value={rackShelfSearchTerm}
                  onChange={(e) => setRackShelfSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-9 py-2.5 rounded-xl border border-slate-300 bg-white text-xs sm:text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 focus:outline-none shadow-2xs transition-all"
                />
                {rackShelfSearchTerm && (
                  <button
                    onClick={() => setRackShelfSearchTerm('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer rounded-full hover:bg-slate-100"
                    title="Clear search"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Quick Select Rack Dropdown */}
              <div className="relative w-full md:w-auto md:min-w-[250px] shrink-0">
                <select
                  value={academicProgramTab}
                  onChange={(e) => setAcademicProgramTab(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-xs sm:text-sm font-semibold text-slate-700 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 focus:outline-none shadow-2xs cursor-pointer transition-all"
                >
                  <option value="ALL">All Academic Racks ({currentRacks.length})</option>
                  {currentRacks.map((r) => (
                    <option key={r.rackCode} value={r.rackCode}>
                      {r.rackCode} — {r.degreeName} ({r.shelves.length} shelves)
                    </option>
                  ))}
                </select>
              </div>

              {/* Live Scan Button */}
              <button
                type="button"
                onClick={() => setIsRackScannerOpen(true)}
                className="px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer whitespace-nowrap active:scale-95 shrink-0"
                title={`Scan barcode/QR to search within ${dynamicScanScope.scopeDesc}`}
              >
                <ScanBarcode className="w-4 h-4" /> {dynamicScanScope.shortLabel}
              </button>
            </div>

            {/* Row 2: Status Indicator & Management Action Buttons */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-3 border-t border-slate-100">
              <div className="flex flex-wrap items-center gap-2 text-slate-600 font-medium text-xs">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-teal-50 text-teal-800 font-bold border border-teal-200/60 text-[11px]">
                  <Layers className="w-3 h-3 text-teal-600" />
                  Physical Hierarchy Management
                </span>
                <span className="hidden sm:inline text-slate-400">•</span>
                <span className="text-[11px] text-slate-500 font-semibold">
                  Showing {filteredAcademicRacks.length} of {currentRacks.length} Academic Racks & {filteredShelves.length} Shelves
                </span>
                {(academicProgramTab !== 'ALL' || rackShelfSearchTerm.trim() !== '') && (
                  <button
                    type="button"
                    onClick={() => {
                      setAcademicProgramTab('ALL');
                      setRackShelfSearchTerm('');
                    }}
                    className="text-xs font-bold text-teal-600 hover:text-teal-800 cursor-pointer ml-1 underline"
                  >
                    Clear filter (Show all)
                  </button>
                )}
              </div>

              {/* Toolbar Actions: Add Rack/Shelf and Dynamic Print */}
              <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap shrink-0">
                {/* Button 1: Add New Rack OR Add Shelf to Selected Rack */}
                <button
                  type="button"
                  onClick={handleDynamicAddAction}
                  className="px-3.5 py-2 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs transition-all cursor-pointer whitespace-nowrap active:scale-95 shrink-0"
                  title={selectedRack ? `Add a new shelf tier to ${selectedRack.rackCode} (${selectedRack.rackName})` : "Create and configure a new physical domain rack stack"}
                >
                  <Plus className="w-3.5 h-3.5" />
                  {selectedRack ? `Add Shelf to ${selectedRack.rackCode}` : 'Add New Rack'}
                </button>

                {/* Combined Button: Print Rack & Shelf Tags with Dropdown Filter Panel */}
                <div className="relative" ref={printPanelRef}>
                  <button
                    type="button"
                    onClick={() => setIsPrintPanelOpen((prev) => !prev)}
                    className={`px-3.5 py-2 text-xs font-bold rounded-xl flex items-center gap-2 shadow-xs whitespace-nowrap shrink-0 transition-all cursor-pointer active:scale-95 ${
                      isPrintPanelOpen
                        ? 'bg-slate-950 text-teal-300 ring-2 ring-teal-400/50 shadow-md'
                        : 'bg-slate-800 hover:bg-slate-900 text-white'
                    }`}
                    title="Open print options to select rack signs, shelf tags, or both"
                  >
                    <Printer className="w-3.5 h-3.5 text-teal-300" />
                    <span>Print Rack & Shelf Tags</span>
                    <ChevronDown className={`w-3.5 h-3.5 text-slate-300 transition-transform duration-200 ${isPrintPanelOpen ? 'rotate-180 text-teal-300' : ''}`} />
                  </button>

                  {/* Dropdown / Filter Panel */}
                  {isPrintPanelOpen && (
                    <div className="absolute right-0 top-full mt-2 w-[360px] sm:w-[410px] bg-white rounded-3xl border border-slate-200/90 shadow-2xl ring-1 ring-slate-900/5 z-50 p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150 text-slate-800 font-sans">
                      {/* Panel Header */}
                      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 text-white flex items-center justify-center shadow-xs">
                            <Printer className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className="text-xs font-black font-poppins text-slate-900 leading-tight">
                              Print Rack & Shelf Tags
                            </h4>
                            <p className="text-[10px] text-slate-400 font-medium">
                              Configure format & target records
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setIsPrintPanelOpen(false)}
                          className="w-7 h-7 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center cursor-pointer transition-colors"
                          title="Close panel"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      {/* 1. Print Mode / Scope Options */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                          <span>Print Format</span>
                          <span className="text-teal-600 font-bold lowercase">
                            {printScope === 'BOTH' ? 'both signs & tags' : printScope === 'RACKS_ONLY' ? 'rack signs only' : 'shelf tags only'}
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100/90 rounded-2xl border border-slate-200/60">
                          <button
                            type="button"
                            onClick={() => setPrintScope('RACKS_ONLY')}
                            className={`py-2 px-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap ${
                              printScope === 'RACKS_ONLY'
                                ? 'bg-white text-slate-950 shadow-xs ring-1 ring-slate-200/80 font-black'
                                : 'text-slate-500 hover:text-slate-900'
                            }`}
                          >
                            <Printer className="w-3 h-3" />
                            <span>Signs only</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setPrintScope('SHELVES_ONLY')}
                            className={`py-2 px-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap ${
                              printScope === 'SHELVES_ONLY'
                                ? 'bg-white text-indigo-700 shadow-xs ring-1 ring-slate-200/80 font-black'
                                : 'text-slate-500 hover:text-slate-900'
                            }`}
                          >
                            <Tag className="w-3 h-3" />
                            <span>Tags only</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setPrintScope('BOTH')}
                            className={`py-2 px-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap ${
                              printScope === 'BOTH'
                                ? 'bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow-xs font-black'
                                : 'text-slate-500 hover:text-slate-900'
                            }`}
                          >
                            <Layers className="w-3 h-3" />
                            <span>Print Both</span>
                          </button>
                        </div>
                      </div>

                      {/* 2. Target Rack Selection */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                          <span>Target Rack Stack</span>
                          {printRackTarget !== 'ALL' && (
                            <button
                              type="button"
                              onClick={() => {
                                setPrintRackTarget('ALL');
                                setSelectedShelfIds([]);
                              }}
                              className="text-teal-600 hover:text-teal-800 underline cursor-pointer"
                            >
                              Reset to All
                            </button>
                          )}
                        </div>
                        <div className="relative">
                          <select
                            value={printRackTarget}
                            onChange={(e) => {
                              setPrintRackTarget(e.target.value);
                              setSelectedShelfIds([]);
                            }}
                            className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-teal-500 focus:border-teal-500 focus:outline-none cursor-pointer shadow-2xs transition-all"
                          >
                            <option value="ALL">
                              All Racks ({filteredAcademicRacks.length} visible racks)
                            </option>
                            {currentRacks.map((r) => (
                              <option key={`print-opt-${r.rackCode}`} value={r.rackCode}>
                                {r.rackCode} — {r.degreeName} ({r.shelves.length} shelves)
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* 3. Specific Shelves Selection (Only if a specific rack is selected) */}
                      {activeRackForShelfSelection && (
                        <div className="space-y-2 bg-slate-50/90 p-3 rounded-2xl border border-slate-200/80">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                              <Layers className="w-3 h-3 text-teal-600" />
                              Shelves in {activeRackForShelfSelection.rackCode}
                            </span>
                            <div className="flex items-center gap-1.5 text-[10px] font-bold">
                              <button
                                type="button"
                                onClick={() => setSelectedShelfIds([])}
                                className={`px-2 py-0.5 rounded-md cursor-pointer transition-colors ${
                                  selectedShelfIds.length === 0
                                    ? 'bg-teal-100 text-teal-800'
                                    : 'text-slate-500 hover:bg-slate-200/60'
                                }`}
                              >
                                All ({activeRackForShelfSelection.shelvesData.length})
                              </button>
                              <span className="text-slate-300">•</span>
                              <button
                                type="button"
                                onClick={() =>
                                  setSelectedShelfIds(
                                    selectedShelfIds.length === activeRackForShelfSelection.shelvesData.length
                                      ? []
                                      : activeRackForShelfSelection.shelvesData.map((s) => s.shelfId)
                                  )
                                }
                                className="px-2 py-0.5 rounded-md text-slate-500 hover:bg-slate-200/60 cursor-pointer"
                              >
                                {selectedShelfIds.length === activeRackForShelfSelection.shelvesData.length ? 'Clear' : 'Custom'}
                              </button>
                            </div>
                          </div>

                          <div className="max-h-32 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                            {activeRackForShelfSelection.shelvesData.map((s) => {
                              const isSelected = selectedShelfIds.length === 0 || selectedShelfIds.includes(s.shelfId);
                              return (
                                <label
                                  key={`shelf-chk-${s.shelfId}`}
                                  className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-[11px] cursor-pointer transition-all ${
                                    isSelected
                                      ? 'bg-white text-slate-900 font-bold border border-slate-200/90 shadow-2xs'
                                      : 'text-slate-400 hover:bg-white/60'
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={(e) => {
                                      if (selectedShelfIds.length === 0) {
                                        const allIds = activeRackForShelfSelection.shelvesData.map((sh) => sh.shelfId);
                                        setSelectedShelfIds(allIds.filter((id) => id !== s.shelfId));
                                      } else if (e.target.checked) {
                                        const updated = [...selectedShelfIds, s.shelfId];
                                        if (updated.length === activeRackForShelfSelection.shelvesData.length) {
                                          setSelectedShelfIds([]);
                                        } else {
                                          setSelectedShelfIds(updated);
                                        }
                                      } else {
                                        setSelectedShelfIds(selectedShelfIds.filter((id) => id !== s.shelfId));
                                      }
                                    }}
                                    className="rounded text-teal-600 focus:ring-teal-500 w-3.5 h-3.5 cursor-pointer accent-teal-600"
                                  />
                                  <span className="font-mono text-[10px] font-black px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200/60">
                                    {s.shelfId}
                                  </span>
                                  <span className="truncate text-slate-700 font-medium">{s.shelfName}</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* 4. Live Dynamic Counts & Print Action */}
                      <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs font-black text-slate-900 font-poppins flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                            {totalPrintCount} Total Item{totalPrintCount === 1 ? '' : 's'}
                          </span>
                          <span className="text-[10px] font-semibold text-slate-400 truncate">
                            {printScope === 'BOTH'
                              ? `${rackSignsCount} Sign${rackSignsCount === 1 ? '' : 's'} • ${shelfTagsCount} Shelf Tag${shelfTagsCount === 1 ? '' : 's'}`
                              : printScope === 'RACKS_ONLY'
                              ? `${rackSignsCount} Rack Sign${rackSignsCount === 1 ? '' : 's'}`
                              : `${shelfTagsCount} Shelf Tag${shelfTagsCount === 1 ? '' : 's'}`}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => setIsPrintPanelOpen(false)}
                            className="px-3 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl cursor-pointer transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            disabled={totalPrintCount === 0}
                            onClick={handleExecutePrintFromPanel}
                            className={`px-4 py-2 text-xs font-black rounded-xl flex items-center gap-2 shadow-xs transition-all whitespace-nowrap active:scale-95 ${
                              totalPrintCount === 0
                                ? 'bg-teal-600/40 text-white/60 opacity-60 cursor-not-allowed'
                                : 'bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white cursor-pointer shadow-teal-600/20 shadow-md'
                            }`}
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span>Print ({totalPrintCount})</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Academic Racks List with Shelves Per Rack */}
          <div className="space-y-6">
            {filteredAcademicRacks.length === 0 ? (
              <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 shadow-sm space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
                  <Search className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-slate-800">No matching racks or shelves found</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  No physical racks, shelves, or books match your current filter ({rackShelfSearchTerm || academicProgramTab}).
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setAcademicProgramTab('ALL');
                    setRackShelfSearchTerm('');
                  }}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer inline-flex items-center gap-2"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Reset Filters
                </button>
              </div>
            ) : (
              filteredAcademicRacks.map((rack, rIdx) => {
                const isRackHighlighted = highlightedRackCode === rack.rackCode;
                // Shelves are strictly collapsed by default and ONLY open when explicitly clicked by a permitted user
                const isExpanded = !!expandedRackCodes[rack.rackCode];

                return (
                  <div
                    key={`acad-rack-${rIdx}`}
                    id={`rack-card-${rack.rackCode}`}
                    className={`bg-white rounded-3xl border-2 shadow-sm overflow-hidden transition-all ${isRackHighlighted
                        ? 'border-teal-500 ring-4 ring-teal-500/20 shadow-xl'
                        : 'border-slate-200/90 hover:border-teal-300'
                      }`}
                  >
                    {/* Rack Banner Header */}
                    <div className="p-5 bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 text-white flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                      <div className="space-y-1.5 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`px-2.5 py-1 rounded-lg text-xs font-black uppercase tracking-wider text-white shadow-xs ${rack.program.includes('Tech') ? 'bg-blue-600' : rack.program.includes('Sc') ? 'bg-purple-600' : rack.program.includes('MBA') || rack.program.includes('BBA') ? 'bg-amber-600' : rack.program.includes('Medical') || rack.program.includes('Nursing') || rack.program.includes('Pharmacy') ? 'bg-rose-600' : 'bg-emerald-600'
                              }`}
                          >
                            {rack.program}
                          </span>
                          <span className="font-mono font-black text-xs px-2.5 py-1 rounded-lg bg-teal-500/20 text-teal-300 border border-teal-400/30">
                            {rack.rackCode}
                          </span>
                          <span className="text-xs font-bold text-slate-300 bg-white/10 px-2.5 py-1 rounded-lg border border-white/10">
                            Domain: {rack.domain} • Code: {rack.shortCode}
                          </span>
                        </div>
                        <h3 className="text-lg sm:text-xl font-bold font-poppins text-white pt-0.5">
                          {rack.rackName}
                        </h3>
                        <p className="text-xs text-slate-300 max-w-3xl leading-relaxed">
                          {rack.description}
                        </p>
                      </div>

                      {/* Top Rack Stats & Action Buttons (including Edit Rack & Dropdown Button) */}
                      <div className="flex items-center gap-2.5 shrink-0 flex-wrap self-stretch sm:self-auto">
                        <div className="px-4 py-2 rounded-2xl bg-white/10 border border-white/15 text-center">
                          <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider block">Domain Inventory</span>
                          <span className="text-sm font-black text-teal-300 font-poppins">
                            {rack.books.length} Books • {rack.totalCopies} Copies
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setSearchTerm(rack.rackCode);
                            setViewMode('BOOK_WISE');
                            triggerToast(`Switched to Book-Wise view for ${rack.rackName}`);
                          }}
                          className="px-3 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-sm cursor-pointer whitespace-nowrap"
                          title="Filter book-wise view for all books located in this rack"
                        >
                          <BookOpen className="w-3.5 h-3.5 shrink-0" /> Books
                        </button>

                        <button
                          type="button"
                          onClick={() => handlePrintSingleRackPlacard(rack)}
                          className="px-3 py-2 bg-white/15 hover:bg-white/25 text-white border border-white/20 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap"
                          title="Print physical placard for this rack stack"
                        >
                          <Printer className="w-3.5 h-3.5 text-teal-300 shrink-0" /> Sign
                        </button>

                        {/* Edit Rack Button */}
                        <button
                          type="button"
                          onClick={() =>
                            setRackFormModal({
                              mode: 'EDIT',
                              rackCode: rack.rackCode,
                              program: rack.program as any,
                              rackName: rack.rackName,
                              department: rack.department,
                              domain: rack.domain,
                              shortCode: rack.shortCode,
                              description: rack.description,
                              colorTheme: rack.colorTheme || 'from-blue-600 to-indigo-700',
                            })
                          }
                          className="px-3 py-2 bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-slate-950 border border-amber-400/40 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap"
                          title={`Edit details for ${rack.rackCode}`}
                        >
                          <Pencil className="w-3.5 h-3.5" /> Edit Rack
                        </button>

                        {/* Delete Rack Button (if > 1 rack exists) */}
                        {academicRackInventories.length > 1 && (
                          <button
                            type="button"
                            onClick={() =>
                              setDeleteConfirmModal({
                                type: 'RACK',
                                rackCode: rack.rackCode,
                                rackName: rack.rackName,
                              })
                            }
                            className="p-2 bg-rose-500/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-400/30 text-xs font-bold rounded-xl transition-all cursor-pointer shadow-xs"
                            title={`Delete rack ${rack.rackCode}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Drop Down / Accordion Toggle Button */}
                        <button
                          type="button"
                          onClick={(e) => toggleRackExpanded(rack.rackCode, e)}
                          className={`px-4 py-2 text-xs font-black rounded-xl flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap shadow-sm active:scale-95 ${
                            !hasShelfViewPermission
                              ? 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                              : isExpanded
                              ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 ring-2 ring-amber-400/40'
                              : 'bg-emerald-400 hover:bg-emerald-300 text-slate-950 ring-2 ring-emerald-400/30'
                          }`}
                          title={
                            !hasShelfViewPermission
                              ? 'Permission Required: Admin/Librarian access needed to view shelves'
                              : isExpanded
                              ? 'Hide physical shelves'
                              : `Drop down and view ${rack.shelvesData.length} physical shelves`
                          }
                        >
                          {!hasShelfViewPermission ? (
                            <Lock className="w-3.5 h-3.5 text-amber-400" />
                          ) : (
                            <Layers className="w-3.5 h-3.5" />
                          )}
                          <span>
                            {!hasShelfViewPermission
                              ? `View ${rack.shelvesData.length} Shelves (Locked)`
                              : isExpanded
                              ? 'Hide Shelves'
                              : `View ${rack.shelvesData.length} Shelves`}
                          </span>
                          {hasShelfViewPermission && (
                            <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${isExpanded ? 'rotate-180' : 'rotate-0'}`} />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* COLLAPSED SHELF COMPACT PREVIEW BAR */}
                    {!isExpanded && (
                      <div
                        onClick={(e) => toggleRackExpanded(rack.rackCode, e)}
                        className="p-4 bg-slate-50 hover:bg-teal-50/50 cursor-pointer transition-colors border-t border-slate-200/80 flex flex-col md:flex-row md:items-center justify-between gap-3 group"
                        title={
                          !hasShelfViewPermission
                            ? 'Admin or Librarian permission is required to view shelf layout'
                            : `Click to expand and view ${rack.shelvesData.length} shelf tiers`
                        }
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-extrabold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                            <Layers className="w-3.5 h-3.5 text-teal-600" />
                            {rack.shelvesData.length} Shelves:
                          </span>
                          {rack.shelvesData.map((s, sIdx) => (
                            <span
                              key={`prev-shelf-${sIdx}`}
                              className="text-[11px] font-mono font-bold px-2.5 py-1 rounded-xl bg-white border border-slate-200 text-slate-700 shadow-2xs group-hover:border-teal-300 group-hover:bg-white"
                            >
                              <strong className="text-indigo-700">{s.shelfId}</strong>: {s.shelfName.replace(/Tier \d+ - /, '').replace(/Tier \d+: /, '')}{' '}
                              <span className="text-[10px] font-sans font-extrabold text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded-md border border-teal-200/60 ml-1">
                                {s.books.length} bks ({s.totalCopies} cpy)
                              </span>
                            </span>
                          ))}
                        </div>
                        <span className="text-[11px] font-bold text-teal-700 group-hover:underline flex items-center gap-1 shrink-0">
                          {!hasShelfViewPermission ? (
                            <>
                              <Lock className="w-3.5 h-3.5 text-amber-500" /> Permission Required
                            </>
                          ) : (
                            <>
                              Click to View Shelves <ChevronDown className="w-3.5 h-3.5" />
                            </>
                          )}
                        </span>
                      </div>
                    )}

                    {/* SHELF CABINET GRAPHICAL LAYOUT (EXPANDED DROPDOWN) */}
                    {isExpanded && (
                      <div className="p-5 bg-slate-50/80 space-y-3.5 animate-fadeIn border-t border-slate-200">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-1 border-b border-slate-200/60">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                              <Layers className="w-4 h-4 text-teal-600" />
                              Physical Shelf Stacks ({rack.shortCode})
                            </span>
                            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 border border-teal-200">
                              {rack.shelvesData.length} Shelves Configured
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-[11px] font-bold text-slate-500">
                              Capacity: {rack.totalCopies} / {rack.shelvesData.length * 50} Copies Allocated ({Math.min(100, Math.round((rack.totalCopies / (rack.shelvesData.length * 50 || 1)) * 100))}% filled)
                            </span>
                          </div>
                        </div>

                        {/* Shelves Rendered as Tier 1 to Tier N */}
                        <div className="grid grid-cols-1 gap-3">
                          {rack.shelvesData.map((shelf, sIdx) => {
                            const isShelfHighlighted = isRackHighlighted && highlightedShelfId === shelf.shelfId;
                            const physicalTiers = calculatePhysicalShelves(shelf.totalCopies || 50);

                            return (
                              <div
                                key={`shelf-tier-${sIdx}`}
                                className={`rounded-2xl border p-4 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${isShelfHighlighted
                                    ? 'bg-teal-50 border-teal-500 shadow-md ring-2 ring-teal-500/20'
                                    : 'bg-white border-slate-200 shadow-2xs hover:border-teal-300 hover:shadow-xs'
                                  }`}
                              >
                                {/* Shelf Identification & Focus */}
                                <div className="space-y-1.5 min-w-0 flex-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span
                                      className={`text-xs font-black px-2.5 py-0.5 rounded-lg font-mono ${isShelfHighlighted ? 'bg-teal-600 text-white' : 'bg-indigo-50 text-indigo-700 border border-indigo-200/60'
                                        }`}
                                    >
                                      SHELF-{shelf.shelfNumber} ({shelf.shelfId})
                                    </span>
                                    <span className="text-xs sm:text-sm font-bold text-slate-900 font-poppins">
                                      {shelf.shelfName}
                                    </span>
                                  </div>
                                  <p className="text-[11px] font-semibold text-slate-500">
                                    Specialization / Focus: <span className="text-slate-800 font-medium">{shelf.focus}</span>
                                  </p>

                                  {/* Dynamic Physical Shelf Tiers (50 Copies/Physical Shelf Capacity) */}
                                  <div className="pt-1 flex flex-wrap items-center gap-1.5">
                                    <span className="text-[10px] font-black uppercase tracking-wider text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                                      Physical Shelf / Tier:
                                    </span>
                                    {physicalTiers.map((ps) => (
                                      <span
                                        key={ps.physicalShelfId}
                                        className="inline-flex items-center gap-1 text-[10px] font-mono font-black px-2 py-0.5 rounded-lg bg-slate-100 text-slate-800 border border-slate-200 shadow-2xs"
                                        title={`${ps.name} — Max Capacity 50 Copies`}
                                      >
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                        <strong>{ps.physicalShelfId}</strong> (Range {ps.startCopy}–{ps.endCopy})
                                      </span>
                                    ))}
                                    <span className="text-[10px] font-mono text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md font-bold">
                                      Unique Location Code: {generateLocationCode(rack.rackCode, shelf.shelfId, 1, 1, 1)}
                                    </span>
                                  </div>

                                  {/* Books on this Shelf List */}
                                  <div className="pt-1.5">
                                    {shelf.books.length > 0 ? (
                                      <div className="flex flex-wrap items-center gap-2">
                                        {shelf.books.map((b, bIdx) => {
                                          const isBookMatched = highlightedBookId === b.id;

                                          return (
                                            <div
                                              key={`sb-${bIdx}`}
                                              className={`group relative inline-flex items-center gap-2.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all shadow-2xs ${isBookMatched
                                                  ? 'bg-amber-100 border-2 border-amber-500 text-slate-950 font-bold shadow-md'
                                                  : 'bg-slate-50 hover:bg-teal-50/80 border border-slate-200 text-slate-800'
                                                }`}
                                            >
                                              <BookOpen className={`w-3.5 h-3.5 shrink-0 ${isBookMatched ? 'text-amber-700' : 'text-teal-600'}`} />
                                              <div className="flex flex-col min-w-0">
                                                <span className="font-bold text-slate-900 truncate max-w-[240px]" title={b.title}>
                                                  {b.title}
                                                </span>
                                                <span className="text-[10px] text-slate-500 truncate max-w-[200px]">
                                                  {b.authorName}
                                                </span>
                                              </div>
                                              <span
                                                className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-md shrink-0 ${b.availableCopies > 0
                                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                                    : 'bg-rose-100 text-rose-800 border border-rose-200'
                                                  }`}
                                              >
                                                {b.availableCopies}/{b.totalCopies} Avail
                                              </span>

                                              {/* Quick Move Button */}
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  setSelectedMoveRack(rack.rackCode);
                                                  setSelectedMoveShelf(shelf.shelfId);
                                                  setMovePlacementModal({
                                                    book: b,
                                                    currentRack: rack.rackCode,
                                                    currentShelf: shelf.shelfId,
                                                  });
                                                }}
                                                className="ml-1 px-2 py-1 rounded-lg bg-white hover:bg-indigo-600 hover:text-white text-indigo-600 border border-indigo-200 text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer shadow-2xs shrink-0"
                                                title={`Move or transfer "${b.title}" to another shelf or rack`}
                                              >
                                                <ArrowRightLeft className="w-2.5 h-2.5" /> Move
                                              </button>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    ) : (
                                      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50/80 border border-emerald-200 text-emerald-800 text-xs font-semibold shadow-2xs">
                                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                        <span>Empty Shelf • Ready for Book Allocation</span>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Shelf Action Buttons & Counts */}
                                <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                                  <span className="text-xs font-bold text-slate-700 bg-slate-100 border border-slate-200 px-2.5 py-1.5 rounded-xl font-mono">
                                    {shelf.books.length} Books • {shelf.totalCopies}/{shelf.maxCapacity || 50} Copies
                                  </span>

                                  <button
                                    type="button"
                                    onClick={() => handlePrintSingleShelfTag(rack, shelf)}
                                    className="px-3 py-1.5 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-300 text-slate-700 border border-slate-200 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs whitespace-nowrap"
                                    title={`Print physical sticker strip for ${shelf.shelfId}`}
                                  >
                                    <Printer className="w-3.5 h-3.5 text-indigo-600" /> Print Tag
                                  </button>

                                  {/* Edit Shelf Button */}
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setShelfFormModal({
                                        mode: 'EDIT',
                                        rackCode: rack.rackCode,
                                        rackName: rack.rackName,
                                        shelfId: shelf.shelfId,
                                        shelfNumber: shelf.shelfNumber,
                                        shelfName: shelf.shelfName,
                                        focus: shelf.focus,
                                        maxCapacity: shelf.maxCapacity || 50,
                                      })
                                    }
                                    className="px-2.5 py-1.5 bg-slate-100 hover:bg-amber-50 hover:text-amber-800 hover:border-amber-300 text-slate-700 border border-slate-200 text-xs font-bold rounded-xl flex items-center gap-1 transition-all cursor-pointer shadow-2xs whitespace-nowrap"
                                    title={`Edit shelf name and focus for ${shelf.shelfId}`}
                                  >
                                    <Pencil className="w-3 h-3 text-amber-600" /> Edit
                                  </button>

                                  {/* Delete Shelf Button (if > 1 shelf exists) */}
                                  {rack.shelvesData.length > 1 && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setDeleteConfirmModal({
                                          type: 'SHELF',
                                          rackCode: rack.rackCode,
                                          rackName: rack.rackName,
                                          shelfId: shelf.shelfId,
                                          shelfName: shelf.shelfName,
                                        })
                                      }
                                      className="p-1.5 bg-slate-100 hover:bg-rose-100 text-slate-500 hover:text-rose-700 border border-slate-200 hover:border-rose-300 rounded-xl transition-all cursor-pointer shadow-2xs"
                                      title={`Delete shelf ${shelf.shelfId}`}
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Add Shelf Tier Bottom Action */}
                        <div className="pt-2 flex items-center justify-between border-t border-slate-200/80">
                          <button
                            type="button"
                            onClick={() =>
                              setShelfFormModal({
                                mode: 'ADD',
                                rackCode: rack.rackCode,
                                rackName: rack.rackName,
                                shelfId: `SHELF-${rack.shelvesData.length + 1}`,
                                shelfNumber: rack.shelvesData.length + 1,
                                shelfName: `Tier ${rack.shelvesData.length + 1}: `,
                                focus: '',
                                maxCapacity: 40,
                              })
                            }
                            className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                            title={`Add a new shelf tier under ${rack.rackName}`}
                          >
                            <Plus className="w-3.5 h-3.5" /> Add Shelf Tier to {rack.shortCode}
                          </button>

                          <span className="text-[11px] font-medium text-slate-400">
                            {rack.shelvesData.length} physical tiers configured
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* VIEW MODE 2: BOOK-WISE GROUPED INVENTORY VIEW */}
      {viewMode === 'BOOK_WISE' && (
        <div className="space-y-4">
          {/* Search Book-Wise Inventory Card */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-3">
            {/* Top Label Row */}
            <div className="flex items-center justify-between">
              <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                Search Book-Wise Inventory:
              </label>
              <span className="text-[11px] font-semibold text-slate-400">
                Showing <strong className="text-slate-700">{filteredBooks.length}</strong> of <strong className="text-slate-700">{state.books.length}</strong> Titles
              </span>
            </div>

            {/* Side-by-Side Controls Row: Search Input + Scan Button + Export Button */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 w-full">
              {/* 1. Search Bar with Book Select dropdown */}
              <div className="relative flex-1 min-w-0" ref={bookSelectRef}>
                <div
                  className={`w-full px-4 py-2.5 rounded-xl border bg-white flex items-center justify-between gap-3 transition-all shadow-2xs ${
                    isBookSelectOpen ? 'border-indigo-500 ring-2 ring-indigo-500/20' : 'border-slate-300 hover:border-indigo-400'
                  }`}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Search className="h-4 w-4 text-indigo-600 shrink-0" />
                    <input
                      type="text"
                      placeholder={
                        selectedBook
                          ? `Filter: ${selectedBook.title} (ISBN: ${selectedBook.isbn}) — Type to search...`
                          : `Search by Book Title, ISBN, Author, Subject, Rack, or Shelf...`
                      }
                      value={searchTerm}
                      onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setBookSelectSearchTerm(e.target.value);
                      }}
                      onFocus={() => setIsBookSelectOpen(true)}
                      className="w-full text-xs sm:text-sm font-semibold text-slate-900 bg-transparent outline-none placeholder:text-slate-400"
                    />
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {(selectedBookId !== 'ALL' || searchTerm) && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedBookId('ALL');
                          setSearchTerm('');
                          setBookSelectSearchTerm('');
                        }}
                        className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
                        title="Reset all filters"
                      >
                        <X className="h-3 w-3" /> Clear
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setIsBookSelectOpen(!isBookSelectOpen)}
                      className="p-1 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-indigo-50 transition-colors cursor-pointer"
                      title="Select Book Catalog Record"
                    >
                      <ChevronDown
                        className={`h-4 w-4 transition-transform duration-200 ${
                          isBookSelectOpen ? 'rotate-180 text-indigo-600' : ''
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* Dropdown Options */}
                {isBookSelectOpen && (
                  <div className="absolute left-0 right-0 top-full mt-1.5 bg-white rounded-2xl shadow-xl border border-slate-200 z-30 max-h-64 overflow-y-auto divide-y divide-slate-100 animate-fadeIn">
                    {filteredBookOptions.length > 0 ? (
                      filteredBookOptions.map((b) => {
                        const isSelected = selectedBookId === b.id;
                        return (
                          <div
                            key={b.id}
                            onClick={() => {
                              setSelectedBookId(b.id);
                              setIsBookSelectOpen(false);
                            }}
                            className={`p-3.5 cursor-pointer flex items-center justify-between transition-colors ${
                              isSelected ? 'bg-indigo-50/80 text-indigo-900 font-semibold' : 'hover:bg-slate-50 text-slate-800'
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <img
                                src={b.coverUrl}
                                alt={b.title}
                                className="w-8 h-10 object-cover rounded border border-indigo-100 shrink-0 shadow-xs"
                              />
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-bold text-slate-900 truncate">{b.title}</span>
                                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 shrink-0">
                                    ISBN: {b.isbn}
                                  </span>
                                </div>
                                <div className="text-[11px] text-slate-500 truncate mt-0.5">
                                  by {b.authorName} &bull; <span className="font-semibold text-emerald-700">{b.availableCopies}/{b.totalCopies} Available</span>
                                </div>
                              </div>
                            </div>
                            {isSelected && <CheckCircle2 className="h-4 w-4 text-indigo-600 shrink-0 ml-2" />}
                          </div>
                        );
                      })
                    ) : (
                      <div className="p-4 text-center text-xs text-slate-400">
                        No books found matching &quot;{bookSelectSearchTerm}&quot;
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 2. Live Scan Button */}
              <button
                type="button"
                onClick={() => setIsRackScannerOpen(true)}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-teal-600 hover:from-indigo-700 hover:to-teal-700 text-white font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs active:scale-95 whitespace-nowrap shrink-0"
                title={`Scan barcode or ISBN within ${dynamicScanScope.scopeDesc}`}
              >
                <ScanBarcode className="w-4 h-4 shrink-0" />
                <span>{dynamicScanScope.shortLabel}</span>
              </button>

              {/* 3. Export Excel Button */}
              <button
                type="button"
                onClick={handleDirectExportCSV}
                className="px-4 py-2.5 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-200/80 hover:bg-indigo-100 font-bold text-xs sm:text-sm transition-colors flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 shrink-0 whitespace-nowrap"
                title="Export catalog inventory to Excel (.xlsx)"
              >
                <Download className="h-4 w-4 text-indigo-600 shrink-0" />
                <span>Export Excel</span>
              </button>
            </div>
          </div>

          {filteredBooks.map((book) => {
            const copiesList = book.copies || [];
            const isRefBook = book.isReferenceOnly || book.collectionType === 'REFERENCE';
            const availCount = copiesList.filter((c) => c.status === 'AVAILABLE').length;
            const isIssuedCount = copiesList.filter((c) => c.status === 'ISSUED').length;
            const isDamagedCount = copiesList.filter((c) => c.condition === 'DAMAGED').length;
            const isLostCount = copiesList.filter((c) => c.condition === 'LOST').length;
            const isExpanded = expandedBookId === book.id || filteredBooks.length === 1;
            const isBookHighlighted = highlightedBookId === book.id;
            const norm = normalizeRackAndShelf(book.rackNumber, book.shelfNumber, book.department || book.categoryName, book.title);

            return (
              <div
                key={book.id}
                id={`book-card-${book.id}`}
                className={`bg-white rounded-3xl border shadow-sm overflow-hidden transition-all ${
                  isBookHighlighted ? 'border-indigo-500 ring-4 ring-indigo-500/20 shadow-lg' : 'border-slate-200'
                }`}
              >
                {/* Book Header Card */}
                <div className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-50/40">
                  <div className="flex items-start gap-4 min-w-0 flex-1">
                    <img
                      src={book.coverUrl}
                      alt={book.title}
                      className="w-14 h-20 object-cover rounded-xl border border-slate-200 shadow-xs shrink-0"
                    />
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-md bg-purple-100 text-purple-800 text-[10px] font-mono font-bold">
                          ISBN: {book.isbn}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-semibold">
                          {book.categoryName}
                        </span>
                        {isRefBook && (
                          <span className="px-2.5 py-0.5 rounded-md bg-rose-100 text-rose-800 border border-rose-200 text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1">
                            🚫 REFERENCE BOOK (NON-ISSUABLE)
                          </span>
                        )}
                      </div>
                      <h3 className="text-base font-bold font-poppins text-slate-900 line-clamp-1">{book.title}</h3>
                      <p className="text-xs text-slate-600">
                        <span className="font-semibold text-slate-700">Author:</span> {book.authorName} &bull; <span className="font-semibold text-slate-700">Publisher:</span> {book.publisherName} ({book.publishingYear})
                      </p>
                      <p className="text-xs text-slate-500 flex items-center gap-1.5 pt-0.5">
                        <MapPin className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                        <span>
                          {norm.rackCode} ({norm.domain}) &bull; Shelf {norm.shelfCode}
                        </span>
                      </p>
                    </div>
                  </div>

                  {/* Stock Metrics and Expand Accordion */}
                  <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="px-2.5 py-1 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold">
                        {availCount} Available
                      </span>
                      <span className="px-2.5 py-1 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 font-bold">
                        {isIssuedCount} Issued
                      </span>
                      {(isDamagedCount > 0 || isLostCount > 0) && (
                        <span className="px-2.5 py-1 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 font-bold">
                          {isDamagedCount + isLostCount} Flagged
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => toggleExpandBook(book.id)}
                      className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 cursor-pointer"
                      title={isExpanded ? 'Collapse copies' : 'View copies'}
                    >
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Expanded Copies Drawer for Selected Book */}
                {isExpanded && (
                  <div className="p-5 border-t border-slate-200 bg-white space-y-3 animate-fadeIn">
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Physical Item Copies ({copiesList.length})
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {copiesList.map((copy) => (
                        <div
                          key={copy.id}
                          className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:shadow-sm transition-all space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                              {copy.accessionNo}
                            </span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                                copy.isReferenceOnly
                                  ? 'bg-rose-100 text-rose-800'
                                  : copy.status === 'AVAILABLE'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : copy.status === 'ISSUED'
                                      ? 'bg-blue-100 text-blue-800'
                                      : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {copy.isReferenceOnly ? 'Reference' : copy.status}
                            </span>
                          </div>

                          <div className="text-xs space-y-1 text-slate-600">
                            <p className="flex items-center justify-between">
                              <span className="text-slate-400">Barcode:</span>
                              <span className="font-mono text-[11px] text-slate-700">{copy.barcode}</span>
                            </p>
                            <p className="flex items-center justify-between">
                              <span className="text-slate-400">Condition:</span>
                              <span className="font-semibold text-slate-700">{copy.condition}</span>
                            </p>
                            <p className="flex items-center justify-between">
                              <span className="text-slate-400">Location:</span>
                              <span className="font-mono text-[11px] text-slate-700">
                                {copy.rackNumber || norm.rackCode} / {copy.shelfNumber || norm.shelfCode}
                              </span>
                            </p>
                          </div>

                          <div className="pt-2 border-t border-slate-200/60 flex items-center justify-end">
                            <button
                              type="button"
                              onClick={() => setSelectedCopy(copy)}
                              className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-[11px] font-bold text-slate-700 hover:bg-slate-100 cursor-pointer shadow-2xs"
                            >
                              Update Item
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {filteredBooks.length === 0 && (
            <div className="py-16 text-center text-slate-500 bg-white rounded-3xl border border-slate-200">
              <p className="text-base font-bold text-slate-700">No Catalog Books Found</p>
              <p className="text-xs text-slate-500 mt-1">No book inventory records match your search query or filter selection.</p>
            </div>
          )}
        </div>
      )}

      {/* VIEW MODE 3: ALL COPIES FLAT LIST VIEW */}
      {viewMode === 'ALL_COPIES' && (
        <div className="space-y-4">
          {/* Search Accession Copies & Filter Inventory Card */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-3">
            {/* Top Label Row */}
            <div className="flex items-center justify-between">
              <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                Search Accession Copies:
              </label>
              <span className="text-[11px] font-semibold text-slate-400">
                Showing <strong className="text-slate-700">{filteredCopies.length}</strong> of <strong className="text-slate-700">{allCopies.length}</strong> Copies
              </span>
            </div>

            {/* Side-by-Side Controls Row: Search Input + Condition Dropdown + Scan Button + Export Button */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 w-full">
              {/* 1. Search Bar */}
              <div className="relative flex-1 min-w-0">
                <Search className="w-4 h-4 text-indigo-600 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search by Accession Number, Copy Barcode, Book Title, ISBN, Rack, or Shelf..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-9 py-2.5 rounded-xl border border-slate-300 bg-white text-xs sm:text-sm font-semibold text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none shadow-2xs transition-all"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer rounded-full hover:bg-slate-100"
                    title="Clear search"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* 2. Condition Dropdown */}
              <div className="relative shrink-0">
                <select
                  value={filterCondition}
                  onChange={(e) => setFilterCondition(e.target.value)}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-xs sm:text-sm font-semibold text-slate-700 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none shadow-2xs cursor-pointer transition-all"
                >
                  <option value="ALL">All Conditions ({allCopies.length})</option>
                  <option value="REFERENCE">
                    Reference Copies Only ({allCopies.filter((c) => c.isReferenceOnly || c.collectionType === 'REFERENCE').length})
                  </option>
                  <option value="NEW">
                    New Condition ({allCopies.filter((c) => c.condition === 'NEW').length})
                  </option>
                  <option value="GOOD">
                    Good Condition ({allCopies.filter((c) => c.condition === 'GOOD').length})
                  </option>
                  <option value="DAMAGED">
                    Damaged ({allCopies.filter((c) => c.condition === 'DAMAGED').length})
                  </option>
                  <option value="LOST">
                    Lost ({allCopies.filter((c) => c.condition === 'LOST').length})
                  </option>
                </select>
              </div>

              {/* 3. Live Scan Action Button */}
              <button
                type="button"
                onClick={() => setIsRackScannerOpen(true)}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-teal-600 hover:from-indigo-700 hover:to-teal-700 text-white font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs active:scale-95 whitespace-nowrap shrink-0"
                title={`Scan copy barcode or accession number within ${dynamicScanScope.scopeDesc}`}
              >
                <ScanBarcode className="w-4 h-4 shrink-0" />
                <span>{dynamicScanScope.shortLabel}</span>
              </button>

              {/* 4. Export Excel Button */}
              <button
                type="button"
                onClick={handleDirectExportCSV}
                className="px-4 py-2.5 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-200/80 hover:bg-indigo-100 font-bold text-xs sm:text-sm transition-colors flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 shrink-0 whitespace-nowrap"
                title="Export accession copies to Excel (.xlsx)"
              >
                <Download className="h-4 w-4 text-indigo-600 shrink-0" />
                <span>Export Excel</span>
              </button>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="py-3.5 px-4">Accession & Barcode</th>
                    <th className="py-3.5 px-4">Book Title & ISBN</th>
                    <th className="py-3.5 px-4">Physical Location</th>
                    <th className="py-3.5 px-4">Availability Status</th>
                    <th className="py-3.5 px-4">Physical Condition</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {filteredCopies.map((copy) => (
                    <tr key={copy.id} id={`copy-row-${copy.id}`} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-4 px-4 font-mono">
                        <span className="font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded text-xs block w-fit">{copy.accessionNo}</span>
                        <span className="text-xs text-slate-500 block mt-0.5">{copy.barcode}</span>
                      </td>
                      <td className="py-4 px-4">
                        <span className="font-semibold text-slate-900 line-clamp-1">{copy.bookTitle}</span>
                        <span className="text-xs text-slate-500 font-mono">ISBN: {copy.isbn}</span>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-1.5 text-xs text-slate-700 font-medium">
                          <MapPin className="h-3.5 w-3.5 text-rose-500" />
                          <span className="font-mono">
                            {copy.rackNumber || 'R01'} / {copy.shelfNumber || 'S01'}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="space-y-1">
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold uppercase ${copy.isReferenceOnly
                                ? 'bg-rose-100 text-rose-800 border border-rose-300'
                                : copy.status === 'AVAILABLE'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : copy.status === 'ISSUED'
                                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                              }`}
                          >
                            {copy.isReferenceOnly ? '🚫 REF COPY' : copy.status}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${copy.condition === 'NEW'
                              ? 'bg-cyan-100 text-cyan-800'
                              : copy.condition === 'GOOD'
                                ? 'bg-slate-200 text-slate-800'
                                : copy.condition === 'DAMAGED'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-rose-100 text-rose-800'
                            }`}
                        >
                          {copy.condition}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <button
                          onClick={() => setSelectedCopy(copy)}
                          className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-700 transition-all cursor-pointer"
                        >
                          Update Item
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredCopies.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-500 font-medium">
                        No accession copies match your search or condition filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Edit Copy Condition Modal */}
      {selectedCopy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 space-y-4 border border-slate-200">
            <h2 className="text-lg font-bold font-poppins text-slate-900">Update Accession Item Condition</h2>
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-xs space-y-1">
              <p className="font-bold text-slate-900">{selectedCopy.accessionNo}</p>
              <p className="text-slate-600 font-mono">Barcode: {selectedCopy.barcode}</p>
            </div>

            <div className="space-y-3 text-sm">
              <div>
                <label className="block font-bold text-slate-700 text-xs mb-1">Physical Copy Condition</label>
                <select
                  id="modalConditionSelect"
                  defaultValue={selectedCopy.condition}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold"
                >
                  <option value="NEW">New Condition</option>
                  <option value="GOOD">Good Condition</option>
                  <option value="DAMAGED">Damaged (Needs Maintenance)</option>
                  <option value="LOST">Lost Item</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
              <button onClick={() => setSelectedCopy(null)} className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold cursor-pointer">
                Cancel
              </button>
              <button
                onClick={() => {
                  const select = document.getElementById('modalConditionSelect') as HTMLSelectElement;
                  handleUpdateCondition(selectedCopy.id, select.value as CopyCondition);
                }}
                className="px-5 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold shadow-md hover:bg-indigo-700 cursor-pointer"
              >
                Save Condition Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MOVE / REASSIGN BOOK PLACEMENT MODAL */}
      {movePlacementModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 space-y-5 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-indigo-700">
                <ArrowRightLeft className="w-5 h-5" />
                <h3 className="text-base font-bold font-poppins text-slate-900">Reassign Book Rack & Shelf</h3>
              </div>
              <button
                onClick={() => setMovePlacementModal(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-1 text-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Target Book</span>
              <p className="font-bold text-slate-900">{movePlacementModal.book.title}</p>
              <p className="text-slate-500 font-mono text-[11px]">ISBN: {movePlacementModal.book.isbn} • {movePlacementModal.book.authorName}</p>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Target Academic Department Rack:</label>
                <select
                  value={selectedMoveRack}
                  onChange={(e) => {
                    const newRack = e.target.value;
                    setSelectedMoveRack(newRack);
                    const def = currentRacks.find((r) => r.rackCode === newRack);
                    if (def && def.shelves.length > 0) {
                      setSelectedMoveShelf(def.shelves[0].shelfId);
                    }
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white font-semibold text-slate-900 focus:ring-2 focus:ring-indigo-500"
                >
                  {currentRacks.map((r) => (
                    <option key={r.rackCode} value={r.rackCode}>
                      {r.rackName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Target Physical Shelf Tier:</label>
                <select
                  value={selectedMoveShelf}
                  onChange={(e) => setSelectedMoveShelf(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white font-semibold text-slate-900 focus:ring-2 focus:ring-indigo-500"
                >
                  {(currentRacks.find((r) => r.rackCode === selectedMoveRack)?.shelves || STANDARD_5_SHELVES.map(s => ({ shelfId: s.id, shelfName: s.label }))).map((s: any) => (
                    <option key={s.shelfId || s.id} value={s.shelfId || s.id}>
                      {s.shelfId || s.id}: {s.shelfName || s.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setMovePlacementModal(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteMovePlacement}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md cursor-pointer flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" /> Confirm Placement Move
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD / EDIT RACK MODAL */}
      {rackFormModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 space-y-5 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-teal-700">
                <Layers className="w-5 h-5" />
                <h3 className="text-base font-bold font-poppins text-slate-900">
                  {rackFormModal.mode === 'ADD' ? 'Add New Physical Rack Stack' : `Edit Rack: ${rackFormModal.rackCode}`}
                </h3>
              </div>
              <button
                onClick={() => setRackFormModal(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveRackForm} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Academic Program *</label>
                  <select
                    value={rackFormModal.program}
                    onChange={(e) => setRackFormModal({ ...rackFormModal, program: e.target.value as any })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 bg-white font-semibold text-slate-900 focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="B.Tech">B.Tech (Engineering)</option>
                    <option value="B.Sc">B.Sc (Sciences)</option>
                    <option value="MBA">MBA / Management</option>
                    <option value="M.Tech">M.Tech (Postgraduate)</option>
                    <option value="Other">Other Faculty Domain</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Short Code * (e.g. CSE, ECE, BIO)</label>
                  <input
                    type="text"
                    required
                    value={rackFormModal.shortCode}
                    onChange={(e) => setRackFormModal({ ...rackFormModal, shortCode: e.target.value.toUpperCase() })}
                    placeholder="e.g. CSE"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 bg-white font-mono font-bold text-slate-900 focus:ring-2 focus:ring-teal-500 uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Rack Code (Barcode Identifier) *</label>
                <input
                  type="text"
                  required
                  value={rackFormModal.rackCode || (rackFormModal.shortCode ? `RACK-${rackFormModal.program.toUpperCase()}-${rackFormModal.shortCode.toUpperCase()}-01` : '')}
                  onChange={(e) => setRackFormModal({ ...rackFormModal, rackCode: e.target.value.toUpperCase() })}
                  placeholder="e.g. R01 or R25"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 bg-white font-mono font-bold text-slate-900 focus:ring-2 focus:ring-teal-500 uppercase"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Rack & Department Name *</label>
                <input
                  type="text"
                  required
                  value={rackFormModal.rackName}
                  onChange={(e) => setRackFormModal({ ...rackFormModal, rackName: e.target.value })}
                  placeholder="e.g. B.Tech - Computer Science & Engineering (CSE)"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 bg-white font-semibold text-slate-900 focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Department</label>
                  <input
                    type="text"
                    value={rackFormModal.department}
                    onChange={(e) => setRackFormModal({ ...rackFormModal, department: e.target.value })}
                    placeholder="e.g. Computer Science"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 bg-white font-semibold text-slate-900 focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Domain Name</label>
                  <input
                    type="text"
                    value={rackFormModal.domain}
                    onChange={(e) => setRackFormModal({ ...rackFormModal, domain: e.target.value })}
                    placeholder="e.g. Computer Science & Engg"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 bg-white font-semibold text-slate-900 focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Stack Description</label>
                <textarea
                  rows={2}
                  value={rackFormModal.description}
                  onChange={(e) => setRackFormModal({ ...rackFormModal, description: e.target.value })}
                  placeholder="Description of book subjects and focus in this rack stack..."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 bg-white font-medium text-slate-900 focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setRackFormModal(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-md cursor-pointer flex items-center gap-1.5 active:scale-95"
                >
                  <CheckCircle2 className="w-4 h-4" /> {rackFormModal.mode === 'ADD' ? 'Create Rack' : 'Save Rack Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD / EDIT SHELF MODAL */}
      {shelfFormModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 space-y-5 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-indigo-700">
                <Layers className="w-5 h-5" />
                <h3 className="text-base font-bold font-poppins text-slate-900">
                  {shelfFormModal.mode === 'ADD' ? `Add Shelf Tier to ${shelfFormModal.rackName}` : `Edit Shelf: ${shelfFormModal.shelfId}`}
                </h3>
              </div>
              <button
                onClick={() => setShelfFormModal(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveShelfForm} className="space-y-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Parent Rack</span>
                <p className="font-bold text-slate-900">{shelfFormModal.rackName} ({shelfFormModal.rackCode})</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Shelf ID * (e.g. SHELF-1)</label>
                  <input
                    type="text"
                    required
                    disabled={shelfFormModal.mode === 'EDIT'}
                    value={shelfFormModal.shelfId}
                    onChange={(e) => setShelfFormModal({ ...shelfFormModal, shelfId: e.target.value.toUpperCase() })}
                    placeholder="e.g. SHELF-1"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 bg-white font-mono font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 uppercase disabled:bg-slate-100 disabled:text-slate-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Max Book Capacity</label>
                  <input
                    type="number"
                    min={1}
                    max={200}
                    value={shelfFormModal.maxCapacity}
                    onChange={(e) => setShelfFormModal({ ...shelfFormModal, maxCapacity: Number(e.target.value) })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 bg-white font-semibold text-slate-900 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Shelf Tier Name *</label>
                <input
                  type="text"
                  required
                  value={shelfFormModal.shelfName}
                  onChange={(e) => setShelfFormModal({ ...shelfFormModal, shelfName: e.target.value })}
                  placeholder="e.g. Tier 1: Artificial Intelligence & Machine Learning"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 bg-white font-semibold text-slate-900 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Specialization / Subject Focus *</label>
                <textarea
                  rows={2}
                  required
                  value={shelfFormModal.focus}
                  onChange={(e) => setShelfFormModal({ ...shelfFormModal, focus: e.target.value })}
                  placeholder="e.g. Deep Learning, Neural Networks, Robotics & NLP"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 bg-white font-medium text-slate-900 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShelfFormModal(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md cursor-pointer flex items-center gap-1.5 active:scale-95"
                >
                  <CheckCircle2 className="w-4 h-4" /> {shelfFormModal.mode === 'ADD' ? 'Add Shelf Tier' : 'Save Shelf Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE / RESET CONFIRMATION MODAL */}
      {deleteConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 space-y-4 border border-slate-200">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="text-base font-bold font-poppins text-slate-900">
                  {deleteConfirmModal.type === 'RACK'
                    ? 'Delete Physical Rack'
                    : deleteConfirmModal.type === 'SHELF'
                      ? 'Delete Physical Shelf Tier'
                      : 'Reset Racks to University Defaults'}
                </h3>
                <p className="text-xs text-slate-500">This action will modify physical stack allocation.</p>
              </div>
            </div>

            <div className="p-4 bg-rose-50 rounded-2xl border border-rose-200 text-xs text-rose-800 space-y-2">
              {deleteConfirmModal.type === 'RACK' && (
                <p>
                  Are you sure you want to delete Rack <strong>{deleteConfirmModal.rackName} ({deleteConfirmModal.rackCode})</strong>? All books currently allocated to this rack will safely be moved to the default CSE rack.
                </p>
              )}
              {deleteConfirmModal.type === 'SHELF' && (
                <p>
                  Are you sure you want to delete Shelf Tier <strong>{deleteConfirmModal.shelfName} ({deleteConfirmModal.shelfId})</strong>? Books on this shelf will be reassigned to another active shelf.
                </p>
              )}
              {deleteConfirmModal.type === 'RESET' && (
                <p>
                  Are you sure you want to reset all 10 domain racks and 50 physical shelf tiers to original factory defaults?
                </p>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmModal(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold cursor-pointer hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteDeleteConfirm}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md cursor-pointer flex items-center gap-1.5 active:scale-95"
              >
                <Trash2 className="w-4 h-4" /> Confirm Action
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REAL-TIME BARCODE & QR SCANNER MODAL */}
      <BarcodeScannerModal
        isOpen={isRackScannerOpen}
        onClose={() => setIsRackScannerOpen(false)}
        onScanSuccess={handleScanSuccessToLocate}
        title={`${dynamicScanScope.scopeLabel} • (Scope: ${dynamicScanScope.scopeDesc})`}
        scannerType={viewMode === 'RACK_SHELF' ? 'RACK_SHELF' : 'BOOK_COPY'}
      />
    </div>
  );
}
