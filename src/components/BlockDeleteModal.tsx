import React, { useState } from 'react';
import {
  Trash2,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  X,
  Layers,
  Code2,
  Zap,
  EyeOff,
  Wrench,
  ArrowRight,
  ShieldAlert,
  Info,
} from 'lucide-react';
import { ProgramBlock, VariableDefinition } from '../types';
import { BLOCK_DEFINITIONS } from '../data/blockDefinitions';
import { analyzeBlockDependencies, DependencyAnalysisResult } from '../utils/blockDependencyAnalyzer';

interface BlockDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetBlock: ProgramBlock | null;
  allBlocks: ProgramBlock[];
  variables?: VariableDefinition[];
  onConfirmDelete: (blockId: string) => void;
  onConfirmCascadeDelete: (blockIds: string[]) => void;
  onToggleDisable: (blockId: string) => void;
  onFocusBlock?: (blockId: string) => void;
}

export const BlockDeleteModal: React.FC<BlockDeleteModalProps> = ({
  isOpen,
  onClose,
  targetBlock,
  allBlocks,
  variables = [],
  onConfirmDelete,
  onConfirmCascadeDelete,
  onToggleDisable,
  onFocusBlock,
}) => {
  const [showCodePreview, setShowCodePreview] = useState<boolean>(true);

  if (!isOpen || !targetBlock) return null;

  const def = BLOCK_DEFINITIONS[targetBlock.type];
  const analysis: DependencyAnalysisResult = analyzeBlockDependencies(
    targetBlock,
    allBlocks,
    variables
  );

  const cCode = def ? def.generateC(targetBlock.params).join('\n') : '';
  const asmCode = def ? def.generateAsm(targetBlock.params, 'del').join('\n') : '';

  const handleSingleDelete = () => {
    onConfirmDelete(targetBlock.id);
    onClose();
  };

  const handleCascadeDelete = () => {
    const allIdsToDelete = [targetBlock.id, ...analysis.dependentBlockIds];
    onConfirmCascadeDelete(allIdsToDelete);
    onClose();
  };

  const handleDisableInstead = () => {
    onToggleDisable(targetBlock.id);
    onClose();
  };

  return (
    <div
      id="block-delete-warning-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[90vh] bg-[#12141A] border-2 border-rose-500/70 rounded-xs shadow-[0_0_30px_rgba(244,63,94,0.3)] flex flex-col overflow-hidden text-[#E0E0E6]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-5 py-3.5 bg-[#171114] border-b border-rose-500/40 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xs bg-rose-500/20 text-rose-400 border border-rose-500/40 shadow-[1px_1px_0px_#000]">
              <Trash2 className="w-5 h-5 text-rose-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wide">
                  Blokk Eltávolítása & Függőség-Ellenőrzés
                </h3>
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-xs bg-rose-950 text-rose-300 border border-rose-500/40">
                  #{analysis.targetIndex} {analysis.targetBlock.scope.toUpperCase()}
                </span>
              </div>
              <p className="text-[11px] text-[#8A8D98]">
                Ellenőrizd az eltávolítandó modul hardveres és logikai kapcsolatait
              </p>
            </div>
          </div>

          <button
            id="btn-close-delete-modal"
            onClick={onClose}
            className="p-1 rounded-xs text-[#8A8D98] hover:text-white hover:bg-[#1A1D24] border border-transparent hover:border-[#3A3F4B] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* Target Block Identification Card */}
          <div className="p-3.5 bg-[#161920] border border-[#3A3F4B] rounded-xs shadow-[2px_2px_0px_#000] space-y-2.5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-xs bg-[#0F1115] border border-rose-500/50 text-rose-400 font-mono font-bold text-xs flex items-center justify-center">
                  #{analysis.targetIndex}
                </span>
                <div>
                  <h4 className="text-xs font-bold text-white flex items-center gap-2">
                    <span>{analysis.targetDefName}</span>
                    <span className="text-[10px] font-mono text-[#8A8D98] uppercase">
                      ({def?.category || 'modul'})
                    </span>
                  </h4>
                  <div className="text-[11px] text-[#8A8D98] font-mono">
                    Szakasz: <strong className="text-white">{targetBlock.scope}</strong> | Állapot:{' '}
                    <strong className={targetBlock.enabled === false ? 'text-amber-400' : 'text-[#4ade80]'}>
                      {targetBlock.enabled === false ? 'Letiltva' : 'Aktív'}
                    </strong>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowCodePreview(!showCodePreview)}
                className="text-[11px] font-mono text-[#8A8D98] hover:text-white flex items-center gap-1 px-2 py-1 bg-[#1A1D24] border border-[#2A2D35] rounded-xs"
              >
                <Code2 className="w-3.5 h-3.5 text-orange-400" />
                <span>{showCodePreview ? 'Kód elrejtése' : 'Kód megtekintése'}</span>
              </button>
            </div>

            {/* Target Block Parameter values */}
            {targetBlock.params && Object.keys(targetBlock.params).length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1 border-t border-[#2A2D35]">
                {Object.entries(targetBlock.params).map(([k, v]) => (
                  <span
                    key={k}
                    className="text-[10px] font-mono bg-[#0F1115] text-[#E0E0E6] px-2 py-0.5 rounded-xs border border-[#2A2D35]"
                  >
                    <strong className="text-[#8A8D98]">{k}:</strong> {String(v)}
                  </span>
                ))}
              </div>
            )}

            {/* Code Snippet Preview */}
            {showCodePreview && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                <div className="bg-[#0F1115] p-2 rounded-xs border border-[#2A2D35]">
                  <div className="text-[9px] font-mono text-orange-400 uppercase font-bold mb-1 flex items-center gap-1">
                    <Code2 className="w-3 h-3" /> C Kód
                  </div>
                  <pre className="text-[10px] font-mono text-orange-300 overflow-x-auto whitespace-pre-wrap">
                    {cCode || '// nincs generált kód'}
                  </pre>
                </div>
                <div className="bg-[#0F1115] p-2 rounded-xs border border-[#2A2D35]">
                  <div className="text-[9px] font-mono text-[#4ade80] uppercase font-bold mb-1 flex items-center gap-1">
                    <Zap className="w-3 h-3" /> AVR Asm
                  </div>
                  <pre className="text-[10px] font-mono text-[#4ade80] overflow-x-auto whitespace-pre-wrap">
                    {asmCode || '; nincs asm'}
                  </pre>
                </div>
              </div>
            )}
          </div>

          {/* Dependency Analysis Summary Banner */}
          <div
            className={`p-3.5 rounded-xs border flex items-start gap-3 shadow-[2px_2px_0px_#000] ${
              analysis.criticalCount > 0
                ? 'bg-rose-950/40 border-rose-500/60 text-rose-200'
                : analysis.warningCount > 0
                ? 'bg-amber-950/40 border-amber-500/60 text-amber-200'
                : 'bg-[#4ade80]/10 border-[#4ade80]/40 text-[#4ade80]'
            }`}
          >
            {analysis.criticalCount > 0 ? (
              <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            ) : analysis.warningCount > 0 ? (
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-[#4ade80] shrink-0 mt-0.5" />
            )}

            <div className="space-y-1">
              <div className="text-xs font-bold font-mono">
                {analysis.criticalCount > 0
                  ? `KRITIKUS FÜGGŐSÉGEK DETEKTÁLVA (${analysis.criticalCount} db)`
                  : analysis.warningCount > 0
                  ? `FIGYELMEZTETŐ FÜGGŐSÉGEK (${analysis.warningCount} db)`
                  : 'BIZTONSÁGOSAN TÖRÖLHETŐ'}
              </div>
              <p className="text-[11px] leading-relaxed opacity-90">{analysis.summaryText}</p>
            </div>
          </div>

          {/* Detailed Dependency Cards List */}
          {analysis.dependencies.length > 0 && (
            <div className="space-y-2">
              <div className="text-[10px] font-mono font-bold text-[#8A8D98] uppercase tracking-wider flex items-center justify-between">
                <span>Érintett Kapcsolódó Modulok és Következmények:</span>
                <span>{analysis.dependencies.length} függőség</span>
              </div>

              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {analysis.dependencies.map((dep) => (
                  <div
                    key={dep.id}
                    className={`p-3 rounded-xs border text-xs space-y-1.5 shadow-[1px_1px_0px_#000] ${
                      dep.severity === 'critical'
                        ? 'bg-[#1C1215] border-rose-500/50'
                        : 'bg-[#1A1813] border-amber-500/50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        {dep.severity === 'critical' ? (
                          <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                        ) : (
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        )}
                        <span className="font-bold text-white font-mono text-[11px]">
                          {dep.title}
                        </span>
                      </div>

                      <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-xs border bg-[#0F1115] text-[#8A8D98] border-[#2A2D35]">
                        #{dep.dependentBlockIndex} {dep.dependentBlockName} ({dep.dependentBlockScope})
                      </span>
                    </div>

                    <p className="text-[11px] text-[#C5C8D4] leading-normal">{dep.description}</p>

                    <div className="text-[11px] text-rose-300/90 font-mono bg-black/40 p-1.5 rounded-xs border border-rose-500/20 flex items-start gap-1.5">
                      <span className="text-rose-400 font-bold shrink-0">Következmény:</span>
                      <span>{dep.consequence}</span>
                    </div>

                    {dep.suggestedAction && (
                      <div className="text-[10px] text-[#8A8D98] italic flex items-center gap-1">
                        <Wrench className="w-3 h-3 text-amber-400 shrink-0" />
                        <span>Javaslat: {dep.suggestedAction}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 bg-[#161920] border-t border-[#2A2D35] flex flex-wrap items-center justify-between gap-2.5">
          <button
            id="btn-cancel-delete"
            onClick={onClose}
            className="px-3.5 py-1.5 bg-[#1A1D24] hover:bg-[#252830] text-[#E0E0E6] text-xs font-mono font-medium rounded-xs border border-[#3A3F4B] transition-colors cursor-pointer"
          >
            Mégse
          </button>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Non-destructive disable option */}
            <button
              id="btn-disable-instead-delete"
              onClick={handleDisableInstead}
              className="px-3 py-1.5 bg-sky-950/60 hover:bg-sky-900/80 text-sky-300 text-xs font-mono font-bold rounded-xs border border-sky-500/40 flex items-center gap-1.5 transition-colors cursor-pointer"
              title="A blokk a munkaterületen marad, de nem fordul le és nem fut le a szimulációban"
            >
              <EyeOff className="w-3.5 h-3.5" />
              <span>Csak Letiltás (Inaktiválás)</span>
            </button>

            {/* Cascade delete if there are dependent blocks */}
            {analysis.dependentBlockIds.length > 0 && (
              <button
                id="btn-cascade-delete"
                onClick={handleCascadeDelete}
                className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-mono font-bold rounded-xs border border-amber-500/50 flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Törli ezt a blokkot és az összes rá hivatkozó árva modult is"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Kaszkádolt Törlés (+{analysis.dependentBlockIds.length} modul)</span>
              </button>
            )}

            {/* Direct confirm delete */}
            <button
              id="btn-confirm-single-delete"
              onClick={handleSingleDelete}
              className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-mono font-bold rounded-xs border border-rose-400 flex items-center gap-1.5 shadow-[2px_2px_0px_#000] transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Végleges Törlés</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
