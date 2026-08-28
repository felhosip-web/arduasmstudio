/**
 * (c) 2026 AI Studio AVR Visual Studio
 * Virtual Wiring Diagram, Interactive Breadboard & Bill of Materials (BOM) Modal
 * Real-time schematic synthesizer, pinout inspector, and assembly guide
 */

import React, { useState, useMemo } from 'react';
import {
  Layers,
  Cpu,
  Zap,
  Sliders,
  AlertTriangle,
  CheckCircle2,
  Copy,
  Check,
  FileSpreadsheet,
  Info,
  Radio,
  ExternalLink,
  ChevronRight,
  ListOrdered,
  Plus,
  Sparkles,
} from 'lucide-react';
import { ProgramBlock, ArduinoPin, HardwareModule } from '../types';
import { PIN_MAPPINGS, ARDUINO_PINS_ORDER } from '../utils/hardwareMap';
import {
  analyzeCircuitWiring,
  WiringNet,
  BomItem,
  WiringDrcIssue,
} from '../utils/wiringDiagramEngine';
import { MagneticWiringCanvas } from './MagneticWiringCanvas';

interface VirtualWiringModalProps {
  isOpen: boolean;
  onClose: () => void;
  blocks: ProgramBlock[];
  modules?: HardwareModule[];
}

export const VirtualWiringModal: React.FC<VirtualWiringModalProps> = ({
  isOpen,
  onClose,
  blocks,
  modules = [],
}) => {
  const [activeTab, setActiveTab] = useState<'magnetic' | 'schematic' | 'netlist' | 'bom' | 'guide'>('magnetic');
  const [selectedPin, setSelectedPin] = useState<ArduinoPin | '5V' | '3.3V' | 'GND' | 'VIN' | null>('13');
  const [copiedData, setCopiedData] = useState<boolean>(false);

  const wiringResult = useMemo(() => {
    return analyzeCircuitWiring(blocks, modules);
  }, [blocks, modules]);

  if (!isOpen) return null;

  const totalCostHuf = wiringResult.bom.reduce(
    (acc, item) => acc + item.estimatedCostHuf * item.quantity,
    0
  );

  const handleExportBomCsv = () => {
    const header = ['Kategória', 'Alkatrész Neve', 'Mennyiség', 'Specifikáció / Tokozás', 'Leírás', 'Becsült Ár (HUF)'].join(',');
    const rows = wiringResult.bom.map((b) =>
      [
        `"${b.category}"`,
        `"${b.name}"`,
        b.quantity,
        `"${b.specification}"`,
        `"${b.description}"`,
        b.estimatedCostHuf * b.quantity,
      ].join(',')
    );

    const csvContent = 'data:text/csv;charset=utf-8,' + [header, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `arduino_uno_bom_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopyWiringReport = () => {
    const text = `=== ARDUINO UNO R3 VIRTUÁLIS BEKÖTÉSI JEGYZÉK & ALKATRÉSZLISTA (BOM) ===
Összes becsült áramfelvétel: ~${wiringResult.totalEstimatedCurrentMa} mA
Összes becsült alkatrészköltség: ${totalCostHuf.toLocaleString('hu-HU')} Ft
Aktív Arduino kivezetések: ${Array.from(wiringResult.activeArduinoPins).join(', ') || 'Nincs'}

--- ALKATRÉSZLISTA (BILL OF MATERIALS) ---
${wiringResult.bom
  .map(
    (b) =>
      `• [${b.category}] ${b.name} x${b.quantity} db (${b.specification}) -> ${b.estimatedCostHuf * b.quantity} Ft`
  )
  .join('\n')}

--- BEKÖTÉSI HÁLÓZAT (NETLIST) ---
${wiringResult.nets
  .map((n) => `• [${n.signalType}] ${n.from}  --->  ${n.to} (${n.notes})`)
  .join('\n')}

--- LÉPÉSRŐL LÉPÉSRE ÖSSZESZERELÉSI ÚTMUTATÓ ---
${wiringResult.assemblySteps.join('\n')}
`;

    navigator.clipboard.writeText(text);
    setCopiedData(true);
    setTimeout(() => setCopiedData(false), 2000);
  };

  const selectedPinMapping =
    selectedPin && selectedPin in PIN_MAPPINGS
      ? PIN_MAPPINGS[selectedPin as ArduinoPin]
      : null;

  return (
    <div
      id="modal-virtual-wiring"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs font-sans"
    >
      <div className="bg-[#12141A] border border-[#2A2D35] rounded-xs shadow-[8px_8px_0px_#000] w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* HEADER */}
        <div className="px-4 py-3 bg-[#161920] border-b border-[#2A2D35] flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xs border border-cyan-500/80 bg-cyan-950/60 text-cyan-400 shadow-[2px_2px_0px_#000]">
              <Layers className="w-5 h-5 animate-pulse" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-sm sm:text-base uppercase tracking-tight text-white font-mono flex items-center gap-1.5">
                  <span>Virtuális Bekötési Rajz & Pinout Stúdió</span>
                </h2>
                <span className="text-[10px] font-mono font-bold bg-[#1A1D24] text-cyan-400 px-2 py-0.5 rounded-xs border border-[#3A3F4B]">
                  Interactive Breadboard & BOM
                </span>
              </div>
              <p className="text-[11px] text-[#8A8D98]">
                Kapcsolási rajz, próbapanel huzalozás, alkatrészjegyzék (BOM) és DRC ellenőrzés
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportBomCsv}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-mono bg-[#1A1D24] hover:bg-[#2A2D35] text-[#E0E0E6] border border-[#3A3F4B] rounded-xs shadow-[2px_2px_0px_#000] transition-colors cursor-pointer"
              title="BOM Alkatrészlista letöltése CSV táblázatban"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-[#4ade80]" />
              <span className="hidden sm:inline">BOM CSV Mentés</span>
            </button>

            <button
              onClick={handleCopyWiringReport}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-mono bg-[#1A1D24] hover:bg-[#2A2D35] text-[#E0E0E6] border border-[#3A3F4B] rounded-xs shadow-[2px_2px_0px_#000] transition-colors cursor-pointer"
              title="Bekötési jegyzék másolása"
            >
              {copiedData ? (
                <Check className="w-3.5 h-3.5 text-[#4ade80]" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-[#8A8D98]" />
              )}
              <span className="hidden sm:inline">Másolás</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 px-2.5 text-xs font-mono font-bold bg-[#1A1D24] hover:bg-rose-950/40 text-[#8A8D98] hover:text-rose-300 border border-[#3A3F4B] hover:border-rose-500/50 rounded-xs transition-colors cursor-pointer"
            >
              ✕ Bezárás
            </button>
          </div>
        </div>

        {/* STATUS HUD BAR */}
        <div className="px-4 py-2 bg-[#0F1115] border-b border-[#2A2D35] flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-cyan-300">
              <span className="text-[#8A8D98]">Aktív Kivezetések:</span>
              <span className="font-bold">{wiringResult.activeArduinoPins.size} db</span>
            </div>

            <div className="flex items-center gap-1.5 text-amber-300 pl-3 border-l border-[#2A2D35]">
              <span className="text-[#8A8D98]">Becsült Áramfelvétel:</span>
              <span className="font-bold">~{wiringResult.totalEstimatedCurrentMa} mA</span>
            </div>

            <div className="flex items-center gap-1.5 text-[#4ade80] pl-3 border-l border-[#2A2D35]">
              <span className="text-[#8A8D98]">Alkatrészköltség (BOM):</span>
              <span className="font-bold">{totalCostHuf.toLocaleString('hu-HU')} Ft</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {wiringResult.drcIssues.length === 0 ? (
              <span className="flex items-center gap-1 text-[11px] text-[#4ade80] bg-emerald-950/60 px-2 py-0.5 rounded-xs border border-emerald-500/40">
                <CheckCircle2 className="w-3.5 h-3.5" />
                DRC Hiba nélkül
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[11px] text-amber-300 bg-amber-950/60 px-2 py-0.5 rounded-xs border border-amber-500/40">
                <AlertTriangle className="w-3.5 h-3.5" />
                {wiringResult.drcIssues.length} DRC Észrevétel
              </span>
            )}
          </div>
        </div>

        {/* NAVIGATION TABS */}
        <div className="px-4 py-2 bg-[#161920] border-b border-[#2A2D35] flex items-center justify-between gap-2 flex-wrap font-mono text-xs">
          <div className="flex items-center gap-1 flex-wrap">
            <button
              onClick={() => setActiveTab('magnetic')}
              className={`px-3 py-1 rounded-xs border transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'magnetic'
                  ? 'bg-cyan-400 text-black font-bold border-cyan-400'
                  : 'bg-[#1A1D24] text-[#8A8D98] border-[#3A3F4B] hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Mágneses Bekötő & Próbapanel Vászona</span>
            </button>

            <button
              onClick={() => setActiveTab('schematic')}
              className={`px-3 py-1 rounded-xs border transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'schematic'
                  ? 'bg-cyan-400 text-black font-bold border-cyan-400'
                  : 'bg-[#1A1D24] text-[#8A8D98] border-[#3A3F4B] hover:text-white'
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>Interaktív Uno Pinout & Huzalozás</span>
            </button>

            <button
              onClick={() => setActiveTab('netlist')}
              className={`px-3 py-1 rounded-xs border transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'netlist'
                  ? 'bg-cyan-400 text-black font-bold border-cyan-400'
                  : 'bg-[#1A1D24] text-[#8A8D98] border-[#3A3F4B] hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Bekötési Hálózat / Netlist ({wiringResult.nets.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('bom')}
              className={`px-3 py-1 rounded-xs border transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'bom'
                  ? 'bg-cyan-400 text-black font-bold border-cyan-400'
                  : 'bg-[#1A1D24] text-[#8A8D98] border-[#3A3F4B] hover:text-white'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Alkatrészlista / BOM ({wiringResult.bom.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('guide')}
              className={`px-3 py-1 rounded-xs border transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'guide'
                  ? 'bg-cyan-400 text-black font-bold border-cyan-400'
                  : 'bg-[#1A1D24] text-[#8A8D98] border-[#3A3F4B] hover:text-white'
              }`}
            >
              <ListOrdered className="w-3.5 h-3.5" />
              <span>Összeszerelési Útmutató</span>
            </button>
          </div>
        </div>

        {/* MODAL CONTENT */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-[#0F1115]">
          {activeTab === 'magnetic' && (
            <div className="h-[600px] flex flex-col">
              <MagneticWiringCanvas />
            </div>
          )}

          {activeTab === 'schematic' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              {/* ARDUINO UNO R3 VISUAL PINOUT BOARD */}
              <div className="lg:col-span-8 bg-[#161920] border border-[#2A2D35] rounded-xs p-4 space-y-4 font-mono shadow-[2px_2px_0px_#000]">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
                    <span>Arduino Uno R3 Kivezetés Térkép (Pinout)</span>
                  </h3>
                  <span className="text-[10px] text-[#8A8D98]">Kattints egy kivezetésre a részletekért</span>
                </div>

                {/* DIGITAL HEADER ROW (D0 - D13 + GND + AREF) */}
                <div className="space-y-1.5">
                  <div className="text-[10px] text-[#8A8D98] uppercase tracking-wider flex items-center justify-between">
                    <span>Felső Digitális Fejléc (PORTD / PORTB)</span>
                    <span className="text-cyan-400 font-bold">D0 ... D13</span>
                  </div>

                  <div className="grid grid-cols-8 sm:grid-cols-16 gap-1 p-2 bg-[#0F1115] border border-[#2A2D35] rounded-xs">
                    {['AREF', 'GND', '13', '12', '11', '10', '9', '8', '7', '6', '5', '4', '3', '2', '1', '0'].map(
                      (pin) => {
                        const isActive = wiringResult.activeArduinoPins.has(pin as any);
                        const isSelected = selectedPin === pin;
                        const mapping = pin in PIN_MAPPINGS ? PIN_MAPPINGS[pin as ArduinoPin] : null;

                        return (
                          <button
                            key={pin}
                            onClick={() => setSelectedPin(pin as any)}
                            className={`p-1.5 flex flex-col items-center justify-center rounded-xs border text-[10px] transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-cyan-500 text-black font-bold border-cyan-300 shadow-[0_0_8px_#06b6d4]'
                                : isActive
                                ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/60 font-bold'
                                : 'bg-[#1A1D24] text-[#8A8D98] border-[#3A3F4B] hover:text-white'
                            }`}
                            title={mapping ? `${mapping.description} - ${mapping.special || ''}` : pin}
                          >
                            <span className="font-bold">{pin}</span>
                            <span className="text-[8px] opacity-70">
                              {mapping ? `${mapping.port[4]}${mapping.bit}` : 'PWR'}
                            </span>
                          </button>
                        );
                      }
                    )}
                  </div>
                </div>

                {/* ANALOG & POWER HEADER ROW (5V, 3.3V, GND, VIN, A0 - A5) */}
                <div className="space-y-1.5">
                  <div className="text-[10px] text-[#8A8D98] uppercase tracking-wider flex items-center justify-between">
                    <span>Alsó Analóg & Tápellátás Fejléc (PORTC & Power Rails)</span>
                    <span className="text-amber-400 font-bold">A0 ... A5 & 5V/GND</span>
                  </div>

                  <div className="grid grid-cols-6 sm:grid-cols-12 gap-1 p-2 bg-[#0F1115] border border-[#2A2D35] rounded-xs">
                    {['RESET', '3.3V', '5V', 'GND', 'GND', 'VIN', 'A0', 'A1', 'A2', 'A3', 'A4', 'A5'].map(
                      (pin, idx) => {
                        const isPower = ['3.3V', '5V', 'GND', 'VIN', 'RESET'].includes(pin);
                        const isActive = isPower || wiringResult.activeArduinoPins.has(pin as any);
                        const isSelected = selectedPin === pin;
                        const mapping = pin in PIN_MAPPINGS ? PIN_MAPPINGS[pin as ArduinoPin] : null;

                        return (
                          <button
                            key={`${pin}_${idx}`}
                            onClick={() => setSelectedPin(pin as any)}
                            className={`p-1.5 flex flex-col items-center justify-center rounded-xs border text-[10px] transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-cyan-500 text-black font-bold border-cyan-300 shadow-[0_0_8px_#06b6d4]'
                                : isPower
                                ? pin === '5V'
                                  ? 'bg-rose-950/80 text-rose-300 border-rose-500/50'
                                  : pin.includes('GND')
                                  ? 'bg-slate-900 text-slate-300 border-slate-700'
                                  : 'bg-[#1A1D24] text-amber-300 border-[#3A3F4B]'
                                : isActive
                                ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/60 font-bold'
                                : 'bg-[#1A1D24] text-[#8A8D98] border-[#3A3F4B] hover:text-white'
                            }`}
                            title={mapping ? `${mapping.description} - ${mapping.special || ''}` : pin}
                          >
                            <span className="font-bold">{pin}</span>
                            <span className="text-[8px] opacity-70">
                              {mapping ? `C${mapping.bit}` : isPower ? 'PWR' : ''}
                            </span>
                          </button>
                        );
                      }
                    )}
                  </div>
                </div>

                {/* BREADBOARD WIRES SCHEMATIC PREVIEW */}
                <div className="p-3 bg-[#0A0C10] border border-[#2A2D35] rounded-xs space-y-2">
                  <div className="text-[11px] font-bold text-[#E0E0E6] flex items-center justify-between">
                    <span>Huzalozási Csatlakozások a Próbapanelhez:</span>
                    <span className="text-cyan-400">{wiringResult.nets.length} vezeték</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                    {wiringResult.nets.slice(0, 6).map((net) => (
                      <div
                        key={net.id}
                        className="p-2 bg-[#161920] border border-[#2A2D35] rounded-xs flex items-center justify-between gap-2"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="w-3 h-3 rounded-full shrink-0 border border-black"
                            style={{ backgroundColor: net.wireColor }}
                          />
                          <div>
                            <div className="font-bold text-white">{net.from}</div>
                            <div className="text-[10px] text-[#8A8D98]">{net.to}</div>
                          </div>
                        </div>
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-xs bg-[#1A1D24] text-cyan-300 border border-[#3A3F4B]">
                          {net.signalType}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* PIN INSPECTOR SIDEBAR */}
              <div className="lg:col-span-4 bg-[#161920] border border-[#2A2D35] rounded-xs p-4 space-y-3 font-mono text-xs shadow-[2px_2px_0px_#000]">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Info className="w-4 h-4 text-cyan-400" />
                  <span>Kivezetés Információ: {selectedPin || 'Nincs'}</span>
                </h3>

                {selectedPinMapping ? (
                  <div className="space-y-2.5">
                    <div className="p-2.5 bg-[#0F1115] border border-[#2A2D35] rounded-xs space-y-1">
                      <div className="text-[#8A8D98] text-[10px]">AVR Hardver Regiszter Címzés:</div>
                      <div className="text-white font-bold">
                        {selectedPinMapping.port}.{selectedPinMapping.bit} (Bit {selectedPinMapping.bit})
                      </div>
                      <div className="text-[11px] text-cyan-300">
                        DDR: {selectedPinMapping.ddr} ({selectedPinMapping.ddrAddr}) | PORT: {selectedPinMapping.port} ({selectedPinMapping.portAddr})
                      </div>
                    </div>

                    <div className="p-2.5 bg-[#0F1115] border border-[#2A2D35] rounded-xs space-y-1">
                      <div className="text-[#8A8D98] text-[10px]">Funkció & Képességek:</div>
                      <div className="text-[#4ade80] font-bold">
                        {selectedPinMapping.special || 'Általános Digitális I/O'}
                      </div>
                      <div className="text-[11px] text-[#8A8D98]">
                        {selectedPinMapping.description}
                      </div>
                    </div>

                    <div className="p-2.5 bg-[#0F1115] border border-[#2A2D35] rounded-xs space-y-1">
                      <div className="text-[#8A8D98] text-[10px]">Elektromos Korlátok (ATmega328P):</div>
                      <div className="text-amber-300 font-bold">Max 40.0 mA / láb (Ajánlott: 20 mA)</div>
                      <div className="text-[10px] text-[#8A8D98]">
                        Logikai magas (HIGH): 5.0 V | Logikai alacsony (LOW): 0.0 V
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-[#0F1115] border border-[#2A2D35] rounded-xs space-y-2 text-[#8A8D98]">
                    <div className="text-white font-bold">Tápellátási Kivezetés: {selectedPin}</div>
                    <p className="text-[11px]">
                      {selectedPin === '5V' && 'Központi 5.0V szabályozott tápfeszültség kimenet (USB / belső 5V LDO).'}
                      {selectedPin === '3.3V' && '3.3V-os kiegészítő tápfeszültség kimenet max 50 mA terhelhetőséggel.'}
                      {selectedPin === 'GND' && 'Közös test / földelési pont (0V referencia).'}
                      {selectedPin === 'VIN' && 'Külső DC táp bemenet (7V - 12V feszültséghez).'}
                    </p>
                  </div>
                )}

                {/* DRC WARNINGS */}
                {wiringResult.drcIssues.length > 0 && (
                  <div className="space-y-1.5 pt-2 border-t border-[#2A2D35]">
                    <div className="text-[10px] text-amber-400 font-bold uppercase tracking-wider flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      <span>Áramköri Figyelmeztetések (DRC)</span>
                    </div>

                    {wiringResult.drcIssues.map((drc) => (
                      <div
                        key={drc.id}
                        className="p-2 rounded-xs bg-amber-950/40 border border-amber-500/40 text-[11px] space-y-0.5 text-amber-200"
                      >
                        <div className="font-bold">{drc.title}</div>
                        <div className="text-[10px] opacity-80">{drc.recommendation}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'netlist' && (
            <div className="space-y-3 font-mono text-xs">
              <div className="border border-[#2A2D35] rounded-xs overflow-hidden bg-[#161920]">
                <div className="grid grid-cols-12 gap-2 p-2.5 bg-[#12141A] border-b border-[#2A2D35] text-[#8A8D98] font-bold text-[11px]">
                  <div className="col-span-3">Honnan (Arduino Uno)</div>
                  <div className="col-span-4">Hová (Alkatrész / Próbapanel)</div>
                  <div className="col-span-2 text-center">Vezeték Szín</div>
                  <div className="col-span-3">Jel Típus & Megjegyzés</div>
                </div>

                <div className="divide-y divide-[#2A2D35]">
                  {wiringResult.nets.map((net) => (
                    <div
                      key={net.id}
                      className="grid grid-cols-12 gap-2 p-2.5 items-center hover:bg-[#1A1D24] text-[#E0E0E6]"
                    >
                      <div className="col-span-3 font-bold text-cyan-300 flex items-center gap-1.5">
                        <ChevronRight className="w-3.5 h-3.5 text-[#8A8D98]" />
                        <span>{net.from}</span>
                      </div>

                      <div className="col-span-4 font-bold text-white">
                        {net.to}
                      </div>

                      <div className="col-span-2 flex items-center justify-center gap-1.5">
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-black shrink-0 shadow-xs"
                          style={{ backgroundColor: net.wireColor }}
                        />
                        <span className="text-[10px] text-[#8A8D98] font-mono">{net.wireColor}</span>
                      </div>

                      <div className="col-span-3 text-[11px] text-[#8A8D98]">
                        <span className="text-amber-300 font-bold">[{net.signalType}]</span> {net.notes}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'bom' && (
            <div className="space-y-3 font-mono text-xs">
              <div className="border border-[#2A2D35] rounded-xs overflow-hidden bg-[#161920]">
                <div className="grid grid-cols-12 gap-2 p-2.5 bg-[#12141A] border-b border-[#2A2D35] text-[#8A8D98] font-bold text-[11px]">
                  <div className="col-span-2">Kategória</div>
                  <div className="col-span-4">Alkatrész Neve</div>
                  <div className="col-span-2 text-center">Mennyiség</div>
                  <div className="col-span-2">Specifikáció</div>
                  <div className="col-span-2 text-right">Becsült Ár (HUF)</div>
                </div>

                <div className="divide-y divide-[#2A2D35]">
                  {wiringResult.bom.map((item) => (
                    <div
                      key={item.id}
                      className="grid grid-cols-12 gap-2 p-2.5 items-center hover:bg-[#1A1D24] text-[#E0E0E6]"
                    >
                      <div className="col-span-2">
                        <span className="px-1.5 py-0.5 text-[10px] rounded-xs bg-[#1A1D24] text-cyan-300 border border-[#3A3F4B]">
                          {item.category}
                        </span>
                      </div>

                      <div className="col-span-4 font-bold text-white">
                        {item.name}
                        <div className="text-[10px] font-normal text-[#8A8D98]">
                          {item.description}
                        </div>
                      </div>

                      <div className="col-span-2 text-center font-bold text-[#4ade80]">
                        {item.quantity} db
                      </div>

                      <div className="col-span-2 text-[11px] text-amber-300">
                        {item.specification}
                      </div>

                      <div className="col-span-2 text-right font-bold text-white">
                        {(item.estimatedCostHuf * item.quantity).toLocaleString('hu-HU')} Ft
                      </div>
                    </div>
                  ))}
                </div>

                <div className="p-3 bg-[#0F1115] border-t border-[#2A2D35] flex items-center justify-between text-xs font-bold text-white">
                  <span>ÖSSZES BECSÜLT ANYAGKÖLTSÉG (BOM):</span>
                  <span className="text-[#4ade80] text-sm font-mono">
                    {totalCostHuf.toLocaleString('hu-HU')} Ft
                  </span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'guide' && (
            <div className="space-y-3 font-mono text-xs">
              <div className="p-4 bg-[#161920] border border-[#2A2D35] rounded-xs space-y-3">
                <div className="text-xs font-bold text-cyan-400 flex items-center gap-2">
                  <ListOrdered className="w-4 h-4" />
                  <span>Lépésről-lépésre Hardver Összeszerelési Útmutató</span>
                </div>

                <div className="space-y-2">
                  {wiringResult.assemblySteps.map((step, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-[#0F1115] border border-[#2A2D35] rounded-xs flex items-start gap-3 text-white"
                    >
                      <div className="w-6 h-6 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-500/50 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                        {idx + 1}
                      </div>
                      <div className="text-xs leading-relaxed text-[#E0E0E6]">{step}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* MODAL FOOTER */}
        <div className="px-4 py-2.5 bg-[#161920] border-t border-[#2A2D35] flex items-center justify-between gap-3 text-xs font-mono">
          <div className="text-[#8A8D98] text-[11px] hidden sm:block">
            Arduino Uno R3 és MB-102 Próbapanel automatikus kapcsolási szintézis
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-[#1A1D24] hover:bg-[#2A2D35] text-white border border-[#3A3F4B] rounded-xs font-bold shadow-[2px_2px_0px_#000] cursor-pointer ml-auto"
          >
            Bezárás
          </button>
        </div>
      </div>
    </div>
  );
};
