// src/frontend/src/lib/api/task-api.ts - Task management API
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useEffect, useRef } from "react";
import { config } from "../config";
import { TaskHistoryManager, type TaskHistoryItem } from "@/lib/utils/task-history";

const API_BASE_URL = config.apiURL;

// Types based on backend schema
export interface TaskResponse {
  task_id: string;
}

export interface TaskStatus {
  task_id: string;
  status: string;
  result: Record<string, unknown> | null;
}

export interface TaskInfo {
  task_id: string;
  status: string;
  worker: string;
  args?: unknown[];
  kwargs?: Record<string, unknown>;
  eta?: string | null;
  expires?: string | null;
}

export interface TaskListResponse {
  status: string;
  tasks: TaskInfo[];
  total: number;
}

export interface SitusJudiRequest {
  url: string;
}

export interface MultipleSitusRequest {
  urls: string[];
}

// Task status utilities
export const isTaskCompleted = (status: string) => {
  return ["SUCCESS", "FAILURE"].includes(status);
};

export const isTaskRunning = (status: string) => {
  return ["PENDING", "PROCESSING"].includes(status);
};

export const getTaskStatusColor = (status: string) => {
  switch (status) {
    case "SUCCESS":
      return "text-green-400";
    case "FAILURE":
      return "text-red-400";
    case "PROCESSING":
      return "text-blue-400";
    case "PENDING":
      return "text-yellow-400";
    default:
      return "text-gray-400";
  }
};

export const getTaskStatusBadgeColor = (status: string) => {
  switch (status) {
    case "SUCCESS":
      return "bg-green-700 text-green-200";
    case "FAILURE":
      return "bg-red-700 text-red-200";
    case "PROCESSING":
      return "bg-blue-700 text-blue-200";
    case "PENDING":
      return "bg-yellow-700 text-yellow-200";
    default:
      return "bg-gray-700 text-gray-200";
  }
};

export const getTaskStatusDisplayText = (status: string) => {
  switch (status) {
    case "SUCCESS":
      return "BERHASIL";
    case "FAILURE":
      return "GAGAL";
    case "PROCESSING":
      return "PROSES";
    case "PENDING":
      return "MENUNGGU";
    default:
      return status;
  }
};

// API functions
const taskApi = {
  // Start single site analysis
  async startSiteAnalysis(url: string): Promise<TaskResponse> {
    const response = await fetch(`${API_BASE_URL}/situs-judi/cari-rekening`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url }),
    });

    if (!response.ok) {
      throw new Error(`Failed to start site analysis: ${response.statusText}`);
    }

    return response.json();
  },

  // Start batch site analysis
  async startBatchAnalysis(urls: string[]): Promise<TaskResponse> {
    const response = await fetch(`${API_BASE_URL}/situs-judi/cari-batch`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ urls }),
    });

    if (!response.ok) {
      throw new Error(`Failed to start batch analysis: ${response.statusText}`);
    }

    return response.json();
  },

  // Get task status
  async getTaskStatus(taskId: string): Promise<TaskStatus> {
    const response = await fetch(`${API_BASE_URL}/tasks/${taskId}`);

    if (!response.ok) {
      throw new Error(`Failed to get task status: ${response.statusText}`);
    }

    return response.json();
  },

  // Get all tasks
  async getAllTasks(): Promise<TaskListResponse> {
    const response = await fetch(`${API_BASE_URL}/tasks`);

    if (!response.ok) {
      throw new Error(`Failed to get tasks: ${response.statusText}`);
    }

    return response.json();
  },

  // Retry failed task
  async retryTask(url: string): Promise<TaskResponse> {
    const response = await fetch(`${API_BASE_URL}/situs-judi/retry-url`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url }),
    });

    if (!response.ok) {
      throw new Error(`Failed to retry task: ${response.statusText}`);
    }

    return response.json();
  },
};

// React Query hooks

// Hook to start site analysis
export const useStartSiteAnalysis = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (url: string) => taskApi.startSiteAnalysis(url),
    onSuccess: (data, url) => {
      toast.success("Site Analysis Started", {
        description: `Analysis for ${url} has been started with task ID: ${data.task_id}`,
        duration: 4000,
      });

      // Invalidate tasks queries to refresh the list
      queryClient.invalidateQueries({ queryKey: ["tasks"] });

      // Start polling for this task's status
      queryClient.setQueryData(["task", data.task_id], {
        task_id: data.task_id,
        status: "PENDING",
        result: { message: "Task started" },
      });
    },
    onError: (error: Error, url) => {
      toast.error("Failed to Start Site Analysis", {
        description: `Could not start analysis for ${url}: ${error.message}`,
        duration: 6000,
      });
      console.error("Failed to start site analysis:", error);
    },
  });
};

// Hook to start batch analysis
export const useStartBatchAnalysis = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (urls: string[]) => taskApi.startBatchAnalysis(urls),
    onSuccess: (data, urls) => {
      toast.success("Batch Analysis Started", {
        description: `Batch analysis for ${urls.length} URLs has been started with task ID: ${data.task_id}`,
        duration: 4000,
      });

      queryClient.invalidateQueries({ queryKey: ["tasks"] });

      queryClient.setQueryData(["task", data.task_id], {
        task_id: data.task_id,
        status: "PENDING",
        result: { message: "Batch task started" },
      });
    },
    onError: (error: Error, urls) => {
      toast.error("Failed to Start Batch Analysis", {
        description: `Could not start batch analysis for ${urls.length} URLs: ${error.message}`,
        duration: 6000,
      });
      console.error("Failed to start batch analysis:", error);
    },
  });
};

// Hook to get task status with polling
export const useTaskStatus = (taskId: string, enabled: boolean = true) => {
  const previousStatusRef = useRef<string | null>(null);

  const query = useQuery({
    queryKey: ["task", taskId],
    queryFn: () => taskApi.getTaskStatus(taskId),
    enabled: enabled && !!taskId,
    refetchInterval: (query) => {
      // Poll every 10 seconds while task is running for faster updates
      const data = query.state.data;
      if (data && isTaskRunning(data.status)) {
        return 10000; // 10 seconds for active tasks
      }
      // Poll every minute if completed (to check for result updates)
      return 60000; // 1 minute for completed tasks
    },
    staleTime: 5000, // Consider data stale after 5 seconds
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    retry: 3, // Retry failed requests 3 times
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
  });

  // Show toast notifications when task status changes and save to localStorage
  useEffect(() => {
    if (query.data && previousStatusRef.current !== query.data.status) {
      const { status, task_id, result } = query.data;

      // Save to localStorage when task starts or updates
      const taskHistoryItem: TaskHistoryItem = {
        task_id,
        status,
        result,
        created_at: (result && typeof result === 'object' && 'created_at' in result && typeof result.created_at === 'string') 
          ? result.created_at 
          : new Date().toISOString(),
        url: (result && typeof result === 'object' && 'url' in result && typeof result.url === 'string') 
          ? result.url 
          : undefined,
        error_message: (result && typeof result === 'object') 
          ? (('error_message' in result && typeof result.error_message === 'string') 
              ? result.error_message 
              : ('error' in result && typeof result.error === 'string') 
                ? result.error 
                : undefined)
          : undefined,
        processing_time: (result && typeof result === 'object' && 'processing_time' in result && typeof result.processing_time === 'number') 
          ? result.processing_time 
          : undefined,
      };

      if (status === "SUCCESS" || status === "FAILURE") {
        // Save completed tasks to localStorage
        TaskHistoryManager.saveTask(taskHistoryItem);
      } else {
        // Update ongoing tasks
        TaskHistoryManager.updateTask(task_id, taskHistoryItem);
      }

      if (status === "SUCCESS" && previousStatusRef.current !== "SUCCESS") {
        toast.success("Task Completed", {
          description: `Task ${task_id} has completed successfully`,
          duration: 5000,
        });
      } else if (
        status === "FAILURE" &&
        previousStatusRef.current !== "FAILURE"
      ) {
        toast.error("Task Failed", {
          description: `Task ${task_id} has failed`,
          duration: 6000,
        });
      } else if (
        status === "PROCESSING" &&
        previousStatusRef.current !== "PROCESSING"
      ) {
        toast.info("Task Processing", {
          description: `Task ${task_id} is now processing`,
          duration: 3000,
        });
      }

      previousStatusRef.current = status;
    }
  }, [query.data]);

  // Handle query errors
  useEffect(() => {
    if (query.error) {
      toast.error("Task Status Error", {
        description: `Failed to get status for task ${taskId}: ${query.error.message}`,
        duration: 5000,
      });
    }
  }, [query.error, taskId]);

  return query;
};

// Hook to retry task
export const useRetryTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (url: string) => taskApi.retryTask(url),
    onSuccess: (data, url) => {
      toast.success("Task Retried", {
        description: `Retry for ${url} has been started with task ID: ${data.task_id}`,
        duration: 4000,
      });

      queryClient.invalidateQueries({ queryKey: ["tasks"] });

      queryClient.setQueryData(["task", data.task_id], {
        task_id: data.task_id,
        status: "PENDING",
        result: { message: "Task retried" },
      });
    },
    onError: (error: Error, url) => {
      toast.error("Failed to Retry Task", {
        description: `Could not retry task for ${url}: ${error.message}`,
        duration: 6000,
      });
      console.error("Failed to retry task:", error);
    },
  });
};

// Hook to get all tasks with polling every minute
export const useAllTasks = (enabled: boolean = true) => {
  return useQuery({
    queryKey: ["tasks"],
    queryFn: () => taskApi.getAllTasks(),
    enabled,
    refetchInterval: 60000, // Poll every minute (60 seconds) for task updates
    staleTime: 30000, // Consider data stale after 30 seconds
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    retry: 3, // Retry failed requests 3 times
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
    select: (data) => {
      // Transform TaskInfo[] to TaskStatus[] for compatibility
      return data.tasks.map(
        (task): TaskStatus => ({
          task_id: task.task_id,
          status: task.status,
          result: {
            message: `Task ${task.status.toLowerCase()}`,
            worker: task.worker,
            args: task.args,
            kwargs: task.kwargs,
            eta: task.eta,
            expires: task.expires,
          },
        })
      );
    },
  });
};

// Hook to get active (running) tasks with more frequent polling
export const useActiveTasks = (enabled: boolean = true) => {
  return useQuery({
    queryKey: ["tasks", "active"],
    queryFn: () => taskApi.getAllTasks(),
    enabled,
    refetchInterval: (query) => {
      // Check if there are any running tasks
      const data = query.state.data;
      if (data && data.tasks.some((task) => isTaskRunning(task.status))) {
        return 15000; // Poll every 15 seconds when there are active tasks
      }
      return 60000; // Poll every minute when no active tasks
    },
    staleTime: 10000, // Consider data stale after 10 seconds
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    select: (data) => {
      // Filter and transform only active tasks
      const activeTasks = data.tasks.filter((task) =>
        isTaskRunning(task.status)
      );
      return activeTasks.map(
        (task): TaskStatus => ({
          task_id: task.task_id,
          status: task.status,
          result: {
            message: `Task ${task.status.toLowerCase()}`,
            worker: task.worker,
            args: task.args,
            kwargs: task.kwargs,
            eta: task.eta,
            expires: task.expires,
          },
        })
      );
    },
  });
};

// Hook to get task results with detailed polling
export const useTaskResults = (enabled: boolean = true) => {
  const previousTaskCountRef = useRef<number>(0);

  const query = useQuery({
    queryKey: ["tasks", "results"],
    queryFn: () => taskApi.getAllTasks(),
    enabled,
    refetchInterval: 60000, // Poll every minute for task results
    staleTime: 30000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Show notifications when new tasks are completed
  useEffect(() => {
    if (query.data) {
      const completedTasks = query.data.tasks.filter((task) =>
        isTaskCompleted(task.status)
      );

      if (completedTasks.length > previousTaskCountRef.current) {
        const newCompletedTasks = completedTasks.slice(
          previousTaskCountRef.current
        );

        newCompletedTasks.forEach((task) => {
          if (task.status === "SUCCESS") {
            toast.success("Task Results Updated", {
              description: `Task ${task.task_id} completed successfully`,
              duration: 5000,
            });
          } else if (task.status === "FAILURE") {
            toast.error("Task Failed", {
              description: `Task ${task.task_id} failed to complete`,
              duration: 6000,
            });
          }
        });
      }

      previousTaskCountRef.current = completedTasks.length;
    }
  }, [query.data]);

  return query;
};

// Utility hook to control polling intervals based on user preference
export const useTaskPolling = (options?: {
  pollingInterval?: number; // Custom polling interval in milliseconds
  enableBackground?: boolean; // Enable background polling when window is not focused
  enableNotifications?: boolean; // Enable toast notifications for task updates
}) => {
  const {
    pollingInterval = 60000, // Default 1 minute
    enableBackground = true,
    enableNotifications = true,
  } = options || {};

  const query = useQuery({
    queryKey: ["tasks", "polling", pollingInterval],
    queryFn: () => taskApi.getAllTasks(),
    refetchInterval: pollingInterval,
    staleTime: Math.min(pollingInterval / 2, 30000), // Half of polling interval or 30 seconds max
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchIntervalInBackground: enableBackground,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    select: (data) => {
      return data.tasks.map(
        (task): TaskStatus => ({
          task_id: task.task_id,
          status: task.status,
          result: {
            message: `Task ${task.status.toLowerCase()}`,
            worker: task.worker,
            args: task.args,
            kwargs: task.kwargs,
            eta: task.eta,
            expires: task.expires,
            updated_at: new Date().toISOString(), // Add timestamp for tracking updates
          },
        })
      );
    },
  });

  // Handle success and error using useEffect
  useEffect(() => {
    if (query.data && enableNotifications) {
      const completedTasks = query.data.filter(
        (task) => task.status === "SUCCESS" || task.status === "FAILURE"
      );

      // Log polling update
      console.log(
        `Polling update: ${query.data.length} total tasks, ${completedTasks.length} completed`
      );
    }
  }, [query.data, enableNotifications]);

  useEffect(() => {
    if (query.error && enableNotifications) {
      console.error("Task polling error:", query.error);
      toast.error("Task Polling Error", {
        description: "Failed to fetch task updates. Retrying...",
        duration: 3000,
      });
    }
  }, [query.error, enableNotifications]);

  return query;
};

// Hook to get task history from localStorage
export const useTaskHistory = () => {
  return {
    getHistory: () => TaskHistoryManager.getHistory(),
    getCompletedTasks: () => TaskHistoryManager.getCompletedTasks(),
    getFailedTasks: () => TaskHistoryManager.getFailedTasks(),
    getSuccessfulTasks: () => TaskHistoryManager.getSuccessfulTasks(),
    getTask: (taskId: string) => TaskHistoryManager.getTask(taskId),
    clearHistory: () => TaskHistoryManager.clearHistory(),
  };
};

export default taskApi;
