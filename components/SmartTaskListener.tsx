import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Mic, Square, Loader2, Sparkles, AlertCircle, Filter, ArrowUpDown, Plus } from 'lucide-react';
import { transcribeAudio, analyzeTasksFromText, generateSpeechBase64 } from '../services/geminiService';
import { Task, TaskPriority, TaskRecurrence } from '../types';
import TaskCard from './TaskCard';
import TaskFormModal from './TaskFormModal';
import { base64ToUint8Array, decodeAudioData } from '../services/audioUtils';
import { db, Recording } from '../db';
import HistoryViewer from './HistoryViewer';

interface SmartTaskListenerProps {
  onChatRequest?: (context: string) => void;
}

const SmartTaskListener: React.FC<SmartTaskListenerProps> = ({ onChatRequest }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [processingState, setProcessingState] = useState<'idle' | 'transcribing' | 'thinking' | 'done' | 'error'>('idle');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [transcript, setTranscript] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [sort, setSort] = useState<'newest' | 'priority' | 'date'>('newest');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | undefined>(undefined);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [errorMsg, setErrorMsg] = useState('');
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    // Load tasks from DB on mount
    const loadTasks = async () => {
      const storedTasks = await db.tasks.toArray();
      setTasks(storedTasks.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()));
    };
    loadTasks();

    if ("Notification" in window) {
      Notification.requestPermission();
    }
    audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    return () => {
      audioContextRef.current?.close();
    }
  }, []);

  // Reminder Check Effect
  useEffect(() => {
    const checkReminders = () => {
      const now = new Date();
      tasks.forEach(task => {
        if (!task.completed && task.reminderTime) {
          const reminder = new Date(task.reminderTime);
          // Check if due within the last minute (to avoid missed checks or double checks)
          // Actually, if simply < now, we notify and clear.
          if (reminder <= now) {
            if (Notification.permission === 'granted') {
              new Notification(`⏰ Reminder: ${task.title}`, {
                body: task.description || 'Time to work on this task!',
                icon: '/favicon.ico'
              });
            }
            // Clear reminder so it doesn't trigger again
            updateTask(task.id, { reminderTime: undefined });
          }
        }
      });
    };
    const interval = setInterval(checkReminders, 10000); // Check every 10s
    return () => clearInterval(interval);
  }, [tasks]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });

      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = handleStopRecording;

      mediaRecorder.start();
      setIsRecording(true);
      setErrorMsg('');
      setProcessingState('idle');
    } catch (err) {
      console.error("Error accessing microphone:", err);
      setErrorMsg("Could not access microphone.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
  };

  const handleStopRecording = async () => {
    setProcessingState('transcribing');
    const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });

    try {
      // 1. Transcribe
      const text = await transcribeAudio(audioBlob);
      setTranscript(text);

      // 2. Analyze
      setProcessingState('thinking');
      const extractedTasks = await analyzeTasksFromText(text);

      setTasks(prev => [...extractedTasks, ...prev]);

      // 3. Save to History
      await db.recordings.add({
        transcript: text,
        timestamp: new Date().toISOString(),
        summary: extractedTasks.length > 0 ? `Detected ${extractedTasks.length} tasks` : undefined
      });

      if (extractedTasks.length > 0) {
        await db.tasks.bulkAdd(extractedTasks);
      }

      setProcessingState('done');

      // 4. Notify
      const criticalTasks = extractedTasks.filter(t => t.priority === 'Critical' || t.priority === 'High');
      if (criticalTasks.length > 0 && Notification.permission === "granted") {
        new Notification("New High Priority Tasks Detected", {
          body: `Added ${criticalTasks.length} urgent tasks from your conversation.`
        });
      }

    } catch (err: any) {
      console.error("Processing failed", err);
      let errorMessage = "Failed to process audio. Please try again.";
      if (err?.message?.includes('API_KEY_MISSING')) {
        errorMessage = "⚠️ API key missing! Add GEMINI_API_KEY to .env.local file.";
      } else if (err?.message?.includes('API_KEY_INVALID')) {
        errorMessage = "⚠️ Invalid API key! Check your GEMINI_API_KEY in .env.local";
      }
      setErrorMsg(errorMessage);
      setProcessingState('error');
    }
  };

  const playTTS = async (text: string) => {
    try {
      const base64Audio = await generateSpeechBase64(text);
      if (base64Audio && audioContextRef.current) {
        const audioBuffer = await decodeAudioData(base64ToUint8Array(base64Audio), audioContextRef.current);
        const source = audioContextRef.current.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContextRef.current.destination);
        source.start(0);
      }
    } catch (e) {
      console.error("TTS play error", e);
    }
  }

  const toggleTask = async (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    const newCompleted = !task.completed;

    // Recurrence Logic
    if (newCompleted && task.recurrence) {
      const nextDate = new Date(task.dueDate || Date.now());
      switch (task.recurrence) {
        case TaskRecurrence.HOURLY: nextDate.setHours(nextDate.getHours() + 1); break;
        case TaskRecurrence.DAILY: nextDate.setDate(nextDate.getDate() + 1); break;
        case TaskRecurrence.WEEKLY: nextDate.setDate(nextDate.getDate() + 7); break;
        case TaskRecurrence.MONTHLY: nextDate.setMonth(nextDate.getMonth() + 1); break;
        case TaskRecurrence.YEARLY: nextDate.setFullYear(nextDate.getFullYear() + 1); break;
      }

      const newTask: Task = {
        ...task,
        id: crypto.randomUUID(),
        dueDate: nextDate.toISOString(),
        completed: false,
        createdAt: new Date().toISOString(),
        // Clean slate for new instance
        startedAt: null,
        timeSpent: 0
      };

      await db.tasks.add(newTask);
      setTasks(prev => [newTask, ...prev]);

      if (Notification.permission === 'granted') {
        new Notification("Returning Task Scheduled", { body: `Scheduled next instance of: ${task.title}` });
      }
    }

    setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: newCompleted } : t));
    db.tasks.update(id, { completed: newCompleted });
  };

  const updateTask = (id: string, updates: Partial<Task>) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
    db.tasks.update(id, updates);
  };

  const deleteTask = (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
    db.tasks.delete(id);
  };

  const handleOpenAddModal = () => {
    setEditingTask(undefined);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (task: Task) => {
    setEditingTask(task);
    setIsModalOpen(true);
  };

  const handleSaveModal = async (updates: Partial<Task>) => {
    if (editingTask) {
      updateTask(editingTask.id, updates);
    } else {
      // Create new
      const newTask: Task = {
        id: crypto.randomUUID(),
        title: updates.title || 'Untitled Task',
        description: updates.description || '',
        priority: updates.priority || TaskPriority.MEDIUM,
        completed: false,
        createdAt: new Date().toISOString(),
        dueDate: updates.dueDate,
        reminderTime: updates.reminderTime,
        recurrence: updates.recurrence,
        assignee: 'Me',
        timeSpent: 0
      };
      await db.tasks.add(newTask);
      setTasks(prev => [newTask, ...prev]);
    }
  };

  const handleHistorySelect = (rec: Recording) => {
    setTranscript(rec.transcript);
  };

  const processedTasks = useMemo(() => {
    let result = [...tasks];
    if (filter === 'active') result = result.filter(t => !t.completed);
    else if (filter === 'completed') result = result.filter(t => t.completed);

    if (sort === 'priority') {
      const pOrder = { [TaskPriority.CRITICAL]: 0, [TaskPriority.HIGH]: 1, [TaskPriority.MEDIUM]: 2, [TaskPriority.LOW]: 3 };
      result.sort((a, b) => pOrder[a.priority] - pOrder[b.priority]);
    } else if (sort === 'date') {
      result.sort((a, b) => {
        if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
        if (a.dueDate) return -1;
        if (b.dueDate) return 1;
        return 0;
      });
    }
    return result;
  }, [tasks, filter, sort]);

  return (
    <div className="flex gap-6 h-[calc(100vh-8rem)]">
      {/* Sidebar: History */}
      <div className="w-80 h-full hidden lg:block">
        <HistoryViewer
          onSelect={handleHistorySelect}
          onChat={(rec) => onChatRequest?.(rec.transcript)}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col gap-6 overflow-y-auto pr-2 custom-scrollbar relative">
        <TaskFormModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSaveModal}
          initialTask={editingTask}
        />

        <div className="text-center mb-4">
          <h2 className="text-3xl font-bold mb-4 bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
            Conversation Intelligence
          </h2>
          <div className="flex justify-center mb-6">
            {!isRecording ? (
              <button
                onClick={startRecording}
                className="flex items-center gap-2 px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full font-semibold shadow-lg shadow-indigo-500/30 transition-all transform hover:scale-105"
              >
                <Mic className="w-6 h-6" />
                Start Listening
              </button>
            ) : (
              <button
                onClick={stopRecording}
                className="flex items-center gap-2 px-8 py-4 bg-rose-600 hover:bg-rose-500 text-white rounded-full font-semibold shadow-lg shadow-rose-500/30 animate-pulse"
              >
                <Square className="w-6 h-6 fill-current" />
                Stop Recording
              </button>
            )}
          </div>

          {/* Add Task Button */}
          <button
            onClick={handleOpenAddModal}
            className="absolute top-0 right-0 p-3 bg-indigo-600 rounded-full shadow-lg hover:bg-indigo-500 transition-colors z-10"
            title="Manually Add Task"
          >
            <Plus className="w-6 h-6 text-white" />
          </button>

          {processingState !== 'idle' && processingState !== 'done' && processingState !== 'error' && (
            <div className="flex flex-col items-center gap-3 animate-fade-in p-4 bg-slate-900/80 rounded-xl border border-indigo-500/30 backdrop-blur-sm max-w-sm mx-auto">
              <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
              <p className="text-cyan-300 font-medium">
                {processingState === 'transcribing' && "Transcribing audio..."}
                {processingState === 'thinking' && "Analyzing & Prioritizing..."}
              </p>
            </div>
          )}

          {errorMsg && (
            <div className="flex items-center justify-center gap-2 text-rose-400 mt-4 bg-rose-900/20 p-2 rounded-lg inline-block px-4">
              <AlertCircle className="w-5 h-5" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-8 flex-1">
          {/* Transcript Area */}
          <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800 flex flex-col">
            <h3 className="text-slate-400 text-sm font-semibold uppercase tracking-wider mb-4">Live Transcript</h3>
            <div className="flex-1 overflow-y-auto text-slate-300 space-y-2 font-mono text-sm leading-relaxed custom-scrollbar min-h-[300px]">
              {transcript ? transcript : <span className="text-slate-600 italic">Recording transcript will appear here...</span>}
            </div>
          </div>

          {/* Tasks Area */}
          <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <h3 className="text-slate-400 text-sm font-semibold uppercase tracking-wider">Identified Tasks</h3>
                <Sparkles className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-xs text-slate-500">
                {processedTasks.length} {processedTasks.length === 1 ? 'task' : 'tasks'}
              </div>
            </div>

            {/* Filters & Sorting */}
            <div className="flex gap-2 mb-4">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                  <Filter className="w-4 h-4 text-slate-400" />
                </div>
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value as any)}
                  className="bg-slate-800 border border-slate-700 text-slate-300 text-xs rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-9 p-2 appearance-none cursor-pointer"
                >
                  <option value="all">All Tasks</option>
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                  <ArrowUpDown className="w-4 h-4 text-slate-400" />
                </div>
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value as any)}
                  className="bg-slate-800 border border-slate-700 text-slate-300 text-xs rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-9 p-2 appearance-none cursor-pointer"
                >
                  <option value="newest">Newest</option>
                  <option value="priority">Priority</option>
                  <option value="date">Due Date</option>
                </select>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar min-h-[300px]">
              {processedTasks.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-600">
                  <p>{tasks.length === 0 ? "No tasks identified yet." : "No tasks match filter."}</p>
                </div>
              ) : (
                processedTasks.map(task => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onToggle={toggleTask}
                    onReadOut={playTTS}
                    onUpdate={updateTask}
                    onDelete={deleteTask}
                    onEditRequest={handleOpenEditModal}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default SmartTaskListener;