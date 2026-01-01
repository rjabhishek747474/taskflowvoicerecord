import React, { useState, useEffect, useRef } from 'react';
import { Send, MapPin, Search, Bot, User } from 'lucide-react';
import { chatWithAssistant } from '../services/geminiService';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

interface Message {
    role: 'user' | 'model';
    text: string;
    grounding?: any;
}

const ChatBot: React.FC = () => {
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(false);
    const [location, setLocation] = useState<{ lat: number, lng: number } | undefined>(undefined);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
                (err) => console.log("Geo error", err)
            );
        }
    }, []);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim() || loading) return;

        const userMsg = input;
        setInput('');
        setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
        setLoading(true);

        try {
            // Convert simple message history for API
            const history = messages.map(m => ({
                role: m.role,
                parts: [{ text: m.text }]
            }));

            const result = await chatWithAssistant(userMsg, history, location);
            const text = result.text || "I couldn't generate a response.";
            const grounding = result.candidates?.[0]?.groundingMetadata;

            setMessages(prev => [...prev, { role: 'model', text, grounding }]);
        } catch (e) {
            console.error(e);
            setMessages(prev => [...prev, { role: 'model', text: "Sorry, I encountered an error." }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="h-[600px] flex flex-col bg-slate-900 rounded-xl border border-slate-800 shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-800 bg-slate-900/50 flex justify-between items-center">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <Bot className="w-5 h-5 text-indigo-400" />
                    Assistant Chat
                </h3>
                {location && (
                    <span className="text-xs text-emerald-400 flex items-center gap-1 bg-emerald-900/20 px-2 py-1 rounded-full border border-emerald-900/50">
                        <MapPin className="w-3 h-3" /> Location Active
                    </span>
                )}
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6" ref={scrollRef}>
                {messages.length === 0 && (
                    <div className="text-center text-slate-500 mt-20">
                        <p>Ask me anything!</p>
                        <p className="text-xs mt-2">I can search Google and find places on Maps.</p>
                    </div>
                )}
                {messages.map((msg, idx) => (
                    <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        {msg.role === 'model' && <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center shrink-0"><Bot className="w-5 h-5 text-white" /></div>}

                        <div className={`max-w-[80%] p-4 rounded-2xl ${msg.role === 'user'
                            ? 'bg-indigo-600 text-white rounded-br-none'
                            : 'bg-slate-800 text-slate-200 rounded-bl-none'
                            }`}>
                            <div className="prose prose-invert prose-sm" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(marked.parse(msg.text) as string) }} />

                            {/* Grounding Sources */}
                            {msg.grounding?.groundingChunks && (
                                <div className="mt-3 pt-3 border-t border-slate-700/50 text-xs">
                                    <p className="font-semibold text-slate-400 mb-1 flex items-center gap-1">
                                        <Search className="w-3 h-3" /> Sources
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                        {msg.grounding.groundingChunks.map((chunk: any, i: number) => {
                                            if (chunk.web?.uri) {
                                                return (
                                                    <a key={i} href={chunk.web.uri} target="_blank" rel="noreferrer" className="text-cyan-400 hover:underline truncate max-w-[150px] block">
                                                        {chunk.web.title || "Web Source"}
                                                    </a>
                                                );
                                            }
                                            if (chunk.maps?.uri) { // Adjust based on exact API shape
                                                return (
                                                    <a key={i} href={chunk.maps.uri} target="_blank" rel="noreferrer" className="text-emerald-400 hover:underline flex items-center gap-1">
                                                        <MapPin className="w-3 h-3" /> {chunk.maps.title || "Map Location"}
                                                    </a>
                                                );
                                            }
                                            return null;
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>

                        {msg.role === 'user' && <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center shrink-0"><User className="w-5 h-5 text-slate-300" /></div>}
                    </div>
                ))}
                {loading && (
                    <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center shrink-0"><Bot className="w-5 h-5 text-white" /></div>
                        <div className="bg-slate-800 p-4 rounded-2xl rounded-bl-none">
                            <div className="flex space-x-2">
                                <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce"></div>
                                <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce delay-100"></div>
                                <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce delay-200"></div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div className="p-4 bg-slate-900 border-t border-slate-800">
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        placeholder="Type a message..."
                        className="flex-1 bg-slate-800 border-none rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                    <button
                        onClick={handleSend}
                        disabled={loading || !input.trim()}
                        className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white p-3 rounded-xl transition-colors"
                    >
                        <Send className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ChatBot;
