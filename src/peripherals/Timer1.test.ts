/**
 * Unit Tests for Timer1 Phase and Frequency Correct PWM (WGM Mode 8 & Mode 9)
 * Specification Verification Suite
 */

import {
  Timer1,
  Timer1WgmMode,
  Timer1CompareOutputMode,
  Timer1ClockSelect,
  TIMER1_FLAG_TOV1,
  TIMER1_FLAG_OCF1A,
} from './Timer1';

export function runTimer1UnitTests(): { passed: boolean; results: { name: string; passed: boolean; details?: string }[] } {
  const results: { name: string; passed: boolean; details?: string }[] = [];

  function assert(name: string, condition: boolean, details?: string) {
    results.push({
      name,
      passed: !!condition,
      details: condition ? undefined : details || 'Assertion failed',
    });
  }

  // =========================================================================
  // TEST 1: The Mandated Deliverable Test
  // "Set ICR1=200, OCR1A=100, run until TCNT=190, write OCR1A=150.
  // The first period must still end with 100 duty, change only applies after BOTTOM."
  // =========================================================================
  {
    const timer = new Timer1();
    timer.setWgmMode(Timer1WgmMode.PWM_PHASE_FREQ_CORRECT_ICR1_8);
    timer.setCom1A(Timer1CompareOutputMode.CLEAR_UP_SET_DOWN_NON_INVERTING);
    timer.setClockSelect(Timer1ClockSelect.PRESCALER_1);

    timer.writeICR1(200);
    timer.writeOCR1A(100);

    // Initial state: at BOTTOM (0), trigger first bottom latch so active = 100
    // Latch active register
    timer.writeTCNT(0);
    timer.tick(); // tcnt becomes 1, active = 100

    assert('Initial OCR1A buffer is 100', timer.readOCR1A_Buf() === 100);
    assert('Initial OCR1A active is 100', timer.readOCR1A_Active() === 100);

    // Run until TCNT reaches 190
    while (timer.readTCNT() < 190 && timer.getDirection() === 1) {
      timer.tick();
    }
    assert('TCNT reached 190 while counting UP', timer.readTCNT() === 190 && timer.getDirection() === 1);

    // Write new OCR1A = 150 while at 190 (counting UP)
    timer.writeOCR1A(150);
    assert('OCR1A buffer updated to 150', timer.readOCR1A_Buf() === 150);
    assert('OCR1A active remains 100 (double-buffered at BOTTOM)', timer.readOCR1A_Active() === 100);

    // Continue running to TOP (200) and then down-counting
    let matchedOnDownCountAt: number | null = null;
    while (!(timer.readTCNT() === 0 && timer.getDirection() === 1)) {
      const prevDir = timer.getDirection();
      const currentTcnt = timer.readTCNT();

      // Check when OC1A is set on down-count match
      if (prevDir === -1 && currentTcnt === 100 && (timer.readTIFR1() & TIMER1_FLAG_OCF1A)) {
        matchedOnDownCountAt = currentTcnt;
      }

      timer.tick();
      // If we just reached BOTTOM and reversed, break
      if (timer.readTCNT() === 1 && timer.getDirection() === 1) {
        break;
      }
    }

    assert(
      'First period down-count matched at OCR1A active (100), NOT buffer (150)',
      matchedOnDownCountAt === 100,
      `Matched at ${matchedOnDownCountAt}`
    );

    assert(
      'After reaching BOTTOM, OCR1A active is now updated to 150',
      timer.readOCR1A_Active() === 150,
      `Active is ${timer.readOCR1A_Active()}`
    );

    // Verify next period matches at 150 on UP count
    let nextPeriodMatchUpAt: number | null = null;
    timer.writeTIFR1(TIMER1_FLAG_OCF1A); // Clear flag
    while (timer.getDirection() === 1 && timer.readTCNT() <= 160) {
      if (timer.readTCNT() === 150 && (timer.readTIFR1() & TIMER1_FLAG_OCF1A)) {
        nextPeriodMatchUpAt = 150;
      }
      timer.tick();
    }

    assert(
      'Second period up-count correctly matches at new value 150',
      nextPeriodMatchUpAt === 150,
      `Next match at ${nextPeriodMatchUpAt}`
    );
  }

  // =========================================================================
  // TEST 2: Hardware Glitch Behavior in Mode 8 (Unbuffered ICR1 write < TCNT)
  // "If CPU writes ICR1 < TCNT while counting UP, TCNT will continue to 0xFFFF
  // and overflow - DO NOT clamp. This is real hardware glitch behavior."
  // =========================================================================
  {
    const timer = new Timer1();
    timer.setWgmMode(Timer1WgmMode.PWM_PHASE_FREQ_CORRECT_ICR1_8);
    timer.setClockSelect(Timer1ClockSelect.PRESCALER_1);

    timer.writeICR1(300);
    timer.writeOCR1A(100);

    // Count up to 250
    while (timer.readTCNT() < 250) {
      timer.tick();
    }
    assert('Timer reached 250 on up-count', timer.readTCNT() === 250);

    // Now write ICR1 = 150 (< 250)
    timer.writeICR1(150);
    assert('Glitch detected flag is true', timer.checkGlitch() === true);

    // Step next cycle: Timer MUST continue counting UP past 250 (e.g. 251), NOT clamp to 150!
    timer.tick();
    assert(
      'Timer continued counting past new ICR1 (no clamping, hardware glitch verified)',
      timer.readTCNT() === 251 && timer.getDirection() === 1,
      `TCNT is ${timer.readTCNT()}`
    );
  }

  // =========================================================================
  // TEST 3: Mode 9 (WGM 9, TOP = OCR1A double-buffered at BOTTOM)
  // =========================================================================
  {
    const timer = new Timer1();
    timer.setWgmMode(Timer1WgmMode.PWM_PHASE_FREQ_CORRECT_OCR1A_9);
    timer.setClockSelect(Timer1ClockSelect.PRESCALER_1);

    timer.writeOCR1A(50); // Initial TOP
    timer.tick(); // Initialize at bottom -> active TOP = 50

    assert('Mode 9 active TOP is 50', timer.readOCR1A_Active() === 50);

    // Run until TCNT = 30
    while (timer.readTCNT() < 30) {
      timer.tick();
    }

    // Write new OCR1A = 80
    timer.writeOCR1A(80);
    assert('OCR1A buffer updated to 80', timer.readOCR1A_Buf() === 80);
    assert('OCR1A active TOP remains 50 during current period', timer.readOCR1A_Active() === 50);

    // Run until top reversal (50 -> 49)
    let reversedAt: number | null = null;
    while (timer.getDirection() === 1) {
      reversedAt = timer.readTCNT();
      timer.tick();
    }

    assert(
      'Timer turned around at active TOP (50), not new buffer (80)',
      reversedAt === 50,
      `Reversed at ${reversedAt}`
    );
  }

  // =========================================================================
  // TEST 4: Two-Phase I/O Write Latch for OC1A Pin
  // =========================================================================
  {
    const timer = new Timer1();
    timer.setWgmMode(Timer1WgmMode.PWM_PHASE_FREQ_CORRECT_ICR1_8);
    timer.setCom1A(Timer1CompareOutputMode.CLEAR_UP_SET_DOWN_NON_INVERTING);
    timer.setClockSelect(Timer1ClockSelect.PRESCALER_1);
    timer.writeICR1(100);
    timer.writeOCR1A(50);
    timer.tick();

    // Run to TCNT = 49
    while (timer.readTCNT() < 49) {
      timer.tick();
    }

    // Step onto 50: Compare match occurs, write latch updates, pin sync updates next cycle
    timer.tick(); // TCNT becomes 50
    assert('OC1A write latch cleared on UP match', timer.oc1a_write_latch === 0);
  }

  const allPassed = results.every((r) => r.passed);
  return { passed: allPassed, results };
}
