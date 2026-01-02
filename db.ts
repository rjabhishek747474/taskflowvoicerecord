import Dexie, { Table } from 'dexie';
import { Task, TaskPriority } from './types';

export interface Recording {
    id?: number;
    transcript: string;
    summary?: string;
    timestamp: string; // ISO string
    duration?: number; // seconds
}

export interface ChatMessageDB {
    id?: number;
    recordingId?: number; // Optional link to a specific recording context
    role: 'user' | 'model';
    text: string;
    timestamp: string;
}

export class TaskFlowDatabase extends Dexie {
    recordings!: Table<Recording>;
    tasks!: Table<Task>;
    chats!: Table<ChatMessageDB>;

    constructor() {
        super('TaskFlowDB');
        this.version(1).stores({
            recordings: '++id, timestamp',
            tasks: 'id, priority, completed, createdAt, [completed+priority]', // Compound index for filtering
            chats: '++id, recordingId, timestamp'
        });

        // Version 2: Add reminderTime index
        this.version(2).stores({
            tasks: 'id, priority, completed, createdAt, reminderTime, [completed+priority]'
        });
    }
}

export const db = new TaskFlowDatabase();
