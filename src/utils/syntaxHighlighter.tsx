import React, { useMemo } from 'react';

export type LanguageType = 'asm' | 'c' | 'inlineAsm';

interface Token {
  type:
    | 'comment'
    | 'directive'
    | 'instruction'
    | 'keyword'
    | 'type'
    | 'register'
    | 'port'
    | 'label'
    | 'function'
    | 'number'
    | 'string'
    | 'inlineConstraint'
    | 'operator'
    | 'punctuation'
    | 'text';
  text: string;
}

// AVR Instructions set (Atmel/Microchip AVR ATmega328P)
const AVR_INSTRUCTIONS = new Set([
  'adc', 'add', 'adiw', 'and', 'andi', 'asr', 'bclr', 'bld', 'brbc', 'brbs',
  'brcc', 'brcs', 'break', 'breq', 'brge', 'brhc', 'brhs', 'brid', 'brie',
  'brlo', 'brmc', 'brmi', 'brne', 'brpl', 'brsh', 'brtc', 'brts', 'brvc',
  'brvs', 'bset', 'bst', 'call', 'cbi', 'cbr', 'clc', 'clh', 'cli', 'cln',
  'clr', 'cls', 'clt', 'clv', 'clz', 'com', 'cp', 'cpc', 'cpi', 'cpse',
  'dec', 'des', 'eicall', 'eijmp', 'elpm', 'eor', 'fmul', 'fmuls', 'fmulsu',
  'icall', 'ijmp', 'in', 'inc', 'jmp', 'lac', 'las', 'lat', 'ld', 'ldd',
  'ldi', 'lds', 'lpm', 'lsl', 'lsr', 'mov', 'movw', 'mul', 'muls', 'mulsu',
  'neg', 'nop', 'or', 'ori', 'out', 'pop', 'push', 'rcall', 'ret', 'reti',
  'rjmp', 'rol', 'ror', 'sbc', 'sbci', 'sbi', 'sbic', 'sbis', 'sbiw', 'sbr',
  'sbrc', 'sbrs', 'sec', 'seh', 'sei', 'sen', 'ser', 'ses', 'set', 'sev',
  'sez', 'sleep', 'spm', 'st', 'std', 'sts', 'sub', 'subi', 'swap', 'tst',
  'wdr', 'xch'
]);

// AVR Hardware Registers and I/O Port names
const AVR_REGISTERS = new Set([
  // GPRs
  'r0', 'r1', 'r2', 'r3', 'r4', 'r5', 'r6', 'r7', 'r8', 'r9',
  'r10', 'r11', 'r12', 'r13', 'r14', 'r15', 'r16', 'r17', 'r18', 'r19',
  'r20', 'r21', 'r22', 'r23', 'r24', 'r25', 'r26', 'r27', 'r28', 'r29',
  'r30', 'r31',
  'x', 'y', 'z', 'xl', 'xh', 'yl', 'yh', 'zl', 'zh',
  // Special CPU & Stack registers
  'spl', 'sph', 'sreg', 'ramend', 'sp',
  // IO Port Registers
  'portb', 'portc', 'portd', 'ddrb', 'ddrc', 'ddrd', 'pinb', 'pinc', 'pind',
  // Timers
  'tccr0a', 'tccr0b', 'tcnt0', 'ocr0a', 'ocr0b', 'tccr1a', 'tccr1b', 'tccr1c',
  'tcnt1h', 'tcnt1l', 'ocr1ah', 'ocr1al', 'ocr1bh', 'ocr1bl', 'icr1h', 'icr1l',
  'tccr2a', 'tccr2b', 'tcnt2', 'ocr2a', 'ocr2b', 'tifr0', 'tifr1', 'tifr2',
  'timsk0', 'timsk1', 'timsk2',
  // ADC
  'admux', 'adcsra', 'adcsrb', 'adch', 'adcl', 'didr0', 'didr1',
  // UART
  'udr0', 'ucsr0a', 'ucsr0b', 'ucsr0c', 'ubrr0h', 'ubrr0l',
  // SPI & I2C
  'spcr', 'spsr', 'spdr', 'twbr', 'twsr', 'twar', 'twdr', 'twcr', 'twamr',
  // EEPROM
  'eecr', 'eedr', 'eear', 'eearh', 'eearl',
  // Macros
  'lo8', 'hi8', '_sfr_io_addr', '_bv', 'bit'
]);

// C / C++ Keywords & Core Types
const C_KEYWORDS = new Set([
  'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'default',
  'break', 'continue', 'return', 'goto', 'sizeof', 'typeof',
  'struct', 'union', 'enum', 'typedef', 'static', 'const', 'volatile',
  'extern', 'inline', '__inline__', '__volatile__', 'asm', '__asm__',
  'PROGMEM', 'ISR', 'SIGNAL', 'true', 'false', 'NULL', 'nullptr'
]);

const C_TYPES = new Set([
  'void', 'bool', 'boolean', 'char', 'int', 'short', 'long', 'float', 'double',
  'int8_t', 'uint8_t', 'int16_t', 'uint16_t', 'int32_t', 'uint32_t',
  'int64_t', 'uint64_t', 'size_t', 'byte', 'word'
]);

const ARDUINO_FUNCTIONS = new Set([
  'setup', 'loop', 'main', 'pinMode', 'digitalWrite', 'digitalRead',
  'analogRead', 'analogWrite', 'analogReference', 'delay', 'delayMicroseconds',
  'millis', 'micros', 'pulseIn', 'shiftIn', 'shiftOut', 'tone', 'noTone',
  'attachInterrupt', 'detachInterrupt', 'interrupts', 'noInterrupts',
  'Serial', 'begin', 'print', 'println', 'write', 'read', 'available', 'flush',
  'Wire', 'SPI', 'EEPROM', 'pgm_read_byte', 'pgm_read_word', 'pgm_read_dword',
  'eeprom_read_byte', 'eeprom_write_byte', 'eeprom_update_byte',
  'sei', 'cli', '_delay_ms', '_delay_us'
]);

/**
 * Tokenize a single line of AVR Assembly code
 */
function tokenizeAsmLine(line: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  const len = line.length;

  while (i < len) {
    const char = line[i];

    // 1. Whitespace
    if (/\s/.test(char)) {
      let space = '';
      while (i < len && /\s/.test(line[i])) {
        space += line[i];
        i++;
      }
      tokens.push({ type: 'text', text: space });
      continue;
    }

    // 2. Comments (semicolon or //)
    if (char === ';' || (char === '/' && line[i + 1] === '/')) {
      tokens.push({ type: 'comment', text: line.slice(i) });
      break;
    }

    // 3. Preprocessor directives or Assembler directives (.section, #include, .global, #define)
    if (char === '#' || char === '.') {
      let dir = char;
      i++;
      while (i < len && /[a-zA-Z0-9_]/.test(line[i])) {
        dir += line[i];
        i++;
      }
      tokens.push({ type: 'directive', text: dir });
      continue;
    }

    // 4. Strings & Character literals
    if (char === '"' || char === "'") {
      const quote = char;
      let str = quote;
      i++;
      while (i < len && line[i] !== quote) {
        if (line[i] === '\\' && i + 1 < len) {
          str += line[i] + line[i + 1];
          i += 2;
        } else {
          str += line[i];
          i++;
        }
      }
      if (i < len) {
        str += line[i];
        i++;
      }
      tokens.push({ type: 'string', text: str });
      continue;
    }

    // 5. Hex, Binary, and Decimal Numbers
    if (
      (char === '0' && (line[i + 1] === 'x' || line[i + 1] === 'X')) ||
      (char === '0' && (line[i + 1] === 'b' || line[i + 1] === 'B')) ||
      (char === '$') ||
      (/[0-9]/.test(char) && (i === 0 || !/[a-zA-Z0-9_]/.test(line[i - 1])))
    ) {
      let num = '';
      if (char === '$') {
        num = '$';
        i++;
        while (i < len && /[0-9a-fA-F]/.test(line[i])) {
          num += line[i];
          i++;
        }
      } else if (char === '0' && (line[i + 1] === 'x' || line[i + 1] === 'X')) {
        num = line.slice(i, i + 2);
        i += 2;
        while (i < len && /[0-9a-fA-F]/.test(line[i])) {
          num += line[i];
          i++;
        }
      } else if (char === '0' && (line[i + 1] === 'b' || line[i + 1] === 'B')) {
        num = line.slice(i, i + 2);
        i += 2;
        while (i < len && /[01_]/.test(line[i])) {
          num += line[i];
          i++;
        }
      } else {
        while (i < len && /[0-9]/.test(line[i])) {
          num += line[i];
          i++;
        }
      }
      // Optional suffix like UL, L, etc.
      while (i < len && /[uUlL]/.test(line[i])) {
        num += line[i];
        i++;
      }
      tokens.push({ type: 'number', text: num });
      continue;
    }

    // 6. Word / Identifier (Instructions, Registers, Ports, Labels)
    if (/[a-zA-Z_]/.test(char)) {
      let word = '';
      while (i < len && /[a-zA-Z0-9_]/.test(line[i])) {
        word += line[i];
        i++;
      }

      // Check if it's a label definition (e.g. `main:` or `delay_loop:`)
      if (i < len && line[i] === ':') {
        word += ':';
        i++;
        tokens.push({ type: 'label', text: word });
        continue;
      }

      const lower = word.toLowerCase();
      if (AVR_INSTRUCTIONS.has(lower)) {
        tokens.push({ type: 'instruction', text: word });
      } else if (AVR_REGISTERS.has(lower)) {
        tokens.push({ type: 'register', text: word });
      } else if (ARDUINO_FUNCTIONS.has(word)) {
        tokens.push({ type: 'function', text: word });
      } else {
        tokens.push({ type: 'text', text: word });
      }
      continue;
    }

    // 7. Operators and punctuation
    if (/[=+\-*/&|^~<>,():]/.test(char)) {
      tokens.push({ type: 'operator', text: char });
      i++;
      continue;
    }

    // 8. Default fallback
    tokens.push({ type: 'text', text: char });
    i++;
  }

  return tokens;
}

/**
 * Tokenize a single line of C/C++ or C with Inline Assembly code
 */
function tokenizeCLine(line: string, isInlineAsm = false): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  const len = line.length;

  while (i < len) {
    const char = line[i];

    // 1. Whitespace
    if (/\s/.test(char)) {
      let space = '';
      while (i < len && /\s/.test(line[i])) {
        space += line[i];
        i++;
      }
      tokens.push({ type: 'text', text: space });
      continue;
    }

    // 2. Line Comments //
    if (char === '/' && line[i + 1] === '/') {
      tokens.push({ type: 'comment', text: line.slice(i) });
      break;
    }

    // 3. Preprocessor directives (#include, #define, #pragma)
    if (char === '#' && (i === 0 || tokens.every((t) => t.type === 'text'))) {
      let dir = '#';
      i++;
      while (i < len && /[a-zA-Z0-9_]/.test(line[i])) {
        dir += line[i];
        i++;
      }
      tokens.push({ type: 'directive', text: dir });
      continue;
    }

    // 4. String & Character literals
    if (char === '"' || char === "'") {
      const quote = char;
      let str = quote;
      i++;
      while (i < len && line[i] !== quote) {
        if (line[i] === '\\' && i + 1 < len) {
          str += line[i] + line[i + 1];
          i += 2;
        } else {
          str += line[i];
          i++;
        }
      }
      if (i < len) {
        str += line[i];
        i++;
      }

      // Check if inside inline ASM string constraints like "r", "=r", "I", "memory", "\n\t"
      if (isInlineAsm && (str === '"r"' || str === '"=r"' || str === '"I"' || str === '"M"' || str === '"memory"' || str === '"cc"')) {
        tokens.push({ type: 'inlineConstraint', text: str });
      } else {
        tokens.push({ type: 'string', text: str });
      }
      continue;
    }

    // 5. Hex, Binary, Decimal Numbers
    if (
      (char === '0' && (line[i + 1] === 'x' || line[i + 1] === 'X')) ||
      (char === '0' && (line[i + 1] === 'b' || line[i + 1] === 'B')) ||
      (/[0-9]/.test(char) && (i === 0 || !/[a-zA-Z0-9_]/.test(line[i - 1])))
    ) {
      let num = '';
      if (char === '0' && (line[i + 1] === 'x' || line[i + 1] === 'X')) {
        num = line.slice(i, i + 2);
        i += 2;
        while (i < len && /[0-9a-fA-F]/.test(line[i])) {
          num += line[i];
          i++;
        }
      } else if (char === '0' && (line[i + 1] === 'b' || line[i + 1] === 'B')) {
        num = line.slice(i, i + 2);
        i += 2;
        while (i < len && /[01_]/.test(line[i])) {
          num += line[i];
          i++;
        }
      } else {
        while (i < len && /[0-9]/.test(line[i])) {
          num += line[i];
          i++;
        }
      }
      // Suffixes: U, L, UL, f
      while (i < len && /[uUlLfF]/.test(line[i])) {
        num += line[i];
        i++;
      }
      tokens.push({ type: 'number', text: num });
      continue;
    }

    // 6. Word / Identifier
    if (/[a-zA-Z_]/.test(char)) {
      let word = '';
      while (i < len && /[a-zA-Z0-9_]/.test(line[i])) {
        word += line[i];
        i++;
      }

      const lower = word.toLowerCase();
      if (C_KEYWORDS.has(word)) {
        tokens.push({ type: 'keyword', text: word });
      } else if (C_TYPES.has(word)) {
        tokens.push({ type: 'type', text: word });
      } else if (AVR_REGISTERS.has(lower)) {
        tokens.push({ type: 'register', text: word });
      } else if (AVR_INSTRUCTIONS.has(lower)) {
        tokens.push({ type: 'instruction', text: word });
      } else if (ARDUINO_FUNCTIONS.has(word)) {
        tokens.push({ type: 'function', text: word });
      } else {
        tokens.push({ type: 'text', text: word });
      }
      continue;
    }

    // 7. Inline ASM operand placeholder %0, %1 etc.
    if (char === '%' && i + 1 < len && /[0-9]/.test(line[i + 1])) {
      tokens.push({ type: 'inlineConstraint', text: `%${line[i + 1]}` });
      i += 2;
      continue;
    }

    // 8. Operators and punctuation
    if (/[=+\-*/%&|^~!<>,.:;{}()\[\]]/.test(char)) {
      tokens.push({ type: 'operator', text: char });
      i++;
      continue;
    }

    // 9. Default
    tokens.push({ type: 'text', text: char });
    i++;
  }

  return tokens;
}

export function highlightCode(code: string, language: LanguageType): Token[][] {
  const lines = code.split('\n');
  return lines.map((line) => {
    if (language === 'asm') {
      return tokenizeAsmLine(line);
    }
    return tokenizeCLine(line, language === 'inlineAsm');
  });
}

interface HighlightedCodeProps {
  code: string;
  language: LanguageType;
  showLineNumbers?: boolean;
  searchQuery?: string;
  fontSize?: number;
  wrapLines?: boolean;
}

export const HighlightedCode: React.FC<HighlightedCodeProps> = ({
  code,
  language,
  showLineNumbers = true,
  searchQuery = '',
  fontSize = 12,
  wrapLines = false,
}) => {
  const tokenizedLines = useMemo(() => highlightCode(code, language), [code, language]);

  const getTokenStyle = (type: Token['type']): string => {
    switch (type) {
      case 'comment':
        return 'text-[#7E8694] italic font-light';
      case 'directive':
        return 'text-[#FB7185] font-semibold'; // Soft Rose / Crimson
      case 'instruction':
        return 'text-[#38BDF8] font-bold'; // Vibrant Sky Blue
      case 'keyword':
        return 'text-[#A78BFA] font-bold'; // Purple / Violet
      case 'type':
        return 'text-[#38BDF8] font-medium'; // Teal / Cyan
      case 'register':
      case 'port':
        return 'text-[#FBBF24] font-medium'; // Amber / Gold
      case 'label':
        return 'text-[#E879F9] font-bold'; // Pink / Magenta
      case 'function':
        return 'text-[#4ADE80] font-semibold'; // Emerald / Light Green
      case 'number':
        return 'text-[#FB923C] font-mono'; // Coral / Orange
      case 'string':
        return 'text-[#FDE047]'; // Yellow / Cream
      case 'inlineConstraint':
        return 'text-[#2DD4BF] font-mono font-bold'; // Mint / Teal
      case 'operator':
      case 'punctuation':
        return 'text-[#94A3B8]'; // Cool Slate
      case 'text':
      default:
        return 'text-[#E0E0E6]';
    }
  };

  const renderToken = (token: Token, tokenIdx: number) => {
    const className = getTokenStyle(token.type);

    // If there's an active search query, highlight matching substrings
    if (searchQuery && searchQuery.trim().length > 0) {
      const q = searchQuery.toLowerCase();
      const lowerText = token.text.toLowerCase();
      if (lowerText.includes(q)) {
        const parts: React.ReactNode[] = [];
        let startIdx = 0;
        let matchIdx = lowerText.indexOf(q, startIdx);

        while (matchIdx !== -1) {
          if (matchIdx > startIdx) {
            parts.push(token.text.substring(startIdx, matchIdx));
          }
          parts.push(
            <mark
              key={`m-${matchIdx}`}
              className="bg-amber-400 text-black px-0.5 rounded-xs font-bold shadow-xs"
            >
              {token.text.substring(matchIdx, matchIdx + q.length)}
            </mark>
          );
          startIdx = matchIdx + q.length;
          matchIdx = lowerText.indexOf(q, startIdx);
        }

        if (startIdx < token.text.length) {
          parts.push(token.text.substring(startIdx));
        }

        return (
          <span key={tokenIdx} className={className}>
            {parts}
          </span>
        );
      }
    }

    return (
      <span key={tokenIdx} className={className}>
        {token.text}
      </span>
    );
  };

  return (
    <div
      className={`font-mono leading-relaxed select-text ${
        wrapLines ? 'whitespace-pre-wrap' : 'whitespace-pre'
      }`}
      style={{ fontSize: `${fontSize}px` }}
    >
      {tokenizedLines.map((lineTokens, lineIdx) => {
        const lineNum = lineIdx + 1;
        return (
          <div
            key={lineIdx}
            className="flex hover:bg-[#1A1D24]/60 transition-colors group px-2 py-0.5 rounded-xs"
          >
            {showLineNumbers && (
              <span
                className="inline-block w-10 shrink-0 text-right pr-4 text-[#4B5263] select-none group-hover:text-[#8A8D98] text-[11px] font-mono transition-colors"
                aria-hidden="true"
              >
                {lineNum}
              </span>
            )}
            <div className="flex-1 overflow-x-visible">
              {lineTokens.length === 0 || (lineTokens.length === 1 && lineTokens[0].text === '') ? (
                <span>&nbsp;</span>
              ) : (
                lineTokens.map(renderToken)
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
