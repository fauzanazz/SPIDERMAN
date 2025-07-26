// src/frontend/src/lib/api/task-api.ts - Task management API
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

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
    onSuccess: (data) => {
      // Invalidate tasks queries to refresh the list
      queryClient.invalidateQueries({ queryKey: ["tasks"] });

      // Start polling for this task's status
      queryClient.setQueryData(["task", data.task_id], {
        task_id: data.task_id,
        status: "PENDING",
        result: { message: "Task started" },
      });
    },
    onError: (error) => {
      console.error("Failed to start site analysis:", error);
    },
  });
};

// Hook to start batch analysis
export const useStartBatchAnalysis = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (urls: string[]) => taskApi.startBatchAnalysis(urls),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });

      queryClient.setQueryData(["task", data.task_id], {
        task_id: data.task_id,
        status: "PENDING",
        result: { message: "Batch task started" },
      });
    },
    onError: (error) => {
      console.error("Failed to start batch analysis:", error);
    },
  });
};

// Hook to get task status with polling
export const useTaskStatus = (taskId: string, enabled: boolean = true) => {
  return useQuery({
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
};

// Hook to retry task
export const useRetryTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (url: string) => taskApi.retryTask(url),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });

      queryClient.setQueryData(["task", data.task_id], {
        task_id: data.task_id,
        status: "PENDING",
        result: { message: "Task retried" },
      });
    },
    onError: (error) => {
      console.error("Failed to retry task:", error);
    },
  });
};

export default taskApi;
