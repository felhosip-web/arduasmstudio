//! wasm-core/src/alu.rs - 100% hardware-faithful AVR ALU
//! Based on Atmel AVR Instruction Set Manual 0856I

pub const FLAG_C: u8 = 1 << 0; // Carry
pub const FLAG_Z: u8 = 1 << 1; // Zero
pub const FLAG_N: u8 = 1 << 2; // Negative
pub const FLAG_V: u8 = 1 << 3; // Two's complement overflow
pub const FLAG_S: u8 = 1 << 4; // Sign bit (S = N ^ V)
pub const FLAG_H: u8 = 1 << 5; // Half Carry
pub const FLAG_T: u8 = 1 << 6; // Transfer bit
pub const FLAG_I: u8 = 1 << 7; // Global Interrupt Enable

// Preservation masks
pub const MASK_PRESERVE_IT: u8 = FLAG_I | FLAG_T;                     // 0xC0 (ADD, ADC, SUB, NEG, CP, etc.)
pub const MASK_PRESERVE_ITHC: u8 = FLAG_I | FLAG_T | FLAG_H | FLAG_C; // 0xE1 (AND, OR, EOR, INC, DEC)
pub const MASK_PRESERVE_ITH: u8 = FLAG_I | FLAG_T | FLAG_H;           // 0xE0 (COM, LSR, ROR, ASR)

#[inline(always)]
pub const fn calc_s_flag(n: u8, v: u8) -> u8 {
    if (n ^ v) != 0 { FLAG_S } else { 0 }
}

// =========================================================================
// 1. CONST STATIC LOOKUP TABLE GENERATORS
// =========================================================================

// ADD - Rd = Rd + Rr
const fn gen_add_table() -> [u8; 65536] {
    let mut t = [0u8; 65536];
    let mut a = 0usize;
    while a < 256 {
        let mut b = 0usize;
        while b < 256 {
            let r = a + b;
            let r8 = (r & 0xFF) as u8;
            let mut f = 0u8;
            // H - carry from bit 3
            if ((a & 0x0F) + (b & 0x0F)) & 0x10 != 0 { f |= FLAG_H; }
            // C - carry from bit 7
            if r & 0x100 != 0 { f |= FLAG_C; }
            // Z
            if r8 == 0 { f |= FLAG_Z; }
            // N
            if r8 & 0x80 != 0 { f |= FLAG_N; }
            // V - two's complement overflow: (Rd7 & Rr7 & ~R7) | (~Rd7 & ~Rr7 & R7)
            if ((a & 0x80) == (b & 0x80)) && ((a & 0x80) != (r & 0x80)) {
                f |= FLAG_V;
            }
            let n = if f & FLAG_N != 0 { 1 } else { 0 };
            let v = if f & FLAG_V != 0 { 1 } else { 0 };
            f |= calc_s_flag(n, v);
            t[(a << 8) | b] = f;
            b += 1;
        }
        a += 1;
    }
    t
}

// ADC - Rd = Rd + Rr + C (index: (carry_in << 16) | (a << 8) | b)
const fn gen_adc_table() -> [u8; 131072] {
    let mut t = [0u8; 131072];
    let mut cin = 0usize;
    while cin < 2 {
        let mut a = 0usize;
        while a < 256 {
            let mut b = 0usize;
            while b < 256 {
                let r = a + b + cin;
                let r8 = (r & 0xFF) as u8;
                let mut f = 0u8;
                // H - carry from bit 3
                if ((a & 0x0F) + (b & 0x0F) + cin) & 0x10 != 0 { f |= FLAG_H; }
                // C - carry from bit 7
                if r & 0x100 != 0 { f |= FLAG_C; }
                // Z
                if r8 == 0 { f |= FLAG_Z; }
                // N
                if r8 & 0x80 != 0 { f |= FLAG_N; }
                // V - two's complement overflow
                if ((a & 0x80) == (b & 0x80)) && ((a & 0x80) != (r8 as usize & 0x80)) {
                    f |= FLAG_V;
                }
                let n = if f & FLAG_N != 0 { 1 } else { 0 };
                let v = if f & FLAG_V != 0 { 1 } else { 0 };
                f |= calc_s_flag(n, v);
                t[(cin << 16) | (a << 8) | b] = f;
                b += 1;
            }
            a += 1;
        }
        cin += 1;
    }
    t
}

// SUB - Rd = Rd - Rr
const fn gen_sub_table() -> [u8; 65536] {
    let mut t = [0u8; 65536];
    let mut a = 0usize;
    while a < 256 {
        let mut b = 0usize;
        while b < 256 {
            let r = (a as i16 - b as i16) & 0x1FF;
            let r8 = (r & 0xFF) as u8;
            let mut f = 0u8;
            // H - borrow from bit 3: if (a & 0x0F) < (b & 0x0F)
            if (a & 0x0F) < (b & 0x0F) { f |= FLAG_H; }
            // C - borrow: a < b
            if a < b { f |= FLAG_C; }
            if r8 == 0 { f |= FLAG_Z; }
            if r8 & 0x80 != 0 { f |= FLAG_N; }
            // V - (Rd ^ Rr) & (Rd ^ R) overflow for SUB
            if ((a ^ b) & 0x80) != 0 && ((a ^ (r as usize)) & 0x80) != 0 {
                f |= FLAG_V;
            }
            let n = if f & FLAG_N != 0 { 1 } else { 0 };
            let v = if f & FLAG_V != 0 { 1 } else { 0 };
            f |= calc_s_flag(n, v);
            t[(a << 8) | b] = f;
            b += 1;
        }
        a += 1;
    }
    t
}

// SBC - Rd = Rd - Rr - C (index: (carry_in << 16) | (a << 8) | b)
const fn gen_sbc_table() -> [u8; 131072] {
    let mut t = [0u8; 131072];
    let mut cin = 0usize;
    while cin < 2 {
        let mut a = 0usize;
        while a < 256 {
            let mut b = 0usize;
            while b < 256 {
                let r = (a as i16 - b as i16 - cin as i16) & 0x1FF;
                let r8 = (r & 0xFF) as u8;
                let mut f = 0u8;
                // H - borrow from bit 3: if (a & 0x0F) < (b & 0x0F) + cin
                if (a & 0x0F) < ((b & 0x0F) + cin) { f |= FLAG_H; }
                // C - borrow: a < (b + cin)
                if (a as i16) < (b as i16 + cin as i16) { f |= FLAG_C; }
                if r8 == 0 { f |= FLAG_Z; }
                if r8 & 0x80 != 0 { f |= FLAG_N; }
                // V - (Rd ^ Rr) & (Rd ^ R) overflow for SBC
                if ((a ^ b) & 0x80) != 0 && ((a ^ (r8 as usize)) & 0x80) != 0 {
                    f |= FLAG_V;
                }
                let n = if f & FLAG_N != 0 { 1 } else { 0 };
                let v = if f & FLAG_V != 0 { 1 } else { 0 };
                f |= calc_s_flag(n, v);
                t[(cin << 16) | (a << 8) | b] = f;
                cin += 1;
            }
            b += 1;
        }
        a += 1;
    }
    t
}

// AND - Rd = Rd & Rr: V=0, C=0, H=0, Z = R==0, N = R7, S=N
const fn gen_and_table() -> [u8; 65536] {
    let mut t = [0u8; 65536];
    let mut a = 0usize;
    while a < 256 {
        let mut b = 0usize;
        while b < 256 {
            let r = (a & b) as u8;
            let mut f = 0u8;
            if r == 0 { f |= FLAG_Z; }
            if r & 0x80 != 0 { f |= FLAG_N; }
            // V is always 0, S = N ^ 0 = N
            let n = if f & FLAG_N != 0 { 1 } else { 0 };
            f |= calc_s_flag(n, 0);
            t[(a << 8) | b] = f;
            b += 1;
        }
        a += 1;
    }
    t
}

// OR - Rd = Rd | Rr: V=0, C=0, H=0, Z = R==0, N = R7, S=N
const fn gen_or_table() -> [u8; 65536] {
    let mut t = [0u8; 65536];
    let mut a = 0usize;
    while a < 256 {
        let mut b = 0usize;
        while b < 256 {
            let r = (a | b) as u8;
            let mut f = 0u8;
            if r == 0 { f |= FLAG_Z; }
            if r & 0x80 != 0 { f |= FLAG_N; }
            let n = if f & FLAG_N != 0 { 1 } else { 0 };
            f |= calc_s_flag(n, 0);
            t[(a << 8) | b] = f;
            b += 1;
        }
        a += 1;
    }
    t
}

// EOR - Rd = Rd ^ Rr: V=0, C=0, H=0, Z = R==0, N = R7, S=N
const fn gen_eor_table() -> [u8; 65536] {
    let mut t = [0u8; 65536];
    let mut a = 0usize;
    while a < 256 {
        let mut b = 0usize;
        while b < 256 {
            let r = (a ^ b) as u8;
            let mut f = 0u8;
            if r == 0 { f |= FLAG_Z; }
            if r & 0x80 != 0 { f |= FLAG_N; }
            let n = if f & FLAG_N != 0 { 1 } else { 0 };
            f |= calc_s_flag(n, 0);
            t[(a << 8) | b] = f;
            b += 1;
        }
        a += 1;
    }
    t
}

// INC - Rd = Rd + 1, C preserved!
const fn gen_inc_table() -> [u8; 256] {
    let mut t = [0u8; 256];
    let mut a = 0usize;
    while a < 256 {
        let r = (a + 1) & 0xFF;
        let mut f = 0u8;
        if r == 0 { f |= FLAG_Z; }
        if r & 0x80 != 0 { f |= FLAG_N; }
        if a == 0x7F { f |= FLAG_V; } // 0x7F -> 0x80 overflow
        let n = if f & FLAG_N != 0 { 1 } else { 0 };
        let v = if f & FLAG_V != 0 { 1 } else { 0 };
        f |= calc_s_flag(n, v);
        t[a] = f;
        a += 1;
    }
    t
}

// DEC - Rd = Rd - 1, C preserved!
const fn gen_dec_table() -> [u8; 256] {
    let mut t = [0u8; 256];
    let mut a = 0usize;
    while a < 256 {
        let r = (a as i16 - 1) & 0xFF;
        let r8 = r as u8;
        let mut f = 0u8;
        if r8 == 0 { f |= FLAG_Z; }
        if r8 & 0x80 != 0 { f |= FLAG_N; }
        if a == 0x80 { f |= FLAG_V; } // 0x80 -> 0x7F overflow
        let n = if f & FLAG_N != 0 { 1 } else { 0 };
        let v = if f & FLAG_V != 0 { 1 } else { 0 };
        f |= calc_s_flag(n, v);
        t[a] = f;
        a += 1;
    }
    t
}

// NEG - Rd = 0 - Rd: Sets C if Rd != 0 (or Result != 0), V on 0x80 -> 0x80 overflow
const fn gen_neg_table() -> [u8; 256] {
    let mut t = [0u8; 256];
    let mut a = 0usize;
    while a < 256 {
        let r = (0i16 - a as i16) & 0x1FF;
        let r8 = (r & 0xFF) as u8;
        let mut f = 0u8;
        // H - Half borrow from bit 3: if Rd[3:0] != 0
        if (a & 0x0F) != 0 { f |= FLAG_H; }
        // C - Borrow: Rd != 0
        if a != 0 { f |= FLAG_C; }
        if r8 == 0 { f |= FLAG_Z; }
        if r8 & 0x80 != 0 { f |= FLAG_N; }
        // V - Two's complement overflow: 0 - (-128) = 128
        if a == 0x80 { f |= FLAG_V; }
        let n = if f & FLAG_N != 0 { 1 } else { 0 };
        let v = if f & FLAG_V != 0 { 1 } else { 0 };
        f |= calc_s_flag(n, v);
        t[a] = f;
        a += 1;
    }
    t
}

// COM - Rd = 0xFF - Rd (!Rd): Sets C=1 always, V=0, preserves H
const fn gen_com_table() -> [u8; 256] {
    let mut t = [0u8; 256];
    let mut a = 0usize;
    while a < 256 {
        let r8 = (!a) as u8;
        let mut f = FLAG_C; // C is always set to 1
        if r8 == 0 { f |= FLAG_Z; }
        if r8 & 0x80 != 0 { f |= FLAG_N; }
        let n = if f & FLAG_N != 0 { 1 } else { 0 };
        f |= calc_s_flag(n, 0); // V is 0, S = N
        t[a] = f;
        a += 1;
    }
    t
}

pub static ADD_FLAGS: [u8; 65536] = gen_add_table();
pub static ADC_FLAGS: [u8; 131072] = gen_adc_table();
pub static SUB_FLAGS: [u8; 65536] = gen_sub_table();
pub static SBC_FLAGS: [u8; 131072] = gen_sbc_table();
pub static AND_FLAGS: [u8; 65536] = gen_and_table();
pub static OR_FLAGS:  [u8; 65536] = gen_or_table();
pub static EOR_FLAGS: [u8; 65536] = gen_eor_table();
pub static INC_FLAGS: [u8; 256] = gen_inc_table();
pub static DEC_FLAGS: [u8; 256] = gen_dec_table();
pub static NEG_FLAGS: [u8; 256] = gen_neg_table();
pub static COM_FLAGS: [u8; 256] = gen_com_table();

// =========================================================================
// 2. STATE INTERFACE & ALU STRUCT
// =========================================================================

pub trait IAluState {
    fn get_reg(&self, reg: usize) -> u8;
    fn set_reg(&mut self, reg: usize, val: u8);
    fn get_sreg(&self) -> u8;
    fn set_sreg(&mut self, val: u8);
    fn get_temp(&self) -> u8;
    fn set_temp(&mut self, val: u8);
    fn get_rampz(&self) -> u8;
    fn set_rampz(&mut self, val: u8);
}

pub struct Alu;

impl Alu {
    #[inline(always)]
    pub fn add<S: IAluState>(core: &mut S, rd: usize, rr: usize) {
        let a = core.get_reg(rd) as usize;
        let b = core.get_reg(rr) as usize;
        let r = (a + b) as u8;
        core.set_reg(rd, r);
        let flags = unsafe { *ADD_FLAGS.get_unchecked((a << 8) | b) };
        core.set_sreg((core.get_sreg() & MASK_PRESERVE_IT) | flags);
    }

    #[inline(always)]
    pub fn adc<S: IAluState>(core: &mut S, rd: usize, rr: usize) {
        let a = core.get_reg(rd) as usize;
        let b = core.get_reg(rr) as usize;
        let cin = (core.get_sreg() & FLAG_C) as usize;
        let r = (a + b + cin) as u8;
        core.set_reg(rd, r);
        let flags = unsafe { *ADC_FLAGS.get_unchecked((cin << 16) | (a << 8) | b) };
        core.set_sreg((core.get_sreg() & MASK_PRESERVE_IT) | flags);
    }

    #[inline(always)]
    pub fn sub<S: IAluState>(core: &mut S, rd: usize, rr: usize) {
        let a = core.get_reg(rd) as usize;
        let b = core.get_reg(rr) as usize;
        let r = a.wrapping_sub(b) as u8;
        core.set_reg(rd, r);
        let flags = unsafe { *SUB_FLAGS.get_unchecked((a << 8) | b) };
        core.set_sreg((core.get_sreg() & MASK_PRESERVE_IT) | flags);
    }

    #[inline(always)]
    pub fn subi<S: IAluState>(core: &mut S, rd: usize, k: u8) {
        let a = core.get_reg(rd) as usize;
        let b = k as usize;
        let r = a.wrapping_sub(b) as u8;
        core.set_reg(rd, r);
        let flags = unsafe { *SUB_FLAGS.get_unchecked((a << 8) | b) };
        core.set_sreg((core.get_sreg() & MASK_PRESERVE_IT) | flags);
    }

    #[inline(always)]
    pub fn cp<S: IAluState>(core: &mut S, rd: usize, rr: usize) {
        let a = core.get_reg(rd) as usize;
        let b = core.get_reg(rr) as usize;
        let flags = unsafe { *SUB_FLAGS.get_unchecked((a << 8) | b) };
        core.set_sreg((core.get_sreg() & MASK_PRESERVE_IT) | flags);
    }

    #[inline(always)]
    pub fn cpi<S: IAluState>(core: &mut S, rd: usize, k: u8) {
        let a = core.get_reg(rd) as usize;
        let b = k as usize;
        let flags = unsafe { *SUB_FLAGS.get_unchecked((a << 8) | b) };
        core.set_sreg((core.get_sreg() & MASK_PRESERVE_IT) | flags);
    }

    #[inline(always)]
    pub fn sbc<S: IAluState>(core: &mut S, rd: usize, rr: usize) {
        let a = core.get_reg(rd) as usize;
        let b = core.get_reg(rr) as usize;
        let prev_sreg = core.get_sreg();
        let cin = (prev_sreg & FLAG_C) as usize;
        let r = (a as i16 - b as i16 - cin as i16) as u8;
        core.set_reg(rd, r);
        let flags = unsafe { *SBC_FLAGS.get_unchecked((cin << 16) | (a << 8) | b) };
        let z_mask = if (prev_sreg & FLAG_Z) == 0 { !FLAG_Z } else { 0xFF };
        let new_sreg = (prev_sreg & MASK_PRESERVE_IT) | (flags & 0x3D) | (flags & FLAG_Z & z_mask);
        core.set_sreg(new_sreg);
    }

    #[inline(always)]
    pub fn cpc<S: IAluState>(core: &mut S, rd: usize, rr: usize) {
        let a = core.get_reg(rd) as usize;
        let b = core.get_reg(rr) as usize;
        let prev_sreg = core.get_sreg();
        let cin = (prev_sreg & FLAG_C) as usize;
        let flags = unsafe { *SBC_FLAGS.get_unchecked((cin << 16) | (a << 8) | b) };
        let z_mask = if (prev_sreg & FLAG_Z) == 0 { !FLAG_Z } else { 0xFF };
        let new_sreg = (prev_sreg & MASK_PRESERVE_IT) | (flags & 0x3D) | (flags & FLAG_Z & z_mask);
        core.set_sreg(new_sreg);
    }

    #[inline(always)]
    pub fn and<S: IAluState>(core: &mut S, rd: usize, rr: usize) {
        let a = core.get_reg(rd) as usize;
        let b = core.get_reg(rr) as usize;
        core.set_reg(rd, (a & b) as u8);
        let flags = unsafe { *AND_FLAGS.get_unchecked((a << 8) | b) };
        core.set_sreg((core.get_sreg() & MASK_PRESERVE_ITHC) | flags);
    }

    #[inline(always)]
    pub fn andi<S: IAluState>(core: &mut S, rd: usize, k: u8) {
        let a = core.get_reg(rd) as usize;
        let b = k as usize;
        core.set_reg(rd, (a & b) as u8);
        let flags = unsafe { *AND_FLAGS.get_unchecked((a << 8) | b) };
        core.set_sreg((core.get_sreg() & MASK_PRESERVE_ITHC) | flags);
    }

    #[inline(always)]
    pub fn or<S: IAluState>(core: &mut S, rd: usize, rr: usize) {
        let a = core.get_reg(rd) as usize;
        let b = core.get_reg(rr) as usize;
        core.set_reg(rd, (a | b) as u8);
        let flags = unsafe { *OR_FLAGS.get_unchecked((a << 8) | b) };
        core.set_sreg((core.get_sreg() & MASK_PRESERVE_ITHC) | flags);
    }

    #[inline(always)]
    pub fn ori<S: IAluState>(core: &mut S, rd: usize, k: u8) {
        let a = core.get_reg(rd) as usize;
        let b = k as usize;
        core.set_reg(rd, (a | b) as u8);
        let flags = unsafe { *OR_FLAGS.get_unchecked((a << 8) | b) };
        core.set_sreg((core.get_sreg() & MASK_PRESERVE_ITHC) | flags);
    }

    #[inline(always)]
    pub fn eor<S: IAluState>(core: &mut S, rd: usize, rr: usize) {
        let a = core.get_reg(rd) as usize;
        let b = core.get_reg(rr) as usize;
        core.set_reg(rd, (a ^ b) as u8);
        let flags = unsafe { *EOR_FLAGS.get_unchecked((a << 8) | b) };
        core.set_sreg((core.get_sreg() & MASK_PRESERVE_ITHC) | flags);
    }

    #[inline(always)]
    pub fn inc<S: IAluState>(core: &mut S, rd: usize) {
        let a = core.get_reg(rd) as usize;
        let flags = unsafe { *INC_FLAGS.get_unchecked(a) };
        core.set_reg(rd, core.get_reg(rd).wrapping_add(1));
        // C preserved!
        core.set_sreg((core.get_sreg() & MASK_PRESERVE_ITHC) | flags);
    }

    #[inline(always)]
    pub fn dec<S: IAluState>(core: &mut S, rd: usize) {
        let a = core.get_reg(rd) as usize;
        let flags = unsafe { *DEC_FLAGS.get_unchecked(a) };
        core.set_reg(rd, core.get_reg(rd).wrapping_sub(1));
        // C preserved!
        core.set_sreg((core.get_sreg() & MASK_PRESERVE_ITHC) | flags);
    }

    #[inline(always)]
    pub fn neg<S: IAluState>(core: &mut S, rd: usize) {
        let a = core.get_reg(rd) as usize;
        let flags = unsafe { *NEG_FLAGS.get_unchecked(a) };
        core.set_reg(rd, (0u8).wrapping_sub(core.get_reg(rd)));
        core.set_sreg((core.get_sreg() & MASK_PRESERVE_IT) | flags);
    }

    #[inline(always)]
    pub fn com<S: IAluState>(core: &mut S, rd: usize) {
        let a = core.get_reg(rd) as usize;
        let flags = unsafe { *COM_FLAGS.get_unchecked(a) };
        core.set_reg(rd, !core.get_reg(rd));
        core.set_sreg((core.get_sreg() & MASK_PRESERVE_ITH) | flags);
    }

    #[inline(always)]
    pub fn lsr<S: IAluState>(core: &mut S, rd: usize) {
        let rd_val = core.get_reg(rd);
        let c = rd_val & 1;
        let res = rd_val >> 1;
        let n = 0u8;
        let z = if res == 0 { 1 } else { 0 };
        let v = n ^ c;
        let s = n ^ v;
        let flags = c | (z << 1) | (n << 2) | (v << 3) | (s << 4);
        core.set_reg(rd, res);
        core.set_sreg((core.get_sreg() & MASK_PRESERVE_ITH) | flags);
    }

    #[inline(always)]
    pub fn asr<S: IAluState>(core: &mut S, rd: usize) {
        let rd_val = core.get_reg(rd);
        let c = rd_val & 1;
        let res = ((rd_val as i8) >> 1) as u8;
        let n = (res >> 7) & 1;
        let z = if res == 0 { 1 } else { 0 };
        let v = n ^ c;
        let s = n ^ v;
        let flags = c | (z << 1) | (n << 2) | (v << 3) | (s << 4);
        core.set_reg(rd, res);
        core.set_sreg((core.get_sreg() & MASK_PRESERVE_ITH) | flags);
    }

    #[inline(always)]
    pub fn ror<S: IAluState>(core: &mut S, rd: usize) {
        let rd_val = core.get_reg(rd);
        let cin = core.get_sreg() & FLAG_C;
        let c_out = rd_val & 1;
        let res = (rd_val >> 1) | (cin << 7);
        let n = (res >> 7) & 1;
        let z = if res == 0 { 1 } else { 0 };
        let v = n ^ c_out;
        let s = n ^ v;
        let flags = c_out | (z << 1) | (n << 2) | (v << 3) | (s << 4);
        core.set_reg(rd, res);
        core.set_sreg((core.get_sreg() & MASK_PRESERVE_ITH) | flags);
    }

    #[inline(always)]
    pub fn swap<S: IAluState>(core: &mut S, rd: usize) {
        let rd_val = core.get_reg(rd);
        let res = (rd_val >> 4) | (rd_val << 4);
        core.set_reg(rd, res);
    }
}

// Module-level functions forwarding to Alu (for backwards compatibility)
#[inline(always)]
pub fn add<S: IAluState>(state: &mut S, rd: usize, rr: usize) -> u8 {
    Alu::add(state, rd, rr);
    state.get_sreg()
}

#[inline(always)]
pub fn adc<S: IAluState>(state: &mut S, rd: usize, rr: usize) -> u8 {
    Alu::adc(state, rd, rr);
    state.get_sreg()
}

#[inline(always)]
pub fn sub<S: IAluState>(state: &mut S, rd: usize, rr: usize) -> u8 {
    Alu::sub(state, rd, rr);
    state.get_sreg()
}

#[inline(always)]
pub fn subi<S: IAluState>(state: &mut S, rd: usize, k: u8) -> u8 {
    Alu::subi(state, rd, k);
    state.get_sreg()
}

#[inline(always)]
pub fn cp<S: IAluState>(state: &mut S, rd: usize, rr: usize) -> u8 {
    Alu::cp(state, rd, rr);
    state.get_sreg()
}

#[inline(always)]
pub fn cpi<S: IAluState>(state: &mut S, rd: usize, k: u8) -> u8 {
    Alu::cpi(state, rd, k);
    state.get_sreg()
}

#[inline(always)]
pub fn sbc<S: IAluState>(state: &mut S, rd: usize, rr: usize) -> u8 {
    Alu::sbc(state, rd, rr);
    state.get_sreg()
}

#[inline(always)]
pub fn and<S: IAluState>(state: &mut S, rd: usize, rr: usize) -> u8 {
    Alu::and(state, rd, rr);
    state.get_sreg()
}

#[inline(always)]
pub fn or<S: IAluState>(state: &mut S, rd: usize, rr: usize) -> u8 {
    Alu::or(state, rd, rr);
    state.get_sreg()
}

#[inline(always)]
pub fn eor<S: IAluState>(state: &mut S, rd: usize, rr: usize) -> u8 {
    Alu::eor(state, rd, rr);
    state.get_sreg()
}

#[inline(always)]
pub fn inc<S: IAluState>(state: &mut S, rd: usize) -> u8 {
    Alu::inc(state, rd);
    state.get_sreg()
}

#[inline(always)]
pub fn dec<S: IAluState>(state: &mut S, rd: usize) -> u8 {
    Alu::dec(state, rd);
    state.get_sreg()
}

#[inline(always)]
pub fn neg<S: IAluState>(state: &mut S, rd: usize) -> u8 {
    Alu::neg(state, rd);
    state.get_sreg()
}

#[inline(always)]
pub fn com<S: IAluState>(state: &mut S, rd: usize) -> u8 {
    Alu::com(state, rd);
    state.get_sreg()
}

#[inline(always)]
pub fn lsr<S: IAluState>(state: &mut S, rd: usize) -> u8 {
    Alu::lsr(state, rd);
    state.get_sreg()
}

#[inline(always)]
pub fn asr<S: IAluState>(state: &mut S, rd: usize) -> u8 {
    Alu::asr(state, rd);
    state.get_sreg()
}

#[inline(always)]
pub fn ror<S: IAluState>(state: &mut S, rd: usize) -> u8 {
    Alu::ror(state, rd);
    state.get_sreg()
}

#[inline(always)]
pub fn swap<S: IAluState>(state: &mut S, rd: usize) -> u8 {
    Alu::swap(state, rd);
    state.get_sreg()
}

// =========================================================================
// 3. UNIT TESTS
// =========================================================================

#[cfg(test)]
mod tests {
    use super::*;

    struct MockAluState {
        regs: [u8; 32],
        sreg: u8,
        temp: u8,
        rampz: u8,
    }

    impl MockAluState {
        fn new() -> Self {
            Self {
                regs: [0; 32],
                sreg: 0,
                temp: 0,
                rampz: 0,
            }
        }
    }

    impl IAluState for MockAluState {
        fn get_reg(&self, reg: usize) -> u8 { self.regs[reg] }
        fn set_reg(&mut self, reg: usize, val: u8) { self.regs[reg] = val; }
        fn get_sreg(&self) -> u8 { self.sreg }
        fn set_sreg(&mut self, val: u8) { self.sreg = val; }
        fn get_temp(&self) -> u8 { self.temp }
        fn set_temp(&mut self, val: u8) { self.temp = val; }
        fn get_rampz(&self) -> u8 { self.rampz }
        fn set_rampz(&mut self, val: u8) { self.rampz = val; }
    }

    #[test]
    fn test_lookup_tables_direct() {
        // Direct table tests as specified in requirements:
        assert_eq!(ADD_FLAGS[0x0F | (0x01 << 8)] & FLAG_H, FLAG_H); // 0x01 + 0x0F = 0x10 half carry
        assert_eq!(ADD_FLAGS[(0x0F << 8) | 0x01] & FLAG_H, FLAG_H); // 0x0F + 0x01 = 0x10 half carry
        assert_eq!(INC_FLAGS[0x7F] & FLAG_V, FLAG_V);
        assert_eq!(INC_FLAGS[0x7F] & FLAG_C, 0); // C preserved logic: table has 0 C
        assert_eq!(DEC_FLAGS[0x80] & FLAG_V, FLAG_V);
        assert_eq!(NEG_FLAGS[0x00] & FLAG_C, 0);
        assert_eq!(NEG_FLAGS[0x01] & FLAG_C, FLAG_C);
        assert_eq!(NEG_FLAGS[0x80] & FLAG_V, FLAG_V);
        assert_eq!(COM_FLAGS[0x55] & FLAG_C, FLAG_C);
        assert_eq!(AND_FLAGS[(0xFF << 8) | 0x00] & FLAG_Z, FLAG_Z);
        assert_eq!(AND_FLAGS[(0xFF << 8) | 0x00] & FLAG_V, 0);
        assert_eq!(OR_FLAGS[(0x00 << 8) | 0x00] & FLAG_Z, FLAG_Z);
        assert_eq!(EOR_FLAGS[(0x55 << 8) | 0x55] & FLAG_Z, FLAG_Z);
    }

    #[test]
    fn test_add_half_carry() {
        // ADD 0x0F + 0x01 = 0x10 -> H=1, C=0
        let mut state = MockAluState::new();
        state.regs[16] = 0x0F;
        state.regs[17] = 0x01;

        let sreg = add(&mut state, 16, 17);
        assert_eq!(state.regs[16], 0x10);
        assert_ne!(sreg & FLAG_H, 0, "H flag must be set for 0x0F + 0x01");
        assert_eq!(sreg & FLAG_C, 0, "C flag must be clear for 0x0F + 0x01");
        assert_eq!(sreg & FLAG_Z, 0, "Z flag must be clear");
    }

    #[test]
    fn test_sub_half_borrow() {
        // SUB 0x10 - 0x01 = 0x0F -> H=1, C=0
        let mut state = MockAluState::new();
        state.regs[16] = 0x10;
        state.regs[17] = 0x01;

        let sreg = sub(&mut state, 16, 17);
        assert_eq!(state.regs[16], 0x0F);
        assert_ne!(sreg & FLAG_H, 0, "H flag must be set for borrow across bit 3");
        assert_eq!(sreg & FLAG_C, 0, "C flag must be clear");
        assert_eq!(sreg & FLAG_Z, 0, "Z flag must be clear");
    }

    #[test]
    fn test_inc_overflow_and_preserve_carry() {
        let mut state = MockAluState::new();
        state.regs[16] = 0x7F;
        state.sreg = FLAG_C | FLAG_I; // Set C and I

        let sreg = inc(&mut state, 16);
        assert_eq!(state.regs[16], 0x80);
        assert_ne!(sreg & FLAG_V, 0, "V flag must be set on 0x7F -> 0x80");
        assert_ne!(sreg & FLAG_N, 0, "N flag must be set for 0x80");
        assert_eq!(sreg & FLAG_S, 0, "S = N ^ V = 1 ^ 1 = 0");
        assert_ne!(sreg & FLAG_C, 0, "C flag MUST be preserved across INC!");
        assert_ne!(sreg & FLAG_I, 0, "I flag MUST be preserved across INC!");
    }

    #[test]
    fn test_dec_overflow_and_preserve_carry() {
        let mut state = MockAluState::new();
        state.regs[16] = 0x80;
        state.sreg = FLAG_C; // Set C

        let sreg = dec(&mut state, 16);
        assert_eq!(state.regs[16], 0x7F);
        assert_ne!(sreg & FLAG_V, 0, "V flag must be set on 0x80 -> 0x7F");
        assert_eq!(sreg & FLAG_N, 0, "N flag must be clear for 0x7F");
        assert_ne!(sreg & FLAG_S, 0, "S = N ^ V = 0 ^ 1 = 1");
        assert_ne!(sreg & FLAG_C, 0, "C flag MUST be preserved across DEC!");
    }

    #[test]
    fn test_neg_flags() {
        // NEG 0x00 -> 0x00: C=0, Z=1, V=0
        let mut state = MockAluState::new();
        state.regs[16] = 0x00;
        let sreg = neg(&mut state, 16);
        assert_eq!(state.regs[16], 0x00);
        assert_eq!(sreg & FLAG_C, 0);
        assert_ne!(sreg & FLAG_Z, 0);
        assert_eq!(sreg & FLAG_V, 0);

        // NEG 0x80 -> 0x80: C=1, Z=0, V=1, N=1, S=0
        state.regs[16] = 0x80;
        let sreg = neg(&mut state, 16);
        assert_eq!(state.regs[16], 0x80);
        assert_ne!(sreg & FLAG_C, 0);
        assert_eq!(sreg & FLAG_Z, 0);
        assert_ne!(sreg & FLAG_V, 0);
        assert_ne!(sreg & FLAG_N, 0);
        assert_eq!(sreg & FLAG_S, 0);

        // NEG 0x01 -> 0xFF: C=1, Z=0, V=0, N=1, S=1, H=1
        state.regs[16] = 0x01;
        let sreg = neg(&mut state, 16);
        assert_eq!(state.regs[16], 0xFF);
        assert_ne!(sreg & FLAG_C, 0);
        assert_eq!(sreg & FLAG_Z, 0);
        assert_eq!(sreg & FLAG_V, 0);
        assert_ne!(sreg & FLAG_N, 0);
        assert_ne!(sreg & FLAG_S, 0);
        assert_ne!(sreg & FLAG_H, 0);
    }

    #[test]
    fn test_and_preserves_c_and_h() {
        let mut state = MockAluState::new();
        state.regs[16] = 0xFF;
        state.regs[17] = 0x00;
        state.sreg = FLAG_H | FLAG_C | FLAG_I;

        let sreg = and(&mut state, 16, 17);
        assert_eq!(state.regs[16], 0x00);
        assert_ne!(sreg & FLAG_Z, 0);
        assert_eq!(sreg & FLAG_V, 0);
        assert_ne!(sreg & FLAG_H, 0, "H flag must be preserved across AND!");
        assert_ne!(sreg & FLAG_C, 0, "C flag must be preserved across AND!");
        assert_ne!(sreg & FLAG_I, 0, "I flag must be preserved across AND!");
    }

    #[test]
    fn test_sbc_zero_propagation() {
        // When previous Z=0, result is 0x00 -> Z must remain 0!
        let mut state = MockAluState::new();
        state.regs[16] = 0x05;
        state.regs[17] = 0x05;
        state.sreg = 0; // Z=0, C=0

        let sreg = sbc(&mut state, 16, 17);
        assert_eq!(state.regs[16], 0x00);
        assert_eq!(sreg & FLAG_Z, 0, "Z must remain 0 in SBC if previous Z was 0");

        // When previous Z=1, result is 0x00 -> Z is 1!
        state.regs[16] = 0x05;
        state.regs[17] = 0x05;
        state.sreg = FLAG_Z; // Z=1, C=0

        let sreg2 = sbc(&mut state, 16, 17);
        assert_eq!(state.regs[16], 0x00);
        assert_ne!(sreg2 & FLAG_Z, 0, "Z must be 1 in SBC if previous Z was 1 and res is 0");
    }
}
