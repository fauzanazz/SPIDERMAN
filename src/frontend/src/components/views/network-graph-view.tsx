/**
 * D3.js Network Graph Component
 *
 * OPTIMAL DATA STRUCTURE FOR NETWORK GRAPHS:
 *
 * 1. NODES (NetworkNode):
 *    - id: unique identifier (required)
 *    - type: categorizes the entity (bank, ewallet, qris, phone, etc.)
 *    - riskScore: numerical score for color coding
 *    - label: display name (optional, falls back to id)
 *    - metadata: flexible object for additional properties
 *    - x, y, vx, vy: automatically managed by D3.js simulation
 *
 * 2. LINKS (NetworkLink):
 *    - source: node id or node object
 *    - target: node id or node object
 *    - strength: connection strength (0-1) for physics simulation
 *    - type: relationship type (transaction, ownership, etc.)
 *    - weight: visual thickness multiplier
 *    - metadata: transaction details, amounts, frequencies
 *
 * 3. ADVANTAGES OF THIS STRUCTURE:
 *    - No need to manually specify x,y coordinates
 *    - Physics simulation automatically arranges nodes
 *    - Interactive dragging and zooming
 *    - Dynamic force-based layout
 *    - Extensible metadata for rich tooltips
 *    - Type-safe with TypeScript
 *
 * 4. RECOMMENDED BACKEND DATA FORMAT:
 *    ```json
 *    {
 *      "nodes": [
 *        {
 *          "id": "BCA-7829****1234",
 *          "type": "bank",
 *          "riskScore": 85,
 *          "label": "BCA Account",
 *          "metadata": {
 *            "accountNumber": "7829****1234",
 *            "name": "John Doe",
 *            "balance": 1500000
 *          }
 *        }
 *      ],
 *      "links": [
 *        {
 *          "source": "BCA-7829****1234",
 *          "target": "OVO-081234****89",
 *          "strength": 0.8,
 *          "type": "transaction",
 *          "metadata": {
 *            "transactionCount": 45,
 *            "totalAmount": 15000000,
 *            "frequency": "daily"
 *          }
 *        }
 *      ]
 *    }
 *    ```
 */

"use client";

import { useState, useEffect, useRef } from "react";
import * as d3 from "d3";
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Download,
  RefreshCw,
  Network,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { Entity } from "@/lib/types/entity";

// D3.js Network Graph Data Types
export interface NetworkNode extends d3.SimulationNodeDatum {
  id: string;
  type: "bank" | "ewallet" | "qris" | "phone" | "merchant" | "individual";
  riskScore: number;
  label?: string;
  metadata?: {
    accountNumber?: string;
    phoneNumber?: string;
    merchantId?: string;
    name?: string;
    [key: string]: unknown;
  };
  // D3 will add x, y, vx, vy properties automatically
}

export interface NetworkLink extends d3.SimulationLinkDatum<NetworkNode> {
  source: string | NetworkNode;
  target: string | NetworkNode;
  strength: number;
  type?: "transaction" | "ownership" | "association" | "communication";
  weight?: number;
  metadata?: {
    transactionCount?: number;
    totalAmount?: number;
    frequency?: string;
    [key: string]: unknown;
  };
}

export interface NetworkData {
  nodes: NetworkNode[];
  links: NetworkLink[];
}

interface NetworkGraphViewProps {
  onEntitySelect: (entity: Entity) => void;
  selectedEntity: Entity | null;
  networkData?: NetworkData;
}

// Mock data with the new structure
const mockNetworkData: NetworkData = {
  nodes: [
    {
      id: "BCA-7829****1234",
      type: "bank",
      riskScore: 85,
      label: "BCA Account",
      metadata: {
        accountNumber: "7829****1234",
        name: "John Doe Account",
      },
    },
    {
      id: "OVO-081234****89",
      type: "ewallet",
      riskScore: 72,
      label: "OVO Wallet",
      metadata: {
        phoneNumber: "081234****89",
        name: "John Doe",
      },
    },
    {
      id: "QRIS-MRC001234",
      type: "qris",
      riskScore: 91,
      label: "Merchant QRIS",
      metadata: {
        merchantId: "MRC001234",
        name: "Suspicious Shop",
      },
    },
    {
      id: "+62812****5678",
      type: "phone",
      riskScore: 68,
      label: "Phone Number",
      metadata: {
        phoneNumber: "+62812****5678",
      },
    },
    {
      id: "DANA-087654****21",
      type: "ewallet",
      riskScore: 79,
      label: "DANA Wallet",
      metadata: {
        phoneNumber: "087654****21",
        name: "Jane Smith",
      },
    },
  ],
  links: [
    {
      source: "BCA-7829****1234",
      target: "OVO-081234****89",
      strength: 0.8,
      type: "transaction",
      metadata: {
        transactionCount: 45,
        totalAmount: 15000000,
        frequency: "daily",
      },
    },
    {
      source: "BCA-7829****1234",
      target: "+62812****5678",
      strength: 0.9,
      type: "ownership",
      metadata: {
        transactionCount: 12,
        totalAmount: 5000000,
      },
    },
    {
      source: "OVO-081234****89",
      target: "QRIS-MRC001234",
      strength: 0.7,
      type: "transaction",
      metadata: {
        transactionCount: 23,
        totalAmount: 8500000,
        frequency: "weekly",
      },
    },
    {
      source: "QRIS-MRC001234",
      target: "DANA-087654****21",
      strength: 0.6,
      type: "transaction",
      metadata: {
        transactionCount: 8,
        totalAmount: 2300000,
      },
    },
    {
      source: "+62812****5678",
      target: "DANA-087654****21",
      strength: 0.5,
      type: "communication",
      metadata: {
        frequency: "monthly",
      },
    },
  ],
};

export function NetworkGraphView({
  onEntitySelect,
  selectedEntity,
  networkData = mockNetworkData,
}: NetworkGraphViewProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoveredNode, setHoveredNode] = useState<NetworkNode | null>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  useEffect(() => {
    if (!svgRef.current || !networkData) return;

    const getNodeColor = (riskScore: number) => {
      if (riskScore >= 80) return "#ef4444"; // red
      if (riskScore >= 60) return "#f59e0b"; // yellow
      return "#10b981"; // green
    };

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove(); // Clear previous render

    const { width, height } = dimensions;

    // Create zoom behavior
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });

    svg.call(zoom);

    // Create main group for zoomable content
    const g = svg.append("g");

    // Create force simulation
    const simulation = d3
      .forceSimulation<NetworkNode>(networkData.nodes)
      .force(
        "link",
        d3
          .forceLink<NetworkNode, NetworkLink>(networkData.links)
          .id((d) => d.id)
          .distance(100)
          .strength((d) => d.strength || 0.5)
      )
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(30));

    // Create links
    const links = g
      .append("g")
      .selectAll("line")
      .data(networkData.links)
      .enter()
      .append("line")
      .attr("stroke", "#64748b")
      .attr("stroke-opacity", 0.6)
      .attr("stroke-width", (d) => (d.strength || 0.5) * 4);

    // Create nodes
    const nodes = g
      .append("g")
      .selectAll("circle")
      .data(networkData.nodes)
      .enter()
      .append("circle")
      .attr("r", 12)
      .attr("fill", (d) => getNodeColor(d.riskScore))
      .attr("stroke", "#ffffff")
      .attr("stroke-width", 2)
      .style("cursor", "pointer")
      .on("mouseover", (event, d) => {
        setHoveredNode(d);
        d3.select(event.currentTarget)
          .attr("stroke", "#3b82f6")
          .attr("stroke-width", 3);
      })
      .on("mouseout", (event, d) => {
        setHoveredNode(null);
        d3.select(event.currentTarget)
          .attr("stroke", selectedEntity?.id === d.id ? "#3b82f6" : "#ffffff")
          .attr("stroke-width", selectedEntity?.id === d.id ? 3 : 2);
      })
      .on("click", (_event, d) => {
        onEntitySelect(d as unknown as Entity);
      })
      .call(
        d3
          .drag<SVGCircleElement, NetworkNode>()
          .on("start", (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on("drag", (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on("end", (event, d) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
          })
      );

    // Create labels
    g.append("g")
      .selectAll("text")
      .data(networkData.nodes)
      .enter()
      .append("text")
      .text((d) => d.label || d.id.split("-")[0])
      .attr("font-size", "10px")
      .attr("text-anchor", "middle")
      .attr("fill", "#475569")
      .attr("dy", 20)
      .style("pointer-events", "none");

    // Update positions on simulation tick
    simulation.on("tick", () => {
      links
        .attr("x1", (d) => (d.source as NetworkNode).x || 0)
        .attr("y1", (d) => (d.source as NetworkNode).y || 0)
        .attr("x2", (d) => (d.target as NetworkNode).x || 0)
        .attr("y2", (d) => (d.target as NetworkNode).y || 0);

      nodes.attr("cx", (d) => d.x || 0).attr("cy", (d) => d.y || 0);

      g.selectAll("text")
        .attr("x", (d: unknown) => (d as NetworkNode).x || 0)
        .attr("y", (d: unknown) => (d as NetworkNode).y || 0);
    });

    // Update selected node appearance
    nodes
      .attr("stroke", (d) =>
        selectedEntity?.id === d.id ? "#3b82f6" : "#ffffff"
      )
      .attr("stroke-width", (d) => (selectedEntity?.id === d.id ? 3 : 2));

    // Cleanup function
    return () => {
      simulation.stop();
    };
  }, [networkData, selectedEntity, dimensions, onEntitySelect]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (svgRef.current) {
        const rect = svgRef.current.parentElement?.getBoundingClientRect();
        if (rect) {
          setDimensions({ width: rect.width, height: rect.height });
        }
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleZoomIn = () => {
    if (svgRef.current) {
      const svg = d3.select(svgRef.current);
      svg.transition().call(d3.zoom<SVGSVGElement, unknown>().scaleBy, 1.5);
    }
  };

  const handleZoomOut = () => {
    if (svgRef.current) {
      const svg = d3.select(svgRef.current);
      svg.transition().call(d3.zoom<SVGSVGElement, unknown>().scaleBy, 0.67);
    }
  };

  const handleReset = () => {
    if (svgRef.current) {
      const svg = d3.select(svgRef.current);
      svg
        .transition()
        .call(d3.zoom<SVGSVGElement, unknown>().transform, d3.zoomIdentity);
    }
  };

  return (
    <div className="h-full relative bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="absolute top-4 left-4 z-10 flex gap-2">
        <Card className="p-2">
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" onClick={handleZoomIn}>
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={handleZoomOut}>
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm">
              <Maximize2 className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={handleReset}>
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm">
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      </div>

      <div className="absolute top-4 right-4 z-10">
        <Card className="p-3">
          <div className="text-sm space-y-1">
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Nodes:</span>
              <span className="font-medium">{networkData.nodes.length}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Links:</span>
              <span className="font-medium">{networkData.links.length}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Clusters:</span>
              <span className="font-medium">3</span>
            </div>
          </div>
        </Card>
      </div>

      <div className="h-full w-full overflow-hidden">
        <svg
          ref={svgRef}
          className="w-full h-full cursor-grab active:cursor-grabbing"
          width={dimensions.width}
          height={dimensions.height}
        />

        {/* Hover tooltip */}
        {hoveredNode && (
          <div
            className="absolute pointer-events-none z-20 bg-black/80 text-white p-2 rounded text-xs"
            style={{
              left: (hoveredNode.x || 0) + 10,
              top: (hoveredNode.y || 0) - 10,
            }}
          >
            <div className="font-medium">
              {hoveredNode.label || hoveredNode.id}
            </div>
            <div>Risk Score: {hoveredNode.riskScore}</div>
            <div>Type: {hoveredNode.type}</div>
            {hoveredNode.metadata?.name && (
              <div>Name: {hoveredNode.metadata.name as string}</div>
            )}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 z-10">
        <Card className="p-3">
          <div className="text-sm space-y-2">
            <div className="font-medium mb-2">Risk Levels</div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <span className="text-xs">High Risk (80+)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
              <span className="text-xs">Medium Risk (60-79)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span className="text-xs">Low Risk (&lt;60)</span>
            </div>
          </div>
        </Card>
      </div>

      {networkData.nodes.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <Network className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No network data available</p>
            <p className="text-sm text-muted-foreground mt-2">
              Apply filters or search for entities to visualize connections
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default NetworkGraphView;
