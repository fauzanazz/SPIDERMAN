"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import {
  CheckCircle,
  Clock,
  XCircle,
  RefreshCw,
  Play,
  Square,
} from "lucide-react";

const tasks = [
  {
    id: "TASK-001",
    website: "bank-bca.co.id",
    status: "Running",
    agent: "Agent-01",
    startedAt: "2024-01-15 14:30",
    eta: "15 min",
    progress: 65,
  },
  {
    id: "TASK-002",
    website: "ovo.id",
    status: "Completed",
    agent: "Agent-02",
    startedAt: "2024-01-15 13:45",
    eta: "Completed",
    progress: 100,
  },
  {
    id: "TASK-003",
    website: "dana.id",
    status: "Failed",
    agent: "Agent-03",
    startedAt: "2024-01-15 12:15",
    eta: "Failed",
    progress: 45,
  },
  {
    id: "TASK-004",
    website: "gopay.com",
    status: "Queued",
    agent: "Agent-01",
    startedAt: "2024-01-15 14:45",
    eta: "Pending",
    progress: 0,
  },
  {
    id: "TASK-005",
    website: "linkaja.id",
    status: "Running",
    agent: "Agent-04",
    startedAt: "2024-01-15 14:20",
    eta: "8 min",
    progress: 80,
  },
];

const getStatusIcon = (status: string) => {
  switch (status) {
    case "Running":
      return <Clock className="h-4 w-4 text-blue-600" />;
    case "Completed":
      return <CheckCircle className="h-4 w-4 text-green-600" />;
    case "Failed":
      return <XCircle className="h-4 w-4 text-red-600" />;
    case "Queued":
      return <Clock className="h-4 w-4 text-yellow-600" />;
    default:
      return <Clock className="h-4 w-4 text-gray-600" />;
  }
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case "Running":
      return (
        <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
          {status}
        </Badge>
      );
    case "Completed":
      return (
        <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
          {status}
        </Badge>
      );
    case "Failed":
      return <Badge variant="destructive">{status}</Badge>;
    case "Queued":
      return (
        <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
          {status}
        </Badge>
      );
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

export function TaskMonitorPage() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-600" />
              <div>
                <div className="text-2xl font-bold">2</div>
                <p className="text-sm text-muted-foreground">Running Tasks</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <div>
                <div className="text-2xl font-bold">1</div>
                <p className="text-sm text-muted-foreground">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-600" />
              <div>
                <div className="text-2xl font-bold">1</div>
                <p className="text-sm text-muted-foreground">Failed</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-600" />
              <div>
                <div className="text-2xl font-bold">1</div>
                <p className="text-sm text-muted-foreground">Queued</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Task Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Task Controls</CardTitle>
          <CardDescription>Manage OSINT crawling operations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Button>
              <Play className="mr-2 h-4 w-4" />
              Start New Task
            </Button>
            <Button variant="outline">
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh Status
            </Button>
            <Button variant="outline">
              <Square className="mr-2 h-4 w-4" />
              Stop All Tasks
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tasks Table */}
      <Card>
        <CardHeader>
          <CardTitle>Active Tasks</CardTitle>
          <CardDescription>
            Monitor ongoing and recent OSINT crawling operations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Task ID</TableHead>
                <TableHead>Website</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Assigned Agent</TableHead>
                <TableHead>Started At</TableHead>
                <TableHead>ETA</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tasks.map((task) => (
                <TableRow key={task.id}>
                  <TableCell className="font-medium">{task.id}</TableCell>
                  <TableCell>{task.website}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(task.status)}
                      {getStatusBadge(task.status)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress value={task.progress} className="w-16" />
                      <span className="text-sm text-muted-foreground">
                        {task.progress}%
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>{task.agent}</TableCell>
                  <TableCell>{task.startedAt}</TableCell>
                  <TableCell>{task.eta}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-1 justify-end">
                      {task.status === "Failed" && (
                        <Button variant="ghost" size="sm">
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                      )}
                      {task.status === "Running" && (
                        <Button variant="ghost" size="sm">
                          <Square className="h-4 w-4" />
                        </Button>
                      )}
                      <Button variant="ghost" size="sm">
                        View Logs
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Agent Status */}
      <Card>
        <CardHeader>
          <CardTitle>Agent Status</CardTitle>
          <CardDescription>
            Current status of OSINT crawling agents
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <p className="font-medium">Agent-01</p>
                <p className="text-sm text-muted-foreground">Active</p>
              </div>
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <p className="font-medium">Agent-02</p>
                <p className="text-sm text-muted-foreground">Idle</p>
              </div>
              <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <p className="font-medium">Agent-03</p>
                <p className="text-sm text-muted-foreground">Error</p>
              </div>
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <p className="font-medium">Agent-04</p>
                <p className="text-sm text-muted-foreground">Active</p>
              </div>
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
