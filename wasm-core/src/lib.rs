use wasm_bindgen::prelude::*;

pub mod alu;
use alu::IAluState;

// =========================================================================
// 1. INSTRUCTION DECODING & TYPES
// =========================================================================

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
#[repr(u8)]
pub enum Opcode {
    Nop = 0,
    Ldi = 1,
    Add = 2,
    Adc = 3,
    Sub = 4,
    Subi = 5,
    Sbc = 6,
    And = 7,
    Andi = 8,
    Or = 9,
    Ori = 10,
    Eor = 11,
    Com = 12,
    Neg = 13,
    Inc = 14,
    Dec = 15,
    Cp = 16,
    Cpc = 17,
    Cpi = 18,
    Lsr = 19,
    Asr = 20,
    Ror = 21,
    Swap = 22,
    Rjmp = 23,
    Out = 24,
    In = 25,
    Sbi = 26,
    Cbi = 27,
    Ld = 28,
    St = 29,
    Unknown = 255,
}

#[derive(Clone, Copy, Debug)]
#[repr(C)]
pub struct DecodedInstruction {
    pub op: Opcode,
    pub rd: u8,
    pub rr: u8,
    pub imm: u16,
    pub cycles: u8,
}

const fn decode_instruction(raw: u16) -> DecodedInstruction {
    // 1. NOP: 0x0000
    if raw == 0x0000 {
        return DecodedInstruction {
            op: Opcode::Nop,
            rd: 0,
            rr: 0,
            imm: 0,
            cycles: 1,
        };
    }

    // 2. LDI: 1110 KKKK dddd KKKK (d is 0..15 -> r16..r31)
    if (raw & 0xF000) == 0xE000 {
        let d = ((raw >> 4) & 0x0F) as u8 + 16;
        let k = (((raw & 0x0F00) >> 4) | (raw & 0x000F)) as u16;
        return DecodedInstruction {
            op: Opcode::Ldi,
            rd: d,
            rr: 0,
            imm: k,
            cycles: 1,
        };
    }

    // 3. ADD: 0000 11rd dddd rrrr
    if (raw & 0xFC00) == 0x0C00 {
        let rd = ((raw >> 4) & 0x1F) as u8;
        let rr = (((raw >> 5) & 0x10) | (raw & 0x0F)) as u8;
        return DecodedInstruction {
            op: Opcode::Add,
            rd,
            rr,
            imm: 0,
            cycles: 1,
        };
    }

    // 4. ADC: 0001 11rd dddd rrrr
    if (raw & 0xFC00) == 0x1C00 {
        let rd = ((raw >> 4) & 0x1F) as u8;
        let rr = (((raw >> 5) & 0x10) | (raw & 0x0F)) as u8;
        return DecodedInstruction {
            op: Opcode::Adc,
            rd,
            rr,
            imm: 0,
            cycles: 1,
        };
    }

    // 5. SUB: 0001 10rd dddd rrrr
    if (raw & 0xFC00) == 0x1800 {
        let rd = ((raw >> 4) & 0x1F) as u8;
        let rr = (((raw >> 5) & 0x10) | (raw & 0x0F)) as u8;
        return DecodedInstruction {
            op: Opcode::Sub,
            rd,
            rr,
            imm: 0,
            cycles: 1,
        };
    }

    // 6. SUBI: 0101 KKKK dddd KKKK (d is 0..15 -> r16..r31)
    if (raw & 0xF000) == 0x5000 {
        let d = ((raw >> 4) & 0x0F) as u8 + 16;
        let k = (((raw & 0x0F00) >> 4) | (raw & 0x000F)) as u16;
        return DecodedInstruction {
            op: Opcode::Subi,
            rd: d,
            rr: 0,
            imm: k,
            cycles: 1,
        };
    }

    // 7. SBC: 0000 10rd dddd rrrr
    if (raw & 0xFC00) == 0x0800 {
        let rd = ((raw >> 4) & 0x1F) as u8;
        let rr = (((raw >> 5) & 0x10) | (raw & 0x0F)) as u8;
        return DecodedInstruction {
            op: Opcode::Sbc,
            rd,
            rr,
            imm: 0,
            cycles: 1,
        };
    }

    // 8. AND: 0010 00rd dddd rrrr
    if (raw & 0xFC00) == 0x2000 {
        let rd = ((raw >> 4) & 0x1F) as u8;
        let rr = (((raw >> 5) & 0x10) | (raw & 0x0F)) as u8;
        return DecodedInstruction {
            op: Opcode::And,
            rd,
            rr,
            imm: 0,
            cycles: 1,
        };
    }

    // 9. ANDI: 0111 KKKK dddd KKKK
    if (raw & 0xF000) == 0x7000 {
        let d = ((raw >> 4) & 0x0F) as u8 + 16;
        let k = (((raw & 0x0F00) >> 4) | (raw & 0x000F)) as u16;
        return DecodedInstruction {
            op: Opcode::Andi,
            rd: d,
            rr: 0,
            imm: k,
            cycles: 1,
        };
    }

    // 10. OR: 0010 10rd dddd rrrr
    if (raw & 0xFC00) == 0x2800 {
        let rd = ((raw >> 4) & 0x1F) as u8;
        let rr = (((raw >> 5) & 0x10) | (raw & 0x0F)) as u8;
        return DecodedInstruction {
            op: Opcode::Or,
            rd,
            rr,
            imm: 0,
            cycles: 1,
        };
    }

    // 11. ORI: 0110 KKKK dddd KKKK
    if (raw & 0xF000) == 0x6000 {
        let d = ((raw >> 4) & 0x0F) as u8 + 16;
        let k = (((raw & 0x0F00) >> 4) | (raw & 0x000F)) as u16;
        return DecodedInstruction {
            op: Opcode::Ori,
            rd: d,
            rr: 0,
            imm: k,
            cycles: 1,
        };
    }

    // 12. EOR: 0010 01rd dddd rrrr
    if (raw & 0xFC00) == 0x2400 {
        let rd = ((raw >> 4) & 0x1F) as u8;
        let rr = (((raw >> 5) & 0x10) | (raw & 0x0F)) as u8;
        return DecodedInstruction {
            op: Opcode::Eor,
            rd,
            rr,
            imm: 0,
            cycles: 1,
        };
    }

    // 13. COM: 1001 010d dddd 0000
    if (raw & 0xFE0F) == 0x9400 {
        let rd = ((raw >> 4) & 0x1F) as u8;
        return DecodedInstruction {
            op: Opcode::Com,
            rd,
            rr: 0,
            imm: 0,
            cycles: 1,
        };
    }

    // 14. NEG: 1001 010d dddd 0001
    if (raw & 0xFE0F) == 0x9401 {
        let rd = ((raw >> 4) & 0x1F) as u8;
        return DecodedInstruction {
            op: Opcode::Neg,
            rd,
            rr: 0,
            imm: 0,
            cycles: 1,
        };
    }

    // 15. INC: 1001 010d dddd 0011
    if (raw & 0xFE0F) == 0x9403 {
        let rd = ((raw >> 4) & 0x1F) as u8;
        return DecodedInstruction {
            op: Opcode::Inc,
            rd,
            rr: 0,
            imm: 0,
            cycles: 1,
        };
    }

    // 16. DEC: 1001 010d dddd 1010
    if (raw & 0xFE0F) == 0x940A {
        let rd = ((raw >> 4) & 0x1F) as u8;
        return DecodedInstruction {
            op: Opcode::Dec,
            rd,
            rr: 0,
            imm: 0,
            cycles: 1,
        };
    }

    // 17. CP: 0001 01rd dddd rrrr
    if (raw & 0xFC00) == 0x1400 {
        let rd = ((raw >> 4) & 0x1F) as u8;
        let rr = (((raw >> 5) & 0x10) | (raw & 0x0F)) as u8;
        return DecodedInstruction {
            op: Opcode::Cp,
            rd,
            rr,
            imm: 0,
            cycles: 1,
        };
    }

    // 18. CPC: 0000 01rd dddd rrrr
    if (raw & 0xFC00) == 0x0400 {
        let rd = ((raw >> 4) & 0x1F) as u8;
        let rr = (((raw >> 5) & 0x10) | (raw & 0x0F)) as u8;
        return DecodedInstruction {
            op: Opcode::Cpc,
            rd,
            rr,
            imm: 0,
            cycles: 1,
        };
    }

    // 19. CPI: 0011 KKKK dddd KKKK
    if (raw & 0xF000) == 0x3000 {
        let d = ((raw >> 4) & 0x0F) as u8 + 16;
        let k = (((raw & 0x0F00) >> 4) | (raw & 0x000F)) as u16;
        return DecodedInstruction {
            op: Opcode::Cpi,
            rd: d,
            rr: 0,
            imm: k,
            cycles: 1,
        };
    }

    // 20. LSR: 1001 010d dddd 0110
    if (raw & 0xFE0F) == 0x9406 {
        let rd = ((raw >> 4) & 0x1F) as u8;
        return DecodedInstruction {
            op: Opcode::Lsr,
            rd,
            rr: 0,
            imm: 0,
            cycles: 1,
        };
    }

    // 21. ASR: 1001 010d dddd 0101
    if (raw & 0xFE0F) == 0x9405 {
        let rd = ((raw >> 4) & 0x1F) as u8;
        return DecodedInstruction {
            op: Opcode::Asr,
            rd,
            rr: 0,
            imm: 0,
            cycles: 1,
        };
    }

    // 22. ROR: 1001 010d dddd 0111
    if (raw & 0xFE0F) == 0x9407 {
        let rd = ((raw >> 4) & 0x1F) as u8;
        return DecodedInstruction {
            op: Opcode::Ror,
            rd,
            rr: 0,
            imm: 0,
            cycles: 1,
        };
    }

    // 23. SWAP: 1001 010d dddd 0010
    if (raw & 0xFE0F) == 0x9402 {
        let rd = ((raw >> 4) & 0x1F) as u8;
        return DecodedInstruction {
            op: Opcode::Swap,
            rd,
            rr: 0,
            imm: 0,
            cycles: 1,
        };
    }

    // 24. RJMP: 1100 kkkk kkkk kkkk (12-bit signed offset)
    if (raw & 0xF000) == 0xC000 {
        let k = raw & 0x0FFF;
        return DecodedInstruction {
            op: Opcode::Rjmp,
            rd: 0,
            rr: 0,
            imm: k,
            cycles: 2,
        };
    }

    // 25. OUT: 1011 1AAr rrrr AAAA (A: 0..63)
    if (raw & 0xF800) == 0xB800 {
        let a = (((raw & 0x0600) >> 5) | (raw & 0x000F)) as u16;
        let rr = ((raw >> 4) & 0x1F) as u8;
        return DecodedInstruction {
            op: Opcode::Out,
            rd: 0,
            rr,
            imm: a,
            cycles: 1,
        };
    }

    // 26. IN: 1011 0AAd dddd AAAA (A: 0..63)
    if (raw & 0xF800) == 0xB000 {
        let a = (((raw & 0x0600) >> 5) | (raw & 0x000F)) as u16;
        let rd = ((raw >> 4) & 0x1F) as u8;
        return DecodedInstruction {
            op: Opcode::In,
            rd,
            rr: 0,
            imm: a,
            cycles: 1,
        };
    }

    // 27. SBI: 1001 1010 AAAA Abbb (A: 0..31, b: 0..7)
    if (raw & 0xFF00) == 0x9A00 {
        let a = ((raw >> 3) & 0x1F) as u16;
        let bit = (raw & 0x07) as u8;
        return DecodedInstruction {
            op: Opcode::Sbi,
            rd: bit,
            rr: 0,
            imm: a,
            cycles: 2,
        };
    }

    // 28. CBI: 1001 1000 AAAA Abbb (A: 0..31, b: 0..7)
    if (raw & 0xFF00) == 0x9800 {
        let a = ((raw >> 3) & 0x1F) as u16;
        let bit = (raw & 0x07) as u8;
        return DecodedInstruction {
            op: Opcode::Cbi,
            rd: bit,
            rr: 0,
            imm: a,
            cycles: 2,
        };
    }

    // 29. LD:
    // LD Rd, X  (1001 000d dddd 1100) -> imm = 0 (X)
    // LD Rd, Y  (1000 000d dddd 1000) -> imm = 1 (Y)
    // LD Rd, Z  (1000 000d dddd 0000) -> imm = 2 (Z)
    if (raw & 0xFE0F) == 0x900C {
        let rd = ((raw >> 4) & 0x1F) as u8;
        return DecodedInstruction { op: Opcode::Ld, rd, rr: 0, imm: 0, cycles: 2 };
    }
    if (raw & 0xFE0F) == 0x8008 {
        let rd = ((raw >> 4) & 0x1F) as u8;
        return DecodedInstruction { op: Opcode::Ld, rd, rr: 0, imm: 1, cycles: 2 };
    }
    if (raw & 0xFE0F) == 0x8000 {
        let rd = ((raw >> 4) & 0x1F) as u8;
        return DecodedInstruction { op: Opcode::Ld, rd, rr: 0, imm: 2, cycles: 2 };
    }

    // 30. ST:
    // ST X, Rr  (1001 001r rrrr 1100) -> imm = 0 (X)
    // ST Y, Rr  (1000 001r rrrr 1000) -> imm = 1 (Y)
    // ST Z, Rr  (1000 001r rrrr 0000) -> imm = 2 (Z)
    if (raw & 0xFE0F) == 0x920C {
        let rr = ((raw >> 4) & 0x1F) as u8;
        return DecodedInstruction { op: Opcode::St, rd: 0, rr, imm: 0, cycles: 2 };
    }
    if (raw & 0xFE0F) == 0x8208 {
        let rr = ((raw >> 4) & 0x1F) as u8;
        return DecodedInstruction { op: Opcode::St, rd: 0, rr, imm: 1, cycles: 2 };
    }
    if (raw & 0xFE0F) == 0x8200 {
        let rr = ((raw >> 4) & 0x1F) as u8;
        return DecodedInstruction { op: Opcode::St, rd: 0, rr, imm: 2, cycles: 2 };
    }

    // Unknown instruction
    DecodedInstruction {
        op: Opcode::Unknown,
        rd: 0,
        rr: 0,
        imm: 0,
        cycles: 1,
    }
}

// Precomputed Compile-Time 64k Instruction Decode Table
const fn build_decode_table() -> [DecodedInstruction; 65536] {
    let mut table = [DecodedInstruction {
        op: Opcode::Unknown,
        rd: 0,
        rr: 0,
        imm: 0,
        cycles: 1,
    }; 65536];
    let mut i = 0usize;
    while i < 65536 {
        table[i] = decode_instruction(i as u16);
        i += 1;
    }
    table
}

pub static DECODE_TABLE: [DecodedInstruction; 65536] = build_decode_table();

// =========================================================================
// 2. AVR CORE WASM STRUCT & RUNTIME
// =========================================================================

#[wasm_bindgen]
pub struct AvrCore {
    pub pc: u16,
    pub sp: u8,
    pub sreg: u8,
    pub regs: [u8; 32],
    pub sram: [u8; 2048],
    pub flash: Vec<u16>, // program memory word array
    pub cycles: u64,
    pub temp: u8,        // Hidden TEMP register for 16-bit access
    pub rampz: u8,       // Hidden RAMPZ for ELPM access
}

impl IAluState for AvrCore {
    #[inline(always)]
    fn get_reg(&self, reg: usize) -> u8 {
        self.regs[reg & 0x1F]
    }
    #[inline(always)]
    fn set_reg(&mut self, reg: usize, val: u8) {
        self.regs[reg & 0x1F] = val;
    }
    #[inline(always)]
    fn get_sreg(&self) -> u8 {
        self.sreg
    }
    #[inline(always)]
    fn set_sreg(&mut self, val: u8) {
        self.sreg = val;
    }
    #[inline(always)]
    fn get_temp(&self) -> u8 {
        self.temp
    }
    #[inline(always)]
    fn set_temp(&mut self, val: u8) {
        self.temp = val;
    }
    #[inline(always)]
    fn get_rampz(&self) -> u8 {
        self.rampz
    }
    #[inline(always)]
    fn set_rampz(&mut self, val: u8) {
        self.rampz = val;
    }
}

#[wasm_bindgen]
impl AvrCore {
    #[wasm_bindgen(constructor)]
    pub fn new(flash_words: Vec<u16>) -> AvrCore {
        AvrCore {
            pc: 0,
            sp: 0xFF,
            sreg: 0,
            regs: [0; 32],
            sram: [0; 2048],
            flash: flash_words,
            cycles: 0,
            temp: 0,
            rampz: 0,
        }
    }

    pub fn reset(&mut self) {
        self.pc = 0;
        self.sp = 0xFF;
        self.sreg = 0;
        self.regs = [0; 32];
        self.sram = [0; 2048];
        self.cycles = 0;
        self.temp = 0;
        self.rampz = 0;
    }

    pub fn load_flash(&mut self, flash_words: Vec<u16>) {
        self.flash = flash_words;
        self.reset();
    }

    // Direct zero-copy memory pointers for JS views
    pub fn sram_ptr(&self) -> *const u8 {
        self.sram.as_ptr()
    }

    pub fn regs_ptr(&self) -> *const u8 {
        self.regs.as_ptr()
    }

    pub fn flash_ptr(&self) -> *const u16 {
        self.flash.as_ptr()
    }

    pub fn read_reg(&self, reg: usize) -> u8 {
        if reg < 32 {
            self.regs[reg]
        } else {
            0
        }
    }

    pub fn write_reg(&mut self, reg: usize, val: u8) {
        if reg < 32 {
            self.regs[reg] = val;
        }
    }

    pub fn read_sram(&self, addr: usize) -> u8 {
        if addr < 2048 {
            self.sram[addr]
        } else {
            0
        }
    }

    pub fn write_sram(&mut self, addr: usize, val: u8) {
        if addr < 2048 {
            self.sram[addr] = val;
        }
    }

    // =====================================================================
    // 3. STEP: EXECUTES 1 INSTRUCTION, RETURNS CYCLES (1..4)
    // =====================================================================
    #[inline(always)]
    pub fn step(&mut self) -> u8 {
        let pc_word = self.pc as usize;
        if pc_word >= self.flash.len() {
            self.cycles += 1;
            return 1;
        }

        let raw_opcode = self.flash[pc_word];
        let inst = unsafe { *DECODE_TABLE.get_unchecked(raw_opcode as usize) };

        match inst.op {
            Opcode::Nop => {
                self.pc = self.pc.wrapping_add(1);
            }

            Opcode::Ldi => {
                let rd = inst.rd as usize;
                self.regs[rd] = inst.imm as u8;
                self.pc = self.pc.wrapping_add(1);
            }

            Opcode::Add => {
                alu::add(self, inst.rd as usize, inst.rr as usize);
                self.pc = self.pc.wrapping_add(1);
            }

            Opcode::Adc => {
                alu::adc(self, inst.rd as usize, inst.rr as usize);
                self.pc = self.pc.wrapping_add(1);
            }

            Opcode::Sub => {
                alu::sub(self, inst.rd as usize, inst.rr as usize);
                self.pc = self.pc.wrapping_add(1);
            }

            Opcode::Subi => {
                alu::subi(self, inst.rd as usize, inst.imm as u8);
                self.pc = self.pc.wrapping_add(1);
            }

            Opcode::Sbc => {
                alu::sbc(self, inst.rd as usize, inst.rr as usize);
                self.pc = self.pc.wrapping_add(1);
            }

            Opcode::And => {
                alu::and(self, inst.rd as usize, inst.rr as usize);
                self.pc = self.pc.wrapping_add(1);
            }

            Opcode::Andi => {
                let rd = inst.rd as usize;
                let k = inst.imm as u8;
                let rd_val = self.regs[rd];
                let res = rd_val & k;
                let lut_idx = ((rd_val as usize) << 8) | (k as usize);
                let flags = unsafe { *alu::AND_FLAGS.get_unchecked(lut_idx) };
                self.sreg = (self.sreg & alu::MASK_PRESERVE_ITHC) | flags;
                self.regs[rd] = res;
                self.pc = self.pc.wrapping_add(1);
            }

            Opcode::Or => {
                alu::or(self, inst.rd as usize, inst.rr as usize);
                self.pc = self.pc.wrapping_add(1);
            }

            Opcode::Ori => {
                let rd = inst.rd as usize;
                let k = inst.imm as u8;
                let res = self.regs[rd] | k;
                let n = (res >> 7) & 1;
                let z = if res == 0 { 1 } else { 0 };
                let flags = (z << 1) | (n << 2) | (n << 4);
                self.sreg = (self.sreg & alu::MASK_PRESERVE_ITHC) | flags;
                self.regs[rd] = res;
                self.pc = self.pc.wrapping_add(1);
            }

            Opcode::Eor => {
                alu::eor(self, inst.rd as usize, inst.rr as usize);
                self.pc = self.pc.wrapping_add(1);
            }

            Opcode::Com => {
                alu::com(self, inst.rd as usize);
                self.pc = self.pc.wrapping_add(1);
            }

            Opcode::Neg => {
                alu::neg(self, inst.rd as usize);
                self.pc = self.pc.wrapping_add(1);
            }

            Opcode::Inc => {
                alu::inc(self, inst.rd as usize);
                self.pc = self.pc.wrapping_add(1);
            }

            Opcode::Dec => {
                alu::dec(self, inst.rd as usize);
                self.pc = self.pc.wrapping_add(1);
            }

            Opcode::Cp => {
                alu::cp(self, inst.rd as usize, inst.rr as usize);
                self.pc = self.pc.wrapping_add(1);
            }

            Opcode::Cpc => {
                let prev_sreg = self.sreg;
                alu::sbc(self, inst.rd as usize, inst.rr as usize);
                // In CPC, Rd is unchanged, but we temporarily used sbc which modified reg
                // Restore Rd:
                // Actually cp / cpc don't write back:
                let rd = inst.rd as usize;
                let rr = inst.rr as usize;
                let rd_val = self.regs[rd];
                let rr_val = self.regs[rr];
                let cin = prev_sreg & alu::FLAG_C;
                let lut_idx = ((rd_val as usize) << 9) | ((rr_val as usize) << 1) | (cin as usize);
                let flags = unsafe { *alu::SBC_FLAGS.get_unchecked(lut_idx) };
                let z_mask = if (prev_sreg & alu::FLAG_Z) == 0 { !alu::FLAG_Z } else { 0xFF };
                self.sreg = (prev_sreg & alu::MASK_PRESERVE_IT) | (flags & 0x3D) | (flags & alu::FLAG_Z & z_mask);
                self.pc = self.pc.wrapping_add(1);
            }

            Opcode::Cpi => {
                alu::subi(self, inst.rd as usize, inst.imm as u8);
                // Don't modify Rd
                let rd = inst.rd as usize;
                let k = inst.imm as u8;
                let rd_val = self.regs[rd];
                let lut_idx = ((rd_val as usize) << 8) | (k as usize);
                let flags = unsafe { *alu::SUB_FLAGS.get_unchecked(lut_idx) };
                self.sreg = (self.sreg & alu::MASK_PRESERVE_IT) | (flags & 0x3F);
                self.pc = self.pc.wrapping_add(1);
            }

            Opcode::Lsr => {
                alu::lsr(self, inst.rd as usize);
                self.pc = self.pc.wrapping_add(1);
            }

            Opcode::Asr => {
                alu::asr(self, inst.rd as usize);
                self.pc = self.pc.wrapping_add(1);
            }

            Opcode::Ror => {
                alu::ror(self, inst.rd as usize);
                self.pc = self.pc.wrapping_add(1);
            }

            Opcode::Swap => {
                alu::swap(self, inst.rd as usize);
                self.pc = self.pc.wrapping_add(1);
            }

            Opcode::Rjmp => {
                let k = inst.imm;
                let offset = if (k & 0x0800) != 0 {
                    (k as i32) - 0x1000
                } else {
                    k as i32
                };
                self.pc = ((self.pc as i32) + 1 + offset) as u16;
            }

            Opcode::Out => {
                let io_addr = inst.imm as usize;
                let rr_val = self.regs[inst.rr as usize];
                if io_addr < 2048 {
                    self.sram[io_addr] = rr_val;
                }
                self.pc = self.pc.wrapping_add(1);
            }

            Opcode::In => {
                let io_addr = inst.imm as usize;
                let val = if io_addr < 2048 { self.sram[io_addr] } else { 0 };
                self.regs[inst.rd as usize] = val;
                self.pc = self.pc.wrapping_add(1);
            }

            Opcode::Sbi => {
                let io_addr = inst.imm as usize;
                let bit = inst.rd;
                if io_addr < 2048 {
                    self.sram[io_addr] |= 1 << bit;
                }
                self.pc = self.pc.wrapping_add(1);
            }

            Opcode::Cbi => {
                let io_addr = inst.imm as usize;
                let bit = inst.rd;
                if io_addr < 2048 {
                    self.sram[io_addr] &= !(1 << bit);
                }
                self.pc = self.pc.wrapping_add(1);
            }

            Opcode::Ld => {
                let ptr = match inst.imm {
                    0 => ((self.regs[27] as usize) << 8) | (self.regs[26] as usize), // X
                    1 => ((self.regs[29] as usize) << 8) | (self.regs[28] as usize), // Y
                    _ => ((self.regs[31] as usize) << 8) | (self.regs[30] as usize), // Z
                };
                let val = if ptr < 2048 { self.sram[ptr] } else { 0 };
                self.regs[inst.rd as usize] = val;
                self.pc = self.pc.wrapping_add(1);
            }

            Opcode::St => {
                let ptr = match inst.imm {
                    0 => ((self.regs[27] as usize) << 8) | (self.regs[26] as usize), // X
                    1 => ((self.regs[29] as usize) << 8) | (self.regs[28] as usize), // Y
                    _ => ((self.regs[31] as usize) << 8) | (self.regs[30] as usize), // Z
                };
                let val = self.regs[inst.rr as usize];
                if ptr < 2048 {
                    self.sram[ptr] = val;
                }
                self.pc = self.pc.wrapping_add(1);
            }

            Opcode::Unknown => {
                self.pc = self.pc.wrapping_add(1);
            }
        }

        self.cycles += inst.cycles as u64;
        inst.cycles
    }

    // =====================================================================
    // 4. HOT LOOP: RUNS TIGHT LOOP UNTIL TARGET CYCLES (ZERO ALLOCATIONS)
    // =====================================================================
    pub fn run_until(&mut self, target_cycles: u64) -> u64 {
        while self.cycles < target_cycles {
            let pc_word = self.pc as usize;
            if pc_word >= self.flash.len() {
                self.cycles = target_cycles;
                break;
            }

            let raw_opcode = unsafe { *self.flash.get_unchecked(pc_word) };
            let inst = unsafe { *DECODE_TABLE.get_unchecked(raw_opcode as usize) };

            match inst.op {
                Opcode::Nop => {
                    self.pc = self.pc.wrapping_add(1);
                }

                Opcode::Ldi => {
                    let rd = inst.rd as usize;
                    self.regs[rd] = inst.imm as u8;
                    self.pc = self.pc.wrapping_add(1);
                }

                Opcode::Add => {
                    alu::add(self, inst.rd as usize, inst.rr as usize);
                    self.pc = self.pc.wrapping_add(1);
                }

                Opcode::Adc => {
                    alu::adc(self, inst.rd as usize, inst.rr as usize);
                    self.pc = self.pc.wrapping_add(1);
                }

                Opcode::Sub => {
                    alu::sub(self, inst.rd as usize, inst.rr as usize);
                    self.pc = self.pc.wrapping_add(1);
                }

                Opcode::Subi => {
                    alu::subi(self, inst.rd as usize, inst.imm as u8);
                    self.pc = self.pc.wrapping_add(1);
                }

                Opcode::Sbc => {
                    alu::sbc(self, inst.rd as usize, inst.rr as usize);
                    self.pc = self.pc.wrapping_add(1);
                }

                Opcode::And => {
                    alu::and(self, inst.rd as usize, inst.rr as usize);
                    self.pc = self.pc.wrapping_add(1);
                }

                Opcode::Andi => {
                    let rd = inst.rd as usize;
                    let k = inst.imm as u8;
                    let rd_val = self.regs[rd];
                    let res = rd_val & k;
                    let lut_idx = ((rd_val as usize) << 8) | (k as usize);
                    let flags = unsafe { *alu::AND_FLAGS.get_unchecked(lut_idx) };
                    self.sreg = (self.sreg & alu::MASK_PRESERVE_ITHC) | flags;
                    self.regs[rd] = res;
                    self.pc = self.pc.wrapping_add(1);
                }

                Opcode::Or => {
                    alu::or(self, inst.rd as usize, inst.rr as usize);
                    self.pc = self.pc.wrapping_add(1);
                }

                Opcode::Ori => {
                    let rd = inst.rd as usize;
                    let k = inst.imm as u8;
                    let res = self.regs[rd] | k;
                    let n = (res >> 7) & 1;
                    let z = if res == 0 { 1 } else { 0 };
                    let flags = (z << 1) | (n << 2) | (n << 4);
                    self.sreg = (self.sreg & alu::MASK_PRESERVE_ITHC) | flags;
                    self.regs[rd] = res;
                    self.pc = self.pc.wrapping_add(1);
                }

                Opcode::Eor => {
                    alu::eor(self, inst.rd as usize, inst.rr as usize);
                    self.pc = self.pc.wrapping_add(1);
                }

                Opcode::Com => {
                    alu::com(self, inst.rd as usize);
                    self.pc = self.pc.wrapping_add(1);
                }

                Opcode::Neg => {
                    alu::neg(self, inst.rd as usize);
                    self.pc = self.pc.wrapping_add(1);
                }

                Opcode::Inc => {
                    alu::inc(self, inst.rd as usize);
                    self.pc = self.pc.wrapping_add(1);
                }

                Opcode::Dec => {
                    alu::dec(self, inst.rd as usize);
                    self.pc = self.pc.wrapping_add(1);
                }

                Opcode::Cp => {
                    alu::cp(self, inst.rd as usize, inst.rr as usize);
                    self.pc = self.pc.wrapping_add(1);
                }

                Opcode::Cpc => {
                    let prev_sreg = self.sreg;
                    let rd = inst.rd as usize;
                    let rr = inst.rr as usize;
                    let rd_val = self.regs[rd];
                    let rr_val = self.regs[rr];
                    let cin = prev_sreg & alu::FLAG_C;
                    let lut_idx = ((rd_val as usize) << 9) | ((rr_val as usize) << 1) | (cin as usize);
                    let flags = unsafe { *alu::SBC_FLAGS.get_unchecked(lut_idx) };
                    let z_mask = if (prev_sreg & alu::FLAG_Z) == 0 { !alu::FLAG_Z } else { 0xFF };
                    self.sreg = (prev_sreg & alu::MASK_PRESERVE_IT) | (flags & 0x3D) | (flags & alu::FLAG_Z & z_mask);
                    self.pc = self.pc.wrapping_add(1);
                }

                Opcode::Cpi => {
                    let rd = inst.rd as usize;
                    let k = inst.imm as u8;
                    let rd_val = self.regs[rd];
                    let lut_idx = ((rd_val as usize) << 8) | (k as usize);
                    let flags = unsafe { *alu::SUB_FLAGS.get_unchecked(lut_idx) };
                    self.sreg = (self.sreg & alu::MASK_PRESERVE_IT) | (flags & 0x3F);
                    self.pc = self.pc.wrapping_add(1);
                }

                Opcode::Lsr => {
                    alu::lsr(self, inst.rd as usize);
                    self.pc = self.pc.wrapping_add(1);
                }

                Opcode::Asr => {
                    alu::asr(self, inst.rd as usize);
                    self.pc = self.pc.wrapping_add(1);
                }

                Opcode::Ror => {
                    alu::ror(self, inst.rd as usize);
                    self.pc = self.pc.wrapping_add(1);
                }

                Opcode::Swap => {
                    alu::swap(self, inst.rd as usize);
                    self.pc = self.pc.wrapping_add(1);
                }

                Opcode::Rjmp => {
                    let k = inst.imm;
                    let offset = if (k & 0x0800) != 0 {
                        (k as i32) - 0x1000
                    } else {
                        k as i32
                    };
                    self.pc = ((self.pc as i32) + 1 + offset) as u16;
                }

                Opcode::Out => {
                    let io_addr = inst.imm as usize;
                    let rr_val = self.regs[inst.rr as usize];
                    if io_addr < 2048 {
                        self.sram[io_addr] = rr_val;
                    }
                    self.pc = self.pc.wrapping_add(1);
                }

                Opcode::In => {
                    let io_addr = inst.imm as usize;
                    let val = if io_addr < 2048 { self.sram[io_addr] } else { 0 };
                    self.regs[inst.rd as usize] = val;
                    self.pc = self.pc.wrapping_add(1);
                }

                Opcode::Sbi => {
                    let io_addr = inst.imm as usize;
                    let bit = inst.rd;
                    if io_addr < 2048 {
                        self.sram[io_addr] |= 1 << bit;
                    }
                    self.pc = self.pc.wrapping_add(1);
                }

                Opcode::Cbi => {
                    let io_addr = inst.imm as usize;
                    let bit = inst.rd;
                    if io_addr < 2048 {
                        self.sram[io_addr] &= !(1 << bit);
                    }
                    self.pc = self.pc.wrapping_add(1);
                }

                Opcode::Ld => {
                    let ptr = match inst.imm {
                        0 => ((self.regs[27] as usize) << 8) | (self.regs[26] as usize),
                        1 => ((self.regs[29] as usize) << 8) | (self.regs[28] as usize),
                        _ => ((self.regs[31] as usize) << 8) | (self.regs[30] as usize),
                    };
                    let val = if ptr < 2048 { self.sram[ptr] } else { 0 };
                    self.regs[inst.rd as usize] = val;
                    self.pc = self.pc.wrapping_add(1);
                }

                Opcode::St => {
                    let ptr = match inst.imm {
                        0 => ((self.regs[27] as usize) << 8) | (self.regs[26] as usize),
                        1 => ((self.regs[29] as usize) << 8) | (self.regs[28] as usize),
                        _ => ((self.regs[31] as usize) << 8) | (self.regs[30] as usize),
                    };
                    let val = self.regs[inst.rr as usize];
                    if ptr < 2048 {
                        self.sram[ptr] = val;
                    }
                    self.pc = self.pc.wrapping_add(1);
                }

                Opcode::Unknown => {
                    self.pc = self.pc.wrapping_add(1);
                }
            }

            self.cycles += inst.cycles as u64;
        }

        self.cycles
    }
}
