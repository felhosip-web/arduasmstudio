import React, { useState } from 'react';
import { Cpu, X, ListTree, Code2, Zap, Calculator } from 'lucide-react';
import { BlockDefinition } from '../types';
import { BLOCK_DEFINITIONS } from '../data/blockDefinitions';

interface PointerStudioModalProps {
  onClose: () => void;
  onInsertBlock: (def: BlockDefinition, params: Record<string, any>) => void;
}

export const PointerStudioModal: React.FC<PointerStudioModalProps> = ({
  onClose,
  onInsertBlock
}) => {
  const [activeTab, setActiveTab] = useState<'init' | 'read' | 'write' | 'offset' | 'arithmetic'>('init');
  const [selectedReg, setSelectedReg] = useState<'X' | 'Y' | 'Z'>('Z');
  const [address, setAddress] = useState<number>(0x0100);
  const [mode, setMode] = useState<'NORMAL' | 'POST_INC' | 'PRE_DEC' | 'FLASH'>('NORMAL');
  const [offset, setOffset] = useState<number>(0);
  const [arithmeticOp, setArithmeticOp] = useState<'ADD' | 'SUB'>('ADD');
  const [arithmeticVal, setArithmeticVal] = useState<number>(1);

  const handleInsert = () => {
    let type = '';
    let params: Record<string, any> = {};

    if (activeTab === 'init') {
      type = 'pointer_init';
      params = { reg: selectedReg, address };
    } else if (activeTab === 'read') {
      type = 'pointer_read_deref';
      params = { reg: selectedReg, destReg: 'r16', mode };
    } else if (activeTab === 'write') {
      type = 'pointer_write_deref';
      params = { reg: selectedReg, srcReg: 'r16', mode: mode === 'FLASH' ? 'NORMAL' : mode };
    } else if (activeTab === 'offset') {
      type = 'pointer_offset_indexed';
      params = { dir: 'READ', reg: selectedReg === 'X' ? 'Y' : selectedReg, dataReg: 'r16', offset };
    } else if (activeTab === 'arithmetic') {
      type = 'pointer_arithmetic';
      params = { reg: selectedReg, op: arithmeticOp, val: arithmeticVal };
    }

    if (type && BLOCK_DEFINITIONS[type]) {
      onInsertBlock(BLOCK_DEFINITIONS[type], params);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#161920] border border-[#2A2D35] rounded-lg shadow-2xl max-w-5xl w-full flex flex-col overflow-hidden max-h-[90vh]">
        <div className="flex items-center justify-between p-4 border-b border-[#2A2D35] bg-[#0F1115]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-violet-500/20 text-violet-400 rounded-md border border-violet-500/30">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-wide">
                C Pointer & AVR Indirekt Memóriacímzés
              </h2>
              <p className="text-xs text-gray-400">
                X/Y/Z Index Regiszterek, Dereferencia, Aritmetika és Memóriatérkép
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 flex gap-4 p-4 overflow-hidden min-h-[400px]">
          <div className="flex-1 flex flex-col gap-4">

            <div className="flex gap-4">
              <div className="bg-[#121212] p-3 rounded-lg border border-gray-700 flex-1">
                <label className="text-xs text-gray-400 font-mono mb-2 block">Index Regiszter</label>
                <div className="flex gap-2">
                  {['X', 'Y', 'Z'].map(r => (
                    <button
                      key={r}
                      onClick={() => setSelectedReg(r as any)}
                      className={`flex-1 py-1 text-sm rounded border font-mono font-bold transition-colors ${selectedReg === r ? 'bg-violet-600 border-violet-400 text-white' : 'bg-[#1A1D24] border-gray-700 text-gray-400'}`}
                    >
                      {r} (r{r === 'X' ? '27:26' : r === 'Y' ? '29:28' : '31:30'})
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-[#121212] p-3 rounded-lg border border-gray-700 flex-1">
                <label className="text-xs text-gray-400 font-mono mb-2 block">Művelet / Blokk Típusa</label>
                <div className="flex flex-wrap gap-2 text-xs font-mono">
                  {['init', 'read', 'write', 'offset', 'arithmetic'].map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab as any)}
                      className={`px-3 py-1 rounded border border-gray-700 transition-colors uppercase ${activeTab === tab ? 'bg-violet-600 text-white' : 'text-gray-400 hover:text-white'}`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex-1 bg-[#121212] border border-gray-700 rounded-lg p-4 overflow-y-auto">
              <h3 className="text-xs font-bold text-gray-400 mb-3 font-mono flex items-center gap-2">
                <ListTree className="w-4 h-4" /> SRAM / Flash Térkép
              </h3>

              <div className="grid grid-cols-8 gap-1">
                {Array.from({ length: 32 }).map((_, i) => {
                  const cellAddr = (address & 0xFFE0) + i; // 32 byte ablak
                  const isPointerPos = cellAddr === address;

                  // Simulate addressing mode logic
                  let highlightType = '';
                  if (activeTab === 'read' || activeTab === 'write') {
                    if (mode === 'POST_INC' && cellAddr === address) highlightType = 'bg-blue-900/40 border-blue-500 text-blue-300';
                    else if (mode === 'PRE_DEC' && cellAddr === address - 1) highlightType = 'bg-red-900/40 border-red-500 text-red-300';
                  } else if (activeTab === 'offset') {
                    if (cellAddr === address + offset) highlightType = 'bg-amber-900/40 border-amber-500 text-amber-300';
                  } else if (activeTab === 'arithmetic') {
                     if (arithmeticOp === 'ADD' && cellAddr === address + arithmeticVal) highlightType = 'bg-emerald-900/40 border-emerald-500 text-emerald-300';
                     if (arithmeticOp === 'SUB' && cellAddr === address - arithmeticVal) highlightType = 'bg-rose-900/40 border-rose-500 text-rose-300';
                  }

                  return (
                    <div
                      key={i}
                      className={`relative flex flex-col items-center justify-center p-2 rounded border font-mono text-xs ${
                        isPointerPos ? 'bg-violet-900/50 border-violet-500 text-white' :
                        highlightType ? highlightType :
                        'bg-[#1A1D24] border-[#3A3F4B] text-gray-500'
                      }`}
                    >
                      <span className="text-[9px] opacity-70 mb-1">0x{cellAddr.toString(16).padStart(4, '0').toUpperCase()}</span>
                      <span>00</span>
                      {isPointerPos && (
                        <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-violet-400 font-bold text-[10px] whitespace-nowrap z-10 bg-[#161920] px-1 rounded border border-violet-900">
                          {selectedReg} PTR
                        </div>
                      )}
                      {highlightType && !isPointerPos && (
                        <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 opacity-70 font-bold text-[10px] whitespace-nowrap">
                          TARGET
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="mt-10 pt-4 border-t border-gray-700 grid grid-cols-2 gap-4">
                 {(activeTab === 'read' || activeTab === 'write') && (
                    <div className="flex flex-col gap-2">
                       <label className="text-xs text-gray-400 font-mono">Címzési Mód (Deref)</label>
                       <select
                          value={mode}
                          onChange={e => setMode(e.target.value as any)}
                          className="bg-[#121212] border border-gray-700 text-sm p-2 rounded text-white outline-none"
                       >
                          <option value="NORMAL">SRAM: Normál (r, PTR)</option>
                          <option value="POST_INC">SRAM: Post-inkrement (r, PTR+)</option>
                          <option value="PRE_DEC">SRAM: Pre-dekrement (r, -PTR)</option>
                          {activeTab === 'read' && selectedReg === 'Z' && <option value="FLASH">Flash: LPM (Csak Z)</option>}
                       </select>
                    </div>
                 )}
                 {activeTab === 'offset' && (
                    <div className="flex flex-col gap-2">
                       <label className="text-xs text-gray-400 font-mono">Eltolás q (0-63)</label>
                       <input
                          type="range" min="0" max="63" value={offset} onChange={e => setOffset(parseInt(e.target.value))}
                          className="w-full accent-violet-500"
                       />
                       <span className="text-xs text-center text-white">+{offset} Bájt</span>
                    </div>
                 )}
                 {activeTab === 'arithmetic' && (
                    <div className="flex flex-col gap-2">
                       <label className="text-xs text-gray-400 font-mono">Aritmetika (0-63)</label>
                       <div className="flex gap-2">
                         <select value={arithmeticOp} onChange={e => setArithmeticOp(e.target.value as any)} className="bg-[#121212] border border-gray-700 text-sm p-2 rounded text-white outline-none">
                            <option value="ADD">+ (ADIW)</option>
                            <option value="SUB">- (SBIW)</option>
                         </select>
                         <input type="number" min="0" max="63" value={arithmeticVal} onChange={e => setArithmeticVal(parseInt(e.target.value))} className="bg-[#121212] border border-gray-700 text-sm p-2 rounded w-full text-white outline-none" />
                       </div>
                    </div>
                 )}
                 {activeTab === 'init' && (
                    <div className="flex flex-col gap-2">
                       <label className="text-xs text-gray-400 font-mono">Kezdő Cím (Hexa/Dec)</label>
                       <input type="text" value={"0x" + address.toString(16).toUpperCase()} onChange={e => {
                         const val = parseInt(e.target.value, 16);
                         if(!isNaN(val)) setAddress(val);
                       }} className="bg-[#121212] border border-gray-700 text-sm p-2 rounded text-white outline-none" />
                    </div>
                 )}
              </div>
            </div>
          </div>

          <div className="w-80 border border-gray-700 rounded-lg p-4 text-white flex flex-col gap-4 bg-[#121212]">
            <h3 className="text-sm font-bold text-gray-400 mb-2 font-mono flex items-center gap-2">
              <Calculator className="w-4 h-4" /> Kód Generátor
            </h3>

            <div className="flex-1 flex flex-col gap-2">
              <label className="text-[10px] text-gray-500 font-mono uppercase tracking-wider flex items-center gap-1"><Code2 className="w-3 h-3 text-sky-400"/> C Nyelvi Ekvivalens</label>
              <div className="bg-[#1A1D24] p-3 rounded border border-[#2A2D35] font-mono text-xs text-sky-300 min-h-[60px] shadow-inner">
                {activeTab === 'init' && `uint8_t *ptr_${selectedReg} = (uint8_t *)0x${address.toString(16).padStart(4, '0').toUpperCase()};`}
                {activeTab === 'read' && mode === 'NORMAL' && `uint8_t r16 = *ptr_${selectedReg};`}
                {activeTab === 'read' && mode === 'POST_INC' && `uint8_t r16 = *ptr_${selectedReg}++;`}
                {activeTab === 'read' && mode === 'PRE_DEC' && `uint8_t r16 = *(--ptr_${selectedReg});`}
                {activeTab === 'read' && mode === 'FLASH' && `uint8_t r16 = pgm_read_byte(ptr_Z);`}

                {activeTab === 'write' && mode === 'NORMAL' && `*ptr_${selectedReg} = r16;`}
                {activeTab === 'write' && mode === 'POST_INC' && `*ptr_${selectedReg}++ = r16;`}
                {activeTab === 'write' && mode === 'PRE_DEC' && `*(--ptr_${selectedReg}) = r16;`}

                {activeTab === 'offset' && `uint8_t r16 = ptr_${selectedReg === 'X' ? 'Y' : selectedReg}[${offset}];`}

                {activeTab === 'arithmetic' && arithmeticOp === 'ADD' && `ptr_${selectedReg} += ${arithmeticVal};`}
                {activeTab === 'arithmetic' && arithmeticOp === 'SUB' && `ptr_${selectedReg} -= ${arithmeticVal};`}
              </div>
            </div>

            <div className="flex-1 flex flex-col gap-2">
              <label className="text-[10px] text-gray-500 font-mono uppercase tracking-wider flex items-center gap-1"><Zap className="w-3 h-3 text-emerald-400"/> AVR Assembly</label>
              <div className="bg-[#1A1D24] p-3 rounded border border-[#2A2D35] font-mono text-xs text-emerald-300 min-h-[60px] shadow-inner">
                {activeTab === 'init' && (
                  <>
                    ldi r{selectedReg === 'X' ? '26' : selectedReg === 'Y' ? '28' : '30'}, 0x{address.toString(16).padStart(4, '0').slice(-2).toUpperCase()}<br/>
                    ldi r{selectedReg === 'X' ? '27' : selectedReg === 'Y' ? '29' : '31'}, 0x{address.toString(16).padStart(4, '0').slice(0, 2).toUpperCase()}
                  </>
                )}

                {activeTab === 'read' && mode === 'NORMAL' && `ld r16, ${selectedReg}`}
                {activeTab === 'read' && mode === 'POST_INC' && `ld r16, ${selectedReg}+`}
                {activeTab === 'read' && mode === 'PRE_DEC' && `ld r16, -${selectedReg}`}
                {activeTab === 'read' && mode === 'FLASH' && `lpm r16, Z`}

                {activeTab === 'write' && mode === 'NORMAL' && `st ${selectedReg}, r16`}
                {activeTab === 'write' && mode === 'POST_INC' && `st ${selectedReg}+, r16`}
                {activeTab === 'write' && mode === 'PRE_DEC' && `st -${selectedReg}, r16`}

                {activeTab === 'offset' && `ldd r16, ${selectedReg === 'X' ? 'Y' : selectedReg}+${offset}`}

                {activeTab === 'arithmetic' && `${arithmeticOp === 'ADD' ? 'adiw' : 'sbiw'} r${selectedReg === 'X' ? '26' : selectedReg === 'Y' ? '28' : '30'}, ${arithmeticVal}`}
              </div>
            </div>

            <button
              onClick={handleInsert}
              className="mt-4 w-full bg-violet-600 hover:bg-violet-500 text-white font-bold py-3 px-4 rounded transition-colors shadow-lg cursor-pointer"
            >
              Beállítás Beillesztése
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
