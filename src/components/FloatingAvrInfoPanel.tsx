/**
 * (c) 2026 AI Studio AVR Visual Studio
 * Floating AVR Instruction Info & Datasheet Documentation Panel
 * Provides draggable, context-aware AVR assembly instruction breakdown,
 * opcode binary disassembler, SREG flag tracking, hardware register maps,
 * and Atmel/Microchip microcontroller documentation for the selected block.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Cpu,
  Zap,
  BookOpen,
  Code2,
  Clock,
  HardDrive,
  Activity,
  Layers,
  ChevronDown,
  ChevronUp,
  X,
  Move,
  Search,
  Check,
  AlertTriangle,
  Info,
  Maximize2,
  Minimize2,
  ExternalLink,
  Sliders,
  Sparkles,
  Pin,
  PinOff,
} from 'lucide-react';
import { ProgramBlock, ArduinoPin } from '../types';
import {
  getAvrDocsForBlock,
  BlockAvrInspection,
  AVR_INSTRUCTION_DATABASE,
  AvrOpcodeDoc,
  ATMEGA328P_REGISTERS,
} from '../utils/avrInstructionDocs';

interface FloatingAvrInfoPanelProps {
  isOpen: boolean;
  onClose: () => void;
  selectedBlock: ProgramBlock | null;
  allBlocks: ProgramBlock[];
  onSelectBlock?: (blockId: string) => void;
}

export const FloatingAvrInfoPanel: React.FC<FloatingAvrInfoPanelProps> = ({
  isOpen,
  onClose,
  selectedBlock,
  allBlocks,
  onSelectBlock,
}) => {
  const [activeTab, setActiveTab] = useState<'architecture' | 'registers' | 'datasheet' | 'catalog'>('architecture');
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [isDocked, setIsDocked] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedMnemonicOverride, setSelectedMnemonicOverride] = useState<string | null>(null);

  // Draggable state
  const [position, setPosition] = useState<{ x: number; y: number }>(() => {
    // Default position: top-right corner of workspace
    const initialX = Math.max(20, window.innerWidth - 480);
    const initialY = 80;
    return { x: initialX, y: initialY };
  });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragRef = useRef<{ startX: number; startY: number; posX: number; posY: number }>({
    startX: 0,
    startY: 0,
    posX: 0,
    posY: 0,
  });

  // Reset mnemonic override when selected block changes
  useEffect(() => {
    setSelectedMnemonicOverride(null);
  }, [selectedBlock?.id]);

  // Keep inside window bounds on resize
  useEffect(() => {
    const handleResize = () => {
      setPosition((prev) => ({
        x: Math.min(prev.x, Math.max(10, window.innerWidth - 460)),
        y: Math.min(prev.y, Math.max(10, window.innerHeight - 200)),
      }));
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Handle Dragging
  const handleMouseDown = (e: React.MouseEvent) => {
    if (isDocked) return;
    setIsDragging(true);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      posX: position.x,
      posY: position.y,
    };
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || isDocked) return;
      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;
      const newX = Math.max(10, Math.min(window.innerWidth - 320, dragRef.current.posX + dx));
      const newY = Math.max(10, Math.min(window.innerHeight - 80, dragRef.current.posY + dy));
      setPosition({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isDocked]);

  if (!isOpen) return null;

  // Fallback block if none selected
  const effectiveBlock: ProgramBlock = selectedBlock ||
    allBlocks[0] || {
      id: 'fallback',
      type: 'io_pin_write',
      scope: 'loop',
      params: { pin: '13', state: 'HIGH' },
    };

  const inspection: BlockAvrInspection = getAvrDocsForBlock(effectiveBlock, allBlocks);

  // Active datasheet to show (either from selected block or user catalog browse)
  const activeDatasheet: AvrOpcodeDoc = selectedMnemonicOverride
    ? AVR_INSTRUCTION_DATABASE[selectedMnemonicOverride] || inspection.datasheetDoc
    : inspection.datasheetDoc;

  // Filtered instruction catalog
  const filteredCatalog = Object.values(AVR_INSTRUCTION_DATABASE).filter((doc) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      doc.mnemonic.toLowerCase().includes(q) ||
      doc.fullName.toLowerCase().includes(q) ||
      doc.fullNameHu.toLowerCase().includes(q) ||
      doc.category.toLowerCase().includes(q)
    );
  });

  // MINIMIZED PILL VIEW
  if (isMinimized) {
    return (
      <div
        id="floating-avr-panel-minimized"
        style={{
          position: isDocked ? 'fixed' : 'fixed',
          left: isDocked ? 'auto' : `${position.x}px`,
          right: isDocked ? '1.5rem' : 'auto',
          bottom: isDocked ? '1.5rem' : 'auto',
          top: isDocked ? 'auto' : `${position.y}px`,
          zIndex: 45,
        }}
        className="animate-in fade-in zoom-in-95 duration-150"
      >
        <div className="flex items-center gap-2 bg-[#12141A] border-2 border-sky-500/70 p-2 rounded-xs shadow-[0_0_20px_rgba(14,165,233,0.3)] text-white">
          <div
            className="cursor-move p-1 text-sky-400 hover:text-white"
            onMouseDown={handleMouseDown}
            title="Húzás a mozgatáshoz"
          >
            <Move className="w-3.5 h-3.5" />
          </div>

          <div
            onClick={() => setIsMinimized(false)}
            className="flex items-center gap-2 cursor-pointer hover:opacity-80"
          >
            <div className="p-1 rounded-xs bg-sky-950 border border-sky-500/50 text-sky-400">
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[11px] font-bold font-mono flex items-center gap-1.5">
                <span className="text-white">{inspection.primaryMnemonic}</span>
                <span className="text-[9px] bg-sky-950 text-sky-300 px-1 py-0.2 rounded-xs border border-sky-500/40">
                  {inspection.totalCycles} Ciklus ({inspection.totalTimeNs} ns)
                </span>
              </div>
              <div className="text-[10px] text-[#8A8D98] truncate max-w-[140px]">
                #{allBlocks.findIndex((b) => b.id === effectiveBlock.id) + 1} {inspection.blockName}
              </div>
            </div>
          </div>

          <button
            onClick={() => setIsMinimized(false)}
            className="p-1 text-[#8A8D98] hover:text-white rounded-xs hover:bg-[#1A1D24]"
            title="Panel megnyitása"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onClose}
            className="p-1 text-[#8A8D98] hover:text-rose-400 rounded-xs hover:bg-[#1A1D24]"
            title="Bezárás"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  // FULL EXPANDED FLOATING PANEL
  return (
    <div
      id="floating-avr-info-panel"
      style={{
        position: isDocked ? 'fixed' : 'fixed',
        left: isDocked ? 'auto' : `${position.x}px`,
        right: isDocked ? '1.5rem' : 'auto',
        bottom: isDocked ? '1.5rem' : 'auto',
        top: isDocked ? 'auto' : `${position.y}px`,
        width: '450px',
        maxWidth: 'calc(100vw - 2rem)',
        maxHeight: '82vh',
        zIndex: 45,
      }}
      className="bg-[#12141A] border-2 border-sky-500/60 rounded-xs shadow-[0_0_30px_rgba(14,165,233,0.25)] flex flex-col overflow-hidden text-[#E0E0E6] animate-in fade-in zoom-in-95 duration-150 select-none"
    >
      {/* Draggable Header Bar */}
      <div
        className={`px-3.5 py-2.5 bg-[#161920] border-b border-[#2A2D35] flex items-center justify-between gap-2 ${
          isDocked ? '' : 'cursor-move'
        }`}
        onMouseDown={handleMouseDown}
      >
        <div className="flex items-center gap-2 overflow-hidden">
          <div className="p-1.5 rounded-xs bg-sky-950/80 text-sky-400 border border-sky-500/40 shadow-[1px_1px_0px_#000]">
            <Cpu className="w-4 h-4" />
          </div>
          <div className="overflow-hidden">
            <div className="flex items-center gap-1.5">
              <h3 className="text-xs font-bold text-white font-mono uppercase tracking-wide truncate">
                AVR Utasítás & Doku
              </h3>
              <span className="text-[9px] font-mono font-bold px-1 py-0.2 rounded-xs bg-sky-950 text-sky-300 border border-sky-500/40 shrink-0">
                16 MHz ATmega328P
              </span>
            </div>
            <p className="text-[10px] text-[#8A8D98] truncate">
              {inspection.blockName} ({effectiveBlock.scope})
            </p>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-1 shrink-0" onMouseDown={(e) => e.stopPropagation()}>
          {/* Dock / Undock toggle */}
          <button
            onClick={() => setIsDocked(!isDocked)}
            className={`p-1 rounded-xs transition-colors ${
              isDocked
                ? 'text-sky-300 bg-sky-950 border border-sky-500/40'
                : 'text-[#8A8D98] hover:text-white hover:bg-[#1A1D24]'
            }`}
            title={isDocked ? 'Dokkolás feloldása (Szabadon mozgatható)' : 'Dokkolás a jobb alsó sarokba'}
          >
            {isDocked ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
          </button>

          {/* Minimize button */}
          <button
            onClick={() => setIsMinimized(true)}
            className="p-1 text-[#8A8D98] hover:text-white rounded-xs hover:bg-[#1A1D24] transition-colors"
            title="Minimalizálás lebegő ikonra"
          >
            <Minimize2 className="w-3.5 h-3.5" />
          </button>

          {/* Close button */}
          <button
            onClick={onClose}
            className="p-1 text-[#8A8D98] hover:text-rose-400 rounded-xs hover:bg-[#1A1D24] transition-colors"
            title="Bezárás"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Block Selector & Quick Bar */}
      <div className="px-3.5 py-1.5 bg-[#0F1115] border-b border-[#2A2D35] flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-[11px] font-mono overflow-hidden">
          <span className="text-[#8A8D98]">Kijelölt:</span>
          <span className="text-white font-bold truncate">#{allBlocks.findIndex((b) => b.id === effectiveBlock.id) + 1} {inspection.blockName}</span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <span className="text-[10px] font-mono bg-sky-950 text-sky-300 px-1.5 py-0.2 rounded-xs border border-sky-500/30">
            {inspection.primaryMnemonic}
          </span>
          <span className="text-[10px] font-mono bg-[#1A1D24] text-[#8A8D98] px-1.5 py-0.2 rounded-xs border border-[#3A3F4B]">
            {inspection.totalCycles} Ciklus
          </span>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center border-b border-[#2A2D35] bg-[#161920] px-2 text-xs font-mono">
        <button
          onClick={() => setActiveTab('architecture')}
          className={`flex items-center gap-1.5 py-2 px-2.5 border-b-2 font-medium transition-colors cursor-pointer ${
            activeTab === 'architecture'
              ? 'border-sky-400 text-sky-400 font-bold bg-[#12141A]'
              : 'border-transparent text-[#8A8D98] hover:text-white'
          }`}
        >
          <Zap className="w-3.5 h-3.5" />
          <span>Utasítás & Opcode</span>
        </button>

        <button
          onClick={() => setActiveTab('registers')}
          className={`flex items-center gap-1.5 py-2 px-2.5 border-b-2 font-medium transition-colors cursor-pointer ${
            activeTab === 'registers'
              ? 'border-sky-400 text-sky-400 font-bold bg-[#12141A]'
              : 'border-transparent text-[#8A8D98] hover:text-white'
          }`}
        >
          <HardDrive className="w-3.5 h-3.5" />
          <span>Regiszterek ({inspection.hardwareRegisters.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('datasheet')}
          className={`flex items-center gap-1.5 py-2 px-2.5 border-b-2 font-medium transition-colors cursor-pointer ${
            activeTab === 'datasheet'
              ? 'border-sky-400 text-sky-400 font-bold bg-[#12141A]'
              : 'border-transparent text-[#8A8D98] hover:text-white'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Datasheet & Doku</span>
        </button>

        <button
          onClick={() => setActiveTab('catalog')}
          className={`flex items-center gap-1.5 py-2 px-2.5 border-b-2 font-medium transition-colors cursor-pointer ${
            activeTab === 'catalog'
              ? 'border-sky-400 text-sky-400 font-bold bg-[#12141A]'
              : 'border-transparent text-[#8A8D98] hover:text-white'
          }`}
        >
          <Search className="w-3.5 h-3.5" />
          <span>Katalógus</span>
        </button>
      </div>

      {/* Tab Content Body */}
      <div className="p-3.5 overflow-y-auto space-y-3.5 flex-1 select-text">
        {/* =================================================================== */}
        {/* TAB 1: ARCHITECTURE, OPCODES, SREG FLAGS & DISASSEMBLY              */}
        {/* =================================================================== */}
        {activeTab === 'architecture' && (
          <div className="space-y-3">
            {/* Opcode & Binary Bitfield Card */}
            <div className="p-3 bg-[#161920] border border-[#2A2D35] rounded-xs shadow-[2px_2px_0px_#000] space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-xs bg-sky-950 text-sky-300 font-mono font-bold text-xs border border-sky-500/40">
                    {inspection.primaryMnemonic}
                  </span>
                  <span className="text-xs font-bold text-white font-mono">
                    {inspection.datasheetDoc.fullNameHu}
                  </span>
                </div>
                <span className="text-[10px] font-mono text-[#8A8D98]">
                  {inspection.datasheetDoc.category}
                </span>
              </div>

              {/* 16-Bit Binary Opcode Breakdown */}
              <div className="bg-[#0F1115] p-2.5 rounded-xs border border-[#2A2D35] space-y-1.5">
                <div className="flex items-center justify-between text-[10px] font-mono text-[#8A8D98]">
                  <span>Gépi Kód Bitminta (16-bit Opcode):</span>
                  <span className="text-sky-300 font-bold">{inspection.instructions[0]?.opcodeHex || '0x9A2D'}</span>
                </div>

                <div className="p-1.5 bg-black/60 rounded-xs border border-sky-500/30 font-mono text-center">
                  <div className="text-sm font-bold text-sky-400 tracking-widest">
                    {inspection.instructions[0]?.binary16 || '1001 1010 0010 1101'}
                  </div>
                  <div className="text-[9px] text-[#8A8D98] mt-0.5">
                    Minta: <code className="text-amber-300">{inspection.datasheetDoc.binaryPattern}</code>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-[#8A8D98] pt-1">
                  <div>
                    Szintaxis: <strong className="text-white">{inspection.datasheetDoc.syntax}</strong>
                  </div>
                  <div>
                    Időzítés: <strong className="text-[#4ade80]">{inspection.totalCycles} Ciklus ({inspection.totalTimeNs} ns)</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* SREG (Status Register) Flags Impact Bar */}
            <div className="p-3 bg-[#161920] border border-[#2A2D35] rounded-xs space-y-2 shadow-[2px_2px_0px_#000]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white font-mono flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-sky-400" />
                  <span>SREG Állapotregiszter Hatás (Status Bits)</span>
                </span>
                <span className="text-[9px] font-mono text-[#8A8D98]">I T H S V N Z C</span>
              </div>

              <div className="grid grid-cols-8 gap-1 text-center font-mono">
                {inspection.sregState.map((s) => {
                  let bgCol = 'bg-[#0F1115] border-[#2A2D35] text-[#8A8D98]';
                  if (s.effect === 'modified') bgCol = 'bg-amber-950/60 border-amber-500/50 text-amber-300 font-bold';
                  if (s.effect === 'set') bgCol = 'bg-[#4ade80]/20 border-[#4ade80]/50 text-[#4ade80] font-bold';
                  if (s.effect === 'cleared') bgCol = 'bg-rose-950/60 border-rose-500/50 text-rose-300 font-bold';

                  return (
                    <div
                      key={s.flag}
                      className={`p-1.5 rounded-xs border flex flex-col items-center justify-center ${bgCol}`}
                      title={`${s.name} (${s.flag}): ${s.description}`}
                    >
                      <span className="text-[10px] text-white font-bold">{s.flag}</span>
                      <span className="text-xs font-mono">{s.symbol}</span>
                    </div>
                  );
                })}
              </div>

              <div className="text-[10px] text-[#8A8D98] flex items-center justify-between pt-1">
                <span>Jelmagyarázat:</span>
                <span className="space-x-2">
                  <span className="text-amber-400">↔ Változik</span>
                  <span className="text-[#4ade80]">1 Beáll</span>
                  <span className="text-rose-400">0 Törlődik</span>
                  <span className="text-[#8A8D98]">- Nem változik</span>
                </span>
              </div>
            </div>

            {/* Generated Assembly Disassembly Breakdown */}
            <div className="p-3 bg-[#161920] border border-[#2A2D35] rounded-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white font-mono flex items-center gap-1.5">
                  <Code2 className="w-3.5 h-3.5 text-orange-400" />
                  <span>Generált Gépi Utasítások (AVR Asm)</span>
                </span>
                <span className="text-[10px] font-mono text-[#8A8D98]">
                  {inspection.instructions.length} sor
                </span>
              </div>

              <div className="space-y-1.5 font-mono text-xs">
                {inspection.instructions.map((inst, idx) => (
                  <div
                    key={idx}
                    className="p-2 bg-[#0F1115] border border-[#2A2D35] rounded-xs flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2 overflow-hidden">
                      <span className="text-sky-400 font-bold shrink-0">{inst.mnemonic}</span>
                      <code className="text-[#E0E0E6] truncate">{inst.asmLine}</code>
                    </div>
                    <div className="text-right shrink-0 text-[10px]">
                      <span className="text-[#4ade80] font-bold">{inst.cycles} cyc</span>
                      <span className="text-[#8A8D98] ml-1">({inst.timeNs} ns)</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Direct AVR-GCC C Macro vs Arduino API */}
            <div className="p-3 bg-[#161920] border border-[#2A2D35] rounded-xs space-y-1.5">
              <div className="text-xs font-bold text-white font-mono flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Közvetlen AVR-GCC Regiszter Manipuláció</span>
              </div>
              <pre className="p-2 bg-[#0F1115] border border-[#2A2D35] rounded-xs text-[11px] font-mono text-amber-300 overflow-x-auto whitespace-pre-wrap">
                {inspection.avrGccMacro}
              </pre>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 2: HARDWARE REGISTERS & ATMEGA328P MEMORY MAP                   */}
        {/* =================================================================== */}
        {activeTab === 'registers' && (
          <div className="space-y-3">
            {inspection.hardwareRegisters.length === 0 ? (
              <div className="p-4 text-center bg-[#161920] border border-[#2A2D35] rounded-xs text-xs text-[#8A8D98]">
                Ez a blokk általános munkaregisztereket (r16-r31) vagy belső számlálót használ, közvetlen I/O port regiszter nélkül.
              </div>
            ) : (
              inspection.hardwareRegisters.map((reg) => (
                <div
                  key={reg.name}
                  className="p-3 bg-[#161920] border border-[#2A2D35] rounded-xs space-y-2.5 shadow-[2px_2px_0px_#000]"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <h4 className="text-xs font-bold text-white font-mono">{reg.name}</h4>
                      <div className="text-[10px] font-mono text-sky-400">
                        I/O Cím: <strong>{reg.addressIoHex}</strong> | Memória (SRAM) Cím:{' '}
                        <strong>{reg.addressMemHex}</strong>
                      </div>
                    </div>
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-xs bg-sky-950 text-sky-300 border border-sky-500/40">
                      8-bit R/W
                    </span>
                  </div>

                  <p className="text-[11px] text-[#C5C8D4] leading-relaxed">{reg.descriptionHu}</p>

                  {/* Bit Definition Table */}
                  <div className="space-y-1">
                    <div className="text-[10px] font-mono font-bold text-[#8A8D98] uppercase">
                      Bitek Felbontása:
                    </div>
                    <div className="grid grid-cols-1 gap-1">
                      {reg.bitDefinitions.map((b) => (
                        <div
                          key={b.bit}
                          className="px-2 py-1 bg-[#0F1115] border border-[#2A2D35] rounded-xs flex items-center justify-between text-[10px] font-mono"
                        >
                          <div className="flex items-center gap-2">
                            <span className="w-4 text-sky-400 font-bold">b{b.bit}</span>
                            <span className="text-white font-bold">{b.name}</span>
                          </div>
                          <span className="text-[#8A8D98] truncate max-w-[200px]">{b.desc}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {reg.electricalNotes && (
                    <div className="p-2 bg-amber-950/30 border border-amber-500/40 rounded-xs text-[10px] text-amber-200 flex items-start gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                      <span>{reg.electricalNotes}</span>
                    </div>
                  )}
                </div>
              ))
            )}

            {/* Safety alert if any */}
            {inspection.safetyAlertHu && (
              <div className="p-2.5 bg-rose-950/40 border border-rose-500/60 rounded-xs text-[11px] text-rose-200 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{inspection.safetyAlertHu}</span>
              </div>
            )}
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 3: DATASHEET & DETAILED DOCUMENTATION                           */}
        {/* =================================================================== */}
        {activeTab === 'datasheet' && (
          <div className="space-y-3">
            <div className="p-3 bg-[#161920] border border-[#2A2D35] rounded-xs space-y-2 shadow-[2px_2px_0px_#000]">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-white font-mono flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-sky-400" />
                  <span>{activeDatasheet.mnemonic} - {activeDatasheet.fullName}</span>
                </h4>
                <span className="text-[9px] font-mono bg-sky-950 text-sky-300 px-1.5 py-0.5 rounded-xs border border-sky-500/40">
                  {activeDatasheet.datasheetSection}
                </span>
              </div>

              <p className="text-[11px] text-[#E0E0E6] leading-relaxed">
                {activeDatasheet.summaryHu}
              </p>

              <div className="p-2 bg-[#0F1115] border border-[#2A2D35] rounded-xs space-y-1 text-[11px]">
                <div className="text-sky-300 font-bold font-mono">Működés és Csővezeték (Pipeline):</div>
                <p className="text-[#C5C8D4] leading-relaxed">{activeDatasheet.detailedDescHu}</p>
              </div>

              {/* Operands and Constraints */}
              <div className="grid grid-cols-1 gap-1.5 pt-1 text-[10px] font-mono">
                <div className="p-1.5 bg-[#0F1115] border border-[#2A2D35] rounded-xs">
                  <strong className="text-sky-400">Operandusok:</strong>{' '}
                  <span className="text-white">{activeDatasheet.operands}</span>
                </div>
                <div className="p-1.5 bg-[#0F1115] border border-[#2A2D35] rounded-xs">
                  <strong className="text-sky-400">Megkötések:</strong>{' '}
                  <span className="text-[#8A8D98]">{activeDatasheet.operandsDesc}</span>
                </div>
              </div>

              {/* Hardware Tips */}
              <div className="p-2 bg-[#1A1813] border border-amber-500/40 rounded-xs text-[11px] text-amber-200/90 flex items-start gap-1.5">
                <Info className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-amber-300 font-mono">Hardveres Jó Tanács:</strong>{' '}
                  <span>{activeDatasheet.hardwareNotesHu}</span>
                </div>
              </div>

              {/* C Equivalent Code */}
              <div className="space-y-1 pt-1">
                <div className="text-[10px] font-mono text-[#8A8D98]">C / C++ Megfelelő:</div>
                <pre className="p-2 bg-[#0F1115] border border-[#2A2D35] rounded-xs text-[10px] font-mono text-[#4ade80]">
                  {activeDatasheet.cEquivalent}
                </pre>
              </div>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 4: COMPLETE AVR INSTRUCTION CATALOG                             */}
        {/* =================================================================== */}
        {activeTab === 'catalog' && (
          <div className="space-y-2.5">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#8A8D98] absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Keresés (pl. SBI, LDI, RJMP, BREQ, OUT...)"
                className="w-full pl-8 pr-3 py-1.5 bg-[#0F1115] border border-[#3A3F4B] rounded-xs text-xs font-mono text-white placeholder-[#8A8D98] focus:border-sky-400 focus:outline-none"
              />
            </div>

            {/* Catalog List */}
            <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
              {filteredCatalog.map((doc) => {
                const isSelected = (selectedMnemonicOverride || inspection.primaryMnemonic) === doc.mnemonic;
                return (
                  <div
                    key={doc.mnemonic}
                    onClick={() => {
                      setSelectedMnemonicOverride(doc.mnemonic);
                      setActiveTab('datasheet');
                    }}
                    className={`p-2 rounded-xs border text-xs cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-sky-950/70 border-sky-500 text-white shadow-[1px_1px_0px_#000]'
                        : 'bg-[#161920] border-[#2A2D35] hover:border-sky-500/50 hover:bg-[#1A1D24] text-[#E0E0E6]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-sky-400">{doc.mnemonic}</span>
                        <span className="font-medium text-[11px] truncate max-w-[180px]">{doc.fullNameHu}</span>
                      </div>
                      <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-xs bg-[#0F1115] text-[#8A8D98] border border-[#2A2D35]">
                        {doc.cycles} cyc
                      </span>
                    </div>
                    <div className="text-[10px] text-[#8A8D98] font-mono mt-0.5 truncate">
                      {doc.syntax} — {doc.category}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Footer Navigation Bar */}
      <div className="px-3.5 py-2 bg-[#161920] border-t border-[#2A2D35] flex items-center justify-between gap-2 text-[10px] font-mono text-[#8A8D98]">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#4ade80] animate-pulse" />
          <span>Szinkronban a kijelöléssel</span>
        </div>

        <div className="flex items-center gap-2">
          {allBlocks.length > 1 && onSelectBlock && (
            <select
              value={effectiveBlock.id}
              onChange={(e) => onSelectBlock(e.target.value)}
              className="bg-[#0F1115] border border-[#3A3F4B] text-white rounded-xs px-2 py-0.5 text-[10px] focus:outline-none focus:border-sky-400"
            >
              {allBlocks.map((b, idx) => (
                <option key={b.id} value={b.id}>
                  #{idx + 1} {b.type} ({b.scope})
                </option>
              ))}
            </select>
          )}
        </div>
      </div>
    </div>
  );
};
