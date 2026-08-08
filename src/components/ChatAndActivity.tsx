import React, { useState } from 'react';
import { X, Send, MessageSquare, Activity, User, Clock } from 'lucide-react';
import { ChatMessage, ActivityEvent } from '../types';

interface ChatAndActivityProps {
  isOpen: boolean;
  onClose: () => void;
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  activities: ActivityEvent[];
}

export const ChatAndActivity: React.FC<ChatAndActivityProps> = ({
  isOpen,
  onClose,
  messages,
  onSendMessage,
  activities,
}) => {
  const [activeTab, setActiveTab] = useState<'chat' | 'activity'>('chat');
  const [input, setInput] = useState('');

  if (!isOpen) return null;

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      onSendMessage(input.trim());
      setInput('');
    }
  };

  return (
    <aside className="w-80 bg-white border-l-2 border-slate-200 flex flex-col h-full z-20 shadow-2xl text-xs">
      {/* Header */}
      <div className="p-3 border-b-2 border-red-600 flex items-center justify-between bg-[#D11111] text-white relative overflow-hidden">
        <div className="absolute inset-0 grid-pattern-dark pointer-events-none opacity-20" />
        <div className="flex items-center space-x-2 relative z-10">
          <MessageSquare className="w-4 h-4 text-white" />
          <span className="font-black text-white text-xs uppercase tracking-widest">Collaborative Workspace</span>
        </div>
        <button onClick={onClose} className="p-1 text-white/80 hover:text-white hover:bg-black/20 relative z-10">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b-2 border-slate-200 bg-slate-100 font-bold text-slate-700 text-[10px] uppercase tracking-wider">
        <button
          onClick={() => setActiveTab('chat')}
          className={`flex-1 py-2 text-center transition-colors ${
            activeTab === 'chat' ? 'bg-white text-[#D11111] border-b-2 border-[#D11111] font-black' : 'hover:bg-slate-200'
          }`}
        >
          Chat ({messages.length})
        </button>
        <button
          onClick={() => setActiveTab('activity')}
          className={`flex-1 py-2 text-center transition-colors ${
            activeTab === 'activity' ? 'bg-white text-[#D11111] border-b-2 border-[#D11111] font-black' : 'hover:bg-slate-200'
          }`}
        >
          Activity ({activities.length})
        </button>
      </div>

      {/* Main Tab Panels */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {activeTab === 'chat' && (
          <div className="flex flex-col h-full justify-between">
            <div className="space-y-2 overflow-y-auto max-h-[calc(100vh-220px)] p-1">
              {messages.map(m => (
                <div key={m.id} className="p-2.5 bg-slate-50 border-2 border-slate-200 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#D11111] text-[11px] uppercase tracking-wider">{m.authorName}</span>
                    <span className="text-[9px] font-mono text-slate-400">{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <p className="text-slate-800 text-xs leading-normal font-medium">{m.body}</p>
                </div>
              ))}
            </div>

            <form onSubmit={handleSend} className="mt-2 flex space-x-1">
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Type message..."
                className="flex-1 bg-slate-50 border-2 border-slate-300 px-2.5 py-1.5 text-xs text-slate-900 focus:outline-hidden focus:border-[#D11111] font-medium"
              />
              <button
                type="submit"
                className="px-3 py-1.5 bg-[#D11111] text-white font-black hover:bg-black transition-colors"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        )}

        {activeTab === 'activity' && (
          <div className="space-y-2">
            {activities.map(act => (
              <div key={act.id} className="p-2.5 bg-slate-50 border-2 border-slate-200 flex items-start space-x-2">
                <Activity className="w-4 h-4 text-[#D11111] mt-0.5 shrink-0" />
                <div>
                  <span className="font-bold text-slate-900 uppercase text-[10px] tracking-wider block">{act.actorName}</span>
                  <span className="text-slate-700 text-xs font-medium">{act.description}</span>
                  <span className="block text-[9px] font-mono text-slate-400 mt-0.5">
                    {new Date(act.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
};
