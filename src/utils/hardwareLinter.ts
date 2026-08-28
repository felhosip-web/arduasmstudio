/**
 * (c) 2026 AI Studio AVR Visual Studio
 * Hardware Linter & Static Collision Analyzer (Statikus Hardver & Kódelemző)
 * Performs deep static analysis on ATmega328P Arduino Uno block pipelines.
 */

import { ProgramBlock, BlockScope, ArduinoPin, VariableDefinition } from '../types';
import { PIN_MAPPINGS } from './hardwareMap';

export type LinterSeverity = 'critical' | 'warning' | 'optimization' | 'pass';

export type LinterCategory =
  | 'pin_conflict'
  | 'missing_init'
  | 'floating_pin'
  | 'isr_safety'
  | 'memory_safety'
  | 'timing_hazard'
  | 'flow_control';

export interface LinterQuickFix {
  id: string;
  label: string;
  description: string;
  apply: (blocks: ProgramBlock[]) => ProgramBlock[];
}

export interface HardwareLintItem {
  id: string;
  title: string;
  description: string;
  severity: LinterSeverity;
  category: LinterCategory;
  scope?: BlockScope;
  blockId?: string;
  blockType?: string;
  pin?: string;
  hardwareNote?: string;
  quickFix?: LinterQuickFix;
}

export interface PinUsageDetail {
  pin: string;
  modes: { mode: string; scope: BlockScope; blockId: string; blockType: string }[];
  protocols: string[];
  isPwmUsed: boolean;
  isAdcUsed: boolean;
  hasConflict: boolean;
  conflictReason?: string;
}

export interface HardwareLintReport {
  timestamp: string;
  totalBlocks: number;
  healthScore: number; // 0 - 100
  criticalCount: number;
  warningCount: number;
  optimizationCount: number;
  passCount: number;
  items: HardwareLintItem[];
  pinMap: Record<string, PinUsageDetail>;
  isHardwareSafe: boolean;
}

const PWM_PINS = new Set(['3', '5', '6', '9', '10', '11']);
const ADC_PINS = new Set(['A0', 'A1', 'A2', 'A3', 'A4', 'A5', '14', '15', '16', '17', '18', '19']);
const VALID_LDI_REGISTERS = new Set([
  'r16', 'r17', 'r18', 'r19', 'r20', 'r21', 'r22', 'r23',
  'r24', 'r25', 'r26', 'r27', 'r28', 'r29', 'r30', 'r31'
]);

/**
 * Runs full static hardware conflict analysis and code quality check on the current block pipeline.
 */
export function runHardwareLinter(
  blocks: ProgramBlock[],
  variables: VariableDefinition[] = []
): HardwareLintReport {
  const items: HardwareLintItem[] = [];
  const pinMap: Record<string, PinUsageDetail> = {};

  // Initialize pin tracking for Uno standard pins
  const standardPins = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', 'A0', 'A1', 'A2', 'A3', 'A4', 'A5'];
  standardPins.forEach((p) => {
    pinMap[p] = {
      pin: p,
      modes: [],
      protocols: [],
      isPwmUsed: false,
      isAdcUsed: false,
      hasConflict: false,
    };
  });

  const activeBlocks = blocks.filter((b) => b.enabled !== false);
  const setupBlocks = activeBlocks.filter((b) => b.scope === 'setup');
  const loopBlocks = activeBlocks.filter((b) => b.scope === 'loop');
  const isrBlocks = activeBlocks.filter((b) => b.scope === 'isr');

  // Track global initializations
  const hasUartInit = setupBlocks.some((b) => b.type === 'protocol_uart_init' || b.type === 'uart_init');
  const hasI2cInit = setupBlocks.some((b) => b.type === 'protocol_i2c_init' || b.type === 'i2c_start');
  const hasSpiInit = setupBlocks.some((b) => b.type === 'protocol_spi_init' || b.type === 'spi_init');
  const hasAdcInit = setupBlocks.some((b) => b.type === 'analog_adc_init' || b.type === 'adc_init');

  // Collect labels per scope
  const labelsByScope: Record<BlockScope, Set<string>> = {
    setup: new Set(),
    loop: new Set(),
    isr: new Set(),
  };
  activeBlocks.forEach((b) => {
    if (b.type === 'flow_label' && b.params.labelName) {
      labelsByScope[b.scope].add(String(b.params.labelName).trim());
    }
  });

  // Track I2C transactions
  let i2cStarts = 0;
  let i2cStops = 0;

  // 1. PIN CONFIGURATION & PROTOCOL SCANNING
  activeBlocks.forEach((block) => {
    const pin = block.params?.pin ? String(block.params.pin) : undefined;
    if (pin && pinMap[pin]) {
      if (block.type === 'io_pin_mode' || block.type === 'pin_mode') {
        pinMap[pin].modes.push({
          mode: String(block.params.mode || 'OUTPUT'),
          scope: block.scope,
          blockId: block.id,
          blockType: block.type,
        });
      }
      if (block.type === 'analog_pwm_write' || block.type === 'pwm_write') {
        pinMap[pin].isPwmUsed = true;
      }
      if (block.type === 'analog_adc_read' || block.type === 'adc_read') {
        pinMap[pin].isAdcUsed = true;
      }
      if (block.type.startsWith('protocol_onewire_') || block.type === 'module_ds18b20_read_temp') {
        pinMap[pin].protocols.push('1-Wire');
      }
    }

    // Protocol pin reservations
    if (hasUartInit) {
      if (!pinMap['0'].protocols.includes('UART RX')) pinMap['0'].protocols.push('UART RX');
      if (!pinMap['1'].protocols.includes('UART TX')) pinMap['1'].protocols.push('UART TX');
    }
    if (hasI2cInit) {
      if (!pinMap['A4'].protocols.includes('I2C SDA')) pinMap['A4'].protocols.push('I2C SDA');
      if (!pinMap['A5'].protocols.includes('I2C SCL')) pinMap['A5'].protocols.push('I2C SCL');
    }
    if (hasSpiInit) {
      if (!pinMap['10'].protocols.includes('SPI SS')) pinMap['10'].protocols.push('SPI SS');
      if (!pinMap['11'].protocols.includes('SPI MOSI')) pinMap['11'].protocols.push('SPI MOSI');
      if (!pinMap['12'].protocols.includes('SPI MISO')) pinMap['12'].protocols.push('SPI MISO');
      if (!pinMap['13'].protocols.includes('SPI SCK')) pinMap['13'].protocols.push('SPI SCK');
    }
  });

  // 2. CHECK PIN CONFLICTS ACROSS PROTOCOLS & MULTIPLE MODES
  Object.values(pinMap).forEach((p) => {
    // A) Mode conflict: both INPUT and OUTPUT configured
    const distinctModes = Array.from(new Set(p.modes.map((m) => m.mode)));
    if (distinctModes.length > 1) {
      p.hasConflict = true;
      p.conflictReason = `Ellentmondásos lábmódok: ${distinctModes.join(', ')}`;
      items.push({
        id: `conflict-mode-${p.pin}`,
        title: `Láb Mód Ütközés: Pin ${p.pin}`,
        description: `A(z) ${p.pin}. láb egyszerre több ellentétes móddal (${distinctModes.join(' és ')}) van beállítva. Ez zárlatot vagy bizonytalan bemeneti állapotot eredményezhet.`,
        severity: 'critical',
        category: 'pin_conflict',
        pin: p.pin,
        hardwareNote: 'Az ATmega328P DDR regiszterbitje egyszerre csak vagy 0 (INPUT) vagy 1 (OUTPUT) lehet.',
      });
    }

    // B) UART conflict (Pin 0/1 used as GPIO or 1-Wire while Serial is active)
    if ((p.pin === '0' || p.pin === '1') && (p.modes.length > 0 || p.protocols.includes('1-Wire'))) {
      p.hasConflict = true;
      p.conflictReason = 'Hardveres USB Soros (UART) ütközés';
      items.push({
        id: `conflict-uart-${p.pin}`,
        title: `Soros Port (UART) Hardver Ütközés: Pin ${p.pin}`,
        description: `A(z) ${p.pin}. láb a mikrokontroller hardveres USART (USB programozás és Serial) portja. Egyidejű digitális ki/bemenetként való használata zavarja a terminálkapcsolatot.`,
        severity: 'warning',
        category: 'pin_conflict',
        pin: p.pin,
        hardwareNote: 'Javasolt a D2 - D12 vagy A0 - A5 szabad lábak használata általános I/O célra.',
      });
    }

    // C) I2C conflict (Pin A4/A5 used for ADC/GPIO while I2C is active)
    if ((p.pin === 'A4' || p.pin === 'A5') && hasI2cInit && (p.modes.length > 0 || p.isAdcUsed)) {
      p.hasConflict = true;
      p.conflictReason = 'I2C TWI Hardver Busz ütközés';
      items.push({
        id: `conflict-i2c-${p.pin}`,
        title: `I2C Busz és Analóg Láb Ütközés: Pin ${p.pin}`,
        description: `A(z) ${p.pin}. lábat az I2C TWI hardver (SDA/SCL) használja. Ugyanezen a lábon lévő egyedi analóg mérés vagy I/O művelet összeomlasztja a csatlakoztatott I2C szenzorokat.`,
        severity: 'critical',
        category: 'pin_conflict',
        pin: p.pin,
        hardwareNote: 'Az I2C busz a PC4/PC5 lábakon hardveresen működik, kizárólagos buszhasználattal.',
      });
    }

    // D) SPI conflict (Pin 10-13 used as standard GPIO during SPI)
    if (['10', '11', '12', '13'].includes(p.pin) && hasSpiInit && p.modes.some((m) => m.mode === 'INPUT')) {
      p.hasConflict = true;
      items.push({
        id: `conflict-spi-${p.pin}`,
        title: `SPI Hardver Busz és Bemenet Ütközés: Pin ${p.pin}`,
        description: `A(z) ${p.pin}. láb az SPI szinkron buszhoz (MOSI/MISO/SCK/SS) tartozik.`,
        severity: 'warning',
        category: 'pin_conflict',
        pin: p.pin,
      });
    }
  });

  // 3. DETAILED BLOCK-BY-BLOCK STATIC INSPECTION
  activeBlocks.forEach((block, index) => {
    const pin = block.params?.pin ? String(block.params.pin) : undefined;

    // A) Missing pinMode OUTPUT before digital write / toggle / pwm write
    if (
      (block.type === 'io_pin_write' ||
        block.type === 'digital_write' ||
        block.type === 'io_pin_toggle' ||
        block.type === 'analog_pwm_write' ||
        block.type === 'pwm_write') &&
      pin
    ) {
      const pinCfg = pinMap[pin]?.modes.find((m) => m.mode === 'OUTPUT');
      if (!pinCfg) {
        items.push({
          id: `missing-output-${block.id}`,
          title: `Hiányzó DDR Kimenet Beállítás: Pin ${pin}`,
          description: `A(z) ${pin}. lábra kimeneti írás történik, de a 'setup' szakaszban nincs 'OUTPUT' kimenetként konfigurálva a pinMode regiszter.`,
          severity: 'warning',
          category: 'missing_init',
          scope: block.scope,
          blockId: block.id,
          blockType: block.type,
          pin,
          hardwareNote: 'Ha a láb bemenet marad és 1-et írunk rá, a belső felhúzó ellenállás (Pull-Up) aktiválódik valódi kimenet helyett.',
          quickFix: {
            id: `fix-add-pinmode-${pin}`,
            label: `Pin ${pin} (OUTPUT) hozzáadása a Setup-hoz`,
            description: `Beszúr egy 'io_pin_mode' blokkot a setup szakasz elejére (OUTPUT móddal).`,
            apply: (prev) => [
              {
                id: `fix_pm_${Date.now()}`,
                type: 'io_pin_mode',
                scope: 'setup',
                params: { pin: pin as ArduinoPin, mode: 'OUTPUT' },
                enabled: true,
              },
              ...prev,
            ],
          },
        });
      }
    }

    // B) Floating pin / bouncing protection (pinMode INPUT without pullup when reading buttons)
    if ((block.type === 'io_pin_mode' || block.type === 'pin_mode') && pin) {
      const mode = String(block.params.mode || '');
      if (mode === 'INPUT') {
        items.push({
          id: `floating-pin-${block.id}`,
          title: `Lebegő Bemenet Kockázat: Pin ${pin} (INPUT)`,
          description: `A(z) ${pin}. láb sima 'INPUT' módban van. Külső felhúzó vagy lehúzó ellenállás nélkül a bemenet zavarjeleket vesz és véletlenszerűen billenhet. Javasolt a belső 'INPUT_PULLUP' használata.`,
          severity: 'optimization',
          category: 'floating_pin',
          scope: block.scope,
          blockId: block.id,
          blockType: block.type,
          pin,
          hardwareNote: 'Az ATmega328P beépített 20k-50kΩ-os felhúzó ellenállással rendelkezik, ami szoftveresen bekapcsolható.',
          quickFix: {
            id: `fix-pullup-${block.id}`,
            label: `Átváltás 'INPUT_PULLUP' (Belső Felhúzás) módra`,
            description: `Módosítja a lábmódot INPUT_PULLUP-ra a stabil logikai szintekért.`,
            apply: (prev) =>
              prev.map((b) =>
                b.id === block.id ? { ...b, params: { ...b.params, mode: 'INPUT_PULLUP' } } : b
              ),
          },
        });
      }
    }

    // C) PWM Pin Capability Verification
    if ((block.type === 'analog_pwm_write' || block.type === 'pwm_write') && pin) {
      if (!PWM_PINS.has(pin)) {
        items.push({
          id: `pwm-incapable-${block.id}`,
          title: `Nem PWM-képes Láb: Pin ${pin}`,
          description: `Az ATmega328P csak a 3, 5, 6, 9, 10, 11 lábakon rendelkezik hardveres Timer összehasonlító egységgel (OCxA/OCxB). A(z) ${pin}-es láb nem tud hardveres analóg PWM jelet generálni.`,
          severity: 'critical',
          category: 'pin_conflict',
          scope: block.scope,
          blockId: block.id,
          blockType: block.type,
          pin,
          hardwareNote: 'Csak a Timer0 (Pin 5, 6), Timer1 (Pin 9, 10) és Timer2 (Pin 3, 11) lábak támogatják a PWM-et.',
          quickFix: {
            id: `fix-pwm-pin9-${block.id}`,
            label: `Átállítás Pin 9-re (Timer1 OC1A PWM)`,
            description: `Módosítja a kimeneti lábat a szabványos 9-es PWM lábra.`,
            apply: (prev) =>
              prev.map((b) =>
                b.id === block.id ? { ...b, params: { ...b.params, pin: '9' } } : b
              ),
          },
        });
      }
    }

    // D) Analog ADC Pin Capability Verification
    if ((block.type === 'analog_adc_read' || block.type === 'adc_read') && pin) {
      if (!ADC_PINS.has(pin)) {
        items.push({
          id: `adc-incapable-${block.id}`,
          title: `Nem Analóg-képes Láb: Pin ${pin}`,
          description: `Az analóg feszültségmérés (ADC) csak az A0 - A5 analóg bemeneteken lehetséges. A(z) ${pin}-es láb kizárólag digitális I/O műveletekre alkalmas.`,
          severity: 'critical',
          category: 'pin_conflict',
          scope: block.scope,
          blockId: block.id,
          blockType: block.type,
          pin,
          quickFix: {
            id: `fix-adc-a0-${block.id}`,
            label: `Átállítás A0 Analóg Bemenetre`,
            description: `Módosítja a lábat A0-ra.`,
            apply: (prev) =>
              prev.map((b) =>
                b.id === block.id ? { ...b, params: { ...b.params, pin: 'A0' } } : b
              ),
          },
        });
      }
    }

    // E) Missing Protocol Initializations
    if (
      (block.type === 'protocol_uart_print_str' ||
        block.type === 'protocol_uart_write_char' ||
        block.type === 'protocol_uart_read_byte' ||
        block.type === 'uart_tx') &&
      !hasUartInit
    ) {
      items.push({
        id: `missing-uart-init-${block.id}`,
        title: `Hiányzó Soros Port (UART) Inicializálás`,
        description: `Soros porti adatküldés vagy fogadás történik, de a 'setup' szakaszban nem található meg a soros port konfigurációja (Baud rate beállítás).`,
        severity: 'critical',
        category: 'missing_init',
        scope: block.scope,
        blockId: block.id,
        blockType: block.type,
        quickFix: {
          id: `fix-uart-init-9600`,
          label: `UART Init (9600 Baud) hozzáadása a Setup-hoz`,
          description: `Beszúr egy UART konfigurációs blokkot a setup szakaszba.`,
          apply: (prev) => [
            {
              id: `fix_uart_${Date.now()}`,
              type: 'protocol_uart_init',
              scope: 'setup',
              params: { baud: '9600', format: '8N1' },
              enabled: true,
            },
            ...prev,
          ],
        },
      });
    }

    if (
      (block.type === 'protocol_i2c_start_stop' ||
        block.type === 'protocol_i2c_write_byte' ||
        block.type === 'i2c_write' ||
        block.type === 'i2c_read') &&
      !hasI2cInit
    ) {
      items.push({
        id: `missing-i2c-init-${block.id}`,
        title: `Hiányzó I2C TWI Busz Inicializálás`,
        description: `I2C buszművelet történik hardveres TWI inicializálás (TWBR órajel beállítás) nélkül.`,
        severity: 'critical',
        category: 'missing_init',
        scope: block.scope,
        blockId: block.id,
        blockType: block.type,
        quickFix: {
          id: `fix-i2c-init-100k`,
          label: `I2C Master Init (100 kHz) hozzáadása a Setup-hoz`,
          description: `Beszúr egy I2C Master Init blokkot a setup szakaszba.`,
          apply: (prev) => [
            {
              id: `fix_i2c_${Date.now()}`,
              type: 'protocol_i2c_init',
              scope: 'setup',
              params: { frequency: '100kHz' },
              enabled: true,
            },
            ...prev,
          ],
        },
      });
    }

    if (block.type === 'protocol_i2c_start_stop') {
      if (block.params.action === 'START' || block.params.action === 'REPEATED_START') i2cStarts++;
      if (block.params.action === 'STOP') i2cStops++;
    }

    // F) ISR Timing Hazard & Blocking Delays
    if (block.scope === 'isr') {
      if (block.type === 'timing_milli_delay' || block.type === 'delay_ms') {
        const ms = Number(block.params.ms || block.params.value || 100);
        if (ms > 5) {
          items.push({
            id: `isr-delay-hazard-${block.id}`,
            title: `Kritikus: Hosszú Késleltetés Megszakításban (${ms} ms)`,
            description: `Az ISR megszakítási rutinban tilos hosszú blokkoló várakozást végezni! Ez lefagyasztja a processzort, késlelteti az időzítőket és eldobja a bejövő UART adatokat.`,
            severity: 'critical',
            category: 'isr_safety',
            scope: 'isr',
            blockId: block.id,
            blockType: block.type,
            hardwareNote: 'Az ISR rutinnak a lehető leggyorsabban (néhány mikroszekundum alatt) le kell futnia és csak jelzőbites flag-et szabad állítania.',
            quickFix: {
              id: `fix-remove-isr-delay-${block.id}`,
              label: `Blokkoló késleltetés eltávolítása az ISR-ből`,
              description: `Törli a késleltető blokkot a megszakításkezelőből.`,
              apply: (prev) => prev.filter((b) => b.id !== block.id),
            },
          });
        }
      }
    }

    // G) LDI Register Constraint Validation (r16 - r31)
    if (block.type === 'math_reg_load' || block.type === 'load_register_immediate') {
      const reg = String(block.params.reg || 'r16').toLowerCase();
      if (!VALID_LDI_REGISTERS.has(reg)) {
        items.push({
          id: `invalid-ldi-reg-${block.id}`,
          title: `Érvénytelen LDI Célregiszter: ${reg}`,
          description: `Az AVR gépi kódú 'ldi' (Load Immediate) utasítás csak a felső 16 regisztert (r16–r31) éri el közvetlenül konstanssal. Az ${reg} használata fordítási hibát okoz.`,
          severity: 'critical',
          category: 'memory_safety',
          scope: block.scope,
          blockId: block.id,
          blockType: block.type,
          hardwareNote: 'Alsó regiszterekbe (r0-r15) való betöltéshez először r16-ba kell tölteni az értéket, majd mov utasítással másolni.',
          quickFix: {
            id: `fix-ldi-to-r16-${block.id}`,
            label: `Átállítás 'r16' munkaregiszterre`,
            description: `Módosítja a célregisztert r16-ra.`,
            apply: (prev) =>
              prev.map((b) =>
                b.id === block.id ? { ...b, params: { ...b.params, reg: 'r16' } } : b
              ),
          },
        });
      }
    }

    // H) EEPROM Wear-Leveling and Bounds
    if (block.type === 'memory_eeprom_write' || block.type === 'eeprom_write') {
      if (block.scope === 'loop') {
        items.push({
          id: `eeprom-wear-${block.id}`,
          title: `EEPROM Élettartam Kockázat (Wear-Leveling)`,
          description: `Az EEPROM közvetlen írása a fő ciklushurokban (loop) másodpercek alatt kimerítheti a mikrokontroller celláinak ~100,000 írási élettartamát. Használj 'memory_eeprom_update'-et, ami csak változáskor ír!`,
          severity: 'warning',
          category: 'memory_safety',
          scope: 'loop',
          blockId: block.id,
          blockType: block.type,
          quickFix: {
            id: `fix-eeprom-update-mode-${block.id}`,
            label: `Váltás 'EEPROM Update' (Intelligens Írás) blokkra`,
            description: `Átalakítja a blokkot intelligens update-re a hardveres cellák kímélése érdekében.`,
            apply: (prev) =>
              prev.map((b) =>
                b.id === block.id ? { ...b, type: 'memory_eeprom_update' } : b
              ),
          },
        });
      }
    }

    // I) Jump Label Existence Check
    if (block.type === 'flow_rjmp' || block.type === 'flow_compare_branch') {
      const targetLabel = String(block.params.label || block.params.targetLabel || '').trim();
      if (targetLabel && !labelsByScope[block.scope].has(targetLabel)) {
        items.push({
          id: `missing-jump-label-${block.id}`,
          title: `Nem Létező Ugrási Célpont: '${targetLabel}'`,
          description: `A vezérlés a(z) '${targetLabel}' címkére ugrik, de a(z) '${block.scope}' szakaszban nincs definiálva ilyen 'flow_label' blokk.`,
          severity: 'critical',
          category: 'flow_control',
          scope: block.scope,
          blockId: block.id,
          blockType: block.type,
          quickFix: {
            id: `fix-create-label-${targetLabel}`,
            label: `'${targetLabel}' Címke Létrehozása`,
            description: `Beszúr egy '${targetLabel}' célcímke blokkot a szakasz végére.`,
            apply: (prev) => [
              ...prev,
              {
                id: `fix_lbl_${Date.now()}`,
                type: 'flow_label',
                scope: block.scope,
                params: { labelName: targetLabel },
                enabled: true,
              },
            ],
          },
        });
      }
    }
  });

  // 4. GLOBAL PROGRAM PIPELINE CHECKS
  // Check for Unclosed I2C transactions
  if (i2cStarts > i2cStops) {
    items.push({
      id: 'i2c-unclosed-bus',
      title: `Nyitva Maradt I2C Tranzakció`,
      description: `Az I2C START feltételek száma (${i2cStarts}) meghaladja a STOP feltételek számát (${i2cStops}). A TWI busz lefoglalva maradhat, megakasztva a kommunikációt.`,
      severity: 'warning',
      category: 'missing_init',
      scope: 'loop',
      quickFix: {
        id: 'fix-i2c-add-stop',
        label: `I2C STOP feltétel beszúrása a loop végére`,
        description: `Beszúr egy STOP feltételt a ciklus végére a busz felszabadításához.`,
        apply: (prev) => [
          ...prev,
          {
            id: `fix_stop_${Date.now()}`,
            type: 'protocol_i2c_start_stop',
            scope: 'loop',
            params: { action: 'STOP' },
            enabled: true,
          },
        ],
      },
    });
  }

  // Check for empty loop with only pin toggling (Zero Delay CPU hogging)
  const hasDelayInLoop = loopBlocks.some(
    (b) =>
      b.type === 'timing_milli_delay' ||
      b.type === 'timing_micro_delay' ||
      b.type === 'delay_ms' ||
      b.type === 'delay_us'
  );
  const hasPinToggleInLoop = loopBlocks.some(
    (b) =>
      b.type === 'io_pin_write' ||
      b.type === 'digital_write' ||
      b.type === 'io_pin_toggle'
  );
  if (loopBlocks.length > 0 && hasPinToggleInLoop && !hasDelayInLoop) {
    items.push({
      id: 'zero-delay-loop-info',
      title: `Késleltetés Nélküli Végtelen Ciklus (~2-4 MHz kapcsolás)`,
      description: `A loop ciklusban lábkapcsolás van időzítés nélkül. A LED vagy kimenet több millió alkalommal villan másodpercenként, ami emberi szemmel folyamatos fénynek látszik és maximálisan terheli a CPU-t.`,
      severity: 'optimization',
      category: 'timing_hazard',
      scope: 'loop',
      quickFix: {
        id: 'fix-add-500ms-delay',
        label: `500 ms Időzítés beszúrása a Loop végére`,
        description: `Beszúr egy 500 ms-os várakozást az emberi szem számára látható villogáshoz.`,
        apply: (prev) => [
          ...prev,
          {
            id: `fix_dly_${Date.now()}`,
            type: 'timing_milli_delay',
            scope: 'loop',
            params: { ms: 500 },
            enabled: true,
          },
        ],
      },
    });
  }

  // Calculate Health Score (100 base, deductions for issues)
  const criticalCount = items.filter((i) => i.severity === 'critical').length;
  const warningCount = items.filter((i) => i.severity === 'warning').length;
  const optimizationCount = items.filter((i) => i.severity === 'optimization').length;
  const passCount = activeBlocks.length > 0 && criticalCount === 0 && warningCount === 0 ? 1 : 0;

  let healthScore = 100;
  healthScore -= criticalCount * 25;
  healthScore -= warningCount * 10;
  healthScore -= optimizationCount * 3;
  if (healthScore < 0) healthScore = 0;
  if (activeBlocks.length === 0) healthScore = 100;

  return {
    timestamp: new Date().toLocaleTimeString(),
    totalBlocks: activeBlocks.length,
    healthScore,
    criticalCount,
    warningCount,
    optimizationCount,
    passCount,
    items,
    pinMap,
    isHardwareSafe: criticalCount === 0,
  };
}
