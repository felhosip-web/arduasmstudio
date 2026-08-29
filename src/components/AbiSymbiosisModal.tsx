import React, { useState } from 'react';
import { X, Code, Play, CheckCircle2, AlertTriangle, Blocks } from 'lucide-react';
import { parseCHeader, generateCWrapper, generateAsmCallBlock, ParsedFunction } from '../utils/cHeaderParser';
import { BlockDefinition } from '../types';
import { BLOCK_DEFINITIONS } from '../data/blockDefinitions';

interface AbiSymbiosisModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCustomBlockAdded: (newBlockId: string) => void;
}

export function AbiSymbiosisModal({ isOpen, onClose, onCustomBlockAdded }: AbiSymbiosisModalProps) {
  const [headerCode, setHeaderCode] = useState<string>('void my_c_function(uint8_t data);\n');
  const [parsedFunctions, setParsedFunctions] = useState<ParsedFunction[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Custom wrapping inputs
  const [instanceName, setInstanceName] = useState<string>('');

  if (!isOpen) return null;

  const handleParse = () => {
    try {
      setError(null);
      const funcs = parseCHeader(headerCode);
      setParsedFunctions(funcs);
      if (funcs.length === 0) {
        setError('Nem található érvényes C függvény deklaráció a kódban.');
      }
    } catch (err: any) {
      setError(err.message || 'Hiba a feldolgozás során.');
    }
  };

  const generateBlock = (func: ParsedFunction) => {
    const newBlockId = `custom_abi_${func.name}`;

    // Check if block already exists
    if (BLOCK_DEFINITIONS.find(b => b.id === newBlockId)) {
        alert("Ez a blokk már hozzá lett adva!");
        return;
    }

    const wrapperCode = generateCWrapper(func, '', instanceName);
    const asmCode = generateAsmCallBlock(func);

    const newBlock: BlockDefinition = {
      id: newBlockId,
      type: 'io', // General category
      name: `Call: ${func.name}`,
      category: 'I/O',
      description: `Assembly hívás a(z) ${func.name} C függvényhez.`,
      color: '#0ea5e9',
      parameters: func.args.map(a => ({
          name: a.name,
          type: 'text',
          defaultValue: '0x00',
          label: `${a.name} (${a.assignedRegister})`
      })),
      defaultCycles: 10 + (func.args.length * 2), // Approximate
      codeTemplate: (params) => {
          let injectedAsm = asmCode;
          // Extremely basic param injection for visual block
          func.args.forEach((a, idx) => {
              if (params && params[a.name]) {
                  injectedAsm = injectedAsm.replace(`0x00 ; TODO: Állítsd be a ${a.name} (${a.type}) értékét`, `${params[a.name]}`);
                  // Also handle 16 bit
                  injectedAsm = injectedAsm.replace(`low(0x0000)  ; ${a.name} (Low)`, `low(${params[a.name]})`);
                  injectedAsm = injectedAsm.replace(`high(0x0000) ; ${a.name} (High)`, `high(${params[a.name]})`);
              }
          });
          return injectedAsm;
      },
      tags: ['abi', 'c++', 'wrapper']
    };

    BLOCK_DEFINITIONS.push(newBlock);
    onCustomBlockAdded(newBlockId);
    alert(`Új drag&drop blokk sikeresen hozzáadva: ${func.name}`);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-[#1A1D24] border border-[#2A2D35] rounded-xl shadow-2xl w-full max-w-5xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#2A2D35] bg-[#161920] rounded-t-xl shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-pink-500/20 text-pink-400 rounded-lg">
              <Code className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold font-mono text-white">ABI / C-Assembly Szimbiózis</h2>
              <p className="text-sm text-gray-400 font-mono">Dinamikus C++ Header & ASM Blokk Generátor</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-[#2A2D35] rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6 flex flex-col lg:flex-row gap-6">

            {/* Left Column: Input */}
            <div className="flex-1 flex flex-col gap-4">
                <div className="bg-[#0F1115] border border-[#2A2D35] p-4 rounded-lg">
                    <h3 className="text-white font-medium mb-2 flex items-center gap-2">
                        1. Illeszd be a C/C++ Header fájl tartalmát
                    </h3>
                    <p className="text-xs text-gray-400 mb-4">Pl. egy Arduino Library (.h) függvényei, amiket Assembly-ből akarsz hívni.</p>

                    <textarea
                        className="w-full h-64 bg-[#161920] border border-[#2A2D35] rounded font-mono text-sm p-3 text-green-400 focus:outline-none focus:border-pink-500"
                        value={headerCode}
                        onChange={(e) => setHeaderCode(e.target.value)}
                        spellCheck={false}
                    />

                    <div className="mt-4 flex gap-4 items-center">
                        <div className="flex-1">
                            <label className="text-xs text-gray-400 block mb-1">Globális példány neve (opcionális, C++ class híváshoz, pl. "lcd")</label>
                            <input
                                type="text"
                                className="w-full bg-[#161920] border border-[#2A2D35] rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:border-pink-500"
                                value={instanceName}
                                onChange={(e) => setInstanceName(e.target.value)}
                                placeholder="pl: lcd, Wire, Serial"
                            />
                        </div>
                        <button
                            onClick={handleParse}
                            className="mt-5 px-6 py-2 bg-pink-600 hover:bg-pink-500 text-white font-medium rounded-lg flex items-center gap-2 transition-colors"
                        >
                            <Play className="w-4 h-4" /> Elemzés és Generálás
                        </button>
                    </div>

                    {error && (
                        <div className="mt-4 p-3 bg-red-900/20 border border-red-900/50 rounded flex items-start gap-3">
                            <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                            <p className="text-sm text-red-400">{error}</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Right Column: Results */}
            <div className="flex-1 flex flex-col gap-4">
                <div className="bg-[#0F1115] border border-[#2A2D35] p-4 rounded-lg flex-1">
                    <h3 className="text-white font-medium mb-4 flex items-center gap-2">
                        2. Értelmezett ABI Regiszter Térkép és Blokk Generálás
                    </h3>

                    {parsedFunctions.length === 0 ? (
                        <div className="h-48 flex items-center justify-center border-2 border-dashed border-[#2A2D35] rounded-lg">
                            <p className="text-gray-500 text-sm">Futtasd az elemzést az eredmények megtekintéséhez.</p>
                        </div>
                    ) : (
                        <div className="space-y-6 overflow-y-auto max-h-[60vh] pr-2 custom-scrollbar">
                            {parsedFunctions.map((func, idx) => (
                                <div key={idx} className="bg-[#161920] border border-[#2A2D35] rounded-lg overflow-hidden">
                                    <div className="bg-[#2A2D35]/50 px-4 py-2 border-b border-[#2A2D35] flex justify-between items-center">
                                        <div className="font-mono text-sm text-green-400">
                                            <span className="text-pink-400">{func.returnType}</span> {func.name}
                                        </div>
                                        <button
                                            onClick={() => generateBlock(func)}
                                            className="px-3 py-1 bg-[#10B981]/20 hover:bg-[#10B981]/30 text-[#10B981] text-xs font-medium rounded flex items-center gap-1 transition-colors border border-[#10B981]/30"
                                        >
                                            <Blocks className="w-3 h-3" /> Blokk Létrehozása
                                        </button>
                                    </div>
                                    <div className="p-4">
                                        {func.args.length > 0 ? (
                                            <table className="w-full text-left text-sm font-mono">
                                                <thead>
                                                    <tr className="text-gray-500 border-b border-[#2A2D35]">
                                                        <th className="pb-2 font-normal">Paraméter</th>
                                                        <th className="pb-2 font-normal">Típus</th>
                                                        <th className="pb-2 font-normal">Méret</th>
                                                        <th className="pb-2 font-normal text-pink-400">Regiszter (AVR ABI)</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {func.args.map((arg, aidx) => (
                                                        <tr key={aidx} className="border-b border-[#2A2D35]/50 last:border-0">
                                                            <td className="py-2 text-gray-300">{arg.name}</td>
                                                            <td className="py-2 text-cyan-400">{arg.type}</td>
                                                            <td className="py-2 text-yellow-400">{arg.sizeBytes} byte</td>
                                                            <td className="py-2">
                                                                <span className="px-2 py-0.5 bg-pink-500/10 text-pink-400 rounded border border-pink-500/20">
                                                                    {arg.assignedRegister}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        ) : (
                                            <p className="text-gray-500 text-sm italic">Nincsenek paraméterek.</p>
                                        )}

                                        <div className="mt-4 bg-[#0F1115] p-3 rounded border border-[#2A2D35]">
                                            <p className="text-xs text-gray-500 mb-2">Generált Wrapper:</p>
                                            <pre className="text-xs font-mono text-gray-400 overflow-x-auto">
                                                {generateCWrapper(func, '', instanceName)}
                                            </pre>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}
