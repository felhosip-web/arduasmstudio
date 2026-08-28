/**
 * (c) 2026 AI Studio AVR Visual Studio
 * Dedicated Visual State Machine (FSM) Designer, Real-time Tracker & Dual ASM/C Generator
 * Features: Interactive State Graph Canvas, Live Stepper & Event Injection,
 * Cycle-Accurate AVR Assembly (IJMP Jump Table / CPI Switch) & Modern C99 side-by-side.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Layers,
  Plus,
  Trash2,
  ArrowRight,
  Sparkles,
  Zap,
  Clock,
  Cpu,
  CheckCircle2,
  Sliders,
  Code2,
  FileCode,
  Check,
  Copy,
  Wrench,
  HelpCircle,
  Play,
  Pause,
  RotateCcw,
  StepForward,
  Activity,
  ArrowUpRight,
  Terminal,
  Download,
  Upload,
  Radio,
  Eye,
  Settings2,
  ChevronRight,
  Compass,
} from 'lucide-react';
import { ProgramBlock, ArduinoPin, VariableDefinition } from '../types';
import {
  FsmProject,
  FsmState,
  FsmTransition,
  FsmStateAction,
  FSM_TEMPLATES,
  FsmTemplate,
  FsmDispatchArch,
  generateFsmCode,
  createInitialFsmRuntime,
  stepFsmSimulation,
  FsmSimulationRuntime,
  compileFsmToBlocks,
} from '../utils/stateMachineGenerator';
import { incrementBuild } from '../utils/versionManager';

interface StateMachineModalProps {
  isOpen: boolean;
  onClose: () => void;
  setBlocks: React.Dispatch<React.SetStateAction<ProgramBlock[]>>;
  setVariables?: React.Dispatch<React.SetStateAction<VariableDefinition[]>>;
}

export const StateMachineModal: React.FC<StateMachineModalProps> = ({
  isOpen,
  onClose,
  setBlocks,
  setVariables,
}) => {
  // Main FSM State
  const [fsm, setFsm] = useState<FsmProject>(() => JSON.parse(JSON.stringify(FSM_TEMPLATES[0].fsm)));
  const [activeTab, setActiveTab] = useState<'visual' | 'editor' | 'code' | 'templates'>('visual');
  const [selectedStateId, setSelectedStateId] = useState<string>(fsm.states[0]?.id || '');
  const [generatedSuccess, setGeneratedSuccess] = useState<boolean>(false);
  const [copiedAsm, setCopiedAsm] = useState<boolean>(false);
  const [copiedC, setCopiedC] = useState<boolean>(false);

  // Simulation Runtime State
  const [simRuntime, setSimRuntime] = useState<FsmSimulationRuntime>(() => createInitialFsmRuntime(fsm));
  const [simSpeed, setSimSpeed] = useState<number>(1); // 1x, 2x, 5x
  const [selectedArch, setSelectedArch] = useState<FsmDispatchArch>(fsm.dispatchArch || 'jump_table');

  // Dragging state nodes on canvas
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const canvasRef = useRef<SVGSVGElement | null>(null);

  // Reset runtime when FSM changes
  useEffect(() => {
    setSimRuntime(createInitialFsmRuntime(fsm));
    if (!fsm.states.some((s) => s.id === selectedStateId)) {
      setSelectedStateId(fsm.states[0]?.id || '');
    }
  }, [fsm.id]);

  // Live simulation tick interval
  useEffect(() => {
    if (!simRuntime.isRunning || !isOpen) return;

    const intervalMs = 50 / simSpeed;
    const timer = setInterval(() => {
      setSimRuntime((prev) => stepFsmSimulation(fsm, prev, 50));
    }, intervalMs);

    return () => clearInterval(timer);
  }, [simRuntime.isRunning, simSpeed, fsm, isOpen]);

  if (!isOpen) return null;

  // Code Generation Outputs
  const generatedCode = generateFsmCode({ ...fsm, dispatchArch: selectedArch });
  const activeState = fsm.states.find((s) => s.id === simRuntime.activeStateId) || fsm.states[0];
  const inspectedState = fsm.states.find((s) => s.id === selectedStateId) || fsm.states[0];

  // Helper actions
  const handleSelectTemplate = (template: FsmTemplate) => {
    const cloned: FsmProject = JSON.parse(JSON.stringify(template.fsm));
    setFsm(cloned);
    setSelectedArch(cloned.dispatchArch || 'jump_table');
    setSelectedStateId(cloned.states[0]?.id || '');
    setSimRuntime(createInitialFsmRuntime(cloned));
    setActiveTab('visual');
  };

  const handleAddState = () => {
    const newIdx = fsm.states.length;
    const newState: FsmState = {
      id: `state_${Date.now()}`,
      name: `STATE_PHASE_${newIdx + 1}`,
      label: `Új Állapot ${newIdx + 1}`,
      description: 'Egyedi állapotfeladatok és átmenetek',
      color: '#3b82f6',
      stateCode: newIdx,
      position: { x: 140 + (newIdx % 3) * 260, y: 80 + Math.floor(newIdx / 3) * 220 },
      entryActions: [{ type: 'pin_write', pin: '13', pinLevel: 'HIGH' }],
      actions: [],
    };

    setFsm((prev) => ({
      ...prev,
      states: [...prev.states, newState],
    }));
    setSelectedStateId(newState.id);
  };

  const handleDeleteState = (id: string) => {
    if (fsm.states.length <= 1) return;
    setFsm((prev) => ({
      ...prev,
      states: prev.states.filter((s) => s.id !== id),
      transitions: prev.transitions.filter((t) => t.fromStateId !== id && t.toStateId !== id),
    }));
    if (selectedStateId === id) {
      setSelectedStateId(fsm.states.find((s) => s.id !== id)?.id || '');
    }
  };

  const handleAddTransition = (fromStateId: string) => {
    const targetState = fsm.states.find((s) => s.id !== fromStateId) || fsm.states[0];
    const newTransition: FsmTransition = {
      id: `tr_${Date.now()}`,
      fromStateId,
      toStateId: targetState.id,
      label: 'Időzítés: 2000 ms',
      triggerType: 'timer_timeout',
      timeoutMs: 2000,
      description: '2000 ms után automatikus átváltás',
    };

    setFsm((prev) => ({
      ...prev,
      transitions: [...prev.transitions, newTransition],
    }));
  };

  const handleDeleteTransition = (id: string) => {
    setFsm((prev) => ({
      ...prev,
      transitions: prev.transitions.filter((t) => t.id !== id),
    }));
  };

  const handleApplyToWorkspace = () => {
    const compiled = compileFsmToBlocks(fsm);
    setBlocks(compiled.blocks);

    if (setVariables) {
      setVariables((prev) => {
        const filtered = prev.filter((v) => v.name !== compiled.variable.name);
        return [...filtered, compiled.variable];
      });
    }

    incrementBuild(`Állapotgép Alkalmazva: ${fsm.title} (${compiled.blocks.length} blokk)`);
    setGeneratedSuccess(true);
    setTimeout(() => {
      setGeneratedSuccess(false);
      onClose();
    }, 1000);
  };

  // Node Drag handlers on SVG canvas
  const handleNodeMouseDown = (e: React.MouseEvent, stateId: string) => {
    e.stopPropagation();
    setSelectedStateId(stateId);
    setDraggingNodeId(stateId);
    const targetState = fsm.states.find((s) => s.id === stateId);
    const pos = targetState?.position || { x: 100, y: 100 };
    setDragOffset({
      x: e.clientX - pos.x,
      y: e.clientY - pos.y,
    });
  };

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (!draggingNodeId || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const newX = Math.max(20, Math.min(rect.width - 220, e.clientX - dragOffset.x));
    const newY = Math.max(20, Math.min(rect.height - 140, e.clientY - dragOffset.y));

    setFsm((prev) => ({
      ...prev,
      states: prev.states.map((s) => (s.id === draggingNodeId ? { ...s, position: { x: newX, y: newY } } : s)),
    }));
  };

  const handleCanvasMouseUp = () => {
    setDraggingNodeId(null);
  };

  // Event injection helpers
  const handleTogglePin = (pin: string) => {
    setSimRuntime((prev) => {
      const current = prev.simulatedPins[pin] ?? 1;
      const nextVal: 0 | 1 = current === 1 ? 0 : 1;
      const updatedPins = { ...prev.simulatedPins, [pin]: nextVal };
      const updatedRuntime = { ...prev, simulatedPins: updatedPins };
      // Step simulation with this event
      return stepFsmSimulation(fsm, updatedRuntime, 10, {
        type: 'pin_digital_read',
        pin,
      });
    });
  };

  const handleTriggerUartChar = (char: string) => {
    setSimRuntime((prev) => {
      return stepFsmSimulation(fsm, prev, 10, {
        type: 'uart_command',
        uartChar: char,
      });
    });
  };

  const handleAdvanceTimer = (deltaMs: number) => {
    setSimRuntime((prev) => stepFsmSimulation(fsm, prev, deltaMs));
  };

  return (
    <div
      id="modal-state-machine"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-xs font-sans animate-fade-in"
    >
      <div className="bg-[#12141A] border border-[#3A3F4B] rounded-xs shadow-[6px_6px_0px_#000] w-full max-w-6xl h-[92vh] flex flex-col overflow-hidden text-[#E0E0E6]">
        {/* MODAL HEADER */}
        <div className="flex items-center justify-between px-4 py-3 bg-[#161920] border-b border-[#2A2D35] shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xs bg-purple-950/70 border border-purple-500/50 text-purple-400 shadow-[2px_2px_0px_#000]">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-white font-mono tracking-tight flex items-center gap-2">
                  <span>{fsm.title}</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-xs bg-[#1A1D24] text-purple-300 border border-purple-500/30">
                    FSM Studio
                  </span>
                </h2>
              </div>
              <p className="text-[11px] text-[#8A8D98]">
                Vizuálisan követhető állapotdiagram • Valós idejű eseményinjektálás • Ciklus-pontos AVR ASM & C kódgenerálás
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="btn-apply-fsm-blocks"
              onClick={handleApplyToWorkspace}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#4ade80] hover:bg-[#3ec973] text-black font-bold text-xs rounded-xs shadow-[2px_2px_0px_#000] transition-colors cursor-pointer"
            >
              {generatedSuccess ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Alkalmazva!</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Blokkok Generálása</span>
                </>
              )}
            </button>

            <button
              onClick={onClose}
              className="px-2.5 py-1.5 text-xs text-[#8A8D98] hover:text-white bg-[#1A1D24] hover:bg-[#222630] border border-[#3A3F4B] rounded-xs transition-colors"
            >
              Bezárás
            </button>
          </div>
        </div>

        {/* NAVIGATION TABS & CONTROLS BAR */}
        <div className="flex items-center justify-between px-4 py-2 bg-[#1A1D24] border-b border-[#2A2D35] shrink-0 flex-wrap gap-2">
          <div className="flex items-center gap-1 bg-[#12141A] p-1 rounded-xs border border-[#2A2D35]">
            <button
              onClick={() => setActiveTab('visual')}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-mono font-medium rounded-xs transition-colors ${
                activeTab === 'visual'
                  ? 'bg-purple-900/60 text-purple-300 border border-purple-500/40 shadow-xs'
                  : 'text-[#8A8D98] hover:text-white'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Diagram & Szimuláció</span>
            </button>

            <button
              onClick={() => setActiveTab('editor')}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-mono font-medium rounded-xs transition-colors ${
                activeTab === 'editor'
                  ? 'bg-purple-900/60 text-purple-300 border border-purple-500/40 shadow-xs'
                  : 'text-[#8A8D98] hover:text-white'
              }`}
            >
              <Settings2 className="w-3.5 h-3.5" />
              <span>Állapotok & Átmenetek ({fsm.states.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('code')}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-mono font-medium rounded-xs transition-colors ${
                activeTab === 'code'
                  ? 'bg-purple-900/60 text-purple-300 border border-purple-500/40 shadow-xs'
                  : 'text-[#8A8D98] hover:text-white'
              }`}
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>Párhuzamos ASM & C Kód</span>
            </button>

            <button
              onClick={() => setActiveTab('templates')}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-mono font-medium rounded-xs transition-colors ${
                activeTab === 'templates'
                  ? 'bg-purple-900/60 text-purple-300 border border-purple-500/40 shadow-xs'
                  : 'text-[#8A8D98] hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Sablonok ({FSM_TEMPLATES.length})</span>
            </button>
          </div>

          {/* Quick Simulation Mini Toolbar */}
          <div className="flex items-center gap-2 bg-[#12141A] px-2.5 py-1 rounded-xs border border-[#2A2D35]">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setSimRuntime((prev) => ({ ...prev, isRunning: !prev.isRunning }))}
                className={`flex items-center gap-1 px-2.5 py-1 text-xs font-bold font-mono rounded-xs transition-colors ${
                  simRuntime.isRunning
                    ? 'bg-amber-500 hover:bg-amber-400 text-black'
                    : 'bg-[#4ade80] hover:bg-[#3ec973] text-black'
                }`}
                title={simRuntime.isRunning ? 'Szüneteltetés' : 'Szimuláció Indítása'}
              >
                {simRuntime.isRunning ? <Pause className="w-3 h-3 fill-current" /> : <Play className="w-3 h-3 fill-current" />}
                <span>{simRuntime.isRunning ? 'PAUSE' : 'RUN'}</span>
              </button>

              <button
                onClick={() => setSimRuntime((prev) => stepFsmSimulation(fsm, prev, 100))}
                disabled={simRuntime.isRunning}
                className="p-1 px-2 text-xs bg-[#1A1D24] hover:bg-[#2A2D35] disabled:opacity-40 text-[#E0E0E6] border border-[#3A3F4B] rounded-xs"
                title="100 ms léptetése"
              >
                <StepForward className="w-3.5 h-3.5 text-purple-400" />
              </button>

              <button
                onClick={() => setSimRuntime(createInitialFsmRuntime(fsm))}
                className="p-1 px-2 text-xs bg-[#1A1D24] hover:bg-[#2A2D35] text-[#8A8D98] hover:text-white border border-[#3A3F4B] rounded-xs"
                title="Visszaállítás kezdőállapotra"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="h-4 w-[1px] bg-[#2A2D35]" />

            <div className="flex items-center gap-1.5 text-[11px] font-mono">
              <span className="text-[#8A8D98]">Aktív:</span>
              <span
                className="px-1.5 py-0.2 rounded-xs font-bold text-white shadow-xs"
                style={{ backgroundColor: activeState?.color || '#3b82f6' }}
              >
                {activeState?.name}
              </span>
              <span className="text-[#8A8D98] text-[10px]">({simRuntime.stateTimerMs} ms)</span>
            </div>
          </div>
        </div>

        {/* MODAL MAIN CONTENT AREA */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {/* TAB 1: VISUAL GRAPH CANVAS & LIVE SIMULATION */}
          {activeTab === 'visual' && (
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
              {/* Left SVG Interactive Node Canvas */}
              <div
                className="flex-1 relative bg-[#0E1015] overflow-hidden select-none border-r border-[#2A2D35] flex flex-col"
                onMouseMove={handleCanvasMouseMove}
                onMouseUp={handleCanvasMouseUp}
              >
                {/* SVG Canvas for State Graph */}
                <svg
                  ref={canvasRef}
                  className="w-full flex-1 cursor-crosshair"
                  style={{ minHeight: '380px' }}
                >
                  <defs>
                    {/* Grid Pattern */}
                    <pattern id="fsm-grid" width="24" height="24" patternUnits="userSpaceOnUse">
                      <circle cx="2" cy="2" r="1" fill="#222630" />
                    </pattern>
                    {/* Arrow Markers */}
                    <marker
                      id="arrow-marker"
                      viewBox="0 0 10 10"
                      refX="8"
                      refY="5"
                      markerWidth="6"
                      markerHeight="6"
                      orient="auto-start-reverse"
                    >
                      <path d="M 0 1 L 10 5 L 0 9 z" fill="#8A8D98" />
                    </marker>
                    <marker
                      id="arrow-marker-active"
                      viewBox="0 0 10 10"
                      refX="8"
                      refY="5"
                      markerWidth="6"
                      markerHeight="6"
                      orient="auto-start-reverse"
                    >
                      <path d="M 0 1 L 10 5 L 0 9 z" fill="#4ade80" />
                    </marker>
                  </defs>

                  <rect width="100%" height="100%" fill="url(#fsm-grid)" />

                  {/* Transition Connection Lines (Curved Bezier Paths) */}
                  {fsm.transitions.map((tr) => {
                    const fromNode = fsm.states.find((s) => s.id === tr.fromStateId);
                    const toNode = fsm.states.find((s) => s.id === tr.toStateId);
                    if (!fromNode || !toNode) return null;

                    const p1 = fromNode.position || { x: 100, y: 100 };
                    const p2 = toNode.position || { x: 400, y: 100 };

                    const startX = p1.x + 100;
                    const startY = p1.y + 45;
                    const endX = p2.x + 100;
                    const endY = p2.y + 45;

                    const isActiveStateTransition = simRuntime.activeStateId === fromNode.id;
                    const isSelfLoop = fromNode.id === toNode.id;

                    let pathD = '';
                    let labelX = (startX + endX) / 2;
                    let labelY = (startY + endY) / 2 - 12;

                    if (isSelfLoop) {
                      pathD = `M ${startX - 30} ${startY - 40} C ${startX - 60} ${startY - 100}, ${startX + 60} ${startY - 100}, ${startX + 30} ${startY - 40}`;
                      labelY = startY - 90;
                    } else {
                      const dx = endX - startX;
                      const dy = endY - startY;
                      const cx1 = startX + dx * 0.3 - dy * 0.2;
                      const cy1 = startY + dy * 0.3 + dx * 0.2;
                      const cx2 = startX + dx * 0.7 - dy * 0.2;
                      const cy2 = startY + dy * 0.7 + dx * 0.2;
                      pathD = `M ${startX} ${startY} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${endX} ${endY}`;
                      labelX = (startX + endX) / 2 - dy * 0.15;
                      labelY = (startY + endY) / 2 + dx * 0.15 - 8;
                    }

                    return (
                      <g key={tr.id} className="group">
                        <path
                          d={pathD}
                          fill="none"
                          stroke={isActiveStateTransition ? '#4ade80' : '#475569'}
                          strokeWidth={isActiveStateTransition ? 3 : 1.8}
                          strokeDasharray={isActiveStateTransition ? '6,3' : 'none'}
                          className={isActiveStateTransition ? 'animate-pulse' : ''}
                          markerEnd={isActiveStateTransition ? 'url(#arrow-marker-active)' : 'url(#arrow-marker)'}
                        />
                        <rect
                          x={labelX - 45}
                          y={labelY - 10}
                          width="90"
                          height="18"
                          rx="3"
                          fill="#161920"
                          stroke={isActiveStateTransition ? '#4ade80' : '#334155'}
                          strokeWidth="1"
                        />
                        <text
                          x={labelX}
                          y={labelY + 2}
                          fill={isActiveStateTransition ? '#4ade80' : '#94a3b8'}
                          fontSize="9"
                          fontFamily="monospace"
                          textAnchor="middle"
                          dominantBaseline="middle"
                        >
                          {tr.label.length > 14 ? tr.label.substring(0, 13) + '…' : tr.label}
                        </text>
                      </g>
                    );
                  })}

                  {/* State Nodes */}
                  {fsm.states.map((state) => {
                    const pos = state.position || { x: 100, y: 100 };
                    const isActive = simRuntime.activeStateId === state.id;
                    const isSelected = selectedStateId === state.id;

                    return (
                      <g
                        key={state.id}
                        transform={`translate(${pos.x}, ${pos.y})`}
                        onMouseDown={(e) => handleNodeMouseDown(e, state.id)}
                        className="cursor-move"
                      >
                        {/* Outer Glow for Active State */}
                        {isActive && (
                          <rect
                            x="-4"
                            y="-4"
                            width="208"
                            height="98"
                            rx="8"
                            fill="none"
                            stroke="#4ade80"
                            strokeWidth="3"
                            className="animate-pulse"
                            opacity="0.8"
                          />
                        )}

                        {/* State Card Container */}
                        <rect
                          x="0"
                          y="0"
                          width="200"
                          height="90"
                          rx="6"
                          fill="#161920"
                          stroke={isSelected ? '#a855f7' : isActive ? '#4ade80' : '#3A3F4B'}
                          strokeWidth={isSelected ? 2.5 : 1.5}
                          className="transition-all shadow-[4px_4px_0px_#000]"
                        />

                        {/* State Header Strip */}
                        <path
                          d="M 0 6 Q 0 0 6 0 L 194 0 Q 200 0 200 6 L 200 24 L 0 24 Z"
                          fill={state.color}
                          opacity="0.9"
                        />

                        {/* State Name & Badge */}
                        <text
                          x="10"
                          y="16"
                          fill="#ffffff"
                          fontSize="11"
                          fontWeight="bold"
                          fontFamily="monospace"
                        >
                          {state.name}
                        </text>

                        <text
                          x="190"
                          y="16"
                          fill="#ffffff"
                          fontSize="9"
                          fontWeight="bold"
                          fontFamily="monospace"
                          textAnchor="end"
                        >
                          #{state.stateCode}
                        </text>

                        {/* State Label & Description */}
                        <text
                          x="10"
                          y="42"
                          fill="#f1f5f9"
                          fontSize="11"
                          fontWeight="600"
                        >
                          {state.label}
                        </text>

                        {/* Action Badges inside node */}
                        <text
                          x="10"
                          y="62"
                          fill="#94a3b8"
                          fontSize="9"
                          fontFamily="monospace"
                        >
                          {state.entryActions && state.entryActions.length > 0
                            ? `⚡ Belépés: ${state.entryActions.length} akció`
                            : '⚡ Passzív állapot'}
                        </text>

                        {/* Initial state star badge */}
                        {state.isInitial && (
                          <g transform="translate(175, 68)">
                            <circle cx="6" cy="6" r="8" fill="#10b981" />
                            <text x="6" y="9" fill="#000" fontSize="8" fontWeight="bold" textAnchor="middle">
                              ★
                            </text>
                          </g>
                        )}
                      </g>
                    );
                  })}
                </svg>

                {/* Canvas Bottom Overlay: Instruction & Quick Add */}
                <div className="p-2 bg-[#12141A]/90 border-t border-[#2A2D35] flex items-center justify-between text-xs text-[#8A8D98]">
                  <div className="flex items-center gap-2">
                    <Compass className="w-3.5 h-3.5 text-purple-400" />
                    <span>Húzd az állapotokat az elrendezéshez. Kattints az átmenet / állapot vizsgálatához.</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={handleAddState}
                      className="flex items-center gap-1 px-2 py-1 bg-purple-950/80 hover:bg-purple-900 text-purple-300 border border-purple-500/40 rounded-xs font-mono font-bold"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Új Állapot (+)</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Right Live Simulation Inspector & Event Injector */}
              <div className="w-full md:w-80 bg-[#161920] p-3 flex flex-col gap-3 overflow-y-auto shrink-0 border-l border-[#2A2D35]">
                <div className="flex items-center justify-between pb-2 border-b border-[#2A2D35]">
                  <span className="text-xs font-bold text-white font-mono flex items-center gap-1.5">
                    <Activity className="w-4 h-4 text-emerald-400" />
                    <span>Élő Szimulátor & Események</span>
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-xs bg-emerald-950 text-emerald-400 border border-emerald-500/40">
                    {simRuntime.isRunning ? 'FUT' : 'SZÜNETEL'}
                  </span>
                </div>

                {/* Active State Progress */}
                <div className="p-2.5 rounded-xs bg-[#12141A] border border-[#2A2D35] space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#8A8D98]">Aktuális Állapot:</span>
                    <span className="font-mono font-bold text-white">{activeState?.name}</span>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] font-mono text-[#8A8D98]">
                      <span>Állapot Időzítő:</span>
                      <span className="text-emerald-400 font-bold">{simRuntime.stateTimerMs} ms</span>
                    </div>
                    <div className="w-full bg-[#1A1D24] h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-emerald-400 h-full transition-all duration-100"
                        style={{ width: `${Math.min(100, (simRuntime.stateTimerMs / 3000) * 100)}%` }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5 pt-1 text-[10px] font-mono">
                    <div className="p-1.5 bg-[#1A1D24] rounded-xs border border-[#2A2D35]">
                      <span className="text-[#8A8D98] block">Össz Idő:</span>
                      <span className="text-white font-bold">{simRuntime.totalTimeMs} ms</span>
                    </div>
                    <div className="p-1.5 bg-[#1A1D24] rounded-xs border border-[#2A2D35]">
                      <span className="text-[#8A8D98] block">Óraciklus:</span>
                      <span className="text-white font-bold">{simRuntime.elapsedCycles.toLocaleString()} c</span>
                    </div>
                  </div>
                </div>

                {/* Interactive Event Injectors */}
                <div className="space-y-2">
                  <span className="text-[11px] font-mono font-bold text-[#8A8D98] uppercase tracking-wider block">
                    ⚡ Esemény Injektálás (Triggerek)
                  </span>

                  {/* Pin Triggers */}
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      onClick={() => handleTogglePin('2')}
                      className={`p-2 rounded-xs border text-left text-xs font-mono transition-colors ${
                        simRuntime.simulatedPins['2'] === 0
                          ? 'bg-rose-950/80 border-rose-500/60 text-rose-300'
                          : 'bg-[#12141A] border-[#3A3F4B] hover:border-white text-[#C5C8D4]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold">D2 Gomb</span>
                        <span className="text-[10px]">{simRuntime.simulatedPins['2'] === 0 ? 'LOW' : 'HIGH'}</span>
                      </div>
                      <span className="text-[10px] text-[#8A8D98] block mt-0.5">Gyalogos / PIR</span>
                    </button>

                    <button
                      onClick={() => handleTogglePin('3')}
                      className={`p-2 rounded-xs border text-left text-xs font-mono transition-colors ${
                        simRuntime.simulatedPins['3'] === 0
                          ? 'bg-rose-950/80 border-rose-500/60 text-rose-300'
                          : 'bg-[#12141A] border-[#3A3F4B] hover:border-white text-[#C5C8D4]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold">D3 Gomb</span>
                        <span className="text-[10px]">{simRuntime.simulatedPins['3'] === 0 ? 'LOW' : 'HIGH'}</span>
                      </div>
                      <span className="text-[10px] text-[#8A8D98] block mt-0.5">Start / Élesítés</span>
                    </button>
                  </div>

                  {/* Quick Timer Triggers */}
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleAdvanceTimer(500)}
                      className="flex-1 py-1.5 bg-[#12141A] hover:bg-[#1E222D] border border-[#2A2D35] text-xs font-mono text-[#E0E0E6] rounded-xs"
                    >
                      +500 ms
                    </button>
                    <button
                      onClick={() => handleAdvanceTimer(1000)}
                      className="flex-1 py-1.5 bg-[#12141A] hover:bg-[#1E222D] border border-[#2A2D35] text-xs font-mono text-[#E0E0E6] rounded-xs"
                    >
                      +1000 ms
                    </button>
                    <button
                      onClick={() => handleAdvanceTimer(3000)}
                      className="flex-1 py-1.5 bg-[#12141A] hover:bg-[#1E222D] border border-[#2A2D35] text-xs font-mono text-[#E0E0E6] rounded-xs"
                    >
                      +3000 ms
                    </button>
                  </div>

                  {/* UART String Triggers */}
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleTriggerUartChar('$')}
                      className="flex-1 py-1.5 bg-[#12141A] hover:bg-sky-950 border border-[#2A2D35] hover:border-sky-500 text-xs font-mono text-sky-400 rounded-xs"
                    >
                      UART '$' (SOF)
                    </button>
                    <button
                      onClick={() => handleTriggerUartChar('\n')}
                      className="flex-1 py-1.5 bg-[#12141A] hover:bg-sky-950 border border-[#2A2D35] hover:border-sky-500 text-xs font-mono text-sky-400 rounded-xs"
                    >
                      UART '\n' (EOF)
                    </button>
                  </div>
                </div>

                {/* Simulated Pins Output Monitor */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-mono font-bold text-[#8A8D98] uppercase tracking-wider block">
                    💡 Hardver Lábak Állapota (I/O)
                  </span>
                  <div className="grid grid-cols-4 gap-1 font-mono text-[10px] text-center">
                    {['13', '12', '11', '8', '7', '9'].map((pin) => {
                      const isHigh = simRuntime.simulatedPins[pin] === 1;
                      return (
                        <div
                          key={pin}
                          className={`p-1 rounded-xs border ${
                            isHigh
                              ? 'bg-emerald-950 text-emerald-300 border-emerald-500/60 font-bold'
                              : 'bg-[#12141A] text-[#64748b] border-[#2A2D35]'
                          }`}
                        >
                          <span>D{pin}: {isHigh ? '1' : '0'}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* State Transition History Log */}
                <div className="flex-1 flex flex-col min-h-[140px] space-y-1.5">
                  <span className="text-[11px] font-mono font-bold text-[#8A8D98] uppercase tracking-wider flex items-center justify-between">
                    <span>📜 Átmenet Napló</span>
                    <span className="text-[10px]">{simRuntime.history.length} esemény</span>
                  </span>
                  <div className="flex-1 bg-[#12141A] p-2 rounded-xs border border-[#2A2D35] font-mono text-[10px] overflow-y-auto space-y-1">
                    {simRuntime.history.length === 0 ? (
                      <span className="text-[#64748b] italic">Nincs még rögzített átmenet.</span>
                    ) : (
                      simRuntime.history.map((h, i) => (
                        <div key={i} className="border-b border-[#1E222D] pb-1">
                          <div className="flex justify-between text-[#8A8D98]">
                            <span>{h.timestamp} ms</span>
                            <span className="text-emerald-400">{h.fromStateName} → {h.toStateName}</span>
                          </div>
                          <p className="text-[#94a3b8] text-[9px] truncate">{h.triggerReason}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: STATE & TRANSITION DETAILED EDITOR */}
          {activeTab === 'editor' && (
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
              {/* Left Column: State List */}
              <div className="w-full md:w-64 bg-[#161920] border-r border-[#2A2D35] p-3 flex flex-col gap-2 overflow-y-auto shrink-0">
                <div className="flex items-center justify-between pb-2 border-b border-[#2A2D35]">
                  <span className="text-xs font-bold text-white font-mono">Állapotok ({fsm.states.length})</span>
                  <button
                    onClick={handleAddState}
                    className="p-1 px-2 bg-purple-950 text-purple-300 border border-purple-500/40 rounded-xs text-xs font-mono font-bold flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Új
                  </button>
                </div>

                <div className="space-y-1.5">
                  {fsm.states.map((state) => {
                    const isSelected = selectedStateId === state.id;
                    const outgoing = fsm.transitions.filter((t) => t.fromStateId === state.id);

                    return (
                      <div
                        key={state.id}
                        onClick={() => setSelectedStateId(state.id)}
                        className={`p-2 rounded-xs border text-left cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-[#1E222D] border-purple-500 shadow-xs'
                            : 'bg-[#12141A] border-[#2A2D35] hover:border-[#3A3F4B]'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: state.color }} />
                            <span className="text-xs font-bold font-mono text-white">{state.name}</span>
                          </div>
                          <span className="text-[10px] font-mono text-[#8A8D98]">#{state.stateCode}</span>
                        </div>
                        <p className="text-[11px] text-[#94a3b8] mt-1">{state.label}</p>
                        <div className="flex items-center gap-2 mt-1.5 text-[10px] text-[#64748b] font-mono">
                          <span>{state.entryActions?.length || 0} akció</span>
                          <span>•</span>
                          <span>{outgoing.length} átmenet</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right Column: Selected State Form & Outgoing Transitions */}
              {inspectedState && (
                <div className="flex-1 bg-[#12141A] p-4 overflow-y-auto space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-[#2A2D35]">
                    <div>
                      <h3 className="text-sm font-bold text-white font-mono flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: inspectedState.color }} />
                        <span>{inspectedState.name} szerkesztése</span>
                      </h3>
                      <p className="text-[11px] text-[#8A8D98]">{inspectedState.label}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleDeleteState(inspectedState.id)}
                        disabled={fsm.states.length <= 1}
                        className="px-2.5 py-1 text-xs bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-500/40 rounded-xs disabled:opacity-40 flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Állapot Törlése
                      </button>
                    </div>
                  </div>

                  {/* Form fields */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="text-xs font-mono text-[#8A8D98] block mb-1">Konstans Név (C/ASM):</label>
                      <input
                        type="text"
                        value={inspectedState.name}
                        onChange={(e) =>
                          setFsm((prev) => ({
                            ...prev,
                            states: prev.states.map((s) => (s.id === inspectedState.id ? { ...s, name: e.target.value } : s)),
                          }))
                        }
                        className="w-full bg-[#161920] border border-[#3A3F4B] rounded-xs px-2.5 py-1.5 text-xs font-mono text-white focus:border-purple-400 outline-hidden"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-mono text-[#8A8D98] block mb-1">Megjelenített Címke:</label>
                      <input
                        type="text"
                        value={inspectedState.label}
                        onChange={(e) =>
                          setFsm((prev) => ({
                            ...prev,
                            states: prev.states.map((s) => (s.id === inspectedState.id ? { ...s, label: e.target.value } : s)),
                          }))
                        }
                        className="w-full bg-[#161920] border border-[#3A3F4B] rounded-xs px-2.5 py-1.5 text-xs text-white focus:border-purple-400 outline-hidden"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-mono text-[#8A8D98] block mb-1">Szín Kód:</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={inspectedState.color}
                          onChange={(e) =>
                            setFsm((prev) => ({
                              ...prev,
                              states: prev.states.map((s) => (s.id === inspectedState.id ? { ...s, color: e.target.value } : s)),
                            }))
                          }
                          className="w-8 h-8 bg-transparent cursor-pointer rounded-xs"
                        />
                        <span className="text-xs font-mono text-[#8A8D98]">{inspectedState.color}</span>
                      </div>
                    </div>
                  </div>

                  {/* Entry Actions */}
                  <div className="p-3 bg-[#161920] rounded-xs border border-[#2A2D35] space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold font-mono text-white flex items-center gap-1.5">
                        <Zap className="w-4 h-4 text-amber-400" />
                        <span>Belépési Akciók (State Entry Actions)</span>
                      </span>
                      <button
                        onClick={() => {
                          const newAct: FsmStateAction = { type: 'pin_write', pin: '13', pinLevel: 'HIGH' };
                          setFsm((prev) => ({
                            ...prev,
                            states: prev.states.map((s) =>
                              s.id === inspectedState.id
                                ? { ...s, entryActions: [...(s.entryActions || []), newAct] }
                                : s
                            ),
                          }));
                        }}
                        className="text-[11px] font-mono px-2 py-0.5 bg-amber-950 text-amber-300 border border-amber-500/40 rounded-xs"
                      >
                        + Akció
                      </button>
                    </div>

                    {(inspectedState.entryActions || []).map((act, actIdx) => (
                      <div key={actIdx} className="flex items-center gap-2 bg-[#12141A] p-2 rounded-xs border border-[#2A2D35]">
                        <select
                          value={act.type}
                          onChange={(e) => {
                            const val = e.target.value as any;
                            setFsm((prev) => ({
                              ...prev,
                              states: prev.states.map((s) =>
                                s.id === inspectedState.id
                                  ? {
                                      ...s,
                                      entryActions: (s.entryActions || []).map((a, i) => (i === actIdx ? { ...a, type: val } : a)),
                                    }
                                  : s
                              ),
                            }));
                          }}
                          className="bg-[#161920] border border-[#3A3F4B] text-xs font-mono text-white p-1 rounded-xs"
                        >
                          <option value="pin_write">Pin Írás (HIGH/LOW)</option>
                          <option value="uart_print">UART Üzenet Küldés</option>
                        </select>

                        {act.type === 'pin_write' && (
                          <>
                            <select
                              value={act.pin}
                              onChange={(e) => {
                                const p = e.target.value as any;
                                setFsm((prev) => ({
                                  ...prev,
                                  states: prev.states.map((s) =>
                                    s.id === inspectedState.id
                                      ? {
                                          ...s,
                                          entryActions: (s.entryActions || []).map((a, i) => (i === actIdx ? { ...a, pin: p } : a)),
                                        }
                                      : s
                                  ),
                                }));
                              }}
                              className="bg-[#161920] border border-[#3A3F4B] text-xs font-mono text-white p-1 rounded-xs"
                            >
                              {['13', '12', '11', '10', '9', '8', '7', '6', '5', '4', '3', '2'].map((pin) => (
                                <option key={pin} value={pin}>
                                  D{pin}
                                </option>
                              ))}
                            </select>

                            <select
                              value={act.pinLevel}
                              onChange={(e) => {
                                const lvl = e.target.value as any;
                                setFsm((prev) => ({
                                  ...prev,
                                  states: prev.states.map((s) =>
                                    s.id === inspectedState.id
                                      ? {
                                          ...s,
                                          entryActions: (s.entryActions || []).map((a, i) => (i === actIdx ? { ...a, pinLevel: lvl } : a)),
                                        }
                                      : s
                                  ),
                                }));
                              }}
                              className="bg-[#161920] border border-[#3A3F4B] text-xs font-mono text-white p-1 rounded-xs"
                            >
                              <option value="HIGH">HIGH (1)</option>
                              <option value="LOW">LOW (0)</option>
                            </select>
                          </>
                        )}

                        {act.type === 'uart_print' && (
                          <input
                            type="text"
                            value={act.text || ''}
                            onChange={(e) => {
                              const txt = e.target.value;
                              setFsm((prev) => ({
                                ...prev,
                                states: prev.states.map((s) =>
                                  s.id === inspectedState.id
                                    ? {
                                        ...s,
                                        entryActions: (s.entryActions || []).map((a, i) => (i === actIdx ? { ...a, text: txt } : a)),
                                      }
                                    : s
                                ),
                              }));
                            }}
                            className="flex-1 bg-[#161920] border border-[#3A3F4B] text-xs font-mono text-white p-1 rounded-xs"
                            placeholder="UART üzenet..."
                          />
                        )}

                        <button
                          onClick={() => {
                            setFsm((prev) => ({
                              ...prev,
                              states: prev.states.map((s) =>
                                s.id === inspectedState.id
                                  ? { ...s, entryActions: (s.entryActions || []).filter((_, i) => i !== actIdx) }
                                  : s
                              ),
                            }));
                          }}
                          className="text-rose-400 hover:text-rose-300 p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Outgoing Transitions */}
                  <div className="p-3 bg-[#161920] rounded-xs border border-[#2A2D35] space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold font-mono text-white flex items-center gap-1.5">
                        <ArrowRight className="w-4 h-4 text-purple-400" />
                        <span>Kimenő Átmenetek (Outgoing Transitions)</span>
                      </span>
                      <button
                        onClick={() => handleAddTransition(inspectedState.id)}
                        className="text-[11px] font-mono px-2 py-0.5 bg-purple-950 text-purple-300 border border-purple-500/40 rounded-xs"
                      >
                        + Átmenet
                      </button>
                    </div>

                    {fsm.transitions
                      .filter((t) => t.fromStateId === inspectedState.id)
                      .map((tr) => (
                        <div key={tr.id} className="bg-[#12141A] p-2.5 rounded-xs border border-[#2A2D35] space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-xs font-mono">
                              <span className="text-[#8A8D98]">Cél Állapot:</span>
                              <select
                                value={tr.toStateId}
                                onChange={(e) => {
                                  const targetId = e.target.value;
                                  setFsm((prev) => ({
                                    ...prev,
                                    transitions: prev.transitions.map((t) => (t.id === tr.id ? { ...t, toStateId: targetId } : t)),
                                  }));
                                }}
                                className="bg-[#161920] border border-[#3A3F4B] text-xs font-mono text-white p-1 rounded-xs"
                              >
                                {fsm.states.map((s) => (
                                  <option key={s.id} value={s.id}>
                                    {s.name} ({s.label})
                                  </option>
                                ))}
                              </select>
                            </div>

                            <button
                              onClick={() => handleDeleteTransition(tr.id)}
                              className="text-rose-400 hover:text-rose-300 p-1"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                            <div>
                              <label className="text-[10px] font-mono text-[#8A8D98] block">Trigger Típus:</label>
                              <select
                                value={tr.triggerType}
                                onChange={(e) => {
                                  const tt = e.target.value as any;
                                  setFsm((prev) => ({
                                    ...prev,
                                    transitions: prev.transitions.map((t) => (t.id === tr.id ? { ...t, triggerType: tt } : t)),
                                  }));
                                }}
                                className="w-full bg-[#161920] border border-[#3A3F4B] text-xs font-mono text-white p-1 rounded-xs mt-0.5"
                              >
                                <option value="timer_timeout">Időzítés Lejárta (Timer Timeout)</option>
                                <option value="pin_digital_read">Digitális Láb (GPIO HIGH/LOW)</option>
                                <option value="uart_command">UART Karakter Érkezése</option>
                                <option value="manual_transition">Kézi / Szoftveres Átváltás</option>
                              </select>
                            </div>

                            {tr.triggerType === 'timer_timeout' && (
                              <div>
                                <label className="text-[10px] font-mono text-[#8A8D98] block">Időtartam (ms):</label>
                                <input
                                  type="number"
                                  value={tr.timeoutMs || 1000}
                                  onChange={(e) => {
                                    const val = parseInt(e.target.value, 10) || 100;
                                    setFsm((prev) => ({
                                      ...prev,
                                      transitions: prev.transitions.map((t) =>
                                        t.id === tr.id ? { ...t, timeoutMs: val, label: `Időzítés: ${val} ms` } : t
                                      ),
                                    }));
                                  }}
                                  className="w-full bg-[#161920] border border-[#3A3F4B] text-xs font-mono text-white p-1 rounded-xs mt-0.5"
                                />
                              </div>
                            )}

                            {tr.triggerType === 'pin_digital_read' && (
                              <div className="flex gap-2">
                                <div className="flex-1">
                                  <label className="text-[10px] font-mono text-[#8A8D98] block">Bemeneti Pin:</label>
                                  <select
                                    value={tr.triggerPin || '2'}
                                    onChange={(e) => {
                                      const p = e.target.value as any;
                                      setFsm((prev) => ({
                                        ...prev,
                                        transitions: prev.transitions.map((t) => (t.id === tr.id ? { ...t, triggerPin: p } : t)),
                                      }));
                                    }}
                                    className="w-full bg-[#161920] border border-[#3A3F4B] text-xs font-mono text-white p-1 rounded-xs mt-0.5"
                                  >
                                    {['2', '3', '4', '5', '6', '7', '8', '9'].map((pin) => (
                                      <option key={pin} value={pin}>
                                        D{pin}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                                <div className="flex-1">
                                  <label className="text-[10px] font-mono text-[#8A8D98] block">Szint:</label>
                                  <select
                                    value={tr.triggerLevel || 'LOW'}
                                    onChange={(e) => {
                                      const lvl = e.target.value as any;
                                      setFsm((prev) => ({
                                        ...prev,
                                        transitions: prev.transitions.map((t) => (t.id === tr.id ? { ...t, triggerLevel: lvl } : t)),
                                      }));
                                    }}
                                    className="w-full bg-[#161920] border border-[#3A3F4B] text-xs font-mono text-white p-1 rounded-xs mt-0.5"
                                  >
                                    <option value="LOW">LOW (0 - Lenyomva)</option>
                                    <option value="HIGH">HIGH (1 - Felengedve)</option>
                                  </select>
                                </div>
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

          {/* TAB 3: DUAL SYNCHRONIZED ASM & C CODE GENERATOR */}
          {activeTab === 'code' && (
            <div className="flex-1 flex flex-col overflow-hidden bg-[#0E1015]">
              {/* Code Settings & Metrics Header */}
              <div className="p-3 bg-[#161920] border-b border-[#2A2D35] flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1 text-xs font-mono">
                    <span className="text-[#8A8D98]">Architektúra:</span>
                    <select
                      value={selectedArch}
                      onChange={(e) => setSelectedArch(e.target.value as FsmDispatchArch)}
                      className="bg-[#12141A] border border-[#3A3F4B] text-xs font-mono text-purple-300 px-2 py-1 rounded-xs"
                    >
                      <option value="jump_table">O(1) Flash Ugrótábla (IJMP Direct Dispatch)</option>
                      <option value="cpi_branch">Strukturált CPI / BREQ Switch-Case</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-2 text-[11px] font-mono">
                    <span className="px-2 py-0.5 rounded-xs bg-[#12141A] border border-[#2A2D35] text-[#4ade80]">
                      Flash: ~{generatedCode.flashBytes} bytes
                    </span>
                    <span className="px-2 py-0.5 rounded-xs bg-[#12141A] border border-[#2A2D35] text-sky-300">
                      SRAM: ~{generatedCode.sramBytes} bytes
                    </span>
                    <span className="px-2 py-0.5 rounded-xs bg-[#12141A] border border-[#2A2D35] text-amber-300">
                      Késleltetés: {generatedCode.maxDispatchCycles} ciklus ({(generatedCode.maxDispatchCycles * 62.5).toFixed(1)} ns)
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(generatedCode.asmCode);
                      setCopiedAsm(true);
                      setTimeout(() => setCopiedAsm(false), 1500);
                    }}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs bg-[#1A1D24] hover:bg-[#222630] border border-[#3A3F4B] text-purple-300 rounded-xs"
                  >
                    {copiedAsm ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedAsm ? 'ASM Másolva!' : 'ASM Másolása'}</span>
                  </button>

                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(generatedCode.cCode);
                      setCopiedC(true);
                      setTimeout(() => setCopiedC(false), 1500);
                    }}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs bg-[#1A1D24] hover:bg-[#222630] border border-[#3A3F4B] text-sky-300 rounded-xs"
                  >
                    {copiedC ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedC ? 'C Másolva!' : 'C Kód Másolása'}</span>
                  </button>
                </div>
              </div>

              {/* Side-by-Side Code Viewers */}
              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 overflow-hidden divide-y md:divide-y-0 md:divide-x divide-[#2A2D35]">
                {/* Left: AVR Assembly View */}
                <div className="flex-1 flex flex-col overflow-hidden bg-[#0D1117]">
                  <div className="px-3 py-1.5 bg-[#161920] border-b border-[#2A2D35] flex items-center justify-between text-xs font-mono font-bold text-purple-300">
                    <span className="flex items-center gap-1.5">
                      <Cpu className="w-3.5 h-3.5" />
                      <span>AVR Assembly (.S) - ATmega328P @ 16 MHz</span>
                    </span>
                    <span className="text-[10px] text-[#8A8D98]">1 ciklus = 62.5 ns</span>
                  </div>
                  <pre className="flex-1 p-3 font-mono text-[11px] text-[#C9D1D9] overflow-y-auto leading-relaxed select-text">
                    <code>{generatedCode.asmCode}</code>
                  </pre>
                </div>

                {/* Right: Modern C / Arduino View */}
                <div className="flex-1 flex flex-col overflow-hidden bg-[#0D1117]">
                  <div className="px-3 py-1.5 bg-[#161920] border-b border-[#2A2D35] flex items-center justify-between text-xs font-mono font-bold text-sky-300">
                    <span className="flex items-center gap-1.5">
                      <FileCode className="w-3.5 h-3.5" />
                      <span>Modern C99 / Arduino (.ino)</span>
                    </span>
                    <span className="text-[10px] text-[#8A8D98]">Non-blocking millis()</span>
                  </div>
                  <pre className="flex-1 p-3 font-mono text-[11px] text-[#C9D1D9] overflow-y-auto leading-relaxed select-text">
                    <code>{generatedCode.cCode}</code>
                  </pre>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: PRESET TEMPLATES */}
          {activeTab === 'templates' && (
            <div className="flex-1 bg-[#12141A] p-4 overflow-y-auto">
              <div className="max-w-4xl mx-auto space-y-3">
                <div>
                  <h3 className="text-sm font-bold text-white font-mono flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-400" />
                    <span>Ipari Beágyazott Állapotgép Sablonok</span>
                  </h3>
                  <p className="text-xs text-[#8A8D98]">
                    Válassz egy készre konfigurált valós hardveres sablont, és szabd testre a grafikus szerkesztőben!
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {FSM_TEMPLATES.map((tmpl) => (
                    <div
                      key={tmpl.id}
                      className="p-3.5 rounded-xs bg-[#161920] border border-[#2A2D35] hover:border-purple-500/60 transition-colors flex flex-col justify-between group shadow-[3px_3px_0px_#000]"
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="text-xs font-bold text-white font-mono group-hover:text-purple-300 transition-colors">
                            {tmpl.title}
                          </h4>
                          <span
                            className={`text-[9px] font-mono px-1.5 py-0.5 rounded-xs border shrink-0 ${
                              tmpl.difficulty === 'Kezdő'
                                ? 'bg-emerald-950 text-emerald-300 border-emerald-500/40'
                                : tmpl.difficulty === 'Középhaladó'
                                ? 'bg-amber-950 text-amber-300 border-amber-500/40'
                                : 'bg-rose-950 text-rose-300 border-rose-500/40'
                            }`}
                          >
                            {tmpl.difficulty}
                          </span>
                        </div>

                        <p className="text-xs text-[#94a3b8] leading-relaxed">{tmpl.description}</p>

                        <div className="flex items-center gap-2 text-[10px] font-mono text-[#8A8D98] pt-1">
                          <span className="px-1.5 py-0.5 rounded-xs bg-[#12141A] border border-[#2A2D35]">
                            {tmpl.fsm.states.length} Állapot
                          </span>
                          <span className="px-1.5 py-0.5 rounded-xs bg-[#12141A] border border-[#2A2D35]">
                            {tmpl.fsm.transitions.length} Átmenet
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleSelectTemplate(tmpl)}
                        className="mt-3 w-full py-1.5 bg-purple-950 hover:bg-purple-900 text-purple-300 border border-purple-500/40 rounded-xs text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Sablon Betöltése</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
