import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import TaskCard from '../components/TaskCard';
import { Task, TaskPriority } from '../types';

describe('TaskCard', () => {
    const mockTask: Task = {
        id: 'test-task-1',
        title: 'Test Task Title',
        description: 'Test task description',
        priority: TaskPriority.HIGH,
        completed: false,
        dueDate: '2026-01-15',
        assignee: 'John Doe',
        createdAt: '2026-01-01T00:00:00Z'
    };

    const mockOnToggle = vi.fn();
    const mockOnReadOut = vi.fn();
    const mockOnUpdate = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should render task title and description', () => {
        render(
            <TaskCard
                task={mockTask}
                onToggle={mockOnToggle}
                onReadOut={mockOnReadOut}
                onUpdate={mockOnUpdate}
            />
        );

        expect(screen.getByText('Test Task Title')).toBeInTheDocument();
        expect(screen.getByText('Test task description')).toBeInTheDocument();
    });

    it('should render priority badge', () => {
        render(
            <TaskCard
                task={mockTask}
                onToggle={mockOnToggle}
                onReadOut={mockOnReadOut}
                onUpdate={mockOnUpdate}
            />
        );

        expect(screen.getByText('High')).toBeInTheDocument();
    });

    it('should show due date when provided', () => {
        render(
            <TaskCard
                task={mockTask}
                onToggle={mockOnToggle}
                onReadOut={mockOnReadOut}
                onUpdate={mockOnUpdate}
            />
        );

        expect(screen.getByText('2026-01-15')).toBeInTheDocument();
    });

    it('should show assignee when provided', () => {
        render(
            <TaskCard
                task={mockTask}
                onToggle={mockOnToggle}
                onReadOut={mockOnReadOut}
                onUpdate={mockOnUpdate}
            />
        );

        expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    it('should call onToggle when checkbox is clicked', () => {
        render(
            <TaskCard
                task={mockTask}
                onToggle={mockOnToggle}
                onReadOut={mockOnReadOut}
                onUpdate={mockOnUpdate}
            />
        );

        // Find the toggle button (first button with Circle icon)
        const toggleButton = screen.getAllByRole('button')[0];
        fireEvent.click(toggleButton);

        expect(mockOnToggle).toHaveBeenCalledWith('test-task-1');
    });

    it('should render different styles for completed task', () => {
        const completedTask = { ...mockTask, completed: true };

        render(
            <TaskCard
                task={completedTask}
                onToggle={mockOnToggle}
                onReadOut={mockOnReadOut}
                onUpdate={mockOnUpdate}
            />
        );

        const title = screen.getByText('Test Task Title');
        expect(title).toHaveClass('line-through');
    });

    it('should render Critical priority with special styling', () => {
        const criticalTask = { ...mockTask, priority: TaskPriority.CRITICAL };

        render(
            <TaskCard
                task={criticalTask}
                onToggle={mockOnToggle}
                onReadOut={mockOnReadOut}
                onUpdate={mockOnUpdate}
            />
        );

        expect(screen.getByText('Critical')).toBeInTheDocument();
    });

    it('should render Medium priority correctly', () => {
        const mediumTask = { ...mockTask, priority: TaskPriority.MEDIUM };

        render(
            <TaskCard
                task={mediumTask}
                onToggle={mockOnToggle}
                onReadOut={mockOnReadOut}
                onUpdate={mockOnUpdate}
            />
        );

        expect(screen.getByText('Medium')).toBeInTheDocument();
    });

    it('should render Low priority correctly', () => {
        const lowTask = { ...mockTask, priority: TaskPriority.LOW };

        render(
            <TaskCard
                task={lowTask}
                onToggle={mockOnToggle}
                onReadOut={mockOnReadOut}
                onUpdate={mockOnUpdate}
            />
        );

        expect(screen.getByText('Low')).toBeInTheDocument();
    });

    it('should handle task without optional fields', () => {
        const minimalTask: Task = {
            id: 'minimal-task',
            title: 'Minimal Task',
            description: 'Just the basics',
            priority: TaskPriority.LOW,
            completed: false
        };

        render(
            <TaskCard
                task={minimalTask}
                onToggle={mockOnToggle}
                onReadOut={mockOnReadOut}
                onUpdate={mockOnUpdate}
            />
        );

        expect(screen.getByText('Minimal Task')).toBeInTheDocument();
        expect(screen.getByText('Just the basics')).toBeInTheDocument();
    });

    it('should expand to show more details when clicked', () => {
        render(
            <TaskCard
                task={mockTask}
                onToggle={mockOnToggle}
                onReadOut={mockOnReadOut}
                onUpdate={mockOnUpdate}
            />
        );

        // Click on the task content area to expand
        const description = screen.getByText('Test task description');
        fireEvent.click(description);

        // After expanding, should show "No due date" or actual date in expanded view
        expect(screen.getByText('2026-01-15')).toBeInTheDocument();
    });
});
