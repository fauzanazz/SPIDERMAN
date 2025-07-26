import type { TaskStatus } from "@/lib/api/task-api";
import { createContext, useContext } from "react";
interface TaskContextType {
  activeTasks: TaskStatus[];
  addTask: (task: TaskStatus) => void;
  updateTask: (taskId: string, updates: Partial<TaskStatus>) => void;
  removeTask: (taskId: string) => void;
  getTask: (taskId: string) => TaskStatus | undefined;
}
export const TaskContext = createContext<TaskContextType | undefined>(
  undefined
);

export const useTaskContext = () => {
  const context = useContext(TaskContext);
  if (!context) {
    throw new Error("useTaskContext must be used within a TaskProvider");
  }
  return context;
};
