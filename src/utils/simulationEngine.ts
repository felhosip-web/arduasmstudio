import { ProgramBlock, SimulationState, ArduinoPin, LogicAnalyzerSample, I2CTransactionLog, SPITransactionLog, HardwareModule, Esp32SimulationState, Esp32PinExtendedState, AvrInterruptState, AvrInterruptVectorId, Esp32InterruptState, Esp32InterruptSourceId } from '../types';
import { ARDUINO_PINS_ORDER, PIN_MAPPINGS, CYCLE_NS } from './hardwareMap';
import { ESP32_PIN_MAPPINGS, ESP32_PINS_ORDER, Esp32PinName } from './esp32HardwareMap';
import { BLOCK_DEFINITIONS } from '../data/blockDefinitions';
import { INITIAL_ATTACHED_MODULES } from '../data/defaultModules';
import { DEFAULT_INTERRUPT_CONFIGS, ATMEGA328P_INTERRUPT_VECTORS } from './avrInterruptData';
import { createInitialEsp32InterruptState, ESP32_INTERRUPT_SOURCES, DEFAULT_ESP32_INTERRUPT_CONFIGS } from './esp32InterruptData';
import { DEFAULT_WATCHPOINTS } from './watchpointEngine';
import { analyzeSramMemory } from './stackEngine';

export function createInitialInterruptState(): AvrInterruptState {
  return {
    globalInterruptsEnabled: true,
    activeInterruptVector: null,
    pendingInterrupts: [],
    vectorConfigs: { ...DEFAULT_INTERRUPT_CONFIGS },
    eventLog: [],
    totalFiredCount: 0,
    firingCount: { INT0: 0, TIMER1_COMPA: 0 },
    isExecutingIsr: false,
  };
}

export function createInitialEsp32State(): Esp32SimulationState {
  const pinStates32: Record<string, Esp32PinExtendedState> = {};
  ESP32_PINS_ORDER.forEach((pinStr) => {
    const gpio = parseInt(pinStr, 10);
    const def = ESP32_PIN_MAPPINGS[pinStr];
    pinStates32[pinStr] = {
      gpio,
      mode: def.type === 'INPUT_ONLY' ? 'INPUT' : pinStr === '2' ? 'OUTPUT' : 'INPUT',
      value: pinStr === '2' ? 1 : 0,
      analogValue: def.adcChannel ? 2048 : 0, // mid-scale 1.65V
      touchValue: def.touchChannel ? 85 : 100, // not touched (~85)
      pwmDuty: 0,
      pwmFreqHz: 5000,
    };
  });

  return {
    core0: {
      pc: 0x40080000,
      cycles: 124500,
      activeTask: 'wifi_task',
      cpuLoadPercent: 12,
      registers: { a0: 0x40081234, a1: 0x3FFE3400, a2: 0, a3: 0, a4: 0, a5: 0, a6: 0, a7: 0, a8: 0, a9: 0, a10: 0, a11: 0, a12: 0, a13: 0, a14: 0, a15: 0 },
    },
    core1: {
      pc: 0x400D0000,
      cycles: 489200,
      activeTask: 'loopTask',
      cpuLoadPercent: 28,
      registers: { a0: 0x400D5678, a1: 0x3FFE7800, a2: 0, a3: 0, a4: 0, a5: 0, a6: 0, a7: 0, a8: 0, a9: 0, a10: 0, a11: 0, a12: 0, a13: 0, a14: 0, a15: 0 },
    },
    freeRtos: {
      tasks: [
        {
          id: 'task_loop',
          name: 'loopTask',
          coreId: 1,
          priority: 1,
          stackSize: 8192,
          state: 'RUNNING',
          lastRunTimeNs: 0,
          cpuPercentage: 35,
          functionName: 'app_main / loop',
        },
        {
          id: 'task_wifi',
          name: 'wifi_task',
          coreId: 0,
          priority: 5,
          stackSize: 4096,
          state: 'READY',
          lastRunTimeNs: 0,
          cpuPercentage: 10,
          functionName: 'esp_wifi_task',
        },
        {
          id: 'task_sensor',
          name: 'sensorWorker',
          coreId: 0,
          priority: 2,
          stackSize: 4096,
          state: 'READY',
          lastRunTimeNs: 0,
          cpuPercentage: 15,
          functionName: 'vSensorTask',
        },
      ],
      queues: [
        {
          id: 'q_sensor_data',
          name: 'xQueueSensorData',
          length: 10,
          itemSize: 16,
          messages: [{ temp: 24.5, humidity: 48, timestamp: Date.now() }],
          peakUsage: 3,
        },
      ],
      tickCount: 1000,
    },
    wifi: {
      mode: 'STA',
      status: 'CONNECTED',
      ssid: 'IoT_Studio_WiFi',
      password: 'iot_secret_pass',
      useStaticIp: true,
      ipAddress: '192.168.1.150',
      gateway: '192.168.1.1',
      subnet: '255.255.255.0',
      dns: '8.8.8.8',
      dns2: '1.1.1.1',
      hostname: 'esp32-node-01',
      autoReconnect: true,
      rssi: -54,
      macAddress: '24:6F:28:B4:7E:1A',
      apSsid: 'ESP32_AccessPoint',
      apPassword: 'esp32password',
      apIpAddress: '192.168.4.1',
      apSubnet: '255.255.255.0',
      apChannel: 1,
      apMaxConnections: 4,
      apClients: 0,
      webServer: {
        running: true,
        port: 80,
        routes: [
          { path: '/', method: 'GET', handler: 'handleRoot', responseBody: '<h1>ESP32 Web Server</h1><p>Status: Online</p><a href="/led/toggle">Toggle LED</a>' },
          { path: '/led/toggle', method: 'POST', handler: 'handleLedToggle', responseBody: '{"status":"ok","ledState":"TOGGLED"}' },
          { path: '/api/status', method: 'GET', handler: 'handleApiStatus', responseBody: '{"mcu":"ESP32-WROOM-32","clockMhz":240,"freeHeap":287410,"wifiRssi":-54}' },
        ],
        requestLog: [
          {
            id: 'req_init_1',
            timestamp: new Date().toLocaleTimeString(),
            method: 'GET',
            path: '/api/status',
            clientIp: '192.168.1.42',
            responseCode: 200,
            response: '{"mcu":"ESP32-WROOM-32","status":"online"}',
          },
        ],
      },
    },
    ble: {
      enabled: true,
      deviceName: 'ESP32_IoT_Sensors',
      mode: 'GATT_SERVER',
      advType: 'ADV_TYPE_IND',
      advIntervalMinMs: 100,
      advIntervalMaxMs: 200,
      txPower: 'ESP_PWR_LVL_P3',
      appearance: '0x0540', // Generic Sensor
      isAdvertising: true,
      connectedClientsCount: 0,
      services: [
        {
          id: 'srv_env',
          name: 'Környezeti Telemetria Szolgáltatás',
          uuid: '4fafc201-1fb5-459e-8fcc-c5c9c331914b',
          isPrimary: true,
          characteristics: [
            {
              id: 'char_temp',
              name: 'Hőmérséklet Érték (°C)',
              uuid: 'beb5483e-36e1-4688-b7f5-ea07361b26a8',
              value: '24.5',
              permissions: ['READ', 'NOTIFY'],
              description: 'DHT22 / BME280 Kalibrált Hőmérséklet telemetria',
            },
            {
              id: 'char_cmd',
              name: 'Vezérlő Parancs (LED / Relé)',
              uuid: 'beb5483e-36e1-4688-b7f5-ea07361b26a9',
              value: '0x01',
              permissions: ['READ', 'WRITE'],
              description: 'Kétirányú parancs fogadás (GPIO2 LED Toggle)',
            },
          ],
        },
      ],
      iBeacon: {
        proximityUuid: 'FDA50693-A4E2-4FB1-AFCF-C6EB07647825',
        major: 10001,
        minor: 20002,
        measuredPowerRssiAt1m: -59,
        companyIdHex: '0x004C',
      },
      manufacturerDataHex: '4C000215FDA50693A4E24FB1AFCFC6EB0764782527114E22C5',
      lastTransmittedPacketHex: '02010611074B9131C3C9C5F5B78846E1363E48B5BE0E0945535033325F496F545F53656E736F7273',
      txPacketsCount: 1250,
      simulatedLogs: [
        {
          id: 'ble_log_1',
          timestamp: new Date().toLocaleTimeString(),
          type: 'ADV',
          details: 'BLE Advertising indítva: ESP32_IoT_Sensors (Intervallum: 100ms, TxPower: +3dBm)',
        },
      ],
    },
    dac: {
      dac1: 128,
      dac2: 64,
      dac1Voltage: 1.65,
      dac2Voltage: 0.83,
      dac1Waveform: [128, 140, 160, 190, 220, 245, 255, 245, 220, 190, 160, 140, 128, 110, 90, 60, 30, 10, 0, 10, 30, 60, 90, 110, 128],
      dac2Waveform: [64, 80, 100, 120, 140, 160, 180, 200, 220, 240, 255, 200, 150, 100, 50, 0, 30, 64],
    },
    touch: {
      '4': 82, // Touch 0 (GPIO4)
      '2': 85, // Touch 2 (GPIO2)
      '15': 84, // Touch 3 (GPIO15)
      '13': 88, // Touch 4 (GPIO13)
      '12': 86, // Touch 5 (GPIO12)
      '14': 87, // Touch 6 (GPIO14)
      '27': 83, // Touch 7 (GPIO27)
      '33': 85, // Touch 8 (GPIO33)
      '32': 81, // Touch 9 (GPIO32)
    },
    nvs: {
      'wifi_ssid': { namespace: 'config', key: 'wifi_ssid', type: 'string', value: 'IoT_Studio_WiFi', lastModified: Date.now() },
      'boot_count': { namespace: 'system', key: 'boot_count', type: 'int', value: 42, lastModified: Date.now() },
      'calib_offset': { namespace: 'sensors', key: 'calib_offset', type: 'float', value: 1.045, lastModified: Date.now() },
    },
    deepSleep: {
      isSleeping: false,
      wakeupCause: 'NONE',
      wakeupTimeUs: 0,
      sleepCount: 0,
    },
    pinStates32,
    dma: {
      enabled: true,
      activeChannel: 'spi2_dma',
      isCircularRing: true,
      transferRateMBs: 40.0,
      bytesTransferred: 65536,
      totalBytes: 153600,
      isRunning: true,
      interruptCount: 24,
      lastInterruptReason: 'ESP_INTR_FLAG_DMA (EOF_DESC_3)',
      cpuOffloadPercent: 98.4,
      currentDescriptorIndex: 1,
      descriptors: [
        {
          id: 'dma_desc_0',
          index: 0,
          bufferAddressHex: '0x3FFA0000',
          bufferSizeBytes: 4096,
          lengthBytes: 4096,
          owner: 'DMA',
          eof: false,
          sosf: false,
          nextDescId: 'dma_desc_1',
          bufferDataHex: 'AA 55 FF 00 12 34 56 78 DE AD BE EF 42 42 ...',
          description: 'Ping Buffer 0 (Frame Header & Rows 0..30)',
        },
        {
          id: 'dma_desc_1',
          index: 1,
          bufferAddressHex: '0x3FFA1000',
          bufferSizeBytes: 4096,
          lengthBytes: 4096,
          owner: 'DMA',
          eof: false,
          sosf: false,
          nextDescId: 'dma_desc_2',
          bufferDataHex: '55 AA 00 FF 78 56 34 12 EF BE AD DE 24 24 ...',
          description: 'Pong Buffer 1 (Frame Rows 31..60)',
        },
        {
          id: 'dma_desc_2',
          index: 2,
          bufferAddressHex: '0x3FFA2000',
          bufferSizeBytes: 4096,
          lengthBytes: 4096,
          owner: 'CPU',
          eof: false,
          sosf: false,
          nextDescId: 'dma_desc_3',
          bufferDataHex: '00 00 FF FF 11 22 33 44 55 66 77 88 99 AA ...',
          description: 'Buffer 2 (Frame Rows 61..90 - CPU Fill in progress)',
        },
        {
          id: 'dma_desc_3',
          index: 3,
          bufferAddressHex: '0x3FFA3000',
          bufferSizeBytes: 4096,
          lengthBytes: 4096,
          owner: 'CPU',
          eof: true,
          sosf: false,
          nextDescId: 'dma_desc_0',
          bufferDataHex: 'FF FF 00 00 99 88 77 66 55 44 33 22 11 00 ...',
          description: 'EOF Buffer 3 (Frame Rows 91..120 - Triggers DMA Interrupt)',
        },
      ],
    },
    i2a: {
      port: 0,
      enabled: true,
      mode: 'philips_i2s',
      sampleRate: 44100,
      bitsPerSample: 16,
      channelFormat: 'stereo',
      bclkPin: 26,
      wsPin: 25,
      doutPin: 22,
      dinPin: 19,
      mclkPin: 0,
      dmaBufferCount: 4,
      dmaBufferLength: 256,
      synthWaveform: 'sine',
      synthFreqHz: 440,
      synthVolumePercent: 75,
      isPlaying: true,
      peakLeftDbfs: -6.2,
      peakRightDbfs: -5.8,
      fftBands: [15, 28, 45, 62, 78, 85, 92, 74, 60, 48, 35, 25, 18, 12, 8, 4],
      bufferUnderrunCount: 0,
    },
  };
}

export function createInitialSimulationState(): SimulationState {
  const initialPinStates: Record<ArduinoPin, any> = {} as any;
  ARDUINO_PINS_ORDER.forEach((pin) => {
    initialPinStates[pin] = {
      mode: pin.startsWith('A') ? 'INPUT' : 'INPUT',
      value: 0,
      pwmValue: 0,
      analogVoltage: pin.startsWith('A') ? 2.50 : undefined,
      label: pin === '13' ? 'LED (PB5)' : pin === 'A4' ? 'SDA (PC4)' : pin === 'A5' ? 'SCL (PC5)' : pin === '10' ? 'SS (PB2)' : pin === '11' ? 'MOSI (PB3)' : pin === '12' ? 'MISO (PB4)' : `D${pin}`,
    };
  });

  const registers: Record<string, number> = {};
  for (let i = 0; i <= 31; i++) {
    registers[`r${i}`] = 0;
  }

  return {
    isRunning: false,
    isPaused: false,
    currentBlockIndex: 0,
    currentScope: 'setup',
    stepCount: 0,
    totalCycles: 0,
    executionSpeedMs: 300,
    pinStates: initialPinStates,
    analogInputs: {
      A0: 512, // 2.50 V default
      A1: 204, // 1.00 V default
      A2: 768, // 3.75 V default
      A3: 0,   // 0.00 V default
      A4: 1023, // 5.00 V default (Pull-up)
      A5: 1023, // 5.00 V default (Pull-up)
    },
    registers,
    modules: JSON.parse(JSON.stringify(INITIAL_ATTACHED_MODULES)),
    sreg: {
      C: false,
      Z: false,
      N: false,
      V: false,
      S: false,
      H: false,
      T: false,
      I: true,
    },
    uartState: {
      initialized: false,
      baudRate: 9600,
      doubleSpeed: false,
      txLed: false,
      rxLed: false,
      terminalText: '',
      rxBuffer: '',
      log: [],
    },
    i2cState: {
      initialized: false,
      speedKbps: 100,
      busStatus: 'IDLE',
      log: [],
    },
    spiState: {
      initialized: false,
      clockDivider: 'DIV_4 (4 MHz)',
      ssActive: false,
      log: [],
    },
    adcState: {
      initialized: false,
      activeChannel: 'A0',
      prescaler: 128,
      lastResult: 0,
    },
    oneWireState: {
      initialized: true,
      pin: '2',
      busStatus: 'IDLE',
      presenceDetected: true,
      lastTemperatureC: 24.5,
      romCode: '28-AA-73-04-1A-20-01-F3',
      log: [],
    },
    neoPixelPixels: ['#000000', '#000000', '#000000', '#000000', '#000000', '#000000', '#000000', '#000000'],
    logicWaveform: [],
    eeprom: new Uint8Array(1024).fill(0xff),
    flash: new Uint8Array(32768),
    masterSlaveState: {
      role: 'MASTER',
      activeProtocol: 'I2C',
      i2cRole: 'MASTER',
      i2cOwnAddress: 0x08,
      i2cSlaves: [
        {
          addressHex: '0x08',
          name: 'Uno Slave Node #1 (Szenzor Csomópont)',
          registers: { '0x00': 42, '0x01': 100, '0x02': 255 },
          ack: true,
        },
        {
          addressHex: '0x12',
          name: 'Uno Slave Node #2 (Aktuátor / PWM)',
          registers: { '0x00': 180, '0x01': 50 },
          ack: true,
        },
        {
          addressHex: '0x27',
          name: 'PCF8574 I2C LCD Kijelző Illesztő',
          registers: { '0x00': 0x38 },
          ack: true,
        },
      ],
      spiRole: 'MASTER',
      spiSlaves: [
        {
          id: 'spi_slave_1',
          name: 'SPI Távoli Szenzor (D10 SS)',
          ssPin: '10',
          responseByte: 0x55,
        },
        {
          id: 'spi_slave_2',
          name: 'SPI Motorvezérlő (D9 SS)',
          ssPin: '9',
          responseByte: 0xAA,
        },
      ],
      nrfRole: 'MASTER',
      nrfChannel: 76,
      nrfOwnPipe: '0xE8E8F0F0E1',
      nrfSlaves: [
        {
          id: 'nrf_slave_1',
          pipeIndex: 1,
          pipeAddress: '0xE8E8F0F001',
          name: 'NRF24 Távoli Kerti Szenzor Csomópont (Pipe 1)',
          lastReceivedPayload: 'NODE1_ON',
          ackPayload: 'ACK_TEMP_24.5C',
          rssi: -45,
          active: true,
        },
        {
          id: 'nrf_slave_2',
          pipeIndex: 2,
          pipeAddress: '0xE8E8F0F002',
          name: 'NRF24 Kerti Öntöző Aktuátor Csomópont (Pipe 2)',
          lastReceivedPayload: 'VALVE_CLOSED',
          ackPayload: 'ACK_VALVE_OK',
          rssi: -58,
          active: true,
        },
        {
          id: 'nrf_slave_3',
          pipeIndex: 3,
          pipeAddress: '0xE8E8F0F003',
          name: 'NRF24 Napelemes Töltésvezérlő (Pipe 3)',
          lastReceivedPayload: 'BAT_VOLT_REQ',
          ackPayload: 'ACK_13.8V',
          rssi: -62,
          active: true,
        },
      ],
      lastMasterCommand: 'IDLE',
      lastSlaveResponse: 'OK',
      busCollision: false,
      activeTargetSlave: '0x08',
      totalPacketsExchanged: 0,
    },
    dataStructState: {
      arrays: {
        sine_table: {
          name: 'sine_table',
          memoryType: 'flash',
          dataType: 'uint8',
          baseAddress: 0x0040,
          size: 8,
          data: [0, 48, 90, 128, 150, 128, 90, 48],
          lastAccessedIndex: 0,
          lastAccessedValue: 0,
        },
        sensor_buffer: {
          name: 'sensor_buffer',
          memoryType: 'ram',
          dataType: 'uint8',
          baseAddress: 0x0100,
          size: 16,
          data: [12, 45, 88, 192, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
          lastAccessedIndex: 0,
          lastAccessedValue: 12,
        },
      },
      structs: {
        current_sensor_node: {
          name: 'current_sensor_node',
          structType: 'SensorNode',
          baseAddress: 0x0120,
          totalSize: 4,
          fields: [
            { name: 'node_id', type: 'uint8_t', offset: 0, size: 1, value: 8 },
            { name: 'temperature', type: 'int16_t', offset: 1, size: 2, value: 245 },
            { name: 'status_flags', type: 'uint8_t', offset: 3, size: 1, value: 0x81 },
          ],
        },
      },
      objects: {
        statusLed: {
          id: 'statusLed',
          className: 'LedController',
          instanceName: 'statusLed',
          thisPointer: 0x0140,
          fields: { pin: 13, state: 0, brightness: 255 },
          methods: ['construct', 'toggle', 'setBrightness', 'reset'],
          lastMethodCalled: 'construct',
        },
      },
      lastOperation: 'Struktúrák és objektumok inicializálva',
    },
    esp32State: createInitialEsp32State(),
    esp32InterruptState: createInitialEsp32InterruptState(),
    interruptState: createInitialInterruptState(),
    watchpointState: {
      watchpoints: [...DEFAULT_WATCHPOINTS],
      hitHistory: [],
      lastHitEvent: undefined,
      isPausedOnWatchpoint: false,
    },
    stackMemorySnapshot: analyzeSramMemory(null, 0x08ff),
  };
}

export function executeSimulationStep(
  prevState: SimulationState,
  blocks: ProgramBlock[]
): SimulationState {
  const setupBlocks = blocks.filter((b) => b.scope === 'setup' && b.enabled !== false);
  const loopBlocks = blocks.filter((b) => b.scope === 'loop' && b.enabled !== false);

  if (setupBlocks.length === 0 && loopBlocks.length === 0) {
    return prevState;
  }

  let nextScope = prevState.currentScope;
  let nextIndex = prevState.currentBlockIndex;

  let currentList = nextScope === 'setup' ? setupBlocks : loopBlocks;

  // If in setup and finished setup, move to loop
  if (nextScope === 'setup' && (nextIndex >= setupBlocks.length || setupBlocks.length === 0)) {
    nextScope = 'loop';
    nextIndex = 0;
    currentList = loopBlocks;
  }

  if (nextScope === 'loop' && loopBlocks.length > 0) {
    if (nextIndex >= loopBlocks.length) {
      nextIndex = 0;
    }
  }

  if (currentList.length === 0) {
    return prevState;
  }

  const currentBlock = currentList[nextIndex];
  if (!currentBlock) {
    return prevState;
  }

  const newPinStates = { ...prevState.pinStates };
  const newRegisters = { ...prevState.registers };
  const newSreg = { ...prevState.sreg };
  let newNeoPixels = [...(prevState.neoPixelPixels || [])];
  const newModules = (prevState.modules || []).map((m) => ({
    ...m,
    pins: { ...m.pins },
    state: { ...m.state },
  }));
  const newUartState = prevState.uartState ? { ...prevState.uartState, log: [...prevState.uartState.log] } : undefined;
  const newI2cState = prevState.i2cState ? { ...prevState.i2cState, log: [...prevState.i2cState.log] } : undefined;
  const newSpiState = prevState.spiState ? { ...prevState.spiState, log: [...prevState.spiState.log] } : undefined;
  const newAdcState = prevState.adcState ? { ...prevState.adcState } : undefined;
  const newOneWireState = prevState.oneWireState
    ? { ...prevState.oneWireState, log: [...prevState.oneWireState.log] }
    : {
        initialized: true,
        pin: '2' as ArduinoPin,
        busStatus: 'IDLE' as const,
        presenceDetected: true,
        lastTemperatureC: 24.5,
        romCode: '28-AA-73-04-1A-20-01-F3',
        log: [],
      };
  const newEeprom = prevState.eeprom ? new Uint8Array(prevState.eeprom) : new Uint8Array(1024).fill(0xff);
  const newFlash = prevState.flash ? new Uint8Array(prevState.flash) : new Uint8Array(32768);
  let newLastEepromAccess = prevState.lastEepromAccess;
  const newMasterSlaveState = prevState.masterSlaveState
    ? {
        ...prevState.masterSlaveState,
        i2cSlaves: prevState.masterSlaveState.i2cSlaves.map((s) => ({ ...s, registers: { ...s.registers } })),
        spiSlaves: prevState.masterSlaveState.spiSlaves.map((s) => ({ ...s })),
      }
    : undefined;
  const newDataStructState = prevState.dataStructState
    ? {
        ...prevState.dataStructState,
        arrays: {
          ...Object.fromEntries(
            Object.entries(prevState.dataStructState.arrays).map(([k, v]) => [k, { ...v, data: [...v.data] }])
          ),
        },
        structs: {
          ...Object.fromEntries(
            Object.entries(prevState.dataStructState.structs).map(([k, v]) => [
              k,
              { ...v, fields: v.fields.map((f) => ({ ...f })) },
            ])
          ),
        },
        objects: {
          ...Object.fromEntries(
            Object.entries(prevState.dataStructState.objects).map(([k, v]) => [
              k,
              { ...v, fields: { ...v.fields }, methods: [...v.methods] },
            ])
          ),
        },
      }
    : undefined;

  const newEsp32State: Esp32SimulationState = prevState.esp32State
    ? {
        ...prevState.esp32State,
        core0: { ...prevState.esp32State.core0, registers: { ...prevState.esp32State.core0.registers } },
        core1: { ...prevState.esp32State.core1, registers: { ...prevState.esp32State.core1.registers } },
        freeRtos: {
          tasks: prevState.esp32State.freeRtos.tasks.map((t) => ({ ...t })),
          queues: prevState.esp32State.freeRtos.queues.map((q) => ({ ...q, messages: [...q.messages] })),
          tickCount: prevState.esp32State.freeRtos.tickCount + 1,
        },
        wifi: {
          ...prevState.esp32State.wifi,
          webServer: {
            ...prevState.esp32State.wifi.webServer,
            routes: prevState.esp32State.wifi.webServer.routes.map((r) => ({ ...r })),
            requestLog: [...prevState.esp32State.wifi.webServer.requestLog],
          },
        },
        dac: {
          ...prevState.esp32State.dac,
          dac1Waveform: [...prevState.esp32State.dac.dac1Waveform],
          dac2Waveform: [...prevState.esp32State.dac.dac2Waveform],
        },
        touch: { ...prevState.esp32State.touch },
        nvs: { ...prevState.esp32State.nvs },
        deepSleep: { ...prevState.esp32State.deepSleep },
        pinStates32: Object.fromEntries(
          Object.entries(prevState.esp32State.pinStates32).map(([k, v]) => [k, { ...v }])
        ),
      }
    : createInitialEsp32State();

  const newInterruptState: AvrInterruptState = prevState.interruptState
    ? {
        ...prevState.interruptState,
        firingCount: { ...(prevState.interruptState.firingCount || {}) },
        eventLog: [...(prevState.interruptState.eventLog || [])],
        pendingInterrupts: [...(prevState.interruptState.pendingInterrupts || [])],
        vectorConfigs: { ...(prevState.interruptState.vectorConfigs || DEFAULT_INTERRUPT_CONFIGS) },
      }
    : createInitialInterruptState();

  const newEsp32InterruptState: Esp32InterruptState = prevState.esp32InterruptState
    ? {
        ...prevState.esp32InterruptState,
        configs: { ...(prevState.esp32InterruptState.configs || DEFAULT_ESP32_INTERRUPT_CONFIGS) },
        pendingInterrupts: [...(prevState.esp32InterruptState.pendingInterrupts || [])],
        eventLog: [...(prevState.esp32InterruptState.eventLog || [])],
        firingCount: { ...(prevState.esp32InterruptState.firingCount || {}) },
      }
    : createInitialEsp32InterruptState();

  const def = BLOCK_DEFINITIONS[currentBlock.type];
  const blockCycles = def ? def.calculateCycles(currentBlock.params) : 1;
  const cycleNsElapsed = blockCycles * CYCLE_NS;
  const currentTimestampNs = (prevState.logicWaveform[prevState.logicWaveform.length - 1]?.timeNs || 0) + cycleNsElapsed;

  // Execute block logic
  const params = currentBlock.params || {};

  switch (currentBlock.type) {
    case 'io_pin_mode': {
      const pin = (params.pin || '13') as ArduinoPin;
      if (newPinStates[pin]) {
        newPinStates[pin] = {
          ...newPinStates[pin],
          mode: params.mode === 'OUTPUT' ? 'OUTPUT' : 'INPUT',
        };
      }
      break;
    }

    case 'io_pin_write': {
      const pin = (params.pin || '13') as ArduinoPin;
      if (newPinStates[pin]) {
        newPinStates[pin] = {
          ...newPinStates[pin],
          value: params.state === 'HIGH' ? 1 : 0,
        };
      }
      break;
    }

    case 'io_pin_toggle': {
      const pin = (params.pin || '13') as ArduinoPin;
      if (newPinStates[pin]) {
        newPinStates[pin] = {
          ...newPinStates[pin],
          value: newPinStates[pin].value === 1 ? 0 : 1,
        };
      }
      break;
    }

    case 'io_port_write': {
      const port = params.port || 'PORTD';
      const rawVal = parseInt(params.valueHex || '0xFF', 16) || 0;
      const mask = rawVal & 0xff;

      ARDUINO_PINS_ORDER.forEach((p) => {
        const map = PIN_MAPPINGS[p];
        if (map && map.port === port) {
          const bitVal = (mask & (1 << map.bit)) ? 1 : 0;
          newPinStates[p] = {
            ...newPinStates[p],
            value: bitVal as 0 | 1,
          };
        }
      });
      break;
    }

    case 'math_reg_load': {
      const reg = params.reg || 'r16';
      const val = (Number(params.value) || 0) & 0xff;
      newRegisters[reg] = val;
      newSreg.Z = val === 0;
      newSreg.N = (val & 0x80) !== 0;
      break;
    }

    case 'math_reg_arithmetic': {
      const op = params.operation || 'INC';
      const dest = params.destReg || 'r16';
      const src = params.srcReg || 'r17';
      let currentVal = newRegisters[dest] || 0;

      if (op === 'INC') currentVal = (currentVal + 1) & 0xff;
      else if (op === 'DEC') currentVal = (currentVal - 1 + 256) & 0xff;
      else if (op === 'CLR') currentVal = 0;
      else if (op === 'ADD') currentVal = (currentVal + (newRegisters[src] || 0)) & 0xff;
      else if (op === 'SUB') currentVal = (currentVal - (newRegisters[src] || 0) + 256) & 0xff;

      newRegisters[dest] = currentVal;
      newSreg.Z = currentVal === 0;
      newSreg.N = (currentVal & 0x80) !== 0;
      break;
    }

    case 'math_hardware_mul': {
      const mode = params.mulMode || 'MUL';
      const rA = params.regA || 'r16';
      const rB = params.regB || 'r17';
      const valA = newRegisters[rA] ?? 0;
      const valB = newRegisters[rB] ?? 0;

      let result = 0;
      if (mode === 'MULS') {
        const sA = (valA & 0x80) ? valA - 256 : valA;
        const sB = (valB & 0x80) ? valB - 256 : valB;
        result = sA * sB;
      } else {
        result = valA * valB;
      }

      newRegisters.r0 = result & 0xFF;
      newRegisters.r1 = (result >> 8) & 0xFF;
      newSreg.C = (result & 0x8000) !== 0;
      newSreg.Z = (result & 0xFFFF) === 0;
      break;
    }

    case 'math_word_arithmetic': {
      const op = params.operation || 'ADIW';
      const pair = params.pair || 'r25:r24';
      const k = Math.min(63, Math.max(0, Number(params.constant) || 0));

      const [hiReg, loReg] = pair.split(':');
      let wordVal = ((newRegisters[hiReg] ?? 0) << 8) | (newRegisters[loReg] ?? 0);

      if (op === 'ADIW') {
        wordVal = (wordVal + k) & 0xFFFF;
      } else {
        wordVal = (wordVal - k + 0x10000) & 0xFFFF;
      }

      newRegisters[loReg] = wordVal & 0xFF;
      newRegisters[hiReg] = (wordVal >> 8) & 0xFF;
      newSreg.Z = wordVal === 0;
      newSreg.N = (wordVal & 0x8000) !== 0;
      break;
    }

    case 'math_add_sub_carry': {
      const op = params.operation || 'ADC';
      const dest = params.destReg || 'r17';
      const src = params.srcReg || 'r19';
      const carry = newSreg.C ? 1 : 0;
      const dVal = newRegisters[dest] ?? 0;
      const sVal = (op === 'SBCI') ? (Number(params.immediateVal) || 0) : (newRegisters[src] ?? 0);

      let res = 0;
      if (op === 'ADC') {
        res = dVal + sVal + carry;
        newSreg.C = res > 255;
      } else {
        res = dVal - sVal - carry;
        newSreg.C = res < 0;
      }

      const safeRes = (res + 256) & 0xFF;
      newRegisters[dest] = safeRes;
      newSreg.Z = safeRes === 0;
      newSreg.N = (safeRes & 0x80) !== 0;
      break;
    }

    case 'math_bitwise_logic': {
      const op = params.operation || 'AND';
      const dest = params.destReg || 'r16';
      const src = params.srcReg || 'r17';
      const imm = parseInt(params.immediateVal, 16) || parseInt(params.immediateVal, 10) || 0;
      const dVal = newRegisters[dest] ?? 0;
      const sVal = newRegisters[src] ?? 0;

      let res = dVal;
      if (op === 'AND') res = dVal & sVal;
      else if (op === 'ANDI') res = dVal & (imm & 0xFF);
      else if (op === 'OR') res = dVal | sVal;
      else if (op === 'ORI') res = dVal | (imm & 0xFF);
      else if (op === 'EOR') res = dVal ^ sVal;
      else if (op === 'COM') res = (~dVal) & 0xFF;
      else if (op === 'NEG') res = (-dVal + 256) & 0xFF;

      const safeRes = res & 0xFF;
      newRegisters[dest] = safeRes;
      newSreg.Z = safeRes === 0;
      newSreg.N = (safeRes & 0x80) !== 0;
      break;
    }

    case 'math_shift_rotate': {
      const op = params.operation || 'LSL';
      const reg = params.reg || 'r16';
      const count = Math.min(8, Math.max(1, Number(params.shiftCount) || 1));
      let val = newRegisters[reg] ?? 0;

      for (let i = 0; i < count; i++) {
        if (op === 'LSL') {
          newSreg.C = (val & 0x80) !== 0;
          val = (val << 1) & 0xFF;
        } else if (op === 'LSR') {
          newSreg.C = (val & 0x01) !== 0;
          val = (val >> 1) & 0xFF;
        } else if (op === 'ASR') {
          const sign = val & 0x80;
          newSreg.C = (val & 0x01) !== 0;
          val = (sign | (val >> 1)) & 0xFF;
        } else if (op === 'ROL') {
          const oldC = newSreg.C ? 1 : 0;
          newSreg.C = (val & 0x80) !== 0;
          val = ((val << 1) | oldC) & 0xFF;
        } else if (op === 'ROR') {
          const oldC = newSreg.C ? 0x80 : 0;
          newSreg.C = (val & 0x01) !== 0;
          val = ((val >> 1) | oldC) & 0xFF;
        } else if (op === 'SWAP') {
          val = (((val & 0x0F) << 4) | ((val & 0xF0) >> 4)) & 0xFF;
        }
      }

      newRegisters[reg] = val;
      newSreg.Z = val === 0;
      newSreg.N = (val & 0x80) !== 0;
      break;
    }

    case 'math_bit_test_skip': {
      const reg = params.reg || 'r16';
      const bit = Math.min(7, Math.max(0, Number(params.bitIndex) || 0));
      const val = newRegisters[reg] ?? 0;
      newSreg.Z = val === 0;
      newSreg.N = (val & 0x80) !== 0;
      newSreg.T = ((val >> bit) & 1) === 1;
      break;
    }

    case 'math_map_constrain': {
      const func = params.functionType || 'MAP';
      const dest = params.destReg || 'r24';
      const src = params.srcReg || 'r24';
      const inVal = newRegisters[src] ?? 0;

      let outVal = inVal;
      if (func === 'MAP') {
        const inMin = Number(params.inMin) || 0;
        const inMax = Number(params.inMax) || 1023;
        const outMin = Number(params.outMin) || 0;
        const outMax = Number(params.outMax) || 255;
        const clamped = Math.max(inMin, Math.min(inMax, inVal));
        outVal = Math.round(outMin + ((clamped - inMin) * (outMax - outMin)) / (inMax - inMin));
      } else if (func === 'CONSTRAIN') {
        const outMin = Number(params.outMin) || 0;
        const outMax = Number(params.outMax) || 255;
        outVal = Math.max(outMin, Math.min(outMax, inVal));
      } else if (func === 'ABS') {
        const signed = (inVal & 0x80) ? inVal - 256 : inVal;
        outVal = Math.abs(signed);
      }

      newRegisters[dest] = outVal & 0xFF;
      break;
    }

    case 'math_div16_mod': {
      const hiDividend = params.dividendHiReg || 'r25';
      const loDividend = params.dividendLoReg || 'r24';
      const divisorReg = params.divisorReg || 'r22';
      const qReg = params.quotientReg || 'r24';
      const rReg = params.remainderReg || 'r22';

      const dividend = ((newRegisters[hiDividend] ?? 0) << 8) | (newRegisters[loDividend] ?? 0);
      const divisor = newRegisters[divisorReg] || 1;

      const quotient = Math.floor(dividend / divisor);
      const remainder = dividend % divisor;

      newRegisters[qReg] = quotient & 0xFF;
      newRegisters[rReg] = remainder & 0xFF;
      newSreg.Z = (quotient & 0xFF) === 0;
      break;
    }

    // ==========================================
    // I2C PROTOCOL EXECUTION
    // ==========================================
    case 'protocol_i2c_init': {
      const speed = params.speed === '400kHz' ? 400 : 100;
      if (newI2cState) {
        newI2cState.initialized = true;
        newI2cState.speedKbps = speed;
        newI2cState.busStatus = 'IDLE';
        newI2cState.log.unshift({
          id: `i2c-${Date.now()}-${Math.random()}`,
          type: 'INIT',
          details: `TWI Hardver inicializálva: ${speed} kHz (TWBR=${speed === 400 ? 12 : 72}, TWSR=0)`,
          timestampNs: currentTimestampNs,
        });
      }
      if (newPinStates['A4']) newPinStates['A4'].value = 1;
      if (newPinStates['A5']) newPinStates['A5'].value = 1;
      break;
    }

    case 'protocol_i2c_start_stop': {
      const cond = params.condition || 'START';
      if (newI2cState) {
        if (cond === 'START') {
          newI2cState.busStatus = 'START';
          if (newPinStates['A4']) newPinStates['A4'].value = 0; // SDA goes LOW
          if (newPinStates['A5']) newPinStates['A5'].value = 1; // SCL HIGH
          newI2cState.log.unshift({
            id: `i2c-${Date.now()}-${Math.random()}`,
            type: 'START',
            details: 'I2C START feltétel kiküldve a buszra (SDA↓ miközben SCL=1)',
            timestampNs: currentTimestampNs,
          });
        } else if (cond === 'STOP') {
          newI2cState.busStatus = 'STOP';
          if (newPinStates['A4']) newPinStates['A4'].value = 1; // SDA goes HIGH
          if (newPinStates['A5']) newPinStates['A5'].value = 1; // SCL HIGH
          newI2cState.log.unshift({
            id: `i2c-${Date.now()}-${Math.random()}`,
            type: 'STOP',
            details: 'I2C STOP feltétel kiküldve (Busz felszabadítva)',
            timestampNs: currentTimestampNs,
          });
        } else {
          newI2cState.busStatus = 'START';
          newI2cState.log.unshift({
            id: `i2c-${Date.now()}-${Math.random()}`,
            type: 'START',
            details: 'I2C REPEATED START feltétel generálva',
            timestampNs: currentTimestampNs,
          });
        }
      }
      break;
    }

    case 'protocol_i2c_write_byte': {
      const hex = params.hexValue || '0x3C';
      const isAddr = params.isAddress === 'ADDR_W' || params.isAddress === 'ADDR_R';
      const byteVal = parseInt(hex, 16) || 0;
      if (newI2cState) {
        newI2cState.busStatus = 'DATA_TX';
        newI2cState.lastData = byteVal;
        newI2cState.log.unshift({
          id: `i2c-${Date.now()}-${Math.random()}`,
          type: 'WRITE',
          dataHex: hex,
          ack: true,
          details: isAddr ? `Eszköz címzés (${hex}) -> ACK Fogadva ✓` : `Adatbájt küldve (${hex}) -> ACK Fogadva ✓`,
          timestampNs: currentTimestampNs,
        });
      }
      // Toggle SCL and SDA to reflect bus traffic
      if (newPinStates['A5']) newPinStates['A5'].value = newPinStates['A5'].value === 1 ? 0 : 1;
      if (newPinStates['A4']) newPinStates['A4'].value = (byteVal & 0x01) ? 1 : 0;
      break;
    }

    // ==========================================
    // SPI PROTOCOL EXECUTION
    // ==========================================
    case 'protocol_spi_init': {
      if (newSpiState) {
        newSpiState.initialized = true;
        newSpiState.clockDivider = params.clockDiv || 'DIV_4 (4 MHz)';
        newSpiState.log.unshift({
          id: `spi-${Date.now()}-${Math.random()}`,
          txHex: '--',
          rxHex: '--',
          speed: params.clockDiv || '4 MHz',
          mode: 'Master Mód (SPE | MSTR)',
          timestampNs: currentTimestampNs,
        });
      }
      if (newPinStates['10']) newPinStates['10'].mode = 'OUTPUT';
      if (newPinStates['11']) newPinStates['11'].mode = 'OUTPUT';
      if (newPinStates['13']) newPinStates['13'].mode = 'OUTPUT';
      if (newPinStates['12']) newPinStates['12'].mode = 'INPUT';
      break;
    }

    case 'protocol_spi_slave_select': {
      const pin = (params.pin || '10') as ArduinoPin;
      const isLow = params.state === 'LOW';
      if (newPinStates[pin]) {
        newPinStates[pin].value = isLow ? 0 : 1;
      }
      if (newSpiState) {
        newSpiState.ssActive = isLow;
      }
      break;
    }

    case 'protocol_spi_transfer': {
      const txHex = params.dataHex || '0xAA';
      const destReg = params.destReg || 'r16';
      const txVal = parseInt(txHex, 16) || 0;
      // In simulation, mirror or invert byte for realistic full-duplex response
      const rxVal = (txVal ^ 0xFF) & 0xff;
      const rxHex = `0x${rxVal.toString(16).toUpperCase().padStart(2, '0')}`;
      newRegisters[destReg] = rxVal;

      if (newSpiState) {
        newSpiState.lastTx = txVal;
        newSpiState.lastRx = rxVal;
        newSpiState.log.unshift({
          id: `spi-${Date.now()}-${Math.random()}`,
          txHex,
          rxHex,
          speed: newSpiState.clockDivider,
          mode: 'Full Duplex',
          timestampNs: currentTimestampNs,
        });
      }
      // Toggle SCK (D13) and MOSI (D11)
      if (newPinStates['13']) newPinStates['13'].value = 1;
      if (newPinStates['11']) newPinStates['11'].value = (txVal & 0x80) ? 1 : 0;
      if (newPinStates['12']) newPinStates['12'].value = (rxVal & 0x80) ? 1 : 0;
      break;
    }

    // ==========================================
    // UART (USART0) EXECUTION
    // ==========================================
    case 'protocol_uart_init': {
      const baud = parseInt(params.baudRate || '9600', 10);
      if (newUartState) {
        newUartState.initialized = true;
        newUartState.baudRate = baud;
        newUartState.log.unshift({
          id: `uart-${Date.now()}-${Math.random()}`,
          direction: 'TX',
          text: `[USART0 INIT: ${baud} Baud 8N1 OK]`,
          hex: '0x00',
          timestampNs: currentTimestampNs,
          isNewline: true,
        });
      }
      if (newPinStates['0']) newPinStates['0'].mode = 'INPUT'; // RX
      if (newPinStates['1']) {
        newPinStates['1'].mode = 'OUTPUT'; // TX
        newPinStates['1'].value = 1; // UART Idle is HIGH (Mark state)
      }
      break;
    }

    case 'protocol_uart_print_str': {
      const text = String(params.text || 'HELLO');
      const hasNl = String(params.addNewline) === 'true';
      const fullText = hasNl ? `${text}\r\n` : text;

      if (newUartState) {
        newUartState.terminalText = (newUartState.terminalText || '') + fullText;
        newUartState.txLed = true;
        const hexStr = Array.from(fullText).map((c: string) => c.charCodeAt(0).toString(16).toUpperCase().padStart(2, '0')).join(' ');
        newUartState.log.unshift({
          id: `uart-${Date.now()}-${Math.random()}`,
          direction: 'TX',
          text: fullText,
          hex: hexStr,
          timestampNs: currentTimestampNs,
          isNewline: hasNl,
        });
      }
      // Toggle TX pin (D1) to simulate serial waveform activity
      if (newPinStates['1']) {
        newPinStates['1'].value = newPinStates['1'].value === 1 ? 0 : 1;
      }
      break;
    }

    case 'protocol_uart_write_char': {
      const isChar = params.charSource === 'CHAR';
      const char = isChar ? (params.asciiChar || 'A') : String.fromCharCode(newRegisters[params.sourceReg || 'r24'] || 65);
      const byteVal = char.charCodeAt(0) & 0xFF;
      const hexStr = `0x${byteVal.toString(16).toUpperCase().padStart(2, '0')}`;

      if (newUartState) {
        newUartState.terminalText = (newUartState.terminalText || '') + char;
        newUartState.txLed = true;
        newUartState.log.unshift({
          id: `uart-${Date.now()}-${Math.random()}`,
          direction: 'TX',
          text: char,
          hex: hexStr,
          timestampNs: currentTimestampNs,
          isNewline: char === '\n',
        });
      }
      if (newPinStates['1']) {
        newPinStates['1'].value = (byteVal & 0x01) ? 1 : 0;
      }
      break;
    }

    case 'protocol_uart_read_byte': {
      const dest = params.destReg || 'r24';
      if (newUartState && newUartState.rxBuffer && newUartState.rxBuffer.length > 0) {
        const receivedChar = newUartState.rxBuffer.charAt(0);
        newUartState.rxBuffer = newUartState.rxBuffer.slice(1);
        const byteVal = receivedChar.charCodeAt(0) & 0xFF;
        newRegisters[dest] = byteVal;
        newUartState.rxLed = true;
        newUartState.log.unshift({
          id: `uart-${Date.now()}-${Math.random()}`,
          direction: 'RX',
          text: receivedChar,
          hex: `0x${byteVal.toString(16).toUpperCase().padStart(2, '0')}`,
          timestampNs: currentTimestampNs,
        });
      } else {
        newRegisters[dest] = 0; // No data in non-blocking mode
      }
      break;
    }

    // ==========================================
    // ANALOG & ADC / PWM EXECUTION
    // ==========================================
    case 'analog_adc_init': {
      if (newAdcState) {
        newAdcState.initialized = true;
        newAdcState.prescaler = Number(params.prescaler) || 128;
      }
      break;
    }

    case 'analog_adc_read': {
      const ch = (params.channel || 'A0') as string;
      const lowReg = params.destRegLow || 'r24';
      const highReg = params.destRegHigh || 'r25';
      const rawVal = prevState.analogInputs[ch] ?? 512; // 0 - 1023

      newRegisters[lowReg] = rawVal & 0xFF;
      newRegisters[highReg] = (rawVal >> 8) & 0x03;

      if (newAdcState) {
        newAdcState.activeChannel = ch;
        newAdcState.lastResult = rawVal;
      }
      break;
    }

    case 'analog_pwm_init': {
      const timer = params.timer || 'TIMER0';
      if (timer === 'TIMER0') {
        if (newPinStates['6']) newPinStates['6'].mode = 'OUTPUT';
        if (newPinStates['5']) newPinStates['5'].mode = 'OUTPUT';
      } else if (timer === 'TIMER1') {
        if (newPinStates['9']) newPinStates['9'].mode = 'OUTPUT';
        if (newPinStates['10']) newPinStates['10'].mode = 'OUTPUT';
      }
      break;
    }

    case 'analog_pwm_write': {
      const pin = (params.pin || '6') as ArduinoPin;
      const duty = Math.min(255, Math.max(0, Number(params.duty) || 0));
      if (newPinStates[pin]) {
        newPinStates[pin] = {
          ...newPinStates[pin],
          mode: 'OUTPUT',
          pwmValue: duty,
          value: duty > 0 ? 1 : 0,
        };
      }
      break;
    }

    case 'protocol_square_wave': {
      const pin = (params.pin || '13') as ArduinoPin;
      if (newPinStates[pin]) {
        newPinStates[pin] = {
          ...newPinStates[pin],
          value: newPinStates[pin].value === 1 ? 0 : 1,
        };
      }
      break;
    }

    case 'protocol_ws2812_rgb': {
      const r = Math.min(255, Math.max(0, Number(params.red) || 0));
      const g = Math.min(255, Math.max(0, Number(params.green) || 0));
      const b = Math.min(255, Math.max(0, Number(params.blue) || 0));
      const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
      newNeoPixels = [hex, ...newNeoPixels.slice(0, 7)];
      break;
    }

    case 'interrupt_enable_disable': {
      const isSei = params.action === 'SEI';
      newSreg.I = isSei;
      newInterruptState.globalInterruptsEnabled = isSei;
      break;
    }

    case 'interrupt_timer1_ctc': {
      const freq = Number(params.frequencyHz) || 1000;
      const prescaler = String(params.prescaler || '64');
      newInterruptState.vectorConfigs['TIMER1_COMPA'] = {
        id: 'TIMER1_COMPA',
        enabled: true,
        frequencyHz: freq,
        prescaler: prescaler,
        customIsrAction: 'toggle_led',
        customTargetPin: '13',
        description: `16-bites Timer1 CTC @ ${freq} Hz`,
      };
      break;
    }

    case 'interrupt_external_pin': {
      const vec = (params.vector || 'INT0') as AvrInterruptVectorId;
      const mode = (params.triggerMode || 'FALLING') as any;
      const action = (params.action || 'toggle_led') as any;
      const targetPin = (params.targetPin || '13') as ArduinoPin;
      const targetVar = (params.targetVar || 'button_press_count') as string;

      newInterruptState.vectorConfigs[vec] = {
        id: vec,
        enabled: true,
        triggerMode: mode,
        pin: vec === 'INT0' ? '2' : '3',
        customIsrAction: action,
        customTargetPin: targetPin,
        customTargetVar: targetVar,
        description: `${vec} (${vec === 'INT0' ? 'D2' : 'D3'}) hardveres élérzékelés (${mode})`,
      };
      break;
    }

    case 'interrupt_pcint_port': {
      const port = (params.port || 'PORTD') as string;
      const pinBit = params.pinBit === 'ALL' ? 0xff : (1 << Number(params.pinBit || 2));
      const targetPin = (params.targetPin || '13') as ArduinoPin;

      newInterruptState.vectorConfigs['PCINT2'] = {
        id: 'PCINT2',
        enabled: true,
        pcintMask: pinBit,
        customIsrAction: 'toggle_led',
        customTargetPin: targetPin,
        description: `Port D Lábváltozás (PCINT2) megszakítás`,
      };
      break;
    }

    case 'interrupt_visual_designer': {
      newSreg.I = true;
      newInterruptState.globalInterruptsEnabled = true;
      break;
    }

    // ==========================================
    // HARDWARE MODULE EXECUTION HANDLERS
    // ==========================================
    case 'module_lcd_print': {
      const text = String(params.text || 'Hello');
      const row = params.row === '1' ? 'line1' : 'line0';
      const clearFirst = params.clearFirst === true;

      // Update attached LCD module
      const lcdMod = newModules.find((m) => m.type === 'lcd_1602');
      if (lcdMod) {
        if (clearFirst) {
          lcdMod.state.line0 = '                ';
          lcdMod.state.line1 = '                ';
        }
        // Pad/format to 16 chars
        const padded = text.padEnd(16, ' ').slice(0, 16);
        lcdMod.state[row] = padded;
      }

      // Also log I2C transaction
      if (newI2cState) {
        newI2cState.busStatus = 'STOP';
        newI2cState.log.unshift({
          id: `i2c-lcd-${Date.now()}-${Math.random()}`,
          type: 'WRITE',
          addressHex: '0x27',
          dataHex: `0x${row === 'line1' ? 'C0' : '80'} ("${text.slice(0, 8)}")`,
          ack: true,
          details: `HD44780 LCD [Row ${params.row}]: "${text}"`,
          timestampNs: currentTimestampNs,
        });
      }
      break;
    }

    case 'module_rtc_read_time': {
      const rtcMod = newModules.find((m) => m.type === 'rtc_ds1307');
      const now = new Date();
      const hours = rtcMod?.state.hours ?? now.getHours();
      const mins = rtcMod?.state.minutes ?? now.getMinutes();
      const secs = rtcMod?.state.seconds ?? now.getSeconds();

      const hReg = params.destHoursReg || 'r20';
      const mReg = params.destMinsReg || 'r21';
      const sReg = params.destSecsReg || 'r22';

      newRegisters[hReg] = hours;
      newRegisters[mReg] = mins;
      newRegisters[sReg] = secs;

      if (newI2cState) {
        newI2cState.log.unshift({
          id: `i2c-rtc-${Date.now()}-${Math.random()}`,
          type: 'READ',
          addressHex: '0x68',
          dataHex: `${hours.toString(16).padStart(2, '0')}:${mins.toString(16).padStart(2, '0')}:${secs.toString(16).padStart(2, '0')}`,
          ack: true,
          details: `DS1307/3231 RTC Time -> ${hours}:${mins}:${secs}`,
          timestampNs: currentTimestampNs,
        });
      }
      break;
    }

    case 'module_shift_74hc595_write': {
      const val = Number(params.byteValue) || 0;
      const shiftMod = newModules.find((m) => m.type === 'shift_74hc595');
      if (shiftMod) {
        shiftMod.state.outputByte = val & 0xFF;
        shiftMod.state.shiftHistory = [val & 0xFF, ...(shiftMod.state.shiftHistory || []).slice(0, 7)];
      }

      const pData = (params.pinData || '11') as ArduinoPin;
      const pClock = (params.pinClock || '12') as ArduinoPin;
      const pLatch = (params.pinLatch || '8') as ArduinoPin;

      if (newPinStates[pData]) newPinStates[pData].mode = 'OUTPUT';
      if (newPinStates[pClock]) newPinStates[pClock].mode = 'OUTPUT';
      if (newPinStates[pLatch]) {
        newPinStates[pLatch].mode = 'OUTPUT';
        newPinStates[pLatch].value = 1; // Pulsed latch
      }
      break;
    }

    case 'module_sd_write_log': {
      const fileName = String(params.fileName || 'LOGGER.TXT');
      const text = String(params.logText || 'DATA OK');
      const cs = (params.pinCS || '4') as ArduinoPin;

      const sdMod = newModules.find((m) => m.type === 'sd_card');
      if (sdMod) {
        let file = sdMod.state.files?.find((f: any) => f.name === fileName);
        if (!file) {
          file = { name: fileName, size: 0, content: '' };
          sdMod.state.files = [...(sdMod.state.files || []), file];
        }
        file.content += `[${(currentTimestampNs / 1000000).toFixed(0)}ms] ${text}\r\n`;
        file.size = file.content.length;
        sdMod.state.selectedFile = fileName;
        sdMod.state.lastCommand = 'CMD24 (WRITE_BLOCK)';
      }

      if (newPinStates[cs]) {
        newPinStates[cs].mode = 'OUTPUT';
        newPinStates[cs].value = 1; // Deselected after write
      }

      if (newSpiState) {
        newSpiState.log.unshift({
          id: `spi-sd-${Date.now()}-${Math.random()}`,
          txHex: '0x58 (CMD24)',
          rxHex: '0x00 (R1_OK)',
          speed: '4 MHz',
          mode: 'SPI_MODE0',
          timestampNs: currentTimestampNs,
        });
      }
      break;
    }

    case 'module_nrf24_tx_packet': {
      const ch = Number(params.channel) || 76;
      const payload = String(params.payloadText || 'PING');

      const nrfMod = newModules.find((m) => m.type === 'nrf24l01');
      if (nrfMod) {
        nrfMod.state.channel = ch;
        nrfMod.state.txPayload = payload;
        nrfMod.state.txSuccessCount = (nrfMod.state.txSuccessCount || 0) + 1;
      }
      break;
    }

    case 'module_rotary_read_state': {
      const reg = params.destPositionReg || 'r24';
      const rotMod = newModules.find((m) => m.type === 'rotary_encoder');
      if (rotMod) {
        newRegisters[reg] = (rotMod.state.position || 0) & 0xFF;
      }
      break;
    }

    case 'module_bt_init': {
      const baud = parseInt(params.baudRate || '9600', 10);
      const devName = params.deviceName || 'BT05-ARDUINO';
      const pinCode = params.pinCode || '1234';
      const role = params.role || 'SLAVE';

      const btMod = newModules.find((m) => m.type === 'bluetooth_spp');
      if (btMod) {
        btMod.state.baudRate = baud;
        btMod.state.deviceName = devName;
        btMod.state.pinCode = pinCode;
        btMod.state.role = role;
        btMod.state.connected = true;
      }

      if (newUartState) {
        newUartState.initialized = true;
        newUartState.baudRate = baud;
        newUartState.log.unshift({
          id: `bt-init-${Date.now()}`,
          direction: 'TX',
          text: `[BT INIT] ${devName} @ ${baud} Baud`,
          hex: '0x00',
          timestampNs: currentTimestampNs,
        });
      }
      break;
    }

    case 'module_bt_send_packet': {
      const text = params.messageText || 'BT_OK';
      const isText = params.sendType === 'TEXT';
      const reg = params.srcReg || 'r24';
      const valStr = isText ? text : `0x${(newRegisters[reg] ?? 0).toString(16).toUpperCase()}`;

      const btMod = newModules.find((m) => m.type === 'bluetooth_spp');
      if (btMod) {
        btMod.state.txHistory = [valStr, ...(btMod.state.txHistory || []).slice(0, 9)];
        btMod.state.lastReceivedCommand = valStr;
      }

      if (newUartState) {
        newUartState.txLed = true;
        newUartState.terminalText += `${valStr}\r\n`;
        newUartState.log.unshift({
          id: `bt-tx-${Date.now()}`,
          direction: 'TX',
          text: valStr,
          hex: isText ? '0x20' : `0x${(newRegisters[reg] ?? 0).toString(16).toUpperCase()}`,
          timestampNs: currentTimestampNs,
        });
      }
      break;
    }

    case 'module_bt_receive_command': {
      const reg = params.destReg || 'r24';
      const pin = (params.controlPin || '13') as ArduinoPin;
      const cmdChar = '1'; // Simulate receiving '1' from paired mobile phone
      newRegisters[reg] = cmdChar.charCodeAt(0);

      if (params.autoToggle && newPinStates[pin]) {
        newPinStates[pin].mode = 'OUTPUT';
        newPinStates[pin].value = 1; // Turn ON
      }

      const btMod = newModules.find((m) => m.type === 'bluetooth_spp');
      if (btMod) {
        btMod.state.rxHistory = [cmdChar, ...(btMod.state.rxHistory || []).slice(0, 9)];
        btMod.state.lastReceivedCommand = `CMD '${cmdChar}' -> D${pin} HIGH`;
      }

      if (newUartState) {
        newUartState.rxLed = true;
        newUartState.log.unshift({
          id: `bt-rx-${Date.now()}`,
          direction: 'RX',
          text: cmdChar,
          hex: `0x${cmdChar.charCodeAt(0).toString(16).toUpperCase()}`,
          timestampNs: currentTimestampNs,
        });
      }
      break;
    }

    case 'module_bt_at_command': {
      const atCmd = params.atCommand || 'AT';
      const btMod = newModules.find((m) => m.type === 'bluetooth_spp');
      if (btMod) {
        btMod.state.atMode = true;
        btMod.state.lastReceivedCommand = `AT Parancs: ${atCmd} -> OK`;
      }

      if (newUartState) {
        newUartState.log.unshift({
          id: `bt-at-${Date.now()}`,
          direction: 'TX',
          text: `${atCmd}\\r\\n`,
          hex: '0x0D',
          timestampNs: currentTimestampNs,
        });
      }
      break;
    }

    // ==========================================
    // 24Cxxx I2C KÜLSŐ EEPROM MEMÓRIA
    // ==========================================
    case 'module_24cxxx_write_byte': {
      const chip = params.chipModel || '24C256';
      const i2cAddr = params.i2cAddress || '0x50';
      const addrStr = String(params.memAddress ?? '0x0010');
      const rawAddr = parseInt(addrStr, addrStr.startsWith('0x') ? 16 : 10) || 0;

      // Parse data byte
      let byteVal = 0;
      const dataParam = params.dataByte ?? '0x42';
      if (typeof dataParam === 'string' && dataParam.startsWith("'") && dataParam.length >= 3) {
        byteVal = dataParam.charCodeAt(1) & 0xff;
      } else if (typeof dataParam === 'string' && (dataParam.startsWith('r') || dataParam.startsWith('R'))) {
        byteVal = (newRegisters[dataParam.toLowerCase()] ?? 0) & 0xff;
      } else {
        const strVal = String(dataParam);
        byteVal = (parseInt(strVal, strVal.startsWith('0x') ? 16 : 10) || 0) & 0xff;
      }

      const eepromMod = newModules.find((m) => m.type === 'eeprom_24cxxx');
      let writeSuccess = false;

      if (eepromMod) {
        const capacity = eepromMod.state.capacityBytes || 32768;
        if (!eepromMod.state.memory || eepromMod.state.memory.length < capacity) {
          eepromMod.state.memory = new Array(capacity).fill(0xff);
        }

        if (eepromMod.state.wpPinActive) {
          // Write protected
          writeSuccess = false;
          eepromMod.state.lastOperation = 'WRITE_BLOCKED_WP';
          eepromMod.state.lastOpSuccess = false;
        } else if (rawAddr >= capacity) {
          // Out of bounds
          writeSuccess = false;
          eepromMod.state.lastOperation = 'OUT_OF_BOUNDS';
          eepromMod.state.lastOpSuccess = false;
        } else {
          // Write allowed
          eepromMod.state.memory[rawAddr] = byteVal;
          writeSuccess = true;
          eepromMod.state.lastOperation = 'WRITE_BYTE';
          eepromMod.state.lastOpAddress = rawAddr;
          eepromMod.state.lastOpValue = byteVal;
          eepromMod.state.lastOpSuccess = true;
          eepromMod.state.writeCyclesCount = (eepromMod.state.writeCyclesCount || 0) + 1;
        }
      }

      if (newI2cState) {
        newI2cState.busStatus = 'STOP';
        newI2cState.log.unshift({
          id: `i2c-24c-wr-${Date.now()}-${Math.random()}`,
          type: 'WRITE',
          addressHex: i2cAddr,
          deviceAddressHex: i2cAddr,
          dataHex: `Addr: 0x${rawAddr.toString(16).padStart(4, '0').toUpperCase()} Data: 0x${byteVal.toString(16).padStart(2, '0').toUpperCase()}`,
          ack: writeSuccess,
          details: writeSuccess
            ? `24Cxxx Write: [0x${rawAddr.toString(16).padStart(4, '0')}] = 0x${byteVal.toString(16).padStart(2, '0')} (${byteVal})`
            : `24Cxxx Write FAILED: ${eepromMod?.state.wpPinActive ? 'WP Írásvédett' : 'Cím tartományon kívül'}`,
          timestampNs: currentTimestampNs,
        });
      }
      break;
    }

    case 'module_24cxxx_read_byte': {
      const chip = params.chipModel || '24C256';
      const i2cAddr = params.i2cAddress || '0x50';
      const addrStr = String(params.memAddress ?? '0x0010');
      const rawAddr = parseInt(addrStr, addrStr.startsWith('0x') ? 16 : 10) || 0;
      const reg = params.destReg || 'r24';

      const eepromMod = newModules.find((m) => m.type === 'eeprom_24cxxx');
      let readVal = 0xff;

      if (eepromMod && eepromMod.state.memory) {
        const capacity = eepromMod.state.capacityBytes || 32768;
        if (rawAddr < capacity) {
          readVal = eepromMod.state.memory[rawAddr] ?? 0xff;
          eepromMod.state.lastOperation = 'READ_BYTE';
          eepromMod.state.lastOpAddress = rawAddr;
          eepromMod.state.lastOpValue = readVal;
          eepromMod.state.lastOpSuccess = true;
          eepromMod.state.readCyclesCount = (eepromMod.state.readCyclesCount || 0) + 1;
        }
      }

      newRegisters[reg] = readVal & 0xff;

      if (newI2cState) {
        newI2cState.busStatus = 'STOP';
        newI2cState.log.unshift({
          id: `i2c-24c-rd-${Date.now()}-${Math.random()}`,
          type: 'READ',
          addressHex: i2cAddr,
          deviceAddressHex: i2cAddr,
          dataHex: `0x${readVal.toString(16).padStart(2, '0').toUpperCase()} ('${readVal >= 32 && readVal <= 126 ? String.fromCharCode(readVal) : '.'}')`,
          ack: true,
          details: `24Cxxx Read: [0x${rawAddr.toString(16).padStart(4, '0')}] -> 0x${readVal.toString(16).padStart(2, '0')} -> ${reg}`,
          timestampNs: currentTimestampNs,
        });
      }
      break;
    }

    case 'module_24cxxx_write_string': {
      const i2cAddr = params.i2cAddress || '0x50';
      const addrStr = String(params.startAddress ?? '0x0020');
      const rawAddr = parseInt(addrStr, addrStr.startsWith('0x') ? 16 : 10) || 0;
      const text = String(params.text || 'DATA');

      const eepromMod = newModules.find((m) => m.type === 'eeprom_24cxxx');
      let writeSuccess = false;

      if (eepromMod) {
        const capacity = eepromMod.state.capacityBytes || 32768;
        if (!eepromMod.state.memory || eepromMod.state.memory.length < capacity) {
          eepromMod.state.memory = new Array(capacity).fill(0xff);
        }

        if (!eepromMod.state.wpPinActive) {
          for (let i = 0; i < text.length; i++) {
            const targetIdx = rawAddr + i;
            if (targetIdx < capacity) {
              eepromMod.state.memory[targetIdx] = text.charCodeAt(i) & 0xff;
            }
          }
          writeSuccess = true;
          eepromMod.state.lastOperation = 'WRITE_STRING';
          eepromMod.state.lastOpAddress = rawAddr;
          eepromMod.state.lastOpSuccess = true;
          eepromMod.state.writeCyclesCount = (eepromMod.state.writeCyclesCount || 0) + text.length;
        } else {
          eepromMod.state.lastOperation = 'WRITE_BLOCKED_WP';
          eepromMod.state.lastOpSuccess = false;
        }
      }

      if (newI2cState) {
        newI2cState.busStatus = 'STOP';
        newI2cState.log.unshift({
          id: `i2c-24c-str-${Date.now()}-${Math.random()}`,
          type: 'WRITE',
          addressHex: i2cAddr,
          deviceAddressHex: i2cAddr,
          dataHex: `"${text}" (${text.length} B)`,
          ack: writeSuccess,
          details: `24Cxxx Page Write: [0x${rawAddr.toString(16).padStart(4, '0')}] = "${text}"`,
          timestampNs: currentTimestampNs,
        });
      }
      break;
    }

    // ==========================================
    // 25LCxxx SPI EEPROM SIMULATION HANDLERS
    // ==========================================
    case 'module_25lcxxx_write_byte': {
      const addrStr = String(params.address ?? '0x0010');
      const rawAddr = parseInt(addrStr, addrStr.startsWith('0x') ? 16 : 10) || 0;
      const dataStr = String(params.dataByte ?? '0xA5');
      const val = parseInt(dataStr, dataStr.startsWith('0x') ? 16 : 10) || 0;

      const spiEepromMod = newModules.find((m) => m.type === 'eeprom_25lcxxx');
      let writeSuccess = false;

      if (spiEepromMod) {
        const capacity = spiEepromMod.state.capacityBytes || 32768;
        if (!spiEepromMod.state.memory || spiEepromMod.state.memory.length < capacity) {
          spiEepromMod.state.memory = new Array(capacity).fill(0xff);
        }

        if (!spiEepromMod.state.wpPinActive) {
          const safeAddr = Math.min(Math.max(0, rawAddr), capacity - 1);
          spiEepromMod.state.memory[safeAddr] = val & 0xff;
          spiEepromMod.state.lastCommand = 'WRITE';
          spiEepromMod.state.lastOpAddress = safeAddr;
          spiEepromMod.state.lastOpValue = val & 0xff;
          spiEepromMod.state.lastOpSuccess = true;
          spiEepromMod.state.writeCyclesCount = (spiEepromMod.state.writeCyclesCount || 0) + 1;
          writeSuccess = true;
        } else {
          spiEepromMod.state.lastCommand = 'WRITE_LOCKED_WP';
          spiEepromMod.state.lastOpSuccess = false;
        }
      }

      if (newSpiState) {
        newSpiState.lastByteReceived = val & 0xff;
        newSpiState.log.unshift({
          id: `spi-25lc-wr-${Date.now()}-${Math.random()}`,
          command: 'WRITE (0x02)',
          misoHex: '0x00',
          mosiHex: `0x${(val & 0xff).toString(16).padStart(2, '0').toUpperCase()}`,
          details: `25LCxxx SPI EEPROM Write: [0x${rawAddr.toString(16).padStart(4, '0')}] = 0x${(val & 0xff).toString(16).padStart(2, '0')}`,
          timestampNs: currentTimestampNs,
        });
      }
      break;
    }

    case 'module_25lcxxx_read_byte': {
      const addrStr = String(params.address ?? '0x0010');
      const rawAddr = parseInt(addrStr, addrStr.startsWith('0x') ? 16 : 10) || 0;
      const reg = params.destReg || 'r24';

      const spiEepromMod = newModules.find((m) => m.type === 'eeprom_25lcxxx');
      let readVal = 0xff;

      if (spiEepromMod) {
        const capacity = spiEepromMod.state.capacityBytes || 32768;
        if (!spiEepromMod.state.memory || spiEepromMod.state.memory.length < capacity) {
          spiEepromMod.state.memory = new Array(capacity).fill(0xff);
        }
        const safeAddr = Math.min(Math.max(0, rawAddr), capacity - 1);
        readVal = spiEepromMod.state.memory[safeAddr] ?? 0xff;
        spiEepromMod.state.lastCommand = 'READ';
        spiEepromMod.state.lastOpAddress = safeAddr;
        spiEepromMod.state.lastOpValue = readVal;
        spiEepromMod.state.readCyclesCount = (spiEepromMod.state.readCyclesCount || 0) + 1;
      }

      newRegisters[reg] = readVal & 0xff;

      if (newSpiState) {
        newSpiState.lastByteReceived = readVal & 0xff;
        newSpiState.log.unshift({
          id: `spi-25lc-rd-${Date.now()}-${Math.random()}`,
          command: 'READ (0x03)',
          misoHex: `0x${(readVal & 0xff).toString(16).padStart(2, '0').toUpperCase()}`,
          mosiHex: '0x00',
          details: `25LCxxx SPI EEPROM Read: [0x${rawAddr.toString(16).padStart(4, '0')}] -> 0x${(readVal & 0xff).toString(16).padStart(2, '0')} -> ${reg}`,
          timestampNs: currentTimestampNs,
        });
      }
      break;
    }

    // ==========================================
    // W25Qxx SPI NOR FLASH SIMULATION HANDLERS
    // ==========================================
    case 'module_w25qxx_read_jedec': {
      const mReg = params.destRegManuf || 'r24';
      const cReg = params.destRegCap || 'r25';
      const flashMod = newModules.find((m) => m.type === 'flash_w25qxx');

      const manufId = flashMod?.state.jedecManufacturerId ?? 0xEF; // Winbond
      const capId = flashMod?.state.jedecCapacityId ?? 0x16; // W25Q32 (4MB)

      newRegisters[mReg] = manufId & 0xff;
      newRegisters[cReg] = capId & 0xff;

      if (flashMod) {
        flashMod.state.lastCommand = 'READ_JEDEC_ID (0x9F)';
        flashMod.state.lastOpSuccess = true;
      }

      if (newSpiState) {
        newSpiState.log.unshift({
          id: `spi-w25q-jedec-${Date.now()}-${Math.random()}`,
          command: 'JEDEC ID (0x9F)',
          misoHex: `0xEF 0x40 0x${capId.toString(16)}`,
          mosiHex: '0x9F 0x00 0x00 0x00',
          details: `W25Qxx SPI Flash: Winbond (0xEF), Type 0x40, Capacity ID 0x${capId.toString(16)}`,
          timestampNs: currentTimestampNs,
        });
      }
      break;
    }

    case 'module_w25qxx_sector_erase': {
      const sAddrStr = String(params.sectorAddress ?? '0x000000');
      const addr = parseInt(sAddrStr, sAddrStr.startsWith('0x') ? 16 : 10) || 0;
      const flashMod = newModules.find((m) => m.type === 'flash_w25qxx');

      if (flashMod) {
        const sectorBase = addr & ~0xfff; // 4096-aligned sector
        const memLen = flashMod.state.memory?.length || 65536;
        for (let i = 0; i < 4096; i++) {
          if (sectorBase + i < memLen) {
            flashMod.state.memory[sectorBase + i] = 0xff;
          }
        }
        flashMod.state.lastCommand = 'SECTOR_ERASE_4KB';
        flashMod.state.lastOpAddress = sectorBase;
        flashMod.state.erasedSectorsCount = (flashMod.state.erasedSectorsCount || 0) + 1;
      }

      if (newSpiState) {
        newSpiState.log.unshift({
          id: `spi-w25q-erase-${Date.now()}-${Math.random()}`,
          command: 'SECTOR ERASE (0x20)',
          misoHex: '0x00',
          mosiHex: `0x20 0x${((addr >> 16) & 0xff).toString(16)} 0x${((addr >> 8) & 0xff).toString(16)} 0x${(addr & 0xff).toString(16)}`,
          details: `W25Qxx Erased 4KB Sector @ 0x${addr.toString(16).padStart(6, '0')}`,
          timestampNs: currentTimestampNs,
        });
      }
      break;
    }

    // ==========================================
    // MCP23017 16-BIT I2C EXPANDER SIMULATION HANDLERS
    // ==========================================
    case 'module_mcp23017_set_mode': {
      const i2cAddr = params.i2cAddress || '0x20';
      const isPortB = params.port === 'PORT_B';
      const maskStr = String(params.directionMask || '0x00');
      const mask = parseInt(maskStr, maskStr.startsWith('0x') ? 16 : 10) || 0;

      const mcpMod = newModules.find((m) => m.type === 'expander_mcp23017');
      if (mcpMod) {
        if (isPortB) mcpMod.state.iodirB = mask & 0xff;
        else mcpMod.state.iodirA = mask & 0xff;
        mcpMod.state.lastOperation = isPortB ? 'SET_IODIRB' : 'SET_IODIRA';
        mcpMod.state.lastDataHex = `0x${(mask & 0xff).toString(16).padStart(2, '0').toUpperCase()}`;
      }

      if (newI2cState) {
        newI2cState.log.unshift({
          id: `i2c-mcp-mode-${Date.now()}-${Math.random()}`,
          type: 'WRITE',
          addressHex: i2cAddr,
          dataHex: `Reg ${isPortB ? '0x01' : '0x00'}: 0x${(mask & 0xff).toString(16).padStart(2, '0')}`,
          ack: true,
          details: `MCP23017 Set Mode ${params.port} (IODIR = 0x${(mask & 0xff).toString(16).padStart(2, '0')})`,
          timestampNs: currentTimestampNs,
        });
      }
      break;
    }

    case 'module_mcp23017_write_port': {
      const i2cAddr = params.i2cAddress || '0x20';
      const isPortB = params.port === 'PORT_B';
      const valStr = String(params.dataValue || '0xA5');
      let val = 0;
      if (valStr.startsWith('0b')) val = parseInt(valStr.slice(2), 2);
      else if (valStr.startsWith('0x')) val = parseInt(valStr, 16);
      else val = parseInt(valStr, 10) || 0;

      const mcpMod = newModules.find((m) => m.type === 'expander_mcp23017');
      if (mcpMod) {
        if (isPortB) {
          mcpMod.state.gpioB = val & 0xff;
          mcpMod.state.olatB = val & 0xff;
        } else {
          mcpMod.state.gpioA = val & 0xff;
          mcpMod.state.olatA = val & 0xff;
        }
        mcpMod.state.lastOperation = isPortB ? 'PORT_B_WRITE' : 'PORT_A_WRITE';
        mcpMod.state.lastDataHex = `0x${(val & 0xff).toString(16).padStart(2, '0').toUpperCase()}`;
      }

      if (newI2cState) {
        newI2cState.log.unshift({
          id: `i2c-mcp-out-${Date.now()}-${Math.random()}`,
          type: 'WRITE',
          addressHex: i2cAddr,
          dataHex: `0x${(val & 0xff).toString(16).padStart(2, '0')}`,
          ack: true,
          details: `MCP23017 ${params.port} Output = 0x${(val & 0xff).toString(16).padStart(2, '0')} (B${(val & 0xff).toString(2).padStart(8, '0')})`,
          timestampNs: currentTimestampNs,
        });
      }
      break;
    }

    // ==========================================
    // PCF8574 8-BIT I2C EXPANDER SIMULATION HANDLERS
    // ==========================================
    case 'module_pcf8574_write_byte': {
      const i2cAddr = params.i2cAddress || '0x20';
      const valStr = String(params.dataValue || '0xCA');
      const val = parseInt(valStr, valStr.startsWith('0x') ? 16 : 10) || 0;

      const pcfMod = newModules.find((m) => m.type === 'expander_pcf8574');
      if (pcfMod) {
        pcfMod.state.portValue = val & 0xff;
        for (let bit = 0; bit < 8; bit++) {
          pcfMod.state.pinValues[bit] = ((val >> bit) & 1) === 1;
        }
        pcfMod.state.lastOperation = 'WRITE_BYTE';
        pcfMod.state.lastDataHex = `0x${(val & 0xff).toString(16).padStart(2, '0').toUpperCase()}`;
        pcfMod.state.writeCount = (pcfMod.state.writeCount || 0) + 1;
      }

      if (newI2cState) {
        newI2cState.log.unshift({
          id: `i2c-pcf-wr-${Date.now()}-${Math.random()}`,
          type: 'WRITE',
          addressHex: i2cAddr,
          dataHex: `0x${(val & 0xff).toString(16).padStart(2, '0')}`,
          ack: true,
          details: `PCF8574 Output = 0x${(val & 0xff).toString(16).padStart(2, '0')} (P0..P7)`,
          timestampNs: currentTimestampNs,
        });
      }
      break;
    }

    // ==========================================
    // 74HC165 PISO SHIFT REGISTER SIMULATION HANDLERS
    // ==========================================
    case 'module_74hc165_read_byte': {
      const reg = params.destReg || 'r24';
      const hc165Mod = newModules.find((m) => m.type === 'shift_74hc165');
      let val = 0x35;

      if (hc165Mod) {
        val = 0;
        const inputs = hc165Mod.state.inputsD || [false, false, false, false, false, false, false, false];
        for (let i = 0; i < 8; i++) {
          if (inputs[i]) val |= (1 << i);
        }
        hc165Mod.state.latchedData = val;
        hc165Mod.state.shiftRegisterVal = val;
        hc165Mod.state.lastReadByteHex = `0x${val.toString(16).padStart(2, '0').toUpperCase()}`;
        hc165Mod.state.readCycles = (hc165Mod.state.readCycles || 0) + 1;
      }

      newRegisters[reg] = val & 0xff;
      break;
    }

    // ==========================================
    // EEPROM & FLASH MEMORY SIMULATION
    // ==========================================
    case 'memory_eeprom_write': {
      const addr = parseInt(params.address, 16) || parseInt(params.address, 10) || 0;
      let val = 0;
      if (params.valueReg && newRegisters[params.valueReg] !== undefined) {
        val = newRegisters[params.valueReg];
      } else {
        val = parseInt(params.value, 16) || parseInt(params.value, 10) || 0;
      }
      const safeAddr = Math.min(Math.max(0, addr), 1023);
      const safeVal = val & 0xFF;
      newEeprom[safeAddr] = safeVal;
      newLastEepromAccess = {
        address: safeAddr,
        type: 'WRITE',
        value: safeVal,
        timestampNs: currentTimestampNs,
      };
      break;
    }

    case 'memory_eeprom_read': {
      const addr = parseInt(params.address, 16) || parseInt(params.address, 10) || 0;
      const destReg = params.destReg || 'r16';
      const safeAddr = Math.min(Math.max(0, addr), 1023);
      const readVal = newEeprom[safeAddr];
      newRegisters[destReg] = readVal;
      newLastEepromAccess = {
        address: safeAddr,
        type: 'READ',
        value: readVal,
        timestampNs: currentTimestampNs,
      };
      break;
    }

    case 'memory_eeprom_update': {
      const addr = parseInt(params.address, 16) || parseInt(params.address, 10) || 0;
      let val = 0;
      if (params.valueReg && newRegisters[params.valueReg] !== undefined) {
        val = newRegisters[params.valueReg];
      } else {
        val = parseInt(params.value, 16) || parseInt(params.value, 10) || 0;
      }
      const safeAddr = Math.min(Math.max(0, addr), 1023);
      const safeVal = val & 0xFF;
      if (newEeprom[safeAddr] !== safeVal) {
        newEeprom[safeAddr] = safeVal;
      }
      newLastEepromAccess = {
        address: safeAddr,
        type: 'UPDATE',
        value: safeVal,
        timestampNs: currentTimestampNs,
      };
      break;
    }

    case 'memory_progmem_read': {
      const addr = parseInt(params.address, 16) || parseInt(params.address, 10) || 0;
      const destReg = params.destReg || 'r0';
      const safeAddr = Math.min(Math.max(0, addr), 32767);
      const readVal = newFlash[safeAddr] || 0;
      newRegisters[destReg] = readVal;
      break;
    }

    // ==========================================
    // DALLAS 1-WIRE & DS18B20 EXECUTION HANDLERS
    // ==========================================
    case 'protocol_onewire_reset': {
      const pin = (params.pin || '2') as ArduinoPin;
      const destReg = params.destStatusReg || 'r24';
      const dsMod = newModules.find((m) => m.type === 'ds18b20_temp');
      const presence = dsMod ? dsMod.enabled !== false : true;

      newRegisters[destReg] = presence ? 0 : 1; // 0 = Presence detected (Pin pulled LOW)
      if (newPinStates[pin]) {
        newPinStates[pin].value = 1; // Released to HIGH via 4.7k pull-up
      }
      if (newOneWireState) {
        newOneWireState.pin = pin;
        newOneWireState.busStatus = 'PRESENCE';
        newOneWireState.presenceDetected = presence;
        newOneWireState.log.unshift({
          id: `1w-rst-${Date.now()}-${Math.random()}`,
          type: 'RESET',
          pin,
          presence,
          details: `1-Wire Reset Impulzus (480µs) -> ${presence ? 'Presence DETEKTÁLVA (Szenzor válaszolt)' : 'Nincs válasz a buszon'}`,
          timestampNs: currentTimestampNs,
        });
      }
      break;
    }

    case 'protocol_onewire_write_byte': {
      const pin = (params.pin || '2') as ArduinoPin;
      const cmdHex = String(params.command || '0xCC');
      const cmdNum = parseInt(cmdHex, 16) || 0xCC;

      let details = `1-Wire Írás: ${cmdHex}`;
      if (cmdHex === '0xCC') details = `0xCC (Skip ROM - Minden eszköz megszólítása)`;
      else if (cmdHex === '0x44') details = `0x44 (Convert T - Hőmérséklet konverzió indítás)`;
      else if (cmdHex === '0xBE') details = `0xBE (Read Scratchpad - 9 bájtos memória kérése)`;
      else if (cmdHex === '0x33') details = `0x33 (Read ROM - 64-bit ID lekérés)`;
      else if (cmdHex === '0x55') details = `0x55 (Match ROM - Eszköz címzés)`;
      else if (cmdHex === '0x4E') details = `0x4E (Write Scratchpad - TH, TL, Config írás)`;
      else if (cmdHex === '0x48') details = `0x48 (Copy Scratchpad - Mentés EEPROM-ba)`;

      const dsMod = newModules.find((m) => m.type === 'ds18b20_temp');
      if (dsMod && cmdHex === '0x44') {
        dsMod.state.conversionInProgress = true;
        dsMod.state.conversionProgressPct = 100;
      }

      if (newOneWireState) {
        newOneWireState.pin = pin;
        newOneWireState.busStatus = 'WRITE';
        newOneWireState.lastByte = cmdNum;
        newOneWireState.log.unshift({
          id: `1w-w-${Date.now()}-${Math.random()}`,
          type: 'WRITE_BYTE',
          pin,
          dataHex: cmdHex,
          details,
          timestampNs: currentTimestampNs,
        });
      }
      break;
    }

    case 'protocol_onewire_read_byte': {
      const pin = (params.pin || '2') as ArduinoPin;
      const destReg = params.destReg || 'r16';
      const dsMod = newModules.find((m) => m.type === 'ds18b20_temp');
      const tempC = dsMod ? (dsMod.state.temperatureC ?? 24.5) : 24.5;
      const raw16 = Math.round(tempC * 16);
      const lsb = raw16 & 0xFF;

      newRegisters[destReg] = lsb;

      if (newOneWireState) {
        newOneWireState.pin = pin;
        newOneWireState.busStatus = 'READ';
        newOneWireState.lastByte = lsb;
        newOneWireState.log.unshift({
          id: `1w-r-${Date.now()}-${Math.random()}`,
          type: 'READ_BYTE',
          pin,
          dataHex: `0x${lsb.toString(16).padStart(2, '0').toUpperCase()}`,
          details: `1-Wire Bájt Olvasás -> ${destReg} = 0x${lsb.toString(16).toUpperCase()} (${lsb})`,
          timestampNs: currentTimestampNs,
        });
      }
      break;
    }

    case 'module_ds18b20_read_temp': {
      const pin = (params.pin || '2') as ArduinoPin;
      const intReg = params.destIntReg || 'r24';
      const fracReg = params.destFracReg || 'r25';

      const dsMod = newModules.find((m) => m.type === 'ds18b20_temp');
      const tempC = dsMod ? (dsMod.state.temperatureC ?? 24.5) : 24.5;
      const intPart = Math.floor(tempC);
      const fracPart = Math.round((tempC - intPart) * 16) & 0x0F;

      newRegisters[intReg] = intPart & 0xFF;
      newRegisters[fracReg] = fracPart;

      if (dsMod) {
        const raw16 = Math.round(tempC * 16);
        const lsb = raw16 & 0xFF;
        const msb = (raw16 >> 8) & 0xFF;
        const th = dsMod.state.thRegister ?? 50;
        const tl = dsMod.state.tlRegister ?? 10;
        const cfg = dsMod.state.configRegister ?? 0x7F;
        dsMod.state.scratchpad = [lsb, msb, th, tl, cfg, 0xFF, 0x0C, 0x10, 0x48];
        dsMod.state.conversionInProgress = false;
        dsMod.state.alarmTriggered = tempC >= th || tempC <= tl;
      }

      if (newOneWireState) {
        newOneWireState.pin = pin;
        newOneWireState.busStatus = 'IDLE';
        newOneWireState.lastTemperatureC = tempC;
        newOneWireState.presenceDetected = true;
        newOneWireState.log.unshift({
          id: `1w-ds18-${Date.now()}-${Math.random()}`,
          type: 'CONVERT_T',
          pin,
          dataHex: `${tempC.toFixed(2)} °C`,
          details: `DS18B20 Mérés [D${pin}]: ${tempC.toFixed(2)} °C (Egész: ${intPart}°C -> ${intReg}, Tört: ${fracPart}/16 -> ${fracReg})`,
          timestampNs: currentTimestampNs,
        });
      }
      break;
    }

    case 'ms_i2c_master_init': {
      const speed = params.speed || '100';
      if (newMasterSlaveState) {
        newMasterSlaveState.role = 'MASTER';
        newMasterSlaveState.i2cRole = 'MASTER';
        newMasterSlaveState.lastMasterCommand = `I2C Master init @ ${speed} kHz`;
      }
      if (newI2cState) {
        newI2cState.initialized = true;
        newI2cState.speedKbps = parseInt(speed, 10) || 100;
        newI2cState.busStatus = 'IDLE';
        newI2cState.log.unshift({
          id: `i2c-init-${Date.now()}`,
          type: 'START',
          deviceAddressHex: '0x00',
          dataHex: `TWBR=${speed === '400' ? '12' : '72'}`,
          details: `I2C Master Mód inicializálva (${speed} kHz SCL)`,
          timestampNs: currentTimestampNs,
        });
      }
      break;
    }

    case 'ms_i2c_master_write_packet': {
      const slaveAddr = params.slaveAddress || '0x08';
      const regAddr = params.registerAddress || '0x00';
      const srcReg = params.srcReg || 'r24';
      const dataVal = newRegisters[srcReg] ?? 0;

      if (newMasterSlaveState) {
        newMasterSlaveState.activeTargetSlave = slaveAddr;
        newMasterSlaveState.totalPacketsExchanged += 1;
        newMasterSlaveState.lastMasterCommand = `START -> [${slaveAddr} W] Reg[${regAddr}] = ${dataVal}`;
        const targetSlave = newMasterSlaveState.i2cSlaves.find((s) => s.addressHex.toLowerCase() === slaveAddr.toLowerCase());
        if (targetSlave) {
          targetSlave.registers[regAddr] = dataVal;
          newMasterSlaveState.lastSlaveResponse = `ACK fogadva (${targetSlave.name})`;
        } else {
          newMasterSlaveState.lastSlaveResponse = 'ACK fogadva (Standard I2C Slave)';
        }
      }

      if (newI2cState) {
        newI2cState.busStatus = 'TRANSMITTING';
        newI2cState.log.unshift({
          id: `i2c-wr-${Date.now()}`,
          type: 'DATA_WRITE',
          deviceAddressHex: slaveAddr,
          dataHex: `0x${dataVal.toString(16).padStart(2, '0').toUpperCase()}`,
          details: `Master -> Slave [${slaveAddr}] Reg ${regAddr}: 0x${dataVal.toString(16).toUpperCase()} (${dataVal}) - ACK OK`,
          timestampNs: currentTimestampNs,
        });
      }
      break;
    }

    case 'ms_i2c_master_read_packet': {
      const slaveAddr = params.slaveAddress || '0x08';
      const regAddr = params.registerAddress || '0x00';
      const destReg = params.destReg || 'r24';

      let readVal = 42;
      if (newMasterSlaveState) {
        newMasterSlaveState.activeTargetSlave = slaveAddr;
        newMasterSlaveState.totalPacketsExchanged += 1;
        newMasterSlaveState.lastMasterCommand = `START -> [${slaveAddr} R] Olvasás Reg[${regAddr}]`;
        const targetSlave = newMasterSlaveState.i2cSlaves.find((s) => s.addressHex.toLowerCase() === slaveAddr.toLowerCase());
        if (targetSlave && targetSlave.registers[regAddr] !== undefined) {
          readVal = targetSlave.registers[regAddr];
          newMasterSlaveState.lastSlaveResponse = `Slave válasz: 0x${readVal.toString(16).toUpperCase()} (${readVal})`;
        } else {
          readVal = 0xAA;
          newMasterSlaveState.lastSlaveResponse = `Slave válasz: 0x${readVal.toString(16).toUpperCase()} (${readVal})`;
        }
      }

      newRegisters[destReg] = readVal & 0xFF;

      if (newI2cState) {
        newI2cState.busStatus = 'RECEIVING';
        newI2cState.log.unshift({
          id: `i2c-rd-${Date.now()}`,
          type: 'DATA_READ',
          deviceAddressHex: slaveAddr,
          dataHex: `0x${readVal.toString(16).padStart(2, '0').toUpperCase()}`,
          details: `Master <- Slave [${slaveAddr}] Reg ${regAddr} Olvasva: 0x${readVal.toString(16).toUpperCase()} (${readVal}) -> ${destReg}`,
          timestampNs: currentTimestampNs,
        });
      }
      break;
    }

    case 'ms_i2c_slave_init': {
      const ownAddr = params.ownAddress || '0x08';
      const ownAddrNum = parseInt(ownAddr, 16) || 0x08;
      if (newMasterSlaveState) {
        newMasterSlaveState.role = 'SLAVE';
        newMasterSlaveState.i2cRole = 'SLAVE';
        newMasterSlaveState.i2cOwnAddress = ownAddrNum;
        newMasterSlaveState.lastSlaveResponse = `Slave figyel I2C címen: ${ownAddr}`;
      }
      if (newI2cState) {
        newI2cState.initialized = true;
        newI2cState.busStatus = 'IDLE';
        newI2cState.log.unshift({
          id: `i2c-slave-init-${Date.now()}`,
          type: 'START',
          deviceAddressHex: ownAddr,
          dataHex: `TWAR=${ownAddr}`,
          details: `I2C Slave Mód beállítva saját címmel: ${ownAddr} (TWAR)`,
          timestampNs: currentTimestampNs,
        });
      }
      break;
    }

    case 'ms_i2c_slave_listen_respond': {
      const rxReg = params.destRxReg || 'r24';
      const txReg = params.srcTxReg || 'r25';
      const txVal = newRegisters[txReg] ?? 0x55;

      newRegisters[rxReg] = 0x01; // simulate receiving command byte 0x01 from master

      if (newMasterSlaveState) {
        newMasterSlaveState.totalPacketsExchanged += 1;
        newMasterSlaveState.lastMasterCommand = `Master hívás saját címre [0x${newMasterSlaveState.i2cOwnAddress.toString(16).padStart(2, '0')}]`;
        newMasterSlaveState.lastSlaveResponse = `TWDR = 0x${txVal.toString(16).toUpperCase()} elküldve Masternek`;
      }
      break;
    }

    case 'ms_spi_master_init': {
      const clkDiv = params.clockDivider || 'DIV_4';
      if (newMasterSlaveState) {
        newMasterSlaveState.spiRole = 'MASTER';
      }
      if (newSpiState) {
        newSpiState.initialized = true;
        newSpiState.clockDivider = `${clkDiv} (SPCR)`;
        newSpiState.log.unshift({
          id: `spi-init-${Date.now()}`,
          ssPin: '10',
          txByteHex: '0x00',
          rxByteHex: '0x00',
          details: `SPI Master Mód inicializálva (${clkDiv})`,
          timestampNs: currentTimestampNs,
        });
      }
      break;
    }

    case 'ms_spi_slave_init': {
      if (newMasterSlaveState) {
        newMasterSlaveState.spiRole = 'SLAVE';
        newMasterSlaveState.lastSlaveResponse = 'SPI Slave Mód aktív (MISO kimenet, SS bemenet)';
      }
      if (newSpiState) {
        newSpiState.initialized = true;
        newSpiState.log.unshift({
          id: `spi-slave-init-${Date.now()}`,
          ssPin: '10',
          txByteHex: '0x00',
          rxByteHex: '0x00',
          details: `SPI Slave Mód aktiválva (D10=SS, D11=MOSI, D12=MISO, D13=SCK)`,
          timestampNs: currentTimestampNs,
        });
      }
      break;
    }

    case 'ms_nrf24_master_init': {
      const ch = Number(params.channel) || 76;
      const addr = params.masterAddress || '0xE8E8F0F0E1';
      if (newMasterSlaveState) {
        newMasterSlaveState.activeProtocol = 'NRF24';
        newMasterSlaveState.nrfRole = 'MASTER';
        newMasterSlaveState.nrfChannel = ch;
        newMasterSlaveState.nrfOwnPipe = addr;
        newMasterSlaveState.lastMasterCommand = `NRF24 Master Hub Init (Csatorna: ${ch}, Cím: ${addr})`;
      }
      const nrfMod = newModules.find((m) => m.type === 'nrf24l01');
      if (nrfMod) {
        nrfMod.state.channel = ch;
        nrfMod.state.pipe0 = addr;
      }
      break;
    }

    case 'ms_nrf24_master_send_packet': {
      const sAddr = params.slavePipeAddress || '0xE8E8F0F001';
      const isText = params.payloadType === 'TEXT';
      const text = params.payloadText || 'NODE1_ON';
      const reg = params.srcRegister || 'r24';
      const payloadStr = isText ? text : `0x${(newRegisters[reg] ?? 0).toString(16).toUpperCase()}`;

      if (newMasterSlaveState) {
        newMasterSlaveState.activeProtocol = 'NRF24';
        newMasterSlaveState.totalPacketsExchanged += 1;
        newMasterSlaveState.lastMasterCommand = `NRF24 TX -> [${sAddr}] Payload: "${payloadStr}"`;
        newMasterSlaveState.activeTargetSlave = sAddr;

        const targetSlave = (newMasterSlaveState.nrfSlaves || []).find(
          (s) => s.pipeAddress.toLowerCase() === sAddr.toLowerCase()
        );
        if (targetSlave) {
          targetSlave.lastReceivedPayload = payloadStr;
          newMasterSlaveState.lastSlaveResponse = `Auto-ACK OK (${targetSlave.name}): "${targetSlave.ackPayload || 'ACK_OK'}"`;
        } else {
          newMasterSlaveState.lastSlaveResponse = `Auto-ACK OK (Pipe Csomópont ${sAddr})`;
        }
      }

      const nrfMod = newModules.find((m) => m.type === 'nrf24l01');
      if (nrfMod) {
        nrfMod.state.txPayload = payloadStr;
        nrfMod.state.txSuccessCount = (nrfMod.state.txSuccessCount || 0) + 1;
      }
      break;
    }

    case 'ms_nrf24_slave_init': {
      const ch = Number(params.channel) || 76;
      const addr = params.slaveAddress || '0xE8E8F0F001';
      const pIdx = Number(params.pipeIndex) || 1;

      if (newMasterSlaveState) {
        newMasterSlaveState.activeProtocol = 'NRF24';
        newMasterSlaveState.nrfRole = 'SLAVE';
        newMasterSlaveState.nrfChannel = ch;
        newMasterSlaveState.nrfOwnPipe = addr;
        newMasterSlaveState.lastSlaveResponse = `NRF24 Slave figyel (Pipe ${pIdx}: ${addr})`;
      }

      const nrfMod = newModules.find((m) => m.type === 'nrf24l01');
      if (nrfMod) {
        nrfMod.state.channel = ch;
        nrfMod.state[`pipe${pIdx}`] = addr;
      }
      break;
    }

    case 'ms_nrf24_slave_receive_packet': {
      const dest = params.destRegister || 'r24';
      const simulatedData = 0x42; // Simulated byte packet from master
      newRegisters[dest] = simulatedData;

      if (newMasterSlaveState) {
        newMasterSlaveState.activeProtocol = 'NRF24';
        newMasterSlaveState.totalPacketsExchanged += 1;
        newMasterSlaveState.lastMasterCommand = `Rádiós csomag fogadva Master Hub-tól`;
        newMasterSlaveState.lastSlaveResponse = `RX FIFO: 0x${simulatedData.toString(16).toUpperCase()} -> ${dest} + Auto-ACK küldve`;
      }
      break;
    }

    case 'ds_array_flash_lookup': {
      const arrName = params.arrayName || 'sine_table';
      const idxReg = params.indexReg || 'r24';
      const destReg = params.destReg || 'r24';
      const idx = (newRegisters[idxReg] ?? 0) & 0x07;

      let val = 0;
      if (newDataStructState && newDataStructState.arrays[arrName]) {
        const arr = newDataStructState.arrays[arrName];
        val = arr.data[idx % arr.data.length] ?? 0;
        arr.lastAccessedIndex = idx;
        arr.lastAccessedValue = val;
        newDataStructState.lastOperation = `LPM Flash Olvasás: ${arrName}[${idx}] -> ${destReg} = ${val} (0x${val.toString(16).toUpperCase()})`;
      } else {
        val = (idx * 32) & 0xFF;
      }

      newRegisters[destReg] = val;
      break;
    }

    case 'ds_array_ram_buffer': {
      const arrName = params.arrayName || 'sensor_buffer';
      const idxReg = params.indexReg || 'r24';
      const valReg = params.valueReg || 'r25';
      const op = params.operation || 'write';
      const idx = (newRegisters[idxReg] ?? 0) & 0x0F;

      if (newDataStructState) {
        if (!newDataStructState.arrays[arrName]) {
          newDataStructState.arrays[arrName] = {
            name: arrName,
            memoryType: 'ram',
            dataType: 'uint8',
            baseAddress: 0x0100,
            size: 16,
            data: new Array(16).fill(0),
            lastAccessedIndex: 0,
            lastAccessedValue: 0,
          };
        }
        const arr = newDataStructState.arrays[arrName];
        arr.lastAccessedIndex = idx;

        if (op === 'write') {
          const val = newRegisters[valReg] ?? 0;
          arr.data[idx] = val;
          arr.lastAccessedValue = val;
          newDataStructState.lastOperation = `SRAM Tömb Írás (ST X+): ${arrName}[${idx}] = ${val}`;
        } else {
          const val = arr.data[idx] ?? 0;
          newRegisters[valReg] = val;
          arr.lastAccessedValue = val;
          newDataStructState.lastOperation = `SRAM Tömb Olvasás (LD): ${valReg} = ${arrName}[${idx}] (${val})`;
        }
      }
      break;
    }

    case 'ds_struct_define': {
      const structType = params.structTypeName || 'SensorNode';
      const instName = params.instanceName || 'current_sensor_node';
      if (newDataStructState) {
        if (!newDataStructState.structs[instName]) {
          newDataStructState.structs[instName] = {
            name: instName,
            structType,
            baseAddress: 0x0120,
            totalSize: 4,
            fields: [
              { name: 'node_id', type: 'uint8_t', offset: 0, size: 1, value: 1 },
              { name: 'temperature', type: 'int16_t', offset: 1, size: 2, value: 25 },
              { name: 'status_flags', type: 'uint8_t', offset: 3, size: 1, value: 0x01 },
            ],
          };
        }
        newDataStructState.lastOperation = `Struktúra példány definíció: ${structType} ${instName} az SRAM-ban (Y mutató)`;
      }
      break;
    }

    case 'ds_struct_read_field': {
      const instName = params.instanceName || 'current_sensor_node';
      const offset = parseInt(params.offset || '0', 10);
      const destReg = params.destReg || 'r24';

      let readVal = 0;
      if (newDataStructState && newDataStructState.structs[instName]) {
        const s = newDataStructState.structs[instName];
        const f = s.fields.find((fld) => fld.offset === offset);
        if (f) {
          readVal = f.value;
          newDataStructState.lastOperation = `LDD Y+${offset} Olvasás: ${s.name}.${f.name} -> ${destReg} = ${readVal}`;
        } else {
          readVal = 42;
          newDataStructState.lastOperation = `LDD Y+${offset} Olvasás: Eltolás ${offset} -> ${destReg} = ${readVal}`;
        }
      }
      newRegisters[destReg] = readVal & 0xFF;
      break;
    }

    case 'ds_struct_write_field': {
      const instName = params.instanceName || 'current_sensor_node';
      const offset = parseInt(params.offset || '0', 10);
      const srcReg = params.srcReg || 'r24';
      const val = newRegisters[srcReg] ?? 0;

      if (newDataStructState && newDataStructState.structs[instName]) {
        const s = newDataStructState.structs[instName];
        const f = s.fields.find((fld) => fld.offset === offset);
        if (f) {
          f.value = val;
          newDataStructState.lastOperation = `STD Y+${offset} Írás: ${s.name}.${f.name} = ${val} (${srcReg})`;
        } else {
          s.fields.push({ name: `field_at_${offset}`, type: 'uint8_t', offset, size: 1, value: val });
          newDataStructState.lastOperation = `STD Y+${offset} Írás: Eltolás ${offset} = ${val}`;
        }
      }
      break;
    }

    case 'ds_object_instance': {
      const cls = params.className || 'LedController';
      const inst = params.instanceName || 'statusLed';
      if (newDataStructState) {
        newDataStructState.objects[inst] = {
          id: inst,
          className: cls,
          instanceName: inst,
          thisPointer: 0x0140,
          fields: { pin: 13, state: 0, brightness: 255 },
          methods: ['construct', 'toggle', 'setBrightness', 'reset'],
          lastMethodCalled: 'construct',
        };
        newDataStructState.lastOperation = `OOP Konstruktor Hívás: ${cls}::${cls}() inicializálva 'this'=[0x0140]`;
      }
      break;
    }

    case 'ds_object_method_call': {
      const inst = params.instanceName || 'statusLed';
      const method = params.methodName || 'toggle';
      const argReg = params.argReg || 'r24';

      if (newDataStructState && newDataStructState.objects[inst]) {
        const obj = newDataStructState.objects[inst];
        obj.lastMethodCalled = method;
        if (method === 'toggle') {
          obj.fields.state = obj.fields.state === 1 ? 0 : 1;
          newPinStates['13'] = {
            mode: 'OUTPUT',
            value: obj.fields.state as (0 | 1),
            label: 'LED D13 (OOP)',
          };
        } else if (method === 'setBrightness') {
          obj.fields.brightness = newRegisters[argReg] ?? 255;
        }
        newDataStructState.lastOperation = `OOP Metódus Hívás: ${obj.className}::${method}(arg=${newRegisters[argReg] ?? 0}) [this=r25:r24]`;
      }
      break;
    }

    case 'esp32_gpio_mode_out': {
      const pinStr = (params.pin || '2').toString();
      if (newEsp32State.pinStates32[pinStr]) {
        newEsp32State.pinStates32[pinStr].mode = 'OUTPUT';
      }
      // Keep legacy pinStates in sync if pin is 0-13
      if (newPinStates[pinStr as ArduinoPin]) {
        newPinStates[pinStr as ArduinoPin] = {
          ...newPinStates[pinStr as ArduinoPin],
          mode: 'OUTPUT',
        };
      }
      break;
    }

    case 'esp32_gpio_mode_in': {
      const pinStr = (params.pin || '4').toString();
      if (newEsp32State.pinStates32[pinStr]) {
        newEsp32State.pinStates32[pinStr].mode = params.pull === 'PULLUP' ? 'INPUT_PULLUP' : params.pull === 'PULLDOWN' ? 'INPUT_PULLDOWN' : 'INPUT';
      }
      if (newPinStates[pinStr as ArduinoPin]) {
        newPinStates[pinStr as ArduinoPin] = {
          ...newPinStates[pinStr as ArduinoPin],
          mode: 'INPUT',
        };
      }
      break;
    }

    case 'esp32_gpio_write': {
      const pinStr = (params.pin || '2').toString();
      const isSet = params.action === 'W1TS' || params.action === 'HIGH';
      const val = isSet ? 1 : 0;
      if (newEsp32State.pinStates32[pinStr]) {
        newEsp32State.pinStates32[pinStr].value = val;
        newEsp32State.pinStates32[pinStr].mode = 'OUTPUT';
      }
      if (newPinStates[pinStr as ArduinoPin]) {
        newPinStates[pinStr as ArduinoPin] = {
          ...newPinStates[pinStr as ArduinoPin],
          value: val,
        };
      }
      newEsp32State.core1.cycles += 1;
      break;
    }

    case 'esp32_touch_pad': {
      const pinStr = (params.touchPin || '4').toString();
      const thresh = params.threshold ?? 40;
      const currentReading = newEsp32State.touch[pinStr] ?? 80;
      const isTouched = currentReading < thresh;
      if (newEsp32State.pinStates32[pinStr]) {
        newEsp32State.pinStates32[pinStr].touchValue = currentReading;
        newEsp32State.pinStates32[pinStr].mode = 'TOUCH';
      }
      newRegisters['r16'] = currentReading;
      if (newUartState && isTouched) {
        newUartState.terminalText += `[ESP32 Touch] Érintés érzékelve GPIO${pinStr}-en! Érték: ${currentReading} < ${thresh}\n`;
      }
      break;
    }

    case 'esp32_dac_write': {
      const pinStr = (params.dacPin || '25').toString();
      const val = Math.max(0, Math.min(255, parseInt(params.dacValue ?? '128', 10)));
      const voltage = parseFloat(((val / 255) * 3.3).toFixed(2));
      if (pinStr === '25') {
        newEsp32State.dac.dac1 = val;
        newEsp32State.dac.dac1Voltage = voltage;
        newEsp32State.dac.dac1Waveform = [...newEsp32State.dac.dac1Waveform.slice(-30), val];
      } else {
        newEsp32State.dac.dac2 = val;
        newEsp32State.dac.dac2Voltage = voltage;
        newEsp32State.dac.dac2Waveform = [...newEsp32State.dac.dac2Waveform.slice(-30), val];
      }
      if (newEsp32State.pinStates32[pinStr]) {
        newEsp32State.pinStates32[pinStr].mode = 'DAC';
        newEsp32State.pinStates32[pinStr].analogValue = Math.round((val / 255) * 4095);
      }
      break;
    }

    case 'esp32_ledc_pwm': {
      const pinStr = (params.pin || '2').toString();
      const duty = Math.max(0, Math.min(255, parseInt(params.duty ?? '128', 10)));
      const freq = parseInt(params.freqHz ?? '5000', 10);
      if (newEsp32State.pinStates32[pinStr]) {
        newEsp32State.pinStates32[pinStr].mode = 'OUTPUT';
        newEsp32State.pinStates32[pinStr].pwmDuty = duty;
        newEsp32State.pinStates32[pinStr].pwmFreqHz = freq;
        newEsp32State.pinStates32[pinStr].value = duty > 127 ? 1 : 0;
      }
      break;
    }

    case 'esp32_freertos_task': {
      const taskName = params.taskName || 'sensorTask';
      const core = parseInt(params.core || '0', 10) as 0 | 1;
      const prio = parseInt(params.priority || '1', 10);
      const stack = parseInt(params.stackSize || '4096', 10);
      const existing = newEsp32State.freeRtos.tasks.find((t) => t.name === taskName);
      if (existing) {
        existing.coreId = core;
        existing.priority = prio;
        existing.stackSize = stack;
        existing.state = 'RUNNING';
      } else {
        newEsp32State.freeRtos.tasks.push({
          id: `task_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
          name: taskName,
          coreId: core,
          priority: prio,
          stackSize: stack,
          state: 'RUNNING',
          lastRunTimeNs: currentTimestampNs,
          cpuPercentage: 20,
          functionName: `${taskName}_func`,
        });
      }
      if (core === 0) {
        newEsp32State.core0.activeTask = taskName;
        newEsp32State.core0.cpuLoadPercent = Math.min(95, newEsp32State.core0.cpuLoadPercent + 15);
      } else {
        newEsp32State.core1.activeTask = taskName;
        newEsp32State.core1.cpuLoadPercent = Math.min(95, newEsp32State.core1.cpuLoadPercent + 15);
      }
      break;
    }

    case 'esp32_wifi_connect': {
      const ssid = params.ssid || 'MyHomeWiFi';
      newEsp32State.wifi.mode = 'STA';
      newEsp32State.wifi.status = 'CONNECTED';
      newEsp32State.wifi.ssid = ssid;
      newEsp32State.wifi.ipAddress = '192.168.1.105';
      newEsp32State.wifi.rssi = -54;
      newEsp32State.wifi.webServer.running = true;
      if (newUartState) {
        newUartState.terminalText += `[WiFi] Csatlakozva az AP-hoz: "${ssid}" | IP: 192.168.1.105 | RSSI: -54 dBm\n`;
      }
      break;
    }

    case 'esp32_deep_sleep': {
      const sec = parseInt(params.sleepSeconds || '10', 10);
      const wakeup = (params.wakeupSource || 'timer').toUpperCase() as any;
      newEsp32State.deepSleep.isSleeping = true;
      newEsp32State.deepSleep.wakeupCause = wakeup;
      newEsp32State.deepSleep.wakeupTimeUs = sec * 1_000_000;
      newEsp32State.deepSleep.sleepCount += 1;
      newEsp32State.core0.cpuLoadPercent = 0;
      newEsp32State.core1.cpuLoadPercent = 0;
      if (newUartState) {
        newUartState.terminalText += `[Deep Sleep] ESP32 mélyalvásba lépett ${sec} mp-re (5 µA áramfelvétel). Ébresztési ok: ${wakeup}\n`;
      }
      break;
    }

    case 'esp32_ccount_delay': {
      const cycles = parseInt(params.cycles || '240', 10);
      newEsp32State.core1.cycles += cycles;
      break;
    }

    case 'esp32_gpio_interrupt': {
      const pin = Number(params.gpioPin ?? 4);
      const mode = (params.triggerMode || 'FALLING') as any;
      const core = (params.coreAffinity === '0' ? 0 : 1) as 0 | 1;
      const action = (params.action || 'toggle_pin') as any;
      const targetPin = Number(params.targetPin ?? 2);

      newEsp32InterruptState.configs['GPIO_INTR'] = {
        id: 'GPIO_INTR',
        enabled: true,
        coreAffinity: core,
        priorityLevel: 1,
        triggerType: 'EDGE',
        useIramAttr: true,
        gpioPin: pin,
        gpioTriggerMode: mode,
        customIsrAction: action,
        targetPin: targetPin,
        description: `GPIO ${pin} (${mode}) -> ${action === 'toggle_pin' ? `GPIO ${targetPin} Toggle` : 'Taszk értesítés'}`,
      };
      break;
    }

    case 'esp32_timer_alarm_interrupt': {
      const tg = Number(params.timerGroup ?? 0) as 0 | 1;
      const tIdx = Number(params.timerIndex ?? 0) as 0 | 1;
      const us = Number(params.intervalUs ?? 1000);
      const reload = params.autoReload !== 'false';
      const targetPin = Number(params.targetPin ?? 2);
      const srcId = tg === 0 ? (tIdx === 0 ? 'TG0_T0_LEVEL' : 'TG0_T1_LEVEL') : (tIdx === 0 ? 'TG1_T0_LEVEL' : 'TG1_T1_LEVEL');

      newEsp32InterruptState.configs[srcId] = {
        id: srcId,
        enabled: true,
        coreAffinity: tg === 0 ? 0 : 1,
        priorityLevel: 2,
        triggerType: 'LEVEL',
        useIramAttr: true,
        timerGroup: tg,
        timerIndex: tIdx,
        alarmIntervalUs: us,
        autoReload: reload,
        divider: 80,
        customIsrAction: 'toggle_pin',
        targetPin: targetPin,
        description: `Timer Group ${tg} Timer ${tIdx} Alarm @ ${us} µs (${Math.round(1000000 / us)} Hz)`,
      };
      break;
    }

    case 'esp32_touch_interrupt': {
      const pad = Number(params.touchPad ?? 0);
      const th = Number(params.threshold ?? 400);
      const targetPin = Number(params.targetPin ?? 2);

      newEsp32InterruptState.configs['TOUCH_PAD_INTR'] = {
        id: 'TOUCH_PAD_INTR',
        enabled: true,
        coreAffinity: 1,
        priorityLevel: 1,
        triggerType: 'LEVEL',
        useIramAttr: true,
        touchPadIndex: pad,
        touchThreshold: th,
        customIsrAction: 'toggle_pin',
        targetPin: targetPin,
        description: `Kapacitív Touch T${pad} küszöbérték (${th}) riasztás`,
      };
      break;
    }

    case 'esp32_interrupt_designer': {
      newEsp32InterruptState.globalInterruptsEnabled = true;
      break;
    }

    default:
      break;
  }

  // ==========================================
  // HARDWARE INTERRUPT EVALUATION & ISR FIRING
  // ==========================================
  const isGlobalIntActive = newSreg.I && newInterruptState.globalInterruptsEnabled !== false;
  if (isGlobalIntActive) {
    const vectorsToProcess: AvrInterruptVectorId[] = [];

    // 1. Process pending manual triggers
    if (newInterruptState.pendingInterrupts && newInterruptState.pendingInterrupts.length > 0) {
      vectorsToProcess.push(...newInterruptState.pendingInterrupts);
      newInterruptState.pendingInterrupts = [];
    }

    // 2. Process Timer1 CTC periodic ticks (e.g. if Timer1 enabled and step modulo matches)
    const t1Cfg = newInterruptState.vectorConfigs?.['TIMER1_COMPA'];
    if (t1Cfg?.enabled && prevState.stepCount % 6 === 0) {
      vectorsToProcess.push('TIMER1_COMPA');
    }

    // 3. Execute ISR action for each triggered vector
    for (const vecId of vectorsToProcess) {
      const vInfo = ATMEGA328P_INTERRUPT_VECTORS.find((v) => v.id === vecId);
      const cfg = newInterruptState.vectorConfigs?.[vecId] || DEFAULT_INTERRUPT_CONFIGS[vecId];
      const count = (newInterruptState.firingCount[vecId] || 0) + 1;
      newInterruptState.firingCount[vecId] = count;
      newInterruptState.totalFiredCount = (newInterruptState.totalFiredCount || 0) + 1;
      newInterruptState.lastFiredTimestampNs = currentTimestampNs;
      newInterruptState.isExecutingIsr = true;

      if (cfg?.customIsrAction === 'toggle_led') {
        const targetPin = (cfg.customTargetPin || '13') as ArduinoPin;
        if (newPinStates[targetPin]) {
          newPinStates[targetPin] = {
            ...newPinStates[targetPin],
            value: newPinStates[targetPin].value === 1 ? 0 : 1,
          };
        }
      } else if (cfg?.customIsrAction === 'increment_var') {
        newRegisters['r24'] = ((newRegisters['r24'] || 0) + 1) & 0xff;
      } else if (cfg?.customIsrAction === 'send_uart' && newUartState) {
        newUartState.terminalText = (newUartState.terminalText || '') + `[ISR ${vecId}] Executed\n`;
      }

      newInterruptState.eventLog.unshift({
        id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        vector: vecId,
        vectorName: vInfo?.vectorName || `${vecId}_vect`,
        source: vInfo?.source || 'Hardware Interrupt Trigger',
        timestampNs: currentTimestampNs,
        cyclesTaken: 4,
        details: `ISR Belépés [Flash ${vInfo?.programAddressHex || '0x0000'}] -> ${cfg?.description || 'Hardveres callback lefutott'}`,
      });

      if (newInterruptState.eventLog.length > 50) {
        newInterruptState.eventLog = newInterruptState.eventLog.slice(0, 50);
      }
    }
  }

  // ==========================================
  // ESP32 HARDWARE INTERRUPT MATRIX EVALUATION
  // ==========================================
  if (newEsp32InterruptState.globalInterruptsEnabled !== false) {
    const espPending = [...(newEsp32InterruptState.pendingInterrupts || [])];
    newEsp32InterruptState.pendingInterrupts = [];

    // Periodic Timer Group 0 Timer 0 tick (if enabled and modulo matches)
    const tg0t0Cfg = newEsp32InterruptState.configs?.['TG0_T0_LEVEL'];
    if (tg0t0Cfg?.enabled && prevState.stepCount % 5 === 0) {
      espPending.push({ sourceId: 'TG0_T0_LEVEL', coreId: 0 });
    }

    for (const item of espPending) {
      const sInfo = ESP32_INTERRUPT_SOURCES.find((s) => s.id === item.sourceId);
      const cfg = newEsp32InterruptState.configs?.[item.sourceId] || DEFAULT_ESP32_INTERRUPT_CONFIGS[item.sourceId];
      const targetCore = item.coreId ?? (cfg?.coreAffinity === 'both' ? 1 : cfg?.coreAffinity || 0);

      newEsp32InterruptState.totalFiredCount = (newEsp32InterruptState.totalFiredCount || 0) + 1;
      if (targetCore === 0) {
        newEsp32InterruptState.core0FiredCount = (newEsp32InterruptState.core0FiredCount || 0) + 1;
        newEsp32State.core0.cycles += 24;
      } else {
        newEsp32InterruptState.core1FiredCount = (newEsp32InterruptState.core1FiredCount || 0) + 1;
        newEsp32State.core1.cycles += 24;
      }
      newEsp32InterruptState.firingCount[item.sourceId] = (newEsp32InterruptState.firingCount[item.sourceId] || 0) + 1;
      newEsp32InterruptState.lastFiredTimestampNs = currentTimestampNs;

      // ISR Action execution
      if (cfg?.customIsrAction === 'toggle_pin') {
        const pinStr = String(cfg.targetPin ?? 2);
        if (newEsp32State.pinStates32[pinStr]) {
          newEsp32State.pinStates32[pinStr].value = newEsp32State.pinStates32[pinStr].value === 1 ? 0 : 1;
        }
      } else if (cfg?.customIsrAction === 'notify_task') {
        const task = newEsp32State.freeRtos.tasks.find((t) => t.name === cfg.targetTaskName || t.coreId === targetCore);
        if (task) {
          task.state = 'RUNNING';
        }
      } else if (cfg?.customIsrAction === 'send_queue') {
        const queue = newEsp32State.freeRtos.queues[0];
        if (queue) {
          queue.messages.push(`ISR_${item.sourceId}_${Date.now()}`);
          queue.peakUsage = Math.max(queue.peakUsage, queue.messages.length);
        }
      }

      newEsp32InterruptState.eventLog.unshift({
        id: `evt_esp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        sourceId: item.sourceId,
        name: sInfo?.name || item.sourceId,
        coreId: targetCore,
        timestampNs: currentTimestampNs,
        latencyNs: cfg?.useIramAttr ? 18 : 85,
        priority: cfg?.priorityLevel || 1,
        details: `Core ${targetCore} (${targetCore === 0 ? 'PRO_CPU' : 'APP_CPU'}) ISR Lefutott [IRAM: ${cfg?.useIramAttr ? 'Igen (18ns)' : 'Nem (85ns)'}] -> ${cfg?.description || 'Hardveres callback kész'}`,
      });

      if (newEsp32InterruptState.eventLog.length > 50) {
        newEsp32InterruptState.eventLog = newEsp32InterruptState.eventLog.slice(0, 50);
      }
    }
  }

  // Record waveform sample
  const pinSnapshot: Record<string, 0 | 1> = {};
  ARDUINO_PINS_ORDER.forEach((p) => {
    pinSnapshot[p] = newPinStates[p]?.value || 0;
  });

  const nextSampleTime = currentTimestampNs;
  const newWaveform: LogicAnalyzerSample[] = [
    ...prevState.logicWaveform.slice(-40),
    {
      timeNs: nextSampleTime,
      pinStates: pinSnapshot,
      activeBlockId: currentBlock.id,
    },
  ];

  // Advance index
  let advancedIndex = nextIndex + 1;
  let advancedScope = nextScope;

  if (nextScope === 'setup' && advancedIndex >= setupBlocks.length) {
    advancedScope = 'loop';
    advancedIndex = 0;
  } else if (nextScope === 'loop' && advancedIndex >= loopBlocks.length) {
    advancedIndex = 0; // Wrap around continuous loop
  }

  return {
    ...prevState,
    currentBlockIndex: advancedIndex,
    currentScope: advancedScope,
    stepCount: prevState.stepCount + 1,
    totalCycles: prevState.totalCycles + blockCycles,
    pinStates: newPinStates,
    registers: newRegisters,
    modules: newModules,
    sreg: newSreg,
    uartState: newUartState,
    i2cState: newI2cState,
    spiState: newSpiState,
    adcState: newAdcState,
    oneWireState: newOneWireState,
    neoPixelPixels: newNeoPixels,
    logicWaveform: newWaveform,
    eeprom: newEeprom,
    flash: newFlash,
    lastEepromAccess: newLastEepromAccess,
    masterSlaveState: newMasterSlaveState,
    dataStructState: newDataStructState,
    esp32State: newEsp32State,
    esp32InterruptState: newEsp32InterruptState,
    interruptState: newInterruptState,
  };
}
