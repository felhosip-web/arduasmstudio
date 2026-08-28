/**
 * AVR Microcontroller FUSE Bits & Lock Bits Interactive Editor Modal
 * Visual bit toggling, functional high-level wizard, hazard diagnostics, preset library & avrdude generator.
 * (c) 2026 AI Studio ArduASM
 */

import React, { useState, useMemo } from 'react';
import {
  X,
  Cpu,
  Zap,
  Clock,
  Shield,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Lock,
  Unlock,
  Terminal,
  Copy,
  Check,
  RotateCcw,
  Sparkles,
  Sliders,
  FileCode,
  HardDrive,
  Layers,
  HelpCircle,
  Flame,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  Info,
} from 'lucide-react';
import { AvrFuseState, AvrFusePreset, AvrMcuFuseType } from '../types';
import {
  AVR_MCU_DESCRIPTORS,
  AVR_FUSE_PRESETS,
  ATMEGA328P_CLOCK_OPTIONS,
  ATMEGA328P_BOD_OPTIONS,
  ATMEGA328P_BOOT_SIZES,
  formatHexByte,
  formatBinByte,
  getBit,
  setBit,
  toggleBit,
  analyzeFuseHazards,
  generateAvrdudeCommand,
  generatePlatformIoConfig,
  generateArduinoBoardsSnippet,
  generateAvrCHeader,
  AvrdudeConfig,
} from '../utils/avrFuseCalculator';
import { ClockTreeVisualizer } from './ClockTreeVisualizer';
import { LockBitSimulator } from './LockBitSimulator';

interface AvrFuseModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialFuses?: AvrFuseState;
  onApplyFuses?: (fuses: AvrFuseState) => void;
  onOpenBootloaderModal?: () => void;
}

export type ModalTab = 'wizard' | 'clocktree' | 'lockbits' | 'grid' | 'presets' | 'avrdude' | 'export';

export const AvrFuseModal: React.FC<AvrFuseModalProps> = ({
  isOpen,
  onClose,
  initialFuses,
  onApplyFuses,
  onOpenBootloaderModal,
}) => {
  // Current Fuse State
  const [fuseState, setFuseState] = useState<AvrFuseState>(() => {
    return (
      initialFuses || {
        mcu: 'atmega328p',
        lfuse: 0xff,
        hfuse: 0xde,
        efuse: 0xfd,
        lock: 0x0f,
      }
    );
  });

  // Active view tab
  const [activeTab, setActiveTab] = useState<ModalTab>('wizard');

  // Avrdude generator settings
  const [avrdudeConfig, setAvrdudeConfig] = useState<AvrdudeConfig>({
    programmer: 'usbasp',
    port: '',
    baud: '',
    doVerify: true,
  });

  // Export view type
  const [exportType, setExportType] = useState<'platformio' | 'boardstxt' | 'cheader'>('platformio');

  // Copy notification states
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Safety confirmation for critical RSTDISBL toggle
  const [pendingHazardOverride, setPendingHazardOverride] = useState<string | null>(null);

  // Selected MCU descriptor
  const mcuDesc = AVR_MCU_DESCRIPTORS[fuseState.mcu] || AVR_MCU_DESCRIPTORS.atmega328p;

  // Real-time Safety Hazards Analyzer
  const hazards = useMemo(() => {
    return analyzeFuseHazards(fuseState);
  }, [fuseState]);

  const criticalHazards = hazards.filter((h) => h.severity === 'danger');
  const warningHazards = hazards.filter((h) => h.severity === 'warning');

  if (!isOpen) return null;

  // -------------------------------------------------------------
  // Event Handlers
  // -------------------------------------------------------------

  const handleCopyText = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleBitToggle = (fuseType: 'lfuse' | 'hfuse' | 'efuse' | 'lock', bitIndex: number) => {
    const currentVal = fuseState[fuseType];
    const newBit = getBit(currentVal, bitIndex) === 1 ? 0 : 1;

    // Safety guard against accidentally disabling RSTDISBL (setting it to 0)
    if (
      fuseType === 'hfuse' &&
      bitIndex === 7 &&
      newBit === 0 &&
      (fuseState.mcu === 'atmega328p' || fuseState.mcu === 'atmega168' || fuseState.mcu === 'attiny85')
    ) {
      if (
        !window.confirm(
          'FIGYELMEZTETÉS: A RSTDISBL bit 0-ra állítása letiltja a RESET lábat és az ISP soros programozást!\n\nA mikrokontroller normál USBasp-vel többé NEM lesz újraírható (csak 12V-os nagyfeszültségű programozóval).\n\nBiztosan át akarod állítani?'
        )
      ) {
        return;
      }
    }

    setFuseState((prev) => ({
      ...prev,
      [fuseType]: setBit(prev[fuseType], bitIndex, newBit),
    }));
  };

  const handleHexInputChange = (fuseType: 'lfuse' | 'hfuse' | 'efuse' | 'lock', rawStr: string) => {
    const cleanStr = rawStr.replace(/^0x/i, '').trim();
    if (/^[0-9A-Fa-f]{1,2}$/.test(cleanStr)) {
      const num = parseInt(cleanStr, 16);
      if (!isNaN(num) && num >= 0 && num <= 255) {
        setFuseState((prev) => ({
          ...prev,
          [fuseType]: num,
        }));
      }
    }
  };

  const handleMcuChange = (newMcu: AvrMcuFuseType) => {
    const desc = AVR_MCU_DESCRIPTORS[newMcu];
    if (desc) {
      setFuseState({
        mcu: newMcu,
        lfuse: desc.defaultLfuse,
        hfuse: desc.defaultHfuse,
        efuse: desc.defaultEfuse,
        lock: desc.defaultLock,
      });
    }
  };

  const handleApplyPreset = (preset: AvrFusePreset) => {
    setFuseState({
      mcu: preset.mcu,
      lfuse: preset.lfuse,
      hfuse: preset.hfuse,
      efuse: preset.efuse,
      lock: preset.lock,
    });
  };

  const handleResetToDefaults = () => {
    setFuseState({
      mcu: fuseState.mcu,
      lfuse: mcuDesc.defaultLfuse,
      hfuse: mcuDesc.defaultHfuse,
      efuse: mcuDesc.defaultEfuse,
      lock: mcuDesc.defaultLock,
    });
  };

  const handleSaveAndApply = () => {
    if (onApplyFuses) {
      onApplyFuses(fuseState);
    }
    onClose();
  };

  // High-level wizard helpers (for ATmega328P)
  const currentClockVal = fuseState.lfuse & 0x0f;
  const isClockDiv8 = getBit(fuseState.lfuse, 7) === 0;
  const isClockOut = getBit(fuseState.lfuse, 6) === 0;
  const currentBodVal = fuseState.efuse & 0x07;
  const currentBootSizeVal = (fuseState.hfuse >> 1) & 0x03;
  const isBootRst = getBit(fuseState.hfuse, 0) === 0;
  const isEeSave = getBit(fuseState.hfuse, 3) === 0;
  const isWdtAlwaysOn = getBit(fuseState.hfuse, 4) === 0;
  const isSpiProgEnabled = getBit(fuseState.hfuse, 5) === 0;
  const isResetDisabled = getBit(fuseState.hfuse, 7) === 0;
  const isLockActive = (fuseState.lock & 0x03) !== 0x03;

  return (
    <div
      id="avr-fuse-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-xs font-sans animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="avr-fuse-modal-container"
        className="bg-[#12151B] border border-[#3A3F4B] rounded-xs shadow-[8px_8px_0px_#000] w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden text-[#E0E0E6]"
      >
        {/* Modal Header */}
        <div className="bg-[#161920] border-b border-[#2A2D35] px-4 py-3 flex flex-wrap items-center justify-between gap-3 select-none">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xs bg-emerald-950 text-[#4ade80] border border-emerald-500/50 flex items-center justify-center font-mono font-bold shadow-[2px_2px_0px_#000]">
              <Flame className="w-4 h-4 text-[#4ade80]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-white tracking-wide font-mono uppercase">
                  AVR FUSE & Lock Bitek Kezelő
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-xs bg-[#0F1115] text-[#4ade80] border border-[#3A3F4B]">
                  Hardware Configurator
                </span>
              </div>
              <p className="text-xs text-[#8A8D98]">
                Órajelforrás, Brown-Out Detector, Bootloader terület és biztonsági lock bitek szerkesztése
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="btn-reset-fuses-default"
              onClick={handleResetToDefaults}
              className="px-2.5 py-1.5 bg-[#1A1D24] hover:bg-[#252932] text-xs font-mono text-[#E0E0E6] border border-[#3A3F4B] rounded-xs flex items-center gap-1.5 transition-colors shadow-[1px_1px_0px_#000]"
              title="Visszaállítás az adott MCU gyári alapértelmezett értékeire"
            >
              <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Gyári Alapértelmezés</span>
            </button>
            <button
              id="btn-close-fuse-modal"
              onClick={onClose}
              className="p-1.5 text-[#8A8D98] hover:text-white hover:bg-[#1A1D24] rounded-xs border border-transparent hover:border-[#3A3F4B] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* MCU Bar & Live Hex Values Ribbon */}
        <div className="bg-[#0F1115] border-b border-[#2A2D35] px-4 py-2 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
          {/* MCU Target Selector */}
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-[#4ade80]" />
            <span className="text-[#8A8D98] uppercase text-[11px] font-bold">MCU Típus:</span>
            <select
              id="select-fuse-mcu"
              value={fuseState.mcu}
              onChange={(e) => handleMcuChange(e.target.value as AvrMcuFuseType)}
              className="px-2.5 py-1 bg-[#161920] border border-[#3A3F4B] hover:border-[#4ade80] rounded-xs text-xs font-mono font-bold text-[#4ade80] focus:outline-none focus:border-[#4ade80]"
            >
              {Object.values(AVR_MCU_DESCRIPTORS).map((desc) => (
                <option key={desc.id} value={desc.id} className="bg-[#161920] text-[#E0E0E6]">
                  {desc.name}
                </option>
              ))}
            </select>
            <span className="text-[10px] text-[#8A8D98] hidden md:inline">
              (Sig: {mcuDesc.signature} • {mcuDesc.flashSizeKb}KB Flash • {mcuDesc.eepromSizeBytes}B EEPROM)
            </span>
          </div>

          {/* Live Calculated Hex Summary Badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1 bg-[#161920] px-2 py-0.5 rounded-xs border border-[#3A3F4B]">
              <span className="text-[#8A8D98] text-[10px] font-bold">LOW:</span>
              <span className="text-emerald-400 font-bold">{formatHexByte(fuseState.lfuse)}</span>
            </div>
            <div className="flex items-center gap-1 bg-[#161920] px-2 py-0.5 rounded-xs border border-[#3A3F4B]">
              <span className="text-[#8A8D98] text-[10px] font-bold">HIGH:</span>
              <span className="text-amber-400 font-bold">{formatHexByte(fuseState.hfuse)}</span>
            </div>
            {mcuDesc.hasExtendedFuse && (
              <div className="flex items-center gap-1 bg-[#161920] px-2 py-0.5 rounded-xs border border-[#3A3F4B]">
                <span className="text-[#8A8D98] text-[10px] font-bold">EXT:</span>
                <span className="text-cyan-400 font-bold">{formatHexByte(fuseState.efuse)}</span>
              </div>
            )}
            <div className="flex items-center gap-1 bg-[#161920] px-2 py-0.5 rounded-xs border border-[#3A3F4B]">
              <span className="text-[#8A8D98] text-[10px] font-bold">LOCK:</span>
              <span className="text-purple-400 font-bold">{formatHexByte(fuseState.lock)}</span>
            </div>
          </div>
        </div>

        {/* Hazard & Safety Diagnostic Banner (if any issues found) */}
        {hazards.length > 0 && (
          <div className="bg-[#181215] border-b border-rose-900/50 px-4 py-2.5">
            <div className="space-y-1.5">
              {hazards.map((hazard) => (
                <div
                  key={hazard.id}
                  className={`flex items-start justify-between gap-2 p-2 rounded-xs border text-xs ${
                    hazard.severity === 'danger'
                      ? 'bg-rose-950/80 border-rose-600/70 text-rose-200'
                      : hazard.severity === 'warning'
                      ? 'bg-amber-950/70 border-amber-600/60 text-amber-200'
                      : 'bg-sky-950/70 border-sky-600/60 text-sky-200'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {hazard.severity === 'danger' ? (
                      <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5 animate-pulse" />
                    ) : hazard.severity === 'warning' ? (
                      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    ) : (
                      <Info className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <div className="font-bold font-mono text-[11px]">{hazard.title}</div>
                      <div className="text-[11px] opacity-90 leading-tight mt-0.5">{hazard.message}</div>
                      {hazard.remedy && (
                        <div className="text-[10px] font-mono opacity-80 mt-1 flex items-center gap-1">
                          <span className="font-bold">Javaslat:</span> {hazard.remedy}
                        </div>
                      )}
                    </div>
                  </div>

                  {hazard.id === 'hazard-rstdisbl' && (
                    <button
                      onClick={() => setFuseState((prev) => ({ ...prev, hfuse: setBit(prev.hfuse, 7, 1) }))}
                      className="px-2 py-1 bg-rose-600 hover:bg-rose-500 text-white font-mono text-[10px] font-bold rounded-xs shrink-0 transition-colors"
                    >
                      RESET Visszaállítása (Biztonságos)
                    </button>
                  )}
                  {hazard.id === 'hazard-spien' && (
                    <button
                      onClick={() => setFuseState((prev) => ({ ...prev, hfuse: setBit(prev.hfuse, 5, 0) }))}
                      className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-[10px] font-bold rounded-xs shrink-0 transition-colors"
                    >
                      ISP Bekapcsolása
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="bg-[#14171E] border-b border-[#2A2D35] px-4 flex items-center gap-1 overflow-x-auto select-none font-mono text-xs">
          <button
            id="tab-btn-wizard"
            onClick={() => setActiveTab('wizard')}
            className={`px-3 py-2 text-xs font-mono font-bold flex items-center gap-1.5 border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'wizard'
                ? 'border-emerald-400 text-emerald-400 bg-[#161920]'
                : 'border-transparent text-[#8A8D98] hover:text-[#E0E0E6]'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>🪄 Emberi Nyelvű Varázsló 2.0</span>
          </button>

          <button
            id="tab-btn-clocktree"
            onClick={() => setActiveTab('clocktree')}
            className={`px-3 py-2 text-xs font-mono font-bold flex items-center gap-1.5 border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'clocktree'
                ? 'border-cyan-400 text-cyan-400 bg-[#161920]'
                : 'border-transparent text-[#8A8D98] hover:text-[#E0E0E6]'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            <span>🌳 Clock Tree Vizualizáció</span>
          </button>

          <button
            id="tab-btn-lockbits"
            onClick={() => setActiveTab('lockbits')}
            className={`px-3 py-2 text-xs font-mono font-bold flex items-center gap-1.5 border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'lockbits'
                ? 'border-purple-400 text-purple-400 bg-[#161920]'
                : 'border-transparent text-[#8A8D98] hover:text-[#E0E0E6]'
            }`}
          >
            <Lock className="w-3.5 h-3.5 text-purple-400" />
            <span>🔒 Lock Bit Szimuláció</span>
          </button>

          <button
            id="tab-btn-grid"
            onClick={() => setActiveTab('grid')}
            className={`px-3 py-2 text-xs font-mono font-bold flex items-center gap-1.5 border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'grid'
                ? 'border-emerald-400 text-emerald-400 bg-[#161920]'
                : 'border-transparent text-[#8A8D98] hover:text-[#E0E0E6]'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Vizuális Bit Mátrix</span>
          </button>

          <button
            id="tab-btn-presets"
            onClick={() => setActiveTab('presets')}
            className={`px-3 py-2 text-xs font-mono font-bold flex items-center gap-1.5 border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'presets'
                ? 'border-amber-400 text-amber-400 bg-[#161920]'
                : 'border-transparent text-[#8A8D98] hover:text-[#E0E0E6]'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Profilok & Presetek ({AVR_FUSE_PRESETS.length})</span>
          </button>

          <button
            id="tab-btn-avrdude"
            onClick={() => setActiveTab('avrdude')}
            className={`px-3 py-2 text-xs font-mono font-bold flex items-center gap-1.5 border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'avrdude'
                ? 'border-cyan-400 text-cyan-400 bg-[#161920]'
                : 'border-transparent text-[#8A8D98] hover:text-[#E0E0E6]'
            }`}
          >
            <Terminal className="w-3.5 h-3.5 text-cyan-400" />
            <span>Avrdude Parancs</span>
          </button>

          <button
            id="tab-btn-export"
            onClick={() => setActiveTab('export')}
            className={`px-3 py-2 text-xs font-mono font-bold flex items-center gap-1.5 border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'export'
                ? 'border-purple-400 text-purple-400 bg-[#161920]'
                : 'border-transparent text-[#8A8D98] hover:text-[#E0E0E6]'
            }`}
          >
            <FileCode className="w-3.5 h-3.5 text-purple-400" />
            <span>Kód & Config Export</span>
          </button>
        </div>

        {/* Modal Body / Tab Contents */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 bg-[#0F1115] space-y-4 custom-scrollbar">
          {/* TAB: CLOCK TREE VIZUALIZÁCIÓ */}
          {activeTab === 'clocktree' && (
            <ClockTreeVisualizer
              fuseState={fuseState}
              onUpdateFuseState={setFuseState}
            />
          )}

          {/* TAB: LOCK BIT & FLASH READOUT SIMULATOR */}
          {activeTab === 'lockbits' && (
            <LockBitSimulator
              fuseState={fuseState}
              onUpdateFuseState={setFuseState}
            />
          )}
          {/* ========================================================= */}
          {/* TAB 1: VIZUÁLIS BIT MÁTRIX                                */}
          {/* ========================================================= */}
          {activeTab === 'grid' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-[#161920] p-3 rounded-xs border border-[#2A2D35] text-xs">
                <div className="flex items-center gap-2">
                  <Info className="w-4 h-4 text-sky-400" />
                  <span className="text-[#8A8D98]">
                    AVR FUSE konvenció:{' '}
                    <span className="text-emerald-400 font-bold font-mono">0 = Programozott (Bekapcsolva)</span>,{' '}
                    <span className="text-[#8A8D98] font-bold font-mono">1 = Nem programozott (Kikapcsolva)</span>. Kattints a bitekre a kapcsoláshoz!
                  </span>
                </div>
              </div>

              {/* 1. LOW FUSE BYTE */}
              <div className="bg-[#161920] rounded-xs border border-[#3A3F4B] p-3.5 shadow-[2px_2px_0px_#000]">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5 pb-2 border-b border-[#2A2D35]">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-emerald-400" />
                    <span className="font-mono font-bold text-sm text-white uppercase">Low Fuse (lfuse)</span>
                    <span className="text-xs text-[#8A8D98] font-sans">
                      — Órajelforrás, Indítási idő és Órajel-osztó
                    </span>
                  </div>
                  <div className="flex items-center gap-2 font-mono">
                    <span className="text-xs text-[#8A8D98]">HEX:</span>
                    <input
                      type="text"
                      value={formatHexByte(fuseState.lfuse)}
                      onChange={(e) => handleHexInputChange('lfuse', e.target.value)}
                      className="w-16 px-2 py-0.5 bg-[#0F1115] border border-[#3A3F4B] text-emerald-400 font-bold text-xs rounded-xs text-center focus:outline-none focus:border-[#4ade80]"
                    />
                    <span className="text-xs text-[#8A8D98] ml-2">BIN:</span>
                    <span className="text-xs text-white bg-[#0F1115] px-2 py-0.5 rounded-xs border border-[#2A2D35]">
                      {formatBinByte(fuseState.lfuse)}
                    </span>
                  </div>
                </div>

                {/* 8 Bits interactive row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
                  {mcuDesc.lowBits.map((bitInfo) => {
                    const isSet = getBit(fuseState.lfuse, bitInfo.bit) === 1;
                    const isProgrammed = !isSet; // 0 in AVR means programmed
                    return (
                      <button
                        key={`low-${bitInfo.bit}`}
                        onClick={() => handleBitToggle('lfuse', bitInfo.bit)}
                        className={`p-2.5 rounded-xs border text-left transition-all relative flex flex-col justify-between group cursor-pointer ${
                          isProgrammed
                            ? 'bg-emerald-950/70 border-emerald-500 text-emerald-200 shadow-[0_0_8px_rgba(74,222,128,0.2)]'
                            : 'bg-[#1A1D24] border-[#3A3F4B] text-[#8A8D98] hover:border-[#4ade80]/60'
                        }`}
                        title={bitInfo.descHu}
                      >
                        <div className="flex items-center justify-between w-full font-mono text-[10px]">
                          <span className="text-[#8A8D98]">Bit {bitInfo.bit}</span>
                          <span
                            className={`w-4 h-4 rounded-xs flex items-center justify-center font-bold text-[10px] ${
                              isProgrammed ? 'bg-emerald-500 text-black' : 'bg-[#0F1115] text-[#8A8D98]'
                            }`}
                          >
                            {isSet ? '1' : '0'}
                          </span>
                        </div>
                        <div className="my-1.5">
                          <div className={`font-mono font-bold text-xs ${isProgrammed ? 'text-white' : 'text-[#C5C8D4]'}`}>
                            {bitInfo.name}
                          </div>
                          <div className="text-[9px] line-clamp-1 text-[#8A8D98] mt-0.5">{bitInfo.labelHu}</div>
                        </div>
                        <div className="text-[9px] font-mono mt-1 font-bold">
                          {isProgrammed ? (
                            <span className="text-emerald-400">● PROGRAMOZOTT (0)</span>
                          ) : (
                            <span className="text-[#8A8D98]">○ KI (1)</span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. HIGH FUSE BYTE */}
              <div className="bg-[#161920] rounded-xs border border-[#3A3F4B] p-3.5 shadow-[2px_2px_0px_#000]">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5 pb-2 border-b border-[#2A2D35]">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-amber-400" />
                    <span className="font-mono font-bold text-sm text-white uppercase">High Fuse (hfuse)</span>
                    <span className="text-xs text-[#8A8D98] font-sans">
                      — RESET láb, ISP letöltés, Watchdog, EEPROM megőrzés és Bootloader
                    </span>
                  </div>
                  <div className="flex items-center gap-2 font-mono">
                    <span className="text-xs text-[#8A8D98]">HEX:</span>
                    <input
                      type="text"
                      value={formatHexByte(fuseState.hfuse)}
                      onChange={(e) => handleHexInputChange('hfuse', e.target.value)}
                      className="w-16 px-2 py-0.5 bg-[#0F1115] border border-[#3A3F4B] text-amber-400 font-bold text-xs rounded-xs text-center focus:outline-none focus:border-amber-400"
                    />
                    <span className="text-xs text-[#8A8D98] ml-2">BIN:</span>
                    <span className="text-xs text-white bg-[#0F1115] px-2 py-0.5 rounded-xs border border-[#2A2D35]">
                      {formatBinByte(fuseState.hfuse)}
                    </span>
                  </div>
                </div>

                {/* 8 Bits interactive row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
                  {mcuDesc.highBits.map((bitInfo) => {
                    const isSet = getBit(fuseState.hfuse, bitInfo.bit) === 1;
                    const isProgrammed = !isSet;
                    const isDanger = bitInfo.isCritical && isProgrammed && bitInfo.name === 'RSTDISBL';
                    return (
                      <button
                        key={`high-${bitInfo.bit}`}
                        onClick={() => handleBitToggle('hfuse', bitInfo.bit)}
                        className={`p-2.5 rounded-xs border text-left transition-all relative flex flex-col justify-between group cursor-pointer ${
                          isDanger
                            ? 'bg-rose-950/80 border-rose-500 text-rose-200 ring-1 ring-rose-500'
                            : isProgrammed
                            ? 'bg-amber-950/70 border-amber-500 text-amber-200 shadow-[0_0_8px_rgba(245,158,11,0.2)]'
                            : 'bg-[#1A1D24] border-[#3A3F4B] text-[#8A8D98] hover:border-amber-400/60'
                        }`}
                        title={bitInfo.descHu}
                      >
                        <div className="flex items-center justify-between w-full font-mono text-[10px]">
                          <span className="text-[#8A8D98]">Bit {bitInfo.bit}</span>
                          <span
                            className={`w-4 h-4 rounded-xs flex items-center justify-center font-bold text-[10px] ${
                              isDanger
                                ? 'bg-rose-500 text-white'
                                : isProgrammed
                                ? 'bg-amber-400 text-black'
                                : 'bg-[#0F1115] text-[#8A8D98]'
                            }`}
                          >
                            {isSet ? '1' : '0'}
                          </span>
                        </div>
                        <div className="my-1.5">
                          <div
                            className={`font-mono font-bold text-xs flex items-center gap-1 ${
                              isDanger ? 'text-rose-300' : isProgrammed ? 'text-white' : 'text-[#C5C8D4]'
                            }`}
                          >
                            <span>{bitInfo.name}</span>
                            {bitInfo.isCritical && <AlertTriangle className="w-2.5 h-2.5 text-rose-400" />}
                          </div>
                          <div className="text-[9px] line-clamp-1 text-[#8A8D98] mt-0.5">{bitInfo.labelHu}</div>
                        </div>
                        <div className="text-[9px] font-mono mt-1 font-bold">
                          {isDanger ? (
                            <span className="text-rose-400">⚠️ VESZÉLY (0)</span>
                          ) : isProgrammed ? (
                            <span className="text-amber-400">● PROGRAMOZOTT (0)</span>
                          ) : (
                            <span className="text-[#8A8D98]">○ KI (1)</span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3. EXTENDED FUSE & LOCK BITS (Side-by-side) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* EXTENDED FUSE BYTE */}
                {mcuDesc.hasExtendedFuse && (
                  <div className="bg-[#161920] rounded-xs border border-[#3A3F4B] p-3.5 shadow-[2px_2px_0px_#000]">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5 pb-2 border-b border-[#2A2D35]">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-cyan-400" />
                        <span className="font-mono font-bold text-sm text-white uppercase">Extended (efuse)</span>
                        <span className="text-xs text-[#8A8D98] font-sans">— BOD Szint</span>
                      </div>
                      <div className="flex items-center gap-2 font-mono">
                        <span className="text-xs text-[#8A8D98]">HEX:</span>
                        <input
                          type="text"
                          value={formatHexByte(fuseState.efuse)}
                          onChange={(e) => handleHexInputChange('efuse', e.target.value)}
                          className="w-16 px-2 py-0.5 bg-[#0F1115] border border-[#3A3F4B] text-cyan-400 font-bold text-xs rounded-xs text-center focus:outline-none focus:border-cyan-400"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {mcuDesc.extBits.map((bitInfo) => {
                        const isSet = getBit(fuseState.efuse, bitInfo.bit) === 1;
                        const isProgrammed = !isSet;
                        return (
                          <button
                            key={`ext-${bitInfo.bit}`}
                            onClick={() => handleBitToggle('efuse', bitInfo.bit)}
                            className={`p-2.5 rounded-xs border text-left transition-all relative flex flex-col justify-between group cursor-pointer ${
                              isProgrammed
                                ? 'bg-cyan-950/70 border-cyan-500 text-cyan-200 shadow-[0_0_8px_rgba(6,182,212,0.2)]'
                                : 'bg-[#1A1D24] border-[#3A3F4B] text-[#8A8D98] hover:border-cyan-400/60'
                            }`}
                            title={bitInfo.descHu}
                          >
                            <div className="flex items-center justify-between w-full font-mono text-[10px]">
                              <span className="text-[#8A8D98]">Bit {bitInfo.bit}</span>
                              <span
                                className={`w-4 h-4 rounded-xs flex items-center justify-center font-bold text-[10px] ${
                                  isProgrammed ? 'bg-cyan-400 text-black' : 'bg-[#0F1115] text-[#8A8D98]'
                                }`}
                              >
                                {isSet ? '1' : '0'}
                              </span>
                            </div>
                            <div className="my-1">
                              <div className={`font-mono font-bold text-xs ${isProgrammed ? 'text-white' : 'text-[#C5C8D4]'}`}>
                                {bitInfo.name}
                              </div>
                              <div className="text-[9px] line-clamp-1 text-[#8A8D98] mt-0.5">{bitInfo.labelHu}</div>
                            </div>
                            <div className="text-[9px] font-mono mt-0.5 font-bold">
                              {isProgrammed ? <span className="text-cyan-400">● 0</span> : <span className="text-[#8A8D98]">○ 1</span>}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* LOCK BITS BYTE */}
                <div className="bg-[#161920] rounded-xs border border-[#3A3F4B] p-3.5 shadow-[2px_2px_0px_#000]">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5 pb-2 border-b border-[#2A2D35]">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-purple-400" />
                      <span className="font-mono font-bold text-sm text-white uppercase">Lock Bits (lock)</span>
                      <span className="text-xs text-[#8A8D98] font-sans">— Flash & EEPROM Védelem</span>
                    </div>
                    <div className="flex items-center gap-2 font-mono">
                      <span className="text-xs text-[#8A8D98]">HEX:</span>
                      <input
                        type="text"
                        value={formatHexByte(fuseState.lock)}
                        onChange={(e) => handleHexInputChange('lock', e.target.value)}
                        className="w-16 px-2 py-0.5 bg-[#0F1115] border border-[#3A3F4B] text-purple-400 font-bold text-xs rounded-xs text-center focus:outline-none focus:border-purple-400"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {mcuDesc.lockBits.map((bitInfo) => {
                      const isSet = getBit(fuseState.lock, bitInfo.bit) === 1;
                      const isProgrammed = !isSet;
                      return (
                        <button
                          key={`lock-${bitInfo.bit}`}
                          onClick={() => handleBitToggle('lock', bitInfo.bit)}
                          className={`p-2.5 rounded-xs border text-left transition-all relative flex flex-col justify-between group cursor-pointer ${
                            isProgrammed
                              ? 'bg-purple-950/70 border-purple-500 text-purple-200 shadow-[0_0_8px_rgba(168,85,247,0.2)]'
                              : 'bg-[#1A1D24] border-[#3A3F4B] text-[#8A8D98] hover:border-purple-400/60'
                          }`}
                          title={bitInfo.descHu}
                        >
                          <div className="flex items-center justify-between w-full font-mono text-[10px]">
                            <span className="text-[#8A8D98]">Bit {bitInfo.bit}</span>
                            <span
                              className={`w-4 h-4 rounded-xs flex items-center justify-center font-bold text-[10px] ${
                                isProgrammed ? 'bg-purple-400 text-black' : 'bg-[#0F1115] text-[#8A8D98]'
                              }`}
                            >
                              {isSet ? '1' : '0'}
                            </span>
                          </div>
                          <div className="my-1">
                            <div className={`font-mono font-bold text-xs ${isProgrammed ? 'text-white' : 'text-[#C5C8D4]'}`}>
                              {bitInfo.name}
                            </div>
                            <div className="text-[9px] line-clamp-1 text-[#8A8D98] mt-0.5">{bitInfo.labelHu}</div>
                          </div>
                          <div className="text-[9px] font-mono mt-0.5 font-bold">
                            {isProgrammed ? (
                              <span className="text-purple-400">🔒 ZÁROLVA (0)</span>
                            ) : (
                              <span className="text-[#8A8D98]">🔓 NYITOTT (1)</span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 2: FUNKCIONÁLIS VARÁZSLÓ (WIZARD)                     */}
          {/* ========================================================= */}
          {activeTab === 'wizard' && (
            <div className="space-y-4">
              {/* 1. ÓRAJELFORRÁS & ELŐOSZTÓ SZEKCIÓ */}
              <div className="bg-[#161920] rounded-xs border border-[#3A3F4B] p-4 shadow-[2px_2px_0px_#000]">
                <div className="flex items-center gap-2 mb-3 pb-2 border-b border-[#2A2D35]">
                  <Clock className="w-4 h-4 text-amber-400" />
                  <h3 className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                    1. Órajelforrás & Hardver Oszcillátor (CKSEL / SUT)
                  </h3>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-[#E0E0E6] mb-1.5">
                      Válassz Oszcillátor Típust:
                    </label>
                    <select
                      value={currentClockVal}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        setFuseState((prev) => ({
                          ...prev,
                          lfuse: (prev.lfuse & 0xf0) | (val & 0x0f),
                        }));
                      }}
                      className="w-full px-3 py-2 bg-[#0F1115] border border-[#3A3F4B] hover:border-[#4ade80] rounded-xs text-xs font-mono text-[#E0E0E6] focus:outline-none focus:border-[#4ade80]"
                    >
                      {ATMEGA328P_CLOCK_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value} className="bg-[#161920] text-[#E0E0E6]">
                          {opt.label} ({opt.freqRange})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Clock Prescaler and CLKO Options */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <label className="flex items-start gap-2.5 p-2.5 bg-[#0F1115] border border-[#2A2D35] rounded-xs cursor-pointer hover:border-[#3A3F4B]">
                      <input
                        type="checkbox"
                        checked={isClockDiv8}
                        onChange={(e) => {
                          setFuseState((prev) => ({
                            ...prev,
                            lfuse: setBit(prev.lfuse, 7, e.target.checked ? 0 : 1),
                          }));
                        }}
                        className="mt-0.5 rounded-xs accent-emerald-500"
                      />
                      <div>
                        <div className="text-xs font-bold text-white font-mono">CKDIV8: Órajel osztása 8-cal</div>
                        <p className="text-[11px] text-[#8A8D98]">
                          Belső 8-as frekvenciaosztás (pl. 8 MHz belső RC esetén 1.0 MHz rendszerórajel lesz).
                        </p>
                      </div>
                    </label>

                    <label className="flex items-start gap-2.5 p-2.5 bg-[#0F1115] border border-[#2A2D35] rounded-xs cursor-pointer hover:border-[#3A3F4B]">
                      <input
                        type="checkbox"
                        checked={isClockOut}
                        onChange={(e) => {
                          setFuseState((prev) => ({
                            ...prev,
                            lfuse: setBit(prev.lfuse, 6, e.target.checked ? 0 : 1),
                          }));
                        }}
                        className="mt-0.5 rounded-xs accent-emerald-500"
                      />
                      <div>
                        <div className="text-xs font-bold text-white font-mono">CKOUT: Órajel kivezetése PB0-ra</div>
                        <p className="text-[11px] text-[#8A8D98]">
                          A CLKO lábon (Arduino D8 / PB0) megjelenik a processzor valódi négyszögjel órajele.
                        </p>
                      </div>
                    </label>
                  </div>
                </div>
              </div>

              {/* 2. BROWN-OUT DETECTOR (BOD) SZEKCIÓ */}
              <div className="bg-[#161920] rounded-xs border border-[#3A3F4B] p-4 shadow-[2px_2px_0px_#000]">
                <div className="flex items-center gap-2 mb-3 pb-2 border-b border-[#2A2D35]">
                  <Shield className="w-4 h-4 text-cyan-400" />
                  <h3 className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                    2. Tápfeszültség Védelem (Brown-out Detection - BODLEVEL)
                  </h3>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-[#E0E0E6] mb-1.5">
                      BOD Feszültségküszöb Kiválasztása:
                    </label>
                    <select
                      value={currentBodVal}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        setFuseState((prev) => ({
                          ...prev,
                          efuse: (prev.efuse & 0xf8) | (val & 0x07),
                        }));
                      }}
                      className="w-full px-3 py-2 bg-[#0F1115] border border-[#3A3F4B] hover:border-cyan-400 rounded-xs text-xs font-mono text-[#E0E0E6] focus:outline-none focus:border-cyan-400"
                    >
                      {ATMEGA328P_BOD_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value} className="bg-[#161920] text-[#E0E0E6]">
                          {opt.label} — {opt.volts} ({opt.recommendedFor})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* 3. BOOTLOADER & INDÍTÁSI RESET VEKTOR */}
              <div className="bg-[#161920] rounded-xs border border-[#3A3F4B] p-4 shadow-[2px_2px_0px_#000]">
                <div className="flex items-center justify-between gap-2 mb-3 pb-2 border-b border-[#2A2D35]">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-400" />
                    <h3 className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                      3. Bootloader & Hardveres Indítás (BOOTSZ / BOOTRST / EESAVE)
                    </h3>
                  </div>
                  {onOpenBootloaderModal && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenBootloaderModal();
                      }}
                      className="px-2.5 py-1 text-[11px] font-mono font-bold text-amber-300 bg-amber-950/80 hover:bg-amber-900 border border-amber-500/60 rounded-xs transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <span>Dedikált Bootloader Stúdió ➔</span>
                    </button>
                  )}
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-[#E0E0E6] mb-1.5">
                      Bootloader Terület Mérete (BOOTSZ):
                    </label>
                    <select
                      value={currentBootSizeVal}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        setFuseState((prev) => ({
                          ...prev,
                          hfuse: (prev.hfuse & ~0x06) | ((val & 0x03) << 1),
                        }));
                      }}
                      className="w-full px-3 py-2 bg-[#0F1115] border border-[#3A3F4B] hover:border-amber-400 rounded-xs text-xs font-mono text-[#E0E0E6] focus:outline-none focus:border-amber-400"
                    >
                      {ATMEGA328P_BOOT_SIZES.map((opt) => (
                        <option key={opt.value} value={opt.value} className="bg-[#161920] text-[#E0E0E6]">
                          {opt.label} — Cím: {opt.addressHex}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                    {/* BOOTRST Toggle */}
                    <label className="flex items-start gap-2.5 p-2.5 bg-[#0F1115] border border-[#2A2D35] rounded-xs cursor-pointer hover:border-[#3A3F4B]">
                      <input
                        type="checkbox"
                        checked={isBootRst}
                        onChange={(e) => {
                          setFuseState((prev) => ({
                            ...prev,
                            hfuse: setBit(prev.hfuse, 0, e.target.checked ? 0 : 1),
                          }));
                        }}
                        className="mt-0.5 rounded-xs accent-amber-400"
                      />
                      <div>
                        <div className="text-xs font-bold text-white font-mono">BOOTRST: Bootloader Indítás</div>
                        <p className="text-[11px] text-[#8A8D98]">
                          Bekapcsoláskor a reset vektor azonnal a Bootloader címre ugrik.
                        </p>
                      </div>
                    </label>

                    {/* EESAVE Toggle */}
                    <label className="flex items-start gap-2.5 p-2.5 bg-[#0F1115] border border-[#2A2D35] rounded-xs cursor-pointer hover:border-[#3A3F4B]">
                      <input
                        type="checkbox"
                        checked={isEeSave}
                        onChange={(e) => {
                          setFuseState((prev) => ({
                            ...prev,
                            hfuse: setBit(prev.hfuse, 3, e.target.checked ? 0 : 1),
                          }));
                        }}
                        className="mt-0.5 rounded-xs accent-amber-400"
                      />
                      <div>
                        <div className="text-xs font-bold text-white font-mono">EESAVE: EEPROM Megőrzése</div>
                        <p className="text-[11px] text-[#8A8D98]">
                          Új firmware feltöltésekor / Chip Erase esetén az EEPROM adatok megmaradnak.
                        </p>
                      </div>
                    </label>

                    {/* WDTON Toggle */}
                    <label className="flex items-start gap-2.5 p-2.5 bg-[#0F1115] border border-[#2A2D35] rounded-xs cursor-pointer hover:border-[#3A3F4B]">
                      <input
                        type="checkbox"
                        checked={isWdtAlwaysOn}
                        onChange={(e) => {
                          setFuseState((prev) => ({
                            ...prev,
                            hfuse: setBit(prev.hfuse, 4, e.target.checked ? 0 : 1),
                          }));
                        }}
                        className="mt-0.5 rounded-xs accent-amber-400"
                      />
                      <div>
                        <div className="text-xs font-bold text-white font-mono">WDTON: Hardveres Watchdog</div>
                        <p className="text-[11px] text-[#8A8D98]">
                          A Watchdog időzítő mindig be van kapcsolva hardveresen.
                        </p>
                      </div>
                    </label>
                  </div>
                </div>
              </div>

              {/* 4. BIZTONSÁG & PROGRAMOZÁSI ZÁRAK */}
              <div className="bg-[#161920] rounded-xs border border-[#3A3F4B] p-4 shadow-[2px_2px_0px_#000]">
                <div className="flex items-center gap-2 mb-3 pb-2 border-b border-[#2A2D35]">
                  <Lock className="w-4 h-4 text-purple-400" />
                  <h3 className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                    4. Hardveres Védelem & Záróbit Módok (Lock Bits / SPIEN)
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button
                    onClick={() => setFuseState((prev) => ({ ...prev, lock: 0x0f }))}
                    className={`p-3 rounded-xs border text-left transition-all ${
                      !isLockActive
                        ? 'bg-purple-950/70 border-purple-500 text-white'
                        : 'bg-[#0F1115] border-[#2A2D35] text-[#8A8D98] hover:border-[#3A3F4B]'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-mono font-bold text-xs text-purple-300">
                      <Unlock className="w-3.5 h-3.5" />
                      <span>Mode 1: Nyitott (Alapértelmezett)</span>
                    </div>
                    <p className="text-[11px] text-[#8A8D98] mt-1">
                      Nincs korlátozás. Flash és EEPROM szabadon programozható, verifikálható és kiolvasható.
                    </p>
                  </button>

                  <button
                    onClick={() => setFuseState((prev) => ({ ...prev, lock: 0x0e }))}
                    className={`p-3 rounded-xs border text-left transition-all ${
                      fuseState.lock === 0x0e
                        ? 'bg-purple-950/70 border-purple-500 text-white'
                        : 'bg-[#0F1115] border-[#2A2D35] text-[#8A8D98] hover:border-[#3A3F4B]'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-mono font-bold text-xs text-purple-300">
                      <Lock className="w-3.5 h-3.5" />
                      <span>Mode 2: Írásvédelem</span>
                    </div>
                    <p className="text-[11px] text-[#8A8D98] mt-1">
                      További ISP / párhuzamos programozás tiltva. A kiolvasás és verifikáció engedélyezve marad.
                    </p>
                  </button>

                  <button
                    onClick={() => setFuseState((prev) => ({ ...prev, lock: 0x00 }))}
                    className={`p-3 rounded-xs border text-left transition-all ${
                      fuseState.lock === 0x00
                        ? 'bg-purple-950/70 border-purple-500 text-white'
                        : 'bg-[#0F1115] border-[#2A2D35] text-[#8A8D98] hover:border-[#3A3F4B]'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-mono font-bold text-xs text-purple-300">
                      <Lock className="w-3.5 h-3.5" />
                      <span>Mode 3: Teljes Zár (IP Védelem)</span>
                    </div>
                    <p className="text-[11px] text-[#8A8D98] mt-1">
                      Programozás és kiolvasás TELJESEN letiltva. Csak Chip Erase (teljes törlés) után írható újra.
                    </p>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 3: PROFILOK & PRESETEK                                */}
          {/* ========================================================= */}
          {activeTab === 'presets' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between bg-[#161920] p-3 rounded-xs border border-[#2A2D35] text-xs">
                <span className="text-[#8A8D98]">
                  Válassz a gyári és optimalizált hardveres profilok közül. Egy kattintással betölthető az összes FUSE és Lock bit.
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {AVR_FUSE_PRESETS.map((preset) => {
                  const isCurrent =
                    fuseState.mcu === preset.mcu &&
                    fuseState.lfuse === preset.lfuse &&
                    fuseState.hfuse === preset.hfuse &&
                    fuseState.efuse === preset.efuse &&
                    fuseState.lock === preset.lock;

                  return (
                    <div
                      key={preset.id}
                      className={`p-3.5 rounded-xs border text-left transition-all flex flex-col justify-between ${
                        isCurrent
                          ? 'bg-emerald-950/50 border-[#4ade80] shadow-[2px_2px_0px_#000]'
                          : 'bg-[#161920] border-[#3A3F4B] hover:border-[#4ade80]/60'
                      }`}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <div className="font-bold text-sm text-white font-mono flex items-center gap-1.5">
                            <span>{preset.name}</span>
                            {isCurrent && (
                              <span className="text-[9px] bg-emerald-900/80 text-[#4ade80] px-1.5 py-0.2 rounded-xs border border-emerald-500/50">
                                AKTÍV
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] font-mono text-[#8A8D98] uppercase">
                            {preset.mcu}
                          </span>
                        </div>

                        <p className="text-xs text-[#8A8D98] mt-1.5 leading-relaxed">
                          {preset.description}
                        </p>

                        <div className="flex items-center gap-1.5 flex-wrap mt-2.5">
                          {preset.tags.map((tag) => (
                            <span
                              key={tag}
                              className="text-[9px] font-mono px-1.5 py-0.2 bg-[#0F1115] text-[#C5C8D4] rounded-xs border border-[#2A2D35]"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="mt-3.5 pt-2.5 border-t border-[#2A2D35] flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 font-mono text-[10px]">
                          <span className="text-emerald-400">L:{formatHexByte(preset.lfuse)}</span>
                          <span className="text-amber-400">H:{formatHexByte(preset.hfuse)}</span>
                          <span className="text-cyan-400">E:{formatHexByte(preset.efuse)}</span>
                          <span className="text-purple-400">Lock:{formatHexByte(preset.lock)}</span>
                        </div>

                        <button
                          id={`btn-apply-preset-${preset.id}`}
                          onClick={() => handleApplyPreset(preset)}
                          className={`px-3 py-1 text-xs font-mono font-bold rounded-xs flex items-center gap-1 transition-colors shadow-[1px_1px_0px_#000] ${
                            isCurrent
                              ? 'bg-emerald-600 text-black cursor-default'
                              : 'bg-[#1A1D24] hover:bg-[#4ade80] hover:text-black text-[#E0E0E6] border border-[#3A3F4B]'
                          }`}
                        >
                          {isCurrent ? <Check className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                          <span>{isCurrent ? 'Alkalmazva' : 'Alkalmaz'}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 4: AVRDUDE PARANCSSOR GENERÁTOR                       */}
          {/* ========================================================= */}
          {activeTab === 'avrdude' && (
            <div className="space-y-4">
              <div className="bg-[#161920] rounded-xs border border-[#3A3F4B] p-4 shadow-[2px_2px_0px_#000]">
                <div className="flex items-center gap-2 mb-3 pb-2 border-b border-[#2A2D35]">
                  <Terminal className="w-4 h-4 text-cyan-400" />
                  <h3 className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                    Programozó Eszköz & Csatlakozás Beállítása
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-mono text-[#8A8D98] mb-1">
                      Programozó Típus (-c):
                    </label>
                    <select
                      value={avrdudeConfig.programmer}
                      onChange={(e) =>
                        setAvrdudeConfig((prev) => ({
                          ...prev,
                          programmer: e.target.value as any,
                        }))
                      }
                      className="w-full px-2.5 py-1.5 bg-[#0F1115] border border-[#3A3F4B] text-xs font-mono text-cyan-300 rounded-xs focus:outline-none focus:border-cyan-400"
                    >
                      <option value="usbasp">USBasp (-c usbasp)</option>
                      <option value="arduino">Arduino as ISP (-c arduino)</option>
                      <option value="avrispmkII">AVR ISP mkII (-c avrispmkII)</option>
                      <option value="atmelice_isp">Atmel-ICE ISP (-c atmelice_isp)</option>
                      <option value="stk500v1">STK500v1 (-c stk500v1)</option>
                      <option value="dragon_isp">AVR Dragon (-c dragon_isp)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-[#8A8D98] mb-1">
                      Port (-P) [Opcionális]:
                    </label>
                    <input
                      type="text"
                      placeholder="pl. COM3 vagy /dev/ttyUSB0"
                      value={avrdudeConfig.port || ''}
                      onChange={(e) =>
                        setAvrdudeConfig((prev) => ({ ...prev, port: e.target.value }))
                      }
                      className="w-full px-2.5 py-1.5 bg-[#0F1115] border border-[#3A3F4B] text-xs font-mono text-[#E0E0E6] rounded-xs focus:outline-none focus:border-cyan-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-[#8A8D98] mb-1">
                      Baud Rate (-b) [Opcionális]:
                    </label>
                    <input
                      type="text"
                      placeholder="pl. 19200 (Arduino as ISP-hez)"
                      value={avrdudeConfig.baud || ''}
                      onChange={(e) =>
                        setAvrdudeConfig((prev) => ({ ...prev, baud: e.target.value }))
                      }
                      className="w-full px-2.5 py-1.5 bg-[#0F1115] border border-[#3A3F4B] text-xs font-mono text-[#E0E0E6] rounded-xs focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                </div>
              </div>

              {/* Ready-to-run Command Output */}
              <div className="bg-[#161920] rounded-xs border border-[#3A3F4B] p-4 shadow-[2px_2px_0px_#000]">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Zap className="w-3.5 h-3.5 text-[#4ade80]" />
                    <span className="text-xs font-mono font-bold text-white uppercase">
                      Futtatható Terminál Parancs (Avrdude CLI)
                    </span>
                  </div>

                  <button
                    onClick={() =>
                      handleCopyText(generateAvrdudeCommand(fuseState, avrdudeConfig), 'avrdude-cmd')
                    }
                    className="px-3 py-1 bg-[#1A1D24] hover:bg-[#4ade80] hover:text-black text-xs font-mono font-bold rounded-xs border border-[#3A3F4B] flex items-center gap-1.5 transition-colors shadow-[1px_1px_0px_#000]"
                  >
                    {copiedKey === 'avrdude-cmd' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Másolva!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Parancs Másolása</span>
                      </>
                    )}
                  </button>
                </div>

                <pre className="p-3 bg-[#0F1115] rounded-xs border border-[#2A2D35] text-xs font-mono text-cyan-300 overflow-x-auto whitespace-pre-wrap leading-relaxed shadow-inner">
                  {generateAvrdudeCommand(fuseState, avrdudeConfig)}
                </pre>

                <div className="mt-3 text-[11px] text-[#8A8D98] space-y-1">
                  <p>
                    💡 <strong className="text-white">Hogyan égesd be:</strong> Nyiss egy terminált / parancssort, csatlakoztasd az USBasp vagy Arduino as ISP programozódat az AVR ICSP tüskesorára (MOSI, MISO, SCK, RESET, VCC, GND), majd másold be a fenti parancsot.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 5: KÓD & CONFIG EXPORT                                */}
          {/* ========================================================= */}
          {activeTab === 'export' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setExportType('platformio')}
                  className={`px-3 py-1.5 text-xs font-mono font-bold rounded-xs border transition-colors ${
                    exportType === 'platformio'
                      ? 'bg-purple-950 text-purple-300 border-purple-500'
                      : 'bg-[#161920] text-[#8A8D98] border-[#2A2D35] hover:text-[#E0E0E6]'
                  }`}
                >
                  PlatformIO (platformio.ini)
                </button>

                <button
                  onClick={() => setExportType('boardstxt')}
                  className={`px-3 py-1.5 text-xs font-mono font-bold rounded-xs border transition-colors ${
                    exportType === 'boardstxt'
                      ? 'bg-purple-950 text-purple-300 border-purple-500'
                      : 'bg-[#161920] text-[#8A8D98] border-[#2A2D35] hover:text-[#E0E0E6]'
                  }`}
                >
                  Arduino boards.txt
                </button>

                <button
                  onClick={() => setExportType('cheader')}
                  className={`px-3 py-1.5 text-xs font-mono font-bold rounded-xs border transition-colors ${
                    exportType === 'cheader'
                      ? 'bg-purple-950 text-purple-300 border-purple-500'
                      : 'bg-[#161920] text-[#8A8D98] border-[#2A2D35] hover:text-[#E0E0E6]'
                  }`}
                >
                  AVR C Fejléc (&lt;avr/fuse.h&gt;)
                </button>
              </div>

              <div className="bg-[#161920] rounded-xs border border-[#3A3F4B] p-4 shadow-[2px_2px_0px_#000]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono font-bold text-white uppercase">
                    {exportType === 'platformio'
                      ? 'PlatformIO Projekt Konfiguráció'
                      : exportType === 'boardstxt'
                      ? 'Arduino IDE Egyedi Kártya Definíció'
                      : 'AVR-GCC C/C++ Forráskód Beágyazás'}
                  </span>

                  <button
                    onClick={() => {
                      const text =
                        exportType === 'platformio'
                          ? generatePlatformIoConfig(fuseState)
                          : exportType === 'boardstxt'
                          ? generateArduinoBoardsSnippet('My_Custom_AVR', fuseState)
                          : generateAvrCHeader(fuseState);
                      handleCopyText(text, 'export-code');
                    }}
                    className="px-3 py-1 bg-[#1A1D24] hover:bg-[#4ade80] hover:text-black text-xs font-mono font-bold rounded-xs border border-[#3A3F4B] flex items-center gap-1.5 transition-colors shadow-[1px_1px_0px_#000]"
                  >
                    {copiedKey === 'export-code' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Másolva!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Kód Másolása</span>
                      </>
                    )}
                  </button>
                </div>

                <pre className="p-3 bg-[#0F1115] rounded-xs border border-[#2A2D35] text-xs font-mono text-purple-300 overflow-x-auto whitespace-pre-wrap leading-relaxed shadow-inner max-h-96">
                  {exportType === 'platformio'
                    ? generatePlatformIoConfig(fuseState)
                    : exportType === 'boardstxt'
                    ? generateArduinoBoardsSnippet('My_Custom_AVR', fuseState)
                    : generateAvrCHeader(fuseState)}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="bg-[#161920] border-t border-[#2A2D35] px-4 py-3 flex flex-wrap items-center justify-between gap-3 select-none">
          <div className="flex items-center gap-2 text-xs font-mono text-[#8A8D98]">
            <span className="hidden sm:inline">Konfiguráció összefoglaló:</span>
            <span className="text-emerald-400 font-bold">L:{formatHexByte(fuseState.lfuse)}</span>
            <span className="text-amber-400 font-bold">H:{formatHexByte(fuseState.hfuse)}</span>
            {mcuDesc.hasExtendedFuse && (
              <span className="text-cyan-400 font-bold">E:{formatHexByte(fuseState.efuse)}</span>
            )}
            <span className="text-purple-400 font-bold">Lock:{formatHexByte(fuseState.lock)}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="btn-cancel-fuse-modal"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs font-mono font-bold text-[#8A8D98] hover:text-white bg-[#1A1D24] hover:bg-[#252932] border border-[#3A3F4B] rounded-xs transition-colors shadow-[1px_1px_0px_#000]"
            >
              Mégse
            </button>
            <button
              id="btn-apply-save-fuses"
              onClick={handleSaveAndApply}
              className="px-4 py-1.5 text-xs font-mono font-bold text-black bg-[#4ade80] hover:bg-[#3ec972] border border-[#4ade80] rounded-xs flex items-center gap-1.5 transition-colors shadow-[2px_2px_0px_#000]"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>FUSE Bitek Mentése & Alkalmazása</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
