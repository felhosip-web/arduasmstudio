/**
 * (c) 2026 AI Studio - Dedicated FreeRTOS Node & Variable Inspector Panel
 * Provides property editing, queue message buffer controls, and dual-core load monitoring.
 */

import React, { useState } from 'react';
import {
  Cpu,
  Layers,
  Lock,
  Database,
  Zap,
  Clock,
  Flag,
  Radio,
  Sliders,
  Send,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Activity,
} from 'lucide-react';
import {
  RtosNode,
  RtosTaskData,
  RtosQueueData,
  RtosMutexData,
  RtosSharedVarData,
  RtosDirectVarData,
  RtosEventGroupData,
  RtosTimerData,
  RtosIsrData,
} from '../../types';

interface RtosInspectorPanelProps {
  selectedNode: RtosNode | null;
  allNodes: RtosNode[];
  onUpdateNodeData: (nodeId: string, data: any) => void;
  cpu0Load: number;
  cpu1Load: number;
  freeHeapBytes: number;
  tickCount: number;
}

export const RtosInspectorPanel: React.FC<RtosInspectorPanelProps> = ({
  selectedNode,
  allNodes,
  onUpdateNodeData,
  cpu0Load,
  cpu1Load,
  freeHeapBytes,
  tickCount,
}) => {
  const [newMsgText, setNewMsgText] = useState('');

  if (!selectedNode) {
    return (
      <aside className="w-80 flex flex-col bg-[#12141A] border-l border-[#2A2D35] h-full overflow-hidden select-none">
        <div className="p-3 border-b border-[#2A2D35] bg-[#0F1115]">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-bold font-mono uppercase tracking-wider text-slate-200">
              FreeRTOS Inspektori
            </span>
          </div>
        </div>

        {/* Dual-Core Hardware Load Meters */}
        <div className="p-3 space-y-3 border-b border-[#2A2D35] bg-[#161920]">
          <div className="text-[10px] font-mono font-bold uppercase text-slate-400 flex items-center justify-between">
            <span>Kétmagos Terhelés</span>
            <span className="text-cyan-400">Xtensa 240MHz</span>
          </div>

          {/* Core 0 (PRO CPU) */}
          <div>
            <div className="flex justify-between text-[11px] font-mono mb-1">
              <span className="text-slate-300">Core 0 (PRO CPU):</span>
              <span className="text-cyan-400 font-bold">{cpu0Load}%</span>
            </div>
            <div className="w-full bg-slate-900 rounded h-2 overflow-hidden border border-slate-800">
              <div
                className={`h-full transition-all duration-300 ${
                  cpu0Load > 85 ? 'bg-rose-500' : cpu0Load > 50 ? 'bg-amber-400' : 'bg-cyan-400'
                }`}
                style={{ width: `${Math.min(100, cpu0Load)}%` }}
              />
            </div>
          </div>

          {/* Core 1 (APP CPU) */}
          <div>
            <div className="flex justify-between text-[11px] font-mono mb-1">
              <span className="text-slate-300">Core 1 (APP CPU):</span>
              <span className="text-emerald-400 font-bold">{cpu1Load}%</span>
            </div>
            <div className="w-full bg-slate-900 rounded h-2 overflow-hidden border border-slate-800">
              <div
                className={`h-full transition-all duration-300 ${
                  cpu1Load > 85 ? 'bg-rose-500' : cpu1Load > 50 ? 'bg-amber-400' : 'bg-emerald-400'
                }`}
                style={{ width: `${Math.min(100, cpu1Load)}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[10px] font-mono pt-1">
            <div className="bg-[#0F1115] p-1.5 rounded border border-slate-800">
              <span className="text-slate-400 block">Szabad Heap:</span>
              <span className="text-slate-200 font-bold">{(freeHeapBytes / 1024).toFixed(1)} KB</span>
            </div>
            <div className="bg-[#0F1115] p-1.5 rounded border border-slate-800">
              <span className="text-slate-400 block">RTOS Tick:</span>
              <span className="text-cyan-400 font-bold">{tickCount}</span>
            </div>
          </div>
        </div>

        {/* Empty State Prompt */}
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-slate-500">
          <Sliders className="w-8 h-8 text-slate-600 mb-2" />
          <p className="text-xs font-mono font-bold text-slate-400 mb-1">Nincs elem kiválasztva</p>
          <p className="text-[11px] leading-relaxed">
            Kattints bármelyik taszkra, üzenetsorra, mutexre vagy változóra a tulajdonságok szerkesztéséhez.
          </p>
        </div>
      </aside>
    );
  }

  const { type, data } = selectedNode;

  // Generic updater helper
  const updateData = (field: string, value: any) => {
    onUpdateNodeData(selectedNode.id, {
      ...data,
      [field]: value,
    });
  };

  // Render Inspector Form by Node Type
  const renderEditor = () => {
    if (type === 'task') {
      const tData = data as RtosTaskData;
      return (
        <div className="space-y-3 text-xs font-mono">
          <div>
            <label className="block text-slate-400 text-[10px] uppercase font-bold mb-1">Taszk Név</label>
            <input
              type="text"
              value={tData.name}
              onChange={(e) => updateData('name', e.target.value)}
              className="w-full bg-[#0F1115] border border-slate-700 rounded px-2.5 py-1.5 text-slate-100 font-mono text-xs focus:border-cyan-400 focus:outline-hidden"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-slate-400 text-[10px] uppercase font-bold mb-1">Cél Mag (Core)</label>
              <select
                value={tData.core}
                onChange={(e) => updateData('core', parseInt(e.target.value, 10))}
                className="w-full bg-[#0F1115] border border-slate-700 rounded px-2 py-1.5 text-slate-100 text-xs focus:border-cyan-400 focus:outline-hidden"
              >
                <option value={0}>Core 0 (PRO CPU)</option>
                <option value={1}>Core 1 (APP CPU)</option>
                <option value={-1}>Bármelyik (-1)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-400 text-[10px] uppercase font-bold mb-1">
                Prioritás: <span className="text-cyan-400 font-bold">{tData.priority}</span>
              </label>
              <input
                type="range"
                min="0"
                max="24"
                value={tData.priority}
                onChange={(e) => updateData('priority', parseInt(e.target.value, 10))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-slate-400 text-[10px] uppercase font-bold mb-1">Stack (Byte)</label>
              <input
                type="number"
                step="512"
                min="1024"
                max="16384"
                value={tData.stackSize}
                onChange={(e) => updateData('stackSize', parseInt(e.target.value, 10) || 2048)}
                className="w-full bg-[#0F1115] border border-slate-700 rounded px-2 py-1.5 text-slate-100 text-xs focus:border-cyan-400 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-slate-400 text-[10px] uppercase font-bold mb-1">Ciklusidő (ms)</label>
              <input
                type="number"
                min="0"
                max="5000"
                value={tData.loopPeriodMs}
                onChange={(e) => updateData('loopPeriodMs', parseInt(e.target.value, 10) || 0)}
                className="w-full bg-[#0F1115] border border-slate-700 rounded px-2 py-1.5 text-slate-100 text-xs focus:border-cyan-400 focus:outline-hidden"
              />
            </div>
          </div>

          <div className="flex items-center justify-between p-2 rounded bg-[#0F1115] border border-slate-800">
            <label className="text-slate-300 text-[11px] cursor-pointer">vTaskDelay átadás aktív</label>
            <input
              type="checkbox"
              checked={tData.hasYield}
              onChange={(e) => updateData('hasYield', e.target.checked)}
              className="w-4 h-4 accent-cyan-400 rounded cursor-pointer"
            />
          </div>

          {/* Task Dependency Manager */}
          <div className="p-2.5 rounded bg-[#0F1115] border border-purple-900/60 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-purple-300 font-bold text-[11px]">
                <Layers className="w-3.5 h-3.5 text-purple-400" />
                <span>🔗 Taszk Függőség (Dependencies)</span>
              </div>
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-950 text-purple-300 border border-purple-800">
                {(tData.dependsOnTaskIds || []).length} előfeltétel
              </span>
            </div>

            <p className="text-[10px] text-slate-400 leading-tight">
              A taszk blokkolt (BLOCKED) állapotban várakozik, és csak akkor indul el, miután az előzmény taszk lefutott.
            </p>

            {/* List of current predecessor dependencies */}
            {(tData.dependsOnTaskIds || []).length > 0 && (
              <div className="space-y-1.5 pt-1">
                {tData.dependsOnTaskIds!.map((depId) => {
                  const depNode = allNodes.find((n) => n.id === depId);
                  const depName = depNode ? (depNode.data as RtosTaskData).name : depId;
                  return (
                    <div
                      key={depId}
                      className="flex items-center justify-between p-1.5 rounded bg-[#161920] border border-purple-500/40 text-[11px]"
                    >
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="w-2 h-2 rounded-full bg-purple-400 shrink-0" />
                        <span className="text-slate-200 font-bold truncate">
                          Indulás: {depName} után
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const updated = (tData.dependsOnTaskIds || []).filter((id) => id !== depId);
                          updateData('dependsOnTaskIds', updated);
                        }}
                        className="text-slate-400 hover:text-rose-400 p-0.5 rounded hover:bg-rose-950/50 cursor-pointer shrink-0"
                        title="Függőség törlése"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Add new predecessor task dropdown */}
            {(() => {
              const otherTasks = allNodes.filter(
                (n) => n.type === 'task' && n.id !== selectedNode.id && !(tData.dependsOnTaskIds || []).includes(n.id)
              );

              if (otherTasks.length === 0) return null;

              return (
                <div className="pt-1">
                  <label className="block text-slate-400 text-[10px] uppercase font-bold mb-1">
                    + Előzmény Taszk Hozzáadása:
                  </label>
                  <select
                    value=""
                    onChange={(e) => {
                      if (!e.target.value) return;
                      const current = tData.dependsOnTaskIds || [];
                      updateData('dependsOnTaskIds', [...current, e.target.value]);
                      if (!tData.dependencyType) {
                        updateData('dependencyType', 'task_notify');
                      }
                    }}
                    className="w-full bg-[#161920] border border-purple-700/60 rounded px-2 py-1 text-purple-200 text-xs focus:border-purple-400 focus:outline-hidden"
                  >
                    <option value="">-- Válassz előzmény taszkot --</option>
                    {otherTasks.map((tNode) => (
                      <option key={tNode.id} value={tNode.id}>
                        {(tNode.data as RtosTaskData).name} (Core {(tNode.data as RtosTaskData).core})
                      </option>
                    ))}
                  </select>
                </div>
              );
            })()}

            {/* Dependency Synchronization Mechanism */}
            {(tData.dependsOnTaskIds || []).length > 0 && (
              <div className="pt-1">
                <label className="block text-slate-400 text-[10px] uppercase font-bold mb-1">
                  Szinkronizáció Típusa:
                </label>
                <select
                  value={tData.dependencyType || 'task_notify'}
                  onChange={(e) => updateData('dependencyType', e.target.value)}
                  className="w-full bg-[#161920] border border-slate-700 rounded px-2 py-1 text-slate-200 text-xs focus:border-purple-400 focus:outline-hidden"
                >
                  <option value="task_notify">xTaskNotifyGive() - Közvetlen értesítés</option>
                  <option value="binary_semaphore">xSemaphoreGive() - Bináris Szemafor</option>
                </select>
              </div>
            )}
          </div>

          <div>
            <label className="block text-slate-400 text-[10px] uppercase font-bold mb-1">Leírás / Megjegyzés</label>
            <textarea
              rows={2}
              value={tData.description || ''}
              onChange={(e) => updateData('description', e.target.value)}
              placeholder="Taszk feladata és funkciója..."
              className="w-full bg-[#0F1115] border border-slate-700 rounded px-2.5 py-1.5 text-slate-100 text-[11px] focus:border-cyan-400 focus:outline-hidden"
            />
          </div>
        </div>
      );
    }

    if (type === 'queue') {
      const qData = data as RtosQueueData;
      const mutexNodes = allNodes.filter((n) => n.type === 'mutex');

      const handlePushTestMsg = () => {
        if (!newMsgText.trim()) return;
        const currentMsgs = qData.messages || [];
        if (currentMsgs.length >= qData.length) return;

        let parsedVal: any = newMsgText;
        try {
          parsedVal = JSON.parse(newMsgText);
        } catch {}

        updateData('messages', [...currentMsgs, parsedVal]);
        setNewMsgText('');
      };

      const handlePopMsg = () => {
        const currentMsgs = qData.messages || [];
        if (currentMsgs.length === 0) return;
        updateData('messages', currentMsgs.slice(1));
      };

      return (
        <div className="space-y-3 text-xs font-mono">
          <div>
            <label className="block text-slate-400 text-[10px] uppercase font-bold mb-1">Queue Név</label>
            <input
              type="text"
              value={qData.name}
              onChange={(e) => updateData('name', e.target.value)}
              className="w-full bg-[#0F1115] border border-slate-700 rounded px-2.5 py-1.5 text-slate-100 text-xs focus:border-emerald-400 focus:outline-hidden"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-slate-400 text-[10px] uppercase font-bold mb-1">Kapacitás (Slotok)</label>
              <input
                type="number"
                min="1"
                max="64"
                value={qData.length}
                onChange={(e) => updateData('length', parseInt(e.target.value, 10) || 5)}
                className="w-full bg-[#0F1115] border border-slate-700 rounded px-2 py-1.5 text-slate-100 text-xs focus:border-emerald-400 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-slate-400 text-[10px] uppercase font-bold mb-1">Elem Típus</label>
              <input
                type="text"
                value={qData.itemType}
                onChange={(e) => updateData('itemType', e.target.value)}
                className="w-full bg-[#0F1115] border border-slate-700 rounded px-2 py-1.5 text-slate-100 text-xs focus:border-emerald-400 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Live Message Queue Controls */}
          <div className="p-2.5 rounded bg-[#0F1115] border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-slate-400 uppercase font-bold">Puffer Tartalom</span>
              <span className="text-emerald-400 font-bold">
                {qData.messages?.length || 0} / {qData.length}
              </span>
            </div>

            <div className="flex gap-1.5">
              <input
                type="text"
                placeholder='pl. 24.5 vagy {"val": 10}'
                value={newMsgText}
                onChange={(e) => setNewMsgText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handlePushTestMsg()}
                className="flex-1 bg-[#161920] border border-slate-700 rounded px-2 py-1 text-slate-100 text-[11px] focus:outline-hidden focus:border-emerald-400"
              />
              <button
                type="button"
                onClick={handlePushTestMsg}
                disabled={(qData.messages?.length || 0) >= qData.length}
                className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-black font-bold text-[10px] rounded cursor-pointer"
              >
                Push
              </button>
              <button
                type="button"
                onClick={handlePopMsg}
                disabled={(qData.messages?.length || 0) === 0}
                className="px-2 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 text-[10px] rounded cursor-pointer"
              >
                Pop
              </button>
            </div>

            {/* List of current messages in FIFO order */}
            <div className="max-h-28 overflow-y-auto space-y-1">
              {qData.messages?.map((msg, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between bg-[#161920] px-2 py-1 rounded text-[10px] text-emerald-300 font-mono"
                >
                  <span className="text-slate-500">#{idx + 1}</span>
                  <span className="truncate max-w-[170px]">{JSON.stringify(msg)}</span>
                </div>
              ))}
              {(!qData.messages || qData.messages.length === 0) && (
                <div className="text-[10px] text-slate-500 text-center py-1">A sor jelenleg üres</div>
              )}
            </div>
          </div>
        </div>
      );
    }

    if (type === 'mutex') {
      const mData = data as RtosMutexData;
      return (
        <div className="space-y-3 text-xs font-mono">
          <div>
            <label className="block text-slate-400 text-[10px] uppercase font-bold mb-1">Mutex / Szemafor Név</label>
            <input
              type="text"
              value={mData.name}
              onChange={(e) => updateData('name', e.target.value)}
              className="w-full bg-[#0F1115] border border-slate-700 rounded px-2.5 py-1.5 text-slate-100 text-xs focus:border-sky-400 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-slate-400 text-[10px] uppercase font-bold mb-1">Típus</label>
            <select
              value={mData.type}
              onChange={(e) => updateData('type', e.target.value)}
              className="w-full bg-[#0F1115] border border-slate-700 rounded px-2 py-1.5 text-slate-100 text-xs focus:border-sky-400 focus:outline-hidden"
            >
              <option value="mutex">xSemaphoreCreateMutex() - Szabványos Mutex</option>
              <option value="recursive_mutex">xSemaphoreCreateRecursiveMutex() - Rekurzív Mutex</option>
              <option value="binary_semaphore">xSemaphoreCreateBinary() - Bináris Szemafor</option>
              <option value="counting_semaphore">xSemaphoreCreateCounting() - Számláló Szemafor</option>
            </select>
          </div>

          <div className="flex items-center justify-between p-2 rounded bg-[#0F1115] border border-slate-800">
            <div>
              <div className="text-slate-200 text-[11px] font-bold">Prioritás-öröklődés (Inheritance)</div>
              <div className="text-[9px] text-slate-400">Megvédi a rendszert a prioritás megfordulástól</div>
            </div>
            <input
              type="checkbox"
              checked={mData.priorityInheritance}
              onChange={(e) => updateData('priorityInheritance', e.target.checked)}
              className="w-4 h-4 accent-sky-400 rounded cursor-pointer"
            />
          </div>
        </div>
      );
    }

    if (type === 'shared_variable') {
      const svData = data as RtosSharedVarData;
      const mutexNodes = allNodes.filter((n) => n.type === 'mutex');

      return (
        <div className="space-y-3 text-xs font-mono">
          <div>
            <label className="block text-slate-400 text-[10px] uppercase font-bold mb-1">Megosztott Változó Név</label>
            <input
              type="text"
              value={svData.name}
              onChange={(e) => updateData('name', e.target.value)}
              className="w-full bg-[#0F1115] border border-slate-700 rounded px-2.5 py-1.5 text-slate-100 text-xs focus:border-amber-400 focus:outline-hidden"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-slate-400 text-[10px] uppercase font-bold mb-1">Adattípus</label>
              <select
                value={svData.dataType}
                onChange={(e) => updateData('dataType', e.target.value)}
                className="w-full bg-[#0F1115] border border-slate-700 rounded px-2 py-1.5 text-slate-100 text-xs focus:border-amber-400 focus:outline-hidden"
              >
                <option value="int32_t">int32_t (32-bit előjeles)</option>
                <option value="float">float (Lebegőpontos)</option>
                <option value="uint8_t">uint8_t (Bájt)</option>
                <option value="bool">bool (Logikai)</option>
                <option value="char[32]">char[32] (Karaktertömb)</option>
                <option value="struct">struct (Egyedi Struktúra)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-400 text-[10px] uppercase font-bold mb-1">Kezdőérték</label>
              <input
                type="text"
                value={typeof svData.initialValue === 'object' ? JSON.stringify(svData.initialValue) : String(svData.initialValue)}
                onChange={(e) => {
                  let val: any = e.target.value;
                  try {
                    val = JSON.parse(e.target.value);
                  } catch {}
                  updateData('initialValue', val);
                  updateData('currentValue', val);
                }}
                className="w-full bg-[#0F1115] border border-slate-700 rounded px-2 py-1.5 text-slate-100 text-xs focus:border-amber-400 focus:outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-400 text-[10px] uppercase font-bold mb-1">
              Védő Mutex (Mutex Guard)
            </label>
            <select
              value={svData.protectedByMutexId || ''}
              onChange={(e) => {
                const val = e.target.value || null;
                updateData('protectedByMutexId', val);
                updateData('accessMode', val ? 'thread_safe' : 'unprotected_risk');
              }}
              className="w-full bg-[#0F1115] border border-slate-700 rounded px-2 py-1.5 text-slate-100 text-xs focus:border-amber-400 focus:outline-hidden"
            >
              <option value="">⚠️ Nincs védve (Adatverseny kockázat!)</option>
              {mutexNodes.map((m) => (
                <option key={m.id} value={m.id}>
                  🔒 {(m.data as RtosMutexData).name}
                </option>
              ))}
            </select>
          </div>
        </div>
      );
    }

    if (type === 'direct_variable') {
      const dvData = data as RtosDirectVarData;
      const taskNodes = allNodes.filter((n) => n.type === 'task');

      return (
        <div className="space-y-3 text-xs font-mono">
          <div>
            <label className="block text-slate-400 text-[10px] uppercase font-bold mb-1">Értesítés Neve</label>
            <input
              type="text"
              value={dvData.name}
              onChange={(e) => updateData('name', e.target.value)}
              className="w-full bg-[#0F1115] border border-slate-700 rounded px-2.5 py-1.5 text-slate-100 text-xs focus:border-purple-400 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-slate-400 text-[10px] uppercase font-bold mb-1">Cél Taszk</label>
            <select
              value={dvData.targetTaskId}
              onChange={(e) => updateData('targetTaskId', e.target.value)}
              className="w-full bg-[#0F1115] border border-slate-700 rounded px-2 py-1.5 text-slate-100 text-xs focus:border-purple-400 focus:outline-hidden"
            >
              <option value="">Válassz taszkot...</option>
              {taskNodes.map((t) => (
                <option key={t.id} value={t.id}>
                  ⚡ {(t.data as RtosTaskData).name}
                </option>
              ))}
            </select>
          </div>
        </div>
      );
    }

    if (type === 'software_timer') {
      const tmData = data as RtosTimerData;
      return (
        <div className="space-y-3 text-xs font-mono">
          <div>
            <label className="block text-slate-400 text-[10px] uppercase font-bold mb-1">Időzítő Név</label>
            <input
              type="text"
              value={tmData.name}
              onChange={(e) => updateData('name', e.target.value)}
              className="w-full bg-[#0F1115] border border-slate-700 rounded px-2.5 py-1.5 text-slate-100 text-xs focus:border-blue-400 focus:outline-hidden"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-slate-400 text-[10px] uppercase font-bold mb-1">Periódus (ms)</label>
              <input
                type="number"
                min="1"
                max="60000"
                value={tmData.periodMs}
                onChange={(e) => updateData('periodMs', parseInt(e.target.value, 10) || 100)}
                className="w-full bg-[#0F1115] border border-slate-700 rounded px-2 py-1.5 text-slate-100 text-xs focus:border-blue-400 focus:outline-hidden"
              />
            </div>

            <div className="flex items-center pt-4">
              <label className="flex items-center gap-2 text-slate-300 text-[11px] cursor-pointer">
                <input
                  type="checkbox"
                  checked={tmData.autoReload}
                  onChange={(e) => updateData('autoReload', e.target.checked)}
                  className="w-4 h-4 accent-blue-400 rounded cursor-pointer"
                />
                <span>Auto-Reload</span>
              </label>
            </div>
          </div>
        </div>
      );
    }

    if (type === 'isr_handler') {
      const isrData = data as RtosIsrData;
      return (
        <div className="space-y-3 text-xs font-mono">
          <div>
            <label className="block text-slate-400 text-[10px] uppercase font-bold mb-1">ISR Név</label>
            <input
              type="text"
              value={isrData.name}
              onChange={(e) => updateData('name', e.target.value)}
              className="w-full bg-[#0F1115] border border-slate-700 rounded px-2.5 py-1.5 text-slate-100 text-xs focus:border-rose-400 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-slate-400 text-[10px] uppercase font-bold mb-1">Megszakítási Forrás (IRQ)</label>
            <input
              type="text"
              value={isrData.irqSource}
              onChange={(e) => updateData('irqSource', e.target.value)}
              className="w-full bg-[#0F1115] border border-slate-700 rounded px-2.5 py-1.5 text-slate-100 text-xs focus:border-rose-400 focus:outline-hidden"
            />
          </div>

          <div className="space-y-1.5 p-2 rounded bg-[#0F1115] border border-slate-800">
            <label className="flex items-center justify-between text-slate-300 text-[11px] cursor-pointer">
              <span>FromISR API hívások engedélyezve</span>
              <input
                type="checkbox"
                checked={isrData.fromIsrApi}
                onChange={(e) => updateData('fromIsrApi', e.target.checked)}
                className="w-4 h-4 accent-rose-400 rounded cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between text-slate-300 text-[11px] cursor-pointer">
              <span>portYIELD_FROM_ISR() környezetváltás</span>
              <input
                type="checkbox"
                checked={isrData.yieldFromIsr}
                onChange={(e) => updateData('yieldFromIsr', e.target.checked)}
                className="w-4 h-4 accent-rose-400 rounded cursor-pointer"
              />
            </label>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <aside className="w-80 flex flex-col bg-[#12141A] border-l border-[#2A2D35] h-full overflow-hidden select-none">
      {/* Inspector Header */}
      <div className="p-3 border-b border-[#2A2D35] bg-[#0F1115] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-bold font-mono uppercase tracking-wider text-slate-200">
            Tulajdonságok: {selectedNode.type}
          </span>
        </div>
      </div>

      {/* Editor Body */}
      <div className="flex-1 overflow-y-auto p-3">{renderEditor()}</div>
    </aside>
  );
};
