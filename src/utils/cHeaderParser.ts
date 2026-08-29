// Utility to parse C/C++ header files and determine AVR ABI mappings
// based on argument sizes.

export interface ParsedFunction {
  name: string;
  returnType: string;
  args: ParsedArgument[];
}

export interface ParsedArgument {
  type: string;
  name: string;
  sizeBytes: number;
  assignedRegister: string; // e.g. "r24" or "r25:r24"
}

// Basic sizes for common AVR types
const typeSizes: Record<string, number> = {
  'char': 1,
  'uint8_t': 1,
  'int8_t': 1,
  'byte': 1,
  'bool': 1,
  'boolean': 1,

  'int': 2,
  'unsigned int': 2,
  'int16_t': 2,
  'uint16_t': 2,
  'short': 2,
  'unsigned short': 2,
  'word': 2,

  'long': 4,
  'unsigned long': 4,
  'int32_t': 4,
  'uint32_t': 4,

  'float': 4,
  'double': 4,
};

function getArgumentSize(typeStr: string): number {
  // Remove const/volatile modifiers before checking size
  const normalizedType = typeStr.replace(/\b(const|volatile)\b/g, '').replace(/\s+/g, ' ').trim();
  // Check if it's a pointer (always 2 bytes on AVR)
  if (normalizedType.includes('*')) {
    return 2;
  }
  return typeSizes[normalizedType] || 2; // Default to 2 bytes if unknown (int size)
}

export function parseCHeader(headerCode: string): ParsedFunction[] {
  const results: ParsedFunction[] = [];

  // Remove comments
  let cleanCode = headerCode.replace(/\/\*[\s\S]*?\*\//g, '');
  cleanCode = cleanCode.replace(/\/\/.*/g, '');

  // Match function signatures: returnType name(args...);
  // simplified regex for typical header declarations
  const funcRegex = /([a-zA-Z_][a-zA-Z0-9_\s\*]*?)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\((.*?)\)\s*;/g;

  let match;
  while ((match = funcRegex.exec(cleanCode)) !== null) {
    const rawReturnType = match[1].trim();
    const name = match[2].trim();
    const argsStr = match[3].trim();

    // Skip constructors/destructors or macros masquerading as functions
    if (rawReturnType === '' || rawReturnType.includes('#') || name === 'extern') {
      continue;
    }

    const parsedArgs: ParsedArgument[] = [];

    // AVR ABI: registers start at r24/r25 and go downwards.
    let currentReg = 24;

    if (argsStr !== '' && argsStr !== 'void') {
      const argsList = argsStr.split(',').map(s => s.trim());

      for (const arg of argsList) {
        // e.g. "uint8_t data" or "char * str"
        const parts = arg.split(/\s+/);
        let argName = parts.pop() || '';

        // Handle pointer syntax attached to name (e.g. char *str)
        if (argName.startsWith('*')) {
            parts.push('*');
            argName = argName.substring(1);
        }

        let argType = parts.join(' ');

        // Handle pointer syntax attached to type (e.g. char* str)
        if (argType.endsWith('*')) {
            // Already handled
        } else if (argType.includes('*')) {
             argType = argType.replace('*', ' *');
        }

        const size = getArgumentSize(argType);

        let assignedRegister = '';
        if (size === 1) {
            assignedRegister = `r${currentReg}`;
            currentReg -= 2; // AVR ABI skips to next even pair even for 8-bit to keep alignment
        } else if (size === 2) {
            // Must be even aligned
            if (currentReg % 2 !== 0) currentReg--;
            assignedRegister = `r${currentReg + 1}:r${currentReg}`;
            currentReg -= 2;
        } else if (size === 4) {
            // 32 bit goes into 4 registers
             if (currentReg % 2 !== 0) currentReg--;
             assignedRegister = `r${currentReg + 1}:r${currentReg}:r${currentReg-1}:r${currentReg-2}`;
             currentReg -= 4;
        } else {
             assignedRegister = `Stack/Unsupported`;
        }

        parsedArgs.push({
          type: argType,
          name: argName,
          sizeBytes: size,
          assignedRegister
        });
      }
    }

    results.push({
      name,
      returnType: rawReturnType,
      args: parsedArgs
    });
  }

  return results;
}

export function generateCWrapper(func: ParsedFunction, className?: string, instanceName?: string): string {
    let code = `extern "C" {\n`;
    code += `  ${func.returnType} asm_wrapper_${func.name}(`;

    const args = func.args.map(a => `${a.type} ${a.name}`).join(', ');
    code += `${args}) {\n`;

    let callPrefix = '';
    if (className && instanceName) {
        // e.g. lcd.printChar(...)
        callPrefix = `${instanceName}.`;
    }

    const callArgs = func.args.map(a => a.name).join(', ');
    const call = `${callPrefix}${func.name}(${callArgs});`;

    if (func.returnType !== 'void') {
        code += `    return ${call}\n`;
    } else {
        code += `    ${call}\n`;
    }

    code += `  }\n`;
    code += `}\n`;

    return code;
}

export function generateAsmCallBlock(func: ParsedFunction): string {
    let asm = `; --- Hívás: ${func.name} ---\n`;

    for (const arg of func.args) {
        if (arg.sizeBytes === 1) {
            asm += `ldi ${arg.assignedRegister}, 0x00 ; TODO: Állítsd be a ${arg.name} (${arg.type}) értékét\n`;
        } else if (arg.sizeBytes === 2) {
            const regParts = arg.assignedRegister.split(':');
            if (regParts.length === 2) {
                const high = regParts[0];
                const low = regParts[1];
                asm += `ldi ${low}, low(0x0000)  ; ${arg.name} (Low)\n`;
                asm += `ldi ${high}, high(0x0000) ; ${arg.name} (High)\n`;
            }
        }
    }

    asm += `call asm_wrapper_${func.name}\n`;

    if (func.returnType !== 'void') {
        asm += `; Visszatérési érték (r24 vagy r25:r24) elérhető.\n`;
    }

    return asm;
}
