import React, { useRef, useState, useEffect } from 'react';
import {
  Cpu,
  Play,
  Square,
  StepForward,
  RotateCcw,
  Download,
  Upload,
  BookOpen,
  Sparkles,
  Zap,
  Tag,
  Info,
  HardDrive,
  Sliders,
  Settings,
  Tv,
  RefreshCw,
  FolderArchive,
  Code,
  Code2,
  Flame,
  Radio,
  Wifi,
  Layers,
} from 'lucide-react';
import { PRESET_PROGRAMS } from '../data/presets';
import { ProgramBlock, PresetProgram, RenderEngineConfig, VariableDefinition, McuTarget, MCU_TARGETS } from '../types';
import { getVersionInfo, subscribeToVersionUpdates, incrementBuild, resetBuildCounter, VersionInfo } from '../utils/versionManager';
import { ToolsMenu } from './ToolsMenu';

interface HeaderProps {
  blocks: ProgramBlock[];
  setBlocks: React.Dispatch<React.SetStateAction<ProgramBlock[]>>;
  onLoadPreset: (preset: PresetProgram) => void;
  isRunning: boolean;
  onToggleRun: () => void;
  onStep: () => void;
  onResetSim: () => void;
  onOpenGuide: () => void;
  onOpenMemoryEditor?: () => void;
  onOpenVariableEditor?: () => void;
  onOpenLinter?: () => void;
  onOpenDependencyMatrix?: () => void;
  onOpenTimingProfiler?: () => void;
  onOpenStateMachine?: () => void;
  onOpenLogicAnalyzer?: () => void;
  onOpenVirtualWiring?: () => void;
  onOpenAvrDocs?: () => void;
  onOpenAvrFuses?: () => void;
  onOpenAvrInterrupts?: () => void;
  onOpenEsp32Interrupts?: () => void;
  onOpenRtosEditor?: () => void;
  onOpenEsp32Dma?: () => void;
  onOpenEsp32I2a?: () => void;
  onOpenConnectivityModal?: () => void;
  onOpenBootloaderModal?: () => void;
  onOpenWatchpoints?: () => void;
  onOpenStackVisualizer?: () => void;
  variableCount?: number;
  hasVariableErrors?: boolean;
  variables?: VariableDefinition[];
  onOpenRenderEngine?: () => void;
  onOpenReverseEngine?: () => void;
  onOpenAbiModal?: () => void;
  renderConfig?: RenderEngineConfig;
  targetMcu?: McuTarget;
  onSelectTargetMcu?: (target: McuTarget) => void;
  activeMainTab?: 'blocks' | 'rtos';
  onChangeMainTab?: (tab: 'blocks' | 'rtos') => void;
}

export const Header: React.FC<HeaderProps> = ({
  blocks,
  setBlocks,
  onLoadPreset,
  isRunning,
  onToggleRun,
  onStep,
  onResetSim,
  onOpenGuide,
  onOpenMemoryEditor,
  onOpenVariableEditor,
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
  variableCount = 0,
  hasVariableErrors = false,
  variables = [],
  onOpenRenderEngine,
  onOpenReverseEngine,
  onOpenAbiModal,
  renderConfig,
  targetMcu = 'avr',
  onSelectTargetMcu,
  activeMainTab = 'blocks',
  onChangeMainTab,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [versionInfo, setVersionInfo] = useState<VersionInfo>(getVersionInfo());
  const [showVersionModal, setShowVersionModal] = useState(false);
  const [showMcuSpecsModal, setShowMcuSpecsModal] = useState(false);

  const isEsp32 = targetMcu === 'esp32';
  const currentMcuInfo = MCU_TARGETS[targetMcu];

  useEffect(() => {
    return subscribeToVersionUpdates((newInfo) => {
      setVersionInfo(newInfo);
    });
  }, []);

  const handleExportJson = () => {
    const updatedVer = incrementBuild('JSON Projekt Mentése');
    const exportPayload = {
      app: 'ArduASM Studio',
      version: updatedVer.semver,
      buildNumber: updatedVer.buildNumber,
      exportedAt: new Date().toISOString(),
      blocks,
    };
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(exportPayload, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `ardu_asm_v${updatedVer.semver}_b${updatedVer.buildNumber}_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    if (e.target.files && e.target.files[0]) {
      fileReader.readAsText(e.target.files[0], 'UTF-8');
      fileReader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string);
          if (Array.isArray(parsed)) {
            setBlocks(parsed);
            incrementBuild('Projekt JSON betöltve');
          } else if (parsed && Array.isArray(parsed.blocks)) {
            setBlocks(parsed.blocks);
            incrementBuild('Strukturált projekt betöltve');
          }
        } catch (err) {
          alert('Érvénytelen projekt JSON fájl!');
        }
      };
    }
  };

  return (
    <header
      id="app-header"
      className="bg-[#161920] text-[#E0E0E6] border-b border-[#2A2D35] px-4 py-2 flex flex-wrap items-center justify-between gap-3 shadow-md z-30 select-none"
    >
      {/* Brand & Microcontroller Info + Auto Version Tag */}
      <div className="flex items-center gap-3">
        <div
          className={`w-8 h-8 flex items-center justify-center rounded-xs text-black font-extrabold font-mono text-base shadow-[2px_2px_0px_#000] transition-colors ${
            isEsp32 ? 'bg-[#38bdf8]' : 'bg-[#4ade80]'
          }`}
        >
          {isEsp32 ? 'E' : 'A'}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-bold text-sm sm:text-base tracking-tight uppercase text-white flex items-center gap-1">
              <span>{isEsp32 ? 'ESP32' : 'Ardu'}</span>
              <span className={isEsp32 ? 'text-[#38bdf8]' : 'text-[#4ade80]'}>ASM</span>
              <span className="text-[#8A8D98] font-normal text-xs sm:text-sm">Studio</span>
            </h1>

            {/* Architecture Selector: AVR vs ESP32 */}
            <div
              id="arch-selector"
              className="flex items-center p-0.5 bg-[#0F1115] border border-[#2A2D35] rounded-xs shadow-[1px_1px_0px_#000]"
            >
              <button
                id="select-arch-avr"
                onClick={() => {
                  if (onSelectTargetMcu) {
                    onSelectTargetMcu('avr');
                    incrementBuild('Architektúra váltás: AVR ATmega328P');
                  }
                }}
                className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded-xs transition-all flex items-center gap-1 ${
                  !isEsp32
                    ? 'bg-[#4ade80] text-black shadow-[1px_1px_0px_#000]'
                    : 'text-[#8A8D98] hover:text-[#E0E0E6] hover:bg-[#1A1D24]'
                }`}
                title="8-bit AVR RISC (ATmega328P @ 16 MHz)"
              >
                <Zap className="w-2.5 h-2.5" />
                <span>AVR (16MHz)</span>
              </button>

              <button
                id="select-arch-esp32"
                onClick={() => {
                  if (onSelectTargetMcu) {
                    onSelectTargetMcu('esp32');
                    incrementBuild('Architektúra váltás: ESP32 Xtensa Dual-Core');
                  }
                }}
                className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded-xs transition-all flex items-center gap-1 ${
                  isEsp32
                    ? 'bg-[#38bdf8] text-black shadow-[1px_1px_0px_#000]'
                    : 'text-[#8A8D98] hover:text-[#E0E0E6] hover:bg-[#1A1D24]'
                }`}
                title="32-bit Xtensa Dual-Core (ESP32 @ 240 MHz)"
              >
                <Cpu className="w-2.5 h-2.5" />
                <span>ESP32 (240MHz)</span>
              </button>
            </div>

            {/* Main Studio View Switcher: Blocks vs RTOS Editor */}
            <div
              id="main-tab-switcher"
              className="flex items-center p-0.5 bg-[#0F1115] border border-cyan-500/40 rounded-xs shadow-[2px_2px_0px_#000] ml-2"
            >
              <button
                id="tab-btn-blocks"
                onClick={() => onChangeMainTab && onChangeMainTab('blocks')}
                className={`px-2.5 py-1 text-xs font-mono font-bold rounded-xs transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeMainTab === 'blocks'
                    ? 'bg-[#4ade80] text-black shadow-[1px_1px_0px_#000]'
                    : 'text-slate-400 hover:text-white hover:bg-[#1A1D24]'
                }`}
              >
                <span>🧩 Blokkszerkesztő</span>
              </button>

              <button
                id="tab-btn-rtos"
                onClick={() => {
                  if (onChangeMainTab) {
                    onChangeMainTab('rtos');
                    if (onSelectTargetMcu && targetMcu !== 'esp32') {
                      onSelectTargetMcu('esp32');
                    }
                  }
                }}
                className={`px-2.5 py-1 text-xs font-mono font-bold rounded-xs transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeMainTab === 'rtos'
                    ? 'bg-[#38bdf8] text-black shadow-[1px_1px_0px_#000]'
                    : 'text-cyan-400 hover:text-white hover:bg-cyan-950/40'
                }`}
              >
                <Cpu className="w-3.5 h-3.5" />
                <span>🚀 FreeRTOS Kétmagos Szerkesztő</span>
                <span className="text-[9px] bg-cyan-950 text-cyan-300 px-1 rounded border border-cyan-700">D&D + Linter</span>
              </button>
            </div>

            {/* Active Chip Details Button */}
            <button
              id="btn-mcu-specs"
              onClick={() => setShowMcuSpecsModal(true)}
              className={`px-2 py-0.5 text-[10px] font-mono font-bold bg-[#1A1D24] border rounded-xs shadow-[1px_1px_0px_#000] flex items-center gap-1 transition-colors cursor-pointer ${
                isEsp32
                  ? 'text-sky-400 border-sky-500/40 hover:bg-sky-950/50'
                  : 'text-[#4ade80] border-[#3A3F4B] hover:border-[#4ade80]'
              }`}
              title="Mikrokontroller Hardver Specifikációk megtekintése"
            >
              <Info className="w-2.5 h-2.5" />
              <span>{currentMcuInfo.chipName}</span>
            </button>

            {/* Auto-incrementing Version Badge */}
            <button
              id="btn-version-modal"
              onClick={() => setShowVersionModal(true)}
              className="px-2 py-0.5 text-[10px] font-mono font-bold bg-[#1A1D24] hover:bg-emerald-950/60 text-[#4ade80] border border-emerald-500/40 rounded-xs shadow-[1px_1px_0px_#000] flex items-center gap-1 transition-colors cursor-pointer"
              title="Automatikus verziószámozás és build részletek"
            >
              <Tag className="w-2.5 h-2.5 text-emerald-400" />
              <span>{versionInfo.formatted}</span>
            </button>
          </div>
          <p className="text-[11px] text-[#8A8D98] hidden sm:block">
            {isEsp32
              ? 'ESP32 Xtensa LX6 Kétmagos 240 MHz • FreeRTOS & Direct Register ASM'
              : 'Moduláris Drag & Drop Vizuális Programozás • Óraciklus-pontos Assembly & C'}
          </p>
        </div>
      </div>

      {/* Preset Selector Dropdown */}
      <div className="flex items-center gap-2">
        <div className="relative flex items-center">
          <Sparkles className="w-3.5 h-3.5 text-[#4ade80] absolute left-2.5 pointer-events-none" />
          <select
            id="preset-selector"
            className="pl-8 pr-3 py-1.5 bg-[#1A1D24] border border-[#3A3F4B] hover:border-[#4ade80] text-xs text-[#E0E0E6] rounded-xs focus:outline-none focus:border-[#4ade80] transition-colors cursor-pointer shadow-[2px_2px_0px_#000]"
            defaultValue=""
            onChange={(e) => {
              const selected = PRESET_PROGRAMS.find((p) => p.id === e.target.value);
              if (selected) {
                onLoadPreset(selected);
                incrementBuild(`Mintaprojekt betöltve: ${selected.title}`);
                e.target.value = '';
              }
            }}
          >
            <option value="" disabled className="bg-[#1A1D24] text-[#8A8D98]">
              ⚡ Mintaprojektek betöltése...
            </option>
            {PRESET_PROGRAMS.map((preset) => (
              <option key={preset.id} value={preset.id} className="bg-[#1A1D24] text-[#E0E0E6]">
                {preset.title} ({preset.difficulty})
              </option>
            ))}
          </select>
        </div>

        {/* Simulation Controls Quick Bar */}
        <div className="flex items-center bg-[#1A1D24] p-1 rounded-xs border border-[#3A3F4B] gap-1 shadow-[2px_2px_0px_#000]">
          <button
            id="btn-toggle-simulation"
            onClick={onToggleRun}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-xs text-xs font-bold transition-all shadow-[1px_1px_0px_#000] ${
              isRunning
                ? 'bg-amber-500 hover:bg-amber-400 text-black'
                : 'bg-[#4ade80] hover:bg-[#3ec973] text-black'
            }`}
            title={isRunning ? 'Szimuláció leállítása' : 'Szimuláció indítása'}
          >
            {isRunning ? (
              <>
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>STOP</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>FUTTATÁS</span>
              </>
            )}
          </button>

          <button
            id="btn-step-simulation"
            onClick={onStep}
            disabled={isRunning}
            className="flex items-center gap-1 px-2 py-1 rounded-xs text-xs font-medium bg-[#161920] hover:bg-[#2A2D35] disabled:opacity-40 text-[#E0E0E6] border border-[#3A3F4B] transition-colors"
            title="Egyetlen blokk végrehajtása"
          >
            <StepForward className="w-3.5 h-3.5 text-[#4ade80]" />
            <span>Lépés</span>
          </button>

          <button
            id="btn-reset-simulation"
            onClick={onResetSim}
            className="p-1 rounded-xs text-[#8A8D98] hover:text-[#4ade80] hover:bg-[#161920] border border-transparent hover:border-[#3A3F4B] transition-colors"
            title="Szimulátor és regiszterek nullázása"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Action Buttons: Tools Menu, Reverse Engine, Render Engine, Variables, Memory, Guide, Save/Load */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {/* DEDICATED TOOLS & INSPECTION DROPDOWN MENU */}
        {onOpenLinter && (
          <ToolsMenu
            blocks={blocks}
            variables={variables}
            onOpenLinter={onOpenLinter}
            onOpenTimingProfiler={onOpenTimingProfiler}
            onOpenStateMachine={onOpenStateMachine}
            onOpenDependencyMatrix={onOpenDependencyMatrix}
            onOpenLogicAnalyzer={onOpenLogicAnalyzer}
            onOpenVirtualWiring={onOpenVirtualWiring}
            onOpenAvrDocs={onOpenAvrDocs}
            onOpenAvrFuses={onOpenAvrFuses}
            onOpenAvrInterrupts={onOpenAvrInterrupts}
            onOpenEsp32Interrupts={onOpenEsp32Interrupts}
            onOpenRtosEditor={onOpenRtosEditor}
            onOpenEsp32Dma={onOpenEsp32Dma}
            onOpenEsp32I2a={onOpenEsp32I2a}
            onOpenConnectivityModal={onOpenConnectivityModal}
            onOpenBootloaderModal={onOpenBootloaderModal}
            onOpenWatchpoints={onOpenWatchpoints}
            onOpenStackVisualizer={onOpenStackVisualizer}
          />
        )}

        {/* ESP32 Quick Direct Access Buttons */}
        {isEsp32 && onOpenEsp32Interrupts && (
          <button
            id="btn-header-esp32-interrupts"
            type="button"
            onClick={onOpenEsp32Interrupts}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold bg-sky-950/80 hover:bg-sky-900 text-sky-300 border border-sky-500/60 rounded-xs shadow-[2px_2px_0px_#000] transition-colors cursor-pointer"
            title="ESP32 Kétmagos Megszakítás Mátrix & ISR Tervező (Xtensa Dual-Core, 32 Forrás, IRAM_ATTR)"
          >
            <Zap className="w-3.5 h-3.5 text-sky-400" />
            <span className="hidden lg:inline">Megszakítások</span>
            <span className="inline lg:hidden">ISR</span>
          </button>
        )}

        {isEsp32 && onOpenConnectivityModal && (
          <button
            id="btn-header-esp32-connectivity"
            type="button"
            onClick={onOpenConnectivityModal}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-500/60 rounded-xs shadow-[2px_2px_0px_#000] transition-colors cursor-pointer"
            title="ESP32 Hálózati & Vezeték Nélküli Kapcsolatkezelő (WiFi SSID, Statikus IP, BLE Advertising)"
          >
            <Wifi className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden lg:inline">WiFi / BLE</span>
            <span className="inline lg:hidden">WiFi</span>
          </button>
        )}

        {isEsp32 && onOpenEsp32Dma && (
          <button
            id="btn-header-esp32-dma"
            type="button"
            onClick={onOpenEsp32Dma}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold bg-cyan-950/80 hover:bg-cyan-900 text-cyan-300 border border-cyan-500/60 rounded-xs shadow-[2px_2px_0px_#000] transition-colors cursor-pointer"
            title="ESP32 DMA Controller & Körkörös Puffer Menedzsment"
          >
            <Zap className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden lg:inline">DMA Menedzser</span>
            <span className="inline lg:hidden">DMA</span>
          </button>
        )}

        {isEsp32 && onOpenEsp32I2a && (
          <button
            id="btn-header-esp32-i2a"
            type="button"
            onClick={onOpenEsp32I2a}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold bg-purple-950/80 hover:bg-purple-900 text-purple-300 border border-purple-500/60 rounded-xs shadow-[2px_2px_0px_#000] transition-colors cursor-pointer"
            title="ESP32 I2A / I2S Audio & Spektrumanalizátor Menedzsment"
          >
            <Radio className="w-3.5 h-3.5 text-purple-400" />
            <span className="hidden lg:inline">I2A / I2S Audio</span>
            <span className="inline lg:hidden">I2A</span>
          </button>
        )}

        {/* AVR Quick Direct Access Buttons: Bootloader Studio & Fuses */}
        {onOpenBootloaderModal && !isEsp32 && (
          <button
            id="btn-open-arduino-bootloader"
            onClick={onOpenBootloaderModal}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold bg-amber-950/80 hover:bg-amber-900/90 text-amber-300 border border-amber-500/60 rounded-xs shadow-[2px_2px_0px_#000] transition-colors cursor-pointer"
            title="Arduino Vizuális Bootloader Stúdió (Optiboot, Flash Partíciók, UART Szinkron & HEX Generálás)"
          >
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden lg:inline">Bootloader</span>
            <span className="inline lg:hidden">Boot</span>
          </button>
        )}

        {onOpenAvrFuses && !isEsp32 && (
          <button
            id="btn-open-avr-fuses"
            onClick={onOpenAvrFuses}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold bg-emerald-950/70 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-500/60 rounded-xs shadow-[2px_2px_0px_#000] transition-colors cursor-pointer"
            title="AVR ATmega328P Hardveres FUSE & Lock Bitek Szerkesztője (Órajel, BOD, Bootloader, ISP)"
          >
            <Flame className="w-3.5 h-3.5 text-[#4ade80]" />
            <span className="hidden lg:inline">FUSE Bitek</span>
            <span className="inline lg:hidden">FUSE</span>
          </button>
        )}

        {onOpenAvrInterrupts && !isEsp32 && (
          <button
            id="btn-open-avr-interrupts"
            onClick={onOpenAvrInterrupts}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold bg-purple-950/70 hover:bg-purple-900/80 text-purple-300 border border-purple-500/60 rounded-xs shadow-[2px_2px_0px_#000] transition-colors cursor-pointer"
            title="AVR Vizuális Megszakítás Tervező (INT0/INT1, Timer CTC, PCINT, Vektortábla & Szimuláció)"
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span className="hidden lg:inline">Megszakítások</span>
            <span className="inline lg:hidden">ISR</span>
          </button>
        )}

        {onOpenStateMachine && (
          <button
            id="btn-open-state-machine"
            onClick={onOpenStateMachine}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold bg-indigo-950/80 hover:bg-indigo-900 text-indigo-300 border border-indigo-500/60 rounded-xs shadow-[2px_2px_0px_#000] transition-colors cursor-pointer"
            title="Vizuális Állapotgép (FSM) Tervező & Szimulátor (Diagram, Eseményinjektálás, Párhuzamos ASM & C Kód)"
          >
            <Layers className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden lg:inline">Állapotgép (FSM)</span>
            <span className="inline lg:hidden">FSM</span>
          </button>
        )}

        {onOpenReverseEngine && (
          <button
            id="btn-open-reverse-engine"
            onClick={onOpenReverseEngine}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold bg-[#1A1D24] hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 hover:border-cyan-400 rounded-xs shadow-[2px_2px_0px_#000] transition-all cursor-pointer"
            title="Kétirányú Visszafejtő (Assembly ➔ Blokkok, Intel HEX Disassembler, PlatformIO/Arduino ZIP Export)"
          >
            <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden xl:inline">Visszafejtő & ZIP Export</span>
            <span className="inline xl:hidden">Visszafejtő</span>
          </button>
        )}

        {onOpenAbiModal && (
          <button
            onClick={onOpenAbiModal}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold bg-[#1A1D24] hover:bg-pink-500/20 text-pink-400 border border-pink-500/40 hover:border-pink-400 rounded-xs shadow-[2px_2px_0px_#000] transition-all cursor-pointer"
            title="Dinamikus C++ Header & ASM Blokk Generátor"
          >
            <Code className="w-3.5 h-3.5 text-pink-400" />
            <span className="hidden xl:inline">C-Assembly ABI</span>
          </button>
        )}

        {onOpenRenderEngine && (
          <button
            id="btn-open-render-engine"
            onClick={onOpenRenderEngine}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold bg-[#1A1D24] hover:bg-[#4ade80]/20 text-[#4ade80] border border-[#4ade80]/50 hover:border-[#4ade80] rounded-xs shadow-[2px_2px_0px_#000] transition-all cursor-pointer"
            title="Render Motor & Mini-OS Rendszerbeállítások (Skálázás, Pipeline, Shaders, Telemetria)"
          >
            <Sliders className="w-3.5 h-3.5 text-[#4ade80]" />
            <span className="hidden xl:inline">Render Motor & Mini-OS</span>
            <span className="inline xl:hidden">Motor</span>
            {renderConfig && (
              <span className="text-[9px] font-mono bg-black/60 px-1 py-0.2 rounded-xs border border-[#4ade80]/30 text-white font-normal">
                {Math.round((renderConfig.zoomLevel || 1) * 100)}%
              </span>
            )}
          </button>
        )}

        {onOpenVariableEditor && (
          <button
            id="btn-open-variable-editor"
            onClick={onOpenVariableEditor}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold rounded-xs shadow-[2px_2px_0px_#000] transition-colors cursor-pointer border ${
              hasVariableErrors
                ? 'bg-rose-950/60 hover:bg-rose-900/60 text-rose-300 border-rose-500/80 shadow-[0_0_10px_rgba(244,63,94,0.3)] animate-pulse'
                : 'bg-[#1A1D24] hover:bg-[#4ade80]/20 text-[#4ade80] border-[#4ade80]/60 hover:border-[#4ade80]'
            }`}
            title="Globális C / AVR Assembly Változók, Memória Allokáció és Validáció"
          >
            <Code2 className={`w-3.5 h-3.5 ${hasVariableErrors ? 'text-rose-400' : 'text-[#4ade80]'}`} />
            <span className="hidden lg:inline">Változók & Memória</span>
            <span className="inline lg:hidden">Változók</span>
            <span
              className={`text-[9px] font-mono px-1 py-0.2 rounded-xs border font-bold ${
                hasVariableErrors
                  ? 'bg-rose-500 text-white border-rose-600'
                  : 'bg-black/60 text-[#4ade80] border-[#4ade80]/40'
              }`}
            >
              {variableCount}
            </span>
          </button>
        )}

        {onOpenMemoryEditor && (
          <button
            id="btn-open-memory-editor"
            onClick={onOpenMemoryEditor}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-xs shadow-[2px_2px_0px_#000] transition-colors"
            title="Arduino 1024B EEPROM & 32KB Flash Memória Hex/Dec/Bin Szerkesztő"
          >
            <HardDrive className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden lg:inline">EEPROM & Flash Szerkesztő</span>
            <span className="inline lg:hidden">EEPROM</span>
          </button>
        )}

        <button
          id="btn-open-timing-guide"
          onClick={onOpenGuide}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium bg-[#1A1D24] hover:border-[#4ade80] text-[#4ade80] border border-[#3A3F4B] rounded-xs shadow-[2px_2px_0px_#000] transition-colors"
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Időzítés Kisokos</span>
        </button>

        <button
          id="btn-export-project-json"
          onClick={handleExportJson}
          className="flex items-center gap-1 px-2 py-1.5 text-xs font-medium bg-[#1A1D24] hover:border-[#4ade80] text-[#E0E0E6] border border-[#3A3F4B] rounded-xs shadow-[2px_2px_0px_#000] transition-colors"
          title="Projekt mentése (.json)"
        >
          <Download className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Mentés</span>
        </button>

        <button
          id="btn-import-project-json"
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-1 px-2 py-1.5 text-xs font-medium bg-[#1A1D24] hover:border-[#4ade80] text-[#E0E0E6] border border-[#3A3F4B] rounded-xs shadow-[2px_2px_0px_#000] transition-colors"
          title="Projekt betöltése (.json)"
        >
          <Upload className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Betöltés</span>
        </button>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleImportJson}
          accept=".json"
          className="hidden"
        />
      </div>

      {/* Version Information Modal */}
      {showVersionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="bg-[#161920] border border-[#2A2D35] rounded-xs p-5 max-w-md w-full shadow-[6px_6px_0px_#000] space-y-4">
            <div className="flex items-center justify-between border-b border-[#2A2D35] pb-2">
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-[#4ade80]" />
                <h3 className="font-bold text-sm text-white uppercase font-mono">
                  Automatikus Verziószámozás
                </h3>
              </div>
              <button
                onClick={() => setShowVersionModal(false)}
                className="text-[#8A8D98] hover:text-white text-xs px-2 py-1 bg-[#1A1D24] rounded-xs border border-[#3A3F4B]"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs font-mono">
              <div className="bg-[#0F1115] p-3 rounded-xs border border-[#2A2D35] space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[#8A8D98]">Aktuális Verzió:</span>
                  <span className="text-white font-bold text-sm bg-[#1A1D24] px-2 py-0.5 rounded-xs border border-[#3A3F4B]">
                    v{versionInfo.semver}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-[#8A8D98]">Inkrementált Build Szám:</span>
                  <span className="text-[#4ade80] font-bold">
                    Build #{versionInfo.buildNumber}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-[#8A8D98]">Emulációs Motor:</span>
                  <span className="text-sky-400 font-bold">
                    {versionInfo.engine}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-[#8A8D98]">Összes projekt művelet:</span>
                  <span className="text-amber-400 font-bold">
                    {versionInfo.totalEdits} művelet
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-[#8A8D98]">Utolsó frissítés:</span>
                  <span className="text-[#E0E0E6]">{versionInfo.lastUpdated}</span>
                </div>
              </div>

              {/* Build Log Stream */}
              {versionInfo.buildLogs && versionInfo.buildLogs.length > 0 && (
                <div className="space-y-1">
                  <div className="text-[10px] text-[#8A8D98] font-bold uppercase tracking-wider">
                    Legutóbbi Build Események:
                  </div>
                  <div className="bg-[#0F1115] border border-[#2A2D35] rounded-xs p-2 max-h-28 overflow-y-auto space-y-1 text-[10px] custom-scrollbar">
                    {versionInfo.buildLogs.map((log) => (
                      <div key={log.id} className="flex items-center justify-between text-[#8A8D98]">
                        <span className="text-[#4ade80] font-bold">#{log.buildNumber}</span>
                        <span className="text-[#E0E0E6] truncate max-w-[200px]">{log.reason}</span>
                        <span className="text-[9px] text-[#8A8D98]">{log.timestamp}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => incrementBuild('Kézi build inkrementálás')}
                    className="px-2.5 py-1 bg-[#1A1D24] hover:bg-[#2A2D35] text-[#4ade80] border border-[#3A3F4B] hover:border-[#4ade80] rounded-xs text-[10px] font-bold cursor-pointer transition-colors"
                  >
                    +1 Build Növelés
                  </button>
                  <button
                    onClick={() => resetBuildCounter()}
                    className="px-2 py-1 bg-[#1A1D24] hover:bg-rose-950/40 text-rose-400 border border-[#3A3F4B] hover:border-rose-500/50 rounded-xs text-[10px] cursor-pointer transition-colors"
                  >
                    Nullázás
                  </button>
                </div>

                <button
                  onClick={() => setShowVersionModal(false)}
                  className="px-4 py-1.5 bg-[#4ade80] hover:bg-[#3ec973] text-black font-bold text-xs rounded-xs shadow-[2px_2px_0px_#000] cursor-pointer"
                >
                  Bezárás
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Microcontroller Hardware Specs Modal */}
      {showMcuSpecsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
          <div className="bg-[#161920] border border-[#2A2D35] rounded-xs shadow-[4px_4px_0px_#000] max-w-lg w-full p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-[#2A2D35] pb-3">
              <div className="flex items-center gap-2">
                <div
                  className={`w-8 h-8 rounded-xs flex items-center justify-center text-black font-extrabold shadow-[2px_2px_0px_#000] ${
                    isEsp32 ? 'bg-[#38bdf8]' : 'bg-[#4ade80]'
                  }`}
                >
                  <Cpu className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    {currentMcuInfo.name} ({currentMcuInfo.chipName})
                  </h3>
                  <p className="text-xs text-[#8A8D98]">{currentMcuInfo.arch}</p>
                </div>
              </div>
              <button
                onClick={() => setShowMcuSpecsModal(false)}
                className="text-[#8A8D98] hover:text-white p-1 rounded-xs hover:bg-[#1A1D24]"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="bg-[#0F1115] p-2.5 rounded-xs border border-[#2A2D35]">
                <div className="text-[10px] text-[#8A8D98] uppercase">Órajel & Ciklusidő</div>
                <div className="text-[#4ade80] font-bold text-sm">
                  {currentMcuInfo.clockMhz} MHz ({currentMcuInfo.cycleNs.toFixed(2)} ns/ciklus)
                </div>
              </div>

              <div className="bg-[#0F1115] p-2.5 rounded-xs border border-[#2A2D35]">
                <div className="text-[10px] text-[#8A8D98] uppercase">CPU Magok Száma</div>
                <div className="text-sky-400 font-bold text-sm">
                  {currentMcuInfo.cores} Mag {isEsp32 ? '(PRO + APP CPU)' : '(Egyetlen Mag)'}
                </div>
              </div>

              <div className="bg-[#0F1115] p-2.5 rounded-xs border border-[#2A2D35]">
                <div className="text-[10px] text-[#8A8D98] uppercase">Flash Memória</div>
                <div className="text-amber-400 font-bold">
                  {(currentMcuInfo.flashBytes / 1024).toLocaleString()} KB {isEsp32 ? '(4 MB SPI)' : ''}
                </div>
              </div>

              <div className="bg-[#0F1115] p-2.5 rounded-xs border border-[#2A2D35]">
                <div className="text-[10px] text-[#8A8D98] uppercase">SRAM Memória</div>
                <div className="text-purple-400 font-bold">
                  {(currentMcuInfo.sramBytes / 1024).toFixed(1)} KB
                </div>
              </div>

              <div className="bg-[#0F1115] p-2.5 rounded-xs border border-[#2A2D35]">
                <div className="text-[10px] text-[#8A8D98] uppercase">Tápfeszültség & Logika</div>
                <div className="text-emerald-400 font-bold">{currentMcuInfo.voltageV} V</div>
              </div>

              <div className="bg-[#0F1115] p-2.5 rounded-xs border border-[#2A2D35]">
                <div className="text-[10px] text-[#8A8D98] uppercase">Alapértelmezett Baud</div>
                <div className="text-rose-400 font-bold">{currentMcuInfo.defaultBaud} bps</div>
              </div>
            </div>

            <div className="bg-[#0F1115] p-3 rounded-xs border border-[#2A2D35] text-xs text-[#E0E0E6] leading-relaxed">
              {currentMcuInfo.description}
            </div>

            <div className="flex justify-end pt-1">
              <button
                onClick={() => setShowMcuSpecsModal(false)}
                className="px-4 py-1.5 bg-[#4ade80] hover:bg-[#3ec973] text-black font-bold text-xs rounded-xs shadow-[2px_2px_0px_#000] cursor-pointer"
              >
                Rendben
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
