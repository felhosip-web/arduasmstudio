import {
  VariableDefinition,
  VariableDataType,
  VariableMemoryLocation,
  VariableScope,
  VariableValidationError,
  VariableValidationResult,
  AvrRegister,
} from '../types';

// ============================================================================
// RESERVED KEYWORDS & REGISTERS DICTIONARIES
// ============================================================================

export const C_RESERVED_KEYWORDS = new Set([
  'auto', 'break', 'case', 'char', 'const', 'continue', 'default', 'do',
  'double', 'else', 'enum', 'extern', 'float', 'for', 'goto', 'if',
  'inline', 'int', 'long', 'register', 'restrict', 'return', 'short', 'signed',
  'sizeof', 'static', 'struct', 'switch', 'typedef', 'union', 'unsigned', 'void',
  'volatile', 'while', 'bool', 'true', 'false', 'class', 'namespace', 'new',
  'delete', 'this', 'public', 'private', 'protected', 'template', 'typename',
  'using', 'virtual', 'friend', 'operator', 'asm', '__asm__', '__volatile__',
  'nullptr', 'alignas', 'alignof', 'constexpr', 'decltype', 'noexcept', 'static_assert',
]);

export const AVR_REGISTERS = new Set([
  'r0', 'r1', 'r2', 'r3', 'r4', 'r5', 'r6', 'r7',
  'r8', 'r9', 'r10', 'r11', 'r12', 'r13', 'r14', 'r15',
  'r16', 'r17', 'r18', 'r19', 'r20', 'r21', 'r22', 'r23',
  'r24', 'r25', 'r26', 'r27', 'r28', 'r29', 'r30', 'r31',
  'x', 'y', 'z', 'xl', 'xh', 'yl', 'yh', 'zl', 'zh',
  'sp', 'spl', 'sph', 'sreg', 'ramend', 'flashend', 'e2end',
]);

export const AVR_ASM_OPCODES = new Set([
  'add', 'adc', 'adiw', 'sub', 'subi', 'sbc', 'sbci', 'sbiw', 'and', 'andi',
  'or', 'ori', 'eor', 'com', 'neg', 'sbr', 'cbr', 'inc', 'dec', 'tst', 'clr', 'ser',
  'mul', 'muls', 'mulsu', 'fmul', 'fmuls', 'fmulsu', 'des', 'rjmp', 'ijmp', 'eijmp',
  'jmp', 'rcall', 'icall', 'eicall', 'call', 'ret', 'reti', 'cpse', 'cp', 'cpc', 'cpi',
  'sbrc', 'sbrs', 'sbic', 'sbis', 'brbs', 'brbc', 'breq', 'brne', 'brcs', 'brcc',
  'brsh', 'brlo', 'brmi', 'brpl', 'brge', 'brlt', 'brhs', 'brhc', 'brts', 'brtc',
  'brvs', 'brvc', 'brie', 'brid', 'mov', 'movw', 'ldi', 'lds', 'ld', 'ldd', 'st',
  'std', 'sts', 'lpm', 'elpm', 'spm', 'in', 'out', 'push', 'pop', 'xch', 'las', 'lac',
  'lat', 'lsl', 'lsr', 'rol', 'ror', 'asr', 'swap', 'bset', 'bclr', 'sbi', 'cbi',
  'bst', 'bld', 'sec', 'clc', 'sen', 'cln', 'sez', 'clz', 'sei', 'cli', 'ses', 'cls',
  'sev', 'clv', 'set', 'clt', 'seh', 'clh', 'nop', 'sleep', 'wdr', 'break',
]);

export const ARDUINO_CORE_IDENTIFIERS = new Set([
  'setup', 'loop', 'pinmode', 'digitalwrite', 'digitalread', 'analogread',
  'analogwrite', 'analogreference', 'shiftout', 'shiftin', 'pulsein',
  'millis', 'micros', 'delay', 'delaymicroseconds', 'min', 'max', 'abs',
  'constrain', 'map', 'pow', 'sqrt', 'sin', 'cos', 'tan', 'random',
  'randomseed', 'lowbyte', 'highbyte', 'bitread', 'bitset', 'bitclear',
  'bittoggle', 'bitwrite', 'bit', 'attachinterrupt', 'detachinterrupt',
  'interrupts', 'nointerrupts', 'serial', 'serial1', 'serial2', 'serial3',
  'high', 'low', 'input', 'output', 'input_pullup', 'led_builtin',
  'portb', 'portc', 'portd', 'ddrb', 'ddrc', 'ddrd', 'pinb', 'pinc', 'pind',
  'tccr0a', 'tccr0b', 'tccr1a', 'tccr1b', 'tccr2a', 'tccr2b', 'ocr0a', 'ocr0b',
  'ocr1a', 'ocr1b', 'ocr2a', 'ocr2b', 'tcnt0', 'tcnt1', 'tcnt2', 'timsk0',
  'timsk1', 'timsk2', 'tifr0', 'tifr1', 'tifr2', 'admux', 'adcsra', 'adcsrb',
  'adch', 'adcl', 'didr0', 'didr1', 'eicra', 'eimsk', 'eifr', 'pcicr',
  'pcifr', 'pcmsk0', 'pcmsk1', 'pcmsk2', 'spcr', 'spsr', 'spdr', 'ucsr0a',
  'ucsr0b', 'ucsr0c', 'ubrr0h', 'ubrr0l', 'udr0', 'eearh', 'eearl', 'eedr', 'eecr',
]);

// ============================================================================
// DATA TYPE SIZES & METADATA
// ============================================================================

export const DATA_TYPE_METADATA: Record<
  VariableDataType,
  {
    label: string;
    sizeBytes: number;
    description: string;
    defaultValue: string;
    asmDirective: string;
    rangeHu: string;
    cType: string;
  }
> = {
  'uint8_t': {
    label: 'uint8_t (Előjel nélküli 8-bit)',
    sizeBytes: 1,
    description: '1 bájtos előjel nélküli egész szám (0 .. 255)',
    defaultValue: '0',
    asmDirective: '.byte',
    rangeHu: '0 .. 255 (vagy 0x00 .. 0xFF)',
    cType: 'uint8_t',
  },
  'int8_t': {
    label: 'int8_t (Előjeles 8-bit)',
    sizeBytes: 1,
    description: '1 bájtos 2-es komplemens előjeles egész (-128 .. 127)',
    defaultValue: '0',
    asmDirective: '.byte',
    rangeHu: '-128 .. 127',
    cType: 'int8_t',
  },
  'uint16_t': {
    label: 'uint16_t (Előjel nélküli 16-bit / Word)',
    sizeBytes: 2,
    description: '2 bájtos előjel nélküli szó (0 .. 65535)',
    defaultValue: '0',
    asmDirective: '.word',
    rangeHu: '0 .. 65535 (vagy 0x0000 .. 0xFFFF)',
    cType: 'uint16_t',
  },
  'int16_t': {
    label: 'int16_t (Előjeles 16-bit / int)',
    sizeBytes: 2,
    description: '2 bájtos előjeles egész (-32768 .. 32767)',
    defaultValue: '0',
    asmDirective: '.word',
    rangeHu: '-32768 .. 32767',
    cType: 'int16_t',
  },
  'uint32_t': {
    label: 'uint32_t (Előjel nélküli 32-bit / DWord)',
    sizeBytes: 4,
    description: '4 bájtos előjel nélküli dupla szó (0 .. 4294967295)',
    defaultValue: '0',
    asmDirective: '.long',
    rangeHu: '0 .. 4 294 967 295',
    cType: 'uint32_t',
  },
  'int32_t': {
    label: 'int32_t (Előjeles 32-bit / long)',
    sizeBytes: 4,
    description: '4 bájtos előjeles egész (-2147483648 .. 2147483647)',
    defaultValue: '0',
    asmDirective: '.long',
    rangeHu: '-2 147 483 648 .. 2 147 483 647',
    cType: 'int32_t',
  },
  'bool': {
    label: 'bool (Logikai IGAZ / HAMIS)',
    sizeBytes: 1,
    description: '1 bájtos logikai érték (true / false, 1 / 0)',
    defaultValue: 'false',
    asmDirective: '.byte',
    rangeHu: 'true / false (1 / 0)',
    cType: 'bool',
  },
  'float': {
    label: 'float (32-bit Lebegőpontos)',
    sizeBytes: 4,
    description: '4 bájtos egyszeres pontosságú IEEE-754 lebegőpontos szám',
    defaultValue: '0.0',
    asmDirective: '.single',
    rangeHu: '±1.18×10⁻³⁸ .. ±3.40×10³⁸ (6-7 értékes jegy)',
    cType: 'float',
  },
  'char': {
    label: 'char (ASCII Karakter)',
    sizeBytes: 1,
    description: '1 bájtos ASCII karakter (pl. \'A\', \'\\n\')',
    defaultValue: "'A'",
    asmDirective: '.byte',
    rangeHu: "Egyetlen karakter pl. 'A' vagy ASCII kód 0..255",
    cType: 'char',
  },
  'string': {
    label: 'string (Karakterlánc / Szöveg)',
    sizeBytes: 16,
    description: 'Null-terminált karakterlánc ASCII szöveghez',
    defaultValue: '"ArduASM"',
    asmDirective: '.string',
    rangeHu: 'Szöveg idézőjelek között (pl. "Hello World")',
    cType: 'char[]',
  },
  'array': {
    label: 'array (uint8_t Tömb)',
    sizeBytes: 8,
    description: 'Fix méretű bájttömb (pl. mérési pufferek, indexelt táblák)',
    defaultValue: '[0, 0, 0, 0, 0, 0, 0, 0]',
    asmDirective: '.byte',
    rangeHu: 'Vesszővel elválasztott bájtok pl. [10, 20, 30]',
    cType: 'uint8_t[]',
  },
};

// ============================================================================
// MEMORY SIZE CALCULATION
// ============================================================================

export function calculateVariableSizeBytes(
  type: VariableDataType,
  initialValue: string,
  arraySize?: number,
  memoryLocation?: VariableMemoryLocation
): number {
  if (memoryLocation === 'register') {
    return 0; // Stored in working CPU register, 0 bytes SRAM
  }

  if (type === 'array') {
    const size = Math.max(1, Math.min(512, Number(arraySize) || 8));
    return size; // 1 byte per element for uint8_t[]
  }

  if (type === 'string') {
    const cleaned = initialValue.replace(/^["']|["']$/g, '');
    return cleaned.length + 1; // text length + null terminator '\0'
  }

  return DATA_TYPE_METADATA[type]?.sizeBytes || 1;
}

// ============================================================================
// IDENTIFIER VALIDATION
// ============================================================================

export function validateVariableName(
  name: string,
  existingVariables: VariableDefinition[] = [],
  currentId?: string
): VariableValidationError[] {
  const errors: VariableValidationError[] = [];
  const trimmed = name.trim();

  // 1. Empty check
  if (!trimmed) {
    errors.push({
      field: 'name',
      severity: 'error',
      message: 'A változó neve nem lehet üres!',
      rule: 'NON_EMPTY',
    });
    return errors;
  }

  // 2. Length check
  if (trimmed.length > 32) {
    errors.push({
      field: 'name',
      severity: 'error',
      message: 'A változó neve legfeljebb 32 karakter hosszú lehet az AVR Assembly címkék korlátai miatt!',
      rule: 'MAX_LENGTH_32',
    });
  }

  // 3. Format check: Starts with letter or underscore, followed by alphanumeric or underscores
  const identifierRegex = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
  if (!identifierRegex.test(trimmed)) {
    if (/^[0-9]/.test(trimmed)) {
      errors.push({
        field: 'name',
        severity: 'error',
        message: 'A változó neve nem kezdődhet számmal (csak betűvel vagy alávonással)!',
        rule: 'CANNOT_START_WITH_NUMBER',
      });
    } else if (/\s/.test(trimmed)) {
      errors.push({
        field: 'name',
        severity: 'error',
        message: 'A változó neve nem tartalmazhat szóközt (használj camelCase-t vagy alávonást)!',
        rule: 'NO_SPACES',
      });
    } else if (/[-!@#$%^&*()+=[\]{}|;:'",.<>?/\\`~]/.test(trimmed)) {
      errors.push({
        field: 'name',
        severity: 'error',
        message: 'A változó neve nem tartalmazhat speciális írásjeleket vagy kötőjelet!',
        rule: 'NO_SPECIAL_CHARACTERS',
      });
    } else {
      errors.push({
        field: 'name',
        severity: 'error',
        message: 'Érvénytelen azonosítónév! Csak angol betűk (a-z, A-Z), számok (0-9) és alávonás (_) használható.',
        rule: 'INVALID_IDENTIFIER_FORMAT',
      });
    }
  }

  const lower = trimmed.toLowerCase();

  // 4. C/C++ Reserved Keywords Check
  if (C_RESERVED_KEYWORDS.has(lower)) {
    errors.push({
      field: 'name',
      severity: 'error',
      message: `'${trimmed}' egy fenntartott C/C++ kulcsszó, nem használható változónévként!`,
      rule: 'C_KEYWORD_COLLISION',
    });
  }

  // 5. AVR CPU Registers Check
  if (AVR_REGISTERS.has(lower)) {
    errors.push({
      field: 'name',
      severity: 'error',
      message: `'${trimmed}' egy belső AVR CPU hardverregiszter neve (pl. r0-r31, X, Y, Z, SREG), nem használható változónévként!`,
      rule: 'AVR_REGISTER_COLLISION',
    });
  }

  // 6. AVR Assembly Opcode Check
  if (AVR_ASM_OPCODES.has(lower)) {
    errors.push({
      field: 'name',
      severity: 'error',
      message: `'${trimmed}' egy beépített AVR Assembly gépi utasítás neve (pl. LDI, STS, LDS, RJMP), a fordító hibát jelezne!`,
      rule: 'AVR_OPCODE_COLLISION',
    });
  }

  // 7. Arduino Core Identifiers Check
  if (ARDUINO_CORE_IDENTIFIERS.has(lower)) {
    errors.push({
      field: 'name',
      severity: 'warning',
      message: `'${trimmed}' egy beépített Arduino függvény vagy hardver regiszter neve (pl. ${trimmed}). Névütközést okozhat a C kód generálásakor!`,
      rule: 'ARDUINO_CORE_COLLISION',
    });
  }

  // 8. Unique Name Check in current project
  const isDuplicate = existingVariables.some(
    (v) => v.name.toLowerCase() === lower && v.id !== currentId
  );
  if (isDuplicate) {
    errors.push({
      field: 'name',
      severity: 'error',
      message: `Már létezik '${trimmed}' nevű változó a projektben! A változóneveknek egyedinek kell lenniük.`,
      rule: 'DUPLICATE_VARIABLE_NAME',
    });
  }

  return errors;
}

// ============================================================================
// INITIAL VALUE VALIDATION
// ============================================================================

export function validateVariableInitialValue(
  type: VariableDataType,
  value: string,
  arraySize?: number
): VariableValidationError[] {
  const errors: VariableValidationError[] = [];
  const trimmed = (value ?? '').trim();

  // Parse Integer (dec or hex)
  const parseNum = (str: string): number | null => {
    if (str.startsWith('0x') || str.startsWith('0X')) {
      const parsed = parseInt(str, 16);
      return isNaN(parsed) ? null : parsed;
    }
    if (/^-?[0-9]+$/.test(str)) {
      const parsed = parseInt(str, 10);
      return isNaN(parsed) ? null : parsed;
    }
    return null;
  };

  switch (type) {
    case 'uint8_t': {
      if (!trimmed) {
        errors.push({
          field: 'initialValue',
          severity: 'error',
          message: 'Adj meg egy kezdőértéket a uint8_t típushoz (0 .. 255)!',
          rule: 'VAL_REQUIRED',
        });
        break;
      }
      const num = parseNum(trimmed);
      if (num === null) {
        errors.push({
          field: 'initialValue',
          severity: 'error',
          message: `'${trimmed}' nem érvényes 8-bites egész szám (pl. 42 vagy 0x2A)!`,
          rule: 'INVALID_NUMBER_FORMAT',
        });
      } else if (num < 0 || num > 255) {
        errors.push({
          field: 'initialValue',
          severity: 'error',
          message: `A(z) ${num} érték kívül esik a uint8_t tartományán (0 .. 255)!`,
          rule: 'OUT_OF_RANGE_UINT8',
        });
      }
      break;
    }

    case 'int8_t': {
      if (!trimmed) {
        errors.push({
          field: 'initialValue',
          severity: 'error',
          message: 'Adj meg egy kezdőértéket az int8_t típushoz (-128 .. 127)!',
          rule: 'VAL_REQUIRED',
        });
        break;
      }
      const num = parseNum(trimmed);
      if (num === null) {
        errors.push({
          field: 'initialValue',
          severity: 'error',
          message: `'${trimmed}' nem érvényes előjeles 8-bites szám (pl. -10 vagy 50)!`,
          rule: 'INVALID_NUMBER_FORMAT',
        });
      } else if (num < -128 || num > 127) {
        errors.push({
          field: 'initialValue',
          severity: 'error',
          message: `A(z) ${num} érték kívül esik az int8_t tartományán (-128 .. 127)!`,
          rule: 'OUT_OF_RANGE_INT8',
        });
      }
      break;
    }

    case 'uint16_t': {
      if (!trimmed) {
        errors.push({
          field: 'initialValue',
          severity: 'error',
          message: 'Adj meg egy kezdőértéket a uint16_t típushoz (0 .. 65535)!',
          rule: 'VAL_REQUIRED',
        });
        break;
      }
      const num = parseNum(trimmed);
      if (num === null) {
        errors.push({
          field: 'initialValue',
          severity: 'error',
          message: `'${trimmed}' nem érvényes 16-bites szám (pl. 1024 vagy 0x03FF)!`,
          rule: 'INVALID_NUMBER_FORMAT',
        });
      } else if (num < 0 || num > 65535) {
        errors.push({
          field: 'initialValue',
          severity: 'error',
          message: `A(z) ${num} érték kívül esik a uint16_t tartományán (0 .. 65535)!`,
          rule: 'OUT_OF_RANGE_UINT16',
        });
      }
      break;
    }

    case 'int16_t': {
      if (!trimmed) {
        errors.push({
          field: 'initialValue',
          severity: 'error',
          message: 'Adj meg egy kezdőértéket az int16_t típushoz (-32768 .. 32767)!',
          rule: 'VAL_REQUIRED',
        });
        break;
      }
      const num = parseNum(trimmed);
      if (num === null) {
        errors.push({
          field: 'initialValue',
          severity: 'error',
          message: `'${trimmed}' nem érvényes előjeles 16-bites szám!`,
          rule: 'INVALID_NUMBER_FORMAT',
        });
      } else if (num < -32768 || num > 32767) {
        errors.push({
          field: 'initialValue',
          severity: 'error',
          message: `A(z) ${num} érték kívül esik az int16_t tartományán (-32768 .. 32767)!`,
          rule: 'OUT_OF_RANGE_INT16',
        });
      }
      break;
    }

    case 'uint32_t': {
      if (!trimmed) {
        errors.push({
          field: 'initialValue',
          severity: 'error',
          message: 'Adj meg egy kezdőértéket a uint32_t típushoz!',
          rule: 'VAL_REQUIRED',
        });
        break;
      }
      const num = Number(trimmed);
      if (isNaN(num) || num < 0 || num > 4294967295) {
        errors.push({
          field: 'initialValue',
          severity: 'error',
          message: `A(z) '${trimmed}' kívül esik a 32-bites uint32_t tartományán (0 .. 4 294 967 295)!`,
          rule: 'OUT_OF_RANGE_UINT32',
        });
      }
      break;
    }

    case 'int32_t': {
      if (!trimmed) {
        errors.push({
          field: 'initialValue',
          severity: 'error',
          message: 'Adj meg egy kezdőértéket az int32_t típushoz!',
          rule: 'VAL_REQUIRED',
        });
        break;
      }
      const num = Number(trimmed);
      if (isNaN(num) || num < -2147483648 || num > 2147483647) {
        errors.push({
          field: 'initialValue',
          severity: 'error',
          message: `A(z) '${trimmed}' kívül esik az int32_t tartományán (-2 147 483 648 .. 2 147 483 647)!`,
          rule: 'OUT_OF_RANGE_INT32',
        });
      }
      break;
    }

    case 'bool': {
      const lower = trimmed.toLowerCase();
      if (!['true', 'false', '1', '0', 'high', 'low'].includes(lower)) {
        errors.push({
          field: 'initialValue',
          severity: 'error',
          message: `'${trimmed}' nem érvényes logikai érték! Használj 'true', 'false', '1' vagy '0'-t.`,
          rule: 'INVALID_BOOL_VALUE',
        });
      }
      break;
    }

    case 'float': {
      if (!trimmed) {
        errors.push({
          field: 'initialValue',
          severity: 'error',
          message: 'Adj meg egy lebegőpontos számot (pl. 3.14 vagy 0.0)!',
          rule: 'VAL_REQUIRED',
        });
        break;
      }
      const num = parseFloat(trimmed);
      if (isNaN(num)) {
        errors.push({
          field: 'initialValue',
          severity: 'error',
          message: `'${trimmed}' nem érvényes lebegőpontos (float) formátum!`,
          rule: 'INVALID_FLOAT_FORMAT',
        });
      }
      break;
    }

    case 'char': {
      if (!trimmed) {
        errors.push({
          field: 'initialValue',
          severity: 'error',
          message: "Adj meg egy karaktert pl. 'A' vagy annak ASCII kódját!",
          rule: 'VAL_REQUIRED',
        });
        break;
      }
      const isQuoted = /^'(.|\\n|\\r|\\t|\\0)'$/.test(trimmed);
      const isSingleChar = trimmed.length === 1;
      const num = parseNum(trimmed);
      const isAsciiNum = num !== null && num >= 0 && num <= 255;

      if (!isQuoted && !isSingleChar && !isAsciiNum) {
        errors.push({
          field: 'initialValue',
          severity: 'error',
          message: `A '${trimmed}' nem érvényes egyetlen karakter vagy 0-255 közötti ASCII szám!`,
          rule: 'INVALID_CHAR_FORMAT',
        });
      }
      break;
    }

    case 'string': {
      if (trimmed.length > 256) {
        errors.push({
          field: 'initialValue',
          severity: 'warning',
          message: 'A szöveg mérete meghaladja a 256 bájtot, ami jelentős SRAM memóriát foglalhat az ATmega328P-ben!',
          rule: 'LARGE_STRING_WARNING',
        });
      }
      break;
    }

    case 'array': {
      const cleanVal = trimmed.replace(/^\[|\]$/g, '').trim();
      if (cleanVal) {
        const parts = cleanVal.split(',').map((p) => p.trim()).filter(Boolean);
        const maxLen = Number(arraySize) || 8;
        if (parts.length > maxLen) {
          errors.push({
            field: 'initialValue',
            severity: 'error',
            message: `A megadott kezdőértékek száma (${parts.length}) meghaladja a tömb méretét (${maxLen})!`,
            rule: 'ARRAY_ELEMENTS_EXCEED_SIZE',
          });
        }
        for (let i = 0; i < parts.length; i++) {
          const itemNum = parseNum(parts[i]);
          if (itemNum === null || itemNum < 0 || itemNum > 255) {
            errors.push({
              field: 'initialValue',
              severity: 'error',
              message: `A tömb ${i + 1}. eleme ('${parts[i]}') nem érvényes 0..255 közötti bájt!`,
              rule: 'INVALID_ARRAY_ELEMENT',
            });
            break;
          }
        }
      }
      break;
    }
  }

  return errors;
}

// ============================================================================
// FULL VARIABLE DEFINITION VALIDATION
// ============================================================================

export function validateVariableDefinition(
  variable: Partial<VariableDefinition>,
  existingVariables: VariableDefinition[] = []
): VariableValidationResult {
  const errors: VariableValidationError[] = [];
  const warnings: VariableValidationError[] = [];

  // 1. Validate Name
  const nameErrors = validateVariableName(variable.name || '', existingVariables, variable.id);
  nameErrors.forEach((e) => (e.severity === 'error' ? errors.push(e) : warnings.push(e)));

  // 2. Validate Type & Value
  const type = variable.type || 'uint8_t';
  const valErrors = validateVariableInitialValue(type, variable.initialValue || '', variable.arraySize);
  valErrors.forEach((e) => (e.severity === 'error' ? errors.push(e) : warnings.push(e)));

  // 3. Validate Array Size if type is array
  if (type === 'array') {
    const size = Number(variable.arraySize);
    if (!size || size < 1 || size > 512) {
      errors.push({
        field: 'arraySize',
        severity: 'error',
        message: 'A tömb méretének 1 és 512 elem között kell lennie!',
        rule: 'INVALID_ARRAY_SIZE',
      });
    }
  }

  // 4. Validate Memory Location Constraints
  const memLoc = variable.memoryLocation || 'sram';

  if (memLoc === 'progmem') {
    if (!variable.initialValue || variable.initialValue.trim() === '') {
      errors.push({
        field: 'initialValue',
        severity: 'error',
        message: 'A PROGMEM (Flash ROM) változókhoz kötelező kezdőértéket megadni, mert csak-olvashatók!',
        rule: 'PROGMEM_REQUIRES_INITIAL_VALUE',
      });
    }
    if (variable.isVolatile) {
      warnings.push({
        field: 'general',
        severity: 'warning',
        message: 'A PROGMEM flash konstansok nem lehetnek "volatile" típusúak, mivel futásidőben nem módosulnak.',
        rule: 'PROGMEM_NOT_VOLATILE',
      });
    }
  }

  if (memLoc === 'register') {
    const reg = variable.registerBinding;
    if (!reg) {
      errors.push({
        field: 'registerBinding',
        severity: 'error',
        message: 'Regiszterkötés esetén kötelező kiválasztani a célregisztert (r16 - r31)!',
        rule: 'REGISTER_REQUIRED',
      });
    } else {
      const regNum = parseInt(reg.replace('r', ''), 10);
      if (isNaN(regNum) || regNum < 16 || regNum > 31) {
        errors.push({
          field: 'registerBinding',
          severity: 'error',
          message: 'Változókhoz csak a felső munkaregiszterek (r16 .. r31) köthetők, mert ezek támogatják a közvetlen LDI betöltést!',
          rule: 'REGISTER_OUT_OF_UPPER_RANGE',
        });
      }

      // Check register collision with other variables
      const duplicateReg = existingVariables.find(
        (v) => v.id !== variable.id && v.memoryLocation === 'register' && v.registerBinding === reg
      );
      if (duplicateReg) {
        warnings.push({
          field: 'registerBinding',
          severity: 'warning',
          message: `A '${reg}' regisztert már a(z) '${duplicateReg.name}' változó is lefoglalta! Regiszter-ütközés léphet fel.`,
          rule: 'REGISTER_COLLISION_WARNING',
        });
      }
    }

    if (type === 'string' || type === 'array' || type === 'float') {
      errors.push({
        field: 'type',
        severity: 'error',
        message: `A(z) ${type} típus mérete túl nagy egyetlen 8-bites CPU regiszterben való tároláshoz!`,
        rule: 'REGISTER_TYPE_TOO_LARGE',
      });
    }
  }

  // 5. Validate Scope & Volatile
  if (variable.scope === 'isr_volatile' && !variable.isVolatile) {
    warnings.push({
      field: 'general',
      severity: 'warning',
      message: 'Megszakításban (ISR) használt változóknál javasolt a "volatile" minősítő bekapcsolása a fordító optimalizációja ellen!',
      rule: 'ISR_VARIABLE_SHOULD_BE_VOLATILE',
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

// ============================================================================
// MEMORY ADDRESS ALLOCATION (ATmega328P SRAM: 0x0100 .. 0x08FF)
// ============================================================================

export function allocateVariableAddresses(variables: VariableDefinition[]): VariableDefinition[] {
  let currentSramAddr = 0x0100; // ATmega328P SRAM Start

  return variables.map((v) => {
    const size = calculateVariableSizeBytes(v.type, v.initialValue, v.arraySize, v.memoryLocation);
    let sramAddress: number | undefined;

    if (v.memoryLocation === 'sram') {
      sramAddress = currentSramAddr;
      currentSramAddr += size;
    }

    return {
      ...v,
      sizeBytes: size,
      sramAddress,
    };
  });
}

// ============================================================================
// CODE GENERATION HELPERS (AVR ASSEMBLY & C)
// ============================================================================

export function generateVariableAsmDeclaration(v: VariableDefinition): string[] {
  const name = v.name || 'var_unnamed';
  const val = (v.initialValue ?? '0').trim();

  if (v.memoryLocation === 'register') {
    return [
      `; Változó: ${name} -> Hardveres Regiszter [${v.registerBinding || 'r16'}]`,
      `#define ${name} ${v.registerBinding || 'r16'}`,
      `ldi ${name}, ${val || '0'}      ; Kezdőérték betöltése regiszterbe [1 ciklus]`,
    ];
  }

  if (v.memoryLocation === 'progmem') {
    return [
      `; Flash Memória (PROGMEM) Konstans: ${name}`,
      `.section .progmem.data, "a", @progbits`,
      `${name}:`,
      v.type === 'string'
        ? `    .string ${val.startsWith('"') ? val : `"${val}"`}`
        : `    .byte ${val}`,
      `.section .text`,
    ];
  }

  if (v.memoryLocation === 'eeprom') {
    return [
      `; EEPROM Nem-felejtő Változó: ${name}`,
      `.section .eeprom`,
      `${name}:`,
      `    .byte ${val || '0'}`,
      `.section .text`,
    ];
  }

  // Standard SRAM
  if (v.type === 'array') {
    const cleanVals = val.replace(/^\[|\]$/g, '').trim();
    return [
      `; SRAM Tömb: ${name} [${v.arraySize || 8} Bájt]`,
      `.section .data`,
      `${name}:`,
      cleanVals ? `    .byte ${cleanVals}` : `    .space ${v.arraySize || 8}`,
      `.section .text`,
    ];
  }

  if (v.type === 'string') {
    return [
      `; SRAM Karakterlánc: ${name}`,
      `.section .data`,
      `${name}:`,
      `    .string ${val.startsWith('"') ? val : `"${val}"`}`,
      `.section .text`,
    ];
  }

  const meta = DATA_TYPE_METADATA[v.type] || DATA_TYPE_METADATA['uint8_t'];
  return [
    `; SRAM Változó: ${name} (${v.type}) @ 0x${(v.sramAddress || 0x0100).toString(16).toUpperCase()}`,
    `.section .data`,
    `${name}:`,
    `    ${meta.asmDirective} ${val || '0'}`,
    `.section .text`,
  ];
}

export function generateVariableCDeclaration(v: VariableDefinition): string {
  const name = v.name || 'var_unnamed';
  const val = (v.initialValue ?? '0').trim();
  const vol = v.isVolatile ? 'volatile ' : '';
  const cst = v.isConst ? 'const ' : '';

  if (v.memoryLocation === 'register') {
    return `register uint8_t ${name} asm("${v.registerBinding || 'r16'}") = ${val || '0'}; // CPU Regiszter`;
  }

  if (v.memoryLocation === 'progmem') {
    if (v.type === 'string') {
      const formatted = val.startsWith('"') ? val : `"${val}"`;
      return `const char ${name}[] PROGMEM = ${formatted}; // Flash ROM tárolás`;
    }
    return `const ${v.type} ${name} PROGMEM = ${val}; // Flash ROM tárolás`;
  }

  if (v.memoryLocation === 'eeprom') {
    return `EEMEM ${v.type} ${name} = ${val}; // 1024B belső EEPROM nem-felejtő`;
  }

  if (v.type === 'array') {
    const cleanVals = val.replace(/^\[|\]$/g, '').trim();
    return `${vol}${cst}uint8_t ${name}[${v.arraySize || 8}] = { ${cleanVals} };`;
  }

  if (v.type === 'string') {
    const formatted = val.startsWith('"') ? val : `"${val}"`;
    return `${vol}${cst}char ${name}[] = ${formatted};`;
  }

  if (v.type === 'bool') {
    return `${vol}${cst}bool ${name} = ${val === '1' || val.toLowerCase() === 'true' || val.toLowerCase() === 'high' ? 'true' : 'false'};`;
  }

  return `${vol}${cst}${v.type} ${name} = ${val || '0'};`;
}

// ============================================================================
// DEFAULT STARTER VARIABLES
// ============================================================================

export const DEFAULT_VARIABLES: VariableDefinition[] = [
  {
    id: 'var_led_state',
    name: 'ledState',
    type: 'bool',
    memoryLocation: 'sram',
    scope: 'global',
    initialValue: 'false',
    isVolatile: false,
    isConst: false,
    description: 'A beépített 13-as LED aktuális logikai állapota',
    sramAddress: 0x0100,
    sizeBytes: 1,
  },
  {
    id: 'var_sensor_val',
    name: 'sensorRaw',
    type: 'uint16_t',
    memoryLocation: 'sram',
    scope: 'global',
    initialValue: '512',
    isVolatile: false,
    isConst: false,
    description: '10-bites A0 analóg feszültség mérés ADC értéke (0-1023)',
    sramAddress: 0x0101,
    sizeBytes: 2,
  },
  {
    id: 'var_fast_counter',
    name: 'fastCounter',
    type: 'uint8_t',
    memoryLocation: 'register',
    registerBinding: 'r16',
    scope: 'loop',
    initialValue: '0',
    isVolatile: false,
    isConst: false,
    description: 'Főciklus szupergyors számlálója CPU r16 munkaregiszterhez kötve',
    sizeBytes: 0,
  },
  {
    id: 'var_sample_buf',
    name: 'sampleBuffer',
    type: 'array',
    arraySize: 8,
    memoryLocation: 'sram',
    scope: 'global',
    initialValue: '[10, 25, 40, 65, 80, 95, 120, 150]',
    isVolatile: false,
    isConst: false,
    description: '8-elemes mérési adatpuffer simításhoz és átlagoláshoz',
    sramAddress: 0x0103,
    sizeBytes: 8,
  },
  {
    id: 'var_welcome_str',
    name: 'welcomeMsg',
    type: 'string',
    memoryLocation: 'progmem',
    scope: 'global',
    initialValue: '"ArduASM v2.4 Ready"',
    isVolatile: false,
    isConst: true,
    description: 'Konzol üdvözlő üzenet Flash memóriában (0 bájt RAM)',
    sizeBytes: 20,
  },
];
