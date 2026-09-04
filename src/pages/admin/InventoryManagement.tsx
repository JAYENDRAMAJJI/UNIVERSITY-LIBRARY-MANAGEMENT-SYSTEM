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
} from 'lucide-react';
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

interface LocatedBookResult {
  book: Book;
  copy?: BookCopy;
  rack: RackDefinition;
  shelf: ShelfDefinition;
  matchedBy: string;
}

export default function InventoryManagement() {
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
  const [expandedRackCodes, setExpandedRackCodes] = useState<Record<string, boolean>>({
    'R01': true,
    'RACK-BTECH-CSE-01': true,
  });

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

  const toggleRackExpanded = (rackCode: string) => {
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
  const [selectedMoveRack, setSelectedMoveRack] = useState<string>('RACK-BTECH-CSE-01');
  const [selectedMoveShelf, setSelectedMoveShelf] = useState<string>('SHELF-1');

  // Barcode & QR Scanner Modal State
  const [isRackScannerOpen, setIsRackScannerOpen] = useState(false);

  // Searchable Book Select State for Book-Wise View
  const [isBookSelectOpen, setIsBookSelectOpen] = useState(false);
  const [bookSelectSearchTerm, setBookSelectSearchTerm] = useState('');
  const bookSelectRef = useRef<HTMLDivElement>(null);

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

  // Handle Scanner Result: Locate Book or Rack/Shelf
  const handleScanSuccessToLocate = (scannedCode: string, detectedMethod?: string) => {
    setIsRackScannerOpen(false);
    const raw = (scannedCode || '').trim();
    const clean = raw.toUpperCase().replace(/^QR-/, '').replace(/^RACK:/, '').replace(/^SHELF:/, '').trim();

    // 1. Check if scanned code directly matches a Rack or Shelf QR/Barcode
    const directRack = currentRacks.find(
      (r) =>
        r.rackCode.toUpperCase() === clean ||
        r.rackId.toUpperCase() === clean ||
        r.shortCode.toUpperCase() === clean ||
        clean.startsWith(r.rackCode.toUpperCase())
    );

    if (directRack && !state.books.some((b) => b.isbn === raw || b.id === raw)) {
      setViewMode('RACK_SHELF');
      setAcademicProgramTab(directRack.program as any);
      setHighlightedRackCode(directRack.rackCode);
      setRackShelfSearchTerm(directRack.rackCode);
      setExpandedRackCodes((prev) => ({ ...prev, [directRack.rackCode]: true }));
      triggerToast(`📍 Scanned Rack Identified: ${directRack.rackName} (${directRack.rackCode})`);

      // Scroll into view
      setTimeout(() => {
        const elem = document.getElementById(`rack-card-${directRack.rackCode}`);
        if (elem) elem.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 200);
      return;
    }

    // 2. Locate Book by Copy Barcode, Accession No, ISBN, Book ID, or Title
    let matchedBook: Book | undefined;
    let matchedCopy: BookCopy | undefined;
    let matchType = 'Scanned Code';

    // A. Check Copy Barcodes & Accession Numbers
    for (const book of state.books) {
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

    // B. Check ISBN or ID
    if (!matchedBook) {
      matchedBook = state.books.find(
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

      setViewMode('RACK_SHELF');
      setAcademicProgramTab(targetRack.program as any);
      setHighlightedRackCode(targetRack.rackCode);
      setHighlightedShelfId(targetShelf.shelfId);
      setHighlightedBookId(matchedBook.id);
      setExpandedRackCodes((prev) => ({ ...prev, [targetRack.rackCode]: true }));

      triggerToast(`🎯 Book Located! "${matchedBook.title}" is on ${targetRack.rackCode} → ${targetShelf.shelfName}`);

      // Smooth scroll to the rack
      setTimeout(() => {
        const elem = document.getElementById(`rack-card-${targetRack.rackCode}`);
        if (elem) {
          elem.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 300);
    } else {
      triggerToast(`⚠️ No catalog book or rack found matching scanned barcode: "${raw}".`);
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

  // Bulk Print Rack Placards
  const handleBulkPrintRackPlacards = () => {
    const items: RackShelfPlacard[] = academicRackInventories.map((r) => ({
      type: 'RACK',
      rackNumber: r.rackCode,
      department: `${r.program} • ${r.department}`,
      totalBooksCount: r.books.length,
      totalCopiesCount: r.totalCopies,
      barcode: r.rackCode,
      qrPayload: `RACK:${r.rackCode}`,
    }));
    printRackShelfPlacards(items);
    triggerToast(`Printed official barcode & QR placards for ${items.length} academic department racks!`);
  };

  // Bulk Print Shelf Strips
  const handleBulkPrintShelfStrips = () => {
    const items: RackShelfPlacard[] = academicRackInventories.flatMap((r) =>
      r.shelvesData.map((s) => ({
        type: 'SHELF' as const,
        rackNumber: r.rackCode,
        shelfNumber: s.shelfId,
        department: `${r.shortCode} • ${s.shelfName}`,
        totalBooksCount: s.books.length,
        totalCopiesCount: s.totalCopies,
        barcode: `${r.shortCode}-${s.shelfId}`,
        qrPayload: `SHELF:${r.rackCode}/${s.shelfId}`,
      }))
    );
    printRackShelfPlacards(items);
    triggerToast(`Printed official shelf tags for all 50 physical shelf levels across departments!`);
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
    triggerToast(`Printed official placard for ${r.rackName}!`);
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

  // Filter books for Book-Wise View
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

  const filteredBooks = state.books.filter((book) => {
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

  // Filter copies for Flat View
  const filteredCopies = allCopies.filter((c) => {
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
              Academic domain racks, 5-tier shelf allocation, barcode & QR placard printing, and instant scanner book lookup.
            </p>
          </div>

          {/* Action Buttons: Scanner & Export */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0 self-stretch sm:self-auto">
            <button
              type="button"
              onClick={() => setIsRackScannerOpen(true)}
              className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-teal-600 to-indigo-600 hover:from-teal-700 hover:to-indigo-700 text-white font-bold text-xs transition-all flex items-center gap-2 cursor-pointer shadow-md shadow-teal-500/20 active:scale-95 whitespace-nowrap"
              title="Scan book barcode, ISBN, accession number, or rack QR to instantly locate its physical rack and shelf"
            >
              <ScanBarcode className="h-4 w-4 shrink-0" />
              <span>Scan to Find Book Under Racks</span>
            </button>

            <button
              type="button"
              onClick={handleDirectExportCSV}
              className="px-4 py-2.5 rounded-2xl bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100 font-bold text-xs transition-all flex items-center gap-2 cursor-pointer shadow-2xs active:scale-95 whitespace-nowrap"
            >
              <Download className="h-4 w-4 text-slate-600 shrink-0" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Bottom Row: 3-Way Primary View Mode Segmented Controls */}
        <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 overflow-x-auto">
          <div className="inline-flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200 text-xs font-bold shrink-0">
            <button
              type="button"
              onClick={() => setViewMode('RACK_SHELF')}
              className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
                viewMode === 'RACK_SHELF'
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
              className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
                viewMode === 'BOOK_WISE'
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
              className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
                viewMode === 'ALL_COPIES'
                  ? 'bg-white text-indigo-900 shadow-sm border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <Barcode className="w-4 h-4 text-indigo-600 shrink-0" />
              <span>All Accession Copies ({allCopies.length})</span>
            </button>
          </div>

          <span className="text-[11px] font-semibold text-slate-400 hidden md:inline whitespace-nowrap">
            Active Mode: <strong className="text-slate-700">{viewMode === 'RACK_SHELF' ? '10 Academic Racks & 50 Shelves' : viewMode === 'BOOK_WISE' ? 'Catalog Book Breakdown' : 'All Individual Copies'}</strong>
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

        {/* Active Loans */}
        <div className="bg-white p-4 rounded-2xl border border-blue-200/80 bg-blue-50/20 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between h-full group">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-blue-800 truncate" title="On Active Loan">
              Active Loans
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
                  <option value="ALL">All Academic Racks ({ACADEMIC_RACK_HIERARCHY.length})</option>
                  {ACADEMIC_RACK_HIERARCHY.map((r) => (
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
                title="Scan barcode/QR to find book on racks"
              >
                <ScanBarcode className="w-4 h-4" /> Scan
              </button>
            </div>

            {/* Row 2: Status Indicator & Management Action Buttons */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-100">
              <div className="flex flex-wrap items-center gap-2 text-slate-600 font-medium text-xs">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-teal-50 text-teal-800 font-bold border border-teal-200/60 text-[11px]">
                  <Layers className="w-3 h-3 text-teal-600" />
                  Physical Hierarchy Management
                </span>
                <span className="hidden sm:inline text-slate-400">•</span>
                <span className="text-[11px] text-slate-500 font-semibold">
                  Showing {academicRackInventories.filter((r) => academicProgramTab === 'ALL' || r.rackCode === academicProgramTab || r.program === academicProgramTab).length} Domain Racks & {academicRackInventories.reduce((acc, r) => acc + r.shelvesData.length, 0)} Shelf Tiers
                </span>
                {academicProgramTab !== 'ALL' && (
                  <button
                    type="button"
                    onClick={() => setAcademicProgramTab('ALL')}
                    className="text-xs font-bold text-teal-600 hover:text-teal-800 cursor-pointer ml-1 underline"
                  >
                    Clear filter (Show all)
                  </button>
                )}
              </div>

              {/* Toolbar Actions: Add Rack and Bulk Print */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
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
                    })
                  }
                  className="px-3.5 py-2 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs transition-all cursor-pointer whitespace-nowrap active:scale-95"
                  title="Create and configure a new physical domain rack stack"
                >
                  <Plus className="w-3.5 h-3.5" /> Add New Rack
                </button>

                <button
                  onClick={handleBulkPrintRackPlacards}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs transition-all cursor-pointer whitespace-nowrap active:scale-95"
                  title="Print official barcode & QR placards for all academic department racks"
                >
                  <Printer className="w-3.5 h-3.5 text-teal-300" /> Bulk Print Signs
                </button>

                <button
                  onClick={handleBulkPrintShelfStrips}
                  className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs transition-all cursor-pointer whitespace-nowrap active:scale-95"
                  title="Print official shelf tags for all physical shelf tiers"
                >
                  <Printer className="w-3.5 h-3.5 text-indigo-200" /> Bulk Print Shelf Tags
                </button>
              </div>
            </div>
          </div>

          {/* Academic Racks List with Shelves Per Rack */}
          <div className="space-y-6">
            {academicRackInventories
              .filter((r) => {
                if (academicProgramTab !== 'ALL' && r.rackCode !== academicProgramTab && r.program !== academicProgramTab) return false;
                if (!rackShelfSearchTerm.trim()) return true;
                const term = rackShelfSearchTerm.toLowerCase();
                return (
                  r.rackName.toLowerCase().includes(term) ||
                  r.rackCode.toLowerCase().includes(term) ||
                  r.shortCode.toLowerCase().includes(term) ||
                  r.department.toLowerCase().includes(term) ||
                  r.books.some((b) => b.title.toLowerCase().includes(term) || b.authorName.toLowerCase().includes(term))
                );
              })
              .map((rack, rIdx) => {
                const isRackHighlighted = highlightedRackCode === rack.rackCode;
                const isExpanded = !!expandedRackCodes[rack.rackCode] || isRackHighlighted || !!rackShelfSearchTerm.trim();

                return (
                  <div
                    key={`acad-rack-${rIdx}`}
                    id={`rack-card-${rack.rackCode}`}
                    className={`bg-white rounded-3xl border-2 shadow-sm overflow-hidden transition-all ${
                      isRackHighlighted
                        ? 'border-teal-500 ring-4 ring-teal-500/20 shadow-xl'
                        : 'border-slate-200/90 hover:border-teal-300'
                    }`}
                  >
                    {/* Rack Banner Header */}
                    <div className="p-5 bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 text-white flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                      <div className="space-y-1.5 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`px-2.5 py-1 rounded-lg text-xs font-black uppercase tracking-wider text-white shadow-xs ${
                              rack.program === 'B.Tech' ? 'bg-blue-600' : rack.program === 'B.Sc' ? 'bg-purple-600' : 'bg-emerald-600'
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
                          title="Print physical turnstile sign for this rack stack"
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
                          onClick={() => toggleRackExpanded(rack.rackCode)}
                          className={`px-4 py-2 text-xs font-black rounded-xl flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap shadow-sm active:scale-95 ${
                            isExpanded
                              ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 ring-2 ring-amber-400/40'
                              : 'bg-emerald-400 hover:bg-emerald-300 text-slate-950 ring-2 ring-emerald-400/30'
                          }`}
                          title={isExpanded ? 'Hide physical shelves' : `Drop down and view ${rack.shelvesData.length} physical shelves`}
                        >
                          <Layers className="w-3.5 h-3.5" />
                          <span>{isExpanded ? 'Hide Shelves' : `View ${rack.shelvesData.length} Shelves`}</span>
                          <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${isExpanded ? 'rotate-180' : 'rotate-0'}`} />
                        </button>
                      </div>
                    </div>

                    {/* COLLAPSED SHELF COMPACT PREVIEW BAR */}
                    {!isExpanded && (
                      <div
                        onClick={() => toggleRackExpanded(rack.rackCode)}
                        className="p-4 bg-slate-50 hover:bg-teal-50/50 cursor-pointer transition-colors border-t border-slate-200/80 flex flex-col md:flex-row md:items-center justify-between gap-3 group"
                        title={`Click to expand and view ${rack.shelvesData.length} shelf tiers`}
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
                              {rack.shelvesData.length} Tiers Configured
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-[11px] font-bold text-slate-500">
                              Capacity: {rack.totalCopies} / {rack.shelvesData.length * 40} Copies Allocated ({Math.min(100, Math.round((rack.totalCopies / (rack.shelvesData.length * 40 || 1)) * 100))}% filled)
                            </span>
                            <button
                              type="button"
                              onClick={() => toggleRackExpanded(rack.rackCode)}
                              className="text-[11px] font-bold text-slate-500 hover:text-slate-900 flex items-center gap-1 cursor-pointer"
                            >
                              <ChevronUp className="w-3.5 h-3.5" /> Collapse
                            </button>
                          </div>
                        </div>

                        {/* Shelves Rendered as Tier 1 to Tier N */}
                        <div className="grid grid-cols-1 gap-3">
                          {rack.shelvesData.map((shelf, sIdx) => {
                            const isShelfHighlighted = isRackHighlighted && highlightedShelfId === shelf.shelfId;

                            return (
                              <div
                                key={`shelf-tier-${sIdx}`}
                                className={`rounded-2xl border p-4 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
                                  isShelfHighlighted
                                    ? 'bg-teal-50 border-teal-500 shadow-md ring-2 ring-teal-500/20'
                                    : 'bg-white border-slate-200 shadow-2xs hover:border-teal-300 hover:shadow-xs'
                                }`}
                              >
                                {/* Shelf Identification & Focus */}
                                <div className="space-y-1.5 min-w-0 flex-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span
                                      className={`text-xs font-black px-2.5 py-0.5 rounded-lg font-mono ${
                                        isShelfHighlighted ? 'bg-teal-600 text-white' : 'bg-indigo-50 text-indigo-700 border border-indigo-200/60'
                                      }`}
                                    >
                                      {shelf.shelfId}
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
                                      Dynamic Physical Shelves ({calculatePhysicalShelves(shelf.totalCopies || 100).length} Tiers):
                                    </span>
                                    {calculatePhysicalShelves(shelf.totalCopies || 100).map((ps) => (
                                      <span
                                        key={ps.physicalShelfId}
                                        className="inline-flex items-center gap-1 text-[10px] font-mono font-black px-2 py-0.5 rounded-lg bg-slate-100 text-slate-800 border border-slate-200 shadow-2xs"
                                        title={`${ps.name} — Max Capacity 50 Copies`}
                                      >
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                        <strong>{ps.physicalShelfId}</strong> ({ps.startCopy}–{ps.endCopy})
                                      </span>
                                    ))}
                                    <span className="text-[10px] font-mono text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md font-bold">
                                      Loc Code: {generateLocationCode(rack.rackCode, shelf.shelfId, 1, 1, 1)}
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
                                              className={`group relative inline-flex items-center gap-2.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all shadow-2xs ${
                                                isBookMatched
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
                                                className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-md shrink-0 ${
                                                  b.availableCopies > 0
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
                                      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100/60 border border-dashed border-slate-200 text-slate-400 text-xs">
                                        <span className="italic">Empty shelf tier • Ready for book allocation</span>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Shelf Action Buttons & Barcode Tag */}
                                <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                                  <span className="text-xs font-bold text-slate-700 bg-slate-100 border border-slate-200 px-2.5 py-1.5 rounded-xl font-mono">
                                    {shelf.books.length} Books • {shelf.totalCopies}/{shelf.maxCapacity || 40} Copies
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
                                        maxCapacity: shelf.maxCapacity || 40,
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
              })}
          </div>
        </div>
      )}

      {/* VIEW MODE 2: BOOK-WISE GROUPED INVENTORY VIEW */}
      {viewMode === 'BOOK_WISE' && (
        <div className="space-y-4">
          {/* Single Integrated Search & Book Selector Bar */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div className="space-y-1">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                  Search Inventory & Filter Catalog:
                </label>
                <button
                  type="button"
                  onClick={handleDirectExportCSV}
                  className="px-3.5 py-1.5 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-100 hover:bg-indigo-100 font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer active:scale-95 shrink-0 self-start sm:self-auto"
                >
                  <Download className="h-3.5 w-3.5 text-indigo-600" /> Export CSV
                </button>
              </div>
              <div className="relative" ref={bookSelectRef}>
                <div
                  className={`w-full px-4 py-3 rounded-2xl border bg-white flex items-center justify-between gap-3 transition-all shadow-xs ${
                    isBookSelectOpen ? 'border-indigo-500 ring-2 ring-indigo-500/20' : 'border-slate-200 hover:border-indigo-300'
                  }`}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Search className="h-4.5 w-4.5 text-indigo-600 shrink-0" />
                    <input
                      type="text"
                      placeholder={
                        selectedBook
                          ? `Filter: ${selectedBook.title} (ISBN: ${selectedBook.isbn}) — Type to search copies...`
                          : `Search inventory by Accession No, Barcode, Book Title, ISBN, Author, Shelf/Rack...`
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
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
                        title="Reset all filters"
                      >
                        <X className="h-3.5 w-3.5" /> Clear Filter
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
            const norm = normalizeRackAndShelf(book.rackNumber, book.shelfNumber, book.department || book.categoryName, book.title);

            return (
              <div key={book.id} className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden transition-all">
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
                      <div className="flex items-center gap-2 pt-1 text-xs text-slate-700 font-semibold flex-wrap">
                        <MapPin className="h-4 w-4 text-rose-500 shrink-0" />
                        <span className="bg-white px-2.5 py-1 rounded-lg border border-slate-200 font-mono text-[11px]">
                          Physical Stack: <strong className="text-teal-900">{norm.rackCode}</strong> / <strong className="text-indigo-900">{norm.shelfCode}</strong>
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedMoveRack(norm.rackCode);
                            setSelectedMoveShelf(norm.shelfCode);
                            setMovePlacementModal({
                              book,
                              currentRack: norm.rackCode,
                              currentShelf: norm.shelfCode,
                            });
                          }}
                          className="px-2 py-0.5 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-600 rounded-md border border-slate-200 text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <ArrowRightLeft className="w-2.5 h-2.5" /> Change Shelf
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Copy Counters & Expand Drawer Button */}
                  <div className="flex flex-col sm:items-end gap-2 w-full sm:w-auto shrink-0 border-t sm:border-t-0 border-slate-100 pt-3 sm:pt-0">
                    <div className="flex items-center gap-2 flex-wrap text-xs">
                      <span className="px-2.5 py-1 rounded-xl bg-emerald-100 text-emerald-900 font-bold border border-emerald-200">
                        {availCount} Available
                      </span>
                      <span className="px-2.5 py-1 rounded-xl bg-blue-100 text-blue-900 font-bold border border-blue-200">
                        {isIssuedCount} Issued
                      </span>
                      {isDamagedCount > 0 && (
                        <span className="px-2 py-1 rounded-xl bg-amber-100 text-amber-900 font-bold border border-amber-200">
                          {isDamagedCount} Damaged
                        </span>
                      )}
                      {isLostCount > 0 && (
                        <span className="px-2 py-1 rounded-xl bg-rose-100 text-rose-900 font-bold border border-rose-200">
                          {isLostCount} Lost
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => toggleExpandBook(book.id)}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-xl border border-indigo-200 transition-all cursor-pointer"
                    >
                      <span>{isExpanded ? 'Hide Accession Copies' : `View All ${copiesList.length} Accession Copies`}</span>
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Accession Copies Inventory Grid Drawer */}
                {isExpanded && (
                  <div className="p-5 border-t border-slate-200 bg-white space-y-3 animate-fadeIn">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                      <Barcode className="w-4 h-4 text-indigo-600" /> Book Accession Inventory Copies ({copiesList.length} Total Copies):
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {copiesList.map((copy) => (
                        <div
                          key={copy.id}
                          className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-2 hover:border-indigo-200 transition-all"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs font-mono bg-blue-100 text-blue-900 px-2.5 py-0.5 rounded-lg border border-blue-200">
                              {copy.accessionNo}
                            </span>
                            <span
                              className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase border ${
                                copy.status === 'AVAILABLE'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : 'bg-amber-50 text-amber-800 border-amber-200'
                              }`}
                            >
                              {copy.status}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 pt-1">
                            <Barcode className="h-8 w-12 text-slate-700 shrink-0" />
                            <div className="min-w-0 flex-1 text-xs">
                              <p className="font-mono text-slate-900 font-bold">{copy.barcode}</p>
                              <p className="text-[11px] text-slate-500 font-medium truncate">
                                Rack: {copy.rackNumber || norm.rackCode} | Shelf: {copy.shelfNumber || norm.shelfCode}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 text-xs">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                                copy.condition === 'NEW'
                                  ? 'bg-cyan-100 text-cyan-800'
                                  : copy.condition === 'GOOD'
                                  ? 'bg-slate-200 text-slate-800'
                                  : copy.condition === 'DAMAGED'
                                  ? 'bg-amber-100 text-amber-900'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              Condition: {copy.condition}
                            </span>

                            <button
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
          {/* Condition Filter Pill Tabs */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-3">
            <div className="relative">
              <Search className="h-4.5 w-4.5 text-slate-400 absolute left-3 top-3.5" />
              <input
                type="text"
                placeholder="Search accession number, copy barcode, book title, ISBN, rack, shelf..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-8 py-2.5 rounded-2xl border border-slate-200 text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
              <span className="text-slate-400 font-extrabold uppercase text-[10px] mr-1">Filter Inventory:</span>
              {[
                { id: 'ALL', label: 'All Conditions' },
                { id: 'REFERENCE', label: 'Reference Copies Only' },
                { id: 'NEW', label: 'New Condition' },
                { id: 'GOOD', label: 'Good Condition' },
                { id: 'DAMAGED', label: 'Damaged' },
                { id: 'LOST', label: 'Lost' },
              ].map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setFilterCondition(c.id)}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                    filterCondition === c.id
                      ? c.id === 'REFERENCE'
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {c.label}
                </button>
              ))}
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
                    <tr key={copy.id} className="hover:bg-slate-50/60 transition-colors">
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
                            {copy.rackNumber || 'RACK-BTECH-CSE-01'} / {copy.shelfNumber || 'SHELF-1'}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="space-y-1">
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold uppercase ${
                              copy.isReferenceOnly
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
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${
                            copy.condition === 'NEW'
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
                  onChange={(e) => setSelectedMoveRack(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white font-semibold text-slate-900 focus:ring-2 focus:ring-indigo-500"
                >
                  {ACADEMIC_RACK_HIERARCHY.map((r) => (
                    <option key={r.rackCode} value={r.rackCode}>
                      [{r.program}] {r.rackName} ({r.rackCode})
                    </option>
                  ))}
                </select>
              </div>

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
                      [{r.program}] {r.rackName} ({r.rackCode})
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
                  placeholder="e.g. RACK-BTECH-CSE-01"
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
        title="Scan Book Barcode, ISBN, or Rack QR to Locate Under Physical Stacks"
        scannerType="ALL"
      />
    </div>
  );
}
