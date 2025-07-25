// src/frontend/src/pages/network-dashboard-page.tsx - Corrected version
"use client";

import { useState } from "react";
import { LeftSidebar } from "@/components/bars/left-sidebar";
import { RightSidebar } from "@/components/bars/right-sidebar";
import { MainView } from "@/components/views/main-views";
import { TopBar } from "@/components/bars/top-bar";
import { type GraphFilters } from "@/lib/api/graph-api";
import type { Entity } from "@/lib/types/entity";

export function NetworkDashboard() {
  const [currentView, setCurrentView] = useState<"network" | "geospatial">(
    "network"
  );
  const [selectedEntity, setSelectedEntity] = useState<Entity | null>(null);
  const [leftSidebarCollapsed, setLeftSidebarCollapsed] = useState(false);
  const [rightSidebarCollapsed, setRightSidebarCollapsed] = useState(false);

  // Backend-compatible filters
  const [filters, setFilters] = useState<GraphFilters>({
    entity_types: [],
    banks: [],
    e_wallets: [],
    cryptocurrencies: [],
    phone_providers: [],
    priority_score_min: undefined,
    priority_score_max: undefined,
    search_query: undefined,
  });

  // Handle entity selection
  const handleEntitySelect = (entity: Entity) => {
    setSelectedEntity(entity);
  };

  // Handle data refresh - this will trigger refetch in NetworkGraphView
  const handleRefreshData = () => {
    // This function will be passed down to components that need to refresh data
    console.log("Refreshing graph data...");
  };

  // Convert backend filters to legacy format for backward compatibility with MainView
  const legacyFilters = {
    priorityLevel:
      filters.priority_score_min !== undefined ||
      filters.priority_score_max !== undefined
        ? "custom"
        : "all",
    entityType: (filters.entity_types?.[0] as any) || "all",
    timeRange: "30d" as const, // Default since backend doesn't have time-based filtering yet
    searchQuery: filters.search_query || "",
  };

  return (
    <div className="h-screen flex flex-col bg-black">
      <TopBar currentView={currentView} onViewChange={setCurrentView} />

      <div className="flex-1 relative overflow-hidden">
        <MainView
          currentView={currentView}
          filters={legacyFilters}
          onEntitySelect={handleEntitySelect}
          selectedEntity={selectedEntity}
          // Pass backend filters to the NetworkGraphView
          backendFilters={filters}
          onRefreshData={handleRefreshData}
        />

        <LeftSidebar
          selectedEntity={selectedEntity}
          currentView={currentView}
          collapsed={leftSidebarCollapsed}
          onToggleCollapse={() =>
            setLeftSidebarCollapsed(!leftSidebarCollapsed)
          }
          onEntitySelect={handleEntitySelect}
        />

        <RightSidebar
          filters={filters}
          onFiltersChange={setFilters}
          selectedEntity={selectedEntity}
          collapsed={rightSidebarCollapsed}
          onToggleCollapse={() =>
            setRightSidebarCollapsed(!rightSidebarCollapsed)
          }
          onRefreshData={handleRefreshData}
        />
      </div>
    </div>
  );
}
