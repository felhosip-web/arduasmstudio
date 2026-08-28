import React, { useState, useMemo } from 'react';
import {
  Wifi,
  Bluetooth,
  Radio,
  Server,
  Code2,
  Copy,
  Check,
  Download,
  RefreshCw,
  Zap,
  Globe,
  Sliders,
  Layers,
  ShieldCheck,
  Activity,
  Cpu,
  Plus,
  Trash2,
  Smartphone,
  Eye,
  EyeOff,
  Signal,
  Laptop,
  CheckCircle2,
  AlertTriangle,
  X,
} from 'lucide-react';
import {
  Esp32WifiState,
  Esp32BleState,
  Esp32BleMode,
  Esp32BleAdvType,
  Esp32BleTxPower,
  Esp32BleCharacteristic,
} from '../types';
import {
  generateArduinoConnectivityC,
  generateEspIdfConnectivityC,
  formatIpAddressToBytes,
} from '../utils/esp32ConnectivityCodeGenerator';

interface Esp32ConnectivityModalProps {
  isOpen: boolean;
  onClose: () => void;
  wifiState: Esp32WifiState;
  bleState?: Esp32BleState;
  onUpdateWifi: (updater: (prev: Esp32WifiState) => Esp32WifiState) => void;
  onUpdateBle: (updater: (prev: Esp32BleState) => Esp32BleState) => void;
}

type TabType = 'wifi' | 'ble' | 'code';

interface SimulatedNearbyAp {
  ssid: string;
  bssid: string;
  rssi: number;
  channel: number;
  security: string;
}

const NEARBY_APS_MOCK: SimulatedNearbyAp[] = [
  { ssid: 'IoT_Studio_WiFi', bssid: '24:6F:28:B4:7E:1A', rssi: -54, channel: 1, security: 'WPA2-PSK' },
  { ssid: 'Home_Fiber_5G', bssid: 'A4:2B:B0:11:88:99', rssi: -42, channel: 6, security: 'WPA3-SAE' },
  { ssid: 'SmartOffice_Lab', bssid: '58:BF:25:DD:EE:01', rssi: -68, channel: 11, security: 'WPA2-Enterprise' },
  { ssid: 'Guest_Access_Open', bssid: '12:34:56:78:90:AB', rssi: -79, channel: 3, security: 'OPEN' },
  { ssid: 'ESP32_Mesh_Node_04', bssid: '7C:DF:A1:33:44:55', rssi: -61, channel: 1, security: 'WPA2-PSK' },
];

export const Esp32ConnectivityModal: React.FC<Esp32ConnectivityModalProps> = ({
  isOpen,
  onClose,
  wifiState,
  bleState,
  onUpdateWifi,
  onUpdateBle,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('wifi');
  const [codeFramework, setCodeFramework] = useState<'arduino' | 'espidf'>('arduino');
  const [copied, setCopied] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showApPassword, setShowApPassword] = useState(false);
  const [isScanningWifi, setIsScanningWifi] = useState(false);
  const [simulatedAps, setSimulatedAps] = useState<SimulatedNearbyAp[]>(NEARBY_APS_MOCK);
  const [newCharName, setNewCharName] = useState('');
  const [newCharUuid, setNewCharUuid] = useState('');
  const [newCharVal, setNewCharVal] = useState('0');

  // Fallback safe BLE State
  const currentBle: Esp32BleState = useMemo(() => {
    return (
      bleState || {
        enabled: true,
        deviceName: 'ESP32_IoT_Sensors',
        mode: 'GATT_SERVER',
        advType: 'ADV_TYPE_IND',
        advIntervalMinMs: 100,
        advIntervalMaxMs: 200,
        txPower: 'ESP_PWR_LVL_P3',
        appearance: '0x0540',
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
                description: 'Kalibrált Hőmérséklet telemetria',
              },
              {
                id: 'char_cmd',
                name: 'Vezérlő Parancs',
                uuid: 'beb5483e-36e1-4688-b7f5-ea07361b26a9',
                value: '0x01',
                permissions: ['READ', 'WRITE'],
                description: 'Kétirányú parancsfogadás',
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
        lastTransmittedPacketHex: '02010611074B9131C3C9C5F5B78846E1363E48B5BE0E0945535033325F496F54',
        txPacketsCount: 1250,
        simulatedLogs: [],
      }
    );
  }, [bleState]);

  if (!isOpen) return null;

  // Validate IPv4
  const isValidIpv4 = (ip?: string) => {
    if (!ip) return false;
    const parts = ip.trim().split('.');
    return parts.length === 4 && parts.every((p) => {
      const n = Number(p);
      return !isNaN(n) && n >= 0 && n <= 255 && p.trim() === String(n);
    });
  };

  const isIpValid = isValidIpv4(wifiState.ipAddress);
  const isGwValid = isValidIpv4(wifiState.gateway);
  const isSubValid = isValidIpv4(wifiState.subnet);

  // Generate C code
  const generatedCode =
    codeFramework === 'arduino'
      ? generateArduinoConnectivityC(wifiState, currentBle)
      : generateEspIdfConnectivityC(wifiState, currentBle);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(generatedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadCode = () => {
    const ext = codeFramework === 'arduino' ? 'ino' : 'c';
    const blob = new Blob([generatedCode], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `esp32_connectivity_setup.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleScanWifi = () => {
    setIsScanningWifi(true);
    setTimeout(() => {
      // Perturb RSSI values slightly to simulate dynamic RF
      const updated = NEARBY_APS_MOCK.map((ap) => ({
        ...ap,
        rssi: Math.min(-30, Math.max(-92, ap.rssi + Math.floor(Math.random() * 9) - 4)),
      }));
      setSimulatedAps(updated);
      setIsScanningWifi(false);
    }, 600);
  };

  const handleAddCharacteristic = () => {
    if (!newCharName.trim()) return;
    const uuid = newCharUuid.trim() || `0000${Math.floor(Math.random() * 0xffff).toString(16).padStart(4, '0')}-0000-1000-8000-00805f9b34fb`;
    const newChar: Esp32BleCharacteristic = {
      id: `char_${Date.now()}`,
      name: newCharName.trim(),
      uuid,
      value: newCharVal || '0',
      permissions: ['READ', 'NOTIFY'],
    };

    onUpdateBle((prev) => {
      const services = [...(prev.services || [])];
      if (services.length === 0) {
        services.push({
          id: 'srv_custom',
          name: 'Egyéni Szolgáltatás',
          uuid: '4fafc201-1fb5-459e-8fcc-c5c9c331914b',
          isPrimary: true,
          characteristics: [newChar],
        });
      } else {
        services[0] = {
          ...services[0],
          characteristics: [...services[0].characteristics, newChar],
        };
      }
      return { ...prev, services };
    });

    setNewCharName('');
    setNewCharUuid('');
    setNewCharVal('0');
  };

  const handleDeleteCharacteristic = (charId: string) => {
    onUpdateBle((prev) => {
      const services = (prev.services || []).map((srv) => ({
        ...srv,
        characteristics: srv.characteristics.filter((c) => c.id !== charId),
      }));
      return { ...prev, services };
    });
  };

  const handleToggleNotify = (char: Esp32BleCharacteristic) => {
    const updatedVal = (parseFloat(char.value || '0') + (Math.random() * 0.4 - 0.2)).toFixed(1);
    onUpdateBle((prev) => {
      const services = (prev.services || []).map((srv) => ({
        ...srv,
        characteristics: srv.characteristics.map((c) => (c.id === char.id ? { ...c, value: updatedVal } : c)),
      }));
      const newLog = {
        id: `ble_notif_${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        type: 'NOTIFY' as const,
        details: `Értesítés küldve (NOTIFY) [${char.name}]: ${updatedVal} (UUID: ${char.uuid.slice(0, 8)}...)`,
      };
      return {
        ...prev,
        services,
        txPacketsCount: (prev.txPacketsCount || 0) + 1,
        simulatedLogs: [newLog, ...(prev.simulatedLogs || []).slice(0, 19)],
      };
    });
  };

  const handleToggleVirtualClient = () => {
    onUpdateBle((prev) => {
      const newCount = prev.connectedClientsCount > 0 ? 0 : 1;
      const isConnecting = newCount > 0;
      const newLog = {
        id: `ble_cli_${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        type: isConnecting ? ('CONNECT' as const) : ('DISCONNECT' as const),
        details:
          isConnecting
            ? 'Virtuális Kliens Csatlakozott (Pixel / iPhone BLE Scanner [RSSI: -52 dBm, MTU: 512])'
            : 'Kliens Lebontva -> Hirdetés újraindítása...',
      };
      return {
        ...prev,
        connectedClientsCount: newCount,
        simulatedLogs: [newLog, ...(prev.simulatedLogs || []).slice(0, 19)],
      };
    });
  };

  // Helper for Signal Strength Icon
  const getSignalStrengthColor = (rssi: number) => {
    if (rssi >= -55) return 'text-emerald-400';
    if (rssi >= -70) return 'text-cyan-400';
    if (rssi >= -82) return 'text-amber-400';
    return 'text-rose-400';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="relative w-full max-w-6xl h-[92vh] flex flex-col bg-[#111318] border border-[#232734] rounded-2xl shadow-2xl overflow-hidden text-[#E0E0E6]">
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#232734] bg-[#161922]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border border-emerald-500/30 text-emerald-400">
              <Radio className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-lg font-bold tracking-wide text-white">
                  ESP32 Hálózati & Vezeték Nélküli Kapcsolatkezelő
                </h2>
                <span className="px-2 py-0.5 text-xs font-mono font-semibold rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  WiFi STA / AP & BLE 5.0
                </span>
              </div>
              <p className="text-xs text-[#8A8F9E] mt-0.5">
                Statikus IP konfiguráció, SoftAP hotspot, BLE Advertising & GATT Szerver telemetria beállítása
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Quick Status Chips */}
            <div className="hidden md:flex items-center gap-2 bg-[#1A1D27] px-3 py-1.5 rounded-lg border border-[#2B3042] text-xs font-mono">
              <span className="text-[#8A8F9E]">WiFi:</span>
              <span
                className={`font-semibold ${
                  wifiState.mode !== 'OFF' ? 'text-emerald-400' : 'text-zinc-500'
                }`}
              >
                {wifiState.mode} {wifiState.mode !== 'OFF' ? `(${wifiState.ipAddress})` : ''}
              </span>
              <span className="text-[#3B4254]">|</span>
              <span className="text-[#8A8F9E]">BLE:</span>
              <span
                className={`font-semibold ${
                  currentBle.enabled ? 'text-cyan-400' : 'text-zinc-500'
                }`}
              >
                {currentBle.enabled ? currentBle.deviceName : 'Kikapcsolva'}
              </span>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-[#1A1D27] hover:bg-[#252A38] text-[#8A8F9E] hover:text-white border border-[#2B3042] transition-colors"
              title="Bezárás"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center justify-between px-6 border-b border-[#232734] bg-[#14161F]">
          <div className="flex space-x-2 py-2">
            <button
              onClick={() => setActiveTab('wifi')}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
                activeTab === 'wifi'
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm'
                  : 'text-[#8A8F9E] hover:text-white hover:bg-[#1A1D27]'
              }`}
            >
              <Wifi className="w-4 h-4" />
              <span>WiFi & Statikus IP (STA / SoftAP)</span>
              {wifiState.mode !== 'OFF' && (
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              )}
            </button>

            <button
              onClick={() => setActiveTab('ble')}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
                activeTab === 'ble'
                  ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 shadow-sm'
                  : 'text-[#8A8F9E] hover:text-white hover:bg-[#1A1D27]'
              }`}
            >
              <Bluetooth className="w-4 h-4" />
              <span>BLE Advertising & GATT Szolgáltatások</span>
              {currentBle.enabled && (
                <span className="px-1.5 py-0.2 text-[10px] font-mono rounded bg-cyan-500/20 text-cyan-300">
                  {currentBle.mode}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('code')}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
                activeTab === 'code'
                  ? 'bg-purple-500/15 text-purple-400 border border-purple-500/30 shadow-sm'
                  : 'text-[#8A8F9E] hover:text-white hover:bg-[#1A1D27]'
              }`}
            >
              <Code2 className="w-4 h-4" />
              <span>Generált C Forráskód (Setup Logic)</span>
            </button>
          </div>

          <div className="text-xs text-[#8A8F9E] font-mono hidden sm:block">
            Target: <span className="text-zinc-300">Xtensa PRO CPU (Core 0)</span>
          </div>
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-[#0E1015]">
          {/* TAB 1: WiFi & Static IP */}
          {activeTab === 'wifi' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: WiFi Configuration */}
              <div className="lg:col-span-7 space-y-6">
                {/* 1. Mode Selector */}
                <div className="bg-[#161922] border border-[#232734] rounded-xl p-4">
                  <label className="text-xs font-bold uppercase tracking-wider text-[#8A8F9E] mb-3 block">
                    WiFi Működési Üzemmód (esp_wifi_mode_t)
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { id: 'STA', name: 'STA (Station)', desc: 'Kliens routerhez' },
                      { id: 'AP', name: 'AP (SoftAP)', desc: 'Önálló Hotspot' },
                      { id: 'AP_STA', name: 'AP + STA', desc: 'Kettős hibrid' },
                      { id: 'OFF', name: 'Kikapcsolva', desc: 'Rádió kikapcs' },
                    ].map((mode) => (
                      <button
                        key={mode.id}
                        onClick={() =>
                          onUpdateWifi((prev) => ({
                            ...prev,
                            mode: mode.id as any,
                            status: mode.id === 'OFF' ? 'DISCONNECTED' : 'CONNECTED',
                          }))
                        }
                        className={`p-3 rounded-lg border text-left transition-all ${
                          wifiState.mode === mode.id
                            ? 'bg-emerald-500/15 border-emerald-500/50 text-white shadow-sm'
                            : 'bg-[#1A1D27] border-[#2B3042] text-[#8A8F9E] hover:text-white hover:bg-[#202533]'
                        }`}
                      >
                        <div className="font-bold text-xs flex items-center justify-between">
                          <span>{mode.name}</span>
                          {wifiState.mode === mode.id && (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          )}
                        </div>
                        <div className="text-[11px] text-[#8A8F9E] mt-0.5">{mode.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. Station (STA) Settings */}
                {(wifiState.mode === 'STA' || wifiState.mode === 'AP_STA') && (
                  <div className="bg-[#161922] border border-[#232734] rounded-xl p-5 space-y-4">
                    <div className="flex items-center justify-between pb-2 border-b border-[#232734]">
                      <div className="flex items-center gap-2">
                        <Globe className="w-4 h-4 text-emerald-400" />
                        <h3 className="text-sm font-bold text-white">Station (STA) Hálózati Kapcsolat</h3>
                      </div>
                      <span className="text-xs text-[#8A8F9E] font-mono">WPA2 / WPA3-Personal</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* SSID */}
                      <div>
                        <label className="text-xs font-medium text-[#A0A5B5] mb-1.5 block">
                          WiFi SSID (Hálózat Neve)
                        </label>
                        <input
                          type="text"
                          value={wifiState.ssid}
                          onChange={(e) =>
                            onUpdateWifi((prev) => ({ ...prev, ssid: e.target.value }))
                          }
                          placeholder="pl. Otthoni_WiFi_5G"
                          className="w-full bg-[#111318] border border-[#2B3042] focus:border-emerald-500 rounded-lg px-3 py-2 text-xs text-white font-mono outline-none transition-colors"
                        />
                      </div>

                      {/* Password */}
                      <div>
                        <label className="text-xs font-medium text-[#A0A5B5] mb-1.5 block">
                          WPA2 Jelszó
                        </label>
                        <div className="relative">
                          <input
                            type={showPassword ? 'text' : 'password'}
                            value={wifiState.password || ''}
                            onChange={(e) =>
                              onUpdateWifi((prev) => ({ ...prev, password: e.target.value }))
                            }
                            placeholder="WPA2 titkosítási kulcs"
                            className="w-full bg-[#111318] border border-[#2B3042] focus:border-emerald-500 rounded-lg pl-3 pr-9 py-2 text-xs text-white font-mono outline-none transition-colors"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-2.5 top-2 text-[#8A8F9E] hover:text-white"
                          >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      {/* Hostname */}
                      <div>
                        <label className="text-xs font-medium text-[#A0A5B5] mb-1.5 block">
                          ESP32 Hostname (mDNS)
                        </label>
                        <input
                          type="text"
                          value={wifiState.hostname || 'esp32-node-01'}
                          onChange={(e) =>
                            onUpdateWifi((prev) => ({ ...prev, hostname: e.target.value }))
                          }
                          placeholder="esp32-node-01"
                          className="w-full bg-[#111318] border border-[#2B3042] focus:border-emerald-500 rounded-lg px-3 py-2 text-xs text-white font-mono outline-none transition-colors"
                        />
                      </div>

                      {/* Auto Reconnect */}
                      <div className="flex items-center justify-between pt-5">
                        <div>
                          <span className="text-xs font-medium text-white block">Auto Reconnect</span>
                          <span className="text-[11px] text-[#8A8F9E]">Szakadáskor újracsatlakozás</span>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={wifiState.autoReconnect ?? true}
                            onChange={(e) =>
                              onUpdateWifi((prev) => ({ ...prev, autoReconnect: e.target.checked }))
                            }
                            className="sr-only peer"
                          />
                          <div className="w-9 h-5 bg-[#2B3042] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                        </label>
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. Static IP Configuration */}
                {(wifiState.mode === 'STA' || wifiState.mode === 'AP_STA') && (
                  <div className="bg-[#161922] border border-[#232734] rounded-xl p-5 space-y-4">
                    <div className="flex items-center justify-between pb-2 border-b border-[#232734]">
                      <div>
                        <h3 className="text-sm font-bold text-white flex items-center gap-2">
                          <Server className="w-4 h-4 text-cyan-400" />
                          IP Cím Kiosztás (DHCP vs Statikus IP)
                        </h3>
                        <p className="text-xs text-[#8A8F9E] mt-0.5">
                          {wifiState.useStaticIp
                            ? 'Statikus (Kézi) IP cím konfigurálása (WiFi.config / esp_netif_set_ip_info)'
                            : 'Dinamikus IP cím kérése a helyi router DHCP szerverétől'}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 bg-[#1A1D27] p-1 rounded-lg border border-[#2B3042]">
                        <button
                          onClick={() => onUpdateWifi((prev) => ({ ...prev, useStaticIp: false }))}
                          className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                            !wifiState.useStaticIp
                              ? 'bg-cyan-500 text-black font-bold shadow'
                              : 'text-[#8A8F9E] hover:text-white'
                          }`}
                        >
                          DHCP
                        </button>
                        <button
                          onClick={() => onUpdateWifi((prev) => ({ ...prev, useStaticIp: true }))}
                          className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                            wifiState.useStaticIp
                              ? 'bg-cyan-500 text-black font-bold shadow'
                              : 'text-[#8A8F9E] hover:text-white'
                          }`}
                        >
                          Statikus IP
                        </button>
                      </div>
                    </div>

                    {/* Static IP inputs */}
                    {wifiState.useStaticIp ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                        {/* Static IP */}
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <label className="text-xs font-medium text-[#A0A5B5]">
                              ESP32 Statikus IP Cím
                            </label>
                            {!isIpValid && (
                              <span className="text-[10px] text-rose-400 flex items-center gap-1 font-mono">
                                <AlertTriangle className="w-3 h-3" /> Érvénytelen IP
                              </span>
                            )}
                          </div>
                          <input
                            type="text"
                            value={wifiState.ipAddress}
                            onChange={(e) =>
                              onUpdateWifi((prev) => ({ ...prev, ipAddress: e.target.value }))
                            }
                            placeholder="192.168.1.150"
                            className={`w-full bg-[#111318] border ${
                              isIpValid ? 'border-[#2B3042] focus:border-cyan-500' : 'border-rose-500/70'
                            } rounded-lg px-3 py-2 text-xs text-white font-mono outline-none transition-colors`}
                          />
                        </div>

                        {/* Gateway */}
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <label className="text-xs font-medium text-[#A0A5B5]">
                              Alapértelmezett Átjáró (Gateway)
                            </label>
                            {!isGwValid && (
                              <span className="text-[10px] text-rose-400 font-mono">Érvénytelen</span>
                            )}
                          </div>
                          <input
                            type="text"
                            value={wifiState.gateway}
                            onChange={(e) =>
                              onUpdateWifi((prev) => ({ ...prev, gateway: e.target.value }))
                            }
                            placeholder="192.168.1.1"
                            className={`w-full bg-[#111318] border ${
                              isGwValid ? 'border-[#2B3042] focus:border-cyan-500' : 'border-rose-500/70'
                            } rounded-lg px-3 py-2 text-xs text-white font-mono outline-none transition-colors`}
                          />
                        </div>

                        {/* Subnet Mask */}
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <label className="text-xs font-medium text-[#A0A5B5]">
                              Alhálózati Maszk (Subnet Mask)
                            </label>
                            {!isSubValid && (
                              <span className="text-[10px] text-rose-400 font-mono">Érvénytelen</span>
                            )}
                          </div>
                          <input
                            type="text"
                            value={wifiState.subnet}
                            onChange={(e) =>
                              onUpdateWifi((prev) => ({ ...prev, subnet: e.target.value }))
                            }
                            placeholder="255.255.255.0"
                            className="w-full bg-[#111318] border border-[#2B3042] focus:border-cyan-500 rounded-lg px-3 py-2 text-xs text-white font-mono outline-none transition-colors"
                          />
                        </div>

                        {/* Primary DNS */}
                        <div>
                          <label className="text-xs font-medium text-[#A0A5B5] mb-1.5 block">
                            Elsődleges DNS Szerver
                          </label>
                          <input
                            type="text"
                            value={wifiState.dns || '8.8.8.8'}
                            onChange={(e) =>
                              onUpdateWifi((prev) => ({ ...prev, dns: e.target.value }))
                            }
                            placeholder="8.8.8.8"
                            className="w-full bg-[#111318] border border-[#2B3042] focus:border-cyan-500 rounded-lg px-3 py-2 text-xs text-white font-mono outline-none transition-colors"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="bg-[#111318] border border-[#232734] rounded-lg p-3 text-xs text-[#8A8F9E] flex items-center gap-3">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        <div>
                          A router automatikusan kioszt egy IP címet DHCP-n keresztül (Szimulált IP:{' '}
                          <span className="text-white font-mono font-bold">
                            {wifiState.ipAddress || '192.168.1.105'}
                          </span>
                          ).
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 4. SoftAP Hotspot Settings */}
                {(wifiState.mode === 'AP' || wifiState.mode === 'AP_STA') && (
                  <div className="bg-[#161922] border border-[#232734] rounded-xl p-5 space-y-4">
                    <div className="flex items-center justify-between pb-2 border-b border-[#232734]">
                      <div className="flex items-center gap-2">
                        <Radio className="w-4 h-4 text-amber-400" />
                        <h3 className="text-sm font-bold text-white">SoftAP (Hozzáférési Pont) Beállítások</h3>
                      </div>
                      <span className="text-xs text-[#8A8F9E] font-mono">192.168.4.1</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-medium text-[#A0A5B5] mb-1.5 block">
                          SoftAP SSID (Hotspot Név)
                        </label>
                        <input
                          type="text"
                          value={wifiState.apSsid || 'ESP32_AccessPoint'}
                          onChange={(e) =>
                            onUpdateWifi((prev) => ({ ...prev, apSsid: e.target.value }))
                          }
                          placeholder="ESP32_AccessPoint"
                          className="w-full bg-[#111318] border border-[#2B3042] focus:border-amber-500 rounded-lg px-3 py-2 text-xs text-white font-mono outline-none transition-colors"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-medium text-[#A0A5B5] mb-1.5 block">
                          SoftAP Jelszó (min 8 karakter)
                        </label>
                        <div className="relative">
                          <input
                            type={showApPassword ? 'text' : 'password'}
                            value={wifiState.apPassword || 'esp32password'}
                            onChange={(e) =>
                              onUpdateWifi((prev) => ({ ...prev, apPassword: e.target.value }))
                            }
                            placeholder="Jelszó"
                            className="w-full bg-[#111318] border border-[#2B3042] focus:border-amber-500 rounded-lg pl-3 pr-9 py-2 text-xs text-white font-mono outline-none transition-colors"
                          />
                          <button
                            type="button"
                            onClick={() => setShowApPassword(!showApPassword)}
                            className="absolute right-2.5 top-2 text-[#8A8F9E] hover:text-white"
                          >
                            {showApPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-medium text-[#A0A5B5] mb-1.5 block">
                          RF Csatorna (1 - 13)
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={13}
                          value={wifiState.apChannel || 1}
                          onChange={(e) =>
                            onUpdateWifi((prev) => ({
                              ...prev,
                              apChannel: parseInt(e.target.value, 10) || 1,
                            }))
                          }
                          className="w-full bg-[#111318] border border-[#2B3042] focus:border-amber-500 rounded-lg px-3 py-2 text-xs text-white font-mono outline-none transition-colors"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-medium text-[#A0A5B5] mb-1.5 block">
                          Max Kliensszám (1 - 8)
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={8}
                          value={wifiState.apMaxConnections || 4}
                          onChange={(e) =>
                            onUpdateWifi((prev) => ({
                              ...prev,
                              apMaxConnections: parseInt(e.target.value, 10) || 4,
                            }))
                          }
                          className="w-full bg-[#111318] border border-[#2B3042] focus:border-amber-500 rounded-lg px-3 py-2 text-xs text-white font-mono outline-none transition-colors"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: Live WiFi Network Scanner & RF Simulation */}
              <div className="lg:col-span-5 space-y-6">
                {/* Live RF & Connection Status Card */}
                <div className="bg-[#161922] border border-[#232734] rounded-xl p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white uppercase tracking-wider">
                      Élő RF & Kapcsolati Állapot
                    </span>
                    <span
                      className={`px-2.5 py-0.5 text-xs font-mono font-bold rounded-full ${
                        wifiState.mode !== 'OFF'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-zinc-800 text-zinc-500 border border-zinc-700'
                      }`}
                    >
                      {wifiState.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div className="bg-[#111318] p-3 rounded-lg border border-[#232734]">
                      <div className="text-[11px] text-[#8A8F9E]">IP Cím (IPv4)</div>
                      <div className="text-sm font-mono font-bold text-white mt-0.5 truncate">
                        {wifiState.ipAddress || '192.168.1.150'}
                      </div>
                    </div>

                    <div className="bg-[#111318] p-3 rounded-lg border border-[#232734]">
                      <div className="text-[11px] text-[#8A8F9E]">MAC Cím</div>
                      <div className="text-sm font-mono font-bold text-emerald-400 mt-0.5 truncate">
                        {wifiState.macAddress || '24:6F:28:B4:7E:1A'}
                      </div>
                    </div>

                    <div className="bg-[#111318] p-3 rounded-lg border border-[#232734]">
                      <div className="text-[11px] text-[#8A8F9E]">Jelerősség (RSSI)</div>
                      <div className="text-sm font-mono font-bold text-cyan-400 mt-0.5 flex items-center gap-1.5">
                        <Signal className="w-4 h-4" />
                        <span>{wifiState.rssi} dBm</span>
                      </div>
                    </div>

                    <div className="bg-[#111318] p-3 rounded-lg border border-[#232734]">
                      <div className="text-[11px] text-[#8A8F9E]">Csatlakoztatott Kliensek</div>
                      <div className="text-sm font-mono font-bold text-white mt-0.5">
                        {wifiState.apClients} eszköz
                      </div>
                    </div>
                  </div>

                  {/* Signal Strength Slider */}
                  <div className="pt-2">
                    <div className="flex items-center justify-between text-xs text-[#8A8F9E] mb-1.5">
                      <span>Szimulált Jelerősség (RSSI)</span>
                      <span className="font-mono font-bold text-white">{wifiState.rssi} dBm</span>
                    </div>
                    <input
                      type="range"
                      min={-90}
                      max={-30}
                      value={wifiState.rssi}
                      onChange={(e) =>
                        onUpdateWifi((prev) => ({ ...prev, rssi: parseInt(e.target.value, 10) }))
                      }
                      className="w-full h-1.5 bg-[#232734] rounded-lg appearance-none cursor-pointer accent-emerald-500"
                    />
                    <div className="flex justify-between text-[10px] text-[#6A7080] mt-1 font-mono">
                      <span>-90 dBm (Gyenge)</span>
                      <span>-60 dBm (Jó)</span>
                      <span>-30 dBm (Kiváló)</span>
                    </div>
                  </div>
                </div>

                {/* Nearby WiFi Networks Scanner */}
                <div className="bg-[#161922] border border-[#232734] rounded-xl p-5 space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-[#232734]">
                    <div className="flex items-center gap-2">
                      <Radio className="w-4 h-4 text-cyan-400" />
                      <h3 className="text-sm font-bold text-white">Közeli Hálózatok Keresése</h3>
                    </div>
                    <button
                      onClick={handleScanWifi}
                      disabled={isScanningWifi}
                      className="flex items-center gap-1.5 px-3 py-1 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isScanningWifi ? 'animate-spin' : ''}`} />
                      <span>{isScanningWifi ? 'Keresés...' : 'Keresés (Scan)'}</span>
                    </button>
                  </div>

                  <div className="space-y-2 max-h-[220px] overflow-y-auto custom-scrollbar">
                    {simulatedAps.map((ap, idx) => (
                      <div
                        key={idx}
                        className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                          wifiState.ssid === ap.ssid
                            ? 'bg-emerald-500/10 border-emerald-500/40 text-white'
                            : 'bg-[#111318] border-[#232734] hover:border-[#3B4254]'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Signal className={`w-4 h-4 ${getSignalStrengthColor(ap.rssi)}`} />
                          <div>
                            <div className="text-xs font-bold text-white flex items-center gap-2">
                              <span>{ap.ssid}</span>
                              {wifiState.ssid === ap.ssid && (
                                <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.2 rounded font-mono">
                                  Aktuális
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-[#8A8F9E] font-mono mt-0.5">
                              CH {ap.channel} • {ap.security} • {ap.rssi} dBm
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() =>
                            onUpdateWifi((prev) => ({
                              ...prev,
                              ssid: ap.ssid,
                              rssi: ap.rssi,
                            }))
                          }
                          className="px-2.5 py-1 text-xs font-semibold rounded bg-[#1A1D27] hover:bg-[#252A38] text-white border border-[#2B3042] transition-colors"
                        >
                          Kiválaszt
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: BLE Advertising & GATT Services */}
          {activeTab === 'ble' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: BLE Configuration */}
              <div className="lg:col-span-7 space-y-6">
                {/* 1. BLE Master Switch & Profile Selection */}
                <div className="bg-[#161922] border border-[#232734] rounded-xl p-5 space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-[#232734]">
                    <div>
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <Bluetooth className="w-4 h-4 text-cyan-400" />
                        Bluetooth Low Energy (BLE 5.0 Stack)
                      </h3>
                      <p className="text-xs text-[#8A8F9E] mt-0.5">
                        ESP32 Bluedroid / NimBLE vezérlő és GATT Szerver konfigurálása
                      </p>
                    </div>

                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={currentBle.enabled}
                        onChange={(e) =>
                          onUpdateBle((prev) => ({ ...prev, enabled: e.target.checked }))
                        }
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-[#2B3042] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500"></div>
                    </label>
                  </div>

                  {currentBle.enabled && (
                    <div className="space-y-4 pt-1">
                      {/* Device Name */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs font-medium text-[#A0A5B5] mb-1.5 block">
                            BLE Eszköz Név (Local Name)
                          </label>
                          <input
                            type="text"
                            value={currentBle.deviceName}
                            onChange={(e) =>
                              onUpdateBle((prev) => ({ ...prev, deviceName: e.target.value }))
                            }
                            placeholder="ESP32_IoT_Sensors"
                            className="w-full bg-[#111318] border border-[#2B3042] focus:border-cyan-500 rounded-lg px-3 py-2 text-xs text-white font-mono outline-none transition-colors"
                          />
                        </div>

                        <div>
                          <label className="text-xs font-medium text-[#A0A5B5] mb-1.5 block">
                            TX Adóteljesítmény (esp_power_level_t)
                          </label>
                          <select
                            value={currentBle.txPower}
                            onChange={(e) =>
                              onUpdateBle((prev) => ({
                                ...prev,
                                txPower: e.target.value as Esp32BleTxPower,
                              }))
                            }
                            className="w-full bg-[#111318] border border-[#2B3042] focus:border-cyan-500 rounded-lg px-3 py-2 text-xs text-white font-mono outline-none transition-colors"
                          >
                            <option value="ESP_PWR_LVL_P9">+9 dBm (Max Hatótáv ~100m)</option>
                            <option value="ESP_PWR_LVL_P6">+6 dBm</option>
                            <option value="ESP_PWR_LVL_P3">+3 dBm (Alapértelmezett)</option>
                            <option value="ESP_PWR_LVL_N0">0 dBm (Kiegyensúlyozott)</option>
                            <option value="ESP_PWR_LVL_N6">-6 dBm</option>
                            <option value="ESP_PWR_LVL_N12">-12 dBm (Ultra Low Power)</option>
                          </select>
                        </div>
                      </div>

                      {/* Preset Profiles */}
                      <div>
                        <label className="text-xs font-medium text-[#A0A5B5] mb-2 block">
                          Működési Profil Előbeállítások (Operating Profile)
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {[
                            { id: 'GATT_SERVER', name: 'GATT Szerver', desc: 'Telemetria & Szenzor' },
                            { id: 'IBEACON', name: 'Apple iBeacon', desc: 'Mikrolokalizáció' },
                            { id: 'CUSTOM_UART', name: 'Nordic UART', desc: 'Vezeték nélküli soros' },
                            { id: 'ADVERTISER', name: 'Beacon Adó', desc: 'Nem kapcsolódó' },
                          ].map((profile) => (
                            <button
                              key={profile.id}
                              onClick={() =>
                                onUpdateBle((prev) => ({
                                  ...prev,
                                  mode: profile.id as Esp32BleMode,
                                }))
                              }
                              className={`p-2.5 rounded-lg border text-left transition-all ${
                                currentBle.mode === profile.id
                                  ? 'bg-cyan-500/15 border-cyan-500/50 text-white shadow-sm'
                                  : 'bg-[#1A1D27] border-[#2B3042] text-[#8A8F9E] hover:text-white hover:bg-[#202533]'
                              }`}
                            >
                              <div className="font-bold text-xs">{profile.name}</div>
                              <div className="text-[10px] text-[#8A8F9E] mt-0.5">{profile.desc}</div>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. Advertising Timing Parameters */}
                {currentBle.enabled && (
                  <div className="bg-[#161922] border border-[#232734] rounded-xl p-5 space-y-4">
                    <div className="flex items-center justify-between pb-2 border-b border-[#232734]">
                      <div className="flex items-center gap-2">
                        <Sliders className="w-4 h-4 text-cyan-400" />
                        <h3 className="text-sm font-bold text-white">
                          Advertising Hirdetési Időzítés & Típus
                        </h3>
                      </div>
                      <span className="text-xs text-[#8A8F9E] font-mono">
                        Slot: {Math.round(currentBle.advIntervalMinMs / 0.625)} (0.625ms)
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <div className="flex items-center justify-between text-xs text-[#A0A5B5] mb-1.5">
                          <span>Min Intervallum</span>
                          <span className="font-mono font-bold text-white">
                            {currentBle.advIntervalMinMs} ms
                          </span>
                        </div>
                        <input
                          type="range"
                          min={20}
                          max={1000}
                          step={10}
                          value={currentBle.advIntervalMinMs}
                          onChange={(e) =>
                            onUpdateBle((prev) => ({
                              ...prev,
                              advIntervalMinMs: parseInt(e.target.value, 10),
                            }))
                          }
                          className="w-full h-1.5 bg-[#232734] rounded-lg appearance-none cursor-pointer accent-cyan-500"
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between text-xs text-[#A0A5B5] mb-1.5">
                          <span>Max Intervallum</span>
                          <span className="font-mono font-bold text-white">
                            {currentBle.advIntervalMaxMs} ms
                          </span>
                        </div>
                        <input
                          type="range"
                          min={50}
                          max={2000}
                          step={10}
                          value={currentBle.advIntervalMaxMs}
                          onChange={(e) =>
                            onUpdateBle((prev) => ({
                              ...prev,
                              advIntervalMaxMs: parseInt(e.target.value, 10),
                            }))
                          }
                          className="w-full h-1.5 bg-[#232734] rounded-lg appearance-none cursor-pointer accent-cyan-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-medium text-[#A0A5B5] mb-1.5 block">
                        Advertising Csomag Típus (esp_ble_adv_type_t)
                      </label>
                      <select
                        value={currentBle.advType}
                        onChange={(e) =>
                          onUpdateBle((prev) => ({
                            ...prev,
                            advType: e.target.value as Esp32BleAdvType,
                          }))
                        }
                        className="w-full bg-[#111318] border border-[#2B3042] focus:border-cyan-500 rounded-lg px-3 py-2 text-xs text-white font-mono outline-none transition-colors"
                      >
                        <option value="ADV_TYPE_IND">ADV_TYPE_IND (Kapcsolódó, Nem-irányított hirdetés)</option>
                        <option value="ADV_TYPE_NONCONN_IND">ADV_TYPE_NONCONN_IND (Nem kapcsolódó, Sugárzó jeladó)</option>
                        <option value="ADV_TYPE_SCAN_IND">ADV_TYPE_SCAN_IND (Szkennelhető, Nem kapcsolódó)</option>
                      </select>
                    </div>
                  </div>
                )}

                {/* 3. iBeacon Parameters (when iBeacon selected) */}
                {currentBle.enabled && currentBle.mode === 'IBEACON' && (
                  <div className="bg-[#161922] border border-[#232734] rounded-xl p-5 space-y-4">
                    <div className="flex items-center justify-between pb-2 border-b border-[#232734]">
                      <div className="flex items-center gap-2">
                        <Radio className="w-4 h-4 text-purple-400" />
                        <h3 className="text-sm font-bold text-white">Apple iBeacon Sugárzó Paraméterek</h3>
                      </div>
                      <span className="text-xs text-[#8A8F9E] font-mono">Company ID: 0x004C (Apple)</span>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="text-xs font-medium text-[#A0A5B5] mb-1.5 block">
                          Proximity UUID (128-bit)
                        </label>
                        <input
                          type="text"
                          value={currentBle.iBeacon.proximityUuid}
                          onChange={(e) =>
                            onUpdateBle((prev) => ({
                              ...prev,
                              iBeacon: { ...prev.iBeacon, proximityUuid: e.target.value },
                            }))
                          }
                          className="w-full bg-[#111318] border border-[#2B3042] focus:border-purple-500 rounded-lg px-3 py-2 text-xs text-white font-mono outline-none transition-colors"
                        />
                      </div>

                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="text-xs font-medium text-[#A0A5B5] mb-1.5 block">
                            Major ID (0..65535)
                          </label>
                          <input
                            type="number"
                            value={currentBle.iBeacon.major}
                            onChange={(e) =>
                              onUpdateBle((prev) => ({
                                ...prev,
                                iBeacon: { ...prev.iBeacon, major: parseInt(e.target.value, 10) || 0 },
                              }))
                            }
                            className="w-full bg-[#111318] border border-[#2B3042] focus:border-purple-500 rounded-lg px-3 py-2 text-xs text-white font-mono outline-none transition-colors"
                          />
                        </div>

                        <div>
                          <label className="text-xs font-medium text-[#A0A5B5] mb-1.5 block">
                            Minor ID (0..65535)
                          </label>
                          <input
                            type="number"
                            value={currentBle.iBeacon.minor}
                            onChange={(e) =>
                              onUpdateBle((prev) => ({
                                ...prev,
                                iBeacon: { ...prev.iBeacon, minor: parseInt(e.target.value, 10) || 0 },
                              }))
                            }
                            className="w-full bg-[#111318] border border-[#2B3042] focus:border-purple-500 rounded-lg px-3 py-2 text-xs text-white font-mono outline-none transition-colors"
                          />
                        </div>

                        <div>
                          <label className="text-xs font-medium text-[#A0A5B5] mb-1.5 block">
                            Mért Teljesítmény @ 1m
                          </label>
                          <input
                            type="number"
                            value={currentBle.iBeacon.measuredPowerRssiAt1m}
                            onChange={(e) =>
                              onUpdateBle((prev) => ({
                                ...prev,
                                iBeacon: {
                                  ...prev.iBeacon,
                                  measuredPowerRssiAt1m: parseInt(e.target.value, 10) || -59,
                                },
                              }))
                            }
                            className="w-full bg-[#111318] border border-[#2B3042] focus:border-purple-500 rounded-lg px-3 py-2 text-xs text-white font-mono outline-none transition-colors"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 4. GATT Services & Characteristics Builder */}
                {currentBle.enabled && currentBle.mode !== 'IBEACON' && (
                  <div className="bg-[#161922] border border-[#232734] rounded-xl p-5 space-y-4">
                    <div className="flex items-center justify-between pb-2 border-b border-[#232734]">
                      <div className="flex items-center gap-2">
                        <Layers className="w-4 h-4 text-cyan-400" />
                        <h3 className="text-sm font-bold text-white">GATT Karakterisztikák Tervező</h3>
                      </div>
                      <span className="text-xs text-[#8A8F9E] font-mono">
                        {currentBle.services?.[0]?.characteristics?.length || 0} Karakterisztika
                      </span>
                    </div>

                    {/* Characteristics List */}
                    <div className="space-y-2">
                      {currentBle.services?.[0]?.characteristics?.map((char) => (
                        <div
                          key={char.id}
                          className="flex items-center justify-between p-3 rounded-lg bg-[#111318] border border-[#232734] hover:border-[#3B4254] transition-all"
                        >
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-white">{char.name}</span>
                              <span className="text-[10px] font-mono text-cyan-400 bg-cyan-500/10 px-1.5 py-0.2 rounded">
                                {char.permissions.join(' | ')}
                              </span>
                            </div>
                            <div className="text-[10px] font-mono text-[#8A8F9E]">{char.uuid}</div>
                          </div>

                          <div className="flex items-center gap-2">
                            <div className="text-xs font-mono font-bold text-emerald-400 bg-[#1A1D27] px-2.5 py-1 rounded border border-[#2B3042]">
                              {char.value}
                            </div>
                            {char.permissions.includes('NOTIFY') && (
                              <button
                                onClick={() => handleToggleNotify(char)}
                                className="px-2.5 py-1 text-xs font-semibold rounded bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-400 border border-cyan-500/30 transition-colors"
                                title="Értesítés küldése a feliratkozott klienseknek"
                              >
                                Notify
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteCharacteristic(char.id)}
                              className="p-1.5 text-[#8A8F9E] hover:text-rose-400 transition-colors"
                              title="Törlés"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Add Characteristic */}
                    <div className="pt-2 flex flex-col sm:flex-row gap-2">
                      <input
                        type="text"
                        value={newCharName}
                        onChange={(e) => setNewCharName(e.target.value)}
                        placeholder="Új Karakterisztika Neve (pl. Fényérzékelő Lux)"
                        className="flex-1 bg-[#111318] border border-[#2B3042] focus:border-cyan-500 rounded-lg px-3 py-2 text-xs text-white font-mono outline-none"
                      />
                      <input
                        type="text"
                        value={newCharVal}
                        onChange={(e) => setNewCharVal(e.target.value)}
                        placeholder="Kezdőérték"
                        className="w-24 bg-[#111318] border border-[#2B3042] focus:border-cyan-500 rounded-lg px-3 py-2 text-xs text-white font-mono outline-none"
                      />
                      <button
                        onClick={handleAddCharacteristic}
                        className="flex items-center justify-center gap-1.5 px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-black font-bold rounded-lg text-xs transition-colors shrink-0"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Hozzáadás</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: BLE Packet Breakdown & Virtual Client */}
              <div className="lg:col-span-5 space-y-6">
                {/* Virtual Client Card */}
                <div className="bg-[#161922] border border-[#232734] rounded-xl p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white uppercase tracking-wider">
                      Virtuális Okostelefon BLE Csatlakozás
                    </span>
                    <span
                      className={`px-2.5 py-0.5 text-xs font-mono font-bold rounded-full ${
                        currentBle.connectedClientsCount > 0
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-zinc-800 text-zinc-500 border border-zinc-700'
                      }`}
                    >
                      {currentBle.connectedClientsCount > 0 ? 'Kliens Csatlakozva' : 'Nincs Kliens'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg bg-[#111318] border border-[#232734]">
                    <div className="flex items-center gap-3">
                      <Smartphone
                        className={`w-5 h-5 ${
                          currentBle.connectedClientsCount > 0 ? 'text-emerald-400' : 'text-[#8A8F9E]'
                        }`}
                      />
                      <div>
                        <div className="text-xs font-bold text-white">
                          {currentBle.connectedClientsCount > 0
                            ? 'Google Pixel / nRF Connect'
                            : 'Nincs aktív kapcsolat'}
                        </div>
                        <div className="text-[10px] text-[#8A8F9E] font-mono">
                          {currentBle.connectedClientsCount > 0
                            ? 'MTU: 512 bájt • RSSI: -54 dBm • Interval: 30ms'
                            : 'Kattints a szimulált csatlakozáshoz'}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={handleToggleVirtualClient}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                        currentBle.connectedClientsCount > 0
                          ? 'bg-rose-500/20 text-rose-400 border-rose-500/30 hover:bg-rose-500/30'
                          : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/30'
                      }`}
                    >
                      {currentBle.connectedClientsCount > 0 ? 'Leválasztás' : 'Csatlakozás'}
                    </button>
                  </div>

                  {/* Packet Counter */}
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div className="bg-[#111318] p-3 rounded-lg border border-[#232734]">
                      <div className="text-[11px] text-[#8A8F9E]">Sugárzott Csomagok (TX)</div>
                      <div className="text-sm font-mono font-bold text-cyan-400 mt-0.5">
                        {currentBle.txPacketsCount} db
                      </div>
                    </div>
                    <div className="bg-[#111318] p-3 rounded-lg border border-[#232734]">
                      <div className="text-[11px] text-[#8A8F9E]">Advertising Állapot</div>
                      <div className="text-sm font-mono font-bold text-emerald-400 mt-0.5">
                        {currentBle.isAdvertising ? 'Aktív Sugárzás' : 'Szünetel'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 31-Byte Raw BLE Advertising Frame Inspector */}
                <div className="bg-[#161922] border border-[#232734] rounded-xl p-5 space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-[#232734]">
                    <div className="flex items-center gap-2">
                      <Cpu className="w-4 h-4 text-purple-400" />
                      <h3 className="text-sm font-bold text-white">
                        31-Bájtos BLE Hirdetési Csomag Felépítése
                      </h3>
                    </div>
                    <span className="text-xs text-[#8A8F9E] font-mono">GAP Protocol</span>
                  </div>

                  <div className="space-y-2">
                    <div className="bg-[#111318] p-3 rounded-lg border border-[#232734] font-mono text-[11px] space-y-1.5">
                      <div className="text-[#8A8F9E] flex items-center justify-between">
                        <span>[0..2] Flags:</span>
                        <span className="text-purple-400">0x02 0x01 0x06 (LE Gen. Disc.)</span>
                      </div>
                      <div className="text-[#8A8F9E] flex items-center justify-between">
                        <span>[3..X] Local Name:</span>
                        <span className="text-cyan-400 truncate max-w-[200px]">
                          {currentBle.deviceName}
                        </span>
                      </div>
                      <div className="text-[#8A8F9E] flex items-center justify-between">
                        <span>[X..Y] Service UUID / Data:</span>
                        <span className="text-emerald-400 font-mono">128-bit primary service</span>
                      </div>
                    </div>

                    <div>
                      <div className="text-[11px] text-[#8A8F9E] mb-1">Nyers HEX Csomag (Payload):</div>
                      <div className="p-2.5 bg-[#0A0C10] rounded-lg border border-[#232734] font-mono text-[11px] text-zinc-300 break-all select-all">
                        {currentBle.lastTransmittedPacketHex}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Event Logs */}
                <div className="bg-[#161922] border border-[#232734] rounded-xl p-4 space-y-2">
                  <div className="text-xs font-bold text-[#8A8F9E] uppercase tracking-wider mb-2">
                    Élő BLE Eseménynapló
                  </div>
                  <div className="space-y-1.5 max-h-[140px] overflow-y-auto custom-scrollbar font-mono text-[11px]">
                    {currentBle.simulatedLogs?.length > 0 ? (
                      currentBle.simulatedLogs.map((log) => (
                        <div key={log.id} className="text-[#8A8F9E] flex items-start gap-2">
                          <span className="text-zinc-500 shrink-0">[{log.timestamp}]</span>
                          <span
                            className={
                              log.type === 'CONNECT'
                                ? 'text-emerald-400'
                                : log.type === 'NOTIFY'
                                ? 'text-cyan-400'
                                : 'text-zinc-300'
                            }
                          >
                            {log.details}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="text-zinc-600 italic">Nincs még rögzített BLE esemény.</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Generated C Code */}
          {activeTab === 'code' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#161922] p-4 rounded-xl border border-[#232734]">
                <div className="flex items-center gap-3">
                  <div className="text-xs font-bold uppercase tracking-wider text-[#8A8F9E]">
                    Cél Architektúra / Keretrendszer:
                  </div>
                  <div className="flex items-center gap-2 bg-[#111318] p-1 rounded-lg border border-[#2B3042]">
                    <button
                      onClick={() => setCodeFramework('arduino')}
                      className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
                        codeFramework === 'arduino'
                          ? 'bg-purple-500 text-white shadow'
                          : 'text-[#8A8F9E] hover:text-white'
                      }`}
                    >
                      Arduino C++ (WiFi.h + BLEDevice.h)
                    </button>
                    <button
                      onClick={() => setCodeFramework('espidf')}
                      className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
                        codeFramework === 'espidf'
                          ? 'bg-purple-500 text-white shadow'
                          : 'text-[#8A8F9E] hover:text-white'
                      }`}
                    >
                      ESP-IDF Natív C (esp_wifi.h + esp_gap_ble_api.h)
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopyCode}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1A1D27] hover:bg-[#252A38] text-white border border-[#2B3042] rounded-lg text-xs font-semibold transition-colors"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    <span>{copied ? 'Másolva!' : 'Kód Másolása'}</span>
                  </button>
                  <button
                    onClick={handleDownloadCode}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1A1D27] hover:bg-[#252A38] text-white border border-[#2B3042] rounded-lg text-xs font-semibold transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    <span>Letöltés</span>
                  </button>
                </div>
              </div>

              {/* Syntax highlighted code block */}
              <div className="relative rounded-xl border border-[#232734] bg-[#0A0C10] p-4 overflow-x-auto max-h-[520px] custom-scrollbar font-mono text-xs text-zinc-300 leading-relaxed">
                <pre>{generatedCode}</pre>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-[#232734] bg-[#161922]">
          <div className="flex items-center gap-2 text-xs text-[#8A8F9E]">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>
              A módosítások automatikusan érvényesülnek a szimulációban és a fő ESP32 C forráskódban.
            </span>
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs rounded-xl shadow-lg transition-colors"
          >
            Kész & Alkalmazás
          </button>
        </div>
      </div>
    </div>
  );
};
