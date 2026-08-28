/**
 * (c) 2026 AI Studio - Interactive SVG Wire & Dataflow Layer
 * Renders cubic bezier curves between RTOS nodes with animated particles and interactive deletion
 */

import React from 'react';
import { RtosNode, RtosWire } from '../../types';
import { Trash2 } from 'lucide-react';

interface RtosWireLayerProps {
  nodes: RtosNode[];
  wires: RtosWire[];
  selectedWireId: string | null;
  onSelectWire: (wireId: string) => void;
  onDeleteWire: (wireId: string) => void;
  connectingWire: {
    fromNodeId: string;
    fromX: number;
    fromY: number;
    currentX: number;
    currentY: number;
  } | null;
  isSimulating: boolean;
}

const NODE_WIDTH = 224; // w-56 = 14rem = 224px
const NODE_HEIGHT = 160; // approximate center height

export const RtosWireLayer: React.FC<RtosWireLayerProps> = ({
  nodes,
  wires,
  selectedWireId,
  onSelectWire,
  onDeleteWire,
  connectingWire,
  isSimulating,
}) => {
  // Helper to compute node port coordinates
  const getNodePortPos = (node: RtosNode, isOutput: boolean) => {
    const x = isOutput ? node.x + NODE_WIDTH : node.x;
    const y = node.y + 80; // approximate vertical center
    return { x, y };
  };

  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none z-20 overflow-visible">
      <defs>
        {/* Wire glow filters */}
        <filter id="wire-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>

        {/* Animated particle linear gradients */}
        <linearGradient id="flow-grad-queue" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#4ade80" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#22c55e" stopOpacity="1" />
        </linearGradient>
      </defs>

      {/* Render Established Wires */}
      {wires.map((wire) => {
        const fromNode = nodes.find((n) => n.id === wire.fromNodeId);
        const toNode = nodes.find((n) => n.id === wire.toNodeId);

        if (!fromNode || !toNode) return null;

        const start = getNodePortPos(fromNode, true);
        const end = getNodePortPos(toNode, false);

        // Calculate control points for smooth bezier curve
        const dx = Math.abs(end.x - start.x);
        const curvature = Math.max(dx * 0.5, 60);
        const cp1x = start.x + curvature;
        const cp1y = start.y;
        const cp2x = end.x - curvature;
        const cp2y = end.y;

        const pathData = `M ${start.x} ${start.y} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${end.x} ${end.y}`;
        const midX = (start.x + end.x) / 2;
        const midY = (start.y + end.y) / 2;

        const isSelected = selectedWireId === wire.id;

        return (
          <g key={wire.id} className="cursor-pointer pointer-events-auto group">
            {/* Wider invisible hit area for easy clicking */}
            <path
              d={pathData}
              fill="none"
              stroke="transparent"
              strokeWidth="20"
              onClick={(e) => {
                e.stopPropagation();
                onSelectWire(wire.id);
              }}
            />

            {/* Background shadow stroke */}
            <path
              d={pathData}
              fill="none"
              stroke="#000000"
              strokeWidth={isSelected ? '6' : '4'}
              strokeOpacity="0.8"
            />

            {/* Main Visual Wire Path */}
            <path
              d={pathData}
              fill="none"
              stroke={wire.color || '#38bdf8'}
              strokeWidth={isSelected ? '3.5' : '2.5'}
              strokeDasharray={wire.type === 'mutex_guard' ? '6,4' : undefined}
              filter={isSelected ? 'url(#wire-glow)' : undefined}
              className="transition-all"
              onClick={(e) => {
                e.stopPropagation();
                onSelectWire(wire.id);
              }}
            />

            {/* Animated Dataflow Particles (When simulation is running) */}
            {isSimulating && (
              <circle r="4" fill="#ffffff" filter="url(#wire-glow)">
                <animateMotion
                  path={pathData}
                  dur={wire.type === 'isr_signal' ? '0.6s' : '1.8s'}
                  repeatCount="indefinite"
                />
              </circle>
            )}

            {/* Wire Label Pill */}
            {wire.label && (
              <g
                transform={`translate(${midX}, ${midY})`}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectWire(wire.id);
                }}
              >
                <rect
                  x="-45"
                  y="-11"
                  width="90"
                  height="22"
                  rx="4"
                  fill="#0F1115"
                  stroke={isSelected ? '#38bdf8' : '#2A2D35'}
                  strokeWidth="1.5"
                  className="shadow-md"
                />
                <text
                  x="0"
                  y="3"
                  textAnchor="middle"
                  fill={wire.color || '#E0E0E6'}
                  fontSize="9"
                  fontFamily="monospace"
                  fontWeight="bold"
                >
                  {wire.label}
                </text>
              </g>
            )}

            {/* Delete button shown when wire is selected */}
            {isSelected && (
              <g
                transform={`translate(${midX + 55}, ${midY - 10})`}
                className="cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteWire(wire.id);
                }}
              >
                <circle r="9" fill="#e11d48" />
                <path
                  d="M -4 -4 L 4 4 M 4 -4 L -4 4"
                  stroke="#ffffff"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </g>
            )}
          </g>
        );
      })}

      {/* Dynamic Wire connecting in progress */}
      {connectingWire && (
        <path
          d={`M ${connectingWire.fromX} ${connectingWire.fromY} C ${connectingWire.fromX + 60} ${connectingWire.fromY}, ${connectingWire.currentX - 60} ${connectingWire.currentY}, ${connectingWire.currentX} ${connectingWire.currentY}`}
          fill="none"
          stroke="#38bdf8"
          strokeWidth="3"
          strokeDasharray="4,4"
          className="animate-pulse"
        />
      )}
    </svg>
  );
};
