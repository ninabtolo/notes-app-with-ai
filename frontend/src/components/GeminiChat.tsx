import React, { useState, useRef, useEffect } from 'react';
import { generateText } from '../gemini';
import { X } from 'lucide-react';

interface GeminiChatProps {
  onClose: () => void;
}

function GeminiChat({ onClose }: GeminiChatProps) {
  const [prompt, setPrompt] = useState<string>('');
  const [messages, setMessages] = useState<{role: string, content: string}[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async () => {
    if (!prompt.trim()) return;
    
    const userMessage = { role: 'user', content: prompt };
    setMessages(prev => [...prev, userMessage]);
    setLoading(true);
    setPrompt('');
    
    try {
      const text = await generateText(prompt);
      const aiMessage = { role: 'assistant', content: text };
      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Error generating text:', error);
      const errorMessage = { role: 'assistant', content: 'Error generating text.' };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      handleSubmit();
    }
  };

  return (
    <div className="flex flex-col h-full bg-white shadow-lg rounded-l-lg relative">
      <button 
        onClick={onClose}
        className="absolute top-2 right-2 p-1.5 rounded-full hover:bg-purple-100 bg-white text-purple-700 transition-colors z-20 shadow-sm"
        aria-label="Close chat"
      >
        <X size={18} />
      </button>
      
      <div className="p-4 pt-8 bg-purple-50 border-b rounded-tl-lg">
        <h2 className="text-lg font-medium text-purple-800">AI Chat</h2>
        <p className="text-sm text-gray-600">Ask questions or get help with your notes</p>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-white">
        {messages.length === 0 ? (
          <div className="text-center text-gray-400 py-8">
            Send a message to start the conversation
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div 
              key={idx} 
              className={`p-3 rounded-lg ${
                msg.role === 'user' 
                  ? 'bg-purple-100 ml-8' 
                  : 'bg-white border border-gray-200 mr-8'
              }`}
            >
              {msg.content}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
      
      <div className="p-4 border-t bg-white">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type your question... (Ctrl+Enter to send)"
          className="w-full p-2 border rounded resize-none focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-purple-400 transition"
          rows={3}
        />
        <button
          onClick={handleSubmit}
          className="mt-2 w-full p-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition"
          disabled={loading || !prompt.trim()}
        >
          {loading ? 'Loading...' : 'Send'}
        </button>
      </div>
    </div>
  );
}

export default GeminiChat;