// src/frontend/src/components/bars/right-sidebar.tsx - Updated for backend integration
"use client";

import { useState } from "react";
import {
  Search,
  Filter,
  FileText,
  Monitor,
  TrendingUp,
  AlertTriangle,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MultiSelectFilter } from "../ui/multi-select-filter";
import { type GraphFilters } from "@/lib/api/graph-api";
import type { Entity } from "@/lib/types/entity";

interface RightSidebarProps {
  filters: GraphFilters;
  onFiltersChange: (filters: GraphFilters) => void;
  selectedEntity: Entity | null;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onRefreshData?: () => void;
}

const recentSearches = [
  "1234567890123456",
  "0812345678901234",
  "MRC001234567890",
  "6281234567890",
];

const quickStats = [
  { label: "High Priority Entities", value: "89", color: "text-red-400" },
  { label: "Active Investigations", value: "23", color: "text-gray-300" },
  { label: "Flagged Today", value: "12", color: "text-orange-400" },
  { label: "Reports Generated", value: "7", color: "text-green-400" },
];

export function RightSidebar({
  filters,
  onFiltersChange,
  selectedEntity,
  collapsed,
  onToggleCollapse,
  onRefreshData,
}: RightSidebarProps) {
  const [activeTab, setActiveTab] = useState("search");
  const [searchInput, setSearchInput] = useState(filters.search_query || "");

  const handleSearchSubmit = () => {
    onFiltersChange({
      ...filters,
      search_query: searchInput.trim() || undefined,
    });
  };

  const handlePriorityLevelChange = (value: string) => {
    let priorityMin: number | undefined;
    let priorityMax: number | undefined;

    switch (value) {
      case "critical":
        priorityMin = 90;
        priorityMax = 100;
        break;
      case "high":
        priorityMin = 80;
        priorityMax = 89;
        break;
      case "medium":
        priorityMin = 60;
        priorityMax = 79;
        break;
      case "low":
        priorityMin = 0;
        priorityMax = 59;
        break;
      default:
        priorityMin = undefined;
        priorityMax = undefined;
    }

    onFiltersChange({
      ...filters,
      priority_score_min: priorityMin,
      priority_score_max: priorityMax,
    });
  };

  const getCurrentPriorityLevel = () => {
    if (filters.priority_score_min === 90 && filters.priority_score_max === 100)
      return "critical";
    if (filters.priority_score_min === 80 && filters.priority_score_max === 89)
      return "high";
    if (filters.priority_score_min === 60 && filters.priority_score_max === 79)
      return "medium";
    if (filters.priority_score_min === 0 && filters.priority_score_max === 59)
      return "low";
    return "all";
  };

  const handleRecentSearchClick = (searchQuery: string) => {
    setSearchInput(searchQuery);
    onFiltersChange({
      ...filters,
      search_query: searchQuery,
    });
  };

  const clearAllFilters = () => {
    setSearchInput("");
    onFiltersChange({
      entity_types: [],
      banks: [],
      e_wallets: [],
      cryptocurrencies: [],
      phone_providers: [],
      priority_score_min: undefined,
      priority_score_max: undefined,
      search_query: undefined,
    });
  };

  const hasActiveFilters = () => {
    return (
      (filters.entity_types?.length || 0) > 0 ||
      (filters.banks?.length || 0) > 0 ||
      (filters.e_wallets?.length || 0) > 0 ||
      (filters.cryptocurrencies?.length || 0) > 0 ||
      (filters.phone_providers?.length || 0) > 0 ||
      filters.priority_score_min !== undefined ||
      filters.priority_score_max !== undefined ||
      filters.search_query
    );
  };

  return (
    <div
      className={`absolute right-4 top-4 bottom-4 z-20 transition-all duration-300 ${collapsed ? "w-12" : "w-80"}`}
    >
      <div className="h-full flex">
        {/* Toggle Button */}
        <Button
          onClick={onToggleCollapse}
          variant="ghost"
          size="sm"
          className="mr-2 h-12 w-8 bg-black/90 border border-gray-700 text-gray-400 hover:text-white hover:bg-gray-800 backdrop-blur rounded-lg"
        >
          {collapsed ? (
            <ChevronLeft className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </Button>

        <div
          className={`bg-black/95 border border-gray-700 backdrop-blur rounded-lg flex flex-col ${
            collapsed ? "w-0 overflow-hidden opacity-0" : "flex-1 opacity-100"
          }`}
        >
          {!collapsed && (
            <>
              <Tabs
                value={activeTab}
                onValueChange={setActiveTab}
                className="flex flex-col h-full"
              >
                <div className="p-4 border-b border-gray-700">
                  <TabsList className="grid w-full grid-cols-4 bg-gray-900 border-gray-700">
                    <TabsTrigger
                      value="search"
                      className="p-2 data-[state=active]:bg-gray-700 data-[state=active]:text-white text-gray-400"
                    >
                      <Search className="h-4 w-4" />
                    </TabsTrigger>
                    <TabsTrigger
                      value="filters"
                      className="p-2 data-[state=active]:bg-gray-700 data-[state=active]:text-white text-gray-400"
                    >
                      <Filter className="h-4 w-4" />
                    </TabsTrigger>
                    <TabsTrigger
                      value="tasks"
                      className="p-2 data-[state=active]:bg-gray-700 data-[state=active]:text-white text-gray-400"
                    >
                      <Monitor className="h-4 w-4" />
                    </TabsTrigger>
                    <TabsTrigger
                      value="reports"
                      className="p-2 data-[state=active]:bg-gray-700 data-[state=active]:text-white text-gray-400"
                    >
                      <FileText className="h-4 w-4" />
                    </TabsTrigger>
                  </TabsList>

                  <ScrollArea className="flex-1">
                    <div className="p-4">
                      <TabsContent value="search" className="space-y-4 mt-0">
                        <Card className="bg-gray-900/50 border-gray-700">
                          <CardHeader className="pb-3">
                            <CardTitle className="text-sm text-gray-400">
                              Entity Search
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            <div className="space-y-2">
                              <Label htmlFor="search" className="text-gray-400">
                                Search Entity
                              </Label>
                              <div className="flex space-x-2">
                                <Input
                                  id="search"
                                  placeholder="Enter account number, wallet address, phone..."
                                  value={searchInput}
                                  onChange={(e) =>
                                    setSearchInput(e.target.value)
                                  }
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
                              </div>
                              {filters.search_query && (
                                <div className="text-xs text-blue-400">
                                  Searching for: "{filters.search_query}"
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>

                        <Card className="bg-gray-900/50 border-gray-700">
                          <CardHeader className="pb-3">
                            <CardTitle className="text-sm text-gray-400">
                              Recent Searches
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-2">
                              {recentSearches.map((search, index) => (
                                <Button
                                  key={index}
                                  variant="ghost"
                                  className="w-full justify-start text-sm h-8 text-white hover:bg-gray-800 font-mono"
                                  onClick={() =>
                                    handleRecentSearchClick(search)
                                  }
                                >
                                  {search}
                                </Button>
                              ))}
                            </div>
                          </CardContent>
                        </Card>

                        <Card className="bg-gray-900/50 border-gray-700">
                          <CardHeader className="pb-3">
                            <CardTitle className="text-sm text-gray-400">
                              Quick Stats
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-3">
                              {quickStats.map((stat, index) => (
                                <div
                                  key={index}
                                  className="flex items-center justify-between"
                                >
                                  <span className="text-sm text-gray-400">
                                    {stat.label}
                                  </span>
                                  <span
                                    className={`text-sm font-medium ${stat.color}`}
                                  >
                                    {stat.value}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      </TabsContent>

                      <TabsContent value="filters" className="space-y-4 mt-0">
                        {/* Filter Status */}
                        {hasActiveFilters() && (
                          <Card className="bg-blue-900/20 border-blue-700">
                            <CardContent className="p-3">
                              <div className="flex items-center justify-between">
                                <div className="text-sm text-blue-300">
                                  {
                                    Object.values(filters)
                                      .flat()
                                      .filter(Boolean).length
                                  }{" "}
                                  active filters
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={clearAllFilters}
                                  className="text-blue-400 hover:text-blue-300 hover:bg-blue-800/20"
                                >
                                  Clear All
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        )}

                        {/* Multi-Select Payment Method Filters */}
                        <Card className="bg-gray-900/50 border-gray-700">
                          <CardHeader className="pb-3">
                            <CardTitle className="text-sm text-gray-400 text-start">
                              Entity Filters
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <MultiSelectFilter
                              filters={filters}
                              onFiltersChange={onFiltersChange}
                            />
                          </CardContent>
                        </Card>

                        {/* Priority Score Filter */}
                        <Card className="bg-gray-900/50 border-gray-700">
                          <CardHeader className="pb-3">
                            <CardTitle className="text-sm text-gray-400">
                              Priority Level
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="space-y-2">
                              <Label
                                htmlFor="priority-level"
                                className="text-gray-400"
                              >
                                Filter by Priority Score
                              </Label>
                              <Select
                                value={getCurrentPriorityLevel()}
                                onValueChange={handlePriorityLevelChange}
                              >
                                <SelectTrigger className="bg-gray-800/50 border-gray-600 text-white">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-gray-900 border-gray-700">
                                  <SelectItem
                                    value="all"
                                    className="text-white hover:bg-gray-800"
                                  >
                                    All Levels
                                  </SelectItem>
                                  <SelectItem
                                    value="critical"
                                    className="text-white hover:bg-gray-800"
                                  >
                                    Critical (90-100)
                                  </SelectItem>
                                  <SelectItem
                                    value="high"
                                    className="text-white hover:bg-gray-800"
                                  >
                                    High Priority (80-89)
                                  </SelectItem>
                                  <SelectItem
                                    value="medium"
                                    className="text-white hover:bg-gray-800"
                                  >
                                    Medium Priority (60-79)
                                  </SelectItem>
                                  <SelectItem
                                    value="low"
                                    className="text-white hover:bg-gray-800"
                                  >
                                    Low Priority (0-59)
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            {/* Custom Priority Range */}
                            <div className="space-y-2">
                              <Label className="text-gray-400">
                                Custom Range
                              </Label>
                              <div className="flex space-x-2">
                                <Input
                                  type="number"
                                  placeholder="Min"
                                  min="0"
                                  max="100"
                                  value={filters.priority_score_min || ""}
                                  onChange={(e) => {
                                    const value = e.target.value
                                      ? parseInt(e.target.value)
                                      : undefined;
                                    onFiltersChange({
                                      ...filters,
                                      priority_score_min: value,
                                    });
                                  }}
                                  className="bg-gray-800/50 border-gray-600 text-white placeholder:text-gray-500"
                                />
                                <Input
                                  type="number"
                                  placeholder="Max"
                                  min="0"
                                  max="100"
                                  value={filters.priority_score_max || ""}
                                  onChange={(e) => {
                                    const value = e.target.value
                                      ? parseInt(e.target.value)
                                      : undefined;
                                    onFiltersChange({
                                      ...filters,
                                      priority_score_max: value,
                                    });
                                  }}
                                  className="bg-gray-800/50 border-gray-600 text-white placeholder:text-gray-500"
                                />
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </TabsContent>

                      <TabsContent value="tasks" className="space-y-4 mt-0">
                        <Card className="bg-gray-900/50 border-gray-700">
                          <CardHeader className="pb-3">
                            <CardTitle className="text-sm text-gray-400">
                              Data Operations
                            </CardTitle>
                            <CardDescription className="text-xs text-gray-500">
                              Manage graph data and refresh
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            <Button
                              onClick={onRefreshData}
                              className="w-full bg-gray-700 hover:bg-gray-600 text-white"
                              size="sm"
                            >
                              <RefreshCw className="mr-2 h-4 w-4" />
                              Refresh Graph Data
                            </Button>

                            <div className="text-xs text-gray-500 text-center">
                              Last updated: Just now
                            </div>
                          </CardContent>
                        </Card>

                        <Card className="bg-gray-900/50 border-gray-700">
                          <CardHeader className="pb-3">
                            <CardTitle className="text-sm text-gray-400">
                              Active Tasks
                            </CardTitle>
                            <CardDescription className="text-xs text-gray-500">
                              Background operations
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            <div className="flex items-center justify-between p-2 border border-gray-700 rounded bg-gray-800/30">
                              <div>
                                <p className="text-sm font-medium text-white">
                                  Graph Analysis
                                </p>
                                <p className="text-xs text-gray-400">
                                  Computing connections
                                </p>
                              </div>
                              <Badge
                                variant="secondary"
                                className="bg-gray-700 text-gray-300"
                              >
                                Running
                              </Badge>
                            </div>
                          </CardContent>
                        </Card>
                      </TabsContent>

                      <TabsContent value="reports" className="space-y-4 mt-0">
                        <Card className="bg-gray-900/50 border-gray-700">
                          <CardHeader className="pb-3">
                            <CardTitle className="text-sm text-gray-400">
                              Quick Reports
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-2">
                            <Button
                              variant="outline"
                              className="w-full justify-start border-gray-600 text-gray-400 hover:bg-gray-800 bg-transparent"
                              size="sm"
                            >
                              <TrendingUp className="mr-2 h-4 w-4" />
                              Priority Analysis
                            </Button>
                            <Button
                              variant="outline"
                              className="w-full justify-start border-gray-600 text-gray-400 hover:bg-gray-800 bg-transparent"
                              size="sm"
                            >
                              <AlertTriangle className="mr-2 h-4 w-4" />
                              Alert Summary
                            </Button>
                            <Button
                              variant="outline"
                              className="w-full justify-start border-gray-600 text-gray-400 hover:bg-gray-800 bg-transparent"
                              size="sm"
                              disabled={!selectedEntity}
                            >
                              <FileText className="mr-2 h-4 w-4" />
                              Entity Report
                            </Button>
                          </CardContent>
                        </Card>

                        <Card className="bg-gray-900/50 border-gray-700">
                          <CardHeader className="pb-3">
                            <CardTitle className="text-sm text-gray-400">
                              Recent Reports
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-2">
                            <div className="text-sm">
                              <p className="font-medium text-white">
                                Daily Priority Summary
                              </p>
                              <p className="text-xs text-gray-400">
                                Generated 2h ago
                              </p>
                            </div>
                            <div className="text-sm">
                              <p className="font-medium text-white">
                                Network Analysis
                              </p>
                              <p className="text-xs text-gray-400">
                                Generated 4h ago
                              </p>
                            </div>
                            <div className="text-sm">
                              <p className="font-medium text-white">
                                Entity Investigation
                              </p>
                              <p className="text-xs text-gray-400">
                                Generated 6h ago
                              </p>
                            </div>
                          </CardContent>
                        </Card>
                      </TabsContent>
                    </div>
                  </ScrollArea>
                </div>
              </Tabs>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
