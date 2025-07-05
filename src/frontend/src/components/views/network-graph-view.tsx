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

interface NetworkGraphViewProps {
  filters: Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  onEntitySelect: (entity: Entity) => void;
  selectedEntity: Entity | null;
}

interface NetworkNode extends d3.SimulationNodeDatum, Entity {}

interface NetworkEdge {
  from: string;
  to: string;
  strength: number;
  totalTransactions: number;
  totalAmount: number;
}

const mockNodes: NetworkNode[] = [
  // Bank Accounts
  {
    id: "1234567890123456",
    location: "Jakarta Pusat",
    name: "John Doe Account",
    accountHolder: "John Doe",
    type: "bank_account" as const,
    specificInformation: "BCA" as const,
    priorityScore: 85,
    connections: 8,
    lastActivity: "2024-01-15 14:30",
    createdAt: "2023-01-15",
    phoneNumber: "6281234567890",
    transactions: 247,
    totalAmount: 2450000000,
    linkedEntities: [],
    recentActivity: [
      {
        id: "act1",
        event: "High-risk transaction",
        time: "14:30",
        severity: "High Priority" as const,
      },
    ],
  },
  {
    id: "9876543210987654",
    location: "Surabaya",
    name: "Alice Brown Account",
    accountHolder: "Alice Brown",
    type: "bank_account" as const,
    specificInformation: "BNI" as const,
    priorityScore: 79,
    connections: 6,
    lastActivity: "2024-01-14 10:20",
    createdAt: "2023-02-20",
    phoneNumber: "6287654321098",
    transactions: 156,
    totalAmount: 1230000000,
    linkedEntities: [],
    recentActivity: [
      {
        id: "act2",
        event: "Multiple small transfers",
        time: "10:20",
        severity: "Medium Priority" as const,
      },
    ],
  },
  {
    id: "5432109876543210",
    location: "Bandung",
    name: "Charlie Davis Account",
    accountHolder: "Charlie Davis",
    type: "bank_account" as const,
    specificInformation: "BRI" as const,
    priorityScore: 63,
    connections: 4,
    lastActivity: "2024-01-13 16:45",
    createdAt: "2023-03-10",
    phoneNumber: "6285432109876",
    transactions: 89,
    totalAmount: 567000000,
    linkedEntities: [],
    recentActivity: [
      {
        id: "act3",
        event: "Account verification",
        time: "16:45",
        severity: "Low Priority" as const,
      },
    ],
  },
  {
    id: "1111222233334444",
    location: "Jakarta Selatan",
    name: "David Wilson Account",
    accountHolder: "David Wilson",
    type: "bank_account" as const,
    specificInformation: "Mandiri" as const,
    priorityScore: 92,
    connections: 12,
    lastActivity: "2024-01-15 18:15",
    createdAt: "2022-12-05",
    phoneNumber: "6281111222233",
    transactions: 523,
    totalAmount: 8950000000,
    linkedEntities: [],
    recentActivity: [
      {
        id: "act4",
        event: "Suspicious pattern detected",
        time: "18:15",
        severity: "High Priority" as const,
      },
    ],
  },
  {
    id: "5555666677778888",
    location: "Yogyakarta",
    name: "Eva Martinez Account",
    accountHolder: "Eva Martinez",
    type: "bank_account" as const,
    specificInformation: "BSI" as const,
    priorityScore: 71,
    connections: 5,
    lastActivity: "2024-01-12 09:30",
    createdAt: "2023-04-18",
    phoneNumber: "6285555666677",
    transactions: 134,
    totalAmount: 890000000,
    linkedEntities: [],
    recentActivity: [
      {
        id: "act5",
        event: "Regular transaction",
        time: "09:30",
        severity: "Medium Priority" as const,
      },
    ],
  },

  // E-Wallets
  {
    id: "0812345678901234",
    location: "Jakarta Barat",
    name: "Jane Smith OVO",
    accountHolder: "Jane Smith",
    type: "e_wallet" as const,
    specificInformation: "OVO" as const,
    priorityScore: 72,
    connections: 9,
    lastActivity: "2024-01-15 12:00",
    createdAt: "2023-01-20",
    phoneNumber: "6281234567890",
    transactions: 198,
    totalAmount: 340000000,
    linkedEntities: [],
    recentActivity: [
      {
        id: "act6",
        event: "E-wallet top up",
        time: "12:00",
        severity: "Medium Priority" as const,
      },
    ],
  },
  {
    id: "6281234567890123",
    location: "Medan",
    name: "Bob Wilson DANA",
    accountHolder: "Bob Wilson",
    type: "e_wallet" as const,
    specificInformation: "DANA" as const,
    priorityScore: 68,
    connections: 7,
    lastActivity: "2024-01-14 15:30",
    createdAt: "2023-02-15",
    phoneNumber: "6281234567890",
    transactions: 145,
    totalAmount: 278000000,
    linkedEntities: [],
    recentActivity: [
      {
        id: "act7",
        event: "Cross-platform transfer",
        time: "15:30",
        severity: "Medium Priority" as const,
      },
    ],
  },
  {
    id: "0898765432109876",
    location: "Jakarta Timur",
    name: "Sarah Johnson Gopay",
    accountHolder: "Sarah Johnson",
    type: "e_wallet" as const,
    specificInformation: "Gopay" as const,
    priorityScore: 89,
    connections: 11,
    lastActivity: "2024-01-15 20:45",
    createdAt: "2022-11-30",
    phoneNumber: "6289876543210",
    transactions: 412,
    totalAmount: 1560000000,
    linkedEntities: [],
    recentActivity: [
      {
        id: "act8",
        event: "High-frequency transactions",
        time: "20:45",
        severity: "High Priority" as const,
      },
    ],
  },
  {
    id: "0856789012345678",
    location: "Bali",
    name: "Michael Chen LinkAja",
    accountHolder: "Michael Chen",
    type: "e_wallet" as const,
    specificInformation: "LinkAja" as const,
    priorityScore: 58,
    connections: 3,
    lastActivity: "2024-01-11 11:20",
    createdAt: "2023-05-22",
    phoneNumber: "6285678901234",
    transactions: 67,
    totalAmount: 125000000,
    linkedEntities: [],
    recentActivity: [
      {
        id: "act9",
        event: "Normal usage pattern",
        time: "11:20",
        severity: "Low Priority" as const,
      },
    ],
  },

  // Phone Numbers
  {
    id: "6281234567890",
    location: "Jakarta Pusat",
    name: "John Doe Phone",
    accountHolder: "John Doe",
    type: "phone_number" as const,
    specificInformation: "Simpati" as const,
    priorityScore: 65,
    connections: 8,
    lastActivity: "2024-01-15 14:30",
    createdAt: "2023-01-10",
    phoneNumber: "6281234567890",
    transactions: 0,
    totalAmount: 0,
    linkedEntities: [],
    recentActivity: [
      {
        id: "act10",
        event: "Account registration",
        time: "14:30",
        severity: "Medium Priority" as const,
      },
    ],
  },
  {
    id: "6287654321098",
    location: "Surabaya",
    name: "Alice Brown Phone",
    accountHolder: "Alice Brown",
    type: "phone_number" as const,
    specificInformation: "XL" as const,
    priorityScore: 55,
    connections: 6,
    lastActivity: "2024-01-14 10:20",
    createdAt: "2023-02-18",
    phoneNumber: "6287654321098",
    transactions: 0,
    totalAmount: 0,
    linkedEntities: [],
    recentActivity: [
      {
        id: "act11",
        event: "Identity verification",
        time: "10:20",
        severity: "Low Priority" as const,
      },
    ],
  },
  {
    id: "6289876543210",
    location: "Jakarta Timur",
    name: "Sarah Johnson Phone",
    accountHolder: "Sarah Johnson",
    type: "phone_number" as const,
    specificInformation: "Simpati" as const,
    priorityScore: 78,
    connections: 9,
    lastActivity: "2024-01-15 20:45",
    createdAt: "2022-11-25",
    phoneNumber: "6289876543210",
    transactions: 0,
    totalAmount: 0,
    linkedEntities: [],
    recentActivity: [
      {
        id: "act12",
        event: "Multiple account links",
        time: "20:45",
        severity: "Medium Priority" as const,
      },
    ],
  },

  // QRIS
  {
    id: "MRC001234567890",
    location: "Jakarta Pusat",
    name: "ABC Store QRIS",
    accountHolder: "Merchant ABC Store",
    type: "qris" as const,
    specificInformation: "QRIS" as const,
    priorityScore: 91,
    connections: 15,
    lastActivity: "2024-01-15 19:30",
    createdAt: "2023-01-05",
    phoneNumber: "6281234567890",
    transactions: 1245,
    totalAmount: 3450000000,
    linkedEntities: [],
    recentActivity: [
      {
        id: "act13",
        event: "High-volume merchant activity",
        time: "19:30",
        severity: "High Priority" as const,
      },
    ],
  },
  {
    id: "MRC987654321098",
    location: "Bandung",
    name: "XYZ Restaurant QRIS",
    accountHolder: "XYZ Restaurant",
    type: "qris" as const,
    specificInformation: "QRIS" as const,
    priorityScore: 84,
    connections: 12,
    lastActivity: "2024-01-14 21:15",
    createdAt: "2023-03-15",
    phoneNumber: "6287654321098",
    transactions: 867,
    totalAmount: 2130000000,
    linkedEntities: [],
    recentActivity: [
      {
        id: "act14",
        event: "Regular merchant transactions",
        time: "21:15",
        severity: "Medium Priority" as const,
      },
    ],
  },
  {
    id: "MRC555666777888",
    location: "Surabaya",
    name: "Digital Mart QRIS",
    accountHolder: "Digital Mart",
    type: "qris" as const,
    specificInformation: "QRIS" as const,
    priorityScore: 76,
    connections: 8,
    lastActivity: "2024-01-13 17:45",
    createdAt: "2023-04-01",
    phoneNumber: "6285555666677",
    transactions: 543,
    totalAmount: 1780000000,
    linkedEntities: [],
    recentActivity: [
      {
        id: "act15",
        event: "Digital payment processing",
        time: "17:45",
        severity: "Medium Priority" as const,
      },
    ],
  },
];

const mockEdges: NetworkEdge[] = [
  // High-volume connections centered around the Mandiri account (suspicious hub)
  {
    from: "1111222233334444",
    to: "1234567890123456",
    strength: 0.9,
    totalTransactions: 147,
    totalAmount: 2850000000,
  },
  {
    from: "1111222233334444",
    to: "0812345678901234",
    strength: 0.8,
    totalTransactions: 89,
    totalAmount: 1650000000,
  },
  {
    from: "1111222233334444",
    to: "0898765432109876",
    strength: 0.9,
    totalTransactions: 203,
    totalAmount: 4200000000,
  },
  {
    from: "1111222233334444",
    to: "MRC001234567890",
    strength: 0.7,
    totalTransactions: 156,
    totalAmount: 890000000,
  },

  // Phone number connections (same person across platforms)
  {
    from: "6281234567890",
    to: "1234567890123456",
    strength: 1.0,
    totalTransactions: 1,
    totalAmount: 0,
  }, // Same owner
  {
    from: "6281234567890",
    to: "0812345678901234",
    strength: 1.0,
    totalTransactions: 1,
    totalAmount: 0,
  }, // Same owner
  {
    from: "6281234567890",
    to: "MRC001234567890",
    strength: 1.0,
    totalTransactions: 1,
    totalAmount: 0,
  }, // Same owner

  {
    from: "6287654321098",
    to: "9876543210987654",
    strength: 1.0,
    totalTransactions: 1,
    totalAmount: 0,
  }, // Same owner
  {
    from: "6289876543210",
    to: "0898765432109876",
    strength: 1.0,
    totalTransactions: 1,
    totalAmount: 0,
  }, // Same owner

  // Regular transaction patterns
  {
    from: "1234567890123456",
    to: "6281234567890123",
    strength: 0.6,
    totalTransactions: 45,
    totalAmount: 125000000,
  },
  {
    from: "0812345678901234",
    to: "MRC001234567890",
    strength: 0.7,
    totalTransactions: 78,
    totalAmount: 89000000,
  },
  {
    from: "0898765432109876",
    to: "MRC987654321098",
    strength: 0.8,
    totalTransactions: 134,
    totalAmount: 245000000,
  },

  // Cross-platform money transfers
  {
    from: "9876543210987654",
    to: "0898765432109876",
    strength: 0.5,
    totalTransactions: 23,
    totalAmount: 67000000,
  },
  {
    from: "5432109876543210",
    to: "6281234567890123",
    strength: 0.4,
    totalTransactions: 12,
    totalAmount: 34000000,
  },
  {
    from: "5555666677778888",
    to: "0856789012345678",
    strength: 0.3,
    totalTransactions: 8,
    totalAmount: 18000000,
  },

  // Merchant payments
  {
    from: "6281234567890123",
    to: "MRC555666777888",
    strength: 0.6,
    totalTransactions: 34,
    totalAmount: 45000000,
  },
  {
    from: "0898765432109876",
    to: "MRC555666777888",
    strength: 0.7,
    totalTransactions: 56,
    totalAmount: 78000000,
  },
  {
    from: "5432109876543210",
    to: "MRC987654321098",
    strength: 0.5,
    totalTransactions: 28,
    totalAmount: 52000000,
  },

  // Small frequent transactions (potential money laundering pattern)
  {
    from: "0856789012345678",
    to: "5555666677778888",
    strength: 0.8,
    totalTransactions: 387,
    totalAmount: 194000000,
  },
  {
    from: "6281234567890123",
    to: "5555666677778888",
    strength: 0.7,
    totalTransactions: 156,
    totalAmount: 89000000,
  },

  // Circular patterns (red flag)
  {
    from: "1234567890123456",
    to: "9876543210987654",
    strength: 0.4,
    totalTransactions: 15,
    totalAmount: 45000000,
  },
  {
    from: "9876543210987654",
    to: "5432109876543210",
    strength: 0.5,
    totalTransactions: 18,
    totalAmount: 52000000,
  },
  {
    from: "5432109876543210",
    to: "1234567890123456",
    strength: 0.3,
    totalTransactions: 9,
    totalAmount: 23000000,
  },
];

export function NetworkGraphView({
  onEntitySelect,
  selectedEntity,
}: NetworkGraphViewProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const simulationRef = useRef<d3.Simulation<NetworkNode, undefined> | null>(
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
    any, // eslint-disable-line @typescript-eslint/no-explicit-any
    SVGGElement,
    unknown
  > | null>(null);
  const [hoveredNode, setHoveredNode] = useState<NetworkNode | null>(null);
  const [hoveredEdge, setHoveredEdge] = useState<NetworkEdge | null>(null);

  // Main D3 setup effect - only runs once
  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    const width = 800;
    const height = 600;

    // Clear previous content
    svg.selectAll("*").remove();

    // Create zoom behavior
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });

    svg.call(zoom);

    // Create main group for zooming/panning
    const g = svg.append("g");

    // Prepare data for D3
    const nodeData = mockNodes.map((node) => ({ ...node }));
    const linkData = mockEdges.map((edge) => ({
      source: edge.from,
      target: edge.to,
      strength: edge.strength,
    }));

    // Create force simulation
    const simulation = d3
      .forceSimulation(nodeData)
      .force(
        "link",
        d3
          .forceLink(linkData)
          .id((d: any) => (d as NetworkNode).id) // eslint-disable-line @typescript-eslint/no-explicit-any
          .distance(100)
      )
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(50));

    // Create links
    const link = g
      .append("g")
      .selectAll("line")
      .data(linkData)
      .enter()
      .append("line")
      .attr("stroke", "#6b7280")
      .attr("stroke-opacity", 0.4)
      .attr("stroke-width", (d: any) => Math.max(1, d.strength * 3)) // eslint-disable-line @typescript-eslint/no-explicit-any
      .style("cursor", "pointer")
      .on("mouseover", function (_event, d: any) {
        // eslint-disable-line @typescript-eslint/no-explicit-any
        const edge = mockEdges.find(
          (e) =>
            (e.from === d.source.id && e.to === d.target.id) ||
            (e.from === d.target.id && e.to === d.source.id)
        );
        if (edge) setHoveredEdge(edge);

        // Highlight the edge
        d3.select(this)
          .attr("stroke-opacity", 0.8)
          .attr("stroke-width", Math.max(3, d.strength * 4));
      })
      .on("mouseout", function (_event, d: any) {
        // eslint-disable-line @typescript-eslint/no-explicit-any
        setHoveredEdge(null);

        // Reset edge appearance
        d3.select(this)
          .attr("stroke-opacity", 0.4)
          .attr("stroke-width", Math.max(1, d.strength * 3));
      });

    // Create nodes
    const node = g
      .append("g")
      .selectAll("g")
      .data(nodeData)
      .enter()
      .append("g")
      .attr("class", "node")
      .style("cursor", "pointer")
      .call(
        d3
          .drag<SVGGElement, any>() // eslint-disable-line @typescript-eslint/no-explicit-any
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
      .attr("r", (d: NetworkNode) => getNodeSize(d.connections))
      .attr("fill", (d: NetworkNode) =>
        getBankColor(d.specificInformation as string, d.type)
      )
      .attr("stroke", "#ffffff")
      .attr("stroke-width", 2)
      .on("mouseover", (_event, d: NetworkNode) => setHoveredNode(d))
      .on("mouseout", () => setHoveredNode(null))
      .on("click", (_event, d: NetworkNode) => {
        onEntitySelect(d);
      });

    nodesRef.current = nodeCircles;
    linksRef.current = link;
    simulationRef.current = simulation;

    node
      .append("text")
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "middle")
      .attr("font-size", "10")
      .attr("font-weight", "bold")
      .attr("fill", "white")
      .attr("pointer-events", "none")
      .text((d: NetworkNode) => d.specificInformation as string);

    // Add priority indicator
    node
      .append("circle")
      .attr("r", 6)
      .attr("cx", (d: NetworkNode) => getNodeSize(d.connections) - 8)
      .attr("cy", (d: NetworkNode) => -getNodeSize(d.connections) + 8)
      .attr("fill", (d: NetworkNode) => getNodeColor(d.priorityScore))
      .attr("stroke", "#ffffff")
      .attr("stroke-width", 1)
      .attr("pointer-events", "none");

    // Update positions on simulation tick
    simulation.on("tick", () => {
      link
        .attr("x1", (d: any) => d.source.x) // eslint-disable-line @typescript-eslint/no-explicit-any
        .attr("y1", (d: any) => d.source.y) // eslint-disable-line @typescript-eslint/no-explicit-any
        .attr("x2", (d: any) => d.target.x) // eslint-disable-line @typescript-eslint/no-explicit-any
        .attr("y2", (d: any) => d.target.y); // eslint-disable-line @typescript-eslint/no-explicit-any

      node.attr("transform", (d: any) => `translate(${d.x},${d.y})`); // eslint-disable-line @typescript-eslint/no-explicit-any
    });

    // Cleanup
    return () => {
      simulation.stop();
    };
  }, [onEntitySelect]); // Remove selectedEntity from dependencies

  // Separate effect for updating selected node styling
  useEffect(() => {
    if (!nodesRef.current || !linksRef.current) return;

    // Update node styling
    nodesRef.current
      .attr(
        "stroke",
        (
          d: any // eslint-disable-line @typescript-eslint/no-explicit-any
        ) => (selectedEntity?.id === d.id ? "#dc2626" : "#ffffff")
      )
      .attr(
        "stroke-width",
        (
          d: any // eslint-disable-line @typescript-eslint/no-explicit-any
        ) => (selectedEntity?.id === d.id ? 4 : 2)
      );

    // Update edge styling based on selected node
    linksRef.current
      .attr("stroke", (d: any) => {
        // eslint-disable-line @typescript-eslint/no-explicit-any
        if (!selectedEntity) return "#FFFF";

        const sourceId = d.source.id || d.source;
        const targetId = d.target.id || d.target;

        if (sourceId === selectedEntity.id) {
          return "#dc2626"; // Red for outgoing transactions
        } else if (targetId === selectedEntity.id) {
          return "#16a34a"; // Green for incoming transactions
        }

        return "#FFFF"; // Default gray
      })
      .attr("stroke-opacity", (d: any) => {
        // eslint-disable-line @typescript-eslint/no-explicit-any
        if (!selectedEntity) return 0.4;

        const sourceId = d.source.id || d.source;
        const targetId = d.target.id || d.target;

        if (sourceId === selectedEntity.id || targetId === selectedEntity.id) {
          return 0.8; // Highlight connected edges
        }

        return 0.2; // Dim unconnected edges
      });
  }, [selectedEntity]);

  const getNodeColor = (priorityScore: number) => {
    if (priorityScore >= 80) return "#dc2626"; // red-600
    if (priorityScore >= 60) return "#ea580c"; // orange-600
    return "#16a34a"; // green-600
  };

  const getNodeSize = (connections: number) => {
    return Math.max(25, Math.min(45, connections * 2));
  };

  const getBankColor = (specificInfo: string, type: string) => {
    // Bank accounts
    if (type === "bank_account") {
      const bankColors: { [key: string]: string } = {
        BCA: "#1e3a8a", // blue-800
        BNI: "#ea580c", // orange-600
        BRI: "#0369a1", // sky-700
        Mandiri: "#facc15", // yellow-400
        BSI: "#16a34a", // green-600
      };
      return bankColors[specificInfo] || "#374151"; // gray-700 as default
    }

    // E-wallets
    if (type === "e_wallet") {
      const ewalletColors: { [key: string]: string } = {
        OVO: "#7c3aed", // violet-600
        DANA: "#0ea5e9", // sky-500
        Gopay: "#16a34a", // green-600
        LinkAja: "#dc2626", // red-600
      };
      return ewalletColors[specificInfo] || "#6b7280"; // gray-500 as default
    }

    // Phone numbers
    if (type === "phone_number") {
      const phoneColors: { [key: string]: string } = {
        Simpati: "#dc2626", // red-600
        XL: "#2563eb", // blue-600
      };
      return phoneColors[specificInfo] || "#8b5cf6"; // violet-500 as default
    }

    // QRIS
    if (type === "qris") {
      return "#f59e0b"; // amber-500
    }

    return "#6b7280"; // gray-500 as fallback
  };

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
              className="text-gray-400 hover:text-white hover:bg-gray-800"
              
            >
              <RefreshCw className="h-4 w-4" />
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
                  {mockNodes.length}
                </span>
              </div>
              <div>
                <span className="text-gray-400">Edges:</span>
                <span className="font-medium text-white ml-2">
                  {mockEdges.length}
                </span>
              </div>
            </div>
          </div>
        </Card>
      </div>

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
              className="absolute pointer-events-none z-20 bg-black/95 border border-gray-600 text-white p-3 rounded text-sm backdrop-blur"
              style={{
                left: hoveredNode.x,
                top: hoveredNode.y,
              }}
            >
              <div className="font-bold text-gray-300">
                {hoveredNode.specificInformation}
              </div>
              <div className="font-mono">{hoveredNode.id}</div>
              <div className="text-gray-400">
                Type: {hoveredNode.type.replace("_", " ")}
              </div>
              <div className="text-gray-400">
                Priority Score: {hoveredNode.priorityScore}
              </div>
              <div className="text-gray-400">
                Connections: {hoveredNode.connections}
              </div>
              <div className="text-gray-400">
                Holder: {hoveredNode.accountHolder}
              </div>
              <div className="text-gray-400">
                Location: {hoveredNode.location}
              </div>
              <div className="text-gray-400">
                Transactions: {hoveredNode.transactions.toLocaleString()}
              </div>
              <div className="text-gray-400">
                Total Amount: Rp {hoveredNode.totalAmount.toLocaleString()}
              </div>
            </div>
          )}

        {/* Hover tooltip for edges */}
        {hoveredEdge && (
          <div
            className="absolute pointer-events-none z-20 bg-black/95 border border-gray-600 text-white p-3 rounded text-sm backdrop-blur"
            style={{
              left: "50%",
              top: "50%",
              transform: "translate(-50%, -50%)",
            }}
          >
            <div className="font-bold text-gray-300 mb-2">
              Transaction Details
            </div>
            <div className="text-gray-400">From: {hoveredEdge.from}</div>
            <div className="text-gray-400">To: {hoveredEdge.to}</div>
            <div className="text-gray-400">
              Total Transactions:{" "}
              {hoveredEdge.totalTransactions.toLocaleString()}
            </div>
            <div className="text-gray-400">
              Total Amount: Rp {hoveredEdge.totalAmount.toLocaleString()}
            </div>
            <div className="text-gray-400">
              Strength: {(hoveredEdge.strength * 100).toFixed(0)}%
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 right-4 z-10">
        <Card className="p-3 bg-black/90 border-gray-700 backdrop-blur">
          <div className="text-sm space-y-3">
            <div className="font-medium mb-2 text-gray-400">
              Priority Levels
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-600"></div>
              <span className="text-xs text-white">High Priority (80+)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-orange-600"></div>
              <span className="text-xs text-white">
                Medium Priority (60-79)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-600"></div>
              <span className="text-xs text-white">Low Priority (&lt;60)</span>
            </div>

            <div className="border-t border-gray-600 pt-2 mt-3">
              <div className="font-medium mb-2 text-gray-400">
                Transaction Flow (when node selected)
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-0.5 bg-red-600"></div>
                <span className="text-xs text-white">Outgoing</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-0.5 bg-green-600"></div>
                <span className="text-xs text-white">Incoming</span>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Empty state when no data */}
      {mockNodes.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <Network className="h-12 w-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-300">No network data available</p>
            <p className="text-sm text-gray-500 mt-2">
              Apply filters or search for entities to visualize connections
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
