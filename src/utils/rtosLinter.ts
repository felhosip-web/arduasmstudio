/**
 * (c) 2026 AI Studio - Dedicated FreeRTOS Architecture Linter & Auto-Fix Engine
 * Evaluates real-time task architectures for Race Conditions, Deadlocks,
 * Priority Inversions, Task Starvation, Stack Overflows, and ISR Safety.
 */

import { RtosNode, RtosWire, RtosLinterIssue, RtosTaskData, RtosQueueData, RtosMutexData, RtosSharedVarData, RtosIsrData } from '../types';

export interface RtosLintReport {
  issues: RtosLinterIssue[];
  criticalCount: number;
  warningCount: number;
  infoCount: number;
  healthScore: number; // 0 - 100%
}

export function runRtosLinter(nodes: RtosNode[], wires: RtosWire[]): RtosLintReport {
  const issues: RtosLinterIssue[] = [];

  const taskNodes = nodes.filter((n) => n.type === 'task');
  const queueNodes = nodes.filter((n) => n.type === 'queue');
  const mutexNodes = nodes.filter((n) => n.type === 'mutex');
  const sharedVarNodes = nodes.filter((n) => n.type === 'shared_variable');
  const isrNodes = nodes.filter((n) => n.type === 'isr_handler');

  // 1. CHECK: Shared Variables accessed by multiple tasks without Mutex protection (RACE CONDITION)
  sharedVarNodes.forEach((svNode) => {
    const svData = svNode.data as RtosSharedVarData;
    // Find all wires connected to this shared variable
    const connectedWires = wires.filter((w) => w.fromNodeId === svNode.id || w.toNodeId === svNode.id);
    const accessingTaskIds = new Set<string>();

    connectedWires.forEach((w) => {
      const otherId = w.fromNodeId === svNode.id ? w.toNodeId : w.fromNodeId;
      const task = taskNodes.find((t) => t.id === otherId);
      if (task) {
        accessingTaskIds.add(task.id);
      }
    });

    const isProtected = svData.protectedByMutexId != null && mutexNodes.some((m) => m.id === svData.protectedByMutexId);

    if (accessingTaskIds.size >= 2 && !isProtected) {
      const taskNames = Array.from(accessingTaskIds)
        .map((id) => (nodes.find((n) => n.id === id)?.data as RtosTaskData)?.name || id)
        .join(', ');

      issues.push({
        id: `issue_race_${svNode.id}`,
        severity: 'critical',
        category: 'race_condition',
        title: `Kritikus Adatverseny (Race Condition): "${svData.name}"`,
        message: `A(z) "${svData.name}" megosztott változót több taszk (${taskNames}) is eléri egyszerre hardveres Mutex / Szemafor védelem nélkül!`,
        affectedNodeIds: [svNode.id, ...Array.from(accessingTaskIds)],
        autoFixAvailable: true,
        autoFix: {
          type: 'add_mutex_and_protect',
          label: '🔒 Mutex Hozzáadása & Változó Védelme',
          description: `Új "mtx_${svData.name}" Mutex csomópont beszúrása és automatikus összekötése a taszkokkal és a megosztott változóval.`,
          payload: {
            sharedVarId: svNode.id,
            varName: svData.name,
            taskIds: Array.from(accessingTaskIds),
          },
        },
      });
    }
  });

  // 2. CHECK: Task Starvation (Priority > 0 with loopPeriodMs <= 0 or hasYield === false)
  taskNodes.forEach((tNode) => {
    const tData = tNode.data as RtosTaskData;
    if (tData.priority > 0 && (!tData.hasYield || tData.loopPeriodMs <= 0)) {
      issues.push({
        id: `issue_starve_${tNode.id}`,
        severity: 'critical',
        category: 'starvation',
        title: `Taszk Éheztetés (Task Starvation): "${tData.name}"`,
        message: `A(z) "${tData.name}" taszk prioritása (${tData.priority}) magasabb az alapértelmezettnél, de a ciklusa nem tartalmaz időzített átadást (vTaskDelay), így teljesen kiéhezteti az alacsonyabb prioritású és az Idle taszkokat!`,
        affectedNodeIds: [tNode.id],
        autoFixAvailable: true,
        autoFix: {
          type: 'add_yield_delay',
          label: '⏱️ vTaskDelay(10ms) Beillesztése',
          description: `A(z) "${tData.name}" ciklusidejének 10 ms-ra és vTaskDelay átadás beállítására.`,
          payload: {
            taskId: tNode.id,
            delayMs: 10,
          },
        },
      });
    }
  });

  // 3. CHECK: Low Stack Size (< 2048 bytes on 32-bit ESP32)
  taskNodes.forEach((tNode) => {
    const tData = tNode.data as RtosTaskData;
    if (tData.stackSize < 2048) {
      issues.push({
        id: `issue_stack_${tNode.id}`,
        severity: 'warning',
        category: 'stack_overflow',
        title: `Stack Túlcsordulási Kockázat: "${tData.name}" (${tData.stackSize}B)`,
        message: `A(z) "${tData.name}" stack mérete (${tData.stackSize} byte) túl alacsony az ESP32 Xtensa 32-bites architektúrán (ajánlott minimum: 2048 - 4096 byte).`,
        affectedNodeIds: [tNode.id],
        autoFixAvailable: true,
        autoFix: {
          type: 'increase_stack_size',
          label: '📦 Stack Növelése 4096 Byte-ra',
          description: 'A taszk stack méretének felemelése biztonságos 4096 bájtra.',
          payload: {
            taskId: tNode.id,
            newStackSize: 4096,
          },
        },
      });
    }
  });

  // 4. CHECK: Priority Inversion with standard Semaphores
  mutexNodes.forEach((mNode) => {
    const mData = mNode.data as RtosMutexData;
    if (mData.type === 'binary_semaphore' || !mData.priorityInheritance) {
      // Find tasks connected to this mutex
      const connectedTaskIds = wires
        .filter((w) => w.fromNodeId === mNode.id || w.toNodeId === mNode.id)
        .map((w) => (w.fromNodeId === mNode.id ? w.toNodeId : w.fromNodeId))
        .filter((id) => taskNodes.some((t) => t.id === id));

      const priorities = connectedTaskIds
        .map((id) => (nodes.find((n) => n.id === id)?.data as RtosTaskData)?.priority || 0);

      const maxPri = Math.max(...priorities, 0);
      const minPri = Math.min(...priorities, 0);

      if (priorities.length >= 2 && maxPri - minPri >= 2) {
        issues.push({
          id: `issue_pri_inversion_${mNode.id}`,
          severity: 'warning',
          category: 'priority_inversion',
          title: `Prioritás Megfordulás Kockázat: "${mData.name}"`,
          message: `A(z) "${mData.name}" egyszerű szemaforhoz kapcsolódó taszkok prioritása jelentősen eltér (min: ${minPri}, max: ${maxPri}). Prioritás-öröklődés (Priority Inheritance) nélkül a közepes prioritású taszkok blokkolhatják a magas prioritásút!`,
          affectedNodeIds: [mNode.id, ...connectedTaskIds],
          autoFixAvailable: true,
          autoFix: {
            type: 'upgrade_priority_inheritance',
            label: '🛡️ Mutex Frissítése Prioritás-Öröklődéssel',
            description: 'Szemafor átalakítása xSemaphoreCreateMutex() típusra beépített prioritás-öröklődéssel.',
            payload: {
              mutexId: mNode.id,
            },
          },
        },);
      }
    }
  });

  // 5. CHECK: Queue without consumer (Queue Overflow)
  queueNodes.forEach((qNode) => {
    const qData = qNode.data as RtosQueueData;
    const incomingWires = wires.filter((w) => w.toNodeId === qNode.id);
    const outgoingWires = wires.filter((w) => w.fromNodeId === qNode.id);

    if (incomingWires.length > 0 && outgoingWires.length === 0) {
      issues.push({
        id: `issue_queue_consumer_${qNode.id}`,
        severity: 'warning',
        category: 'queue_overflow',
        title: `Nincs Fogyasztó Taszk (Unconsumed Queue): "${qData.name}"`,
        message: `A(z) "${qData.name}" üzenetsorba termelő taszkok írnak, de egyetlen fogyasztó taszk sem olvassa (xQueueReceive hiányzik), ami gyors memóriatúlcsordulást okoz!`,
        affectedNodeIds: [qNode.id, ...incomingWires.map((w) => w.fromNodeId)],
        autoFixAvailable: true,
        autoFix: {
          type: 'connect_queue_consumer',
          label: '📥 Fogyasztó Taszk Bekötése / Létrehozása',
          description: 'Új fogyasztó ProcessTask létrehozása és rákötése az üzenetsorra.',
          payload: {
            queueId: qNode.id,
            queueName: qData.name,
          },
        },
      });
    }
  });

  // 6. CHECK: Dual-Core CPU Load Imbalance
  const core0Tasks = taskNodes.filter((t) => (t.data as RtosTaskData).core === 0);
  const core1Tasks = taskNodes.filter((t) => (t.data as RtosTaskData).core === 1);
  if (taskNodes.length >= 3 && (core0Tasks.length === 0 || core1Tasks.length === 0)) {
    const populatedCore = core0Tasks.length > 0 ? 'Core 0 (PRO CPU)' : 'Core 1 (APP CPU)';
    const emptyCore = core0Tasks.length === 0 ? 'Core 0 (PRO CPU)' : 'Core 1 (APP CPU)';
    issues.push({
      id: 'issue_core_imbalance',
      severity: 'info',
      category: 'core_imbalance',
      title: 'Kétmagos Terhelés Aszimmetria (Dual-Core Imbalance)',
      message: `Minden taszk a(z) ${populatedCore} maghoz van rendelve, míg a(z) ${emptyCore} teljesen kihasználatlan.`,
      affectedNodeIds: taskNodes.map((t) => t.id),
      autoFixAvailable: true,
      autoFix: {
        type: 'rebalance_core',
        label: '⚖️ Terhelés Kiegyensúlyozása (Core 0 & Core 1)',
        description: 'Taszkok egyenletes szétosztása a PRO CPU és APP CPU magok között.',
        payload: {},
      },
    });
  }

  // 7. CHECK: ISR Safety (Using non-ISR API from ISR Node)
  isrNodes.forEach((isrNode) => {
    const isrData = isrNode.data as RtosIsrData;
    if (!isrData.fromIsrApi) {
      issues.push({
        id: `issue_isr_${isrNode.id}`,
        severity: 'critical',
        category: 'isr_safety',
        title: `Nem Biztonságos ISR Hívás: "${isrData.name}"`,
        message: `A megszakításkezelő normál FreeRTOS API-t hív a biztonságos 'FromISR' változat helyett (pl. xQueueSend vs xQueueSendFromISR), ami azonnali Kernel Pánikot és rendszerösszeomlást okoz!`,
        affectedNodeIds: [isrNode.id],
        autoFixAvailable: true,
        autoFix: {
          type: 'enable_from_isr',
          label: '⚡ FromISR és Context Switch Bekapcsolása',
          description: 'FromISR API és portYIELD_FROM_ISR beállítása a megszakításkezelőhöz.',
          payload: {
            isrId: isrNode.id,
          },
        },
      });
    }
  });

  // Calculate Health Score
  const criticalCount = issues.filter((i) => i.severity === 'critical').length;
  const warningCount = issues.filter((i) => i.severity === 'warning').length;
  const infoCount = issues.filter((i) => i.severity === 'info').length;

  let penalty = criticalCount * 35 + warningCount * 15 + infoCount * 5;
  const healthScore = Math.max(0, Math.min(100, 100 - penalty));

  return {
    issues,
    criticalCount,
    warningCount,
    infoCount,
    healthScore,
  };
}

/**
 * Executes automatic intervention (Auto-Fix) on the RTOS graph
 */
export function applyRtosAutoFix(
  nodes: RtosNode[],
  wires: RtosWire[],
  autoFix: RtosLinterIssue['autoFix']
): { newNodes: RtosNode[]; newWires: RtosWire[]; appliedMessage: string } {
  if (!autoFix) return { newNodes: nodes, newWires: wires, appliedMessage: 'Nincs elérhető beavatkozás.' };

  const updatedNodes = [...nodes];
  const updatedWires = [...wires];

  switch (autoFix.type) {
    case 'add_mutex_and_protect': {
      const { sharedVarId, varName, taskIds } = autoFix.payload;
      const targetVar = updatedNodes.find((n) => n.id === sharedVarId);
      if (!targetVar) break;

      const mutexId = `mtx_${Date.now()}`;
      const newMutexNode: RtosNode = {
        id: mutexId,
        type: 'mutex',
        x: targetVar.x,
        y: targetVar.y - 120,
        data: {
          name: `mtx_${varName}`,
          type: 'mutex',
          maxCount: 1,
          currentCount: 1,
          ownerTaskId: null,
          waitingTaskIds: [],
          priorityInheritance: true,
        },
      };

      // Update shared var data
      targetVar.data = {
        ...targetVar.data,
        protectedByMutexId: mutexId,
        accessMode: 'thread_safe',
      } as RtosSharedVarData;

      updatedNodes.push(newMutexNode);

      // Connect mutex to shared variable
      updatedWires.push({
        id: `wire_mtx_${mutexId}_${sharedVarId}`,
        fromNodeId: mutexId,
        fromPort: 'lock',
        toNodeId: sharedVarId,
        toPort: 'write',
        type: 'mutex_guard',
        color: '#38bdf8',
        label: 'Mutex Guard',
        isProtected: true,
      });

      // Connect all accessing tasks to mutex
      (taskIds || []).forEach((tId: string) => {
        if (!updatedWires.some((w) => (w.fromNodeId === tId && w.toNodeId === mutexId) || (w.fromNodeId === mutexId && w.toNodeId === tId))) {
          updatedWires.push({
            id: `wire_t_${tId}_mtx_${mutexId}`,
            fromNodeId: tId,
            fromPort: 'lock',
            toNodeId: mutexId,
            toPort: 'lock',
            type: 'mutex_guard',
            color: '#38bdf8',
            label: 'xSemaphoreTake()',
          });
        }
      });

      return {
        newNodes: updatedNodes,
        newWires: updatedWires,
        appliedMessage: `🔒 Új "mtx_${varName}" Mutex létrehozva és összekapcsolva. Az adatverseny megszűnt!`,
      };
    }

    case 'add_yield_delay': {
      const { taskId, delayMs } = autoFix.payload;
      const targetTask = updatedNodes.find((n) => n.id === taskId);
      if (targetTask) {
        targetTask.data = {
          ...targetTask.data,
          hasYield: true,
          loopPeriodMs: delayMs || 10,
        } as RtosTaskData;
      }
      return {
        newNodes: updatedNodes,
        newWires: updatedWires,
        appliedMessage: `⏱️ vTaskDelay(${delayMs}ms) sikeresen beillesztve a taszkba. A kiéheztetés elhárítva!`,
      };
    }

    case 'increase_stack_size': {
      const { taskId, newStackSize } = autoFix.payload;
      const targetTask = updatedNodes.find((n) => n.id === taskId);
      if (targetTask) {
        targetTask.data = {
          ...targetTask.data,
          stackSize: newStackSize || 4096,
        } as RtosTaskData;
      }
      return {
        newNodes: updatedNodes,
        newWires: updatedWires,
        appliedMessage: `📦 Stack mérete felemelve ${newStackSize || 4096} byte-ra.`,
      };
    }

    case 'upgrade_priority_inheritance': {
      const { mutexId } = autoFix.payload;
      const targetMutex = updatedNodes.find((n) => n.id === mutexId);
      if (targetMutex) {
        targetMutex.data = {
          ...targetMutex.data,
          type: 'mutex',
          priorityInheritance: true,
        } as RtosMutexData;
      }
      return {
        newNodes: updatedNodes,
        newWires: updatedWires,
        appliedMessage: `🛡️ Prioritás-öröklődés (Priority Inheritance) bekapcsolva a Mutexen.`,
      };
    }

    case 'connect_queue_consumer': {
      const { queueId, queueName } = autoFix.payload;
      const targetQueue = updatedNodes.find((n) => n.id === queueId);
      if (!targetQueue) break;

      const consumerTaskId = `task_consumer_${Date.now()}`;
      const consumerNode: RtosNode = {
        id: consumerTaskId,
        type: 'task',
        x: targetQueue.x + 240,
        y: targetQueue.y,
        data: {
          name: `${queueName}Consumer`,
          core: 1,
          priority: 2,
          stackSize: 3072,
          loopPeriodMs: 20,
          hasYield: true,
          state: 'READY',
          cpuPercent: 12,
          directNotifyValue: 0,
          notifyState: 'NOT_WAITING',
          description: `Fogyasztó taszk a(z) ${queueName} sorhoz`,
        } as RtosTaskData,
      };

      updatedNodes.push(consumerNode);
      updatedWires.push({
        id: `wire_q_${queueId}_c_${consumerTaskId}`,
        fromNodeId: queueId,
        fromPort: 'consume',
        toNodeId: consumerTaskId,
        toPort: 'in',
        type: 'data_queue',
        color: '#4ade80',
        label: 'xQueueReceive()',
      });

      return {
        newNodes: updatedNodes,
        newWires: updatedWires,
        appliedMessage: `📥 Új "${queueName}Consumer" fogyasztó taszk létrehozva és rákötve az üzenetsorra.`,
      };
    }

    case 'rebalance_core': {
      const tasks = updatedNodes.filter((n) => n.type === 'task');
      tasks.forEach((t, index) => {
        const assignedCore: 0 | 1 = index % 2 === 0 ? 0 : 1;
        t.data = {
          ...t.data,
          core: assignedCore,
        } as RtosTaskData;
      });
      return {
        newNodes: updatedNodes,
        newWires: updatedWires,
        appliedMessage: `⚖️ Taszkok sikeresen elosztva a PRO CPU (Core 0) és APP CPU (Core 1) magok között!`,
      };
    }

    case 'enable_from_isr': {
      const { isrId } = autoFix.payload;
      const targetIsr = updatedNodes.find((n) => n.id === isrId);
      if (targetIsr) {
        targetIsr.data = {
          ...targetIsr.data,
          fromIsrApi: true,
          yieldFromIsr: true,
        } as RtosIsrData;
      }
      return {
        newNodes: updatedNodes,
        newWires: updatedWires,
        appliedMessage: `⚡ FromISR hívások és portYIELD_FROM_ISR aktívak a megszakításban.`,
      };
    }

    default:
      return { newNodes: nodes, newWires: wires, appliedMessage: 'Nem támogatott művelet.' };
  }

  return { newNodes: updatedNodes, newWires: updatedWires, appliedMessage: 'Módosítások alkalmazva.' };
}
