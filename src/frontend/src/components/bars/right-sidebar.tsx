// src/frontend/src/components/bars/right-sidebar.tsx - Updated for backend integration
"use client";
import { useState } from "react";
import {
  Filter,
  Monitor,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Users,
  MousePointer,
  Trash2,
  X,
  Download,
  Play,
  RotateCcw,
  Globe,
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
import {
  useStartSiteAnalysis,
  useTaskStatus,
  useRetryTask,
  getTaskStatusBadgeColor,
  isTaskRunning,
  type TaskStatus,
} from "@/lib/api/task-api";
import { useTaskContext } from "@/hooks/useTaskContext";

interface RightSidebarProps {
  filters: GraphFilters;
  onFiltersChange: (filters: GraphFilters) => void;
  draftFilters: GraphFilters;
  onDraftFiltersChange: (filters: GraphFilters) => void;
  selectedEntity: Entity | null;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onRefreshData?: () => void;
  // New props for mode selection and batch reporting
  currentMode: "default" | "selection";
  onModeChange: (mode: "default" | "selection") => void;
  selectedEntities: Entity[];
  onEntitiesSelect: (entities: Entity[]) => void;
  onGenerateBatchReport: (entities: Entity[]) => Promise<void>;
}

export function RightSidebar({
  filters,
  onFiltersChange,
  draftFilters,
  onDraftFiltersChange,
  collapsed,
  onToggleCollapse,
  onRefreshData,
  currentMode,
  onModeChange,
  selectedEntities,
  onEntitiesSelect,
  onGenerateBatchReport,
}: RightSidebarProps) {
  const [activeTab, setActiveTab] = useState("mode");

  // Task management state
  const [newSiteUrl, setNewSiteUrl] = useState("");
  const { activeTasks, addTask } = useTaskContext();

  // Task API hooks
  const startSiteAnalysisMutation = useStartSiteAnalysis();
  const retryTaskMutation = useRetryTask();

  // Handle starting new site analysis
  const handleStartSiteAnalysis = async () => {
    if (!newSiteUrl.trim()) return;

    try {
      const result = await startSiteAnalysisMutation.mutateAsync(
        newSiteUrl.trim()
      );

      // Add task to context
      addTask({
        task_id: result.task_id,
        status: "PENDING",
        result: { message: "Task started", url: newSiteUrl.trim() },
      });

      setNewSiteUrl(""); // Clear input
    } catch (error) {
      console.error("Failed to start site analysis:", error);
    }
  };

  // Handle retrying a task
  const handleRetryTask = async (url: string) => {
    try {
      const result = await retryTaskMutation.mutateAsync(url);

      addTask({
        task_id: result.task_id,
        status: "PENDING",
        result: { message: "Task retried", url },
      });
    } catch (error) {
      console.error("Failed to retry task:", error);
    }
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

  const clearAllFilters = () => {
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
      className={`absolute right-4 top-4 bottom-4 z-20 transition-all duration-300 ${collapsed ? "w-12" : "w-100"}`}
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
                <div className="p-4 border-b border-gray-700 ">
                  <TabsList className="grid w-full grid-cols-3 bg-gray-900 border-gray-700">
                    <TabsTrigger
                      value="mode"
                      className="p-2 data-[state=active]:bg-gray-700 data-[state=active]:text-white text-gray-400"
                    >
                      <MousePointer className="h-4 w-4" />
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
                  </TabsList>

                  <ScrollArea className="h-[800px] overflow-y-auto border-none">
                    <div className="p-4 ">
                      <TabsContent value="mode" className="space-y-4 mt-0">
                        {/* Mode Selector */}
                        <Card className="bg-gray-900/50 border-gray-700">
                          <CardHeader className="pb-3">
                            <CardTitle className="text-sm text-gray-400">
                              Interaction Mode
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            <div className="space-y-2">
                              <Label className="text-gray-400">
                                Select Mode
                              </Label>
                              <div className="grid grid-cols-2 gap-2">
                                <Button
                                  variant={
                                    currentMode === "default"
                                      ? "default"
                                      : "outline"
                                  }
                                  onClick={() => onModeChange("default")}
                                  className={`flex items-center gap-2 ${
                                    currentMode === "default"
                                      ? "bg-blue-600 hover:bg-blue-700 text-white"
                                      : "bg-gray-800 hover:bg-gray-700 text-gray-300 border-gray-600"
                                  }`}
                                  size="sm"
                                >
                                  <MousePointer className="h-4 w-4" />
                                  Default
                                </Button>
                                <Button
                                  variant={
                                    currentMode === "selection"
                                      ? "default"
                                      : "outline"
                                  }
                                  onClick={() => onModeChange("selection")}
                                  className={`flex items-center gap-2 ${
                                    currentMode === "selection"
                                      ? "bg-green-600 hover:bg-green-700 text-white"
                                      : "bg-gray-800 hover:bg-gray-700 text-gray-300 border-gray-600"
                                  }`}
                                  size="sm"
                                >
                                  <Users className="h-4 w-4" />
                                  Selection
                                </Button>
                              </div>
                              {currentMode === "default" && (
                                <div className="text-xs text-gray-500">
                                  Click nodes to view details
                                </div>
                              )}
                              {currentMode === "selection" && (
                                <div className="text-xs text-gray-500">
                                  Click nodes to select for batch operations
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>

                        {/* Selected Entities */}
                        {currentMode === "selection" && (
                          <Card className="bg-gray-900/50 border-gray-700">
                            <CardHeader className="pb-3">
                              <CardTitle className="text-sm text-gray-400 flex items-center justify-between">
                                Selected Entities ({selectedEntities.length})
                                {selectedEntities.length > 0 && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => onEntitiesSelect([])}
                                    className="text-red-400 hover:text-red-300 hover:bg-red-800/20 h-6 w-6 p-0"
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                )}
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                              {selectedEntities.length === 0 ? (
                                <div className="text-xs text-gray-500 text-center py-4">
                                  No entities selected. Click nodes in the graph
                                  to select them.
                                </div>
                              ) : (
                                <>
                                  <ScrollArea className="max-h-48">
                                    <div className="space-y-2">
                                      {selectedEntities.map((entity) => (
                                        <div
                                          key={entity.id}
                                          className="flex items-center justify-between p-2 bg-gray-800/50 rounded text-sm"
                                        >
                                          <div className="flex-1 min-w-0">
                                            <div className="font-mono text-xs text-white truncate">
                                              {entity.identifier}
                                            </div>
                                            <div className="text-xs text-gray-400">
                                              {entity.type.replace("_", " ")} •{" "}
                                              {entity.accountHolder}
                                            </div>
                                          </div>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() =>
                                              onEntitiesSelect(
                                                selectedEntities.filter(
                                                  (e) => e.id !== entity.id
                                                )
                                              )
                                            }
                                            className="text-red-400 hover:text-red-300 hover:bg-red-800/20 h-6 w-6 p-0 ml-2"
                                          >
                                            <Trash2 className="h-3 w-3" />
                                          </Button>
                                        </div>
                                      ))}
                                    </div>
                                  </ScrollArea>

                                  {/* Batch Report Button */}
                                  <Button
                                    onClick={() =>
                                      onGenerateBatchReport(selectedEntities)
                                    }
                                    className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                                    size="sm"
                                  >
                                    <Download className="mr-2 h-4 w-4" />
                                    Generate Batch Report (
                                    {selectedEntities.length})
                                  </Button>
                                </>
                              )}
                            </CardContent>
                          </Card>
                        )}
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
                              draftFilters={draftFilters}
                              onDraftFiltersChange={onDraftFiltersChange}
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
                        {/* New Site Analysis */}
                        <Card className="bg-gray-900/50 border-gray-700">
                          <CardHeader className="pb-3">
                            <CardTitle className="text-sm text-gray-400">
                              Start New Analysis
                            </CardTitle>
                            <CardDescription className="text-xs text-gray-500">
                              Analyze gambling site for suspicious accounts
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            <div className="space-y-2">
                              <Label
                                htmlFor="site-url"
                                className="text-gray-400"
                              >
                                Website URL
                              </Label>
                              <div className="flex space-x-2">
                                <Input
                                  id="site-url"
                                  placeholder="https://example-gambling-site.com"
                                  value={newSiteUrl}
                                  onChange={(e) =>
                                    setNewSiteUrl(e.target.value)
                                  }
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      handleStartSiteAnalysis();
                                    }
                                  }}
                                  className="bg-gray-800/50 border-gray-600 text-white placeholder:text-gray-500"
                                />
                                <Button
                                  onClick={handleStartSiteAnalysis}
                                  disabled={
                                    !newSiteUrl.trim() ||
                                    startSiteAnalysisMutation.isPending
                                  }
                                  className="bg-green-700 hover:bg-green-600 text-white"
                                  size="sm"
                                >
                                  {startSiteAnalysisMutation.isPending ? (
                                    <RefreshCw className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Play className="h-4 w-4" />
                                  )}
                                </Button>
                              </div>
                              <div className="text-xs text-gray-500">
                                Enter a gambling website URL to analyze for
                                suspicious payment accounts
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        {/* Active Tasks */}
                        <Card className="bg-gray-900/50 border-gray-700">
                          <CardHeader className="pb-3">
                            <CardTitle className="text-sm text-gray-400 flex items-center justify-between">
                              Active Tasks ({activeTasks.length})
                              <Button
                                onClick={onRefreshData}
                                variant="ghost"
                                size="sm"
                                className="text-gray-400 hover:text-white hover:bg-gray-800 h-6 w-6 p-0"
                              >
                                <RefreshCw className="h-3 w-3" />
                              </Button>
                            </CardTitle>
                            <CardDescription className="text-xs text-gray-500">
                              Background site analysis operations
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            {activeTasks.length === 0 ? (
                              <div className="text-xs text-gray-500 text-center py-4">
                                No active tasks. Start a new site analysis
                                above.
                              </div>
                            ) : (
                              <ScrollArea className="max-h-64">
                                <div className="space-y-2">
                                  {activeTasks.map((task: TaskStatus) => (
                                    <TaskStatusCard
                                      key={task.task_id}
                                      task={task}
                                      onRetry={handleRetryTask}
                                    />
                                  ))}
                                </div>
                              </ScrollArea>
                            )}
                          </CardContent>
                        </Card>

                        {/* Data Operations */}
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
                      </TabsContent>

                      {/* <TabsContent value="reports" className="space-y-4 mt-0">
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
                      </TabsContent> */}
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

// Task Status Card Component
interface TaskStatusCardProps {
  task: TaskStatus;
  onRetry: (url: string) => void;
}

function TaskStatusCard({ task, onRetry }: TaskStatusCardProps) {
  // Use the task status hook to get live updates
  const { data: taskStatus } = useTaskStatus(task.task_id, true);
  const currentTask = taskStatus || task;

  const getTaskUrl = () => {
    if (
      currentTask.result &&
      typeof currentTask.result === "object" &&
      "url" in currentTask.result
    ) {
      return currentTask.result.url as string;
    }
    return "";
  };

  const getTaskMessage = () => {
    if (currentTask.result && typeof currentTask.result === "object") {
      if ("message" in currentTask.result) {
        return currentTask.result.message as string;
      }
      if ("error" in currentTask.result) {
        return `Error: ${currentTask.result.error}`;
      }
    }
    return "Processing...";
  };

  const getResultSummary = () => {
    if (
      currentTask.status === "SUCCESS" &&
      currentTask.result &&
      typeof currentTask.result === "object"
    ) {
      const result = currentTask.result;
      if ("rekening_ditemukan" in result) {
        return `Found ${result.rekening_ditemukan} accounts, ${result.crypto_ditemukan || 0} crypto wallets`;
      }
    }
    return null;
  };

  return (
    <div
      className={`flex items-center justify-between p-3 border rounded bg-gray-800/30 ${
        currentTask.status === "FAILURE"
          ? "border-red-700"
          : currentTask.status === "SUCCESS"
            ? "border-green-700"
            : "border-gray-700"
      }`}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <div className="flex items-center gap-1">
            {isTaskRunning(currentTask.status) && (
              <RefreshCw className="h-3 w-3 animate-spin text-blue-400" />
            )}
            {currentTask.status === "SUCCESS" && (
              <div className="h-2 w-2 rounded-full bg-green-400" />
            )}
            {currentTask.status === "FAILURE" && (
              <div className="h-2 w-2 rounded-full bg-red-400" />
            )}
            <p className="text-sm font-medium text-white truncate">
              Site Analysis
            </p>
          </div>
          <Badge
            variant="secondary"
            className={`text-xs ${getTaskStatusBadgeColor(currentTask.status)}`}
          >
            {currentTask.status}
          </Badge>
        </div>

        <p className="text-xs text-gray-400 truncate mb-1">
          {getTaskUrl() || currentTask.task_id}
        </p>

        <p className="text-xs text-gray-500">{getTaskMessage()}</p>

        {getResultSummary() && (
          <p className="text-xs text-green-400 mt-1">{getResultSummary()}</p>
        )}
      </div>

      <div className="flex items-center gap-1 ml-2">
        {currentTask.status === "FAILURE" && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onRetry(getTaskUrl())}
            className="text-yellow-400 hover:text-yellow-300 hover:bg-yellow-800/20 h-6 w-6 p-0"
          >
            <RotateCcw className="h-3 w-3" />
          </Button>
        )}

        {currentTask.status === "SUCCESS" && getTaskUrl() && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.open(getTaskUrl(), "_blank")}
            className="text-blue-400 hover:text-blue-300 hover:bg-blue-800/20 h-6 w-6 p-0"
          >
            <Globe className="h-3 w-3" />
          </Button>
        )}
      </div>
    </div>
  );
}
