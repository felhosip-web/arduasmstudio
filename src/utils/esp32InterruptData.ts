import {
  Esp32InterruptSourceId,
  Esp32InterruptCategory,
  Esp32InterruptPriority,
  Esp32InterruptSourceInfo,
  Esp32InterruptConfig,
  Esp32InterruptState,
} from '../types';

export const ESP32_INTERRUPT_SOURCES: Esp32InterruptSourceInfo[] = [
  {
    id: 'GPIO_INTR',
    name: 'GPIO_INTR (Mátrix Láb Megszakítás)',
    sourceNum: 22,
    category: 'gpio',
    defaultPriority: 1,
    triggerType: 'EDGE',
    coreAffinity: 'both',
    description: 'Bármelyik GPIO (0-39) lábon fellépő él- vagy szintérzékeny hardveres megszakítás IRAM_ATTR gyorseléréssel.',
    hardwareSource: 'GPIO Mátrix & IO_MUX (GPIO 0-39)',
    registers: [
      { name: 'GPIO_STATUS_REG', bit: 'Bit 0-31', addressHex: '0x3FF44044', description: 'GPIO 0-31 megszakítás státusz flag regiszter' },
      { name: 'GPIO_STATUS1_REG', bit: 'Bit 0-7', addressHex: '0x3FF44048', description: 'GPIO 32-39 megszakítás státusz flag regiszter' },
      { name: 'GPIO_PINn_REG', bit: 'Bit 7..9 (INT_TYPE)', addressHex: '0x3FF44088', description: 'Trigger típus (RISING, FALLING, CHANGE, LOW, HIGH)' },
      { name: 'DPORT_PRO_GPIO_INTERRUPT_MAP_REG', bit: 'Bit 0-4', addressHex: '0x3FF00104', description: 'PRO_CPU Core 0 CPU megszakítás csatorna allokáció' },
    ],
  },
  {
    id: 'TG0_T0_LEVEL',
    name: 'TG0_T0_LEVEL (Timer Group 0 - Timer 0)',
    sourceNum: 6,
    category: 'timer',
    defaultPriority: 2,
    triggerType: 'LEVEL',
    coreAffinity: 'both',
    description: '64-bites hardveres időzítő Timer Group 0-ban, mikromásodperces felbontású riasztással és auto-reload támogatással.',
    hardwareSource: 'TIMERG0 / Timer 0 (APB Clock @ 80 MHz)',
    registers: [
      { name: 'TIMG_T0CONFIG_REG', bit: 'Bit 31 (EN), 30 (AUTORELOAD), 13-28 (DIVIDER)', addressHex: '0x3FF5F000', description: 'Timer 0 konfigurációs és előosztó regiszter' },
      { name: 'TIMG_T0ALARMLO_REG', bit: 'Bit 0-31', addressHex: '0x3FF5F010', description: 'Riasztási számláló alsó 32 bitje' },
      { name: 'TIMG_T0ALARMHI_REG', bit: 'Bit 0-31', addressHex: '0x3FF5F014', description: 'Riasztási számláló felső 32 bitje' },
      { name: 'TIMG_INT_ENA_TIMERS_REG', bit: 'Bit 0 (T0_INT_ENA)', addressHex: '0x3FF5F098', description: 'Timer Group 0 megszakítás engedélyezés' },
    ],
  },
  {
    id: 'TG0_T1_LEVEL',
    name: 'TG0_T1_LEVEL (Timer Group 0 - Timer 1)',
    sourceNum: 7,
    category: 'timer',
    defaultPriority: 2,
    triggerType: 'LEVEL',
    coreAffinity: 'both',
    description: 'Timer Group 0 második 64-bites hardveres időzítője periodikus feladatokhoz vagy PWM modulációhoz.',
    hardwareSource: 'TIMERG0 / Timer 1',
    registers: [
      { name: 'TIMG_T1CONFIG_REG', bit: 'Bit 31 (EN), 30 (AUTORELOAD)', addressHex: '0x3FF5F024', description: 'Timer 1 konfiguráció és előosztó' },
      { name: 'TIMG_INT_ENA_TIMERS_REG', bit: 'Bit 1 (T1_INT_ENA)', addressHex: '0x3FF5F098', description: 'Timer 1 megszakítás engedélyezés' },
    ],
  },
  {
    id: 'TG1_T0_LEVEL',
    name: 'TG1_T0_LEVEL (Timer Group 1 - Timer 0)',
    sourceNum: 8,
    category: 'timer',
    defaultPriority: 2,
    triggerType: 'LEVEL',
    coreAffinity: 1,
    description: 'Timer Group 1 első 64-bites hardveres időzítője (gyakran APP_CPU Core 1-hez rendelve).',
    hardwareSource: 'TIMERG1 / Timer 0',
    registers: [
      { name: 'TIMG1_T0CONFIG_REG', bit: 'Bit 31 (EN)', addressHex: '0x3FF60000', description: 'TG1 Timer 0 konfiguráció' },
      { name: 'TIMG1_INT_ENA_TIMERS_REG', bit: 'Bit 0', addressHex: '0x3FF60098', description: 'TG1 Timer 0 megszakítás engedélyezés' },
    ],
  },
  {
    id: 'TG1_T1_LEVEL',
    name: 'TG1_T1_LEVEL (Timer Group 1 - Timer 1)',
    sourceNum: 9,
    category: 'timer',
    defaultPriority: 2,
    triggerType: 'LEVEL',
    coreAffinity: 1,
    description: 'Timer Group 1 második 64-bites hardveres időzítője nagy pontosságú időközökhöz.',
    hardwareSource: 'TIMERG1 / Timer 1',
    registers: [
      { name: 'TIMG1_T1CONFIG_REG', bit: 'Bit 31 (EN)', addressHex: '0x3FF60024', description: 'TG1 Timer 1 konfiguráció' },
    ],
  },
  {
    id: 'TG0_WDT_LEVEL',
    name: 'TG0_WDT_LEVEL (Watchdog Timer 0)',
    sourceNum: 24,
    category: 'system_freertos',
    defaultPriority: 4,
    triggerType: 'LEVEL',
    coreAffinity: 0,
    description: 'Hardware Watchdog időzítő a PRO_CPU rendszerlefagyásainak elkerülésére.',
    hardwareSource: 'TIMERG0 / MWDT',
    registers: [
      { name: 'TIMG_WDTCONFIG0_REG', bit: 'Bit 31 (WDT_EN)', addressHex: '0x3FF5F048', description: 'Watchdog engedélyezés és riasztási szakaszok' },
    ],
  },
  {
    id: 'TG1_WDT_LEVEL',
    name: 'TG1_WDT_LEVEL (Watchdog Timer 1 - Task WDT)',
    sourceNum: 25,
    category: 'system_freertos',
    defaultPriority: 4,
    triggerType: 'LEVEL',
    coreAffinity: 1,
    description: 'FreeRTOS Task Watchdog Timer az APP_CPU szálainak felügyeletére.',
    hardwareSource: 'TIMERG1 / MWDT (Task WDT)',
    registers: [
      { name: 'TIMG1_WDTCONFIG0_REG', bit: 'Bit 31 (WDT_EN)', addressHex: '0x3FF60048', description: 'FreeRTOS Task WDT konfiguráció' },
    ],
  },
  {
    id: 'UART0_INTR',
    name: 'UART0_INTR (Soros Port 0 - Debug & Console)',
    sourceNum: 34,
    category: 'comm',
    defaultPriority: 1,
    triggerType: 'LEVEL',
    coreAffinity: 0,
    description: 'UART0 periféria FIFO megtelés, RX karakter vagy hiba megszakítás (USB Serial / TX0 D1, RX0 D3).',
    hardwareSource: 'UART0 Controller (USB Programmer Port)',
    registers: [
      { name: 'UART_INT_ENA_REG', bit: 'Bit 0 (RXFIFO_FULL), Bit 1 (TXFIFO_EMPTY)', addressHex: '0x3FF4000C', description: 'UART0 megszakítás maszk' },
      { name: 'UART_INT_RAW_REG', bit: 'Bit 0-18', addressHex: '0x3FF40004', description: 'Nyers státusz bitek' },
    ],
  },
  {
    id: 'UART1_INTR',
    name: 'UART1_INTR (Soros Port 1 - Másodlagos UART)',
    sourceNum: 35,
    category: 'comm',
    defaultPriority: 1,
    triggerType: 'LEVEL',
    coreAffinity: 'both',
    description: 'Másodlagos hardveres UART periféria (GPS, külső modulok, D9/D10 lábakhoz rendelhető).',
    hardwareSource: 'UART1 Peripheral',
    registers: [
      { name: 'UART1_INT_ENA_REG', bit: 'Bit 0 (RXFIFO_FULL)', addressHex: '0x3FF6E00C', description: 'UART1 megszakítás engedélyezés' },
    ],
  },
  {
    id: 'UART2_INTR',
    name: 'UART2_INTR (Soros Port 2 - Hardveres UART2)',
    sourceNum: 36,
    category: 'comm',
    defaultPriority: 1,
    triggerType: 'LEVEL',
    coreAffinity: 'both',
    description: 'Harmadik hardveres UART port (GPIO 16 RX2 / GPIO 17 TX2).',
    hardwareSource: 'UART2 Peripheral (GPIO 16 / 17)',
    registers: [
      { name: 'UART2_INT_ENA_REG', bit: 'Bit 0-18', addressHex: '0x3FF6B00C', description: 'UART2 megszakítás engedélyezés' },
    ],
  },
  {
    id: 'I2C_EXT0_INTR',
    name: 'I2C_EXT0_INTR (I2C Port 0 - Master/Slave)',
    sourceNum: 49,
    category: 'comm',
    defaultPriority: 1,
    triggerType: 'LEVEL',
    coreAffinity: 'both',
    description: 'I2C Busz 0 hardveres megszakítás (SDA GPIO 21, SCL GPIO 22) ACK hiba, byte átvitel vagy arbitráció vesztés esetén.',
    hardwareSource: 'I2C0 Controller (GPIO 21 / 22)',
    registers: [
      { name: 'I2C_INT_ENA_REG', bit: 'Bit 0 (RXFIFO_WM), Bit 3 (END_DETECT)', addressHex: '0x3FF5300C', description: 'I2C0 megszakítás maszk' },
    ],
  },
  {
    id: 'I2C_EXT1_INTR',
    name: 'I2C_EXT1_INTR (I2C Port 1)',
    sourceNum: 50,
    category: 'comm',
    defaultPriority: 1,
    triggerType: 'LEVEL',
    coreAffinity: 'both',
    description: 'Második hardveres I2C busz kontroller megszakítása.',
    hardwareSource: 'I2C1 Controller',
    registers: [
      { name: 'I2C1_INT_ENA_REG', bit: 'Bit 0-15', addressHex: '0x3FF6700C', description: 'I2C1 megszakítás maszk' },
    ],
  },
  {
    id: 'SPI1_INTR',
    name: 'SPI1_INTR (SPI Flash Controller)',
    sourceNum: 1,
    category: 'comm',
    defaultPriority: 3,
    triggerType: 'LEVEL',
    coreAffinity: 0,
    description: 'Külső SPI Flash memória és PSRAM kontroller megszakítása.',
    hardwareSource: 'SPI1 Controller (Flash Bus)',
    registers: [
      { name: 'SPI_SLAVE_REG', bit: 'Bit 5 (TRANS_DONE)', addressHex: '0x3FF42038', description: 'Flash átvitel befejezés' },
    ],
  },
  {
    id: 'SPI2_INTR',
    name: 'SPI2_INTR (HSPI Controller & DMA)',
    sourceNum: 2,
    category: 'comm',
    defaultPriority: 2,
    triggerType: 'LEVEL',
    coreAffinity: 'both',
    description: 'HSPI általános célú busz nagy sebességű DMA és FIFO transzfer befejezési megszakítása (SCK 14, MISO 12, MOSI 13).',
    hardwareSource: 'HSPI Controller (GPIO 12, 13, 14, 15)',
    registers: [
      { name: 'SPI2_DMA_INT_ENA_REG', bit: 'Bit 7 (IN_DONE), Bit 8 (OUT_DONE)', addressHex: '0x3FF64040', description: 'HSPI DMA csatorna megszakítás engedélyezés' },
    ],
  },
  {
    id: 'SPI3_INTR',
    name: 'SPI3_INTR (VSPI Controller & DMA)',
    sourceNum: 3,
    category: 'comm',
    defaultPriority: 2,
    triggerType: 'LEVEL',
    coreAffinity: 'both',
    description: 'VSPI kontroller (SCK 18, MISO 19, MOSI 23) kijelzőkhöz, SD kártyához vagy szenzorokhoz.',
    hardwareSource: 'VSPI Controller (GPIO 18, 19, 23, 5)',
    registers: [
      { name: 'SPI3_DMA_INT_ENA_REG', bit: 'Bit 7 (IN_DONE), Bit 8 (OUT_DONE)', addressHex: '0x3FF43040', description: 'VSPI DMA megszakítás maszk' },
    ],
  },
  {
    id: 'TWAI_INTR',
    name: 'TWAI_INTR (CAN Bus / TWAI Controller)',
    sourceNum: 45,
    category: 'comm',
    defaultPriority: 2,
    triggerType: 'LEVEL',
    coreAffinity: 'both',
    description: 'Two-Wire Automotive Interface (ISO 11898-1 CAN 2.0B) keret érkezése, TX kész vagy bus-off riasztás.',
    hardwareSource: 'TWAI / CAN Controller (GPIO 4 / 5 tipikus)',
    registers: [
      { name: 'TWAI_INT_ENA_REG', bit: 'Bit 0 (RI), Bit 1 (TI), Bit 2 (EI)', addressHex: '0x3FF6B010', description: 'CAN megszakítás engedélyezés' },
    ],
  },
  {
    id: 'TOUCH_PAD_INTR',
    name: 'TOUCH_PAD_INTR (Kapacitív Érintőgombok T0-T9)',
    sourceNum: 56,
    category: 'analog_sensor',
    defaultPriority: 1,
    triggerType: 'LEVEL',
    coreAffinity: 'both',
    description: '10 db hardveres kapacitív érintőszenzor (T0..T9: GPIO 4, 0, 2, 15, 13, 12, 14, 27, 33, 32) küszöbérték átlépési riasztás.',
    hardwareSource: 'RTC Touch Sensor Controller',
    registers: [
      { name: 'RTCIO_TOUCH_PAD0_THRES_REG', bit: 'Bit 0-15', addressHex: '0x3FF48480', description: 'T0 küszöbérték' },
      { name: 'RTCIO_INT_ENA_REG', bit: 'Bit 0-9 (TOUCH_INT_ENA)', addressHex: '0x3FF4843C', description: 'Érintőgomb megszakítás maszk' },
    ],
  },
  {
    id: 'RTC_CORE_INTR',
    name: 'RTC_CORE_INTR (RTC & ULP Koprocesszor)',
    sourceNum: 57,
    category: 'analog_sensor',
    defaultPriority: 1,
    triggerType: 'LEVEL',
    coreAffinity: 0,
    description: 'RTC mélyalvási időzítő, ULP ultra alacsony fogyasztású koprocesszor ébresztési megszakítása.',
    hardwareSource: 'RTC Slow Clock Domain & ULP',
    registers: [
      { name: 'RTC_CNTL_INT_ENA_REG', bit: 'Bit 0 (SLP_REJECT), Bit 1 (SLP_WAKEUP)', addressHex: '0x3FF4803C', description: 'RTC ébresztés megszakítás' },
    ],
  },
  {
    id: 'WIFI_MAC_INTR',
    name: 'WIFI_MAC_INTR (Wi-Fi MAC & Baseband)',
    sourceNum: 0,
    category: 'wireless',
    defaultPriority: 3,
    triggerType: 'LEVEL',
    coreAffinity: 0,
    description: '802.11 b/g/n Wi-Fi MAC és PHY csomagküldési/fogadási nagy prioritású megszakítás (PRO_CPU Core 0 kezeli).',
    hardwareSource: 'Wi-Fi 2.4 GHz Rádió & MAC Engine',
    registers: [
      { name: 'DPORT_PRO_MAC_INTR_MAP_REG', bit: 'Bit 0-4', addressHex: '0x3FF00100', description: 'Core 0 Wi-Fi megszakítás útválasztó' },
    ],
  },
  {
    id: 'BT_MAC_INTR',
    name: 'BT_MAC_INTR (Bluetooth LE Rádió & HCI)',
    sourceNum: 5,
    category: 'wireless',
    defaultPriority: 3,
    triggerType: 'LEVEL',
    coreAffinity: 0,
    description: 'Bluetooth 4.2 BR/EDR és BLE link-layer csomagesemények.',
    hardwareSource: 'Bluetooth Controller Baseband',
    registers: [
      { name: 'DPORT_PRO_BT_MAC_INTR_MAP_REG', bit: 'Bit 0-4', addressHex: '0x3FF00114', description: 'Bluetooth megszakítás útvonal' },
    ],
  },
  {
    id: 'I2S0_INTR',
    name: 'I2S0_INTR (I2S0 Audio DMA Stream)',
    sourceNum: 10,
    category: 'comm',
    defaultPriority: 2,
    triggerType: 'LEVEL',
    coreAffinity: 'both',
    description: 'Digitális audió interfész DMA puffer telítettségi vagy underrun megszakítás (DAC/Microphone adatfolyam).',
    hardwareSource: 'I2S0 Audio Controller',
    registers: [
      { name: 'I2S_INT_ENA_REG', bit: 'Bit 0 (RX_DONE), Bit 1 (TX_DONE)', addressHex: '0x3FF4F00C', description: 'I2S0 megszakítás maszk' },
    ],
  },
  {
    id: 'I2S1_INTR',
    name: 'I2S1_INTR (I2S1 Audio DMA Stream)',
    sourceNum: 11,
    category: 'comm',
    defaultPriority: 2,
    triggerType: 'LEVEL',
    coreAffinity: 'both',
    description: 'Második I2S audió DMA csatorna megszakítása.',
    hardwareSource: 'I2S1 Audio Controller',
    registers: [
      { name: 'I2S1_INT_ENA_REG', bit: 'Bit 0 (RX_DONE), Bit 1 (TX_DONE)', addressHex: '0x3FF6D00C', description: 'I2S1 megszakítás maszk' },
    ],
  },
  {
    id: 'MCPWM0_INTR',
    name: 'MCPWM0_INTR (Motor Vezérlő PWM 0)',
    sourceNum: 37,
    category: 'timer',
    defaultPriority: 2,
    triggerType: 'LEVEL',
    coreAffinity: 'both',
    description: 'Kefés és BLDC motorvezérlő PWM alrendszer hibaérzékelési vagy periódustető megszakítása.',
    hardwareSource: 'Motor Control PWM 0',
    registers: [
      { name: 'MCPWM_INT_ENA_REG', bit: 'Bit 0-17', addressHex: '0x3FF5E06C', description: 'MCPWM0 megszakítás maszk' },
    ],
  },
  {
    id: 'MCPWM1_INTR',
    name: 'MCPWM1_INTR (Motor Vezérlő PWM 1)',
    sourceNum: 38,
    category: 'timer',
    defaultPriority: 2,
    triggerType: 'LEVEL',
    coreAffinity: 'both',
    description: 'Második motorvezérlő PWM alrendszer megszakítása.',
    hardwareSource: 'Motor Control PWM 1',
    registers: [
      { name: 'MCPWM1_INT_ENA_REG', bit: 'Bit 0-17', addressHex: '0x3FF6C06C', description: 'MCPWM1 megszakítás maszk' },
    ],
  },
  {
    id: 'PCNT_INTR',
    name: 'PCNT_INTR (Hardveres Impulzusszámláló)',
    sourceNum: 48,
    category: 'timer',
    defaultPriority: 1,
    triggerType: 'LEVEL',
    coreAffinity: 'both',
    description: '8 csatornás impulzusszámláló periféria (rotary encoder, fordulatszámmérő) határérték riasztás.',
    hardwareSource: 'PCNT Subsystem (Unit 0-7)',
    registers: [
      { name: 'PCNT_INT_ENA_REG', bit: 'Bit 0-7', addressHex: '0x3FF57014', description: 'PCNT csatorna megszakítás engedélyezés' },
    ],
  },
  {
    id: 'LEDC_INTR',
    name: 'LEDC_INTR (LED PWM Fade Befejezés)',
    sourceNum: 43,
    category: 'timer',
    defaultPriority: 1,
    triggerType: 'LEVEL',
    coreAffinity: 'both',
    description: '16 csatornás hardveres LEDC PWM automatikus fényerőátmenet (fade) befejezési esemény.',
    hardwareSource: 'LEDC Subsystem',
    registers: [
      { name: 'LEDC_INT_ENA_REG', bit: 'Bit 0-15 (DUTY_CHNG_END)', addressHex: '0x3FF59018', description: 'LED PWM Fade megszakítás maszk' },
    ],
  },
  {
    id: 'ADC1_INTR',
    name: 'ADC1_INTR (ADC1 Analóg Konverzió Kész)',
    sourceNum: 32,
    category: 'analog_sensor',
    defaultPriority: 1,
    triggerType: 'LEVEL',
    coreAffinity: 'both',
    description: '8 csatornás SAR ADC1 nagy sebességű vagy DMA mintavételezés befejezési megszakítása (GPIO 32-39).',
    hardwareSource: 'ADC1 SAR Controller (Wi-Fi közben is használható)',
    registers: [
      { name: 'APB_SARADC_INT_ENA_REG', bit: 'Bit 0 (THRES0), Bit 1 (THRES1)', addressHex: '0x3FF66020', description: 'ADC megszakítás maszk' },
    ],
  },
  {
    id: 'ADC2_INTR',
    name: 'ADC2_INTR (ADC2 Analóg Konverzió Kész)',
    sourceNum: 33,
    category: 'analog_sensor',
    defaultPriority: 1,
    triggerType: 'LEVEL',
    coreAffinity: 1,
    description: 'ADC2 csatornák (GPIO 0, 2, 4, 12-15, 25-27) analóg átalakítás kész eseménye (Wi-Fi használatkor korlátozott).',
    hardwareSource: 'ADC2 SAR Controller',
    registers: [
      { name: 'APB_SARADC_INT_ENA_REG', bit: 'Bit 2 (ADC2_DONE)', addressHex: '0x3FF66020', description: 'ADC2 státusz és maszk' },
    ],
  },
  {
    id: 'SOFTWARE_INTR0',
    name: 'SOFTWARE_INTR0 (FreeRTOS Core 0 Szoftveres IPC)',
    sourceNum: 29,
    category: 'system_freertos',
    defaultPriority: 1,
    triggerType: 'EDGE',
    coreAffinity: 0,
    description: 'Magok közötti szálváltás (Cross-Core IPC Task Preemption) és azonnali ütemezés Core 0-n.',
    hardwareSource: 'Xtensa Core 0 Software Interrupt Controller',
    registers: [
      { name: 'DPORT_CPU_INTR_FROM_CPU_0_REG', bit: 'Bit 0', addressHex: '0x3FF000DC', description: 'Core 0 szoftveres megszakítás trigger' },
    ],
  },
  {
    id: 'SOFTWARE_INTR1',
    name: 'SOFTWARE_INTR1 (FreeRTOS Core 1 Szoftveres IPC)',
    sourceNum: 30,
    category: 'system_freertos',
    defaultPriority: 1,
    triggerType: 'EDGE',
    coreAffinity: 1,
    description: 'Cross-Core Inter-Processor Call (IPC) és taszk értesítés Core 1-en futó felhasználói szálakhoz.',
    hardwareSource: 'Xtensa Core 1 Software Interrupt Controller',
    registers: [
      { name: 'DPORT_CPU_INTR_FROM_CPU_1_REG', bit: 'Bit 0', addressHex: '0x3FF000E0', description: 'Core 1 szoftveres megszakítás trigger' },
    ],
  },
  {
    id: 'DEDICATED_GPIO_INTR',
    name: 'DEDICATED_GPIO_INTR (Xtensa Dedikált Gyors GPIO)',
    sourceNum: 60,
    category: 'gpio',
    defaultPriority: 3,
    triggerType: 'EDGE',
    coreAffinity: 'both',
    description: 'Közvetlenül a CPU regiszterekhez kapcsolt, buszkésleltetés nélküli szupergyors I/O megszakítás.',
    hardwareSource: 'Xtensa Fast Dedicated IO Channel',
    registers: [
      { name: 'CPU_GPIO_INTR_ENA_REG', bit: 'Bit 0-7', addressHex: '0x3FF44060', description: 'Dedikált CPU GPIO maszk' },
    ],
  },
  {
    id: 'FRC1_INTR',
    name: 'FRC1_INTR (Fast Legacy Timer)',
    sourceNum: 14,
    category: 'timer',
    defaultPriority: 3,
    triggerType: 'LEVEL',
    coreAffinity: 0,
    description: '23-bites gyors hardveres visszaszámláló időzítő ultra alacsony késleltetésű mikroszekundumos feladatokhoz.',
    hardwareSource: 'Fast RC Timer 1 (APB Clock @ 80 MHz)',
    registers: [
      { name: 'FRC1_LOAD_REG', bit: 'Bit 0-22', addressHex: '0x3FF47000', description: 'FRC1 induló számláló érték' },
    ],
  },
];

export const DEFAULT_ESP32_INTERRUPT_CONFIGS: Record<string, Esp32InterruptConfig> = {
  GPIO_INTR: {
    id: 'GPIO_INTR',
    enabled: true,
    coreAffinity: 1,
    priorityLevel: 1,
    triggerType: 'EDGE',
    useIramAttr: true,
    gpioPin: 4,
    gpioTriggerMode: 'FALLING',
    pullMode: 'PULLUP',
    customIsrAction: 'toggle_pin',
    targetPin: 2,
    description: 'GPIO 4 Lehúzó él (FALLING) gombnyomás -> GPIO 2 (Kék beépített LED) állapotváltás',
  },
  TG0_T0_LEVEL: {
    id: 'TG0_T0_LEVEL',
    enabled: true,
    coreAffinity: 0,
    priorityLevel: 2,
    triggerType: 'LEVEL',
    useIramAttr: true,
    timerGroup: 0,
    timerIndex: 0,
    alarmIntervalUs: 1000, // 1 ms @ 1000 Hz
    autoReload: true,
    divider: 80, // 80 MHz / 80 = 1 MHz (1 tick = 1 µs)
    customIsrAction: 'increment_counter',
    description: 'Timer Group 0 Timer 0 @ 1000 Hz (1000 µs riasztás, Auto-Reload)',
  },
  TOUCH_PAD_INTR: {
    id: 'TOUCH_PAD_INTR',
    enabled: false,
    coreAffinity: 1,
    priorityLevel: 1,
    triggerType: 'LEVEL',
    useIramAttr: true,
    touchPadIndex: 0, // GPIO 4 (T0)
    touchThreshold: 400,
    customIsrAction: 'notify_task',
    targetTaskName: 'touchTask',
    description: 'Kapacitív T0 Érintésérzékelés (GPIO 4 küszöbérték riasztás)',
  },
};

export function createInitialEsp32InterruptState(): Esp32InterruptState {
  const configs: Record<string, Esp32InterruptConfig> = {};
  ESP32_INTERRUPT_SOURCES.forEach((s) => {
    if (DEFAULT_ESP32_INTERRUPT_CONFIGS[s.id]) {
      configs[s.id] = { ...DEFAULT_ESP32_INTERRUPT_CONFIGS[s.id] };
    } else {
      configs[s.id] = {
        id: s.id,
        enabled: false,
        coreAffinity: s.coreAffinity === 'both' ? 1 : s.coreAffinity,
        priorityLevel: s.defaultPriority,
        triggerType: s.triggerType,
        useIramAttr: true,
        customIsrAction: 'toggle_pin',
        targetPin: 2,
        description: s.description,
      };
    }
  });

  return {
    globalInterruptsEnabled: true,
    core0IntMask: 0xffffffff,
    core1IntMask: 0xffffffff,
    configs: configs,
    pendingInterrupts: [],
    eventLog: [
      {
        id: 'evt_esp_init',
        sourceId: 'TG0_T0_LEVEL',
        name: 'TG0_T0_LEVEL (Timer Group 0 Timer 0)',
        coreId: 0,
        timestampNs: 0,
        latencyNs: 45,
        priority: 2,
        details: 'Xtensa Interrupt Matrix Inicializálva: PRO_CPU Core 0 & APP_CPU Core 1 készen áll.',
      },
    ],
    totalFiredCount: 0,
    core0FiredCount: 0,
    core1FiredCount: 0,
    firingCount: {},
  };
}

export function calculateEsp32TimerAlarmParams(
  clockFreqHz: number = 80000000,
  alarmIntervalUs: number = 1000,
  divider: number = 80
) {
  const tickFreqHz = clockFreqHz / (divider || 1);
  const tickDurationUs = 1000000 / tickFreqHz;
  const alarmTicks = Math.round(alarmIntervalUs / tickDurationUs);
  const frequencyHz = Math.round(1000000 / alarmIntervalUs);

  return {
    divider,
    tickFreqHz,
    tickDurationUs,
    alarmTicks,
    frequencyHz,
    alarmTicksHex: `0x${alarmTicks.toString(16).toUpperCase()}`,
  };
}

export function generateEsp32InterruptCppCode(cfg: Esp32InterruptConfig): string {
  const isrFuncName = `${cfg.id.toLowerCase()}_isr_handler`;
  const iramPrefix = cfg.useIramAttr ? 'IRAM_ATTR ' : '';
  const coreComment =
    cfg.coreAffinity === 0
      ? '// Futtatás: PRO_CPU (Core 0)'
      : cfg.coreAffinity === 1
      ? '// Futtatás: APP_CPU (Core 1)'
      : '// Futtatás: Bármelyik szabad magon';

  if (cfg.id === 'GPIO_INTR') {
    const pin = cfg.gpioPin !== undefined ? cfg.gpioPin : 4;
    const mode = cfg.gpioTriggerMode || 'FALLING';
    const targetPin = cfg.targetPin !== undefined ? cfg.targetPin : 2;

    return `// ==========================================
// ESP32 HARDWARE GPIO INTERRUPT (ESP-IDF / Arduino)
// ${coreComment}
// ==========================================
#include <Arduino.h>
#include "esp_intr_alloc.h"

#define BTN_PIN    ${pin}
#define TARGET_PIN ${targetPin}

// Nagy sebességű ISR a belső IRAM-ban tárolva (Flash Cache hiba elkerülése)
void ${iramPrefix}${isrFuncName}(void* arg) {
    BaseType_t xHigherPriorityTaskWoken = pdFALSE;

    // Hardveres ISR Akció
    ${
      cfg.customIsrAction === 'toggle_pin'
        ? `digitalWrite(TARGET_PIN, !digitalRead(TARGET_PIN));`
        : cfg.customIsrAction === 'increment_counter'
        ? `static volatile uint32_t press_count = 0;\n    press_count++;`
        : cfg.customIsrAction === 'send_queue'
        ? `uint32_t eventData = 0xAA;\n    xQueueSendFromISR(hQueue, &eventData, &xHigherPriorityTaskWoken);`
        : cfg.customIsrAction === 'notify_task'
        ? `vTaskNotifyGiveFromISR(hTaskHandle, &xHigherPriorityTaskWoken);`
        : cfg.customCodeSnippet || `// Egyedi ISR kód`
    }

    // FreeRTOS taszk előjegyzés ellenőrzése
    if (xHigherPriorityTaskWoken == pdTRUE) {
        portYIELD_FROM_ISR();
    }
}

void setup() {
    Serial.begin(115200);
    pinMode(TARGET_PIN, OUTPUT);
    pinMode(BTN_PIN, ${cfg.pullMode === 'PULLUP' ? 'INPUT_PULLUP' : cfg.pullMode === 'PULLDOWN' ? 'INPUT_PULLDOWN' : 'INPUT'});

    // Megszakítás csatolása a GPIO-hoz (${mode} élérzékelés)
    attachInterruptArg(digitalPinToInterrupt(BTN_PIN), ${isrFuncName}, NULL, ${mode});

    Serial.println("[ESP32] GPIO Megszakítás aktív a GPIO ${pin} lábon (${mode}).");
}

void loop() {
    vTaskDelay(pdMS_TO_TICKS(1000));
}`;
  }

  if (cfg.id.startsWith('TG')) {
    const tg = cfg.timerGroup || 0;
    const tIdx = cfg.timerIndex || 0;
    const intervalUs = cfg.alarmIntervalUs || 1000;
    const divider = cfg.divider || 80;
    const autoReload = cfg.autoReload !== false;
    const calc = calculateEsp32TimerAlarmParams(80000000, intervalUs, divider);

    return `// ==========================================
// ESP32 64-BIT HARDWARE TIMER INTERRUPT (Timer Group ${tg}, Timer ${tIdx})
// ${coreComment}
// ==========================================
#include <Arduino.h>
#include "driver/timer.h"

#define TIMER_DIVIDER   ${divider}     // 80 MHz / ${divider} = ${calc.tickFreqHz / 1000000} MHz (1 tick = ${calc.tickDurationUs} µs)
#define ALARM_TICKS     ${calc.alarmTicks}ULL  // ${intervalUs} µs riasztás (${calc.frequencyHz} Hz)

// Hardveres Időzítő ISR Callback
bool ${iramPrefix}${isrFuncName}(void *args) {
    BaseType_t high_task_awoken = pdFALSE;

    // Hardveres állapotváltás vagy számlálás
    ${
      cfg.customIsrAction === 'toggle_pin'
        ? `static bool state = false;\n    state = !state;\n    digitalWrite(${cfg.targetPin || 2}, state);`
        : `static volatile uint64_t timer_ticks = 0;\n    timer_ticks++;`
    }

    return (high_task_awoken == pdTRUE); // Task context switch szükséges-e
}

void init_hardware_timer() {
    timer_config_t config = {
        .alarm_en = TIMER_ALARM_EN,
        .counter_en = TIMER_PAUSE,
        .intr_type = TIMER_INTR_LEVEL,
        .counter_dir = TIMER_COUNT_UP,
        .auto_reload = ${autoReload ? 'TIMER_AUTORELOAD_EN' : 'TIMER_AUTORELOAD_DIS'},
        .divider = TIMER_DIVIDER,
    };

    timer_init(TIMER_GROUP_${tg}, TIMER_${tIdx}, &config);
    timer_set_counter_value(TIMER_GROUP_${tg}, TIMER_${tIdx}, 0);
    timer_set_alarm_value(TIMER_GROUP_${tg}, TIMER_${tIdx}, ALARM_TICKS);
    timer_enable_intr(TIMER_GROUP_${tg}, TIMER_${tIdx});
    timer_isr_callback_add(TIMER_GROUP_${tg}, TIMER_${tIdx}, ${isrFuncName}, NULL, 0);
    timer_start(TIMER_GROUP_${tg}, TIMER_${tIdx});

    Serial.printf("[ESP32] Hardware Timer Group %d Timer %d elindítva (%d Hz).\\n", ${tg}, ${tIdx}, ${calc.frequencyHz});
}`;
  }

  if (cfg.id === 'TOUCH_PAD_INTR') {
    const padIdx = cfg.touchPadIndex !== undefined ? cfg.touchPadIndex : 0;
    const thresh = cfg.touchThreshold || 400;

    return `// ==========================================
// ESP32 CAPACITIVE TOUCH SENSOR INTERRUPT (T${padIdx})
// ${coreComment}
// ==========================================
#include <Arduino.h>
#include "driver/touch_pad.h"

#define TOUCH_PAD_NUM    TOUCH_PAD_NUM${padIdx}
#define TOUCH_THRESHOLD  ${thresh}

void ${iramPrefix}${isrFuncName}(void *arg) {
    uint32_t pad_intr = touch_pad_get_status();
    touch_pad_clear_status();

    if ((pad_intr >> TOUCH_PAD_NUM) & 0x01) {
        // Kapacitív érintés történt!
        digitalWrite(${cfg.targetPin || 2}, !digitalRead(${cfg.targetPin || 2}));
    }
}

void setup() {
    Serial.begin(115200);
    pinMode(${cfg.targetPin || 2}, OUTPUT);

    touch_pad_init();
    touch_pad_set_voltage(TOUCH_HVOLT_2V7, TOUCH_LVOLT_0V5, TOUCH_HVOLT_ATTEN_1V);
    touch_pad_config(TOUCH_PAD_NUM, TOUCH_THRESHOLD);
    touch_pad_isr_register(${isrFuncName}, NULL);
    touch_pad_intr_enable();

    Serial.println("[ESP32] Kapacitív Touch T${padIdx} megszakítás bekapcsolva.");
}`;
  }

  // Generic ESP32 Interrupt
  return `// ==========================================
// ESP32 HARDWARE INTERRUPT: ${cfg.id}
// ${coreComment} | Prioritási szint: Level ${cfg.priorityLevel}
// ==========================================
#include <Arduino.h>
#include "esp_intr_alloc.h"

static intr_handle_t s_intr_handle;

void ${iramPrefix}${isrFuncName}(void* arg) {
    // Alacsony szintű ISR kód
    ${cfg.customCodeSnippet || `// Kezeld a(z) ${cfg.id} eseményt`}
}

void setup_custom_intr() {
    // Xtensa Interrupt Matrix Allokáció
    esp_intr_alloc(
        ETS_${cfg.id}_SOURCE,
        ESP_INTR_FLAG_LEVEL${cfg.priorityLevel} | ${cfg.useIramAttr ? 'ESP_INTR_FLAG_IRAM' : '0'},
        ${isrFuncName},
        NULL,
        &s_intr_handle
    );
}`;
}

export function generateEsp32XtensaAsmCode(cfg: Esp32InterruptConfig): string {
  const isrName = `${cfg.id.toLowerCase()}_handler_asm`;
  return `/* =========================================================
 * XTENSA LX6 ASSEMBLY - MEGSZAKÍTÁS VEKTOR ÉS ISR HANDLER
 * Forrás: ${cfg.id} | Prioritás: Level ${cfg.priorityLevel}
 * ========================================================= */
    .section .iram1.text, "ax"
    .align 4
    .global ${isrName}
    .type ${isrName}, @function

${isrName}:
    /* 1. Menti a megszakított taszk regisztereit a stackre */
    entry   a1, 32
    s32i    a2, a1, 0
    s32i    a3, a1, 4
    s32i    a4, a1, 8

    /* 2. Beolvassa az interrupt állapotot és tisztítja a flaget */
    movi    a2, 0x3FF44044          /* GPIO_STATUS_REG */
    l32i    a3, a2, 0
    s32i    a3, a2, 0               /* W1C: Írással töröljük a flaget */

    /* 3. Hardveres I/O művelet (GPIO 2 toggling) */
    movi    a2, 0x3FF44004          /* GPIO_OUT_REG */
    l32i    a3, a2, 0
    movi    a4, (1 << ${cfg.targetPin || 2})
    xor     a3, a3, a4
    s32i    a3, a2, 0

    /* 4. Visszatölti a regisztereket és visszatér */
    l32i    a2, a1, 0
    l32i    a3, a1, 4
    l32i    a4, a1, 8
    retw.n                          /* Xtensa Windowed Return */
`;
}
