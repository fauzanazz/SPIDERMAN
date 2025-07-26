// src/frontend/src/components/views/main-views.tsx - Updated for selection mode support
"use client";

import type { Entity } from "@/lib/types/entity";
import type { GraphFilters } from "@/lib/api/graph-api";
import { GeospatialMapView } from "./geospatial-map-view";
import { NetworkGraphView } from "./network-graph-view";

interface MainViewProps {
  currentView: "network" | "geospatial";
  // Legacy filters for backward compatibility
  filters: {
    searchQuery: string;
    priorityLevel: "all" | "high" | "medium" | "low" | "custom";
    entityType:
      | "bank_account"
      | "e_wallet"
      | "all"
      | "phone_number"
      | "qris"
      | "crypto_wallet";
    timeRange: "7d" | "30d" | "90d" | "1y";
  };
  // New backend filters
  backendFilters?: GraphFilters;
  onEntitySelect: (entity: Entity | null) => void;
  selectedEntity: Entity | null;
  onRefreshData?: () => void;
  // New props for selection mode
  currentMode?: "default" | "selection";
  selectedEntities?: Entity[];
  onEntitiesSelect?: (entities: Entity[]) => void;
  onFiltersChange?: (filters: GraphFilters) => void;
  onAppendEntity: (entity: Entity) => void;
  onRemoveEntity: (entity: Entity) => void;
}

export function MainView({
  currentView,
  filters,
  backendFilters,
  onEntitySelect,
  selectedEntity,
  onRefreshData,
  currentMode = "default",
  selectedEntities = [],
  onFiltersChange = () => {},
  onAppendEntity,
  onRemoveEntity,
}: MainViewProps) {
  // Use backend filters if available, otherwise convert legacy filters
  const activeFilters: GraphFilters = backendFilters || {
    entity_types: filters.entityType !== "all" ? [filters.entityType] : [],
    banks: [],
    e_wallets: [],
    cryptocurrencies: [],
    phone_providers: [],
    priority_score_min: undefined,
    priority_score_max: undefined,
    search_query: filters.searchQuery || undefined,
  };

  return (
    <div className="flex-1 relative bg-white w-full h-full">
      {currentView === "network" ? (
        <NetworkGraphView
          filters={activeFilters}
          onEntitySelect={onEntitySelect}
          selectedEntity={selectedEntity}
          onRefreshData={onRefreshData}
          onFiltersChange={onFiltersChange}
          currentMode={currentMode}
          selectedEntities={selectedEntities}
          onAppendEntity={onAppendEntity}
          onRemoveEntity={onRemoveEntity}
        />
      ) : (
        <GeospatialMapView />
      )}
    </div>
  );
}
