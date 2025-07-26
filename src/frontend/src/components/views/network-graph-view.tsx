// src/frontend/src/components/views/network-graph-view.tsx - Updated with flying search bar
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import * as d3 from "d3";
import {
  RefreshCw,
  Network,
  Loader2,
  AlertTriangle,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import {
  graphApi,
  type GraphFilters,
  type EntityNode,
} from "@/lib/api/graph-api";
import {
  convertBackendEntityToFrontend,
  type Entity,
  type BackendEntity,
} from "@/lib/types/entity";

interface NetworkGraphViewProps {
  filters: GraphFilters;
  onEntitySelect: (entity: Entity) => void;
  selectedEntity: Entity | null;
  onRefreshData?: () => void;
  onFiltersChange: (filters: GraphFilters) => void;
  currentMode: "default" | "selection";
  selectedEntities: Entity[];
  onEntitiesSelect: (entities: Entity[]) => void;
}

interface NetworkNode extends d3.SimulationNodeDatum {
  id: string;
  entity: Entity;
  cluster?: string;
  selected?: boolean;
}

interface NetworkEdge {
  source: string | NetworkNode;
  target: string | NetworkNode;
  strength: number;
  type: "transaction" | "same_site" | "connected" | "transfer";
  amount?: number; // For transfer edges
  timestamp?: string; // For transfer edges
  reference?: string; // For transfer edges
}

interface GraphCluster {
  website_name: string;
  entities: EntityNode[];
}

interface GraphData {
  clusters?: GraphCluster[];
  standalone_entities?: EntityNode[];
  transactions?: {
    from_node: string;
    to_node: string;
    amount: number;
    timestamp: string;
    transaction_type: string;
    reference?: string;
    direction: "incoming" | "outgoing";
  }[];
  total_transactions?: number;
}

interface MouseEvent {
  target: EventTarget | null;
  currentTarget: EventTarget | null;
}

export function NetworkGraphView({
  filters,
  onEntitySelect,
  selectedEntity,
  onRefreshData,
  onFiltersChange,
  currentMode,
  selectedEntities,
  onEntitiesSelect,
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
  const [searchInput, setSearchInput] = useState(filters.search_query || "");

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
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });

  // Handle search submit
  const handleSearchSubmit = () => {
    onFiltersChange({
      ...filters,
      search_query: searchInput.trim() || undefined,
    });
  };

  // Handle node selection in different modes
  const handleNodeClick = useCallback(
    (_event: MouseEvent, node: NetworkNode) => {
      if (currentMode === "selection") {
        // Selection mode: add/remove from selected entities
        const isSelected = selectedEntities.some(
          (e) => e.id === node.entity.id
        );
        if (isSelected) {
          // Remove from selection
          onEntitiesSelect(
            selectedEntities.filter((e) => e.id !== node.entity.id)
          );
        } else {
          // Add to selection
          onEntitiesSelect([...selectedEntities, node.entity]);
        }
      } else {
        // Default mode: select single entity
        onEntitySelect(node.entity);
      }
    },
    [currentMode, selectedEntities, onEntitiesSelect, onEntitySelect]
  );

  // Check if node is selected
  const isNodeSelected = useCallback(
    (node: NetworkNode) => {
      if (currentMode === "selection") {
        return selectedEntities.some((e) => e.id === node.entity.id);
      } else {
        return selectedEntity?.id === node.entity.id;
      }
    },
    [currentMode, selectedEntities, selectedEntity]
  );

  // Convert backend data to D3 network format
  const convertToNetworkData = useCallback(
    (graphData: GraphData) => {
      const nodes: NetworkNode[] = [];
      const edges: NetworkEdge[] = [];
      const nodeMap = new Map<string, NetworkNode>();

      // Process clustered entities (from gambling sites)
      graphData.clusters?.forEach((cluster: GraphCluster) => {
        cluster.entities.forEach((backendEntity: EntityNode) => {
          // Convert EntityNode to BackendEntity format for the conversion function
          const backendEntityWithConnections: EntityNode & {
            connected_entities: Entity[];
          } = {
            ...backendEntity,
            connected_entities: [], // EntityNode doesn't have this field, so we provide empty array
          };
          const entity = convertBackendEntityToFrontend(
            backendEntityWithConnections as BackendEntity
          );
          const node: NetworkNode = {
            id: backendEntity.id,
            entity,
            cluster: cluster.website_name,
            selected: isNodeSelected({
              id: backendEntity.id,
              entity,
            } as NetworkNode),
          };
          nodes.push(node);
          nodeMap.set(backendEntity.id, node);
        });

        // No artificial same_site edges - only show TRANSFERS_TO relationships
      });

      // Process standalone entities
      graphData.standalone_entities?.forEach((backendEntity: EntityNode) => {
        // Convert EntityNode to BackendEntity format for the conversion function
        const backendEntityWithConnections: EntityNode & {
          connected_entities: Entity[];
        } = {
          ...backendEntity,
          connected_entities: [], // EntityNode doesn't have this field, so we provide empty array
        };
        const entity = convertBackendEntityToFrontend(
          backendEntityWithConnections as BackendEntity
        );
        const node: NetworkNode = {
          id: backendEntity.id,
          entity,
          cluster: "standalone",
          selected: isNodeSelected({
            id: backendEntity.id,
            entity,
          } as NetworkNode),
        };
        nodes.push(node);
        nodeMap.set(backendEntity.id, node);
      });

      // Add actual TRANSFERS_TO relationships as edges
      graphData.transactions?.forEach((transaction) => {
        const sourceNode = nodeMap.get(transaction.from_node);
        const targetNode = nodeMap.get(transaction.to_node);

        if (sourceNode && targetNode) {
          edges.push({
            source: transaction.from_node,
            target: transaction.to_node,
            strength: 0.8, // Strong connection for actual transactions
            type: "transfer",
            amount: transaction.amount,
            timestamp: transaction.timestamp,
            reference: transaction.reference,
          });
        }
      });

      return { nodes, edges };
    },
    [isNodeSelected]
  );

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

    // Create defs for patterns (logos)
    const defs = svg.append("defs");

    // Create unique patterns for each entity's logo
    const logoPatterns = new Set();
    nodes.forEach((node) => {
      const logoUrl = getLogoUrl(node.entity);
      const specificInfo = node.entity.specificInformation;

      if (logoUrl && specificInfo && !logoPatterns.has(specificInfo)) {
        logoPatterns.add(specificInfo);

        const patternId = `logo-${specificInfo
          .toLowerCase()
          .replace(/\s+/g, "_")
          .replace(/[^a-z0-9_]/g, "")}`;
        const pattern = defs
          .append("pattern")
          .attr("id", patternId)
          .attr("x", 0)
          .attr("y", 0)
          .attr("width", 1)
          .attr("height", 1)
          .attr("patternContentUnits", "objectBoundingBox");

        // Add white background for better logo visibility
        pattern
          .append("rect")
          .attr("width", 1)
          .attr("height", 1)
          .attr("fill", "#ffffff");

        pattern
          .append("image")
          .attr("x", 0.1) // 10% padding
          .attr("y", 0.1) // 10% padding
          .attr("width", 0.8) // 80% of the circle
          .attr("height", 0.8) // 80% of the circle
          .attr("href", logoUrl)
          .attr("preserveAspectRatio", "xMidYMid meet")
          .on("error", function () {
            // If logo fails to load, hide the image
            d3.select(this).style("display", "none");
          });
      }
    });

    // Group nodes by cluster for better positioning
    const clusterGroups = new Map<string, NetworkNode[]>();
    const clusterCenters = new Map<string, { x: number; y: number }>();

    nodes.forEach((node) => {
      const cluster = node.cluster || "standalone";
      if (!clusterGroups.has(cluster)) {
        clusterGroups.set(cluster, []);
      }
      clusterGroups.get(cluster)!.push(node);
    });

    // Pre-calculate cluster centers in a circle layout for better separation
    const clusterNames = Array.from(clusterGroups.keys()).filter(
      (name) => name !== "standalone"
    );
    const radius = Math.min(width, height) * 0.3; // Clusters distributed in a circle
    clusterNames.forEach((clusterName, i) => {
      const angle = (i * 2 * Math.PI) / clusterNames.length;
      clusterCenters.set(clusterName, {
        x: width / 2 + radius * Math.cos(angle),
        y: height / 2 + radius * Math.sin(angle),
      });
    });

    // Standalone entities in the center
    clusterCenters.set("standalone", { x: width / 2, y: height / 2 });

    // Set initial positions for nodes based on their cluster centers
    nodes.forEach((node) => {
      const clusterName = node.cluster || "standalone";
      const center = clusterCenters.get(clusterName);
      if (center) {
        // Add some random offset from cluster center
        const offset = 50;
        node.x = center.x + (Math.random() - 0.5) * offset;
        node.y = center.y + (Math.random() - 0.5) * offset;
      }
    });

    // Create cluster backgrounds
    const clusterLayer = g.append("g").attr("class", "clusters");

    // Add cluster background circles (will be positioned during simulation)
    const clusterBackgrounds = clusterLayer
      .selectAll("circle")
      .data(
        Array.from(clusterGroups.keys()).filter((key) => key !== "standalone")
      )
      .enter()
      .append("circle")
      .attr("class", "cluster-background")
      .attr("r", 0) // Will be updated during simulation
      .attr("fill", (_, i) => {
        const colors = [
          "rgba(59, 130, 246, 0.1)",
          "rgba(16, 185, 129, 0.1)",
          "rgba(245, 158, 11, 0.1)",
          "rgba(168, 85, 247, 0.1)",
          "rgba(239, 68, 68, 0.1)",
          "rgba(236, 72, 153, 0.1)",
        ];
        return colors[i % colors.length];
      })
      .attr("stroke", (_, i) => {
        const colors = [
          "#3b82f6",
          "#10b981",
          "#f59e0b",
          "#a855f7",
          "#ef4444",
          "#ec4899",
        ];
        return colors[i % colors.length];
      })
      .attr("stroke-width", 2)
      .attr("stroke-dasharray", "5,5")
      .attr("stroke-opacity", 0.5);

    // Create force simulation with improved cluster separation
    const simulation = d3
      .forceSimulation(nodes)
      .force(
        "link",
        d3
          .forceLink(edges)
          .id((d) => (d as NetworkNode).id)
          .distance((d) => {
            switch (d.type) {
              case "transfer":
                return 80; // Moderate distance for transfer edges
              case "same_site":
                return 30; // Keep same-site nodes close
              case "transaction":
                return 100;
              case "connected":
                return 60;
              default:
                return 50;
            }
          })
          .strength((d: NetworkEdge) => d.strength * 0.3) // Much reduced link strength to allow cluster forces to dominate
      )
      .force("charge", d3.forceManyBody().strength(-150)) // Reduced repulsion for tighter clusters
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(35)) // Slightly smaller collision radius
      .force("cluster", function () {
        // Strong cluster force to group nodes by their gambling site
        const strength = 0.8; // Much stronger clustering force
        return function (alpha: number) {
          nodes.forEach((node) => {
            const clusterName = node.cluster || "standalone";
            const center = clusterCenters.get(clusterName);

            if (center) {
              const dx = center.x - (node.x || 0);
              const dy = center.y - (node.y || 0);

              // Apply stronger force for cluster cohesion
              const force = strength * alpha * 0.1;
              node.vx = (node.vx || 0) + dx * force;
              node.vy = (node.vy || 0) + dy * force;
            }
          });
        };
      })
      .force("separate-clusters", function () {
        // Additional force to keep clusters separated
        const strength = 2.0;
        return function (alpha: number) {
          clusterNames.forEach((cluster1, i) => {
            clusterNames.forEach((cluster2, j) => {
              if (i >= j) return;

              const center1 = clusterCenters.get(cluster1);
              const center2 = clusterCenters.get(cluster2);
              if (!center1 || !center2) return;

              const dx = center2.x - center1.x;
              const dy = center2.y - center1.y;
              const distance = Math.sqrt(dx * dx + dy * dy);
              const minDistance = 150; // Minimum distance between cluster centers

              if (distance < minDistance) {
                const force = (minDistance - distance) * strength * alpha;
                const fx = (dx / distance) * force;
                const fy = (dy / distance) * force;

                // Push clusters apart
                clusterGroups.get(cluster1)?.forEach((node) => {
                  node.vx = (node.vx || 0) - fx * 0.1;
                  node.vy = (node.vy || 0) - fy * 0.1;
                });
                clusterGroups.get(cluster2)?.forEach((node) => {
                  node.vx = (node.vx || 0) + fx * 0.1;
                  node.vy = (node.vy || 0) + fy * 0.1;
                });
              }
            });
          });
        };
      });

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

    // Add logo circles on top of background
    const logoCircles = node
      .append("circle")
      .attr("r", (d: NetworkNode) => getNodeSize(d.entity.connections) - 4) // Slightly smaller for border effect
      .attr("fill", (d: NetworkNode) => {
        const logoUrl = getLogoUrl(d.entity);
        const specificInfo = d.entity.specificInformation;

        if (logoUrl && specificInfo) {
          const patternId = `logo-${specificInfo
            .toLowerCase()
            .replace(/\s+/g, "_")
            .replace(/[^a-z0-9_]/g, "")}`;
          return `url(#${patternId})`;
        }
        // Fallback to entity color if no logo
        return getEntityColor(d.entity);
      })
      .attr("stroke", "none")
      .style("cursor", "pointer")
      .on("mouseover", (_event, d: NetworkNode) => setHoveredNode(d))
      .on("mouseout", () => setHoveredNode(null))
      .on("click", handleNodeClick);

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

    // Add selection indicator for selection mode
    if (currentMode === "selection") {
      node
        .append("circle")
        .attr("r", (d: NetworkNode) => getNodeSize(d.entity.connections) + 8)
        .attr("fill", "none")
        .attr("stroke", (d: NetworkNode) =>
          isNodeSelected(d) ? "#10b981" : "transparent"
        )
        .attr("stroke-width", 3)
        .attr("stroke-dasharray", "5,5")
        .attr("pointer-events", "none")
        .style("opacity", (d: NetworkNode) => (isNodeSelected(d) ? 0.8 : 0));
    }

    nodesRef.current = logoCircles;
    linksRef.current = link;
    simulationRef.current = simulation;

    // Update positions on simulation tick
    simulation.on("tick", () => {
      link
        .attr("x1", (d: NetworkEdge) => (d.source as NetworkNode).x!)
        .attr("y1", (d: NetworkEdge) => (d.source as NetworkNode).y!)
        .attr("x2", (d: NetworkEdge) => (d.target as NetworkNode).x!)
        .attr("y2", (d: NetworkEdge) => (d.target as NetworkNode).y!);

      node.attr("transform", (d: NetworkNode) => `translate(${d.x},${d.y})`);

      // Update cluster background positions and sizes
      clusterBackgrounds.each(function (clusterName) {
        const nodesInCluster = clusterGroups.get(clusterName) || [];
        if (nodesInCluster.length === 0) return;

        // Calculate cluster bounds
        let minX = Infinity,
          maxX = -Infinity,
          minY = Infinity,
          maxY = -Infinity;
        nodesInCluster.forEach((n) => {
          const x = n.x || 0;
          const y = n.y || 0;
          const nodeSize = getNodeSize(n.entity.connections) + 20; // Add padding
          minX = Math.min(minX, x - nodeSize);
          maxX = Math.max(maxX, x + nodeSize);
          minY = Math.min(minY, y - nodeSize);
          maxY = Math.max(maxY, y + nodeSize);
        });

        // Calculate center and radius
        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;
        const radius = Math.max(
          Math.sqrt(Math.pow(maxX - minX, 2) + Math.pow(maxY - minY, 2)) / 2 +
            30,
          80 // Minimum radius
        );

        // Update cluster background
        d3.select(this)
          .attr("cx", centerX)
          .attr("cy", centerY)
          .attr("r", radius);
      });
    });

    console.log("Graph re-rendering due to data change");

    return () => {
      simulation.stop();
    };
  }, [
    graphData,
    isLoading,
    currentMode,
    convertToNetworkData,
    handleNodeClick,
    isNodeSelected,
  ]);

  // Separate effect to update selection visuals without recreating the graph
  useEffect(() => {
    if (!nodesRef.current) return;

    // Update selection highlights
    nodesRef.current
      .select(".selection-border")
      .attr("stroke", (d: NetworkNode) =>
        isNodeSelected(d) ? "#10b981" : "transparent"
      )
      .style("opacity", (d: NetworkNode) => (isNodeSelected(d) ? 0.8 : 0));

    console.log("Selection visual update");
  }, [selectedEntities, selectedEntity, currentMode, isNodeSelected]);

  // Helper function to get logo URL based on specific information
  const getLogoUrl = (entity: Entity) => {
    const specificInfo = entity.specificInformation;
    if (!specificInfo) return null;

    // Normalize the name to match SVG file naming convention
    const logoName = specificInfo
      .toLowerCase()
      .replace(/\s+/g, "_")
      .replace(/[^a-z0-9_]/g, "");

    return `/logos/${logoName}.svg`;
  };

  // Helper functions
  const getNodeSize = (connections: number) => {
    return Math.max(30, Math.min(50, connections * 3 + 30)); // Increased size for logo visibility
  };

  const getEntityColor = (entity: Entity) => {
    const typeColors: Record<string, string> = {
      bank_account: "#1e3a8a",
      e_wallet: "#7c3aed",
      crypto_wallet: "#f59e0b",
      phone_number: "#8b5cf6",
      qris: "#f59e0b",
    };
    return typeColors[entity.type] || "#6b7280";
  };

  const getPriorityColor = (priorityScore: number) => {
    if (priorityScore >= 80) return "#dc2626";
    if (priorityScore >= 60) return "#ea580c";
    return "#16a34a";
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
            Gagal memuat data graf: {error?.message}
            <Button
              onClick={handleRefresh}
              variant="outline"
              size="sm"
              className="mt-2 w-full border-red-600 text-red-400 hover:bg-red-800/20"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Coba Lagi
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 bg-gradient-to-br from-black via-gray-900 to-black">
      {/* Flying Search Bar - Centered at top */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-30 flex gap-2">
        <Card className="p-3 bg-black/90 border-gray-700 backdrop-blur min-w-96">
          <div className="flex items-center space-x-3">
            <div className="flex-1 flex space-x-2">
              <Input
                placeholder="Cari entitas berdasarkan nomor rekening, alamat dompet, telepon..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleSearchSubmit();
                  }
                }}
                className="bg-gray-800/50 border-gray-600 text-white placeholder:text-gray-500"
              />
              <Button
                onClick={handleSearchSubmit}
                className="bg-gray-700 hover:bg-gray-600 text-white"
                size="sm"
              >
                <Search className="h-4 w-4" />
              </Button>
              <Button
                onClick={handleRefresh}
                className="bg-gray-700 hover:bg-gray-600 text-white"
                size="sm"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
            {filters.search_query && (
              <div className="text-xs text-blue-400 whitespace-nowrap">
                Mencari: "{filters.search_query}"
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Mode Indicator */}
      {currentMode === "selection" && (
        <div className="absolute top-4 right-4 z-20">
          <Card className="p-3 bg-green-900/90 border-green-700 backdrop-blur">
            <div className="text-sm text-green-300 font-medium">
              Mode Pilihan Aktif
            </div>
            <div className="text-xs text-green-400">
              Klik node untuk memilih laporan batch
            </div>
          </Card>
        </div>
      )}

      {/* Graph Stats */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-10">
        <Card className="p-3 bg-black/90 border-gray-700 backdrop-blur">
          <div className="text-sm space-y-1 text-center">
            <div className="flex justify-center gap-6">
              <div>
                <span className="text-gray-400">Node:</span>
                <span className="font-medium text-white ml-2">
                  {isLoading ? "..." : networkStats.nodes}
                </span>
              </div>
              <div>
                <span className="text-gray-400">Koneksi:</span>
                <span className="font-medium text-white ml-2">
                  {isLoading ? "..." : networkStats.edges}
                </span>
              </div>
              <div>
                <span className="text-gray-400">Kluster:</span>
                <span className="font-medium text-white ml-2">
                  {isLoading ? "..." : networkStats.clusters}
                </span>
              </div>
              {currentMode === "selection" && (
                <div>
                  <span className="text-gray-400">Dipilih:</span>
                  <span className="font-medium text-green-400 ml-2">
                    {selectedEntities.length}
                  </span>
                </div>
              )}
            </div>
            {graphData && (
              <div className="text-xs text-gray-500">
                Total Transaksi:{" "}
                {graphData.total_transactions?.toLocaleString() || 0}
              </div>
            )}
          </div>
        </Card>
      </div>
      {isLoading && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-30">
          <Card className="p-6 bg-black/90 border-gray-700 backdrop-blur">
            <div className="flex items-center space-x-3">
              <Loader2 className="h-6 w-6 animate-spin text-blue-400" />
              <div className="text-white">Memuat data graf...</div>
            </div>
          </Card>
        </div>
      )}

      {/* Main Graph Area */}
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
                left: hoveredNode.x,
                top: hoveredNode.y,
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
                <div>Tipe: {hoveredNode.entity.type.replace("_", " ")}</div>
                <div>Pemegang: {hoveredNode.entity.accountHolder}</div>
                <div>Prioritas: {hoveredNode.entity.priorityScore}</div>
                <div>Koneksi: {hoveredNode.entity.connections}</div>
                <div>
                  Transaksi:{" "}
                  {hoveredNode.entity.transactions.toLocaleString()}
                </div>
                <div>
                  Total Jumlah: Rp{" "}
                  {hoveredNode.entity.totalAmount.toLocaleString()}
                </div>
                {hoveredNode.cluster &&
                  hoveredNode.cluster !== "standalone" && (
                    <div>Kluster: {hoveredNode.cluster}</div>
                  )}
                {currentMode === "selection" && (
                  <div className="text-green-400 text-xs mt-2">
                    {isNodeSelected(hoveredNode)
                      ? "✓ Dipilih"
                      : "Klik untuk memilih"}
                  </div>
                )}
              </div>
            </div>
          )}
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 right-4 z-10">
        <Card className="p-3 bg-black/90 border-gray-700 backdrop-blur">
          <div className="text-sm space-y-3">
            <div className="font-medium mb-2 text-gray-400">Tipe Entitas</div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-800"></div>
                <span className="text-xs text-white">Rekening Bank</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-violet-600"></div>
                <span className="text-xs text-white">E-Wallet</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                <span className="text-xs text-white">Kripto/QRIS</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-violet-500"></div>
                <span className="text-xs text-white">Nomor Telepon</span>
              </div>
            </div>

            <div className="border-t border-gray-600 pt-2 mt-3">
              <div className="font-medium mb-2 text-gray-400">
                Tingkat Prioritas
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-600"></div>
                  <span className="text-xs text-white">
                    Prioritas Tinggi (80+)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-orange-600"></div>
                  <span className="text-xs text-white">
                    Prioritas Sedang (60-79)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-600"></div>
                  <span className="text-xs text-white">
                    Prioritas Rendah (&lt;60)
                  </span>
                </div>
              </div>
            </div>

            {currentMode === "selection" && (
              <div className="border-t border-gray-600 pt-2 mt-3">
                <div className="font-medium mb-2 text-gray-400">
                  Mode Pilihan
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-4 h-4 rounded-full border-2 border-green-600"
                      style={{ borderStyle: "dashed" }}
                    ></div>
                    <span className="text-xs text-white">Node Dipilih</span>
                  </div>
                </div>
              </div>
            )}

            <div className="border-t border-gray-600 pt-2 mt-3">
              <div className="font-medium mb-2 text-gray-400">
                Tipe Koneksi
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div
                    className="w-4 h-0.5 bg-gray-600"
                    style={{ borderTop: "1px dashed" }}
                  ></div>
                  <span className="text-xs text-white">Situs Sama</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-0.5 bg-amber-500"></div>
                  <span className="text-xs text-white">Transaksi</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-0.5 bg-blue-500"></div>
                  <span className="text-xs text-white">Terhubung</span>
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
              <p className="text-gray-300 mb-2">Tidak ada entitas ditemukan</p>
              <p className="text-sm text-gray-500 mb-4">
                Coba sesuaikan filter atau kriteria pencarian Anda
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
