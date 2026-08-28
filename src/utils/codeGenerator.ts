import { ProgramBlock, BlockScope, VariableDefinition, McuTarget, MCU_TARGETS, Esp32SimulationState } from '../types';
import { BLOCK_DEFINITIONS } from '../data/blockDefinitions';
import { CYCLE_NS } from './hardwareMap';
import { ESP32_CYCLE_NS, ESP32_CLOCK_MHZ } from './esp32HardwareMap';
import { generateVariableAsmDeclaration, generateVariableCDeclaration } from './variableValidator';
import { generateConnectivitySetupLines } from './esp32ConnectivityCodeGenerator';

export interface GeneratedCodeOutput {
  pureAsm: string;
  arduinoC: string;
  inlineAsmC: string;
  freeRtosC?: string;
  targetMcu: McuTarget;
  stats: {
    totalBlocks: number;
    setupBlocks: number;
    loopBlocks: number;
    isrBlocks: number;
    loopCycles: number;
    loopTimeNs: number;
    loopTimeFormatted: string;
    loopFrequencyFormatted: string;
    cEquivalentSpeedup: string;
    clockMhz: number;
    cycleNs: number;
  };
}

export function generateAllCodes(
  blocks: ProgramBlock[],
  variables: VariableDefinition[] = [],
  targetMcu: McuTarget = 'avr',
  esp32State?: Esp32SimulationState
): GeneratedCodeOutput {
  const isEsp32 = targetMcu === 'esp32';
  const clockMhz = isEsp32 ? 240 : 16;
  const cycleNs = isEsp32 ? ESP32_CYCLE_NS : CYCLE_NS;

  const setupBlocks = blocks.filter((b) => b.scope === 'setup' && b.enabled !== false);
  const loopBlocks = blocks.filter((b) => b.scope === 'loop' && b.enabled !== false);
  const isrBlocks = blocks.filter((b) => b.scope === 'isr' && b.enabled !== false);

  // 1. Calculate Cycles & Timing
  let totalLoopCycles = 0;
  loopBlocks.forEach((b) => {
    const def = BLOCK_DEFINITIONS[b.type];
    if (def) {
      if (isEsp32) {
        // On 32-bit Xtensa 240MHz, single cycle ALU/Store vs multiple cycle loops
        totalLoopCycles += Math.max(1, Math.round(def.calculateCycles(b.params) * 0.8));
      } else {
        totalLoopCycles += def.calculateCycles(b.params);
      }
    }
  });

  // Loop branching overhead (rjmp on AVR = 2 cycles, bnez/j on Xtensa = 1-2 cycles)
  if (loopBlocks.length > 0) {
    totalLoopCycles += isEsp32 ? 1 : 2;
  }

  const loopTimeNs = totalLoopCycles * cycleNs;
  let loopTimeFormatted = '0 ns';
  let loopFrequencyFormatted = '0 Hz';

  if (loopTimeNs < 1000) {
    loopTimeFormatted = `${loopTimeNs.toFixed(1)} ns`;
    const freq = loopTimeNs > 0 ? (1000000000 / loopTimeNs) : 0;
    loopFrequencyFormatted = freq >= 1000000 ? `${(freq / 1000000).toFixed(2)} MHz` : `${(freq / 1000).toFixed(1)} kHz`;
  } else if (loopTimeNs < 1000000) {
    const us = loopTimeNs / 1000;
    loopTimeFormatted = `${us.toFixed(2)} µs`;
    const freq = (1000000 / us);
    loopFrequencyFormatted = freq >= 1000 ? `${(freq / 1000).toFixed(2)} kHz` : `${freq.toFixed(1)} Hz`;
  } else {
    const ms = loopTimeNs / 1000000;
    loopTimeFormatted = `${ms.toFixed(2)} ms`;
    const freq = (1000 / ms);
    loopFrequencyFormatted = `${freq.toFixed(2)} Hz`;
  }

  if (isEsp32) {
    return generateEsp32Output(
      blocks,
      variables,
      setupBlocks,
      loopBlocks,
      isrBlocks,
      totalLoopCycles,
      loopTimeNs,
      loopTimeFormatted,
      loopFrequencyFormatted,
      clockMhz,
      cycleNs,
      esp32State
    );
  }

  return generateAvrOutput(
    blocks,
    variables,
    setupBlocks,
    loopBlocks,
    isrBlocks,
    totalLoopCycles,
    loopTimeNs,
    loopTimeFormatted,
    loopFrequencyFormatted,
    clockMhz,
    cycleNs
  );
}

/**
 * Generates AVR ATmega328P Assembly & C Code
 */
function generateAvrOutput(
  blocks: ProgramBlock[],
  variables: VariableDefinition[],
  setupBlocks: ProgramBlock[],
  loopBlocks: ProgramBlock[],
  isrBlocks: ProgramBlock[],
  totalLoopCycles: number,
  loopTimeNs: number,
  loopTimeFormatted: string,
  loopFrequencyFormatted: string,
  clockMhz: number,
  cycleNs: number
): GeneratedCodeOutput {
  // Generate Variable Declarations for Assembly
  const asmVariableLines: string[] = [];
  if (variables && variables.length > 0) {
    asmVariableLines.push(
      `; -------------------------------------------------------------`,
      `; DEFINIÁLT VÁLTOZÓK & MEMÓRIA ALLOKÁCIÓ (SRAM, PROGMEM, REGS)`,
      `; -------------------------------------------------------------`,
    );
    variables.forEach((v) => {
      const lines = generateVariableAsmDeclaration(v);
      lines.forEach((l) => asmVariableLines.push(`    ${l}`));
      asmVariableLines.push('');
    });
  }

  // Pure AVR Assembly (.S)
  const asmHeader = [
    `; =====================================================================`,
    `; Arduino Uno / Nano (ATmega328P @ 16.000 MHz) AVR Assembly Program`,
    `; Generálva: ArduASM Studio (Drag & Drop Moduláris Rendszer)`,
    `; 1 Óraciklus = 62.5 ns | Ciklusszám / loop iteráció: ${totalLoopCycles} ciklus (${loopTimeFormatted})`,
    `; =====================================================================`,
    ``,
    `#define __SFR_OFFSET 0`,
    `#include <avr/io.h>`,
    ``,
    `.global main`,
    `.section .text`,
    ``,
    `main:`,
    `    ; Veremmutató (Stack Pointer) inicializálása`,
    `    ldi r16, lo8(RAMEND)`,
    `    out SPL, r16`,
    `    ldi r16, hi8(RAMEND)`,
    `    out SPH, r16`,
    ``,
    ...asmVariableLines,
    `    ; -------------------------------------------------------------`,
    `    ; KEZDETI BEÁLLÍTÁSOK (Setup fázis)`,
    `    ; -------------------------------------------------------------`,
  ];

  const asmSetupLines: string[] = [];
  setupBlocks.forEach((b, idx) => {
    const def = BLOCK_DEFINITIONS[b.type];
    if (def) {
      if (b.comment) asmSetupLines.push(`    ; [${idx + 1}] ${b.comment}`);
      const lines = def.generateAsm(b.params, `setup_${idx + 1}`);
      lines.forEach((l) => asmSetupLines.push(`    ${l}`));
      asmSetupLines.push('');
    }
  });

  const asmLoopLines = [
    `    ; -------------------------------------------------------------`,
    `    ; FŐ PROGRAMCIKLUS (Végtelen Loop fázis - ${totalLoopCycles} óraciklus)`,
    `    ; -------------------------------------------------------------`,
    `main_loop:`,
  ];

  loopBlocks.forEach((b, idx) => {
    const def = BLOCK_DEFINITIONS[b.type];
    if (def) {
      if (b.comment) asmLoopLines.push(`    ; [${idx + 1}] ${b.comment}`);
      const lines = def.generateAsm(b.params, `loop_${idx + 1}`);
      lines.forEach((l) => asmLoopLines.push(`    ${l}`));
      asmLoopLines.push('');
    }
  });

  asmLoopLines.push(`    rjmp main_loop             ; Visszaugrás a ciklus elejére [2 ciklus]`);
  asmLoopLines.push('');

  const asmIsrLines: string[] = [];
  if (isrBlocks.length > 0) {
    asmIsrLines.push(
      `    ; -------------------------------------------------------------`,
      `    ; MEGSZAKÍTÁSKEZELŐK ÉS ALPROGRAMOK (ISR & Routines)`,
      `    ; -------------------------------------------------------------`,
      `.global TIMER1_COMPA_vect`,
      `TIMER1_COMPA_vect:`,
      `    push r16                  ; Munkaregiszterek mentése a verembe`,
      `    in r16, SREG`,
      `    push r16`,
      ``,
    );
    isrBlocks.forEach((b, idx) => {
      const def = BLOCK_DEFINITIONS[b.type];
      if (def) {
        const lines = def.generateAsm(b.params, `isr_${idx + 1}`);
        lines.forEach((l) => asmIsrLines.push(`    ${l}`));
      }
    });
    asmIsrLines.push(
      ``,
      `    pop r16                   ; SREG és regiszterek visszaállítása`,
      `    out SREG, r16`,
      `    pop r16`,
      `    reti                      ; Visszatérés megszakításból (Return from Interrupt) [4 ciklus]`,
      ``,
    );
  }

  const pureAsm = [...asmHeader, ...asmSetupLines, ...asmLoopLines, ...asmIsrLines].join('\n');

  // Arduino C / C++ (.ino)
  const cVariableLines: string[] = [];
  if (variables && variables.length > 0) {
    cVariableLines.push(`// -------------------------------------------------------------`);
    cVariableLines.push(`// GLOBÁLIS VÁLTOZÓK ÉS MEMÓRIA DEFINÍCIÓK`);
    cVariableLines.push(`// -------------------------------------------------------------`);
    variables.forEach((v) => {
      cVariableLines.push(generateVariableCDeclaration(v));
    });
    cVariableLines.push(``);
  }

  const cHeader = [
    `// =====================================================================`,
    `// Arduino C / C++ Ekvivalens Forráskód (ATmega328P)`,
    `// Generálva az ArduASM & ESP32 Studio-ból`,
    `// =====================================================================`,
    `#include <Arduino.h>`,
    `#include <avr/io.h>`,
    `#include <avr/interrupt.h>`,
    `#include <avr/pgmspace.h>`,
    `#include <avr/eeprom.h>`,
    `#include <util/delay.h>`,
    ``,
    ...cVariableLines,
  ];

  const cSetupLines = [`void setup() {`];
  setupBlocks.forEach((b, idx) => {
    const def = BLOCK_DEFINITIONS[b.type];
    if (def) {
      if (b.comment) cSetupLines.push(`  // [${idx + 1}] ${b.comment}`);
      const lines = def.generateC(b.params);
      lines.forEach((l) => cSetupLines.push(`  ${l}`));
      cSetupLines.push('');
    }
  });
  cSetupLines.push(`}`);
  cSetupLines.push(``);

  const cLoopLines = [`void loop() {`];
  loopBlocks.forEach((b, idx) => {
    const def = BLOCK_DEFINITIONS[b.type];
    if (def) {
      if (b.comment) cLoopLines.push(`  // [${idx + 1}] ${b.comment}`);
      const lines = def.generateC(b.params);
      lines.forEach((l) => cLoopLines.push(`  ${l}`));
      cLoopLines.push('');
    }
  });
  cLoopLines.push(`}`);
  cLoopLines.push(``);

  const cIsrLines: string[] = [];
  if (isrBlocks.length > 0) {
    cIsrLines.push(`// Hardveres Megszakításkezelő Rutin`);
    cIsrLines.push(`ISR(TIMER1_COMPA_vect) {`);
    isrBlocks.forEach((b) => {
      const def = BLOCK_DEFINITIONS[b.type];
      if (def) {
        const lines = def.generateC(b.params);
        lines.forEach((l) => cIsrLines.push(`  ${l}`));
      }
    });
    cIsrLines.push(`}`);
  }

  const arduinoC = [...cHeader, ...cSetupLines, ...cLoopLines, ...cIsrLines].join('\n');

  // C + Inline Assembly (.ino)
  const inlineHeader = [
    `// =====================================================================`,
    `// Arduino C + Inline Assembly (__asm__ __volatile__) Változat`,
    `// Közvetlenül beilleszthető az Arduino IDE-be! Maximális sebesség!`,
    `// Becsült ciklusidő a főciklusban: ${totalLoopCycles} óraciklus (${loopTimeFormatted})`,
    `// =====================================================================`,
    `#include <Arduino.h>`,
    `#include <avr/io.h>`,
    `#include <avr/interrupt.h>`,
    ``,
  ];

  const inlineSetupLines = [`void setup() {`];
  setupBlocks.forEach((b, idx) => {
    const def = BLOCK_DEFINITIONS[b.type];
    if (def) {
      if (b.comment) inlineSetupLines.push(`  // [${idx + 1}] ${b.comment}`);
      const lines = def.generateInlineAsm(b.params, `s_${idx + 1}`);
      lines.forEach((l) => inlineSetupLines.push(`  ${l}`));
      inlineSetupLines.push('');
    }
  });
  inlineSetupLines.push(`}`);
  inlineSetupLines.push(``);

  const inlineLoopLines = [`void loop() {`];
  loopBlocks.forEach((b, idx) => {
    const def = BLOCK_DEFINITIONS[b.type];
    if (def) {
      if (b.comment) inlineLoopLines.push(`  // [${idx + 1}] ${b.comment}`);
      const lines = def.generateInlineAsm(b.params, `l_${idx + 1}`);
      lines.forEach((l) => inlineLoopLines.push(`  ${l}`));
      inlineLoopLines.push('');
    }
  });
  inlineLoopLines.push(`}`);

  const inlineAsmC = [...inlineHeader, ...inlineSetupLines, ...inlineLoopLines].join('\n');

  return {
    pureAsm,
    arduinoC,
    inlineAsmC,
    targetMcu: 'avr',
    stats: {
      totalBlocks: blocks.length,
      setupBlocks: setupBlocks.length,
      loopBlocks: loopBlocks.length,
      isrBlocks: isrBlocks.length,
      loopCycles: totalLoopCycles,
      loopTimeNs,
      loopTimeFormatted,
      loopFrequencyFormatted,
      cEquivalentSpeedup: '15x - 30x gyorsabb a standard digitalWrite-nál',
      clockMhz,
      cycleNs,
    },
  };
}

/**
 * Generates ESP32-WROOM-32 (Xtensa LX6 240MHz & FreeRTOS) Code
 */
function generateEsp32Output(
  blocks: ProgramBlock[],
  variables: VariableDefinition[],
  setupBlocks: ProgramBlock[],
  loopBlocks: ProgramBlock[],
  isrBlocks: ProgramBlock[],
  totalLoopCycles: number,
  loopTimeNs: number,
  loopTimeFormatted: string,
  loopFrequencyFormatted: string,
  clockMhz: number,
  cycleNs: number,
  esp32State?: Esp32SimulationState
): GeneratedCodeOutput {
  // Convert Arduino pin string to ESP32 GPIO number
  const mapToEsp32Gpio = (pinStr: string): number => {
    if (pinStr === '13') return 2; // Default onboard LED on ESP32 is GPIO2
    if (pinStr.startsWith('A')) {
      const idx = parseInt(pinStr.replace('A', ''), 10) || 0;
      return [36, 39, 34, 35, 32, 33][idx] || 32;
    }
    const num = parseInt(pinStr, 10);
    return isNaN(num) ? 2 : (num > 39 ? 2 : num);
  };

  const connectivitySetup = generateConnectivitySetupLines(esp32State?.wifi, esp32State?.ble);

  // 1. ESP32 Xtensa Assembly (.S)
  const xtensaHeader = [
    `// =====================================================================`,
    `// ESP32 (Xtensa LX6 32-bit Dual-Core @ 240.000 MHz) Assembly Program`,
    `// Generálva: ArduASM & ESP32 Studio (Drag & Drop Moduláris Rendszer)`,
    `// 1 Óraciklus = 4.167 ns | Ciklusszám / loop iteráció: ${totalLoopCycles} ciklus (${loopTimeFormatted})`,
    `// =====================================================================`,
    ``,
    `#include <freertos/FreeRTOS.h>`,
    `#include <esp_attr.h>`,
    `#include <soc/gpio_reg.h>`,
    `#include <soc/gpio_struct.h>`,
    `#include <soc/io_mux_reg.h>`,
    ``,
    `.global app_main`,
    `.section .iram1.text, "ax"`,
    `.align 4`,
    ``,
    `app_main:`,
    `    entry a1, 32                 // 32-bites Xtensa ablakozott veremkeret allokáció`,
    `    memw                         // Memória szinkronizációs korlát (Memory barrier)`,
    ``,
    `    // -------------------------------------------------------------`,
    `    // GPIO BÁZISCÍM ÉS REGISZTEREK BETÖLTÉSE (DR_REG_GPIO_BASE)`,
    `    // -------------------------------------------------------------`,
    `    movi a2, DR_REG_GPIO_BASE    // GPIO regiszterblokk címe (0x3FF44000)`,
    ``,
  ];

  const xtensaSetup: string[] = [
    `    // -------------------------------------------------------------`,
    `    // KEZDETI BEÁLLÍTÁSOK (ESP32 Setup)`,
    `    // -------------------------------------------------------------`,
  ];

  setupBlocks.forEach((b, idx) => {
    const gpio = mapToEsp32Gpio(b.params.pin || b.params.touchPin || b.params.dacPin || '2');
    const def = BLOCK_DEFINITIONS[b.type];
    if (b.type === 'io_pin_mode' || b.type === 'pin_mode') {
      const isOut = b.params.mode === 'OUTPUT';
      xtensaSetup.push(
        `    // [Setup ${idx + 1}] GPIO${gpio} ${b.params.mode} inicializálás (GPIO_ENABLE_REG)`,
        `    movi a3, (1 << ${gpio})`,
        isOut
          ? `    s32i.n a3, a2, GPIO_ENABLE_W1TS_REG - DR_REG_GPIO_BASE  // GPIO_ENABLE_W1TS [4.16 ns]`
          : `    s32i.n a3, a2, GPIO_ENABLE_W1TC_REG - DR_REG_GPIO_BASE  // GPIO_ENABLE_W1TC [4.16 ns]`,
        ``
      );
    } else if (def) {
      xtensaSetup.push(`    // [Setup ${idx + 1}] ${def.name}`);
      def.generateAsm(b.params).forEach((line) => {
        xtensaSetup.push(`    ${line}`);
      });
      xtensaSetup.push(``);
    } else {
      xtensaSetup.push(`    // [Setup ${idx + 1}] ${b.type}`);
    }
  });

  const xtensaLoop: string[] = [
    `    // -------------------------------------------------------------`,
    `    // FŐ PROGRAMCIKLUS (Xtensa LX6 240 MHz Végtelen Ciklus)`,
    `    // -------------------------------------------------------------`,
    `main_loop:`,
  ];

  loopBlocks.forEach((b, idx) => {
    const gpio = mapToEsp32Gpio(b.params.pin || b.params.touchPin || b.params.dacPin || '2');
    const def = BLOCK_DEFINITIONS[b.type];

    if (b.type === 'io_pin_write' || b.type === 'digital_write') {
      const isHigh = b.params.state === 'HIGH' || b.params.state === 1 || b.params.value === 'HIGH';
      xtensaLoop.push(
        `    // [Loop ${idx + 1}] GPIO${gpio} -> ${isHigh ? 'HIGH (3.3V)' : 'LOW (0V)'}`,
        `    movi.n a4, (1 << ${gpio})`,
        isHigh
          ? `    s32i.n a4, a2, GPIO_OUT_W1TS_REG - DR_REG_GPIO_BASE   // Hardveres W1TS atomi bitbeállítás [1 ciklus / 4.16 ns]`
          : `    s32i.n a4, a2, GPIO_OUT_W1TC_REG - DR_REG_GPIO_BASE   // Hardveres W1TC atomi törlés [1 ciklus / 4.16 ns]`,
        ``
      );
    } else if (b.type === 'esp32_gpio_w1ts') {
      const isSet = b.params.action === 'W1TS';
      xtensaLoop.push(
        `    // [Loop ${idx + 1}] ESP32 Atomi W1T${isSet ? 'S' : 'C'} Regiszterművelet GPIO${gpio}`,
        `    movi.n a4, (1 << ${gpio})`,
        isSet
          ? `    s32i.n a4, a2, GPIO_OUT_W1TS_REG - DR_REG_GPIO_BASE   // W1TS: 3.3V [1 ciklus / 4.16 ns]`
          : `    s32i.n a4, a2, GPIO_OUT_W1TC_REG - DR_REG_GPIO_BASE   // W1TC: 0V [1 ciklus / 4.16 ns]`,
        ``
      );
    } else if (b.type === 'timing_milli_delay' || b.type === 'delay_ms') {
      const ms = b.params.milliseconds || b.params.ms || 500;
      xtensaLoop.push(
        `    // [Loop ${idx + 1}] Késleltetés: ${ms} ms (${ms * 240000} Xtensa óraciklus)`,
        `    movi a5, ${Math.round((ms * 240000) / 3)}`,
        `delay_loop_${idx + 1}:`,
        `    addi.n a5, a5, -1`,
        `    bnez a5, delay_loop_${idx + 1}    // 3 óraciklusos belső számlálóhurok`,
        ``
      );
    } else if (b.type === 'timing_micro_delay' || b.type === 'delay_us') {
      const us = b.params.microseconds || b.params.us || 10;
      xtensaLoop.push(
        `    // [Loop ${idx + 1}] Mikroszekundumos várakozás: ${us} µs (${us * 240} óraciklus)`,
        `    movi a5, ${Math.round((us * 240) / 3)}`,
        `udelay_loop_${idx + 1}:`,
        `    addi.n a5, a5, -1`,
        `    bnez a5, udelay_loop_${idx + 1}`,
        ``
      );
    } else if (b.type === 'esp32_ccount_delay') {
      const cyc = Number(b.params.cycles) || 240;
      xtensaLoop.push(
        `    // [Loop ${idx + 1}] CCOUNT Nanomásodperces Késleltetés: ${cyc} ciklus (${(cyc * 4.167).toFixed(1)} ns)`,
        `    rsr.ccount a4`,
        `    movi a5, ${cyc}`,
        `    add.n a5, a4, a5`,
        `ccount_loop_${idx + 1}:`,
        `    rsr.ccount a6`,
        `    bltu a6, a5, ccount_loop_${idx + 1}`,
        ``
      );
    } else if (def) {
      xtensaLoop.push(`    // [Loop ${idx + 1}] ${def.name}`);
      def.generateAsm(b.params).forEach((line) => {
        xtensaLoop.push(`    ${line}`);
      });
      xtensaLoop.push(``);
    } else {
      xtensaLoop.push(`    // [Loop ${idx + 1}] ${b.type}`);
    }
  });

  xtensaLoop.push(
    `    j main_loop                  // Visszaugrás a ciklus elejére (Jump back to loop)`,
    `    retw.n                       // Biztonsági visszatérés`,
    ``
  );

  const pureAsm = [...xtensaHeader, ...xtensaSetup, ...xtensaLoop].join('\n');

  // 2. ESP32 Arduino / ESP-IDF C++ (.ino / .cpp)
  const espCHeader = [
    `// =====================================================================`,
    `// ESP32-WROOM-32 (Xtensa Dual-Core 240MHz) Arduino & ESP-IDF C++ Kód`,
    `// Generálva az ArduASM & ESP32 Studio-ból (Direct Register & FreeRTOS)`,
    `// =====================================================================`,
    `#include <Arduino.h>`,
    `#include "soc/gpio_struct.h"`,
    `#include "driver/gpio.h"`,
    `#include "driver/ledc.h"`,
    `#include "esp_timer.h"`,
    ...connectivitySetup.includes,
    ``,
    ...(connectivitySetup.globals.length > 0 ? [...connectivitySetup.globals, ''] : []),
  ];

  const espCSetup = [
    `void setup() {`,
    `  Serial.begin(115200);`,
    `  Serial.println("ESP32 Rendszer Indítása @ 240 MHz (Xtensa Dual-Core)...");`,
    ``,
    ...(connectivitySetup.setupLines.length > 0 ? [...connectivitySetup.setupLines, ''] : []),
  ];

  setupBlocks.forEach((b, idx) => {
    const gpio = mapToEsp32Gpio(b.params.pin || '13');
    if (b.type === 'io_pin_mode' || b.type === 'pin_mode') {
      espCSetup.push(
        `  // [Setup ${idx + 1}] GPIO${gpio} kimenet konfigurálása`,
        `  pinMode(${gpio}, ${b.params.mode || 'OUTPUT'});`
      );
    } else {
      const def = BLOCK_DEFINITIONS[b.type];
      if (def) {
        def.generateC(b.params).forEach((l) => espCSetup.push(`  ${l}`));
      }
    }
  });

  espCSetup.push(`}`, ``);

  const espCLoop = [
    `void loop() {`,
  ];

  loopBlocks.forEach((b, idx) => {
    const gpio = mapToEsp32Gpio(b.params.pin || '13');
    if (b.type === 'io_pin_write' || b.type === 'digital_write') {
      const isHigh = b.params.state === 'HIGH' || b.params.state === 1 || b.params.value === 'HIGH';
      espCLoop.push(
        `  // [Loop ${idx + 1}] Ultragyors közvetlen ESP32 regisztervezérlés [4.16 ns]`,
        isHigh
          ? `  GPIO.out_w1ts = (1 << ${gpio}); // GPIO${gpio} HIGH`
          : `  GPIO.out_w1tc = (1 << ${gpio}); // GPIO${gpio} LOW`
      );
    } else if (b.type === 'timing_milli_delay' || b.type === 'delay_ms') {
      const ms = b.params.milliseconds || b.params.ms || 500;
      espCLoop.push(`  delay(${ms});`);
    } else if (b.type === 'timing_micro_delay' || b.type === 'delay_us') {
      const us = b.params.microseconds || b.params.us || 10;
      espCLoop.push(`  delayMicroseconds(${us});`);
    } else {
      const def = BLOCK_DEFINITIONS[b.type];
      if (def) {
        def.generateC(b.params).forEach((l) => espCLoop.push(`  ${l}`));
      }
    }
  });

  espCLoop.push(`}`, ``);

  const arduinoC = [...espCHeader, ...espCSetup, ...espCLoop].join('\n');

  // 3. ESP32 Inline Xtensa Assembly (.ino)
  const espInlineHeader = [
    `// =====================================================================`,
    `// ESP32 C++ + Inline Xtensa Assembly (__asm__ __volatile__)`,
    `// 240 MHz-es hardveres atomi GPIO W1TS/W1TC és Xtensa regiszterműveletek`,
    `// =====================================================================`,
    `#include <Arduino.h>`,
    `#include "soc/gpio_reg.h"`,
    ``,
    `void setup() {`,
    `  Serial.begin(115200);`,
  ];

  setupBlocks.forEach((b) => {
    const gpio = mapToEsp32Gpio(b.params.pin || b.params.touchPin || b.params.dacPin || '2');
    if (b.type === 'io_pin_mode' || b.type === 'pin_mode') {
      espInlineHeader.push(`  pinMode(${gpio}, ${b.params.mode || 'OUTPUT'});`);
    } else {
      const def = BLOCK_DEFINITIONS[b.type];
      if (def) {
        def.generateC(b.params).forEach((l) => espInlineHeader.push(`  ${l}`));
      }
    }
  });

  espInlineHeader.push(`}`, ``, `void loop() {`);

  loopBlocks.forEach((b, idx) => {
    const gpio = mapToEsp32Gpio(b.params.pin || b.params.touchPin || b.params.dacPin || '2');
    if (b.type === 'io_pin_write' || b.type === 'digital_write' || b.type === 'esp32_gpio_w1ts') {
      const isSet = b.type === 'esp32_gpio_w1ts' ? b.params.action === 'W1TS' : (b.params.state === 'HIGH' || b.params.state === 1);
      espInlineHeader.push(
        `  // [Block #${idx + 1}] Inline Xtensa ASM: GPIO${gpio} ${isSet ? 'W1TS HIGH (3.3V)' : 'W1TC LOW (0V)'} [4.16 ns]`,
        `  __asm__ __volatile__ (`,
        `    "movi a2, 0x3FF44000\\n"`,
        `    "movi.n a3, (1 << ${gpio})\\n"`,
        `    "s32i.n a3, a2, ${isSet ? '0x0008' : '0x000C'}\\n" // ${isSet ? 'GPIO_OUT_W1TS_REG' : 'GPIO_OUT_W1TC_REG'}`,
        `    "memw\\n"`,
        `    ::: "a2", "a3", "memory"`,
        `  );`
      );
    } else if (b.type === 'timing_milli_delay' || b.type === 'delay_ms') {
      const ms = b.params.milliseconds || b.params.ms || 500;
      espInlineHeader.push(`  delay(${ms});`);
    } else if (b.type === 'timing_micro_delay' || b.type === 'delay_us') {
      const us = b.params.microseconds || b.params.us || 10;
      espInlineHeader.push(`  delayMicroseconds(${us});`);
    } else if (b.type === 'esp32_ccount_delay') {
      const cyc = Number(b.params.cycles) || 240;
      espInlineHeader.push(
        `  // Nanomásodperces CCOUNT várakozás (${cyc} óraciklus):`,
        `  __asm__ __volatile__ (`,
        `    "rsr.ccount a2\\n\\t"`,
        `    "movi a3, ${cyc}\\n\\t"`,
        `    "add.n a3, a2, a3\\n\\t"`,
        `    "1: rsr.ccount a4\\n\\t"`,
        `    "bltu a4, a3, 1b\\n\\t"`,
        `    ::: "a2", "a3", "a4"`,
        `  );`
      );
    } else {
      const def = BLOCK_DEFINITIONS[b.type];
      if (def) {
        def.generateInlineAsm(b.params).forEach((l) => espInlineHeader.push(`  ${l}`));
      }
    }
  });

  espInlineHeader.push(`}`, ``);
  const inlineAsmC = espInlineHeader.join('\n');

  // 4. FreeRTOS Dual-Core Tasks Code
  const freeRtosLines = [
    `// =====================================================================`,
    `// ESP32 FreeRTOS Kétmagos (Dual-Core 0 & Core 1) Aszinkron Működés`,
    `// Generálva: ArduASM & ESP32 Studio`,
    `// =====================================================================`,
    `#include <Arduino.h>`,
    `#include "freertos/FreeRTOS.h"`,
    `#include "freertos/task.h"`,
    ``,
    `TaskHandle_t Core0TaskHandle = NULL;`,
    `TaskHandle_t Core1TaskHandle = NULL;`,
    ``,
    `// =====================================================================`,
    `// 0. MAG: Háttérfeladatok, Hálózati Kommunikáció & Telemetria (Core 0)`,
    `// =====================================================================`,
    `void core0WorkerTask(void* pvParameters) {`,
    `  Serial.print("[Core 0 PRO CPU] Indítva a következő magon: ");`,
    `  Serial.println(xPortGetCoreID());`,
    `  for (;;) {`,
    `    // Core 0 Háttér Adatfeldolgozás és Telemetria`,
    `    vTaskDelay(pdMS_TO_TICKS(100)); // 100 ms aszinkron várakozás`,
    `  }`,
    `}`,
    ``,
    `// =====================================================================`,
    `// 1. MAG: Nagysebességű I/O és Modul Végrehajtás (Core 1 APP CPU)`,
    `// =====================================================================`,
    `void core1WorkerTask(void* pvParameters) {`,
    `  Serial.print("[Core 1 APP CPU] Indítva a következő magon: ");`,
    `  Serial.println(xPortGetCoreID());`,
    ``,
  ];

  setupBlocks.forEach((b) => {
    const gpio = mapToEsp32Gpio(b.params.pin || b.params.touchPin || b.params.dacPin || '2');
    if (b.type === 'io_pin_mode' || b.type === 'pin_mode') {
      freeRtosLines.push(`  pinMode(${gpio}, ${b.params.mode || 'OUTPUT'});`);
    }
  });

  freeRtosLines.push(`  for (;;) {`);

  loopBlocks.forEach((b, idx) => {
    const gpio = mapToEsp32Gpio(b.params.pin || b.params.touchPin || b.params.dacPin || '2');
    if (b.type === 'io_pin_write' || b.type === 'digital_write' || b.type === 'esp32_gpio_w1ts') {
      const isSet = b.type === 'esp32_gpio_w1ts' ? b.params.action === 'W1TS' : (b.params.state === 'HIGH' || b.params.state === 1);
      freeRtosLines.push(
        `    // [Taszk #${idx + 1}] Hardveres GPIO${gpio} ${isSet ? 'W1TS HIGH (3.3V)' : 'W1TC LOW (0V)'} [4.16 ns]`,
        isSet
          ? `    GPIO.out_w1ts = (1 << ${gpio});`
          : `    GPIO.out_w1tc = (1 << ${gpio});`
      );
    } else if (b.type === 'timing_milli_delay' || b.type === 'delay_ms') {
      const ms = b.params.milliseconds || b.params.ms || 500;
      freeRtosLines.push(`    vTaskDelay(pdMS_TO_TICKS(${ms}));`);
    } else if (b.type === 'timing_micro_delay' || b.type === 'delay_us') {
      const us = b.params.microseconds || b.params.us || 10;
      freeRtosLines.push(`    delayMicroseconds(${us});`);
    } else {
      const def = BLOCK_DEFINITIONS[b.type];
      if (def) {
        def.generateC(b.params).forEach((l) => freeRtosLines.push(`    ${l}`));
      }
    }
  });

  freeRtosLines.push(
    `  }`,
    `}`,
    ``,
    `void setup() {`,
    `  Serial.begin(115200);`,
    `  Serial.println("ESP32 Kétmagos FreeRTOS Taszkok Indítása...");`,
    ``,
    `  // Taszk létrehozása és rögzítése a 0. Maghoz (PRO CPU)`,
    `  xTaskCreatePinnedToCore(`,
    `    core0WorkerTask,    // Taszk függvény`,
    `    "Core0Task",        // Név`,
    `    4096,               // Veremméret (4 KB)`,
    `    NULL,               // Paraméter`,
    `    1,                  // Prioritás`,
    `    &Core0TaskHandle,   // Handle`,
    `    0                   // Core 0 (PRO CPU)`,
    `  );`,
    ``,
    `  // Taszk létrehozása és rögzítése az 1. Maghoz (APP CPU)`,
    `  xTaskCreatePinnedToCore(`,
    `    core1WorkerTask,`,
    `    "Core1Task",`,
    `    4096,`,
    `    NULL,`,
    `    2,                  // Magasabb prioritás az I/O-nak`,
    `    &Core1TaskHandle,`,
    `    1                   // Core 1 (APP CPU)`,
    `  );`,
    `}`,
    ``,
    `void loop() {`,
    `  // A FreeRTOS taszkok a háttérben valós párhuzamossággal futnak a két magon!`,
    `  vTaskDelay(portMAX_DELAY);`,
    `}`,
    ``
  );

  const freeRtosC = freeRtosLines.join('\n');

  return {
    pureAsm,
    arduinoC,
    inlineAsmC,
    freeRtosC,
    targetMcu: 'esp32',
    stats: {
      totalBlocks: blocks.length,
      setupBlocks: setupBlocks.length,
      loopBlocks: loopBlocks.length,
      isrBlocks: isrBlocks.length,
      loopCycles: totalLoopCycles,
      loopTimeNs,
      loopTimeFormatted,
      loopFrequencyFormatted,
      cEquivalentSpeedup: '50x - 100x gyorsabb (240 MHz 32-bit Xtensa Direct Register Access)',
      clockMhz,
      cycleNs,
    },
  };
}
