/**
 * AVR Microcontroller FUSE Bits & Lock Bits Engine
 * Precise bit-level calculator, hazard analyzer, preset bank, and avrdude command generator.
 * (c) 2026 AI Studio ArduASM
 */

import { AvrFuseState, AvrFusePreset, AvrMcuFuseType } from '../types';

export interface FuseBitInfo {
  bit: number;
  name: string;
  labelHu: string;
  descHu: string;
  defaultVal: 0 | 1; // 0 = programmed, 1 = unprogrammed
  isCritical?: boolean;
  warningHu?: string;
}

export interface McuFuseDescriptor {
  id: AvrMcuFuseType;
  name: string;
  signature: string;
  flashSizeKb: number;
  eepromSizeBytes: number;
  defaultLfuse: number;
  defaultHfuse: number;
  defaultEfuse: number;
  defaultLock: number;
  efuseMask: number; // e.g. 0x07 for ATmega328P (only bits 0-2 active)
  hasExtendedFuse: boolean;
  lowBits: FuseBitInfo[];
  highBits: FuseBitInfo[];
  extBits: FuseBitInfo[];
  lockBits: FuseBitInfo[];
}

export interface ClockSourceOption {
  value: number; // CKSEL3..0 (0-15)
  sutValue?: number; // SUT1..0 (0-3)
  label: string;
  description: string;
  freqRange: string;
  startupTime: string;
  recommendedFor: string;
}

export interface BodLevelOption {
  value: number; // BODLEVEL bits
  label: string;
  volts: string;
  description: string;
  recommendedFor: string;
}

export interface BootSizeOption {
  value: number; // BOOTSZ1..0 (0-3)
  words: number;
  bytes: number;
  addressHex: string;
  label: string;
}

export interface SafetyHazard {
  id: string;
  severity: 'danger' | 'warning' | 'info';
  title: string;
  message: string;
  remedy?: string;
  affectedFuse: 'lfuse' | 'hfuse' | 'efuse' | 'lock';
}

// -------------------------------------------------------------
// AVR Microcontroller Hardware Database
// -------------------------------------------------------------

export const AVR_MCU_DESCRIPTORS: Record<AvrMcuFuseType, McuFuseDescriptor> = {
  atmega328p: {
    id: 'atmega328p',
    name: 'ATmega328P (Arduino Uno / Nano / Pro Mini)',
    signature: '0x1E 0x95 0x0F',
    flashSizeKb: 32,
    eepromSizeBytes: 1024,
    defaultLfuse: 0xff,
    defaultHfuse: 0xde,
    defaultEfuse: 0xfd,
    defaultLock: 0x0f,
    efuseMask: 0x07, // bits 0, 1, 2
    hasExtendedFuse: true,
    lowBits: [
      { bit: 7, name: 'CKDIV8', labelHu: 'Órajel osztása 8-cal', descHu: 'Belső 8x-os előosztó bekapcsolása (1=Kikapcsolva, 0=Bekapcsolva).', defaultVal: 1 },
      { bit: 6, name: 'CKOUT', labelHu: 'Órajel kivezetése PB0-ra', descHu: 'A rendszer órajelének megjelenítése a PB0 (CLKO / D8) kivezetésen.', defaultVal: 1 },
      { bit: 5, name: 'SUT1', labelHu: 'Indítási idő 1. bit', descHu: 'Start-Up Time várakozási ciklusok beállítása tápfeszültség bekapcsoláskor.', defaultVal: 1 },
      { bit: 4, name: 'SUT0', labelHu: 'Indítási idő 0. bit', descHu: 'Start-Up Time várakozási ciklusok beállítása tápfeszültség bekapcsoláskor.', defaultVal: 1 },
      { bit: 3, name: 'CKSEL3', labelHu: 'Órajelforrás 3. bit', descHu: 'Oszcillátor típus és frekvencia tartomány kiválasztása.', defaultVal: 1 },
      { bit: 2, name: 'CKSEL2', labelHu: 'Órajelforrás 2. bit', descHu: 'Oszcillátor típus és frekvencia tartomány kiválasztása.', defaultVal: 1 },
      { bit: 1, name: 'CKSEL1', labelHu: 'Órajelforrás 1. bit', descHu: 'Oszcillátor típus és frekvencia tartomány kiválasztása.', defaultVal: 1 },
      { bit: 0, name: 'CKSEL0', labelHu: 'Órajelforrás 0. bit', descHu: 'Oszcillátor típus és frekvencia tartomány kiválasztása.', defaultVal: 1 },
    ],
    highBits: [
      {
        bit: 7,
        name: 'RSTDISBL',
        labelHu: 'RESET Láb Kikapcsolása (PC6 IO)',
        descHu: 'Kikapcsolja a hardveres RESET funkciót (PC6 általános I/O láb lesz). FIGYELEM: Letiltja az ISP programozást, csak 12V-os HVPP élesztővel állítható vissza!',
        defaultVal: 1,
        isCritical: true,
        warningHu: 'KRITIKUS VESZÉLY: A RESET láb kikapcsolásával a mikrokontroller normál USBasp/Arduino ISP programozóval téglásodik (bricked)!',
      },
      { bit: 6, name: 'DWEN', labelHu: 'debugWIRE Engedélyezése', descHu: '1-vezetékes debugWIRE hibakereső interfész aktiválása a RESET lábon.', defaultVal: 1 },
      {
        bit: 5,
        name: 'SPIEN',
        labelHu: 'Soros ISP Programozás Engedélyezése',
        descHu: 'Soros periféria interfész (MOSI, MISO, SCK) alapú programozás. 0=Engedélyezve (gyári).',
        defaultVal: 0,
        isCritical: true,
        warningHu: 'Ha ezt a bitet kikapcsolod (1), az ISP programozás megszűnik működni!',
      },
      { bit: 4, name: 'WDTON', labelHu: 'Hardware Watchdog Mindig Aktív', descHu: 'A Watchdog Timer hardveresen mindig be van kapcsolva és nem tiltható szoftverből.', defaultVal: 1 },
      { bit: 3, name: 'EESAVE', labelHu: 'EEPROM Megőrzése Chip Erase során', descHu: 'Új program feltöltésekor/törlésekor az EEPROM memóriaterület nem törlődik.', defaultVal: 1 },
      { bit: 2, name: 'BOOTSZ1', labelHu: 'Bootloader Méret 1. bit', descHu: 'A bootloader terület méretének kiválasztása (512B - 4096B).', defaultVal: 1 },
      { bit: 1, name: 'BOOTSZ0', labelHu: 'Bootloader Méret 0. bit', descHu: 'A bootloader terület méretének kiválasztása (512B - 4096B).', defaultVal: 1 },
      { bit: 0, name: 'BOOTRST', labelHu: 'Bootloader Reset Vektor', descHu: '0=A reset vektor a Bootloader címre ugrik; 1=A felhasználói alkalmazás 0x0000 címén indul.', defaultVal: 0 },
    ],
    extBits: [
      { bit: 2, name: 'BODLEVEL2', labelHu: 'BOD Feszültségküszöb 2. bit', descHu: 'Brown-out feszültségfigyelő szint kiválasztása (4.3V / 2.7V / 1.8V / Tiltva).', defaultVal: 1 },
      { bit: 1, name: 'BODLEVEL1', labelHu: 'BOD Feszültségküszöb 1. bit', descHu: 'Brown-out feszültségfigyelő szint kiválasztása.', defaultVal: 0 },
      { bit: 0, name: 'BODLEVEL0', labelHu: 'BOD Feszültségküszöb 0. bit', descHu: 'Brown-out feszültségfigyelő szint kiválasztása.', defaultVal: 1 },
    ],
    lockBits: [
      { bit: 5, name: 'BLB12', labelHu: 'Bootloader Szekció Védelem 2', descHu: 'Bootloader szekció SPM/LPM írás és olvasás korlátozása.', defaultVal: 1 },
      { bit: 4, name: 'BLB11', labelHu: 'Bootloader Szekció Védelem 1', descHu: 'Bootloader szekció SPM/LPM korlátozása.', defaultVal: 1 },
      { bit: 3, name: 'BLB02', labelHu: 'Alkalmazás Szekció Védelem 2', descHu: 'Alkalmazás területének védelme a bootloaderből érkező írással/olvasással szemben.', defaultVal: 1 },
      { bit: 2, name: 'BLB01', labelHu: 'Alkalmazás Szekció Védelem 1', descHu: 'Alkalmazás területének védelme.', defaultVal: 1 },
      { bit: 1, name: 'LB2', labelHu: 'Memória Záróbit 2', descHu: 'Chip szintű kód- és EEPROM kiolvasás/újraírás hardveres védelme.', defaultVal: 1 },
      { bit: 0, name: 'LB1', labelHu: 'Memória Záróbit 1', descHu: 'Chip szintű kód- és EEPROM kiolvasás/újraírás hardveres védelme.', defaultVal: 1 },
    ],
  },

  atmega2560: {
    id: 'atmega2560',
    name: 'ATmega2560 (Arduino Mega 2560)',
    signature: '0x1E 0x98 0x01',
    flashSizeKb: 256,
    eepromSizeBytes: 4096,
    defaultLfuse: 0xff,
    defaultHfuse: 0xd8,
    defaultEfuse: 0xfd,
    defaultLock: 0x0f,
    efuseMask: 0x07,
    hasExtendedFuse: true,
    lowBits: [
      { bit: 7, name: 'CKDIV8', labelHu: 'Órajel osztása 8-cal', descHu: 'Belső 8x-os előosztó bekapcsolása.', defaultVal: 1 },
      { bit: 6, name: 'CKOUT', labelHu: 'Órajel kivezetése', descHu: 'Rendszer órajel CLKO lábon.', defaultVal: 1 },
      { bit: 5, name: 'SUT1', labelHu: 'Indítási idő 1', descHu: 'Start-Up Time.', defaultVal: 1 },
      { bit: 4, name: 'SUT0', labelHu: 'Indítási idő 0', descHu: 'Start-Up Time.', defaultVal: 1 },
      { bit: 3, name: 'CKSEL3', labelHu: 'Órajelforrás 3', descHu: 'Oszcillátor választás.', defaultVal: 1 },
      { bit: 2, name: 'CKSEL2', labelHu: 'Órajelforrás 2', descHu: 'Oszcillátor választás.', defaultVal: 1 },
      { bit: 1, name: 'CKSEL1', labelHu: 'Órajelforrás 1', descHu: 'Oszcillátor választás.', defaultVal: 1 },
      { bit: 0, name: 'CKSEL0', labelHu: 'Órajelforrás 0', descHu: 'Oszcillátor választás.', defaultVal: 1 },
    ],
    highBits: [
      { bit: 7, name: 'OCDEN', labelHu: 'On-Chip Debug Engedélyezve', descHu: 'JTAG Debugger aktív.', defaultVal: 1 },
      { bit: 6, name: 'JTAGEN', labelHu: 'JTAG Interfész Engedélyezve', descHu: 'JTAG lábak (PF4-PF7) engedélyezése.', defaultVal: 0 },
      { bit: 5, name: 'SPIEN', labelHu: 'Soros ISP Engedélyezve', descHu: 'ISP letöltés engedélyezve.', defaultVal: 0, isCritical: true },
      { bit: 4, name: 'WDTON', labelHu: 'Hardware Watchdog', descHu: 'Watchdog mindig be van kapcsolva.', defaultVal: 1 },
      { bit: 3, name: 'EESAVE', labelHu: 'EEPROM Megőrzése', descHu: 'EEPROM nem törlődik chip erasekor.', defaultVal: 1 },
      { bit: 2, name: 'BOOTSZ1', labelHu: 'Bootloader Méret 1', descHu: 'Bootloader szekció mérete (1K-8KB).', defaultVal: 1 },
      { bit: 1, name: 'BOOTSZ0', labelHu: 'Bootloader Méret 0', descHu: 'Bootloader szekció mérete.', defaultVal: 0 },
      { bit: 0, name: 'BOOTRST', labelHu: 'Bootloader Reset Vektor', descHu: 'Indulás bootloader címről.', defaultVal: 0 },
    ],
    extBits: [
      { bit: 2, name: 'BODLEVEL2', labelHu: 'BOD Szint 2', descHu: 'Brown-out küszöbfeszültség.', defaultVal: 1 },
      { bit: 1, name: 'BODLEVEL1', labelHu: 'BOD Szint 1', descHu: 'Brown-out küszöbfeszültség.', defaultVal: 0 },
      { bit: 0, name: 'BODLEVEL0', labelHu: 'BOD Szint 0', descHu: 'Brown-out küszöbfeszültség.', defaultVal: 1 },
    ],
    lockBits: [
      { bit: 5, name: 'BLB12', labelHu: 'Boot Lock 12', descHu: 'Boot szekció védelem.', defaultVal: 1 },
      { bit: 4, name: 'BLB11', labelHu: 'Boot Lock 11', descHu: 'Boot szekció védelem.', defaultVal: 1 },
      { bit: 3, name: 'BLB02', labelHu: 'App Lock 02', descHu: 'App szekció védelem.', defaultVal: 1 },
      { bit: 2, name: 'BLB01', labelHu: 'App Lock 01', descHu: 'App szekció védelem.', defaultVal: 1 },
      { bit: 1, name: 'LB2', labelHu: 'Lock Bit 2', descHu: 'Memória zár.', defaultVal: 1 },
      { bit: 0, name: 'LB1', labelHu: 'Lock Bit 1', descHu: 'Memória zár.', defaultVal: 1 },
    ],
  },

  atmega32u4: {
    id: 'atmega32u4',
    name: 'ATmega32U4 (Arduino Leonardo / Micro / Pro Micro)',
    signature: '0x1E 0x95 0x87',
    flashSizeKb: 32,
    eepromSizeBytes: 1024,
    defaultLfuse: 0xff,
    defaultHfuse: 0xd8,
    defaultEfuse: 0xcb,
    defaultLock: 0x0f,
    efuseMask: 0x0f,
    hasExtendedFuse: true,
    lowBits: [
      { bit: 7, name: 'CKDIV8', labelHu: 'Órajel osztása 8-cal', descHu: 'Előosztó.', defaultVal: 1 },
      { bit: 6, name: 'CKOUT', labelHu: 'Órajel kivezetése', descHu: 'CLKO láb.', defaultVal: 1 },
      { bit: 5, name: 'SUT1', labelHu: 'Indítási idő 1', descHu: 'Start-Up Time.', defaultVal: 1 },
      { bit: 4, name: 'SUT0', labelHu: 'Indítási idő 0', descHu: 'Start-Up Time.', defaultVal: 1 },
      { bit: 3, name: 'CKSEL3', labelHu: 'Órajel 3', descHu: 'Kristály / USB PLL.', defaultVal: 1 },
      { bit: 2, name: 'CKSEL2', labelHu: 'Órajel 2', descHu: 'Kristály / USB PLL.', defaultVal: 1 },
      { bit: 1, name: 'CKSEL1', labelHu: 'Órajel 1', descHu: 'Kristály / USB PLL.', defaultVal: 1 },
      { bit: 0, name: 'CKSEL0', labelHu: 'Órajel 0', descHu: 'Kristály / USB PLL.', defaultVal: 1 },
    ],
    highBits: [
      { bit: 7, name: 'OCDEN', labelHu: 'On-Chip Debug', descHu: 'JTAG Debugger.', defaultVal: 1 },
      { bit: 6, name: 'JTAGEN', labelHu: 'JTAG Engedélyezve', descHu: 'JTAG interfész.', defaultVal: 1 },
      { bit: 5, name: 'SPIEN', labelHu: 'Soros ISP', descHu: 'ISP programozás.', defaultVal: 0, isCritical: true },
      { bit: 4, name: 'WDTON', labelHu: 'Watchdog Always On', descHu: 'Hardveres WDT.', defaultVal: 1 },
      { bit: 3, name: 'EESAVE', labelHu: 'EEPROM Megőrzése', descHu: 'EEPROM megtartása feltöltéskor.', defaultVal: 1 },
      { bit: 2, name: 'BOOTSZ1', labelHu: 'Bootloader Méret 1', descHu: 'Caterina USB Bootloader méret (4KB).', defaultVal: 1 },
      { bit: 1, name: 'BOOTSZ0', labelHu: 'Bootloader Méret 0', descHu: 'Caterina USB Bootloader méret.', defaultVal: 0 },
      { bit: 0, name: 'BOOTRST', labelHu: 'Bootloader Reset', descHu: 'USB Bootloader indulás.', defaultVal: 0 },
    ],
    extBits: [
      { bit: 3, name: 'HWBE', labelHu: 'Hardware Boot Enable', descHu: 'HWB lábbal kényszerített USB DFU boot.', defaultVal: 0 },
      { bit: 2, name: 'BODLEVEL2', labelHu: 'BOD Szint 2', descHu: 'Brown-out szint.', defaultVal: 0 },
      { bit: 1, name: 'BODLEVEL1', labelHu: 'BOD Szint 1', descHu: 'Brown-out szint.', defaultVal: 1 },
      { bit: 0, name: 'BODLEVEL0', labelHu: 'BOD Szint 0', descHu: 'Brown-out szint.', defaultVal: 1 },
    ],
    lockBits: [
      { bit: 5, name: 'BLB12', labelHu: 'Boot Lock 12', descHu: 'Boot szekció.', defaultVal: 1 },
      { bit: 4, name: 'BLB11', labelHu: 'Boot Lock 11', descHu: 'Boot szekció.', defaultVal: 1 },
      { bit: 3, name: 'BLB02', labelHu: 'App Lock 02', descHu: 'App szekció.', defaultVal: 1 },
      { bit: 2, name: 'BLB01', labelHu: 'App Lock 01', descHu: 'App szekció.', defaultVal: 1 },
      { bit: 1, name: 'LB2', labelHu: 'Lock Bit 2', descHu: 'Memória zár.', defaultVal: 1 },
      { bit: 0, name: 'LB1', labelHu: 'Lock Bit 1', descHu: 'Memória zár.', defaultVal: 1 },
    ],
  },

  attiny85: {
    id: 'attiny85',
    name: 'ATtiny85 (Digispark / 8-lábú AVR)',
    signature: '0x1E 0x93 0x0B',
    flashSizeKb: 8,
    eepromSizeBytes: 512,
    defaultLfuse: 0x62,
    defaultHfuse: 0xdf,
    defaultEfuse: 0xff,
    defaultLock: 0xff,
    efuseMask: 0x01, // bit 0 (SELFPRGEN)
    hasExtendedFuse: true,
    lowBits: [
      { bit: 7, name: 'CKDIV8', labelHu: 'Órajel osztása 8-cal', descHu: 'Gyári 8MHz -> 1MHz.', defaultVal: 0 },
      { bit: 6, name: 'CKOUT', labelHu: 'Órajel kivezetése (PB4)', descHu: 'CLKO láb PB4-en.', defaultVal: 1 },
      { bit: 5, name: 'SUT1', labelHu: 'Indítási idő 1', descHu: 'Start-Up Time.', defaultVal: 1 },
      { bit: 4, name: 'SUT0', labelHu: 'Indítási idő 0', descHu: 'Start-Up Time.', defaultVal: 0 },
      { bit: 3, name: 'CKSEL3', labelHu: 'Órajelforrás 3 (PLL)', descHu: 'Belső 64MHz PLL / 8MHz RC / Kristály.', defaultVal: 0 },
      { bit: 2, name: 'CKSEL2', labelHu: 'Órajelforrás 2', descHu: 'Oszcillátor választás.', defaultVal: 0 },
      { bit: 1, name: 'CKSEL1', labelHu: 'Órajelforrás 1', descHu: 'Oszcillátor választás.', defaultVal: 1 },
      { bit: 0, name: 'CKSEL0', labelHu: 'Órajelforrás 0', descHu: 'Oszcillátor választás.', defaultVal: 0 },
    ],
    highBits: [
      {
        bit: 7,
        name: 'RSTDISBL',
        labelHu: 'RESET Láb Kikapcsolása (PB5 IO)',
        descHu: 'PB5 általános I/O lábként használható, de letiltja a normál ISP programozást!',
        defaultVal: 1,
        isCritical: true,
        warningHu: 'FIGYELEM: Digispark esetén szükséges a 6. lábhoz, de csak High Voltage programmerrel újraprogramozható!',
      },
      { bit: 6, name: 'DWEN', labelHu: 'debugWIRE Engedélyezve', descHu: '1-vezetékes debug.', defaultVal: 1 },
      { bit: 5, name: 'SPIEN', labelHu: 'Soros ISP Engedélyezve', descHu: 'ISP programozás.', defaultVal: 0, isCritical: true },
      { bit: 4, name: 'WDTON', labelHu: 'Watchdog Always On', descHu: 'Hardveres WDT.', defaultVal: 1 },
      { bit: 3, name: 'EESAVE', labelHu: 'EEPROM Megőrzése', descHu: 'EEPROM megőrzés.', defaultVal: 1 },
      { bit: 2, name: 'BODLEVEL2', labelHu: 'BOD Szint 2', descHu: 'Brown-out detector bit 2.', defaultVal: 1 },
      { bit: 1, name: 'BODLEVEL1', labelHu: 'BOD Szint 1', descHu: 'Brown-out detector bit 1.', defaultVal: 1 },
      { bit: 0, name: 'BODLEVEL0', labelHu: 'BOD Szint 0', descHu: 'Brown-out detector bit 0.', defaultVal: 1 },
    ],
    extBits: [
      { bit: 0, name: 'SELFPRGEN', labelHu: 'Önprogramozás Engedélyezve (SPM)', descHu: 'Flash önprogramozás az alkalmazásból (Micronucleus USB Bootloaderhez).', defaultVal: 1 },
    ],
    lockBits: [
      { bit: 1, name: 'LB2', labelHu: 'Memória Záróbit 2', descHu: 'Flash és EEPROM védelem.', defaultVal: 1 },
      { bit: 0, name: 'LB1', labelHu: 'Memória Záróbit 1', descHu: 'Flash és EEPROM védelem.', defaultVal: 1 },
    ],
  },

  atmega168: {
    id: 'atmega168',
    name: 'ATmega168 (Arduino Nano v2 / Pro Mini)',
    signature: '0x1E 0x94 0x06',
    flashSizeKb: 16,
    eepromSizeBytes: 512,
    defaultLfuse: 0xff,
    defaultHfuse: 0xdd,
    defaultEfuse: 0xf9,
    defaultLock: 0x0f,
    efuseMask: 0x07,
    hasExtendedFuse: true,
    lowBits: [
      { bit: 7, name: 'CKDIV8', labelHu: 'Órajel osztása 8-cal', descHu: 'Előosztó.', defaultVal: 1 },
      { bit: 6, name: 'CKOUT', labelHu: 'Órajel kivezetése', descHu: 'CLKO kivezetés.', defaultVal: 1 },
      { bit: 5, name: 'SUT1', labelHu: 'Indítási idő 1', descHu: 'Start-Up Time.', defaultVal: 1 },
      { bit: 4, name: 'SUT0', labelHu: 'Indítási idő 0', descHu: 'Start-Up Time.', defaultVal: 1 },
      { bit: 3, name: 'CKSEL3', labelHu: 'Órajel 3', descHu: 'Oszcillátor.', defaultVal: 1 },
      { bit: 2, name: 'CKSEL2', labelHu: 'Órajel 2', descHu: 'Oszcillátor.', defaultVal: 1 },
      { bit: 1, name: 'CKSEL1', labelHu: 'Órajel 1', descHu: 'Oszcillátor.', defaultVal: 1 },
      { bit: 0, name: 'CKSEL0', labelHu: 'Órajel 0', descHu: 'Oszcillátor.', defaultVal: 1 },
    ],
    highBits: [
      { bit: 7, name: 'RSTDISBL', labelHu: 'RESET Kikapcsolása', descHu: 'Reset tiltás.', defaultVal: 1, isCritical: true },
      { bit: 6, name: 'DWEN', labelHu: 'debugWIRE', descHu: 'debugWIRE.', defaultVal: 1 },
      { bit: 5, name: 'SPIEN', labelHu: 'Soros ISP', descHu: 'ISP programozás.', defaultVal: 0, isCritical: true },
      { bit: 4, name: 'WDTON', labelHu: 'Watchdog Mindig Aktív', descHu: 'Hardveres WDT.', defaultVal: 1 },
      { bit: 3, name: 'EESAVE', labelHu: 'EEPROM Megőrzése', descHu: 'EEPROM nem törlődik.', defaultVal: 1 },
      { bit: 2, name: 'BOOTSZ1', labelHu: 'Bootloader Méret 1', descHu: 'Bootloader méret.', defaultVal: 1 },
      { bit: 1, name: 'BOOTSZ0', labelHu: 'Bootloader Méret 0', descHu: 'Bootloader méret.', defaultVal: 0 },
      { bit: 0, name: 'BOOTRST', labelHu: 'Bootloader Reset', descHu: 'Indulás bootloaderről.', defaultVal: 1 },
    ],
    extBits: [
      { bit: 2, name: 'BODLEVEL2', labelHu: 'BOD Szint 2', descHu: 'Brown-out szint.', defaultVal: 0 },
      { bit: 1, name: 'BODLEVEL1', labelHu: 'BOD Szint 1', descHu: 'Brown-out szint.', defaultVal: 0 },
      { bit: 0, name: 'BODLEVEL0', labelHu: 'BOD Szint 0', descHu: 'Brown-out szint.', defaultVal: 1 },
    ],
    lockBits: [
      { bit: 5, name: 'BLB12', labelHu: 'Boot Lock 12', descHu: 'Boot védelem.', defaultVal: 1 },
      { bit: 4, name: 'BLB11', labelHu: 'Boot Lock 11', descHu: 'Boot védelem.', defaultVal: 1 },
      { bit: 3, name: 'BLB02', labelHu: 'App Lock 02', descHu: 'App védelem.', defaultVal: 1 },
      { bit: 2, name: 'BLB01', labelHu: 'App Lock 01', descHu: 'App védelem.', defaultVal: 1 },
      { bit: 1, name: 'LB2', labelHu: 'Lock Bit 2', descHu: 'Záróbit 2.', defaultVal: 1 },
      { bit: 0, name: 'LB1', labelHu: 'Lock Bit 1', descHu: 'Záróbit 1.', defaultVal: 1 },
    ],
  },

  atmega8: {
    id: 'atmega8',
    name: 'ATmega8 / ATmega8A (Klasszikus 8KB AVR)',
    signature: '0x1E 0x93 0x07',
    flashSizeKb: 8,
    eepromSizeBytes: 512,
    defaultLfuse: 0xe1,
    defaultHfuse: 0xd9,
    defaultEfuse: 0xff,
    defaultLock: 0x0f,
    efuseMask: 0x00,
    hasExtendedFuse: false,
    lowBits: [
      { bit: 7, name: 'BODLEVEL', labelHu: 'BOD Szint (1=2.7V, 0=4.0V)', descHu: 'Brown-out szint.', defaultVal: 1 },
      { bit: 6, name: 'BODEN', labelHu: 'BOD Engedélyezése (0=Aktív)', descHu: 'Brown-out detector.', defaultVal: 1 },
      { bit: 5, name: 'SUT1', labelHu: 'Indítási idő 1', descHu: 'Start-Up Time.', defaultVal: 1 },
      { bit: 4, name: 'SUT0', labelHu: 'Indítási idő 0', descHu: 'Start-Up Time.', defaultVal: 0 },
      { bit: 3, name: 'CKSEL3', labelHu: 'Órajel 3', descHu: 'Oszcillátor.', defaultVal: 0 },
      { bit: 2, name: 'CKSEL2', labelHu: 'Órajel 2', descHu: 'Oszcillátor.', defaultVal: 0 },
      { bit: 1, name: 'CKSEL1', labelHu: 'Órajel 1', descHu: 'Oszcillátor.', defaultVal: 0 },
      { bit: 0, name: 'CKSEL0', labelHu: 'Órajel 0', descHu: 'Oszcillátor.', defaultVal: 1 },
    ],
    highBits: [
      { bit: 7, name: 'RSTDISBL', labelHu: 'RESET Kikapcsolása', descHu: 'Reset tiltás.', defaultVal: 1, isCritical: true },
      { bit: 6, name: 'WDTON', labelHu: 'Watchdog Mindig Be', descHu: 'WDT Always On.', defaultVal: 1 },
      { bit: 5, name: 'SPIEN', labelHu: 'Soros ISP', descHu: 'ISP engedélyezve.', defaultVal: 0, isCritical: true },
      { bit: 4, name: 'CKOPT', labelHu: 'Full-Swing Oszcillátor Mód', descHu: '0=Nagy amplitúdójú zajvédett órajel.', defaultVal: 1 },
      { bit: 3, name: 'EESAVE', labelHu: 'EEPROM Megőrzése', descHu: 'EEPROM megtartása feltöltéskor.', defaultVal: 1 },
      { bit: 2, name: 'BOOTSZ1', labelHu: 'Bootloader Méret 1', descHu: 'Bootloader méret.', defaultVal: 0 },
      { bit: 1, name: 'BOOTSZ0', labelHu: 'Bootloader Méret 0', descHu: 'Bootloader méret.', defaultVal: 0 },
      { bit: 0, name: 'BOOTRST', labelHu: 'Bootloader Reset', descHu: 'Bootloader indulás.', defaultVal: 1 },
    ],
    extBits: [],
    lockBits: [
      { bit: 5, name: 'BLB12', labelHu: 'Boot Lock 12', descHu: 'Boot védelem.', defaultVal: 1 },
      { bit: 4, name: 'BLB11', labelHu: 'Boot Lock 11', descHu: 'Boot védelem.', defaultVal: 1 },
      { bit: 3, name: 'BLB02', labelHu: 'App Lock 02', descHu: 'App védelem.', defaultVal: 1 },
      { bit: 2, name: 'BLB01', labelHu: 'App Lock 01', descHu: 'App védelem.', defaultVal: 1 },
      { bit: 1, name: 'LB2', labelHu: 'Lock Bit 2', descHu: 'Záróbit 2.', defaultVal: 1 },
      { bit: 0, name: 'LB1', labelHu: 'Lock Bit 1', descHu: 'Záróbit 1.', defaultVal: 1 },
    ],
  },
};

// -------------------------------------------------------------
// Clock Source Options (for ATmega328P / Arduino Uno)
// -------------------------------------------------------------

export const ATMEGA328P_CLOCK_OPTIONS: ClockSourceOption[] = [
  {
    value: 0x0f, // 1111
    label: 'Külső Alacsony Fogyasztású Kristály (Low Power Crystal)',
    description: 'Külső 8.0 - 16.0 MHz kvarckristály két 22pF kondenzátorral. (Standard Arduino Uno / Nano konfiguráció)',
    freqRange: '8.0 - 16.0 MHz',
    startupTime: '16K CK + 65ms (Slowly rising power)',
    recommendedFor: 'Arduino Uno / Nano 16MHz standard',
  },
  {
    value: 0x07, // 0111
    label: 'Külső Teljes Lengésű Kristály (Full Swing Crystal)',
    description: 'Nagy feszültséglengésű, zajos ipari környezetbe és 16-20 MHz túlhajtáshoz javasolt kristály oszcillátor.',
    freqRange: '0.4 - 20.0 MHz',
    startupTime: '16K CK + 65ms',
    recommendedFor: 'Ipari zajvédelem, 20MHz túlhajtás',
  },
  {
    value: 0x02, // 0010
    label: 'Kalibrált Belső 8.0 MHz RC Oszcillátor',
    description: 'Nem igényel külső alkatrészt. CKDIV8 bit nélkül 8 MHz-en, CKDIV8 bittel 1 MHz-en fut.',
    freqRange: '8.0 MHz (±10% / ±1% OSCCAL)',
    startupTime: '6 CK + 14CK + 65ms',
    recommendedFor: 'Kristály nélküli próbapanel, önálló chip',
  },
  {
    value: 0x03, // 0011
    label: 'Belső Ultra Alacsony Fogyasztású 128 kHz RC',
    description: 'Belső 128 kHz-es oszcillátor extrém energiatakarékos és akkumulátoros alkalmazásokhoz.',
    freqRange: '128 kHz',
    startupTime: '6 CK + 14CK + 65ms',
    recommendedFor: 'Mikroamperes napelemes és gombelemes eszközök',
  },
  {
    value: 0x00, // 0000
    label: 'Külső Órajel Generátor (External Clock on XTAL1)',
    description: 'Külső aktív TTL/CMOS oszcillátormodul, vagy másik mikrokontroller által biztosított órajel.',
    freqRange: '0 - 20.0 MHz',
    startupTime: '6 CK + 14CK + 65ms',
    recommendedFor: 'Közös órajelű többchipes rendszerek',
  },
];

// -------------------------------------------------------------
// BOD Level Options (ATmega328P)
// -------------------------------------------------------------

export const ATMEGA328P_BOD_OPTIONS: BodLevelOption[] = [
  {
    value: 0x07, // 111
    label: 'Kikapcsolva (BOD Disabled)',
    volts: 'Nincs védelem',
    description: 'A mikrokontroller nem figyeli a tápfeszültség esését. Maximális energiamegtakarítás.',
    recommendedFor: 'Gombelemes / ultra low-power projektek',
  },
  {
    value: 0x06, // 110
    label: '1.8 Volt Küszöbszint',
    volts: '1.8V (Typ. 1.7 - 2.0V)',
    description: 'Alacsony feszültségű (1.8V - 3.3V) és max 4-8 MHz-es működéshez biztonságos.',
    recommendedFor: '2x AA ceruzaelem / 3V gombelem',
  },
  {
    value: 0x05, // 101
    label: '2.7 Volt Küszöbszint',
    volts: '2.7V (Typ. 2.5 - 2.9V)',
    description: 'Standard 3.3V-os rendszerekhez és Li-Ion akkumulátorokhoz (Arduino Pro Mini 3.3V / Uno gyári).',
    recommendedFor: 'Arduino Uno / Pro Mini 3.3V',
  },
  {
    value: 0x04, // 100
    label: '4.3 Volt Küszöbszint',
    volts: '4.3V (Typ. 4.1 - 4.5V)',
    description: 'Maximális biztonság 5.0V-os 16 MHz rendszerekhez. Megakadályozza a flash/EEPROM korrupciót tápkieséskor.',
    recommendedFor: 'Ipari 5V 16MHz és autóelektronika',
  },
];

// -------------------------------------------------------------
// Bootloader Size Options (ATmega328P)
// -------------------------------------------------------------

export const ATMEGA328P_BOOT_SIZES: BootSizeOption[] = [
  {
    value: 0x03, // 11
    words: 256,
    bytes: 512,
    addressHex: '0x3F00 (Szó: 0x7E00)',
    label: '256 Szó (512 Bájt) - Optiboot Standard (Arduino Uno R3)',
  },
  {
    value: 0x02, // 10
    words: 512,
    bytes: 1024,
    addressHex: '0x3E00 (Szó: 0x7C00)',
    label: '512 Szó (1024 Bájt) - Klasszikus Arduino Bootloader',
  },
  {
    value: 0x01, // 01
    words: 1024,
    bytes: 2048,
    addressHex: '0x3C00 (Szó: 0x7800)',
    label: '1024 Szó (2048 Bájt) - Bővített hálózati/SD Bootloader',
  },
  {
    value: 0x00, // 00
    words: 2048,
    bytes: 4096,
    addressHex: '0x3800 (Szó: 0x7000)',
    label: '2048 Szó (4096 Bájt) - Nagy USB / AES Bootloader',
  },
];

// -------------------------------------------------------------
// Preset Configurations Bank
// -------------------------------------------------------------

export const AVR_FUSE_PRESETS: AvrFusePreset[] = [
  {
    id: 'arduino-uno-optiboot',
    name: 'Arduino Uno R3 (Optiboot 16MHz)',
    description: 'Hivatalos Arduino Uno gyári beállítás: 16 MHz külső kristály, 2.7V BOD, 512 bájt Optiboot bootloader, ISP engedélyezve.',
    category: 'arduino',
    mcu: 'atmega328p',
    lfuse: 0xff,
    hfuse: 0xde,
    efuse: 0xfd,
    lock: 0x0f,
    tags: ['Uno', '16MHz', 'Optiboot', 'Standard'],
  },
  {
    id: 'arduino-uno-4v3-bod',
    name: 'Arduino Uno (Robusztus 4.3V BOD)',
    description: 'Maximális flash-korrupció elleni védelem: 16 MHz kristály, 4.3V feszültségfigyelő, 512B Optiboot.',
    category: 'arduino',
    mcu: 'atmega328p',
    lfuse: 0xff,
    hfuse: 0xde,
    efuse: 0x05,
    lock: 0x0f,
    tags: ['Uno', 'Biztonságos', '4.3V BOD'],
  },
  {
    id: 'arduino-nano-pro-mini-16m',
    name: 'Arduino Nano / Pro Mini 5V (16 MHz)',
    description: 'Klasszikus Arduino Nano v3 / Pro Mini: 16 MHz kristály, 1024B ATmegaBoot bootloader, 2.7V BOD.',
    category: 'arduino',
    mcu: 'atmega328p',
    lfuse: 0xff,
    hfuse: 0xda,
    efuse: 0xfd,
    lock: 0x0f,
    tags: ['Nano', 'Pro Mini', '5V', '16MHz'],
  },
  {
    id: 'arduino-promini-8m-3v3',
    name: 'Arduino Pro Mini 3.3V (8 MHz)',
    description: '3.3V-os alacsony feszültségű Pro Mini: 8 MHz külső rezonátor, 1.8V BOD, 1024B bootloader.',
    category: 'arduino',
    mcu: 'atmega328p',
    lfuse: 0xff,
    hfuse: 0xda,
    efuse: 0xfe,
    lock: 0x0f,
    tags: ['Pro Mini', '3.3V', '8MHz', 'Li-Ion'],
  },
  {
    id: 'breadboard-internal-8mhz',
    name: 'Önálló ATmega328P (Belső 8 MHz RC, Kristály Nélkül)',
    description: 'Próbapados használathoz: Nincs szükség külső kvarcra és kondenzátorokra! Belső 8 MHz, 2.7V BOD, azonnali indulás a 0x0000 címről.',
    category: 'custom',
    mcu: 'atmega328p',
    lfuse: 0xe2,
    hfuse: 0xda,
    efuse: 0xfd,
    lock: 0x0f,
    tags: ['Breadboard', 'Belső 8MHz', 'No Crystal'],
  },
  {
    id: 'ultra-low-power-1mhz',
    name: 'Ultra Alacsony Fogyasztás (Belső 1 MHz, Nincs BOD)',
    description: 'Napelemes és gombelemes működés: Belső 8 MHz osztva 8-cal (1.0 MHz órajel), kikapcsolt BOD (~15 µA áramfelvétel).',
    category: 'lowpower',
    mcu: 'atmega328p',
    lfuse: 0x62,
    hfuse: 0xd9,
    efuse: 0xff,
    lock: 0x0f,
    tags: ['Low Power', '1MHz', 'Battery', '15uA'],
  },
  {
    id: 'factory-default-raw',
    name: 'Gyári Atmel/Microchip Nyers Állapot',
    description: 'Közvetlenül a gyártósorról érkező új chip alapértelmezése: 1 MHz belső RC (8MHz / 8), BOD kikapcsolva, Lock záratlan.',
    category: 'factory',
    mcu: 'atmega328p',
    lfuse: 0x62,
    hfuse: 0xd9,
    efuse: 0xff,
    lock: 0xff,
    tags: ['Gyári', 'Alapértelmezett', 'Nyers Chip'],
  },
  {
    id: 'industrial-secure-locked',
    name: 'Ipari IP Védelem (Lezárt Flash & EEPROM)',
    description: 'Szellemi tulajdon és firmware lopás elleni védelem: Lock Mode 3 (a Flash és EEPROM kiolvasása és visszafejtése hardveresen letiltva).',
    category: 'security',
    mcu: 'atmega328p',
    lfuse: 0xff,
    hfuse: 0xde,
    efuse: 0xfd,
    lock: 0x00,
    tags: ['Zárolt', 'Másolásvédett', 'Security'],
  },
  {
    id: 'mega-2560-standard',
    name: 'Arduino Mega 2560 Gyári',
    description: 'ATmega2560 16MHz külső kristály, 8KB Bootloader (STK500v2), JTAG engedélyezve, 2.7V BOD.',
    category: 'arduino',
    mcu: 'atmega2560',
    lfuse: 0xff,
    hfuse: 0xd8,
    efuse: 0xfd,
    lock: 0x0f,
    tags: ['Mega2560', '16MHz', 'JTAG'],
  },
  {
    id: 'digispark-attiny85',
    name: 'Digispark ATtiny85 (16 MHz PLL)',
    description: 'Micronucleus USB bootloaderhez: 16 MHz belső PLL órajel, RSTDISBL tiltva (PB5 I/O engedélyezve).',
    category: 'arduino',
    mcu: 'attiny85',
    lfuse: 0xe1,
    hfuse: 0x5d,
    efuse: 0xfe,
    lock: 0xff,
    tags: ['Digispark', 'ATtiny85', 'USB'],
  },
];

// -------------------------------------------------------------
// Helper Functions: Bit manipulation & Formatting
// -------------------------------------------------------------

export function formatHexByte(val: number): string {
  const clamped = (val & 0xff);
  return '0x' + clamped.toString(16).toUpperCase().padStart(2, '0');
}

export function formatBinByte(val: number): string {
  const clamped = (val & 0xff);
  return '0b' + clamped.toString(2).padStart(8, '0');
}

export function getBit(byteVal: number, bitIndex: number): 0 | 1 {
  return ((byteVal >> bitIndex) & 1) as 0 | 1;
}

export function setBit(byteVal: number, bitIndex: number, newBit: 0 | 1): number {
  if (newBit === 1) {
    return (byteVal | (1 << bitIndex)) & 0xff;
  } else {
    return (byteVal & ~(1 << bitIndex)) & 0xff;
  }
}

export function toggleBit(byteVal: number, bitIndex: number): number {
  return (byteVal ^ (1 << bitIndex)) & 0xff;
}

// -------------------------------------------------------------
// Safety & Hazard Analyzer
// -------------------------------------------------------------

export function analyzeFuseHazards(fuseState: AvrFuseState): SafetyHazard[] {
  const hazards: SafetyHazard[] = [];
  const desc = AVR_MCU_DESCRIPTORS[fuseState.mcu] || AVR_MCU_DESCRIPTORS.atmega328p;

  const lfuse = fuseState.lfuse & 0xff;
  const hfuse = fuseState.hfuse & 0xff;
  const efuse = fuseState.efuse & 0xff;
  const lock = fuseState.lock & 0xff;

  // 1. KRITIKUS: RSTDISBL (bit 7 of hfuse for 328p/tiny85)
  if (fuseState.mcu === 'atmega328p' || fuseState.mcu === 'atmega168' || fuseState.mcu === 'attiny85' || fuseState.mcu === 'atmega8') {
    const rstdisbl = getBit(hfuse, 7);
    if (rstdisbl === 0) {
      hazards.push({
        id: 'hazard-rstdisbl',
        severity: 'danger',
        title: 'KRITIKUS: Hardveres RESET Kikapcsolva (RSTDISBL = 0)',
        message: 'A mikrokontroller külső RESET funkciója ki van kapcsolva! Ezzel az ISP (USBasp, Arduino as ISP) programozás TÖBBÉ NEM FOG MŰKÖDNI. Csak 12V-os High Voltage párhuzamos/soros élesztővel (HVPP/HVSP) állítható vissza!',
        remedy: 'Kapcsold vissza a RSTDISBL bitet 1-re (Unprogrammed), kivéve ha szándékosan extra I/O lábként használod a RESET-et és rendelkezel HV programozóval.',
        affectedFuse: 'hfuse',
      });
    }
  }

  // 2. KRITIKUS: SPIEN (bit 5 of hfuse)
  const spien = getBit(hfuse, 5);
  if (spien === 1) {
    hazards.push({
      id: 'hazard-spien',
      severity: 'danger',
      title: 'VESZÉLY: Soros ISP Letöltés Letiltva (SPIEN = 1)',
      message: 'A soros programozási interfész letiltásra került. Normál USBasp / Arduino ISP programozóval nem lehet új programot letölteni.',
      remedy: 'Állítsd a SPIEN bitet 0-ra (Programmed / Alapértelmezett).',
      affectedFuse: 'hfuse',
    });
  }

  // 3. ÓRAJEL HAZARD (CKSEL = External Crystal when running on breadboard)
  if (fuseState.mcu === 'atmega328p') {
    const cksel = lfuse & 0x0f;
    const isExtCrystal = cksel >= 0x08 || cksel === 0x07 || cksel === 0x06;
    if (isExtCrystal) {
      hazards.push({
        id: 'hazard-clock-crystal',
        severity: 'info',
        title: 'Külső Kvarckristály Szükséges (16 MHz XTAL1 / XTAL2)',
        message: 'A konfiguráció külső kvarckristályt és 2x 22pF hidegítő kondenzátort igényel a rezgéshez. Ha a chip próbapanelen van kristály nélkül, leáll és nem válaszol az ISP parancsokra.',
        remedy: 'Ha kristály nélkül tesztelsz, válaszd a "Kalibrált Belső 8.0 MHz RC" beállítást (lfuse: 0xE2).',
        affectedFuse: 'lfuse',
      });
    }

    // 4. CKDIV8 bit active (Clock divided by 8)
    const ckdiv8 = getBit(lfuse, 7);
    if (ckdiv8 === 0) {
      hazards.push({
        id: 'hazard-ckdiv8',
        severity: 'warning',
        title: 'Belső Órajel Osztás Aktív (CKDIV8 = 0)',
        message: 'A rendszer órajele 8-cal osztva fut (pl. 16 MHz helyett 2 MHz, vagy 8 MHz helyett 1 MHz). Az időzítések (delay, millis, UART baud-rate) 8x lassabbak lesznek, hacline a szoftverben nem állítod a F_CPU-t!',
        remedy: 'Ha standard sebességre vágysz, állítsd a CKDIV8 bitet 1-re (Unprogrammed).',
        affectedFuse: 'lfuse',
      });
    }

    // 5. BODLEVEL on 16MHz
    const bodlevel = efuse & 0x07;
    if (isExtCrystal && bodlevel === 0x07) {
      hazards.push({
        id: 'hazard-no-bod',
        severity: 'warning',
        title: 'Nincs Brown-out Védelem 16 MHz-en (BOD Disabled)',
        message: '16 MHz-es órajelen a tápfeszültség 4.5V alá esésekor a mikrokontroller utasításokat téveszthet vagy felülírhatja a Flash memóriát.',
        remedy: 'Állítsd a BOD szintet 2.7V-ra (0xFD) vagy 4.3V-ra (0x05 / 0xFC).',
        affectedFuse: 'efuse',
      });
    }

    // 6. WDTON Always On
    const wdton = getBit(hfuse, 4);
    if (wdton === 0) {
      hazards.push({
        id: 'hazard-wdton',
        severity: 'warning',
        title: 'Hardveres Watchdog Mindig Bekapcsolva (WDTON = 0)',
        message: 'A Watchdog időzítő azonnal elindul bekapcsoláskor a legkisebb időközzel. Ha a program nem hívja a wdt_reset() utasítást a bootloaderben/főprogramban, a chip végtelen Reset ciklusba kerülhet!',
        remedy: 'Hagyd a WDTON bitet 1-en, ha szoftverből szeretnéd vezérelni a Watchdogot.',
        affectedFuse: 'hfuse',
      });
    }

    // 7. Lock bits active
    const lb = lock & 0x03;
    if (lb !== 0x03) {
      hazards.push({
        id: 'hazard-lock',
        severity: 'info',
        title: 'Memória Másolásvédelmi Zár Aktív (Lock Bits)',
        message: 'A Flash és EEPROM memóriák kiolvasása vagy módosítása korlátozott. Új firmware csak a teljes chip törlésével (Chip Erase -e kapcsolóval) tölthető fel.',
        remedy: 'Fejlesztési fázisban ajánlott a 0xFF vagy 0x0F (Nyitott) beállítás.',
        affectedFuse: 'lock',
      });
    }
  }

  return hazards;
}

// -------------------------------------------------------------
// Clock Tree Visualizer & Real-time Peripheral Frequency Engine
// -------------------------------------------------------------

export interface TimerPrescalerCalc {
  div: number;
  freqFormatted: string;
  periodFormatted: string;
}

export interface UsartBaudCalc {
  targetBaud: number;
  ubrr: number;
  actualBaud: number;
  errorPercent: number;
  isUsable: boolean;
}

export interface AdcPrescalerCalc {
  prescaler: number;
  freqHz: number;
  freqFormatted: string;
  isOptimal: boolean; // 50kHz - 200kHz range
}

export interface ClockTreeModel {
  oscillatorName: string;
  oscillatorType: 'crystal' | 'internal_rc' | 'low_power_rc' | 'external_clock' | 'rtc_crystal';
  inputFrequencyHz: number;
  inputFrequencyFormatted: string;
  prescalerActive: boolean; // CKDIV8 = 0
  prescalerRatio: 1 | 8;
  cpuFrequencyHz: number;
  cpuFrequencyFormatted: string;
  cyclePeriodNs: number;
  flashClockHz: number;
  flashClockFormatted: string;
  ioClockHz: number;
  ioClockFormatted: string;
  timerPrescalers: TimerPrescalerCalc[];
  usartBauds: UsartBaudCalc[];
  adcFrequencies: AdcPrescalerCalc[];
  wdtClockHz: number;
  wdtClockFormatted: string;
  pulseSpeedMultiplier: number; // 0.2 to 2.5 for CSS/SVG animation speed
}

export function calculateClockTree(fuseState: AvrFuseState): ClockTreeModel {
  const lfuse = fuseState.lfuse & 0xff;
  const cksel = lfuse & 0x0f;
  const ckdiv8 = getBit(lfuse, 7) === 0;

  let oscName = 'Külső 16.0 MHz Kvarckristály';
  let oscType: 'crystal' | 'internal_rc' | 'low_power_rc' | 'external_clock' | 'rtc_crystal' = 'crystal';
  let baseFreqHz = 16000000;

  if (fuseState.mcu === 'attiny85') {
    if ((cksel & 0x03) === 0x01) {
      oscName = 'Belső 64 MHz PLL Oszcillátor (16MHz Core)';
      baseFreqHz = 16000000;
      oscType = 'internal_rc';
    } else if ((cksel & 0x03) === 0x02) {
      oscName = 'Kalibrált Belső 8.0 MHz RC Oszcillátor';
      baseFreqHz = 8000000;
      oscType = 'internal_rc';
    } else {
      oscName = 'Belső 128 kHz Low-Power RC Oszcillátor';
      baseFreqHz = 128000;
      oscType = 'low_power_rc';
    }
  } else {
    // ATmega328P / ATmega2560 / ATmega168 / ATmega8
    if (cksel >= 0x06) {
      oscName = cksel === 0x07 ? 'Külső Teljes Lengésű Kristály (Full-Swing 16MHz)' : 'Külső Kvarckristály (Low Power 16.0 MHz)';
      baseFreqHz = 16000000;
      oscType = 'crystal';
    } else if (cksel === 0x02) {
      oscName = 'Kalibrált Belső 8.0 MHz RC Oszcillátor';
      baseFreqHz = 8000000;
      oscType = 'internal_rc';
    } else if (cksel === 0x03) {
      oscName = 'Belső Ultra Alacsony Fogyasztású 128 kHz RC';
      baseFreqHz = 128000;
      oscType = 'low_power_rc';
    } else if (cksel === 0x00) {
      oscName = 'Külső TTL Órajelgenerátor (XTAL1)';
      baseFreqHz = 16000000;
      oscType = 'external_clock';
    } else if (cksel === 0x04 || cksel === 0x05) {
      oscName = 'Alacsony Frekvenciás 32.768 kHz RTC Kristály';
      baseFreqHz = 32768;
      oscType = 'rtc_crystal';
    }
  }

  const prescalerRatio = ckdiv8 ? 8 : 1;
  const cpuFreqHz = Math.round(baseFreqHz / prescalerRatio);
  const cyclePeriodNs = +(1000000000 / cpuFreqHz).toFixed(2);

  const formatHz = (hz: number): string => {
    if (hz >= 1000000) {
      return (hz / 1000000).toFixed(hz % 1000000 === 0 ? 1 : 3) + ' MHz';
    } else if (hz >= 1000) {
      return (hz / 1000).toFixed(hz % 1000 === 0 ? 1 : 2) + ' kHz';
    }
    return hz.toFixed(0) + ' Hz';
  };

  const timerDivs = [1, 8, 64, 256, 1024];
  const timerPrescalers: TimerPrescalerCalc[] = timerDivs.map((div) => {
    const freq = cpuFreqHz / div;
    const periodUs = (1000000 / freq);
    return {
      div,
      freqFormatted: formatHz(freq),
      periodFormatted: periodUs >= 1000 ? (periodUs / 1000).toFixed(2) + ' ms' : periodUs.toFixed(2) + ' µs',
    };
  });

  const standardBauds = [9600, 19200, 38400, 57600, 115200, 230400];
  const usartBauds: UsartBaudCalc[] = standardBauds.map((targetBaud) => {
    // Normal speed mode: UBRR = round(F_CPU / (16 * BAUD)) - 1
    const ubrr = Math.max(0, Math.round(cpuFreqHz / (16 * targetBaud) - 1));
    const actualBaud = cpuFreqHz / (16 * (ubrr + 1));
    const errorPercent = +(((actualBaud - targetBaud) / targetBaud) * 100).toFixed(2);
    return {
      targetBaud,
      ubrr,
      actualBaud: Math.round(actualBaud),
      errorPercent,
      isUsable: Math.abs(errorPercent) <= 2.0, // standard UART tolerance is <= 2%
    };
  });

  const adcDivs = [2, 4, 8, 16, 32, 64, 128];
  const adcFrequencies: AdcPrescalerCalc[] = adcDivs.map((div) => {
    const freq = cpuFreqHz / div;
    const isOptimal = freq >= 50000 && freq <= 200000;
    return {
      prescaler: div,
      freqHz: freq,
      freqFormatted: formatHz(freq),
      isOptimal,
    };
  });

  let pulseSpeedMultiplier = 1.0;
  if (cpuFreqHz >= 16000000) pulseSpeedMultiplier = 1.6;
  else if (cpuFreqHz >= 8000000) pulseSpeedMultiplier = 1.2;
  else if (cpuFreqHz >= 2000000) pulseSpeedMultiplier = 0.8;
  else if (cpuFreqHz >= 1000000) pulseSpeedMultiplier = 0.5;
  else pulseSpeedMultiplier = 0.2;

  return {
    oscillatorName: oscName,
    oscillatorType: oscType,
    inputFrequencyHz: baseFreqHz,
    inputFrequencyFormatted: formatHz(baseFreqHz),
    prescalerActive: ckdiv8,
    prescalerRatio,
    cpuFrequencyHz: cpuFreqHz,
    cpuFrequencyFormatted: formatHz(cpuFreqHz),
    cyclePeriodNs,
    flashClockHz: cpuFreqHz,
    flashClockFormatted: formatHz(cpuFreqHz),
    ioClockHz: cpuFreqHz,
    ioClockFormatted: formatHz(cpuFreqHz),
    timerPrescalers,
    usartBauds,
    adcFrequencies,
    wdtClockHz: 128000,
    wdtClockFormatted: '128 kHz',
    pulseSpeedMultiplier,
  };
}

// -------------------------------------------------------------
// Lock Bit Simulation & Silicon Security Level
// -------------------------------------------------------------

export interface LockBitSecurityInfo {
  mode: 1 | 2 | 3;
  name: string;
  badgeLabel: string;
  color: 'emerald' | 'amber' | 'rose';
  isReadProtected: boolean;
  isWriteProtected: boolean;
  bootAppProtection: string;
  bootBootProtection: string;
  descriptionHu: string;
  remedyHu: string;
}

export function getLockBitSecurityInfo(lockByte: number): LockBitSecurityInfo {
  const lb = lockByte & 0x03;
  const blb0 = (lockByte >> 2) & 0x03;
  const blb1 = (lockByte >> 4) & 0x03;

  let mode: 1 | 2 | 3 = 1;
  let name = 'Mode 1: Nincs Memóriazár (Nyitott / Fejlesztői Mód)';
  let badgeLabel = 'MODE 1: NYITOTT';
  let color: 'emerald' | 'amber' | 'rose' = 'emerald';
  let isReadProtected = false;
  let isWriteProtected = false;
  let desc = 'A Flash és EEPROM memóriák teljes mértékben írhatók, olvashatók és visszaolvashatók ISP-n és bootloaderen keresztül.';
  let remedy = 'Nincs teendő. Fejlesztéshez és oktatáshoz ez a legbiztonságosabb és legkényelmesebb állapot.';

  if (lb === 0x02) {
    mode = 2;
    name = 'Mode 2: Újraírás Letiltva (Flash / EEPROM Írásvédett)';
    badgeLabel = 'MODE 2: ÍRÁSVÉDETT';
    color = 'amber';
    isReadProtected = false;
    isWriteProtected = true;
    desc = 'A Flash és EEPROM tartalom kiolvasható és ellenőrizhető (Verify), de további programozás tiltva van ISP-n.';
    remedy = 'Új firmware feltöltéséhez teljes chip törlés (Chip Erase) szükséges.';
  } else if (lb === 0x00) {
    mode = 3;
    name = 'Mode 3: Teljes Szilícium Védelem (Másolás & Kiolvasás Zárolva)';
    badgeLabel = 'MODE 3: TELJESEN ZÁROLVA';
    color = 'rose';
    isReadProtected = true;
    isWriteProtected = true;
    desc = 'IP Védelem: A Flash és EEPROM tartalma semmilyen külső programozóval (ISP/Parallel) NEM olvasható ki (véletlen vagy 0x00/0xFF bájtokat ad vissza).';
    remedy = 'A chip tartalmának visszafejtése hardveresen blokkolva van. Feloldásához kizárólag Teljes Chip Törlés (avrdude -e / Chip Erase) használható, ami minden programkódot töröl.';
  }

  const appProtMap: Record<number, string> = {
    0x03: 'Nincs korlátozás (SPM és LPM engedélyezve)',
    0x02: 'SPM írás tiltva az App területre',
    0x00: 'SPM és LPM (olvasás) is tiltva a Bootloaderből',
    0x01: 'LPM olvasás tiltva a Bootloaderből',
  };

  const bootProtMap: Record<number, string> = {
    0x03: 'Nincs korlátozás (SPM és LPM engedélyezve)',
    0x02: 'SPM írás tiltva a Boot szekcióba',
    0x00: 'SPM és LPM is tiltva az Alkalmazásból a Bootloaderbe',
    0x01: 'LPM olvasás tiltva az Alkalmazásból a Bootloaderbe',
  };

  return {
    mode,
    name,
    badgeLabel,
    color,
    isReadProtected,
    isWriteProtected,
    bootAppProtection: appProtMap[blb0] || 'Egyedi védelem',
    bootBootProtection: bootProtMap[blb1] || 'Egyedi védelem',
    descriptionHu: desc,
    remedyHu: remedy,
  };
}

export function isFlashReadLocked(lockByte: number): boolean {
  return (lockByte & 0x03) === 0x00;
}

export function simulateFlashRead(
  realFlash: Uint8Array,
  lockByte: number
): { success: boolean; bytes: Uint8Array; message: string; securityMode: number } {
  const isLocked = isFlashReadLocked(lockByte);
  if (isLocked) {
    // Return dummy 0x00 / 0xFF bytes simulating real protected AVR silicon
    const dummy = new Uint8Array(realFlash.length).fill(0x00);
    return {
      success: false,
      bytes: dummy,
      message: '🔒 HOZZÁFÉRÉS MEGTAKADVA: A mikrovezérlő Flash memóriája hardveresen zárolva van (Lock Mode 3 / LB=00). Az ISP kiolvasás tiltva van a szilícium szintű másolásvédelem miatt. Feloldásához Teljes Chip Törlés (Chip Erase) szükséges.',
      securityMode: 3,
    };
  }

  return {
    success: true,
    bytes: new Uint8Array(realFlash),
    message: '✓ Flash memória sikeresen kiolvasva ISP interfészen keresztül.',
    securityMode: (lockByte & 0x03) === 0x02 ? 2 : 1,
  };
}

// -------------------------------------------------------------
// Generator Functions: avrdude, platformio, makefile, C code
// -------------------------------------------------------------

export interface AvrdudeConfig {
  programmer: 'usbasp' | 'arduino' | 'avrispmkII' | 'atmelice_isp' | 'stk500v1' | 'dragon_isp';
  port?: string;
  baud?: string;
  doVerify?: boolean;
}

export function generateAvrdudeCommand(
  fuseState: AvrFuseState,
  config: AvrdudeConfig = { programmer: 'usbasp' }
): string {
  const mcuPartMap: Record<AvrMcuFuseType, string> = {
    atmega328p: 'm328p',
    atmega2560: 'm2560',
    atmega32u4: 'm32u4',
    attiny85: 't85',
    atmega168: 'm168',
    atmega8: 'm8',
  };

  const part = mcuPartMap[fuseState.mcu] || 'm328p';
  const lfuseHex = formatHexByte(fuseState.lfuse);
  const hfuseHex = formatHexByte(fuseState.hfuse);
  const efuseHex = formatHexByte(fuseState.efuse);
  const lockHex = formatHexByte(fuseState.lock);

  let cmd = `avrdude -c ${config.programmer} -p ${part}`;

  if (config.port) {
    cmd += ` -P ${config.port}`;
  }
  if (config.baud) {
    cmd += ` -b ${config.baud}`;
  }

  cmd += ` -U lfuse:w:${lfuseHex}:m`;
  cmd += ` -U hfuse:w:${hfuseHex}:m`;

  const desc = AVR_MCU_DESCRIPTORS[fuseState.mcu];
  if (desc?.hasExtendedFuse) {
    cmd += ` -U efuse:w:${efuseHex}:m`;
  }

  if (fuseState.lock !== 0xff && fuseState.lock !== 0x0f) {
    cmd += ` -U lock:w:${lockHex}:m`;
  }

  return cmd;
}

export function generatePlatformIoConfig(fuseState: AvrFuseState): string {
  const lfuseHex = formatHexByte(fuseState.lfuse);
  const hfuseHex = formatHexByte(fuseState.hfuse);
  const efuseHex = formatHexByte(fuseState.efuse);
  const lockHex = formatHexByte(fuseState.lock);

  return `; PlatformIO Project Configuration - FUSE Bits
[env:custom_fuses]
platform = atmelavr
board = uno
framework = arduino

; Hardveres FUSE bitek konfigurációja
board_fuses.lfuse = ${lfuseHex}
board_fuses.hfuse = ${hfuseHex}
board_fuses.efuse = ${efuseHex}
board_fuses.lock = ${lockHex}

; Programozó beállítása a feltöltéshez
upload_protocol = usbasp
upload_flags =
    -e
`;
}

export function generateArduinoBoardsSnippet(boardName: string, fuseState: AvrFuseState): string {
  const prefix = boardName.toLowerCase().replace(/[^a-z0-9]/g, '_');
  const lfuseHex = formatHexByte(fuseState.lfuse);
  const hfuseHex = formatHexByte(fuseState.hfuse);
  const efuseHex = formatHexByte(fuseState.efuse);
  const lockHex = formatHexByte(fuseState.lock);

  return `# Arduino boards.txt bejegyzés
${prefix}.name=${boardName} (Custom Fuses)
${prefix}.build.mcu=${fuseState.mcu === 'atmega328p' ? 'atmega328p' : fuseState.mcu}
${prefix}.build.f_cpu=16000000L
${prefix}.build.board=AVR_${fuseState.mcu.toUpperCase()}

# Bootloader és Fuses
${prefix}.bootloader.low_fuses=${lfuseHex}
${prefix}.bootloader.high_fuses=${hfuseHex}
${prefix}.bootloader.extended_fuses=${efuseHex}
${prefix}.bootloader.unlock_bits=0x3F
${prefix}.bootloader.lock_bits=${lockHex}
${prefix}.bootloader.tool=avrdude
`;
}

export function generateAvrCHeader(fuseState: AvrFuseState): string {
  const lfuseHex = formatHexByte(fuseState.lfuse);
  const hfuseHex = formatHexByte(fuseState.hfuse);
  const efuseHex = formatHexByte(fuseState.efuse);
  const lockHex = formatHexByte(fuseState.lock);

  return `/*
 * AVR Fuses Beágyazása ELF fájlba (avr-libc <avr/fuse.h> & <avr/lock.h>)
 * Használat: automatikusan beégethető az ELF fájlból AVR Studio / avrdude segítségével.
 */

#include <avr/io.h>
#include <avr/fuse.h>
#include <avr/lock.h>

#if defined(__AVR_ATmega328P__) || defined(__AVR_ATmega328__)

// Fuses közvetlen hexadecimális definíciója:
FUSES = {
    .low      = ${lfuseHex},
    .high     = ${hfuseHex},
    .extended = ${efuseHex},
};

// Lock bits definíciója:
LOCKBITS = ${lockHex};

#endif
`;
}
