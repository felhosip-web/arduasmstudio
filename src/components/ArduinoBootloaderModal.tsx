/**
 * Arduino & AVR Dedicated Visual Bootloader Editor & Simulator Modal
 * Interactive flash cartography, live boot sequence stepper, Optiboot C generator, Intel HEX synthesizer & 1-click emulator burning.
 * (c) 2026 AI Studio ArduASM
 */

import React, { useState, useMemo, useEffect } from 'react';
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
  Flame,
  CheckCircle2,
  Download,
  Play,
  Pause,
  StepForward,
  Radio,
  ArrowRight,
  Activity,
  Info,
  RefreshCw,
  SlidersHorizontal,
  ChevronRight,
  Layers2,
  Gauge,
  Tv,
} from 'lucide-react';
import { AvrFuseState, AvrMcuFuseType, ProgramBlock } from '../types';
import {
  BootloaderType,
  BootloaderSizeOption,
  ArduinoBootloaderConfig,
  BOOTLOADER_PRESETS,
  MCU_BOOTLOADER_SPECS,
  calculateFlashPartition,
  calculateUartBaudTiming,
  analyzeBootloaderHazards,
  generateBootloaderCSource,
  generateBootloaderIntelHex,
  generateBootloaderDisassembly,
  generateBootloaderAvrdudeCommand,
  generateCustomBoardsTxt,
} from '../utils/avrBootloaderCalculator';

interface ArduinoBootloaderModalProps {
  isOpen: boolean;
  onClose: () => void;
  fuses: AvrFuseState;
  onUpdateFuses: (updater: (prev: AvrFuseState) => AvrFuseState) => void;
  blocks?: ProgramBlock[];
  onBurnToEmulatorFlash?: (bootloaderHex: string, bootStartAddress: number) => void;
  onOpenAvrFuses?: () => void;
}

type TabKey = 'cartography' | 'config' | 'simulator' | 'source_hex' | 'burn_tools';

// Boot Simulator State Steps
export type BootSimStep =
  | 'POWER_ON'
  | 'FETCH_BOOTRST'
  | 'VECTOR_BRANCH'
  | 'MCUSR_EVAL'
  | 'LED_STROBE'
  | 'UART_INIT'
  | 'STK500_LISTEN'
  | 'STK500_PROG_PAGE'
  | 'TIMEOUT_EXPIRED'
  | 'JUMP_TO_APP'
  | 'APP_RUNNING';

export const ArduinoBootloaderModal: React.FC<ArduinoBootloaderModalProps> = ({
  isOpen,
  onClose,
  fuses,
  onUpdateFuses,
  blocks = [],
  onBurnToEmulatorFlash,
  onOpenAvrFuses,
}) => {
  // Active Tab
  const [activeTab, setActiveTab] = useState<TabKey>('cartography');

  // Bootloader State Configuration
  const [config, setConfig] = useState<ArduinoBootloaderConfig>(() => ({
    type: 'optiboot',
    mcu: fuses.mcu || 'atmega328p',
    name: 'Optiboot 8.2 (Standard Uno / Nano)',
    sizeBytes: 512,
    bootResetVector: (fuses.hfuse & 0x01) === 0 ? 'bootloader' : 'application',
    baudRate: 115200,
    doubleSpeed: true,
    timeoutMs: 1000,
    autoExitOnTimeout: true,
    ledPin: 'PB5 (D13)',
    ledFlashes: 3,
    ledPulseMs: 40,
    uartPort: 0,
    clockHz: 16000000,
    supportEeprom: false,
    bigboot: false,
    watchdogRescue: true,
    doubleTapReset: false,
    magicResetWord: false,
    vectorRelocation: false,
    softUart: false,
    bootloaderWriteProtect: true,
    appWriteProtect: false,
  }));

  // Copy state
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [burnSuccessMessage, setBurnSuccessMessage] = useState<string | null>(null);

  // Source view sub-tab
  const [sourceViewType, setSourceViewType] = useState<'hex' | 'c_source' | 'disasm'>('hex');

  // Tooling sub-tab
  const [toolingType, setToolingType] = useState<'avrdude' | 'boardstxt' | 'platformio'>('avrdude');
  const [avrdudeProgrammer, setAvrdudeProgrammer] = useState<string>('usbasp');
  const [avrdudePort, setAvrdudePort] = useState<string>('');

  // -------------------------------------------------------------------------
  // Live Boot Simulator States
  // -------------------------------------------------------------------------
  const [simStep, setSimStep] = useState<BootSimStep>('POWER_ON');
  const [simIsPlaying, setSimIsPlaying] = useState<boolean>(false);
  const [simTriggerType, setSimTriggerType] = useState<'POR' | 'DTR' | 'WDT'>('DTR');
  const [simTimeoutCountdownMs, setSimTimeoutCountdownMs] = useState<number>(config.timeoutMs);
  const [simLedState, setSimLedState] = useState<boolean>(false);
  const [simStkFrames, setSimStkFrames] = useState<{ time: string; dir: 'TX' | 'RX'; msg: string; hex: string }[]>([]);
  const [simRegisters, setSimRegisters] = useState<{
    pc: string;
    mcusr: number;
    sp: string;
    ubrr: number;
    ucsr0b: number;
    ivsel: boolean;
  }>({
    pc: '0x0000',
    mcusr: 0x00,
    sp: '0x08FF',
    ubrr: 16,
    ucsr0b: 0x00,
    ivsel: false,
  });

  // Calculate Flash Partitions
  const partition = useMemo(() => {
    return calculateFlashPartition(config.mcu, config.sizeBytes, config.bootResetVector);
  }, [config.mcu, config.sizeBytes, config.bootResetVector]);

  // Calculate UART Timing
  const uartTiming = useMemo(() => {
    return calculateUartBaudTiming(config.baudRate, config.clockHz, config.doubleSpeed);
  }, [config.baudRate, config.clockHz, config.doubleSpeed]);

  // Analyze Hazards
  const hazards = useMemo(() => {
    return analyzeBootloaderHazards(config, fuses);
  }, [config, fuses]);

  // Generated Outputs
  const generatedCSource = useMemo(() => generateBootloaderCSource(config), [config]);
  const generatedHex = useMemo(() => generateBootloaderIntelHex(config), [config]);
  const generatedDisasm = useMemo(() => generateBootloaderDisassembly(config), [config]);
  const generatedAvrdude = useMemo(
    () => generateBootloaderAvrdudeCommand(config, fuses, avrdudeProgrammer, avrdudePort),
    [config, fuses, avrdudeProgrammer, avrdudePort]
  );
  const generatedBoardsTxt = useMemo(() => generateCustomBoardsTxt(config, fuses), [config, fuses]);

  // Estimate user application sketch footprint
  const userSketchEstimatedBytes = useMemo(() => {
    return Math.max(128, blocks.length * 48);
  }, [blocks]);

  // Handle preset selection
  const handleSelectPreset = (preset: (typeof BOOTLOADER_PRESETS)[0]) => {
    setConfig((prev) => ({
      ...prev,
      type: preset.id,
      mcu: preset.mcu,
      name: preset.name,
      sizeBytes: preset.sizeBytes,
      bootResetVector: preset.bootrstBit === 0 ? 'bootloader' : 'application',
      baudRate: preset.defaultBaud,
      timeoutMs: preset.timeoutMs,
      ledPin: preset.ledPin,
      ledFlashes: preset.ledFlashes,
      supportEeprom: preset.supportEeprom,
      bigboot: preset.bigboot,
      watchdogRescue: preset.watchdogRescue,
      doubleTapReset: preset.doubleTapReset,
    }));

    // Auto-update Fuses if user wants preset values
    onUpdateFuses((prev) => ({
      ...prev,
      mcu: preset.mcu,
      lfuse: preset.lfuse,
      hfuse: preset.hfuse,
      efuse: preset.efuse,
      lock: preset.lock,
    }));
  };

  // Sync Fuses with Bootloader Configuration
  const handleSyncFusesWithBootloader = () => {
    const spec = MCU_BOOTLOADER_SPECS[config.mcu] || MCU_BOOTLOADER_SPECS.atmega328p;
    const sizeInfo = spec.bootszMap[config.sizeBytes] || spec.bootszMap[512];
    const bootszVal = sizeInfo.bootszVal; // 0..3

    onUpdateFuses((prev) => {
      let newHfuse = prev.hfuse;
      // Update BOOTRST (bit 0): 0 if bootloader, 1 if application
      if (config.bootResetVector === 'bootloader') {
        newHfuse &= ~0x01; // Clear bit 0 (programmed)
      } else {
        newHfuse |= 0x01; // Set bit 0 (unprogrammed)
      }

      // Update BOOTSZ1:0 (bits 2:1)
      newHfuse &= ~0x06; // Clear bits 1 and 2
      newHfuse |= (bootszVal & 0x03) << 1;

      // Update Lock bits for bootloader protection
      let newLock = prev.lock;
      if (config.bootloaderWriteProtect) {
        newLock &= ~0x30; // BLB12=0, BLB11=0 (bootloader write protected from SPM)
      } else {
        newLock |= 0x30;
      }

      return {
        ...prev,
        hfuse: newHfuse,
        lock: newLock,
      };
    });

    setBurnSuccessMessage('FUSE Bitek (BOOTSZ1:0, BOOTRST & Lock Bitek) sikeresen szinkronizálva!');
    setTimeout(() => setBurnSuccessMessage(null), 3500);
  };

  // Copy helper
  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Download helper
  const handleDownloadFile = (content: string, filename: string, mimeType = 'text/plain') => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Burn directly into visual emulator
  const handleBurnToEmulator = () => {
    if (onBurnToEmulatorFlash) {
      const bootStartAddr = parseInt(partition.bootStartAddressHex, 16);
      onBurnToEmulatorFlash(generatedHex, bootStartAddr);
    }
    handleSyncFusesWithBootloader();
    setBurnSuccessMessage(
      `Bootloader (${config.name}) sikeresen beégetve az emulátor Flash memóriájába (${partition.bootStartAddressHex})!`
    );
    setTimeout(() => setBurnSuccessMessage(null), 4000);
  };

  // -------------------------------------------------------------------------
  // Live Simulator Logic
  // -------------------------------------------------------------------------
  const handleResetSimulator = (trigger: 'POR' | 'DTR' | 'WDT') => {
    setSimTriggerType(trigger);
    setSimStep('POWER_ON');
    setSimTimeoutCountdownMs(config.timeoutMs);
    setSimLedState(false);
    setSimStkFrames([]);
    const mcusrVal = trigger === 'POR' ? 0x01 : trigger === 'DTR' ? 0x02 : 0x08;
    setSimRegisters({
      pc: '0x0000 (Reset Vektor)',
      mcusr: mcusrVal,
      sp: '0x08FF (RAMEND)',
      ubrr: uartTiming.ubrr,
      ucsr0b: 0x00,
      ivsel: config.vectorRelocation,
    });
  };

  const handleStepSimulator = () => {
    switch (simStep) {
      case 'POWER_ON':
        setSimStep('FETCH_BOOTRST');
        setSimRegisters((r) => ({
          ...r,
          pc: '0x0000 -> FUSE BOOTRST Check',
        }));
        break;

      case 'FETCH_BOOTRST':
        if (config.bootResetVector === 'bootloader') {
          setSimStep('VECTOR_BRANCH');
          setSimRegisters((r) => ({
            ...r,
            pc: partition.bootStartAddressHex,
          }));
        } else {
          setSimStep('JUMP_TO_APP');
          setSimRegisters((r) => ({
            ...r,
            pc: '0x0000 (Alkalmazás Indul)',
          }));
        }
        break;

      case 'VECTOR_BRANCH':
        setSimStep('MCUSR_EVAL');
        setSimRegisters((r) => ({
          ...r,
          mcusr: config.watchdogRescue ? 0x00 : r.mcusr,
          pc: `${partition.bootStartAddressHex} + 0x0008`,
        }));
        break;

      case 'MCUSR_EVAL':
        if (config.ledPin !== 'NONE' && config.ledFlashes > 0) {
          setSimStep('LED_STROBE');
          setSimLedState(true);
        } else {
          setSimStep('UART_INIT');
        }
        break;

      case 'LED_STROBE':
        setSimLedState(false);
        setSimStep('UART_INIT');
        setSimRegisters((r) => ({
          ...r,
          ucsr0b: 0x18, // RXEN0 | TXEN0
          pc: `${partition.bootStartAddressHex} + 0x001C`,
        }));
        break;

      case 'UART_INIT':
        setSimStep('STK500_LISTEN');
        if (simTriggerType === 'DTR') {
          // Add simulated STK_GET_SYNC packet
          setSimStkFrames([
            {
              time: '0.04s',
              dir: 'RX',
              msg: 'PC (Arduino IDE) -> STK_GET_SYNC (0x30 0x20)',
              hex: '30 20',
            },
          ]);
        }
        break;

      case 'STK500_LISTEN':
        if (simTriggerType === 'DTR') {
          setSimStep('STK500_PROG_PAGE');
          setSimStkFrames((prev) => [
            ...prev,
            {
              time: '0.05s',
              dir: 'TX',
              msg: 'Bootloader -> STK_INSYNC + STK_OK (0x14 0x10)',
              hex: '14 10',
            },
            {
              time: '0.12s',
              dir: 'RX',
              msg: 'PC -> STK_PROG_PAGE (Flash Lap Írás 128B)',
              hex: '64 00 80 46 ... 20',
            },
            {
              time: '0.16s',
              dir: 'TX',
              msg: 'Bootloader -> STK_INSYNC + STK_OK (Flash Kiírva)',
              hex: '14 10',
            },
          ]);
        } else {
          setSimStep('TIMEOUT_EXPIRED');
        }
        break;

      case 'STK500_PROG_PAGE':
      case 'TIMEOUT_EXPIRED':
        setSimStep('JUMP_TO_APP');
        setSimRegisters((r) => ({
          ...r,
          pc: '0x0000',
          ucsr0b: 0x00,
        }));
        break;

      case 'JUMP_TO_APP':
        setSimStep('APP_RUNNING');
        break;

      case 'APP_RUNNING':
        handleResetSimulator(simTriggerType);
        break;
    }
  };

  // Auto play animation loop
  useEffect(() => {
    let timer: any = null;
    if (simIsPlaying && isOpen && activeTab === 'simulator') {
      timer = setInterval(() => {
        handleStepSimulator();
      }, 700);
    }
    return () => clearInterval(timer);
  }, [simIsPlaying, simStep, isOpen, activeTab, simTriggerType, config]);

  if (!isOpen) return null;

  return (
    <div
      id="arduino-bootloader-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-xs font-mono select-none"
    >
      <div className="relative w-full max-w-6xl max-h-[94vh] flex flex-col bg-[#0F1217] border-2 border-amber-500/60 rounded-xs shadow-[0_0_40px_rgba(245,158,11,0.25)] text-[#E4E7EB] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* ================================================================= */}
        {/* HEADER BAR */}
        {/* ================================================================= */}
        <div className="flex items-center justify-between px-4 py-3 bg-[#161B22] border-b border-[#2D333B] shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xs bg-amber-950/80 border border-amber-500/50 text-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.3)]">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm sm:text-base font-black tracking-wider text-white uppercase flex items-center gap-2">
                  <span>Arduino / AVR Vizuális Bootloader Stúdió</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-xs bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    Optiboot & STK500 Engine
                  </span>
                </h2>
              </div>
              <p className="text-[11px] text-[#8B949E] mt-0.5">
                Flash partícionálás ({partition.totalFlashBytes / 1024} KB), BOOTSZ/BOOTRST számítás, élő STK500 szimuláció & C/HEX generálás
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Quick Sync Button */}
            <button
              id="btn-sync-fuses-header"
              onClick={handleSyncFusesWithBootloader}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-amber-950/80 hover:bg-amber-900 text-amber-300 border border-amber-500/50 rounded-xs transition-colors shadow-[2px_2px_0px_#000] cursor-pointer"
              title="Azonnali FUSE bitek (BOOTSZ, BOOTRST, Lock) szinkronizálása a mikrokontrollerrel"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>FUSE Szinkronizálás</span>
            </button>

            <button
              id="btn-close-bootloader-modal"
              onClick={onClose}
              className="p-1.5 rounded-xs text-[#8B949E] hover:text-white hover:bg-[#21262D] border border-transparent hover:border-[#30363D] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ================================================================= */}
        {/* TOP STATUS RIBBON */}
        {/* ================================================================= */}
        <div className="flex items-center justify-between px-4 py-2 bg-[#0B0D11] border-b border-[#21262D] text-xs flex-wrap gap-2 shrink-0">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="flex items-center gap-1 text-[#8B949E]">
              <HardDrive className="w-3.5 h-3.5 text-amber-400" />
              <span>Flash:</span>
              <strong className="text-white">{partition.totalFlashBytes / 1024} KB</strong>
            </span>
            <span className="text-[#30363D]">|</span>
            <span className="flex items-center gap-1 text-[#8B949E]">
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              <span>Bootloader Cím:</span>
              <strong className="text-cyan-300 font-mono">{partition.bootStartAddressHex}</strong>
              <span className="text-[10px] text-[#8B949E]">({partition.bootSizeBytes} Bájt)</span>
            </span>
            <span className="text-[#30363D]">|</span>
            <span className="flex items-center gap-1 text-[#8B949E]">
              <Zap className="w-3.5 h-3.5 text-emerald-400" />
              <span>Reset Vektor:</span>
              <strong className={config.bootResetVector === 'bootloader' ? 'text-emerald-400' : 'text-purple-400'}>
                {config.bootResetVector === 'bootloader' ? `Bootloader (${partition.bootStartAddressHex})` : 'App (0x0000)'}
              </strong>
            </span>
            <span className="text-[#30363D]">|</span>
            <span className="flex items-center gap-1 text-[#8B949E]">
              <Radio className="w-3.5 h-3.5 text-amber-400" />
              <span>Baud:</span>
              <strong className="text-white">{config.baudRate} bps</strong>
              <span className={`text-[10px] ${uartTiming.isReliable ? 'text-emerald-400' : 'text-red-400'}`}>
                ({uartTiming.errorPercent}%)
              </span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            {hazards.some((h) => h.severity === 'danger') ? (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-xs bg-red-950/80 text-red-400 border border-red-500/50 text-[10px] font-bold animate-pulse">
                <AlertTriangle className="w-3 h-3" />
                {hazards.filter((h) => h.severity === 'danger').length} Kritikus Konfigurációs Eltérés!
              </span>
            ) : (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-xs bg-emerald-950/80 text-emerald-400 border border-emerald-500/50 text-[10px] font-bold">
                <CheckCircle2 className="w-3 h-3" />
                Hardware FUSE Szinkronban
              </span>
            )}
          </div>
        </div>

        {/* ================================================================= */}
        {/* NAVIGATION TABS */}
        {/* ================================================================= */}
        <div className="flex items-center px-4 bg-[#161B22] border-b border-[#2D333B] overflow-x-auto shrink-0 gap-1">
          {[
            { id: 'cartography', label: 'Flash Memóriatérkép & Partíciók', icon: HardDrive },
            { id: 'config', label: 'Konfigurációs Stúdió & Presetek', icon: SlidersHorizontal },
            { id: 'simulator', label: 'Élő Boot Szekvencia Szimulátor', icon: Activity },
            { id: 'source_hex', label: 'Forráskód & Intel HEX Disassembly', icon: FileCode },
            { id: 'burn_tools', label: 'Égetés & Eszközök (avrdude / boards.txt)', icon: Flame },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`tab-bootloader-${tab.id}`}
                onClick={() => setActiveTab(tab.id as TabKey)}
                className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-bold transition-all border-b-2 whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'border-amber-400 text-amber-300 bg-[#0F1217]'
                    : 'border-transparent text-[#8B949E] hover:text-white hover:bg-[#21262D]'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-amber-400' : 'text-[#8B949E]'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Burn Success Notification Toast */}
        {burnSuccessMessage && (
          <div className="px-4 py-2 bg-emerald-950/90 border-b border-emerald-500 text-emerald-300 text-xs font-bold flex items-center justify-between animate-in slide-in-from-top-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>{burnSuccessMessage}</span>
            </div>
            <button onClick={() => setBurnSuccessMessage(null)} className="text-emerald-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 1: FLASH CARTOGRAPHY & PARTITIONING */}
        {/* ================================================================= */}
        {activeTab === 'cartography' && (
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Visual Flash Gauge */}
            <div className="p-4 bg-[#161B22] border border-[#30363D] rounded-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <HardDrive className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    ATmega328P Flash Memória Térkép ({partition.totalFlashBytes.toLocaleString()} Bájt / 16K Szó)
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-xs bg-emerald-500/80 border border-emerald-400 inline-block" />
                    <span className="text-[#8B949E]">
                      Alkalmazás: <strong className="text-emerald-300">{partition.appSizeBytes.toLocaleString()} B</strong> ({partition.appPercentage}%)
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-xs bg-amber-500/80 border border-amber-400 inline-block" />
                    <span className="text-[#8B949E]">
                      Bootloader: <strong className="text-amber-300">{partition.bootSizeBytes.toLocaleString()} B</strong> ({partition.bootPercentage}%)
                    </span>
                  </div>
                </div>
              </div>

              {/* Progress Bar Container */}
              <div className="relative w-full h-12 bg-[#0B0D11] border-2 border-[#30363D] rounded-xs flex overflow-hidden shadow-inner">
                {/* Application Section */}
                <div
                  style={{ width: `${partition.appPercentage}%` }}
                  className="h-full bg-emerald-950/80 border-r-2 border-amber-500/80 relative flex items-center justify-between px-3 group transition-all"
                >
                  <div className="flex flex-col">
                    <span className="text-[11px] font-bold text-emerald-300">Felhasználói Alkalmazás Kód (RWW Zóna)</span>
                    <span className="text-[10px] text-emerald-500 font-mono">
                      {partition.appStartAddressHex} - {partition.appEndAddressHex} ({partition.appPages} Lap)
                    </span>
                  </div>

                  {/* Sketch Footprint Overlay Indicator */}
                  <div className="text-right">
                    <span className="text-[9px] px-1.5 py-0.5 rounded-xs bg-emerald-900/80 text-emerald-200 border border-emerald-400/40">
                      Jelenlegi vázlat: ~{userSketchEstimatedBytes} B (
                      {((userSketchEstimatedBytes / partition.appSizeBytes) * 100).toFixed(1)}%)
                    </span>
                  </div>
                </div>

                {/* Bootloader Section */}
                <div
                  style={{ width: `${Math.max(5, partition.bootPercentage)}%` }}
                  className="h-full bg-amber-950/90 border-l border-amber-400/60 relative flex flex-col justify-center px-2 text-right transition-all"
                >
                  <span className="text-[11px] font-bold text-amber-300 truncate">Bootloader (NRWW)</span>
                  <span className="text-[10px] text-amber-400 font-mono truncate">
                    {partition.bootStartAddressHex} ({partition.bootSizeBytes}B)
                  </span>
                </div>
              </div>

              {/* Memory Address Ruler */}
              <div className="flex items-center justify-between text-[10px] text-[#8B949E] font-mono px-1">
                <span>0x0000 (IVT Vektortábla)</span>
                <span>0x3E00 (7.75 KB)</span>
                <span>0x7000 (NRWW Határ)</span>
                <span className="text-amber-400 font-bold">{partition.bootStartAddressHex} (Boot Start)</span>
                <span>0x7FFF (Flash Vége)</span>
              </div>
            </div>

            {/* Interactive Bootloader Size & Reset Vector Controls */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Box 1: Boot Size Selector */}
              <div className="p-4 bg-[#161B22] border border-[#30363D] rounded-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-bold text-white uppercase">Bootloader Méret (BOOTSZ1:0 FUSE)</span>
                  </div>
                  <span className="text-xs font-mono font-bold text-amber-300">
                    BOOTSZ = {partition.bootszFuseBits.join('')}b
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { bytes: 512, words: 256, addr: '0x7E00', desc: 'Optiboot', bits: '11' },
                    { bytes: 1024, words: 512, addr: '0x7C00', desc: 'MidBoot', bits: '10' },
                    { bytes: 2048, words: 1024, addr: '0x7800', desc: 'ATmegaBOOT', bits: '01' },
                    { bytes: 4096, words: 2048, addr: '0x7000', desc: 'Full/USB', bits: '00' },
                  ].map((opt) => {
                    const isSelected = config.sizeBytes === opt.bytes;
                    return (
                      <button
                        key={opt.bytes}
                        onClick={() =>
                          setConfig((prev) => ({
                            ...prev,
                            sizeBytes: opt.bytes as BootloaderSizeOption,
                          }))
                        }
                        className={`p-2.5 rounded-xs border text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-amber-950/80 border-amber-400 text-white shadow-[0_0_10px_rgba(245,158,11,0.3)]'
                            : 'bg-[#0B0D11] border-[#30363D] text-[#8B949E] hover:border-[#8B949E] hover:text-white'
                        }`}
                      >
                        <div className="text-xs font-bold text-white flex items-center justify-between">
                          <span>{opt.bytes} Bájt</span>
                          <span className="text-[9px] font-mono text-amber-400">{opt.bits}b</span>
                        </div>
                        <div className="text-[10px] font-mono text-amber-300/90 mt-0.5">{opt.addr}</div>
                        <div className="text-[9px] text-[#8B949E] mt-0.5">{opt.desc} ({opt.words}W)</div>
                      </button>
                    );
                  })}
                </div>

                <p className="text-[11px] text-[#8B949E] leading-relaxed">
                  A mikrokontroller hardveresen elkülönített <strong>NRWW (Non-Read-While-Write)</strong> területe biztosítja, hogy a bootloader saját maga futtatása közben törölje és újraírja az alkalmazás flash memóriáját az <code>SPM</code> utasítással.
                </p>
              </div>

              {/* Box 2: Boot Reset Vector (BOOTRST) */}
              <div className="p-4 bg-[#161B22] border border-[#30363D] rounded-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-bold text-white uppercase">Reset Indítási Vektor (BOOTRST FUSE)</span>
                  </div>
                  <span className="text-xs font-mono font-bold text-emerald-300">
                    BOOTRST = {partition.bootrstFuseBit}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setConfig((prev) => ({ ...prev, bootResetVector: 'bootloader' }))}
                    className={`p-3 rounded-xs border text-left transition-all cursor-pointer ${
                      config.bootResetVector === 'bootloader'
                        ? 'bg-amber-950/80 border-amber-400 text-white shadow-[0_0_10px_rgba(245,158,11,0.3)]'
                        : 'bg-[#0B0D11] border-[#30363D] text-[#8B949E] hover:border-[#8B949E] hover:text-white'
                    }`}
                  >
                    <div className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                      <Cpu className="w-3.5 h-3.5" />
                      <span>Bootloader Indítás</span>
                    </div>
                    <div className="text-[10px] font-mono text-white mt-1">PC = {partition.bootStartAddressHex} (BOOTRST=0)</div>
                    <p className="text-[10px] text-[#8B949E] mt-1 leading-tight">
                      Bekapcsoláskor a CPU a bootloader címére ugrik, ellenőrzi a soros portot, majd timeout után indul az app.
                    </p>
                  </button>

                  <button
                    onClick={() => setConfig((prev) => ({ ...prev, bootResetVector: 'application' }))}
                    className={`p-3 rounded-xs border text-left transition-all cursor-pointer ${
                      config.bootResetVector === 'application'
                        ? 'bg-purple-950/80 border-purple-400 text-white shadow-[0_0_10px_rgba(168,85,247,0.3)]'
                        : 'bg-[#0B0D11] border-[#30363D] text-[#8B949E] hover:border-[#8B949E] hover:text-white'
                    }`}
                  >
                    <div className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5" />
                      <span>Bare-Metal (0x0000)</span>
                    </div>
                    <div className="text-[10px] font-mono text-white mt-1">PC = 0x0000 (BOOTRST=1)</div>
                    <p className="text-[10px] text-[#8B949E] mt-1 leading-tight">
                      Azonnali 0 ms indulás az alkalmazás kezdetén. Csak hardveres ISP programozóval tölthető újra.
                    </p>
                  </button>
                </div>

                <div className="p-2.5 rounded-xs bg-[#0B0D11] border border-[#2D333B] flex items-center justify-between text-xs">
                  <span className="text-[#8B949E]">Lock Bit Írásvédelem (BLB12/BLB11):</span>
                  <button
                    onClick={() =>
                      setConfig((prev) => ({
                        ...prev,
                        bootloaderWriteProtect: !prev.bootloaderWriteProtect,
                      }))
                    }
                    className={`px-2 py-0.5 rounded-xs font-bold border flex items-center gap-1 transition-all ${
                      config.bootloaderWriteProtect
                        ? 'bg-emerald-950 text-emerald-300 border-emerald-500/50'
                        : 'bg-red-950 text-red-400 border-red-500/50'
                    }`}
                  >
                    {config.bootloaderWriteProtect ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                    <span>{config.bootloaderWriteProtect ? 'Védett (SPM Tiltva)' : 'Írható (Kockázat)'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Diagnostic Hazards Section */}
            {hazards.length > 0 && (
              <div className="p-3 bg-[#161B22] border border-[#30363D] rounded-xs space-y-2">
                <div className="text-xs font-bold text-white uppercase flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-amber-400" />
                  <span>Hardveres Érvényességi & Biztonsági Diagnosztika</span>
                </div>
                <div className="space-y-1.5">
                  {hazards.map((hazard) => (
                    <div
                      key={hazard.id}
                      className={`p-2.5 rounded-xs border text-xs flex items-start gap-2.5 ${
                        hazard.severity === 'danger'
                          ? 'bg-red-950/40 border-red-500/60 text-red-200'
                          : hazard.severity === 'warning'
                          ? 'bg-amber-950/40 border-amber-500/60 text-amber-200'
                          : 'bg-cyan-950/40 border-cyan-500/60 text-cyan-200'
                      }`}
                    >
                      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <div className="font-bold">{hazard.title}</div>
                        <p className="text-[11px] opacity-90 mt-0.5">{hazard.message}</p>
                        {hazard.remedy && (
                          <div className="text-[10px] font-bold text-amber-400 mt-1 flex items-center gap-1">
                            <span>Javítási javaslat:</span>
                            <span>{hazard.remedy}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 2: CONFIGURATION STUDIO & PRESETS */}
        {/* ================================================================= */}
        {activeTab === 'config' && (
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Presets Grid */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white uppercase flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>Hivatalos és Egyedi Arduino Bootloader Előbeállítások</span>
                </span>
                <span className="text-[11px] text-[#8B949E]">Kattints egy kártyára a betöltéshez</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                {BOOTLOADER_PRESETS.map((preset) => {
                  const isSelected = config.type === preset.id;
                  return (
                    <button
                      key={preset.id}
                      onClick={() => handleSelectPreset(preset)}
                      className={`p-3 rounded-xs border text-left transition-all cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? 'bg-amber-950/70 border-amber-400 text-white shadow-[0_0_12px_rgba(245,158,11,0.3)]'
                          : 'bg-[#161B22] border-[#30363D] text-[#8B949E] hover:border-amber-500/50 hover:text-white'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-xs font-bold text-white">{preset.name.split(' (')[0]}</span>
                          <span className="text-[9px] px-1.5 py-0.5 rounded-xs bg-amber-500/20 text-amber-300 border border-amber-500/40">
                            {preset.badge}
                          </span>
                        </div>
                        <p className="text-[10px] text-[#8B949E] mt-1 line-clamp-2">{preset.tagline}</p>
                      </div>

                      <div className="mt-3 pt-2 border-t border-[#30363D] flex items-center justify-between text-[10px] font-mono">
                        <span className="text-cyan-400">{preset.sizeBytes} B</span>
                        <span className="text-amber-400">{preset.defaultBaud} bps</span>
                        <span className="text-emerald-400">{preset.ledPin.split(' ')[0]}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Detailed Parameters Editor */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Column 1: UART Communication */}
              <div className="p-4 bg-[#161B22] border border-[#30363D] rounded-xs space-y-3">
                <div className="text-xs font-bold text-white uppercase flex items-center gap-2">
                  <Radio className="w-4 h-4 text-cyan-400" />
                  <span>Soros UART & Baud Sebesség</span>
                </div>

                <div className="space-y-2">
                  <div>
                    <label className="text-[11px] text-[#8B949E] block mb-1">Átviteli Sebesség (Baud Rate):</label>
                    <select
                      value={config.baudRate}
                      onChange={(e) => setConfig((prev) => ({ ...prev, baudRate: Number(e.target.value) }))}
                      className="w-full px-2.5 py-1.5 text-xs bg-[#0B0D11] border border-[#30363D] rounded-xs text-white focus:border-amber-400 focus:outline-hidden font-mono"
                    >
                      {[9600, 19200, 38400, 57600, 115200, 250000, 500000, 1000000].map((b) => (
                        <option key={b} value={b}>
                          {b.toLocaleString()} bps {b === 115200 ? '(Uno R3 Alapértelmezett)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-xs bg-[#0B0D11] border border-[#2D333B] text-xs">
                    <span className="text-[#8B949E]">Double Speed Mód (U2X0):</span>
                    <button
                      onClick={() => setConfig((prev) => ({ ...prev, doubleSpeed: !prev.doubleSpeed }))}
                      className={`px-2 py-0.5 rounded-xs font-bold border transition-colors ${
                        config.doubleSpeed
                          ? 'bg-cyan-950 text-cyan-300 border-cyan-500/50'
                          : 'bg-[#161B22] text-[#8B949E] border-[#30363D]'
                      }`}
                    >
                      {config.doubleSpeed ? 'U2X0 = 1 (2x)' : 'U2X0 = 0 (1x)'}
                    </button>
                  </div>

                  <div className="p-2 rounded-xs bg-[#0B0D11] border border-[#2D333B] text-[11px] font-mono space-y-1">
                    <div className="flex justify-between text-[#8B949E]">
                      <span>UBRR0 Regiszter:</span>
                      <strong className="text-white">0x{uartTiming.ubrr.toString(16).toUpperCase().padStart(2, '0')} ({uartTiming.ubrr})</strong>
                    </div>
                    <div className="flex justify-between text-[#8B949E]">
                      <span>Valós Baud Sebesség:</span>
                      <strong className="text-cyan-300">{uartTiming.actualBaud.toLocaleString()} bps</strong>
                    </div>
                    <div className="flex justify-between text-[#8B949E]">
                      <span>Eltérés / Hiba:</span>
                      <strong className={uartTiming.isReliable ? 'text-emerald-400' : 'text-red-400'}>
                        {uartTiming.errorPercent}% {uartTiming.isReliable ? '(Stabil)' : '(Kritikus!)'}
                      </strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* Column 2: Status LED Strobe */}
              <div className="p-4 bg-[#161B22] border border-[#30363D] rounded-xs space-y-3">
                <div className="text-xs font-bold text-white uppercase flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-400" />
                  <span>Státusz LED Villogás Animáció</span>
                </div>

                <div className="space-y-2">
                  <div>
                    <label className="text-[11px] text-[#8B949E] block mb-1">LED Kivezetés (Pin):</label>
                    <select
                      value={config.ledPin}
                      onChange={(e) => setConfig((prev) => ({ ...prev, ledPin: e.target.value }))}
                      className="w-full px-2.5 py-1.5 text-xs bg-[#0B0D11] border border-[#30363D] rounded-xs text-white focus:border-amber-400 focus:outline-hidden font-mono"
                    >
                      <option value="PB5 (D13)">PB5 / Arduino Pin 13 (Uno / Nano)</option>
                      <option value="PB7 (D13)">PB7 / Arduino Pin 13 (Mega 2560)</option>
                      <option value="PD5 (RXLED)">PD5 / RXLED (Leonardo / Micro)</option>
                      <option value="NONE">Nincs LED (0 bájt memóriamegtakarítás)</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] text-[#8B949E] block mb-1">Villanások Száma:</label>
                      <select
                        value={config.ledFlashes}
                        onChange={(e) => setConfig((prev) => ({ ...prev, ledFlashes: Number(e.target.value) }))}
                        className="w-full px-2 py-1.5 text-xs bg-[#0B0D11] border border-[#30363D] rounded-xs text-white focus:border-amber-400 focus:outline-hidden font-mono"
                      >
                        <option value={0}>0 (Néma indítás)</option>
                        <option value={1}>1 (Gyors impulzus)</option>
                        <option value={2}>2 (Kettős villanás)</option>
                        <option value={3}>3 (Optiboot klasszikus)</option>
                        <option value={5}>5 (Hosszú jelzés)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] text-[#8B949E] block mb-1">Impulzus Idő:</label>
                      <select
                        value={config.ledPulseMs}
                        onChange={(e) => setConfig((prev) => ({ ...prev, ledPulseMs: Number(e.target.value) }))}
                        className="w-full px-2 py-1.5 text-xs bg-[#0B0D11] border border-[#30363D] rounded-xs text-white focus:border-amber-400 focus:outline-hidden font-mono"
                      >
                        <option value={20}>20 ms (Strobe)</option>
                        <option value={40}>40 ms (Standard)</option>
                        <option value={80}>80 ms (Lassú)</option>
                      </select>
                    </div>
                  </div>

                  {/* Interactive LED Preview Box */}
                  <div className="p-3 bg-[#0B0D11] border border-[#2D333B] rounded-xs flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-4 h-4 rounded-full border transition-all ${
                          simLedState || config.ledFlashes > 0
                            ? 'bg-amber-400 border-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.8)]'
                            : 'bg-[#21262D] border-[#30363D]'
                        }`}
                      />
                      <span className="text-xs text-white font-mono">{config.ledPin.split(' ')[0]}</span>
                    </div>
                    <span className="text-[10px] text-[#8B949E]">
                      {config.ledFlashes > 0 ? `${config.ledFlashes}x ${config.ledPulseMs}ms` : 'Kikapcsolva'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Column 3: Timeout & Feature Flags */}
              <div className="p-4 bg-[#161B22] border border-[#30363D] rounded-xs space-y-3">
                <div className="text-xs font-bold text-white uppercase flex items-center gap-2">
                  <Clock className="w-4 h-4 text-emerald-400" />
                  <span>Időzítés & Kiegészítő Funkciók</span>
                </div>

                <div className="space-y-2">
                  <div>
                    <label className="text-[11px] text-[#8B949E] block mb-1">Bootloader Időtúllépés (Timeout):</label>
                    <select
                      value={config.timeoutMs}
                      onChange={(e) => setConfig((prev) => ({ ...prev, timeoutMs: Number(e.target.value) }))}
                      className="w-full px-2.5 py-1.5 text-xs bg-[#0B0D11] border border-[#30363D] rounded-xs text-white focus:border-amber-400 focus:outline-hidden font-mono"
                    >
                      <option value={300}>300 ms (Ultra-gyors)</option>
                      <option value={500}>500 ms (Gyors)</option>
                      <option value={1000}>1000 ms (Standard Uno)</option>
                      <option value={2000}>2000 ms (Kényelmes)</option>
                      <option value={8000}>8000 ms (Leonardo USB)</option>
                    </select>
                  </div>

                  <div className="space-y-1.5 pt-1 text-xs">
                    <label className="flex items-center justify-between p-2 rounded-xs bg-[#0B0D11] border border-[#2D333B] cursor-pointer">
                      <span className="text-[#8B949E]">EEPROM Olvasás/Írás:</span>
                      <input
                        type="checkbox"
                        checked={config.supportEeprom}
                        onChange={(e) => setConfig((prev) => ({ ...prev, supportEeprom: e.target.checked }))}
                        className="rounded-xs text-amber-500 focus:ring-0"
                      />
                    </label>

                    <label className="flex items-center justify-between p-2 rounded-xs bg-[#0B0D11] border border-[#2D333B] cursor-pointer">
                      <span className="text-[#8B949E]">Watchdog Reset Törlés:</span>
                      <input
                        type="checkbox"
                        checked={config.watchdogRescue}
                        onChange={(e) => setConfig((prev) => ({ ...prev, watchdogRescue: e.target.checked }))}
                        className="rounded-xs text-amber-500 focus:ring-0"
                      />
                    </label>

                    <label className="flex items-center justify-between p-2 rounded-xs bg-[#0B0D11] border border-[#2D333B] cursor-pointer">
                      <span className="text-[#8B949E]">Vektortábla Áthelyezés (IVSEL):</span>
                      <input
                        type="checkbox"
                        checked={config.vectorRelocation}
                        onChange={(e) => setConfig((prev) => ({ ...prev, vectorRelocation: e.target.checked }))}
                        className="rounded-xs text-amber-500 focus:ring-0"
                      />
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 3: LIVE BOOT SEQUENCE SIMULATOR */}
        {/* ================================================================= */}
        {activeTab === 'simulator' && (
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Control Bar */}
            <div className="p-3 bg-[#161B22] border border-[#30363D] rounded-xs flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSimIsPlaying(!simIsPlaying)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xs border transition-colors cursor-pointer ${
                    simIsPlaying
                      ? 'bg-amber-500 text-black border-amber-400'
                      : 'bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border-emerald-500/60'
                  }`}
                >
                  {simIsPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  <span>{simIsPlaying ? 'Megállítás' : 'Automatikus Szimuláció'}</span>
                </button>

                <button
                  onClick={handleStepSimulator}
                  disabled={simIsPlaying}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-[#21262D] hover:bg-[#30363D] text-white border border-[#30363D] rounded-xs transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <StepForward className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Következő Órajel Lépés</span>
                </button>
              </div>

              {/* Reset Trigger Selector Buttons */}
              <div className="flex items-center gap-1 text-xs">
                <span className="text-[11px] text-[#8B949E] mr-1">Reset Esemény:</span>
                <button
                  onClick={() => handleResetSimulator('DTR')}
                  className={`px-2.5 py-1 text-xs rounded-xs border font-bold transition-all ${
                    simTriggerType === 'DTR'
                      ? 'bg-cyan-950 text-cyan-300 border-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.3)]'
                      : 'bg-[#0B0D11] border-[#30363D] text-[#8B949E]'
                  }`}
                >
                  DTR Feltöltés (IDE)
                </button>

                <button
                  onClick={() => handleResetSimulator('POR')}
                  className={`px-2.5 py-1 text-xs rounded-xs border font-bold transition-all ${
                    simTriggerType === 'POR'
                      ? 'bg-amber-950 text-amber-300 border-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.3)]'
                      : 'bg-[#0B0D11] border-[#30363D] text-[#8B949E]'
                  }`}
                >
                  Tápfeszültség Be (POR)
                </button>

                <button
                  onClick={() => handleResetSimulator('WDT')}
                  className={`px-2.5 py-1 text-xs rounded-xs border font-bold transition-all ${
                    simTriggerType === 'WDT'
                      ? 'bg-red-950 text-red-300 border-red-400 shadow-[0_0_8px_rgba(239,68,68,0.3)]'
                      : 'bg-[#0B0D11] border-[#30363D] text-[#8B949E]'
                  }`}
                >
                  Watchdog Reset
                </button>
              </div>
            </div>

            {/* Visual State Machine Flow Diagram */}
            <div className="p-4 bg-[#0B0D11] border border-[#30363D] rounded-xs space-y-3">
              <span className="text-xs font-bold text-white uppercase flex items-center gap-2">
                <Activity className="w-4 h-4 text-amber-400" />
                <span>AVR Hardveres Boot Szekvencia Állapotgép (Live Flow)</span>
              </span>

              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
                {[
                  { id: 'POWER_ON', label: '1. Hardver Reset', sub: 'Reset Vektor Beolvasása' },
                  { id: 'FETCH_BOOTRST', label: '2. BOOTRST Fuse', sub: '0x7E00 vs 0x0000' },
                  { id: 'MCUSR_EVAL', label: '3. MCUSR Vizsgálat', sub: 'WDT / EXTRF / PORF' },
                  { id: 'LED_STROBE', label: '4. LED Villogtatás', sub: `${config.ledFlashes}x Pulzus` },
                  { id: 'STK500_LISTEN', label: '5. STK500 Figyelés', sub: 'UART0 Szinkron (0x30)' },
                  { id: 'STK500_PROG_PAGE', label: '6. Flash SPM Írás', sub: '128B Lapozás / Timeout' },
                  { id: 'APP_RUNNING', label: '7. Alkalmazás Fut', sub: 'JMP 0x0000 User App' },
                ].map((st) => {
                  const isCurrent = simStep === st.id;
                  return (
                    <div
                      key={st.id}
                      className={`p-2.5 rounded-xs border transition-all text-left ${
                        isCurrent
                          ? 'bg-amber-950 border-amber-400 text-white shadow-[0_0_15px_rgba(245,158,11,0.5)] scale-105 z-10'
                          : 'bg-[#161B22] border-[#30363D] text-[#8B949E]'
                      }`}
                    >
                      <div className="text-[11px] font-bold text-white truncate">{st.label}</div>
                      <div className="text-[9px] text-[#8B949E] mt-0.5 truncate">{st.sub}</div>
                      {isCurrent && (
                        <div className="mt-1 flex items-center gap-1 text-[9px] font-bold text-amber-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping inline-block" />
                          <span>AKTÍV</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Register HUD & Live Protocol Telemetry */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* CPU Registers HUD */}
              <div className="p-3.5 bg-[#161B22] border border-[#30363D] rounded-xs space-y-2 font-mono text-xs">
                <span className="text-xs font-bold text-white uppercase flex items-center gap-2 font-sans">
                  <Cpu className="w-4 h-4 text-cyan-400" />
                  <span>AVR CPU Regiszter Állapot</span>
                </span>

                <div className="space-y-1.5 pt-1">
                  <div className="flex justify-between p-1.5 rounded-xs bg-[#0B0D11] border border-[#2D333B]">
                    <span className="text-[#8B949E]">PC (Program Counter):</span>
                    <strong className="text-amber-400">{simRegisters.pc}</strong>
                  </div>
                  <div className="flex justify-between p-1.5 rounded-xs bg-[#0B0D11] border border-[#2D333B]">
                    <span className="text-[#8B949E]">MCUSR Regiszter:</span>
                    <strong className="text-white">0x{simRegisters.mcusr.toString(16).padStart(2, '0')}</strong>
                  </div>
                  <div className="flex justify-between p-1.5 rounded-xs bg-[#0B0D11] border border-[#2D333B]">
                    <span className="text-[#8B949E]">SP (Stack Pointer):</span>
                    <strong className="text-cyan-300">{simRegisters.sp}</strong>
                  </div>
                  <div className="flex justify-between p-1.5 rounded-xs bg-[#0B0D11] border border-[#2D333B]">
                    <span className="text-[#8B949E]">UCSR0B (UART Vezérlő):</span>
                    <strong className="text-emerald-400">0x{simRegisters.ucsr0b.toString(16).padStart(2, '0')}</strong>
                  </div>
                </div>
              </div>

              {/* STK500 Protocol Packet Log */}
              <div className="md:col-span-2 p-3.5 bg-[#161B22] border border-[#30363D] rounded-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white uppercase flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-amber-400" />
                    <span>Virtuális STK500 Soros Csomag Napló</span>
                  </span>
                  <span className="text-[10px] text-[#8B949E] font-mono">115200 8N1</span>
                </div>

                <div className="h-40 overflow-y-auto p-2 bg-[#0B0D11] border border-[#2D333B] rounded-xs font-mono text-[11px] space-y-1.5">
                  {simStkFrames.length === 0 ? (
                    <div className="text-[#8B949E] text-center py-6">
                      Kattints a "DTR Feltöltés" vagy "Következő Lépés" gombra a soros forgalom megtekintéséhez...
                    </div>
                  ) : (
                    simStkFrames.map((frame, idx) => (
                      <div key={idx} className="flex items-start gap-2">
                        <span className="text-[#8B949E]">{frame.time}</span>
                        <span
                          className={`px-1 py-0.2 rounded-xs font-bold text-[9px] ${
                            frame.dir === 'RX' ? 'bg-cyan-950 text-cyan-300' : 'bg-emerald-950 text-emerald-300'
                          }`}
                        >
                          {frame.dir}
                        </span>
                        <span className="text-white flex-1">{frame.msg}</span>
                        <span className="text-amber-400/90 text-[10px]">[{frame.hex}]</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 4: SOURCE CODE & INTEL HEX DISASSEMBLY */}
        {/* ================================================================= */}
        {activeTab === 'source_hex' && (
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {/* Sub Tabs */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                {[
                  { id: 'hex', label: 'Intel HEX Bináris (.hex)', icon: HardDrive },
                  { id: 'c_source', label: 'Optiboot C Forráskód (.c)', icon: FileCode },
                  { id: 'disasm', label: 'AVR Assembly Disassembly (.asm)', icon: Terminal },
                ].map((sTab) => (
                  <button
                    key={sTab.id}
                    onClick={() => setSourceViewType(sTab.id as any)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xs border transition-colors cursor-pointer ${
                      sourceViewType === sTab.id
                        ? 'bg-amber-950/80 text-amber-300 border-amber-400'
                        : 'bg-[#161B22] text-[#8B949E] border-[#30363D] hover:text-white'
                    }`}
                  >
                    <sTab.icon className="w-3.5 h-3.5" />
                    <span>{sTab.label}</span>
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const text =
                      sourceViewType === 'hex'
                        ? generatedHex
                        : sourceViewType === 'c_source'
                        ? generatedCSource
                        : generatedDisasm;
                    handleCopy(text, 'source_code');
                  }}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs bg-[#21262D] hover:bg-[#30363D] text-white border border-[#30363D] rounded-xs transition-colors cursor-pointer"
                >
                  {copiedKey === 'source_code' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === 'source_code' ? 'Másolva!' : 'Másolás'}</span>
                </button>

                <button
                  onClick={() => {
                    if (sourceViewType === 'hex') {
                      handleDownloadFile(generatedHex, `optiboot_${config.mcu}.hex`);
                    } else if (sourceViewType === 'c_source') {
                      handleDownloadFile(generatedCSource, `optiboot_${config.mcu}.c`);
                    } else {
                      handleDownloadFile(generatedDisasm, `optiboot_${config.mcu}.asm`);
                    }
                  }}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs bg-amber-950/80 hover:bg-amber-900 text-amber-300 border border-amber-500/60 rounded-xs transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Letöltés</span>
                </button>
              </div>
            </div>

            {/* Code Output Viewer */}
            <div className="relative">
              <pre className="w-full h-[52vh] overflow-auto p-4 bg-[#0B0D11] border border-[#2D333B] rounded-xs text-[11px] font-mono text-emerald-300/90 leading-relaxed select-text">
                {sourceViewType === 'hex' && generatedHex}
                {sourceViewType === 'c_source' && generatedCSource}
                {sourceViewType === 'disasm' && generatedDisasm}
              </pre>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 5: BURN & TOOLING INTEGRATION */}
        {/* ================================================================= */}
        {activeTab === 'burn_tools' && (
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* 1-Click Burn into Visual Emulator Hero Section */}
            <div className="p-4 bg-gradient-to-r from-amber-950/50 to-emerald-950/40 border-2 border-amber-500/70 rounded-xs flex items-center justify-between flex-wrap gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Flame className="w-5 h-5 text-amber-400 animate-pulse" />
                  <h3 className="text-sm font-black text-white uppercase tracking-wider">
                    1-Kattintásos Égetés a Virtuális Emulátor Flash Memóriájába
                  </h3>
                </div>
                <p className="text-xs text-[#8B949E] max-w-2xl leading-relaxed">
                  Közvetlenül felülírja az AVR8js / ArduASM emulátor 32KB-os Flash és FUSE regisztereit a generált bootloaderrel ({partition.bootStartAddressHex}), így az emulátor indításakor valóban végrehajtja a bootloadert!
                </p>
              </div>

              <button
                id="btn-burn-to-emulator"
                onClick={handleBurnToEmulator}
                className="flex items-center gap-2 px-4 py-2.5 text-xs font-black bg-amber-500 hover:bg-amber-400 text-black rounded-xs shadow-[0_0_20px_rgba(245,158,11,0.5)] transition-all cursor-pointer hover:scale-105"
              >
                <Zap className="w-4 h-4 fill-black" />
                <span>BOOTLOADER BEÉGETÉSE AZ EMULÁTORBA</span>
              </button>
            </div>

            {/* Tooling Configurator Tabs */}
            <div className="p-4 bg-[#161B22] border border-[#30363D] rounded-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {[
                    { id: 'avrdude', label: 'avrdude Parancs' },
                    { id: 'boardstxt', label: 'Arduino boards.txt' },
                    { id: 'platformio', label: 'PlatformIO platformio.ini' },
                  ].map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setToolingType(t.id as any)}
                      className={`px-3 py-1.5 text-xs font-bold rounded-xs border transition-colors cursor-pointer ${
                        toolingType === t.id
                          ? 'bg-amber-950 text-amber-300 border-amber-400'
                          : 'bg-[#0B0D11] text-[#8B949E] border-[#30363D] hover:text-white'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>

                {toolingType === 'avrdude' && (
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-[#8B949E]">Programozó:</span>
                    <select
                      value={avrdudeProgrammer}
                      onChange={(e) => setAvrdudeProgrammer(e.target.value)}
                      className="px-2 py-1 bg-[#0B0D11] border border-[#30363D] rounded-xs text-white text-xs font-mono"
                    >
                      <option value="usbasp">USBasp</option>
                      <option value="stk500v1">Arduino as ISP (stk500v1)</option>
                      <option value="usbtiny">USBtinyISP</option>
                      <option value="atmelice_isp">Atmel-ICE (ISP)</option>
                      <option value="dragon_isp">AVR Dragon</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Code Output Box */}
              <div className="relative">
                <pre className="w-full h-48 overflow-auto p-3.5 bg-[#0B0D11] border border-[#2D333B] rounded-xs text-xs font-mono text-amber-300/90 leading-relaxed select-text">
                  {toolingType === 'avrdude' && generatedAvrdude}
                  {toolingType === 'boardstxt' && generatedBoardsTxt}
                  {toolingType === 'platformio' &&
                    `[env:custom_atmega328p_bootloader]
platform = atmelavr
board = uno
framework = arduino
board_build.mcu = ${config.mcu}
board_build.f_cpu = ${config.clockHz}L
board_upload.maximum_size = ${partition.appSizeBytes}
board_upload.speed = ${config.baudRate}

; Fuses & Lock Bits
board_fuses.lfuse = 0x${fuses.lfuse.toString(16).padStart(2, '0')}
board_fuses.hfuse = 0x${fuses.hfuse.toString(16).padStart(2, '0')}
board_fuses.efuse = 0x${fuses.efuse.toString(16).padStart(2, '0')}
board_fuses.lock = 0x${fuses.lock.toString(16).padStart(2, '0')}

; Custom Bootloader Burn Command
upload_protocol = ${avrdudeProgrammer}`}
                </pre>

                <button
                  onClick={() => {
                    const text =
                      toolingType === 'avrdude'
                        ? generatedAvrdude
                        : toolingType === 'boardstxt'
                        ? generatedBoardsTxt
                        : `[env:custom_atmega328p_bootloader]...`;
                    handleCopy(text, 'tooling');
                  }}
                  className="absolute top-2 right-2 flex items-center gap-1 px-2.5 py-1 text-xs bg-[#21262D] hover:bg-[#30363D] text-white border border-[#30363D] rounded-xs transition-colors"
                >
                  {copiedKey === 'tooling' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === 'tooling' ? 'Másolva!' : 'Másolás'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* FOOTER BAR */}
        {/* ================================================================= */}
        <div className="flex items-center justify-between px-4 py-3 bg-[#161B22] border-t border-[#2D333B] text-xs flex-wrap gap-2 shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-[#8B949E]">
              MCU: <strong className="text-white">{config.mcu.toUpperCase()}</strong>
            </span>
            <span className="text-[#30363D]">|</span>
            <span className="text-[#8B949E]">
              Boot méret: <strong className="text-amber-400">{config.sizeBytes} B</strong>
            </span>
            <span className="text-[#30363D]">|</span>
            <span className="text-[#8B949E]">
              Szabad Flash: <strong className="text-emerald-400">{partition.appSizeBytes.toLocaleString()} B</strong>
            </span>
          </div>

          <div className="flex items-center gap-2">
            {onOpenAvrFuses && (
              <button
                onClick={() => {
                  onClose();
                  onOpenAvrFuses();
                }}
                className="px-3 py-1.5 text-xs text-[#8B949E] hover:text-white hover:bg-[#21262D] border border-[#30363D] rounded-xs transition-colors"
              >
                FUSE Bitek Megnyitása
              </button>
            )}

            <button
              onClick={handleSyncFusesWithBootloader}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-amber-950/90 hover:bg-amber-900 text-amber-300 border border-amber-500/60 rounded-xs shadow-[2px_2px_0px_#000] transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>FUSE Szinkronizálás</span>
            </button>

            <button
              onClick={onClose}
              className="px-4 py-1.5 text-xs font-bold bg-[#21262D] hover:bg-[#30363D] text-white border border-[#30363D] rounded-xs transition-colors cursor-pointer"
            >
              Bezárás
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
