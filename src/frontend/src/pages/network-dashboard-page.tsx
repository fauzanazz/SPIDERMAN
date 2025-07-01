"use client";

import { useState } from "react";
import { LeftSidebar } from "@/components/bars/left-sidebar";
import { RightSidebar } from "@/components/bars/right-sidebar";
import { TopBar } from "@/components/bars/top-bar";
import { MainView } from "@/components/views/main-views";
import type { Entity } from "@/lib/types/entity";

export function NetworkDashboard() {
  const [currentView, setCurrentView] = useState<"network" | "geospatial">(
    "network"
  );
  const [selectedEntity, setSelectedEntity] = useState<Entity | null>(null);
  const [filters, setFilters] = useState({
    riskLevel: "all",
    entityType: "all",
    timeRange: "30d",
    searchQuery: "",
  });

  return (
    <div className="h-screen flex flex-col bg-background">
      <TopBar currentView={currentView} onViewChange={setCurrentView} />

      <div className="flex flex-1 overflow-hidden">
        <LeftSidebar
          filters={filters}
          onFiltersChange={setFilters}
          selectedEntity={selectedEntity}
        />

        <MainView
          currentView={currentView}
          onEntitySelect={setSelectedEntity}
          selectedEntity={selectedEntity}
        />

        <RightSidebar
          selectedEntity={selectedEntity}
          currentView={currentView}
        />
      </div>
    </div>
  );
}
