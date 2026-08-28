/**
 * (c) 2026 AI Studio
 * ESP32 I2A / I2S (Inter-IC Audio & High-Speed Parallel Bus) Management Modal
 * Real-time audio oscilloscope, 16-band FFT spectrum analyzer, VU-meter,
 * sample rate PLL clock calculator, GPIO matrix pinout, and ESP-IDF C code generator.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Radio,
  Activity,
  Sliders,
  Volume2,
  VolumeX,
  Play,
  Pause,
  RefreshCw,
  Zap,
  Cpu,
  Layers,
  Code2,
  Copy,
  Check,
  X,
  Flame,
  CheckCircle2,
  Info,
  Disc,
  Mic,
  Speaker,
} from 'lucide-react';
import { Esp32I2aState, Esp32I2aMode, Esp32I2aChannelFormat } from '../types';

interface Esp32I2aModalProps {
  isOpen: boolean;
  onClose: () => void;
  i2aState?: Esp32I2aState;
  onUpdateI2aState?: (updater: (prev: Esp32I2aState) => Esp32I2aState) => void;
}

const I2A_MODES_INFO: Record<
  Esp32I2aMode,
  { name: string; target: string; desc: string; sampleRates: number[]; color: string }
> = {
  philips_i2s: {
    name: 'Standard Philips I2S',
    target: 'Külső Hi-Fi DAC / Codec (MAX98357A, PCM5102)',
    desc: 'Szabványos digitális hangátvitel 1 óraciklus késleltetésű MSB adatformátummal sztereó DAC-okhoz.',
    sampleRates: [8000, 16000, 32000, 44100, 48000, 96000, 192000],
    color: '#38bdf8',
  },
  msb_justified: {
    name: 'MSB-Justified (Left-Justified)',
    target: 'Professzionális DSP és Audio Processzorok',
    desc: 'Az adat közvetlenül a WS (LRCLK) élváltáskor kezdődik késleltetés nélkül, ideális DSP jelfeldolgozáshoz.',
    sampleRates: [16000, 44100, 48000, 96000],
    color: '#818cf8',
  },
  pdm_rx: {
    name: 'PDM Digitális Mikrofon (Pulse Density)',
    target: 'MEMS Mikrofonok (INMP441, SPH0645)',
    desc: 'Közvetlen 1-bites PDM modulált mikrofon jel fogadása beépített hardveres decimációs és CIC szűrővel.',
    sampleRates: [16000, 32000, 44100, 48000],
    color: '#c084fc',
  },
  dac_built_in: {
    name: 'Beépített 8-bites DAC Mód',
    target: 'Belső Analóg Kimenet (GPIO25 & GPIO26)',
    desc: 'Külső DAC chip nélküli közvetlen analóg audio hullámforma szintézis az ESP32 beépített 8-bites DAC egységén.',
    sampleRates: [8000, 16000, 22050, 44100],
    color: '#f472b6',
  },
  adc_highspeed: {
    name: 'Nagysebességű 12-bites ADC DMA Mód',
    target: 'Folyamatos 2 MSPS Analóg Mintavételezés',
    desc: 'Beépített SAR ADC közvetlen I2S DMA csatornára kapcsolása, SDR rádióhoz és virtuális oszcilloszkóphoz.',
    sampleRates: [100000, 500000, 1000000, 2000000],
    color: '#34d399',
  },
  lcd_cam_parallel: {
    name: 'Párhuzamos 8/16-bit Kamera/LCD Mód',
    target: 'OV2640 Kamera & 8080 Párhuzamos Kijelző',
    desc: 'Nagysebességű 8 vagy 16 bites párhuzamos DMA adatbusz képrögzítéshez vagy grafikus vezérléshez.',
    sampleRates: [10000000, 20000000],
    color: '#fbbf24',
  },
};

export const Esp32I2aModal: React.FC<Esp32I2aModalProps> = ({
  isOpen,
  onClose,
  i2aState,
  onUpdateI2aState,
}) => {
  const [activeTab, setActiveTab] = useState<'scope' | 'config' | 'pinout' | 'presets' | 'code'>('scope');
  const [copiedCode, setCopiedCode] = useState(false);
  const [isAudioMuted, setIsAudioMuted] = useState(false);

  // Local fallback state
  const [localI2a, setLocalI2a] = useState<Esp32I2aState>(
    i2aState || {
      port: 0,
      enabled: true,
      mode: 'philips_i2s',
      sampleRate: 44100,
      bitsPerSample: 16,
      channelFormat: 'stereo',
      bclkPin: 26,
      wsPin: 25,
      doutPin: 22,
      dinPin: 19,
      mclkPin: 0,
      dmaBufferCount: 4,
      dmaBufferLength: 256,
      synthWaveform: 'sine',
      synthFreqHz: 440,
      synthVolumePercent: 75,
      isPlaying: true,
      peakLeftDbfs: -6.2,
      peakRightDbfs: -5.8,
      fftBands: [15, 28, 45, 62, 78, 85, 92, 74, 60, 48, 35, 25, 18, 12, 8, 4],
      bufferUnderrunCount: 0,
    }
  );

  const state = i2aState || localI2a;

  const updateState = (updater: (prev: Esp32I2aState) => Esp32I2aState) => {
    if (onUpdateI2aState) {
      onUpdateI2aState(updater);
    } else {
      setLocalI2a(updater);
    }
  };

  // Animated FFT Spectrum simulation loop
  useEffect(() => {
    if (!isOpen || !state.isPlaying) return;

    const interval = setInterval(() => {
      updateState((prev) => {
        // Generate dynamic animated FFT bands based on synth frequency and waveform
        const baseFreq = prev.synthFreqHz;
        const volumeFactor = prev.synthVolumePercent / 100;
        const newBands = Array.from({ length: 16 }, (_, i) => {
          const centerFreq = 40 * Math.pow(1.5, i);
          const dist = Math.abs(Math.log2(centerFreq / (baseFreq + 1)));
          const peak = Math.max(5, Math.floor((95 / (1 + dist * dist)) * volumeFactor + (Math.random() * 8 - 4)));
          return Math.min(100, Math.max(2, peak));
        });

        const leftPeak = -18 + (newBands[4] / 100) * 16 + (Math.random() * 2 - 1);
        const rightPeak = -18 + (newBands[5] / 100) * 16 + (Math.random() * 2 - 1);

        return {
          ...prev,
          fftBands: newBands,
          peakLeftDbfs: parseFloat(leftPeak.toFixed(1)),
          peakRightDbfs: parseFloat(rightPeak.toFixed(1)),
        };
      });
    }, 100);

    return () => clearInterval(interval);
  }, [isOpen, state.isPlaying]);

  if (!isOpen) return null;

  const currentModeInfo = I2A_MODES_INFO[state.mode] || I2A_MODES_INFO.philips_i2s;

  // Clock calculations
  const channelCount = state.channelFormat === 'stereo' || state.channelFormat === 'dual_mono' ? 2 : 1;
  const bclkFreqHz = state.sampleRate * channelCount * state.bitsPerSample;
  const bclkFreqMhz = (bclkFreqHz / 1000000).toFixed(3);
  const mclkFreqMhz = ((state.sampleRate * 256) / 1000000).toFixed(3);

  // Preset loaders
  const applyPreset = (presetId: string) => {
    if (presetId === 'max98357a_dac') {
      updateState((p) => ({
        ...p,
        port: 0,
        mode: 'philips_i2s',
        sampleRate: 44100,
        bitsPerSample: 16,
        channelFormat: 'stereo',
        bclkPin: 26,
        wsPin: 25,
        doutPin: 22,
        dinPin: 19,
        synthWaveform: 'sine',
        synthFreqHz: 440,
        synthVolumePercent: 80,
        isPlaying: true,
      }));
    } else if (presetId === 'inmp441_mic') {
      updateState((p) => ({
        ...p,
        port: 0,
        mode: 'philips_i2s',
        sampleRate: 16000,
        bitsPerSample: 24,
        channelFormat: 'mono_left',
        bclkPin: 14,
        wsPin: 15,
        doutPin: 22,
        dinPin: 32,
        synthWaveform: 'speech_mic',
        synthFreqHz: 280,
        synthVolumePercent: 65,
        isPlaying: true,
      }));
    } else if (presetId === 'builtin_dac') {
      updateState((p) => ({
        ...p,
        port: 0,
        mode: 'dac_built_in',
        sampleRate: 44100,
        bitsPerSample: 16,
        channelFormat: 'dual_mono',
        bclkPin: 26,
        wsPin: 25,
        doutPin: 25, // Internal DAC1 (GPIO25)
        dinPin: 0,
        synthWaveform: 'triangle',
        synthFreqHz: 880,
        synthVolumePercent: 90,
        isPlaying: true,
      }));
    } else if (presetId === 'highspeed_adc_sdr') {
      updateState((p) => ({
        ...p,
        port: 1,
        mode: 'adc_highspeed',
        sampleRate: 1000000, // 1 MSPS
        bitsPerSample: 16,
        channelFormat: 'mono_left',
        bclkPin: 0,
        wsPin: 0,
        doutPin: 0,
        dinPin: 36, // ADC1_CH0 (VP / GPIO36)
        synthWaveform: 'adc_scan',
        synthFreqHz: 1200,
        synthVolumePercent: 100,
        isPlaying: true,
      }));
    }
  };

  // Generate real ESP-IDF C Code for I2S/I2A
  const generatedC = `/**
 * ESP32 I2S / I2A Hardveres Audio & DMA Interfész Konfiguráció
 * Generálva: Arduino ASM Studio I2A Menedzser által
 * Mód: ${currentModeInfo.name} (${state.mode}) @ ${state.sampleRate} Hz
 */

#include <stdio.h>
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "driver/i2s.h"
#include "esp_system.h"
#include <math.h>

#define I2S_PORT_NUM         I2S_NUM_${state.port}
#define SAMPLE_RATE          ${state.sampleRate}
#define I2S_BITS_PER_SAMPLE  I2S_BITS_PER_SAMPLE_${state.bitsPerSample}BIT
#define DMA_BUF_COUNT        ${state.dmaBufferCount}
#define DMA_BUF_LEN          ${state.dmaBufferLength}

// GPIO Lábkiosztás Pin Mátrix
#define I2S_BCLK_PIN         ${state.bclkPin}
#define I2S_WS_PIN           ${state.wsPin}
#define I2S_DOUT_PIN         ${state.doutPin}
#define I2S_DIN_PIN          ${state.dinPin}

void init_esp32_i2s_audio(void) {
    printf("[I2S] Inicializálás: I2S_NUM_${state.port} (${state.sampleRate} Hz, ${state.bitsPerSample}-bit)...\\n");

    // 1. I2S Illesztőprogram Fő Konfiguráció
    i2s_config_t i2s_config = {
        .mode = (i2s_mode_t)(I2S_MODE_MASTER | ${
          state.mode === 'dac_built_in'
            ? 'I2S_MODE_TX | I2S_MODE_DAC_BUILT_IN'
            : state.mode === 'adc_highspeed'
            ? 'I2S_MODE_RX | I2S_MODE_ADC_BUILT_IN'
            : state.mode === 'pdm_rx'
            ? 'I2S_MODE_RX | I2S_MODE_PDM'
            : 'I2S_MODE_TX | I2S_MODE_RX'
        }),
        .sample_rate = SAMPLE_RATE,
        .bits_per_sample = I2S_BITS_PER_SAMPLE,
        .channel_format = ${
          state.channelFormat === 'stereo'
            ? 'I2S_CHANNEL_FMT_RIGHT_LEFT'
            : state.channelFormat === 'mono_left'
            ? 'I2S_CHANNEL_FMT_ONLY_LEFT'
            : state.channelFormat === 'mono_right'
            ? 'I2S_CHANNEL_FMT_ONLY_RIGHT'
            : 'I2S_CHANNEL_FMT_ALL_LEFT'
        },
        .communication_format = ${
          state.mode === 'msb_justified'
            ? 'I2S_COMM_FORMAT_STAND_MSB'
            : 'I2S_COMM_FORMAT_STAND_I2S'
        },
        .intr_alloc_flags = ESP_INTR_FLAG_LEVEL1,
        .dma_buf_count = DMA_BUF_COUNT,
        .dma_buf_len = DMA_BUF_LEN,
        .use_apll = true, // Audió minőségű APLL órajel generátor
        .tx_desc_auto_clear = true
    };

    // 2. I2S Driver Telepítése a memóriába
    esp_err_t err = i2s_driver_install(I2S_PORT_NUM, &i2s_config, 0, NULL);
    if (err != ESP_OK) {
        printf("[I2S] HIBA a driver telepítésekor: %d\\n", err);
        return;
    }

    // 3. GPIO Lábak Hozzárendelése (Pin Routing Matrix)
    i2s_pin_config_t pin_config = {
        .bck_io_num = I2S_BCLK_PIN,
        .ws_io_num = I2S_WS_PIN,
        .data_out_num = I2S_DOUT_PIN,
        .data_in_num = I2S_DIN_PIN
    };

    i2s_set_pin(I2S_PORT_NUM, &pin_config);
    printf("[I2S] BCLK: %d, WS: %d, DOUT: %d, DIN: %d konfigurálva.\\n", I2S_BCLK_PIN, I2S_WS_PIN, I2S_DOUT_PIN, I2S_DIN_PIN);
}

// Folyamatos Audio Stream Küldés / Írás FreeRTOS Taszkból
void audio_stream_task(void *pvParameters) {
    int16_t sample_buffer[DMA_BUF_LEN * 2];
    size_t bytes_written;
    float phase = 0.0f;
    float phase_step = (2.0f * M_PI * ${state.synthFreqHz}.0f) / (float)SAMPLE_RATE;

    while (1) {
        // Valós idejű Szinusz Hullám generálása (${state.synthFreqHz} Hz)
        for (int i = 0; i < DMA_BUF_LEN; i++) {
            int16_t val = (int16_t)(sinf(phase) * 28000.0f * (${state.synthVolumePercent}.0f / 100.0f));
            sample_buffer[i * 2] = val;     // Bal csatorna
            sample_buffer[i * 2 + 1] = val; // Jobb csatorna
            phase += phase_step;
            if (phase >= 2.0f * M_PI) phase -= 2.0f * M_PI;
        }

        // Zero-CPU Blokkolás nélküli DMA Puffer írás
        i2s_write(I2S_PORT_NUM, sample_buffer, sizeof(sample_buffer), &bytes_written, portMAX_DELAY);
    }
}
`;

  return (
    <div
      id="modal-esp32-i2a"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-xs font-mono select-none"
    >
      <div className="flex flex-col w-full max-w-5xl h-[92vh] max-h-[850px] bg-[#0E1117] border border-purple-500/60 rounded-lg shadow-[0_0_30px_rgba(168,85,247,0.25)] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-[#161922] border-b border-purple-900/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-purple-950/80 text-purple-400 border border-purple-500/50 shadow-[0_0_12px_rgba(168,85,247,0.3)]">
              <Radio className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                  ESP32 I2A / I2S Audio & Párhuzamos Busz Menedzsment
                </h2>
                <span className="px-2 py-0.5 text-[10px] rounded-full bg-purple-950 text-purple-300 border border-purple-700 font-bold">
                  I2S_NUM_{state.port}
                </span>
                <span className="px-2 py-0.5 text-[10px] rounded-full bg-sky-950 text-sky-300 border border-sky-700 font-bold">
                  {state.sampleRate >= 1000000
                    ? `${(state.sampleRate / 1000000).toFixed(1)} MSPS`
                    : `${(state.sampleRate / 1000).toFixed(1)} kHz`}{' '}
                  {state.bitsPerSample}-bit
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Inter-IC Sound / Audio & Parallel Engine: 8-32 bites sztereó audio, PDM digitális mikrofon, belső DAC/ADC szintézis és DMA stream
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="btn-close-i2a-modal"
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
              onClick={() => setActiveTab('scope')}
              className={`px-3 py-1.5 rounded-t-md font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'scope'
                  ? 'bg-[#1E2330] text-purple-300 border-b-2 border-purple-400'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Oszcilloszkóp & Spektrumelemző</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('config')}
              className={`px-3 py-1.5 rounded-t-md font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'config'
                  ? 'bg-[#1E2330] text-sky-300 border-b-2 border-sky-400'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>I2S Konfiguráció & Órajel PLL</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('pinout')}
              className={`px-3 py-1.5 rounded-t-md font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'pinout'
                  ? 'bg-[#1E2330] text-emerald-300 border-b-2 border-emerald-400'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>GPIO Pinout & Lábkiosztás</span>
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
              <span>Audio Sablonok</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('code')}
              className={`px-3 py-1.5 rounded-t-md font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'code'
                  ? 'bg-[#1E2330] text-cyan-300 border-b-2 border-cyan-400'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>ESP-IDF C Kód</span>
            </button>
          </div>

          {/* Quick Stream Play/Pause Toggle */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => updateState((p) => ({ ...p, isPlaying: !p.isPlaying }))}
              className={`px-2.5 py-1 rounded text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors border ${
                state.isPlaying
                  ? 'bg-purple-950/80 text-purple-300 border-purple-600 hover:bg-purple-900'
                  : 'bg-slate-800 text-slate-300 border-slate-600 hover:bg-slate-700'
              }`}
            >
              {state.isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
              <span>{state.isPlaying ? 'Stream Szünet' : 'Stream Indítása'}</span>
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#0E1117]">
          {/* TAB 1: OSCILLOSCOPE & FFT SPECTRUM */}
          {activeTab === 'scope' && (
            <div className="space-y-4">
              {/* Audio Monitor Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-lg bg-[#141822] border border-purple-900/50">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Mód & Formátum</div>
                  <div className="text-sm font-bold text-purple-300 truncate mt-0.5">
                    {currentModeInfo.name}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{state.channelFormat}</div>
                </div>

                <div className="p-3 rounded-lg bg-[#141822] border border-purple-900/50">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">BCLK Bit Órajel</div>
                  <div className="text-sm font-bold text-sky-400 mt-0.5">{bclkFreqMhz} MHz</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">MCLK: {mclkFreqMhz} MHz</div>
                </div>

                <div className="p-3 rounded-lg bg-[#141822] border border-purple-900/50">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Bal / Jobb Peak dBFS</div>
                  <div className="text-sm font-bold text-emerald-400 mt-0.5 flex items-center gap-2">
                    <span>L: {state.peakLeftDbfs} dB</span>
                    <span>R: {state.peakRightDbfs} dB</span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">0 Underrun / Zero Jitter</div>
                </div>

                <div className="p-3 rounded-lg bg-[#141822] border border-purple-900/50">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">DMA Pufferelés</div>
                  <div className="text-sm font-bold text-amber-300 mt-0.5">
                    {state.dmaBufferCount} × {state.dmaBufferLength} B
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    {state.dmaBufferCount * state.dmaBufferLength} B teljes méret
                  </div>
                </div>
              </div>

              {/* Live Scope Canvas + FFT Display */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1. Oscilloscope Waveform */}
                <div className="p-4 rounded-lg bg-[#12151E] border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-700/60 pb-2">
                    <div className="flex items-center gap-2">
                      <Activity className="w-4 h-4 text-purple-400" />
                      <span className="text-xs font-bold text-white uppercase tracking-wider">
                        Valós Idejű Audio Oszcilloszkóp (L/R)
                      </span>
                    </div>
                    <span className="text-[10px] text-purple-300 font-bold">
                      {state.synthFreqHz} Hz ({state.synthWaveform})
                    </span>
                  </div>

                  {/* SVG Waveform renderer */}
                  <div className="h-44 bg-[#07090E] rounded-lg border border-slate-900 flex items-center justify-center relative overflow-hidden">
                    {/* Grid lines */}
                    <div className="absolute inset-0 grid grid-cols-6 grid-rows-4 opacity-20 pointer-events-none">
                      {Array.from({ length: 24 }).map((_, i) => (
                        <div key={i} className="border-r border-b border-purple-500" />
                      ))}
                    </div>

                    {/* Left/Right Channel Sine Waves */}
                    <svg className="w-full h-full" viewBox="0 0 400 150" preserveAspectRatio="none">
                      {/* Center zero-volt reference line */}
                      <line x1="0" y1="75" x2="400" y2="75" stroke="#334155" strokeDasharray="3,3" />

                      {/* Left Channel (Purple) */}
                      <path
                        d={(() => {
                          const points: string[] = [];
                          const amp = 50 * (state.synthVolumePercent / 100);
                          const freqFactor = (state.synthFreqHz / 200) * 0.05;
                          for (let x = 0; x <= 400; x += 4) {
                            let y = 75;
                            if (state.synthWaveform === 'sine') {
                              y = 75 + Math.sin(x * freqFactor) * amp;
                            } else if (state.synthWaveform === 'square') {
                              y = 75 + (Math.sin(x * freqFactor) >= 0 ? amp : -amp);
                            } else if (state.synthWaveform === 'triangle') {
                              y = 75 + (Math.asin(Math.sin(x * freqFactor)) / (Math.PI / 2)) * amp;
                            } else {
                              y = 75 + (Math.random() * 2 - 1) * amp;
                            }
                            points.push(`${x},${y.toFixed(1)}`);
                          }
                          return `M ${points.join(' L ')}`;
                        })()}
                        fill="none"
                        stroke="#c084fc"
                        strokeWidth="2.5"
                        className="drop-shadow-[0_0_8px_rgba(192,132,252,0.8)]"
                      />

                      {/* Right Channel (Sky, slightly offset) */}
                      <path
                        d={(() => {
                          const points: string[] = [];
                          const amp = 45 * (state.synthVolumePercent / 100);
                          const freqFactor = (state.synthFreqHz / 200) * 0.05;
                          for (let x = 0; x <= 400; x += 4) {
                            let y = 75 + Math.sin(x * freqFactor + 0.5) * amp;
                            points.push(`${x},${y.toFixed(1)}`);
                          }
                          return `M ${points.join(' L ')}`;
                        })()}
                        fill="none"
                        stroke="#38bdf8"
                        strokeWidth="1.5"
                        strokeDasharray="4,2"
                        strokeOpacity="0.8"
                      />
                    </svg>

                    <div className="absolute bottom-2 left-3 flex items-center gap-3 text-[10px] font-bold">
                      <span className="text-purple-300 flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-purple-400" /> Bal Csatorna (L)
                      </span>
                      <span className="text-sky-300 flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-sky-400" /> Jobb Csatorna (R)
                      </span>
                    </div>
                  </div>
                </div>

                {/* 2. 16-Band FFT Spectrum Analyzer & VU Meter */}
                <div className="p-4 rounded-lg bg-[#12151E] border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-700/60 pb-2">
                    <div className="flex items-center gap-2">
                      <Sliders className="w-4 h-4 text-emerald-400" />
                      <span className="text-xs font-bold text-white uppercase tracking-wider">
                        16-Sávos FFT Spektrumanalizátor & VU-Meter
                      </span>
                    </div>
                    <span className="text-[10px] text-emerald-400 font-bold">Valós Idejű DSP</span>
                  </div>

                  {/* FFT Equalizer Bars */}
                  <div className="h-44 bg-[#07090E] rounded-lg border border-slate-900 p-3 flex items-end justify-between gap-1.5">
                    {state.fftBands.map((val, idx) => (
                      <div key={idx} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                        <div className="w-full bg-slate-900 rounded-t h-full flex items-end">
                          <div
                            className="w-full rounded-t transition-all duration-100"
                            style={{
                              height: `${val}%`,
                              backgroundColor:
                                val > 80 ? '#f43f5e' : val > 50 ? '#fbbf24' : '#34d399',
                              boxShadow: `0 0 8px ${
                                val > 80
                                  ? 'rgba(244,63,94,0.6)'
                                  : val > 50
                                  ? 'rgba(251,191,36,0.5)'
                                  : 'rgba(52,211,153,0.4)'
                              }`,
                            }}
                          />
                        </div>
                        <span className="text-[8px] text-slate-500 font-mono">
                          {idx === 0 ? '40' : idx === 5 ? '300' : idx === 10 ? '2k' : idx === 15 ? '16k' : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Interactive Audio Tone Generator Controls */}
              <div className="p-4 rounded-lg bg-[#141822] border border-slate-800 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-700/60 pb-2">
                  <div className="flex items-center gap-2">
                    <Speaker className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-bold text-white">
                      Interaktív I2S Hanggenerátor & Teszt Szintetizátor
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400">DMA Direct Stream Injection</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  {/* Waveform Selector */}
                  <div>
                    <label className="block text-slate-400 text-[10px] font-bold uppercase mb-1">
                      Hullámforma Típus:
                    </label>
                    <select
                      value={state.synthWaveform}
                      onChange={(e) =>
                        updateState((p) => ({ ...p, synthWaveform: e.target.value as any }))
                      }
                      className="w-full bg-[#0E1117] border border-slate-700 rounded px-2.5 py-1.5 text-purple-300 text-xs focus:outline-hidden"
                    >
                      <option value="sine">Szinusz Hullám (Pure Sine 440Hz)</option>
                      <option value="triangle">Háromszög Hullám (Triangle)</option>
                      <option value="square">Négyszög Hullám (Square Wave)</option>
                      <option value="noise">Fehér Zaj (White Noise)</option>
                      <option value="speech_mic">Beszédhang MEMS Szimuláció</option>
                      <option value="adc_scan">Nagysebességű ADC Pásztázás</option>
                    </select>
                  </div>

                  {/* Frequency Slider */}
                  <div>
                    <div className="flex justify-between text-slate-400 text-[10px] font-bold uppercase mb-1">
                      <span>Frekvencia:</span>
                      <span className="text-cyan-300">{state.synthFreqHz} Hz</span>
                    </div>
                    <input
                      type="range"
                      min={50}
                      max={4000}
                      step={10}
                      value={state.synthFreqHz}
                      onChange={(e) =>
                        updateState((p) => ({ ...p, synthFreqHz: parseInt(e.target.value, 10) }))
                      }
                      className="w-full accent-cyan-400 cursor-pointer"
                    />
                  </div>

                  {/* Volume Slider */}
                  <div>
                    <div className="flex justify-between text-slate-400 text-[10px] font-bold uppercase mb-1">
                      <span>Hangerő / Amplitúdó:</span>
                      <span className="text-emerald-300">{state.synthVolumePercent}%</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={state.synthVolumePercent}
                      onChange={(e) =>
                        updateState((p) => ({ ...p, synthVolumePercent: parseInt(e.target.value, 10) }))
                      }
                      className="w-full accent-emerald-400 cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: CONFIG & CLOCK PLL */}
          {activeTab === 'config' && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-[#141822] border border-sky-900/60 space-y-3">
                <div className="flex items-center gap-2 text-sky-400 font-bold text-sm">
                  <Sliders className="w-5 h-5" />
                  <span>I2S Mód, Mintavételezés és Bitmélység Beállítások</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                  {/* Mode Select */}
                  <div>
                    <label className="block text-slate-400 text-[10px] font-bold uppercase mb-1">
                      Működési Mód:
                    </label>
                    <select
                      value={state.mode}
                      onChange={(e) => updateState((p) => ({ ...p, mode: e.target.value as any }))}
                      className="w-full bg-[#0E1117] border border-slate-700 rounded px-2.5 py-2 text-sky-300 text-xs focus:outline-hidden"
                    >
                      {(Object.keys(I2A_MODES_INFO) as Esp32I2aMode[]).map((mKey) => (
                        <option key={mKey} value={mKey}>
                          {I2A_MODES_INFO[mKey].name}
                        </option>
                      ))}
                    </select>
                    <p className="text-[11px] text-slate-400 mt-1">{currentModeInfo.desc}</p>
                  </div>

                  {/* Sample Rate Select */}
                  <div>
                    <label className="block text-slate-400 text-[10px] font-bold uppercase mb-1">
                      Mintavételezési Frekvencia (Sample Rate):
                    </label>
                    <select
                      value={state.sampleRate}
                      onChange={(e) =>
                        updateState((p) => ({ ...p, sampleRate: parseInt(e.target.value, 10) }))
                      }
                      className="w-full bg-[#0E1117] border border-slate-700 rounded px-2.5 py-2 text-emerald-300 text-xs focus:outline-hidden"
                    >
                      <option value={8000}>8,000 Hz (Telefónia / Walkie-Talkie)</option>
                      <option value={16000}>16,000 Hz (Beszédfelismerés / Alexa / Whisper)</option>
                      <option value={22050}>22,050 Hz (Retro Audio / DAC)</option>
                      <option value={44100}>44,100 Hz (CD Minőségű Zene)</option>
                      <option value={48000}>48,000 Hz (Stúdió & Film Hang)</option>
                      <option value={96000}>96,000 Hz (Hi-Res Audio)</option>
                      <option value={1000000}>1,000,000 Hz (1 MSPS Nagysebességű ADC)</option>
                      <option value={2000000}>2,000,000 Hz (2 MSPS ADC Oszcilloszkóp)</option>
                    </select>
                  </div>

                  {/* Bit Depth */}
                  <div>
                    <label className="block text-slate-400 text-[10px] font-bold uppercase mb-1">
                      Bitmélység (Bits per Sample):
                    </label>
                    <select
                      value={state.bitsPerSample}
                      onChange={(e) =>
                        updateState((p) => ({
                          ...p,
                          bitsPerSample: parseInt(e.target.value, 10) as any,
                        }))
                      }
                      className="w-full bg-[#0E1117] border border-slate-700 rounded px-2.5 py-2 text-purple-300 text-xs focus:outline-hidden"
                    >
                      <option value={8}>8-bit (Beépített DAC / Kis sávszélesség)</option>
                      <option value={16}>16-bit (Szabványos Hi-Fi Audio)</option>
                      <option value={24}>24-bit (Professzionális Stúdió DAC)</option>
                      <option value={32}>32-bit (32-bit Lebegőpontos DSP)</option>
                    </select>
                  </div>

                  {/* Channel Format */}
                  <div>
                    <label className="block text-slate-400 text-[10px] font-bold uppercase mb-1">
                      Csatorna Formátum:
                    </label>
                    <select
                      value={state.channelFormat}
                      onChange={(e) =>
                        updateState((p) => ({ ...p, channelFormat: e.target.value as any }))
                      }
                      className="w-full bg-[#0E1117] border border-slate-700 rounded px-2.5 py-2 text-amber-300 text-xs focus:outline-hidden"
                    >
                      <option value="stereo">Sztereó (Bal + Jobb)</option>
                      <option value="mono_left">Csak Bal Csatorna (Mono Left)</option>
                      <option value="mono_right">Csak Jobb Csatorna (Mono Right)</option>
                      <option value="dual_mono">Duál Monó (Mindkét oldalon azonos)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Exact PLL Clock Calculation Matrix */}
              <div className="p-4 rounded-lg bg-[#141822] border border-slate-800 space-y-2">
                <span className="text-xs font-bold text-white uppercase tracking-wider block">
                  Hardveres Órajel-Generátor (APLL / BCLK / WS / MCLK)
                </span>
                <div className="grid grid-cols-3 gap-3 text-xs pt-1">
                  <div className="p-2.5 rounded bg-[#0E1117] border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">BCLK (Bit Clock):</span>
                    <span className="font-bold text-sky-300">{bclkFreqMhz} MHz</span>
                    <span className="text-[9px] text-slate-500 block mt-0.5">
                      Fs × {channelCount} csat × {state.bitsPerSample} bit
                    </span>
                  </div>

                  <div className="p-2.5 rounded bg-[#0E1117] border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">WS (Word Select / LRCLK):</span>
                    <span className="font-bold text-purple-300">{state.sampleRate} Hz</span>
                    <span className="text-[9px] text-slate-500 block mt-0.5">Mintavételi frekvencia</span>
                  </div>

                  <div className="p-2.5 rounded bg-[#0E1117] border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">MCLK (Master Clock):</span>
                    <span className="font-bold text-emerald-300">{mclkFreqMhz} MHz</span>
                    <span className="text-[9px] text-slate-500 block mt-0.5">256 × Fs referencia</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: GPIO PINOUT */}
          {activeTab === 'pinout' && (
            <div className="space-y-4">
              <p className="text-xs text-slate-400">
                Az ESP32 rugalmas GPIO Pin Mátrixán keresztül bármelyik lábhoz hozzárendelheted az I2S funkciókat:
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-[#141822] border border-slate-800 space-y-3">
                  <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider block">
                    I2S Digitális Audio Lábkiosztás
                  </span>

                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between p-2 rounded bg-[#0E1117] border border-slate-800">
                      <span className="font-bold text-slate-300">BCLK (Bit Clock):</span>
                      <input
                        type="number"
                        value={state.bclkPin}
                        onChange={(e) =>
                          updateState((p) => ({ ...p, bclkPin: parseInt(e.target.value, 10) }))
                        }
                        className="w-16 bg-[#161922] border border-slate-700 rounded px-2 py-1 text-center text-sky-300 font-bold"
                      />
                    </div>

                    <div className="flex items-center justify-between p-2 rounded bg-[#0E1117] border border-slate-800">
                      <span className="font-bold text-slate-300">WS / LRCLK (Word Select):</span>
                      <input
                        type="number"
                        value={state.wsPin}
                        onChange={(e) =>
                          updateState((p) => ({ ...p, wsPin: parseInt(e.target.value, 10) }))
                        }
                        className="w-16 bg-[#161922] border border-slate-700 rounded px-2 py-1 text-center text-purple-300 font-bold"
                      />
                    </div>

                    <div className="flex items-center justify-between p-2 rounded bg-[#0E1117] border border-slate-800">
                      <span className="font-bold text-slate-300">DOUT / SDO (DAC Kimenet):</span>
                      <input
                        type="number"
                        value={state.doutPin}
                        onChange={(e) =>
                          updateState((p) => ({ ...p, doutPin: parseInt(e.target.value, 10) }))
                        }
                        className="w-16 bg-[#161922] border border-slate-700 rounded px-2 py-1 text-center text-emerald-300 font-bold"
                      />
                    </div>

                    <div className="flex items-center justify-between p-2 rounded bg-[#0E1117] border border-slate-800">
                      <span className="font-bold text-slate-300">DIN / SDI (Mikrofon Bemenet):</span>
                      <input
                        type="number"
                        value={state.dinPin}
                        onChange={(e) =>
                          updateState((p) => ({ ...p, dinPin: parseInt(e.target.value, 10) }))
                        }
                        className="w-16 bg-[#161922] border border-slate-700 rounded px-2 py-1 text-center text-amber-300 font-bold"
                      />
                    </div>
                  </div>
                </div>

                {/* Pin Matrix Hardware Diagram */}
                <div className="p-4 rounded-lg bg-[#141822] border border-slate-800 space-y-2">
                  <span className="text-xs font-bold text-purple-400 uppercase tracking-wider block">
                    Külső Modul Kapcsolási Segédlet
                  </span>
                  <div className="space-y-1.5 text-xs text-slate-300">
                    <div className="p-2 rounded bg-[#0E1117] border border-slate-800">
                      <span className="font-bold text-white block">MAX98357A I2S 3W Erősítő:</span>
                      <span className="text-[11px] text-slate-400">
                        BCLK -&gt; GPIO{state.bclkPin}, LRC -&gt; GPIO{state.wsPin}, DIN -&gt; GPIO{state.doutPin}
                      </span>
                    </div>
                    <div className="p-2 rounded bg-[#0E1117] border border-slate-800">
                      <span className="font-bold text-white block">INMP441 MEMS Mikrofon:</span>
                      <span className="text-[11px] text-slate-400">
                        SCK -&gt; GPIO{state.bclkPin}, WS -&gt; GPIO{state.wsPin}, SD -&gt; GPIO{state.dinPin}
                      </span>
                    </div>
                    <div className="p-2 rounded bg-[#0E1117] border border-slate-800">
                      <span className="font-bold text-white block">Beépített 8-bit DAC:</span>
                      <span className="text-[11px] text-slate-400">
                        GPIO25 (DAC1) és GPIO26 (DAC2) közvetlen analóg kimenetek
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: AUDIO PRESETS */}
          {activeTab === 'presets' && (
            <div className="space-y-3">
              <p className="text-xs text-slate-400">
                Tölts be előre optimalizált ESP32 I2A / I2S audio konfigurációkat:
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-lg bg-[#141822] border border-purple-900/60 space-y-2 flex flex-col justify-between">
                  <div>
                    <div className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
                      <Speaker className="w-4 h-4 text-purple-400" />
                      <span>MAX98357A I2S DAC Mono/Sztereó Erősítő</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      44.1 kHz 16-bites kristálytiszta zenelejátszás 3W D-osztályú digitális erősítőre.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      applyPreset('max98357a_dac');
                      setActiveTab('scope');
                    }}
                    className="w-full py-1.5 rounded bg-purple-950 text-purple-300 hover:bg-purple-900 border border-purple-700 text-xs font-bold cursor-pointer"
                  >
                    Sablon Betöltése
                  </button>
                </div>

                <div className="p-3.5 rounded-lg bg-[#141822] border border-sky-900/60 space-y-2 flex flex-col justify-between">
                  <div>
                    <div className="text-xs font-bold text-sky-300 flex items-center gap-1.5">
                      <Mic className="w-4 h-4 text-sky-400" />
                      <span>INMP441 MEMS Mikrofon (Beszédfelismerés)</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      16 kHz 24-bites alacsony zajú mintavételezés FreeRTOS és Whisper AI modellekhez.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      applyPreset('inmp441_mic');
                      setActiveTab('scope');
                    }}
                    className="w-full py-1.5 rounded bg-sky-950 text-sky-300 hover:bg-sky-900 border border-sky-700 text-xs font-bold cursor-pointer"
                  >
                    Sablon Betöltése
                  </button>
                </div>

                <div className="p-3.5 rounded-lg bg-[#141822] border border-pink-900/60 space-y-2 flex flex-col justify-between">
                  <div>
                    <div className="text-xs font-bold text-pink-300 flex items-center gap-1.5">
                      <Disc className="w-4 h-4 text-pink-400" />
                      <span>Beépített 8-bit DAC Szinusz Szintetizátor</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Közvetlen analóg hangszintézis GPIO25/26 lábakon külső IC nélkül.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      applyPreset('builtin_dac');
                      setActiveTab('scope');
                    }}
                    className="w-full py-1.5 rounded bg-pink-950 text-pink-300 hover:bg-pink-900 border border-pink-700 text-xs font-bold cursor-pointer"
                  >
                    Sablon Betöltése
                  </button>
                </div>

                <div className="p-3.5 rounded-lg bg-[#141822] border border-emerald-900/60 space-y-2 flex flex-col justify-between">
                  <div>
                    <div className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                      <Zap className="w-4 h-4 text-emerald-400" />
                      <span>2 MSPS I2S DMA Analóg Oszcilloszkóp</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Nagysebességű ADC stream SDR rádió és digitális jelfeldolgozás (DSP) céljára.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      applyPreset('highspeed_adc_sdr');
                      setActiveTab('scope');
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
                  className="px-3 py-1 text-xs font-bold rounded bg-purple-950 text-purple-300 hover:bg-purple-900 border border-purple-700 cursor-pointer flex items-center gap-1.5"
                >
                  {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCode ? 'Másolva!' : 'Kód Másolása'}</span>
                </button>
              </div>

              <pre className="p-3.5 rounded-lg bg-[#07090E] border border-slate-800 text-[11px] font-mono text-purple-200 overflow-x-auto max-h-[460px] leading-relaxed">
                {generatedC}
              </pre>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 bg-[#12141C] border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-3">
            <span>
              Mód: <b className="text-purple-300">{currentModeInfo.name}</b>
            </span>
            <span>•</span>
            <span>
              Mintavételezés:{' '}
              <b className="text-white">
                {state.sampleRate >= 1000000
                  ? `${(state.sampleRate / 1000000).toFixed(1)} MSPS`
                  : `${state.sampleRate} Hz`}
              </b>
            </span>
            <span>•</span>
            <span>
              Bitmélység: <b className="text-emerald-300">{state.bitsPerSample}-bit</b>
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-bold rounded bg-purple-600 hover:bg-purple-500 text-white cursor-pointer transition-colors"
          >
            Kész & Vissza
          </button>
        </div>
      </div>
    </div>
  );
};
