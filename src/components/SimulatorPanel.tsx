import React, { useState } from 'react';
import {
  Play,
  Square,
  StepForward,
  RotateCcw,
  Activity,
  Cpu,
  Sliders,
  Sparkles,
  Zap,
  Share2,
  Radio,
  SlidersHorizontal,
  Layers,
  Terminal,
  HardDrive,
  ExternalLink,
  Thermometer,
  Network,
  Boxes,
} from 'lucide-react';
import { SimulationState, ArduinoPin, HardwareModule, McuTarget, MCU_TARGETS } from '../types';
import { ARDUINO_PINS_ORDER, PIN_MAPPINGS, CYCLE_NS } from '../utils/hardwareMap';
import { ESP32_PIN_MAPPINGS, ESP32_PINS_ORDER, Esp32PinName } from '../utils/esp32HardwareMap';
import { SerialTerminal } from './SerialTerminal';
import { HardwareModulesPanel } from './HardwareModulesPanel';
import { Avr8jsEmulatorPanel } from './Avr8jsEmulatorPanel';
import { MasterSlavePanel } from './MasterSlavePanel';
import { DataStructPanel } from './DataStructPanel';
import { AvrRegisterViewer } from './AvrRegisterViewer';
import { Esp32DevKitVisualizer } from './Esp32DevKitVisualizer';
import { AvrCpuSnapshot } from '../utils/avr8jsEngine';
import { Esp32SimulationState } from '../types';

interface SimulatorPanelProps {
  simulation: SimulationState;
  onToggleRun: () => void;
  onStep: () => void;
  onReset: () => void;
  onSpeedChange: (speedMs: number) => void;
  onAnalogInputChange?: (channel: string, value: number) => void;
  onSendSerialInput?: (input: string) => void;
  onClearTerminal?: () => void;
  onUpdateModules?: (modules: HardwareModule[]) => void;
  onToggleEngineMode?: (mode: 'custom_event_loop' | 'avr8js' | 'visual') => void;
  onLoadHex?: (hexString: string, name: string) => void;
  onCompileBlocksToAvr8js?: () => void;
  onOpenMemoryEditor?: () => void;
  onUpdateRegister?: (regName: string, value: number) => void;
  onUpdateSregFlag?: (flag: 'C' | 'Z' | 'N' | 'V' | 'S' | 'H' | 'T' | 'I', value: boolean) => void;
  onClearAllRegisters?: () => void;
  onUpdateEsp32State?: (updater: (prev: Esp32SimulationState) => Esp32SimulationState) => void;
  onOpenDmaModal?: () => void;
  onOpenI2aModal?: () => void;
  onOpenConnectivityModal?: () => void;
  onOpenEsp32Interrupts?: () => void;
  onOpenWatchpoints?: () => void;
  onOpenStackVisualizer?: () => void;
  cpuSnapshot?: AvrCpuSnapshot | null;
  targetMcu?: McuTarget;
}

export const SimulatorPanel: React.FC<SimulatorPanelProps> = ({
  simulation,
  onToggleRun,
  onStep,
  onReset,
  onSpeedChange,
  onAnalogInputChange,
  onSendSerialInput = () => {},
  onClearTerminal = () => {},
  onUpdateModules = () => {},
  onToggleEngineMode = () => {},
  onLoadHex = () => {},
  onCompileBlocksToAvr8js = () => {},
  onOpenMemoryEditor,
  onUpdateRegister,
  onUpdateSregFlag,
  onClearAllRegisters,
  onUpdateEsp32State,
  onOpenDmaModal,
  onOpenI2aModal,
  onOpenConnectivityModal,
  onOpenEsp32Interrupts,
  onOpenWatchpoints,
  onOpenStackVisualizer,
  cpuSnapshot,
  targetMcu = 'avr',
}) => {
  const isEsp32 = targetMcu === 'esp32';
  const [monitoredPin, setMonitoredPin] = useState<string>(isEsp32 ? '2' : '13');
  const [activeSubTab, setActiveSubTab] = useState<'esp32devkit' | 'avr8js' | 'registers' | 'digital' | 'modules' | 'eeprom' | 'masterslave' | 'datastruct' | 'uart' | 'analog' | 'i2c' | 'spi' | 'onewire'>(isEsp32 ? 'esp32devkit' : 'avr8js');

  const pin13State = simulation.pinStates['13'] || simulation.pinStates['2'];
  const isLedOn = pin13State?.value === 1;

  // Render logic analyzer waveform path
  const waveformSamples = simulation.logicWaveform.slice(-24);
  const sampleWidth = 14;
  const highY = 8;
  const lowY = 32;

  let waveSvgPoints = '';
  if (waveformSamples.length > 0) {
    let currentX = 10;
    waveformSamples.forEach((sample, i) => {
      const val = sample.pinStates[monitoredPin] || 0;
      const y = val === 1 ? highY : lowY;
      if (i === 0) {
        waveSvgPoints += `M ${currentX} ${y} `;
      } else {
        const prevVal = waveformSamples[i - 1].pinStates[monitoredPin] || 0;
        const prevY = prevVal === 1 ? highY : lowY;
        if (prevY !== y) {
          waveSvgPoints += `V ${y} `;
        }
        waveSvgPoints += `H ${currentX} `;
      }
      currentX += sampleWidth;
    });
  }

  // PWM Pins list
  const pwmPins: { pin: ArduinoPin; timer: string; reg: string }[] = [
    { pin: '3', timer: 'Timer2', reg: 'OCR2B' },
    { pin: '5', timer: 'Timer0', reg: 'OCR0B' },
    { pin: '6', timer: 'Timer0', reg: 'OCR0A' },
    { pin: '9', timer: 'Timer1', reg: 'OCR1A' },
    { pin: '10', timer: 'Timer1', reg: 'OCR1B' },
    { pin: '11', timer: 'Timer2', reg: 'OCR2A' },
  ];

  return (
    <div
      id="simulator-panel"
      className="flex flex-col bg-[#161920] border-b lg:border-b-0 lg:border-l border-[#2A2D35] h-full overflow-y-auto p-4 space-y-4 select-none custom-scrollbar"
    >
      {/* Simulator Control Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#2A2D35]">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-[#4ade80] shadow-[0_0_8px_#4ade80] animate-pulse" />
          <h3 className="text-xs font-bold uppercase tracking-widest text-white flex items-center gap-1.5">
            <span>Arduino Uno R3 Szimulátor</span>
            <span className="text-[10px] text-[#4ade80] font-mono font-normal">16 MHz</span>
          </h3>
        </div>

        {/* Speed Slider */}
        <div className="flex items-center gap-2 text-xs text-[#8A8D98]">
          <Sliders className="w-3.5 h-3.5" />
          <span className="text-[10px] font-bold uppercase tracking-wider">Sebesség:</span>
          <input
            type="range"
            min="50"
            max="1000"
            step="50"
            value={simulation.executionSpeedMs}
            onChange={(e) => onSpeedChange(Number(e.target.value))}
            className="w-16 accent-[#4ade80] cursor-pointer"
            title={`${simulation.executionSpeedMs} ms lépésköz`}
          />
          <span className="font-mono text-[#4ade80] text-[11px] font-bold">
            {simulation.executionSpeedMs}ms
          </span>
        </div>
      </div>

      {/* Sub-panel Navigation Tabs */}
      <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-12 gap-1 p-1 bg-[#0F1115] rounded-xs border border-[#2A2D35] shadow-[2px_2px_0px_#000]">
        {isEsp32 ? (
          <button
            id="btn-subtab-esp32"
            onClick={() => setActiveSubTab('esp32devkit')}
            className={`flex items-center justify-center gap-1 py-1.5 px-1 rounded-xs text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer col-span-2 ${
              activeSubTab === 'esp32devkit'
                ? 'bg-cyan-400 text-black shadow-[1px_1px_0px_#000]'
                : 'text-cyan-400 hover:text-cyan-200 hover:bg-[#1A1D24]'
            }`}
          >
            <Cpu className="w-3 h-3 text-current" />
            <span>ESP32 DevKit</span>
          </button>
        ) : (
          <button
            onClick={() => setActiveSubTab('avr8js')}
            className={`flex items-center justify-center gap-1 py-1.5 px-1 rounded-xs text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
              activeSubTab === 'avr8js'
                ? 'bg-[#4ade80] text-black shadow-[1px_1px_0px_#000]'
                : 'text-[#8A8D98] hover:text-[#E0E0E6] hover:bg-[#1A1D24]'
            }`}
          >
            <Zap className="w-3 h-3 text-current" />
            <span>AVR8</span>
          </button>
        )}

        <button
          id="btn-subtab-registers"
          onClick={() => setActiveSubTab('registers')}
          className={`flex items-center justify-center gap-1 py-1.5 px-1 rounded-xs text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
            activeSubTab === 'registers'
              ? 'bg-[#4ade80] text-black shadow-[1px_1px_0px_#000]'
              : 'text-[#8A8D98] hover:text-[#4ade80] hover:bg-[#1A1D24]'
          }`}
          title="8-bites Általános Célú Regisztertár (R0-R31, X, Y, Z Pointers & SREG)"
        >
          <Cpu className="w-3 h-3 text-current" />
          <span>R0-R31</span>
        </button>

        <button
          onClick={() => setActiveSubTab('digital')}
          className={`flex items-center justify-center gap-1 py-1.5 px-1 rounded-xs text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
            activeSubTab === 'digital'
              ? 'bg-[#4ade80] text-black shadow-[1px_1px_0px_#000]'
              : 'text-[#8A8D98] hover:text-[#E0E0E6] hover:bg-[#1A1D24]'
          }`}
        >
          <Cpu className="w-3 h-3" />
          <span className="hidden sm:inline">I/O</span>
        </button>

        <button
          onClick={() => setActiveSubTab('modules')}
          className={`flex items-center justify-center gap-1 py-1.5 px-1 rounded-xs text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
            activeSubTab === 'modules'
              ? 'bg-[#38bdf8] text-black shadow-[1px_1px_0px_#000]'
              : 'text-[#8A8D98] hover:text-[#E0E0E6] hover:bg-[#1A1D24]'
          }`}
        >
          <Layers className="w-3 h-3" />
          <span>Modul</span>
        </button>

        <button
          onClick={() => setActiveSubTab('masterslave')}
          className={`flex items-center justify-center gap-1 py-1.5 px-1 rounded-xs text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
            activeSubTab === 'masterslave'
              ? 'bg-emerald-400 text-black shadow-[1px_1px_0px_#000]'
              : 'text-[#8A8D98] hover:text-[#E0E0E6] hover:bg-[#1A1D24]'
          }`}
        >
          <Network className="w-3 h-3" />
          <span>M-S Busz</span>
        </button>

        <button
          onClick={() => setActiveSubTab('datastruct')}
          className={`flex items-center justify-center gap-1 py-1.5 px-1 rounded-xs text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
            activeSubTab === 'datastruct'
              ? 'bg-sky-400 text-black shadow-[1px_1px_0px_#000]'
              : 'text-[#8A8D98] hover:text-[#E0E0E6] hover:bg-[#1A1D24]'
          }`}
        >
          <Boxes className="w-3 h-3" />
          <span>Struktúra</span>
        </button>

        <button
          onClick={() => setActiveSubTab('eeprom')}
          className={`flex items-center justify-center gap-1 py-1.5 px-1 rounded-xs text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
            activeSubTab === 'eeprom'
              ? 'bg-amber-500 text-black shadow-[1px_1px_0px_#000]'
              : 'text-[#8A8D98] hover:text-[#E0E0E6] hover:bg-[#1A1D24]'
          }`}
        >
          <HardDrive className="w-3 h-3 text-current" />
          <span>MEM</span>
        </button>

        <button
          onClick={() => setActiveSubTab('uart')}
          className={`flex items-center justify-center gap-1 py-1.5 px-1 rounded-xs text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
            activeSubTab === 'uart'
              ? 'bg-[#4ade80] text-black shadow-[1px_1px_0px_#000]'
              : 'text-[#8A8D98] hover:text-[#E0E0E6] hover:bg-[#1A1D24]'
          }`}
        >
          <Terminal className="w-3 h-3" />
          <span>UART</span>
        </button>

        <button
          onClick={() => setActiveSubTab('analog')}
          className={`flex items-center justify-center gap-1 py-1.5 px-1 rounded-xs text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
            activeSubTab === 'analog'
              ? 'bg-[#4ade80] text-black shadow-[1px_1px_0px_#000]'
              : 'text-[#8A8D98] hover:text-[#E0E0E6] hover:bg-[#1A1D24]'
          }`}
        >
          <SlidersHorizontal className="w-3 h-3" />
          <span className="hidden sm:inline">ADC</span>
        </button>

        <button
          onClick={() => setActiveSubTab('i2c')}
          className={`flex items-center justify-center gap-1 py-1.5 px-1 rounded-xs text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
            activeSubTab === 'i2c'
              ? 'bg-[#4ade80] text-black shadow-[1px_1px_0px_#000]'
              : 'text-[#8A8D98] hover:text-[#E0E0E6] hover:bg-[#1A1D24]'
          }`}
        >
          <Share2 className="w-3 h-3" />
          <span>I2C</span>
        </button>

        <button
          onClick={() => setActiveSubTab('spi')}
          className={`flex items-center justify-center gap-1 py-1.5 px-1 rounded-xs text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
            activeSubTab === 'spi'
              ? 'bg-[#4ade80] text-black shadow-[1px_1px_0px_#000]'
              : 'text-[#8A8D98] hover:text-[#E0E0E6] hover:bg-[#1A1D24]'
          }`}
        >
          <Radio className="w-3 h-3" />
          <span>SPI</span>
        </button>

        <button
          onClick={() => setActiveSubTab('onewire')}
          className={`flex items-center justify-center gap-1 py-1.5 px-1 rounded-xs text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
            activeSubTab === 'onewire'
              ? 'bg-[#06b6d4] text-black shadow-[1px_1px_0px_#000]'
              : 'text-[#8A8D98] hover:text-[#E0E0E6] hover:bg-[#1A1D24]'
          }`}
        >
          <Thermometer className="w-3 h-3" />
          <span className="truncate">1-Wire</span>
        </button>
      </div>

      {/* TAB: ESP32 DEVKIT DUAL-CORE HARDWARE & PERIPHERALS VISUALIZER */}
      {activeSubTab === 'esp32devkit' && (
        <Esp32DevKitVisualizer
          simulation={simulation}
          onUpdateEsp32State={onUpdateEsp32State}
          onSendSerialInput={onSendSerialInput}
          onOpenDmaModal={onOpenDmaModal}
          onOpenI2aModal={onOpenI2aModal}
          onOpenConnectivityModal={onOpenConnectivityModal}
          onOpenInterruptModal={onOpenEsp32Interrupts}
        />
      )}

      {/* TAB: INTERACTIVE 8-BIT AVR REGISTER MATRIX & BIT INSPECTOR */}
      {activeSubTab === 'registers' && (
        <AvrRegisterViewer
          simulation={simulation}
          cpuSnapshot={cpuSnapshot}
          onUpdateRegister={onUpdateRegister}
          onUpdateSregFlag={onUpdateSregFlag}
          onClearAllRegisters={onClearAllRegisters}
        />
      )}

      {/* TAB: AVR8JS REAL HARDWARE EMULATOR */}
      {activeSubTab === 'avr8js' && (
        <Avr8jsEmulatorPanel
          simulation={simulation}
          onToggleEngineMode={onToggleEngineMode}
          onLoadHex={onLoadHex}
          onStepCpu={onStep}
          onResetCpu={onReset}
          onToggleRunCpu={onToggleRun}
          onCompileBlocksToAvr8js={onCompileBlocksToAvr8js}
          onOpenMemoryEditor={onOpenMemoryEditor}
          onOpenRegistersView={() => setActiveSubTab('registers')}
          onOpenWatchpoints={onOpenWatchpoints}
          onOpenStackVisualizer={onOpenStackVisualizer}
          cpuSnapshot={cpuSnapshot}
        />
      )}

      {/* TAB: DYNAMIC HARDWARE MODULES */}
      {activeSubTab === 'modules' && (
        <HardwareModulesPanel
          modules={simulation.modules || []}
          onUpdateModules={onUpdateModules}
        />
      )}

      {/* TAB: MASTER-SLAVE MULTI-NODE NETWORK */}
      {activeSubTab === 'masterslave' && (
        <MasterSlavePanel
          masterSlaveState={simulation.masterSlaveState}
          simulation={simulation}
        />
      )}

      {/* TAB: DATA STRUCTURES & OOP ENGINE */}
      {activeSubTab === 'datastruct' && (
        <DataStructPanel
          dataStructState={simulation.dataStructState}
          simulation={simulation}
        />
      )}

      {/* TAB: EEPROM & FLASH QUICK MONITOR */}
      {activeSubTab === 'eeprom' && (
        <div className="space-y-3 p-3 bg-[#161920] border border-[#2A2D35] rounded-xs shadow-[2px_2px_0px_#000]">
          <div className="flex items-center justify-between border-b border-[#2A2D35] pb-2">
            <div className="flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-amber-400" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#E0E0E6]">
                EEPROM & Flash Memória Állapot
              </h4>
            </div>
            {onOpenMemoryEditor && (
              <button
                onClick={onOpenMemoryEditor}
                className="flex items-center gap-1 px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-black text-[10px] font-bold uppercase rounded-xs transition-colors shadow-[1px_1px_0px_#000]"
              >
                <ExternalLink className="w-3 h-3" />
                <span>Editor Megnyitása</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            <div className="p-2.5 bg-[#12141A] border border-[#2A2D35] rounded-xs">
              <span className="text-[#8A8D98] text-[9px] block">EEPROM MÉRET & CÍMTARTOMÁNY</span>
              <span className="font-bold text-amber-400">1024 Bájt (0x000 - 0x3FF)</span>
            </div>
            <div className="p-2.5 bg-[#12141A] border border-[#2A2D35] rounded-xs">
              <span className="text-[#8A8D98] text-[9px] block">FLASH PROGRAMMEMÓRIA</span>
              <span className="font-bold text-sky-400">32768 Bájt (0x0000 - 0x7FFF)</span>
            </div>
          </div>

          {/* Last EEPROM Access */}
          {simulation.lastEepromAccess && (
            <div className="p-2.5 bg-amber-950/30 border border-amber-500/40 rounded-xs text-xs font-mono flex items-center justify-between text-amber-300">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                <span>
                  Utolsó Művelet: <strong>{simulation.lastEepromAccess.type}</strong> @ Cím: 0x{simulation.lastEepromAccess.address.toString(16).toUpperCase().padStart(4, '0')}
                </span>
              </div>
              <span className="font-bold">Érték: 0x{simulation.lastEepromAccess.value.toString(16).toUpperCase().padStart(2, '0')} ({simulation.lastEepromAccess.value})</span>
            </div>
          )}

          {/* Quick EEPROM Hex Preview Grid (First 32 bytes) */}
          <div className="space-y-1">
            <div className="text-[9px] font-mono text-[#8A8D98] uppercase font-bold">
              EEPROM Első 32 Bájtja (0x0000 - 0x001F):
            </div>
            <div className="p-2 bg-[#0F1115] border border-[#2A2D35] rounded-xs font-mono text-[10px] space-y-1">
              {[0, 16].map((offset) => {
                const eep = simulation.eeprom || new Uint8Array(1024).fill(0xff);
                const slice = (Array.from(eep.slice(offset, offset + 16)) as number[]);
                const hexStr = slice.map((b) => b.toString(16).toUpperCase().padStart(2, '0')).join(' ');
                const asciiStr = slice.map((b) => (b >= 32 && b <= 126 ? String.fromCharCode(b) : '.')).join('');
                return (
                  <div key={offset} className="flex items-center justify-between text-slate-300">
                    <span className="text-amber-400 font-bold">0x{offset.toString(16).toUpperCase().padStart(4, '0')}:</span>
                    <span className="tracking-wider text-emerald-400">{hexStr}</span>
                    <span className="text-[#8A8D98]">| {asciiStr}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB: SERIAL TERMINAL (UART) */}
      {activeSubTab === 'uart' && (
        <div className="h-[420px]">
          <SerialTerminal
            simState={simulation}
            onSendSerialInput={onSendSerialInput}
            onClearTerminal={onClearTerminal}
          />
        </div>
      )}

      {/* TAB 1: DIGITAL I/O & CPU */}
      {activeSubTab === 'digital' && (
        <div className="space-y-4">
          {/* Interactive Microcontroller Board Graphic (UNO vs ESP32 DevKit) */}
          <div className="relative bg-[#0F1115] border border-[#3A3F4B] rounded-xs p-3.5 shadow-[4px_4px_0px_#000] overflow-hidden">
            {isEsp32 ? (
              /* ESP32-WROOM-32 DevKit V1 Visual Board */
              <div>
                <div className="flex items-center justify-between border-b border-[#2A2D35] pb-2 mb-3">
                  <div className="text-[10px] font-bold font-mono text-[#38bdf8] tracking-wider uppercase flex items-center gap-1.5">
                    <span className="w-2 h-2 bg-[#38bdf8] rounded-xs inline-block shadow-[0_0_6px_#38bdf8]" />
                    ESP32 DEVKIT V1 [Xtensa LX6 Dual-Core]
                  </div>

                  {/* Built-in Blue LED Indicator (GPIO2) */}
                  <div className="flex items-center gap-2 bg-[#1A1D24] px-2 py-1 rounded-xs border border-[#3A3F4B] shadow-[1px_1px_0px_#000]">
                    <div className="text-right">
                      <div className="text-[9px] text-[#8A8D98] font-mono">GPIO 2 (Kék LED)</div>
                      <div className="text-[10px] font-mono font-bold text-sky-400">
                        {simulation.pinStates['2']?.value === 1 || simulation.pinStates['13']?.value === 1
                          ? '3.3V (HIGH)'
                          : '0.0V (LOW)'}
                      </div>
                    </div>
                    <div
                      className={`w-3.5 h-3.5 rounded-xs border transition-all ${
                        simulation.pinStates['2']?.value === 1 || simulation.pinStates['13']?.value === 1
                          ? 'bg-sky-400 border-sky-300 shadow-[0_0_10px_#38bdf8]'
                          : 'bg-[#161920] border-[#3A3F4B]'
                      }`}
                    />
                  </div>
                </div>

                {/* ESP-WROOM-32 Module Metal Shield */}
                <div className="my-2.5 mx-auto max-w-[300px] bg-[#1a202c] border-2 border-[#4a5568] rounded-xs p-2.5 shadow-[2px_2px_0px_#000] relative text-center">
                  <div className="text-[10px] font-mono text-sky-300 font-extrabold tracking-wide">
                    ESP-WROOM-32 • 240.000 MHz
                  </div>
                  <div className="flex justify-between items-center text-[9px] font-mono text-[#a0aec0] px-2 mt-1">
                    <span>Wi-Fi 802.11 b/g/n</span>
                    <span className="text-emerald-400 font-bold">
                      {simulation.isRunning ? 'PRO+APP MAG AKTÍV' : 'KÉSZENLÉT'}
                    </span>
                    <span>BLE 4.2 BR/EDR</span>
                  </div>
                </div>

                {/* Dual Core Activity Indicators */}
                <div className="grid grid-cols-2 gap-2 mb-3 text-[10px] font-mono">
                  <div className="p-2 bg-[#12141A] border border-[#2A2D35] rounded-xs">
                    <div className="text-[#8A8D98] text-[9px]">CORE 0 (PRO CPU)</div>
                    <div className="text-[#4ade80] font-bold flex items-center justify-between">
                      <span>Protokoll & Wi-Fi</span>
                      <span>{simulation.isRunning ? '240 MHz' : 'IDLE'}</span>
                    </div>
                  </div>
                  <div className="p-2 bg-[#12141A] border border-[#2A2D35] rounded-xs">
                    <div className="text-[#8A8D98] text-[9px]">CORE 1 (APP CPU)</div>
                    <div className="text-sky-400 font-bold flex items-center justify-between">
                      <span>Felhasználói ASM/C++</span>
                      <span>{simulation.isRunning ? '240 MHz' : 'IDLE'}</span>
                    </div>
                  </div>
                </div>

                {/* ESP32 GPIOs Grid */}
                <div className="space-y-1">
                  <div className="text-[9px] font-mono font-bold text-[#8A8D98] uppercase tracking-wider flex justify-between">
                    <span>ESP32 GPIO Pin Mátrix & Funkciók</span>
                    <span className="text-sky-400">3.3V CMOS Logika</span>
                  </div>
                  <div className="grid grid-cols-6 gap-1">
                    {ESP32_PINS_ORDER.slice(0, 18).map((pin) => {
                      const numStr = pin.replace('GPIO', '');
                      const state = simulation.pinStates[numStr] || simulation.pinStates[pin];
                      const isHigh = state?.value === 1;
                      const mapping = ESP32_PIN_MAPPINGS[pin];

                      return (
                        <button
                          key={pin}
                          onClick={() => setMonitoredPin(numStr)}
                          className={`p-1 rounded-xs border text-center transition-all ${
                            monitoredPin === numStr ? 'ring-1 ring-sky-400 border-sky-400' : ''
                          } ${
                            isHigh
                              ? 'bg-[#0f172a] border-sky-500 text-sky-300 shadow-[1px_1px_0px_#000]'
                              : 'bg-[#161920] border-[#2A2D35] text-[#8A8D98] hover:border-[#3A3F4B]'
                          }`}
                        >
                          <div className="text-[9px] font-mono font-bold">{pin}</div>
                          <div className="flex items-center justify-center my-0.5">
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                isHigh ? 'bg-sky-400 shadow-[0_0_4px_#38bdf8]' : 'bg-[#2A2D35]'
                              }`}
                            />
                          </div>
                          <div className="text-[8px] font-mono opacity-80 truncate">
                            {mapping?.dacChannel ? 'DAC' : mapping?.touchChannel ? 'T' : mapping?.adcChannel ? 'ADC' : (state?.mode === 'OUTPUT' ? 'OUT' : 'IN')}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              /* Arduino UNO R3 Visual Board */
              <div>
                <div className="flex items-center justify-between border-b border-[#2A2D35] pb-2 mb-3">
                  <div className="text-[10px] font-bold font-mono text-[#4ade80] tracking-wider uppercase flex items-center gap-1.5">
                    <span className="w-2 h-2 bg-[#4ade80] rounded-xs inline-block" />
                    UNO R3 [ATmega328P]
                  </div>

                  {/* Built-in LED Indicator (Pin 13 - PB5) */}
                  <div className="flex items-center gap-2 bg-[#1A1D24] px-2 py-1 rounded-xs border border-[#3A3F4B] shadow-[1px_1px_0px_#000]">
                    <div className="text-right">
                      <div className="text-[9px] text-[#8A8D98] font-mono">PIN 13 (L LED)</div>
                      <div className="text-[10px] font-mono font-bold text-white">
                        {isLedOn ? '5.0V (HIGH)' : '0.0V (LOW)'}
                      </div>
                    </div>
                    <div
                      className={`w-3.5 h-3.5 rounded-xs border transition-all ${
                        isLedOn
                          ? 'bg-amber-400 border-amber-300 shadow-[0_0_8px_#f59e0b]'
                          : 'bg-[#161920] border-[#3A3F4B]'
                      }`}
                    />
                  </div>
                </div>

                {/* Microcontroller DIP IC Graphic */}
                <div className="my-3 mx-auto max-w-[260px] bg-[#161920] border border-[#3A3F4B] rounded-xs p-2 shadow-[2px_2px_0px_#000] relative">
                  <div className="text-center text-[10px] font-mono text-[#8A8D98] mb-0.5 font-bold">
                    ATmega328P-PU • 16.000 MHz
                  </div>
                  <div className="flex justify-between items-center text-[9px] font-mono text-[#8A8D98] px-1">
                    <span>[RESET]</span>
                    <span className="text-[#4ade80] font-bold">
                      {simulation.isRunning ? 'FUTÁS ALATT' : 'KÉSZENLÉT'}
                    </span>
                    <span>[5V/GND]</span>
                  </div>
                </div>

                {/* Digital Pins Grid (D0 - D13) */}
                <div className="space-y-1 mt-2">
                  <div className="text-[9px] font-mono font-bold text-[#8A8D98] uppercase tracking-wider">
                    DIGITÁLIS I/O & PWM (D0 - D13)
                  </div>
                  <div className="grid grid-cols-7 gap-1">
                    {ARDUINO_PINS_ORDER.slice(0, 14).map((pin) => {
                      const state = simulation.pinStates[pin];
                      const isHigh = state?.value === 1;
                      const isOutput = state?.mode === 'OUTPUT';

                      return (
                        <button
                          key={pin}
                          onClick={() => setMonitoredPin(pin)}
                          className={`p-1 rounded-xs border text-center transition-all ${
                            monitoredPin === pin ? 'ring-1 ring-[#4ade80] border-[#4ade80]' : ''
                          } ${
                            isHigh
                              ? 'bg-[#1F232B] border-amber-500 text-amber-300 shadow-[1px_1px_0px_#000]'
                              : 'bg-[#161920] border-[#2A2D35] text-[#8A8D98] hover:border-[#3A3F4B]'
                          }`}
                        >
                          <div className="text-[9px] font-mono font-bold">D{pin}</div>
                          <div className="flex items-center justify-center my-0.5">
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                isHigh ? 'bg-amber-400 shadow-[0_0_4px_#f59e0b]' : 'bg-[#2A2D35]'
                              }`}
                            />
                          </div>
                          <div className="text-[8px] font-mono opacity-80">
                            {isOutput ? 'OUT' : 'IN'}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Analog Pins Grid (A0 - A5) */}
                <div className="space-y-1 mt-2.5">
                  <div className="text-[9px] font-mono font-bold text-[#8A8D98] uppercase tracking-wider">
                    ANALÓG / PORT C (A0 - A5)
                  </div>
                  <div className="grid grid-cols-6 gap-1">
                    {ARDUINO_PINS_ORDER.slice(14).map((pin) => {
                      const state = simulation.pinStates[pin];
                      const isHigh = state?.value === 1;
                      return (
                        <button
                          key={pin}
                          onClick={() => setMonitoredPin(pin)}
                          className={`p-1 rounded-xs border text-center transition-all ${
                            monitoredPin === pin ? 'ring-1 ring-[#4ade80] border-[#4ade80]' : ''
                          } ${
                            isHigh
                              ? 'bg-[#1F232B] border-amber-500 text-amber-300 shadow-[1px_1px_0px_#000]'
                              : 'bg-[#161920] border-[#2A2D35] text-[#8A8D98] hover:border-[#3A3F4B]'
                          }`}
                        >
                          <div className="text-[9px] font-mono font-bold">{pin}</div>
                          <div className="flex items-center justify-center my-0.5">
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                isHigh ? 'bg-amber-400' : 'bg-[#2A2D35]'
                              }`}
                            />
                          </div>
                          <div className="text-[8px] font-mono opacity-80">
                            {state?.mode === 'OUTPUT' ? 'OUT' : 'IN'}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Logic Analyzer / Waveform Display */}
          <div className="node-card rounded-xs p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-[#4ade80]" />
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  Logikai Analizátor
                </h4>
              </div>
              <div className="text-[10px] text-[#4ade80] font-mono bg-[#0F1115] px-1.5 py-0.5 rounded-xs border border-[#2A2D35]">
                PIN {monitoredPin}
              </div>
            </div>

            {/* Waveform Graph Canvas SVG */}
            <div className="bg-[#0F1115] rounded-xs p-2 border border-[#2A2D35] flex items-center justify-center min-h-[52px] overflow-hidden shadow-[inset_1px_1px_3px_#000]">
              {waveformSamples.length > 0 ? (
                <svg
                  className="w-full h-8 overflow-visible stroke-[#4ade80] fill-none stroke-[2]"
                  viewBox="0 0 350 40"
                  preserveAspectRatio="none"
                >
                  <line x1="0" y1="8" x2="350" y2="8" stroke="#2A2D35" strokeDasharray="2 2" strokeWidth="1" />
                  <line x1="0" y1="32" x2="350" y2="32" stroke="#2A2D35" strokeDasharray="2 2" strokeWidth="1" />
                  <path d={waveSvgPoints} />
                </svg>
              ) : (
                <div className="text-[11px] text-[#8A8D98] italic font-mono">
                  Indítsd el a szimulációt a valós idejű jelalakhoz...
                </div>
              )}
            </div>
            <div className="flex justify-between text-[9px] text-[#8A8D98] font-mono">
              <span>HIGH (5V)</span>
              <span>16 MHz AVR NANO-IDŐZÍTÉS</span>
              <span>LOW (0V)</span>
            </div>
          </div>

          {/* Virtual WS2812 NeoPixel Strip View */}
          {simulation.neoPixelPixels && (
            <div className="node-card rounded-xs p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-white uppercase tracking-wider">
                  <Sparkles className="w-3.5 h-3.5 text-rose-400" />
                  <span>WS2812B LED Sor</span>
                </div>
                <span className="text-[9px] font-mono font-bold text-rose-400 bg-[#0F1115] px-1.5 py-0.5 rounded-xs border border-[#2A2D35]">
                  800 kHz ASM Bit-Bang
                </span>
              </div>
              <div className="flex items-center justify-between bg-[#0F1115] p-2 rounded-xs border border-[#2A2D35] gap-1.5">
                {simulation.neoPixelPixels.map((color, idx) => (
                  <div key={idx} className="flex flex-col items-center gap-1">
                    <div
                      className="w-5 h-5 rounded-xs border border-[#3A3F4B] transition-all"
                      style={{
                        backgroundColor: color,
                        boxShadow: color !== '#000000' ? `0 0 8px ${color}` : 'none',
                      }}
                      title={`LED #${idx + 1}: ${color}`}
                    />
                    <span className="text-[8px] font-mono text-[#8A8D98]">#{idx}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AVR CPU Registers & Status Register (SREG) Flags */}
          <div className="node-card rounded-xs p-3 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-[#4ade80]" />
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  Regiszterek & SREG
                </h4>
              </div>
              <span className="text-[9px] text-[#8A8D98] font-mono">r16 - r26</span>
            </div>

            {/* Selected Working Registers */}
            <div className="grid grid-cols-4 gap-1 text-xs font-mono">
              {['r16', 'r17', 'r18', 'r19', 'r20', 'r24', 'r25', 'r26'].map((reg) => {
                const val = simulation.registers[reg] || 0;
                return (
                  <div
                    key={reg}
                    className="bg-[#0F1115] px-1.5 py-1 rounded-xs border border-[#2A2D35] flex items-center justify-between"
                  >
                    <span className="text-[#8A8D98] text-[10px]">{reg}:</span>
                    <span className="text-[#4ade80] font-bold text-[10px]">
                      0x{val.toString(16).padStart(2, '0').toUpperCase()}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* SREG Flags (C, Z, N, V, I) */}
            <div className="pt-2 border-t border-[#2A2D35] flex items-center justify-between text-xs">
              <span className="text-[#8A8D98] text-[10px] font-mono font-bold uppercase">SREG Bitek:</span>
              <div className="flex items-center gap-1">
                {[
                  { label: 'Z', active: simulation.sreg.Z },
                  { label: 'C', active: simulation.sreg.C },
                  { label: 'N', active: simulation.sreg.N },
                  { label: 'I', active: simulation.sreg.I },
                ].map((f) => (
                  <span
                    key={f.label}
                    className={`px-1.5 py-0.2 rounded-xs text-[10px] font-mono font-bold border ${
                      f.active
                        ? 'bg-[#1A1D24] text-[#4ade80] border-[#4ade80] shadow-[1px_1px_0px_#000]'
                        : 'bg-[#0F1115] text-[#8A8D98] border-[#2A2D35]'
                    }`}
                  >
                    {f.label}={f.active ? '1' : '0'}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ANALOG & ADC / PWM CONTROLLER */}
      {activeSubTab === 'analog' && (
        <div className="space-y-4">
          {/* ADC Input Sliders (Potentiometer Simulator) */}
          <div className="node-card rounded-xs p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-amber-400" />
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  Analóg Bemenetek (A0 - A5 Potenciométerek)
                </h4>
              </div>
              <span className="text-[10px] font-mono text-amber-400 bg-[#0F1115] px-2 py-0.5 rounded-xs border border-[#2A2D35]">
                10-bit ADC (0 - 1023)
              </span>
            </div>

            <p className="text-[11px] text-[#8A8D98]">
              Állítsd a csúszkákat valós időben! Az <code>analog_adc_read</code> blokk közvetlenül ezeket a feszültségszinteket mintavételezi az AVR ADCL/ADCH regisztereibe.
            </p>

            <div className="space-y-2.5 pt-1">
              {(['A0', 'A1', 'A2', 'A3', 'A4', 'A5'] as const).map((ch) => {
                const rawVal = simulation.analogInputs?.[ch] ?? 512;
                const voltage = ((rawVal / 1023) * 5.0).toFixed(2);
                const isActiveAdc = simulation.adcState?.activeChannel === ch;

                return (
                  <div
                    key={ch}
                    className={`p-2 rounded-xs border transition-all ${
                      isActiveAdc
                        ? 'bg-[#1E1B18] border-amber-500/60 ring-1 ring-amber-500/30'
                        : 'bg-[#0F1115] border-[#2A2D35]'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs font-mono mb-1">
                      <span className="font-bold flex items-center gap-1.5 text-white">
                        <span className={`w-2 h-2 rounded-full ${isActiveAdc ? 'bg-amber-400 animate-ping' : 'bg-[#3A3F4B]'}`} />
                        Csatorna {ch}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-amber-400 font-bold">{voltage} V</span>
                        <span className="text-[#8A8D98] text-[10px]">({rawVal})</span>
                      </div>
                    </div>

                    <input
                      type="range"
                      min="0"
                      max="1023"
                      value={rawVal}
                      onChange={(e) => onAnalogInputChange && onAnalogInputChange(ch, Number(e.target.value))}
                      className="w-full accent-amber-400 cursor-pointer"
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Hardveres PWM Kimeneti Monitor */}
          <div className="node-card rounded-xs p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400" />
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  Hardveres PWM Kimeneti Csatornák
                </h4>
              </div>
              <span className="text-[10px] font-mono text-amber-400 bg-[#0F1115] px-2 py-0.5 rounded-xs border border-[#2A2D35]">
                Fast PWM (~976 Hz)
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {pwmPins.map(({ pin, timer, reg }) => {
                const duty = simulation.pinStates[pin]?.pwmValue ?? 0;
                const percent = ((duty / 255) * 100).toFixed(1);
                return (
                  <div
                    key={pin}
                    className="p-2.5 bg-[#0F1115] border border-[#2A2D35] rounded-xs space-y-1.5 shadow-[1px_1px_0px_#000]"
                  >
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="font-bold text-white">D{pin} ({reg})</span>
                      <span className="text-amber-400 font-bold text-[11px]">{percent}%</span>
                    </div>
                    <div className="text-[9px] text-[#8A8D98] font-mono">{timer} • {duty}/255</div>
                    {/* Progress Bar */}
                    <div className="w-full bg-[#161920] h-2 rounded-xs border border-[#3A3F4B] overflow-hidden">
                      <div
                        className="bg-amber-400 h-full transition-all duration-150"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ADC Hardver Állapot Regiszterek */}
          <div className="bg-[#0F1115] rounded-xs p-3 border border-[#2A2D35] space-y-2 shadow-[2px_2px_0px_#000]">
            <div className="text-[10px] font-mono font-bold text-[#8A8D98] uppercase">
              ADC Belső Regiszter Státusz
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="bg-[#161920] p-2 rounded-xs border border-[#2A2D35]">
                <div className="text-[9px] text-[#8A8D98]">ADMUX (Csatorna)</div>
                <div className="text-amber-300 font-bold">{simulation.adcState?.activeChannel || 'A0'} (AVcc ref)</div>
              </div>
              <div className="bg-[#161920] p-2 rounded-xs border border-[#2A2D35]">
                <div className="text-[9px] text-[#8A8D98]">ADCSRA (Előosztó)</div>
                <div className="text-amber-300 font-bold">128 (125 kHz órajel)</div>
              </div>
              <div className="bg-[#161920] p-2 rounded-xs border border-[#2A2D35]">
                <div className="text-[9px] text-[#8A8D98]">Utolsó ADCW Eredmény</div>
                <div className="text-amber-300 font-bold">{simulation.adcState?.lastResult ?? 0} (10-bit)</div>
              </div>
              <div className="bg-[#161920] p-2 rounded-xs border border-[#2A2D35]">
                <div className="text-[9px] text-[#8A8D98]">Mentve ide:</div>
                <div className="text-[#4ade80] font-bold">r25:r24 regiszterpár</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: I2C (TWI) BUS MONITOR */}
      {activeSubTab === 'i2c' && (
        <div className="space-y-4">
          {/* I2C Status Header */}
          <div className="node-card rounded-xs p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Share2 className="w-4 h-4 text-purple-400" />
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  I2C (Two-Wire Interface) Állapot
                </h4>
              </div>
              <span className="text-[10px] font-mono text-purple-400 bg-[#0F1115] px-2 py-0.5 rounded-xs border border-[#2A2D35]">
                {simulation.i2cState?.speedKbps || 100} kHz
              </span>
            </div>

            {/* SDA / SCL Pins Status */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-[#0F1115] p-2.5 rounded-xs border border-[#2A2D35] flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-mono text-[#8A8D98]">SDA (A4 / PC4)</div>
                  <div className="text-xs font-mono font-bold text-white">
                    {simulation.pinStates['A4']?.value === 1 ? 'HIGH (5.0V)' : 'LOW (0.0V)'}
                  </div>
                </div>
                <div className={`w-3 h-3 rounded-full ${simulation.pinStates['A4']?.value === 1 ? 'bg-purple-400 shadow-[0_0_6px_#a855f7]' : 'bg-[#2A2D35]'}`} />
              </div>

              <div className="bg-[#0F1115] p-2.5 rounded-xs border border-[#2A2D35] flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-mono text-[#8A8D98]">SCL (A5 / PC5)</div>
                  <div className="text-xs font-mono font-bold text-white">
                    {simulation.pinStates['A5']?.value === 1 ? 'HIGH (5.0V)' : 'LOW (0.0V)'}
                  </div>
                </div>
                <div className={`w-3 h-3 rounded-full ${simulation.pinStates['A5']?.value === 1 ? 'bg-purple-400 shadow-[0_0_6px_#a855f7]' : 'bg-[#2A2D35]'}`} />
              </div>
            </div>

            <div className="text-[10px] font-mono text-[#8A8D98] bg-[#0F1115] p-2 rounded-xs border border-[#2A2D35]">
              <strong>Busz Állapot:</strong> <span className="text-purple-300 font-bold">{simulation.i2cState?.busStatus || 'IDLE'}</span> • TWBR: {simulation.i2cState?.speedKbps === 400 ? '12' : '72'} • TWCR: (TWEN | TWINT)
            </div>
          </div>

          {/* I2C Csomagnapló (Packet Log) */}
          <div className="node-card rounded-xs p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-white uppercase tracking-wider">
                <Terminal className="w-3.5 h-3.5 text-purple-400" />
                <span>I2C Tranzakciós Napló</span>
              </div>
              <span className="text-[9px] font-mono text-[#8A8D98]">
                {simulation.i2cState?.log.length || 0} Esemény
              </span>
            </div>

            <div className="bg-[#0F1115] rounded-xs p-2 border border-[#2A2D35] max-h-48 overflow-y-auto space-y-1.5 font-mono text-[10px] custom-scrollbar">
              {simulation.i2cState && simulation.i2cState.log.length > 0 ? (
                simulation.i2cState.log.map((entry) => (
                  <div
                    key={entry.id}
                    className="p-1.5 bg-[#161920] rounded-xs border border-[#2A2D35] flex items-center justify-between"
                  >
                    <div className="flex items-center gap-1.5">
                      <span className={`px-1 rounded-xs font-bold text-[9px] ${
                        entry.type === 'START' ? 'bg-emerald-500/20 text-emerald-300' :
                        entry.type === 'STOP' ? 'bg-rose-500/20 text-rose-300' :
                        entry.type === 'INIT' ? 'bg-blue-500/20 text-blue-300' :
                        'bg-purple-500/20 text-purple-300'
                      }`}>
                        [{entry.type}]
                      </span>
                      <span className="text-[#E0E0E6]">{entry.details}</span>
                    </div>
                    {entry.dataHex && (
                      <span className="text-purple-400 font-bold bg-[#0F1115] px-1 py-0.2 rounded-xs border border-[#2A2D35]">
                        {entry.dataHex}
                      </span>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-4 text-[#8A8D98] italic">
                  Adj hozzá I2C blokkokat (START, Write, STOP) a busz aktivitásához!
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: SPI MASTER HARDWARE MONITOR */}
      {activeSubTab === 'spi' && (
        <div className="space-y-4">
          {/* SPI Lines Status */}
          <div className="node-card rounded-xs p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-cyan-400" />
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  SPI Master Hardver Monitor
                </h4>
              </div>
              <span className="text-[10px] font-mono text-cyan-400 bg-[#0F1115] px-2 py-0.5 rounded-xs border border-[#2A2D35]">
                {simulation.spiState?.clockDivider || '4.0 MHz (f_osc/4)'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="bg-[#0F1115] p-2 rounded-xs border border-[#2A2D35] flex items-center justify-between">
                <div>
                  <div className="text-[9px] font-mono text-[#8A8D98]">SS / D10 (PB2)</div>
                  <div className="text-xs font-mono font-bold text-white">
                    {simulation.pinStates['10']?.value === 0 ? '0V (AKTÍV / CS)' : '5V (Inaktív)'}
                  </div>
                </div>
                <div className={`w-2.5 h-2.5 rounded-full ${simulation.pinStates['10']?.value === 0 ? 'bg-cyan-400 shadow-[0_0_6px_#06b6d4]' : 'bg-[#2A2D35]'}`} />
              </div>

              <div className="bg-[#0F1115] p-2 rounded-xs border border-[#2A2D35] flex items-center justify-between">
                <div>
                  <div className="text-[9px] font-mono text-[#8A8D98]">SCK / D13 (PB5)</div>
                  <div className="text-xs font-mono font-bold text-white">
                    {simulation.pinStates['13']?.value === 1 ? 'HIGH' : 'LOW'}
                  </div>
                </div>
                <div className={`w-2.5 h-2.5 rounded-full ${simulation.pinStates['13']?.value === 1 ? 'bg-cyan-400' : 'bg-[#2A2D35]'}`} />
              </div>

              <div className="bg-[#0F1115] p-2 rounded-xs border border-[#2A2D35] flex items-center justify-between">
                <div>
                  <div className="text-[9px] font-mono text-[#8A8D98]">MOSI / D11 (PB3)</div>
                  <div className="text-xs font-mono font-bold text-white">
                    {simulation.pinStates['11']?.value === 1 ? 'HIGH (1)' : 'LOW (0)'}
                  </div>
                </div>
                <div className={`w-2.5 h-2.5 rounded-full ${simulation.pinStates['11']?.value === 1 ? 'bg-cyan-400' : 'bg-[#2A2D35]'}`} />
              </div>

              <div className="bg-[#0F1115] p-2 rounded-xs border border-[#2A2D35] flex items-center justify-between">
                <div>
                  <div className="text-[9px] font-mono text-[#8A8D98]">MISO / D12 (PB4)</div>
                  <div className="text-xs font-mono font-bold text-white">
                    {simulation.pinStates['12']?.value === 1 ? 'HIGH (1)' : 'LOW (0)'}
                  </div>
                </div>
                <div className={`w-2.5 h-2.5 rounded-full ${simulation.pinStates['12']?.value === 1 ? 'bg-cyan-400' : 'bg-[#2A2D35]'}`} />
              </div>
            </div>
          </div>

          {/* SPI Full Duplex Log */}
          <div className="node-card rounded-xs p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-white uppercase tracking-wider">
                <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                <span>SPI Full-Duplex Bájtnapló</span>
              </div>
              <span className="text-[9px] font-mono text-[#8A8D98]">
                {simulation.spiState?.log.length || 0} Adatcsomag
              </span>
            </div>

            <div className="bg-[#0F1115] rounded-xs p-2 border border-[#2A2D35] max-h-48 overflow-y-auto space-y-1.5 font-mono text-[10px] custom-scrollbar">
              {simulation.spiState && simulation.spiState.log.length > 0 ? (
                simulation.spiState.log.map((entry) => (
                  <div
                    key={entry.id}
                    className="p-1.5 bg-[#161920] rounded-xs border border-[#2A2D35] flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-[#8A8D98]">TX:</span>
                      <span className="text-cyan-300 font-bold bg-[#0F1115] px-1 rounded-xs border border-[#2A2D35]">{entry.txHex}</span>
                      <span className="text-[#8A8D98]">→ RX:</span>
                      <span className="text-[#4ade80] font-bold bg-[#0F1115] px-1 rounded-xs border border-[#2A2D35]">{entry.rxHex}</span>
                    </div>
                    <span className="text-[#8A8D98] text-[9px]">{entry.speed}</span>
                  </div>
                ))
              ) : (
                <div className="text-center py-4 text-[#8A8D98] italic">
                  Adj hozzá SPI Init és SPI Transfer blokkokat a szimulációhoz!
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 8: DALLAS 1-WIRE & DS18B20 PROTOCOL MONITOR */}
      {activeSubTab === 'onewire' && (
        <div className="space-y-3">
          {/* 1-Wire Status Overview */}
          <div className="node-card rounded-xs p-3 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Thermometer className="w-3.5 h-3.5 text-[#06b6d4]" />
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  Dallas 1-Wire Busz & DS18B20
                </h4>
              </div>
              <span className="text-[9px] font-mono text-[#06b6d4] bg-[#0F1115] px-1.5 py-0.5 rounded-xs border border-[#2A2D35]">
                Nyitott nyelőjű (Open-Drain)
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="bg-[#0F1115] p-2 rounded-xs border border-[#2A2D35] flex items-center justify-between">
                <div>
                  <div className="text-[9px] text-[#8A8D98]">Adatvonal (DQ Pin)</div>
                  <div className="font-bold text-white">D{simulation.oneWireState?.pin || '2'}</div>
                </div>
                <div
                  className={`w-3 h-3 rounded-full border ${
                    simulation.pinStates[simulation.oneWireState?.pin || '2']?.value === 1
                      ? 'bg-[#06b6d4] border-[#06b6d4] shadow-[0_0_8px_#06b6d4]'
                      : 'bg-black border-[#2A2D35]'
                  }`}
                />
              </div>

              <div className="bg-[#0F1115] p-2 rounded-xs border border-[#2A2D35]">
                <div className="text-[9px] text-[#8A8D98]">Busz Állapot</div>
                <div className="font-bold text-amber-400">
                  {simulation.oneWireState?.busStatus || 'IDLE'}
                </div>
              </div>
            </div>

            {/* Presence & Sensor Detection */}
            <div className="p-2.5 bg-[#0F1115] rounded-xs border border-[#2A2D35] space-y-1.5">
              <div className="flex justify-between items-center text-[10px] font-mono">
                <span className="text-[#8A8D98]">Slave Presence Válasz:</span>
                <span
                  className={`px-1.5 py-0.5 rounded-xs font-bold ${
                    simulation.oneWireState?.presenceDetected
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                      : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                  }`}
                >
                  {simulation.oneWireState?.presenceDetected ? '✓ DETEKTÁLVA (60-240µs LOW)' : '✗ NINCS VÁLASZ'}
                </span>
              </div>

              <div className="flex justify-between items-center text-[10px] font-mono pt-1 border-t border-[#2A2D35]">
                <span className="text-[#8A8D98]">Legutóbbi Hőmérséklet:</span>
                <span className="text-[#06b6d4] font-bold">
                  {simulation.oneWireState?.lastTemperatureC !== undefined
                    ? `${simulation.oneWireState.lastTemperatureC.toFixed(2)} °C`
                    : '24.50 °C'}
                </span>
              </div>

              <div className="flex justify-between items-center text-[9px] font-mono text-[#8A8D98] pt-1 border-t border-[#2A2D35]">
                <span>ROM ID:</span>
                <span className="text-[#E0E0E6] font-bold">
                  {simulation.oneWireState?.romCode || '28-AA-73-04-1A-20-01-F3'}
                </span>
              </div>
            </div>
          </div>

          {/* 1-Wire Timing Slots Info */}
          <div className="node-card rounded-xs p-3 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-white uppercase tracking-wider">
              <span>1-Wire Időszeletek & Referencia</span>
              <span className="text-[9px] font-mono text-cyan-400">16 MHz Időzítés</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5 text-[9px] font-mono text-[#8A8D98]">
              <div className="p-1.5 bg-[#0F1115] border border-[#2A2D35] rounded-xs">
                <span className="text-white font-bold block">Reset Impulzus:</span>
                480 µs Master LOW + 70 µs Wait
              </div>
              <div className="p-1.5 bg-[#0F1115] border border-[#2A2D35] rounded-xs">
                <span className="text-white font-bold block">Presence Válasz:</span>
                Slave 60-240 µs LOW
              </div>
              <div className="p-1.5 bg-[#0F1115] border border-[#2A2D35] rounded-xs">
                <span className="text-white font-bold block">Write 0 / 1 Slot:</span>
                60 µs LOW / 6 µs LOW + 64 µs HIGH
              </div>
              <div className="p-1.5 bg-[#0F1115] border border-[#2A2D35] rounded-xs">
                <span className="text-white font-bold block">Read Slot:</span>
                Master 3 µs LOW, sample @ 15 µs
              </div>
            </div>
          </div>

          {/* 1-Wire Transaction Log */}
          <div className="node-card rounded-xs p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-white uppercase tracking-wider">
                <Terminal className="w-3.5 h-3.5 text-[#06b6d4]" />
                <span>1-Wire Tranzakció Napló</span>
              </div>
              <span className="text-[9px] font-mono text-[#8A8D98]">
                {simulation.oneWireState?.log.length || 0} Esemény
              </span>
            </div>

            <div className="bg-[#0F1115] rounded-xs p-2 border border-[#2A2D35] max-h-48 overflow-y-auto space-y-1.5 font-mono text-[10px] custom-scrollbar">
              {simulation.oneWireState && simulation.oneWireState.log.length > 0 ? (
                simulation.oneWireState.log.map((entry) => (
                  <div
                    key={entry.id}
                    className="p-1.5 bg-[#161920] rounded-xs border border-[#2A2D35] flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-1 py-0.2 rounded-xs font-bold text-[9px] ${
                          entry.type === 'RESET'
                            ? 'bg-purple-500/20 text-purple-400 border border-purple-500/40'
                            : entry.type === 'WRITE_BYTE'
                            ? 'bg-sky-500/20 text-sky-400 border border-sky-500/40'
                            : entry.type === 'READ_BYTE'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                            : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                        }`}
                      >
                        {entry.type}
                      </span>
                      <span className="text-[#E0E0E6] text-[10px]">{entry.details}</span>
                    </div>
                    {entry.dataHex && (
                      <span className="text-[#06b6d4] font-bold bg-[#0F1115] px-1 rounded-xs border border-[#2A2D35]">
                        {entry.dataHex}
                      </span>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-4 text-[#8A8D98] italic">
                  Adj hozzá 1-Wire Reset, Bájt Írás vagy DS18B20 blokkot a szimulációhoz!
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Execution Stats Card */}
      <div className="bg-[#0F1115] rounded-xs p-2.5 border border-[#2A2D35] text-[10px] font-mono text-[#8A8D98] space-y-1 shadow-[2px_2px_0px_#000]">
        <div className="flex justify-between">
          <span>Végrehajtott lépések:</span>
          <strong className="text-white">{simulation.stepCount}</strong>
        </div>
        <div className="flex justify-between">
          <span>Összes óraciklus:</span>
          <strong className="text-amber-300">
            {simulation.totalCycles.toLocaleString()}
          </strong>
        </div>
        <div className="flex justify-between">
          <span>Eltelt mikroszekundum:</span>
          <strong className="text-[#4ade80]">
            {((simulation.totalCycles * CYCLE_NS) / 1000).toFixed(2)} µs
          </strong>
        </div>
      </div>
    </div>
  );
};
