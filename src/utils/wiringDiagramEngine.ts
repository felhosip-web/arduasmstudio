/**
 * (c) 2026 AI Studio AVR Visual Studio
 * Virtual Wiring Diagram, Interactive Breadboard & Bill of Materials (BOM) Engine
 * Analyzes program blocks and hardware modules to generate wiring schematics, netlists, and DRC checks.
 */

import { ProgramBlock, ArduinoPin, HardwareModule } from '../types';
import { PIN_MAPPINGS } from './hardwareMap';

export interface WiringNet {
  id: string;
  from: string; // e.g. "Arduino Uno D13"
  fromPin: ArduinoPin | '5V' | '3.3V' | 'GND' | 'VIN' | 'RESET' | 'AREF';
  to: string; // e.g. "LED1 Anód (220Ω ellenálláson keresztül)"
  toComponent: string;
  toPin: string;
  wireColor: string; // Hex color or color name
  signalType: 'POWER_5V' | 'POWER_3V3' | 'GND' | 'DIGITAL_OUT' | 'DIGITAL_IN' | 'PWM' | 'ANALOG_IN' | 'I2C' | 'SPI' | 'UART' | 'ONEWIRE';
  notes: string;
}

export interface BomItem {
  id: string;
  name: string;
  category: 'Mikrokontroller' | 'Kijelző' | 'Szenzor' | 'Aktuátor' | 'Passzív Alkatrész' | 'Kommunikáció' | 'Egyéb';
  quantity: number;
  specification: string;
  package: string;
  description: string;
  estimatedCostHuf: number;
}

export interface WiringDrcIssue {
  id: string;
  severity: 'error' | 'warning' | 'info';
  title: string;
  description: string;
  recommendation: string;
}

export interface BreadboardComponent {
  id: string;
  name: string;
  type: string;
  pins: { pinName: string; connectedNetId: string; wireColor: string }[];
  icon: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
}

export interface WiringAnalysisResult {
  nets: WiringNet[];
  bom: BomItem[];
  drcIssues: WiringDrcIssue[];
  components: BreadboardComponent[];
  activeArduinoPins: Set<ArduinoPin>;
  totalEstimatedCurrentMa: number;
  assemblySteps: string[];
}

/**
 * Analyzes ProgramBlocks & HardwareModules to build the complete wiring plan
 */
export function analyzeCircuitWiring(
  blocks: ProgramBlock[],
  modules: HardwareModule[] = []
): WiringAnalysisResult {
  const nets: WiringNet[] = [];
  const bomMap: Map<string, BomItem> = new Map();
  const drcIssues: WiringDrcIssue[] = [];
  const components: BreadboardComponent[] = [];
  const activeArduinoPins = new Set<ArduinoPin>();
  let totalEstimatedCurrentMa = 25; // Baseline Arduino Uno idle current (~25-30 mA)
  const assemblySteps: string[] = [];

  // Always include Arduino Uno R3 in BOM
  bomMap.set('arduino_uno', {
    id: 'arduino_uno',
    name: 'Arduino Uno R3 (ATmega328P)',
    category: 'Mikrokontroller',
    quantity: 1,
    specification: '16 MHz, 5V, 32KB Flash, 2KB SRAM',
    package: 'DIP-28 / Board',
    description: 'Fő vezérlő mikrokontroller lapka USB interfésszel',
    estimatedCostHuf: 3800,
  });

  // Always include Breadboard and Jumper wires
  bomMap.set('breadboard', {
    id: 'breadboard',
    name: '830 Pontos Próbapanel (Breadboard)',
    category: 'Egyéb',
    quantity: 1,
    specification: 'Két tápsínnel (VCC, GND)',
    package: 'Standard MB-102',
    description: 'Forrasztásmentes áramköri próbapanel',
    estimatedCostHuf: 1200,
  });

  // Step 1 of assembly
  assemblySteps.push('1. Csatlakoztasd az Arduino Uno 5V és GND kivezetéseit a próbapanel felső/alsó piros és kék tápsínjeihez.');

  // Add baseline Power Nets
  nets.push({
    id: 'net_vcc_bus',
    from: 'Arduino Uno 5V',
    fromPin: '5V',
    to: 'Próbapanel Piros Tápvonal (+5V)',
    toComponent: 'Breadboard VCC',
    toPin: 'VCC (+)',
    wireColor: '#ef4444',
    signalType: 'POWER_5V',
    notes: 'Központi 5.0V tápfeszültség sín',
  });

  nets.push({
    id: 'net_gnd_bus',
    from: 'Arduino Uno GND',
    fromPin: 'GND',
    to: 'Próbapanel Kék Földvonal (GND)',
    toComponent: 'Breadboard GND',
    toPin: 'GND (-)',
    wireColor: '#1e293b',
    signalType: 'GND',
    notes: 'Közös test/földelési sín',
  });

  // Collect used pins from blocks
  const ledPins = new Set<ArduinoPin>();
  const buttonPins = new Set<ArduinoPin>();
  const pwmPins = new Set<ArduinoPin>();
  const analogPins = new Set<ArduinoPin>();
  let hasUart = false;
  let hasI2c = false;
  let hasSpi = false;
  let hasOneWire = false;
  let oneWirePin: ArduinoPin = '2';

  blocks.forEach((b) => {
    if (!b.enabled && b.enabled !== undefined) return;

    if (b.type === 'io_pin_write' && b.params.pin) {
      ledPins.add(b.params.pin as ArduinoPin);
      activeArduinoPins.add(b.params.pin as ArduinoPin);
    }
    if (b.type === 'io_pin_read' && b.params.pin) {
      buttonPins.add(b.params.pin as ArduinoPin);
      activeArduinoPins.add(b.params.pin as ArduinoPin);
    }
    if (b.type === 'analog_pwm_write' && b.params.pin) {
      pwmPins.add(b.params.pin as ArduinoPin);
      activeArduinoPins.add(b.params.pin as ArduinoPin);
    }
    if (b.type === 'analog_pin_read' && b.params.channel) {
      analogPins.add(b.params.channel as ArduinoPin);
      activeArduinoPins.add(b.params.channel as ArduinoPin);
    }
    if (b.type.startsWith('protocol_uart')) {
      hasUart = true;
      activeArduinoPins.add('0');
      activeArduinoPins.add('1');
    }
    if (b.type.startsWith('protocol_i2c') || b.type.startsWith('module_24cxxx') || b.type.startsWith('module_mcp23017') || b.type.startsWith('module_pcf8574')) {
      hasI2c = true;
      activeArduinoPins.add('A4');
      activeArduinoPins.add('A5');
    }
    if (b.type.startsWith('protocol_spi') || b.type.startsWith('module_25lcxxx') || b.type.startsWith('module_w25qxx')) {
      hasSpi = true;
      activeArduinoPins.add('10');
      activeArduinoPins.add('11');
      activeArduinoPins.add('12');
      activeArduinoPins.add('13');
    }
    if (b.type.startsWith('module_74hc165')) {
      activeArduinoPins.add('9');
      activeArduinoPins.add('12');
      activeArduinoPins.add('13');
    }
  });

  // Modules analysis
  modules.forEach((mod) => {
    if (mod.type === 'lcd_1602') hasI2c = true;
    if (mod.type === 'rtc_ds1307') hasI2c = true;
    if (mod.type === 'eeprom_24cxxx') hasI2c = true;
    if (mod.type === 'expander_mcp23017') hasI2c = true;
    if (mod.type === 'expander_pcf8574') hasI2c = true;
    if (mod.type === 'eeprom_25lcxxx') hasSpi = true;
    if (mod.type === 'flash_w25qxx') hasSpi = true;
    if (mod.type === 'shift_74hc165') {
      activeArduinoPins.add((mod.pins?.PL as ArduinoPin) || '9');
      activeArduinoPins.add((mod.pins?.Q7 as ArduinoPin) || '12');
      activeArduinoPins.add((mod.pins?.CP as ArduinoPin) || '13');
    }
    if (mod.type === 'ds18b20_temp') {
      hasOneWire = true;
      oneWirePin = (mod.pins?.data as ArduinoPin) || '2';
      activeArduinoPins.add(oneWirePin);
    }
  });

  let compX = 50;

  // Process Output / LEDs
  ledPins.forEach((pin, idx) => {
    const isBuiltIn = pin === '13';
    totalEstimatedCurrentMa += 15; // ~15mA per active LED

    if (isBuiltIn) {
      drcIssues.push({
        id: `drc_pin13_${idx}`,
        severity: 'info',
        title: 'Beépített L LED a D13 lábon',
        description: 'A 13-as lábra a lapkára integrált L LED már tartalmaz egy belső 1kΩ-os áramkorlátozó ellenállást.',
        recommendation: 'Külső alkatrész bekötése opcionális.',
      });
    } else {
      // Add LED and 220 Ohm resistor to BOM
      const ledKey = 'led_5mm';
      const existingLed = bomMap.get(ledKey);
      bomMap.set(ledKey, {
        id: ledKey,
        name: '5mm-es Diffúz LED (Piros/Zöld/Kék)',
        category: 'Aktuátor',
        quantity: (existingLed?.quantity || 0) + 1,
        specification: 'Vf ≈ 2.0V, If ≈ 15mA',
        package: 'THT 5mm',
        description: 'Fénykibocsátó dióda visszajelzéshez',
        estimatedCostHuf: 45,
      });

      const resKey = 'res_220r';
      const existingRes = bomMap.get(resKey);
      bomMap.set(resKey, {
        id: resKey,
        name: '220 Ω / 330 Ω Áramkorlátozó Ellenállás',
        category: 'Passzív Alkatrész',
        quantity: (existingRes?.quantity || 0) + 1,
        specification: '1/4W (0.25W), 5% fémréteg',
        package: 'Axial THT',
        description: 'LED túláramvédelmi előtét ellenállás',
        estimatedCostHuf: 15,
      });

      // Nets for LED
      nets.push({
        id: `net_led_${pin}`,
        from: `Arduino Uno Pin D${pin}`,
        fromPin: pin,
        to: `LED${idx + 1} Anód (220Ω ellenálláson keresztül)`,
        toComponent: `LED${idx + 1}`,
        toPin: 'Anód (+)',
        wireColor: '#22c55e',
        signalType: 'DIGITAL_OUT',
        notes: `Digitális kimenet: HIGH esetén a LED világít (I ≈ 14 mA)`,
      });

      nets.push({
        id: `net_led_gnd_${pin}`,
        from: `LED${idx + 1} Katód (-)`,
        fromPin: 'GND',
        to: 'Próbapanel Kék Földvonal (GND)',
        toComponent: `LED${idx + 1}`,
        toPin: 'Katód (-)',
        wireColor: '#1e293b',
        signalType: 'GND',
        notes: 'Földvonal visszacsatolás',
      });

      assemblySteps.push(`• Csatlakoztasd a D${pin} lábat egy 220Ω-os ellenálláson át a LED${idx + 1} anódjához, a katódot kösd a GND sínre.`);

      components.push({
        id: `comp_led_${pin}`,
        name: `LED (D${pin})`,
        type: 'LED + 220Ω',
        pins: [
          { pinName: 'Anode', connectedNetId: `net_led_${pin}`, wireColor: '#22c55e' },
          { pinName: 'Cathode', connectedNetId: `net_led_gnd_${pin}`, wireColor: '#1e293b' },
        ],
        icon: 'Zap',
        x: compX,
        y: 120,
        width: 70,
        height: 60,
        color: '#22c55e',
      });
      compX += 90;
    }
  });

  // Process Pushbuttons / Inputs
  buttonPins.forEach((pin, idx) => {
    const btnKey = 'tact_switch';
    const existingBtn = bomMap.get(btnKey);
    bomMap.set(btnKey, {
      id: btnKey,
      name: 'Mikrokapcsoló / Nyomógomb (Tactile Switch)',
      category: 'Szenzor',
      quantity: (existingBtn?.quantity || 0) + 1,
      specification: '6x6mm 4-lábú THT',
      package: 'THT DIP-4',
      description: 'Digitális felhasználói bemenet',
      estimatedCostHuf: 60,
    });

    const pullupResKey = 'res_10k';
    const existingRes = bomMap.get(pullupResKey);
    bomMap.set(pullupResKey, {
      id: pullupResKey,
      name: '10 kΩ Felhúzó / Lehúzó Ellenállás',
      category: 'Passzív Alkatrész',
      quantity: (existingRes?.quantity || 0) + 1,
      specification: '1/4W 5%',
      package: 'Axial THT',
      description: 'Precíziós felhúzó ellenállás lebegő állapot ellen',
      estimatedCostHuf: 15,
    });

    nets.push({
      id: `net_btn_${pin}`,
      from: `Arduino Uno Pin D${pin}`,
      fromPin: pin,
      to: `Nyomógomb BTN${idx + 1} és 10kΩ Lehúzó Ellenállás`,
      toComponent: `BTN${idx + 1}`,
      toPin: 'Jel / Pin 1',
      wireColor: '#38bdf8',
      signalType: 'DIGITAL_IN',
      notes: 'Bemeneti érzékelő vonal',
    });

    assemblySteps.push(`• Csatlakoztasd a nyomógomb egyik lábát az 5V sínhez, a másik lábát a D${pin} lábhoz és egy 10kΩ-os ellenállással a GND sínhez.`);

    components.push({
      id: `comp_btn_${pin}`,
      name: `Gomb (D${pin})`,
      type: 'Tactile Switch',
      pins: [
        { pinName: 'Sig', connectedNetId: `net_btn_${pin}`, wireColor: '#38bdf8' },
        { pinName: 'VCC', connectedNetId: 'net_vcc_bus', wireColor: '#ef4444' },
      ],
      icon: 'Sliders',
      x: compX,
      y: 120,
      width: 70,
      height: 60,
      color: '#38bdf8',
    });
    compX += 90;
  });

  // Process Analog Sensors / Potentiometers
  analogPins.forEach((pin, idx) => {
    const potKey = 'pot_10k';
    bomMap.set(potKey, {
      id: potKey,
      name: '10 kΩ Potenciométer / Forgópotméter',
      category: 'Szenzor',
      quantity: (bomMap.get(potKey)?.quantity || 0) + 1,
      specification: 'Lineáris (10k B-típus)',
      package: 'THT 3-pin',
      description: 'Analóg feszültségosztó szenzor 0 - 5.0V tartományban',
      estimatedCostHuf: 250,
    });

    nets.push({
      id: `net_analog_${pin}`,
      from: `Arduino Uno Pin ${pin}`,
      fromPin: pin,
      to: `Potenciométer POT${idx + 1} Csúszó Érintkező (Wiper)`,
      toComponent: `POT${idx + 1}`,
      toPin: 'Wiper (Középső Láb)',
      wireColor: '#eab308',
      signalType: 'ANALOG_IN',
      notes: '10-bites ADC bemenet (0-1023 érték)',
    });

    assemblySteps.push(`• Csatlakoztasd a 10kΩ potenciométer két szélső lábát az 5V és GND sínekre, a középső lábát kösd a ${pin} analóg bemenetre.`);
  });

  // Process I2C Bus Devices (LCD, RTC, etc.)
  if (hasI2c) {
    bomMap.set('i2c_pullups', {
      id: 'i2c_pullups',
      name: '4.7 kΩ I2C Felhúzó Ellenállás Pár (SDA / SCL)',
      category: 'Passzív Alkatrész',
      quantity: 2,
      specification: '4.7 kΩ 1/4W',
      package: 'Axial THT',
      description: 'I2C nyitott kollektoros busz felhúzása +5V-ra',
      estimatedCostHuf: 30,
    });

    bomMap.set('lcd_i2c', {
      id: 'lcd_i2c',
      name: 'LCD 1602 Kijelző I2C PCF8574 Backpack-kel',
      category: 'Kijelző',
      quantity: 1,
      specification: '16x2 Karakter, Kék háttérvilágítás, 0x27 / 0x3F cím',
      package: 'Module 4-pin',
      description: 'Kétsoros karakteres kijelző I2C illesztéssel',
      estimatedCostHuf: 1450,
    });

    totalEstimatedCurrentMa += 40; // LCD backlight current

    nets.push({
      id: 'net_i2c_sda',
      from: 'Arduino Uno Pin A4 (SDA)',
      fromPin: 'A4',
      to: 'I2C Kijelző / Szenzor SDA Láb',
      toComponent: 'LCD1602 / I2C Bus',
      toPin: 'SDA',
      wireColor: '#f59e0b',
      signalType: 'I2C',
      notes: 'I2C kétirányú adatvonal',
    });

    nets.push({
      id: 'net_i2c_scl',
      from: 'Arduino Uno Pin A5 (SCL)',
      fromPin: 'A5',
      to: 'I2C Kijelző / Szenzor SCL Láb',
      toComponent: 'LCD1602 / I2C Bus',
      toPin: 'SCL',
      wireColor: '#10b981',
      signalType: 'I2C',
      notes: 'I2C szinkron órajel vonal (100 / 400 kHz)',
    });

    assemblySteps.push('• Csatlakoztasd az I2C modul SDA lábát az Uno A4 lábához, az SCL lábát az Uno A5 lábához, valamint a VCC és GND kivezetéseket a tápsínekre.');

    const eepromMod = modules.find((m) => m.type === 'eeprom_24cxxx');
    if (eepromMod) {
      const chip = eepromMod.state.chipModel || '24C256';
      bomMap.set('eeprom_24cxxx', {
        id: 'eeprom_24cxxx',
        name: `AT${chip} I2C Soros EEPROM Memória IC`,
        category: 'Passzív Alkatrész',
        quantity: 1,
        specification: `32 KB (256 Kbit), DIP-8, 2.5V-5.5V, I2C cím: ${eepromMod.state.baseAddressHex || '0x50'}`,
        package: 'DIP-8',
        description: 'Nem felejtő külső memóriatároló I2C kétvezetékes busszal',
        estimatedCostHuf: 320,
      });

      components.push({
        id: 'comp_eeprom_24c',
        name: `AT${chip} (I2C: ${eepromMod.state.baseAddressHex || '0x50'})`,
        type: 'I2C EEPROM DIP-8',
        pins: [
          { pinName: 'SDA', connectedNetId: 'net_i2c_sda', wireColor: '#f59e0b' },
          { pinName: 'SCL', connectedNetId: 'net_i2c_scl', wireColor: '#10b981' },
          { pinName: 'VCC', connectedNetId: 'net_vcc_bus', wireColor: '#ef4444' },
          { pinName: 'GND', connectedNetId: 'net_gnd_bus', wireColor: '#1e293b' },
        ],
        icon: 'Database',
        x: compX,
        y: 120,
        width: 90,
        height: 60,
        color: '#10b981',
      });
      compX += 110;
    }

    const mcpMod = modules.find((m) => m.type === 'expander_mcp23017');
    if (mcpMod) {
      bomMap.set('expander_mcp23017', {
        id: 'expander_mcp23017',
        name: 'MCP23017 16-Bites I2C I/O Portbővítő IC',
        category: 'Aktuátor',
        quantity: 1,
        specification: '16 I/O Pin, DIP-28, 1.8V-5.5V, I2C cím: 0x20',
        package: 'DIP-28',
        description: '16 digitális be/kimenettel rendelkező I2C buszos portbővítő',
        estimatedCostHuf: 650,
      });

      components.push({
        id: 'comp_mcp23017',
        name: 'MCP23017 (16x I/O)',
        type: 'I2C Expander DIP-28',
        pins: [
          { pinName: 'SDA', connectedNetId: 'net_i2c_sda', wireColor: '#f59e0b' },
          { pinName: 'SCL', connectedNetId: 'net_i2c_scl', wireColor: '#10b981' },
          { pinName: 'VCC', connectedNetId: 'net_vcc_bus', wireColor: '#ef4444' },
          { pinName: 'GND', connectedNetId: 'net_gnd_bus', wireColor: '#1e293b' },
        ],
        icon: 'Cpu',
        x: compX,
        y: 120,
        width: 100,
        height: 60,
        color: '#f59e0b',
      });
      compX += 120;
    }

    const pcfMod = modules.find((m) => m.type === 'expander_pcf8574');
    if (pcfMod) {
      bomMap.set('expander_pcf8574', {
        id: 'expander_pcf8574',
        name: 'PCF8574 8-Bites I2C I/O Portbővítő IC',
        category: 'Aktuátor',
        quantity: 1,
        specification: '8 Quasi-Bidirectional I/O, DIP-16, I2C cím: 0x20',
        package: 'DIP-16',
        description: 'Egyszerű 8-bites I2C portbővítő IC',
        estimatedCostHuf: 420,
      });

      components.push({
        id: 'comp_pcf8574',
        name: 'PCF8574 (8x I/O)',
        type: 'I2C Expander DIP-16',
        pins: [
          { pinName: 'SDA', connectedNetId: 'net_i2c_sda', wireColor: '#f59e0b' },
          { pinName: 'SCL', connectedNetId: 'net_i2c_scl', wireColor: '#10b981' },
          { pinName: 'VCC', connectedNetId: 'net_vcc_bus', wireColor: '#ef4444' },
          { pinName: 'GND', connectedNetId: 'net_gnd_bus', wireColor: '#1e293b' },
        ],
        icon: 'Sliders',
        x: compX,
        y: 120,
        width: 90,
        height: 60,
        color: '#0284c7',
      });
      compX += 110;
    }
  }

  // Process SPI Bus Devices
  if (hasSpi) {
    bomMap.set('shift_74hc595', {
      id: 'shift_74hc595',
      name: '74HC595 8-bites Soros-Párhuzamos Léptetőregiszter',
      category: 'Aktuátor',
      quantity: 1,
      specification: 'DIP-16, 70 MHz max SPI shift',
      package: 'DIP-16',
      description: 'Láb-kiterjesztő IC SPI / 3-vezetékes vezérléssel',
      estimatedCostHuf: 180,
    });

    nets.push({
      id: 'net_spi_mosi',
      from: 'Arduino Uno Pin D11 (MOSI)',
      fromPin: '11',
      to: 'SPI Slave / 74HC595 DS (Serial Data)',
      toComponent: '74HC595 Shift Reg',
      toPin: 'DS (Pin 14)',
      wireColor: '#a855f7',
      signalType: 'SPI',
      notes: 'Master Out Slave In adatvonal',
    });

    nets.push({
      id: 'net_spi_miso',
      from: 'Arduino Uno Pin D12 (MISO)',
      fromPin: '12',
      to: 'SPI Slave MISO Adatvonal',
      toComponent: 'SPI Bus Slave',
      toPin: 'MISO (Pin 12)',
      wireColor: '#06b6d4',
      signalType: 'SPI',
      notes: 'Master In Slave Out adatvonal',
    });

    nets.push({
      id: 'net_spi_sck',
      from: 'Arduino Uno Pin D13 (SCK)',
      fromPin: '13',
      to: 'SPI Slave / 74HC595 SH_CP (Shift Clock)',
      toComponent: '74HC595 Shift Reg',
      toPin: 'SH_CP (Pin 11)',
      wireColor: '#ec4899',
      signalType: 'SPI',
      notes: 'SPI Órajel vonal',
    });

    nets.push({
      id: 'net_spi_ss',
      from: 'Arduino Uno Pin D10 (SS / Latch)',
      fromPin: '10',
      to: 'SPI Slave / 74HC595 ST_CP (Storage Latch)',
      toComponent: '74HC595 Shift Reg',
      toPin: 'ST_CP (Pin 12)',
      wireColor: '#f97316',
      signalType: 'SPI',
      notes: 'Slave Select / Kimenet reteszelő órajel',
    });

    assemblySteps.push('• Csatlakoztasd az SPI busz vonalait: MOSI (D11), MISO (D12), SCK (D13) és CS/SS (D10).');

    const spiEepromMod = modules.find((m) => m.type === 'eeprom_25lcxxx');
    if (spiEepromMod) {
      const chip = spiEepromMod.state.chipModel || '25LC256';
      bomMap.set('eeprom_25lcxxx', {
        id: 'eeprom_25lcxxx',
        name: `Microchip ${chip} SPI Soros EEPROM Memória IC`,
        category: 'Passzív Alkatrész',
        quantity: 1,
        specification: '32 KB (256 Kbit), DIP-8, 20 MHz SPI órajel',
        package: 'DIP-8',
        description: 'Nagy sebességű nem felejtő SPI EEPROM memória',
        estimatedCostHuf: 380,
      });

      components.push({
        id: 'comp_eeprom_25lc',
        name: `${chip} (SPI CS: D${spiEepromMod.pins?.CS || '10'})`,
        type: 'SPI EEPROM DIP-8',
        pins: [
          { pinName: 'SI', connectedNetId: 'net_spi_mosi', wireColor: '#a855f7' },
          { pinName: 'SO', connectedNetId: 'net_spi_miso', wireColor: '#06b6d4' },
          { pinName: 'SCK', connectedNetId: 'net_spi_sck', wireColor: '#ec4899' },
          { pinName: 'CS', connectedNetId: 'net_spi_ss', wireColor: '#f97316' },
        ],
        icon: 'Database',
        x: compX,
        y: 120,
        width: 90,
        height: 60,
        color: '#0891b2',
      });
      compX += 110;
    }

    const flashMod = modules.find((m) => m.type === 'flash_w25qxx');
    if (flashMod) {
      const chip = flashMod.state.chipModel || 'W25Q32';
      bomMap.set('flash_w25qxx', {
        id: 'flash_w25qxx',
        name: `Winbond ${chip} SPI NOR Flash Memória Modul`,
        category: 'Passzív Alkatrész',
        quantity: 1,
        specification: '32 Mbit (4 MB), 104 MHz SPI, 3.3V / 5V illesztővel',
        package: 'Module DIP-8',
        description: 'Nagy kapacitású SPI NOR Flash memóriamodul',
        estimatedCostHuf: 490,
      });

      components.push({
        id: 'comp_flash_w25q',
        name: `${chip} Flash (4MB)`,
        type: 'SPI Flash Module',
        pins: [
          { pinName: 'DI', connectedNetId: 'net_spi_mosi', wireColor: '#a855f7' },
          { pinName: 'DO', connectedNetId: 'net_spi_miso', wireColor: '#06b6d4' },
          { pinName: 'CLK', connectedNetId: 'net_spi_sck', wireColor: '#ec4899' },
          { pinName: 'CS', connectedNetId: 'net_spi_ss', wireColor: '#f97316' },
        ],
        icon: 'HardDrive',
        x: compX,
        y: 120,
        width: 100,
        height: 60,
        color: '#8b5cf6',
      });
      compX += 120;
    }
  }

  // Process 74HC165 PISO Shift Register
  const hc165Mod = modules.find((m) => m.type === 'shift_74hc165');
  if (hc165Mod) {
    bomMap.set('shift_74hc165', {
      id: 'shift_74hc165',
      name: '74HC165 8-bites Párhuzamos-Soros (PISO) Léptetőregiszter IC',
      category: 'Szenzor',
      quantity: 1,
      specification: 'DIP-16, 8 bemenet (D0-D7), soros QH kimenet',
      package: 'DIP-16',
      description: '8 bemeneti gomb vagy kapcsoló beolvasása 3 mikrovezérlő lábra',
      estimatedCostHuf: 210,
    });

    components.push({
      id: 'comp_74hc165',
      name: '74HC165 (8x IN -> PISO)',
      type: 'PISO Shift Reg DIP-16',
      pins: [
        { pinName: 'PL', connectedNetId: 'net_hc165_pl', wireColor: '#0d9488' },
        { pinName: 'CP', connectedNetId: 'net_spi_sck', wireColor: '#ec4899' },
        { pinName: 'Q7', connectedNetId: 'net_spi_miso', wireColor: '#06b6d4' },
      ],
      icon: 'Layers',
      x: compX,
      y: 120,
      width: 105,
      height: 60,
      color: '#0d9488',
    });
    compX += 125;
  }

  // Process 1-Wire DS18B20
  if (hasOneWire) {
    bomMap.set('ds18b20', {
      id: 'ds18b20',
      name: 'DS18B20 Digitális Hőmérséklet Szenzor',
      category: 'Szenzor',
      quantity: 1,
      specification: '-55°C .. +125°C, 9-12 bit felbontás',
      package: 'TO-92',
      description: 'Dallas 1-Wire precíziós hőmérő IC',
      estimatedCostHuf: 750,
    });

    bomMap.set('res_4k7', {
      id: 'res_4k7',
      name: '4.7 kΩ 1-Wire Felhúzó Ellenállás (DQ - VCC)',
      category: 'Passzív Alkatrész',
      quantity: 1,
      specification: '4.7 kΩ 1/4W 5%',
      package: 'Axial THT',
      description: '1-Wire adatvonal felhúzó ellenállás',
      estimatedCostHuf: 15,
    });

    nets.push({
      id: 'net_onewire_dq',
      from: `Arduino Uno Pin D${oneWirePin}`,
      fromPin: oneWirePin,
      to: 'DS18B20 DQ (Data) + 4.7kΩ Felhúzás',
      toComponent: 'DS18B20',
      toPin: 'DQ (Középső Láb)',
      wireColor: '#06b6d4',
      signalType: 'ONEWIRE',
      notes: '1-Wire digitális kétirányú adatvonal',
    });

    assemblySteps.push(`• Csatlakoztasd a DS18B20 DQ adatlábát a D${oneWirePin} lábhoz, és helyezz el egy 4.7kΩ felhúzó ellenállást a DQ és a +5V közé.`);
  }

  // Jumper Wires in BOM
  const jumperCount = Math.max(10, nets.length + 4);
  bomMap.set('jumper_wires', {
    id: 'jumper_wires',
    name: 'Szerelőkábel Készlet (Jumper Wires)',
    category: 'Egyéb',
    quantity: jumperCount,
    specification: 'Apa-Apa (Male-Male) 20cm',
    package: 'Ribbon Cable',
    description: 'Színes flexibilis összekötő vezetékek a próbapanelhez',
    estimatedCostHuf: 650,
  });

  // Final DRC checks
  if (totalEstimatedCurrentMa > 200) {
    drcIssues.push({
      id: 'drc_overcurrent',
      severity: 'warning',
      title: 'Magas Áramfelvételi Becslés (>200 mA)',
      description: `A csatlakoztatott perifériák becsült összesített áramfelvétele ${totalEstimatedCurrentMa} mA.`,
      recommendation: 'Javasolt külső 5V-os stabilizált tápegység használata a mikrokontroller USB portjának tehermentesítésére.',
    });
  }

  return {
    nets,
    bom: Array.from(bomMap.values()),
    drcIssues,
    components,
    activeArduinoPins,
    totalEstimatedCurrentMa,
    assemblySteps,
  };
}
