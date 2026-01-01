import { describe, it, expect } from 'vitest';
import { TaskPriority, Task, ChatMessage, GroundingMetadata } from '../types';

describe('types', () => {
    describe('TaskPriority enum', () => {
        it('should have CRITICAL priority', () => {
            expect(TaskPriority.CRITICAL).toBe('Critical');
        });

        it('should have HIGH priority', () => {
            expect(TaskPriority.HIGH).toBe('High');
        });

        it('should have MEDIUM priority', () => {
            expect(TaskPriority.MEDIUM).toBe('Medium');
        });

        it('should have LOW priority', () => {
            expect(TaskPriority.LOW).toBe('Low');
        });

        it('should have exactly 4 priority levels', () => {
            const values = Object.values(TaskPriority);
            expect(values).toHaveLength(4);
        });
    });

    describe('Task interface', () => {
        it('should allow creating a valid task object', () => {
            const task: Task = {
                id: 'task-001',
                title: 'Test Task',
                description: 'A test task description',
                priority: TaskPriority.HIGH,
                completed: false
            };

            expect(task.id).toBe('task-001');
            expect(task.title).toBe('Test Task');
            expect(task.description).toBe('A test task description');
            expect(task.priority).toBe(TaskPriority.HIGH);
            expect(task.completed).toBe(false);
        });

        it('should allow optional properties', () => {
            const task: Task = {
                id: 'task-002',
                title: 'Minimal Task',
                description: 'Description',
                priority: TaskPriority.LOW,
                completed: true,
                dueDate: '2026-01-15',
                assignee: 'John Doe',
                createdAt: '2026-01-01T00:00:00Z'
            };

            expect(task.dueDate).toBe('2026-01-15');
            expect(task.assignee).toBe('John Doe');
            expect(task.createdAt).toBe('2026-01-01T00:00:00Z');
        });
    });

    describe('ChatMessage interface', () => {
        it('should create a user message', () => {
            const message: ChatMessage = {
                id: 'msg-001',
                role: 'user',
                text: 'Hello, AI!',
                timestamp: new Date('2026-01-02T00:00:00Z')
            };

            expect(message.role).toBe('user');
            expect(message.text).toBe('Hello, AI!');
            expect(message.isThinking).toBeUndefined();
        });

        it('should create a model message with thinking state', () => {
            const message: ChatMessage = {
                id: 'msg-002',
                role: 'model',
                text: 'Processing...',
                timestamp: new Date(),
                isThinking: true
            };

            expect(message.role).toBe('model');
            expect(message.isThinking).toBe(true);
        });
    });

    describe('GroundingMetadata interface', () => {
        it('should support web grounding', () => {
            const metadata: GroundingMetadata = {
                web: {
                    uri: 'https://example.com',
                    title: 'Example Site'
                }
            };

            expect(metadata.web?.uri).toBe('https://example.com');
            expect(metadata.web?.title).toBe('Example Site');
        });

        it('should support maps grounding', () => {
            const metadata: GroundingMetadata = {
                maps: {
                    uri: 'https://maps.google.com/...',
                    title: 'Restaurant Location'
                }
            };

            expect(metadata.maps?.uri).toContain('maps.google.com');
        });

        it('should support both web and maps', () => {
            const metadata: GroundingMetadata = {
                web: { uri: 'https://example.com', title: 'Web' },
                maps: { uri: 'https://maps.google.com', title: 'Maps' }
            };

            expect(metadata.web).toBeDefined();
            expect(metadata.maps).toBeDefined();
        });
    });
});
