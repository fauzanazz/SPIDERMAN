// src/frontend/src/components/views/network-graph-view.tsx - Updated for backend integration
"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import * as d3 from "d3";
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Download,
  RefreshCw,
  Network,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  graphApi,
  type GraphFilters,
  type EntityNode,
} from "@/lib/api/graph-api";
import {
  convertBackendEntityToFrontend,
  type Entity,
} from "@/lib/types/entity";

interface NetworkGraphViewProps {
  filters: GraphFilters;
  onEntitySelect: (entity: Entity) => void;
  selectedEntity: Entity | null;
  onRefreshData?: () => void;
}

interface NetworkNode extends d3.SimulationNodeDatum {
  id: string;
  entity: Entity;
  cluster?: string; // Website cluster this node belongs to
}

interface NetworkEdge {
  source: string | NetworkNode;
  target: string | NetworkNode;
  strength: number;
  type: "transaction" | "same_site" | "connected";
}

export function NetworkGraphView({
  filters,
  onEntitySelect,
  selectedEntity,
  onRefreshData,
}: NetworkGraphViewProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const simulationRef = useRef<d3.Simulation<NetworkNode, NetworkEdge> | null>(
    null
  );
  const nodesRef = useRef<d3.Selection<
    SVGCircleElement,
    NetworkNode,
    SVGGElement,
    unknown
  > | null>(null);
  const linksRef = useRef<d3.Selection<
    SVGLineElement,
    NetworkEdge,
    SVGGElement,
    unknown
  > | null>(null);
  const [hoveredNode, setHoveredNode] = useState<NetworkNode | null>(null);
  const [networkStats, setNetworkStats] = useState({
    nodes: 0,
    edges: 0,
    clusters: 0,
  });

  // Fetch graph data using React Query
  const {
    data: graphData,
    isLoading,
    error,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["graph-data", filters],
    queryFn: () => graphApi.getWholeGraph(filters),
    staleTime: 30000, // 30 seconds
    refetchOnWindowFocus: false,
  });

  // Convert backend data to D3 network format
  const convertToNetworkData = (graphData: any) => {
    const nodes: NetworkNode[] = [];
    const edges: NetworkEdge[] = [];
    const nodeMap = new Map<string, NetworkNode>();

    // Process clustered entities (from gambling sites)
    graphData.clusters?.forEach((cluster: any) => {
      cluster.entities.forEach((backendEntity: EntityNode) => {
        const entity = convertBackendEntityToFrontend(backendEntity);
        const node: NetworkNode = {
          id: backendEntity.id,
          entity,
          cluster: cluster.website_name,
        };
        nodes.push(node);
        nodeMap.set(backendEntity.id, node);
      });

      // Create edges between entities in the same cluster (gambling site)
      if (cluster.entities.length > 1) {
        for (let i = 0; i < cluster.entities.length; i++) {
          for (let j = i + 1; j < cluster.entities.length; j++) {
            edges.push({
              source: cluster.entities[i].id,
              target: cluster.entities[j].id,
              strength: 0.3,
              type: "same_site",
            });
          }
        }
      }
    });

    // Process standalone entities
    graphData.standalone_entities?.forEach((backendEntity: EntityNode) => {
      const entity = convertBackendEntityToFrontend(backendEntity);
      const node: NetworkNode = {
        id: backendEntity.id,
        entity,
        cluster: "standalone",
      };
      nodes.push(node);
      nodeMap.set(backendEntity.id, node);
    });

    // Create additional edges based on connections (this would be enhanced with actual transaction data)
    nodes.forEach((node) => {
      if (node.entity.connections > 0) {
        // For now, create some connections based on priority scores and entity types
        const potentialConnections = nodes.filter(
          (otherNode) =>
            otherNode.id !== node.id &&
            otherNode.entity.type === node.entity.type &&
            Math.abs(
              otherNode.entity.priorityScore - node.entity.priorityScore
            ) < 20
        );

        // Add a few connections randomly
        const numConnections = Math.min(
          Math.floor(Math.random() * 3) + 1,
          potentialConnections.length
        );

        for (let i = 0; i < numConnections; i++) {
          const target =
            potentialConnections[
              Math.floor(Math.random() * potentialConnections.length)
            ];
          if (
            target &&
            !edges.some(
              (e) =>
                (e.source === node.id && e.target === target.id) ||
                (e.source === target.id && e.target === node.id)
            )
          ) {
            edges.push({
              source: node.id,
              target: target.id,
              strength: 0.6,
              type: "connected",
            });
          }
        }
      }
    });

    return { nodes, edges };
  };

  // Handle refresh
  const handleRefresh = () => {
    refetch();
    onRefreshData?.();
  };

  // D3 visualization setup
  useEffect(() => {
    if (!svgRef.current || !graphData || isLoading) return;

    const svg = d3.select(svgRef.current);
    const width = 800;
    const height = 600;

    // Clear previous content
    svg.selectAll("*").remove();

    const { nodes, edges } = convertToNetworkData(graphData);

    // Update stats
    setNetworkStats({
      nodes: nodes.length,
      edges: edges.length,
      clusters: graphData.clusters?.length || 0,
    });

    if (nodes.length === 0) return;

    // Create zoom behavior
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });

    svg.call(zoom);

    // Create main group
    const g = svg.append("g");

    // Create force simulation
    const simulation = d3
      .forceSimulation(nodes)
      .force(
        "link",
        d3
          .forceLink(edges)
          .id((d: any) => d.id)
          .distance((d: any) => {
            switch (d.type) {
              case "same_site":
                return 80;
              case "transaction":
                return 120;
              case "connected":
                return 100;
              default:
                return 100;
            }
          })
          .strength((d: any) => d.strength)
      )
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(30));

    // Create links
    const link = g
      .append("g")
      .selectAll("line")
      .data(edges)
      .enter()
      .append("line")
      .attr("stroke", (d: NetworkEdge) => {
        switch (d.type) {
          case "same_site":
            return "#6b7280";
          case "transaction":
            return "#f59e0b";
          case "connected":
            return "#3b82f6";
          default:
            return "#6b7280";
        }
      })
      .attr("stroke-opacity", 0.6)
      .attr("stroke-width", (d: NetworkEdge) => Math.max(1, d.strength * 3))
      .attr("stroke-dasharray", (d: NetworkEdge) =>
        d.type === "same_site" ? "5,5" : "none"
      );

    // Create nodes
    const node = g
      .append("g")
      .selectAll("g")
      .data(nodes)
      .enter()
      .append("g")
      .attr("class", "node")
      .style("cursor", "pointer")
      .call(
        d3
          .drag<SVGGElement, NetworkNode>()
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

    // Add circles to nodes
    const nodeCircles = node
      .append("circle")
      .attr("r", (d: NetworkNode) => getNodeSize(d.entity.connections))
      .attr("fill", (d: NetworkNode) => getEntityColor(d.entity))
      .attr("stroke", "#ffffff")
      .attr("stroke-width", 2)
      .on("mouseover", (_event, d: NetworkNode) => setHoveredNode(d))
      .on("mouseout", () => setHoveredNode(null))
      .on("click", (_event, d: NetworkNode) => {
        onEntitySelect(d.entity);
      });

    // Add text labels
    node
      .append("text")
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "middle")
      .attr("font-size", "10")
      .attr("font-weight", "bold")
      .attr("fill", "white")
      .attr("pointer-events", "none")
      .text((d: NetworkNode) => getEntityLabel(d.entity));

    // Add priority indicator
    node
      .append("circle")
      .attr("r", 4)
      .attr("cx", (d: NetworkNode) => getNodeSize(d.entity.connections) - 6)
      .attr("cy", (d: NetworkNode) => -getNodeSize(d.entity.connections) + 6)
      .attr("fill", (d: NetworkNode) =>
        getPriorityColor(d.entity.priorityScore)
      )
      .attr("stroke", "#ffffff")
      .attr("stroke-width", 1)
      .attr("pointer-events", "none");

    nodesRef.current = nodeCircles;
    linksRef.current = link;
    simulationRef.current = simulation;

    // Update positions on simulation tick
    simulation.on("tick", () => {
      link
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);

      node.attr("transform", (d: any) => `translate(${d.x},${d.y})`);
    });

    return () => {
      simulation.stop();
    };
  }, [graphData, onEntitySelect]);

  // Update selected node styling
  useEffect(() => {
    if (!nodesRef.current) return;

    nodesRef.current
      .attr("stroke", (d: NetworkNode) =>
        selectedEntity?.id === d.entity.id ? "#dc2626" : "#ffffff"
      )
      .attr("stroke-width", (d: NetworkNode) =>
        selectedEntity?.id === d.entity.id ? 4 : 2
      );
  }, [selectedEntity]);

  // Helper functions
  const getNodeSize = (connections: number) => {
    return Math.max(20, Math.min(40, connections * 3 + 20));
  };

  const getEntityColor = (entity: Entity) => {
    const typeColors = {
      bank_account: "#1e3a8a", // blue-800
      e_wallet: "#7c3aed", // violet-600
      crypto_wallet: "#f59e0b", // amber-500
      phone_number: "#8b5cf6", // violet-500
      qris: "#f59e0b", // amber-500
    };
    return typeColors[entity.type] || "#6b7280";
  };

  const getPriorityColor = (priorityScore: number) => {
    if (priorityScore >= 80) return "#dc2626"; // red-600
    if (priorityScore >= 60) return "#ea580c"; // orange-600
    return "#16a34a"; // green-600
  };

  const getEntityLabel = (entity: Entity) => {
    switch (entity.type) {
      case "bank_account":
        return entity.bank_name?.substring(0, 3) || "BANK";
      case "e_wallet":
        return entity.wallet_type?.substring(0, 3) || "EWLT";
      case "crypto_wallet":
        return entity.cryptocurrency?.substring(0, 3) || "CRYPTO";
      case "phone_number":
        return "PHONE";
      case "qris":
        return "QRIS";
      default:
        return "?";
    }
  };

  if (isError) {
    return (
      <div className="absolute inset-0 bg-gradient-to-br from-black via-gray-900 to-black flex items-center justify-center">
        <Alert className="max-w-md bg-red-900/50 border-red-700">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-red-300">
            Failed to load graph data: {error?.message}
            <Button
              onClick={handleRefresh}
              variant="outline"
              size="sm"
              className="mt-2 w-full border-red-600 text-red-400 hover:bg-red-800/20"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 bg-gradient-to-br from-black via-gray-900 to-black">
      {/* Graph Controls */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10 flex gap-2">
        <Card className="p-2 bg-black/90 border-gray-700 backdrop-blur">
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="text-gray-400 hover:text-white hover:bg-gray-800"
              onClick={() => {
                if (simulationRef.current) {
                  simulationRef.current.alpha(1).restart();
                }
              }}
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-gray-400 hover:text-white hover:bg-gray-800"
              onClick={() => {
                if (simulationRef.current) {
                  simulationRef.current.alpha(0).stop();
                }
              }}
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-gray-400 hover:text-white hover:bg-gray-800"
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={isLoading}
              className="text-gray-400 hover:text-white hover:bg-gray-800 disabled:opacity-50"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-gray-400 hover:text-white hover:bg-gray-800"
            >
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      </div>

      {/* Graph Stats */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-10">
        <Card className="p-3 bg-black/90 border-gray-700 backdrop-blur">
          <div className="text-sm space-y-1 text-center">
            <div className="flex justify-center gap-6">
              <div>
                <span className="text-gray-400">Nodes:</span>
                <span className="font-medium text-white ml-2">
                  {isLoading ? "..." : networkStats.nodes}
                </span>
              </div>
              <div>
                <span className="text-gray-400">Edges:</span>
                <span className="font-medium text-white ml-2">
                  {isLoading ? "..." : networkStats.edges}
                </span>
              </div>
              <div>
                <span className="text-gray-400">Clusters:</span>
                <span className="font-medium text-white ml-2">
                  {isLoading ? "..." : networkStats.clusters}
                </span>
              </div>
            </div>
            {graphData && (
              <div className="text-xs text-gray-500">
                Total Transactions:{" "}
                {graphData.total_transactions?.toLocaleString() || 0}
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Loading Indicator */}
      {isLoading && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-30">
          <Card className="p-6 bg-black/90 border-gray-700 backdrop-blur">
            <div className="flex items-center space-x-3">
              <Loader2 className="h-6 w-6 animate-spin text-blue-400" />
              <div className="text-white">Loading graph data...</div>
            </div>
          </Card>
        </div>
      )}

      {/* Main Graph Area - D3.js will render here */}
      <div className="h-full w-full overflow-hidden">
        <svg
          ref={svgRef}
          className="w-full h-full cursor-grab active:cursor-grabbing"
          width="100%"
          height="100%"
        />

        {/* Hover tooltip for nodes */}
        {hoveredNode &&
          hoveredNode.x !== undefined &&
          hoveredNode.y !== undefined && (
            <div
              className="absolute pointer-events-none z-20 bg-black/95 border border-gray-600 text-white p-3 rounded text-sm backdrop-blur max-w-xs"
              style={{
                left: Math.min(hoveredNode.x + 20, window.innerWidth - 300),
                top: Math.max(hoveredNode.y - 10, 10),
              }}
            >
              <div className="font-bold text-gray-300 mb-1">
                {getEntityLabel(hoveredNode.entity)} -{" "}
                {hoveredNode.entity.specificInformation}
              </div>
              <div className="font-mono text-xs mb-2 break-all">
                {hoveredNode.entity.identifier}
              </div>
              <div className="text-gray-400 space-y-1">
                <div>Type: {hoveredNode.entity.type.replace("_", " ")}</div>
                <div>Holder: {hoveredNode.entity.accountHolder}</div>
                <div>Priority: {hoveredNode.entity.priorityScore}</div>
                <div>Connections: {hoveredNode.entity.connections}</div>
                <div>
                  Transactions:{" "}
                  {hoveredNode.entity.transactions.toLocaleString()}
                </div>
                <div>
                  Total Amount: Rp{" "}
                  {hoveredNode.entity.totalAmount.toLocaleString()}
                </div>
                {hoveredNode.cluster &&
                  hoveredNode.cluster !== "standalone" && (
                    <div>Cluster: {hoveredNode.cluster}</div>
                  )}
              </div>
            </div>
          )}
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 right-4 z-10">
        <Card className="p-3 bg-black/90 border-gray-700 backdrop-blur">
          <div className="text-sm space-y-3">
            <div className="font-medium mb-2 text-gray-400">Entity Types</div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-800"></div>
                <span className="text-xs text-white">Bank Account</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-violet-600"></div>
                <span className="text-xs text-white">E-Wallet</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                <span className="text-xs text-white">Crypto/QRIS</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-violet-500"></div>
                <span className="text-xs text-white">Phone Number</span>
              </div>
            </div>

            <div className="border-t border-gray-600 pt-2 mt-3">
              <div className="font-medium mb-2 text-gray-400">
                Priority Levels
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-600"></div>
                  <span className="text-xs text-white">
                    High Priority (80+)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-orange-600"></div>
                  <span className="text-xs text-white">
                    Medium Priority (60-79)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-600"></div>
                  <span className="text-xs text-white">
                    Low Priority (&lt;60)
                  </span>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-600 pt-2 mt-3">
              <div className="font-medium mb-2 text-gray-400">
                Connection Types
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div
                    className="w-4 h-0.5 bg-gray-600"
                    style={{ borderTop: "1px dashed" }}
                  ></div>
                  <span className="text-xs text-white">Same Site</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-0.5 bg-amber-500"></div>
                  <span className="text-xs text-white">Transaction</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-0.5 bg-blue-500"></div>
                  <span className="text-xs text-white">Connected</span>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Empty state when no data */}
      {!isLoading &&
        (!graphData ||
          (graphData.clusters?.length === 0 &&
            graphData.standalone_entities?.length === 0)) && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <Network className="h-12 w-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-300 mb-2">No entities found</p>
              <p className="text-sm text-gray-500 mb-4">
                Try adjusting your filters or search criteria
              </p>
              <Button
                onClick={handleRefresh}
                variant="outline"
                className="border-gray-600 text-gray-400 hover:bg-gray-800"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh Data
              </Button>
            </div>
          </div>
        )}
    </div>
  );
}
