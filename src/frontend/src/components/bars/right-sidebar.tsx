"use client";

import { useState } from "react";
import {
  Search,
  Filter,
  FileText,
  Monitor,
  TrendingUp,
  AlertTriangle,
  Play,
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
import type { Entity } from "@/lib/types/entity";

interface RightSidebarProps {
  filters: any;
  onFiltersChange: (filters: any) => void;
  selectedEntity: Entity | null;
  collapsed: boolean;
  onToggleCollapse: () => void;
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
}: RightSidebarProps) {
  const [activeTab, setActiveTab] = useState("search");

  const handlePaymentFiltersChange = (
    paymentFilters: Record<string, string[]>
  ) => {
    // Merge payment filters with existing filters
    onFiltersChange({
      ...filters,
      paymentFilters,
    });
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
            collapsed ? "w-0 overflow-y-scroll opacity-0" : "flex-1 opacity-100"
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
                </div>

                <ScrollArea className="flex flex-col h-full overflow-y-auto">
                  <div className="p-4 h-full">
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
                            <Input
                              id="search"
                              placeholder="Enter account number, phone, or name..."
                              value={filters.searchQuery}
                              onChange={(e) =>
                                onFiltersChange({
                                  ...filters,
                                  searchQuery: e.target.value,
                                })
                              }
                              className="bg-gray-800/50 border-gray-600 text-white placeholder:text-gray-500"
                            />
                          </div>
                          <Button className="w-full bg-gray-700 hover:bg-gray-600 text-white">
                            <Search className="mr-2 h-4 w-4" />
                            Search
                          </Button>
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
                                  onFiltersChange({
                                    ...filters,
                                    searchQuery: search,
                                  })
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
                      {/* Multi-Select Payment Method Filters */}
                      <Card className="bg-gray-900/50 border-gray-700 gap-0">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm text-gray-400 text-start">
                            Metode Pembayaran
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <MultiSelectFilter
                            onFiltersChange={handlePaymentFiltersChange}
                          />
                        </CardContent>
                      </Card>

                      {/* Existing Analysis Filters */}
                      <Card className="bg-gray-900/50 border-gray-700">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm text-gray-400">
                            Analysis Filters
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="space-y-2">
                            <Label
                              htmlFor="priority-level"
                              className="text-gray-400"
                            >
                              Priority Level
                            </Label>
                            <Select
                              value={filters.priorityLevel}
                              onValueChange={(value) =>
                                onFiltersChange({
                                  ...filters,
                                  priorityLevel: value,
                                })
                              }
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
                                  Critical
                                </SelectItem>
                                <SelectItem
                                  value="high"
                                  className="text-white hover:bg-gray-800"
                                >
                                  High Priority
                                </SelectItem>
                                <SelectItem
                                  value="medium"
                                  className="text-white hover:bg-gray-800"
                                >
                                  Medium Priority
                                </SelectItem>
                                <SelectItem
                                  value="low"
                                  className="text-white hover:bg-gray-800"
                                >
                                  Low Priority
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label
                              htmlFor="time-range"
                              className="text-gray-400"
                            >
                              Time Range
                            </Label>
                            <Select
                              value={filters.timeRange}
                              onValueChange={(value) =>
                                onFiltersChange({
                                  ...filters,
                                  timeRange: value,
                                })
                              }
                            >
                              <SelectTrigger className="bg-gray-800/50 border-gray-600 text-white">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-gray-900 border-gray-700">
                                <SelectItem
                                  value="7d"
                                  className="text-white hover:bg-gray-800"
                                >
                                  Last 7 days
                                </SelectItem>
                                <SelectItem
                                  value="30d"
                                  className="text-white hover:bg-gray-800"
                                >
                                  Last 30 days
                                </SelectItem>
                                <SelectItem
                                  value="90d"
                                  className="text-white hover:bg-gray-800"
                                >
                                  Last 90 days
                                </SelectItem>
                                <SelectItem
                                  value="1y"
                                  className="text-white hover:bg-gray-800"
                                >
                                  Last year
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>

                    <TabsContent value="tasks" className="space-y-4 mt-0">
                      <Card className="bg-gray-900/50 border-gray-700">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm text-gray-400">
                            Pekerjaan Aktif
                          </CardTitle>
                          <CardDescription className="text-xs text-gray-500">
                            OSINT crawling operations
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="flex items-center justify-between p-2 border border-gray-700 rounded bg-gray-800/30">
                            <div>
                              <p className="text-sm font-medium text-white">
                                BCA Crawl
                              </p>
                              <p className="text-xs text-gray-400">
                                65% complete
                              </p>
                            </div>
                            <Badge
                              variant="secondary"
                              className="bg-gray-700 text-gray-300"
                            >
                              Running
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between p-2 border border-gray-700 rounded bg-gray-800/30">
                            <div>
                              <p className="text-sm font-medium text-white">
                                OVO Analysis
                              </p>
                              <p className="text-xs text-gray-400">
                                80% complete
                              </p>
                            </div>
                            <Badge
                              variant="secondary"
                              className="bg-gray-700 text-gray-300"
                            >
                              Running
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between p-2 border border-gray-700 rounded bg-gray-800/30">
                            <div>
                              <p className="text-sm font-medium text-white">
                                DANA Scan
                              </p>
                              <p className="text-xs text-gray-400">Failed</p>
                            </div>
                            <Badge
                              variant="destructive"
                              className="bg-red-600 text-white"
                            >
                              Error
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="bg-gray-900/50 border-gray-700">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm text-gray-400">
                            Task Controls
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          <Button
                            className="w-full bg-gray-700 hover:bg-gray-600 text-white"
                            size="sm"
                          >
                            <Play className="mr-2 h-4 w-4" />
                            New Task
                          </Button>
                          <Button
                            variant="outline"
                            className="w-full border-gray-600 text-gray-400 hover:bg-gray-800 bg-transparent"
                            size="sm"
                          >
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Refresh All
                          </Button>
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
              </Tabs>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
