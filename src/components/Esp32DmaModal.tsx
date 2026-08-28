/**
 * (c) 2026 AI Studio
 * ESP32 DMA (Direct Memory Access) Controller & Buffer Management Modal
 * Interactive linked-list descriptor chain (lldesc_t), circular ring-buffer simulation,
 * CPU offload benchmarking, peripheral routing (SPI/I2S/UART/GDMA), and ESP-IDF C code generator.
 */

import React, { useState, useEffect } from 'react';
import {
  Zap,
  Layers,
  Cpu,
  RefreshCw,
  Play,
  Pause,
  StepForward,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Database,
  Code2,
  Copy,
  Check,
  X,
  Flame,
  Activity,
  Sliders,
  Radio,
  FileCode,
  HardDrive,
} from 'lucide-react';
import { Esp32DmaState, Esp32DmaDescriptor, Esp32DmaChannelType } from '../types';

interface Esp32DmaModalProps {
  isOpen: boolean;
  onClose: () => void;
  dmaState?: Esp32DmaState;
  onUpdateDmaState?: (updater: (prev: Esp32DmaState) => Esp32DmaState) => void;
}

const DMA_CHANNEL_INFO: Record<
  Esp32DmaChannelType,
  { name: string; peripheral: string; maxThroughput: string; desc: string; color: string }
> = {
  spi2_dma: {
    name: 'SPI2 (HSPI) DMA',
    peripheral: 'SPI2 / TFT Kijelző / SD Kártya',
    maxThroughput: '80.0 MB/s @ 80MHz',
    desc: 'Hardveres SPI átvitel RGB565 framepufferekhez és kijelzők frissítéséhez 0% CPU terheléssel.',
    color: '#38bdf8',
  },
  spi3_dma: {
    name: 'SPI3 (VSPI) DMA',
    peripheral: 'SPI3 / Gyors Flash & RAM',
    maxThroughput: '80.0 MB/s @ 80MHz',
    desc: 'Másodlagos nagysebességű SPI busz külső perifériákhoz és nagy méretű tömbátvitelekhez.',
    color: '#818cf8',
  },
  i2s0_dma: {
    name: 'I2S0 Audio/ADC DMA',
    peripheral: 'I2S0 / DAC / ADC / PDM Mic',
    maxThroughput: '32.0 MB/s',
    desc: 'Folyamatos hangmintavételezés és 16/24/32 bites I2S audio stream duális ping-pong puffereléssel.',
    color: '#c084fc',
  },
  i2s1_dma: {
    name: 'I2S1 Parallel DMA',
    peripheral: 'I2S1 / Párhuzamos Kamera/LCD',
    maxThroughput: '40.0 MB/s',
    desc: '8-bites vagy 16-bites párhuzamos adatgyűjtés (OV2640 / OV7670 kamera és 8080 LCD).',
    color: '#f472b6',
  },
  uart_dma: {
    name: 'UART DMA Controller',
    peripheral: 'UART0 / UART1 / UART2 FIFO',
    maxThroughput: '5.0 MB/s @ 5MBaud',
    desc: 'Nagysebességű soros adatátvitel automatikus FIFO ürítéssel és csomag-határ EOF megszakítással.',
    color: '#fbbf24',
  },
  gdma: {
    name: 'General DMA (Mem2Mem)',
    peripheral: 'SRAM -> SRAM Blokkmásoló',
    maxThroughput: '160.0 MB/s (Belső Busz)',
    desc: 'CPU nélküli közvetlen memóriablokk-másolás (Zero-Copy DMA memcpy hardveres gyorsítás).',
    color: '#34d399',
  },
};

export const Esp32DmaModal: React.FC<Esp32DmaModalProps> = ({
  isOpen,
  onClose,
  dmaState,
  onUpdateDmaState,
}) => {
  const [activeTab, setActiveTab] = useState<'descriptors' | 'benchmark' | 'channels' | 'presets' | 'code'>('descriptors');
  const [copiedCode, setCopiedCode] = useState(false);
  const [selectedDescIndex, setSelectedDescIndex] = useState<number>(0);
  const [simRunning, setSimRunning] = useState<boolean>(true);
  const [recentInterruptLog, setRecentInterruptLog] = useState<string[]>([
    '00:01.240 [DMA_ISR] EOF_DESC_3 triggerelve -> frame_ready_callback() hívás',
    '00:01.180 [DMA_ISR] DESC_2 átadva a DMA motornak (Owner: DMA)',
    '00:01.120 [DMA_ISR] DESC_1 átvitel befejezve (4096 bájt)',
    '00:01.060 [DMA_ISR] DESC_0 átvitel befejezve (4096 bájt)',
  ]);

  // Local fallback state if not provided
  const [localDma, setLocalDma] = useState<Esp32DmaState>(
    dmaState || {
      enabled: true,
      activeChannel: 'spi2_dma',
      isCircularRing: true,
      transferRateMBs: 40.0,
      bytesTransferred: 65536,
      totalBytes: 153600,
      isRunning: true,
      interruptCount: 42,
      lastInterruptReason: 'ESP_INTR_FLAG_DMA (EOF_DESC_3)',
      cpuOffloadPercent: 98.4,
      currentDescriptorIndex: 1,
      descriptors: [
        {
          id: 'dma_desc_0',
          index: 0,
          bufferAddressHex: '0x3FFA0000',
          bufferSizeBytes: 4096,
          lengthBytes: 4096,
          owner: 'DMA',
          eof: false,
          sosf: false,
          nextDescId: 'dma_desc_1',
          bufferDataHex: 'AA 55 FF 00 12 34 56 78 DE AD BE EF 42 42 11 22',
          description: 'Ping Buffer 0 (Frame Header & Sorok 0..30)',
        },
        {
          id: 'dma_desc_1',
          index: 1,
          bufferAddressHex: '0x3FFA1000',
          bufferSizeBytes: 4096,
          lengthBytes: 4096,
          owner: 'DMA',
          eof: false,
          sosf: false,
          nextDescId: 'dma_desc_2',
          bufferDataHex: '55 AA 00 FF 78 56 34 12 EF BE AD DE 24 24 33 44',
          description: 'Pong Buffer 1 (Frame Sorok 31..60)',
        },
        {
          id: 'dma_desc_2',
          index: 2,
          bufferAddressHex: '0x3FFA2000',
          bufferSizeBytes: 4096,
          lengthBytes: 4096,
          owner: 'CPU',
          eof: false,
          sosf: false,
          nextDescId: 'dma_desc_3',
          bufferDataHex: '00 00 FF FF 11 22 33 44 55 66 77 88 99 AA BB CC',
          description: 'Buffer 2 (Frame Sorok 61..90 - CPU Kitöltés alatt)',
        },
        {
          id: 'dma_desc_3',
          index: 3,
          bufferAddressHex: '0x3FFA3000',
          bufferSizeBytes: 4096,
          lengthBytes: 4096,
          owner: 'CPU',
          eof: true,
          sosf: false,
          nextDescId: 'dma_desc_0',
          bufferDataHex: 'FF FF 00 00 99 88 77 66 55 44 33 22 11 00 EE DD',
          description: 'EOF Buffer 3 (Frame Sorok 91..120 - Megszakítást generál)',
        },
      ],
    }
  );

  const state = dmaState || localDma;

  const updateState = (updater: (prev: Esp32DmaState) => Esp32DmaState) => {
    if (onUpdateDmaState) {
      onUpdateDmaState(updater);
    } else {
      setLocalDma(updater);
    }
  };

  // Live Timer Simulation of DMA stepping
  useEffect(() => {
    if (!isOpen || !simRunning) return;

    const interval = setInterval(() => {
      updateState((prev) => {
        const nextIdx = (prev.currentDescriptorIndex + 1) % prev.descriptors.length;
        const currDesc = prev.descriptors[nextIdx];
        const isEof = currDesc?.eof ?? false;

        const newInterruptCount = isEof ? prev.interruptCount + 1 : prev.interruptCount;
        const newReason = isEof
          ? `ESP_INTR_FLAG_DMA (EOF_DESC_${nextIdx})`
          : prev.lastInterruptReason;

        return {
          ...prev,
          currentDescriptorIndex: nextIdx,
          bytesTransferred: (prev.bytesTransferred + 4096) % (prev.totalBytes * 2),
          interruptCount: newInterruptCount,
          lastInterruptReason: newReason,
        };
      });
    }, 1200);

    return () => clearInterval(interval);
  }, [isOpen, simRunning]);

  if (!isOpen) return null;

  const currentChannel = DMA_CHANNEL_INFO[state.activeChannel] || DMA_CHANNEL_INFO.spi2_dma;
  const currentDesc = state.descriptors[selectedDescIndex] || state.descriptors[0];

  // Helper to trigger single step
  const handleStep = () => {
    updateState((prev) => {
      const nextIdx = (prev.currentDescriptorIndex + 1) % prev.descriptors.length;
      const isEof = prev.descriptors[nextIdx]?.eof ?? false;
      return {
        ...prev,
        currentDescriptorIndex: nextIdx,
        bytesTransferred: prev.bytesTransferred + 4096,
        interruptCount: isEof ? prev.interruptCount + 1 : prev.interruptCount,
        lastInterruptReason: isEof
          ? `Kézi Léptetés: EOF_DESC_${nextIdx}`
          : prev.lastInterruptReason,
      };
    });
  };

  // Toggle Owner Bit (CPU vs DMA)
  const handleToggleOwner = (index: number) => {
    updateState((prev) => {
      const newDescriptors = [...prev.descriptors];
      const target = newDescriptors[index];
      if (target) {
        newDescriptors[index] = {
          ...target,
          owner: target.owner === 'DMA' ? 'CPU' : 'DMA',
        };
      }
      return { ...prev, descriptors: newDescriptors };
    });
  };

  // Toggle EOF flag
  const handleToggleEof = (index: number) => {
    updateState((prev) => {
      const newDescriptors = [...prev.descriptors];
      const target = newDescriptors[index];
      if (target) {
        newDescriptors[index] = {
          ...target,
          eof: !target.eof,
        };
      }
      return { ...prev, descriptors: newDescriptors };
    });
  };

  // Add new descriptor
  const handleAddDescriptor = () => {
    updateState((prev) => {
      const newIdx = prev.descriptors.length;
      const hexAddr = `0x3FFA${newIdx}000`;
      const newDesc: Esp32DmaDescriptor = {
        id: `dma_desc_${newIdx}`,
        index: newIdx,
        bufferAddressHex: hexAddr,
        bufferSizeBytes: 4096,
        lengthBytes: 4096,
        owner: 'CPU',
        eof: false,
        sosf: false,
        nextDescId: prev.isCircularRing ? prev.descriptors[0]?.id || null : null,
        bufferDataHex: '00 11 22 33 44 55 66 77 88 99 AA BB CC DD EE FF',
        description: `Dinamikus DMA Puffer #${newIdx}`,
      };

      // update previous last descriptor to point to this new one
      const updatedList = [...prev.descriptors];
      if (updatedList.length > 0) {
        updatedList[updatedList.length - 1] = {
          ...updatedList[updatedList.length - 1],
          nextDescId: newDesc.id,
        };
      }
      updatedList.push(newDesc);

      return {
        ...prev,
        descriptors: updatedList,
        totalBytes: prev.totalBytes + 4096,
      };
    });
  };

  // Presets
  const applyPreset = (presetId: string) => {
    if (presetId === 'tft_spi') {
      updateState((prev) => ({
        ...prev,
        activeChannel: 'spi2_dma',
        isCircularRing: true,
        transferRateMBs: 80.0,
        cpuOffloadPercent: 99.2,
        totalBytes: 153600,
        descriptors: [
          {
            id: 'desc_tft_0',
            index: 0,
            bufferAddressHex: '0x3FFA0000',
            bufferSizeBytes: 8192,
            lengthBytes: 8192,
            owner: 'DMA',
            eof: false,
            sosf: false,
            nextDescId: 'desc_tft_1',
            bufferDataHex: 'F8 00 F8 00 07 E0 07 E0 00 1F 00 1F FF E0 ...',
            description: 'TFT Kijelző Felső Sáv (RGB565 Sorok 0..60)',
          },
          {
            id: 'desc_tft_1',
            index: 1,
            bufferAddressHex: '0x3FFA2000',
            bufferSizeBytes: 8192,
            lengthBytes: 8192,
            owner: 'DMA',
            eof: false,
            sosf: false,
            nextDescId: 'desc_tft_2',
            bufferDataHex: '00 1F 00 1F 07 E0 07 E0 F8 00 F8 00 FF FF ...',
            description: 'TFT Kijelző Középső Sáv (Sorok 61..120)',
          },
          {
            id: 'desc_tft_2',
            index: 2,
            bufferAddressHex: '0x3FFA4000',
            bufferSizeBytes: 8192,
            lengthBytes: 8192,
            owner: 'CPU',
            eof: true,
            sosf: false,
            nextDescId: 'desc_tft_0',
            bufferDataHex: 'FF FF FF FF 00 00 00 00 F8 1F F8 1F 07 FF ...',
            description: 'TFT Kijelző Alsó Sáv (Sorok 121..240 - VSYNC EOF)',
          },
        ],
      }));
    } else if (presetId === 'adc_continuous') {
      updateState((prev) => ({
        ...prev,
        activeChannel: 'i2s0_dma',
        isCircularRing: true,
        transferRateMBs: 24.0,
        cpuOffloadPercent: 97.5,
        totalBytes: 32768,
        descriptors: [
          {
            id: 'desc_adc_0',
            index: 0,
            bufferAddressHex: '0x3FFA0000',
            bufferSizeBytes: 2048,
            lengthBytes: 2048,
            owner: 'DMA',
            eof: false,
            sosf: false,
            nextDescId: 'desc_adc_1',
            bufferDataHex: '08 00 08 20 08 40 08 80 09 00 0A 00 0C 00 ...',
            description: '2 MSPS Folyamatos ADC Mintavevő Puffer A',
          },
          {
            id: 'desc_adc_1',
            index: 1,
            bufferAddressHex: '0x3FFA0800',
            bufferSizeBytes: 2048,
            lengthBytes: 2048,
            owner: 'CPU',
            eof: true,
            sosf: false,
            nextDescId: 'desc_adc_0',
            bufferDataHex: '0D 00 0F 00 0E 00 0B 00 09 00 08 00 07 00 ...',
            description: '2 MSPS Folyamatos ADC Mintavevő Puffer B (DSP Feldolgozás)',
          },
        ],
      }));
    } else if (presetId === 'mem_copy') {
      updateState((prev) => ({
        ...prev,
        activeChannel: 'gdma',
        isCircularRing: false,
        transferRateMBs: 160.0,
        cpuOffloadPercent: 99.8,
        totalBytes: 65536,
        descriptors: [
          {
            id: 'desc_gdma_0',
            index: 0,
            bufferAddressHex: '0x3FFB0000',
            bufferSizeBytes: 16384,
            lengthBytes: 16384,
            owner: 'DMA',
            eof: true,
            sosf: false,
            nextDescId: null,
            bufferDataHex: 'DE AD BE EF CA FE BA BE 01 23 45 67 89 AB CD EF ...',
            description: 'Hardveres Zero-Copy RAM->RAM 16KB Adatblokk Másolás',
          },
        ],
      }));
    }
  };

  // Generate real ESP-IDF C Code
  const generatedC = `/**
 * ESP32 Hardveres DMA Controller & Ring Buffer Konfiguráció
 * Generálva: Arduino ASM Studio DMA Menedzser által
 * Csatorna: ${currentChannel.name} (${state.activeChannel})
 */

#include <stdio.h>
#include <string.h>
#include "esp_system.h"
#include "esp_heap_caps.h"
#include "driver/spi_master.h"
#include "rom/lldesc.h"
#include "esp_intr_alloc.h"

#define DMA_DESCRIPTOR_COUNT ${state.descriptors.length}
#define DMA_BUFFER_SIZE      4096

// DMA kompatibilis belső SRAM pufferek lefoglalása
static uint8_t *dma_buffers[DMA_DESCRIPTOR_COUNT];
static lldesc_t dma_desc[DMA_DESCRIPTOR_COUNT];
static intr_handle_t dma_intr_handle;

// DMA Megszakításkezelő Rutin (ISR)
static void IRAM_ATTR dma_transfer_complete_isr(void *arg) {
    BaseType_t xHigherPriorityTaskWoken = pdFALSE;
    
    // Megszakítás nyugtázása és zászlók törlése
    // ...
    
    // Értesítés küldése a FreeRTOS adatfeldolgozó taszknak
    // vTaskNotifyGiveFromISR(dspTaskHandle, &xHigherPriorityTaskWoken);
    
    if (xHigherPriorityTaskWoken == pdTRUE) {
        portYIELD_FROM_ISR();
    }
}

void init_esp32_dma_controller(void) {
    printf("[DMA] Inicializálás: ${currentChannel.name}...\\n");

    // 1. DMA-képes belső SRAM memória foglalása (MALLOC_CAP_DMA)
    for (int i = 0; i < DMA_DESCRIPTOR_COUNT; i++) {
        dma_buffers[i] = (uint8_t *)heap_caps_malloc(DMA_BUFFER_SIZE, MALLOC_CAP_DMA);
        assert(dma_buffers[i] != NULL);
        memset(dma_buffers[i], 0xAA, DMA_BUFFER_SIZE);
    }

    // 2. Láncolt leírók (lldesc_t) felépítése ${state.isCircularRing ? '(Körkörös Gyűrűpuffer)' : '(Lineáris Lánc)'}
    for (int i = 0; i < DMA_DESCRIPTOR_COUNT; i++) {
        dma_desc[i].size = DMA_BUFFER_SIZE;
        dma_desc[i].length = DMA_BUFFER_SIZE;
        dma_desc[i].offset = 0;
        dma_desc[i].sosf = 0;
        dma_desc[i].owner = 1; // 1: DMA birtokolja, 0: CPU
        dma_desc[i].buf = dma_buffers[i];

        // EOF megszakítás beállítása az utolsó puffernél
        if (i == DMA_DESCRIPTOR_COUNT - 1) {
            dma_desc[i].eof = 1;
            dma_desc[i].qe.stqe_next = ${state.isCircularRing ? '&dma_desc[0]' : 'NULL'}; // ${state.isCircularRing ? 'Visszacsatolás a gyűrű elejére' : 'Lánc vége'}
        } else {
            dma_desc[i].eof = 0;
            dma_desc[i].qe.stqe_next = &dma_desc[i + 1];
        }
    }

    printf("[DMA] ${state.descriptors.length} db lldesc_t leíró sikeresen összeláncolva. CPU Terhelés-csökkentés: ${state.cpuOffloadPercent}%%\\n");
}
`;

  return (
    <div
      id="modal-esp32-dma"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-xs font-mono select-none"
    >
      <div className="flex flex-col w-full max-w-5xl h-[92vh] max-h-[850px] bg-[#0E1117] border border-cyan-500/60 rounded-lg shadow-[0_0_30px_rgba(6,182,212,0.25)] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-[#161922] border-b border-cyan-900/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-cyan-950/80 text-cyan-400 border border-cyan-500/50 shadow-[0_0_12px_rgba(6,182,212,0.3)]">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                  ESP32 DMA Controller & Puffer Menedzsment
                </h2>
                <span className="px-2 py-0.5 text-[10px] rounded-full bg-cyan-950 text-cyan-300 border border-cyan-700 font-bold">
                  lldesc_t Gyűrűpuffer
                </span>
                <span className="px-2 py-0.5 text-[10px] rounded-full bg-emerald-950 text-emerald-300 border border-emerald-700 font-bold">
                  Zero-CPU Offload: {state.cpuOffloadPercent}%
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Közvetlen memóriahozzáférés vezérlő, láncolt leírók ({state.descriptors.length} db), periféria útválasztás és valós idejű hardveres szimuláció
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="btn-close-dma-modal"
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded bg-slate-800/60 hover:bg-slate-700 border border-slate-700 cursor-pointer transition-colors"
              title="Bezárás"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center justify-between px-4 py-1.5 bg-[#12141C] border-b border-slate-800 text-xs">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setActiveTab('descriptors')}
              className={`px-3 py-1.5 rounded-t-md font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'descriptors'
                  ? 'bg-[#1E2330] text-cyan-300 border-b-2 border-cyan-400'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Leíró Lánc & Pufferek ({state.descriptors.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('benchmark')}
              className={`px-3 py-1.5 rounded-t-md font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'benchmark'
                  ? 'bg-[#1E2330] text-emerald-300 border-b-2 border-emerald-400'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Sebesség & CPU Terhelés</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('channels')}
              className={`px-3 py-1.5 rounded-t-md font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'channels'
                  ? 'bg-[#1E2330] text-purple-300 border-b-2 border-purple-400'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Hardver Csatornák</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('presets')}
              className={`px-3 py-1.5 rounded-t-md font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'presets'
                  ? 'bg-[#1E2330] text-amber-300 border-b-2 border-amber-400'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Flame className="w-3.5 h-3.5" />
              <span>Gyakorlati Sablonok</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('code')}
              className={`px-3 py-1.5 rounded-t-md font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'code'
                  ? 'bg-[#1E2330] text-sky-300 border-b-2 border-sky-400'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>ESP-IDF C Kód</span>
            </button>
          </div>

          {/* Quick Simulation Controls */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSimRunning(!simRunning)}
              className={`px-2.5 py-1 rounded text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors border ${
                simRunning
                  ? 'bg-amber-950/80 text-amber-300 border-amber-600 hover:bg-amber-900'
                  : 'bg-emerald-950/80 text-emerald-300 border-emerald-600 hover:bg-emerald-900'
              }`}
            >
              {simRunning ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
              <span>{simRunning ? 'Szimuláció Szünet' : 'DMA Indítása'}</span>
            </button>

            <button
              type="button"
              onClick={handleStep}
              className="px-2.5 py-1 rounded text-[11px] font-bold bg-slate-800 text-cyan-300 hover:bg-slate-700 border border-slate-600 cursor-pointer flex items-center gap-1"
              title="1 Leíró Léptetése"
            >
              <StepForward className="w-3 h-3" />
              <span>Lépés</span>
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#0E1117]">
          {/* TAB 1: DESCRIPTOR CHAIN & RING BUFFER */}
          {activeTab === 'descriptors' && (
            <div className="space-y-4">
              {/* Status Header Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-lg bg-[#141822] border border-cyan-900/50">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Aktív Csatorna</div>
                  <div className="text-sm font-bold text-cyan-300 truncate mt-0.5">
                    {currentChannel.name}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{currentChannel.peripheral}</div>
                </div>

                <div className="p-3 rounded-lg bg-[#141822] border border-cyan-900/50">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Átviteli Sebesség</div>
                  <div className="text-sm font-bold text-emerald-400 mt-0.5">
                    {state.transferRateMBs.toFixed(1)} MB/s
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    {state.bytesTransferred.toLocaleString()} bájt átvive
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-[#141822] border border-cyan-900/50">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Megszakítások (ISR)</div>
                  <div className="text-sm font-bold text-purple-300 mt-0.5 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-purple-400 animate-ping" />
                    <span>{state.interruptCount} db EOF esemény</span>
                  </div>
                  <div className="text-[10px] text-slate-400 truncate mt-0.5">
                    {state.lastInterruptReason}
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-[#141822] border border-cyan-900/50">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Puffer Mód</div>
                  <div className="text-sm font-bold text-amber-300 mt-0.5">
                    {state.isCircularRing ? '🔁 Körkörös Gyűrű' : '➡️ Lineáris Lánc'}
                  </div>
                  <button
                    type="button"
                    onClick={() => updateState((p) => ({ ...p, isCircularRing: !p.isCircularRing }))}
                    className="text-[10px] text-cyan-400 underline hover:text-cyan-200 cursor-pointer mt-0.5"
                  >
                    Váltás {state.isCircularRing ? 'Lineárisra' : 'Körkörösre'}
                  </button>
                </div>
              </div>

              {/* Visual Linked-List Descriptor Graph */}
              <div className="p-4 rounded-lg bg-[#12151E] border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-cyan-400" />
                    <span className="text-xs font-bold text-white uppercase tracking-wider">
                      Láncolt Leírók Struktúrája (lldesc_t Linked List)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddDescriptor}
                    className="px-2.5 py-1 text-xs font-bold rounded bg-cyan-950 text-cyan-300 hover:bg-cyan-900 border border-cyan-700 cursor-pointer flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Új Leíró Hozzáadása</span>
                  </button>
                </div>

                {/* Horizontal Flow of Descriptors */}
                <div className="flex items-center gap-3 overflow-x-auto pb-3 pt-2">
                  {state.descriptors.map((desc, idx) => {
                    const isCurrent = idx === state.currentDescriptorIndex;
                    const isSelected = idx === selectedDescIndex;
                    return (
                      <React.Fragment key={desc.id}>
                        <div
                          onClick={() => setSelectedDescIndex(idx)}
                          className={`shrink-0 w-64 p-3 rounded-lg border transition-all cursor-pointer relative ${
                            isCurrent
                              ? 'bg-[#192231] border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.4)] scale-102 ring-1 ring-cyan-400'
                              : isSelected
                              ? 'bg-[#161A24] border-purple-500'
                              : 'bg-[#141720] border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          {/* Active DMA Marker */}
                          {isCurrent && (
                            <div className="absolute -top-2.5 right-3 px-2 py-0.5 rounded-full bg-cyan-500 text-black text-[9px] font-bold shadow animate-bounce">
                              ⚡ DMA ITT TART
                            </div>
                          )}

                          <div className="flex items-center justify-between border-b border-slate-700/60 pb-1.5 mb-2">
                            <span className="text-xs font-bold text-cyan-300">
                              lldesc_t[{idx}]
                            </span>
                            <span
                              className={`text-[9px] px-1.5 py-0.2 rounded font-bold border ${
                                desc.owner === 'DMA'
                                  ? 'bg-emerald-950 text-emerald-300 border-emerald-700'
                                  : 'bg-amber-950 text-amber-300 border-amber-700'
                              }`}
                            >
                              Owner: {desc.owner}
                            </span>
                          </div>

                          <div className="space-y-1 text-[11px]">
                            <div className="flex justify-between text-slate-400">
                              <span>Puffer Cím:</span>
                              <span className="font-bold text-slate-200">{desc.bufferAddressHex}</span>
                            </div>
                            <div className="flex justify-between text-slate-400">
                              <span>Méret / Hossz:</span>
                              <span className="font-bold text-slate-200">
                                {desc.bufferSizeBytes} B
                              </span>
                            </div>
                            <div className="flex justify-between text-slate-400">
                              <span>EOF Flag:</span>
                              <span
                                className={`font-bold ${
                                  desc.eof ? 'text-purple-400' : 'text-slate-500'
                                }`}
                              >
                                {desc.eof ? 'IGEN (Megszakítás)' : 'NEM'}
                              </span>
                            </div>
                            <div className="flex justify-between text-slate-400">
                              <span>Következő:</span>
                              <span className="font-bold text-cyan-400 truncate max-w-[100px]">
                                {desc.nextDescId ? `-> ${desc.nextDescId}` : 'NULL (Vége)'}
                              </span>
                            </div>
                          </div>

                          {/* Quick Interactive Toggles */}
                          <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px]">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleOwner(idx);
                              }}
                              className="text-cyan-400 hover:text-cyan-200 underline cursor-pointer"
                            >
                              {desc.owner === 'DMA' ? 'Átadás CPU-nak' : 'Átadás DMA-nak'}
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleEof(idx);
                              }}
                              className="text-purple-400 hover:text-purple-200 underline cursor-pointer"
                            >
                              {desc.eof ? 'EOF Törlése' : 'EOF Beállítás'}
                            </button>
                          </div>
                        </div>

                        {/* Arrow Link */}
                        <div className="shrink-0 flex items-center text-cyan-500/70 font-bold">
                          <ArrowRight className="w-5 h-5" />
                        </div>
                      </React.Fragment>
                    );
                  })}

                  {/* Circular loopback badge */}
                  {state.isCircularRing && (
                    <div className="shrink-0 p-2.5 rounded-lg bg-cyan-950/40 border border-cyan-700/60 text-cyan-300 text-xs font-bold flex items-center gap-1">
                      <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
                      <span>Gyűrű Zárás -&gt; lldesc_t[0]</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Selected Descriptor Detail & Hex Payload Inspector */}
              {currentDesc && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg bg-[#141822] border border-slate-800 space-y-2.5">
                    <div className="flex items-center justify-between border-b border-slate-700 pb-2">
                      <div className="flex items-center gap-2">
                        <Database className="w-4 h-4 text-purple-400" />
                        <span className="text-xs font-bold text-white">
                          Részletes Leíró Adatlap: {currentDesc.id}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400">Index: #{currentDesc.index}</span>
                    </div>

                    <p className="text-xs text-slate-300 italic">{currentDesc.description}</p>

                    <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                      <div className="p-2 rounded bg-[#0E1117] border border-slate-800">
                        <span className="text-[10px] text-slate-400 block">SRAM Báziscím:</span>
                        <span className="font-bold text-cyan-300">{currentDesc.bufferAddressHex}</span>
                      </div>
                      <div className="p-2 rounded bg-[#0E1117] border border-slate-800">
                        <span className="text-[10px] text-slate-400 block">Pufferméret:</span>
                        <span className="font-bold text-slate-200">
                          {currentDesc.bufferSizeBytes} bájt ({currentDesc.bufferSizeBytes / 1024} KB)
                        </span>
                      </div>
                      <div className="p-2 rounded bg-[#0E1117] border border-slate-800">
                        <span className="text-[10px] text-slate-400 block">Hardveres Tulajdonos:</span>
                        <span
                          className={`font-bold ${
                            currentDesc.owner === 'DMA' ? 'text-emerald-400' : 'text-amber-400'
                          }`}
                        >
                          {currentDesc.owner} (owner bit = {currentDesc.owner === 'DMA' ? 1 : 0})
                        </span>
                      </div>
                      <div className="p-2 rounded bg-[#0E1117] border border-slate-800">
                        <span className="text-[10px] text-slate-400 block">EOF Megszakítás:</span>
                        <span
                          className={`font-bold ${
                            currentDesc.eof ? 'text-purple-400' : 'text-slate-500'
                          }`}
                        >
                          {currentDesc.eof ? 'AKTÍV (INTR_EOF)' : 'Inaktív'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Hex Buffer Dump Preview */}
                  <div className="p-4 rounded-lg bg-[#141822] border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between border-b border-slate-700 pb-2">
                      <div className="flex items-center gap-2">
                        <HardDrive className="w-4 h-4 text-emerald-400" />
                        <span className="text-xs font-bold text-white">
                          Puffer Memória Tartalom (Hex Dump)
                        </span>
                      </div>
                      <span className="text-[10px] text-emerald-400 font-bold">MALLOC_CAP_DMA</span>
                    </div>

                    <div className="p-2.5 rounded bg-[#0A0D14] border border-slate-900 font-mono text-[11px] text-emerald-300 leading-relaxed overflow-x-auto">
                      <div className="text-slate-500 text-[10px] mb-1">
                        0x0000: {currentDesc.bufferDataHex}
                      </div>
                      <div className="text-slate-500 text-[10px] mb-1">
                        0x0010: 10 20 30 40 50 60 70 80 90 A0 B0 C0 D0 E0 F0 00 ...
                      </div>
                      <div className="text-slate-500 text-[10px]">
                        0x0020: FF 00 FF 00 AA 55 AA 55 12 34 56 78 9A BC DE F0 ...
                      </div>
                    </div>

                    <p className="text-[10px] text-slate-400 leading-tight">
                      A DMA vezérlő közvetlenül ezt az SRAM memóriaterületet olvassa/írja anélkül, hogy az Xtensa LX6 CPU magoknak egyetlen ciklust is fel kellene használniuk.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: BENCHMARK & CPU OFFLOAD */}
          {activeTab === 'benchmark' && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-[#141822] border border-emerald-900/60 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                    <Activity className="w-5 h-5" />
                    <span>CPU Terhelés-Csökkentési Benchmark (DMA vs CPU Polling)</span>
                  </div>
                  <span className="text-xs px-2.5 py-1 rounded bg-emerald-950 text-emerald-300 border border-emerald-700 font-bold">
                    {state.cpuOffloadPercent}% CPU megtakarítás
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  {/* Option A: CPU Polling */}
                  <div className="p-3.5 rounded-lg bg-[#0E1117] border border-rose-900/50 space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-rose-400">1. Hagyományos CPU Polling / SPI memcpy</span>
                      <span className="text-rose-300 font-bold text-sm">92.4% CPU</span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden">
                      <div className="bg-rose-500 h-full rounded-full w-[92.4%]" />
                    </div>
                    <p className="text-[11px] text-slate-400">
                      A CPU magok blokkolva várnak minden bájtra. Az audio akad, a WiFi kapcsolat lelassul.
                    </p>
                  </div>

                  {/* Option B: Hardveres DMA */}
                  <div className="p-3.5 rounded-lg bg-[#0E1117] border border-emerald-900/50 space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-emerald-400">2. Hardveres DMA Gyűrűpuffer Motor</span>
                      <span className="text-emerald-300 font-bold text-sm">0.8% CPU</span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden">
                      <div className="bg-emerald-400 h-full rounded-full w-[2.5%]" />
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Zero-Copy átvitel közvetlenül az SRAM és a busz között. Mindkét CPU mag 100%-ban szabad marad.
                    </p>
                  </div>
                </div>
              </div>

              {/* Real-time Interrupt & Transfer Log */}
              <div className="p-4 rounded-lg bg-[#141822] border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between border-b border-slate-700 pb-2">
                  <div className="flex items-center gap-2">
                    <Radio className="w-4 h-4 text-purple-400" />
                    <span className="text-xs font-bold text-white">
                      DMA Megszakítási Eseménynapló (ISR Trace)
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400">ESP_INTR_FLAG_DMA</span>
                </div>

                <div className="space-y-1.5 font-mono text-[11px]">
                  {recentInterruptLog.map((log, i) => (
                    <div
                      key={i}
                      className="p-1.5 rounded bg-[#0E1117] border border-slate-800/80 text-purple-300 flex items-center justify-between"
                    >
                      <span>{log}</span>
                      <span className="text-[9px] text-slate-500">Core 0 / Level 1</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: HARDWARE CHANNELS */}
          {activeTab === 'channels' && (
            <div className="space-y-3">
              <p className="text-xs text-slate-400">
                Válaszd ki az ESP32 hardveres DMA csatornáját a kívánt perifériás adatfolyamhoz:
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {(Object.keys(DMA_CHANNEL_INFO) as Esp32DmaChannelType[]).map((chKey) => {
                  const ch = DMA_CHANNEL_INFO[chKey];
                  const isSelected = state.activeChannel === chKey;
                  return (
                    <div
                      key={chKey}
                      onClick={() => updateState((p) => ({ ...p, activeChannel: chKey }))}
                      className={`p-3.5 rounded-lg border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[#192231] border-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.3)] ring-1 ring-cyan-400'
                          : 'bg-[#141822] border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between border-b border-slate-700/60 pb-1.5 mb-2">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: ch.color }}
                          />
                          <span className="text-xs font-bold text-white">{ch.name}</span>
                        </div>
                        <span className="text-[10px] font-bold text-cyan-300">{ch.maxThroughput}</span>
                      </div>

                      <p className="text-[11px] text-slate-300 leading-tight mb-2">{ch.desc}</p>

                      <div className="text-[10px] text-slate-400 flex items-center justify-between">
                        <span>Cél Periféria:</span>
                        <span className="font-bold text-slate-200">{ch.peripheral}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 4: PRESETS */}
          {activeTab === 'presets' && (
            <div className="space-y-3">
              <p className="text-xs text-slate-400">
                Tölts be előre optimalizált ESP32 DMA architektúra mintákat egyetlen kattintással:
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-lg bg-[#141822] border border-cyan-900/60 space-y-2 flex flex-col justify-between">
                  <div>
                    <div className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                      <Flame className="w-4 h-4 text-cyan-400" />
                      <span>SPI TFT Kijelző Framebuffer</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      320x240 RGB565 sávos dupla pufferelés 80 MHz SPI buszon 60 FPS sebességgel.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      applyPreset('tft_spi');
                      setActiveTab('descriptors');
                    }}
                    className="w-full py-1.5 rounded bg-cyan-950 text-cyan-300 hover:bg-cyan-900 border border-cyan-700 text-xs font-bold cursor-pointer"
                  >
                    Sablon Betöltése
                  </button>
                </div>

                <div className="p-3.5 rounded-lg bg-[#141822] border-purple-900/60 space-y-2 flex flex-col justify-between">
                  <div>
                    <div className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
                      <Activity className="w-4 h-4 text-purple-400" />
                      <span>2 MSPS Folyamatos ADC Mintavevő</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Kétlépcsős körkörös DMA puffer nagyfrekvenciás analóg jelek (SDR/Oszcilloszkóp) rögzítéséhez.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      applyPreset('adc_continuous');
                      setActiveTab('descriptors');
                    }}
                    className="w-full py-1.5 rounded bg-purple-950 text-purple-300 hover:bg-purple-900 border border-purple-700 text-xs font-bold cursor-pointer"
                  >
                    Sablon Betöltése
                  </button>
                </div>

                <div className="p-3.5 rounded-lg bg-[#141822] border-emerald-900/60 space-y-2 flex flex-col justify-between">
                  <div>
                    <div className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                      <Zap className="w-4 h-4 text-emerald-400" />
                      <span>GDMA Hardveres Blokkmásolás</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      160 MB/s sebességű zero-copy SRAM-ból SRAM-ba történő DMA másolás CPU beavatkozás nélkül.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      applyPreset('mem_copy');
                      setActiveTab('descriptors');
                    }}
                    className="w-full py-1.5 rounded bg-emerald-950 text-emerald-300 hover:bg-emerald-900 border border-emerald-700 text-xs font-bold cursor-pointer"
                  >
                    Sablon Betöltése
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: GENERATED C CODE */}
          {activeTab === 'code' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400 font-bold">
                  Valós, beágyazott ESP-IDF és Arduino kompatibilis C kód:
                </span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(generatedC);
                    setCopiedCode(true);
                    setTimeout(() => setCopiedCode(false), 2000);
                  }}
                  className="px-3 py-1 text-xs font-bold rounded bg-cyan-950 text-cyan-300 hover:bg-cyan-900 border border-cyan-700 cursor-pointer flex items-center gap-1.5"
                >
                  {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCode ? 'Másolva!' : 'Kód Másolása'}</span>
                </button>
              </div>

              <pre className="p-3.5 rounded-lg bg-[#07090E] border border-slate-800 text-[11px] font-mono text-cyan-200 overflow-x-auto max-h-[460px] leading-relaxed">
                {generatedC}
              </pre>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 bg-[#12141C] border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-3">
            <span>
              Aktív: <b className="text-cyan-300">{currentChannel.name}</b>
            </span>
            <span>•</span>
            <span>
              Leírók száma: <b className="text-white">{state.descriptors.length} db</b>
            </span>
            <span>•</span>
            <span>
              Puffer típus: <b className="text-amber-300">{state.isCircularRing ? 'Körkörös Ring' : 'Lineáris'}</b>
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-bold rounded bg-cyan-600 hover:bg-cyan-500 text-black cursor-pointer transition-colors"
          >
            Kész & Vissza
          </button>
        </div>
      </div>
    </div>
  );
};
