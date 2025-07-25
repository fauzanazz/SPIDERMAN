// src/frontend/src/components/views/main-views.tsx - Updated for backend integration
"use client";

import type { Entity } from "@/lib/types/entity";
import type { GraphFilters } from "@/lib/api/graph-api";
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
  onEntitySelect: (entity: Entity) => void;
  selectedEntity: Entity | null;
  onRefreshData?: () => void;
  centerNodeId?: string;
  onReturnToFullGraph?: () => void;
}

export function MainView({
  currentView,
  filters,
  backendFilters,
  onEntitySelect,
  selectedEntity,
  onRefreshData,
  centerNodeId,
  onReturnToFullGraph,
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
          centerNodeId={centerNodeId}
          onReturnToFullGraph={onReturnToFullGraph}
        />
      ) : (
        <></>
      )}
    </div>
  );
}
