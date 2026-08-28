import { AvrInterruptVectorId, AvrInterruptVectorInfo, AvrInterruptConfig, AvrExtIntTriggerMode, ArduinoPin } from '../types';

export const ATMEGA328P_INTERRUPT_VECTORS: AvrInterruptVectorInfo[] = [
  {
    id: 'RESET',
    vectorNum: 1,
    vectorName: '__vector_default (RESET)',
    programAddressHex: '0x0000',
    source: 'Power-on, Brown-out & Watchdog Reset',
    description: 'A mikrokontroller hardveres újraindulási pontja. A Flash 0x0000 címére ugrik bekapcsoláskor vagy Reset gomb lenyomásakor.',
    category: 'system',
    registers: [
      { name: 'MCUSR', bit: 'PORF/BORF/EXTRF', addressHex: '0x34', description: 'MCU Status Register reset flag bitek' },
    ],
  },
  {
    id: 'INT0',
    vectorNum: 2,
    vectorName: 'INT0_vect',
    programAddressHex: '0x0002',
    source: 'External Interrupt Request 0 (Pin D2 / PD2)',
    description: 'Külső hardveres megszakítás a D2 (PD2) lábon. Kezelhető lefutó él (falling), felfutó él (rising), állapotváltozás (any change) vagy alacsony szint (low level) alapján.',
    category: 'external',
    associatedPins: ['2'],
    registers: [
      { name: 'EIMSK', bit: 'INT0 (bit 0)', addressHex: '0x1D (0x3D)', description: 'External Interrupt Mask Register - INT0 engedélyezése' },
      { name: 'EICRA', bit: 'ISC01, ISC00 (bit 1:0)', addressHex: '0x69', description: 'External Interrupt Control Register A - INT0 élérzékelés módja' },
      { name: 'EIFR', bit: 'INTF0 (bit 0)', addressHex: '0x1C (0x3C)', description: 'External Interrupt Flag Register - Megszakításjelző' },
    ],
  },
  {
    id: 'INT1',
    vectorNum: 3,
    vectorName: 'INT1_vect',
    programAddressHex: '0x0004',
    source: 'External Interrupt Request 1 (Pin D3 / PD3)',
    description: 'Külső hardveres megszakítás a D3 (PD3) lábon. Gyors külső szenzorokhoz, enkóderekhez és vészleállító gombokhoz.',
    category: 'external',
    associatedPins: ['3'],
    registers: [
      { name: 'EIMSK', bit: 'INT1 (bit 1)', addressHex: '0x1D (0x3D)', description: 'External Interrupt Mask Register - INT1 engedélyezése' },
      { name: 'EICRA', bit: 'ISC11, ISC10 (bit 3:2)', addressHex: '0x69', description: 'External Interrupt Control Register A - INT1 élérzékelés módja' },
      { name: 'EIFR', bit: 'INTF1 (bit 1)', addressHex: '0x1C (0x3C)', description: 'External Interrupt Flag Register - Megszakításjelző' },
    ],
  },
  {
    id: 'PCINT0',
    vectorNum: 4,
    vectorName: 'PCINT0_vect',
    programAddressHex: '0x0006',
    source: 'Pin Change Interrupt Request 0 (Port B: D8 - D13)',
    description: 'Lábváltozás megszakítás a PORTB lábak bármelyikén (D8-D13, PB0-PB5). A kiválasztott lábak bármilyen állapotváltozása kiváltja.',
    category: 'external',
    associatedPins: ['8', '9', '10', '11', '12', '13'],
    registers: [
      { name: 'PCICR', bit: 'PCIE0 (bit 0)', addressHex: '0x68', description: 'Pin Change Interrupt Control Register - Port B csoport engedélyezése' },
      { name: 'PCMSK0', bit: 'PCINT0..5', addressHex: '0x6B', description: 'Pin Change Mask Register 0 - Egyedi lábak maszkolása' },
      { name: 'PCIFR', bit: 'PCIF0 (bit 0)', addressHex: '0x1B (0x3B)', description: 'Pin Change Interrupt Flag Register' },
    ],
  },
  {
    id: 'PCINT1',
    vectorNum: 5,
    vectorName: 'PCINT1_vect',
    programAddressHex: '0x0008',
    source: 'Pin Change Interrupt Request 1 (Port C: A0 - A5)',
    description: 'Lábváltozás megszakítás a PORTC lábakon (A0-A5, PC0-PC5). Gombmátrixokhoz és analóg porton digitálisan olvasott bemenetekhez.',
    category: 'external',
    associatedPins: ['A0', 'A1', 'A2', 'A3', 'A4', 'A5'],
    registers: [
      { name: 'PCICR', bit: 'PCIE1 (bit 1)', addressHex: '0x68', description: 'Pin Change Interrupt Control Register - Port C csoport engedélyezése' },
      { name: 'PCMSK1', bit: 'PCINT8..13', addressHex: '0x6C', description: 'Pin Change Mask Register 1 - Egyedi analóg lábak maszkolása' },
    ],
  },
  {
    id: 'PCINT2',
    vectorNum: 6,
    vectorName: 'PCINT2_vect',
    programAddressHex: '0x000A',
    source: 'Pin Change Interrupt Request 2 (Port D: D0 - D7)',
    description: 'Lábváltozás megszakítás a PORTD lábakon (D0-D7, PD0-PD7). Nagy sűrűségű digitális bemenetek figyelésére.',
    category: 'external',
    associatedPins: ['0', '1', '2', '3', '4', '5', '6', '7'],
    registers: [
      { name: 'PCICR', bit: 'PCIE2 (bit 2)', addressHex: '0x68', description: 'Pin Change Interrupt Control Register - Port D csoport engedélyezése' },
      { name: 'PCMSK2', bit: 'PCINT16..23', addressHex: '0x6D', description: 'Pin Change Mask Register 2 - D0-D7 lábak maszkolása' },
    ],
  },
  {
    id: 'WDT',
    vectorNum: 7,
    vectorName: 'WDT_vect',
    programAddressHex: '0x000C',
    source: 'Watchdog Timer Interrupt',
    description: 'Watchdog időzítő lejárati megszakítás (16ms-tól 8 másodpercig). Lehetővé teszi kódmentést vagy ébresztést Power-down módból Reset nélkül.',
    category: 'system',
    registers: [
      { name: 'WDTCSR', bit: 'WDIE (bit 6)', addressHex: '0x60', description: 'Watchdog Timer Control Register - Megszakítási mód' },
    ],
  },
  {
    id: 'TIMER2_COMPA',
    vectorNum: 8,
    vectorName: 'TIMER2_COMPA_vect',
    programAddressHex: '0x000E',
    source: 'Timer/Counter2 Compare Match A',
    description: '8-bites 2-es időzítő OCR2A regiszterével való egyezés. Hanggeneráláshoz és finom órajel-lépésekhez.',
    category: 'timer',
    associatedPins: ['11'],
    registers: [
      { name: 'TIMSK2', bit: 'OCIE2A (bit 1)', addressHex: '0x70', description: 'Timer2 Interrupt Mask Register - Compare Match A' },
      { name: 'OCR2A', bit: 'OCR2A[7:0]', addressHex: '0xB3', description: 'Output Compare Register 2A' },
      { name: 'TCCR2A', bit: 'WGM21 (CTC)', addressHex: '0xB0', description: 'Timer2 Control Register A' },
    ],
  },
  {
    id: 'TIMER2_COMPB',
    vectorNum: 9,
    vectorName: 'TIMER2_COMPB_vect',
    programAddressHex: '0x0010',
    source: 'Timer/Counter2 Compare Match B',
    description: '8-bites 2-es időzítő OCR2B összehasonlító egyezése (D3 láb hardveres PWM kimenete).',
    category: 'timer',
    associatedPins: ['3'],
    registers: [
      { name: 'TIMSK2', bit: 'OCIE2B (bit 2)', addressHex: '0x70', description: 'Timer2 Interrupt Mask Register - Compare Match B' },
      { name: 'OCR2B', bit: 'OCR2B[7:0]', addressHex: '0xB4', description: 'Output Compare Register 2B' },
    ],
  },
  {
    id: 'TIMER2_OVF',
    vectorNum: 10,
    vectorName: 'TIMER2_OVF_vect',
    programAddressHex: '0x0012',
    source: 'Timer/Counter2 Overflow',
    description: 'Timer2 túlcsordulás megszakítás (0xFF -> 0x00 számlálóátforduláskor). Aszinkron órakvarccal RTC-ként is használható.',
    category: 'timer',
    registers: [
      { name: 'TIMSK2', bit: 'TOIE2 (bit 0)', addressHex: '0x70', description: 'Timer2 Overflow Interrupt Enable' },
    ],
  },
  {
    id: 'TIMER1_CAPT',
    vectorNum: 11,
    vectorName: 'TIMER1_CAPT_vect',
    programAddressHex: '0x0014',
    source: 'Timer/Counter1 Capture Event (ICP1 / Pin D8)',
    description: '16-bites hardveres bemeneti jelfogás a D8 lábon. Impulzushossz, frekvencia és PWM kitöltés nanomásodperc pontos méréséhez.',
    category: 'timer',
    associatedPins: ['8'],
    registers: [
      { name: 'TIMSK1', bit: 'ICIE1 (bit 5)', addressHex: '0x6F', description: 'Timer1 Input Capture Interrupt Enable' },
      { name: 'ICR1', bit: 'ICR1[15:0]', addressHex: '0x86', description: 'Input Capture Register 1' },
    ],
  },
  {
    id: 'TIMER1_COMPA',
    vectorNum: 12,
    vectorName: 'TIMER1_COMPA_vect',
    programAddressHex: '0x0016',
    source: 'Timer/Counter1 Compare Match A (CTC Mód)',
    description: '16-bites Timer1 OCR1A összehasonlító egyezés. A leggyakrabban használt precíziós hardveres periodikus időzítő (pl. 1 kHz, 100 Hz, 10 Hz tick).',
    category: 'timer',
    associatedPins: ['9'],
    registers: [
      { name: 'TIMSK1', bit: 'OCIE1A (bit 1)', addressHex: '0x6F', description: 'Timer1 Compare Match A Interrupt Enable' },
      { name: 'OCR1A', bit: 'OCR1A[15:0]', addressHex: '0x88', description: '16-bites Output Compare Register 1A' },
      { name: 'TCCR1B', bit: 'WGM12, CS12..0', addressHex: '0x81', description: 'Timer1 CTC Mód & Előosztó beállítása' },
    ],
  },
  {
    id: 'TIMER1_COMPB',
    vectorNum: 13,
    vectorName: 'TIMER1_COMPB_vect',
    programAddressHex: '0x0018',
    source: 'Timer/Counter1 Compare Match B',
    description: '16-bites Timer1 OCR1B összehasonlító egyezés (D10 láb hardveres PWM kimenete).',
    category: 'timer',
    associatedPins: ['10'],
    registers: [
      { name: 'TIMSK1', bit: 'OCIE1B (bit 2)', addressHex: '0x6F', description: 'Timer1 Compare Match B Interrupt Enable' },
    ],
  },
  {
    id: 'TIMER1_OVF',
    vectorNum: 14,
    vectorName: 'TIMER1_OVF_vect',
    programAddressHex: '0x001A',
    source: 'Timer/Counter1 Overflow',
    description: '16-bites Timer1 túlcsordulás megszakítás (0xFFFF -> 0x0000 számlálóátfordulás).',
    category: 'timer',
    registers: [
      { name: 'TIMSK1', bit: 'TOIE1 (bit 0)', addressHex: '0x6F', description: 'Timer1 Overflow Interrupt Enable' },
    ],
  },
  {
    id: 'TIMER0_COMPA',
    vectorNum: 15,
    vectorName: 'TIMER0_COMPA_vect',
    programAddressHex: '0x001C',
    source: 'Timer/Counter0 Compare Match A (Pin D6)',
    description: '8-bites Timer0 OCR0A összehasonlító megszakítás (D6 hardveres PWM láb).',
    category: 'timer',
    associatedPins: ['6'],
    registers: [
      { name: 'TIMSK0', bit: 'OCIE0A (bit 1)', addressHex: '0x6E', description: 'Timer0 Compare Match A Interrupt Enable' },
      { name: 'OCR0A', bit: 'OCR0A[7:0]', addressHex: '0x47', description: 'Output Compare Register 0A' },
    ],
  },
  {
    id: 'TIMER0_COMPB',
    vectorNum: 16,
    vectorName: 'TIMER0_COMPB_vect',
    programAddressHex: '0x001E',
    source: 'Timer/Counter0 Compare Match B (Pin D5)',
    description: '8-bites Timer0 OCR0B összehasonlító megszakítás (D5 hardveres PWM láb).',
    category: 'timer',
    associatedPins: ['5'],
    registers: [
      { name: 'TIMSK0', bit: 'OCIE0B (bit 2)', addressHex: '0x6E', description: 'Timer0 Compare Match B Interrupt Enable' },
      { name: 'OCR0B', bit: 'OCR0B[7:0]', addressHex: '0x48', description: 'Output Compare Register 0B' },
    ],
  },
  {
    id: 'TIMER0_OVF',
    vectorNum: 17,
    vectorName: 'TIMER0_OVF_vect',
    programAddressHex: '0x0020',
    source: 'Timer/Counter0 Overflow (Arduino millis/micros)',
    description: 'Timer0 túlcsordulási megszakítás (0xFF -> 0x00). Az Arduino környezet ezen a megszakításon keresztül tartja nyilván a millis() és micros() időszámlálókat (~976.56 Hz frekvenciával).',
    category: 'timer',
    registers: [
      { name: 'TIMSK0', bit: 'TOIE0 (bit 0)', addressHex: '0x6E', description: 'Timer0 Overflow Interrupt Enable' },
    ],
  },
  {
    id: 'SPI_STC',
    vectorNum: 18,
    vectorName: 'SPI_STC_vect',
    programAddressHex: '0x0022',
    source: 'SPI Serial Transfer Complete',
    description: 'Hardveres SPI adatbájt átvitel befejezése (Master vagy Slave módban). Nem-blokkoló SPI kommunikációhoz.',
    category: 'comm',
    associatedPins: ['10', '11', '12', '13'],
    registers: [
      { name: 'SPCR', bit: 'SPIE (bit 7)', addressHex: '0x2C (0x4C)', description: 'SPI Control Register - SPI Interrupt Enable' },
      { name: 'SPSR', bit: 'SPIF (bit 7)', addressHex: '0x2D (0x4D)', description: 'SPI Status Register - Transfer Complete Flag' },
    ],
  },
  {
    id: 'USART_RX',
    vectorNum: 19,
    vectorName: 'USART_RX_vect',
    programAddressHex: '0x0024',
    source: 'USART Rx Complete (Pin D0 / RXD)',
    description: 'Soros porti adatbájt beérkezése az UDR0 regiszterbe. Lehetővé teszi azonnali parancsfogadást puffereléshez anélkül, hogy a főprogram várna.',
    category: 'comm',
    associatedPins: ['0'],
    registers: [
      { name: 'UCSR0B', bit: 'RXCIE0 (bit 7)', addressHex: '0xC1', description: 'USART Control Register 0 B - RX Complete Interrupt Enable' },
      { name: 'UDR0', bit: 'UDR0[7:0]', addressHex: '0xC6', description: 'USART I/O Data Register' },
      { name: 'UCSR0A', bit: 'RXC0 (bit 7)', addressHex: '0xC0', description: 'USART Receive Complete Flag' },
    ],
  },
  {
    id: 'USART_UDRE',
    vectorNum: 20,
    vectorName: 'USART_UDRE_vect',
    programAddressHex: '0x0026',
    source: 'USART Data Register Empty',
    description: 'Az UDR0 adóregiszter kiürült és készen áll a következő kiküldendő bájt fogadására. Nagysebességű háttérbeli szövegküldéshez.',
    category: 'comm',
    associatedPins: ['1'],
    registers: [
      { name: 'UCSR0B', bit: 'UDRIE0 (bit 5)', addressHex: '0xC1', description: 'USART Data Register Empty Interrupt Enable' },
    ],
  },
  {
    id: 'USART_TX',
    vectorNum: 21,
    vectorName: 'USART_TX_vect',
    programAddressHex: '0x0028',
    source: 'USART Tx Complete (Pin D1 / TXD)',
    description: 'A teljes bájt (Shift regiszterből is) sikeresen kisugározva a D1 TX lábon. Fél-duplex RS-485 adás/vétel átkapcsolásához ideális.',
    category: 'comm',
    associatedPins: ['1'],
    registers: [
      { name: 'UCSR0B', bit: 'TXCIE0 (bit 6)', addressHex: '0xC1', description: 'USART TX Complete Interrupt Enable' },
    ],
  },
  {
    id: 'ADC',
    vectorNum: 22,
    vectorName: 'ADC_vect',
    programAddressHex: '0x002A',
    source: 'ADC Conversion Complete (A0 - A5)',
    description: 'Az analóg-digitális átalakítás befejeződött és az eredmény elérhető az ADCL/ADCH regiszterekben. Háttérbeli analóg mintavételezéshez.',
    category: 'analog',
    associatedPins: ['A0', 'A1', 'A2', 'A3', 'A4', 'A5'],
    registers: [
      { name: 'ADCSRA', bit: 'ADIE (bit 3)', addressHex: '0x7A', description: 'ADC Control & Status Register A - ADC Interrupt Enable' },
      { name: 'ADCSRA', bit: 'ADIF (bit 4)', addressHex: '0x7A', description: 'ADC Interrupt Flag' },
      { name: 'ADCW', bit: 'ADCH:ADCL (10-bit)', addressHex: '0x78', description: '10-bites ADC eredmény regiszter' },
    ],
  },
  {
    id: 'EE_READY',
    vectorNum: 23,
    vectorName: 'EE_READY_vect',
    programAddressHex: '0x002C',
    source: 'EEPROM Ready Interrupt',
    description: 'Az előző EEPROM belső írási ciklus (kb. 3.3 ms) befejeződött, a memória készen áll a következő írásra/olvasásra blokkolás nélkül.',
    category: 'system',
    registers: [
      { name: 'EECR', bit: 'EERIE (bit 3)', addressHex: '0x1F (0x3F)', description: 'EEPROM Control Register - Ready Interrupt Enable' },
    ],
  },
  {
    id: 'ANALOG_COMP',
    vectorNum: 24,
    vectorName: 'ANALOG_COMP_vect',
    programAddressHex: '0x002E',
    source: 'Analog Comparator (AIN0 / Pin 6 & AIN1 / Pin 7)',
    description: 'A D6 (AIN0) és D7 (AIN1) lábak analóg feszültségszintjeinek összehasonlítása. Gyors analóg küszöbérték detektálásához külső ADC nélkül.',
    category: 'analog',
    associatedPins: ['6', '7'],
    registers: [
      { name: 'ACSR', bit: 'ACIE (bit 3)', addressHex: '0x30 (0x50)', description: 'Analog Comparator Control & Status Register - AC Interrupt Enable' },
    ],
  },
  {
    id: 'TWI',
    vectorNum: 25,
    vectorName: 'TWI_vect',
    programAddressHex: '0x0030',
    source: '2-wire Serial Interface (I2C: A4 SDA, A5 SCL)',
    description: 'Hardveres I2C (TWI) esemény: START, STOP feltétel, címzés vagy adatbájt átvitel fogadva. I2C Slave implementációk alapköve.',
    category: 'comm',
    associatedPins: ['A4', 'A5'],
    registers: [
      { name: 'TWCR', bit: 'TWIE (bit 0)', addressHex: '0xBC', description: 'TWI Control Register - Interrupt Enable' },
      { name: 'TWSR', bit: 'TWS7..3', addressHex: '0xB9', description: 'TWI Status Register - 5-bites állapotkód' },
    ],
  },
  {
    id: 'SPM_READY',
    vectorNum: 26,
    vectorName: 'SPM_READY_vect',
    programAddressHex: '0x0032',
    source: 'Store Program Memory Ready',
    description: 'A Flash programmemória oldal beírása (SPM utasítás) befejeződött. Bootloaderekhez és öntanuló rendszerekhez.',
    category: 'system',
    registers: [
      { name: 'SPMCSR', bit: 'SPMIE (bit 7)', addressHex: '0x37 (0x57)', description: 'SPM Control Register - SPM Interrupt Enable' },
    ],
  },
];

export const DEFAULT_INTERRUPT_CONFIGS: Record<string, AvrInterruptConfig> = {
  INT0: {
    id: 'INT0',
    enabled: true,
    triggerMode: 'FALLING_EDGE',
    pin: '2',
    customIsrAction: 'toggle_led',
    customTargetPin: '13',
    description: 'INT0 (D2) lefutó élre (Gombnyomás) azonnal invertálja a D13 LED állapotát',
  },
  TIMER1_COMPA: {
    id: 'TIMER1_COMPA',
    enabled: true,
    frequencyHz: 1000,
    prescaler: '64',
    ocrValue: 249,
    customIsrAction: 'increment_var',
    customTargetVar: 'system_tick_ms',
    description: '16-bites Timer1 CTC @ 1000 Hz (1 ms tick) periodikus megszakítás',
  },
  USART_RX: {
    id: 'USART_RX',
    enabled: false,
    customIsrAction: 'send_uart',
    description: 'USART RX megszakítás beérkező bájt automatikus visszhangozására',
  },
  PCINT2: {
    id: 'PCINT2',
    enabled: false,
    pcintMask: 0b00000100, // D2 pin (PD2)
    customIsrAction: 'toggle_led',
    customTargetPin: '13',
    description: 'Port D lábváltozás megszakítás',
  },
};

/**
 * Calculates Timer1 / Timer2 CTC OCR value and actual frequency
 */
export function calculateTimerCtcParams(clockHz: number, targetFreqHz: number, prescalerVal: number, is16Bit = true) {
  const maxOcr = is16Bit ? 65535 : 255;
  const ocr = Math.round(clockHz / (prescalerVal * targetFreqHz) - 1);
  const clampedOcr = Math.max(1, Math.min(maxOcr, ocr));
  const actualFreqHz = clockHz / (prescalerVal * (clampedOcr + 1));
  const errorPercent = Math.abs((actualFreqHz - targetFreqHz) / targetFreqHz) * 100;
  const periodMs = (1000 / actualFreqHz);

  return {
    ocr: clampedOcr,
    actualFreqHz: Math.round(actualFreqHz * 100) / 100,
    errorPercent: Math.round(errorPercent * 1000) / 1000,
    periodMs: Math.round(periodMs * 1000) / 1000,
    isValid: ocr >= 1 && ocr <= maxOcr,
  };
}

/**
 * Generates C code for a specific AVR interrupt configuration
 */
export function generateInterruptCConfigCode(cfg: AvrInterruptConfig): { setupCode: string[]; isrCode: string[] } {
  const setupLines: string[] = [];
  const isrLines: string[] = [];

  switch (cfg.id) {
    case 'INT0': {
      const mode = cfg.triggerMode || 'FALLING_EDGE';
      const modeEnum = mode === 'RISING_EDGE' ? 'RISING' : mode === 'FALLING_EDGE' ? 'FALLING' : mode === 'ANY_CHANGE' ? 'CHANGE' : 'LOW';
      setupLines.push(`// INT0 Külső Megszakítás (Pin D2) konfigurálás:`);
      setupLines.push(`pinMode(2, INPUT_PULLUP); // Belső felhúzó ellenállás bekapcsolása`);
      setupLines.push(`attachInterrupt(digitalPinToInterrupt(2), isr_int0_handler, ${modeEnum});`);
      setupLines.push(`// Közvetlen regiszter megfelelő:`);
      setupLines.push(`// EICRA |= ${mode === 'RISING_EDGE' ? '(1 << ISC01) | (1 << ISC00)' : mode === 'FALLING_EDGE' ? '(1 << ISC01)' : mode === 'ANY_CHANGE' ? '(1 << ISC00)' : '0'};`);
      setupLines.push(`// EIMSK |= (1 << INT0); // INT0 engedélyezése`);

      isrLines.push(`// INT0 Hardveres Megszakításkezelő Rutin:`);
      isrLines.push(`void isr_int0_handler() {`);
      if (cfg.customIsrAction === 'toggle_led') {
        const pin = cfg.customTargetPin || '13';
        isrLines.push(`  PINB = (1 << PB5); // Hardveres D${pin} LED Toggle 2 ciklus alatt!`);
      } else if (cfg.customIsrAction === 'increment_var') {
        const v = cfg.customTargetVar || 'button_press_count';
        isrLines.push(`  ${v}++; // Volatile számláló növelése`);
      } else {
        isrLines.push(`  // INT0 esemény kódja...`);
      }
      isrLines.push(`}`);
      break;
    }

    case 'INT1': {
      const mode = cfg.triggerMode || 'FALLING_EDGE';
      const modeEnum = mode === 'RISING_EDGE' ? 'RISING' : mode === 'FALLING_EDGE' ? 'FALLING' : mode === 'ANY_CHANGE' ? 'CHANGE' : 'LOW';
      setupLines.push(`// INT1 Külső Megszakítás (Pin D3) konfigurálás:`);
      setupLines.push(`pinMode(3, INPUT_PULLUP);`);
      setupLines.push(`attachInterrupt(digitalPinToInterrupt(3), isr_int1_handler, ${modeEnum});`);

      isrLines.push(`void isr_int1_handler() {`);
      isrLines.push(`  PINB = (1 << PB5); // Toggle LED`);
      isrLines.push(`}`);
      break;
    }

    case 'TIMER1_COMPA': {
      const freq = cfg.frequencyHz || 1000;
      const prescaler = Number(cfg.prescaler) || 64;
      const ocr = cfg.ocrValue || Math.max(1, Math.round(16000000 / (prescaler * freq) - 1));

      setupLines.push(`// 16-bites Timer1 CTC Megszakítás Beállítása (${freq} Hz @ Prescaler ${prescaler}):`);
      setupLines.push(`cli(); // Megszakítások tiltása a konfigurálás idejére`);
      setupLines.push(`TCCR1A = 0; // Normál port működés`);
      setupLines.push(`TCCR1B = (1 << WGM12) | (1 << CS11) | (1 << CS10); // CTC Mód, Előosztó ${prescaler}`);
      setupLines.push(`OCR1A = ${ocr}; // ${freq} Hz összehasonlító regiszter`);
      setupLines.push(`TIMSK1 |= (1 << OCIE1A); // Timer1 Compare Match A engedélyezése`);
      setupLines.push(`sei(); // Globális megszakítások engedélyezése`);

      isrLines.push(`// Timer1 CTC Megszakításkezelő (${freq} Hz / ${(1000 / freq).toFixed(2)} ms):`);
      isrLines.push(`ISR(TIMER1_COMPA_vect) {`);
      if (cfg.customIsrAction === 'toggle_led') {
        isrLines.push(`  PINB = (1 << PB5); // D13 LED villogtatás periodikusan`);
      } else {
        isrLines.push(`  system_tick_ms++; // Milliszekundumos számláló`);
      }
      isrLines.push(`}`);
      break;
    }

    case 'USART_RX': {
      setupLines.push(`// USART0 RX Megszakítás Engedélyezése:`);
      setupLines.push(`UCSR0B |= (1 << RXCIE0); // RX Complete Interrupt Enable`);

      isrLines.push(`// USART0 Adatbájt Beérkezés Megszakítás:`);
      isrLines.push(`ISR(USART_RX_vect) {`);
      isrLines.push(`  char receivedByte = UDR0; // Bájt azonnali kiolvasása a hardveres regiszterből`);
      isrLines.push(`  UDR0 = receivedByte; // Visszhangozás (Echo TX)`);
      isrLines.push(`}`);
      break;
    }

    case 'PCINT2': {
      setupLines.push(`// Pin Change Interrupt (PORTD: D0 - D7) konfigurálás:`);
      setupLines.push(`PCICR |= (1 << PCIE2); // Port D csoport engedélyezése`);
      setupLines.push(`PCMSK2 |= (1 << PCINT18); // D2 láb (PD2) figyelése`);

      isrLines.push(`ISR(PCINT2_vect) {`);
      isrLines.push(`  if (!(PIND & (1 << PD2))) { // Ha D2 alacsony szintre váltott`);
      isrLines.push(`    PINB = (1 << PB5); // Toggle LED`);
      isrLines.push(`  }`);
      isrLines.push(`}`);
      break;
    }

    default: {
      const vInfo = ATMEGA328P_INTERRUPT_VECTORS.find((v) => v.id === cfg.id);
      setupLines.push(`// ${vInfo?.vectorName || cfg.id} megszakítás beállítása`);
      isrLines.push(`ISR(${vInfo?.vectorName || cfg.id + '_vect'}) {`);
      isrLines.push(`  // Megszakítási rutin törzse`);
      isrLines.push(`}`);
      break;
    }
  }

  return { setupCode: setupLines, isrCode: isrLines };
}
