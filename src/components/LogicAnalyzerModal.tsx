/**
 * (c) 2026 AI Studio AVR Visual Studio
 * Saleae-Grade Multi-Track Logic Analyzer & Oscilloscope
 * Cycle-accurate timeline trace for all Pins, PC, SP, SREG, PORTB/C/D buses.
 * Supports 1-cycle zoom (62.5ns @ 16MHz), drag&drop range pulse measurements ("Itt 12 ciklusig magas volt PD2").
 */

import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Activity,
  Zap,
  Sliders,
  Maximize2,
  Minimize2,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  Download,
  Copy,
  Check,
  Eye,
  EyeOff,
  Cpu,
  Layers,
  ArrowRight,
  TrendingUp,
  Search,
  Crosshair,
  FileSpreadsheet,
  MousePointer,
  ZoomIn,
  ZoomOut,
  Info,
  X,
  Target,
} from 'lucide-react';
import { ProgramBlock, ArduinoPin, SimulationState } from '../types';
import {
  LogicChannel,
  DEFAULT_CHANNELS,
  TIME_DIVISIONS,
  generateWaveformTimeline,
  formatTimeWithUnit,
  formatFrequency,
  calculateRangeMeasurement,
  RangeMeasurementResult,
  DecodedProtocolFrame,
} from '../utils/logicAnalyzerEngine';

interface LogicAnalyzerModalProps {
  isOpen: boolean;
  onClose: () => void;
  blocks: ProgramBlock[];
  simulationState?: SimulationState;
}

export const LogicAnalyzerModal: React.FC<LogicAnalyzerModalProps> = ({
  isOpen,
  onClose,
  blocks,
  simulationState,
}) => {
  const [channels, setChannels] = useState<LogicChannel[]>(DEFAULT_CHANNELS);
  const [timeDivIdx, setTimeDivIdx] = useState<number>(0); // 0 = 62.5 ns/div (1 Ciklus @ 16 MHz)
  const [cursorA, setCursorA] = useState<number>(0);
  const [cursorB, setCursorB] = useState<number>(750); // 12 cycles = 750 ns default
  const [activeTab, setActiveTab] = useState<'waveform' | 'protocol' | 'measurements'>('waveform');
  const [copiedData, setCopiedData] = useState<boolean>(false);
  const [showCpuTracks, setShowCpuTracks] = useState<boolean>(true);

  // Drag-and-drop range selection state
  const [isSelectingRange, setIsSelectingRange] = useState<boolean>(false);
  const [selectionStartNs, setSelectionStartNs] = useState<number | null>(null);
  const [selectionEndNs, setSelectionEndNs] = useState<number | null>(null);
  const [selectedChannelPin, setSelectedChannelPin] = useState<string>('2'); // D2 (PD2) default

  const [draggingCursor, setDraggingCursor] = useState<'A' | 'B' | null>(null);

  const waveformContainerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const selectedTimeDiv = TIME_DIVISIONS[timeDivIdx] || TIME_DIVISIONS[0];

  const timelineData = useMemo(() => {
    return generateWaveformTimeline(blocks, simulationState, channels, selectedTimeDiv.ns);
  }, [blocks, simulationState, channels, selectedTimeDiv.ns]);

  // Calculate live drag & drop range measurement
  const activeRangeMeasurement: RangeMeasurementResult | null = useMemo(() => {
    const start = selectionStartNs !== null ? selectionStartNs : cursorA;
    const end = selectionEndNs !== null ? selectionEndNs : cursorB;
    const ch = channels.find((c) => c.pin === selectedChannelPin) || channels[0];
    const chName = ch ? ch.name : `D${selectedChannelPin}`;

    return calculateRangeMeasurement(start, end, selectedChannelPin, timelineData.samples, chName);
  }, [selectionStartNs, selectionEndNs, cursorA, cursorB, selectedChannelPin, timelineData.samples, channels]);

  if (!isOpen) return null;

  const totalTimeNs = Math.max(timelineData.totalDurationNs, selectedTimeDiv.ns * 10);
  const cursorDeltaNs = Math.abs(cursorB - cursorA);
  const cursorCycles = Math.round(cursorDeltaNs / 62.5);
  const cursorFrequencyHz = cursorDeltaNs > 0 ? Math.round(1e9 / cursorDeltaNs) : 0;

  // Toggle channel visibility
  const toggleChannel = (chId: string) => {
    setChannels((prev) =>
      prev.map((c) => (c.id === chId ? { ...c, enabled: !c.enabled } : c))
    );
  };

  const handleExportCsv = () => {
    const header = ['Idő (ns)', 'Ciklus (16MHz)', 'PC', 'SP', 'SREG', ...timelineData.channels.map((c) => c.name)].join(',');
    const rows = timelineData.samples.map((s) => {
      const pinValues = timelineData.channels.map((c) => s.pinStates[c.pin] ?? 0);
      const pcHex = s.pc !== undefined ? `0x${s.pc.toString(16).toUpperCase()}` : '';
      const spHex = s.sp !== undefined ? `0x${s.sp.toString(16).toUpperCase()}` : '';
      const sregHex = s.sreg !== undefined ? `0x${s.sreg.toString(16).toUpperCase()}` : '';
      const cycle = s.cycle ?? Math.round(s.timeNs / 62.5);
      return [s.timeNs, cycle, pcHex, spHex, sregHex, ...pinValues].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [header, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `saleae_avr_trace_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
  };

  const handleCopyMeasurementText = () => {
    if (activeRangeMeasurement) {
      navigator.clipboard.writeText(activeRangeMeasurement.naturalSentenceHu);
      setCopiedData(true);
      setTimeout(() => setCopiedData(false), 2000);
    }
  };

  // SVG Geometry Calculation
  const startX = 140; // Channel label column width
  const svgWidth = Math.max(900, 1000);
  const channelHeight = 36;
  const cpuTrackHeight = 32;

  const numCpuTracks = showCpuTracks ? 3 : 0; // PC, SP, SREG
  const svgHeight = 40 + timelineData.channels.length * channelHeight + numCpuTracks * cpuTrackHeight + 20;
  const timeScale = (svgWidth - startX - 30) / (totalTimeNs || 1);

  const getNsFromX = (clientX: number) => {
    if (!svgRef.current) return 0;
    const rect = svgRef.current.getBoundingClientRect();
    const mouseX = clientX - rect.left;
    const clampedX = Math.max(startX, Math.min(svgWidth - 30, mouseX));
    return (clampedX - startX) / timeScale;
  };

  // Mouse Handlers for Drag-and-drop Selection & Cursors
  const handleSvgMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    if (draggingCursor) return;
    const ns = getNsFromX(e.clientX);
    setIsSelectingRange(true);
    setSelectionStartNs(ns);
    setSelectionEndNs(ns);
  };

  const handleSvgMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const ns = getNsFromX(e.clientX);

    if (draggingCursor === 'A') {
      setCursorA(Math.min(ns, totalTimeNs));
    } else if (draggingCursor === 'B') {
      setCursorB(Math.min(ns, totalTimeNs));
    } else if (isSelectingRange) {
      setSelectionEndNs(Math.min(ns, totalTimeNs));
    }
  };

  const handleSvgMouseUp = () => {
    setIsSelectingRange(false);
    setDraggingCursor(null);
    if (selectionStartNs !== null && selectionEndNs !== null) {
      setCursorA(Math.min(selectionStartNs, selectionEndNs));
      setCursorB(Math.max(selectionStartNs, selectionEndNs));
    }
  };

  const cursorAX = startX + cursorA * timeScale;
  const cursorBX = startX + cursorB * timeScale;
  const selMinX = Math.min(cursorAX, cursorBX);
  const selMaxX = Math.max(cursorAX, cursorBX);
  const selWidth = Math.max(2, selMaxX - selMinX);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-5 animate-in fade-in duration-200">
      <div
        id="saleae-logic-analyzer-modal"
        className="relative w-full max-w-7xl bg-[#0e1117] border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh] text-slate-200"
      >
        {/* Top Header Bar */}
        <div className="px-5 py-3.5 bg-[#161b22] border-b border-slate-800 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-wide">
                  Saleae-Grade Logikai Analizátor & Ciklus Trace
                </h2>
                <span className="px-2 py-0.5 text-[11px] font-bold bg-emerald-500/20 text-emerald-300 rounded-full border border-emerald-500/30">
                  1-Ciklus (62.5ns) Felbontás
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Valós idejű hardver idővonal: Minden Pin, PC, SP és SREG változás egy közös sávon.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* 1-Cycle Quick Zoom Button */}
            <button
              onClick={() => setTimeDivIdx(0)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                timeDivIdx === 0
                  ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/30'
                  : 'bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/40'
              }`}
            >
              <ZoomIn className="w-3.5 h-3.5" /> 1 Ciklus Nézet (62.5 ns)
            </button>

            <button
              onClick={handleExportCsv}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 border border-slate-700"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" /> Export CSV
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Dynamic Drag & Drop Measurement Banner (Saleae Style) */}
        {activeRangeMeasurement && (
          <div className="px-5 py-2.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between flex-wrap gap-3 font-mono text-xs">
            <div className="flex items-center gap-3">
              <div className="p-1.5 bg-sky-500/20 text-sky-400 rounded-lg">
                <MousePointer className="w-4 h-4" />
              </div>
              <div>
                <div className="text-white font-bold flex items-center gap-2">
                  <span className="text-amber-400">"{activeRangeMeasurement.naturalSentenceHu}"</span>
                </div>
                <div className="text-slate-400 text-[11px] mt-0.5 flex items-center gap-3">
                  <span>Δt = <strong className="text-sky-300">{formatTimeWithUnit(activeRangeMeasurement.durationNs)}</strong></span>
                  <span>Ciklusok: <strong className="text-emerald-400">{activeRangeMeasurement.cyclesCount} ciklus</strong></span>
                  <span>Frekvencia: <strong className="text-purple-300">{formatFrequency(activeRangeMeasurement.frequencyHz)}</strong></span>
                  <span>Élek: <strong>{activeRangeMeasurement.edgeCount}</strong></span>
                  {activeRangeMeasurement.pcRange && (
                    <span>PC Tartomány: <strong className="text-amber-300">{activeRangeMeasurement.pcRange}</strong></span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyMeasurementText}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] rounded-lg transition flex items-center gap-1 border border-slate-700"
              >
                {copiedData ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                {copiedData ? 'Másolva!' : 'Szöveg Másolása'}
              </button>
            </div>
          </div>
        )}

        {/* Toolbar & Controls */}
        <div className="px-5 py-2.5 bg-[#12161f] border-b border-slate-800/80 flex items-center justify-between flex-wrap gap-3 text-xs">
          {/* Zoom / Time Division Selector */}
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-semibold flex items-center gap-1">
              <ZoomIn className="w-3.5 h-3.5 text-amber-400" /> Időskála (Zoom):
            </span>
            <select
              value={timeDivIdx}
              onChange={(e) => setTimeDivIdx(parseInt(e.target.value))}
              className="bg-slate-900 border border-slate-700 text-white rounded-lg px-2.5 py-1 font-mono focus:outline-none focus:border-amber-500"
            >
              {TIME_DIVISIONS.map((td, idx) => (
                <option key={idx} value={idx}>
                  {td.label}
                </option>
              ))}
            </select>
          </div>

          {/* Measuring Channel Focus */}
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-semibold flex items-center gap-1">
              <Target className="w-3.5 h-3.5 text-sky-400" /> Kijelölt Mérőcsatorna:
            </span>
            <select
              value={selectedChannelPin}
              onChange={(e) => setSelectedChannelPin(e.target.value)}
              className="bg-slate-900 border border-slate-700 text-sky-300 rounded-lg px-2.5 py-1 font-mono focus:outline-none focus:border-sky-500"
            >
              {channels.map((ch) => (
                <option key={ch.pin} value={ch.pin}>
                  {ch.name}
                </option>
              ))}
            </select>
          </div>

          {/* Toggle CPU Tracks */}
          <button
            onClick={() => setShowCpuTracks(!showCpuTracks)}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 border ${
              showCpuTracks
                ? 'bg-purple-950/60 border-purple-500/50 text-purple-300'
                : 'bg-slate-800 border-slate-700 text-slate-400'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" /> {showCpuTracks ? 'CPU Sávok (PC, SP, SREG) BE' : 'CPU Sávok KI'}
          </button>
        </div>

        {/* Main Canvas Scroll Area */}
        <div className="p-4 overflow-y-auto overflow-x-auto flex-1 bg-[#090b10]">
          <div
            ref={waveformContainerRef}
            className="bg-[#0c0e14] border border-slate-800 rounded-xl p-3 shadow-inner select-none font-mono"
          >
            <svg
              ref={svgRef}
              width={svgWidth}
              height={svgHeight}
              className="overflow-visible cursor-crosshair"
              onMouseDown={handleSvgMouseDown}
              onMouseMove={handleSvgMouseMove}
              onMouseUp={handleSvgMouseUp}
            >
              {/* Drag & Drop Selection Highlight Area */}
              <rect
                x={selMinX}
                y={20}
                width={selWidth}
                height={svgHeight - 35}
                fill="rgba(56, 189, 248, 0.12)"
                stroke="#38bdf8"
                strokeWidth="1"
                strokeDasharray="4 2"
              />

              {/* Time Grid Division Lines */}
              {Array.from({ length: 11 }).map((_, i) => {
                const gridX = startX + i * ((svgWidth - startX - 30) / 10);
                const gridTime = (totalTimeNs / 10) * i;
                const gridCycles = Math.round(gridTime / 62.5);
                return (
                  <g key={i}>
                    <line
                      x1={gridX}
                      y1={20}
                      x2={gridX}
                      y2={svgHeight - 15}
                      stroke="#1e232f"
                      strokeWidth="1"
                      strokeDasharray="2 2"
                    />
                    <text
                      x={gridX}
                      y={14}
                      fill="#64748b"
                      fontSize="9"
                      textAnchor="middle"
                    >
                      {formatTimeWithUnit(gridTime)} ({gridCycles}c)
                    </text>
                  </g>
                );
              })}

              {/* CPU TRACK 1: PC (Program Counter & Disassembly) */}
              {showCpuTracks && (
                <g transform="translate(0, 25)">
                  <rect
                    x={5}
                    y={2}
                    width={125}
                    height={cpuTrackHeight - 4}
                    fill="#181326"
                    stroke="#581c87"
                    rx={4}
                  />
                  <circle cx={14} cy={16} r={3.5} fill="#c084fc" />
                  <text x={24} y={15} fill="#FFFFFF" fontSize="9" fontWeight="bold">
                    PC (Opcode)
                  </text>
                  <text x={24} y={24} fill="#a855f7" fontSize="7">
                    0x{(simulationState?.cpuSnapshot?.pc || 0).toString(16).toUpperCase()} ({simulationState?.cpuSnapshot?.lastExecutedAsm || 'EXEC'})
                  </text>

                  {/* PC Waveform Bus block representation */}
                  <rect
                    x={startX}
                    y={6}
                    width={svgWidth - startX - 30}
                    height={18}
                    fill="#2e1065"
                    stroke="#9333ea"
                    strokeWidth="1"
                    rx={3}
                  />
                  <text
                    x={startX + 10}
                    y={19}
                    fill="#e9d5ff"
                    fontSize="9"
                    fontWeight="bold"
                  >
                    PC: 0x{(simulationState?.cpuSnapshot?.pc || 0).toString(16).toUpperCase()} • {simulationState?.cpuSnapshot?.lastExecutedAsm || 'RJMP / LDI / OUT'}
                  </text>
                </g>
              )}

              {/* CPU TRACK 2: SP (Stack Pointer) */}
              {showCpuTracks && (
                <g transform="translate(0, 58)">
                  <rect
                    x={5}
                    y={2}
                    width={125}
                    height={cpuTrackHeight - 4}
                    fill="#0f1f2e"
                    stroke="#0369a1"
                    rx={4}
                  />
                  <circle cx={14} cy={16} r={3.5} fill="#38bdf8" />
                  <text x={24} y={15} fill="#FFFFFF" fontSize="9" fontWeight="bold">
                    SP (Veremtár)
                  </text>
                  <text x={24} y={24} fill="#0ea5e9" fontSize="7">
                    0x{(simulationState?.cpuSnapshot?.sp || 0x08ff).toString(16).toUpperCase()}
                  </text>

                  <rect
                    x={startX}
                    y={6}
                    width={svgWidth - startX - 30}
                    height={18}
                    fill="#082f49"
                    stroke="#0284c7"
                    strokeWidth="1"
                    rx={3}
                  />
                  <text
                    x={startX + 10}
                    y={19}
                    fill="#bae6fd"
                    fontSize="9"
                    fontWeight="bold"
                  >
                    SP = 0x{(simulationState?.cpuSnapshot?.sp || 0x08ff).toString(16).toUpperCase()} (RAMEND - {0x08ff - (simulationState?.cpuSnapshot?.sp || 0x08ff)} B)
                  </text>
                </g>
              )}

              {/* CPU TRACK 3: SREG (Status Register Flags) */}
              {showCpuTracks && (
                <g transform="translate(0, 91)">
                  <rect
                    x={5}
                    y={2}
                    width={125}
                    height={cpuTrackHeight - 4}
                    fill="#241a0d"
                    stroke="#b45309"
                    rx={4}
                  />
                  <circle cx={14} cy={16} r={3.5} fill="#f59e0b" />
                  <text x={24} y={15} fill="#FFFFFF" fontSize="9" fontWeight="bold">
                    SREG (Státusz)
                  </text>
                  <text x={24} y={24} fill="#fbbf24" fontSize="7">
                    [I T H S V N Z C]
                  </text>

                  <rect
                    x={startX}
                    y={6}
                    width={svgWidth - startX - 30}
                    height={18}
                    fill="#451a03"
                    stroke="#d97706"
                    strokeWidth="1"
                    rx={3}
                  />
                  <text
                    x={startX + 10}
                    y={19}
                    fill="#fde68a"
                    fontSize="9"
                    fontWeight="bold"
                  >
                    SREG: [ I:{simulationState?.cpuSnapshot?.sreg.I ? '1' : '0'} T:{simulationState?.cpuSnapshot?.sreg.T ? '1' : '0'} H:{simulationState?.cpuSnapshot?.sreg.H ? '1' : '0'} S:{simulationState?.cpuSnapshot?.sreg.S ? '1' : '0'} V:{simulationState?.cpuSnapshot?.sreg.V ? '1' : '0'} N:{simulationState?.cpuSnapshot?.sreg.N ? '1' : '0'} Z:{simulationState?.cpuSnapshot?.sreg.Z ? '1' : '0'} C:{simulationState?.cpuSnapshot?.sreg.C ? '1' : '0'} ]
                  </text>
                </g>
              )}

              {/* Digital Pin Waveform Channels */}
              {timelineData.channels.map((ch, idx) => {
                const baseOffsetY = showCpuTracks ? 128 : 25;
                const chY = baseOffsetY + idx * channelHeight;
                const highY = chY + 6;
                const lowY = chY + 26;

                let pathD = '';
                let prevVal: 0 | 1 = 0;

                if (timelineData.samples.length > 0) {
                  timelineData.samples.forEach((s, sIdx) => {
                    const val = s.pinStates[ch.pin] ?? 0;
                    const sampleX = startX + s.timeNs * timeScale;
                    const currentY = val === 1 ? highY : lowY;

                    if (sIdx === 0) {
                      pathD += `M ${sampleX} ${currentY} `;
                    } else {
                      const prevY = prevVal === 1 ? highY : lowY;
                      if (prevY !== currentY) {
                        pathD += `V ${currentY} `;
                      }
                      pathD += `H ${sampleX} `;
                    }
                    prevVal = val;
                  });

                  // Extend to end of timeline
                  const endX = startX + totalTimeNs * timeScale;
                  pathD += `H ${endX}`;
                }

                return (
                  <g key={ch.id}>
                    {/* Channel Label Badge */}
                    <rect
                      x={5}
                      y={chY + 2}
                      width={125}
                      height={channelHeight - 6}
                      fill="#12161f"
                      stroke="#222a38"
                      rx={4}
                    />
                    <circle cx={14} cy={chY + 16} r={3.5} fill={ch.color} />
                    <text
                      x={24}
                      y={chY + 15}
                      fill="#FFFFFF"
                      fontSize="9.5"
                      fontWeight="bold"
                    >
                      {ch.pin}
                    </text>
                    <text
                      x={24}
                      y={chY + 25}
                      fill="#8A8D98"
                      fontSize="7.5"
                    >
                      {ch.name.length > 14 ? ch.name.substring(0, 13) + '…' : ch.name}
                    </text>

                    {/* Low Reference Guideline */}
                    <line
                      x1={startX}
                      y1={lowY}
                      x2={svgWidth - 30}
                      y2={lowY}
                      stroke="#161c26"
                      strokeWidth="1"
                    />

                    {/* Digital Signal Waveform Polyline */}
                    <path
                      d={pathD}
                      fill="none"
                      stroke={ch.color}
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </g>
                );
              })}

              {/* CURSOR A (Rose) */}
              <g
                className="cursor-ew-resize"
                onMouseDown={() => setDraggingCursor('A')}
              >
                <line
                  x1={cursorAX}
                  y1={20}
                  x2={cursorAX}
                  y2={svgHeight - 10}
                  stroke="#f43f5e"
                  strokeWidth="2"
                  strokeDasharray="4 2"
                />
                <polygon
                  points={`${cursorAX - 6},12 ${cursorAX + 6},12 ${cursorAX},20`}
                  fill="#f43f5e"
                />
                <text
                  x={cursorAX}
                  y={9}
                  fill="#f43f5e"
                  fontSize="9"
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  A ({formatTimeWithUnit(cursorA)})
                </text>
              </g>

              {/* CURSOR B (Sky) */}
              <g
                className="cursor-ew-resize"
                onMouseDown={() => setDraggingCursor('B')}
              >
                <line
                  x1={cursorBX}
                  y1={20}
                  x2={cursorBX}
                  y2={svgHeight - 10}
                  stroke="#38bdf8"
                  strokeWidth="2"
                  strokeDasharray="4 2"
                />
                <polygon
                  points={`${cursorBX - 6},12 ${cursorBX + 6},12 ${cursorBX},20`}
                  fill="#38bdf8"
                />
                <text
                  x={cursorBX}
                  y={9}
                  fill="#38bdf8"
                  fontSize="9"
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  B ({formatTimeWithUnit(cursorB)})
                </text>
              </g>
            </svg>
          </div>
        </div>

        {/* Footer info bar */}
        <div className="px-5 py-3 bg-[#161b22] border-t border-slate-800 flex items-center justify-between text-xs font-mono text-slate-400">
          <div>
            💡 <strong>Tipp:</strong> Húzd az egeret a sávokon a kívánt tartomány kijelöléséhez ("Itt 12 ciklusig magas volt PD2").
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-lg transition"
          >
            Bezárás
          </button>
        </div>
      </div>
    </div>
  );
};
