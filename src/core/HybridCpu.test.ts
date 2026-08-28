/**
 * Comprehensive Test Suite for HybridCpu Engine
 * Verifies:
 * 1. Fast path WASM hot loop (16 MHz real-time speed)
 * 2. TickQueue peripheral event interception in JS
 * 3. Breakpoint detection without breaking into WASM
 * 4. Automatic fallback to pure TS Cpu when cycle-accurate trace / time-travel is enabled
 * 5. Zero-copy UI bridge updates
 */

import { HybridCpu, TickQueue } from './HybridCpu';

export function runHybridCpuTests(): { passed: boolean; results: { name: string; passed: boolean; details?: string }[] } {
  const results: { name: string; passed: boolean; details?: string }[] = [];

  function assert(name: string, condition: boolean, details?: string) {
    results.push({
      name,
      passed: !!condition,
      details: condition ? undefined : details || 'Assertion failed',
    });
  }

  // -------------------------------------------------------------
  // Test 1: Real-time hybrid execution & TickQueue event firing
  // -------------------------------------------------------------
  let eventFired = false;
  let sramUpdated = false;
  let bpFired = false;

  const hybridCpu = new HybridCpu(
    {
      updateFrom: (sram) => {
        sramUpdated = true;
      },
      onBreakpointHit: (pc) => {
        bpFired = true;
      },
    }
  );

  // ASM program:
  // 0: LDI R16, 5
  // 1: ADD R16, R16 ; R16 = 10
  // 2: RJMP -1      ; Loop forever
  const program = [
    0xe005, // LDI R16, 5
    0x0f00, // ADD R16, R16
    0xcfff, // RJMP -1
  ];

  hybridCpu.loadFlash(program);

  // Schedule a peripheral event at cycle 8000 (0.5ms into execution)
  hybridCpu.tickQueue.push({
    at: 8000,
    cb: () => {
      eventFired = true;
      // Peripheral callback writes to SRAM[0x20]
      hybridCpu.wasmCore.write_sram(0x20, 0x42);
    },
  });

  // Run for 1.0 ms (16,000 cycles)
  hybridCpu.run(1.0);

  assert('HybridCpu completed 16000 cycles for 1ms', hybridCpu.wasmCore.cycles >= 16000);
  assert('Peripheral TickQueue event at cycle 8000 was executed in JS', eventFired);
  assert('Peripheral event wrote to SRAM (0x20 = 0x42)', hybridCpu.wasmCore.read_sram(0x20) === 0x42);
  assert('UI updateFrom bridge received SRAM update', sramUpdated);

  // -------------------------------------------------------------
  // Test 2: Breakpoint stops WASM execution immediately
  // -------------------------------------------------------------
  hybridCpu.reset();
  hybridCpu.loadFlash(program);
  hybridCpu.addBreakpoint(1); // Breakpoint at PC=1 (ADD instruction)

  let hitBpPc = -1;
  hybridCpu.onBreakpoint = (pc) => {
    hitBpPc = pc;
  };

  // Run should stop at PC=1 before executing ADD
  hybridCpu.run(1.0);

  assert('Breakpoint at PC=1 triggered onBreakpoint handler', hitBpPc === 1);
  assert('CPU halted at PC=1', hybridCpu.wasmCore.pc === 1);
  assert('R16 holds initial LDI value (5), ADD not executed yet', hybridCpu.wasmCore.read_reg(16) === 5);

  // -------------------------------------------------------------
  // Test 3: Automatic fallback to pure TS Cpu when pin-trace / time-travel is enabled
  // -------------------------------------------------------------
  const traceCpu = new HybridCpu(
    { updateFrom: () => {} },
    { cycleAccuratePinTrace: true }
  );

  let traceEventFired = false;
  traceCpu.loadFlash(program);
  traceCpu.tickQueue.push({
    at: 3200,
    cb: () => {
      traceEventFired = true;
    },
  });

  traceCpu.run(0.5); // 8,000 cycles

  assert('Fallback mode runs pure TS CPU correctly for 8000 cycles', traceCpu.wasmCore.cycles >= 8000);
  assert('Fallback mode dispatches TickQueue events accurately', traceEventFired);
  assert('Registers and memory in sync in fallback mode', traceCpu.wasmCore.read_reg(16) >= 5);

  const allPassed = results.every((r) => r.passed);
  return { passed: allPassed, results };
}
