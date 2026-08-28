import React, { useState } from 'react';
import {
  Boxes,
  Database,
  Layers,
  Code,
  HardDrive,
  Hash,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { DataStructState, SimulationState, MemoryArrayInstance, MemoryStructInstance, MemoryClassInstance } from '../types';

interface DataStructPanelProps {
  dataStructState?: DataStructState;
  simulation: SimulationState;
}

export const DataStructPanel: React.FC<DataStructPanelProps> = ({ dataStructState, simulation }) => {
  const ds: DataStructState = (dataStructState || simulation.dataStructState || {
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
  }) as DataStructState;

  const arrayList: MemoryArrayInstance[] = Object.values(ds.arrays || {});
  const structList: MemoryStructInstance[] = Object.values(ds.structs || {});
  const objectList: MemoryClassInstance[] = Object.values(ds.objects || {});

  const [activeTab, setActiveTab] = useState<'arrays' | 'structs' | 'objects'>('arrays');

  return (
    <div id="data-struct-oop-panel" className="space-y-3.5 p-3.5 bg-[#161920] border border-[#2A2D35] rounded-xs shadow-[2px_2px_0px_#000]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#2A2D35] pb-2.5">
        <div className="flex items-center gap-2">
          <Boxes className="w-4 h-4 text-sky-400" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-[#E0E0E6]">
            Adatstruktúrák & OOP Objektum Motor (C/C++ & ASM)
          </h4>
        </div>
        <div className="flex items-center gap-1 bg-[#12141A] p-0.5 rounded-xs border border-[#2A2D35]">
          <button
            onClick={() => setActiveTab('arrays')}
            className={`px-2 py-0.5 text-[10px] font-mono font-bold uppercase rounded-xs transition-colors ${
              activeTab === 'arrays' ? 'bg-sky-500 text-black' : 'text-[#8A8D98] hover:text-[#E0E0E6]'
            }`}
          >
            Tömbök ({Object.keys(ds.arrays).length})
          </button>
          <button
            onClick={() => setActiveTab('structs')}
            className={`px-2 py-0.5 text-[10px] font-mono font-bold uppercase rounded-xs transition-colors ${
              activeTab === 'structs' ? 'bg-amber-500 text-black' : 'text-[#8A8D98] hover:text-[#E0E0E6]'
            }`}
          >
            Struktúrák ({Object.keys(ds.structs).length})
          </button>
          <button
            onClick={() => setActiveTab('objects')}
            className={`px-2 py-0.5 text-[10px] font-mono font-bold uppercase rounded-xs transition-colors ${
              activeTab === 'objects' ? 'bg-emerald-500 text-black' : 'text-[#8A8D98] hover:text-[#E0E0E6]'
            }`}
          >
            OOP ({Object.keys(ds.objects).length})
          </button>
        </div>
      </div>

      {/* Last Operation Status Bar */}
      <div className="p-2.5 bg-[#12141A] border border-[#2A2D35] rounded-xs flex items-center justify-between text-xs font-mono">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
          <span className="text-[#8A8D98] text-[10px] uppercase font-bold">Művelet:</span>
          <span className="text-sky-300 text-[11px]">{ds.lastOperation || 'Várakozás...'}</span>
        </div>
      </div>

      {/* TAB 1: ARRAYS (FLASH / SRAM) */}
      {activeTab === 'arrays' && (
        <div className="space-y-3 font-mono">
          {arrayList.map((arr) => (
            <div key={arr.name} className="p-3 bg-[#12141A] border border-[#2A2D35] rounded-xs space-y-2">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-amber-400">{arr.name}[]</span>
                  <span className={`px-1.5 py-0.2 text-[9px] font-bold uppercase rounded-xs border ${
                    arr.memoryType === 'flash'
                      ? 'bg-sky-950 text-sky-300 border-sky-500/40'
                      : 'bg-emerald-950 text-emerald-300 border-emerald-500/40'
                  }`}>
                    {arr.memoryType.toUpperCase()} (LPM / ST)
                  </span>
                </div>
                <span className="text-[10px] text-[#8A8D98]">
                  Cím: 0x{arr.baseAddress.toString(16).toUpperCase().padStart(4, '0')} | Méret: {arr.size} elem
                </span>
              </div>

              {/* Elements grid */}
              <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5 text-[10px]">
                {arr.data.map((val, idx) => {
                  const isLastAccessed = arr.lastAccessedIndex === idx;
                  return (
                    <div
                      key={idx}
                      className={`p-1.5 text-center rounded-xs border transition-all ${
                        isLastAccessed
                          ? 'bg-sky-500/20 border-sky-400 text-sky-200 font-bold'
                          : 'bg-[#181B22] border-[#2A2D35] text-[#8A8D98]'
                      }`}
                    >
                      <div className="text-[8px] text-[#8A8D98]">[{idx}]</div>
                      <div className="text-[#E0E0E6] font-bold">{val}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 2: STRUCTS (C STRUCT & AVR LDD/STD OFFSETS) */}
      {activeTab === 'structs' && (
        <div className="space-y-3 font-mono">
          {structList.map((st) => (
            <div key={st.name} className="p-3 bg-[#12141A] border border-[#2A2D35] rounded-xs space-y-2.5">
              <div className="flex items-center justify-between text-xs border-b border-[#2A2D35] pb-2">
                <div>
                  <span className="text-amber-400 font-bold">struct {st.structType} </span>
                  <span className="text-[#E0E0E6] font-bold">{st.name};</span>
                </div>
                <span className="text-[10px] text-sky-400">
                  Y mutató = 0x{st.baseAddress.toString(16).toUpperCase().padStart(4, '0')} (Összesen {st.totalSize} bájt)
                </span>
              </div>

              <div className="space-y-1.5">
                {st.fields.map((field) => (
                  <div
                    key={field.name}
                    className="p-2 bg-[#181B22] border border-[#2A2D35] rounded-xs flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="px-1.5 py-0.2 bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[9px] font-bold rounded-xs">
                        LDD/STD Y+{field.offset}
                      </span>
                      <span className="text-sky-300">{field.type}</span>
                      <span className="text-[#E0E0E6] font-bold">{field.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[#8A8D98] text-[10px]">Érték:</span>
                      <span className="text-emerald-400 font-bold bg-[#101217] px-2 py-0.5 rounded-xs border border-[#2A2D35]">
                        0x{field.value.toString(16).padStart(2, '0').toUpperCase()} ({field.value})
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 3: OOP OBJECTS & C++ ABI METHOD CALLS */}
      {activeTab === 'objects' && (
        <div className="space-y-3 font-mono">
          {objectList.map((obj) => (
            <div key={obj.id} className="p-3 bg-[#12141A] border border-[#2A2D35] rounded-xs space-y-2.5">
              <div className="flex items-center justify-between text-xs border-b border-[#2A2D35] pb-2">
                <div>
                  <span className="text-emerald-400 font-bold">class {obj.className} </span>
                  <span className="text-[#E0E0E6] font-bold">{obj.instanceName};</span>
                </div>
                <span className="text-[10px] text-amber-400">
                  'this' mutató (r25:r24) = 0x{obj.thisPointer.toString(16).toUpperCase().padStart(4, '0')}
                </span>
              </div>

              {/* Object state fields */}
              <div className="grid grid-cols-3 gap-2 text-xs">
                {Object.entries(obj.fields).map(([k, v]) => (
                  <div key={k} className="p-2 bg-[#181B22] border border-[#2A2D35] rounded-xs">
                    <span className="text-[9px] text-[#8A8D98] uppercase block">{k}:</span>
                    <span className="text-sky-300 font-bold">{String(v)}</span>
                  </div>
                ))}
              </div>

              {/* Methods list */}
              <div className="p-2 bg-[#101217] border border-[#2A2D35] rounded-xs space-y-1">
                <span className="text-[9px] text-[#8A8D98] uppercase font-bold block">
                  Elérhető C++ Osztály Metódusok (rcall mangled címkék):
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {obj.methods.map((method) => {
                    const isLastCalled = obj.lastMethodCalled === method;
                    return (
                      <span
                        key={method}
                        className={`px-2 py-0.5 text-[10px] rounded-xs border font-mono ${
                          isLastCalled
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 font-bold'
                            : 'bg-[#181B22] text-[#8A8D98] border-[#2A2D35]'
                        }`}
                      >
                        {obj.className}::{method}()
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
