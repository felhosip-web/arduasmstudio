import { BlockDefinition, ArduinoPin } from '../types';
import { PIN_MAPPINGS, CYCLE_NS } from '../utils/hardwareMap';

export const BLOCK_DEFINITIONS: Record<string, BlockDefinition> = {
  // ==========================================
  // 1. I/O & PORTVEZÉRLÉS
  // ==========================================
  io_pin_mode: {
    type: 'io_pin_mode',
    category: 'io',
    name: 'Láb Irány Beállítása (DDR)',
    shortDesc: 'Kimenet/Bemenet regiszter beállítás SBI/CBI utasítással',
    icon: 'Cpu',
    color: 'emerald',
    accentColor: '#10b981',
    params: [
      {
        key: 'pin',
        label: 'Arduino Láb',
        type: 'pin',
        defaultValue: '13',
        description: 'Válaszd ki a beállítandó lábat',
      },
      {
        key: 'mode',
        label: 'Mód',
        type: 'select',
        options: [
          { label: 'OUTPUT (Kimenet - SBI)', value: 'OUTPUT' },
          { label: 'INPUT (Bemenet - CBI)', value: 'INPUT' },
        ],
        defaultValue: 'OUTPUT',
      },
    ],
    defaultParams: { pin: '13', mode: 'OUTPUT' },
    calculateCycles: () => 2, // sbi/cbi 2 cycles
    generateAsm: (params) => {
      const pin = (params.pin || '13') as ArduinoPin;
      const mapping = PIN_MAPPINGS[pin] || PIN_MAPPINGS['13'];
      const isOutput = params.mode === 'OUTPUT';
      const instr = isOutput ? 'sbi' : 'cbi';
      return [
        `; Láb D${pin} (${mapping.description}) beállítása: ${params.mode}`,
        `${instr} ${mapping.ddrAddr}, ${mapping.bit}   ; ${mapping.ddr}.${mapping.bit} = ${isOutput ? '1 (Kimenet)' : '0 (Bemenet)'} [2 ciklus]`,
      ];
    },
    generateC: (params) => {
      const pin = (params.pin || '13') as ArduinoPin;
      const mapping = PIN_MAPPINGS[pin] || PIN_MAPPINGS['13'];
      const isOutput = params.mode === 'OUTPUT';
      return [
        `// C kód (Közvetlen regiszter):`,
        isOutput
          ? `${mapping.ddr} |= (1 << ${mapping.bit});  // ${mapping.ddr}.${mapping.bit} = 1 (OUTPUT)`
          : `${mapping.ddr} &= ~(1 << ${mapping.bit}); // ${mapping.ddr}.${mapping.bit} = 0 (INPUT)`,
        `// Arduino Standard C megfelelő:`,
        `pinMode(${pin}, ${params.mode});`,
      ];
    },
    generateInlineAsm: (params) => {
      const pin = (params.pin || '13') as ArduinoPin;
      const mapping = PIN_MAPPINGS[pin] || PIN_MAPPINGS['13'];
      const isOutput = params.mode === 'OUTPUT';
      const instr = isOutput ? 'sbi' : 'cbi';
      return [
        `__asm__ __volatile__ (`,
        `  "${instr} ${mapping.ddrAddr}, ${mapping.bit}\\n\\t" // ${mapping.ddr}.${mapping.bit} = ${isOutput ? '1' : '0'}`,
        `  ::`,
        `);`,
      ];
    },
    explanationHu: (params) => {
      const pin = (params.pin || '13') as ArduinoPin;
      const mapping = PIN_MAPPINGS[pin] || PIN_MAPPINGS['13'];
      return `Közvetlen hardveres adatirány-regiszter (${mapping.ddr}) manipuláció. Az 'sbi' (Set Bit in I/O) vagy 'cbi' (Clear Bit in I/O) utasítás pontosan 2 óraciklust (125 ns) vesz igénybe, szemben a standard pinMode() függvény több mint 50-70 ciklusos overheadjével.`;
    },
  },

  io_pin_write: {
    type: 'io_pin_write',
    category: 'io',
    name: 'Gyors Digitális Írás (PORT)',
    shortDesc: 'Láb magasra (HIGH) vagy alacsonyra (LOW) állítása 2 ciklus alatt',
    icon: 'Zap',
    color: 'emerald',
    accentColor: '#059669',
    params: [
      {
        key: 'pin',
        label: 'Arduino Láb',
        type: 'pin',
        defaultValue: '13',
      },
      {
        key: 'state',
        label: 'Állapot',
        type: 'select',
        options: [
          { label: 'HIGH (Magas 5V - SBI)', value: 'HIGH' },
          { label: 'LOW (Alacsony 0V - CBI)', value: 'LOW' },
        ],
        defaultValue: 'HIGH',
      },
    ],
    defaultParams: { pin: '13', state: 'HIGH' },
    calculateCycles: () => 2,
    generateAsm: (params) => {
      const pin = (params.pin || '13') as ArduinoPin;
      const mapping = PIN_MAPPINGS[pin] || PIN_MAPPINGS['13'];
      const isHigh = params.state === 'HIGH';
      const instr = isHigh ? 'sbi' : 'cbi';
      return [
        `; D${pin} (${mapping.description}) kimenet -> ${params.state}`,
        `${instr} ${mapping.portAddr}, ${mapping.bit}   ; ${mapping.port}.${mapping.bit} = ${isHigh ? '1 (HIGH)' : '0 (LOW)'} [2 ciklus / 125ns]`,
      ];
    },
    generateC: (params) => {
      const pin = (params.pin || '13') as ArduinoPin;
      const mapping = PIN_MAPPINGS[pin] || PIN_MAPPINGS['13'];
      const isHigh = params.state === 'HIGH';
      return [
        `// C kód (Közvetlen regiszter):`,
        isHigh
          ? `${mapping.port} |= (1 << ${mapping.bit});  // ${mapping.port}.${mapping.bit} = 1 (HIGH)`
          : `${mapping.port} &= ~(1 << ${mapping.bit}); // ${mapping.port}.${mapping.bit} = 0 (LOW)`,
        `// Arduino Standard C:`,
        `digitalWrite(${pin}, ${params.state});`,
      ];
    },
    generateInlineAsm: (params) => {
      const pin = (params.pin || '13') as ArduinoPin;
      const mapping = PIN_MAPPINGS[pin] || PIN_MAPPINGS['13'];
      const isHigh = params.state === 'HIGH';
      const instr = isHigh ? 'sbi' : 'cbi';
      return [
        `__asm__ __volatile__ (`,
        `  "${instr} ${mapping.portAddr}, ${mapping.bit}\\n\\t" // ${params.state}`,
        `  ::`,
        `);`,
      ];
    },
    explanationHu: (params) => {
      const pin = (params.pin || '13') as ArduinoPin;
      return `Az 'sbi' és 'cbi' utasítások mindössze 2 óraciklus (125 ns @ 16MHz) alatt állítják át a lábat. A klasszikus Arduino digitalWrite(${pin}) kb. 56 óraciklust (3.5 µs) igényel, így az assembly változat több mint 28-szor gyorsabb!`;
    },
  },

  io_pin_toggle: {
    type: 'io_pin_toggle',
    category: 'io',
    name: 'Gyors Láb Állapotváltás (PIN Toggle)',
    shortDesc: 'Kimenet megfordítása 2 ciklusban a PIN regiszterbe írással',
    icon: 'Repeat',
    color: 'emerald',
    accentColor: '#10b981',
    params: [
      {
        key: 'pin',
        label: 'Arduino Láb',
        type: 'pin',
        defaultValue: '13',
      },
    ],
    defaultParams: { pin: '13' },
    calculateCycles: () => 2,
    generateAsm: (params) => {
      const pin = (params.pin || '13') as ArduinoPin;
      const mapping = PIN_MAPPINGS[pin] || PIN_MAPPINGS['13'];
      return [
        `; D${pin} (${mapping.description}) kimenet megfordítása (Toggle)`,
        `sbi ${mapping.pinAddr}, ${mapping.bit}   ; ${mapping.pinReg}.${mapping.bit} = 1 (Hardware Toggle) [2 ciklus]`,
      ];
    },
    generateC: (params) => {
      const pin = (params.pin || '13') as ArduinoPin;
      const mapping = PIN_MAPPINGS[pin] || PIN_MAPPINGS['13'];
      return [
        `// C kód (Hardveres PIN regiszter írás azonnali toggle-t okoz ATmega328P-n):`,
        `${mapping.pinReg} = (1 << ${mapping.bit});`,
        `// Alternatív lassabb C megfelelő:`,
        `digitalWrite(${pin}, !digitalRead(${pin}));`,
      ];
    },
    generateInlineAsm: (params) => {
      const pin = (params.pin || '13') as ArduinoPin;
      const mapping = PIN_MAPPINGS[pin] || PIN_MAPPINGS['13'];
      return [
        `__asm__ __volatile__ (`,
        `  "sbi ${mapping.pinAddr}, ${mapping.bit}\\n\\t" // ${mapping.pinReg}.${mapping.bit} toggle`,
        `  ::`,
        `);`,
      ];
    },
    explanationHu: () => {
      return `Az ATmega328P mikrovezérlő egyedi hardveres képessége: ha a PINx bemeneti regiszter egy bitjére '1'-et írunk (sbi PINx, bit), a hardver azonnal és atomi módon invertálja a megfelelő PORTx bit kimenetét mindössze 2 óraciklus (125 ns) alatt!`;
    },
  },

  io_port_write: {
    type: 'io_port_write',
    category: 'io',
    name: 'Teljes 8-Bites Port Írás (OUT)',
    shortDesc: 'Egyszerre 8 kimeneti láb átírása 1-2 óraciklus alatt',
    icon: 'Layers',
    color: 'emerald',
    accentColor: '#059669',
    params: [
      {
        key: 'port',
        label: 'Cél Port',
        type: 'select',
        options: [
          { label: 'PORTD (D0 - D7 lábak)', value: 'PORTD' },
          { label: 'PORTB (D8 - D13 lábak)', value: 'PORTB' },
          { label: 'PORTC (A0 - A5 lábak)', value: 'PORTC' },
        ],
        defaultValue: 'PORTD',
      },
      {
        key: 'valueHex',
        label: 'Érték (Hex: 0x00 - 0xFF vagy Dec)',
        type: 'text',
        defaultValue: '0xFF',
        description: 'Pl. 0xFF (mind magas), 0xAA (váltakozó), 0x00 (mind alacsony)',
      },
      {
        key: 'tempReg',
        label: 'Munkaregiszter',
        type: 'register',
        defaultValue: 'r16',
      },
    ],
    defaultParams: { port: 'PORTD', valueHex: '0xFF', tempReg: 'r16' },
    calculateCycles: () => 2, // ldi (1) + out (1) = 2
    generateAsm: (params) => {
      const port = params.port || 'PORTD';
      const val = params.valueHex || '0xFF';
      const reg = params.tempReg || 'r16';
      const addrMap: Record<string, string> = { PORTD: '0x0B', PORTB: '0x05', PORTC: '0x08' };
      const addr = addrMap[port] || '0x0B';
      return [
        `; Teljes 8-bites ${port} felülírása [${val}] értékkel`,
        `ldi ${reg}, ${val}      ; ${reg} = ${val} [1 ciklus]`,
        `out ${addr}, ${reg}     ; ${port} (${addr}) = ${reg} [1 ciklus]`,
      ];
    },
    generateC: (params) => {
      const port = params.port || 'PORTD';
      const val = params.valueHex || '0xFF';
      return [
        `// C kód (Közvetlen 8-bites regiszter írás):`,
        `${port} = ${val};`,
        `// Ekvivalens 8 db digitalWrite(${val}) hívással egyszerre egy pillanatban!`,
      ];
    },
    generateInlineAsm: (params) => {
      const port = params.port || 'PORTD';
      const val = params.valueHex || '0xFF';
      const addrMap: Record<string, string> = { PORTD: '0x0B', PORTB: '0x05', PORTC: '0x08' };
      const addr = addrMap[port] || '0x0B';
      return [
        `__asm__ __volatile__ (`,
        `  "ldi r16, ${val}\\n\\t"`,
        `  "out ${addr}, r16\\n\\t"`,
        `  ::: "r16"`,
        `);`,
      ];
    },
    explanationHu: (params) => {
      return `Az 'out' utasítással mind a 8 láb feszültségszintje teljesen egyszerre, szinkronban változik meg mindössze 1 óraciklus (62.5 ns) alatt. Nincs lábankénti késlekedés vagy fáziseltolódás.`;
    },
  },

  // ==========================================
  // 2. IDŐZÍTÉS & ÓRACIKLUS-PONTOS KÉSLELTETÉS
  // ==========================================
  timing_nop: {
    type: 'timing_nop',
    category: 'timing',
    name: 'Óraciklus NOP (62.5 ns)',
    shortDesc: 'Pontosan 1 óraciklusos (62.5ns) mikrokésleltetés',
    icon: 'Clock',
    color: 'amber',
    accentColor: '#d97706',
    params: [
      {
        key: 'count',
        label: 'NOP Utasítások száma',
        type: 'number',
        defaultValue: 1,
        unit: 'ciklus',
        description: '1 NOP = 62.5 ns @ 16MHz',
      },
    ],
    defaultParams: { count: 1 },
    calculateCycles: (params) => Math.max(1, Number(params.count) || 1),
    generateAsm: (params) => {
      const count = Math.min(32, Math.max(1, Number(params.count) || 1));
      const lines = [`; Precíz NOP késleltetés: ${count} ciklus (${(count * CYCLE_NS).toFixed(1)} ns)`];
      for (let i = 0; i < count; i++) {
        lines.push(`nop                      ; NOP [1 ciklus / 62.5ns]`);
      }
      return lines;
    },
    generateC: (params) => {
      const count = Math.min(32, Math.max(1, Number(params.count) || 1));
      const nops = Array(count).fill('__asm__("nop");').join(' ');
      return [
        `// C kód (Inline Assembly NOP):`,
        `${nops} // ${count * 62.5} ns késleltetés`,
      ];
    },
    generateInlineAsm: (params) => {
      const count = Math.min(32, Math.max(1, Number(params.count) || 1));
      const asmNops = Array(count).fill('"nop\\n\\t"').join('\n  ');
      return [
        `__asm__ __volatile__ (`,
        `  ${asmNops}`,
        `);`,
      ];
    },
    explanationHu: (params) => {
      const count = Math.max(1, Number(params.count) || 1);
      return `A 'nop' (No Operation) utasítás pontosan 1 óraciklusig (62.5 ns @ 16MHz) nem csinál semmit. Alapvető építőköve a nagysebességű protokolloknak (pl. WS2812B, 1-Wire, I2C bit-banging), ahol tíz-nanomásodperces pontosság kell.`;
    },
  },

  timing_micro_delay: {
    type: 'timing_micro_delay',
    category: 'timing',
    name: 'Precíz Mikroszekundum Késleltetés (µs)',
    shortDesc: 'Óraciklus-pontos assembly delay loop mikromásodpercre',
    icon: 'Timer',
    color: 'amber',
    accentColor: '#f59e0b',
    params: [
      {
        key: 'microseconds',
        label: 'Késleltetés (µs)',
        type: 'number',
        defaultValue: 10,
        unit: 'µs',
        description: 'Időtartam mikroszekundumban (1 µs = 16 óraciklus @ 16MHz)',
      },
      {
        key: 'reg',
        label: 'Munkaregiszter',
        type: 'register',
        defaultValue: 'r24',
      },
    ],
    defaultParams: { microseconds: 10, reg: 'r24' },
    calculateCycles: (params) => {
      const us = Math.max(1, Number(params.microseconds) || 1);
      return us * 16; // 16 cycles per us at 16MHz
    },
    generateAsm: (params, labelSuffix = '1') => {
      const us = Math.max(1, Number(params.microseconds) || 1);
      const reg = params.reg || 'r24';
      // At 16MHz, 1 loop iteration: dec (1) + brne (2) + nop (1) = 4 cycles (0.25us).
      // So 4 iterations = 1us (16 cycles). Total loops = us * 4
      const iterations = Math.min(255, Math.max(1, Math.round(us * 4 - 1)));
      const lbl = `delay_us_${labelSuffix}`;
      return [
        `; Precíz ASM késleltetés: ${us} µs (${us * 16} óraciklus @ 16MHz)`,
        `ldi ${reg}, ${iterations}        ; Ciklusszámláló betöltése [1 ciklus]`,
        `${lbl}:`,
        `  nop                    ; [1 ciklus]`,
        `  dec ${reg}             ; Számláló csökkentése [1 ciklus]`,
        `  brne ${lbl}         ; Ugrás amíg nem nulla [2 ciklus ha ugrik, 1 ha kilép]`,
      ];
    },
    generateC: (params) => {
      const us = Math.max(1, Number(params.microseconds) || 1);
      return [
        `// C kód:`,
        `_delay_us(${us});`,
        `// Vagy standard Arduino:`,
        `delayMicroseconds(${us});`,
      ];
    },
    generateInlineAsm: (params, labelSuffix = '1') => {
      const us = Math.max(1, Number(params.microseconds) || 1);
      const iterations = Math.min(255, Math.max(1, Math.round(us * 4 - 1)));
      return [
        `__asm__ __volatile__ (`,
        `  "ldi r24, ${iterations}\\n\\t"`,
        `  "1: nop\\n\\t"`,
        `  "dec r24\\n\\t"`,
        `  "brne 1b\\n\\t"`,
        `  ::: "r24"`,
        `);`,
      ];
    },
    explanationHu: (params) => {
      const us = Number(params.microseconds) || 10;
      return `16 MHz-es órajelnél 1 mikroszekundum pontosan 16 óraciklusnak felel meg. A 4 óraciklusos belső hurok (nop + dec + brne) pontosan 0.25 µs-onként lép, garantálva a tökéletes hardveres időzítést!`;
    },
  },

  timing_milli_delay: {
    type: 'timing_milli_delay',
    category: 'timing',
    name: 'Milliszekundum Késleltető Hurok (ms)',
    shortDesc: '3-regiszteres mély beágyazott ASM késleltető hurok',
    icon: 'Hourglass',
    color: 'amber',
    accentColor: '#b45309',
    params: [
      {
        key: 'milliseconds',
        label: 'Késleltetés (ms)',
        type: 'number',
        defaultValue: 500,
        unit: 'ms',
        description: 'Időtartam milliszekundumban (pl. 500 ms = fél másodperc = 8 000 000 ciklus)',
      },
    ],
    defaultParams: { milliseconds: 500 },
    calculateCycles: (params) => {
      const ms = Math.max(1, Number(params.milliseconds) || 1);
      return ms * 16000; // 16,000 cycles per ms at 16MHz
    },
    generateAsm: (params, labelSuffix = '1') => {
      const ms = Math.max(1, Number(params.milliseconds) || 1);
      // Rough calculation of 3 loop registers for 16MHz:
      // Total cycles = ms * 16000
      const c1 = Math.min(255, Math.max(1, Math.round(ms * 16000 / (255 * 255 * 4))));
      const lbl = `delay_ms_${labelSuffix}`;
      return [
        `; Mély ASM Milliszekundumos késleltető hurok: ${ms} ms (${(ms * 16000).toLocaleString()} ciklus)`,
        `ldi r18, ${Math.min(255, ms)}         ; Külső ciklus (ms)`,
        `ldi r19, 100         ; Középső ciklus`,
        `ldi r20, 160         ; Belső ciklus`,
        `${lbl}_loop:`,
        `  dec r20`,
        `  brne ${lbl}_loop`,
        `  dec r19`,
        `  brne ${lbl}_loop`,
        `  dec r18`,
        `  brne ${lbl}_loop`,
      ];
    },
    generateC: (params) => {
      const ms = Math.max(1, Number(params.milliseconds) || 1);
      return [
        `// C kód:`,
        `delay(${ms}); // ${ms} milliszekundum várakozás`,
      ];
    },
    generateInlineAsm: (params, labelSuffix = '1') => {
      const ms = Math.max(1, Number(params.milliseconds) || 1);
      return [
        `__asm__ __volatile__ (`,
        `  "ldi r18, ${Math.min(255, ms)}\\n\\t"`,
        `  "ldi r19, 100\\n\\t"`,
        `  "ldi r20, 160\\n\\t"`,
        `  "1: dec r20\\n\\t"`,
        `  "brne 1b\\n\\t"`,
        `  "dec r19\\n\\t"`,
        `  "brne 1b\\n\\t"`,
        `  "dec r18\\n\\t"`,
        `  "brne 1b\\n\\t"`,
        `  ::: "r18", "r19", "r20"`,
        `);`,
      ];
    },
    explanationHu: (params) => {
      const ms = Number(params.milliseconds) || 500;
      return `A 3-szintű beágyazott ciklus regiszterei (r18, r19, r20) a CPU utasításszámlálóját járatják körbe. Nincs szükség Timer0 megszakításra (millis()), így a kód teljesen önálló és megszakításbiztos marad.`;
    },
  },

  // ==========================================
  // 3. VEZÉRLÉS, ELÁGAZÁSOK ÉS CIKLUSOK
  // ==========================================
  flow_loop_counter: {
    type: 'flow_loop_counter',
    category: 'flow',
    name: 'Számlálós Ciklus (FOR / Loop)',
    shortDesc: 'Ismétlés N-szer munkaregiszterrel (LDI, DEC, BRNE)',
    icon: 'RefreshCw',
    color: 'blue',
    accentColor: '#2563eb',
    params: [
      {
        key: 'iterations',
        label: 'Ismétlések száma (1 - 255)',
        type: 'number',
        defaultValue: 10,
        description: 'Hányszor fusson le a ciklus magja',
      },
      {
        key: 'reg',
        label: 'Ciklusváltozó Regiszter',
        type: 'register',
        defaultValue: 'r16',
      },
    ],
    defaultParams: { iterations: 10, reg: 'r16' },
    calculateCycles: (params) => {
      const count = Math.max(1, Number(params.iterations) || 1);
      return 1 + count * 3; // ldi(1) + (dec(1)+brne(2))*count
    },
    generateAsm: (params, labelSuffix = '1') => {
      const count = Math.max(1, Number(params.iterations) || 1);
      const reg = params.reg || 'r16';
      const lbl = `for_loop_${labelSuffix}`;
      return [
        `; Számlálós ciklus: ${count} iteráció (${reg} regiszterrel)`,
        `ldi ${reg}, ${count}       ; Kezdőérték betöltése [1 ciklus]`,
        `${lbl}:`,
        `  ; --- Ciklusmag utasításai ide jönnek ---`,
        `  dec ${reg}            ; ${reg} = ${reg} - 1 [1 ciklus]`,
        `  brne ${lbl}        ; Ha ${reg} != 0, visszaugrik az elejére [2 ciklus]`,
      ];
    },
    generateC: (params) => {
      const count = Math.max(1, Number(params.iterations) || 1);
      return [
        `// C kód megfelelője:`,
        `for (uint8_t i = ${count}; i > 0; i--) {`,
        `  // Ciklusmag`,
        `}`,
      ];
    },
    generateInlineAsm: (params, labelSuffix = '1') => {
      const count = Math.max(1, Number(params.iterations) || 1);
      const reg = params.reg || 'r16';
      return [
        `__asm__ __volatile__ (`,
        `  "ldi ${reg}, ${count}\\n\\t"`,
        `  "1:\\n\\t"`,
        `  "  // ide kerül a belső mag\\n\\t"`,
        `  "  dec ${reg}\\n\\t"`,
        `  "  brne 1b\\n\\t"`,
        `  ::: "${reg}"`,
        `);`,
      ];
    },
    explanationHu: (params) => {
      const reg = params.reg || 'r16';
      return `A 'dec' (Decrement) utasítás 1-gyel csökkenti a ${reg} értékét és automatikusan beállítja a processzor Zero (Z) jelzőbitjét. A 'brne' (Branch if Not Equal) azonnal elugrik ha a Z bit 0, mindössze 2 óraciklus alatt.`;
    },
  },

  flow_compare_branch: {
    type: 'flow_compare_branch',
    category: 'flow',
    name: 'Feltételes Elágazás (IF / ELSE)',
    shortDesc: 'Regiszter összehasonlítása konstanssal (CPI) és ugrás (BREQ / BRNE)',
    icon: 'GitBranch',
    color: 'blue',
    accentColor: '#3b82f6',
    params: [
      {
        key: 'reg',
        label: 'Vizsgált Regiszter',
        type: 'register',
        defaultValue: 'r16',
      },
      {
        key: 'condition',
        label: 'Feltétel',
        type: 'select',
        options: [
          { label: 'Egyenlő (BREQ - Branch if Equal)', value: 'BREQ' },
          { label: 'Nem Egyenlő (BRNE - Branch if Not Equal)', value: 'BRNE' },
          { label: 'Kisebb / Átvitel (BRCS - Branch if Carry Set)', value: 'BRCS' },
          { label: 'Nagyobb vagy Egyenlő (BRCC - Branch if Carry Clear)', value: 'BRCC' },
        ],
        defaultValue: 'BREQ',
      },
      {
        key: 'value',
        label: 'Összehasonlítási Érték',
        type: 'number',
        defaultValue: 100,
      },
      {
        key: 'targetLabel',
        label: 'Cél Címke neve ha igaz',
        type: 'text',
        defaultValue: 'on_match',
      },
    ],
    defaultParams: { reg: 'r16', condition: 'BREQ', value: 100, targetLabel: 'on_match' },
    calculateCycles: () => 3, // cpi(1) + branch(2)
    generateAsm: (params) => {
      const reg = params.reg || 'r16';
      const cond = (params.condition || 'BREQ').toLowerCase();
      const val = params.value ?? 100;
      const target = params.targetLabel || 'on_match';
      return [
        `; Feltételes vizsgálat: Ha (${reg} ${params.condition} ${val}) -> ugrás ide: ${target}`,
        `cpi ${reg}, ${val}        ; ${reg} összehasonlítása ${val}-gyel [1 ciklus]`,
        `${cond} ${target}        ; Ugrás '${target}' címkére ha a feltétel teljesül [2 ciklus]`,
      ];
    },
    generateC: (params) => {
      const val = params.value ?? 100;
      const op = params.condition === 'BREQ' ? '==' : params.condition === 'BRNE' ? '!=' : '<';
      return [
        `// C kód megfelelője:`,
        `if (regValue ${op} ${val}) {`,
        `  goto ${params.targetLabel};`,
        `}`,
      ];
    },
    generateInlineAsm: (params) => {
      const reg = params.reg || 'r16';
      const cond = (params.condition || 'BREQ').toLowerCase();
      const val = params.value ?? 100;
      const target = params.targetLabel || 'on_match';
      return [
        `__asm__ __volatile__ (`,
        `  "cpi ${reg}, ${val}\\n\\t"`,
        `  "${cond} ${target}\\n\\t"`,
        `);`,
      ];
    },
    explanationHu: (params) => {
      return `A 'cpi' (Compare with Immediate) kivonja a konstanst a regiszterből a regiszter módosítása nélkül, és frissíti a processzor SREG (Status Register) jelzőbitjeit (Z, C, N, V). A feltételes ugróutasítás 1-2 óraciklus alatt dönt az elágazásról.`;
    },
  },

  flow_label: {
    type: 'flow_label',
    category: 'flow',
    name: 'Ugrási Címke (Label)',
    shortDesc: 'Navigációs pont definiálása ugrásokhoz',
    icon: 'Tag',
    color: 'blue',
    accentColor: '#1d4ed8',
    params: [
      {
        key: 'labelName',
        label: 'Címke Neve',
        type: 'text',
        defaultValue: 'loop_start',
      },
    ],
    defaultParams: { labelName: 'loop_start' },
    calculateCycles: () => 0, // Labels take 0 execution cycles
    generateAsm: (params) => {
      const name = params.labelName || 'loop_start';
      return [
        `${name}:                      ; Címke ugrási célpontnak [0 ciklus]`,
      ];
    },
    generateC: (params) => {
      const name = params.labelName || 'loop_start';
      return [
        `${name}: // C ugrási címke`,
      ];
    },
    generateInlineAsm: (params) => {
      const name = params.labelName || 'loop_start';
      return [`"${name}:\\n\\t"`];
    },
    explanationHu: (params) => {
      return `A címke egy memóriacímet jelöl a programkódban, ahová a feltételes vagy feltétel nélküli ugróutasítások (rjmp, jmp, breq, brne) közvetlenül ugrani tudnak. Önmagában nem fogyaszt óraciklust.`;
    },
  },

  flow_rjmp: {
    type: 'flow_rjmp',
    category: 'flow',
    name: 'Feltétel Nélküli Ugrás (RJMP)',
    shortDesc: 'Azonnali ugrás a megadott címkére 2 ciklus alatt',
    icon: 'ArrowRight',
    color: 'blue',
    accentColor: '#1e40af',
    params: [
      {
        key: 'targetLabel',
        label: 'Cél Címke',
        type: 'text',
        defaultValue: 'loop_start',
      },
    ],
    defaultParams: { targetLabel: 'loop_start' },
    calculateCycles: () => 2, // rjmp takes 2 cycles
    generateAsm: (params) => {
      const target = params.targetLabel || 'loop_start';
      return [
        `rjmp ${target}               ; Ugrás '${target}' címkére [2 ciklus]`,
      ];
    },
    generateC: (params) => {
      const target = params.targetLabel || 'loop_start';
      return [
        `goto ${target}; // vagy while(true) ciklus vége`,
      ];
    },
    generateInlineAsm: (params) => {
      const target = params.targetLabel || 'loop_start';
      return [`__asm__ __volatile__ ("rjmp ${target}\\n\\t");`];
    },
    explanationHu: (params) => {
      return `Az 'rjmp' (Relative Jump) relatív programmemória-ugrást végez ±2K szó távolságon belül 2 óraciklus (125 ns) alatt. Ezzel valósul meg az Arduino loop() végtelen ciklusának visszaugrása is.`;
    },
  },

  // ==========================================
  // 4. MEGSZAKÍTÁSOK (INTERRUPTS)
  // ==========================================
  interrupt_enable_disable: {
    type: 'interrupt_enable_disable',
    category: 'interrupt',
    name: 'Globális Megszakítások (SEI / CLI)',
    shortDesc: 'Megszakítások engedélyezése (SEI) vagy azonnali tiltása (CLI)',
    icon: 'ShieldAlert',
    color: 'purple',
    accentColor: '#9333ea',
    params: [
      {
        key: 'action',
        label: 'Művelet',
        type: 'select',
        options: [
          { label: 'SEI - Megszakítások Engedélyezése (I=1)', value: 'SEI' },
          { label: 'CLI - Megszakítások Tiltása (Atomi művelet I=0)', value: 'CLI' },
        ],
        defaultValue: 'SEI',
      },
    ],
    defaultParams: { action: 'SEI' },
    calculateCycles: () => 1,
    generateAsm: (params) => {
      const isSei = params.action === 'SEI';
      return [
        `; Globális megszakításjelző bit (SREG.I) ${isSei ? 'beállítása' : 'törlése'}`,
        `${isSei ? 'sei' : 'cli'}                      ; ${isSei ? 'Set' : 'Clear'} Global Interrupt Flag [1 ciklus]`,
      ];
    },
    generateC: (params) => {
      const isSei = params.action === 'SEI';
      return [
        `// C kód:`,
        isSei ? `interrupts();   // sei()` : `noInterrupts(); // cli()`,
      ];
    },
    generateInlineAsm: (params) => {
      const isSei = params.action === 'SEI';
      return [`__asm__ __volatile__ ("${isSei ? 'sei' : 'cli'}\\n\\t");`];
    },
    explanationHu: (params) => {
      const isSei = params.action === 'SEI';
      return isSei
        ? `A 'sei' utasítás 1 ciklus alatt bekapcsolja az SREG I-bitjét. Ettől a pillanattól kezdve az időzítők és a külső lábak eseményei megszakíthatják a főprogram futását.`
        : `A 'cli' utasítás kritikus fontosságú időzítés-érzékeny szakaszok (pl. WS2812B LED adatküldés, EEPROM írás) előtt: leállítja a Timer0 millis() megszakítását, hogy ne okozzon jittert vagy időzítési hibát.`;
    },
  },

  interrupt_timer1_ctc: {
    type: 'interrupt_timer1_ctc',
    category: 'interrupt',
    name: 'Timer1 CTC 16-Bites Időzítő Megszakítás',
    shortDesc: 'Hardveres periodikus megszakítás (pl. 1 kHz / 1 ms tick)',
    icon: 'Radio',
    color: 'purple',
    accentColor: '#a855f7',
    params: [
      {
        key: 'frequencyHz',
        label: 'Kívánt Frekvencia (Hz)',
        type: 'number',
        defaultValue: 1000,
        unit: 'Hz',
        description: 'Pl. 1000 Hz = 1 milliszekundumos időköz (1 ms CTC Tick)',
      },
      {
        key: 'prescaler',
        label: 'Előosztó (Prescaler)',
        type: 'select',
        options: [
          { label: 'Előosztó: 1 (Nincs osztás)', value: '1' },
          { label: 'Előosztó: 8 (16MHz/8 = 2MHz)', value: '8' },
          { label: 'Előosztó: 64 (16MHz/64 = 250kHz)', value: '64' },
          { label: 'Előosztó: 256 (16MHz/256 = 62.5kHz)', value: '256' },
          { label: 'Előosztó: 1024', value: '1024' },
        ],
        defaultValue: '64',
      },
    ],
    defaultParams: { frequencyHz: 1000, prescaler: '64' },
    calculateCycles: () => 12, // register writes
    generateAsm: (params) => {
      const freq = Number(params.frequencyHz) || 1000;
      const prescaler = Number(params.prescaler) || 64;
      // OCR1A = (16000000 / (prescaler * freq)) - 1
      const ocr1a = Math.max(1, Math.min(65535, Math.round(16000000 / (prescaler * freq) - 1)));
      const ocrHigh = (ocr1a >> 8) & 0xff;
      const ocrLow = ocr1a & 0xff;
      return [
        `; Timer1 CTC mód konfigurálása: ${freq} Hz (${(1000 / freq).toFixed(2)} ms) @ Prescaler ${prescaler}`,
        `cli                      ; Megszakítások tiltása a beállítás idejére`,
        `clr r16                  ; TCCR1A = 0 (Normál port működés)`,
        `sts 0x80, r16            ; TCCR1A regiszter törlése`,
        `ldi r16, 0x0B            ; CTC mód (WGM12=1), Prescaler 64 (CS11=1, CS10=1)`,
        `sts 0x81, r16            ; TCCR1B regiszter beállítása`,
        `; OCR1A összehasonlító regiszter (${ocr1a} = 0x${ocr1a.toString(16).toUpperCase()})`,
        `ldi r16, 0x${ocrHigh.toString(16).padStart(2, '0').toUpperCase()}            ; OCR1AH (felső 8 bit)`,
        `sts 0x89, r16            ; OCR1AH írása`,
        `ldi r16, 0x${ocrLow.toString(16).padStart(2, '0').toUpperCase()}            ; OCR1AL (alsó 8 bit)`,
        `sts 0x88, r16            ; OCR1AL írása`,
        `ldi r16, 0x02            ; OCIE1A = 1 (Timer1 Compare Match A Interrupt engedélyezése)`,
        `sts 0x6F, r16            ; TIMSK1 regiszter`,
        `sei                      ; Globális megszakítások visszakapcsolása`,
      ];
    },
    generateC: (params) => {
      const freq = Number(params.frequencyHz) || 1000;
      const prescaler = Number(params.prescaler) || 64;
      const ocr1a = Math.max(1, Math.min(65535, Math.round(16000000 / (prescaler * freq) - 1)));
      return [
        `// C kód (Timer1 CTC konfigurálás):`,
        `noInterrupts();`,
        `TCCR1A = 0;`,
        `TCCR1B = (1 << WGM12) | (1 << CS11) | (1 << CS10); // CTC mód, Előosztó 64`,
        `OCR1A = ${ocr1a}; // ${freq} Hz összehasonlítási érték`,
        `TIMSK1 |= (1 << OCIE1A); // Megszakítás engedélyezése`,
        `interrupts();`,
        ``,
        `// Megszakításkezelő függvény:`,
        `ISR(TIMER1_COMPA_vect) {`,
        `  // Itt fut a periodikus hardveres kód!`,
        `}`,
      ];
    },
    generateInlineAsm: (params) => {
      return [
        `// Inline ASM Timer1 CTC Setup:`,
        `__asm__ __volatile__ (`,
        `  "cli\\n\\t"`,
        `  "clr __zero_reg__\\n\\t"`,
        `  "sts 0x80, __zero_reg__\\n\\t"`,
        `  "ldi r24, 0x0B\\n\\t"`,
        `  "sts 0x81, r24\\n\\t"`,
        `  "sei\\n\\t"`,
        `  ::: "r24"`,
        `);`,
      ];
    },
    explanationHu: (params) => {
      const freq = Number(params.frequencyHz) || 1000;
      return `A 16-bites Timer1 CTC (Clear Timer on Compare Match) hardveresen számol fel nullától az OCR1A regiszter értékéig. Amikor eléri, automatikusan nullázódik és pontosan másodpercenként ${freq}-szer kiváltja a TIMER1_COMPA megszakítást anélkül, hogy a CPU-t terhelné!`;
    },
  },

  interrupt_external_pin: {
    type: 'interrupt_external_pin',
    category: 'interrupt',
    name: '⚡ Külső Hardveres Megszakítás (INT0 / INT1)',
    shortDesc: 'Hardveres élérzékelés D2/D3 lábakon (FALLING, RISING, CHANGE, LOW)',
    icon: 'Zap',
    color: 'purple',
    accentColor: '#9333ea',
    params: [
      {
        key: 'vector',
        label: 'Megszakítási Vektor & Láb',
        type: 'select',
        options: [
          { label: 'INT0 (Pin D2 / PD2 - Hardver Vektor #2)', value: 'INT0' },
          { label: 'INT1 (Pin D3 / PD3 - Hardver Vektor #3)', value: 'INT1' },
        ],
        defaultValue: 'INT0',
      },
      {
        key: 'triggerMode',
        label: 'Élérzékelési Mód (Trigger Mode)',
        type: 'select',
        options: [
          { label: 'FALLING - Lefutó él (HIGH -> LOW, pl. Gombnyomás GND-re)', value: 'FALLING' },
          { label: 'RISING - Felfutó él (LOW -> HIGH, pl. Érzékelő HIGH jel)', value: 'RISING' },
          { label: 'CHANGE - Bármely állapotváltozás (Enkóder számlálás)', value: 'CHANGE' },
          { label: 'LOW - Folyamatos alacsony szint (Vészleállító)', value: 'LOW' },
        ],
        defaultValue: 'FALLING',
      },
      {
        key: 'action',
        label: 'ISR Művelet (Callback Action)',
        type: 'select',
        options: [
          { label: 'LED Invertálás (PINB D13 Toggle)', value: 'toggle_led' },
          { label: 'Számláló Változó Növelése (++count)', value: 'increment_var' },
          { label: 'Egyedi ISR Kód', value: 'custom' },
        ],
        defaultValue: 'toggle_led',
      },
      {
        key: 'targetPin',
        label: 'Cél Láb (ha LED Toggle)',
        type: 'pin',
        defaultValue: '13',
      },
      {
        key: 'targetVar',
        label: 'Cél Változó (ha Változó Növelés)',
        type: 'text',
        defaultValue: 'button_press_count',
      },
    ],
    defaultParams: {
      vector: 'INT0',
      triggerMode: 'FALLING',
      action: 'toggle_led',
      targetPin: '13',
      targetVar: 'button_press_count',
    },
    calculateCycles: () => 8,
    generateAsm: (params) => {
      const isInt0 = params.vector === 'INT0';
      const pin = isInt0 ? 'D2' : 'D3';
      const mode = params.triggerMode || 'FALLING';
      const iscBits =
        mode === 'RISING'
          ? (isInt0 ? '0x03 ; ISC01=1, ISC00=1' : '0x0C ; ISC11=1, ISC10=1')
          : mode === 'FALLING'
          ? (isInt0 ? '0x02 ; ISC01=1, ISC00=0' : '0x08 ; ISC11=1, ISC10=0')
          : mode === 'CHANGE'
          ? (isInt0 ? '0x01 ; ISC01=0, ISC00=1' : '0x04 ; ISC11=0, ISC10=1')
          : (isInt0 ? '0x00 ; ISC01=0, ISC00=0' : '0x00 ; ISC11=0, ISC10=0');
      const maskBit = isInt0 ? '0x01 ; INT0' : '0x02 ; INT1';

      return [
        `; --- ATmega328P ${params.vector} (${pin}) Külső Megszakítás Konfigurálása (${mode}) ---`,
        `cli                      ; Megszakítások tiltása a konfigurálás idejére`,
        `; 1. Bemeneti láb & Belső felhúzó ellenállás aktiválása`,
        `cbi 0x0A, ${isInt0 ? '2' : '3'}             ; DDRD.${isInt0 ? '2' : '3'} = 0 (Bemenet)`,
        `sbi 0x0B, ${isInt0 ? '2' : '3'}             ; PORTD.${isInt0 ? '2' : '3'} = 1 (INPUT_PULLUP)`,
        `; 2. Élérzékelési mód beállítása az EICRA (0x69) regiszterben`,
        `lds r16, 0x69            ; EICRA regiszter beolvasása`,
        `andi r16, ${isInt0 ? '0xFC' : '0xF3'}            ; Korábbi ISC bitek maszkolása`,
        `ori r16, ${iscBits}`,
        `sts 0x69, r16            ; EICRA regiszter frissítése`,
        `; 3. Megszakítás engedélyezése az EIMSK (0x3D) maszkban`,
        `in r16, 0x1D             ; EIMSK beolvasása`,
        `ori r16, ${maskBit}`,
        `out 0x1D, r16            ; EIMSK frissítése`,
        `sei                      ; Globális megszakítások engedélyezése (SREG.I = 1)`,
      ];
    },
    generateC: (params) => {
      const isInt0 = params.vector === 'INT0';
      const pinNum = isInt0 ? 2 : 3;
      const mode = params.triggerMode || 'FALLING';
      const isrName = isInt0 ? 'isr_int0_callback' : 'isr_int1_callback';
      const targetPin = params.targetPin || '13';
      const targetVar = params.targetVar || 'button_press_count';

      return [
        `// --- Arduino C++ Külső Megszakítás (${params.vector} @ Pin D${pinNum}) ---`,
        `pinMode(${pinNum}, INPUT_PULLUP); // Belső felhúzó bekapcsolása`,
        `attachInterrupt(digitalPinToInterrupt(${pinNum}), ${isrName}, ${mode});`,
        ``,
        `// Hardveres Megszakításkezelő Rutin (ISR):`,
        `void ${isrName}() {`,
        params.action === 'toggle_led'
          ? `  digitalWrite(${targetPin}, !digitalRead(${targetPin})); // PINB toggle`
          : params.action === 'increment_var'
          ? `  ${targetVar}++; // Volatile számláló léptetés`
          : `  // Egyedi megszakításkezelő kód...`,
        `}`,
      ];
    },
    generateInlineAsm: (params) => {
      const isInt0 = params.vector === 'INT0';
      return [
        `__asm__ __volatile__ (`,
        `  "sbi 0x1D, ${isInt0 ? '0' : '1'}\\n\\t" // EIMSK engedélyezés`,
        `  "sei\\n\\t"`,
        `);`,
      ];
    },
    explanationHu: (params) => {
      const isInt0 = params.vector === 'INT0';
      return `Az ATmega328P ${params.vector} (D${isInt0 ? '2' : '3'}) dedikált külső megszakítási lába hardveresen figyeli az elektromos éleket. Amikor a beállított esemény bekövetkezik, a processzor mindössze 4 óraciklus (250 ns) alatt megállítja a főprogramot és a Flash ${isInt0 ? '0x0002' : '0x0004'} címére ugrik a callback azonnali lefutásához.`;
    },
  },

  interrupt_pcint_port: {
    type: 'interrupt_pcint_port',
    category: 'interrupt',
    name: '🔀 Pin Change Lábváltozás Megszakítás (PCINT)',
    shortDesc: 'Több láb egyidejű figyelése Port B (D8-D13), Port C (A0-A5) vagy Port D (D0-D7)',
    icon: 'Sliders',
    color: 'purple',
    accentColor: '#8b5cf6',
    params: [
      {
        key: 'port',
        label: 'Figyelt Port Csoport',
        type: 'select',
        options: [
          { label: 'PCINT2 - Port D (D0 - D7 lábak)', value: 'PORTD' },
          { label: 'PCINT0 - Port B (D8 - D13 lábak)', value: 'PORTB' },
          { label: 'PCINT1 - Port C (A0 - A5 analóg lábak)', value: 'PORTC' },
        ],
        defaultValue: 'PORTD',
      },
      {
        key: 'pinBit',
        label: 'Figyelt Láb Bitmaszk (0..7)',
        type: 'select',
        options: [
          { label: 'Bit 2 (pl. D2 láb)', value: '2' },
          { label: 'Bit 3 (pl. D3 láb)', value: '3' },
          { label: 'Bit 4 (pl. D4 láb)', value: '4' },
          { label: 'Bit 5 (pl. D5 láb)', value: '5' },
          { label: 'Bit 0..7 (Minden láb a porton)', value: 'ALL' },
        ],
        defaultValue: '2',
      },
      {
        key: 'targetPin',
        label: 'Válasz Kimeneti Láb (Toggle Pin)',
        type: 'pin',
        defaultValue: '13',
      },
    ],
    defaultParams: { port: 'PORTD', pinBit: '2', targetPin: '13' },
    calculateCycles: () => 6,
    generateAsm: (params) => {
      const port = params.port || 'PORTD';
      const isPortD = port === 'PORTD';
      const isPortB = port === 'PORTB';
      const pcicrBit = isPortD ? 'PCIE2 (bit 2)' : isPortB ? 'PCIE0 (bit 0)' : 'PCIE1 (bit 1)';
      const pcmskReg = isPortD ? '0x6D (PCMSK2)' : isPortB ? '0x6B (PCMSK0)' : '0x6C (PCMSK1)';
      const bitVal = params.pinBit === 'ALL' ? '0xFF' : `(1 << ${params.pinBit || '2'})`;

      return [
        `; --- PCINT Lábváltozás Megszakítás (${port}) ---`,
        `cli                      ; Megszakítások tiltása`,
        `lds r16, 0x68            ; PCICR beolvasása`,
        `ori r16, ${isPortD ? '0x04' : isPortB ? '0x01' : '0x02'}            ; ${pcicrBit} engedélyezése`,
        `sts 0x68, r16            ; PCICR mentése`,
        `ldi r16, ${bitVal}            ; Maszk beállítása a ${pcmskReg} regiszterbe`,
        `sts ${isPortD ? '0x6D' : isPortB ? '0x6B' : '0x6C'}, r16`,
        `sei                      ; Globális megszakítások engedélyezése`,
      ];
    },
    generateC: (params) => {
      const port = params.port || 'PORTD';
      const vectName = port === 'PORTD' ? 'PCINT2_vect' : port === 'PORTB' ? 'PCINT0_vect' : 'PCINT1_vect';
      const maskReg = port === 'PORTD' ? 'PCMSK2' : port === 'PORTB' ? 'PCMSK0' : 'PCMSK1';
      const bitVal = params.pinBit === 'ALL' ? '0xFF' : `(1 << ${params.pinBit || '2'})`;
      const targetPin = params.targetPin || '13';

      return [
        `// Pin Change Megszakítás Beállítása (${port}):`,
        `PCICR |= (1 << ${port === 'PORTD' ? 'PCIE2' : port === 'PORTB' ? 'PCIE0' : 'PCIE1'});`,
        `${maskReg} |= ${bitVal}; // Figyelt lábak maszkolása`,
        ``,
        `// Lábváltozás Megszakításkezelő Függvény:`,
        `ISR(${vectName}) {`,
        `  digitalWrite(${targetPin}, !digitalRead(${targetPin})); // Láb állapotváltás`,
        `}`,
      ];
    },
    generateInlineAsm: (params) => {
      return [
        `__asm__ __volatile__ (`,
        `  "sts 0x68, %0\\n\\t"`,
        `  :`,
        `  : "r" ((uint8_t)0x04)`,
        `);`,
      ];
    },
    explanationHu: (params) => {
      return `A Pin Change Interrupt (PCINT) lehetővé teszi, hogy az ATmega328P szinte bármelyik lábán (összesen 24 lábon) állapotváltozásra ébredjen a processzor vagy lefusson egy eseménykezelő, gombmátrixok és több gombos bemenetek figyelésére ideális!`;
    },
  },

  interrupt_visual_designer: {
    type: 'interrupt_visual_designer',
    category: 'interrupt',
    name: '🎛️ Vizuális Megszakítás Mátrix & Vektor Konfigurátor',
    shortDesc: 'Dedikált vizuális szerkesztő megnyitása: mind a 26 ATmega328P vektor beállítása és tesztelése',
    icon: 'Radio',
    color: 'purple',
    accentColor: '#c026d3',
    params: [
      {
        key: 'preferredVector',
        label: 'Fő Figyelt Vektor',
        type: 'select',
        options: [
          { label: 'INT0 (Pin D2 External Interrupt)', value: 'INT0' },
          { label: 'INT1 (Pin D3 External Interrupt)', value: 'INT1' },
          { label: 'TIMER1_COMPA (16-bit CTC 1kHz Tick)', value: 'TIMER1_COMPA' },
          { label: 'PCINT2 (Port D Pin Change)', value: 'PCINT2' },
          { label: 'USART_RX (Soros Adatfogadás)', value: 'USART_RX' },
        ],
        defaultValue: 'INT0',
      },
      {
        key: 'note',
        label: 'Megjegyzés / Célkitűzés',
        type: 'text',
        defaultValue: 'Valós idejű hardveres megszakítás konfiguráció',
      },
    ],
    defaultParams: { preferredVector: 'INT0', note: 'Valós idejű hardveres megszakítás konfiguráció' },
    calculateCycles: () => 1,
    generateAsm: (params) => {
      return [
        `; ========================================================`,
        `; Vizuális Megszakítás Mátrix Által Generált Konfiguráció: ${params.preferredVector}`,
        `; Célkitűzés: ${params.note || 'Valós idejű hardveres ISR'}`,
        `; ========================================================`,
        `sei                      ; Globális megszakítások engedélyezése`,
      ];
    },
    generateC: (params) => {
      return [
        `// Vizuális Megszakítás Mátrix: ${params.preferredVector}`,
        `// Nyisd meg az Eszközök -> Megszakítás Tervező menüpontot a részletes szerkesztéshez!`,
        `interrupts(); // Globális megszakítás engedélyezés (SEI)`,
      ];
    },
    generateInlineAsm: (params) => {
      return [`__asm__ __volatile__ ("sei\\n\\t");`];
    },
    explanationHu: (params) => {
      return `Ez a blokk összeköti a munkaterületet a dedikált vizuális Megszakítás Tervezővel. A szerkesztőben mind a 26 ATmega328P vektor egyenként konfigurálható (időzítők, élérzékelés, regiszterek, valós idejű szimulátoros impulzus trigger).`;
    },
  },

  // ==========================================
  // 5. PROTOKOLLOK & IDŐZÍTÉS-KRITIKUS JELEK
  // ==========================================
  protocol_ws2812_rgb: {
    type: 'protocol_ws2812_rgb',
    category: 'protocol',
    name: 'WS2812B NeoPixel RGB Szín (800kHz ASM Bit-Bang)',
    shortDesc: 'Szigorú 1.25µs (800 kHz) óraciklus-pontos LED vezérlő impulzusok',
    icon: 'Sparkles',
    color: 'rose',
    accentColor: '#e11d48',
    params: [
      {
        key: 'pin',
        label: 'Adat Láb (DIN)',
        type: 'pin',
        defaultValue: '6',
        description: 'NeoPixel adatláb (pl. D6 = PD6)',
      },
      {
        key: 'red',
        label: 'Piros (R: 0-255)',
        type: 'number',
        defaultValue: 255,
      },
      {
        key: 'green',
        label: 'Zöld (G: 0-255)',
        type: 'number',
        defaultValue: 0,
      },
      {
        key: 'blue',
        label: 'Kék (B: 0-255)',
        type: 'number',
        defaultValue: 128,
      },
    ],
    defaultParams: { pin: '6', red: 255, green: 0, blue: 128 },
    calculateCycles: () => 24 * 20, // 24 bits * 20 cycles = 480 cycles = 30 us
    generateAsm: (params) => {
      const pin = (params.pin || '6') as ArduinoPin;
      const mapping = PIN_MAPPINGS[pin] || PIN_MAPPINGS['6'];
      const r = Number(params.red) || 0;
      const g = Number(params.green) || 0;
      const b = Number(params.blue) || 0;
      return [
        `; WS2812B NeoPixel 800 kHz ASM Bit-Banging (G: ${g}, R: ${r}, B: ${b})`,
        `; 0-bit időzítés: 350ns HIGH (6 ciklus) + 900ns LOW (14 ciklus)`,
        `; 1-bit időzítés: 700ns HIGH (11 ciklus) + 550ns LOW (9 ciklus)`,
        `cli                      ; Megszakítások tiltása a precíz időzítéshez`,
        `ldi r20, ${g}            ; WS2812 GRB formátum: ZÖLD bájt`,
        `ldi r21, ${r}            ; PIROS bájt`,
        `ldi r22, ${b}            ; KÉK bájt`,
        `; [Bit-küldő ciklus 24 biten keresztül 'sbi ${mapping.portAddr}, ${mapping.bit}' és 'cbi' vezérléssel...]`,
        `sbi ${mapping.portAddr}, ${mapping.bit}   ; DIN = HIGH (T0H / T1H indítás)`,
        `nop ; nop ; nop          ; Precíz nanomásodperces kitöltési tényező`,
        `cbi ${mapping.portAddr}, ${mapping.bit}   ; DIN = LOW`,
        `sei                      ; Megszakítások engedélyezése a csomag után`,
      ];
    },
    generateC: (params) => {
      const pin = (params.pin || '6') as ArduinoPin;
      const r = Number(params.red) || 0;
      const g = Number(params.green) || 0;
      const b = Number(params.blue) || 0;
      return [
        `// C kód (Adafruit NeoPixel könyvtárral):`,
        `strip.setPixelColor(0, strip.Color(${r}, ${g}, ${b}));`,
        `strip.show();`,
        `// Figyelem: Standard C kód túl lassú bit-bangingre, a könyvtár is ASM-et használ belül!`,
      ];
    },
    generateInlineAsm: (params) => {
      const pin = (params.pin || '6') as ArduinoPin;
      const mapping = PIN_MAPPINGS[pin] || PIN_MAPPINGS['6'];
      return [
        `// Inline Assembly WS2812B 800kHz adóblokk:`,
        `__asm__ __volatile__ (`,
        `  "cli\\n\\t"`,
        `  "sbi ${mapping.portAddr}, ${mapping.bit}\\n\\t"`,
        `  "nop\\n\\t" "nop\\n\\t"`,
        `  "cbi ${mapping.portAddr}, ${mapping.bit}\\n\\t"`,
        `  "sei\\n\\t"`,
        `);`,
      ];
    },
    explanationHu: (params) => {
      return `A WS2812B RGB LED vezérlője szigorú 800 kHz-es NRZ protokollt használ: 1 bit = 1.25 µs (20 óraciklus). Ha a magas szint akár 150 nanomásodperccel eltér, a LED eldobja a színt. Csak precíz Assembly kód képes ezt közvetlenül garantálni!`;
    },
  },

  protocol_square_wave: {
    type: 'protocol_square_wave',
    category: 'protocol',
    name: 'Ultragyors Négyszöghullám Generátor',
    shortDesc: 'Akár 4-8 MHz-es frekvencia generálás 2-ciklusos hardveres toggle-lal',
    icon: 'Activity',
    color: 'rose',
    accentColor: '#f43f5e',
    params: [
      {
        key: 'pin',
        label: 'Kimeneti Láb',
        type: 'pin',
        defaultValue: '13',
      },
      {
        key: 'cyclesPerHalfPeriod',
        label: 'Félperiódus Késleltetés (NOP-ok száma)',
        type: 'number',
        defaultValue: 2,
        unit: 'ciklus',
        description: '0 NOP = 4 MHz (4 ciklus periódus), 2 NOP = 2 MHz (8 ciklus)',
      },
    ],
    defaultParams: { pin: '13', cyclesPerHalfPeriod: 2 },
    calculateCycles: (params) => {
      const nops = Math.max(0, Number(params.cyclesPerHalfPeriod) || 0);
      return (2 + nops + 2) * 2; // (sbi + nops + rjmp) * 2
    },
    generateAsm: (params, labelSuffix = '1') => {
      const pin = (params.pin || '13') as ArduinoPin;
      const mapping = PIN_MAPPINGS[pin] || PIN_MAPPINGS['13'];
      const nops = Math.max(0, Number(params.cyclesPerHalfPeriod) || 0);
      const lbl = `wave_gen_${labelSuffix}`;
      const periodCycles = (2 + nops) * 2 + 2;
      const freq = (16000000 / periodCycles).toFixed(0);
      const nopLines = Array(nops).fill('  nop                    ; [1 ciklus]').join('\n');
      return [
        `; Ultragyors négyszöghullám: ~${(Number(freq) / 1000000).toFixed(2)} MHz (${periodCycles} ciklus/periódus)`,
        `${lbl}:`,
        `  sbi ${mapping.pinAddr}, ${mapping.bit}   ; Láb állapotváltás [2 ciklus]`,
        ...(nops > 0 ? [nopLines] : []),
        `  rjmp ${lbl}          ; Visszaugrik azonnal [2 ciklus]`,
      ];
    },
    generateC: (params) => {
      const pin = (params.pin || '13') as ArduinoPin;
      const mapping = PIN_MAPPINGS[pin] || PIN_MAPPINGS['13'];
      return [
        `// C kód végtelen toggle ciklussal:`,
        `while(1) {`,
        `  ${mapping.pinReg} = (1 << ${mapping.bit}); // Hardveres toggle`,
        `}`,
      ];
    },
    generateInlineAsm: (params, labelSuffix = '1') => {
      const pin = (params.pin || '13') as ArduinoPin;
      const mapping = PIN_MAPPINGS[pin] || PIN_MAPPINGS['13'];
      return [
        `__asm__ __volatile__ (`,
        `  "1: sbi ${mapping.pinAddr}, ${mapping.bit}\\n\\t"`,
        `  "rjmp 1b\\n\\t"`,
        `);`,
      ];
    },
    explanationHu: (params) => {
      return `Az 'sbi PINx, bit' (2 ciklus) és az 'rjmp' (2 ciklus) kombinációjával mindössze 4 óraciklusos (250 ns) félperiódus érhető el, ami 2.0 - 4.0 MHz-es tiszta órajelet állít elő egyetlen kimeneti lábon!`;
    },
  },

  // ==========================================
  // 6. REGISZTEREK & ARITMETIKA
  // ==========================================
  math_reg_load: {
    type: 'math_reg_load',
    category: 'math',
    name: 'Regiszter Betöltés Konstanssal (LDI)',
    shortDesc: '8-bites számérték azonnali betöltése r16..r31 munkaregiszterbe',
    icon: 'Hash',
    color: 'cyan',
    accentColor: '#0891b2',
    params: [
      {
        key: 'reg',
        label: 'Cél Regiszter',
        type: 'register',
        defaultValue: 'r16',
      },
      {
        key: 'value',
        label: 'Érték (0 - 255)',
        type: 'number',
        defaultValue: 42,
      },
    ],
    defaultParams: { reg: 'r16', value: 42 },
    calculateCycles: () => 1,
    generateAsm: (params) => {
      const reg = params.reg || 'r16';
      const val = params.value ?? 42;
      return [
        `; Regiszter értékadás: ${reg} = ${val}`,
        `ldi ${reg}, ${val}        ; Load Immediate [1 ciklus / 62.5ns]`,
      ];
    },
    generateC: (params) => {
      const val = params.value ?? 42;
      return [
        `// C kód megfelelője:`,
        `uint8_t myVar = ${val};`,
      ];
    },
    generateInlineAsm: (params) => {
      const reg = params.reg || 'r16';
      const val = params.value ?? 42;
      return [`__asm__ __volatile__ ("ldi ${reg}, ${val}\\n\\t" ::: "${reg}");`];
    },
    explanationHu: (params) => {
      const reg = params.reg || 'r16';
      const val = params.value ?? 42;
      return `Az 'ldi' (Load Immediate) utasítás pontosan 1 óraciklus (62.5 ns) alatt betölti a konstans értéket (${val}) a felső munkaregiszterek (r16-r31) egyikébe.`;
    },
  },

  math_reg_arithmetic: {
    type: 'math_reg_arithmetic',
    category: 'math',
    name: 'Aritmetikai Művelet (INC / DEC / ADD / SUB)',
    shortDesc: 'Regiszter növelése, csökkentése vagy összeadása 1 ciklusban',
    icon: 'Plus',
    color: 'cyan',
    accentColor: '#06b6d4',
    params: [
      {
        key: 'operation',
        label: 'Művelet Típusa',
        type: 'select',
        options: [
          { label: 'INC - Növelés 1-gyel (+1)', value: 'INC' },
          { label: 'DEC - Csökkentés 1-gyel (-1)', value: 'DEC' },
          { label: 'ADD - Két regiszter összeadása', value: 'ADD' },
          { label: 'SUB - Regiszter kivonása', value: 'SUB' },
          { label: 'CLR - Nullázás (0)', value: 'CLR' },
        ],
        defaultValue: 'INC',
      },
      {
        key: 'destReg',
        label: 'Cél Regiszter',
        type: 'register',
        defaultValue: 'r16',
      },
      {
        key: 'srcReg',
        label: 'Forrás Regiszter (ADD / SUB esetén)',
        type: 'register',
        defaultValue: 'r17',
      },
    ],
    defaultParams: { operation: 'INC', destReg: 'r16', srcReg: 'r17' },
    calculateCycles: () => 1,
    generateAsm: (params) => {
      const op = params.operation || 'INC';
      const dest = params.destReg || 'r16';
      const src = params.srcReg || 'r17';
      if (op === 'INC') return [`; ${dest} növelése 1-gyel`, `inc ${dest}              ; ${dest} = ${dest} + 1 [1 ciklus]`];
      if (op === 'DEC') return [`; ${dest} csökkentése 1-gyel`, `dec ${dest}              ; ${dest} = ${dest} - 1 [1 ciklus]`];
      if (op === 'CLR') return [`; ${dest} törlése (0)`, `clr ${dest}              ; ${dest} = 0 [1 ciklus]`];
      if (op === 'ADD') return [`; ${dest} = ${dest} + ${src}`, `add ${dest}, ${src}         ; Összeadás [1 ciklus]`];
      return [`; ${dest} = ${dest} - ${src}`, `sub ${dest}, ${src}         ; Kivonás [1 ciklus]`];
    },
    generateC: (params) => {
      const op = params.operation || 'INC';
      if (op === 'INC') return [`varA++; // vagy varA += 1;`];
      if (op === 'DEC') return [`varA--; // vagy varA -= 1;`];
      if (op === 'CLR') return [`varA = 0;`];
      if (op === 'ADD') return [`varA += varB;`];
      return [`varA -= varB;`];
    },
    generateInlineAsm: (params) => {
      const op = (params.operation || 'INC').toLowerCase();
      const dest = params.destReg || 'r16';
      const src = params.srcReg || 'r17';
      const instr = (op === 'inc' || op === 'dec' || op === 'clr') ? `${op} ${dest}` : `${op} ${dest}, ${src}`;
      return [`__asm__ __volatile__ ("${instr}\\n\\t" ::: "${dest}");`];
    },
    explanationHu: (params) => {
      return `Az AVR ALU (Arithmetic Logic Unit) közvetlenül a munkaregisztereken hajtja végre a műveleteket mindössze 1 óraciklus alatt, miközben azonnal frissíti a Zero, Carry és Overflow státusz biteket.`;
    },
  },

  math_hardware_mul: {
    type: 'math_hardware_mul',
    category: 'math',
    name: '⚡ Hardveres 8-bites Szorzás (MUL / MULS)',
    shortDesc: 'Hardveres szorzó 2 óraciklus alatt (125 ns), eredmény az r1:r0 regiszterpárban',
    icon: 'Zap',
    color: 'cyan',
    accentColor: '#0891b2',
    params: [
      {
        key: 'mulType',
        label: 'Szorzás Típusa',
        type: 'select',
        options: [
          { label: 'MUL - Előjel nélküli szorzás (Unsigned: 0..255 * 0..255)', value: 'MUL' },
          { label: 'MULS - Előjeles szorzás (Signed: -128..127 * -128..127)', value: 'MULS' },
          { label: 'FMUL - Tört szorzás (Fractional 1.7 fixpontos szorzás)', value: 'FMUL' },
        ],
        defaultValue: 'MUL',
      },
      {
        key: 'regA',
        label: 'Első Tényező (A)',
        type: 'register',
        defaultValue: 'r16',
      },
      {
        key: 'regB',
        label: 'Második Tényező (B)',
        type: 'register',
        defaultValue: 'r17',
      },
      {
        key: 'destLow',
        label: 'Alsó Szorzat Célregiszter (Low Byte)',
        type: 'register',
        defaultValue: 'r24',
      },
      {
        key: 'destHigh',
        label: 'Felső Szorzat Célregiszter (High Byte)',
        type: 'register',
        defaultValue: 'r25',
      },
    ],
    defaultParams: {
      mulType: 'MUL',
      regA: 'r16',
      regB: 'r17',
      destLow: 'r24',
      destHigh: 'r25',
    },
    calculateCycles: () => 4, // mul (2) + movw or 2x mov + clr r1 (2)
    generateAsm: (params) => {
      const type = (params.mulType || 'MUL').toLowerCase();
      const a = params.regA || 'r16';
      const b = params.regB || 'r17';
      const dL = params.destLow || 'r24';
      const dH = params.destHigh || 'r25';
      return [
        `; --- ATmega328P Hardveres Szorzás: ${a} * ${b} [2 ciklus] ---`,
        `${type} ${a}, ${b}              ; Szorzás indítása -> Eredmény az r1:r0 párban [2 ciklus]`,
        `mov ${dL}, r0                 ; Szorzat alsó 8 bitjének mentése (${dL}) [1 ciklus]`,
        `mov ${dH}, r1                 ; Szorzat felső 8 bitjének mentése (${dH}) [1 ciklus]`,
        `clr r1                        ; C ABI __zero_reg__ (r1) kötelező törlése! [1 ciklus]`,
      ];
    },
    generateC: (params) => {
      const isSigned = params.mulType === 'MULS';
      const typeStr = isSigned ? 'int16_t' : 'uint16_t';
      const castStr = isSigned ? '(int8_t)' : '(uint8_t)';
      return [
        `// C kód megfelelője (16-bites hardveres szorzat):`,
        `${typeStr} product = (${typeStr})${castStr}varA * ${castStr}varB;`,
        `uint8_t ${params.destLow} = (uint8_t)(product & 0xFF);`,
        `uint8_t ${params.destHigh} = (uint8_t)((product >> 8) & 0xFF);`,
      ];
    },
    generateInlineAsm: (params) => {
      const type = (params.mulType || 'MUL').toLowerCase();
      const a = params.regA || 'r16';
      const b = params.regB || 'r17';
      return [
        `__asm__ __volatile__ (`,
        `  "${type} %0, %1\\n\\t"`,
        `  "clr __zero_reg__\\n\\t" // r1 visszaállítása`,
        `  :`,
        `  : "r" (${a}), "r" (${b})`,
        `  : "r0", "r1"`,
        `);`,
      ];
    },
    explanationHu: (params) => {
      return `Az ATmega328P beépített 2-ciklusos hardveres szorzóval rendelkezik. A 8-bites tényezők szorzatát (16 bit) a dedikált r1:r0 regiszterpárban adja meg. Figyelem: AVR C/C++ környezetben az r1 regiszter az úgynevezett '__zero_reg__', ezért szorzás után a 'clr r1' utasítás futtatása kötelező a processzor stabilitásához!`;
    },
  },

  math_word_arithmetic: {
    type: 'math_word_arithmetic',
    category: 'math',
    name: '🔟 16-bites Szó Aritmetika (ADIW / SBIW)',
    shortDesc: '16-bites azonnali hozzáadás vagy kivonás r24..r31 mutatópárokon (2 ciklus)',
    icon: 'Plus',
    color: 'cyan',
    accentColor: '#0891b2',
    params: [
      {
        key: 'operation',
        label: 'Művelet',
        type: 'select',
        options: [
          { label: 'ADIW - 16-bites Hozzáadás konstanssal (Add Immediate to Word)', value: 'ADIW' },
          { label: 'SBIW - 16-bites Kivonás konstanssal (Subtract Immediate from Word)', value: 'SBIW' },
        ],
        defaultValue: 'ADIW',
      },
      {
        key: 'regPair',
        label: '16-bites Regiszterpár',
        type: 'select',
        options: [
          { label: 'r24:r25 (Általános 16-bites munkaregiszter)', value: 'r24' },
          { label: 'r26:r27 (X Mutató)', value: 'r26' },
          { label: 'r28:r29 (Y Keretmutató)', value: 'r28' },
          { label: 'r30:r31 (Z Program/Flash Mutató)', value: 'r30' },
        ],
        defaultValue: 'r24',
      },
      {
        key: 'value',
        label: 'Konstans Érték (0 - 63)',
        type: 'number',
        defaultValue: 1,
      },
    ],
    defaultParams: { operation: 'ADIW', regPair: 'r24', value: 1 },
    calculateCycles: () => 2,
    generateAsm: (params) => {
      const op = (params.operation || 'ADIW').toLowerCase();
      const pair = params.regPair || 'r24';
      const val = Math.max(0, Math.min(63, Number(params.value) || 1));
      return [
        `; 16-bites szó ${op === 'adiw' ? 'növelése' : 'csökkentése'}: ${pair} ${op === 'adiw' ? '+=' : '-='} ${val}`,
        `${op} ${pair}, ${val}           ; 16-bites művelet egyetlen utasítással [2 ciklus / 125ns]`,
      ];
    },
    generateC: (params) => {
      const op = params.operation === 'SBIW' ? '-=' : '+=';
      const val = Math.max(0, Math.min(63, Number(params.value) || 1));
      return [
        `// C kód (16-bites pointer vagy számláló léptetés):`,
        `uint16_t wordVal;`,
        `wordVal ${op} ${val};`,
      ];
    },
    generateInlineAsm: (params) => {
      const op = (params.operation || 'ADIW').toLowerCase();
      const pair = params.regPair || 'r24';
      const val = Math.max(0, Math.min(63, Number(params.value) || 1));
      return [`__asm__ __volatile__ ("${op} ${pair}, ${val}\\n\\t");`];
    },
    explanationHu: (params) => {
      return `Az 'adiw' és 'sbiw' utasítások kifejezetten a 16-bites mutatók (X, Y, Z és r25:r24) gyors, mindössze 2 óraciklusos manipulálására szolgálnak 0..63 közötti konstansokkal, elkerülve a lassabb 2-lépéses bájtos műveleteket.`;
    },
  },

  math_add_sub_carry: {
    type: 'math_add_sub_carry',
    category: 'math',
    name: '🔗 Összeadás / Kivonás Átvitellel (ADC / SBC)',
    shortDesc: 'Többszavas (16/32-bit) számítások láncolása a Carry jelzőbit figyelembevételével',
    icon: 'Hash',
    color: 'cyan',
    accentColor: '#0891b2',
    params: [
      {
        key: 'operation',
        label: 'Művelet',
        type: 'select',
        options: [
          { label: 'ADC - Összeadás átvitellel (Dest = Dest + Src + Carry)', value: 'ADC' },
          { label: 'SBC - Kivonás átvitellel (Dest = Dest - Src - Carry)', value: 'SBC' },
          { label: 'SBCI - Kivonás konstanssal és átvitellel (Dest = Dest - K - Carry)', value: 'SBCI' },
        ],
        defaultValue: 'ADC',
      },
      {
        key: 'destReg',
        label: 'Cél Felső Regiszter',
        type: 'register',
        defaultValue: 'r17',
      },
      {
        key: 'srcReg',
        label: 'Forrás Regiszter',
        type: 'register',
        defaultValue: 'r19',
      },
      {
        key: 'constValue',
        label: 'Konstans (Csak SBCI esetén: 0-255)',
        type: 'number',
        defaultValue: 0,
      },
    ],
    defaultParams: { operation: 'ADC', destReg: 'r17', srcReg: 'r19', constValue: 0 },
    calculateCycles: () => 1,
    generateAsm: (params) => {
      const op = (params.operation || 'ADC').toLowerCase();
      const dest = params.destReg || 'r17';
      const src = params.srcReg || 'r19';
      const val = params.constValue || 0;
      if (op === 'sbci') {
        return [
          `; Felső bájt kivonása konstanssal és átvitellel: ${dest} = ${dest} - ${val} - Carry`,
          `sbci ${dest}, ${val}          ; SBCI művelet [1 ciklus]`,
        ];
      }
      return [
        `; Felső bájt ${op === 'adc' ? 'összeadása' : 'kivonása'} Carry-vel: ${dest} = ${dest} ${op === 'adc' ? '+' : '-'} ${src} ${op === 'adc' ? '+' : '-'} Carry`,
        `${op} ${dest}, ${src}          ; ${params.operation} művelet [1 ciklus / 62.5ns]`,
      ];
    },
    generateC: (params) => {
      const isAdd = params.operation === 'ADC';
      return [
        `// C kód (32 vagy 16 bites láncolt aritmetika):`,
        isAdd ? `destVal = destVal + srcVal + (sreg_carry ? 1 : 0);` : `destVal = destVal - srcVal - (sreg_carry ? 1 : 0);`,
      ];
    },
    generateInlineAsm: (params) => {
      const op = (params.operation || 'ADC').toLowerCase();
      const dest = params.destReg || 'r17';
      const src = params.srcReg || 'r19';
      return [`__asm__ __volatile__ ("${op} ${dest}, ${src}\\n\\t" ::: "${dest}");`];
    },
    explanationHu: (params) => {
      return `Az 'adc' és 'sbc' utasítások az alsó bájtos művelet által a processzor SREG.C (Carry Flag) bitjében hagyott átvitelt automatikusan beleszámítják a felső bájtokba. Ezzel 16 bites, 32 bites vagy akár 64 bites számok is precízen feldolgozhatók bájt-láncolással.`;
    },
  },

  math_bitwise_logic: {
    type: 'math_bitwise_logic',
    category: 'math',
    name: '🎭 Bitenkénti Logika (AND, OR, XOR, COM, NEG)',
    shortDesc: 'Bitmaszkolás, invertálás és előjelváltás 1 óraciklusban',
    icon: 'Binary',
    color: 'cyan',
    accentColor: '#0891b2',
    params: [
      {
        key: 'operation',
        label: 'Logikai Művelet',
        type: 'select',
        options: [
          { label: 'AND / ANDI - Bitenkénti ÉS (Maszkolás / Törlés)', value: 'AND' },
          { label: 'OR / ORI - Bitenkénti VAGY (Bitek beállítása 1-be)', value: 'OR' },
          { label: 'EOR - Bitenkénti Kizáró VAGY (XOR / Invertálás)', value: 'EOR' },
          { label: 'COM - 1-es komplemens (~ Minden bit negálása)', value: 'COM' },
          { label: 'NEG - 2-es komplemens (- Matematikai előjelváltás)', value: 'NEG' },
        ],
        defaultValue: 'AND',
      },
      {
        key: 'destReg',
        label: 'Cél Regiszter',
        type: 'register',
        defaultValue: 'r16',
      },
      {
        key: 'mode',
        label: 'Forrás Típusa',
        type: 'select',
        options: [
          { label: 'Konstans Érték (Immediate Maszk)', value: 'CONST' },
          { label: 'Másik Regiszter', value: 'REG' },
        ],
        defaultValue: 'CONST',
      },
      {
        key: 'maskHex',
        label: 'Konstans Maszk (HEX vagy DEC)',
        type: 'text',
        defaultValue: '0x0F',
      },
      {
        key: 'srcReg',
        label: 'Forrás Regiszter (ha Másik Regiszter)',
        type: 'register',
        defaultValue: 'r17',
      },
    ],
    defaultParams: {
      operation: 'AND',
      destReg: 'r16',
      mode: 'CONST',
      maskHex: '0x0F',
      srcReg: 'r17',
    },
    calculateCycles: () => 1,
    generateAsm: (params) => {
      const op = params.operation || 'AND';
      const dest = params.destReg || 'r16';
      const src = params.srcReg || 'r17';
      const mask = params.maskHex || '0x0F';
      const isConst = params.mode === 'CONST';

      if (op === 'COM') return [`; 1-es komplemens (bitenkénti negálás): ${dest} = ~${dest}`, `com ${dest}                  ; Invertálja az összes bitet (0<->1) [1 ciklus]`];
      if (op === 'NEG') return [`; 2-es komplemens (előjelváltás): ${dest} = -${dest}`, `neg ${dest}                  ; Előjelváltás (0 - ${dest}) [1 ciklus]`];
      if (op === 'AND') {
        return isConst
          ? [`; Bitmaszkolás ÉS művelettel: ${dest} = ${dest} & ${mask}`, `andi ${dest}, ${mask}           ; AND Immediate [1 ciklus]` ]
          : [`; Két regiszter ÉS kapcsolata: ${dest} = ${dest} & ${src}`, `and ${dest}, ${src}             ; AND [1 ciklus]` ];
      }
      if (op === 'OR') {
        return isConst
          ? [`; Bitek beállítása VAGY művelettel: ${dest} = ${dest} | ${mask}`, `ori ${dest}, ${mask}            ; OR Immediate [1 ciklus]` ]
          : [`; Két regiszter VAGY kapcsolata: ${dest} = ${dest} | ${src}`, `or ${dest}, ${src}              ; OR [1 ciklus]` ];
      }
      return isConst
        ? [`; XOR maszkolás: ${dest} = ${dest} ^ ${mask}`, `ldi r18, ${mask}`, `eor ${dest}, r18             ; Exclusive OR [2 ciklus]` ]
        : [`; Két regiszter XOR kapcsolata: ${dest} = ${dest} ^ ${src}`, `eor ${dest}, ${src}             ; EOR [1 ciklus]` ];
    },
    generateC: (params) => {
      const op = params.operation || 'AND';
      const mask = params.maskHex || '0x0F';
      const src = params.srcReg || 'r17';
      const isConst = params.mode === 'CONST';
      if (op === 'COM') return [`varA = ~varA; // Bitenkénti invertálás`];
      if (op === 'NEG') return [`varA = -varA; // Matematikai előjel megfordítása`];
      if (op === 'AND') return isConst ? [`varA &= ${mask}; // Alsó/Felső bitek kimaszkolása`] : [`varA &= varB;`];
      if (op === 'OR') return isConst ? [`varA |= ${mask}; // Jelzőbitek beállítása`] : [`varA |= varB;`];
      return isConst ? [`varA ^= ${mask}; // Bitek billentése (toggle)`] : [`varA ^= varB;`];
    },
    generateInlineAsm: (params) => {
      const dest = params.destReg || 'r16';
      return [`__asm__ __volatile__ ("andi ${dest}, 0x0F\\n\\t" ::: "${dest}");`];
    },
    explanationHu: (params) => {
      return `A mikrokontroller ALU-ja hardveres logikai kapuhálózattal végzi a bitműveleteket 62.5 nanomásodperc alatt. Az 'ANDI' kiváló alsó/felső 4 bit kimaszkolására, az 'ORI' állapotbitek bekapcsolására, míg az 'EOR' (XOR) paritásszámításra és bitbillentésre.`;
    },
  },

  math_shift_rotate: {
    type: 'math_shift_rotate',
    category: 'math',
    name: '🔄 Bitleptetés & Forgatás (LSL, LSR, ASR, SWAP)',
    shortDesc: 'Gyors 2-vel való szorzás/osztás, előjeles léptetés és nibble csere',
    icon: 'RotateCw',
    color: 'cyan',
    accentColor: '#0891b2',
    params: [
      {
        key: 'shiftType',
        label: 'Művelet Fajtája',
        type: 'select',
        options: [
          { label: 'LSL - Logikai Balra Tolás (*2 szorzás, bit0=0, bit7->Carry)', value: 'LSL' },
          { label: 'LSR - Logikai Jobbra Tolás (/2 osztás, bit7=0, bit0->Carry)', value: 'LSR' },
          { label: 'ASR - Aritmetikai Jobbra Tolás (Előjeles /2 osztás, MSB megmarad)', value: 'ASR' },
          { label: 'ROL - Balra Forgatás Carry-n keresztül (9-bites gyűrű)', value: 'ROL' },
          { label: 'ROR - Jobbra Forgatás Carry-n keresztül', value: 'ROR' },
          { label: 'SWAP - Alsó és Felső 4-bit (Nibble) Megcserélése', value: 'SWAP' },
        ],
        defaultValue: 'LSL',
      },
      {
        key: 'reg',
        label: 'Regiszter',
        type: 'register',
        defaultValue: 'r16',
      },
    ],
    defaultParams: { shiftType: 'LSL', reg: 'r16' },
    calculateCycles: () => 1,
    generateAsm: (params) => {
      const type = (params.shiftType || 'LSL').toLowerCase();
      const reg = params.reg || 'r16';
      if (type === 'swap') {
        return [
          `; Nibble csere: ${reg}[7..4] <-> ${reg}[3..0]`,
          `swap ${reg}                  ; Alsó és felső 4 bit cseréje [1 ciklus]`,
        ];
      }
      return [
        `; Bitleptetés: ${type.toUpperCase()} ${reg} [1 ciklus]`,
        `${type} ${reg}                  ; Bitleptetés / Forgatás [1 ciklus / 62.5ns]`,
      ];
    },
    generateC: (params) => {
      const type = params.shiftType || 'LSL';
      if (type === 'LSL') return [`varA <<= 1; // 2-vel való szorzás`];
      if (type === 'LSR') return [`varA = (uint8_t)varA >> 1; // Előjel nélküli 2-vel való osztás`];
      if (type === 'ASR') return [`varA = (int8_t)varA >> 1; // Előjeles 2-vel való osztás`];
      if (type === 'SWAP') return [`varA = ((varA & 0x0F) << 4) | ((varA & 0xF0) >> 4); // 4-bites nibble csere`];
      return [`// Bitforgatás Carry-n keresztül:`, `uint8_t newC = varA & 1; varA = (varA >> 1) | (oldC << 7); oldC = newC;`];
    },
    generateInlineAsm: (params) => {
      const type = (params.shiftType || 'LSL').toLowerCase();
      const reg = params.reg || 'r16';
      return [`__asm__ __volatile__ ("${type} ${reg}\\n\\t" ::: "${reg}");`];
    },
    explanationHu: (params) => {
      return `Az 'lsl' (Logical Shift Left) és 'lsr' (Logical Shift Right) mindössze 1 ciklus alatt szoroz vagy oszt 2-vel. Az 'asr' megőrzi a legfelső előjelbitet, így negatív számok felezésére is alkalmas. A 'swap' utasítás nélkülözhetetlen BCD számok és 4-bites LCD kijelzők adatátvitelénél.`;
    },
  },

  math_bit_test_skip: {
    type: 'math_bit_test_skip',
    category: 'math',
    name: '⚡ Bit-Teszt & Átugrás (SBRC, SBRS, TST)',
    shortDesc: 'Regiszter adott bitjének vizsgálata és a következő utasítás azonnali átugrása (1-2 ciklus)',
    icon: 'CheckCircle2',
    color: 'cyan',
    accentColor: '#0891b2',
    params: [
      {
        key: 'testType',
        label: 'Teszt Típusa',
        type: 'select',
        options: [
          { label: 'SBRC - Átugrás ha a kiválasztott bit 0 (Skip if Bit in Reg Cleared)', value: 'SBRC' },
          { label: 'SBRS - Átugrás ha a kiválasztott bit 1 (Skip if Bit in Reg Set)', value: 'SBRS' },
          { label: 'TST - Nulla vagy Negatív vizsgálat (Test for Zero / Minus)', value: 'TST' },
        ],
        defaultValue: 'SBRC',
      },
      {
        key: 'reg',
        label: 'Vizsgált Regiszter',
        type: 'register',
        defaultValue: 'r16',
      },
      {
        key: 'bitIndex',
        label: 'Bit Index (0 - 7)',
        type: 'number',
        defaultValue: 0,
      },
    ],
    defaultParams: { testType: 'SBRC', reg: 'r16', bitIndex: 0 },
    calculateCycles: () => 2,
    generateAsm: (params) => {
      const type = (params.testType || 'SBRC').toLowerCase();
      const reg = params.reg || 'r16';
      const bit = Math.max(0, Math.min(7, Number(params.bitIndex) || 0));
      if (type === 'tst') {
        return [
          `; Regiszter előjel / nulla vizsgálata:`,
          `tst ${reg}                    ; SREG Z és N jelzőbitek frissítése [1 ciklus]`,
        ];
      }
      return [
        `; Gyors feltételes bit-átugrás: Ha ${reg}.${bit} == ${type === 'sbrc' ? '0' : '1'} -> ugrás`,
        `${type} ${reg}, ${bit}          ; Következő 1 utasítás átugrása ha teljesül [1 vagy 2 ciklus]`,
      ];
    },
    generateC: (params) => {
      const isSet = params.testType === 'SBRS';
      const bit = params.bitIndex || 0;
      return [
        `// C kód elágazás:`,
        isSet ? `if (${params.reg} & (1 << ${bit})) { /* Átugorja a következő műveletet */ }` : `if (!(${params.reg} & (1 << ${bit}))) { /* Átugorja a következő műveletet */ }`,
      ];
    },
    generateInlineAsm: (params) => {
      const type = (params.testType || 'SBRC').toLowerCase();
      const reg = params.reg || 'r16';
      const bit = params.bitIndex || 0;
      return [`__asm__ __volatile__ ("${type} ${reg}, ${bit}\\n\\t");`];
    },
    explanationHu: (params) => {
      return `Az 'sbrc' és 'sbrs' hardveres átugró utasítások óriási előnye a sima ugrásokkal (RJMP/BREQ) szemben, hogy nem igényelnek ugrási címkét és nem törik meg a processzor utasítás-futószalagját (pipeline), mindössze 1-2 ciklus alatt lefutnak.`;
    },
  },

  math_map_constrain: {
    type: 'math_map_constrain',
    category: 'math',
    name: '📐 Skálázás & Korlátozás (map & constrain)',
    shortDesc: 'Értéktartomány átskálázása (0-1023 -> 0-255) és minimum/maximum vágás',
    icon: 'Sliders',
    color: 'cyan',
    accentColor: '#0891b2',
    params: [
      {
        key: 'funcType',
        label: 'Matematikai Funkció',
        type: 'select',
        options: [
          { label: 'MAP - Tartomány átskálázása (pl. ADC 0..1023 -> PWM 0..255)', value: 'MAP' },
          { label: 'CONSTRAIN - Alsó és felső korlát közé szorítás', value: 'CONSTRAIN' },
          { label: 'ABS - Abszolút érték (|x|)', value: 'ABS' },
        ],
        defaultValue: 'MAP',
      },
      {
        key: 'valReg',
        label: 'Bemeneti Érték Regisztere',
        type: 'register',
        defaultValue: 'r16',
      },
      {
        key: 'minVal',
        label: 'Alsó Határ (Min)',
        type: 'number',
        defaultValue: 0,
      },
      {
        key: 'maxVal',
        label: 'Felső Határ (Max)',
        type: 'number',
        defaultValue: 255,
      },
    ],
    defaultParams: { funcType: 'MAP', valReg: 'r16', minVal: 0, maxVal: 255 },
    calculateCycles: () => 6,
    generateAsm: (params) => {
      const reg = params.valReg || 'r16';
      const min = Number(params.minVal) || 0;
      const max = Number(params.maxVal) || 255;
      const fType = params.funcType || 'MAP';

      if (fType === 'ABS') {
        return [
          `; Abszolút érték: |${reg}|`,
          `sbrs ${reg}, 7                ; Ha pozitív (bit 7 == 0), kihagyjuk a negálást`,
          `rjmp abs_pos`,
          `neg ${reg}                    ; Negatív szám esetén előjelváltás`,
          `abs_pos:`,
        ];
      }
      if (fType === 'CONSTRAIN') {
        return [
          `; Constrain: ${reg} korlátozása [${min} .. ${max}] közé`,
          `cpi ${reg}, ${min}            ; Alsó határ vizsgálata`,
          `brge check_max`,
          `ldi ${reg}, ${min}            ; Ha kisebb -> Min érték beállítása`,
          `rjmp constrain_done`,
          `check_max:`,
          `cpi ${reg}, ${max}            ; Felső határ vizsgálata`,
          `brlt constrain_done`,
          `ldi ${reg}, ${max}            ; Ha nagyobb -> Max érték beállítása`,
          `constrain_done:`,
        ];
      }
      return [
        `; Gyors ADC -> PWM skálázás (0..1023 osztása 4-gyel 2 bitleptetéssel):`,
        `lsr ${reg}                    ; 1. Bit jobbra tolás (/2) [1 ciklus]`,
        `lsr ${reg}                    ; 2. Bit jobbra tolás (/4) -> 0..255 PWM tartomány [1 ciklus]`,
      ];
    },
    generateC: (params) => {
      const fType = params.funcType || 'MAP';
      const min = params.minVal ?? 0;
      const max = params.maxVal ?? 255;
      if (fType === 'ABS') return [`int result = abs(varA);`];
      if (fType === 'CONSTRAIN') return [`int result = constrain(varA, ${min}, ${max});`];
      return [`long result = map(varA, 0, 1023, ${min}, ${max});`];
    },
    generateInlineAsm: (params) => {
      return [`// Inline map / constrain ASM routine`];
    },
    explanationHu: (params) => {
      return `A beágyazott rendszerekben az analóg szenzorok 10 bites (0-1023) jeleit gyakran kell 8 bites (0-255) PWM vagy szervó vezérlő jelekké konvertálni. A lebegőpontos leosztás helyett a 2 bites jobbra léptetés (LSR) mindössze 2 óraciklus alatt (125 ns) elvégzi a 4-gyel való osztást!`;
    },
  },

  math_div16_mod: {
    type: 'math_div16_mod',
    category: 'math',
    name: '➗ 16-bites Egészosztás & Maradék (DIV / MOD)',
    shortDesc: '16-bites osztás (r24:r25 / r22:r23) hányados és maradék számítással',
    icon: 'Binary',
    color: 'cyan',
    accentColor: '#0891b2',
    params: [
      {
        key: 'dividendHigh',
        label: 'Osztandó Felső Bájt (Dividend H)',
        type: 'register',
        defaultValue: 'r25',
      },
      {
        key: 'dividendLow',
        label: 'Osztandó Alsó Bájt (Dividend L)',
        type: 'register',
        defaultValue: 'r24',
      },
      {
        key: 'divisor',
        label: 'Osztó Értéke (Divisor: 1-255)',
        type: 'number',
        defaultValue: 10,
      },
    ],
    defaultParams: { dividendHigh: 'r25', dividendLow: 'r24', divisor: 10 },
    calculateCycles: () => 28,
    generateAsm: (params) => {
      const divVal = Math.max(1, Number(params.divisor) || 10);
      return [
        `; --- 16-bites Egészosztás és Maradék (r25:r24 / ${divVal}) ---`,
        `ldi r22, ${divVal}            ; Osztó betöltése`,
        `clr r23                       ; Maradék inicializálása (0)`,
        `ldi r20, 16                   ; 16 bites léptető számláló`,
        `div_loop:`,
        `  lsl r24                     ; Osztandó és hányados léptetése balra`,
        `  rol r25`,
        `  rol r23                     ; Átvitel beforgatása a maradékba`,
        `  cp r23, r22                 ; Maradék >= Osztó vizsgálata`,
        `  brcs div_skip`,
        `  sub r23, r22                ; Maradék csökkentése az osztóval`,
        `  inc r24                     ; Hányados legalsó bitjének beállítása (1)`,
        `div_skip:`,
        `  dec r20`,
        `  brne div_loop               ; 16 iteráció lefutása`,
        `; Eredmény: r25:r24 = Hányados, r23 = Maradék (Modulo)`,
      ];
    },
    generateC: (params) => {
      const d = params.divisor || 10;
      return [
        `// C kód (16-bites osztás és moduló):`,
        `uint16_t dividend = 1000;`,
        `uint16_t quotient = dividend / ${d}; // Hányados`,
        `uint8_t remainder = dividend % ${d}; // Maradék`,
      ];
    },
    generateInlineAsm: (params) => {
      return [`// Inline 16-bit division restoring shift loop`];
    },
    explanationHu: (params) => {
      return `Mivel az AVR processzor nem tartalmaz hardveres osztó egységet, az egészosztást egy 16-lépéses balra-forgató és kivonó (restoring division) algoritmussal hajtja végre. Az eljárás végén a hányados az r25:r24 párosba, a maradék pedig az r23 regiszterbe kerül.`;
    },
  },

  // ==========================================
  // 7. I2C (TWI) PROTOKOLL & BUSZVEZÉRLÉS
  // ==========================================
  protocol_i2c_init: {
    type: 'protocol_i2c_init',
    category: 'protocol',
    name: 'I2C (TWI) Hardver Inicializálás',
    shortDesc: 'Hardveres TWI modul beállítása 100 kHz vagy 400 kHz órajelre (A4 SDA / A5 SCL)',
    icon: 'Share2',
    color: 'purple',
    accentColor: '#9333ea',
    params: [
      {
        key: 'speed',
        label: 'Busz Sebesség',
        type: 'select',
        options: [
          { label: '100 kHz (Standard TWI Mód - TWBR=72)', value: '100kHz' },
          { label: '400 kHz (Fast TWI Mód - TWBR=12)', value: '400kHz' },
        ],
        defaultValue: '100kHz',
      },
    ],
    defaultParams: { speed: '100kHz' },
    calculateCycles: () => 6,
    generateAsm: (params) => {
      const isFast = params.speed === '400kHz';
      const twbrVal = isFast ? 12 : 72; // (16MHz / 100kHz - 16) / 2 = 72
      return [
        `; --- I2C (TWI) Hardver Inicializálás (${params.speed}) ---`,
        `ldi r16, ${twbrVal}          ; TWBR (Bit Rate Register) beállítása [1 ciklus]`,
        `sts 0xB8, r16          ; STS TWBR (0xB8 / TWBR) [2 ciklus]`,
        `ldi r16, 0x00          ; TWSR előosztó = 1 (TWPS1=0, TWPS0=0)`,
        `sts 0xB9, r16          ; STS TWSR`,
        `ldi r16, (1 << 2)      ; TWCR: TWEN (TWI Engedélyezése)`,
        `sts 0xBC, r16          ; STS TWCR`,
      ];
    },
    generateC: (params) => {
      const isFast = params.speed === '400kHz';
      return [
        `// C kód (Közvetlen regiszter):`,
        `TWSR = 0;`,
        `TWBR = ${isFast ? 12 : 72}; // ${params.speed} @ 16MHz`,
        `TWCR = (1 << TWEN);`,
        `// Arduino Standard C megfelelője:`,
        `Wire.begin();`,
        ...(isFast ? [`Wire.setClock(400000);`] : []),
      ];
    },
    generateInlineAsm: (params) => {
      const isFast = params.speed === '400kHz';
      const twbrVal = isFast ? 12 : 72;
      return [
        `__asm__ __volatile__ (`,
        `  "ldi r16, ${twbrVal}\\n\\t"`,
        `  "sts 0xB8, r16\\n\\t" // TWBR`,
        `  "ldi r16, 0\\n\\t"`,
        `  "sts 0xB9, r16\\n\\t" // TWSR`,
        `  "ldi r16, (1<<2)\\n\\t"`,
        `  "sts 0xBC, r16\\n\\t" // TWCR: TWEN`,
        `  ::: "r16"`,
        `);`,
      ];
    },
    explanationHu: (params) => {
      return `Az ATmega328P hardveres Two-Wire Interface (I2C) vezérlője a TWBR és TWSR regisztereken keresztül generálja az órajelet a PC5 (SCL) és PC4 (SDA) lábakon. 16 MHz-es kristály mellett TWBR=72 pontosan 100.0 kHz-es, míg TWBR=12 pontosan 400.0 kHz-es buszsebességet biztosít.`;
    },
  },

  protocol_i2c_start_stop: {
    type: 'protocol_i2c_start_stop',
    category: 'protocol',
    name: 'I2C START / STOP Feltétel',
    shortDesc: 'START, Ismételt START vagy STOP buszállapot generálása TWCR regiszterrel',
    icon: 'Zap',
    color: 'purple',
    accentColor: '#a855f7',
    params: [
      {
        key: 'condition',
        label: 'Busz Állapot',
        type: 'select',
        options: [
          { label: 'START Feltétel (TWSTA + TWINT)', value: 'START' },
          { label: 'STOP Feltétel (TWSTO + TWINT)', value: 'STOP' },
          { label: 'Repeated START (Újraindítás)', value: 'REP_START' },
        ],
        defaultValue: 'START',
      },
    ],
    defaultParams: { condition: 'START' },
    calculateCycles: (params) => params.condition === 'STOP' ? 4 : 12,
    generateAsm: (params, labelSuffix = '1') => {
      const cond = params.condition || 'START';
      const lbl = `i2c_wait_${labelSuffix}`;
      if (cond === 'STOP') {
        return [
          `; I2C STOP feltétel kiküldése`,
          `ldi r16, (1<<7)|(1<<4)|(1<<2) ; TWINT | TWSTO | TWEN`,
          `sts 0xBC, r16                  ; TWCR = STOP [2 ciklus]`,
        ];
      }
      return [
        `; I2C START feltétel küldése és várakozás TWINT flag-re`,
        `ldi r16, (1<<7)|(1<<5)|(1<<2) ; TWINT | TWSTA | TWEN`,
        `sts 0xBC, r16                  ; TWCR = START`,
        `${lbl}:`,
        `lds r16, 0xBC                  ; TWCR beolvasása`,
        `sbrs r16, 7                    ; TWINT flag (bit 7) aktív?`,
        `rjmp ${lbl}                    ; Ha nem, várakozás`,
      ];
    },
    generateC: (params) => {
      const cond = params.condition || 'START';
      if (cond === 'STOP') {
        return [
          `// I2C STOP feltétel:`,
          `TWCR = (1 << TWINT) | (1 << TWEN) | (1 << TWSTO);`,
          `// Wire megfelelő: Wire.endTransmission(true);`,
        ];
      }
      return [
        `// I2C START feltétel & várakozás:`,
        `TWCR = (1 << TWINT) | (1 << TWSTA) | (1 << TWEN);`,
        `while (!(TWCR & (1 << TWINT)));`,
      ];
    },
    generateInlineAsm: (params, labelSuffix = '1') => {
      const cond = params.condition || 'START';
      if (cond === 'STOP') {
        return [
          `__asm__ __volatile__ (`,
          `  "ldi r16, (1<<7)|(1<<4)|(1<<2)\\n\\t"`,
          `  "sts 0xBC, r16\\n\\t"`,
          `  ::: "r16"`,
          `);`,
        ];
      }
      return [
        `__asm__ __volatile__ (`,
        `  "ldi r16, (1<<7)|(1<<5)|(1<<2)\\n\\t"`,
        `  "sts 0xBC, r16\\n\\t"`,
        `  "1: lds r16, 0xBC\\n\\t"`,
        `  "sbrs r16, 7\\n\\t"`,
        `  "rjmp 1b\\n\\t"`,
        `  ::: "r16"`,
        `);`,
      ];
    },
    explanationHu: (params) => {
      return `A START feltétel lehúzza az SDA vonalat miközben az SCL magas, lefoglalva a buszt az ATmega328P Master számára. A TWINT hardveres jelzőbit 0-ról 1-re vált, amint a fizikai állapot sikeresen megjelent a vonalon.`;
    },
  },

  protocol_i2c_write_byte: {
    type: 'protocol_i2c_write_byte',
    category: 'protocol',
    name: 'I2C Bájt Küldés & ACK (TWDR)',
    shortDesc: '7-bites I2C eszközcím vagy adatbájt kiküldése a TWDR regiszterbe',
    icon: 'UploadCloud',
    color: 'purple',
    accentColor: '#7e22ce',
    params: [
      {
        key: 'hexValue',
        label: 'Küldendő Bájt (HEX pl. 0x3C / 0x48 / 0x50)',
        type: 'text',
        defaultValue: '0x3C',
      },
      {
        key: 'isAddress',
        label: 'Típus',
        type: 'select',
        options: [
          { label: 'Eszköz Cím (SLA+W / Írás)', value: 'ADDR_W' },
          { label: 'Eszköz Cím (SLA+R / Olvasás)', value: 'ADDR_R' },
          { label: 'Adatbájt (Register / Data)', value: 'DATA' },
        ],
        defaultValue: 'ADDR_W',
      },
    ],
    defaultParams: { hexValue: '0x3C', isAddress: 'ADDR_W' },
    calculateCycles: () => 14,
    generateAsm: (params, labelSuffix = '1') => {
      const hex = params.hexValue || '0x3C';
      const lbl = `i2c_tx_wait_${labelSuffix}`;
      return [
        `; I2C Bájt küldése: ${hex} (${params.isAddress})`,
        `ldi r16, ${hex}          ; Adat/cím betöltése`,
        `sts 0xBB, r16          ; TWDR (0xBB / Data Register) feltöltése`,
        `ldi r16, (1<<7)|(1<<2) ; TWINT | TWEN (Átvitel indítása)`,
        `sts 0xBC, r16          ; TWCR indítás`,
        `${lbl}:`,
        `lds r16, 0xBC          ; TWCR olvasása`,
        `sbrs r16, 7            ; TWINT kész?`,
        `rjmp ${lbl}`,
      ];
    },
    generateC: (params) => {
      const hex = params.hexValue || '0x3C';
      return [
        `// I2C Adatbájt küldése TWDR-en keresztül:`,
        `TWDR = ${hex};`,
        `TWCR = (1 << TWINT) | (1 << TWEN);`,
        `while (!(TWCR & (1 << TWINT))); // Várakozás ACK-ra és átvitelre`,
        `// Arduino Wire: Wire.write(${hex});`,
      ];
    },
    generateInlineAsm: (params, labelSuffix = '1') => {
      const hex = params.hexValue || '0x3C';
      return [
        `__asm__ __volatile__ (`,
        `  "ldi r16, ${hex}\\n\\t"`,
        `  "sts 0xBB, r16\\n\\t" // TWDR`,
        `  "ldi r16, (1<<7)|(1<<2)\\n\\t"`,
        `  "sts 0xBC, r16\\n\\t" // TWCR`,
        `  "1: lds r16, 0xBC\\n\\t"`,
        `  "sbrs r16, 7\\n\\t"`,
        `  "rjmp 1b\\n\\t"`,
        `  ::: "r16"`,
        `);`,
      ];
    },
    explanationHu: (params) => {
      return `A TWDR (TWI Data Register) 8 bites shift regiszter MSB-first módon továbbítja a bitmintát, majd a 9. órajelciklusban automatikusan beolvassa a slave által küldött ACK (alacsony szint) vagy NACK bitet.`;
    },
  },

  // ==========================================
  // 8. SPI PROTOKOLL (MASTER MÓD @ 4 MHz)
  // ==========================================
  protocol_spi_init: {
    type: 'protocol_spi_init',
    category: 'protocol',
    name: 'SPI Master Hardver Inicializálás',
    shortDesc: 'DDRB (D10 SS, D11 MOSI, D13 SCK) és SPCR regiszter beállítása',
    icon: 'Cpu',
    color: 'purple',
    accentColor: '#6b21a8',
    params: [
      {
        key: 'clockDiv',
        label: 'SPI Órajel Sebesség',
        type: 'select',
        options: [
          { label: '4.00 MHz (f_osc / 4 - Gyors SPI)', value: 'DIV_4' },
          { label: '1.00 MHz (f_osc / 16 - Közepes)', value: 'DIV_16' },
          { label: '250 kHz (f_osc / 64 - Lassú)', value: 'DIV_64' },
        ],
        defaultValue: 'DIV_4',
      },
    ],
    defaultParams: { clockDiv: 'DIV_4' },
    calculateCycles: () => 5,
    generateAsm: (params) => {
      const divVal = params.clockDiv === 'DIV_16' ? '(1<<0)' : params.clockDiv === 'DIV_64' ? '(1<<1)' : '0';
      return [
        `; --- SPI Master Inicializálás (D10=SS, D11=MOSI, D13=SCK -> OUTPUT) ---`,
        `ldi r16, (1<<5)|(1<<3)|(1<<2) ; PB5(SCK), PB3(MOSI), PB2(SS) = OUTPUT`,
        `in r17, 0x04                  ; DDRB olvasás`,
        `or r17, r16`,
        `out 0x04, r17                 ; DDRB frissítése`,
        `; SPCR: SPE (Engedélyezés), MSTR (Master Mód), SPR0/SPR1 (Órajel: ${params.clockDiv})`,
        `ldi r16, (1<<6)|(1<<4)|${divVal} ; SPE | MSTR | Clock`,
        `out 0x2C, r16                 ; OUT SPCR (0x2C)`,
      ];
    },
    generateC: (params) => {
      return [
        `// C kód (Közvetlen regiszter):`,
        `DDRB |= (1 << DDB5) | (1 << DDB3) | (1 << DDB2); // SCK, MOSI, SS OUTPUT`,
        `SPCR = (1 << SPE) | (1 << MSTR); // Master mód, 4MHz`,
        `// Arduino SPI könyvtár:`,
        `SPI.begin();`,
        `SPI.beginTransaction(SPISettings(4000000, MSBFIRST, SPI_MODE0));`,
      ];
    },
    generateInlineAsm: (params) => {
      return [
        `__asm__ __volatile__ (`,
        `  "sbi 0x04, 5\\n\\t" // DDRB.5 SCK Output`,
        `  "sbi 0x04, 3\\n\\t" // DDRB.3 MOSI Output`,
        `  "sbi 0x04, 2\\n\\t" // DDRB.2 SS Output`,
        `  "ldi r16, (1<<6)|(1<<4)\\n\\t"`,
        `  "out 0x2C, r16\\n\\t" // SPCR: SPE | MSTR`,
        `  ::: "r16"`,
        `);`,
      ];
    },
    explanationHu: (params) => {
      return `Az ATmega328P hardveres SPI perifériája akár 8 MHz-es sebességgel képes egyidejű kétirányú (Full-Duplex) adatátvitelre. A Master mód aktiválásához a PB2 (SS/D10) lábat kötelező kimenetként konfigurálni.`;
    },
  },

  protocol_spi_slave_select: {
    type: 'protocol_spi_slave_select',
    category: 'protocol',
    name: 'SPI Slave Select (SS) Láb Vezérlés',
    shortDesc: 'Kijelölt eszköz aktiválása (LOW) vagy elengedése (HIGH) a D10 lábon',
    icon: 'Radio',
    color: 'purple',
    accentColor: '#9333ea',
    params: [
      {
        key: 'pin',
        label: 'SS Láb',
        type: 'pin',
        defaultValue: '10',
      },
      {
        key: 'state',
        label: 'Állapot',
        type: 'select',
        options: [
          { label: 'LOW (Kiválasztás / Chip Select Aktív)', value: 'LOW' },
          { label: 'HIGH (Elengedés / Inaktív)', value: 'HIGH' },
        ],
        defaultValue: 'LOW',
      },
    ],
    defaultParams: { pin: '10', state: 'LOW' },
    calculateCycles: () => 2,
    generateAsm: (params) => {
      const pin = (params.pin || '10') as ArduinoPin;
      const mapping = PIN_MAPPINGS[pin] || PIN_MAPPINGS['10'];
      const isLow = params.state === 'LOW';
      const instr = isLow ? 'cbi' : 'sbi';
      return [
        `; SPI Slave Select (D${pin}) -> ${params.state}`,
        `${instr} ${mapping.portAddr}, ${mapping.bit}   ; ${mapping.port}.${mapping.bit} = ${isLow ? '0 (Kiválasztva)' : '1 (Inaktív)'} [2 ciklus]`,
      ];
    },
    generateC: (params) => {
      const pin = (params.pin || '10') as ArduinoPin;
      return [
        `digitalWrite(${pin}, ${params.state}); // SPI SS Chip Select`,
      ];
    },
    generateInlineAsm: (params) => {
      const pin = (params.pin || '10') as ArduinoPin;
      const mapping = PIN_MAPPINGS[pin] || PIN_MAPPINGS['10'];
      const instr = params.state === 'LOW' ? 'cbi' : 'sbi';
      return [`__asm__ __volatile__ ("${instr} ${mapping.portAddr}, ${mapping.bit}\\n\\t");`];
    },
    explanationHu: (params) => {
      return `Az SPI perifériák (SD kártyák, kijelzők, DAC/ADC IC-k) a Slave Select (SS) vonal alacsony szintre (0V) húzásával aktiválódnak, és a vonal 5V-ra visszaállításával zárják le az adatcsomagot.`;
    },
  },

  protocol_spi_transfer: {
    type: 'protocol_spi_transfer',
    category: 'protocol',
    name: 'SPI Bájttovábbítás & Vétel (SPDR)',
    shortDesc: 'Egyidejű 8-bites adatküldés (MOSI) és vétel (MISO) SPDR regiszteren át',
    icon: 'Zap',
    color: 'purple',
    accentColor: '#7c3aed',
    params: [
      {
        key: 'dataHex',
        label: 'Küldendő Bájt (HEX pl. 0xAA / 0x55 / 0xFF)',
        type: 'text',
        defaultValue: '0xAA',
      },
      {
        key: 'destReg',
        label: 'Fogadó Regiszter (MISO adat)',
        type: 'register',
        defaultValue: 'r16',
      },
    ],
    defaultParams: { dataHex: '0xAA', destReg: 'r16' },
    calculateCycles: () => 18, // 16 SPI clock cycles + write/read
    generateAsm: (params, labelSuffix = '1') => {
      const hex = params.dataHex || '0xAA';
      const dest = params.destReg || 'r16';
      const lbl = `spi_tx_wait_${labelSuffix}`;
      return [
        `; SPI Bájttovábbítás (TX: ${hex} -> RX mentés ide: ${dest})`,
        `ldi r16, ${hex}          ; Adatbájt betöltése`,
        `out 0x2E, r16          ; OUT SPDR (0x2E) -> Hardveres SPI adás indítása`,
        `${lbl}:`,
        `in r16, 0x2D           ; IN SPSR (0x2D - SPI Status Register)`,
        `sbrs r16, 7            ; SPIF (bit 7) flag ellenőrzése (Adás/Vétel kész?)`,
        `rjmp ${lbl}            ; Várakozás a 8 bit lefutására`,
        `in ${dest}, 0x2E       ; IN SPDR -> Beérkezett válaszbájt mentése [1 ciklus]`,
      ];
    },
    generateC: (params) => {
      const hex = params.dataHex || '0xAA';
      return [
        `// SPI Adás és Vétel SPDR regiszteren:`,
        `SPDR = ${hex};`,
        `while (!(SPSR & (1 << SPIF))); // Várakozás a hardveres átvitelre (~1-2 µs)`,
        `uint8_t rxData = SPDR;         // Beolvasott MISO bájt`,
        `// Arduino SPI megfelelő: rxData = SPI.transfer(${hex});`,
      ];
    },
    generateInlineAsm: (params, labelSuffix = '1') => {
      const hex = params.dataHex || '0xAA';
      const dest = params.destReg || 'r16';
      return [
        `__asm__ __volatile__ (`,
        `  "ldi r16, ${hex}\\n\\t"`,
        `  "out 0x2E, r16\\n\\t" // SPDR`,
        `  "1: in r16, 0x2D\\n\\t" // SPSR`,
        `  "sbrs r16, 7\\n\\t"`,
        `  "rjmp 1b\\n\\t"`,
        `  "in ${dest}, 0x2E\\n\\t" // SPDR -> dest`,
        `  ::: "r16", "${dest}"`,
        `);`,
      ];
    },
    explanationHu: (params) => {
      return `Az SPDR (SPI Data Register) írása azonnal elindítja a hardveres órajelet és a bitfolyamot a MOSI lábon, miközben a MISO lábon érkező bitek egyidejűleg töltik fel a belső shift regisztert. 4 MHz-es órajelnél mindössze 18 óraciklus (1.125 µs) egy teljes 8-bites csomag!`;
    },
  },

  // ==========================================
  // 8. UART & SOROS PROTOKOLLOK
  // ==========================================
  protocol_uart_init: {
    type: 'protocol_uart_init',
    category: 'protocol',
    name: 'UART Soros Port Init (USART0)',
    shortDesc: 'Hardveres soros port és Baud ráta beállítása (9600 - 115200 Baud, 8N1 aszinkron)',
    icon: 'Terminal',
    color: 'purple',
    accentColor: '#9333ea',
    params: [
      {
        key: 'baudRate',
        label: 'Baud Ráta (Sebesség)',
        type: 'select',
        options: [
          { label: '9600 Baud (UBRR=103 @ 16MHz)', value: '9600' },
          { label: '19200 Baud (UBRR=51)', value: '19200' },
          { label: '38400 Baud (UBRR=25)', value: '38400' },
          { label: '57600 Baud (UBRR=16)', value: '57600' },
          { label: '115200 Baud (UBRR=8 - Nagysebességű)', value: '115200' },
        ],
        defaultValue: '9600',
      },
      {
        key: 'enableRx',
        label: 'Vétel (RX) Engedélyezése',
        type: 'select',
        options: [
          { label: 'Adás & Vétel (TX + RX)', value: 'BOTH' },
          { label: 'Csak Adás (Csak TX)', value: 'TX_ONLY' },
        ],
        defaultValue: 'BOTH',
      },
    ],
    defaultParams: { baudRate: '9600', enableRx: 'BOTH' },
    calculateCycles: () => 6,
    generateAsm: (params) => {
      const baud = parseInt(params.baudRate || '9600', 10);
      const ubrr = Math.round(16000000 / (16 * baud)) - 1;
      const ubrrH = (ubrr >> 8) & 0xFF;
      const ubrrL = ubrr & 0xFF;
      const rxEn = params.enableRx !== 'TX_ONLY';
      const ucsr0bVal = rxEn ? '(1<<4)|(1<<3)' : '(1<<3)';
      return [
        `; --- USART0 (UART Soros Port) Inicializálás: ${baud} Baud, 8N1 ---`,
        `ldi r16, ${ubrrH}           ; UBRR0H (Felső 4 bit)`,
        `sts 0xC5, r16          ; STS UBRR0H (0xC5)`,
        `ldi r16, ${ubrrL}          ; UBRR0L (Alsó 8 bit = ${ubrrL})`,
        `sts 0xC4, r16          ; STS UBRR0L (0xC4)`,
        `; Adás (TXEN0)${rxEn ? ' és Vétel (RXEN0)' : ''} engedélyezése:`,
        `ldi r16, ${ucsr0bVal}   ; UCSR0B: TXEN0${rxEn ? ' | RXEN0' : ''}`,
        `sts 0xC1, r16          ; STS UCSR0B (0xC1)`,
        `; Keretformátum: 8 adatbit, 1 stopbit, nincs paritás (8N1):`,
        `ldi r16, (1<<2)|(1<<1) ; UCSR0C: UCSZ01 | UCSZ00 (8-bit)`,
        `sts 0xC2, r16          ; STS UCSR0C (0xC2)`,
      ];
    },
    generateC: (params) => {
      const baud = params.baudRate || '9600';
      const ubrr = Math.round(16000000 / (16 * parseInt(baud, 10))) - 1;
      return [
        `// C kód (Közvetlen USART0 regiszterek):`,
        `UBRR0H = (unsigned char)(${ubrr} >> 8);`,
        `UBRR0L = (unsigned char)${ubrr};`,
        `UCSR0B = (1 << RXEN0) | (1 << TXEN0); // RX és TX engedélyezése`,
        `UCSR0C = (1 << UCSZ01) | (1 << UCSZ00); // 8-bites keretformátum`,
        `// Arduino Standard C megfelelő:`,
        `Serial.begin(${baud});`,
      ];
    },
    generateInlineAsm: (params) => {
      const baud = parseInt(params.baudRate || '9600', 10);
      const ubrr = Math.round(16000000 / (16 * baud)) - 1;
      return [
        `__asm__ __volatile__ (`,
        `  "ldi r16, ${ubrr}\\n\\t"`,
        `  "sts 0xC4, r16\\n\\t" // UBRR0L`,
        `  "ldi r16, 0x18\\n\\t" // RXEN0 | TXEN0`,
        `  "sts 0xC1, r16\\n\\t" // UCSR0B`,
        `  "ldi r16, 0x06\\n\\t" // UCSZ01 | UCSZ00 (8N1)`,
        `  "sts 0xC2, r16\\n\\t" // UCSR0C`,
        `  ::: "r16"`,
        `);`,
      ];
    },
    explanationHu: (params) => {
      const baud = params.baudRate || '9600';
      return `A hardveres USART0 inicializálása betölti az UBRR0 regiszterbe a számított órajel-osztót (${baud} Baud esetén UBRR=103), majd a UCSR0B és UCSR0C regiszterekkel azonnal bekapcsolja az aszinkron adó/vevő áramkört a D0 (RX) és D1 (TX) lábakon.`;
    },
  },

  protocol_uart_print_str: {
    type: 'protocol_uart_print_str',
    category: 'protocol',
    name: 'UART Szöveg Küldése (Serial Print)',
    shortDesc: 'Szöveges üzenet továbbítása a soros terminál felé',
    icon: 'Terminal',
    color: 'purple',
    accentColor: '#a855f7',
    params: [
      {
        key: 'text',
        label: 'Küldendő Szöveg',
        type: 'text',
        defaultValue: 'ARDUINO AVR OK!',
        description: 'A soros terminálon megjelenő üzenet',
      },
      {
        key: 'addNewline',
        label: 'Új Sor Hozzáadása (\\r\\n - Serial.println)',
        type: 'select',
        options: [
          { label: 'Igen (Új sor karakterek: \\r\\n)', value: 'true' },
          { label: 'Nem (Csak a nyers szöveg)', value: 'false' },
        ],
        defaultValue: 'true',
      },
    ],
    defaultParams: { text: 'ARDUINO AVR OK!', addNewline: 'true' },
    calculateCycles: (params) => {
      const len = (params.text || '').length + (params.addNewline === 'true' ? 2 : 0);
      return Math.max(12, len * 7);
    },
    generateAsm: (params, labelSuffix = '1') => {
      const text = params.text || 'HELLO';
      const lblWait = `uart_tx_wait_${labelSuffix}`;
      return [
        `; --- UART Szöveg Küldése: "${text}" ---`,
        `; Polling UDRE0 (USART Data Register Empty) és UDR0 írás:`,
        `${lblWait}:`,
        `lds r16, 0xC0           ; LDS r16, UCSR0A (0xC0)`,
        `sbrs r16, 5             ; UDRE0 (bit 5) ellenőrzése: Üres az adó puffer?`,
        `rjmp ${lblWait}         ; Várakozás míg az adó puffer felszabadul`,
        `; Karakterek küldése sorban:`,
        `ldi r16, '${text.charAt(0) || 'A'}'        ; Első karakter kódja`,
        `sts 0xC6, r16           ; STS UDR0 (0xC6) -> Hardveres UART TX indítás`,
      ];
    },
    generateC: (params) => {
      const text = params.text || 'HELLO';
      const hasNl = params.addNewline === 'true';
      return [
        `// C kód (Arduino Serial API):`,
        hasNl ? `Serial.println("${text}");` : `Serial.print("${text}");`,
        `// Közvetlen AVR C regiszter megfelelő:`,
        `while (!(UCSR0A & (1 << UDRE0))); // Várakozás az adópufferre`,
        `UDR0 = '${text.charAt(0) || 'A'}'; // Karakter kiírása`,
      ];
    },
    generateInlineAsm: (params, labelSuffix = '1') => {
      const char = (params.text || 'A').charCodeAt(0);
      return [
        `__asm__ __volatile__ (`,
        `  "1: lds r16, 0xC0\\n\\t" // UCSR0A`,
        `  "sbrs r16, 5\\n\\t"     // UDRE0`,
        `  "rjmp 1b\\n\\t"`,
        `  "ldi r16, ${char}\\n\\t"`,
        `  "sts 0xC6, r16\\n\\t" // UDR0`,
        `  ::: "r16"`,
        `);`,
      ];
    },
    explanationHu: (params) => {
      return `Az ATmega328P hardveres adója az UDR0 regiszterbe másolt bájtot automatikusan framing keretbe (Start bit + 8 adatbit + Stop bit) csomagolja, és a kiválasztott Baud sebességgel kiküldi a D1 (TX) vonalon a soros terminál felé.`;
    },
  },

  protocol_uart_write_char: {
    type: 'protocol_uart_write_char',
    category: 'protocol',
    name: 'UART Karakter Küldése (UDR0)',
    shortDesc: 'Egyetlen ASCII karakter vagy regiszter értékének küldése a soros vonalon',
    icon: 'Terminal',
    color: 'purple',
    accentColor: '#9333ea',
    params: [
      {
        key: 'charSource',
        label: 'Adat Forrása',
        type: 'select',
        options: [
          { label: 'Fix ASCII Karakter', value: 'CHAR' },
          { label: 'Regiszter Értéke (pl. r24 ADC/Számláló érték)', value: 'REGISTER' },
        ],
        defaultValue: 'CHAR',
      },
      {
        key: 'asciiChar',
        label: 'ASCII Karakter',
        type: 'text',
        defaultValue: 'A',
      },
      {
        key: 'sourceReg',
        label: 'Forrás Regiszter',
        type: 'register',
        defaultValue: 'r24',
      },
    ],
    defaultParams: { charSource: 'CHAR', asciiChar: 'A', sourceReg: 'r24' },
    calculateCycles: () => 7,
    generateAsm: (params, labelSuffix = '1') => {
      const isChar = params.charSource === 'CHAR';
      const char = params.asciiChar || 'A';
      const reg = params.sourceReg || 'r24';
      const lbl = `uart_char_wait_${labelSuffix}`;
      return [
        `; --- UART Karakter Kiírás (${isChar ? `'${char}'` : reg}) ---`,
        `${lbl}:`,
        `lds r16, 0xC0           ; LDS r16, UCSR0A`,
        `sbrs r16, 5             ; UDRE0 (bit 5) ellenőrzése`,
        `rjmp ${lbl}             ; Várakozás az adópufferre`,
        isChar ? `ldi r16, '${char}'          ; Karakter kód betöltése` : `mov r16, ${reg}           ; Regiszter érték másolása`,
        `sts 0xC6, r16           ; STS UDR0 (0xC6) -> Hardveres UART TX indítása`,
      ];
    },
    generateC: (params) => {
      const isChar = params.charSource === 'CHAR';
      const char = params.asciiChar || 'A';
      const reg = params.sourceReg || 'r24';
      return [
        `// C kód (UDR0 regiszter írás):`,
        `while (!(UCSR0A & (1 << UDRE0))); // Puffer ellenőrzés`,
        isChar ? `UDR0 = '${char}';` : `UDR0 = ${reg};`,
        `// Arduino Standard C: ${isChar ? `Serial.write('${char}');` : `Serial.write(${reg});`}`,
      ];
    },
    generateInlineAsm: (params, labelSuffix = '1') => {
      const isChar = params.charSource === 'CHAR';
      const code = isChar ? `'${params.asciiChar || 'A'}'` : '0x30';
      return [
        `__asm__ __volatile__ (`,
        `  "1: lds r16, 0xC0\\n\\t"`,
        `  "sbrs r16, 5\\n\\t"`,
        `  "rjmp 1b\\n\\t"`,
        `  "ldi r16, ${code}\\n\\t"`,
        `  "sts 0xC6, r16\\n\\t"`,
        `  ::: "r16"`,
        `);`,
      ];
    },
    explanationHu: (params) => {
      return `Az 'sbrs r16, 5' (Skip if Bit in Register is Set) utasítással ellenőrizzük az UCSR0A UDRE0 bitjét. Amint 1-be vált (az adó puffer üres), a bájtot beírjuk az UDR0-ba, amivel az átvitel azonnal lefut.`;
    },
  },

  protocol_uart_read_byte: {
    type: 'protocol_uart_read_byte',
    category: 'protocol',
    name: 'UART Karakter Fogadása (RXC0 & UDR0)',
    shortDesc: 'Beérkező bájt olvasása a soros terminálról a kiválasztott regiszterbe',
    icon: 'Terminal',
    color: 'purple',
    accentColor: '#7e22ce',
    params: [
      {
        key: 'destReg',
        label: 'Célregiszter (Beérkezett adat)',
        type: 'register',
        defaultValue: 'r24',
      },
      {
        key: 'mode',
        label: 'Várakozási Mód',
        type: 'select',
        options: [
          { label: 'Blokkoló várakozás (RXC0 flag megvárása)', value: 'BLOCKING' },
          { label: 'Nem blokkoló ellenőrzés (Ha nincs adat, átlép)', value: 'NON_BLOCKING' },
        ],
        defaultValue: 'NON_BLOCKING',
      },
    ],
    defaultParams: { destReg: 'r24', mode: 'NON_BLOCKING' },
    calculateCycles: () => 6,
    generateAsm: (params, labelSuffix = '1') => {
      const dest = params.destReg || 'r24';
      const isBlocking = params.mode === 'BLOCKING';
      const lblWait = `uart_rx_wait_${labelSuffix}`;
      const lblEnd = `uart_rx_end_${labelSuffix}`;
      return [
        `; --- UART Karakter Beolvasása (RX) ---`,
        `lds r16, 0xC0           ; LDS r16, UCSR0A`,
        `sbrs r16, 7             ; RXC0 (bit 7 - USART Receive Complete) vizsgálata`,
        isBlocking ? `rjmp ${lblWait}         ; Blokkoló várakozás új karakterre` : `rjmp ${lblEnd}          ; Nincs adat, folytatás [nem blokkoló]`,
        `lds ${dest}, 0xC6      ; LDS ${dest}, UDR0 -> Beérkezett bájt mentése ide: ${dest}`,
        `${lblEnd}:`,
      ];
    },
    generateC: (params) => {
      const dest = params.destReg || 'r24';
      return [
        `// C kód (Közvetlen USART0 fogadás):`,
        `if (UCSR0A & (1 << RXC0)) {`,
        `  uint8_t ${dest} = UDR0; // Beolvasás a hardveres pufferből`,
        `}`,
        `// Arduino Standard C: if (Serial.available()) { char c = Serial.read(); }`,
      ];
    },
    generateInlineAsm: (params, labelSuffix = '1') => {
      const dest = params.destReg || 'r24';
      return [
        `__asm__ __volatile__ (`,
        `  "lds r16, 0xC0\\n\\t" // UCSR0A`,
        `  "sbrs r16, 7\\n\\t"   // RXC0`,
        `  "rjmp 1f\\n\\t"`,
        `  "lds ${dest}, 0xC6\\n\\t" // UDR0 -> dest`,
        `  "1:\\n\\t"`,
        `  ::: "r16", "${dest}"`,
        `);`,
      ];
    },
    explanationHu: (params) => {
      return `Amikor a számítógép felől érkezik egy karakter a D0 (RX) lábra, az ATmega328P hardveresen beállítja az UCSR0A regiszter 7. bitjét (RXC0). Az UDR0 regiszter beolvasása automatikusan törli ezt a jelzőbitet.`;
    },
  },

  // ==========================================
  // 9. ANALÓG & ADC / PWM VEZÉRLÉS
  // ==========================================
  analog_adc_init: {
    type: 'analog_adc_init',
    category: 'analog',
    name: 'ADC Inicializálás (ADMUX & ADCSRA)',
    shortDesc: '10-bites Analóg-Digitális Átalakító bekapcsolása 125 kHz órajellel',
    icon: 'Sliders',
    color: 'amber',
    accentColor: '#d97706',
    params: [
      {
        key: 'refVoltage',
        label: 'Referencia Feszültség',
        type: 'select',
        options: [
          { label: 'AVCC (5.0V Tápfeszültség referencia)', value: 'AVCC' },
          { label: 'Belső 1.1V Referencia (Nagy pontosság)', value: 'INTERNAL_1V1' },
        ],
        defaultValue: 'AVCC',
      },
      {
        key: 'prescaler',
        label: 'ADC Előosztó (Mintavételi Órajel)',
        type: 'select',
        options: [
          { label: '128-as előosztó (125 kHz ADC órajel @ 16MHz - Max pontosság)', value: '128' },
          { label: '64-es előosztó (250 kHz ADC órajel - Gyorsabb)', value: '64' },
        ],
        defaultValue: '128',
      },
    ],
    defaultParams: { refVoltage: 'AVCC', prescaler: '128' },
    calculateCycles: () => 4,
    generateAsm: (params) => {
      const is1V1 = params.refVoltage === 'INTERNAL_1V1';
      const admuxVal = is1V1 ? '(1<<7)|(1<<6)' : '(1<<6)'; // REFS1:0
      const adcsraVal = params.prescaler === '64' ? '(1<<7)|(1<<2)|(1<<1)' : '(1<<7)|(1<<2)|(1<<1)|(1<<0)'; // ADEN + Prescaler
      return [
        `; --- ADC (Analóg-Digitális Átalakító) Inicializálás ---`,
        `ldi r16, ${admuxVal}           ; ADMUX: ${params.refVoltage} referencia`,
        `sts 0x7C, r16                  ; STS ADMUX (0x7C)`,
        `ldi r16, ${adcsraVal}          ; ADCSRA: ADEN (Engedélyezés) + Előosztó /${params.prescaler}`,
        `sts 0x7A, r16                  ; STS ADCSRA (0x7A)`,
      ];
    },
    generateC: (params) => {
      const is1V1 = params.refVoltage === 'INTERNAL_1V1';
      return [
        `// C kód (Közvetlen ADC regiszter):`,
        `ADMUX = ${is1V1 ? '(1 << REFS1) | (1 << REFS0)' : '(1 << REFS0)'}; // ${params.refVoltage}`,
        `ADCSRA = (1 << ADEN) | (1 << ADPS2) | (1 << ADPS1) | (1 << ADPS0); // /128 előosztó`,
      ];
    },
    generateInlineAsm: (params) => {
      const is1V1 = params.refVoltage === 'INTERNAL_1V1';
      const admuxVal = is1V1 ? '0xC0' : '0x40';
      return [
        `__asm__ __volatile__ (`,
        `  "ldi r16, ${admuxVal}\\n\\t"`,
        `  "sts 0x7C, r16\\n\\t" // ADMUX`,
        `  "ldi r16, 0x87\\n\\t" // ADCSRA: ADEN + /128`,
        `  "sts 0x7A, r16\\n\\t"`,
        `  ::: "r16"`,
        `);`,
      ];
    },
    explanationHu: (params) => {
      return `Az ATmega328P beépített 10 bites Successive Approximation ADC-je 50 kHz és 200 kHz közötti órajelen nyújtja a maximális pontosságot. 16 MHz-es CPU órajel mellett a 128-as előosztó pontosan 125 kHz-et állít elő.`;
    },
  },

  analog_adc_read: {
    type: 'analog_adc_read',
    category: 'analog',
    name: 'Analóg Mérés (ADC0 - ADC5 / A0 - A5)',
    shortDesc: 'Analóg feszültség mérése ADSC indítással és beolvasása r24:r25 regiszterpárba',
    icon: 'Activity',
    color: 'amber',
    accentColor: '#f59e0b',
    params: [
      {
        key: 'channel',
        label: 'Analóg Bemenet',
        type: 'select',
        options: [
          { label: 'A0 (ADC0 csatorna - PC0)', value: 'A0' },
          { label: 'A1 (ADC1 csatorna - PC1)', value: 'A1' },
          { label: 'A2 (ADC2 csatorna - PC2)', value: 'A2' },
          { label: 'A3 (ADC3 csatorna - PC3)', value: 'A3' },
          { label: 'A4 (ADC4 csatorna - PC4)', value: 'A4' },
          { label: 'A5 (ADC5 csatorna - PC5)', value: 'A5' },
        ],
        defaultValue: 'A0',
      },
      {
        key: 'destRegLow',
        label: 'Alsó 8-bit Célregiszter (ADCL)',
        type: 'register',
        defaultValue: 'r24',
      },
      {
        key: 'destRegHigh',
        label: 'Felső 2-bit Célregiszter (ADCH)',
        type: 'register',
        defaultValue: 'r25',
      },
    ],
    defaultParams: { channel: 'A0', destRegLow: 'r24', destRegHigh: 'r25' },
    calculateCycles: () => 208, // 13 ADC cycles * 16 CPU cycles = 208 cycles (~13 µs)
    generateAsm: (params, labelSuffix = '1') => {
      const ch = params.channel || 'A0';
      const chNum = parseInt(ch.replace('A', ''), 10) || 0;
      const lowReg = params.destRegLow || 'r24';
      const highReg = params.destRegHigh || 'r25';
      const lbl = `adc_wait_${labelSuffix}`;
      return [
        `; --- Analóg Mérés indítása a ${ch} csatornán ---`,
        `lds r16, 0x7C                  ; ADMUX beolvasása`,
        `andi r16, 0xF0                 ; MUX3:0 alsó 4 bit törlése`,
        `ori r16, ${chNum}                      ; Csatorna ${chNum} (${ch}) beállítása`,
        `sts 0x7C, r16                  ; ADMUX frissítése`,
        `; Konverzió indítása: ADCSRA |= (1 << ADSC)`,
        `lds r16, 0x7A                  ; ADCSRA beolvasása`,
        `ori r16, (1 << 6)              ; ADSC (Start Conversion) bit beállítása`,
        `sts 0x7A, r16                  ; Konverzió elindul`,
        `${lbl}:`,
        `lds r16, 0x7A                  ; ADCSRA olvasás`,
        `sbrc r16, 6                    ; ADSC bit még 1? (Ha 0, kész a mérés)`,
        `rjmp ${lbl}`,
        `; 10-bites eredmény kiolvasása (Kötelező sorrend: ADCL először, majd ADCH)`,
        `lds ${lowReg}, 0x78             ; LDS ${lowReg}, ADCL (0x78) [2 ciklus]`,
        `lds ${highReg}, 0x79            ; LDS ${highReg}, ADCH (0x79) [2 ciklus]`,
      ];
    },
    generateC: (params) => {
      const ch = params.channel || 'A0';
      const chNum = parseInt(ch.replace('A', ''), 10) || 0;
      return [
        `// C kód (Közvetlen hardveres mintavétel):`,
        `ADMUX = (ADMUX & 0xF0) | ${chNum}; // Csatorna: ${ch}`,
        `ADCSRA |= (1 << ADSC); // Konverzió indítása`,
        `while (ADCSRA & (1 << ADSC)); // Várakozás a mérésre (~13 µs)`,
        `uint16_t adcValue = ADCW; // 10-bites érték (0 - 1023)`,
        `// Arduino Standard C megfelelő:`,
        `int val = analogRead(${ch});`,
      ];
    },
    generateInlineAsm: (params, labelSuffix = '1') => {
      const chNum = parseInt((params.channel || 'A0').replace('A', ''), 10) || 0;
      const lowReg = params.destRegLow || 'r24';
      const highReg = params.destRegHigh || 'r25';
      return [
        `__asm__ __volatile__ (`,
        `  "lds r16, 0x7C\\n\\t"`,
        `  "andi r16, 0xF0\\n\\t"`,
        `  "ori r16, ${chNum}\\n\\t"`,
        `  "sts 0x7C, r16\\n\\t"`,
        `  "lds r16, 0x7A\\n\\t"`,
        `  "ori r16, (1<<6)\\n\\t"`,
        `  "sts 0x7A, r16\\n\\t"`,
        `  "1: lds r16, 0x7A\\n\\t"`,
        `  "sbrc r16, 6\\n\\t"`,
        `  "rjmp 1b\\n\\t"`,
        `  "lds ${lowReg}, 0x78\\n\\t"`,
        `  "lds ${highReg}, 0x79\\n\\t"`,
        `  ::: "r16", "${lowReg}", "${highReg}"`,
        `);`,
      ];
    },
    explanationHu: (params) => {
      return `A mikrokontroller hardveresen mintavételezi az analóg feszültséget (0V = 0, 5V = 1023). A hardveres regiszterolvasásnál szigorú szabály: az alsó ADCL regisztert kell először kiolvasni, ami zárolja az adatot, amíg a felső ADCH regisztert is be nem olvassuk.`;
    },
  },

  analog_pwm_init: {
    type: 'analog_pwm_init',
    category: 'analog',
    name: 'Hardveres PWM Időzítő Beállítás',
    shortDesc: 'Timer0 vagy Timer1 8-bites Fast PWM üzemmód konfigurálása D5/D6 vagy D9/D10 lábakra',
    icon: 'Sliders',
    color: 'amber',
    accentColor: '#b45309',
    params: [
      {
        key: 'timer',
        label: 'PWM Időzítő & Lábak',
        type: 'select',
        options: [
          { label: 'Timer0 Fast PWM (D6 / OC0A & D5 / OC0B)', value: 'TIMER0' },
          { label: 'Timer1 8-bit Fast PWM (D9 / OC1A & D10 / OC1B)', value: 'TIMER1' },
          { label: 'Timer2 Fast PWM (D11 / OC2A & D3 / OC2B)', value: 'TIMER2' },
        ],
        defaultValue: 'TIMER0',
      },
    ],
    defaultParams: { timer: 'TIMER0' },
    calculateCycles: () => 6,
    generateAsm: (params) => {
      const timer = params.timer || 'TIMER0';
      if (timer === 'TIMER0') {
        return [
          `; --- Timer0 8-bites Fast PWM beállítás (D6 láb kimenet) ---`,
          `sbi 0x0A, 6                 ; DDRD.6 (D6 láb) kimenetre állítása`,
          `ldi r16, (1<<7)|(1<<1)|(1<<0) ; TCCR0A: COM0A1 (Nem invertáló PWM) + WGM01 + WGM00 (Fast PWM)`,
          `out 0x24, r16                ; OUT TCCR0A (0x24)`,
          `ldi r16, (1<<1)|(1<<0)       ; TCCR0B: CS01 + CS00 (/64 előosztó -> ~976 Hz PWM frekvencia)`,
          `out 0x25, r16                ; OUT TCCR0B (0x25)`,
        ];
      }
      return [
        `; --- Timer1 8-bites Fast PWM beállítás (D9 láb kimenet) ---`,
        `sbi 0x04, 1                 ; DDRB.1 (D9 láb) kimenetre állítása`,
        `ldi r16, (1<<7)|(1<<0)       ; TCCR1A: COM1A1 | WGM10`,
        `sts 0x80, r16                ; STS TCCR1A`,
        `ldi r16, (1<<3)|(1<<1)|(1<<0) ; TCCR1B: WGM12 | CS11 | CS10 (/64)`,
        `sts 0x81, r16                ; STS TCCR1B`,
      ];
    },
    generateC: (params) => {
      return [
        `// C kód (Timer0 Fast PWM inicializálás):`,
        `pinMode(6, OUTPUT);`,
        `TCCR0A = (1 << COM0A1) | (1 << WGM01) | (1 << WGM00); // Fast PWM`,
        `TCCR0B = (1 << CS01) | (1 << CS00); // 64-es előosztó (976 Hz)`,
      ];
    },
    generateInlineAsm: (params) => {
      return [
        `__asm__ __volatile__ (`,
        `  "sbi 0x0A, 6\\n\\t"`,
        `  "ldi r16, 0x83\\n\\t"`,
        `  "out 0x24, r16\\n\\t"`,
        `  "ldi r16, 0x03\\n\\t"`,
        `  "out 0x25, r16\\n\\t"`,
        `  ::: "r16"`,
        `);`,
      ];
    },
    explanationHu: (params) => {
      return `A mikrokontroller hardveres időzítője teljesen a háttérben, CPU terhelés nélkül állítja elő a négyszögjelet a megadott kitöltési tényezővel. 16 MHz / 64 / 256 = 976.56 Hz-es tiszta PWM jel.`;
    },
  },

  analog_pwm_write: {
    type: 'analog_pwm_write',
    category: 'analog',
    name: 'PWM Kitöltési Tényező Írás (OCRnx)',
    shortDesc: 'Hardveres kimeneti komparátor regiszter (OCR0A / OCR1A) közvetlen frissítése (0-255)',
    icon: 'Zap',
    color: 'amber',
    accentColor: '#d97706',
    params: [
      {
        key: 'pin',
        label: 'PWM Láb',
        type: 'select',
        options: [
          { label: 'D6 (OCR0A - Timer0)', value: '6' },
          { label: 'D5 (OCR0B - Timer0)', value: '5' },
          { label: 'D9 (OCR1A - Timer1)', value: '9' },
          { label: 'D10 (OCR1B - Timer1)', value: '10' },
          { label: 'D11 (OCR2A - Timer2)', value: '11' },
          { label: 'D3 (OCR2B - Timer2)', value: '3' },
        ],
        defaultValue: '6',
      },
      {
        key: 'duty',
        label: 'Kitöltési Tényező (0 - 255)',
        type: 'number',
        defaultValue: 128,
        description: '0 = 0% (Kikapcsolva), 128 = 50% (Fél fényerő), 255 = 100% (Teljes 5V)',
      },
    ],
    defaultParams: { pin: '6', duty: 128 },
    calculateCycles: () => 2,
    generateAsm: (params) => {
      const pin = params.pin || '6';
      const duty = Math.min(255, Math.max(0, Number(params.duty) || 0));
      const regAddr = pin === '6' ? '0x27' : pin === '5' ? '0x28' : pin === '9' ? '0x88' : '0x8A';
      const isOut = pin === '6' || pin === '5';
      const instr = isOut ? `out ${regAddr}, r16` : `sts ${regAddr}, r16`;
      return [
        `; D${pin} PWM Kitöltési tényező beállítása -> ${duty} (${((duty / 255) * 100).toFixed(1)}%)`,
        `ldi r16, ${duty}          ; Kitöltés betöltése [1 ciklus]`,
        `${instr}                ; ${isOut ? 'OUT' : 'STS'} OCR0A/1A [${isOut ? 1 : 2} ciklus]`,
      ];
    },
    generateC: (params) => {
      const pin = params.pin || '6';
      const duty = params.duty ?? 128;
      return [
        `// C kód (Közvetlen regiszter írás):`,
        pin === '6' ? `OCR0A = ${duty};` : `analogWrite(${pin}, ${duty});`,
        `// Arduino Standard C megfelelője:`,
        `analogWrite(${pin}, ${duty});`,
      ];
    },
    generateInlineAsm: (params) => {
      const duty = params.duty ?? 128;
      return [
        `__asm__ __volatile__ (`,
        `  "ldi r16, ${duty}\\n\\t"`,
        `  "out 0x27, r16\\n\\t" // OCR0A`,
        `  ::: "r16"`,
        `);`,
      ];
    },
    explanationHu: (params) => {
      return `Az OCRnx (Output Compare Register) közvetlen hardveres írása mindössze 1-2 óraciklus (62.5 - 125 ns). Szemben a standard Arduino analogWrite() 40+ ciklusos keresőtáblás megvalósításával, ez villámgyors és azonnali!`;
    },
  },

  // ==========================================
  // 8. DINAMIKUS HARDVER MODULOK (LCD, RTC, 595, SD, NRF, ROTARY)
  // ==========================================
  module_lcd_print: {
    type: 'module_lcd_print',
    category: 'modules',
    name: '16x2 I2C LCD Szöveg Kiírás',
    shortDesc: 'Szöveg kiírása HD44780 LCD kijelzőre PCF8574 I2C adapteren át',
    icon: 'Tv',
    color: 'sky',
    accentColor: '#38bdf8',
    params: [
      {
        key: 'text',
        label: 'Kiírandó Szöveg',
        type: 'text',
        defaultValue: 'Hello ArduASM!',
        description: 'Maximum 16 karakteres sor',
      },
      {
        key: 'row',
        label: 'LCD Sor',
        type: 'select',
        options: [
          { label: '0. Sor (Felső sor - 0x80)', value: '0' },
          { label: '1. Sor (Alsó sor - 0xC0)', value: '1' },
        ],
        defaultValue: '0',
      },
      {
        key: 'clearFirst',
        label: 'Kijelző Törlése Előtte',
        type: 'boolean',
        defaultValue: false,
      },
    ],
    defaultParams: { text: 'Hello ArduASM!', row: '0', clearFirst: false },
    calculateCycles: (params) => (params.text?.length || 10) * 160 + 200,
    generateAsm: (params) => {
      const rowCmd = params.row === '1' ? '0xC0' : '0x80';
      const text = String(params.text || 'Hello');
      return [
        `; 16x2 I2C LCD Kiírás: "${text}" a(z) ${params.row}. sorba`,
        `ldi r24, 0x27        ; I2C LCD Cím (0x27)`,
        `call i2c_start       ; START jel kiküldése`,
        `ldi r24, ${rowCmd}        ; Kurzor pozíció parancs beállítása`,
        `call lcd_send_cmd    ; HD44780 parancs átvitele TWI buszon`,
        `; Karakterek küldése sorban:`,
        ...Array.from(text).map((c) => `ldi r24, '${c}'       ; ASCII: 0x${c.charCodeAt(0).toString(16)}\ncall lcd_send_data`),
        `call i2c_stop        ; STOP jel kiküldése`,
      ];
    },
    generateC: (params) => {
      const row = params.row === '1' ? 1 : 0;
      const text = String(params.text || 'Hello');
      return [
        `// I2C 16x2 LCD Karakter Kiírás (LiquidCrystal_I2C / TWI):`,
        params.clearFirst ? `lcd.clear();` : `// Nincs törlés`,
        `lcd.setCursor(0, ${row});`,
        `lcd.print("${text}");`,
      ];
    },
    generateInlineAsm: (params) => {
      const text = String(params.text || 'Hello');
      return [
        `// Assembly TWI LCD Transmit Buffer:`,
        `/* LCD Stream: "${text}" */`,
      ];
    },
    explanationHu: (params) => {
      return `A HD44780 I2C adapter (PCF8574) 4-bites nyolcas csomagokban viszi át a karaktereket az I2C TWI buszon (A4/A5). A szimulátor azonnal megjeleníti a pixelmátrixon a megadott szöveget.`;
    },
  },

  module_rtc_read_time: {
    type: 'module_rtc_read_time',
    category: 'modules',
    name: 'DS1307/DS3231 RTC Idő Beolvasása',
    shortDesc: 'Valós idejű óra és naptár lekérdezése I2C címen (0x68)',
    icon: 'Clock',
    color: 'purple',
    accentColor: '#a855f7',
    params: [
      {
        key: 'destHoursReg',
        label: 'Óra Célregiszter',
        type: 'register',
        defaultValue: 'r20',
      },
      {
        key: 'destMinsReg',
        label: 'Perc Célregiszter',
        type: 'register',
        defaultValue: 'r21',
      },
      {
        key: 'destSecsReg',
        label: 'Másodperc Célregiszter',
        type: 'register',
        defaultValue: 'r22',
      },
    ],
    defaultParams: { destHoursReg: 'r20', destMinsReg: 'r21', destSecsReg: 'r22' },
    calculateCycles: () => 450,
    generateAsm: (params) => {
      const h = params.destHoursReg || 'r20';
      const m = params.destMinsReg || 'r21';
      const s = params.destSecsReg || 'r22';
      return [
        `; DS1307/DS3231 RTC Idő Beolvasása I2C Buszon (0x68)`,
        `ldi r24, 0xD0        ; RTC I2C Írási Cím (0x68 << 1 | 0)`,
        `call i2c_start`,
        `ldi r24, 0x00        ; Regiszter mutató: 0x00 (Másodpercek)`,
        `call i2c_write`,
        `ldi r24, 0xD1        ; RTC I2C Olvasási Cím (0x68 << 1 | 1)`,
        `call i2c_start`,
        `call i2c_read_ack    ; Másodpercek beolvasása`,
        `mov ${s}, r24        ; ${s} = Sec BCD`,
        `call i2c_read_ack    ; Percek beolvasása`,
        `mov ${m}, r24        ; ${m} = Min BCD`,
        `call i2c_read_nack   ; Órák beolvasása (Utolsó bájt)`,
        `mov ${h}, r24        ; ${h} = Hour BCD`,
        `call i2c_stop`,
      ];
    },
    generateC: (params) => {
      return [
        `// RTC I2C Beolvasás (Wire / RTClib):`,
        `Wire.beginTransmission(0x68);`,
        `Wire.write(0x00); // Kezdő regiszter cím`,
        `Wire.endTransmission();`,
        `Wire.requestFrom(0x68, 3);`,
        `uint8_t sec = Wire.read();`,
        `uint8_t min = Wire.read();`,
        `uint8_t hour = Wire.read();`,
      ];
    },
    generateInlineAsm: (params) => {
      return [`// Inline ASM TWI RTC Request (0x68)`];
    },
    explanationHu: (params) => {
      return `Az RTC modul BCD (Binary Coded Decimal) formátumban szolgáltatja az időt a 0x68-as I2C buszcímen. A szimulátor valós időben szinkronizálja és lépteti az óra tickjeit.`;
    },
  },

  module_shift_74hc595_write: {
    type: 'module_shift_74hc595_write',
    category: 'modules',
    name: '74HC595 Shift-Regiszter Bájt Léptetés',
    shortDesc: '8-bites adat kiküldése sorosan (DS, SH_CP, ST_CP reteszelés)',
    icon: 'Binary',
    color: 'amber',
    accentColor: '#f59e0b',
    params: [
      {
        key: 'byteValue',
        label: 'Kiküldendő Bájt (0-255 / Hex)',
        type: 'number',
        defaultValue: 165,
        description: 'Pl. 165 = 0xA5 = 10100101b',
      },
      {
        key: 'pinData',
        label: 'DS Adat Láb',
        type: 'pin',
        defaultValue: '11',
      },
      {
        key: 'pinClock',
        label: 'SH_CP Órajel Láb',
        type: 'pin',
        defaultValue: '12',
      },
      {
        key: 'pinLatch',
        label: 'ST_CP Retesz Láb',
        type: 'pin',
        defaultValue: '8',
      },
    ],
    defaultParams: { byteValue: 165, pinData: '11', pinClock: '12', pinLatch: '8' },
    calculateCycles: () => 8 * 4 + 4,
    generateAsm: (params) => {
      const val = Number(params.byteValue) || 0;
      return [
        `; 74HC595 Shift Regiszter Írás: 0x${val.toString(16).toUpperCase()} (B${val.toString(2).padStart(8, '0')})`,
        `ldi r24, ${val}         ; Kiküldendő minta betöltése [1 ciklus]`,
        `cbi 0x05, 0            ; ST_CP (D8 Latch) LOW [2 ciklus]`,
        `; 8-bites léptető hurok (Bit-Bang):`,
        `ldi r18, 8             ; 8 bit számláló`,
        `shift_loop:`,
        `rol r24                ; Carry bitbe forgatás`,
        `brcs set_ds_high`,
        `cbi 0x05, 3            ; DS = 0 (D11)`,
        `rjmp clk_pulse`,
        `set_ds_high:`,
        `sbi 0x05, 3            ; DS = 1 (D11)`,
        `clk_pulse:`,
        `sbi 0x05, 4            ; SH_CP HIGH (D12 Órajel)`,
        `cbi 0x05, 4            ; SH_CP LOW`,
        `dec r18`,
        `brne shift_loop`,
        `sbi 0x05, 0            ; ST_CP HIGH (D8 Retesz feltöltése a Q0-Q7 lábakra!)`,
      ];
    },
    generateC: (params) => {
      const val = Number(params.byteValue) || 0;
      const dataPin = params.pinData || '11';
      const clockPin = params.pinClock || '12';
      const latchPin = params.pinLatch || '8';
      return [
        `// 74HC595 Léptetés C-ben (shiftOut):`,
        `digitalWrite(${latchPin}, LOW);`,
        `shiftOut(${dataPin}, ${clockPin}, MSBFIRST, 0x${val.toString(16).toUpperCase()});`,
        `digitalWrite(${latchPin}, HIGH);`,
      ];
    },
    generateInlineAsm: (params) => {
      return [`// Inline 74HC595 bit-bang stream`];
    },
    explanationHu: (params) => {
      return `A 74HC595 8 kimenettel (Q0-Q7) bővíti az Arduino lábait 3 vezeték (Data, Clock, Latch) segítségével. A szimulátor azonnal felvillantja a virtuális LED sort.`;
    },
  },

  module_sd_write_log: {
    type: 'module_sd_write_log',
    category: 'modules',
    name: 'MicroSD Kártya SPI Adatnaplózás',
    shortDesc: 'Fájl megnyitása és adat mentése SD kártyára SPI buszon',
    icon: 'HardDrive',
    color: 'emerald',
    accentColor: '#10b981',
    params: [
      {
        key: 'fileName',
        label: 'Fájlnév (8.3 FAT)',
        type: 'text',
        defaultValue: 'LOGGER.TXT',
      },
      {
        key: 'logText',
        label: 'Mentendő Sor',
        type: 'text',
        defaultValue: 'DATA_LOG_OK',
      },
      {
        key: 'pinCS',
        label: 'SD CS (Chip Select) Láb',
        type: 'pin',
        defaultValue: '4',
      },
    ],
    defaultParams: { fileName: 'LOGGER.TXT', logText: 'DATA_LOG_OK', pinCS: '4' },
    calculateCycles: () => 650,
    generateAsm: (params) => {
      const cs = params.pinCS || '4';
      const text = String(params.logText || 'LOG');
      return [
        `; SD Kártya SPI Adatírás -> ${params.fileName}`,
        `cbi 0x0B, 4            ; SD CS LOW (D${cs} kiválasztás)`,
        `ldi r24, 0x58          ; SPI CMD24 (WRITE_BLOCK)`,
        `call spi_transfer`,
        `; Naplósor átvitele: "${text}"`,
        `call sd_write_buffer`,
        `sbi 0x0B, 4            ; SD CS HIGH (Lezárás)`,
      ];
    },
    generateC: (params) => {
      const cs = params.pinCS || '4';
      const file = params.fileName || 'LOGGER.TXT';
      const text = params.logText || 'DATA_LOG_OK';
      return [
        `// SD Kártya Írás (SD.h / FatFs):`,
        `File logFile = SD.open("${file}", FILE_WRITE);`,
        `if (logFile) {`,
        `  logFile.println("${text}");`,
        `  logFile.close();`,
        `}`,
      ];
    },
    generateInlineAsm: (params) => {
      return [`// SPI MicroSD Write Block Command`];
    },
    explanationHu: (params) => {
      return `Az SD kártya SPI módban 512 bájtos szektorokban tárolja az adatokat. A modul szimulátorában valós időben böngészheted és megnézheted a fájl tartalmát!`;
    },
  },

  module_nrf24_tx_packet: {
    type: 'module_nrf24_tx_packet',
    category: 'modules',
    name: 'NRF24L01+ 2.4GHz Csomagküldés',
    shortDesc: 'Vezeték nélküli RF adatcsomag összeállítása és adása',
    icon: 'Radio',
    color: 'pink',
    accentColor: '#ec4899',
    params: [
      {
        key: 'channel',
        label: 'RF Csatorna (0-125)',
        type: 'number',
        defaultValue: 76,
      },
      {
        key: 'payloadText',
        label: 'Adatcsomag Szöveg (max 32 bájt)',
        type: 'text',
        defaultValue: 'PING_NODE_1',
      },
      {
        key: 'pinCE',
        label: 'CE (Chip Enable) Láb',
        type: 'pin',
        defaultValue: '9',
      },
      {
        key: 'pinCSN',
        label: 'CSN (Chip Select) Láb',
        type: 'pin',
        defaultValue: '10',
      },
    ],
    defaultParams: { channel: 76, payloadText: 'PING_NODE_1', pinCE: '9', pinCSN: '10' },
    calculateCycles: () => 520,
    generateAsm: (params) => {
      const ch = params.channel || 76;
      const text = String(params.payloadText || 'PING');
      return [
        `; NRF24L01+ RF Csomag Adás (Csatorna: ${ch} -> 2.${ch}GHz)`,
        `cbi 0x05, 2            ; CSN LOW (D10)`,
        `ldi r24, 0xA0          ; W_TX_PAYLOAD SPI Parancs`,
        `call spi_transfer`,
        `; 32 bájtos hasznos teher feltöltése: "${text}"`,
        `sbi 0x05, 2            ; CSN HIGH`,
        `sbi 0x05, 1            ; CE HIGH (D9 Rádiós impulzus)`,
        `call delay_10us        ; Minimum 10 µs adási impulzus`,
        `cbi 0x05, 1            ; CE LOW`,
      ];
    },
    generateC: (params) => {
      const text = params.payloadText || 'PING_NODE_1';
      return [
        `// NRF24L01 Rádiós Csomagküldés (RF24 könyvtár):`,
        `const char text[] = "${text}";`,
        `radio.write(&text, sizeof(text));`,
      ];
    },
    generateInlineAsm: (params) => {
      return [`// NRF24 W_TX_PAYLOAD SPI stream`];
    },
    explanationHu: (params) => {
      return `Az NRF24L01+ a 2.4 GHz ISM sávban 1-2 Mbps sebességgel továbbítja a csomagokat automatikus nyugtázással (Enhanced ShockBurst™).`;
    },
  },

  module_rotary_read_state: {
    type: 'module_rotary_read_state',
    category: 'modules',
    name: 'KY-040 Rotary Encóder Beolvasása',
    shortDesc: 'Forgási állapot és nyomógomb lekérdezése D2/D3 lábakon',
    icon: 'Disc',
    color: 'cyan',
    accentColor: '#06b6d4',
    params: [
      {
        key: 'pinCLK',
        label: 'CLK (A fázis) Láb',
        type: 'pin',
        defaultValue: '2',
      },
      {
        key: 'pinDT',
        label: 'DT (B fázis) Láb',
        type: 'pin',
        defaultValue: '3',
      },
      {
        key: 'destPositionReg',
        label: 'Pozíció Célregiszter',
        type: 'register',
        defaultValue: 'r24',
      },
    ],
    defaultParams: { pinCLK: '2', pinDT: '3', destPositionReg: 'r24' },
    calculateCycles: () => 8,
    generateAsm: (params) => {
      const reg = params.destPositionReg || 'r24';
      return [
        `; KY-040 Rotary Encóder Állapot Olvasása (D2 / D3)`,
        `in r16, 0x09           ; PIND beolvasása [1 ciklus]`,
        `sbrs r16, 2            ; Ha D2 (CLK) LOW -> lépés történt`,
        `rjmp encoder_tick`,
        `rjmp encoder_done`,
        `encoder_tick:`,
        `sbrs r16, 3            ; DT (D3) állapot vizsgálata (Irány: CW/CCW)`,
        `inc ${reg}             ; Óramutató járásával egyező -> Növelés`,
        `sbrc r16, 3`,
        `dec ${reg}             ; Ellentétes irány -> Csökkentés`,
        `encoder_done:`,
      ];
    },
    generateC: (params) => {
      return [
        `// Rotary Encoder Kvadratúra Dekódolás:`,
        `int clkState = digitalRead(2);`,
        `int dtState = digitalRead(3);`,
        `if (clkState == LOW) {`,
        `  if (dtState == HIGH) position++; else position--;`,
        `}`,
      ];
    },
    generateInlineAsm: (params) => {
      return [`// Rotary fast PIND sample`];
    },
    explanationHu: (params) => {
      return `A Rotary Encóder két fáziseltolt négyszögjelet (A és B) állít elő. A forgatás irányát a CLK lefutó élénél érvényes DT szint határozza meg.`;
    },
  },

  module_bt_init: {
    type: 'module_bt_init',
    category: 'modules',
    name: '📶 Bluetooth SPP / BLE Modul Init (BT05 / BT06)',
    shortDesc: 'BT05 (BLE 4.0) vagy BT06 (SPP 2.0) modul UART kapcsolata és paraméterei',
    icon: 'Bluetooth',
    color: 'sky',
    accentColor: '#0284c7',
    params: [
      {
        key: 'baudRate',
        label: 'Baud Ráta',
        type: 'select',
        options: [
          { label: '9600 Baud (Alapértelmezett BT05/BT06)', value: '9600' },
          { label: '38400 Baud (HC-05 AT Mód)', value: '38400' },
          { label: '115200 Baud (Nagysebességű BLE)', value: '115200' },
        ],
        defaultValue: '9600',
      },
      {
        key: 'deviceName',
        label: 'Bluetooth Eszköznév (Broadcast Name)',
        type: 'text',
        defaultValue: 'BT05-ARDUINO',
      },
      {
        key: 'pinCode',
        label: 'Párosítási PIN Kód (PIN Code)',
        type: 'text',
        defaultValue: '1234',
      },
      {
        key: 'role',
        label: 'Üzemmód (Role)',
        type: 'select',
        options: [
          { label: 'Slave (Telefonhoz / PC-hez csatlakozik)', value: 'SLAVE' },
          { label: 'Master (Másik BT eszközhöz csatlakozik)', value: 'MASTER' },
        ],
        defaultValue: 'SLAVE',
      },
    ],
    defaultParams: { baudRate: '9600', deviceName: 'BT05-ARDUINO', pinCode: '1234', role: 'SLAVE' },
    calculateCycles: () => 14,
    generateAsm: (params) => {
      const baud = parseInt(params.baudRate || '9600', 10);
      const ubrr = Math.round(16000000 / (16 * baud)) - 1;
      const devName = params.deviceName || 'BT05-ARDUINO';
      return [
        `; --- BT05 / BT06 Bluetooth SPP Modul Inicializálás (${baud} Baud) ---`,
        `; Eszköznév: "${devName}", PIN: "${params.pinCode || '1234'}", Mód: ${params.role || 'SLAVE'}`,
        `ldi r16, ${(ubrr >> 8) & 0xFF}           ; UBRR0H`,
        `sts 0xC5, r16          ; STS UBRR0H (0xC5)`,
        `ldi r16, ${ubrr & 0xFF}          ; UBRR0L = ${ubrr}`,
        `sts 0xC4, r16          ; STS UBRR0L (0xC4)`,
        `ldi r16, (1<<4)|(1<<3) ; UCSR0B: RXEN0=1, TXEN0=1 (Soros adás/vétel engedélyezve)`,
        `sts 0xC1, r16          ; STS UCSR0B (0xC1)`,
        `ldi r16, (1<<2)|(1<<1) ; UCSR0C: 8N1 aszinkron keret`,
        `sts 0xC2, r16          ; STS UCSR0C (0xC2)`,
      ];
    },
    generateC: (params) => {
      const baud = params.baudRate || '9600';
      const devName = params.deviceName || 'BT05-ARDUINO';
      const pinCode = params.pinCode || '1234';
      return [
        `// BT05 / BT06 Bluetooth SPP / BLE Inicializálás:`,
        `// Eszköznév: "${devName}", PIN: "${pinCode}"`,
        `Serial.begin(${baud}); // Hardveres UART kapcsolat a Bluetooth modullal (D0 RX, D1 TX)`,
        `// AT parancs inicializálás:`,
        `// Serial.print("AT+NAME${devName}\\r\\n");`,
        `// Serial.print("AT+PIN${pinCode}\\r\\n");`,
      ];
    },
    generateInlineAsm: (params) => {
      const baud = parseInt(params.baudRate || '9600', 10);
      const ubrr = Math.round(16000000 / (16 * baud)) - 1;
      return [
        `__asm__ __volatile__ (`,
        `  "ldi r16, ${ubrr}\\n\\t"`,
        `  "sts 0xC4, r16\\n\\t" // UBRR0L`,
        `  "ldi r16, 0x18\\n\\t" // RXEN0 | TXEN0`,
        `  "sts 0xC1, r16\\n\\t" // UCSR0B`,
        `  ::: "r16"`,
        `);`,
      ];
    },
    explanationHu: (params) => {
      return `A BT05 (Bluetooth Low Energy 4.0 CC2541) és BT06/HC-06 (Bluetooth Classic 2.0+EDR) modulok transzparens UART hídként működnek. Az ATmega328P hardveres soros portján (D0 RX, D1 TX) keresztül küldött és fogadott bájtok azonnal megjelennek a párosított okostelefonon vagy számítógépen.`;
    },
  },

  module_bt_send_packet: {
    type: 'module_bt_send_packet',
    category: 'modules',
    name: '📤 Bluetooth Vezeték Nélküli Adatküldés',
    shortDesc: 'Szöveges telemetria vagy mérési regiszter adat küldése telefonra / PC-re',
    icon: 'Radio',
    color: 'sky',
    accentColor: '#0284c7',
    params: [
      {
        key: 'sendType',
        label: 'Adat Típusa',
        type: 'select',
        options: [
          { label: 'Szöveges Üzenet (ASCII Text)', value: 'TEXT' },
          { label: 'Regiszter Érték (HEX)', value: 'REG_HEX' },
          { label: 'Regiszter Érték (DEC)', value: 'REG_DEC' },
        ],
        defaultValue: 'TEXT',
      },
      {
        key: 'messageText',
        label: 'Küldendő Szöveg',
        type: 'text',
        defaultValue: 'SENSOR_OK: 24.5C',
      },
      {
        key: 'srcReg',
        label: 'Forrás Regiszter (ha Regiszter Érték)',
        type: 'register',
        defaultValue: 'r24',
      },
      {
        key: 'addNewline',
        label: 'Új Sor Lezárás (\\r\\n)',
        type: 'boolean',
        defaultValue: true,
      },
    ],
    defaultParams: { sendType: 'TEXT', messageText: 'SENSOR_OK: 24.5C', srcReg: 'r24', addNewline: true },
    calculateCycles: (params) => ((params.messageText || '').length + 2) * 7,
    generateAsm: (params, labelSuffix = '1') => {
      const text = params.messageText || 'BT_OK';
      const isText = params.sendType === 'TEXT';
      const reg = params.srcReg || 'r24';
      const lbl = `bt_tx_wait_${labelSuffix}`;
      if (!isText) {
        return [
          `; --- Bluetooth Adatküldés Regiszterből (${reg}) ---`,
          `${lbl}:`,
          `lds r16, 0xC0           ; UCSR0A beolvasása`,
          `sbrs r16, 5             ; UDRE0 (Adó puffer szabad?)`,
          `rjmp ${lbl}`,
          `sts 0xC6, ${reg}        ; UDR0 = ${reg} [Adat kimegy Bluetooth-on]`,
        ];
      }
      return [
        `; --- Bluetooth Szöveg Küldése: "${text}" ---`,
        `${lbl}:`,
        `lds r16, 0xC0           ; UCSR0A ellenőrzése`,
        `sbrs r16, 5             ; UDRE0 adópuffer üres?`,
        `rjmp ${lbl}`,
        `ldi r16, '${text.charAt(0) || 'B'}'        ; Első karakter kódja`,
        `sts 0xC6, r16           ; Hardveres UART TX indítása Bluetooth felé`,
      ];
    },
    generateC: (params) => {
      const text = params.messageText || 'SENSOR_OK: 24.5C';
      const isText = params.sendType === 'TEXT';
      const reg = params.srcReg || 'r24';
      if (!isText) {
        return [
          `// Bluetooth regiszter/érték küldése okostelefonra:`,
          `Serial.print("VALUE: ");`,
          `Serial.println(${reg}, HEX);`,
        ];
      }
      return [
        `// Bluetooth telemetria küldése:`,
        params.addNewline ? `Serial.println("${text}");` : `Serial.print("${text}");`,
      ];
    },
    generateInlineAsm: (params) => {
      return [`// Inline Bluetooth UART SPP Send Buffer`];
    },
    explanationHu: (params) => {
      return `Az adatbájtok a mikrovezérlő UART adóján (UDR0) keresztül jutnak a Bluetooth modulba, amely 2.4 GHz-es vezeték nélküli rádióhullámokon keresztül továbbítja azokat a csatlakoztatott mobilalkalmazás (pl. Serial Bluetooth Terminal) felé.`;
    },
  },

  module_bt_receive_command: {
    type: 'module_bt_receive_command',
    category: 'modules',
    name: '📥 Bluetooth Parancs Fogadás & Beavatkozás',
    shortDesc: 'Mobilról érkező távvezérlő karakter (pl. 1/0) fogadása és relé/LED kapcsolás',
    icon: 'Radio',
    color: 'sky',
    accentColor: '#0284c7',
    params: [
      {
        key: 'destReg',
        label: 'Fogadó Munkaregiszter',
        type: 'register',
        defaultValue: 'r24',
      },
      {
        key: 'controlPin',
        label: 'Vezérelt Kimeneti Láb (pl. LED / Relé)',
        type: 'pin',
        defaultValue: '13',
      },
      {
        key: 'autoToggle',
        label: 'Automatikus Be/Ki Kapcsolás (\'1\' = HIGH, \'0\' = LOW)',
        type: 'boolean',
        defaultValue: true,
      },
    ],
    defaultParams: { destReg: 'r24', controlPin: '13', autoToggle: true },
    calculateCycles: () => 10,
    generateAsm: (params, labelSuffix = '1') => {
      const reg = params.destReg || 'r24';
      const pin = (params.controlPin || '13') as ArduinoPin;
      const mapping = PIN_MAPPINGS[pin] || PIN_MAPPINGS['13'];
      const lblSkip = `bt_skip_${labelSuffix}`;
      const lblCheck0 = `bt_check0_${labelSuffix}`;
      return [
        `; --- Bluetooth Beérkező Parancs Ellenőrzése ---`,
        `lds r16, 0xC0           ; UCSR0A olvasása`,
        `sbrs r16, 7             ; RXC0 (bit 7) = 1? (Érkezett új bájt a telefonról?)`,
        `rjmp ${lblSkip}         ; Ha nincs új adat, kihagyjuk`,
        `lds ${reg}, 0xC6        ; UDR0 olvasása -> ${reg} regiszterbe [2 ciklus]`,
        ...(params.autoToggle
          ? [
              `cpi ${reg}, '1'          ; '1' parancs érkezett (Bekapcsolás)?`,
              `brne ${lblCheck0}`,
              `sbi ${mapping.portAddr}, ${mapping.bit}   ; D${pin} = HIGH (Bekapcsolva!)`,
              `rjmp ${lblSkip}`,
              `${lblCheck0}:`,
              `cpi ${reg}, '0'          ; '0' parancs érkezett (Kikapcsolás)?`,
              `brne ${lblSkip}`,
              `cbi ${mapping.portAddr}, ${mapping.bit}   ; D${pin} = LOW (Kikapcsolva!)`,
            ]
          : []),
        `${lblSkip}:`,
      ];
    },
    generateC: (params) => {
      const pin = params.controlPin || '13';
      return [
        `// Bluetooth távvezérlés fogadása és beavatkozás:`,
        `if (Serial.available() > 0) {`,
        `  char cmd = Serial.read(); // Fogadott parancs a mobilról`,
        params.autoToggle
          ? `  if (cmd == '1') digitalWrite(${pin}, HIGH); // Bekapcsolás\n  else if (cmd == '0') digitalWrite(${pin}, LOW); // Kikapcsolás`
          : `  // Feldolgozás tetszőleges kóddal`,
        `}`,
      ];
    },
    generateInlineAsm: (params) => {
      return [`// Inline Bluetooth Command Parser`];
    },
    explanationHu: (params) => {
      return `A modul aszinkron módon figyeli az RXC0 jelzőbitet. Amikor a telefonos app gombját megnyomják, az elküldött karakter bekerül az UDR0 regiszterbe, és a mikrokontroller azonnal átváltja a kiválasztott D${params.controlPin || '13'} kimeneti lábat.`;
    },
  },

  module_bt_at_command: {
    type: 'module_bt_at_command',
    category: 'modules',
    name: '⚙️ Bluetooth AT Konfiguráció (AT+NAME, AT+PIN)',
    shortDesc: 'AT parancsok kiküldése a Bluetooth modul belső EEPROM beállításainak módosításához',
    icon: 'Sliders',
    color: 'sky',
    accentColor: '#0284c7',
    params: [
      {
        key: 'atCommand',
        label: 'AT Parancs',
        type: 'select',
        options: [
          { label: 'AT (Teszt kapcsolat - Válasz: OK)', value: 'AT' },
          { label: 'AT+NAME=BT05-ROBOT (Eszköznév beállítása)', value: 'AT+NAME=BT05-ROBOT' },
          { label: 'AT+PIN=1234 (Párosítási PIN módosítása)', value: 'AT+PIN=1234' },
          { label: 'AT+BAUD=9600 (Baud sebesség rögzítése)', value: 'AT+BAUD=9600' },
          { label: 'AT+VERSION (Firmware verzió lekérdezése)', value: 'AT+VERSION' },
          { label: 'AT+ROLE=0 (Slave Mód aktiválása)', value: 'AT+ROLE=0' },
        ],
        defaultValue: 'AT',
      },
    ],
    defaultParams: { atCommand: 'AT' },
    calculateCycles: () => 35,
    generateAsm: (params) => {
      const cmd = params.atCommand || 'AT';
      return [
        `; --- Bluetooth AT Konfigurációs Parancs: "${cmd}" ---`,
        `; Várakozás az adópufferre és karakterlánc kiküldése:`,
        `ldi r24, '${cmd.charAt(0)}'`,
        `call uart_send_char`,
        `ldi r24, '${cmd.charAt(1) || 'T'}'`,
        `call uart_send_char`,
        `; Karakterek: \\r\\n lezárás`,
        `ldi r24, 0x0D          ; '\\r'`,
        `call uart_send_char`,
        `ldi r24, 0x0A          ; '\\n'`,
        `call uart_send_char`,
      ];
    },
    generateC: (params) => {
      const cmd = params.atCommand || 'AT';
      return [
        `// Bluetooth AT Parancs küldése (Modul beállítás):`,
        `Serial.print("${cmd}\\r\\n"); // Válasz: "OK" vagy "OK+Set:..."`,
      ];
    },
    generateInlineAsm: (params) => {
      return [`// Inline Bluetooth AT Command Stream`];
    },
    explanationHu: (params) => {
      return `A BT05 és BT06 modulok nem csatlakozott (Disconnected) állapotban automatikusan AT parancs üzemmódban vannak. Az elküldött AT parancsokkal átnevezhető a modul, megváltoztatható a PIN kód vagy a Baud ráta anélkül, hogy külön EN láb hardveres felhúzására lenne szükség.`;
    },
  },

  // ==========================================
  // 8B. 24Cxxx I2C KÜLSŐ EEPROM MEMÓRIA MODULOK
  // ==========================================
  module_24cxxx_write_byte: {
    type: 'module_24cxxx_write_byte',
    category: 'modules',
    name: '💾 24Cxxx Külső EEPROM Bájt Írás (I2C)',
    shortDesc: '1 bájt kiírása a külső 24C02 - 24C1024 I2C EEPROM memóriachip adott címére',
    icon: 'Database',
    color: 'emerald',
    accentColor: '#10b981',
    params: [
      {
        key: 'chipModel',
        label: 'EEPROM Típus',
        type: 'select',
        options: [
          { label: '24C02 (256 B / 2 Kbit - 8b Címzés)', value: '24C02' },
          { label: '24C04 (512 B / 4 Kbit - 8b Címzés + Blokkbitek)', value: '24C04' },
          { label: '24C08 (1 KB / 8 Kbit - 8b Címzés + Blokkbitek)', value: '24C08' },
          { label: '24C16 (2 KB / 16 Kbit - 8b Címzés + Blokkbitek)', value: '24C16' },
          { label: '24C32 (4 KB / 32 Kbit - 16b Címzés)', value: '24C32' },
          { label: '24C64 (8 KB / 64 Kbit - 16b Címzés)', value: '24C64' },
          { label: '24C128 (16 KB / 128 Kbit - 16b Címzés)', value: '24C128' },
          { label: '24C256 (32 KB / 256 Kbit - 16b Címzés - Uno Alap)', value: '24C256' },
          { label: '24C512 (64 KB / 512 Kbit - 16b Címzés)', value: '24C512' },
          { label: '24C1024 (128 KB / 1 Mbit - 16b Címzés + Bank)', value: '24C1024' },
        ],
        defaultValue: '24C256',
      },
      {
        key: 'i2cAddress',
        label: 'I2C Eszközcím (A0/A1/A2 Hardver Cím)',
        type: 'select',
        options: [
          { label: '0x50 (A0=0, A1=0, A2=0)', value: '0x50' },
          { label: '0x51 (A0=1, A1=0, A2=0)', value: '0x51' },
          { label: '0x52 (A0=0, A1=1, A2=0)', value: '0x52' },
          { label: '0x53 (A0=1, A1=1, A2=0)', value: '0x53' },
          { label: '0x54 (A0=0, A1=0, A2=1)', value: '0x54' },
          { label: '0x55 (A0=1, A1=0, A2=1)', value: '0x55' },
          { label: '0x56 (A0=0, A1=1, A2=1)', value: '0x56' },
          { label: '0x57 (A0=1, A1=1, A2=1)', value: '0x57' },
        ],
        defaultValue: '0x50',
      },
      {
        key: 'memAddress',
        label: 'Memóriacím (Hex: 0x0000 - 0x7FFF vagy Dec: 0 - 32767)',
        type: 'text',
        defaultValue: '0x0010',
        description: 'A 24Cxxx memóriachip belső cellacíme',
      },
      {
        key: 'dataByte',
        label: 'Kiírandó Adatbájt (Hex: 0x42, Dec: 66, Karakter: \'A\')',
        type: 'text',
        defaultValue: '0x42',
      },
      {
        key: 'waitForWrite',
        label: 'Írási Ciklus Várakozás (tWR ~5ms delay / ACK polling)',
        type: 'boolean',
        defaultValue: true,
      },
    ],
    defaultParams: {
      chipModel: '24C256',
      i2cAddress: '0x50',
      memAddress: '0x0010',
      dataByte: '0x42',
      waitForWrite: true,
    },
    calculateCycles: () => 180,
    generateAsm: (params) => {
      const chip = params.chipModel || '24C256';
      const i2cAddr = params.i2cAddress || '0x50';
      const memAddrStr = String(params.memAddress || '0x0010');
      const rawAddr = parseInt(memAddrStr, memAddrStr.startsWith('0x') ? 16 : 10) || 0;
      const dataVal = String(params.dataByte || '0x42');
      const is16Bit = !['24C01', '24C02', '24C04', '24C08', '24C16'].includes(chip);

      const msb = (rawAddr >> 8) & 0xff;
      const lsb = rawAddr & 0xff;

      return [
        `; ==========================================`,
        `; 24Cxxx Külső EEPROM Bájt Írás (${chip} @ ${i2cAddr})`,
        `; Memória Cím: 0x${rawAddr.toString(16).padStart(4, '0').toUpperCase()}, Adat: ${dataVal}`,
        `; ==========================================`,
        `ldi r24, ${i2cAddr}        ; I2C Slave Cím (SLA+W)`,
        `call i2c_start       ; START feltétel és SLA+W küldése`,
        ...(is16Bit
          ? [
              `ldi r24, 0x${msb.toString(16).padStart(2, '0')}        ; Cím MSB (Felső 8 bit)`,
              `call i2c_write       ; Cím felső bájt átvitele`,
              `ldi r24, 0x${lsb.toString(16).padStart(2, '0')}        ; Cím LSB (Alsó 8 bit)`,
              `call i2c_write       ; Cím alsó bájt átvitele`,
            ]
          : [
              `ldi r24, 0x${lsb.toString(16).padStart(2, '0')}        ; 8-bites memóriacím`,
              `call i2c_write       ; Címbájt átvitele`,
            ]),
        `ldi r24, ${dataVal}        ; Kiírandó adatbájt`,
        `call i2c_write       ; Adat kiírása a pufferbe`,
        `call i2c_stop        ; STOP feltétel generálása (Írás indítása)`,
        ...(params.waitForWrite
          ? [
              `; Várakozás a belső EEPROM írási ciklusra (tWR = ~5ms):`,
              `ldi r24, 5           ; 5 ms késleltetés`,
              `call delay_ms        ; Várakozás a fizikai cellák feltöltődésére`,
            ]
          : []),
      ];
    },
    generateC: (params) => {
      const chip = params.chipModel || '24C256';
      const i2cAddr = params.i2cAddress || '0x50';
      const memAddr = params.memAddress || '0x0010';
      const dataVal = params.dataByte || '0x42';
      const is16Bit = !['24C01', '24C02', '24C04', '24C08', '24C16'].includes(chip);

      return [
        `// 24Cxxx Külső I2C EEPROM Bájt Írás (${chip} @ ${i2cAddr}):`,
        `#include <Wire.h>`,
        `Wire.beginTransmission(${i2cAddr});`,
        ...(is16Bit
          ? [
              `Wire.write((uint8_t)(${memAddr} >> 8));   // Cím felső bájt (MSB)`,
              `Wire.write((uint8_t)(${memAddr} & 0xFF)); // Cím alsó bájt (LSB)`,
            ]
          : [`Wire.write((uint8_t)(${memAddr} & 0xFF)); // 8-bites memóriacím`]),
        `Wire.write((uint8_t)(${dataVal}));`,
        `Wire.endTransmission();`,
        ...(params.waitForWrite ? [`delay(5); // tWR = 5ms belső írási ciklus idő`] : []),
      ];
    },
    generateInlineAsm: (params) => {
      return [`// Inline 24Cxxx I2C EEPROM Write`];
    },
    explanationHu: (params) => {
      return `A blokk az I2C (TWI) buszon keresztül elküldi a 24Cxxx memóriachipnek a megcélzott belső memóriacímet (16-bites chipnél 2 bájtot), majd kiírja az adatbájtot. A STOP parancs után a chip megkezdi az önálló belső programozást, amihez ~5 ms tWR ciklusidő szükséges.`;
    },
  },

  module_24cxxx_read_byte: {
    type: 'module_24cxxx_read_byte',
    category: 'modules',
    name: '📖 24Cxxx Külső EEPROM Bájt Olvasás (I2C)',
    shortDesc: '1 bájt beolvasása a 24Cxxx külső I2C memóriachipből CPU regiszterbe',
    icon: 'Database',
    color: 'emerald',
    accentColor: '#10b981',
    params: [
      {
        key: 'chipModel',
        label: 'EEPROM Típus',
        type: 'select',
        options: [
          { label: '24C02 (256 B / 2 Kbit)', value: '24C02' },
          { label: '24C04 (512 B / 4 Kbit)', value: '24C04' },
          { label: '24C08 (1 KB / 8 Kbit)', value: '24C08' },
          { label: '24C16 (2 KB / 16 Kbit)', value: '24C16' },
          { label: '24C32 (4 KB / 32 Kbit)', value: '24C32' },
          { label: '24C64 (8 KB / 64 Kbit)', value: '24C64' },
          { label: '24C128 (16 KB / 128 Kbit)', value: '24C128' },
          { label: '24C256 (32 KB / 256 Kbit)', value: '24C256' },
          { label: '24C512 (64 KB / 512 Kbit)', value: '24C512' },
          { label: '24C1024 (128 KB / 1 Mbit)', value: '24C1024' },
        ],
        defaultValue: '24C256',
      },
      {
        key: 'i2cAddress',
        label: 'I2C Eszközcím',
        type: 'select',
        options: [
          { label: '0x50 (A0=0, A1=0, A2=0)', value: '0x50' },
          { label: '0x51 (A0=1, A1=0, A2=0)', value: '0x51' },
          { label: '0x52 (A0=0, A1=1, A2=0)', value: '0x52' },
          { label: '0x53 (A0=1, A1=1, A2=0)', value: '0x53' },
          { label: '0x54 (A0=0, A1=0, A2=1)', value: '0x54' },
          { label: '0x55 (A0=1, A1=0, A2=1)', value: '0x55' },
          { label: '0x56 (A0=0, A1=1, A2=1)', value: '0x56' },
          { label: '0x57 (A0=1, A1=1, A2=1)', value: '0x57' },
        ],
        defaultValue: '0x50',
      },
      {
        key: 'memAddress',
        label: 'Memóriacím (Hex / Dec)',
        type: 'text',
        defaultValue: '0x0010',
      },
      {
        key: 'destReg',
        label: 'Cél Regiszter',
        type: 'select',
        options: [
          { label: 'r24 (Általános munkaregiszter)', value: 'r24' },
          { label: 'r25', value: 'r25' },
          { label: 'r16', value: 'r16' },
          { label: 'r17', value: 'r17' },
          { label: 'r18', value: 'r18' },
          { label: 'r19', value: 'r19' },
          { label: 'r20', value: 'r20' },
          { label: 'r21', value: 'r21' },
          { label: 'r22', value: 'r22' },
          { label: 'r23', value: 'r23' },
        ],
        defaultValue: 'r24',
      },
    ],
    defaultParams: {
      chipModel: '24C256',
      i2cAddress: '0x50',
      memAddress: '0x0010',
      destReg: 'r24',
    },
    calculateCycles: () => 160,
    generateAsm: (params) => {
      const chip = params.chipModel || '24C256';
      const i2cAddr = params.i2cAddress || '0x50';
      const memAddrStr = String(params.memAddress || '0x0010');
      const rawAddr = parseInt(memAddrStr, memAddrStr.startsWith('0x') ? 16 : 10) || 0;
      const reg = params.destReg || 'r24';
      const is16Bit = !['24C01', '24C02', '24C04', '24C08', '24C16'].includes(chip);

      const msb = (rawAddr >> 8) & 0xff;
      const lsb = rawAddr & 0xff;

      return [
        `; ==========================================`,
        `; 24Cxxx Külső EEPROM Bájt Olvasás (${chip} @ ${i2cAddr})`,
        `; Cím: 0x${rawAddr.toString(16).padStart(4, '0').toUpperCase()} -> ${reg}`,
        `; ==========================================`,
        `; 1. Dummy Write: Címregiszter beállítása`,
        `ldi r24, ${i2cAddr}        ; I2C Slave Cím (Írás mód)`,
        `call i2c_start`,
        ...(is16Bit
          ? [
              `ldi r24, 0x${msb.toString(16).padStart(2, '0')}        ; Cím MSB`,
              `call i2c_write`,
              `ldi r24, 0x${lsb.toString(16).padStart(2, '0')}        ; Cím LSB`,
              `call i2c_write`,
            ]
          : [`ldi r24, 0x${lsb.toString(16).padStart(2, '0')}        ; 8-bites memóriacím`, `call i2c_write`]),
        `; 2. Repeated START & Olvasás`,
        `ldi r24, (${i2cAddr} | 0x01) ; I2C Slave Cím (Olvasás mód - SLA+R)`,
        `call i2c_start       ; Repeated START`,
        `call i2c_read_nack   ; 1 bájt beolvasása NACK-al (utolsó bájt)`,
        `mov ${reg}, r24        ; Beolvasott bájt mentése a(z) ${reg} regiszterbe`,
        `call i2c_stop        ; I2C Busz lezárása`,
      ];
    },
    generateC: (params) => {
      const chip = params.chipModel || '24C256';
      const i2cAddr = params.i2cAddress || '0x50';
      const memAddr = params.memAddress || '0x0010';
      const reg = params.destReg || 'r24';
      const is16Bit = !['24C01', '24C02', '24C04', '24C08', '24C16'].includes(chip);

      return [
        `// 24Cxxx Külső EEPROM Olvasás (${chip} @ ${i2cAddr}):`,
        `Wire.beginTransmission(${i2cAddr});`,
        ...(is16Bit
          ? [
              `Wire.write((uint8_t)(${memAddr} >> 8));   // MSB`,
              `Wire.write((uint8_t)(${memAddr} & 0xFF)); // LSB`,
            ]
          : [`Wire.write((uint8_t)(${memAddr} & 0xFF));`]),
        `Wire.endTransmission(false); // Repeated START fenntartása`,
        `Wire.requestFrom(${i2cAddr}, 1);`,
        `uint8_t val_${reg} = Wire.available() ? Wire.read() : 0xFF;`,
      ];
    },
    generateInlineAsm: (params) => {
      return [`// Inline 24Cxxx I2C EEPROM Read`];
    },
    explanationHu: (params) => {
      return `Az olvasási művelet egy ún. 'Dummy Write' paranccsal kezdődik, amivel beállítjuk a 24Cxxx belső cím-mutatóját, majd egy 'Repeated START' jellel átváltunk olvasó (SLA+R) üzemmódba, beolvassuk a cella tartalmát, és NACK jellel zárjuk az átvitelt.`;
    },
  },

  module_24cxxx_write_string: {
    type: 'module_24cxxx_write_string',
    category: 'modules',
    name: '✍️ 24Cxxx Külső EEPROM Szöveg / Blokktár',
    shortDesc: 'Szöveges sztring kiírása a 24Cxxx EEPROM-ba lapméret figyeléssel',
    icon: 'Database',
    color: 'emerald',
    accentColor: '#059669',
    params: [
      {
        key: 'chipModel',
        label: 'EEPROM Típus',
        type: 'select',
        options: [
          { label: '24C02 (8 Bájt / Lap)', value: '24C02' },
          { label: '24C08 (16 Bájt / Lap)', value: '24C08' },
          { label: '24C16 (16 Bájt / Lap)', value: '24C16' },
          { label: '24C32 (32 Bájt / Lap)', value: '24C32' },
          { label: '24C64 (32 Bájt / Lap)', value: '24C64' },
          { label: '24C256 (64 Bájt / Lap)', value: '24C256' },
          { label: '24C512 (128 Bájt / Lap)', value: '24C512' },
        ],
        defaultValue: '24C256',
      },
      {
        key: 'i2cAddress',
        label: 'I2C Cím',
        type: 'select',
        options: [
          { label: '0x50', value: '0x50' },
          { label: '0x51', value: '0x51' },
          { label: '0x52', value: '0x52' },
          { label: '0x53', value: '0x53' },
          { label: '0x54', value: '0x54' },
          { label: '0x55', value: '0x55' },
          { label: '0x56', value: '0x56' },
          { label: '0x57', value: '0x57' },
        ],
        defaultValue: '0x50',
      },
      {
        key: 'startAddress',
        label: 'Kezdő Memóriacím',
        type: 'text',
        defaultValue: '0x0020',
      },
      {
        key: 'text',
        label: 'Kiírandó Szöveg / Adatsor',
        type: 'text',
        defaultValue: 'TEMP_LOG_2026',
      },
    ],
    defaultParams: {
      chipModel: '24C256',
      i2cAddress: '0x50',
      startAddress: '0x0020',
      text: 'TEMP_LOG_2026',
    },
    calculateCycles: (params) => (params.text?.length || 10) * 120 + 200,
    generateAsm: (params) => {
      const chip = params.chipModel || '24C256';
      const i2cAddr = params.i2cAddress || '0x50';
      const startAddr = String(params.startAddress || '0x0020');
      const text = String(params.text || 'DATA');
      const rawAddr = parseInt(startAddr, startAddr.startsWith('0x') ? 16 : 10) || 0;
      const msb = (rawAddr >> 8) & 0xff;
      const lsb = rawAddr & 0xff;

      return [
        `; 24Cxxx Szöveg kiírása: "${text}" @ 0x${rawAddr.toString(16).padStart(4, '0').toUpperCase()}`,
        `ldi r24, ${i2cAddr}        ; SLA+W`,
        `call i2c_start`,
        `ldi r24, 0x${msb.toString(16).padStart(2, '0')}        ; Cím MSB`,
        `call i2c_write`,
        `ldi r24, 0x${lsb.toString(16).padStart(2, '0')}        ; Cím LSB`,
        `call i2c_write`,
        ...Array.from(text).map((c) => `ldi r24, '${c}'\ncall i2c_write`),
        `call i2c_stop`,
        `ldi r24, 5\ncall delay_ms        ; Lapírási ciklusidő (tWR)`,
      ];
    },
    generateC: (params) => {
      const i2cAddr = params.i2cAddress || '0x50';
      const startAddr = params.startAddress || '0x0020';
      const text = String(params.text || 'DATA');

      return [
        `// 24Cxxx Sztring / Lap Írás:`,
        `Wire.beginTransmission(${i2cAddr});`,
        `Wire.write((uint8_t)(${startAddr} >> 8));`,
        `Wire.write((uint8_t)(${startAddr} & 0xFF));`,
        `Wire.print("${text}");`,
        `Wire.endTransmission();`,
        `delay(5); // tWR = 5ms`,
      ];
    },
    generateInlineAsm: (params) => {
      return [`// Inline 24Cxxx Page Write`];
    },
    explanationHu: (params) => {
      return `A 24Cxxx sorozat támogatja a blokkosított ún. lap-írást (Page Write). Egyetlen I2C tranzakcióval több egymást követő bájtot is kiírhatunk anélkül, hogy minden bájtnál újra be kellene állítani a címet, így jelentősen csökken a buszterhelés.`;
    },
  },

  // ==========================================
  // 8C. 25LCxxx SPI KÜLSŐ EEPROM MEMÓRIA MODULOK
  // ==========================================
  module_25lcxxx_write_byte: {
    type: 'module_25lcxxx_write_byte',
    category: 'modules',
    name: '💾 25LCxxx SPI EEPROM Bájt Írás (WREN + WRITE)',
    shortDesc: 'WREN (0x06) írásengedélyezés és 1 bájt kiírása SPI buszon',
    icon: 'Database',
    color: 'cyan',
    accentColor: '#0891b2',
    params: [
      {
        key: 'chipModel',
        label: 'SPI EEPROM Típus',
        type: 'select',
        options: [
          { label: '25LC040 (512 B / 4 Kbit - 8b Címzés + A8)', value: '25LC040' },
          { label: '25LC160 (2 KB / 16 Kbit - 16b Címzés)', value: '25LC160' },
          { label: '25LC640 (8 KB / 64 Kbit - 16b Címzés)', value: '25LC640' },
          { label: '25LC256 (32 KB / 256 Kbit - 16b Címzés - Alap)', value: '25LC256' },
          { label: '25LC512 (64 KB / 512 Kbit - 16b Címzés)', value: '25LC512' },
          { label: '25LC1024 (128 KB / 1 Mbit - 24b Címzés)', value: '25LC1024' },
        ],
        defaultValue: '25LC256',
      },
      {
        key: 'pinCS',
        label: 'CS (Chip Select) Láb',
        type: 'pin',
        defaultValue: '10',
      },
      {
        key: 'address',
        label: 'Memóriacím (Hex/Dec)',
        type: 'text',
        defaultValue: '0x0010',
      },
      {
        key: 'dataByte',
        label: 'Írandó Adatbájt (Hex/Dec)',
        type: 'text',
        defaultValue: '0xA5',
      },
    ],
    defaultParams: { chipModel: '25LC256', pinCS: '10', address: '0x0010', dataByte: '0xA5' },
    calculateCycles: () => 64,
    generateAsm: (params) => {
      const cs = params.pinCS || '10';
      const addrStr = String(params.address || '0x0010');
      const addr = parseInt(addrStr, addrStr.startsWith('0x') ? 16 : 10) || 0;
      const dataStr = String(params.dataByte || '0xA5');
      const data = parseInt(dataStr, dataStr.startsWith('0x') ? 16 : 10) || 0;
      const csPin = parseInt(cs, 10) || 10;
      const isPortB = csPin >= 8;
      const port = isPortB ? '0x05' : '0x0B';
      const bit = isPortB ? csPin - 8 : csPin;

      return [
        `; === 25LCxxx SPI EEPROM ÍRÁS (${params.chipModel || '25LC256'}) ===`,
        `; 1. WREN (Write Enable Latch - Opkód 0x06):`,
        `cbi ${port}, ${bit}          ; CS LOW (D${cs})`,
        `ldi r24, 0x06          ; WREN opkód`,
        `call spi_transfer`,
        `sbi ${port}, ${bit}          ; CS HIGH (Reteszelés)`,
        ``,
        `; 2. WRITE parancs (0x02) + Cím + Adat:`,
        `cbi ${port}, ${bit}          ; CS LOW`,
        `ldi r24, 0x02          ; WRITE opkód`,
        `call spi_transfer`,
        `ldi r24, 0x${((addr >> 8) & 0xff).toString(16).padStart(2, '0')}     ; Cím MSB`,
        `call spi_transfer`,
        `ldi r24, 0x${(addr & 0xff).toString(16).padStart(2, '0')}     ; Cím LSB`,
        `call spi_transfer`,
        `ldi r24, 0x${data.toString(16).padStart(2, '0')}     ; Adat: 0x${data.toString(16).toUpperCase()}`,
        `call spi_transfer`,
        `sbi ${port}, ${bit}          ; CS HIGH (Belső írás indul)`,
      ];
    },
    generateC: (params) => {
      const cs = params.pinCS || '10';
      return [
        `#include <SPI.h>`,
        `// 25LCxxx SPI EEPROM Bájt Írás:`,
        `digitalWrite(${cs}, LOW);`,
        `SPI.transfer(0x06); // WREN (Write Enable)`,
        `digitalWrite(${cs}, HIGH);`,
        `delayMicroseconds(1);`,
        `digitalWrite(${cs}, LOW);`,
        `SPI.transfer(0x02); // WRITE parancs`,
        `SPI.transfer((${params.address} >> 8) & 0xFF); // Cím MSB`,
        `SPI.transfer(${params.address} & 0xFF);        // Cím LSB`,
        `SPI.transfer(${params.dataByte});              // Adat`,
        `digitalWrite(${cs}, HIGH); // Írási ciklus indítása (~5ms)`,
      ];
    },
    generateInlineAsm: () => [`// Inline 25LCxxx SPI Write`],
    explanationHu: (params) => {
      return `A 25LCxxx SPI EEPROM írásához először mindig kötelező a WREN (0x06 - Write Enable) parancs kiadása külön CS impulzussal. Ezt követően a WRITE (0x02) opkód, a 16-bites memóriacím és az adatbájt kerül kiküldésre a hardveres SPI buszon (D11 MOSI, D12 MISO, D13 SCK, D${params.pinCS || '10'} CS).`;
    },
  },

  module_25lcxxx_read_byte: {
    type: 'module_25lcxxx_read_byte',
    category: 'modules',
    name: '📖 25LCxxx SPI EEPROM Bájt Olvasás (READ)',
    shortDesc: 'READ (0x03) opkóddal 1 bájt beolvasása SPI buszon regiszterbe',
    icon: 'Database',
    color: 'cyan',
    accentColor: '#0891b2',
    params: [
      {
        key: 'chipModel',
        label: 'SPI EEPROM Típus',
        type: 'select',
        options: [
          { label: '25LC040 (512 B)', value: '25LC040' },
          { label: '25LC160 (2 KB)', value: '25LC160' },
          { label: '25LC640 (8 KB)', value: '25LC640' },
          { label: '25LC256 (32 KB - Alap)', value: '25LC256' },
          { label: '25LC512 (64 KB)', value: '25LC512' },
          { label: '25LC1024 (128 KB)', value: '25LC1024' },
        ],
        defaultValue: '25LC256',
      },
      {
        key: 'pinCS',
        label: 'CS Láb',
        type: 'pin',
        defaultValue: '10',
      },
      {
        key: 'address',
        label: 'Memóriacím (Hex/Dec)',
        type: 'text',
        defaultValue: '0x0010',
      },
      {
        key: 'destReg',
        label: 'Cél Regiszter',
        type: 'register',
        defaultValue: 'r24',
      },
    ],
    defaultParams: { chipModel: '25LC256', pinCS: '10', address: '0x0010', destReg: 'r24' },
    calculateCycles: () => 48,
    generateAsm: (params) => {
      const cs = params.pinCS || '10';
      const addrStr = String(params.address || '0x0010');
      const addr = parseInt(addrStr, addrStr.startsWith('0x') ? 16 : 10) || 0;
      const reg = params.destReg || 'r24';
      const csPin = parseInt(cs, 10) || 10;
      const isPortB = csPin >= 8;
      const port = isPortB ? '0x05' : '0x0B';
      const bit = isPortB ? csPin - 8 : csPin;

      return [
        `; === 25LCxxx SPI EEPROM OLVASÁS (READ 0x03) ===`,
        `cbi ${port}, ${bit}          ; CS LOW (D${cs})`,
        `ldi r24, 0x03          ; READ opkód`,
        `call spi_transfer`,
        `ldi r24, 0x${((addr >> 8) & 0xff).toString(16).padStart(2, '0')}     ; Cím MSB`,
        `call spi_transfer`,
        `ldi r24, 0x${(addr & 0xff).toString(16).padStart(2, '0')}     ; Cím LSB`,
        `call spi_transfer`,
        `ldi r24, 0x00          ; Dummy bájt az órajel generáláshoz`,
        `call spi_transfer      ; Fogadott bájt visszatér r24-ben`,
        `mov ${reg}, r24        ; Mentés ide: ${reg}`,
        `sbi ${port}, ${bit}          ; CS HIGH`,
      ];
    },
    generateC: (params) => {
      const cs = params.pinCS || '10';
      return [
        `#include <SPI.h>`,
        `digitalWrite(${cs}, LOW);`,
        `SPI.transfer(0x03); // READ opkód`,
        `SPI.transfer((${params.address} >> 8) & 0xFF);`,
        `SPI.transfer(${params.address} & 0xFF);`,
        `uint8_t ${params.destReg || 'r24'}_val = SPI.transfer(0x00); // Adat beolvasása MISO-n`,
        `digitalWrite(${cs}, HIGH);`,
      ];
    },
    generateInlineAsm: () => [`// Inline 25LCxxx SPI Read`],
    explanationHu: () => {
      return `Az SPI READ (0x03) utasítás azonnal visszaadja a kért címen lévő adatot a MISO vonalon a dummy bájtra generált órajel ütemében, várakozási idő nélkül.`;
    },
  },

  // ==========================================
  // 8D. W25Qxx SPI NOR FLASH MEMÓRIA MODULOK
  // ==========================================
  module_w25qxx_read_jedec: {
    type: 'module_w25qxx_read_jedec',
    category: 'modules',
    name: '🏷️ W25Qxx SPI Flash JEDEC ID Lekérdezés (0x9F)',
    shortDesc: 'Gyártó azonosító (Winbond 0xEF), Memóriatípus (0x40) és Kapacitás kód kiolvasása',
    icon: 'HardDrive',
    color: 'purple',
    accentColor: '#8b5cf6',
    params: [
      {
        key: 'pinCS',
        label: 'Flash CS Láb',
        type: 'pin',
        defaultValue: '10',
      },
      {
        key: 'destRegManuf',
        label: 'Gyártó ID Regiszter (0xEF)',
        type: 'register',
        defaultValue: 'r24',
      },
      {
        key: 'destRegCap',
        label: 'Kapacitás ID Regiszter',
        type: 'register',
        defaultValue: 'r25',
      },
    ],
    defaultParams: { pinCS: '10', destRegManuf: 'r24', destRegCap: 'r25' },
    calculateCycles: () => 40,
    generateAsm: (params) => {
      const cs = params.pinCS || '10';
      const mReg = params.destRegManuf || 'r24';
      const cReg = params.destRegCap || 'r25';
      return [
        `; === W25Qxx SPI FLASH JEDEC ID OLVASÁS (0x9F) ===`,
        `cbi 0x05, 2            ; CS LOW (D${cs})`,
        `ldi r24, 0x9F          ; JEDEC ID parancs`,
        `call spi_transfer`,
        `ldi r24, 0x00          ; Dummy 1: Gyártó ID (Winbond = 0xEF)`,
        `call spi_transfer`,
        `mov ${mReg}, r24`,
        `ldi r24, 0x00          ; Dummy 2: Memóriatípus (0x40)`,
        `call spi_transfer`,
        `ldi r24, 0x00          ; Dummy 3: Kapacitás kód (pl. 0x16 = 32Mbit / 4MB)`,
        `call spi_transfer`,
        `mov ${cReg}, r24`,
        `sbi 0x05, 2            ; CS HIGH (D${cs})`,
      ];
    },
    generateC: (params) => {
      const cs = params.pinCS || '10';
      return [
        `digitalWrite(${cs}, LOW);`,
        `SPI.transfer(0x9F); // JEDEC ID Command`,
        `uint8_t manufId = SPI.transfer(0x00); // Winbond = 0xEF`,
        `uint8_t memType = SPI.transfer(0x00); // 0x40 (SPI)`,
        `uint8_t capCode = SPI.transfer(0x00); // 0x15=2MB, 0x16=4MB, 0x17=8MB, 0x18=16MB`,
        `digitalWrite(${cs}, HIGH);`,
      ];
    },
    generateInlineAsm: () => [`// Inline W25Qxx Read JEDEC ID`],
    explanationHu: () => {
      return `A JEDEC Standard 0x9F parancs lehetővé teszi az SPI Flash chip típusának és méretének automatikus felismerését a rendszer indításakor (Winbond gyártói azonosító: 0xEF).`;
    },
  },

  module_w25qxx_sector_erase: {
    type: 'module_w25qxx_sector_erase',
    category: 'modules',
    name: '🧹 W25Qxx 4KB Szektor Törlés (0x20 Sector Erase)',
    shortDesc: 'Flash szektor 0xFF-re törlése (Kötelező a lap-programozás előtt!)',
    icon: 'Trash2',
    color: 'purple',
    accentColor: '#8b5cf6',
    params: [
      {
        key: 'pinCS',
        label: 'Flash CS Láb',
        type: 'pin',
        defaultValue: '10',
      },
      {
        key: 'sectorAddress',
        label: 'Szektor Cím (Hex: pl. 0x000000)',
        type: 'text',
        defaultValue: '0x000000',
      },
    ],
    defaultParams: { pinCS: '10', sectorAddress: '0x000000' },
    calculateCycles: () => 60,
    generateAsm: (params) => {
      const cs = params.pinCS || '10';
      const sAddrStr = String(params.sectorAddress || '0x000000');
      const addr = parseInt(sAddrStr, sAddrStr.startsWith('0x') ? 16 : 10) || 0;
      return [
        `; === W25Qxx 4KB SZEKTOR TÖRLÉS (0x20) @ 0x${addr.toString(16).padStart(6, '0').toUpperCase()} ===`,
        `; 1. WREN kiadása`,
        `cbi 0x05, 2            ; CS LOW (D${cs})`,
        `ldi r24, 0x06          ; WREN opkód`,
        `call spi_transfer`,
        `sbi 0x05, 2            ; CS HIGH`,
        ``,
        `; 2. Sector Erase (0x20) + 24-bites cím:`,
        `cbi 0x05, 2            ; CS LOW`,
        `ldi r24, 0x20          ; SECTOR ERASE (4KB)`,
        `call spi_transfer`,
        `ldi r24, 0x${((addr >> 16) & 0xff).toString(16).padStart(2, '0')}     ; A23-A16`,
        `call spi_transfer`,
        `ldi r24, 0x${((addr >> 8) & 0xff).toString(16).padStart(2, '0')}     ; A15-A8`,
        `call spi_transfer`,
        `ldi r24, 0x${(addr & 0xff).toString(16).padStart(2, '0')}     ; A7-A0`,
        `call spi_transfer`,
        `sbi 0x05, 2            ; CS HIGH (Törlés indul, Busy flag = 1)`,
      ];
    },
    generateC: (params) => {
      const cs = params.pinCS || '10';
      return [
        `digitalWrite(${cs}, LOW);`,
        `SPI.transfer(0x06); // WREN`,
        `digitalWrite(${cs}, HIGH);`,
        `delayMicroseconds(1);`,
        `digitalWrite(${cs}, LOW);`,
        `SPI.transfer(0x20); // 4KB Sector Erase`,
        `SPI.transfer((${params.sectorAddress} >> 16) & 0xFF);`,
        `SPI.transfer((${params.sectorAddress} >> 8) & 0xFF);`,
        `SPI.transfer(${params.sectorAddress} & 0xFF);`,
        `digitalWrite(${cs}, HIGH);`,
        `// Várakozás a törlés befejezésére (~45ms)`,
      ];
    },
    generateInlineAsm: () => [`// Inline W25Qxx Sector Erase`],
    explanationHu: () => {
      return `A Flash memóriákban az 1-es biteket csak 0-ra lehet átbillenteni lap-programozással. Bármilyen adat módosításához a teljes 4096 bájtos (4 KB) szektort 0xFF-re kell törölni a 0x20 paranccsal.`;
    },
  },

  // ==========================================
  // 8E. MCP23017 16-BITES I2C I/O PORTBŐVÍTŐ
  // ==========================================
  module_mcp23017_set_mode: {
    type: 'module_mcp23017_set_mode',
    category: 'modules',
    name: '⚙️ MCP23017 I/O Irány Regiszter (IODIRA / IODIRB)',
    shortDesc: 'Port A vagy Port B lábak beállítása Bemenet (1) vagy Kimenet (0) módba',
    icon: 'Cpu',
    color: 'amber',
    accentColor: '#f59e0b',
    params: [
      {
        key: 'i2cAddress',
        label: 'I2C Cím (0x20 - 0x27)',
        type: 'select',
        options: [
          { label: '0x20 (A0=0, A1=0, A2=0)', value: '0x20' },
          { label: '0x21 (A0=1, A1=0, A2=0)', value: '0x21' },
          { label: '0x22 (A0=0, A1=1, A2=0)', value: '0x22' },
          { label: '0x23 (A0=1, A1=1, A2=0)', value: '0x23' },
          { label: '0x24 (A0=0, A1=0, A2=1)', value: '0x24' },
          { label: '0x25 (A0=1, A1=0, A2=1)', value: '0x25' },
          { label: '0x26 (A0=0, A1=1, A2=1)', value: '0x26' },
          { label: '0x27 (A0=1, A1=1, A2=1)', value: '0x27' },
        ],
        defaultValue: '0x20',
      },
      {
        key: 'port',
        label: 'Cél Port',
        type: 'select',
        options: [
          { label: 'Port A (IODIRA - Reg 0x00)', value: 'PORT_A' },
          { label: 'Port B (IODIRB - Reg 0x01)', value: 'PORT_B' },
        ],
        defaultValue: 'PORT_A',
      },
      {
        key: 'directionMask',
        label: 'Irány Maszk (0x00 = Mind Kimenet, 0xFF = Mind Bemenet)',
        type: 'text',
        defaultValue: '0x00',
      },
    ],
    defaultParams: { i2cAddress: '0x20', port: 'PORT_A', directionMask: '0x00' },
    calculateCycles: () => 55,
    generateAsm: (params) => {
      const addr = params.i2cAddress || '0x20';
      const regAddr = params.port === 'PORT_B' ? '0x01' : '0x00';
      const maskStr = String(params.directionMask || '0x00');
      const mask = parseInt(maskStr, maskStr.startsWith('0x') ? 16 : 10) || 0;
      return [
        `; === MCP23017 I/O Irány Konfiguráció (${params.port} @ ${addr}) ===`,
        `ldi r24, ${addr}        ; Slave Cím + Write`,
        `call i2c_start`,
        `ldi r24, ${regAddr}        ; Regiszter: ${params.port === 'PORT_B' ? 'IODIRB (0x01)' : 'IODIRA (0x00)'}`,
        `call i2c_write`,
        `ldi r24, 0x${mask.toString(16).padStart(2, '0')}        ; Maszk: 0x${mask.toString(16).toUpperCase()}`,
        `call i2c_write`,
        `call i2c_stop`,
      ];
    },
    generateC: (params) => {
      const reg = params.port === 'PORT_B' ? '0x01' : '0x00';
      return [
        `Wire.beginTransmission(${params.i2cAddress});`,
        `Wire.write(${reg}); // IODIR regiszter`,
        `Wire.write(${params.directionMask}); // 0 = Output, 1 = Input`,
        `Wire.endTransmission();`,
      ];
    },
    generateInlineAsm: () => [`// Inline MCP23017 Set Mode`],
    explanationHu: () => {
      return `Az MCP23017 IODIRA (0x00) és IODIRB (0x01) regisztereiben a 0 érték kimenetet (Output), az 1 pedig bemenetet (Input) konfigurál a kiválasztott 8 lábra.`;
    },
  },

  module_mcp23017_write_port: {
    type: 'module_mcp23017_write_port',
    category: 'modules',
    name: '💡 MCP23017 Port Kimenet Írás (GPIOA / GPIOB)',
    shortDesc: '8 digitális kimeneti állapot egyidejű frissítése I2C-n (GPA0-7 / GPB0-7)',
    icon: 'Cpu',
    color: 'amber',
    accentColor: '#f59e0b',
    params: [
      {
        key: 'i2cAddress',
        label: 'I2C Cím',
        type: 'select',
        options: [
          { label: '0x20', value: '0x20' },
          { label: '0x21', value: '0x21' },
          { label: '0x22', value: '0x22' },
          { label: '0x23', value: '0x23' },
          { label: '0x24', value: '0x24' },
          { label: '0x25', value: '0x25' },
          { label: '0x26', value: '0x26' },
          { label: '0x27', value: '0x27' },
        ],
        defaultValue: '0x20',
      },
      {
        key: 'port',
        label: 'Cél Port',
        type: 'select',
        options: [
          { label: 'Port A (OLATA / GPIOA - Reg 0x12)', value: 'PORT_A' },
          { label: 'Port B (OLATB / GPIOB - Reg 0x13)', value: 'PORT_B' },
        ],
        defaultValue: 'PORT_A',
      },
      {
        key: 'dataValue',
        label: 'Kimeneti Érték (Hex: 0x00 - 0xFF vagy Dec)',
        type: 'text',
        defaultValue: '0b10100101',
      },
    ],
    defaultParams: { i2cAddress: '0x20', port: 'PORT_A', dataValue: '0b10100101' },
    calculateCycles: () => 55,
    generateAsm: (params) => {
      const addr = params.i2cAddress || '0x20';
      const regAddr = params.port === 'PORT_B' ? '0x13' : '0x12';
      const valStr = String(params.dataValue || '0xA5');
      let val = 0;
      if (valStr.startsWith('0b')) val = parseInt(valStr.slice(2), 2);
      else if (valStr.startsWith('0x')) val = parseInt(valStr, 16);
      else val = parseInt(valStr, 10) || 0;

      return [
        `; === MCP23017 Kimenet Írás: ${params.port} = 0x${val.toString(16).toUpperCase()} ===`,
        `ldi r24, ${addr}        ; Slave Cím + Write`,
        `call i2c_start`,
        `ldi r24, ${regAddr}        ; Reg: ${params.port === 'PORT_B' ? 'GPIOB (0x13)' : 'GPIOA (0x12)'}`,
        `call i2c_write`,
        `ldi r24, 0x${val.toString(16).padStart(2, '0')}        ; Kimeneti adat`,
        `call i2c_write`,
        `call i2c_stop`,
      ];
    },
    generateC: (params) => {
      const reg = params.port === 'PORT_B' ? '0x13' : '0x12';
      return [
        `Wire.beginTransmission(${params.i2cAddress});`,
        `Wire.write(${reg}); // GPIOA vagy GPIOB regiszter`,
        `Wire.write(${params.dataValue}); // 8-bites kimeneti minta`,
        `Wire.endTransmission();`,
      ];
    },
    generateInlineAsm: () => [`// Inline MCP23017 Write Port`],
    explanationHu: () => {
      return `Az MCP23017 GPIOA (0x12) vagy GPIOB (0x13) regiszterébe kiírt bájttal mind a 8 külső LED vagy kapcsoló kimenet azonnal, egyetlen atomi lépésben átkapcsol.`;
    },
  },

  // ==========================================
  // 8F. PCF8574 8-BITES I2C PORTBŐVÍTŐ
  // ==========================================
  module_pcf8574_write_byte: {
    type: 'module_pcf8574_write_byte',
    category: 'modules',
    name: '🎛️ PCF8574 / PCF8574A 8-bites I/O Kiírás (I2C)',
    shortDesc: 'P0 - P7 lábak egybájtos azonnali beállítása I2C busszal',
    icon: 'Sliders',
    color: 'sky',
    accentColor: '#0284c7',
    params: [
      {
        key: 'i2cAddress',
        label: 'I2C Cím (PCF8574: 0x20..0x27 / PCF8574A: 0x38..0x3F)',
        type: 'select',
        options: [
          { label: '0x20 (PCF8574 - A0=0, A1=0, A2=0)', value: '0x20' },
          { label: '0x21 (PCF8574 - A0=1)', value: '0x21' },
          { label: '0x27 (PCF8574 - A0..2=1)', value: '0x27' },
          { label: '0x38 (PCF8574A - A0=0, A1=0, A2=0)', value: '0x38' },
          { label: '0x3F (PCF8574A - A0..2=1)', value: '0x3F' },
        ],
        defaultValue: '0x20',
      },
      {
        key: 'dataValue',
        label: 'Port Érték (Hex: 0x00 - 0xFF vagy Dec)',
        type: 'text',
        defaultValue: '0xCA',
      },
    ],
    defaultParams: { i2cAddress: '0x20', dataValue: '0xCA' },
    calculateCycles: () => 40,
    generateAsm: (params) => {
      const addr = params.i2cAddress || '0x20';
      const valStr = String(params.dataValue || '0xCA');
      const val = parseInt(valStr, valStr.startsWith('0x') ? 16 : 10) || 0;
      return [
        `; === PCF8574 Port Kiírás: 0x${val.toString(16).toUpperCase()} @ ${addr} ===`,
        `ldi r24, ${addr}        ; Slave Cím + W`,
        `call i2c_start`,
        `ldi r24, 0x${val.toString(16).padStart(2, '0')}        ; Közvetlen adatbájt (P0..P7)`,
        `call i2c_write`,
        `call i2c_stop`,
      ];
    },
    generateC: (params) => {
      return [
        `Wire.beginTransmission(${params.i2cAddress});`,
        `Wire.write(${params.dataValue}); // P0-P7 lábak beállítása`,
        `Wire.endTransmission();`,
      ];
    },
    generateInlineAsm: () => [`// Inline PCF8574 Write`],
    explanationHu: () => {
      return `A PCF8574 rendkívül egyszerű, regiszter-címzés nélküli I2C portbővítő: a Slave cím után közvetlenül kiküldött bájt azonnal beíródik a P0..P7 kimenetekre.`;
    },
  },

  // ==========================================
  // 8G. 74HC165 BEMENETI SHIFT-REGISZTER (PISO)
  // ==========================================
  module_74hc165_read_byte: {
    type: 'module_74hc165_read_byte',
    category: 'modules',
    name: '📥 74HC165 8-bites Bemenet Olvasás (PISO)',
    shortDesc: 'Párhuzamos bemenetek (D0..D7) reteszelése PL lábbal és beolvasása sorosan',
    icon: 'Layers',
    color: 'teal',
    accentColor: '#0d9488',
    params: [
      {
        key: 'pinPL',
        label: 'PL (Parallel Load / Latch) Láb',
        type: 'pin',
        defaultValue: '9',
      },
      {
        key: 'pinCP',
        label: 'CP (Clock Pulse / Órajel) Láb',
        type: 'pin',
        defaultValue: '13',
      },
      {
        key: 'pinQ7',
        label: 'Q7 / QH (Soros Adat kimenet) Láb',
        type: 'pin',
        defaultValue: '12',
      },
      {
        key: 'destReg',
        label: 'Cél Regiszter',
        type: 'register',
        defaultValue: 'r24',
      },
    ],
    defaultParams: { pinPL: '9', pinCP: '13', pinQ7: '12', destReg: 'r24' },
    calculateCycles: () => 45,
    generateAsm: (params) => {
      const pl = params.pinPL || '9';
      const cp = params.pinCP || '13';
      const q7 = params.pinQ7 || '12';
      const reg = params.destReg || 'r24';
      return [
        `; === 74HC165 PISO Bemenet Beolvasás -> ${reg} ===`,
        `; 1. Párhuzamos bemenetek reteszelése (PL impulzus LOW -> HIGH)`,
        `cbi 0x05, 1            ; PL LOW (D${pl}) [Reteszelés]`,
        `nop`,
        `sbi 0x05, 1            ; PL HIGH (D${pl}) [Léptetés engedélyezve]`,
        `; 2. 8-bites soros beolvasás (D${q7} MISO / D${cp} SCK):`,
        `clr ${reg}`,
        `ldi r18, 8`,
        `hc165_loop:`,
        `lsl ${reg}`,
        `sbic 0x03, 4           ; PINB bit 4 (D${q7} beolvasása)`,
        `ori ${reg}, 1`,
        `sbi 0x05, 5           ; CP HIGH (D${cp})`,
        `cbi 0x05, 5           ; CP LOW`,
        `dec r18`,
        `brne hc165_loop`,
      ];
    },
    generateC: (params) => {
      const pl = params.pinPL || '9';
      const cp = params.pinCP || '13';
      const q7 = params.pinQ7 || '12';
      return [
        `// 74HC165 PISO bemeneti olvasás:`,
        `digitalWrite(${pl}, LOW);  // Párhuzamos bemenetek reteszelése`,
        `delayMicroseconds(5);`,
        `digitalWrite(${pl}, HIGH); // Léptetés engedélyezése`,
        `uint8_t ${params.destReg || 'r24'}_inputs = shiftIn(${q7}, ${cp}, MSBFIRST);`,
      ];
    },
    generateInlineAsm: () => [`// Inline 74HC165 Read`],
    explanationHu: () => {
      return `A 74HC165 Parallel-In Serial-Out léptetőregiszter 8 digitális kapcsoló vagy nyomógomb állapotát reteszeli a PL (Parallel Load) vonal LOW impulzusával, majd 8 órajelciklus alatt sorosan beolvassa a mikrovezérlőbe.`;
    },
  },
  memory_eeprom_write: {
    type: 'memory_eeprom_write',
    category: 'memory',
    name: 'EEPROM Bájt Írása (EEAR/EEDR)',
    shortDesc: 'Bájt mentése a nem-felejtő EEPROM memóriába (0x000 - 0x3FF)',
    icon: 'HardDrive',
    color: 'amber',
    accentColor: '#d97706',
    params: [
      {
        key: 'address',
        label: 'EEPROM Cím (Hex: 0x000 - 0x3FF vagy Dec: 0 - 1023)',
        type: 'text',
        defaultValue: '0x0000',
        description: 'ATmega328P: 1024 bájt (0x000 - 0x3FF)',
      },
      {
        key: 'value',
        label: 'Írandó Érték (Hex: 0x00 - 0xFF vagy Dec)',
        type: 'text',
        defaultValue: '0x42',
      },
      {
        key: 'valueReg',
        label: 'Forrás Regiszter (opcionális)',
        type: 'register',
        defaultValue: 'r16',
      },
    ],
    defaultParams: { address: '0x0000', value: '0x42', valueReg: 'r16' },
    calculateCycles: () => 12,
    generateAsm: (params) => {
      const addr = params.address || '0x0000';
      const val = params.value || '0x42';
      const reg = params.valueReg || 'r16';
      return [
        `; === EEPROM BÁJT ÍRÁSA ===`,
        `; Cím: ${addr}, Érték: ${val}`,
        `eeprom_wr_wait_${addr.replace(/[^a-zA-Z0-9]/g, '')}:`,
        `  sbic 0x1F, 1               ; sbic EECR, EEPE (Várakozás korábbi írásra)`,
        `  rjmp eeprom_wr_wait_${addr.replace(/[^a-zA-Z0-9]/g, '')}`,
        `  ldi r17, high(${addr})     ; EEAR felső bájt`,
        `  out 0x22, r17              ; out EEARH, r17`,
        `  ldi r16, low(${addr})      ; EEAR alsó bájt`,
        `  out 0x21, r16              ; out EEARL, r16`,
        `  ldi ${reg}, ${val}          ; Adatbájt betöltése`,
        `  out 0x20, ${reg}           ; out EEDR, ${reg}`,
        `  sbi 0x1F, 2                ; sbi EECR, EEMPE (Mester engedélyezés)`,
        `  sbi 0x1F, 1                ; sbi EECR, EEPE (Írási ciklus indítása)`,
      ];
    },
    generateC: (params) => {
      const addr = params.address || '0x0000';
      const val = params.value || '0x42';
      return [
        `#include <avr/eeprom.h>`,
        `// AVR-LibC direkt függvény:`,
        `eeprom_write_byte((uint8_t*)${addr}, ${val});`,
        `// Arduino Standard C++:`,
        `EEPROM.write(${addr}, ${val});`,
      ];
    },
    generateInlineAsm: (params) => {
      return [
        `__asm__ __volatile__ (`,
        `  "sbic 0x1F, 1 \\n\\t"`,
        `  "sbi 0x1F, 2 \\n\\t"`,
        `  "sbi 0x1F, 1 \\n\\t"`,
        `  ::`,
        `);`,
      ];
    },
    explanationHu: (params) => {
      return `Az ATmega328P 1024 bájtos belső EEPROM-jának írása hardveres állapotgépet használ. Az EEMPE (EEPROM Master Write Enable) bit beállítása után 4 óracikluson belül be kell billenteni az EEPE bitet, amely elindítja a nem-felejtő lebegőkapus cellák töltését (~3.3 ms).`;
    },
  },

  memory_eeprom_read: {
    type: 'memory_eeprom_read',
    category: 'memory',
    name: 'EEPROM Bájt Olvasása (EERE)',
    shortDesc: 'Adatbájt betöltése EEPROM címről munkaregiszterbe (4 ciklus)',
    icon: 'HardDrive',
    color: 'amber',
    accentColor: '#f59e0b',
    params: [
      {
        key: 'address',
        label: 'EEPROM Cím (Hex: 0x000 - 0x3FF vagy Dec: 0 - 1023)',
        type: 'text',
        defaultValue: '0x0000',
      },
      {
        key: 'destReg',
        label: 'Cél Regiszter',
        type: 'register',
        defaultValue: 'r16',
      },
    ],
    defaultParams: { address: '0x0000', destReg: 'r16' },
    calculateCycles: () => 8,
    generateAsm: (params) => {
      const addr = params.address || '0x0000';
      const reg = params.destReg || 'r16';
      return [
        `; === EEPROM BÁJT OLVASÁSA ===`,
        `; Cím: ${addr} -> ${reg}`,
        `eeprom_rd_wait_${addr.replace(/[^a-zA-Z0-9]/g, '')}:`,
        `  sbic 0x1F, 1               ; sbic EECR, EEPE (Befejeződött-e az írás?)`,
        `  rjmp eeprom_rd_wait_${addr.replace(/[^a-zA-Z0-9]/g, '')}`,
        `  ldi r17, high(${addr})`,
        `  out 0x22, r17              ; out EEARH, r17`,
        `  ldi r16, low(${addr})`,
        `  out 0x21, r16              ; out EEARL, r16`,
        `  sbi 0x1F, 0                ; sbi EECR, EERE (Olvasási stroboszkóp indítása)`,
        `  in ${reg}, 0x20             ; in ${reg}, EEDR (Adat kiolvasása a regiszterbe)`,
      ];
    },
    generateC: (params) => {
      const addr = params.address || '0x0000';
      const reg = params.destReg || 'r16';
      return [
        `#include <avr/eeprom.h>`,
        `uint8_t ${reg}_val = eeprom_read_byte((const uint8_t*)${addr});`,
        `// Arduino Standard C++:`,
        `byte val = EEPROM.read(${addr});`,
      ];
    },
    generateInlineAsm: (params) => {
      return [`/* EEPROM Read Inline Assembly */`];
    },
    explanationHu: (params) => {
      return `Az EEPROM olvasása az EERE (EEPROM Read Enable) bit beállításával indul. A hardver 4 óraciklus alatt átmásolja a kijelölt cella tartalmát az EEDR (EEPROM Data Register) regiszterbe, ahonnan az 'in' utasítással 1 ciklus alatt beolvasható.`;
    },
  },

  memory_eeprom_update: {
    type: 'memory_eeprom_update',
    category: 'memory',
    name: 'EEPROM Kímélő Frissítés (Update)',
    shortDesc: 'Csak akkor ír, ha az érték változott (100.000 ciklus cellavédelem)',
    icon: 'HardDrive',
    color: 'amber',
    accentColor: '#b45309',
    params: [
      {
        key: 'address',
        label: 'EEPROM Cím (0x000 - 0x3FF)',
        type: 'text',
        defaultValue: '0x0001',
      },
      {
        key: 'value',
        label: 'Új Érték (Hex: 0x00 - 0xFF vagy Dec)',
        type: 'text',
        defaultValue: '0x55',
      },
      {
        key: 'valueReg',
        label: 'Forrás Regiszter',
        type: 'register',
        defaultValue: 'r16',
      },
    ],
    defaultParams: { address: '0x0001', value: '0x55', valueReg: 'r16' },
    calculateCycles: () => 14,
    generateAsm: (params) => {
      const addr = params.address || '0x0001';
      const val = params.value || '0x55';
      const reg = params.valueReg || 'r16';
      return [
        `; === EEPROM INTELLIGENS FRISSÍTÉS (WEAR LEVELING) ===`,
        `; 1. Előolvasás és összehasonlítás:`,
        `  ldi r17, high(${addr})`,
        `  out 0x22, r17              ; out EEARH, r17`,
        `  ldi r16, low(${addr})`,
        `  out 0x21, r16              ; out EEARL, r16`,
        `  sbi 0x1F, 0                ; sbi EECR, EERE`,
        `  in r18, 0x20               ; in r18, EEDR (Meglévő érték)`,
        `  ldi ${reg}, ${val}`,
        `  cp r18, ${reg}              ; cp meglévő, új`,
        `  breq eeprom_skip_upd_${addr.replace(/[^a-zA-Z0-9]/g, '')} ; Ha megegyezik -> átugorjuk az írást!`,
        `; 2. Csak eltérés esetén írunk:`,
        `  out 0x20, ${reg}           ; out EEDR, ${reg}`,
        `  sbi 0x1F, 2                ; sbi EECR, EEMPE`,
        `  sbi 0x1F, 1                ; sbi EECR, EEPE`,
        `eeprom_skip_upd_${addr.replace(/[^a-zA-Z0-9]/g, '')}:`,
      ];
    },
    generateC: (params) => {
      const addr = params.address || '0x0001';
      const val = params.value || '0x55';
      return [
        `#include <avr/eeprom.h>`,
        `eeprom_update_byte((uint8_t*)${addr}, ${val});`,
        `// Arduino Standard C++:`,
        `EEPROM.update(${addr}, ${val});`,
      ];
    },
    generateInlineAsm: () => [`/* EEPROM update */`],
    explanationHu: () => {
      return `Az EEPROM cellák tipikusan ~100 000 írási ciklusra vannak hitelesítve. Az update művelet először kiolvassa a cellát, és ha a menteni kívánt érték megegyezik a tárolttal, kihagyja az írást, megnövelve a mikrokontroller élettartamát.`;
    },
  },

  memory_progmem_read: {
    type: 'memory_progmem_read',
    category: 'memory',
    name: 'Flash PROGMEM Olvasás (LPM Utasítás)',
    shortDesc: 'Flash programmemóriában tárolt konstans kiolvasása (Z mutatóval)',
    icon: 'HardDrive',
    color: 'amber',
    accentColor: '#f59e0b',
    params: [
      {
        key: 'address',
        label: 'Flash Memória Cím (0x0000 - 0x7FFF)',
        type: 'text',
        defaultValue: '0x0100',
      },
      {
        key: 'destReg',
        label: 'Cél Regiszter',
        type: 'register',
        defaultValue: 'r0',
      },
    ],
    defaultParams: { address: '0x0100', destReg: 'r0' },
    calculateCycles: () => 5,
    generateAsm: (params) => {
      const addr = params.address || '0x0100';
      const reg = params.destReg || 'r0';
      return [
        `; === FLASH PROGMEM BÁJT OLVASÁSA (LPM) ===`,
        `ldi r31, high(${addr} * 2) ; Z-mutató felső bájt (ZH / r31)`,
        `ldi r30, low(${addr} * 2)  ; Z-mutató alsó bájt (ZL / r30)`,
        `lpm ${reg}, Z               ; Load Program Memory Flash[Z] -> ${reg} [3 ciklus]`,
      ];
    },
    generateC: (params) => {
      const addr = params.address || '0x0100';
      return [
        `#include <avr/pgmspace.h>`,
        `// C kód (PROGMEM tárolt konstans olvasása):`,
        `uint8_t byteVal = pgm_read_byte_near(${addr});`,
      ];
    },
    generateInlineAsm: () => [`/* LPM instruction */`],
    explanationHu: () => {
      return `Az AVR Harvard architektúrájában a Flash (programmemória) és az SRAM külön címtartományban található. Flash-ből csak a 16-bites Z-mutató regiszterpár (R31:R30) és az LPM (Load Program Memory) utasítás segítségével lehet közvetlenül adatot olvasni.`;
    },
  },

  // ==========================================
  // DALLAS 1-WIRE PROTOKOLL & DS18B20 BLOKKOK
  // ==========================================
  protocol_onewire_reset: {
    type: 'protocol_onewire_reset',
    category: 'protocol',
    name: 'Dallas 1-Wire Busz Reset & Jelenlét (Presence)',
    shortDesc: 'Master Reset impulzus (480µs LOW) és Slave Presence detektálás',
    icon: 'Radio',
    color: 'purple',
    accentColor: '#8b5cf6',
    params: [
      {
        key: 'pin',
        label: '1-Wire Adatláb (DQ)',
        type: 'pin',
        defaultValue: '2',
      },
      {
        key: 'destStatusReg',
        label: 'Jelenlét Célregiszter (0 = Van eszköz)',
        type: 'register',
        defaultValue: 'r24',
      },
    ],
    defaultParams: { pin: '2', destStatusReg: 'r24' },
    calculateCycles: () => 15360, // 960 µs total reset + presence period @ 16MHz
    generateAsm: (params, labelSuffix = '1') => {
      const pin = params.pin || '2';
      const dest = params.destStatusReg || 'r24';
      const pinNum = parseInt(pin, 10) || 2;
      const isPortD = pinNum <= 7;
      const ddr = isPortD ? '0x0A' : '0x04'; // DDRD or DDRB
      const port = isPortD ? '0x0B' : '0x05'; // PORTD or PORTB
      const pinReg = isPortD ? '0x09' : '0x03'; // PIND or PINB
      const bit = isPortD ? pinNum : pinNum - 8;

      return [
        `; === DALLAS 1-WIRE RESET & PRESENCE DETEKTÁLÁS (D${pin}) ===`,
        `; 1. Master Reset Impulzus: Vonal lehúzása 480 µs-ra`,
        `sbi ${ddr}, ${bit}          ; D${pin} kimenetre állítása (DDR=1)`,
        `cbi ${port}, ${bit}         ; D${pin} = LOW (0V)`,
        `ldi r25, 160            ; 480 µs késleltetés (7680 óraciklus)`,
        `ow_rst_loop_${labelSuffix}:`,
        `dec r25`,
        `brne ow_rst_loop_${labelSuffix}`,
        `; 2. Vonal elengedése (Bemenet mód + külső 4.7k felhúzó ellenállás)`,
        `cbi ${ddr}, ${bit}          ; D${pin} bemenet (High-Z)`,
        `cbi ${port}, ${bit}         ; Belső felhúzó ki`,
        `; 3. Várakozás 70 µs-ig a Slave Presence válaszára`,
        `ldi r25, 23`,
        `ow_pres_wait_${labelSuffix}:`,
        `dec r25`,
        `brne ow_pres_wait_${labelSuffix}`,
        `; 4. Jelenlét (Presence) mintavételezése (0 = Van eszköz, 1 = Nincs)`,
        `in ${dest}, ${pinReg}       ; ${pinReg} olvasása`,
        `andi ${dest}, (1<<${bit})   ; D${pin} bit izolálása -> ${dest}`,
        `; 5. Reset ciklus lezárása (410 µs várakozás a busz stabilizálódására)`,
        `ldi r25, 136`,
        `ow_rec_wait_${labelSuffix}:`,
        `dec r25`,
        `brne ow_rec_wait_${labelSuffix}`,
      ];
    },
    generateC: (params) => {
      const pin = params.pin || '2';
      return [
        `#include <OneWire.h>`,
        `// Dallas 1-Wire Busz Inicializálás & Reset:`,
        `OneWire ds(${pin});`,
        `uint8_t presence = ds.reset(); // 1 = Eszköz jelen van (Presence detektálva)`,
      ];
    },
    generateInlineAsm: (params) => {
      const pin = params.pin || '2';
      return [
        `// Inline Assembly 1-Wire Reset sequence on Pin ${pin}`,
      ];
    },
    explanationHu: (params) => {
      return `A Dallas 1-Wire protokoll nyitott nyelőjű (open-drain) buszt használ egyetlen 4.7 kΩ-os felhúzó ellenállással. A Reset művelet során a Master (Arduino) 480 µs-ig LOW szintre húzza a vonalat, majd elengedi azt. A buszon lévő szenzorok (pl. DS18B20) 60-240 µs-on belül egy 60-240 µs-os alacsony szintű Presence (Jelenlét) válasszal jelzik, hogy készen állnak a parancsok fogadására.`;
    },
  },

  protocol_onewire_write_byte: {
    type: 'protocol_onewire_write_byte',
    category: 'protocol',
    name: 'Dallas 1-Wire Bájt Küldés (Write Slot)',
    shortDesc: '8-bites parancs vagy adat küldése LSB-vel kezdve (0xCC, 0x44, 0xBE)',
    icon: 'Share2',
    color: 'purple',
    accentColor: '#a855f7',
    params: [
      {
        key: 'pin',
        label: '1-Wire Adatláb (DQ)',
        type: 'pin',
        defaultValue: '2',
      },
      {
        key: 'command',
        label: 'Parancs / Bájt (HEX)',
        type: 'select',
        options: [
          { label: '0xCC - Skip ROM (Összes eszköznek szóló közvetlen parancs)', value: '0xCC' },
          { label: '0x44 - Convert T (Hőmérséklet konverzió indítása)', value: '0x44' },
          { label: '0xBE - Read Scratchpad (9 bájtos memória kiolvasása)', value: '0xBE' },
          { label: '0x33 - Read ROM (64-bites egyedi azonosító kiolvasása)', value: '0x33' },
          { label: '0x55 - Match ROM (Címzett eszköz kiválasztása 64-bit ROM alapján)', value: '0x55' },
          { label: '0x4E - Write Scratchpad (TH, TL riasztási határok és konfiguráció írása)', value: '0x4E' },
          { label: '0x48 - Copy Scratchpad (TH/TL/Config mentése EEPROM-ba)', value: '0x48' },
        ],
        defaultValue: '0xCC',
      },
    ],
    defaultParams: { pin: '2', command: '0xCC' },
    calculateCycles: () => 1120, // 8 * ~70 µs = 560 µs = ~8960 cycles @ 16MHz
    generateAsm: (params, labelSuffix = '1') => {
      const pin = params.pin || '2';
      const cmd = params.command || '0xCC';
      return [
        `; === DALLAS 1-WIRE BÁJT ÍRÁSA: ${cmd} (D${pin}) ===`,
        `ldi r24, ${cmd}          ; Küldendő bájt betöltése`,
        `ldi r25, 8             ; 8 bit számláló`,
        `ow_wbyte_loop_${labelSuffix}:`,
        `; Write 1 slot: 6 µs LOW + 64 µs HIGH | Write 0 slot: 60 µs LOW + 10 µs HIGH`,
        `sbi 0x0A, ${pin}          ; DQ = OUTPUT (LOW)`,
        `ror r24                ; LSB vizsgálata (Carry flag-be másolás)`,
        `brcs ow_w1_${labelSuffix}      ; Ha bit=1, rövid LOW pulzus`,
        `; --- Bit 0 küldése (60 µs LOW) ---`,
        `ldi r26, 20`,
        `ow_w0_d_${labelSuffix}: dec r26; brne ow_w0_d_${labelSuffix}`,
        `cbi 0x0A, ${pin}          ; Vonal elengedése (HIGH)`,
        `rjmp ow_wnext_${labelSuffix}`,
        `ow_w1_${labelSuffix}:`,
        `; --- Bit 1 küldése (6 µs LOW + vonal elengedése) ---`,
        `nop; nop; nop`,
        `cbi 0x0A, ${pin}          ; Vonal elengedése (HIGH)`,
        `ldi r26, 18`,
        `ow_w1_d_${labelSuffix}: dec r26; brne ow_w1_d_${labelSuffix}`,
        `ow_wnext_${labelSuffix}:`,
        `dec r25`,
        `brne ow_wbyte_loop_${labelSuffix}`,
      ];
    },
    generateC: (params) => {
      const cmd = params.command || '0xCC';
      return [
        `// Dallas 1-Wire Bájt küldése (OneWire könyvtár):`,
        `ds.write(${cmd});`,
      ];
    },
    generateInlineAsm: (params) => {
      const cmd = params.command || '0xCC';
      return [`// Inline 1-Wire Write: ${cmd}`];
    },
    explanationHu: (params) => {
      return `Az 1-Wire írási időszeletek mindig egy Master által indított alacsony szinttel kezdődnek. '1' bit küldésekor a mikrokontroller csak 1–15 µs-ig tartja a vonalat LOW szinten, majd elengedi (a felhúzó visszahúzza HIGH-ra). '0' bit küldésekor a vonalat 60–120 µs-ig tartja lent.`;
    },
  },

  protocol_onewire_read_byte: {
    type: 'protocol_onewire_read_byte',
    category: 'protocol',
    name: 'Dallas 1-Wire Bájt Olvasás (Read Slot)',
    shortDesc: '8-bites adat beolvasása az 1-Wire buszról regiszterbe',
    icon: 'Radio',
    color: 'purple',
    accentColor: '#c084fc',
    params: [
      {
        key: 'pin',
        label: '1-Wire Adatláb (DQ)',
        type: 'pin',
        defaultValue: '2',
      },
      {
        key: 'destReg',
        label: 'Fogadó Regiszter',
        type: 'register',
        defaultValue: 'r16',
      },
    ],
    defaultParams: { pin: '2', destReg: 'r16' },
    calculateCycles: () => 1120,
    generateAsm: (params, labelSuffix = '1') => {
      const pin = params.pin || '2';
      const dest = params.destReg || 'r16';
      return [
        `; === DALLAS 1-WIRE BÁJT OLVASÁSA (D${pin} -> ${dest}) ===`,
        `ldi r25, 8             ; 8 bit számláló`,
        `clr ${dest}             ; Célregiszter törlése`,
        `ow_rbyte_loop_${labelSuffix}:`,
        `; 1. Rövid 3 µs LOW pulzus a Read Slot indításához`,
        `sbi 0x0A, ${pin}          ; DQ = OUTPUT LOW`,
        `nop; nop`,
        `cbi 0x0A, ${pin}          ; DQ = INPUT (Elengedés)`,
        `; 2. Várakozás 10 µs a mintavételig`,
        `nop; nop; nop; nop; nop; nop; nop; nop`,
        `; 3. Bemenet mintavételezése`,
        `in r24, 0x09           ; PIND olvasása`,
        `sbrc r24, ${pin}          ; Ha D${pin} = 1, Carry = 1`,
        `sec`,
        `sbrs r24, ${pin}          ; Ha D${pin} = 0, Carry = 0`,
        `clc`,
        `ror ${dest}             ; Bit betolása a célregiszterbe`,
        `; 4. Várakozás a slot lezárásáig (55 µs recovery)`,
        `ldi r26, 18`,
        `ow_rd_rec_${labelSuffix}: dec r26; brne ow_rd_rec_${labelSuffix}`,
        `dec r25`,
        `brne ow_rbyte_loop_${labelSuffix}`,
      ];
    },
    generateC: (params) => {
      const dest = params.destReg || 'r16';
      return [
        `// Dallas 1-Wire Bájt olvasása:`,
        `uint8_t ${dest}Val = ds.read();`,
      ];
    },
    generateInlineAsm: (params) => {
      return [`// Inline 1-Wire Read Byte`];
    },
    explanationHu: (params) => {
      return `Az olvasási időszeletnél a Master egy minimum 1 µs-os LOW impulzussal jelzi a szenzornak, hogy adatot kér. A szenzor ha '0'-t küld, lent tartja a vonalat ~60 µs-ig; ha '1'-et, azonnal elengedi. A Master a pulzus kezdetétől számított 15 µs-on belül mintavételezi a buszt.`;
    },
  },

  module_ds18b20_read_temp: {
    type: 'module_ds18b20_read_temp',
    category: 'modules',
    name: 'DS18B20 1-Wire Digitális Hőmérséklet Mérés',
    shortDesc: 'Teljes mérési ciklus: Reset -> Skip ROM (0xCC) -> Convert T (0x44) -> Read Scratchpad (0xBE)',
    icon: 'Thermometer',
    color: 'sky',
    accentColor: '#06b6d4',
    params: [
      {
        key: 'pin',
        label: 'DS18B20 Adatláb (DQ)',
        type: 'pin',
        defaultValue: '2',
      },
      {
        key: 'model',
        label: 'Érzékelő Típus',
        type: 'select',
        options: [
          { label: 'DS18B20 (0x28 - Standard 9-12 bit, -55°C - +125°C)', value: 'DS18B20' },
          { label: 'DS18S20 (0x10 - Régebbi 9-bit formátum)', value: 'DS18S20' },
          { label: 'DS1822 (0x22 - Econo változat, ±2.0°C)', value: 'DS1822' },
          { label: 'MAX31820 (0x28 - 3.3V/5V Maxim Dallas)', value: 'MAX31820' },
        ],
        defaultValue: 'DS18B20',
      },
      {
        key: 'resolution',
        label: 'Mérési Felbontás & Idő',
        type: 'select',
        options: [
          { label: '12-bit (0.0625°C - 750 ms konverzió)', value: '12' },
          { label: '11-bit (0.125°C - 375 ms konverzió)', value: '11' },
          { label: '10-bit (0.25°C - 187.5 ms konverzió)', value: '10' },
          { label: '9-bit (0.5°C - 93.75 ms gyors konverzió)', value: '9' },
        ],
        defaultValue: '12',
      },
      {
        key: 'destIntReg',
        label: 'Egész Fok Célregiszter (°C)',
        type: 'register',
        defaultValue: 'r24',
      },
      {
        key: 'destFracReg',
        label: 'Tört Rész Célregiszter (1/16)',
        type: 'register',
        defaultValue: 'r25',
      },
    ],
    defaultParams: { pin: '2', model: 'DS18B20', resolution: '12', destIntReg: 'r24', destFracReg: 'r25' },
    calculateCycles: () => 36000,
    generateAsm: (params, labelSuffix = '1') => {
      const pin = params.pin || '2';
      const intReg = params.destIntReg || 'r24';
      const fracReg = params.destFracReg || 'r25';
      return [
        `; === DS18B20 DALLAS 1-WIRE HŐMÉRSÉKLET MÉRÉS (D${pin}) ===`,
        `; 1. FÁZIS: Konverzió indítása (Convert T)`,
        `call ds18b20_reset      ; 1-Wire Reset + Presence`,
        `ldi r24, 0xCC           ; Skip ROM (0xCC) - minden eszköznek`,
        `call ds18b20_write_byte`,
        `ldi r24, 0x44           ; Convert T (0x44) - Hőmérséklet mérés indítás`,
        `call ds18b20_write_byte`,
        `; 2. FÁZIS: Scratchpad memória olvasása`,
        `call ds18b20_reset      ; 1-Wire Reset`,
        `ldi r24, 0xCC           ; Skip ROM (0xCC)`,
        `call ds18b20_write_byte`,
        `ldi r24, 0xBE           ; Read Scratchpad (0xBE)`,
        `call ds18b20_write_byte`,
        `; 3. FÁZIS: Hőmérséklet LSB és MSB kiolvasása`,
        `call ds18b20_read_byte  ; Byte 0: Temp LSB -> r24-be`,
        `mov ${fracReg}, r24      ; LSB mentése`,
        `call ds18b20_read_byte  ; Byte 1: Temp MSB -> r24-be`,
        `; Fixpontos 12-bites hőmérséklet konverzió (MSB:LSB / 16):`,
        `; Egész fok (°C) -> ${intReg}, Tört fok (1/16) -> ${fracReg}`,
        `mov ${intReg}, ${fracReg}`,
        `lsr r24                 ; MSB alsó bitjeinek és LSB felső 4 bitjének összefűzése`,
        `ror ${intReg}`,
        `lsr r24`,
        `ror ${intReg}`,
        `lsr r24`,
        `ror ${intReg}`,
        `lsr r24`,
        `ror ${intReg}`,
        `andi ${fracReg}, 0x0F   ; ${fracReg} = Alsó 4 bit (0-15 szorzat / 0.0625°C)`,
      ];
    },
    generateC: (params) => {
      const pin = params.pin || '2';
      return [
        `#include <OneWire.h>`,
        `#include <DallasTemperature.h>`,
        ``,
        `// Dallas 1-Wire Hőmérő Inicializálás:`,
        `OneWire oneWire(${pin});`,
        `DallasTemperature sensors(&oneWire);`,
        ``,
        `// Mérés indítása és kiolvasása:`,
        `sensors.requestTemperatures(); // 0x44 Convert T indítása`,
        `float tempC = sensors.getTempCByIndex(0); // Scratchpad olvasás és konverzió`,
        `int tempInt = (int)tempC;`,
        `int tempFrac = (int)((tempC - tempInt) * 100);`,
      ];
    },
    generateInlineAsm: (params) => {
      return [`// Inline DS18B20 Temperature Read Routine`];
    },
    explanationHu: (params) => {
      return `A Dallas DS18B20 digitális hőmérséklet érzékelő 12 bites felbontásban 0.0625°C pontossággal mér (-55°C és +125°C között). A mért adatot 2 bájton (LSB és MSB kettes komplemens formátumban) adja vissza a 9 bájtos Scratchpad memóriájából. A mikrokontroller mindössze 1 adatvezetéken (DQ) keresztül kommunikál vele!`;
    },
  },

  // ==========================================
  // 10. MASTER-SLAVE ÜZEMMÓD (I2C / TWI & SPI)
  // ==========================================
  ms_i2c_master_init: {
    type: 'ms_i2c_master_init',
    category: 'master_slave',
    name: '👑 I2C Master Inicializálás (TWI)',
    shortDesc: 'Hardveres I2C Master busz beállítása 100 kHz vagy 400 kHz órajellel',
    icon: 'Radio',
    color: 'orange',
    accentColor: '#ea580c',
    params: [
      {
        key: 'speed',
        label: 'Busz Sebesség',
        type: 'select',
        options: [
          { label: 'Standard Mód: 100 kHz (TWBR = 72, TWPS = 0)', value: '100k' },
          { label: 'Fast Mód: 400 kHz (TWBR = 12, TWPS = 0)', value: '400k' },
        ],
        defaultValue: '100k',
      },
      {
        key: 'enablePullups',
        label: 'Belső SDA / SCL Felhúzás',
        type: 'boolean',
        defaultValue: true,
      },
    ],
    defaultParams: { speed: '100k', enablePullups: true },
    calculateCycles: () => 8,
    generateAsm: (params) => {
      const isFast = params.speed === '400k';
      const twbrVal = isFast ? '12' : '72';
      return [
        `; --- I2C Master Inicializálása (ATmega328P TWI) ---`,
        `ldi r16, ${twbrVal}            ; TWBR Bit Rate Register (${isFast ? '400 kHz' : '100 kHz'}) [1 ciklus]`,
        `sts 0xB8, r16                 ; TWBR regiszter beállítása [2 ciklus]`,
        `clr r16                       ; TWSR Prescaler = 1 (TWPS0=0, TWPS1=0) [1 ciklus]`,
        `sts 0xB9, r16                 ; TWSR regiszter beállítása [2 ciklus]`,
        `ldi r16, (1<<2)               ; TWEN = 1 (TWI Hardver Engedélyezése) [1 ciklus]`,
        `sts 0xBC, r16                 ; TWCR regiszter beállítása [2 ciklus]`,
      ];
    },
    generateC: (params) => {
      const isFast = params.speed === '400k';
      return [
        `// I2C Master üzemmód (Wire / TWI):`,
        `Wire.begin();                  // Masterként csatlakozik az I2C buszhoz`,
        `Wire.setClock(${isFast ? '400000' : '100000'}); // ${isFast ? '400 kHz Fast' : '100 kHz Standard'} órajel`,
        `// Közvetlen regiszterek: TWBR = ${isFast ? '12' : '72'}; TWSR = 0; TWCR = (1 << TWEN);`,
      ];
    },
    generateInlineAsm: (params) => {
      const twbrVal = params.speed === '400k' ? '12' : '72';
      return [
        `__asm__ __volatile__ (`,
        `  "ldi r16, ${twbrVal}\\n\\t"`,
        `  "sts 0xB8, r16\\n\\t"      // TWBR`,
        `  "clr r16\\n\\t"`,
        `  "sts 0xB9, r16\\n\\t"      // TWSR (Prescaler = 1)`,
        `  "ldi r16, (1<<2)\\n\\t"    // TWEN=1`,
        `  "sts 0xBC, r16\\n\\t"      // TWCR`,
        `  ::: "r16"`,
        `);`,
      ];
    },
    explanationHu: (params) => {
      return `Az ATmega328P Two-Wire Interface (TWI/I2C) hardvere Master módban az SCL órajelet generálja. A TWBR (Bit Rate Register) és TWSR előosztó határozza meg a frekvenciát: F_SCL = 16MHz / (16 + 2*TWBR * Prescaler). 72 esetén pontosan 100 kHz-es, míg 12 esetén 400 kHz-es átvitelt kapunk.`;
    },
  },

  ms_i2c_master_write_packet: {
    type: 'ms_i2c_master_write_packet',
    category: 'master_slave',
    name: '📤 I2C Master Adatküldés Slave-nek',
    shortDesc: 'START -> Slave Cím (W) -> Regiszter / Adatbájtok -> STOP küldése',
    icon: 'Share2',
    color: 'orange',
    accentColor: '#ea580c',
    params: [
      {
        key: 'slaveAddress',
        label: 'Cél Slave Cím (HEX)',
        type: 'text',
        defaultValue: '0x08',
      },
      {
        key: 'regAddress',
        label: 'Belső Regiszter Cím (HEX)',
        type: 'text',
        defaultValue: '0x00',
      },
      {
        key: 'dataByte',
        label: 'Küldendő Adatbájt',
        type: 'number',
        defaultValue: 100,
        unit: '0-255',
      },
    ],
    defaultParams: { slaveAddress: '0x08', regAddress: '0x00', dataByte: 100 },
    calculateCycles: () => 48,
    generateAsm: (params, labelSuffix = '1') => {
      const sAddr = params.slaveAddress || '0x08';
      const reg = params.regAddress || '0x00';
      const val = params.dataByte || 100;
      return [
        `; --- I2C Master Transmit Csomag: Cím = ${sAddr}, Reg = ${reg}, Adat = ${val} ---`,
        `; 1. START feltétel küldése`,
        `ldi r16, (1<<7)|(1<<5)|(1<<2) ; TWINT=1, TWSTA=1, TWEN=1`,
        `sts 0xBC, r16                 ; TWCR START kiküldése`,
        `wait_start_${labelSuffix}:`,
        `lds r16, 0xBC                 ; TWCR állapot olvasása`,
        `sbrs r16, 7                   ; Várakozás amíg TWINT magas lesz`,
        `rjmp wait_start_${labelSuffix}`,
        ``,
        `; 2. Slave Cím + Write bit (SLA+W)`,
        `ldi r16, (${sAddr} << 1)     ; Slave cím balra tolva + Write (0)`,
        `sts 0xBB, r16                 ; TWDR adatregiszter betöltése`,
        `ldi r16, (1<<7)|(1<<2)        ; TWINT=1, TWEN=1 (Átvitel indítása)`,
        `sts 0xBC, r16`,
        `wait_sla_${labelSuffix}:`,
        `lds r16, 0xBC`,
        `sbrs r16, 7`,
        `rjmp wait_sla_${labelSuffix}`,
        ``,
        `; 3. Belső Regiszter Cím átvitele`,
        `ldi r16, ${reg}               ; Regiszter mutató küldése`,
        `sts 0xBB, r16`,
        `ldi r16, (1<<7)|(1<<2)`,
        `sts 0xBC, r16`,
        `wait_reg_${labelSuffix}:`,
        `lds r16, 0xBC`,
        `sbrs r16, 7`,
        `rjmp wait_reg_${labelSuffix}`,
        ``,
        `; 4. Adatbájt küldése`,
        `ldi r16, ${val}               ; Adatbájt érték (${val})`,
        `sts 0xBB, r16`,
        `ldi r16, (1<<7)|(1<<2)`,
        `sts 0xBC, r16`,
        `wait_data_${labelSuffix}:`,
        `lds r16, 0xBC`,
        `sbrs r16, 7`,
        `rjmp wait_data_${labelSuffix}`,
        ``,
        `; 5. STOP feltétel kiadása`,
        `ldi r16, (1<<7)|(1<<4)|(1<<2) ; TWINT=1, TWSTO=1, TWEN=1`,
        `sts 0xBC, r16`,
      ];
    },
    generateC: (params) => {
      return [
        `// I2C Master küldés a(z) ${params.slaveAddress} című Slave-nek:`,
        `Wire.beginTransmission(${params.slaveAddress});`,
        `Wire.write(${params.regAddress}); // Belső regiszter mutató`,
        `Wire.write(${params.dataByte});   // Adat (${params.dataByte})`,
        `Wire.endTransmission();  // STOP feltétel és ACK ellenőrzés`,
      ];
    },
    generateInlineAsm: (params, labelSuffix = '1') => {
      return [
        `// Inline Master I2C Transmit to ${params.slaveAddress}`,
        `Wire.beginTransmission(${params.slaveAddress});`,
        `Wire.write(${params.regAddress});`,
        `Wire.write(${params.dataByte});`,
        `Wire.endTransmission();`,
      ];
    },
    explanationHu: (params) => {
      return `A Master eszköz a buszon START feltételt ad ki, megcímezi a(z) ${params.slaveAddress} című Slave eszközt írási szándékkal (SLA+W), megvárja az ACK visszaigazolást, majd átküldi a belső regiszter címet (${params.regAddress}) és az adatbájtot (${params.dataByte}). Végül STOP feltétellel felszabadítja a buszt.`;
    },
  },

  ms_i2c_master_read_packet: {
    type: 'ms_i2c_master_read_packet',
    category: 'master_slave',
    name: '📥 I2C Master Adatkérés Slave-től',
    shortDesc: 'START -> Slave Cím (R) -> Bájt fogadása r16-ba -> NACK & STOP',
    icon: 'Radio',
    color: 'orange',
    accentColor: '#ea580c',
    params: [
      {
        key: 'slaveAddress',
        label: 'Slave Cím (HEX)',
        type: 'text',
        defaultValue: '0x08',
      },
      {
        key: 'destRegister',
        label: 'Fogadó Munkaregiszter',
        type: 'register',
        defaultValue: 'r16',
      },
      {
        key: 'requestBytes',
        label: 'Kért Bájtok Száma',
        type: 'number',
        defaultValue: 1,
        unit: 'bájt',
      },
    ],
    defaultParams: { slaveAddress: '0x08', destRegister: 'r16', requestBytes: 1 },
    calculateCycles: () => 36,
    generateAsm: (params, labelSuffix = '1') => {
      const sAddr = params.slaveAddress || '0x08';
      const destReg = params.destRegister || 'r16';
      return [
        `; --- I2C Master Adat Kiolvasása: Slave = ${sAddr} -> ${destReg} ---`,
        `; 1. START kiadása`,
        `ldi r16, (1<<7)|(1<<5)|(1<<2)`,
        `sts 0xBC, r16`,
        `wait_rstart_${labelSuffix}:`,
        `lds r16, 0xBC`,
        `sbrs r16, 7`,
        `rjmp wait_rstart_${labelSuffix}`,
        ``,
        `; 2. Slave Cím + READ bit (SLA+R)`,
        `ldi r16, (${sAddr} << 1) | 1  ; Read bit (1) beállítása`,
        `sts 0xBB, r16`,
        `ldi r16, (1<<7)|(1<<2)`,
        `sts 0xBC, r16`,
        `wait_rsla_${labelSuffix}:`,
        `lds r16, 0xBC`,
        `sbrs r16, 7`,
        `rjmp wait_rsla_${labelSuffix}`,
        ``,
        `; 3. Adat fogadása NACK-kal (egyetlen bájt után STOP következik)`,
        `ldi r16, (1<<7)|(1<<2)        ; TWINT=1, TWEN=1 (TWEA=0: NACK válasz)`,
        `sts 0xBC, r16`,
        `wait_rdata_${labelSuffix}:`,
        `lds r16, 0xBC`,
        `sbrs r16, 7`,
        `rjmp wait_rdata_${labelSuffix}`,
        `lds ${destReg}, 0xBB           ; Beérkezett adat átmásolása TWDR -> ${destReg}`,
        ``,
        `; 4. STOP feltétel`,
        `ldi r16, (1<<7)|(1<<4)|(1<<2)`,
        `sts 0xBC, r16`,
      ];
    },
    generateC: (params) => {
      return [
        `// I2C Master adatkérés a(z) ${params.slaveAddress} Slave eszköztől:`,
        `Wire.requestFrom(${params.slaveAddress}, ${params.requestBytes});`,
        `if (Wire.available()) {`,
        `  uint8_t receivedByte = Wire.read(); // Fogadott bájt: ${params.destRegister}`,
        `}`,
      ];
    },
    generateInlineAsm: (params) => {
      return [
        `Wire.requestFrom(${params.slaveAddress}, ${params.requestBytes});`,
        `uint8_t rVal = Wire.read();`,
      ];
    },
    explanationHu: (params) => {
      return `A Master SLA+R címzéssel jelzi az adatkiolvasási szándékát. A Slave visszaigazolja a jelenlétét, majd a Master által generált órajelekre kiküldi az adatbájtot. A Master NACK válasszal jelzi az átvitel végét, majd STOP jellel zárja a tranzakciót.`;
    },
  },

  ms_i2c_slave_init: {
    type: 'ms_i2c_slave_init',
    category: 'master_slave',
    name: '🛡️ I2C Slave Cím & Mód Beállítása',
    shortDesc: 'Mikrokontroller konfigurálása I2C Slave-ként saját címmel (TWAR)',
    icon: 'Radio',
    color: 'orange',
    accentColor: '#ea580c',
    params: [
      {
        key: 'ownAddress',
        label: 'Saját Slave Cím (HEX)',
        type: 'text',
        defaultValue: '0x08',
      },
      {
        key: 'enableGeneralCall',
        label: 'General Call (0x00) Engedélyezése',
        type: 'boolean',
        defaultValue: false,
      },
      {
        key: 'enableInterrupt',
        label: 'Hardveres TWI Megszakítás (TWIE)',
        type: 'boolean',
        defaultValue: true,
      },
    ],
    defaultParams: { ownAddress: '0x08', enableGeneralCall: false, enableInterrupt: true },
    calculateCycles: () => 6,
    generateAsm: (params) => {
      const addr = params.ownAddress || '0x08';
      const gencall = params.enableGeneralCall ? '1' : '0';
      const twie = params.enableInterrupt ? '(1<<0)' : '0';
      return [
        `; --- I2C Slave Üzemmód Beállítása: Cím = ${addr} ---`,
        `ldi r16, (${addr} << 1) | ${gencall} ; TWAR címregiszter (TWGCE=${gencall})`,
        `sts 0xBA, r16                 ; TWAR regiszter (0xBA) beírása [2 ciklus]`,
        `ldi r16, (1<<7)|(1<<6)|(1<<2)|${twie} ; TWINT=1, TWEA=1 (ACK engedélyezése), TWEN=1`,
        `sts 0xBC, r16                 ; TWCR regiszter (0xBC) aktiválása [2 ciklus]`,
      ];
    },
    generateC: (params) => {
      return [
        `// I2C Slave üzemmód inicializálása (${params.ownAddress} címen):`,
        `Wire.begin(${params.ownAddress});`,
        `Wire.onReceive(i2cSlaveReceiveHandler); // Adatfogadás eseménykezelő`,
        `Wire.onRequest(i2cSlaveRequestHandler); // Adatkérés eseménykezelő`,
      ];
    },
    generateInlineAsm: (params) => {
      const addr = params.ownAddress || '0x08';
      return [
        `__asm__ __volatile__ (`,
        `  "ldi r16, (${addr} << 1)\\n\\t"`,
        `  "sts 0xBA, r16\\n\\t"      // TWAR`,
        `  "ldi r16, (1<<7)|(1<<6)|(1<<2)\\n\\t" // TWINT, TWEA (ACK), TWEN`,
        `  "sts 0xBC, r16\\n\\t"      // TWCR`,
        `  ::: "r16"`,
        `);`,
      ];
    },
    explanationHu: (params) => {
      return `Az ATmega328P TWAR (TWI Address Register) regiszterének beállításával a mikrokontroller Slave módba kapcsol. A TWEA (TWI Enable Acknowledge) bit 1-re állításával automatikusan hardveres ACK választ küld, valahányszor a buszon egy Master a megadott (${params.ownAddress}) címet hívja meg.`;
    },
  },

  ms_i2c_slave_listen_respond: {
    type: 'ms_i2c_slave_listen_respond',
    category: 'master_slave',
    name: '💬 I2C Slave Válasz / Adatfogadás',
    shortDesc: 'TWSR állapotgép: bejövő Master parancs olvasása és válaszbájt betöltése',
    icon: 'Radio',
    color: 'orange',
    accentColor: '#ea580c',
    params: [
      {
        key: 'replyByte',
        label: 'Válaszbájt Master Kérésére',
        type: 'number',
        defaultValue: 42,
        unit: '0-255',
      },
      {
        key: 'storeRegister',
        label: 'Fogadott Parancs Regisztere',
        type: 'register',
        defaultValue: 'r18',
      },
    ],
    defaultParams: { replyByte: 42, storeRegister: 'r18' },
    calculateCycles: () => 14,
    generateAsm: (params, labelSuffix = '1') => {
      const reply = params.replyByte || 42;
      const storeReg = params.storeRegister || 'r18';
      return [
        `; --- I2C Slave Válasz & Állapotgép Ellenőrzés ---`,
        `lds r16, 0xBC                 ; TWCR olvasása`,
        `sbrs r16, 7                   ; TWINT befejeződött?`,
        `rjmp skip_slave_${labelSuffix}`,
        `lds r17, 0xB9                 ; TWSR Státuszregiszter olvasása`,
        `andi r17, 0xF8                ; Alsó 3 prescaler bit maszkolása`,
        `cpi r17, 0x80                 ; 0x80 = Slave adat fogadva ACK-kal (SLA+W után)`,
        `brne check_req_${labelSuffix}`,
        `lds ${storeReg}, 0xBB         ; Fogadott bájt átvétele TWDR -> ${storeReg}`,
        `rjmp clear_twint_${labelSuffix}`,
        `check_req_${labelSuffix}:`,
        `cpi r17, 0xA8                 ; 0xA8 = Slave megcímezve olvasásra (SLA+R)`,
        `brne clear_twint_${labelSuffix}`,
        `ldi r16, ${reply}             ; Válaszbájt előkészítése TWDR-be`,
        `sts 0xBB, r16`,
        `clear_twint_${labelSuffix}:`,
        `ldi r16, (1<<7)|(1<<6)|(1<<2) ; TWINT=1, TWEA=1, TWEN=1 (Busz újraindítása)`,
        `sts 0xBC, r16`,
        `skip_slave_${labelSuffix}:`,
      ];
    },
    generateC: (params) => {
      return [
        `void i2cSlaveReceiveHandler(int numBytes) {`,
        `  while (Wire.available()) {`,
        `    uint8_t cmd = Wire.read(); // ${params.storeRegister} regiszterbe`,
        `  }`,
        `}`,
        `void i2cSlaveRequestHandler() {`,
        `  Wire.write(${params.replyByte}); // Válasz kiküldése a Masternek (${params.replyByte})`,
        `}`,
      ];
    },
    generateInlineAsm: (params) => {
      return [`// Inline I2C Slave Response Handlers`];
    },
    explanationHu: (params) => {
      return `Az I2C Slave hardver állapotgépe a TWSR regiszter felső 5 bitjében jelzi a busz állapotát: 0x80 státusz jelenti, hogy a Master adatot írt be a Slave-nek; míg 0xA8 státusz jelzi, hogy a Master adatot kér tőlünk. A Slave azonnal betölti a válaszbájtot (${params.replyByte}) a TWDR regiszterbe.`;
    },
  },

  ms_spi_master_init: {
    type: 'ms_spi_master_init',
    category: 'master_slave',
    name: '👑 SPI Master Inicializálás',
    shortDesc: 'Hardveres SPI Master mód, MOSI/SCK kimenetek és SS vezérlés',
    icon: 'Sparkles',
    color: 'orange',
    accentColor: '#ea580c',
    params: [
      {
        key: 'clockDiv',
        label: 'SPI Órajel Sebesség',
        type: 'select',
        options: [
          { label: 'fosc / 4 (4.0 MHz)', value: 'DIV_4' },
          { label: 'fosc / 16 (1.0 MHz)', value: 'DIV_16' },
          { label: 'fosc / 64 (250 kHz)', value: 'DIV_64' },
          { label: 'fosc / 2 (8.0 MHz Double Speed)', value: 'DIV_2' },
        ],
        defaultValue: 'DIV_4',
      },
      {
        key: 'spiMode',
        label: 'SPI Mód (CPOL / CPHA)',
        type: 'select',
        options: [
          { label: 'Mode 0 (CPOL=0, CPHA=0)', value: 'MODE_0' },
          { label: 'Mode 1 (CPOL=0, CPHA=1)', value: 'MODE_1' },
          { label: 'Mode 2 (CPOL=1, CPHA=0)', value: 'MODE_2' },
          { label: 'Mode 3 (CPOL=1, CPHA=1)', value: 'MODE_3' },
        ],
        defaultValue: 'MODE_0',
      },
    ],
    defaultParams: { clockDiv: 'DIV_4', spiMode: 'MODE_0' },
    calculateCycles: () => 8,
    generateAsm: (params) => {
      return [
        `; --- SPI Master Inicializálása (ATmega328P) ---`,
        `sbi 0x04, 2                   ; DDRB.2 (D10 / SS) = OUTPUT (Kimenet)`,
        `sbi 0x05, 2                   ; PORTB.2 (SS) = HIGH (Inaktív Slave)`,
        `sbi 0x04, 3                   ; DDRB.3 (D11 / MOSI) = OUTPUT`,
        `cbi 0x04, 4                   ; DDRB.4 (D12 / MISO) = INPUT (Bemenet)`,
        `sbi 0x04, 5                   ; DDRB.5 (D13 / SCK) = OUTPUT`,
        `ldi r16, (1<<6)|(1<<4)        ; SPCR: SPE=1 (SPI Enable), MSTR=1 (Master)`,
        `out 0x2C, r16                 ; SPCR regiszter (0x2C) beállítása [1 ciklus]`,
      ];
    },
    generateC: (params) => {
      return [
        `// SPI Master Inicializálás:`,
        `#include <SPI.h>`,
        `pinMode(10, OUTPUT);`,
        `digitalWrite(10, HIGH);        // Slave Select inaktív`,
        `SPI.begin();`,
        `SPI.beginTransaction(SPISettings(4000000, MSBFIRST, SPI_MODE0));`,
      ];
    },
    generateInlineAsm: (params) => {
      return [
        `__asm__ __volatile__ (`,
        `  "sbi 0x04, 2\\n\\t"          // DDRB.2 (SS) = OUTPUT`,
        `  "sbi 0x05, 2\\n\\t"          // PORTB.2 (SS) = HIGH`,
        `  "sbi 0x04, 3\\n\\t"          // MOSI = OUTPUT`,
        `  "sbi 0x04, 5\\n\\t"          // SCK = OUTPUT`,
        `  "ldi r16, (1<<6)|(1<<4)\\n\\t" // SPE=1, MSTR=1`,
        `  "out 0x2C, r16\\n\\t"        // SPCR`,
        `  ::: "r16"`,
        `);`,
      ];
    },
    explanationHu: (params) => {
      return `Az SPI Master üzemmódban az ATmega328P vezérli a közös SCK órajelet, a MOSI kimenetet és a kiválasztott Slave eszköz SS (Slave Select) lábát. A hardveres SPI periféria akár 4-8 MHz-es sebességen képes bájtokat küldeni és egyidejűleg fogadni.`;
    },
  },

  ms_spi_slave_init: {
    type: 'ms_spi_slave_init',
    category: 'master_slave',
    name: '🛡️ SPI Slave Inicializálás',
    shortDesc: 'Mikrokontroller beállítása SPI Slave-ként (MISO kimenet, MSTR=0)',
    icon: 'Sparkles',
    color: 'orange',
    accentColor: '#ea580c',
    params: [
      {
        key: 'enableInterrupt',
        label: 'SPI Megszakítás (SPIE)',
        type: 'boolean',
        defaultValue: true,
      },
      {
        key: 'initialReply',
        label: 'Kezdő Válaszbájt (SPDR)',
        type: 'number',
        defaultValue: 0x55,
      },
    ],
    defaultParams: { enableInterrupt: true, initialReply: 0x55 },
    calculateCycles: () => 6,
    generateAsm: (params) => {
      const spie = params.enableInterrupt ? '(1<<7)|' : '';
      const reply = params.initialReply || 0x55;
      return [
        `; --- SPI Slave Inicializálás (ATmega328P) ---`,
        `cbi 0x04, 2                   ; DDRB.2 (D10 / SS) = INPUT`,
        `cbi 0x04, 3                   ; DDRB.3 (D11 / MOSI) = INPUT`,
        `sbi 0x04, 4                   ; DDRB.4 (D12 / MISO) = OUTPUT (Slave Kimenet)`,
        `cbi 0x04, 5                   ; DDRB.5 (D13 / SCK) = INPUT`,
        `ldi r16, ${spie}(1<<6)        ; SPCR: ${spie ? 'SPIE=1, ' : ''}SPE=1, MSTR=0 (Slave Mód)`,
        `out 0x2C, r16                 ; SPCR regiszter beírása`,
        `ldi r16, ${reply}             ; Kezdő válaszbájt előkészítése`,
        `out 0x2E, r16                 ; SPDR adatregiszter betöltése`,
      ];
    },
    generateC: (params) => {
      return [
        `// SPI Slave Mód Inicializálás:`,
        `pinMode(MISO, OUTPUT);        // D12 MISO legyen kimenet`,
        `pinMode(MOSI, INPUT);         // D11 MOSI bemenet`,
        `pinMode(SCK, INPUT);          // D13 SCK bemenet`,
        `pinMode(SS, INPUT);           // D10 SS bemenet`,
        `SPCR = (1 << SPE) | (1 << SPIE); // SPI engedélyezése Slave módban megszakítással`,
        `SPDR = ${params.initialReply}; // Első válaszbájt betöltése`,
      ];
    },
    generateInlineAsm: (params) => {
      return [`// Inline SPI Slave Init`];
    },
    explanationHu: (params) => {
      return `SPI Slave módban az ATmega328P passzívan figyeli a Master által küldött SCK órajelet és az SS láb LOW állapotát. A választ a mikrokontroller előre betölti az SPDR regiszterbe, így amint a Master átküld 8 bitet a MOSI-n, a Slave válasza azonnal kimegy a MISO vonalon.`;
    },
  },

  ms_nrf24_master_init: {
    type: 'ms_nrf24_master_init',
    category: 'master_slave',
    name: '👑 NRF24 Master Hub Inicializálás (2.4GHz)',
    shortDesc: 'NRF24L01+ adó mód, RF csatorna, sebesség és Master adó cső (TX Pipe) beállítása',
    icon: 'Radio',
    color: 'orange',
    accentColor: '#ea580c',
    params: [
      {
        key: 'channel',
        label: 'RF Csatorna (0 - 125)',
        type: 'number',
        defaultValue: 76,
        description: '2400 + CH MHz (pl. 76 = 2476 MHz)',
      },
      {
        key: 'dataRate',
        label: 'Adatátviteli Sebesség',
        type: 'select',
        options: [
          { label: '2 Mbps (Nagysebességű, alacsony késleltetés)', value: 'RF24_2MBPS' },
          { label: '1 Mbps (Standard)', value: 'RF24_1MBPS' },
          { label: '250 kbps (Nagy hatótávolság)', value: 'RF24_250KBPS' },
        ],
        defaultValue: 'RF24_2MBPS',
      },
      {
        key: 'txPower',
        label: 'Adóteljesítmény',
        type: 'select',
        options: [
          { label: 'Max (0 dBm - Maximális távolság)', value: 'RF24_PA_MAX' },
          { label: 'High (-6 dBm)', value: 'RF24_PA_HIGH' },
          { label: 'Low (-12 dBm)', value: 'RF24_PA_LOW' },
          { label: 'Min (-18 dBm - Asztali teszt)', value: 'RF24_PA_MIN' },
        ],
        defaultValue: 'RF24_PA_MAX',
      },
      {
        key: 'masterAddress',
        label: 'Master Alapértelmezett Cím (HEX Pipe)',
        type: 'text',
        defaultValue: '0xE8E8F0F0E1',
      },
    ],
    defaultParams: {
      channel: 76,
      dataRate: 'RF24_2MBPS',
      txPower: 'RF24_PA_MAX',
      masterAddress: '0xE8E8F0F0E1',
    },
    calculateCycles: () => 450,
    generateAsm: (params) => {
      const ch = params.channel || 76;
      const addr = params.masterAddress || '0xE8E8F0F0E1';
      return [
        `; --- NRF24L01+ Master Hub Rádió Init (Csatorna: ${ch}, Cím: ${addr}) ---`,
        `; 1. SPI inicializálása és CSN/CE lábak kimenetre állítása`,
        `sbi 0x05, 2                   ; PORTB.2 (CSN / D10) = HIGH (Inaktív)`,
        `cbi 0x05, 1                   ; PORTB.1 (CE / D9) = LOW (Készenlét)`,
        `; 2. CONFIG regiszter (0x00): EN_CRC=1, CRCO=1 (2 bájt), PWR_UP=1, PRIM_RX=0 (TX Mód)`,
        `ldi r24, 0x20 | 0x00          ; W_REGISTER | CONFIG`,
        `call spi_transfer`,
        `ldi r24, 0x0E                 ; PWR_UP=1, PRIM_RX=0`,
        `call spi_transfer`,
        `; 3. RF_CH (0x05): Csatorna = ${ch}`,
        `ldi r24, 0x20 | 0x05`,
        `call spi_transfer`,
        `ldi r24, ${ch}`,
        `call spi_transfer`,
        `; 4. TX_ADDR (0x10): Master küldési cső címzés`,
        `ldi r24, 0x20 | 0x10`,
        `call spi_transfer`,
        `ldi r24, 0xE1                 ; Cím bájt 0`,
        `call spi_transfer`,
      ];
    },
    generateC: (params) => {
      const ch = params.channel || 76;
      const rate = params.dataRate || 'RF24_2MBPS';
      const pwr = params.txPower || 'RF24_PA_MAX';
      const addr = params.masterAddress || '0xE8E8F0F0E1';
      return [
        `// NRF24 Master Hub Rádió Inicializálás:`,
        `#include <RF24.h>`,
        `RF24 radio(9, 10); // CE=D9, CSN=D10`,
        `radio.begin();`,
        `radio.setChannel(${ch});`,
        `radio.setDataRate(${rate});`,
        `radio.setPALevel(${pwr});`,
        `radio.openWritingPipe(${addr}LL);`,
        `radio.stopListening(); // Master küldési (TX) mód beállítása`,
      ];
    },
    generateInlineAsm: (params) => {
      return [`// Inline NRF24 Master Setup`];
    },
    explanationHu: (params) => {
      return `Az NRF24 Master Hub üzemmódban az ATmega328P Enhanced ShockBurst™ módban küldi a csomagokat a rádiós csatornán (${params.channel}). Amikor egy Slave csomópontnak adatot továbbít, a rádió automatikusan megvárja a Slave hardveres Auto-ACK válaszát.`;
    },
  },

  ms_nrf24_master_send_packet: {
    type: 'ms_nrf24_master_send_packet',
    category: 'master_slave',
    name: '📤 NRF24 Master Csomagküldés Slave-nek',
    shortDesc: 'Megcímzett adatcsomag küldése Slave csomópontnak rádiós Auto-ACK ellenőrzéssel',
    icon: 'Radio',
    color: 'orange',
    accentColor: '#ea580c',
    params: [
      {
        key: 'slavePipeAddress',
        label: 'Cél Slave Pipe Cím (HEX)',
        type: 'text',
        defaultValue: '0xE8E8F0F001',
      },
      {
        key: 'payloadType',
        label: 'Csomag Típusa',
        type: 'select',
        options: [
          { label: 'Szöveges Parancs (pl. NODE1_SET_SPEED)', value: 'TEXT' },
          { label: 'Regiszter Adat (pl. r24 ADC/Mérési érték)', value: 'REGISTER' },
        ],
        defaultValue: 'TEXT',
      },
      {
        key: 'payloadText',
        label: 'Parancs Szöveg',
        type: 'text',
        defaultValue: 'NODE1_ON',
      },
      {
        key: 'srcRegister',
        label: 'Forrás Regiszter (ha Regiszter Adat)',
        type: 'register',
        defaultValue: 'r24',
      },
    ],
    defaultParams: {
      slavePipeAddress: '0xE8E8F0F001',
      payloadType: 'TEXT',
      payloadText: 'NODE1_ON',
      srcRegister: 'r24',
    },
    calculateCycles: () => 180,
    generateAsm: (params, labelSuffix = '1') => {
      const sAddr = params.slavePipeAddress || '0xE8E8F0F001';
      const isText = params.payloadType === 'TEXT';
      const text = params.payloadText || 'NODE1_ON';
      const reg = params.srcRegister || 'r24';
      return [
        `; --- NRF24 Master Csomagküldés -> Slave: ${sAddr} ---`,
        `cbi 0x05, 2                   ; CSN LOW (D10)`,
        `ldi r16, 0xA0                 ; W_TX_PAYLOAD SPI Parancs`,
        `call spi_transfer`,
        ...(isText
          ? [
              `ldi r16, '${text.charAt(0)}'          ; Csomag payload bájt`,
              `call spi_transfer`,
            ]
          : [
              `mov r16, ${reg}               ; Regiszter (${reg}) átvitele a TX payloadba`,
              `call spi_transfer`,
            ]),
        `sbi 0x05, 2                   ; CSN HIGH`,
        `; 10 µs CE rádiós adási impulzus:`,
        `sbi 0x05, 1                   ; CE HIGH (D9)`,
        `call delay_10us`,
        `cbi 0x05, 1                   ; CE LOW`,
        `; Státusz ellenőrzés (TX_DS = Sikeres átvitel ACK-kal):`,
        `lds r16, 0x07                 ; STATUS regiszter olvasás`,
      ];
    },
    generateC: (params) => {
      const sAddr = params.slavePipeAddress || '0xE8E8F0F001';
      const isText = params.payloadType === 'TEXT';
      const text = params.payloadText || 'NODE1_ON';
      const reg = params.srcRegister || 'r24';
      return [
        `// NRF24 Master adás a Slave csőre:`,
        `radio.openWritingPipe(${sAddr}LL);`,
        isText
          ? `const char payload[] = "${text}";\nbool success = radio.write(&payload, sizeof(payload));`
          : `uint8_t payload = ${reg};\nbool success = radio.write(&payload, sizeof(payload));`,
        `if (success) {`,
        `  // Slave fogadta és azonnal visszaigazolta (Auto-ACK OK)`,
        `}`,
      ];
    },
    generateInlineAsm: (params) => {
      return [`// Inline NRF24 Master Transmit`];
    },
    explanationHu: (params) => {
      return `A Master a megadott Slave pipe címre továbbítja a hasznos terhet (payload). Az NRF24 hardver a 2.4 GHz-es frekvencián kiküldi a rádiócsomagot, és automatikusan ellenőrzi a Slave hardveres ACK válaszát (TX_DS státuszbit).`;
    },
  },

  ms_nrf24_slave_init: {
    type: 'ms_nrf24_slave_init',
    category: 'master_slave',
    name: '🛡️ NRF24 Slave Csomópont Init (Vevő & Auto-ACK)',
    shortDesc: 'NRF24L01+ Slave vevő üzemmódba állítása saját adatcső címmel (RX Pipe 1..5)',
    icon: 'Radio',
    color: 'orange',
    accentColor: '#ea580c',
    params: [
      {
        key: 'channel',
        label: 'RF Csatorna (0 - 125)',
        type: 'number',
        defaultValue: 76,
      },
      {
        key: 'pipeIndex',
        label: 'Dedikált Fogadó Cső Index (Pipe 1 - 5)',
        type: 'select',
        options: [
          { label: 'Pipe 1 (0xE8E8F0F001)', value: '1' },
          { label: 'Pipe 2 (0xE8E8F0F002)', value: '2' },
          { label: 'Pipe 3 (0xE8E8F0F003)', value: '3' },
          { label: 'Pipe 4 (0xE8E8F0F004)', value: '4' },
        ],
        defaultValue: '1',
      },
      {
        key: 'slaveAddress',
        label: 'Saját Slave Pipe Cím (HEX)',
        type: 'text',
        defaultValue: '0xE8E8F0F001',
      },
      {
        key: 'enableAutoAck',
        label: 'Hardveres Auto-ACK Nyugtázás',
        type: 'boolean',
        defaultValue: true,
      },
    ],
    defaultParams: {
      channel: 76,
      pipeIndex: '1',
      slaveAddress: '0xE8E8F0F001',
      enableAutoAck: true,
    },
    calculateCycles: () => 450,
    generateAsm: (params) => {
      const ch = params.channel || 76;
      const pIdx = params.pipeIndex || '1';
      const addr = params.slaveAddress || '0xE8E8F0F001';
      return [
        `; --- NRF24L01+ Slave Vevő Csomópont Init (Pipe ${pIdx}: ${addr}) ---`,
        `; 1. CONFIG regiszter: PRIM_RX=1 (Vevő mód), PWR_UP=1`,
        `ldi r24, 0x20 | 0x00          ; W_REGISTER | CONFIG`,
        `call spi_transfer`,
        `ldi r24, 0x0F                 ; PWR_UP=1, PRIM_RX=1 (Folyamatos Vétel)`,
        `call spi_transfer`,
        `; 2. RX_ADDR_P${pIdx} cső címének beállítása`,
        `ldi r24, 0x20 | (0x0A + ${pIdx})`,
        `call spi_transfer`,
        `ldi r24, 0x01                 ; Alsó címbájt`,
        `call spi_transfer`,
        `; 3. RX_PW_P${pIdx} Hasznos teher szélesség (Payload Width = 32 bájt)`,
        `ldi r24, 0x20 | (0x11 + ${pIdx})`,
        `call spi_transfer`,
        `ldi r24, 32`,
        `call spi_transfer`,
        `; 4. CE HIGH: Vételi állapot bekapcsolása`,
        `sbi 0x05, 1                   ; PORTB.1 (CE / D9) = HIGH (Listening)`,
      ];
    },
    generateC: (params) => {
      const ch = params.channel || 76;
      const pIdx = params.pipeIndex || '1';
      const addr = params.slaveAddress || '0xE8E8F0F001';
      return [
        `// NRF24 Slave Csomópont Inicializálás:`,
        `#include <RF24.h>`,
        `RF24 radio(9, 10); // CE=D9, CSN=D10`,
        `radio.begin();`,
        `radio.setChannel(${ch});`,
        `radio.openReadingPipe(${pIdx}, ${addr}LL);`,
        `radio.startListening(); // Slave vevő üzemmód indítása`,
      ];
    },
    generateInlineAsm: (params) => {
      return [`// Inline NRF24 Slave Receiver Setup`];
    },
    explanationHu: (params) => {
      return `Az NRF24 Slave állandó vételi üzemmódban (Listening) tartja a rádióvevőt. Amikor a Master megszólítja a Slave-hez rendelt Pipe címen (${params.slaveAddress}), a chip azonnal hardveres ACK nyugtát küld vissza a Masternek, és a beérkezett csomagot az RX FIFO pufferbe helyezi.`;
    },
  },

  ms_nrf24_slave_receive_packet: {
    type: 'ms_nrf24_slave_receive_packet',
    category: 'master_slave',
    name: '📥 NRF24 Slave Csomagfogadás (RX FIFO)',
    shortDesc: 'Mastertől beérkezett rádiócsomag beolvasása munkaregiszterbe és RX_DR törlés',
    icon: 'Radio',
    color: 'orange',
    accentColor: '#ea580c',
    params: [
      {
        key: 'destRegister',
        label: 'Fogadó Munkaregiszter',
        type: 'register',
        defaultValue: 'r24',
      },
      {
        key: 'autoReplyAck',
        label: 'Auto-ACK válasz engedélyezve',
        type: 'boolean',
        defaultValue: true,
      },
    ],
    defaultParams: { destRegister: 'r24', autoReplyAck: true },
    calculateCycles: () => 85,
    generateAsm: (params, labelSuffix = '1') => {
      const dest = params.destRegister || 'r24';
      const lblSkip = `nrf_skip_${labelSuffix}`;
      return [
        `; --- NRF24 Slave RX Csomag Ellenőrzése és Beolvasása ---`,
        `cbi 0x05, 2                   ; CSN LOW`,
        `ldi r16, 0xFF                 ; NOP parancs (STATUS regiszter lekérdezése)`,
        `call spi_transfer`,
        `sbi 0x05, 2                   ; CSN HIGH`,
        `sbrs r16, 6                   ; RX_DR (bit 6: Data Ready) vizsgálata`,
        `rjmp ${lblSkip}                ; Ha nincs új csomag, kihagyjuk`,
        `; Csomag kiolvasása RX FIFO-ból:`,
        `cbi 0x05, 2                   ; CSN LOW`,
        `ldi r16, 0x61                 ; R_RX_PAYLOAD SPI Parancs`,
        `call spi_transfer`,
        `ldi r16, 0xFF                 ; Dummy bájt az adat kiolvasásához`,
        `call spi_transfer`,
        `mov ${dest}, r16              ; Beérkezett parancsbájt mentése -> ${dest}`,
        `sbi 0x05, 2                   ; CSN HIGH`,
        `; RX_DR jelzőbit törlése:`,
        `cbi 0x05, 2`,
        `ldi r16, 0x20 | 0x07          ; W_REGISTER | STATUS`,
        `call spi_transfer`,
        `ldi r16, (1<<6)               ; RX_DR bit törlése`,
        `call spi_transfer`,
        `sbi 0x05, 2`,
        `${lblSkip}:`,
      ];
    },
    generateC: (params) => {
      const dest = params.destRegister || 'r24';
      return [
        `// NRF24 Slave Csomag Fogadása:`,
        `if (radio.available()) {`,
        `  uint8_t ${dest};`,
        `  radio.read(&${dest}, sizeof(${dest})); // Adat kiolvasása a rádióból`,
        `}`,
      ];
    },
    generateInlineAsm: (params) => {
      return [`// Inline NRF24 Slave RX Packet Handler`];
    },
    explanationHu: (params) => {
      return `A Slave folyamatosan figyeli a STATUS regiszter RX_DR (Data Ready) jelzőbitjét. Amint csomag érkezik a Mastertől, az 'R_RX_PAYLOAD' (0x61) SPI paranccsal áttölti a bájtos adatot az AVR ${params.destRegister} munkaregiszterébe.`;
    },
  },

  // ==========================================
  // 11. TÖMBÖK, STRUKTÚRÁK ÉS OBJEKTUMOK (ARRAYS, STRUCTS, OOP)
  // ==========================================
  ds_array_flash_lookup: {
    type: 'ds_array_flash_lookup',
    category: 'datastruct',
    name: '📊 Flash Lookup Tábla & Elem Olvasás',
    shortDesc: 'PROGMEM konstans tömb definiálása és indexelt olvasása LPM utasítással',
    icon: 'Boxes',
    color: 'teal',
    accentColor: '#0d9488',
    params: [
      {
        key: 'tableName',
        label: 'Lookup Tábla Neve',
        type: 'text',
        defaultValue: 'sine_table',
      },
      {
        key: 'values',
        label: 'Tömb Értékei (vesszővel elválasztva)',
        type: 'text',
        defaultValue: '0, 48, 90, 128, 150, 128, 90, 48',
      },
      {
        key: 'indexRegister',
        label: 'Index Regiszter',
        type: 'register',
        defaultValue: 'r17',
      },
      {
        key: 'destRegister',
        label: 'Cél Adatregiszter',
        type: 'register',
        defaultValue: 'r16',
      },
    ],
    defaultParams: {
      tableName: 'sine_table',
      values: '0, 48, 90, 128, 150, 128, 90, 48',
      indexRegister: 'r17',
      destRegister: 'r16',
    },
    calculateCycles: () => 7,
    generateAsm: (params) => {
      const name = params.tableName || 'sine_table';
      const idxReg = params.indexRegister || 'r17';
      const destReg = params.destRegister || 'r16';
      const rawVals = (params.values || '0, 48, 90, 128').split(',').map((s: string) => s.trim()).join(', ');
      return [
        `; --- Flash PROGMEM Lookup Tábla Indexelés (${name}) ---`,
        `ldi ZL, lo8(${name})          ; Z-mutató alsó bájt (r30) = tábla címe [1 ciklus]`,
        `ldi ZH, hi8(${name})          ; Z-mutató felső bájt (r31) = tábla címe [1 ciklus]`,
        `add ZL, ${idxReg}             ; Index (${idxReg}) hozzáadása a ZL címhez [1 ciklus]`,
        `adc ZH, r1                    ; Átvitel (Carry) hozzáadása ZH-hoz [1 ciklus]`,
        `lpm ${destReg}, Z             ; Load Program Memory (Flash -> ${destReg}) [3 ciklus]`,
        ``,
        `; Adattábla a Flash memóriában:`,
        `.section .progmem.data`,
        `${name}:`,
        `    .byte ${rawVals}`,
        `.section .text`,
      ];
    },
    generateC: (params) => {
      const name = params.tableName || 'sine_table';
      const rawVals = params.values || '0, 48, 90, 128, 150, 128, 90, 48';
      return [
        `// Flash memória konstans lookup tábla (PROGMEM):`,
        `const uint8_t ${name}[] PROGMEM = { ${rawVals} };`,
        `uint8_t ${params.destRegister} = pgm_read_byte(&${name}[${params.indexRegister}]);`,
      ];
    },
    generateInlineAsm: (params) => {
      return [
        `const uint8_t ${params.tableName}[] PROGMEM = { ${params.values} };`,
        `uint8_t val = pgm_read_byte(&${params.tableName}[index]);`,
      ];
    },
    explanationHu: (params) => {
      return `Az AVR mikroarchitektúrában a Flash memória nem a normál RAM adatcím-tartományban található, hanem a speciális 16-bites Z-mutatóval (r31:r30) és az LPM (Load Program Memory) utasítással érhető el. Ezzel értékes SRAM memóriát takarítunk meg nagyméretű szinusz-, karakter- vagy animációs lookup táblák tárolásakor.`;
    },
  },

  ds_array_ram_buffer: {
    type: 'ds_array_ram_buffer',
    category: 'datastruct',
    name: '📝 SRAM Adatpuffer / Dinamikus Tömb',
    shortDesc: 'RAM memóriapuffer indexelt írása és olvasása X/Y mutatóregiszterrel',
    icon: 'Boxes',
    color: 'teal',
    accentColor: '#0d9488',
    params: [
      {
        key: 'bufferName',
        label: 'RAM Puffer Neve',
        type: 'text',
        defaultValue: 'sensor_buffer',
      },
      {
        key: 'size',
        label: 'Puffer Mérete',
        type: 'number',
        defaultValue: 16,
        unit: 'bájt',
      },
      {
        key: 'operation',
        label: 'Művelet',
        type: 'select',
        options: [
          { label: 'Írás pufferbe (ST X+idx, r16)', value: 'WRITE' },
          { label: 'Olvasás pufferből (LD r16, X+idx)', value: 'READ' },
        ],
        defaultValue: 'WRITE',
      },
      {
        key: 'indexRegister',
        label: 'Index Regiszter',
        type: 'register',
        defaultValue: 'r17',
      },
      {
        key: 'dataRegister',
        label: 'Adat Regiszter',
        type: 'register',
        defaultValue: 'r16',
      },
    ],
    defaultParams: {
      bufferName: 'sensor_buffer',
      size: 16,
      operation: 'WRITE',
      indexRegister: 'r17',
      dataRegister: 'r16',
    },
    calculateCycles: () => 6,
    generateAsm: (params) => {
      const bName = params.bufferName || 'sensor_buffer';
      const isWrite = params.operation === 'WRITE';
      const idxReg = params.indexRegister || 'r17';
      const dataReg = params.dataRegister || 'r16';
      return [
        `; --- SRAM Dinamikus Tömb Művelet: ${isWrite ? 'Írás' : 'Olvasás'} (${bName}) ---`,
        `ldi XL, lo8(${bName})         ; X-mutató alsó bájt (r26) betöltése [1 ciklus]`,
        `ldi XH, hi8(${bName})         ; X-mutató felső bájt (r27) betöltése [1 ciklus]`,
        `add XL, ${idxReg}             ; Báziscím + Index eltolás (${idxReg}) [1 ciklus]`,
        `adc XH, r1                    ; Felső bájt átvitel korrekció [1 ciklus]`,
        isWrite
          ? `st X, ${dataReg}              ; Store SRAM: (${bName}[${idxReg}] = ${dataReg}) [2 ciklus]`
          : `ld ${dataReg}, X              ; Load SRAM: (${dataReg} = ${bName}[${idxReg}]) [2 ciklus]`,
        ``,
        `; RAM memóriaterület lefoglalása a BSS szekcióban:`,
        `.section .bss`,
        `${bName}:`,
        `    .skip ${params.size || 16}  ; ${params.size || 16} bájt lefoglalása az SRAM-ban`,
        `.section .text`,
      ];
    },
    generateC: (params) => {
      const bName = params.bufferName || 'sensor_buffer';
      const isWrite = params.operation === 'WRITE';
      return [
        `// SRAM tömb puffer definíció:`,
        `uint8_t ${bName}[${params.size || 16}];`,
        isWrite
          ? `${bName}[${params.indexRegister}] = ${params.dataRegister}; // Írás`
          : `uint8_t ${params.dataRegister} = ${bName}[${params.indexRegister}]; // Olvasás`,
      ];
    },
    generateInlineAsm: (params) => {
      return [`// Inline SRAM Array Access: ${params.bufferName}`];
    },
    explanationHu: (params) => {
      return `Az SRAM (Static RAM) tömbök báziscímét a 16-bites X-mutató (r27:r26) tárolja. A dinamikus index hozzáadásával megkapjuk a pontos memóriacímet, amelyet az 'ST' (Store) vagy 'LD' (Load) utasítással 2 óraciklus alatt közvetlenül manipulálhatunk.`;
    },
  },

  ds_struct_define: {
    type: 'ds_struct_define',
    category: 'datastruct',
    name: '📐 C / ASM Struktúra Mezőkkel (Struct)',
    shortDesc: 'Összetett rekord (Struct) definíciója és mező-offsetek számítása',
    icon: 'Boxes',
    color: 'teal',
    accentColor: '#0d9488',
    params: [
      {
        key: 'structName',
        label: 'Struktúra Típus Neve',
        type: 'text',
        defaultValue: 'SensorNode',
      },
      {
        key: 'field1',
        label: '1. Mező (Név : Típus)',
        type: 'text',
        defaultValue: 'node_id : uint8_t',
      },
      {
        key: 'field2',
        label: '2. Mező (Név : Típus)',
        type: 'text',
        defaultValue: 'temperature : int16_t',
      },
      {
        key: 'field3',
        label: '3. Mező (Név : Típus)',
        type: 'text',
        defaultValue: 'status_flags : uint8_t',
      },
    ],
    defaultParams: {
      structName: 'SensorNode',
      field1: 'node_id : uint8_t',
      field2: 'temperature : int16_t',
      field3: 'status_flags : uint8_t',
    },
    calculateCycles: () => 0,
    generateAsm: (params) => {
      const sName = params.structName || 'SensorNode';
      return [
        `; =============================================================`,
        `; STRUKTÚRA DEFINÍCIÓ ÉS MEZŐ ELTOLÁSOK (OFFSETEK): ${sName}`,
        `; Összesített méret: 4 bájt`,
        `; =============================================================`,
        `#define ${sName}_OFFSET_NODE_ID     0  ; uint8_t (1 bájt, Offset = 0)`,
        `#define ${sName}_OFFSET_TEMP_L      1  ; int16_t LSB (Offset = 1)`,
        `#define ${sName}_OFFSET_TEMP_H      2  ; int16_t MSB (Offset = 2)`,
        `#define ${sName}_OFFSET_STATUS      3  ; uint8_t Flags (Offset = 3)`,
        `#define ${sName}_TOTAL_SIZE         4  ; Méret bájtokban`,
        ``,
        `; Példány lefoglalása SRAM-ban:`,
        `.section .bss`,
        `current_sensor_node:`,
        `    .skip ${sName}_TOTAL_SIZE`,
        `.section .text`,
      ];
    },
    generateC: (params) => {
      const sName = params.structName || 'SensorNode';
      return [
        `// C Struktúra (Csomagolt bináris memória elrendezéssel):`,
        `struct __attribute__((__packed__)) ${sName} {`,
        `  uint8_t node_id;        // Offset 0 (1 bájt)`,
        `  int16_t temperature;    // Offset 1 (2 bájt)`,
        `  uint8_t status_flags;   // Offset 3 (1 bájt)`,
        `};`,
        `${sName} current_sensor_node; // Példányosítás`,
      ];
    },
    generateInlineAsm: (params) => {
      return [`// Struct definition for ${params.structName}`];
    },
    explanationHu: (params) => {
      return `A struktúrák egymáshoz logikailag kapcsolódó különböző típusú adatokat fognak össze egyetlen folytonos memóriablokkban. Assembly-ben a mezőket a bázismutatóhoz (pl. Y-regiszter) viszonyított konstans eltolásokkal (Offset) indexeljük (pl. LDD r16, Y+0).`;
    },
  },

  ds_struct_read_field: {
    type: 'ds_struct_read_field',
    category: 'datastruct',
    name: '🔍 Struktúra Mező Olvasása (LDD Y+q)',
    shortDesc: 'Mező beolvasása közvetlen eltolással a bázismutatóból munkaregiszterbe',
    icon: 'Boxes',
    color: 'teal',
    accentColor: '#0d9488',
    params: [
      {
        key: 'fieldOffset',
        label: 'Mező Eltolás (Offset bájt)',
        type: 'number',
        defaultValue: 3,
        unit: 'bájt',
      },
      {
        key: 'destRegister',
        label: 'Cél Munkaregiszter',
        type: 'register',
        defaultValue: 'r16',
      },
      {
        key: 'structInstance',
        label: 'Struktúra Példány Neve',
        type: 'text',
        defaultValue: 'current_sensor_node',
      },
    ],
    defaultParams: { fieldOffset: 3, destRegister: 'r16', structInstance: 'current_sensor_node' },
    calculateCycles: () => 4,
    generateAsm: (params) => {
      const inst = params.structInstance || 'current_sensor_node';
      const offset = params.fieldOffset || 0;
      const destReg = params.destRegister || 'r16';
      return [
        `; --- Struktúra Mező Olvasása: ${inst} + ${offset} -> ${destReg} ---`,
        `ldi YL, lo8(${inst})          ; Y-mutató alsó bájt (r28) = báziscím [1 ciklus]`,
        `ldi YH, hi8(${inst})          ; Y-mutató felső bájt (r29) = báziscím [1 ciklus]`,
        `ldd ${destReg}, Y+${offset}   ; Load Indirect with Displacement [2 ciklus]`,
      ];
    },
    generateC: (params) => {
      return [
        `// Struktúra mező olvasása pointeren keresztül:`,
        `uint8_t ${params.destRegister} = current_sensor_node.status_flags; // Offset: ${params.fieldOffset}`,
      ];
    },
    generateInlineAsm: (params) => {
      return [
        `__asm__ __volatile__ (`,
        `  "ldi YL, lo8(${params.structInstance})\\n\\t"`,
        `  "ldi YH, hi8(${params.structInstance})\\n\\t"`,
        `  "ldd %0, Y+${params.fieldOffset}\\n\\t"`,
        `  : "=r" (${params.destRegister})`,
        `  :: "y"`,
        `);`,
      ];
    },
    explanationHu: (params) => {
      return `Az AVR LDD (Load with Displacement) utasítása az Y (r29:r28) vagy Z (r31:r30) mutatóhoz hozzáad egy 0-63 közötti közvetlen eltolást (Offset), és 2 óraciklus alatt beolvassa a struktúra megfelelő mezőjét anélkül, hogy a bázismutató megváltozna!`;
    },
  },

  ds_struct_write_field: {
    type: 'ds_struct_write_field',
    category: 'datastruct',
    name: '✏️ Struktúra Mező Felülírása (STD Y+q)',
    shortDesc: 'Regiszter érték beírása a struktúra kijelölt mezőjébe',
    icon: 'Boxes',
    color: 'teal',
    accentColor: '#0d9488',
    params: [
      {
        key: 'fieldOffset',
        label: 'Mező Eltolás (Offset bájt)',
        type: 'number',
        defaultValue: 0,
        unit: 'bájt',
      },
      {
        key: 'sourceRegister',
        label: 'Forrás Munkaregiszter',
        type: 'register',
        defaultValue: 'r16',
      },
      {
        key: 'structInstance',
        label: 'Struktúra Példány Neve',
        type: 'text',
        defaultValue: 'current_sensor_node',
      },
    ],
    defaultParams: { fieldOffset: 0, sourceRegister: 'r16', structInstance: 'current_sensor_node' },
    calculateCycles: () => 4,
    generateAsm: (params) => {
      const inst = params.structInstance || 'current_sensor_node';
      const offset = params.fieldOffset || 0;
      const srcReg = params.sourceRegister || 'r16';
      return [
        `; --- Struktúra Mező Írása: ${srcReg} -> ${inst} + ${offset} ---`,
        `ldi YL, lo8(${inst})          ; Y-bázismutató beállítása [1 ciklus]`,
        `ldi YH, hi8(${inst})          ; Y-bázismutató beállítása [1 ciklus]`,
        `std Y+${offset}, ${srcReg}    ; Store Indirect with Displacement [2 ciklus]`,
      ];
    },
    generateC: (params) => {
      return [
        `// Struktúra mező értékadás:`,
        `current_sensor_node.node_id = ${params.sourceRegister}; // Offset ${params.fieldOffset}`,
      ];
    },
    generateInlineAsm: (params) => {
      return [
        `__asm__ __volatile__ (`,
        `  "ldi YL, lo8(${params.structInstance})\\n\\t"`,
        `  "ldi YH, hi8(${params.structInstance})\\n\\t"`,
        `  "std Y+${params.fieldOffset}, %0\\n\\t"`,
        `  :: "r" (${params.sourceRegister}) : "y"`,
        `);`,
      ];
    },
    explanationHu: (params) => {
      return `Az STD (Store with Displacement) utasítás pontosan 2 óraciklus alatt felülírja a struktúra kívánt mezőjét az SRAM-ban anélkül, hogy aritmetikai művelettel kellene módosítani az Y-mutató értékét.`;
    },
  },

  ds_object_instance: {
    type: 'ds_object_instance',
    category: 'datastruct',
    name: '🏛️ C++ Osztály & Objektumpéldány (OOP)',
    shortDesc: 'Objektumosztály létrehozása tagváltozókkal és metódusokkal',
    icon: 'Boxes',
    color: 'teal',
    accentColor: '#0d9488',
    params: [
      {
        key: 'className',
        label: 'Osztály Neve',
        type: 'text',
        defaultValue: 'LedController',
      },
      {
        key: 'instanceName',
        label: 'Példány Neve',
        type: 'text',
        defaultValue: 'statusLed',
      },
      {
        key: 'assignedPin',
        label: 'Társított Hardver Láb',
        type: 'pin',
        defaultValue: '13',
      },
    ],
    defaultParams: { className: 'LedController', instanceName: 'statusLed', assignedPin: '13' },
    calculateCycles: () => 6,
    generateAsm: (params) => {
      const cName = params.className || 'LedController';
      const iName = params.instanceName || 'statusLed';
      const pin = params.assignedPin || '13';
      return [
        `; =============================================================`,
        `; C++ OBJEKTUM ÉS METÓDUSTÁBLA (VTABLE / CONTEXT): ${cName}`,
        `; Példány: ${iName} (Társított láb: D${pin})`,
        `; =============================================================`,
        `; Objektum konstruktor / Inicializálás:`,
        `ldi r24, lo8(${iName})         ; 'this' mutató alsó bájt (r24)`,
        `ldi r25, hi8(${iName})         ; 'this' mutató felső bájt (r25)`,
        `ldi r22, ${pin}               ; Konstruktor paraméter: Pin = ${pin}`,
        `rcall ${cName}_construct      ; Konstruktor meghívása [3 ciklus]`,
        ``,
        `; Objektum Tagváltozók memóriaterülete az SRAM-ban:`,
        `.section .bss`,
        `${iName}:`,
        `    .skip 4                   ; this->pin (1B), this->state (1B), this->brightness (2B)`,
        `.section .text`,
        ``,
        `; Metódus definíció: ${cName}::construct(pin)`,
        `${cName}_construct:`,
        `    movw r30, r24             ; Z = 'this' mutató másolása [1 ciklus]`,
        `    std Z+0, r22              ; this->pin = pin [2 ciklus]`,
        `    clr r16`,
        `    std Z+1, r16              ; this->state = 0 [2 ciklus]`,
        `    ret                       ; [4 ciklus]`,
      ];
    },
    generateC: (params) => {
      const cName = params.className || 'LedController';
      const iName = params.instanceName || 'statusLed';
      return [
        `// C++ Osztály Definíció és Példányosítás:`,
        `class ${cName} {`,
        `public:`,
        `  uint8_t pin;`,
        `  bool state;`,
        `  ${cName}(uint8_t p) : pin(p), state(false) { pinMode(pin, OUTPUT); }`,
        `  void toggle() { state = !state; digitalWrite(pin, state ? HIGH : LOW); }`,
        `};`,
        `${cName} ${iName}(${params.assignedPin || '13'}); // Globális objektumpéldány`,
      ];
    },
    generateInlineAsm: (params) => {
      return [`// C++ OOP Class: ${params.className}`];
    },
    explanationHu: (params) => {
      return `Az objektumorientált (OOP) C++ programozásban az objektumpéldányok az SRAM-ban tárolják belső állapotukat (tagváltozók), míg a metódushívások az implicit 'this' mutatót (AVR ABI szerint az r25:r24 regiszterpárt) kapják meg első argumentumként.`;
    },
  },

  ds_object_method_call: {
    type: 'ds_object_method_call',
    category: 'datastruct',
    name: '⚡ Objektum Metódushívás (Method Call)',
    shortDesc: 'this mutató átadása r25:r24-ben és alprogram hívás (rcall)',
    icon: 'Boxes',
    color: 'teal',
    accentColor: '#0d9488',
    params: [
      {
        key: 'instanceName',
        label: 'Objektum Példány',
        type: 'text',
        defaultValue: 'statusLed',
      },
      {
        key: 'methodName',
        label: 'Meghívandó Metódus',
        type: 'select',
        options: [
          { label: 'toggle() - Állapotváltás', value: 'toggle' },
          { label: 'setBrightness(val) - Fényerő állítás', value: 'setBrightness' },
          { label: 'reset() - Alaphelyzet', value: 'reset' },
        ],
        defaultValue: 'toggle',
      },
      {
        key: 'argumentValue',
        label: 'Argumentum (ha szükséges)',
        type: 'number',
        defaultValue: 255,
      },
    ],
    defaultParams: { instanceName: 'statusLed', methodName: 'toggle', argumentValue: 255 },
    calculateCycles: () => 10,
    generateAsm: (params) => {
      const iName = params.instanceName || 'statusLed';
      const mName = params.methodName || 'toggle';
      return [
        `; --- Metódushívás: ${iName}.${mName}() ---`,
        `ldi r24, lo8(${iName})         ; 'this' mutató alsó bájt (r24) [1 ciklus]`,
        `ldi r25, hi8(${iName})         ; 'this' mutató felső bájt (r25) [1 ciklus]`,
        `ldi r22, ${params.argumentValue || 0} ; Argumentum átadása r22-ben [1 ciklus]`,
        `rcall LedController_${mName}   ; Alprogram hívása (Relative Call) [3 ciklus]`,
        ``,
        `; Metódus Törzs: LedController_${mName}`,
        `LedController_${mName}:`,
        `    movw r30, r24             ; Z = this [1 ciklus]`,
        `    ldd r16, Z+1              ; r16 = this->state [2 ciklus]`,
        `    ldi r17, 1`,
        `    eor r16, r17              ; Állapot invertálása XOR 1 [1 ciklus]`,
        `    std Z+1, r16              ; this->state = új állapot [2 ciklus]`,
        `    sbi 0x05, 5               ; LED láb (PB5) közvetlen átkapcsolása [2 ciklus]`,
        `    ret                       ; Visszatérés [4 ciklus]`,
      ];
    },
    generateC: (params) => {
      const iName = params.instanceName || 'statusLed';
      const mName = params.methodName || 'toggle';
      return [
        `// Metódus meghívása:`,
        `${iName}.${mName}();`,
      ];
    },
    generateInlineAsm: (params) => {
      return [`${params.instanceName}.${params.methodName}();`];
    },
    explanationHu: (params) => {
      return `A metódushívás során a fordító betölti az objektumpéldány SRAM memóriacímét a 'this' mutatóba (r25:r24 regiszterpár), átadja a függvényargumentumokat (r22), majd egy közvetlen 'rcall' utasítással meghívja a metódus gépi kódját.`;
    },
  },
  // ==========================================
  // 12. ESP32 & XTENSA DUAL-CORE HARDVER MODULOK
  // ==========================================
  esp32_gpio_w1ts: {
    type: 'esp32_gpio_w1ts',
    category: 'esp32',
    name: 'ESP32 Közvetlen W1TS/W1TC Regiszter',
    shortDesc: '240 MHz-es közvetlen atomi GPIO regiszterírás 1 óraciklus (4.16 ns) alatt',
    icon: 'Zap',
    color: 'sky',
    accentColor: '#38bdf8',
    params: [
      {
        key: 'pin',
        label: 'ESP32 GPIO Láb',
        type: 'pin',
        defaultValue: '2',
        description: 'Válaszd ki az ESP32 GPIO lábat (pl. GPIO2 beépített kék LED)',
      },
      {
        key: 'action',
        label: 'Művelet (Atomi Regiszter)',
        type: 'select',
        options: [
          { label: 'W1TS: HIGH (3.3V Bekapcsolás - 1 ciklus)', value: 'W1TS' },
          { label: 'W1TC: LOW (0V Kikapcsolás - 1 ciklus)', value: 'W1TC' },
        ],
        defaultValue: 'W1TS',
      },
    ],
    defaultParams: { pin: '2', action: 'W1TS' },
    calculateCycles: () => 1, // 1 cycle on Xtensa 240MHz
    generateAsm: (params) => {
      const pin = params.pin || '2';
      const isSet = params.action === 'W1TS';
      return [
        `; [ESP32 Xtensa LX6 @ 240 MHz] GPIO${pin} atomi ${params.action} művelet`,
        `movi.n a4, (1 << ${pin})                                  ; Maszk betöltése a4 regiszterbe [1 ciklus]`,
        isSet
          ? `s32i.n a4, a2, GPIO_OUT_W1TS_REG - DR_REG_GPIO_BASE   ; GPIO_OUT_W1TS = HIGH (3.3V) [1 ciklus / 4.16 ns]`
          : `s32i.n a4, a2, GPIO_OUT_W1TC_REG - DR_REG_GPIO_BASE   ; GPIO_OUT_W1TC = LOW (0V) [1 ciklus / 4.16 ns]`,
      ];
    },
    generateC: (params) => {
      const pin = params.pin || '2';
      const isSet = params.action === 'W1TS';
      return [
        `// C kód (Közvetlen ESP32 hardveres regiszter - 4.16 ns):`,
        isSet
          ? `GPIO.out_w1ts = (1 << ${pin}); // GPIO${pin} HIGH`
          : `GPIO.out_w1tc = (1 << ${pin}); // GPIO${pin} LOW`,
        `// Arduino C++ megfelelő (Lassabb ~1.2 µs):`,
        `digitalWrite(${pin}, ${isSet ? 'HIGH' : 'LOW'});`,
      ];
    },
    generateInlineAsm: (params) => {
      const pin = params.pin || '2';
      const isSet = params.action === 'W1TS';
      return [
        `__asm__ __volatile__ (`,
        `  "movi.n a4, (1 << ${pin})\\n\\t"`,
        `  "s32i.n a4, a2, ${isSet ? '0x08' : '0x0C'}\\n\\t" // ${isSet ? 'W1TS' : 'W1TC'}`,
        `  ::: "a4"`,
        `);`,
      ];
    },
    explanationHu: (params) => {
      const pin = params.pin || '2';
      return `Az ESP32 Xtensa LX6 magja a 's32i.n' (Store 32-bit Integer Narrow) utasítással 1 óraciklus (4.16 ns @ 240MHz) alatt állítja át a GPIO${pin} kimenetet. A hardveres W1TS (Write-1-to-Set) és W1TC (Write-1-to-Clear) regiszterek megakadályozzák a Read-Modify-Write versenyhelyzeteket a két processzormag között!`;
    },
  },

  esp32_touch_pad: {
    type: 'esp32_touch_pad',
    category: 'esp32',
    name: 'ESP32 Kapacitív Érintőszenzor',
    shortDesc: 'Hardveres kapacitív érintésérzékelés (Touch0..Touch9 beolvasás)',
    icon: 'Sliders',
    color: 'sky',
    accentColor: '#0284c7',
    params: [
      {
        key: 'touchPin',
        label: 'Érintő Láb',
        type: 'select',
        options: [
          { label: 'GPIO4 (Touch 0)', value: '4' },
          { label: 'GPIO2 (Touch 2)', value: '2' },
          { label: 'GPIO13 (Touch 4)', value: '13' },
          { label: 'GPIO12 (Touch 5)', value: '12' },
          { label: 'GPIO14 (Touch 6)', value: '14' },
          { label: 'GPIO27 (Touch 7)', value: '27' },
          { label: 'GPIO33 (Touch 8)', value: '33' },
          { label: 'GPIO32 (Touch 9)', value: '32' },
        ],
        defaultValue: '4',
      },
      {
        key: 'threshold',
        label: 'Érintési Küszöbérték',
        type: 'number',
        defaultValue: 40,
        unit: 'érték',
      },
    ],
    defaultParams: { touchPin: '4', threshold: 40 },
    calculateCycles: () => 12, // ~50 ns call/branch
    generateAsm: (params) => {
      const pin = params.touchPin || '4';
      return [
        `; [ESP32 Xtensa] Érintőszenzor (Touch on GPIO${pin}) olvasása`,
        `movi a2, ${pin}                                           ; GPIO${pin} Touch csatorna paraméter`,
        `call4 touchRead                                          ; ESP-IDF ROM érintésmérő hívás`,
        `movi a3, ${params.threshold || 40}                       ; Küszöbérték összehasonlítás (${params.threshold || 40})`,
        `blt a2, a3, touch_detected_handler                       ; Ha mért érték < küszöb -> Érintés detektálva`,
      ];
    },
    generateC: (params) => {
      const pin = params.touchPin || '4';
      const thresh = params.threshold || 40;
      return [
        `// C kód (Kapacitív érintés mérés):`,
        `uint16_t touchVal = touchRead(${pin});`,
        `if (touchVal < ${thresh}) {`,
        `  // Érintés érzékelve GPIO${pin}-en!`,
        `}`,
      ];
    },
    generateInlineAsm: (params) => {
      return [`uint16_t touchVal = touchRead(${params.touchPin || '4'});`];
    },
    explanationHu: (params) => {
      return `Az ESP32 beépített hardveres kapacitív relaxációs oszcillátora az ujj kapacitását méri. Érintéskor a frekvencia csökken, így az olvasott érték (pl. 80-ról < 40-re) lecsökken.`;
    },
  },

  esp32_dac_write: {
    type: 'esp32_dac_write',
    category: 'esp32',
    name: 'ESP32 8-bites Valós Analóg DAC',
    shortDesc: 'Valódi analóg feszültségkimenet (0-3.3V) GPIO25 (DAC1) vagy GPIO26 (DAC2) lábon',
    icon: 'Radio',
    color: 'sky',
    accentColor: '#38bdf8',
    params: [
      {
        key: 'dacPin',
        label: 'DAC Láb',
        type: 'select',
        options: [
          { label: 'GPIO25 (DAC Csatorna 1)', value: '25' },
          { label: 'GPIO26 (DAC Csatorna 2)', value: '26' },
        ],
        defaultValue: '25',
      },
      {
        key: 'dacValue',
        label: 'Analóg Érték (0 - 255 -> 0.0V - 3.3V)',
        type: 'number',
        defaultValue: 128,
        unit: 'LSB',
      },
    ],
    defaultParams: { dacPin: '25', dacValue: 128 },
    calculateCycles: () => 4, // 16.6 ns
    generateAsm: (params) => {
      const pin = params.dacPin || '25';
      const val = params.dacValue ?? 128;
      const voltage = ((val / 255) * 3.3).toFixed(2);
      return [
        `; [ESP32 Xtensa] Valós 8-bites Analóg DAC kimenet: GPIO${pin} -> ${val} (${voltage}V)`,
        `movi a3, ${val}                                           ; 8-bites DAC analóg érték (0-255)`,
        `movi a4, 0x3FF48800                                      ; RTC_IO_DAC_REG báziscím`,
        `s32i a3, a4, ${pin === '25' ? '0x00' : '0x04'}           ; Hardveres DAC feszültségszint azonnali beállítása [4 ciklus / 16.6 ns]`,
      ];
    },
    generateC: (params) => {
      const pin = params.dacPin || '25';
      const val = params.dacValue ?? 128;
      const voltage = ((val / 255) * 3.3).toFixed(2);
      return [
        `// C kód (Közvetlen 8-bites valós analóg feszültség = ${voltage} V):`,
        `dacWrite(${pin}, ${val});`,
        `// ESP-IDF közvetlen driver szint:`,
        `dac_output_voltage(${pin === '25' ? 'DAC_CHANNEL_1' : 'DAC_CHANNEL_2'}, ${val});`,
      ];
    },
    generateInlineAsm: (params) => {
      return [`dacWrite(${params.dacPin || '25'}, ${params.dacValue ?? 128});`];
    },
    explanationHu: (params) => {
      const val = params.dacValue ?? 128;
      const voltage = ((val / 255) * 3.3).toFixed(2);
      return `Az ESP32 két dedikált 8-bites digitális-analóg átalakítóval (DAC1 = GPIO25, DAC2 = GPIO26) rendelkezik. Nem PWM szűrést alkalmaz, hanem valós analóg feszültségszintet generál 0.0V és 3.3V között (${val} LSB = ${voltage}V).`;
    },
  },

  esp32_ledc_pwm: {
    type: 'esp32_ledc_pwm',
    category: 'esp32',
    name: 'ESP32 Hardveres LEDC PWM',
    shortDesc: 'Nagysebességű (0-40 MHz) hardveres LEDC PWM generálás 1-16 bit felbontással',
    icon: 'Sliders',
    color: 'sky',
    accentColor: '#0284c7',
    params: [
      {
        key: 'pin',
        label: 'ESP32 GPIO Láb',
        type: 'pin',
        defaultValue: '2',
      },
      {
        key: 'channel',
        label: 'LEDC Hardver Csatorna',
        type: 'select',
        options: [
          { label: 'LEDC Ch 0 (Nagysebességű)', value: '0' },
          { label: 'LEDC Ch 1 (Nagysebességű)', value: '1' },
          { label: 'LEDC Ch 2', value: '2' },
          { label: 'LEDC Ch 3', value: '3' },
        ],
        defaultValue: '0',
      },
      {
        key: 'freqHz',
        label: 'PWM Frekvencia (Hz)',
        type: 'number',
        defaultValue: 5000,
        unit: 'Hz',
      },
      {
        key: 'duty',
        label: 'Kitöltési Tényező (0 - 255)',
        type: 'number',
        defaultValue: 128,
        unit: 'Duty',
      },
    ],
    defaultParams: { pin: '2', channel: '0', freqHz: 5000, duty: 128 },
    calculateCycles: () => 5,
    generateAsm: (params) => {
      const pin = params.pin || '2';
      const ch = params.channel || '0';
      const duty = params.duty ?? 128;
      return [
        `; [ESP32 Xtensa] Hardveres LEDC PWM konfiguráció: GPIO${pin}, Ch${ch}, Duty=${duty}`,
        `movi a2, ${ch}                                           ; LEDC Csatorna száma`,
        `movi a3, ${duty}                                         ; Kitöltési tényező (Duty)`,
        `call4 ledcWrite                                          ; Hardveres PWM regiszter atomi frissítése`,
      ];
    },
    generateC: (params) => {
      const pin = params.pin || '2';
      const ch = params.channel || '0';
      const freq = params.freqHz || 5000;
      const duty = params.duty ?? 128;
      return [
        `// C kód (Hardveres 16-csatornás LEDC PWM vezérlő):`,
        `// Setup-ban: ledcSetup(${ch}, ${freq}, 8); ledcAttachPin(${pin}, ${ch});`,
        `ledcWrite(${ch}, ${duty}); // ${(duty / 255 * 100).toFixed(1)}% Kitöltési tényező`,
      ];
    },
    generateInlineAsm: (params) => {
      return [`ledcWrite(${params.channel || '0'}, ${params.duty ?? 128});`];
    },
    explanationHu: (params) => {
      return `Az ESP32 hardveres LEDC (LED Controller) modulja 16 független PWM csatornát biztosít akár 40 MHz-ig. A CPU terhelése a generálás közben 0%, mert a hardveres időzítő automatikusan modulálja a kimenetet.`;
    },
  },

  esp32_freertos_task: {
    type: 'esp32_freertos_task',
    category: 'esp32',
    name: 'FreeRTOS Kétmagos Taszk (Core Pinning)',
    shortDesc: 'Új háttérfolyamat indítása rögzítve Core 0 (PRO CPU) vagy Core 1 (APP CPU) magon',
    icon: 'Cpu',
    color: 'sky',
    accentColor: '#38bdf8',
    params: [
      {
        key: 'taskName',
        label: 'Taszk Neve',
        type: 'text',
        defaultValue: 'sensorTask',
      },
      {
        key: 'core',
        label: 'Processzormag (Core)',
        type: 'select',
        options: [
          { label: 'Core 0 (PRO CPU - Protokoll & Háttér)', value: '0' },
          { label: 'Core 1 (APP CPU - Felhasználói Loop)', value: '1' },
        ],
        defaultValue: '0',
      },
      {
        key: 'priority',
        label: 'Taszk Prioritás (1 - 24)',
        type: 'number',
        defaultValue: 1,
      },
      {
        key: 'stackSize',
        label: 'Stack Méret (Bájt)',
        type: 'number',
        defaultValue: 4096,
        unit: 'B',
      },
    ],
    defaultParams: { taskName: 'sensorTask', core: '0', priority: 1, stackSize: 4096 },
    calculateCycles: () => 15,
    generateAsm: (params) => {
      const name = params.taskName || 'sensorTask';
      const core = params.core || '0';
      return [
        `; [ESP32 FreeRTOS] Taszk indítása Core ${core}-ra: ${name}`,
        `movi a2, ${name}_code                                    ; Taszk belépési pont függvénycíme`,
        `movi a3, "${name}"                                       ; Taszk név szöveges mutató`,
        `movi a4, ${params.stackSize || 4096}                     ; Veremméret (Stack)`,
        `movi a5, 0                                               ; Paraméter (NULL)`,
        `movi a6, ${params.priority || 1}                         ; Prioritás`,
        `movi a7, ${core}                                         ; Célmag: Core ${core}`,
        `call4 xTaskCreatePinnedToCore                            ; FreeRTOS SMP ütemezőbejegyzés`,
      ];
    },
    generateC: (params) => {
      const name = params.taskName || 'sensorTask';
      const core = params.core || '0';
      const prio = params.priority || 1;
      const stack = params.stackSize || 4096;
      return [
        `// C kód (FreeRTOS Kétmagos Taszk indítása):`,
        `xTaskCreatePinnedToCore(`,
        `  ${name}_func,       // Taszk függvény`,
        `  "${name}",          // Név`,
        `  ${stack},           // Stack méret`,
        `  NULL,               // Paraméter`,
        `  ${prio},            // Prioritás`,
        `  NULL,               // Task Handle`,
        `  ${core}             // Mag azonosító (Core ${core})`,
        `);`,
      ];
    },
    generateInlineAsm: (params) => {
      return [`// FreeRTOS Task: ${params.taskName || 'task'}`];
    },
    explanationHu: (params) => {
      const core = params.core || '0';
      return `Az ESP32 két független 32-bites 240 MHz-es Xtensa maggal működik. A 'xTaskCreatePinnedToCore' hívással a feladatot közvetlenül a Core ${core} maghoz rendeljük, így a feladat párhuzamosan és akadásmentesen fut a másik mag kódja mellett!`;
    },
  },

  esp32_wifi_connect: {
    type: 'esp32_wifi_connect',
    category: 'esp32',
    name: 'ESP32 Wi-Fi Csatlakozás (Station)',
    shortDesc: 'Hardveres 802.11 b/g/n Wi-Fi kapcsolat inicializálása Core 0 háttérstackkel',
    icon: 'Radio',
    color: 'sky',
    accentColor: '#0284c7',
    params: [
      {
        key: 'ssid',
        label: 'Wi-Fi Hálózat Neve (SSID)',
        type: 'text',
        defaultValue: 'MyHomeWiFi',
      },
      {
        key: 'password',
        label: 'Jelszó (WPA2-PSK)',
        type: 'text',
        defaultValue: 'TitkosJelszo123',
      },
    ],
    defaultParams: { ssid: 'MyHomeWiFi', password: 'TitkosJelszo123' },
    calculateCycles: () => 20,
    generateAsm: (params) => {
      const ssid = params.ssid || 'MyHomeWiFi';
      return [
        `; [ESP32 Wi-Fi / LwIP Stack] Kapcsolódás: "${ssid}"`,
        `movi a2, wifi_ssid_str                                   ; SSID konstans címe`,
        `movi a3, wifi_pass_str                                   ; Jelszó konstans címe`,
        `call4 esp_wifi_connect_station                           ; LwIP TCP/IP Stack & RF Rádió bekapcsolása`,
      ];
    },
    generateC: (params) => {
      const ssid = params.ssid || 'MyHomeWiFi';
      const pass = params.password || 'TitkosJelszo123';
      return [
        `// C kód (Wi-Fi Kapcsolódás):`,
        `#include <WiFi.h>`,
        `WiFi.mode(WIFI_STA);`,
        `WiFi.begin("${ssid}", "${pass}");`,
        `while (WiFi.status() != WL_CONNECTED) {`,
        `  delay(100);`,
        `}`,
      ];
    },
    generateInlineAsm: (params) => {
      return [`WiFi.begin("${params.ssid || 'WiFi'}", "${params.password || ''}");`];
    },
    explanationHu: (params) => {
      return `Az ESP32 hardveres 2.4 GHz Wi-Fi alrendszere a Core 0-n (PRO CPU) futtatja a FreeRTOS LwIP TCP/IP stacket, így a hálózati forgalom feldolgozása nem lassítja le a Core 1-en futó fő programhurkot.`;
    },
  },

  esp32_deep_sleep: {
    type: 'esp32_deep_sleep',
    category: 'esp32',
    name: 'ESP32 Deep Sleep (Mélyalvás)',
    shortDesc: 'Ultra-alacsony fogyasztású mélyalvás (5 µA) időzített vagy érintéses ébresztéssel',
    icon: 'Clock',
    color: 'sky',
    accentColor: '#38bdf8',
    params: [
      {
        key: 'sleepSeconds',
        label: 'Alvási Időtartam (másodperc)',
        type: 'number',
        defaultValue: 10,
        unit: 'mp',
      },
      {
        key: 'wakeupSource',
        label: 'Ébresztési Forrás',
        type: 'select',
        options: [
          { label: 'RTC Hardveres Időzítő (Timer Wakeup)', value: 'timer' },
          { label: 'Kapacitív Érintés (Touch Wakeup)', value: 'touch' },
          { label: 'Külső GPIO Gomb (EXT0)', value: 'ext0' },
        ],
        defaultValue: 'timer',
      },
    ],
    defaultParams: { sleepSeconds: 10, wakeupSource: 'timer' },
    calculateCycles: () => 10,
    generateAsm: (params) => {
      const sec = params.sleepSeconds || 10;
      return [
        `; [ESP32 Power Management] Deep Sleep: ${sec} másodperc`,
        `movi a2, ${sec * 1000000}                                ; ${sec} másodperc mikroszekundumban (µs)`,
        `call4 esp_sleep_enable_timer_wakeup                      ; RTC Időzítő ébresztés engedélyezése`,
        `call4 esp_deep_sleep_start                               ; Fő processzormagok kikapcsolása -> 5 µA fogyasztás`,
      ];
    },
    generateC: (params) => {
      const sec = params.sleepSeconds || 10;
      return [
        `// C kód (ESP32 Deep Sleep):`,
        `esp_sleep_enable_timer_wakeup(${sec}ULL * 1000000ULL); // ${sec} mp`,
        `Serial.println("ESP32 mélyalvásba lép (5 µA)...");`,
        `esp_deep_sleep_start();`,
      ];
    },
    generateInlineAsm: (params) => {
      return [`esp_deep_sleep_start();`];
    },
    explanationHu: (params) => {
      const sec = params.sleepSeconds || 10;
      return `Deep Sleep módban a két nagysebességű Xtensa mag, a Wi-Fi és a perifériák kikapcsolnak, az áramfelvétel ~5 µA-re esik. Csak a mikrofogyasztású RTC Coprocessor és az ULP mag marad aktív, amely ${sec} másodperc múlva újraindítja a rendszert.`;
    },
  },

  esp32_ccount_delay: {
    type: 'esp32_ccount_delay',
    category: 'esp32',
    name: 'Xtensa CCOUNT Nanomásodperc Késleltetés',
    shortDesc: 'Nanomásodperc-pontos várakozás az Xtensa hardveres CCOUNT regiszterével',
    icon: 'Clock',
    color: 'sky',
    accentColor: '#0284c7',
    params: [
      {
        key: 'cycles',
        label: 'Pontos Óraciklusok Száma (240 = 1.0 µs)',
        type: 'number',
        defaultValue: 240,
        unit: 'ciklus',
      },
    ],
    defaultParams: { cycles: 240 },
    calculateCycles: (params) => Number(params.cycles) || 240,
    generateAsm: (params) => {
      const cyc = Number(params.cycles) || 240;
      const ns = (cyc * 4.166667).toFixed(1);
      return [
        `; [Xtensa LX6 @ 240 MHz] CCOUNT Késleltetés: ${cyc} ciklus (${ns} ns)`,
        `rsr.ccount a2                                            ; Aktuális ciklusszámláló leolvasása [1 ciklus]`,
        `movi a3, ${cyc}                                          ; Cél ciklusszám hozzáadása [1 ciklus]`,
        `add.n a3, a2, a3`,
        `1:`,
        `rsr.ccount a4                                            ; Újramérés [1 ciklus]`,
        `bltu a4, a3, 1b                                          ; Várakozás amíg a4 < a3 [2 ciklus]`,
      ];
    },
    generateC: (params) => {
      const cyc = Number(params.cycles) || 240;
      const ns = (cyc * 4.166667).toFixed(1);
      return [
        `// C kód (Hardveres CCOUNT ciklusszámláló várakozás = ${ns} ns):`,
        `static inline void delayCycles(uint32_t cycles) {`,
        `  uint32_t start = xthal_get_ccount();`,
        `  while ((xthal_get_ccount() - start) < ${cyc});`,
        `}`,
        `delayCycles(${cyc}); // ${ns} ns várakozás`,
      ];
    },
    generateInlineAsm: (params) => {
      const cyc = Number(params.cycles) || 240;
      return [
        `__asm__ __volatile__ (`,
        `  "rsr.ccount a2\\n\\t"`,
        `  "movi a3, ${cyc}\\n\\t"`,
        `  "add.n a3, a2, a3\\n\\t"`,
        `  "1: rsr.ccount a4\\n\\t"`,
        `  "bltu a4, a3, 1b\\n\\t"`,
        `  ::: "a2", "a3", "a4"`,
        `);`,
      ];
    },
    explanationHu: (params) => {
      const cyc = Number(params.cycles) || 240;
      const ns = (cyc * 4.166667).toFixed(1);
      return `Az Xtensa LX6 processzor beépített 32-bites CCOUNT speciális regisztere minden 240 MHz-es óraütésre 1-gyel inkrementálódik. Ezzel nanomásodperc-pontos (${cyc} ciklus = ${ns} ns) késleltetés valósítható meg megszakítások nélkül!`;
    },
  },

  esp32_gpio_interrupt: {
    type: 'esp32_gpio_interrupt',
    category: 'esp32',
    name: '⚡ ESP32 Hardveres GPIO Megszakítás (IRAM_ATTR)',
    shortDesc: 'Hardveres élérzékelés GPIO 0-39 lábon azonnali IRAM_ATTR ISR callbackkel és taszk előjegyzéssel',
    icon: 'Radio',
    color: 'sky',
    accentColor: '#0284c7',
    params: [
      {
        key: 'gpioPin',
        label: 'Forrás GPIO Láb (0 - 39)',
        type: 'number',
        defaultValue: 4,
      },
      {
        key: 'triggerMode',
        label: 'Élérzékelési Mód (Trigger Type)',
        type: 'select',
        options: [
          { label: 'FALLING (Lehúzó él - Gomb lenyomás)', value: 'FALLING' },
          { label: 'RISING (Felfutó él - Gomb elengedés)', value: 'RISING' },
          { label: 'CHANGE (Bármilyen állapotváltozás)', value: 'CHANGE' },
          { label: 'LOW (Folyamatos alacsony szint)', value: 'LOW_LEVEL' },
          { label: 'HIGH (Folyamatos magas szint)', value: 'HIGH_LEVEL' },
        ],
        defaultValue: 'FALLING',
      },
      {
        key: 'coreAffinity',
        label: 'Végrehajtó Xtensa Mag',
        type: 'select',
        options: [
          { label: 'PRO_CPU (Core 0)', value: '0' },
          { label: 'APP_CPU (Core 1)', value: '1' },
        ],
        defaultValue: '1',
      },
      {
        key: 'action',
        label: 'Hardveres ISR Reakció',
        type: 'select',
        options: [
          { label: 'Kimeneti Pin Állapotváltás (Pl. GPIO 2 Beépített Kék LED)', value: 'toggle_pin' },
          { label: 'Számláló növelése (volatile uint32_t)', value: 'increment_counter' },
          { label: 'FreeRTOS Taszk Értesítés (vTaskNotifyGiveFromISR)', value: 'notify_task' },
        ],
        defaultValue: 'toggle_pin',
      },
      {
        key: 'targetPin',
        label: 'Cél GPIO Láb (Kimenetnél)',
        type: 'number',
        defaultValue: 2,
      },
    ],
    defaultParams: { gpioPin: 4, triggerMode: 'FALLING', coreAffinity: '1', action: 'toggle_pin', targetPin: 2 },
    calculateCycles: () => 10,
    generateAsm: (params) => {
      const pin = params.gpioPin || 4;
      const mode = params.triggerMode || 'FALLING';
      const targetPin = params.targetPin || 2;
      return [
        `; [ESP32 Xtensa Dual-Core] Hardveres GPIO Megszakítás: GPIO ${pin} (${mode})`,
        `movi a2, 0x3FF44088 + (${pin} * 4)   ; GPIO_PIN${pin}_REG címe`,
        `movi a3, 0x02                         ; INT_TYPE beállítása (${mode})`,
        `s32i a3, a2, 0`,
        `; ISR Handler: IRAM_ATTR void gpio_isr_handler() { toggle GPIO ${targetPin}; }`,
      ];
    },
    generateC: (params) => {
      const pin = params.gpioPin || 4;
      const mode = params.triggerMode || 'FALLING';
      const targetPin = params.targetPin || 2;
      return [
        `// ESP32 GPIO Megszakítás Konfiguráció (IRAM_ATTR):`,
        `void IRAM_ATTR gpio_${pin}_isr(void* arg) {`,
        `  digitalWrite(${targetPin}, !digitalRead(${targetPin}));`,
        `}`,
        `pinMode(${pin}, INPUT_PULLUP);`,
        `pinMode(${targetPin}, OUTPUT);`,
        `attachInterruptArg(digitalPinToInterrupt(${pin}), gpio_${pin}_isr, NULL, ${mode});`,
      ];
    },
    generateInlineAsm: (params) => {
      return [`// ESP32 IRAM_ATTR GPIO Interrupt configured`];
    },
    explanationHu: (params) => {
      const pin = params.gpioPin || 4;
      const mode = params.triggerMode || 'FALLING';
      return `Az ESP32 GPIO Mátrixa mind a 40 I/O lábhoz hardveres élérzékelőt rendel. Az IRAM_ATTR direktíva garantálja, hogy a megszakításkezelő függvény a belső gyors IRAM memóriába kerüljön, így SPI Flash műveletek vagy Wi-Fi adatforgalom közben is 0 ns cache késleltetéssel azonnal lefut!`;
    },
  },

  esp32_timer_alarm_interrupt: {
    type: 'esp32_timer_alarm_interrupt',
    category: 'esp32',
    name: '⏱️ ESP32 64-bites Hardware Timer Alarm Megszakítás',
    shortDesc: 'Timer Group 0/1 hardveres 64-bites időzítő mikro-másodperces riasztással és auto-reload funkcióval',
    icon: 'Clock',
    color: 'sky',
    accentColor: '#0284c7',
    params: [
      {
        key: 'timerGroup',
        label: 'Timer Group (0 vagy 1)',
        type: 'select',
        options: [
          { label: 'Timer Group 0 (TIMERG0)', value: '0' },
          { label: 'Timer Group 1 (TIMERG1)', value: '1' },
        ],
        defaultValue: '0',
      },
      {
        key: 'timerIndex',
        label: 'Időzítő Száma (Timer 0 / Timer 1)',
        type: 'select',
        options: [
          { label: 'Timer 0', value: '0' },
          { label: 'Timer 1', value: '1' },
        ],
        defaultValue: '0',
      },
      {
        key: 'intervalUs',
        label: 'Riasztási Időköz (µs)',
        type: 'number',
        defaultValue: 1000,
        unit: 'µs',
      },
      {
        key: 'autoReload',
        label: 'Automatikus Újratöltés (Auto-Reload)',
        type: 'select',
        options: [
          { label: 'Igen (Periodikus riasztás)', value: 'true' },
          { label: 'Nem (Egyszeri riasztás)', value: 'false' },
        ],
        defaultValue: 'true',
      },
      {
        key: 'targetPin',
        label: 'Kimeneti Cél Láb (Váltáshoz)',
        type: 'number',
        defaultValue: 2,
      },
    ],
    defaultParams: { timerGroup: '0', timerIndex: '0', intervalUs: 1000, autoReload: 'true', targetPin: 2 },
    calculateCycles: () => 8,
    generateAsm: (params) => {
      const tg = params.timerGroup || 0;
      const t = params.timerIndex || 0;
      const us = params.intervalUs || 1000;
      return [
        `; [ESP32 Hardware Timer Group ${tg} - Timer ${t}] Alarm: ${us} µs`,
        `movi a2, 0x3FF5F010                   ; TIMG_T0ALARMLO_REG`,
        `movi a3, ${us}                        ; 1 MHz tick @ divider 80`,
        `s32i a3, a2, 0`,
        `; 64-bites hardveres időzítő riasztás aktív`,
      ];
    },
    generateC: (params) => {
      const tg = params.timerGroup || 0;
      const t = params.timerIndex || 0;
      const us = params.intervalUs || 1000;
      const reload = params.autoReload !== 'false';
      const targetPin = params.targetPin || 2;
      return [
        `// ESP32 Hardware Timer Group ${tg} Timer ${t} (${us} µs):`,
        `hw_timer_t *timer = timerBegin(${tg}, 80, true); // 80 MHz / 80 = 1 MHz`,
        `timerAttachInterrupt(timer, []() IRAM_ATTR {`,
        `  digitalWrite(${targetPin}, !digitalRead(${targetPin}));`,
        `}, true);`,
        `timerAlarmWrite(timer, ${us}, ${reload});`,
        `timerAlarmEnable(timer);`,
      ];
    },
    generateInlineAsm: (params) => {
      return [`// ESP32 64-bit Hardware Timer Alarm interrupt active`];
    },
    explanationHu: (params) => {
      const us = params.intervalUs || 1000;
      const freq = Math.round(1000000 / us);
      return `Az ESP32 két független időzítőcsoporttal (Timer Group 0 és 1) rendelkezik, melyek mindegyike 2 db 64-bites számlálót tartalmaz. 80-as előosztóval a számláló pontosan 1 MHz-en (1 µs per tick) ketyeg, így a(z) ${us} µs időköz pontosan ${freq} Hz-es hardveres megszakítást eredményez!`;
    },
  },

  esp32_touch_interrupt: {
    type: 'esp32_touch_interrupt',
    category: 'esp32',
    name: '👆 ESP32 Kapacitív Érintés (Touch Sensor) Megszakítás',
    shortDesc: 'Hardveres kapacitív érintésérzékelő (T0-T9) küszöbérték átlépési megszakítás',
    icon: 'Fingerprint',
    color: 'sky',
    accentColor: '#0284c7',
    params: [
      {
        key: 'touchPad',
        label: 'Touch Csatorna (Láb)',
        type: 'select',
        options: [
          { label: 'T0 (GPIO 4)', value: '0' },
          { label: 'T2 (GPIO 2)', value: '2' },
          { label: 'T3 (GPIO 15)', value: '3' },
          { label: 'T4 (GPIO 13)', value: '4' },
          { label: 'T5 (GPIO 12)', value: '5' },
          { label: 'T6 (GPIO 14)', value: '6' },
          { label: 'T7 (GPIO 27)', value: '7' },
          { label: 'T8 (GPIO 33)', value: '8' },
          { label: 'T9 (GPIO 32)', value: '9' },
        ],
        defaultValue: '0',
      },
      {
        key: 'threshold',
        label: 'Érzékenységi Küszöbérték (0 - 1000)',
        type: 'number',
        defaultValue: 400,
      },
      {
        key: 'targetPin',
        label: 'Kimeneti Cél Láb (Váltáshoz)',
        type: 'number',
        defaultValue: 2,
      },
    ],
    defaultParams: { touchPad: '0', threshold: 400, targetPin: 2 },
    calculateCycles: () => 6,
    generateAsm: (params) => {
      const pad = params.touchPad || 0;
      const th = params.threshold || 400;
      return [
        `; [ESP32 RTC Touch] Touch Pad T${pad} Küszöbérték: ${th}`,
        `movi a2, 0x3FF48480 + (${pad} * 4)   ; TOUCH_PAD${pad}_THRES`,
        `movi a3, ${th}`,
        `s32i a3, a2, 0`,
      ];
    },
    generateC: (params) => {
      const pad = params.touchPad || 0;
      const th = params.threshold || 400;
      const targetPin = params.targetPin || 2;
      return [
        `// ESP32 Kapacitív Touch Megszakítás (T${pad}):`,
        `void IRAM_ATTR touch_${pad}_isr() {`,
        `  digitalWrite(${targetPin}, !digitalRead(${targetPin}));`,
        `}`,
        `touchAttachInterrupt(T${pad}, touch_${pad}_isr, ${th});`,
      ];
    },
    generateInlineAsm: (params) => {
      return [`// ESP32 Touch Interrupt initialized`];
    },
    explanationHu: (params) => {
      const pad = params.touchPad || 0;
      const th = params.threshold || 400;
      return `Az ESP32 beépített analóg töltésmegosztó áramköre folyamatosan méri az emberi ujj érintése által okozott parazita kapacitásváltozást. Amikor az érték a(z) ${th} küszöb alá esik, az RTC vezérlő hardveres megszakítást vált ki.`;
    },
  },

  esp32_interrupt_designer: {
    type: 'esp32_interrupt_designer',
    category: 'esp32',
    name: '⚡ ESP32 Megszakítás Mátrix & Vizuális Tervező',
    shortDesc: 'Teljes 32 forrásos Xtensa Interrupt Mátrix, kétmagos allokáció, prioritások és valós idejű telemetria',
    icon: 'ShieldAlert',
    color: 'sky',
    accentColor: '#0284c7',
    params: [
      {
        key: 'note',
        label: 'Tervező Státusz',
        type: 'select',
        options: [
          { label: 'Xtensa Kétmagos Megszakítás Mátrix Aktív (PRO_CPU + APP_CPU)', value: 'ACTIVE' },
        ],
        defaultValue: 'ACTIVE',
      },
    ],
    defaultParams: { note: 'ACTIVE' },
    calculateCycles: () => 1,
    generateAsm: () => [
      `; [ESP32 Xtensa Dual-Core 240MHz] Interrupt Matrix & Level Controller`,
      `wsr.intenable a2                         ; Xtensa 32-bites megszakításmaszk engedélyezése`,
    ],
    generateC: () => [
      `// ESP32 Xtensa Interrupt Matrix Inicializálás & Allokáció:`,
      `esp_intr_alloc(ETS_GPIO_INTR_SOURCE, ESP_INTR_FLAG_LEVEL1 | ESP_INTR_FLAG_IRAM, gpio_isr, NULL, NULL);`,
    ],
    generateInlineAsm: () => [`// ESP32 Interrupt Matrix Active`],
    explanationHu: () => {
      return `Az ESP32 forradalmi Interrupt Mátrixa lehetővé teszi, hogy 71 különböző hardveres periféria megszakítási vonalát tetszőlegesen átirányítsuk a 32 db CPU megszakítási csatorna bármelyikére mind a PRO_CPU (Core 0), mind az APP_CPU (Core 1) magon, 7 különböző prioritási szinten!`;
    },
  },
};

export const CATEGORY_METADATA: Record<
  string,
  { label: string; description: string; icon: string; badgeColor: string }
> = {
  esp32: {
    label: '⚡ ESP32 & Xtensa Dual-Core (240MHz)',
    description: 'Nagysebességű 32-bites regiszterek (W1TS/W1TC), FreeRTOS kétmagos taszkok, Kapacitív Touch, Valós Analóg DAC, LEDC PWM és Wi-Fi',
    icon: 'Zap',
    badgeColor: 'bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/20',
  },
  io: {
    label: '📌 I/O & Portvezérlés',
    description: 'Közvetlen regiszterműveletek (SBI, CBI, PIN Toggle, OUT)',
    icon: 'Cpu',
    badgeColor: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20',
  },
  master_slave: {
    label: '👑 Master-Slave Üzemmód (I2C, SPI & NRF24)',
    description: 'I2C / TWI, SPI & NRF24L01+ 2.4GHz Master/Slave multi-node hálózat, címezhető csövek és Auto-ACK',
    icon: 'Network',
    badgeColor: 'bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-500/20',
  },
  datastruct: {
    label: '📦 Tömbök, Struktúrák & OOP',
    description: 'Flash/RAM tömbök, C struktúrák offsetekkel és C++/ASM objektumpéldányok metódushívással',
    icon: 'Boxes',
    badgeColor: 'bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/20',
  },
  memory: {
    label: '💾 EEPROM & Flash Memória',
    description: '1024B belső EEPROM nem-felejtő írás/olvasás és Flash PROGMEM konstansok',
    icon: 'HardDrive',
    badgeColor: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20',
  },
  modules: {
    label: '🧩 Hardver Modulok (LCD, RTC, 595, SD, NRF24, BT05/06, Encóder)',
    description: 'Dinamikus perifériák: 16x2 LCD, DS1307 RTC, 74HC595, SD Kártya, NRF24, BT05/06 Bluetooth SPP, Rotary Encóder',
    icon: 'Layers',
    badgeColor: 'bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/20',
  },
  timing: {
    label: '⏱️ Időzítés & Precíz Ciklusok',
    description: 'Óraciklus-pontos NOP, µs és ms késleltető hurkok',
    icon: 'Clock',
    badgeColor: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20',
  },
  analog: {
    label: '🎛️ Analóg & PWM Vezérlés',
    description: '10-bites ADC mérés (A0-A5), ADMUX/ADCSRA és Timer0/1 PWM kitöltés (OCRnx)',
    icon: 'Sliders',
    badgeColor: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20',
  },
  protocol: {
    label: '🌐 I2C, SPI & Busz Protokollok',
    description: 'Hardveres I2C (TWI 100/400kHz), SPI Master (4MHz), WS2812B, Négyszögjel',
    icon: 'Sparkles',
    badgeColor: 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20',
  },
  flow: {
    label: '🔁 Vezérlés & Ciklusok',
    description: 'FOR számláló, feltételes elágazások (CPI/BREQ), ugrások',
    icon: 'RefreshCw',
    badgeColor: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20',
  },
  interrupt: {
    label: '⚡ Megszakítások (Interrupts)',
    description: 'SEI, CLI, Timer1 CTC és hardveres megszakítások',
    icon: 'Radio',
    badgeColor: 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20',
  },
  math: {
    label: '🔢 Aritmetika, Bitműveletek & Logika (AVR ASM & C)',
    description: 'MUL 2-ciklusos szorzó, 16-bites ADIW/SBIW, ADC/SBC átvitel, AND/OR/XOR logika, LSL/LSR léptetés, DIV16/MOD',
    icon: 'Hash',
    badgeColor: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-500/20',
  },
};

