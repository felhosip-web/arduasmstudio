import React, { useState, useMemo, useEffect } from 'react';
import {
  VariableDefinition,
  VariableDataType,
  VariableMemoryLocation,
  VariableScope,
  AvrRegister,
  ProgramBlock,
} from '../types';
import {
  validateVariableDefinition,
  allocateVariableAddresses,
  calculateVariableSizeBytes,
  DATA_TYPE_METADATA,
  DEFAULT_VARIABLES,
  generateVariableAsmDeclaration,
  generateVariableCDeclaration,
} from '../utils/variableValidator';
import {
  X,
  Plus,
  Trash2,
  Copy,
  Check,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Search,
  Filter,
  Download,
  Upload,
  HardDrive,
  Cpu,
  Zap,
  Code2,
  Sparkles,
  Layers,
  FileCode,
  Edit3,
  Sliders,
  Terminal,
  Bookmark,
  Info,
} from 'lucide-react';

interface VariableEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  variables: VariableDefinition[];
  setVariables: React.Dispatch<React.SetStateAction<VariableDefinition[]>>;
  onInsertVariableBlock?: (variable: VariableDefinition, mode: 'read' | 'write') => void;
}

export const VariableEditorModal: React.FC<VariableEditorModalProps> = ({
  isOpen,
  onClose,
  variables,
  setVariables,
  onInsertVariableBlock,
}) => {
  // Allocated variables with SRAM addresses
  const allocatedVars = useMemo(() => allocateVariableAddresses(variables), [variables]);

  // Selected variable for editing (or null for creating new)
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Form State
  const [formName, setFormName] = useState<string>('');
  const [formType, setFormType] = useState<VariableDataType>('uint8_t');
  const [formMemoryLocation, setFormMemoryLocation] = useState<VariableMemoryLocation>('sram');
  const [formScope, setFormScope] = useState<VariableScope>('global');
  const [formInitialValue, setFormInitialValue] = useState<string>('0');
  const [formArraySize, setFormArraySize] = useState<number>(8);
  const [formRegister, setFormRegister] = useState<AvrRegister>('r16');
  const [formIsVolatile, setFormIsVolatile] = useState<boolean>(false);
  const [formIsConst, setFormIsConst] = useState<boolean>(false);
  const [formDescription, setFormDescription] = useState<string>('');

  // UI / Filter State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [filterMemory, setFilterMemory] = useState<string>('ALL');
  const [previewTab, setPreviewTab] = useState<'asm' | 'c'>('c');
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Load selected variable into form
  useEffect(() => {
    if (selectedId) {
      const target = variables.find((v) => v.id === selectedId);
      if (target) {
        setFormName(target.name);
        setFormType(target.type);
        setFormMemoryLocation(target.memoryLocation);
        setFormScope(target.scope);
        setFormInitialValue(target.initialValue ?? '');
        setFormArraySize(target.arraySize ?? 8);
        setFormRegister(target.registerBinding ?? 'r16');
        setFormIsVolatile(target.isVolatile ?? false);
        setFormIsConst(target.isConst ?? false);
        setFormDescription(target.description ?? '');
      }
    }
  }, [selectedId, variables]);

  // Draft object for live validation
  const draftVariable: Partial<VariableDefinition> = useMemo(() => {
    return {
      id: selectedId || 'draft_temp_id',
      name: formName,
      type: formType,
      memoryLocation: formMemoryLocation,
      scope: formScope,
      initialValue: formInitialValue,
      arraySize: formType === 'array' ? formArraySize : undefined,
      registerBinding: formMemoryLocation === 'register' ? formRegister : undefined,
      isVolatile: formIsVolatile,
      isConst: formIsConst,
      description: formDescription,
    };
  }, [
    selectedId,
    formName,
    formType,
    formMemoryLocation,
    formScope,
    formInitialValue,
    formArraySize,
    formRegister,
    formIsVolatile,
    formIsConst,
    formDescription,
  ]);

  // Real-time Validation for current draft form
  const formValidation = useMemo(() => {
    return validateVariableDefinition(draftVariable, variables);
  }, [draftVariable, variables]);

  // Total Memory Usage Metrics (ATmega328P: 2048 B SRAM, 32 KB Flash, 1024 B EEPROM)
  const memoryStats = useMemo(() => {
    let sramBytes = 0;
    let progmemBytes = 0;
    let eepromBytes = 0;
    let registerCount = 0;

    allocatedVars.forEach((v) => {
      const bytes = v.sizeBytes || 0;
      if (v.memoryLocation === 'sram') sramBytes += bytes;
      else if (v.memoryLocation === 'progmem') progmemBytes += bytes;
      else if (v.memoryLocation === 'eeprom') eepromBytes += bytes;
      else if (v.memoryLocation === 'register') registerCount += 1;
    });

    const sramPercent = Math.min(100, Math.round((sramBytes / 2048) * 100));
    const eepromPercent = Math.min(100, Math.round((eepromBytes / 1024) * 100));

    return {
      sramBytes,
      sramPercent,
      progmemBytes,
      eepromBytes,
      eepromPercent,
      registerCount,
    };
  }, [allocatedVars]);

  // Filtered variable list
  const filteredVariables = useMemo(() => {
    return allocatedVars.filter((v) => {
      const matchesSearch =
        v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (v.description && v.description.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesType = filterType === 'ALL' || v.type === filterType;
      const matchesMemory = filterMemory === 'ALL' || v.memoryLocation === filterMemory;
      return matchesSearch && matchesType && matchesMemory;
    });
  }, [allocatedVars, searchQuery, filterType, filterMemory]);

  // Check validation status for every variable in project
  const variableValidationMap = useMemo(() => {
    const map = new Map<string, { isValid: boolean; errorCount: number; errors: string[] }>();
    allocatedVars.forEach((v) => {
      const res = validateVariableDefinition(v, allocatedVars);
      map.set(v.id, {
        isValid: res.isValid,
        errorCount: res.errors.length,
        errors: res.errors.map((e) => e.message),
      });
    });
    return map;
  }, [allocatedVars]);

  // Reset form to clear / new state
  const handleResetForm = () => {
    setSelectedId(null);
    setFormName('');
    setFormType('uint8_t');
    setFormMemoryLocation('sram');
    setFormScope('global');
    setFormInitialValue('0');
    setFormArraySize(8);
    setFormRegister('r16');
    setFormIsVolatile(false);
    setFormIsConst(false);
    setFormDescription('');
  };

  // Apply Quick Template
  const handleApplyTemplate = (template: Partial<VariableDefinition>) => {
    setSelectedId(null);
    setFormName(template.name || 'tempVar');
    setFormType(template.type || 'uint8_t');
    setFormMemoryLocation(template.memoryLocation || 'sram');
    setFormScope(template.scope || 'global');
    setFormInitialValue(template.initialValue || '0');
    setFormArraySize(template.arraySize || 8);
    setFormRegister(template.registerBinding || 'r16');
    setFormIsVolatile(template.isVolatile ?? false);
    setFormIsConst(template.isConst ?? false);
    setFormDescription(template.description || '');
  };

  // Save or Update Variable
  const handleSaveVariable = () => {
    if (!formValidation.isValid) {
      setStatusMessage('❌ Kérlek javítsd a pirossal jelölt hibákat a mentés előtt!');
      setTimeout(() => setStatusMessage(null), 4000);
      return;
    }

    const calculatedSize = calculateVariableSizeBytes(
      formType,
      formInitialValue,
      formType === 'array' ? formArraySize : undefined,
      formMemoryLocation
    );

    const newVar: VariableDefinition = {
      id: selectedId || `var_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: formName.trim(),
      type: formType,
      memoryLocation: formMemoryLocation,
      scope: formScope,
      initialValue: formInitialValue.trim(),
      arraySize: formType === 'array' ? formArraySize : undefined,
      registerBinding: formMemoryLocation === 'register' ? formRegister : undefined,
      isVolatile: formIsVolatile,
      isConst: formIsConst,
      description: formDescription.trim(),
      sizeBytes: calculatedSize,
    };

    if (selectedId) {
      setVariables((prev) => prev.map((v) => (v.id === selectedId ? newVar : v)));
      setStatusMessage(`✅ '${newVar.name}' változó sikeresen frissítve!`);
    } else {
      setVariables((prev) => [...prev, newVar]);
      setStatusMessage(`✅ '${newVar.name}' változó sikeresen létrehozva!`);
      handleResetForm();
    }

    setTimeout(() => setStatusMessage(null), 3000);
  };

  // Delete variable
  const handleDeleteVariable = (id: string) => {
    const target = variables.find((v) => v.id === id);
    if (!target) return;
    if (window.confirm(`Biztosan törölni szeretnéd a(z) '${target.name}' változót?`)) {
      setVariables((prev) => prev.filter((v) => v.id !== id));
      if (selectedId === id) {
        handleResetForm();
      }
      setStatusMessage(`🗑️ '${target.name}' változó törölve.`);
      setTimeout(() => setStatusMessage(null), 3000);
    }
  };

  // Duplicate variable
  const handleDuplicateVariable = (v: VariableDefinition) => {
    let newName = `${v.name}_copy`;
    let counter = 1;
    while (variables.some((item) => item.name === newName)) {
      newName = `${v.name}_copy${counter++}`;
    }

    const cloned: VariableDefinition = {
      ...v,
      id: `var_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: newName,
      description: v.description ? `${v.description} (Másolat)` : 'Változó másolata',
    };

    setVariables((prev) => [...prev, cloned]);
    setStatusMessage(`📋 '${cloned.name}' sikeresen klónozva!`);
    setTimeout(() => setStatusMessage(null), 3000);
  };

  // Export JSON
  const handleExportVariablesJson = () => {
    const payload = {
      exportType: 'ArduASM_Variables',
      exportedAt: new Date().toISOString(),
      totalVariables: variables.length,
      variables,
    };
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(payload, null, 2));
    const a = document.createElement('a');
    a.href = dataStr;
    a.download = `ardu_asm_variables_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  // Import JSON
  const handleImportVariablesJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const reader = new FileReader();
    if (e.target.files && e.target.files[0]) {
      reader.readAsText(e.target.files[0], 'UTF-8');
      reader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string);
          let list: VariableDefinition[] = [];
          if (Array.isArray(parsed)) {
            list = parsed;
          } else if (parsed && Array.isArray(parsed.variables)) {
            list = parsed.variables;
          }

          if (list.length > 0) {
            setVariables(list);
            setStatusMessage(`📥 ${list.length} változó sikeresen importálva!`);
            setTimeout(() => setStatusMessage(null), 3000);
          } else {
            alert('A fájl nem tartalmaz érvényes változó definíciókat!');
          }
        } catch (err) {
          alert('Hiba történt a JSON fájl beolvasásakor!');
        }
      };
    }
  };

  // Copy C / ASM header to clipboard
  const handleCopyAllCode = () => {
    const cLines = allocatedVars.map((v) => generateVariableCDeclaration(v)).join('\n');
    navigator.clipboard.writeText(cLines);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div
      id="modal-variable-editor"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-xs select-none"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-[#12141A] border-2 border-[#4ade80]/60 rounded-xs shadow-[0_0_30px_rgba(74,222,128,0.2)] w-full max-w-6xl max-h-[95vh] flex flex-col overflow-hidden text-[#E0E0E6] font-mono">
        {/* ================================================================= */}
        {/* MODAL HEADER */}
        {/* ================================================================= */}
        <div className="px-4 py-3 bg-[#161920] border-b border-[#2A2D35] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xs bg-[#4ade80] flex items-center justify-center text-black font-extrabold shadow-[2px_2px_0px_#000]">
              <Code2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-white uppercase tracking-tight flex items-center gap-1.5">
                  <span>Változókezelő & Memória Allokáció</span>
                  <span className="text-[#4ade80] text-xs font-normal">(Variables & SRAM Editor)</span>
                </h2>
                <span className="px-2 py-0.5 text-[10px] bg-[#1A1D24] text-cyan-400 border border-cyan-500/30 rounded-xs">
                  {variables.length} Változó
                </span>
              </div>
              <p className="text-[11px] text-[#8A8D98] hidden sm:block">
                Globális C / AVR Assembly változók, 2048B SRAM báziscímek, PROGMEM és regiszterkötések szigorú validációval
              </p>
            </div>
          </div>

          {/* Quick Memory Gauge Bar */}
          <div className="flex items-center gap-3 bg-[#0F1115] px-3 py-1.5 rounded-xs border border-[#2A2D35] text-xs">
            <div className="flex items-center gap-2">
              <span className="text-[#8A8D98] text-[10px] uppercase font-bold">SRAM:</span>
              <span className="font-bold text-[#4ade80]">{memoryStats.sramBytes} / 2048 B</span>
              <div className="w-16 h-2 bg-[#1A1D24] rounded-xs overflow-hidden border border-[#3A3F4B]">
                <div
                  className={`h-full transition-all ${
                    memoryStats.sramPercent > 85 ? 'bg-rose-500' : memoryStats.sramPercent > 50 ? 'bg-amber-400' : 'bg-[#4ade80]'
                  }`}
                  style={{ width: `${Math.max(4, memoryStats.sramPercent)}%` }}
                />
              </div>
            </div>

            <div className="hidden md:flex items-center gap-2 text-[10px] text-slate-300 border-l border-[#2A2D35] pl-3">
              <span>Flash PROGMEM: <strong className="text-purple-300">{memoryStats.progmemBytes} B</strong></span>
              <span>Regiszterek: <strong className="text-amber-300">{memoryStats.registerCount} db</strong></span>
            </div>

            <button
              onClick={onClose}
              className="p-1 rounded-xs hover:bg-[#2A2D35] text-[#8A8D98] hover:text-white transition-colors cursor-pointer ml-1"
              title="Bezárás (ESC)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Status Notification Toast Banner */}
        {statusMessage && (
          <div className="bg-[#1A1D24] border-b border-[#4ade80]/40 px-4 py-1.5 text-xs text-emerald-300 flex items-center justify-between animate-fadeIn">
            <span>{statusMessage}</span>
            <button onClick={() => setStatusMessage(null)} className="text-slate-400 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* ================================================================= */}
        {/* MODAL BODY (TWO COLUMN LAYOUT) */}
        {/* ================================================================= */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
          {/* ------------------------------------------------------------- */}
          {/* LEFT COLUMN: VARIABLE LIST & TOOLS (5 COLS) */}
          {/* ------------------------------------------------------------- */}
          <div className="lg:col-span-5 border-r border-[#2A2D35] bg-[#0E1015] flex flex-col h-full overflow-hidden">
            {/* List Toolbar */}
            <div className="p-3 border-b border-[#2A2D35] space-y-2 bg-[#14161D]">
              <div className="flex items-center justify-between gap-2">
                <button
                  id="btn-create-new-var"
                  onClick={handleResetForm}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-[#4ade80] hover:bg-[#3ec973] text-black font-bold text-xs rounded-xs shadow-[2px_2px_0px_#000] transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Új Változó Definiálása</span>
                </button>

                <button
                  onClick={handleCopyAllCode}
                  className="px-2.5 py-1.5 bg-[#1A1D24] hover:bg-[#2A2D35] text-slate-300 hover:text-white border border-[#3A3F4B] text-xs rounded-xs shadow-[1px_1px_0px_#000] flex items-center gap-1 cursor-pointer"
                  title="Összes C deklaráció másolása vágólapra"
                >
                  {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span className="hidden sm:inline">C Kód</span>
                </button>

                <button
                  onClick={handleExportVariablesJson}
                  className="p-1.5 bg-[#1A1D24] hover:bg-[#2A2D35] text-slate-300 hover:text-white border border-[#3A3F4B] rounded-xs shadow-[1px_1px_0px_#000] cursor-pointer"
                  title="Változók mentése JSON-be"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>

                <label
                  className="p-1.5 bg-[#1A1D24] hover:bg-[#2A2D35] text-slate-300 hover:text-white border border-[#3A3F4B] rounded-xs shadow-[1px_1px_0px_#000] cursor-pointer"
                  title="Változók betöltése JSON fájlból"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <input type="file" accept=".json" onChange={handleImportVariablesJson} className="hidden" />
                </label>
              </div>

              {/* Search & Filter Controls */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div className="relative flex items-center">
                  <Search className="w-3.5 h-3.5 text-[#8A8D98] absolute left-2 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Keresés név / leírás..."
                    className="w-full pl-7 pr-2 py-1 bg-[#1A1D24] border border-[#3A3F4B] text-xs text-[#E0E0E6] rounded-xs focus:outline-none focus:border-[#4ade80]"
                  />
                </div>

                <div className="flex items-center gap-1">
                  <select
                    value={filterMemory}
                    onChange={(e) => setFilterMemory(e.target.value)}
                    className="w-full py-1 px-1.5 bg-[#1A1D24] border border-[#3A3F4B] text-xs text-[#E0E0E6] rounded-xs focus:outline-none focus:border-[#4ade80] cursor-pointer"
                  >
                    <option value="ALL">Összes Memória</option>
                    <option value="sram">SRAM (RAM)</option>
                    <option value="progmem">PROGMEM (Flash)</option>
                    <option value="eeprom">EEPROM</option>
                    <option value="register">CPU Regiszter</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Quick Templates Strip */}
            <div className="px-3 py-2 bg-[#12141A] border-b border-[#2A2D35] text-[11px]">
              <div className="text-[10px] text-[#8A8D98] uppercase font-bold mb-1.5 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-[#4ade80]" />
                Gyors Sablonok (1-Kattintásos Létrehozás):
              </div>
              <div className="flex flex-wrap gap-1.5">
                {[
                  {
                    name: 'ledState',
                    type: 'bool',
                    memoryLocation: 'sram',
                    scope: 'global',
                    initialValue: 'false',
                    description: 'LED állapot jelző',
                    label: '💡 LED (bool)',
                  },
                  {
                    name: 'adcVoltage',
                    type: 'uint16_t',
                    memoryLocation: 'sram',
                    scope: 'global',
                    initialValue: '512',
                    description: '10-bites Analóg ADC érték',
                    label: '📊 ADC (uint16_t)',
                  },
                  {
                    name: 'fastLoopCounter',
                    type: 'uint8_t',
                    memoryLocation: 'register',
                    registerBinding: 'r16',
                    scope: 'loop',
                    initialValue: '0',
                    description: 'Gyors számláló regiszterben',
                    label: '⚡ Regiszter r16',
                  },
                  {
                    name: 'dataBuffer',
                    type: 'array',
                    arraySize: 8,
                    memoryLocation: 'sram',
                    scope: 'global',
                    initialValue: '[0, 0, 0, 0, 0, 0, 0, 0]',
                    description: '8-elemes mérési puffer',
                    label: '📈 Puffer uint8_t[8]',
                  },
                  {
                    name: 'deviceHeader',
                    type: 'string',
                    memoryLocation: 'progmem',
                    scope: 'global',
                    initialValue: '"ATmega328P v2.4"',
                    description: 'Flash ROM állandó szöveg',
                    label: '📜 PROGMEM Szöveg',
                  },
                ].map((tpl) => (
                  <button
                    key={tpl.name}
                    onClick={() => handleApplyTemplate(tpl as any)}
                    className="px-2 py-0.5 bg-[#1A1D24] hover:bg-[#4ade80]/20 hover:border-[#4ade80] text-slate-300 hover:text-[#4ade80] border border-[#2A2D35] rounded-xs text-[10px] transition-colors cursor-pointer"
                  >
                    {tpl.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Variable Cards List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
              {filteredVariables.length === 0 ? (
                <div className="p-6 text-center text-[#8A8D98] text-xs bg-[#14161D] border border-dashed border-[#2A2D35] rounded-xs">
                  Nem található változó a megadott szűrési feltételekkel.
                </div>
              ) : (
                filteredVariables.map((v) => {
                  const valStatus = variableValidationMap.get(v.id) || { isValid: true, errorCount: 0, errors: [] };
                  const isSelected = selectedId === v.id;

                  return (
                    <div
                      key={v.id}
                      onClick={() => setSelectedId(v.id)}
                      className={`p-2.5 rounded-xs border transition-all cursor-pointer relative ${
                        isSelected
                          ? 'bg-[#181C24] border-[#4ade80] shadow-[0_0_10px_rgba(74,222,128,0.15)]'
                          : valStatus.isValid
                          ? 'bg-[#14161D] border-[#2A2D35] hover:border-[#3A3F4B]'
                          : 'bg-rose-950/20 border-rose-500/60 hover:border-rose-500'
                      }`}
                    >
                      {/* Top Row: Name, Validation Status, Actions */}
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-xs flex items-center gap-1.5">
                            {valStatus.isValid ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-[#4ade80]" />
                            ) : (
                              <AlertCircle className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
                            )}
                            {v.name}
                          </span>

                          {/* Data Type Badge */}
                          <span className="px-1.5 py-0.2 text-[10px] font-bold bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 rounded-xs">
                            {v.type}
                            {v.type === 'array' && `[${v.arraySize || 8}]`}
                          </span>
                        </div>

                        {/* Card Action Buttons */}
                        <div className="flex items-center gap-1">
                          {onInsertVariableBlock && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onInsertVariableBlock(v, 'write');
                                setStatusMessage(`🧩 '${v.name}' blokk hozzáadva a programhoz!`);
                                setTimeout(() => setStatusMessage(null), 2500);
                              }}
                              className="p-1 text-slate-400 hover:text-[#4ade80] hover:bg-[#1A1D24] rounded-xs transition-colors cursor-pointer"
                              title="Változó író blokk generálása a munkaterületre"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          )}

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDuplicateVariable(v);
                            }}
                            className="p-1 text-slate-400 hover:text-cyan-400 hover:bg-[#1A1D24] rounded-xs transition-colors cursor-pointer"
                            title="Változó klónozása"
                          >
                            <Copy className="w-3 h-3" />
                          </button>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteVariable(v.id);
                            }}
                            className="p-1 text-slate-400 hover:text-rose-400 hover:bg-[#1A1D24] rounded-xs transition-colors cursor-pointer"
                            title="Törlés"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      {/* Middle Row: Memory Location, Address, Value */}
                      <div className="flex flex-wrap items-center gap-2 text-[10px] text-[#8A8D98]">
                        <span
                          className={`px-1.5 py-0.2 rounded-xs border font-bold ${
                            v.memoryLocation === 'sram'
                              ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                              : v.memoryLocation === 'progmem'
                              ? 'bg-purple-500/10 text-purple-300 border-purple-500/30'
                              : v.memoryLocation === 'eeprom'
                              ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                              : 'bg-sky-500/10 text-sky-300 border-sky-500/30'
                          }`}
                        >
                          {v.memoryLocation === 'sram' && `SRAM @ 0x${(v.sramAddress || 0x0100).toString(16).toUpperCase()}`}
                          {v.memoryLocation === 'progmem' && 'PROGMEM (Flash)'}
                          {v.memoryLocation === 'eeprom' && 'EEPROM'}
                          {v.memoryLocation === 'register' && `CPU Reg ${v.registerBinding || 'r16'}`}
                        </span>

                        <span>Méret: <strong className="text-white">{v.sizeBytes} B</strong></span>

                        <span className="truncate max-w-[140px]">
                          Érték: <strong className="text-amber-300 font-mono">{v.initialValue || '0'}</strong>
                        </span>

                        {v.isVolatile && (
                          <span className="px-1 py-0.2 text-[9px] bg-rose-500/20 text-rose-300 border border-rose-500/40 rounded-xs">
                            volatile
                          </span>
                        )}
                        {v.isConst && (
                          <span className="px-1 py-0.2 text-[9px] bg-blue-500/20 text-blue-300 border border-blue-500/40 rounded-xs">
                            const
                          </span>
                        )}
                      </div>

                      {/* Bottom Description or Validation Errors */}
                      {v.description && (
                        <div className="mt-1 text-[10px] text-slate-400 truncate">
                          {v.description}
                        </div>
                      )}

                      {!valStatus.isValid && (
                        <div className="mt-1.5 p-1.5 bg-rose-950/60 border border-rose-500/40 rounded-xs text-[10px] text-rose-300 space-y-0.5">
                          {valStatus.errors.map((err, i) => (
                            <div key={i} className="flex items-center gap-1">
                              <span>⚠️</span>
                              <span>{err}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* ------------------------------------------------------------- */}
          {/* RIGHT COLUMN: VARIABLE EDITOR & LIVE CODE PREVIEW (7 COLS) */}
          {/* ------------------------------------------------------------- */}
          <div className="lg:col-span-7 bg-[#12141A] p-4 flex flex-col h-full overflow-y-auto custom-scrollbar space-y-4">
            <div className="flex items-center justify-between border-b border-[#2A2D35] pb-2">
              <div className="flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-[#4ade80]" />
                <h3 className="font-bold text-xs sm:text-sm text-white uppercase tracking-wider">
                  {selectedId ? `Változó Szerkesztése: ${formName || 'Névtelen'}` : 'Új Változó Létrehozása'}
                </h3>
              </div>

              {selectedId && (
                <button
                  onClick={handleResetForm}
                  className="text-xs text-[#8A8D98] hover:text-[#4ade80] transition-colors cursor-pointer"
                >
                  + Új űrlap
                </button>
              )}
            </div>

            {/* FORM INPUTS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {/* Variable Name (Identifier) */}
              <div className="space-y-1 sm:col-span-2">
                <label className="block text-[#8A8D98] font-bold uppercase text-[10px] flex items-center justify-between">
                  <span>Változó Neve (Azonosító) *</span>
                  <span className="text-slate-400 font-normal text-[10px]">pl. sensorValue, timerCount, isReady</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="pl. ledCounter, bufferIndex..."
                    className={`w-full px-3 py-1.5 bg-[#161920] border text-[#E0E0E6] rounded-xs font-mono text-xs focus:outline-none transition-colors ${
                      formName.trim() === ''
                        ? 'border-[#3A3F4B] focus:border-[#4ade80]'
                        : formValidation.errors.some((e) => e.field === 'name')
                        ? 'border-rose-500 bg-rose-950/20'
                        : 'border-emerald-500/80 bg-emerald-950/10'
                    }`}
                  />
                  <div className="absolute right-2.5 top-2 text-xs">
                    {formName.trim() !== '' &&
                      (formValidation.errors.some((e) => e.field === 'name') ? (
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                      ) : (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ))}
                  </div>
                </div>

                {/* Name Validation Error Message */}
                {formValidation.errors
                  .filter((e) => e.field === 'name')
                  .map((err, i) => (
                    <div key={i} className="text-[10px] text-rose-400 flex items-center gap-1 font-sans">
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      <span>{err.message}</span>
                    </div>
                  ))}
              </div>

              {/* Data Type */}
              <div className="space-y-1">
                <label className="block text-[#8A8D98] font-bold uppercase text-[10px]">
                  Adattípus (Data Type)
                </label>
                <select
                  value={formType}
                  onChange={(e) => {
                    const newType = e.target.value as VariableDataType;
                    setFormType(newType);
                    // Set friendly default value for this type
                    const meta = DATA_TYPE_METADATA[newType];
                    if (meta) {
                      setFormInitialValue(meta.defaultValue);
                    }
                  }}
                  className="w-full px-2.5 py-1.5 bg-[#161920] border border-[#3A3F4B] focus:border-[#4ade80] text-[#E0E0E6] rounded-xs text-xs cursor-pointer focus:outline-none"
                >
                  <option value="uint8_t">uint8_t (0 .. 255, 1B)</option>
                  <option value="int8_t">int8_t (-128 .. 127, 1B)</option>
                  <option value="uint16_t">uint16_t (0 .. 65535, 2B)</option>
                  <option value="int16_t">int16_t (-32768 .. 32767, 2B)</option>
                  <option value="uint32_t">uint32_t (32-bit DWord, 4B)</option>
                  <option value="int32_t">int32_t (32-bit long, 4B)</option>
                  <option value="bool">bool (true / false, 1B)</option>
                  <option value="float">float (32-bit Lebegőpontos, 4B)</option>
                  <option value="char">char (ASCII Karakter, 1B)</option>
                  <option value="string">string (Karakterlánc)</option>
                  <option value="array">array (uint8_t Tömb)</option>
                </select>
                <div className="text-[10px] text-[#8A8D98]">
                  Tartomány: {DATA_TYPE_METADATA[formType]?.rangeHu}
                </div>
              </div>

              {/* Initial Value */}
              <div className="space-y-1">
                <label className="block text-[#8A8D98] font-bold uppercase text-[10px]">
                  Kezdőérték (Initial Value) *
                </label>
                <input
                  type="text"
                  value={formInitialValue}
                  onChange={(e) => setFormInitialValue(e.target.value)}
                  placeholder="pl. 0, 42, 0x2A, true..."
                  className={`w-full px-3 py-1.5 bg-[#161920] border text-[#E0E0E6] rounded-xs font-mono text-xs focus:outline-none transition-colors ${
                    formValidation.errors.some((e) => e.field === 'initialValue')
                      ? 'border-rose-500 bg-rose-950/20'
                      : 'border-[#3A3F4B] focus:border-[#4ade80]'
                  }`}
                />
                {formValidation.errors
                  .filter((e) => e.field === 'initialValue')
                  .map((err, i) => (
                    <div key={i} className="text-[10px] text-rose-400 flex items-center gap-1 font-sans">
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      <span>{err.message}</span>
                    </div>
                  ))}
              </div>

              {/* If Array: Array Size */}
              {formType === 'array' && (
                <div className="space-y-1 sm:col-span-2">
                  <label className="block text-[#8A8D98] font-bold uppercase text-[10px]">
                    Tömb Mérete (Elemek Száma, 1 - 512 Bájt)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={512}
                    value={formArraySize}
                    onChange={(e) => setFormArraySize(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="w-full px-3 py-1.5 bg-[#161920] border border-[#3A3F4B] focus:border-[#4ade80] text-[#E0E0E6] rounded-xs text-xs font-mono focus:outline-none"
                  />
                </div>
              )}

              {/* Memory Location */}
              <div className="space-y-1 sm:col-span-2">
                <label className="block text-[#8A8D98] font-bold uppercase text-[10px]">
                  Memóriaterület / Elhelyezkedés (Memory Location)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'sram', label: 'SRAM (RAM)', desc: '0x0100 címzés' },
                    { id: 'progmem', label: 'PROGMEM', desc: 'Flash ROM (0 B RAM)' },
                    { id: 'eeprom', label: 'EEPROM', desc: '1024B Nem-felejtő' },
                    { id: 'register', label: 'CPU Regiszter', desc: 'r16 - r31 kötés' },
                  ].map((loc) => (
                    <button
                      key={loc.id}
                      type="button"
                      onClick={() => {
                        setFormMemoryLocation(loc.id as VariableMemoryLocation);
                        if (loc.id === 'progmem') setFormIsConst(true);
                      }}
                      className={`p-2 rounded-xs border text-left transition-all cursor-pointer ${
                        formMemoryLocation === loc.id
                          ? 'bg-[#4ade80]/15 border-[#4ade80] text-white shadow-[1px_1px_0px_#000]'
                          : 'bg-[#161920] border-[#2A2D35] text-[#8A8D98] hover:text-[#E0E0E6]'
                      }`}
                    >
                      <div className="font-bold text-xs">{loc.label}</div>
                      <div className="text-[9px] text-[#8A8D98]">{loc.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* If Register: Register Selector */}
              {formMemoryLocation === 'register' && (
                <div className="space-y-1 sm:col-span-2">
                  <label className="block text-[#8A8D98] font-bold uppercase text-[10px]">
                    Cél Munkaregiszter Kötés (AVR Felső Regiszterek: r16 .. r31)
                  </label>
                  <select
                    value={formRegister}
                    onChange={(e) => setFormRegister(e.target.value as AvrRegister)}
                    className="w-full px-2.5 py-1.5 bg-[#161920] border border-[#3A3F4B] focus:border-[#4ade80] text-[#E0E0E6] rounded-xs text-xs cursor-pointer focus:outline-none font-mono"
                  >
                    {[
                      'r16', 'r17', 'r18', 'r19', 'r20', 'r21', 'r22', 'r23',
                      'r24', 'r25', 'r26', 'r27', 'r28', 'r29', 'r30', 'r31'
                    ].map((reg) => (
                      <option key={reg} value={reg}>
                        {reg} {reg === 'r16' ? '(Standard Munkaregiszter)' : reg === 'r26' || reg === 'r27' ? '(X-Pointer)' : reg === 'r30' || reg === 'r31' ? '(Z-Pointer)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Scope & Qualifiers */}
              <div className="space-y-1">
                <label className="block text-[#8A8D98] font-bold uppercase text-[10px]">
                  Érvényességi Kör (Scope)
                </label>
                <select
                  value={formScope}
                  onChange={(e) => setFormScope(e.target.value as VariableScope)}
                  className="w-full px-2.5 py-1.5 bg-[#161920] border border-[#3A3F4B] focus:border-[#4ade80] text-[#E0E0E6] rounded-xs text-xs cursor-pointer focus:outline-none"
                >
                  <option value="global">Globális (Mindenhol elérhető)</option>
                  <option value="setup">Setup (Kezdeti beállítás)</option>
                  <option value="loop">Loop (Főciklus lokális)</option>
                  <option value="isr_volatile">ISR Megszakítás (Volatile)</option>
                </select>
              </div>

              {/* Flags: volatile & const */}
              <div className="space-y-1 flex flex-col justify-end">
                <div className="flex items-center gap-4 py-1.5">
                  <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formIsVolatile}
                      onChange={(e) => setFormIsVolatile(e.target.checked)}
                      className="accent-[#4ade80]"
                    />
                    <span>volatile (Megszakításbiztos)</span>
                  </label>

                  <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formIsConst}
                      onChange={(e) => setFormIsConst(e.target.checked)}
                      className="accent-[#4ade80]"
                    />
                    <span>const (Csak-olvasható)</span>
                  </label>
                </div>
              </div>

              {/* Description / Comment */}
              <div className="space-y-1 sm:col-span-2">
                <label className="block text-[#8A8D98] font-bold uppercase text-[10px]">
                  Magyarázat / Megjegyzés (Opcionális)
                </label>
                <input
                  type="text"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="pl. Mért analóg hőmérséklet értéke Celsiusban..."
                  className="w-full px-3 py-1.5 bg-[#161920] border border-[#3A3F4B] focus:border-[#4ade80] text-[#E0E0E6] rounded-xs text-xs focus:outline-none"
                />
              </div>
            </div>

            {/* LIVE VALIDATION SUMMARY BANNER */}
            <div
              className={`p-3 rounded-xs border text-xs ${
                formValidation.isValid
                  ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-300'
                  : 'bg-rose-950/30 border-rose-500/60 text-rose-300'
              }`}
            >
              <div className="flex items-center gap-2 font-bold mb-1">
                {formValidation.isValid ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Érvényes Változó Definíció</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-4 h-4 text-rose-400 animate-pulse" />
                    <span>Validációs Figyelmeztetések ({formValidation.errors.length} hiba):</span>
                  </>
                )}
              </div>

              {formValidation.errors.length > 0 && (
                <ul className="space-y-1 text-[11px] list-disc list-inside font-sans">
                  {formValidation.errors.map((err, i) => (
                    <li key={i}>{err.message}</li>
                  ))}
                </ul>
              )}

              {formValidation.warnings.length > 0 && (
                <ul className="mt-1 space-y-1 text-[10px] text-amber-300 list-disc list-inside font-sans">
                  {formValidation.warnings.map((warn, i) => (
                    <li key={i}>⚠️ {warn.message}</li>
                  ))}
                </ul>
              )}
            </div>

            {/* LIVE CODE GENERATION PREVIEW */}
            <div className="p-3 bg-[#0A0C10] border border-[#2A2D35] rounded-xs space-y-2">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 font-bold text-[#8A8D98] uppercase text-[10px]">
                  <FileCode className="w-3.5 h-3.5 text-[#4ade80]" />
                  <span>Generált Forráskód Előnézet:</span>
                </div>

                <div className="flex items-center bg-[#161920] p-0.5 rounded-xs border border-[#2A2D35]">
                  <button
                    onClick={() => setPreviewTab('c')}
                    className={`px-2 py-0.5 text-[10px] font-bold rounded-xs transition-colors ${
                      previewTab === 'c' ? 'bg-[#4ade80] text-black' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Arduino C
                  </button>
                  <button
                    onClick={() => setPreviewTab('asm')}
                    className={`px-2 py-0.5 text-[10px] font-bold rounded-xs transition-colors ${
                      previewTab === 'asm' ? 'bg-[#4ade80] text-black' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    AVR Assembly (.S)
                  </button>
                </div>
              </div>

              <pre className="p-2.5 bg-[#050608] border border-[#1E2129] rounded-xs text-[11px] font-mono text-emerald-400 overflow-x-auto whitespace-pre">
                {previewTab === 'c'
                  ? generateVariableCDeclaration(draftVariable as VariableDefinition)
                  : generateVariableAsmDeclaration(draftVariable as VariableDefinition).join('\n')}
              </pre>
            </div>

            {/* FORM ACTION BUTTONS */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#2A2D35]">
              <button
                onClick={handleResetForm}
                className="px-3 py-1.5 bg-[#161920] hover:bg-[#2A2D35] text-slate-300 hover:text-white border border-[#3A3F4B] text-xs font-bold rounded-xs transition-colors cursor-pointer"
              >
                Mégse
              </button>

              <button
                id="btn-save-variable"
                onClick={handleSaveVariable}
                disabled={!formValidation.isValid}
                className={`flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold rounded-xs shadow-[2px_2px_0px_#000] transition-all cursor-pointer ${
                  formValidation.isValid
                    ? 'bg-[#4ade80] hover:bg-[#3ec973] text-black'
                    : 'bg-[#2A2D35] text-slate-500 cursor-not-allowed opacity-60'
                }`}
              >
                <Check className="w-3.5 h-3.5" />
                <span>{selectedId ? 'Változó Módosítása' : 'Változó Mentése'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
