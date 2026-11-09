'use client';

import React, { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import ForceGraph2D with ssr disabled
const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-80 flex items-center justify-center font-mono text-xs text-neutral-500">
      INITIALIZING FORCE-DIRECTED GRAPH ENGINE...
    </div>
  ),
});

interface GraphNode {
  id: string;
  label: string;
  type: 'account' | 'ip' | 'emailDomain';
  x?: number;
  y?: number;
}

interface GraphLink {
  source: string;
  target: string;
  type: string;
}

interface NetworkGraphProps {
  nodes: GraphNode[];
  links: GraphLink[];
}

export function NetworkGraph({ nodes, links }: NetworkGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 600, height: 420 });

  useEffect(() => {
    function updateSize() {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: 420,
        });
      }
    }
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  if (!nodes || nodes.length === 0) {
    return (
      <div className="h-80 flex flex-col items-center justify-center border border-neutral-850 rounded-sm bg-[#0d0d0d] p-6 text-center">
        <p className="font-mono text-xs text-neutral-400 mb-1">
          // NO GRAPH NODE ASSOCIATED
        </p>
        <p className="font-mono text-[11px] text-neutral-600 max-w-md">
          Only suspected impostor accounts are mapped to attack infrastructure in Neo4j. Official and benign accounts do not have graph infrastructure nodes.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-[11px] font-mono px-2 text-neutral-400">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#22ff88]" />
          <span>Account</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]" />
          <span>IP Address</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#38bdf8]" />
          <span>Email Domain</span>
        </div>
        <span className="text-neutral-600 ml-auto">
          {nodes.length} entities • {links.length} infrastructure links
        </span>
      </div>

      {/* Graph Canvas Container */}
      <div
        ref={containerRef}
        className="border border-neutral-800 rounded-sm bg-[#0d0d0d] overflow-hidden"
      >
        <ForceGraph2D
          width={dimensions.width}
          height={dimensions.height}
          graphData={{ nodes: [...nodes], links: [...links] }}
          backgroundColor="#0d0d0d"
          linkColor={() => '#404040'}
          linkWidth={1.5}
          nodeRelSize={6}
          nodeColor={(node: any) => {
            if (node.type === 'account') return '#22ff88';
            if (node.type === 'ip') return '#f59e0b';
            return '#38bdf8';
          }}
          nodeCanvasObject={(node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
            const label = node.label || node.id;
            const fontSize = 11 / globalScale;
            ctx.font = `${fontSize}px monospace`;

            // Draw circle
            ctx.beginPath();
            ctx.arc(node.x, node.y, 5, 0, 2 * Math.PI, false);
            ctx.fillStyle =
              node.type === 'account'
                ? '#22ff88'
                : node.type === 'ip'
                ? '#f59e0b'
                : '#38bdf8';
            ctx.fill();

            // Draw label
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = '#ededed';
            ctx.fillText(label, node.x + 8, node.y);
          }}
          cooldownTicks={100}
        />
      </div>
    </div>
  );
}

