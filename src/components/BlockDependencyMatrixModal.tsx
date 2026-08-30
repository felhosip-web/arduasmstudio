import React, { useMemo } from 'react';
import { X, AlertCircle, GitMerge, Zap, ArrowRight, Layers, CheckCircle2, AlertTriangle, PlusCircle } from 'lucide-react';
import { ProgramBlock, BlockType } from '../types';
import { BLOCK_DEFINITIONS } from '../data/blockDefinitions';

interface Props {
  blocks: ProgramBlock[];
  setBlocks: React.Dispatch<React.SetStateAction<ProgramBlock[]>>;
  onClose: () => void;
}

export const BlockDependencyMatrixModal: React.FC<Props> = ({ blocks, setBlocks, onClose }) => {
  // Részletes hardveres inicializálás és folyamatelemzés (Dataflow & Láncolás)
  const analysis = useMemo(() => {
    const initializedPins = new Set<string>();
    const usedPins = new Map<string, { read: boolean; write: boolean; type: 'digital' | 'analog' | 'pwm' }>();
    const missingInits: { pin: string; neededFor: string; type: 'digital' | 'analog' | 'pwm'; insertAfterId?: string }[] = [];

    // Először megkeressük az összes inicializálást (setup scope)
    blocks.filter(b => b.scope === 'setup' && b.type === 'pin_mode').forEach(b => {
      if (b.parameters && b.parameters.pin) {
        initializedPins.add(b.parameters.pin.toString());
      }
    });

    // Majd elemezzük a loop-ban és a megszakításokban (vagy akárhol máshol) lévő használatot
    blocks.filter(b => b.scope !== 'setup').forEach(b => {
      const pinParam = b.parameters?.pin?.toString();

      if (b.type === 'digital_write' || b.type === 'digital_read' || b.type === 'analog_read' || b.type === 'analog_write') {
        if (pinParam) {
          const isWrite = b.type.includes('write');
          const isAnalog = b.type.includes('analog');

          if (!usedPins.has(pinParam)) {
            usedPins.set(pinParam, { read: !isWrite, write: isWrite, type: isAnalog ? (isWrite ? 'pwm' : 'analog') : 'digital' });
          } else {
            const state = usedPins.get(pinParam)!;
            if (isWrite) state.write = true;
            if (!isWrite) state.read = true;
          }

          // Inicializálatlan láb észlelése
          if (!initializedPins.has(pinParam) && !isAnalog) { // analogRead nem feltétlen igényel pinMode-ot AVR-en, de a digitalWrite/Read igen
             missingInits.push({
               pin: pinParam,
               neededFor: b.type,
               type: 'digital',
             });
          }
        }
      }
    });

    return {
      initializedPins: Array.from(initializedPins),
      usedPins: Array.from(usedPins.entries()).map(([pin, usage]) => ({ pin, ...usage })),
      missingInits
    };
  }, [blocks]);

  // Egymásba illeszthetőségi mátrix generálása (Nesting & Slot Rules)
  // Végigmegyünk a gyakori szülő blokkokon és megmutatjuk mit fogadnak el
  const nestingRules = [
    { parent: 'if_condition', allowedChildren: 'Minden utasítás, változó művelet, hardveres I/O', scope: 'loop, isr' },
    { parent: 'for_loop', allowedChildren: 'Minden utasítás, változó művelet, hardveres I/O', scope: 'loop, isr' },
    { parent: 'while_loop', allowedChildren: 'Minden utasítás, változó művelet, hardveres I/O', scope: 'loop, isr' },
    { parent: 'interrupt_attach', allowedChildren: 'Csak ISR kompatibilis utasítások (nincs delay, millis() módosítás)', scope: 'setup' },
  ];

  const handleAutoFixInit = (pin: string) => {
    // Készítünk egy új pinMode blokkot a setup-ba
    const newBlock: ProgramBlock = {
      id: `block-${Date.now()}`,
      type: 'pin_mode',
      scope: 'setup',
      parameters: { pin: pin, mode: 'OUTPUT' }, // Default outputra
      parentId: null
    };

    setBlocks(prev => {
      const setupBlocks = prev.filter(b => b.scope === 'setup');
      const otherBlocks = prev.filter(b => b.scope !== 'setup');
      return [...setupBlocks, newBlock, ...otherBlocks];
    });
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[999] flex items-center justify-center p-4 md:p-8 animate-in fade-in duration-200">
      <div className="bg-[#13161A] border border-[#2A303C] rounded-xl shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden ring-1 ring-white/10">

        {/* HEADER */}
        <div className="flex items-center justify-between p-4 border-b border-[#2A303C] bg-gradient-to-r from-[#1A1D24] to-[#13161A]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-lg border border-indigo-500/30">
              <GitMerge className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Függőségi Gráf & Illesztési Mátrix
                <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-500/40 uppercase font-mono tracking-wider">
                  Adatfolyam & I/O
                </span>
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Blokkok közötti hardveres kapcsolatok, beágyazhatósági szabályok és automatikus inicializálás ellenőrzés
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-[#2A303C] rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* CONTENT */}
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row bg-[#1E232B]">

          {/* LEFT COLUMN: Dataflow & I/O Dependencies */}
          <div className="flex-1 flex flex-col border-r border-[#2A303C]">
            <div className="p-3 bg-[#1A1D24] border-b border-[#2A303C] flex items-center gap-2">
              <Zap className="w-4 h-4 text-yellow-500" />
              <h3 className="text-sm font-semibold text-gray-200">Valós Idejű Hardveres Adatfolyam</h3>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6">

              {/* Missing Inits (Diagnostics & Quick Fix) */}
              {analysis.missingInits.length > 0 && (
                <div className="bg-red-950/20 border border-red-900/50 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-red-400 flex items-center gap-2 mb-3">
                    <AlertTriangle className="w-4 h-4" />
                    Diagnosztika: Inicializálatlan Lábak!
                  </h4>
                  <div className="space-y-2">
                    {analysis.missingInits.map((issue, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-[#13161A] p-2.5 rounded border border-red-900/30">
                        <div className="flex flex-col gap-1">
                           <span className="text-sm text-gray-200 font-mono">PIN {issue.pin}</span>
                           <span className="text-xs text-gray-500">Hiányzó pinMode! A <span className="text-gray-300 font-mono">{issue.neededFor}</span> blokkhoz szükséges.</span>
                        </div>
                        <button
                          onClick={() => handleAutoFixInit(issue.pin)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-red-900/40 hover:bg-red-800/60 text-red-300 rounded text-xs transition-colors border border-red-700/50"
                        >
                          <PlusCircle className="w-3.5 h-3.5" />
                          pinMode() Beszúrása
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* I/O Pin Usage Graph */}
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Használt PIN Függőségek</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {analysis.usedPins.length === 0 ? (
                    <p className="text-sm text-gray-500 col-span-full">Nincs aktív hardveres I/O művelet a programban.</p>
                  ) : (
                    analysis.usedPins.map((usage, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-[#13161A] rounded-lg border border-[#2A303C]">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded flex items-center justify-center font-mono text-xs font-bold ${
                            analysis.initializedPins.includes(usage.pin)
                              ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                              : usage.type === 'analog'
                                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' // analog doesn't strictly need init
                                : 'bg-red-500/20 text-red-400 border border-red-500/30'
                          }`}>
                            {usage.pin}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-xs text-gray-300 font-mono">
                              {usage.type === 'analog' ? 'Analog In' : usage.type === 'pwm' ? 'PWM Out' : 'Digital I/O'}
                            </span>
                            <div className="flex items-center gap-2 mt-1">
                              {usage.read && <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-900/40 text-blue-300 border border-blue-800">Olvasás</span>}
                              {usage.write && <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-900/40 text-amber-300 border border-amber-800">Írás</span>}
                            </div>
                          </div>
                        </div>
                        {analysis.initializedPins.includes(usage.pin) && (
                          <CheckCircle2 className="w-5 h-5 text-green-500/70" />
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>
          </div>

          {/* RIGHT COLUMN: Nesting Matrix */}
          <div className="flex-1 flex flex-col bg-[#1A1D24]">
            <div className="p-3 bg-[#13161A] border-b border-[#2A303C] flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-400" />
              <h3 className="text-sm font-semibold text-gray-200">Egymásba Illeszthetőségi Mátrix</h3>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <div className="space-y-4">
                <p className="text-sm text-gray-400 mb-2">Szabályok a blokkok beágyazhatóságára (Nesting & Scope):</p>

                {nestingRules.map((rule, idx) => (
                  <div key={idx} className="bg-[#1E232B] rounded-lg border border-[#2A303C] overflow-hidden">
                    <div className="px-4 py-2 bg-[#252B36] border-b border-[#2A303C] flex items-center justify-between">
                      <span className="font-mono text-sm text-indigo-300 font-bold">{rule.parent}</span>
                      <span className="text-[10px] uppercase font-mono tracking-wider text-gray-500 bg-black/20 px-2 py-0.5 rounded">Scope: {rule.scope}</span>
                    </div>
                    <div className="p-3">
                      <div className="flex items-start gap-2">
                        <ArrowRight className="w-4 h-4 text-gray-500 mt-0.5" />
                        <div className="flex flex-col">
                          <span className="text-xs font-semibold text-gray-300">Engedélyezett Gyermek Blokkok:</span>
                          <span className="text-sm text-gray-400 mt-1">{rule.allowedChildren}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
