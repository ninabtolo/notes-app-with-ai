import React, { useRef, useEffect, useState } from 'react';
import { Note } from '../types';
import { Type, Palette, Download, Bold, Highlighter } from 'lucide-react'; 
import html2pdf from 'html2pdf.js';
import { ipcRenderer } from 'electron';
import './Editor.css';

interface EditorProps {
  note: Note | null;
  onUpdateNote: (note: Note) => void;
}

export function Editor({ note, onUpdateNote }: EditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [dropdown, setDropdown] = useState<string | null>(null);
  const [savedRange, setSavedRange] = useState<Range | null>(null);

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
      } else {ng
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

  if (!note) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-500">
        Select a note or create a new one
      </div>
    );
  }

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdateNote({
      ...note,
      title: e.target.value,
      updatedAt: new Date(),
    });
  };

  const handleContentChange = () => {
    if (editorRef.current) {
      onUpdateNote({
        ...note,
        content: editorRef.current.innerHTML,
        updatedAt: new Date(),
      });
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

  return (
    <div className="flex-1 p-6 space-y-4">
      <div className="flex items-center justify-between">
        <input
          type="text"
          value={note.title}
          onChange={handleTitleChange}
          placeholder="Note title"
          className="flex-1 text-4xl font-bold focus:outline-none"
        />
        <button 
          onClick={exportToPDF}
          className="flex items-center space-x-1 px-3 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition"
        >
          <Download className="w-5 h-5" />
          <span>Export PDF</span>
        </button>
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

      <div
        ref={editorRef}
        contentEditable
        onInput={handleContentChange}
        className="w-full h-[calc(100vh-250px)] focus:outline-none overflow-y-auto"
        placeholder="Start writing your note..."
      />
    </div>
  );
}