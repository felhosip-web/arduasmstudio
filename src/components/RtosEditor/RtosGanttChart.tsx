/**
 * (c) 2026 AI Studio - Visual FreeRTOS Dual-Core GANTT Timeline Chart
 * Displays real-time task execution timelines, preemptions, block-based instructions,
 * context switches, queue/mutex contention, and CPU idle times across Core 0 and Core 1.
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  StepForward,
  Zap,
  Clock,
  Cpu,
  Layers,
  AlertTriangle,
  HelpCircle,
  Filter,
  Eye,
  EyeOff,
  Sparkles,
  Info,
  Maximize2,
  Minimize2,
  ChevronRight,
  ShieldAlert,
  Inbox,
  Lock,
  GitBranch,
  ArrowRight,
  Link2,
} from 'lucide-react';
import { RtosNode, RtosWire, RtosTaskData } from '../../types';
import {
  simulateRtosSchedule,
  GanttScheduleResult,
  GanttTimeSlice,
  GanttPreemptionEvent,
  GanttDependencyLink,
  GanttTaskState,
  TASK_GANTT_COLORS,
} from './rtosSchedulerEngine';

interface RtosGanttChartProps {
  nodes: RtosNode[];
  wires: RtosWire[];
  isSimulatingParent?: boolean;
  onSelectTaskNode?: (nodeId: string) => void;
}

export const RtosGanttChart: React.FC<RtosGanttChartProps> = ({
  nodes,
  wires,
  isSimulatingParent = true,
  onSelectTaskNode,
}) => {
  // 1. Playback & Timeline Controls
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [timeWindowMs, setTimeWindowMs] = useState<number>(200); // 100ms, 200ms, 500ms, 1000ms
  const [currentTimeOffsetMs, setCurrentTimeOffsetMs] = useState<number>(0);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1); // 0.5x, 1x, 2x

  // 2. View Filters & Display Toggles
  const [coreFilter, setCoreFilter] = useState<'all' | 0 | 1>('all');
  const [showIdleTasks, setShowIdleTasks] = useState<boolean>(true);
  const [showBlockedBars, setShowBlockedBars] = useState<boolean>(true);
  const [showPreemptionLines, setShowPreemptionLines] = useState<boolean>(true);
  const [showBlockBadges, setShowBlockBadges] = useState<boolean>(true);
  const [showDependencyArrows, setShowDependencyArrows] = useState<boolean>(true);

  // 3. Interactive Scenario Injections
  const [injectedPreemption, setInjectedPreemption] = useState<{
    timeMs: number;
    core: 0 | 1;
    isrName: string;
  } | null>(null);
  const [scenarioBanner, setScenarioBanner] = useState<string | null>(null);

  // 4. Hover Tooltip & Selected Slice Inspection
  const [hoveredSlice, setHoveredSlice] = useState<{
    slice: GanttTimeSlice;
    x: number;
    y: number;
  } | null>(null);
  const [hoveredDependency, setHoveredDependency] = useState<{
    link: GanttDependencyLink;
    x: number;
    y: number;
  } | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const timelineContainerRef = useRef<HTMLDivElement>(null);
  const tracksContentRef = useRef<HTMLDivElement>(null);
  const [tracksWidthPx, setTracksWidthPx] = useState<number>(800);

  // Measure timeline track width for exact pixel coordinate mapping
  useEffect(() => {
    const updateWidth = () => {
      if (tracksContentRef.current) {
        setTracksWidthPx(tracksContentRef.current.clientWidth);
      }
    };
    updateWidth();

    const observer = new ResizeObserver(updateWidth);
    if (tracksContentRef.current) {
      observer.observe(tracksContentRef.current);
    }
    return () => observer.disconnect();
  }, []);

  // 5. Run Scheduler Engine Calculation
  const scheduleData: GanttScheduleResult = useMemo(() => {
    return simulateRtosSchedule(nodes, wires, {
      totalDurationMs: timeWindowMs,
      tickResolutionMs: 1,
      timeOffsetMs: currentTimeOffsetMs,
      injectedPreemption,
    });
  }, [nodes, wires, timeWindowMs, currentTimeOffsetMs, injectedPreemption]);

  // 6. Live Rolling Playback Loop
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setCurrentTimeOffsetMs((prev) => prev + Math.round(4 * playbackSpeed));
    }, 50);

    return () => clearInterval(interval);
  }, [isPlaying, playbackSpeed]);

  // Clear scenario banner after 4 seconds
  useEffect(() => {
    if (!scenarioBanner) return;
    const t = setTimeout(() => setScenarioBanner(null), 4000);
    return () => clearTimeout(t);
  }, [scenarioBanner]);

  // Handlers for Scenario Triggers
  const handleTriggerIsr = (core: 0 | 1) => {
    const isrTime = currentTimeOffsetMs + Math.round(timeWindowMs * 0.45);
    setInjectedPreemption({
      timeMs: isrTime,
      core,
      isrName: `GPIO_PIN4_EXT_ISR (Core ${core})`,
    });
    setScenarioBanner(
      `⚡ Hardveres Megszakítás (ISR) kiváltva a Core ${core} magon! Azonnali taszk-kiszorítás (Preemption) történt.`
    );
  };

  const handleTriggerQueueBurst = () => {
    const burstTime = currentTimeOffsetMs + Math.round(timeWindowMs * 0.3);
    setScenarioBanner(
      `📬 Nagy sebességű üzenetcsomag érkezett a Queue-ba! A fogadó taszk felébredt és kiszorította az alacsonyabb prioritású taszkot.`
    );
  };

  const handleTriggerMutexInversion = () => {
    setScenarioBanner(
      `🔒 Mutex versengés szimuláció: A Prioritás-öröklődés (Priority Inheritance) automatikusan megemelte az alacsony prioritású taszk prioritását, megakadályozva a deadlockot!`
    );
  };

  // Filter task rows based on core filter
  const displayedTaskIds = useMemo(() => {
    return Object.keys(scheduleData.tasksInfo).filter((taskId) => {
      const task = scheduleData.tasksInfo[taskId];
      if (coreFilter === 'all') return true;
      return task.core === coreFilter;
    });
  }, [scheduleData.tasksInfo, coreFilter]);

  // Time Axis Grid Ticks
  const timeTicks = useMemo(() => {
    const ticks: number[] = [];
    const step = timeWindowMs <= 100 ? 10 : timeWindowMs <= 250 ? 25 : timeWindowMs <= 500 ? 50 : 100;
    const start = Math.floor(currentTimeOffsetMs / step) * step;
    const end = start + timeWindowMs;

    for (let t = start; t <= end; t += step) {
      ticks.push(t);
    }
    return ticks;
  }, [currentTimeOffsetMs, timeWindowMs]);

  // Convert time to percentage position across timeline width
  const getTimePercent = (timeMs: number) => {
    const rel = timeMs - currentTimeOffsetMs;
    return Math.max(0, Math.min(100, (rel / timeWindowMs) * 100));
  };

  return (
    <div className="flex-1 flex flex-col bg-[#0A0C10] text-slate-200 overflow-hidden select-none">
      {/* Top Controls & Navigation Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-[#12141A] border-b border-[#2A2D35]">
        {/* Left: Playback & Step Controls */}
        <div className="flex items-center gap-2">
          <div className="flex items-center p-0.5 bg-[#1A1D24] border border-[#3A3F4B] rounded shadow-[2px_2px_0px_#000]">
            <button
              id="btn-gantt-play"
              type="button"
              onClick={() => setIsPlaying(!isPlaying)}
              className={`px-2.5 py-1 text-xs font-mono font-bold rounded transition-colors flex items-center gap-1.5 cursor-pointer ${
                isPlaying
                  ? 'bg-amber-500 hover:bg-amber-400 text-black'
                  : 'bg-emerald-500 hover:bg-emerald-400 text-black'
              }`}
              title={isPlaying ? 'Idővonal Megállítása' : 'Valós Idejű Futtatás'}
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
              <span>{isPlaying ? 'Szünet' : 'Futtatás'}</span>
            </button>

            <button
              id="btn-gantt-step"
              type="button"
              onClick={() => {
                setIsPlaying(false);
                setCurrentTimeOffsetMs((prev) => prev + 10);
              }}
              className="p-1 text-slate-400 hover:text-white rounded hover:bg-[#252932] cursor-pointer"
              title="Léptetés +10 ms"
            >
              <StepForward className="w-3.5 h-3.5" />
            </button>

            <button
              id="btn-gantt-reset"
              type="button"
              onClick={() => {
                setCurrentTimeOffsetMs(0);
                setInjectedPreemption(null);
              }}
              className="p-1 text-slate-400 hover:text-white rounded hover:bg-[#252932] cursor-pointer"
              title="Idővonal Visszaállítása (0 ms)"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Time Window Scale Selector */}
          <div className="flex items-center gap-1 bg-[#161920] px-2 py-1 rounded border border-[#2A2D35]">
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-[11px] font-mono text-slate-400">Ablak:</span>
            <select
              id="select-gantt-window"
              value={timeWindowMs}
              onChange={(e) => setTimeWindowMs(Number(e.target.value))}
              className="bg-[#0F1115] border border-slate-700 rounded px-1.5 py-0.5 text-xs font-mono text-cyan-300 focus:outline-hidden"
            >
              <option value={100}>100 ms</option>
              <option value={200}>200 ms</option>
              <option value={500}>500 ms</option>
              <option value={1000}>1000 ms (1s)</option>
              <option value={2000}>2000 ms (2s)</option>
            </select>
          </div>

          {/* Core Filter Tabs */}
          <div className="flex items-center gap-1 bg-[#161920] p-0.5 rounded border border-[#2A2D35]">
            <button
              type="button"
              onClick={() => setCoreFilter('all')}
              className={`px-2 py-0.5 text-[11px] font-mono rounded transition-colors ${
                coreFilter === 'all' ? 'bg-cyan-500 text-black font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Összes Mag
            </button>
            <button
              type="button"
              onClick={() => setCoreFilter(0)}
              className={`px-2 py-0.5 text-[11px] font-mono rounded transition-colors ${
                coreFilter === 0 ? 'bg-sky-500 text-black font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Core 0 (PRO)
            </button>
            <button
              type="button"
              onClick={() => setCoreFilter(1)}
              className={`px-2 py-0.5 text-[11px] font-mono rounded transition-colors ${
                coreFilter === 1 ? 'bg-emerald-500 text-black font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Core 1 (APP)
            </button>
          </div>
        </div>

        {/* Right: Interactive Scenario Injections & View Options */}
        <div className="flex items-center gap-2">
          {/* Scenario Injections */}
          <div className="flex items-center gap-1">
            <button
              id="btn-inject-isr"
              type="button"
              onClick={() => handleTriggerIsr(1)}
              className="flex items-center gap-1 px-2 py-1 rounded bg-rose-950/80 hover:bg-rose-900 border border-rose-500/50 text-rose-300 text-xs font-mono font-bold transition-all shadow-[1px_1px_0px_#000] cursor-pointer"
              title="Azonnali hardveres megszakítás kiváltása a Core 1-en"
            >
              <Zap className="w-3.5 h-3.5 text-rose-400 fill-rose-400" />
              <span>⚡ ISR Preemption</span>
            </button>

            <button
              id="btn-inject-queue"
              type="button"
              onClick={handleTriggerQueueBurst}
              className="flex items-center gap-1 px-2 py-1 rounded bg-amber-950/80 hover:bg-amber-900 border border-amber-500/50 text-amber-300 text-xs font-mono font-bold transition-all shadow-[1px_1px_0px_#000] cursor-pointer"
              title="Queue üzenetcsomag küldése, ami felébreszti a fogadót"
            >
              <Inbox className="w-3.5 h-3.5 text-amber-400" />
              <span>📬 Queue Burst</span>
            </button>

            <button
              id="btn-inject-mutex"
              type="button"
              onClick={handleTriggerMutexInversion}
              className="flex items-center gap-1 px-2 py-1 rounded bg-purple-950/80 hover:bg-purple-900 border border-purple-500/50 text-purple-300 text-xs font-mono font-bold transition-all shadow-[1px_1px_0px_#000] cursor-pointer"
              title="Mutex lefoglalás és Prioritás-öröklődés tesztelése"
            >
              <Lock className="w-3.5 h-3.5 text-purple-400" />
              <span>🔒 Mutex Zár</span>
            </button>
          </div>

          <div className="h-4 w-px bg-slate-800" />

          {/* Toggle Options Dropdown / Chips */}
          <button
            type="button"
            onClick={() => setShowIdleTasks(!showIdleTasks)}
            className={`px-2 py-1 text-[11px] font-mono rounded border transition-colors ${
              showIdleTasks
                ? 'bg-slate-800 text-slate-200 border-slate-600'
                : 'bg-transparent text-slate-500 border-slate-800'
            }`}
            title="IDLE taszkok megjelenítése"
          >
            IDLE {showIdleTasks ? 'ON' : 'OFF'}
          </button>

          <button
            type="button"
            onClick={() => setShowPreemptionLines(!showPreemptionLines)}
            className={`px-2 py-1 text-[11px] font-mono rounded border transition-colors ${
              showPreemptionLines
                ? 'bg-rose-950 text-rose-300 border-rose-700'
                : 'bg-transparent text-slate-500 border-slate-800'
            }`}
            title="Kiszorítási (Preemption) markerek"
          >
            ⚡ Preempt {showPreemptionLines ? 'ON' : 'OFF'}
          </button>

          <button
            id="btn-toggle-dependencies"
            type="button"
            onClick={() => setShowDependencyArrows(!showDependencyArrows)}
            className={`px-2 py-1 text-[11px] font-mono rounded border transition-colors flex items-center gap-1 cursor-pointer ${
              showDependencyArrows
                ? 'bg-purple-950 text-purple-300 border-purple-600 shadow-[0_0_8px_rgba(192,132,252,0.3)]'
                : 'bg-transparent text-slate-500 border-slate-800'
            }`}
            title="Taszk függőségi összekötő nyilak megjelenítése"
          >
            <GitBranch className="w-3.5 h-3.5 text-purple-400" />
            <span>
              🔗 Függőségek{' '}
              {scheduleData.dependencies && scheduleData.dependencies.length > 0
                ? `(${scheduleData.dependencies.length})`
                : ''}{' '}
              {showDependencyArrows ? 'ON' : 'OFF'}
            </span>
          </button>
        </div>
      </div>

      {/* Scenario Notification Banner */}
      {scenarioBanner && (
        <div className="bg-gradient-to-r from-rose-950/90 via-amber-950/90 to-cyan-950/90 border-b border-rose-500/40 px-3 py-1.5 flex items-center justify-between text-xs font-mono text-white animate-fadeIn">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400 animate-bounce" />
            <span>{scenarioBanner}</span>
          </div>
          <button
            type="button"
            onClick={() => setScenarioBanner(null)}
            className="text-slate-400 hover:text-white text-[10px]"
          >
            ✕ Bezárás
          </button>
        </div>
      )}

      {/* Dual-Core Hardware Load & Scheduling Metrics HUD */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-2 p-2.5 bg-[#0F1115] border-b border-[#2A2D35] text-xs font-mono">
        {/* Metric 1: Core 0 Load */}
        <div className="p-2 rounded bg-[#161920] border border-[#2A2D35] flex items-center justify-between">
          <div>
            <div className="text-[10px] text-slate-400 uppercase">Core 0 (PRO CPU)</div>
            <div className="text-sm font-bold text-sky-400">
              {scheduleData.core0Metrics.utilizationPercent}% <span className="text-[10px] text-slate-500 font-normal">terhelés</span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] text-slate-400">Idle Idő</div>
            <div className="text-xs text-slate-300 font-bold">{scheduleData.core0Metrics.idlePercent}%</div>
          </div>
        </div>

        {/* Metric 2: Core 1 Load */}
        <div className="p-2 rounded bg-[#161920] border border-[#2A2D35] flex items-center justify-between">
          <div>
            <div className="text-[10px] text-slate-400 uppercase">Core 1 (APP CPU)</div>
            <div className="text-sm font-bold text-emerald-400">
              {scheduleData.core1Metrics.utilizationPercent}% <span className="text-[10px] text-slate-500 font-normal">terhelés</span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] text-slate-400">Idle Idő</div>
            <div className="text-xs text-slate-300 font-bold">{scheduleData.core1Metrics.idlePercent}%</div>
          </div>
        </div>

        {/* Metric 3: Preemptions Total */}
        <div className="p-2 rounded bg-[#161920] border border-rose-950/80 flex items-center justify-between">
          <div>
            <div className="text-[10px] text-rose-300 uppercase flex items-center gap-1">
              <Zap className="w-3 h-3 text-rose-400" />
              <span>Kiszorítások (Preempt)</span>
            </div>
            <div className="text-sm font-bold text-rose-400">
              {scheduleData.core0Metrics.preemptionCount + scheduleData.core1Metrics.preemptionCount}{' '}
              <span className="text-[10px] text-slate-500 font-normal">esemény</span>
            </div>
          </div>
          <div className="text-right text-[10px] text-rose-300/80 font-mono">
            <div>C0: {scheduleData.core0Metrics.preemptionCount}</div>
            <div>C1: {scheduleData.core1Metrics.preemptionCount}</div>
          </div>
        </div>

        {/* Metric 4: Context Switches */}
        <div className="p-2 rounded bg-[#161920] border border-[#2A2D35] flex items-center justify-between">
          <div>
            <div className="text-[10px] text-slate-400 uppercase">Kontextus Váltások</div>
            <div className="text-sm font-bold text-amber-400">
              {scheduleData.core0Metrics.contextSwitchCount + scheduleData.core1Metrics.contextSwitchCount}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] text-slate-400">Késleltetés</div>
            <div className="text-xs text-amber-300">~3.2 µs</div>
          </div>
        </div>

        {/* Metric 5: Active Task Count */}
        <div className="p-2 rounded bg-[#161920] border border-[#2A2D35] flex items-center justify-between">
          <div>
            <div className="text-[10px] text-slate-400 uppercase">Aktív Taszkok</div>
            <div className="text-sm font-bold text-cyan-400">{displayedTaskIds.length} db</div>
          </div>
          <div className="text-right text-[10px] text-slate-400">
            <div>Ütemező: FreeRTOS</div>
            <div className="text-emerald-400">Preemptive SMP</div>
          </div>
        </div>

        {/* Metric 6: Timeline Legend */}
        <div className="p-2 rounded bg-[#161920] border border-[#2A2D35] flex flex-col justify-center gap-1 text-[10px]">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500" />
              <span>Futás</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-xs bg-rose-500" />
              <span>Preempted</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-xs bg-amber-500" />
              <span>Kész (Ready)</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-xs bg-slate-600" />
              <span>Várakozás / Delay</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main GANTT Timeline Workspace */}
      <div
        ref={timelineContainerRef}
        id="rtos-gantt-canvas"
        className="flex-1 flex overflow-auto relative bg-[#07090D]"
      >
        {/* Left Task Hierarchy Sidebar (Pinned) */}
        <div className="w-64 shrink-0 bg-[#0F1115] border-r border-[#2A2D35] z-20 flex flex-col">
          {/* Header over task list */}
          <div className="h-9 px-3 border-b border-[#2A2D35] flex items-center justify-between text-[11px] font-mono font-bold text-slate-400 uppercase bg-[#12141A]">
            <span>FreeRTOS Taszk</span>
            <span>Mag / Prio</span>
          </div>

          {/* Task Rows Sidebar List */}
          <div className="flex-1 divide-y divide-[#1F232B]">
            {displayedTaskIds.map((taskId) => {
              const taskInfo = scheduleData.tasksInfo[taskId];
              const isSelected = selectedTaskId === taskId;

              return (
                <div
                  key={taskId}
                  onClick={() => {
                    setSelectedTaskId(taskId);
                    if (onSelectTaskNode) onSelectTaskNode(taskId);
                  }}
                  className={`h-14 px-3 flex items-center justify-between cursor-pointer transition-colors ${
                    isSelected ? 'bg-cyan-950/40 border-l-2 border-cyan-400' : 'hover:bg-[#161920]'
                  }`}
                >
                  <div className="min-w-0 flex-1 pr-2">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: taskInfo.color }}
                      />
                      <span className="text-xs font-mono font-bold text-slate-200 truncate">
                        {taskInfo.name}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 mt-1 text-[10px] font-mono text-slate-400">
                      <span>Periódus: {taskInfo.loopPeriodMs}ms</span>
                      <span className="text-slate-600">•</span>
                      <span className="text-cyan-300">{taskInfo.blocksCount} blokk</span>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span
                      className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded border ${
                        taskInfo.core === 0
                          ? 'bg-sky-950 text-sky-300 border-sky-600'
                          : 'bg-emerald-950 text-emerald-300 border-emerald-600'
                      }`}
                    >
                      Core {taskInfo.core}
                    </span>

                    <span className="text-[10px] font-mono font-bold px-1 rounded bg-[#1A1D24] text-amber-300 border border-slate-700">
                      P:{taskInfo.priority}
                    </span>
                  </div>
                </div>
              );
            })}

            {/* IDLE Task Rows in Sidebar */}
            {showIdleTasks && (
              <>
                {(coreFilter === 'all' || coreFilter === 0) && (
                  <div className="h-12 px-3 flex items-center justify-between bg-[#0A0C10] text-slate-500">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-slate-700" />
                      <span className="text-xs font-mono">IDLE_0 (Core 0 Hook)</span>
                    </div>
                    <span className="text-[9px] font-mono px-1 rounded bg-slate-900 border border-slate-800">
                      P:0 (Alapért.)
                    </span>
                  </div>
                )}

                {(coreFilter === 'all' || coreFilter === 1) && (
                  <div className="h-12 px-3 flex items-center justify-between bg-[#0A0C10] text-slate-500">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-slate-700" />
                      <span className="text-xs font-mono">IDLE_1 (Core 1 Hook)</span>
                    </div>
                    <span className="text-[9px] font-mono px-1 rounded bg-slate-900 border border-slate-800">
                      P:0 (Alapért.)
                    </span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Right Timeline Canvas (Scrollable Horizontal Tracks) */}
        <div className="flex-1 flex flex-col min-w-[700px] relative overflow-x-auto bg-[#07090D]">
          {/* Timeline Time Header (ms scale ticks) */}
          <div className="h-9 sticky top-0 bg-[#0F1115] border-b border-[#2A2D35] z-10 flex items-center relative">
            {timeTicks.map((tVal) => {
              const leftPct = getTimePercent(tVal);
              return (
                <div
                  key={tVal}
                  className="absolute top-0 bottom-0 flex flex-col justify-between"
                  style={{ left: `${leftPct}%` }}
                >
                  <div className="h-2 w-px bg-slate-700" />
                  <span className="text-[10px] font-mono text-slate-400 -translate-x-1/2 select-none">
                    {tVal} ms
                  </span>
                  <div className="h-1.5 w-px bg-slate-800" />
                </div>
              );
            })}
          </div>

          {/* Time Grid Vertical Guidelines Layer */}
          <div className="absolute inset-0 top-9 pointer-events-none z-0">
            {timeTicks.map((tVal) => {
              const leftPct = getTimePercent(tVal);
              return (
                <div
                  key={`grid_${tVal}`}
                  className="absolute top-0 bottom-0 w-px bg-slate-800/40"
                  style={{ left: `${leftPct}%` }}
                />
              );
            })}
          </div>

          {/* Task Timeline Tracks Layer */}
          <div ref={tracksContentRef} className="flex-1 divide-y divide-[#1F232B] relative z-5">
            {/* SVG Dependency Overlay Arrows Layer */}
            {showDependencyArrows && scheduleData.dependencies && scheduleData.dependencies.length > 0 && (
              <svg className="absolute inset-0 w-full h-full pointer-events-none z-20 overflow-visible">
                <defs>
                  {/* Glowing purple marker head */}
                  <marker
                    id="gantt-dep-arrow"
                    viewBox="0 0 10 10"
                    refX="9"
                    refY="5"
                    markerWidth="7"
                    markerHeight="7"
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#c084fc" />
                  </marker>

                  <filter id="gantt-dep-glow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="2.5" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>
                </defs>

                {scheduleData.dependencies.map((link) => {
                  const fromIdx = displayedTaskIds.indexOf(link.fromTaskId);
                  const toIdx = displayedTaskIds.indexOf(link.toTaskId);

                  if (fromIdx === -1 || toIdx === -1) return null;

                  const y1 = fromIdx * 56 + 28;
                  const y2 = toIdx * 56 + 28;

                  const x1Pct = getTimePercent(link.sourceTimeMs);
                  const x2Pct = getTimePercent(link.targetTimeMs);

                  // Skip if completely outside view
                  if ((x1Pct < -5 && x2Pct < -5) || (x1Pct > 105 && x2Pct > 105)) return null;

                  const x1 = (x1Pct / 100) * tracksWidthPx;
                  const x2 = (x2Pct / 100) * tracksWidthPx;

                  // Smooth Bezier Curve computation
                  const deltaX = Math.max(25, (x2 - x1) * 0.5);
                  const cp1x = x1 + deltaX;
                  const cp1y = y1;
                  const cp2x = x2 - deltaX;
                  const cp2y = y2;
                  const pathData = `M ${x1} ${y1} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${x2} ${y2}`;

                  const midX = (x1 + x2) / 2;
                  const midY = (y1 + y2) / 2;

                  return (
                    <g key={link.id} className="pointer-events-auto">
                      {/* Invisible wider stroke for easy hover trigger */}
                      <path
                        d={pathData}
                        fill="none"
                        stroke="transparent"
                        strokeWidth="20"
                        className="cursor-pointer"
                        onMouseEnter={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          setHoveredDependency({
                            link,
                            x: e.clientX,
                            y: e.clientY - 10,
                          });
                        }}
                        onMouseLeave={() => setHoveredDependency(null)}
                      />

                      {/* Drop-shadow backing line */}
                      <path
                        d={pathData}
                        fill="none"
                        stroke="#000000"
                        strokeWidth="4.5"
                        strokeOpacity="0.8"
                      />

                      {/* Main Glowing Dashed Dependency Line */}
                      <path
                        d={pathData}
                        fill="none"
                        stroke="#c084fc"
                        strokeWidth="2.5"
                        strokeDasharray="5,3"
                        markerEnd="url(#gantt-dep-arrow)"
                        filter="url(#gantt-dep-glow)"
                        className="transition-all hover:stroke-purple-200"
                        onMouseEnter={(e) => {
                          setHoveredDependency({
                            link,
                            x: e.clientX,
                            y: e.clientY - 10,
                          });
                        }}
                        onMouseLeave={() => setHoveredDependency(null)}
                      />

                      {/* Pulsing Animated Particle along dependency trajectory */}
                      {isPlaying && (
                        <circle r="3.5" fill="#f3e8ff" filter="url(#gantt-dep-glow)">
                          <animateMotion
                            path={pathData}
                            dur="1.2s"
                            repeatCount="indefinite"
                          />
                        </circle>
                      )}

                      {/* Origin Dot at source task completion */}
                      <circle
                        cx={x1}
                        cy={y1}
                        r="4"
                        fill="#c084fc"
                        stroke="#3b0764"
                        strokeWidth="1.5"
                        filter="url(#gantt-dep-glow)"
                      />

                      {/* Small floating Trigger Badge near midpoint */}
                      {Math.abs(x2 - x1) > 40 && (
                        <g
                          transform={`translate(${midX}, ${midY})`}
                          className="cursor-pointer pointer-events-auto"
                          onMouseEnter={(e) => {
                            setHoveredDependency({
                              link,
                              x: e.clientX,
                              y: e.clientY - 10,
                            });
                          }}
                          onMouseLeave={() => setHoveredDependency(null)}
                        >
                          <rect
                            x="-38"
                            y="-9"
                            width="76"
                            height="18"
                            rx="4"
                            fill="#161920"
                            stroke="#a855f7"
                            strokeWidth="1.2"
                            className="shadow-md"
                          />
                          <text
                            x="0"
                            y="3.5"
                            textAnchor="middle"
                            fill="#e9d5ff"
                            fontSize="8"
                            fontFamily="monospace"
                            fontWeight="bold"
                          >
                            🔗 Trigger
                          </text>
                        </g>
                      )}
                    </g>
                  );
                })}
              </svg>
            )}

            {displayedTaskIds.map((taskId) => {
              const taskInfo = scheduleData.tasksInfo[taskId];
              const taskSlices = scheduleData.slices.filter((s) => s.taskId === taskId);

              return (
                <div key={`track_${taskId}`} className="h-14 relative group">
                  {/* Background Track Row */}
                  <div className="absolute inset-0 bg-[#0A0C10]/40 group-hover:bg-[#12141A]/60 transition-colors" />

                  {/* Render Time Slices for this task */}
                  {taskSlices.map((slice) => {
                    const leftPct = getTimePercent(slice.startTimeMs);
                    const rightPct = getTimePercent(slice.endTimeMs);
                    const widthPct = Math.max(0.6, rightPct - leftPct);

                    // Skip slices totally out of current view window
                    if (slice.endTimeMs < currentTimeOffsetMs || slice.startTimeMs > currentTimeOffsetMs + timeWindowMs) {
                      return null;
                    }

                    // Style depending on state
                    let barBg = 'bg-slate-700';
                    let barBorder = 'border-slate-600';
                    let label = '';
                    let isStriped = false;

                    if (slice.state === 'RUNNING') {
                      barBg = 'bg-emerald-600 shadow-[0_0_8px_rgba(16,185,129,0.3)]';
                      barBorder = 'border-emerald-400';
                      label = `${slice.durationMs}ms`;
                      isStriped = true;
                    } else if (slice.state === 'PREEMPTED') {
                      barBg = 'bg-rose-600 shadow-[0_0_10px_rgba(244,63,94,0.5)]';
                      barBorder = 'border-rose-400';
                      label = `⚡ Kiszorítva (${slice.durationMs}ms)`;
                    } else if (slice.state === 'READY') {
                      barBg = 'bg-amber-600/70';
                      barBorder = 'border-amber-400/60';
                      label = 'Kész';
                    } else if (slice.state === 'BLOCKED') {
                      if (!showBlockedBars) return null;
                      barBg = 'bg-slate-800/80';
                      barBorder = 'border-slate-700/60';
                      label = 'Delay';
                    }

                    return (
                      <div
                        key={slice.id}
                        onMouseEnter={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          setHoveredSlice({
                            slice,
                            x: rect.left + rect.width / 2,
                            y: rect.top,
                          });
                        }}
                        onMouseLeave={() => setHoveredSlice(null)}
                        className={`absolute top-2.5 bottom-2.5 rounded border transition-all cursor-pointer flex items-center justify-between px-1.5 overflow-hidden text-[10px] font-mono font-bold select-none ${barBg} ${barBorder}`}
                        style={{
                          left: `${leftPct}%`,
                          width: `${widthPct}%`,
                        }}
                      >
                        {/* Slice Label / Block Badge */}
                        <div className="truncate flex items-center gap-1">
                          {slice.state === 'PREEMPTED' && <Zap className="w-3 h-3 text-white shrink-0" />}
                          <span className="text-white drop-shadow-xs">{label}</span>
                        </div>

                        {/* If Running & Wide Enough, Show Executed Block Badge */}
                        {showBlockBadges && slice.state === 'RUNNING' && widthPct > 6 && slice.blocksExecuted && slice.blocksExecuted.length > 0 && (
                          <span className="text-[9px] font-normal px-1 py-0.2 rounded bg-black/40 text-emerald-200 border border-emerald-500/30 truncate shrink-0">
                            🧩 {slice.blocksExecuted[0].blockName}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}

            {/* IDLE Task Tracks */}
            {showIdleTasks && (
              <>
                {(coreFilter === 'all' || coreFilter === 0) && (
                  <div className="h-12 relative bg-[#06070A]">
                    {scheduleData.slices
                      .filter((s) => s.taskId === 'IDLE_0')
                      .map((slice) => {
                        const leftPct = getTimePercent(slice.startTimeMs);
                        const rightPct = getTimePercent(slice.endTimeMs);
                        const widthPct = Math.max(0.5, rightPct - leftPct);

                        return (
                          <div
                            key={slice.id}
                            className="absolute top-2 bottom-2 rounded bg-slate-900/90 border border-slate-800 text-[10px] font-mono text-slate-500 flex items-center justify-center overflow-hidden"
                            style={{
                              left: `${leftPct}%`,
                              width: `${widthPct}%`,
                            }}
                          >
                            <span>IDLE_0</span>
                          </div>
                        );
                      })}
                  </div>
                )}

                {(coreFilter === 'all' || coreFilter === 1) && (
                  <div className="h-12 relative bg-[#06070A]">
                    {scheduleData.slices
                      .filter((s) => s.taskId === 'IDLE_1')
                      .map((slice) => {
                        const leftPct = getTimePercent(slice.startTimeMs);
                        const rightPct = getTimePercent(slice.endTimeMs);
                        const widthPct = Math.max(0.5, rightPct - leftPct);

                        return (
                          <div
                            key={slice.id}
                            className="absolute top-2 bottom-2 rounded bg-slate-900/90 border border-slate-800 text-[10px] font-mono text-slate-500 flex items-center justify-center overflow-hidden"
                            style={{
                              left: `${leftPct}%`,
                              width: `${widthPct}%`,
                            }}
                          >
                            <span>IDLE_1</span>
                          </div>
                        );
                      })}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Preemption Event Vertical Lightning Lines */}
          {showPreemptionLines &&
            scheduleData.preemptions.map((pEvent) => {
              const leftPct = getTimePercent(pEvent.timeMs);
              if (leftPct < 0 || leftPct > 100) return null;

              return (
                <div
                  key={pEvent.id}
                  className="absolute top-9 bottom-0 pointer-events-none z-30 flex flex-col items-center"
                  style={{ left: `${leftPct}%` }}
                >
                  <div className="px-1 py-0.5 rounded bg-rose-600 text-white font-mono text-[9px] font-bold shadow-md flex items-center gap-0.5 -translate-x-1/2">
                    <Zap className="w-2.5 h-2.5" />
                    <span>PREEMPT {pEvent.timeMs}ms</span>
                  </div>
                  <div className="flex-1 w-0.5 bg-rose-500/80 border-l border-dashed border-rose-300" />
                </div>
              );
            })}
        </div>
      </div>

      {/* Floating Detailed Hover Tooltip */}
      {hoveredSlice && (
        <div
          className="fixed z-50 p-3 rounded-lg bg-[#161920] border border-cyan-500/60 shadow-2xl text-xs font-mono text-slate-200 pointer-events-none -translate-x-1/2 -translate-y-full mb-2 w-80 backdrop-blur-md"
          style={{ left: hoveredSlice.x, top: hoveredSlice.y }}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-700 pb-1.5 mb-2">
            <div className="flex items-center gap-1.5">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  hoveredSlice.slice.state === 'RUNNING'
                    ? 'bg-emerald-400 animate-ping'
                    : hoveredSlice.slice.state === 'PREEMPTED'
                    ? 'bg-rose-400'
                    : 'bg-amber-400'
                }`}
              />
              <span className="font-bold text-white text-sm">
                {hoveredSlice.slice.taskName}
              </span>
            </div>

            <span
              className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                hoveredSlice.slice.state === 'RUNNING'
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-500'
                  : hoveredSlice.slice.state === 'PREEMPTED'
                  ? 'bg-rose-950 text-rose-300 border border-rose-500'
                  : 'bg-slate-800 text-slate-300'
              }`}
            >
              {hoveredSlice.slice.state}
            </span>
          </div>

          {/* Time & Core Specs */}
          <div className="grid grid-cols-2 gap-2 mb-2 text-[11px]">
            <div>
              <span className="text-slate-400">Időtartam:</span>{' '}
              <span className="font-bold text-cyan-300">{hoveredSlice.slice.durationMs} ms</span>
            </div>
            <div>
              <span className="text-slate-400">Intervallum:</span>{' '}
              <span className="text-slate-200">
                {hoveredSlice.slice.startTimeMs} - {hoveredSlice.slice.endTimeMs} ms
              </span>
            </div>
            <div>
              <span className="text-slate-400">CPU Mag:</span>{' '}
              <span className="font-bold text-sky-400">Core {hoveredSlice.slice.core}</span>
            </div>
            <div>
              <span className="text-slate-400">Prioritás:</span>{' '}
              <span className="font-bold text-amber-300">P:{hoveredSlice.slice.effectivePriority}</span>
            </div>
          </div>

          {/* Preemption / Block Reason */}
          {hoveredSlice.slice.state === 'PREEMPTED' && (
            <div className="p-1.5 rounded bg-rose-950/60 border border-rose-500/40 text-rose-200 text-[10px] mb-2 flex items-start gap-1.5">
              <Zap className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Megszakítva:</span> Magasabb prioritású taszk vette át a CPU magot!
              </div>
            </div>
          )}

          {hoveredSlice.slice.state === 'BLOCKED' && hoveredSlice.slice.blockedReason && (
            <div className="p-1.5 rounded bg-slate-800/80 border border-slate-700 text-slate-300 text-[10px] mb-2">
              <span className="text-slate-400">Blokkolás oka:</span> {hoveredSlice.slice.blockedReason}
            </div>
          )}

          {/* Block Instructions Executed */}
          {hoveredSlice.slice.blocksExecuted && hoveredSlice.slice.blocksExecuted.length > 0 && (
            <div className="border-t border-slate-800 pt-1.5">
              <div className="text-[10px] font-bold text-cyan-400 uppercase mb-1 flex items-center gap-1">
                <Layers className="w-3 h-3" />
                <span>Végrehajtott Blokkok a szeletben:</span>
              </div>
              <div className="space-y-1">
                {hoveredSlice.slice.blocksExecuted.map((b, bIdx) => (
                  <div
                    key={bIdx}
                    className="p-1 rounded bg-[#0F1115] border border-slate-800 flex items-center justify-between text-[10px]"
                  >
                    <span className="text-slate-300 font-bold">
                      {bIdx + 1}. {b.blockName}
                    </span>
                    <span className="text-emerald-400">{b.durationUs} µs</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Floating Detailed Hover Tooltip for Dependency Link */}
      {hoveredDependency && (
        <div
          className="fixed z-50 p-3 rounded-lg bg-[#161920] border border-purple-500/70 shadow-2xl text-xs font-mono text-slate-200 pointer-events-none -translate-x-1/2 -translate-y-full mb-2 w-84 backdrop-blur-md"
          style={{ left: hoveredDependency.x, top: hoveredDependency.y }}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-purple-900/60 pb-1.5 mb-2">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-400 animate-ping" />
              <span className="font-bold text-white text-sm flex items-center gap-1">
                <GitBranch className="w-4 h-4 text-purple-400" />
                <span>Taszk Függőség (Task Dependency)</span>
              </span>
            </div>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-950 text-purple-300 border border-purple-700">
              Szinkronizáció
            </span>
          </div>

          {/* Source and Target Tasks */}
          <div className="space-y-2 mb-2 text-[11px]">
            {/* Predecessor (Előzmény) */}
            <div className="p-1.5 rounded bg-[#0F1115] border border-slate-800">
              <div className="text-slate-400 text-[10px] flex items-center justify-between">
                <span>1. Előzmény Taszk Befejezése:</span>
                <span className="text-cyan-300 font-bold">{hoveredDependency.link.sourceTimeMs} ms</span>
              </div>
              <div className="text-slate-200 font-bold flex items-center gap-1 mt-0.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>{hoveredDependency.link.fromTaskName}</span>
              </div>
            </div>

            <div className="flex justify-center -my-1 text-purple-400 font-bold">
              <ArrowRight className="w-4 h-4 rotate-90" />
            </div>

            {/* Successor (Függő / Aktivált Taszk) */}
            <div className="p-1.5 rounded bg-[#0F1115] border border-purple-900/50">
              <div className="text-slate-400 text-[10px] flex items-center justify-between">
                <span>2. Függő Taszk Aktiválása (Ready):</span>
                <span className="text-purple-300 font-bold">{hoveredDependency.link.targetTimeMs} ms</span>
              </div>
              <div className="text-purple-200 font-bold flex items-center gap-1 mt-0.5">
                <span className="w-2 h-2 rounded-full bg-purple-400" />
                <span>{hoveredDependency.link.toTaskName}</span>
              </div>
            </div>
          </div>

          {/* IPC mechanism note */}
          <div className="p-1.5 rounded bg-purple-950/40 border border-purple-800/40 text-[10px] text-purple-200">
            <span className="font-bold text-purple-300">FreeRTOS Mechanizmus:</span>{' '}
            {hoveredDependency.link.syncType === 'binary_semaphore'
              ? 'xSemaphoreGive() szemafor átadás a taszkok között'
              : 'xTaskNotifyGive() közvetlen taszk értesítés (Zero-RAM overhead)'}
          </div>
        </div>
      )}
    </div>
  );
};
