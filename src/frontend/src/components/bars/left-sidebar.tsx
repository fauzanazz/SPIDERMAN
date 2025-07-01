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
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface LeftSidebarProps {
  filters: any;
  onFiltersChange: (filters: any) => void;
  selectedEntity: any;
}

const recentSearches = [
  "BCA-7829****1234",
  "OVO-081234****89",
  "QRIS-MRC001234",
  "+62812****5678",
];

const quickStats = [
  { label: "High Risk Entities", value: "89", color: "text-red-600" },
  { label: "Active Investigations", value: "23", color: "text-blue-600" },
  { label: "Flagged Today", value: "12", color: "text-yellow-600" },
  { label: "Reports Generated", value: "7", color: "text-green-600" },
];

export function LeftSidebar({
  filters,
  onFiltersChange,
  selectedEntity,
}: LeftSidebarProps) {
  const [activeTab, setActiveTab] = useState("search");

  return (
    <div className="w-80 border-r bg-background/50 backdrop-blur">
      <div className="h-full flex flex-col">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
          <div className="p-4 border-b">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="search" className="p-2">
                <Search className="h-4 w-4" />
              </TabsTrigger>
              <TabsTrigger value="filters" className="p-2">
                <Filter className="h-4 w-4" />
              </TabsTrigger>
              <TabsTrigger value="tasks" className="p-2">
                <Monitor className="h-4 w-4" />
              </TabsTrigger>
              <TabsTrigger value="reports" className="p-2">
                <FileText className="h-4 w-4" />
              </TabsTrigger>
            </TabsList>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-4">
              <TabsContent value="search" className="space-y-4 mt-0">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Entity Search</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor="search">Search Entity</Label>
                      <Input
                        id="search"
                        placeholder="Enter entity ID, phone, or account..."
                        value={filters.searchQuery}
                        onChange={(e) =>
                          onFiltersChange({
                            ...filters,
                            searchQuery: e.target.value,
                          })
                        }
                      />
                    </div>
                    <Button className="w-full">
                      <Search className="mr-2 h-4 w-4" />
                      Search
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Recent Searches</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {recentSearches.map((search, index) => (
                        <Button
                          key={index}
                          variant="ghost"
                          className="w-full justify-start text-sm h-8"
                          onClick={() =>
                            onFiltersChange({ ...filters, searchQuery: search })
                          }
                        >
                          {search}
                        </Button>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Quick Stats</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {quickStats.map((stat, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between"
                        >
                          <span className="text-sm text-muted-foreground">
                            {stat.label}
                          </span>
                          <span className={`text-sm font-medium ${stat.color}`}>
                            {stat.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="filters" className="space-y-4 mt-0">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Analysis Filters</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="risk-level">Risk Level</Label>
                      <Select
                        value={filters.riskLevel}
                        onValueChange={(value) =>
                          onFiltersChange({ ...filters, riskLevel: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Levels</SelectItem>
                          <SelectItem value="critical">Critical</SelectItem>
                          <SelectItem value="high">High Risk</SelectItem>
                          <SelectItem value="medium">Medium Risk</SelectItem>
                          <SelectItem value="low">Low Risk</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="entity-type">Entity Type</Label>
                      <Select
                        value={filters.entityType}
                        onValueChange={(value) =>
                          onFiltersChange({ ...filters, entityType: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Types</SelectItem>
                          <SelectItem value="bank">Bank Account</SelectItem>
                          <SelectItem value="ewallet">E-Wallet</SelectItem>
                          <SelectItem value="qris">QRIS Code</SelectItem>
                          <SelectItem value="phone">Phone Number</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="time-range">Time Range</Label>
                      <Select
                        value={filters.timeRange}
                        onValueChange={(value) =>
                          onFiltersChange({ ...filters, timeRange: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="7d">Last 7 days</SelectItem>
                          <SelectItem value="30d">Last 30 days</SelectItem>
                          <SelectItem value="90d">Last 90 days</SelectItem>
                          <SelectItem value="1y">Last year</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <Separator />

                    <div className="flex gap-2">
                      <Button className="flex-1">
                        <Filter className="mr-2 h-4 w-4" />
                        Apply
                      </Button>
                      <Button variant="outline" className="flex-1">
                        Reset
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Display Options</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Show Labels</span>
                      <Button variant="outline" size="sm">
                        Toggle
                      </Button>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Cluster Nodes</span>
                      <Button variant="outline" size="sm">
                        Toggle
                      </Button>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Animation</span>
                      <Button variant="outline" size="sm">
                        Toggle
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="tasks" className="space-y-4 mt-0">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Active Tasks</CardTitle>
                    <CardDescription className="text-xs">
                      OSINT crawling operations
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between p-2 border rounded">
                      <div>
                        <p className="text-sm font-medium">BCA Crawl</p>
                        <p className="text-xs text-muted-foreground">
                          65% complete
                        </p>
                      </div>
                      <Badge variant="secondary">Running</Badge>
                    </div>
                    <div className="flex items-center justify-between p-2 border rounded">
                      <div>
                        <p className="text-sm font-medium">OVO Analysis</p>
                        <p className="text-xs text-muted-foreground">
                          80% complete
                        </p>
                      </div>
                      <Badge variant="secondary">Running</Badge>
                    </div>
                    <div className="flex items-center justify-between p-2 border rounded">
                      <div>
                        <p className="text-sm font-medium">DANA Scan</p>
                        <p className="text-xs text-muted-foreground">Failed</p>
                      </div>
                      <Badge variant="destructive">Error</Badge>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Task Controls</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Button className="w-full" size="sm">
                      <Play className="mr-2 h-4 w-4" />
                      New Task
                    </Button>
                    <Button variant="outline" className="w-full" size="sm">
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Refresh All
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="reports" className="space-y-4 mt-0">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Quick Reports</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      size="sm"
                    >
                      <TrendingUp className="mr-2 h-4 w-4" />
                      Risk Analysis
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      size="sm"
                    >
                      <AlertTriangle className="mr-2 h-4 w-4" />
                      Alert Summary
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      size="sm"
                    >
                      <FileText className="mr-2 h-4 w-4" />
                      Entity Report
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Laporan Terbaru</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="text-sm">
                      <p className="font-medium">Daily Risk Summary</p>
                      <p className="text-xs text-muted-foreground">
                        Generated 2h ago
                      </p>
                    </div>
                    <div className="text-sm">
                      <p className="font-medium">Network Analysis</p>
                      <p className="text-xs text-muted-foreground">
                        Generated 4h ago
                      </p>
                    </div>
                    <div className="text-sm">
                      <p className="font-medium">Entity Investigation</p>
                      <p className="text-xs text-muted-foreground">
                        Generated 6h ago
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </div>
          </ScrollArea>
        </Tabs>
      </div>
    </div>
  );
}
