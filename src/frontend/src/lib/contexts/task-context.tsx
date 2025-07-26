// src/frontend/src/lib/contexts/task-context.tsx - Task management context
"use client";

import React, { useState, useCallback } from "react";
import type { TaskStatus } from "../api/task-api";
import { TaskContext } from "@/hooks/useTaskContext";

export const TaskProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [activeTasks, setActiveTasks] = useState<TaskStatus[]>([]);

  const addTask = useCallback((task: TaskStatus) => {
    setActiveTasks((prev) => {
      // Check if task already exists
      const exists = prev.some((t) => t.task_id === task.task_id);
      if (exists) {
        // Update existing task
        return prev.map((t) => (t.task_id === task.task_id ? task : t));
      }
      // Add new task to the beginning of the list
      return [task, ...prev];
    });
  }, []);

  const updateTask = useCallback(
    (taskId: string, updates: Partial<TaskStatus>) => {
      setActiveTasks((prev) =>
        prev.map((task) =>
          task.task_id === taskId ? { ...task, ...updates } : task
        )
      );
    },
    []
  );

  const removeTask = useCallback((taskId: string) => {
    setActiveTasks((prev) => prev.filter((task) => task.task_id !== taskId));
  }, []);

  const getTask = useCallback(
    (taskId: string) => {
      return activeTasks.find((task) => task.task_id === taskId);
    },
    [activeTasks]
  );

  const value = {
    activeTasks,
    addTask,
    updateTask,
    removeTask,
    getTask,
  };

  return <TaskContext.Provider value={value}>{children}</TaskContext.Provider>;
};
