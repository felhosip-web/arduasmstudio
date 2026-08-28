/**
 * (c) 2026 AI Studio AVR Visual Studio
 * AVR Memory & Register Watchpoint Engine
 * Provides cycle-accurate data breakpoints for SRAM memory cells, I/O registers, CPU registers, and pins.
 */

import {
  AvrWatchpoint,
  AvrWatchpointCondition,
  AvrWatchpointTargetType,
  WatchpointHitEvent,
  AvrWatchpointState,
  ArduinoPin,
} from '../types';

export const ATMEGA328P_IO_REGISTERS: { name: string; address: number; description: string }[] = [
  { name: 'PINB', address: 0x23, description: 'Port B Bemeneti Érintkezők (D8-D13)' },
  { name: 'DDRB', address: 0x24, description: 'Port B Adatirány Regiszter' },
  { name: 'PORTB', address: 0x25, description: 'Port B Adatregiszter / Kimenetek' },
  { name: 'PINC', address: 0x26, description: 'Port C Bemeneti Érintkezők (A0-A5)' },
  { name: 'DDRC', address: 0x27, description: 'Port C Adatirány Regiszter' },
  { name: 'PORTC', address: 0x28, description: 'Port C Adatregiszter / Kimenetek' },
  { name: 'PIND', address: 0x29, description: 'Port D Bemeneti Érintkezők (D0-D7)' },
  { name: 'DDRD', address: 0x2a, description: 'Port D Adatirány Regiszter' },
  { name: 'PORTD', address: 0x2b, description: 'Port D Adatregiszter / Kimenetek' },
  { name: 'TCCR0A', address: 0x44, description: 'Timer0 Vezérlő A (Fast PWM, CTC)' },
  { name: 'TCCR0B', address: 0x45, description: 'Timer0 Vezérlő B (Prescaler)' },
  { name: 'TCNT0', address: 0x46, description: 'Timer0 8-bites Számláló' },
  { name: 'OCR0A', address: 0x47, description: 'Timer0 Kimeneti Összehasonlító A' },
  { name: 'OCR0B', address: 0x48, description: 'Timer0 Kimeneti Összehasonlító B' },
  { name: 'TCCR1A', address: 0x80, description: 'Timer1 16-bit Vezérlő A' },
  { name: 'TCCR1B', address: 0x81, description: 'Timer1 16-bit Vezérlő B' },
  { name: 'TCNT1L', address: 0x84, description: 'Timer1 16-bit Számláló (Alsó)' },
  { name: 'OCR1AL', address: 0x88, description: 'Timer1 Összehasonlító A (Alsó)' },
  { name: 'TCCR2A', address: 0xb0, description: 'Timer2 Vezérlő A' },
  { name: 'TCCR2B', address: 0xb1, description: 'Timer2 Vezérlő B' },
  { name: 'OCR2A', address: 0xb3, description: 'Timer2 Összehasonlító A' },
  { name: 'UDR0', address: 0xc6, description: 'USART0 I/O Adatregiszter' },
  { name: 'UBRR0L', address: 0xc4, description: 'USART0 Baud Ráta (Alsó)' },
  { name: 'UCSR0B', address: 0xc1, description: 'USART0 Vezérlő B (TXEN, RXEN)' },
  { name: 'SPL', address: 0x5d, description: 'Stack Pointer Alsó Bájt' },
  { name: 'SPH', address: 0x5e, description: 'Stack Pointer Felső Bájt' },
  { name: 'SREG', address: 0x5f, description: 'AVR Státuszregiszter (I, T, H, S, V, N, Z, C)' },
];

export const DEFAULT_WATCHPOINTS: AvrWatchpoint[] = [
  {
    id: 'wp_sram_0100',
    name: 'SRAM[0x0100] == 0xFF Érték Figyelés',
    enabled: true,
    targetType: 'sram',
    targetAddress: 0x0100,
    condition: 'EQUALS',
    expectedValue: 0xff,
    hitCount: 0,
    description: 'Megállítja a szimulációt, ha az SRAM 0x0100-as memóriarekeszébe 0xFF (255) érték kerül beírásra.',
  },
  {
    id: 'wp_portb_write',
    name: 'PORTB Írás Figyelés (D8-D13 / LED)',
    enabled: true,
    targetType: 'io_register',
    targetRegister: 'PORTB',
    targetAddress: 0x25,
    condition: 'ON_WRITE',
    hitCount: 0,
    description: 'Megállítja a szimulációt, ha bármilyen írás történik a PORTB adatregiszterbe (pl. D13 LED vagy digitális kimenet váltás).',
  },
  {
    id: 'wp_sp_low',
    name: 'Stack Pointer (SP) <= 0x0750 Mély Hívás Figyelő',
    enabled: false,
    targetType: 'io_register',
    targetRegister: 'SP',
    condition: 'LESS_EQUAL',
    expectedValue: 0x0750,
    hitCount: 0,
    description: 'Megállítja a szimulációt, ha a stack pointer túlzottan mélyre nő, jelezve a lehetséges stack-heap ütközést.',
  },
  {
    id: 'wp_udr0_tx',
    name: 'USART UDR0 Soros Adatírás',
    enabled: false,
    targetType: 'io_register',
    targetRegister: 'UDR0',
    targetAddress: 0xc6,
    condition: 'ON_WRITE',
    hitCount: 0,
    description: 'Megállítja a szimulációt minden alkalommal, amikor egy bájtot kiküld a mikrokontroller a soros portra.',
  },
];

export function createInitialWatchpointState(): AvrWatchpointState {
  return {
    watchpoints: [...DEFAULT_WATCHPOINTS],
    isPausedOnWatchpoint: false,
    lastHitEvent: null,
    hitHistory: [],
  };
}

/**
 * Disassembles a 16-bit opcode into a human-readable AVR assembly string
 */
export function disassembleAvrOpcode(word: number, pc: number): string {
  // Common opcodes pattern matching
  if (word === 0x0000) return 'NOP';
  if (word === 0x9508) return 'RET';
  if (word === 0x9518) return 'RETI';
  if (word === 0x9478) return 'SEI (I=1)';
  if (word === 0x94f8) return 'CLI (I=0)';

  // RJMP k (0xCxxx)
  if ((word & 0xf000) === 0xc000) {
    const k = (word & 0x0fff);
    const offset = k >= 0x0800 ? k - 0x1000 : k;
    const target = (pc + 1 + offset) & 0x3fff;
    return `RJMP 0x${(target * 2).toString(16).toUpperCase().padStart(4, '0')}`;
  }

  // RCALL k (0xDxxx)
  if ((word & 0xf000) === 0xd000) {
    const k = (word & 0x0fff);
    const offset = k >= 0x0800 ? k - 0x1000 : k;
    const target = (pc + 1 + offset) & 0x3fff;
    return `RCALL 0x${(target * 2).toString(16).toUpperCase().padStart(4, '0')}`;
  }

  // LDI Rd, K (0xExKx)
  if ((word & 0xf000) === 0xe000) {
    const d = ((word >> 4) & 0x0f) + 16;
    const K = ((word >> 4) & 0xf0) | (word & 0x0f);
    return `LDI r${d}, 0x${K.toString(16).toUpperCase().padStart(2, '0')}`;
  }

  // OUT A, Rr (0xB8xx .. 0xBFxx)
  if ((word & 0xf800) === 0xb800) {
    const A = ((word >> 5) & 0x30) | (word & 0x0f);
    const r = (word >> 4) & 0x1f;
    const regName = ATMEGA328P_IO_REGISTERS.find((reg) => reg.address - 0x20 === A)?.name || `0x${A.toString(16)}`;
    return `OUT ${regName}, r${r}`;
  }

  // IN Rd, A (0xB0xx .. 0xB7xx)
  if ((word & 0xf800) === 0xb000) {
    const A = ((word >> 5) & 0x30) | (word & 0x0f);
    const d = (word >> 4) & 0x1f;
    const regName = ATMEGA328P_IO_REGISTERS.find((reg) => reg.address - 0x20 === A)?.name || `0x${A.toString(16)}`;
    return `IN r${d}, ${regName}`;
  }

  // SBI A, b (0x9Axx)
  if ((word & 0xff00) === 0x9a00) {
    const A = (word >> 3) & 0x1f;
    const b = word & 0x07;
    const regName = ATMEGA328P_IO_REGISTERS.find((reg) => reg.address - 0x20 === A)?.name || `0x${A.toString(16)}`;
    return `SBI ${regName}, ${b}`;
  }

  // CBI A, b (0x98xx)
  if ((word & 0xff00) === 0x9800) {
    const A = (word >> 3) & 0x1f;
    const b = word & 0x07;
    const regName = ATMEGA328P_IO_REGISTERS.find((reg) => reg.address - 0x20 === A)?.name || `0x${A.toString(16)}`;
    return `CBI ${regName}, ${b}`;
  }

  // PUSH Rr (0x920F .. 0x93FF)
  if ((word & 0xfe0f) === 0x920f) {
    const r = (word >> 4) & 0x1f;
    return `PUSH r${r}`;
  }

  // POP Rd (0x900F .. 0x91FF)
  if ((word & 0xfe0f) === 0x900f) {
    const d = (word >> 4) & 0x1f;
    return `POP r${d}`;
  }

  // STS k, Rr or LDS Rd, k (two words)
  if ((word & 0xfe0f) === 0x9200) {
    const r = (word >> 4) & 0x1f;
    return `STS (RAM), r${r}`;
  }
  if ((word & 0xfe0f) === 0x9000) {
    const d = (word >> 4) & 0x1f;
    return `LDS r${d}, (RAM)`;
  }

  return `OPCODE 0x${word.toString(16).toUpperCase().padStart(4, '0')}`;
}

/**
 * Evaluates watchpoints against memory / register / pin access events
 */
export function evaluateWatchpointCondition(
  wp: AvrWatchpoint,
  eventType: 'WRITE' | 'READ' | 'PIN_CHANGE',
  oldValue: number,
  newValue: number
): boolean {
  if (!wp.enabled) return false;

  const expected = wp.expectedValue ?? 0;

  switch (wp.condition) {
    case 'ON_WRITE':
      return eventType === 'WRITE';

    case 'ON_READ':
      return eventType === 'READ';

    case 'ON_CHANGE':
      return oldValue !== newValue;

    case 'EQUALS':
      return newValue === expected;

    case 'NOT_EQUALS':
      return newValue !== expected;

    case 'GREATER':
      return newValue > expected;

    case 'LESS':
      return newValue < expected;

    case 'GREATER_EQUAL':
      return newValue >= expected;

    case 'LESS_EQUAL':
      return newValue <= expected;

    case 'BIT_SET': {
      const bit = wp.bitIndex ?? 0;
      return (newValue & (1 << bit)) !== 0 && (oldValue & (1 << bit)) === 0;
    }

    case 'BIT_CLEARED': {
      const bit = wp.bitIndex ?? 0;
      return (newValue & (1 << bit)) === 0 && (oldValue & (1 << bit)) !== 0;
    }

    default:
      return false;
  }
}

/**
 * Checks all active watchpoints during an SRAM or I/O access
 */
export function checkAvrWatchpoints(
  watchpoints: AvrWatchpoint[],
  access: {
    type: 'sram' | 'io_register' | 'cpu_register' | 'pin';
    address?: number;
    registerName?: string;
    pin?: ArduinoPin;
    eventType: 'WRITE' | 'READ' | 'PIN_CHANGE';
    oldValue: number;
    newValue: number;
    pc: number;
    cycle: number;
    progWord?: number;
  }
): WatchpointHitEvent | null {
  for (const wp of watchpoints) {
    if (!wp.enabled) continue;

    let targetMatches = false;
    let targetDescription = '';

    if (wp.targetType === 'sram' && access.type === 'sram') {
      if (wp.targetAddress === access.address) {
        targetMatches = true;
        targetDescription = `SRAM[0x${access.address?.toString(16).toUpperCase().padStart(4, '0')}]`;
      }
    } else if (wp.targetType === 'io_register' && (access.type === 'io_register' || access.type === 'sram')) {
      if (wp.targetRegister && access.registerName) {
        targetMatches = wp.targetRegister.toUpperCase() === access.registerName.toUpperCase();
      } else if (wp.targetAddress !== undefined && access.address !== undefined) {
        targetMatches = wp.targetAddress === access.address;
      }
      targetDescription = `I/O Regiszter ${wp.targetRegister || `0x${wp.targetAddress?.toString(16)}`}`;
    } else if (wp.targetType === 'cpu_register' && access.type === 'cpu_register') {
      if (wp.targetRegister && access.registerName) {
        targetMatches = wp.targetRegister.toLowerCase() === access.registerName.toLowerCase();
      }
      targetDescription = `CPU Regiszter ${wp.targetRegister}`;
    } else if (wp.targetType === 'pin' && access.type === 'pin') {
      if (wp.targetPin === access.pin) {
        targetMatches = true;
        targetDescription = `Arduino Pin D${access.pin}`;
      }
    }

    if (targetMatches) {
      const isHit = evaluateWatchpointCondition(wp, access.eventType, access.oldValue, access.newValue);
      if (isHit) {
        const disasm = access.progWord !== undefined
          ? disassembleAvrOpcode(access.progWord, access.pc)
          : `PC 0x${access.pc.toString(16).toUpperCase()}`;

        return {
          watchpoint: { ...wp },
          pc: access.pc,
          instructionHex: access.progWord ? `0x${access.progWord.toString(16).toUpperCase().padStart(4, '0')}` : undefined,
          disassembled: disasm,
          cycle: access.cycle,
          timestampNs: access.cycle * 62.5,
          oldValue: access.oldValue,
          newValue: access.newValue,
          targetDescription,
        };
      }
    }
  }

  return null;
}
