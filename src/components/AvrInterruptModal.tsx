/**
 * (c) 2026 AI Studio AVR Visual Studio
 * Dedicated AVR Interrupt Architecture & Visual Vector Designer Modal
 * Complete interactive ATmega328P Interrupt Matrix, Trigger Modes, Timer CTC Calculator,
 * PCINT Masks, ISR Action Builder, Live Simulation Injector & Code Exporter.
 */

import React, { useState, useMemo } from 'react';
import {
  ShieldAlert,
  Zap,
  Activity,
  Clock,
  Radio,
  Sliders,
  Play,
  Copy,
  Check,
  Plus,
  Trash2,
  Cpu,
  RefreshCw,
  Eye,
  Settings2,
  Terminal,
  Layers,
  ArrowRight,
  Sparkles,
  Info,
  X,
} from 'lucide-react';
import {
  AvrInterruptState,
  AvrInterruptConfig,
  AvrInterruptVectorId,
  AvrExtIntTriggerMode,
  ArduinoPin,
  ProgramBlock,
  VariableDefinition,
} from '../types';
import {
  ATMEGA328P_INTERRUPT_VECTORS,
  DEFAULT_INTERRUPT_CONFIGS,
  calculateTimerCtcParams,
  generateInterruptCConfigCode,
} from '../utils/avrInterruptData';

interface AvrInterruptModalProps {
  isOpen: boolean;
  onClose: () => void;
  interruptState?: AvrInterruptState;
  onUpdateInterruptState?: (updater: (prev: AvrInterruptState) => AvrInterruptState) => void;
  onTriggerManualInterrupt?: (vectorId: AvrInterruptVectorId) => void;
  onInsertInterruptBlock?: (config: AvrInterruptConfig) => void;
  variables?: VariableDefinition[];
}

export const AvrInterruptModal: React.FC<AvrInterruptModalProps> = ({
  isOpen,
  onClose,
  interruptState,
  onUpdateInterruptState,
  onTriggerManualInterrupt,
  onInsertInterruptBlock,
  variables = [],
}) => {
  const [activeCategory, setActiveCategory] = useState<'all' | 'external' | 'timer' | 'comm' | 'analog' | 'system'>('all');
  const [selectedVectorId, setSelectedVectorId] = useState<AvrInterruptVectorId>('INT0');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSubTab, setActiveSubTab] = useState<'config' | 'code' | 'logs' | 'table'>('config');
  const [copiedCode, setCopiedCode] = useState(false);
  const [lastFiredMessage, setLastFiredMessage] = useState<string | null>(null);

  // Fallback state if interruptState not yet initialized
  const vectorConfigs = interruptState?.vectorConfigs || DEFAULT_INTERRUPT_CONFIGS;
  const isGlobalEnabled = interruptState?.globalInterruptsEnabled !== false;

  const currentVectorInfo = useMemo(() => {
    return ATMEGA328P_INTERRUPT_VECTORS.find((v) => v.id === selectedVectorId) || ATMEGA328P_INTERRUPT_VECTORS[1];
  }, [selectedVectorId]);

  const currentConfig: AvrInterruptConfig = useMemo(() => {
    if (vectorConfigs[selectedVectorId]) {
      return vectorConfigs[selectedVectorId];
    }
    return {
      id: selectedVectorId,
      enabled: false,
      triggerMode: 'FALLING_EDGE',
      pin: currentVectorInfo.associatedPins?.[0] || '2',
      customIsrAction: 'toggle_led',
      customTargetPin: '13',
      description: currentVectorInfo.description,
    };
  }, [vectorConfigs, selectedVectorId, currentVectorInfo]);

  // Filter vectors
  const filteredVectors = useMemo(() => {
    return ATMEGA328P_INTERRUPT_VECTORS.filter((v) => {
      const matchCat = activeCategory === 'all' || v.category === activeCategory;
      const matchSearch =
        !searchQuery ||
        v.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.vectorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.source.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [activeCategory, searchQuery]);

  // Timer CTC calculation if vector is Timer1 / Timer2
  const timerCtcData = useMemo(() => {
    if (selectedVectorId === 'TIMER1_COMPA' || selectedVectorId === 'TIMER1_COMPB') {
      const freq = currentConfig.frequencyHz || 1000;
      const prescaler = Number(currentConfig.prescaler) || 64;
      return calculateTimerCtcParams(16000000, freq, prescaler, true);
    }
    if (selectedVectorId === 'TIMER2_COMPA' || selectedVectorId === 'TIMER0_COMPA') {
      const freq = currentConfig.frequencyHz || 1000;
      const prescaler = Number(currentConfig.prescaler) || 64;
      return calculateTimerCtcParams(16000000, freq, prescaler, false);
    }
    return null;
  }, [selectedVectorId, currentConfig.frequencyHz, currentConfig.prescaler]);

  // Generated code for current or all configured
  const generatedCode = useMemo(() => {
    const { setupCode, isrCode } = generateInterruptCConfigCode(currentConfig);
    return { setupCode, isrCode };
  }, [currentConfig]);

  if (!isOpen) return null;

  const handleUpdateConfig = (partial: Partial<AvrInterruptConfig>) => {
    if (!onUpdateInterruptState) return;
    onUpdateInterruptState((prev) => {
      const prevConfigs = prev.vectorConfigs || { ...DEFAULT_INTERRUPT_CONFIGS };
      const updated = {
        ...currentConfig,
        ...partial,
      };
      return {
        ...prev,
        vectorConfigs: {
          ...prevConfigs,
          [selectedVectorId]: updated,
        },
      };
    });
  };

  const handleToggleGlobalInterrupts = () => {
    if (!onUpdateInterruptState) return;
    onUpdateInterruptState((prev) => ({
      ...prev,
      globalInterruptsEnabled: !prev.globalInterruptsEnabled,
    }));
  };

  const handleFireInterrupt = (vecId: AvrInterruptVectorId) => {
    if (onTriggerManualInterrupt) {
      onTriggerManualInterrupt(vecId);
    } else if (onUpdateInterruptState) {
      onUpdateInterruptState((prev) => {
        const now = Date.now();
        const vInfo = ATMEGA328P_INTERRUPT_VECTORS.find((v) => v.id === vecId);
        const count = (prev.firingCount?.[vecId] || 0) + 1;
        const newLog = [
          {
            id: `evt_${now}_${Math.random().toString(36).substr(2, 5)}`,
            vector: vecId,
            vectorName: vInfo?.vectorName || vecId,
            source: vInfo?.source || 'Manual Simulator Trigger',
            timestampNs: (prev.eventLog?.length || 0) * 1000 + 500,
            cyclesTaken: 4,
            details: `Hardveres ISR rutin belépés [Vector #${vInfo?.vectorNum || '?'}]`,
          },
          ...(prev.eventLog || []).slice(0, 49),
        ];
        return {
          ...prev,
          totalFiredCount: (prev.totalFiredCount || 0) + 1,
          firingCount: {
            ...(prev.firingCount || {}),
            [vecId]: count,
          },
          lastFiredTimestampNs: now,
          eventLog: newLog,
        };
      });
    }
    setLastFiredMessage(`⚡ ${currentVectorInfo.vectorName} megszakítás sikeresen kiváltva!`);
    setTimeout(() => setLastFiredMessage(null), 3000);
  };

  const handleCopyCode = () => {
    const fullCode = [
      `// --- ATmega328P Megszakítás Konfiguráció & ISR ---`,
      `void setup() {`,
      `  ${generatedCode.setupCode.join('\n  ')}`,
      `}`,
      ``,
      generatedCode.isrCode.join('\n'),
    ].join('\n');

    navigator.clipboard.writeText(fullCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div
      id="avr-interrupt-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-2 sm:p-4 animate-in fade-in duration-150 font-sans"
    >
      <div
        id="avr-interrupt-modal-container"
        className="relative w-full max-w-6xl h-[92vh] max-h-[850px] bg-[#12141A] border border-[#2A2D35] rounded-xs shadow-[8px_8px_0px_#000] flex flex-col overflow-hidden text-[#E0E0E6]"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-[#161922] border-b border-[#2A2D35] shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xs bg-purple-950/80 text-purple-400 border border-purple-500/50 shadow-[0_0_12px_rgba(168,85,247,0.3)]">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-mono font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <span>⚡ AVR Megszakítás Architektúra & Vizuális Tervező</span>
                </h2>
                <span className="text-[10px] font-mono bg-purple-950 text-purple-300 px-1.5 py-0.5 rounded-xs border border-purple-500/40">
                  ATmega328P • 26 Vektor
                </span>
              </div>
              <p className="text-xs text-[#8A8D98] hidden sm:block">
                Hardveres megszakítási tábla, prioritások, élérzékelés (INT0/INT1), Timer CTC Tick és valós idejű ISR szimuláció
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Global Interrupt Switch (SREG.I) */}
            <button
              id="btn-global-interrupt-toggle"
              onClick={handleToggleGlobalInterrupts}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs font-mono font-bold rounded-xs border transition-all cursor-pointer shadow-[2px_2px_0px_#000] ${
                isGlobalEnabled
                  ? 'bg-emerald-950/80 hover:bg-emerald-900 text-[#4ade80] border-emerald-500/80'
                  : 'bg-rose-950/80 hover:bg-rose-900 text-rose-300 border-rose-500/80 animate-pulse'
              }`}
              title="Globális megszakítás engedélyező bit (SREG.I: SEI / CLI)"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>SREG.I (Globális): {isGlobalEnabled ? 'ENGEDÉLYEZVE (SEI)' : 'TILTVA (CLI)'}</span>
            </button>

            {/* Close Button */}
            <button
              id="btn-close-interrupt-modal"
              onClick={onClose}
              className="p-1.5 rounded-xs bg-[#1A1D24] hover:bg-[#2A2D35] text-[#8A8D98] hover:text-white border border-[#2A2D35] transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Sub-navigation Bar */}
        <div className="flex items-center justify-between px-4 py-2 bg-[#14161F] border-b border-[#2A2D35] shrink-0 text-xs overflow-x-auto gap-2">
          {/* Categories */}
          <div className="flex items-center gap-1">
            <span className="text-[11px] font-mono text-[#8A8D98] uppercase tracking-wider mr-1 shrink-0">Kategória:</span>
            {[
              { id: 'all', label: 'Összes (26)' },
              { id: 'external', label: 'Külső Lábak (INT/PCINT)' },
              { id: 'timer', label: 'Időzítők (Timer0..2)' },
              { id: 'comm', label: 'Kommunikáció (USART/SPI/TWI)' },
              { id: 'analog', label: 'Analóg (ADC/Comp)' },
              { id: 'system', label: 'Rendszer (Reset/WDT/EE)' },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id as any)}
                className={`px-2.5 py-1 rounded-xs font-mono text-[11px] font-medium transition-colors cursor-pointer border ${
                  activeCategory === cat.id
                    ? 'bg-purple-950 text-purple-300 border-purple-500/60 font-bold shadow-[2px_2px_0px_#000]'
                    : 'bg-[#1A1D24] text-[#8A8D98] hover:text-white border-[#2A2D35]'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Subtabs on right */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => setActiveSubTab('config')}
              className={`px-3 py-1 rounded-xs font-mono text-xs flex items-center gap-1.5 cursor-pointer border ${
                activeSubTab === 'config'
                  ? 'bg-sky-950 text-sky-300 border-sky-500/60 font-bold'
                  : 'bg-[#1A1D24] text-[#8A8D98] hover:text-white border-[#2A2D35]'
              }`}
            >
              <Settings2 className="w-3.5 h-3.5" />
              <span>Vektor Tervező</span>
            </button>
            <button
              onClick={() => setActiveSubTab('table')}
              className={`px-3 py-1 rounded-xs font-mono text-xs flex items-center gap-1.5 cursor-pointer border ${
                activeSubTab === 'table'
                  ? 'bg-purple-950 text-purple-300 border-purple-500/60 font-bold'
                  : 'bg-[#1A1D24] text-[#8A8D98] hover:text-white border-[#2A2D35]'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Vektortábla Mátrix</span>
            </button>
            <button
              onClick={() => setActiveSubTab('code')}
              className={`px-3 py-1 rounded-xs font-mono text-xs flex items-center gap-1.5 cursor-pointer border ${
                activeSubTab === 'code'
                  ? 'bg-emerald-950 text-[#4ade80] border-emerald-500/60 font-bold'
                  : 'bg-[#1A1D24] text-[#8A8D98] hover:text-white border-[#2A2D35]'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>C++ / ASM Kód</span>
            </button>
            <button
              onClick={() => setActiveSubTab('logs')}
              className={`px-3 py-1 rounded-xs font-mono text-xs flex items-center gap-1.5 cursor-pointer border relative ${
                activeSubTab === 'logs'
                  ? 'bg-amber-950 text-amber-300 border-amber-500/60 font-bold'
                  : 'bg-[#1A1D24] text-[#8A8D98] hover:text-white border-[#2A2D35]'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Esemény Napló</span>
              {(interruptState?.eventLog?.length || 0) > 0 && (
                <span className="text-[9px] bg-amber-500 text-black px-1 rounded-full font-bold">
                  {interruptState?.eventLog?.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Main Content Body */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Left Column: Vector Selector List */}
          <div className="w-full md:w-80 lg:w-96 bg-[#14161F] border-r border-[#2A2D35] flex flex-col shrink-0 overflow-hidden">
            {/* Search Input */}
            <div className="p-2.5 border-b border-[#2A2D35] bg-[#12141A]">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Keresés vektorok között (pl. INT0, Timer1, RX)..."
                className="w-full px-2.5 py-1.5 text-xs font-mono bg-[#1A1D24] border border-[#2A2D35] rounded-xs text-white placeholder-[#8A8D98] focus:border-purple-500 focus:outline-hidden"
              />
            </div>

            {/* Vector List Items */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {filteredVectors.map((v) => {
                const isSelected = v.id === selectedVectorId;
                const isEnabled = vectorConfigs[v.id]?.enabled;
                const firedCount = interruptState?.firingCount?.[v.id] || 0;

                return (
                  <button
                    key={v.id}
                    onClick={() => setSelectedVectorId(v.id)}
                    className={`w-full text-left p-2 rounded-xs border transition-all cursor-pointer flex items-start justify-between gap-2 ${
                      isSelected
                        ? 'bg-purple-950/70 border-purple-500 text-white shadow-[2px_2px_0px_#000]'
                        : 'bg-[#1A1D24] hover:bg-[#222630] border-[#2A2D35] text-[#C5C8D4]'
                    }`}
                  >
                    <div className="flex items-start gap-2 overflow-hidden">
                      <span
                        className={`text-[10px] font-mono px-1.5 py-0.5 rounded-xs shrink-0 font-bold ${
                          v.category === 'external'
                            ? 'bg-sky-950 text-sky-400 border border-sky-500/40'
                            : v.category === 'timer'
                            ? 'bg-purple-950 text-purple-400 border border-purple-500/40'
                            : v.category === 'comm'
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/40'
                            : v.category === 'analog'
                            ? 'bg-amber-950 text-amber-400 border border-amber-500/40'
                            : 'bg-zinc-800 text-zinc-300 border border-zinc-600'
                        }`}
                      >
                        #{v.vectorNum}
                      </span>
                      <div className="overflow-hidden">
                        <div className="text-xs font-mono font-bold flex items-center gap-1.5 truncate">
                          <span className={isSelected ? 'text-white' : 'text-[#E0E0E6]'}>{v.vectorName}</span>
                          {isEnabled && (
                            <span className="text-[9px] bg-emerald-950 text-[#4ade80] px-1 py-0.2 rounded-xs border border-emerald-500/40 shrink-0">
                              AKTÍV
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-[#8A8D98] truncate mt-0.5">{v.source}</p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-[9px] font-mono text-[#8A8D98] block">{v.programAddressHex}</span>
                      {firedCount > 0 && (
                        <span className="text-[9px] font-mono text-amber-400 bg-amber-950/80 px-1 py-0.2 rounded-xs border border-amber-500/30">
                          {firedCount}x futott
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* List Footer Stats */}
            <div className="p-2.5 bg-[#12141A] border-t border-[#2A2D35] flex items-center justify-between text-[11px] font-mono text-[#8A8D98]">
              <span>Összesen: {filteredVectors.length} / 26 vektor</span>
              <span className="text-[#4ade80]">
                {Object.values(vectorConfigs).filter((c: any) => c?.enabled).length} bekapcsolva
              </span>
            </div>
          </div>

          {/* Right Column: Detailed Vector Designer / Matrix / Code */}
          <div className="flex-1 bg-[#161922] flex flex-col overflow-y-auto p-4 space-y-4">
            {/* Quick Status Notification */}
            {lastFiredMessage && (
              <div className="p-2.5 rounded-xs bg-emerald-950/80 border border-emerald-500/80 text-[#4ade80] text-xs font-mono flex items-center justify-between animate-in fade-in">
                <span>{lastFiredMessage}</span>
                <span className="text-[10px] text-emerald-300">Szimuláció szinkronizálva</span>
              </div>
            )}

            {activeSubTab === 'config' && (
              <>
                {/* Vector Header Card */}
                <div className="p-3.5 rounded-xs bg-[#1A1D24] border border-[#2A2D35] shadow-[3px_3px_0px_#000]">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono bg-purple-950 text-purple-300 px-2 py-0.5 rounded-xs border border-purple-500/50 font-bold">
                          Vektor #{currentVectorInfo.vectorNum} • Cím: {currentVectorInfo.programAddressHex}
                        </span>
                        <h3 className="text-sm sm:text-base font-mono font-bold text-white">
                          {currentVectorInfo.vectorName}
                        </h3>
                      </div>
                      <p className="text-xs text-[#C5C8D4] mt-1 font-sans">{currentVectorInfo.description}</p>
                      <div className="text-[11px] text-[#8A8D98] font-mono mt-1">
                        Hardver forrás: <span className="text-sky-300">{currentVectorInfo.source}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {/* Enable / Disable Vector Switch */}
                      <button
                        onClick={() => handleUpdateConfig({ enabled: !currentConfig.enabled })}
                        className={`px-3 py-1.5 text-xs font-mono font-bold rounded-xs border transition-all cursor-pointer shadow-[2px_2px_0px_#000] ${
                          currentConfig.enabled
                            ? 'bg-emerald-950 hover:bg-emerald-900 text-[#4ade80] border-emerald-500'
                            : 'bg-[#12141A] hover:bg-[#222630] text-[#8A8D98] border-[#3A3F4B]'
                        }`}
                      >
                        {currentConfig.enabled ? '✓ Vektor Engedélyezve' : '✕ Vektor Inaktív'}
                      </button>

                      {/* Manual Simulation Pulse Button */}
                      <button
                        onClick={() => handleFireInterrupt(currentVectorInfo.id)}
                        disabled={!isGlobalEnabled}
                        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-bold rounded-xs border transition-all cursor-pointer shadow-[2px_2px_0px_#000] ${
                          !isGlobalEnabled
                            ? 'bg-zinc-800 text-zinc-500 border-zinc-700 opacity-50 cursor-not-allowed'
                            : 'bg-amber-950/80 hover:bg-amber-900 text-amber-300 border-amber-500/80'
                        }`}
                        title="Megszakítás manuális kiváltása a szimulátorban"
                      >
                        <Play className="w-3.5 h-3.5 fill-amber-300" />
                        <span>Kiváltás (Pulse)</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Specific Config Options depending on Vector Type */}
                {/* 1. External Interrupts (INT0 / INT1) */}
                {(selectedVectorId === 'INT0' || selectedVectorId === 'INT1') && (
                  <div className="p-3.5 rounded-xs bg-[#1A1D24] border border-[#2A2D35] space-y-3">
                    <div className="flex items-center justify-between border-b border-[#2A2D35] pb-2">
                      <div className="flex items-center gap-1.5">
                        <Zap className="w-4 h-4 text-sky-400" />
                        <span className="text-xs font-mono font-bold text-white uppercase">
                          Külső Láb Élérzékelés Konfiguráció (EICRA Regiszter)
                        </span>
                      </div>
                      <span className="text-[11px] font-mono text-sky-400">
                        {selectedVectorId === 'INT0' ? 'D2 Láb (PD2)' : 'D3 Láb (PD3)'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                      {[
                        {
                          mode: 'FALLING_EDGE',
                          label: 'Lefutó Él (FALLING)',
                          desc: 'HIGH -> LOW (Gombnyomás GND-re)',
                          waveform: '▔▔|_',
                          code: 'ISC01=1, ISC00=0',
                        },
                        {
                          mode: 'RISING_EDGE',
                          label: 'Felfutó Él (RISING)',
                          desc: 'LOW -> HIGH (Gomb felengedés vagy szenzor HIGH)',
                          waveform: '   |▔',
                          code: 'ISC01=1, ISC00=1',
                        },
                        {
                          mode: 'ANY_CHANGE',
                          label: 'Bármilyen Változás (CHANGE)',
                          desc: 'Élváltás mindkét irányban (Enkóder)',
                          waveform: '▔|_|▔',
                          code: 'ISC01=0, ISC00=1',
                        },
                        {
                          mode: 'LOW_LEVEL',
                          label: 'Alacsony Szint (LOW)',
                          desc: 'Folyamatosan amíg a láb LOW (Vészleállító)',
                          waveform: '_____',
                          code: 'ISC01=0, ISC00=0',
                        },
                      ].map((item) => {
                        const isChosen = (currentConfig.triggerMode || 'FALLING_EDGE') === item.mode;
                        return (
                          <button
                            key={item.mode}
                            onClick={() => handleUpdateConfig({ triggerMode: item.mode as AvrExtIntTriggerMode })}
                            className={`p-2.5 rounded-xs text-left border transition-all cursor-pointer ${
                              isChosen
                                ? 'bg-sky-950/80 border-sky-500 text-white shadow-[2px_2px_0px_#000]'
                                : 'bg-[#12141A] hover:bg-[#202430] border-[#2A2D35] text-[#8A8D98]'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-mono font-bold text-sky-300">{item.label}</span>
                              <span className="text-xs font-mono text-amber-400">{item.waveform}</span>
                            </div>
                            <p className="text-[10px] text-[#C5C8D4] mt-1">{item.desc}</p>
                            <span className="text-[9px] font-mono text-[#8A8D98] block mt-1">{item.code}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 2. Timer CTC Interrupts (Timer1 COMPA/B, Timer2, Timer0) */}
                {timerCtcData && (
                  <div className="p-3.5 rounded-xs bg-[#1A1D24] border border-[#2A2D35] space-y-3">
                    <div className="flex items-center justify-between border-b border-[#2A2D35] pb-2">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-purple-400" />
                        <span className="text-xs font-mono font-bold text-white uppercase">
                          Hardveres Időzítő CTC Frekvencia & Előosztó Kalkulátor
                        </span>
                      </div>
                      <span className="text-[11px] font-mono text-purple-400">16 MHz Rendszerórajel</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="text-[11px] font-mono text-[#8A8D98] block mb-1">Kívánt Frekvencia (Hz):</label>
                        <input
                          type="number"
                          value={currentConfig.frequencyHz || 1000}
                          onChange={(e) => handleUpdateConfig({ frequencyHz: Math.max(1, Number(e.target.value) || 1) })}
                          className="w-full px-2.5 py-1.5 text-xs font-mono bg-[#12141A] border border-[#2A2D35] rounded-xs text-white"
                        />
                        <div className="flex gap-1 mt-1.5">
                          {[10, 100, 1000, 5000].map((f) => (
                            <button
                              key={f}
                              onClick={() => handleUpdateConfig({ frequencyHz: f })}
                              className="text-[10px] font-mono bg-[#12141A] hover:bg-[#202430] text-[#8A8D98] hover:text-white px-1.5 py-0.5 rounded-xs border border-[#2A2D35]"
                            >
                              {f}Hz
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="text-[11px] font-mono text-[#8A8D98] block mb-1">Előosztó (Prescaler):</label>
                        <select
                          value={currentConfig.prescaler || '64'}
                          onChange={(e) => handleUpdateConfig({ prescaler: e.target.value })}
                          className="w-full px-2.5 py-1.5 text-xs font-mono bg-[#12141A] border border-[#2A2D35] rounded-xs text-white"
                        >
                          <option value="1">1 (16 MHz - Nincs osztás)</option>
                          <option value="8">8 (2 MHz)</option>
                          <option value="64">64 (250 kHz)</option>
                          <option value="256">256 (62.5 kHz)</option>
                          <option value="1024">1024 (15.625 kHz)</option>
                        </select>
                      </div>

                      <div className="p-2.5 rounded-xs bg-[#12141A] border border-[#2A2D35] text-xs font-mono space-y-1">
                        <div className="text-[#8A8D98]">Kiszámolt OCR Regiszter:</div>
                        <div className="text-sm font-bold text-[#4ade80]">
                          OCR1A = {timerCtcData.ocr} (0x{timerCtcData.ocr.toString(16).toUpperCase()})
                        </div>
                        <div className="text-[10px] text-[#8A8D98]">
                          Valós időzítés: {timerCtcData.periodMs} ms ({timerCtcData.actualFreqHz} Hz) • Hiba: {timerCtcData.errorPercent}%
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. PCINT (Pin Change) Mask Editor */}
                {selectedVectorId === 'PCINT2' && (
                  <div className="p-3.5 rounded-xs bg-[#1A1D24] border border-[#2A2D35] space-y-3">
                    <div className="flex items-center justify-between border-b border-[#2A2D35] pb-2">
                      <div className="flex items-center gap-1.5">
                        <Sliders className="w-4 h-4 text-emerald-400" />
                        <span className="text-xs font-mono font-bold text-white uppercase">
                          PORT D Lábváltozás Maszk (PCMSK2 Regiszter: D0 - D7)
                        </span>
                      </div>
                      <span className="text-[11px] font-mono text-emerald-400">8 Láb Figyelése</span>
                    </div>

                    <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5">
                      {['D0 (RX)', 'D1 (TX)', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7'].map((pinLabel, idx) => {
                        const isMasked = ((currentConfig.pcintMask || 0b00000100) & (1 << idx)) !== 0;
                        return (
                          <button
                            key={idx}
                            onClick={() => {
                              const curr = currentConfig.pcintMask || 0;
                              const updatedMask = isMasked ? curr & ~(1 << idx) : curr | (1 << idx);
                              handleUpdateConfig({ pcintMask: updatedMask });
                            }}
                            className={`p-2 text-center rounded-xs border font-mono text-xs cursor-pointer transition-all ${
                              isMasked
                                ? 'bg-emerald-950/80 border-emerald-500 text-[#4ade80] font-bold shadow-[2px_2px_0px_#000]'
                                : 'bg-[#12141A] border-[#2A2D35] text-[#8A8D98] hover:text-white'
                            }`}
                          >
                            <div className="text-[10px]">PCINT{16 + idx}</div>
                            <div className="text-xs font-bold mt-0.5">{pinLabel}</div>
                            <div className="text-[9px] mt-1">{isMasked ? 'BE' : 'KI'}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 4. ISR Action Builder & Target Configuration */}
                <div className="p-3.5 rounded-xs bg-[#1A1D24] border border-[#2A2D35] space-y-3">
                  <div className="flex items-center justify-between border-b border-[#2A2D35] pb-2">
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      <span className="text-xs font-mono font-bold text-white uppercase">
                        Megszakításkezelő Rutin (ISR) Művelet Tervező
                      </span>
                    </div>
                    <span className="text-[11px] font-mono text-amber-400">Hardveres Callback</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-mono text-[#8A8D98] block mb-1">ISR Cselekvés:</label>
                      <select
                        value={currentConfig.customIsrAction || 'toggle_led'}
                        onChange={(e) => handleUpdateConfig({ customIsrAction: e.target.value as any })}
                        className="w-full px-2.5 py-1.5 text-xs font-mono bg-[#12141A] border border-[#2A2D35] rounded-xs text-white"
                      >
                        <option value="toggle_led">Láb Állapotának Invertálása (LED Toggle PINB)</option>
                        <option value="increment_var">Volatile Változó Növelése (++ szamlalo)</option>
                        <option value="send_uart">Soros Port Adatküldés / Visszhang (Echo TX)</option>
                        <option value="custom_asm">Egyedi ASM Kód Futtatása (sbi / cbi / nop)</option>
                      </select>
                    </div>

                    {currentConfig.customIsrAction === 'toggle_led' && (
                      <div>
                        <label className="text-[11px] font-mono text-[#8A8D98] block mb-1">Cél Láb (Toggle Target):</label>
                        <select
                          value={currentConfig.customTargetPin || '13'}
                          onChange={(e) => handleUpdateConfig({ customTargetPin: e.target.value as ArduinoPin })}
                          className="w-full px-2.5 py-1.5 text-xs font-mono bg-[#12141A] border border-[#2A2D35] rounded-xs text-white"
                        >
                          <option value="13">D13 (Beépített Arduino LED / PB5)</option>
                          <option value="12">D12 (PB4)</option>
                          <option value="11">D11 (PB3)</option>
                          <option value="10">D10 (PB2)</option>
                          <option value="9">D9 (PB1)</option>
                          <option value="8">D8 (PB0)</option>
                        </select>
                      </div>
                    )}

                    {currentConfig.customIsrAction === 'increment_var' && (
                      <div>
                        <label className="text-[11px] font-mono text-[#8A8D98] block mb-1">Cél Változó (Volatile Var):</label>
                        <input
                          type="text"
                          value={currentConfig.customTargetVar || 'interrupt_counter'}
                          onChange={(e) => handleUpdateConfig({ customTargetVar: e.target.value })}
                          placeholder="pl. button_press_count"
                          className="w-full px-2.5 py-1.5 text-xs font-mono bg-[#12141A] border border-[#2A2D35] rounded-xs text-white"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Hardver Regiszter Térkép Info */}
                <div className="p-3 rounded-xs bg-[#12141A] border border-[#2A2D35] space-y-2">
                  <div className="text-xs font-mono font-bold text-white flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-sky-400" />
                    <span>Kapcsolódó ATmega328P I/O Regiszterek & Maszkok:</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {currentVectorInfo.registers.map((reg, idx) => (
                      <div key={idx} className="p-2 rounded-xs bg-[#1A1D24] border border-[#2A2D35] text-[11px] font-mono">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-sky-300">{reg.name}</span>
                          <span className="text-[#8A8D98]">{reg.addressHex}</span>
                        </div>
                        <div className="text-amber-300 text-[10px] mt-0.5">Bit: {reg.bit}</div>
                        <div className="text-[#8A8D98] text-[10px] mt-0.5">{reg.description}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Subtab: Vector Matrix Table */}
            {activeSubTab === 'table' && (
              <div className="p-3.5 rounded-xs bg-[#1A1D24] border border-[#2A2D35] space-y-3">
                <div className="flex items-center justify-between border-b border-[#2A2D35] pb-2">
                  <div className="flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-purple-400" />
                    <span className="text-xs font-mono font-bold text-white uppercase">
                      ATmega328P Teljes Hardveres Megszakítási Vektortábla (Flash 0x0000 - 0x0032)
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-purple-400">Prioritási Sorrend</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono border-collapse">
                    <thead>
                      <tr className="bg-[#12141A] text-[#8A8D98] border-b border-[#2A2D35]">
                        <th className="p-2">Vektor #</th>
                        <th className="p-2">Flash Cím</th>
                        <th className="p-2">Vektornév (ISR)</th>
                        <th className="p-2">Hardver Forrás</th>
                        <th className="p-2">Kategória</th>
                        <th className="p-2">Állapot</th>
                        <th className="p-2 text-right">Művelet</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#2A2D35]">
                      {ATMEGA328P_INTERRUPT_VECTORS.map((vec) => {
                        const isCfg = vectorConfigs[vec.id]?.enabled;
                        const isCurr = vec.id === selectedVectorId;
                        return (
                          <tr
                            key={vec.id}
                            className={`hover:bg-[#202430] transition-colors ${
                              isCurr ? 'bg-purple-950/40 font-bold' : ''
                            }`}
                          >
                            <td className="p-2 text-sky-400 font-bold">#{vec.vectorNum}</td>
                            <td className="p-2 text-[#8A8D98]">{vec.programAddressHex}</td>
                            <td className="p-2 text-white">{vec.vectorName}</td>
                            <td className="p-2 text-[#C5C8D4]">{vec.source}</td>
                            <td className="p-2">
                              <span className="text-[10px] px-1.5 py-0.2 rounded-xs border border-[#3A3F4B] bg-[#12141A]">
                                {vec.category}
                              </span>
                            </td>
                            <td className="p-2">
                              {isCfg ? (
                                <span className="text-[#4ade80] text-[10px] font-bold">✓ AKTÍV</span>
                              ) : (
                                <span className="text-[#8A8D98] text-[10px]">Inaktív</span>
                              )}
                            </td>
                            <td className="p-2 text-right">
                              <button
                                onClick={() => {
                                  setSelectedVectorId(vec.id);
                                  setActiveSubTab('config');
                                }}
                                className="px-2 py-0.5 rounded-xs bg-[#12141A] hover:bg-purple-900/60 text-purple-300 border border-[#3A3F4B] text-[10px] cursor-pointer"
                              >
                                Tervezés →
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Subtab: Generated C++ / ASM Code */}
            {activeSubTab === 'code' && (
              <div className="p-3.5 rounded-xs bg-[#1A1D24] border border-[#2A2D35] space-y-3">
                <div className="flex items-center justify-between border-b border-[#2A2D35] pb-2">
                  <div className="flex items-center gap-1.5">
                    <Terminal className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-mono font-bold text-white uppercase">
                      Generált Arduino C++ / AVR-GCC & Regiszterszintű Kód
                    </span>
                  </div>

                  <button
                    onClick={handleCopyCode}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-xs bg-[#12141A] hover:bg-emerald-950 text-[#4ade80] border border-emerald-500/50 text-xs font-mono font-bold transition-colors cursor-pointer"
                  >
                    {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedCode ? 'Másolva!' : 'Kód Másolása'}</span>
                  </button>
                </div>

                <div className="p-3 bg-[#12141A] rounded-xs border border-[#2A2D35] font-mono text-xs text-[#E0E0E6] overflow-x-auto space-y-2">
                  <div className="text-[#8A8D98]">// 1. Hardveres Inicializáló Rutin (setup)</div>
                  {generatedCode.setupCode.map((line, idx) => (
                    <div key={idx} className="text-sky-300">
                      {line}
                    </div>
                  ))}

                  <div className="text-[#8A8D98] pt-2">// 2. Hardveres Megszakításkezelő Függvény (ISR)</div>
                  {generatedCode.isrCode.map((line, idx) => (
                    <div key={idx} className="text-[#4ade80]">
                      {line}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Subtab: Real-time Event Log */}
            {activeSubTab === 'logs' && (
              <div className="p-3.5 rounded-xs bg-[#1A1D24] border border-[#2A2D35] space-y-3">
                <div className="flex items-center justify-between border-b border-[#2A2D35] pb-2">
                  <div className="flex items-center gap-1.5">
                    <Activity className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-mono font-bold text-white uppercase">
                      Valós Idejű Hardveres Megszakítás Eseménynapló (ISR Timeline)
                    </span>
                  </div>

                  <span className="text-[11px] font-mono text-amber-400">
                    Összesen {interruptState?.totalFiredCount || 0} lefutás
                  </span>
                </div>

                {(!interruptState?.eventLog || interruptState.eventLog.length === 0) ? (
                  <div className="p-6 text-center text-xs font-mono text-[#8A8D98]">
                    Még nem futott le megszakítás. Kattints a "Kiváltás (Pulse)" gombra a teszteléshez!
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-96 overflow-y-auto">
                    {interruptState.eventLog.map((log) => (
                      <div
                        key={log.id}
                        className="p-2.5 rounded-xs bg-[#12141A] border border-[#2A2D35] flex items-center justify-between text-xs font-mono"
                      >
                        <div className="flex items-center gap-2">
                          <span className="p-1 rounded-xs bg-amber-950 text-amber-400 border border-amber-500/40 font-bold text-[10px]">
                            {log.vector}
                          </span>
                          <div>
                            <div className="text-white font-bold">{log.vectorName}</div>
                            <div className="text-[10px] text-[#8A8D98]">{log.details}</div>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-[10px] text-sky-400 block">{log.source}</span>
                          <span className="text-[9px] text-[#8A8D98]">+{log.cyclesTaken} ciklus késleltetés</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer Bar with Workspace Block Inserter */}
        <div className="flex flex-col sm:flex-row items-center justify-between px-4 py-3 bg-[#12141A] border-t border-[#2A2D35] gap-2 shrink-0">
          <div className="text-xs font-mono text-[#8A8D98] flex items-center gap-2">
            <span className="text-white font-bold">{currentVectorInfo.vectorName}</span>
            <span>• Cím: {currentVectorInfo.programAddressHex}</span>
            <span>• Globális Megszakítás: {isGlobalEnabled ? 'BE (SEI)' : 'KI (CLI)'}</span>
          </div>

          <div className="flex items-center gap-2">
            {onInsertInterruptBlock && (
              <button
                id="btn-insert-interrupt-block"
                onClick={() => {
                  onInsertInterruptBlock(currentConfig);
                  onClose();
                }}
                className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-mono font-bold rounded-xs bg-purple-600 hover:bg-purple-500 text-white shadow-[2px_2px_0px_#000] border border-purple-400 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Beillesztés a Munkaterületre Blokként</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs font-mono font-bold rounded-xs bg-[#1A1D24] hover:bg-[#2A2D35] text-white border border-[#3A3F4B] transition-colors cursor-pointer"
            >
              Kész / Bezárás
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
