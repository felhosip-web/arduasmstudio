import React, { useState } from 'react';
import {
  Network,
  Cpu,
  Radio,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Sliders,
  Send,
  Zap,
  Wifi,
  Layers,
  Activity,
  Signal,
} from 'lucide-react';
import { MasterSlaveState, SimulationState, NRF24SlaveNode } from '../types';

interface MasterSlavePanelProps {
  masterSlaveState?: MasterSlaveState;
  simulation: SimulationState;
}

export const MasterSlavePanel: React.FC<MasterSlavePanelProps> = ({ masterSlaveState, simulation }) => {
  const ms: MasterSlaveState = masterSlaveState || simulation.masterSlaveState || {
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
  };

  const [activeTab, setActiveTab] = useState<'I2C' | 'SPI' | 'NRF24'>(ms.activeProtocol || 'I2C');
  const [selectedI2cIndex, setSelectedI2cIndex] = useState<number>(0);
  const [selectedNrfIndex, setSelectedNrfIndex] = useState<number>(0);

  const selectedI2cSlave = ms.i2cSlaves[selectedI2cIndex] || ms.i2cSlaves[0];
  const nrfSlavesList: NRF24SlaveNode[] = ms.nrfSlaves || [
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
  ];
  const selectedNrfSlave = nrfSlavesList[selectedNrfIndex] || nrfSlavesList[0];

  return (
    <div id="master-slave-network-panel" className="space-y-3.5 p-3.5 bg-[#161920] border border-[#2A2D35] rounded-xs shadow-[2px_2px_0px_#000]">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#2A2D35] pb-2.5">
        <div className="flex items-center gap-2">
          <Network className="w-4 h-4 text-emerald-400" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-[#E0E0E6]">
            Master-Slave Busz & Több-Csomópontos Hálózat
          </h4>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 text-[10px] font-mono font-bold uppercase rounded-xs border ${
            ms.role === 'MASTER'
              ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40'
              : 'bg-indigo-950/60 text-indigo-300 border-indigo-500/40'
          }`}>
            Aktív Szerepkör: {ms.role}
          </span>
          <span className="text-[10px] font-mono text-[#8A8D98] bg-[#12141A] px-2 py-0.5 rounded-xs border border-[#2A2D35]">
            Csomagok: <strong className="text-[#E0E0E6]">{ms.totalPacketsExchanged}</strong>
          </span>
        </div>
      </div>

      {/* Protocol Selector Tabs */}
      <div className="grid grid-cols-3 gap-1.5 p-1 bg-[#12141A] border border-[#2A2D35] rounded-xs text-xs font-mono">
        <button
          onClick={() => setActiveTab('I2C')}
          className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xs font-bold transition-all ${
            activeTab === 'I2C'
              ? 'bg-purple-950/70 text-purple-300 border border-purple-500/50 shadow-sm'
              : 'text-[#8A8D98] hover:text-[#E0E0E6] hover:bg-[#181B22]'
          }`}
        >
          <Cpu className="w-3.5 h-3.5" />
          <span>I2C / TWI ({ms.i2cSlaves.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('SPI')}
          className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xs font-bold transition-all ${
            activeTab === 'SPI'
              ? 'bg-amber-950/70 text-amber-300 border border-amber-500/50 shadow-sm'
              : 'text-[#8A8D98] hover:text-[#E0E0E6] hover:bg-[#181B22]'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>SPI Busz ({ms.spiSlaves.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('NRF24')}
          className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xs font-bold transition-all ${
            activeTab === 'NRF24'
              ? 'bg-orange-950/70 text-orange-300 border border-orange-500/50 shadow-sm'
              : 'text-[#8A8D98] hover:text-[#E0E0E6] hover:bg-[#181B22]'
          }`}
        >
          <Wifi className="w-3.5 h-3.5" />
          <span>NRF24 2.4GHz ({nrfSlavesList.length})</span>
        </button>
      </div>

      {/* Bus Status & Packet Flow Card */}
      <div className="p-3 bg-[#12141A] border border-[#2A2D35] rounded-xs space-y-2.5">
        <div className="flex items-center justify-between text-[11px] font-mono">
          <span className="text-[#8A8D98] font-bold uppercase">
            {activeTab === 'I2C' ? 'I2C Busz Állapot & Forgalom' : activeTab === 'SPI' ? 'SPI Teljes Duplex Állapot' : 'NRF24 ShockBurst™ RF Csatorna'}
          </span>
          <span className="text-emerald-400 font-bold flex items-center gap-1.5 text-[10px]">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            {activeTab === 'I2C' ? `I2C Mód: ${ms.i2cRole}` : activeTab === 'SPI' ? `SPI Mód: ${ms.spiRole}` : `NRF24 Ch ${ms.nrfChannel || 76} (2.${ms.nrfChannel || 76} GHz)`}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
          <div className="p-2 bg-[#181B22] border border-[#2A2D35] rounded-xs">
            <div className="text-[9px] text-[#8A8D98] uppercase font-bold flex items-center gap-1 mb-1">
              <ArrowRight className="w-3 h-3 text-sky-400" />
              <span>Master Utolsó Parancsa (TX)</span>
            </div>
            <div className="text-sky-300 font-bold truncate text-[11px]">
              {ms.lastMasterCommand || 'IDLE'}
            </div>
          </div>

          <div className="p-2 bg-[#181B22] border border-[#2A2D35] rounded-xs">
            <div className="text-[9px] text-[#8A8D98] uppercase font-bold flex items-center gap-1 mb-1">
              <ArrowLeft className="w-3 h-3 text-emerald-400" />
              <span>Slave Válasza / Auto-ACK (RX)</span>
            </div>
            <div className="text-emerald-300 font-bold truncate text-[11px]">
              {ms.lastSlaveResponse || 'Nincs aktív válasz'}
            </div>
          </div>
        </div>
      </div>

      {/* TAB 1: I2C BUS CONTENT */}
      {activeTab === 'I2C' && (
        <div className="space-y-3">
          {/* I2C Multi-Slave Architecture Grid */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[10px] font-mono text-[#8A8D98] uppercase font-bold">
              <span>Csatlakoztatott I2C Slave Csomópontok ({ms.i2cSlaves.length}):</span>
              <span>Kiválasztott: {selectedI2cSlave?.addressHex}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {ms.i2cSlaves.map((slave, idx) => {
                const isSelected = idx === selectedI2cIndex;
                const isTarget = ms.activeTargetSlave?.toLowerCase() === slave.addressHex.toLowerCase();
                return (
                  <button
                    key={slave.addressHex}
                    onClick={() => setSelectedI2cIndex(idx)}
                    className={`p-2 text-left rounded-xs border transition-all ${
                      isSelected
                        ? 'bg-[#1C202A] border-purple-500 text-[#E0E0E6] shadow-[2px_2px_0px_#000]'
                        : 'bg-[#12141A] border-[#2A2D35] text-[#8A8D98] hover:border-[#3E424D] hover:text-[#E0E0E6]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono font-bold text-xs text-amber-400">{slave.addressHex}</span>
                      {isTarget && (
                        <span className="px-1.5 py-0.2 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[9px] font-mono rounded-xs">
                          AKTÍV
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] font-sans font-medium text-slate-200 truncate">{slave.name}</div>
                    <div className="text-[9px] font-mono text-[#8A8D98] mt-1">
                      Regiszterek: {Object.keys(slave.registers).length} db
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected Slave Registers Map */}
          {selectedI2cSlave && (
            <div className="p-3 bg-[#101217] border border-[#2A2D35] rounded-xs space-y-2 font-mono">
              <div className="flex items-center justify-between text-xs text-[#E0E0E6]">
                <span className="font-bold flex items-center gap-1.5 text-purple-400">
                  <Cpu className="w-3.5 h-3.5" />
                  {selectedI2cSlave.name} ({selectedI2cSlave.addressHex}) Belső Regisztertábla:
                </span>
                <span className="text-[10px] text-emerald-400">ACK Kész</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[11px]">
                {Object.entries(selectedI2cSlave.registers).map(([reg, val]) => (
                  <div key={reg} className="p-1.5 bg-[#181B22] border border-[#2A2D35] rounded-xs flex items-center justify-between">
                    <span className="text-[#8A8D98] text-[10px]">Reg[{reg}]:</span>
                    <span className="font-bold text-sky-300">
                      0x{Number(val).toString(16).padStart(2, '0').toUpperCase()} ({val})
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: SPI BUS CONTENT */}
      {activeTab === 'SPI' && (
        <div className="p-3 bg-[#12141A] border border-[#2A2D35] rounded-xs space-y-2">
          <div className="flex items-center justify-between text-[11px] font-mono">
            <span className="text-[#8A8D98] font-bold uppercase flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-amber-400" />
              SPI Busz & Periféria Csomópontok ({ms.spiRole}):
            </span>
            <span className="text-amber-400 text-[10px] font-bold">MISO / MOSI / SCK / SS</span>
          </div>

          <div className="space-y-1.5">
            {ms.spiSlaves.map((spiNode) => {
              const isSsActive = simulation.pinStates[spiNode.ssPin as any]?.value === 0;
              return (
                <div
                  key={spiNode.id}
                  className="p-2.5 bg-[#181B22] border border-[#2A2D35] rounded-xs flex flex-wrap items-center justify-between gap-2 text-xs font-mono"
                >
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${isSsActive ? 'bg-emerald-400 animate-ping' : 'bg-[#3E424D]'}`} />
                    <span className="text-[#E0E0E6] font-sans font-medium">{spiNode.name}</span>
                  </div>
                  <div className="flex items-center gap-3 text-[11px]">
                    <span className="text-[#8A8D98]">SS Láb: <strong className="text-amber-400">D{spiNode.ssPin}</strong></span>
                    <span className="text-emerald-400">Válaszbájt (SPDR): <strong>0x{Number(spiNode.responseByte).toString(16).padStart(2, '0').toUpperCase()}</strong></span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: NRF24 2.4GHz WIRELESS MESH/HUB */}
      {activeTab === 'NRF24' && (
        <div className="space-y-3 font-mono">
          <div className="p-3 bg-[#12141A] border border-[#2A2D35] rounded-xs flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <Signal className="w-4 h-4 text-orange-400" />
              <div>
                <div className="text-[11px] font-bold text-orange-400">NRF24L01+ Rádiós Hub Konfiguráció</div>
                <div className="text-[10px] text-[#8A8D98]">Master Pipe: <strong className="text-[#E0E0E6]">{ms.nrfOwnPipe || '0xE8E8F0F0E1'}</strong></div>
              </div>
            </div>
            <div className="flex items-center gap-2 text-[10px]">
              <span className="px-2 py-0.5 bg-orange-950/60 text-orange-300 border border-orange-500/40 rounded-xs font-bold">
                2.4 GHz ISM Sáv
              </span>
              <span className="px-2 py-0.5 bg-[#181B22] text-slate-300 border border-[#2A2D35] rounded-xs">
                Auto-ACK: <strong className="text-emerald-400">BEKAPCSOLVA</strong>
              </span>
            </div>
          </div>

          {/* NRF24 Multi-Pipe Slaves Grid */}
          <div className="space-y-2">
            <div className="text-[10px] font-bold text-[#8A8D98] uppercase">
              Rádiós Slave Csomópontok (Pipe 1..5 Címzések):
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {nrfSlavesList.map((slave, idx) => {
                const isSelected = idx === selectedNrfIndex;
                const isTarget = ms.activeTargetSlave?.toLowerCase() === slave.pipeAddress.toLowerCase();
                return (
                  <button
                    key={slave.id}
                    onClick={() => setSelectedNrfIndex(idx)}
                    className={`p-2.5 text-left rounded-xs border transition-all ${
                      isSelected
                        ? 'bg-[#1C202A] border-orange-500 text-[#E0E0E6] shadow-[2px_2px_0px_#000]'
                        : 'bg-[#12141A] border-[#2A2D35] text-[#8A8D98] hover:border-[#3E424D] hover:text-[#E0E0E6]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-xs text-orange-400">Pipe {slave.pipeIndex}</span>
                      <span className="text-[9px] text-emerald-400 font-bold flex items-center gap-1">
                        <Signal className="w-2.5 h-2.5" />
                        {slave.rssi} dBm
                      </span>
                    </div>
                    <div className="text-[11px] font-sans font-medium text-slate-200 truncate">{slave.name}</div>
                    <div className="text-[9px] text-[#8A8D98] mt-1 font-mono">
                      Cím: <span className="text-amber-300">{slave.pipeAddress}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected NRF24 Slave Detail Card */}
          {selectedNrfSlave && (
            <div className="p-3 bg-[#101217] border border-[#2A2D35] rounded-xs space-y-2">
              <div className="flex items-center justify-between text-xs text-[#E0E0E6]">
                <span className="font-bold flex items-center gap-1.5 text-orange-400">
                  <Radio className="w-3.5 h-3.5" />
                  {selectedNrfSlave.name} (Pipe {selectedNrfSlave.pipeIndex}):
                </span>
                <span className="text-[10px] text-emerald-400 font-bold">Auto-ACK Online</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                <div className="p-2 bg-[#181B22] border border-[#2A2D35] rounded-xs">
                  <div className="text-[9px] text-[#8A8D98] uppercase mb-1">Utoljára Átvitt Payload:</div>
                  <div className="text-sky-300 font-bold truncate">
                    {selectedNrfSlave.lastReceivedPayload || 'Nincs adat'}
                  </div>
                </div>

                <div className="p-2 bg-[#181B22] border border-[#2A2D35] rounded-xs">
                  <div className="text-[9px] text-[#8A8D98] uppercase mb-1">Visszaküldött Auto-ACK Telemetria:</div>
                  <div className="text-emerald-300 font-bold truncate">
                    {selectedNrfSlave.ackPayload || 'ACK_OK'}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
