/**
 * (c) 2026 AI Studio - Dedicated FreeRTOS Architecture Editor & Interactive Canvas
 * Full-featured visual multi-core RTOS builder with Drag-and-Drop, SVG wiring,
 * concurrency linter with 1-click auto-intervention, and real-time ESP32 simulation.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  StepForward,
  Sparkles,
  Code2,
  Download,
  Trash2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Cpu,
  Layers,
  FolderOpen,
  CheckCircle2,
  ShieldAlert,
  BarChart3,
  LayoutGrid,
} from 'lucide-react';
import {
  RtosNode,
  RtosWire,
  RtosNodeType,
  RtosPortType,
  RtosTaskData,
  RtosQueueData,
  RtosMutexData,
  RtosSharedVarData,
  RtosDirectVarData,
  RtosEventGroupData,
  RtosTimerData,
  RtosIsrData,
  RtosLinterIssue,
} from '../../types';
import { RTOS_PRESETS } from '../../data/rtosPresets';
import { runRtosLinter, applyRtosAutoFix, RtosLintReport } from '../../utils/rtosLinter';
import { generateFreeRtosCppCode } from '../../utils/rtosCodeGenerator';
import { RtosNodePalette } from './RtosNodePalette';
import { RtosNodeCard } from './RtosNodeCard';
import { RtosWireLayer } from './RtosWireLayer';
import { RtosInspectorPanel } from './RtosInspectorPanel';
import { RtosLinterPanel } from './RtosLinterPanel';
import { RtosCodeModal } from './RtosCodeModal';
import { RtosGanttChart } from './RtosGanttChart';

interface RtosEditorViewProps {
  onSyncToBlocks?: (nodes: RtosNode[], wires: RtosWire[]) => void;
}

export const RtosEditorView: React.FC<RtosEditorViewProps> = () => {
  // 1. RTOS Graph State (Nodes & Wires)
  const [nodes, setNodes] = useState<RtosNode[]>(() => RTOS_PRESETS[0].nodes);
  const [wires, setWires] = useState<RtosWire[]>(() => RTOS_PRESETS[0].wires);

  // 2. Selection & UI State
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedWireId, setSelectedWireId] = useState<string | null>(null);
  const [isCodeModalOpen, setIsCodeModalOpen] = useState(false);
  const [lastFixMessage, setLastFixMessage] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1.0);
  const [viewLayout, setViewLayout] = useState<'split' | 'canvas' | 'gantt'>('split');

  // 3. Wire Drawing Drag State
  const [connectingWire, setConnectingWire] = useState<{
    fromNodeId: string;
    fromPort: RtosPortType;
    fromX: number;
    fromY: number;
    currentX: number;
    currentY: number;
  } | null>(null);

  // 4. Node Dragging State
  const [draggingNode, setDraggingNode] = useState<{
    id: string;
    startX: number;
    startY: number;
    nodeStartX: number;
    nodeStartY: number;
  } | null>(null);

  // 5. Simulation State
  const [isSimulating, setIsSimulating] = useState(true);
  const [tickCount, setTickCount] = useState(1280);
  const [cpu0Load, setCpu0Load] = useState(24);
  const [cpu1Load, setCpu1Load] = useState(38);
  const [freeHeapBytes, setFreeHeapBytes] = useState(284160);

  const canvasRef = useRef<HTMLDivElement>(null);

  // 6. Run Real-Time FreeRTOS Architecture Linter
  const lintReport: RtosLintReport = runRtosLinter(nodes, wires);

  // 7. FreeRTOS Simulation Interval Loop
  useEffect(() => {
    if (!isSimulating) return;

    const interval = setInterval(() => {
      setTickCount((prev) => prev + 1);

      // Dynamically simulate task state transitions and queue item movement
      setNodes((prevNodes) => {
        return prevNodes.map((n) => {
          if (n.type === 'task') {
            const tData = n.data as RtosTaskData;
            // Cycle task states smoothly
            let nextState = tData.state;
            if (tData.state === 'RUNNING') {
              nextState = 'READY';
            } else if (tData.state === 'READY') {
              nextState = Math.random() > 0.3 ? 'RUNNING' : 'BLOCKED';
            } else if (tData.state === 'BLOCKED') {
              nextState = 'READY';
            }

            return {
              ...n,
              data: {
                ...tData,
                state: nextState,
                cpuPercent: nextState === 'RUNNING' ? Math.floor(Math.random() * 30 + 15) : Math.floor(Math.random() * 5),
              },
            };
          }

          if (n.type === 'queue') {
            const qData = n.data as RtosQueueData;
            // Periodically cycle messages
            const currentMsgs = qData.messages || [];
            if (currentMsgs.length < qData.length && Math.random() > 0.6) {
              const newMsg = {
                timestamp: Date.now() % 100000,
                value: +(Math.random() * 30 + 10).toFixed(1),
              };
              return {
                ...n,
                data: {
                  ...qData,
                  messages: [...currentMsgs, newMsg],
                },
              };
            } else if (currentMsgs.length > 0 && Math.random() > 0.7) {
              return {
                ...n,
                data: {
                  ...qData,
                  messages: currentMsgs.slice(1),
                },
              };
            }
          }

          return n;
        });
      });

      // Update simulated core CPU loads
      setCpu0Load(Math.floor(Math.random() * 15 + 18));
      setCpu1Load(Math.floor(Math.random() * 20 + 28));
    }, 800);

    return () => clearInterval(interval);
  }, [isSimulating]);

  // Handle Preset Load
  const handleLoadPreset = (presetId: string) => {
    const preset = RTOS_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    setNodes(JSON.parse(JSON.stringify(preset.nodes)));
    setWires(JSON.parse(JSON.stringify(preset.wires)));
    setSelectedNodeId(null);
    setSelectedWireId(null);
    setLastFixMessage(`Preset sikeresen betöltve: ${preset.title}`);
  };

  // Add Node from Palette
  const handleAddNode = (type: RtosNodeType, x = 200, y = 150) => {
    const newId = `${type}_${Date.now()}`;
    let defaultData: any = {};

    if (type === 'task') {
      defaultData = {
        name: `Task_${nodes.filter((n) => n.type === 'task').length + 1}`,
        core: 1,
        priority: 2,
        stackSize: 4096,
        loopPeriodMs: 50,
        hasYield: true,
        state: 'READY',
        cpuPercent: 15,
        directNotifyValue: 0,
        notifyState: 'NOT_WAITING',
      } as RtosTaskData;
    } else if (type === 'queue') {
      defaultData = {
        name: `queue_${nodes.filter((n) => n.type === 'queue').length + 1}`,
        length: 8,
        itemSize: 16,
        itemType: 'uint32_t',
        messages: [],
        peakUsage: 0,
        sendTimeoutMs: 20,
        receiveTimeoutMs: 50,
      } as RtosQueueData;
    } else if (type === 'mutex') {
      defaultData = {
        name: `mtx_${nodes.filter((n) => n.type === 'mutex').length + 1}`,
        type: 'mutex',
        maxCount: 1,
        currentCount: 1,
        ownerTaskId: null,
        waitingTaskIds: [],
        priorityInheritance: true,
      } as RtosMutexData;
    } else if (type === 'shared_variable') {
      defaultData = {
        name: `sharedVar_${nodes.filter((n) => n.type === 'shared_variable').length + 1}`,
        dataType: 'int32_t',
        initialValue: 0,
        currentValue: 0,
        protectedByMutexId: null,
        accessMode: 'unprotected_risk',
        writerTaskIds: [],
        readerTaskIds: [],
      } as RtosSharedVarData;
    } else if (type === 'direct_variable') {
      defaultData = {
        name: `directNotify_${nodes.filter((n) => n.type === 'direct_variable').length + 1}`,
        targetTaskId: '',
        type: 'notify_value',
        currentValue: 0,
      } as RtosDirectVarData;
    } else if (type === 'software_timer') {
      defaultData = {
        name: `timer_${nodes.filter((n) => n.type === 'software_timer').length + 1}`,
        periodMs: 500,
        autoReload: true,
        state: 'RUNNING',
        callbackFunction: 'vTimerCallback',
      } as RtosTimerData;
    } else if (type === 'event_group') {
      defaultData = {
        name: `eventGroup_${nodes.filter((n) => n.type === 'event_group').length + 1}`,
        bits: 0x01,
        bitLabels: { 0: 'ReadyBit' },
      } as RtosEventGroupData;
    } else if (type === 'isr_handler') {
      defaultData = {
        name: `isr_${nodes.filter((n) => n.type === 'isr_handler').length + 1}`,
        irqSource: 'GPIO_INTR_PIN4',
        fromIsrApi: true,
        yieldFromIsr: true,
      } as RtosIsrData;
    }

    const newNode: RtosNode = {
      id: newId,
      type,
      x,
      y,
      data: defaultData,
    };

    setNodes((prev) => [...prev, newNode]);
    setSelectedNodeId(newId);
  };

  // Drag and Drop from Palette to Canvas
  const handleCanvasDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const nodeType = e.dataTransfer.getData('application/rtos-node-type') as RtosNodeType;
    if (!nodeType || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const dropX = Math.round((e.clientX - rect.left - 100) / 20) * 20;
    const dropY = Math.round((e.clientY - rect.top - 60) / 20) * 20;

    handleAddNode(nodeType, Math.max(20, dropX), Math.max(20, dropY));
  };

  const handleCanvasDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  // Node Dragging on Canvas Handlers
  const handleNodeMouseDown = (e: React.MouseEvent, nodeId: string) => {
    if (connectingWire) return;
    const targetNode = nodes.find((n) => n.id === nodeId);
    if (!targetNode) return;

    setSelectedNodeId(nodeId);
    setSelectedWireId(null);
    setDraggingNode({
      id: nodeId,
      startX: e.clientX,
      startY: e.clientY,
      nodeStartX: targetNode.x,
      nodeStartY: targetNode.y,
    });
  };

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    // 1. Move dragging node
    if (draggingNode) {
      const dx = (e.clientX - draggingNode.startX) / zoomLevel;
      const dy = (e.clientY - draggingNode.startY) / zoomLevel;

      setNodes((prev) =>
        prev.map((n) => {
          if (n.id === draggingNode.id) {
            return {
              ...n,
              x: Math.max(0, Math.round((draggingNode.nodeStartX + dx) / 10) * 10),
              y: Math.max(0, Math.round((draggingNode.nodeStartY + dy) / 10) * 10),
            };
          }
          return n;
        })
      );
    }

    // 2. Update connecting wire line to follow mouse
    if (connectingWire && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      setConnectingWire((prev) =>
        prev
          ? {
              ...prev,
              currentX: (e.clientX - rect.left) / zoomLevel,
              currentY: (e.clientY - rect.top) / zoomLevel,
            }
          : null
      );
    }
  };

  const handleCanvasMouseUp = () => {
    if (draggingNode) {
      setDraggingNode(null);
    }
    if (connectingWire) {
      setConnectingWire(null);
    }
  };

  // Wire Port Connection Handlers
  const handlePortMouseDown = (
    e: React.MouseEvent,
    nodeId: string,
    portType: RtosPortType,
    isOutput: boolean
  ) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const fromNode = nodes.find((n) => n.id === nodeId);
    if (!fromNode) return;

    const fromX = (isOutput ? fromNode.x + 224 : fromNode.x);
    const fromY = fromNode.y + 80;

    setConnectingWire({
      fromNodeId: nodeId,
      fromPort: portType,
      fromX,
      fromY,
      currentX: (e.clientX - rect.left) / zoomLevel,
      currentY: (e.clientY - rect.top) / zoomLevel,
    });
  };

  const handlePortMouseUp = (
    e: React.MouseEvent,
    toNodeId: string,
    toPortType: RtosPortType,
    isOutput: boolean
  ) => {
    if (!connectingWire || connectingWire.fromNodeId === toNodeId) {
      setConnectingWire(null);
      return;
    }

    const fromNode = nodes.find((n) => n.id === connectingWire.fromNodeId);
    const toNode = nodes.find((n) => n.id === toNodeId);

    if (!fromNode || !toNode) {
      setConnectingWire(null);
      return;
    }

    // Determine appropriate wire type, color and label based on node types
    let wireType: any = 'data_queue';
    let wireColor = '#4ade80';
    let wireLabel = 'xQueueSend()';

    if (fromNode.type === 'mutex' || toNode.type === 'mutex') {
      wireType = 'mutex_guard';
      wireColor = '#38bdf8';
      wireLabel = 'Mutex Lock';
    } else if (fromNode.type === 'shared_variable' || toNode.type === 'shared_variable') {
      wireType = 'shared_access';
      wireColor = '#f59e0b';
      wireLabel = 'Megosztott Adat';
    } else if (fromNode.type === 'direct_variable' || toNode.type === 'direct_variable' || (fromNode.type === 'task' && toNode.type === 'task')) {
      wireType = 'direct_notify';
      wireColor = '#a855f7';
      wireLabel = 'xTaskNotify()';
    } else if (fromNode.type === 'isr_handler') {
      wireType = 'isr_signal';
      wireColor = '#f43f5e';
      wireLabel = 'FromISR';
    }

    const newWire: RtosWire = {
      id: `wire_${Date.now()}`,
      fromNodeId: connectingWire.fromNodeId,
      fromPort: connectingWire.fromPort,
      toNodeId,
      toPort: toPortType,
      type: wireType,
      color: wireColor,
      label: wireLabel,
    };

    setWires((prev) => [...prev, newWire]);
    setConnectingWire(null);
  };

  // Node & Wire Deletion
  const handleDeleteNode = (nodeId: string) => {
    setNodes((prev) => prev.filter((n) => n.id !== nodeId));
    setWires((prev) => prev.filter((w) => w.fromNodeId !== nodeId && w.toNodeId !== nodeId));
    if (selectedNodeId === nodeId) setSelectedNodeId(null);
  };

  const handleDeleteWire = (wireId: string) => {
    setWires((prev) => prev.filter((w) => w.id !== wireId));
    if (selectedWireId === wireId) setSelectedWireId(null);
  };

  // Node Data Updater
  const handleUpdateNodeData = (nodeId: string, updatedData: any) => {
    setNodes((prev) =>
      prev.map((n) => (n.id === nodeId ? { ...n, data: updatedData } : n))
    );
  };

  // Auto-Fix Intervention
  const handleApplyAutoFix = (autoFix: RtosLinterIssue['autoFix']) => {
    if (!autoFix) return;
    const { newNodes, newWires, appliedMessage } = applyRtosAutoFix(nodes, wires, autoFix);
    setNodes(newNodes);
    setWires(newWires);
    setLastFixMessage(appliedMessage);
  };

  const handleApplyAllAutoFixes = () => {
    let currentNodes = [...nodes];
    let currentWires = [...wires];
    let appliedCount = 0;

    lintReport.issues.forEach((issue) => {
      if (issue.autoFixAvailable && issue.autoFix) {
        const res = applyRtosAutoFix(currentNodes, currentWires, issue.autoFix);
        currentNodes = res.newNodes;
        currentWires = res.newWires;
        appliedCount++;
      }
    });

    setNodes(currentNodes);
    setWires(currentWires);
    setLastFixMessage(`⚡ Sikeres automatikus beavatkozás: ${appliedCount} párhuzamossági hiba javítva!`);
  };

  // Highlight affected nodes when clicking on an issue
  const handleHighlightNodes = (nodeIds: string[]) => {
    if (nodeIds.length > 0) {
      setSelectedNodeId(nodeIds[0]);
    }
  };

  // Generate FreeRTOS Code
  const generatedCode = generateFreeRtosCppCode(nodes, wires);

  const selectedNode = nodes.find((n) => n.id === selectedNodeId) || null;

  return (
    <div className="flex flex-col h-full w-full bg-[#0F1115] text-[#E0E0E6] overflow-hidden select-none">
      {/* Top Toolbar */}
      <header className="h-12 bg-[#12141A] border-b border-[#2A2D35] px-4 flex items-center justify-between shrink-0">
        {/* Left: Presets & Info */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="p-1 rounded bg-cyan-950 border border-cyan-800">
              <Cpu className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <span className="text-xs font-mono font-bold text-slate-100 uppercase tracking-wider">
                Dedikált FreeRTOS Kétmagos Architektúra Szerkesztő
              </span>
              <span className="ml-2 text-[10px] font-mono px-1.5 py-0.2 rounded bg-cyan-900/60 text-cyan-300 border border-cyan-700/60">
                Xtensa LX6 SMP
              </span>
            </div>
          </div>

          <div className="h-4 w-px bg-slate-800" />

          {/* Preset Selector Dropdown */}
          <div className="flex items-center gap-1.5">
            <FolderOpen className="w-3.5 h-3.5 text-slate-400" />
            <select
              id="select-rtos-preset"
              onChange={(e) => handleLoadPreset(e.target.value)}
              defaultValue={RTOS_PRESETS[0].id}
              className="bg-[#161920] border border-slate-700 rounded px-2 py-1 text-xs font-mono text-slate-200 focus:border-cyan-400 focus:outline-hidden"
            >
              {RTOS_PRESETS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          </div>

          <div className="h-4 w-px bg-slate-800" />

          {/* 3-Way Layout Switcher: Canvas vs Gantt vs Split View */}
          <div
            id="rtos-view-layout-switcher"
            className="flex items-center p-0.5 bg-[#161920] border border-[#2A2D35] rounded shadow-[1px_1px_0px_#000]"
          >
            <button
              id="btn-layout-split"
              type="button"
              onClick={() => setViewLayout('split')}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono font-bold rounded transition-colors cursor-pointer ${
                viewLayout === 'split'
                  ? 'bg-cyan-500 text-black shadow-[1px_1px_0px_#000]'
                  : 'text-slate-400 hover:text-white hover:bg-[#1F232B]'
              }`}
              title="Osztott nézet: Architektúra Vászon fent + GANTT Idővonal lent"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>🪟 Osztott</span>
            </button>

            <button
              id="btn-layout-gantt"
              type="button"
              onClick={() => setViewLayout('gantt')}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono font-bold rounded transition-colors cursor-pointer ${
                viewLayout === 'gantt'
                  ? 'bg-cyan-500 text-black shadow-[1px_1px_0px_#000]'
                  : 'text-slate-400 hover:text-white hover:bg-[#1F232B]'
              }`}
              title="Teljes képernyős FreeRTOS GANTT Idővonal és Preemption analizátor"
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>📊 GANTT Idővonal</span>
            </button>

            <button
              id="btn-layout-canvas"
              type="button"
              onClick={() => setViewLayout('canvas')}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono font-bold rounded transition-colors cursor-pointer ${
                viewLayout === 'canvas'
                  ? 'bg-cyan-500 text-black shadow-[1px_1px_0px_#000]'
                  : 'text-slate-400 hover:text-white hover:bg-[#1F232B]'
              }`}
              title="Teljes képernyős D&D Architektúra Vászon"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>🗺️ Vászon</span>
            </button>
          </div>
        </div>

        {/* Right: Simulation Controls & Code Viewer */}
        <div className="flex items-center gap-2">
          {/* Live Linter Health Pill in Header */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#161920] border border-slate-800 text-[11px] font-mono">
            {lintReport.criticalCount > 0 ? (
              <ShieldAlert className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
            ) : (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            )}
            <span className="text-slate-400">Egészség:</span>
            <span
              className={`font-bold ${
                lintReport.healthScore >= 90
                  ? 'text-emerald-400'
                  : lintReport.healthScore >= 60
                  ? 'text-amber-400'
                  : 'text-rose-400'
              }`}
            >
              {lintReport.healthScore}%
            </span>
          </div>

          <div className="h-4 w-px bg-slate-800" />

          {/* Simulation Toggle */}
          <button
            id="btn-rtos-sim-toggle"
            type="button"
            onClick={() => setIsSimulating(!isSimulating)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded font-mono text-xs font-bold transition-all cursor-pointer shadow-[2px_2px_0px_#000] ${
              isSimulating
                ? 'bg-amber-500 hover:bg-amber-400 text-black'
                : 'bg-emerald-500 hover:bg-emerald-400 text-black'
            }`}
          >
            {isSimulating ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
            <span>{isSimulating ? 'Szünet' : 'Futtatás'}</span>
          </button>

          {/* Code Viewer Modal Button */}
          <button
            id="btn-rtos-view-code"
            type="button"
            onClick={() => setIsCodeModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-cyan-500 hover:bg-cyan-400 text-black font-mono text-xs font-bold transition-all shadow-[2px_2px_0px_#000] cursor-pointer"
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>C++ Kód Megtekintése</span>
          </button>

          {/* Clear Canvas */}
          <button
            type="button"
            onClick={() => {
              if (confirm('Biztosan törlöd az összes FreeRTOS csomópontot a munkaterületről?')) {
                setNodes([]);
                setWires([]);
                setSelectedNodeId(null);
              }
            }}
            className="p-1.5 rounded hover:bg-rose-950 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
            title="Munkaterület törlése"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Workspace Area (Palette + Canvas + Inspector + GANTT Chart) */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Upper Segment: Architecture Canvas (shown in 'split' and 'canvas' modes) */}
        {viewLayout !== 'gantt' && (
          <div className={`flex overflow-hidden ${viewLayout === 'split' ? 'h-[50%] min-h-[220px] border-b border-[#2A2D35]' : 'flex-1'}`}>
            {/* Left: Drag & Drop Node Palette */}
            <RtosNodePalette onAddNode={handleAddNode} />

            {/* Center: Visual Canvas with Grid and Wires */}
            <div
              ref={canvasRef}
              id="rtos-editor-canvas"
              onDrop={handleCanvasDrop}
              onDragOver={handleCanvasDragOver}
              onMouseMove={handleCanvasMouseMove}
              onMouseUp={handleCanvasMouseUp}
              onClick={() => {
                setSelectedNodeId(null);
                setSelectedWireId(null);
              }}
              style={{
                backgroundImage: `radial-gradient(circle, #2A2D35 1px, transparent 1px)`,
                backgroundSize: `${24 * zoomLevel}px ${24 * zoomLevel}px`,
              }}
              className="flex-1 relative overflow-auto bg-[#0A0C10] select-none"
            >
              {/* Zoom & Canvas HUD controls */}
              <div className="absolute top-3 left-3 z-40 flex items-center gap-1 p-1 bg-[#12141A]/90 backdrop-blur-xs border border-slate-800 rounded shadow-md">
                <button
                  type="button"
                  onClick={() => setZoomLevel((z) => Math.min(1.6, z + 0.1))}
                  className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 cursor-pointer"
                  title="Nagyítás"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
                <span className="text-[10px] font-mono text-slate-400 px-1">{Math.round(zoomLevel * 100)}%</span>
                <button
                  type="button"
                  onClick={() => setZoomLevel((z) => Math.max(0.6, z - 0.1))}
                  className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 cursor-pointer"
                  title="Kicsinyítés"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setZoomLevel(1.0)}
                  className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 cursor-pointer"
                  title="Nagyítás Visszaállítása"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* SVG Wires Layer */}
              <RtosWireLayer
                nodes={nodes}
                wires={wires}
                selectedWireId={selectedWireId}
                onSelectWire={(id) => {
                  setSelectedWireId(id);
                  setSelectedNodeId(null);
                }}
                onDeleteWire={handleDeleteWire}
                connectingWire={connectingWire}
                isSimulating={isSimulating}
              />

              {/* Render All Node Cards on Canvas */}
              {nodes.map((node) => (
                <div
                  key={node.id}
                  onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
                >
                  <RtosNodeCard
                    node={node}
                    isSelected={selectedNodeId === node.id}
                    onSelect={(id) => {
                      setSelectedNodeId(id);
                      setSelectedWireId(null);
                    }}
                    onDelete={handleDeleteNode}
                    onOpenSettings={(id) => setSelectedNodeId(id)}
                    onPortMouseDown={handlePortMouseDown}
                    onPortMouseUp={handlePortMouseUp}
                    isConnectingWire={connectingWire != null}
                  />
                </div>
              ))}

              {/* Empty Canvas Prompt */}
              {nodes.length === 0 && (
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-slate-500">
                  <Cpu className="w-12 h-12 text-slate-700 mb-2 animate-pulse" />
                  <p className="text-sm font-mono font-bold text-slate-400">Üres FreeRTOS Munkaterület</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Húzz be taszkokat és üzenetsorokat a bal oldali menüből vagy válassz egy kész sablont!
                  </p>
                </div>
              )}
            </div>

            {/* Right: Selected Node Properties & System Load Inspector */}
            <RtosInspectorPanel
              selectedNode={selectedNode}
              allNodes={nodes}
              onUpdateNodeData={handleUpdateNodeData}
              cpu0Load={cpu0Load}
              cpu1Load={cpu1Load}
              freeHeapBytes={freeHeapBytes}
              tickCount={tickCount}
            />
          </div>
        )}

        {/* Lower Segment: Visual FreeRTOS GANTT Timeline (shown in 'split' and 'gantt' modes) */}
        {viewLayout !== 'canvas' && (
          <div className="flex-1 flex overflow-hidden min-h-[260px]">
            <RtosGanttChart
              nodes={nodes}
              wires={wires}
              isSimulatingParent={isSimulating}
              onSelectTaskNode={(taskId) => {
                setSelectedNodeId(taskId);
              }}
            />
          </div>
        )}
      </div>

      {/* Bottom: Dedicated FreeRTOS Concurrency Linter & Auto-Fix Panel */}
      <RtosLinterPanel
        lintReport={lintReport}
        onApplyAutoFix={handleApplyAutoFix}
        onApplyAllAutoFixes={handleApplyAllAutoFixes}
        onHighlightNodes={handleHighlightNodes}
        lastFixMessage={lastFixMessage}
      />

      {/* Generated FreeRTOS C++ Code Viewer Modal */}
      <RtosCodeModal
        isOpen={isCodeModalOpen}
        onClose={() => setIsCodeModalOpen(false)}
        code={generatedCode}
      />
    </div>
  );
};
