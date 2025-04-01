import React, { useState, useRef, useEffect } from 'react';
import { generateText } from '../gemini';

function GeminiChat() {
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
      console.error('Erro ao gerar texto:', error);
      const errorMessage = { role: 'assistant', content: 'Erro ao gerar texto.' };
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
    <div className="flex flex-col h-full">
      <div className="p-4 bg-indigo-50 border-b">
        <h2 className="text-lg font-medium text-indigo-800">Chat com IA</h2>
        <p className="text-sm text-gray-600">Faça perguntas ou peça ajuda com suas notas</p>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-gray-400 py-8">
            Envie uma mensagem para começar a conversa
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div 
              key={idx} 
              className={`p-3 rounded-lg ${
                msg.role === 'user' 
                  ? 'bg-indigo-100 ml-8' 
                  : 'bg-white border border-gray-200 mr-8'
              }`}
            >
              {msg.content}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
      
      <div className="p-4 border-t">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Digite sua pergunta... (Ctrl+Enter para enviar)"
          className="w-full p-2 border rounded resize-none"
          rows={3}
        />
        <button
          onClick={handleSubmit}
          className="mt-2 w-full p-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition"
          disabled={loading || !prompt.trim()}
        >
          {loading ? 'Carregando...' : 'Enviar'}
        </button>
      </div>
    </div>
  );
}

export default GeminiChat;