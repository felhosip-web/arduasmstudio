export type McuTarget = 'avr' | 'esp32';

export interface McuTargetInfo {
  id: McuTarget;
  name: string;
  chipName: string;
  arch: string;
  clockHz: number;
  clockMhz: number;
  cycleNs: number;
  flashBytes: number;
  sramBytes: number;
  eepromBytes: number;
  cores: number;
  voltageV: number;
  defaultBaud: number;
  description: string;
  badgeColor: string;
}

export const MCU_TARGETS: Record<McuTarget, McuTargetInfo> = {
  avr: {
    id: 'avr',
    name: 'Arduino Uno R3',
    chipName: 'ATmega328P',
    arch: '8-bit AVR RISC',
    clockHz: 16000000,
    clockMhz: 16,
    cycleNs: 62.5,
    flashBytes: 32768,
    sramBytes: 2048,
    eepromBytes: 1024,
    cores: 1,
    voltageV: 5.0,
    defaultBaud: 9600,
    description: 'Klasszikus 8-bites Harvard RISC architektúra 16 MHz-es kvarccal és közvetlen portregiszterekkel.',
    badgeColor: '#4ade80',
  },
  esp32: {
    id: 'esp32',
    name: 'ESP32 DevKit V1',
    chipName: 'ESP32-WROOM-32',
    arch: '32-bit Xtensa LX6 Dual-Core',
    clockHz: 240000000,
    clockMhz: 240,
    cycleNs: 4.167,
    flashBytes: 4194304,
    sramBytes: 532480,
    eepromBytes: 4096,
    cores: 2,
    voltageV: 3.3,
    defaultBaud: 115200,
    description: 'Nagysebességű 32-bites kétmagos Xtensa LX6 architektúra 240 MHz-en, FreeRTOS támogatással, 12-bites ADC-vel, hardveres LEDC PWM-mel és beépített WiFi/Bluetooth-szal.',
    badgeColor: '#38bdf8',
  },
};

export type BlockCategory =
  | 'io'
  | 'timing'
  | 'flow'
  | 'interrupt'
  | 'protocol'
  | 'analog'
  | 'modules'
  | 'math'
  | 'memory'
  | 'master_slave'
  | 'datastruct'
  | 'esp32';

export type ArduinoPin =
  | '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7'
  | '8' | '9' | '10' | '11' | '12' | '13'
  | 'A0' | 'A1' | 'A2' | 'A3' | 'A4' | 'A5';

export type PortName = 'PORTB' | 'PORTC' | 'PORTD';
export type DdrName = 'DDRB' | 'DDRC' | 'DDRD';
export type PinRegName = 'PINB' | 'PINC' | 'PIND';

export type AvrRegister =
  | 'r16' | 'r17' | 'r18' | 'r19' | 'r20' | 'r21' | 'r22' | 'r23'
  | 'r24' | 'r25' | 'r26' | 'r27' | 'r28' | 'r29' | 'r30' | 'r31';

export type BlockScope = 'setup' | 'loop' | 'isr';

export interface BlockParamDef {
  key: string;
  label: string;
  type: 'select' | 'number' | 'text' | 'pin' | 'register' | 'boolean' | 'color';
  options?: { label: string; value: string | number }[];
  defaultValue: any;
  unit?: string;
  description?: string;
}

export interface BlockDefinition {
  type: string;
  category: BlockCategory;
  name: string;
  shortDesc: string;
  icon: string;
  color: string;
  accentColor: string;
  params: BlockParamDef[];
  defaultParams: Record<string, any>;
  calculateCycles: (params: Record<string, any>) => number;
  generateAsm: (params: Record<string, any>, labelSuffix?: string) => string[];
  generateC: (params: Record<string, any>) => string[];
  generateInlineAsm: (params: Record<string, any>, labelSuffix?: string) => string[];
  explanationHu: (params: Record<string, any>) => string;
}

export interface ProgramBlock {
  id: string;
  type: string;
  params: Record<string, any>;
  scope: BlockScope;
  enabled?: boolean;
  comment?: string;
}

export interface PresetProgram {
  id: string;
  title: string;
  description: string;
  difficulty: 'Kezdő' | 'Középhaladó' | 'Haladó' | 'Profi';
  timingPrecision: string;
  blocks: ProgramBlock[];
}

export interface PinState {
  mode: 'INPUT' | 'OUTPUT' | 'INPUT_PULLUP';
  value: 0 | 1;
  pwmValue?: number; // 0-255
  analogVoltage?: number; // 0.00 - 5.00 V
  label?: string;
}

export interface RegisterBank {
  [key: string]: number; // r0 - r31 (0-255)
}

export interface LogicAnalyzerSample {
  timeNs: number;
  cycle?: number;
  pinStates: Record<string, 0 | 1>;
  pc?: number;
  sp?: number;
  sreg?: number; // raw 8-bit SREG value
  portB?: number;
  portC?: number;
  portD?: number;
  activeBlockId?: string;
}

export interface I2CTransactionLog {
  id: string;
  type: 'START' | 'STOP' | 'WRITE' | 'READ' | 'INIT' | 'DATA_WRITE' | 'DATA_READ';
  addressHex?: string;
  deviceAddressHex?: string;
  dataHex?: string;
  ack?: boolean;
  details: string;
  timestampNs: number;
}

export interface UARTTransactionLog {
  id: string;
  direction: 'TX' | 'RX';
  text: string;
  hex: string;
  timestampNs: number;
  isNewline?: boolean;
}

export interface SPITransactionLog {
  id: string;
  txHex?: string;
  rxHex?: string;
  txByteHex?: string;
  rxByteHex?: string;
  mosiHex?: string;
  misoHex?: string;
  command?: string;
  ssPin?: string;
  speed?: string;
  mode?: string;
  details?: string;
  timestampNs: number;
}

export type HardwareModuleType =
  | 'lcd_1602'
  | 'rtc_ds1307'
  | 'shift_74hc595'
  | 'sd_card'
  | 'nrf24l01'
  | 'discrete_leds'
  | 'rotary_encoder'
  | 'ds18b20_temp'
  | 'bluetooth_spp'
  | 'eeprom_24cxxx'
  | 'eeprom_25lcxxx'
  | 'flash_w25qxx'
  | 'expander_mcp23017'
  | 'expander_pcf8574'
  | 'shift_74hc165';

export interface OneWireTransactionLog {
  id: string;
  type: 'RESET' | 'PRESENCE' | 'WRITE_BYTE' | 'READ_BYTE' | 'SEARCH_ROM' | 'MATCH_ROM' | 'SKIP_ROM' | 'CONVERT_T' | 'READ_SCRATCHPAD';
  pin: string;
  dataHex?: string;
  presence?: boolean;
  details: string;
  timestampNs: number;
}

export interface HardwareModule {
  id: string;
  type: HardwareModuleType;
  name: string;
  enabled: boolean;
  pins: Record<string, ArduinoPin>;
  state: Record<string, any>;
}

export interface I2CSlaveNode {
  addressHex: string; // e.g. "0x08", "0x68"
  name: string;
  registers: Record<string, number>; // e.g. { '0x00': 42, '0x01': 100 }
  lastReceived?: number[];
  lastTransmitted?: number[];
  ack: boolean;
}

export interface SPISlaveNode {
  id: string;
  name: string;
  ssPin: ArduinoPin;
  responseByte: number;
  lastReceived?: number;
}

export interface NRF24SlaveNode {
  id: string;
  pipeIndex: number; // 0 - 5
  pipeAddress: string; // e.g. "0xE8E8F0F001"
  name: string;
  lastReceivedPayload?: string;
  ackPayload?: string;
  rssi: number;
  active: boolean;
}

export interface MasterSlaveState {
  role: 'MASTER' | 'SLAVE';
  activeProtocol?: 'I2C' | 'SPI' | 'NRF24';
  i2cRole: 'MASTER' | 'SLAVE';
  i2cOwnAddress: number; // e.g. 0x08
  i2cSlaves: I2CSlaveNode[];
  spiRole: 'MASTER' | 'SLAVE';
  spiSlaves: SPISlaveNode[];
  nrfRole?: 'MASTER' | 'SLAVE';
  nrfChannel?: number;
  nrfOwnPipe?: string;
  nrfSlaves?: NRF24SlaveNode[];
  lastMasterCommand?: string;
  lastSlaveResponse?: string;
  busCollision: boolean;
  activeTargetSlave?: string;
  totalPacketsExchanged: number;
}

// ==========================================
// VARIABLE DEFINITIONS & MEMORY ALLOCATION
// ==========================================

export type VariableDataType =
  | 'uint8_t'
  | 'int8_t'
  | 'uint16_t'
  | 'int16_t'
  | 'uint32_t'
  | 'int32_t'
  | 'bool'
  | 'float'
  | 'char'
  | 'string'
  | 'array';

export type VariableMemoryLocation = 'sram' | 'progmem' | 'eeprom' | 'register';

export type VariableScope = 'global' | 'setup' | 'loop' | 'isr_volatile';

export interface VariableDefinition {
  id: string;
  name: string;
  type: VariableDataType;
  memoryLocation: VariableMemoryLocation;
  scope: VariableScope;
  initialValue: string;
  arraySize?: number;
  registerBinding?: AvrRegister;
  isVolatile?: boolean;
  isConst?: boolean;
  description?: string;
  sramAddress?: number; // e.g. 0x0100 in ATmega328P SRAM
  sizeBytes: number;
}

export interface VariableValidationError {
  field: 'name' | 'type' | 'initialValue' | 'arraySize' | 'registerBinding' | 'memoryLocation' | 'general';
  severity: 'error' | 'warning';
  message: string;
  rule: string;
}

export interface VariableValidationResult {
  isValid: boolean;
  errors: VariableValidationError[];
  warnings: VariableValidationError[];
}

export interface MemoryArrayInstance {
  name: string;
  memoryType: 'flash' | 'ram';
  dataType: 'uint8' | 'int8' | 'uint16' | 'string';
  baseAddress: number; // e.g. 0x0100 SRAM or 0x0040 FLASH
  size: number;
  data: number[];
  lastAccessedIndex?: number;
  lastAccessedValue?: number;
}

export interface MemoryStructField {
  name: string;
  type: string;
  offset: number;
  size: number;
  value: number;
}

export interface MemoryStructInstance {
  name: string;
  structType: string;
  baseAddress: number;
  totalSize: number;
  fields: MemoryStructField[];
}

export interface MemoryClassInstance {
  id: string;
  className: string;
  instanceName: string;
  thisPointer: number; // e.g. 0x0140 (r25:r24)
  fields: Record<string, any>;
  methods: string[];
  lastMethodCalled?: string;
}

export interface DataStructState {
  arrays: Record<string, MemoryArrayInstance>;
  structs: Record<string, MemoryStructInstance>;
  objects: Record<string, MemoryClassInstance>;
  lastOperation?: string;
}

export interface SimulationState {
  engineMode?: 'avr8js' | 'visual' | 'custom_event_loop';
  isRunning: boolean;
  isPaused: boolean;
  currentBlockIndex: number;
  currentScope: BlockScope;
  stepCount: number;
  totalCycles: number;
  executionSpeedMs: number; // delay between visual steps
  pinStates: Record<ArduinoPin, PinState>;
  analogInputs: Record<string, number>; // A0 - A5 values 0-1023 (0-5V)
  registers: RegisterBank;
  modules: HardwareModule[];
  avrCpu?: {
    pc: number;
    cycles: number;
    sp: number;
    isHalted: boolean;
    hexLoadedName?: string;
    lastOpcode?: string;
  };
  sreg: {
    C: boolean; // Carry
    Z: boolean; // Zero
    N: boolean; // Negative
    V: boolean; // Overflow
    S: boolean; // Sign
    H: boolean; // Half Carry
    T: boolean; // Bit Copy
    I: boolean; // Global Interrupt Enable
  };
  uartState?: {
    initialized: boolean;
    baudRate: number;
    doubleSpeed: boolean;
    txLed: boolean;
    rxLed: boolean;
    terminalText: string;
    rxBuffer: string;
    log: UARTTransactionLog[];
  };
  i2cState?: {
    initialized: boolean;
    speedKbps: number;
    busStatus: 'IDLE' | 'START' | 'DATA_TX' | 'DATA_RX' | 'STOP' | 'TRANSMITTING' | 'RECEIVING';
    lastAddress?: number;
    lastData?: number;
    log: I2CTransactionLog[];
  };
  spiState?: {
    initialized: boolean;
    clockDivider: string;
    lastTx?: number;
    lastRx?: number;
    lastByteReceived?: number;
    ssActive: boolean;
    log: SPITransactionLog[];
  };
  adcState?: {
    initialized: boolean;
    activeChannel: string; // 'A0' - 'A5'
    prescaler: number;
    lastResult: number; // 0 - 1023
  };
  oneWireState?: {
    initialized: boolean;
    pin: ArduinoPin;
    busStatus: 'IDLE' | 'RESET' | 'PRESENCE' | 'WRITE' | 'READ';
    presenceDetected: boolean;
    lastByte?: number;
    lastTemperatureC?: number;
    romCode?: string;
    log: OneWireTransactionLog[];
  };
  neoPixelPixels?: string[]; // hex colors for WS2812 simulator
  logicWaveform: LogicAnalyzerSample[];
  eeprom?: Uint8Array; // 1024 bytes (0x000 to 0x3FF)
  flash?: Uint8Array; // 32768 bytes (0x0000 to 0x7FFF)
  lastEepromAccess?: {
    address: number;
    type: 'READ' | 'WRITE' | 'UPDATE';
    value: number;
    timestampNs: number;
  };
  masterSlaveState?: MasterSlaveState;
  dataStructState?: DataStructState;
  interruptState?: AvrInterruptState;
  esp32InterruptState?: Esp32InterruptState;
  esp32State?: Esp32SimulationState;
  watchpointState?: AvrWatchpointState;
  stackMemorySnapshot?: AvrStackMemorySnapshot;
}

// ==========================================
// AVR INTERRUPT ARCHITECTURE & DESIGNER TYPES
// ==========================================

export type AvrInterruptVectorId =
  | 'RESET'
  | 'INT0'
  | 'INT1'
  | 'PCINT0'
  | 'PCINT1'
  | 'PCINT2'
  | 'WDT'
  | 'TIMER2_COMPA'
  | 'TIMER2_COMPB'
  | 'TIMER2_OVF'
  | 'TIMER1_CAPT'
  | 'TIMER1_COMPA'
  | 'TIMER1_COMPB'
  | 'TIMER1_OVF'
  | 'TIMER0_COMPA'
  | 'TIMER0_COMPB'
  | 'TIMER0_OVF'
  | 'SPI_STC'
  | 'USART_RX'
  | 'USART_UDRE'
  | 'USART_TX'
  | 'ADC'
  | 'EE_READY'
  | 'ANALOG_COMP'
  | 'TWI'
  | 'SPM_READY';

export type AvrExtIntTriggerMode = 'LOW_LEVEL' | 'ANY_CHANGE' | 'FALLING_EDGE' | 'RISING_EDGE';

export interface AvrInterruptVectorInfo {
  id: AvrInterruptVectorId;
  vectorNum: number; // 1 - 26
  vectorName: string; // e.g. "INT0_vect"
  programAddressHex: string; // e.g. "0x0002"
  source: string; // e.g. "External Pin D2 (PD2)"
  description: string;
  category: 'external' | 'timer' | 'comm' | 'analog' | 'system';
  associatedPins?: ArduinoPin[];
  registers: { name: string; bit: string; addressHex: string; description: string }[];
}

export interface AvrInterruptConfig {
  id: AvrInterruptVectorId;
  enabled: boolean;
  triggerMode?: AvrExtIntTriggerMode;
  pin?: ArduinoPin;
  pcintMask?: number; // 8-bit mask
  frequencyHz?: number;
  prescaler?: string;
  ocrValue?: number;
  customIsrAction?: 'toggle_led' | 'increment_var' | 'send_uart' | 'custom_asm' | 'custom_code';
  customTargetVar?: string;
  customTargetPin?: ArduinoPin;
  customCodeSnippet?: string;
  description?: string;
}

export interface AvrInterruptEventLog {
  id: string;
  vector: AvrInterruptVectorId;
  vectorName: string;
  source: string;
  timestampNs: number;
  cyclesTaken: number;
  details: string;
}

export interface AvrInterruptState {
  globalInterruptsEnabled: boolean; // SREG.I
  activeInterruptVector: AvrInterruptVectorId | null;
  pendingInterrupts: AvrInterruptVectorId[];
  vectorConfigs: Record<string, AvrInterruptConfig>;
  configs?: Record<string, AvrInterruptConfig>; // Alias for vectorConfigs
  eventLog: AvrInterruptEventLog[];
  totalFiredCount: number;
  firingCount?: Record<string, number>;
  lastFiredTimestampNs?: number;
  isrExecutionCycles?: number;
  isExecutingIsr: boolean;
  savedSregBeforeIsr?: boolean;
}

// ==========================================
// ESP32 INTERRUPT ARCHITECTURE & MATRIX TYPES
// ==========================================

export type Esp32InterruptSourceId =
  | 'GPIO_INTR'
  | 'TG0_T0_LEVEL'
  | 'TG0_T1_LEVEL'
  | 'TG1_T0_LEVEL'
  | 'TG1_T1_LEVEL'
  | 'TG0_WDT_LEVEL'
  | 'TG1_WDT_LEVEL'
  | 'UART0_INTR'
  | 'UART1_INTR'
  | 'UART2_INTR'
  | 'I2C_EXT0_INTR'
  | 'I2C_EXT1_INTR'
  | 'SPI1_INTR'
  | 'SPI2_INTR'
  | 'SPI3_INTR'
  | 'TWAI_INTR'
  | 'TOUCH_PAD_INTR'
  | 'RTC_CORE_INTR'
  | 'WIFI_MAC_INTR'
  | 'BT_MAC_INTR'
  | 'I2S0_INTR'
  | 'I2S1_INTR'
  | 'MCPWM0_INTR'
  | 'MCPWM1_INTR'
  | 'PCNT_INTR'
  | 'LEDC_INTR'
  | 'ADC1_INTR'
  | 'ADC2_INTR'
  | 'SOFTWARE_INTR0'
  | 'SOFTWARE_INTR1'
  | 'DEDICATED_GPIO_INTR'
  | 'FRC1_INTR';

export type Esp32InterruptCategory =
  | 'gpio'
  | 'timer'
  | 'comm'
  | 'analog_sensor'
  | 'system_freertos'
  | 'wireless';

export type Esp32InterruptPriority = 1 | 2 | 3 | 4 | 5 | 6 | 7;
export type Esp32GpioTriggerMode = 'RISING' | 'FALLING' | 'CHANGE' | 'LOW_LEVEL' | 'HIGH_LEVEL';

export interface Esp32InterruptSourceInfo {
  id: Esp32InterruptSourceId;
  name: string;
  sourceNum: number; // 0..31
  category: Esp32InterruptCategory;
  defaultPriority: Esp32InterruptPriority;
  triggerType: 'EDGE' | 'LEVEL';
  coreAffinity: 0 | 1 | 'both';
  description: string;
  hardwareSource: string;
  registers: { name: string; bit: string; addressHex: string; description: string }[];
}

export interface Esp32InterruptConfig {
  id: Esp32InterruptSourceId;
  enabled: boolean;
  coreAffinity: 0 | 1 | 'both';
  priorityLevel: Esp32InterruptPriority;
  triggerType: 'EDGE' | 'LEVEL';
  useIramAttr: boolean;
  // GPIO Specific
  gpioPin?: number;
  gpioTriggerMode?: Esp32GpioTriggerMode;
  pullMode?: 'NONE' | 'PULLUP' | 'PULLDOWN';
  // Timer Group Specific
  timerGroup?: 0 | 1;
  timerIndex?: 0 | 1;
  alarmIntervalUs?: number;
  autoReload?: boolean;
  divider?: number;
  // Touch Pad Specific
  touchPadIndex?: number;
  touchThreshold?: number;
  // ISR Action
  customIsrAction: 'toggle_pin' | 'send_queue' | 'notify_task' | 'increment_counter' | 'custom_code';
  targetPin?: number;
  targetTaskName?: string;
  targetQueueName?: string;
  customCodeSnippet?: string;
  description?: string;
}

export interface Esp32InterruptEventLog {
  id: string;
  sourceId: Esp32InterruptSourceId;
  name: string;
  coreId: 0 | 1;
  timestampNs: number;
  latencyNs: number;
  priority: number;
  details: string;
}

export interface Esp32InterruptState {
  globalInterruptsEnabled: boolean; // Xtensa PS.INTLEVEL
  core0IntMask: number; // 32-bit mask for PRO_CPU
  core1IntMask: number; // 32-bit mask for APP_CPU
  configs: Record<string, Esp32InterruptConfig>;
  pendingInterrupts: { sourceId: Esp32InterruptSourceId; coreId: 0 | 1 }[];
  eventLog: Esp32InterruptEventLog[];
  totalFiredCount: number;
  core0FiredCount: number;
  core1FiredCount: number;
  firingCount: Record<string, number>;
  lastFiredTimestampNs?: number;
  isExecutingIsr?: boolean;
}

export interface Esp32FreeRtosTask {
  id: string;
  name: string;
  coreId: 0 | 1 | -1; // 0: PRO CPU, 1: APP CPU, -1: tskNO_AFFINITY
  priority: number;
  stackSize: number;
  state: 'RUNNING' | 'READY' | 'BLOCKED' | 'SUSPENDED';
  lastRunTimeNs: number;
  cpuPercentage: number;
  functionName: string;
}

export interface Esp32FreeRtosQueue {
  id: string;
  name: string;
  length: number;
  itemSize: number;
  messages: any[];
  peakUsage: number;
}

export interface Esp32CoreState {
  pc: number;
  cycles: number;
  activeTask: string;
  cpuLoadPercent: number;
  registers: Record<string, number>; // a0 - a15, sar, ps, etc.
}

export interface Esp32WifiState {
  mode: 'OFF' | 'STA' | 'AP' | 'AP_STA';
  status: 'DISCONNECTED' | 'SCANNING' | 'CONNECTING' | 'CONNECTED' | 'AP_ACTIVE';
  ssid: string;
  password?: string;
  useStaticIp?: boolean;
  ipAddress: string;
  gateway: string;
  subnet: string;
  dns?: string;
  dns2?: string;
  hostname?: string;
  autoReconnect?: boolean;
  rssi: number; // dBm (-30 .. -90)
  macAddress: string;
  // SoftAP Settings
  apSsid?: string;
  apPassword?: string;
  apIpAddress?: string;
  apSubnet?: string;
  apChannel?: number;
  apMaxConnections?: number;
  apClients: number;
  webServer: {
    running: boolean;
    port: number;
    routes: { path: string; method: string; handler: string; responseBody?: string }[];
    requestLog: {
      id: string;
      timestamp: string;
      method: string;
      path: string;
      clientIp: string;
      responseCode: number;
      body?: string;
      response?: string;
    }[];
  };
}

export type Esp32BleMode = 'GATT_SERVER' | 'ADVERTISER' | 'IBEACON' | 'CUSTOM_UART' | 'OFF';

export type Esp32BleAdvType = 'ADV_TYPE_IND' | 'ADV_TYPE_NONCONN_IND' | 'ADV_TYPE_SCAN_IND';

export type Esp32BleTxPower = 'ESP_PWR_LVL_N12' | 'ESP_PWR_LVL_N9' | 'ESP_PWR_LVL_N6' | 'ESP_PWR_LVL_N3' | 'ESP_PWR_LVL_N0' | 'ESP_PWR_LVL_P3' | 'ESP_PWR_LVL_P6' | 'ESP_PWR_LVL_P9';

export interface Esp32BleCharacteristic {
  id: string;
  name: string;
  uuid: string;
  value: string;
  permissions: ('READ' | 'WRITE' | 'NOTIFY' | 'INDICATE')[];
  description?: string;
}

export interface Esp32BleService {
  id: string;
  name: string;
  uuid: string;
  isPrimary: boolean;
  characteristics: Esp32BleCharacteristic[];
}

export interface Esp32BleIBeaconConfig {
  proximityUuid: string; // e.g. "FDA50693-A4E2-4FB1-AFCF-C6EB07647825"
  major: number; // 0..65535
  minor: number; // 0..65535
  measuredPowerRssiAt1m: number; // e.g. -59 dBm
  companyIdHex: string; // e.g. "0x004C"
}

export interface Esp32BleLogEntry {
  id: string;
  timestamp: string;
  type: 'ADV' | 'CONNECT' | 'DISCONNECT' | 'READ' | 'WRITE' | 'NOTIFY';
  details: string;
}

export interface Esp32BleState {
  enabled: boolean;
  deviceName: string;
  mode: Esp32BleMode;
  advType: Esp32BleAdvType;
  advIntervalMinMs: number; // 20 .. 10240 ms
  advIntervalMaxMs: number; // 20 .. 10240 ms
  txPower: Esp32BleTxPower;
  appearance: string; // e.g. "0x0000" (Generic)
  isAdvertising: boolean;
  connectedClientsCount: number;
  services: Esp32BleService[];
  iBeacon: Esp32BleIBeaconConfig;
  manufacturerDataHex: string;
  lastTransmittedPacketHex: string;
  txPacketsCount: number;
  simulatedLogs: Esp32BleLogEntry[];
}

export interface Esp32DacState {
  dac1: number; // GPIO25: 0 - 255
  dac2: number; // GPIO26: 0 - 255
  dac1Voltage: number; // 0.0 - 3.3V
  dac2Voltage: number; // 0.0 - 3.3V
  dac1Waveform: number[];
  dac2Waveform: number[];
}

export interface Esp32NvsEntry {
  namespace: string;
  key: string;
  type: 'int' | 'string' | 'float' | 'blob';
  value: any;
  lastModified: number;
}

export interface Esp32DeepSleepState {
  isSleeping: boolean;
  wakeupCause: 'EXT0' | 'EXT1' | 'TIMER' | 'TOUCH' | 'ULP' | 'NONE';
  wakeupTimeUs: number;
  sleepCount: number;
}

export interface Esp32PinExtendedState {
  gpio: number;
  mode: 'INPUT' | 'OUTPUT' | 'INPUT_PULLUP' | 'INPUT_PULLDOWN' | 'ANALOG' | 'TOUCH' | 'DAC';
  value: 0 | 1;
  analogValue: number; // 12-bit: 0 - 4095
  touchValue: number; // 0 - 100
  pwmDuty: number; // 0 - 255
  pwmFreqHz: number;
}

export interface Esp32DmaDescriptor {
  id: string;
  index: number;
  bufferAddressHex: string;
  bufferSizeBytes: number;
  lengthBytes: number;
  owner: 'CPU' | 'DMA';
  eof: boolean;
  sosf: boolean;
  nextDescId: string | null;
  bufferDataHex?: string;
  description?: string;
}

export type Esp32DmaChannelType = 'spi2_dma' | 'spi3_dma' | 'i2s0_dma' | 'i2s1_dma' | 'uart_dma' | 'gdma';

export interface Esp32DmaState {
  enabled: boolean;
  activeChannel: Esp32DmaChannelType;
  descriptors: Esp32DmaDescriptor[];
  isCircularRing: boolean;
  transferRateMBs: number;
  bytesTransferred: number;
  totalBytes: number;
  isRunning: boolean;
  interruptCount: number;
  lastInterruptReason: string;
  cpuOffloadPercent: number;
  currentDescriptorIndex: number;
}

export type Esp32I2aMode =
  | 'philips_i2s'
  | 'msb_justified'
  | 'pdm_rx'
  | 'dac_built_in'
  | 'adc_highspeed'
  | 'lcd_cam_parallel';

export type Esp32I2aChannelFormat = 'stereo' | 'mono_left' | 'mono_right' | 'dual_mono';

export interface Esp32I2aState {
  port: 0 | 1;
  enabled: boolean;
  mode: Esp32I2aMode;
  sampleRate: number;
  bitsPerSample: 8 | 16 | 24 | 32;
  channelFormat: Esp32I2aChannelFormat;
  bclkPin: number;
  wsPin: number;
  doutPin: number;
  dinPin: number;
  mclkPin: number;
  dmaBufferCount: number;
  dmaBufferLength: number;
  synthWaveform: 'sine' | 'square' | 'triangle' | 'noise' | 'speech_mic' | 'adc_scan';
  synthFreqHz: number;
  synthVolumePercent: number;
  isPlaying: boolean;
  peakLeftDbfs: number;
  peakRightDbfs: number;
  fftBands: number[];
  bufferUnderrunCount: number;
}

export interface Esp32SimulationState {
  core0: Esp32CoreState; // PRO CPU (Protocol / WiFi / System)
  core1: Esp32CoreState; // APP CPU (User Tasks / Main Loop)
  freeRtos: {
    tasks: Esp32FreeRtosTask[];
    queues: Esp32FreeRtosQueue[];
    tickCount: number;
  };
  wifi: Esp32WifiState;
  ble?: Esp32BleState;
  dac: Esp32DacState;
  touch: Record<string, number>; // T0..T9
  nvs: Record<string, Esp32NvsEntry>;
  deepSleep: Esp32DeepSleepState;
  pinStates32: Record<string, Esp32PinExtendedState>;
  dma?: Esp32DmaState;
  i2a?: Esp32I2aState;
}

export type RenderGridStyle = 'dots' | 'blueprint' | 'pcb_dark' | 'retro_terminal' | 'cyber_matrix' | 'clean_minimal';
export type RenderPipelineMode = 'dom_accelerated' | 'canvas2d_hybrid' | 'webgl_simulated';
export type RenderThemeMode = 'studio_dark' | 'matrix_terminal' | 'amber_crt' | 'blueprint_cyan' | 'monochrome_schematic' | 'cyberpunk_neon';

export interface RenderEngineConfig {
  // Scaling & Viewport
  zoomLevel: number; // 0.5 to 2.0 (50% - 200%)
  canvasDensity: 'compact' | 'comfortable' | 'spacious';
  gridStyle: RenderGridStyle;
  gridSize: number; // 8, 16, 24, 32
  snapToGrid: boolean;

  // Pipeline & Performance
  targetFps: number; // 30, 60, 120, or 0 (unlocked)
  pipelineMode: RenderPipelineMode;
  frameInterpolation: boolean;
  viewportCulling: boolean;
  batchDomUpdates: boolean;
  lowPowerMode: boolean;

  // Visual Effects & Mini OS Display Driver
  crtShader: boolean;
  bloomGlow: boolean;
  schematicMode: boolean;
  amberPhosphor: boolean;
  matrixGreenPhosphor: boolean;
  animatedWires: boolean;
  showSignalFlow: boolean;
  executionHeatmap: boolean;
  themeMode: RenderThemeMode;

  // Diagnostics & HUD
  renderDebugOverlay: boolean;
  showFpsGraph: boolean;
  showDrawCalls: boolean;
  showMemoryStats: boolean;
}

export interface RenderEngineTelemetry {
  fps: number;
  avgFps: number;
  frameTimeMs: number;
  layoutDurationMs: number;
  paintDurationMs: number;
  domNodeCount: number;
  renderedBlockCount: number;
  culledBlockCount: number;
  drawCalls: number;
  droppedFrames: number;
  memoryEstimateMb: number;
  activeShadersCount: number;
  uptimeSeconds: number;
}

export type AvrMcuFuseType =
  | 'atmega328p'
  | 'atmega2560'
  | 'atmega32u4'
  | 'attiny85'
  | 'atmega168'
  | 'atmega8';

export interface AvrFuseState {
  lfuse: number; // 0x00 - 0xFF
  hfuse: number; // 0x00 - 0xFF
  efuse: number; // 0x00 - 0xFF
  lock: number;  // 0x00 - 0xFF
  mcu: AvrMcuFuseType;
}

export interface AvrFusePreset {
  id: string;
  name: string;
  description: string;
  category: 'arduino' | 'custom' | 'lowpower' | 'security' | 'factory';
  mcu: AvrMcuFuseType;
  lfuse: number;
  hfuse: number;
  efuse: number;
  lock: number;
  tags: string[];
}

// ============================================================================
// DEDICATED FREERTOS ARCHITECTURE CANVAS & DRAG & DROP EDITOR TYPES
// ============================================================================

export type RtosNodeType =
  | 'task'
  | 'queue'
  | 'mutex'
  | 'event_group'
  | 'shared_variable'
  | 'direct_variable'
  | 'software_timer'
  | 'isr_handler';

export type RtosTaskState =
  | 'RUNNING'
  | 'READY'
  | 'BLOCKED'
  | 'SUSPENDED'
  | 'STARVING'
  | 'DEADLOCKED';

export interface RtosTaskData {
  name: string;
  core: 0 | 1 | -1; // 0: PRO CPU, 1: APP CPU, -1: No Affinity
  priority: number; // 0 - 24 (0 = tskIDLE_PRIORITY)
  stackSize: number; // bytes (e.g. 2048, 4096)
  loopPeriodMs: number;
  hasYield: boolean;
  state: RtosTaskState;
  cpuPercent: number;
  description?: string;
  directNotifyValue: number;
  notifyState: 'NOT_WAITING' | 'WAITING_FOR_BITS' | 'NOTIFICATION_RECEIVED';
  dependsOnTaskIds?: string[]; // Task IDs that this task waits for / starts after completion
  dependencyType?: 'completion' | 'notification' | 'semaphore';
  customCode?: string;
}

export interface RtosQueueData {
  name: string;
  length: number; // Capacity / slots
  itemSize: number; // Bytes per item
  itemType: string; // e.g. uint32_t, SensorData_t, CommandPacket
  messages: any[]; // Live simulated messages in FIFO queue
  peakUsage: number;
  sendTimeoutMs: number;
  receiveTimeoutMs: number;
}

export interface RtosMutexData {
  name: string;
  type: 'mutex' | 'recursive_mutex' | 'binary_semaphore' | 'counting_semaphore';
  maxCount: number;
  currentCount: number;
  ownerTaskId: string | null;
  waitingTaskIds: string[];
  priorityInheritance: boolean;
}

export interface RtosSharedVarData {
  name: string;
  dataType: 'int32_t' | 'float' | 'uint8_t' | 'bool' | 'char[32]' | 'struct';
  initialValue: any;
  currentValue: any;
  protectedByMutexId: string | null;
  accessMode: 'thread_safe' | 'unprotected_risk';
  writerTaskIds: string[];
  readerTaskIds: string[];
}

export interface RtosDirectVarData {
  name: string;
  targetTaskId: string;
  type: 'notify_bits' | 'notify_value' | 'task_local_storage';
  currentValue: any;
}

export interface RtosEventGroupData {
  name: string;
  bits: number; // Bitmask (e.g. 0b00000111)
  bitLabels: Record<number, string>;
}

export interface RtosTimerData {
  name: string;
  periodMs: number;
  autoReload: boolean;
  state: 'RUNNING' | 'DORMANT';
  callbackFunction: string;
}

export interface RtosIsrData {
  name: string;
  irqSource: string; // e.g. 'GPIO_INTR_PIN4', 'TIMER_GROUP0', 'UART0_RX'
  fromIsrApi: boolean;
  yieldFromIsr: boolean;
}

export interface RtosNode {
  id: string;
  type: RtosNodeType;
  x: number;
  y: number;
  width?: number;
  height?: number;
  data:
    | RtosTaskData
    | RtosQueueData
    | RtosMutexData
    | RtosSharedVarData
    | RtosDirectVarData
    | RtosEventGroupData
    | RtosTimerData
    | RtosIsrData;
}

export type RtosPortType =
  | 'out'
  | 'in'
  | 'produce'
  | 'consume'
  | 'write'
  | 'read'
  | 'lock'
  | 'unlock'
  | 'notify_send'
  | 'notify_receive'
  | 'dependency_out'
  | 'dependency_in'
  | 'timer_out'
  | 'isr_trigger';

export type RtosWireType =
  | 'data_queue'
  | 'mutex_guard'
  | 'shared_access'
  | 'direct_notify'
  | 'task_dependency'
  | 'event_flag'
  | 'timer_trigger'
  | 'isr_signal';

export interface RtosWire {
  id: string;
  fromNodeId: string;
  fromPort: string;
  toNodeId: string;
  toPort: string;
  type: RtosWireType;
  color: string;
  label?: string;
  isProtected?: boolean;
}

export type RtosLinterSeverity = 'critical' | 'warning' | 'info';

export type RtosLinterCategory =
  | 'race_condition'
  | 'deadlock'
  | 'priority_inversion'
  | 'stack_overflow'
  | 'starvation'
  | 'queue_overflow'
  | 'core_imbalance'
  | 'isr_safety'
  | 'orphan_node';

export interface RtosLinterAutoFix {
  type:
    | 'add_mutex_and_protect'
    | 'add_yield_delay'
    | 'upgrade_priority_inheritance'
    | 'increase_stack_size'
    | 'rebalance_core'
    | 'connect_queue_consumer'
    | 'enable_from_isr'
    | 'standardize_mutex_order';
  label: string;
  description: string;
  payload?: any;
}

export interface RtosLinterIssue {
  id: string;
  severity: RtosLinterSeverity;
  category: RtosLinterCategory;
  title: string;
  message: string;
  affectedNodeIds: string[];
  autoFixAvailable: boolean;
  autoFix?: RtosLinterAutoFix;
}

export interface RtosArchitecturePreset {
  id: string;
  title: string;
  description: string;
  nodes: RtosNode[];
  wires: RtosWire[];
}

// ==========================================
// AVR WATCHPOINT (DATA BREAKPOINT) TYPES
// ==========================================

export type AvrWatchpointTargetType = 'sram' | 'io_register' | 'cpu_register' | 'pin';

export type AvrWatchpointCondition =
  | 'ON_WRITE'
  | 'ON_READ'
  | 'ON_CHANGE'
  | 'EQUALS'
  | 'NOT_EQUALS'
  | 'GREATER'
  | 'LESS'
  | 'GREATER_EQUAL'
  | 'LESS_EQUAL'
  | 'BIT_SET'
  | 'BIT_CLEARED';

export interface AvrWatchpoint {
  id: string;
  name: string;
  enabled: boolean;
  targetType: AvrWatchpointTargetType;
  targetAddress?: number; // e.g. 0x0100 for SRAM or 0x25 for PORTB
  targetRegister?: string; // e.g. 'PORTB', 'DDRD', 'r16', 'SP', 'SREG'
  targetPin?: ArduinoPin;
  bitIndex?: number; // 0 - 7
  condition: AvrWatchpointCondition;
  expectedValue?: number; // 0 - 255 (or 0 - 65535 for 16-bit)
  hitCount: number;
  lastHitCycle?: number;
  lastHitTimestampNs?: number;
  lastOldValue?: number;
  lastNewValue?: number;
  description?: string;
}

export interface WatchpointHitEvent {
  watchpoint: AvrWatchpoint;
  pc: number;
  instructionHex?: string;
  disassembled?: string;
  cycle: number;
  timestampNs: number;
  oldValue: number;
  newValue: number;
  targetDescription: string;
  callStackDepth?: number;
}

export interface AvrWatchpointState {
  watchpoints: AvrWatchpoint[];
  isPausedOnWatchpoint: boolean;
  lastHitEvent: WatchpointHitEvent | null;
  hitHistory: WatchpointHitEvent[];
  autoResumeAfterMs?: number;
}

// ==========================================
// AVR STACK & HEAP MEMORY MAP TYPES
// ==========================================

export interface AvrStackFrame {
  id: string;
  type: 'RETURN_PC' | 'SAVED_REG' | 'LOCAL_VAR' | 'ISR_CONTEXT' | 'UNKNOWN';
  address: number; // SRAM address (e.g. 0x08FE)
  byteValue: number;
  decodedValue?: string; // e.g. "PC: 0x0059 (main+12)" or "r24: 0x42"
  label: string;
  frameIndex: number;
}

export interface AvrHeapBlock {
  id: string;
  address: number;
  sizeBytes: number;
  label: string;
  variableName?: string;
  allocatedBy?: string;
}

export interface AvrStackOverflowEvent {
  timestamp: number;
  cycle: number;
  sp: number;
  heapTop: number;
  sramBoundaryMin: number;
  collisionAddress: number;
  corruptedBytesCount: number;
  corruptedVariables: string[];
  callDepth: number;
  reason: 'HEAP_COLLISION' | 'SRAM_UNDERFLOW' | 'RECURSION_LIMIT' | 'UNBALANCED_PUSH';
}

export interface AvrStackMemorySnapshot {
  sp: number; // Current Stack Pointer (0x0100 - 0x08FF)
  spStart: number; // 0x08FF (RAMEND for ATmega328P)
  stackSizeBytes: number;
  stackUsagePercent: number;
  heapTop: number; // current __brkval (e.g. 0x0120)
  heapSizeBytes: number;
  staticDataEnd: number; // end of .data/.bss (e.g. 0x0114)
  freeMarginBytes: number; // sp - heapTop
  isOverflow: boolean;
  isWarningNearCollision: boolean; // freeMargin < 32 bytes
  frames: AvrStackFrame[];
  heapBlocks: AvrHeapBlock[];
  overflowEvent: AvrStackOverflowEvent | null;
}

