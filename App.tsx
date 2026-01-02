import React, { useState } from 'react';
import SmartTaskListener from './components/SmartTaskListener';
import LiveAssistant from './components/LiveAssistant';
import ChatBot from './components/ChatBot';
import { Mic, Zap, MessageSquare, Loader2, LogOut } from 'lucide-react';
import { authClient } from './lib/auth-client';
import AuthScreen from './components/Auth/AuthScreen';

const App: React.FC = () => {
   const [activeTab, setActiveTab] = useState<'tasks' | 'live' | 'chat'>('tasks');
   const [chatContext, setChatContext] = useState<string | null>(null);

   const { data: session, isPending } = authClient.useSession();

   const handleChatRequest = (context: string) => {
      setChatContext(context);
      setActiveTab('chat');
   };

   const handleSignOut = async () => {
      await authClient.signOut({
         fetchOptions: {
            onSuccess: () => {
               window.location.reload();
            }
         }
      });
   };

   if (isPending) {
      return (
         <div className="min-h-screen bg-slate-950 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
         </div>
      );
   }

   if (!session) {
      return <AuthScreen />;
   }

   return (
      <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-indigo-500/30">
         {/* Header */}
         <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
               <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
                     <Zap className="w-5 h-5 text-white fill-white" />
                  </div>
                  <h1 className="text-xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
                     TaskFlow AI
                  </h1>
               </div>

               <div className="flex items-center gap-4">
                  <div className="flex space-x-1 bg-slate-800/50 p-1 rounded-xl">
                     <button
                        onClick={() => setActiveTab('tasks')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'tasks' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                     >
                        <div className="flex items-center gap-2">
                           <Mic className="w-4 h-4" />
                           <span className="hidden sm:inline">Smart Recorder</span>
                        </div>
                     </button>
                     <button
                        onClick={() => setActiveTab('live')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'live' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                     >
                        <div className="flex items-center gap-2">
                           <Zap className="w-4 h-4" />
                           <span className="hidden sm:inline">Live Voice</span>
                        </div>
                     </button>
                     <button
                        onClick={() => setActiveTab('chat')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'chat' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                     >
                        <div className="flex items-center gap-2">
                           <MessageSquare className="w-4 h-4" />
                           <span className="hidden sm:inline">Assistant</span>
                        </div>
                     </button>
                  </div>

                  <div className="h-6 w-px bg-slate-800 hidden sm:block"></div>

                  <div className="flex items-center gap-2">
                     <span className="text-sm text-slate-400 hidden md:block">
                        {session.user.name}
                     </span>
                     <button
                        onClick={handleSignOut}
                        className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-rose-400 transition-colors"
                        title="Sign Out"
                     >
                        <LogOut className="w-5 h-5" />
                     </button>
                  </div>
               </div>
            </div>
         </header>

         {/* Main Content */}
         <main className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="animate-fade-in">
               {activeTab === 'tasks' && <SmartTaskListener onChatRequest={handleChatRequest} />}
               {activeTab === 'live' && <LiveAssistant />}
               {activeTab === 'chat' && <ChatBot initialContext={chatContext} />}
            </div>
         </main>

         {/* Footer */}
         <footer className="border-t border-slate-900 mt-12 py-8 text-center text-slate-500 text-sm">
            <p>Powered by Artificial Intelligence, All Right Reserve TASKFLOW Copyright 2026.</p>
         </footer>
      </div>
   );
};

export default App;
