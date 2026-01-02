import React, { useState, useEffect } from 'react';
import { Task, TaskPriority } from '../types';
import { CheckCircle2, Circle, Calendar, User, Volume2, Edit2, Save, X, AlertTriangle, AlertCircle, ChevronDown, ChevronUp, Clock, Hash, Trash2, Play, Pause, Bell, Repeat } from 'lucide-react';

interface TaskCardProps {
  task: Task;
  onToggle: (id: string) => void;
  onReadOut: (text: string) => void;
  onUpdate: (id: string, updates: Partial<Task>) => void;
  onDelete: (id: string) => void;
  onEditRequest: (task: Task) => void; // Use modal for full edit
}

const priorityColors = {
  [TaskPriority.CRITICAL]: 'bg-red-500/20 text-red-300 border-red-500/50',
  [TaskPriority.HIGH]: 'bg-orange-500/20 text-orange-300 border-orange-500/50',
  [TaskPriority.MEDIUM]: 'bg-blue-500/20 text-blue-300 border-blue-500/50',
  [TaskPriority.LOW]: 'bg-slate-500/20 text-slate-300 border-slate-500/50',
};

const TaskCard: React.FC<TaskCardProps> = ({ task, onToggle, onReadOut, onUpdate, onDelete, onEditRequest }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [elapsed, setElapsed] = useState(task.timeSpent || 0);

  // Timer Effect
  useEffect(() => {
    let interval: any;
    if (task.startedAt) {
      interval = setInterval(() => {
        const start = new Date(task.startedAt!).getTime();
        const now = new Date().getTime();
        setElapsed((task.timeSpent || 0) + (now - start));
      }, 1000);
    } else {
      setElapsed(task.timeSpent || 0);
    }
    return () => clearInterval(interval);
  }, [task.startedAt, task.timeSpent]);

  const formatTime = (ms: number) => {
    const seconds = Math.floor((ms / 1000) % 60);
    const minutes = Math.floor((ms / (1000 * 60)) % 60);
    const hours = Math.floor(ms / (1000 * 60 * 60));
    return `${hours}h ${minutes}m ${seconds}s`;
  };

  const handleToggleTimer = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (task.startedAt) {
      // Stop Timer
      const start = new Date(task.startedAt).getTime();
      const now = new Date().getTime();
      const sessionDuration = now - start;
      onUpdate(task.id, {
        startedAt: null,
        timeSpent: (task.timeSpent || 0) + sessionDuration
      });
    } else {
      // Start Timer
      onUpdate(task.id, {
        startedAt: new Date().toISOString()
      });
    }
  };

  const getContainerStyles = () => {
    const base = "p-4 rounded-xl border transition-all duration-300 ease-in-out transform hover:bg-slate-800 group relative overflow-hidden";
    const activeState = task.completed
      ? 'opacity-50 scale-[0.98] grayscale-[0.5]'
      : 'opacity-100 scale-100 grayscale-0';

    if (task.completed) {
      return `${base} border-slate-700 bg-slate-800/50 ${activeState}`;
    }

    switch (task.priority) {
      case TaskPriority.CRITICAL:
        return `${base} border-red-500/60 bg-red-950/10 shadow-[0_0_15px_rgba(239,68,68,0.15)] hover:border-red-500/80 ${activeState}`;
      case TaskPriority.HIGH:
        return `${base} border-orange-500/60 bg-orange-950/10 shadow-[0_0_10px_rgba(249,115,22,0.15)] hover:border-orange-500/80 ${activeState}`;
      default:
        return `${base} border-slate-700 bg-slate-800/50 ${activeState}`;
    }
  };

  return (
    <div className={getContainerStyles()}>
      {/* Active Timer Indicator Background */}
      {task.startedAt && !task.completed && (
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none animate-pulse"></div>
      )}

      <div className="flex items-start gap-4">
        <button
          onClick={(e) => { e.stopPropagation(); onToggle(task.id); }}
          className="mt-1 text-slate-400 hover:text-emerald-400 transition-all duration-200 active:scale-90 shrink-0"
        >
          {task.completed ? <CheckCircle2 className="w-6 h-6 text-emerald-500" /> : <Circle className="w-6 h-6" />}
        </button>

        <div
          className="flex-1 cursor-pointer"
          onClick={() => setIsExpanded(!isExpanded)}
          title={isExpanded ? "Click to collapse" : "Click to view details"}
        >
          <div className="flex justify-between items-start">
            <h3 className={`font-semibold text-lg hover:text-indigo-400 transition-colors ${task.completed ? 'line-through text-slate-500' : 'text-slate-100'}`}>
              {task.title}
            </h3>
            <div className="flex items-center gap-2">
              {/* Timer Display */}
              {(elapsed > 0 || task.startedAt) && (
                <span className={`text-xs font-mono px-2 py-1 rounded bg-slate-900 border border-slate-700 ${task.startedAt ? 'text-indigo-400 border-indigo-500/50' : 'text-slate-400'}`}>
                  {formatTime(elapsed)}
                </span>
              )}

              <span className={`text-xs px-2 py-1 rounded-full border ${priorityColors[task.priority]} ml-2 shrink-0 flex items-center gap-1`}>
                {task.priority === TaskPriority.CRITICAL && <AlertTriangle className="w-3 h-3" />}
                {task.priority === TaskPriority.HIGH && <AlertCircle className="w-3 h-3" />}
                {task.priority}
              </span>
              {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
            </div>
          </div>

          <p className="text-slate-400 text-sm mt-1 mb-3 hover:text-indigo-300 transition-colors line-clamp-2">
            {task.description}
          </p>

          <div className="flex items-center gap-4 text-xs text-slate-500">
            {task.dueDate && (
              <div className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                <span>{new Date(task.dueDate).toLocaleDateString()}</span>
              </div>
            )}
            {task.recurrence && (
              <div className="flex items-center gap-1 text-indigo-400">
                <Repeat className="w-3 h-3" />
                <span>{task.recurrence}</span>
              </div>
            )}
            {task.reminderTime && (
              <div className="flex items-center gap-1 text-amber-400">
                <Bell className="w-3 h-3" />
                <span>{new Date(task.reminderTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-1 shrink-0">
          {/* Timer Button */}
          <button
            onClick={handleToggleTimer}
            className={`p-2 rounded-full transition-colors ${task.startedAt ? 'text-indigo-400 hover:text-indigo-300 bg-indigo-500/20' : 'text-slate-500 hover:text-indigo-400 hover:bg-slate-700'}`}
            title={task.startedAt ? "Pause Timer" : "Start Timer"}
          >
            {task.startedAt ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 ml-0.5 fill-current" />}
          </button>

          <button
            onClick={(e) => { e.stopPropagation(); onEditRequest(task); }}
            className="p-2 rounded-full hover:bg-slate-700 text-slate-500 hover:text-indigo-400 transition-colors opacity-0 group-hover:opacity-100"
            title="Edit task"
          >
            <Edit2 className="w-5 h-5" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(task.id); }}
            className="p-2 rounded-full hover:bg-slate-700 text-slate-500 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
            title="Delete task"
          >
            <Trash2 className="w-5 h-5" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onReadOut(`Task: ${task.title}. ${task.description}`); }}
            className="p-2 rounded-full hover:bg-slate-700 text-slate-500 hover:text-sky-400 transition-colors opacity-0 group-hover:opacity-100"
            title="Read out loud"
          >
            <Volume2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-slate-700/50 grid grid-cols-2 gap-y-4 gap-x-2 text-sm text-slate-400 animate-fade-in">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-1">
              <Calendar className="w-3 h-3" /> Due Date
            </span>
            <span className="text-slate-200">{task.dueDate ? new Date(task.dueDate).toLocaleString() : 'No due date'}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-1">
              <Clock className="w-3 h-3" /> Time Spent
            </span>
            <span className="text-slate-200 font-mono">{formatTime(elapsed)}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-1">
              <Clock className="w-3 h-3" /> Created At
            </span>
            <span className="text-slate-200">
              {task.createdAt ? new Date(task.createdAt).toLocaleString() : 'Just now'}
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-1">
              <Hash className="w-3 h-3" /> Task ID
            </span>
            <span className="text-slate-500 text-xs font-mono truncate" title={task.id}>
              {task.id}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskCard;