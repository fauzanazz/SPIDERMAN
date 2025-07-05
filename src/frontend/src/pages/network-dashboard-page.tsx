"use client";

import { useState } from "react";
import { LeftSidebar } from "@/components/bars/left-sidebar";
import { RightSidebar } from "@/components/bars/right-sidebar";
import { MainView } from "@/components/views/main-views";
import { TopBar } from "@/components/bars/top-bar";
import type { Entity } from "@/lib/types/entity";

export function NetworkDashboard() {
  const [currentView, setCurrentView] = useState<"network" | "geospatial">(
    "network"
  );
  const [selectedEntity, setSelectedEntity] = useState<Entity | null>(null);
  const [leftSidebarCollapsed, setLeftSidebarCollapsed] = useState(false);
  const [rightSidebarCollapsed, setRightSidebarCollapsed] = useState(false);
  const [filters, setFilters] = useState({
    priorityLevel: "all",
    entityType: "all",
    timeRange: "30d",
    searchQuery: "",
  });

  return (
    <div className="h-screen flex flex-col bg-black">
      <TopBar currentView={currentView} onViewChange={setCurrentView} />

      <div className="flex-1 relative overflow-hidden">
        <MainView
          currentView={currentView}
          filters={filters}
          onEntitySelect={setSelectedEntity}
          selectedEntity={selectedEntity}
        />
        <LeftSidebar
          selectedEntity={selectedEntity}
          currentView={currentView}
          collapsed={leftSidebarCollapsed}
          onToggleCollapse={() =>
            setLeftSidebarCollapsed(!leftSidebarCollapsed)
          }
        />

        <RightSidebar
          filters={filters}
          onFiltersChange={setFilters}
          selectedEntity={selectedEntity}
          collapsed={rightSidebarCollapsed}
          onToggleCollapse={() =>
            setRightSidebarCollapsed(!rightSidebarCollapsed)
          }
        />
      </div>
    </div>
  );
}
