/**
 * (c) 2026 AI Studio AVR Visual Studio
 * Logic Analyzer & Multi-Channel Waveform Engine
 * High-precision digital timeline tracer, protocol decoders (UART, I2C, SPI, PWM), and measurement lab.
 */

import { ArduinoPin, ProgramBlock, SimulationState, LogicAnalyzerSample } from '../types';
import { PIN_MAPPINGS, CYCLE_NS } from './hardwareMap';

export interface LogicChannel {
  id: string;
  pin: ArduinoPin;
  name: string;
  color: string;
  enabled: boolean;
  inverted?: boolean;
  decoderType?: 'none' | 'pwm' | 'uart' | 'i2c' | 'spi';
}

export interface DecodedProtocolFrame {
  id: string;
  protocol: 'UART' | 'I2C' | 'SPI' | 'PWM' | 'ONEWIRE';
  startNs: number;
  endNs: number;
  label: string;
  hexValue?: string;
  asciiValue?: string;
  details: string;
  color?: string;
}

export interface ChannelMeasurement {
  pin: ArduinoPin;
  name: string;
  frequencyHz: number;
  periodNs: number;
  dutyCyclePercent: number;
  highTimeNs: number;
  lowTimeNs: number;
  edgeCount: number;
  lastState: 0 | 1;
}

export interface TimeCursor {
  id: 'A' | 'B';
  timeNs: number;
  color: string;
  label: string;
}

export interface AnalyzerTimelineData {
  timeDivisionNs: number; // e.g. 1000 for 1us/div, 1000000 for 1ms/div
  totalDurationNs: number;
  samples: LogicAnalyzerSample[];
  channels: LogicChannel[];
  measurements: Record<string, ChannelMeasurement>;
  decodedFrames: DecodedProtocolFrame[];
}

export const DEFAULT_CHANNELS: LogicChannel[] = [
  { id: 'ch_13', pin: '13', name: 'D13 (PB5 / LED / SCK)', color: '#4ade80', enabled: true, decoderType: 'pwm' },
  { id: 'ch_12', pin: '12', name: 'D12 (PB4 / MISO)', color: '#38bdf8', enabled: true },
  { id: 'ch_11', pin: '11', name: 'D11 (PB3 / MOSI / PWM)', color: '#f59e0b', enabled: true, decoderType: 'pwm' },
  { id: 'ch_10', pin: '10', name: 'D10 (PB2 / SS / PWM)', color: '#a855f7', enabled: true },
  { id: 'ch_9', pin: '9', name: 'D9 (PB1 / OC1A PWM)', color: '#ec4899', enabled: true, decoderType: 'pwm' },
  { id: 'ch_3', pin: '3', name: 'D3 (PD3 / INT1 / PWM)', color: '#f97316', enabled: true, decoderType: 'pwm' },
  { id: 'ch_2', pin: '2', name: 'D2 (PD2 / INT0)', color: '#10b981', enabled: true },
  { id: 'ch_1', pin: '1', name: 'D1 (PD1 / TXD Serial)', color: '#06b6d4', enabled: true, decoderType: 'uart' },
  { id: 'ch_0', pin: '0', name: 'D0 (PD0 / RXD Serial)', color: '#8b5cf6', enabled: false, decoderType: 'uart' },
  { id: 'ch_A4', pin: 'A4', name: 'A4 (PC4 / I2C SDA)', color: '#eab308', enabled: true, decoderType: 'i2c' },
  { id: 'ch_A5', pin: 'A5', name: 'A5 (PC5 / I2C SCL)', color: '#14b8a6', enabled: true, decoderType: 'i2c' },
];

export const TIME_DIVISIONS: { label: string; ns: number; cycles16Mhz: number }[] = [
  { label: '62.5 ns/div (1 Ciklus @ 16 MHz)', ns: 62.5, cycles16Mhz: 1 },
  { label: '125 ns/div (2 Ciklus)', ns: 125, cycles16Mhz: 2 },
  { label: '250 ns/div (4 Ciklus)', ns: 250, cycles16Mhz: 4 },
  { label: '500 ns/div (8 Ciklus)', ns: 500, cycles16Mhz: 8 },
  { label: '1 µs/div (16 Ciklus)', ns: 1000, cycles16Mhz: 16 },
  { label: '5 µs/div (80 Ciklus)', ns: 5000, cycles16Mhz: 80 },
  { label: '10 µs/div (160 Ciklus)', ns: 10000, cycles16Mhz: 160 },
  { label: '50 µs/div', ns: 50000, cycles16Mhz: 800 },
  { label: '100 µs/div', ns: 100000, cycles16Mhz: 1600 },
  { label: '1 ms/div', ns: 1000000, cycles16Mhz: 16000 },
  { label: '10 ms/div', ns: 10000000, cycles16Mhz: 160000 },
  { label: '100 ms/div', ns: 100000000, cycles16Mhz: 1600000 },
];

export interface RangeMeasurementResult {
  startNs: number;
  endNs: number;
  durationNs: number;
  cyclesCount: number;
  frequencyHz: number;
  channelName: string;
  pin: string;
  state: 'HIGH' | 'LOW' | 'TOGGLING';
  edgeCount: number;
  pcRange?: string;
  spStart?: number;
  spEnd?: number;
  naturalSentenceHu: string;
}

/**
 * Calculates high-precision interval metrics for drag&drop user selections
 */
export function calculateRangeMeasurement(
  startNs: number,
  endNs: number,
  channelPin: string,
  samples: LogicAnalyzerSample[],
  channelName: string = 'PD2'
): RangeMeasurementResult {
  const minT = Math.min(startNs, endNs);
  const maxT = Math.max(startNs, endNs);
  const durationNs = maxT - minT;
  const cyclesCount = Math.max(1, Math.round(durationNs / 62.5));
  const frequencyHz = durationNs > 0 ? Math.round(1e9 / durationNs) : 0;

  // Filter samples inside range
  const relevantSamples = samples.filter((s) => s.timeNs >= minT && s.timeNs <= maxT);
  let highCount = 0;
  let lowCount = 0;
  let edgeCount = 0;

  let minPc = 0xffff;
  let maxPc = 0;
  let spStart: number | undefined;
  let spEnd: number | undefined;

  for (let i = 0; i < relevantSamples.length; i++) {
    const s = relevantSamples[i];
    const val = s.pinStates[channelPin] ?? 0;
    if (val === 1) highCount++;
    else lowCount++;

    if (i > 0 && s.pinStates[channelPin] !== relevantSamples[i - 1].pinStates[channelPin]) {
      edgeCount++;
    }

    if (s.pc !== undefined) {
      if (s.pc < minPc) minPc = s.pc;
      if (s.pc > maxPc) maxPc = s.pc;
    }
    if (i === 0 && s.sp !== undefined) spStart = s.sp;
    if (i === relevantSamples.length - 1 && s.sp !== undefined) spEnd = s.sp;
  }

  let state: 'HIGH' | 'LOW' | 'TOGGLING' = 'LOW';
  if (edgeCount > 0) state = 'TOGGLING';
  else if (highCount >= lowCount && highCount > 0) state = 'HIGH';
  else state = 'LOW';

  const stateStr = state === 'HIGH' ? 'magas (HIGH / 5V)' : state === 'LOW' ? 'alacsony (LOW / 0V)' : 'váltakozó';
  const naturalSentenceHu = `Itt ${cyclesCount} ciklusig (${formatTimeWithUnit(durationNs)}) ${stateStr} volt a ${channelName} kimenet (Δt = ${formatTimeWithUnit(durationNs)}, f = ${formatFrequency(frequencyHz)}).`;

  return {
    startNs: minT,
    endNs: maxT,
    durationNs,
    cyclesCount,
    frequencyHz,
    channelName,
    pin: channelPin,
    state,
    edgeCount,
    pcRange: minPc !== 0xffff ? `0x${minPc.toString(16).toUpperCase().padStart(4, '0')} - 0x${maxPc.toString(16).toUpperCase().padStart(4, '0')}` : undefined,
    spStart,
    spEnd,
    naturalSentenceHu,
  };
}

/**
 * Generates synthetic or simulation-based timeline samples from ProgramBlocks
 */
export function generateWaveformTimeline(
  blocks: ProgramBlock[],
  simulationState?: SimulationState,
  channels: LogicChannel[] = DEFAULT_CHANNELS,
  timeDivisionNs: number = 1000000 // 1 ms default
): AnalyzerTimelineData {
  const activeChannels = channels.filter((c) => c.enabled);
  const samples: LogicAnalyzerSample[] = [];
  const decodedFrames: DecodedProtocolFrame[] = [];

  // If we already have live captured waveform samples from simulationState, use them and extend
  if (simulationState?.logicWaveform && simulationState.logicWaveform.length > 5) {
    simulationState.logicWaveform.forEach((s) => samples.push({ ...s }));
  } else {
    // Synthetic deterministic trace generator based on block structure
    let currentNs = 0;
    const currentPinStates: Record<string, 0 | 1> = {};
    activeChannels.forEach((c) => {
      currentPinStates[c.pin] = (simulationState?.pinStates[c.pin]?.value as 0 | 1) || 0;
    });

    // Initial baseline sample
    samples.push({
      timeNs: 0,
      pinStates: { ...currentPinStates },
    });

    // Parse block behaviors
    blocks.forEach((b) => {
      if (!b.enabled && b.enabled !== undefined) return;

      if (b.type === 'io_pin_write' && b.params.pin) {
        const pin = b.params.pin as ArduinoPin;
        const val = (b.params.value === 1 || b.params.value === 'HIGH' || b.params.value === true) ? 1 : 0;
        currentPinStates[pin] = val;
        currentNs += CYCLE_NS * 2; // SBI / CBI instruction time ~ 2 cycles (125 ns)
        samples.push({
          timeNs: currentNs,
          pinStates: { ...currentPinStates },
          activeBlockId: b.id,
        });
      } else if (b.type === 'timing_milli_delay' && b.params.ms) {
        const dlyMs = Number(b.params.ms) || 10;
        const dlyNs = dlyMs * 1000000;
        currentNs += dlyNs;
        samples.push({
          timeNs: currentNs,
          pinStates: { ...currentPinStates },
          activeBlockId: b.id,
        });
      } else if (b.type === 'timing_micro_delay' && b.params.us) {
        const dlyUs = Number(b.params.us) || 10;
        const dlyNs = dlyUs * 1000;
        currentNs += dlyNs;
        samples.push({
          timeNs: currentNs,
          pinStates: { ...currentPinStates },
          activeBlockId: b.id,
        });
      } else if (b.type === 'analog_pwm_write' && b.params.pin) {
        const pin = b.params.pin as ArduinoPin;
        const duty = Number(b.params.value) || 128; // 0-255
        const dutyPct = Math.round((duty / 255) * 100);
        const pwmFreq = 490; // ~490 Hz Uno standard
        const pwmPeriodNs = Math.round((1 / pwmFreq) * 1e9); // ~2,040,816 ns
        const highTimeNs = Math.round(pwmPeriodNs * (duty / 255));
        const lowTimeNs = pwmPeriodNs - highTimeNs;

        // Generate 4 PWM periods
        for (let p = 0; p < 4; p++) {
          if (highTimeNs > 0) {
            currentPinStates[pin] = 1;
            samples.push({ timeNs: currentNs, pinStates: { ...currentPinStates }, activeBlockId: b.id });
            currentNs += highTimeNs;
          }
          if (lowTimeNs > 0) {
            currentPinStates[pin] = 0;
            samples.push({ timeNs: currentNs, pinStates: { ...currentPinStates }, activeBlockId: b.id });
            currentNs += lowTimeNs;
          }
        }

        decodedFrames.push({
          id: `pwm_${b.id}`,
          protocol: 'PWM',
          startNs: currentNs - (pwmPeriodNs * 4),
          endNs: currentNs,
          label: `PWM Pin ${pin} [${dutyPct}% @ 490Hz]`,
          details: `Kitöltési tényező: ${dutyPct}%, Frekvencia: ~490 Hz, tH: ${(highTimeNs / 1000).toFixed(1)} µs`,
          color: '#f59e0b',
        });
      } else if (b.type === 'protocol_uart_send' && b.params.text) {
        const text = String(b.params.text);
        const baud = 9600;
        const bitPeriodNs = Math.round((1 / baud) * 1e9); // ~104.16 µs
        const txPin = '1';

        for (let c = 0; c < Math.min(text.length, 6); c++) {
          const charCode = text.charCodeAt(c);
          const startFrameNs = currentNs;

          // Start bit (0)
          currentPinStates[txPin] = 0;
          samples.push({ timeNs: currentNs, pinStates: { ...currentPinStates } });
          currentNs += bitPeriodNs;

          // 8 Data bits (LSB first)
          for (let bit = 0; bit < 8; bit++) {
            const bitVal = ((charCode >> bit) & 1) as 0 | 1;
            currentPinStates[txPin] = bitVal;
            samples.push({ timeNs: currentNs, pinStates: { ...currentPinStates } });
            currentNs += bitPeriodNs;
          }

          // Stop bit (1)
          currentPinStates[txPin] = 1;
          samples.push({ timeNs: currentNs, pinStates: { ...currentPinStates } });
          currentNs += bitPeriodNs;

          decodedFrames.push({
            id: `uart_${c}_${Date.now()}`,
            protocol: 'UART',
            startNs: startFrameNs,
            endNs: currentNs,
            label: `'${text[c]}'`,
            hexValue: `0x${charCode.toString(16).toUpperCase().padStart(2, '0')}`,
            asciiValue: text[c],
            details: `Baud: 9600 (8N1), ASCII: '${text[c]}' (0x${charCode.toString(16).toUpperCase()})`,
            color: '#06b6d4',
          });
        }
      } else if (b.type === 'protocol_i2c_write') {
        const sda = 'A4';
        const scl = 'A5';
        const addr = Number(b.params.address) || 0x27;
        const startFrameNs = currentNs;

        // I2C Start Condition (SDA goes LOW while SCL is HIGH)
        currentPinStates[sda] = 1;
        currentPinStates[scl] = 1;
        samples.push({ timeNs: currentNs, pinStates: { ...currentPinStates } });
        currentNs += 5000;
        currentPinStates[sda] = 0;
        samples.push({ timeNs: currentNs, pinStates: { ...currentPinStates } });
        currentNs += 5000;

        // Clock 7-bit Address + W
        const byteToSend = (addr << 1) & 0xfe;
        for (let bit = 7; bit >= 0; bit--) {
          currentPinStates[scl] = 0;
          currentPinStates[sda] = ((byteToSend >> bit) & 1) as 0 | 1;
          samples.push({ timeNs: currentNs, pinStates: { ...currentPinStates } });
          currentNs += 2500;
          currentPinStates[scl] = 1;
          samples.push({ timeNs: currentNs, pinStates: { ...currentPinStates } });
          currentNs += 2500;
        }

        // ACK bit
        currentPinStates[scl] = 0;
        currentPinStates[sda] = 0; // ACK
        samples.push({ timeNs: currentNs, pinStates: { ...currentPinStates } });
        currentNs += 2500;
        currentPinStates[scl] = 1;
        samples.push({ timeNs: currentNs, pinStates: { ...currentPinStates } });
        currentNs += 2500;

        // I2C Stop Condition (SDA goes HIGH while SCL is HIGH)
        currentPinStates[scl] = 0;
        currentPinStates[sda] = 0;
        samples.push({ timeNs: currentNs, pinStates: { ...currentPinStates } });
        currentNs += 2500;
        currentPinStates[scl] = 1;
        samples.push({ timeNs: currentNs, pinStates: { ...currentPinStates } });
        currentNs += 2500;
        currentPinStates[sda] = 1;
        samples.push({ timeNs: currentNs, pinStates: { ...currentPinStates } });
        currentNs += 5000;

        decodedFrames.push({
          id: `i2c_${Date.now()}`,
          protocol: 'I2C',
          startNs: startFrameNs,
          endNs: currentNs,
          label: `ADDR 0x${addr.toString(16).toUpperCase()} [W] + ACK`,
          hexValue: `0x${addr.toString(16).toUpperCase()}`,
          details: `I2C Címzés: 0x${addr.toString(16).toUpperCase()} (Írás), Nyugtázva (ACK = 0)`,
          color: '#eab308',
        });
      } else {
        currentNs += CYCLE_NS * 4;
      }
    });

    if (samples.length === 1) {
      // Create a nice baseline toggle square wave for visualization if empty
      for (let i = 1; i <= 20; i++) {
        currentNs += 500000; // 500 µs
        currentPinStates['13'] = (i % 2 === 0 ? 1 : 0);
        samples.push({
          timeNs: currentNs,
          pinStates: { ...currentPinStates },
        });
      }
    }
  }

  // Calculate measurements for all active channels
  const measurements: Record<string, ChannelMeasurement> = {};
  const totalDurationNs = samples.length > 0 ? samples[samples.length - 1].timeNs : 10000000;

  activeChannels.forEach((ch) => {
    let highTimeTotalNs = 0;
    let lowTimeTotalNs = 0;
    let edgeCount = 0;
    let firstTransitionNs = -1;
    let lastTransitionNs = -1;
    let lastState: 0 | 1 = 0;

    for (let i = 0; i < samples.length; i++) {
      const s = samples[i];
      const val = s.pinStates[ch.pin] || 0;
      const nextTime = i < samples.length - 1 ? samples[i + 1].timeNs : totalDurationNs;
      const duration = Math.max(0, nextTime - s.timeNs);

      if (val === 1) {
        highTimeTotalNs += duration;
      } else {
        lowTimeTotalNs += duration;
      }

      if (i > 0 && s.pinStates[ch.pin] !== samples[i - 1].pinStates[ch.pin]) {
        edgeCount++;
        if (firstTransitionNs === -1) firstTransitionNs = s.timeNs;
        lastTransitionNs = s.timeNs;
      }

      lastState = val;
    }

    const totalActiveNs = highTimeTotalNs + lowTimeTotalNs || 1;
    const dutyCyclePercent = Math.round((highTimeTotalNs / totalActiveNs) * 100);
    const periods = edgeCount / 2;
    let frequencyHz = 0;
    let periodNs = 0;

    if (periods >= 1 && lastTransitionNs > firstTransitionNs) {
      const activeWindowNs = lastTransitionNs - firstTransitionNs;
      periodNs = Math.round(activeWindowNs / periods);
      frequencyHz = Math.round((1 / (periodNs / 1e9)));
    }

    measurements[ch.pin] = {
      pin: ch.pin,
      name: ch.name,
      frequencyHz,
      periodNs,
      dutyCyclePercent,
      highTimeNs: highTimeTotalNs,
      lowTimeNs: lowTimeTotalNs,
      edgeCount,
      lastState,
    };
  });

  return {
    timeDivisionNs,
    totalDurationNs: Math.max(totalDurationNs, 1000000),
    samples,
    channels: activeChannels,
    measurements,
    decodedFrames,
  };
}

/**
 * Format nanoseconds into appropriate human-readable metric unit
 */
export function formatTimeWithUnit(ns: number): string {
  if (ns < 1000) return `${ns.toFixed(0)} ns`;
  if (ns < 1000000) return `${(ns / 1000).toFixed(2)} µs`;
  if (ns < 1000000000) return `${(ns / 1000000).toFixed(2)} ms`;
  return `${(ns / 1000000000).toFixed(3)} s`;
}

/**
 * Format frequency with standard metric prefixes
 */
export function formatFrequency(hz: number): string {
  if (hz === 0) return '0 Hz (DC)';
  if (hz < 1000) return `${hz} Hz`;
  if (hz < 1000000) return `${(hz / 1000).toFixed(2)} kHz`;
  return `${(hz / 1000000).toFixed(2)} MHz`;
}
