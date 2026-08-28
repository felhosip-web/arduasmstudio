import { ProgramBlock, BlockScope, VariableDefinition } from '../types';
import { BLOCK_DEFINITIONS } from '../data/blockDefinitions';
import { PIN_MAPPINGS } from './hardwareMap';

export type DependencySeverity = 'critical' | 'warning' | 'info';

export type DependencyType =
  | 'pin_config'
  | 'protocol_init'
  | 'jump_label'
  | 'register_dataflow'
  | 'variable_dataflow'
  | 'timer_interrupt'
  | 'pair_structure';

export interface BlockDependency {
  id: string;
  type: DependencyType;
  severity: DependencySeverity;
  sourceBlockId: string;
  dependentBlockId: string;
  dependentBlockIndex: number;
  dependentBlockName: string;
  dependentBlockScope: BlockScope;
  dependentBlockType: string;
  title: string;
  description: string;
  consequence: string;
  suggestedAction?: string;
}

export interface DependencyAnalysisResult {
  targetBlock: ProgramBlock;
  targetIndex: number;
  targetDefName: string;
  hasDependencies: boolean;
  criticalCount: number;
  warningCount: number;
  infoCount: number;
  dependencies: BlockDependency[];
  dependentBlockIds: string[];
  summaryText: string;
}

/**
 * Performs deep semantic, hardware, protocol, and control-flow dependency analysis
 * before deleting a ProgramBlock.
 */
export function analyzeBlockDependencies(
  targetBlock: ProgramBlock,
  allBlocks: ProgramBlock[],
  _variables: VariableDefinition[] = []
): DependencyAnalysisResult {
  const dependencies: BlockDependency[] = [];
  const targetIndex = allBlocks.findIndex((b) => b.id === targetBlock.id);
  const targetDef = BLOCK_DEFINITIONS[targetBlock.type];
  const targetDefName = targetDef?.name || targetBlock.type;

  const targetParams = targetBlock.params || {};

  // 1. PIN CONFIGURATION DEPENDENCY (io_pin_mode -> io_pin_write, io_pin_read, io_pin_toggle, analog_pwm_write, etc.)
  if (targetBlock.type === 'io_pin_mode' && targetParams.pin) {
    const targetPin = String(targetParams.pin);
    const targetMode = String(targetParams.mode || 'OUTPUT');

    // Check if any other block still configures this pin (in case there's another pinMode elsewhere)
    const otherPinModes = allBlocks.filter(
      (b) => b.id !== targetBlock.id && b.type === 'io_pin_mode' && String(b.params?.pin) === targetPin
    );

    if (otherPinModes.length === 0) {
      allBlocks.forEach((b, idx) => {
        if (b.id === targetBlock.id) return;
        const bPin = b.params?.pin ? String(b.params.pin) : undefined;
        if (!bPin || bPin !== targetPin) return;

        const bDef = BLOCK_DEFINITIONS[b.type];
        const bName = bDef?.name || b.type;

        if (
          b.type === 'io_pin_write' ||
          b.type === 'io_pin_toggle' ||
          b.type === 'analog_pwm_write' ||
          b.type === 'io_pin_read' ||
          b.type === 'sensor_ultrasonic_hcsr04' ||
          b.type === 'sensor_dht11'
        ) {
          const isWrite = b.type !== 'io_pin_read';
          const isConflict = (targetMode === 'OUTPUT' && isWrite) || (targetMode.startsWith('INPUT') && !isWrite);

          dependencies.push({
            id: `dep_pin_${b.id}`,
            type: 'pin_config',
            severity: isConflict ? 'critical' : 'warning',
            sourceBlockId: targetBlock.id,
            dependentBlockId: b.id,
            dependentBlockIndex: idx + 1,
            dependentBlockName: bName,
            dependentBlockScope: b.scope,
            dependentBlockType: b.type,
            title: `Hardveres Láb Konfiguráció Hiányzik (Pin ${targetPin})`,
            description: `A(z) #${idx + 1} '${bName}' blokk közvetlenül a D${targetPin} lábat használja (${b.scope} szakasz).`,
            consequence: `A pinMode(Pin ${targetPin}, ${targetMode}) törlésével a mikrokontroller DDR regisztere nem lesz beállítva, így a láb lebegő állapotban maradhat.`,
            suggestedAction: 'Ha törlöd ezt a blokkot, pótold a láb inicializálását, vagy távolítsd el a hivatkozó műveleteket is.',
          });
        }
      });
    }
  }

  // 2. PROTOCOL INITIALIZATION DEPENDENCY (UART, I2C, SPI, ADC)
  if (targetBlock.type === 'protocol_uart_init') {
    const otherUartInits = allBlocks.filter((b) => b.id !== targetBlock.id && b.type === 'protocol_uart_init');
    if (otherUartInits.length === 0) {
      allBlocks.forEach((b, idx) => {
        if (b.id === targetBlock.id) return;
        if (
          b.type === 'protocol_uart_print' ||
          b.type === 'protocol_uart_write' ||
          b.type === 'protocol_uart_read'
        ) {
          const bDef = BLOCK_DEFINITIONS[b.type];
          dependencies.push({
            id: `dep_uart_${b.id}`,
            type: 'protocol_init',
            severity: 'critical',
            sourceBlockId: targetBlock.id,
            dependentBlockId: b.id,
            dependentBlockIndex: idx + 1,
            dependentBlockName: bDef?.name || b.type,
            dependentBlockScope: b.scope,
            dependentBlockType: b.type,
            title: 'Soros UART Interfész Inicializálás Hiányzik',
            description: `A(z) #${idx + 1} '${bDef?.name || b.type}' blokk soros adatátvitelt végez a(z) ${b.scope} szakaszban.`,
            consequence: 'A Serial.begin() / UART hardvermodul kikapcsolva marad, az adatküldés nem működik és a szimuláció elakad.',
            suggestedAction: 'Tartsd meg az UART inicializálást a setup() szakaszban, ha soros adatokat küldesz.',
          });
        }
      });
    }
  }

  if (targetBlock.type === 'protocol_i2c_init') {
    const otherI2cInits = allBlocks.filter((b) => b.id !== targetBlock.id && b.type === 'protocol_i2c_init');
    if (otherI2cInits.length === 0) {
      allBlocks.forEach((b, idx) => {
        if (b.id === targetBlock.id) return;
        if (
          b.type.startsWith('protocol_i2c_') ||
          b.type === 'display_i2c_lcd' ||
          b.type === 'sensor_i2c_read'
        ) {
          const bDef = BLOCK_DEFINITIONS[b.type];
          dependencies.push({
            id: `dep_i2c_${b.id}`,
            type: 'protocol_init',
            severity: 'critical',
            sourceBlockId: targetBlock.id,
            dependentBlockId: b.id,
            dependentBlockIndex: idx + 1,
            dependentBlockName: bDef?.name || b.type,
            dependentBlockScope: b.scope,
            dependentBlockType: b.type,
            title: 'I2C / TWI Busz Inicializálás Hiányzik',
            description: `A(z) #${idx + 1} '${bDef?.name || b.type}' modul I2C busz tranzakciókat indít.`,
            consequence: 'A Wire.begin() és a TWI vezérlőregiszterek (TWCR/TWBR) nem indulnak el, az I2C szenzorok nem válaszolnak.',
            suggestedAction: 'Ne töröld az I2C inicializálást, amíg I2C perifériákat vagy kijelzőt használsz.',
          });
        }
      });
    }
  }

  if (targetBlock.type === 'protocol_spi_init') {
    const otherSpiInits = allBlocks.filter((b) => b.id !== targetBlock.id && b.type === 'protocol_spi_init');
    if (otherSpiInits.length === 0) {
      allBlocks.forEach((b, idx) => {
        if (b.id === targetBlock.id) return;
        if (b.type.startsWith('protocol_spi_') || b.type === 'display_spi_max7219') {
          const bDef = BLOCK_DEFINITIONS[b.type];
          dependencies.push({
            id: `dep_spi_${b.id}`,
            type: 'protocol_init',
            severity: 'critical',
            sourceBlockId: targetBlock.id,
            dependentBlockId: b.id,
            dependentBlockIndex: idx + 1,
            dependentBlockName: bDef?.name || b.type,
            dependentBlockScope: b.scope,
            dependentBlockType: b.type,
            title: 'SPI Hardveres Busz Inicializálás Hiányzik',
            description: `A(z) #${idx + 1} '${bDef?.name || b.type}' modul SPI adatátvitelt használ (MOSI, MISO, SCK).`,
            consequence: 'Az SPCR regiszter nem aktiválja a hardveres SPI perifériát.',
            suggestedAction: 'Tartsd meg az SPI Init blokkot.',
          });
        }
      });
    }
  }

  // 3. JUMP / LABEL CONTROL FLOW DEPENDENCY
  if (targetBlock.type === 'flow_label' && targetParams.labelName) {
    const labelName = String(targetParams.labelName).trim();
    // Look for any jumps pointing to this labelName
    allBlocks.forEach((b, idx) => {
      if (b.id === targetBlock.id) return;
      const jumpTarget = b.params?.targetLabel || b.params?.labelName || b.params?.label;
      if (
        (b.type === 'flow_rjmp' ||
          b.type === 'flow_breq' ||
          b.type === 'flow_brne' ||
          b.type === 'flow_rcall' ||
          b.type === 'flow_goto') &&
        String(jumpTarget).trim() === labelName
      ) {
        const bDef = BLOCK_DEFINITIONS[b.type];
        dependencies.push({
          id: `dep_label_${b.id}`,
          type: 'jump_label',
          severity: 'critical',
          sourceBlockId: targetBlock.id,
          dependentBlockId: b.id,
          dependentBlockIndex: idx + 1,
          dependentBlockName: bDef?.name || b.type,
          dependentBlockScope: b.scope,
          dependentBlockType: b.type,
          title: `Ugrási Célcímke Megszűnik ('${labelName}')`,
          description: `A(z) #${idx + 1} '${bDef?.name || b.type}' ugróutasítás a(z) '${labelName}' címkére ugrik (${b.scope} szakasz).`,
          consequence: 'Az AVR Assembly és C fordítás szintaktikai hibát ad (ismeretlen ugrási címke / undefined label).',
          suggestedAction: 'Irányítsd át a hivatkozó ugróutasításokat egy másik címkére, vagy töröld az ugróblokkokat is.',
        });
      }
    });
  }

  // 4. TIMER & INTERRUPT SETUP DEPENDENCY
  if (targetBlock.type === 'timer_config_ctc' || targetBlock.type === 'timer_config_fast_pwm') {
    allBlocks.forEach((b, idx) => {
      if (b.id === targetBlock.id) return;
      if (b.type === 'analog_pwm_write' || (b.scope === 'isr' && b.type.includes('timer'))) {
        const bDef = BLOCK_DEFINITIONS[b.type];
        dependencies.push({
          id: `dep_timer_${b.id}`,
          type: 'timer_interrupt',
          severity: 'warning',
          sourceBlockId: targetBlock.id,
          dependentBlockId: b.id,
          dependentBlockIndex: idx + 1,
          dependentBlockName: bDef?.name || b.type,
          dependentBlockScope: b.scope,
          dependentBlockType: b.type,
          title: 'Hardveres Időzítő (Timer) Konfiguráció Megszűnik',
          description: `A(z) #${idx + 1} '${bDef?.name || b.type}' modul a Timer időzítésétől vagy PWM kimenetétől függ.`,
          consequence: 'A hardveres frekvenciagenerálás, PWM kitöltés vagy időzített megszakítás nem indul el.',
          suggestedAction: 'Ellenőrizd a PWM és Timer használatot a programban.',
        });
      }
    });
  }

  if (targetBlock.type === 'interrupt_attach' || targetBlock.type === 'interrupt_sei') {
    const isrBlocks = allBlocks.filter((b) => b.scope === 'isr');
    if (isrBlocks.length > 0) {
      dependencies.push({
        id: `dep_isr_all`,
        type: 'timer_interrupt',
        severity: 'warning',
        sourceBlockId: targetBlock.id,
        dependentBlockId: isrBlocks[0].id,
        dependentBlockIndex: allBlocks.findIndex((b) => b.id === isrBlocks[0].id) + 1,
        dependentBlockName: `Megszakításkezelő (ISR) Szakasz (${isrBlocks.length} blokk)`,
        dependentBlockScope: 'isr',
        dependentBlockType: isrBlocks[0].type,
        title: 'Megszakítás (Interrupt) Engedélyezés Eltávolítása',
        description: `A programban ${isrBlocks.length} db aktív ISR kezelőblokk található a megszakítási szakaszban.`,
        consequence: 'A külső hardveres élváltások (INT0 / INT1) vagy időzítők nem fogják meghívni az ISR rutint.',
        suggestedAction: 'Ha nincs szükség a megszakításkezelőre, tisztítsd ki az ISR szakaszt is.',
      });
    }
  }

  // 5. REGISTER DATAFLOW (LDI r16, X -> subsequent block reading r16 without re-loading)
  if (targetBlock.type === 'reg_ldi' && targetParams.reg) {
    const targetReg = String(targetParams.reg).toLowerCase();
    // Look at next sequential blocks in the same scope until targetReg is overwritten
    let foundReader = false;
    for (let i = targetIndex + 1; i < allBlocks.length; i++) {
      const nextB = allBlocks[i];
      if (nextB.scope !== targetBlock.scope) continue;

      // If next block overwrites this register, stop checking dataflow chain
      if (nextB.type === 'reg_ldi' && String(nextB.params?.reg).toLowerCase() === targetReg) {
        break;
      }

      // If next block uses targetReg as source/destination
      const bDef = BLOCK_DEFINITIONS[nextB.type];
      const usesReg =
        String(nextB.params?.reg).toLowerCase() === targetReg ||
        String(nextB.params?.regSrc).toLowerCase() === targetReg ||
        String(nextB.params?.regDest).toLowerCase() === targetReg;

      if (usesReg) {
        dependencies.push({
          id: `dep_reg_${nextB.id}`,
          type: 'register_dataflow',
          severity: 'warning',
          sourceBlockId: targetBlock.id,
          dependentBlockId: nextB.id,
          dependentBlockIndex: i + 1,
          dependentBlockName: bDef?.name || nextB.type,
          dependentBlockScope: nextB.scope,
          dependentBlockType: nextB.type,
          title: `Adatáramlási Regiszterfüggőség (${targetReg.toUpperCase()})`,
          description: `A(z) #${i + 1} '${bDef?.name || nextB.type}' közvetlenül a(z) ${targetReg.toUpperCase()} regiszter betöltött értékét (${targetParams.value ?? '?'}) várja.`,
          consequence: `A regiszter betöltése nélkül a(z) ${targetReg.toUpperCase()} értéke meghatározatlan (0x00 vagy előző maradék) lesz.`,
          suggestedAction: 'Töltsd be az értéket a hivatkozó művelet előtt, vagy távolítsd el a számítást.',
        });
        foundReader = true;
        break; // Show first direct consumer
      }
    }
  }

  // 6. I2C TRANSACTION PAIRING (Start without Stop or Stop without Start)
  if (targetBlock.type === 'protocol_i2c_start') {
    const hasI2cWrite = allBlocks.some((b) => b.scope === targetBlock.scope && b.type === 'protocol_i2c_write');
    if (hasI2cWrite) {
      dependencies.push({
        id: `dep_i2c_start_pair`,
        type: 'pair_structure',
        severity: 'critical',
        sourceBlockId: targetBlock.id,
        dependentBlockId: targetBlock.id,
        dependentBlockIndex: targetIndex + 1,
        dependentBlockName: 'I2C Tranzakció Írás/Olvasás',
        dependentBlockScope: targetBlock.scope,
        dependentBlockType: 'protocol_i2c_write',
        title: 'I2C START Állapot és Címzés Eltávolítása',
        description: 'A szakaszban I2C adatátviteli blokkok találhatók.',
        consequence: 'START állapot nélkül az I2C slave eszközök nem érzékelik a buszfoglalást és nem veszik át a bájtokat.',
        suggestedAction: 'Tartsd meg a START keretet, vagy töröld a teljes I2C tranzakciót.',
      });
    }
  }

  const criticalCount = dependencies.filter((d) => d.severity === 'critical').length;
  const warningCount = dependencies.filter((d) => d.severity === 'warning').length;
  const infoCount = dependencies.filter((d) => d.severity === 'info').length;

  const dependentBlockIds = Array.from(
    new Set(dependencies.map((d) => d.dependentBlockId).filter((id) => id !== targetBlock.id))
  );

  let summaryText = '';
  if (dependencies.length === 0) {
    summaryText = 'Nincsenek közvetlen hardveres vagy vezérlési függőségek. A blokk biztonságosan eltávolítható.';
  } else if (criticalCount > 0) {
    summaryText = `FIGYELEM: A blokk eltávolítása ${criticalCount} db kritikus és ${warningCount} db figyelmeztető függőséget érint!`;
  } else {
    summaryText = `A blokk eltávolítása ${warningCount} db másodlagos logikai függőséget érint.`;
  }

  return {
    targetBlock,
    targetIndex: targetIndex + 1,
    targetDefName,
    hasDependencies: dependencies.length > 0,
    criticalCount,
    warningCount,
    infoCount,
    dependencies,
    dependentBlockIds,
    summaryText,
  };
}
