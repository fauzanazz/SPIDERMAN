// Task history management using localStorage

export interface TaskHistoryItem {
  task_id: string;
  status: string;
  result?: any;
  created_at?: string;
  completed_at?: string;
  url?: string;
  error_message?: string;
  processing_time?: number;
}

const TASK_HISTORY_KEY = 'spiderman_task_history';
const MAX_HISTORY_ITEMS = 100; // Keep last 100 tasks

export class TaskHistoryManager {
  static getHistory(): TaskHistoryItem[] {
    try {
      const history = localStorage.getItem(TASK_HISTORY_KEY);
      return history ? JSON.parse(history) : [];
    } catch (error) {
      console.error('Error reading task history from localStorage:', error);
      return [];
    }
  }

  static saveTask(task: TaskHistoryItem): void {
    try {
      const history = this.getHistory();
      
      // Remove existing task with same ID if it exists
      const filteredHistory = history.filter(item => item.task_id !== task.task_id);
      
      // Add new task at the beginning
      filteredHistory.unshift({
        ...task,
        completed_at: new Date().toISOString()
      });
      
      // Keep only the last MAX_HISTORY_ITEMS
      const trimmedHistory = filteredHistory.slice(0, MAX_HISTORY_ITEMS);
      
      localStorage.setItem(TASK_HISTORY_KEY, JSON.stringify(trimmedHistory));
    } catch (error) {
      console.error('Error saving task to localStorage:', error);
    }
  }

  static updateTask(taskId: string, updates: Partial<TaskHistoryItem>): void {
    try {
      const history = this.getHistory();
      const taskIndex = history.findIndex(item => item.task_id === taskId);
      
      if (taskIndex !== -1) {
        history[taskIndex] = { ...history[taskIndex], ...updates };
        localStorage.setItem(TASK_HISTORY_KEY, JSON.stringify(history));
      } else {
        // If task doesn't exist, create it
        this.saveTask({ task_id: taskId, ...updates } as TaskHistoryItem);
      }
    } catch (error) {
      console.error('Error updating task in localStorage:', error);
    }
  }

  static getTask(taskId: string): TaskHistoryItem | null {
    const history = this.getHistory();
    return history.find(item => item.task_id === taskId) || null;
  }

  static clearHistory(): void {
    try {
      localStorage.removeItem(TASK_HISTORY_KEY);
    } catch (error) {
      console.error('Error clearing task history:', error);
    }
  }

  static getCompletedTasks(): TaskHistoryItem[] {
    return this.getHistory().filter(task => 
      task.status === 'SUCCESS' || task.status === 'FAILURE'
    );
  }

  static getFailedTasks(): TaskHistoryItem[] {
    return this.getHistory().filter(task => task.status === 'FAILURE');
  }

  static getSuccessfulTasks(): TaskHistoryItem[] {
    return this.getHistory().filter(task => task.status === 'SUCCESS');
  }
}