import React, { useState, useEffect, useRef } from 'react';
import { ScanBarcode, Camera, X, Check, AlertCircle, UserCheck, Cpu, Wifi } from 'lucide-react';
import jsQR from 'jsqr';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { libraryStore } from '../../services/libraryStore.service';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (scannedCode: string) => void;
  title?: string;
  scannerType?: 'ISBN' | 'COPY_BARCODE' | 'STUDENT_ID' | 'MEMBER_CARD' | 'ALL';
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

const cleanScannedCode = (raw: string): string => {
  let str = (raw || '').trim();
  if ((str.startsWith('{') && str.endsWith('}')) || (str.startsWith('[') && str.endsWith(']'))) {
    try {
      const obj = JSON.parse(str);
      str = obj.memberCardNo || obj.id || obj.cardNo || obj.barcode || obj.isbn || obj.studentId || obj.code || str;
    } catch {
      // ignore
    }
  }
  // Strip control characters, quotes, or trailing newlines from physical scanners
  str = str.replace(/[\r\n"']/g, '').trim();
  return str;
};

export default function BarcodeScannerModal({
  isOpen,
  onClose,
  onScanSuccess,
  title,
  scannerType = 'ALL',
}: BarcodeScannerModalProps) {
  const [selectedBarcode, setSelectedBarcode] = useState('');
  const [selectedIsbnFilter, setSelectedIsbnFilter] = useState('');
  const [manualInput, setManualInput] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [activeTab, setActiveTab] = useState<'DEVICE_SCANNER' | 'LIVE_CAMERA'>('DEVICE_SCANNER');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [deviceScanStatus, setDeviceScanStatus] = useState<string>('Ready & Listening for Hardware Barcode Reader...');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const deviceInputRef = useRef<HTMLInputElement | null>(null);
  const usbBufferRef = useRef<string>('');
  const usbTimerRef = useRef<any>(null);

  const state = libraryStore.snapshot;

  const isStudentOrMemberScan = scannerType === 'STUDENT_ID' || scannerType === 'MEMBER_CARD';
  const effectiveTitle =
    title ||
    (isStudentOrMemberScan
      ? 'Student & Member Library ID Card Reader'
      : 'Barcode & QR Code Reader Scanner');

  // Member cards from store
  const memberCards = (state.members || []).map((m) => ({
    barcode: m.memberCardNo,
    id: m.id,
    name: m.name,
    email: m.email,
    department: m.department || 'General Academic',
    role: m.role,
    avatarUrl: m.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
    currentActiveLoans: m.currentActiveLoans || 0,
  }));

  // Accession copies
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

  // Books / Presets
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

  const filteredCopies = selectedIsbnFilter
    ? availableCopies.filter(
        (c) =>
          c.bookIsbn === selectedIsbnFilter ||
          c.bookIsbn.replace(/-/g, '') === selectedIsbnFilter.replace(/-/g, '')
      )
    : availableCopies;

  // Currently selected member object if any
  const currentMemberObj = memberCards.find(
    (m) =>
      m.barcode.toLowerCase() === (selectedBarcode || manualInput).toLowerCase() ||
      m.id.toLowerCase() === (selectedBarcode || manualInput).toLowerCase()
  );

  // Reset modal state on open & auto-focus input
  useEffect(() => {
    if (isOpen) {
      setSelectedBarcode('');
      setManualInput('');
      setCameraError(null);
      setActiveTab('DEVICE_SCANNER');
      setDeviceScanStatus('Ready & Listening for Hardware Barcode Reader...');
      setTimeout(() => {
        deviceInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Focus input when switching to Device Scanner tab
  useEffect(() => {
    if (isOpen && activeTab === 'DEVICE_SCANNER') {
      setTimeout(() => {
        deviceInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen, activeTab]);

  // Hardware Device USB Barcode Scanner Listener
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // If typing in input explicitly, let the input handler manage it
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'SELECT') {
        if (e.key === 'Enter' && manualInput.trim()) {
          handleExecuteScan(manualInput);
        }
        return;
      }

      if (e.key === 'Enter') {
        if (usbBufferRef.current.length > 1) {
          const code = cleanScannedCode(usbBufferRef.current);
          usbBufferRef.current = '';
          setDeviceScanStatus(`⚡ Scanned by Device: ${code}`);
          handleExecuteScan(code);
        }
      } else if (e.key.length === 1) {
        usbBufferRef.current += e.key;
        setDeviceScanStatus(`⚡ Device Scanning Signal Received...`);
        if (usbTimerRef.current) clearTimeout(usbTimerRef.current);
        usbTimerRef.current = setTimeout(() => {
          usbBufferRef.current = '';
          setDeviceScanStatus('Ready & Listening for Hardware Barcode Reader...');
        }, 500);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (usbTimerRef.current) clearTimeout(usbTimerRef.current);
    };
  }, [isOpen, manualInput]);

  // Live Camera Scanner Engine using Html5Qrcode + jsQR Fallback
  useEffect(() => {
    if (!isOpen || activeTab !== 'LIVE_CAMERA') return;

    let html5Qrcode: Html5Qrcode | null = null;
    let scanInterval: any = null;
    let isStopped = false;

    const startScanner = async () => {
      setCameraError(null);

      // 1. Try Html5Qrcode on container element (decodes Code 128, Code 39, EAN-13, QR, Data Matrix)
      try {
        const container = document.getElementById('live-camera-reader-element');
        if (container) {
          html5Qrcode = new Html5Qrcode('live-camera-reader-element', {
            formatsToSupport: [
              Html5QrcodeSupportedFormats.CODE_128,
              Html5QrcodeSupportedFormats.CODE_39,
              Html5QrcodeSupportedFormats.EAN_13,
              Html5QrcodeSupportedFormats.EAN_8,
              Html5QrcodeSupportedFormats.UPC_A,
              Html5QrcodeSupportedFormats.UPC_E,
              Html5QrcodeSupportedFormats.QR_CODE,
              Html5QrcodeSupportedFormats.DATA_MATRIX,
              Html5QrcodeSupportedFormats.ITF,
              Html5QrcodeSupportedFormats.CODABAR,
            ],
            verbose: false,
          });
          await html5Qrcode.start(
            { facingMode: 'environment' },
            {
              fps: 15,
              qrbox: (viewfinderWidth, viewfinderHeight) => {
                return {
                  width: Math.floor(viewfinderWidth * 0.85),
                  height: Math.floor(viewfinderHeight * 0.65),
                };
              },
            },
            (decodedText) => {
              if (isStopped || isScanning) return;
              const code = cleanScannedCode(decodedText);
              if (code) {
                isStopped = true;
                if (html5Qrcode && html5Qrcode.isScanning) {
                  html5Qrcode.stop().catch(() => {});
                }
                handleExecuteScan(code);
              }
            },
            () => {
              // Frame scanning...
            }
          );
          return;
        }
      } catch (e) {
        // Html5Qrcode start failed, fallback to native getUserMedia + jsQR
      }

      // 2. Fallback: Native getUserMedia + jsQR (attemptBoth) + Native BarcodeDetector
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
          });
          streamRef.current = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play();
          }

          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d', { willReadFrequently: true });

          scanInterval = setInterval(async () => {
            const video = videoRef.current;
            if (!video || video.readyState !== 4 || isScanning || isStopped) return;

            const w = video.videoWidth || 640;
            const h = video.videoHeight || 480;
            canvas.width = w;
            canvas.height = h;

            if (ctx) {
              ctx.drawImage(video, 0, 0, w, h);

              // 2a. Full canvas jsQR (attemptBoth for normal & inverted QR codes)
              try {
                const imgData = ctx.getImageData(0, 0, w, h);
                const qrResult = jsQR(imgData.data, w, h, { inversionAttempts: 'attemptBoth' });
                if (qrResult && qrResult.data) {
                  const decoded = cleanScannedCode(qrResult.data);
                  if (decoded) {
                    isStopped = true;
                    handleExecuteScan(decoded);
                    return;
                  }
                }
              } catch {}

              // 2b. Center reticle crop jsQR (boosted accuracy for close-up ID cards)
              try {
                const cropW = Math.floor(w * 0.7);
                const cropH = Math.floor(h * 0.7);
                const cropX = Math.floor(w * 0.15);
                const cropY = Math.floor(h * 0.15);
                const croppedData = ctx.getImageData(cropX, cropY, cropW, cropH);
                const cropResult = jsQR(croppedData.data, cropW, cropH, { inversionAttempts: 'attemptBoth' });
                if (cropResult && cropResult.data) {
                  const decoded = cleanScannedCode(cropResult.data);
                  if (decoded) {
                    isStopped = true;
                    handleExecuteScan(decoded);
                    return;
                  }
                }
              } catch {}

              // 2c. Native BarcodeDetector
              if ('BarcodeDetector' in window) {
                try {
                  const detector = new (window as any).BarcodeDetector({
                    formats: ['qr_code', 'code_128', 'code_39', 'ean_13', 'ean_8', 'upc_a', 'data_matrix'],
                  });
                  const detected = await detector.detect(video);
                  if (detected && detected.length > 0) {
                    const raw = detected[0].rawValue?.trim();
                    if (raw) {
                      const cleaned = cleanScannedCode(raw);
                      isStopped = true;
                      handleExecuteScan(cleaned);
                      return;
                    }
                  }
                } catch {}
              }
            }
          }, 120);
        } else {
          setCameraError('Webcam / Camera access is not supported on this device/browser.');
        }
      } catch (err: any) {
        setCameraError(err.message || 'Camera permission denied or camera device unavailable.');
      }
    };

    startScanner();

    return () => {
      isStopped = true;
      if (scanInterval) clearInterval(scanInterval);
      if (html5Qrcode && html5Qrcode.isScanning) {
        html5Qrcode.stop().catch(() => {}).finally(() => {
          try {
            html5Qrcode?.clear();
          } catch {}
        });
      }
      stopCamera();
    };
  }, [isOpen, activeTab]);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  const handleExecuteScan = (codeToScan?: string) => {
    const defaultFallbackCode = isStudentOrMemberScan
      ? memberCards[0]?.barcode || 'STU-2026-7326'
      : scannerType === 'ISBN'
      ? catalogIsbns[0]?.barcode
      : filteredCopies[0]?.barcode || availableCopies[0]?.barcode || 'BC-99201';

    const rawCode = (codeToScan || manualInput || selectedBarcode || defaultFallbackCode).trim();
    const code = cleanScannedCode(rawCode);
    if (!code) return;

    setIsScanning(true);
    setTimeout(() => {
      setIsScanning(false);
      stopCamera();
      onScanSuccess(code);
      onClose();
    }, 200);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-2xl bg-blue-500/20 border border-blue-400/30 text-blue-300">
              <ScanBarcode className="h-6 w-6" />
            </span>
            <div>
              <h3 className="font-bold text-lg font-poppins text-white">{effectiveTitle}</h3>
              <p className="text-xs text-slate-300">
                Choose Device System Barcode Reader or Live Camera Input
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* TWO OPTIONS SWITCHER - Clean Layout */}
          <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1.5 rounded-2xl">
            <button
              type="button"
              onClick={() => setActiveTab('DEVICE_SCANNER')}
              className={`h-12 px-3 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 text-xs sm:text-sm font-bold text-center ${
                activeTab === 'DEVICE_SCANNER'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <ScanBarcode className="w-4.5 h-4.5 shrink-0" />
              <span>Barcode Scanner</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('LIVE_CAMERA')}
              className={`h-12 px-3 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 text-xs sm:text-sm font-bold text-center ${
                activeTab === 'LIVE_CAMERA'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Camera className="w-4.5 h-4.5 shrink-0" />
              <span>Live Camera</span>
            </button>
          </div>

          {/* OPTION 1: BARCODE SCANNER WITH DEVICE SYSTEM */}
          {activeTab === 'DEVICE_SCANNER' && (
            <div className="space-y-4">
              {/* Device Status Indicator Box */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 to-indigo-950 text-white space-y-2 border border-slate-800 shadow-md">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                    </span>
                    <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                      Hardware System Scanner Active
                    </span>
                  </div>
                  <Cpu className="w-4 h-4 text-blue-400" />
                </div>
                <p className="text-xs text-slate-300">
                  {deviceScanStatus}
                </p>
                <div className="flex items-center gap-2 text-[11px] text-slate-400 pt-1 border-t border-slate-800">
                  <Wifi className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  <span>Supports USB / Bluetooth Handheld Readers & Direct Keyboard Scans</span>
                </div>
              </div>

              {/* Direct Hardware Input Input Field */}
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  {isStudentOrMemberScan
                    ? 'Scan Card Barcode / QR with Device Scanner or Type Student ID:'
                    : 'Scan Barcode with Device Scanner or Type Code:'}
                </label>
                <div className="flex gap-2">
                  <input
                    ref={deviceInputRef}
                    type="text"
                    placeholder={
                      isStudentOrMemberScan
                        ? 'Point device scanner & click card, e.g. STU-2026-7326'
                        : 'Point device scanner, e.g. 978-0134610993 or BC-99201'
                    }
                    value={manualInput}
                    onChange={(e) => {
                      setManualInput(e.target.value);
                      setSelectedBarcode('');
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && manualInput.trim()) {
                        handleExecuteScan(manualInput);
                      }
                    }}
                    className="flex-1 px-3.5 py-3 rounded-2xl border-2 border-blue-300 text-xs sm:text-sm font-mono font-bold focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none uppercase bg-blue-50/20"
                  />
                  <button
                    type="button"
                    onClick={() => handleExecuteScan(manualInput)}
                    disabled={!manualInput.trim()}
                    className="px-5 py-3 bg-slate-900 text-white rounded-2xl text-xs font-bold hover:bg-slate-800 disabled:opacity-40 transition-all cursor-pointer shrink-0"
                  >
                    Confirm
                  </button>
                </div>
              </div>

              {/* Student / Member Registered ID Dropdown Selector */}
              {isStudentOrMemberScan && (
                <div className="space-y-2 pt-1 border-t border-slate-100">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                    Select Registered Student / Member Library Card ID:
                  </label>
                  <select
                    value={selectedBarcode}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSelectedBarcode(val);
                      setManualInput('');
                      if (val) {
                        handleExecuteScan(val);
                      }
                    }}
                    className="w-full p-3 rounded-2xl border border-slate-200 text-xs sm:text-sm font-semibold text-slate-900 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer"
                  >
                    <option value="">-- Select Registered Student ID --</option>
                    {memberCards.map((m) => (
                      <option key={m.id} value={m.barcode}>
                        Card ID: {m.barcode} — {m.name} ({m.department}) [{m.role}]
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Selected Member Details Preview Card */}
              {isStudentOrMemberScan && currentMemberObj && (
                <div className="p-3.5 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl flex items-center justify-between gap-3 animate-fade-in">
                  <div className="flex items-center gap-3">
                    <img
                      src={currentMemberObj.avatarUrl}
                      alt={currentMemberObj.name}
                      className="w-10 h-10 rounded-full object-cover border border-blue-300 shrink-0"
                    />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-xs text-slate-900">{currentMemberObj.name}</span>
                        <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-blue-600 text-white">
                          {currentMemberObj.role}
                        </span>
                      </div>
                      <p className="text-[11px] font-mono font-bold text-blue-700">{currentMemberObj.barcode}</p>
                      <p className="text-[10px] text-slate-500">{currentMemberObj.department}</p>
                    </div>
                  </div>
                  <UserCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                </div>
              )}

              {/* Book ISBN Selector */}
              {!isStudentOrMemberScan && scannerType !== 'COPY_BARCODE' && (
                <div className="space-y-1.5 pt-1 border-t border-slate-100">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                    Select Book ISBN Barcode:
                  </label>
                  <select
                    value={selectedIsbnFilter || (scannerType === 'ISBN' ? selectedBarcode : '')}
                    onChange={(e) => {
                      const isbn = e.target.value;
                      setSelectedIsbnFilter(isbn);
                      if (scannerType === 'ISBN') {
                        setSelectedBarcode(isbn);
                        if (isbn) handleExecuteScan(isbn);
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
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer"
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

              {/* Accession Copy Barcode Selector */}
              {!isStudentOrMemberScan && scannerType !== 'ISBN' && (
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                    Select Accession Copy Barcode:
                  </label>
                  <select
                    value={selectedBarcode}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSelectedBarcode(val);
                      setManualInput('');
                      if (val) {
                        handleExecuteScan(val);
                      }
                    }}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer"
                  >
                    <option value="">
                      {selectedIsbnFilter
                        ? `-- Choose Accession Copy (${filteredCopies.length} Available) --`
                        : '-- Choose Accession Barcode --'}
                    </option>
                    {filteredCopies.map((item, idx) => (
                      <option key={idx} value={item.barcode}>
                        Barcode: {item.barcode} ({item.accessionNo}) - {item.bookTitle} {item.isReferenceOnly ? '🚫 [REFERENCE ONLY]' : `[${item.status}]`}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {/* OPTION 2: LIVE CAMERA */}
          {activeTab === 'LIVE_CAMERA' && (
            <div className="space-y-4">
              {cameraError && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2 font-medium">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>{cameraError}</span>
                </div>
              )}

              <div
                className="relative h-64 rounded-2xl bg-slate-950 overflow-hidden flex flex-col items-center justify-center border-2 border-slate-800 shadow-inner group transition-all"
              >
                {/* HTML5 QRCODE CONTAINER */}
                <div id="live-camera-reader-element" className="w-full h-full object-cover overflow-hidden rounded-2xl" />
                <video ref={videoRef} className="w-full h-full object-cover hidden" autoPlay playsInline muted />

                {/* Scan Feedback Overlay */}
                {isScanning && (
                  <div className="absolute inset-0 bg-emerald-500/40 animate-pulse pointer-events-none z-20 flex items-center justify-center">
                    <span className="px-4 py-2.5 rounded-2xl bg-emerald-600 text-white font-extrabold text-xs shadow-lg animate-bounce">
                      ⚡ Card Barcode / QR Code Detected! Processing...
                    </span>
                  </div>
                )}

                {/* Reticle Target Corners */}
                <div className="absolute top-4 left-4 w-8 h-8 border-t-4 border-l-4 border-emerald-400 pointer-events-none z-10" />
                <div className="absolute top-4 right-4 w-8 h-8 border-t-4 border-r-4 border-emerald-400 pointer-events-none z-10" />
                <div className="absolute bottom-4 left-4 w-8 h-8 border-b-4 border-l-4 border-emerald-400 pointer-events-none z-10" />
                <div className="absolute bottom-4 right-4 w-8 h-8 border-b-4 border-r-4 border-emerald-400 pointer-events-none z-10" />

                {/* Laser Line */}
                <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_15px_#34d399] animate-pulse my-auto z-10 pointer-events-none" />

                <div className="absolute bottom-3 flex items-center gap-2 text-xs font-bold text-slate-200 bg-slate-900/90 px-4 py-2 rounded-full border border-slate-700 shadow-md backdrop-blur-xs z-10">
                  <Camera className="h-4 w-4 text-emerald-400 animate-spin" />
                  <span>
                    {isScanning
                      ? '⚡ Decoding Card Barcode / QR Code...'
                      : 'Align Barcode or QR Code in Frame'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center gap-3 shrink-0">
          <button
            onClick={() => handleExecuteScan(selectedBarcode || manualInput)}
            disabled={isScanning}
            className="flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-sm shadow-md hover:opacity-95 disabled:opacity-50 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <ScanBarcode className="h-4 w-4" />
            <span>
              {isScanning
                ? 'Scanning & Processing...'
                : isStudentOrMemberScan
                ? 'Scan Student / Member ID Card'
                : 'Scan Selected Barcode'}
            </span>
          </button>
          <button
            onClick={onClose}
            className="px-6 py-3.5 rounded-2xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-white transition-all cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

