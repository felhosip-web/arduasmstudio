/**
 * (c) 2026 AI Studio - FreeRTOS Visual Node Palette
 * Drag-and-Drop & Click-to-Add nodes for Tasks, Queues, Mutexes, Shared/Direct Variables, Timers, ISRs
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
  Plus,
  Info,
} from 'lucide-react';
import { RtosNodeType } from '../../types';

interface RtosNodePaletteProps {
  onAddNode: (type: RtosNodeType) => void;
}

interface PaletteItemDef {
  type: RtosNodeType;
  title: string;
  subtitle: string;
  badge: string;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: React.ReactNode;
}

const PALETTE_ITEMS: PaletteItemDef[] = [
  {
    type: 'task',
    title: 'FreeRTOS Taszk',
    subtitle: 'Párhuzamos szál (Core 0/1)',
    badge: 'Dual-Core',
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-950/40',
    borderColor: 'border-cyan-500/40 hover:border-cyan-400',
    icon: <Cpu className="w-4 h-4 text-cyan-400" />,
  },
  {
    type: 'queue',
    title: 'Üzenetsor (Queue)',
    subtitle: 'Biztonságos FIFO adatcsatorna',
    badge: 'Thread-Safe',
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-950/40',
    borderColor: 'border-emerald-500/40 hover:border-emerald-400',
    icon: <Layers className="w-4 h-4 text-emerald-400" />,
  },
  {
    type: 'mutex',
    title: 'Mutex / Szemafor',
    subtitle: 'Erőforrás zárolás & szinkron',
    badge: 'IPC Lock',
    color: 'text-sky-400',
    bgColor: 'bg-sky-950/40',
    borderColor: 'border-sky-500/40 hover:border-sky-400',
    icon: <Lock className="w-4 h-4 text-sky-400" />,
  },
  {
    type: 'shared_variable',
    title: 'Megosztott Változó',
    subtitle: 'Globális atomi adat/struktúra',
    badge: 'Shared RAM',
    color: 'text-amber-400',
    bgColor: 'bg-amber-950/40',
    borderColor: 'border-amber-500/40 hover:border-amber-400',
    icon: <Database className="w-4 h-4 text-amber-400" />,
  },
  {
    type: 'direct_variable',
    title: 'Közvetlen Értesítés',
    subtitle: 'xTaskNotify Zero-Overhead',
    badge: 'Direct IPC',
    color: 'text-purple-400',
    bgColor: 'bg-purple-950/40',
    borderColor: 'border-purple-500/40 hover:border-purple-400',
    icon: <Zap className="w-4 h-4 text-purple-400" />,
  },
  {
    type: 'software_timer',
    title: 'Szoftveres Időzítő',
    subtitle: 'Periodikus callback hívó',
    badge: 'xTimer',
    color: 'text-blue-400',
    bgColor: 'bg-blue-950/40',
    borderColor: 'border-blue-500/40 hover:border-blue-400',
    icon: <Clock className="w-4 h-4 text-blue-400" />,
  },
  {
    type: 'event_group',
    title: 'Eseménycsoport',
    subtitle: 'Multi-bit esemény szinkron',
    badge: 'EventBits',
    color: 'text-indigo-400',
    bgColor: 'bg-indigo-950/40',
    borderColor: 'border-indigo-500/40 hover:border-indigo-400',
    icon: <Flag className="w-4 h-4 text-indigo-400" />,
  },
  {
    type: 'isr_handler',
    title: 'Hardveres ISR',
    subtitle: 'FromISR megszakításkezelő',
    badge: 'Hardware IRQ',
    color: 'text-rose-400',
    bgColor: 'bg-rose-950/40',
    borderColor: 'border-rose-500/40 hover:border-rose-400',
    icon: <Radio className="w-4 h-4 text-rose-400" />,
  },
];

export const RtosNodePalette: React.FC<RtosNodePaletteProps> = ({ onAddNode }) => {
  const handleDragStart = (e: React.DragEvent, type: RtosNodeType) => {
    e.dataTransfer.setData('application/rtos-node-type', type);
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <aside className="w-64 flex flex-col bg-[#12141A] border-r border-[#2A2D35] h-full overflow-hidden select-none">
      {/* Palette Header */}
      <div className="p-3 border-b border-[#2A2D35] bg-[#0F1115]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-bold font-mono uppercase tracking-wider text-slate-200">
              RTOS Elemek Tára
            </span>
          </div>
          <span className="text-[10px] font-mono font-bold bg-cyan-950/80 text-cyan-400 px-1.5 py-0.5 rounded border border-cyan-800/50">
            D&D
          </span>
        </div>
        <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
          Húzd a munkaterületre vagy kattints a hozzáadáshoz.
        </p>
      </div>

      {/* Palette Items List */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
        {PALETTE_ITEMS.map((item) => (
          <div
            key={item.type}
            id={`palette-item-${item.type}`}
            draggable
            onDragStart={(e) => handleDragStart(e, item.type)}
            onClick={() => onAddNode(item.type)}
            className={`p-2.5 rounded border transition-all cursor-grab active:cursor-grabbing group hover:shadow-[0_2px_10px_rgba(0,0,0,0.5)] ${item.bgColor} ${item.borderColor}`}
          >
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <div className="p-1 rounded bg-[#0F1115] border border-slate-800 group-hover:border-slate-700">
                  {item.icon}
                </div>
                <span className="text-xs font-bold text-slate-200 group-hover:text-white">
                  {item.title}
                </span>
              </div>
              <button
                type="button"
                className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-slate-800 text-slate-300 hover:text-white cursor-pointer"
                title="Hozzáadás"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            <p className="text-[10px] text-slate-400 mb-1.5 leading-tight">
              {item.subtitle}
            </p>

            <div className="flex items-center justify-between">
              <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded border bg-[#0F1115]/80 ${item.color} border-slate-800`}>
                {item.badge}
              </span>
              <span className="text-[9px] text-slate-500 font-mono">
                + Hozzáadás
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom Tip */}
      <div className="p-2.5 border-t border-[#2A2D35] bg-[#0F1115]/80 text-[10px] text-slate-400 flex items-start gap-2">
        <Info className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
        <span>Kattints a csomópontok portjaira az adatvonalak összekötéséhez!</span>
      </div>
    </aside>
  );
};
