/**
 * (c) 2026 AI Studio AVR Visual Studio
 * Code Assistant & Smart Parameter/Variable Recommendation Engine
 * Provides intelligent, context-aware variable bindings, optimal presets, and hardware guidance
 */

import { ProgramBlock, VariableDefinition, ArduinoPin, BlockDefinition } from '../types';
import { BLOCK_DEFINITIONS } from '../data/blockDefinitions';
import { PIN_MAPPINGS, ARDUINO_PINS_ORDER } from './hardwareMap';

export interface SmartPresetOption {
  id: string;
  label: string;
  description: string;
  badge?: string;
  params: Record<string, any>;
  comment?: string;
}

export interface MatchedVariableOption {
  variable: VariableDefinition;
  targetParam: string;
  appliedValue: any;
  explanation: string;
  badge: string;
  isExactMatch: boolean;
}

export interface BlockAssistantReport {
  blockType: string;
  blockName: string;
  category: string;
  matchedVariables: MatchedVariableOption[];
  presets: SmartPresetOption[];
  hardwareTip: string;
  suggestedNewVariable?: {
    name: string;
    type: VariableDefinition['type'];
    memoryLocation: VariableDefinition['memoryLocation'];
    registerBinding?: string;
    initialValue: string;
    description: string;
  };
}

/**
 * Intelligent analyzer that inspects a block and available variables to generate context recommendations.
 */
export function getBlockAssistantReport(
  block: ProgramBlock,
  variables: VariableDefinition[] = []
): BlockAssistantReport {
  const def = BLOCK_DEFINITIONS[block.type];
  const blockType = block.type;
  const blockName = def ? def.name : blockType;
  const category = def ? def.category : 'general';

  const matchedVariables: MatchedVariableOption[] = [];
  const presets: SmartPresetOption[] = [];
  let hardwareTip = '';
  let suggestedNewVariable: BlockAssistantReport['suggestedNewVariable'] = undefined;

  // 1. PIN & DIGITAL I/O BLOCKS
  if (blockType === 'io_pin_write' || blockType === 'digital_write') {
    hardwareTip =
      'A közvetlen SBI/CBI utasítások 2 óraciklus (125ns) alatt futnak le, a digitalWrite() ~56 ciklusos késése helyett.';
    suggestedNewVariable = {
      name: 'ledState',
      type: 'bool',
      memoryLocation: 'sram',
      initialValue: '1',
      description: 'LED vagy kimeneti állapot logikai jelző',
    };

    presets.push(
      {
        id: 'p_led_high',
        label: 'LED Bekapcsolása (Pin 13 - HIGH)',
        description: 'Beépített LED bekapcsolása (PORTB.5 = 1)',
        badge: 'Ajánlott',
        params: { pin: '13', state: 'HIGH', value: 'HIGH' },
        comment: 'LED bekapcsolása (Pin 13)',
      },
      {
        id: 'p_led_low',
        label: 'LED Kikapcsolása (Pin 13 - LOW)',
        description: 'Beépített LED lekapcsolása (PORTB.5 = 0)',
        params: { pin: '13', state: 'LOW', value: 'LOW' },
        comment: 'LED kikapcsolása (Pin 13)',
      },
      {
        id: 'p_relay_on',
        label: 'Relé Aktiválás (Pin 7 - HIGH)',
        description: 'Relé modul bekapcsolása a 7-es lábon (PORTD.7)',
        params: { pin: '7', state: 'HIGH', value: 'HIGH' },
        comment: 'Relé meghúzása (Pin 7)',
      },
      {
        id: 'p_buzzer_on',
        label: 'Hangjelző / Zümmer (Pin 8 - HIGH)',
        description: 'Piezo buzzer indítása (PORTB.0)',
        params: { pin: '8', state: 'HIGH', value: 'HIGH' },
        comment: 'Zümmer bekapcsolása (Pin 8)',
      }
    );

    // Match variables
    variables.forEach((v) => {
      if (v.type === 'bool') {
        matchedVariables.push({
          variable: v,
          targetParam: blockType === 'io_pin_write' ? 'state' : 'value',
          appliedValue: v.initialValue === '1' || v.initialValue === 'true' ? 'HIGH' : 'LOW',
          explanation: `Logikai állapot (${v.name} = ${v.initialValue})`,
          badge: 'Bool állapot',
          isExactMatch: true,
        });
      }
      if (
        (v.type === 'uint8_t' || v.type === 'int8_t') &&
        (v.name.toLowerCase().includes('pin') || v.name.toLowerCase().includes('led'))
      ) {
        const pinNum = parseInt(v.initialValue, 10);
        if (!isNaN(pinNum) && pinNum >= 0 && pinNum <= 13) {
          matchedVariables.push({
            variable: v,
            targetParam: 'pin',
            appliedValue: String(pinNum),
            explanation: `Lábszám rendelés (${v.name} -> D${pinNum})`,
            badge: 'Láb változó',
            isExactMatch: true,
          });
        }
      }
    });
  } else if (blockType === 'io_pin_mode' || blockType === 'pin_mode') {
    hardwareTip =
      'A DDRx regiszter határozza meg a láb irányát: 1 = OUTPUT (Kimenet), 0 = INPUT (Bemenet).';
    suggestedNewVariable = {
      name: 'sensorPin',
      type: 'uint8_t',
      memoryLocation: 'sram',
      initialValue: '2',
      description: 'Digitális bemeneti láb azonosító',
    };

    presets.push(
      {
        id: 'p_mode_led_out',
        label: 'LED Kimenet (Pin 13 - OUTPUT)',
        description: 'DDRB.5 = 1 kimenet beállítása',
        badge: 'Alapértelmezett',
        params: { pin: '13', mode: 'OUTPUT' },
      },
      {
        id: 'p_mode_btn_in',
        label: 'Nyomógomb Bemenet (Pin 2 - INPUT)',
        description: 'DDRD.2 = 0 bemenetként',
        params: { pin: '2', mode: 'INPUT' },
      },
      {
        id: 'p_mode_relay_out',
        label: 'Relé Kimenet (Pin 7 - OUTPUT)',
        description: 'DDRD.7 = 1 kimenetként',
        params: { pin: '7', mode: 'OUTPUT' },
      }
    );

    variables.forEach((v) => {
      if (
        (v.type === 'uint8_t' || v.type === 'int8_t') &&
        (v.name.toLowerCase().includes('pin') || v.name.toLowerCase().includes('led') || v.name.toLowerCase().includes('btn'))
      ) {
        const pinNum = parseInt(v.initialValue, 10);
        if (!isNaN(pinNum) && pinNum >= 0 && pinNum <= 13) {
          matchedVariables.push({
            variable: v,
            targetParam: 'pin',
            appliedValue: String(pinNum),
            explanation: `Lábszám hozzárendelése: ${v.name} (Pin ${pinNum})`,
            badge: 'Láb azonosító',
            isExactMatch: true,
          });
        }
      }
    });
  } else if (blockType === 'io_pin_toggle') {
    hardwareTip =
      'ATmega328P mikrovezérlőn a PINx regiszterbe 1-et írva a kimenet hardveresen átbillen (1 óraciklus sbi PINB, 5).';
    presets.push(
      {
        id: 'p_toggle_13',
        label: 'Beépített LED Átbillentése (Pin 13)',
        description: 'PINB.5 toggle (1 óraciklus sbi PINB, 5)',
        badge: 'Optimális',
        params: { pin: '13' },
      },
      {
        id: 'p_toggle_8',
        label: 'Pin 8 Átbillentése (PORTB.0)',
        description: 'PINB.0 toggle',
        params: { pin: '8' },
      }
    );
  }

  // 2. TIMING & DELAYS
  else if (blockType === 'timing_milli_delay' || blockType === 'delay_ms') {
    hardwareTip =
      'A szoftveres késleltető hurkok pontos 16 MHz órajel-alapú ciklusszámlálást használnak.';
    suggestedNewVariable = {
      name: 'blinkIntervalMs',
      type: 'uint16_t',
      memoryLocation: 'sram',
      initialValue: '500',
      description: 'Villogási vagy mintavételezési periódusidő (ms)',
    };

    presets.push(
      {
        id: 'p_delay_1000',
        label: '1 másodperc (1000 ms)',
        description: 'Klasszikus 1 Hz-es ütemezés (16 000 000 ciklus)',
        badge: '1 Hz',
        params: { ms: 1000, value: 1000 },
      },
      {
        id: 'p_delay_500',
        label: 'Fél másodperc (500 ms)',
        description: '2 Hz-es gyors ütemezés',
        params: { ms: 500, value: 500 },
      },
      {
        id: 'p_delay_250',
        label: 'Negyed másodperc (250 ms)',
        description: '4 Hz-es vizuális állapotjelzés',
        params: { ms: 250, value: 250 },
      },
      {
        id: 'p_delay_50',
        label: 'Pergésmentesítés (50 ms)',
        description: 'Gomb pergésmentesítés (debounce)',
        badge: 'Debounce',
        params: { ms: 50, value: 50 },
      },
      {
        id: 'p_delay_10',
        label: 'Gyors szenzor várakozás (10 ms)',
        description: 'Rövid stabilizációs idő',
        params: { ms: 10, value: 10 },
      }
    );

    variables.forEach((v) => {
      if (
        (v.type === 'uint16_t' || v.type === 'uint32_t' || v.type === 'uint8_t' || v.type === 'int16_t') &&
        (v.name.toLowerCase().includes('delay') ||
          v.name.toLowerCase().includes('interval') ||
          v.name.toLowerCase().includes('time') ||
          v.name.toLowerCase().includes('period') ||
          v.name.toLowerCase().includes('ms'))
      ) {
        const val = parseInt(v.initialValue, 10);
        if (!isNaN(val) && val > 0) {
          matchedVariables.push({
            variable: v,
            targetParam: 'ms',
            appliedValue: val,
            explanation: `Időzítési érték alkalmazása: ${v.name} = ${val} ms`,
            badge: 'Időzítő változó',
            isExactMatch: true,
          });
        }
      }
    });
  } else if (blockType === 'timing_micro_delay' || blockType === 'delay_us') {
    hardwareTip =
      '1 mikromásodperc 16 MHz órajelnél pontosan 16 processzorciklust jelent.';
    presets.push(
      {
        id: 'p_us_10',
        label: '10 µs (Ultrasonic HC-SR04 Trigger)',
        description: 'HC-SR04 ultrahangos indító impulzus',
        badge: 'HC-SR04',
        params: { us: 10, value: 10 },
      },
      {
        id: 'p_us_50',
        label: '50 µs (DHT11 / 1-Wire várakozás)',
        description: 'Egyvezetékes busz időzítés',
        params: { us: 50, value: 50 },
      },
      {
        id: 'p_us_100',
        label: '100 µs (I2C / SPI Setup)',
        description: 'Busz stabilizálás',
        params: { us: 100, value: 100 },
      }
    );
  }

  // 3. SRAM & MEMORY VARIABLES (store_sram, load_sram, pointer, array)
  else if (
    blockType === 'store_sram' ||
    blockType === 'load_sram' ||
    blockType === 'sram_read' ||
    blockType === 'sram_write' ||
    blockType.startsWith('array_') ||
    blockType.startsWith('pointer_') ||
    blockType.startsWith('struct_')
  ) {
    hardwareTip =
      'Az ATmega328P SRAM címei 0x0100-tól (256. bájttól) kezdődnek, az első 256 bájt a 32 általános regiszter és az I/O címek számára van fenntartva.';
    suggestedNewVariable = {
      name: 'dataBuffer',
      type: 'uint8_t',
      memoryLocation: 'sram',
      initialValue: '0',
      description: 'SRAM adat vagy mérési puffer bájt',
    };

    presets.push(
      {
        id: 'p_sram_0100',
        label: 'SRAM Kezdőcím (0x0100)',
        description: 'Első szabad SRAM cím (ATmega328P)',
        badge: '0x0100',
        params: { address: '0x0100', reg: 'r16' },
      },
      {
        id: 'p_sram_0120',
        label: 'SRAM Adatblokk (0x0120)',
        description: 'Második munkapuffer cím',
        params: { address: '0x0120', reg: 'r16' },
      }
    );

    // Look for all SRAM variables
    variables.forEach((v) => {
      if (v.memoryLocation === 'sram') {
        const addrHex = v.sramAddress ? `0x${v.sramAddress.toString(16).toUpperCase()}` : '0x0100';
        matchedVariables.push({
          variable: v,
          targetParam: 'address',
          appliedValue: addrHex,
          explanation: `Változó memóriacíme: ${v.name} (${v.type}) @ ${addrHex}`,
          badge: `${v.type} @ ${addrHex}`,
          isExactMatch: true,
        });
      }
    });
  }

  // 4. REGISTERS & FAST ALU
  else if (
    blockType === 'load_register_immediate' ||
    blockType === 'mov_register' ||
    blockType === 'math_add' ||
    blockType === 'math_sub' ||
    blockType === 'math_inc' ||
    blockType === 'compare_branch' ||
    blockType === 'bitwise_and' ||
    blockType === 'bitwise_or'
  ) {
    hardwareTip =
      'Az LDI (Load Immediate) közvetlen konstansbetöltést csak az r16–r31 regiszterek támogatnak (1 óraciklus).';
    suggestedNewVariable = {
      name: 'fastCounter',
      type: 'uint8_t',
      memoryLocation: 'register',
      registerBinding: 'r16',
      initialValue: '0',
      description: 'Gyors hardveres ciklusszámláló az r16 regiszterben',
    };

    presets.push(
      {
        id: 'p_reg_clear',
        label: 'Regiszter Nullázása (r16 = 0)',
        description: 'clr r16 vagy ldi r16, 0 (1 ciklus)',
        badge: 'Nullázás',
        params: { reg: 'r16', value: 0 },
      },
      {
        id: 'p_reg_all_ones',
        label: 'Összes Bit 1-be (r16 = 0xFF / 255)',
        description: 'Maszk vagy teljes kimenet',
        params: { reg: 'r16', value: 255 },
      },
      {
        id: 'p_reg_ascii_a',
        label: 'ASCII "A" Betöltése (r16 = 65)',
        description: 'Karakterküldés előkészítése UART-ra',
        badge: 'ASCII 65',
        params: { reg: 'r16', value: 65 },
      },
      {
        id: 'p_reg_bit0',
        label: 'Maszk Bit 0 (r16 = 0x01)',
        description: 'Egyetlen bit tesztelése vagy beállítása',
        params: { reg: 'r16', value: 1 },
      }
    );

    // Look for register-bound variables or fast counters
    variables.forEach((v) => {
      if (v.memoryLocation === 'register' && v.registerBinding) {
        matchedVariables.push({
          variable: v,
          targetParam: 'reg',
          appliedValue: v.registerBinding,
          explanation: `Kötött regiszter: ${v.name} (${v.registerBinding})`,
          badge: `${v.registerBinding}`,
          isExactMatch: true,
        });
      }
      if (v.type === 'uint8_t' || v.type === 'int8_t') {
        const val = parseInt(v.initialValue, 10);
        if (!isNaN(val)) {
          matchedVariables.push({
            variable: v,
            targetParam: 'value',
            appliedValue: val,
            explanation: `Kezdőérték másolása: ${v.name} = ${val}`,
            badge: `Érték: ${val}`,
            isExactMatch: false,
          });
        }
      }
    });
  }

  // 5. ANALOG & PWM
  else if (blockType === 'analog_read' || blockType === 'adc_read') {
    hardwareTip =
      'Az ATmega328P 10-bites SAR ADC-je 13-25 ADC óraciklust (kb. 65-104 µs @ 125kHz ADC órajel) igényel a konverzióhoz (0-1023 eredmény).';
    suggestedNewVariable = {
      name: 'adcRawValue',
      type: 'uint16_t',
      memoryLocation: 'sram',
      initialValue: '0',
      description: '10-bites analóg mérési nyers adat (0..1023)',
    };

    presets.push(
      {
        id: 'p_adc_a0',
        label: 'A0 Bemenet (Fényérzékelő / LDR)',
        description: 'PC0 / ADC0 csatorna olvasása',
        badge: 'A0',
        params: { pin: 'A0', channel: 0 },
      },
      {
        id: 'p_adc_a1',
        label: 'A1 Bemenet (Potenciométer)',
        description: 'PC1 / ADC1 csatorna olvasása',
        params: { pin: 'A1', channel: 1 },
      },
      {
        id: 'p_adc_a2',
        label: 'A2 Bemenet (Hőmérséklet Szenzor)',
        description: 'PC2 / ADC2 (pl. LM35 vagy NTC)',
        params: { pin: 'A2', channel: 2 },
      }
    );

    variables.forEach((v) => {
      if (
        (v.type === 'uint16_t' || v.type === 'int16_t' || v.type === 'uint8_t') &&
        (v.name.toLowerCase().includes('adc') ||
          v.name.toLowerCase().includes('analog') ||
          v.name.toLowerCase().includes('sensor') ||
          v.name.toLowerCase().includes('raw'))
      ) {
        matchedVariables.push({
          variable: v,
          targetParam: 'destVar',
          appliedValue: v.name,
          explanation: `Analóg mérési célváltozó: ${v.name} (${v.type})`,
          badge: 'ADC Változó',
          isExactMatch: true,
        });
      }
    });
  } else if (blockType === 'pwm_write' || blockType === 'analog_write') {
    hardwareTip =
      'Az Arduino Uno-n a 3, 5, 6, 9, 10, 11-es lábak támogatják a hardveres PWM-et (8-bites felbontás: 0..255).';
    suggestedNewVariable = {
      name: 'pwmDutyCycle',
      type: 'uint8_t',
      memoryLocation: 'sram',
      initialValue: '128',
      description: 'PWM kitöltési tényező (0=0%, 128=50%, 255=100%)',
    };

    presets.push(
      {
        id: 'p_pwm_50',
        label: 'Pin 9 - 50% Fényerő (128)',
        description: 'Timer1 OC1A PWM csatorna 50% kitöltés',
        badge: '50% PWM',
        params: { pin: '9', duty: 128, value: 128 },
      },
      {
        id: 'p_pwm_100',
        label: 'Pin 9 - 100% Teljes (255)',
        description: 'Folyamatos 5V kimenet',
        params: { pin: '9', duty: 255, value: 255 },
      },
      {
        id: 'p_pwm_25',
        label: 'Pin 3 - 25% Fényerő (64)',
        description: 'Timer2 OC2B PWM csatorna',
        params: { pin: '3', duty: 64, value: 64 },
      },
      {
        id: 'p_pwm_0',
        label: 'Pin 9 - 0% Kikapcsolva (0)',
        description: '0V kimenet',
        params: { pin: '9', duty: 0, value: 0 },
      }
    );

    variables.forEach((v) => {
      if (
        (v.type === 'uint8_t' || v.type === 'int8_t') &&
        (v.name.toLowerCase().includes('pwm') ||
          v.name.toLowerCase().includes('duty') ||
          v.name.toLowerCase().includes('speed') ||
          v.name.toLowerCase().includes('bright'))
      ) {
        const val = parseInt(v.initialValue, 10);
        matchedVariables.push({
          variable: v,
          targetParam: 'duty',
          appliedValue: !isNaN(val) ? val : 128,
          explanation: `Kitöltési tényező: ${v.name} (${v.initialValue})`,
          badge: 'PWM Változó',
          isExactMatch: true,
        });
      }
    });
  }

  // 6. UART & PROTOCOLS
  else if (blockType === 'uart_init' || blockType === 'uart_baud_rate') {
    hardwareTip =
      '16 MHz-es órajelnél az UBRR0 értéke 9600 Baudhoz 103, míg 115200 Baudhoz 8 (U2X0 = 0 módban).';
    presets.push(
      {
        id: 'p_uart_9600',
        label: '9600 Baud (Standard)',
        description: 'UBRR0 = 103, megbízható lassú adatátvitel',
        badge: '9600 Baud',
        params: { baud: '9600', baudRate: '9600' },
      },
      {
        id: 'p_uart_115200',
        label: '115200 Baud (Nagysebességű)',
        description: 'UBRR0 = 8, gyors telemetria és parancsok',
        badge: '115200 Baud',
        params: { baud: '115200', baudRate: '115200' },
      },
      {
        id: 'p_uart_57600',
        label: '57600 Baud (Közepes)',
        description: 'UBRR0 = 16',
        params: { baud: '57600', baudRate: '57600' },
      }
    );
  } else if (blockType === 'uart_tx' || blockType === 'uart_send_byte') {
    hardwareTip =
      'Az UDR0 regiszterbe írás előtt meg kell várni, hogy az UDRE0 (USART Data Register Empty) jelzőbit 1-be álljon.';
    presets.push(
      {
        id: 'p_uart_tx_ok',
        label: 'Üzenet: "OK\\n" Küldése',
        description: 'Státusz megerősítő válasz küldése',
        badge: 'Státusz',
        params: { data: 'OK\n', char: 'O' },
      },
      {
        id: 'p_uart_tx_nl',
        label: 'Újsor (CR LF - 0x0D 0x0A)',
        description: 'Terminál soremelés',
        params: { data: '\r\n', char: '\n' },
      }
    );

    variables.forEach((v) => {
      if (v.type === 'string' || v.type === 'char' || v.type === 'array') {
        matchedVariables.push({
          variable: v,
          targetParam: 'data',
          appliedValue: v.initialValue,
          explanation: `Szöveges / Bájtpuffer küldése: ${v.name}`,
          badge: `${v.type}`,
          isExactMatch: true,
        });
      }
    });
  }

  // 7. I2C & SPI
  else if (blockType === 'i2c_write' || blockType === 'i2c_start' || blockType === 'i2c_read') {
    hardwareTip =
      'Az ATmega328P TWI (I2C) hardveres modulja PC4 (SDA) és PC5 (SCL) lábakon működik, tipikusan 100 kHz vagy 400 kHz órajellel.';
    presets.push(
      {
        id: 'p_i2c_oled',
        label: '0x3C (SSD1306 0.96" OLED Kijelző)',
        description: 'Leggyakoribb I2C OLED cím',
        badge: 'OLED 0x3C',
        params: { address: '0x3C' },
      },
      {
        id: 'p_i2c_lcd',
        label: '0x27 (PCF8574 16x2 / 20x4 LCD)',
        description: 'Standard I2C LCD modul cím',
        badge: 'LCD 0x27',
        params: { address: '0x27' },
      },
      {
        id: 'p_i2c_mpu',
        label: '0x68 (MPU-6050 Gyorsulás & Giroszkóp)',
        description: '6-tengelyes IMU szenzor',
        badge: 'MPU6050',
        params: { address: '0x68' },
      },
      {
        id: 'p_i2c_rtc',
        label: '0x68 (DS3231 / DS1307 Valós Idejű Óra)',
        description: 'RTC óramodul I2C cím',
        params: { address: '0x68' },
      },
      {
        id: 'p_i2c_bmp',
        label: '0x76 (BMP280 / BME280 Légnyomás & Páratartalom)',
        description: 'Környezeti szenzor alapértelmezett címe',
        badge: 'BME280',
        params: { address: '0x76' },
      }
    );
  }

  // 8. INTERRUPTS & TIMERS
  else if (blockType === 'interrupt_ext0' || blockType === 'interrupt_ext1' || blockType === 'attach_interrupt') {
    hardwareTip =
      'INT0 (Pin 2 / PD2) és INT1 (Pin 3 / PD3) hardveres külső megszakítások közvetlenül ugranak a vektorcímekre (kb. 4 ciklus reakcióidő).';
    presets.push(
      {
        id: 'p_int0_falling',
        label: 'INT0 (Pin 2) - Le-futó él (FALLING)',
        description: 'Nyomógomb lenyomás azonnali érzékelése',
        badge: 'Gomb lenyomás',
        params: { pin: '2', mode: 'FALLING', trigger: 'FALLING' },
      },
      {
        id: 'p_int0_rising',
        label: 'INT0 (Pin 2) - Fel-futó él (RISING)',
        description: 'Nyomógomb felengedés vagy jelimpulzus',
        params: { pin: '2', mode: 'RISING', trigger: 'RISING' },
      },
      {
        id: 'p_int1_change',
        label: 'INT1 (Pin 3) - Szintváltozás (CHANGE)',
        description: 'Rotary encoder vagy bármely állapotváltozás',
        badge: 'Enkóder',
        params: { pin: '3', mode: 'CHANGE', trigger: 'CHANGE' },
      }
    );

    variables.forEach((v) => {
      if (v.isVolatile || v.scope === 'isr_volatile') {
        matchedVariables.push({
          variable: v,
          targetParam: 'flagVar',
          appliedValue: v.name,
          explanation: `Megszakításbiztos volatile jelző: ${v.name}`,
          badge: 'ISR Volatile',
          isExactMatch: true,
        });
      }
    });
  }

  // Generic fallback presets for remaining blocks if empty
  if (presets.length === 0 && def) {
    presets.push({
      id: 'p_default',
      label: 'Gyári Alapértelmezés',
      description: 'Hivatalos referencia paraméterek visszaállítása',
      params: { ...def.defaultParams },
    });
  }

  return {
    blockType,
    blockName,
    category,
    matchedVariables,
    presets,
    hardwareTip: hardwareTip || 'Minden blokk közvetlenül leképeződik optimális gépi ciklusokra.',
    suggestedNewVariable,
  };
}
