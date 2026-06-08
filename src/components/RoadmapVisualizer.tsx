"use client";

import { useState, useRef, useMemo } from "react";
import { BookOpen, Check, LockKey } from "@phosphor-icons/react";
import { MockNode as RoadmapNode } from "@/lib/mockData";

interface ProgressState {
  node_id: string;
  status: "locked" | "unlocked" | "completed";
  quiz_score?: number;
}

interface RoadmapVisualizerProps {
  nodes: RoadmapNode[];
  progress: ProgressState[];
  selectedNodeId: string | null;
  onNodeSelect: (nodeId: string) => void;
}

interface Position {
  x: number;
  y: number;
}

export default function RoadmapVisualizer({
  nodes,
  progress,
  selectedNodeId,
  onNodeSelect,
}: RoadmapVisualizerProps) {
  // Canvas Transform State (Pan & Zoom)
  const [pan, setPan] = useState<Position>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef<Position>({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Group nodes by tier to compute positions
  const nodePositions = useMemo(() => {
    const width = 800;
    const height = 500;
    const tiers = {
      foundational: nodes.filter((n) => n.tier === "foundational"),
      intermediate: nodes.filter((n) => n.tier === "intermediate"),
      advanced: nodes.filter((n) => n.tier === "advanced"),
    };

    const positions: Record<string, Position> = {};

    // Row Y Coordinates
    const yCoords = {
      foundational: 80,
      intermediate: 240,
      advanced: 400,
    };

    // Calculate X coordinate spacing per tier
    Object.entries(tiers).forEach(([tierName, tierNodes]) => {
      const y = yCoords[tierName as keyof typeof yCoords];
      const count = tierNodes.length;
      tierNodes.forEach((node, index) => {
        const x = ((index + 1) * width) / (count + 1);
        positions[node.id] = { x, y };
      });
    });

    return positions;
  }, [nodes]);

  // Handle Pan Dragging
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.current.x,
      y: e.clientY - dragStart.current.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Handle Zoom Scroll Wheel
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = 1.1;
    let newZoom = e.deltaY < 0 ? zoom * zoomFactor : zoom / zoomFactor;
    // Constrain zoom between 0.6 and 1.8
    newZoom = Math.max(0.6, Math.min(1.8, newZoom));
    setZoom(newZoom);
  };

  // Reset viewport zoom/pan
  const handleReset = () => {
    setPan({ x: 0, y: 0 });
    setZoom(1);
  };

  // Find progress status helper
  const getNodeStatus = (nodeId: string): "locked" | "unlocked" | "completed" => {
    const p = progress.find((state) => state.node_id === nodeId);
    return p ? p.status : "locked";
  };

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
      className="w-full h-[550px] border-[3px] border-black bg-[#101216] relative overflow-hidden cursor-grab active:cursor-grabbing select-none rounded-md shadow-[4px_4px_0_0_#0c0d10]"
    >
      {/* 2D Grid backdrop */}
      <div
        className="absolute inset-0 pixel-grid pointer-events-none"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: "center center",
          opacity: 0.8,
        }}
      />

      <svg
        className="w-full h-full absolute inset-0"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: "center center",
        }}
      >
        {/* Draw blocky connections (Double-layer orthogonal connections) */}
        <g fill="none">
          {nodes.map((node) => {
            const childPos = nodePositions[node.id];
            if (!childPos) return null;

            return (
              node.prerequisites?.map((prereqId: string) => {
                const parentPos = nodePositions[prereqId];
                if (!parentPos) return null;

                // Create blocky path: Parent -> Down -> MidX -> Down -> Child
                const midY = (parentPos.y + childPos.y) / 2;
                const pathData = `M ${parentPos.x} ${parentPos.y} L ${parentPos.x} ${midY} L ${childPos.x} ${midY} L ${childPos.x} ${childPos.y}`;

                const isParentCompleted = getNodeStatus(prereqId) === "completed";
                const isPathActive = isParentCompleted && getNodeStatus(node.id) !== "locked";

                return (
                  <g key={`${prereqId}-${node.id}`}>
                    {/* Layer 1: Thick Black Base Outline (3D boundary) */}
                    <path
                      d={pathData}
                      stroke="#000000"
                      strokeWidth="6"
                      strokeLinecap="square"
                    />
                    {/* Layer 2: Glowing Inner Wire */}
                    <path
                      d={pathData}
                      stroke={isPathActive ? "#00f2fe" : "#262b35"}
                      strokeWidth="2.5"
                      strokeLinecap="square"
                      strokeDasharray={isPathActive ? "none" : "3 3"}
                    />
                  </g>
                );
              }) || null
            );
          })}
        </g>

        {/* Draw SVG Node inventory cells */}
        {nodes.map((node) => {
          const pos = nodePositions[node.id];
          if (!pos) return null;

          const status = getNodeStatus(node.id);
          const isSelected = selectedNodeId === node.id;

          // Compute style tokens based on states
          let fillClass = "#1c1f26";
          let strokeClass = "#000000";
          let labelColor = "text-text-muted";
          let nodeIcon = null;

          if (isSelected) {
            strokeClass = "#ff9f1c"; // Selected highlight (Amber)
          } else if (status === "completed") {
            strokeClass = "#00f5a0"; // Completed (Emerald Green)
          } else if (status === "unlocked") {
            strokeClass = "#00f2fe"; // Unlocked (Cyber Cyan)
          } else {
            strokeClass = "#000000"; // Locked (Black border)
            fillClass = "#14151a";
          }

          if (status === "completed") {
            labelColor = "text-retro-green font-bold";
            nodeIcon = <Check size={20} className="text-retro-green" weight="bold" />;
          } else if (status === "unlocked") {
            labelColor = "text-white font-bold";
            nodeIcon = <BookOpen size={20} className="text-retro-cyan" />;
          } else {
            labelColor = "text-text-muted/50";
            nodeIcon = <LockKey size={20} className="text-text-muted/40" />;
          }

          return (
            <g
              key={node.id}
              transform={`translate(${pos.x}, ${pos.y})`}
              className="cursor-pointer group"
              onClick={(e) => {
                e.stopPropagation();
                onNodeSelect(node.id);
              }}
            >
              {/* Item Slot Box (2D RPG style rounded square) */}
              <rect
                x="-26"
                y="-26"
                width="52"
                height="52"
                rx="6"
                fill={fillClass}
                stroke={strokeClass}
                strokeWidth={isSelected ? "4" : "3"}
                className="transition-transform duration-100 group-hover:scale-105 active-press"
                style={{
                  transition: "all 100ms var(--ease-out-custom)",
                }}
              />

              {/* Render Icon centered inside the box */}
              <g transform="translate(-10, -10)" className="pointer-events-none">
                {nodeIcon}
              </g>

              {/* Text Tag Label */}
              <foreignObject
                x="-90"
                y="32"
                width="180"
                height="65"
                className="pointer-events-none"
              >
                <div className="text-center flex flex-col items-center">
                  <span
                    className={`font-pixel text-xs tracking-wider block mb-0.5 ${
                      status === "locked" ? "text-text-muted/40" : "text-retro-cyan"
                    }`}
                  >
                    {node.tier}
                  </span>
                  <p
                    className={`font-pixel text-[13px] leading-none max-w-[15ch] break-words ${labelColor} group-hover:underline`}
                  >
                    {node.title}
                  </p>
                </div>
              </foreignObject>
            </g>
          );
        })}
      </svg>

      {/* Floating Control Overlays */}
      <div className="absolute bottom-4 right-4 flex gap-2">
        <button
          onClick={handleReset}
          className="retro-btn text-xs py-1.5 px-3 hover:border-retro-amber cursor-pointer"
        >
          Reset View
        </button>
        <div className="bg-panel-dark border-2 border-black px-3 py-1.5 rounded text-xs font-pixel text-text-muted select-none">
          ZOOM: {Math.round(zoom * 100)}%
        </div>
      </div>

      <div className="absolute top-4 left-4 flex flex-col gap-1.5 p-3 bg-panel-dark/95 border-2 border-black rounded font-pixel text-xs text-text-muted">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-sm bg-[#14151a] border-2 border-black"></span>
          <span>Locked</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-sm bg-[#1c1f26] border-2 border-retro-cyan"></span>
          <span>Unlocked</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-sm bg-[#1c1f26] border-2 border-retro-green"></span>
          <span>Forged (Completed)</span>
        </div>
      </div>
    </div>
  );
}
