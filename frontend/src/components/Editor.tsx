import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Note } from '../types';
import { Type, Palette, Download, Bold, Highlighter, MessageSquare, Check, X, Lightbulb, Settings, Image, Save, XCircle } from 'lucide-react'; 
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
  const [suggestionPosition, setSuggestionPosition] = useState<{ top: number; left: number } | null>(null);
  const suggestionRef = useRef<HTMLDivElement>(null);
  const [recentlyAcceptedSuggestion, setRecentlyAcceptedSuggestion] = useState<boolean>(false);
  const [showSettingsDropdown, setShowSettingsDropdown] = useState<boolean>(false);
  const settingsButtonRef = useRef<HTMLButtonElement>(null);
  const settingsDropdownRef = useRef<HTMLDivElement>(null);
  const [isCropping, setIsCropping] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [isAdjustingCover, setIsAdjustingCover] = useState(false);
  const [dragStartY, setDragStartY] = useState(0);
  const [imageOffsetY, setImageOffsetY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const imageRef = useRef<HTMLImageElement>(null);
  const dragStartYRef = useRef<number>(0);
  const [chatClosing, setChatClosing] = useState<boolean>(false);
  const [chatEntering, setChatEntering] = useState<boolean>(false);

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
    document.execCommand(command, false, value);
    handleContentChange();
    setDropdown(null);
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
      updatedAt: new Date().toISOString(),
    });
  };

  const handleCoverImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onload = () => {
        setImageToCrop(reader.result as string);
        onUpdateNote({
          ...note,
          coverImage: reader.result as string,
          updatedAt: new Date().toISOString(),
        });
        setTimeout(() => {
          setIsAdjustingCover(true);
        }, 100);
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const saveAdjustedCover = () => {
    if (!imageToCrop || !imageRef.current) {
      setIsAdjustingCover(false);
      return;
    }

    try {
      const img = new window.Image();
      img.crossOrigin = "anonymous";

      img.onload = () => {
        try {
          const containerHeight = 192;
          const imageHeight = imageRef.current.clientHeight;
          const scaleY = img.naturalHeight / imageHeight;

          const sourceY = Math.max(0, -imageOffsetY * scaleY);
          const maxSourceY = img.naturalHeight - containerHeight * scaleY;
          const adjustedSourceY = Math.min(sourceY, maxSourceY);

          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth;
          canvas.height = containerHeight * scaleY;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            setIsAdjustingCover(false);
            return;
          }

          ctx.fillStyle = '#000';
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          ctx.drawImage(
            img,
            0,
            adjustedSourceY,
            img.naturalWidth,
            containerHeight * scaleY,
            0,
            0,
            canvas.width,
            canvas.height
          );

          const croppedImage = canvas.toDataURL('image/jpeg', 0.9);

          const updatedNote = {
            ...note,
            coverImage: croppedImage,
            updatedAt: new Date().toISOString(),
          };

          ipcRenderer.invoke('save-note-sync', updatedNote)
            .then(() => console.log("Note saved to database successfully"))
            .catch(err => console.error("Error saving note:", err));

          onUpdateNote(updatedNote);

          setIsAdjustingCover(false);
          setImageToCrop(null);
        } catch (err) {
          setIsAdjustingCover(false);
        }
      };

      img.onerror = () => {
        setIsAdjustingCover(false);
      };

      img.src = imageToCrop;
    } catch (err) {
      setIsAdjustingCover(false);
    }
  };

  const cancelAdjustingCover = () => {
    setIsAdjustingCover(false);
    setImageToCrop(null);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    dragStartYRef.current = e.clientY;
    setDragStartY(e.clientY);
    setIsDragging(true);
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !imageRef.current) return;
    
    const deltaY = e.clientY - dragStartYRef.current;
    dragStartYRef.current = e.clientY;
    
    const imageHeight = imageRef.current.clientHeight;
    const containerHeight = 192;
    const maxOffset = Math.max(0, imageHeight - containerHeight);
    
    setImageOffsetY((prev) => {
      const newOffset = Math.min(0, Math.max(-maxOffset, prev + deltaY));
      return newOffset;
    });
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
    }
  }, [isDragging]);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    } else {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

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

  const getTextContextAroundCursor = () => {
    if (!editorRef.current) return { textBefore: '', textAfter: '' };

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return { textBefore: '', textAfter: '' };

    const range = selection.getRangeAt(0).cloneRange();

    const beforeRange = document.createRange();
    beforeRange.setStart(editorRef.current, 0);
    beforeRange.setEnd(range.startContainer, range.startOffset);

    const tempBeforeDiv = document.createElement('div');
    tempBeforeDiv.appendChild(beforeRange.cloneContents());
    const textBefore = tempBeforeDiv.textContent || '';

    const afterRange = document.createRange();
    afterRange.setStart(range.startContainer, range.startOffset);
    afterRange.selectNodeContents(editorRef.current);

    const tempAfterDiv = document.createElement('div');
    tempAfterDiv.appendChild(afterRange.cloneContents());
    const textAfter = tempAfterDiv.textContent || '';

    return { textBefore, textAfter };
  };

  const requestSuggestion = useCallback(
    debounce(async () => {
      if (!isSuggestionEnabled || !editorRef.current || isGeneratingSuggestion) return;

      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;

      lastCursorPosition.current = selection.getRangeAt(0).cloneRange();
      calculateCursorPosition();

      const { textBefore, textAfter } = getTextContextAroundCursor();

      if (textBefore.length < 20) {
        setSuggestion('');
        setShowSuggestion(false);
        return;
      }

      setIsGeneratingSuggestion(true);
      try {
        const newSuggestion = await generateSuggestion(textBefore, textAfter, recentlyAcceptedSuggestion);
        if (newSuggestion && newSuggestion.trim()) {
          setSuggestion(newSuggestion.trim());
          setShowSuggestion(true);

          if (recentlyAcceptedSuggestion) {
            setRecentlyAcceptedSuggestion(false);
          }
        }
      } catch (error) {
        console.error('Error generating suggestion:', error);
      } finally {
        setIsGeneratingSuggestion(false);
      }
    }, 1500),
    [isGeneratingSuggestion, isSuggestionEnabled, recentlyAcceptedSuggestion]
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

      const range = document.createRange();
      range.selectNodeContents(span);
      range.collapse(false);

      selection?.removeAllRanges();
      selection?.addRange(range);

      lastCursorPosition.current = range.cloneRange();

      setRecentlyAcceptedSuggestion(true);

      handleContentChange();
    } else {
      editorRef.current.innerHTML += ` ${suggestion}`;

      const range = document.createRange();
      const selection = window.getSelection();

      range.selectNodeContents(editorRef.current);
      range.collapse(false);

      selection?.removeAllRanges();
      selection?.addRange(range);

      setRecentlyAcceptedSuggestion(true);

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
        updatedAt: new Date().toISOString(),
      });

      if (isSuggestionEnabled) {
        if (recentlyAcceptedSuggestion) {
          setTimeout(() => {
            requestSuggestion();
          }, 800);
        } else {
          requestSuggestion();
        }
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
        windowHeight: document.documentElement.offsetHeight,
      },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' },
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

  const toggleChat = () => {
    console.log("Toggle chat clicked, current state:", !showGeminiChat);
    if (showGeminiChat) {
      setChatClosing(true);
      setChatEntering(false);
      setTimeout(() => {
        setShowGeminiChat(false);
        setChatClosing(false);
      }, 300);
    } else {
      setShowGeminiChat(true);
      setTimeout(() => {
        setChatEntering(true);
      }, 10);
    }
  };

  useEffect(() => {
    if (showGeminiChat) {
      setTimeout(() => {
        setChatEntering(true);
      }, 10);
    }
  }, [showGeminiChat]);

  const toggleSettingsDropdown = () => {
    setShowSettingsDropdown(!showSettingsDropdown);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        settingsButtonRef.current && 
        settingsDropdownRef.current && 
        !settingsButtonRef.current.contains(event.target as Node) && 
        !settingsDropdownRef.current.contains(event.target as Node)
      ) {
        setShowSettingsDropdown(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

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
    const handleSelectionChange = (e: Event) => {
      if (!showSuggestion || !suggestion) return;
      
      if (suggestionRef.current && e instanceof MouseEvent) {
        const clickedElement = e.target as Node;
        if (suggestionRef.current.contains(clickedElement)) {
          return;
        }
      }

      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const container = range.startContainer;

        if (editorRef.current && editorRef.current.contains(container)) {
          calculateCursorPosition();
        }
      }
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    
    const handleSuggestionClick = (e: MouseEvent) => {
      e.stopPropagation(); 
    };
    
    if (suggestionRef.current) {
      suggestionRef.current.addEventListener('mousedown', handleSuggestionClick);
    }

    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
      if (suggestionRef.current) {
        suggestionRef.current.removeEventListener('mousedown', handleSuggestionClick);
      }
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
    <div className="flex-1 flex relative">
      <div className="flex-1 flex flex-col h-full">
        <div className="flex-1 p-6 space-y-4 editor-main-container no-scrollbar">
          {note.coverImage && (
            <div className="mb-4 relative">
              {isAdjustingCover ? (
                <div className="cover-adjusting-container">
                  <div className="cover-crop-controls">
                    <button 
                      onClick={saveAdjustedCover}
                      className="save-crop-btn"
                      title="Save adjustment"
                    >
                      <Save className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={cancelAdjustingCover}
                      className="cancel-crop-btn"
                      title="Cancel"
                    >
                      <XCircle className="w-5 h-5" />
                    </button>
                  </div>
                  
                  <div className="drag-instructions">
                    Drag image up or down to adjust position
                  </div>
                  
                  <div className="drag-overlay" onMouseDown={handleMouseDown} />
                  
                  <div className="image-container">
                    <img
                      ref={imageRef}
                      src={imageToCrop}
                      style={{ transform: `translateY(${imageOffsetY}px)` }}
                      className="w-full max-w-full h-auto object-cover"
                      alt="Adjusting cover"
                      draggable="false"
                    />
                  </div>
                </div>
              ) : (
                <img
                  src={note.coverImage}
                  alt="Cover"
                  className="w-full h-48 object-cover rounded-lg"
                />
              )}
            </div>
          )}

          <div className="flex items-center justify-between">
            <input
              type="text"
              value={note?.title || ''}
              onChange={handleTitleChange}
              placeholder="Note title"
              className="flex-1 text-4xl font-bold focus:outline-none leading-relaxed"
            />
            <div className="flex items-center space-x-2 editor-buttons">
              <div className="relative">
                <button
                  ref={settingsButtonRef}
                  onClick={toggleSettingsDropdown}
                  className="flex items-center justify-center p-2 bg-purple-100 text-gray-700 rounded-full hover:bg-purple-200 transition"
                  title="Settings"
                >
                  <Settings className="w-5 h-5" />
                </button>
                {showSettingsDropdown && (
                  <div 
                    ref={settingsDropdownRef}
                    className="absolute top-full right-0 mt-2 bg-white shadow-lg rounded p-2 z-20 w-48"
                  >
                    <button 
                      onClick={() => {
                        toggleSuggestions();
                        setShowSettingsDropdown(false);
                      }} 
                      className="w-full flex items-center justify-between px-4 py-2 hover:bg-gray-100 rounded"
                    >
                      <div className="flex items-center space-x-2">
                        <Lightbulb className="w-4 h-4" />
                        <span>AI suggestions</span>
                      </div>
                      {isSuggestionEnabled && <Check className="w-4 h-4 ml-2 text-black" />}
                    </button>
                    <button 
                      onClick={() => {
                        exportToPDF();
                        setShowSettingsDropdown(false);
                      }} 
                      className="w-full flex items-center space-x-2 px-4 py-2 hover:bg-gray-100 rounded"
                    >
                      <Download className="w-4 h-4" />
                      <span>Export PDF</span>
                    </button>
                  </div>
                )}
              </div>
              <button
                onClick={toggleChat}
                className="flex items-center justify-center p-2 bg-purple-100 text-gray-700 rounded-full hover:bg-purple-200 transition"
                title={showGeminiChat ? "Close AI" : "Open AI"}
              >
                <MessageSquare className="w-5 h-5" />
              </button>
              <input
                type="file"
                accept="image/*"
                onChange={handleCoverImageChange}
                className="hidden"
                id="cover-image-upload"
              />
              <button
                className="flex items-center justify-center p-2 bg-purple-100 text-gray-700 rounded-full hover:bg-purple-200 transition"
                title="Upload Cover Image"
              >
                <label htmlFor="cover-image-upload" className="cursor-pointer focus:outline-none">
                  <Image className="w-5 h-5" />
                </label>
              </button>
            </div>
          </div>

          <div className="flex items-center space-x-2 py-2 border-b">
            <div className="relative">
              <button
                onClick={() => toggleDropdown('fontSize')}
                className="flex items-center space-x-1 px-2 py-1 hover:bg-purple-100 rounded"
              >
                <Type className="w-4 h-4" />
                <span>Font Size</span>
              </button>
              {dropdown === 'fontSize' && (
                <div className="absolute top-full left-0 mt-2 bg-white shadow-lg rounded p-2 z-10">
                  <button onClick={() => applyFormatting('fontSize', '2')} className="block px-4 py-2 hover:bg-gray-100">
                    Small
                  </button>
                  <button onClick={() => applyFormatting('fontSize', '3')} className="block px-4 py-2 hover:bg-gray-100">
                    Normal
                  </button>
                  <button onClick={() => applyFormatting('fontSize', '4')} className="block px-4 py-2 hover:bg-gray-100">
                    Large
                  </button>
                  <button onClick={() => applyFormatting('fontSize', '5')} className="block px-4 py-2 hover:bg-gray-100">
                    Extra L
                  </button>
                </div>
              )}
            </div>

            <div className="relative">
              <button
                onClick={() => toggleDropdown('foreColor')}
                className="flex items-center space-x-1 px-2 py-1 hover:bg-purple-100 rounded"
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
                className="flex items-center space-x-1 px-2 py-1 hover:bg-purple-100 rounded"
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
                  <button
                    onClick={() => applyFormatting('backColor', 'transparent')}
                    className="w-6 h-6 bg-transparent border-2 border-gray-300 rounded"
                  />
                </div>
              )}
            </div>
            <div className="relative">
              <button
                onClick={() => toggleDropdown('textFormat')}
                className="flex items-center space-x-1 px-2 py-1 hover:bg-purple-100 rounded"
              >
                <Bold className="w-4 h-4" />
                <span>Format</span>
              </button>
              {dropdown === 'textFormat' && (
                <div className="absolute top-full left-0 mt-2 bg-white shadow-lg rounded p-2 z-10">
                  <button onClick={() => applyFormatting('bold')} className="block px-4 py-2 hover:bg-gray-100">
                    Bold
                  </button>
                  <button onClick={() => applyFormatting('italic')} className="block px-4 py-2 hover:bg-gray-100">
                    Italic
                  </button>
                  <button onClick={() => applyFormatting('underline')} className="block px-4 py-2 hover:bg-gray-100">
                    Underline
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="editor-container flex-1">
            <div
              ref={editorRef}
              contentEditable
              onInput={handleContentChange}
              className="w-full h-full focus:outline-none overflow-y-auto custom-scrollbar"
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
                onMouseDown={(e) => e.stopPropagation()}
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
                <div className="suggestion-text">{suggestion}</div>
                <div className="shortcuts-hint">
                  <span>
                    <span className="shortcut-key">Tab</span> para aceitar
                  </span>
                  <span>
                    <span className="shortcut-key">Esc</span> para recusar
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {showGeminiChat && (
          <div className={`chat-container ${chatEntering ? 'entering' : ''} ${chatClosing ? 'closing' : ''}`}>
            <GeminiChat onClose={() => {
              console.log("Closing chat");
              setChatClosing(true);
              setChatEntering(false);
              setTimeout(() => {
                setShowGeminiChat(false);
                setChatClosing(false);
              }, 300);
            }} />
          </div>
        )}
      </div>
    </div>
  );
}