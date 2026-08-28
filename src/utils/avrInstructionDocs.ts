/**
 * (c) 2026 AI Studio AVR Visual Studio
 * AVR Instruction Reference & Microchip/Atmel Datasheet Documentation Engine
 * Provides detailed disassembly, machine cycle timing, SREG bit effects,
 * opcode binary encodings, and register mapping for all ATmega328P instructions.
 */

import { ProgramBlock, ArduinoPin } from '../types';
import { PIN_MAPPINGS, CYCLE_NS } from './hardwareMap';
import { BLOCK_DEFINITIONS } from '../data/blockDefinitions';

export interface SregFlagImpact {
  flag: 'I' | 'T' | 'H' | 'S' | 'V' | 'N' | 'Z' | 'C';
  name: string;
  effect: 'unaffected' | 'modified' | 'cleared' | 'set' | 'loaded';
  symbol: string;
  description: string;
}

export interface AvrOpcodeDoc {
  mnemonic: string;
  fullName: string;
  fullNameHu: string;
  category: 'Arithmetic' | 'Logic' | 'Branch' | 'Bit' | 'Data Transfer' | 'MCU Control' | 'Peripheral';
  syntax: string;
  operands: string;
  operandsDesc: string;
  binaryPattern: string; // e.g. "1001 1010 AAAA Abbb"
  cycles: number | string;
  executionTimeNs: string;
  stackImpact?: string;
  sreg: SregFlagImpact[];
  summaryHu: string;
  detailedDescHu: string;
  hardwareNotesHu: string;
  cEquivalent: string;
  datasheetSection: string;
}

export interface HardwareRegisterDoc {
  name: string;
  addressIoHex: string;
  addressMemHex: string;
  descriptionHu: string;
  bitDefinitions: { bit: number; name: string; desc: string; isSet?: boolean }[];
  electricalNotes?: string;
}

export interface BlockAvrInspection {
  blockId: string;
  blockType: string;
  blockName: string;
  category: string;
  scope: string;
  primaryMnemonic: string;
  instructions: {
    asmLine: string;
    mnemonic: string;
    opcodeHex: string;
    binary16: string;
    cycles: number;
    timeNs: number;
    explanation: string;
  }[];
  totalCycles: number;
  totalTimeNs: number;
  affectedRegisters: string[];
  hardwareRegisters: HardwareRegisterDoc[];
  sregState: SregFlagImpact[];
  datasheetDoc: AvrOpcodeDoc;
  cCode: string[];
  avrGccMacro: string;
  hardwareTipHu: string;
  safetyAlertHu?: string;
}

// --------------------------------------------------------------------------------------
// AVR INSTRUCTION DATABASE (Atmel 8-bit AVR Instruction Set Manual)
// --------------------------------------------------------------------------------------
export const AVR_INSTRUCTION_DATABASE: Record<string, AvrOpcodeDoc> = {
  SBI: {
    mnemonic: 'SBI',
    fullName: 'Set Bit in I/O Register',
    fullNameHu: 'I/O Regiszter Bit Beállítása (1-re billentés)',
    category: 'Bit',
    syntax: 'sbi A, b',
    operands: 'A ∈ {0..31} (0x00..0x1F), b ∈ {0..7}',
    operandsDesc: 'A: I/O Cím az alsó 32 I/O térben (pl. PORTB=0x05, DDRB=0x04), b: Bit pozíció (0..7)',
    binaryPattern: '1001 1010 AAAA Abbb',
    cycles: 2,
    executionTimeNs: '125.0 ns (@16 MHz)',
    sreg: [
      { flag: 'I', name: 'Global Interrupt', effect: 'unaffected', symbol: '-', description: 'Nem változik' },
      { flag: 'T', name: 'Bit Copy', effect: 'unaffected', symbol: '-', description: 'Nem változik' },
      { flag: 'H', name: 'Half Carry', effect: 'unaffected', symbol: '-', description: 'Nem változik' },
      { flag: 'S', name: 'Sign', effect: 'unaffected', symbol: '-', description: 'Nem változik' },
      { flag: 'V', name: 'Overflow', effect: 'unaffected', symbol: '-', description: 'Nem változik' },
      { flag: 'N', name: 'Negative', effect: 'unaffected', symbol: '-', description: 'Nem változik' },
      { flag: 'Z', name: 'Zero', effect: 'unaffected', symbol: '-', description: 'Nem változik' },
      { flag: 'C', name: 'Carry', effect: 'unaffected', symbol: '-', description: 'Nem változik' },
    ],
    summaryHu: 'Egyetlen bitet 1-re (HIGH szintre vagy kimenetre) állít az alsó 32 I/O regiszter valamelyikében, mindössze 2 óraciklus alatt, anélkül, hogy a többi bit megváltozna.',
    detailedDescHu:
      'Az SBI utasítás atomi műveletként közvetlenül beállítja az I/O regiszter b-edik bitjét. Mivel atomi, nem szakítható meg megszakításkezelő (ISR) által, és nem igényel ideiglenes munkaregisztert (pl. r16). Fontos korlát: Csak az I/O 0x00..0x1F címtérben érvényes.',
    hardwareNotesHu:
      'Amikor kimenetre konfigurált lábra hívod (PORTB/C/D), a kimeneti feszültség 0V-ról 5V-ra ugrik. Bemenetre konfigurált láb esetén bekapcsolja a belső 20-50 kΩ felhúzó ellenállást (Internal Pull-Up).',
    cEquivalent: 'PORTB |= (1 << PB5); // vagy sbi(PORTB, 5);',
    datasheetSection: 'AVR Instruction Set Manual §4.81 (SBI - Set Bit in I/O Register)',
  },

  CBI: {
    mnemonic: 'CBI',
    fullName: 'Clear Bit in I/O Register',
    fullNameHu: 'I/O Regiszter Bit Törlése (0-ra billentés)',
    category: 'Bit',
    syntax: 'cbi A, b',
    operands: 'A ∈ {0..31} (0x00..0x1F), b ∈ {0..7}',
    operandsDesc: 'A: I/O Cím az alsó 32 I/O térben (pl. PORTB=0x05, DDRB=0x04), b: Bit pozíció (0..7)',
    binaryPattern: '1001 1000 AAAA Abbb',
    cycles: 2,
    executionTimeNs: '125.0 ns (@16 MHz)',
    sreg: [
      { flag: 'I', name: 'Global Interrupt', effect: 'unaffected', symbol: '-', description: 'Nem változik' },
      { flag: 'T', name: 'Bit Copy', effect: 'unaffected', symbol: '-', description: 'Nem változik' },
      { flag: 'H', name: 'Half Carry', effect: 'unaffected', symbol: '-', description: 'Nem változik' },
      { flag: 'S', name: 'Sign', effect: 'unaffected', symbol: '-', description: 'Nem változik' },
      { flag: 'V', name: 'Overflow', effect: 'unaffected', symbol: '-', description: 'Nem változik' },
      { flag: 'N', name: 'Negative', effect: 'unaffected', symbol: '-', description: 'Nem változik' },
      { flag: 'Z', name: 'Zero', effect: 'unaffected', symbol: '-', description: 'Nem változik' },
      { flag: 'C', name: 'Carry', effect: 'unaffected', symbol: '-', description: 'Nem változik' },
    ],
    summaryHu: 'Egyetlen bitet 0-ra (LOW szintre vagy bemenetre) töröl az alsó 32 I/O regiszter valamelyikében 2 óraciklus alatt.',
    detailedDescHu:
      'Az SBI ellenpárja. Atomi módon nullázza a kiválasztott I/O regiszter b-edik bitjét. Nincs hatással az SREG állapotjelzőkre. Ha a DDR regiszterre alkalmazzák, a lábat nagy impedanciás bemenetté (High-Z) állítja át.',
    hardwareNotesHu:
      'Kimeneti láb törlésekor 0V (GND) szintre húzza a kimenetet. Bemeneti lábnál kikapcsolja a belső felhúzó ellenállást.',
    cEquivalent: 'PORTB &= ~(1 << PB5); // vagy cbi(PORTB, 5);',
    datasheetSection: 'AVR Instruction Set Manual §4.16 (CBI - Clear Bit in I/O Register)',
  },

  LDI: {
    mnemonic: 'LDI',
    fullName: 'Load Immediate',
    fullNameHu: 'Közvetlen Konstans Betöltése Regiszterbe',
    category: 'Data Transfer',
    syntax: 'ldi Rd, K',
    operands: 'Rd ∈ {r16..r31} (Felső 16 regiszter), K ∈ {0..255} (0x00..0xFF)',
    operandsDesc: 'Rd: Célregiszter (csak r16-tól r31-ig!), K: 8-bites konstans számérték',
    binaryPattern: '1110 KKKK dddd KKKK',
    cycles: 1,
    executionTimeNs: '62.5 ns (@16 MHz)',
    sreg: [
      { flag: 'I', name: 'Global Interrupt', effect: 'unaffected', symbol: '-', description: 'Nem változik' },
      { flag: 'T', name: 'Bit Copy', effect: 'unaffected', symbol: '-', description: 'Nem változik' },
      { flag: 'H', name: 'Half Carry', effect: 'unaffected', symbol: '-', description: 'Nem változik' },
      { flag: 'S', name: 'Sign', effect: 'unaffected', symbol: '-', description: 'Nem változik' },
      { flag: 'V', name: 'Overflow', effect: 'unaffected', symbol: '-', description: 'Nem változik' },
      { flag: 'N', name: 'Negative', effect: 'unaffected', symbol: '-', description: 'Nem változik' },
      { flag: 'Z', name: 'Zero', effect: 'unaffected', symbol: '-', description: 'Nem változik' },
      { flag: 'C', name: 'Carry', effect: 'unaffected', symbol: '-', description: 'Nem változik' },
    ],
    summaryHu: 'Egy 8-bites konstans értéket (0..255) közvetlenül betölt az r16..r31 általános munkaregiszterek egyikébe 1 óraciklus alatt.',
    detailedDescHu:
      'Az egyik leggyakrabban használt AVR utasítás. Az AVR RISC architektúra sajátossága, hogy a közvetlen betöltés (LDI) csak a felső 16 regiszteren (r16..r31) működik. Ha az r0..r15 regiszterekbe akarsz konstanst vinni, először LDI-vel be kell tölteni egy felső regiszterbe, majd MOV-val átmásolni.',
    hardwareNotesHu:
      'Alapvető lépés I/O portok egész bájtos beállításakor (LDI r16, 0xFF -> OUT DDRB, r16) vagy számlálók inicializálásakor.',
    cEquivalent: 'uint8_t val = 0xAA;',
    datasheetSection: 'AVR Instruction Set Manual §4.54 (LDI - Load Immediate)',
  },

  IN: {
    mnemonic: 'IN',
    fullName: 'Load an I/O Location to Register',
    fullNameHu: 'I/O Regiszter Beolvasása Regiszterbe',
    category: 'Data Transfer',
    syntax: 'in Rd, A',
    operands: 'Rd ∈ {r0..r31}, A ∈ {0..63} (0x00..0x3F)',
    operandsDesc: 'Rd: Célregiszter (bármelyik r0-r31), A: I/O Regiszter Cím (pl. PINB=0x03, PIND=0x09, SREG=0x3F)',
    binaryPattern: '1011 0AAd dddd AAAA',
    cycles: 1,
    executionTimeNs: '62.5 ns (@16 MHz)',
    sreg: [
      { flag: 'I', name: 'Global Interrupt', effect: 'unaffected', symbol: '-', description: 'Nem változik' },
      { flag: 'T', name: 'Bit Copy', effect: 'unaffected', symbol: '-', description: 'Nem változik' },
      { flag: 'H', name: 'Half Carry', effect: 'unaffected', symbol: '-', description: 'Nem változik' },
      { flag: 'S', name: 'Sign', effect: 'unaffected', symbol: '-', description: 'Nem változik' },
      { flag: 'V', name: 'Overflow', effect: 'unaffected', symbol: '-', description: 'Nem változik' },
      { flag: 'N', name: 'Negative', effect: 'unaffected', symbol: '-', description: 'Nem változik' },
      { flag: 'Z', name: 'Zero', effect: 'unaffected', symbol: '-', description: 'Nem változik' },
      { flag: 'C', name: 'Carry', effect: 'unaffected', symbol: '-', description: 'Nem változik' },
    ],
    summaryHu: 'Beolvassa egy I/O periféria vagy port (pl. PINB bemeneti szintek, SREG) tartalmát egy munkaregiszterbe 1 ciklus alatt.',
    detailedDescHu:
      'Az IN utasítás a teljes 64 darabos I/O regisztertéren (0x00..0x3F) működik. Digitális lábak állapotának (PINx), időzítők számlálóinak vagy periféria állapotbiteknek a beolvasására szolgál.',
    hardwareNotesHu:
      'PINx regiszter olvasásakor a szinkronizáló flip-flopok miatt 1/2-1 óraciklusos hardveres késleltetés lép fel a külső analóg szint és a beolvasott érték között.',
    cEquivalent: 'uint8_t portState = PINB;',
    datasheetSection: 'AVR Instruction Set Manual §4.49 (IN - Load I/O)',
  },

  OUT: {
    mnemonic: 'OUT',
    fullName: 'Store Register to I/O Location',
    fullNameHu: 'Regiszter Kiírása I/O Helyre',
    category: 'Data Transfer',
    syntax: 'out A, Rr',
    operands: 'A ∈ {0..63} (0x00..0x3F), Rr ∈ {r0..r31}',
    operandsDesc: 'A: I/O Cím (pl. PORTB=0x05, DDRB=0x04), Rr: Forrásregiszter',
    binaryPattern: '1011 1AAr rrrr AAAA',
    cycles: 1,
    executionTimeNs: '62.5 ns (@16 MHz)',
    sreg: [
      { flag: 'I', name: 'Global Interrupt', effect: 'unaffected', symbol: '-', description: 'Nem változik' },
      { flag: 'T', name: 'Bit Copy', effect: 'unaffected', symbol: '-', description: 'Nem változik' },
      { flag: 'H', name: 'Half Carry', effect: 'unaffected', symbol: '-', description: 'Nem változik' },
      { flag: 'S', name: 'Sign', effect: 'unaffected', symbol: '-', description: 'Nem változik' },
      { flag: 'V', name: 'Overflow', effect: 'unaffected', symbol: '-', description: 'Nem változik' },
      { flag: 'N', name: 'Negative', effect: 'unaffected', symbol: '-', description: 'Nem változik' },
      { flag: 'Z', name: 'Zero', effect: 'unaffected', symbol: '-', description: 'Nem változik' },
      { flag: 'C', name: 'Carry', effect: 'unaffected', symbol: '-', description: 'Nem változik' },
    ],
    summaryHu: 'Egy munkaregiszter 8 bites értékét közvetlenül kiírja a megadott I/O regiszterbe (pl. teljes PORT vagy konfiguráció) 1 óraciklus alatt.',
    detailedDescHu:
      'Egyszerre 8 kimeneti lábat tud szimultán átkapcsolni 62.5 ns alatt, ami elengedhetetlen párhuzamos LCD buszoknál vagy R-2R DAC áramköröknél.',
    hardwareNotesHu:
      'Ha a PINx regiszterre írsz 1-eseket OUT utasítással, az ATmega328P hardveresen átbillenti (toggle-öli) a megfelelő kimeneti biteket a PORT regiszterben!',
    cEquivalent: 'PORTB = 0x55;',
    datasheetSection: 'AVR Instruction Set Manual §4.66 (OUT - Store to I/O)',
  },

  RJMP: {
    mnemonic: 'RJMP',
    fullName: 'Relative Jump',
    fullNameHu: 'Relatív Ugrás Programmemóriában',
    category: 'Branch',
    syntax: 'rjmp k',
    operands: 'k ∈ {-2048..+2047} szavak (-4096..+4094 bájtok)',
    operandsDesc: 'k: Címeltolás a jelenlegi Program Counter-hez (PC) képest 2K utasítás határon belül',
    binaryPattern: '1100 kkkk kkkk kkkk',
    cycles: 2,
    executionTimeNs: '125.0 ns (@16 MHz)',
    sreg: [
      { flag: 'I', name: 'Global Interrupt', effect: 'unaffected', symbol: '-', description: 'Nem változik' },
      { flag: 'T', name: 'Bit Copy', effect: 'unaffected', symbol: '-', description: 'Nem változik' },
      { flag: 'H', name: 'Half Carry', effect: 'unaffected', symbol: '-', description: 'Nem változik' },
      { flag: 'S', name: 'Sign', effect: 'unaffected', symbol: '-', description: 'Nem változik' },
      { flag: 'V', name: 'Overflow', effect: 'unaffected', symbol: '-', description: 'Nem változik' },
      { flag: 'N', name: 'Negative', effect: 'unaffected', symbol: '-', description: 'Nem változik' },
      { flag: 'Z', name: 'Zero', effect: 'unaffected', symbol: '-', description: 'Nem változik' },
      { flag: 'C', name: 'Carry', effect: 'unaffected', symbol: '-', description: 'Nem változik' },
    ],
    summaryHu: 'Feltétel nélküli ugrást hajt végre a megadott címkére a 2 Kszavas FLASH memóriatartományban. 2 óraciklusig tart.',
    detailedDescHu:
      'A Program Counter (PC) értékét átállítja: PC ← PC + k + 1. Az ugrás során a kétfokozatú utasítás-csővezeték (Instruction Pipeline) kiürül, ezért igényel 2 óraciklust.',
    hardwareNotesHu: 'A standard Arduino loop() függvény végtelen ciklusát RJMP utasítás valósítja meg.',
    cEquivalent: 'goto label; // vagy while(1) loop',
    datasheetSection: 'AVR Instruction Set Manual §4.76 (RJMP - Relative Jump)',
  },

  RCALL: {
    mnemonic: 'RCALL',
    fullName: 'Relative Call Subroutine',
    fullNameHu: 'Relatív Alprogram Hívás (Függvényhívás)',
    category: 'Branch',
    syntax: 'rcall k',
    operands: 'k ∈ {-2048..+2047} szavak',
    operandsDesc: 'k: Függvény/szubrutin relatív címe',
    binaryPattern: '1101 kkkk kkkk kkkk',
    cycles: '3 (ATmega328P)',
    executionTimeNs: '187.5 ns (@16 MHz)',
    stackImpact: 'Elmenti a visszatérési címet (2 bájt) a veremtárba (Stack): SP ← SP - 2',
    sreg: [
      { flag: 'I', name: 'Global Interrupt', effect: 'unaffected', symbol: '-', description: 'Nem változik' },
      { flag: 'T', name: 'Bit Copy', effect: 'unaffected', symbol: '-', description: 'Nem változik' },
      { flag: 'H', name: 'Half Carry', effect: 'unaffected', symbol: '-', description: 'Nem változik' },
      { flag: 'S', name: 'Sign', effect: 'unaffected', symbol: '-', description: 'Nem változik' },
      { flag: 'V', name: 'Overflow', effect: 'unaffected', symbol: '-', description: 'Nem változik' },
      { flag: 'N', name: 'Negative', effect: 'unaffected', symbol: '-', description: 'Nem változik' },
      { flag: 'Z', name: 'Zero', effect: 'unaffected', symbol: '-', description: 'Nem változik' },
      { flag: 'C', name: 'Carry', effect: 'unaffected', symbol: '-', description: 'Nem változik' },
    ],
    summaryHu: 'Alprogramot (függvényt) hív meg. A visszatérési címet a hardveres verembe menti, majd az alprogramra ugrik.',
    detailedDescHu:
      'A jelenlegi utasítás utáni PC+1 címet 2 bájtban a Stackre nyomja (Stack Pointer automatikusan csökken), majd a célcímre ugrik. Visszatérés a RET utasítással történik.',
    hardwareNotesHu: 'Működéséhez elengedhetetlen, hogy a Stack Pointer (SPH/SPL) helyesen az SRAM tetejére (0x08FF) legyen inicializálva.',
    cEquivalent: 'myFunction();',
    datasheetSection: 'AVR Instruction Set Manual §4.74 (RCALL - Relative Call to Subroutine)',
  },

  RET: {
    mnemonic: 'RET',
    fullName: 'Return from Subroutine',
    fullNameHu: 'Visszatérés Alprogramból (Függvényből)',
    category: 'Branch',
    syntax: 'ret',
    operands: 'Nincsenek',
    operandsDesc: 'Nem igényel operandust',
    binaryPattern: '1001 0101 0000 1000',
    cycles: '4 (ATmega328P)',
    executionTimeNs: '250.0 ns (@16 MHz)',
    stackImpact: 'Kiveszi a visszatérési címet (2 bájt) a veremtárból: SP ← SP + 2',
    sreg: [
      { flag: 'I', name: 'Global Interrupt', effect: 'unaffected', symbol: '-', description: 'Nem változik' },
      { flag: 'T', name: 'Bit Copy', effect: 'unaffected', symbol: '-', description: 'Nem változik' },
      { flag: 'H', name: 'Half Carry', effect: 'unaffected', symbol: '-', description: 'Nem változik' },
      { flag: 'S', name: 'Sign', effect: 'unaffected', symbol: '-', description: 'Nem változik' },
      { flag: 'V', name: 'Overflow', effect: 'unaffected', symbol: '-', description: 'Nem változik' },
      { flag: 'N', name: 'Negative', effect: 'unaffected', symbol: '-', description: 'Nem változik' },
      { flag: 'Z', name: 'Zero', effect: 'unaffected', symbol: '-', description: 'Nem változik' },
      { flag: 'C', name: 'Carry', effect: 'unaffected', symbol: '-', description: 'Nem változik' },
    ],
    summaryHu: 'Visszatér az RCALL vagy CALL által meghívott alprogramból a hívás helye utáni utasításra. 4 óraciklust igényel.',
    detailedDescHu:
      'Két bájtot vesz le a Stack tetejéről (PC(15:8) és PC(7:0)), és betölti a Program Counterbe. Ha a Stack nem egyensúlyozott (pl. elfelejtett POP egy PUSH után), a mikrokontroller hibás címre ugrik és újraindulhat.',
    hardwareNotesHu: 'Megszakításkezelőből való visszatéréshez nem RET, hanem RETI utasítás szükséges!',
    cEquivalent: 'return;',
    datasheetSection: 'AVR Instruction Set Manual §4.75 (RET - Return from Subroutine)',
  },

  CP: {
    mnemonic: 'CP',
    fullName: 'Compare',
    fullNameHu: 'Két Regiszter Összehasonlítása',
    category: 'Arithmetic',
    syntax: 'cp Rd, Rr',
    operands: 'Rd ∈ {r0..r31}, Rr ∈ {r0..r31}',
    operandsDesc: 'Rd: Első regiszter, Rr: Második regiszter',
    binaryPattern: '0001 01rd dddd rrrr',
    cycles: 1,
    executionTimeNs: '62.5 ns (@16 MHz)',
    sreg: [
      { flag: 'I', name: 'Global Interrupt', effect: 'unaffected', symbol: '-', description: 'Nem változik' },
      { flag: 'T', name: 'Bit Copy', effect: 'unaffected', symbol: '-', description: 'Nem változik' },
      { flag: 'H', name: 'Half Carry', effect: 'modified', symbol: '↔', description: 'Beállítva ha átvitel a 3. bitről' },
      { flag: 'S', name: 'Sign', effect: 'modified', symbol: '↔', description: 'S = N ⊕ V (előjeles összehasonlítás)' },
      { flag: 'V', name: 'Overflow', effect: 'modified', symbol: '↔', description: 'Kettes komplemens túlcsordulás' },
      { flag: 'N', name: 'Negative', effect: 'modified', symbol: '↔', description: 'N = Result.7 (Negatív eredmény)' },
      { flag: 'Z', name: 'Zero', effect: 'modified', symbol: '↔', description: 'Z = 1 ha Rd == Rr (Egyenlőség)' },
      { flag: 'C', name: 'Carry', effect: 'modified', symbol: '↔', description: 'C = 1 ha Rd < Rr (Kölcsönkérés)' },
    ],
    summaryHu: 'Összehasonlítja két regiszter tartalmát kivonással (Rd - Rr) a regiszterek módosítása nélkül, és beállítja az SREG állapotjelző biteket.',
    detailedDescHu:
      'A kivonás eredménye eldobásra kerül, csak az SREG állapotbitek frissülnek. Közvetlenül utána feltételes ugróutasítások (BREQ, BRNE, BRLO, BRSH) következhetnek.',
    hardwareNotesHu: 'Egyenlőség esetén Z=1, ha Rd kisebb előjel nélkül, akkor C=1.',
    cEquivalent: 'if (regA == regB) ...',
    datasheetSection: 'AVR Instruction Set Manual §4.20 (CP - Compare)',
  },

  CPI: {
    mnemonic: 'CPI',
    fullName: 'Compare with Immediate',
    fullNameHu: 'Regiszter és Konstans Összehasonlítása',
    category: 'Arithmetic',
    syntax: 'cpi Rd, K',
    operands: 'Rd ∈ {r16..r31}, K ∈ {0..255}',
    operandsDesc: 'Rd: Felső munkaregiszter (r16-r31), K: 8-bites konstans szám',
    binaryPattern: '0011 KKKK dddd KKKK',
    cycles: 1,
    executionTimeNs: '62.5 ns (@16 MHz)',
    sreg: [
      { flag: 'I', name: 'Global Interrupt', effect: 'unaffected', symbol: '-', description: 'Nem változik' },
      { flag: 'T', name: 'Bit Copy', effect: 'unaffected', symbol: '-', description: 'Nem változik' },
      { flag: 'H', name: 'Half Carry', effect: 'modified', symbol: '↔', description: 'Átvitel a 3. bitről' },
      { flag: 'S', name: 'Sign', effect: 'modified', symbol: '↔', description: 'S = N ⊕ V' },
      { flag: 'V', name: 'Overflow', effect: 'modified', symbol: '↔', description: 'Túlcsordulásjelző' },
      { flag: 'N', name: 'Negative', effect: 'modified', symbol: '↔', description: 'Negatív előjel' },
      { flag: 'Z', name: 'Zero', effect: 'modified', symbol: '↔', description: 'Z = 1 ha Rd == K' },
      { flag: 'C', name: 'Carry', effect: 'modified', symbol: '↔', description: 'C = 1 ha Rd < K' },
    ],
    summaryHu: 'Egy regiszter értékét összehasonlítja egy azonnali konstans számmal (0..255) 1 ciklus alatt.',
    detailedDescHu:
      'Kivonást végez (Rd - K), frissíti az SREG-et. Tipikusan ciklusváltozók vagy határértékek ellenőrzésére használatos.',
    hardwareNotesHu: 'Csak a felső 16 regiszteren (r16..r31) hajtható végre.',
    cEquivalent: 'if (regA == 100) ...',
    datasheetSection: 'AVR Instruction Set Manual §4.21 (CPI - Compare with Immediate)',
  },

  BREQ: {
    mnemonic: 'BREQ',
    fullName: 'Branch if Equal',
    fullNameHu: 'Feltételes Ugrás Egyenlőség (Z=1) Esetén',
    category: 'Branch',
    syntax: 'breq k',
    operands: 'k ∈ {-64..+63} szavak',
    operandsDesc: 'k: Ugrási eltolás a címkére (-128..+126 bájt)',
    binaryPattern: '1111 00kk kkkk k001',
    cycles: '1 ha Hamis (nem ugrik), 2 ha Igaz (ugrik)',
    executionTimeNs: '62.5 ns / 125.0 ns (@16 MHz)',
    sreg: [
      { flag: 'I', name: 'Global Interrupt', effect: 'unaffected', symbol: '-', description: 'Nem változik' },
      { flag: 'T', name: 'Bit Copy', effect: 'unaffected', symbol: '-', description: 'Nem változik' },
      { flag: 'H', name: 'Half Carry', effect: 'unaffected', symbol: '-', description: 'Nem változik' },
      { flag: 'S', name: 'Sign', effect: 'unaffected', symbol: '-', description: 'Nem változik' },
      { flag: 'V', name: 'Overflow', effect: 'unaffected', symbol: '-', description: 'Nem változik' },
      { flag: 'N', name: 'Negative', effect: 'unaffected', symbol: '-', description: 'Nem változik' },
      { flag: 'Z', name: 'Zero', effect: 'unaffected', symbol: '-', description: 'Tesztelt feltétel: Z == 1' },
      { flag: 'C', name: 'Carry', effect: 'unaffected', symbol: '-', description: 'Nem változik' },
    ],
    summaryHu: 'Átugrik a megadott címkére, ha az előző művelet eredménye nulla volt, vagy az összehasonlított értékek megegyeztek (Z=1).',
    detailedDescHu:
      'Ha a feltétel nem teljesül, a processzor 1 ciklus alatt a következő sorra lép. Ha teljesül, 2 ciklus alatt elugrik a célcímre.',
    hardwareNotesHu: 'Ideális if (a == b) logikai elágazások megvalósításához.',
    cEquivalent: 'if (condition) goto label;',
    datasheetSection: 'AVR Instruction Set Manual §4.8 (BREQ - Branch if Equal)',
  },

  BRNE: {
    mnemonic: 'BRNE',
    fullName: 'Branch if Not Equal',
    fullNameHu: 'Feltételes Ugrás Nem Egyenlő (Z=0) Esetén',
    category: 'Branch',
    syntax: 'brne k',
    operands: 'k ∈ {-64..+63} szavak',
    operandsDesc: 'k: Ugrási eltolás a címkére (-128..+126 bájt)',
    binaryPattern: '1111 01kk kkkk k001',
    cycles: '1 ha Hamis (Z=1), 2 ha Igaz (Z=0)',
    executionTimeNs: '62.5 ns / 125.0 ns (@16 MHz)',
    sreg: [
      { flag: 'I', name: 'Global Interrupt', effect: 'unaffected', symbol: '-', description: 'Nem változik' },
      { flag: 'T', name: 'Bit Copy', effect: 'unaffected', symbol: '-', description: 'Nem változik' },
      { flag: 'H', name: 'Half Carry', effect: 'unaffected', symbol: '-', description: 'Nem változik' },
      { flag: 'S', name: 'Sign', effect: 'unaffected', symbol: '-', description: 'Nem változik' },
      { flag: 'V', name: 'Overflow', effect: 'unaffected', symbol: '-', description: 'Nem változik' },
      { flag: 'N', name: 'Negative', effect: 'unaffected', symbol: '-', description: 'Nem változik' },
      { flag: 'Z', name: 'Zero', effect: 'unaffected', symbol: '-', description: 'Tesztelt feltétel: Z == 0' },
      { flag: 'C', name: 'Carry', effect: 'unaffected', symbol: '-', description: 'Nem változik' },
    ],
    summaryHu: 'Átugrik a megadott címkére, ha az SREG Zero jelzője 0 (az előző számítás nem 0 vagy a két érték eltért).',
    detailedDescHu:
      'A legfontosabb ciklusszervező utasítás (DEC r16 -> BRNE loop_start). Visszaugráskor 2 ciklus, kilépéskor 1 ciklus.',
    hardwareNotesHu: 'Pontos szoftveres késleltető hurkok (delay loop) alapeleme.',
    cEquivalent: 'while (counter != 0) { ... }',
    datasheetSection: 'AVR Instruction Set Manual §4.10 (BRNE - Branch if Not Equal)',
  },

  NOP: {
    mnemonic: 'NOP',
    fullName: 'No Operation',
    fullNameHu: 'Üres Utasítás (Nem végez műveletet)',
    category: 'MCU Control',
    syntax: 'nop',
    operands: 'Nincsenek',
    operandsDesc: 'Nem vesz át paramétert',
    binaryPattern: '0000 0000 0000 0000',
    cycles: 1,
    executionTimeNs: '62.5 ns (@16 MHz)',
    sreg: [
      { flag: 'I', name: 'Global Interrupt', effect: 'unaffected', symbol: '-', description: 'Nem változik' },
      { flag: 'T', name: 'Bit Copy', effect: 'unaffected', symbol: '-', description: 'Nem változik' },
      { flag: 'H', name: 'Half Carry', effect: 'unaffected', symbol: '-', description: 'Nem változik' },
      { flag: 'S', name: 'Sign', effect: 'unaffected', symbol: '-', description: 'Nem változik' },
      { flag: 'V', name: 'Overflow', effect: 'unaffected', symbol: '-', description: 'Nem változik' },
      { flag: 'N', name: 'Negative', effect: 'unaffected', symbol: '-', description: 'Nem változik' },
      { flag: 'Z', name: 'Zero', effect: 'unaffected', symbol: '-', description: 'Nem változik' },
      { flag: 'C', name: 'Carry', effect: 'unaffected', symbol: '-', description: 'Nem változik' },
    ],
    summaryHu: 'Pontosan 1 óraciklusnyi (62.5 ns) üresjáratot hajt végre anélkül, hogy bármilyen regisztert vagy állapotjelzőt megváltoztatna.',
    detailedDescHu:
      'A Program Counter eggyel nő. Használatos precíz nanomásodperces időzítésekhez (pl. WS2812B NeoPixel protokoll, OneWire időzítések) vagy memóriahozzáférés szinkronizáláshoz.',
    hardwareNotesHu: '0x0000 gépi kód. Gyors időzítő kalibrációkhoz ideális.',
    cEquivalent: '__asm__ __volatile__("nop");',
    datasheetSection: 'AVR Instruction Set Manual §4.64 (NOP - No Operation)',
  },

  SEI: {
    mnemonic: 'SEI',
    fullName: 'Set Global Interrupt Flag',
    fullNameHu: 'Globális Megszakítások Engedélyezése',
    category: 'MCU Control',
    syntax: 'sei',
    operands: 'Nincsenek',
    operandsDesc: 'Nem igényel operandust',
    binaryPattern: '1001 0100 0111 1000',
    cycles: 1,
    executionTimeNs: '62.5 ns (@16 MHz)',
    sreg: [
      { flag: 'I', name: 'Global Interrupt', effect: 'set', symbol: '1', description: 'I ← 1 (Megszakítások aktívak)' },
      { flag: 'T', name: 'Bit Copy', effect: 'unaffected', symbol: '-', description: 'Nem változik' },
      { flag: 'H', name: 'Half Carry', effect: 'unaffected', symbol: '-', description: 'Nem változik' },
      { flag: 'S', name: 'Sign', effect: 'unaffected', symbol: '-', description: 'Nem változik' },
      { flag: 'V', name: 'Overflow', effect: 'unaffected', symbol: '-', description: 'Nem változik' },
      { flag: 'N', name: 'Negative', effect: 'unaffected', symbol: '-', description: 'Nem változik' },
      { flag: 'Z', name: 'Zero', effect: 'unaffected', symbol: '-', description: 'Nem változik' },
      { flag: 'C', name: 'Carry', effect: 'unaffected', symbol: '-', description: 'Nem változik' },
    ],
    summaryHu: 'Beállítja az SREG 7. bitjét (I-bit), ezzel globálisan engedélyezi a hardveres és időzítő megszakításokat.',
    detailedDescHu:
      'Az utasítás lefutása utáni utasítás még lefut, mielőtt bármely függőben lévő megszakítás kiszolgálásra kerülne.',
    hardwareNotesHu: 'Arduino környezetben a setup() végén vagy interrupts() függvényhíváskor fut le.',
    cEquivalent: 'sei(); // vagy interrupts();',
    datasheetSection: 'AVR Instruction Set Manual §4.82 (SEI - Set Global Interrupt Flag)',
  },

  CLI: {
    mnemonic: 'CLI',
    fullName: 'Clear Global Interrupt Flag',
    fullNameHu: 'Globális Megszakítások Tiltása (Kritikus Szakasz)',
    category: 'MCU Control',
    syntax: 'cli',
    operands: 'Nincsenek',
    operandsDesc: 'Nem igényel operandust',
    binaryPattern: '1001 0100 1111 1000',
    cycles: 1,
    executionTimeNs: '62.5 ns (@16 MHz)',
    sreg: [
      { flag: 'I', name: 'Global Interrupt', effect: 'cleared', symbol: '0', description: 'I ← 0 (Megszakítások letiltva)' },
      { flag: 'T', name: 'Bit Copy', effect: 'unaffected', symbol: '-', description: 'Nem változik' },
      { flag: 'H', name: 'Half Carry', effect: 'unaffected', symbol: '-', description: 'Nem változik' },
      { flag: 'S', name: 'Sign', effect: 'unaffected', symbol: '-', description: 'Nem változik' },
      { flag: 'V', name: 'Overflow', effect: 'unaffected', symbol: '-', description: 'Nem változik' },
      { flag: 'N', name: 'Negative', effect: 'unaffected', symbol: '-', description: 'Nem változik' },
      { flag: 'Z', name: 'Zero', effect: 'unaffected', symbol: '-', description: 'Nem változik' },
      { flag: 'C', name: 'Carry', effect: 'unaffected', symbol: '-', description: 'Nem változik' },
    ],
    summaryHu: 'Letiltja az összes megszakítást az SREG I-bitjének törlésével. Kritikus atomi műveletek védelmére szolgál.',
    detailedDescHu:
      'A CLI azonnal érvénybe lép: a rákövetkező utasítások garantáltan megszakítás nélkül futnak le, megelőzve az adatsérülést többszavas változók írásakor.',
    hardwareNotesHu: 'Mindig gyorsan vissza kell kapcsolni SEI-vel, különben a millis() időzítő és az UART adatfogadás leáll.',
    cEquivalent: 'cli(); // vagy noInterrupts();',
    datasheetSection: 'AVR Instruction Set Manual §4.17 (CLI - Clear Global Interrupt Flag)',
  },

  ADD: {
    mnemonic: 'ADD',
    fullName: 'Add without Carry',
    fullNameHu: 'Két Regiszter Összeadása',
    category: 'Arithmetic',
    syntax: 'add Rd, Rr',
    operands: 'Rd ∈ {r0..r31}, Rr ∈ {r0..r31}',
    operandsDesc: 'Rd: Cél és első tag, Rr: Második tag',
    binaryPattern: '0000 11rd dddd rrrr',
    cycles: 1,
    executionTimeNs: '62.5 ns (@16 MHz)',
    sreg: [
      { flag: 'I', name: 'Global Interrupt', effect: 'unaffected', symbol: '-', description: 'Nem változik' },
      { flag: 'T', name: 'Bit Copy', effect: 'unaffected', symbol: '-', description: 'Nem változik' },
      { flag: 'H', name: 'Half Carry', effect: 'modified', symbol: '↔', description: 'BCD átvitel a 3. bitről' },
      { flag: 'S', name: 'Sign', effect: 'modified', symbol: '↔', description: 'S = N ⊕ V' },
      { flag: 'V', name: 'Overflow', effect: 'modified', symbol: '↔', description: 'Kettes komplemens túlcsordulás' },
      { flag: 'N', name: 'Negative', effect: 'modified', symbol: '↔', description: 'N = Result.7' },
      { flag: 'Z', name: 'Zero', effect: 'modified', symbol: '↔', description: 'Z = 1 ha Eredmény == 0' },
      { flag: 'C', name: 'Carry', effect: 'modified', symbol: '↔', description: 'C = 1 ha átvitel a 7. bitről' },
    ],
    summaryHu: 'Összeadja Rd és Rr tartalmát: Rd ← Rd + Rr 1 ciklus alatt, és beállítja az SREG állapotjelzőket.',
    detailedDescHu: '8 bites előjeles és előjel nélküli összeadásra alkalmas.',
    hardwareNotesHu: 'Túlcsordulás esetén a Carry flag C=1 lesz.',
    cEquivalent: 'a += b;',
    datasheetSection: 'AVR Instruction Set Manual §4.1 (ADD - Add without Carry)',
  },

  SUB: {
    mnemonic: 'SUB',
    fullName: 'Subtract without Carry',
    fullNameHu: 'Két Regiszter Kivonása',
    category: 'Arithmetic',
    syntax: 'sub Rd, Rr',
    operands: 'Rd ∈ {r0..r31}, Rr ∈ {r0..r31}',
    operandsDesc: 'Rd: Kisebbítendő és Cél, Rr: Kivonandó',
    binaryPattern: '0001 10rd dddd rrrr',
    cycles: 1,
    executionTimeNs: '62.5 ns (@16 MHz)',
    sreg: [
      { flag: 'I', name: 'Global Interrupt', effect: 'unaffected', symbol: '-', description: 'Nem változik' },
      { flag: 'T', name: 'Bit Copy', effect: 'unaffected', symbol: '-', description: 'Nem változik' },
      { flag: 'H', name: 'Half Carry', effect: 'modified', symbol: '↔', description: 'Átvitel a 3. bitről' },
      { flag: 'S', name: 'Sign', effect: 'modified', symbol: '↔', description: 'S = N ⊕ V' },
      { flag: 'V', name: 'Overflow', effect: 'modified', symbol: '↔', description: 'Túlcsordulás' },
      { flag: 'N', name: 'Negative', effect: 'modified', symbol: '↔', description: 'Negatív előjel' },
      { flag: 'Z', name: 'Zero', effect: 'modified', symbol: '↔', description: 'Z = 1 ha Rd == Rr' },
      { flag: 'C', name: 'Carry', effect: 'modified', symbol: '↔', description: 'C = 1 ha Kölcsönkérés' },
    ],
    summaryHu: 'Kivonja Rr tartalmát Rd-ből: Rd ← Rd - Rr 1 ciklus alatt.',
    detailedDescHu: 'Frissíti a Zero és Carry flageket, így közvetlenül használható feltételes elágazások előtt.',
    hardwareNotesHu: 'Ha Rd < Rr, akkor a Carry bit 1 lesz.',
    cEquivalent: 'a -= b;',
    datasheetSection: 'AVR Instruction Set Manual §4.88 (SUB - Subtract without Carry)',
  },

  LDS: {
    mnemonic: 'LDS',
    fullName: 'Load Direct from Data Space',
    fullNameHu: 'Közvetlen Betöltés SRAM Memóriacímről Regiszterbe',
    category: 'Data Transfer',
    syntax: 'lds Rd, k',
    operands: 'Rd ∈ {r0..r31}, k ∈ {0x0000..0xFFFF}',
    operandsDesc: 'Rd: Célregiszter, k: 16-bites SRAM memóriacím (pl. 0x0100 - globális változó)',
    binaryPattern: '1001 000d dddd 0000 [kkkk kkkk kkkk kkkk]',
    cycles: 2,
    executionTimeNs: '125.0 ns (@16 MHz)',
    sreg: [
      { flag: 'I', name: 'Global Interrupt', effect: 'unaffected', symbol: '-', description: 'Nem változik' },
      { flag: 'T', name: 'Bit Copy', effect: 'unaffected', symbol: '-', description: 'Nem változik' },
      { flag: 'H', name: 'Half Carry', effect: 'unaffected', symbol: '-', description: 'Nem változik' },
      { flag: 'S', name: 'Sign', effect: 'unaffected', symbol: '-', description: 'Nem változik' },
      { flag: 'V', name: 'Overflow', effect: 'unaffected', symbol: '-', description: 'Nem változik' },
      { flag: 'N', name: 'Negative', effect: 'unaffected', symbol: '-', description: 'Nem változik' },
      { flag: 'Z', name: 'Zero', effect: 'unaffected', symbol: '-', description: 'Nem változik' },
      { flag: 'C', name: 'Carry', effect: 'unaffected', symbol: '-', description: 'Nem változik' },
    ],
    summaryHu: 'Két szavas (32 bites) utasítás, amely az SRAM belső adatmemória tetszőleges címéről betölt 1 bájtot a célregiszterbe.',
    detailedDescHu:
      'Globális C változók kiolvasásának alapvető gépi kódú utasítása. Az ATmega328P SRAM címei a 0x0100 címen kezdődnek és a 0x08FF címig (2 KB) tartanak.',
    hardwareNotesHu: 'Kétutasításos mérete miatt 4 bájtot foglal a Flash memóriában és 2 ciklusig fut.',
    cEquivalent: 'uint8_t val = myGlobalVariable;',
    datasheetSection: 'AVR Instruction Set Manual §4.55 (LDS - Load Direct from Data Space)',
  },

  STS: {
    mnemonic: 'STS',
    fullName: 'Store Direct to Data Space',
    fullNameHu: 'Közvetlen Kiírás Regiszterből SRAM Memóriacímre',
    category: 'Data Transfer',
    syntax: 'sts k, Rr',
    operands: 'k ∈ {0x0000..0xFFFF}, Rr ∈ {r0..r31}',
    operandsDesc: 'k: 16-bites SRAM memóriacím, Rr: Forrásregiszter',
    binaryPattern: '1001 001r rrrr 0000 [kkkk kkkk kkkk kkkk]',
    cycles: 2,
    executionTimeNs: '125.0 ns (@16 MHz)',
    sreg: [
      { flag: 'I', name: 'Global Interrupt', effect: 'unaffected', symbol: '-', description: 'Nem változik' },
      { flag: 'T', name: 'Bit Copy', effect: 'unaffected', symbol: '-', description: 'Nem változik' },
      { flag: 'H', name: 'Half Carry', effect: 'unaffected', symbol: '-', description: 'Nem változik' },
      { flag: 'S', name: 'Sign', effect: 'unaffected', symbol: '-', description: 'Nem változik' },
      { flag: 'V', name: 'Overflow', effect: 'unaffected', symbol: '-', description: 'Nem változik' },
      { flag: 'N', name: 'Negative', effect: 'unaffected', symbol: '-', description: 'Nem változik' },
      { flag: 'Z', name: 'Zero', effect: 'unaffected', symbol: '-', description: 'Nem változik' },
      { flag: 'C', name: 'Carry', effect: 'unaffected', symbol: '-', description: 'Nem változik' },
    ],
    summaryHu: 'Egy regiszter értékét eltárolja a megadott SRAM memóriacímre (globális változó mentése) 2 ciklus alatt.',
    detailedDescHu:
      'A C fordító változó-értékadásoknál generálja ezt az utasítást, vagy kibővített periféria regiszterek (pl. UBRR0, TIMSK1) beállításakor.',
    hardwareNotesHu: 'Két szavas utasítás (4 bájt FLASH).',
    cEquivalent: 'myGlobalVariable = val;',
    datasheetSection: 'AVR Instruction Set Manual §4.87 (STS - Store Direct to Data Space)',
  },
};

// --------------------------------------------------------------------------------------
// HARDWARE PERIPHERAL REGISTER DATABASE (ATmega328P)
// --------------------------------------------------------------------------------------
export const ATMEGA328P_REGISTERS: Record<string, HardwareRegisterDoc> = {
  PORTB: {
    name: 'PORTB (Port B Data Register)',
    addressIoHex: '0x05',
    addressMemHex: '0x25',
    descriptionHu: 'Digitális kimeneti jelszintek (HIGH/LOW) vagy bemeneti felhúzó ellenállások (Pull-up) vezérlése D8..D13 lábakon.',
    bitDefinitions: [
      { bit: 0, name: 'PORTB0', desc: 'Arduino D8 láb (ICP1)' },
      { bit: 1, name: 'PORTB1', desc: 'Arduino D9 láb (OC1A - PWM)' },
      { bit: 2, name: 'PORTB2', desc: 'Arduino D10 láb (SS / OC1B - PWM)' },
      { bit: 3, name: 'PORTB3', desc: 'Arduino D11 láb (MOSI / OC2A - PWM)' },
      { bit: 4, name: 'PORTB4', desc: 'Arduino D12 láb (MISO)' },
      { bit: 5, name: 'PORTB5', desc: 'Arduino D13 láb (SCK / Beépített LED)' },
      { bit: 6, name: 'PORTB6', desc: 'TOSC1 / Kristály XTAL1' },
      { bit: 7, name: 'PORTB7', desc: 'TOSC2 / Kristály XTAL2' },
    ],
    electricalNotes: 'Maximális forrás/nyelő áram: 40 mA lábanként, 200 mA összesített tok-áram.',
  },
  DDRB: {
    name: 'DDRB (Port B Data Direction Register)',
    addressIoHex: '0x04',
    addressMemHex: '0x24',
    descriptionHu: 'D8..D13 lábak adatirányának beállítása: 1 = OUTPUT (Kimenet), 0 = INPUT (Bemenet).',
    bitDefinitions: [
      { bit: 0, name: 'DDB0', desc: 'D8 irány (1: Kimenet, 0: Bemenet)' },
      { bit: 1, name: 'DDB1', desc: 'D9 irány' },
      { bit: 2, name: 'DDB2', desc: 'D10 irány' },
      { bit: 3, name: 'DDB3', desc: 'D11 irány' },
      { bit: 4, name: 'DDB4', desc: 'D12 irány' },
      { bit: 5, name: 'DDB5', desc: 'D13 irány (LED kimenet)' },
      { bit: 6, name: 'DDB6', desc: 'XTAL1 irány' },
      { bit: 7, name: 'DDB7', desc: 'XTAL2 irány' },
    ],
    electricalNotes: 'Reset után minden bit 0 (nagy impedanciás lebegő bemenet).',
  },
  PINB: {
    name: 'PINB (Port B Input Pins Address)',
    addressIoHex: '0x03',
    addressMemHex: '0x23',
    descriptionHu: 'D8..D13 lábak valós digitális feszültségszintjének közvetlen beolvasása. 1-es írásakor átbillenti (toggle) a kimenetet!',
    bitDefinitions: [
      { bit: 0, name: 'PINB0', desc: 'D8 aktuális logikai szint (0: 0V, 1: 5V)' },
      { bit: 1, name: 'PINB1', desc: 'D9 szint' },
      { bit: 2, name: 'PINB2', desc: 'D10 szint' },
      { bit: 3, name: 'PINB3', desc: 'D11 szint' },
      { bit: 4, name: 'PINB4', desc: 'D12 szint' },
      { bit: 5, name: 'PINB5', desc: 'D13 szint' },
      { bit: 6, name: 'PINB6', desc: 'XTAL1 szint' },
      { bit: 7, name: 'PINB7', desc: 'XTAL2 szint' },
    ],
  },
  PORTD: {
    name: 'PORTD (Port D Data Register)',
    addressIoHex: '0x0B',
    addressMemHex: '0x2B',
    descriptionHu: 'D0..D7 lábak (UART TX/RX, INT0/1, PWM) logikai szintje és felhúzó ellenállásai.',
    bitDefinitions: [
      { bit: 0, name: 'PORTD0', desc: 'D0 (RXD) adat' },
      { bit: 1, name: 'PORTD1', desc: 'D1 (TXD) adat' },
      { bit: 2, name: 'PORTD2', desc: 'D2 (INT0) adat' },
      { bit: 3, name: 'PORTD3', desc: 'D3 (INT1/OC2B) adat' },
      { bit: 4, name: 'PORTD4', desc: 'D4 (T0/XCK) adat' },
      { bit: 5, name: 'PORTD5', desc: 'D5 (T1/OC0B) adat' },
      { bit: 6, name: 'PORTD6', desc: 'D6 (AIN0/OC0A) adat' },
      { bit: 7, name: 'PORTD7', desc: 'D7 (AIN1) adat' },
    ],
  },
  DDRD: {
    name: 'DDRD (Port D Data Direction Register)',
    addressIoHex: '0x0A',
    addressMemHex: '0x2A',
    descriptionHu: 'D0..D7 lábak adatirány-beállítása (1 = OUTPUT, 0 = INPUT).',
    bitDefinitions: [
      { bit: 0, name: 'DDD0', desc: 'D0 irány' },
      { bit: 1, name: 'DDD1', desc: 'D1 irány' },
      { bit: 2, name: 'DDD2', desc: 'D2 irány' },
      { bit: 3, name: 'DDD3', desc: 'D3 irány' },
      { bit: 4, name: 'DDD4', desc: 'D4 irány' },
      { bit: 5, name: 'DDD5', desc: 'D5 irány' },
      { bit: 6, name: 'DDD6', desc: 'D6 irány' },
      { bit: 7, name: 'DDD7', desc: 'D7 irány' },
    ],
  },
  PIND: {
    name: 'PIND (Port D Input Pins Address)',
    addressIoHex: '0x09',
    addressMemHex: '0x29',
    descriptionHu: 'D0..D7 lábak bemeneti jelszintje.',
    bitDefinitions: [
      { bit: 0, name: 'PIND0', desc: 'D0 szint' },
      { bit: 1, name: 'PIND1', desc: 'D1 szint' },
      { bit: 2, name: 'PIND2', desc: 'D2 szint' },
      { bit: 3, name: 'PIND3', desc: 'D3 szint' },
      { bit: 4, name: 'PIND4', desc: 'D4 szint' },
      { bit: 5, name: 'PIND5', desc: 'D5 szint' },
      { bit: 6, name: 'PIND6', desc: 'D6 szint' },
      { bit: 7, name: 'PIND7', desc: 'D7 szint' },
    ],
  },
  UDR0: {
    name: 'UDR0 (USART0 I/O Data Register)',
    addressIoHex: '0xC6',
    addressMemHex: '0x00C6',
    descriptionHu: 'Soros UART0 adó és vevő adatpuffer. Ide írt bájt azonnal elküldésre kerül a TXD (D1) lábon.',
    bitDefinitions: [
      { bit: 0, name: 'TXB/RXB0', desc: '0. adatbit' },
      { bit: 7, name: 'TXB/RXB7', desc: '7. adatbit (MSB)' },
    ],
  },
  UBRR0: {
    name: 'UBRR0H/L (USART0 Baud Rate Register)',
    addressIoHex: '0xC4/0xC5',
    addressMemHex: '0x00C4',
    descriptionHu: 'Baud ráta generátor osztó regiszter. UBRR = (16 MHz / (16 * Baud)) - 1. (pl. 9600 baudnál UBRR=103).',
    bitDefinitions: [{ bit: 0, name: 'UBRR[11:0]', desc: '12 bites baud ráta osztó' }],
  },
};

/**
 * Calculates synthetic 16-bit binary opcode for an instruction with given operands
 */
export function calculateOpcodeBinary(mnemonic: string, params: Record<string, any>): { hex: string; bin: string } {
  const m = mnemonic.toUpperCase().trim();

  if (m === 'SBI' || m === 'CBI') {
    const pin = (params.pin || '13') as ArduinoPin;
    const mapping = PIN_MAPPINGS[pin] || PIN_MAPPINGS['13'];
    const portAddrVal = parseInt(mapping.portAddr || '0x05', 16);
    const bitVal = mapping.bit || 0;
    const isSbi = m === 'SBI';

    // SBI: 1001 1010 AAAA Abbb (0x9A00 | (A << 3) | b)
    // CBI: 1001 1000 AAAA Abbb (0x9800 | (A << 3) | b)
    const base = isSbi ? 0x9a00 : 0x9800;
    const op = base | ((portAddrVal & 0x1f) << 3) | (bitVal & 0x07);
    const hex = '0x' + op.toString(16).toUpperCase().padStart(4, '0');
    const bin = op.toString(2).padStart(16, '0').match(/.{1,4}/g)?.join(' ') || '';
    return { hex, bin };
  }

  if (m === 'LDI') {
    const regNum = parseInt(String(params.reg || '16').replace('r', ''), 10) || 16;
    const dVal = (regNum - 16) & 0x0f;
    const kVal = (parseInt(String(params.value || '0'), 10) || 0) & 0xff;
    // 1110 KKKK dddd KKKK -> (0xE000 | ((k & 0xF0) << 4) | (d << 4) | (k & 0x0F))
    const op = 0xe000 | ((kVal & 0xf0) << 4) | (dVal << 4) | (kVal & 0x0f);
    const hex = '0x' + op.toString(16).toUpperCase().padStart(4, '0');
    const bin = op.toString(2).padStart(16, '0').match(/.{1,4}/g)?.join(' ') || '';
    return { hex, bin };
  }

  if (m === 'NOP') {
    return { hex: '0x0000', bin: '0000 0000 0000 0000' };
  }

  if (m === 'SEI') {
    return { hex: '0x9478', bin: '1001 0100 0111 1000' };
  }

  if (m === 'CLI') {
    return { hex: '0x94F8', bin: '1001 0100 1111 1000' };
  }

  if (m === 'RET') {
    return { hex: '0x9508', bin: '1001 0101 0000 1000' };
  }

  if (m === 'RJMP') {
    return { hex: '0xC000', bin: '1100 0000 0000 0000' };
  }

  return { hex: '0x9000', bin: '1001 0000 0000 0000' };
}

/**
 * Returns comprehensive AVR inspection analysis for a given block
 */
export function getAvrDocsForBlock(block: ProgramBlock, _allBlocks: ProgramBlock[] = []): BlockAvrInspection {
  const def = BLOCK_DEFINITIONS[block.type];
  const params = block.params || {};

  const blockName = def?.name || block.type;
  const category = def?.category || 'io';
  const cycles = def ? def.calculateCycles(params) : 1;
  const timeNs = cycles * CYCLE_NS;
  const cCode = def ? def.generateC(params) : [];
  const asmLines = def ? def.generateAsm(params, 'ins') : [];

  // Determine primary mnemonic
  let primaryMnemonic = 'NOP';
  if (block.type === 'io_pin_mode') {
    primaryMnemonic = params.mode === 'OUTPUT' ? 'SBI' : 'CBI';
  } else if (block.type === 'io_pin_write') {
    primaryMnemonic = params.state === 'HIGH' ? 'SBI' : 'CBI';
  } else if (block.type === 'reg_ldi') {
    primaryMnemonic = 'LDI';
  } else if (block.type === 'timing_nop') {
    primaryMnemonic = 'NOP';
  } else if (block.type === 'interrupt_sei') {
    primaryMnemonic = 'SEI';
  } else if (block.type === 'interrupt_cli') {
    primaryMnemonic = 'CLI';
  } else if (block.type.includes('rjmp') || block.type.includes('goto')) {
    primaryMnemonic = 'RJMP';
  } else if (block.type.includes('rcall')) {
    primaryMnemonic = 'RCALL';
  } else if (block.type.includes('ret')) {
    primaryMnemonic = 'RET';
  } else if (block.type.includes('add')) {
    primaryMnemonic = 'ADD';
  } else if (block.type.includes('sub')) {
    primaryMnemonic = 'SUB';
  } else if (block.type.includes('cpi') || block.type.includes('compare')) {
    primaryMnemonic = 'CPI';
  } else if (block.type.includes('breq')) {
    primaryMnemonic = 'BREQ';
  } else if (block.type.includes('brne')) {
    primaryMnemonic = 'BRNE';
  } else if (block.type.includes('uart_init') || block.type.includes('uart_write')) {
    primaryMnemonic = 'STS';
  } else {
    primaryMnemonic = 'LDI';
  }

  const datasheetDoc = AVR_INSTRUCTION_DATABASE[primaryMnemonic] || AVR_INSTRUCTION_DATABASE.NOP;

  // Build instruction breakdown
  const instructions = asmLines
    .filter((l) => l.trim() && !l.trim().startsWith(';'))
    .map((asmLine) => {
      const parts = asmLine.trim().split(/\s+/);
      const m = parts[0]?.toUpperCase() || primaryMnemonic;
      const opc = calculateOpcodeBinary(m, params);
      const is2Cyc = m === 'SBI' || m === 'CBI' || m === 'RJMP' || m === 'LDS' || m === 'STS';
      const c = is2Cyc ? 2 : 1;
      return {
        asmLine,
        mnemonic: m,
        opcodeHex: opc.hex,
        binary16: opc.bin,
        cycles: c,
        timeNs: c * CYCLE_NS,
        explanation: `${m} gépi utasítás (${c} óraciklus, ${c * CYCLE_NS} ns)`,
      };
    });

  if (instructions.length === 0) {
    const opc = calculateOpcodeBinary(primaryMnemonic, params);
    instructions.push({
      asmLine: `${primaryMnemonic.toLowerCase()} ...`,
      mnemonic: primaryMnemonic,
      opcodeHex: opc.hex,
      binary16: opc.bin,
      cycles,
      timeNs,
      explanation: `${primaryMnemonic} utasítás`,
    });
  }

  // Determine affected hardware registers
  const hardwareRegisters: HardwareRegisterDoc[] = [];
  const affectedRegisters: string[] = [];

  if (params.pin) {
    const pin = String(params.pin) as ArduinoPin;
    const mapping = PIN_MAPPINGS[pin];
    if (mapping) {
      if (block.type === 'io_pin_mode') {
        const regDoc = ATMEGA328P_REGISTERS[mapping.ddr];
        if (regDoc) hardwareRegisters.push(regDoc);
        affectedRegisters.push(mapping.ddr);
      } else {
        const regDoc = ATMEGA328P_REGISTERS[mapping.port];
        if (regDoc) hardwareRegisters.push(regDoc);
        affectedRegisters.push(mapping.port);
      }
    }
  }

  if (block.type.startsWith('protocol_uart')) {
    hardwareRegisters.push(ATMEGA328P_REGISTERS.UDR0);
    hardwareRegisters.push(ATMEGA328P_REGISTERS.UBRR0);
    affectedRegisters.push('UDR0', 'UBRR0', 'UCSR0A');
  }

  if (params.reg) {
    affectedRegisters.push(String(params.reg).toUpperCase());
  }

  let avrGccMacro = '';
  if (block.type === 'io_pin_mode') {
    const pin = (params.pin || '13') as ArduinoPin;
    const mapping = PIN_MAPPINGS[pin] || PIN_MAPPINGS['13'];
    avrGccMacro =
      params.mode === 'OUTPUT'
        ? `${mapping.ddr} |= (1 << ${mapping.bit}); // DDR kimenet`
        : `${mapping.ddr} &= ~(1 << ${mapping.bit}); // DDR bemenet`;
  } else if (block.type === 'io_pin_write') {
    const pin = (params.pin || '13') as ArduinoPin;
    const mapping = PIN_MAPPINGS[pin] || PIN_MAPPINGS['13'];
    avrGccMacro =
      params.state === 'HIGH'
        ? `${mapping.port} |= (1 << ${mapping.bit}); // 5V HIGH`
        : `${mapping.port} &= ~(1 << ${mapping.bit}); // 0V LOW`;
  } else {
    avrGccMacro = cCode[0] || '// Nincs közvetlen makró';
  }

  let hardwareTipHu = datasheetDoc.hardwareNotesHu;
  let safetyAlertHu: string | undefined = undefined;

  if (block.type === 'io_pin_write' && params.state === 'HIGH') {
    safetyAlertHu =
      'FIGYELEM: Kimeneti lábra közvetlenül rákötött LED esetén mindig használj legalább 220 Ω előtét-ellenállást, hogy az áram ne lépje túl a 20 mA biztonságos határt!';
  }

  return {
    blockId: block.id,
    blockType: block.type,
    blockName,
    category,
    scope: block.scope,
    primaryMnemonic,
    instructions,
    totalCycles: cycles,
    totalTimeNs: timeNs,
    affectedRegisters,
    hardwareRegisters,
    sregState: datasheetDoc.sreg,
    datasheetDoc,
    cCode,
    avrGccMacro,
    hardwareTipHu,
    safetyAlertHu,
  };
}
