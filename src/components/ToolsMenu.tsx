/**
 * (c) 2026 AI Studio AVR Visual Studio
 * Dedicated Tools & Inspection Dropdown Menu
 * Expandable menu container for hardware analysis, linter, timing analyzer, logic trace, and pinout wiring
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  ChevronDown,
  Wrench,
  Activity,
  Sliders,
  Tv,
  Layers,
  Cpu,
  Zap,
  Clock,
  Sparkles,
  Lock,
  Flame,
  Radio,
  Wifi,
  GitMerge,
} from 'lucide-react';
import { ProgramBlock, VariableDefinition } from '../types';
import { runHardwareLinter } from '../utils/hardwareLinter';

interface ToolsMenuProps {
  blocks: ProgramBlock[];
  variables?: VariableDefinition[];
  onOpenLinter: () => void;
  onOpenTimingProfiler?: () => void;
  onOpenStateMachine?: () => void;
  onOpenDependencyMatrix?: () => void;
  onOpenLogicAnalyzer?: () => void;
  onOpenVirtualWiring?: () => void;
  onOpenAvrDocs?: () => void;
  onOpenAvrFuses?: () => void;
  onOpenAvrInterrupts?: () => void;
  onOpenEsp32Interrupts?: () => void;
  onOpenRtosEditor?: () => void;
  onOpenEsp32Dma?: () => void;
  onOpenPointerStudio?: () => void;
  onOpenEsp32I2a?: () => void;
  onOpenConnectivityModal?: () => void;
  onOpenBootloaderModal?: () => void;
  onOpenWatchpoints?: () => void;
  onOpenStackVisualizer?: () => void;
}

export const ToolsMenu: React.FC<ToolsMenuProps> = ({
  blocks,
  variables = [],
  onOpenLinter,
  onOpenTimingProfiler,
  onOpenStateMachine,
  onOpenDependencyMatrix,
  onOpenLogicAnalyzer,
  onOpenVirtualWiring,
  onOpenAvrDocs,
  onOpenAvrFuses,
  onOpenAvrInterrupts,
  onOpenEsp32Interrupts,
  onOpenRtosEditor,
  onOpenEsp32Dma,
  onOpenEsp32I2a,
  onOpenConnectivityModal,
  onOpenBootloaderModal,
  onOpenWatchpoints,
  onOpenStackVisualizer,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [menuAlignment, setMenuAlignment] = useState<'left' | 'right'>('left');
  const menuRef = useRef<HTMLDivElement>(null);

  const hasProgram = blocks.length > 0;

  // Run linter only when program exists to display live badge
  const lintReport = hasProgram ? runHardwareLinter(blocks, variables) : null;
  const criticalCount = lintReport?.criticalCount || 0;
  const warningCount = lintReport?.warningCount || 0;
  const totalIssues = (lintReport?.items?.length) || 0;

  // Auto-detect best dropdown alignment to prevent overflowing off-screen
  useEffect(() => {
    if (isOpen && menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      const dropdownWidth = 384;
      if (rect.left + dropdownWidth > window.innerWidth - 16) {
        setMenuAlignment('right');
      } else {
        setMenuAlignment('left');
      }
    }
  }, [isOpen]);

  // Close dropdown when clicked outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={menuRef} className="relative inline-block text-left select-none">
      {/* Main Menu Trigger Button */}
      <button
        id="btn-tools-menu"
        type="button"
        disabled={!hasProgram}
        onClick={() => hasProgram && setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-bold rounded-xs shadow-[2px_2px_0px_#000] transition-all cursor-pointer border ${
          !hasProgram
            ? 'bg-[#12141A] text-[#8A8D98] border-[#2A2D35] opacity-50 cursor-not-allowed'
            : criticalCount > 0
            ? 'bg-rose-950/80 hover:bg-rose-900/80 text-rose-300 border-rose-500/80 shadow-[0_0_10px_rgba(244,63,94,0.3)] animate-pulse'
            : warningCount > 0
            ? 'bg-amber-950/80 hover:bg-amber-900/80 text-amber-300 border-amber-500/80'
            : 'bg-[#1A1D24] hover:bg-[#4ade80]/20 text-[#4ade80] border-[#4ade80]/60 hover:border-[#4ade80]'
        }`}
        title={
          !hasProgram
            ? 'A menü inaktív: Először adj hozzá vagy tölts be blokkokat az ellenőrzéshez!'
            : 'Intelligens Hardver Ellenőrzés & Diagnosztikai Eszközök'
        }
      >
        {!hasProgram ? (
          <Lock className="w-3.5 h-3.5 text-[#8A8D98]" />
        ) : criticalCount > 0 ? (
          <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
        ) : (
          <ShieldCheck className="w-3.5 h-3.5 text-[#4ade80]" />
        )}

        <span className="hidden sm:inline">Ellenőrzés & Eszközök</span>
        <span className="inline sm:hidden">Ellenőrzés</span>

        {/* Live Issue Badge */}
        {hasProgram && (
          <span
            className={`text-[9px] font-mono px-1.5 py-0.2 rounded-xs border font-bold ${
              criticalCount > 0
                ? 'bg-rose-500 text-white border-rose-600'
                : warningCount > 0
                ? 'bg-amber-500 text-black border-amber-600'
                : 'bg-black/60 text-[#4ade80] border-[#4ade80]/40'
            }`}
          >
            {totalIssues === 0 ? '✓ OK' : `${totalIssues} hiba`}
          </span>
        )}

        <ChevronDown
          className={`w-3.5 h-3.5 transition-transform duration-150 ${
            isOpen ? 'rotate-180 text-white' : 'text-[#8A8D98]'
          }`}
        />
      </button>

      {/* Dropdown Menu Container */}
      {isOpen && hasProgram && (
        <div
          id="tools-dropdown-menu"
          className={`absolute ${
            menuAlignment === 'right' ? 'right-0' : 'left-0'
          } mt-1.5 w-80 sm:w-96 max-w-[calc(100vw-1.5rem)] rounded-xs bg-[#161920] border border-[#2A2D35] shadow-[6px_6px_0px_#000] z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100 font-sans max-h-[85vh] overflow-y-auto`}
        >
          {/* Menu Header */}
          <div className="px-3.5 py-2 bg-[#12141A] border-b border-[#2A2D35] flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#4ade80]" />
              <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                Intelligens Eszköztár & Elemzők
              </span>
            </div>
            <span className="text-[10px] font-mono text-[#8A8D98]">
              {blocks.length} aktív blokk
            </span>
          </div>

          <div className="p-1.5 space-y-1">

            {/* FEATURE: Függőségi Mátrix & Adatfolyam Elemző */}
            {onOpenDependencyMatrix && (
              <button
                id="menu-item-dependency-matrix"
                onClick={() => {
                  setIsOpen(false);
                  onOpenDependencyMatrix();
                }}
                className="w-full text-left p-2.5 rounded-xs bg-[#1A1D24] hover:bg-indigo-500/15 border border-[#3A3F4B] hover:border-indigo-400 transition-colors group cursor-pointer"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-xs bg-indigo-950/60 text-indigo-400 border border-indigo-500/40 group-hover:scale-105 transition-transform">
                      <GitMerge className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white font-mono flex items-center gap-1.5">
                        <span>Függőségi Gráf & Illesztési Mátrix</span>
                        <span className="text-[9px] bg-indigo-950 text-indigo-300 px-1 py-0.2 rounded-xs border border-indigo-500/40">
                          ÚJ
                        </span>
                      </div>
                      <p className="text-[11px] text-[#8A8D98] group-hover:text-[#C5C8D4] leading-tight mt-0.5">
                        Interaktív adatfolyam, beágyazhatósági szabályok és automatikus inicializálatlan I/O javítás.
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-xs border bg-indigo-950 text-indigo-300 border-indigo-500/40">
                      Elemző
                    </span>
                  </div>
                </div>
              </button>
            )}

            {/* FEATURE 1: Hardver-Ütközés & Statikus Kódelemző (ACTIVE) */}
            <button
              id="menu-item-hardware-linter"
              onClick={() => {
                setIsOpen(false);
                onOpenLinter();
              }}
              className="w-full text-left p-2.5 rounded-xs bg-[#1A1D24] hover:bg-[#4ade80]/15 border border-[#3A3F4B] hover:border-[#4ade80] transition-colors group cursor-pointer"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-xs bg-emerald-950/60 text-[#4ade80] border border-emerald-500/40 group-hover:scale-105 transition-transform">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white font-mono flex items-center gap-1.5">
                      <span>Hardver-Ütközés & Kódelemző</span>
                      <span className="text-[9px] bg-emerald-950 text-[#4ade80] px-1 py-0.2 rounded-xs border border-emerald-500/40">
                        ELÉRHETŐ
                      </span>
                    </div>
                    <p className="text-[11px] text-[#8A8D98] group-hover:text-[#C5C8D4] leading-tight mt-0.5">
                      Lábütközések, hiányzó DDR inicializációk, lebegő bemenetek és 1-kattintásos javítás
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span
                    className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-xs border ${
                      criticalCount > 0
                        ? 'bg-rose-950 text-rose-300 border-rose-500/60'
                        : warningCount > 0
                        ? 'bg-amber-950 text-amber-300 border-amber-500/60'
                        : 'bg-emerald-950 text-[#4ade80] border-emerald-500/40'
                    }`}
                  >
                    {totalIssues === 0 ? '100% Tiszta' : `${totalIssues} észrevétel`}
                  </span>
                </div>
              </div>
            </button>

            {/* FEATURE 2: Óraciklus & Időzítés Elemző (ACTIVE) */}
            {onOpenTimingProfiler ? (
              <button
                id="menu-item-timing-profiler"
                onClick={() => {
                  setIsOpen(false);
                  onOpenTimingProfiler();
                }}
                className="w-full text-left p-2.5 rounded-xs bg-[#1A1D24] hover:bg-amber-500/15 border border-[#3A3F4B] hover:border-amber-400 transition-colors group cursor-pointer"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-xs bg-amber-950/60 text-amber-400 border border-amber-500/40 group-hover:scale-105 transition-transform">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white font-mono flex items-center gap-1.5">
                        <span>Óraciklus- & Fogyasztás Elemző</span>
                        <span className="text-[9px] bg-amber-950 text-amber-300 px-1 py-0.2 rounded-xs border border-amber-500/40">
                          ELÉRHETŐ
                        </span>
                      </div>
                      <p className="text-[11px] text-[#8A8D98] group-hover:text-[#C5C8D4] leading-tight mt-0.5">
                        Végrehajtási idő (ns/µs), blokkoló delay arány és mA áramfelvételi profil
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-xs border bg-amber-950 text-amber-300 border-amber-500/40">
                      16 MHz AVR
                    </span>
                  </div>
                </div>
              </button>
            ) : (
              <div className="p-2.5 rounded-xs bg-[#12141A]/70 border border-[#2A2D35] opacity-70 cursor-not-allowed">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-xs bg-[#1A1D24] text-amber-400 border border-[#3A3F4B]">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-[#E0E0E6] font-mono flex items-center gap-1.5">
                        <span>Óraciklus- & Fogyasztás Elemző</span>
                      </div>
                      <p className="text-[11px] text-[#8A8D98] leading-tight mt-0.5">
                        Végrehajtási idő (ns/µs), blokkoló delay vizsgálat és mA áramfelvételi profil
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TOOL 3: Virtuális Oszcilloszkóp & Logikai Elemző (ACTIVE) */}
            {onOpenLogicAnalyzer ? (
              <button
                id="menu-item-logic-analyzer"
                onClick={() => {
                  setIsOpen(false);
                  onOpenLogicAnalyzer();
                }}
                className="w-full text-left p-2.5 rounded-xs bg-[#1A1D24] hover:bg-sky-500/15 border border-[#3A3F4B] hover:border-sky-400 transition-colors group cursor-pointer"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-xs bg-sky-950/60 text-sky-400 border border-sky-500/40 group-hover:scale-105 transition-transform">
                      <Activity className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white font-mono flex items-center gap-1.5">
                        <span>Saleae Logikai Analizátor & Trace</span>
                        <span className="text-[9px] bg-emerald-950 text-emerald-300 px-1 py-0.2 rounded-xs border border-emerald-500/40 font-bold">
                          1 CIKLUS ZOOM
                        </span>
                      </div>
                      <p className="text-[11px] text-[#8A8D98] group-hover:text-[#C5C8D4] leading-tight mt-0.5">
                        Minden pin, PC, SP, SREG sáv, 1-ciklus zoom és drag&drop intervallum mérés
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-xs border bg-sky-950 text-sky-300 border-sky-500/40">
                      Saleae Trace
                    </span>
                  </div>
                </div>
              </button>
            ) : null}

            {/* TOOL: AVR Watchpoint (Adat Breakpoint) Rendszer (ACTIVE) */}
            {onOpenWatchpoints && (
              <button
                id="menu-item-watchpoints"
                onClick={() => {
                  setIsOpen(false);
                  onOpenWatchpoints();
                }}
                className="w-full text-left p-2.5 rounded-xs bg-[#1A1D24] hover:bg-amber-500/15 border border-[#3A3F4B] hover:border-amber-400 transition-colors group cursor-pointer"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-xs bg-amber-950/60 text-amber-400 border border-amber-500/40 group-hover:scale-105 transition-transform">
                      <ShieldAlert className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white font-mono flex items-center gap-1.5">
                        <span>AVR Watchpoint (Adat Breakpoint)</span>
                        <span className="text-[9px] bg-amber-950 text-amber-300 px-1 py-0.2 rounded-xs border border-amber-500/40 font-bold">
                          ÚJ
                        </span>
                      </div>
                      <p className="text-[11px] text-[#8A8D98] group-hover:text-[#C5C8D4] leading-tight mt-0.5">
                        Megállás pl. SRAM[0x0100] == 0xFF vagy PORTB írásakor, regiszter feltételekre
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-xs border bg-amber-950 text-amber-300 border-amber-500/40">
                      Watchpoints
                    </span>
                  </div>
                </div>
              </button>
            )}

            {/* TOOL: AVR Stack & Heap Vizualizáció és Overflow Detektor (ACTIVE) */}
            {onOpenStackVisualizer && (
              <button
                id="menu-item-stack-visualizer"
                onClick={() => {
                  setIsOpen(false);
                  onOpenStackVisualizer();
                }}
                className="w-full text-left p-2.5 rounded-xs bg-[#1A1D24] hover:bg-indigo-500/15 border border-[#3A3F4B] hover:border-indigo-400 transition-colors group cursor-pointer"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-xs bg-indigo-950/60 text-indigo-400 border border-indigo-500/40 group-hover:scale-105 transition-transform">
                      <Flame className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white font-mono flex items-center gap-1.5">
                        <span>AVR Stack & Heap Vizualizáció</span>
                        <span className="text-[9px] bg-indigo-950 text-indigo-300 px-1 py-0.2 rounded-xs border border-indigo-500/40 font-bold">
                          SRAM TÉRKÉP
                        </span>
                      </div>
                      <p className="text-[11px] text-[#8A8D98] group-hover:text-[#C5C8D4] leading-tight mt-0.5">
                        SRAM teteje stack rajz, heap határ, hívási keretek és stack overflow robbanás
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-xs border bg-indigo-950 text-indigo-300 border-indigo-500/40">
                      Stack Map
                    </span>
                  </div>
                </div>
              </button>
            )}

            {/* TOOL 4: Virtuális Bekötési Rajz & Pinout (ACTIVE) */}
            {onOpenVirtualWiring ? (
              <button
                id="menu-item-virtual-wiring"
                onClick={() => {
                  setIsOpen(false);
                  onOpenVirtualWiring();
                }}
                className="w-full text-left p-2.5 rounded-xs bg-[#1A1D24] hover:bg-cyan-500/15 border border-[#3A3F4B] hover:border-cyan-400 transition-colors group cursor-pointer"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-xs bg-cyan-950/60 text-cyan-400 border border-cyan-500/40 group-hover:scale-105 transition-transform">
                      <Cpu className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white font-mono flex items-center gap-1.5">
                        <span>Virtuális Bekötési Rajz & Pinout</span>
                        <span className="text-[9px] bg-cyan-950 text-cyan-300 px-1 py-0.2 rounded-xs border border-cyan-500/40">
                          ELÉRHETŐ
                        </span>
                      </div>
                      <p className="text-[11px] text-[#8A8D98] group-hover:text-[#C5C8D4] leading-tight mt-0.5">
                        Interaktív Uno kapcsolási rajz, próbapanel huzalozás, alkatrészlista (BOM) és DRC
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-xs border bg-cyan-950 text-cyan-300 border-cyan-500/40">
                      Breadboard & BOM
                    </span>
                  </div>
                </div>
              </button>
            ) : null}

            {/* FEATURE 4: Vizuális Állapotgép (FSM) Tervező (ACTIVE) */}
            {onOpenStateMachine ? (
              <button
                id="menu-item-state-machine"
                onClick={() => {
                  setIsOpen(false);
                  onOpenStateMachine();
                }}
                className="w-full text-left p-2.5 rounded-xs bg-[#1A1D24] hover:bg-purple-500/15 border border-[#3A3F4B] hover:border-purple-400 transition-colors group cursor-pointer"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-xs bg-purple-950/60 text-purple-400 border border-purple-500/40 group-hover:scale-105 transition-transform">
                      <Layers className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white font-mono flex items-center gap-1.5">
                        <span>Vizuális Állapotgép (FSM) Tervező</span>
                        <span className="text-[9px] bg-purple-950 text-purple-300 px-1 py-0.2 rounded-xs border border-purple-500/40">
                          ELÉRHETŐ
                        </span>
                      </div>
                      <p className="text-[11px] text-[#8A8D98] group-hover:text-[#C5C8D4] leading-tight mt-0.5">
                        Állapotdiagram készítő, eseményvezérelt átmenetek és 1-kattintásos blokk generálás
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-xs border bg-purple-950 text-purple-300 border-purple-500/40">
                      FSM Engine
                    </span>
                  </div>
                </div>
              </button>
            ) : (
              <div className="p-2.5 rounded-xs bg-[#12141A]/70 border border-[#2A2D35] opacity-70 cursor-not-allowed">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-xs bg-[#1A1D24] text-purple-400 border border-[#3A3F4B]">
                      <Layers className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-[#E0E0E6] font-mono flex items-center gap-1.5">
                        <span>Vizuális Állapotgép (FSM) Tervező</span>
                      </div>
                      <p className="text-[11px] text-[#8A8D98] leading-tight mt-0.5">
                        Állapotok és eseményvezérelt átmenetek tervezése
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* FEATURE: Dedikált FreeRTOS Kétmagos Architektúra Szerkesztő (ACTIVE) */}
            {onOpenRtosEditor && (
              <button
                id="menu-item-rtos-editor"
                onClick={() => {
                  setIsOpen(false);
                  onOpenRtosEditor();
                }}
                className="w-full text-left p-2.5 rounded-xs bg-[#1A1D24] hover:bg-cyan-500/15 border border-[#3A3F4B] hover:border-cyan-400 transition-colors group cursor-pointer"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-xs bg-cyan-950/60 text-cyan-400 border border-cyan-500/40 group-hover:scale-105 transition-transform">
                      <Cpu className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white font-mono flex items-center gap-1.5">
                        <span>🚀 FreeRTOS Kétmagos Architektúra</span>
                        <span className="text-[9px] bg-cyan-950 text-cyan-300 px-1 py-0.2 rounded-xs border border-cyan-500/40">
                          D&D + LINTER
                        </span>
                      </div>
                      <p className="text-[11px] text-[#8A8D98] group-hover:text-[#C5C8D4] leading-tight mt-0.5">
                        Taszkok, Queue csatornák, Mutexek, Megosztott/Közvetlen változók, valós idejű linter és auto-fix
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-xs border bg-cyan-950 text-cyan-300 border-cyan-500/40">
                      ESP32 Dual-Core
                    </span>
                  </div>
                </div>
              </button>
            )}

            {/* FEATURE: ESP32 Hálózati & BLE Kapcsolatkezelő */}
            {onOpenConnectivityModal && (
              <button
                id="menu-item-esp32-connectivity"
                onClick={() => {
                  setIsOpen(false);
                  onOpenConnectivityModal();
                }}
                className="w-full text-left p-2.5 rounded-xs bg-[#1A1D24] hover:bg-emerald-500/15 border border-[#3A3F4B] hover:border-emerald-400 transition-colors group cursor-pointer"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-xs bg-emerald-950/60 text-emerald-400 border border-emerald-500/40 group-hover:scale-105 transition-transform">
                      <Wifi className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white font-mono flex items-center gap-1.5">
                        <span>ESP32 WiFi, Statikus IP & BLE</span>
                        <span className="text-[9px] bg-emerald-950 text-emerald-300 px-1 py-0.2 rounded-xs border border-emerald-500/40">
                          STA / AP / BLE
                        </span>
                      </div>
                      <p className="text-[11px] text-[#8A8D98] group-hover:text-[#C5C8D4] leading-tight mt-0.5">
                        WiFi SSID konfiguráció, Statikus IP & DNS, SoftAP hotspot, BLE 5.0 Advertising, GATT szerver és iBeacon
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-xs border bg-emerald-950 text-emerald-300 border-emerald-500/40">
                      RF Stack
                    </span>
                  </div>
                </div>
              </button>
            )}

            {/* FEATURE: ESP32 Kétmagos Megszakítás Mátrix & ISR Tervező */}
            {onOpenEsp32Interrupts && (
              <button
                id="menu-item-esp32-interrupts"
                onClick={() => {
                  setIsOpen(false);
                  onOpenEsp32Interrupts();
                }}
                className="w-full text-left p-2.5 rounded-xs bg-[#1A1D24] hover:bg-sky-500/15 border border-[#3A3F4B] hover:border-sky-400 transition-colors group cursor-pointer"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-xs bg-sky-950/60 text-sky-400 border border-sky-500/40 group-hover:scale-105 transition-transform">
                      <Zap className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white font-mono flex items-center gap-1.5">
                        <span>⚡ ESP32 Megszakítás Mátrix & ISR Tervező</span>
                        <span className="text-[9px] bg-sky-950 text-sky-300 px-1 py-0.2 rounded-xs border border-sky-500/40">
                          32 FORRÁS
                        </span>
                      </div>
                      <p className="text-[11px] text-[#8A8D98] group-hover:text-[#C5C8D4] leading-tight mt-0.5">
                        Xtensa Dual-Core (PRO/APP CPU), 7 prioritási szint, IRAM_ATTR nulla késleltetés & FreeRTOS IPC
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-xs border bg-sky-950 text-sky-300 border-sky-500/40">
                      Xtensa Matrix
                    </span>
                  </div>
                </div>
              </button>
            )}

            {/* FEATURE: ESP32 DMA Controller & Puffer Menedzser */}
            {onOpenEsp32Dma && (
              <button
                id="menu-item-esp32-dma"
                onClick={() => {
                  setIsOpen(false);
                  onOpenEsp32Dma();
                }}
                className="w-full text-left p-2.5 rounded-xs bg-[#1A1D24] hover:bg-cyan-500/15 border border-[#3A3F4B] hover:border-cyan-400 transition-colors group cursor-pointer"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-xs bg-cyan-950/60 text-cyan-400 border border-cyan-500/40 group-hover:scale-105 transition-transform">
                      <Zap className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white font-mono flex items-center gap-1.5">
                        <span>ESP32 DMA Controller & Pufferek</span>
                        <span className="text-[9px] bg-cyan-950 text-cyan-300 px-1 py-0.2 rounded-xs border border-cyan-500/40">
                          lldesc_t
                        </span>
                      </div>
                      <p className="text-[11px] text-[#8A8D98] group-hover:text-[#C5C8D4] leading-tight mt-0.5">
                        Közvetlen memóriahozzáférés láncolt leírók, körkörös gyűrűpuffer, CPU offload mérés és SPI/GDMA
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-xs border bg-cyan-950 text-cyan-300 border-cyan-500/40">
                      Zero-CPU DMA
                    </span>
                  </div>
                </div>
              </button>
            )}

            {/* FEATURE: ESP32 I2A / I2S Audio Menedzser */}
            {onOpenEsp32I2a && (
              <button
                id="menu-item-esp32-i2a"
                onClick={() => {
                  setIsOpen(false);
                  onOpenEsp32I2a();
                }}
                className="w-full text-left p-2.5 rounded-xs bg-[#1A1D24] hover:bg-purple-500/15 border border-[#3A3F4B] hover:border-purple-400 transition-colors group cursor-pointer"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-xs bg-purple-950/60 text-purple-400 border border-purple-500/40 group-hover:scale-105 transition-transform">
                      <Radio className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white font-mono flex items-center gap-1.5">
                        <span>ESP32 I2A / I2S Audio Menedzsment</span>
                        <span className="text-[9px] bg-purple-950 text-purple-300 px-1 py-0.2 rounded-xs border border-purple-500/40">
                          Hi-Fi & PDM
                        </span>
                      </div>
                      <p className="text-[11px] text-[#8A8D98] group-hover:text-[#C5C8D4] leading-tight mt-0.5">
                        Oszcilloszkóp & 16-sávos FFT spektrum, szintetizátor, PDM mikrofon, DAC/ADC DMA és órajel PLL
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-xs border bg-purple-950 text-purple-300 border-purple-500/40">
                      I2S DSP
                    </span>
                  </div>
                </div>
              </button>
            )}


            {onOpenPointerStudio && (
              <button
                id="menu-item-pointer-studio"
                onClick={() => {
                  setIsOpen(false);
                  onOpenPointerStudio();
                }}
                className="w-full text-left p-2.5 rounded-xs bg-[#1A1D24] hover:bg-violet-500/15 border border-[#3A3F4B] hover:border-violet-400 transition-colors group cursor-pointer"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-xs bg-violet-950/60 text-violet-400 border border-violet-500/40 group-hover:scale-105 transition-transform">
                      <Cpu className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white font-mono flex items-center gap-1.5">
                        <span>C Pointer Stúdió</span>
                        <span className="text-[9px] bg-violet-950 text-violet-300 px-1 py-0.2 rounded-xs border border-violet-500/40">
                          X/Y/Z PTR
                        </span>
                      </div>
                      <p className="text-[11px] text-[#8A8D98] group-hover:text-[#C5C8D4] leading-tight mt-0.5">
                        Indirekt memóriacímzés, Pointer aritmetika, Hardveres C-ASM generátor
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-xs border bg-violet-950 text-violet-300 border-violet-500/40">
                      SRAM
                    </span>
                  </div>
                </div>
              </button>
            )}

            {/* FEATURE: Arduino Vizuális Bootloader Stúdió (ACTIVE) */}
            {onOpenBootloaderModal && (
              <button
                id="menu-item-arduino-bootloader"
                onClick={() => {
                  setIsOpen(false);
                  onOpenBootloaderModal();
                }}
                className="w-full text-left p-2.5 rounded-xs bg-[#1A1D24] hover:bg-amber-500/15 border border-[#3A3F4B] hover:border-amber-400 transition-colors group cursor-pointer"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-xs bg-amber-950/60 text-amber-400 border border-amber-500/40 group-hover:scale-105 transition-transform">
                      <Zap className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white font-mono flex items-center gap-1.5">
                        <span>⚡ Arduino Bootloader Stúdió</span>
                        <span className="text-[9px] bg-amber-950 text-amber-300 px-1 py-0.2 rounded-xs border border-amber-500/40">
                          VIZUÁLIS SZERKESZTŐ
                        </span>
                      </div>
                      <p className="text-[11px] text-[#8A8D98] group-hover:text-[#C5C8D4] leading-tight mt-0.5">
                        Optiboot konfiguráció, Flash partíciók, UART Baud időzítés & szimulátoros beégetés
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-xs border bg-amber-950 text-amber-300 border-amber-500/40">
                      Optiboot
                    </span>
                  </div>
                </div>
              </button>
            )}

            {/* FEATURE: AVR Megszakítás Architektúra & Vizuális Tervező (ACTIVE) */}
            {onOpenAvrInterrupts && (
              <button
                id="menu-item-avr-interrupts"
                onClick={() => {
                  setIsOpen(false);
                  onOpenAvrInterrupts();
                }}
                className="w-full text-left p-2.5 rounded-xs bg-[#1A1D24] hover:bg-purple-500/15 border border-[#3A3F4B] hover:border-purple-400 transition-colors group cursor-pointer"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-xs bg-purple-950/60 text-purple-400 border border-purple-500/40 group-hover:scale-105 transition-transform">
                      <ShieldAlert className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white font-mono flex items-center gap-1.5">
                        <span>⚡ AVR Megszakítás Architektúra & Tervező</span>
                        <span className="text-[9px] bg-purple-950 text-purple-300 px-1 py-0.2 rounded-xs border border-purple-500/40">
                          26 VEKTOR
                        </span>
                      </div>
                      <p className="text-[11px] text-[#8A8D98] group-hover:text-[#C5C8D4] leading-tight mt-0.5">
                        INT0/INT1 élérzékelés, Timer CTC frekvencia kalkulátor, PCINT maszkok, valós idejű szimuláció & C++/ASM generálás
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-xs border bg-purple-950 text-purple-300 border-purple-500/40">
                      ISR Designer
                    </span>
                  </div>
                </div>
              </button>
            )}

            {/* FEATURE 5: AVR FUSE & Lock Bitek Kezelő (ACTIVE) */}
            {onOpenAvrFuses && (
              <button
                id="menu-item-avr-fuses"
                onClick={() => {
                  setIsOpen(false);
                  onOpenAvrFuses();
                }}
                className="w-full text-left p-2.5 rounded-xs bg-[#1A1D24] hover:bg-emerald-500/15 border border-[#3A3F4B] hover:border-emerald-400 transition-colors group cursor-pointer"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-xs bg-emerald-950/60 text-emerald-400 border border-emerald-500/40 group-hover:scale-105 transition-transform">
                      <Flame className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white font-mono flex items-center gap-1.5">
                        <span>AVR FUSE & Lock Bitek</span>
                        <span className="text-[9px] bg-emerald-950 text-emerald-300 px-1 py-0.2 rounded-xs border border-emerald-500/40">
                          ELÉRHETŐ
                        </span>
                      </div>
                      <p className="text-[11px] text-[#8A8D98] group-hover:text-[#C5C8D4] leading-tight mt-0.5">
                        Órajelforrás (CKSEL), Brown-out (BOD), Bootloader méret, Lock bitek & Avrdude parancsok
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-xs border bg-emerald-950 text-emerald-300 border-emerald-500/40">
                      Fuse Matrix
                    </span>
                  </div>
                </div>
              </button>
            )}

            {/* FEATURE 6: Lebegő AVR Utasítás & Datasheet Doku (ACTIVE) */}
            {onOpenAvrDocs && (
              <button
                id="menu-item-avr-docs"
                onClick={() => {
                  setIsOpen(false);
                  onOpenAvrDocs();
                }}
                className="w-full text-left p-2.5 rounded-xs bg-[#1A1D24] hover:bg-sky-500/15 border border-[#3A3F4B] hover:border-sky-400 transition-colors group cursor-pointer"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-xs bg-sky-950/60 text-sky-400 border border-sky-500/40 group-hover:scale-105 transition-transform">
                      <Cpu className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white font-mono flex items-center gap-1.5">
                        <span>AVR Utasítás & Datasheet Doku</span>
                        <span className="text-[9px] bg-sky-950 text-sky-300 px-1 py-0.2 rounded-xs border border-sky-500/40">
                          ELÉRHETŐ
                        </span>
                      </div>
                      <p className="text-[11px] text-[#8A8D98] group-hover:text-[#C5C8D4] leading-tight mt-0.5">
                        16-bites opkódok, SREG jelzők, gépi ciklusok és Atmel mikrokontroller dokumentáció
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-xs border bg-sky-950 text-sky-300 border-sky-500/40">
                      Lebegő Panel
                    </span>
                  </div>
                </div>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
