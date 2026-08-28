/**
 * Test Suite for IORegister and ATmega328P Register Map
 * Verifies:
 * 1. PINB write toggles PORTB (Write 0xFF to PINB, expect PORTB toggled)
 * 2. TCCR1A write 0xFF, read back, bits 2 and 3 must be 0 (0xF3)
 * 3. SPH & SPL write immediately updates core 16-bit SP
 * 4. CLKPR prescaler change enable (CLKPCE) 4-cycle handshake window
 * 5. 16-bit registers (OCR1A, TCNT1) using TEMP latch for atomic read/write
 */

import { IAvrCoreContext } from './Register';
import { createAtmega328pRegisterBank } from './atmega328p';

export function runRegisterTests(): { passed: boolean; results: { name: string; passed: boolean; details?: string }[] } {
  const results: { name: string; passed: boolean; details?: string }[] = [];

  function assert(name: string, condition: boolean, details?: string) {
    results.push({
      name,
      passed: !!condition,
      details: condition ? undefined : details || 'Assertion failed',
    });
  }

  const bank = createAtmega328pRegisterBank();
  const sram = new Uint8Array(2048);

  const mockCore: IAvrCoreContext = {
    sramView: sram,
    sp: 0x08ff,
    sreg: 0,
    cycles: 0,
    temp: 0,
    ports: {
      B: { port: 0x55, ddr: 0x00, pin: 0x00 },
      C: { port: 0x00, ddr: 0x00, pin: 0x00 },
      D: { port: 0x00, ddr: 0x00, pin: 0x00 },
    },
  };

  // Pre-populate PORTB with 0x55
  bank.write(mockCore, 0x25, 0x55);
  assert('PORTB initially set to 0x55', bank.read(mockCore, 0x25) === 0x55);

  // -------------------------------------------------------------
  // Test 1: Write 0xFF to PINB, expect PORTB toggled
  // -------------------------------------------------------------
  bank.write(mockCore, 0x23, 0xff); // Write 0xFF to PINB
  const portbAfterToggle = bank.read(mockCore, 0x25);
  assert('Writing 0xFF to PINB toggles PORTB (0x55 ^ 0xFF = 0xAA)', portbAfterToggle === 0xaa);

  // Write 0x0F to PINB -> only lower nibble toggles (0xAA ^ 0x0F = 0xA5)
  bank.write(mockCore, 0x23, 0x0f);
  assert('Writing 0x0F to PINB toggles lower nibble of PORTB (0xA5)', bank.read(mockCore, 0x25) === 0xa5);

  // -------------------------------------------------------------
  // Test 2: Write 0xFF to TCCR1A, read back, bits 2,3 must be 0
  // -------------------------------------------------------------
  bank.write(mockCore, 0x80, 0xff); // TCCR1A = 0x80
  const tccr1aVal = bank.read(mockCore, 0x80);
  assert('TCCR1A written with 0xFF reads back 0xF3 (bits 2,3 are 0)', tccr1aVal === 0xf3);
  assert('TCCR1A bit 2 is 0', (tccr1aVal & (1 << 2)) === 0);
  assert('TCCR1A bit 3 is 0', (tccr1aVal & (1 << 3)) === 0);

  // -------------------------------------------------------------
  // Test 3: SPH & SPL write immediately updates core.sp
  // -------------------------------------------------------------
  bank.write(mockCore, 0x5e, 0x04); // SPH = 0x04
  bank.write(mockCore, 0x5d, 0x20); // SPL = 0x20
  assert('Writing SPH=0x04 and SPL=0x20 updates core.sp to 0x0420', mockCore.sp === 0x0420);

  // -------------------------------------------------------------
  // Test 4: CLKPR CLKPCE 4-cycle handshake window
  // -------------------------------------------------------------
  mockCore.cycles = 100;
  // Attempt to write prescaler = 3 without setting CLKPCE first
  bank.write(mockCore, 0x61, 0x03);
  assert('Writing CLKPR without CLKPCE leaves prescaler at 0', (bank.read(mockCore, 0x61) & 0x0f) === 0);

  // Set CLKPCE (0x80) at cycle 100 -> window open until cycle 104
  bank.write(mockCore, 0x61, 0x80);
  mockCore.cycles = 102; // Within 4 cycles
  bank.write(mockCore, 0x61, 0x04); // Prescaler = 4
  assert('Writing CLKPR within 4-cycle window updates prescaler to 4', (bank.read(mockCore, 0x61) & 0x0f) === 0x04);

  // -------------------------------------------------------------
  // Test 5: 16-bit register atomic access using TEMP (OCR1A & TCNT1)
  // -------------------------------------------------------------
  let lastWrittenOCR1A = 0;
  mockCore.timer1 = {
    writeOCR1A: (val: number) => {
      lastWrittenOCR1A = val;
    },
    readTCNT: () => 0x1234,
  };

  // Write OCR1AH (0x89) = 0x03 (stored in temp)
  bank.write(mockCore, 0x89, 0x03);
  assert('OCR1AH write stores 0x03 into core.temp', mockCore.temp === 0x03);
  assert('OCR1A not yet updated before low byte write', lastWrittenOCR1A === 0);

  // Write OCR1AL (0x88) = 0xE8 -> triggers 16-bit write of 0x03E8 (1000)
  bank.write(mockCore, 0x88, 0xe8);
  assert('OCR1AL write completes 16-bit write with OCR1A = 0x03E8 (1000)', lastWrittenOCR1A === 1000);

  // Read 16-bit TCNT1 (0x1234):
  // Reading TCNT1L (0x84) latches 0x12 into TEMP and returns 0x34
  const tcntL = bank.read(mockCore, 0x84);
  assert('Reading TCNT1L returns 0x34 and latches 0x12 into core.temp', tcntL === 0x34 && mockCore.temp === 0x12);

  // Reading TCNT1H (0x85) returns core.temp (0x12)
  const tcntH = bank.read(mockCore, 0x85);
  assert('Reading TCNT1H returns core.temp = 0x12', tcntH === 0x12);

  const allPassed = results.every((r) => r.passed);
  return { passed: allPassed, results };
}
