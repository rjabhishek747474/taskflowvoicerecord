import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, Recording } from '../db';
import { Clock, MessageSquare, Trash2, Calendar } from 'lucide-react';

interface HistoryViewerProps {
    onSelect: (recording: Recording) => void;
    onChat: (recording: Recording) => void;
}

const HistoryViewer: React.FC<HistoryViewerProps> = ({ onSelect, onChat }) => {
    const recordings = useLiveQuery(() => db.recordings.orderBy('timestamp').reverse().toArray());

    if (!recordings) return null;

    const handleDelete = async (e: React.MouseEvent, id?: number) => {
        e.stopPropagation();
        if (id) {
            if (confirm('Are you sure you want to delete this recording?')) {
                await db.recordings.delete(id);
            }
        }
    };

    return (
        <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800 h-full flex flex-col">
            <h3 className="text-slate-400 text-sm font-semibold uppercase tracking-wider mb-4 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Recording History
            </h3>

            <div className="overflow-y-auto space-y-3 pr-2 custom-scrollbar flex-1">
                {recordings.length === 0 ? (
                    <p className="text-slate-600 text-sm text-center py-8">No recordings history yet.</p>
                ) : (
                    recordings.map(rec => (
                        <div
                            key={rec.id}
                            onClick={() => onSelect(rec)}
                            className="p-3 bg-slate-800/50 hover:bg-slate-800 rounded-xl border border-slate-700/50 cursor-pointer transition-all group"
                        >
                            <div className="flex justify-between items-start mb-2">
                                <div className="flex items-center gap-2 text-xs text-indigo-400">
                                    <Calendar className="w-3 h-3" />
                                    <span>{new Date(rec.timestamp).toLocaleString()}</span>
                                </div>
                                <button
                                    onClick={(e) => handleDelete(e, rec.id)}
                                    className="text-slate-600 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                                >
                                    <Trash2 className="w-3 h-3" />
                                </button>
                            </div>

                            <p className="text-slate-300 text-sm line-clamp-2 mb-3 font-medium">
                                {rec.transcript || "No transcript available"}
                            </p>

                            <div className="flex gap-2">
                                <button
                                    onClick={(e) => { e.stopPropagation(); onChat(rec); }}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 text-xs rounded-lg transition-colors"
                                >
                                    <MessageSquare className="w-3 h-3" />
                                    Chat Context
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default HistoryViewer;
