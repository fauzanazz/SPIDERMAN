"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Network, Filter, Download, ZoomIn, ZoomOut } from "lucide-react";

export function NetworkGraphPage() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Network Analysis Controls</CardTitle>
          <CardDescription>
            Configure filters and visualization settings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="priority-level">Priority Level</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="All levels" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="high">High Priority</SelectItem>
                  <SelectItem value="medium">Medium Priority</SelectItem>
                  <SelectItem value="low">Low Priority</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="entity-type">Entity Type</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="All types" />
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
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Last 30 days" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7d">Last 7 days</SelectItem>
                  <SelectItem value="30d">Last 30 days</SelectItem>
                  <SelectItem value="90d">Last 90 days</SelectItem>
                  <SelectItem value="1y">Last year</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="search">Search Entity</Label>
              <Input placeholder="Enter entity ID..." />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <Button>
              <Filter className="mr-2 h-4 w-4" />
              Apply Filters
            </Button>
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Export Graph
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-4">
        {/* Graph Visualization */}
        <Card className="col-span-3">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Network Graph</CardTitle>
                <CardDescription>
                  Interactive visualization of entity relationships
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  <ZoomIn className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm">
                  <ZoomOut className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="bg-muted rounded-lg h-[500px] flex items-center justify-center">
              <div className="text-center">
                <Network className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  Interactive network graph would be rendered here
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Using React Flow or D3.js for visualization
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Node Details */}
        <Card>
          <CardHeader>
            <CardTitle>Node Details</CardTitle>
            <CardDescription>Information about selected entity</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center text-muted-foreground">
              <Network className="h-8 w-8 mx-auto mb-2" />
              <p className="text-sm">Click on a node to view details</p>
            </div>

            {/* Example node details when selected */}
            <div className="space-y-3 pt-4 border-t">
              <div>
                <h4 className="font-medium">BCA-7829****1234</h4>
                <p className="text-sm text-muted-foreground">Bank Account</p>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Priority Score</span>
                <Badge variant="destructive">85</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Connections</span>
                <span className="text-sm font-medium">12</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Last Activity</span>
                <span className="text-sm font-medium">2h ago</span>
              </div>
              <Button className="w-full" size="sm">
                View Full Profile
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Graph Statistics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">247</div>
            <p className="text-sm text-muted-foreground">Total Nodes</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">1,834</div>
            <p className="text-sm text-muted-foreground">Total Connections</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">23</div>
            <p className="text-sm text-muted-foreground">
              High-Priority Clusters
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">7.4</div>
            <p className="text-sm text-muted-foreground">Avg. Connections</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
