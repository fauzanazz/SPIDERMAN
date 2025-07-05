"use client";

import type { Entity } from "@/lib/types/entity";
import { GeospatialMapView } from "./geospatial-map-view";
import { NetworkGraphView } from "./network-graph-view";

interface MainViewProps {
  currentView: "network" | "geospatial";
  filters: {
    searchQuery: string;
    priorityLevel: "all" | "high" | "medium" | "low";
    entityType: "bank_account" | "e-wallet" | "all" | "phone_number" | "QRIS";
    timeRange: "7d" | "30d" | "90d" | "1y";
  };
  onEntitySelect: (entity: Entity) => void;
  selectedEntity: Entity | null;
}

export function MainView({
  currentView,
  filters,
  onEntitySelect,
  selectedEntity,
}: MainViewProps) {
  return (
    <div className="flex-1 relative bg-white w-full h-full">
      {currentView === "network" ? (
        <NetworkGraphView
          filters={filters}
          onEntitySelect={onEntitySelect}
          selectedEntity={selectedEntity}
        />
      ) : (
        <GeospatialMapView
          filters={filters}
          onEntitySelect={onEntitySelect}
          selectedEntity={selectedEntity}
        />
      )}
    </div>
  );
}
