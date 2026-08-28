import React, { useState } from 'react';
import {
  Cpu,
  Wifi,
  Radio,
  Sliders,
  HardDrive,
  Moon,
  Zap,
  Globe,
  Send,
  RefreshCw,
  Activity,
  Layers,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  Flame,
} from 'lucide-react';
import { SimulationState, Esp32SimulationState, Esp32FreeRtosTask } from '../types';
import { ESP32_PIN_MAPPINGS, ESP32_PINS_ORDER } from '../utils/esp32HardwareMap';

interface Esp32DevKitVisualizerProps {
  simulation: SimulationState;
  onUpdateEsp32State?: (updater: (prev: Esp32SimulationState) => Esp32SimulationState) => void;
  onSendSerialInput?: (text: string) => void;
  onOpenDmaModal?: () => void;
  onOpenI2aModal?: () => void;
  onOpenConnectivityModal?: () => void;
  onOpenInterruptModal?: () => void;
}

export const Esp32DevKitVisualizer: React.FC<Esp32DevKitVisualizerProps> = ({
  simulation,
  onUpdateEsp32State,
  onSendSerialInput,
  onOpenDmaModal,
  onOpenI2aModal,
  onOpenConnectivityModal,
  onOpenInterruptModal,
}) => {
  const esp32 = simulation.esp32State;
  const [activeTab, setActiveTab] = useState<'board' | 'freertos' | 'wifi' | 'touch_dac' | 'nvs' | 'sleep'>('board');
  const [selectedPin, setSelectedPin] = useState<string>('2');
  const [httpPath, setHttpPath] = useState<string>('/api/status');
  const [httpMethod, setHttpMethod] = useState<'GET' | 'POST'>('GET');
  const [httpResponse, setHttpResponse] = useState<string>('{"mcu":"ESP32-WROOM-32","status":"online","freeHeap":287410}');
  const [newNvsKey, setNewNvsKey] = useState<string>('');
  const [newNvsVal, setNewNvsVal] = useState<string>('');
  const [newNvsNs, setNewNvsNs] = useState<string>('user');

  if (!esp32) {
    return (
      <div id="esp32-not-initialized" className="p-6 text-center text-slate-400 bg-[#0E1117] rounded-lg border border-slate-800">
        <Cpu className="w-8 h-8 mx-auto mb-2 text-cyan-400 animate-spin" />
        <p className="font-mono text-sm">ESP32 hardveres állapot inicializálása folyamatban...</p>
      </div>
    );
  }

  // Handle Virtual HTTP Web Server Request
  const handleSendHttpRequest = () => {
    const route = esp32.wifi.webServer.routes.find(
      (r) => r.path === httpPath && (r.method === httpMethod || r.method === 'ANY')
    );

    let resBody = '';
    let status = 200;

    if (httpPath === '/led/toggle') {
      const pin2 = esp32.pinStates32['2'];
      const nextVal = pin2?.value === 1 ? 0 : 1;
      if (onUpdateEsp32State) {
        onUpdateEsp32State((prev) => ({
          ...prev,
          pinStates32: {
            ...prev.pinStates32,
            '2': {
              ...prev.pinStates32['2'],
              value: nextVal as (0 | 1),
            },
          },
        }));
      }
      resBody = JSON.stringify({ status: 'ok', led: nextVal === 1 ? 'ON' : 'OFF', pin: 2 });
    } else if (route && route.responseBody) {
      resBody = route.responseBody;
    } else if (httpPath === '/api/status') {
      resBody = JSON.stringify({
        mcu: 'ESP32-D0WD-V3 (Xtensa LX6 Dual-Core)',
        clockMhz: 240,
        core0_load: `${esp32.core0.cpuLoadPercent}%`,
        core1_load: `${esp32.core1.cpuLoadPercent}%`,
        freeHeap: 287410,
        wifiRssi: `${esp32.wifi.rssi} dBm`,
        uptimeTicks: esp32.freeRtos.tickCount,
      }, null, 2);
    } else if (httpPath === '/') {
      resBody = `<!DOCTYPE html><html><head><title>ESP32 Web Server</title></head><body style="font-family:sans-serif;padding:20px;"><h1>ESP32 NodeMCU Web Server</h1><p>Status: Online (240 MHz)</p><p>Core 0: ${esp32.core0.cpuLoadPercent}% | Core 1: ${esp32.core1.cpuLoadPercent}%</p><hr/><a href="/led/toggle">Toggle LED D2</a></body></html>`;
    } else {
      status = 404;
      resBody = JSON.stringify({ error: '404 Not Found', path: httpPath });
    }

    setHttpResponse(resBody);

    if (onUpdateEsp32State) {
      onUpdateEsp32State((prev) => ({
        ...prev,
        wifi: {
          ...prev.wifi,
          webServer: {
            ...prev.wifi.webServer,
            requestLog: [
              {
                id: `req_${Date.now()}`,
                timestamp: new Date().toLocaleTimeString(),
                method: httpMethod,
                path: httpPath,
                clientIp: '192.168.1.42',
                responseCode: status,
                response: resBody,
              },
              ...prev.wifi.webServer.requestLog.slice(0, 15),
            ],
          },
        },
      }));
    }
  };

  // Toggle Touch Pad Click
  const handleTouchPadToggle = (pinStr: string) => {
    const current = esp32.touch[pinStr] ?? 85;
    const next = current < 40 ? 85 : 25; // drop to 25 when touched (<40 threshold)
    if (onUpdateEsp32State) {
      onUpdateEsp32State((prev) => ({
        ...prev,
        touch: {
          ...prev.touch,
          [pinStr]: next,
        },
        pinStates32: {
          ...prev.pinStates32,
          [pinStr]: {
            ...prev.pinStates32[pinStr],
            touchValue: next,
            mode: 'TOUCH',
          },
        },
      }));
    }
  };

  // Add NVS Entry
  const handleAddNvs = () => {
    if (!newNvsKey.trim()) return;
    if (onUpdateEsp32State) {
      onUpdateEsp32State((prev) => ({
        ...prev,
        nvs: {
          ...prev.nvs,
          [newNvsKey]: {
            namespace: newNvsNs || 'user',
            key: newNvsKey,
            type: 'string',
            value: newNvsVal,
            lastModified: Date.now(),
          },
        },
      }));
    }
    setNewNvsKey('');
    setNewNvsVal('');
  };

  const isLedOn = esp32.pinStates32['2']?.value === 1;

  // Left & Right Pin Column groups for DevKit Board layout
  const leftPins = ['3V3', 'EN', '36', '39', '34', '35', '32', '33', '25', '26', '27', '14', '12', 'GND', '13', '9', '10', '11', '5'];
  const rightPins = ['GND', '23', '22', '1', '3', '21', 'GND', '19', '18', '5', '17', '16', '4', '0', '2', '15', '8', '7', '6', 'VIN'];

  return (
    <div id="esp32-devkit-visualizer" className="flex flex-col h-full bg-[#0B0D13] text-slate-200 text-xs select-none">
      {/* Sub-Header Navigation */}
      <div id="esp32-subtabs" className="flex items-center justify-between border-b border-slate-800 px-3 py-1.5 bg-[#12151E] overflow-x-auto gap-1">
        <div className="flex items-center gap-1">
          <button
            id="tab-esp32-board"
            onClick={() => setActiveTab('board')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded font-mono text-[11px] font-semibold transition-all cursor-pointer ${
              activeTab === 'board'
                ? 'bg-cyan-500 text-black shadow-[0_0_12px_rgba(6,182,212,0.4)]'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>DevKit Hardver</span>
          </button>

          <button
            id="tab-esp32-freertos"
            onClick={() => setActiveTab('freertos')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded font-mono text-[11px] font-semibold transition-all cursor-pointer ${
              activeTab === 'freertos'
                ? 'bg-sky-500 text-black shadow-[0_0_12px_rgba(14,165,233,0.4)]'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>FreeRTOS (Kétmagos)</span>
          </button>

          <button
            id="tab-esp32-wifi"
            onClick={() => setActiveTab('wifi')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded font-mono text-[11px] font-semibold transition-all cursor-pointer ${
              activeTab === 'wifi'
                ? 'bg-emerald-500 text-black shadow-[0_0_12px_rgba(16,185,129,0.4)]'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Wifi className="w-3.5 h-3.5" />
            <span>Wi-Fi & WebSzerver</span>
          </button>

          <button
            id="tab-esp32-touch-dac"
            onClick={() => setActiveTab('touch_dac')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded font-mono text-[11px] font-semibold transition-all cursor-pointer ${
              activeTab === 'touch_dac'
                ? 'bg-amber-400 text-black shadow-[0_0_12px_rgba(251,191,36,0.4)]'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Touch & DAC Oszcilloszkóp</span>
          </button>

          <button
            id="tab-esp32-nvs"
            onClick={() => setActiveTab('nvs')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded font-mono text-[11px] font-semibold transition-all cursor-pointer ${
              activeTab === 'nvs'
                ? 'bg-purple-400 text-black shadow-[0_0_12px_rgba(192,132,252,0.4)]'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <HardDrive className="w-3.5 h-3.5" />
            <span>NVS Flash Tár</span>
          </button>

          <button
            id="tab-esp32-sleep"
            onClick={() => setActiveTab('sleep')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded font-mono text-[11px] font-semibold transition-all cursor-pointer ${
              activeTab === 'sleep'
                ? 'bg-indigo-400 text-black shadow-[0_0_12px_rgba(129,140,248,0.4)]'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Moon className="w-3.5 h-3.5" />
            <span>Mélyalvás (Deep Sleep)</span>
          </button>
        </div>

        {/* Action Tools: Connectivity, DMA & I2A Quick Access */}
        <div className="flex items-center gap-2">
          {onOpenConnectivityModal && (
            <button
              id="btn-open-connectivity-from-visualizer"
              type="button"
              onClick={onOpenConnectivityModal}
              className="flex items-center gap-1 px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-emerald-950/80 text-emerald-300 hover:bg-emerald-900 border border-emerald-500/50 shadow-[0_0_8px_rgba(16,185,129,0.3)] transition-all cursor-pointer"
              title="ESP32 WiFi, Statikus IP & BLE Advertising Menedzsment Modal"
            >
              <Wifi className="w-3 h-3 text-emerald-400" />
              <span>WiFi / BLE</span>
            </button>
          )}

          {onOpenDmaModal && (
            <button
              id="btn-open-dma-from-visualizer"
              type="button"
              onClick={onOpenDmaModal}
              className="flex items-center gap-1 px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-cyan-950/80 text-cyan-300 hover:bg-cyan-900 border border-cyan-500/50 shadow-[0_0_8px_rgba(6,182,212,0.3)] transition-all cursor-pointer"
              title="ESP32 Hardveres DMA Controller & Ring Buffer Menedzser"
            >
              <Zap className="w-3 h-3 text-cyan-400" />
              <span>DMA Menedzser</span>
            </button>
          )}

          {onOpenI2aModal && (
            <button
              id="btn-open-i2a-from-visualizer"
              type="button"
              onClick={onOpenI2aModal}
              className="flex items-center gap-1 px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-purple-950/80 text-purple-300 hover:bg-purple-900 border border-purple-500/50 shadow-[0_0_8px_rgba(168,85,247,0.3)] transition-all cursor-pointer"
              title="ESP32 I2A / I2S Audio & Párhuzamos Busz Menedzser"
            >
              <Radio className="w-3 h-3 text-purple-400" />
              <span>I2A/I2S Audio</span>
            </button>
          )}

          {onOpenInterruptModal && (
            <button
              id="btn-open-interrupts-from-visualizer"
              type="button"
              onClick={onOpenInterruptModal}
              className="flex items-center gap-1 px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-sky-950/80 text-sky-300 hover:bg-sky-900 border border-sky-500/50 shadow-[0_0_8px_rgba(14,165,233,0.3)] transition-all cursor-pointer"
              title="ESP32 Kétmagos Megszakítás Mátrix & ISR Tervező"
            >
              <Zap className="w-3 h-3 text-sky-400" />
              <span>Megszakítások</span>
            </button>
          )}

          {/* Live Frequency Badge */}
          <div className="flex items-center gap-2 font-mono text-[10px] text-cyan-400 bg-cyan-950/40 border border-cyan-800/60 px-2 py-0.5 rounded">
            <Zap className="w-3 h-3 text-cyan-400 animate-pulse" />
            <span>240 MHz (4.16 ns)</span>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-3">
        {/* TAB 1: BOARD VISUALIZER */}
        {activeTab === 'board' && (
          <div id="esp32-board-view" className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
            {/* DevKit Board Schematic / Visualizer */}
            <div className="lg:col-span-7 bg-[#10131B] border border-slate-800 rounded-lg p-4 flex flex-col items-center relative">
              {/* Board Header Title */}
              <div className="w-full flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-cyan-400 animate-pulse" />
                  <span className="font-mono font-bold text-sm text-cyan-300">ESP32 DevKit V1 (38-Pin)</span>
                </div>
                <span className="text-[10px] font-mono text-slate-400">ESP-WROOM-32 (Xtensa Dual-Core)</span>
              </div>

              {/* Physical Board Graphic Container */}
              <div className="relative w-full max-w-[360px] bg-[#161922] border-2 border-slate-700 rounded-xl p-3 shadow-2xl flex justify-between">
                {/* Left Pin Header */}
                <div className="flex flex-col justify-between space-y-1 text-[9px] font-mono">
                  {leftPins.map((pinKey, idx) => {
                    const isGpio = !isNaN(Number(pinKey));
                    const pinState = isGpio ? esp32.pinStates32[pinKey] : null;
                    const isHigh = pinState?.value === 1;
                    const isSelected = selectedPin === pinKey;
                    const mapping = isGpio ? ESP32_PIN_MAPPINGS[pinKey] : null;

                    return (
                      <div
                        key={`left-${pinKey}-${idx}`}
                        onClick={() => isGpio && setSelectedPin(pinKey)}
                        className={`flex items-center gap-1.5 cursor-pointer px-1 py-0.5 rounded transition-all ${
                          isSelected ? 'bg-cyan-500/20 border border-cyan-500 text-cyan-300' : 'hover:bg-slate-800'
                        }`}
                      >
                        <div
                          className={`w-2.5 h-2.5 rounded-xs border transition-all ${
                            isHigh
                              ? 'bg-emerald-400 border-emerald-300 shadow-[0_0_6px_#34d399]'
                              : isGpio
                              ? 'bg-slate-800 border-slate-600'
                              : pinKey === '3V3'
                              ? 'bg-red-500 border-red-400'
                              : 'bg-slate-700 border-slate-500'
                          }`}
                        />
                        <span className="font-bold">{pinKey}</span>
                        {mapping?.adcChannel && <span className="text-[8px] text-amber-400/80">{mapping.adcChannel}</span>}
                        {mapping?.dacChannel && <span className="text-[8px] text-purple-400/80">{mapping.dacChannel}</span>}
                        {mapping?.touchChannel && <span className="text-[8px] text-sky-400/80">{mapping.touchChannel}</span>}
                      </div>
                    );
                  })}
                </div>

                {/* Central PCB & Metal Shield Area */}
                <div className="flex-1 mx-3 flex flex-col items-center justify-between bg-[#0D0F16] border border-slate-800 rounded-lg p-2 relative">
                  {/* Micro-USB Top Connector */}
                  <div className="w-12 h-4 bg-slate-700 border border-slate-500 rounded-t-sm flex items-center justify-center text-[7px] font-mono text-slate-300 mb-2">
                    USB 5V
                  </div>

                  {/* ESP-WROOM-32 Metal RF Shield */}
                  <div className="w-full bg-gradient-to-b from-slate-700 to-slate-850 border border-slate-500 rounded p-2.5 text-center shadow-inner relative">
                    {/* PCB Antenna Trace at Top */}
                    <div className="w-full h-3 border-t-2 border-r-2 border-l-2 border-amber-600/70 mb-1 rounded-t flex justify-around">
                      <div className="w-1 h-2 bg-amber-600/70" />
                      <div className="w-1 h-2 bg-amber-600/70" />
                      <div className="w-1 h-2 bg-amber-600/70" />
                    </div>

                    <div className="font-bold text-[11px] font-mono text-slate-200 tracking-wider">ESPRESSIF</div>
                    <div className="text-[9px] font-mono text-slate-400">ESP-WROOM-32</div>
                    <div className="text-[8px] font-mono text-cyan-400 mt-1">240 MHz 32-bit Tensilica</div>

                    {/* Dual Core Live Gauges on Shield */}
                    <div className="grid grid-cols-2 gap-1 mt-2 pt-2 border-t border-slate-700 text-[8px] font-mono">
                      <div className="bg-slate-900/80 p-1 rounded border border-slate-700">
                        <div className="text-slate-400">Core 0 (PRO)</div>
                        <div className="text-cyan-300 font-bold">{esp32.core0.cpuLoadPercent}%</div>
                      </div>
                      <div className="bg-slate-900/80 p-1 rounded border border-slate-700">
                        <div className="text-slate-400">Core 1 (APP)</div>
                        <div className="text-emerald-300 font-bold">{esp32.core1.cpuLoadPercent}%</div>
                      </div>
                    </div>
                  </div>

                  {/* Status LEDs & Physical Push Buttons */}
                  <div className="w-full mt-3 flex items-center justify-between px-2">
                    {/* EN / Reset Button */}
                    <button
                      onClick={() => onSendSerialInput && onSendSerialInput('[ESP32 Hardware Reset Triggered]\n')}
                      className="px-2 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded text-[8px] font-mono text-slate-300 active:scale-95 cursor-pointer"
                    >
                      EN (RST)
                    </button>

                    {/* Built-in LEDs */}
                    <div className="flex flex-col items-center gap-1">
                      {/* Power Red LED */}
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_#ef4444]" />
                        <span className="text-[7px] text-slate-400">PWR</span>
                      </div>
                      {/* Built-in Blue LED (GPIO2) */}
                      <div className="flex items-center gap-1">
                        <div
                          className={`w-2 h-2 rounded-full transition-all ${
                            isLedOn
                              ? 'bg-blue-400 shadow-[0_0_10px_#60a5fa]'
                              : 'bg-blue-950 border border-blue-900'
                          }`}
                        />
                        <span className="text-[7px] text-blue-300 font-bold">D2 LED</span>
                      </div>
                    </div>

                    {/* BOOT / GPIO0 Button */}
                    <button
                      onClick={() => handleTouchPadToggle('0')}
                      className="px-2 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded text-[8px] font-mono text-slate-300 active:scale-95 cursor-pointer"
                    >
                      BOOT (D0)
                    </button>
                  </div>
                </div>

                {/* Right Pin Header */}
                <div className="flex flex-col justify-between space-y-1 text-[9px] font-mono items-end">
                  {rightPins.map((pinKey, idx) => {
                    const isGpio = !isNaN(Number(pinKey));
                    const pinState = isGpio ? esp32.pinStates32[pinKey] : null;
                    const isHigh = pinState?.value === 1;
                    const isSelected = selectedPin === pinKey;
                    const mapping = isGpio ? ESP32_PIN_MAPPINGS[pinKey] : null;

                    return (
                      <div
                        key={`right-${pinKey}-${idx}`}
                        onClick={() => isGpio && setSelectedPin(pinKey)}
                        className={`flex items-center gap-1.5 cursor-pointer px-1 py-0.5 rounded transition-all ${
                          isSelected ? 'bg-cyan-500/20 border border-cyan-500 text-cyan-300' : 'hover:bg-slate-800'
                        }`}
                      >
                        {mapping?.adcChannel && <span className="text-[8px] text-amber-400/80">{mapping.adcChannel}</span>}
                        {mapping?.dacChannel && <span className="text-[8px] text-purple-400/80">{mapping.dacChannel}</span>}
                        {mapping?.touchChannel && <span className="text-[8px] text-sky-400/80">{mapping.touchChannel}</span>}
                        <span className="font-bold">{pinKey}</span>
                        <div
                          className={`w-2.5 h-2.5 rounded-xs border transition-all ${
                            isHigh
                              ? 'bg-emerald-400 border-emerald-300 shadow-[0_0_6px_#34d399]'
                              : isGpio
                              ? 'bg-slate-800 border-slate-600'
                              : pinKey === 'VIN'
                              ? 'bg-red-500 border-red-400'
                              : 'bg-slate-700 border-slate-500'
                          }`}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Selected Pin Inspector & Interactive Controls */}
            <div className="lg:col-span-5 bg-[#10131B] border border-slate-800 rounded-lg p-4 flex flex-col space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-cyan-400" />
                  <span className="font-mono font-bold text-sm text-cyan-300">
                    GPIO{selectedPin} Részletes Diagnosztika
                  </span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 bg-slate-800 rounded text-slate-300">
                  {ESP32_PIN_MAPPINGS[selectedPin]?.type || 'I/O'}
                </span>
              </div>

              {/* Pin Capabilities */}
              {ESP32_PIN_MAPPINGS[selectedPin] && (
                <div className="bg-[#141722] border border-slate-800 rounded p-3 space-y-2">
                  <div className="text-[11px] text-slate-300 font-semibold">
                    {ESP32_PIN_MAPPINGS[selectedPin].description}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {ESP32_PIN_MAPPINGS[selectedPin].touchChannel && (
                      <span className="px-2 py-0.5 bg-sky-950 border border-sky-700 text-sky-300 rounded font-mono text-[9px]">
                        Touch: {ESP32_PIN_MAPPINGS[selectedPin].touchChannel}
                      </span>
                    )}
                    {ESP32_PIN_MAPPINGS[selectedPin].adcChannel && (
                      <span className="px-2 py-0.5 bg-amber-950 border border-amber-700 text-amber-300 rounded font-mono text-[9px]">
                        ADC: {ESP32_PIN_MAPPINGS[selectedPin].adcChannel} (12-bit)
                      </span>
                    )}
                    {ESP32_PIN_MAPPINGS[selectedPin].dacChannel && (
                      <span className="px-2 py-0.5 bg-purple-950 border border-purple-700 text-purple-300 rounded font-mono text-[9px]">
                        DAC: {ESP32_PIN_MAPPINGS[selectedPin].dacChannel} (8-bit Valós)
                      </span>
                    )}
                    {ESP32_PIN_MAPPINGS[selectedPin].pwmChannel && (
                      <span className="px-2 py-0.5 bg-emerald-950 border border-emerald-700 text-emerald-300 rounded font-mono text-[9px]">
                        LEDC PWM: {ESP32_PIN_MAPPINGS[selectedPin].pwmChannel}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Interactive Output / Input Controls */}
              {esp32.pinStates32[selectedPin] && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between bg-[#141722] p-2.5 rounded border border-slate-800">
                    <span className="font-mono text-slate-400">Digitális Állapot:</span>
                    <button
                      onClick={() => {
                        const cur = esp32.pinStates32[selectedPin].value;
                        if (onUpdateEsp32State) {
                          onUpdateEsp32State((prev) => ({
                            ...prev,
                            pinStates32: {
                              ...prev.pinStates32,
                              [selectedPin]: {
                                ...prev.pinStates32[selectedPin],
                                value: cur === 1 ? 0 : 1,
                              },
                            },
                          }));
                        }
                      }}
                      className={`px-3 py-1 rounded font-mono font-bold text-xs cursor-pointer transition-all ${
                        esp32.pinStates32[selectedPin].value === 1
                          ? 'bg-emerald-500 text-black shadow-[0_0_10px_#10b981]'
                          : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                      }`}
                    >
                      {esp32.pinStates32[selectedPin].value === 1 ? 'HIGH (3.3V)' : 'LOW (0.0V)'}
                    </button>
                  </div>

                  {/* Capacitive Touch Tester */}
                  {ESP32_PIN_MAPPINGS[selectedPin]?.touchChannel && (
                    <div className="bg-[#141722] p-2.5 rounded border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-slate-300">Kapacitív Érintés Tesztelő:</span>
                        <span className="font-mono font-bold text-sky-400">
                          {esp32.touch[selectedPin] ?? 85} LSB
                        </span>
                      </div>
                      <button
                        onClick={() => handleTouchPadToggle(selectedPin)}
                        className={`w-full py-1.5 rounded font-mono font-semibold text-xs transition-all cursor-pointer ${
                          (esp32.touch[selectedPin] ?? 85) < 40
                            ? 'bg-sky-400 text-black shadow-[0_0_12px_#38bdf8]'
                            : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        {(esp32.touch[selectedPin] ?? 85) < 40
                          ? '✋ Ujj Érintve (Érték < 40) - Kattints az elengedéshez'
                          : '👆 Kattints az ujj érintésének szimulálásához'}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: FREERTOS DUAL CORE & TASKS */}
        {activeTab === 'freertos' && (
          <div id="esp32-freertos-view" className="space-y-4">
            {/* Dual Core Load Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Core 0 (PRO CPU) */}
              <div className="bg-[#10131B] border border-cyan-900/40 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-cyan-400" />
                    <span className="font-mono font-bold text-sm text-cyan-300">Core 0 (PRO CPU)</span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">Protokoll & Rendszer</span>
                </div>
                <div className="space-y-2 font-mono text-[11px]">
                  <div className="flex justify-between text-slate-300">
                    <span>CPU Terheltség:</span>
                    <span className="font-bold text-cyan-400">{esp32.core0.cpuLoadPercent}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-cyan-400 transition-all duration-300"
                      style={{ width: `${esp32.core0.cpuLoadPercent}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-slate-400 text-[10px]">
                    <span>Aktív Taszk:</span>
                    <span className="text-slate-200">{esp32.core0.activeTask}</span>
                  </div>
                  <div className="flex justify-between text-slate-400 text-[10px]">
                    <span>Program Counter (PC):</span>
                    <span className="text-slate-200">0x{esp32.core0.pc.toString(16).toUpperCase()}</span>
                  </div>
                </div>
              </div>

              {/* Core 1 (APP CPU) */}
              <div className="bg-[#10131B] border border-emerald-900/40 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-emerald-400" />
                    <span className="font-mono font-bold text-sm text-emerald-300">Core 1 (APP CPU)</span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">Felhasználói Loop & Taszkok</span>
                </div>
                <div className="space-y-2 font-mono text-[11px]">
                  <div className="flex justify-between text-slate-300">
                    <span>CPU Terheltség:</span>
                    <span className="font-bold text-emerald-400">{esp32.core1.cpuLoadPercent}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-400 transition-all duration-300"
                      style={{ width: `${esp32.core1.cpuLoadPercent}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-slate-400 text-[10px]">
                    <span>Aktív Taszk:</span>
                    <span className="text-slate-200">{esp32.core1.activeTask}</span>
                  </div>
                  <div className="flex justify-between text-slate-400 text-[10px]">
                    <span>Ciklusszámláló:</span>
                    <span className="text-slate-200">{esp32.core1.cycles.toLocaleString()} ciklus</span>
                  </div>
                </div>
              </div>
            </div>

            {/* FreeRTOS Tasks Table */}
            <div className="bg-[#10131B] border border-slate-800 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-sky-400" />
                  <span className="font-mono font-bold text-sm text-slate-200">
                    FreeRTOS Taszk Ütemező (SMP Scheduler)
                  </span>
                </div>
                <span className="text-[10px] font-mono text-slate-400">
                  Tick számláló: {esp32.freeRtos.tickCount} ms
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left font-mono text-[11px]">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 text-[10px] uppercase">
                      <th className="pb-2">Taszk Neve</th>
                      <th className="pb-2">Célmag</th>
                      <th className="pb-2">Prioritás</th>
                      <th className="pb-2">Verem (Stack)</th>
                      <th className="pb-2">Állapot</th>
                      <th className="pb-2">CPU Terhelés</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {esp32.freeRtos.tasks.map((task) => (
                      <tr key={task.id} className="hover:bg-slate-800/30">
                        <td className="py-2 font-bold text-cyan-300">{task.name}</td>
                        <td className="py-2">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[9px] ${
                              task.coreId === 0
                                ? 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                                : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                            }`}
                          >
                            Core {task.coreId}
                          </span>
                        </td>
                        <td className="py-2 text-slate-300">{task.priority}</td>
                        <td className="py-2 text-slate-400">{task.stackSize} B</td>
                        <td className="py-2">
                          <span className="px-1.5 py-0.5 rounded text-[9px] bg-emerald-900/60 text-emerald-300">
                            {task.state}
                          </span>
                        </td>
                        <td className="py-2 text-sky-400 font-bold">{task.cpuPercentage}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: WI-FI & VIRTUAL WEB SERVER */}
        {activeTab === 'wifi' && (
          <div id="esp32-wifi-view" className="space-y-4">
            {/* Wi-Fi Status Bar */}
            <div className="bg-[#10131B] border border-emerald-900/40 rounded-lg p-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-950/60 border border-emerald-700 flex items-center justify-center text-emerald-400">
                  <Wifi className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-sm text-emerald-300">{esp32.wifi.ssid}</span>
                    <span className="px-2 py-0.5 bg-emerald-950 border border-emerald-700 text-emerald-300 rounded font-mono text-[9px]">
                      {esp32.wifi.status}
                    </span>
                  </div>
                  <div className="font-mono text-[10px] text-slate-400 mt-0.5">
                    IP Cím: <span className="text-slate-200 font-bold">{esp32.wifi.ipAddress}</span> | MAC: {esp32.wifi.macAddress}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 font-mono text-[10px]">
                <div className="bg-[#141722] px-3 py-1.5 rounded border border-slate-800">
                  <span className="text-slate-400">Jelerősség (RSSI):</span>{' '}
                  <span className="text-emerald-400 font-bold">{esp32.wifi.rssi} dBm</span>
                </div>
                <div className="bg-[#141722] px-3 py-1.5 rounded border border-slate-800">
                  <span className="text-slate-400">WebSzerver Port:</span>{' '}
                  <span className="text-cyan-400 font-bold">{esp32.wifi.webServer.port}</span>
                </div>
              </div>
            </div>

            {/* Virtual Web Browser / HTTP Client Simulator */}
            <div className="bg-[#10131B] border border-slate-800 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-cyan-400" />
                  <span className="font-mono font-bold text-sm text-slate-200">
                    Beépített WebSzerver & REST API Kliens
                  </span>
                </div>
                <span className="text-[10px] font-mono text-slate-400">http://192.168.1.105</span>
              </div>

              {/* URL Bar & Send Button */}
              <div className="flex items-center gap-2">
                <select
                  value={httpMethod}
                  onChange={(e) => setHttpMethod(e.target.value as any)}
                  className="bg-[#141722] border border-slate-700 rounded px-2.5 py-1.5 font-mono text-xs text-cyan-300 font-bold outline-hidden cursor-pointer"
                >
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                </select>

                <input
                  type="text"
                  value={httpPath}
                  onChange={(e) => setHttpPath(e.target.value)}
                  placeholder="/api/status vagy /led/toggle"
                  className="flex-1 bg-[#141722] border border-slate-700 rounded px-3 py-1.5 font-mono text-xs text-slate-200 outline-hidden focus:border-cyan-500"
                />

                <button
                  onClick={handleSendHttpRequest}
                  className="flex items-center gap-1.5 px-4 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-black font-mono font-bold text-xs rounded transition-all active:scale-95 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Kérés Küldése</span>
                </button>
              </div>

              {/* Quick Route Shortcut Chips */}
              <div className="flex flex-wrap gap-1.5 items-center">
                <span className="text-[10px] text-slate-400 font-mono">Gyors útvonalak:</span>
                <button
                  onClick={() => {
                    setHttpPath('/');
                    setHttpMethod('GET');
                  }}
                  className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded font-mono text-[10px] cursor-pointer"
                >
                  GET / (Főoldal)
                </button>
                <button
                  onClick={() => {
                    setHttpPath('/api/status');
                    setHttpMethod('GET');
                  }}
                  className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded font-mono text-[10px] cursor-pointer"
                >
                  GET /api/status
                </button>
                <button
                  onClick={() => {
                    setHttpPath('/led/toggle');
                    setHttpMethod('POST');
                  }}
                  className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded font-mono text-[10px] cursor-pointer"
                >
                  POST /led/toggle (D2 LED Kapcsolás)
                </button>
              </div>

              {/* HTTP Response Display */}
              <div className="space-y-1">
                <span className="font-mono text-[10px] text-slate-400">Szerver Válasza (HTTP 200 OK):</span>
                <pre className="w-full bg-[#08090D] border border-slate-800 rounded p-3 font-mono text-[11px] text-emerald-400 overflow-x-auto max-h-48">
                  {httpResponse}
                </pre>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: TOUCH & REAL ANALOG DAC SCOPE */}
        {activeTab === 'touch_dac' && (
          <div id="esp32-touch-dac-view" className="space-y-4">
            {/* Real 8-Bit DAC Oscilloscope (GPIO25 & GPIO26) */}
            <div className="bg-[#10131B] border border-slate-800 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-purple-400" />
                  <span className="font-mono font-bold text-sm text-purple-300">
                    Valós 8-bites Hardveres DAC Oszcilloszkóp (GPIO25 / GPIO26)
                  </span>
                </div>
                <div className="flex items-center gap-3 font-mono text-[10px]">
                  <span className="text-purple-400">DAC1 (GPIO25): {esp32.dac.dac1Voltage} V ({esp32.dac.dac1} LSB)</span>
                  <span className="text-pink-400">DAC2 (GPIO26): {esp32.dac.dac2Voltage} V ({esp32.dac.dac2} LSB)</span>
                </div>
              </div>

              {/* Oscilloscope Waveform Canvas Graphic */}
              <div className="h-32 bg-[#090A10] border border-purple-900/40 rounded relative overflow-hidden flex items-center justify-center p-2">
                <svg className="w-full h-full" viewBox="0 0 400 100" preserveAspectRatio="none">
                  {/* Grid Lines */}
                  <line x1="0" y1="25" x2="400" y2="25" stroke="#332244" strokeDasharray="3,3" strokeWidth="0.5" />
                  <line x1="0" y1="50" x2="400" y2="50" stroke="#332244" strokeDasharray="3,3" strokeWidth="0.5" />
                  <line x1="0" y1="75" x2="400" y2="75" stroke="#332244" strokeDasharray="3,3" strokeWidth="0.5" />

                  {/* DAC1 Waveform (Purple) */}
                  <polyline
                    fill="none"
                    stroke="#c084fc"
                    strokeWidth="2.5"
                    points={esp32.dac.dac1Waveform
                      .map((val, idx) => {
                        const x = (idx / Math.max(1, esp32.dac.dac1Waveform.length - 1)) * 400;
                        const y = 90 - (val / 255) * 80;
                        return `${x},${y}`;
                      })
                      .join(' ')}
                  />
                </svg>

                <div className="absolute top-2 left-2 text-[9px] font-mono text-purple-400 bg-purple-950/80 px-2 py-0.5 rounded">
                  Valós analóg feszültség: 0.0V - 3.3V tartomány (Nem PWM!)
                </div>
              </div>

              {/* Interactive DAC Slider Controls */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="space-y-1">
                  <div className="flex justify-between font-mono text-[10px]">
                    <span className="text-slate-300">DAC 1 (GPIO25) Analóg Érték:</span>
                    <span className="text-purple-300 font-bold">{esp32.dac.dac1} ({(esp32.dac.dac1 / 255 * 3.3).toFixed(2)} V)</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="255"
                    value={esp32.dac.dac1}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      if (onUpdateEsp32State) {
                        onUpdateEsp32State((prev) => ({
                          ...prev,
                          dac: {
                            ...prev.dac,
                            dac1: val,
                            dac1Voltage: parseFloat(((val / 255) * 3.3).toFixed(2)),
                            dac1Waveform: [...prev.dac.dac1Waveform.slice(-25), val],
                          },
                        }));
                      }
                    }}
                    className="w-full accent-purple-400 cursor-pointer"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between font-mono text-[10px]">
                    <span className="text-slate-300">DAC 2 (GPIO26) Analóg Érték:</span>
                    <span className="text-pink-300 font-bold">{esp32.dac.dac2} ({(esp32.dac.dac2 / 255 * 3.3).toFixed(2)} V)</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="255"
                    value={esp32.dac.dac2}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      if (onUpdateEsp32State) {
                        onUpdateEsp32State((prev) => ({
                          ...prev,
                          dac: {
                            ...prev.dac,
                            dac2: val,
                            dac2Voltage: parseFloat(((val / 255) * 3.3).toFixed(2)),
                            dac2Waveform: [...prev.dac.dac2Waveform.slice(-25), val],
                          },
                        }));
                      }
                    }}
                    className="w-full accent-pink-400 cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* Capacitive Touch Matrix */}
            <div className="bg-[#10131B] border border-slate-800 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-sky-400" />
                  <span className="font-mono font-bold text-sm text-slate-200">
                    Kapacitív Érintőszenzorok (Touch0 - Touch9)
                  </span>
                </div>
                <span className="text-[10px] font-mono text-slate-400">Küszöb: &lt; 40 LSB</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {Object.entries(esp32.touch).map(([pinStr, val]: [string, number]) => {
                  const isTouched = (val as number) < 40;
                  return (
                    <div
                      key={`touch-card-${pinStr}`}
                      onClick={() => handleTouchPadToggle(pinStr)}
                      className={`p-3 rounded-lg border flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-all ${
                        isTouched
                          ? 'bg-sky-950/80 border-sky-500 shadow-[0_0_12px_rgba(56,189,248,0.4)]'
                          : 'bg-[#141722] border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="font-mono font-bold text-xs text-slate-300">GPIO{pinStr}</div>
                      <div className={`font-mono text-base font-bold ${isTouched ? 'text-sky-300' : 'text-slate-400'}`}>
                        {val} LSB
                      </div>
                      <div className="text-[9px] font-mono text-slate-400">
                        {isTouched ? '✋ Érintve' : '○ Nyugalomban'}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: NVS FLASH KEY-VALUE STORAGE */}
        {activeTab === 'nvs' && (
          <div id="esp32-nvs-view" className="space-y-4">
            <div className="bg-[#10131B] border border-slate-800 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <HardDrive className="w-4 h-4 text-purple-400" />
                  <span className="font-mono font-bold text-sm text-slate-200">
                    ESP32 NVS (Non-Volatile Storage) Kulcs-Érték Tárhely
                  </span>
                </div>
                <span className="text-[10px] font-mono text-slate-400">Flash Partíció: 0x9000</span>
              </div>

              {/* Add New NVS Entry Form */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 bg-[#141722] p-3 rounded border border-slate-800 items-center">
                <input
                  type="text"
                  placeholder="Névtér (pl. config)"
                  value={newNvsNs}
                  onChange={(e) => setNewNvsNs(e.target.value)}
                  className="bg-[#0D0F16] border border-slate-700 rounded px-2.5 py-1.5 font-mono text-xs text-slate-200 outline-hidden"
                />
                <input
                  type="text"
                  placeholder="Kulcs (pl. device_name)"
                  value={newNvsKey}
                  onChange={(e) => setNewNvsKey(e.target.value)}
                  className="bg-[#0D0F16] border border-slate-700 rounded px-2.5 py-1.5 font-mono text-xs text-slate-200 outline-hidden"
                />
                <input
                  type="text"
                  placeholder="Érték (pl. Sensor_01)"
                  value={newNvsVal}
                  onChange={(e) => setNewNvsVal(e.target.value)}
                  className="bg-[#0D0F16] border border-slate-700 rounded px-2.5 py-1.5 font-mono text-xs text-slate-200 outline-hidden"
                />
                <button
                  onClick={handleAddNvs}
                  className="flex items-center justify-center gap-1.5 bg-purple-500 hover:bg-purple-400 text-black font-mono font-bold text-xs py-1.5 rounded cursor-pointer transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Kulcs Mentése</span>
                </button>
              </div>

              {/* NVS Entries Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left font-mono text-[11px]">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 text-[10px] uppercase">
                      <th className="pb-2">Névtér</th>
                      <th className="pb-2">Kulcs</th>
                      <th className="pb-2">Típus</th>
                      <th className="pb-2">Érték</th>
                      <th className="pb-2 text-right">Művelet</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {Object.entries(esp32.nvs).map(([key, entry]: [string, any]) => (
                      <tr key={key} className="hover:bg-slate-800/30">
                        <td className="py-2 text-purple-300 font-bold">{entry.namespace}</td>
                        <td className="py-2 text-slate-200">{entry.key}</td>
                        <td className="py-2 text-slate-400 text-[10px]">{entry.type}</td>
                        <td className="py-2 text-emerald-300 font-bold">{String(entry.value)}</td>
                        <td className="py-2 text-right">
                          <button
                            onClick={() => {
                              if (onUpdateEsp32State) {
                                onUpdateEsp32State((prev) => {
                                  const copy = { ...prev.nvs };
                                  delete copy[key];
                                  return { ...prev, nvs: copy };
                                });
                              }
                            }}
                            className="text-red-400 hover:text-red-300 p-1 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: DEEP SLEEP & POWER CONSUMPTION */}
        {activeTab === 'sleep' && (
          <div id="esp32-sleep-view" className="space-y-4">
            <div className="bg-[#10131B] border border-indigo-900/40 rounded-lg p-4 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <Moon className="w-4 h-4 text-indigo-400" />
                  <span className="font-mono font-bold text-sm text-indigo-300">
                    ESP32 Energiagazdálkodás & Mélyalvás (Deep Sleep)
                  </span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 bg-indigo-950 border border-indigo-800 text-indigo-300 rounded">
                  {esp32.deepSleep.isSleeping ? 'ÁLLAPOT: MÉLYALVÁS (5 µA)' : 'ÁLLAPOT: AKTÍV (240 MHz)'}
                </span>
              </div>

              {/* Power Modes Comparison */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 font-mono text-[11px]">
                <div className="bg-[#141722] p-3 rounded border border-slate-800 flex flex-col justify-between">
                  <div className="text-slate-400 text-[10px]">Aktív Mód (Dual 240 MHz)</div>
                  <div className="text-amber-400 font-bold text-base mt-1">160 - 240 mA</div>
                  <div className="text-[9px] text-slate-500 mt-1">Minden periféria & Wi-Fi bekapcsolva</div>
                </div>

                <div className="bg-[#141722] p-3 rounded border border-slate-800 flex flex-col justify-between">
                  <div className="text-slate-400 text-[10px]">Modem Sleep</div>
                  <div className="text-sky-400 font-bold text-base mt-1">20 - 30 mA</div>
                  <div className="text-[9px] text-slate-500 mt-1">CPU aktív, rádió DTIM alvásban</div>
                </div>

                <div className="bg-[#141722] p-3 rounded border border-slate-800 flex flex-col justify-between">
                  <div className="text-slate-400 text-[10px]">Light Sleep</div>
                  <div className="text-emerald-400 font-bold text-base mt-1">0.8 mA</div>
                  <div className="text-[9px] text-slate-500 mt-1">CPU órajel leállítva, RAM megőrizve</div>
                </div>

                <div className="bg-indigo-950/60 p-3 rounded border border-indigo-700 flex flex-col justify-between">
                  <div className="text-indigo-300 text-[10px]">Deep Sleep (Mélyalvás)</div>
                  <div className="text-indigo-200 font-bold text-base mt-1">5 µA</div>
                  <div className="text-[9px] text-indigo-400 mt-1">Csak az RTC és ULP koprocesszor él</div>
                </div>
              </div>

              {/* Wakeup Controls */}
              <div className="flex flex-wrap gap-2 pt-2">
                <button
                  onClick={() => {
                    if (onUpdateEsp32State) {
                      onUpdateEsp32State((prev) => ({
                        ...prev,
                        deepSleep: {
                          isSleeping: true,
                          wakeupCause: 'TIMER',
                          wakeupTimeUs: 10_000_000,
                          sleepCount: prev.deepSleep.sleepCount + 1,
                        },
                      }));
                    }
                  }}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-mono font-bold text-xs rounded transition-all cursor-pointer"
                >
                  💤 Belépés Mélyalvásba (10 mp Időzítő)
                </button>

                <button
                  onClick={() => {
                    if (onUpdateEsp32State) {
                      onUpdateEsp32State((prev) => ({
                        ...prev,
                        deepSleep: {
                          isSleeping: false,
                          wakeupCause: 'NONE',
                          wakeupTimeUs: 0,
                          sleepCount: prev.deepSleep.sleepCount,
                        },
                      }));
                    }
                  }}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono font-bold text-xs rounded transition-all cursor-pointer"
                >
                  ⚡ Ébresztés Szimulálása
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
