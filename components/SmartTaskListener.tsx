import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Mic, Square, Loader2, Sparkles, AlertCircle, Filter, ArrowUpDown } from 'lucide-react';
import { transcribeAudio, analyzeTasksFromText, generateSpeechBase64 } from '../services/geminiService';
import { Task, TaskPriority } from '../types';
import TaskCard from './TaskCard';
import { base64ToUint8Array, decodeAudioData } from '../services/audioUtils';

const SmartTaskListener: React.FC = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [processingState, setProcessingState] = useState<'idle' | 'transcribing' | 'thinking' | 'done' | 'error'>('idle');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [transcript, setTranscript] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [sort, setSort] = useState<'newest' | 'priority' | 'date'>('newest');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [errorMsg, setErrorMsg] = useState('');
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    // Request notification permission on mount
    if ("Notification" in window) {
      Notification.requestPermission();
    }
    audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    return () => {
      audioContextRef.current?.close();
    }
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' }); // webm is widely supported for recording

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
      // Stop all tracks
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
  };

  const handleStopRecording = async () => {
    setProcessingState('transcribing');
    const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });

    try {
      // 1. Transcribe (Flash)
      const text = await transcribeAudio(audioBlob);
      setTranscript(text);

      // 2. Think & Analyze (Pro)
      setProcessingState('thinking');
      const extractedTasks = await analyzeTasksFromText(text);

      setTasks(prev => [...extractedTasks, ...prev]); // Add new tasks to top
      setProcessingState('done');

      // 3. Notify high priority
      const criticalTasks = extractedTasks.filter(t => t.priority === 'Critical' || t.priority === 'High');
      if (criticalTasks.length > 0 && Notification.permission === "granted") {
        new Notification("New High Priority Tasks Detected", {
          body: `Added ${criticalTasks.length} urgent tasks from your conversation.`
        });
      }

    } catch (err: any) {
      console.error("Processing failed", err);

      // Provide specific error messages for common issues
      let errorMessage = "Failed to process audio. Please try again.";
      if (err?.message?.includes('API_KEY_MISSING')) {
        errorMessage = "⚠️ API key missing! Add GEMINI_API_KEY to .env.local file.";
      } else if (err?.message?.includes('API_KEY_INVALID') || err?.message?.includes('API key not valid')) {
        errorMessage = "⚠️ Invalid API key! Check your GEMINI_API_KEY in .env.local";
      } else if (err?.message?.includes('network') || err?.name === 'TypeError') {
        errorMessage = "Network error. Please check your internet connection.";
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

  const toggleTask = (id: string) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const updateTask = (id: string, updates: Partial<Task>) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, ...updates } : t));
  };

  const processedTasks = useMemo(() => {
    let result = [...tasks];

    // Filter
    if (filter === 'active') {
      result = result.filter(t => !t.completed);
    } else if (filter === 'completed') {
      result = result.filter(t => t.completed);
    }

    // Sort
    if (sort === 'priority') {
      const pOrder = { [TaskPriority.CRITICAL]: 0, [TaskPriority.HIGH]: 1, [TaskPriority.MEDIUM]: 2, [TaskPriority.LOW]: 3 };
      result.sort((a, b) => pOrder[a.priority] - pOrder[b.priority]);
    } else if (sort === 'date') {
      result.sort((a, b) => {
        if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
        if (a.dueDate) return -1; // Dates come first
        if (b.dueDate) return 1;
        return 0;
      });
    }
    // 'newest' is default (array order)

    return result;
  }, [tasks, filter, sort]);

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8 text-center">
        <h2 className="text-3xl font-bold mb-4 bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
          Conversation Intelligence
        </h2>
        <p className="text-slate-400 mb-8">
          Record your meetings or thoughts. Gemini 2.5 Flash will transcribe, and Gemini 3.0 Pro will think deeply to prioritize your tasks.
        </p>

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

        {processingState !== 'idle' && processingState !== 'done' && processingState !== 'error' && (
          <div className="flex flex-col items-center gap-3 animate-fade-in">
            <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
            <p className="text-cyan-300 font-medium">
              {processingState === 'transcribing' && "Transcribing audio..."}
              {processingState === 'thinking' && "Analyzing & Prioritizing (Thinking Mode)..."}
            </p>
          </div>
        )}

        {errorMsg && (
          <div className="flex items-center justify-center gap-2 text-rose-400 mt-4">
            <AlertCircle className="w-5 h-5" />
            <span>{errorMsg}</span>
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Transcript Area */}
        <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
          <h3 className="text-slate-400 text-sm font-semibold uppercase tracking-wider mb-4">Live Transcript</h3>
          <div className="h-[400px] overflow-y-auto text-slate-300 space-y-2 font-mono text-sm leading-relaxed">
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

          <div className="h-[350px] overflow-y-auto space-y-3">
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
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SmartTaskListener;