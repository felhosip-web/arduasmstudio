import {
  CPU,
  avrInstruction,
  AVRIOPort,
  portBConfig,
  portCConfig,
  portDConfig,
  AVRTimer,
  timer0Config,
  timer1Config,
  timer2Config,
  AVRUSART,
  usart0Config,
  AVRADC,
  adcConfig,
  AVRSPI,
  spiConfig,
  AVRTWI,
  twiConfig,
  AVREEPROM,
  EEPROMMemoryBackend,
  eepromConfig,
  PinState as AvrPinState,
} from 'avr8js';
import { ArduinoPin, PinState, RegisterBank, AvrWatchpoint, WatchpointHitEvent, AvrStackMemorySnapshot } from '../types';
import { checkAvrWatchpoints, disassembleAvrOpcode } from './watchpointEngine';
import { analyzeSramMemory } from './stackEngine';

export interface AvrCpuSnapshot {
  pc: number;
  cycles: number;
  sp: number;
  sreg: {
    C: boolean;
    Z: boolean;
    N: boolean;
    V: boolean;
    S: boolean;
    H: boolean;
    T: boolean;
    I: boolean;
  };
  sregVal?: number;
  registers: RegisterBank;
  pinStates: Record<ArduinoPin, PinState>;
  usartText: string;
  isHalted: boolean;
  lastExecutedAsm?: string;
  portBVal?: number;
  portCVal?: number;
  portDVal?: number;
  sram?: Uint8Array;
}

/**
 * Parses standard Intel HEX file format into a Uint8Array byte buffer.
 */
export function parseIntelHex(hexString: string): { data: Uint8Array; byteCount: number; maxAddress: number } {
  const flash = new Uint8Array(32768); // 32KB ATmega328P Flash
  let byteCount = 0;
  let maxAddress = 0;
  let baseAddress = 0;

  const lines = hexString.split(/\r?\n/);
  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const line = lines[lineIndex].trim();
    if (!line.startsWith(':')) continue;

    const count = parseInt(line.substring(1, 3), 16);
    const address = parseInt(line.substring(3, 7), 16) + baseAddress;
    const recordType = parseInt(line.substring(7, 9), 16);

    if (recordType === 0x00) {
      // Data Record
      for (let i = 0; i < count; i++) {
        const byteVal = parseInt(line.substring(9 + i * 2, 11 + i * 2), 16);
        const targetAddr = address + i;
        if (targetAddr < flash.length) {
          flash[targetAddr] = byteVal;
          byteCount++;
          if (targetAddr > maxAddress) maxAddress = targetAddr;
        }
      }
    } else if (recordType === 0x01) {
      // End Of File
      break;
    } else if (recordType === 0x02) {
      // Extended Segment Address
      baseAddress = parseInt(line.substring(9, 13), 16) << 4;
    } else if (recordType === 0x04) {
      // Extended Linear Address
      baseAddress = parseInt(line.substring(9, 13), 16) << 16;
    }
  }

  return { data: flash, byteCount, maxAddress };
}

/**
 * Converts a Uint8Array into a Uint16Array of AVR program words.
 */
export function bytesToProgMem(bytes: Uint8Array): Uint16Array {
  const words = new Uint16Array(16384); // 16k words = 32KB
  for (let i = 0; i < bytes.length; i += 2) {
    const low = bytes[i] || 0;
    const high = bytes[i + 1] || 0;
    words[i >> 1] = (high << 8) | low;
  }
  return words;
}

/**
 * High-performance Avr8js Real AVR Microcontroller Runner
 */
export class Avr8jsRunner {
  public cpu: CPU | null = null;
  public portB: AVRIOPort | null = null;
  public portC: AVRIOPort | null = null;
  public portD: AVRIOPort | null = null;
  public timer0: AVRTimer | null = null;
  public timer1: AVRTimer | null = null;
  public timer2: AVRTimer | null = null;
  public usart: AVRUSART | null = null;
  public adc: AVRADC | null = null;
  public spi: AVRSPI | null = null;
  public twi: AVRTWI | null = null;
  public eeprom: AVREEPROM | null = null;
  public eepromBackend: EEPROMMemoryBackend = new EEPROMMemoryBackend(1024);
  public eepromData: Uint8Array = new Uint8Array(1024).fill(0xFF);

  public progMem: Uint16Array = new Uint16Array(16384);
  public usartOutputBuffer: string = '';
  public onUsartByteReceived?: (char: string, byteVal: number) => void;
  public onPinStateChanged?: (pins: Record<ArduinoPin, PinState>) => void;
  public onEepromWrite?: (address: number, value: number) => void;
  public watchpoints: AvrWatchpoint[] = [];
  public onWatchpointHit?: (hit: WatchpointHitEvent) => void;
  public onStackOverflow?: (stackSnap: AvrStackMemorySnapshot) => void;

  public setWatchpoints(watchpoints: AvrWatchpoint[]): void {
    this.watchpoints = [...watchpoints];
  }

  private isRunning: boolean = false;
  private animFrameId: number | null = null;
  private currentPinStates: Record<ArduinoPin, PinState> = {} as any;
  private prevPortBVal: number = 0;
  private prevPortCVal: number = 0;
  private prevPortDVal: number = 0;
  private prevSpVal: number = 0x08ff;

  constructor() {
    this.initDefaultPinStates();
  }

  private initDefaultPinStates() {
    const pins: ArduinoPin[] = [
      '0', '1', '2', '3', '4', '5', '6', '7',
      '8', '9', '10', '11', '12', '13',
      'A0', 'A1', 'A2', 'A3', 'A4', 'A5',
    ];
    pins.forEach((pin) => {
      this.currentPinStates[pin] = {
        mode: 'INPUT',
        value: 0,
        label: pin === '13' ? 'LED (PB5)' : pin === 'A4' ? 'SDA (PC4)' : pin === 'A5' ? 'SCL (PC5)' : `D${pin}`,
      };
    });
  }

  /**
   * Load Intel HEX format into AVR Flash
   */
  public loadHex(hexString: string): { success: boolean; byteCount: number; error?: string } {
    try {
      const { data, byteCount } = parseIntelHex(hexString);
      if (byteCount === 0) {
        return { success: false, byteCount: 0, error: 'Üres vagy érvénytelen Intel HEX tartalom!' };
      }
      this.progMem = bytesToProgMem(data);
      this.resetCpu();
      return { success: true, byteCount };
    } catch (e: any) {
      return { success: false, byteCount: 0, error: e?.message || 'HEX feldolgozási hiba' };
    }
  }

  /**
   * Load raw Uint8Array / Uint16Array bytes directly into flash
   */
  public loadBytes(bytes: Uint8Array): void {
    this.progMem = bytesToProgMem(bytes);
    this.resetCpu();
  }

  /**
   * Reset CPU and attach all hardware peripherals
   */
  public resetCpu(): void {
    this.stop();
    this.cpu = new CPU(this.progMem, 2048); // ATmega328P 2KB SRAM
    this.usartOutputBuffer = '';
    this.initDefaultPinStates();

    // Attach GPIO Ports
    this.portB = new AVRIOPort(this.cpu, portBConfig);
    this.portC = new AVRIOPort(this.cpu, portCConfig);
    this.portD = new AVRIOPort(this.cpu, portDConfig);

    // Attach Timers
    this.timer0 = new AVRTimer(this.cpu, timer0Config);
    this.timer1 = new AVRTimer(this.cpu, timer1Config);
    this.timer2 = new AVRTimer(this.cpu, timer2Config);

    // Attach USART0 (16MHz)
    this.usart = new AVRUSART(this.cpu, usart0Config, 16e6);
    this.usart.onByteTransmit = (byteVal: number) => {
      const char = String.fromCharCode(byteVal);
      this.usartOutputBuffer += char;
      if (this.onUsartByteReceived) {
        this.onUsartByteReceived(char, byteVal);
      }
    };

    // Attach ADC, SPI & TWI
    this.adc = new AVRADC(this.cpu, adcConfig);
    this.spi = new AVRSPI(this.cpu, spiConfig, 16e6);
    this.twi = new AVRTWI(this.cpu, twiConfig, 16e6);

    // Attach 1KB EEPROM
    this.eepromBackend = new EEPROMMemoryBackend(1024);
    if (this.eepromData && this.eepromData.length === 1024) {
      this.eepromBackend.memory.set(this.eepromData);
    }
    this.eeprom = new AVREEPROM(this.cpu, this.eepromBackend, eepromConfig);

    // Port Listeners
    this.portB.addListener(() => this.updatePinsFromAvr());
    this.portC.addListener(() => this.updatePinsFromAvr());
    this.portD.addListener(() => this.updatePinsFromAvr());

    this.updatePinsFromAvr();
  }

  /**
   * Returns current 1024 bytes EEPROM data
   */
  public getEepromBytes(): Uint8Array {
    if (this.eepromBackend && this.eepromBackend.memory) {
      return this.eepromBackend.memory;
    }
    return this.eepromData;
  }

  /**
   * Set single EEPROM byte
   */
  public setEepromByte(address: number, value: number): void {
    if (address < 0 || address >= 1024) return;
    const byteVal = value & 0xff;
    if (this.eepromBackend) {
      this.eepromBackend.writeMemory(address, byteVal);
    }
    this.eepromData[address] = byteVal;
    if (this.onEepromWrite) {
      this.onEepromWrite(address, byteVal);
    }
  }

  /**
   * Overwrite entire EEPROM buffer
   */
  public setEepromBytes(bytes: Uint8Array): void {
    const len = Math.min(bytes.length, 1024);
    for (let i = 0; i < len; i++) {
      const b = bytes[i];
      if (this.eepromBackend) {
        this.eepromBackend.writeMemory(i, b);
      }
      this.eepromData[i] = b;
    }
  }

  /**
   * Returns current 32KB Flash Program Memory as Uint8Array bytes
   */
  public getFlashBytes(): Uint8Array {
    const bytes = new Uint8Array(32768);
    for (let i = 0; i < 16384; i++) {
      const word = this.progMem[i];
      bytes[i * 2] = word & 0xff;
      bytes[i * 2 + 1] = (word >> 8) & 0xff;
    }
    return bytes;
  }

  /**
   * Set single Flash byte
   */
  public setFlashByte(address: number, val: number): void {
    if (address < 0 || address >= 32768) return;
    const wordIdx = address >> 1;
    const isHigh = (address & 1) === 1;
    let word = this.progMem[wordIdx];
    if (isHigh) {
      word = (word & 0x00ff) | ((val & 0xff) << 8);
    } else {
      word = (word & 0xff00) | (val & 0xff);
    }
    this.progMem[wordIdx] = word;
    if (this.cpu) {
      this.cpu.progMem[wordIdx] = word;
    }
  }

  /**
   * Overwrite entire Flash memory buffer
   */
  public setFlashBytes(bytes: Uint8Array): void {
    for (let i = 0; i < 16384; i++) {
      const low = bytes[i * 2] || 0;
      const high = bytes[i * 2 + 1] || 0;
      this.progMem[i] = (high << 8) | low;
    }
    if (this.cpu) {
      this.cpu.progMem.set(this.progMem);
    }
  }

  /**
   * Reads PORT / PIN / DDR registers and maps to Arduino D0..D13, A0..A5
   */
  public updatePinsFromAvr(): void {
    if (!this.cpu || !this.portB || !this.portC || !this.portD) return;

    // PORTD: D0 -> D7 (bits 0..7)
    for (let i = 0; i <= 7; i++) {
      const pinKey = String(i) as ArduinoPin;
      const state = this.portD.pinState(i);
      const isOutput = state === AvrPinState.High || state === AvrPinState.Low;
      const val = state === AvrPinState.High ? 1 : 0;
      this.currentPinStates[pinKey] = {
        mode: isOutput ? 'OUTPUT' : (state === AvrPinState.InputPullUp ? 'INPUT_PULLUP' : 'INPUT'),
        value: val as 0 | 1,
        label: i === 0 ? 'RX (PD0)' : i === 1 ? 'TX (PD1)' : `D${i} (PD${i})`,
      };
    }

    // PORTB: D8 -> D13 (bits 0..5)
    for (let i = 0; i <= 5; i++) {
      const arduinoPinNum = 8 + i;
      const pinKey = String(arduinoPinNum) as ArduinoPin;
      const state = this.portB.pinState(i);
      const isOutput = state === AvrPinState.High || state === AvrPinState.Low;
      const val = state === AvrPinState.High ? 1 : 0;
      this.currentPinStates[pinKey] = {
        mode: isOutput ? 'OUTPUT' : (state === AvrPinState.InputPullUp ? 'INPUT_PULLUP' : 'INPUT'),
        value: val as 0 | 1,
        label: arduinoPinNum === 13 ? 'LED (PB5)' : arduinoPinNum === 10 ? 'SS (PB2)' : arduinoPinNum === 11 ? 'MOSI (PB3)' : arduinoPinNum === 12 ? 'MISO (PB4)' : `D${arduinoPinNum} (PB${i})`,
      };
    }

    // PORTC: A0 -> A5 (bits 0..5)
    for (let i = 0; i <= 5; i++) {
      const pinKey = `A${i}` as ArduinoPin;
      const state = this.portC.pinState(i);
      const isOutput = state === AvrPinState.High || state === AvrPinState.Low;
      const val = state === AvrPinState.High ? 1 : 0;
      this.currentPinStates[pinKey] = {
        mode: isOutput ? 'OUTPUT' : (state === AvrPinState.InputPullUp ? 'INPUT_PULLUP' : 'INPUT'),
        value: val as 0 | 1,
        label: i === 4 ? 'SDA (PC4)' : i === 5 ? 'SCL (PC5)' : `A${i} (PC${i})`,
      };
    }

    if (this.onPinStateChanged) {
      this.onPinStateChanged({ ...this.currentPinStates });
    }
  }

  /**
   * Set digital input pin on Arduino board from UI (e.g. push button)
   */
  public setPinInput(pin: ArduinoPin, value: 0 | 1): void {
    if (!this.portB || !this.portC || !this.portD) return;

    if (pin.startsWith('A')) {
      const bit = parseInt(pin.substring(1), 10);
      if (!isNaN(bit) && bit >= 0 && bit <= 5) {
        this.portC.setPin(bit, value === 1);
      }
    } else {
      const num = parseInt(pin, 10);
      if (num >= 0 && num <= 7) {
        this.portD.setPin(num, value === 1);
      } else if (num >= 8 && num <= 13) {
        this.portB.setPin(num - 8, value === 1);
      }
    }
    this.updatePinsFromAvr();
  }

  /**
   * Send character to AVR UART RX
   */
  public sendUartByte(byteVal: number): void {
    if (this.usart) {
      this.usart.writeByte(byteVal);
    }
  }

  /**
   * Single Opcode Instruction Step
   */
  public step(): AvrCpuSnapshot | null {
    if (!this.cpu) return null;
    try {
      const pcBefore = this.cpu.pc;
      const progWord = this.progMem[pcBefore] || 0;
      const spBefore = (this.cpu.data[0x5e] << 8) | this.cpu.data[0x5d];

      avrInstruction(this.cpu);
      this.cpu.tick();
      this.updatePinsFromAvr();

      const snap = this.getSnapshot();

      // Check Watchpoints
      if (this.watchpoints && this.watchpoints.length > 0) {
        // Check I/O registers
        const portBNow = this.cpu.data[0x25] || 0;
        const portCNow = this.cpu.data[0x28] || 0;
        const portDNow = this.cpu.data[0x2b] || 0;
        const spNow = snap.sp;

        if (portBNow !== this.prevPortBVal) {
          const hit = checkAvrWatchpoints(this.watchpoints, {
            type: 'io_register',
            registerName: 'PORTB',
            address: 0x25,
            eventType: 'WRITE',
            oldValue: this.prevPortBVal,
            newValue: portBNow,
            pc: pcBefore,
            cycle: snap.cycles,
            progWord,
          });
          this.prevPortBVal = portBNow;
          if (hit && this.onWatchpointHit) {
            this.onWatchpointHit(hit);
          }
        }

        if (portCNow !== this.prevPortCVal) {
          const hit = checkAvrWatchpoints(this.watchpoints, {
            type: 'io_register',
            registerName: 'PORTC',
            address: 0x28,
            eventType: 'WRITE',
            oldValue: this.prevPortCVal,
            newValue: portCNow,
            pc: pcBefore,
            cycle: snap.cycles,
            progWord,
          });
          this.prevPortCVal = portCNow;
          if (hit && this.onWatchpointHit) {
            this.onWatchpointHit(hit);
          }
        }

        if (portDNow !== this.prevPortDVal) {
          const hit = checkAvrWatchpoints(this.watchpoints, {
            type: 'io_register',
            registerName: 'PORTD',
            address: 0x2b,
            eventType: 'WRITE',
            oldValue: this.prevPortDVal,
            newValue: portDNow,
            pc: pcBefore,
            cycle: snap.cycles,
            progWord,
          });
          this.prevPortDVal = portDNow;
          if (hit && this.onWatchpointHit) {
            this.onWatchpointHit(hit);
          }
        }

        if (spNow !== this.prevSpVal) {
          const hit = checkAvrWatchpoints(this.watchpoints, {
            type: 'io_register',
            registerName: 'SP',
            address: 0x5d,
            eventType: 'WRITE',
            oldValue: this.prevSpVal,
            newValue: spNow,
            pc: pcBefore,
            cycle: snap.cycles,
            progWord,
          });
          this.prevSpVal = spNow;
          if (hit && this.onWatchpointHit) {
            this.onWatchpointHit(hit);
          }
        }

        // Check SRAM Watchpoints
        for (const wp of this.watchpoints) {
          if (wp.enabled && wp.targetType === 'sram' && wp.targetAddress !== undefined) {
            const addr = wp.targetAddress;
            const currentVal = this.cpu.data[addr] || 0;
            const hit = checkAvrWatchpoints([wp], {
              type: 'sram',
              address: addr,
              eventType: 'WRITE',
              oldValue: currentVal,
              newValue: currentVal,
              pc: pcBefore,
              cycle: snap.cycles,
              progWord,
            });
            if (hit && this.onWatchpointHit) {
              this.onWatchpointHit(hit);
            }
          }
        }
      }

      // Check Stack Overflow
      if (snap.sp < 0x0120 && this.onStackOverflow) {
        const stackSnap = analyzeSramMemory(snap.sram || null, snap.sp, undefined, snap.cycles);
        if (stackSnap.isOverflow) {
          this.onStackOverflow(stackSnap);
        }
      }

      return snap;
    } catch (err) {
      console.warn('AVR Execution Halted/Error:', err);
      return this.getSnapshot();
    }
  }

  /**
   * Execute N cycles in batch
   */
  public executeCycles(cyclesToRun: number): AvrCpuSnapshot | null {
    if (!this.cpu) return null;
    const targetCycles = this.cpu.cycles + cyclesToRun;
    while (this.cpu.cycles < targetCycles) {
      avrInstruction(this.cpu);
      this.cpu.tick();
    }
    this.updatePinsFromAvr();
    return this.getSnapshot();
  }

  /**
   * Start continuous high-speed execution loop
   */
  public start(cyclesPerFrame: number = 50000, onFrameCallback?: (snap: AvrCpuSnapshot) => void): void {
    if (this.isRunning) return;
    this.isRunning = true;

    const loop = () => {
      if (!this.isRunning || !this.cpu) return;
      try {
        const targetCycles = this.cpu.cycles + cyclesPerFrame;
        let hitTriggered = false;

        while (this.cpu.cycles < targetCycles) {
          const pcBefore = this.cpu.pc;
          const progWord = this.progMem[pcBefore] || 0;

          avrInstruction(this.cpu);
          this.cpu.tick();

          // Check watchpoints inside loop if any enabled
          if (this.watchpoints && this.watchpoints.length > 0) {
            for (const wp of this.watchpoints) {
              if (wp.enabled) {
                if (wp.targetType === 'sram' && wp.targetAddress !== undefined) {
                  const val = this.cpu.data[wp.targetAddress] || 0;
                  if (wp.condition === 'EQUALS' && val === wp.expectedValue) {
                    const hit = checkAvrWatchpoints([wp], {
                      type: 'sram',
                      address: wp.targetAddress,
                      eventType: 'WRITE',
                      oldValue: val,
                      newValue: val,
                      pc: pcBefore,
                      cycle: this.cpu.cycles,
                      progWord,
                    });
                    if (hit) {
                      this.stop();
                      hitTriggered = true;
                      if (this.onWatchpointHit) this.onWatchpointHit(hit);
                      break;
                    }
                  }
                } else if (wp.targetType === 'io_register' && wp.targetRegister === 'PORTB') {
                  const portBNow = this.cpu.data[0x25] || 0;
                  if (portBNow !== this.prevPortBVal) {
                    const hit = checkAvrWatchpoints([wp], {
                      type: 'io_register',
                      registerName: 'PORTB',
                      address: 0x25,
                      eventType: 'WRITE',
                      oldValue: this.prevPortBVal,
                      newValue: portBNow,
                      pc: pcBefore,
                      cycle: this.cpu.cycles,
                      progWord,
                    });
                    this.prevPortBVal = portBNow;
                    if (hit) {
                      this.stop();
                      hitTriggered = true;
                      if (this.onWatchpointHit) this.onWatchpointHit(hit);
                      break;
                    }
                  }
                }
              }
            }
          }

          if (hitTriggered) break;
        }

        this.updatePinsFromAvr();
        const snap = this.getSnapshot();
        if (onFrameCallback) {
          onFrameCallback(snap);
        }
      } catch (e) {
        console.error('AVR Simulation Frame Exception:', e);
      }

      if (this.isRunning) {
        this.animFrameId = requestAnimationFrame(loop);
      }
    };

    this.animFrameId = requestAnimationFrame(loop);
  }

  /**
   * Stop continuous execution
   */
  public stop(): void {
    this.isRunning = false;
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  public getIsRunning(): boolean {
    return this.isRunning;
  }

  /**
   * Read full CPU snapshot for UI
   */
  public getSnapshot(): AvrCpuSnapshot {
    if (!this.cpu) {
      return {
        pc: 0,
        cycles: 0,
        sp: 0x08FF,
        sreg: { C: false, Z: false, N: false, V: false, S: false, H: false, T: false, I: true },
        sregVal: 0x80,
        registers: {},
        pinStates: this.currentPinStates,
        usartText: '',
        isHalted: true,
      };
    }

    // Read general purpose registers R0-R31 from CPU data memory (0x0000 - 0x001F)
    const registers: RegisterBank = {};
    for (let r = 0; r <= 31; r++) {
      registers[`r${r}`] = this.cpu.data[r];
    }

    // SREG is at 0x5F (or 0x3F in I/O space)
    const sregVal = this.cpu.data[0x5f] || 0;
    const sreg = {
      C: (sregVal & 0x01) !== 0,
      Z: (sregVal & 0x02) !== 0,
      N: (sregVal & 0x04) !== 0,
      V: (sregVal & 0x08) !== 0,
      S: (sregVal & 0x10) !== 0,
      H: (sregVal & 0x20) !== 0,
      T: (sregVal & 0x40) !== 0,
      I: (sregVal & 0x80) !== 0,
    };

    // Stack Pointer (SPL at 0x5D, SPH at 0x5E)
    const spl = this.cpu.data[0x5d] || 0;
    const sph = this.cpu.data[0x5e] || 0;
    const sp = (sph << 8) | spl;

    // Extract SRAM slice (0x0100 - 0x08FF = 2048 bytes)
    const sram = this.cpu.data.subarray(0x0100, 0x0900);

    const portBVal = this.cpu.data[0x25] || 0;
    const portCVal = this.cpu.data[0x28] || 0;
    const portDVal = this.cpu.data[0x2b] || 0;

    const progWord = this.progMem[this.cpu.pc] || 0;
    const lastExecutedAsm = disassembleAvrOpcode(progWord, this.cpu.pc);

    return {
      pc: this.cpu.pc,
      cycles: this.cpu.cycles,
      sp,
      sreg,
      sregVal,
      registers,
      pinStates: { ...this.currentPinStates },
      usartText: this.usartOutputBuffer,
      isHalted: false,
      portBVal,
      portCVal,
      portDVal,
      sram,
      lastExecutedAsm,
    };
  }

  /**
   * Set single general purpose register (R0 - R31)
   */
  public setRegister(regIndex: number, value: number): void {
    if (!this.cpu || regIndex < 0 || regIndex > 31) return;
    this.cpu.data[regIndex] = value & 0xff;
  }

  /**
   * Set register by name (e.g. 'r16', 'R24')
   */
  public setRegisterByName(regName: string, value: number): void {
    const clean = regName.toLowerCase().replace('r', '');
    const idx = parseInt(clean, 10);
    if (!isNaN(idx)) {
      this.setRegister(idx, value);
    }
  }

  /**
   * Clear all general purpose registers (R0 - R31) to 0
   */
  public clearRegisters(): void {
    if (!this.cpu) return;
    for (let r = 0; r <= 31; r++) {
      this.cpu.data[r] = 0;
    }
  }

  /**
   * Toggle or set an SREG flag (C, Z, N, V, S, H, T, I)
   */
  public setSregFlag(flag: 'C' | 'Z' | 'N' | 'V' | 'S' | 'H' | 'T' | 'I', enabled: boolean): void {
    if (!this.cpu) return;
    const bitMap: Record<string, number> = {
      C: 0,
      Z: 1,
      N: 2,
      V: 3,
      S: 4,
      H: 5,
      T: 6,
      I: 7,
    };
    const bit = bitMap[flag];
    if (bit === undefined) return;
    const current = this.cpu.data[0x5f] || 0;
    if (enabled) {
      this.cpu.data[0x5f] = current | (1 << bit);
    } else {
      this.cpu.data[0x5f] = current & ~(1 << bit);
    }
  }
}

/**
 * Built-in Sample Intel HEX Programs for instant testing with Avr8js
 */
export const AVR8JS_HEX_SAMPLES = [
  {
    id: 'hex_blink_d13',
    name: '💡 Arduino Blink D13 (LED Villogtatás 16MHz)',
    description: 'Valódi lefordított gépkód: D13 (PB5) kimenetre állítása DDRB regiszterrel, majd másodpercenkénti bitváltás késleltető ciklussal.',
    hex: `:100000000C9434000C9449000C9449000C944900A4
:100010000C9449000C9449000C9449000C94490094
:100020000C9449000C9449000C9449000C94490084
:100030000C9449000C9449000C9449000C94490074
:100040000C9449000C9449000C9449000C94490064
:100050000C9449000C9449000C9449000C94490054
:100060000C9449000C94490011241FBECFEFD4E01E
:10007000DEBFCDBF11E0A0E0B1E0EAE5FFE702C063
:1000800005900D92A030B107D9F711E0A0E0B1E03D
:1000900001C01D92A030B107E1F70C9459000C9453
:1000A0000000259A85B1806285B9EFEF2FEF37E0EB
:1000B00021503040D9F700C0000085B1807D85B9DD
:1000C000EFEF2FEF37E021503040D9F700C000009D
:0400D000EBCFF89452
:00000001FF`,
  },
  {
    id: 'hex_serial_hello',
    name: '📟 USART0 9600 Baud "Hello ArduASM" Soros Adás',
    description: 'Valódi USART0 inicializálás (UBRR0=103, TXEN0=1), és karakterlánc kiküldése polling alapon a soros terminálra.',
    hex: `:100000000C942A000C9434000C9434000C943400DA
:100010000C9434000C9434000C9434000C943400CA
:100020000C9434000C9434000C9434000C943400BA
:100030000C9434000C9434000C9434000C943400AA
:100040000C9434000C9434000C9434000C9434009A
:1000500011241FBECFEFD4E0DEBFCDBF87E68093BA
:10006000C4001092C50088E18093C10086E080938C
:10007000C200E0E0F0E002C08093C600EE0FF11D17
:1000800080818823D1F780E08093C6008AE08093E1
:10009000C6000C944B00000048656C6C6F204172BC
:0A00A000647541534D2056312E3500D1
:00000001FF`,
  },
  {
    id: 'hex_timer0_fast_pwm',
    name: '🌊 Timer0 Fast PWM D6 (OC0A) Fényerő / Frekvencia',
    description: '8-bites Timer0 beállítása Fast PWM módba (TCCR0A=0x83, TCCR0B=0x03), fokozatos fényerőváltás OCR0A regiszterrel.',
    hex: `:100000000C941A000C9420000C9420000C942000FA
:100010000C9420000C9420000C9420000C942000EA
:1000200011241FBECFEFD4E0DEBFCDBF849A83E8FB
:1000300084BD83E085BD10E017BD01C0139517BD5D
:100040008FEF9FEF23E0815090402040D9F700C029
:080050000000F5CFF894FFCF89
:00000001FF`,
  },
  {
    id: 'hex_eeprom_counter',
    name: '💾 EEPROM Boot Számláló & USART Naplózó',
    description: 'Valódi EEPROM olvasás (cím: 0x0000), érték inkrementálása és visszairása, majd az aktuális bekapcsolási ciklus szám kiküldése UART-on.',
    hex: `:100000000C9434000C9449000C9449000C944900A4
:100010000C9449000C9449000C9449000C94490094
:100020000C9449000C9449000C9449000C94490084
:100030000C9449000C9449000C9449000C94490074
:100040000C9449000C9449000C9449000C94490064
:100050000C9449000C9449000C9449000C94490054
:100060000C9449000C94490011241FBECFEFD4E01E
:10007000DEBFCDBF87E68093C4001092C50088E14E
:100080008093C10086E08093C2001FBA1EBA81E0F5
:1000900080BD1DB083951DB882E080BD84E080BD02
:1000A0001DB08093C6008FEF9FEF23E0815090407F
:1000B0002040D9F700C00000EFCFF894FFCF00003A
:00000001FF`,
  },
  {
    id: 'hex_progmem_lpm',
    name: '⚡ Flash PROGMEM Szövegtábla Olvasás (LPM Utasítás)',
    description: 'Flash memóriában tárolt konstans szöveg olvasása Z-mutatóval és LPM (Load Program Memory) utasítással, majd kiírása soros portra.',
    hex: `:100000000C942A000C9434000C9434000C943400DA
:100010000C9434000C9434000C9434000C943400CA
:100020000C9434000C9434000C9434000C943400BA
:100030000C9434000C9434000C9434000C943400AA
:100040000C9434000C9434000C9434000C9434009A
:1000500011241FBECFEFD4E0DEBFCDBF87E68093BA
:10006000C4001092C50088E18093C10086E080938C
:10007000C200E0E6F0E004C08093C600EE0FF11D15
:100080000590802D8823D1F780E08093C6008AE00E
:100090008093C6000C944B00000041546D65676156
:1000A0003332385020466C6173682050524F474D95
:0A00B000454D204F4B2100009B
:00000001FF`,
  },
];
