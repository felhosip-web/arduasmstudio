/**
 * (c) 2026 AI Studio - FreeRTOS Dual-Core Preemptive Scheduling Simulation Engine
 * Simulates FreeRTOS tick scheduling, task execution slices, block-based instruction cycles,
 * priority preemptions, mutex locks / priority inheritance, queue I/O, and CPU idle times.
 */

import { RtosNode, RtosWire, RtosTaskData, RtosQueueData, RtosMutexData, ProgramBlock } from '../../types';
import { BLOCK_DEFINITIONS } from '../../data/blockDefinitions';

export type GanttTaskState = 'RUNNING' | 'READY' | 'BLOCKED' | 'PREEMPTED' | 'IDLE';

export interface GanttBlockExecution {
  blockId: string;
  blockType: string;
  blockName: string;
  durationUs: number;
  cycles: number;
  description: string;
}

export interface GanttTimeSlice {
  id: string;
  taskId: string;
  taskName: string;
  core: 0 | 1;
  priority: number;
  effectivePriority: number; // Can be higher due to Priority Inheritance
  state: GanttTaskState;
  startTimeMs: number;
  endTimeMs: number;
  durationMs: number;
  preemptedByTaskId?: string;
  preemptedByTaskName?: string;
  blockedReason?: string; // 'vTaskDelay', 'xQueueReceive', 'xSemaphoreTake', 'ulTaskNotifyTake'
  blockedOnNodeId?: string;
  blocksExecuted?: GanttBlockExecution[];
  isIdleTask?: boolean;
}

export interface GanttPreemptionEvent {
  id: string;
  timeMs: number;
  core: 0 | 1;
  preemptedTaskId: string;
  preemptedTaskName: string;
  preemptedPriority: number;
  runningTaskId: string;
  runningTaskName: string;
  runningPriority: number;
  reason: string; // 'Higher priority timer wakeup', 'ISR triggered', 'Queue data received', 'Priority boost'
}

export interface GanttDependencyLink {
  id: string;
  fromTaskId: string;
  fromTaskName: string;
  toTaskId: string;
  toTaskName: string;
  fromCore: 0 | 1;
  toCore: 0 | 1;
  sourceTimeMs: number; // Timestamp (ms) when predecessor task finished
  targetTimeMs: number; // Timestamp (ms) when successor task started/unblocked
  type: 'completion' | 'notification' | 'queue_data';
  label?: string;
}

export interface GanttCoreMetrics {
  core: 0 | 1;
  utilizationPercent: number;
  idlePercent: number;
  preemptionCount: number;
  contextSwitchCount: number;
  activeTaskCount: number;
  deadlineMisses: number;
}

export interface GanttScheduleResult {
  slices: GanttTimeSlice[];
  preemptions: GanttPreemptionEvent[];
  dependencies: GanttDependencyLink[];
  core0Metrics: GanttCoreMetrics;
  core1Metrics: GanttCoreMetrics;
  totalTimeMs: number;
  timeWindowMs: number;
  taskIds: string[];
  tasksInfo: Record<string, {
    id: string;
    name: string;
    core: 0 | 1;
    priority: number;
    loopPeriodMs: number;
    color: string;
    state: GanttTaskState;
    blocksCount: number;
    dependsOnTaskIds?: string[];
  }>;
}

// Predefined vibrant, accessible colors for tasks in Gantt chart
export const TASK_GANTT_COLORS = [
  '#38bdf8', // Sky
  '#4ade80', // Emerald
  '#f59e0b', // Amber
  '#a855f7', // Purple
  '#ec4899', // Pink
  '#06b6d4', // Cyan
  '#f97316', // Orange
  '#10b981', // Teal
  '#8b5cf6', // Violet
  '#64748b', // Slate
];

/**
 * Generate simulated block steps for a task based on its type, name and parameters
 */
export function getTaskBlockSteps(task: RtosTaskData, globalBlocks: ProgramBlock[] = []): GanttBlockExecution[] {
  // If global workspace blocks exist, extract some representative block instructions
  const sampleBlocks: GanttBlockExecution[] = [];

  const taskNameLower = (task.name || '').toLowerCase();

  if (taskNameLower.includes('sensor') || taskNameLower.includes('sample') || taskNameLower.includes('adc')) {
    sampleBlocks.push(
      { blockId: 'b_adc', blockType: 'adc_read', blockName: 'ADC Mintavételezés', durationUs: 65, cycles: 1040, description: 'Analóg feszültség olvasás (A0 csatorna)' },
      { blockId: 'b_filter', blockType: 'math_op', blockName: 'Digitális Kalman Szűrés', durationUs: 28, cycles: 448, description: 'Lebegőpontos számítás' },
      { blockId: 'b_qsend', blockType: 'queue_send', blockName: 'xQueueSendToBack()', durationUs: 18, cycles: 288, description: 'Üzenetküldés a telemetria sorba' }
    );
  } else if (taskNameLower.includes('mqtt') || taskNameLower.includes('cloud') || taskNameLower.includes('wifi') || taskNameLower.includes('net')) {
    sampleBlocks.push(
      { blockId: 'b_qrec', blockType: 'queue_recv', blockName: 'xQueueReceive()', durationUs: 22, cycles: 352, description: 'Csomag kiolvasása a pufferből' },
      { blockId: 'b_tls', blockType: 'crypto', blockName: 'TLS SHA-256 HMAC', durationUs: 140, cycles: 2240, description: 'Hardveres titkosító motor' },
      { blockId: 'b_tx', blockType: 'wifi_tx', blockName: 'LwIP Sockets send()', durationUs: 85, cycles: 1360, description: 'TCP/IP csomag átvitel a WiFi verembe' }
    );
  } else if (taskNameLower.includes('display') || taskNameLower.includes('oled') || taskNameLower.includes('ui')) {
    sampleBlocks.push(
      { blockId: 'b_mtx_take', blockType: 'mutex_take', blockName: 'xSemaphoreTake(i2cBus)', durationUs: 12, cycles: 192, description: 'I2C Busz kizárólagos lefoglalása' },
      { blockId: 'b_i2c_write', blockType: 'i2c_write', blockName: 'SSD1306 Framebuffer DMA', durationUs: 110, cycles: 1760, description: 'Kijelző képfrissítés (128x64)' },
      { blockId: 'b_mtx_give', blockType: 'mutex_give', blockName: 'xSemaphoreGive(i2cBus)', durationUs: 8, cycles: 128, description: 'I2C Busz felszabadítása' }
    );
  } else if (taskNameLower.includes('motor') || taskNameLower.includes('pwm') || taskNameLower.includes('control')) {
    sampleBlocks.push(
      { blockId: 'b_pid', blockType: 'math_op', blockName: 'PID Szabályzó Ciklus', durationUs: 45, cycles: 720, description: 'Hibajel számítás és integrálás' },
      { blockId: 'b_pwm', blockType: 'pwm_write', blockName: 'LEDC PWM Kitöltés (Pin 18)', durationUs: 15, cycles: 240, description: 'Hardveres PWM regiszter frissítés' }
    );
  } else {
    // Default general block steps
    sampleBlocks.push(
      { blockId: 'b_gpio', blockType: 'io_digital_write', blockName: 'GPIO Írás / Állapot Frissítés', durationUs: 12, cycles: 192, description: 'Digitális kimenet váltása' },
      { blockId: 'b_proc', blockType: 'data_processing', blockName: 'Adatfeldolgozás & Logika', durationUs: 38, cycles: 608, description: 'Belső struktúra számítás' }
    );
  }

  return sampleBlocks;
}

/**
 * Run a multi-core FreeRTOS preemptive scheduler simulation for a given duration (e.g. 100ms - 2000ms).
 */
export function simulateRtosSchedule(
  nodes: RtosNode[],
  wires: RtosWire[],
  options: {
    totalDurationMs?: number;
    tickResolutionMs?: number; // FreeRTOS tick slice (default 1ms)
    timeOffsetMs?: number; // Starting time offset for rolling timeline
    injectedPreemption?: { timeMs: number; core: 0 | 1; isrName: string } | null;
    injectedQueueBurst?: { timeMs: number; queueName: string } | null;
  } = {}
): GanttScheduleResult {
  const totalDurationMs = options.totalDurationMs || 250;
  const tickResolutionMs = options.tickResolutionMs || 1;
  const startOffsetMs = options.timeOffsetMs || 0;

  // 1. Extract and normalize tasks
  const taskNodes = nodes.filter((n) => n.type === 'task');
  const queueNodes = nodes.filter((n) => n.type === 'queue');
  const mutexNodes = nodes.filter((n) => n.type === 'mutex');

  // If no tasks exist, return default idle template
  if (taskNodes.length === 0) {
    const idle0Slices: GanttTimeSlice[] = [{
      id: 'idle_0_init',
      taskId: 'IDLE_0',
      taskName: 'IDLE_0 (Core 0)',
      core: 0,
      priority: 0,
      effectivePriority: 0,
      state: 'IDLE',
      startTimeMs: startOffsetMs,
      endTimeMs: startOffsetMs + totalDurationMs,
      durationMs: totalDurationMs,
      isIdleTask: true,
    }];
    const idle1Slices: GanttTimeSlice[] = [{
      id: 'idle_1_init',
      taskId: 'IDLE_1',
      taskName: 'IDLE_1 (Core 1)',
      core: 1,
      priority: 0,
      effectivePriority: 0,
      state: 'IDLE',
      startTimeMs: startOffsetMs,
      endTimeMs: startOffsetMs + totalDurationMs,
      durationMs: totalDurationMs,
      isIdleTask: true,
    }];

    return {
      slices: [...idle0Slices, ...idle1Slices],
      preemptions: [],
      dependencies: [],
      core0Metrics: { core: 0, utilizationPercent: 0, idlePercent: 100, preemptionCount: 0, contextSwitchCount: 0, activeTaskCount: 0, deadlineMisses: 0 },
      core1Metrics: { core: 1, utilizationPercent: 0, idlePercent: 100, preemptionCount: 0, contextSwitchCount: 0, activeTaskCount: 0, deadlineMisses: 0 },
      totalTimeMs: totalDurationMs,
      timeWindowMs: totalDurationMs,
      taskIds: [],
      tasksInfo: {},
    };
  }

  // Pre-calculate task dependencies from both task data and wire connections
  const taskDependenciesMap: Record<string, string[]> = {};
  const taskDependentsMap: Record<string, string[]> = {};

  taskNodes.forEach((node) => {
    taskDependenciesMap[node.id] = [];
    taskDependentsMap[node.id] = [];
  });

  taskNodes.forEach((node) => {
    const data = node.data as RtosTaskData;
    const deps = new Set<string>();

    // 1. Explicit dependsOnTaskIds in task data
    if (data.dependsOnTaskIds && Array.isArray(data.dependsOnTaskIds)) {
      data.dependsOnTaskIds.forEach((depId) => {
        if (taskNodes.some((tn) => tn.id === depId)) {
          deps.add(depId);
        }
      });
    }

    // 2. Wires connecting other task nodes to this task (task_dependency or direct_notify)
    wires.forEach((w) => {
      if (w.toNodeId === node.id && taskNodes.some((tn) => tn.id === w.fromNodeId)) {
        if (w.type === 'task_dependency' || w.type === 'direct_notify') {
          deps.add(w.fromNodeId);
        }
      }
    });

    taskDependenciesMap[node.id] = Array.from(deps);
  });

  // Populate reverse map: who is waiting for this task to finish
  Object.entries(taskDependenciesMap).forEach(([taskId, depIds]) => {
    depIds.forEach((depId) => {
      if (taskDependentsMap[depId]) {
        taskDependentsMap[depId].push(taskId);
      }
    });
  });

  // Assign task colors & metadata
  const tasksInfo: Record<string, any> = {};
  const taskRuntimeState: Record<string, {
    nodeId: string;
    name: string;
    core: 0 | 1;
    priority: number;
    basePriority: number;
    effectivePriority: number;
    loopPeriodMs: number;
    executionDurationMs: number; // Execution time needed per period
    state: GanttTaskState;
    nextWakeupTimeMs: number;
    remainingExecutionMs: number;
    blockedUntilTimeMs: number;
    blockedReason: string;
    color: string;
    blocks: GanttBlockExecution[];
    lockedMutexes: string[];
    dependsOnTaskIds: string[];
    dependentTaskIds: string[];
    isDependentTask: boolean;
  }> = {};

  taskNodes.forEach((node, idx) => {
    const data = node.data as RtosTaskData;
    const core: 0 | 1 = (data.core === 0 || data.core === 1) ? data.core : (idx % 2 === 0 ? 0 : 1);
    const loopPeriodMs = Math.max(10, data.loopPeriodMs || 50);
    const deps = taskDependenciesMap[node.id] || [];
    const isDependentTask = deps.length > 0;

    // Estimate task execution slice duration from cpuPercent or period (typically 3ms - 15ms)
    const execDuration = Math.max(
      2,
      Math.min(
        Math.floor(loopPeriodMs * 0.4),
        Math.round((data.cpuPercent || 20) * 0.01 * loopPeriodMs) || 5
      )
    );

    const color = TASK_GANTT_COLORS[idx % TASK_GANTT_COLORS.length];
    const blocks = getTaskBlockSteps(data);

    tasksInfo[node.id] = {
      id: node.id,
      name: data.name || `Task_${idx + 1}`,
      core,
      priority: data.priority ?? 2,
      loopPeriodMs,
      color,
      state: isDependentTask ? 'BLOCKED' : 'READY',
      blocksCount: blocks.length,
      dependsOnTaskIds: deps,
    };

    taskRuntimeState[node.id] = {
      nodeId: node.id,
      name: data.name || `Task_${idx + 1}`,
      core,
      priority: data.priority ?? 2,
      basePriority: data.priority ?? 2,
      effectivePriority: data.priority ?? 2,
      loopPeriodMs,
      executionDurationMs: execDuration,
      state: isDependentTask ? 'BLOCKED' : 'READY',
      nextWakeupTimeMs: isDependentTask ? 9999999 : startOffsetMs + (idx * 4) % loopPeriodMs, // Independent tasks stagger start
      remainingExecutionMs: isDependentTask ? 0 : execDuration,
      blockedUntilTimeMs: isDependentTask ? 9999999 : 0,
      blockedReason: isDependentTask ? 'Várakozás előd taszk befejezésére' : '',
      color,
      blocks,
      lockedMutexes: [],
      dependsOnTaskIds: deps,
      dependentTaskIds: taskDependentsMap[node.id] || [],
      isDependentTask,
    };
  });

  const rawSlices: GanttTimeSlice[] = [];
  const preemptions: GanttPreemptionEvent[] = [];
  const dependencies: GanttDependencyLink[] = [];

  let core0PreemptionCount = 0;
  let core1PreemptionCount = 0;
  let core0ContextSwitches = 0;
  let core1ContextSwitches = 0;
  let core0ActiveTicks = 0;
  let core1ActiveTicks = 0;

  // Active running task on each core
  let core0RunningTaskId: string | null = null;
  let core1RunningTaskId: string | null = null;

  // Discrete Event Tick Loop (1ms steps)
  for (let t = 0; t < totalDurationMs; t += tickResolutionMs) {
    const currentAbsoluteTimeMs = startOffsetMs + t;

    // Check for injected events
    if (options.injectedPreemption && Math.abs(currentAbsoluteTimeMs - options.injectedPreemption.timeMs) < tickResolutionMs) {
      // Hardware ISR event on specified core
      const isrCore = options.injectedPreemption.core;
      const currentRunningId = isrCore === 0 ? core0RunningTaskId : core1RunningTaskId;
      if (currentRunningId && taskRuntimeState[currentRunningId]) {
        preemptions.push({
          id: `preempt_isr_${t}`,
          timeMs: currentAbsoluteTimeMs,
          core: isrCore,
          preemptedTaskId: currentRunningId,
          preemptedTaskName: taskRuntimeState[currentRunningId].name,
          preemptedPriority: taskRuntimeState[currentRunningId].effectivePriority,
          runningTaskId: 'ISR_HANDLER',
          runningTaskName: options.injectedPreemption.isrName || 'EXT_GPIO_ISR',
          runningPriority: 25, // ISR highest priority
          reason: '⚡ Hardveres Megszakítás (ISR) azonnali preemptiont váltott ki',
        });
      }
    }

    // Step A: Update task wakeups and timer states
    Object.values(taskRuntimeState).forEach((task) => {
      // Independent tasks: period timer trigger
      if (!task.isDependentTask) {
        if (currentAbsoluteTimeMs >= task.nextWakeupTimeMs && task.remainingExecutionMs <= 0) {
          task.state = 'READY';
          task.remainingExecutionMs = task.executionDurationMs;
          task.nextWakeupTimeMs += task.loopPeriodMs;
          task.blockedReason = '';
        }
      }

      // Check if blocked delay expired (for self-reloading delays)
      if (task.state === 'BLOCKED' && currentAbsoluteTimeMs >= task.blockedUntilTimeMs && !task.isDependentTask) {
        task.state = 'READY';
        task.blockedReason = '';
      }
    });

    // Step B: Multi-Core Scheduling per Core (Core 0 & Core 1)
    [0, 1].forEach((cNum) => {
      const core = cNum as 0 | 1;
      const tasksOnCore = Object.values(taskRuntimeState).filter((t) => t.core === core);

      // Find ready tasks on this core, sorted by highest effective priority
      const readyTasks = tasksOnCore
        .filter((t) => t.state === 'READY' || t.state === 'RUNNING' || t.state === 'PREEMPTED')
        .sort((a, b) => b.effectivePriority - a.effectivePriority);

      let winnerTask = readyTasks.length > 0 ? readyTasks[0] : null;
      const currentlyRunningId = core === 0 ? core0RunningTaskId : core1RunningTaskId;

      if (winnerTask) {
        // Preemption check: did a higher priority task bump the currently running task?
        if (currentlyRunningId && currentlyRunningId !== winnerTask.nodeId) {
          const prevTask = taskRuntimeState[currentlyRunningId];
          if (prevTask && prevTask.remainingExecutionMs > 0) {
            prevTask.state = 'PREEMPTED';
            if (core === 0) core0PreemptionCount++;
            else core1PreemptionCount++;

            preemptions.push({
              id: `preempt_${t}_core${core}`,
              timeMs: currentAbsoluteTimeMs,
              core,
              preemptedTaskId: prevTask.nodeId,
              preemptedTaskName: prevTask.name,
              preemptedPriority: prevTask.effectivePriority,
              runningTaskId: winnerTask.nodeId,
              runningTaskName: winnerTask.name,
              runningPriority: winnerTask.effectivePriority,
              reason: `Magasabb prioritású taszk (${winnerTask.name}, P:${winnerTask.effectivePriority}) kiszorította a futó taszkot (${prevTask.name}, P:${prevTask.effectivePriority})`,
            });
          }
        }

        // Context switch count
        if (currentlyRunningId !== winnerTask.nodeId) {
          if (core === 0) core0ContextSwitches++;
          else core1ContextSwitches++;
        }

        // Set state to RUNNING
        winnerTask.state = 'RUNNING';
        winnerTask.remainingExecutionMs -= tickResolutionMs;

        // Record active core tick
        if (core === 0) {
          core0RunningTaskId = winnerTask.nodeId;
          core0ActiveTicks += tickResolutionMs;
        } else {
          core1RunningTaskId = winnerTask.nodeId;
          core1ActiveTicks += tickResolutionMs;
        }

        // Record time slice for winner task
        rawSlices.push({
          id: `slice_${winnerTask.nodeId}_${t}`,
          taskId: winnerTask.nodeId,
          taskName: winnerTask.name,
          core,
          priority: winnerTask.basePriority,
          effectivePriority: winnerTask.effectivePriority,
          state: 'RUNNING',
          startTimeMs: currentAbsoluteTimeMs,
          endTimeMs: currentAbsoluteTimeMs + tickResolutionMs,
          durationMs: tickResolutionMs,
          blocksExecuted: winnerTask.blocks,
        });

        // Set other ready tasks on this core to READY or PREEMPTED
        for (let i = 1; i < readyTasks.length; i++) {
          const lowerTask = readyTasks[i];
          const isPreempted = lowerTask.remainingExecutionMs < lowerTask.executionDurationMs;
          lowerTask.state = isPreempted ? 'PREEMPTED' : 'READY';

          rawSlices.push({
            id: `slice_wait_${lowerTask.nodeId}_${t}`,
            taskId: lowerTask.nodeId,
            taskName: lowerTask.name,
            core,
            priority: lowerTask.basePriority,
            effectivePriority: lowerTask.effectivePriority,
            state: isPreempted ? 'PREEMPTED' : 'READY',
            startTimeMs: currentAbsoluteTimeMs,
            endTimeMs: currentAbsoluteTimeMs + tickResolutionMs,
            durationMs: tickResolutionMs,
            preemptedByTaskId: isPreempted ? winnerTask.nodeId : undefined,
            preemptedByTaskName: isPreempted ? winnerTask.name : undefined,
          });
        }

        // If execution slice finished
        if (winnerTask.remainingExecutionMs <= 0) {
          const completionTimeMs = currentAbsoluteTimeMs + tickResolutionMs;
          winnerTask.state = 'BLOCKED';
          winnerTask.blockedUntilTimeMs = winnerTask.nextWakeupTimeMs;
          winnerTask.blockedReason = winnerTask.isDependentTask
            ? 'Várakozás következő előd jelzésre'
            : 'vTaskDelay(pdMS_TO_TICKS)';

          if (core === 0) core0RunningTaskId = null;
          else core1RunningTaskId = null;

          // TRIGGER DEPENDENT SUCCESSOR TASKS!
          const downstreamDependents = winnerTask.dependentTaskIds || [];
          downstreamDependents.forEach((depTaskId) => {
            const successor = taskRuntimeState[depTaskId];
            if (successor) {
              // Unblock successor task and prepare its execution budget
              successor.state = 'READY';
              successor.remainingExecutionMs = successor.executionDurationMs;
              successor.blockedReason = '';

              // Record dependency link arrow from predecessor completion to successor start
              dependencies.push({
                id: `dep_${winnerTask.nodeId}_to_${successor.nodeId}_${completionTimeMs}`,
                fromTaskId: winnerTask.nodeId,
                fromTaskName: winnerTask.name,
                toTaskId: successor.nodeId,
                toTaskName: successor.name,
                fromCore: winnerTask.core,
                toCore: successor.core,
                sourceTimeMs: completionTimeMs,
                targetTimeMs: completionTimeMs,
                type: 'completion',
                label: `${winnerTask.name} ➔ ${successor.name}`,
              });
            }
          });
        }
      } else {
        // No user task is ready -> Core runs IDLE task
        if (core === 0) core0RunningTaskId = null;
        else core1RunningTaskId = null;

        rawSlices.push({
          id: `slice_idle_${core}_${t}`,
          taskId: `IDLE_${core}`,
          taskName: `IDLE_${core}`,
          core,
          priority: 0,
          effectivePriority: 0,
          state: 'IDLE',
          startTimeMs: currentAbsoluteTimeMs,
          endTimeMs: currentAbsoluteTimeMs + tickResolutionMs,
          durationMs: tickResolutionMs,
          isIdleTask: true,
        });
      }

      // Also record BLOCKED slices for tasks currently sleeping/waiting
      tasksOnCore.forEach((task) => {
        if (task.state === 'BLOCKED' && task.remainingExecutionMs <= 0) {
          rawSlices.push({
            id: `slice_blocked_${task.nodeId}_${t}`,
            taskId: task.nodeId,
            taskName: task.name,
            core,
            priority: task.basePriority,
            effectivePriority: task.effectivePriority,
            state: 'BLOCKED',
            startTimeMs: currentAbsoluteTimeMs,
            endTimeMs: currentAbsoluteTimeMs + tickResolutionMs,
            durationMs: tickResolutionMs,
            blockedReason: task.blockedReason || 'vTaskDelay',
          });
        }
      });
    });
  }

  // Step C: Merge adjacent continuous slices of identical state & task for optimal rendering
  const mergedSlices: GanttTimeSlice[] = [];
  const slicesByTask: Record<string, GanttTimeSlice[]> = {};

  rawSlices.forEach((slice) => {
    if (!slicesByTask[slice.taskId]) {
      slicesByTask[slice.taskId] = [];
    }
    const list = slicesByTask[slice.taskId];
    const last = list[list.length - 1];

    if (
      last &&
      last.state === slice.state &&
      last.effectivePriority === slice.effectivePriority &&
      Math.abs(last.endTimeMs - slice.startTimeMs) < 0.001
    ) {
      // Extend previous slice
      last.endTimeMs = slice.endTimeMs;
      last.durationMs = +(last.endTimeMs - last.startTimeMs).toFixed(2);
      if (slice.blocksExecuted && !last.blocksExecuted) {
        last.blocksExecuted = slice.blocksExecuted;
      }
    } else {
      list.push({ ...slice });
    }
  });

  Object.values(slicesByTask).forEach((list) => {
    mergedSlices.push(...list);
  });

  // Calculate accurate dual-core metrics
  const core0Util = Math.min(100, Math.round((core0ActiveTicks / totalDurationMs) * 100));
  const core1Util = Math.min(100, Math.round((core1ActiveTicks / totalDurationMs) * 100));

  const core0Metrics: GanttCoreMetrics = {
    core: 0,
    utilizationPercent: core0Util,
    idlePercent: 100 - core0Util,
    preemptionCount: core0PreemptionCount,
    contextSwitchCount: core0ContextSwitches,
    activeTaskCount: taskNodes.filter((n) => (n.data as RtosTaskData).core === 0).length,
    deadlineMisses: 0,
  };

  const core1Metrics: GanttCoreMetrics = {
    core: 1,
    utilizationPercent: core1Util,
    idlePercent: 100 - core1Util,
    preemptionCount: core1PreemptionCount,
    contextSwitchCount: core1ContextSwitches,
    activeTaskCount: taskNodes.filter((n) => (n.data as RtosTaskData).core === 1).length,
    deadlineMisses: 0,
  };

  return {
    slices: mergedSlices,
    preemptions,
    dependencies,
    core0Metrics,
    core1Metrics,
    totalTimeMs: totalDurationMs,
    timeWindowMs: totalDurationMs,
    taskIds: Object.keys(tasksInfo),
    tasksInfo,
  };
}
