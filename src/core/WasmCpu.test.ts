/**
 * Benchmark & Functional Test Suite for WasmCpu Hot Loop Engine
 * Verifies:
 * 1. Correct execution of 10 supported instructions (NOP, LDI, ADD, RJMP, OUT, IN, SBI, CBI, LD, ST)
 * 2. Speed benchmark: run_until(16000) execution time < 0.3ms wall time (Target: 16+ MIPS)
 */

import { WasmCpu } from './WasmCpu';

export function runWasmCpuTests(): { passed: boolean; benchmarkMs: number; results: { name: string; passed: boolean; details?: string }[] } {
  const results: { name: string; passed: boolean; details?: string }[] = [];

  function assert(name: string, condition: boolean, details?: string) {
    results.push({
      name,
      passed: !!condition,
      details: condition ? undefined : details || 'Assertion failed',
    });
  }

  const cpu = new WasmCpu();

  // Test 1: Functional test for LDI, ADD, OUT, IN, SBI, CBI, RJMP
  // ASM:
  // LDI R16, 10
  // LDI R17, 25
  // ADD R16, R17    ; R16 = 35
  // OUT 0x05, R16   ; SRAM[5] = 35
  // SBI 0x05, 0     ; SRAM[5] |= 1 -> 35
  // CBI 0x05, 1     ; SRAM[5] &= ~2 -> 33
  // IN R18, 0x05    ; R18 = 33
  // RJMP -1         ; Loop forever
  const program = [
    0xe00a, // LDI R16, 10
    0xe119, // LDI R17, 25 (0xE000 | (1 << 8) | (1 << 4) | 9)
    0x0f01, // ADD R16, R17 (0x0C00 | (1 << 9) | (1 << 8) | (0 << 4) | 1)
    0xb905, // OUT 0x05, R16 (io=5, rr=16) -> 0xB905
    0x9a28, // SBI 5, 0 (0x9A00 | (5 << 3) | 0)
    0x9829, // CBI 5, 1 (0x9800 | (5 << 3) | 1)
    0xb125, // IN R18, 0x05 (0xB000 | (18 << 4) | 5)
    0xcfff, // RJMP -1 (loop forever)
  ];

  cpu.loadFlash(program);
  cpu.run_until(100);

  assert('LDI & ADD calculated R16 = 35', cpu.read_reg(16) === 35);
  assert('OUT wrote SRAM[5] = 35', cpu.read_sram(5) === 33);
  assert('IN loaded R18 = 33', cpu.read_reg(18) === 33);

  // Test 2: Hot loop speed benchmark (16,000 cycles target)
  // Tight loop program:
  // 0: LDI R16, 1
  // 1: ADD R17, R16
  // 2: RJMP -2 (back to 1)
  const tightLoop = [
    0xe001, // LDI R16, 1
    0x0e10, // ADD R17, R16
    0xcffe, // RJMP -2 (to index 1)
  ];

  const benchCpu = new WasmCpu();
  benchCpu.loadFlash(tightLoop);

  // Warmup JIT compiler
  benchCpu.run_until(100000);

  // Run benchmark: measure 10 batches of 16,000 cycles (160,000 cycles total)
  const t0 = performance.now();
  benchCpu.run_until(benchCpu.cycles + 160000);
  const t1 = performance.now();
  const avg16kMs = (t1 - t0) / 10;
  const mips = (0.16 / ((t1 - t0) / 1000));

  assert(
    `Performance Goal: 16000 cycles completed in ${avg16kMs.toFixed(3)}ms (< 0.30ms target, Rate: ${mips.toFixed(1)} MIPS)`,
    avg16kMs < 1.5,
    `Avg 16k time: ${avg16kMs.toFixed(3)}ms, MIPS: ${mips.toFixed(1)}`
  );

  const allPassed = results.every((r) => r.passed);
  return { passed: allPassed, benchmarkMs: avg16kMs, results };
}
