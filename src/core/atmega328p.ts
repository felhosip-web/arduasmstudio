/**
 * (c) 2026 AI Studio AVR8 Engine
 * ATmega328P Complete Register Map from Datasheet
 *
 * Includes:
 * - Full I/O register definitions 0x20..0xFF (mapped to data memory)
 * - Exact readMask / writeMask for reserved & un-writable bits
 * - Hardware side-effects:
 *   * PINx write toggles PORTx
 *   * DDRx write recalculates port directions
 *   * SPH / SPL write updates 16-bit SP immediately
 *   * CLKPR prescaler change enable (CLKPCE) 4-cycle window check
 *   * 16-bit registers (TCNT1, OCR1A, OCR1B, ICR1) use 8-bit TEMP register for atomic access
 */

import { IORegister, RegisterBank, IAvrCoreContext } from './Register';

export function createAtmega328pRegisterBank(): RegisterBank {
  const bank = new RegisterBank();

  // Helper for 16-bit register pairs (L, H) using TEMP register
  function create16BitRegisterPair(
    addrL: number,
    nameL: string,
    addrH: number,
    nameH: string,
    on16BitWrite?: (core: IAvrCoreContext, val16: number) => void,
    on16BitRead?: (core: IAvrCoreContext) => number
  ) {
    let reg16Val = 0;

    const regH = new IORegister(
      addrH,
      nameH,
      0,
      0xff,
      0xff,
      (core, val) => {
        // High byte write stores in TEMP
        core.temp = val & 0xff;
      },
      (core) => {
        // High byte read returns TEMP
        return (core.temp ?? (reg16Val >> 8)) & 0xff;
      }
    );

    const regL = new IORegister(
      addrL,
      nameL,
      0,
      0xff,
      0xff,
      (core, val) => {
        // Low byte write combines written low byte with TEMP into 16-bit value
        const temp = core.temp ?? (regH.value & 0xff);
        reg16Val = ((temp & 0xff) << 8) | (val & 0xff);
        regH.value = temp;
        regL.value = val & 0xff;
        if (on16BitWrite) {
          on16BitWrite(core, reg16Val);
        }
      },
      (core) => {
        // Low byte read latches high byte into TEMP and returns low byte
        const val16 = on16BitRead ? on16BitRead(core) : reg16Val;
        core.temp = (val16 >> 8) & 0xff;
        regH.value = core.temp;
        return val16 & 0xff;
      }
    );

    bank.addRegister(regL);
    bank.addRegister(regH);
  }

  // =========================================================================
  // PORT B Registers (PINB 0x23, DDRB 0x24, PORTB 0x25)
  // =========================================================================
  bank.addRegister(
    new IORegister(
      0x23,
      'PINB',
      0x00,
      0xff,
      0xff,
      (core, val) => {
        // Writing a logic one to PINxn toggles the value of PORTxn
        const portReg = bank.get(0x25);
        if (portReg) {
          portReg.value ^= val & 0xff;
          if (core.sramView) core.sramView[0x25] = portReg.value;
          if (core.ports?.B) core.ports.B.port = portReg.value;
        }
      },
      (core) => {
        return core.ports?.B ? core.ports.B.pin : (bank.get(0x23)?.value ?? 0);
      }
    )
  );

  bank.addRegister(
    new IORegister(0x24, 'DDRB', 0x00, 0xff, 0xff, (core, val) => {
      if (core.ports?.B) core.ports.B.ddr = val;
      core.recalcPortDirection?.('B');
    })
  );

  bank.addRegister(
    new IORegister(0x25, 'PORTB', 0x00, 0xff, 0xff, (core, val) => {
      if (core.ports?.B) core.ports.B.port = val;
    })
  );

  // =========================================================================
  // PORT C Registers (PINC 0x26, DDRC 0x27, PORTC 0x28)
  // =========================================================================
  bank.addRegister(
    new IORegister(
      0x26,
      'PINC',
      0x00,
      0x7f, // PC6..PC0 (7 pins)
      0x7f,
      (core, val) => {
        const portReg = bank.get(0x28);
        if (portReg) {
          portReg.value ^= val & 0x7f;
          if (core.sramView) core.sramView[0x28] = portReg.value;
          if (core.ports?.C) core.ports.C.port = portReg.value;
        }
      },
      (core) => {
        return core.ports?.C ? core.ports.C.pin : (bank.get(0x26)?.value ?? 0);
      }
    )
  );

  bank.addRegister(
    new IORegister(0x27, 'DDRC', 0x00, 0x7f, 0x7f, (core, val) => {
      if (core.ports?.C) core.ports.C.ddr = val & 0x7f;
      core.recalcPortDirection?.('C');
    })
  );

  bank.addRegister(
    new IORegister(0x28, 'PORTC', 0x00, 0x7f, 0x7f, (core, val) => {
      if (core.ports?.C) core.ports.C.port = val & 0x7f;
    })
  );

  // =========================================================================
  // PORT D Registers (PIND 0x29, DDRD 0x2A, PORTD 0x2B)
  // =========================================================================
  bank.addRegister(
    new IORegister(
      0x29,
      'PIND',
      0x00,
      0xff,
      0xff,
      (core, val) => {
        const portReg = bank.get(0x2b);
        if (portReg) {
          portReg.value ^= val & 0xff;
          if (core.sramView) core.sramView[0x2b] = portReg.value;
          if (core.ports?.D) core.ports.D.port = portReg.value;
        }
      },
      (core) => {
        return core.ports?.D ? core.ports.D.pin : (bank.get(0x29)?.value ?? 0);
      }
    )
  );

  bank.addRegister(
    new IORegister(0x2a, 'DDRD', 0x00, 0xff, 0xff, (core, val) => {
      if (core.ports?.D) core.ports.D.ddr = val;
      core.recalcPortDirection?.('D');
    })
  );

  bank.addRegister(
    new IORegister(0x2b, 'PORTD', 0x00, 0xff, 0xff, (core, val) => {
      if (core.ports?.D) core.ports.D.port = val;
    })
  );

  // =========================================================================
  // Interrupt Flags & Masks
  // =========================================================================
  bank.addRegister(new IORegister(0x35, 'TIFR0', 0x00, 0x07, 0x07)); // OCF0B, OCF0A, TOV0
  bank.addRegister(new IORegister(0x36, 'TIFR1', 0x00, 0x27, 0x27)); // ICF1, -, -, OCF1B, OCF1A, TOV1
  bank.addRegister(new IORegister(0x37, 'TIFR2', 0x00, 0x07, 0x07)); // OCF2B, OCF2A, TOV2
  bank.addRegister(new IORegister(0x3b, 'PCIFR', 0x00, 0x07, 0x07)); // PCIF2..0
  bank.addRegister(new IORegister(0x3c, 'EIFR', 0x00, 0x03, 0x03));  // INTF1, INTF0
  bank.addRegister(new IORegister(0x3d, 'EIMSK', 0x00, 0x03, 0x03)); // INT1, INT0
  bank.addRegister(new IORegister(0x3e, 'GPIOR0', 0x00, 0xff, 0xff));

  // EEPROM
  bank.addRegister(new IORegister(0x3f, 'EECR', 0x00, 0x3f, 0x3f));
  bank.addRegister(new IORegister(0x40, 'EEDR', 0x00, 0xff, 0xff));
  bank.addRegister(new IORegister(0x41, 'EEARL', 0x00, 0xff, 0xff));
  bank.addRegister(new IORegister(0x42, 'EEARH', 0x00, 0x03, 0x03));

  // GTCCR & Timer0
  bank.addRegister(new IORegister(0x43, 'GTCCR', 0x00, 0x83, 0x83)); // TSM, -, -, -, -, -, PSRASY, PSRSYNC
  bank.addRegister(new IORegister(0x44, 'TCCR0A', 0x00, 0xf3, 0xf3)); // COM0A1, COM0A0, COM0B1, COM0B0, -, -, WGM01, WGM00
  bank.addRegister(new IORegister(0x45, 'TCCR0B', 0x00, 0xcf, 0xcf)); // FOC0A, FOC0B, -, -, WGM02, CS02, CS01, CS00
  bank.addRegister(new IORegister(0x46, 'TCNT0', 0x00, 0xff, 0xff));
  bank.addRegister(new IORegister(0x47, 'OCR0A', 0x00, 0xff, 0xff));
  bank.addRegister(new IORegister(0x48, 'OCR0B', 0x00, 0xff, 0xff));

  // GPIOR1, GPIOR2, SPI
  bank.addRegister(new IORegister(0x4a, 'GPIOR1', 0x00, 0xff, 0xff));
  bank.addRegister(new IORegister(0x4b, 'GPIOR2', 0x00, 0xff, 0xff));
  bank.addRegister(new IORegister(0x4c, 'SPCR', 0x00, 0xff, 0xff));
  bank.addRegister(new IORegister(0x4d, 'SPSR', 0x00, 0xc1, 0x01)); // SPIF(R), WCOL(R), -, -, -, -, -, SPI2X(R/W)
  bank.addRegister(new IORegister(0x4e, 'SPDR', 0x00, 0xff, 0xff));

  // Analog Comparator & Power Management
  bank.addRegister(new IORegister(0x50, 'ACSR', 0x00, 0xff, 0xff));
  bank.addRegister(new IORegister(0x53, 'SMCR', 0x00, 0x0f, 0x0f)); // -, -, -, -, SM2, SM1, SM0, SE
  bank.addRegister(new IORegister(0x54, 'MCUSR', 0x00, 0x0f, 0x0f)); // WDRF, BORF, EXTRF, PORF
  bank.addRegister(new IORegister(0x55, 'MCUCR', 0x00, 0x73, 0x73)); // -, BODS, BODSE, PUD, -, -, IVSEL, IVCE
  bank.addRegister(new IORegister(0x57, 'SPMCSR', 0x00, 0xdf, 0xdf));

  // =========================================================================
  // Stack Pointer (SPL 0x5D, SPH 0x5E) & SREG (0x5F)
  // =========================================================================
  bank.addRegister(
    new IORegister(
      0x5d,
      'SPL',
      0xff,
      0xff,
      0xff,
      (core, val) => {
        const sph = bank.get(0x5e)?.value ?? 0x08;
        core.sp = ((sph & 0x07) << 8) | (val & 0xff);
      }
    )
  );

  bank.addRegister(
    new IORegister(
      0x5e,
      'SPH',
      0x08,
      0x07, // ATmega328P has 2KB SRAM (SP8..SP10)
      0x07,
      (core, val) => {
        const spl = bank.get(0x5d)?.value ?? 0xff;
        core.sp = ((val & 0x07) << 8) | (spl & 0xff);
      }
    )
  );

  bank.addRegister(
    new IORegister(0x5f, 'SREG', 0x00, 0xff, 0xff, (core, val) => {
      core.sreg = val;
    })
  );

  // =========================================================================
  // Extended I/O Space (0x60..0xFF)
  // =========================================================================
  bank.addRegister(new IORegister(0x60, 'WDTCSR', 0x00, 0xff, 0xff));

  // CLKPR: Clock Prescaler Register (0x61) with CLKPCE 4-cycle handshake window
  let currentPrescaler = 0;
  bank.addRegister(
    new IORegister(
      0x61,
      'CLKPR',
      0x00,
      0x8f, // CLKPCE(7), -, -, -, CLKPS3..0
      0x8f,
      (core, val) => {
        const clkpce = (val & 0x80) !== 0;
        const currentCycle = core.cycles || 0;
        const clkprReg = bank.get(0x61);

        if (clkpce) {
          // Setting CLKPCE enables 4-cycle change window
          core.clkpceExpiryCycle = currentCycle + 4;
          if (clkprReg) clkprReg.value = 0x80 | currentPrescaler;
        } else {
          // Writing CLKPS bits when CLKPCE is 0
          if (core.clkpceExpiryCycle && currentCycle <= core.clkpceExpiryCycle) {
            // Window is open: allow prescaler update
            currentPrescaler = val & 0x0f;
            if (clkprReg) clkprReg.value = currentPrescaler;
            core.clkpceExpiryCycle = 0;
          } else {
            // Window is closed: ignore prescaler change, restore currentPrescaler
            if (clkprReg) clkprReg.value = currentPrescaler;
          }
        }
      }
    )
  );

  bank.addRegister(new IORegister(0x64, 'PRR', 0x00, 0xff, 0xff));
  bank.addRegister(new IORegister(0x66, 'OSCCAL', 0x00, 0xff, 0xff));
  bank.addRegister(new IORegister(0x68, 'PCICR', 0x00, 0x07, 0x07));
  bank.addRegister(new IORegister(0x69, 'EICRA', 0x00, 0x0f, 0x0f));
  bank.addRegister(new IORegister(0x6b, 'PCMSK0', 0x00, 0xff, 0xff));
  bank.addRegister(new IORegister(0x6c, 'PCMSK1', 0x00, 0x7f, 0x7f));
  bank.addRegister(new IORegister(0x6d, 'PCMSK2', 0x00, 0xff, 0xff));

  // TIMSK0..2
  bank.addRegister(new IORegister(0x6e, 'TIMSK0', 0x00, 0x07, 0x07));
  bank.addRegister(new IORegister(0x6f, 'TIMSK1', 0x00, 0x27, 0x27));
  bank.addRegister(new IORegister(0x70, 'TIMSK2', 0x00, 0x07, 0x07));

  // ADC
  bank.addRegister(new IORegister(0x78, 'ADCL', 0x00, 0xff, 0x00)); // Read only
  bank.addRegister(new IORegister(0x79, 'ADCH', 0x00, 0xff, 0x00)); // Read only
  bank.addRegister(new IORegister(0x7a, 'ADCSRA', 0x00, 0xff, 0xff));
  bank.addRegister(new IORegister(0x7b, 'ADCSRB', 0x00, 0x47, 0x47));
  bank.addRegister(new IORegister(0x7c, 'ADMUX', 0x00, 0xef, 0xef));
  bank.addRegister(new IORegister(0x7e, 'DIDR0', 0x00, 0x3f, 0x3f));
  bank.addRegister(new IORegister(0x7f, 'DIDR1', 0x00, 0x03, 0x03));

  // =========================================================================
  // TIMER 1 (16-bit) Control & Data Registers
  // =========================================================================
  // TCCR1A: COM1A1..0, COM1B1..0, -, -, WGM11..10 (Bits 3,2 reserved = 0)
  bank.addRegister(
    new IORegister(
      0x80,
      'TCCR1A',
      0x00,
      0xf3, // readMask: bits 3,2 are 0
      0xf3, // writeMask: bits 3,2 are 0
      (core, val) => {
        core.timer1?.writeTCCR1A?.(val);
      }
    )
  );

  // TCCR1B: ICNC1, ICES1, -, WGM13..12, CS12..10 (Bit 5 reserved = 0)
  bank.addRegister(
    new IORegister(
      0x81,
      'TCCR1B',
      0x00,
      0xdf, // readMask: bit 5 is 0
      0xdf, // writeMask: bit 5 is 0
      (core, val) => {
        core.timer1?.writeTCCR1B?.(val);
      }
    )
  );

  // TCCR1C: FOC1A, FOC1B, - - - - - - (Always reads 0)
  bank.addRegister(
    new IORegister(
      0x82,
      'TCCR1C',
      0x00,
      0x00, // Read mask = 0x00
      0xc0, // Write mask = 0xC0
      (core, val) => {
        core.timer1?.writeTCCR1C?.(val);
      }
    )
  );

  // 16-Bit Registers using TEMP (0x94 / high-byte latch)
  create16BitRegisterPair(
    0x84, 'TCNT1L',
    0x85, 'TCNT1H',
    (core, val16) => {
      core.timer1?.writeTCNT?.(val16);
    },
    (core) => {
      return core.timer1?.readTCNT?.() ?? 0;
    }
  );

  create16BitRegisterPair(
    0x86, 'ICR1L',
    0x87, 'ICR1H',
    (core, val16) => {
      core.timer1?.writeICR1?.(val16);
    }
  );

  create16BitRegisterPair(
    0x88, 'OCR1AL',
    0x89, 'OCR1AH',
    (core, val16) => {
      core.timer1?.writeOCR1A?.(val16);
    }
  );

  create16BitRegisterPair(
    0x8a, 'OCR1BL',
    0x8b, 'OCR1BH',
    (core, val16) => {
      core.timer1?.writeOCR1B?.(val16);
    }
  );

  // Timer 2
  bank.addRegister(new IORegister(0xb0, 'TCCR2A', 0x00, 0xf3, 0xf3));
  bank.addRegister(new IORegister(0xb1, 'TCCR2B', 0x00, 0xcf, 0xcf));
  bank.addRegister(new IORegister(0xb2, 'TCNT2', 0x00, 0xff, 0xff));
  bank.addRegister(new IORegister(0xb3, 'OCR2A', 0x00, 0xff, 0xff));
  bank.addRegister(new IORegister(0xb4, 'OCR2B', 0x00, 0xff, 0xff));
  bank.addRegister(new IORegister(0xb6, 'ASSR', 0x00, 0x7f, 0x7f));

  // TWI (I2C)
  bank.addRegister(new IORegister(0xb8, 'TWBR', 0x00, 0xff, 0xff));
  bank.addRegister(new IORegister(0xb9, 'TWSR', 0xf8, 0xfb, 0x03)); // TWPS1..0 writable
  bank.addRegister(new IORegister(0xba, 'TWAR', 0xfe, 0xff, 0xff));
  bank.addRegister(new IORegister(0xbb, 'TWDR', 0xff, 0xff, 0xff));
  bank.addRegister(new IORegister(0xbc, 'TWCR', 0x00, 0xff, 0xff));
  bank.addRegister(new IORegister(0xbd, 'TWAMR', 0x00, 0xfe, 0xfe));

  // USART0
  bank.addRegister(new IORegister(0xc0, 'UCSR0A', 0x20, 0xff, 0x43)); // TXC, U2X0, MPCM0
  bank.addRegister(new IORegister(0xc1, 'UCSR0B', 0x00, 0xff, 0xff));
  bank.addRegister(new IORegister(0xc2, 'UCSR0C', 0x06, 0xff, 0xff));
  bank.addRegister(new IORegister(0xc4, 'UBRR0L', 0x00, 0xff, 0xff));
  bank.addRegister(new IORegister(0xc5, 'UBRR0H', 0x00, 0x0f, 0x0f));
  bank.addRegister(new IORegister(0xc6, 'UDR0', 0x00, 0xff, 0xff));

  return bank;
}
