import { ProgramBlock, BlockScope, ArduinoPin, AvrRegister } from '../types';

export interface DisassemblyResult {
  blocks: ProgramBlock[];
  warnings: string[];
  instructionsParsed: number;
  scopesDetected: {
    setupCount: number;
    loopCount: number;
    isrCount: number;
  };
}

// Helper: map register addresses to Arduino Pins
const DDR_PORT_PIN_MAP: Record<string, { pin: ArduinoPin; bit: number }> = {
  // PORTB (Pins 8 - 13)
  '0x04': { pin: '8', bit: 0 }, // DDRB
  '0x05': { pin: '8', bit: 0 }, // PORTB
  '0x03': { pin: '8', bit: 0 }, // PINB

  // PORTC (Pins A0 - A5)
  '0x07': { pin: 'A0', bit: 0 }, // DDRC
  '0x08': { pin: 'A0', bit: 0 }, // PORTC
  '0x06': { pin: 'A0', bit: 0 }, // PINC

  // PORTD (Pins 0 - 7)
  '0x0A': { pin: '0', bit: 0 }, // DDRD
  '0x0B': { pin: '0', bit: 0 }, // PORTD
  '0x09': { pin: '0', bit: 0 }, // PIND
};

function getPinFromPortBit(portName: string, bit: number): ArduinoPin {
  const normPort = portName.toUpperCase();
  if (normPort.includes('B')) {
    const p = 8 + bit;
    if (p <= 13) return `${p}` as ArduinoPin;
  } else if (normPort.includes('C')) {
    if (bit <= 5) return `A${bit}` as ArduinoPin;
  } else if (normPort.includes('D')) {
    if (bit <= 7) return `${bit}` as ArduinoPin;
  }
  return '13';
}

/**
 * Parses raw AVR Assembly (.S / .asm) into Visual Program Blocks.
 */
export function reverseParseAsmToBlocks(asmText: string): DisassemblyResult {
  const lines = asmText.split(/\r?\n/);
  const blocks: ProgramBlock[] = [];
  const warnings: string[] = [];
  let currentScope: BlockScope = 'setup';
  let instructionsParsed = 0;

  const scopesDetected = {
    setupCount: 0,
    loopCount: 0,
    isrCount: 0,
  };

  let idCounter = 1;
  const nextId = () => `imported_block_${Date.now()}_${idCounter++}`;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    // Remove comments
    const commentIndex = rawLine.search(/[;#]/);
    const comment = commentIndex !== -1 ? rawLine.substring(commentIndex + 1).trim() : '';
    const line = (commentIndex !== -1 ? rawLine.substring(0, commentIndex) : rawLine).trim();

    if (!line) continue;

    // Check scope label declarations
    const lowerLine = line.toLowerCase();
    if (lowerLine.startsWith('setup:') || lowerLine.startsWith('.global main') || lowerLine.startsWith('main:')) {
      currentScope = 'setup';
      continue;
    } else if (lowerLine.startsWith('loop:') || lowerLine.startsWith('.L_loop:') || lowerLine.startsWith('start_loop:')) {
      currentScope = 'loop';
      continue;
    } else if (lowerLine.includes('isr') || lowerLine.includes('_vect:') || lowerLine.includes('interrupt:')) {
      currentScope = 'isr';
      continue;
    }

    // Ignore assembler directives (except important data)
    if (line.startsWith('.') && !line.startsWith('.byte')) {
      continue;
    }

    // Split opcode and operands
    const match = line.match(/^([a-zA-Z]+)\s*(.*)$/);
    if (!match) continue;

    const opcode = match[1].toLowerCase();
    const operandsRaw = match[2].trim();
    const operands = operandsRaw ? operandsRaw.split(',').map((s) => s.trim()) : [];

    instructionsParsed++;

    try {
      // 1. NOP
      if (opcode === 'nop') {
        blocks.push({
          id: nextId(),
          type: 'timing_nop',
          scope: currentScope,
          params: {},
          comment: comment || undefined,
        });
      }
      // 2. SBI / CBI (Port Bit Set / Clear) -> io_pin_mode or io_digital_write
      else if (opcode === 'sbi' || opcode === 'cbi') {
        const port = operands[0] || '0x05';
        const bit = parseInt(operands[1] || '5', 10);
        const isSet = opcode === 'sbi';

        const portUpper = port.toUpperCase();
        if (portUpper.includes('DDR') || portUpper === '0x04' || portUpper === '0x07' || portUpper === '0x0A') {
          // DDR -> Pin Mode
          const pin = getPinFromPortBit(portUpper, isNaN(bit) ? 5 : bit);
          blocks.push({
            id: nextId(),
            type: 'io_pin_mode',
            scope: currentScope,
            params: {
              pin,
              mode: isSet ? 'OUTPUT' : 'INPUT',
            },
            comment: comment || undefined,
          });
        } else {
          // PORT -> Digital Write
          const pin = getPinFromPortBit(portUpper, isNaN(bit) ? 5 : bit);
          blocks.push({
            id: nextId(),
            type: 'io_digital_write',
            scope: currentScope,
            params: {
              pin,
              level: isSet ? 'HIGH' : 'LOW',
            },
            comment: comment || undefined,
          });
        }
      }
      // 3. LDI (Load Immediate)
      else if (opcode === 'ldi') {
        const reg = (operands[0] || 'r16').toLowerCase() as AvrRegister;
        let val = operands[1] || '0';
        // check 0x, 0b, or decimal
        let numVal = 0;
        if (val.startsWith('0x') || val.startsWith('0X')) numVal = parseInt(val, 16);
        else if (val.startsWith('0b') || val.startsWith('0B')) numVal = parseInt(val.substring(2), 2);
        else numVal = parseInt(val, 10);
        if (isNaN(numVal)) numVal = 0;

        blocks.push({
          id: nextId(),
          type: 'math_ldi',
          scope: currentScope,
          params: {
            reg,
            value: numVal,
          },
          comment: comment || undefined,
        });
      }
      // 4. MOV
      else if (opcode === 'mov') {
        blocks.push({
          id: nextId(),
          type: 'math_mov',
          scope: currentScope,
          params: {
            dest: (operands[0] || 'r16').toLowerCase(),
            src: (operands[1] || 'r17').toLowerCase(),
          },
          comment: comment || undefined,
        });
      }
      // 5. ADD / ADC / SUB / AND / OR / EOR
      else if (['add', 'adc', 'sub', 'and', 'or', 'eor'].includes(opcode)) {
        blocks.push({
          id: nextId(),
          type: 'math_alu_op',
          scope: currentScope,
          params: {
            op: opcode.toUpperCase(),
            dest: (operands[0] || 'r16').toLowerCase(),
            src: (operands[1] || 'r17').toLowerCase(),
          },
          comment: comment || undefined,
        });
      }
      // 6. INC / DEC
      else if (opcode === 'inc' || opcode === 'dec') {
        blocks.push({
          id: nextId(),
          type: 'math_inc_dec',
          scope: currentScope,
          params: {
            op: opcode.toUpperCase(),
            reg: (operands[0] || 'r16').toLowerCase(),
          },
          comment: comment || undefined,
        });
      }
      // 7. SEI / CLI (Interrupts)
      else if (opcode === 'sei') {
        blocks.push({
          id: nextId(),
          type: 'interrupt_sei',
          scope: currentScope,
          params: {},
          comment: comment || undefined,
        });
      } else if (opcode === 'cli') {
        blocks.push({
          id: nextId(),
          type: 'interrupt_cli',
          scope: currentScope,
          params: {},
          comment: comment || undefined,
        });
      }
      // 8. RJMP / JMP (Loop Flow)
      else if (opcode === 'rjmp' || opcode === 'jmp') {
        const target = operands[0] || 'loop';
        if (target.toLowerCase().includes('loop') || target === '.') {
          // end of loop or loop jump
          blocks.push({
            id: nextId(),
            type: 'flow_jump',
            scope: currentScope,
            params: {
              target: target,
            },
            comment: comment || undefined,
          });
        }
      }
      // 9. RCALL / CALL (Delay or Subroutine)
      else if (opcode === 'rcall' || opcode === 'call') {
        const target = operands[0] || '';
        if (target.toLowerCase().includes('delay') || target.toLowerCase().includes('ms')) {
          blocks.push({
            id: nextId(),
            type: 'timing_delay_ms',
            scope: currentScope,
            params: {
              ms: 100,
            },
            comment: comment || undefined,
          });
        } else {
          blocks.push({
            id: nextId(),
            type: 'flow_call',
            scope: currentScope,
            params: {
              subroutine: target,
            },
            comment: comment || undefined,
          });
        }
      }
      // 10. IN / OUT (I/O Port Access)
      else if (opcode === 'in' || opcode === 'out') {
        blocks.push({
          id: nextId(),
          type: 'io_port_direct',
          scope: currentScope,
          params: {
            direction: opcode.toUpperCase(),
            reg: operands[opcode === 'in' ? 0 : 1] || 'r16',
            port: operands[opcode === 'in' ? 1 : 0] || 'PORTB',
          },
          comment: comment || undefined,
        });
      }
      // Fallback for unmapped AVR instructions -> Raw Assembly Block
      else {
        blocks.push({
          id: nextId(),
          type: 'flow_raw_asm',
          scope: currentScope,
          params: {
            asmCode: rawLine,
          },
          comment: comment || undefined,
        });
      }

      // Update scope counter
      if (currentScope === 'setup') scopesDetected.setupCount++;
      else if (currentScope === 'loop') scopesDetected.loopCount++;
      else if (currentScope === 'isr') scopesDetected.isrCount++;
    } catch (err: any) {
      warnings.push(`Sor ${i + 1} értelmezési hiba: ${err.message || 'Ismeretlen szintaxis'}`);
    }
  }

  return {
    blocks,
    warnings,
    instructionsParsed,
    scopesDetected,
  };
}

/**
 * Disassembles AVR Machine Code (Words / Bytes) into Assembly Instructions using AVR Opcode Table.
 */
export function disassembleAvrBytes(
  bytes: Uint8Array,
  startAddress: number = 0,
  maxInstructions: number = 200
): string[] {
  const lines: string[] = [];
  let addr = startAddress;
  let count = 0;

  while (addr < bytes.length - 1 && count < maxInstructions) {
    const word = bytes[addr] | (bytes[addr + 1] << 8);
    const hexAddr = `0x${addr.toString(16).padStart(4, '0')}:`;
    const hexWord = `[${bytes[addr].toString(16).padStart(2, '0')} ${bytes[addr + 1].toString(16).padStart(2, '0')}]`;

    let asm = 'UNKNOWN';

    // 1. NOP (0x0000)
    if (word === 0x0000) {
      asm = 'nop';
    }
    // 2. SEI (0x9478) / CLI (0x94f8)
    else if (word === 0x9478) {
      asm = 'sei';
    } else if (word === 0x94f8) {
      asm = 'cli';
    }
    // 3. RET (0x9508) / RETI (0x9518)
    else if (word === 0x9508) {
      asm = 'ret';
    } else if (word === 0x9518) {
      asm = 'reti';
    }
    // 4. RJMP (0xc000 - 0xcfff)
    else if ((word & 0xf000) === 0xc000) {
      let offset = word & 0x0fff;
      if (offset & 0x0800) offset -= 0x1000;
      const target = addr + 2 + offset * 2;
      asm = `rjmp .+${offset * 2} (-> 0x${Math.max(0, target).toString(16).padStart(4, '0')})`;
    }
    // 5. RCALL (0xd000 - 0xdfff)
    else if ((word & 0xf000) === 0xd000) {
      let offset = word & 0x0fff;
      if (offset & 0x0800) offset -= 0x1000;
      const target = addr + 2 + offset * 2;
      asm = `rcall .+${offset * 2} (-> 0x${Math.max(0, target).toString(16).padStart(4, '0')})`;
    }
    // 6. LDI (0xe000 - 0xefff) : 1110 KKKK dddd KKKK (d = 16..31)
    else if ((word & 0xf000) === 0xe000) {
      const d = 16 + ((word >> 4) & 0x0f);
      const k = ((word >> 4) & 0xf0) | (word & 0x0f);
      asm = `ldi r${d}, 0x${k.toString(16).toUpperCase()} (${k})`;
    }
    // 7. SBI (0x9a00) / CBI (0x9800) : 1001 1010 AAAA Abbb
    else if ((word & 0xff00) === 0x9a00) {
      const a = (word >> 3) & 0x1f;
      const b = word & 0x07;
      asm = `sbi 0x${a.toString(16).padStart(2, '0')}, ${b}`;
    } else if ((word & 0xff00) === 0x9800) {
      const a = (word >> 3) & 0x1f;
      const b = word & 0x07;
      asm = `cbi 0x${a.toString(16).padStart(2, '0')}, ${b}`;
    }
    // 8. IN (0xb000) / OUT (0xb800)
    else if ((word & 0xf800) === 0xb800) {
      // out A, Rr : 1011 1AAr rrrr AAAA
      const a = ((word >> 5) & 0x30) | (word & 0x0f);
      const r = (word >> 4) & 0x1f;
      asm = `out 0x${a.toString(16).padStart(2, '0')}, r${r}`;
    } else if ((word & 0xf800) === 0xb000) {
      // in Rd, A : 1011 0AAd dddd AAAA
      const a = ((word >> 5) & 0x30) | (word & 0x0f);
      const d = (word >> 4) & 0x1f;
      asm = `in r${d}, 0x${a.toString(16).padStart(2, '0')}`;
    }
    // 9. MOV Rd, Rr (0x2c00 - 0x2fff) : 0010 11rd dddd rrrr
    else if ((word & 0xfc00) === 0x2c00) {
      const d = (word >> 4) & 0x1f;
      const r = ((word >> 5) & 0x10) | (word & 0x0f);
      asm = `mov r${d}, r${r}`;
    }
    // 10. ADD Rd, Rr (0x0c00) / SUB Rd, Rr (0x1800) / EOR (0x2400)
    else if ((word & 0xfc00) === 0x0c00) {
      const d = (word >> 4) & 0x1f;
      const r = ((word >> 5) & 0x10) | (word & 0x0f);
      asm = `add r${d}, r${r}`;
    } else if ((word & 0xfc00) === 0x1800) {
      const d = (word >> 4) & 0x1f;
      const r = ((word >> 5) & 0x10) | (word & 0x0f);
      asm = `sub r${d}, r${r}`;
    } else if ((word & 0xfc00) === 0x2400) {
      const d = (word >> 4) & 0x1f;
      const r = ((word >> 5) & 0x10) | (word & 0x0f);
      asm = `eor r${d}, r${r}`;
    } else {
      asm = `.word 0x${word.toString(16).padStart(4, '0')}`;
    }

    lines.push(`${hexAddr}  ${hexWord.padEnd(9, ' ')} ${asm}`);
    addr += 2;
    count++;
  }

  return lines;
}
