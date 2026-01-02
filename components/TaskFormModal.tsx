import React, { useState, useEffect } from 'react';
import { X, Calendar, Bell, Clock, Repeat, Check } from 'lucide-react';
import { Task, TaskPriority, TaskRecurrence } from '../types';

interface TaskFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (task: Partial<Task>) => void;
    initialTask?: Task;
}

const TaskFormModal: React.FC<TaskFormModalProps> = ({ isOpen, onClose, onSave, initialTask }) => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [priority, setPriority] = useState<TaskPriority>(TaskPriority.MEDIUM);
    const [dueDate, setDueDate] = useState('');
    const [reminderTime, setReminderTime] = useState('');
    const [recurrence, setRecurrence] = useState<TaskRecurrence | ''>('');

    useEffect(() => {
        if (initialTask) {
            setTitle(initialTask.title);
            setDescription(initialTask.description);
            setPriority(initialTask.priority);
            setDueDate(initialTask.dueDate ? initialTask.dueDate.slice(0, 16) : ''); // Format for datetime-local
            setReminderTime(initialTask.reminderTime ? initialTask.reminderTime.slice(0, 16) : '');
            setRecurrence(initialTask.recurrence || '');
        } else {
            // Reset
            setTitle('');
            setDescription('');
            setPriority(TaskPriority.MEDIUM);
            setDueDate('');
            setReminderTime('');
            setRecurrence('');
        }
    }, [initialTask, isOpen]);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({
            title,
            description,
            priority,
            dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
            reminderTime: reminderTime ? new Date(reminderTime).toISOString() : undefined,
            recurrence: recurrence || undefined
        });
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center p-6 border-b border-slate-800">
                    <h2 className="text-xl font-semibold text-white">
                        {initialTask ? 'Edit Task' : 'New Task'}
                    </h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {/* Title */}
                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">Title</label>
                        <input
                            type="text"
                            required
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                            placeholder="What needs to be done?"
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">Description</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={3}
                            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                            placeholder="Add details..."
                        />
                    </div>

                    {/* Priority */}
                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-2">Priority</label>
                        <div className="flex gap-2">
                            {Object.values(TaskPriority).map((p) => (
                                <button
                                    key={p}
                                    type="button"
                                    onClick={() => setPriority(p)}
                                    className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${priority === p
                                            ? getPriorityColor(p)
                                            : 'border-slate-700 text-slate-400 hover:bg-slate-800'
                                        }`}
                                >
                                    {p}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        {/* Due Date */}
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-1 flex items-center gap-1">
                                <Calendar className="w-4 h-4" /> Due Date
                            </label>
                            <input
                                type="datetime-local"
                                value={dueDate}
                                onChange={(e) => setDueDate(e.target.value)}
                                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white/90 focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                            />
                        </div>

                        {/* Reminder */}
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-1 flex items-center gap-1">
                                <Bell className="w-4 h-4" /> Reminder
                            </label>
                            <input
                                type="datetime-local"
                                value={reminderTime}
                                onChange={(e) => setReminderTime(e.target.value)}
                                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white/90 focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                            />
                        </div>
                    </div>

                    {/* Recurrence */}
                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1 flex items-center gap-1">
                            <Repeat className="w-4 h-4" /> Recurrence
                        </label>
                        <select
                            value={recurrence}
                            onChange={(e) => setRecurrence(e.target.value as TaskRecurrence)}
                            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                        >
                            <option value="">No Repeat</option>
                            {Object.values(TaskRecurrence).map((r) => (
                                <option key={r} value={r}>{r}</option>
                            ))}
                        </select>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 font-medium hover:bg-slate-800 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="flex-1 px-4 py-2.5 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-500 transition-colors"
                        >
                            Save Task
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const getPriorityColor = (priority: TaskPriority) => {
    switch (priority) {
        case TaskPriority.CRITICAL: return 'bg-red-500/20 text-red-400 border-red-500/50';
        case TaskPriority.HIGH: return 'bg-orange-500/20 text-orange-400 border-orange-500/50';
        case TaskPriority.MEDIUM: return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50';
        case TaskPriority.LOW: return 'bg-blue-500/20 text-blue-400 border-blue-500/50';
        default: return 'bg-slate-800 text-slate-400 border-slate-700';
    }
};

export default TaskFormModal;
