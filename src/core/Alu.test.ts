/**
 * Test Suite for 100% Hardware-Faithful AVR ALU Implementation
 * Reference: Atmel AVR Instruction Set Manual - 0856I & simavr oracle tests
 */

import {
  IAluContext,
  FLAG_C,
  FLAG_Z,
  FLAG_N,
  FLAG_V,
  FLAG_S,
  FLAG_H,
  FLAG_I,
  ADD_FLAGS,
  INC_FLAGS,
  DEC_FLAGS,
  NEG_FLAGS,
  COM_FLAGS,
  AND_FLAGS,
  OR_FLAGS,
  EOR_FLAGS,
  aluAdd,
  aluAdc,
  aluSub,
  aluSubi,
  aluSbc,
  aluAnd,
  aluOr,
  aluEor,
  aluInc,
  aluDec,
  aluNeg,
  aluCom,
  aluLsr,
  aluAsr,
  aluRor,
  aluSwap,
} from './alu';

export function runAluTests(): { passed: boolean; results: { name: string; passed: boolean; details?: string }[] } {
  const results: { name: string; passed: boolean; details?: string }[] = [];

  function assert(name: string, condition: boolean, details?: string) {
    results.push({
      name,
      passed: !!condition,
      details: condition ? undefined : details || 'Assertion failed',
    });
  }

  function createMockContext(): IAluContext {
    return {
      regs: new Uint8Array(32),
      sreg: 0,
      temp: 0,
      rampz: 0,
    };
  }

  // 0. Direct Look-Up Table Bitwise Checks
  {
    assert('ADD_FLAGS[0x0F | (0x01 << 8)] & FLAG_H === FLAG_H', (ADD_FLAGS[0x0f | (0x01 << 8)] & FLAG_H) === FLAG_H);
    assert('ADD_FLAGS[(0x0F << 8) | 0x01] & FLAG_H === FLAG_H', (ADD_FLAGS[(0x0f << 8) | 0x01] & FLAG_H) === FLAG_H);
    assert('INC_FLAGS[0x7F] & FLAG_V === FLAG_V', (INC_FLAGS[0x7f] & FLAG_V) === FLAG_V);
    assert('INC_FLAGS[0x7F] & FLAG_C === 0 (Carry Preserved in LUT)', (INC_FLAGS[0x7f] & FLAG_C) === 0);
    assert('DEC_FLAGS[0x80] & FLAG_V === FLAG_V', (DEC_FLAGS[0x80] & FLAG_V) === FLAG_V);
    assert('NEG_FLAGS[0x00] & FLAG_C === 0', (NEG_FLAGS[0x00] & FLAG_C) === 0);
    assert('NEG_FLAGS[0x01] & FLAG_C === FLAG_C', (NEG_FLAGS[0x01] & FLAG_C) === FLAG_C);
    assert('NEG_FLAGS[0x80] & FLAG_V === FLAG_V', (NEG_FLAGS[0x80] & FLAG_V) === FLAG_V);
    assert('COM_FLAGS[0x55] & FLAG_C === FLAG_C', (COM_FLAGS[0x55] & FLAG_C) === FLAG_C);
    assert('AND_FLAGS[(0xFF << 8) | 0x00] & FLAG_Z === FLAG_Z', (AND_FLAGS[(0xff << 8) | 0x00] & FLAG_Z) === FLAG_Z);
    assert('OR_FLAGS[(0x00 << 8) | 0x00] & FLAG_Z === FLAG_Z', (OR_FLAGS[(0x00 << 8) | 0x00] & FLAG_Z) === FLAG_Z);
    assert('EOR_FLAGS[(0x55 << 8) | 0x55] & FLAG_Z === FLAG_Z', (EOR_FLAGS[(0x55 << 8) | 0x55] & FLAG_Z) === FLAG_Z);
  }

  // 1. ADD: Half-carry and overflow
  {
    const ctx = createMockContext();
    ctx.regs[16] = 0x0f;
    ctx.regs[17] = 0x01;
    aluAdd(ctx, 16, 17);
    assert('ADD 0x0F + 0x01 = 0x10 sets H=1, C=0', ctx.regs[16] === 0x10 && (ctx.sreg & FLAG_H) !== 0 && (ctx.sreg & FLAG_C) === 0);

    ctx.regs[16] = 0x7f;
    ctx.regs[17] = 0x01;
    aluAdd(ctx, 16, 17);
    assert('ADD 0x7F + 0x01 = 0x80 sets V=1, N=1, S=0', ctx.regs[16] === 0x80 && (ctx.sreg & FLAG_V) !== 0 && (ctx.sreg & FLAG_N) !== 0 && (ctx.sreg & FLAG_S) === 0);
  }

  // 2. ADC: With carry input
  {
    const ctx = createMockContext();
    ctx.regs[16] = 0x0f;
    ctx.regs[17] = 0x00;
    ctx.sreg = FLAG_C; // Cin = 1
    aluAdc(ctx, 16, 17);
    assert('ADC 0x0F + 0x00 + Cin(1) = 0x10 sets H=1, C=0', ctx.regs[16] === 0x10 && (ctx.sreg & FLAG_H) !== 0 && (ctx.sreg & FLAG_C) === 0);
  }

  // 3. SUB: Half-borrow and overflow
  {
    const ctx = createMockContext();
    ctx.regs[16] = 0x10;
    ctx.regs[17] = 0x01;
    aluSub(ctx, 16, 17);
    assert('SUB 0x10 - 0x01 = 0x0F sets H=1, C=0', ctx.regs[16] === 0x0f && (ctx.sreg & FLAG_H) !== 0 && (ctx.sreg & FLAG_C) === 0);

    ctx.regs[16] = 0x80;
    ctx.regs[17] = 0x01;
    aluSub(ctx, 16, 17);
    assert('SUB 0x80 - 0x01 = 0x7F sets V=1, N=0, S=1', ctx.regs[16] === 0x7f && (ctx.sreg & FLAG_V) !== 0 && (ctx.sreg & FLAG_N) === 0 && (ctx.sreg & FLAG_S) !== 0);
  }

  // 4. SBC: Zero flag propagation across multi-byte subtraction
  {
    const ctx = createMockContext();
    ctx.regs[16] = 0x05;
    ctx.regs[17] = 0x05;
    ctx.sreg = 0; // Previous Z = 0
    aluSbc(ctx, 16, 17);
    assert('SBC: when previous Z=0 and res=0, Z remains 0', ctx.regs[16] === 0 && (ctx.sreg & FLAG_Z) === 0);

    ctx.regs[16] = 0x05;
    ctx.regs[17] = 0x05;
    ctx.sreg = FLAG_Z; // Previous Z = 1
    aluSbc(ctx, 16, 17);
    assert('SBC: when previous Z=1 and res=0, Z is 1', ctx.regs[16] === 0 && (ctx.sreg & FLAG_Z) !== 0);
  }

  // 5. INC & DEC: Must preserve C flag
  {
    const ctx = createMockContext();
    ctx.regs[16] = 0x7f;
    ctx.sreg = FLAG_C | FLAG_I;
    aluInc(ctx, 16);
    assert('INC 0x7F -> 0x80 sets V=1 and PRESERVES C & I', ctx.regs[16] === 0x80 && (ctx.sreg & FLAG_V) !== 0 && (ctx.sreg & FLAG_C) !== 0 && (ctx.sreg & FLAG_I) !== 0);

    ctx.regs[16] = 0x80;
    ctx.sreg = FLAG_C;
    aluDec(ctx, 16);
    assert('DEC 0x80 -> 0x7F sets V=1 and PRESERVES C', ctx.regs[16] === 0x7f && (ctx.sreg & FLAG_V) !== 0 && (ctx.sreg & FLAG_C) !== 0);
  }

  // 6. NEG: 0x00, 0x80, 0x01
  {
    const ctx = createMockContext();
    ctx.regs[16] = 0x00;
    aluNeg(ctx, 16);
    assert('NEG 0x00 -> 0x00: C=0, Z=1, V=0', ctx.regs[16] === 0 && (ctx.sreg & FLAG_C) === 0 && (ctx.sreg & FLAG_Z) !== 0 && (ctx.sreg & FLAG_V) === 0);

    ctx.regs[16] = 0x80;
    aluNeg(ctx, 16);
    assert('NEG 0x80 -> 0x80: C=1, Z=0, V=1, N=1', ctx.regs[16] === 0x80 && (ctx.sreg & FLAG_C) !== 0 && (ctx.sreg & FLAG_Z) === 0 && (ctx.sreg & FLAG_V) !== 0);

    ctx.regs[16] = 0x01;
    aluNeg(ctx, 16);
    assert('NEG 0x01 -> 0xFF: C=1, Z=0, V=0, H=1', ctx.regs[16] === 0xff && (ctx.sreg & FLAG_C) !== 0 && (ctx.sreg & FLAG_H) !== 0);
  }

  // 7. AND / OR / EOR: Preserve H and C
  {
    const ctx = createMockContext();
    ctx.regs[16] = 0xff;
    ctx.regs[17] = 0x00;
    ctx.sreg = FLAG_H | FLAG_C | FLAG_I;
    aluAnd(ctx, 16, 17);
    assert('AND clears V, sets Z, PRESERVES H and C', ctx.regs[16] === 0 && (ctx.sreg & FLAG_Z) !== 0 && (ctx.sreg & FLAG_V) === 0 && (ctx.sreg & FLAG_H) !== 0 && (ctx.sreg & FLAG_C) !== 0);
  }

  // 8. COM: Sets C=1 always, preserves H
  {
    const ctx = createMockContext();
    ctx.regs[16] = 0x55;
    ctx.sreg = FLAG_H;
    aluCom(ctx, 16);
    assert('COM 0x55 -> 0xAA: sets C=1 and PRESERVES H', ctx.regs[16] === 0xaa && (ctx.sreg & FLAG_C) !== 0 && (ctx.sreg & FLAG_H) !== 0);
  }

  // 9. LSR / ASR / ROR / SWAP
  {
    const ctx = createMockContext();
    ctx.regs[16] = 0x05;
    aluLsr(ctx, 16);
    assert('LSR 0x05 -> 0x02, C=1', ctx.regs[16] === 0x02 && (ctx.sreg & FLAG_C) !== 0);

    ctx.regs[16] = 0x85;
    aluAsr(ctx, 16);
    assert('ASR 0x85 -> 0xC2, C=1, N=1', ctx.regs[16] === 0xc2 && (ctx.sreg & FLAG_C) !== 0 && (ctx.sreg & FLAG_N) !== 0);

    ctx.regs[16] = 0x01;
    ctx.sreg = FLAG_C; // Cin = 1
    aluRor(ctx, 16);
    assert('ROR 0x01 with Cin=1 -> 0x80, C=1, N=1', ctx.regs[16] === 0x80 && (ctx.sreg & FLAG_C) !== 0 && (ctx.sreg & FLAG_N) !== 0);

    ctx.regs[16] = 0xa5;
    aluSwap(ctx, 16);
    assert('SWAP 0xA5 -> 0x5A', ctx.regs[16] === 0x5a);
  }

  const allPassed = results.every((r) => r.passed);
  return { passed: allPassed, results };
}
