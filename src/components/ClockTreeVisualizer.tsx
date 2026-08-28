/**
 * (c) 2026 AI Studio AVR Visual Studio
 * Interactive Clock Tree & Peripheral Timing Visualizer
 * Real-time dynamic SVG graph, prescaler derivation, Timer/USART/ADC tables, and animation speed scaling.
 */

import React, { useMemo } from 'react';
import {
  Clock,
  Zap,
  Cpu,
  Sliders,
  Sparkles,
  Radio,
  Layers,
  Activity,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import { AvrFuseState } from '../types';
import { calculateClockTree, setBit, getBit } from '../utils/avrFuseCalculator';

interface ClockTreeVisualizerProps {
  fuseState: AvrFuseState;
  onUpdateFuseState: (updater: (prev: AvrFuseState) => AvrFuseState) => void;
}

export const ClockTreeVisualizer: React.FC<ClockTreeVisualizerProps> = ({
  fuseState,
  onUpdateFuseState,
}) => {
  const tree = useMemo(() => {
    return calculateClockTree(fuseState);
  }, [fuseState]);

  // Quick preset clock setter
  const handleSetClockPreset = (type: 'ext_16mhz' | 'int_8mhz' | 'int_1mhz' | 'ulp_128k' | 'rtc_32k') => {
    onUpdateFuseState((prev) => {
      let lfuse = prev.lfuse;
      if (type === 'ext_16mhz') {
        // CKSEL3..0 = 1111 (0xF), SUT1..0 = 11, CKDIV8 = 1 (unprogrammed)
        lfuse = (lfuse & 0x00) | 0xff;
      } else if (type === 'int_8mhz') {
        // CKSEL3..0 = 0010 (0x2), SUT1..0 = 10, CKDIV8 = 1
        lfuse = 0xe2;
      } else if (type === 'int_1mhz') {
        // CKSEL3..0 = 0010 (0x2), SUT1..0 = 10, CKDIV8 = 0 (programmed /8)
        lfuse = 0x62;
      } else if (type === 'ulp_128k') {
        // CKSEL3..0 = 0011 (0x3), SUT1..0 = 10, CKDIV8 = 1
        lfuse = 0xe3;
      } else if (type === 'rtc_32k') {
        // Low freq crystal 32.768kHz
        lfuse = 0xe6;
      }
      return { ...prev, lfuse };
    });
  };

  const handleToggleCkdiv8 = () => {
    onUpdateFuseState((prev) => {
      const currentBit = getBit(prev.lfuse, 7);
      const newBit = currentBit === 1 ? 0 : 1;
      return { ...prev, lfuse: setBit(prev.lfuse, 7, newBit) };
    });
  };

  // Animation duration based on actual frequency (faster frequency = faster animation)
  const animSpeedSec = useMemo(() => {
    if (tree.cpuFrequencyHz >= 16000000) return 0.5;
    if (tree.cpuFrequencyHz >= 8000000) return 0.8;
    if (tree.cpuFrequencyHz >= 1000000) return 1.5;
    if (tree.cpuFrequencyHz >= 100000) return 3.0;
    return 6.0;
  }, [tree.cpuFrequencyHz]);

  return (
    <div className="space-y-4 font-mono text-xs text-[#E0E0E6]">
      {/* QUICK PRESET SELECTOR BAR */}
      <div className="bg-[#161920] border border-[#2A2D35] p-3 rounded-xs flex flex-wrap items-center justify-between gap-2 shadow-[2px_2px_0px_#000]">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-cyan-400" />
          <span className="font-bold text-white uppercase tracking-wider text-[11px]">
            Gyors Órajelforrás Választó:
          </span>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => handleSetClockPreset('ext_16mhz')}
            className={`px-2.5 py-1 rounded-xs border transition-colors cursor-pointer text-[11px] flex items-center gap-1 ${
              tree.oscillatorType === 'external_crystal_high' && tree.prescalerRatio === 1
                ? 'bg-cyan-400 text-black font-bold border-cyan-300 shadow-[0_0_8px_#06b6d4]'
                : 'bg-[#1A1D24] text-[#8A8D98] border-[#3A3F4B] hover:text-white'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-cyan-400" />
            <span>16 MHz Kristály (Uno)</span>
          </button>

          <button
            onClick={() => handleSetClockPreset('int_8mhz')}
            className={`px-2.5 py-1 rounded-xs border transition-colors cursor-pointer text-[11px] flex items-center gap-1 ${
              tree.oscillatorType === 'internal_rc_8mhz' && tree.prescalerRatio === 1
                ? 'bg-cyan-400 text-black font-bold border-cyan-300 shadow-[0_0_8px_#06b6d4]'
                : 'bg-[#1A1D24] text-[#8A8D98] border-[#3A3F4B] hover:text-white'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>8 MHz Belső RC</span>
          </button>

          <button
            onClick={() => handleSetClockPreset('int_1mhz')}
            className={`px-2.5 py-1 rounded-xs border transition-colors cursor-pointer text-[11px] flex items-center gap-1 ${
              tree.oscillatorType === 'internal_rc_8mhz' && tree.prescalerRatio === 8
                ? 'bg-cyan-400 text-black font-bold border-cyan-300 shadow-[0_0_8px_#06b6d4]'
                : 'bg-[#1A1D24] text-[#8A8D98] border-[#3A3F4B] hover:text-white'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span>1 MHz (8MHz ÷ 8)</span>
          </button>

          <button
            onClick={() => handleSetClockPreset('ulp_128k')}
            className={`px-2.5 py-1 rounded-xs border transition-colors cursor-pointer text-[11px] flex items-center gap-1 ${
              tree.oscillatorType === 'internal_rc_128khz'
                ? 'bg-cyan-400 text-black font-bold border-cyan-300 shadow-[0_0_8px_#06b6d4]'
                : 'bg-[#1A1D24] text-[#8A8D98] border-[#3A3F4B] hover:text-white'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-purple-400" />
            <span>128 kHz Ultra Low-Power</span>
          </button>
        </div>
      </div>

      {/* INTERACTIVE ANIMATED CLOCK TREE DIAGRAM */}
      <div className="bg-[#12141A] border border-[#2A2D35] rounded-xs p-4 space-y-4 shadow-[4px_4px_0px_#000] relative overflow-hidden">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-cyan-400 animate-pulse" />
            <h3 className="font-bold text-white uppercase tracking-wider text-xs">
              AVR Szilícium Órajel-Fa & Busz Vonalak (Live Clock Tree)
            </h3>
          </div>

          <div className="flex items-center gap-2 text-[11px]">
            <span className="text-[#8A8D98]">F_CPU:</span>
            <span className="px-2 py-0.5 rounded-xs bg-cyan-950 border border-cyan-500/50 text-cyan-300 font-bold">
              {tree.cpuFrequencyFormatted}
            </span>
            <span className="text-[#8A8D98]">Ciklusidő:</span>
            <span className="px-2 py-0.5 rounded-xs bg-[#1A1D24] border border-[#3A3F4B] text-amber-300 font-bold">
              {tree.cycleTimeFormatted}
            </span>
          </div>
        </div>

        {/* SVG Diagram Canvas */}
        <div className="p-3 bg-[#0A0C10] border border-[#2A2D35] rounded-xs relative">
          <svg className="w-full h-44 sm:h-48" viewBox="0 0 900 180" fill="none">
            <style>
              {`
                @keyframes pulseDash {
                  to {
                    stroke-dashoffset: -24;
                  }
                }
                .clock-flow-line {
                  animation: pulseDash ${animSpeedSec}s linear infinite;
                }
              `}
            </style>

            {/* Background Grid Accent */}
            <defs>
              <pattern id="gridPattern" width="20" height="20" patternUnits="userSpaceOnUse">
                <circle cx="2" cy="2" r="1" fill="#1F2430" />
              </pattern>
            </defs>
            <rect width="900" height="180" fill="url(#gridPattern)" />

            {/* FLOW LINES */}
            {/* Line 1: Oscillator (210, 90) -> Prescaler (320, 90) */}
            <line
              x1="210"
              y1="90"
              x2="320"
              y2="90"
              stroke="#06b6d4"
              strokeWidth="3"
              strokeDasharray="6,4"
              className="clock-flow-line"
            />

            {/* Line 2: Prescaler (440, 90) -> CPU Core (540, 90) */}
            <line
              x1="440"
              y1="90"
              x2="540"
              y2="90"
              stroke="#06b6d4"
              strokeWidth="3"
              strokeDasharray="6,4"
              className="clock-flow-line"
            />

            {/* Line 3: CPU Core (680, 90) -> Peripheral Bus Split (760, 90) */}
            <line
              x1="680"
              y1="90"
              x2="760"
              y2="90"
              stroke="#10b981"
              strokeWidth="3"
              strokeDasharray="6,4"
              className="clock-flow-line"
            />

            {/* Branch to Timers/IO Up (760, 90) -> (820, 45) */}
            <path
              d="M 760 90 L 780 45 L 820 45"
              stroke="#10b981"
              strokeWidth="2.5"
              fill="none"
              strokeDasharray="6,4"
              className="clock-flow-line"
            />

            {/* Branch to USART/ADC Down (760, 90) -> (820, 135) */}
            <path
              d="M 760 90 L 780 135 L 820 135"
              stroke="#f59e0b"
              strokeWidth="2.5"
              fill="none"
              strokeDasharray="6,4"
              className="clock-flow-line"
            />

            {/* NODE 1: OSCILLATOR SOURCE */}
            <g transform="translate(20, 40)">
              <rect
                width="190"
                height="100"
                rx="4"
                fill="#161920"
                stroke="#06b6d4"
                strokeWidth="1.5"
                className="filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]"
              />
              <circle cx="20" cy="24" r="6" fill="#06b6d4" className="animate-ping" />
              <circle cx="20" cy="24" r="5" fill="#06b6d4" />
              <text x="34" y="28" fill="#FFFFFF" fontSize="12" fontWeight="bold" fontFamily="monospace">
                ÓRAJELFORRÁS
              </text>
              <text x="16" y="55" fill="#06b6d4" fontSize="11" fontWeight="bold" fontFamily="monospace">
                {tree.inputFrequencyFormatted}
              </text>
              <text x="16" y="75" fill="#8A8D98" fontSize="9.5" fontFamily="monospace">
                {tree.oscillatorName.slice(0, 24)}
              </text>
            </g>

            {/* NODE 2: PRESCALER (CKDIV8) */}
            <g transform="translate(320, 50)">
              <rect
                width="120"
                height="80"
                rx="4"
                fill="#1A1D24"
                stroke={tree.prescalerRatio === 8 ? '#f59e0b' : '#3A3F4B'}
                strokeWidth="1.5"
              />
              <text x="16" y="24" fill="#FFFFFF" fontSize="10" fontWeight="bold" fontFamily="monospace">
                CKDIV8 OSZTÓ
              </text>
              <text
                x="16"
                y="50"
                fill={tree.prescalerRatio === 8 ? '#f59e0b' : '#10b981'}
                fontSize="13"
                fontWeight="bold"
                fontFamily="monospace"
              >
                {tree.prescalerRatio === 8 ? '÷ 8 AKTÍV' : '÷ 1 (Átenged)'}
              </text>
              <text x="16" y="68" fill="#8A8D98" fontSize="8.5" fontFamily="monospace">
                Bit 7 @ Low Fuse
              </text>
            </g>

            {/* NODE 3: CPU CORE */}
            <g transform="translate(540, 40)">
              <rect
                width="140"
                height="100"
                rx="4"
                fill="#0e3a47"
                stroke="#06b6d4"
                strokeWidth="2"
                className="filter drop-shadow-[0_0_10px_rgba(6,182,212,0.3)]"
              />
              <text x="16" y="26" fill="#FFFFFF" fontSize="11" fontWeight="bold" fontFamily="monospace">
                CPU MAG (clk_CPU)
              </text>
              <text x="16" y="54" fill="#22d3ee" fontSize="14" fontWeight="bold" fontFamily="monospace">
                {tree.cpuFrequencyFormatted}
              </text>
              <text x="16" y="75" fill="#e0e7ff" fontSize="10" fontFamily="monospace">
                ~{tree.instructionSpeedMips} MIPS
              </text>
              <text x="16" y="90" fill="#94a3b8" fontSize="8.5" fontFamily="monospace">
                T = {tree.cycleTimeFormatted}
              </text>
            </g>

            {/* NODE 4A: TIMERS / FLASH */}
            <g transform="translate(820, 20)">
              <rect width="70" height="50" rx="3" fill="#161920" stroke="#10b981" strokeWidth="1" />
              <text x="8" y="20" fill="#10b981" fontSize="9" fontWeight="bold" fontFamily="monospace">
                clk_IO / Timers
              </text>
              <text x="8" y="38" fill="#FFFFFF" fontSize="8.5" fontFamily="monospace">
                T0, T1, T2
              </text>
            </g>

            {/* NODE 4B: USART & ADC */}
            <g transform="translate(820, 110)">
              <rect width="70" height="50" rx="3" fill="#161920" stroke="#f59e0b" strokeWidth="1" />
              <text x="8" y="20" fill="#f59e0b" fontSize="9" fontWeight="bold" fontFamily="monospace">
                USART & ADC
              </text>
              <text x="8" y="38" fill="#FFFFFF" fontSize="8.5" fontFamily="monospace">
                SAR 10-bit
              </text>
            </g>
          </svg>

          {/* Interactive button on Prescaler */}
          <div className="absolute top-4 right-4 flex items-center gap-2">
            <button
              onClick={handleToggleCkdiv8}
              className={`px-3 py-1 text-xs font-bold rounded-xs border shadow-[2px_2px_0px_#000] cursor-pointer flex items-center gap-1.5 transition-colors ${
                tree.prescalerRatio === 8
                  ? 'bg-amber-400 text-black border-amber-300 hover:bg-amber-300'
                  : 'bg-[#1A1D24] text-white border-[#3A3F4B] hover:border-cyan-400'
              }`}
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>CKDIV8 (÷8 Előosztó): {tree.prescalerRatio === 8 ? 'BEKAPCSOLVA' : 'KIKAPCSOLVA'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* PERIPHERAL CLOCK GRIDS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* 1. TIMER PRESCALERS TABLE */}
        <div className="bg-[#161920] border border-[#2A2D35] rounded-xs p-3 space-y-2 shadow-[2px_2px_0px_#000]">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-white text-[11px] uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
              <span>Timer0 / Timer1 / Timer2 Előosztások</span>
            </h4>
          </div>

          <div className="space-y-1 text-[10px]">
            <div className="grid grid-cols-3 text-[#8A8D98] font-bold pb-1 border-b border-[#2A2D35]">
              <span>Osztó</span>
              <span>Frekvencia</span>
              <span>Tick Periódus</span>
            </div>
            {tree.timerPrescalers.map((t) => (
              <div
                key={t.prescaler}
                className="grid grid-cols-3 py-1 px-1 rounded-xs bg-[#0F1115] border border-[#2A2D35] hover:border-cyan-500/40"
              >
                <span className="font-bold text-cyan-300">÷{t.prescaler}</span>
                <span className="text-white font-mono">{t.frequencyFormatted}</span>
                <span className="text-[#8A8D98]">{t.periodFormatted}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 2. USART BAUD GENERATOR TABLE */}
        <div className="bg-[#161920] border border-[#2A2D35] rounded-xs p-3 space-y-2 shadow-[2px_2px_0px_#000]">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-white text-[11px] uppercase tracking-wider flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-emerald-400" />
              <span>USART Baud Generátor & Hibaszázalék</span>
            </h4>
          </div>

          <div className="space-y-1 text-[10px]">
            <div className="grid grid-cols-4 text-[#8A8D98] font-bold pb-1 border-b border-[#2A2D35]">
              <span>Cél Baud</span>
              <span>UBRR</span>
              <span>Valós</span>
              <span>Hiba %</span>
            </div>
            {tree.usartBauds.map((u) => {
              const isExcellent = u.errorPercent < 0.8;
              const isWarning = u.errorPercent >= 2.0;

              return (
                <div
                  key={u.targetBaud}
                  className="grid grid-cols-4 py-1 px-1 rounded-xs bg-[#0F1115] border border-[#2A2D35] items-center"
                >
                  <span className="font-bold text-white">{u.targetBaud}</span>
                  <span className="text-amber-300 font-mono">{u.ubrrValue}</span>
                  <span className="text-[#8A8D98] font-mono">{u.actualBaud}</span>
                  <span
                    className={`font-bold font-mono ${
                      isWarning ? 'text-rose-400' : isExcellent ? 'text-emerald-400' : 'text-amber-300'
                    }`}
                  >
                    {u.errorPercent.toFixed(1)}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* 3. 10-BIT SAR ADC CLOCK TABLE */}
        <div className="bg-[#161920] border border-[#2A2D35] rounded-xs p-3 space-y-2 shadow-[2px_2px_0px_#000]">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-white text-[11px] uppercase tracking-wider flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>10-bit SAR ADC Órajel (50-200 kHz Optimális)</span>
            </h4>
          </div>

          <div className="space-y-1 text-[10px]">
            <div className="grid grid-cols-3 text-[#8A8D98] font-bold pb-1 border-b border-[#2A2D35]">
              <span>ADC Osztó</span>
              <span>Órajel</span>
              <span>Állapot</span>
            </div>
            {tree.adcFrequencies.map((a) => (
              <div
                key={a.prescaler}
                className={`grid grid-cols-3 py-1 px-1 rounded-xs border items-center ${
                  a.isRecommended
                    ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300 font-bold'
                    : 'bg-[#0F1115] border-[#2A2D35] text-[#8A8D98]'
                }`}
              >
                <span>÷{a.prescaler}</span>
                <span className="font-mono text-white">{a.frequencyFormatted}</span>
                <span className="text-[9px]">
                  {a.isRecommended ? '✓ Optimális' : a.frequencyHz > 200000 ? 'Túl gyors' : 'Lassú'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
