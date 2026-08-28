/**
 * (c) 2026 AI Studio ESP32 Visual Studio
 * Dedicated ESP32 Interrupt Architecture & Matrix Designer Modal
 * Complete interactive 32-Source Xtensa LX6 Dual-Core Interrupt Matrix,
 * GPIO Edge/Level Triggers, 64-bit Timer Group Alarms, Touch Sensor Thresholds,
 * IRAM_ATTR Latency Optimizer, FreeRTOS Queue/Task Dispatch & Code Exporter.
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
  Fingerprint,
  Share2,
} from 'lucide-react';
import {
  Esp32InterruptState,
  Esp32InterruptConfig,
  Esp32InterruptSourceId,
  Esp32InterruptCategory,
  Esp32GpioTriggerMode,
  Esp32InterruptPriority,
  ProgramBlock,
} from '../types';
import {
  ESP32_INTERRUPT_SOURCES,
  DEFAULT_ESP32_INTERRUPT_CONFIGS,
  calculateEsp32TimerAlarmParams,
  generateEsp32InterruptCppCode,
  generateEsp32XtensaAsmCode,
} from '../utils/esp32InterruptData';

interface Esp32InterruptModalProps {
  isOpen: boolean;
  onClose: () => void;
  interruptState?: Esp32InterruptState;
  onToggleGlobalInterrupts?: (enabled: boolean) => void;
  onUpdateConfig?: (sourceId: Esp32InterruptSourceId, config: Partial<Esp32InterruptConfig>) => void;
  onTriggerInterrupt?: (sourceId: Esp32InterruptSourceId, coreId: 0 | 1) => void;
  onClearLogs?: () => void;
  onInsertInterruptBlock?: (blockType: string, params: Record<string, any>, comment?: string) => void;
}

export const Esp32InterruptModal: React.FC<Esp32InterruptModalProps> = ({
  isOpen,
  onClose,
  interruptState,
  onToggleGlobalInterrupts,
  onUpdateConfig,
  onTriggerInterrupt,
  onClearLogs,
  onInsertInterruptBlock,
}) => {
  const [activeCategory, setActiveCategory] = useState<'all' | Esp32InterruptCategory>('all');
  const [selectedSourceId, setSelectedSourceId] = useState<Esp32InterruptSourceId>('GPIO_INTR');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSubTab, setActiveSubTab] = useState<'config' | 'code' | 'logs' | 'table'>('config');
  const [codeLanguage, setCodeLanguage] = useState<'cpp' | 'asm'>('cpp');
  const [copiedCode, setCopiedCode] = useState(false);
  const [lastFiredMessage, setLastFiredMessage] = useState<string | null>(null);

  const configs = interruptState?.configs || DEFAULT_ESP32_INTERRUPT_CONFIGS;
  const isGlobalEnabled = interruptState?.globalInterruptsEnabled !== false;

  const currentSourceInfo = useMemo(() => {
    return ESP32_INTERRUPT_SOURCES.find((s) => s.id === selectedSourceId) || ESP32_INTERRUPT_SOURCES[0];
  }, [selectedSourceId]);

  const currentConfig: Esp32InterruptConfig = useMemo(() => {
    if (configs[selectedSourceId]) {
      return configs[selectedSourceId];
    }
    return {
      id: selectedSourceId,
      enabled: false,
      coreAffinity: currentSourceInfo.coreAffinity === 'both' ? 1 : currentSourceInfo.coreAffinity,
      priorityLevel: currentSourceInfo.defaultPriority,
      triggerType: currentSourceInfo.triggerType,
      useIramAttr: true,
      customIsrAction: 'toggle_pin',
      targetPin: 2,
      description: currentSourceInfo.description,
    };
  }, [configs, selectedSourceId, currentSourceInfo]);

  const filteredSources = useMemo(() => {
    return ESP32_INTERRUPT_SOURCES.filter((s) => {
      const matchCat = activeCategory === 'all' || s.category === activeCategory;
      const matchSearch =
        searchQuery === '' ||
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.hardwareSource.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [activeCategory, searchQuery]);

  const timerCalc = useMemo(() => {
    if (selectedSourceId.startsWith('TG')) {
      const interval = currentConfig.alarmIntervalUs || 1000;
      const div = currentConfig.divider || 80;
      return calculateEsp32TimerAlarmParams(80000000, interval, div);
    }
    return null;
  }, [selectedSourceId, currentConfig.alarmIntervalUs, currentConfig.divider]);

  const generatedCode = useMemo(() => {
    if (codeLanguage === 'asm') {
      return generateEsp32XtensaAsmCode(currentConfig);
    }
    return generateEsp32InterruptCppCode(currentConfig);
  }, [currentConfig, codeLanguage]);

  if (!isOpen) return null;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(generatedCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleTriggerManual = (coreId?: 0 | 1) => {
    const targetCore = coreId !== undefined ? coreId : currentConfig.coreAffinity === 'both' ? 1 : currentConfig.coreAffinity || 0;
    if (onTriggerInterrupt) {
      onTriggerInterrupt(selectedSourceId, targetCore);
    }
    setLastFiredMessage(`Kiváltva: ${selectedSourceId} (Core ${targetCore})`);
    setTimeout(() => setLastFiredMessage(null), 2500);
  };

  const handleInsertBlock = () => {
    if (!onInsertInterruptBlock) return;

    if (selectedSourceId === 'GPIO_INTR') {
      onInsertInterruptBlock(
        'esp32_gpio_interrupt',
        {
          gpioPin: currentConfig.gpioPin || 4,
          triggerMode: currentConfig.gpioTriggerMode || 'FALLING',
          coreAffinity: String(currentConfig.coreAffinity === 'both' ? 1 : currentConfig.coreAffinity || 1),
          action: currentConfig.customIsrAction || 'toggle_pin',
          targetPin: currentConfig.targetPin || 2,
        },
        `ESP32 Hardveres GPIO ${currentConfig.gpioPin || 4} Megszakítás (${currentConfig.gpioTriggerMode || 'FALLING'})`
      );
    } else if (selectedSourceId.startsWith('TG')) {
      onInsertInterruptBlock(
        'esp32_timer_alarm_interrupt',
        {
          timerGroup: String(currentConfig.timerGroup || 0),
          timerIndex: String(currentConfig.timerIndex || 0),
          intervalUs: currentConfig.alarmIntervalUs || 1000,
          autoReload: String(currentConfig.autoReload !== false),
          targetPin: currentConfig.targetPin || 2,
        },
        `ESP32 Hardware Timer Alarm (${currentConfig.alarmIntervalUs || 1000} µs)`
      );
    } else if (selectedSourceId === 'TOUCH_PAD_INTR') {
      onInsertInterruptBlock(
        'esp32_touch_interrupt',
        {
          touchPad: String(currentConfig.touchPadIndex || 0),
          threshold: currentConfig.touchThreshold || 400,
          targetPin: currentConfig.targetPin || 2,
        },
        `ESP32 Kapacitív Touch T${currentConfig.touchPadIndex || 0} Megszakítás`
      );
    } else {
      onInsertInterruptBlock(
        'esp32_interrupt_designer',
        { note: 'ACTIVE' },
        `ESP32 Xtensa Megszakítás Mátrix (${selectedSourceId})`
      );
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-5 animate-in fade-in duration-200">
      <div className="w-full max-w-6xl h-[92vh] max-h-[950px] bg-[#12141A] border border-[#2A2D35] rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100 font-sans">
        {/* MODAL HEADER */}
        <div className="px-6 py-4 bg-[#181B22] border-b border-[#2A2D35] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500/20 to-blue-600/30 border border-sky-500/40 flex items-center justify-center text-sky-400 shadow-lg shadow-sky-950/40">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-lg font-bold text-white tracking-wide flex items-center gap-2">
                  ESP32 Kétmagos Megszakítás Mátrix & ISR Tervező
                </h2>
                <span className="px-2 py-0.5 text-[11px] font-mono font-semibold bg-sky-500/20 text-sky-300 border border-sky-500/30 rounded-md">
                  Xtensa® LX6 @ 240MHz
                </span>
                <span className="px-2 py-0.5 text-[11px] font-mono bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-md">
                  Dual-Core (PRO/APP)
                </span>
              </div>
              <p className="text-xs text-[#8A8D98] mt-0.5">
                32 Hardveres CPU Forrás • 7 Prioritási Szint • IRAM_ATTR Nulla Késleltetés • FreeRTOS IPC & Queue Integráció
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Core 0 & Core 1 Telemetry Pills */}
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-[#1E222B] border border-[#2A2D35] rounded-lg text-xs font-mono">
              <div className="flex items-center gap-1.5 text-sky-400">
                <Cpu className="w-3.5 h-3.5" />
                <span>Core 0 (PRO):</span>
                <span className="font-bold text-white">{interruptState?.core0FiredCount || 0}</span>
              </div>
              <div className="h-3 w-px bg-[#2A2D35]" />
              <div className="flex items-center gap-1.5 text-emerald-400">
                <Cpu className="w-3.5 h-3.5" />
                <span>Core 1 (APP):</span>
                <span className="font-bold text-white">{interruptState?.core1FiredCount || 0}</span>
              </div>
            </div>

            {/* Global Interrupt Toggle Button */}
            <button
              onClick={() => onToggleGlobalInterrupts && onToggleGlobalInterrupts(!isGlobalEnabled)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-2 transition-all ${
                isGlobalEnabled
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                  : 'bg-rose-500/20 text-rose-300 border-rose-500/40 hover:bg-rose-500/30'
              }`}
            >
              <Activity className={`w-3.5 h-3.5 ${isGlobalEnabled ? 'animate-pulse' : ''}`} />
              <span>{isGlobalEnabled ? 'Xtensa Megszakítások: AKTÍV' : 'Megszakítások: TILTVA'}</span>
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-[#1E222B] hover:bg-[#2A2E39] text-[#8A8D98] hover:text-white flex items-center justify-center border border-[#2A2D35] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* MAIN MODAL BODY */}
        <div className="flex-1 grid grid-cols-12 overflow-hidden">
          {/* LEFT SIDEBAR: SOURCES LIST & CATEGORY FILTER (4 cols) */}
          <div className="col-span-12 md:col-span-5 lg:col-span-4 bg-[#14161E] border-r border-[#2A2D35] flex flex-col h-full overflow-hidden">
            {/* Search and Category Filter */}
            <div className="p-3 border-b border-[#2A2D35] space-y-2.5 bg-[#161822]">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Keresés forrás, láb vagy regiszter szerint..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#1A1D27] border border-[#2A2D35] rounded-lg px-3 py-1.5 text-xs text-slate-100 placeholder-[#636875] focus:outline-none focus:border-sky-500"
                />
              </div>

              {/* Category Pills */}
              <div className="flex flex-wrap gap-1">
                {[
                  { id: 'all', label: 'Összes (32)' },
                  { id: 'gpio', label: '📌 GPIO' },
                  { id: 'timer', label: '⏱️ Időzítők' },
                  { id: 'comm', label: '🌐 Soros/SPI/I2C' },
                  { id: 'analog_sensor', label: '👆 Touch/ADC' },
                  { id: 'system_freertos', label: '⚙️ FreeRTOS/WDT' },
                  { id: 'wireless', label: '📡 Wi-Fi/BLE' },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id as any)}
                    className={`px-2 py-1 rounded text-[11px] font-medium transition-all ${
                      activeCategory === cat.id
                        ? 'bg-sky-500 text-white font-semibold shadow-sm'
                        : 'bg-[#1E222D] text-[#8A8D98] hover:text-white hover:bg-[#252A38]'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Source Items List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1.5 scrollbar-thin scrollbar-thumb-[#2A2D35]">
              {filteredSources.map((source) => {
                const isSelected = source.id === selectedSourceId;
                const isConfigEnabled = configs[source.id]?.enabled;
                const priority = configs[source.id]?.priorityLevel || source.defaultPriority;
                const coreAffinity = configs[source.id]?.coreAffinity !== undefined ? configs[source.id].coreAffinity : source.coreAffinity;

                return (
                  <div
                    key={source.id}
                    onClick={() => setSelectedSourceId(source.id)}
                    className={`p-2.5 rounded-xl border transition-all cursor-pointer flex flex-col gap-1.5 ${
                      isSelected
                        ? 'bg-sky-500/15 border-sky-500/50 shadow-md shadow-sky-950/20 text-white'
                        : 'bg-[#181B24] border-[#242733] hover:bg-[#1E222D] hover:border-[#2F3445] text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-sky-400">
                          #{source.sourceNum.toString().padStart(2, '0')}
                        </span>
                        <span className="font-semibold text-xs truncate max-w-[150px] sm:max-w-[180px]">
                          {source.id}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            isConfigEnabled ? 'bg-emerald-400 shadow-sm shadow-emerald-400/80 animate-pulse' : 'bg-[#3A3E4D]'
                          }`}
                        />
                        <span
                          className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                            isConfigEnabled
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : 'bg-[#222530] text-[#717585]'
                          }`}
                        >
                          {isConfigEnabled ? 'BE' : 'KI'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[10px] font-mono text-[#8A8D98]">
                      <span className="truncate max-w-[140px]">{source.hardwareSource}</span>
                      <div className="flex items-center gap-1">
                        <span className="px-1 py-0.2 bg-[#12141A] rounded text-[#A0A4B2]">
                          L{priority}
                        </span>
                        <span
                          className={`px-1 py-0.2 rounded font-semibold ${
                            coreAffinity === 0
                              ? 'bg-sky-500/20 text-sky-300'
                              : coreAffinity === 1
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : 'bg-purple-500/20 text-purple-300'
                          }`}
                        >
                          {coreAffinity === 0 ? 'Core 0' : coreAffinity === 1 ? 'Core 1' : 'Dual'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bottom Counter Bar */}
            <div className="p-2.5 bg-[#12141A] border-t border-[#2A2D35] flex items-center justify-between text-[11px] font-mono text-[#8A8D98]">
              <span>Összesen: {filteredSources.length} / 32 forrás</span>
              <span className="text-[#38bdf8]">
                {Object.values(configs).filter((c: any) => c?.enabled).length} bekapcsolva
              </span>
            </div>
          </div>

          {/* RIGHT WORKSPACE: TABS, CONFIGURATOR, CODE & LOGS (8 cols) */}
          <div className="col-span-12 md:col-span-7 lg:col-span-8 bg-[#161822] flex flex-col h-full overflow-hidden">
            {/* Top Navigation Tabs */}
            <div className="px-5 py-3 bg-[#181B25] border-b border-[#2A2D35] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-1.5">
                {[
                  { id: 'config', label: '⚙️ Vektor Konfigurátor', icon: Settings2 },
                  { id: 'code', label: '💻 C++ & Xtensa ASM Kód', icon: Terminal },
                  { id: 'logs', label: '⚡ Eseménynapló & Telemetria', icon: Activity },
                  { id: 'table', label: '📊 32-Csatornás Mátrix', icon: Layers },
                ].map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeSubTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveSubTab(tab.id as any)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 transition-all ${
                        isActive
                          ? 'bg-sky-500 text-white font-semibold shadow-md shadow-sky-950/30'
                          : 'bg-[#1E222D] text-[#8A8D98] hover:text-white hover:bg-[#252A38]'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              {lastFiredMessage && (
                <div className="px-3 py-1 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-mono rounded-lg animate-pulse flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5" />
                  <span>{lastFiredMessage}</span>
                </div>
              )}
            </div>

            {/* SUBTAB 1: CONFIGURATOR */}
            {activeSubTab === 'config' && (
              <div className="flex-1 overflow-y-auto p-5 space-y-5 scrollbar-thin scrollbar-thumb-[#2A2D35]">
                {/* Active Source Title & Master Switch Card */}
                <div className="p-4 bg-[#1C1F2B] border border-[#2D313F] rounded-xl flex items-center justify-between shadow-sm">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-white">{currentSourceInfo.name}</h3>
                      <span className="px-2 py-0.5 text-[10px] font-mono bg-sky-500/20 text-sky-300 border border-sky-500/30 rounded">
                        Mátrix Forrás #{currentSourceInfo.sourceNum}
                      </span>
                    </div>
                    <p className="text-xs text-[#8A8D98] max-w-xl">{currentSourceInfo.description}</p>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() =>
                        onUpdateConfig &&
                        onUpdateConfig(selectedSourceId, { enabled: !currentConfig.enabled })
                      }
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2 ${
                        currentConfig.enabled
                          ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-950/40'
                          : 'bg-[#2A2D3A] hover:bg-[#343847] text-[#9EA3B2]'
                      }`}
                    >
                      <Zap className="w-4 h-4" />
                      <span>{currentConfig.enabled ? 'ENGEDÉLYEZVE' : 'LETILTVA'}</span>
                    </button>
                  </div>
                </div>

                {/* Core Architecture Settings: Core Affinity, Priority, Trigger Type, IRAM_ATTR */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Core Affinity */}
                  <div className="p-4 bg-[#1A1D28] border border-[#2A2D35] rounded-xl space-y-2">
                    <label className="text-xs font-semibold text-slate-200 flex items-center justify-between">
                      <span>Végrehajtó Xtensa Processzormag:</span>
                      <span className="font-mono text-[11px] text-sky-400">
                        {currentConfig.coreAffinity === 0
                          ? 'PRO_CPU (Core 0)'
                          : currentConfig.coreAffinity === 1
                          ? 'APP_CPU (Core 1)'
                          : 'Bármelyik (Dynamic)'}
                      </span>
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 0, label: 'Core 0 (PRO)', desc: 'Wi-Fi / Rendszer' },
                        { id: 1, label: 'Core 1 (APP)', desc: 'Felhasználói Loop' },
                        { id: 'both', label: 'Dinamikus', desc: 'Szabad mag' },
                      ].map((c) => (
                        <button
                          key={String(c.id)}
                          onClick={() =>
                            onUpdateConfig &&
                            onUpdateConfig(selectedSourceId, { coreAffinity: c.id as any })
                          }
                          className={`p-2 rounded-lg text-center border transition-all ${
                            currentConfig.coreAffinity === c.id
                              ? 'bg-sky-500/20 border-sky-500 text-white font-bold'
                              : 'bg-[#141620] border-[#2A2D35] text-[#8A8D98] hover:text-white'
                          }`}
                        >
                          <div className="text-xs">{c.label}</div>
                          <div className="text-[9px] text-[#6F7382] truncate">{c.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Priority Level */}
                  <div className="p-4 bg-[#1A1D28] border border-[#2A2D35] rounded-xl space-y-2">
                    <label className="text-xs font-semibold text-slate-200 flex items-center justify-between">
                      <span>Xtensa CPU Prioritási Szint:</span>
                      <span className="font-mono text-[11px] text-amber-400">
                        Level {currentConfig.priorityLevel} (
                        {currentConfig.priorityLevel <= 3 ? 'C Callback' : 'High-Priority ASM'})
                      </span>
                    </label>
                    <div className="flex items-center gap-1.5">
                      {([1, 2, 3, 4, 5, 6, 7] as Esp32InterruptPriority[]).map((lvl) => (
                        <button
                          key={lvl}
                          onClick={() =>
                            onUpdateConfig && onUpdateConfig(selectedSourceId, { priorityLevel: lvl })
                          }
                          className={`flex-1 py-2 rounded-lg text-xs font-mono font-bold border transition-all ${
                            currentConfig.priorityLevel === lvl
                              ? 'bg-amber-500/25 border-amber-500 text-amber-300 shadow-sm'
                              : 'bg-[#141620] border-[#2A2D35] text-[#8A8D98] hover:text-white'
                          }`}
                        >
                          L{lvl}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* IRAM_ATTR Zero Latency Toggle */}
                <div className="p-4 bg-[#1A1D28] border border-[#2A2D35] rounded-xl flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="text-xs font-bold text-white flex items-center gap-2">
                      <span>IRAM_ATTR Tárolás (Belső Gyors RAM)</span>
                      <span className="px-1.5 py-0.2 bg-emerald-500/20 text-emerald-300 text-[10px] rounded border border-emerald-500/30">
                        Ajánlott
                      </span>
                    </div>
                    <p className="text-[11px] text-[#8A8D98]">
                      A megszakításkezelő a belső 520 KB SRAM-ba kerül, így SPI Flash műveletek vagy Wi-Fi adatforgalom közben is késleltetés (0 ns cache miss) nélkül azonnal lefut.
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      onUpdateConfig &&
                      onUpdateConfig(selectedSourceId, { useIramAttr: !currentConfig.useIramAttr })
                    }
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                      currentConfig.useIramAttr
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                        : 'bg-[#141620] border-[#2A2D35] text-[#8A8D98]'
                    }`}
                  >
                    {currentConfig.useIramAttr ? 'IRAM (18 ns)' : 'Flash (85 ns)'}
                  </button>
                </div>

                {/* SPECIFIC CONFIGURATORS ACCORDING TO SOURCE TYPE */}

                {/* 1. GPIO Specific Config */}
                {selectedSourceId === 'GPIO_INTR' && (
                  <div className="p-4 bg-[#1A1D28] border border-sky-500/30 rounded-xl space-y-4">
                    <div className="flex items-center gap-2 border-b border-[#2A2D35] pb-2">
                      <Radio className="w-4 h-4 text-sky-400" />
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                        GPIO Mátrix Élérzékelő Paraméterek
                      </h4>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="text-[11px] text-[#8A8D98] block mb-1">Forrás GPIO Láb:</label>
                        <select
                          value={currentConfig.gpioPin !== undefined ? currentConfig.gpioPin : 4}
                          onChange={(e) =>
                            onUpdateConfig &&
                            onUpdateConfig(selectedSourceId, { gpioPin: parseInt(e.target.value, 10) })
                          }
                          className="w-full bg-[#141620] border border-[#2A2D35] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-sky-500 font-mono"
                        >
                          {[0, 2, 4, 5, 12, 13, 14, 15, 16, 17, 18, 19, 21, 22, 23, 25, 26, 27, 32, 33, 34, 35, 36, 39].map(
                            (pin) => (
                              <option key={pin} value={pin}>
                                GPIO {pin} {pin === 2 ? '(Kék LED)' : pin === 4 ? '(Gomb / T0)' : ''}
                              </option>
                            )
                          )}
                        </select>
                      </div>

                      <div>
                        <label className="text-[11px] text-[#8A8D98] block mb-1">Élérzékelési Mód:</label>
                        <select
                          value={currentConfig.gpioTriggerMode || 'FALLING'}
                          onChange={(e) =>
                            onUpdateConfig &&
                            onUpdateConfig(selectedSourceId, {
                              gpioTriggerMode: e.target.value as Esp32GpioTriggerMode,
                            })
                          }
                          className="w-full bg-[#141620] border border-[#2A2D35] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-sky-500 font-mono"
                        >
                          <option value="FALLING">FALLING (Lehúzó él)</option>
                          <option value="RISING">RISING (Felfutó él)</option>
                          <option value="CHANGE">CHANGE (Változás)</option>
                          <option value="LOW_LEVEL">LOW_LEVEL (Alacsony szint)</option>
                          <option value="HIGH_LEVEL">HIGH_LEVEL (Magas szint)</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[11px] text-[#8A8D98] block mb-1">Belső Ellenállás:</label>
                        <select
                          value={currentConfig.pullMode || 'PULLUP'}
                          onChange={(e) =>
                            onUpdateConfig &&
                            onUpdateConfig(selectedSourceId, { pullMode: e.target.value as any })
                          }
                          className="w-full bg-[#141620] border border-[#2A2D35] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-sky-500 font-mono"
                        >
                          <option value="PULLUP">INPUT_PULLUP (Belső Felhúzó)</option>
                          <option value="PULLDOWN">INPUT_PULLDOWN (Belső Lehúzó)</option>
                          <option value="NONE">INPUT (Lebegő / Nincs)</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. Timer Group Alarm Specific Config */}
                {selectedSourceId.startsWith('TG') && timerCalc && (
                  <div className="p-4 bg-[#1A1D28] border border-blue-500/30 rounded-xl space-y-4">
                    <div className="flex items-center gap-2 border-b border-[#2A2D35] pb-2">
                      <Clock className="w-4 h-4 text-blue-400" />
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                        64-bites Hardveres Időzítő & Alarm Riasztás Kalkulátor
                      </h4>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="text-[11px] text-[#8A8D98] block mb-1">Riasztási Időköz (µs):</label>
                        <input
                          type="number"
                          min="1"
                          max="10000000"
                          value={currentConfig.alarmIntervalUs || 1000}
                          onChange={(e) =>
                            onUpdateConfig &&
                            onUpdateConfig(selectedSourceId, {
                              alarmIntervalUs: Math.max(1, parseInt(e.target.value, 10) || 1000),
                            })
                          }
                          className="w-full bg-[#141620] border border-[#2A2D35] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-sky-500 font-mono"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] text-[#8A8D98] block mb-1">Előosztó (Divider):</label>
                        <input
                          type="number"
                          min="1"
                          max="65535"
                          value={currentConfig.divider || 80}
                          onChange={(e) =>
                            onUpdateConfig &&
                            onUpdateConfig(selectedSourceId, {
                              divider: Math.max(1, parseInt(e.target.value, 10) || 80),
                            })
                          }
                          className="w-full bg-[#141620] border border-[#2A2D35] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-sky-500 font-mono"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] text-[#8A8D98] block mb-1">Újratöltés (Auto-Reload):</label>
                        <select
                          value={currentConfig.autoReload !== false ? 'true' : 'false'}
                          onChange={(e) =>
                            onUpdateConfig &&
                            onUpdateConfig(selectedSourceId, { autoReload: e.target.value === 'true' })
                          }
                          className="w-full bg-[#141620] border border-[#2A2D35] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-sky-500 font-mono"
                        >
                          <option value="true">Igen (Periodikus ISR)</option>
                          <option value="false">Nem (Egyszeri Riasztás)</option>
                        </select>
                      </div>
                    </div>

                    {/* Calculated Metrics */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 bg-[#13151D] border border-[#242733] rounded-lg text-xs font-mono">
                      <div>
                        <div className="text-[10px] text-[#717585]">Időzítő Órajel:</div>
                        <div className="text-white font-bold">{timerCalc.tickFreqHz / 1000000} MHz</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-[#717585]">Tick Időtartam:</div>
                        <div className="text-sky-400 font-bold">{timerCalc.tickDurationUs} µs</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-[#717585]">Riasztás Ticks (64-bit):</div>
                        <div className="text-amber-400 font-bold">{timerCalc.alarmTicks} ticks</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-[#717585]">Megszakítás Frekvencia:</div>
                        <div className="text-emerald-400 font-bold">{timerCalc.frequencyHz} Hz</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. Touch Pad Config */}
                {selectedSourceId === 'TOUCH_PAD_INTR' && (
                  <div className="p-4 bg-[#1A1D28] border border-purple-500/30 rounded-xl space-y-4">
                    <div className="flex items-center gap-2 border-b border-[#2A2D35] pb-2">
                      <Fingerprint className="w-4 h-4 text-purple-400" />
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                        Kapacitív Érintésérzékelő (Touch Pad T0-T9)
                      </h4>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] text-[#8A8D98] block mb-1">Touch Pad Csatorna:</label>
                        <select
                          value={currentConfig.touchPadIndex !== undefined ? currentConfig.touchPadIndex : 0}
                          onChange={(e) =>
                            onUpdateConfig &&
                            onUpdateConfig(selectedSourceId, {
                              touchPadIndex: parseInt(e.target.value, 10),
                            })
                          }
                          className="w-full bg-[#141620] border border-[#2A2D35] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-sky-500 font-mono"
                        >
                          <option value="0">T0 (GPIO 4)</option>
                          <option value="2">T2 (GPIO 2)</option>
                          <option value="3">T3 (GPIO 15)</option>
                          <option value="4">T4 (GPIO 13)</option>
                          <option value="5">T5 (GPIO 12)</option>
                          <option value="6">T6 (GPIO 14)</option>
                          <option value="7">T7 (GPIO 27)</option>
                          <option value="8">T8 (GPIO 33)</option>
                          <option value="9">T9 (GPIO 32)</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[11px] text-[#8A8D98] block mb-1">Érzékenységi Küszöb:</label>
                        <input
                          type="number"
                          min="10"
                          max="1000"
                          value={currentConfig.touchThreshold || 400}
                          onChange={(e) =>
                            onUpdateConfig &&
                            onUpdateConfig(selectedSourceId, {
                              touchThreshold: Math.max(10, parseInt(e.target.value, 10) || 400),
                            })
                          }
                          className="w-full bg-[#141620] border border-[#2A2D35] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-sky-500 font-mono"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* ISR Action Builder Card */}
                <div className="p-4 bg-[#1A1D28] border border-[#2A2D35] rounded-xl space-y-4">
                  <div className="flex items-center gap-2 border-b border-[#2A2D35] pb-2">
                    <Sliders className="w-4 h-4 text-emerald-400" />
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                      Hardveres ISR Callback Reakció & FreeRTOS IPC
                    </h4>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[11px] text-[#8A8D98] block mb-1">ISR Akció:</label>
                      <select
                        value={currentConfig.customIsrAction || 'toggle_pin'}
                        onChange={(e) =>
                          onUpdateConfig &&
                          onUpdateConfig(selectedSourceId, { customIsrAction: e.target.value as any })
                        }
                        className="w-full bg-[#141620] border border-[#2A2D35] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-sky-500 font-mono"
                      >
                        <option value="toggle_pin">Kimeneti Pin Állapotváltás (Toggle GPIO)</option>
                        <option value="notify_task">FreeRTOS Taszk Értesítés (vTaskNotifyGiveFromISR)</option>
                        <option value="send_queue">FreeRTOS Sorba Küldés (xQueueSendFromISR)</option>
                        <option value="increment_counter">Számláló Növelése (volatile uint32_t)</option>
                        <option value="custom_code">Egyedi C++ / ASM Kódrészlet</option>
                      </select>
                    </div>

                    {currentConfig.customIsrAction === 'toggle_pin' && (
                      <div>
                        <label className="text-[11px] text-[#8A8D98] block mb-1">Cél GPIO Láb (LED / Kimenet):</label>
                        <select
                          value={currentConfig.targetPin !== undefined ? currentConfig.targetPin : 2}
                          onChange={(e) =>
                            onUpdateConfig &&
                            onUpdateConfig(selectedSourceId, {
                              targetPin: parseInt(e.target.value, 10),
                            })
                          }
                          className="w-full bg-[#141620] border border-[#2A2D35] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-sky-500 font-mono"
                        >
                          <option value="2">GPIO 2 (Beépített Kék LED)</option>
                          <option value="4">GPIO 4</option>
                          <option value="5">GPIO 5</option>
                          <option value="18">GPIO 18</option>
                          <option value="19">GPIO 19</option>
                          <option value="21">GPIO 21</option>
                          <option value="22">GPIO 22</option>
                          <option value="23">GPIO 23</option>
                        </select>
                      </div>
                    )}
                  </div>
                </div>

                {/* HARDWARE REGISTERS REFERENCE BOX */}
                <div className="p-4 bg-[#13151D] border border-[#242733] rounded-xl space-y-2.5">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
                    <Layers className="w-3.5 h-3.5 text-sky-400" />
                    <span>Hardveres Regiszter Térkép & Xtensa DPORT Címek:</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {currentSourceInfo.registers.map((reg, idx) => (
                      <div
                        key={idx}
                        className="p-2 bg-[#181B24] border border-[#222531] rounded-lg text-[11px] font-mono"
                      >
                        <div className="flex items-center justify-between text-sky-300 font-bold">
                          <span>{reg.name}</span>
                          <span className="text-amber-400">{reg.addressHex}</span>
                        </div>
                        <div className="text-[10px] text-[#8A8D98] mt-0.5">{reg.description}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* BOTTOM ACTION BAR */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#2A2D35]">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleTriggerManual()}
                      className="px-4 py-2 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-sky-950/40 flex items-center gap-2 transition-all active:scale-95"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Kézi Kiváltás (Pulse)</span>
                    </button>

                    <button
                      onClick={() => handleTriggerManual(0)}
                      className="px-3 py-2 bg-[#1E222D] hover:bg-[#282D3C] text-sky-300 border border-sky-500/30 text-xs font-mono rounded-xl transition-all"
                    >
                      Core 0 Pulse
                    </button>
                    <button
                      onClick={() => handleTriggerManual(1)}
                      className="px-3 py-2 bg-[#1E222D] hover:bg-[#282D3C] text-emerald-300 border border-emerald-500/30 text-xs font-mono rounded-xl transition-all"
                    >
                      Core 1 Pulse
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleInsertBlock}
                      className="px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold rounded-xl flex items-center gap-2 transition-all"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Beillesztés a Munkaterületre Blokként</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* SUBTAB 2: CODE EXPORTER */}
            {activeSubTab === 'code' && (
              <div className="flex-1 flex flex-col overflow-hidden p-5 space-y-4">
                <div className="flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCodeLanguage('cpp')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
                        codeLanguage === 'cpp'
                          ? 'bg-sky-500 text-white shadow-sm'
                          : 'bg-[#1E222D] text-[#8A8D98] hover:text-white'
                      }`}
                    >
                      C++ / ESP-IDF Driver
                    </button>
                    <button
                      onClick={() => setCodeLanguage('asm')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
                        codeLanguage === 'asm'
                          ? 'bg-sky-500 text-white shadow-sm'
                          : 'bg-[#1E222D] text-[#8A8D98] hover:text-white'
                      }`}
                    >
                      Xtensa LX6 Assembly
                    </button>
                  </div>

                  <button
                    onClick={handleCopyCode}
                    className="px-3.5 py-1.5 bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/40 rounded-lg text-xs font-medium flex items-center gap-2 transition-all"
                  >
                    {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedCode ? 'Másolva!' : 'Kód Másolása'}</span>
                  </button>
                </div>

                <div className="flex-1 bg-[#10121A] border border-[#242733] rounded-xl p-4 overflow-auto font-mono text-xs text-slate-200 scrollbar-thin scrollbar-thumb-[#2A2D35]">
                  <pre className="leading-relaxed whitespace-pre font-mono">{generatedCode}</pre>
                </div>
              </div>
            )}

            {/* SUBTAB 3: LOGS & TELEMETRY */}
            {activeSubTab === 'logs' && (
              <div className="flex-1 flex flex-col overflow-hidden p-5 space-y-4">
                {/* Telemetry Summary Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 shrink-0">
                  <div className="p-3 bg-[#1A1D28] border border-[#2A2D35] rounded-xl font-mono">
                    <div className="text-[10px] text-[#717585]">Összes Megszakítás:</div>
                    <div className="text-lg font-bold text-white">{interruptState?.totalFiredCount || 0}</div>
                  </div>
                  <div className="p-3 bg-[#1A1D28] border border-sky-500/30 rounded-xl font-mono">
                    <div className="text-[10px] text-sky-400">PRO_CPU (Core 0):</div>
                    <div className="text-lg font-bold text-sky-300">{interruptState?.core0FiredCount || 0}</div>
                  </div>
                  <div className="p-3 bg-[#1A1D28] border border-emerald-500/30 rounded-xl font-mono">
                    <div className="text-[10px] text-emerald-400">APP_CPU (Core 1):</div>
                    <div className="text-lg font-bold text-emerald-300">{interruptState?.core1FiredCount || 0}</div>
                  </div>
                  <div className="p-3 bg-[#1A1D28] border border-[#2A2D35] rounded-xl font-mono">
                    <div className="text-[10px] text-[#717585]">Átlagos Késleltetés:</div>
                    <div className="text-lg font-bold text-amber-400">~18 ns (IRAM)</div>
                  </div>
                </div>

                <div className="flex items-center justify-between shrink-0">
                  <div className="text-xs font-bold text-slate-300 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-sky-400" />
                    <span>Valós Idejű Eseménynapló ({interruptState?.eventLog?.length || 0} bejegyzés)</span>
                  </div>
                  <button
                    onClick={onClearLogs}
                    className="px-3 py-1 bg-[#1E222D] hover:bg-[#282D3C] text-[#8A8D98] hover:text-white rounded-lg text-xs flex items-center gap-1.5 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Napló Törlése</span>
                  </button>
                </div>

                {/* Event Logs Stream */}
                <div className="flex-1 bg-[#10121A] border border-[#242733] rounded-xl p-3 overflow-y-auto space-y-2 font-mono text-xs scrollbar-thin scrollbar-thumb-[#2A2D35]">
                  {(!interruptState?.eventLog || interruptState.eventLog.length === 0) ? (
                    <div className="h-full flex items-center justify-center text-[#555966] text-xs">
                      Még nem futott le megszakítás. Kattints a "Kézi Kiváltás" gombra vagy indítsd el a szimulációt!
                    </div>
                  ) : (
                    interruptState.eventLog.map((log) => (
                      <div
                        key={log.id}
                        className="p-2.5 bg-[#171A24] border border-[#222533] rounded-lg flex flex-col gap-1 text-[11px]"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                log.coreId === 0
                                  ? 'bg-sky-500/20 text-sky-300'
                                  : 'bg-emerald-500/20 text-emerald-300'
                              }`}
                            >
                              Core {log.coreId}
                            </span>
                            <span className="font-bold text-white">{log.sourceId}</span>
                            <span className="text-[#6F7382] text-[10px] font-normal">({log.name})</span>
                          </div>
                          <div className="flex items-center gap-2 text-[#7E8292] text-[10px]">
                            <span>Késleltetés: {log.latencyNs} ns</span>
                            <span>•</span>
                            <span>Idő: {log.timestampNs} ns</span>
                          </div>
                        </div>
                        <div className="text-[#9EA3B2] text-[11px]">{log.details}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* SUBTAB 4: MATRIX TABLE */}
            {activeSubTab === 'table' && (
              <div className="flex-1 overflow-auto p-5 scrollbar-thin scrollbar-thumb-[#2A2D35]">
                <table className="w-full text-left border-collapse font-mono text-xs">
                  <thead>
                    <tr className="border-b border-[#2A2D35] text-[#717585] text-[11px]">
                      <th className="py-2.5 px-3">#</th>
                      <th className="py-2.5 px-3">Forrás Azonosító</th>
                      <th className="py-2.5 px-3">Kategória</th>
                      <th className="py-2.5 px-3">Mag</th>
                      <th className="py-2.5 px-3">Szint</th>
                      <th className="py-2.5 px-3">Típus</th>
                      <th className="py-2.5 px-3">Állapot</th>
                      <th className="py-2.5 px-3 text-right">Művelet</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#202330]">
                    {ESP32_INTERRUPT_SOURCES.map((s) => {
                      const cfg = configs[s.id];
                      const isEnabled = cfg?.enabled;
                      const core = cfg?.coreAffinity !== undefined ? cfg.coreAffinity : s.coreAffinity;
                      const prio = cfg?.priorityLevel || s.defaultPriority;

                      return (
                        <tr
                          key={s.id}
                          onClick={() => {
                            setSelectedSourceId(s.id);
                            setActiveSubTab('config');
                          }}
                          className="hover:bg-[#1C1F2B] cursor-pointer transition-colors"
                        >
                          <td className="py-2.5 px-3 text-sky-400 font-bold">{s.sourceNum}</td>
                          <td className="py-2.5 px-3 font-semibold text-white">{s.id}</td>
                          <td className="py-2.5 px-3 text-[#8A8D98]">{s.category}</td>
                          <td className="py-2.5 px-3">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] ${
                                core === 0
                                  ? 'bg-sky-500/20 text-sky-300'
                                  : core === 1
                                  ? 'bg-emerald-500/20 text-emerald-300'
                                  : 'bg-purple-500/20 text-purple-300'
                              }`}
                            >
                              {core === 0 ? 'Core 0' : core === 1 ? 'Core 1' : 'Dual'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-amber-300">Level {prio}</td>
                          <td className="py-2.5 px-3 text-[#A0A4B2]">{s.triggerType}</td>
                          <td className="py-2.5 px-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                isEnabled
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                  : 'bg-[#242733] text-[#717585]'
                              }`}
                            >
                              {isEnabled ? 'AKTÍV' : 'INAKTÍV'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onTriggerInterrupt &&
                                  onTriggerInterrupt(s.id, core === 'both' ? 1 : core || 0);
                              }}
                              className="px-2 py-1 bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 rounded text-[10px] transition-colors"
                            >
                              Kiváltás
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
