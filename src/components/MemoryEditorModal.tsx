import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  X,
  HardDrive,
  Cpu,
  Search,
  Download,
  Upload,
  RefreshCw,
  Edit3,
  CheckCircle2,
  AlertTriangle,
  FileCode,
  Sparkles,
  Layers,
  ArrowRight,
  Copy,
  Check,
  Binary,
  Hash,
  FileText,
  Sliders,
  HelpCircle,
} from 'lucide-react';
import { Avr8jsRunner } from '../utils/avr8jsEngine';

interface MemoryEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  eepromData: Uint8Array;
  flashData: Uint8Array;
  avrRunner?: Avr8jsRunner | null;
  onSaveEeprom: (data: Uint8Array) => void;
  onSaveFlash: (data: Uint8Array) => void;
}

type MemoryType = 'eeprom' | 'flash';
type ViewFormat = 'hex' | 'dec' | 'bin' | 'ascii';

interface ValidationIssue {
  type: 'error' | 'warning' | 'info';
  message: string;
  suggestion?: {
    label: string;
    apply: () => void;
  };
}

export const MemoryEditorModal: React.FC<MemoryEditorModalProps> = ({
  isOpen,
  onClose,
  eepromData,
  flashData,
  avrRunner,
  onSaveEeprom,
  onSaveFlash,
}) => {
  const [selectedMem, setSelectedMem] = useState<MemoryType>('eeprom');
  const [viewFormat, setViewFormat] = useState<ViewFormat>('hex');
  const [pageOffset, setPageOffset] = useState<number>(0);
  const [pageSize, setPageSize] = useState<number>(256); // 256 bytes per view page
  const [selectedAddr, setSelectedAddr] = useState<number | null>(0);

  // Local working copy of memory buffers
  const [localEeprom, setLocalEeprom] = useState<Uint8Array>(new Uint8Array(1024).fill(0xff));
  const [localFlash, setLocalFlash] = useState<Uint8Array>(new Uint8Array(32768));

  // Edit single cell input
  const [cellEditInput, setCellEditInput] = useState<string>('');
  const [cellEditAddr, setCellEditAddr] = useState<number | null>(null);

  // Search filter
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchMatchAddrs, setSearchMatchAddrs] = useState<number[]>([]);

  // Bulk input / Text injection tool
  const [bulkMode, setBulkMode] = useState<'text' | 'hex' | 'c_array'>('text');
  const [bulkStartAddr, setBulkStartAddr] = useState<string>('0x0000');
  const [bulkInputText, setBulkInputText] = useState<string>('');
  const [copiedSuccess, setCopiedSuccess] = useState<boolean>(false);
  const [fileImportStatus, setFileImportStatus] = useState<string | null>(null);

  // Initialize buffers from props when opened
  useEffect(() => {
    if (isOpen) {
      const eepromSource = avrRunner ? avrRunner.getEepromBytes() : eepromData;
      const flashSource = avrRunner ? avrRunner.getFlashBytes() : flashData;

      const newEep = new Uint8Array(1024);
      if (eepromSource && eepromSource.length > 0) {
        newEep.set(eepromSource.subarray(0, 1024));
      } else {
        newEep.fill(0xff);
      }
      setLocalEeprom(newEep);

      const newFl = new Uint8Array(32768);
      if (flashSource && flashSource.length > 0) {
        newFl.set(flashSource.subarray(0, 32768));
      }
      setLocalFlash(newFl);
    }
  }, [isOpen, selectedMem, avrRunner]);

  const activeBuffer = selectedMem === 'eeprom' ? localEeprom : localFlash;
  const maxCapacity = selectedMem === 'eeprom' ? 1024 : 32768;
  const totalPages = Math.ceil(maxCapacity / pageSize);
  const currentPage = Math.floor(pageOffset / pageSize);

  // Validation engine on bulk input & address
  const validationIssues: ValidationIssue[] = useMemo(() => {
    const issues: ValidationIssue[] = [];
    const parsedStart = parseInt(bulkStartAddr, 16) || parseInt(bulkStartAddr, 10) || 0;

    if (isNaN(parsedStart) || parsedStart < 0 || parsedStart >= maxCapacity) {
      issues.push({
        type: 'error',
        message: `Érvénytelen kezdőcím: a ${selectedMem.toUpperCase()} tartomány 0x0000 - 0x${(maxCapacity - 1).toString(16).toUpperCase()} (0 - ${maxCapacity - 1}) között lehet.`,
        suggestion: {
          label: 'Kezdőcím visszaállítása 0x0000-ra',
          apply: () => setBulkStartAddr('0x0000'),
        },
      });
    }

    if (bulkInputText.trim().length > 0) {
      if (bulkMode === 'hex') {
        const clean = bulkInputText.replace(/[\s,;0x\n\r]/gi, '');
        const invalidChars = clean.match(/[^0-9a-fA-F]/g);
        if (invalidChars && invalidChars.length > 0) {
          issues.push({
            type: 'error',
            message: `A hexadecimális bemenet nem megengedett karaktereket tartalmaz: "${Array.from(new Set(invalidChars)).join(', ')}". Csak 0-9 és A-F karakterek fogadhatók el.`,
            suggestion: {
              label: 'Érvénytelen karakterek automatikus szűrése',
              apply: () => setBulkInputText(bulkInputText.replace(/[^0-9a-fA-F\s]/g, '')),
            },
          });
        }
        if (clean.length % 2 !== 0 && !invalidChars) {
          issues.push({
            type: 'warning',
            message: `Páratlan számú hexadecimális karakter (${clean.length}). Az utolsó bájt hiányos félbájt (nibble).`,
            suggestion: {
              label: 'Vezető nulla hozzáadása (0-val kiegészítés)',
              apply: () => setBulkInputText(clean + '0'),
            },
          });
        }

        const byteLen = Math.floor(clean.length / 2);
        if (parsedStart + byteLen > maxCapacity) {
          issues.push({
            type: 'warning',
            message: `Túlcsordulás: a megadott ${byteLen} bájt a 0x${parsedStart.toString(16)} címtől kezdve túllépi a memóriakorlátot (${parsedStart + byteLen} > ${maxCapacity}).`,
            suggestion: {
              label: `Automatikus csonkolás ${maxCapacity - parsedStart} bájtra`,
              apply: () => {
                const fitBytes = maxCapacity - parsedStart;
                setBulkInputText(clean.slice(0, fitBytes * 2));
              },
            },
          });
        }
      } else if (bulkMode === 'text') {
        const byteLen = new TextEncoder().encode(bulkInputText).length;
        if (parsedStart + byteLen > maxCapacity) {
          issues.push({
            type: 'warning',
            message: `A szöveg hossza (${byteLen} bájt) meghaladja a rendelkezésre álló memóriaterületet.`,
          });
        }
      }
    }

    return issues;
  }, [bulkInputText, bulkMode, bulkStartAddr, maxCapacity, selectedMem]);

  // Handle single byte edit
  const handleSaveCellEdit = (addr: number) => {
    let numVal: number | null = null;
    const raw = cellEditInput.trim();

    if (viewFormat === 'hex') {
      const clean = raw.startsWith('0x') ? raw.slice(2) : raw;
      const parsed = parseInt(clean, 16);
      if (!isNaN(parsed) && parsed >= 0 && parsed <= 255) {
        numVal = parsed;
      }
    } else if (viewFormat === 'dec') {
      const parsed = parseInt(raw, 10);
      if (!isNaN(parsed) && parsed >= 0 && parsed <= 255) {
        numVal = parsed;
      }
    } else if (viewFormat === 'bin') {
      const clean = raw.replace(/[^01]/g, '');
      const parsed = parseInt(clean, 2);
      if (!isNaN(parsed) && parsed >= 0 && parsed <= 255) {
        numVal = parsed;
      }
    } else if (viewFormat === 'ascii') {
      if (raw.length > 0) {
        numVal = raw.charCodeAt(0) & 0xff;
      }
    }

    if (numVal !== null) {
      const newBuf = new Uint8Array(activeBuffer);
      newBuf[addr] = numVal;
      if (selectedMem === 'eeprom') {
        setLocalEeprom(newBuf);
      } else {
        setLocalFlash(newBuf);
      }
    }

    setCellEditAddr(null);
    setCellEditInput('');
  };

  // Search logic
  const handlePerformSearch = () => {
    if (!searchQuery.trim()) {
      setSearchMatchAddrs([]);
      return;
    }
    const q = searchQuery.trim().toLowerCase();
    const matches: number[] = [];

    // Search by address hex (e.g. 0x01A0 or 1A0)
    const addrParse = parseInt(q.startsWith('0x') ? q : `0x${q}`, 16);
    if (!isNaN(addrParse) && addrParse >= 0 && addrParse < maxCapacity) {
      matches.push(addrParse);
    }

    // Search by byte value (Hex e.g. "42", Dec e.g. "66", ASCII character)
    for (let i = 0; i < maxCapacity; i++) {
      const b = activeBuffer[i];
      const hexStr = b.toString(16).padStart(2, '0').toLowerCase();
      const decStr = b.toString(10);
      const charStr = b >= 32 && b <= 126 ? String.fromCharCode(b).toLowerCase() : '';

      if (hexStr === q || decStr === q || charStr === q) {
        if (!matches.includes(i)) matches.push(i);
      }
    }

    setSearchMatchAddrs(matches);
    if (matches.length > 0) {
      const first = matches[0];
      setSelectedAddr(first);
      const targetPage = Math.floor(first / pageSize);
      setPageOffset(targetPage * pageSize);
    }
  };

  // Quick Memory Operations
  const handleFillPattern = (pattern: '0xFF' | '0x00' | '0xAA' | 'inc' | 'random') => {
    const newBuf = new Uint8Array(maxCapacity);
    for (let i = 0; i < maxCapacity; i++) {
      if (pattern === '0xFF') newBuf[i] = 0xff;
      else if (pattern === '0x00') newBuf[i] = 0x00;
      else if (pattern === '0xAA') newBuf[i] = 0xaa;
      else if (pattern === 'inc') newBuf[i] = i & 0xff;
      else if (pattern === 'random') newBuf[i] = Math.floor(Math.random() * 256);
    }
    if (selectedMem === 'eeprom') {
      setLocalEeprom(newBuf);
    } else {
      setLocalFlash(newBuf);
    }
  };

  // Apply Bulk Input
  const handleApplyBulk = () => {
    const parsedStart = parseInt(bulkStartAddr, 16) || parseInt(bulkStartAddr, 10) || 0;
    if (isNaN(parsedStart) || parsedStart < 0 || parsedStart >= maxCapacity) return;

    const newBuf = new Uint8Array(activeBuffer);

    if (bulkMode === 'text') {
      const encoder = new TextEncoder();
      const bytes = encoder.encode(bulkInputText);
      for (let i = 0; i < bytes.length; i++) {
        if (parsedStart + i < maxCapacity) {
          newBuf[parsedStart + i] = bytes[i];
        }
      }
    } else if (bulkMode === 'hex') {
      const clean = bulkInputText.replace(/[^0-9a-fA-F]/g, '');
      const numBytes = Math.floor(clean.length / 2);
      for (let i = 0; i < numBytes; i++) {
        const hexByte = clean.substr(i * 2, 2);
        const val = parseInt(hexByte, 16);
        if (parsedStart + i < maxCapacity) {
          newBuf[parsedStart + i] = val;
        }
      }
    } else if (bulkMode === 'c_array') {
      // Parse numbers from C array format: { 0x12, 0x34, 56, ... }
      const matches = bulkInputText.match(/(0x[0-9a-fA-F]+|\d+)/g);
      if (matches) {
        matches.forEach((token, idx) => {
          let val = token.startsWith('0x') ? parseInt(token, 16) : parseInt(token, 10);
          if (!isNaN(val) && parsedStart + idx < maxCapacity) {
            newBuf[parsedStart + idx] = val & 0xff;
          }
        });
      }
    }

    if (selectedMem === 'eeprom') {
      setLocalEeprom(newBuf);
    } else {
      setLocalFlash(newBuf);
    }

    setBulkInputText('');
  };

  // Save to Application State and Avr8jsRunner
  const handleCommitChanges = () => {
    if (selectedMem === 'eeprom') {
      onSaveEeprom(localEeprom);
      if (avrRunner) {
        avrRunner.setEepromBytes(localEeprom);
      }
    } else {
      onSaveFlash(localFlash);
      if (avrRunner) {
        avrRunner.setFlashBytes(localFlash);
      }
    }
    onClose();
  };

  // Export Memory to File (.bin / .hex)
  const handleExportFile = (format: 'bin' | 'hex' | 'c_array') => {
    if (format === 'bin') {
      const blob = new Blob([activeBuffer], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `arduino_${selectedMem}_${Date.now()}.bin`;
      a.click();
      URL.revokeObjectURL(url);
    } else if (format === 'hex') {
      // Generate formatted hex dump text
      let dump = `; Arduino ${selectedMem.toUpperCase()} Memory Dump (${maxCapacity} Bytes)\n`;
      for (let r = 0; r < maxCapacity; r += 16) {
        const addrStr = r.toString(16).toUpperCase().padStart(4, '0');
        const slice = activeBuffer.subarray(r, r + 16);
        const sliceArr = Array.from(slice) as number[];
        const hexParts = sliceArr.map((b) => b.toString(16).toUpperCase().padStart(2, '0')).join(' ');
        const asciiParts = sliceArr.map((b) => (b >= 32 && b <= 126 ? String.fromCharCode(b) : '.')).join('');
        dump += `${addrStr}: ${hexParts.padEnd(48, ' ')} | ${asciiParts}\n`;
      }
      const blob = new Blob([dump], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `arduino_${selectedMem}_dump.txt`;
      a.click();
      URL.revokeObjectURL(url);
    } else if (format === 'c_array') {
      let code = `// Arduino ${selectedMem.toUpperCase()} Data Array\nconst uint8_t PROGMEM ${selectedMem}_data[${maxCapacity}] = {\n`;
      for (let r = 0; r < maxCapacity; r += 16) {
        const slice = activeBuffer.subarray(r, r + 16);
        const sliceArr = Array.from(slice) as number[];
        const hexVals = sliceArr.map((b) => `0x${b.toString(16).toUpperCase().padStart(2, '0')}`).join(', ');
        code += `  ${hexVals},\n`;
      }
      code += `};\n`;
      navigator.clipboard.writeText(code);
      setCopiedSuccess(true);
      setTimeout(() => setCopiedSuccess(false), 2500);
    }
  };

  // Import Memory from File
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const result = event.target?.result;
        if (result instanceof ArrayBuffer) {
          const rawBytes = new Uint8Array(result);
          const newBuf = new Uint8Array(activeBuffer);
          const copyLen = Math.min(rawBytes.length, maxCapacity);
          newBuf.set(rawBytes.subarray(0, copyLen));
          if (selectedMem === 'eeprom') setLocalEeprom(newBuf);
          else setLocalFlash(newBuf);
          setFileImportStatus(`Sikeresen betöltve: ${copyLen} bájt!`);
        } else if (typeof result === 'string') {
          // Attempt parsing hex or text
          if (result.includes(':')) {
            // Probably Intel HEX or Hex dump
            const matches = result.match(/[0-9a-fA-F]{2}/g);
            if (matches) {
              const newBuf = new Uint8Array(activeBuffer);
              const copyLen = Math.min(matches.length, maxCapacity);
              for (let i = 0; i < copyLen; i++) {
                newBuf[i] = parseInt(matches[i], 16);
              }
              if (selectedMem === 'eeprom') setLocalEeprom(newBuf);
              else setLocalFlash(newBuf);
              setFileImportStatus(`Sikeresen beolvasva: ${copyLen} bájt!`);
            }
          }
        }
      } catch (err: any) {
        setFileImportStatus(`Importálási hiba: ${err?.message || 'Ismeretlen hiba'}`);
      }
      setTimeout(() => setFileImportStatus(null), 4000);
    };

    if (file.name.endsWith('.bin') || file.type.includes('octet')) {
      reader.readAsArrayBuffer(file);
    } else {
      reader.readAsText(file);
    }
  };

  if (!isOpen) return null;

  // Selected byte details for inspector panel
  const inspectedByte = selectedAddr !== null ? activeBuffer[selectedAddr] : null;

  // Generate 16-byte rows for the visible page
  const pageStart = pageOffset;
  const pageEnd = Math.min(pageOffset + pageSize, maxCapacity);
  const rows: { addr: number; bytes: number[] }[] = [];
  for (let addr = pageStart; addr < pageEnd; addr += 16) {
    const rowBytes: number[] = [];
    for (let c = 0; c < 16; c++) {
      if (addr + c < maxCapacity) {
        rowBytes.push(activeBuffer[addr + c]);
      }
    }
    rows.push({ addr, bytes: rowBytes });
  }

  return (
    <div
      id="memory-editor-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
    >
      <div
        id="memory-editor-modal-container"
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-6xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-scaleIn"
        onClick={(e) => e.stopPropagation()}
      >
        {/* MODAL HEADER */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              <HardDrive className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  Arduino Memória & EEPROM Szerkesztő
                </h2>
                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60">
                  ATmega328P
                </span>
                {avrRunner && (
                  <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 flex items-center gap-1">
                    <Check className="w-3 h-3" /> Avr8js Szinkronizálva
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                1024 Bájt Belső Nem-felejtő EEPROM & 32KB Flash Programmemória élő vizsgálata és írása
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="close-memory-editor-btn"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Bezárás"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* CONTROLS BAR: Target selection, Format switcher & Tools */}
        <div className="px-6 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-900/50 flex flex-wrap items-center justify-between gap-3">
          {/* Memory Target Switcher */}
          <div className="flex items-center bg-slate-200/80 dark:bg-slate-800/80 p-1 rounded-xl">
            <button
              id="select-eeprom-tab"
              onClick={() => {
                setSelectedMem('eeprom');
                setPageOffset(0);
                setSelectedAddr(0);
              }}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                selectedMem === 'eeprom'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <HardDrive className="w-3.5 h-3.5" />
              EEPROM (1024 B)
            </button>
            <button
              id="select-flash-tab"
              onClick={() => {
                setSelectedMem('flash');
                setPageOffset(0);
                setSelectedAddr(0);
              }}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                selectedMem === 'flash'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              Flash PROGMEM (32 KB)
            </button>
          </div>

          {/* View Format Switcher */}
          <div className="flex items-center gap-1 bg-slate-200/80 dark:bg-slate-800/80 p-1 rounded-xl text-xs font-semibold">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 px-2">Nézet:</span>
            <button
              id="view-format-hex"
              onClick={() => setViewFormat('hex')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                viewFormat === 'hex' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-bold' : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              HEX (16)
            </button>
            <button
              id="view-format-dec"
              onClick={() => setViewFormat('dec')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                viewFormat === 'dec' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-bold' : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              DEC (10)
            </button>
            <button
              id="view-format-bin"
              onClick={() => setViewFormat('bin')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                viewFormat === 'bin' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-bold' : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              BIN (2)
            </button>
            <button
              id="view-format-ascii"
              onClick={() => setViewFormat('ascii')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                viewFormat === 'ascii' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-bold' : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              ASCII (Szöveg)
            </button>
          </div>

          {/* Quick Tools & Fill Buttons */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <input
                id="memory-search-input"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handlePerformSearch()}
                placeholder="Keresés: cím vagy érték (pl. 0x20, 66, 'A')..."
                className="w-56 pl-8 pr-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            </div>

            {/* Fill Presets */}
            <div className="flex items-center gap-1">
              <button
                id="fill-pattern-ff"
                onClick={() => handleFillPattern('0xFF')}
                title="Törlés (Minden cella 0xFF - Törölt EEPROM állapot)"
                className="px-2 py-1.5 text-xs font-medium bg-slate-200/70 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg transition-colors"
              >
                0xFF Törlés
              </button>
              <button
                id="fill-pattern-00"
                onClick={() => handleFillPattern('0x00')}
                title="Nullázás (Minden cella 0x00)"
                className="px-2 py-1.5 text-xs font-medium bg-slate-200/70 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg transition-colors"
              >
                0x00 Nullázás
              </button>
            </div>
          </div>
        </div>

        {/* MAIN BODY: 2 COLUMNS (Memory Hex Table Grid & Inspector / Bulk Tools) */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-3 gap-0 divide-y lg:divide-y-0 lg:divide-x divide-slate-200 dark:divide-slate-800 min-h-[420px]">
          {/* LEFT 2 COLUMNS: MEMORY DUMP / HEX GRID */}
          <div className="lg:col-span-2 flex flex-col h-full overflow-hidden bg-slate-950 font-mono text-slate-200">
            {/* Table Column Headers */}
            <div className="px-4 py-2 border-b border-slate-800 bg-slate-900/90 text-xs font-bold text-slate-400 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="w-16">CÍM (Hex)</span>
                <span className="tracking-wider">
                  {viewFormat === 'bin' ? '00 01 02 03 ... 07' : '00 01 02 03 04 05 06 07  08 09 0A 0B 0C 0D 0E 0F'}
                </span>
              </div>
              <span className="hidden sm:inline text-right w-24">ASCII / Szöveg</span>
            </div>

            {/* Scrollable Hex Rows */}
            <div className="flex-1 overflow-y-auto p-3 space-y-1 select-text">
              {rows.map((row) => {
                const rowAddrHex = `0x${row.addr.toString(16).toUpperCase().padStart(4, '0')}`;

                return (
                  <div
                    key={row.addr}
                    className="flex items-center justify-between text-xs py-0.5 px-1.5 rounded hover:bg-slate-800/60 transition-colors group"
                  >
                    {/* Offset / Address */}
                    <span className="w-16 text-amber-400/90 font-semibold select-none">
                      {rowAddrHex}:
                    </span>

                    {/* Byte values */}
                    <div className="flex-1 flex flex-wrap items-center gap-1 sm:gap-1.5 mx-2">
                      {row.bytes.map((b, idx) => {
                        const cellAddr = row.addr + idx;
                        const isSelected = selectedAddr === cellAddr;
                        const isSearchMatch = searchMatchAddrs.includes(cellAddr);
                        const isNonErased = selectedMem === 'eeprom' ? b !== 0xff : b !== 0x00;
                        const isEditing = cellEditAddr === cellAddr;

                        // Formatting
                        let displayStr = '';
                        if (viewFormat === 'hex') {
                          displayStr = b.toString(16).toUpperCase().padStart(2, '0');
                        } else if (viewFormat === 'dec') {
                          displayStr = b.toString(10).padStart(3, ' ');
                        } else if (viewFormat === 'bin') {
                          displayStr = b.toString(2).padStart(8, '0');
                        } else if (viewFormat === 'ascii') {
                          displayStr = b >= 32 && b <= 126 ? String.fromCharCode(b) : '·';
                        }

                        if (isEditing) {
                          return (
                            <input
                              key={cellAddr}
                              type="text"
                              autoFocus
                              value={cellEditInput}
                              onChange={(e) => setCellEditInput(e.target.value)}
                              onBlur={() => handleSaveCellEdit(cellAddr)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveCellEdit(cellAddr);
                                if (e.key === 'Escape') setCellEditAddr(null);
                              }}
                              className="w-9 px-0.5 text-center bg-amber-500 text-slate-950 font-bold rounded outline-none shadow-md text-xs"
                            />
                          );
                        }

                        return (
                          <button
                            key={cellAddr}
                            id={`mem-cell-${cellAddr}`}
                            onClick={() => {
                              setSelectedAddr(cellAddr);
                            }}
                            onDoubleClick={() => {
                              setSelectedAddr(cellAddr);
                              setCellEditAddr(cellAddr);
                              setCellEditInput(
                                viewFormat === 'hex'
                                  ? b.toString(16).toUpperCase().padStart(2, '0')
                                  : b.toString(10)
                              );
                            }}
                            className={`px-1 py-0.5 rounded text-center transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-amber-500 text-slate-950 font-extrabold ring-2 ring-amber-300'
                                : isSearchMatch
                                ? 'bg-purple-600 text-white font-bold animate-pulse'
                                : isNonErased
                                ? 'text-emerald-400 font-bold bg-emerald-950/40 hover:bg-emerald-900/60'
                                : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
                            }`}
                            title={`Cím: 0x${cellAddr.toString(16).toUpperCase()} (${cellAddr})\nÉrték: 0x${b.toString(16).toUpperCase()} | Dec: ${b} | ASCII: ${b >= 32 && b <= 126 ? String.fromCharCode(b) : 'N/A'}\n(Dupla kattintás szerkesztéshez)`}
                          >
                            {displayStr}
                          </button>
                        );
                      })}
                    </div>

                    {/* ASCII preview column on right */}
                    <div className="hidden sm:flex items-center text-slate-400 tracking-wider text-[11px] w-24 overflow-hidden border-l border-slate-800 pl-2">
                      {row.bytes.map((b) => (b >= 32 && b <= 126 ? String.fromCharCode(b) : '·')).join('')}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination Controls */}
            <div className="px-4 py-2.5 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <span>
                  Oldal: {currentPage + 1} / {totalPages} (Tartomány: 0x{pageStart.toString(16).toUpperCase()} - 0x
                  {(pageEnd - 1).toString(16).toUpperCase()})
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  id="mem-page-prev"
                  disabled={pageOffset === 0}
                  onClick={() => setPageOffset(Math.max(0, pageOffset - pageSize))}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed rounded text-slate-200 font-medium transition-colors"
                >
                  ◀ Előző
                </button>
                <button
                  id="mem-page-next"
                  disabled={pageEnd >= maxCapacity}
                  onClick={() => setPageOffset(pageOffset + pageSize)}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed rounded text-slate-200 font-medium transition-colors"
                >
                  Következő ▶
                </button>
              </div>
            </div>
          </div>

          {/* RIGHT 1 COLUMN: INSPECTOR & SMART DATA ENTRY / VALIDATION */}
          <div className="flex flex-col h-full overflow-y-auto bg-white dark:bg-slate-900 p-4 space-y-4 text-xs">
            {/* INSPECTOR CARD */}
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 space-y-2.5">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Sliders className="w-4 h-4 text-amber-500" />
                  Kijelölt Cella Inspektora
                </h3>
                {selectedAddr !== null && (
                  <span className="font-mono font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                    0x{selectedAddr.toString(16).toUpperCase().padStart(4, '0')} ({selectedAddr})
                  </span>
                )}
              </div>

              {selectedAddr !== null && inspectedByte !== null ? (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                    <div className="bg-white dark:bg-slate-800 p-2 rounded-lg border border-slate-200 dark:border-slate-700">
                      <span className="text-slate-400 text-[10px] block">HEXADECIMÁLIS</span>
                      <span className="text-sm font-bold text-slate-900 dark:text-white">
                        0x{inspectedByte.toString(16).toUpperCase().padStart(2, '0')}
                      </span>
                    </div>
                    <div className="bg-white dark:bg-slate-800 p-2 rounded-lg border border-slate-200 dark:border-slate-700">
                      <span className="text-slate-400 text-[10px] block">DECIMÁLIS</span>
                      <span className="text-sm font-bold text-slate-900 dark:text-white">{inspectedByte}</span>
                    </div>
                    <div className="bg-white dark:bg-slate-800 p-2 rounded-lg border border-slate-200 dark:border-slate-700">
                      <span className="text-slate-400 text-[10px] block">BINÁRIS</span>
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        0b{inspectedByte.toString(2).padStart(8, '0')}
                      </span>
                    </div>
                    <div className="bg-white dark:bg-slate-800 p-2 rounded-lg border border-slate-200 dark:border-slate-700">
                      <span className="text-slate-400 text-[10px] block">ASCII KARAKTER</span>
                      <span className="text-sm font-bold text-amber-600 dark:text-amber-400">
                        {inspectedByte >= 32 && inspectedByte <= 126 ? `'${String.fromCharCode(inspectedByte)}'` : 'Nem nyomtatható'}
                      </span>
                    </div>
                  </div>

                  {/* Quick Edit Input */}
                  <div className="pt-2 flex items-center gap-2">
                    <input
                      id="inspector-quick-edit-input"
                      type="text"
                      placeholder="Új érték (Hex: 0x42 / Dec: 66 / 'A')"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          const target = e.currentTarget;
                          const raw = target.value.trim();
                          let val: number | null = null;
                          if (raw.startsWith('0x')) val = parseInt(raw, 16);
                          else if (raw.startsWith("'") && raw.length >= 2) val = raw.charCodeAt(1);
                          else val = parseInt(raw, 10);

                          if (val !== null && !isNaN(val) && val >= 0 && val <= 255) {
                            const newBuf = new Uint8Array(activeBuffer);
                            newBuf[selectedAddr] = val;
                            if (selectedMem === 'eeprom') setLocalEeprom(newBuf);
                            else setLocalFlash(newBuf);
                            target.value = '';
                          }
                        }
                      }}
                      className="flex-1 px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-mono text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                    <span className="text-[10px] text-slate-400">Enter = Mentés</span>
                  </div>
                </div>
              ) : (
                <p className="text-slate-400 italic">Válassz ki egy bájtot a bal oldali táblázatból!</p>
              )}
            </div>

            {/* BULK DATA ENTRY & STRING INJECTION */}
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Edit3 className="w-4 h-4 text-sky-500" />
                  Csoportos Adatbevitel & Szövegírás
                </h3>
              </div>

              {/* Mode Select */}
              <div className="flex items-center gap-1 bg-slate-200 dark:bg-slate-800 p-1 rounded-lg">
                <button
                  id="bulk-mode-text"
                  onClick={() => setBulkMode('text')}
                  className={`flex-1 py-1 rounded text-center font-bold text-[11px] transition-all ${
                    bulkMode === 'text' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs' : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  ASCII Szöveg
                </button>
                <button
                  id="bulk-mode-hex"
                  onClick={() => setBulkMode('hex')}
                  className={`flex-1 py-1 rounded text-center font-bold text-[11px] transition-all ${
                    bulkMode === 'hex' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs' : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  HEX Sorozat
                </button>
                <button
                  id="bulk-mode-c-array"
                  onClick={() => setBulkMode('c_array')}
                  className={`flex-1 py-1 rounded text-center font-bold text-[11px] transition-all ${
                    bulkMode === 'c_array' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs' : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {'C-Array {...}'}
                </button>
              </div>

              {/* Start Address */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Kezdő Cím (Offset):
                </label>
                <input
                  id="bulk-start-addr-input"
                  type="text"
                  value={bulkStartAddr}
                  onChange={(e) => setBulkStartAddr(e.target.value)}
                  placeholder="0x0000 vagy 0"
                  className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-mono text-xs focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              </div>

              {/* Text / Data Input Area */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  {bulkMode === 'text'
                    ? 'Beírandó Szöveg / String:'
                    : bulkMode === 'hex'
                    ? 'Hex Bájtok (pl. 48 65 6C 6C 6F vagy 48656C6C6F):'
                    : 'C Tömb konstansok (pl. { 0x48, 0x65, 0x6C, 0x6C, 0x6F }):'}
                </label>
                <textarea
                  id="bulk-content-textarea"
                  rows={3}
                  value={bulkInputText}
                  onChange={(e) => setBulkInputText(e.target.value)}
                  placeholder={
                    bulkMode === 'text'
                      ? 'Pl. Arduino EEPROM Config 2026'
                      : bulkMode === 'hex'
                      ? '48 65 6C 6C 6F 20 41 53 4D'
                      : '{ 0x10, 0x20, 0x30, 0x40 }'
                  }
                  className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-mono text-xs focus:ring-2 focus:ring-sky-500 focus:outline-none resize-none"
                />
              </div>

              {/* VALIDATION FEEDBACK & SUGGESTIONS */}
              {validationIssues.length > 0 && (
                <div className="space-y-2 pt-1">
                  {validationIssues.map((issue, idx) => (
                    <div
                      key={idx}
                      className={`p-2.5 rounded-lg text-[11px] flex flex-col gap-1.5 border ${
                        issue.type === 'error'
                          ? 'bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300'
                          : 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300'
                      }`}
                    >
                      <div className="flex items-start gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                        <span>{issue.message}</span>
                      </div>
                      {issue.suggestion && (
                        <button
                          onClick={issue.suggestion.apply}
                          className="self-start px-2 py-0.5 rounded bg-white/80 dark:bg-slate-800 text-[10px] font-bold border border-current hover:opacity-90 transition-opacity flex items-center gap-1"
                        >
                          <Sparkles className="w-3 h-3" />
                          {issue.suggestion.label}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Apply Bulk Button */}
              <button
                id="apply-bulk-data-btn"
                disabled={validationIssues.some((i) => i.type === 'error') || !bulkInputText.trim()}
                onClick={handleApplyBulk}
                className="w-full py-2 bg-sky-600 hover:bg-sky-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-sm"
              >
                <ArrowRight className="w-4 h-4" />
                Adatok Betöltése a Memóriába
              </button>
            </div>

            {/* IMPORT / EXPORT & BACKUP */}
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 space-y-2.5">
              <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <FileCode className="w-4 h-4 text-emerald-500" />
                Import / Export & C-Kód
              </h3>

              {fileImportStatus && (
                <div className="p-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 rounded text-[11px]">
                  {fileImportStatus}
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <label className="flex items-center justify-center gap-1.5 py-1.5 px-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-700 dark:text-slate-200 font-medium cursor-pointer transition-colors text-center">
                  <Upload className="w-3.5 h-3.5 text-slate-500" />
                  <span>Fájl (.bin / .hex)</span>
                  <input type="file" onChange={handleFileUpload} className="hidden" accept=".bin,.hex,.txt" />
                </label>

                <button
                  id="export-bin-file-btn"
                  onClick={() => handleExportFile('bin')}
                  className="flex items-center justify-center gap-1.5 py-1.5 px-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-700 dark:text-slate-200 font-medium transition-colors"
                >
                  <Download className="w-3.5 h-3.5 text-slate-500" />
                  <span>Letöltés (.bin)</span>
                </button>

                <button
                  id="export-hex-dump-btn"
                  onClick={() => handleExportFile('hex')}
                  className="flex items-center justify-center gap-1.5 py-1.5 px-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-700 dark:text-slate-200 font-medium transition-colors"
                >
                  <FileText className="w-3.5 h-3.5 text-slate-500" />
                  <span>HEX Dump (.txt)</span>
                </button>

                <button
                  id="copy-c-array-btn"
                  onClick={() => handleExportFile('c_array')}
                  className="flex items-center justify-center gap-1.5 py-1.5 px-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-700 dark:text-slate-200 font-medium transition-colors"
                >
                  {copiedSuccess ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
                  <span>{copiedSuccess ? 'Másolva!' : 'C-Array Másolás'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* MODAL FOOTER */}
        <div className="px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900/90 flex items-center justify-between">
          <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
            <span>
              Módosítások: {selectedMem === 'eeprom' ? 'EEPROM (1 KB)' : 'Flash (32 KB)'} bufferben
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              id="cancel-memory-editor-btn"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors"
            >
              Mégse
            </button>
            <button
              id="save-memory-editor-btn"
              onClick={handleCommitChanges}
              className="px-5 py-2 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-xl shadow-md transition-all flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              Mentés & Alkalmazás a Szimulációban
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
