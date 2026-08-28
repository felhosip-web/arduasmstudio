/**
 * (c) 2026 AI Studio AVR8 Engine
 * Generic I/O Register Model with Datasheet Masks and Side-Effects
 */

export interface IAvrCoreContext {
  sramView?: Uint8Array;
  read_sram?: (addr: number) => number;
  write_sram?: (addr: number, val: number) => void;
  sp?: number;
  sreg?: number;
  cycles?: number;
  temp?: number; // 16-bit Temp Register
  clkpceExpiryCycle?: number;
  ports?: {
    B?: { port: number; ddr: number; pin: number };
    C?: { port: number; ddr: number; pin: number };
    D?: { port: number; ddr: number; pin: number };
  };
  recalcPortDirection?: (portName: 'B' | 'C' | 'D') => void;
  [key: string]: any;
}

export type RegisterWriteHook = (core: IAvrCoreContext, val: number) => void;
export type RegisterReadHook = (core: IAvrCoreContext) => number;

export class IORegister {
  public value: number;

  constructor(
    public addr: number, // Data memory address (e.g. 0x20..0xFF)
    public name: string,
    public reset: number = 0,
    public readMask: number = 0xff,
    public writeMask: number = 0xff,
    public onWrite?: RegisterWriteHook,
    public onRead?: RegisterReadHook
  ) {
    this.value = reset & writeMask;
  }

  public write(core: IAvrCoreContext, val: number): void {
    const masked = (this.value & ~this.writeMask) | (val & this.writeMask);
    this.value = masked;
    if (this.onWrite) {
      this.onWrite(core, masked);
    }
  }

  public read(core: IAvrCoreContext): number {
    const raw = this.onRead ? this.onRead(core) : this.value;
    return raw & this.readMask;
  }
}

export class RegisterBank {
  public registers: Map<number, IORegister> = new Map();
  public byName: Map<string, IORegister> = new Map();

  constructor(regList: IORegister[] = []) {
    for (const reg of regList) {
      this.addRegister(reg);
    }
  }

  public addRegister(reg: IORegister): void {
    this.registers.set(reg.addr, reg);
    this.byName.set(reg.name, reg);
  }

  public get(addr: number): IORegister | undefined {
    return this.registers.get(addr);
  }

  public getByName(name: string): IORegister | undefined {
    return this.byName.get(name);
  }

  public read(core: IAvrCoreContext, addr: number): number {
    const reg = this.registers.get(addr);
    if (reg) {
      return reg.read(core);
    }
    if (core.sramView && addr < core.sramView.length) {
      return core.sramView[addr];
    }
    return 0;
  }

  public write(core: IAvrCoreContext, addr: number, val: number): void {
    const reg = this.registers.get(addr);
    if (reg) {
      reg.write(core, val);
      if (core.sramView && addr < core.sramView.length) {
        core.sramView[addr] = reg.value;
      }
    } else {
      if (core.sramView && addr < core.sramView.length) {
        core.sramView[addr] = val & 0xff;
      }
    }
  }

  public reset(core?: IAvrCoreContext): void {
    for (const reg of this.registers.values()) {
      reg.value = reg.reset & reg.writeMask;
      if (core && core.sramView && reg.addr < core.sramView.length) {
        core.sramView[reg.addr] = reg.value;
      }
    }
  }
}
