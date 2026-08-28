import { ArduinoPin, PortName, DdrName, PinRegName } from '../types';

export interface PinMapping {
  pin: ArduinoPin;
  port: PortName;
  ddr: DdrName;
  pinReg: PinRegName;
  bit: number;
  portAddr: string; // e.g. "0x05" for PORTB (SBI/CBI direct low-IO)
  ddrAddr: string;  // e.g. "0x04" for DDRB
  pinAddr: string;  // e.g. "0x03" for PINB
  description: string;
  special?: string;
}

export const PIN_MAPPINGS: Record<ArduinoPin, PinMapping> = {
  '0': { pin: '0', port: 'PORTD', ddr: 'DDRD', pinReg: 'PIND', bit: 0, portAddr: '0x0B', ddrAddr: '0x0A', pinAddr: '0x09', description: 'PD0 (RXD)', special: 'UART RX' },
  '1': { pin: '1', port: 'PORTD', ddr: 'DDRD', pinReg: 'PIND', bit: 1, portAddr: '0x0B', ddrAddr: '0x0A', pinAddr: '0x09', description: 'PD1 (TXD)', special: 'UART TX' },
  '2': { pin: '2', port: 'PORTD', ddr: 'DDRD', pinReg: 'PIND', bit: 2, portAddr: '0x0B', ddrAddr: '0x0A', pinAddr: '0x09', description: 'PD2 (INT0)', special: 'Külső Megszakítás 0' },
  '3': { pin: '3', port: 'PORTD', ddr: 'DDRD', pinReg: 'PIND', bit: 3, portAddr: '0x0B', ddrAddr: '0x0A', pinAddr: '0x09', description: 'PD3 (INT1/OC2B)', special: 'PWM / INT1' },
  '4': { pin: '4', port: 'PORTD', ddr: 'DDRD', pinReg: 'PIND', bit: 4, portAddr: '0x0B', ddrAddr: '0x0A', pinAddr: '0x09', description: 'PD4 (T0/XCK)', special: 'Timer0 Bemenet' },
  '5': { pin: '5', port: 'PORTD', ddr: 'DDRD', pinReg: 'PIND', bit: 5, portAddr: '0x0B', ddrAddr: '0x0A', pinAddr: '0x09', description: 'PD5 (T1/OC0B)', special: 'PWM / Timer1 Bemenet' },
  '6': { pin: '6', port: 'PORTD', ddr: 'DDRD', pinReg: 'PIND', bit: 6, portAddr: '0x0B', ddrAddr: '0x0A', pinAddr: '0x09', description: 'PD6 (AIN0/OC0A)', special: 'PWM' },
  '7': { pin: '7', port: 'PORTD', ddr: 'DDRD', pinReg: 'PIND', bit: 7, portAddr: '0x0B', ddrAddr: '0x0A', pinAddr: '0x09', description: 'PD7 (AIN1)', special: 'Analóg Komparátor' },
  '8': { pin: '8', port: 'PORTB', ddr: 'DDRB', pinReg: 'PINB', bit: 0, portAddr: '0x05', ddrAddr: '0x04', pinAddr: '0x03', description: 'PB0 (ICP1)', special: 'Timer1 Input Capture' },
  '9': { pin: '9', port: 'PORTB', ddr: 'DDRB', pinReg: 'PINB', bit: 1, portAddr: '0x05', ddrAddr: '0x04', pinAddr: '0x03', description: 'PB1 (OC1A)', special: 'PWM (Timer1 16-bit)' },
  '10': { pin: '10', port: 'PORTB', ddr: 'DDRB', pinReg: 'PINB', bit: 2, portAddr: '0x05', ddrAddr: '0x04', pinAddr: '0x03', description: 'PB2 (SS/OC1B)', special: 'PWM / SPI SS' },
  '11': { pin: '11', port: 'PORTB', ddr: 'DDRB', pinReg: 'PINB', bit: 3, portAddr: '0x05', ddrAddr: '0x04', pinAddr: '0x03', description: 'PB3 (MOSI/OC2A)', special: 'PWM / SPI MOSI' },
  '12': { pin: '12', port: 'PORTB', ddr: 'DDRB', pinReg: 'PINB', bit: 4, portAddr: '0x05', ddrAddr: '0x04', pinAddr: '0x03', description: 'PB4 (MISO)', special: 'SPI MISO' },
  '13': { pin: '13', port: 'PORTB', ddr: 'DDRB', pinReg: 'PINB', bit: 5, portAddr: '0x05', ddrAddr: '0x04', pinAddr: '0x03', description: 'PB5 (SCK / Beépített LED)', special: 'Beépített LED L / SPI SCK' },
  'A0': { pin: 'A0', port: 'PORTC', ddr: 'DDRC', pinReg: 'PINC', bit: 0, portAddr: '0x08', ddrAddr: '0x07', pinAddr: '0x06', description: 'PC0 (ADC0)', special: 'Analóg 0' },
  'A1': { pin: 'A1', port: 'PORTC', ddr: 'DDRC', pinReg: 'PINC', bit: 1, portAddr: '0x08', ddrAddr: '0x07', pinAddr: '0x06', description: 'PC1 (ADC1)', special: 'Analóg 1' },
  'A2': { pin: 'A2', port: 'PORTC', ddr: 'DDRC', pinReg: 'PINC', bit: 2, portAddr: '0x08', ddrAddr: '0x07', pinAddr: '0x06', description: 'PC2 (ADC2)', special: 'Analóg 2' },
  'A3': { pin: 'A3', port: 'PORTC', ddr: 'DDRC', pinReg: 'PINC', bit: 3, portAddr: '0x08', ddrAddr: '0x07', pinAddr: '0x06', description: 'PC3 (ADC3)', special: 'Analóg 3' },
  'A4': { pin: 'A4', port: 'PORTC', ddr: 'DDRC', pinReg: 'PINC', bit: 4, portAddr: '0x08', ddrAddr: '0x07', pinAddr: '0x06', description: 'PC4 (ADC4/SDA)', special: 'I2C SDA / Analóg 4' },
  'A5': { pin: 'A5', port: 'PORTC', ddr: 'DDRC', pinReg: 'PINC', bit: 5, portAddr: '0x08', ddrAddr: '0x07', pinAddr: '0x06', description: 'PC5 (ADC5/SCL)', special: 'I2C SCL / Analóg 5' },
};

export const ARDUINO_PINS_ORDER: ArduinoPin[] = [
  '0', '1', '2', '3', '4', '5', '6', '7',
  '8', '9', '10', '11', '12', '13',
  'A0', 'A1', 'A2', 'A3', 'A4', 'A5'
];

export const CPU_FREQ_HZ = 16000000; // 16 MHz ATmega328P
export const CYCLE_NS = 62.5; // 62.5 nanoseconds per cycle (1 / 16MHz)
