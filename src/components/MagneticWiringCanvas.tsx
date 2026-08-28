/**
 * (c) 2026 AI Studio AVR Visual Studio
 * Magnetic Wiring Canvas & Interactive Breadboard Prototyper
 * Features:
 *  - Snap-to-pin (magnetic pin snapping zone, not pixel-based)
 *  - Auto-series resistor insertion (dragging resistor to LED connects it in series)
 *  - Ghost preview of pending wires with conflict red pulsing
 *  - Multi-select (marquee drag & Shift+click) + Figma-like Alignment Toolbar (Left, Center, Right, Top, Middle, Bottom, Distribute, Tidy-up)
 *  - Dynamic Align Guidelines
 */

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  Sparkles,
  Layers,
  Cpu,
  Trash2,
  RotateCcw,
  Zap,
  ShieldAlert,
  CheckCircle2,
  Plus,
  Move,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignVerticalJustifyStart,
  AlignVerticalJustifyCenter,
  AlignVerticalJustifyEnd,
  Grid,
  Maximize2,
  ZoomIn,
  ZoomOut,
  Info,
} from 'lucide-react';
import { ArduinoPin } from '../types';

export interface CanvasPin {
  id: string;
  name: string;
  componentId: string;
  x: number; // canvas relative
  y: number;
  type: 'VCC' | 'GND' | 'IO' | 'ANALOG' | 'ANODE' | 'CATHODE' | 'PIN1' | 'PIN2';
  color?: string;
  isArduinoPin?: boolean;
  arduinoPinName?: ArduinoPin;
}

export interface CanvasComponent {
  id: string;
  name: string;
  type: 'arduino_uno' | 'breadboard' | 'led_red' | 'led_green' | 'led_blue' | 'resistor_220' | 'resistor_10k' | 'button' | 'potmeter' | 'buzzer';
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  label: string;
  color?: string;
}

export interface CanvasWire {
  id: string;
  fromPinId: string;
  toPinId: string;
  color: string;
  isConflict?: boolean;
  conflictReason?: string;
}

interface Guideline {
  type: 'vertical' | 'horizontal';
  position: number;
}

const INITIAL_COMPONENTS: CanvasComponent[] = [
  {
    id: 'uno_1',
    name: 'Arduino Uno R3',
    type: 'arduino_uno',
    x: 40,
    y: 60,
    width: 220,
    height: 320,
    label: 'Arduino Uno R3',
  },
  {
    id: 'breadboard_1',
    name: 'Próbapanel (Half Breadboard)',
    type: 'breadboard',
    x: 300,
    y: 60,
    width: 320,
    height: 320,
    label: 'MB-102 Half Breadboard',
  },
  {
    id: 'led_1',
    name: 'Piros LED',
    type: 'led_red',
    x: 360,
    y: 120,
    width: 40,
    height: 48,
    label: 'LED 1 (Piros)',
    color: '#ef4444',
  },
  {
    id: 'led_2',
    name: 'Zöld LED',
    type: 'led_green',
    x: 430,
    y: 120,
    width: 40,
    height: 48,
    label: 'LED 2 (Zöld)',
    color: '#22c55e',
  },
  {
    id: 'led_3',
    name: 'Kék LED',
    type: 'led_blue',
    x: 500,
    y: 120,
    width: 40,
    height: 48,
    label: 'LED 3 (Kék)',
    color: '#3b82f6',
  },
  {
    id: 'res_1',
    name: '220Ω Ellenállás',
    type: 'resistor_220',
    x: 360,
    y: 200,
    width: 50,
    height: 24,
    label: '220Ω Előtét',
    color: '#d97706',
  },
];

const INITIAL_WIRES: CanvasWire[] = [
  {
    id: 'w_gnd_rail',
    fromPinId: 'uno_1_gnd_1',
    toPinId: 'breadboard_1_gnd_rail',
    color: '#0f172a',
  },
];

export const MagneticWiringCanvas: React.FC = () => {
  const [components, setComponents] = useState<CanvasComponent[]>(INITIAL_COMPONENTS);
  const [wires, setWires] = useState<CanvasWire[]>(INITIAL_WIRES);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [notification, setNotification] = useState<string | null>(
    '⚡ Mágneses bekötés aktív: A vezetékek automatikusan a lábakra ugranak!'
  );

  // Dragging state
  const [draggingIds, setDraggingIds] = useState<string[]>([]);
  const [dragStartPos, setDragStartPos] = useState<{ x: number; y: number } | null>(null);
  const [componentStartPositions, setComponentStartPositions] = useState<Record<string, { x: number; y: number }>>({});

  // Wire drawing state
  const [drawingWireFromPinId, setDrawingWireFromPinId] = useState<string | null>(null);
  const [currentMousePos, setCurrentMousePos] = useState<{ x: number; y: number } | null>(null);
  const [hoveredPinId, setHoveredPinId] = useState<string | null>(null);

  // Marquee selection state
  const [marqueeBox, setMarqueeBox] = useState<{ startX: number; startY: number; currentX: number; currentY: number } | null>(null);

  // Alignment guidelines
  const [guidelines, setGuidelines] = useState<Guideline[]>([]);

  // Canvas zoom & pan
  const [zoom, setZoom] = useState<number>(1.0);
  const canvasRef = useRef<HTMLDivElement>(null);

  // Show notification toast
  const showToast = useCallback((msg: string) => {
    setNotification(msg);
    setTimeout(() => {
      setNotification((prev) => (prev === msg ? null : prev));
    }, 3800);
  }, []);

  // Compute all component pins dynamically based on component positions
  const allPins = useMemo<CanvasPin[]>(() => {
    const list: CanvasPin[] = [];

    components.forEach((comp) => {
      if (comp.type === 'arduino_uno') {
        // Digital header pins (D0 - D13, GND, AREF)
        const digPins: { name: string; type: CanvasPin['type']; pinName: ArduinoPin; offset: number }[] = [
          { name: 'AREF', type: 'IO', pinName: '13', offset: 15 },
          { name: 'GND', type: 'GND', pinName: '13', offset: 27 },
          { name: 'D13', type: 'IO', pinName: '13', offset: 39 },
          { name: 'D12', type: 'IO', pinName: '12', offset: 51 },
          { name: 'D11', type: 'IO', pinName: '11', offset: 63 },
          { name: 'D10', type: 'IO', pinName: '10', offset: 75 },
          { name: 'D9', type: 'IO', pinName: '9', offset: 87 },
          { name: 'D8', type: 'IO', pinName: '8', offset: 99 },
          { name: 'D7', type: 'IO', pinName: '7', offset: 115 },
          { name: 'D6', type: 'IO', pinName: '6', offset: 127 },
          { name: 'D5', type: 'IO', pinName: '5', offset: 139 },
          { name: 'D4', type: 'IO', pinName: '4', offset: 151 },
          { name: 'D3', type: 'IO', pinName: '3', offset: 163 },
          { name: 'D2', type: 'IO', pinName: '2', offset: 175 },
          { name: 'D1 (TX)', type: 'IO', pinName: '1', offset: 187 },
          { name: 'D0 (RX)', type: 'IO', pinName: '0', offset: 199 },
        ];

        digPins.forEach((dp, idx) => {
          list.push({
            id: `${comp.id}_dig_${idx}`,
            name: `Arduino ${dp.name}`,
            componentId: comp.id,
            x: comp.x + dp.offset,
            y: comp.y + 12,
            type: dp.type,
            color: dp.type === 'GND' ? '#0f172a' : '#06b6d4',
            isArduinoPin: true,
            arduinoPinName: dp.pinName,
          });
        });

        // Power & Analog Header (RESET, 3.3V, 5V, GND, GND, VIN, A0 - A5)
        const pwrPins: { name: string; type: CanvasPin['type']; pinName?: ArduinoPin; offset: number }[] = [
          { name: 'RESET', type: 'IO', offset: 35 },
          { name: '3.3V', type: 'VCC', offset: 47 },
          { name: '5V', type: 'VCC', offset: 59 },
          { name: 'GND', type: 'GND', offset: 71 },
          { name: 'GND', type: 'GND', offset: 83 },
          { name: 'VIN', type: 'VCC', offset: 95 },
          { name: 'A0', type: 'ANALOG', pinName: 'A0', offset: 115 },
          { name: 'A1', type: 'ANALOG', pinName: 'A1', offset: 127 },
          { name: 'A2', type: 'ANALOG', pinName: 'A2', offset: 139 },
          { name: 'A3', type: 'ANALOG', pinName: 'A3', offset: 151 },
          { name: 'A4 (SDA)', type: 'ANALOG', pinName: 'A4', offset: 163 },
          { name: 'A5 (SCL)', type: 'ANALOG', pinName: 'A5', offset: 175 },
        ];

        pwrPins.forEach((pp, idx) => {
          list.push({
            id: `${comp.id}_pwr_${idx}`,
            name: `Arduino ${pp.name}`,
            componentId: comp.id,
            x: comp.x + pp.offset,
            y: comp.y + comp.height - 12,
            type: pp.type,
            color: pp.type === 'VCC' ? '#ef4444' : pp.type === 'GND' ? '#0f172a' : '#f59e0b',
            isArduinoPin: true,
            arduinoPinName: pp.pinName,
          });
        });
      } else if (comp.type === 'breadboard') {
        // VCC rail
        list.push({
          id: `${comp.id}_vcc_rail`,
          name: 'Próbapanel +5V Tápvonal',
          componentId: comp.id,
          x: comp.x + 20,
          y: comp.y + 16,
          type: 'VCC',
          color: '#ef4444',
        });
        // GND rail
        list.push({
          id: `${comp.id}_gnd_rail`,
          name: 'Próbapanel GND Tápvonal',
          componentId: comp.id,
          x: comp.x + 20,
          y: comp.y + 32,
          type: 'GND',
          color: '#0f172a',
        });
      } else if (comp.type.startsWith('led_')) {
        // LED has Anode (+) and Cathode (-)
        list.push({
          id: `${comp.id}_anode`,
          name: `${comp.name} Anód (+)`,
          componentId: comp.id,
          x: comp.x + 12,
          y: comp.y + comp.height,
          type: 'ANODE',
          color: comp.color || '#ef4444',
        });
        list.push({
          id: `${comp.id}_cathode`,
          name: `${comp.name} Katód (-)`,
          componentId: comp.id,
          x: comp.x + 28,
          y: comp.y + comp.height,
          type: 'CATHODE',
          color: '#0f172a',
        });
      } else if (comp.type.startsWith('resistor_')) {
        // Resistor has Pin1 and Pin2
        list.push({
          id: `${comp.id}_p1`,
          name: `${comp.name} Lábra 1`,
          componentId: comp.id,
          x: comp.x + 6,
          y: comp.y + comp.height / 2,
          type: 'PIN1',
          color: '#d97706',
        });
        list.push({
          id: `${comp.id}_p2`,
          name: `${comp.name} Lábra 2`,
          componentId: comp.id,
          x: comp.x + comp.width - 6,
          y: comp.y + comp.height / 2,
          type: 'PIN2',
          color: '#d97706',
        });
      } else if (comp.type === 'button') {
        list.push({
          id: `${comp.id}_p1`,
          name: `${comp.name} Pin 1`,
          componentId: comp.id,
          x: comp.x + 8,
          y: comp.y + comp.height,
          type: 'PIN1',
          color: '#10b981',
        });
        list.push({
          id: `${comp.id}_p2`,
          name: `${comp.name} Pin 2`,
          componentId: comp.id,
          x: comp.x + comp.width - 8,
          y: comp.y + comp.height,
          type: 'PIN2',
          color: '#10b981',
        });
      }
    });

    return list;
  }, [components]);

  // Find pin by ID
  const findPin = useCallback(
    (pinId: string): CanvasPin | undefined => {
      return allPins.find((p) => p.id === pinId);
    },
    [allPins]
  );

  // Magnetic snap-to-pin calculation: returns snapped coordinates and pin if within magnetic threshold (20px)
  const getMagneticSnap = useCallback(
    (canvasX: number, canvasY: number, excludePinId?: string | null): { x: number; y: number; pin: CanvasPin | null } => {
      const SNAP_RADIUS = 20; // 20px magnetic zone
      let closestPin: CanvasPin | null = null;
      let minDistance = Infinity;

      for (const pin of allPins) {
        if (excludePinId && pin.id === excludePinId) continue;
        const dx = canvasX - pin.x;
        const dy = canvasY - pin.y;
        const dist = Math.hypot(dx, dy);
        if (dist <= SNAP_RADIUS && dist < minDistance) {
          minDistance = dist;
          closestPin = pin;
        }
      }

      if (closestPin) {
        return { x: closestPin.x, y: closestPin.y, pin: closestPin };
      }
      return { x: canvasX, y: canvasY, pin: null };
    },
    [allPins]
  );

  // Check for electrical conflict (e.g. 5V direct to GND, or 5V direct to LED without resistor)
  const checkWireConflict = useCallback(
    (pinA: CanvasPin, pinB: CanvasPin): { isConflict: boolean; reason?: string } => {
      // 1. Direct 5V to GND short circuit
      if ((pinA.type === 'VCC' && pinB.type === 'GND') || (pinA.type === 'GND' && pinB.type === 'VCC')) {
        return {
          isConflict: true,
          reason: '⚠️ KRITIKUS ZÁRLAT: +5V tápfeszültség közvetlenül GND-re kötve! Tápkiesést és resetet okoz.',
        };
      }

      // 2. Direct 5V to LED Anode without series resistor
      if (
        (pinA.type === 'VCC' && pinB.type === 'ANODE') ||
        (pinA.type === 'ANODE' && pinB.type === 'VCC')
      ) {
        return {
          isConflict: true,
          reason: '⚠️ TÚLÁRAM VESZÉLY: A LED közvetlenül 5V-ra kötve előtét-ellenállás nélkül tönkremegy!',
        };
      }

      // 3. Same pin connection
      if (pinA.id === pinB.id) {
        return { isConflict: true, reason: 'Önmagához nem köthető.' };
      }

      return { isConflict: false };
    },
    []
  );

  // Auto-series resistor detection: if a resistor is dropped directly over/near a LED
  const handleAutoSeriesResistor = useCallback(
    (resistorComp: CanvasComponent, targetLedComp: CanvasComponent) => {
      // Find LED Anode and Arduino D13 pin (or another open digital pin)
      const ledAnode = allPins.find((p) => p.componentId === targetLedComp.id && p.type === 'ANODE');
      const ledCathode = allPins.find((p) => p.componentId === targetLedComp.id && p.type === 'CATHODE');
      const resP1 = allPins.find((p) => p.componentId === resistorComp.id && p.type === 'PIN1');
      const resP2 = allPins.find((p) => p.componentId === resistorComp.id && p.type === 'PIN2');
      const d13Pin = allPins.find((p) => p.isArduinoPin && p.arduinoPinName === '13');
      const gndPin = allPins.find((p) => p.type === 'GND');

      if (ledAnode && ledCathode && resP1 && resP2 && d13Pin && gndPin) {
        // Create the 3 series wires: Arduino D13 -> Resistor P1; Resistor P2 -> LED Anode; LED Cathode -> GND
        const newWires: CanvasWire[] = [
          {
            id: `w_auto_${Date.now()}_1`,
            fromPinId: d13Pin.id,
            toPinId: resP1.id,
            color: '#06b6d4',
          },
          {
            id: `w_auto_${Date.now()}_2`,
            fromPinId: resP2.id,
            toPinId: ledAnode.id,
            color: '#d97706',
          },
          {
            id: `w_auto_${Date.now()}_3`,
            fromPinId: ledCathode.id,
            toPinId: gndPin.id,
            color: '#0f172a',
          },
        ];

        setWires((prev) => [...prev.filter((w) => w.toPinId !== ledAnode.id), ...newWires]);
        showToast(`⚡ Intelligens Soros Kapcsolás: ${resistorComp.name} automatikusan bekötve a ${targetLedComp.name} elé! (D13 ➔ Ellenállás ➔ LED Anód ➔ GND)`);
      }
    },
    [allPins, showToast]
  );

  // Helper: get canvas coordinate from mouse event
  const getCanvasCoords = useCallback(
    (e: React.MouseEvent): { x: number; y: number } => {
      if (!canvasRef.current) return { x: 0, y: 0 };
      const rect = canvasRef.current.getBoundingClientRect();
      return {
        x: (e.clientX - rect.left) / zoom,
        y: (e.clientY - rect.top) / zoom,
      };
    },
    [zoom]
  );

  // Figma-like alignment calculations
  const alignComponents = useCallback(
    (type: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom' | 'distributeH' | 'distributeV' | 'tidy') => {
      if (selectedIds.length < 2) return;

      setComponents((prev) => {
        const selected = prev.filter((c) => selectedIds.includes(c.id));
        if (selected.length < 2) return prev;

        const updated = [...prev];

        if (type === 'left') {
          const minX = Math.min(...selected.map((c) => c.x));
          return updated.map((c) => (selectedIds.includes(c.id) ? { ...c, x: minX } : c));
        } else if (type === 'right') {
          const maxX = Math.max(...selected.map((c) => c.x + c.width));
          return updated.map((c) => (selectedIds.includes(c.id) ? { ...c, x: maxX - c.width } : c));
        } else if (type === 'center') {
          const avgCenterX = selected.reduce((sum, c) => sum + (c.x + c.width / 2), 0) / selected.length;
          return updated.map((c) => (selectedIds.includes(c.id) ? { ...c, x: Math.round(avgCenterX - c.width / 2) } : c));
        } else if (type === 'top') {
          const minY = Math.min(...selected.map((c) => c.y));
          return updated.map((c) => (selectedIds.includes(c.id) ? { ...c, y: minY } : c));
        } else if (type === 'bottom') {
          const maxY = Math.max(...selected.map((c) => c.y + c.height));
          return updated.map((c) => (selectedIds.includes(c.id) ? { ...c, y: maxY - c.height } : c));
        } else if (type === 'middle') {
          const avgCenterY = selected.reduce((sum, c) => sum + (c.y + c.height / 2), 0) / selected.length;
          return updated.map((c) => (selectedIds.includes(c.id) ? { ...c, y: Math.round(avgCenterY - c.height / 2) } : c));
        } else if (type === 'distributeH') {
          const sorted = [...selected].sort((a, b) => a.x - b.x);
          const first = sorted[0];
          const last = sorted[sorted.length - 1];
          const totalDistance = last.x - first.x;
          const step = totalDistance / (sorted.length - 1);
          return updated.map((c) => {
            const idx = sorted.findIndex((s) => s.id === c.id);
            if (idx !== -1) {
              return { ...c, x: Math.round(first.x + idx * step) };
            }
            return c;
          });
        } else if (type === 'distributeV') {
          const sorted = [...selected].sort((a, b) => a.y - b.y);
          const first = sorted[0];
          const last = sorted[sorted.length - 1];
          const totalDistance = last.y - first.y;
          const step = totalDistance / (sorted.length - 1);
          return updated.map((c) => {
            const idx = sorted.findIndex((s) => s.id === c.id);
            if (idx !== -1) {
              return { ...c, y: Math.round(first.y + idx * step) };
            }
            return c;
          });
        } else if (type === 'tidy') {
          // Tidy up into an even row/grid
          const sorted = [...selected].sort((a, b) => a.x - b.x);
          let currentX = Math.min(...selected.map((c) => c.x));
          const commonY = Math.min(...selected.map((c) => c.y));
          const GAP = 24;
          return updated.map((c) => {
            const idx = sorted.findIndex((s) => s.id === c.id);
            if (idx !== -1) {
              const comp = sorted[idx];
              const newX = currentX;
              currentX += comp.width + GAP;
              return { ...comp, x: newX, y: commonY };
            }
            return c;
          });
        }

        return updated;
      });

      showToast(`🎯 Igazítás végrehajtva (${type.toUpperCase()}) ${selectedIds.length} komponensre.`);
    },
    [selectedIds, showToast]
  );

  // Mouse Down handler for canvas (selection, drag start)
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (e.target !== e.currentTarget && !(e.target as HTMLElement).classList.contains('canvas-background')) {
      return;
    }

    const coords = getCanvasCoords(e);

    if (!e.shiftKey) {
      setSelectedIds([]);
    }

    setMarqueeBox({
      startX: coords.x,
      startY: coords.y,
      currentX: coords.x,
      currentY: coords.y,
    });
  };

  // Mouse Move handler for canvas (dragging components, drawing wire, marquee)
  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    const coords = getCanvasCoords(e);
    setCurrentMousePos(coords);

    // 1. If dragging components
    if (draggingIds.length > 0 && dragStartPos) {
      const dx = coords.x - dragStartPos.x;
      const dy = coords.y - dragStartPos.y;

      // Smart alignment guidelines calculation
      const activeComp = components.find((c) => c.id === draggingIds[0]);
      const newGuidelines: Guideline[] = [];

      if (activeComp) {
        const potentialX = (componentStartPositions[activeComp.id]?.x || activeComp.x) + dx;
        const potentialY = (componentStartPositions[activeComp.id]?.y || activeComp.y) + dy;
        const SNAP_THRESH = 4;

        components.forEach((other) => {
          if (draggingIds.includes(other.id)) return;
          // Check left, center, right vertical guidelines
          if (Math.abs(potentialX - other.x) <= SNAP_THRESH) {
            newGuidelines.push({ type: 'vertical', position: other.x });
          }
          if (Math.abs(potentialX + activeComp.width / 2 - (other.x + other.width / 2)) <= SNAP_THRESH) {
            newGuidelines.push({ type: 'vertical', position: other.x + other.width / 2 });
          }
          // Check top, middle, bottom horizontal guidelines
          if (Math.abs(potentialY - other.y) <= SNAP_THRESH) {
            newGuidelines.push({ type: 'horizontal', position: other.y });
          }
          if (Math.abs(potentialY + activeComp.height / 2 - (other.y + other.height / 2)) <= SNAP_THRESH) {
            newGuidelines.push({ type: 'horizontal', position: other.y + other.height / 2 });
          }
        });
      }

      setGuidelines(newGuidelines);

      setComponents((prev) =>
        prev.map((comp) => {
          if (draggingIds.includes(comp.id)) {
            const start = componentStartPositions[comp.id];
            if (start) {
              return {
                ...comp,
                x: Math.max(10, Math.round(start.x + dx)),
                y: Math.max(10, Math.round(start.y + dy)),
              };
            }
          }
          return comp;
        })
      );
    }

    // 2. If marquee selecting
    if (marqueeBox) {
      setMarqueeBox((prev) => (prev ? { ...prev, currentX: coords.x, currentY: coords.y } : null));

      const minX = Math.min(marqueeBox.startX, coords.x);
      const maxX = Math.max(marqueeBox.startX, coords.x);
      const minY = Math.min(marqueeBox.startY, coords.y);
      const maxY = Math.max(marqueeBox.startY, coords.y);

      const inside = components
        .filter((c) => {
          const compRight = c.x + c.width;
          const compBottom = c.y + c.height;
          return c.x < maxX && compRight > minX && c.y < maxY && compBottom > minY;
        })
        .map((c) => c.id);

      setSelectedIds(inside);
    }

    // 3. If drawing wire, check magnetic pin hover
    if (drawingWireFromPinId) {
      const snap = getMagneticSnap(coords.x, coords.y, drawingWireFromPinId);
      setHoveredPinId(snap.pin?.id || null);
    }
  };

  // Mouse Up handler
  const handleCanvasMouseUp = () => {
    // Check if a resistor was dragged near an LED
    if (draggingIds.length === 1) {
      const draggedComp = components.find((c) => c.id === draggingIds[0]);
      if (draggedComp && draggedComp.type.startsWith('resistor_')) {
        // Find nearest LED
        const leds = components.filter((c) => c.type.startsWith('led_'));
        for (const led of leds) {
          const dist = Math.hypot(draggedComp.x - led.x, draggedComp.y - led.y);
          if (dist < 75) {
            handleAutoSeriesResistor(draggedComp, led);
            break;
          }
        }
      }
    }

    setDraggingIds([]);
    setDragStartPos(null);
    setComponentStartPositions({});
    setMarqueeBox(null);
    setGuidelines([]);

    // If drawing wire and hovered over a pin, connect!
    if (drawingWireFromPinId && hoveredPinId && drawingWireFromPinId !== hoveredPinId) {
      const pinA = findPin(drawingWireFromPinId);
      const pinB = findPin(hoveredPinId);

      if (pinA && pinB) {
        const conflict = checkWireConflict(pinA, pinB);

        const newWire: CanvasWire = {
          id: `wire_${Date.now()}`,
          fromPinId: pinA.id,
          toPinId: pinB.id,
          color: pinA.color || '#06b6d4',
          isConflict: conflict.isConflict,
          conflictReason: conflict.reason,
        };

        setWires((prev) => [...prev, newWire]);

        if (conflict.isConflict) {
          showToast(conflict.reason || '⚠️ Konfliktus észlelve!');
        } else {
          showToast(`✓ Vezeték sikeresen bekötve: ${pinA.name} ➔ ${pinB.name}`);
        }
      }
    }

    setDrawingWireFromPinId(null);
    setHoveredPinId(null);
  };

  // Start dragging a component
  const handleComponentMouseDown = (comp: CanvasComponent, e: React.MouseEvent) => {
    e.stopPropagation();
    const coords = getCanvasCoords(e);

    let newSelected = [...selectedIds];
    if (e.shiftKey) {
      if (newSelected.includes(comp.id)) {
        newSelected = newSelected.filter((id) => id !== comp.id);
      } else {
        newSelected.push(comp.id);
      }
    } else {
      if (!newSelected.includes(comp.id)) {
        newSelected = [comp.id];
      }
    }

    setSelectedIds(newSelected);
    setDraggingIds(newSelected);
    setDragStartPos(coords);

    const startPosMap: Record<string, { x: number; y: number }> = {};
    components.forEach((c) => {
      if (newSelected.includes(c.id)) {
        startPosMap[c.id] = { x: c.x, y: c.y };
      }
    });
    setComponentStartPositions(startPosMap);
  };

  // Start wire from pin
  const handlePinMouseDown = (pin: CanvasPin, e: React.MouseEvent) => {
    e.stopPropagation();
    setDrawingWireFromPinId(pin.id);
  };

  // Add a new component to canvas
  const handleAddComponent = (type: CanvasComponent['type']) => {
    const id = `comp_${Date.now()}`;
    let label = 'Új Komponens';
    let width = 40;
    let height = 48;
    let color = '#ef4444';

    if (type === 'led_red') {
      label = 'Piros LED';
      color = '#ef4444';
    } else if (type === 'led_green') {
      label = 'Zöld LED';
      color = '#22c55e';
    } else if (type === 'led_blue') {
      label = 'Kék LED';
      color = '#3b82f6';
    } else if (type === 'resistor_220') {
      label = '220Ω Ellenállás';
      width = 50;
      height = 24;
      color = '#d97706';
    } else if (type === 'resistor_10k') {
      label = '10kΩ Ellenállás';
      width = 50;
      height = 24;
      color = '#d97706';
    } else if (type === 'button') {
      label = 'Nyomógomb';
      width = 36;
      height = 36;
      color = '#10b981';
    }

    const newComp: CanvasComponent = {
      id,
      name: label,
      type,
      x: 350 + Math.random() * 80,
      y: 100 + Math.random() * 80,
      width,
      height,
      label,
      color,
    };

    setComponents((prev) => [...prev, newComp]);
    setSelectedIds([id]);
    showToast(`✓ ${label} hozzáadva a próbatérhez.`);
  };

  // Delete selected components or wires
  const handleDeleteSelected = () => {
    if (selectedIds.length === 0) return;
    setComponents((prev) => prev.filter((c) => !selectedIds.includes(c.id) || c.type === 'arduino_uno'));
    setWires((prev) =>
      prev.filter((w) => {
        const p1 = findPin(w.fromPinId);
        const p2 = findPin(w.toPinId);
        return p1 && p2 && !selectedIds.includes(p1.componentId) && !selectedIds.includes(p2.componentId);
      })
    );
    setSelectedIds([]);
    showToast('Kijelölt elemek törölve.');
  };

  // Reset circuit to clean defaults
  const handleResetCircuit = () => {
    setComponents(INITIAL_COMPONENTS);
    setWires(INITIAL_WIRES);
    setSelectedIds([]);
    showToast('Áramkör alaphelyzetbe állítva.');
  };

  // Render Bezier curved wire path
  const renderWirePath = (pinA: CanvasPin, pinB: CanvasPin, color: string, isConflict?: boolean) => {
    const dx = pinB.x - pinA.x;
    const dy = pinB.y - pinA.y;
    const cx1 = pinA.x + dx * 0.25;
    const cy1 = pinA.y + Math.max(30, Math.abs(dy) * 0.4);
    const cx2 = pinB.x - dx * 0.25;
    const cy2 = pinB.y - Math.max(30, Math.abs(dy) * 0.4);

    return (
      <path
        d={`M ${pinA.x} ${pinA.y} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${pinB.x} ${pinB.y}`}
        fill="none"
        stroke={isConflict ? '#f43f5e' : color}
        strokeWidth={isConflict ? 3.5 : 2.5}
        strokeLinecap="round"
        className={isConflict ? 'animate-pulse' : 'transition-all'}
        style={{
          filter: isConflict ? 'drop-shadow(0 0 6px rgba(244, 63, 94, 0.9))' : 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))',
        }}
      />
    );
  };

  // Active ghost wire calculation
  const ghostWireInfo = useMemo(() => {
    if (!drawingWireFromPinId || !currentMousePos) return null;
    const pinA = findPin(drawingWireFromPinId);
    if (!pinA) return null;

    const snap = getMagneticSnap(currentMousePos.x, currentMousePos.y, drawingWireFromPinId);
    const targetPos = { x: snap.x, y: snap.y };
    const hoveredPin = snap.pin;

    let isConflict = false;
    let conflictReason = '';

    if (hoveredPin) {
      const check = checkWireConflict(pinA, hoveredPin);
      isConflict = check.isConflict;
      conflictReason = check.reason || '';
    }

    return {
      pinA,
      targetPos,
      hoveredPin,
      isConflict,
      conflictReason,
    };
  }, [drawingWireFromPinId, currentMousePos, findPin, getMagneticSnap, checkWireConflict]);

  return (
    <div className="flex flex-col h-full bg-[#0B0D12] text-[#E0E0E6] select-none rounded-xs overflow-hidden border border-[#2A2D35]">
      {/* TOP TOOLBAR: Components Palette & Figma Alignment Controls */}
      <div className="bg-[#141720] border-b border-[#2A2D35] px-3 py-2 flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
        {/* Left: Component Add Buttons */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[#8A8D98] text-[11px] font-bold uppercase mr-1">Alkatrészek:</span>
          <button
            onClick={() => handleAddComponent('led_red')}
            className="px-2 py-1 bg-[#1A1D24] hover:bg-rose-950 hover:border-rose-500 text-rose-300 border border-[#3A3F4B] rounded-xs flex items-center gap-1 transition-colors cursor-pointer"
          >
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            <span>Piros LED</span>
          </button>

          <button
            onClick={() => handleAddComponent('led_green')}
            className="px-2 py-1 bg-[#1A1D24] hover:bg-emerald-950 hover:border-emerald-500 text-emerald-300 border border-[#3A3F4B] rounded-xs flex items-center gap-1 transition-colors cursor-pointer"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Zöld LED</span>
          </button>

          <button
            onClick={() => handleAddComponent('led_blue')}
            className="px-2 py-1 bg-[#1A1D24] hover:bg-blue-950 hover:border-blue-500 text-blue-300 border border-[#3A3F4B] rounded-xs flex items-center gap-1 transition-colors cursor-pointer"
          >
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            <span>Kék LED</span>
          </button>

          <button
            onClick={() => handleAddComponent('resistor_220')}
            className="px-2 py-1 bg-[#1A1D24] hover:bg-amber-950 hover:border-amber-500 text-amber-300 border border-[#3A3F4B] rounded-xs flex items-center gap-1 transition-colors cursor-pointer"
          >
            <span className="w-2 h-1 bg-amber-500" />
            <span>220Ω Ellenállás</span>
          </button>

          <button
            onClick={() => handleAddComponent('button')}
            className="px-2 py-1 bg-[#1A1D24] hover:bg-cyan-950 hover:border-cyan-500 text-cyan-300 border border-[#3A3F4B] rounded-xs flex items-center gap-1 transition-colors cursor-pointer"
          >
            <span className="w-2 h-2 bg-cyan-400 rounded-xs" />
            <span>Nyomógomb</span>
          </button>
        </div>

        {/* Center/Right: Figma-style Alignment Toolbar */}
        <div className="flex items-center gap-1 bg-[#0F1116] p-1 rounded-xs border border-[#2A2D35]">
          <span className="text-[10px] text-[#8A8D98] px-1 font-bold">
            {selectedIds.length > 0 ? `${selectedIds.length} Kijelölve` : 'Igazítás:'}
          </span>

          <button
            onClick={() => alignComponents('left')}
            disabled={selectedIds.length < 2}
            className="p-1 rounded-xs hover:bg-[#252932] disabled:opacity-30 disabled:hover:bg-transparent text-white"
            title="Balra igazítás (Align Left)"
          >
            <AlignLeft className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => alignComponents('center')}
            disabled={selectedIds.length < 2}
            className="p-1 rounded-xs hover:bg-[#252932] disabled:opacity-30 disabled:hover:bg-transparent text-white"
            title="Vízszintes középre igazítás (Align Center)"
          >
            <AlignCenter className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => alignComponents('right')}
            disabled={selectedIds.length < 2}
            className="p-1 rounded-xs hover:bg-[#252932] disabled:opacity-30 disabled:hover:bg-transparent text-white"
            title="Jobbra igazítás (Align Right)"
          >
            <AlignRight className="w-3.5 h-3.5" />
          </button>

          <div className="w-[1px] h-3.5 bg-[#3A3F4B] mx-0.5" />

          <button
            onClick={() => alignComponents('top')}
            disabled={selectedIds.length < 2}
            className="p-1 rounded-xs hover:bg-[#252932] disabled:opacity-30 disabled:hover:bg-transparent text-white"
            title="Felső élhez igazítás (Align Top)"
          >
            <AlignVerticalJustifyStart className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => alignComponents('middle')}
            disabled={selectedIds.length < 2}
            className="p-1 rounded-xs hover:bg-[#252932] disabled:opacity-30 disabled:hover:bg-transparent text-white"
            title="Függőleges középre igazítás (Align Middle)"
          >
            <AlignVerticalJustifyCenter className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => alignComponents('bottom')}
            disabled={selectedIds.length < 2}
            className="p-1 rounded-xs hover:bg-[#252932] disabled:opacity-30 disabled:hover:bg-transparent text-white"
            title="Alsó élhez igazítás (Align Bottom)"
          >
            <AlignVerticalJustifyEnd className="w-3.5 h-3.5" />
          </button>

          <div className="w-[1px] h-3.5 bg-[#3A3F4B] mx-0.5" />

          <button
            onClick={() => alignComponents('distributeH')}
            disabled={selectedIds.length < 3}
            className="p-1 rounded-xs hover:bg-[#252932] disabled:opacity-30 disabled:hover:bg-transparent text-cyan-300"
            title="Vízszintes egyenletes elosztás (Distribute Horizontally)"
          >
            <Move className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => alignComponents('tidy')}
            disabled={selectedIds.length < 2}
            className="p-1 px-1.5 rounded-xs bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-500/50 disabled:opacity-30 disabled:hover:bg-transparent flex items-center gap-1 font-bold text-[10px]"
            title="Tidy Up: Tiszta rácsba rendezés mint Figmában"
          >
            <Grid className="w-3 h-3" />
            <span>Tidy Up</span>
          </button>

          {selectedIds.length > 0 && (
            <button
              onClick={handleDeleteSelected}
              className="p-1 text-rose-400 hover:bg-rose-950 rounded-xs transition-colors ml-1"
              title="Kijelölt elemek törlése"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Right: Zoom & Reset */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleResetCircuit}
            className="px-2 py-1 bg-[#1A1D24] hover:bg-[#252932] text-[11px] font-mono text-[#E0E0E6] border border-[#3A3F4B] rounded-xs flex items-center gap-1"
            title="Alaphelyzet"
          >
            <RotateCcw className="w-3 h-3 text-amber-400" />
            <span>Visszaállítás</span>
          </button>
        </div>
      </div>

      {/* NOTIFICATION & INSTRUCTION BANNER */}
      {notification && (
        <div className="bg-[#121620] border-b border-cyan-500/30 px-3 py-1.5 flex items-center justify-between text-xs text-cyan-300 font-mono animate-in fade-in">
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span>{notification}</span>
          </div>
          <span className="text-[10px] text-[#8A8D98] hidden sm:inline">Húzz vezetéket lábról lábra vagy ellenállást LED-re!</span>
        </div>
      )}

      {/* INTERACTIVE WORKSPACE CANVAS */}
      <div
        ref={canvasRef}
        onMouseDown={handleCanvasMouseDown}
        onMouseMove={handleCanvasMouseMove}
        onMouseUp={handleCanvasMouseUp}
        className="flex-1 relative overflow-hidden bg-[#0A0C10] cursor-crosshair canvas-background min-h-[420px]"
        style={{
          backgroundImage:
            'radial-gradient(circle, #1F2430 1px, transparent 1px), radial-gradient(circle, #171A24 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      >
        {/* SVG Wires Layer */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
          {/* Render Existing Wires */}
          {wires.map((wire) => {
            const pinA = findPin(wire.fromPinId);
            const pinB = findPin(wire.toPinId);
            if (!pinA || !pinB) return null;
            return <g key={wire.id}>{renderWirePath(pinA, pinB, wire.color, wire.isConflict)}</g>;
          })}

          {/* Render Active Ghost Preview Wire */}
          {ghostWireInfo && (
            <g>
              <path
                d={`M ${ghostWireInfo.pinA.x} ${ghostWireInfo.pinA.y} L ${ghostWireInfo.targetPos.x} ${ghostWireInfo.targetPos.y}`}
                fill="none"
                stroke={ghostWireInfo.isConflict ? '#f43f5e' : '#38bdf8'}
                strokeWidth={ghostWireInfo.isConflict ? 3 : 2}
                strokeDasharray="6,4"
                className="animate-pulse"
              />
              {/* Target snap ring */}
              <circle
                cx={ghostWireInfo.targetPos.x}
                cy={ghostWireInfo.targetPos.y}
                r={10}
                fill="none"
                stroke={ghostWireInfo.isConflict ? '#f43f5e' : '#38bdf8'}
                strokeWidth={2}
                className="animate-ping"
              />
            </g>
          )}

          {/* Dynamic Figma-like Alignment Guidelines */}
          {guidelines.map((g, idx) => (
            <line
              key={`guide_${idx}`}
              x1={g.type === 'vertical' ? g.position : 0}
              y1={g.type === 'horizontal' ? g.position : 0}
              x2={g.type === 'vertical' ? g.position : 2000}
              y2={g.type === 'horizontal' ? g.position : 2000}
              stroke="#ec4899"
              strokeWidth={1}
              strokeDasharray="4,4"
            />
          ))}

          {/* Marquee Selection Box */}
          {marqueeBox && (
            <rect
              x={Math.min(marqueeBox.startX, marqueeBox.currentX)}
              y={Math.min(marqueeBox.startY, marqueeBox.currentY)}
              width={Math.abs(marqueeBox.currentX - marqueeBox.startX)}
              height={Math.abs(marqueeBox.currentY - marqueeBox.startY)}
              fill="rgba(56, 189, 248, 0.12)"
              stroke="#38bdf8"
              strokeWidth={1}
              strokeDasharray="4,2"
            />
          )}
        </svg>

        {/* Render Components */}
        {components.map((comp) => {
          const isSelected = selectedIds.includes(comp.id);

          if (comp.type === 'arduino_uno') {
            return (
              <div
                key={comp.id}
                onMouseDown={(e) => handleComponentMouseDown(comp, e)}
                style={{
                  left: `${comp.x}px`,
                  top: `${comp.y}px`,
                  width: `${comp.width}px`,
                  height: `${comp.height}px`,
                }}
                className={`absolute rounded-xs bg-[#0b334a] border-2 shadow-[4px_4px_0px_#000] p-2 flex flex-col justify-between font-mono select-none cursor-move transition-shadow z-0 ${
                  isSelected ? 'border-cyan-400 ring-2 ring-cyan-400/50' : 'border-[#1b557a]'
                }`}
              >
                {/* Header info */}
                <div className="flex items-center justify-between text-[10px] text-cyan-200">
                  <span className="font-bold">ARDUINO UNO R3</span>
                  <span className="text-[8px] bg-[#072435] px-1 py-0.5 rounded-xs border border-cyan-800">ATmega328P</span>
                </div>

                {/* MCU Center Chip visual */}
                <div className="my-auto mx-auto w-36 h-12 bg-[#161920] border border-cyan-500/40 rounded-xs flex items-center justify-center text-[10px] text-cyan-300 font-bold shadow-inner">
                  ATMEGA328P-PU
                </div>

                {/* Bottom info */}
                <div className="flex items-center justify-between text-[9px] text-cyan-400 opacity-80">
                  <span>16.0 MHz Crystal</span>
                  <span>5V Power</span>
                </div>
              </div>
            );
          }

          if (comp.type === 'breadboard') {
            return (
              <div
                key={comp.id}
                onMouseDown={(e) => handleComponentMouseDown(comp, e)}
                style={{
                  left: `${comp.x}px`,
                  top: `${comp.y}px`,
                  width: `${comp.width}px`,
                  height: `${comp.height}px`,
                }}
                className={`absolute rounded-xs bg-[#e2e8f0] text-slate-800 border-2 shadow-[4px_4px_0px_#000] p-2 flex flex-col justify-between font-mono select-none cursor-move transition-shadow z-0 ${
                  isSelected ? 'border-cyan-500 ring-2 ring-cyan-400/50' : 'border-slate-400'
                }`}
              >
                <div className="text-[10px] font-bold text-slate-700 flex items-center justify-between">
                  <span>PRÓBAPANEL (MB-102)</span>
                  <span className="text-[9px] text-red-600 font-bold">+ 5V / - GND</span>
                </div>

                {/* Visual Tie-point grid simulation */}
                <div className="flex-1 my-1 border border-slate-300 rounded-xs bg-[#f1f5f9] p-1 flex flex-col justify-between opacity-80">
                  <div className="flex justify-between text-[7px] text-slate-400">
                    <span>A B C D E</span>
                    <span>F G H I J</span>
                  </div>
                  <div className="h-0.5 bg-slate-300 my-1" />
                  <div className="flex justify-between text-[7px] text-slate-400">
                    <span>1 5 10 15 20 25 30</span>
                  </div>
                </div>

                <div className="text-[8px] text-slate-500 text-center">Forrasztásmentes Tesztmező</div>
              </div>
            );
          }

          if (comp.type.startsWith('led_')) {
            return (
              <div
                key={comp.id}
                onMouseDown={(e) => handleComponentMouseDown(comp, e)}
                style={{
                  left: `${comp.x}px`,
                  top: `${comp.y}px`,
                  width: `${comp.width}px`,
                  height: `${comp.height}px`,
                }}
                className={`absolute rounded-xs flex flex-col items-center justify-center cursor-move p-1 z-20 ${
                  isSelected ? 'ring-2 ring-cyan-400 bg-cyan-950/30' : ''
                }`}
              >
                {/* LED Bulb */}
                <div
                  className="w-6 h-6 rounded-full border border-black shadow-[0_0_12px] flex items-center justify-center font-bold text-[9px] text-white"
                  style={{
                    backgroundColor: comp.color,
                    boxShadow: `0 0 10px ${comp.color}`,
                  }}
                >
                  LED
                </div>
                {/* LED Legs */}
                <div className="flex justify-between w-5 mt-1">
                  <div className="w-0.5 h-3 bg-slate-400" />
                  <div className="w-0.5 h-4 bg-slate-300" />
                </div>
              </div>
            );
          }

          if (comp.type.startsWith('resistor_')) {
            return (
              <div
                key={comp.id}
                onMouseDown={(e) => handleComponentMouseDown(comp, e)}
                style={{
                  left: `${comp.x}px`,
                  top: `${comp.y}px`,
                  width: `${comp.width}px`,
                  height: `${comp.height}px`,
                }}
                className={`absolute rounded-xs flex items-center justify-between cursor-move px-1 z-20 ${
                  isSelected ? 'ring-2 ring-cyan-400 bg-cyan-950/30' : ''
                }`}
              >
                {/* Resistor Lead Left */}
                <div className="w-2 h-0.5 bg-slate-300" />
                {/* Resistor Body with Color Bands */}
                <div className="w-8 h-4 bg-[#eab308] border border-amber-900 rounded-xs flex items-center justify-around shadow-sm">
                  <span className="w-1 h-3 bg-red-600 rounded-2xs" />
                  <span className="w-1 h-3 bg-red-600 rounded-2xs" />
                  <span className="w-1 h-3 bg-amber-800 rounded-2xs" />
                  <span className="w-1 h-3 bg-yellow-300 rounded-2xs" />
                </div>
                {/* Resistor Lead Right */}
                <div className="w-2 h-0.5 bg-slate-300" />
              </div>
            );
          }

          if (comp.type === 'button') {
            return (
              <div
                key={comp.id}
                onMouseDown={(e) => handleComponentMouseDown(comp, e)}
                style={{
                  left: `${comp.x}px`,
                  top: `${comp.y}px`,
                  width: `${comp.width}px`,
                  height: `${comp.height}px`,
                }}
                className={`absolute rounded-xs bg-[#1e293b] border border-slate-600 flex items-center justify-center cursor-move z-20 ${
                  isSelected ? 'ring-2 ring-cyan-400' : ''
                }`}
              >
                <div className="w-4 h-4 rounded-full bg-cyan-500 shadow-inner flex items-center justify-center text-[8px] text-black font-bold">
                  ●
                </div>
              </div>
            );
          }

          return null;
        })}

        {/* Render Interactive Magnetic Snap Pin Target Dots */}
        {allPins.map((pin) => {
          const isHovered = hoveredPinId === pin.id;
          const isFrom = drawingWireFromPinId === pin.id;

          return (
            <div
              key={pin.id}
              onMouseDown={(e) => handlePinMouseDown(pin, e)}
              style={{
                left: `${pin.x - 7}px`,
                top: `${pin.y - 7}px`,
              }}
              className={`absolute w-3.5 h-3.5 rounded-full border flex items-center justify-center cursor-pointer z-30 transition-transform ${
                isHovered || isFrom
                  ? 'scale-150 bg-cyan-400 border-white shadow-[0_0_8px_#38bdf8]'
                  : 'bg-[#161920] border-slate-400 hover:scale-125 hover:border-cyan-400'
              }`}
              title={`${pin.name} (Kattints és húzz vezetéket)`}
            >
              <div
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: pin.color || '#38bdf8' }}
              />
            </div>
          );
        })}
      </div>

      {/* FOOTER STATS BAR */}
      <div className="bg-[#141720] border-t border-[#2A2D35] px-3 py-2 flex items-center justify-between text-xs font-mono text-[#8A8D98]">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <Cpu className="w-3.5 h-3.5 text-cyan-400" />
            <strong className="text-white">{components.length}</strong> Komponens
          </span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <strong className="text-white">{wires.length}</strong> Vezeték
          </span>
        </div>

        <div className="flex items-center gap-2 text-[11px]">
          <span className="text-emerald-400">● Mágneses Snap Aktív</span>
          <span>|</span>
          <span className="text-cyan-400">Shift + Drag: Multi-Select</span>
        </div>
      </div>
    </div>
  );
};
