"use client";
import { NetworkGraphView } from "./network-graph-view";
import { GeospatialMapView } from "./geospatial-map-view";
import type { NetworkData } from "./network-graph-view";
import type { Entity } from "@/lib/types/entity";

interface MainViewProps {
  currentView: "network" | "geospatial";
  networkData?: NetworkData;
  onEntitySelect: (entity: Entity) => void;
  selectedEntity: Entity | null;
}

export function MainView({
  currentView,
  networkData,
  onEntitySelect,
  selectedEntity,
}: MainViewProps) {
  return (
    <div className="flex-1 relative">
      {currentView === "network" ? (
        <NetworkGraphView
          networkData={networkData}
          onEntitySelect={onEntitySelect}
          selectedEntity={selectedEntity}
        />
      ) : (
        <GeospatialMapView />
      )}
    </div>
  );
}
