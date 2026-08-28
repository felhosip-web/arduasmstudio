import React, { useState, useEffect, useRef } from 'react';
import {
  Cpu,
  Layers,
  Sparkles,
  RotateCcw,
  Sliders,
  Check,
  Copy,
  Hash,
  Binary,
  Edit3,
  ArrowRightLeft,
  ChevronRight,
  HelpCircle,
  Zap,
  Filter,
  CheckCircle2,
} from 'lucide-react';
import { RegisterBank, SimulationState } from '../types';
import { AvrCpuSnapshot } from '../utils/avr8jsEngine';

interface AvrRegisterViewerProps {
  simulation: SimulationState;
  cpuSnapshot?: AvrCpuSnapshot | null;
  onUpdateRegister?: (regName: string, value: number) => void;
  onUpdateSregFlag?: (flag: 'C' | 'Z' | 'N' | 'V' | 'S' | 'H' | 'T' | 'I', value: boolean) => void;
  onClearAllRegisters?: () => void;
}

type DisplayFormat = 'HEX' | 'DEC_UNSIGNED' | 'DEC_SIGNED' | 'BIN' | 'ASCII';
type RegisterFilter = 'ALL' | 'LOW' | 'HIGH' | 'POINTERS' | 'NON_ZERO';

export const AvrRegisterViewer: React.FC<AvrRegisterViewerProps> = ({
  simulation,
  cpuSnapshot,
  onUpdateRegister,
  onUpdateSregFlag,
  onClearAllRegisters,
}) => {
  const [displayFormat, setDisplayFormat] = useState<DisplayFormat>('HEX');
  const [filter, setFilter] = useState<RegisterFilter>('ALL');
  const [selectedReg, setSelectedReg] = useState<string>('r16');
  const [editInputVal, setEditInputVal] = useState<string>('');
  const [copiedStatus, setCopiedStatus] = useState<string | null>(null);

  // Track previous register values for live delta pulse animation
  const prevRegistersRef = useRef<Record<string, number>>({});
  const [changedRegs, setChangedRegs] = useState<Set<string>>(new Set());

  // Get current registers source
  const currentRegisters: Record<string, number> = {};
  for (let i = 0; i <= 31; i++) {
    const key = `r${i}`;
    currentRegisters[key] = cpuSnapshot?.registers[key] ?? simulation.registers[key] ?? 0;
  }

  // Detect which registers changed since last render/step
  useEffect(() => {
    const prev = prevRegistersRef.current;
    const changed = new Set<string>();
    for (let i = 0; i <= 31; i++) {
      const key = `r${i}`;
      if (prev[key] !== undefined && prev[key] !== currentRegisters[key]) {
        changed.add(key);
      }
    }
    if (changed.size > 0) {
      setChangedRegs(changed);
      const timer = setTimeout(() => {
        setChangedRegs(new Set());
      }, 1200);
      prevRegistersRef.current = { ...currentRegisters };
      return () => clearTimeout(timer);
    }
    prevRegistersRef.current = { ...currentRegisters };
  }, [currentRegisters, simulation.stepCount, cpuSnapshot?.cycles]);

  // Current selected register value
  const selectedVal = currentRegisters[selectedReg] ?? 0;

  // Format single 8-bit value based on current display format
  const formatValue = (val: number, format: DisplayFormat = displayFormat): string => {
    const v = val & 0xff;
    switch (format) {
      case 'HEX':
        return `0x${v.toString(16).toUpperCase().padStart(2, '0')}`;
      case 'DEC_UNSIGNED':
        return v.toString(10);
      case 'DEC_SIGNED':
        // Two's complement 8-bit signed
        const signed = v > 127 ? v - 256 : v;
        return (signed >= 0 ? `+${signed}` : `${signed}`);
      case 'BIN':
        return v.toString(2).padStart(8, '0');
      case 'ASCII':
        if (v >= 32 && v <= 126) return `'${String.fromCharCode(v)}'`;
        if (v === 0) return "'\\0'";
        if (v === 10) return "'\\n'";
        if (v === 13) return "'\\r'";
        return `.${v.toString(16).toUpperCase().padStart(2, '0')}`;
      default:
        return `0x${v.toString(16).toUpperCase().padStart(2, '0')}`;
    }
  };

  // 16-bit Pointers (X, Y, Z)
  const r26 = currentRegisters['r26'] ?? 0; // XL
  const r27 = currentRegisters['r27'] ?? 0; // XH
  const xPtr = (r27 << 8) | r26;

  const r28 = currentRegisters['r28'] ?? 0; // YL
  const r29 = currentRegisters['r29'] ?? 0; // YH
  const yPtr = (r29 << 8) | r28;

  const r30 = currentRegisters['r30'] ?? 0; // ZL
  const r31 = currentRegisters['r31'] ?? 0; // ZH
  const zPtr = (r31 << 8) | r30;

  // Identify memory region for a 16-bit address on ATmega328P
  const getMemoryRegionLabel = (addr: number): string => {
    if (addr < 0x0020) return `Regisztertár (R0-R31)`;
    if (addr < 0x0060) return `I/O Regiszterek (0x20-0x5F)`;
    if (addr < 0x0100) return `Kibővített I/O (0x60-0xFF)`;
    if (addr <= 0x08FF) return `Belső SRAM Adattér (0x0100-0x08FF)`;
    return `SRAM határon túli cím (0x${addr.toString(16).toUpperCase()})`;
  };

  // Apply value change to selected register
  const handleApplyValue = (newVal: number) => {
    const clamped = Math.max(0, Math.min(255, newVal & 0xff));
    if (onUpdateRegister) {
      onUpdateRegister(selectedReg, clamped);
    }
  };

  // Toggle specific bit in selected register
  const handleToggleBit = (bitIndex: number) => {
    const mask = 1 << bitIndex;
    const newVal = selectedVal ^ mask;
    handleApplyValue(newVal);
  };

  // Register Quick Actions
  const handleQuickAction = (action: 'CLR' | 'SER' | 'INC' | 'DEC' | 'COM' | 'NEG' | 'LSL' | 'LSR' | 'SWAP' | 'RAND') => {
    let newVal = selectedVal;
    switch (action) {
      case 'CLR':
        newVal = 0;
        break;
      case 'SER':
        newVal = 255;
        break;
      case 'INC':
        newVal = (selectedVal + 1) & 0xff;
        break;
      case 'DEC':
        newVal = (selectedVal - 1 + 256) & 0xff;
        break;
      case 'COM':
        newVal = (~selectedVal) & 0xff;
        break;
      case 'NEG':
        newVal = (-selectedVal) & 0xff;
        break;
      case 'LSL':
        newVal = (selectedVal << 1) & 0xff;
        break;
      case 'LSR':
        newVal = (selectedVal >> 1) & 0xff;
        break;
      case 'SWAP':
        newVal = ((selectedVal & 0x0f) << 4) | ((selectedVal & 0xf0) >> 4);
        break;
      case 'RAND':
        newVal = Math.floor(Math.random() * 256);
        break;
    }
    handleApplyValue(newVal);
  };

  // Load Preset Test Patterns
  const handleLoadTestPattern = (type: 'COUNTER' | 'ASCII' | 'POINTERS' | 'CHECKER') => {
    if (!onUpdateRegister) return;
    if (type === 'COUNTER') {
      for (let i = 0; i <= 31; i++) {
        onUpdateRegister(`r${i}`, (i * 8) & 0xff);
      }
    } else if (type === 'ASCII') {
      const sample = 'AVR_ATMEGA328P_RISC_REGISTER_BANK';
      for (let i = 0; i <= 31; i++) {
        const charCode = sample.charCodeAt(i % sample.length);
        onUpdateRegister(`r${i}`, charCode);
      }
    } else if (type === 'POINTERS') {
      // X = 0x0150 (SRAM), Y = 0x08FF (Stack), Z = 0x0040
      onUpdateRegister('r26', 0x50);
      onUpdateRegister('r27', 0x01);
      onUpdateRegister('r28', 0xff);
      onUpdateRegister('r29', 0x08);
      onUpdateRegister('r30', 0x40);
      onUpdateRegister('r31', 0x00);
    } else if (type === 'CHECKER') {
      for (let i = 0; i <= 31; i++) {
        onUpdateRegister(`r${i}`, i % 2 === 0 ? 0xAA : 0x55);
      }
    }
  };

  // Export / Copy to Clipboard
  const handleCopyDump = (formatType: 'C' | 'ASM' | 'HEX') => {
    let text = '';
    if (formatType === 'C') {
      const arr = Array.from({ length: 32 }, (_, i) => `0x${(currentRegisters[`r${i}`] || 0).toString(16).toUpperCase().padStart(2, '0')}`).join(', ');
      text = `// 8-Bit AVR Register Snapshot (R0-R31)\nconst uint8_t avr_registers[32] = {\n  ${arr}\n};`;
    } else if (formatType === 'ASM') {
      const lines = Array.from({ length: 32 }, (_, i) => {
        const val = currentRegisters[`r${i}`] || 0;
        const hex = `0x${val.toString(16).toUpperCase().padStart(2, '0')}`;
        return i >= 16 ? `ldi r${i}, ${hex}` : `; r${i} = ${hex} (Use 'mov' or arithmetic)`;
      });
      text = lines.join('\n');
    } else {
      text = Array.from({ length: 32 }, (_, i) => {
        const val = currentRegisters[`r${i}`] || 0;
        return `R${i.toString().padStart(2, '0')}: 0x${val.toString(16).toUpperCase().padStart(2, '0')} (${val.toString().padStart(3, '0')}) [${val.toString(2).padStart(8, '0')}]`;
      }).join('\n');
    }

    navigator.clipboard.writeText(text);
    setCopiedStatus(`Másolva (${formatType})!`);
    setTimeout(() => setCopiedStatus(null), 2500);
  };

  // Filter registers list
  const registerIndices = Array.from({ length: 32 }, (_, i) => i).filter((i) => {
    const val = currentRegisters[`r${i}`] || 0;
    if (filter === 'LOW') return i <= 15;
    if (filter === 'HIGH') return i >= 16 && i <= 25;
    if (filter === 'POINTERS') return i >= 26 && i <= 31;
    if (filter === 'NON_ZERO') return val > 0;
    return true;
  });

  // SREG Flags
  const sreg = cpuSnapshot?.sreg || simulation.sreg || {
    I: true,
    T: false,
    H: false,
    S: false,
    V: false,
    N: false,
    Z: false,
    C: false,
  };

  const sregDefinitions = [
    { bit: 7, flag: 'I' as const, name: 'Global Interrupt Enable', desc: 'Megszakítások globális engedélyezése (SEI / CLI utasítások)' },
    { bit: 6, flag: 'T' as const, name: 'Bit Copy Storage', desc: 'Egybites ideiglenes tároló (BST / BLD utasítások)' },
    { bit: 5, flag: 'H' as const, name: 'Half Carry Flag', desc: 'Félátvitel a 3. és 4. bit között (BCD aritmetika)' },
    { bit: 4, flag: 'S' as const, name: 'Sign Bit (S = N ⊕ V)', desc: 'Valódi előjeljelző két kettes komplemens műveletnél' },
    { bit: 3, flag: 'V' as const, name: 'Two\'s Complement Overflow', desc: 'Túlcsordulás előjeles aritmetikai műveletnél' },
    { bit: 2, flag: 'N' as const, name: 'Negative Flag', desc: 'Negatív eredményjelző (az eredmény 7. legfelső bitje 1)' },
    { bit: 1, flag: 'Z' as const, name: 'Zero Flag', desc: 'Nulla eredményjelző (az aritmetikai/logikai eredmény 0x00)' },
    { bit: 0, flag: 'C' as const, name: 'Carry Flag', desc: 'Átvitel flag (túlcsordulás a 8. biten vagy átvitel művelet)' },
  ];

  return (
    <div id="avr-register-viewer" className="space-y-3.5 select-none font-sans">
      {/* HEADER: Title & Quick Control Strip */}
      <div className="p-3 bg-[#161920] border border-[#2A2D35] rounded-xs shadow-[2px_2px_0px_#000] space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#2A2D35] pb-2.5">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-xs bg-emerald-950/60 text-[#4ade80] border border-emerald-500/40">
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                  AVR 8-bites Regisztertár (R0 – R31)
                </h3>
                <span className="text-[10px] bg-[#12141A] text-[#4ade80] px-2 py-0.5 border border-[#2A2D35] rounded-xs font-mono font-bold">
                  0x0000 – 0x001F (32B)
                </span>
              </div>
              <p className="text-[10px] text-[#8A8D98]">
                Valós idejű CPU regiszter monitorozás, bit-szintű szerkesztés és 16-bites mutatók (X, Y, Z)
              </p>
            </div>
          </div>

          {/* Quick Actions (Reset & Test Presets) */}
          <div className="flex items-center gap-1.5">
            {onClearAllRegisters && (
              <button
                id="btn-clear-all-regs"
                onClick={onClearAllRegisters}
                className="flex items-center gap-1 px-2.5 py-1 bg-[#1A1D24] hover:bg-rose-950/50 text-[#8A8D98] hover:text-rose-300 border border-[#3A3F4B] hover:border-rose-500/50 rounded-xs text-[10px] font-bold uppercase transition-all cursor-pointer"
                title="Minden regiszter (R0-R31) nullázása (0x00)"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Nullázás</span>
              </button>
            )}

            {/* Test Pattern Dropdown */}
            <div className="relative group">
              <button
                id="btn-load-test-pattern"
                className="flex items-center gap-1 px-2.5 py-1 bg-[#1A1D24] hover:bg-[#2A2D35] text-[#4ade80] border border-[#3A3F4B] hover:border-[#4ade80] rounded-xs text-[10px] font-bold uppercase transition-all cursor-pointer"
              >
                <Sparkles className="w-3 h-3" />
                <span>Minták</span>
              </button>
              <div className="absolute right-0 top-full mt-1 hidden group-hover:flex flex-col bg-[#12141A] border border-[#3A3F4B] rounded-xs shadow-[3px_3px_0px_#000] z-20 py-1 min-w-[170px]">
                <button
                  onClick={() => handleLoadTestPattern('COUNTER')}
                  className="px-3 py-1.5 text-left text-[11px] text-[#E0E0E6] hover:bg-[#1A1D24] hover:text-[#4ade80] transition-colors"
                >
                  🔢 Léptető Számláló (0, 8, 16...)
                </button>
                <button
                  onClick={() => handleLoadTestPattern('POINTERS')}
                  className="px-3 py-1.5 text-left text-[11px] text-[#E0E0E6] hover:bg-[#1A1D24] hover:text-[#4ade80] transition-colors"
                >
                  📍 X/Y/Z Mutatók (SRAM, Stack)
                </button>
                <button
                  onClick={() => handleLoadTestPattern('ASCII')}
                  className="px-3 py-1.5 text-left text-[11px] text-[#E0E0E6] hover:bg-[#1A1D24] hover:text-[#4ade80] transition-colors"
                >
                  🔤 ASCII String Minta
                </button>
                <button
                  onClick={() => handleLoadTestPattern('CHECKER')}
                  className="px-3 py-1.5 text-left text-[11px] text-[#E0E0E6] hover:bg-[#1A1D24] hover:text-[#4ade80] transition-colors"
                >
                  🏁 Sakk-minta (0xAA / 0x55)
                </button>
              </div>
            </div>

            {/* Export / Copy Dropdown */}
            <div className="relative group">
              <button
                id="btn-copy-regs"
                className="flex items-center gap-1 px-2.5 py-1 bg-[#1A1D24] hover:bg-[#2A2D35] text-[#38bdf8] border border-[#3A3F4B] hover:border-[#38bdf8] rounded-xs text-[10px] font-bold uppercase transition-all cursor-pointer"
              >
                <Copy className="w-3 h-3" />
                <span>Export</span>
              </button>
              <div className="absolute right-0 top-full mt-1 hidden group-hover:flex flex-col bg-[#12141A] border border-[#3A3F4B] rounded-xs shadow-[3px_3px_0px_#000] z-20 py-1 min-w-[150px]">
                <button
                  onClick={() => handleCopyDump('HEX')}
                  className="px-3 py-1.5 text-left text-[11px] text-[#E0E0E6] hover:bg-[#1A1D24] hover:text-[#38bdf8] transition-colors"
                >
                  📋 Szöveges Regiszter Dump
                </button>
                <button
                  onClick={() => handleCopyDump('C')}
                  className="px-3 py-1.5 text-left text-[11px] text-[#E0E0E6] hover:bg-[#1A1D24] hover:text-[#38bdf8] transition-colors"
                >
                  💻 C Tömb (uint8_t[32])
                </button>
                <button
                  onClick={() => handleCopyDump('ASM')}
                  className="px-3 py-1.5 text-left text-[11px] text-[#E0E0E6] hover:bg-[#1A1D24] hover:text-[#38bdf8] transition-colors"
                >
                  ⚡ AVR ASM (ldi utasítások)
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Display Format & Filter Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          {/* Format selector buttons */}
          <div className="flex items-center gap-1 bg-[#0F1115] p-1 rounded-xs border border-[#2A2D35]">
            <span className="text-[10px] text-[#8A8D98] font-bold uppercase px-1.5 flex items-center gap-1">
              <Hash className="w-3 h-3 text-[#4ade80]" /> Formátum:
            </span>

            <button
              onClick={() => setDisplayFormat('HEX')}
              className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded-xs transition-all cursor-pointer ${
                displayFormat === 'HEX'
                  ? 'bg-[#4ade80] text-black shadow-[1px_1px_0px_#000]'
                  : 'text-[#8A8D98] hover:text-[#E0E0E6]'
              }`}
            >
              HEX (0x..)
            </button>

            <button
              onClick={() => setDisplayFormat('DEC_UNSIGNED')}
              className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded-xs transition-all cursor-pointer ${
                displayFormat === 'DEC_UNSIGNED'
                  ? 'bg-amber-400 text-black shadow-[1px_1px_0px_#000]'
                  : 'text-[#8A8D98] hover:text-[#E0E0E6]'
              }`}
              title="Előjel nélküli egész szám (0 - 255)"
            >
              DEC (0..255)
            </button>

            <button
              onClick={() => setDisplayFormat('DEC_SIGNED')}
              className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded-xs transition-all cursor-pointer ${
                displayFormat === 'DEC_SIGNED'
                  ? 'bg-sky-400 text-black shadow-[1px_1px_0px_#000]'
                  : 'text-[#8A8D98] hover:text-[#E0E0E6]'
              }`}
              title="Kettes komplemens előjeles egész (-128 .. +127)"
            >
              DEC (±127)
            </button>

            <button
              onClick={() => setDisplayFormat('BIN')}
              className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded-xs transition-all cursor-pointer ${
                displayFormat === 'BIN'
                  ? 'bg-indigo-400 text-black shadow-[1px_1px_0px_#000]'
                  : 'text-[#8A8D98] hover:text-[#E0E0E6]'
              }`}
              title="8 bites bináris minta (00000000)"
            >
              BIN (8-bit)
            </button>

            <button
              onClick={() => setDisplayFormat('ASCII')}
              className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded-xs transition-all cursor-pointer ${
                displayFormat === 'ASCII'
                  ? 'bg-purple-400 text-black shadow-[1px_1px_0px_#000]'
                  : 'text-[#8A8D98] hover:text-[#E0E0E6]'
              }`}
              title="ASCII Karakteres megjelenítés"
            >
              ASCII ('A')
            </button>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1 bg-[#0F1115] p-1 rounded-xs border border-[#2A2D35]">
            <span className="text-[10px] text-[#8A8D98] font-bold uppercase px-1.5 flex items-center gap-1">
              <Filter className="w-3 h-3 text-sky-400" /> Szűrés:
            </span>

            {[
              { id: 'ALL', label: 'Összes (32)' },
              { id: 'LOW', label: 'R0-R15 (Low)' },
              { id: 'HIGH', label: 'R16-R25 (High)' },
              { id: 'POINTERS', label: 'X/Y/Z (Pointers)' },
              { id: 'NON_ZERO', label: 'Érték > 0' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id as RegisterFilter)}
                className={`px-2 py-0.5 text-[10px] font-bold rounded-xs transition-all cursor-pointer ${
                  filter === f.id
                    ? 'bg-[#3A3F4B] text-white border border-[#4ade80]/60'
                    : 'text-[#8A8D98] hover:text-[#E0E0E6]'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {copiedStatus && (
          <div className="p-1.5 bg-emerald-950/60 border border-emerald-500/50 text-[#4ade80] text-xs font-mono rounded-xs flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{copiedStatus}</span>
          </div>
        )}
      </div>

      {/* 16-BIT POINTER REGISTERS STRIP (X, Y, Z) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs font-mono">
        {/* X Pointer */}
        <div
          onClick={() => setSelectedReg('r26')}
          className={`p-2.5 bg-[#12141A] border rounded-xs shadow-[1px_1px_0px_#000] cursor-pointer transition-all ${
            selectedReg === 'r26' || selectedReg === 'r27'
              ? 'border-sky-400 bg-sky-950/20'
              : 'border-[#2A2D35] hover:border-sky-500/40'
          }`}
        >
          <div className="flex items-center justify-between text-[10px] text-[#8A8D98]">
            <span className="font-bold text-sky-400 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-sky-400" />
              X Mutató (R27:R26)
            </span>
            <span className="text-[9px] bg-[#1A1D24] px-1 py-0.2 rounded-2xs border border-[#2A2D35]">
              XH:XL
            </span>
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <div className="text-sm font-bold text-sky-300 tracking-wider">
              0x{xPtr.toString(16).toUpperCase().padStart(4, '0')}
            </div>
            <div className="text-[10px] text-[#8A8D98]">
              {xPtr} dec (XH: 0x{r27.toString(16).toUpperCase().padStart(2, '0')}, XL: 0x{r26.toString(16).toUpperCase().padStart(2, '0')})
            </div>
          </div>
          <div className="text-[9px] text-[#8A8D98] truncate mt-0.5">
            {getMemoryRegionLabel(xPtr)}
          </div>
        </div>

        {/* Y Pointer */}
        <div
          onClick={() => setSelectedReg('r28')}
          className={`p-2.5 bg-[#12141A] border rounded-xs shadow-[1px_1px_0px_#000] cursor-pointer transition-all ${
            selectedReg === 'r28' || selectedReg === 'r29'
              ? 'border-emerald-400 bg-emerald-950/20'
              : 'border-[#2A2D35] hover:border-emerald-500/40'
          }`}
        >
          <div className="flex items-center justify-between text-[10px] text-[#8A8D98]">
            <span className="font-bold text-emerald-400 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              Y Mutató (R29:R28)
            </span>
            <span className="text-[9px] bg-[#1A1D24] px-1 py-0.2 rounded-2xs border border-[#2A2D35]">
              YH:YL
            </span>
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <div className="text-sm font-bold text-emerald-300 tracking-wider">
              0x{yPtr.toString(16).toUpperCase().padStart(4, '0')}
            </div>
            <div className="text-[10px] text-[#8A8D98]">
              {yPtr} dec (YH: 0x{r29.toString(16).toUpperCase().padStart(2, '0')}, YL: 0x{r28.toString(16).toUpperCase().padStart(2, '0')})
            </div>
          </div>
          <div className="text-[9px] text-[#8A8D98] truncate mt-0.5">
            {getMemoryRegionLabel(yPtr)} • Frame Pointer
          </div>
        </div>

        {/* Z Pointer */}
        <div
          onClick={() => setSelectedReg('r30')}
          className={`p-2.5 bg-[#12141A] border rounded-xs shadow-[1px_1px_0px_#000] cursor-pointer transition-all ${
            selectedReg === 'r30' || selectedReg === 'r31'
              ? 'border-amber-400 bg-amber-950/20'
              : 'border-[#2A2D35] hover:border-amber-500/40'
          }`}
        >
          <div className="flex items-center justify-between text-[10px] text-[#8A8D98]">
            <span className="font-bold text-amber-400 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              Z Mutató (R31:R30)
            </span>
            <span className="text-[9px] bg-[#1A1D24] px-1 py-0.2 rounded-2xs border border-[#2A2D35]">
              ZH:ZL
            </span>
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <div className="text-sm font-bold text-amber-300 tracking-wider">
              0x{zPtr.toString(16).toUpperCase().padStart(4, '0')}
            </div>
            <div className="text-[10px] text-[#8A8D98]">
              {zPtr} dec (ZH: 0x{r31.toString(16).toUpperCase().padStart(2, '0')}, ZL: 0x{r30.toString(16).toUpperCase().padStart(2, '0')})
            </div>
          </div>
          <div className="text-[9px] text-[#8A8D98] truncate mt-0.5">
            LPM Flash Címzés • {getMemoryRegionLabel(zPtr)}
          </div>
        </div>
      </div>

      {/* SREG (Status Register 0x5F) Live Flag Bar */}
      <div className="p-2.5 bg-[#161920] border border-[#2A2D35] rounded-xs shadow-[2px_2px_0px_#000] space-y-1.5">
        <div className="flex items-center justify-between text-[10px] font-mono text-[#8A8D98]">
          <span className="font-bold text-[#E0E0E6] uppercase flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-[#4ade80]" />
            AVR Állapotregiszter (SREG @ 0x5F)
          </span>
          <span>Kattints bármelyik flagre a billentéshez (0 ↔ 1)</span>
        </div>

        <div className="grid grid-cols-8 gap-1.5 text-center font-mono">
          {sregDefinitions.map((item) => {
            const isActive = (sreg as any)[item.flag] === true;
            return (
              <button
                key={item.flag}
                onClick={() => {
                  if (onUpdateSregFlag) {
                    onUpdateSregFlag(item.flag, !isActive);
                  }
                }}
                className={`p-1.5 rounded-xs border text-xs font-bold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#4ade80]/20 text-[#4ade80] border-[#4ade80] shadow-[0_0_8px_rgba(74,222,128,0.3)]'
                    : 'bg-[#12141A] text-[#6B7280] border-[#2A2D35] hover:border-[#4ade80]/40'
                }`}
                title={`Bit ${item.bit} (${item.flag}): ${item.name} - ${item.desc}`}
              >
                <div className="text-[10px] text-[#8A8D98]">{item.flag}</div>
                <div className="text-xs">{isActive ? '1' : '0'}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 32-REGISTER INTERACTIVE GRID (R0 - R31) */}
      <div className="p-3 bg-[#161920] border border-[#2A2D35] rounded-xs shadow-[2px_2px_0px_#000] space-y-2">
        <div className="flex items-center justify-between text-xs font-mono text-[#8A8D98] border-b border-[#2A2D35] pb-1.5">
          <span className="font-bold text-[#E0E0E6] uppercase flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-sky-400" />
            Regiszter Mátrix ({registerIndices.length} megjelenítve)
          </span>
          <span className="text-[10px]">Kattints a kiválasztáshoz & szerkesztéshez</span>
        </div>

        {registerIndices.length === 0 ? (
          <div className="p-4 text-center text-xs font-mono text-[#8A8D98] bg-[#12141A] rounded-xs border border-[#2A2D35]">
            Nincs a megadott szűrésnek megfelelő regiszter.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-1.5 text-center font-mono">
            {registerIndices.map((i) => {
              const regKey = `r${i}`;
              const val = currentRegisters[regKey] ?? 0;
              const isSelected = selectedReg === regKey;
              const hasChanged = changedRegs.has(regKey);
              const isNonZero = val > 0;
              const isPointerReg = i >= 26;
              const isHighReg = i >= 16 && i <= 25;

              // Pointer label
              let ptrLabel = '';
              if (i === 26) ptrLabel = 'XL';
              else if (i === 27) ptrLabel = 'XH';
              else if (i === 28) ptrLabel = 'YL';
              else if (i === 29) ptrLabel = 'YH';
              else if (i === 30) ptrLabel = 'ZL';
              else if (i === 31) ptrLabel = 'ZH';

              return (
                <div
                  key={regKey}
                  id={`reg-cell-${regKey}`}
                  onClick={() => setSelectedReg(regKey)}
                  className={`p-2 rounded-xs border text-left cursor-pointer transition-all relative ${
                    isSelected
                      ? 'bg-[#1E293B] border-sky-400 shadow-[0_0_10px_rgba(56,189,248,0.4)] scale-[1.02] z-10'
                      : hasChanged
                      ? 'bg-emerald-950/80 border-[#4ade80] shadow-[0_0_12px_rgba(74,222,128,0.6)] animate-pulse'
                      : isNonZero
                      ? 'bg-[#12141A] border-[#3A3F4B] text-[#E0E0E6] hover:border-[#4ade80]/60'
                      : 'bg-[#0F1115] border-[#2A2D35] text-[#8A8D98] hover:border-[#3A3F4B]'
                  }`}
                >
                  <div className="flex items-center justify-between text-[9px] mb-1">
                    <span className={`font-bold uppercase ${
                      isPointerReg ? 'text-amber-400' : isHighReg ? 'text-[#4ade80]' : 'text-slate-400'
                    }`}>
                      {regKey.toUpperCase()}
                      {ptrLabel && <span className="ml-0.5 text-[8px] opacity-80">({ptrLabel})</span>}
                    </span>
                    <span className="text-[8px] text-[#6B7280]">0x{i.toString(16).toUpperCase().padStart(2, '0')}</span>
                  </div>

                  <div className={`text-xs font-bold font-mono tracking-wide ${
                    isSelected ? 'text-sky-300' : isNonZero ? 'text-[#4ade80]' : 'text-slate-500'
                  }`}>
                    {formatValue(val)}
                  </div>

                  {/* 8-bit Mini Bar Graph */}
                  <div className="flex gap-0.5 mt-1.5 justify-between">
                    {Array.from({ length: 8 }, (_, bitIdx) => {
                      const bitNum = 7 - bitIdx;
                      const bitIsSet = ((val >> bitNum) & 1) === 1;
                      return (
                        <div
                          key={bitNum}
                          className={`h-1 flex-1 rounded-2xs ${
                            bitIsSet
                              ? isSelected ? 'bg-sky-400' : 'bg-[#4ade80]'
                              : 'bg-[#2A2D35]'
                          }`}
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* SELECTED REGISTER DETAILED BIT-INSPECTOR & LIVE MANIPULATOR */}
      <div className="p-3 bg-[#161920] border border-[#2A2D35] rounded-xs shadow-[2px_2px_0px_#000] space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#2A2D35] pb-2">
          <div className="flex items-center gap-2">
            <div className="p-1 rounded-xs bg-sky-950/60 text-sky-400 border border-sky-500/40">
              <Edit3 className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white font-mono uppercase">
                  Regiszter Szerkesztő: {selectedReg.toUpperCase()}
                </span>
                <span className="text-[10px] text-sky-400 font-mono">
                  (Cím: 0x{parseInt(selectedReg.replace('r', ''), 10).toString(16).toUpperCase().padStart(2, '0')})
                </span>
              </div>
              <span className="text-[10px] text-[#8A8D98]">
                Kattints a bitekre a módosításhoz vagy írd be az új értéket
              </span>
            </div>
          </div>

          {/* Quick Value Previews */}
          <div className="flex items-center gap-2 text-xs font-mono bg-[#12141A] px-2.5 py-1 rounded-xs border border-[#2A2D35]">
            <span className="text-[#8A8D98]">HEX: <strong className="text-[#4ade80]">0x{selectedVal.toString(16).toUpperCase().padStart(2, '0')}</strong></span>
            <span className="text-[#8A8D98]">DEC: <strong className="text-amber-400">{selectedVal}</strong></span>
            <span className="text-[#8A8D98]">BIN: <strong className="text-sky-400">{selectedVal.toString(2).padStart(8, '0')}</strong></span>
          </div>
        </div>

        {/* 8-Bit Interactive Buttons (Bit 7 down to Bit 0) */}
        <div className="space-y-1">
          <div className="flex justify-between text-[9px] font-mono text-[#8A8D98] px-1">
            <span>Felső Nibble (Bit 7 .. 4)</span>
            <span>Alsó Nibble (Bit 3 .. 0)</span>
          </div>

          <div className="grid grid-cols-8 gap-1.5 font-mono">
            {Array.from({ length: 8 }, (_, bitIdx) => {
              const bitNum = 7 - bitIdx;
              const weight = 1 << bitNum;
              const isSet = ((selectedVal >> bitNum) & 1) === 1;

              return (
                <button
                  key={bitNum}
                  id={`btn-bit-${selectedReg}-${bitNum}`}
                  onClick={() => handleToggleBit(bitNum)}
                  className={`p-2 rounded-xs border flex flex-col items-center justify-center transition-all cursor-pointer ${
                    isSet
                      ? 'bg-[#4ade80]/20 text-[#4ade80] border-[#4ade80] shadow-[0_0_8px_rgba(74,222,128,0.3)]'
                      : 'bg-[#12141A] text-[#8A8D98] border-[#2A2D35] hover:border-[#4ade80]/50'
                  }`}
                  title={`Bit ${bitNum} (Súly: ${weight}) - Kattints a billentéshez`}
                >
                  <span className="text-[9px] text-[#8A8D98] font-bold">b{bitNum}</span>
                  <span className="text-sm font-bold my-0.5">{isSet ? '1' : '0'}</span>
                  <span className="text-[8px] text-[#6B7280]">{weight}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Direct Input & Quick Math Manipulator */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-[#2A2D35]">
          {/* Manual Input */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#8A8D98] font-mono font-bold whitespace-nowrap">Érték Beírás:</span>
            <input
              type="text"
              placeholder="pl. 0x4F vagy 79 vagy 0b01001111"
              value={editInputVal}
              onChange={(e) => setEditInputVal(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const trimmed = editInputVal.trim().toLowerCase();
                  let num = NaN;
                  if (trimmed.startsWith('0x')) num = parseInt(trimmed.substring(2), 16);
                  else if (trimmed.startsWith('0b')) num = parseInt(trimmed.substring(2), 2);
                  else num = parseInt(trimmed, 10);

                  if (!isNaN(num)) {
                    handleApplyValue(num);
                    setEditInputVal('');
                  }
                }
              }}
              className="flex-1 bg-[#12141A] text-white border border-[#3A3F4B] text-xs px-2.5 py-1.5 rounded-xs font-mono focus:border-[#4ade80]"
            />
            <button
              onClick={() => {
                const trimmed = editInputVal.trim().toLowerCase();
                let num = NaN;
                if (trimmed.startsWith('0x')) num = parseInt(trimmed.substring(2), 16);
                else if (trimmed.startsWith('0b')) num = parseInt(trimmed.substring(2), 2);
                else num = parseInt(trimmed, 10);

                if (!isNaN(num)) {
                  handleApplyValue(num);
                  setEditInputVal('');
                }
              }}
              className="px-2.5 py-1.5 bg-[#4ade80] hover:bg-[#3ec973] text-black font-bold text-[10px] uppercase rounded-xs transition-colors cursor-pointer shadow-[1px_1px_0px_#000]"
            >
              Alkalmaz
            </button>
          </div>

          {/* Quick Bitwise Operations */}
          <div className="flex flex-wrap items-center gap-1 justify-end">
            <button
              onClick={() => handleQuickAction('CLR')}
              className="px-2 py-1 bg-[#1A1D24] hover:bg-[#2A2D35] text-rose-300 border border-[#3A3F4B] rounded-xs text-[9px] font-mono font-bold uppercase transition-colors cursor-pointer"
              title="CLR - Regiszter nullázása (0x00)"
            >
              CLR (0x00)
            </button>

            <button
              onClick={() => handleQuickAction('SER')}
              className="px-2 py-1 bg-[#1A1D24] hover:bg-[#2A2D35] text-amber-300 border border-[#3A3F4B] rounded-xs text-[9px] font-mono font-bold uppercase transition-colors cursor-pointer"
              title="SER - Minden bit beállítása 1-re (0xFF)"
            >
              SER (0xFF)
            </button>

            <button
              onClick={() => handleQuickAction('INC')}
              className="px-2 py-1 bg-[#1A1D24] hover:bg-[#2A2D35] text-[#4ade80] border border-[#3A3F4B] rounded-xs text-[9px] font-mono font-bold uppercase transition-colors cursor-pointer"
              title="INC - Érték növelése 1-gyel"
            >
              INC (+1)
            </button>

            <button
              onClick={() => handleQuickAction('DEC')}
              className="px-2 py-1 bg-[#1A1D24] hover:bg-[#2A2D35] text-sky-300 border border-[#3A3F4B] rounded-xs text-[9px] font-mono font-bold uppercase transition-colors cursor-pointer"
              title="DEC - Érték csökkentése 1-gyel"
            >
              DEC (-1)
            </button>

            <button
              onClick={() => handleQuickAction('COM')}
              className="px-2 py-1 bg-[#1A1D24] hover:bg-[#2A2D35] text-purple-300 border border-[#3A3F4B] rounded-xs text-[9px] font-mono font-bold uppercase transition-colors cursor-pointer"
              title="COM - Bitenkénti invertálás (NOT)"
            >
              COM (~)
            </button>

            <button
              onClick={() => handleQuickAction('SWAP')}
              className="px-2 py-1 bg-[#1A1D24] hover:bg-[#2A2D35] text-emerald-300 border border-[#3A3F4B] rounded-xs text-[9px] font-mono font-bold uppercase transition-colors cursor-pointer"
              title="SWAP - Alsó és felső 4 bit megcserélése"
            >
              SWAP
            </button>

            <button
              onClick={() => handleQuickAction('LSL')}
              className="px-2 py-1 bg-[#1A1D24] hover:bg-[#2A2D35] text-[#8A8D98] hover:text-white border border-[#3A3F4B] rounded-xs text-[9px] font-mono font-bold uppercase transition-colors cursor-pointer"
              title="LSL - Logikai balra léptetés (<< 1)"
            >
              LSL (&lt;&lt;)
            </button>

            <button
              onClick={() => handleQuickAction('LSR')}
              className="px-2 py-1 bg-[#1A1D24] hover:bg-[#2A2D35] text-[#8A8D98] hover:text-white border border-[#3A3F4B] rounded-xs text-[9px] font-mono font-bold uppercase transition-colors cursor-pointer"
              title="LSR - Logikai jobbra léptetés (>> 1)"
            >
              LSR (&gt;&gt;)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
