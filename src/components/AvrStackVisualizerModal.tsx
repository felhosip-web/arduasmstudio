/**
 * (c) 2026 AI Studio AVR Visual Studio
 * AVR Stack & Heap Visualizer with Collision & Spectacular Explosion Animation
 * Shows SRAM memory map (0x0100 - 0x08FF), stack depth, heap top, and collision shockwave.
 */

import React, { useState } from 'react';
import {
  Layers,
  Flame,
  AlertOctagon,
  ArrowDown,
  ArrowUp,
  RotateCcw,
  Sparkles,
  Zap,
  Info,
  X,
  ShieldAlert,
  Terminal,
  Activity,
} from 'lucide-react';
import { AvrStackMemorySnapshot, AvrStackOverflowEvent } from '../types';
import { analyzeSramMemory, ATMEGA328P_RAMSTART, ATMEGA328P_RAMEND } from '../utils/stackEngine';

interface AvrStackVisualizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  stackSnapshot?: AvrStackMemorySnapshot;
  onSimulatePush?: (val: number) => void;
  onSimulatePop?: () => void;
  onSimulateCall?: (targetPc: number) => void;
  onSimulateRet?: () => void;
  onTriggerStackOverflow?: () => void;
  onResetStack?: () => void;
}

export const AvrStackVisualizerModal: React.FC<AvrStackVisualizerModalProps> = ({
  isOpen,
  onClose,
  stackSnapshot: externalSnapshot,
  onSimulatePush,
  onSimulatePop,
  onSimulateCall,
  onSimulateRet,
  onTriggerStackOverflow,
  onResetStack,
}) => {
  // Local fallback state if not actively stepping
  const [localSp, setLocalSp] = useState<number>(0x08e0);
  const [isExploding, setIsExploding] = useState<boolean>(false);

  if (!isOpen) return null;

  const currentSnapshot = externalSnapshot || analyzeSramMemory(null, localSp);
  const isOverflow = currentSnapshot.isOverflow || isExploding;

  const handleTriggerBoom = () => {
    setIsExploding(true);
    setLocalSp(0x0112); // crush past heap top
    if (onTriggerStackOverflow) {
      onTriggerStackOverflow();
    }
  };

  const handleReset = () => {
    setIsExploding(false);
    setLocalSp(0x08ff);
    if (onResetStack) onResetStack();
  };

  const handleLocalPush = () => {
    setLocalSp((prev) => Math.max(0x0100, prev - 1));
    if (onSimulatePush) onSimulatePush(0x42);
  };

  const handleLocalPop = () => {
    setLocalSp((prev) => Math.min(ATMEGA328P_RAMEND, prev + 1));
    if (onSimulatePop) onSimulatePop();
  };

  const handleLocalCall = () => {
    setLocalSp((prev) => Math.max(0x0100, prev - 2));
    if (onSimulateCall) onSimulateCall(0x005c);
  };

  const handleLocalRet = () => {
    setLocalSp((prev) => Math.min(ATMEGA328P_RAMEND, prev + 2));
    if (onSimulateRet) onSimulateRet();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div
        id="avr-stack-visualizer-modal"
        className={`relative w-full max-w-5xl bg-slate-900 border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] transition-all duration-300 ${
          isOverflow
            ? 'border-red-500 shadow-[0_0_50px_rgba(239,68,68,0.4)] animate-bounce-subtle'
            : 'border-slate-700'
        }`}
      >
        {/* Explosion Shockwave FX Overlay */}
        {isOverflow && (
          <div className="absolute inset-0 pointer-events-none z-50 overflow-hidden">
            <div className="absolute inset-0 bg-red-600/15 animate-pulse" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-red-500/20 rounded-full blur-3xl animate-ping" />
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90 z-10">
          <div className="flex items-center gap-3">
            <div
              className={`p-2.5 rounded-xl border transition-colors ${
                isOverflow
                  ? 'bg-red-500/20 border-red-500 text-red-400 animate-spin-slow'
                  : 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400'
              }`}
            >
              {isOverflow ? <Flame className="w-6 h-6" /> : <Layers className="w-6 h-6" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-wide">AVR SRAM & Stack Vizualizáció</h2>
                {isOverflow ? (
                  <span className="px-2 py-0.5 text-xs font-bold bg-red-600 text-white rounded-full animate-pulse flex items-center gap-1 shadow-lg shadow-red-500/50">
                    <AlertOctagon className="w-3.5 h-3.5" /> STACK OVERFLOW ROBBANÁS!
                  </span>
                ) : (
                  <span className="px-2 py-0.5 text-xs font-semibold bg-indigo-500/20 text-indigo-300 rounded-full border border-indigo-500/30">
                    ATmega328P 2KB SRAM Térkép
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Kövesd a veremtárat (Stack 0x08FF lefelé) és a kupacot (Heap 0x0100 felfelé).
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors z-10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Overflow Critical Alert Banner */}
        {isOverflow && (
          <div className="px-6 py-3 bg-red-950 border-b border-red-500/50 flex items-center justify-between z-10 animate-pulse">
            <div className="flex items-center gap-3">
              <Flame className="w-5 h-5 text-red-400" />
              <div className="text-xs text-red-200">
                <span className="font-bold">KRITIKUS MEMÓRIA ÜTKÖZÉS:</span> A Stack Pointer (SP = 0x
                {currentSnapshot.sp.toString(16).toUpperCase()}) elérte és felülírta a Heap memóriát! Felülírt változók: pin_states, tx_buffer.
              </div>
            </div>
            <button
              onClick={handleReset}
              className="px-3 py-1 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-lg transition shadow"
            >
              Stack Visszaállítása
            </button>
          </div>
        )}

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-200 z-10">
          {/* Top Control Bar & Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3 bg-slate-800/80 border border-slate-700/80 rounded-xl">
              <div className="text-[11px] text-slate-400 flex items-center gap-1">
                <ArrowDown className="w-3.5 h-3.5 text-indigo-400" /> Stack Pointer (SP)
              </div>
              <div className="text-lg font-mono font-bold text-indigo-400 mt-1">
                0x{currentSnapshot.sp.toString(16).toUpperCase().padStart(4, '0')}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                Méret: {currentSnapshot.stackSizeBytes} bájt ({currentSnapshot.stackUsagePercent}%)
              </div>
            </div>

            <div className="p-3 bg-slate-800/80 border border-slate-700/80 rounded-xl">
              <div className="text-[11px] text-slate-400 flex items-center gap-1">
                <ArrowUp className="w-3.5 h-3.5 text-emerald-400" /> Heap Teteje (__brkval)
              </div>
              <div className="text-lg font-mono font-bold text-emerald-400 mt-1">
                0x{currentSnapshot.heapTop.toString(16).toUpperCase().padStart(4, '0')}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">Méret: {currentSnapshot.heapSizeBytes} bájt</div>
            </div>

            <div className="p-3 bg-slate-800/80 border border-slate-700/80 rounded-xl">
              <div className="text-[11px] text-slate-400">Biztonsági Sáv (Free Margin)</div>
              <div
                className={`text-lg font-mono font-bold mt-1 ${
                  isOverflow ? 'text-red-400' : currentSnapshot.freeMarginBytes < 64 ? 'text-amber-400' : 'text-emerald-400'
                }`}
              >
                {isOverflow ? '0 bájt (ÜTKÖZÉS)' : `${currentSnapshot.freeMarginBytes} bájt`}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">Szabad SRAM a Stack és Heap között</div>
            </div>

            <div className="p-3 bg-slate-800/80 border border-slate-700/80 rounded-xl">
              <div className="text-[11px] text-slate-400">Hívási Keretek Mélysége</div>
              <div className="text-lg font-mono font-bold text-amber-400 mt-1">
                {currentSnapshot.frames.length} Keret
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">Mentett PC és Regiszterek</div>
            </div>
          </div>

          {/* Interactive Memory Visualizer 2D Stack Column */}
          <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-4">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
              <span>SRAM Memória Térkép (0x0100 - 0x08FF)</span>
              <span className="font-mono text-slate-500">2048 Bájt Összesen</span>
            </div>

            {/* Visual Bar of SRAM */}
            <div className="relative h-20 w-full bg-slate-900 rounded-xl border border-slate-700 overflow-hidden flex items-stretch">
              {/* Static .data & .bss */}
              <div
                style={{ width: '8%' }}
                className="bg-sky-600/80 hover:bg-sky-600 border-r border-sky-400/30 flex flex-col items-center justify-center text-[10px] font-bold text-white transition-all cursor-pointer"
                title="Statikus Globális Változók (.data + .bss): 0x0100 - 0x0114"
              >
                .DATA
              </div>

              {/* Heap (malloc) */}
              <div
                style={{ width: '12%' }}
                className="bg-emerald-600/80 hover:bg-emerald-600 border-r border-emerald-400/30 flex flex-col items-center justify-center text-[10px] font-bold text-white transition-all cursor-pointer"
                title="Dinamikus Heap: 0x0114 - 0x0128"
              >
                HEAP
              </div>

              {/* Free Margin */}
              <div
                style={{
                  width: `${Math.max(
                    5,
                    ((currentSnapshot.freeMarginBytes) / 2048) * 100
                  )}%`,
                }}
                className={`flex flex-col items-center justify-center text-[11px] font-mono transition-all ${
                  isOverflow
                    ? 'bg-red-950/90 text-red-400 font-bold border-2 border-red-500'
                    : currentSnapshot.isWarningNearCollision
                    ? 'bg-amber-950/60 text-amber-300'
                    : 'bg-slate-900/60 text-slate-500'
                }`}
              >
                {isOverflow ? '💥 ÜTKÖZÉS' : `Szabad: ${currentSnapshot.freeMarginBytes} B`}
              </div>

              {/* Stack */}
              <div
                style={{
                  width: `${Math.max(
                    10,
                    ((currentSnapshot.stackSizeBytes) / 2048) * 100
                  )}%`,
                }}
                className={`flex-1 flex flex-col items-center justify-center text-[10px] font-bold text-white transition-all ${
                  isOverflow ? 'bg-red-600 animate-pulse' : 'bg-indigo-600/90 hover:bg-indigo-600'
                }`}
                title={`Stack (Veremtár): 0x${currentSnapshot.sp.toString(16).toUpperCase()} - 0x08FF`}
              >
                <span>STACK (SP: 0x{currentSnapshot.sp.toString(16).toUpperCase()})</span>
              </div>
            </div>

            {/* Scale Labels */}
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>0x0100 (RAMSTART)</span>
              <span>← Heap növekszik felfelé</span>
              <span>Stack növekszik lefelé →</span>
              <span>0x08FF (RAMEND)</span>
            </div>
          </div>

          {/* Interactive Stack Manipulation Buttons */}
          <div className="bg-slate-800/50 border border-slate-700/80 rounded-xl p-4 space-y-3">
            <div className="text-xs font-bold text-slate-300 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-amber-400" /> Interaktív Stack Szimuláció
              </span>
              <span className="text-[11px] text-slate-400">Teszteld a verem működését lépésenként</span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-2.5">
              <button
                onClick={handleLocalPush}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition"
              >
                <ArrowDown className="w-3.5 h-3.5 text-indigo-400" /> PUSH (1 Bájt)
              </button>

              <button
                onClick={handleLocalPop}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition"
              >
                <ArrowUp className="w-3.5 h-3.5 text-indigo-400" /> POP (1 Bájt)
              </button>

              <button
                onClick={handleLocalCall}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition"
              >
                <Terminal className="w-3.5 h-3.5 text-sky-400" /> RCALL (2 Bájt PC)
              </button>

              <button
                onClick={handleLocalRet}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition"
              >
                <RotateCcw className="w-3.5 h-3.5 text-sky-400" /> RET (Visszatérés)
              </button>

              <button
                onClick={handleTriggerBoom}
                className="px-3 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 shadow-lg shadow-red-600/30 transition animate-pulse"
              >
                <Flame className="w-4 h-4 fill-current" /> Durrantsd El! (Overflow)
              </button>
            </div>
          </div>

          {/* Call Stack Frames Decoder List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-indigo-400" /> Aktív Hívási Keretek (Call Stack Frames)
              </span>
              <span className="text-xs text-slate-500 font-mono">
                {currentSnapshot.frames.length} Elem a Veremben
              </span>
            </div>

            {currentSnapshot.frames.length === 0 ? (
              <div className="p-6 text-center bg-slate-800/30 border border-slate-800 rounded-xl text-slate-500 text-xs font-mono">
                A Stack jelenleg a csúcson van (0x08FF). Nincsenek mély alprogram hívások.
              </div>
            ) : (
              <div className="bg-slate-950 rounded-xl border border-slate-800 p-3 max-h-48 overflow-y-auto space-y-1.5 font-mono text-xs">
                {currentSnapshot.frames.map((frame, idx) => (
                  <div
                    key={frame.id}
                    className={`flex items-center justify-between p-2 rounded-lg border transition ${
                      frame.type === 'RETURN_PC'
                        ? 'bg-indigo-950/40 border-indigo-800/60 text-indigo-200'
                        : 'bg-slate-900 border-slate-800 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500">#{idx + 1}</span>
                      <span className="font-bold text-amber-400">0x{frame.address.toString(16).toUpperCase()}</span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300">
                        {frame.type}
                      </span>
                      <span>{frame.decodedValue}</span>
                    </div>
                    <div className="text-[11px] text-slate-400">{frame.label}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-slate-800 bg-slate-900/90 z-10">
          <div className="text-xs text-slate-400">
            RAMEND: <span className="font-mono text-indigo-400">0x08FF</span> | RAMSTART:{' '}
            <span className="font-mono text-sky-400">0x0100</span> | Heap Top:{' '}
            <span className="font-mono text-emerald-400">0x{currentSnapshot.heapTop.toString(16).toUpperCase()}</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition"
          >
            Bezárás
          </button>
        </div>
      </div>
    </div>
  );
};
