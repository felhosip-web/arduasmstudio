/**
 * (c) 2026 AI Studio AVR & ESP32 Visual Studio
 * Timing, Clock Cycles, FreeRTOS Tasks & Power Consumption Profiler Modal
 * Interactive diagnostic laboratory for execution latency, FreeRTOS task CPU utilization, cycle count, and battery lifespan
 */

import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Clock,
  Zap,
  BatteryCharging,
  Cpu,
  Activity,
  AlertTriangle,
  Info,
  CheckCircle2,
  Copy,
  Check,
  TrendingDown,
  Layers,
  Sparkles,
  Sliders,
  Flame,
  Play,
  Pause,
  RotateCcw,
  ShieldAlert,
  Wifi,
  Server,
  Monitor,
  Radio,
  BarChart3,
  Gauge,
  ListFilter,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { ProgramBlock, VariableDefinition, McuTarget, MCU_TARGETS } from '../types';
import {
  profileProgramTiming,
  calculateFreeRtosProfile,
  TimingProfileReport,
  CpuFrequencyMhz,
  FreeRtosDualCoreProfile,
  FreeRtosTaskProfile,
} from '../utils/timingProfiler';

interface TimingProfilerModalProps {
  isOpen: boolean;
  onClose: () => void;
  blocks: ProgramBlock[];
  variables?: VariableDefinition[];
  targetMcu?: McuTarget;
}

export const TimingProfilerModal: React.FC<TimingProfilerModalProps> = ({
  isOpen,
  onClose,
  blocks,
  variables = [],
  targetMcu = 'avr',
}) => {
  const isEsp32 = targetMcu === 'esp32';

  const [freqMhz, setFreqMhz] = useState<CpuFrequencyMhz>(() => (isEsp32 ? 240 : 16));
  const [supplyVoltage, setSupplyVoltage] = useState<number>(() => (isEsp32 ? 3.3 : 5.0));
  const [activeTab, setActiveTab] = useState<'overview' | 'breakdown' | 'freertos' | 'battery'>(() =>
    isEsp32 ? 'freertos' : 'overview'
  );
  const [selectedScope, setSelectedScope] = useState<'all' | 'setup' | 'loop' | 'isr'>('all');
  const [copiedReport, setCopiedReport] = useState<boolean>(false);

  // FreeRTOS Interactive Simulation Options
  const [wifiLoad, setWifiLoad] = useState<'idle' | 'light' | 'moderate' | 'heavy'>('light');
  const [userTaskCore, setUserTaskCore] = useState<0 | 1>(1);
  const [hasDisplayTask, setHasDisplayTask] = useState<boolean>(false);
  const [hasSensorTask, setHasSensorTask] = useState<boolean>(false);
  const [tickRateHz, setTickRateHz] = useState<number>(1000);
  const [selectedCoreFilter, setSelectedCoreFilter] = useState<'all' | '0' | '1'>('all');

  // Real-time animation simulation for FreeRTOS Task time-slices
  const [isSimRunning, setIsSimRunning] = useState<boolean>(true);
  const [simTick, setSimTick] = useState<number>(0);
  const animFrameRef = useRef<number | null>(null);

  // Sync defaults when targetMcu changes
  useEffect(() => {
    if (isEsp32) {
      setFreqMhz(240);
      setSupplyVoltage(3.3);
    } else {
      setFreqMhz(16);
      setSupplyVoltage(5.0);
    }
  }, [isEsp32]);

  // Live simulation tick timer
  useEffect(() => {
    if (!isSimRunning || !isOpen) return;

    const interval = setInterval(() => {
      setSimTick((prev) => (prev + 1) % 1000);
    }, 120);

    return () => clearInterval(interval);
  }, [isSimRunning, isOpen]);

  // General AVR Timing Report
  const report: TimingProfileReport = useMemo(() => {
    return profileProgramTiming(blocks, freqMhz, supplyVoltage, variables);
  }, [blocks, freqMhz, supplyVoltage, variables]);

  // FreeRTOS Dual-Core Profile calculation
  const rtosProfile: FreeRtosDualCoreProfile = useMemo(() => {
    return calculateFreeRtosProfile(blocks, freqMhz, {
      wifiLoad,
      userTaskCore,
      hasDisplayTask,
      hasSensorTask,
      tickRateHz,
    });
  }, [blocks, freqMhz, wifiLoad, userTaskCore, hasDisplayTask, hasSensorTask, tickRateHz]);

  if (!isOpen) return null;

  const handleCopyReport = () => {
    let text = '';
    if (activeTab === 'freertos') {
      text = `=== ESP32 FREERTOS DUAL-CORE FELADAT ÉS CPU KIHASZNÁLTSÁG PROFIL ===
Időbélyeg: ${new Date().toLocaleTimeString()}
Architektúra: ESP32 Xtensa Dual-Core @ ${freqMhz} MHz (${supplyVoltage}V)
FreeRTOS Tick Rate: ${rtosProfile.tickRateHz} Hz (${rtosProfile.tickPeriodMs} ms/tick)

--- CPU MAG TERHELÉS ---
• PRO CPU (Core 0) Aktív: ${rtosProfile.core0ActiveUsagePercent}% (Üresjárat: ${rtosProfile.core0IdlePercent}%)
• APP CPU (Core 1) Aktív: ${rtosProfile.core1ActiveUsagePercent}% (Üresjárat: ${rtosProfile.core1IdlePercent}%)
• Kétmagos Átlagos Terhelés: ${rtosProfile.totalCombinedUsagePercent}%
• Kontextusváltások: ${rtosProfile.contextSwitchesPerSec.toLocaleString()} / sec
• Szabad Heap Memória: ${(rtosProfile.freeHeapBytes / 1024).toFixed(1)} KB / ${(rtosProfile.totalHeapBytes / 1024).toFixed(1)} KB

--- FELADATOK LISTÁJA & CPU IDŐRÉSZESEDÉS (%) ---
${rtosProfile.allTasks
  .map(
    (t) =>
      `• [Core ${t.core}] ${t.name.padEnd(26)} | CPU: ${t.cpuUsagePercent.toFixed(1)}% | Prioritás: ${t.priority} | Állapot: ${t.state} | Stack: ${t.stackHighWaterMarkBytes} B szabad`
  )
  .join('\n')}
`;
    } else {
      text = `=== ${isEsp32 ? 'ESP32 XTENSA' : 'ARDUINO UNO / ATMEGA328P'} ÓRACIKLUS ÉS IDŐZÍTÉSI AUDIT ===
Időbélyeg: ${report.timestamp}
Órajel Frekvencia: ${report.cpuFrequencyMhz} MHz (1 ciklus = ${report.cyclePeriodNs.toFixed(2)} ns)
Tápfeszültség: ${report.powerProfile.supplyVoltageV} V

--- IDŐZÍTÉSI EREDMÉNYEK ---
• Setup Inicializálás: ${report.setupTiming.totalTimeFormatted} (${report.setupTiming.totalCycles} óraciklus)
• Loop Ciklus Futásidő: ${report.loopTiming.totalTimeFormatted} (${report.loopTiming.totalCycles} óraciklus)
• Ciklusfrekvencia: ${report.loopFrequencyFormatted}
• Blokkoló Várakozási Arány (Delay %): ${report.blockingDelayPercentage}%
• ISR Megszakítás Futásidő: ${report.isrTiming.totalTimeFormatted} (${report.isrTiming.totalCycles} óraciklus)

--- FOGYASZTÁS ÉS AKKUMULÁTOR BECSLÉS ---
• Becsült Átlagos Áramfelvétel: ~${report.powerProfile.estimatedAverageCurrentMa} mA
• Becsült Teljesítményfelvétel: ~${report.powerProfile.totalPowerMw} mW
`;
    }

    navigator.clipboard.writeText(text);
    setCopiedReport(true);
    setTimeout(() => setCopiedReport(false), 2000);
  };

  const filteredBlocks = report.allBlockTimings.filter((b) => {
    if (selectedScope === 'all') return true;
    return b.scope === selectedScope;
  });

  const filteredTasks = rtosProfile.allTasks.filter((t) => {
    if (selectedCoreFilter === 'all') return true;
    return t.core.toString() === selectedCoreFilter;
  });

  return (
    <div
      id="modal-timing-profiler"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs font-sans"
    >
      <div className="bg-[#12141A] border border-[#2A2D35] rounded-xs shadow-[8px_8px_0px_#000] w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* MODAL HEADER */}
        <div className="px-4 py-3 bg-[#161920] border-b border-[#2A2D35] flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2.5">
            <div
              className={`p-2 rounded-xs border shadow-[2px_2px_0px_#000] ${
                isEsp32
                  ? 'border-sky-500/80 bg-sky-950/60 text-sky-400'
                  : 'border-amber-500/80 bg-amber-950/60 text-amber-400'
              }`}
            >
              {isEsp32 ? <Cpu className="w-5 h-5 animate-pulse" /> : <Clock className="w-5 h-5 animate-pulse" />}
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-bold text-sm sm:text-base uppercase tracking-tight text-white font-mono flex items-center gap-1.5">
                  <span>{isEsp32 ? 'ESP32 FreeRTOS & Időzítés Profiler' : 'Óraciklus-, Időzítés- & Fogyasztásbecslő'}</span>
                </h2>
                <span
                  className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-xs border shadow-[1px_1px_0px_#000] ${
                    isEsp32
                      ? 'bg-[#0f172a] text-sky-400 border-sky-500/50'
                      : 'bg-[#1A1D24] text-amber-400 border-[#3A3F4B]'
                  }`}
                >
                  {isEsp32 ? 'ESP32 Dual-Core (240 MHz)' : '16 MHz AVR Profiler'}
                </span>
              </div>
              <p className="text-[11px] text-[#8A8D98]">
                {isEsp32
                  ? 'FreeRTOS preemptív taszkok CPU kihasználtsága, dual-core terhelés és időszeletek'
                  : 'Gépi kódú futásidő (ns/µs/ms), ciklusfrekvencia és valós áramfelvételi becslés'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyReport}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-mono bg-[#1A1D24] hover:bg-[#2A2D35] text-[#E0E0E6] border border-[#3A3F4B] rounded-xs shadow-[2px_2px_0px_#000] transition-colors cursor-pointer"
              title="Audit adatok másolása vágólapra"
            >
              {copiedReport ? (
                <Check className="w-3.5 h-3.5 text-[#4ade80]" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-[#8A8D98]" />
              )}
              <span className="hidden sm:inline">Jelentés Másolása</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 px-2.5 text-xs font-mono font-bold bg-[#1A1D24] hover:bg-rose-950/40 text-[#8A8D98] hover:text-rose-300 border border-[#3A3F4B] hover:border-rose-500/50 rounded-xs transition-colors cursor-pointer"
            >
              ✕ Bezárás
            </button>
          </div>
        </div>

        {/* CONTROLS BANNER: FREQUENCY & VOLTAGE SELECTION */}
        <div className="px-4 py-2 bg-[#0F1115] border-b border-[#2A2D35] flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Cpu className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-[#8A8D98]">Órajel:</span>
              <div className="flex items-center gap-1">
                {(isEsp32
                  ? ([240, 160, 80] as CpuFrequencyMhz[])
                  : ([16, 8, 20, 1] as CpuFrequencyMhz[])
                ).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFreqMhz(f)}
                    className={`px-2 py-0.5 rounded-xs border transition-colors cursor-pointer ${
                      freqMhz === f
                        ? isEsp32
                          ? 'bg-sky-500 text-black font-bold border-sky-400'
                          : 'bg-amber-500 text-black font-bold border-amber-400'
                        : 'bg-[#161920] text-[#8A8D98] border-[#2A2D35] hover:text-white'
                    }`}
                  >
                    {f} MHz {f === 240 ? '(ESP32 Max)' : f === 16 ? '(Uno)' : ''}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Zap className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-[#8A8D98]">Táp:</span>
              <div className="flex items-center gap-1">
                {(isEsp32 ? [3.3] : [5.0, 3.3]).map((v) => (
                  <button
                    key={v}
                    onClick={() => setSupplyVoltage(v)}
                    className={`px-2 py-0.5 rounded-xs border transition-colors cursor-pointer ${
                      supplyVoltage === v
                        ? 'bg-cyan-500 text-black font-bold border-cyan-400'
                        : 'bg-[#161920] text-[#8A8D98] border-[#2A2D35] hover:text-white'
                    }`}
                  >
                    {v} V
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="text-[11px] text-[#8A8D98]">
            1 Óraciklus = <strong className="text-white">{report.cyclePeriodNs.toFixed(2)} ns</strong>
          </div>
        </div>

        {/* NAVIGATION TABS */}
        <div className="px-4 py-2 bg-[#161920] border-b border-[#2A2D35] flex items-center justify-between gap-2 flex-wrap font-mono text-xs">
          <div className="flex items-center gap-1 flex-wrap">
            {/* TAB 1: FreeRTOS Tasks (Highlights on ESP32) */}
            <button
              id="tab-freertos-tasks"
              onClick={() => setActiveTab('freertos')}
              className={`px-3 py-1 rounded-xs border transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'freertos'
                  ? 'bg-sky-400 text-black font-bold border-sky-400 shadow-[1px_1px_0px_#000]'
                  : 'bg-[#1A1D24] text-[#8A8D98] border-[#3A3F4B] hover:text-white'
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>FreeRTOS Taszkok & CPU % ({rtosProfile.allTasks.length})</span>
              <span className="text-[9px] px-1 bg-black/30 rounded-xs font-mono uppercase tracking-tight ml-0.5">
                ESP32
              </span>
            </button>

            {/* TAB 2: Overview */}
            <button
              id="tab-timing-overview"
              onClick={() => setActiveTab('overview')}
              className={`px-3 py-1 rounded-xs border transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'overview'
                  ? 'bg-amber-400 text-black font-bold border-amber-400 shadow-[1px_1px_0px_#000]'
                  : 'bg-[#1A1D24] text-[#8A8D98] border-[#3A3F4B] hover:text-white'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Áttekintés & Javaslatok ({report.tips.length})</span>
            </button>

            {/* TAB 3: Breakdown Table */}
            <button
              id="tab-timing-breakdown"
              onClick={() => setActiveTab('breakdown')}
              className={`px-3 py-1 rounded-xs border transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'breakdown'
                  ? 'bg-amber-400 text-black font-bold border-amber-400 shadow-[1px_1px_0px_#000]'
                  : 'bg-[#1A1D24] text-[#8A8D98] border-[#3A3F4B] hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Blokk Futásidő Táblázat ({report.allBlockTimings.length})</span>
            </button>

            {/* TAB 4: Battery */}
            <button
              id="tab-timing-battery"
              onClick={() => setActiveTab('battery')}
              className={`px-3 py-1 rounded-xs border transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'battery'
                  ? 'bg-amber-400 text-black font-bold border-amber-400 shadow-[1px_1px_0px_#000]'
                  : 'bg-[#1A1D24] text-[#8A8D98] border-[#3A3F4B] hover:text-white'
              }`}
            >
              <BatteryCharging className="w-3.5 h-3.5" />
              <span>Akkumulátoros Élettartam</span>
            </button>
          </div>
        </div>

        {/* MODAL BODY */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-[#0F1115]">
          {/* ========================================================================= */}
          {/* TAB: ESP32 FREERTOS TASK CPU UTILIZATION PROFILER (NEW VIEW)             */}
          {/* ========================================================================= */}
          {activeTab === 'freertos' && (
            <div className="space-y-4 font-mono text-xs">
              {/* Dual-Core CPU Load KPI Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Card 1: Core 0 (PRO CPU) */}
                <div className="p-3 bg-[#161920] border border-[#2A2D35] rounded-xs shadow-[2px_2px_0px_#000] space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-1.5 text-sky-400 font-bold">
                      <Cpu className="w-3.5 h-3.5" />
                      <span>CORE 0 (PRO CPU)</span>
                    </div>
                    <span className="text-[#8A8D98]">Protokoll & Wi-Fi</span>
                  </div>

                  <div className="flex items-baseline justify-between">
                    <span className="text-2xl font-extrabold text-sky-400">
                      {rtosProfile.core0ActiveUsagePercent.toFixed(1)}%
                    </span>
                    <span className="text-[10px] text-[#8A8D98]">
                      Üresjárat: {rtosProfile.core0IdlePercent.toFixed(1)}%
                    </span>
                  </div>

                  {/* Core 0 Stacked Bar */}
                  <div className="w-full h-2.5 bg-[#0F1115] rounded-xs border border-[#2A2D35] overflow-hidden flex">
                    {rtosProfile.core0Tasks.map((t) => (
                      <div
                        key={t.id}
                        style={{
                          width: `${t.cpuUsagePercent}%`,
                          backgroundColor: t.color,
                        }}
                        className="h-full transition-all duration-300"
                        title={`${t.name}: ${t.cpuUsagePercent}%`}
                      />
                    ))}
                  </div>
                </div>

                {/* Card 2: Core 1 (APP CPU) */}
                <div className="p-3 bg-[#161920] border border-[#2A2D35] rounded-xs shadow-[2px_2px_0px_#000] space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-1.5 text-[#4ade80] font-bold">
                      <Cpu className="w-3.5 h-3.5" />
                      <span>CORE 1 (APP CPU)</span>
                    </div>
                    <span className="text-[#8A8D98]">Arduino App & I/O</span>
                  </div>

                  <div className="flex items-baseline justify-between">
                    <span className="text-2xl font-extrabold text-[#4ade80]">
                      {rtosProfile.core1ActiveUsagePercent.toFixed(1)}%
                    </span>
                    <span className="text-[10px] text-[#8A8D98]">
                      Üresjárat: {rtosProfile.core1IdlePercent.toFixed(1)}%
                    </span>
                  </div>

                  {/* Core 1 Stacked Bar */}
                  <div className="w-full h-2.5 bg-[#0F1115] rounded-xs border border-[#2A2D35] overflow-hidden flex">
                    {rtosProfile.core1Tasks.map((t) => (
                      <div
                        key={t.id}
                        style={{
                          width: `${t.cpuUsagePercent}%`,
                          backgroundColor: t.color,
                        }}
                        className="h-full transition-all duration-300"
                        title={`${t.name}: ${t.cpuUsagePercent}%`}
                      />
                    ))}
                  </div>
                </div>

                {/* Card 3: Dual-Core Total Average & Context Switches */}
                <div className="p-3 bg-[#161920] border border-[#2A2D35] rounded-xs shadow-[2px_2px_0px_#000] space-y-1.5 flex flex-col justify-between">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-[#8A8D98] font-bold">ÖSSZESÍTETT CPU TERHELÉS</span>
                    <span className="text-[10px] text-amber-400">
                      {rtosProfile.tickRateHz} Hz Tick
                    </span>
                  </div>

                  <div className="text-xl font-extrabold text-amber-400">
                    ~{rtosProfile.totalCombinedUsagePercent.toFixed(1)}% / 200%
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-[#8A8D98] pt-1 border-t border-[#2A2D35]">
                    <span>Kontextusváltás:</span>
                    <span className="text-white font-bold">
                      {rtosProfile.contextSwitchesPerSec.toLocaleString()} / sec
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-[#8A8D98]">
                    <span>Szabad Heap:</span>
                    <span className="text-emerald-400 font-bold">
                      {(rtosProfile.freeHeapBytes / 1024).toFixed(1)} KB (320 KB)
                    </span>
                  </div>
                </div>
              </div>

              {/* Task Watchdog Timer Warning (If applicable) */}
              {rtosProfile.watchdogWarning && (
                <div className="p-3 bg-rose-950/40 border border-rose-500/60 rounded-xs text-rose-300 flex items-start gap-2.5 shadow-[2px_2px_0px_#000]">
                  <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                  <div className="space-y-1 text-xs">
                    <div className="font-bold text-rose-200">
                      Figyelmeztetés: Task Watchdog Timer (TWDT) kiakadás kockázat!
                    </div>
                    <div className="text-[11px] leading-relaxed">
                      {rtosProfile.watchdogWarningMessage}
                    </div>
                    <div className="text-[10px] text-rose-400 font-bold pt-0.5">
                      Javaslat: Használj <code className="bg-black/40 px-1 py-0.5 rounded">vTaskDelay(pdMS_TO_TICKS(10));</code> hívást, hogy a FreeRTOS IDLE taszk átvehesse a vezérlést és resetelje a Watchdogot!
                    </div>
                  </div>
                </div>
              )}

              {/* Real-time Animated Time-Slice Timeline (Gantt Scheduler Simulation) */}
              <div className="p-3 bg-[#161920] border border-[#2A2D35] rounded-xs shadow-[2px_2px_0px_#000] space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-sky-400" />
                    <span className="font-bold text-white uppercase text-[11px]">
                      Preemptív FreeRTOS Ütemező Időszelet Szimuláció (1 ms / Tick)
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setIsSimRunning(!isSimRunning)}
                      className={`px-2 py-0.5 rounded-xs border text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors ${
                        isSimRunning
                          ? 'bg-amber-500 text-black border-amber-400'
                          : 'bg-[#1A1D24] text-[#8A8D98] border-[#3A3F4B]'
                      }`}
                    >
                      {isSimRunning ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                      <span>{isSimRunning ? 'Megállítás' : 'Indítás'}</span>
                    </button>

                    <button
                      onClick={() => setSimTick(0)}
                      className="px-2 py-0.5 rounded-xs border border-[#3A3F4B] bg-[#1A1D24] text-[#8A8D98] hover:text-white text-[10px] flex items-center gap-1 cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Nullázás</span>
                    </button>
                  </div>
                </div>

                {/* Animated Core 0 Timeline Track */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[10px] text-[#8A8D98]">
                    <span className="text-sky-400 font-bold">CORE 0 Track:</span>
                    <span>Aktív feladat: {simTick % 4 === 0 ? 'wifi_task' : simTick % 7 === 0 ? 'tiT' : 'IDLE0'}</span>
                  </div>
                  <div className="h-6 bg-[#0F1115] border border-[#2A2D35] rounded-xs flex overflow-hidden p-0.5 gap-0.5">
                    {Array.from({ length: 24 }).map((_, i) => {
                      const pos = (simTick + i) % 24;
                      let taskColor = '#334155'; // IDLE0
                      let taskName = 'IDLE0';
                      if (pos % 5 === 0) {
                        taskColor = '#38bdf8'; // wifi_task
                        taskName = 'wifi_task';
                      } else if (pos % 8 === 0) {
                        taskColor = '#0284c7'; // tiT
                        taskName = 'tiT';
                      } else if (pos % 12 === 0) {
                        taskColor = '#818cf8'; // Tmr_Svc
                        taskName = 'Tmr_Svc';
                      }
                      return (
                        <div
                          key={i}
                          style={{ backgroundColor: taskColor }}
                          className="flex-1 h-full rounded-2xs opacity-90 transition-all hover:opacity-100"
                          title={`Tick ${i}: ${taskName}`}
                        />
                      );
                    })}
                  </div>
                </div>

                {/* Animated Core 1 Timeline Track */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[10px] text-[#8A8D98]">
                    <span className="text-[#4ade80] font-bold">CORE 1 Track:</span>
                    <span>
                      Aktív feladat: {rtosProfile.core1ActiveUsagePercent > 70 ? 'loopTask (100% CPU)' : simTick % 3 === 0 ? 'loopTask' : 'IDLE1'}
                    </span>
                  </div>
                  <div className="h-6 bg-[#0F1115] border border-[#2A2D35] rounded-xs flex overflow-hidden p-0.5 gap-0.5">
                    {Array.from({ length: 24 }).map((_, i) => {
                      const pos = (simTick + i) % 24;
                      let taskColor = '#334155'; // IDLE1
                      let taskName = 'IDLE1';

                      if (rtosProfile.core1ActiveUsagePercent > 80) {
                        taskColor = '#4ade80'; // Full loopTask
                        taskName = 'loopTask';
                      } else if (pos % 3 === 0) {
                        taskColor = '#4ade80';
                        taskName = 'loopTask';
                      } else if (hasSensorTask && pos % 7 === 0) {
                        taskColor = '#f59e0b';
                        taskName = 'sensor_task';
                      } else if (hasDisplayTask && pos % 9 === 0) {
                        taskColor = '#ec4899';
                        taskName = 'display_task';
                      }
                      return (
                        <div
                          key={i}
                          style={{ backgroundColor: taskColor }}
                          className="flex-1 h-full rounded-2xs opacity-90 transition-all hover:opacity-100"
                          title={`Tick ${i}: ${taskName}`}
                        />
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Interactive Simulation Parameters Bar */}
              <div className="p-3 bg-[#161920] border border-[#2A2D35] rounded-xs space-y-3">
                <div className="font-bold text-white uppercase text-[11px] flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-amber-400" />
                  <span>Szimulációs Terhelési Paraméterek & Feladat Konfiguráció</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-[11px]">
                  {/* Option 1: Wi-Fi Traffic Load */}
                  <div className="space-y-1">
                    <label className="text-[#8A8D98] flex items-center gap-1">
                      <Wifi className="w-3 h-3 text-sky-400" />
                      <span>Wi-Fi Forgalom Terhelés:</span>
                    </label>
                    <select
                      value={wifiLoad}
                      onChange={(e) => setWifiLoad(e.target.value as any)}
                      className="w-full bg-[#0F1115] border border-[#2A2D35] rounded-xs px-2 py-1 text-[#E0E0E6] focus:border-sky-400 outline-hidden cursor-pointer font-mono text-xs"
                    >
                      <option value="idle">Kikapcsolva / Standby (~0.5%)</option>
                      <option value="light">Alacsony Forgalom (~4%)</option>
                      <option value="moderate">Közepes HTTP/MQTT (~15%)</option>
                      <option value="heavy">Nagy WS/Video Stream (~33%)</option>
                    </select>
                  </div>

                  {/* Option 2: loopTask Pinned Core */}
                  <div className="space-y-1">
                    <label className="text-[#8A8D98] flex items-center gap-1">
                      <Cpu className="w-3 h-3 text-[#4ade80]" />
                      <span>loopTask Mag Hozzárendelés:</span>
                    </label>
                    <div className="grid grid-cols-2 gap-1">
                      <button
                        onClick={() => setUserTaskCore(1)}
                        className={`px-2 py-1 rounded-xs border transition-colors cursor-pointer text-center ${
                          userTaskCore === 1
                            ? 'bg-[#4ade80] text-black font-bold border-[#4ade80]'
                            : 'bg-[#0F1115] text-[#8A8D98] border-[#2A2D35] hover:text-white'
                        }`}
                      >
                        Core 1 (Alap)
                      </button>
                      <button
                        onClick={() => setUserTaskCore(0)}
                        className={`px-2 py-1 rounded-xs border transition-colors cursor-pointer text-center ${
                          userTaskCore === 0
                            ? 'bg-sky-400 text-black font-bold border-sky-400'
                            : 'bg-[#0F1115] text-[#8A8D98] border-[#2A2D35] hover:text-white'
                        }`}
                      >
                        Core 0 (PRO)
                      </button>
                    </div>
                  </div>

                  {/* Option 3: Additional Background Tasks */}
                  <div className="space-y-1">
                    <label className="text-[#8A8D98] flex items-center gap-1">
                      <Server className="w-3 h-3 text-amber-400" />
                      <span>Háttérfeladatok Bekapcsolása:</span>
                    </label>
                    <div className="flex items-center gap-2 pt-0.5">
                      <label className="flex items-center gap-1 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={hasSensorTask}
                          onChange={(e) => setHasSensorTask(e.target.checked)}
                          className="accent-amber-400"
                        />
                        <span>Szenzor Task</span>
                      </label>

                      <label className="flex items-center gap-1 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={hasDisplayTask}
                          onChange={(e) => setHasDisplayTask(e.target.checked)}
                          className="accent-pink-400"
                        />
                        <span>Kijelző Task</span>
                      </label>
                    </div>
                  </div>

                  {/* Option 4: FreeRTOS Tick Rate */}
                  <div className="space-y-1">
                    <label className="text-[#8A8D98] flex items-center gap-1">
                      <Clock className="w-3 h-3 text-purple-400" />
                      <span>Tick Rate (configTICK_RATE_HZ):</span>
                    </label>
                    <div className="grid grid-cols-2 gap-1">
                      <button
                        onClick={() => setTickRateHz(1000)}
                        className={`px-2 py-1 rounded-xs border transition-colors cursor-pointer text-center ${
                          tickRateHz === 1000
                            ? 'bg-purple-500 text-white font-bold border-purple-400'
                            : 'bg-[#0F1115] text-[#8A8D98] border-[#2A2D35] hover:text-white'
                        }`}
                      >
                        1000 Hz (1ms)
                      </button>
                      <button
                        onClick={() => setTickRateHz(100)}
                        className={`px-2 py-1 rounded-xs border transition-colors cursor-pointer text-center ${
                          tickRateHz === 100
                            ? 'bg-purple-500 text-white font-bold border-purple-400'
                            : 'bg-[#0F1115] text-[#8A8D98] border-[#2A2D35] hover:text-white'
                        }`}
                      >
                        100 Hz (10ms)
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* FreeRTOS Tasks Detailed Breakdown Table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="font-bold text-white uppercase text-[11px] flex items-center gap-1.5">
                    <BarChart3 className="w-3.5 h-3.5 text-sky-400" />
                    <span>FreeRTOS Taszkok CPU-Idő Kihasználtsága Százalékos Bontásban</span>
                  </div>

                  {/* Core Filter */}
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-[#8A8D98]">Szűrés Mag szerint:</span>
                    {(['all', '0', '1'] as const).map((coreOpt) => (
                      <button
                        key={coreOpt}
                        onClick={() => setSelectedCoreFilter(coreOpt)}
                        className={`px-2 py-0.5 rounded-xs border text-[10px] font-bold cursor-pointer transition-colors ${
                          selectedCoreFilter === coreOpt
                            ? 'bg-sky-400 text-black border-sky-400'
                            : 'bg-[#161920] text-[#8A8D98] border-[#2A2D35] hover:text-white'
                        }`}
                      >
                        {coreOpt === 'all' ? 'Mindkét Mag' : `Core ${coreOpt}`}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Table Container */}
                <div className="border border-[#2A2D35] rounded-xs overflow-hidden bg-[#161920]">
                  {/* Table Header */}
                  <div className="grid grid-cols-12 gap-2 p-2.5 bg-[#12141A] border-b border-[#2A2D35] text-[#8A8D98] font-bold text-[10px] uppercase">
                    <div className="col-span-3">Taszk Név & Leírás</div>
                    <div className="col-span-1 text-center">Mag</div>
                    <div className="col-span-1 text-center">Prioritás</div>
                    <div className="col-span-1 text-center">Állapot</div>
                    <div className="col-span-2 text-right">Stack (Szabad / Összes)</div>
                    <div className="col-span-4">CPU-Idő Kihasználtság (%)</div>
                  </div>

                  {/* Table Rows */}
                  <div className="divide-y divide-[#2A2D35] max-h-80 overflow-y-auto">
                    {filteredTasks.map((task) => (
                      <div
                        key={task.id}
                        className="grid grid-cols-12 gap-2 p-2.5 items-center hover:bg-[#1A1D24] transition-colors text-[11px]"
                      >
                        {/* Task Name */}
                        <div className="col-span-3">
                          <div className="font-bold text-white flex items-center gap-1.5">
                            <span
                              className="w-2 h-2 rounded-2xs inline-block shrink-0"
                              style={{ backgroundColor: task.color }}
                            />
                            <span className="truncate">{task.name}</span>
                          </div>
                          <div className="text-[10px] text-[#8A8D98] truncate pl-3.5">
                            {task.description}
                          </div>
                        </div>

                        {/* Core */}
                        <div className="col-span-1 text-center">
                          <span
                            className={`px-1.5 py-0.5 rounded-xs text-[10px] font-bold border ${
                              task.core === 0
                                ? 'bg-sky-950/60 text-sky-400 border-sky-500/40'
                                : 'bg-emerald-950/60 text-[#4ade80] border-emerald-500/40'
                            }`}
                          >
                            Core {task.core}
                          </span>
                        </div>

                        {/* Priority */}
                        <div className="col-span-1 text-center font-bold text-[#E0E0E6]">
                          {task.priority}
                        </div>

                        {/* State */}
                        <div className="col-span-1 text-center">
                          <span
                            className={`px-1.5 py-0.5 rounded-xs text-[9px] font-bold ${
                              task.state === 'Running'
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : task.state === 'Ready'
                                ? 'bg-sky-500/20 text-sky-300'
                                : 'bg-slate-500/20 text-slate-300'
                            }`}
                          >
                            {task.state}
                          </span>
                        </div>

                        {/* Stack High Watermark */}
                        <div className="col-span-2 text-right">
                          <div className="font-bold text-white">
                            {task.stackHighWaterMarkBytes} B
                          </div>
                          <div className="text-[9px] text-[#8A8D98]">
                            / {task.allocatedStackBytes} B
                          </div>
                        </div>

                        {/* CPU Usage % Bar & Metric */}
                        <div className="col-span-4 space-y-1">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-bold font-mono" style={{ color: task.color }}>
                              {task.cpuUsagePercent.toFixed(1)}%
                            </span>
                            <span className="text-[9px] text-[#8A8D98]">
                              ~{task.executionTimeUs.toLocaleString()} µs / s ({task.contextSwitches} csw)
                            </span>
                          </div>

                          <div className="w-full h-2 bg-[#0F1115] rounded-xs border border-[#2A2D35] overflow-hidden">
                            <div
                              style={{
                                width: `${Math.min(100, task.cpuUsagePercent)}%`,
                                backgroundColor: task.color,
                              }}
                              className="h-full transition-all duration-300"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* FreeRTOS Optimization & Best Practice Notes */}
              <div className="p-3 bg-[#0E151A] border border-sky-500/40 rounded-xs space-y-1 text-xs text-[#8A8D98]">
                <div className="font-bold text-sky-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                  <span>FreeRTOS Kétmagos Teljesítmény & Időzítés Útmutató</span>
                </div>
                <p className="leading-relaxed">
                  • <strong>Dual-Core Előny</strong>: Az ESP32 Core 0 magja önállóan futtatja a Wi-Fi és TCP/IP hálózati stacket, így a Core 1 magon futó Arduino vezérlőfeladat (loopTask) akadozásmentesen, valós időben tudja végezni a motorvezérlést, mintavételezést és I/O műveleteket.
                  <br />
                  • <strong>vTaskDelay vs delay()</strong>: A FreeRTOS alapú környezetben a klasszikus <code className="text-amber-300 font-mono">delay()</code> hívás belsőleg <code className="text-sky-300 font-mono">vTaskDelay()</code>-re fordul, amely azonnal átadja a CPU-t a háttérfeladatoknak és az IDLE taszknak.
                </p>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB: OVERVIEW & GENERAL OPTIMIZATIONS                                     */}
          {/* ========================================================================= */}
          {activeTab === 'overview' && (
            <div className="space-y-4">
              {/* KPI Cards Bar */}
              <div className="p-3 bg-[#161920] border border-[#2A2D35] rounded-xs grid grid-cols-2 sm:grid-cols-4 gap-2.5 font-mono shadow-[2px_2px_0px_#000]">
                {/* Card 1: Loop Time */}
                <div className="p-2.5 rounded-xs bg-[#12141A] border border-[#2A2D35] flex flex-col justify-between">
                  <div className="text-[10px] text-[#8A8D98] uppercase">Loop Ciklusidő</div>
                  <div className="text-sm sm:text-base font-bold text-amber-400">
                    {report.loopTiming.totalTimeFormatted}
                  </div>
                  <div className="text-[10px] text-[#8A8D98]">
                    {report.loopTiming.totalCycles.toLocaleString()} óraciklus
                  </div>
                </div>

                {/* Card 2: Frequency */}
                <div className="p-2.5 rounded-xs bg-[#12141A] border border-[#2A2D35] flex flex-col justify-between">
                  <div className="text-[10px] text-[#8A8D98] uppercase">Ciklusfrekvencia</div>
                  <div className="text-sm sm:text-base font-bold text-[#4ade80]">
                    {report.loopFrequencyFormatted}
                  </div>
                  <div className="text-[10px] text-[#8A8D98]">ismétlés / másodperc</div>
                </div>

                {/* Card 3: Blocking Delay Ratio */}
                <div className="p-2.5 rounded-xs bg-[#12141A] border border-[#2A2D35] flex flex-col justify-between">
                  <div className="text-[10px] text-[#8A8D98] uppercase">Blokkoló Késleltetés</div>
                  <div
                    className={`text-sm sm:text-base font-bold ${
                      report.blockingDelayPercentage > 80
                        ? 'text-rose-400'
                        : report.blockingDelayPercentage > 30
                        ? 'text-amber-400'
                        : 'text-[#4ade80]'
                    }`}
                  >
                    {report.blockingDelayPercentage}% Delay
                  </div>
                  <div className="text-[10px] text-[#8A8D98]">CPU várakozási arány</div>
                </div>

                {/* Card 4: Estimated Current */}
                <div className="p-2.5 rounded-xs bg-[#12141A] border border-[#2A2D35] flex flex-col justify-between">
                  <div className="text-[10px] text-[#8A8D98] uppercase">Áramfelvétel & Telj.</div>
                  <div className="text-sm sm:text-base font-bold text-cyan-300">
                    ~{report.powerProfile.estimatedAverageCurrentMa} mA
                  </div>
                  <div className="text-[10px] text-[#8A8D98]">
                    ~{report.powerProfile.totalPowerMw} mW @ {supplyVoltage}V
                  </div>
                </div>
              </div>

              {/* Scope summaries */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 font-mono">
                {/* Setup */}
                <div className="p-3 rounded-xs bg-[#161920] border border-[#2A2D35] space-y-1.5 shadow-[2px_2px_0px_#000]">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#8A8D98] font-bold">SETUP SZAKASZ</span>
                    <span className="text-[10px] bg-[#1A1D24] px-1.5 py-0.5 rounded-xs border border-[#3A3F4B]">
                      {report.setupTiming.blockCount} blokk
                    </span>
                  </div>
                  <div className="text-base font-bold text-white">
                    {report.setupTiming.totalTimeFormatted}
                  </div>
                  <div className="text-[11px] text-[#8A8D98]">
                    {report.setupTiming.totalCycles.toLocaleString()} óraciklus (egyszer fut le)
                  </div>
                </div>

                {/* Loop */}
                <div className="p-3 rounded-xs bg-[#161920] border border-[#2A2D35] space-y-1.5 shadow-[2px_2px_0px_#000]">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-amber-400 font-bold">LOOP CIKLUS</span>
                    <span className="text-[10px] bg-[#1A1D24] px-1.5 py-0.5 rounded-xs border border-[#3A3F4B]">
                      {report.loopTiming.blockCount} blokk
                    </span>
                  </div>
                  <div className="text-base font-bold text-amber-400">
                    {report.loopTiming.totalTimeFormatted}
                  </div>
                  <div className="text-[11px] text-[#8A8D98]">
                    {report.loopTiming.totalCycles.toLocaleString()} óraciklus / kör
                  </div>
                </div>

                {/* ISR */}
                <div className="p-3 rounded-xs bg-[#161920] border border-[#2A2D35] space-y-1.5 shadow-[2px_2px_0px_#000]">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-cyan-400 font-bold">ISR MEGSZAKÍTÁS</span>
                    <span className="text-[10px] bg-[#1A1D24] px-1.5 py-0.5 rounded-xs border border-[#3A3F4B]">
                      {report.isrTiming.blockCount} blokk
                    </span>
                  </div>
                  <div className="text-base font-bold text-cyan-400">
                    {report.isrTiming.totalTimeFormatted}
                  </div>
                  <div className="text-[11px] text-[#8A8D98]">
                    {report.isrTiming.totalCycles.toLocaleString()} óraciklus / esemény
                  </div>
                </div>
              </div>

              {/* Optimization Recommendations */}
              <div className="space-y-2 font-mono">
                <div className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Optimalizációs Javaslatok & Teljesítmény Audit</span>
                </div>

                {report.tips.length === 0 ? (
                  <div className="p-4 bg-[#161920] border border-[#2A2D35] rounded-xs text-xs text-[#8A8D98] flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#4ade80]" />
                    <span>Az időzítési struktúra optimális! Nincs kritikus késleltetési vagy teljesítménybeli szűk keresztmetszet.</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {report.tips.map((tip) => (
                      <div
                        key={tip.id}
                        className={`p-3 rounded-xs border shadow-[2px_2px_0px_#000] space-y-1 ${
                          tip.severity === 'high'
                            ? 'bg-[#181210] border-amber-500/60'
                            : 'bg-[#0E151A] border-cyan-500/50'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded-xs uppercase ${
                              tip.severity === 'high'
                                ? 'bg-amber-500 text-black'
                                : 'bg-cyan-500 text-black'
                            }`}
                          >
                            {tip.severity}
                          </span>
                          <span className="font-bold text-white text-xs">{tip.title}</span>
                        </div>
                        <p className="text-[11px] text-[#C5C8D4] leading-relaxed pl-1">
                          {tip.description}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB: BLOCK TIMING BREAKDOWN TABLE                                         */}
          {/* ========================================================================= */}
          {activeTab === 'breakdown' && (
            <div className="space-y-3 font-mono">
              {/* Filter by scope */}
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-1">
                  <span className="text-xs text-[#8A8D98] mr-1">Szűrés:</span>
                  {(['all', 'setup', 'loop', 'isr'] as const).map((sc) => (
                    <button
                      key={sc}
                      onClick={() => setSelectedScope(sc)}
                      className={`px-2.5 py-0.5 text-xs rounded-xs border transition-colors cursor-pointer ${
                        selectedScope === sc
                          ? 'bg-amber-500 text-black font-bold border-amber-400'
                          : 'bg-[#161920] text-[#8A8D98] border-[#2A2D35] hover:text-white'
                      }`}
                    >
                      {sc.toUpperCase()}
                    </button>
                  ))}
                </div>

                <div className="text-[11px] text-[#8A8D98]">
                  Megjelenítve: {filteredBlocks.length} db blokk
                </div>
              </div>

              {/* Table */}
              <div className="border border-[#2A2D35] rounded-xs overflow-hidden bg-[#161920] font-mono text-xs">
                <div className="grid grid-cols-12 gap-2 p-2.5 bg-[#12141A] border-b border-[#2A2D35] text-[#8A8D98] font-bold text-[11px]">
                  <div className="col-span-1">#</div>
                  <div className="col-span-4">Blokk Megnevezése</div>
                  <div className="col-span-2">Szakasz</div>
                  <div className="col-span-2 text-right">Óraciklusok</div>
                  <div className="col-span-3 text-right">Végrehajtási Idő</div>
                </div>

                <div className="divide-y divide-[#2A2D35] max-h-96 overflow-y-auto">
                  {filteredBlocks.map((b, idx) => (
                    <div
                      key={b.blockId}
                      className={`grid grid-cols-12 gap-2 p-2 items-center hover:bg-[#1A1D24] transition-colors ${
                        b.isBlockingDelay ? 'bg-amber-950/20 text-amber-300' : 'text-[#E0E0E6]'
                      }`}
                    >
                      <div className="col-span-1 text-[#8A8D98]">{idx + 1}</div>
                      <div className="col-span-4 font-bold truncate flex items-center gap-1.5">
                        <span>{b.blockName}</span>
                        {b.isBlockingDelay && (
                          <span className="text-[9px] px-1 py-0.2 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-xs">
                            DELAY
                          </span>
                        )}
                      </div>
                      <div className="col-span-2">
                        <span className="text-[10px] px-1.5 py-0.5 bg-[#12141A] rounded-xs border border-[#2A2D35]">
                          {b.scope.toUpperCase()}
                        </span>
                      </div>
                      <div className="col-span-2 text-right font-bold">
                        {b.cycles.toLocaleString()}
                      </div>
                      <div className="col-span-3 text-right font-bold text-amber-400">
                        {b.timeFormatted}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB: BATTERY LIFESPAN SIMULATOR                                          */}
          {/* ========================================================================= */}
          {activeTab === 'battery' && (
            <div className="space-y-4 font-mono">
              <div className="p-3 bg-[#161920] border border-[#2A2D35] rounded-xs text-xs text-[#8A8D98] flex items-center gap-2">
                <BatteryCharging className="w-4 h-4 text-cyan-400" />
                <span>
                  Akkumulátoros élettartam becslés ~<strong>{report.powerProfile.estimatedAverageCurrentMa} mA</strong> átlagos áramfelvétel mellett:
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 font-mono">
                {report.powerProfile.batteryLifeHours.map((bat) => (
                  <div
                    key={bat.batteryName}
                    className="p-3 rounded-xs bg-[#161920] border border-[#2A2D35] shadow-[2px_2px_0px_#000] space-y-1.5"
                  >
                    <div className="text-xs font-bold text-white truncate">{bat.batteryName}</div>
                    <div className="text-lg font-black text-cyan-300">{bat.daysFormatted}</div>
                    <div className="text-[10px] text-[#8A8D98]">Kapacitás: {bat.capacityMah} mAh</div>
                  </div>
                ))}
              </div>

              <div className="p-3 bg-[#0A0C0F] border border-[#2A2D35] rounded-xs text-xs text-[#8A8D98] space-y-1">
                <div className="font-bold text-white font-mono flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5 text-amber-400" />
                  <span>Hogyan növelhető az akkumulátor élettartama?</span>
                </div>
                <p className="leading-relaxed">
                  1. Használj <strong>Deep-Sleep vagy Light-Sleep módot</strong> (ESP32-nél ~10 µA áramfelvétel).
                  <br />
                  2. Kapcsold le a Wi-Fi / Bluetooth rádiómodult (<code className="text-white">WiFi.mode(WIFI_OFF)</code>), amikor nincs aktív adatátvitel.
                  <br />
                  3. Csökkentsd az órajelet 240 MHz-ről 80 MHz-re alacsony terhelésű I/O műveleteknél.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* MODAL FOOTER */}
        <div className="px-4 py-2.5 bg-[#161920] border-t border-[#2A2D35] flex items-center justify-between gap-3 text-xs font-mono">
          <div className="text-[#8A8D98] text-[11px] hidden sm:block">
            {isEsp32
              ? 'ESP32 Dual Xtensa LX6 @ 240 MHz • FreeRTOS Preemptív Ütemező & Core 0/1 Taszkok'
              : 'ATmega328P 8-bit RISC Architektúra • 1 utasítás / óraciklus (Single Cycle Execution)'}
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
