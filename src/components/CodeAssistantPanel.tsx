/**
 * (c) 2026 AI Studio AVR Visual Studio
 * Code Assistant Panel Component (Kód Segítő & Változó Ajánló)
 * Offers context-aware variable bindings, smart presets, and 1-click hardware recipes
 */

import React, { useState } from 'react';
import {
  Sparkles,
  Zap,
  Tag,
  Plus,
  Check,
  ChevronDown,
  ChevronUp,
  Cpu,
  Sliders,
  Info,
  Clock,
  HardDrive,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';
import { ProgramBlock, VariableDefinition } from '../types';
import { getBlockAssistantReport, SmartPresetOption, MatchedVariableOption } from '../utils/codeAssistant';
import { incrementBuild } from '../utils/versionManager';

interface CodeAssistantPanelProps {
  block: ProgramBlock;
  variables: VariableDefinition[];
  onUpdateParams: (blockId: string, newParams: Record<string, any>, comment?: string) => void;
  onCreateVariable?: (newVar: VariableDefinition) => void;
  isRecentlyAdded?: boolean;
}

export const CodeAssistantPanel: React.FC<CodeAssistantPanelProps> = ({
  block,
  variables,
  onUpdateParams,
  onCreateVariable,
  isRecentlyAdded = false,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(isRecentlyAdded);
  const [lastAppliedPresetId, setLastAppliedPresetId] = useState<string | null>(null);
  const [lastAppliedVarId, setLastAppliedVarId] = useState<string | null>(null);

  const report = getBlockAssistantReport(block, variables);

  const handleApplyPreset = (preset: SmartPresetOption) => {
    onUpdateParams(block.id, preset.params, preset.comment || preset.label);
    setLastAppliedPresetId(preset.id);
    setTimeout(() => setLastAppliedPresetId(null), 1500);
    incrementBuild(`Kód Segítő: '${preset.label}' sablon alkalmazva`);
  };

  const handleApplyVariable = (match: MatchedVariableOption) => {
    const updated = {
      ...block.params,
      [match.targetParam]: match.appliedValue,
    };
    const comment = `Változó: ${match.variable.name} (${match.variable.type})`;
    onUpdateParams(block.id, updated, comment);
    setLastAppliedVarId(match.variable.id);
    setTimeout(() => setLastAppliedVarId(null), 1500);
    incrementBuild(`Kód Segítő: '${match.variable.name}' változó bekötve a paraméterhez`);
  };

  const handleCreateSuggestedVar = () => {
    if (!report.suggestedNewVariable || !onCreateVariable) return;
    const base = report.suggestedNewVariable;
    const newId = `var_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    // Generate unique name if collision
    let varName = base.name;
    let counter = 1;
    while (variables.some((v) => v.name.toLowerCase() === varName.toLowerCase())) {
      varName = `${base.name}_${counter++}`;
    }

    const newVar: VariableDefinition = {
      id: newId,
      name: varName,
      type: base.type,
      memoryLocation: base.memoryLocation,
      scope: 'global',
      initialValue: base.initialValue,
      description: base.description,
      sizeBytes: base.type === 'uint16_t' || base.type === 'int16_t' ? 2 : 1,
      sramAddress: 0x0100 + variables.length * 2,
    };

    onCreateVariable(newVar);

    // Also auto-bind to current block
    if (base.type === 'bool') {
      onUpdateParams(
        block.id,
        {
          ...block.params,
          state: base.initialValue === '1' ? 'HIGH' : 'LOW',
          value: base.initialValue === '1' ? 'HIGH' : 'LOW',
        },
        `Hozzárendelt változó: ${varName}`
      );
    } else if (base.type === 'uint8_t' && (block.type.includes('pin') || block.type.includes('mode'))) {
      onUpdateParams(
        block.id,
        { ...block.params, pin: base.initialValue },
        `Hozzárendelt láb: ${varName}`
      );
    }
  };

  const totalSuggestions = report.matchedVariables.length + report.presets.length;

  return (
    <div
      id={`code-assistant-${block.id}`}
      className={`rounded-xs border transition-all ${
        isExpanded
          ? 'bg-[#12141A] border-[#4ade80]/60 shadow-[2px_2px_0px_#000]'
          : 'bg-[#0F1115] border-[#2A2D35] hover:border-[#4ade80]/40'
      }`}
    >
      {/* Header bar */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-3 py-1.5 flex items-center justify-between gap-2 text-left cursor-pointer transition-colors"
      >
        <div className="flex items-center gap-2 flex-wrap">
          <span className="flex items-center gap-1.5 text-xs font-bold font-mono text-[#4ade80]">
            <Sparkles className="w-3.5 h-3.5 text-[#4ade80] animate-pulse" />
            <span>KÓD SEGÍTŐ & AJÁNLÓ</span>
          </span>

          {isRecentlyAdded && (
            <span className="text-[9px] font-mono font-bold bg-[#4ade80] text-black px-1.5 py-0.2 rounded-xs shadow-[1px_1px_0px_#000]">
              ÚJ MODUL
            </span>
          )}

          {report.matchedVariables.length > 0 && (
            <span className="text-[10px] font-mono text-cyan-300 bg-cyan-950/60 border border-cyan-500/40 px-1.5 py-0.2 rounded-xs">
              {report.matchedVariables.length} Kapcsolódó Változó
            </span>
          )}

          {report.presets.length > 0 && (
            <span className="text-[10px] font-mono text-amber-300 bg-amber-950/60 border border-amber-500/40 px-1.5 py-0.2 rounded-xs">
              {report.presets.length} Gyors Sablon
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 text-[#8A8D98] text-xs">
          <span className="text-[10px] hidden sm:inline">
            {isExpanded ? 'Összecsukás' : 'Javaslatok megnyitása'}
          </span>
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {/* Expanded Assistant Body */}
      {isExpanded && (
        <div className="px-3 pb-3 pt-1 border-t border-[#2A2D35] space-y-3">
          {/* 1. MATCHED VARIABLES */}
          {report.matchedVariables.length > 0 ? (
            <div className="space-y-1.5">
              <div className="text-[10px] font-mono font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                <Tag className="w-3 h-3 text-cyan-400" />
                <span>Kompatibilis Definiált Változók (1-Kattintásos Bekötés):</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {report.matchedVariables.map((match) => {
                  const isApplied = lastAppliedVarId === match.variable.id;
                  return (
                    <button
                      key={`${match.variable.id}_${match.targetParam}`}
                      onClick={() => handleApplyVariable(match)}
                      className={`group flex items-center gap-2 px-2.5 py-1.5 rounded-xs border text-xs font-mono transition-all shadow-[1px_1px_0px_#000] cursor-pointer ${
                        isApplied
                          ? 'bg-[#4ade80] text-black border-[#4ade80]'
                          : 'bg-[#161920] hover:bg-cyan-950/40 text-[#E0E0E6] hover:text-cyan-200 border-cyan-500/40 hover:border-cyan-400'
                      }`}
                      title={`${match.explanation} -> Kattints a beállításhoz!`}
                    >
                      {isApplied ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-black" />
                      ) : (
                        <Tag className="w-3 h-3 text-cyan-400 group-hover:scale-110 transition-transform" />
                      )}
                      <span className="font-bold text-cyan-300 group-hover:text-white">
                        {match.variable.name}
                      </span>
                      <span className="text-[10px] text-[#8A8D98] bg-[#0F1115] px-1 py-0.2 rounded-xs border border-[#2A2D35]">
                        {match.badge}
                      </span>
                      <span className="text-[10px] text-cyan-400 font-bold flex items-center gap-0.5">
                        <ArrowRight className="w-2.5 h-2.5" />
                        {match.targetParam}: {String(match.appliedValue)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="p-2 rounded-xs bg-[#161920] border border-[#2A2D35] flex items-center justify-between gap-2 flex-wrap text-xs text-[#8A8D98]">
              <div className="flex items-center gap-2">
                <Info className="w-3.5 h-3.5 text-[#8A8D98]" />
                <span>Nincs még kifejezetten ehhez a modulhoz definiált változó.</span>
              </div>
              {report.suggestedNewVariable && onCreateVariable && (
                <button
                  type="button"
                  onClick={handleCreateSuggestedVar}
                  className="flex items-center gap-1 px-2 py-0.8 bg-[#1A1D24] hover:bg-[#4ade80]/20 text-[#4ade80] border border-[#4ade80]/50 rounded-xs text-[11px] font-mono font-bold shadow-[1px_1px_0px_#000] cursor-pointer transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  <span>+ Új '{report.suggestedNewVariable.name}' ({report.suggestedNewVariable.type}) létrehozása</span>
                </button>
              )}
            </div>
          )}

          {/* 2. SMART PRESETS */}
          {report.presets.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-[10px] font-mono font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <Zap className="w-3 h-3 text-amber-400" />
                <span>Ajánlott Beállítások & Gyors Sablonok:</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5">
                {report.presets.map((preset) => {
                  const isApplied = lastAppliedPresetId === preset.id;
                  return (
                    <button
                      key={preset.id}
                      onClick={() => handleApplyPreset(preset)}
                      className={`text-left p-2 rounded-xs border text-xs font-mono transition-all shadow-[1px_1px_0px_#000] cursor-pointer flex flex-col justify-between gap-1 ${
                        isApplied
                          ? 'bg-[#4ade80] text-black border-[#4ade80]'
                          : 'bg-[#161920] hover:bg-[#1F232B] text-[#E0E0E6] border-[#3A3F4B] hover:border-amber-400/80'
                      }`}
                      title={preset.description}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-bold text-white flex items-center gap-1 truncate">
                          {isApplied && <Check className="w-3 h-3 text-black shrink-0" />}
                          {preset.label}
                        </span>
                        {preset.badge && (
                          <span className="text-[9px] px-1 py-0.2 rounded-xs bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0">
                            {preset.badge}
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-[#8A8D98] truncate">{preset.description}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 3. HARDWARE & TIMING INSIGHT */}
          <div className="p-2 rounded-xs bg-[#0A0C0F] border border-[#2A2D35] flex items-start gap-2 text-[11px] text-[#8A8D98]">
            <Cpu className="w-3.5 h-3.5 text-[#4ade80] shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="text-white font-bold font-mono">AVR Architektúra Megjegyzés: </span>
              <span>{report.hardwareTip}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Inline Variable Quick Picker for Individual Input Fields
 */
export const VariableQuickPicker: React.FC<{
  variables: VariableDefinition[];
  filterType?: 'pin' | 'sram' | 'register' | 'all';
  onSelect: (value: any, varName: string) => void;
}> = ({ variables, filterType = 'all', onSelect }) => {
  const [isOpen, setIsOpen] = useState(false);

  const filteredVars = variables.filter((v) => {
    if (filterType === 'pin') {
      return (
        (v.type === 'uint8_t' || v.type === 'int8_t') &&
        (v.name.toLowerCase().includes('pin') || v.name.toLowerCase().includes('led') || v.name.toLowerCase().includes('btn'))
      );
    }
    if (filterType === 'sram') {
      return v.memoryLocation === 'sram';
    }
    if (filterType === 'register') {
      return v.memoryLocation === 'register' || !!v.registerBinding;
    }
    return true;
  });

  if (filteredVars.length === 0) return null;

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="px-1.5 py-0.5 text-[9px] font-mono font-bold bg-[#1A1D24] hover:bg-cyan-950/60 text-cyan-400 hover:text-cyan-300 border border-cyan-500/40 hover:border-cyan-400 rounded-xs flex items-center gap-1 shadow-[1px_1px_0px_#000] cursor-pointer transition-colors"
        title="Változó értékének vagy címének beillesztése"
      >
        <Tag className="w-2.5 h-2.5" />
        <span>Változó</span>
      </button>

      {isOpen && (
        <div
          className="absolute right-0 top-full mt-1 z-30 w-56 bg-[#161920] border border-[#4ade80]/60 rounded-xs p-1.5 shadow-[4px_4px_0px_#000] space-y-1 font-mono text-xs"
          onMouseLeave={() => setIsOpen(false)}
        >
          <div className="text-[10px] text-[#8A8D98] uppercase font-bold border-b border-[#2A2D35] pb-1 px-1 flex items-center justify-between">
            <span>Változó kiválasztása:</span>
            <span className="text-[#4ade80]">{filteredVars.length} db</span>
          </div>
          <div className="max-h-40 overflow-y-auto space-y-0.5 custom-scrollbar">
            {filteredVars.map((v) => {
              let appliedVal: any = v.initialValue;
              if (filterType === 'sram' && v.sramAddress) {
                appliedVal = `0x${v.sramAddress.toString(16).toUpperCase()}`;
              } else if (filterType === 'register' && v.registerBinding) {
                appliedVal = v.registerBinding;
              }

              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => {
                    onSelect(appliedVal, v.name);
                    setIsOpen(false);
                  }}
                  className="w-full text-left px-2 py-1 hover:bg-[#1F232B] rounded-xs flex items-center justify-between gap-1 text-[11px] text-[#E0E0E6] hover:text-[#4ade80] transition-colors"
                >
                  <span className="font-bold truncate">{v.name}</span>
                  <span className="text-[10px] text-[#8A8D98] shrink-0">
                    {v.type} ({String(appliedVal)})
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
