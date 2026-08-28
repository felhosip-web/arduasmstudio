/**
 * (c) 2026 AI Studio AVR & ESP32 Visual Studio
 * ESP32-WROOM-32 Hardware Specification & Xtensa LX6 Dual-Core Architecture Map
 */

export type Esp32PinName =
  | '0' | '2' | '4' | '5' | '12' | '13' | '14' | '15' | '16' | '17'
  | '18' | '19' | '21' | '22' | '23' | '25' | '26' | '27' | '32' | '33'
  | '34' | '35' | '36' | '39';

export interface Esp32PinDefinition {
  gpio: number;
  pinLabel: string;
  name: string;
  type: 'IO' | 'INPUT_ONLY' | 'ANALOG' | 'STRAPPING';
  adcChannel?: string; // ADC1_CH0..7, ADC2_CH0..9
  dacChannel?: string; // DAC1, DAC2
  touchChannel?: string; // TOUCH0..9
  spiFunction?: string; // VSPI / HSPI MOSI, MISO, SCK, CS
  i2cFunction?: string; // SDA, SCL
  uartFunction?: string; // TX, RX
  pwmChannel?: string; // LEDC CH0..15
  builtinLed?: boolean;
  strappingWarning?: string;
  description: string;
}

export const ESP32_CLOCK_HZ = 240000000; // 240 MHz
export const ESP32_CLOCK_MHZ = 240;
export const ESP32_CYCLE_NS = 4.166667; // 1 cycle at 240MHz = 4.167 ns

export const ESP32_PINS_ORDER: Esp32PinName[] = [
  '0', '2', '4', '5', '12', '13', '14', '15',
  '16', '17', '18', '19', '21', '22', '23',
  '25', '26', '27', '32', '33', '34', '35', '36', '39',
];

export const ESP32_PIN_MAPPINGS: Record<Esp32PinName, Esp32PinDefinition> = {
  '0': {
    gpio: 0,
    pinLabel: 'GPIO0',
    name: 'Boot / Touch 1',
    type: 'STRAPPING',
    adcChannel: 'ADC2_CH1',
    touchChannel: 'TOUCH1',
    pwmChannel: 'LEDC0',
    strappingWarning: 'Alacsony szint indításkor -> Letöltési/Bootloader mód',
    description: 'Boot gomb & GPIO0 belső felhúzással (Pull-Up)',
  },
  '2': {
    gpio: 2,
    pinLabel: 'GPIO2',
    name: 'Beépített Kék LED',
    type: 'IO',
    adcChannel: 'ADC2_CH2',
    touchChannel: 'TOUCH2',
    pwmChannel: 'LEDC1',
    builtinLed: true,
    strappingWarning: 'Bootoláskor LOW szinten kell lennie az SPI flashhez',
    description: 'Beépített LED és általános nagysebességű digitális I/O',
  },
  '4': {
    gpio: 4,
    pinLabel: 'GPIO4',
    name: 'Touch 0 / ADC2',
    type: 'IO',
    adcChannel: 'ADC2_CH0',
    touchChannel: 'TOUCH0',
    pwmChannel: 'LEDC2',
    description: 'Kapacitív érintésérzékelő és 12-bites analóg bemenet',
  },
  '5': {
    gpio: 5,
    pinLabel: 'GPIO5',
    name: 'VSPI CS0 / SS',
    type: 'STRAPPING',
    spiFunction: 'VSPI CS',
    pwmChannel: 'LEDC3',
    description: 'Alapértelmezett hardveres SPI Chip Select vonal',
  },
  '12': {
    gpio: 12,
    pinLabel: 'GPIO12',
    name: 'Touch 5 / HSPI MISO',
    type: 'STRAPPING',
    adcChannel: 'ADC2_CH5',
    touchChannel: 'TOUCH5',
    spiFunction: 'HSPI MISO',
    pwmChannel: 'LEDC4',
    strappingWarning: 'MTDI: Flash feszültség kiválasztó bootkor',
    description: 'HSPI MISO és érintésérzékelő',
  },
  '13': {
    gpio: 13,
    pinLabel: 'GPIO13',
    name: 'Touch 4 / HSPI MOSI',
    type: 'IO',
    adcChannel: 'ADC2_CH4',
    touchChannel: 'TOUCH4',
    spiFunction: 'HSPI MOSI',
    pwmChannel: 'LEDC5',
    description: 'HSPI MOSI és érintésérzékelő',
  },
  '14': {
    gpio: 14,
    pinLabel: 'GPIO14',
    name: 'Touch 6 / HSPI SCK',
    type: 'IO',
    adcChannel: 'ADC2_CH6',
    touchChannel: 'TOUCH6',
    spiFunction: 'HSPI SCK',
    pwmChannel: 'LEDC6',
    description: 'HSPI Órajel kimenet',
  },
  '15': {
    gpio: 15,
    pinLabel: 'GPIO15',
    name: 'Touch 3 / HSPI CS',
    type: 'STRAPPING',
    adcChannel: 'ADC2_CH3',
    touchChannel: 'TOUCH3',
    spiFunction: 'HSPI CS',
    pwmChannel: 'LEDC7',
    strappingWarning: 'MTDO: Boot naplózás engedélyező láb',
    description: 'HSPI Chip Select',
  },
  '16': {
    gpio: 16,
    pinLabel: 'GPIO16',
    name: 'UART2 RX',
    type: 'IO',
    uartFunction: 'UART2 RX',
    pwmChannel: 'LEDC8',
    description: 'Második hardveres soros port RX bemenete',
  },
  '17': {
    gpio: 17,
    pinLabel: 'GPIO17',
    name: 'UART2 TX',
    type: 'IO',
    uartFunction: 'UART2 TX',
    pwmChannel: 'LEDC9',
    description: 'Második hardveres soros port TX kimenete',
  },
  '18': {
    gpio: 18,
    pinLabel: 'GPIO18',
    name: 'VSPI SCK',
    type: 'IO',
    spiFunction: 'VSPI SCK',
    pwmChannel: 'LEDC10',
    description: 'Nagysebességű SPI órajel (akár 80 MHz)',
  },
  '19': {
    gpio: 19,
    pinLabel: 'GPIO19',
    name: 'VSPI MISO',
    type: 'IO',
    spiFunction: 'VSPI MISO',
    pwmChannel: 'LEDC11',
    description: 'SPI Master In Slave Out adatvonal',
  },
  '21': {
    gpio: 21,
    pinLabel: 'GPIO21',
    name: 'I2C SDA',
    type: 'IO',
    i2cFunction: 'I2C SDA',
    pwmChannel: 'LEDC12',
    description: 'Elsődleges I2C Soros Adatvonal (Hardveres Fast-Mode 400kHz)',
  },
  '22': {
    gpio: 22,
    pinLabel: 'GPIO22',
    name: 'I2C SCL',
    type: 'IO',
    i2cFunction: 'I2C SCL',
    pwmChannel: 'LEDC13',
    description: 'Elsődleges I2C Soros Órajelvonal',
  },
  '23': {
    gpio: 23,
    pinLabel: 'GPIO23',
    name: 'VSPI MOSI',
    type: 'IO',
    spiFunction: 'VSPI MOSI',
    pwmChannel: 'LEDC14',
    description: 'SPI Master Out Slave In adatvonal',
  },
  '25': {
    gpio: 25,
    pinLabel: 'GPIO25',
    name: 'DAC1 / Analóg Kimenet 1',
    type: 'ANALOG',
    dacChannel: 'DAC1 (8-bit)',
    adcChannel: 'ADC2_CH8',
    description: 'Valódi hardveres 8-bites D/A konverter feszültség kimenet (0-3.3V)',
  },
  '26': {
    gpio: 26,
    pinLabel: 'GPIO26',
    name: 'DAC2 / Analóg Kimenet 2',
    type: 'ANALOG',
    dacChannel: 'DAC2 (8-bit)',
    adcChannel: 'ADC2_CH9',
    description: 'Valódi másodlagos analóg feszültség generátor (Audio/Sine)',
  },
  '27': {
    gpio: 27,
    pinLabel: 'GPIO27',
    name: 'Touch 7 / ADC2_CH7',
    type: 'IO',
    adcChannel: 'ADC2_CH7',
    touchChannel: 'TOUCH7',
    pwmChannel: 'LEDC15',
    description: 'Kapacitív érintés és analóg bemenet',
  },
  '32': {
    gpio: 32,
    pinLabel: 'GPIO32',
    name: 'Touch 9 / ADC1_CH4',
    type: 'IO',
    adcChannel: 'ADC1_CH4',
    touchChannel: 'TOUCH9',
    description: 'ADC1 csatorna (WiFi közben is megbízhatóan működik!)',
  },
  '33': {
    gpio: 33,
    pinLabel: 'GPIO33',
    name: 'Touch 8 / ADC1_CH5',
    type: 'IO',
    adcChannel: 'ADC1_CH5',
    touchChannel: 'TOUCH8',
    description: 'ADC1 analóg és érintés láb',
  },
  '34': {
    gpio: 34,
    pinLabel: 'GPIO34',
    name: 'ADC1_CH6 (Csak Bemenet)',
    type: 'INPUT_ONLY',
    adcChannel: 'ADC1_CH6',
    description: 'Csak bemenetként használható, nincs belső felhúzó/lehúzó ellenállás',
  },
  '35': {
    gpio: 35,
    pinLabel: 'GPIO35',
    name: 'ADC1_CH7 (Csak Bemenet)',
    type: 'INPUT_ONLY',
    adcChannel: 'ADC1_CH7',
    description: 'Csak bemenetként használható 12-bites analóg vonal',
  },
  '36': {
    gpio: 36,
    pinLabel: 'GPIO36',
    name: 'SENSOR_VP / ADC1_CH0',
    type: 'INPUT_ONLY',
    adcChannel: 'ADC1_CH0',
    description: 'Nagypontosságú bemeneti ADC vonal alacsony zajszintű előerősítővel',
  },
  '39': {
    gpio: 39,
    pinLabel: 'GPIO39',
    name: 'SENSOR_VN / ADC1_CH3',
    type: 'INPUT_ONLY',
    adcChannel: 'ADC1_CH3',
    description: 'Nagypontosságú negatív bemenet',
  },
};

export interface XtensaInstructionDoc {
  opcode: string;
  name: string;
  category: 'ALU' | 'LOAD_STORE' | 'BRANCH' | 'LOOP' | 'WINDOW' | 'SPECIAL';
  syntax: string;
  cycles: number;
  description: string;
  operation: string;
}

export const XTENSA_INSTRUCTION_CATALOG: XtensaInstructionDoc[] = [
  {
    opcode: 'movi.n',
    name: 'Move 7-bit Signed Immediate (Narrow)',
    category: 'ALU',
    syntax: 'movi.n ar, imm7',
    cycles: 1,
    description: 'Közvetlen előjeles 7-bites konstans betöltése az ar címregiszterbe 16-bites sűrített utasítással.',
    operation: 'ar = sign_extend(imm7)',
  },
  {
    opcode: 'movi',
    name: 'Move 12-bit Signed Immediate',
    category: 'ALU',
    syntax: 'movi ar, imm12',
    cycles: 1,
    description: '12-bites konstans betöltése az ar munkaregiszterbe.',
    operation: 'ar = sign_extend(imm12)',
  },
  {
    opcode: 'l32i.n',
    name: 'Load 32-bit Word (Narrow)',
    category: 'LOAD_STORE',
    syntax: 'l32i.n ar, as, offset4',
    cycles: 1,
    description: '32-bites szó betöltése a memóriából vagy memóriatérképezett I/O perifériaregiszterből.',
    operation: 'ar = Mem32[as + (offset4 << 2)]',
  },
  {
    opcode: 's32i.n',
    name: 'Store 32-bit Word (Narrow)',
    category: 'LOAD_STORE',
    syntax: 's32i.n ar, as, offset4',
    cycles: 1,
    description: '32-bites regiszter tartalmának kiírása a memóriába vagy GPIO_OUT_W1TS regiszterbe 4.16 ns alatt.',
    operation: 'Mem32[as + (offset4 << 2)] = ar',
  },
  {
    opcode: 'memw',
    name: 'Memory Wave / Synchronization Barrier',
    category: 'SPECIAL',
    syntax: 'memw',
    cycles: 1,
    description: 'Memória szinkronizációs korlát, garantálja hogy minden korábbi memória és I/O művelet befejeződött.',
    operation: 'Flush load/store buffer & pipeline sync',
  },
  {
    opcode: 'add.n',
    name: 'Add 32-bit (Narrow)',
    category: 'ALU',
    syntax: 'add.n ar, as, at',
    cycles: 1,
    description: 'Két 32-bites regiszter összeadása egyetlen 4.16 ns-os óraciklus alatt.',
    operation: 'ar = as + at',
  },
  {
    opcode: 'sub',
    name: 'Subtract 32-bit',
    category: 'ALU',
    syntax: 'sub ar, as, at',
    cycles: 1,
    description: 'Két 32-bites regiszter kivonása.',
    operation: 'ar = as - at',
  },
  {
    opcode: 'bnez',
    name: 'Branch if Not Equal to Zero',
    category: 'BRANCH',
    syntax: 'bnez as, label',
    cycles: 1, // 1 on not-taken, 2-3 on branch taken
    description: 'Feltételes elágazás a megadott címkére, ha az as regiszter értéke nem nulla.',
    operation: 'if (as != 0) PC += offset',
  },
  {
    opcode: 'beqz',
    name: 'Branch if Equal to Zero',
    category: 'BRANCH',
    syntax: 'beqz as, label',
    cycles: 1,
    description: 'Feltételes ugrás nullára.',
    operation: 'if (as == 0) PC += offset',
  },
  {
    opcode: 'call0',
    name: 'Direct Call without Register Windowing',
    category: 'BRANCH',
    syntax: 'call0 target',
    cycles: 2,
    description: 'Közvetlen függvényhívás standard hívási konvencióval, a visszatérési cím az a0 regiszterbe kerül.',
    operation: 'a0 = PC + 3; PC = target',
  },
  {
    opcode: 'call4',
    name: 'Windowed Subroutine Call (Window Rotate 4)',
    category: 'WINDOW',
    syntax: 'call4 target',
    cycles: 3,
    description: 'Xtensa regiszterablak elforgatása 4 regiszterrel és ugrás az alprogramra.',
    operation: 'WindowBase += 1; a4 = PC + 3; PC = target',
  },
  {
    opcode: 'entry',
    name: 'Windowed Subroutine Entry',
    category: 'WINDOW',
    syntax: 'entry ar, frame_size',
    cycles: 3,
    description: 'Alprogram belépési pont, inicializálja az új veremkeretet és regiszterablakot.',
    operation: 'Alloc stack frame & setup Windowed ABI',
  },
  {
    opcode: 'retw.n',
    name: 'Windowed Return (Narrow)',
    category: 'WINDOW',
    syntax: 'retw.n',
    cycles: 2,
    description: 'Visszatérés ablakozott alprogramból és a korábbi regiszterablak visszaállítása.',
    operation: 'WindowBase -= CallerRotation; PC = a0',
  },
  {
    opcode: 'rsr',
    name: 'Read Special Register',
    category: 'SPECIAL',
    syntax: 'rsr ar, CCOUNT',
    cycles: 1,
    description: 'Belső speciális hardverregiszter kiolvasása (pl. CCOUNT 240MHz valós idejű óraciklus-számláló).',
    operation: 'ar = SpecialRegister[CCOUNT]',
  },
  {
    opcode: 'wsr',
    name: 'Write Special Register',
    category: 'SPECIAL',
    syntax: 'wsr ar, VECBASE',
    cycles: 1,
    description: 'Speciális rendszerregiszter beállítása.',
    operation: 'SpecialRegister[VECBASE] = ar',
  },
];
