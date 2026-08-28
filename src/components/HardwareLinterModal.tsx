/**
 * (c) 2026 AI Studio AVR Visual Studio
 * Hardware Linter & Static Collision Analyzer Modal
 * Interactive diagnostic center for pin conflicts, missing inits, and 1-click fixes
 */

import React, { useState, useMemo } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Info,
  CheckCircle2,
  Zap,
  Cpu,
  Wrench,
  RefreshCw,
  Copy,
  Check,
  Filter,
  Layers,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { ProgramBlock, VariableDefinition } from '../types';
import {
  runHardwareLinter,
  HardwareLintReport,
  HardwareLintItem,
  LinterSeverity,
  LinterCategory,
} from '../utils/hardwareLinter';
import { incrementBuild } from '../utils/versionManager';

interface HardwareLinterModalProps {
  isOpen: boolean;
  onClose: () => void;
  blocks: ProgramBlock[];
  setBlocks: React.Dispatch<React.SetStateAction<ProgramBlock[]>>;
  variables?: VariableDefinition[];
}

const PWM_PINS = new Set(['3', '5', '6', '9', '10', '11']);

export const HardwareLinterModal: React.FC<HardwareLinterModalProps> = ({
  isOpen,
  onClose,
  blocks,
  setBlocks,
  variables = [],
}) => {
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'diagnostics' | 'pinmap'>('diagnostics');
  const [appliedFixIds, setAppliedFixIds] = useState<Set<string>>(new Set());
  const [copiedAudit, setCopiedAudit] = useState<boolean>(false);

  const report: HardwareLintReport = useMemo(() => {
    return runHardwareLinter(blocks, variables);
  }, [blocks, variables]);

  if (!isOpen) return null;

  const handleApplyFix = (item: HardwareLintItem) => {
    if (!item.quickFix) return;
    setBlocks((prev) => item.quickFix!.apply(prev));
    setAppliedFixIds((prev) => new Set(prev).add(item.id));
    incrementBuild(`Hardver Linter Javítás: ${item.quickFix.label}`);
  };

  const handleBatchFixAll = () => {
    const fixableItems = report.items.filter((i) => i.quickFix);
    if (fixableItems.length === 0) return;

    let updatedBlocks = [...blocks];
    fixableItems.forEach((item) => {
      if (item.quickFix) {
        updatedBlocks = item.quickFix.apply(updatedBlocks);
      }
    });

    setBlocks(updatedBlocks);
    setAppliedFixIds(new Set(fixableItems.map((i) => i.id)));
    incrementBuild(`Hardver Linter: Összes hiba automatikus javítása (${fixableItems.length} javítás)`);
  };

  const handleCopyAudit = () => {
    const auditText = `=== ARDUINO UNO / ATMEGA328P HARDVER STATIKUS ELLENŐRZÉSI JELENTÉS ===
Időbélyeg: ${report.timestamp}
Egészségi Index: ${report.healthScore}%
Összes Blokk: ${report.totalBlocks} db
Kritikus Hardverhibák: ${report.criticalCount} db
Figyelmeztetések: ${report.warningCount} db
Optimalizációk: ${report.optimizationCount} db

--- RÉSZLETES DIAGNOSZTIKA ---
${
  report.items.length === 0
    ? '✅ Nincs észlelt hiba vagy hardveres ütközés! A program 100%-ban hardverbiztos.'
    : report.items
        .map(
          (item, idx) =>
            `[${idx + 1}] [${item.severity.toUpperCase()}] ${item.title}\n` +
            `    Szakasz: ${item.scope || 'Globális'} | Láb: ${item.pin || 'N/A'}\n` +
            `    Leírás: ${item.description}\n` +
            (item.hardwareNote ? `    AVR Megjegyzés: ${item.hardwareNote}\n` : '')
        )
        .join('\n')
}
`;
    navigator.clipboard.writeText(auditText);
    setCopiedAudit(true);
    setTimeout(() => setCopiedAudit(false), 2000);
  };

  const filteredItems = report.items.filter((item) => {
    if (selectedSeverity !== 'all' && item.severity !== selectedSeverity) return false;
    if (selectedCategory !== 'all' && item.category !== selectedCategory) return false;
    return true;
  });

  const fixableCount = report.items.filter((i) => i.quickFix).length;

  return (
    <div
      id="modal-hardware-linter"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs font-sans"
    >
      <div className="bg-[#12141A] border border-[#2A2D35] rounded-xs shadow-[8px_8px_0px_#000] w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* MODAL HEADER */}
        <div className="px-4 py-3 bg-[#161920] border-b border-[#2A2D35] flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2.5">
            <div
              className={`p-2 rounded-xs border shadow-[2px_2px_0px_#000] ${
                report.criticalCount > 0
                  ? 'bg-rose-950/60 border-rose-500/80 text-rose-400'
                  : report.warningCount > 0
                  ? 'bg-amber-950/60 border-amber-500/80 text-amber-400'
                  : 'bg-emerald-950/60 border-[#4ade80]/80 text-[#4ade80]'
              }`}
            >
              {report.criticalCount > 0 ? (
                <ShieldAlert className="w-5 h-5 animate-pulse" />
              ) : report.warningCount > 0 ? (
                <AlertTriangle className="w-5 h-5" />
              ) : (
                <ShieldCheck className="w-5 h-5" />
              )}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-sm sm:text-base uppercase tracking-tight text-white font-mono flex items-center gap-1.5">
                  <span>Hardver-Ütközés & Statikus Kódelemző</span>
                </h2>
                <span className="text-[10px] font-mono font-bold bg-[#1A1D24] text-[#4ade80] px-2 py-0.5 rounded-xs border border-[#3A3F4B]">
                  ATmega328P
                </span>
              </div>
              <p className="text-[11px] text-[#8A8D98]">
                Lábkiosztások, hiányzó inicializációk, ISR megszakításbiztonság és ütközésvizsgálat
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyAudit}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-mono bg-[#1A1D24] hover:bg-[#2A2D35] text-[#E0E0E6] border border-[#3A3F4B] rounded-xs shadow-[2px_2px_0px_#000] transition-colors cursor-pointer"
              title="Audit napló másolása vágólapra"
            >
              {copiedAudit ? (
                <Check className="w-3.5 h-3.5 text-[#4ade80]" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-[#8A8D98]" />
              )}
              <span className="hidden sm:inline">Audit Másolása</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 px-2.5 text-xs font-mono font-bold bg-[#1A1D24] hover:bg-rose-950/40 text-[#8A8D98] hover:text-rose-300 border border-[#3A3F4B] hover:border-rose-500/50 rounded-xs transition-colors cursor-pointer"
            >
              ✕ Bezárás
            </button>
          </div>
        </div>

        {/* HEALTH METER & STATS BANNER */}
        <div className="px-4 py-3 bg-[#0F1115] border-b border-[#2A2D35] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-4 flex-wrap">
            {/* Health Score Gauge */}
            <div className="flex items-center gap-2.5 bg-[#161920] px-3 py-1.5 rounded-xs border border-[#2A2D35] shadow-[2px_2px_0px_#000]">
              <div className="text-[10px] text-[#8A8D98] font-mono uppercase">Egészségi Index:</div>
              <div
                className={`text-base font-black font-mono px-2 py-0.5 rounded-xs ${
                  report.healthScore >= 90
                    ? 'bg-emerald-950/80 text-[#4ade80] border border-emerald-500/40'
                    : report.healthScore >= 70
                    ? 'bg-amber-950/80 text-amber-300 border border-amber-500/40'
                    : 'bg-rose-950/80 text-rose-300 border border-rose-500/40'
                }`}
              >
                {report.healthScore}%
              </div>
            </div>

            {/* Counts */}
            <div className="flex items-center gap-2 text-xs font-mono">
              <span className="flex items-center gap-1 px-2 py-1 bg-rose-950/40 text-rose-300 border border-rose-500/30 rounded-xs">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
                <strong>{report.criticalCount}</strong> Kritikus Hiba
              </span>

              <span className="flex items-center gap-1 px-2 py-1 bg-amber-950/40 text-amber-300 border border-amber-500/30 rounded-xs">
                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                <strong>{report.warningCount}</strong> Figyelmeztetés
              </span>

              <span className="flex items-center gap-1 px-2 py-1 bg-cyan-950/40 text-cyan-300 border border-cyan-500/30 rounded-xs">
                <span className="w-2 h-2 rounded-full bg-cyan-500"></span>
                <strong>{report.optimizationCount}</strong> Optimalizáció
              </span>
            </div>
          </div>

          {/* Batch Fix Button */}
          {fixableCount > 0 && (
            <button
              onClick={handleBatchFixAll}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#4ade80] hover:bg-[#3ec973] text-black font-mono font-bold text-xs rounded-xs shadow-[2px_2px_0px_#000] cursor-pointer transition-all active:translate-y-0.5"
            >
              <Zap className="w-3.5 h-3.5 fill-black" />
              <span>Összes Hiba Automatikus Javítása ({fixableCount})</span>
            </button>
          )}
        </div>

        {/* NAVIGATION TABS & FILTERS */}
        <div className="px-4 py-2 bg-[#161920] border-b border-[#2A2D35] flex flex-wrap items-center justify-between gap-2">
          {/* Main Tabs */}
          <div className="flex items-center gap-1 font-mono text-xs">
            <button
              onClick={() => setActiveTab('diagnostics')}
              className={`px-3 py-1 rounded-xs border transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'diagnostics'
                  ? 'bg-[#4ade80] text-black font-bold border-[#4ade80]'
                  : 'bg-[#1A1D24] text-[#8A8D98] border-[#3A3F4B] hover:text-white'
              }`}
            >
              <Wrench className="w-3.5 h-3.5" />
              <span>Diagnosztikai Elemzés ({report.items.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('pinmap')}
              className={`px-3 py-1 rounded-xs border transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'pinmap'
                  ? 'bg-[#4ade80] text-black font-bold border-[#4ade80]'
                  : 'bg-[#1A1D24] text-[#8A8D98] border-[#3A3F4B] hover:text-white'
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>Lábkiosztási Térkép & Ütközésvizsgáló</span>
            </button>
          </div>

          {/* Filter dropdowns when in diagnostics tab */}
          {activeTab === 'diagnostics' && (
            <div className="flex items-center gap-2 flex-wrap text-xs font-mono">
              <div className="flex items-center gap-1 text-[#8A8D98]">
                <Filter className="w-3 h-3" />
                <span>Szűrés:</span>
              </div>

              <select
                value={selectedSeverity}
                onChange={(e) => setSelectedSeverity(e.target.value)}
                className="bg-[#0F1115] border border-[#3A3F4B] text-[#E0E0E6] px-2 py-1 rounded-xs focus:outline-none focus:border-[#4ade80]"
              >
                <option value="all">Minden súlyosság</option>
                <option value="critical">🔴 Csak Kritikus ({report.criticalCount})</option>
                <option value="warning">🟡 Figyelmeztetések ({report.warningCount})</option>
                <option value="optimization">🔵 Optimalizáció ({report.optimizationCount})</option>
              </select>

              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-[#0F1115] border border-[#3A3F4B] text-[#E0E0E6] px-2 py-1 rounded-xs focus:outline-none focus:border-[#4ade80]"
              >
                <option value="all">Minden kategória</option>
                <option value="pin_conflict">Láb & Busz Ütközések</option>
                <option value="missing_init">Hiányzó Inicializálás</option>
                <option value="floating_pin">Lebegő Bemenet / Felhúzás</option>
                <option value="isr_safety">Megszakítás (ISR) Biztonság</option>
                <option value="memory_safety">Memória & Regiszterek</option>
                <option value="flow_control">Ugrások & Címkék</option>
              </select>
            </div>
          )}
        </div>

        {/* MODAL CONTENT AREA */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar bg-[#0F1115]">
          {activeTab === 'diagnostics' ? (
            /* TAB 1: DIAGNOSTIC ISSUES LIST */
            filteredItems.length === 0 ? (
              <div className="p-8 text-center bg-[#161920] border border-[#2A2D35] rounded-xs space-y-3">
                <div className="w-12 h-12 rounded-full bg-emerald-950/80 border border-[#4ade80] flex items-center justify-center mx-auto text-[#4ade80] shadow-[0_0_15px_rgba(74,222,128,0.2)]">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-white font-mono">
                  {blocks.length === 0
                    ? 'A munkaterület üres. Nincs elemzendő blokk.'
                    : 'Kiváló! Nincs észlelt hardverhiba vagy ütközés.'}
                </h3>
                <p className="text-xs text-[#8A8D98] max-w-md mx-auto">
                  {blocks.length === 0
                    ? 'Húzz be blokkokat a bal oldali palettáról vagy tölts be egy mintaprojektet az elemzéshez.'
                    : 'A konfigurált lábkiosztások, regiszterek, perifériák és megszakítások tökéletesen megfelelnek az ATmega328P mikrokontroller hardveres előírásainak.'}
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {filteredItems.map((item) => {
                  const isFixed = appliedFixIds.has(item.id);
                  return (
                    <div
                      key={item.id}
                      className={`p-3 rounded-xs border transition-all shadow-[2px_2px_0px_#000] space-y-2 ${
                        isFixed
                          ? 'bg-emerald-950/30 border-[#4ade80]/40 opacity-75'
                          : item.severity === 'critical'
                          ? 'bg-[#181014] border-rose-500/60 hover:border-rose-400'
                          : item.severity === 'warning'
                          ? 'bg-[#18140F] border-amber-500/60 hover:border-amber-400'
                          : 'bg-[#0E151A] border-cyan-500/50 hover:border-cyan-400'
                      }`}
                    >
                      {/* Card Header */}
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-xs border ${
                              item.severity === 'critical'
                                ? 'bg-rose-950 text-rose-300 border-rose-500/60'
                                : item.severity === 'warning'
                                ? 'bg-amber-950 text-amber-300 border-amber-500/60'
                                : 'bg-cyan-950 text-cyan-300 border-cyan-500/60'
                            }`}
                          >
                            {item.severity === 'critical'
                              ? '🔴 Kritikus Hiba'
                              : item.severity === 'warning'
                              ? '🟡 Figyelmeztetés'
                              : '🔵 Optimalizáció'}
                          </span>

                          {item.scope && (
                            <span className="text-[10px] font-mono bg-[#1A1D24] text-[#E0E0E6] px-1.5 py-0.5 rounded-xs border border-[#3A3F4B]">
                              Szakasz: <strong>{item.scope.toUpperCase()}</strong>
                            </span>
                          )}

                          {item.pin && (
                            <span className="text-[10px] font-mono bg-[#1A1D24] text-[#4ade80] font-bold px-1.5 py-0.5 rounded-xs border border-[#4ade80]/40">
                              Láb: Pin {item.pin}
                            </span>
                          )}

                          <h4 className="text-xs sm:text-sm font-bold text-white font-mono">
                            {item.title}
                          </h4>
                        </div>

                        {/* Quick Fix Button */}
                        {item.quickFix && (
                          <button
                            onClick={() => handleApplyFix(item)}
                            disabled={isFixed}
                            className={`flex items-center gap-1 px-2.5 py-1 text-xs font-mono font-bold rounded-xs shadow-[1px_1px_0px_#000] transition-all cursor-pointer ${
                              isFixed
                                ? 'bg-[#4ade80]/20 text-[#4ade80] border border-[#4ade80]/40 cursor-default'
                                : 'bg-[#1A1D24] hover:bg-[#4ade80] text-[#4ade80] hover:text-black border border-[#4ade80]/60'
                            }`}
                          >
                            {isFixed ? (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5 text-[#4ade80]" />
                                <span>Alkalmazva!</span>
                              </>
                            ) : (
                              <>
                                <Wrench className="w-3.5 h-3.5" />
                                <span>1-Kattintásos Javítás</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>

                      {/* Description */}
                      <p className="text-xs text-[#C5C8D4] leading-relaxed">{item.description}</p>

                      {/* Hardware note */}
                      {item.hardwareNote && (
                        <div className="p-2 rounded-xs bg-[#0A0C0F] border border-[#2A2D35] text-[11px] text-[#8A8D98] flex items-start gap-1.5">
                          <Cpu className="w-3.5 h-3.5 text-[#4ade80] shrink-0 mt-0.5" />
                          <div>
                            <strong className="text-white font-mono">Hardveres Magyarázat: </strong>
                            <span>{item.hardwareNote}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )
          ) : (
            /* TAB 2: PIN MAP & CONFLICT VISUALIZER */
            <div className="space-y-4">
              <div className="p-3 bg-[#161920] border border-[#2A2D35] rounded-xs text-xs text-[#8A8D98] flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-[#4ade80]" />
                  <span>
                    Az Arduino Uno mikrokontroller lábainak aktuális foglaltsága és protokoll-kiosztása:
                  </span>
                </div>
                <div className="flex items-center gap-3 text-[10px] font-mono">
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#4ade80]"></span> Szabad / Helyes
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-cyan-400"></span> Protokoll (I2C/SPI/UART)
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping"></span> Ütközés
                  </span>
                </div>
              </div>

              {/* Pin Grid: Digital Pins */}
              <div className="space-y-1.5">
                <div className="text-[11px] font-mono font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-3 h-3 text-[#4ade80]" />
                  <span>Digitális I/O Lábak (D0 - D13):</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2">
                  {['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13'].map((p) => {
                    const detail = report.pinMap[p];
                    const isPwm = PWM_PINS.has(p);
                    const isConflict = detail?.hasConflict;
                    const hasModes = detail?.modes && detail.modes.length > 0;
                    const hasProtocols = detail?.protocols && detail.protocols.length > 0;

                    return (
                      <div
                        key={p}
                        className={`p-2.5 rounded-xs border text-xs font-mono transition-all shadow-[1px_1px_0px_#000] flex flex-col justify-between gap-1.5 ${
                          isConflict
                            ? 'bg-rose-950/80 border-rose-500 text-white shadow-[0_0_10px_rgba(244,63,94,0.3)] animate-pulse'
                            : hasProtocols
                            ? 'bg-cyan-950/40 border-cyan-500/60 text-cyan-200'
                            : hasModes
                            ? 'bg-[#1A1D24] border-[#4ade80]/60 text-white'
                            : 'bg-[#12141A] border-[#2A2D35] text-[#8A8D98]'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-sm text-white">D{p}</span>
                          {isPwm && (
                            <span className="text-[9px] px-1 py-0.2 rounded-xs bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              PWM~
                            </span>
                          )}
                        </div>

                        <div className="space-y-0.5 text-[10px]">
                          {hasModes && (
                            <div className="text-[#4ade80] font-bold">
                              {detail.modes.map((m) => m.mode).join(', ')}
                            </div>
                          )}
                          {hasProtocols && (
                            <div className="text-cyan-300 truncate">
                              {detail.protocols.join(', ')}
                            </div>
                          )}
                          {!hasModes && !hasProtocols && (
                            <div className="text-[#8A8D98]">Inaktív</div>
                          )}
                        </div>

                        {isConflict && (
                          <div className="text-[9px] text-rose-300 font-bold bg-rose-950 p-1 rounded-xs border border-rose-500/60 truncate">
                            {detail.conflictReason || 'Ütközés!'}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Pin Grid: Analog Pins */}
              <div className="space-y-1.5 pt-2">
                <div className="text-[11px] font-mono font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-3 h-3 text-cyan-400" />
                  <span>Analóg Bemenetek & TWI Busz (A0 - A5):</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                  {['A0', 'A1', 'A2', 'A3', 'A4', 'A5'].map((p) => {
                    const detail = report.pinMap[p];
                    const isConflict = detail?.hasConflict;
                    const hasModes = detail?.modes && detail.modes.length > 0;
                    const hasProtocols = detail?.protocols && detail.protocols.length > 0;

                    return (
                      <div
                        key={p}
                        className={`p-2.5 rounded-xs border text-xs font-mono transition-all shadow-[1px_1px_0px_#000] flex flex-col justify-between gap-1.5 ${
                          isConflict
                            ? 'bg-rose-950/80 border-rose-500 text-white shadow-[0_0_10px_rgba(244,63,94,0.3)] animate-pulse'
                            : hasProtocols
                            ? 'bg-cyan-950/40 border-cyan-500/60 text-cyan-200'
                            : hasModes || detail?.isAdcUsed
                            ? 'bg-[#1A1D24] border-[#4ade80]/60 text-white'
                            : 'bg-[#12141A] border-[#2A2D35] text-[#8A8D98]'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-sm text-white">{p}</span>
                          {(p === 'A4' || p === 'A5') && (
                            <span className="text-[9px] px-1 py-0.2 rounded-xs bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                              {p === 'A4' ? 'SDA' : 'SCL'}
                            </span>
                          )}
                        </div>

                        <div className="space-y-0.5 text-[10px]">
                          {detail?.isAdcUsed && (
                            <div className="text-[#4ade80] font-bold">10-bit ADC</div>
                          )}
                          {hasModes && (
                            <div className="text-[#4ade80] font-bold">
                              {detail.modes.map((m) => m.mode).join(', ')}
                            </div>
                          )}
                          {hasProtocols && (
                            <div className="text-cyan-300 truncate">
                              {detail.protocols.join(', ')}
                            </div>
                          )}
                          {!hasModes && !hasProtocols && !detail?.isAdcUsed && (
                            <div className="text-[#8A8D98]">Inaktív</div>
                          )}
                        </div>

                        {isConflict && (
                          <div className="text-[9px] text-rose-300 font-bold bg-rose-950 p-1 rounded-xs border border-rose-500/60 truncate">
                            {detail.conflictReason || 'Ütközés!'}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* MODAL FOOTER */}
        <div className="px-4 py-2.5 bg-[#161920] border-t border-[#2A2D35] flex items-center justify-between gap-3 text-xs font-mono">
          <div className="text-[#8A8D98] text-[11px] hidden sm:block">
            Minden ellenőrzés valós idejű, determinisztikus AVR gépi kód szabályrendszer alapján fut.
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-[#1A1D24] hover:bg-[#2A2D35] text-white border border-[#3A3F4B] rounded-xs font-bold shadow-[2px_2px_0px_#000] cursor-pointer ml-auto"
          >
            Bezárás
          </button>
        </div>
      </div>
    </div>
  );
};
