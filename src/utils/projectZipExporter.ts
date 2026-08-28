import JSZip from 'jszip';
import { ProgramBlock } from '../types';
import { GeneratedCodeOutput } from './codeGenerator';

export interface ProjectExportOptions {
  projectName: string;
  targetMcu: 'atmega328p';
  fCpu: number; // 16000000
  baudRate: number; // 9600 or 115200
  programmer: 'arduino' | 'uspaspm' | 'stk500v1';
}

/**
 * Generates a complete Arduino IDE & PlatformIO & AVR-GCC Makefile ready ZIP archive.
 */
export async function generateProjectZip(
  blocks: ProgramBlock[],
  codeOutput: GeneratedCodeOutput,
  options: Partial<ProjectExportOptions> = {}
): Promise<Blob> {
  const zip = new JSZip();
  const projectName = (options.projectName || 'avr_visual_project').replace(/[^a-zA-Z0-9_-]/g, '_');
  const fCpu = options.fCpu || 16000000;
  const baudRate = options.baudRate || 115200;

  // 1. Root README.md
  const readmeContent = `# ${projectName} - AVR Assembly & Embedded C Project

Ez a projekt a **Visual AVR Assembly Studio** vizuális fejlesztőkörnyezetből lett exportálva.
A csomag tartalmazza a tiszta AVR Assembly, a közvetlen regiszterszintű beágyazott C, valamint az Arduino IDE és PlatformIO kompatibilis forrásfájlokat.

---

## 📁 Mappa Struktúra és Tartalom

* \`src/main.S\` - Tiszta GNU AVR Assembly forrásfájl (Direct Hardware Control)
* \`src/main.cpp\` - Közvetlen regiszter C++ implementáció (Beágyazott Inline Asm rétegekkel)
* \`arduino/${projectName}.ino\` - Arduino IDE 1.8.x és 2.x kompatibilis vázlatfájl
* \`platformio.ini\` - PlatformIO konfiguráció VS Code-hoz (ATmega328P @ 16MHz)
* \`Makefile\` - Standalone natív \`avr-gcc\` fordító és \`avrdude\` feltöltő script Linux / macOS / MSYS2 környezethez
* \`project_blocks.json\` - A vizuális blokkdiagram szerkeszthető JSON exportja (bármikor visszatölthető a stúdióba)

---

## 🚀 Fordítás és Feltöltés Lépései

### 1. Arduino IDE használatával:
1. Nyisd meg a(z) \`arduino/${projectName}.ino\` fájlt az Arduino IDE-ben.
2. Válaszd ki az **Arduino Uno** alaplapot és a megfelelő soros portot (COM / /dev/ttyACM0).
3. Kattints a **Feltöltés** (Ctrl+U) gombra.

### 2. PlatformIO (VS Code) használatával:
1. Nyisd meg ezt a gyökérmappát a VS Code-ban (a PlatformIO kiegészítővel).
2. Kattints a PlatformIO tálcán a **Build** vagy **Upload** gombra.

### 3. Natív AVR-GCC & Makefile segítségével:
\`\`\`bash
# Assembly verzió fordítása és feltöltése:
make asm
make upload_asm PORT=/dev/ttyUSB0

# C/C++ verzió fordítása és feltöltése:
make c
make upload_c PORT=/dev/ttyUSB0
\`\`\`
`;
  zip.file('README.md', readmeContent);

  // 2. Makefile
  const makefileContent = `MCU = atmega328p
F_CPU = ${fCpu}UL
BAUD = 115200
PROGRAMMER = arduino
PORT ?= /dev/ttyACM0

CC = avr-gcc
OBJCOPY = avr-objcopy
AVRDUDE = avrdude
SIZE = avr-size

CFLAGS = -Wall -Os -mmcu=$(MCU) -DF_CPU=$(F_CPU) -Iinclude
ASFLAGS = -mmcu=$(MCU) -x assembler-with-cpp -DF_CPU=$(F_CPU)

all: build/main_c.hex build/main_asm.hex

# Assembly fordítás
build/main_asm.hex: src/main.S | build
\t$(CC) $(ASFLAGS) -o build/main_asm.elf src/main.S
\t$(OBJCOPY) -O ihex -R .eeprom build/main_asm.elf build/main_asm.hex
\t@$(SIZE) --format=avr --mcu=$(MCU) build/main_asm.elf

# C fordítás
build/main_c.hex: src/main.cpp | build
\t$(CC) $(CFLAGS) -o build/main_c.elf src/main.cpp
\t$(OBJCOPY) -O ihex -R .eeprom build/main_c.elf build/main_c.hex
\t@$(SIZE) --format=avr --mcu=$(MCU) build/main_c.elf

build:
\tmkdir -p build

asm: build/main_asm.hex
c: build/main_c.hex

upload_asm: build/main_asm.hex
\t$(AVRDUDE) -c $(PROGRAMMER) -p $(MCU) -P $(PORT) -b $(BAUD) -U flash:w:build/main_asm.hex:i

upload_c: build/main_c.hex
\t$(AVRDUDE) -c $(PROGRAMMER) -p $(MCU) -P $(PORT) -b $(BAUD) -U flash:w:build/main_c.hex:i

clean:
\trm -rf build

.PHONY: all asm c upload_asm upload_c clean
`;
  zip.file('Makefile', makefileContent);

  // 3. platformio.ini
  const platformioIni = `[platformio]
default_envs = uno

[env:uno]
platform = atmelavr
board = uno
framework = arduino
monitor_speed = ${baudRate}
build_flags =
    -DF_CPU=${fCpu}UL
`;
  zip.file('platformio.ini', platformioIni);

  // 4. Source Files (src/main.S & src/main.cpp)
  const srcFolder = zip.folder('src');
  if (srcFolder) {
    srcFolder.file('main.S', codeOutput.pureAsm);
    srcFolder.file('main.cpp', codeOutput.inlineAsmC);
  }

  // 5. Arduino IDE Sketch Folder (arduino/name.ino)
  const arduinoFolder = zip.folder('arduino');
  if (arduinoFolder) {
    const sketchFolder = arduinoFolder.folder(projectName);
    if (sketchFolder) {
      sketchFolder.file(`${projectName}.ino`, codeOutput.arduinoC);
    }
  }

  // 6. Visual Studio project blocks metadata (restore capability)
  zip.file('project_blocks.json', JSON.stringify({
    name: projectName,
    timestamp: new Date().toISOString(),
    blocks: blocks,
    generatedSummary: {
      blockCount: blocks.length,
      fCpu: fCpu,
    }
  }, null, 2));

  return await zip.generateAsync({ type: 'blob' });
}

/**
 * Downloads a generated Blob as a local file.
 */
export function triggerFileDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
