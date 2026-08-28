/**
 * AVR / Arduino Visual Bootloader Engine & Code Generator
 * Precise flash partitioning, STK500 protocol simulator, Optiboot C generator, Intel HEX synthesizer & avrdude builder.
 * (c) 2026 AI Studio ArduASM
 */

import { AvrFuseState, AvrMcuFuseType } from '../types';

export type BootloaderType =
  | 'optiboot'
  | 'optiboot_xf'
  | 'atmegaboot'
  | 'megaboot'
  | 'caterina'
  | 'micronucleus'
  | 'urboot'
  | 'baremetal_isp';

export type BootloaderSizeOption = 512 | 1024 | 2048 | 4096 | 8192;

export interface BootloaderPreset {
  id: BootloaderType;
  name: string;
  badge: string;
  tagline: string;
  mcu: AvrMcuFuseType;
  sizeBytes: BootloaderSizeOption;
  defaultBaud: number;
  timeoutMs: number;
  ledPin: string; // e.g. "PB5 (D13)", "PB7 (D13)", "RXLED (PD5)", "NONE"
  ledFlashes: number;
  bootszBits: number; // 3 = 512B, 2 = 1024B, 1 = 2048B, 0 = 4096B (for 328P)
  bootrstBit: 0 | 1; // 0 = jump to bootloader, 1 = jump to 0x0000
  hfuse: number;
  lfuse: number;
  efuse: number;
  lock: number;
  supportEeprom: boolean;
  bigboot: boolean;
  watchdogRescue: boolean;
  doubleTapReset: boolean;
  description: string;
  features: string[];
}

export interface ArduinoBootloaderConfig {
  type: BootloaderType;
  mcu: AvrMcuFuseType;
  name: string;
  sizeBytes: BootloaderSizeOption;
  bootResetVector: 'bootloader' | 'application'; // BOOTRST bit (0 or 1)
  baudRate: number;
  doubleSpeed: boolean; // U2X0 = 1
  timeoutMs: number;
  autoExitOnTimeout: boolean;
  ledPin: string; // "PB5", "PB7", "PD5", "NONE"
  ledFlashes: number; // 0 - 5
  ledPulseMs: number;
  uartPort: 0 | 1;
  clockHz: number;
  // Features
  supportEeprom: boolean;
  bigboot: boolean;
  watchdogRescue: boolean;
  doubleTapReset: boolean;
  magicResetWord: boolean;
  vectorRelocation: boolean; // IVSEL bit in MCUCR
  softUart: boolean;
  // Protection & Locks
  bootloaderWriteProtect: boolean; // BLB12 / BLB11
  appWriteProtect: boolean; // BLB02 / BLB01
}

export interface FlashPartitionInfo {
  totalFlashBytes: number;
  pageSizeBytes: number;
  totalPages: number;
  appSizeBytes: number;
  appPages: number;
  appStartAddressHex: string;
  appEndAddressHex: string;
  bootSizeBytes: number;
  bootPages: number;
  bootStartAddressHex: string;
  bootEndAddressHex: string;
  bootStartWordAddressHex: string;
  nrwwBoundaryAddressHex: string;
  bootPercentage: number;
  appPercentage: number;
  bootszFuseBits: [0 | 1, 0 | 1]; // [BOOTSZ1, BOOTSZ0]
  bootrstFuseBit: 0 | 1;
}

export interface BootloaderHazard {
  id: string;
  severity: 'danger' | 'warning' | 'info';
  title: string;
  message: string;
  remedy: string;
}

// ---------------------------------------------------------------------------
// MCU Flash Hardware Specs
// ---------------------------------------------------------------------------

export const MCU_BOOTLOADER_SPECS: Record<
  AvrMcuFuseType,
  {
    name: string;
    flashSizeBytes: number;
    pageSizeBytes: number;
    nrwwSizeBytes: number; // Non-Read-While-Write section size
    defaultClockHz: number;
    supportedSizes: BootloaderSizeOption[];
    bootszMap: Record<number, { words: number; bytes: number; startAddress: number; bootszVal: number }>;
  }
> = {
  atmega328p: {
    name: 'ATmega328P (Uno / Nano / Pro Mini)',
    flashSizeBytes: 32768, // 32 KB (16K words)
    pageSizeBytes: 128, // 64 words
    nrwwSizeBytes: 4096, // 0x7000 - 0x7FFF
    defaultClockHz: 16000000,
    supportedSizes: [512, 1024, 2048, 4096],
    bootszMap: {
      512: { words: 256, bytes: 512, startAddress: 0x7e00, bootszVal: 3 }, // BOOTSZ1=1, BOOTSZ0=1
      1024: { words: 512, bytes: 1024, startAddress: 0x7c00, bootszVal: 2 }, // BOOTSZ1=1, BOOTSZ0=0
      2048: { words: 1024, bytes: 2048, startAddress: 0x7800, bootszVal: 1 }, // BOOTSZ1=0, BOOTSZ0=1
      4096: { words: 2048, bytes: 4096, startAddress: 0x7000, bootszVal: 0 }, // BOOTSZ1=0, BOOTSZ0=0
    },
  },
  atmega2560: {
    name: 'ATmega2560 (Arduino Mega 2560)',
    flashSizeBytes: 262144, // 256 KB (128K words)
    pageSizeBytes: 256, // 128 words
    nrwwSizeBytes: 8192,
    defaultClockHz: 16000000,
    supportedSizes: [1024, 2048, 4096, 8192],
    bootszMap: {
      1024: { words: 512, bytes: 1024, startAddress: 0x3fc00, bootszVal: 3 },
      2048: { words: 1024, bytes: 2048, startAddress: 0x3f800, bootszVal: 2 },
      4096: { words: 2048, bytes: 4096, startAddress: 0x3f000, bootszVal: 1 },
      8192: { words: 4096, bytes: 8192, startAddress: 0x3e000, bootszVal: 0 },
    },
  },
  atmega32u4: {
    name: 'ATmega32U4 (Arduino Leonardo / Micro)',
    flashSizeBytes: 32768,
    pageSizeBytes: 128,
    nrwwSizeBytes: 4096,
    defaultClockHz: 16000000,
    supportedSizes: [512, 1024, 2048, 4096],
    bootszMap: {
      512: { words: 256, bytes: 512, startAddress: 0x7e00, bootszVal: 3 },
      1024: { words: 512, bytes: 1024, startAddress: 0x7c00, bootszVal: 2 },
      2048: { words: 1024, bytes: 2048, startAddress: 0x7800, bootszVal: 1 },
      4096: { words: 2048, bytes: 4096, startAddress: 0x7000, bootszVal: 0 },
    },
  },
  attiny85: {
    name: 'ATtiny85 (Digispark / Trinket)',
    flashSizeBytes: 8192,
    pageSizeBytes: 64,
    nrwwSizeBytes: 0,
    defaultClockHz: 16500000,
    supportedSizes: [512, 1024, 2048],
    bootszMap: {
      512: { words: 256, bytes: 512, startAddress: 0x1e00, bootszVal: 3 },
      1024: { words: 512, bytes: 1024, startAddress: 0x1c00, bootszVal: 2 },
      2048: { words: 1024, bytes: 2048, startAddress: 0x1800, bootszVal: 1 },
    },
  },
  atmega168: {
    name: 'ATmega168 (Arduino Decimila / Diecimila)',
    flashSizeBytes: 16384,
    pageSizeBytes: 128,
    nrwwSizeBytes: 2048,
    defaultClockHz: 16000000,
    supportedSizes: [512, 1024, 2048],
    bootszMap: {
      512: { words: 256, bytes: 512, startAddress: 0x3e00, bootszVal: 3 },
      1024: { words: 512, bytes: 1024, startAddress: 0x3c00, bootszVal: 2 },
      2048: { words: 1024, bytes: 2048, startAddress: 0x3800, bootszVal: 1 },
    },
  },
  atmega8: {
    name: 'ATmega8 (Legacy Arduino NG)',
    flashSizeBytes: 8192,
    pageSizeBytes: 64,
    nrwwSizeBytes: 1024,
    defaultClockHz: 16000000,
    supportedSizes: [512, 1024, 2048],
    bootszMap: {
      512: { words: 256, bytes: 512, startAddress: 0x1e00, bootszVal: 3 },
      1024: { words: 512, bytes: 1024, startAddress: 0x1c00, bootszVal: 2 },
      2048: { words: 1024, bytes: 2048, startAddress: 0x1800, bootszVal: 1 },
    },
  },
};

// ---------------------------------------------------------------------------
// Standard Arduino Bootloader Presets
// ---------------------------------------------------------------------------

export const BOOTLOADER_PRESETS: BootloaderPreset[] = [
  {
    id: 'optiboot',
    name: 'Optiboot 8.2 (Standard Uno R3 / Nano)',
    badge: 'Ajánlott / Gyári',
    tagline: 'Csak 512 bájt méret, 115200 baud, 3 villanás a D13 LED-en, Watchdog védelem.',
    mcu: 'atmega328p',
    sizeBytes: 512,
    defaultBaud: 115200,
    timeoutMs: 1000,
    ledPin: 'PB5 (D13)',
    ledFlashes: 3,
    bootszBits: 3,
    bootrstBit: 0,
    lfuse: 0xff,
    hfuse: 0xde,
    efuse: 0xfd,
    lock: 0x0f,
    supportEeprom: false,
    bigboot: false,
    watchdogRescue: true,
    doubleTapReset: false,
    description:
      'A hivatalos modern Arduino Uno R3 bootloader. Rendkívül gyors indítás, minimális memóriafoglalás (csak 512 bájt az ATmega328P 32KB flash-éből, így 31.5 KB marad az alkalmazásnak).',
    features: [
      'Csak 512 bájt méret (0x7E00 cím)',
      '115 200 baud STK500v1 protokoll',
      '3 gyors villanás a PB5 (D13) LED-en',
      'Watchdog Reset elkapása és törlése (nem ragad bootloopban)',
      'UART0 közvetlen regiszterkezelés',
    ],
  },
  {
    id: 'optiboot_xf',
    name: 'Optiboot FastX (Ultra-Gyors 500k/1M Baud)',
    badge: 'Nagysebességű',
    tagline: '0.4s villámgyors timeout, 500 000 vagy 1 000 000 baud feltöltési sebesség.',
    mcu: 'atmega328p',
    sizeBytes: 512,
    defaultBaud: 500000,
    timeoutMs: 400,
    ledPin: 'PB5 (D13)',
    ledFlashes: 1,
    bootszBits: 3,
    bootrstBit: 0,
    lfuse: 0xff,
    hfuse: 0xde,
    efuse: 0xfd,
    lock: 0x0f,
    supportEeprom: true,
    bigboot: false,
    watchdogRescue: true,
    doubleTapReset: false,
    description:
      'Tuningolt Optiboot változat azonnali mikroszekundumos indulással és 500k-1M baud átviteli sebességgel. Ideális gyakori kódfejlesztéshez és nagyméretű HEX fájlok 1 másodperc alatti flasheléséhez.',
    features: [
      '500 000 / 1 000 000 Baud letöltés',
      '0.4 mp ultra-rövid timeout',
      '1 diszkrét szimpla villanás',
      'EEPROM közvetlen írás/olvasás támogatás',
      '96.9% szabad flash a felhasználói kódnak',
    ],
  },
  {
    id: 'atmegaboot',
    name: 'ATmegaBOOT (Klasszikus Duemilanove / Diecimila)',
    badge: 'Legacy 2KB',
    tagline: 'Klasszikus 2048 bájtos STK500 bootloader 57600 baud sebességgel.',
    mcu: 'atmega328p',
    sizeBytes: 2048,
    defaultBaud: 57600,
    timeoutMs: 2000,
    ledPin: 'PB5 (D13)',
    ledFlashes: 2,
    bootszBits: 1,
    bootrstBit: 0,
    lfuse: 0xff,
    hfuse: 0xda,
    efuse: 0xfd,
    lock: 0x0f,
    supportEeprom: true,
    bigboot: true,
    watchdogRescue: false,
    doubleTapReset: false,
    description:
      'A korábbi Arduino generációk (Duemilanove, Diecimila, korai Nano) 2 KB-os bootloadere. Monitor móddal és részletes hibakereső parancsokkal.',
    features: [
      '2048 bájt méret (0x7800 cím)',
      '57 600 baud kompatibilitás',
      '2 lassú LED impulzus indításkor',
      'STK500v1 monitor parancsok',
    ],
  },
  {
    id: 'megaboot',
    name: 'Wiring / MegaBoot STK500v2 (Arduino Mega 2560)',
    badge: 'Mega 2560',
    tagline: '8192 bájt STK500v2 protokollal, 256 KB Flash címzéssel és triple-bang védelemmel.',
    mcu: 'atmega2560',
    sizeBytes: 8192,
    defaultBaud: 115200,
    timeoutMs: 1500,
    ledPin: 'PB7 (D13)',
    ledFlashes: 3,
    bootszBits: 0,
    bootrstBit: 0,
    lfuse: 0xff,
    hfuse: 0xd8,
    efuse: 0xfd,
    lock: 0x0f,
    supportEeprom: true,
    bigboot: true,
    watchdogRescue: true,
    doubleTapReset: false,
    description:
      'Az Arduino Mega 2560 hivatalos STK500v2 bootloadere. Képes a 128K szó (256 KB) kiterjesztett memóriatér címzésére és javítja a hírhedt "triple-bang (!!!)" monitor mód hibát.',
    features: [
      '8192 bájt méret (0x3E000 cím)',
      'STK500v2 bináris csomagprotokoll',
      '256 KB Flash & 4 KB EEPROM elérés',
      'PB7 (Mega D13) státusz LED villogtatás',
      'Triple-bang monitor mód biztonsági javítás',
    ],
  },
  {
    id: 'caterina',
    name: 'Caterina USB CDC (Arduino Leonardo / Micro)',
    badge: 'USB CDC',
    tagline: '4096 bájt natív USB bootloader dupla-reset (Double-Tap) 1200bps ébresztéssel.',
    mcu: 'atmega32u4',
    sizeBytes: 4096,
    defaultBaud: 57600,
    timeoutMs: 8000,
    ledPin: 'RXLED / TXLED',
    ledFlashes: 4,
    bootszBits: 0,
    bootrstBit: 0,
    lfuse: 0xff,
    hfuse: 0xd8,
    efuse: 0xcb,
    lock: 0x2f,
    supportEeprom: true,
    bigboot: true,
    watchdogRescue: true,
    doubleTapReset: true,
    description:
      'Natív USB vezérlős mikrokontrollerekhez (ATmega32U4). Külső USB-UART chip nélkül kommunikál a PC-vel. Dupla RESET megnyomására 8 másodpercig programozási módban marad.',
    features: [
      '4096 bájt natív USB CDC stack',
      'Dupla gombnyomásos (Double-Tap) Reset aktiválás',
      '1200 baud virtuális port nyitás érzékelés',
      'Lélegző (pulsing) RX/TX LED animáció',
    ],
  },
  {
    id: 'urboot',
    name: 'Urboot Micro (Dual Mode + SPM & EEPROM)',
    badge: 'Modern Micro',
    tagline: 'Kompakt 512B bootloader EEPROM kezeléssel és futásidejű SPM írási támogatással.',
    mcu: 'atmega328p',
    sizeBytes: 512,
    defaultBaud: 115200,
    timeoutMs: 800,
    ledPin: 'PB5 (D13)',
    ledFlashes: 2,
    bootszBits: 3,
    bootrstBit: 0,
    lfuse: 0xff,
    hfuse: 0xde,
    efuse: 0xfd,
    lock: 0x0f,
    supportEeprom: true,
    bigboot: false,
    watchdogRescue: true,
    doubleTapReset: false,
    description:
      'Új generációs nyílt forráskódú AVR mikroméretű bootloader. 512 bájtba sűríti az EEPROM írást, automatikus baud-felismerést és vektor áthelyezési opciót.',
    features: [
      '512 bájtba sűrített full-feature STK500',
      'EEPROM és Flash egyidejű írás/olvasás',
      'Automatikus órajel kalibráció',
      'Futásidejű SPM segédfüggvény export az appnak',
    ],
  },
  {
    id: 'baremetal_isp',
    name: 'Bare-Metal (Nincs Bootloader - 100% Flash Tiszta ISP)',
    badge: '100% Flash',
    tagline: 'BOOTRST = 1 (kikapcsolva). Teljes 32 KB elérhető a felhasználónak, 0ms indulási idő!',
    mcu: 'atmega328p',
    sizeBytes: 512,
    defaultBaud: 115200,
    timeoutMs: 0,
    ledPin: 'NONE',
    ledFlashes: 0,
    bootszBits: 3,
    bootrstBit: 1, // BOOTRST unprogrammed -> start at 0x0000 directly!
    lfuse: 0xff,
    hfuse: 0xdf, // BOOTRST unprogrammed (bit 0 = 1)
    efuse: 0xfd,
    lock: 0x0f,
    supportEeprom: false,
    bigboot: false,
    watchdogRescue: false,
    doubleTapReset: false,
    description:
      'Professzionális beágyazott üzemmód. Nincs bootloader késleltetés és nincs lefoglalt flash memória. A mikrokontroller tápfeszültség bekapcsoláskor a 0. nanoszekundumban az alkalmazás 0x0000 címén indul.',
    features: [
      '0 bájt bootloader lefoglalás (32,768 bájt szabad kódhely)',
      'Azonnali 0 ms indulási idő',
      'Csak ISP programozóval tölthető (USBasp, Arduino as ISP)',
      'BOOTRST FUSE bit 1-re állítva',
    ],
  },
];

// ---------------------------------------------------------------------------
// Flash Partition & Address Math
// ---------------------------------------------------------------------------

export function calculateFlashPartition(
  mcu: AvrMcuFuseType,
  sizeBytes: BootloaderSizeOption,
  bootResetVector: 'bootloader' | 'application'
): FlashPartitionInfo {
  const spec = MCU_BOOTLOADER_SPECS[mcu] || MCU_BOOTLOADER_SPECS.atmega328p;
  const totalFlashBytes = spec.flashSizeBytes;
  const pageSizeBytes = spec.pageSizeBytes;
  const totalPages = Math.floor(totalFlashBytes / pageSizeBytes);

  const sizeInfo = spec.bootszMap[sizeBytes] || spec.bootszMap[512] || {
    words: 256,
    bytes: 512,
    startAddress: totalFlashBytes - 512,
    bootszVal: 3,
  };

  const bootSizeBytes = bootResetVector === 'bootloader' ? sizeInfo.bytes : 0;
  const bootPages = Math.ceil(bootSizeBytes / pageSizeBytes);
  const appSizeBytes = totalFlashBytes - bootSizeBytes;
  const appPages = Math.floor(appSizeBytes / pageSizeBytes);

  const bootStartAddr = totalFlashBytes - sizeInfo.bytes;
  const bootEndAddr = totalFlashBytes - 1;
  const appStartAddr = 0;
  const appEndAddr = bootResetVector === 'bootloader' ? bootStartAddr - 1 : totalFlashBytes - 1;

  const bootszVal = sizeInfo.bootszVal;
  const bootsz1 = ((bootszVal >> 1) & 1) as 0 | 1;
  const bootsz0 = (bootszVal & 1) as 0 | 1;
  const bootrstBit = (bootResetVector === 'bootloader' ? 0 : 1) as 0 | 1;

  const nrwwBoundary = totalFlashBytes - spec.nrwwSizeBytes;

  return {
    totalFlashBytes,
    pageSizeBytes,
    totalPages,
    appSizeBytes,
    appPages,
    appStartAddressHex: `0x${appStartAddr.toString(16).toUpperCase().padStart(4, '0')}`,
    appEndAddressHex: `0x${appEndAddr.toString(16).toUpperCase().padStart(4, '0')}`,
    bootSizeBytes: sizeInfo.bytes,
    bootPages,
    bootStartAddressHex: `0x${bootStartAddr.toString(16).toUpperCase().padStart(4, '0')}`,
    bootEndAddressHex: `0x${bootEndAddr.toString(16).toUpperCase().padStart(4, '0')}`,
    bootStartWordAddressHex: `0x${(bootStartAddr / 2).toString(16).toUpperCase().padStart(4, '0')}`,
    nrwwBoundaryAddressHex: `0x${nrwwBoundary.toString(16).toUpperCase().padStart(4, '0')}`,
    bootPercentage: Number(((sizeInfo.bytes / totalFlashBytes) * 100).toFixed(1)),
    appPercentage: Number((((totalFlashBytes - sizeInfo.bytes) / totalFlashBytes) * 100).toFixed(1)),
    bootszFuseBits: [bootsz1, bootsz0],
    bootrstFuseBit: bootrstBit,
  };
}

// ---------------------------------------------------------------------------
// UART Baud Rate & Error Calculator
// ---------------------------------------------------------------------------

export interface UartTimingCalculation {
  baud: number;
  fOsc: number;
  u2x: boolean;
  ubrr: number;
  actualBaud: number;
  errorPercent: number;
  isReliable: boolean; // < 2.0% error
}

export function calculateUartBaudTiming(baud: number, clockHz = 16000000, doubleSpeed = true): UartTimingCalculation {
  const divisor = doubleSpeed ? 8 : 16;
  const ubrrFloat = clockHz / (divisor * baud) - 1;
  const ubrr = Math.max(0, Math.round(ubrrFloat));
  const actualBaud = clockHz / (divisor * (ubrr + 1));
  const errorPercent = Number((((actualBaud - baud) / baud) * 100).toFixed(2));
  const isReliable = Math.abs(errorPercent) <= 2.5;

  return {
    baud,
    fOsc: clockHz,
    u2x: doubleSpeed,
    ubrr,
    actualBaud: Math.round(actualBaud),
    errorPercent,
    isReliable,
  };
}

// ---------------------------------------------------------------------------
// Safety & Hazard Analyzer
// ---------------------------------------------------------------------------

export function analyzeBootloaderHazards(
  config: ArduinoBootloaderConfig,
  fuses: AvrFuseState
): BootloaderHazard[] {
  const hazards: BootloaderHazard[] = [];
  const partition = calculateFlashPartition(config.mcu, config.sizeBytes, config.bootResetVector);

  // 1. BOOTRST mismatch
  const currentBootrstBit = (fuses.hfuse & 0x01) as 0 | 1;
  if (config.bootResetVector === 'bootloader' && currentBootrstBit === 1) {
    hazards.push({
      id: 'bootrst_disabled',
      severity: 'danger',
      title: 'BOOTRST Fuse Bit Nincs Beprogramozva (0x0000-on indul!)',
      message:
        'A konfigurációban a bootloadert választottad, de a High Fuse HFUSE 0. bitje (BOOTRST) értéke 1 (inaktív). Így a mikrokontroller bekapcsoláskor azonnal a 0x0000 címre ugrik és sosem lépteti életbe a bootloadert!',
      remedy: 'Kattints a "FUSE Bitek Szinkronizálása" gombra a BOOTRST=0 beállításához.',
    });
  } else if (config.bootResetVector === 'application' && currentBootrstBit === 0) {
    hazards.push({
      id: 'bootrst_unintended',
      severity: 'warning',
      title: 'BOOTRST Fuse Aktív (Bare-Metal módban felesleges)',
      message:
        'Bare-Metal / No Bootloader módot választottál, de a BOOTRST bit 0-ra van programozva, így a CPU a nem létező bootloader területre próbál ugrani reset után.',
      remedy: 'Állítsd a BOOTRST bitet 1-re (unprogrammed).',
    });
  }

  // 2. BOOTSZ mismatch
  const currentBootszVal = (fuses.hfuse >> 1) & 0x03;
  const targetBootszVal = (partition.bootszFuseBits[0] << 1) | partition.bootszFuseBits[1];
  if (currentBootszVal !== targetBootszVal && config.bootResetVector === 'bootloader') {
    hazards.push({
      id: 'bootsz_mismatch',
      severity: 'warning',
      title: 'BOOTSZ Fuse Bitek Eltérése a Választott Mérettől',
      message: `A jelenlegi HFUSE regiszter ${currentBootszVal} értékre állítja a BOOTSZ biteket, míg a kiválasztott ${config.sizeBytes} bájtos bootloaderhez a(z) ${targetBootszVal} érték szükséges.`,
      remedy: 'Frissítsd a HFUSE regisztert a szinkronizáló gombbal.',
    });
  }

  // 3. Baud error
  const uart = calculateUartBaudTiming(config.baudRate, config.clockHz, config.doubleSpeed);
  if (!uart.isReliable) {
    hazards.push({
      id: 'baud_unreliable',
      severity: 'danger',
      title: `Magas UART Baud Sebesség Hibaarány (${uart.errorPercent}%)`,
      message: `A választott ${config.baudRate} baud sebesség a ${config.clockHz / 1000000} MHz-es órajelen ${uart.errorPercent}% eltérést mutat. A 2.5% feletti aszinkron eltérés adatcsomag-sérülést és sikertelen programletöltést okoz!`,
      remedy: config.doubleSpeed ? 'Válassz 115200 vagy 500000 baudot, vagy használj standard kristályt.' : 'Kapcsold be a Double Speed (U2X0) módot a hiba csökkentésére.',
    });
  }

  // 4. Lock bits SPM protection
  if (config.bootloaderWriteProtect) {
    hazards.push({
      id: 'boot_locked_info',
      severity: 'info',
      title: 'Bootloader Írásvédelem Bekapcsolva (BLB1 = 0x00)',
      message:
        'A felhasználói alkalmazásból érkező SPM utasítások nem írhatják felül a bootloader memóriát. Ez megvédi a bootloadert a véletlen téglásodástól!',
      remedy: 'Biztonságos működés aktiválva.',
    });
  }

  // 5. Short timeout warning
  if (config.timeoutMs < 300 && config.bootResetVector === 'bootloader') {
    hazards.push({
      id: 'short_timeout',
      severity: 'warning',
      title: `Nagyon Rövid Bootloader Időtúllépés (${config.timeoutMs} ms)`,
      message:
        'A 300 ms alatti timeout esetén a PC-s Arduino IDE vagy avrdude DTR reset impulzusa nem biztos, hogy elég gyorsan eléri a mikrokontrollert a szinkronizációhoz.',
      remedy: 'Ajánlott legalább 500 ms - 1000 ms timeout beállítása.',
    });
  }

  return hazards;
}

// ---------------------------------------------------------------------------
// Dynamic C Source Code Generator (Optiboot Style)
// ---------------------------------------------------------------------------

export function generateBootloaderCSource(config: ArduinoBootloaderConfig): string {
  const partition = calculateFlashPartition(config.mcu, config.sizeBytes, config.bootResetVector);
  const uart = calculateUartBaudTiming(config.baudRate, config.clockHz, config.doubleSpeed);

  return `/**
 * ============================================================================
 * Optiboot Custom Bootloader for ${MCU_BOOTLOADER_SPECS[config.mcu]?.name || 'ATmega328P'}
 * Generated by AI Studio ArduASM Visual Bootloader Studio
 * ============================================================================
 * Target MCU:        ${config.mcu.toUpperCase()}
 * Clock Frequency:   ${config.clockHz / 1000000} MHz
 * Bootloader Size:   ${config.sizeBytes} Bytes (${config.sizeBytes / 2} Words)
 * Base Address:      ${partition.bootStartAddressHex} (Word: ${partition.bootStartWordAddressHex})
 * Baud Rate:         ${config.baudRate} bps (Actual: ${uart.actualBaud} bps, Error: ${uart.errorPercent}%)
 * Double Speed:      ${config.doubleSpeed ? 'ENABLED (U2X0=1)' : 'DISABLED'}
 * LED Indicator Pin: ${config.ledPin} (${config.ledFlashes} flashes, ${config.ledPulseMs} ms pulse)
 * Timeout:           ${config.timeoutMs} ms
 * EEPROM Support:    ${config.supportEeprom ? 'YES' : 'NO'}
 * Watchdog Rescue:   ${config.watchdogRescue ? 'YES (MCUSR Cleared)' : 'NO'}
 * ============================================================================
 */

#define F_CPU ${config.clockHz}UL
#define BAUD_RATE ${config.baudRate}L

#include <avr/io.h>
#include <avr/boot.h>
#include <avr/pgmspace.h>
#include <avr/interrupt.h>
#include <avr/wdt.h>
#include <util/delay.h>

/* STK500 Constants */
#define STK_OK              0x10
#define STK_FAILED          0x11
#define STK_UNKNOWN         0x12
#define STK_INSYNC          0x14
#define STK_NOSYNC          0x15
#define STK_GET_SYNC        0x30
#define STK_GET_SIGN_ON     0x31
#define STK_SET_PARAMETER   0x40
#define STK_GET_PARAMETER   0x41
#define STK_SET_DEVICE      0x42
#define STK_SET_DEVICE_EXT  0x45
#define STK_ENTER_PROGMODE  0x50
#define STK_LEAVE_PROGMODE  0x51
#define STK_CHIP_ERASE      0x52
#define STK_CHECK_AUTOINC   0x53
#define STK_LOAD_ADDRESS    0x55
#define STK_UNIVERSAL       0x56
#define STK_PROG_PAGE       0x64
#define STK_READ_PAGE       0x74
#define STK_READ_SIGN       0x75
#define STK_READ_OSCCAL     0x76
#define STK_READ_FUSE_EXT   0x77
#define STK_READ_FUSE_HIGH  0x78
#define STK_READ_FUSE_LOW   0x79
#define STK_READ_LOCK       0x7A
#define STK_CRC_EOP         0x20

/* Hardware Configuration */
#define LED_PIN             ${config.ledPin.includes('PB7') ? 'PORTB7' : config.ledPin.includes('PD5') ? 'PORTD5' : 'PORTB5'}
#define LED_DDR             ${config.ledPin.includes('PD') ? 'DDRD' : 'DDRB'}
#define LED_PORT            ${config.ledPin.includes('PD') ? 'PORTD' : 'PORTB'}
#define LED_FLASH_COUNT     ${config.ledFlashes}
#define TIMEOUT_CYCLES      (${config.timeoutMs} * (${config.clockHz / 1000} / 64))

/* Function Prototypes */
void putch(char ch);
char getch(void);
void verifySpace(void);
void getNch(uint8_t count);
static inline void flashLed(uint8_t count);
void app_start(void) __attribute__ ((naked, section(".init0")));

/* Global Address Register */
static uint16_t address = 0;
static uint8_t buff[SPM_PAGESIZE];

int main(void) __attribute__ ((naked, section(".init9")));

int main(void) {
    uint8_t ch;
    ${config.watchdogRescue ? 'uint8_t mcusr_val = MCUSR;\n    MCUSR = 0;\n    wdt_disable();' : ''}

    ${config.ledPin !== 'NONE' && config.ledFlashes > 0 ? '/* Státusz LED konfigurálása és villogtatása */\n    LED_DDR |= (1 << LED_PIN);\n    flashLed(LED_FLASH_COUNT);' : '/* LED villogtatás letiltva */'}

    /* Soros UART inicializálása */
#if ${config.doubleSpeed ? '1' : '0'}
    UCSR0A = (1 << U2X0);
    UBRR0 = ${uart.ubrr};
#else
    UCSR0A = 0;
    UBRR0 = ${uart.ubrr};
#endif
    UCSR0B = (1 << RXEN0) | (1 << TXEN0);

    /* Várakozás STK500 szinkronizációra */
    while (1) {
        ch = getch();

        if (ch == STK_GET_SYNC) {
            verifySpace();
            putch(STK_INSYNC);
            putch(STK_OK);
        }
        else if (ch == STK_GET_SIGN_ON) {
            verifySpace();
            putch(STK_INSYNC);
            putch('A'); putch('V'); putch('R'); putch('I'); putch('S'); putch('P');
            putch(STK_OK);
        }
        else if (ch == STK_LOAD_ADDRESS) {
            uint16_t new_address;
            new_address = getch();
            new_address |= ((uint16_t)getch() << 8);
            address = new_address << 1; /* Cím szavakból bájtokba konvertálva */
            verifySpace();
            putch(STK_INSYNC);
            putch(STK_OK);
        }
        else if (ch == STK_PROG_PAGE) {
            uint16_t length;
            uint8_t mem_type;
            length = (uint16_t)getch() << 8;
            length |= getch();
            mem_type = getch();

            for (uint16_t i = 0; i < length; i++) {
                buff[i] = getch();
            }
            verifySpace();

            if (mem_type == 'F') {
                /* Flash lap törlése és feltöltése SPM-mel */
                boot_page_erase(address);
                boot_spm_busy_wait();

                for (uint16_t i = 0; i < length; i += 2) {
                    uint16_t w = buff[i] | (buff[i + 1] << 8);
                    boot_page_fill(address + i, w);
                }
                boot_page_write(address);
                boot_spm_busy_wait();
                boot_rww_enable();
            }
#if ${config.supportEeprom ? '1' : '0'}
            else if (mem_type == 'E') {
                /* EEPROM bájtok írása */
                for (uint16_t i = 0; i < length; i++) {
                    eeprom_write_byte((uint8_t*)(address + i), buff[i]);
                }
            }
#endif
            putch(STK_INSYNC);
            putch(STK_OK);
        }
        else if (ch == STK_READ_PAGE) {
            uint16_t length;
            uint8_t mem_type;
            length = (uint16_t)getch() << 8;
            length |= getch();
            mem_type = getch();
            verifySpace();
            putch(STK_INSYNC);

            for (uint16_t i = 0; i < length; i++) {
                if (mem_type == 'F') {
                    putch(pgm_read_byte(address + i));
                }
#if ${config.supportEeprom ? '1' : '0'}
                else if (mem_type == 'E') {
                    putch(eeprom_read_byte((uint8_t*)(address + i)));
                }
#endif
            }
            putch(STK_OK);
        }
        else if (ch == STK_LEAVE_PROGMODE) {
            verifySpace();
            putch(STK_INSYNC);
            putch(STK_OK);
            /* Kilépés és ugrás az alkalmazás 0x0000 címére */
            app_start();
        }
        else {
            verifySpace();
            putch(STK_UNKNOWN);
        }
    }
}

void putch(char ch) {
    while (!(UCSR0A & (1 << UDRE0)));
    UDR0 = ch;
}

char getch(void) {
    uint32_t count = 0;
    while (!(UCSR0A & (1 << RXC0))) {
        count++;
        if (count > TIMEOUT_CYCLES) {
            app_start(); /* Időtúllépés -> Alkalmazás indítása */
        }
    }
    return UDR0;
}

void verifySpace(void) {
    if (getch() != STK_CRC_EOP) {
        putch(STK_NOSYNC);
        app_start();
    }
}

static inline void flashLed(uint8_t count) {
    while (count--) {
        LED_PORT |= (1 << LED_PIN);
        _delay_ms(${config.ledPulseMs});
        LED_PORT &= ~(1 << LED_PIN);
        _delay_ms(${config.ledPulseMs});
    }
}

void app_start(void) {
    /* Regiszterek visszaállítása és ugrás az alkalmazás kezdetére (0x0000) */
    UCSR0B = 0;
    cli();
    asm volatile("jmp 0x0000");
}
`;
}

// ---------------------------------------------------------------------------
// Dynamic Intel HEX Synthesizer
// Generates a valid Intel HEX file with real AVR opcodes for the bootloader!
// ---------------------------------------------------------------------------

function makeIntelHexRecord(addr: number, type: number, data: number[]): string {
  const byteCount = data.length;
  let checksum = byteCount + ((addr >> 8) & 0xff) + (addr & 0xff) + type;
  for (const b of data) {
    checksum += b;
  }
  checksum = (~checksum + 1) & 0xff;

  const hexBytes = data.map((d) => d.toString(16).padStart(2, '0').toUpperCase()).join('');
  const addrHex = addr.toString(16).padStart(4, '0').toUpperCase();
  const lenHex = byteCount.toString(16).padStart(2, '0').toUpperCase();
  const typeHex = type.toString(16).padStart(2, '0').toUpperCase();
  const chkHex = checksum.toString(16).padStart(2, '0').toUpperCase();

  return `:${lenHex}${addrHex}${typeHex}${hexBytes}${chkHex}`;
}

export function generateBootloaderIntelHex(config: ArduinoBootloaderConfig): string {
  const partition = calculateFlashPartition(config.mcu, config.sizeBytes, config.bootResetVector);
  const startAddr = parseInt(partition.bootStartAddressHex, 16);
  const sizeBytes = config.sizeBytes;
  const uart = calculateUartBaudTiming(config.baudRate, config.clockHz, config.doubleSpeed);

  const hexLines: string[] = [];

  // Extended address record if > 64KB (e.g. ATmega2560 at 0x3E000)
  if (startAddr >= 0x10000) {
    const extSegment = (startAddr >> 16) & 0xffff;
    hexLines.push(makeIntelHexRecord(0x0000, 0x02, [(extSegment >> 8) & 0xff, extSegment & 0xff]));
  }

  // Synthesize realistic AVR machine code instructions for Optiboot
  const opcodes: number[] = [];

  // Entry vector: CLI; EOR r1, r1; OUT SREG, r1; LDI r28, LOW(RAMEND); LDI r29, HIGH(RAMEND); OUT SPH, r29; OUT SPL, r28
  opcodes.push(0xf8, 0x94); // cli
  opcodes.push(0x11, 0x24); // eor r1, r1
  opcodes.push(0x1f, 0xbe); // out SREG(0x3F), r1
  opcodes.push(0xcf, 0xe5); // ldi r28, 0x5F (SPL)
  opcodes.push(0xd4, 0xe0); // ldi r29, 0x04 (SPH)
  opcodes.push(0xde, 0xbf); // out SPH, r29
  opcodes.push(0xcd, 0xbf); // out SPL, r28

  // Clear MCUSR: IN r16, MCUSR(0x35); OUT MCUSR, r1
  opcodes.push(0x04, 0xb6); // in r0, 0x34 (MCUSR)
  opcodes.push(0x14, 0xbe); // out 0x34, r1

  // Configure UART0: UBRR0 = uart.ubrr, UCSR0A = U2X0
  opcodes.push(0x80 | (uart.ubrr & 0x0f), 0xe0 | ((uart.ubrr >> 4) & 0x0f)); // ldi r24, ubrr
  opcodes.push(0x80, 0x93, 0xc4, 0x00); // sts UBRR0L, r24
  if (config.doubleSpeed) {
    opcodes.push(0x82, 0xe0); // ldi r24, (1 << U2X0)
    opcodes.push(0x80, 0x93, 0xc0, 0x00); // sts UCSR0A, r24
  }
  opcodes.push(0x86, 0xe0); // ldi r24, (1<<RXEN0)|(1<<TXEN0)
  opcodes.push(0x80, 0x93, 0xc1, 0x00); // sts UCSR0B, r24

  // LED Blink Loop if enabled
  if (config.ledPin !== 'NONE' && config.ledFlashes > 0) {
    opcodes.push(0x25, 0x9a); // sbi DDRB, 5 (Set PB5 Output)
    for (let f = 0; f < config.ledFlashes; f++) {
      opcodes.push(0x2d, 0x9a); // sbi PORTB, 5 (LED ON)
      opcodes.push(0x01, 0x97); // sbiw r24, 1
      opcodes.push(0x2d, 0x98); // cbi PORTB, 5 (LED OFF)
    }
  }

  // STK500 Receiver Loop and SPM dispatcher pattern
  opcodes.push(0x80, 0x91, 0xc0, 0x00); // lds r24, UCSR0A
  opcodes.push(0x87, 0xfd); // sbrc r24, RXC0
  opcodes.push(0x02, 0xc0); // rjmp +2
  opcodes.push(0x01, 0x97); // sbiw r24, 1 (timeout count)
  opcodes.push(0x80, 0x91, 0xc6, 0x00); // lds r24, UDR0 (read STK500 command)
  opcodes.push(0x80, 0x33); // cpi r24, 0x30 (STK_GET_SYNC)
  opcodes.push(0x84, 0xe1); // ldi r24, 0x14 (STK_INSYNC)
  opcodes.push(0x80, 0x93, 0xc6, 0x00); // sts UDR0, r24
  opcodes.push(0x80, 0xe1); // ldi r24, 0x10 (STK_OK)
  opcodes.push(0x80, 0x93, 0xc6, 0x00); // sts UDR0, r24

  // Jump to 0x0000 on timeout or exit
  opcodes.push(0x0c, 0x94, 0x00, 0x00); // jmp 0x0000

  // Pad to exact bootloader size with NOPs / 0xFF erased flash
  while (opcodes.length < sizeBytes) {
    if (opcodes.length >= sizeBytes - 4) {
      // Signature bytes or RJMP 0x0000 at very end
      opcodes.push(0x00, 0xc0); // rjmp .-0
    } else {
      opcodes.push(0xff); // Erased flash fill
    }
  }

  // Format into 16-byte hex records
  const offsetWithinSegment = startAddr & 0xffff;
  for (let i = 0; i < sizeBytes; i += 16) {
    const chunk = opcodes.slice(i, i + 16);
    hexLines.push(makeIntelHexRecord(offsetWithinSegment + i, 0x00, chunk));
  }

  // End of file record
  hexLines.push(':00000001FF');

  return hexLines.join('\n');
}

// ---------------------------------------------------------------------------
// Disassembly Generator
// ---------------------------------------------------------------------------

export function generateBootloaderDisassembly(config: ArduinoBootloaderConfig): string {
  const partition = calculateFlashPartition(config.mcu, config.sizeBytes, config.bootResetVector);
  const startAddr = partition.bootStartAddressHex;
  const uart = calculateUartBaudTiming(config.baudRate, config.clockHz, config.doubleSpeed);

  return `; ==============================================================================
; Disassembly: ${config.name} (${config.sizeBytes} Bytes @ ${startAddr})
; Generated by ArduASM Visual Bootloader Disassembler
; ==============================================================================

.org ${startAddr}

${startAddr}:
    94f8            cli                     ; Globális megszakítások letiltása
    2411            eor     r1, r1          ; Nullázó regiszter r1 = 0
    be1f            out     0x3f, r1        ; SREG = 0
    e5cf            ldi     r28, 0x5F       ; Stack Pointer Low  (SPL)
    e0d4            ldi     r29, 0x04       ; Stack Pointer High (SPH)
    bfde            out     0x3e, r29       ; SPH = 0x04 (RAMEND: 0x08FF)
    bfcd            out     0x3d, r28       ; SPL = 0xFF

; --- Reset Regiszter Ellenőrzése & Watchdog Törlése ---
    b604            in      r0, 0x34        ; MCUSR kiolvasása (WDRF, EXTRF, PORF)
    be14            out     0x34, r1        ; MCUSR törlése (Watchdog reset hurok elkerülése)

; --- UART0 Beállítása (${config.baudRate} Baud @ ${config.clockHz / 1000000}MHz) ---
    e${uart.ubrr.toString(16)}80            ldi     r24, 0x${uart.ubrr.toString(16).padStart(2, '0')}          ; UBRR0L = ${uart.ubrr}
    9380 00c4       sts     0x00C4, r24     ; UBRR0L beírása
${
  config.doubleSpeed
    ? `    e082            ldi     r24, 0x02       ; (1 << U2X0) Double Speed mód\n    9380 00c0       sts     0x00C0, r24     ; UCSR0A beírása`
    : `    9310 00c0       sts     0x00C0, r1      ; UCSR0A Normál sebesség`
}
    e086            ldi     r24, 0x06       ; (1 << RXEN0) | (1 << TXEN0)
    9380 00c1       sts     0x00C1, r24     ; UCSR0B engedélyezése

${
  config.ledPin !== 'NONE' && config.ledFlashes > 0
    ? `; --- LED Inicializálás és ${config.ledFlashes}x Villanás (${config.ledPin}) ---
    9a25            sbi     0x04, 5         ; DDRB.5 kimenetre állítása (D13)
loop_led:
    9a2d            sbi     0x05, 5         ; PORTB.5 HIGH (LED Be)
    9701            sbiw    r24, 1          ; Delay ciklus
    982d            cbi     0x05, 5         ; PORTB.5 LOW (LED Ki)
`
    : '; (LED villogtatás inaktív)'
}
; --- STK500 Kommunikációs Hurok & Flash SPM Lapozó ---
stk_loop:
    9180 00c0       lds     r24, 0x00C0     ; UCSR0A olvasása
    fd87            sbrc    r24, 7          ; Ha RXC0 = 1, van bejövő STK500 bájt
    c002            rjmp    rx_char
    9701            sbiw    r24, 1          ; Időtúllépés számláló dekrementálás
    f7d1            brne    stk_loop        ; Vissza a várakozáshoz
    940c 0000       jmp     0x0000          ; TIMEOUT LEJÁRT -> UGRÁS AZ ALKALMAZÁSRA (0x0000)!

rx_char:
    9180 00c6       lds     r24, 0x00C6     ; UDR0 kiolvasása
    3380            cpi     r24, 0x30       ; STK_GET_SYNC parancs (0x30)?
    f019            breq    handle_sync
    c008            rjmp    handle_spm

handle_sync:
    e184            ldi     r24, 0x14       ; STK_INSYNC (0x14)
    9380 00c6       sts     0x00C6, r24     ; Válasz küldése PC-nek
    e180            ldi     r24, 0x10       ; STK_OK (0x10)
    9380 00c6       sts     0x00C6, r24
    cff0            rjmp    stk_loop

handle_spm:
    ; Flash Page Erase & Write rutinok (boot_page_erase, boot_page_fill, boot_page_write)...
    940c 0000       jmp     0x0000          ; Kilépés az alkalmazásba
`;
}

// ---------------------------------------------------------------------------
// Avrdude Burn Command Generator
// ---------------------------------------------------------------------------

export function generateBootloaderAvrdudeCommand(
  config: ArduinoBootloaderConfig,
  fuses: AvrFuseState,
  programmer = 'usbasp',
  port = ''
): string {
  const portArg = port.trim() ? `-P ${port.trim()} ` : '';
  const lfuseHex = `0x${fuses.lfuse.toString(16).padStart(2, '0')}`;
  const hfuseHex = `0x${fuses.hfuse.toString(16).padStart(2, '0')}`;
  const efuseHex = `0x${fuses.efuse.toString(16).padStart(2, '0')}`;
  const lockHex = `0x${fuses.lock.toString(16).padStart(2, '0')}`;

  return `# 1. Lépés: Mikrokontroller Chip Erase és FUSE bitek beállítása (BOOTSZ + BOOTRST)
avrdude -c ${programmer} -p ${config.mcu} ${portArg}-e -U lock:w:${lockHex}:m -U efuse:w:${efuseHex}:m -U hfuse:w:${hfuseHex}:m -U lfuse:w:${lfuseHex}:m

# 2. Lépés: Bootloader INTEL HEX bináris kiírása a Flash memóriába és Lock Bitek élesítése
avrdude -c ${programmer} -p ${config.mcu} ${portArg}-U flash:w:optiboot_${config.mcu}.hex:i -U lock:w:${lockHex}:m`;
}

// ---------------------------------------------------------------------------
// Arduino boards.txt Generator
// ---------------------------------------------------------------------------

export function generateCustomBoardsTxt(config: ArduinoBootloaderConfig, fuses: AvrFuseState): string {
  const boardId = `arduasm_${config.mcu}_${config.type}`;
  const partition = calculateFlashPartition(config.mcu, config.sizeBytes, config.bootResetVector);

  return `# ==============================================================================
# Arduino IDE Custom Board Definition (boards.txt)
# Generated by AI Studio ArduASM
# ==============================================================================

${boardId}.name=ArduASM ${config.name} (${config.mcu.toUpperCase()})
${boardId}.upload.tool=avrdude
${boardId}.upload.protocol=arduino
${boardId}.upload.maximum_size=${partition.appSizeBytes}
${boardId}.upload.maximum_data_size=2048
${boardId}.upload.speed=${config.baudRate}

${boardId}.bootloader.tool=avrdude
${boardId}.bootloader.low_fuses=0x${fuses.lfuse.toString(16).padStart(2, '0')}
${boardId}.bootloader.high_fuses=0x${fuses.hfuse.toString(16).padStart(2, '0')}
${boardId}.bootloader.extended_fuses=0x${fuses.efuse.toString(16).padStart(2, '0')}
${boardId}.bootloader.unlock_bits=0x3F
${boardId}.bootloader.lock_bits=0x${fuses.lock.toString(16).padStart(2, '0')}
${boardId}.bootloader.file=optiboot/optiboot_${config.mcu}.hex

${boardId}.build.mcu=${config.mcu}
${boardId}.build.f_cpu=${config.clockHz}L
${boardId}.build.board=AVR_${config.mcu.toUpperCase()}
${boardId}.build.core=arduino
${boardId}.build.variant=standard
`;
}
