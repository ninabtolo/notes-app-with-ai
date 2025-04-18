import React, { useState, useRef, useEffect } from 'react';
import { generateText, analyzeNote } from '../../gemini';
import { Note } from '../../types';
import { X, PaperclipIcon, CheckCircle, BookOpen, FileText, Unlink, Zap } from 'lucide-react';

interface GeminiChatProps {
  onClose: () => void;
  currentNote: Note | null;
  allNotes: Note[];
}

function GeminiChat({ onClose, allNotes }: GeminiChatProps) {
  const [prompt, setPrompt] = useState<string>('');
  const [messages, setMessages] = useState<{role: string, content: string}[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [attachedNote, setAttachedNote] = useState<Note | null>(null); 
  const [showNoteSelection, setShowNoteSelection] = useState<boolean>(false);
  const [notesFilter, setNotesFilter] = useState<string>('');
  const [showCommandMenu, setShowCommandMenu] = useState<boolean>(false);
  
  const commands = [
    { id: 'grammar', name: 'Fix grammar', icon: <FileText size={16} /> },
    { id: 'summary', name: 'Summarize note', icon: <FileText size={16} /> },
    { id: 'expand', name: 'Expand content', icon: <FileText size={16} /> }
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (messages.length === 0) {
      setMessages([{
        role: 'assistant',
        content: 'Hello! I\'m here to help with your notes. You can attach a note using the paperclip button so I can analyze it or answer questions about it.'
      }]);
    }
  }, []);

  const handleSubmit = async () => {
    if (!prompt.trim()) return;

    if (prompt.startsWith('/')) {
      handleSpecialCommand(prompt);
      return;
    }
    
    const userMessage = { role: 'user', content: prompt };
    setMessages(prev => [...prev, userMessage]);
    setLoading(true);
    setPrompt('');
    
    try {
      const text = await generateText(prompt, attachedNote);
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
  
  const handleSpecialCommand = async (command: string) => {
    const lowerCommand = command.toLowerCase();
    let systemMessage = '';
    
    if (!attachedNote && !command.startsWith('/help')) {
      systemMessage = "Please attach a note before using this command.";
      setMessages(prev => [...prev, 
        { role: 'user', content: command },
        { role: 'assistant', content: systemMessage }
      ]);
      setPrompt('');
      return;
    }
    
    setLoading(true);
    setPrompt('');
    
    if (lowerCommand.startsWith('/grammar') || lowerCommand.startsWith('/fix')) {
      systemMessage = "Analyzing grammar and spelling...";
      setMessages(prev => [...prev, 
        { role: 'user', content: `Fix grammar and spelling in note "${attachedNote?.title || 'current'}"` }
      ]);
      
      if (attachedNote) {
        try {
          const analysis = await analyzeNote(attachedNote, 'grammar');
          setMessages(prev => [...prev, { role: 'assistant', content: analysis }]);
        } catch (error) {
          setMessages(prev => [...prev, { role: 'assistant', content: "Error analyzing the note." }]);
        }
      }
    }
    else if (lowerCommand.startsWith('/summary') || lowerCommand.startsWith('/summarize')) {
      systemMessage = "Generating note summary...";
      setMessages(prev => [...prev, 
        { role: 'user', content: `Summarize note "${attachedNote?.title || 'current'}"` }
      ]);
      
      if (attachedNote) {
        try {
          const summary = await analyzeNote(attachedNote, 'summary');
          setMessages(prev => [...prev, { role: 'assistant', content: summary }]);
        } catch (error) {
          setMessages(prev => [...prev, { role: 'assistant', content: "Error summarizing the note." }]);
        }
      }
    }
    else if (lowerCommand.startsWith('/expand')) {
      systemMessage = "Expanding note content...";
      setMessages(prev => [...prev, 
        { role: 'user', content: `Expand content of note "${attachedNote?.title || 'current'}"` }
      ]);
      
      if (attachedNote) {
        try {
          const expanded = await analyzeNote(attachedNote, 'expand');
          setMessages(prev => [...prev, { role: 'assistant', content: expanded }]);
        } catch (error) {
          setMessages(prev => [...prev, { role: 'assistant', content: "Error expanding the note." }]);
        }
      }
    }
    else if (lowerCommand.startsWith('/help')) {
      const helpContent = `
**Available commands:**

- **/grammar** or **/fix** - Fix grammar and spelling in the attached note
- **/summary** or **/summarize** - Create a summary of the attached note
- **/expand** - Develop and expand the content of the attached note
- **/help** - Show this help message

To use these commands, first attach a note using the paperclip 📎 button above.
`;
      setMessages(prev => [...prev, 
        { role: 'user', content: command },
        { role: 'assistant', content: helpContent }
      ]);
    }
    else {
      setMessages(prev => [...prev, 
        { role: 'user', content: command },
        { role: 'assistant', content: "Command not recognized. Type /help to see available commands." }
      ]);
    }
    
    setLoading(false);
  };
  
  const handleExecuteCommand = async (commandId: string) => {
    if (!attachedNote) {
      setMessages(prev => [...prev, 
        { role: 'assistant', content: "Please attach a note before using this command." }
      ]);
      setShowCommandMenu(false);
      return;
    }
    
    setLoading(true);
    setShowCommandMenu(false);
    
    let userPrompt = '';
    
    switch (commandId) {
      case 'grammar':
        userPrompt = `Fix grammar and spelling in note "${attachedNote.title || 'current'}"`;
        break;
      case 'summary':
        userPrompt = `Summarize note "${attachedNote.title || 'current'}"`;
        break;
      case 'expand':
        userPrompt = `Expand content of note "${attachedNote.title || 'current'}"`;
        break;
    }
    
    setMessages(prev => [...prev, { role: 'user', content: userPrompt }]);
    
    try {
      const result = await analyzeNote(attachedNote, commandId as any);
      setMessages(prev => [...prev, { role: 'assistant', content: result }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', content: "Error processing command." }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      handleSubmit();
    } else if (e.key === 'Tab' && prompt.startsWith('/')) {
      e.preventDefault();
      setShowCommandMenu(true);
    } else if (e.key === 'Escape') {
      setShowCommandMenu(false);
      setShowNoteSelection(false);
    }
  };
  
  const handleAttachNote = () => {
    setShowNoteSelection(!showNoteSelection);
    setShowCommandMenu(false);
  };
  
  const selectNote = (note: Note) => {
    setAttachedNote(note);
    setShowNoteSelection(false);
    
    setMessages(prev => [...prev, 
      { role: 'assistant', content: `Note "${note.title || 'Untitled'}" attached. You can ask questions about it or use commands like /grammar, /summary to analyze it.` }
    ]);
  };
  
  const detachNote = () => {
    setAttachedNote(null);
    setMessages(prev => [...prev, 
      { role: 'assistant', content: "Note detached." }
    ]);
  };
  
  const filteredNotes = allNotes.filter(note => 
    note.title.toLowerCase().includes(notesFilter.toLowerCase())
  );
  
  const getCommandType = (input: string): string | null => {
    if (input.startsWith('/g') || input.startsWith('/f')) return 'grammar';
    if (input.startsWith('/s')) return 'summary';
    if (input.startsWith('/e')) return 'expand';
    if (input.startsWith('/h')) return 'help';
    return null;
  };
  
  useEffect(() => {
    if (prompt.startsWith('/') && prompt.length > 1) {
      const commandType = getCommandType(prompt.toLowerCase());
      if (commandType) setShowCommandMenu(true);
      else setShowCommandMenu(false);
    } else {
      setShowCommandMenu(false);
    }
  }, [prompt]);

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
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-lg font-medium text-purple-800">AI Chat</h2>
            <p className="text-sm text-gray-600">Ask about your notes</p>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={handleAttachNote}
              className={`p-2 rounded ${
                attachedNote ? 'bg-purple-100 text-purple-700' : 'hover:bg-gray-100 text-gray-700'
              }`}
              title="Attach note"
            >
              <PaperclipIcon size={18} />
            </button>
            
            <button
              onClick={() => setShowCommandMenu(!showCommandMenu)}
              className="p-2 rounded hover:bg-gray-100 text-gray-700"
              title="Quick commands"
            >
              <Zap size={18} />
            </button>
          </div>
        </div>
        
        {attachedNote && (
          <div className="mt-2 py-2 px-3 bg-white rounded flex justify-between items-center">
            <div className="flex items-center">
              <BookOpen size={16} className="mr-2 text-purple-600" />
              <span className="truncate max-w-[180px]">{attachedNote.title || 'Untitled note'}</span>
            </div>
            <button 
              onClick={detachNote}
              className="p-1 rounded-full hover:bg-gray-100"
              title="Detach note"
            >
              <Unlink size={14} />
            </button>
          </div>
        )}
        
        {showNoteSelection && (
          <div className="absolute left-0 right-0 top-24 bg-white border shadow-md rounded-b-lg z-30 max-h-72 overflow-y-auto">
            <div className="p-3 border-b">
              <input
                type="text"
                placeholder="Filter notes..."
                className="w-full p-2 border rounded focus:outline-none focus:ring-1 focus:ring-purple-500"
                value={notesFilter}
                onChange={(e) => setNotesFilter(e.target.value)}
              />
            </div>
            <div className="p-2">
              {filteredNotes.length > 0 ? (
                filteredNotes.map(note => (
                  <div 
                    key={note.id} 
                    onClick={() => selectNote(note)}
                    className="p-2 hover:bg-purple-50 rounded flex items-center cursor-pointer"
                  >
                    <FileText size={14} className="mr-2 text-purple-600" />
                    <span className="truncate flex-1">{note.title || 'Untitled'}</span>
                    {attachedNote?.id === note.id && (
                      <CheckCircle size={14} className="text-green-600" />
                    )}
                  </div>
                ))
              ) : (
                <div className="p-2 text-gray-500 text-center">
                  {notesFilter ? 'No notes found' : 'No notes available'}
                </div>
              )}
            </div>
          </div>
        )}
        
        {showCommandMenu && (
          <div className="absolute left-4 right-4 bottom-32 bg-white border shadow-md rounded-lg z-30">
            <div className="p-2">
              {commands.map(cmd => (
                <div 
                  key={cmd.id}
                  onClick={() => handleExecuteCommand(cmd.id)}
                  className="p-2 hover:bg-purple-50 rounded flex items-center cursor-pointer"
                >
                  {cmd.icon}
                  <span className="ml-2">{cmd.name}</span>
                </div>
              ))}
              <div className="mt-2 pt-2 border-t text-xs text-gray-500 px-2">
                Type /help to see all available commands
              </div>
            </div>
          </div>
        )}
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-white">
        {messages.map((msg, idx) => (
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
        ))}
        <div ref={messagesEndRef} />
      </div>
      
      <div className="p-4 border-t bg-white">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask something... (Ctrl+Enter to send, / for commands)"
          className="w-full p-2 border rounded resize-none focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-purple-400 transition"
          rows={3}
        />
        <button
          onClick={handleSubmit}
          className="mt-2 w-full p-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition"
          disabled={loading || !prompt.trim()}
        >
          {loading ? 'Processing...' : 'Send'}
        </button>
      </div>
    </div>
  );
}

export default GeminiChat;