import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { Mic, MicOff, Power, Radio, Activity } from 'lucide-react';
import { float32ToPCM16, decodeAudioData, arrayBufferToBase64, base64ToUint8Array } from '../services/audioUtils';

const LiveAssistant: React.FC = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  
  // Audio Contexts
  const inputContextRef = useRef<AudioContext | null>(null);
  const outputContextRef = useRef<AudioContext | null>(null);
  
  // Stream & Processing
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  
  // Playback
  const nextStartTimeRef = useRef<number>(0);
  const scheduledSourcesRef = useRef<AudioBufferSourceNode[]>([]);

  const sessionRef = useRef<any>(null);

  const addLog = (msg: string) => setLogs(prev => [msg, ...prev].slice(0, 5));

  const connect = async () => {
    try {
      const apiKey = process.env.API_KEY;
      if (!apiKey) {
        alert("API Key missing");
        return;
      }
      
      const ai = new GoogleGenAI({ apiKey });
      
      // Setup Audio
      inputContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      outputContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      addLog("Connecting to Live API...");

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
          },
          systemInstruction: "You are a helpful, quick-witted personal assistant managing the user's day.",
        },
        callbacks: {
          onopen: () => {
            addLog("Session Open");
            setIsConnected(true);
            
            // Start input streaming
            if (!inputContextRef.current) return;
            
            const source = inputContextRef.current.createMediaStreamSource(stream);
            sourceRef.current = source;
            
            // Using ScriptProcessor as per guide (AudioWorklet is better for prod but requires separate file/bundling complex)
            const processor = inputContextRef.current.createScriptProcessor(4096, 1, 1);
            processorRef.current = processor;
            
            processor.onaudioprocess = (e) => {
              if (isMuted) return; // simple mute
              const inputData = e.inputBuffer.getChannelData(0);
              const pcm16 = float32ToPCM16(inputData);
              const base64Data = arrayBufferToBase64(pcm16.buffer);
              
              sessionPromise.then(session => {
                  session.sendRealtimeInput({
                      media: {
                          mimeType: 'audio/pcm;rate=16000',
                          data: base64Data
                      }
                  });
              });
            };

            source.connect(processor);
            processor.connect(inputContextRef.current.destination);
          },
          onmessage: async (msg: LiveServerMessage) => {
             // Handle Audio Output
             const base64Audio = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
             if (base64Audio && outputContextRef.current) {
                const ctx = outputContextRef.current;
                const audioBuffer = await decodeAudioData(
                    base64ToUint8Array(base64Audio), 
                    ctx
                );
                
                const source = ctx.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(ctx.destination);
                
                // Gapless playback logic
                const currentTime = ctx.currentTime;
                if (nextStartTimeRef.current < currentTime) {
                    nextStartTimeRef.current = currentTime;
                }
                
                source.start(nextStartTimeRef.current);
                nextStartTimeRef.current += audioBuffer.duration;
                scheduledSourcesRef.current.push(source);
             }

             // Handle Interruption
             if (msg.serverContent?.interrupted) {
                 addLog("Interrupted");
                 scheduledSourcesRef.current.forEach(s => {
                     try { s.stop(); } catch(e) {}
                 });
                 scheduledSourcesRef.current = [];
                 nextStartTimeRef.current = 0;
             }
          },
          onclose: () => {
            addLog("Session Closed");
            disconnect();
          },
          onerror: (e) => {
            console.error(e);
            addLog("Error occurred");
            disconnect();
          }
        }
      });
      sessionRef.current = sessionPromise;

    } catch (e) {
      console.error(e);
      addLog("Connection failed");
    }
  };

  const disconnect = () => {
    // Stop Audio tracks
    streamRef.current?.getTracks().forEach(t => t.stop());
    sourceRef.current?.disconnect();
    processorRef.current?.disconnect();
    
    inputContextRef.current?.close();
    outputContextRef.current?.close();
    
    // Close Session (The library doesn't expose a clean sync close method on the promise easily, 
    // but typically closing the WebSocket is internal. We reset state.)
    // In a real app we would call session.close() if exposed or just drop references.
    // The guide says: Use `session.close()` to close the connection.
    sessionRef.current?.then((s: any) => s.close());

    setIsConnected(false);
    setIsMuted(false);
    setLogs([]);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[500px] bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-900 rounded-3xl p-8 relative overflow-hidden shadow-2xl border border-indigo-500/30">
      
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none">
        <div className="absolute top-10 left-10 w-64 h-64 bg-cyan-500 rounded-full blur-[100px]"></div>
        <div className="absolute bottom-10 right-10 w-64 h-64 bg-pink-500 rounded-full blur-[100px]"></div>
      </div>

      <div className="z-10 text-center mb-12">
        <div className={`w-32 h-32 mx-auto rounded-full flex items-center justify-center transition-all duration-500 ${isConnected ? 'bg-indigo-500 shadow-[0_0_50px_rgba(99,102,241,0.6)] animate-pulse' : 'bg-slate-700'}`}>
           <Activity className={`w-16 h-16 ${isConnected ? 'text-white' : 'text-slate-400'}`} />
        </div>
        <h2 className="text-2xl font-bold mt-6 text-white">Live Voice Assistant</h2>
        <p className="text-indigo-200 mt-2">Powered by Gemini 2.5 Native Audio</p>
      </div>

      <div className="z-10 flex gap-6">
        {!isConnected ? (
           <button 
             onClick={connect}
             className="flex items-center gap-3 px-8 py-4 bg-white text-indigo-900 rounded-full font-bold hover:bg-indigo-50 transition-all shadow-xl hover:scale-105"
           >
             <Radio className="w-5 h-5" />
             Connect Live
           </button>
        ) : (
           <>
             <button 
               onClick={() => setIsMuted(!isMuted)}
               className={`p-4 rounded-full border-2 transition-all ${isMuted ? 'bg-rose-500/20 border-rose-500 text-rose-400' : 'bg-slate-800/50 border-slate-600 text-white hover:bg-slate-700'}`}
             >
               {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
             </button>
             
             <button 
               onClick={disconnect}
               className="px-8 py-4 bg-rose-600 text-white rounded-full font-bold hover:bg-rose-700 transition-all shadow-xl flex items-center gap-2"
             >
               <Power className="w-5 h-5" />
               End Session
             </button>
           </>
        )}
      </div>

      <div className="z-10 mt-8 h-20 overflow-hidden w-full max-w-md text-center">
         {logs.map((log, i) => (
             <div key={i} className="text-xs text-indigo-300/70">{log}</div>
         ))}
      </div>
    </div>
  );
};

export default LiveAssistant;
