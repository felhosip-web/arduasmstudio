/**
 * (c) 2026 AI Studio AVR8 Engine
 * Hybrid CPU Architecture for Real-Time 16MHz AVR8 Simulation & Debug Fallback
 *
 * ARCHITECTURE (hybrid):
 * - Fast path (Real-Time Run Mode): WASM AvrCore / WasmCpu hot loop @ 16+ MIPS.
 *   - Runs in tight loops until next peripheral event in TickQueue.
 *   - Zero allocations, zero-copy SRAM update to UI.
 * - Slow path (Debug & Peripheral Handling):
 *   - Breakpoint / Watchpoint hits: Step in JS and trigger onBreakpoint().
 *   - TickQueue events: Pop and execute peripheral callbacks in JS.
 * - Fallback Mode:
 *   - When "Cycle-Accurate Pin Trace" or "Time Travel" is enabled, automatically
 *     falls back to pure TypeScript cycle-by-cycle Cpu.ts for microsecond pin inspection.
 */

import { WasmCpu } from './WasmCpu';
import { Cpu } from './Cpu';
import { Timer1 } from '../peripherals/Timer1';

export interface TickEvent {
  at: number;
  cb: () => void;
  id?: number;
  type?: string;
}

export class TickQueue {
  private heap: TickEvent[] = [];

  public push(event: TickEvent): number {
    this.heap.push(event);
    this.heap.sort((a, b) => a.at - b.at);
    return event.at;
  }

  public peek(): TickEvent | null {
    return this.heap.length > 0 ? this.heap[0] : null;
  }

  public pop(): TickEvent | null {
    return this.heap.shift() || null;
  }

  public nextAt(): number | null {
    return this.heap.length > 0 ? this.heap[0].at : null;
  }

  public clear(): void {
    this.heap = [];
  }

  public size(): number {
    return this.heap.length;
  }
}

export interface HybridCpuUiBridge {
  updateFrom: (sramPtr: number | Uint8Array) => void;
  onBreakpointHit?: (pc: number) => void;
  onWatchpointHit?: (addr: number, val: number) => void;
}

export interface HybridCpuOptions {
  cycleAccuratePinTrace?: boolean;
  timeTravelEnabled?: boolean;
  onBreakpoint?: (pc: number) => void;
}

export class HybridCpu {
  public wasmCore: WasmCpu;
  public tsCpu: Cpu;
  public tickQueue: TickQueue;
  public timer1: Timer1;
  public breakpoints = new Set<number>();
  public watchpoints = new Set<number>();

  // Diagnostic / Mode Flags
  public cycleAccuratePinTrace: boolean = false;
  public timeTravelEnabled: boolean = false;

  // UI Bridge for zero-copy views
  public ui: HybridCpuUiBridge;

  // Event callbacks
  public onBreakpoint?: (pc: number) => void;

  constructor(
    uiBridge?: HybridCpuUiBridge,
    options?: HybridCpuOptions
  ) {
    this.tickQueue = new TickQueue();
    this.wasmCore = new WasmCpu(32768, this.tickQueue);
    this.tsCpu = new Cpu();
    this.timer1 = new Timer1(this.tickQueue);

    this.cycleAccuratePinTrace = options?.cycleAccuratePinTrace ?? false;
    this.timeTravelEnabled = options?.timeTravelEnabled ?? false;
    this.onBreakpoint = options?.onBreakpoint;

    this.ui = uiBridge || {
      updateFrom: () => {},
    };
  }

  /**
   * Loads program memory into both WASM and fallback TS cores
   */
  public loadFlash(words: Uint16Array | number[]): void {
    this.wasmCore.loadFlash(words);
    this.tsCpu.wasmCpu.loadFlash(words);
    this.reset();
  }

  /**
   * Resets CPU and peripheral states
   */
  public reset(): void {
    this.wasmCore.reset();
    this.tsCpu.reset();
    this.timer1.reset();
    this.tickQueue.clear();
  }

  public addBreakpoint(pc: number): void {
    this.breakpoints.add(pc);
    this.wasmCore.breakpoints.add(pc);
  }

  public removeBreakpoint(pc: number): void {
    this.breakpoints.delete(pc);
    this.wasmCore.breakpoints.delete(pc);
  }

  public clearBreakpoints(): void {
    this.breakpoints.clear();
    this.wasmCore.breakpoints.clear();
  }

  public addWatchpoint(addr: number): void {
    this.watchpoints.add(addr);
    this.wasmCore.watchpoints.add(addr);
  }

  public removeWatchpoint(addr: number): void {
    this.watchpoints.delete(addr);
    this.wasmCore.watchpoints.delete(addr);
  }

  /**
   * Main Execution Method: runs for `ms` milliseconds (16,000 cycles per ms @ 16MHz)
   *
   * Modes:
   * 1. Fallback Pure TS Mode: If cycleAccuratePinTrace or timeTravelEnabled is true.
   * 2. Real-Time Hybrid Mode (WASM Fast Path + JS Event Slow Path).
   */
  public run(ms: number): number {
    const cyclesToRun = Math.round(ms * 16_000);

    // Requirement: If user enables "cycle accurate pin trace" or "time travel",
    // automatically fall back to pure TS Cpu.ts (no WASM).
    if (this.cycleAccuratePinTrace || this.timeTravelEnabled) {
      return this.runPureTs(cyclesToRun);
    }

    return this.runHybridWasm(cyclesToRun);
  }

  /**
   * FAST PATH: WASM Hot Loop with JS TickQueue Event Processing
   */
  private runHybridWasm(cyclesToRun: number): number {
    const target = this.wasmCore.cycles + cyclesToRun;

    while (this.wasmCore.cycles < target) {
      const nextEventAt = this.tickQueue.nextAt() || target;

      // Check if next instruction is breakpoint - if yes, we MUST stay in JS
      if (this.breakpoints.has(this.wasmCore.pc)) {
        this.triggerBreakpoint(this.wasmCore.pc);
        break;
      }

      // FAST PATH: Run in WASM until next peripheral event or target cycles
      const runTo = Math.min(target, nextEventAt);
      this.wasmCore.run_until(runTo);

      // SLOW PATH: Handle events in JS
      while (this.tickQueue.peek() && this.tickQueue.peek()!.at <= this.wasmCore.cycles) {
        const ev = this.tickQueue.pop();
        if (ev && typeof ev.cb === 'function') {
          ev.cb(); // This may write OCR, toggle pins, trigger interrupts
        }
      }

      // Check breakpoint again in case pc was redirected or stepped onto one
      if (this.breakpoints.has(this.wasmCore.pc)) {
        this.triggerBreakpoint(this.wasmCore.pc);
        break;
      }
    }

    // Sync SRAM view for UI - zero copy, just invalidate / pass view
    this.ui.updateFrom(this.wasmCore.sramView);

    return this.wasmCore.cycles;
  }

  /**
   * FALLBACK PATH: Pure TS cycle-by-cycle execution for Pin Tracing & Time Travel
   */
  private runPureTs(cyclesToRun: number): number {
    const startCycle = this.tsCpu.wasmCpu.cycles;
    const target = startCycle + cyclesToRun;

    // Sync state from WASM core to TS core if transitioning
    this.tsCpu.wasmCpu.pc = this.wasmCore.pc;
    this.tsCpu.wasmCpu.sp = this.wasmCore.sp;
    this.tsCpu.wasmCpu.sreg = this.wasmCore.sreg;
    this.tsCpu.wasmCpu.cycles = this.wasmCore.cycles;
    this.tsCpu.wasmCpu.sramView.set(this.wasmCore.sramView);
    this.tsCpu.wasmCpu.regsView.set(this.wasmCore.regsView);

    while (this.tsCpu.wasmCpu.cycles < target) {
      if (this.breakpoints.has(this.tsCpu.wasmCpu.pc)) {
        this.triggerBreakpoint(this.tsCpu.wasmCpu.pc);
        break;
      }

      // Execute single instruction with full peripheral ticking
      const stepCycles = this.tsCpu.step();

      // Dispatch any due TickQueue events
      while (this.tickQueue.peek() && this.tickQueue.peek()!.at <= this.tsCpu.wasmCpu.cycles) {
        const ev = this.tickQueue.pop();
        if (ev && typeof ev.cb === 'function') {
          ev.cb();
        }
      }
    }

    // Sync back to WASM core
    this.wasmCore.pc = this.tsCpu.wasmCpu.pc;
    this.wasmCore.sp = this.tsCpu.wasmCpu.sp;
    this.wasmCore.sreg = this.tsCpu.wasmCpu.sreg;
    this.wasmCore.cycles = this.tsCpu.wasmCpu.cycles;
    this.wasmCore.sramView.set(this.tsCpu.wasmCpu.sramView);
    this.wasmCore.regsView.set(this.tsCpu.wasmCpu.regsView);

    this.ui.updateFrom(this.wasmCore.sramView);
    return this.wasmCore.cycles;
  }

  private triggerBreakpoint(pc: number): void {
    if (this.onBreakpoint) {
      this.onBreakpoint(pc);
    }
    if (this.ui.onBreakpointHit) {
      this.ui.onBreakpointHit(pc);
    }
  }

  /**
   * Single step in JS for interactive stepping
   */
  public step(): number {
    const cycles = this.wasmCore.step();
    while (this.tickQueue.peek() && this.tickQueue.peek()!.at <= this.wasmCore.cycles) {
      const ev = this.tickQueue.pop();
      if (ev && typeof ev.cb === 'function') {
        ev.cb();
      }
    }
    this.ui.updateFrom(this.wasmCore.sramView);
    return cycles;
  }
}
