export enum TaskPriority {
  CRITICAL = 'Critical',
  HIGH = 'High',
  MEDIUM = 'Medium',
  LOW = 'Low'
}

export enum TaskRecurrence {
  HOURLY = 'Hourly',
  DAILY = 'Daily',
  WEEKLY = 'Weekly',
  MONTHLY = 'Monthly',
  YEARLY = 'Yearly'
}

export interface TaskLog {
  action: 'created' | 'started' | 'paused' | 'completed' | 'updated';
  timestamp: string;
  details?: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  priority: TaskPriority;
  dueDate?: string;
  assignee?: string;
  completed: boolean;
  createdAt?: string;

  // New Fields
  recurrence?: TaskRecurrence;
  reminderTime?: string; // ISO String
  startedAt?: string | null;
  timeSpent?: number;
  logs?: TaskLog[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
  isThinking?: boolean;
  grounding?: GroundingMetadata;
  // UI helper props
  isTaskCreated?: boolean;
  createdTaskTitle?: string;
}

export interface GroundingMetadata {
  web?: { uri: string; title: string };
  maps?: { uri: string; title: string };
}