import { ProgramBlock, BlockScope, ArduinoPin } from '../types';
import { PIN_MAPPINGS } from './hardwareMap';

export type IssueSeverity = 'error' | 'warning' | 'info';

export interface QuickFixAction {
  id: string;
  label: string;
  description: string;
  apply: (blocks: ProgramBlock[]) => ProgramBlock[];
}

export interface BlockValidationIssue {
  id: string;
  severity: IssueSeverity;
  blockId?: string;
  scope?: BlockScope;
  blockIndex?: number;
  blockName?: string;
  title: string;
  message: string;
  quickFix?: QuickFixAction;
}

export interface ValidationReport {
  isValid: boolean;
  errorCount: number;
  warningCount: number;
  infoCount: number;
  totalIssues: number;
  issues: BlockValidationIssue[];
  issuesByBlockId: Record<string, BlockValidationIssue[]>;
  issuesByScope: Record<BlockScope, BlockValidationIssue[]>;
}

const PWM_CAPABLE_PINS = new Set(['3', '5', '6', '9', '10', '11']);
const ANALOG_CAPABLE_PINS = new Set(['A0', 'A1', 'A2', 'A3', 'A4', 'A5', '14', '15', '16', '17', '18', '19']);
const VALID_LDI_REGISTERS = new Set([
  'r16', 'r17', 'r18', 'r19', 'r20', 'r21', 'r22', 'r23',
  'r24', 'r25', 'r26', 'r27', 'r28', 'r29', 'r30', 'r31'
]);

/**
 * Validates the entire block program structure, relationships, hardware mappings,
 * scope placements, register constraints, protocol initialization, and timing safety.
 */
export function validateBlockProgram(blocks: ProgramBlock[]): ValidationReport {
  const issues: BlockValidationIssue[] = [];

  const setupBlocks = blocks.filter((b) => b.scope === 'setup' && b.enabled !== false);
  const loopBlocks = blocks.filter((b) => b.scope === 'loop' && b.enabled !== false);
  const isrBlocks = blocks.filter((b) => b.scope === 'isr' && b.enabled !== false);

  // Collect configured pins in setup
  const configuredPinsInSetup = new Map<string, { mode: string; blockId: string }>();
  setupBlocks.forEach((b) => {
    if (b.type === 'io_pin_mode' && b.params.pin) {
      configuredPinsInSetup.set(String(b.params.pin), {
        mode: String(b.params.mode || 'OUTPUT'),
        blockId: b.id,
      });
    }
  });

  // Track initializations in setup
  const hasUartInit = setupBlocks.some((b) => b.type === 'protocol_uart_init');
  const hasI2cInit = setupBlocks.some((b) => b.type === 'protocol_i2c_init');
  const hasSpiInit = setupBlocks.some((b) => b.type === 'protocol_spi_init');
  const hasAdcInit = setupBlocks.some((b) => b.type === 'analog_adc_init');
  const hasPwmInit = setupBlocks.some((b) => b.type === 'analog_pwm_init');

  // Track I2C transactions in loop
  let i2cStartsInLoop = 0;
  let i2cStopsInLoop = 0;

  // Track labels per scope
  const labelsByScope: Record<BlockScope, Set<string>> = {
    setup: new Set(),
    loop: new Set(),
    isr: new Set(),
  };

  blocks.forEach((b) => {
    if (b.type === 'flow_label' && b.params.labelName) {
      labelsByScope[b.scope].add(String(b.params.labelName).trim());
    }
  });

  // Check individual blocks
  blocks.forEach((block, index) => {
    if (block.enabled === false) return;

    const blockPin = block.params?.pin ? String(block.params.pin) : undefined;

    // 1. PIN OUTPUT INITIALIZATION CHECK (Write/Toggle without pinMode in setup)
    if (
      (block.type === 'io_pin_write' || block.type === 'io_pin_toggle' || block.type === 'analog_pwm_write') &&
      blockPin
    ) {
      const pinCfg = configuredPinsInSetup.get(blockPin);
      const isOutputConfigured = pinCfg && pinCfg.mode === 'OUTPUT';

      // If neither configured in setup nor earlier in same scope
      if (!isOutputConfigured) {
        issues.push({
          id: `pin-uninit-${block.id}`,
          severity: 'warning',
          blockId: block.id,
          scope: block.scope,
          blockIndex: index,
          title: `Hiányzó Láb Beállítás (DDR) Pin ${blockPin}`,
          message: `A(z) ${blockPin}. lábra írás történik, de a 'setup' szakaszban nincs beállítva 'OUTPUT' (kimenet) módra a pinMode regiszter.`,
          quickFix: {
            id: `fix-pin-output-${blockPin}`,
            label: `Pin ${blockPin} (OUTPUT) hozzáadása a setup-hoz`,
            description: `Beszúr egy 'io_pin_mode' blokkot a setup szakaszba Pin ${blockPin} OUTPUT beállítással.`,
            apply: (prevBlocks) => {
              const newBlock: ProgramBlock = {
                id: `fix_pin_${Date.now()}`,
                type: 'io_pin_mode',
                scope: 'setup',
                params: { pin: blockPin as ArduinoPin, mode: 'OUTPUT' },
                enabled: true,
              };
              return [newBlock, ...prevBlocks];
            },
          },
        });
      }
    }

    // 2. PWM PIN CAPABILITY CHECK
    if (block.type === 'analog_pwm_write' && blockPin) {
      if (!PWM_CAPABLE_PINS.has(blockPin)) {
        issues.push({
          id: `pwm-invalid-pin-${block.id}`,
          severity: 'error',
          blockId: block.id,
          scope: block.scope,
          blockIndex: index,
          title: `Nem-PWM képes láb: Pin ${blockPin}`,
          message: `Az Arduino Uno / ATmega328P csak a 3, 5, 6, 9, 10 és 11-es lábakon támogat hardveres PWM analóg kimenetet. A(z) ${blockPin}-es láb nem rendelkezik hardveres Timer összehasonlító egységgel.`,
          quickFix: {
            id: `fix-pwm-pin-${block.id}`,
            label: `Átállítás Pin 9-re (OC1A Timer1 PWM)`,
            description: `Módosítja a lábat a hardveres PWM-et támogató Pin 9-re.`,
            apply: (prevBlocks) =>
              prevBlocks.map((b) =>
                b.id === block.id ? { ...b, params: { ...b.params, pin: '9' } } : b
              ),
          },
        });
      }
    }

    // 3. ANALOG ADC PIN CAPABILITY CHECK
    if (block.type === 'analog_adc_read' && blockPin) {
      if (!ANALOG_CAPABLE_PINS.has(blockPin)) {
        issues.push({
          id: `adc-invalid-pin-${block.id}`,
          severity: 'error',
          blockId: block.id,
          scope: block.scope,
          blockIndex: index,
          title: `Nem-Analóg képes láb: Pin ${blockPin}`,
          message: `Az analóg olvasás (ADC) csak az A0-A5 (14-19) analóg bemeneteken érhető el. A(z) ${blockPin}-es láb digitális láb.`,
          quickFix: {
            id: `fix-adc-pin-${block.id}`,
            label: `Átállítás A0 analóg lábra`,
            description: `Módosítja a cél analóg lábat A0-ra.`,
            apply: (prevBlocks) =>
              prevBlocks.map((b) =>
                b.id === block.id ? { ...b, params: { ...b.params, pin: 'A0' } } : b
              ),
          },
        });
      }
    }

    // 4. UART PROTOCOL INITIALIZATION
    if (
      (block.type === 'protocol_uart_print_str' ||
        block.type === 'protocol_uart_write_char' ||
        block.type === 'protocol_uart_read_byte') &&
      !hasUartInit
    ) {
      issues.push({
        id: `uart-no-init-${block.id}`,
        severity: 'error',
        blockId: block.id,
        scope: block.scope,
        blockIndex: index,
        title: `Hiányzó UART (Serial) Inicializálás`,
        message: `Soros porti adatküldés történik, de a 'setup' szakaszban nincs inicializálva az UART (UBRR0 / UCSR0B / Serial.begin).`,
        quickFix: {
          id: `fix-uart-init`,
          label: `Serial.begin(9600) hozzáadása a setup-hoz`,
          description: `Beszúr egy UART konfigurációs blokkot a setup szakasz elejére 9600 baud sebességgel.`,
          apply: (prevBlocks) => {
            const initBlock: ProgramBlock = {
              id: `fix_uart_${Date.now()}`,
              type: 'protocol_uart_init',
              scope: 'setup',
              params: { baud: '9600', format: '8N1' },
              enabled: true,
            };
            return [initBlock, ...prevBlocks];
          },
        },
      });
    }

    // 5. I2C PROTOCOL INITIALIZATION & TRANSACTION BALANCE
    if (
      (block.type === 'protocol_i2c_start_stop' || block.type === 'protocol_i2c_write_byte') &&
      !hasI2cInit
    ) {
      issues.push({
        id: `i2c-no-init-${block.id}`,
        severity: 'error',
        blockId: block.id,
        scope: block.scope,
        blockIndex: index,
        title: `Hiányzó I2C (TWI) Busz Inicializálás`,
        message: `I2C kommunikációs blokk van használatban, de a 'setup' szakasz nem tartalmaz I2C hardveres inicializáló blokkot (TWBR / Wire.begin).`,
        quickFix: {
          id: `fix-i2c-init`,
          label: `I2C Busz Init (100 kHz) hozzáadása a setup-hoz`,
          description: `Beszúr egy I2C Master Init blokkot a setup szakaszba.`,
          apply: (prevBlocks) => {
            const initBlock: ProgramBlock = {
              id: `fix_i2c_${Date.now()}`,
              type: 'protocol_i2c_init',
              scope: 'setup',
              params: { frequency: '100kHz' },
              enabled: true,
            };
            return [initBlock, ...prevBlocks];
          },
        },
      });
    }

    if (block.type === 'protocol_i2c_start_stop') {
      if (block.params.action === 'START' || block.params.action === 'REPEATED_START') {
        i2cStartsInLoop++;
      } else if (block.params.action === 'STOP') {
        i2cStopsInLoop++;
      }
    }

    // 6. SPI PROTOCOL INITIALIZATION
    if (
      (block.type === 'protocol_spi_slave_select' || block.type === 'protocol_spi_transfer') &&
      !hasSpiInit
    ) {
      issues.push({
        id: `spi-no-init-${block.id}`,
        severity: 'error',
        blockId: block.id,
        scope: block.scope,
        blockIndex: index,
        title: `Hiányzó SPI Busz Inicializálás`,
        message: `SPI adatátviteli blokk van használatban, de a 'setup' szakaszban nem található SPI Master inicializálás (SPCR / SPI.begin).`,
        quickFix: {
          id: `fix-spi-init`,
          label: `SPI Mester Inicializálás hozzáadása a setup-hoz`,
          description: `Beszúr egy SPI Init blokkot a setup szakasz elejére.`,
          apply: (prevBlocks) => {
            const initBlock: ProgramBlock = {
              id: `fix_spi_${Date.now()}`,
              type: 'protocol_spi_init',
              scope: 'setup',
              params: { clockDiv: 'DIV4', dataMode: 'MODE0' },
              enabled: true,
            };
            return [initBlock, ...prevBlocks];
          },
        },
      });
    }

    // 7. LDI INSTRUCTION REGISTER RESTRICTION (r16 - r31 only)
    if (block.type === 'math_reg_load') {
      const reg = String(block.params.reg || 'r16').toLowerCase();
      if (!VALID_LDI_REGISTERS.has(reg)) {
        issues.push({
          id: `ldi-reg-invalid-${block.id}`,
          severity: 'error',
          blockId: block.id,
          scope: block.scope,
          blockIndex: index,
          title: `Érvénytelen LDI Regiszter: ${reg}`,
          message: `Az AVR architektúrában az 'ldi' (Load Immediate) utasítás kizárólag a felső 16 regiszteren (r16-r31) hajtható végre. Az ${reg} használata asm fordítási hibát eredményez.`,
          quickFix: {
            id: `fix-ldi-reg-${block.id}`,
            label: `Átállítás 'r16' munkaregiszterre`,
            description: `Módosítja a célregisztert a szabványos 'r16' regiszterre.`,
            apply: (prevBlocks) =>
              prevBlocks.map((b) =>
                b.id === block.id ? { ...b, params: { ...b.params, reg: 'r16' } } : b
              ),
          },
        });
      }

      // Value bounds 0-255
      const val = Number(block.params.value ?? 0);
      if (val < 0 || val > 255) {
        issues.push({
          id: `ldi-val-overflow-${block.id}`,
          severity: 'warning',
          blockId: block.id,
          scope: block.scope,
          blockIndex: index,
          title: `8-bites Értéktartomány Túllépés: ${val}`,
          message: `Az AVR 8-bites regiszterek csak a 0 - 255 (0x00 - 0xFF) tartományt tudják közvetlenül tárolni. A(z) ${val} túlcsordul vagy levágásra kerül.`,
          quickFix: {
            id: `fix-ldi-val-${block.id}`,
            label: `Érték korlátozása: ${Math.min(255, Math.max(0, val))}`,
            description: `Levágja a számot az érvényes 0-255 tartományba.`,
            apply: (prevBlocks) =>
              prevBlocks.map((b) =>
                b.id === block.id
                  ? { ...b, params: { ...b.params, value: Math.min(255, Math.max(0, val)) } }
                  : b
              ),
          },
        });
      }
    }

    // 8. EEPROM ADDRESS & WEAR-LEVELING
    if (
      block.type === 'memory_eeprom_write' ||
      block.type === 'memory_eeprom_read' ||
      block.type === 'memory_eeprom_update'
    ) {
      const addr = Number(block.params.address ?? 0);
      if (addr < 0 || addr > 1023) {
        issues.push({
          id: `eeprom-addr-oob-${block.id}`,
          severity: 'error',
          blockId: block.id,
          scope: block.scope,
          blockIndex: index,
          title: `EEPROM Címtartomány Hiba (0x${addr.toString(16)})`,
          message: `Az ATmega328P EEPROM mérete pontosan 1024 bájt (0 - 1023 / 0x0000 - 0x03FF). A megadott cím (${addr}) memóriahatáron kívülre mutat.`,
          quickFix: {
            id: `fix-eeprom-addr-${block.id}`,
            label: `Cím beállítása 0x0000-ra`,
            description: `Visszaállítja a címet az EEPROM kezdőcímére.`,
            apply: (prevBlocks) =>
              prevBlocks.map((b) =>
                b.id === block.id ? { ...b, params: { ...b.params, address: 0 } } : b
              ),
          },
        });
      }

      // Wear-leveling warning for eeprom_write in loop
      if (block.type === 'memory_eeprom_write' && block.scope === 'loop') {
        issues.push({
          id: `eeprom-wear-warning-${block.id}`,
          severity: 'warning',
          blockId: block.id,
          scope: block.scope,
          blockIndex: index,
          title: `EEPROM Élettartam Kockázat (Wear-Leveling)`,
          message: `A 'memory_eeprom_write' blokk közvetlenül a végtelen ciklushurokban (loop) fut. Ez folyamatosan újraírja a cellát (kb. 100,000 ciklus élettartam). Javasolt helyette a 'memory_eeprom_update' (okos írás) használata.`,
          quickFix: {
            id: `fix-eeprom-update-${block.id}`,
            label: `Váltás 'EEPROM Update (Wear-Leveling)' blokkra`,
            description: `Átalakítja a blokkot intelligens update műveletre, ami csak akkor ír a memóriába, ha az érték valóban megváltozott.`,
            apply: (prevBlocks) =>
              prevBlocks.map((b) =>
                b.id === block.id ? { ...b, type: 'memory_eeprom_update' } : b
              ),
          },
        });
      }
    }

    // 9. PROGMEM FLASH ADDRESS BOUNDS
    if (block.type === 'memory_progmem_read') {
      const addr = Number(block.params.address ?? 0);
      if (addr < 0 || addr > 32767) {
        issues.push({
          id: `progmem-addr-oob-${block.id}`,
          severity: 'error',
          blockId: block.id,
          scope: block.scope,
          blockIndex: index,
          title: `Flash PROGMEM Címhatár Hiba (0x${addr.toString(16)})`,
          message: `Az Arduino Uno Flash programmemóriája 32 KB (0 - 32767 / 0x0000 - 0x7FFF). A megadott cím (${addr}) a flash méretén kívül esik.`,
          quickFix: {
            id: `fix-progmem-addr-${block.id}`,
            label: `Cím beállítása 0x0000-ra`,
            description: `Visszaállítja a címet az érvényes flash kezdőcímre.`,
            apply: (prevBlocks) =>
              prevBlocks.map((b) =>
                b.id === block.id ? { ...b, params: { ...b.params, address: 0 } } : b
              ),
          },
        });
      }
    }

    // 10. JUMP TARGET EXISTS CHECK
    if (block.type === 'flow_rjmp' || block.type === 'flow_compare_branch') {
      const targetLabel = String(block.params.label || block.params.targetLabel || '').trim();
      if (targetLabel && !labelsByScope[block.scope].has(targetLabel)) {
        issues.push({
          id: `missing-label-${block.id}`,
          severity: 'warning',
          blockId: block.id,
          scope: block.scope,
          blockIndex: index,
          title: `Hiányzó Ugrási Címke: '${targetLabel}'`,
          message: `A program a(z) '${targetLabel}' címkére ugrik, de a(z) '${block.scope}' szakaszban nincs definiálva ilyen nevű 'flow_label' blokk.`,
          quickFix: {
            id: `fix-create-label-${targetLabel}`,
            label: `'${targetLabel}' Címke Létrehozása a(z) ${block.scope}-ban`,
            description: `Beszúr egy '${targetLabel}' feliratú ugrási célpont címkét a szakaszba.`,
            apply: (prevBlocks) => {
              const labelBlock: ProgramBlock = {
                id: `fix_lbl_${Date.now()}`,
                type: 'flow_label',
                scope: block.scope,
                params: { labelName: targetLabel },
                enabled: true,
              };
              return [...prevBlocks, labelBlock];
            },
          },
        });
      }
    }

    // 11. DANGEROUS DELAYS IN ISR
    if (block.scope === 'isr' && block.type === 'timing_milli_delay') {
      const ms = Number(block.params.ms ?? 100);
      if (ms > 5) {
        issues.push({
          id: `isr-long-delay-${block.id}`,
          severity: 'warning',
          blockId: block.id,
          scope: 'isr',
          blockIndex: index,
          title: `Kritikus: Hosszú Késleltetés ISR Megszakításban (${ms} ms)`,
          message: `A hardveres megszakításkezelőben (ISR) tilos hosszú késleltetést használni, mert blokkolja a mikrovezérlő összes többi megszakítását és a hardveres órajeleket.`,
          quickFix: {
            id: `fix-isr-delay-${block.id}`,
            label: `Késleltetés blokk eltávolítása az ISR-ből`,
            description: `Törli a blokkoló késleltetést a megszakítási rutint gyorsan lefutóvá téve.`,
            apply: (prevBlocks) => prevBlocks.filter((b) => b.id !== block.id),
          },
        });
      }
    }

    // 12. DS18B20 / 1-WIRE VALIDATION CHECKS
    if (block.type === 'module_ds18b20_read_temp') {
      const intReg = block.params.destIntReg || 'r24';
      const fracReg = block.params.destFracReg || 'r25';
      if (intReg === fracReg) {
        issues.push({
          id: `ds18b20-same-reg-${block.id}`,
          severity: 'warning',
          blockId: block.id,
          scope: block.scope,
          blockIndex: index,
          title: `Regiszter Ütközés a DS18B20 Olvasásnál (${intReg})`,
          message: `Az egész fok (${intReg}) és a tört fok (${fracReg}) ugyanarra a regiszterre mutat. A tört rész felülírja az egész fok értékét!`,
          quickFix: {
            id: `fix-ds18b20-reg-${block.id}`,
            label: `Tört rész átállítása r25 regiszterre`,
            description: `Különválasztja a két célregisztert (egész: r24, tört: r25).`,
            apply: (prevBlocks) =>
              prevBlocks.map((b) =>
                b.id === block.id
                  ? { ...b, params: { ...b.params, destIntReg: 'r24', destFracReg: 'r25' } }
                  : b
              ),
          },
        });
      }
    }

    if (
      (block.type === 'protocol_onewire_reset' ||
        block.type === 'protocol_onewire_write_byte' ||
        block.type === 'protocol_onewire_read_byte' ||
        block.type === 'module_ds18b20_read_temp') &&
      (block.params.pin === '0' || block.params.pin === '1')
    ) {
      issues.push({
        id: `onewire-uart-conflict-${block.id}`,
        severity: 'warning',
        blockId: block.id,
        scope: block.scope,
        blockIndex: index,
        title: `1-Wire / UART Láb Ütközés (D${block.params.pin})`,
        message: `A D0 (RX) és D1 (TX) lábak az USB soros kommunikációhoz (UART) vannak rendelve. Az 1-Wire busz használata ezeken a lábakon zavart okozhat a soros terminálban. Ajánlott láb: D2-D12 vagy A0-A5.`,
        quickFix: {
          id: `fix-onewire-pin-${block.id}`,
          label: `Átállítás a dedikált D2 lábra`,
          description: `Biztonságos D2 digitális I/O lábra irányítja az 1-Wire adatvonalat (DQ).`,
          apply: (prevBlocks) =>
            prevBlocks.map((b) =>
              b.id === block.id ? { ...b, params: { ...b.params, pin: '2' } } : b
            ),
        },
      });
    }
  });

  // Global Program Structure Checks:
  // 12. UNCLOSED I2C TRANSACTION
  if (i2cStartsInLoop > i2cStopsInLoop) {
    issues.push({
      id: `i2c-unclosed-transaction`,
      severity: 'warning',
      scope: 'loop',
      title: `Nyitva Maradt I2C Tranzakció`,
      message: `Az I2C START feltételek száma (${i2cStartsInLoop}) meghaladja az I2C STOP feltételek számát (${i2cStopsInLoop}). A busz foglalva maradhat.`,
      quickFix: {
        id: `fix-i2c-stop`,
        label: `I2C STOP feltétel hozzáadása a loop végére`,
        description: `Beszúr egy I2C Master STOP blokkot a ciklus végére.`,
        apply: (prevBlocks) => {
          const stopBlock: ProgramBlock = {
            id: `fix_i2c_stop_${Date.now()}`,
            type: 'protocol_i2c_start_stop',
            scope: 'loop',
            params: { action: 'STOP' },
            enabled: true,
          };
          return [...prevBlocks, stopBlock];
        },
      },
    });
  }

  // 13. ZERO-DELAY BUSY LOOP ADVICE
  const hasDelayInLoop = loopBlocks.some(
    (b) => b.type === 'timing_milli_delay' || b.type === 'timing_micro_delay'
  );
  const hasPinToggleInLoop = loopBlocks.some(
    (b) => b.type === 'io_pin_write' || b.type === 'io_pin_toggle'
  );

  if (loopBlocks.length > 0 && hasPinToggleInLoop && !hasDelayInLoop) {
    issues.push({
      id: `loop-zero-delay-info`,
      severity: 'info',
      scope: 'loop',
      title: `Nagyfrekvenciás Ciklushurok Késleltetés Nélkül`,
      message: `A loop ciklus lábkapcsolásokat tartalmaz késleltetés (delay) nélkül. A LED másodpercenként több millió alkalommal villoghat (~2-4 MHz), ami emberi szemmel folyamatos világításnak tűnik.`,
      quickFix: {
        id: `fix-add-loop-delay`,
        label: `100 ms Késleltetés hozzáadása a loop végére`,
        description: `Beszúr egy 100 ms-os időzítőt, hogy a villogás emberi szemmel is jól látható legyen.`,
        apply: (prevBlocks) => {
          const delayBlock: ProgramBlock = {
            id: `fix_delay_${Date.now()}`,
            type: 'timing_milli_delay',
            scope: 'loop',
            params: { ms: 100 },
            enabled: true,
          };
          return [...prevBlocks, delayBlock];
        },
      },
    });
  }

  // Aggregate stats
  const errorCount = issues.filter((i) => i.severity === 'error').length;
  const warningCount = issues.filter((i) => i.severity === 'warning').length;
  const infoCount = issues.filter((i) => i.severity === 'info').length;

  const issuesByBlockId: Record<string, BlockValidationIssue[]> = {};
  const issuesByScope: Record<BlockScope, BlockValidationIssue[]> = {
    setup: [],
    loop: [],
    isr: [],
  };

  issues.forEach((issue) => {
    if (issue.blockId) {
      if (!issuesByBlockId[issue.blockId]) {
        issuesByBlockId[issue.blockId] = [];
      }
      issuesByBlockId[issue.blockId].push(issue);
    }
    if (issue.scope) {
      issuesByScope[issue.scope].push(issue);
    }
  });

  return {
    isValid: errorCount === 0,
    errorCount,
    warningCount,
    infoCount,
    totalIssues: issues.length,
    issues,
    issuesByBlockId,
    issuesByScope,
  };
}
