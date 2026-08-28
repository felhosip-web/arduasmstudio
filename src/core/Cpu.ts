/**
 * (c) 2026 AI Studio AVR8 Engine
 * Central AVR8 Core & TickQueue Integration Hub
 */

import { WasmCpu, ITickQueue } from './WasmCpu';
import { HybridCpu, TickQueue } from './HybridCpu';
import { IORegister, RegisterBank } from './Register';
import { createAtmega328pRegisterBank } from './atmega328p';
import { Timer1 } from '../peripherals/Timer1';

export class Cpu {
  public wasmCpu: WasmCpu;
  public timer1: Timer1;
  public regBank: RegisterBank;

  constructor() {
    this.wasmCpu = new WasmCpu(32768, null);
    this.timer1 = new Timer1();
    this.regBank = createAtmega328pRegisterBank();
  }

  public reset(): void {
    this.wasmCpu.reset();
    this.timer1.reset();
    this.regBank.reset();
  }

  public step(): number {
    const cycles = this.wasmCpu.step();
    for (let i = 0; i < cycles; i++) {
      this.timer1.tick();
    }
    return cycles;
  }

  public runUntil(targetCycles: number): number {
    return this.wasmCpu.run_until(targetCycles);
  }
}

export { WasmCpu, HybridCpu, TickQueue, IORegister, RegisterBank, createAtmega328pRegisterBank };
export type { ITickQueue };
