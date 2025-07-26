// src/frontend/src/pages/network-dashboard-page.tsx - Updated with selection mode and batch reporting
"use client";

import { useState, useEffect, useCallback } from "react";
import { LeftSidebar } from "@/components/bars/left-sidebar";
import { RightSidebar } from "@/components/bars/right-sidebar";
import { MainView } from "@/components/views/main-views";
import { TopBar } from "@/components/bars/top-bar";
import { type GraphFilters } from "@/lib/api/graph-api";
import type { Entity } from "@/lib/types/entity";
import { filtersToUrlParams, urlParamsToFilters } from "@/lib/utils/url-params";
import { useBatchReport } from "@/lib/api/report-api";

export function NetworkDashboard() {
  const [currentView, setCurrentView] = useState<"network" | "geospatial">(
    "network"
  );
  const [selectedEntity, setSelectedEntity] = useState<Entity | null>(null);
  const [leftSidebarCollapsed, setLeftSidebarCollapsed] = useState(false);
  const [rightSidebarCollapsed, setRightSidebarCollapsed] = useState(false);

  // New state for selection mode and batch reporting
  const [currentMode, setCurrentMode] = useState<"default" | "selection">(
    "default"
  );
  const [selectedEntities, setSelectedEntities] = useState<Entity[]>([]);

  // React Query hook for batch report generation
  const batchReportQuery = useBatchReport(selectedEntities);

  // Initialize filters from URL parameters
  const [initialFilters] = useState<GraphFilters>(() => {
    // Only access window on client side
    if (typeof window !== "undefined") {
      const searchParams = new URLSearchParams(window.location.search);
      return urlParamsToFilters(searchParams);
    }
    return {
      entity_types: [],
      banks: [],
      e_wallets: [],
      cryptocurrencies: [],
      phone_providers: [],
      priority_score_min: undefined,
      priority_score_max: undefined,
      search_query: undefined,
    };
  });

  // Backend-compatible filters
  const [filters, setFilters] = useState<GraphFilters>(initialFilters);

  // Draft filters for URL parameter management
  const [draftFilters, setDraftFilters] =
    useState<GraphFilters>(initialFilters);

  // Update URL when filters change
  useEffect(() => {
    // Only update URL on client side
    if (typeof window !== "undefined") {
      const params = filtersToUrlParams(filters);
      const newUrl = params.toString()
        ? `${window.location.pathname}?${params.toString()}`
        : window.location.pathname;

      // Only update URL if it's different from current URL
      const currentSearch = window.location.search.replace("?", "");
      const newSearch = params.toString();

      if (currentSearch !== newSearch) {
        window.history.replaceState({}, "", newUrl);
      }
    }
  }, [filters]);

  // Handle filter changes with URL synchronization
  const handleFiltersChange = (newFilters: GraphFilters) => {
    setFilters(newFilters);
    setDraftFilters(newFilters); // Keep draft filters in sync
  };

  // Handle draft filter changes (for UI updates before search)
  const handleDraftFiltersChange = useCallback(
    (newDraftFilters: GraphFilters) => {
      setDraftFilters(newDraftFilters);
      // Don't update actual filters immediately
    },
    []
  );

  // Handle entity selection for default mode
  const handleEntitySelect = (entity: Entity | null) => {
    setSelectedEntity(entity);
  };

  // Handle multiple entity selection for selection mode
  const handleEntitiesSelect = (entities: Entity[]) => {
    console.log(
      "handleEntitiesSelect called with:",
      entities.map((e) => e.id)
    );
    console.log(
      "Previous selectedEntities:",
      selectedEntities.map((e) => e.id)
    );
    setSelectedEntities(entities);
    console.log(
      "After setSelectedEntities, should have:",
      entities.map((e) => e.id)
    );
  };

  // Handle mode change
  const handleModeChange = (mode: "default" | "selection") => {
    setCurrentMode(mode);
    // Clear selections when switching modes
    if (mode === "default") {
      setSelectedEntities([]);
    } else {
      setSelectedEntity(null);
    }
  };

  // Handle batch report generation using React Query
  const handleGenerateBatchReport = async () => {
    try {
      // Use the refetch method from the useQuery hook to trigger batch report generation
      await batchReportQuery.generateReport();
    } catch (error) {
      console.error("Error generating batch reports:", error);
    }
  };

  // Handle data refresh - this will trigger refetch in NetworkGraphView
  const handleRefreshData = () => {
    console.log("Refreshing graph data...");
  };

  // Convert backend filters to legacy format for backward compatibility with MainView
  const legacyFilters = {
    priorityLevel: (filters.priority_score_min !== undefined ||
    filters.priority_score_max !== undefined
      ? "custom"
      : "all") as "custom" | "all" | "high" | "medium" | "low",
    entityType:
      (filters.entity_types?.[0] as
        | "bank_account"
        | "e_wallet"
        | "crypto_wallet"
        | "phone_number"
        | "qris") || ("all" as const),
    timeRange: "30d" as const,
    searchQuery: filters.search_query || "",
  };

  const onAppendEntity = useCallback((entity: Entity) => {
    setSelectedEntities((prev) => [...prev, entity]);
  }, []);

  const onRemoveEntity = useCallback((entity: Entity) => {
    setSelectedEntities((prev) => prev.filter((e) => e.id !== entity.id));
  }, []);

  return (
    <div className="h-screen flex flex-col bg-black">
      <TopBar currentView={currentView} onViewChange={setCurrentView} />

      <div className="flex-1 relative overflow-hidden">
        <MainView
          currentView={currentView}
          filters={legacyFilters}
          onEntitySelect={handleEntitySelect}
          selectedEntity={selectedEntity}
          backendFilters={filters}
          onRefreshData={handleRefreshData}
          // Pass new props for selection mode
          onAppendEntity={onAppendEntity}
          onRemoveEntity={onRemoveEntity}
          currentMode={currentMode}
          selectedEntities={selectedEntities}
          onEntitiesSelect={handleEntitiesSelect}
          onFiltersChange={handleFiltersChange}
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
          onFiltersChange={handleFiltersChange}
          draftFilters={draftFilters}
          onDraftFiltersChange={handleDraftFiltersChange}
          selectedEntity={selectedEntity}
          onEntitySelect={handleEntitySelect}
          collapsed={rightSidebarCollapsed}
          onToggleCollapse={() =>
            setRightSidebarCollapsed(!rightSidebarCollapsed)
          }
          onRefreshData={handleRefreshData}
          currentMode={currentMode}
          onModeChange={handleModeChange}
          selectedEntities={selectedEntities}
          onEntitiesSelect={handleEntitiesSelect}
          onGenerateBatchReport={handleGenerateBatchReport}
        />
      </div>
    </div>
  );
}
