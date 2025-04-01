import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Note } from '../types';
import { Type, Palette, Download, Bold, Highlighter, MessageSquare, Check, X, Lightbulb } from 'lucide-react'; 
import html2pdf from 'html2pdf.js';
import { ipcRenderer } from 'electron';
import './Editor.css';
import GeminiChat from './GeminiChat';
import { generateSuggestion } from '../gemini';
import debounce from 'lodash.debounce';

interface EditorProps {
  note: Note | null;
  onUpdateNote: (note: Note) => void;
}

export function Editor({ note, onUpdateNote }: EditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [dropdown, setDropdown] = useState<string | null>(null);
  const [savedRange, setSavedRange] = useState<Range | null>(null);
  const [showGeminiChat, setShowGeminiChat] = useState<boolean>(false);
  
  const [suggestion, setSuggestion] = useState<string>('');
  const [showSuggestion, setShowSuggestion] = useState<boolean>(false);
  const [isGeneratingSuggestion, setIsGeneratingSuggestion] = useState<boolean>(false);
  const [isSuggestionEnabled, setIsSuggestionEnabled] = useState<boolean>(false);
  const lastCursorPosition = useRef<Range | null>(null);
  const [suggestionPosition, setSuggestionPosition] = useState<{top: number, left: number} | null>(null);
  const suggestionRef = useRef<HTMLDivElement>(null);

  const toggleDropdown = (type: string) => {
    if (dropdown === type) {
      setDropdown(null);
    } else {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        setSavedRange(selection.getRangeAt(0));
      }
      setDropdown(type);
    }
  };

  const restoreSelection = () => {
    if (savedRange) {
      const selection = window.getSelection();
      if (selection) {
        selection.removeAllRanges();
        selection.addRange(savedRange);
      }
    }
  };

  const applyFormatting = (command: string, value?: string) => {
    restoreSelection();
    if (command === 'backColor') {
      if (value === 'transparent') {
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          const isBold = document.queryCommandState('bold');
          const isItalic = document.queryCommandState('italic');
          const isUnderlined = document.queryCommandState('underline');
          const fontSize = document.queryCommandValue('fontSize');
          const textColor = document.queryCommandValue('foreColor');
          
          document.execCommand('removeFormat', false);

          if (isBold) document.execCommand('bold', false);
          if (isItalic) document.execCommand('italic', false);
          if (isUnderlined) document.execCommand('underline', false);
          if (fontSize) document.execCommand('fontSize', false, fontSize);
          if (textColor) document.execCommand('foreColor', false, textColor);
          
          handleContentChange();
          setDropdown(null);
          return;
        }
      } else {
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          const fragment = range.cloneContents();
          
          const tempDiv = document.createElement('div');
          tempDiv.appendChild(fragment);
          
          const textNodes = getAllTextNodes(tempDiv);
          if (textNodes.length > 0) {
            textNodes.forEach(node => {
              const span = document.createElement('span');
              span.style.backgroundColor = value || '';
              
              if (node.parentNode) {
                const text = node.textContent;
                span.textContent = text;
                node.parentNode.replaceChild(span, node);
              }
            });
            
            range.deleteContents();
            range.insertNode(tempDiv);
            handleContentChange();
            setDropdown(null);
            return;
          }
        }
      }
    }
    
    document.execCommand(command, false, value);
    handleContentChange();
    setDropdown(null);
  };

  const getAllTextNodes = (element: Node): Text[] => {
    const textNodes: Text[] = [];
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, null);
    
    let node: Node | null;
    while (node = walker.nextNode()) {
      if (node.nodeType === Node.TEXT_NODE && node.textContent?.trim()) {
        textNodes.push(node as Text);
      }
    }
    
    return textNodes;
  };

  useEffect(() => {
    const loadNotes = async () => {
      const notesData = await ipcRenderer.invoke('load-notes');
      setNotes(notesData);
    };

    loadNotes();
  }, []);

  useEffect(() => {
    if (note) {
      onUpdateNote(note); 
      ipcRenderer.send('save-notes', notes); 
    }
  }, [note, notes]);

  useEffect(() => {
    if (editorRef.current && note) {
      editorRef.current.innerHTML = note.content;
    }
  }, [note?.id]);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdateNote({
      ...note,
      title: e.target.value,
      updatedAt: new Date(),
    });
  };

  const calculateCursorPosition = () => {
    if (!editorRef.current) return;
    
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    const editorRect = editorRef.current.getBoundingClientRect();
    
    const top = rect.bottom - editorRect.top;
    const left = rect.left - editorRect.left;
    
    const maxWidth = 500;
    const rightEdge = left + maxWidth;
    const editorWidth = editorRect.width;
    
    const adjustedLeft = rightEdge > editorWidth ? editorWidth - maxWidth : left;
    
    setSuggestionPosition({ top, left: Math.max(0, adjustedLeft) });
  };

  const requestSuggestion = useCallback(
    debounce(async () => {
      if (!isSuggestionEnabled || !editorRef.current || isGeneratingSuggestion) return;
      
      const textContent = editorRef.current.textContent || '';
      
      if (textContent.length < 30) {
        setSuggestion('');
        setShowSuggestion(false);
        return;
      }
      
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        lastCursorPosition.current = selection.getRangeAt(0).cloneRange();
        calculateCursorPosition();
      }
      
      setIsGeneratingSuggestion(true);
      try {
        const newSuggestion = await generateSuggestion(textContent);
        if (newSuggestion && newSuggestion.trim()) {
          setSuggestion(newSuggestion.trim());
          setShowSuggestion(true);
        }
      } catch (error) {
        console.error('Error generating suggestion:', error);
      } finally {
        setIsGeneratingSuggestion(false);
      }
    }, 1500),
    [isGeneratingSuggestion, isSuggestionEnabled]
  );

  const acceptSuggestion = () => {
    if (!editorRef.current || !suggestion) return;
    
    if (lastCursorPosition.current) {
      const selection = window.getSelection();
      if (selection) {
        selection.removeAllRanges();
        selection.addRange(lastCursorPosition.current);
      }
      
      const span = document.createElement('span');
      span.innerHTML = ` ${suggestion}`;
      lastCursorPosition.current.insertNode(span);
      
      handleContentChange();
    } else {
      editorRef.current.innerHTML += ` ${suggestion}`;
      handleContentChange();
    }
    
    setSuggestion('');
    setShowSuggestion(false);
  };

  const rejectSuggestion = () => {
    setSuggestion('');
    setShowSuggestion(false);
  };

  const handleContentChange = () => {
    if (editorRef.current) {
      onUpdateNote({
        ...note,
        content: editorRef.current.innerHTML,
        updatedAt: new Date(),
      });
      
      if (isSuggestionEnabled) {
        requestSuggestion();
      }
    }
  };

  const exportToPDF = () => {
    if (!editorRef.current) return;

    const content = document.createElement('div');
    content.innerHTML = `
      <h1 style="font-size: 24px; font-weight: bold; margin-bottom: 16px;">${note.title || 'Untitled'}</h1>
      ${editorRef.current.innerHTML}
      <div style="height: 20px;"></div> 
    `;

    const opt = {
      margin: [1, 0.5, 1, 0.5], 
      filename: `${note.title || 'note'}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { 
        scale: 2,
        useCORS: true,
        scrollY: 0,
        windowHeight: document.documentElement.offsetHeight
      },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(content).save();
  };

  const toggleSuggestions = () => {
    setIsSuggestionEnabled(!isSuggestionEnabled);
    if (isSuggestionEnabled) {
      setSuggestion('');
      setShowSuggestion(false);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!showSuggestion || !suggestion) return;
      
      if (e.key === 'Tab' && !e.shiftKey) {
        e.preventDefault();
        acceptSuggestion();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        rejectSuggestion();
      }
    };
    
    if (editorRef.current) {
      editorRef.current.addEventListener('keydown', handleKeyDown);
    }
    
    return () => {
      if (editorRef.current) {
        editorRef.current.removeEventListener('keydown', handleKeyDown);
      }
    };
  }, [showSuggestion, suggestion]);

  useEffect(() => {
    const handleSelectionChange = () => {
      if (showSuggestion && suggestion) {
        calculateCursorPosition();
      }
    };
    
    document.addEventListener('selectionchange', handleSelectionChange);
    
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
    };
  }, [showSuggestion, suggestion]);

  if (!note) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-500">
        Select a note or create a new one
      </div>
    );
  }

  return (
    <div className="flex-1 flex">
      <div className={`flex-1 p-6 space-y-4 ${showGeminiChat ? 'w-2/3' : 'w-full'}`}>
        <div className="flex items-center justify-between">
          <input
            type="text"
            value={note?.title || ''}
            onChange={handleTitleChange}
            placeholder="Note title"
            className="flex-1 text-4xl font-bold focus:outline-none"
          />
          <div className="flex items-center space-x-2">
            <button 
              onClick={toggleSuggestions}
              className={`flex items-center space-x-1 px-3 py-2 text-white rounded transition ${isSuggestionEnabled ? 'bg-amber-500 hover:bg-amber-600' : 'bg-gray-500 hover:bg-gray-600'}`}
              title={isSuggestionEnabled ? "Desativar sugestões" : "Ativar sugestões"}
            >
              <Lightbulb className="w-5 h-5" />
              <span>Sugestões</span>
            </button>
            <button 
              onClick={() => setShowGeminiChat(!showGeminiChat)}
              className="flex items-center space-x-1 px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition"
            >
              <MessageSquare className="w-5 h-5" />
              <span>{showGeminiChat ? 'Fechar IA' : 'Abrir IA'}</span>
            </button>
            <button 
              onClick={exportToPDF}
              className="flex items-center space-x-1 px-3 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition"
            >
              <Download className="w-5 h-5" />
              <span>Export PDF</span>
            </button>
          </div>
        </div>

        <div className="flex items-center space-x-2 py-2 border-b">
          <div className="relative">
            <button
              onClick={() => toggleDropdown('fontSize')}
              className="flex items-center space-x-1 px-2 py-1 hover:bg-indigo-100 rounded"
            >
              <Type className="w-4 h-4" />
              <span>Font Size</span>
            </button>
            {dropdown === 'fontSize' && (
              <div className="absolute top-full left-0 mt-2 bg-white shadow-lg rounded p-2 z-10">
                <button onClick={() => applyFormatting('fontSize', '2')} className="block px-4 py-2 hover:bg-gray-100">Small</button>
                <button onClick={() => applyFormatting('fontSize', '3')} className="block px-4 py-2 hover:bg-gray-100">Normal</button>
                <button onClick={() => applyFormatting('fontSize', '4')} className="block px-4 py-2 hover:bg-gray-100">Large</button>
                <button onClick={() => applyFormatting('fontSize', '5')} className="block px-4 py-2 hover:bg-gray-100">Extra L</button>
              </div>
            )}
          </div>

          <div className="relative">
            <button
              onClick={() => toggleDropdown('foreColor')}
              className="flex items-center space-x-1 px-2 py-1 hover:bg-indigo-100 rounded"
            >
              <Palette className="w-4 h-4" />
              <span>Text Color</span>
            </button>
            {dropdown === 'foreColor' && (
              <div className="absolute top-full left-0 mt-2 bg-white shadow-lg rounded p-2 z-10 flex space-x-2">
                <button onClick={() => applyFormatting('foreColor', '#000000')} className="w-6 h-6 bg-black rounded" />
                <button onClick={() => applyFormatting('foreColor', '#4c51bf')} className="w-6 h-6 bg-indigo-600 rounded" />
                <button onClick={() => applyFormatting('foreColor', '#059669')} className="w-6 h-6 bg-teal-600 rounded" />
                <button onClick={() => applyFormatting('foreColor', '#b45309')} className="w-6 h-6 bg-orange-600 rounded" />
                <button onClick={() => applyFormatting('foreColor', '#9d174d')} className="w-6 h-6 bg-pink-600 rounded" />
              </div>
            )}
          </div>

          <div className="relative">
            <button
              onClick={() => toggleDropdown('backColor')}
              className="flex items-center space-x-1 px-2 py-1 hover:bg-indigo-100 rounded"
            >
              <Highlighter className="w-4 h-4" />
              <span>Highlight</span>
            </button>
            {dropdown === 'backColor' && (
              <div className="absolute top-full left-0 mt-2 bg-white shadow-lg rounded p-2 z-10 flex space-x-2">
                <button onClick={() => applyFormatting('backColor', '#a5b4fc')} className="w-6 h-6 bg-[#a5b4fc] rounded" />
                <button onClick={() => applyFormatting('backColor', '#6ee7b7')} className="w-6 h-6 bg-[#6ee7b7] rounded" />
                <button onClick={() => applyFormatting('backColor', '#fbbf24')} className="w-6 h-6 bg-[#fbbf24] rounded" />
                <button onClick={() => applyFormatting('backColor', '#f472b6')} className="w-6 h-6 bg-[#f472b6] rounded" />
                <button onClick={() => applyFormatting('backColor', 'transparent')} className="w-6 h-6 bg-transparent border-2 border-gray-300 rounded" />
              </div>
            )}
          </div>
          <div className="relative">
            <button
              onClick={() => toggleDropdown('textFormat')}
              className="flex items-center space-x-1 px-2 py-1 hover:bg-indigo-100 rounded"
            >
              <Bold className="w-4 h-4" />
              <span>Format</span>
            </button>
            {dropdown === 'textFormat' && (
              <div className="absolute top-full left-0 mt-2 bg-white shadow-lg rounded p-2 z-10">
                <button onClick={() => applyFormatting('bold')} className="block px-4 py-2 hover:bg-gray-100">Bold</button>
                <button onClick={() => applyFormatting('italic')} className="block px-4 py-2 hover:bg-gray-100">Italic</button>
                <button onClick={() => applyFormatting('underline')} className="block px-4 py-2 hover:bg-gray-100">Underline</button>
              </div>
            )}
          </div>
        </div>

        <div className="editor-container">
          <div
            ref={editorRef}
            contentEditable
            onInput={handleContentChange}
            className="w-full h-full focus:outline-none overflow-y-auto"
            placeholder="Start writing your note..."
          />
          
          {showSuggestion && suggestion && suggestionPosition && (
            <div 
              ref={suggestionRef}
              className="suggestion-container"
              style={{
                top: `${suggestionPosition.top}px`,
                left: `${suggestionPosition.left}px`,
              }}
            >
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-semibold text-gray-500">Sugestão do Gemini</span>
                <div className="flex space-x-2">
                  <button 
                    onClick={acceptSuggestion}
                    className="p-1 bg-green-500 text-white rounded hover:bg-green-600"
                    title="Aceitar sugestão"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={rejectSuggestion}
                    className="p-1 bg-red-500 text-white rounded hover:bg-red-600"
                    title="Recusar sugestão"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="suggestion-text">
                {suggestion}
              </div>
              <div className="shortcuts-hint">
                <span><span className="shortcut-key">Tab</span> para aceitar</span>
                <span><span className="shortcut-key">Esc</span> para recusar</span>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {showGeminiChat && (
        <div className="w-1/3 border-l border-gray-200">
          <GeminiChat />
        </div>
      )}
    </div>
  );
}