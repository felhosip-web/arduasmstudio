/**
 * (c) 2026 AI Studio AVR Visual Studio
 * High Performance AVR Web Worker Simulation Engine (ATmega328P @ 16 MHz)
 * Offloads CPU instruction crunching, watchpoints checking, and stack monitoring
 * Completely keeps UI thread at 60 FPS!
 */

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
import {
  ArduinoPin,
  PinState,
  RegisterBank,
  AvrWatchpoint,
  WatchpointHitEvent,
  AvrStackMemorySnapshot,
  LogicAnalyzerSample,
} from '../types';
import { checkAvrWatchpoints } from '../utils/watchpointEngine';
import { analyzeSramMemory } from '../utils/stackEngine';
import { parseIntelHex, bytesToProgMem, AvrCpuSnapshot } from '../utils/avr8jsEngine';

export interface WorkerInMessage {
  type: 'INIT' | 'LOAD_HEX' | 'START' | 'STOP' | 'STEP' | 'RESET' | 'SET_WATCHPOINTS' | 'SET_PIN' | 'SEND_UART' | 'SET_SHARED_BUFFER';
  hex?: string;
  cyclesPerBatch?: number;
  watchpoints?: AvrWatchpoint[];
  pin?: ArduinoPin;
  pinValue?: 0 | 1;
  uartByte?: number;
  sharedBuffer?: SharedArrayBuffer;
}

let cpu: CPU | null = null;
let portB: AVRIOPort | null = null;
let portC: AVRIOPort | null = null;
let portD: AVRIOPort | null = null;
let timer0: AVRTimer | null = null;
let timer1: AVRTimer | null = null;
let timer2: AVRTimer | null = null;
let usart: AVRUSART | null = null;
let adc: AVRADC | null = null;
let spi: AVRSPI | null = null;
let twi: AVRTWI | null = null;
let eeprom: AVREEPROM | null = null;
let eepromBackend = new EEPROMMemoryBackend(1024);

let progMem = new Uint16Array(16384);
let isRunning = false;
let runIntervalId: any = null;
let watchpoints: AvrWatchpoint[] = [];
let prevPortBVal = 0;
let prevPortCVal = 0;
let prevPortDVal = 0;
let prevSpVal = 0x08ff;
let cyclesPerBatch = 65536; // ~4ms of 16MHz clock per batch

const currentPinStates: Record<ArduinoPin, PinState> = {} as any;
const PINS_LIST: ArduinoPin[] = [
  '0', '1', '2', '3', '4', '5', '6', '7',
  '8', '9', '10', '11', '12', '13',
  'A0', 'A1', 'A2', 'A3', 'A4', 'A5',
];

function initDefaultPins() {
  PINS_LIST.forEach((pin) => {
    currentPinStates[pin] = {
      mode: 'INPUT',
      value: 0,
      label: pin === '13' ? 'LED (PB5)' : pin === 'A4' ? 'SDA (PC4)' : pin === 'A5' ? 'SCL (PC5)' : `D${pin}`,
    };
  });
}

initDefaultPins();

function updatePinsFromAvr() {
  if (!cpu || !portB || !portC || !portD) return;

  for (let i = 0; i <= 7; i++) {
    const pinKey = String(i) as ArduinoPin;
    const state = portD.pinState(i);
    const isOutput = state === AvrPinState.High || state === AvrPinState.Low;
    currentPinStates[pinKey] = {
      mode: isOutput ? 'OUTPUT' : (state === AvrPinState.InputPullUp ? 'INPUT_PULLUP' : 'INPUT'),
      value: (state === AvrPinState.High ? 1 : 0) as 0 | 1,
      label: i === 0 ? 'RX (PD0)' : i === 1 ? 'TX (PD1)' : `D${i} (PD${i})`,
    };
  }

  for (let i = 0; i <= 5; i++) {
    const pinKey = String(8 + i) as ArduinoPin;
    const state = portB.pinState(i);
    const isOutput = state === AvrPinState.High || state === AvrPinState.Low;
    currentPinStates[pinKey] = {
      mode: isOutput ? 'OUTPUT' : (state === AvrPinState.InputPullUp ? 'INPUT_PULLUP' : 'INPUT'),
      value: (state === AvrPinState.High ? 1 : 0) as 0 | 1,
      label: (8 + i) === 13 ? 'LED (PB5)' : `D${8 + i} (PB${i})`,
    };
  }

  for (let i = 0; i <= 5; i++) {
    const pinKey = `A${i}` as ArduinoPin;
    const state = portC.pinState(i);
    const isOutput = state === AvrPinState.High || state === AvrPinState.Low;
    currentPinStates[pinKey] = {
      mode: isOutput ? 'OUTPUT' : (state === AvrPinState.InputPullUp ? 'INPUT_PULLUP' : 'INPUT'),
      value: (state === AvrPinState.High ? 1 : 0) as 0 | 1,
      label: i === 4 ? 'SDA (PC4)' : i === 5 ? 'SCL (PC5)' : `A${i} (PC${i})`,
    };
  }
}

function getSnapshot(): AvrCpuSnapshot {
  if (!cpu) {
    const defaultRegs: RegisterBank = {};
    for (let i = 0; i < 32; i++) defaultRegs[`r${i}`] = 0;
    return {
      pc: 0,
      cycles: 0,
      sp: 0x08ff,
      sreg: { C: false, Z: false, N: false, V: false, S: false, H: false, T: false, I: true },
      registers: defaultRegs,
      pinStates: { ...currentPinStates },
      usartText: '',
      isHalted: false,
    };
  }

  const sregVal = cpu.data[95] || 0;
  const sreg = {
    C: Boolean(sregVal & 0x01),
    Z: Boolean(sregVal & 0x02),
    N: Boolean(sregVal & 0x04),
    V: Boolean(sregVal & 0x08),
    S: Boolean(sregVal & 0x10),
    H: Boolean(sregVal & 0x20),
    T: Boolean(sregVal & 0x40),
    I: Boolean(sregVal & 0x80),
  };

  const registers: RegisterBank = {};
  for (let i = 0; i < 32; i++) {
    registers[`r${i}`] = cpu.data[i] || 0;
  }

  const sp = (cpu.data[0x5e] << 8) | cpu.data[0x5d];
  const sramCopy = new Uint8Array(cpu.data.buffer.slice(0, 2048));

  return {
    pc: cpu.pc,
    cycles: cpu.cycles,
    sp,
    sreg,
    sregVal,
    registers,
    pinStates: { ...currentPinStates },
    usartText: '',
    isHalted: false,
    portBVal: cpu.data[0x25] || 0,
    portCVal: cpu.data[0x28] || 0,
    portDVal: cpu.data[0x2b] || 0,
    sram: sramCopy,
  };
}

function resetCpuInstance() {
  cpu = new CPU(progMem, 2048);
  initDefaultPins();

  portB = new AVRIOPort(cpu, portBConfig);
  portC = new AVRIOPort(cpu, portCConfig);
  portD = new AVRIOPort(cpu, portDConfig);

  timer0 = new AVRTimer(cpu, timer0Config);
  timer1 = new AVRTimer(cpu, timer1Config);
  timer2 = new AVRTimer(cpu, timer2Config);

  usart = new AVRUSART(cpu, usart0Config, 16e6);
  usart.onByteTransmit = (byteVal: number) => {
    self.postMessage({
      type: 'USART_TX',
      byteVal,
      char: String.fromCharCode(byteVal),
    });
  };

  adc = new AVRADC(cpu, adcConfig);
  spi = new AVRSPI(cpu, spiConfig, 16e6);
  twi = new AVRTWI(cpu, twiConfig, 16e6);

  eepromBackend = new EEPROMMemoryBackend(1024);
  eeprom = new AVREEPROM(cpu, eepromBackend, eepromConfig);

  portB.addListener(() => updatePinsFromAvr());
  portC.addListener(() => updatePinsFromAvr());
  portD.addListener(() => updatePinsFromAvr());

  updatePinsFromAvr();
  prevPortBVal = 0;
  prevPortCVal = 0;
  prevPortDVal = 0;
  prevSpVal = 0x08ff;
}

function stepSingle(): { hit?: WatchpointHitEvent; stackSnap?: AvrStackMemorySnapshot } {
  if (!cpu) return {};
  const pcBefore = cpu.pc;
  const progWord = progMem[pcBefore] || 0;

  avrInstruction(cpu);
  cpu.tick();
  updatePinsFromAvr();

  const snap = getSnapshot();

  let hit: WatchpointHitEvent | undefined;
  if (watchpoints && watchpoints.length > 0) {
    const portBNow = cpu.data[0x25] || 0;
    const portCNow = cpu.data[0x28] || 0;
    const portDNow = cpu.data[0x2b] || 0;

    if (portBNow !== prevPortBVal) {
      hit = checkAvrWatchpoints(watchpoints, {
        type: 'io_register',
        registerName: 'PORTB',
        address: 0x25,
        eventType: 'WRITE',
        oldValue: prevPortBVal,
        newValue: portBNow,
        pc: pcBefore,
        cycle: snap.cycles,
        progWord,
      });
      prevPortBVal = portBNow;
    } else if (portCNow !== prevPortCVal) {
      hit = checkAvrWatchpoints(watchpoints, {
        type: 'io_register',
        registerName: 'PORTC',
        address: 0x28,
        eventType: 'WRITE',
        oldValue: prevPortCVal,
        newValue: portCNow,
        pc: pcBefore,
        cycle: snap.cycles,
        progWord,
      });
      prevPortCVal = portCNow;
    } else if (portDNow !== prevPortDVal) {
      hit = checkAvrWatchpoints(watchpoints, {
        type: 'io_register',
        registerName: 'PORTD',
        address: 0x2b,
        eventType: 'WRITE',
        oldValue: prevPortDVal,
        newValue: portDNow,
        pc: pcBefore,
        cycle: snap.cycles,
        progWord,
      });
      prevPortDVal = portDNow;
    }

    if (!hit) {
      for (const wp of watchpoints) {
        if (wp.enabled && wp.targetType === 'sram' && wp.targetAddress !== undefined) {
          const addr = wp.targetAddress;
          const currentVal = cpu.data[addr] || 0;
          hit = checkAvrWatchpoints([wp], {
            type: 'sram',
            address: addr,
            eventType: 'WRITE',
            oldValue: currentVal,
            newValue: currentVal,
            pc: pcBefore,
            cycle: snap.cycles,
            progWord,
          });
          if (hit) break;
        }
      }
    }
  }

  let stackSnap: AvrStackMemorySnapshot | undefined;
  if (snap.sp < 0x0120) {
    stackSnap = analyzeSramMemory(snap.sram || null, snap.sp, undefined, snap.cycles);
  }

  return { hit, stackSnap };
}

function runBatchLoop() {
  if (!isRunning || !cpu) return;

  const targetCycles = cpu.cycles + cyclesPerBatch;
  let triggeredHit: WatchpointHitEvent | undefined;
  let triggeredStackSnap: AvrStackMemorySnapshot | undefined;

  while (cpu.cycles < targetCycles) {
    const res = stepSingle();
    if (res.hit) {
      triggeredHit = res.hit;
      break;
    }
    if (res.stackSnap && res.stackSnap.isOverflow) {
      triggeredStackSnap = res.stackSnap;
      break;
    }
  }

  const snapshot = getSnapshot();

  if (triggeredHit) {
    isRunning = false;
    if (runIntervalId) clearInterval(runIntervalId);
    self.postMessage({
      type: 'WATCHPOINT_HIT',
      hitEvent: triggeredHit,
      snapshot,
    });
    return;
  }

  if (triggeredStackSnap && triggeredStackSnap.isOverflow) {
    isRunning = false;
    if (runIntervalId) clearInterval(runIntervalId);
    self.postMessage({
      type: 'STACK_OVERFLOW',
      stackSnapshot: triggeredStackSnap,
      snapshot,
    });
    return;
  }

  self.postMessage({
    type: 'SNAPSHOT',
    snapshot,
  });
}

self.onmessage = (event: MessageEvent<WorkerInMessage>) => {
  const msg = event.data;

  switch (msg.type) {
    case 'INIT':
      resetCpuInstance();
      self.postMessage({ type: 'READY', snapshot: getSnapshot() });
      break;

    case 'LOAD_HEX':
      if (msg.hex) {
        const { data, byteCount } = parseIntelHex(msg.hex);
        progMem = bytesToProgMem(data);
        resetCpuInstance();
        self.postMessage({
          type: 'HEX_LOADED',
          byteCount,
          snapshot: getSnapshot(),
        });
      }
      break;

    case 'START':
      if (msg.cyclesPerBatch) cyclesPerBatch = msg.cyclesPerBatch;
      if (!isRunning) {
        isRunning = true;
        if (runIntervalId) clearInterval(runIntervalId);
        runIntervalId = setInterval(runBatchLoop, 16); // 60 FPS snapshot updates
      }
      break;

    case 'STOP':
      isRunning = false;
      if (runIntervalId) {
        clearInterval(runIntervalId);
        runIntervalId = null;
      }
      self.postMessage({ type: 'STOPPED', snapshot: getSnapshot() });
      break;

    case 'STEP':
      isRunning = false;
      if (runIntervalId) {
        clearInterval(runIntervalId);
        runIntervalId = null;
      }
      const stepRes = stepSingle();
      const snap = getSnapshot();
      if (stepRes.hit) {
        self.postMessage({ type: 'WATCHPOINT_HIT', hitEvent: stepRes.hit, snapshot: snap });
      } else if (stepRes.stackSnap && stepRes.stackSnap.isOverflow) {
        self.postMessage({ type: 'STACK_OVERFLOW', stackSnapshot: stepRes.stackSnap, snapshot: snap });
      } else {
        self.postMessage({ type: 'SNAPSHOT', snapshot: snap });
      }
      break;

    case 'RESET':
      isRunning = false;
      if (runIntervalId) {
        clearInterval(runIntervalId);
        runIntervalId = null;
      }
      resetCpuInstance();
      self.postMessage({ type: 'RESET_DONE', snapshot: getSnapshot() });
      break;

    case 'SET_WATCHPOINTS':
      watchpoints = msg.watchpoints || [];
      break;

    case 'SET_PIN':
      if (msg.pin && msg.pinValue !== undefined && portB && portC && portD) {
        const p = msg.pin;
        const val = msg.pinValue;
        if (p.startsWith('A')) {
          const bit = parseInt(p.substring(1), 10);
          if (!isNaN(bit)) portC.setPin(bit, val === 1);
        } else {
          const num = parseInt(p, 10);
          if (num >= 0 && num <= 7) portD.setPin(num, val === 1);
          else if (num >= 8 && num <= 13) portB.setPin(num - 8, val === 1);
        }
        updatePinsFromAvr();
        self.postMessage({ type: 'SNAPSHOT', snapshot: getSnapshot() });
      }
      break;

    case 'SEND_UART':
      if (msg.uartByte !== undefined && usart) {
        usart.writeByte(msg.uartByte);
      }
      break;
  }
};
