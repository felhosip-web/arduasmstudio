import React, { useState, useRef } from 'react';
import {
  Layers,
  Plus,
  Trash2,
  Tv,
  Clock,
  Binary,
  HardDrive,
  Radio,
  Disc,
  Sparkles,
  RefreshCw,
  Power,
  RotateCw,
  RotateCcw,
  Sliders,
  Send,
  FileText,
  CheckCircle2,
  Activity,
  Cpu,
  Zap,
  Info,
  X,
  Volume2,
  Thermometer,
  Bluetooth,
  BluetoothConnected,
  Wifi,
  Database,
  Lock,
  Unlock,
  Download,
  Upload,
  Search,
  Copy,
  Check,
  AlertCircle,
  FileCode,
} from 'lucide-react';
import { HardwareModule, HardwareModuleType, ArduinoPin } from '../types';
import { MODULE_CATALOG, ModuleCatalogItem } from '../data/defaultModules';

interface HardwareModulesPanelProps {
  modules: HardwareModule[];
  onUpdateModules: (modules: HardwareModule[]) => void;
  onPinChange?: (pin: ArduinoPin, value: 0 | 1) => void;
}

const MODULE_ICONS: Record<HardwareModuleType, any> = {
  lcd_1602: Tv,
  rtc_ds1307: Clock,
  shift_74hc595: Binary,
  sd_card: HardDrive,
  nrf24l01: Radio,
  rotary_encoder: Disc,
  discrete_leds: Sparkles,
  ds18b20_temp: Thermometer,
  bluetooth_spp: Bluetooth,
  eeprom_24cxxx: Database,
  eeprom_25lcxxx: Database,
  flash_w25qxx: HardDrive,
  expander_mcp23017: Cpu,
  expander_pcf8574: Sliders,
  shift_74hc165: Layers,
};

const SPI_EEPROM_CHIP_SPECS: Record<string, { capacity: number; pageSize: number; addrBytes: 1 | 2 | 3; label: string; desc: string }> = {
  '25LC040': { capacity: 512, pageSize: 16, addrBytes: 1, label: '25LC040 (512 B / 4 Kbit)', desc: '8-bites cím + A8 bit az opkódban, 16B lapméret' },
  '25LC160': { capacity: 2048, pageSize: 32, addrBytes: 2, label: '25LC160 (2 KB / 16 Kbit)', desc: '16-bites címzés, 32B lapméret' },
  '25LC640': { capacity: 8192, pageSize: 32, addrBytes: 2, label: '25LC640 (8 KB / 64 Kbit)', desc: '16-bites címzés, 32B lapméret' },
  '25LC256': { capacity: 32768, pageSize: 64, addrBytes: 2, label: '25LC256 (32 KB / 256 Kbit)', desc: '16-bites címzés, 64B lapméret (Szabvány SPI EEPROM)' },
  '25LC512': { capacity: 65536, pageSize: 128, addrBytes: 2, label: '25LC512 (64 KB / 512 Kbit)', desc: '16-bites címzés, 128B lapméret' },
  '25LC1024': { capacity: 131072, pageSize: 256, addrBytes: 3, label: '25LC1024 (128 KB / 1 Mbit)', desc: '24-bites címzés, 256B lapméret' },
};

const FLASH_CHIP_SPECS: Record<string, { capacity: number; capacityMB: number; jedecId: number; label: string }> = {
  'W25Q16': { capacity: 2097152, capacityMB: 2, jedecId: 0x15, label: 'W25Q16 (16 Mbit / 2 MB - 512 szektor)' },
  'W25Q32': { capacity: 4194304, capacityMB: 4, jedecId: 0x16, label: 'W25Q32 (32 Mbit / 4 MB - 1024 szektor - Alap)' },
  'W25Q64': { capacity: 8388608, capacityMB: 8, jedecId: 0x17, label: 'W25Q64 (64 Mbit / 8 MB - 2048 szektor)' },
  'W25Q128': { capacity: 16777216, capacityMB: 16, jedecId: 0x18, label: 'W25Q128 (128 Mbit / 16 MB - 4096 szektor)' },
};

const EEPROM_CHIP_SPECS: Record<string, { capacity: number; pageSize: number; addrBits: 8 | 16; label: string; desc: string }> = {
  '24C02': { capacity: 256, pageSize: 8, addrBits: 8, label: '24C02 (256 B / 2 Kbit)', desc: '8-bites címzés, 8B lapméret, 32 lap' },
  '24C04': { capacity: 512, pageSize: 16, addrBits: 8, label: '24C04 (512 B / 4 Kbit)', desc: '8-bites címzés + A0 blokkbit, 16B lapméret' },
  '24C08': { capacity: 1024, pageSize: 16, addrBits: 8, label: '24C08 (1 KB / 8 Kbit)', desc: '8-bites címzés + A0/A1 blokkbitek, 16B lapméret' },
  '24C16': { capacity: 2048, pageSize: 16, addrBits: 8, label: '24C16 (2 KB / 16 Kbit)', desc: '8-bites címzés + A0/A1/A2 blokkbitek, 16B lapméret' },
  '24C32': { capacity: 4096, pageSize: 32, addrBits: 16, label: '24C32 (4 KB / 32 Kbit)', desc: '16-bites címzés (MSB/LSB), 32B lapméret' },
  '24C64': { capacity: 8192, pageSize: 32, addrBits: 16, label: '24C64 (8 KB / 64 Kbit)', desc: '16-bites címzés, 32B lapméret' },
  '24C128': { capacity: 16384, pageSize: 64, addrBits: 16, label: '24C128 (16 KB / 128 Kbit)', desc: '16-bites címzés, 64B lapméret' },
  '24C256': { capacity: 32768, pageSize: 64, addrBits: 16, label: '24C256 (32 KB / 256 Kbit)', desc: '16-bites címzés, 64B lapméret (Gyakori Arduino Uno/Nano Shield)' },
  '24C512': { capacity: 65536, pageSize: 128, addrBits: 16, label: '24C512 (64 KB / 512 Kbit)', desc: '16-bites címzés, 128B lapméret' },
  '24C1024': { capacity: 131072, pageSize: 256, addrBits: 16, label: '24C1024 (128 KB / 1 Mbit)', desc: '16-bites címzés + bankbit, 256B lapméret' },
};

export const HardwareModulesPanel: React.FC<HardwareModulesPanelProps> = ({
  modules,
  onUpdateModules,
  onPinChange,
}) => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedCatalogCategory, setSelectedCatalogCategory] = useState<string>('Mind');
  const [activeTabModuleId, setActiveTabModuleId] = useState<string>(modules[0]?.id || '');
  const [newFileName, setNewFileName] = useState('');
  const [testLcdText, setTestLcdText] = useState('');
  const [testLcdRow, setTestLcdRow] = useState<'0' | '1'>('0');
  const [nrfCustomPayload, setNrfCustomPayload] = useState('ARDU_PACKET_#1');

  // 24Cxxx EEPROM States
  const [eepromWriteAddr, setEepromWriteAddr] = useState('0x0010');
  const [eepromWriteVal, setEepromWriteVal] = useState('0x42');
  const [eepromWriteStringAddr, setEepromWriteStringAddr] = useState('0x0020');
  const [eepromWriteStringVal, setEepromWriteStringVal] = useState('TEMP_SENSOR_LOG');
  const [eepromViewOffset, setEepromViewOffset] = useState(0);
  const [eepromSearchTerm, setEepromSearchTerm] = useState('');
  const [eepromCopied, setEepromCopied] = useState(false);
  const [eepromExportFormat, setEepromExportFormat] = useState<'c_array' | 'hex' | 'json'>('c_array');
  const [isEepromExportModalOpen, setIsEepromExportModalOpen] = useState(false);

  // Update a single module by ID
  const updateModule = (id: string, updater: (mod: HardwareModule) => HardwareModule) => {
    const updated = modules.map((m) => (m.id === id ? updater(m) : m));
    onUpdateModules(updated);
  };

  // Remove a module
  const removeModule = (id: string) => {
    const updated = modules.filter((m) => m.id !== id);
    onUpdateModules(updated);
    if (activeTabModuleId === id && updated.length > 0) {
      setActiveTabModuleId(updated[0].id);
    }
  };

  // Add a module from catalog
  const addModuleFromCatalog = (item: ModuleCatalogItem) => {
    const newId = `mod-${item.type}-${Date.now()}`;
    const newMod: HardwareModule = {
      id: newId,
      type: item.type,
      name: item.name,
      enabled: true,
      pins: { ...item.defaultPins } as any,
      state: item.createDefaultState(),
    };
    const updated = [...modules, newMod];
    onUpdateModules(updated);
    setActiveTabModuleId(newId);
    setIsAddModalOpen(false);
  };

  // Rotary Encoder step helper
  const handleRotaryStep = (modId: string, direction: 'CW' | 'CCW') => {
    updateModule(modId, (mod) => {
      const delta = direction === 'CW' ? 1 : -1;
      const newPos = (mod.state.position || 0) + delta;
      const newAngle = ((mod.state.angleDeg || 0) + delta * 18) % 360;

      // Simulate Quadrature pins CLK / DT on Arduino
      if (onPinChange && mod.pins.CLK && mod.pins.DT) {
        onPinChange(mod.pins.CLK as ArduinoPin, 0);
        setTimeout(() => {
          if (onPinChange && mod.pins.CLK) onPinChange(mod.pins.CLK as ArduinoPin, 1);
        }, 100);
      }

      return {
        ...mod,
        state: {
          ...mod.state,
          position: newPos,
          angleDeg: newAngle,
          phaseA: direction === 'CW' ? 1 : 0,
          phaseB: direction === 'CW' ? 0 : 1,
          lastDirection: direction,
        },
      };
    });
  };

  const activeModule = modules.find((m) => m.id === activeTabModuleId) || modules[0];

  const categories = ['Mind', 'Kijelzők', 'Időzítés & Memória', 'Bemenetek & Érzékelők', 'Kommunikáció', 'Kimenetek'];

  const filteredCatalog = MODULE_CATALOG.filter((catItem) => {
    if (selectedCatalogCategory === 'Mind') return true;
    return catItem.category === selectedCatalogCategory;
  });

  return (
    <div id="hardware-modules-panel" className="space-y-3">
      {/* Header bar with Add Module Button */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-[#161920] border border-[#2A2D35] rounded-xs shadow-[2px_2px_0px_#000]">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-[#38bdf8]/10 text-[#38bdf8] border border-[#38bdf8]/30 rounded-xs">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#E0E0E6] flex items-center gap-1.5">
              Csatlakoztatott Hardverek
              <span className="bg-[#1A1D24] text-[#38bdf8] border border-[#38bdf8]/30 px-1.5 py-0.2 text-[10px] font-mono rounded-xs">
                {modules.length} db
              </span>
            </h3>
            <p className="text-[10px] text-[#8A8D98]">
              Interaktív I2C, SPI, 74HC595, LCD, RTC, Rádió és Encóder modulok
            </p>
          </div>
        </div>

        <button
          id="btn-add-module-modal"
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#38bdf8] hover:bg-[#0284c7] text-black font-bold text-xs uppercase tracking-wider rounded-xs transition-all shadow-[2px_2px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>+ Új Modul Csatlakoztatása</span>
        </button>
      </div>

      {/* Module Selector Tabs */}
      {modules.length > 0 && (
        <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-thin">
          {modules.map((mod) => {
            const IconComponent = MODULE_ICONS[mod.type] || Layers;
            const isActive = mod.id === activeTabModuleId;
            return (
              <button
                key={mod.id}
                onClick={() => setActiveTabModuleId(mod.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xs text-[11px] font-bold uppercase tracking-wider whitespace-nowrap transition-all border shadow-[1px_1px_0px_#000] cursor-pointer ${
                  isActive
                    ? 'bg-[#1A1D24] text-[#38bdf8] border-[#38bdf8]'
                    : 'bg-[#12141A] text-[#8A8D98] hover:text-[#E0E0E6] border-[#2A2D35] hover:border-[#3A3F4B]'
                }`}
              >
                <IconComponent className="w-3.5 h-3.5" />
                <span>{mod.name}</span>
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    mod.enabled ? 'bg-[#4ade80] shadow-[0_0_4px_#4ade80]' : 'bg-[#6B7280]'
                  }`}
                />
              </button>
            );
          })}
        </div>
      )}

      {/* Active Module Card Content */}
      {activeModule ? (
        <div className="p-3 bg-[#161920] border border-[#2A2D35] rounded-xs shadow-[2px_2px_0px_#000] space-y-3">
          {/* Module Header Bar */}
          <div className="flex items-center justify-between border-b border-[#2A2D35] pb-2.5">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-[#38bdf8] shadow-[0_0_6px_#38bdf8]" />
              <h4 className="text-xs font-bold text-[#E0E0E6] uppercase tracking-wider">
                {activeModule.name}
              </h4>
              <span className="text-[10px] font-mono text-[#8A8D98] bg-[#1A1D24] px-2 py-0.5 border border-[#2A2D35] rounded-xs">
                Típus: {activeModule.type}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() =>
                  updateModule(activeModule.id, (m) => ({ ...m, enabled: !m.enabled }))
                }
                className={`flex items-center gap-1 px-2 py-1 text-[10px] font-bold rounded-xs border transition-all cursor-pointer ${
                  activeModule.enabled
                    ? 'bg-[#4ade80]/10 text-[#4ade80] border-[#4ade80]/40'
                    : 'bg-[#2A2D35] text-[#8A8D98] border-[#3A3F4B]'
                }`}
              >
                <Power className="w-3 h-3" />
                <span>{activeModule.enabled ? 'AKTÍV' : 'KIKAPCSOLVA'}</span>
              </button>

              <button
                onClick={() => removeModule(activeModule.id)}
                className="flex items-center gap-1 px-2 py-1 bg-[#ef4444]/10 hover:bg-[#ef4444] text-[#ef4444] hover:text-white border border-[#ef4444]/30 rounded-xs text-[10px] font-bold transition-all cursor-pointer"
                title="Modul leválasztása"
              >
                <Trash2 className="w-3 h-3" />
                <span className="hidden sm:inline">Eltávolítás</span>
              </button>
            </div>
          </div>

          {/* Wiring Pins Info Strip */}
          <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono p-2 bg-[#12141A] border border-[#2A2D35] rounded-xs">
            <span className="text-[#8A8D98] font-bold uppercase">Arduino Lábak:</span>
            {Object.entries(activeModule.pins).map(([pinKey, pinVal]) => {
              const valStr = String(pinVal);
              return (
                <span
                  key={pinKey}
                  className="px-2 py-0.5 bg-[#1A1D24] text-[#38bdf8] border border-[#2A2D35] rounded-xs flex items-center gap-1"
                >
                  <span className="text-[#8A8D98]">{pinKey}:</span>
                  <span className="font-bold">
                    {valStr.startsWith('A') ? valStr : `D${valStr}`}
                  </span>
                </span>
              );
            })}
          </div>

          {/* ======================================================== */}
          {/* 1. 16x2 I2C LCD DISPLAY COMPONENT */}
          {/* ======================================================== */}
          {activeModule.type === 'lcd_1602' && (
            <div className="space-y-3">
              {/* Photorealistic LCD Screen */}
              <div
                className={`p-4 rounded-sm border-4 transition-all shadow-[inset_0_0_12px_rgba(0,0,0,0.8)] ${
                  activeModule.state.backlight
                    ? 'bg-[#002b49] border-[#0284c7] text-[#38bdf8]'
                    : 'bg-[#0a1017] border-[#1e293b] text-[#334155]'
                }`}
              >
                <div className="flex justify-between items-center text-[9px] font-mono pb-1 border-b border-sky-900/40 mb-2">
                  <span className="tracking-widest uppercase opacity-80">
                    HD44780 + PCF8574 (0x27)
                  </span>
                  <span className="flex items-center gap-1">
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        activeModule.state.backlight ? 'bg-[#38bdf8] shadow-[0_0_4px_#38bdf8]' : 'bg-gray-600'
                      }`}
                    />
                    BL: {activeModule.state.backlight ? 'ON' : 'OFF'}
                  </span>
                </div>

                <div className="font-mono text-sm sm:text-base font-black tracking-[0.2em] leading-relaxed space-y-1 select-none">
                  {/* Line 0 */}
                  <div className="bg-[#001f35]/50 px-2 py-0.5 rounded-xs border border-sky-900/30 whitespace-pre">
                    {activeModule.state.line0?.padEnd(16, ' ') || '                '}
                  </div>
                  {/* Line 1 */}
                  <div className="bg-[#001f35]/50 px-2 py-0.5 rounded-xs border border-sky-900/30 whitespace-pre">
                    {activeModule.state.line1?.padEnd(16, ' ') || '                '}
                  </div>
                </div>
              </div>

              {/* LCD Interactive Controls */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {/* Backlight toggle & Clear */}
                <div className="flex items-center gap-2 p-2 bg-[#12141A] border border-[#2A2D35] rounded-xs">
                  <button
                    onClick={() =>
                      updateModule(activeModule.id, (m) => ({
                        ...m,
                        state: { ...m.state, backlight: !m.state.backlight },
                      }))
                    }
                    className="flex-1 py-1.5 px-2 bg-[#1A1D24] hover:bg-[#2A2D35] text-[#E0E0E6] font-bold text-[10px] uppercase rounded-xs border border-[#3A3F4B] transition-all cursor-pointer"
                  >
                    Háttérvilágítás {activeModule.state.backlight ? 'Kikapcs' : 'Bekapcs'}
                  </button>

                  <button
                    onClick={() =>
                      updateModule(activeModule.id, (m) => ({
                        ...m,
                        state: { ...m.state, line0: '                ', line1: '                ' },
                      }))
                    }
                    className="flex-1 py-1.5 px-2 bg-[#1A1D24] hover:bg-[#2A2D35] text-[#E0E0E6] font-bold text-[10px] uppercase rounded-xs border border-[#3A3F4B] transition-all cursor-pointer"
                  >
                    Kijelző Törlése
                  </button>
                </div>

                {/* Test Text Sender */}
                <div className="flex items-center gap-1.5 p-2 bg-[#12141A] border border-[#2A2D35] rounded-xs">
                  <select
                    value={testLcdRow}
                    onChange={(e) => setTestLcdRow(e.target.value as any)}
                    className="bg-[#1A1D24] text-[#E0E0E6] border border-[#3A3F4B] text-[10px] font-bold px-1.5 py-1.5 rounded-xs"
                  >
                    <option value="0">Sor 0</option>
                    <option value="1">Sor 1</option>
                  </select>

                  <input
                    type="text"
                    maxLength={16}
                    placeholder="Teszt szöveg (max 16)..."
                    value={testLcdText}
                    onChange={(e) => setTestLcdText(e.target.value)}
                    className="flex-1 bg-[#1A1D24] border border-[#3A3F4B] px-2 py-1 text-[11px] font-mono text-[#E0E0E6] rounded-xs"
                  />

                  <button
                    onClick={() => {
                      if (!testLcdText) return;
                      updateModule(activeModule.id, (m) => {
                        const rowKey = testLcdRow === '0' ? 'line0' : 'line1';
                        return {
                          ...m,
                          state: {
                            ...m.state,
                            [rowKey]: testLcdText.padEnd(16, ' ').slice(0, 16),
                          },
                        };
                      });
                      setTestLcdText('');
                    }}
                    className="px-2.5 py-1.5 bg-[#38bdf8] text-black font-bold text-[10px] uppercase rounded-xs cursor-pointer"
                  >
                    Kiírás
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* 2. DS1307 / DS3231 RTC CLOCK COMPONENT */}
          {/* ======================================================== */}
          {activeModule.type === 'rtc_ds1307' && (
            <div className="space-y-3">
              {/* Digital Clock Display */}
              <div className="p-4 bg-[#12141A] border border-[#a855f7]/40 rounded-xs shadow-[0_0_15px_rgba(168,85,247,0.1)]">
                <div className="flex justify-between items-center text-[10px] font-mono text-[#8A8D98] border-b border-[#2A2D35] pb-1.5 mb-3">
                  <span className="flex items-center gap-1.5 text-[#a855f7] font-bold">
                    <Clock className="w-3.5 h-3.5" />
                    DS3231 I2C RTC (Cím: 0x68)
                  </span>
                  <span>Elem: {activeModule.state.batteryVolts || 3.15}V (CR2032 OK)</span>
                  <span>Hőm: {activeModule.state.temperatureC || 24.5}°C</span>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-center">
                  {/* Big Time Digits */}
                  <div className="font-mono font-black text-2xl sm:text-4xl text-[#a855f7] tracking-widest bg-[#1A1D24] px-4 py-2 rounded-xs border border-[#a855f7]/30 shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]">
                    {String(activeModule.state.hours || 0).padStart(2, '0')} :{' '}
                    {String(activeModule.state.minutes || 0).padStart(2, '0')} :{' '}
                    <span className="text-[#c084fc]">
                      {String(activeModule.state.seconds || 0).padStart(2, '0')}
                    </span>
                  </div>

                  {/* Date Badge */}
                  <div className="font-mono text-xs font-bold text-[#E0E0E6] bg-[#1A1D24] px-3 py-2 rounded-xs border border-[#2A2D35]">
                    <div className="text-[10px] text-[#8A8D98] uppercase">Naptár</div>
                    <div className="text-sm text-[#4ade80]">
                      {activeModule.state.year || 2026}.{' '}
                      {String(activeModule.state.month || 1).padStart(2, '0')}.{' '}
                      {String(activeModule.state.day || 1).padStart(2, '0')}.
                    </div>
                  </div>
                </div>
              </div>

              {/* RTC Interactive Adjustments */}
              <div className="flex flex-wrap gap-2 text-xs">
                <button
                  onClick={() => {
                    const now = new Date();
                    updateModule(activeModule.id, (m) => ({
                      ...m,
                      state: {
                        ...m.state,
                        hours: now.getHours(),
                        minutes: now.getMinutes(),
                        seconds: now.getSeconds(),
                        year: now.getFullYear(),
                        month: now.getMonth() + 1,
                        day: now.getDate(),
                      },
                    }));
                  }}
                  className="flex-1 py-1.5 px-3 bg-[#a855f7] hover:bg-[#9333ea] text-white font-bold text-[10px] uppercase rounded-xs transition-all shadow-[2px_2px_0px_#000] cursor-pointer flex items-center justify-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>PC Időhöz Szinkronizálás</span>
                </button>

                <button
                  onClick={() =>
                    updateModule(activeModule.id, (m) => ({
                      ...m,
                      state: {
                        ...m.state,
                        hours: ((m.state.hours || 0) + 1) % 24,
                      },
                    }))
                  }
                  className="py-1.5 px-2.5 bg-[#1A1D24] hover:bg-[#2A2D35] text-[#E0E0E6] font-bold text-[10px] rounded-xs border border-[#3A3F4B] cursor-pointer"
                >
                  +1 Óra
                </button>

                <button
                  onClick={() =>
                    updateModule(activeModule.id, (m) => ({
                      ...m,
                      state: {
                        ...m.state,
                        minutes: ((m.state.minutes || 0) + 1) % 60,
                      },
                    }))
                  }
                  className="py-1.5 px-2.5 bg-[#1A1D24] hover:bg-[#2A2D35] text-[#E0E0E6] font-bold text-[10px] rounded-xs border border-[#3A3F4B] cursor-pointer"
                >
                  +1 Perc
                </button>

                <button
                  onClick={() =>
                    updateModule(activeModule.id, (m) => ({
                      ...m,
                      state: {
                        ...m.state,
                        seconds: 0,
                      },
                    }))
                  }
                  className="py-1.5 px-2.5 bg-[#1A1D24] hover:bg-[#2A2D35] text-[#E0E0E6] font-bold text-[10px] rounded-xs border border-[#3A3F4B] cursor-pointer"
                >
                  Másodperc 00
                </button>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* 3. 74HC595 SHIFT REGISTER COMPONENT */}
          {/* ======================================================== */}
          {activeModule.type === 'shift_74hc595' && (
            <div className="space-y-3">
              {/* 8-bit Output LEDs Panel */}
              <div className="p-4 bg-[#12141A] border border-[#f59e0b]/40 rounded-xs">
                <div className="flex justify-between items-center text-[10px] font-mono text-[#8A8D98] border-b border-[#2A2D35] pb-1.5 mb-3">
                  <span className="text-[#f59e0b] font-bold flex items-center gap-1">
                    <Binary className="w-3.5 h-3.5" />
                    74HC595 8-Bites Léptetőregiszter
                  </span>
                  <span className="font-mono text-[#E0E0E6]">
                    Érték:{' '}
                    <strong className="text-[#f59e0b]">
                      0x{(activeModule.state.outputByte || 0).toString(16).toUpperCase().padStart(2, '0')}
                    </strong>{' '}
                    ({activeModule.state.outputByte || 0} dec)
                  </span>
                </div>

                {/* 8 LEDs (Q7 -> Q0) */}
                <div className="grid grid-cols-8 gap-2 text-center py-2">
                  {[7, 6, 5, 4, 3, 2, 1, 0].map((bitIdx) => {
                    const isHigh = ((activeModule.state.outputByte || 0) & (1 << bitIdx)) !== 0;
                    return (
                      <div
                        key={bitIdx}
                        className="flex flex-col items-center gap-1.5 p-2 bg-[#1A1D24] border border-[#2A2D35] rounded-xs"
                      >
                        <span className="text-[9px] font-mono text-[#8A8D98] font-bold">
                          Q{bitIdx}
                        </span>
                        <div
                          className={`w-6 h-6 rounded-full border-2 transition-all flex items-center justify-center text-[9px] font-mono font-bold ${
                            isHigh
                              ? 'bg-[#f59e0b] border-[#fbbf24] text-black shadow-[0_0_10px_#f59e0b]'
                              : 'bg-[#1e1b18] border-[#451a03] text-[#78350f]'
                          }`}
                        >
                          {isHigh ? '1' : '0'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Interactive Bit Shifter Controls */}
              <div className="flex flex-wrap gap-2 text-xs">
                <button
                  onClick={() =>
                    updateModule(activeModule.id, (m) => ({
                      ...m,
                      state: {
                        ...m.state,
                        outputByte: (((m.state.outputByte || 0) << 1) | 1) & 0xff,
                      },
                    }))
                  }
                  className="flex-1 py-1.5 px-2 bg-[#1A1D24] hover:bg-[#2A2D35] text-[#f59e0b] font-bold text-[10px] uppercase rounded-xs border border-[#3A3F4B] cursor-pointer"
                >
                  Shift '1' (MSB)
                </button>

                <button
                  onClick={() =>
                    updateModule(activeModule.id, (m) => ({
                      ...m,
                      state: {
                        ...m.state,
                        outputByte: ((m.state.outputByte || 0) << 1) & 0xff,
                      },
                    }))
                  }
                  className="flex-1 py-1.5 px-2 bg-[#1A1D24] hover:bg-[#2A2D35] text-[#E0E0E6] font-bold text-[10px] uppercase rounded-xs border border-[#3A3F4B] cursor-pointer"
                >
                  Shift '0' (MSB)
                </button>

                <button
                  onClick={() =>
                    updateModule(activeModule.id, (m) => ({
                      ...m,
                      state: {
                        ...m.state,
                        outputByte: 0b10101010,
                      },
                    }))
                  }
                  className="py-1.5 px-2.5 bg-[#1A1D24] hover:bg-[#2A2D35] text-[#E0E0E6] font-bold text-[10px] rounded-xs border border-[#3A3F4B] cursor-pointer"
                >
                  Minta: 0xAA
                </button>

                <button
                  onClick={() =>
                    updateModule(activeModule.id, (m) => ({
                      ...m,
                      state: {
                        ...m.state,
                        outputByte: 0x00,
                      },
                    }))
                  }
                  className="py-1.5 px-2.5 bg-[#1A1D24] hover:bg-[#2A2D35] text-[#ef4444] font-bold text-[10px] rounded-xs border border-[#3A3F4B] cursor-pointer"
                >
                  Mind 0
                </button>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* 4. MICROSD CARD SPI COMPONENT */}
          {/* ======================================================== */}
          {activeModule.type === 'sd_card' && (
            <div className="space-y-3">
              <div className="p-3 bg-[#12141A] border border-[#10b981]/40 rounded-xs">
                <div className="flex justify-between items-center text-[10px] font-mono text-[#8A8D98] border-b border-[#2A2D35] pb-1.5 mb-2.5">
                  <span className="text-[#10b981] font-bold flex items-center gap-1">
                    <HardDrive className="w-3.5 h-3.5" />
                    SPI MicroSD (FAT32 - 1024 MB)
                  </span>
                  <span className="text-[#4ade80]">Kártya behelyezve: IGEN</span>
                  <span>Utolsó: {activeModule.state.lastCommand || 'CMD0'}</span>
                </div>

                {/* Virtual Files Table */}
                <div className="space-y-1.5">
                  <div className="text-[10px] font-bold text-[#8A8D98] uppercase">
                    Fájlrendszer (FAT):
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(activeModule.state.files || []).map((file: any) => (
                      <button
                        key={file.name}
                        onClick={() =>
                          updateModule(activeModule.id, (m) => ({
                            ...m,
                            state: { ...m.state, selectedFile: file.name },
                          }))
                        }
                        className={`p-2 rounded-xs border text-left font-mono text-[10px] transition-all cursor-pointer ${
                          activeModule.state.selectedFile === file.name
                            ? 'bg-[#10b981]/15 border-[#10b981] text-[#10b981]'
                            : 'bg-[#1A1D24] border-[#2A2D35] text-[#E0E0E6] hover:border-[#3A3F4B]'
                        }`}
                      >
                        <div className="font-bold flex items-center gap-1">
                          <FileText className="w-3 h-3" />
                          {file.name}
                        </div>
                        <div className="text-[9px] text-[#8A8D98]">{file.size} bájt</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* File Contents Preview */}
                {activeModule.state.selectedFile && (
                  <div className="mt-3 p-2 bg-[#0F1115] border border-[#2A2D35] rounded-xs">
                    <div className="flex justify-between items-center text-[10px] font-mono text-[#8A8D98] mb-1">
                      <span className="text-[#10b981] font-bold">
                        {activeModule.state.selectedFile} tartalma:
                      </span>
                      <button
                        onClick={() => {
                          updateModule(activeModule.id, (m) => {
                            const files = (m.state.files || []).map((f: any) =>
                              f.name === m.state.selectedFile ? { ...f, content: '', size: 0 } : f
                            );
                            return { ...m, state: { ...m.state, files } };
                          });
                        }}
                        className="text-[9px] text-[#ef4444] hover:underline cursor-pointer"
                      >
                        Fájl ürítése
                      </button>
                    </div>
                    <pre className="text-[10px] font-mono text-[#4ade80] max-h-24 overflow-y-auto whitespace-pre-wrap">
                      {activeModule.state.files?.find(
                        (f: any) => f.name === activeModule.state.selectedFile
                      )?.content || '(Üres fájl)'}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* 5. NRF24L01+ 2.4GHZ WIRELESS COMPONENT */}
          {/* ======================================================== */}
          {activeModule.type === 'nrf24l01' && (
            <div className="space-y-3">
              <div className="p-3 bg-[#12141A] border border-[#ec4899]/40 rounded-xs">
                <div className="flex justify-between items-center text-[10px] font-mono text-[#8A8D98] border-b border-[#2A2D35] pb-1.5 mb-2.5">
                  <span className="text-[#ec4899] font-bold flex items-center gap-1">
                    <Radio className="w-3.5 h-3.5" />
                    NRF24L01+ 2.4GHz ISM Adó-vevő
                  </span>
                  <span>Csatorna: {activeModule.state.channel} (2.{activeModule.state.channel}GHz)</span>
                  <span>Térerő: {activeModule.state.rssi} dBm</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-[10px] font-mono mb-3">
                  <div className="p-2 bg-[#1A1D24] border border-[#2A2D35] rounded-xs">
                    <div className="text-[#8A8D98]">Sebesség</div>
                    <div className="font-bold text-[#E0E0E6]">{activeModule.state.dataRate}</div>
                  </div>
                  <div className="p-2 bg-[#1A1D24] border border-[#2A2D35] rounded-xs">
                    <div className="text-[#8A8D98]">TX Teljesítmény</div>
                    <div className="font-bold text-[#ec4899]">{activeModule.state.txPower}</div>
                  </div>
                  <div className="p-2 bg-[#1A1D24] border border-[#2A2D35] rounded-xs">
                    <div className="text-[#8A8D98]">TX Csomagok</div>
                    <div className="font-bold text-[#4ade80]">{activeModule.state.txSuccessCount || 0} db</div>
                  </div>
                  <div className="p-2 bg-[#1A1D24] border border-[#2A2D35] rounded-xs">
                    <div className="text-[#8A8D98]">RX Fogadott</div>
                    <div className="font-bold text-[#38bdf8]">{activeModule.state.rxCount || 0} db</div>
                  </div>
                </div>

                {/* Packet payload & send test */}
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={nrfCustomPayload}
                    onChange={(e) => setNrfCustomPayload(e.target.value)}
                    placeholder="Adatcsomag (max 32 bájt)..."
                    className="flex-1 bg-[#1A1D24] border border-[#3A3F4B] px-2 py-1.5 text-xs font-mono text-[#E0E0E6] rounded-xs"
                  />
                  <button
                    onClick={() => {
                      updateModule(activeModule.id, (m) => ({
                        ...m,
                        state: {
                          ...m.state,
                          txPayload: nrfCustomPayload,
                          txSuccessCount: (m.state.txSuccessCount || 0) + 1,
                        },
                      }));
                    }}
                    className="px-3 py-1.5 bg-[#ec4899] hover:bg-[#db2777] text-white font-bold text-[10px] uppercase rounded-xs transition-all shadow-[1px_1px_0px_#000] cursor-pointer"
                  >
                    RF Adás (TX)
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* 6. KY-040 ROTARY ENCODER COMPONENT */}
          {/* ======================================================== */}
          {activeModule.type === 'rotary_encoder' && (
            <div className="space-y-3">
              <div className="p-4 bg-[#12141A] border border-[#06b6d4]/40 rounded-xs">
                <div className="flex justify-between items-center text-[10px] font-mono text-[#8A8D98] border-b border-[#2A2D35] pb-1.5 mb-3">
                  <span className="text-[#06b6d4] font-bold flex items-center gap-1">
                    <Disc className="w-3.5 h-3.5" />
                    KY-040 Forgó Jeladó (Kvadratúra A/B)
                  </span>
                  <span>Lábak: CLK (D{activeModule.pins.CLK}), DT (D{activeModule.pins.DT})</span>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-around gap-4 py-2">
                  {/* Rotating Metallic Knob Graphic */}
                  <div className="flex flex-col items-center gap-2">
                    <div
                      className="w-20 h-20 rounded-full bg-gradient-to-tr from-[#1E293B] via-[#475569] to-[#0F172A] border-4 border-[#06b6d4] shadow-[0_0_15px_rgba(6,182,212,0.3)] relative flex items-center justify-center transition-transform duration-100 select-none"
                      style={{
                        transform: `rotate(${activeModule.state.angleDeg || 0}deg)`,
                      }}
                    >
                      {/* Notch indicator */}
                      <div className="w-2 h-4 bg-[#06b6d4] rounded-full absolute top-1 shadow-[0_0_6px_#06b6d4]" />
                      <div className="w-6 h-6 rounded-full bg-[#0F172A] border border-[#06b6d4]/50 flex items-center justify-center text-[9px] font-mono text-[#06b6d4]">
                        ●
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-[#8A8D98]">
                      Szög: {activeModule.state.angleDeg || 0}°
                    </span>
                  </div>

                  {/* Position Counter Display */}
                  <div className="flex flex-col items-center gap-2">
                    <div className="text-center p-3 bg-[#1A1D24] border border-[#2A2D35] rounded-xs min-w-[140px]">
                      <div className="text-[9px] font-bold text-[#8A8D98] uppercase">
                        Pozíció Számláló
                      </div>
                      <div className="text-2xl font-mono font-black text-[#06b6d4]">
                        {activeModule.state.position || 0}
                      </div>
                      <div className="text-[9px] font-mono text-[#4ade80]">
                        Irány: {activeModule.state.lastDirection || 'IDLE'}
                      </div>
                    </div>

                    {/* Interactive Turn Buttons */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleRotaryStep(activeModule.id, 'CCW')}
                        className="flex items-center gap-1 px-3 py-1.5 bg-[#1A1D24] hover:bg-[#2A2D35] text-[#06b6d4] font-bold text-xs rounded-xs border border-[#3A3F4B] transition-all shadow-[1px_1px_0px_#000] cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>↺ Balra</span>
                      </button>

                      <button
                        onClick={() => handleRotaryStep(activeModule.id, 'CW')}
                        className="flex items-center gap-1 px-3 py-1.5 bg-[#06b6d4] hover:bg-[#0891b2] text-black font-bold text-xs rounded-xs transition-all shadow-[1px_1px_0px_#000] cursor-pointer"
                      >
                        <span>Jobbra ↻</span>
                        <RotateCw className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* 7. DISCRETE LED PANEL COMPONENT */}
          {/* ======================================================== */}
          {activeModule.type === 'discrete_leds' && (
            <div className="space-y-3">
              <div className="p-4 bg-[#12141A] border border-[#e11d48]/40 rounded-xs">
                <div className="flex justify-between items-center text-[10px] font-mono text-[#8A8D98] border-b border-[#2A2D35] pb-1.5 mb-3">
                  <span className="text-[#e11d48] font-bold flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" />
                    4-Csatornás LED Panel
                  </span>
                  <span>Közvetlen Arduino kimenetek</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { id: '1', name: 'Piros LED', pin: '5', color: '#ef4444', border: '#f87171' },
                    { id: '2', name: 'Sárga LED', pin: '6', color: '#f59e0b', border: '#fbbf24' },
                    { id: '3', name: 'Zöld LED', pin: '7', color: '#10b981', border: '#34d399' },
                    { id: '4', name: 'Kék LED', pin: '8', color: '#3b82f6', border: '#60a5fa' },
                  ].map((led) => {
                    const isLit = true; // Synced with Arduino pins
                    return (
                      <div
                        key={led.id}
                        className="p-3 bg-[#1A1D24] border border-[#2A2D35] rounded-xs flex flex-col items-center gap-2"
                      >
                        <div
                          className="w-8 h-8 rounded-full border-2 transition-all flex items-center justify-center"
                          style={{
                            backgroundColor: led.color,
                            borderColor: led.border,
                            boxShadow: `0 0 12px ${led.color}`,
                          }}
                        >
                          <span className="text-[9px] font-black text-black">D{led.pin}</span>
                        </div>
                        <span className="text-[10px] font-bold text-[#E0E0E6]">{led.name}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* DS18B20 1-WIRE DIGITAL TEMPERATURE SENSOR */}
          {/* ======================================================== */}
          {activeModule.type === 'ds18b20_temp' && (
            <div className="space-y-4">
              {/* Main Sensor Card */}
              <div className="p-4 bg-[#12141A] border border-[#06b6d4]/40 rounded-xs shadow-[2px_2px_0px_#000]">
                <div className="flex justify-between items-center text-[10px] font-mono text-[#8A8D98] border-b border-[#2A2D35] pb-2 mb-3">
                  <span className="text-[#06b6d4] font-bold flex items-center gap-1.5">
                    <Thermometer className="w-4 h-4 text-[#06b6d4]" />
                    Dallas DS18B20 1-Wire Hőmérséklet Szenzor
                  </span>
                  <span className="bg-[#06b6d4]/10 text-[#06b6d4] px-1.5 py-0.5 rounded-xs border border-[#06b6d4]/30 font-bold">
                    DQ: D{activeModule.pins.DQ || '2'}
                  </span>
                </div>

                {/* Digital Display & Gauge */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                  <div className="p-4 bg-[#0a0c10] border border-[#06b6d4]/30 rounded-xs flex flex-col items-center justify-center relative overflow-hidden">
                    <div className="text-[10px] font-mono uppercase tracking-widest text-[#8A8D98] mb-1">
                      Mért Hőmérséklet (12-bit)
                    </div>
                    <div className="text-3xl sm:text-4xl font-mono font-black text-[#06b6d4] tracking-tight drop-shadow-[0_0_12px_rgba(6,182,212,0.4)]">
                      {(activeModule.state.temperatureC ?? 24.5) > 0 ? '+' : ''}
                      {(activeModule.state.temperatureC ?? 24.5).toFixed(2)} °C
                    </div>
                    <div className="text-[11px] font-mono text-[#8A8D98] mt-1">
                      {(((activeModule.state.temperatureC ?? 24.5) * 9) / 5 + 32).toFixed(1)} °F /{' '}
                      {((activeModule.state.temperatureC ?? 24.5) + 273.15).toFixed(1)} K
                    </div>

                    {/* Alarm Banner */}
                    {activeModule.state.alarmTriggered && (
                      <div className="mt-2 px-2 py-0.5 bg-rose-500/20 text-rose-400 border border-rose-500/40 rounded-xs text-[10px] font-bold font-mono animate-pulse">
                        ⚠️ RIASZTÁS AKTÍV (TH/TL Határ Átlépve!)
                      </div>
                    )}
                  </div>

                  {/* Temperature Slider & Quick Controls */}
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-[10px] font-mono text-[#8A8D98]">
                        <span>Hőmérséklet Szimuláció</span>
                        <span className="text-[#06b6d4] font-bold">
                          {(activeModule.state.temperatureC ?? 24.5).toFixed(1)} °C
                        </span>
                      </div>
                      <input
                        type="range"
                        min="-55"
                        max="125"
                        step="0.5"
                        value={activeModule.state.temperatureC ?? 24.5}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          updateModule(activeModule.id, (mod) => ({
                            ...mod,
                            state: {
                              ...mod.state,
                              temperatureC: val,
                              alarmTriggered:
                                val >= (mod.state.thRegister ?? 50) || val <= (mod.state.tlRegister ?? 10),
                            },
                          }));
                        }}
                        className="w-full h-2 bg-[#1A1D24] rounded-lg appearance-none cursor-pointer accent-[#06b6d4]"
                      />
                      <div className="flex justify-between text-[9px] font-mono text-[#8A8D98]">
                        <span>-55°C</span>
                        <span>0°C</span>
                        <span>+25°C</span>
                        <span>+50°C</span>
                        <span>+125°C</span>
                      </div>
                    </div>

                    {/* Preset Buttons */}
                    <div className="grid grid-cols-4 gap-1.5">
                      {[
                        { label: '❄️ -18°C', val: -18, tip: 'Fagyasztó' },
                        { label: '🏠 +22°C', val: 22, tip: 'Szoba' },
                        { label: '🌡️ +37°C', val: 37, tip: 'Test' },
                        { label: '☕ +85°C', val: 85, tip: 'Forró' },
                      ].map((preset) => (
                        <button
                          key={preset.label}
                          onClick={() => {
                            updateModule(activeModule.id, (mod) => ({
                              ...mod,
                              state: {
                                ...mod.state,
                                temperatureC: preset.val,
                                alarmTriggered:
                                  preset.val >= (mod.state.thRegister ?? 50) ||
                                  preset.val <= (mod.state.tlRegister ?? 10),
                              },
                            }));
                          }}
                          className="px-1.5 py-1 bg-[#1A1D24] hover:bg-[#06b6d4]/20 border border-[#2A2D35] hover:border-[#06b6d4] text-[#E0E0E6] text-[10px] font-mono rounded-xs transition-colors cursor-pointer text-center"
                          title={preset.tip}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 64-bit ROM & Configuration Registers */}
                <div className="mt-4 pt-3 border-t border-[#2A2D35] grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-2.5 bg-[#161920] border border-[#2A2D35] rounded-xs space-y-1">
                    <div className="text-[9px] font-mono text-[#8A8D98] flex items-center justify-between">
                      <span>64-BIT LÉZERES ROM AZONOSÍTÓ</span>
                      <span className="text-[#06b6d4] font-bold">Család: 0x28</span>
                    </div>
                    <div className="text-[11px] font-mono font-bold text-[#E0E0E6] bg-[#0A0C10] p-1.5 rounded-xs border border-[#2A2D35] tracking-wider text-center">
                      {activeModule.state.romCode || '28-AA-73-04-1A-20-01-F3'}
                    </div>
                  </div>

                  <div className="p-2.5 bg-[#161920] border border-[#2A2D35] rounded-xs space-y-1">
                    <div className="text-[9px] font-mono text-[#8A8D98] flex items-center justify-between">
                      <span>RIASZTÁSI HATÁROK & FELBONTÁS</span>
                      <span className="text-emerald-400 font-bold">12-bit (0.0625°C)</span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] font-mono text-[#E0E0E6] bg-[#0A0C10] p-1.5 rounded-xs border border-[#2A2D35]">
                      <span>TH (Felső): <b className="text-rose-400">+{activeModule.state.thRegister ?? 50}°C</b></span>
                      <span>TL (Alsó): <b className="text-sky-400">+{activeModule.state.tlRegister ?? 10}°C</b></span>
                      <span>Cfg: <b>0x7F</b></span>
                    </div>
                  </div>
                </div>

                {/* 9-byte Scratchpad Memory View */}
                <div className="mt-3 p-2.5 bg-[#0e1015] border border-[#2A2D35] rounded-xs">
                  <div className="text-[9px] font-mono text-[#8A8D98] mb-1.5 flex justify-between items-center">
                    <span>9-BÁJTOS SCRATCHPAD MEMÓRIA REGISZTEREK</span>
                    <span className="text-[9px] text-[#8A8D98]">LSB elöl (Little-Endian)</span>
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-9 gap-1 text-center font-mono">
                    {[
                      { name: 'B0: LSB', val: ((Math.round((activeModule.state.temperatureC ?? 24.5) * 16)) & 0xFF).toString(16).padStart(2, '0').toUpperCase() },
                      { name: 'B1: MSB', val: (((Math.round((activeModule.state.temperatureC ?? 24.5) * 16)) >> 8) & 0xFF).toString(16).padStart(2, '0').toUpperCase() },
                      { name: 'B2: TH', val: (activeModule.state.thRegister ?? 50).toString(16).padStart(2, '0').toUpperCase() },
                      { name: 'B3: TL', val: (activeModule.state.tlRegister ?? 10).toString(16).padStart(2, '0').toUpperCase() },
                      { name: 'B4: Cfg', val: '7F' },
                      { name: 'B5: Res', val: 'FF' },
                      { name: 'B6: Cnt', val: '0C' },
                      { name: 'B7: C/°C', val: '10' },
                      { name: 'B8: CRC', val: '48' },
                    ].map((reg, idx) => (
                      <div key={idx} className="p-1 bg-[#161920] border border-[#2A2D35] rounded-xs">
                        <div className="text-[8px] text-[#8A8D98] truncate">{reg.name}</div>
                        <div className="text-[10px] font-bold text-[#06b6d4]">0x{reg.val}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* 9. BLUETOOTH SPP / BLE (BT05 / BT06) MODULE */}
          {/* ======================================================== */}
          {activeModule.type === 'bluetooth_spp' && (
            <div className="space-y-4">
              <div className="p-4 bg-[#12141A] border border-[#3b82f6]/40 rounded-xs shadow-[2px_2px_0px_#000]">
                {/* Header with connection indicator */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#2A2D35] pb-2.5 mb-3 font-mono text-xs">
                  <div className="flex items-center gap-2">
                    <Bluetooth className="w-4 h-4 text-[#3b82f6]" />
                    <span className="font-bold text-[#E0E0E6]">BT05 / BT06 Vezeték Nélküli SPP Soros Híd</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-xs text-[10px] font-bold">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      PÁROSÍTVA: {activeModule.state.clientName || 'Mobile Host (SPP)'}
                    </span>
                    <span className="px-2 py-0.5 bg-[#181B22] text-slate-300 border border-[#2A2D35] text-[10px] rounded-xs">
                      RSSI: <strong className="text-emerald-400">{activeModule.state.rssi || -62} dBm</strong>
                    </span>
                  </div>
                </div>

                {/* Device Config Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3 text-xs font-mono">
                  <div className="p-2 bg-[#161920] border border-[#2A2D35] rounded-xs">
                    <div className="text-[9px] text-[#8A8D98] uppercase">Eszköznév (AT+NAME)</div>
                    <div className="text-sky-300 font-bold truncate">{activeModule.state.deviceName || 'BT05-ARDUINO'}</div>
                  </div>
                  <div className="p-2 bg-[#161920] border border-[#2A2D35] rounded-xs">
                    <div className="text-[9px] text-[#8A8D98] uppercase">PIN Kód (AT+PIN)</div>
                    <div className="text-amber-300 font-bold font-mono">{activeModule.state.pinCode || '1234'}</div>
                  </div>
                  <div className="p-2 bg-[#161920] border border-[#2A2D35] rounded-xs">
                    <div className="text-[9px] text-[#8A8D98] uppercase">Baud Ráta</div>
                    <div className="text-emerald-300 font-bold">{activeModule.state.baudRate || 9600} Baud</div>
                  </div>
                  <div className="p-2 bg-[#161920] border border-[#2A2D35] rounded-xs">
                    <div className="text-[9px] text-[#8A8D98] uppercase">Szerepkör (AT+ROLE)</div>
                    <div className="text-purple-300 font-bold">{activeModule.state.role || 'SLAVE (0)'}</div>
                  </div>
                </div>

                {/* Remote Smartphone Terminal Simulator */}
                <div className="p-3 bg-[#0a0c10] border border-[#3b82f6]/30 rounded-xs space-y-2.5">
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <span className="text-[#8A8D98] font-bold uppercase flex items-center gap-1.5">
                      <Radio className="w-3.5 h-3.5 text-[#3b82f6]" />
                      Virtuális Mobil Telefon / Bluetooth Terminál (SPP Küldő)
                    </span>
                    <span className="text-[10px] text-sky-400">D0(RX) & D1(TX) UART</span>
                  </div>

                  {/* Quick Command Buttons */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                    {[
                      { label: '💡 LED BE (1)', cmd: '1', tip: 'Karakter: 1 (0x31)' },
                      { label: '🌑 LED KI (0)', cmd: '0', tip: 'Karakter: 0 (0x30)' },
                      { label: '📊 ÁLLAPOT LEKÉRÉS', cmd: 'STATUS?', tip: 'Telemetria kérés' },
                      { label: '⚡ PWM MOTOR 50%', cmd: 'PWM:128', tip: 'Sebesség szabályozás' },
                    ].map((item) => (
                      <button
                        key={item.cmd}
                        onClick={() => {
                          updateModule(activeModule.id, (mod) => ({
                            ...mod,
                            state: {
                              ...mod.state,
                              rxHistory: [`> ${item.cmd}`, ...(mod.state.rxHistory || []).slice(0, 7)],
                              lastReceived: item.cmd,
                            },
                          }));
                          if (onPinChange && item.cmd === '1') {
                            onPinChange('13', 1);
                          } else if (onPinChange && item.cmd === '0') {
                            onPinChange('13', 0);
                          }
                        }}
                        className="p-1.5 bg-[#181B22] hover:bg-[#3b82f6]/20 border border-[#2A2D35] hover:border-[#3b82f6] text-[#E0E0E6] text-[11px] font-mono rounded-xs transition-all text-center cursor-pointer"
                        title={item.tip}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>

                  {/* Terminal Packet Flow */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
                    <div className="p-2 bg-[#12141A] border border-[#2A2D35] rounded-xs space-y-1">
                      <div className="text-[9px] text-sky-400 font-bold uppercase">📥 Mobilról Fogadott Parancsok (RX):</div>
                      <div className="h-20 overflow-y-auto space-y-0.5 text-[10px] text-slate-300">
                        {(activeModule.state.rxHistory || ['LED_ON', 'GET_STATUS']).map((entry: string, i: number) => (
                          <div key={i} className="text-emerald-400 font-mono">
                            {entry}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="p-2 bg-[#12141A] border border-[#2A2D35] rounded-xs space-y-1">
                      <div className="text-[9px] text-amber-400 font-bold uppercase">📤 Arduino által Visszaküldött Adatok (TX):</div>
                      <div className="h-20 overflow-y-auto space-y-0.5 text-[10px] text-slate-300">
                        {(activeModule.state.txHistory || ['[BT] READY', 'STATUS_OK: T=24C']).map((entry: string, i: number) => (
                          <div key={i} className="text-amber-300 font-mono">
                            {entry}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* 10. 24Cxxx I2C KÜLSŐ EEPROM MEMÓRIA COMPONENT */}
          {/* ======================================================== */}
          {activeModule.type === 'eeprom_24cxxx' && (
            <div className="space-y-4">
              {/* Header & Chip Configuration Bar */}
              <div className="p-3 bg-[#12141A] border border-emerald-500/30 rounded-xs flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-500/10 border border-emerald-500/30 rounded-xs text-emerald-400">
                    <Database className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <select
                        value={activeModule.state.chipModel || '24C256'}
                        onChange={(e) => {
                          const model = e.target.value;
                          const spec = EEPROM_CHIP_SPECS[model] || EEPROM_CHIP_SPECS['24C256'];
                          updateModule(activeModule.id, (mod) => {
                            let newMem = mod.state.memory || [];
                            if (newMem.length < spec.capacity) {
                              newMem = [...newMem, ...new Array(spec.capacity - newMem.length).fill(0xff)];
                            }
                            return {
                              ...mod,
                              state: {
                                ...mod.state,
                                chipModel: model,
                                capacityBytes: spec.capacity,
                                pageSizeBytes: spec.pageSize,
                                addressBits: spec.addrBits,
                                memory: newMem,
                              },
                            };
                          });
                        }}
                        className="bg-[#1A1D24] border border-emerald-500/40 text-emerald-300 text-xs font-bold font-mono px-2.5 py-1 rounded-xs focus:outline-hidden focus:border-emerald-400 cursor-pointer"
                      >
                        {Object.keys(EEPROM_CHIP_SPECS).map((model) => (
                          <option key={model} value={model}>
                            {EEPROM_CHIP_SPECS[model].label}
                          </option>
                        ))}
                      </select>
                      <span className="text-[11px] font-mono text-slate-400">
                        {((activeModule.state.capacityBytes || 32768) >= 1024)
                          ? `${((activeModule.state.capacityBytes || 32768) / 1024).toFixed(0)} KB`
                          : `${activeModule.state.capacityBytes || 256} Bájt`}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {EEPROM_CHIP_SPECS[activeModule.state.chipModel || '24C256']?.desc || 'I2C Soros EEPROM'}
                    </p>
                  </div>
                </div>

                {/* Status Badges */}
                <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
                  {/* I2C Address Badge */}
                  <div className="px-2 py-1 bg-[#1A1D24] border border-[#2A2D35] rounded-xs flex items-center gap-1.5">
                    <span className="text-slate-500">I2C Cím:</span>
                    <span className="text-amber-400 font-bold">
                      {activeModule.state.baseAddressHex || '0x50'}
                    </span>
                  </div>

                  {/* WP Status Toggle */}
                  <button
                    onClick={() => {
                      updateModule(activeModule.id, (mod) => ({
                        ...mod,
                        state: {
                          ...mod.state,
                          wpPinActive: !mod.state.wpPinActive,
                        },
                      }));
                    }}
                    className={`px-2.5 py-1 border rounded-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                      activeModule.state.wpPinActive
                        ? 'bg-red-500/10 border-red-500/40 text-red-400 hover:bg-red-500/20'
                        : 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/20'
                    }`}
                    title="WP (Write Protect) Pin 7 kapcsoló"
                  >
                    {activeModule.state.wpPinActive ? (
                      <>
                        <Lock className="w-3.5 h-3.5 text-red-400" />
                        <span className="font-bold">WP: ZÁROLVA (Read Only)</span>
                      </>
                    ) : (
                      <>
                        <Unlock className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="font-bold">WP: ÍRHATÓ (R/W OK)</span>
                      </>
                    )}
                  </button>

                  {/* Export & Dump Button */}
                  <button
                    onClick={() => setIsEepromExportModalOpen(true)}
                    className="px-2.5 py-1 bg-[#1A1D24] hover:bg-sky-500/20 border border-[#2A2D35] hover:border-sky-500/40 text-sky-400 rounded-xs flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Dump / Export</span>
                  </button>
                </div>
              </div>

              {/* Hardware IC Package & Pinout Visualizer */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Visual DIP-8 IC Representation */}
                <div className="p-3 bg-[#0d0f14] border border-[#2A2D35] rounded-xs flex flex-col items-center justify-center relative">
                  <div className="text-[10px] font-mono text-slate-500 mb-2 uppercase tracking-widest flex items-center gap-1">
                    <Cpu className="w-3.5 h-3.5 text-emerald-400" />
                    DIP-8 / SOIC-8 Pinout & Jumperek
                  </div>

                  {/* IC Body */}
                  <div className="w-48 bg-[#181a20] border-2 border-[#333846] rounded-xs p-2 relative shadow-lg">
                    {/* Notch at Top */}
                    <div className="w-5 h-2 bg-[#0d0f14] border-b border-x border-[#333846] rounded-b-full mx-auto mb-2" />

                    <div className="text-center font-mono text-[11px] font-bold text-slate-300 tracking-wider">
                      AT{activeModule.state.chipModel || '24C256'}
                    </div>
                    <div className="text-center font-mono text-[8px] text-slate-500 pb-2">
                      I2C 2-WIRE SERIAL EEPROM
                    </div>

                    {/* Pin Matrix */}
                    <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-[9px] font-mono">
                      {/* Left Pins (1-4) */}
                      <div className="space-y-1.5">
                        {/* Pin 1: A0 */}
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              const newA0 = activeModule.state.a0Pin === 1 ? 0 : 1;
                              const a1 = activeModule.state.a1Pin || 0;
                              const a2 = activeModule.state.a2Pin || 0;
                              const base = 0x50 + (a2 << 2) + (a1 << 1) + newA0;
                              updateModule(activeModule.id, (mod) => ({
                                ...mod,
                                state: {
                                  ...mod.state,
                                  a0Pin: newA0,
                                  baseAddressHex: `0x${base.toString(16).toUpperCase()}`,
                                },
                              }));
                            }}
                            className={`w-4 h-4 rounded-2xs text-[8px] font-bold border flex items-center justify-center cursor-pointer transition-colors ${
                              activeModule.state.a0Pin === 1
                                ? 'bg-amber-500 text-black border-amber-400'
                                : 'bg-[#12141A] text-slate-400 border-slate-700 hover:border-slate-500'
                            }`}
                            title="A0 Cím Jumper: Kattints a váltáshoz (GND / VCC)"
                          >
                            {activeModule.state.a0Pin === 1 ? '1' : '0'}
                          </button>
                          <span className="text-slate-300">1: A0</span>
                        </div>

                        {/* Pin 2: A1 */}
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              const newA1 = activeModule.state.a1Pin === 1 ? 0 : 1;
                              const a0 = activeModule.state.a0Pin || 0;
                              const a2 = activeModule.state.a2Pin || 0;
                              const base = 0x50 + (a2 << 2) + (newA1 << 1) + a0;
                              updateModule(activeModule.id, (mod) => ({
                                ...mod,
                                state: {
                                  ...mod.state,
                                  a1Pin: newA1,
                                  baseAddressHex: `0x${base.toString(16).toUpperCase()}`,
                                },
                              }));
                            }}
                            className={`w-4 h-4 rounded-2xs text-[8px] font-bold border flex items-center justify-center cursor-pointer transition-colors ${
                              activeModule.state.a1Pin === 1
                                ? 'bg-amber-500 text-black border-amber-400'
                                : 'bg-[#12141A] text-slate-400 border-slate-700 hover:border-slate-500'
                            }`}
                            title="A1 Cím Jumper: Kattints a váltáshoz"
                          >
                            {activeModule.state.a1Pin === 1 ? '1' : '0'}
                          </button>
                          <span className="text-slate-300">2: A1</span>
                        </div>

                        {/* Pin 3: A2 */}
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              const newA2 = activeModule.state.a2Pin === 1 ? 0 : 1;
                              const a0 = activeModule.state.a0Pin || 0;
                              const a1 = activeModule.state.a1Pin || 0;
                              const base = 0x50 + (newA2 << 2) + (a1 << 1) + a0;
                              updateModule(activeModule.id, (mod) => ({
                                ...mod,
                                state: {
                                  ...mod.state,
                                  a2Pin: newA2,
                                  baseAddressHex: `0x${base.toString(16).toUpperCase()}`,
                                },
                              }));
                            }}
                            className={`w-4 h-4 rounded-2xs text-[8px] font-bold border flex items-center justify-center cursor-pointer transition-colors ${
                              activeModule.state.a2Pin === 1
                                ? 'bg-amber-500 text-black border-amber-400'
                                : 'bg-[#12141A] text-slate-400 border-slate-700 hover:border-slate-500'
                            }`}
                            title="A2 Cím Jumper: Kattints a váltáshoz"
                          >
                            {activeModule.state.a2Pin === 1 ? '1' : '0'}
                          </button>
                          <span className="text-slate-300">3: A2</span>
                        </div>

                        {/* Pin 4: GND */}
                        <div className="flex items-center gap-1 text-slate-500">
                          <span className="w-4 text-center font-bold">●</span>
                          <span>4: GND</span>
                        </div>
                      </div>

                      {/* Right Pins (8-5) */}
                      <div className="space-y-1.5 text-right">
                        {/* Pin 8: VCC */}
                        <div className="flex items-center justify-end gap-1 text-emerald-400">
                          <span>8: VCC</span>
                          <span className="w-4 text-center font-bold">●</span>
                        </div>

                        {/* Pin 7: WP */}
                        <div className="flex items-center justify-end gap-1">
                          <span className={activeModule.state.wpPinActive ? 'text-red-400 font-bold' : 'text-slate-300'}>
                            7: WP
                          </span>
                          <button
                            onClick={() => {
                              updateModule(activeModule.id, (mod) => ({
                                ...mod,
                                state: { ...mod.state, wpPinActive: !mod.state.wpPinActive },
                              }));
                            }}
                            className={`w-4 h-4 rounded-2xs text-[8px] font-bold border flex items-center justify-center cursor-pointer ${
                              activeModule.state.wpPinActive
                                ? 'bg-red-500 text-white border-red-400'
                                : 'bg-[#12141A] text-slate-400 border-slate-700 hover:border-slate-500'
                            }`}
                            title="WP Kapcsoló: 1 = Írásvédelem (Read Only), 0 = Írható"
                          >
                            {activeModule.state.wpPinActive ? '1' : '0'}
                          </button>
                        </div>

                        {/* Pin 6: SCL */}
                        <div className="flex items-center justify-end gap-1 text-sky-400">
                          <span>6: SCL (A5)</span>
                          <span className="w-4 text-center font-bold">●</span>
                        </div>

                        {/* Pin 5: SDA */}
                        <div className="flex items-center justify-end gap-1 text-sky-400">
                          <span>5: SDA (A4)</span>
                          <span className="w-4 text-center font-bold">●</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Operations & Diagnostic Workbench */}
                <div className="p-3 bg-[#0d0f14] border border-[#2A2D35] rounded-xs space-y-2.5 flex flex-col justify-between">
                  <div>
                    <div className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                      <Activity className="w-3.5 h-3.5 text-sky-400" />
                      Műveleti Statisztikák & Telemetria
                    </div>
                    <div className="grid grid-cols-2 gap-1.5 text-xs font-mono">
                      <div className="p-1.5 bg-[#14171F] border border-[#2A2D35] rounded-xs">
                        <div className="text-[9px] text-slate-500">Összes Írás (tWR)</div>
                        <div className="text-emerald-400 font-bold text-sm">
                          {activeModule.state.writeCyclesCount || 0} ciklus
                        </div>
                      </div>
                      <div className="p-1.5 bg-[#14171F] border border-[#2A2D35] rounded-xs">
                        <div className="text-[9px] text-slate-500">Összes Olvasás</div>
                        <div className="text-sky-400 font-bold text-sm">
                          {activeModule.state.readCyclesCount || 0} ciklus
                        </div>
                      </div>
                    </div>

                    <div className="mt-2 p-1.5 bg-[#14171F] border border-[#2A2D35] rounded-xs text-[10px] font-mono">
                      <div className="text-[9px] text-slate-500 uppercase">Utolsó Művelet:</div>
                      <div className="text-slate-200 font-bold flex items-center gap-1 mt-0.5">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            activeModule.state.lastOpSuccess ? 'bg-emerald-400' : 'bg-red-400'
                          }`}
                        />
                        {activeModule.state.lastOperation || 'IDLE'}
                        {activeModule.state.lastOpAddress !== undefined && (
                          <span className="text-slate-400">
                            @ 0x{activeModule.state.lastOpAddress.toString(16).padStart(4, '0').toUpperCase()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Fast Pattern Buttons */}
                  <div>
                    <div className="text-[9px] font-mono text-slate-500 mb-1 uppercase">
                      Gyorsminták Feltöltése:
                    </div>
                    <div className="grid grid-cols-2 gap-1 text-[10px] font-mono">
                      <button
                        onClick={() => {
                          const cap = activeModule.state.capacityBytes || 32768;
                          updateModule(activeModule.id, (mod) => ({
                            ...mod,
                            state: {
                              ...mod.state,
                              memory: new Array(cap).fill(0xff),
                              lastOperation: 'CHIP_ERASE_0xFF',
                              lastOpSuccess: true,
                            },
                          }));
                        }}
                        className="p-1 bg-[#1A1D24] hover:bg-red-500/20 border border-[#2A2D35] hover:border-red-500/40 text-red-300 rounded-xs transition-colors cursor-pointer"
                        title="Összes cella visszaállítása 0xFF üres állapotra"
                      >
                        🧹 Törlés (0xFF)
                      </button>

                      <button
                        onClick={() => {
                          const cap = activeModule.state.capacityBytes || 32768;
                          updateModule(activeModule.id, (mod) => ({
                            ...mod,
                            state: {
                              ...mod.state,
                              memory: new Array(cap).fill(0x00),
                              lastOperation: 'FILL_ZEROS_0x00',
                              lastOpSuccess: true,
                            },
                          }));
                        }}
                        className="p-1 bg-[#1A1D24] hover:bg-slate-700 border border-[#2A2D35] text-slate-300 rounded-xs transition-colors cursor-pointer"
                      >
                        0️⃣ Nullázás (0x00)
                      </button>

                      <button
                        onClick={() => {
                          const cap = activeModule.state.capacityBytes || 32768;
                          const mem = new Array(cap);
                          for (let i = 0; i < cap; i++) mem[i] = i % 2 === 0 ? 0xaa : 0x55;
                          updateModule(activeModule.id, (mod) => ({
                            ...mod,
                            state: {
                              ...mod.state,
                              memory: mem,
                              lastOperation: 'FILL_CHECKERBOARD',
                              lastOpSuccess: true,
                            },
                          }));
                        }}
                        className="p-1 bg-[#1A1D24] hover:bg-amber-500/20 border border-[#2A2D35] text-amber-300 rounded-xs transition-colors cursor-pointer"
                      >
                        🏁 0xAA/0x55 Minta
                      </button>

                      <button
                        onClick={() => {
                          const cap = activeModule.state.capacityBytes || 32768;
                          const mem = new Array(cap).fill(0xff);
                          const header = 'ARDUINO_24C256_SYS_CONFIG_v2.4';
                          for (let i = 0; i < header.length; i++) mem[i] = header.charCodeAt(i);
                          mem[header.length] = 0;
                          mem[0x20] = 0xAA;
                          mem[0x21] = 0x55;
                          mem[0x22] = 0x02; // Version
                          mem[0x23] = 0x12; // Baud index (115200)
                          mem[0x24] = 0x19; // Temp calibration
                          mem[0x25] = 0x64; // Sensor interval ms
                          updateModule(activeModule.id, (mod) => ({
                            ...mod,
                            state: {
                              ...mod.state,
                              memory: mem,
                              lastOperation: 'LOAD_SYS_CONFIG',
                              lastOpSuccess: true,
                            },
                          }));
                        }}
                        className="p-1 bg-[#1A1D24] hover:bg-emerald-500/20 border border-[#2A2D35] text-emerald-300 rounded-xs transition-colors cursor-pointer"
                      >
                        ⚙️ Rendszer Adattár
                      </button>
                    </div>
                  </div>
                </div>

                {/* Interactive Test Write / Read Workbench */}
                <div className="p-3 bg-[#0d0f14] border border-[#2A2D35] rounded-xs space-y-2.5 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="text-[10px] font-mono text-slate-500 uppercase tracking-widest flex items-center gap-1">
                      <Zap className="w-3.5 h-3.5 text-amber-400" />
                      Interaktív Írás / Tesztelés
                    </div>

                    {/* Single Byte Write */}
                    <div className="p-2 bg-[#14171F] border border-[#2A2D35] rounded-xs space-y-1.5">
                      <div className="text-[9px] font-mono text-emerald-400 font-bold uppercase">
                        1. Egyedi Bájt Írás (Write Byte):
                      </div>
                      <div className="flex items-center gap-1.5 text-xs font-mono">
                        <input
                          type="text"
                          value={eepromWriteAddr}
                          onChange={(e) => setEepromWriteAddr(e.target.value)}
                          placeholder="0x0010"
                          className="w-20 bg-[#0d0f14] border border-[#2A2D35] px-1.5 py-1 text-slate-200 rounded-2xs text-[11px] focus:outline-hidden focus:border-emerald-400"
                          title="Memóriacím (pl. 0x0010 vagy 16)"
                        />
                        <input
                          type="text"
                          value={eepromWriteVal}
                          onChange={(e) => setEepromWriteVal(e.target.value)}
                          placeholder="0x42"
                          className="w-16 bg-[#0d0f14] border border-[#2A2D35] px-1.5 py-1 text-slate-200 rounded-2xs text-[11px] focus:outline-hidden focus:border-emerald-400"
                          title="Adatbájt (pl. 0x42 vagy 66 vagy 'A')"
                        />
                        <button
                          onClick={() => {
                            const rawAddr = parseInt(eepromWriteAddr, eepromWriteAddr.startsWith('0x') ? 16 : 10) || 0;
                            let val = 0;
                            if (eepromWriteVal.startsWith("'") && eepromWriteVal.length >= 3) {
                              val = eepromWriteVal.charCodeAt(1);
                            } else {
                              val = parseInt(eepromWriteVal, eepromWriteVal.startsWith('0x') ? 16 : 10) || 0;
                            }

                            if (activeModule.state.wpPinActive) {
                              alert('Az EEPROM WP (Write Protect) lába aktív! Írás nem engedélyezett.');
                              return;
                            }

                            updateModule(activeModule.id, (mod) => {
                              const cap = mod.state.capacityBytes || 32768;
                              const mem = [...(mod.state.memory || new Array(cap).fill(0xff))];
                              if (rawAddr < cap) {
                                mem[rawAddr] = val & 0xff;
                              }
                              return {
                                ...mod,
                                state: {
                                  ...mod.state,
                                  memory: mem,
                                  lastOperation: 'MANUAL_WRITE_BYTE',
                                  lastOpAddress: rawAddr,
                                  lastOpValue: val & 0xff,
                                  lastOpSuccess: true,
                                  writeCyclesCount: (mod.state.writeCyclesCount || 0) + 1,
                                },
                              };
                            });
                          }}
                          className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-black font-bold px-2 py-1 rounded-2xs text-[10px] uppercase transition-colors cursor-pointer"
                        >
                          Írás
                        </button>
                      </div>
                    </div>

                    {/* String / Page Write */}
                    <div className="p-2 bg-[#14171F] border border-[#2A2D35] rounded-xs space-y-1.5">
                      <div className="text-[9px] font-mono text-sky-400 font-bold uppercase">
                        2. Szöveg / Blokktár Írás (Page Write):
                      </div>
                      <div className="flex items-center gap-1.5 text-xs font-mono">
                        <input
                          type="text"
                          value={eepromWriteStringAddr}
                          onChange={(e) => setEepromWriteStringAddr(e.target.value)}
                          placeholder="0x0020"
                          className="w-20 bg-[#0d0f14] border border-[#2A2D35] px-1.5 py-1 text-slate-200 rounded-2xs text-[11px] focus:outline-hidden focus:border-sky-400"
                        />
                        <input
                          type="text"
                          value={eepromWriteStringVal}
                          onChange={(e) => setEepromWriteStringVal(e.target.value)}
                          placeholder="Szöveg..."
                          className="flex-1 bg-[#0d0f14] border border-[#2A2D35] px-1.5 py-1 text-slate-200 rounded-2xs text-[11px] focus:outline-hidden focus:border-sky-400"
                        />
                        <button
                          onClick={() => {
                            const rawAddr = parseInt(eepromWriteStringAddr, eepromWriteStringAddr.startsWith('0x') ? 16 : 10) || 0;
                            const text = eepromWriteStringVal || '';

                            if (activeModule.state.wpPinActive) {
                              alert('Az EEPROM WP lába aktív! Írás nem engedélyezett.');
                              return;
                            }

                            updateModule(activeModule.id, (mod) => {
                              const cap = mod.state.capacityBytes || 32768;
                              const mem = [...(mod.state.memory || new Array(cap).fill(0xff))];
                              for (let i = 0; i < text.length; i++) {
                                if (rawAddr + i < cap) {
                                  mem[rawAddr + i] = text.charCodeAt(i) & 0xff;
                                }
                              }
                              return {
                                ...mod,
                                state: {
                                  ...mod.state,
                                  memory: mem,
                                  lastOperation: 'MANUAL_WRITE_STRING',
                                  lastOpAddress: rawAddr,
                                  lastOpSuccess: true,
                                  writeCyclesCount: (mod.state.writeCyclesCount || 0) + text.length,
                                },
                              };
                            });
                          }}
                          className="bg-sky-600 hover:bg-sky-500 text-black font-bold px-2 py-1 rounded-2xs text-[10px] uppercase transition-colors cursor-pointer"
                        >
                          Írás
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Real-time Hex & ASCII Memory Inspector Grid */}
              <div className="p-3 bg-[#0d0f14] border border-[#2A2D35] rounded-xs space-y-3">
                {/* Memory Inspector Toolbar */}
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[#2A2D35] text-xs font-mono">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 font-bold flex items-center gap-1.5">
                      <FileCode className="w-4 h-4 text-emerald-400" />
                      Memória Tartalom (HEX & ASCII Térkép)
                    </span>
                    <span className="text-[10px] text-slate-500">
                      (Megjelenítve: 0x{eepromViewOffset.toString(16).padStart(4, '0').toUpperCase()} - 0x{(eepromViewOffset + 127).toString(16).padStart(4, '0').toUpperCase()})
                    </span>
                  </div>

                  {/* Paging & Jump Controls */}
                  <div className="flex items-center gap-1.5">
                    {/* Jump to address input */}
                    <div className="flex items-center gap-1 bg-[#14171F] border border-[#2A2D35] rounded-2xs px-1.5 py-0.5">
                      <span className="text-[10px] text-slate-500">Ugrás:</span>
                      <input
                        type="text"
                        placeholder="0x0000"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            const val = (e.target as HTMLInputElement).value;
                            const addr = parseInt(val, val.startsWith('0x') ? 16 : 10) || 0;
                            const cap = activeModule.state.capacityBytes || 32768;
                            const snapped = Math.max(0, Math.min(cap - 128, Math.floor(addr / 128) * 128));
                            setEepromViewOffset(snapped);
                          }
                        }}
                        className="w-16 bg-transparent text-[10px] font-mono text-amber-300 focus:outline-hidden"
                      />
                    </div>

                    {/* Pagination Buttons */}
                    <button
                      onClick={() => setEepromViewOffset(0)}
                      disabled={eepromViewOffset === 0}
                      className="px-2 py-0.5 bg-[#14171F] hover:bg-[#1A1D24] disabled:opacity-30 border border-[#2A2D35] rounded-2xs text-[10px] text-slate-300 cursor-pointer"
                      title="Első lap"
                    >
                      ⏮️
                    </button>
                    <button
                      onClick={() => setEepromViewOffset(Math.max(0, eepromViewOffset - 128))}
                      disabled={eepromViewOffset === 0}
                      className="px-2 py-0.5 bg-[#14171F] hover:bg-[#1A1D24] disabled:opacity-30 border border-[#2A2D35] rounded-2xs text-[10px] text-slate-300 cursor-pointer"
                      title="Előző 128 bájt"
                    >
                      ◀ Előző
                    </button>
                    <button
                      onClick={() => {
                        const cap = activeModule.state.capacityBytes || 32768;
                        setEepromViewOffset(Math.min(cap - 128, eepromViewOffset + 128));
                      }}
                      disabled={eepromViewOffset + 128 >= (activeModule.state.capacityBytes || 32768)}
                      className="px-2 py-0.5 bg-[#14171F] hover:bg-[#1A1D24] disabled:opacity-30 border border-[#2A2D35] rounded-2xs text-[10px] text-slate-300 cursor-pointer"
                      title="Következő 128 bájt"
                    >
                      Következő ▶
                    </button>
                    <button
                      onClick={() => {
                        const cap = activeModule.state.capacityBytes || 32768;
                        setEepromViewOffset(Math.max(0, cap - 128));
                      }}
                      disabled={eepromViewOffset + 128 >= (activeModule.state.capacityBytes || 32768)}
                      className="px-2 py-0.5 bg-[#14171F] hover:bg-[#1A1D24] disabled:opacity-30 border border-[#2A2D35] rounded-2xs text-[10px] text-slate-300 cursor-pointer"
                      title="Utolsó lap"
                    >
                      ⏭️
                    </button>
                  </div>
                </div>

                {/* Hex Dump Matrix Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left font-mono text-[11px] border-collapse select-text">
                    <thead>
                      <tr className="border-b border-[#2A2D35] text-[#8A8D98] text-[10px]">
                        <th className="py-1 px-2 text-slate-500">Cím</th>
                        {Array.from({ length: 16 }).map((_, col) => (
                          <th key={col} className="py-1 px-1 text-center text-slate-500">
                            {col.toString(16).toUpperCase()}
                          </th>
                        ))}
                        <th className="py-1 px-2 text-slate-500 pl-4">ASCII Dekódolás</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Array.from({ length: 8 }).map((_, rowIdx) => {
                        const rowBase = eepromViewOffset + rowIdx * 16;
                        const mem = activeModule.state.memory || [];
                        const cap = activeModule.state.capacityBytes || 32768;

                        if (rowBase >= cap) return null;

                        const rowBytes: number[] = [];
                        for (let c = 0; c < 16; c++) {
                          rowBytes.push(mem[rowBase + c] ?? 0xff);
                        }

                        return (
                          <tr
                            key={rowBase}
                            className="border-b border-[#1A1D24] hover:bg-[#14171F] transition-colors"
                          >
                            {/* Address Column */}
                            <td className="py-1 px-2 text-sky-400 font-bold whitespace-nowrap">
                              0x{rowBase.toString(16).padStart(4, '0').toUpperCase()}:
                            </td>

                            {/* 16 Hex Cells */}
                            {rowBytes.map((byteVal, colIdx) => {
                              const cellAddr = rowBase + colIdx;
                              const isNonErased = byteVal !== 0xff;
                              const isLastModified = activeModule.state.lastOpAddress === cellAddr;

                              return (
                                <td
                                  key={colIdx}
                                  onClick={() => {
                                    if (activeModule.state.wpPinActive) {
                                      alert('Az EEPROM WP lába aktív! Írásvédelem alatt áll.');
                                      return;
                                    }
                                    const input = prompt(
                                      `Cella szerkesztése [0x${cellAddr.toString(16).padStart(4, '0').toUpperCase()}]:`,
                                      `0x${byteVal.toString(16).padStart(2, '0').toUpperCase()}`
                                    );
                                    if (input !== null) {
                                      let newVal = 0;
                                      if (input.startsWith("'") && input.length >= 3) {
                                        newVal = input.charCodeAt(1);
                                      } else {
                                        newVal = parseInt(input, input.startsWith('0x') ? 16 : 10) || 0;
                                      }
                                      updateModule(activeModule.id, (mod) => {
                                        const newM = [...(mod.state.memory || [])];
                                        newM[cellAddr] = newVal & 0xff;
                                        return {
                                          ...mod,
                                          state: {
                                            ...mod.state,
                                            memory: newM,
                                            lastOperation: 'CELL_CLICK_EDIT',
                                            lastOpAddress: cellAddr,
                                            lastOpValue: newVal & 0xff,
                                            lastOpSuccess: true,
                                            writeCyclesCount: (mod.state.writeCyclesCount || 0) + 1,
                                          },
                                        };
                                      });
                                    }
                                  }}
                                  className={`py-1 px-1 text-center rounded-2xs cursor-pointer transition-all ${
                                    isLastModified
                                      ? 'bg-amber-500/30 text-amber-300 font-bold ring-1 ring-amber-400'
                                      : isNonErased
                                      ? 'text-emerald-400 font-bold bg-emerald-500/10'
                                      : 'text-slate-600 hover:text-slate-300'
                                  }`}
                                  title={`Cím: 0x${cellAddr.toString(16).padStart(4, '0').toUpperCase()} (${cellAddr}) = 0x${byteVal.toString(16).padStart(2, '0').toUpperCase()} (${byteVal}) - Kattints a szerkesztéshez`}
                                >
                                  {byteVal.toString(16).padStart(2, '0').toUpperCase()}
                                </td>
                              );
                            })}

                            {/* ASCII Representation Column */}
                            <td className="py-1 px-2 pl-4 text-slate-400 whitespace-pre">
                              {rowBytes.map((b, idx) => {
                                const ch = b >= 32 && b <= 126 ? String.fromCharCode(b) : '.';
                                const isNonErased = b !== 0xff;
                                return (
                                  <span
                                    key={idx}
                                    className={isNonErased ? 'text-emerald-300 font-bold' : 'text-slate-700'}
                                  >
                                    {ch}
                                  </span>
                                );
                              })}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Export Modal */}
              {isEepromExportModalOpen && (
                <div className="p-3 bg-[#0d0f14] border border-[#2A2D35] rounded-xs space-y-2 animate-in fade-in-50">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="font-bold text-slate-200 uppercase flex items-center gap-1.5">
                      <Download className="w-4 h-4 text-sky-400" />
                      24Cxxx Memória Dump & Kódgenerálás
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          const mem = activeModule.state.memory || [];
                          const cap = Math.min(256, activeModule.state.capacityBytes || 256);
                          let dump = '';
                          if (eepromExportFormat === 'c_array') {
                            dump = `// 24Cxxx (${activeModule.state.chipModel}) EEPROM Dump\nconst uint8_t eeprom_init_data[${cap}] PROGMEM = {\n`;
                            for (let i = 0; i < cap; i += 16) {
                              const slice = mem.slice(i, i + 16);
                              dump += `  /* 0x${i.toString(16).padStart(4, '0')} */ ` + slice.map((b: number) => `0x${b.toString(16).padStart(2, '0').toUpperCase()}`).join(', ') + ',\n';
                            }
                            dump += '};\n';
                          } else if (eepromExportFormat === 'json') {
                            dump = JSON.stringify(mem.slice(0, cap), null, 2);
                          } else {
                            dump = mem.slice(0, cap).map((b: number) => b.toString(16).padStart(2, '0').toUpperCase()).join(' ');
                          }
                          navigator.clipboard.writeText(dump);
                          setEepromCopied(true);
                          setTimeout(() => setEepromCopied(false), 2000);
                        }}
                        className="px-2 py-1 bg-sky-600 hover:bg-sky-500 text-black font-bold text-[10px] rounded-xs flex items-center gap-1 cursor-pointer"
                      >
                        {eepromCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        {eepromCopied ? 'Másolva!' : 'Másolás'}
                      </button>
                      <button
                        onClick={() => setIsEepromExportModalOpen(false)}
                        className="p-1 text-slate-400 hover:text-white cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs font-mono">
                    <span className="text-[10px] text-slate-500">Formátum:</span>
                    <button
                      onClick={() => setEepromExportFormat('c_array')}
                      className={`px-2 py-0.5 text-[10px] rounded-xs cursor-pointer ${
                        eepromExportFormat === 'c_array' ? 'bg-sky-500 text-black font-bold' : 'bg-[#1A1D24] text-slate-400'
                      }`}
                    >
                      C Header Tömb (uint8_t[])
                    </button>
                    <button
                      onClick={() => setEepromExportFormat('hex')}
                      className={`px-2 py-0.5 text-[10px] rounded-xs cursor-pointer ${
                        eepromExportFormat === 'hex' ? 'bg-sky-500 text-black font-bold' : 'bg-[#1A1D24] text-slate-400'
                      }`}
                    >
                      Nyers HEX Dump
                    </button>
                    <button
                      onClick={() => setEepromExportFormat('json')}
                      className={`px-2 py-0.5 text-[10px] rounded-xs cursor-pointer ${
                        eepromExportFormat === 'json' ? 'bg-sky-500 text-black font-bold' : 'bg-[#1A1D24] text-slate-400'
                      }`}
                    >
                      JSON
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* 11. 25LCxxx SPI EEPROM MEMÓRIA MODUL VIEW */}
          {/* ======================================================== */}
          {activeModule.type === 'eeprom_25lcxxx' && (
            <div className="space-y-4">
              {/* Header Status Banner */}
              <div className="p-3 bg-[#0d0f14] border border-[#2A2D35] rounded-xs flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 rounded-xs">
                    <Database className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold text-[#E0E0E6] uppercase tracking-wider font-mono">
                        {activeModule.state.chipModel || '25LC256'} SPI EEPROM
                      </h4>
                      <span className="px-1.5 py-0.5 rounded-2xs text-[9px] font-mono bg-cyan-950 text-cyan-400 border border-cyan-800">
                        {SPI_EEPROM_CHIP_SPECS[activeModule.state.chipModel || '25LC256']?.label || '32 KB SPI EEPROM'}
                      </span>
                      {activeModule.state.wpPinActive ? (
                        <span className="px-1.5 py-0.5 rounded-2xs text-[9px] font-mono bg-rose-950 text-rose-300 border border-rose-800 flex items-center gap-1">
                          <Lock className="w-2.5 h-2.5" /> WP ZÁROLVA
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded-2xs text-[9px] font-mono bg-emerald-950 text-emerald-300 border border-emerald-800 flex items-center gap-1">
                          <Unlock className="w-2.5 h-2.5" /> ÍRHATÓ
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-[#8A8D98]">
                      Hardveres SPI busz (MOSI: D11, MISO: D12, SCK: D13, CS: D{activeModule.pins?.CS || '10'})
                    </p>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      onUpdateModules(
                        modules.map((m) =>
                          m.id === activeModule.id
                            ? { ...m, state: { ...m.state, wpPinActive: !m.state.wpPinActive } }
                            : m
                        )
                      );
                    }}
                    className={`px-2.5 py-1 rounded-xs text-[10px] font-mono font-bold uppercase transition-colors cursor-pointer flex items-center gap-1 ${
                      activeModule.state.wpPinActive
                        ? 'bg-rose-900/50 hover:bg-rose-800 text-rose-200 border border-rose-700'
                        : 'bg-emerald-900/50 hover:bg-emerald-800 text-emerald-200 border border-emerald-700'
                    }`}
                  >
                    {activeModule.state.wpPinActive ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                    WP: {activeModule.state.wpPinActive ? 'HIGH (Védett)' : 'LOW (Engedélyezve)'}
                  </button>

                  <button
                    onClick={() => {
                      const cap = activeModule.state.capacityBytes || 32768;
                      const fresh = new Array(cap).fill(0xff);
                      onUpdateModules(
                        modules.map((m) =>
                          m.id === activeModule.id
                            ? { ...m, state: { ...m.state, memory: fresh, writeCyclesCount: 0, lastCommand: 'CLEARED' } }
                            : m
                        )
                      );
                    }}
                    className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-slate-300 rounded-xs text-[10px] font-mono border border-[#2A2D35] transition-colors cursor-pointer"
                  >
                    0xFF Törlés
                  </button>
                </div>
              </div>

              {/* Status and Last Op */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                <div className="p-2.5 bg-[#12141A] border border-[#2A2D35] rounded-xs">
                  <div className="text-[10px] text-slate-500 uppercase">Utolsó SPI Parancs</div>
                  <div className="font-bold text-cyan-400 mt-0.5">{activeModule.state.lastCommand || 'Nincs'}</div>
                </div>
                <div className="p-2.5 bg-[#12141A] border border-[#2A2D35] rounded-xs">
                  <div className="text-[10px] text-slate-500 uppercase">Utolsó Cím</div>
                  <div className="font-bold text-amber-400 mt-0.5">
                    0x{(activeModule.state.lastOpAddress || 0).toString(16).padStart(4, '0').toUpperCase()}
                  </div>
                </div>
                <div className="p-2.5 bg-[#12141A] border border-[#2A2D35] rounded-xs">
                  <div className="text-[10px] text-slate-500 uppercase">Utolsó Érték</div>
                  <div className="font-bold text-emerald-400 mt-0.5">
                    0x{(activeModule.state.lastOpValue ?? 255).toString(16).padStart(2, '0').toUpperCase()}
                  </div>
                </div>
                <div className="p-2.5 bg-[#12141A] border border-[#2A2D35] rounded-xs">
                  <div className="text-[10px] text-slate-500 uppercase">Írási Ciklusok</div>
                  <div className="font-bold text-purple-400 mt-0.5">{activeModule.state.writeCyclesCount || 0}</div>
                </div>
              </div>

              {/* Memory Hex Grid Sample */}
              <div className="p-3 bg-[#0d0f14] border border-[#2A2D35] rounded-xs space-y-2">
                <div className="flex items-center justify-between text-xs font-mono pb-2 border-b border-[#2A2D35]">
                  <span className="text-slate-400 font-bold flex items-center gap-1.5">
                    <FileCode className="w-4 h-4 text-cyan-400" />
                    25LCxxx SPI Memória HEX Térkép (0x0000 - 0x007F)
                  </span>
                  <span className="text-[10px] text-slate-500">Lapméret: 64 Bájt</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left font-mono text-[11px] border-collapse">
                    <thead>
                      <tr className="border-b border-[#2A2D35] text-[#8A8D98] text-[10px]">
                        <th className="py-1 px-2 text-slate-500">Cím</th>
                        {Array.from({ length: 16 }).map((_, col) => (
                          <th key={col} className="py-1 px-1 text-center text-slate-500">
                            {col.toString(16).toUpperCase()}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {Array.from({ length: 8 }).map((_, rowIdx) => {
                        const rowBase = rowIdx * 16;
                        const mem = activeModule.state.memory || [];
                        return (
                          <tr key={rowIdx} className="hover:bg-cyan-950/20 transition-colors">
                            <td className="py-0.5 px-2 text-cyan-500/70 text-[10px]">
                              0x{rowBase.toString(16).padStart(4, '0').toUpperCase()}
                            </td>
                            {Array.from({ length: 16 }).map((_, colIdx) => {
                              const addr = rowBase + colIdx;
                              const val = mem[addr] ?? 0xff;
                              const isErased = val === 0xff;
                              return (
                                <td
                                  key={colIdx}
                                  className={`py-0.5 px-1 text-center text-[10px] ${
                                    isErased ? 'text-zinc-600' : 'text-cyan-300 font-bold'
                                  }`}
                                >
                                  {val.toString(16).padStart(2, '0').toUpperCase()}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* 12. W25Qxx SPI NOR FLASH MEMÓRIA MODUL VIEW */}
          {/* ======================================================== */}
          {activeModule.type === 'flash_w25qxx' && (
            <div className="space-y-4">
              {/* Header Status Banner */}
              <div className="p-3 bg-[#0d0f14] border border-[#2A2D35] rounded-xs flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-500/10 text-purple-400 border border-purple-500/30 rounded-xs">
                    <HardDrive className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold text-[#E0E0E6] uppercase tracking-wider font-mono">
                        {activeModule.state.chipModel || 'W25Q32'} SPI NOR FLASH
                      </h4>
                      <span className="px-1.5 py-0.5 rounded-2xs text-[9px] font-mono bg-purple-950 text-purple-400 border border-purple-800">
                        {FLASH_CHIP_SPECS[activeModule.state.chipModel || 'W25Q32']?.label || '32 Mbit / 4 MB'}
                      </span>
                      <span className="px-1.5 py-0.5 rounded-2xs text-[9px] font-mono bg-emerald-950 text-emerald-400 border border-emerald-800">
                        Winbond JEDEC: 0xEF 0x40 0x{(activeModule.state.jedecCapacityId || 0x16).toString(16)}
                      </span>
                    </div>
                    <p className="text-[10px] text-[#8A8D98]">
                      24-bites címzés, 4KB szektortörlés (0x20), 256B lap-programozás (0x02)
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      const fresh = new Array(65536).fill(0xff);
                      onUpdateModules(
                        modules.map((m) =>
                          m.id === activeModule.id
                            ? {
                                ...m,
                                state: {
                                  ...m.state,
                                  memory: fresh,
                                  lastCommand: 'CHIP_ERASE_0xC7',
                                  erasedSectorsCount: (m.state.erasedSectorsCount || 0) + 16,
                                },
                              }
                            : m
                        )
                      );
                    }}
                    className="px-2.5 py-1 bg-purple-900/40 hover:bg-purple-800 text-purple-200 border border-purple-700 rounded-xs text-[10px] font-mono transition-colors cursor-pointer"
                  >
                    🧹 Teljes Chip Törlés (0xFF)
                  </button>
                </div>
              </div>

              {/* Status and Parameters */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                <div className="p-2.5 bg-[#12141A] border border-[#2A2D35] rounded-xs">
                  <div className="text-[10px] text-slate-500 uppercase">Gyártói ID</div>
                  <div className="font-bold text-purple-400 mt-0.5">0xEF (Winbond)</div>
                </div>
                <div className="p-2.5 bg-[#12141A] border border-[#2A2D35] rounded-xs">
                  <div className="text-[10px] text-slate-500 uppercase">Memória Típus</div>
                  <div className="font-bold text-cyan-400 mt-0.5">0x40 (SPI Serial Flash)</div>
                </div>
                <div className="p-2.5 bg-[#12141A] border border-[#2A2D35] rounded-xs">
                  <div className="text-[10px] text-slate-500 uppercase">Szektor Méret</div>
                  <div className="font-bold text-amber-400 mt-0.5">4096 B (4 KB)</div>
                </div>
                <div className="p-2.5 bg-[#12141A] border border-[#2A2D35] rounded-xs">
                  <div className="text-[10px] text-slate-500 uppercase">Törölt Szektorok</div>
                  <div className="font-bold text-emerald-400 mt-0.5">{activeModule.state.erasedSectorsCount || 0}</div>
                </div>
              </div>

              {/* Flash Sector 0 Preview */}
              <div className="p-3 bg-[#0d0f14] border border-[#2A2D35] rounded-xs space-y-2">
                <div className="flex items-center justify-between text-xs font-mono pb-2 border-b border-[#2A2D35]">
                  <span className="text-slate-400 font-bold flex items-center gap-1.5">
                    <FileCode className="w-4 h-4 text-purple-400" />
                    W25Qxx Flash 0. Szektor Tartalom (0x000000 - 0x00007F)
                  </span>
                  <span className="text-[10px] text-slate-500">Lapméret: 256 Bájt</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left font-mono text-[11px] border-collapse">
                    <thead>
                      <tr className="border-b border-[#2A2D35] text-[#8A8D98] text-[10px]">
                        <th className="py-1 px-2 text-slate-500">Szektor Cím</th>
                        {Array.from({ length: 16 }).map((_, col) => (
                          <th key={col} className="py-1 px-1 text-center text-slate-500">
                            {col.toString(16).toUpperCase()}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {Array.from({ length: 8 }).map((_, rowIdx) => {
                        const rowBase = rowIdx * 16;
                        const mem = activeModule.state.memory || [];
                        return (
                          <tr key={rowIdx} className="hover:bg-purple-950/20 transition-colors">
                            <td className="py-0.5 px-2 text-purple-500/70 text-[10px]">
                              0x{rowBase.toString(16).padStart(6, '0').toUpperCase()}
                            </td>
                            {Array.from({ length: 16 }).map((_, colIdx) => {
                              const addr = rowBase + colIdx;
                              const val = mem[addr] ?? 0xff;
                              const isErased = val === 0xff;
                              return (
                                <td
                                  key={colIdx}
                                  className={`py-0.5 px-1 text-center text-[10px] ${
                                    isErased ? 'text-zinc-600' : 'text-purple-300 font-bold'
                                  }`}
                                >
                                  {val.toString(16).padStart(2, '0').toUpperCase()}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* 13. MCP23017 16-BITES I2C I/O PORTBŐVÍTŐ VIEW */}
          {/* ======================================================== */}
          {activeModule.type === 'expander_mcp23017' && (
            <div className="space-y-4">
              {/* Header Status Banner */}
              <div className="p-3 bg-[#0d0f14] border border-[#2A2D35] rounded-xs flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded-xs">
                    <Cpu className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold text-[#E0E0E6] uppercase tracking-wider font-mono">
                        MCP23017 16-Bites I2C I/O Portbővítő
                      </h4>
                      <span className="px-1.5 py-0.5 rounded-2xs text-[9px] font-mono bg-amber-950 text-amber-400 border border-amber-800">
                        Cím: {activeModule.state.i2cAddress || '0x20'}
                      </span>
                    </div>
                    <p className="text-[10px] text-[#8A8D98]">
                      Két független 8-bites port: Port A (GPA0-7) és Port B (GPB0-7)
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 font-mono text-xs">
                  <span className="text-[10px] text-slate-400">Utolsó I2C művelet:</span>
                  <span className="px-2 py-0.5 bg-[#1A1D24] text-amber-300 rounded-xs border border-[#2A2D35]">
                    {activeModule.state.lastOperation || 'IDLE'}
                  </span>
                </div>
              </div>

              {/* Port A & Port B Interactive Controls */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Port A Panel */}
                <div className="p-3 bg-[#12141A] border border-[#2A2D35] rounded-xs space-y-3">
                  <div className="flex items-center justify-between border-b border-[#2A2D35] pb-2 font-mono">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-amber-400">PORT A (GPA0 - GPA7)</span>
                      <span className="text-[10px] text-slate-500">
                        IODIRA: 0x{(activeModule.state.iodirA ?? 0).toString(16).padStart(2, '0').toUpperCase()}
                      </span>
                    </div>
                    <span className="text-[11px] font-bold text-emerald-400">
                      0x{(activeModule.state.gpioA ?? 0).toString(16).padStart(2, '0').toUpperCase()} (B{(activeModule.state.gpioA ?? 0).toString(2).padStart(8, '0')})
                    </span>
                  </div>

                  <div className="grid grid-cols-8 gap-1.5 text-center font-mono">
                    {Array.from({ length: 8 }).map((_, bit) => {
                      const pinVal = (((activeModule.state.gpioA ?? 0) >> bit) & 1) === 1;
                      const isInput = (((activeModule.state.iodirA ?? 0) >> bit) & 1) === 1;
                      return (
                        <button
                          key={bit}
                          onClick={() => {
                            const current = activeModule.state.gpioA ?? 0;
                            const next = current ^ (1 << bit);
                            onUpdateModules(
                              modules.map((m) =>
                                m.id === activeModule.id
                                  ? {
                                      ...m,
                                      state: {
                                        ...m.state,
                                        gpioA: next,
                                        olatA: next,
                                        lastOperation: `GPA${bit}_TOGGLE`,
                                      },
                                    }
                                  : m
                              )
                            );
                          }}
                          className={`p-2 rounded-xs border transition-all cursor-pointer flex flex-col items-center gap-1 ${
                            pinVal
                              ? 'bg-amber-500/20 border-amber-500 text-amber-300 shadow-[0_0_8px_rgba(245,158,11,0.3)]'
                              : 'bg-[#1A1D24] border-[#2A2D35] text-slate-500 hover:border-slate-500'
                          }`}
                        >
                          <span className="text-[9px]">A{bit}</span>
                          <div
                            className={`w-3 h-3 rounded-full border ${
                              pinVal ? 'bg-amber-400 border-amber-300' : 'bg-zinc-800 border-zinc-700'
                            }`}
                          />
                          <span className="text-[8px] opacity-75">{isInput ? 'IN' : 'OUT'}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Port B Panel */}
                <div className="p-3 bg-[#12141A] border border-[#2A2D35] rounded-xs space-y-3">
                  <div className="flex items-center justify-between border-b border-[#2A2D35] pb-2 font-mono">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-sky-400">PORT B (GPB0 - GPB7)</span>
                      <span className="text-[10px] text-slate-500">
                        IODIRB: 0x{(activeModule.state.iodirB ?? 0).toString(16).padStart(2, '0').toUpperCase()}
                      </span>
                    </div>
                    <span className="text-[11px] font-bold text-emerald-400">
                      0x{(activeModule.state.gpioB ?? 0).toString(16).padStart(2, '0').toUpperCase()} (B{(activeModule.state.gpioB ?? 0).toString(2).padStart(8, '0')})
                    </span>
                  </div>

                  <div className="grid grid-cols-8 gap-1.5 text-center font-mono">
                    {Array.from({ length: 8 }).map((_, bit) => {
                      const pinVal = (((activeModule.state.gpioB ?? 0) >> bit) & 1) === 1;
                      const isInput = (((activeModule.state.iodirB ?? 0) >> bit) & 1) === 1;
                      return (
                        <button
                          key={bit}
                          onClick={() => {
                            const current = activeModule.state.gpioB ?? 0;
                            const next = current ^ (1 << bit);
                            onUpdateModules(
                              modules.map((m) =>
                                m.id === activeModule.id
                                  ? {
                                      ...m,
                                      state: {
                                        ...m.state,
                                        gpioB: next,
                                        olatB: next,
                                        lastOperation: `GPB${bit}_TOGGLE`,
                                      },
                                    }
                                  : m
                              )
                            );
                          }}
                          className={`p-2 rounded-xs border transition-all cursor-pointer flex flex-col items-center gap-1 ${
                            pinVal
                              ? 'bg-sky-500/20 border-sky-500 text-sky-300 shadow-[0_0_8px_rgba(56,189,248,0.3)]'
                              : 'bg-[#1A1D24] border-[#2A2D35] text-slate-500 hover:border-slate-500'
                          }`}
                        >
                          <span className="text-[9px]">B{bit}</span>
                          <div
                            className={`w-3 h-3 rounded-full border ${
                              pinVal ? 'bg-sky-400 border-sky-300' : 'bg-zinc-800 border-zinc-700'
                            }`}
                          />
                          <span className="text-[8px] opacity-75">{isInput ? 'IN' : 'OUT'}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* 14. PCF8574 8-BITES I2C PORTBŐVÍTŐ VIEW */}
          {/* ======================================================== */}
          {activeModule.type === 'expander_pcf8574' && (
            <div className="space-y-4">
              {/* Header Status Banner */}
              <div className="p-3 bg-[#0d0f14] border border-[#2A2D35] rounded-xs flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-sky-500/10 text-sky-400 border border-sky-500/30 rounded-xs">
                    <Sliders className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold text-[#E0E0E6] uppercase tracking-wider font-mono">
                        PCF8574 / PCF8574A 8-Bites I2C Portbővítő
                      </h4>
                      <span className="px-1.5 py-0.5 rounded-2xs text-[9px] font-mono bg-sky-950 text-sky-400 border border-sky-800">
                        I2C Cím: {activeModule.state.i2cAddress || '0x20'}
                      </span>
                    </div>
                    <p className="text-[10px] text-[#8A8D98]">
                      8 Quasi-bidirectionális I/O láb (P0 - P7) közvetlen bájtszintű írással/olvasással
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 font-mono text-xs">
                  <span className="text-[10px] text-slate-400">Jelenlegi Port Érték:</span>
                  <span className="px-2 py-0.5 bg-[#1A1D24] text-sky-300 font-bold rounded-xs border border-[#2A2D35]">
                    0x{(activeModule.state.portValue ?? 0).toString(16).padStart(2, '0').toUpperCase()}
                  </span>
                </div>
              </div>

              {/* 8 Live Pin Toggles */}
              <div className="p-4 bg-[#12141A] border border-[#2A2D35] rounded-xs space-y-3">
                <div className="flex items-center justify-between border-b border-[#2A2D35] pb-2 font-mono text-xs">
                  <span className="text-slate-400 font-bold">P0 - P7 Kimeneti / Bemeneti Állapotok</span>
                  <span className="text-slate-500 text-[10px]">Kattints a lábak közvetlen átkapcsolásához</span>
                </div>

                <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 font-mono">
                  {Array.from({ length: 8 }).map((_, bit) => {
                    const pinVal = (((activeModule.state.portValue ?? 0) >> bit) & 1) === 1;
                    return (
                      <button
                        key={bit}
                        onClick={() => {
                          const current = activeModule.state.portValue ?? 0;
                          const next = current ^ (1 << bit);
                          const pinArr = [...(activeModule.state.pinValues || [false, false, false, false, false, false, false, false])];
                          pinArr[bit] = ((next >> bit) & 1) === 1;
                          onUpdateModules(
                            modules.map((m) =>
                              m.id === activeModule.id
                                ? {
                                    ...m,
                                    state: {
                                      ...m.state,
                                      portValue: next,
                                      pinValues: pinArr,
                                      lastOperation: `P${bit}_TOGGLE`,
                                    },
                                  }
                                : m
                            )
                          );
                        }}
                        className={`p-3 rounded-xs border transition-all cursor-pointer flex flex-col items-center gap-1.5 ${
                          pinVal
                            ? 'bg-sky-500/20 border-sky-500 text-sky-300 shadow-[0_0_8px_rgba(56,189,248,0.3)]'
                            : 'bg-[#1A1D24] border-[#2A2D35] text-slate-500 hover:border-slate-500'
                        }`}
                      >
                        <span className="text-xs font-bold">P{bit}</span>
                        <div
                          className={`w-4 h-4 rounded-full border ${
                            pinVal ? 'bg-sky-400 border-sky-300' : 'bg-zinc-800 border-zinc-700'
                          }`}
                        />
                        <span className="text-[9px] font-bold">{pinVal ? 'HIGH (1)' : 'LOW (0)'}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* 15. 74HC165 8-BITES PISO SHIFT-REGISZTER VIEW */}
          {/* ======================================================== */}
          {activeModule.type === 'shift_74hc165' && (
            <div className="space-y-4">
              {/* Header Status Banner */}
              <div className="p-3 bg-[#0d0f14] border border-[#2A2D35] rounded-xs flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-teal-500/10 text-teal-400 border border-teal-500/30 rounded-xs">
                    <Layers className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold text-[#E0E0E6] uppercase tracking-wider font-mono">
                        74HC165 8-Bites PISO Léptetőregiszter
                      </h4>
                      <span className="px-1.5 py-0.5 rounded-2xs text-[9px] font-mono bg-teal-950 text-teal-400 border border-teal-800">
                        Párhuzamos Bemenet &rarr; Soros Kimenet (Q7)
                      </span>
                    </div>
                    <p className="text-[10px] text-[#8A8D98]">
                      Lábak: PL (Latch: D{activeModule.pins?.PL || '9'}), CP (Clock: D{activeModule.pins?.CP || '13'}), Q7 (Data: D{activeModule.pins?.Q7 || '12'})
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 font-mono text-xs">
                  <span className="text-[10px] text-slate-400">Reteszelt Bájt:</span>
                  <span className="px-2.5 py-1 bg-teal-950/60 text-teal-300 font-bold rounded-xs border border-teal-700">
                    0x{(activeModule.state.latchedData ?? 0x35).toString(16).padStart(2, '0').toUpperCase()}
                  </span>
                </div>
              </div>

              {/* 8 Input Dip Switches */}
              <div className="p-4 bg-[#12141A] border border-[#2A2D35] rounded-xs space-y-3">
                <div className="flex items-center justify-between border-b border-[#2A2D35] pb-2 font-mono text-xs">
                  <span className="text-slate-400 font-bold">D0 - D7 Párhuzamos Bemeneti Kapcsolók (DIP Switch)</span>
                  <span className="text-slate-500 text-[10px]">Kattints a kapcsolók átbillentéséhez</span>
                </div>

                <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 font-mono">
                  {Array.from({ length: 8 }).map((_, bit) => {
                    const inputs = activeModule.state.inputsD || [false, false, false, false, false, false, false, false];
                    const isHigh = inputs[bit] === true;
                    return (
                      <button
                        key={bit}
                        onClick={() => {
                          const nextInputs = [...inputs];
                          nextInputs[bit] = !isHigh;
                          let nextVal = 0;
                          for (let i = 0; i < 8; i++) {
                            if (nextInputs[i]) nextVal |= (1 << i);
                          }
                          onUpdateModules(
                            modules.map((m) =>
                              m.id === activeModule.id
                                ? {
                                    ...m,
                                    state: {
                                      ...m.state,
                                      inputsD: nextInputs,
                                      latchedData: nextVal,
                                      shiftRegisterVal: nextVal,
                                      lastReadByteHex: `0x${nextVal.toString(16).padStart(2, '0').toUpperCase()}`,
                                    },
                                  }
                                : m
                            )
                          );
                        }}
                        className={`p-3 rounded-xs border transition-all cursor-pointer flex flex-col items-center gap-2 ${
                          isHigh
                            ? 'bg-teal-500/20 border-teal-500 text-teal-300 shadow-[0_0_8px_rgba(20,184,166,0.3)]'
                            : 'bg-[#1A1D24] border-[#2A2D35] text-slate-500 hover:border-slate-500'
                        }`}
                      >
                        <span className="text-xs font-bold">D{bit}</span>
                        <div
                          className={`w-6 h-10 rounded-2xs border p-0.5 flex flex-col ${
                            isHigh ? 'bg-teal-900 border-teal-400 justify-start' : 'bg-zinc-800 border-zinc-700 justify-end'
                          }`}
                        >
                          <div className={`w-full h-4 rounded-2xs ${isHigh ? 'bg-teal-400' : 'bg-zinc-600'}`} />
                        </div>
                        <span className="text-[9px] font-bold">{isHigh ? 'ON (1)' : 'OFF (0)'}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="p-8 text-center bg-[#161920] border border-[#2A2D35] rounded-xs">
          <Layers className="w-8 h-8 text-[#8A8D98] mx-auto mb-2 opacity-50" />
          <p className="text-xs text-[#8A8D98]">Nincs csatlakoztatott dinamikus modul.</p>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="mt-3 px-3 py-1.5 bg-[#38bdf8] text-black font-bold text-xs uppercase rounded-xs cursor-pointer"
          >
            + Modul Csatlakoztatása
          </button>
        </div>
      )}

      {/* ======================================================== */}
      {/* ADD MODULE FROM CATALOG MODAL */}
      {/* ======================================================== */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#161920] border border-[#2A2D35] rounded-xs shadow-[4px_4px_0px_#000] w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in-50 zoom-in-95">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-[#2A2D35]">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-[#38bdf8]/10 text-[#38bdf8] rounded-xs border border-[#38bdf8]/30">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-[#E0E0E6]">
                    Dinamikus Hardver Modul Hozzáadása
                  </h3>
                  <p className="text-[11px] text-[#8A8D98]">
                    Válassz ki egy hardver modult az interaktív áramkörhöz
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 text-[#8A8D98] hover:text-[#E0E0E6] hover:bg-[#1A1D24] rounded-xs transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Category Filter Tabs */}
            <div className="flex items-center gap-1 p-2 bg-[#12141A] border-b border-[#2A2D35] overflow-x-auto">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCatalogCategory(cat)}
                  className={`px-2.5 py-1 rounded-xs text-[10px] font-bold uppercase tracking-wider whitespace-nowrap transition-all cursor-pointer ${
                    selectedCatalogCategory === cat
                      ? 'bg-[#38bdf8] text-black shadow-[1px_1px_0px_#000]'
                      : 'text-[#8A8D98] hover:text-[#E0E0E6] hover:bg-[#1A1D24]'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Catalog Grid */}
            <div className="p-4 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filteredCatalog.map((item) => {
                const IconComponent = MODULE_ICONS[item.type] || Layers;
                return (
                  <div
                    key={item.type}
                    className="p-3.5 bg-[#1A1D24] border border-[#2A2D35] hover:border-[#38bdf8] rounded-xs shadow-[2px_2px_0px_#000] flex flex-col justify-between gap-3 transition-all group"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div
                            className="p-2 rounded-xs border"
                            style={{
                              backgroundColor: `${item.accentColor}15`,
                              borderColor: `${item.accentColor}40`,
                              color: item.accentColor,
                            }}
                          >
                            <IconComponent className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-[#E0E0E6] group-hover:text-[#38bdf8] transition-colors">
                              {item.name}
                            </h4>
                            <span className="text-[9px] font-mono text-[#8A8D98]">
                              {item.category}
                            </span>
                          </div>
                        </div>
                      </div>
                      <p className="text-[11px] text-[#8A8D98] leading-relaxed">
                        {item.shortDesc}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-[#2A2D35]">
                      <div className="text-[9px] font-mono text-[#8A8D98]">
                        Lábak:{' '}
                        {Object.entries(item.defaultPins)
                          .map(([k, v]) => `${k}:${v}`)
                          .join(', ')}
                      </div>
                      <button
                        onClick={() => addModuleFromCatalog(item)}
                        className="px-3 py-1 bg-[#38bdf8] hover:bg-[#0284c7] text-black font-bold text-[10px] uppercase rounded-xs transition-all shadow-[1px_1px_0px_#000] cursor-pointer"
                      >
                        + Csatlakoztat
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
