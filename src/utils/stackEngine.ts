/**
 * (c) 2026 AI Studio AVR Visual Studio
 * AVR Stack & Heap Memory Map & Collision Explosion Engine
 * High-precision memory tracker for ATmega328P (2KB SRAM, 0x0100 - 0x08FF).
 * Detects Stack Collision with Heap, stack overflows, and decodes call frames.
 */

import {
  AvrStackFrame,
  AvrHeapBlock,
  AvrStackOverflowEvent,
  AvrStackMemorySnapshot,
} from '../types';

export const ATMEGA328P_RAMSTART = 0x0100;
export const ATMEGA328P_RAMEND = 0x08ff; // 2303 in dec, 2048 bytes of SRAM
export const ATMEGA328P_SRAM_SIZE = 2048;

export const DEFAULT_HEAP_BLOCKS: AvrHeapBlock[] = [
  { id: 'hb_1', address: 0x0100, sizeBytes: 16, label: 'Globális Változók (.data)', variableName: 'pin_states[14]' },
  { id: 'hb_2', address: 0x0110, sizeBytes: 8, label: 'Statikus Puffer (.bss)', variableName: 'tx_buffer[8]' },
  { id: 'hb_3', address: 0x0118, sizeBytes: 12, label: 'Dinamikus Objektum (malloc)', variableName: 'SensorNode* ptr', allocatedBy: 'init_sensor()' },
];

/**
 * Reconstructs stack frames from raw SRAM bytes between SP and RAMEND
 */
export function decodeCallStackFrames(
  sram: Uint8Array,
  sp: number,
  spStart: number = ATMEGA328P_RAMEND
): AvrStackFrame[] {
  const frames: AvrStackFrame[] = [];
  if (sp >= spStart || sp < 0 || !sram) return frames;

  let currentAddr = spStart;
  let frameIndex = 0;

  while (currentAddr > sp && currentAddr >= ATMEGA328P_RAMSTART) {
    const sramIdx = currentAddr - ATMEGA328P_RAMSTART;
    if (sramIdx < 0 || sramIdx >= sram.length) break;

    const b0 = sram[sramIdx] || 0;

    // Check if we have a 2-byte PC return address (CALL / RCALL pushes 2 bytes: High then Low)
    if (currentAddr - 1 > sp) {
      const b1 = sram[sramIdx - 1] || 0;
      const potentialPc = (b0 << 8) | b1;

      // Realistic AVR Flash address range (0x0000 - 0x3FFF words = 0x0000 - 0x7FFF bytes)
      if (potentialPc > 0x0010 && potentialPc < 0x3fff) {
        frames.push({
          id: `frame_pc_${currentAddr}`,
          type: 'RETURN_PC',
          address: currentAddr,
          byteValue: b0,
          decodedValue: `Visszatérési Cím (PC: 0x${(potentialPc * 2).toString(16).toUpperCase().padStart(4, '0')})`,
          label: `Hívási keret #${frameIndex + 1} (RET PC)`,
          frameIndex,
        });
        currentAddr -= 2;
        frameIndex++;
        continue;
      }
    }

    // Default 1-byte register or local variable push
    frames.push({
      id: `frame_byte_${currentAddr}`,
      type: 'SAVED_REG',
      address: currentAddr,
      byteValue: b0,
      decodedValue: `0x${b0.toString(16).toUpperCase().padStart(2, '0')} (${b0} dec, '${b0 >= 32 && b0 <= 126 ? String.fromCharCode(b0) : '.'}')`,
      label: `Mentett Regiszter / Helyi Változó [0x${currentAddr.toString(16).toUpperCase()}]`,
      frameIndex,
    });

    currentAddr--;
    frameIndex++;
  }

  return frames;
}

/**
 * Creates full memory snapshot of SRAM (Static Data, Heap, Margin, Stack)
 */
export function analyzeSramMemory(
  sram: Uint8Array | null,
  sp: number = ATMEGA328P_RAMEND,
  heapBlocks: AvrHeapBlock[] = DEFAULT_HEAP_BLOCKS,
  cycle: number = 0
): AvrStackMemorySnapshot {
  const clampedSp = Math.max(0x0000, Math.min(ATMEGA328P_RAMEND + 1, sp));
  const stackSizeBytes = Math.max(0, ATMEGA328P_RAMEND - clampedSp);
  const stackUsagePercent = Math.min(100, Math.round((stackSizeBytes / ATMEGA328P_SRAM_SIZE) * 100));

  // Compute end of heap
  let heapTop = ATMEGA328P_RAMSTART + 24; // baseline static data
  if (heapBlocks && heapBlocks.length > 0) {
    heapBlocks.forEach((hb) => {
      const blockEnd = hb.address + hb.sizeBytes;
      if (blockEnd > heapTop) heapTop = blockEnd;
    });
  }

  const staticDataEnd = ATMEGA328P_RAMSTART + 24;
  const heapSizeBytes = Math.max(0, heapTop - ATMEGA328P_RAMSTART);
  const freeMarginBytes = clampedSp - heapTop;

  // Collision detection: Stack Pointer reaches or penetrates Heap
  const isOverflow = clampedSp <= heapTop || clampedSp < ATMEGA328P_RAMSTART;
  const isWarningNearCollision = !isOverflow && freeMarginBytes <= 32;

  let overflowEvent: AvrStackOverflowEvent | null = null;
  if (isOverflow) {
    const corruptedBytes = Math.max(1, heapTop - clampedSp);
    const corruptedVars: string[] = [];

    heapBlocks.forEach((hb) => {
      if (clampedSp <= hb.address + hb.sizeBytes) {
        corruptedVars.push(hb.variableName || hb.label);
      }
    });

    overflowEvent = {
      timestamp: Date.now(),
      cycle,
      sp: clampedSp,
      heapTop,
      sramBoundaryMin: ATMEGA328P_RAMSTART,
      collisionAddress: clampedSp,
      corruptedBytesCount: corruptedBytes,
      corruptedVariables: corruptedVars.length > 0 ? corruptedVars : ['Globális .data változók', 'Dinamikus heap pointerek'],
      callDepth: Math.max(1, Math.floor(stackSizeBytes / 2)),
      reason: clampedSp < ATMEGA328P_RAMSTART ? 'SRAM_UNDERFLOW' : 'HEAP_COLLISION',
    };
  }

  const dummySram = sram || new Uint8Array(ATMEGA328P_SRAM_SIZE);
  const frames = decodeCallStackFrames(dummySram, clampedSp, ATMEGA328P_RAMEND);

  return {
    sp: clampedSp,
    spStart: ATMEGA328P_RAMEND,
    stackSizeBytes,
    stackUsagePercent,
    heapTop,
    heapSizeBytes,
    staticDataEnd,
    freeMarginBytes: Math.max(0, freeMarginBytes),
    isOverflow,
    isWarningNearCollision,
    frames,
    heapBlocks,
    overflowEvent,
  };
}
