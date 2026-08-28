/**
 * (c) 2026 AI Studio AVR Visual Studio
 * Background Web Worker Simulation Engine & Bridge for AVR (ATmega328P @ 16 MHz)
 * Keeps UI thread completely fluid at 60 FPS even when crunching millions of cycles per second!
 */

import { AvrCpuSnapshot, Avr8jsRunner } from './avr8jsEngine';
import { LogicAnalyzerSample, ArduinoPin, AvrWatchpoint, WatchpointHitEvent, AvrStackMemorySnapshot } from '../types';

export interface WorkerAvrMessage {
  type: 'READY' | 'SNAPSHOT' | 'WATCHPOINT_HIT' | 'STACK_OVERFLOW' | 'HEX_LOADED' | 'STOPPED' | 'RESET_DONE' | 'USART_TX' | 'ERROR';
  snapshot?: AvrCpuSnapshot;
  waveSamples?: LogicAnalyzerSample[];
  hitEvent?: WatchpointHitEvent;
  stackSnapshot?: AvrStackMemorySnapshot;
  byteCount?: number;
  byteVal?: number;
  char?: string;
  message?: string;
}

export class AvrWorkerBridge {
  private worker: Worker | null = null;
  private fallbackRunner: Avr8jsRunner | null = null;
  private isRunning: boolean = false;
  private onSnapshotCallback?: (snapshot: AvrCpuSnapshot, waveSamples?: LogicAnalyzerSample[]) => void;
  private onWatchpointHitCallback?: (hit: WatchpointHitEvent) => void;
  private onStackOverflowCallback?: (stackSnap: AvrStackMemorySnapshot) => void;
  private onUsartTxCallback?: (char: string, byteVal: number) => void;
  private onHexLoadedCallback?: (byteCount: number) => void;
  private watchpoints: AvrWatchpoint[] = [];
  private isWorkerSupported: boolean = false;

  constructor() {
    this.initWorker();
  }

  private initWorker(): void {
    try {
      if (typeof window !== 'undefined' && typeof Worker !== 'undefined') {
        this.worker = new Worker(new URL('../workers/avrWorker.ts', import.meta.url), {
          type: 'module',
        });

        this.worker.onmessage = (e: MessageEvent<WorkerAvrMessage>) => {
          const msg = e.data;
          switch (msg.type) {
            case 'SNAPSHOT':
              if (msg.snapshot && this.onSnapshotCallback) {
                this.onSnapshotCallback(msg.snapshot, msg.waveSamples);
              }
              break;

            case 'WATCHPOINT_HIT':
              this.isRunning = false;
              if (msg.hitEvent && this.onWatchpointHitCallback) {
                this.onWatchpointHitCallback(msg.hitEvent);
              }
              if (msg.snapshot && this.onSnapshotCallback) {
                this.onSnapshotCallback(msg.snapshot);
              }
              break;

            case 'STACK_OVERFLOW':
              this.isRunning = false;
              if (msg.stackSnapshot && this.onStackOverflowCallback) {
                this.onStackOverflowCallback(msg.stackSnapshot);
              }
              if (msg.snapshot && this.onSnapshotCallback) {
                this.onSnapshotCallback(msg.snapshot);
              }
              break;

            case 'HEX_LOADED':
              if (msg.byteCount !== undefined && this.onHexLoadedCallback) {
                this.onHexLoadedCallback(msg.byteCount);
              }
              if (msg.snapshot && this.onSnapshotCallback) {
                this.onSnapshotCallback(msg.snapshot);
              }
              break;

            case 'USART_TX':
              if (msg.char !== undefined && msg.byteVal !== undefined && this.onUsartTxCallback) {
                this.onUsartTxCallback(msg.char, msg.byteVal);
              }
              break;

            case 'STOPPED':
            case 'RESET_DONE':
            case 'READY':
              if (msg.snapshot && this.onSnapshotCallback) {
                this.onSnapshotCallback(msg.snapshot);
              }
              break;
          }
        };

        this.worker.onerror = (err) => {
          console.warn('AvrWorker error, activating fallback main-thread runner:', err);
          this.initFallback();
        };

        this.isWorkerSupported = true;
        this.worker.postMessage({ type: 'INIT' });
        return;
      }
    } catch (e) {
      console.warn('Web Worker initialization prohibited/failed, falling back to main-thread execution:', e);
    }

    this.initFallback();
  }

  private initFallback() {
    this.isWorkerSupported = false;
    if (!this.fallbackRunner) {
      this.fallbackRunner = new Avr8jsRunner();
      this.fallbackRunner.resetCpu();
      this.fallbackRunner.onWatchpointHit = (hit) => {
        this.isRunning = false;
        if (this.onWatchpointHitCallback) this.onWatchpointHitCallback(hit);
      };
      this.fallbackRunner.onStackOverflow = (stackSnap) => {
        this.isRunning = false;
        if (this.onStackOverflowCallback) this.onStackOverflowCallback(stackSnap);
      };
      this.fallbackRunner.onUsartByteReceived = (char, byteVal) => {
        if (this.onUsartTxCallback) this.onUsartTxCallback(char, byteVal);
      };
    }
  }

  public setWatchpoints(watchpoints: AvrWatchpoint[]): void {
    this.watchpoints = [...watchpoints];
    if (this.isWorkerSupported && this.worker) {
      this.worker.postMessage({ type: 'SET_WATCHPOINTS', watchpoints: this.watchpoints });
    } else if (this.fallbackRunner) {
      this.fallbackRunner.setWatchpoints(this.watchpoints);
    }
  }

  public setCallbacks(
    onSnapshot: (snapshot: AvrCpuSnapshot, waveSamples?: LogicAnalyzerSample[]) => void,
    onWatchpointHit?: (hit: WatchpointHitEvent) => void,
    onStackOverflow?: (stackSnap: AvrStackMemorySnapshot) => void,
    onUsartTx?: (char: string, byteVal: number) => void,
    onHexLoaded?: (byteCount: number) => void
  ): void {
    this.onSnapshotCallback = onSnapshot;
    this.onWatchpointHitCallback = onWatchpointHit;
    this.onStackOverflowCallback = onStackOverflow;
    this.onUsartTxCallback = onUsartTx;
    this.onHexLoadedCallback = onHexLoaded;
  }

  public loadHex(hex: string): void {
    if (this.isWorkerSupported && this.worker) {
      this.worker.postMessage({ type: 'LOAD_HEX', hex });
    } else if (this.fallbackRunner) {
      const res = this.fallbackRunner.loadHex(hex);
      if (res.success && this.onHexLoadedCallback) {
        this.onHexLoadedCallback(res.byteCount);
      }
      if (this.onSnapshotCallback) {
        this.onSnapshotCallback(this.fallbackRunner.getSnapshot());
      }
    }
  }

  public start(cyclesPerBatch: number = 65536): void {
    this.isRunning = true;
    if (this.isWorkerSupported && this.worker) {
      this.worker.postMessage({ type: 'START', cyclesPerBatch });
    } else if (this.fallbackRunner) {
      this.fallbackRunner.start(cyclesPerBatch, (snap) => {
        if (this.onSnapshotCallback) this.onSnapshotCallback(snap);
      });
    }
  }

  public stop(): void {
    this.isRunning = false;
    if (this.isWorkerSupported && this.worker) {
      this.worker.postMessage({ type: 'STOP' });
    } else if (this.fallbackRunner) {
      this.fallbackRunner.stop();
      if (this.onSnapshotCallback) {
        this.onSnapshotCallback(this.fallbackRunner.getSnapshot());
      }
    }
  }

  public step(): void {
    if (this.isWorkerSupported && this.worker) {
      this.worker.postMessage({ type: 'STEP' });
    } else if (this.fallbackRunner) {
      const snap = this.fallbackRunner.step();
      if (snap && this.onSnapshotCallback) {
        this.onSnapshotCallback(snap);
      }
    }
  }

  public reset(): void {
    this.isRunning = false;
    if (this.isWorkerSupported && this.worker) {
      this.worker.postMessage({ type: 'RESET' });
    } else if (this.fallbackRunner) {
      this.fallbackRunner.resetCpu();
      if (this.onSnapshotCallback) {
        this.onSnapshotCallback(this.fallbackRunner.getSnapshot());
      }
    }
  }

  public setPin(pin: ArduinoPin, value: 0 | 1): void {
    if (this.isWorkerSupported && this.worker) {
      this.worker.postMessage({ type: 'SET_PIN', pin, pinValue: value });
    } else if (this.fallbackRunner) {
      this.fallbackRunner.setPinInput(pin, value);
      if (this.onSnapshotCallback) {
        this.onSnapshotCallback(this.fallbackRunner.getSnapshot());
      }
    }
  }

  public sendUart(byteVal: number): void {
    if (this.isWorkerSupported && this.worker) {
      this.worker.postMessage({ type: 'SEND_UART', uartByte: byteVal });
    } else if (this.fallbackRunner) {
      this.fallbackRunner.sendUartByte(byteVal);
    }
  }

  public isUsingWorker(): boolean {
    return this.isWorkerSupported && this.worker !== null;
  }

  public destroy(): void {
    this.stop();
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    if (this.fallbackRunner) {
      this.fallbackRunner.stop();
      this.fallbackRunner = null;
    }
  }
}
