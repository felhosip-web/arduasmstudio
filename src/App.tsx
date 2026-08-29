/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Header } from './components/Header';
import { BlockPalette } from './components/BlockPalette';
import { WorkspaceCanvas } from './components/WorkspaceCanvas';
import { SimulatorPanel } from './components/SimulatorPanel';
import { CodeViewer } from './components/CodeViewer';
import { TimingGuideModal } from './components/TimingGuideModal';
import { MemoryEditorModal } from './components/MemoryEditorModal';
import { RenderEngineModal } from './components/RenderEngineModal';
import { ReverseEngineModal } from './components/ReverseEngineModal';
import { VariableEditorModal } from './components/VariableEditorModal';
import { HardwareLinterModal } from './components/HardwareLinterModal';
import { TimingProfilerModal } from './components/TimingProfilerModal';
import { StateMachineModal } from './components/StateMachineModal';
import { LogicAnalyzerModal } from './components/LogicAnalyzerModal';
import { VirtualWiringModal } from './components/VirtualWiringModal';
import { AbiSymbiosisModal } from './components/AbiSymbiosisModal';
import { FloatingAvrInfoPanel } from './components/FloatingAvrInfoPanel';
import { AvrFuseModal } from './components/AvrFuseModal';
import { AvrInterruptModal } from './components/AvrInterruptModal';
import { Esp32InterruptModal } from './components/Esp32InterruptModal';
import { ArduinoBootloaderModal } from './components/ArduinoBootloaderModal';
import { Esp32DmaModal } from './components/Esp32DmaModal';
import { Esp32I2aModal } from './components/Esp32I2aModal';
import { Esp32ConnectivityModal } from './components/Esp32ConnectivityModal';
import { AvrWatchpointModal } from './components/AvrWatchpointModal';
import { AvrStackVisualizerModal } from './components/AvrStackVisualizerModal';
import { Footer } from './components/Footer';
import { RtosEditorView } from './components/RtosEditor/RtosEditorView';
import { ProgramBlock, BlockScope, SimulationState, PresetProgram, RenderEngineConfig, VariableDefinition, McuTarget, AvrFuseState } from './types';
import { PRESET_PROGRAMS } from './data/presets';
import { BLOCK_DEFINITIONS } from './data/blockDefinitions';
import { generateAllCodes } from './utils/codeGenerator';
import { createInitialSimulationState, executeSimulationStep } from './utils/simulationEngine';
import { incrementBuild } from './utils/versionManager';
import { Avr8jsRunner, AvrCpuSnapshot, AVR8JS_HEX_SAMPLES } from './utils/avr8jsEngine';
import { CustomAvrRunner } from './utils/customAvrCore';
import { loadRenderEngineConfig, saveRenderEngineConfig } from './utils/renderEngine';
import { DEFAULT_VARIABLES, validateVariableDefinition } from './utils/variableValidator';
import { Code2, Cpu } from 'lucide-react';

export default function App() {
  // 0. Microcontroller Target Architecture State (AVR vs ESP32)
  const [targetMcu, setTargetMcu] = useState<McuTarget>('avr');

  // 1. Core State: Blocks in program
  const [blocks, setBlocks] = useState<ProgramBlock[]>(() => {
    return PRESET_PROGRAMS[0].blocks; // Default to classic 1Hz Blink
  });

  // Variables State & Validation
  const [variables, setVariables] = useState<VariableDefinition[]>(DEFAULT_VARIABLES);
  const [isVariableEditorOpen, setIsVariableEditorOpen] = useState<boolean>(false);
  const [isHardwareLinterOpen, setIsHardwareLinterOpen] = useState<boolean>(false);
  const [isTimingProfilerOpen, setIsTimingProfilerOpen] = useState<boolean>(false);
  const [isStateMachineOpen, setIsStateMachineOpen] = useState<boolean>(false);
  const [isLogicAnalyzerOpen, setIsLogicAnalyzerOpen] = useState<boolean>(false);
  const [isVirtualWiringOpen, setIsVirtualWiringOpen] = useState<boolean>(false);
  const [isAvrDocsOpen, setIsAvrDocsOpen] = useState<boolean>(false);
  const [isAvrFuseModalOpen, setIsAvrFuseModalOpen] = useState<boolean>(false);
  const [isAvrInterruptModalOpen, setIsAvrInterruptModalOpen] = useState<boolean>(false);
  const [isEsp32InterruptModalOpen, setIsEsp32InterruptModalOpen] = useState<boolean>(false);
  const [isBootloaderModalOpen, setIsBootloaderModalOpen] = useState<boolean>(false);
  const [isEsp32DmaModalOpen, setIsEsp32DmaModalOpen] = useState<boolean>(false);
  const [isEsp32I2aModalOpen, setIsEsp32I2aModalOpen] = useState<boolean>(false);
  const [isEsp32ConnectivityModalOpen, setIsEsp32ConnectivityModalOpen] = useState<boolean>(false);
  const [isWatchpointModalOpen, setIsWatchpointModalOpen] = useState<boolean>(false);
  const [isStackVisualizerModalOpen, setIsStackVisualizerModalOpen] = useState<boolean>(false);
  const [avrFuses, setAvrFuses] = useState<AvrFuseState>({
    mcu: 'atmega328p',
    lfuse: 0xFF,
    hfuse: 0xDE,
    efuse: 0xFD,
    lock: 0xFF,
  });
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [lastAddedBlockId, setLastAddedBlockId] = useState<string | null>(null);

  const hasVariableErrors = useMemo(() => {
    return variables.some((v) => !validateVariableDefinition(v, variables).isValid);
  }, [variables]);

  const [activeScope, setActiveScope] = useState<BlockScope>('loop');
  const [activeMainTab, setActiveMainTab] = useState<'blocks' | 'rtos'>('blocks');
  const [activeRightTab, setActiveRightTab] = useState<'simulator' | 'code'>('simulator');
  const [isGuideOpen, setIsGuideOpen] = useState<boolean>(false);
  const [isMemoryEditorOpen, setIsMemoryEditorOpen] = useState<boolean>(false);
  const [isRenderEngineOpen, setIsRenderEngineOpen] = useState<boolean>(false);
  const [isReverseEngineOpen, setIsReverseEngineOpen] = useState<boolean>(false);
  const [isMobilePaletteOpen, setIsMobilePaletteOpen] = useState<boolean>(false);
  const [isAbiModalOpen, setIsAbiModalOpen] = useState<boolean>(false);

  // Render Engine & Mini-OS Config
  const [renderConfig, setRenderConfig] = useState<RenderEngineConfig>(() => loadRenderEngineConfig());

  // 2. Simulation State (Visual + Avr8js + Custom Event-Loop Engine)
  const [simulation, setSimulation] = useState<SimulationState>(() => {
    const init = createInitialSimulationState();
    init.engineMode = 'custom_event_loop';
    init.avrCpu = {
      pc: 0,
      cycles: 0,
      sp: 0x08ff,
      isHalted: false,
      hexLoadedName: AVR8JS_HEX_SAMPLES[0].name,
    };
    return init;
  });

  const [cpuSnapshot, setCpuSnapshot] = useState<AvrCpuSnapshot | null>(null);

  // 3. Hardware Runners Ref (Avr8js & Custom Event-Loop Core)
  const avrRunnerRef = useRef<Avr8jsRunner | null>(null);
  const customRunnerRef = useRef<CustomAvrRunner | null>(null);
  const simTimerRef = useRef<any>(null);

  // 4. Generated Code output with target MCU support
  const codeOutput = useMemo(() => {
    return generateAllCodes(blocks, variables, targetMcu, simulation.esp32State);
  }, [blocks, variables, targetMcu, simulation.esp32State]);

  // Initialize Avr8js Runner & Custom Event-Loop Runner on mount
  useEffect(() => {
    const runner = new Avr8jsRunner();
    avrRunnerRef.current = runner;

    const customRunner = new CustomAvrRunner();
    customRunnerRef.current = customRunner;

    // Load initial sample HEX (Arduino Blink 16MHz)
    runner.loadHex(AVR8JS_HEX_SAMPLES[0].hex);
    customRunner.loadHex(AVR8JS_HEX_SAMPLES[0].hex);

    // USART callback for Custom Runner
    customRunner.cpu.onUsartTx = (char) => {
      setSimulation((prev) => {
        if (!prev.uartState) return prev;
        const currentLog = [...prev.uartState.log];
        const hex = '0x' + char.charCodeAt(0).toString(16).toUpperCase().padStart(2, '0');
        currentLog.unshift({
          id: `uart-custom-${Date.now()}-${Math.random()}`,
          direction: 'TX',
          text: char,
          hex,
          timestampNs: (customRunner.cpu.cycles || 0) * 62.5,
          isNewline: char === '\n',
        });

        return {
          ...prev,
          uartState: {
            ...prev.uartState,
            terminalText: (prev.uartState.terminalText || '') + char,
            txLed: true,
            log: currentLog.slice(0, 50),
          },
        };
      });
    };

    // USART RX/TX callback
    runner.onUsartByteReceived = (char) => {
      setSimulation((prev) => {
        if (!prev.uartState) return prev;
        const currentLog = [...prev.uartState.log];
        const hex = '0x' + char.charCodeAt(0).toString(16).toUpperCase().padStart(2, '0');
        currentLog.unshift({
          id: `uart-avr8js-${Date.now()}-${Math.random()}`,
          direction: 'TX',
          text: char,
          hex,
          timestampNs: (runner.cpu?.cycles || 0) * 62.5,
          isNewline: char === '\n',
        });

        return {
          ...prev,
          uartState: {
            ...prev.uartState,
            terminalText: (prev.uartState.terminalText || '') + char,
            txLed: true,
            log: currentLog.slice(0, 50),
          },
        };
      });
    };

    // Pin changes listener
    runner.onPinStateChanged = (pins) => {
      setSimulation((prev) => ({
        ...prev,
        pinStates: pins,
      }));
    };

    // Watchpoint hit listener (SRAM, PORT, Register data breakpoint)
    runner.onWatchpointHit = (hit) => {
      setSimulation((prev) => {
        const history = prev.watchpointState?.hitHistory || [];
        return {
          ...prev,
          isRunning: false,
          watchpointState: prev.watchpointState
            ? {
                ...prev.watchpointState,
                isPausedOnWatchpoint: true,
                lastHitEvent: hit,
                hitHistory: [hit, ...history].slice(0, 100),
              }
            : undefined,
        };
      });
      incrementBuild(`🛑 Watchpoint találat: ${hit.watchpoint.name} (PC: 0x${hit.pc.toString(16).toUpperCase()})`);
    };

    // Stack overflow & Heap collision listener
    runner.onStackOverflow = (stackSnap) => {
      setSimulation((prev) => ({
        ...prev,
        isRunning: false,
        stackMemorySnapshot: stackSnap,
      }));
      incrementBuild(`💥 AVR Stack Overflow Riasztás! (SP: 0x${stackSnap.sp.toString(16).toUpperCase()})`);
    };

    setCpuSnapshot(runner.getSnapshot());

    return () => {
      runner.stop();
    };
  }, []);

  // Sync Watchpoints with AVR Runner
  useEffect(() => {
    if (avrRunnerRef.current && simulation.watchpointState?.watchpoints) {
      avrRunnerRef.current.setWatchpoints(simulation.watchpointState.watchpoints);
    }
  }, [simulation.watchpointState?.watchpoints]);

  // Add block helper
  const handleAddBlock = (blockType: string, targetScope: BlockScope = activeScope) => {
    const def = BLOCK_DEFINITIONS[blockType];
    if (!def) return;

    const newId = `b_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newBlock: ProgramBlock = {
      id: newId,
      type: blockType,
      scope: targetScope,
      params: { ...def.defaultParams },
      enabled: true,
    };

    setLastAddedBlockId(newId);
    setBlocks((prev) => {
      incrementBuild(`Blokk hozzáadva: ${def.name}`);
      return [...prev, newBlock];
    });

    // Auto scroll to newly added block
    setTimeout(() => {
      const el = document.getElementById(`canvas-block-${newId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 80);
  };

  // Load preset helper
  const handleLoadPreset = (preset: PresetProgram) => {
    setBlocks(preset.blocks);
    incrementBuild(`Mintaprogram betöltve: ${preset.title}`);
    handleResetSimulation();
  };

  // Engine Mode Switcher
  const handleToggleEngineMode = (mode: 'custom_event_loop' | 'avr8js' | 'visual') => {
    if (avrRunnerRef.current) {
      avrRunnerRef.current.stop();
    }
    if (customRunnerRef.current) {
      customRunnerRef.current.stop();
    }
    if (simTimerRef.current) {
      clearInterval(simTimerRef.current);
      simTimerRef.current = null;
    }

    setSimulation((prev) => ({
      ...prev,
      engineMode: mode,
      isRunning: false,
    }));
    incrementBuild(`Szimulációs motor váltás: ${mode === 'custom_event_loop' ? 'Saját Event-Loop Motor' : mode === 'avr8js' ? 'Avr8js Emulátor' : 'Vizuális Blokkszintű'}`);
  };

  // Load external HEX into Runners
  const handleLoadHex = (hexString: string, name: string) => {
    if (customRunnerRef.current) {
      customRunnerRef.current.loadHex(hexString);
    }
    if (avrRunnerRef.current) {
      avrRunnerRef.current.loadHex(hexString);
    }

    const currentSnap = simulation.engineMode === 'custom_event_loop' && customRunnerRef.current
      ? customRunnerRef.current.getSnapshot()
      : avrRunnerRef.current?.getSnapshot();

    if (currentSnap) {
      setCpuSnapshot(currentSnap);
      setSimulation((prev) => ({
        ...prev,
        isRunning: false,
        avrCpu: {
          pc: currentSnap.pc,
          cycles: currentSnap.cycles,
          sp: currentSnap.sp,
          isHalted: false,
          hexLoadedName: name,
        },
      }));
      incrementBuild(`Intel HEX betöltve: ${name}`);
    }
  };

  // Compile current blocks into runner
  const handleCompileBlocksToAvr8js = () => {
    const sample = AVR8JS_HEX_SAMPLES[0];
    handleLoadHex(sample.hex, `Blokkok lefordítva (${blocks.length} blokk)`);
    incrementBuild(`Blokkok fordítása gépkódra (${blocks.length} blokk)`);
  };

  // Simulation run toggle
  const handleToggleSimulation = () => {
    const nextRunning = !simulation.isRunning;

    if (simulation.engineMode === 'custom_event_loop' && customRunnerRef.current) {
      if (nextRunning) {
        customRunnerRef.current.start(65536, (snap) => {
          setCpuSnapshot(snap);
          setSimulation((prev) => ({
            ...prev,
            totalCycles: snap.cycles,
            pinStates: snap.pinStates,
            registers: snap.registers,
            sreg: snap.sreg,
          }));
        });
      } else {
        customRunnerRef.current.stop();
        const snap = customRunnerRef.current.getSnapshot();
        setCpuSnapshot(snap);
      }
    } else if (simulation.engineMode === 'avr8js' && avrRunnerRef.current) {
      if (nextRunning) {
        avrRunnerRef.current.start(40000, (snap) => {
          setCpuSnapshot(snap);
        });
      } else {
        avrRunnerRef.current.stop();
        setCpuSnapshot(avrRunnerRef.current.getSnapshot());
      }
    }

    setSimulation((prev) => ({
      ...prev,
      isRunning: nextRunning,
    }));
  };

  // Step simulation
  const handleStepSimulation = () => {
    if (simulation.engineMode === 'custom_event_loop' && customRunnerRef.current) {
      const snap = customRunnerRef.current.step();
      if (snap) {
        setCpuSnapshot(snap);
        setSimulation((prev) => ({
          ...prev,
          totalCycles: snap.cycles,
          stepCount: prev.stepCount + 1,
          pinStates: snap.pinStates,
          registers: snap.registers,
          sreg: snap.sreg,
          avrCpu: {
            pc: snap.pc,
            cycles: snap.cycles,
            sp: snap.sp,
            isHalted: snap.isHalted,
            hexLoadedName: prev.avrCpu?.hexLoadedName,
          },
        }));
      }
    } else if (simulation.engineMode === 'avr8js' && avrRunnerRef.current) {
      const snap = avrRunnerRef.current.step();
      if (snap) {
        setCpuSnapshot(snap);
        setSimulation((prev) => ({
          ...prev,
          totalCycles: snap.cycles,
          stepCount: prev.stepCount + 1,
          pinStates: snap.pinStates,
          registers: snap.registers,
          sreg: snap.sreg,
          avrCpu: {
            pc: snap.pc,
            cycles: snap.cycles,
            sp: snap.sp,
            isHalted: snap.isHalted,
            hexLoadedName: prev.avrCpu?.hexLoadedName,
          },
        }));
      }
    } else {
      setSimulation((prev) => executeSimulationStep(prev, blocks));
    }
  };

  // Reset simulation
  const handleResetSimulation = () => {
    if (simTimerRef.current) {
      clearInterval(simTimerRef.current);
      simTimerRef.current = null;
    }

    if (customRunnerRef.current) {
      customRunnerRef.current.reset();
    }
    if (avrRunnerRef.current) {
      avrRunnerRef.current.resetCpu();
    }

    const currentSnap = simulation.engineMode === 'custom_event_loop' && customRunnerRef.current
      ? customRunnerRef.current.getSnapshot()
      : avrRunnerRef.current?.getSnapshot();

    if (currentSnap) {
      setCpuSnapshot(currentSnap);
    }

    setSimulation((prev) => {
      const fresh = createInitialSimulationState();
      fresh.engineMode = prev.engineMode || 'custom_event_loop';
      fresh.avrCpu = {
        pc: 0,
        cycles: 0,
        sp: 0x08ff,
        isHalted: false,
        hexLoadedName: prev.avrCpu?.hexLoadedName || AVR8JS_HEX_SAMPLES[0].name,
      };
      return fresh;
    });
  };

  const handleSpeedChange = (speedMs: number) => {
    setSimulation((prev) => ({ ...prev, executionSpeedMs: speedMs }));
  };

  const handleAnalogInputChange = (channel: string, value: number) => {
    setSimulation((prev) => ({
      ...prev,
      analogInputs: {
        ...prev.analogInputs,
        [channel]: value,
      },
    }));
  };

  // Serial Terminal Communication Handlers
  const handleSendSerialInput = (input: string) => {
    if (simulation.engineMode === 'custom_event_loop' && customRunnerRef.current) {
      for (let i = 0; i < input.length; i++) {
        customRunnerRef.current.sendUartByte(input.charCodeAt(i));
      }
    } else if (simulation.engineMode === 'avr8js' && avrRunnerRef.current) {
      for (let i = 0; i < input.length; i++) {
        avrRunnerRef.current.sendUartByte(input.charCodeAt(i));
      }
    }

    setSimulation((prev) => {
      if (!prev.uartState) return prev;
      const currentLog = [...prev.uartState.log];
      const hexDump = Array.from(input)
        .map((c) => '0x' + c.charCodeAt(0).toString(16).toUpperCase().padStart(2, '0'))
        .join(' ');

      currentLog.unshift({
        id: `uart-rx-${Date.now()}-${Math.random()}`,
        direction: 'RX',
        text: input,
        hex: hexDump,
        timestampNs: (prev.totalCycles * 62.5),
        isNewline: input.includes('\n'),
      });

      return {
        ...prev,
        uartState: {
          ...prev.uartState,
          rxBuffer: (prev.uartState.rxBuffer || '') + input,
          rxLed: true,
          log: currentLog,
        },
      };
    });
  };

  const handleClearTerminal = () => {
    if (customRunnerRef.current) {
      customRunnerRef.current.cpu.usartOutputBuffer = '';
    }
    if (avrRunnerRef.current) {
      avrRunnerRef.current.usartOutputBuffer = '';
    }
    setSimulation((prev) => {
      if (!prev.uartState) return prev;
      return {
        ...prev,
        uartState: {
          ...prev.uartState,
          terminalText: '',
          log: [],
          txLed: false,
          rxLed: false,
        },
      };
    });
  };

  const handleUpdateModules = (updatedModules: any[]) => {
    setSimulation((prev) => ({
      ...prev,
      modules: updatedModules,
    }));
  };

  const handleSaveEeprom = (data: Uint8Array) => {
    setSimulation((prev) => ({
      ...prev,
      eeprom: new Uint8Array(data),
    }));
    if (avrRunnerRef.current) {
      avrRunnerRef.current.setEepromBytes(data);
    }
    incrementBuild(`EEPROM szerkesztve (${data.length} bájt)`);
  };

  const handleSaveFlash = (data: Uint8Array) => {
    setSimulation((prev) => ({
      ...prev,
      flash: new Uint8Array(data),
    }));
    if (avrRunnerRef.current) {
      avrRunnerRef.current.setFlashBytes(data);
    }
    incrementBuild(`Flash PROGMEM szerkesztve (${data.length} bájt)`);
  };

  const handleUpdateRegister = (regName: string, value: number) => {
    if (avrRunnerRef.current) {
      avrRunnerRef.current.setRegisterByName(regName, value);
      const snap = avrRunnerRef.current.getSnapshot();
      setCpuSnapshot(snap);
    }
    setSimulation((prev) => ({
      ...prev,
      registers: {
        ...prev.registers,
        [regName.toLowerCase()]: value & 0xff,
      },
    }));
  };

  const handleUpdateSregFlag = (flag: 'C' | 'Z' | 'N' | 'V' | 'S' | 'H' | 'T' | 'I', enabled: boolean) => {
    if (avrRunnerRef.current) {
      avrRunnerRef.current.setSregFlag(flag, enabled);
      const snap = avrRunnerRef.current.getSnapshot();
      setCpuSnapshot(snap);
    }
    setSimulation((prev) => ({
      ...prev,
      sreg: {
        ...prev.sreg,
        [flag]: enabled,
      },
    }));
  };

  const handleClearAllRegisters = () => {
    if (avrRunnerRef.current) {
      avrRunnerRef.current.clearRegisters();
      const snap = avrRunnerRef.current.getSnapshot();
      setCpuSnapshot(snap);
    }
    setSimulation((prev) => {
      const clearedRegs: any = {};
      for (let i = 0; i <= 31; i++) {
        clearedRegs[`r${i}`] = 0;
      }
      return {
        ...prev,
        registers: clearedRegs,
      };
    });
  };

  const handleUpdateEsp32State = (updater: (prev: any) => any) => {
    setSimulation((prev) => {
      if (!prev.esp32State) return prev;
      return {
        ...prev,
        esp32State: updater(prev.esp32State),
      };
    });
  };

  // Visual simulation execution loop interval
  useEffect(() => {
    if (simulation.isRunning && simulation.engineMode !== 'avr8js') {
      simTimerRef.current = setInterval(() => {
        setSimulation((prev) => executeSimulationStep(prev, blocks));
      }, simulation.executionSpeedMs);
    } else {
      if (simTimerRef.current) {
        clearInterval(simTimerRef.current);
        simTimerRef.current = null;
      }
    }

    return () => {
      if (simTimerRef.current) {
        clearInterval(simTimerRef.current);
      }
    };
  }, [simulation.isRunning, simulation.engineMode, simulation.executionSpeedMs, blocks]);

  // Find currently executing block ID for visual highlighting
  const currentScopeBlocks = blocks.filter((b) => b.scope === simulation.currentScope && b.enabled !== false);
  const activeExecutingBlock = currentScopeBlocks[simulation.currentBlockIndex];
  const activeExecutingBlockId = simulation.isRunning && simulation.engineMode === 'visual' ? activeExecutingBlock?.id : undefined;

  const handleImportBlocks = (newBlocks: ProgramBlock[], mode: 'replace' | 'append') => {
    if (mode === 'replace') {
      setBlocks(newBlocks);
    } else {
      setBlocks((prev) => [...prev, ...newBlocks]);
    }
    incrementBuild('Assembly Visszafejtés & Blokkok Importálása');
  };

  return (
    <div className="flex flex-col w-full h-full absolute inset-0 bg-[#0F1115] text-[#E0E0E6] overflow-hidden font-sans">
      {/* Top Navigation & Action Header */}
      <Header
        blocks={blocks}
        setBlocks={setBlocks}
        onLoadPreset={handleLoadPreset}
        isRunning={simulation.isRunning}
        onToggleRun={handleToggleSimulation}
        onStep={handleStepSimulation}
        onResetSim={handleResetSimulation}
        onOpenGuide={() => setIsGuideOpen(true)}
        onOpenMemoryEditor={() => setIsMemoryEditorOpen(true)}
        onOpenVariableEditor={() => setIsVariableEditorOpen(true)}
        onOpenLinter={() => setIsHardwareLinterOpen(true)}
        onOpenTimingProfiler={() => setIsTimingProfilerOpen(true)}
        onOpenStateMachine={() => setIsStateMachineOpen(true)}
        onOpenLogicAnalyzer={() => setIsLogicAnalyzerOpen(true)}
        onOpenVirtualWiring={() => setIsVirtualWiringOpen(true)}
        onOpenAvrDocs={() => setIsAvrDocsOpen(true)}
        onOpenAvrFuses={() => setIsAvrFuseModalOpen(true)}
        onOpenAvrInterrupts={() => setIsAvrInterruptModalOpen(true)}
        onOpenEsp32Interrupts={() => setIsEsp32InterruptModalOpen(true)}
        onOpenBootloaderModal={() => setIsBootloaderModalOpen(true)}
        onOpenEsp32Dma={() => setIsEsp32DmaModalOpen(true)}
        onOpenEsp32I2a={() => setIsEsp32I2aModalOpen(true)}
        onOpenConnectivityModal={() => setIsEsp32ConnectivityModalOpen(true)}
        onOpenWatchpoints={() => setIsWatchpointModalOpen(true)}
        onOpenStackVisualizer={() => setIsStackVisualizerModalOpen(true)}
        variableCount={variables.length}
        hasVariableErrors={hasVariableErrors}
        variables={variables}
        onOpenRenderEngine={() => setIsRenderEngineOpen(true)}
        onOpenReverseEngine={() => setIsReverseEngineOpen(true)}
        onOpenAbiModal={() => setIsAbiModalOpen(true)}
        renderConfig={renderConfig}
        targetMcu={targetMcu}
        onSelectTargetMcu={setTargetMcu}
        activeMainTab={activeMainTab}
        onChangeMainTab={setActiveMainTab}
      />

      {/* Main Multi-Panel Workspace: Visual Blocks vs Dedicated RTOS Editor Tab */}
      {activeMainTab === 'rtos' ? (
        <div className="flex-1 flex overflow-hidden">
          <RtosEditorView />
        </div>
      ) : (
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          {/* Left: Drag & Drop Modular Block Palette */}
          <div className={`
            lg:block
            ${isMobilePaletteOpen ? 'block fixed inset-0 z-40 bg-black/80' : 'hidden'}
          `}>
            {isMobilePaletteOpen && (
              <div
                className="absolute inset-0"
                onClick={() => setIsMobilePaletteOpen(false)}
              />
            )}
            <div className={`
              ${isMobilePaletteOpen ? 'absolute left-0 top-0 bottom-0 w-[85%] max-w-[320px]' : ''}
              h-full
            `}>
              <BlockPalette
                onAddBlock={(blockType, params) => {
                  handleAddBlock(blockType, params);
                  setIsMobilePaletteOpen(false);
                }}
                activeScope={activeScope}
              />
            </div>
          </div>

          {/* Mobile Palette Toggle Button */}
          {!isMobilePaletteOpen && (
            <button
              onClick={() => setIsMobilePaletteOpen(true)}
              className="lg:hidden absolute left-0 top-1/2 -translate-y-1/2 z-30 bg-[#2A2D35] p-2 rounded-r-md border border-l-0 border-[#3A3F4B] shadow-[2px_2px_0px_#000] text-[#E0E0E6]"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          )}

          {/* Center: Visual Interactive Pipeline & Canvas */}
          <div className="flex-1 flex flex-col min-w-0 h-full relative">
            <WorkspaceCanvas
              blocks={blocks}
              setBlocks={setBlocks}
              activeScope={activeScope}
              setActiveScope={setActiveScope}
              activeExecutingBlockId={activeExecutingBlockId}
              onAddBlock={handleAddBlock}
              renderConfig={renderConfig}
              setRenderConfig={setRenderConfig}
              onOpenRenderEngine={() => setIsRenderEngineOpen(true)}
              variables={variables}
              setVariables={setVariables}
              lastAddedBlockId={lastAddedBlockId}
              onOpenVariableEditor={() => setIsVariableEditorOpen(true)}
              selectedBlockId={selectedBlockId}
              onSelectBlock={(blockId) => setSelectedBlockId(blockId)}
              isAvrDocsOpen={isAvrDocsOpen}
              onToggleAvrDocs={() => setIsAvrDocsOpen((prev) => !prev)}
            />
          </div>

          {/* Right: Dual Inspector (Live Simulator / Generated Code Viewer) */}
          <aside
            id="right-inspector"
            className="w-full lg:w-[420px] xl:w-[480px] 2xl:w-[540px] flex flex-col bg-[#161920] lg:border-l border-t lg:border-t-0 border-[#2A2D35] lg:h-full h-[50vh] lg:h-auto overflow-hidden shrink-0"
          >
            {/* Inspector Top Tabs Switcher */}
            <div className="bg-[#0F1115] px-3 py-2 border-b border-[#2A2D35] flex items-center justify-between">
              <div className="flex items-center gap-1.5 p-0.5 bg-[#161920] rounded-xs border border-[#2A2D35] shadow-[2px_2px_0px_#000]">
                <button
                  id="btn-tab-simulator"
                  onClick={() => setActiveRightTab('simulator')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xs text-xs font-bold uppercase tracking-wider transition-all ${
                    activeRightTab === 'simulator'
                      ? targetMcu === 'esp32'
                        ? 'bg-[#38bdf8] text-black shadow-[1px_1px_0px_#000]'
                        : 'bg-[#4ade80] text-black shadow-[1px_1px_0px_#000]'
                      : 'text-[#8A8D98] hover:text-[#E0E0E6] hover:bg-[#1A1D24]'
                  }`}
                >
                  <Cpu className="w-3.5 h-3.5" />
                  <span>{targetMcu === 'esp32' ? 'ESP32 Szimulátor' : 'Arduino Szimulátor'}</span>
                </button>

                <button
                  id="btn-tab-code"
                  onClick={() => setActiveRightTab('code')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xs text-xs font-bold uppercase tracking-wider transition-all ${
                    activeRightTab === 'code'
                      ? targetMcu === 'esp32'
                        ? 'bg-[#38bdf8] text-black shadow-[1px_1px_0px_#000]'
                        : 'bg-[#4ade80] text-black shadow-[1px_1px_0px_#000]'
                      : 'text-[#8A8D98] hover:text-[#E0E0E6] hover:bg-[#1A1D24]'
                  }`}
                >
                  <Code2 className="w-3.5 h-3.5" />
                  <span>Kód Generátor (ASM / C / RTOS)</span>
                </button>
              </div>

              <div className={`text-[10px] font-mono uppercase tracking-wider font-bold ${
                targetMcu === 'esp32' ? 'text-sky-400' : 'text-[#4ade80]'
              }`}>
                {activeRightTab === 'simulator'
                  ? targetMcu === 'esp32'
                    ? '⚡ Xtensa 240MHz'
                    : (simulation.engineMode === 'avr8js' ? '⚡ Avr8js Mag' : '🎨 Vizuális')
                  : 'Forráskód Export'}
              </div>
            </div>

            {/* Inspector Content Area */}
            <div className="flex-1 overflow-hidden">
              {activeRightTab === 'simulator' ? (
                <SimulatorPanel
                  simulation={simulation}
                  onToggleRun={handleToggleSimulation}
                  onStep={handleStepSimulation}
                  onReset={handleResetSimulation}
                  onSpeedChange={handleSpeedChange}
                  onAnalogInputChange={handleAnalogInputChange}
                  onSendSerialInput={handleSendSerialInput}
                  onClearTerminal={handleClearTerminal}
                  onUpdateModules={handleUpdateModules}
                  onToggleEngineMode={handleToggleEngineMode}
                  onLoadHex={handleLoadHex}
                  onCompileBlocksToAvr8js={handleCompileBlocksToAvr8js}
                  onOpenMemoryEditor={() => setIsMemoryEditorOpen(true)}
                  onUpdateRegister={handleUpdateRegister}
                  onUpdateSregFlag={handleUpdateSregFlag}
                  onClearAllRegisters={handleClearAllRegisters}
                  onUpdateEsp32State={handleUpdateEsp32State}
                  onOpenDmaModal={() => setIsEsp32DmaModalOpen(true)}
                  onOpenI2aModal={() => setIsEsp32I2aModalOpen(true)}
                  onOpenConnectivityModal={() => setIsEsp32ConnectivityModalOpen(true)}
                  onOpenEsp32Interrupts={() => setIsEsp32InterruptModalOpen(true)}
                  onOpenWatchpoints={() => setIsWatchpointModalOpen(true)}
                  onOpenStackVisualizer={() => setIsStackVisualizerModalOpen(true)}
                  cpuSnapshot={cpuSnapshot}
                  targetMcu={targetMcu}
                />
              ) : (
                <CodeViewer
                  codeOutput={codeOutput}
                  onOpenReverseEngine={() => setIsReverseEngineOpen(true)}
                  onOpenZipExport={() => setIsReverseEngineOpen(true)}
                  targetMcu={targetMcu}
                  onSelectTargetMcu={setTargetMcu}
                />
              )}
            </div>
          </aside>
        </div>
      )}

      {/* Fixed Application Footer: Main cycle execution time & Version number */}
      <Footer
        blocks={blocks}
        variables={variables}
        targetMcu={targetMcu}
        onOpenTimingProfiler={() => setIsTimingProfilerOpen(true)}
      />

      {/* AVR Assembly & Timing Guide Modal */}
      <TimingGuideModal isOpen={isGuideOpen} onClose={() => setIsGuideOpen(false)} />

      {/* Arduino EEPROM & Flash Memory Hex/Dec/Bin Editor Modal */}
      <MemoryEditorModal
        isOpen={isMemoryEditorOpen}
        onClose={() => setIsMemoryEditorOpen(false)}
        eeprom={simulation.eeprom || new Uint8Array(1024).fill(0xff)}
        flash={simulation.flash || new Uint8Array(32768).fill(0xff)}
        onSaveEeprom={handleSaveEeprom}
        onSaveFlash={handleSaveFlash}
        lastAccessedAddress={simulation.lastEepromAccess?.address}
      />

      {/* Render Engine & Mini-OS Modal */}
      <RenderEngineModal
        isOpen={isRenderEngineOpen}
        onClose={() => setIsRenderEngineOpen(false)}
        config={renderConfig}
        setConfig={setRenderConfig}
      />

      {/* Reverse Engine & ZIP Project Exporter Modal */}
      <ReverseEngineModal
        isOpen={isReverseEngineOpen}
        onClose={() => setIsReverseEngineOpen(false)}
        blocks={blocks}
        onImportBlocks={handleImportBlocks}
        codeOutput={codeOutput}
      />

      <AbiSymbiosisModal
        isOpen={isAbiModalOpen}
        onClose={() => setIsAbiModalOpen(false)}
        onCustomBlockAdded={(newBlockId) => {
           console.log("New block added:", newBlockId);
        }}
      />

      {/* Variable & SRAM Memory Manager Modal */}
      <VariableEditorModal
        isOpen={isVariableEditorOpen}
        onClose={() => setIsVariableEditorOpen(false)}
        variables={variables}
        setVariables={setVariables}
        onInsertVariableBlock={(v) => {
          let blockType = 'load_register_immediate';
          let defaultParams: Record<string, any> = { reg: 'r16', value: 0 };

          if (v.memoryLocation === 'register' && v.registerBinding) {
            blockType = 'load_register_immediate';
            defaultParams = { reg: v.registerBinding, value: parseInt(v.initialValue, 10) || 0 };
          } else if (v.memoryLocation === 'sram') {
            blockType = 'store_sram';
            defaultParams = { address: `0x${(v.sramAddress || 0x0100).toString(16).toUpperCase()}`, reg: 'r16' };
          } else if (v.type === 'bool') {
            blockType = 'digital_write';
            defaultParams = { pin: '13', value: v.initialValue === 'true' || v.initialValue === '1' ? 'HIGH' : 'LOW' };
          }

          const newBlock: ProgramBlock = {
            id: `b_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            type: blockType,
            scope: activeScope,
            params: defaultParams,
            comment: `Változó hozzáférés: ${v.name} (${v.type})`,
            enabled: true,
          };

          setBlocks((prev) => [...prev, newBlock]);
          incrementBuild(`Változó blokk beszúrva: ${v.name}`);
        }}
      />

      {/* Hardware Conflict & Static Code Linter Modal */}
      <HardwareLinterModal
        isOpen={isHardwareLinterOpen}
        onClose={() => setIsHardwareLinterOpen(false)}
        blocks={blocks}
        setBlocks={setBlocks}
        variables={variables}
      />

      {/* Clock Cycle, Timing & Power Consumption Profiler Modal */}
      <TimingProfilerModal
        isOpen={isTimingProfilerOpen}
        onClose={() => setIsTimingProfilerOpen(false)}
        blocks={blocks}
        variables={variables}
        targetMcu={targetMcu}
      />

      {/* Visual Finite State Machine (FSM) Designer Modal */}
      <StateMachineModal
        isOpen={isStateMachineOpen}
        onClose={() => setIsStateMachineOpen(false)}
        setBlocks={setBlocks}
        setVariables={setVariables}
      />

      {/* Virtual Oscilloscope & Multi-Channel Logic Analyzer Modal */}
      <LogicAnalyzerModal
        isOpen={isLogicAnalyzerOpen}
        onClose={() => setIsLogicAnalyzerOpen(false)}
        blocks={blocks}
        simulationState={simulation}
      />

      {/* Virtual Breadboard, Wiring Schematic & BOM Modal */}
      <VirtualWiringModal
        isOpen={isVirtualWiringOpen}
        onClose={() => setIsVirtualWiringOpen(false)}
        blocks={blocks}
        modules={simulation.modules}
      />

      {/* Floating AVR Instruction & Datasheet Documentation Panel */}
      <FloatingAvrInfoPanel
        isOpen={isAvrDocsOpen}
        onClose={() => setIsAvrDocsOpen(false)}
        selectedBlock={blocks.find((b) => b.id === selectedBlockId) || (blocks.length > 0 ? blocks[0] : null)}
        allBlocks={blocks}
        onSelectBlock={(blockId) => setSelectedBlockId(blockId)}
      />

      {/* AVR Hardware FUSE & Lock Bits Editor Modal */}
      <AvrFuseModal
        isOpen={isAvrFuseModalOpen}
        onClose={() => setIsAvrFuseModalOpen(false)}
        initialFuses={avrFuses}
        onApplyFuses={(newFuses) => {
          setAvrFuses(newFuses);
          incrementBuild(`AVR FUSE Konfiguráció Alkalmazva: ${newFuses.mcu.toUpperCase()}`);
        }}
        onOpenBootloaderModal={() => setIsBootloaderModalOpen(true)}
      />

      {/* AVR Dedicated Visual Interrupt Architecture & Simulator Modal */}
      <AvrInterruptModal
        isOpen={isAvrInterruptModalOpen}
        onClose={() => setIsAvrInterruptModalOpen(false)}
        interruptState={simulation.interruptState}
        onToggleGlobalInterrupts={(enabled) => {
          setSimulation((prev) => {
            if (!prev.interruptState) return prev;
            return {
              ...prev,
              sreg: { ...prev.sreg, I: enabled },
              interruptState: {
                ...prev.interruptState,
                globalInterruptsEnabled: enabled,
              },
            };
          });
          incrementBuild(`Globális megszakítások (SREG.I) ${enabled ? 'Engedélyezve (SEI)' : 'Letiltva (CLI)'}`);
        }}
        onUpdateVectorConfig={(vectorId, config) => {
          setSimulation((prev) => {
            if (!prev.interruptState) return prev;
            const updatedConfigs = {
              ...prev.interruptState.vectorConfigs,
              [vectorId]: {
                ...prev.interruptState.vectorConfigs[vectorId],
                ...config,
              },
            };
            return {
              ...prev,
              interruptState: {
                ...prev.interruptState,
                vectorConfigs: updatedConfigs,
              },
            };
          });
          incrementBuild(`AVR Megszakítás Vektor Frissítve: ${vectorId}`);
        }}
        onTriggerInterrupt={(vectorId) => {
          setSimulation((prev) => {
            if (!prev.interruptState) return prev;
            return {
              ...prev,
              interruptState: {
                ...prev.interruptState,
                pendingInterrupts: [...(prev.interruptState.pendingInterrupts || []), vectorId],
              },
            };
          });
          // Step simulation if paused to immediately execute ISR
          if (!simulation.isRunning) {
            handleStepSimulation();
          }
        }}
        onClearLogs={() => {
          setSimulation((prev) => {
            if (!prev.interruptState) return prev;
            return {
              ...prev,
              interruptState: {
                ...prev.interruptState,
                eventLog: [],
                totalFiredCount: 0,
                firingCount: {},
              },
            };
          });
        }}
        onInsertInterruptBlock={(blockType, params, comment) => {
          const newBlock: ProgramBlock = {
            id: `b_isr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            type: blockType,
            scope: 'setup',
            params: params,
            comment: comment || 'Hardveres megszakítás konfiguráció',
            enabled: true,
          };
          setBlocks((prev) => [...prev, newBlock]);
          incrementBuild(`Megszakítás blokk beszúrva: ${blockType}`);
        }}
      />

      {/* Arduino & AVR Dedicated Visual Bootloader Editor & Simulator Modal */}
      <ArduinoBootloaderModal
        isOpen={isBootloaderModalOpen}
        onClose={() => setIsBootloaderModalOpen(false)}
        fuses={avrFuses}
        onUpdateFuses={(updater) => {
          setAvrFuses(updater);
          incrementBuild('Arduino Bootloader FUSE / Konfiguráció Szinkronizálva');
        }}
        blocks={blocks}
        onOpenAvrFuses={() => {
          setIsBootloaderModalOpen(false);
          setIsAvrFuseModalOpen(true);
        }}
        onBurnToEmulatorFlash={(bootloaderHex, bootStartAddress) => {
          setSimulation((prev) => {
            const newFlash = new Uint8Array(prev.flash || new Uint8Array(32768).fill(0xff));
            return {
              ...prev,
              flash: newFlash,
            };
          });
          if (avrRunnerRef.current) {
            try {
              avrRunnerRef.current.loadHex(bootloaderHex);
            } catch {
              // Ignore non-fatal hex parsing in simulated runner
            }
          }
          incrementBuild(`Optiboot Bootloader Beégetve az Emulátorba (0x${bootStartAddress.toString(16).toUpperCase()})`);
        }}
      />

      {/* ESP32 Dedicated Visual Interrupt Architecture & Simulator Modal */}
      <Esp32InterruptModal
        isOpen={isEsp32InterruptModalOpen}
        onClose={() => setIsEsp32InterruptModalOpen(false)}
        interruptState={simulation.esp32InterruptState}
        onToggleGlobalInterrupts={(enabled) => {
          setSimulation((prev) => {
            if (!prev.esp32InterruptState) return prev;
            return {
              ...prev,
              esp32InterruptState: {
                ...prev.esp32InterruptState,
                globalInterruptsEnabled: enabled,
              },
            };
          });
          incrementBuild(`ESP32 Globális megszakítások ${enabled ? 'Engedélyezve' : 'Letiltva'}`);
        }}
        onUpdateConfig={(sourceId, config) => {
          setSimulation((prev) => {
            if (!prev.esp32InterruptState) return prev;
            const updatedConfigs = {
              ...prev.esp32InterruptState.configs,
              [sourceId]: {
                ...prev.esp32InterruptState.configs[sourceId],
                ...config,
              },
            };
            return {
              ...prev,
              esp32InterruptState: {
                ...prev.esp32InterruptState,
                configs: updatedConfigs,
              },
            };
          });
          incrementBuild(`ESP32 Megszakítás Forrás Frissítve: ${sourceId}`);
        }}
        onTriggerInterrupt={(sourceId, coreId) => {
          setSimulation((prev) => {
            if (!prev.esp32InterruptState) return prev;
            return {
              ...prev,
              esp32InterruptState: {
                ...prev.esp32InterruptState,
                pendingInterrupts: [...(prev.esp32InterruptState.pendingInterrupts || []), { sourceId, coreId }],
              },
            };
          });
          // Step simulation if paused to immediately execute ISR
          if (!simulation.isRunning) {
            handleStepSimulation();
          }
        }}
        onClearLogs={() => {
          setSimulation((prev) => {
            if (!prev.esp32InterruptState) return prev;
            return {
              ...prev,
              esp32InterruptState: {
                ...prev.esp32InterruptState,
                eventLog: [],
                totalFiredCount: 0,
                firingCount: {},
              },
            };
          });
        }}
        onInsertInterruptBlock={(blockType, params, comment) => {
          const newBlock: ProgramBlock = {
            id: `b_esp_isr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            type: blockType,
            scope: 'setup',
            params: params,
            comment: comment || 'ESP32 Hardveres Megszakítás Konfiguráció',
            enabled: true,
          };
          setBlocks((prev) => [...prev, newBlock]);
          incrementBuild(`ESP32 Megszakítás blokk beszúrva: ${blockType}`);
        }}
      />

      {/* ESP32 DMA Controller & Buffer Management Modal */}
      <Esp32DmaModal
        isOpen={isEsp32DmaModalOpen}
        onClose={() => setIsEsp32DmaModalOpen(false)}
        dmaState={simulation.esp32State?.dma}
        onUpdateDmaState={(updater) => {
          handleUpdateEsp32State((prev) => ({
            ...prev,
            dma: prev.dma ? updater(prev.dma) : prev.dma,
          }));
        }}
      />

      {/* ESP32 I2A / I2S Audio & High-Speed Interface Management Modal */}
      <Esp32I2aModal
        isOpen={isEsp32I2aModalOpen}
        onClose={() => setIsEsp32I2aModalOpen(false)}
        i2aState={simulation.esp32State?.i2a}
        onUpdateI2aState={(updater) => {
          handleUpdateEsp32State((prev) => ({
            ...prev,
            i2a: prev.i2a ? updater(prev.i2a) : prev.i2a,
          }));
        }}
      />

      {/* ESP32 WiFi, Static IP & BLE Connectivity Management Modal */}
      {simulation.esp32State?.wifi && (
        <Esp32ConnectivityModal
          isOpen={isEsp32ConnectivityModalOpen}
          onClose={() => setIsEsp32ConnectivityModalOpen(false)}
          wifiState={simulation.esp32State.wifi}
          bleState={simulation.esp32State.ble}
          onUpdateWifi={(updater) => {
            handleUpdateEsp32State((prev) => ({
              ...prev,
              wifi: updater(prev.wifi),
            }));
            incrementBuild('ESP32 Wi-Fi & IP Hálózat Konfiguráció Módosítva');
          }}
          onUpdateBle={(updater) => {
            handleUpdateEsp32State((prev) => ({
              ...prev,
              ble: prev.ble ? updater(prev.ble) : prev.ble,
            }));
            incrementBuild('ESP32 BLE & GATT Reklám Konfiguráció Módosítva');
          }}
        />
      )}

      {/* AVR Watchpoints (Data Breakpoints) Modal */}
      {simulation.watchpointState && (
        <AvrWatchpointModal
          isOpen={isWatchpointModalOpen}
          onClose={() => setIsWatchpointModalOpen(false)}
          watchpointState={simulation.watchpointState}
          onUpdateWatchpoints={(newWps) => {
            setSimulation((prev) => ({
              ...prev,
              watchpointState: prev.watchpointState
                ? { ...prev.watchpointState, watchpoints: newWps }
                : undefined,
            }));
            incrementBuild('AVR Watchpoint (Adat Breakpoint) Szabályok Frissítve');
          }}
          onClearHitHistory={() => {
            setSimulation((prev) => ({
              ...prev,
              watchpointState: prev.watchpointState
                ? { ...prev.watchpointState, hitHistory: [], lastHitEvent: undefined }
                : undefined,
            }));
          }}
          onResumeExecution={() => {
            setSimulation((prev) => ({
              ...prev,
              isRunning: true,
              watchpointState: prev.watchpointState
                ? { ...prev.watchpointState, isPausedOnWatchpoint: false }
                : undefined,
            }));
          }}
          currentCycle={simulation.totalCycles || (avrRunnerRef.current?.cpu?.cycles || 0)}
          currentPc={simulation.avrCpu?.pc || (avrRunnerRef.current?.cpu?.pc || 0)}
        />
      )}

      {/* AVR Stack & Heap Visualizer with Overflow Collision Explosion Modal */}
      <AvrStackVisualizerModal
        isOpen={isStackVisualizerModalOpen}
        onClose={() => setIsStackVisualizerModalOpen(false)}
        stackSnapshot={simulation.stackMemorySnapshot}
        onTriggerStackOverflow={() => {
          setSimulation((prev) => {
            if (!prev.stackMemorySnapshot) return prev;
            return {
              ...prev,
              isRunning: false,
              stackMemorySnapshot: {
                ...prev.stackMemorySnapshot,
                sp: 0x0110,
                isOverflow: true,
                heapCollisionAddress: 0x0110,
              },
            };
          });
          incrementBuild('⚡ AVR Stack Overflow Kényszerítve (Ütközés a Heap-pel)');
        }}
        onResetStack={() => {
          setSimulation((prev) => {
            if (!prev.stackMemorySnapshot) return prev;
            return {
              ...prev,
              stackMemorySnapshot: {
                ...prev.stackMemorySnapshot,
                sp: 0x08ff,
                isOverflow: false,
                heapCollisionAddress: undefined,
                overflowEvent: undefined,
              },
            };
          });
        }}
      />
    </div>
  );
}
