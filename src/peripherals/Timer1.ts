/**
 * (c) 2026 AI Studio AVR8 Engine
 * Cycle-Accurate 16-bit Timer/Counter1 Peripheral for ATmega328P and ATtiny85
 *
 * ARCHITECTURE RULES:
 * 1. Event-driven: TickQueue min-heap integration with { at: cpuCycles, cb }.
 * 2. Two-phase I/O: 1-cycle write-latch for output compare pin synchronization (OC1A/OC1B).
 * 3. No magic numbers: Explicit WGM, COM, and CS enums based on ATmega328P datasheet Tables 16-4 & 16-5.
 *
 * SPEC: Phase and Frequency Correct PWM (WGM Modes 8 and 9)
 * - WGM Mode 8: TOP = ICR1 (not double buffered), OCR1A/B double buffered at BOTTOM.
 *   Hardware Glitch: If ICR1 < TCNT1 is written while counting UP, TCNT1 overflows to 0xFFFF without clamping.
 * - WGM Mode 9: TOP = OCR1A (double buffered at BOTTOM), OCR1B double buffered at BOTTOM.
 */

// =========================================================================
// 1. DATASHEET CONSTANTS & ENUMS (Tables 16-1, 16-2, 16-3, 16-4, 16-5, 16-6)
// =========================================================================

/** Waveform Generation Modes (WGM13:0) */
export enum Timer1WgmMode {
  NORMAL_0 = 0,                                 // 0000: Normal, TOP = 0xFFFF, Update Immediate, TOV1 at MAX
  PWM_PHASE_CORRECT_8BIT_1 = 1,                 // 0001: Phase Correct 8-bit, TOP = 0x00FF
  PWM_PHASE_CORRECT_9BIT_2 = 2,                 // 0010: Phase Correct 9-bit, TOP = 0x01FF
  PWM_PHASE_CORRECT_10BIT_3 = 3,                // 0011: Phase Correct 10-bit, TOP = 0x03FF
  CTC_OCR1A_4 = 4,                              // 0100: CTC, TOP = OCR1A
  FAST_PWM_8BIT_5 = 5,                          // 0101: Fast PWM 8-bit, TOP = 0x00FF
  FAST_PWM_9BIT_6 = 6,                          // 0110: Fast PWM 9-bit, TOP = 0x01FF
  FAST_PWM_10BIT_7 = 7,                         // 0111: Fast PWM 10-bit, TOP = 0x03FF
  PWM_PHASE_FREQ_CORRECT_ICR1_8 = 8,            // 1000: Phase & Freq Correct, TOP = ICR1, Update at BOTTOM, TOV1 at BOTTOM
  PWM_PHASE_FREQ_CORRECT_OCR1A_9 = 9,           // 1001: Phase & Freq Correct, TOP = OCR1A, Update at BOTTOM, TOV1 at BOTTOM
  PWM_PHASE_CORRECT_ICR1_10 = 10,               // 1010: Phase Correct, TOP = ICR1, Update at TOP
  PWM_PHASE_CORRECT_OCR1A_11 = 11,              // 1011: Phase Correct, TOP = OCR1A, Update at TOP
  CTC_ICR1_12 = 12,                             // 1100: CTC, TOP = ICR1
  RESERVED_13 = 13,                             // 1101: Reserved
  FAST_PWM_ICR1_14 = 14,                        // 1110: Fast PWM, TOP = ICR1
  FAST_PWM_OCR1A_15 = 15,                       // 1111: Fast PWM, TOP = OCR1A
}

/** Compare Output Mode for Phase/Freq Correct PWM (COM1A1:0 / COM1B1:0) */
export enum Timer1CompareOutputMode {
  DISCONNECTED = 0,                             // 00: Normal port operation, OC1A/OC1B disconnected
  TOGGLE_OC1A = 1,                              // 01: Toggle OC1A on match (Mode 9/14/15 only), OC1B disconnected
  CLEAR_UP_SET_DOWN_NON_INVERTING = 2,          // 10: Clear on match up-counting, Set on match down-counting
  SET_UP_CLEAR_DOWN_INVERTING = 3,              // 11: Set on match up-counting, Clear on match down-counting
}

/** Clock Select / Prescaler (CS12:0) */
export enum Timer1ClockSelect {
  STOPPED = 0,                                  // 000: No clock source (Timer stopped)
  PRESCALER_1 = 1,                              // 001: clk_IO / 1
  PRESCALER_8 = 2,                              // 010: clk_IO / 8
  PRESCALER_64 = 3,                             // 011: clk_IO / 64
  PRESCALER_256 = 4,                            // 100: clk_IO / 256
  PRESCALER_1024 = 5,                           // 101: clk_IO / 1024
  EXT_FALLING_EDGE = 6,                         // 110: External clock on T1 pin (falling edge)
  EXT_RISING_EDGE = 7,                          // 111: External clock on T1 pin (rising edge)
}

/** Interrupt Flag Register Bits for Timer1 (TIFR1 & TIMSK1) */
export const TIMER1_FLAG_TOV1 = 0x01;  // Bit 0: Timer/Counter1 Overflow Flag
export const TIMER1_FLAG_OCF1A = 0x02; // Bit 1: Timer/Counter1 Output Compare A Match Flag
export const TIMER1_FLAG_OCF1B = 0x04; // Bit 2: Timer/Counter1 Output Compare B Match Flag
export const TIMER1_FLAG_ICF1 = 0x20;  // Bit 5: Timer/Counter1 Input Capture Flag

// Register index mapping inside 16-bit typed array
const REG_IDX_TCNT1 = 0;
const REG_IDX_OCR1A_BUF = 1;
const REG_IDX_OCR1A_ACTIVE = 2;
const REG_IDX_OCR1B_BUF = 3;
const REG_IDX_OCR1B_ACTIVE = 4;
const REG_IDX_ICR1 = 5;
const REG_IDX_TCCR1A = 6;
const REG_IDX_TCCR1B = 7;
const REG_IDX_TCCR1C = 8;
const REG_IDX_TIMSK1 = 9;
const REG_IDX_TIFR1 = 10;
const REG_COUNT = 11;

export interface TickQueueEvent {
  at: number;
  cb: () => void;
  id?: number;
  type?: string;
}

export interface ITickQueue {
  push: (event: TickQueueEvent) => number;
  peek?: () => TickQueueEvent | null;
  pop?: () => TickQueueEvent | null;
}

// =========================================================================
// 2. CYCLE-ACCURATE TIMER1 IMPLEMENTATION
// =========================================================================

export class Timer1 {
  /** 16-bit register storage using Uint16Array - No floats! */
  private regs: Uint16Array = new Uint16Array(REG_COUNT);

  /** Counting Direction: +1 for UP-counting, -1 for DOWN-counting */
  private direction: 1 | -1 = 1;

  /** Prescaler accumulator */
  private prescalerCounter: number = 0;

  /** Glitch detection flag (when TCNT1 exceeds un-buffered ICR1 during up-counting) */
  private glitchDetected: boolean = false;

  /** Glitch counter */
  private glitchCount: number = 0;

  /** Two-phase I/O latches for OC1A and OC1B output pins */
  public oc1a_write_latch: 0 | 1 = 0;
  public oc1a_pin_synced: 0 | 1 = 0;

  public oc1b_write_latch: 0 | 1 = 0;
  public oc1b_pin_synced: 0 | 1 = 0;

  /** Global CPU cycles reference and optional TickQueue integration */
  public cpuCycles: number = 0;
  public tickQueue?: ITickQueue;

  /** Optional callbacks for Interrupt Vectors */
  public onInterrupt?: (vector: 'TIMER1_OVF' | 'TIMER1_COMPA' | 'TIMER1_COMPB' | 'TIMER1_CAPT') => void;

  constructor(tickQueue?: ITickQueue) {
    this.tickQueue = tickQueue;
    this.reset();
  }

  /**
   * Resets Timer1 registers and internal state to hardware defaults
   */
  public reset(): void {
    this.regs.fill(0);
    this.direction = 1;
    this.prescalerCounter = 0;
    this.glitchDetected = false;
    this.glitchCount = 0;
    this.oc1a_write_latch = 0;
    this.oc1a_pin_synced = 0;
    this.oc1b_write_latch = 0;
    this.oc1b_pin_synced = 0;
    this.cpuCycles = 0;
  }

  // =========================================================================
  // REGISTER ACCESSORS & CONFIGURATION
  // =========================================================================

  public readTCNT(): number {
    return this.regs[REG_IDX_TCNT1];
  }

  public writeTCNT(val: number): void {
    this.regs[REG_IDX_TCNT1] = val & 0xffff;
    if (this.regs[REG_IDX_TCNT1] === 0) {
      this.handleBottomReached();
    }
  }

  /**
   * Writes to OCR1A buffer. In Modes 8 and 9, active compare register is updated ONLY at BOTTOM.
   */
  public writeOCR1A(val: number): void {
    this.regs[REG_IDX_OCR1A_BUF] = val & 0xffff;
    // If timer is at BOTTOM and not running or just initialized, sync active immediately
    if (this.regs[REG_IDX_TCNT1] === 0 && this.cpuCycles === 0) {
      this.regs[REG_IDX_OCR1A_ACTIVE] = this.regs[REG_IDX_OCR1A_BUF];
    }
  }

  public readOCR1A_Buf(): number {
    return this.regs[REG_IDX_OCR1A_BUF];
  }

  public readOCR1A_Active(): number {
    return this.regs[REG_IDX_OCR1A_ACTIVE];
  }

  /**
   * Writes to OCR1B buffer. Double-buffered at BOTTOM in Modes 8 and 9.
   */
  public writeOCR1B(val: number): void {
    this.regs[REG_IDX_OCR1B_BUF] = val & 0xffff;
    if (this.regs[REG_IDX_TCNT1] === 0 && this.cpuCycles === 0) {
      this.regs[REG_IDX_OCR1B_ACTIVE] = this.regs[REG_IDX_OCR1B_BUF];
    }
  }

  public readOCR1B_Buf(): number {
    return this.regs[REG_IDX_OCR1B_BUF];
  }

  public readOCR1B_Active(): number {
    return this.regs[REG_IDX_OCR1B_ACTIVE];
  }

  /**
   * Writes to ICR1.
   * NOTE: In Mode 8 (TOP=ICR1), ICR1 is NOT double buffered!
   * If CPU writes ICR1 < TCNT1 while counting UP, TCNT1 will miss the compare and
   * count up to 0xFFFF without clamping (Hardware Glitch).
   */
  public writeICR1(val: number): void {
    const newIcr1 = val & 0xffff;
    const currentTcnt = this.regs[REG_IDX_TCNT1];
    const mode = this.getWgmMode();

    if (mode === Timer1WgmMode.PWM_PHASE_FREQ_CORRECT_ICR1_8) {
      // Check for glitch condition: counting UP and new ICR1 is already below current TCNT1
      if (this.direction === 1 && newIcr1 < currentTcnt) {
        this.glitchDetected = true;
        this.glitchCount++;
      }
    }

    this.regs[REG_IDX_ICR1] = newIcr1;
  }

  public readICR1(): number {
    return this.regs[REG_IDX_ICR1];
  }

  public writeTCCR1A(val: number): void {
    this.regs[REG_IDX_TCCR1A] = val & 0xff;
  }

  public readTCCR1A(): number {
    return this.regs[REG_IDX_TCCR1A];
  }

  public writeTCCR1B(val: number): void {
    this.regs[REG_IDX_TCCR1B] = val & 0xff;
  }

  public readTCCR1B(): number {
    return this.regs[REG_IDX_TCCR1B];
  }

  public writeTIMSK1(val: number): void {
    this.regs[REG_IDX_TIMSK1] = val & 0xff;
  }

  public readTIMSK1(): number {
    return this.regs[REG_IDX_TIMSK1];
  }

  public writeTIFR1(val: number): void {
    // Writing 1 to a flag bit in TIFR clears it!
    this.regs[REG_IDX_TIFR1] &= ~(val & 0xff);
  }

  public readTIFR1(): number {
    return this.regs[REG_IDX_TIFR1];
  }

  /**
   * Extracts WGM mode from TCCR1B (WGM13:12) and TCCR1A (WGM11:10)
   */
  public getWgmMode(): Timer1WgmMode {
    const tccr1a = this.regs[REG_IDX_TCCR1A];
    const tccr1b = this.regs[REG_IDX_TCCR1B];
    const wgm10_11 = tccr1a & 0x03;
    const wgm12_13 = (tccr1b >> 3) & 0x03;
    return ((wgm12_13 << 2) | wgm10_11) as Timer1WgmMode;
  }

  /**
   * Sets WGM mode into TCCR1A and TCCR1B
   */
  public setWgmMode(mode: Timer1WgmMode): void {
    const wgm = mode & 0x0f;
    const wgm10_11 = wgm & 0x03;
    const wgm12_13 = (wgm >> 2) & 0x03;
    this.regs[REG_IDX_TCCR1A] = (this.regs[REG_IDX_TCCR1A] & ~0x03) | wgm10_11;
    this.regs[REG_IDX_TCCR1B] = (this.regs[REG_IDX_TCCR1B] & ~(0x03 << 3)) | (wgm12_13 << 3);
  }

  public getCom1A(): Timer1CompareOutputMode {
    return ((this.regs[REG_IDX_TCCR1A] >> 6) & 0x03) as Timer1CompareOutputMode;
  }

  public setCom1A(mode: Timer1CompareOutputMode): void {
    this.regs[REG_IDX_TCCR1A] = (this.regs[REG_IDX_TCCR1A] & ~(0x03 << 6)) | ((mode & 0x03) << 6);
  }

  public getCom1B(): Timer1CompareOutputMode {
    return ((this.regs[REG_IDX_TCCR1A] >> 4) & 0x03) as Timer1CompareOutputMode;
  }

  public setCom1B(mode: Timer1CompareOutputMode): void {
    this.regs[REG_IDX_TCCR1A] = (this.regs[REG_IDX_TCCR1A] & ~(0x03 << 4)) | ((mode & 0x03) << 4);
  }

  public getClockSelect(): Timer1ClockSelect {
    return (this.regs[REG_IDX_TCCR1B] & 0x07) as Timer1ClockSelect;
  }

  public setClockSelect(cs: Timer1ClockSelect): void {
    this.regs[REG_IDX_TCCR1B] = (this.regs[REG_IDX_TCCR1B] & ~0x07) | (cs & 0x07);
  }

  public getPrescalerDivisor(): number {
    switch (this.getClockSelect()) {
      case Timer1ClockSelect.PRESCALER_1: return 1;
      case Timer1ClockSelect.PRESCALER_8: return 8;
      case Timer1ClockSelect.PRESCALER_64: return 64;
      case Timer1ClockSelect.PRESCALER_256: return 256;
      case Timer1ClockSelect.PRESCALER_1024: return 1024;
      default: return 0; // Stopped or External
    }
  }

  public getDirection(): 1 | -1 {
    return this.direction;
  }

  public checkGlitch(): boolean {
    return this.glitchDetected;
  }

  public getGlitchCount(): number {
    return this.glitchCount;
  }

  public clearGlitch(): void {
    this.glitchDetected = false;
  }

  // =========================================================================
  // 3. CORE TICK & PHASE/FREQUENCY CORRECT PWM LOGIC (WGM 8 & 9)
  // =========================================================================

  /**
   * Evaluates one CPU cycle.
   * Synchronizes 2-phase I/O pin states and executes timer step when prescaler fires.
   */
  public tick(): void {
    this.cpuCycles++;

    // Phase 2 of Two-Phase I/O: Latch previously written output pin levels
    this.oc1a_pin_synced = this.oc1a_write_latch;
    this.oc1b_pin_synced = this.oc1b_write_latch;

    const divisor = this.getPrescalerDivisor();
    if (divisor === 0) return; // Timer stopped

    this.prescalerCounter++;
    if (this.prescalerCounter >= divisor) {
      this.prescalerCounter = 0;
      this.stepTimer();
    }
  }

  /**
   * Steps the 16-bit counter according to Phase and Frequency Correct PWM specification.
   */
  private stepTimer(): void {
    const mode = this.getWgmMode();
    let currentTcnt = this.regs[REG_IDX_TCNT1];

    // Determine TOP based on WGM mode
    let top = 0xffff;
    if (mode === Timer1WgmMode.PWM_PHASE_FREQ_CORRECT_ICR1_8) {
      top = this.regs[REG_IDX_ICR1];
    } else if (mode === Timer1WgmMode.PWM_PHASE_FREQ_CORRECT_OCR1A_9) {
      top = this.regs[REG_IDX_OCR1A_ACTIVE];
    } else {
      // For future or unsupported modes in this deliverable, default to 0xFFFF
      top = 0xffff;
    }

    // 1. Advance counter in current direction
    if (this.direction === 1) {
      // Counting UP
      if (currentTcnt === top && top !== 0) {
        // Reached TOP on previous cycle: now start counting DOWN
        this.direction = -1;
        currentTcnt = (top - 1) & 0xffff;
      } else if (currentTcnt === 0xffff) {
        // Hardware wrap-around if TCNT exceeded unbuffered TOP due to ICR1 write glitch
        currentTcnt = 0x0000;
        this.handleBottomReached();
      } else {
        currentTcnt = (currentTcnt + 1) & 0xffff;
      }
    } else {
      // Counting DOWN
      if (currentTcnt === 0) {
        // Reached BOTTOM on previous cycle: now start counting UP
        this.handleBottomReached();
        this.direction = 1;
        currentTcnt = 1;
      } else {
        currentTcnt = (currentTcnt - 1) & 0xffff;
      }
    }

    this.regs[REG_IDX_TCNT1] = currentTcnt;

    // 2. Output Compare Matching (Checked in BOTH counting directions)
    this.evaluateCompareMatch(currentTcnt);
  }

  /**
   * Actions performed when BOTTOM (TCNT1 == 0) is reached:
   * - Double buffered registers (OCR1A, OCR1B) are latched from buffer to active!
   * - TOV1 (Timer Overflow Flag) is set.
   */
  private handleBottomReached(): void {
    // Mode 8 and Mode 9: Latch OCR1A and OCR1B buffers into active registers
    this.regs[REG_IDX_OCR1A_ACTIVE] = this.regs[REG_IDX_OCR1A_BUF];
    this.regs[REG_IDX_OCR1B_ACTIVE] = this.regs[REG_IDX_OCR1B_BUF];

    // Set TOV1 flag in TIFR1
    this.regs[REG_IDX_TIFR1] |= TIMER1_FLAG_TOV1;

    // Trigger interrupt if enabled
    if ((this.regs[REG_IDX_TIMSK1] & TIMER1_FLAG_TOV1) && this.onInterrupt) {
      this.onInterrupt('TIMER1_OVF');
    }
  }

  /**
   * Evaluates Compare Match for Channel A and Channel B against active registers.
   */
  private evaluateCompareMatch(tcnt: number): void {
    const ocr1a_active = this.regs[REG_IDX_OCR1A_ACTIVE];
    const ocr1b_active = this.regs[REG_IDX_OCR1B_ACTIVE];
    const comA = this.getCom1A();
    const comB = this.getCom1B();

    // --- Channel A Compare Match ---
    if (tcnt === ocr1a_active) {
      // Set OCF1A flag in TIFR1
      this.regs[REG_IDX_TIFR1] |= TIMER1_FLAG_OCF1A;

      if ((this.regs[REG_IDX_TIMSK1] & TIMER1_FLAG_OCF1A) && this.onInterrupt) {
        this.onInterrupt('TIMER1_COMPA');
      }

      // Update Phase 1 Write Latch for OC1A pin
      if (comA === Timer1CompareOutputMode.CLEAR_UP_SET_DOWN_NON_INVERTING) {
        this.oc1a_write_latch = this.direction === 1 ? 0 : 1;
      } else if (comA === Timer1CompareOutputMode.SET_UP_CLEAR_DOWN_INVERTING) {
        this.oc1a_write_latch = this.direction === 1 ? 1 : 0;
      } else if (comA === Timer1CompareOutputMode.TOGGLE_OC1A) {
        this.oc1a_write_latch = (this.oc1a_write_latch ^ 1) as 0 | 1;
      }
    }

    // --- Channel B Compare Match ---
    if (tcnt === ocr1b_active) {
      // Set OCF1B flag in TIFR1
      this.regs[REG_IDX_TIFR1] |= TIMER1_FLAG_OCF1B;

      if ((this.regs[REG_IDX_TIMSK1] & TIMER1_FLAG_OCF1B) && this.onInterrupt) {
        this.onInterrupt('TIMER1_COMPB');
      }

      // Update Phase 1 Write Latch for OC1B pin
      if (comB === Timer1CompareOutputMode.CLEAR_UP_SET_DOWN_NON_INVERTING) {
        this.oc1b_write_latch = this.direction === 1 ? 0 : 1;
      } else if (comB === Timer1CompareOutputMode.SET_UP_CLEAR_DOWN_INVERTING) {
        this.oc1b_write_latch = this.direction === 1 ? 1 : 0;
      }
    }
  }

  // =========================================================================
  // 4. TICK QUEUE INTEGRATION HELPER
  // =========================================================================

  /**
   * Computes cycles until the next Timer1 event (Compare Match, TOP turnaround, or BOTTOM)
   * and registers it directly into the TickQueue min-heap to eliminate polling!
   */
  public scheduleNextEvent(currentCpuCycle: number): number | null {
    if (!this.tickQueue) return null;
    const divisor = this.getPrescalerDivisor();
    if (divisor === 0) return null;

    const tcnt = this.readTCNT();
    const mode = this.getWgmMode();
    const top = mode === Timer1WgmMode.PWM_PHASE_FREQ_CORRECT_ICR1_8
      ? this.regs[REG_IDX_ICR1]
      : this.regs[REG_IDX_OCR1A_ACTIVE];
    const ocr1a = this.regs[REG_IDX_OCR1A_ACTIVE];

    let timerTicksToNext = 1;
    if (this.direction === 1) {
      if (tcnt < ocr1a) {
        timerTicksToNext = ocr1a - tcnt;
      } else if (tcnt < top) {
        timerTicksToNext = top - tcnt;
      } else {
        timerTicksToNext = 1;
      }
    } else {
      if (tcnt > ocr1a) {
        timerTicksToNext = tcnt - ocr1a;
      } else if (tcnt > 0) {
        timerTicksToNext = tcnt;
      } else {
        timerTicksToNext = 1;
      }
    }

    const cpuCyclesRemaining = (timerTicksToNext * divisor) - this.prescalerCounter;
    const eventCycle = currentCpuCycle + Math.max(1, cpuCyclesRemaining);

    this.tickQueue.push({
      at: eventCycle,
      type: 'TIMER1_EVENT',
      cb: () => this.tick(),
    });

    return eventCycle;
  }
}
