/**
 * (c) 2026 AI Studio AVR8 Engine - All Tests Runner
 */

import { runAluTests } from './Alu.test';
import { runRegisterTests } from './Register.test';
import { runWasmCpuTests } from './WasmCpu.test';
import { runHybridCpuTests } from './HybridCpu.test';

console.log('=== RUNNING AVR8 CORE & ALU TEST SUITE ===');

const alu = runAluTests();
console.log(`\n1. ALU Tests (${alu.results.length} cases):`);
for (const r of alu.results) {
  console.log(`  [${r.passed ? 'PASS' : 'FAIL'}] ${r.name}`);
  if (!r.passed && r.details) console.log(`    Error: ${r.details}`);
}

const reg = runRegisterTests();
console.log(`\n2. Register Tests (${reg.results.length} cases):`);
for (const r of reg.results) {
  console.log(`  [${r.passed ? 'PASS' : 'FAIL'}] ${r.name}`);
  if (!r.passed && r.details) console.log(`    Error: ${r.details}`);
}

const wasm = runWasmCpuTests();
console.log(`\n3. WasmCpu Benchmark & Tests (${wasm.results.length} cases):`);
for (const r of wasm.results) {
  console.log(`  [${r.passed ? 'PASS' : 'FAIL'}] ${r.name}`);
  if (!r.passed && r.details) console.log(`    Error: ${r.details}`);
}

const hybrid = runHybridCpuTests();
console.log(`\n4. HybridCpu Tests (${hybrid.results.length} cases):`);
for (const r of hybrid.results) {
  console.log(`  [${r.passed ? 'PASS' : 'FAIL'}] ${r.name}`);
  if (!r.passed && r.details) console.log(`    Error: ${r.details}`);
}

const allPassed = alu.passed && reg.passed && wasm.passed && hybrid.passed;
console.log('\n==========================================');
if (allPassed) {
  console.log(' ALL TESTS PASSED SUCCESSFULLY! (100% FAITHFUL AVR ALU & CORE)');
} else {
  console.error('❌ SOME TESTS FAILED');
  process.exit(1);
}
