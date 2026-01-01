import React, { useState } from 'react';
import { Task, TaskPriority } from '../types';
import { CheckCircle2, Circle, Calendar, User, Volume2, Edit2, Save, X, AlertTriangle, AlertCircle, ChevronDown, ChevronUp, Clock, Hash } from 'lucide-react';

interface TaskCardProps {
  task: Task;
  onToggle: (id: string) => void;
  onReadOut: (text: string) => void;
  onUpdate: (id: string, updates: Partial<Task>) => void;
}

const priorityColors = {
  [TaskPriority.CRITICAL]: 'bg-red-500/20 text-red-300 border-red-500/50',
  [TaskPriority.HIGH]: 'bg-orange-500/20 text-orange-300 border-orange-500/50',
  [TaskPriority.MEDIUM]: 'bg-blue-500/20 text-blue-300 border-blue-500/50',
  [TaskPriority.LOW]: 'bg-slate-500/20 text-slate-300 border-slate-500/50',
};

const TaskCard: React.FC<TaskCardProps> = ({ task, onToggle, onReadOut, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [editedTitle, setEditedTitle] = useState(task.title);
  const [editedDescription, setEditedDescription] = useState(task.description);
  const [editedDueDate, setEditedDueDate] = useState(task.dueDate || '');

  const handleSave = () => {
    onUpdate(task.id, { 
      title: editedTitle, 
      description: editedDescription,
      dueDate: editedDueDate || undefined
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedTitle(task.title);
    setEditedDescription(task.description);
    setEditedDueDate(task.dueDate || '');
    setIsEditing(false);
  };

  const getContainerStyles = () => {
    // Added transition, duration, and transform for smooth animation
    const base = "p-4 rounded-xl border transition-all duration-300 ease-in-out transform hover:bg-slate-800 group";
    
    // Animation state based on completion: Scale down slightly and fade out/grayscale when completed
    const activeState = task.completed 
        ? 'opacity-50 scale-[0.98] grayscale-[0.5]' 
        : 'opacity-100 scale-100 grayscale-0';
    
    // If completed, revert to standard background to reduce visual noise
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

  if (isEditing) {
    return (
      <div className={`p-4 rounded-xl border border-indigo-500 bg-slate-800/80 transition-all shadow-lg shadow-indigo-500/10`}>
         <div className="flex flex-col gap-3">
            <input
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded-lg p-3 text-slate-100 focus:border-indigo-500 outline-none font-semibold w-full"
                placeholder="Task Title"
                autoFocus
            />
            <textarea
                value={editedDescription}
                onChange={(e) => setEditedDescription(e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded-lg p-3 text-slate-300 focus:border-indigo-500 outline-none text-sm resize-none h-24 w-full"
                placeholder="Description"
            />
            <div className="flex items-center gap-2">
                <span className="text-sm text-slate-400 flex items-center gap-2">
                    <Calendar className="w-4 h-4" /> Due Date:
                </span>
                <input 
                    type="date"
                    value={editedDueDate}
                    onChange={(e) => setEditedDueDate(e.target.value)}
                    className="bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-300 focus:border-indigo-500 outline-none text-sm"
                />
            </div>
            <div className="flex gap-2 justify-end">
                 <button 
                    onClick={handleCancel} 
                    className="p-2 text-slate-400 hover:text-white transition-colors flex items-center gap-1 text-sm"
                 >
                    <X className="w-4 h-4" /> Cancel
                 </button>
                 <button 
                    onClick={handleSave} 
                    className="py-2 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors flex items-center gap-2 text-sm font-medium shadow-lg shadow-indigo-500/20"
                 >
                    <Save className="w-4 h-4" /> Save Changes
                 </button>
            </div>
         </div>
      </div>
    );
  }

  return (
    <div className={getContainerStyles()}>
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
                <span className={`text-xs px-2 py-1 rounded-full border ${priorityColors[task.priority]} ml-2 shrink-0 flex items-center gap-1`}>
                {task.priority === TaskPriority.CRITICAL && <AlertTriangle className="w-3 h-3" />}
                {task.priority === TaskPriority.HIGH && <AlertCircle className="w-3 h-3" />}
                {task.priority}
                </span>
                {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
            </div>
          </div>
          
          <p className="text-slate-400 text-sm mt-1 mb-3 hover:text-indigo-300 transition-colors">
            {task.description}
          </p>
          
          {!isExpanded && (
              <div className="flex items-center gap-4 text-xs text-slate-500">
                {task.dueDate && (
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    <span>{task.dueDate}</span>
                  </div>
                )}
                {task.assignee && (
                  <div className="flex items-center gap-1">
                    <User className="w-3 h-3" />
                    <span>{task.assignee}</span>
                  </div>
                )}
              </div>
          )}
        </div>

        <div className="flex flex-col gap-1 shrink-0">
             <button 
                onClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
                className="p-2 rounded-full hover:bg-slate-700 text-slate-500 hover:text-indigo-400 transition-colors opacity-0 group-hover:opacity-100"
                title="Edit task"
            >
                <Edit2 className="w-5 h-5" />
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
                 <span className="text-slate-200">{task.dueDate || 'No due date'}</span>
             </div>
             <div className="flex flex-col gap-1">
                 <span className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-1">
                    <User className="w-3 h-3" /> Assignee
                 </span>
                 <span className="text-slate-200">{task.assignee || 'Unassigned'}</span>
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