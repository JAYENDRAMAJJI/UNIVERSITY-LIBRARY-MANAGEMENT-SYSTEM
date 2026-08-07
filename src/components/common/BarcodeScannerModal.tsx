import React, { useState, useEffect, useRef } from 'react';
import { ScanBarcode, Camera, CameraOff, X, Check, Sparkles, AlertCircle } from 'lucide-react';
import { libraryStore } from '../../services/libraryStore.service';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (scannedCode: string) => void;
  title?: string;
  scannerType?: 'ISBN' | 'COPY_BARCODE' | 'ALL';
}

const SAMPLE_ISBN_PRESETS = [
  { barcode: '978-0134610993', title: 'Artificial Intelligence: A Modern Approach', author: 'Stuart Russell & Peter Norvig' },
  { barcode: '978-0132350884', title: 'Clean Code: A Handbook of Agile Software Craftsmanship', author: 'Robert C. Martin' },
  { barcode: '978-0262046305', title: 'Introduction to Algorithms (4th Ed)', author: 'Thomas H. Cormen' },
  { barcode: '978-0137576242', title: 'Modern Operating Systems (5th Ed)', author: 'Andrew S. Tanenbaum' },
  { barcode: '978-0596007126', title: 'Head First Design Patterns', author: 'Eric Freeman & Elisabeth Robson' },
  { barcode: '978-0078022159', title: 'Database System Concepts', author: 'Abraham Silberschatz' },
  { barcode: '978-1449373320', title: 'Designing Data-Intensive Applications', author: 'Martin Kleppmann' },
];

export default function BarcodeScannerModal({
  isOpen,
  onClose,
  onScanSuccess,
  title = 'Barcode & QR Reader Scanner',
  scannerType = 'ALL',
}: BarcodeScannerModalProps) {
  const [selectedBarcode, setSelectedBarcode] = useState('');
  const [selectedIsbnFilter, setSelectedIsbnFilter] = useState('');
  const [manualInput, setManualInput] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [useLiveCamera, setUseLiveCamera] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const state = libraryStore.snapshot;

  // Extract all available accession copy barcodes from state with ISBN metadata
  const availableCopies = state.books.flatMap((b) => {
    const isRefBook = b.isReferenceOnly || b.collectionType === 'REFERENCE';
    return (b.copies || []).map((c) => ({
      barcode: c.barcode,
      accessionNo: c.accessionNo,
      bookTitle: b.title,
      bookIsbn: b.isbn,
      status: c.status,
      isReferenceOnly: isRefBook || c.isReferenceOnly,
    }));
  });

  // Combine books in store with sample ISBN presets
  const catalogIsbns = [
    ...state.books.map((b) => ({
      barcode: b.isbn,
      title: b.title,
      author: b.authorName,
    })),
    ...SAMPLE_ISBN_PRESETS.filter(
      (p) => !state.books.some((b) => b.isbn === p.barcode || b.isbn.replace(/-/g, '') === p.barcode.replace(/-/g, ''))
    ),
  ];

  // Filter accession copy barcodes by selected ISBN if specified
  const filteredCopies = selectedIsbnFilter
    ? availableCopies.filter(
        (c) =>
          c.bookIsbn === selectedIsbnFilter ||
          c.bookIsbn.replace(/-/g, '') === selectedIsbnFilter.replace(/-/g, '')
      )
    : availableCopies;

  // Stop camera stream on unmount or close
  useEffect(() => {
    if (!isOpen || !useLiveCamera) {
      stopCamera();
    } else {
      startCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, useLiveCamera]);

  const startCamera = async () => {
    setCameraError(null);
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } },
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
      } else {
        setCameraError('Webcam access is not supported by this browser.');
      }
    } catch (err: any) {
      setCameraError(err.message || 'Camera permission denied or camera unavailable. Using simulator mode.');
      setUseLiveCamera(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  if (!isOpen) return null;

  const handleExecuteScan = (codeToScan?: string) => {
    const code = (
      codeToScan ||
      manualInput ||
      selectedBarcode ||
      (scannerType === 'ISBN' ? catalogIsbns[0]?.barcode : filteredCopies[0]?.barcode ?? 'BC-99201')
    ).trim();
    if (!code) return;

    setIsScanning(true);
    setTimeout(() => {
      setIsScanning(false);
      stopCamera();
      onScanSuccess(code);
      onClose();
    }, 700);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden space-y-0">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-2xl bg-blue-500/20 text-blue-300">
              <ScanBarcode className="h-6 w-6" />
            </span>
            <div>
              <h3 className="font-bold text-lg font-poppins text-white">{title}</h3>
              <p className="text-xs text-slate-300">Auto-detect EAN-13, ISBN & Accession Barcodes</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Camera Controls & Toggle */}
          <div className="flex items-center justify-between bg-slate-100 p-2.5 rounded-2xl text-xs font-semibold">
            <span className="text-slate-700 font-medium">Scanner Input Source:</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setUseLiveCamera(false)}
                className={`px-3 py-1 rounded-xl transition-all cursor-pointer ${
                  !useLiveCamera ? 'bg-blue-600 text-white shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Simulator & Presets
              </button>
              <button
                type="button"
                onClick={() => setUseLiveCamera(true)}
                className={`px-3 py-1 rounded-xl transition-all cursor-pointer flex items-center gap-1 ${
                  useLiveCamera ? 'bg-blue-600 text-white shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Camera className="w-3.5 h-3.5" /> Live Camera
              </button>
            </div>
          </div>

          {cameraError && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2 font-medium">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{cameraError}</span>
            </div>
          )}

          {/* Viewfinder Display */}
          <div className="relative h-48 rounded-2xl bg-slate-950 overflow-hidden flex flex-col items-center justify-center border-2 border-slate-800 shadow-inner">
            {useLiveCamera ? (
              <video ref={videoRef} className="w-full h-full object-cover" autoPlay playsInline muted />
            ) : (
              <div className="absolute inset-0 bg-[radial-gradient(#3b82f6_1px,transparent_1px)] [background-size:16px_16px] opacity-20 pointer-events-none" />
            )}

            {/* Target Reticle Corners */}
            <div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-emerald-400" />
            <div className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-emerald-400" />
            <div className="absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 border-emerald-400" />
            <div className="absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 border-emerald-400" />

            {/* Laser Line */}
            <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_15px_#34d399] animate-pulse my-auto z-10" />

            <div className="absolute bottom-3 flex items-center gap-2 text-xs font-bold text-slate-200 bg-slate-900/85 px-3.5 py-1.5 rounded-full border border-slate-700 shadow-md backdrop-blur-xs z-10">
              <Camera className="h-3.5 w-3.5 text-emerald-400 animate-spin" />
              <span>{isScanning ? 'Decoding Barcode...' : 'Position barcode inside optical lens target'}</span>
            </div>
          </div>

          {/* Quick Select Barcode Presets */}
          <div className="space-y-3">
            {scannerType !== 'COPY_BARCODE' && (
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                  Select Book ISBN Barcode (For Cataloging & Auto-Fill):
                </label>
                <select
                  value={selectedIsbnFilter || (scannerType === 'ISBN' ? selectedBarcode : '')}
                  onChange={(e) => {
                    const isbn = e.target.value;
                    setSelectedIsbnFilter(isbn);
                    if (scannerType === 'ISBN') {
                      setSelectedBarcode(isbn);
                    } else {
                      const matchingCopies = availableCopies.filter(
                        (c) => c.bookIsbn === isbn || c.bookIsbn.replace(/-/g, '') === isbn.replace(/-/g, '')
                      );
                      if (matchingCopies.length > 0) {
                        setSelectedBarcode(matchingCopies[0].barcode);
                      } else {
                        setSelectedBarcode('');
                      }
                    }
                    setManualInput('');
                  }}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="">-- Choose Book ISBN --</option>
                  {catalogIsbns.map((item, idx) => (
                    <option key={idx} value={item.barcode}>
                      ISBN: {item.barcode} — {item.title} ({item.author})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {scannerType !== 'ISBN' && (
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                  Select Accession Copy Barcode (For Issue / Circulation):
                </label>
                <select
                  value={selectedBarcode}
                  onChange={(e) => {
                    setSelectedBarcode(e.target.value);
                    setManualInput('');
                  }}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="">
                    {selectedIsbnFilter
                      ? `-- Choose Accession Copy (${filteredCopies.length} Available for Selected Book) --`
                      : '-- Choose Accession Barcode --'}
                  </option>
                  {filteredCopies.map((item, idx) => (
                    <option key={idx} value={item.barcode}>
                      Barcode: {item.barcode} ({item.accessionNo}) - {item.bookTitle} {item.isReferenceOnly ? '🚫 [LIBRARY REFERENCE ONLY — NON-ISSUABLE]' : `[${item.status}]`}
                    </option>
                  ))}
                  {filteredCopies.length === 0 && (
                    <option value="" disabled>
                      No accession copies registered for this book yet
                    </option>
                  )}
                </select>
                {selectedIsbnFilter && filteredCopies.length > 0 && (
                  <p className="text-[11px] text-emerald-700 font-medium flex items-center gap-1">
                    <Check className="w-3.5 h-3.5 text-emerald-600" /> Filtered: Showing {filteredCopies.length} accession copy barcodes for selected book.
                  </p>
                )}
              </div>
            )}

            {/* Manual Entry */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">Or Type Barcode / ISBN Manually:</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. 978-0134610993 or BC-99201"
                  value={manualInput}
                  onChange={(e) => {
                    setManualInput(e.target.value);
                    setSelectedBarcode('');
                  }}
                  className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => handleExecuteScan(manualInput)}
                  disabled={!manualInput.trim()}
                  className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 disabled:opacity-40 transition-all cursor-pointer"
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={() => handleExecuteScan()}
              disabled={isScanning}
              className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-sm shadow-md hover:opacity-95 disabled:opacity-50 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <ScanBarcode className="h-4 w-4" />
              <span>{isScanning ? 'Scanning Barcode...' : 'Scan Selected Barcode'}</span>
            </button>
            <button
              onClick={onClose}
              className="px-5 py-3 rounded-2xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-all cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

