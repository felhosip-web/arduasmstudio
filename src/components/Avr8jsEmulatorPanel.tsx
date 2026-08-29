import React, { useState, useRef } from 'react';
import {
  Cpu,
  Zap,
  Play,
  Square,
  StepForward,
  RotateCcw,
  Upload,
  FileCode,
  CheckCircle2,
  AlertTriangle,
  Terminal,
  Activity,
  Layers,
  Sparkles,
  Info,
  HardDrive,
} from 'lucide-react';
import { SimulationState, ArduinoPin, PinState } from '../types';
import { AVR8JS_HEX_SAMPLES, AvrCpuSnapshot } from '../utils/avr8jsEngine';

interface Avr8jsEmulatorPanelProps {
  simulation: SimulationState;
  onToggleEngineMode: (mode: 'custom_event_loop' | 'avr8js' | 'visual') => void;
  onLoadHex: (hexString: string, name: string) => void;
  onStepCpu: () => void;
  onResetCpu: () => void;
  onToggleRunCpu: () => void;
  onCompileBlocksToAvr8js: () => void;
  onOpenMemoryEditor?: () => void;
  onOpenRegistersView?: () => void;
  onOpenWatchpoints?: () => void;
  onOpenStackVisualizer?: () => void;
  cpuSnapshot?: AvrCpuSnapshot | null;
}

export const Avr8jsEmulatorPanel: React.FC<Avr8jsEmulatorPanelProps> = ({
  simulation,
  onToggleEngineMode,
  onLoadHex,
  onStepCpu,
  onResetCpu,
  onToggleRunCpu,
  onCompileBlocksToAvr8js,
  onOpenMemoryEditor,
  onOpenRegistersView,
  onOpenWatchpoints,
  onOpenStackVisualizer,
  cpuSnapshot,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedSample, setSelectedSample] = useState<string>(AVR8JS_HEX_SAMPLES[0].id);
  const [hexInputText, setHexInputText] = useState<string>('');
  const [isHexModalOpen, setIsHexModalOpen] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [regFormat, setRegFormat] = useState<'HEX' | 'DEC' | 'BIN'>('HEX');

  const engineMode = simulation.engineMode || 'custom_event_loop';
  const isCustomEventLoop = engineMode === 'custom_event_loop';
  const isAvr8js = engineMode === 'avr8js';
  const isVisual = engineMode === 'visual';

  const pcHex = cpuSnapshot ? `0x${cpuSnapshot.pc.toString(16).toUpperCase().padStart(4, '0')}` : '0x0000';
  const spHex = cpuSnapshot ? `0x${cpuSnapshot.sp.toString(16).toUpperCase().padStart(4, '0')}` : '0x08FF';
  const cyclesCount = cpuSnapshot ? cpuSnapshot.cycles : (simulation.avrCpu?.cycles || 0);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        onLoadHex(content, file.name);
        setStatusMessage(`✅ Betöltve: ${file.name}`);
        setTimeout(() => setStatusMessage(null), 4000);
      }
    };
    reader.readAsText(file);
  };

  const handleLoadSample = (sampleId: string) => {
    const sample = AVR8JS_HEX_SAMPLES.find((s) => s.id === sampleId);
    if (sample) {
      onLoadHex(sample.hex, sample.name);
      setStatusMessage(`⚡ Betöltve: ${sample.name}`);
      setTimeout(() => setStatusMessage(null), 3000);
    }
  };

  return (
    <div id="avr8js-emulator-panel" className="space-y-3">
      {/* Engine Switcher Banner */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-[#161920] border border-[#2A2D35] rounded-xs shadow-[2px_2px_0px_#000]">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-[#4ade80]/10 text-[#4ade80] border border-[#4ade80]/30 rounded-xs">
            <Cpu className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#E0E0E6]">
                Szimulációs Motor
              </h3>
              <span
                className={`px-2 py-0.2 text-[10px] font-mono font-bold rounded-xs border ${
                  isCustomEventLoop
                    ? 'bg-amber-950/60 text-amber-300 border-amber-500/40'
                    : isAvr8js
                    ? 'bg-emerald-950/60 text-[#4ade80] border-emerald-500/40'
                    : 'bg-[#1A1D24] text-sky-400 border-sky-500/40'
                }`}
              >
                {isCustomEventLoop
                  ? '⚡ Saját Event-Loop Motor (Tick Queue + 2-Fázis + SREG LUT)'
                  : isAvr8js
                  ? '🛡️ Avr8js Hardver Emulátor'
                  : '🎨 Vizuális Blokkszintű'}
              </span>
            </div>
            <p className="text-[10px] text-[#8A8D98]">
              {isCustomEventLoop
                ? 'Min-heap prioritásos sor (0 polling overhead), 2-fázisú RMW védelem, 64k SREG LUT tábla (~15-20x sebesség)'
                : isAvr8js
                ? 'Valódi ATmega328P 8-bites RISC CPU mag, 16MHz órajel és gépkód'
                : 'Gyors blokkszintű szimuláció oktatáshoz'}
            </p>
          </div>
        </div>

        {/* Engine Toggle Buttons */}
        <div className="flex items-center bg-[#12141A] p-1 rounded-xs border border-[#2A2D35] gap-1">
          <button
            onClick={() => onToggleEngineMode('custom_event_loop')}
            className={`flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-xs transition-all cursor-pointer ${
              isCustomEventLoop
                ? 'bg-amber-400 text-black shadow-[1px_1px_0px_#000]'
                : 'text-[#8A8D98] hover:text-[#E0E0E6] hover:bg-[#1A1D24]'
            }`}
            title="Saját Event-Loop Motor: Min-heap Tick Queue + 2-Fázisú végrehajtás + SREG LUT táblák"
          >
            <Sparkles className="w-3 h-3" />
            <span>Saját Event-Loop</span>
          </button>

          <button
            onClick={() => onToggleEngineMode('avr8js')}
            className={`flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-xs transition-all cursor-pointer ${
              isAvr8js
                ? 'bg-[#4ade80] text-black shadow-[1px_1px_0px_#000]'
                : 'text-[#8A8D98] hover:text-[#E0E0E6] hover:bg-[#1A1D24]'
            }`}
          >
            <Zap className="w-3 h-3" />
            <span>Avr8js</span>
          </button>

          <button
            onClick={() => onToggleEngineMode('visual')}
            className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-xs transition-all cursor-pointer ${
              isVisual
                ? 'bg-sky-500 text-black shadow-[1px_1px_0px_#000]'
                : 'text-[#8A8D98] hover:text-[#E0E0E6] hover:bg-[#1A1D24]'
            }`}
          >
            Vizuális
          </button>
        </div>
      </div>

      {/* Architectural Telemetry Card (When Custom Event-Loop is active) */}
      {isCustomEventLoop && (
        <div className="p-3 bg-gradient-to-r from-[#141820] to-[#12161f] border border-amber-500/30 rounded-xs shadow-[2px_2px_0px_#000] space-y-2">
          <div className="flex items-center justify-between text-xs border-b border-[#2A2D35] pb-1.5">
            <div className="flex items-center gap-2 text-amber-400 font-bold">
              <Activity className="w-3.5 h-3.5" />
              <span>Saját Event-Loop Motor Architektúra (Tick Queue & 2-Fázis)</span>
            </div>
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/50 px-2 py-0.5 border border-emerald-500/30 rounded-2xs">
              ⚡ 10-20x Sebesség (Zero Per-Cycle Polling)
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-[11px] font-mono">
            {/* 1. Tick Queue Min-Heap */}
            <div className="p-2 bg-[#0E1015] border border-[#262A34] rounded-2xs space-y-1">
              <div className="text-amber-400 font-bold flex items-center justify-between">
                <span>⏱️ Tick Queue (Min-Heap)</span>
                <span className="text-[9px] text-[#8A8D98]">Priority Queue</span>
              </div>
              <div className="text-[10px] text-[#A0A4B0] space-y-0.5">
                <div>• Köv. Esemény: <span className="text-emerald-400">TIMER0_OVF @ +1024 c</span></div>
                <div>• Pin Sync Latch: <span className="text-sky-400">1 c periódus</span></div>
                <div>• Események: <span className="text-amber-300">Csak jövőbeli tick-eknél fut</span></div>
              </div>
            </div>

            {/* 2. 2-Phase Execution */}
            <div className="p-2 bg-[#0E1015] border border-[#262A34] rounded-2xs space-y-1">
              <div className="text-sky-400 font-bold flex items-center justify-between">
                <span>🔄 2-Fázisú Végrehajtás</span>
                <span className="text-[9px] text-[#8A8D98]">RMW Védelem</span>
              </div>
              <div className="text-[10px] text-[#A0A4B0] space-y-0.5">
                <div>• 1. Fázis: <span className="text-[#E0E0E6]">PORTx write latch puffer</span></div>
                <div>• 2. Fázis: <span className="text-[#E0E0E6]">PINx 1-ciklusos szinkronizáció</span></div>
                <div>• Státusz: <span className="text-emerald-400">RMW Race Bug Mentesség</span></div>
              </div>
            </div>

            {/* 3. SREG LUT Tables */}
            <div className="p-2 bg-[#0E1015] border border-[#262A34] rounded-2xs space-y-1">
              <div className="text-emerald-400 font-bold flex items-center justify-between">
                <span>⚡ SREG Lookup Táblák</span>
                <span className="text-[9px] text-[#8A8D98]">Zero-Branch</span>
              </div>
              <div className="text-[10px] text-[#A0A4B0] space-y-0.5">
                <div>• 65,536 elem: <span className="text-emerald-300">ADD / ADC / SUB / SBC</span></div>
                <div>• 256 elem: <span className="text-sky-300">LOGIC / INC / DEC / NEG</span></div>
                <div>• Flag Kiszámítás: <span className="text-amber-300">O(1) Array Lookup (~15%)</span></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Live CPU Metrics Strip (When Avr8js is active) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
        <div className="p-2.5 bg-[#12141A] border border-[#2A2D35] rounded-xs shadow-[1px_1px_0px_#000]">
          <div className="text-[9px] text-[#8A8D98] uppercase font-bold">Program Counter (PC)</div>
          <div className="text-sm font-bold text-[#4ade80] tracking-widest">{pcHex}</div>
          <div className="text-[9px] text-[#8A8D98] truncate">Utasítás cím a Flash-ben</div>
        </div>

        <div className="p-2.5 bg-[#12141A] border border-[#2A2D35] rounded-xs shadow-[1px_1px_0px_#000]">
          <div className="text-[9px] text-[#8A8D98] uppercase font-bold">Óraciklusok (Cycles)</div>
          <div className="text-sm font-bold text-amber-400 tracking-wider">
            {cyclesCount.toLocaleString()}
          </div>
          <div className="text-[9px] text-[#8A8D98]">@ 16 MHz órajel</div>
        </div>

        <div className="p-2.5 bg-[#12141A] border border-[#2A2D35] rounded-xs shadow-[1px_1px_0px_#000]">
          <div className="text-[9px] text-[#8A8D98] uppercase font-bold">Stack Pointer (SP)</div>
          <div className="text-sm font-bold text-[#38bdf8] tracking-widest">{spHex}</div>
          <div className="text-[9px] text-[#8A8D98]">SRAM Vég: 0x08FF</div>
        </div>

        <div className="p-2.5 bg-[#12141A] border border-[#2A2D35] rounded-xs shadow-[1px_1px_0px_#000]">
          <div className="text-[9px] text-[#8A8D98] uppercase font-bold">SREG Állapot Bitek</div>
          <div className="flex items-center gap-1 text-[10px] font-bold pt-0.5">
            {['I', 'T', 'H', 'S', 'V', 'N', 'Z', 'C'].map((flag) => {
              const isActive = cpuSnapshot ? (cpuSnapshot.sreg as any)[flag] : (simulation.sreg as any)[flag];
              return (
                <span
                  key={flag}
                  className={`w-4 h-4 rounded-2xs flex items-center justify-center border text-[9px] ${
                    isActive
                      ? 'bg-[#4ade80]/20 text-[#4ade80] border-[#4ade80]/60'
                      : 'bg-[#1A1D24] text-[#6B7280] border-[#2A2D35]'
                  }`}
                  title={`Flag ${flag}: ${isActive ? '1 (SET)' : '0 (CLEAR)'}`}
                >
                  {flag}
                </span>
              );
            })}
          </div>
          <div className="text-[9px] text-[#8A8D98]">I T H S V N Z C</div>
        </div>
      </div>

      {/* Program Loader and Sample Controls */}
      <div className="p-3 bg-[#161920] border border-[#2A2D35] rounded-xs shadow-[2px_2px_0px_#000] space-y-2.5">
        <div className="flex items-center justify-between border-b border-[#2A2D35] pb-2">
          <div className="flex items-center gap-2">
            <FileCode className="w-3.5 h-3.5 text-[#4ade80]" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#E0E0E6]">
              Intel HEX & Bináris Gépkód Betöltő
            </h4>
          </div>

          {simulation.avrCpu?.hexLoadedName && (
            <span className="text-[10px] font-mono text-[#4ade80] bg-[#12141A] px-2 py-0.5 border border-[#2A2D35] rounded-xs">
              {simulation.avrCpu.hexLoadedName}
            </span>
          )}
        </div>

        {/* Quick Sample Selector & Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div className="sm:col-span-2 flex items-center gap-1.5">
            <select
              value={selectedSample}
              onChange={(e) => {
                setSelectedSample(e.target.value);
                handleLoadSample(e.target.value);
              }}
              className="flex-1 bg-[#12141A] text-[#E0E0E6] border border-[#3A3F4B] text-xs px-2.5 py-1.5 rounded-xs font-mono focus:border-[#4ade80]"
            >
              {AVR8JS_HEX_SAMPLES.map((sample) => (
                <option key={sample.id} value={sample.id}>
                  {sample.name}
                </option>
              ))}
            </select>

            <button
              onClick={() => handleLoadSample(selectedSample)}
              className="px-3 py-1.5 bg-[#1A1D24] hover:bg-[#2A2D35] text-[#4ade80] border border-[#3A3F4B] hover:border-[#4ade80] rounded-xs text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap"
            >
              Betöltés
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 flex items-center justify-center gap-1 px-2.5 py-1.5 bg-[#1A1D24] hover:bg-[#2A2D35] text-[#E0E0E6] border border-[#3A3F4B] rounded-xs text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer"
              title="Egyedi .hex fájl feltöltése a számítógépről"
            >
              <Upload className="w-3 h-3" />
              <span>.HEX Feltöltés</span>
            </button>

            <button
              onClick={onCompileBlocksToAvr8js}
              className="flex-1 flex items-center justify-center gap-1 px-2.5 py-1.5 bg-[#4ade80] hover:bg-[#3ec973] text-black rounded-xs text-[10px] font-bold uppercase tracking-wider transition-all shadow-[1px_1px_0px_#000] cursor-pointer"
              title="Vizuális blokkok közvetlen fordítása és futtatása Avr8js-ben"
            >
              <Sparkles className="w-3 h-3" />
              <span>Blokkok Futtatása</span>
            </button>

            {onOpenMemoryEditor && (
              <button
                onClick={onOpenMemoryEditor}
                className="flex items-center justify-center gap-1 px-2.5 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-xs text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer shadow-[1px_1px_0px_#000]"
                title="1024B EEPROM és Flash memóriaterület szerkesztése (Hex/Dec/Bin)"
              >
                <HardDrive className="w-3 h-3 text-amber-400" />
                <span>EEPROM</span>
              </button>
            )}

            {onOpenWatchpoints && (
              <button
                onClick={onOpenWatchpoints}
                className="flex items-center justify-center gap-1 px-2.5 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 rounded-xs text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer shadow-[1px_1px_0px_#000]"
                title="Watchpointok: Megállás SRAM[0x0100] == 0xFF vagy PORTB írásakor"
              >
                <Zap className="w-3 h-3 text-rose-400" />
                <span>Watchpoints</span>
              </button>
            )}

            {onOpenStackVisualizer && (
              <button
                onClick={onOpenStackVisualizer}
                className="flex items-center justify-center gap-1 px-2.5 py-1.5 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/40 rounded-xs text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer shadow-[1px_1px_0px_#000]"
                title="Stack & Heap Vizualizáció és Overflow Detektor"
              >
                <Layers className="w-3 h-3 text-indigo-400" />
                <span>Stack Map</span>
              </button>
            )}

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".hex"
              className="hidden"
            />
          </div>
        </div>

        {statusMessage && (
          <div className="p-2 bg-emerald-950/40 border border-emerald-500/40 text-[#4ade80] text-xs font-mono rounded-xs flex items-center gap-1.5 animate-in fade-in">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{statusMessage}</span>
          </div>
        )}
      </div>

      {/* R0-R31 Live Register Matrix */}
      <div className="p-3 bg-[#161920] border border-[#2A2D35] rounded-xs shadow-[2px_2px_0px_#000] space-y-2">
        <div className="flex flex-wrap items-center justify-between text-xs font-mono text-[#8A8D98] border-b border-[#2A2D35] pb-2 gap-2">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[#E0E0E6] uppercase">AVR Regisztertár (R0 – R31)</span>
            <span className="text-[10px] bg-[#12141A] px-1.5 py-0.5 border border-[#2A2D35] rounded-xs text-[#4ade80]">
              0x0000 – 0x001F
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Format Selector */}
            <div className="flex items-center bg-[#0F1115] p-0.5 rounded-xs border border-[#2A2D35]">
              <button
                onClick={() => setRegFormat('HEX')}
                className={`px-1.5 py-0.5 text-[9px] font-bold rounded-2xs transition-all cursor-pointer ${
                  regFormat === 'HEX' ? 'bg-[#4ade80] text-black' : 'text-[#8A8D98] hover:text-[#E0E0E6]'
                }`}
              >
                HEX
              </button>
              <button
                onClick={() => setRegFormat('DEC')}
                className={`px-1.5 py-0.5 text-[9px] font-bold rounded-2xs transition-all cursor-pointer ${
                  regFormat === 'DEC' ? 'bg-amber-400 text-black' : 'text-[#8A8D98] hover:text-[#E0E0E6]'
                }`}
              >
                DEC
              </button>
              <button
                onClick={() => setRegFormat('BIN')}
                className={`px-1.5 py-0.5 text-[9px] font-bold rounded-2xs transition-all cursor-pointer ${
                  regFormat === 'BIN' ? 'bg-sky-400 text-black' : 'text-[#8A8D98] hover:text-[#E0E0E6]'
                }`}
              >
                BIN
              </button>
            </div>

            {onOpenRegistersView && (
              <button
                onClick={onOpenRegistersView}
                className="px-2 py-0.5 bg-[#1A1D24] hover:bg-[#2A2D35] text-sky-400 border border-[#3A3F4B] hover:border-sky-400 rounded-xs text-[10px] font-bold uppercase transition-all cursor-pointer"
                title="Részletes Bit Szerkesztő és Pointer (X, Y, Z) nézet megnyitása"
              >
                Részletes Szerkesztő &rarr;
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5 text-center font-mono">
          {Array.from({ length: 32 }, (_, i) => {
            const regKey = `r${i}`;
            const val = (cpuSnapshot?.registers[regKey] ?? simulation.registers[regKey] ?? 0) & 0xff;

            let displayVal = `0x${val.toString(16).toUpperCase().padStart(2, '0')}`;
            if (regFormat === 'DEC') {
              displayVal = val.toString(10);
            } else if (regFormat === 'BIN') {
              displayVal = val.toString(2).padStart(8, '0');
            }

            const isNonZero = val > 0;
            const isPointer = i >= 26;

            return (
              <div
                key={regKey}
                onClick={onOpenRegistersView}
                className={`p-1.5 rounded-xs border text-[10px] transition-colors cursor-pointer ${
                  isNonZero
                    ? 'bg-[#4ade80]/10 border-[#4ade80]/50 text-[#4ade80]'
                    : 'bg-[#12141A] border-[#2A2D35] text-[#8A8D98]'
                } ${isPointer ? 'ring-1 ring-amber-400/30' : ''}`}
                title={`${regKey.toUpperCase()}: 0x${val.toString(16).toUpperCase().padStart(2, '0')} (${val} dec) - Kattints a szerkesztéshez`}
              >
                <div className="flex items-center justify-between text-[8px] text-[#8A8D98] font-bold mb-0.5">
                  <span className={isPointer ? 'text-amber-400' : ''}>{regKey.toUpperCase()}</span>
                  <span className="text-[7px] text-[#6B7280]">0x{i.toString(16).toUpperCase().padStart(2, '0')}</span>
                </div>
                <div className={`font-bold ${regFormat === 'BIN' ? 'text-[8px] tracking-tighter' : 'text-[10px]'}`}>
                  {displayVal}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
