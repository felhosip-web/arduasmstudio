import { HardwareModule, HardwareModuleType } from '../types';

export interface ModuleCatalogItem {
  type: HardwareModuleType;
  name: string;
  category: 'Kijelzők' | 'Időzítés & Memória' | 'Bemenetek & Érzékelők' | 'Kommunikáció' | 'Kimenetek' | 'Portbővítés';
  shortDesc: string;
  defaultPins: Record<string, string>;
  icon: string;
  accentColor: string;
  createDefaultState: () => Record<string, any>;
}

export const MODULE_CATALOG: ModuleCatalogItem[] = [
  {
    type: 'lcd_1602',
    name: '16x2 I2C Karakteres LCD',
    category: 'Kijelzők',
    shortDesc: 'HD44780 vezérlő PCF8574 I2C adapterrel (0x27 / 0x3F cím)',
    defaultPins: { SDA: 'A4', SCL: 'A5' },
    icon: 'Tv',
    accentColor: '#38bdf8',
    createDefaultState: () => ({
      i2cAddress: '0x27',
      backlight: true,
      line0: 'ArduASM v1.5.0  ',
      line1: 'Ready for Code! ',
      cursorCol: 0,
      cursorRow: 0,
      contrast: 80,
    }),
  },
  {
    type: 'rtc_ds1307',
    name: 'DS1307 / DS3231 RTC Óra',
    category: 'Időzítés & Memória',
    shortDesc: 'I2C valós idejű óra naptárral, elemfeszültség és hőmérséklet méréssel',
    defaultPins: { SDA: 'A4', SCL: 'A5' },
    icon: 'Clock',
    accentColor: '#a855f7',
    createDefaultState: () => {
      const now = new Date();
      return {
        i2cAddress: '0x68',
        hours: now.getHours(),
        minutes: now.getMinutes(),
        seconds: now.getSeconds(),
        year: now.getFullYear(),
        month: now.getMonth() + 1,
        day: now.getDate(),
        temperatureC: 24.5,
        batteryVolts: 3.15,
        running: true,
      };
    },
  },
  {
    type: 'shift_74hc595',
    name: '74HC595 Shift-Regiszter',
    category: 'Kimenetek',
    shortDesc: '8-bites soros bemenetű, párhuzamos kimenetű léptetőregiszter LED sorral',
    defaultPins: { DS: '11', SH_CP: '12', ST_CP: '8' },
    icon: 'Binary',
    accentColor: '#f59e0b',
    createDefaultState: () => ({
      outputByte: 0b10100101,
      latchState: 0,
      clockState: 0,
      dataState: 0,
      shiftHistory: [0b10100101],
    }),
  },
  {
    type: 'sd_card',
    name: 'MicroSD Kártya SPI Modul',
    category: 'Időzítés & Memória',
    shortDesc: 'SPI interfészes FAT16/FAT32 kártyaolvasó virtuális fájlokkal',
    defaultPins: { CS: '4', MOSI: '11', MISO: '12', SCK: '13' },
    icon: 'HardDrive',
    accentColor: '#10b981',
    createDefaultState: () => ({
      cardInserted: true,
      capacityMb: 1024,
      files: [
        { name: 'LOGGER.TXT', size: 142, content: '[BOOT] System Init OK\r\n[DATA] T=24.5C A0=512\r\n' },
        { name: 'CONFIG.INI', size: 64, content: 'BAUD=9600\r\nMODE=DEBUG\r\nINTERVAL=500\r\n' },
        { name: 'SENSORS.CSV', size: 98, content: 'timestamp,a0_val,status\r\n100,512,OK\r\n200,604,OK\r\n' },
      ],
      selectedFile: 'LOGGER.TXT',
      lastCommand: 'CMD17 (READ_SINGLE_BLOCK)',
    }),
  },
  {
    type: 'nrf24l01',
    name: 'NRF24L01+ 2.4GHz Rádió',
    category: 'Kommunikáció',
    shortDesc: 'Vezeték nélküli RF adó-vevő 32 bájtos csomagpufferrel és csatornaválasztóval',
    defaultPins: { CE: '9', CSN: '10', MOSI: '11', MISO: '12', SCK: '13' },
    icon: 'Radio',
    accentColor: '#ec4899',
    createDefaultState: () => ({
      channel: 76,
      dataRate: '2Mbps',
      txPower: '0dBm',
      txPayload: 'ARDU_DATA_01',
      lastReceived: 'PING_NODE_2',
      txSuccessCount: 14,
      rxCount: 8,
      rssi: -65,
    }),
  },
  {
    type: 'rotary_encoder',
    name: 'KY-040 Rotary Encóder',
    category: 'Bemenetek & Érzékelők',
    shortDesc: 'Forgó jeladó A/B kvadratúra impulzusokkal (INT0/INT1) és nyomógombbal',
    defaultPins: { CLK: '2', DT: '3', SW: '4' },
    icon: 'Disc',
    accentColor: '#06b6d4',
    createDefaultState: () => ({
      position: 0,
      buttonPressed: false,
      angleDeg: 0,
      phaseA: 1,
      phaseB: 1,
      lastDirection: 'IDLE',
    }),
  },
  {
    type: 'discrete_leds',
    name: '4-Csatornás LED Panel',
    category: 'Kimenetek',
    shortDesc: 'Konfigurálható LED sor (Piros, Sárga, Zöld, Kék / Közlekedési lámpa)',
    defaultPins: { LED1: '5', LED2: '6', LED3: '7', LED4: '8' },
    icon: 'Sparkles',
    accentColor: '#e11d48',
    createDefaultState: () => ({
      leds: [
        { id: '1', color: 'red', label: 'Piros (D5)', pin: '5' },
        { id: '2', color: 'yellow', label: 'Sárga (D6)', pin: '6' },
        { id: '3', color: 'green', label: 'Zöld (D7)', pin: '7' },
        { id: '4', color: 'blue', label: 'Kék (D8)', pin: '8' },
      ],
    }),
  },
  {
    type: 'ds18b20_temp',
    name: 'DS18B20 1-Wire Hőmérő',
    category: 'Bemenetek & Érzékelők',
    shortDesc: 'Dallas 1-Wire digitális hőmérséklet-érzékelő (9-12 bit, 64-bit ROM ID, Scratchpad és Riasztás)',
    defaultPins: { DQ: '2' },
    icon: 'Thermometer',
    accentColor: '#06b6d4',
    createDefaultState: () => ({
      model: 'DS18B20',
      temperatureC: 24.5,
      resolutionBits: 12,
      romHex: '28-AA-73-04-1A-20-01-F3',
      thRegister: 50,
      tlRegister: 10,
      configRegister: 0x7F,
      parasitePower: false,
      conversionInProgress: false,
      conversionProgressPct: 100,
      scratchpad: [0x88, 0x01, 0x32, 0x0A, 0x7F, 0xFF, 0x0C, 0x10, 0x48],
      alarmTriggered: false,
    }),
  },
  {
    type: 'bluetooth_spp',
    name: 'BT05 / BT06 Bluetooth SPP Modul',
    category: 'Kommunikáció',
    shortDesc: 'Vezeték nélküli Bluetooth SPP / BLE UART soros híd AT parancsokkal és telemetria átvitellel',
    defaultPins: { RX: '0', TX: '1', STATE: '2', EN: '3' },
    icon: 'Bluetooth',
    accentColor: '#3b82f6',
    createDefaultState: () => ({
      deviceName: 'BT05-ARDUINO',
      pinCode: '1234',
      baudRate: 9600,
      role: 'SLAVE',
      connected: true,
      clientName: 'Mobile Android Host (SPP)',
      rssi: -62,
      mode: 'TRANSPARENT',
      lastReceived: 'LED_ON',
      lastSent: 'STATUS_OK: T=24C',
      rxHistory: ['[BT] CONNECTED', 'LED_ON', 'GET_STATUS', 'SET_PWM:128'],
      txHistory: ['[BT] BT05 READY', 'ACK: LED_ON', 'STATUS_OK: T=24C', 'ACK: PWM_SET'],
    }),
  },
  {
    type: 'eeprom_24cxxx',
    name: '24Cxxx I2C Külső EEPROM Memória',
    category: 'Időzítés & Memória',
    shortDesc: '24C02 - 24C1024 (256B - 128KB) soros I2C EEPROM memóriachip A0/A1/A2 címválasztóval és WP írásvédelemmel',
    defaultPins: { SDA: 'A4', SCL: 'A5', WP: '7' },
    icon: 'Database',
    accentColor: '#10b981',
    createDefaultState: () => {
      // 32KB (32768 bytes) for standard 24C256 default
      const defaultCapacity = 32768;
      const mem = new Array(defaultCapacity).fill(0xff);
      // Preload with friendly sample signature & configuration table
      const header = '24C256_EXT_EEPROM_STORAGE_OK';
      for (let i = 0; i < header.length; i++) {
        mem[i] = header.charCodeAt(i);
      }
      mem[header.length] = 0; // null terminator
      // Preset calibration config at 0x0020
      mem[0x20] = 0xAA; // Magic key
      mem[0x21] = 0x55;
      mem[0x22] = 0x01; // Version
      mem[0x23] = 0x03; // Boot count
      mem[0x24] = 0x18; // 24 deg C calibrated
      mem[0x25] = 0x80; // 128 PWM default

      return {
        chipModel: '24C256', // '24C02' | '24C04' | '24C08' | '24C16' | '24C32' | '24C64' | '24C128' | '24C256' | '24C512' | '24C1024'
        capacityBytes: 32768,
        pageSizeBytes: 64,
        addressBits: 16, // 8-bit for <= 24C16, 16-bit for >= 24C32
        baseAddressHex: '0x50',
        a0Pin: 0, // 0 = GND, 1 = VCC
        a1Pin: 0,
        a2Pin: 0,
        wpPinActive: false, // Write Protect: true = write locked
        lastOperation: 'IDLE',
        lastOpAddress: 0x0000,
        lastOpValue: 0x00,
        lastOpSuccess: true,
        writeCyclesCount: 8,
        readCyclesCount: 14,
        memory: mem,
        viewOffset: 0,
      };
    },
  },
  {
    type: 'eeprom_25lcxxx',
    name: '25LCxxx SPI Külső EEPROM Memória',
    category: 'Időzítés & Memória',
    shortDesc: '25LC040 - 25LC1024 (512B - 128KB) nagy sebességű SPI soros EEPROM (WREN, WRITE, READ, RDSR, WRSR)',
    defaultPins: { CS: '10', SCK: '13', MISO: '12', MOSI: '11', WP: '7', HOLD: '8' },
    icon: 'Database',
    accentColor: '#06b6d4',
    createDefaultState: () => {
      const defaultCapacity = 32768; // 32KB (25LC256)
      const mem = new Array(defaultCapacity).fill(0xff);
      const header = '25LC256_SPI_EEPROM_READY';
      for (let i = 0; i < header.length; i++) mem[i] = header.charCodeAt(i);
      mem[header.length] = 0;
      // Default parameters
      mem[0x10] = 0x53; // 'S'
      mem[0x11] = 0x50; // 'P'
      mem[0x12] = 0x49; // 'I'
      mem[0x13] = 0x01; // Version
      mem[0x14] = 0x20; // 32KB identifier
      return {
        chipModel: '25LC256', // '25LC040' | '25LC160' | '25LC640' | '25LC256' | '25LC512' | '25LC1024'
        capacityBytes: 32768,
        pageSizeBytes: 64,
        clockSpeedMhz: 10,
        spiMode: 0, // Mode 0 (0,0) or Mode 3 (1,1)
        csActive: false, // Low-active CS
        writeEnableLatch: false, // WEL bit (set by WREN 0x06)
        writeInProgress: false, // WIP bit
        blockProtect: 0, // BP0, BP1 (0=None, 1=Upper 1/4, 2=Upper 1/2, 3=All)
        statusRegister: 0x00,
        wpPinActive: false,
        holdPinActive: false,
        lastCommand: 'IDLE',
        lastOpAddress: 0x0000,
        lastOpValue: 0x00,
        lastOpSuccess: true,
        writeCyclesCount: 4,
        readCyclesCount: 12,
        memory: mem,
        viewOffset: 0,
      };
    },
  },
  {
    type: 'flash_w25qxx',
    name: 'W25Qxx SPI NOR Flash Memória',
    category: 'Időzítés & Memória',
    shortDesc: 'Winbond W25Q16 - W25Q128 (2MB - 16MB) nagy kapacitású SPI NOR Flash memóriachip JEDEC ID-val, 4KB szektortörléssel és lap-programozással',
    defaultPins: { CS: '10', SCK: '13', MISO: '12', MOSI: '11' },
    icon: 'HardDrive',
    accentColor: '#8b5cf6',
    createDefaultState: () => {
      // Simulate 1MB initial allocated memory block (extensible) for W25Q32 (4MB total)
      const defaultCapacity = 4194304; // 4MB
      const previewSize = 65536; // 64KB initial active preview buffer
      const mem = new Array(previewSize).fill(0xff);
      const header = 'W25Q32BV_WINBOND_FLASH_OK';
      for (let i = 0; i < header.length; i++) mem[i] = header.charCodeAt(i);
      mem[header.length] = 0;
      mem[0x100] = 0xAA;
      mem[0x101] = 0x55;
      mem[0x102] = 0xF0;
      mem[0x103] = 0x0F;
      return {
        chipModel: 'W25Q32', // 'W25Q16' | 'W25Q32' | 'W25Q64' | 'W25Q128'
        capacityBytes: 4194304,
        jedecManufacturerId: 0xEF, // Winbond
        jedecMemoryType: 0x40,
        jedecCapacityId: 0x16, // 32 Mbit (4MB)
        uniqueIdHex: 'E53F812904B821A7',
        sectorSizeBytes: 4096, // 4KB Sector
        blockSizeBytes: 65536, // 64KB Block
        pageSizeBytes: 256, // 256B Page
        writeEnableLatch: false,
        busy: false,
        statusReg1: 0x00,
        statusReg2: 0x00,
        lastCommand: 'JEDEC_ID',
        lastOpAddress: 0x000000,
        lastOpSuccess: true,
        erasedSectorsCount: 1,
        programmedPagesCount: 6,
        memory: mem,
        viewOffset: 0,
      };
    },
  },
  {
    type: 'expander_mcp23017',
    name: 'MCP23017 16-bites I2C I/O Portbővítő',
    category: 'Portbővítés',
    shortDesc: '16 digitális GPIO (Port A & B), 100kΩ belső felhúzók, programozható megszakítás (INTA/INTB) és A0-A2 hardveres címzés',
    defaultPins: { SDA: 'A4', SCL: 'A5', INTA: '2', INTB: '3', RESET: '4' },
    icon: 'Cpu',
    accentColor: '#f59e0b',
    createDefaultState: () => ({
      chipType: 'MCP23017', // MCP23017 (I2C) or MCP23S17 (SPI)
      baseAddressHex: '0x20', // 0x20 - 0x27
      a0Pin: 0,
      a1Pin: 0,
      a2Pin: 0,
      // Port A (GPA0 - GPA7)
      iodirA: 0x00, // 0 = Output, 1 = Input (default all OUT for visual LEDs)
      ipolA: 0x00,  // Input Polarity Invert
      gpintenA: 0x00, // Interrupt-on-change enable
      defvalA: 0x00,
      intconA: 0x00,
      iocon: 0x00, // Bank 0, sequential op enabled
      gppuA: 0x00, // Pull-up resistors
      gpioA: 0b10100101, // 0xA5 initial output LED state
      olatA: 0b10100101,
      intfA: 0x00, // Interrupt Flag
      intcapA: 0x00, // Captured value
      intaTriggered: false,
      // Port B (GPB0 - GPB7)
      iodirB: 0xFF, // Default all INPUT (switches/buttons)
      ipolB: 0x00,
      gpintenB: 0xFF,
      defvalB: 0x00,
      intconB: 0x00,
      gppuB: 0xFF, // Pull-ups enabled on input buttons
      gpioB: 0b11110000, // Default input switch states
      olatB: 0x00,
      intfB: 0x00,
      intcapB: 0x00,
      intbTriggered: false,
      lastOperation: 'PORT_A_WRITE',
      lastDataHex: '0xA5',
    }),
  },
  {
    type: 'expander_pcf8574',
    name: 'PCF8574 / PCF8574A 8-bites I2C Portbővítő',
    category: 'Portbővítés',
    shortDesc: '8-bites kvázi-kétirányú nyitott kollektoros I/O bővítő, /INT megszakításkimenettel (Gyakori LCD és relékártya illesztő)',
    defaultPins: { SDA: 'A4', SCL: 'A5', INT: '2' },
    icon: 'Sliders',
    accentColor: '#38bdf8',
    createDefaultState: () => ({
      chipVariant: 'PCF8574', // PCF8574 (0x20-0x27) or PCF8574A (0x38-0x3F)
      baseAddressHex: '0x20',
      a0Pin: 0,
      a1Pin: 0,
      a2Pin: 0,
      // 8 I/O Pins: P0..P7
      // 1 = High / Input pullup, 0 = Low / Active driven low
      portValue: 0b11001010, // 0xCA
      pinModes: [false, false, false, false, true, true, true, true], // false=OUT, true=IN
      pinValues: [false, true, false, true, false, false, true, true], // bit0..bit7
      intPinActive: false, // Low active interrupt
      lastOperation: 'WRITE_BYTE',
      lastDataHex: '0xCA',
      readCount: 16,
      writeCount: 24,
    }),
  },
  {
    type: 'shift_74hc165',
    name: '74HC165 8-bites Bemeneti Shift-Regiszter (PISO)',
    category: 'Portbővítés',
    shortDesc: 'Parallel-In Serial-Out 8-bites léptetőregiszter bemenetek soros beolvasásához (PL reteszelés + órajel impulzusok)',
    defaultPins: { PL: '9', CP: '13', Q7: '12', CE: '8' },
    icon: 'Layers',
    accentColor: '#14b8a6',
    createDefaultState: () => ({
      inputsD: [true, false, true, true, false, true, false, false], // D0..D7 (0x35)
      latchedData: 0x35,
      shiftRegisterVal: 0x35,
      q7Output: false,
      clockState: false,
      plState: true, // High = shift mode, Low = latch inputs
      ceState: false, // Clock enable (Active Low)
      lastReadByteHex: '0x35',
      readCycles: 6,
    }),
  },
];

export const INITIAL_ATTACHED_MODULES: HardwareModule[] = [
  {
    id: 'mod-lcd-default',
    type: 'lcd_1602',
    name: '16x2 I2C LCD Kijelző',
    enabled: true,
    pins: { SDA: 'A4', SCL: 'A5' },
    state: MODULE_CATALOG[0].createDefaultState(),
  },
  {
    id: 'mod-rotary-default',
    type: 'rotary_encoder',
    name: 'KY-040 Rotary Encóder',
    enabled: true,
    pins: { CLK: '2', DT: '3', SW: '4' },
    state: MODULE_CATALOG[5].createDefaultState(),
  },
  {
    id: 'mod-shift-default',
    type: 'shift_74hc595',
    name: '74HC595 Shift-Regiszter',
    enabled: true,
    pins: { DS: '11', SH_CP: '12', ST_CP: '8' },
    state: MODULE_CATALOG[2].createDefaultState(),
  },
];
