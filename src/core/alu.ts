/**
 * (c) 2026 AI Studio AVR8 Engine
 * 100% Hardware-Faithful AVR ALU Implementation
 * Reference: Atmel AVR Instruction Set Manual - 0856I
 *
 * Status Register (SREG) bits:
 * Bit 7: I (Global Interrupt Enable)
 * Bit 6: T (Bit Copy Storage)
 * Bit 5: H (Half Carry)
 * Bit 4: S (Sign Bit, S = N ^ V)
 * Bit 3: V (Two's Complement Overflow)
 * Bit 2: N (Negative)
 * Bit 1: Z (Zero)
 * Bit 0: C (Carry)
 */

export const FLAG_C = 1 << 0;
export const FLAG_Z = 1 << 1;
export const FLAG_N = 1 << 2;
export const FLAG_V = 1 << 3;
export const FLAG_S = 1 << 4;
export const FLAG_H = 1 << 5;
export const FLAG_T = 1 << 6;
export const FLAG_I = 1 << 7;

export const MASK_PRESERVE_IT = FLAG_I | FLAG_T; // 0xC0
export const MASK_PRESERVE_ITHC = FLAG_I | FLAG_T | FLAG_H | FLAG_C; // 0xE1
export const MASK_PRESERVE_ITH = FLAG_I | FLAG_T | FLAG_H; // 0xE0

export function calc_s_flag(n: number, v: number): number {
  return (n ^ v) !== 0 ? FLAG_S : 0;
}

// =========================================================================
// PRECOMPUTED CONST LOOKUP TABLES
// =========================================================================

// ADD_FLAGS[65536]: (Rd << 8) | Rr
export const ADD_FLAGS = new Uint8Array(65536);

// ADC_FLAGS[131072]: (Rd << 9) | (Rr << 1) | Cin
export const ADC_FLAGS = new Uint8Array(131072);

// SUB_FLAGS[65536]: (Rd << 8) | Rr
export const SUB_FLAGS = new Uint8Array(65536);

// SBC_FLAGS[131072]: (Rd << 9) | (Rr << 1) | Cin
export const SBC_FLAGS = new Uint8Array(131072);

// AND_FLAGS[65536]: (Rd << 8) | Rr (V=0, C=0, H=0, Z = R==0, N = R7, S=N)
export const AND_FLAGS = new Uint8Array(65536);

// OR_FLAGS[65536]: (Rd << 8) | Rr (V=0, C=0, H=0, Z = R==0, N = R7, S=N)
export const OR_FLAGS = new Uint8Array(65536);

// EOR_FLAGS[65536]: (Rd << 8) | Rr (V=0, C=0, H=0, Z = R==0, N = R7, S=N)
export const EOR_FLAGS = new Uint8Array(65536);

// INC_FLAGS[256]: Rd
export const INC_FLAGS = new Uint8Array(256);

// DEC_FLAGS[256]: Rd
export const DEC_FLAGS = new Uint8Array(256);

// NEG_FLAGS[256]: Rd (0 - Rd: C = Rd != 0, V = Rd == 0x80)
export const NEG_FLAGS = new Uint8Array(256);

// COM_FLAGS[256]: Rd (0xFF - Rd: C = 1 always, V = 0, S = N)
export const COM_FLAGS = new Uint8Array(256);

// Populate ADD, SUB, AND, OR, EOR lookup tables
for (let i = 0; i < 65536; i++) {
  const rd = (i >> 8) & 0xff;
  const rr = i & 0xff;

  // --- ADD ---
  const addRes = (rd + rr) & 0xff;
  const rd7 = (rd >> 7) & 1;
  const rr7 = (rr >> 7) & 1;
  const addR7 = (addRes >> 7) & 1;
  const rd3 = (rd >> 3) & 1;
  const rr3 = (rr >> 3) & 1;
  const addR3 = (addRes >> 3) & 1;

  const addC = (rd7 & rr7) | (rr7 & (1 - addR7)) | ((1 - addR7) & rd7);
  const addZ = addRes === 0 ? 1 : 0;
  const addN = addR7;
  const addV = (rd7 & rr7 & (1 - addR7)) | ((1 - rd7) & (1 - rr7) & addR7);
  const addS = addN ^ addV;
  const addH = (rd3 & rr3) | (rr3 & (1 - addR3)) | ((1 - addR3) & rd3);
  ADD_FLAGS[i] = addC | (addZ << 1) | (addN << 2) | (addV << 3) | (addS << 4) | (addH << 5);

  // --- SUB ---
  const subRes = (rd - rr) & 0xff;
  const subR7 = (subRes >> 7) & 1;
  const subR3 = (subRes >> 3) & 1;

  const subC = ((1 - rd7) & rr7) | (rr7 & subR7) | (subR7 & (1 - rd7));
  const subZ = subRes === 0 ? 1 : 0;
  const subN = subR7;
  const subV = (rd7 & (1 - rr7) & (1 - subR7)) | ((1 - rd7) & rr7 & subR7);
  const subS = subN ^ subV;
  const subH = ((1 - rd3) & rr3) | (rr3 & subR3) | (subR3 & (1 - rd3));
  SUB_FLAGS[i] = subC | (subZ << 1) | (subN << 2) | (subV << 3) | (subS << 4) | (subH << 5);

  // --- AND ---
  const andRes = (rd & rr) & 0xff;
  const andN = (andRes >> 7) & 1;
  const andZ = andRes === 0 ? 1 : 0;
  const andV = 0;
  const andS = andN ^ andV;
  AND_FLAGS[i] = (andZ << 1) | (andN << 2) | (andV << 3) | (andS << 4);

  // --- OR ---
  const orRes = (rd | rr) & 0xff;
  const orN = (orRes >> 7) & 1;
  const orZ = orRes === 0 ? 1 : 0;
  const orV = 0;
  const orS = orN ^ orV;
  OR_FLAGS[i] = (orZ << 1) | (orN << 2) | (orV << 3) | (orS << 4);

  // --- EOR ---
  const eorRes = (rd ^ rr) & 0xff;
  const eorN = (eorRes >> 7) & 1;
  const eorZ = eorRes === 0 ? 1 : 0;
  const eorV = 0;
  const eorS = eorN ^ eorV;
  EOR_FLAGS[i] = (eorZ << 1) | (eorN << 2) | (eorV << 3) | (eorS << 4);
}

// Populate ADC & SBC (with Cin: 0 or 1, indexed as (cin << 16) | (rd << 8) | rr)
for (let cin = 0; cin < 2; cin++) {
  for (let rd = 0; rd < 256; rd++) {
    for (let rr = 0; rr < 256; rr++) {
      const idx = (cin << 16) | (rd << 8) | rr;

      // --- ADC ---
      const adcRes = (rd + rr + cin) & 0xff;
      const rd7 = (rd >> 7) & 1;
      const rr7 = (rr >> 7) & 1;
      const adcR7 = (adcRes >> 7) & 1;
      const rd3 = (rd >> 3) & 1;
      const rr3 = (rr >> 3) & 1;
      const adcR3 = (adcRes >> 3) & 1;

      const adcC = (rd7 & rr7) | (rr7 & (1 - adcR7)) | ((1 - adcR7) & rd7);
      const adcZ = adcRes === 0 ? 1 : 0;
      const adcN = adcR7;
      const adcV = (rd7 & rr7 & (1 - adcR7)) | ((1 - rd7) & (1 - rr7) & adcR7);
      const adcS = adcN ^ adcV;
      const adcH = (rd3 & rr3) | (rr3 & (1 - adcR3)) | ((1 - adcR3) & rd3);
      ADC_FLAGS[idx] = adcC | (adcZ << 1) | (adcN << 2) | (adcV << 3) | (adcS << 4) | (adcH << 5);

      // --- SBC ---
      const sbcRes = (rd - rr - cin) & 0xff;
      const sbcR7 = (sbcRes >> 7) & 1;
      const sbcR3 = (sbcRes >> 3) & 1;

      const sbcC = ((1 - rd7) & rr7) | (rr7 & sbcR7) | (sbcR7 & (1 - rd7));
      const sbcZ = sbcRes === 0 ? 1 : 0;
      const sbcN = sbcR7;
      const sbcV = (rd7 & (1 - rr7) & (1 - sbcR7)) | ((1 - rd7) & rr7 & sbcR7);
      const sbcS = sbcN ^ sbcV;
      const sbcH = ((1 - rd3) & rr3) | (rr3 & sbcR3) | (sbcR3 & (1 - rd3));
      SBC_FLAGS[idx] = sbcC | (sbcZ << 1) | (sbcN << 2) | (sbcV << 3) | (sbcS << 4) | (sbcH << 5);
    }
  }
}

// Populate 256-entry unary operation LUTs
for (let i = 0; i < 256; i++) {
  const rd = i;

  // --- INC ---
  const incRes = (rd + 1) & 0xff;
  const incN = (incRes >> 7) & 1;
  const incZ = incRes === 0 ? 1 : 0;
  const incV = rd === 0x7f ? 1 : 0;
  const incS = incN ^ incV;
  INC_FLAGS[i] = (incZ << 1) | (incN << 2) | (incV << 3) | (incS << 4);

  // --- DEC ---
  const decRes = (rd - 1) & 0xff;
  const decN = (decRes >> 7) & 1;
  const decZ = decRes === 0 ? 1 : 0;
  const decV = rd === 0x80 ? 1 : 0;
  const decS = decN ^ decV;
  DEC_FLAGS[i] = (decZ << 1) | (decN << 2) | (decV << 3) | (decS << 4);

  // --- NEG ---
  const negRes = (0 - rd) & 0xff;
  const negN = (negRes >> 7) & 1;
  const negZ = negRes === 0 ? 1 : 0;
  const negC = rd !== 0 ? 1 : 0;
  const negV = rd === 0x80 ? 1 : 0;
  const negS = negN ^ negV;
  const r3 = (negRes >> 3) & 1;
  const rd3 = (rd >> 3) & 1;
  const negH = r3 | rd3;
  NEG_FLAGS[i] = negC | (negZ << 1) | (negN << 2) | (negV << 3) | (negS << 4) | (negH << 5);

  // --- COM ---
  const comRes = (~rd) & 0xff;
  const comN = (comRes >> 7) & 1;
  const comZ = comRes === 0 ? 1 : 0;
  const comC = 1;
  const comV = 0;
  const comS = comN ^ comV;
  COM_FLAGS[i] = comC | (comZ << 1) | (comN << 2) | (comV << 3) | (comS << 4);
}

// =========================================================================
// ALU FUNCTIONS INTERFACE
// =========================================================================

export interface IAluContext {
  regs: Uint8Array;
  sreg: number;
  temp: number;
  rampz: number;
}

export class Alu {
  public static add(ctx: IAluContext, rd: number, rr: number): number {
    return aluAdd(ctx, rd, rr);
  }
  public static adc(ctx: IAluContext, rd: number, rr: number): number {
    return aluAdc(ctx, rd, rr);
  }
  public static sub(ctx: IAluContext, rd: number, rr: number): number {
    return aluSub(ctx, rd, rr);
  }
  public static subi(ctx: IAluContext, rd: number, k: number): number {
    return aluSubi(ctx, rd, k);
  }
  public static cp(ctx: IAluContext, rd: number, rr: number): number {
    return aluCp(ctx, rd, rr);
  }
  public static cpi(ctx: IAluContext, rd: number, k: number): number {
    return aluCpi(ctx, rd, k);
  }
  public static sbc(ctx: IAluContext, rd: number, rr: number): number {
    return aluSbc(ctx, rd, rr);
  }
  public static cpc(ctx: IAluContext, rd: number, rr: number): number {
    return aluCpc(ctx, rd, rr);
  }
  public static and(ctx: IAluContext, rd: number, rr: number): number {
    return aluAnd(ctx, rd, rr);
  }
  public static andi(ctx: IAluContext, rd: number, k: number): number {
    return aluAndi(ctx, rd, k);
  }
  public static or(ctx: IAluContext, rd: number, rr: number): number {
    return aluOr(ctx, rd, rr);
  }
  public static ori(ctx: IAluContext, rd: number, k: number): number {
    return aluOri(ctx, rd, k);
  }
  public static eor(ctx: IAluContext, rd: number, rr: number): number {
    return aluEor(ctx, rd, rr);
  }
  public static inc(ctx: IAluContext, rd: number): number {
    return aluInc(ctx, rd);
  }
  public static dec(ctx: IAluContext, rd: number): number {
    return aluDec(ctx, rd);
  }
  public static neg(ctx: IAluContext, rd: number): number {
    return aluNeg(ctx, rd);
  }
  public static com(ctx: IAluContext, rd: number): number {
    return aluCom(ctx, rd);
  }
  public static lsr(ctx: IAluContext, rd: number): number {
    return aluLsr(ctx, rd);
  }
  public static asr(ctx: IAluContext, rd: number): number {
    return aluAsr(ctx, rd);
  }
  public static ror(ctx: IAluContext, rd: number): number {
    return aluRor(ctx, rd);
  }
  public static swap(ctx: IAluContext, rd: number): number {
    return aluSwap(ctx, rd);
  }
}

export function aluAdd(ctx: IAluContext, rd: number, rr: number): number {
  const rdVal = ctx.regs[rd];
  const rrVal = ctx.regs[rr];
  const res = (rdVal + rrVal) & 0xff;
  const idx = (rdVal << 8) | rrVal;
  ctx.sreg = (ctx.sreg & MASK_PRESERVE_IT) | (ADD_FLAGS[idx] & 0x3f);
  ctx.regs[rd] = res;
  return ctx.sreg;
}

export function aluAdc(ctx: IAluContext, rd: number, rr: number): number {
  const rdVal = ctx.regs[rd];
  const rrVal = ctx.regs[rr];
  const cin = ctx.sreg & FLAG_C;
  const res = (rdVal + rrVal + cin) & 0xff;
  const idx = (cin << 16) | (rdVal << 8) | rrVal;
  ctx.sreg = (ctx.sreg & MASK_PRESERVE_IT) | (ADC_FLAGS[idx] & 0x3f);
  ctx.regs[rd] = res;
  return ctx.sreg;
}

export function aluSub(ctx: IAluContext, rd: number, rr: number): number {
  const rdVal = ctx.regs[rd];
  const rrVal = ctx.regs[rr];
  const res = (rdVal - rrVal) & 0xff;
  const idx = (rdVal << 8) | rrVal;
  ctx.sreg = (ctx.sreg & MASK_PRESERVE_IT) | (SUB_FLAGS[idx] & 0x3f);
  ctx.regs[rd] = res;
  return ctx.sreg;
}

export function aluSubi(ctx: IAluContext, rd: number, k: number): number {
  const rdVal = ctx.regs[rd];
  const res = (rdVal - k) & 0xff;
  const idx = (rdVal << 8) | (k & 0xff);
  ctx.sreg = (ctx.sreg & MASK_PRESERVE_IT) | (SUB_FLAGS[idx] & 0x3f);
  ctx.regs[rd] = res;
  return ctx.sreg;
}

export function aluCp(ctx: IAluContext, rd: number, rr: number): number {
  const rdVal = ctx.regs[rd];
  const rrVal = ctx.regs[rr];
  const idx = (rdVal << 8) | rrVal;
  ctx.sreg = (ctx.sreg & MASK_PRESERVE_IT) | (SUB_FLAGS[idx] & 0x3f);
  return ctx.sreg;
}

export function aluCpi(ctx: IAluContext, rd: number, k: number): number {
  const rdVal = ctx.regs[rd];
  const idx = (rdVal << 8) | (k & 0xff);
  ctx.sreg = (ctx.sreg & MASK_PRESERVE_IT) | (SUB_FLAGS[idx] & 0x3f);
  return ctx.sreg;
}

export function aluSbc(ctx: IAluContext, rd: number, rr: number): number {
  const rdVal = ctx.regs[rd];
  const rrVal = ctx.regs[rr];
  const prevSreg = ctx.sreg;
  const cin = prevSreg & FLAG_C;
  const res = (rdVal - rrVal - cin) & 0xff;
  const idx = (cin << 16) | (rdVal << 8) | rrVal;
  const flags = SBC_FLAGS[idx];

  const zMask = (prevSreg & FLAG_Z) === 0 ? ~FLAG_Z : 0xff;
  ctx.sreg = (prevSreg & MASK_PRESERVE_IT) | (flags & 0x3d) | (flags & FLAG_Z & zMask);
  ctx.regs[rd] = res;
  return ctx.sreg;
}

export function aluCpc(ctx: IAluContext, rd: number, rr: number): number {
  const rdVal = ctx.regs[rd];
  const rrVal = ctx.regs[rr];
  const prevSreg = ctx.sreg;
  const cin = prevSreg & FLAG_C;
  const idx = (cin << 16) | (rdVal << 8) | rrVal;
  const flags = SBC_FLAGS[idx];

  const zMask = (prevSreg & FLAG_Z) === 0 ? ~FLAG_Z : 0xff;
  ctx.sreg = (prevSreg & MASK_PRESERVE_IT) | (flags & 0x3d) | (flags & FLAG_Z & zMask);
  return ctx.sreg;
}

export function aluAnd(ctx: IAluContext, rd: number, rr: number): number {
  const rdVal = ctx.regs[rd];
  const rrVal = ctx.regs[rr];
  const res = rdVal & rrVal;
  const idx = (rdVal << 8) | rrVal;
  ctx.sreg = (ctx.sreg & MASK_PRESERVE_ITHC) | AND_FLAGS[idx];
  ctx.regs[rd] = res;
  return ctx.sreg;
}

export function aluAndi(ctx: IAluContext, rd: number, k: number): number {
  const rdVal = ctx.regs[rd];
  const res = rdVal & (k & 0xff);
  const idx = (rdVal << 8) | (k & 0xff);
  ctx.sreg = (ctx.sreg & MASK_PRESERVE_ITHC) | AND_FLAGS[idx];
  ctx.regs[rd] = res;
  return ctx.sreg;
}

export function aluOr(ctx: IAluContext, rd: number, rr: number): number {
  const rdVal = ctx.regs[rd];
  const rrVal = ctx.regs[rr];
  const res = (rdVal | rrVal) & 0xff;
  const idx = (rdVal << 8) | rrVal;
  ctx.sreg = (ctx.sreg & MASK_PRESERVE_ITHC) | OR_FLAGS[idx];
  ctx.regs[rd] = res;
  return ctx.sreg;
}

export function aluOri(ctx: IAluContext, rd: number, k: number): number {
  const rdVal = ctx.regs[rd];
  const res = (rdVal | (k & 0xff)) & 0xff;
  const idx = (rdVal << 8) | (k & 0xff);
  ctx.sreg = (ctx.sreg & MASK_PRESERVE_ITHC) | OR_FLAGS[idx];
  ctx.regs[rd] = res;
  return ctx.sreg;
}

export function aluEor(ctx: IAluContext, rd: number, rr: number): number {
  const rdVal = ctx.regs[rd];
  const rrVal = ctx.regs[rr];
  const res = (rdVal ^ rrVal) & 0xff;
  const idx = (rdVal << 8) | rrVal;
  ctx.sreg = (ctx.sreg & MASK_PRESERVE_ITHC) | EOR_FLAGS[idx];
  ctx.regs[rd] = res;
  return ctx.sreg;
}

export function aluInc(ctx: IAluContext, rd: number): number {
  const rdVal = ctx.regs[rd];
  const res = (rdVal + 1) & 0xff;
  ctx.sreg = (ctx.sreg & MASK_PRESERVE_ITHC) | INC_FLAGS[rdVal];
  ctx.regs[rd] = res;
  return ctx.sreg;
}

export function aluDec(ctx: IAluContext, rd: number): number {
  const rdVal = ctx.regs[rd];
  const res = (rdVal - 1) & 0xff;
  ctx.sreg = (ctx.sreg & MASK_PRESERVE_ITHC) | DEC_FLAGS[rdVal];
  ctx.regs[rd] = res;
  return ctx.sreg;
}

export function aluNeg(ctx: IAluContext, rd: number): number {
  const rdVal = ctx.regs[rd];
  const res = (0 - rdVal) & 0xff;
  ctx.sreg = (ctx.sreg & MASK_PRESERVE_IT) | (NEG_FLAGS[rdVal] & 0x3f);
  ctx.regs[rd] = res;
  return ctx.sreg;
}

export function aluCom(ctx: IAluContext, rd: number): number {
  const rdVal = ctx.regs[rd];
  const res = (~rdVal) & 0xff;
  ctx.sreg = (ctx.sreg & MASK_PRESERVE_ITH) | COM_FLAGS[rdVal];
  ctx.regs[rd] = res;
  return ctx.sreg;
}

export function aluLsr(ctx: IAluContext, rd: number): number {
  const rdVal = ctx.regs[rd];
  const c = rdVal & 1;
  const res = rdVal >> 1;
  const n = 0;
  const z = res === 0 ? 1 : 0;
  const v = n ^ c;
  const s = n ^ v;
  const flags = c | (z << 1) | (n << 2) | (v << 3) | (s << 4);
  ctx.sreg = (ctx.sreg & MASK_PRESERVE_ITH) | flags;
  ctx.regs[rd] = res;
  return ctx.sreg;
}

export function aluAsr(ctx: IAluContext, rd: number): number {
  const rdVal = ctx.regs[rd];
  const c = rdVal & 1;
  const res = ((rdVal >> 1) | (rdVal & 0x80)) & 0xff;
  const n = (res >> 7) & 1;
  const z = res === 0 ? 1 : 0;
  const v = n ^ c;
  const s = n ^ v;
  const flags = c | (z << 1) | (n << 2) | (v << 3) | (s << 4);
  ctx.sreg = (ctx.sreg & MASK_PRESERVE_ITH) | flags;
  ctx.regs[rd] = res;
  return ctx.sreg;
}

export function aluRor(ctx: IAluContext, rd: number): number {
  const rdVal = ctx.regs[rd];
  const cin = ctx.sreg & FLAG_C;
  const cOut = rdVal & 1;
  const res = ((rdVal >> 1) | (cin << 7)) & 0xff;
  const n = (res >> 7) & 1;
  const z = res === 0 ? 1 : 0;
  const v = n ^ cOut;
  const s = n ^ v;
  const flags = cOut | (z << 1) | (n << 2) | (v << 3) | (s << 4);
  ctx.sreg = (ctx.sreg & MASK_PRESERVE_ITH) | flags;
  ctx.regs[rd] = res;
  return ctx.sreg;
}

export function aluSwap(ctx: IAluContext, rd: number): number {
  const rdVal = ctx.regs[rd];
  const res = ((rdVal >> 4) | (rdVal << 4)) & 0xff;
  ctx.regs[rd] = res;
  return ctx.sreg;
}
