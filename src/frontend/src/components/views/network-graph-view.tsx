// src/frontend/src/components/views/network-graph-view.tsx - Updated with flying search bar
"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
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
import { debounce } from "@/lib/utils/debounce";

interface NetworkGraphViewProps {
  filters: GraphFilters;
  onEntitySelect: (entity: Entity | null) => void;
  selectedEntity: Entity | null;
  onRefreshData?: () => void;
  onFiltersChange: (filters: GraphFilters) => void;
  currentMode: "default" | "selection";
  selectedEntities: Entity[];
  onAppendEntity: (entity: Entity) => void;
  onRemoveEntity: (entity: Entity) => void;
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
  onAppendEntity,
  onRemoveEntity,
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

  const graphInitializedRef = useRef(false);
  const previousDataRef = useRef<string>("");
  const previousModeRef = useRef<string>(currentMode);
  const [hoveredNode, setHoveredNode] = useState<NetworkNode | null>(null);
  const [networkStats, setNetworkStats] = useState({
    nodes: 0,
    edges: 0,
    clusters: 0,
  });
  const [searchInput, setSearchInput] = useState(filters.search_query || "");

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

  // Helper function to get node size
  const getNodeSize = useCallback((connections: number) => {
    return Math.max(30, Math.min(50, connections * 3 + 30)); // Increased size for logo visibility
  }, []);

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

          // Add website information to the entity
          entity.websites = [cluster.website_name];
          entity.additional_info = {
            ...entity.additional_info,
            cluster: cluster.website_name,
            gambling_sites: [cluster.website_name],
          };

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

        // Standalone entities don't have websites
        entity.websites = [];
        entity.additional_info = {
          ...entity.additional_info,
          cluster: "standalone",
        };

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
      // Filter edges to only show transactions connected to selected entity (if any)
      const connectedNodeIds = new Set<string>();

      // First pass: collect all node IDs that are connected to the selected entity
      if (selectedEntity && currentMode === "default") {
        connectedNodeIds.add(selectedEntity.id); // Include the selected entity itself

        graphData.transactions?.forEach((transaction) => {
          if (transaction.from_node === selectedEntity.id) {
            connectedNodeIds.add(transaction.to_node);
          }
          if (transaction.to_node === selectedEntity.id) {
            connectedNodeIds.add(transaction.from_node);
          }
        });
      }

      graphData.transactions?.forEach((transaction) => {
        const sourceNode = nodeMap.get(transaction.from_node);
        const targetNode = nodeMap.get(transaction.to_node);

        if (sourceNode && targetNode) {
          // If there's a selected entity (in default mode), only show edges connected to it
          if (selectedEntity && currentMode === "default") {
            // Only show transactions where the selected entity is either source or target
            if (
              transaction.from_node === selectedEntity.id ||
              transaction.to_node === selectedEntity.id
            ) {
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
          } else {
            // No entity selected or in selection mode - show all transactions
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
        }
      });

      // Filter nodes to only show connected ones when an entity is selected
      let filteredNodes = nodes;
      if (
        selectedEntity &&
        currentMode === "default" &&
        connectedNodeIds.size > 1
      ) {
        filteredNodes = nodes.filter((node) => connectedNodeIds.has(node.id));
      }

      return { nodes: filteredNodes, edges };
    },
    [isNodeSelected, selectedEntity, currentMode]
  );

  const networkData = useMemo(() => {
    if (!graphData || isLoading) return null;
    return convertToNetworkData(graphData);
  }, [graphData, isLoading, convertToNetworkData]);

  const shouldRecreateGraph = useMemo(() => {
    if (!networkData) return false;

    const currentDataString = JSON.stringify({
      nodes: networkData.nodes.map((n) => n.id),
      links: networkData.edges.map((l) => ({
        source: typeof l.source === "object" ? l.source.id : l.source,
        target: typeof l.target === "object" ? l.target.id : l.target,
        type: l.type,
      })),
      selectedEntityId: selectedEntity?.id, // Include selected entity in comparison
    });

    const dataChanged = currentDataString !== previousDataRef.current;
    const modeChanged = currentMode !== previousModeRef.current;

    if (dataChanged || modeChanged || !graphInitializedRef.current) {
      previousDataRef.current = currentDataString;
      previousModeRef.current = currentMode;
      return true;
    }

    return false;
  }, [networkData, currentMode, selectedEntity?.id]);

  // Handle search submit
  const handleSearchSubmit = () => {
    onFiltersChange({
      ...filters,
      search_query: searchInput.trim() || undefined,
    });
  };

  // Handle node selection in different modes
  // Option 1: Remove useCallback entirely (simplest solution)
  // Just use a regular function - it will be recreated on each render but that's often fine
  const selectedEntityIds = useMemo(
    () => selectedEntities.map((e) => e.id),
    [selectedEntities]
  );

  const handleNodeClick = useCallback(
    (_event: MouseEvent, node: NetworkNode) => {
      console.log("Node clicked:", {
        mode: currentMode,
        clickedNode: node.entity.id,
        currentlySelected: selectedEntityIds,
        selectedEntity: selectedEntity?.id,
      });

      if (currentMode === "selection") {
        // Selection mode: add/remove from selected entities
        const isSelected = selectedEntityIds.includes(node.entity.id);
        console.log("Selection mode click:", {
          nodeId: node.entity.id,
          isSelected,
          selectedCount: selectedEntityIds.length,
        });

        if (isSelected) {
          onRemoveEntity(node.entity);
        } else {
          onAppendEntity(node.entity);
        }
      } else {
        // Default mode: select single entity or clear if same entity clicked
        if (selectedEntity?.id === node.entity.id) {
          // Clear selection if clicking the same entity
          onEntitySelect(null);
        } else {
          // Select new entity
          onEntitySelect(node.entity);
        }
      }
    },
    [
      currentMode,
      selectedEntityIds,
      selectedEntity,
      onAppendEntity,
      onRemoveEntity,
      onEntitySelect,
    ]
  );

  // Convert backend data to D3 network format

  // Handle refresh
  const handleRefresh = () => {
    refetch();
    onRefreshData?.();
  };

  // D3 visualization setup
  useEffect(() => {
    if (!svgRef.current || !networkData || !shouldRecreateGraph) return;
    const svg = d3.select(svgRef.current);
    const width = 800;
    const height = 600;

    graphInitializedRef.current = true;

    // Clear previous content
    svg.selectAll("*").remove();

    const { nodes, edges } = networkData;

    // Update stats
    setNetworkStats({
      nodes: nodes.length,
      edges: edges.length,
      clusters: graphData?.clusters?.length || 0,
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

    // Create defs for patterns (logos) and animations
    const defs = svg.append("defs");

    // Add CSS animation for pulse effect
    defs.append("style").text(`
      @keyframes pulse {
        0% { stroke-opacity: 1; }
        50% { stroke-opacity: 0.3; }
        100% { stroke-opacity: 1; }
      }
      .pulse-animation {
        animation: pulse 2s infinite;
      }
    `);

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
            console.log("Logo failed to load:", logoUrl);
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
            // Increase distances significantly for better spacing
            const baseDistance =
              selectedEntity && currentMode === "default" ? 150 : 100;
            switch (d.type) {
              case "transfer":
                return baseDistance + 50; // Longer distance for transfer edges
              case "same_site":
                return baseDistance - 20; // Keep same-site nodes closer but still spaced
              case "transaction":
                return baseDistance + 80;
              case "connected":
                return baseDistance + 30;
              default:
                return baseDistance;
            }
          })
          .strength((d: NetworkEdge) => d.strength * 0.2) // Reduced link strength for more spacing
      )
      .force("charge", d3.forceManyBody().strength(-300)) // Increased repulsion for more spacing
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(50)) // Increased collision radius for more spacing
      .force("cluster", function () {
        // Adjusted cluster force for filtered nodes
        const strength =
          selectedEntity && currentMode === "default" ? 0.3 : 0.8; // Weaker clustering when filtering
        return function (alpha: number) {
          nodes.forEach((node) => {
            const clusterName = node.cluster || "standalone";
            const center = clusterCenters.get(clusterName);

            if (center) {
              const dx = center.x - (node.x || 0);
              const dy = center.y - (node.y || 0);

              // Apply cluster cohesion force
              const force = strength * alpha * 0.1;
              node.vx = (node.vx || 0) + dx * force;
              node.vy = (node.vy || 0) + dy * force;
            }
          });
        };
      })
      .force("separate-clusters", function () {
        // Additional force to keep clusters separated with increased distance
        const strength = 3.0; // Increased strength for better separation
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
              const minDistance = 250; // Increased minimum distance between cluster centers

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

    // Add radial force for filtered view to organize nodes around selected entity
    if (selectedEntity && currentMode === "default") {
      simulation.force("radial", function () {
        return function (alpha: number) {
          const centerX = width / 2;
          const centerY = height / 2;
          const radius = 200; // Base radius for connected nodes

          nodes.forEach((node, i) => {
            if (node.entity.id === selectedEntity.id) {
              // Keep selected entity at center
              const dx = centerX - (node.x || 0);
              const dy = centerY - (node.y || 0);
              node.vx = (node.vx || 0) + dx * alpha * 0.3;
              node.vy = (node.vy || 0) + dy * alpha * 0.3;
            } else {
              // Arrange other nodes in a circle around the selected entity
              const angle = (i * 2 * Math.PI) / (nodes.length - 1);
              const targetX = centerX + Math.cos(angle) * radius;
              const targetY = centerY + Math.sin(angle) * radius;

              const dx = targetX - (node.x || 0);
              const dy = targetY - (node.y || 0);
              node.vx = (node.vx || 0) + dx * alpha * 0.1;
              node.vy = (node.vy || 0) + dy * alpha * 0.1;
            }
          });
        };
      });
    }

    // Create links
    const link = g
      .append("g")
      .selectAll("line")
      .data(edges)
      .enter()
      .append("line")
      .attr("stroke", (d: NetworkEdge) => {
        // If an entity is selected, highlight edges connected to it with directional colors
        if (selectedEntity && currentMode === "default") {
          const sourceId =
            typeof d.source === "string" ? d.source : d.source.id;
          const targetId =
            typeof d.target === "string" ? d.target : d.target.id;

          // Red for both incoming and outgoing edges from/to the selected entity
          if (
            sourceId === selectedEntity.id ||
            targetId === selectedEntity.id
          ) {
            return "#dc2626"; // Red for edges connected to selected entity
          }
        }

        // Default colors
        switch (d.type) {
          case "same_site":
            return "#6b7280";
          case "transaction":
          case "transfer":
            return "#f59e0b";
          case "connected":
            return "#3b82f6";
          default:
            return "#6b7280";
        }
      })
      .attr("stroke-opacity", (d: NetworkEdge) => {
        // If an entity is selected, make connected edges more prominent
        if (selectedEntity && currentMode === "default") {
          const sourceId =
            typeof d.source === "string" ? d.source : d.source.id;
          const targetId =
            typeof d.target === "string" ? d.target : d.target.id;

          const isConnectedToSelected =
            sourceId === selectedEntity.id || targetId === selectedEntity.id;
          return isConnectedToSelected ? 0.9 : 0.3; // Higher opacity for connected edges
        }
        return 0.6; // Default opacity
      })
      .attr("stroke-width", (d: NetworkEdge) => {
        // If an entity is selected, make connected edges thicker
        if (selectedEntity && currentMode === "default") {
          const sourceId =
            typeof d.source === "string" ? d.source : d.source.id;
          const targetId =
            typeof d.target === "string" ? d.target : d.target.id;

          const isConnectedToSelected =
            sourceId === selectedEntity.id || targetId === selectedEntity.id;
          return isConnectedToSelected
            ? Math.max(3, d.strength * 5)
            : Math.max(1, d.strength * 2);
        }
        return Math.max(1, d.strength * 3); // Default width
      })
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

    // Selection borders will be handled by the separate useEffect
    // to allow dynamic addition/removal based on mode changes

    // Add highlight for selected entity in default mode
    if (currentMode === "default" && selectedEntity) {
      node
        .append("circle")
        .attr("class", (d: NetworkNode) =>
          d.entity.id === selectedEntity.id
            ? "selected-entity-highlight pulse-animation"
            : "selected-entity-highlight"
        )
        .attr("r", (d: NetworkNode) => getNodeSize(d.entity.connections) + 12)
        .attr("fill", "none")
        .attr("stroke", (d: NetworkNode) =>
          d.entity.id === selectedEntity.id ? "#10b981" : "transparent"
        )
        .attr("stroke-width", 4)
        .attr("stroke-dasharray", "8,4")
        .attr("pointer-events", "none")
        .style("opacity", (d: NetworkNode) =>
          d.entity.id === selectedEntity.id ? 1.0 : 0
        );
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
    shouldRecreateGraph,
    networkData,
    handleNodeClick,
    isNodeSelected,
    currentMode,
    selectedEntity,
    graphData?.clusters?.length,
    getNodeSize,
  ]);

  // Separate effect to update selection visuals without recreating the graph
  useEffect(() => {
    if (!svgRef.current) return;

    // For selection mode, we need to ensure selection borders exist and are updated
    if (currentMode === "selection") {
      // Get all node groups
      const nodeGroups = d3.select(svgRef.current).selectAll("g.node");

      // Remove any existing selection borders first
      nodeGroups.selectAll(".selection-border").remove();

      // Add selection borders for all nodes
      nodeGroups
        .append("circle")
        .attr("class", "selection-border")
        .attr("r", (d) => {
          const node = d as NetworkNode;
          return getNodeSize(node.entity.connections) + 8;
        })
        .attr("fill", "none")
        .attr("stroke", (d) => {
          const node = d as NetworkNode;
          const isSelected = selectedEntities.some(
            (e) => e.id === node.entity.id
          );

          return isSelected ? "#10b981" : "transparent";
        })
        .attr("stroke-width", 3)
        .attr("stroke-dasharray", "5,5")
        .attr("pointer-events", "none")
        .style("opacity", (d) => {
          const node = d as NetworkNode;
          const isSelected = selectedEntities.some(
            (e) => e.id === node.entity.id
          );
          return isSelected ? 0.8 : 0;
        });
    } else {
      // Remove selection borders if not in selection mode
      const nodeGroups = d3.select(svgRef.current).selectAll("g.node");
      nodeGroups.selectAll(".selection-border").remove();
    }
  }, [selectedEntities, selectedEntity, currentMode, getNodeSize]);

  useEffect(() => {
    const handleResize = debounce(() => {
      if (!svgRef.current || !simulationRef.current) return;

      const { width, height } = svgRef.current.getBoundingClientRect();

      // Update simulation center without restarting
      simulationRef.current
        .force("center", d3.forceCenter(width / 2, height / 2))
        .alpha(0.3) // Gentle restart
        .restart();
    }, 300);

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

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
                  Transaksi: {hoveredNode.entity.transactions.toLocaleString()}
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
              <div className="font-medium mb-2 text-gray-400">Tipe Koneksi</div>
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
                <div className="flex items-center gap-2">
                  <div className="w-4 h-0.5 bg-red-600"></div>
                  <span className="text-xs text-white">
                    Terpilih (Masuk/Keluar)
                  </span>
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
