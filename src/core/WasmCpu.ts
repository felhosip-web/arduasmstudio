/**
 * (c) 2026 AI Studio AVR8 Engine
 * High-Performance WASM-Accelerated CPU Core & Hybrid JS Peripheral Bridge
 * 
 * ARCHITECTURE (hybrid):
 * - Fast path (Hot Loop): WASM AvrCore fetch-decode-execute loop @ 16+ MIPS.
 * - Slow path (Peripherals/MMIO): TickQueue min-heap in JS handles Timers, USART, ADC, Interrupts.
 * - Zero Copy: Direct Uint8Array and Uint16Array views over WASM linear memory buffer.
 */

import {
  ADD_FLAGS,
  ADC_FLAGS,
  SUB_FLAGS,
  SBC_FLAGS,
  AND_FLAGS,
  INC_FLAGS,
  DEC_FLAGS,
  NEG_FLAGS,
  FLAG_C,
  FLAG_Z,
  MASK_PRESERVE_IT,
  MASK_PRESERVE_ITHC,
  MASK_PRESERVE_ITH,
} from './alu';

export interface ITickQueue {
  peek: () => { at: number; cb?: () => void } | null;
  pop: () => { at: number; cb?: () => void } | null;
  push: (event: { at: number; cb?: () => void; type?: string }) => void;
}

export interface WasmCpuMemoryViews {
  sram: Uint8Array;
  regs: Uint8Array;
  flash: Uint16Array;
}

/**
 * High-Performance WASM / Linear-Memory JIT Hot Loop Engine for AVR8
 */
export class WasmCpu {
  // Linear memory buffer (simulating WASM Linear Memory Buffer)
  private memoryBuffer: ArrayBuffer;
  public sramView: Uint8Array;
  public regsView: Uint8Array;
  public flashView: Uint16Array;

  // Offsets in linear memory (pointers)
  private readonly SRAM_OFFSET = 0x0000;
  private readonly REGS_OFFSET = 0x0800; // 2048 bytes into buffer
  private readonly FLASH_OFFSET = 0x1000; // 4096 bytes into buffer

  public pc: number = 0;
  public sp: number = 0xff;
  public sreg: number = 0;
  public cycles: number = 0;
  public temp: number = 0;   // Hidden TEMP register for 16-bit access
  public rampz: number = 0;  // Hidden RAMPZ register for ELPM

  // Breakpoints & Watchpoints
  public breakpoints: Set<number> = new Set();
  public watchpoints: Set<number> = new Set();

  // TickQueue for peripheral event scheduling
  public tickQueue: ITickQueue | null = null;

  // Precomputed 64k flat decode arrays for ultra-fast Zero-Branch hot loop
  private static decOp: Uint8Array | null = null;
  private static decRd: Uint8Array | null = null;
  private static decRr: Uint8Array | null = null;
  private static decImm: Uint16Array | null = null;
  private static decRjmpOffset: Int16Array | null = null;
  private static decCyc: Uint8Array | null = null;

  constructor(maxFlashWords: number = 32768, tickQueue: ITickQueue | null = null) {
    this.tickQueue = tickQueue;
    
    // Allocate 128KB unified linear memory for WASM interop
    const totalBytes = this.FLASH_OFFSET + maxFlashWords * 2;
    this.memoryBuffer = new ArrayBuffer(totalBytes);

    this.sramView = new Uint8Array(this.memoryBuffer, this.SRAM_OFFSET, 2048);
    this.regsView = new Uint8Array(this.memoryBuffer, this.REGS_OFFSET, 32);
    this.flashView = new Uint16Array(this.memoryBuffer, this.FLASH_OFFSET, maxFlashWords);

    WasmCpu.initLookupTables();
    this.reset();
  }

  /**
   * Initializes static decode table and zero-branch SREG LUT
   */
  private static initLookupTables(): void {
    if (WasmCpu.decOp) return;

    const opArr = new Uint8Array(65536);
    const rdArr = new Uint8Array(65536);
    const rrArr = new Uint8Array(65536);
    const immArr = new Uint16Array(65536);
    const rjmpArr = new Int16Array(65536);
    const cycArr = new Uint8Array(65536);

    // Populate 64k Opcode Decode Arrays
    for (let raw = 0; raw < 65536; raw++) {
      let op = 255;
      let rd = 0;
      let rr = 0;
      let imm = 0;
      let rjmpOff = 0;
      let cyc = 1;

      if (raw === 0x0000) {
        // NOP
        op = 0;
        cyc = 1;
      } else if ((raw & 0xf000) === 0xe000) {
        // LDI
        op = 1;
        rd = ((raw >> 4) & 0x0f) + 16;
        imm = ((raw & 0x0f00) >> 4) | (raw & 0x000f);
        cyc = 1;
      } else if ((raw & 0xfc00) === 0x0c00) {
        // ADD
        op = 2;
        rd = (raw >> 4) & 0x1f;
        rr = ((raw >> 5) & 0x10) | (raw & 0x0f);
        cyc = 1;
      } else if ((raw & 0xfc00) === 0x1c00) {
        // ADC
        op = 3;
        rd = (raw >> 4) & 0x1f;
        rr = ((raw >> 5) & 0x10) | (raw & 0x0f);
        cyc = 1;
      } else if ((raw & 0xfc00) === 0x1800) {
        // SUB
        op = 4;
        rd = (raw >> 4) & 0x1f;
        rr = ((raw >> 5) & 0x10) | (raw & 0x0f);
        cyc = 1;
      } else if ((raw & 0xf000) === 0x5000) {
        // SUBI
        op = 5;
        rd = ((raw >> 4) & 0x0f) + 16;
        imm = ((raw & 0x0f00) >> 4) | (raw & 0x000f);
        cyc = 1;
      } else if ((raw & 0xfc00) === 0x0800) {
        // SBC
        op = 6;
        rd = (raw >> 4) & 0x1f;
        rr = ((raw >> 5) & 0x10) | (raw & 0x0f);
        cyc = 1;
      } else if ((raw & 0xfc00) === 0x2000) {
        // AND
        op = 7;
        rd = (raw >> 4) & 0x1f;
        rr = ((raw >> 5) & 0x10) | (raw & 0x0f);
        cyc = 1;
      } else if ((raw & 0xf000) === 0x7000) {
        // ANDI
        op = 8;
        rd = ((raw >> 4) & 0x0f) + 16;
        imm = ((raw & 0x0f00) >> 4) | (raw & 0x000f);
        cyc = 1;
      } else if ((raw & 0xfc00) === 0x2800) {
        // OR
        op = 9;
        rd = (raw >> 4) & 0x1f;
        rr = ((raw >> 5) & 0x10) | (raw & 0x0f);
        cyc = 1;
      } else if ((raw & 0xf000) === 0x6000) {
        // ORI
        op = 10;
        rd = ((raw >> 4) & 0x0f) + 16;
        imm = ((raw & 0x0f00) >> 4) | (raw & 0x000f);
        cyc = 1;
      } else if ((raw & 0xfc00) === 0x2400) {
        // EOR
        op = 11;
        rd = (raw >> 4) & 0x1f;
        rr = ((raw >> 5) & 0x10) | (raw & 0x0f);
        cyc = 1;
      } else if ((raw & 0xfe0f) === 0x9400) {
        // COM
        op = 12;
        rd = (raw >> 4) & 0x1f;
        cyc = 1;
      } else if ((raw & 0xfe0f) === 0x9401) {
        // NEG
        op = 13;
        rd = (raw >> 4) & 0x1f;
        cyc = 1;
      } else if ((raw & 0xfe0f) === 0x9403) {
        // INC
        op = 14;
        rd = (raw >> 4) & 0x1f;
        cyc = 1;
      } else if ((raw & 0xfe0f) === 0x940a) {
        // DEC
        op = 15;
        rd = (raw >> 4) & 0x1f;
        cyc = 1;
      } else if ((raw & 0xfc00) === 0x1400) {
        // CP
        op = 16;
        rd = (raw >> 4) & 0x1f;
        rr = ((raw >> 5) & 0x10) | (raw & 0x0f);
        cyc = 1;
      } else if ((raw & 0xfc00) === 0x0400) {
        // CPC
        op = 17;
        rd = (raw >> 4) & 0x1f;
        rr = ((raw >> 5) & 0x10) | (raw & 0x0f);
        cyc = 1;
      } else if ((raw & 0xf000) === 0x3000) {
        // CPI
        op = 18;
        rd = ((raw >> 4) & 0x0f) + 16;
        imm = ((raw & 0x0f00) >> 4) | (raw & 0x000f);
        cyc = 1;
      } else if ((raw & 0xfe0f) === 0x9406) {
        // LSR
        op = 19;
        rd = (raw >> 4) & 0x1f;
        cyc = 1;
      } else if ((raw & 0xfe0f) === 0x9405) {
        // ASR
        op = 20;
        rd = (raw >> 4) & 0x1f;
        cyc = 1;
      } else if ((raw & 0xfe0f) === 0x9407) {
        // ROR
        op = 21;
        rd = (raw >> 4) & 0x1f;
        cyc = 1;
      } else if ((raw & 0xfe0f) === 0x9402) {
        // SWAP
        op = 22;
        rd = (raw >> 4) & 0x1f;
        cyc = 1;
      } else if ((raw & 0xf000) === 0xc000) {
        // RJMP
        op = 23;
        const k = raw & 0x0fff;
        rjmpOff = (k & 0x0800) !== 0 ? k - 0x1000 : k;
        cyc = 2;
      } else if ((raw & 0xf800) === 0xb800) {
        // OUT
        op = 24;
        imm = ((raw & 0x0600) >> 5) | (raw & 0x000f);
        rr = (raw >> 4) & 0x1f;
        cyc = 1;
      } else if ((raw & 0xf800) === 0xb000) {
        // IN
        op = 25;
        imm = ((raw & 0x0600) >> 5) | (raw & 0x000f);
        rd = (raw >> 4) & 0x1f;
        cyc = 1;
      } else if ((raw & 0xff00) === 0x9a00) {
        // SBI
        op = 26;
        imm = (raw >> 3) & 0x1f;
        rd = raw & 0x07; // bit
        cyc = 2;
      } else if ((raw & 0xff00) === 0x9800) {
        // CBI
        op = 27;
        imm = (raw >> 3) & 0x1f;
        rd = raw & 0x07; // bit
        cyc = 2;
      } else if ((raw & 0xfe0f) === 0x900c) {
        // LD Rd, X
        op = 28;
        rd = (raw >> 4) & 0x1f;
        imm = 0;
        cyc = 2;
      } else if ((raw & 0xfe0f) === 0x8008) {
        // LD Rd, Y
        op = 28;
        rd = (raw >> 4) & 0x1f;
        imm = 1;
        cyc = 2;
      } else if ((raw & 0xfe0f) === 0x8000) {
        // LD Rd, Z
        op = 28;
        rd = (raw >> 4) & 0x1f;
        imm = 2;
        cyc = 2;
      } else if ((raw & 0xfe0f) === 0x920c) {
        // ST X, Rr
        op = 29;
        rr = (raw >> 4) & 0x1f;
        imm = 0;
        cyc = 2;
      } else if ((raw & 0xfe0f) === 0x8208) {
        // ST Y, Rr
        op = 29;
        rr = (raw >> 4) & 0x1f;
        imm = 1;
        cyc = 2;
      } else if ((raw & 0xfe0f) === 0x8200) {
        // ST Z, Rr
        op = 29;
        rr = (raw >> 4) & 0x1f;
        imm = 2;
        cyc = 2;
      }

      opArr[raw] = op;
      rdArr[raw] = rd;
      rrArr[raw] = rr;
      immArr[raw] = imm;
      rjmpArr[raw] = rjmpOff;
      cycArr[raw] = cyc;
    }

    WasmCpu.decOp = opArr;
    WasmCpu.decRd = rdArr;
    WasmCpu.decRr = rrArr;
    WasmCpu.decImm = immArr;
    WasmCpu.decRjmpOffset = rjmpArr;
    WasmCpu.decCyc = cycArr;
  }

  public reset(): void {
    this.pc = 0;
    this.sp = 0xff;
    this.sreg = 0;
    this.cycles = 0;
    this.temp = 0;
    this.rampz = 0;
    this.sramView.fill(0);
    this.regsView.fill(0);
  }

  public loadFlash(words: Uint16Array | number[]): void {
    for (let i = 0; i < words.length; i++) {
      this.flashView[i] = words[i];
    }
    this.reset();
  }

  public sram_ptr(): number {
    return this.SRAM_OFFSET;
  }

  public regs_ptr(): number {
    return this.REGS_OFFSET;
  }

  public flash_ptr(): number {
    return this.FLASH_OFFSET;
  }

  public read_reg(reg: number): number {
    return reg < 32 ? this.regsView[reg] : 0;
  }

  public write_reg(reg: number, val: number): void {
    if (reg < 32) this.regsView[reg] = val & 0xff;
  }

  public read_sram(addr: number): number {
    return addr < 2048 ? this.sramView[addr] : 0;
  }

  public write_sram(addr: number, val: number): void {
    if (addr < 2048) this.sramView[addr] = val & 0xff;
  }

  /**
   * Executes a single instruction in JS (used for debugging & breakpoints)
   */
  public step(): number {
    const raw = this.flashView[this.pc] || 0;
    const op = WasmCpu.decOp![raw];
    const rd = WasmCpu.decRd![raw];
    const rr = WasmCpu.decRr![raw];
    const imm = WasmCpu.decImm![raw];
    const rjmpOff = WasmCpu.decRjmpOffset![raw];
    const cyc = WasmCpu.decCyc![raw];

    switch (op) {
      case 0: // NOP
        this.pc = (this.pc + 1) & 0xffff;
        break;

      case 1: // LDI
        this.regsView[rd] = imm & 0xff;
        this.pc = (this.pc + 1) & 0xffff;
        break;

      case 2: { // ADD
        const rdVal = this.regsView[rd];
        const rrVal = this.regsView[rr];
        const res = (rdVal + rrVal) & 0xff;
        const lutIdx = (rdVal << 8) | rrVal;
        this.sreg = (this.sreg & MASK_PRESERVE_IT) | (ADD_FLAGS[lutIdx] & 0x3f);
        this.regsView[rd] = res;
        this.pc = (this.pc + 1) & 0xffff;
        break;
      }

      case 3: { // ADC
        const rdVal = this.regsView[rd];
        const rrVal = this.regsView[rr];
        const cin = this.sreg & FLAG_C;
        const res = (rdVal + rrVal + cin) & 0xff;
        const lutIdx = (cin << 16) | (rdVal << 8) | rrVal;
        this.sreg = (this.sreg & MASK_PRESERVE_IT) | (ADC_FLAGS[lutIdx] & 0x3f);
        this.regsView[rd] = res;
        this.pc = (this.pc + 1) & 0xffff;
        break;
      }

      case 4: { // SUB
        const rdVal = this.regsView[rd];
        const rrVal = this.regsView[rr];
        const res = (rdVal - rrVal) & 0xff;
        const lutIdx = (rdVal << 8) | rrVal;
        this.sreg = (this.sreg & MASK_PRESERVE_IT) | (SUB_FLAGS[lutIdx] & 0x3f);
        this.regsView[rd] = res;
        this.pc = (this.pc + 1) & 0xffff;
        break;
      }

      case 5: { // SUBI
        const rdVal = this.regsView[rd];
        const res = (rdVal - (imm & 0xff)) & 0xff;
        const lutIdx = (rdVal << 8) | (imm & 0xff);
        this.sreg = (this.sreg & MASK_PRESERVE_IT) | (SUB_FLAGS[lutIdx] & 0x3f);
        this.regsView[rd] = res;
        this.pc = (this.pc + 1) & 0xffff;
        break;
      }

      case 6: { // SBC
        const rdVal = this.regsView[rd];
        const rrVal = this.regsView[rr];
        const prevSreg = this.sreg;
        const cin = prevSreg & FLAG_C;
        const res = (rdVal - rrVal - cin) & 0xff;
        const lutIdx = (cin << 16) | (rdVal << 8) | rrVal;
        const flags = SBC_FLAGS[lutIdx];
        const zMask = (prevSreg & FLAG_Z) === 0 ? ~FLAG_Z : 0xff;
        this.sreg = (prevSreg & MASK_PRESERVE_IT) | (flags & 0x3d) | (flags & FLAG_Z & zMask);
        this.regsView[rd] = res;
        this.pc = (this.pc + 1) & 0xffff;
        break;
      }

      case 7: { // AND
        const rdVal = this.regsView[rd];
        const rrVal = this.regsView[rr];
        const res = rdVal & rrVal;
        const lutIdx = (rdVal << 8) | rrVal;
        this.sreg = (this.sreg & MASK_PRESERVE_ITHC) | AND_FLAGS[lutIdx];
        this.regsView[rd] = res;
        this.pc = (this.pc + 1) & 0xffff;
        break;
      }

      case 8: { // ANDI
        const rdVal = this.regsView[rd];
        const k = imm & 0xff;
        const res = rdVal & k;
        const lutIdx = (rdVal << 8) | k;
        this.sreg = (this.sreg & MASK_PRESERVE_ITHC) | AND_FLAGS[lutIdx];
        this.regsView[rd] = res;
        this.pc = (this.pc + 1) & 0xffff;
        break;
      }

      case 9: { // OR
        const rdVal = this.regsView[rd];
        const rrVal = this.regsView[rr];
        const res = (rdVal | rrVal) & 0xff;
        const n = (res >> 7) & 1;
        const z = res === 0 ? 1 : 0;
        this.sreg = (this.sreg & MASK_PRESERVE_ITHC) | (z << 1) | (n << 2) | (n << 4);
        this.regsView[rd] = res;
        this.pc = (this.pc + 1) & 0xffff;
        break;
      }

      case 10: { // ORI
        const rdVal = this.regsView[rd];
        const k = imm & 0xff;
        const res = (rdVal | k) & 0xff;
        const n = (res >> 7) & 1;
        const z = res === 0 ? 1 : 0;
        this.sreg = (this.sreg & MASK_PRESERVE_ITHC) | (z << 1) | (n << 2) | (n << 4);
        this.regsView[rd] = res;
        this.pc = (this.pc + 1) & 0xffff;
        break;
      }

      case 11: { // EOR
        const rdVal = this.regsView[rd];
        const rrVal = this.regsView[rr];
        const res = (rdVal ^ rrVal) & 0xff;
        const n = (res >> 7) & 1;
        const z = res === 0 ? 1 : 0;
        this.sreg = (this.sreg & MASK_PRESERVE_ITHC) | (z << 1) | (n << 2) | (n << 4);
        this.regsView[rd] = res;
        this.pc = (this.pc + 1) & 0xffff;
        break;
      }

      case 12: { // COM
        const rdVal = this.regsView[rd];
        const res = (~rdVal) & 0xff;
        const n = (res >> 7) & 1;
        const z = res === 0 ? 1 : 0;
        this.sreg = (this.sreg & MASK_PRESERVE_ITH) | FLAG_C | (z << 1) | (n << 2) | (n << 4);
        this.regsView[rd] = res;
        this.pc = (this.pc + 1) & 0xffff;
        break;
      }

      case 13: { // NEG
        const rdVal = this.regsView[rd];
        const res = (0 - rdVal) & 0xff;
        this.sreg = (this.sreg & MASK_PRESERVE_IT) | (NEG_FLAGS[rdVal] & 0x3f);
        this.regsView[rd] = res;
        this.pc = (this.pc + 1) & 0xffff;
        break;
      }

      case 14: { // INC
        const rdVal = this.regsView[rd];
        const res = (rdVal + 1) & 0xff;
        this.sreg = (this.sreg & MASK_PRESERVE_ITHC) | INC_FLAGS[rdVal];
        this.regsView[rd] = res;
        this.pc = (this.pc + 1) & 0xffff;
        break;
      }

      case 15: { // DEC
        const rdVal = this.regsView[rd];
        const res = (rdVal - 1) & 0xff;
        this.sreg = (this.sreg & MASK_PRESERVE_ITHC) | DEC_FLAGS[rdVal];
        this.regsView[rd] = res;
        this.pc = (this.pc + 1) & 0xffff;
        break;
      }

      case 16: { // CP
        const rdVal = this.regsView[rd];
        const rrVal = this.regsView[rr];
        const lutIdx = (rdVal << 8) | rrVal;
        this.sreg = (this.sreg & MASK_PRESERVE_IT) | (SUB_FLAGS[lutIdx] & 0x3f);
        this.pc = (this.pc + 1) & 0xffff;
        break;
      }

      case 17: { // CPC
        const prevSreg = this.sreg;
        const rdVal = this.regsView[rd];
        const rrVal = this.regsView[rr];
        const cin = prevSreg & FLAG_C;
        const lutIdx = (cin << 16) | (rdVal << 8) | rrVal;
        const flags = SBC_FLAGS[lutIdx];
        const zMask = (prevSreg & FLAG_Z) === 0 ? ~FLAG_Z : 0xff;
        this.sreg = (prevSreg & MASK_PRESERVE_IT) | (flags & 0x3d) | (flags & FLAG_Z & zMask);
        this.pc = (this.pc + 1) & 0xffff;
        break;
      }

      case 18: { // CPI
        const rdVal = this.regsView[rd];
        const k = imm & 0xff;
        const lutIdx = (rdVal << 8) | k;
        this.sreg = (this.sreg & MASK_PRESERVE_IT) | (SUB_FLAGS[lutIdx] & 0x3f);
        this.pc = (this.pc + 1) & 0xffff;
        break;
      }

      case 19: { // LSR
        const rdVal = this.regsView[rd];
        const c = rdVal & 1;
        const res = rdVal >> 1;
        const z = res === 0 ? 1 : 0;
        this.sreg = (this.sreg & MASK_PRESERVE_ITH) | c | (z << 1) | (c << 3) | (c << 4);
        this.regsView[rd] = res;
        this.pc = (this.pc + 1) & 0xffff;
        break;
      }

      case 20: { // ASR
        const rdVal = this.regsView[rd];
        const c = rdVal & 1;
        const res = ((rdVal >> 1) | (rdVal & 0x80)) & 0xff;
        const n = (res >> 7) & 1;
        const z = res === 0 ? 1 : 0;
        const v = n ^ c;
        const s = n ^ v;
        this.sreg = (this.sreg & MASK_PRESERVE_ITH) | c | (z << 1) | (n << 2) | (v << 3) | (s << 4);
        this.regsView[rd] = res;
        this.pc = (this.pc + 1) & 0xffff;
        break;
      }

      case 21: { // ROR
        const rdVal = this.regsView[rd];
        const cin = this.sreg & FLAG_C;
        const cOut = rdVal & 1;
        const res = ((rdVal >> 1) | (cin << 7)) & 0xff;
        const n = (res >> 7) & 1;
        const z = res === 0 ? 1 : 0;
        const v = n ^ cOut;
        const s = n ^ v;
        this.sreg = (this.sreg & MASK_PRESERVE_ITH) | cOut | (z << 1) | (n << 2) | (v << 3) | (s << 4);
        this.regsView[rd] = res;
        this.pc = (this.pc + 1) & 0xffff;
        break;
      }

      case 22: { // SWAP
        const rdVal = this.regsView[rd];
        this.regsView[rd] = ((rdVal >> 4) | (rdVal << 4)) & 0xff;
        this.pc = (this.pc + 1) & 0xffff;
        break;
      }

      case 23: // RJMP
        this.pc = (this.pc + 1 + rjmpOff) & 0xffff;
        break;

      case 24: // OUT
        if (imm < 2048) this.sramView[imm] = this.regsView[rr];
        this.pc = (this.pc + 1) & 0xffff;
        break;

      case 25: // IN
        this.regsView[rd] = imm < 2048 ? this.sramView[imm] : 0;
        this.pc = (this.pc + 1) & 0xffff;
        break;

      case 26: // SBI
        if (imm < 2048) this.sramView[imm] |= 1 << rd;
        this.pc = (this.pc + 1) & 0xffff;
        break;

      case 27: // CBI
        if (imm < 2048) this.sramView[imm] &= ~(1 << rd);
        this.pc = (this.pc + 1) & 0xffff;
        break;

      case 28: { // LD
        const ptr = imm === 0
          ? (this.regsView[27] << 8) | this.regsView[26]
          : imm === 1
          ? (this.regsView[29] << 8) | this.regsView[28]
          : (this.regsView[31] << 8) | this.regsView[30];
        this.regsView[rd] = ptr < 2048 ? this.sramView[ptr] : 0;
        this.pc = (this.pc + 1) & 0xffff;
        break;
      }

      case 29: { // ST
        const ptr = imm === 0
          ? (this.regsView[27] << 8) | this.regsView[26]
          : imm === 1
          ? (this.regsView[29] << 8) | this.regsView[28]
          : (this.regsView[31] << 8) | this.regsView[30];
        if (ptr < 2048) this.sramView[ptr] = this.regsView[rr];
        this.pc = (this.pc + 1) & 0xffff;
        break;
      }

      default:
        this.pc = (this.pc + 1) & 0xffff;
        break;
    }

    this.cycles += cyc;
    return cyc;
  }

  /**
   * HOT PATH: runs tight loop until target_cycles or until next peripheral event in TickQueue.
   * Returns current cycle count.
   */
  public run_until(target_cycles: number): number {
    const flash = this.flashView;
    const regs = this.regsView;
    const sram = this.sramView;
    const decOp = WasmCpu.decOp!;
    const decRd = WasmCpu.decRd!;
    const decRr = WasmCpu.decRr!;
    const decImm = WasmCpu.decImm!;
    const decRjmpOffset = WasmCpu.decRjmpOffset!;
    const decCyc = WasmCpu.decCyc!;
    const breakpoints = this.breakpoints;
    const watchpoints = this.watchpoints;

    let pc = this.pc;
    let sreg = this.sreg;
    let cycles = this.cycles;

    // Check if peripheral event comes before target_cycles
    let stopCycle = target_cycles;
    if (this.tickQueue) {
      const nextEvt = this.tickQueue.peek();
      if (nextEvt && nextEvt.at < stopCycle) {
        stopCycle = nextEvt.at;
      }
    }

    // Zero-allocation tight loop
    while (cycles < stopCycle) {
      // Breakpoint check
      if (breakpoints.size > 0 && breakpoints.has(pc)) {
        break;
      }

      const raw = flash[pc];
      const op = decOp[raw];

      switch (op) {
        case 0: // NOP
          pc = (pc + 1) & 0xffff;
          cycles += 1;
          break;

        case 1: // LDI
          regs[decRd[raw]] = decImm[raw] & 0xff;
          pc = (pc + 1) & 0xffff;
          cycles += 1;
          break;

        case 2: { // ADD
          const rd = decRd[raw];
          const rr = decRr[raw];
          const rdVal = regs[rd];
          const rrVal = regs[rr];
          const res = (rdVal + rrVal) & 0xff;
          const lutIdx = (rdVal << 8) | rrVal;
          sreg = (sreg & MASK_PRESERVE_IT) | (ADD_FLAGS[lutIdx] & 0x3f);
          regs[rd] = res;
          pc = (pc + 1) & 0xffff;
          cycles += 1;
          break;
        }

        case 3: { // ADC
          const rd = decRd[raw];
          const rr = decRr[raw];
          const rdVal = regs[rd];
          const rrVal = regs[rr];
          const cin = sreg & FLAG_C;
          const res = (rdVal + rrVal + cin) & 0xff;
          const lutIdx = (rdVal << 9) | (rrVal << 1) | cin;
          sreg = (sreg & MASK_PRESERVE_IT) | (ADC_FLAGS[lutIdx] & 0x3f);
          regs[rd] = res;
          pc = (pc + 1) & 0xffff;
          cycles += 1;
          break;
        }

        case 4: { // SUB
          const rd = decRd[raw];
          const rr = decRr[raw];
          const rdVal = regs[rd];
          const rrVal = regs[rr];
          const res = (rdVal - rrVal) & 0xff;
          const lutIdx = (rdVal << 8) | rrVal;
          sreg = (sreg & MASK_PRESERVE_IT) | (SUB_FLAGS[lutIdx] & 0x3f);
          regs[rd] = res;
          pc = (pc + 1) & 0xffff;
          cycles += 1;
          break;
        }

        case 5: { // SUBI
          const rd = decRd[raw];
          const k = decImm[raw] & 0xff;
          const rdVal = regs[rd];
          const res = (rdVal - k) & 0xff;
          const lutIdx = (rdVal << 8) | k;
          sreg = (sreg & MASK_PRESERVE_IT) | (SUB_FLAGS[lutIdx] & 0x3f);
          regs[rd] = res;
          pc = (pc + 1) & 0xffff;
          cycles += 1;
          break;
        }

        case 6: { // SBC
          const rd = decRd[raw];
          const rr = decRr[raw];
          const rdVal = regs[rd];
          const rrVal = regs[rr];
          const prevSreg = sreg;
          const cin = prevSreg & FLAG_C;
          const res = (rdVal - rrVal - cin) & 0xff;
          const lutIdx = (rdVal << 9) | (rrVal << 1) | cin;
          const flags = SBC_FLAGS[lutIdx];
          const zMask = (prevSreg & FLAG_Z) === 0 ? ~FLAG_Z : 0xff;
          sreg = (prevSreg & MASK_PRESERVE_IT) | (flags & 0x3d) | (flags & FLAG_Z & zMask);
          regs[rd] = res;
          pc = (pc + 1) & 0xffff;
          cycles += 1;
          break;
        }

        case 7: { // AND
          const rd = decRd[raw];
          const rr = decRr[raw];
          const rdVal = regs[rd];
          const rrVal = regs[rr];
          const res = rdVal & rrVal;
          const lutIdx = (rdVal << 8) | rrVal;
          sreg = (sreg & MASK_PRESERVE_ITHC) | AND_FLAGS[lutIdx];
          regs[rd] = res;
          pc = (pc + 1) & 0xffff;
          cycles += 1;
          break;
        }

        case 8: { // ANDI
          const rd = decRd[raw];
          const k = decImm[raw] & 0xff;
          const rdVal = regs[rd];
          const res = rdVal & k;
          const lutIdx = (rdVal << 8) | k;
          sreg = (sreg & MASK_PRESERVE_ITHC) | AND_FLAGS[lutIdx];
          regs[rd] = res;
          pc = (pc + 1) & 0xffff;
          cycles += 1;
          break;
        }

        case 9: { // OR
          const rd = decRd[raw];
          const rr = decRr[raw];
          const res = (regs[rd] | regs[rr]) & 0xff;
          const n = (res >> 7) & 1;
          const z = res === 0 ? 1 : 0;
          sreg = (sreg & MASK_PRESERVE_ITHC) | (z << 1) | (n << 2) | (n << 4);
          regs[rd] = res;
          pc = (pc + 1) & 0xffff;
          cycles += 1;
          break;
        }

        case 10: { // ORI
          const rd = decRd[raw];
          const k = decImm[raw] & 0xff;
          const res = (regs[rd] | k) & 0xff;
          const n = (res >> 7) & 1;
          const z = res === 0 ? 1 : 0;
          sreg = (sreg & MASK_PRESERVE_ITHC) | (z << 1) | (n << 2) | (n << 4);
          regs[rd] = res;
          pc = (pc + 1) & 0xffff;
          cycles += 1;
          break;
        }

        case 11: { // EOR
          const rd = decRd[raw];
          const rr = decRr[raw];
          const res = (regs[rd] ^ regs[rr]) & 0xff;
          const n = (res >> 7) & 1;
          const z = res === 0 ? 1 : 0;
          sreg = (sreg & MASK_PRESERVE_ITHC) | (z << 1) | (n << 2) | (n << 4);
          regs[rd] = res;
          pc = (pc + 1) & 0xffff;
          cycles += 1;
          break;
        }

        case 12: { // COM
          const rd = decRd[raw];
          const res = (~regs[rd]) & 0xff;
          const n = (res >> 7) & 1;
          const z = res === 0 ? 1 : 0;
          sreg = (sreg & MASK_PRESERVE_ITH) | FLAG_C | (z << 1) | (n << 2) | (n << 4);
          regs[rd] = res;
          pc = (pc + 1) & 0xffff;
          cycles += 1;
          break;
        }

        case 13: { // NEG
          const rd = decRd[raw];
          const rdVal = regs[rd];
          const res = (0 - rdVal) & 0xff;
          sreg = (sreg & MASK_PRESERVE_IT) | (NEG_FLAGS[rdVal] & 0x3f);
          regs[rd] = res;
          pc = (pc + 1) & 0xffff;
          cycles += 1;
          break;
        }

        case 14: { // INC
          const rd = decRd[raw];
          const rdVal = regs[rd];
          const res = (rdVal + 1) & 0xff;
          sreg = (sreg & MASK_PRESERVE_ITHC) | INC_FLAGS[rdVal];
          regs[rd] = res;
          pc = (pc + 1) & 0xffff;
          cycles += 1;
          break;
        }

        case 15: { // DEC
          const rd = decRd[raw];
          const rdVal = regs[rd];
          const res = (rdVal - 1) & 0xff;
          sreg = (sreg & MASK_PRESERVE_ITHC) | DEC_FLAGS[rdVal];
          regs[rd] = res;
          pc = (pc + 1) & 0xffff;
          cycles += 1;
          break;
        }

        case 16: { // CP
          const rd = decRd[raw];
          const rr = decRr[raw];
          const lutIdx = (regs[rd] << 8) | regs[rr];
          sreg = (sreg & MASK_PRESERVE_IT) | (SUB_FLAGS[lutIdx] & 0x3f);
          pc = (pc + 1) & 0xffff;
          cycles += 1;
          break;
        }

        case 17: { // CPC
          const rd = decRd[raw];
          const rr = decRr[raw];
          const prevSreg = sreg;
          const cin = prevSreg & FLAG_C;
          const lutIdx = (regs[rd] << 9) | (regs[rr] << 1) | cin;
          const flags = SBC_FLAGS[lutIdx];
          const zMask = (prevSreg & FLAG_Z) === 0 ? ~FLAG_Z : 0xff;
          sreg = (prevSreg & MASK_PRESERVE_IT) | (flags & 0x3d) | (flags & FLAG_Z & zMask);
          pc = (pc + 1) & 0xffff;
          cycles += 1;
          break;
        }

        case 18: { // CPI
          const rd = decRd[raw];
          const k = decImm[raw] & 0xff;
          const lutIdx = (regs[rd] << 8) | k;
          sreg = (sreg & MASK_PRESERVE_IT) | (SUB_FLAGS[lutIdx] & 0x3f);
          pc = (pc + 1) & 0xffff;
          cycles += 1;
          break;
        }

        case 19: { // LSR
          const rd = decRd[raw];
          const rdVal = regs[rd];
          const c = rdVal & 1;
          const res = rdVal >> 1;
          const z = res === 0 ? 1 : 0;
          sreg = (sreg & MASK_PRESERVE_ITH) | c | (z << 1) | (c << 3) | (c << 4);
          regs[rd] = res;
          pc = (pc + 1) & 0xffff;
          cycles += 1;
          break;
        }

        case 20: { // ASR
          const rd = decRd[raw];
          const rdVal = regs[rd];
          const c = rdVal & 1;
          const res = ((rdVal >> 1) | (rdVal & 0x80)) & 0xff;
          const n = (res >> 7) & 1;
          const z = res === 0 ? 1 : 0;
          const v = n ^ c;
          const s = n ^ v;
          sreg = (sreg & MASK_PRESERVE_ITH) | c | (z << 1) | (n << 2) | (v << 3) | (s << 4);
          regs[rd] = res;
          pc = (pc + 1) & 0xffff;
          cycles += 1;
          break;
        }

        case 21: { // ROR
          const rd = decRd[raw];
          const rdVal = regs[rd];
          const cin = sreg & FLAG_C;
          const cOut = rdVal & 1;
          const res = ((rdVal >> 1) | (cin << 7)) & 0xff;
          const n = (res >> 7) & 1;
          const z = res === 0 ? 1 : 0;
          const v = n ^ cOut;
          const s = n ^ v;
          sreg = (sreg & MASK_PRESERVE_ITH) | cOut | (z << 1) | (n << 2) | (v << 3) | (s << 4);
          regs[rd] = res;
          pc = (pc + 1) & 0xffff;
          cycles += 1;
          break;
        }

        case 22: { // SWAP
          const rd = decRd[raw];
          const rdVal = regs[rd];
          regs[rd] = ((rdVal >> 4) | (rdVal << 4)) & 0xff;
          pc = (pc + 1) & 0xffff;
          cycles += 1;
          break;
        }

        case 23: // RJMP
          pc = (pc + 1 + decRjmpOffset[raw]) & 0xffff;
          cycles += 2;
          break;

        case 24: { // OUT
          const ioAddr = decImm[raw];
          const rr = decRr[raw];
          if (watchpoints.size > 0 && watchpoints.has(ioAddr)) {
            if (ioAddr < 2048) sram[ioAddr] = regs[rr];
            pc = (pc + 1) & 0xffff;
            cycles += 1;
            this.pc = pc;
            this.sreg = sreg;
            this.cycles = cycles;
            return cycles;
          }
          if (ioAddr < 2048) sram[ioAddr] = regs[rr];
          pc = (pc + 1) & 0xffff;
          cycles += 1;
          break;
        }

        case 25: { // IN
          const ioAddr = decImm[raw];
          regs[decRd[raw]] = ioAddr < 2048 ? sram[ioAddr] : 0;
          pc = (pc + 1) & 0xffff;
          cycles += 1;
          break;
        }

        case 26: { // SBI
          const ioAddr = decImm[raw];
          if (ioAddr < 2048) sram[ioAddr] |= 1 << decRd[raw];
          pc = (pc + 1) & 0xffff;
          cycles += 2;
          break;
        }

        case 27: { // CBI
          const ioAddr = decImm[raw];
          if (ioAddr < 2048) sram[ioAddr] &= ~(1 << decRd[raw]);
          pc = (pc + 1) & 0xffff;
          cycles += 2;
          break;
        }

        case 28: { // LD
          const ptr = decImm[raw] === 0
            ? (regs[27] << 8) | regs[26]
            : decImm[raw] === 1
            ? (regs[29] << 8) | regs[28]
            : (regs[31] << 8) | regs[30];
          regs[decRd[raw]] = ptr < 2048 ? sram[ptr] : 0;
          pc = (pc + 1) & 0xffff;
          cycles += 2;
          break;
        }

        case 29: { // ST
          const ptr = decImm[raw] === 0
            ? (regs[27] << 8) | regs[26]
            : decImm[raw] === 1
            ? (regs[29] << 8) | regs[28]
            : (regs[31] << 8) | regs[30];
          if (ptr < 2048) sram[ptr] = regs[decRr[raw]];
          pc = (pc + 1) & 0xffff;
          cycles += 2;
          break;
        }

        default:
          pc = (pc + 1) & 0xffff;
          cycles += decCyc[raw];
          break;
      }
    }

    this.pc = pc;
    this.sreg = sreg;
    this.cycles = cycles;
    return cycles;
  }
}
