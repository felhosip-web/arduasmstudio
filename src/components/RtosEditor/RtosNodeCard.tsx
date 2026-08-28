/**
 * (c) 2026 AI Studio - Interactive FreeRTOS Node Card Component
 * Renders individual RTOS Architecture nodes on canvas with live state badges,
 * connection ports, and interactive editing.
 */

import React from 'react';
import {
  Cpu,
  Layers,
  Lock,
  Database,
  Zap,
  Clock,
  Flag,
  Radio,
  Trash2,
  Settings,
  AlertTriangle,
  CheckCircle2,
  Activity,
  Play,
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
  RtosPortType,
} from '../../types';

interface RtosNodeCardProps {
  node: RtosNode;
  isSelected: boolean;
  onSelect: (nodeId: string) => void;
  onDelete: (nodeId: string) => void;
  onOpenSettings: (nodeId: string) => void;
  onPortMouseDown: (e: React.MouseEvent, nodeId: string, portType: RtosPortType, isOutput: boolean) => void;
  onPortMouseUp: (e: React.MouseEvent, nodeId: string, portType: RtosPortType, isOutput: boolean) => void;
  isConnectingWire: boolean;
}

export const RtosNodeCard: React.FC<RtosNodeCardProps> = ({
  node,
  isSelected,
  onSelect,
  onDelete,
  onOpenSettings,
  onPortMouseDown,
  onPortMouseUp,
  isConnectingWire,
}) => {
  const { type, data } = node;

  // Color scheme and icon by node type
  let headerColor = 'border-slate-700 bg-slate-900/90 text-slate-200';
  let badgeColor = 'bg-slate-800 text-slate-300 border-slate-700';
  let icon = <Cpu className="w-4 h-4 text-cyan-400" />;
  let nodeTitle = 'Node';

  if (type === 'task') {
    const tData = data as RtosTaskData;
    nodeTitle = tData.name;
    icon = <Cpu className="w-4 h-4 text-cyan-400" />;
    headerColor = 'border-cyan-500/50 bg-cyan-950/40 text-cyan-200';
    badgeColor = 'bg-cyan-900/60 text-cyan-300 border-cyan-700/60';
  } else if (type === 'queue') {
    const qData = data as RtosQueueData;
    nodeTitle = qData.name;
    icon = <Layers className="w-4 h-4 text-emerald-400" />;
    headerColor = 'border-emerald-500/50 bg-emerald-950/40 text-emerald-200';
    badgeColor = 'bg-emerald-900/60 text-emerald-300 border-emerald-700/60';
  } else if (type === 'mutex') {
    const mData = data as RtosMutexData;
    nodeTitle = mData.name;
    icon = <Lock className="w-4 h-4 text-sky-400" />;
    headerColor = 'border-sky-500/50 bg-sky-950/40 text-sky-200';
    badgeColor = 'bg-sky-900/60 text-sky-300 border-sky-700/60';
  } else if (type === 'shared_variable') {
    const svData = data as RtosSharedVarData;
    nodeTitle = `g_${svData.name}`;
    icon = <Database className="w-4 h-4 text-amber-400" />;
    headerColor = 'border-amber-500/50 bg-amber-950/40 text-amber-200';
    badgeColor = 'bg-amber-900/60 text-amber-300 border-amber-700/60';
  } else if (type === 'direct_variable') {
    const dvData = data as RtosDirectVarData;
    nodeTitle = dvData.name;
    icon = <Zap className="w-4 h-4 text-purple-400" />;
    headerColor = 'border-purple-500/50 bg-purple-950/40 text-purple-200';
    badgeColor = 'bg-purple-900/60 text-purple-300 border-purple-700/60';
  } else if (type === 'software_timer') {
    const tmData = data as RtosTimerData;
    nodeTitle = tmData.name;
    icon = <Clock className="w-4 h-4 text-blue-400" />;
    headerColor = 'border-blue-500/50 bg-blue-950/40 text-blue-200';
    badgeColor = 'bg-blue-900/60 text-blue-300 border-blue-700/60';
  } else if (type === 'event_group') {
    const egData = data as RtosEventGroupData;
    nodeTitle = egData.name;
    icon = <Flag className="w-4 h-4 text-indigo-400" />;
    headerColor = 'border-indigo-500/50 bg-indigo-950/40 text-indigo-200';
    badgeColor = 'bg-indigo-900/60 text-indigo-300 border-indigo-700/60';
  } else if (type === 'isr_handler') {
    const isrData = data as RtosIsrData;
    nodeTitle = `isr_${isrData.name}`;
    icon = <Radio className="w-4 h-4 text-rose-400" />;
    headerColor = 'border-rose-500/50 bg-rose-950/40 text-rose-200';
    badgeColor = 'bg-rose-900/60 text-rose-300 border-rose-700/60';
  }

  // Render specific body content for each node type
  const renderBodyContent = () => {
    if (type === 'task') {
      const tData = data as RtosTaskData;
      const isRunning = tData.state === 'RUNNING';
      const isBlocked = tData.state === 'BLOCKED';
      const isStarving = tData.state === 'STARVING';

      return (
        <div className="space-y-2 text-[11px] font-mono">
          {/* State & Core Badges */}
          <div className="flex items-center justify-between gap-1">
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border flex items-center gap-1 ${
                isRunning
                  ? 'bg-emerald-950 text-emerald-300 border-emerald-500 animate-pulse'
                  : isBlocked
                  ? 'bg-amber-950 text-amber-300 border-amber-500'
                  : isStarving
                  ? 'bg-rose-950 text-rose-300 border-rose-500 animate-bounce'
                  : 'bg-slate-800 text-slate-300 border-slate-700'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${isRunning ? 'bg-emerald-400' : isBlocked ? 'bg-amber-400' : 'bg-slate-400'}`} />
              {tData.state}
            </span>

            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-900 text-cyan-300 border border-cyan-800/40">
              {tData.core === 0 ? 'Core 0 (PRO)' : tData.core === 1 ? 'Core 1 (APP)' : 'Bármelyik'}
            </span>
          </div>

          {/* Priority & Stack & Period stats */}
          <div className="grid grid-cols-2 gap-1.5 bg-[#0F1115] p-1.5 rounded border border-slate-800">
            <div>
              <span className="text-[9px] text-slate-400 uppercase">Prioritás:</span>
              <div className="text-slate-200 font-bold">{tData.priority} / 24</div>
            </div>
            <div>
              <span className="text-[9px] text-slate-400 uppercase">Stack:</span>
              <div className="text-slate-200 font-bold">{tData.stackSize} B</div>
            </div>
            <div>
              <span className="text-[9px] text-slate-400 uppercase">Periódus:</span>
              <div className="text-slate-200 font-bold">{tData.loopPeriodMs} ms</div>
            </div>
            <div>
              <span className="text-[9px] text-slate-400 uppercase">CPU Használat:</span>
              <div className="text-cyan-400 font-bold">{tData.cpuPercent || 0}%</div>
            </div>
          </div>
        </div>
      );
    }

    if (type === 'queue') {
      const qData = data as RtosQueueData;
      const fillPercentage = Math.round(((qData.messages?.length || 0) / qData.length) * 100);

      return (
        <div className="space-y-2 text-[11px] font-mono">
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-slate-400">Típus:</span>
            <span className="text-emerald-300 font-bold truncate max-w-[120px]">{qData.itemType}</span>
          </div>

          {/* Live Message Capacity Gauge */}
          <div>
            <div className="flex items-center justify-between text-[10px] mb-1">
              <span className="text-slate-400">Üzenet puffer:</span>
              <span className="text-emerald-400 font-bold">
                {qData.messages?.length || 0} / {qData.length} slot ({fillPercentage}%)
              </span>
            </div>
            <div className="w-full bg-slate-900 rounded h-2 overflow-hidden border border-slate-800">
              <div
                className={`h-full transition-all duration-300 ${
                  fillPercentage > 80 ? 'bg-rose-500' : fillPercentage > 40 ? 'bg-amber-400' : 'bg-emerald-400'
                }`}
                style={{ width: `${Math.min(100, fillPercentage)}%` }}
              />
            </div>
          </div>

          {/* Quick Message preview */}
          {qData.messages && qData.messages.length > 0 && (
            <div className="text-[9px] text-slate-400 bg-[#0F1115] p-1 rounded border border-slate-800 truncate">
              Legutóbbi: {JSON.stringify(qData.messages[qData.messages.length - 1])}
            </div>
          )}
        </div>
      );
    }

    if (type === 'mutex') {
      const mData = data as RtosMutexData;
      const isLocked = mData.currentCount === 0 || mData.ownerTaskId != null;

      return (
        <div className="space-y-1.5 text-[11px] font-mono">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-400">Típus:</span>
            <span className="text-sky-300 text-[10px] font-bold uppercase">{mData.type}</span>
          </div>

          <div className="flex items-center justify-between bg-[#0F1115] p-1.5 rounded border border-slate-800">
            <span className="text-[10px] text-slate-400">Állapot:</span>
            <span
              className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                isLocked
                  ? 'bg-rose-950 text-rose-300 border-rose-600'
                  : 'bg-emerald-950 text-emerald-300 border-emerald-600'
              }`}
            >
              {isLocked ? '🔒 Zárolva (Locked)' : '🔓 Szabad (Unlocked)'}
            </span>
          </div>

          {mData.priorityInheritance && (
            <div className="text-[9px] text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              <span>Prioritás-öröklődés aktív</span>
            </div>
          )}
        </div>
      );
    }

    if (type === 'shared_variable') {
      const svData = data as RtosSharedVarData;
      const isProtected = svData.protectedByMutexId != null;

      return (
        <div className="space-y-1.5 text-[11px] font-mono">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-400">Adattípus:</span>
            <span className="text-amber-300 text-[10px] font-bold">{svData.dataType}</span>
          </div>

          <div className="bg-[#0F1115] p-1.5 rounded border border-slate-800">
            <div className="text-[9px] text-slate-400 mb-0.5">Jelenlegi Érték:</div>
            <div className="text-amber-200 font-bold truncate text-[11px]">
              {typeof svData.currentValue === 'object'
                ? JSON.stringify(svData.currentValue)
                : String(svData.currentValue)}
            </div>
          </div>

          <div
            className={`text-[9px] px-1.5 py-0.5 rounded border flex items-center gap-1 ${
              isProtected
                ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800'
                : 'bg-rose-950/60 text-rose-300 border-rose-800 animate-pulse'
            }`}
          >
            {isProtected ? (
              <>
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                <span>Védett (Mutex zárral)</span>
              </>
            ) : (
              <>
                <AlertTriangle className="w-3 h-3 text-rose-400" />
                <span>⚠️ Védetlen (Adatverseny!)</span>
              </>
            )}
          </div>
        </div>
      );
    }

    if (type === 'direct_variable') {
      const dvData = data as RtosDirectVarData;
      return (
        <div className="space-y-1.5 text-[11px] font-mono">
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-slate-400">Típus:</span>
            <span className="text-purple-300 font-bold">{dvData.type}</span>
          </div>
          <div className="bg-[#0F1115] p-1.5 rounded border border-slate-800 text-[10px]">
            <span className="text-slate-400">Értesítési érték: </span>
            <span className="text-purple-300 font-bold">{dvData.currentValue || 0}</span>
          </div>
        </div>
      );
    }

    if (type === 'software_timer') {
      const tmData = data as RtosTimerData;
      return (
        <div className="space-y-1.5 text-[11px] font-mono">
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-slate-400">Periódus:</span>
            <span className="text-blue-300 font-bold">{tmData.periodMs} ms</span>
          </div>
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-slate-400">Auto-Reload:</span>
            <span className="text-blue-300 font-bold">{tmData.autoReload ? 'Igen' : 'Nem (One-Shot)'}</span>
          </div>
        </div>
      );
    }

    if (type === 'isr_handler') {
      const isrData = data as RtosIsrData;
      return (
        <div className="space-y-1.5 text-[11px] font-mono">
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-slate-400">IRQ Forrás:</span>
            <span className="text-rose-300 font-bold truncate max-w-[110px]">{isrData.irqSource}</span>
          </div>
          <div className="text-[9px] text-emerald-400 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            <span>FromISR & Yield engedélyezve</span>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div
      id={`rtos-node-${node.id}`}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(node.id);
      }}
      style={{
        transform: `translate(${node.x}px, ${node.y}px)`,
      }}
      className={`absolute w-56 bg-[#161920] rounded-xs border-2 transition-shadow select-none shadow-[4px_4px_0px_#000] cursor-move ${
        isSelected
          ? 'border-cyan-400 shadow-[0_0_15px_rgba(56,189,248,0.4)] z-30'
          : 'border-[#2A2D35] hover:border-slate-500 z-10'
      }`}
    >
      {/* Node Header */}
      <div className={`p-2 border-b flex items-center justify-between ${headerColor}`}>
        <div className="flex items-center gap-1.5 min-w-0">
          <div className="p-1 rounded bg-[#0F1115]/80 shrink-0">{icon}</div>
          <span className="text-xs font-mono font-bold truncate text-slate-100" title={nodeTitle}>
            {nodeTitle}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenSettings(node.id);
            }}
            className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
            title="Beállítások"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(node.id);
            }}
            className="p-1 rounded hover:bg-rose-950 text-slate-400 hover:text-rose-400 cursor-pointer"
            title="Törlés"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Node Body */}
      <div className="p-2.5 bg-[#12141A]">{renderBodyContent()}</div>

      {/* Connection Ports (Left & Right Anchors) */}
      {/* Input Port (Left) */}
      <div
        className="absolute -left-2.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-[#0F1115] border-2 border-cyan-400 hover:scale-125 transition-transform flex items-center justify-center cursor-crosshair z-40 group"
        title="Bemeneti Adat/Szinkron Port (Kattints a csatlakoztatáshoz)"
        onMouseDown={(e) => {
          e.stopPropagation();
          onPortMouseDown(e, node.id, 'in', false);
        }}
        onMouseUp={(e) => {
          e.stopPropagation();
          onPortMouseUp(e, node.id, 'in', false);
        }}
      >
        <div className="w-2 h-2 rounded-full bg-cyan-400 group-hover:bg-white" />
      </div>

      {/* Output Port (Right) */}
      <div
        className="absolute -right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-[#0F1115] border-2 border-emerald-400 hover:scale-125 transition-transform flex items-center justify-center cursor-crosshair z-40 group"
        title="Kimeneti Adat/Szinkron Port (Húzd az összekötéshez)"
        onMouseDown={(e) => {
          e.stopPropagation();
          onPortMouseDown(e, node.id, 'out', true);
        }}
        onMouseUp={(e) => {
          e.stopPropagation();
          onPortMouseUp(e, node.id, 'out', true);
        }}
      >
        <div className="w-2 h-2 rounded-full bg-emerald-400 group-hover:bg-white" />
      </div>
    </div>
  );
};
