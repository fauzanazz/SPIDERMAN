// src/frontend/src/lib/api/task-api.ts - Task management API
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useEffect, useRef } from "react";

const API_BASE_URL = "http://localhost:8000";

// Types based on backend schema
export interface TaskResponse {
  task_id: string;
}

export interface TaskStatus {
  task_id: string;
  status: string;
  result: Record<string, unknown> | null;
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
      // Poll every 2 seconds while task is running
      const data = query.state.data;
      if (data && isTaskRunning(data.status)) {
        return 2000;
      }
      // Poll every 30 seconds if completed (to check for updates)
      return 30000;
    },
    staleTime: 1000, // Consider data stale after 1 second
    refetchOnWindowFocus: true,
  });

  // Show toast notifications when task status changes
  useEffect(() => {
    if (query.data && previousStatusRef.current !== query.data.status) {
      const { status, task_id } = query.data;

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

export default taskApi;
