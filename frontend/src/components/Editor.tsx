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
  const [chatVisible, setChatVisible] = useState<boolean>(false);
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

  const handleContentChange = () => {
    if (editorRef.current) {
      onUpdateNote({
        ...note,
        content: editorRef.current.innerHTML,
        updatedAt: new Date().toISOString(),
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
    setShowGeminiChat(!showGeminiChat);
  };

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
                <div className="cover-adjusting-container" style={{ 
                  height: "192px", 
                  background: "#000", 
                  overflow: "hidden", 
                  position: "relative", 
                  borderRadius: "0.5rem",
                  cursor: "ns-resize"
                }}>
                  <div className="cover-crop-controls" style={{ position: "absolute", top: "10px", right: "10px", zIndex: 1000, display: "flex", gap: "10px" }}>
                    <button 
                      onClick={saveAdjustedCover}
                      className="save-crop-btn"
                      style={{
                        padding: "8px",
                        background: "white",
                        color: "#374151",
                        borderRadius: "9999px",
                        boxShadow: "0 2px 4px rgba(0, 0, 0, 0.2)",
                        border: "none",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center"
                      }}
                      title="Save adjustment"
                    >
                      <Save className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={cancelAdjustingCover}
                      className="cancel-crop-btn"
                      style={{
                        padding: "8px",
                        background: "white",
                        color: "#374151",
                        borderRadius: "9999px",
                        boxShadow: "0 2px 4px rgba(0, 0, 0, 0.2)",
                        border: "none",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center"
                      }}
                      title="Cancel"
                    >
                      <XCircle className="w-5 h-5" />
                    </button>
                  </div>
                  
                  <div style={{ 
                    position: "absolute", 
                    bottom: "10px", 
                    left: "50%", 
                    transform: "translateX(-50%)", 
                    backgroundColor: "rgba(0,0,0,0.5)", 
                    borderRadius: "4px", 
                    padding: "4px 8px",
                    zIndex: 100,
                    color: "white",
                    fontSize: "12px",
                    pointerEvents: "none"
                  }}>
                    Drag image up or down to adjust position
                  </div>
                  
                  <div 
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      zIndex: 30,
                      cursor: "ns-resize"
                    }}
                    onMouseDown={handleMouseDown}
                  />
                  
                  <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 20 }}>
                    <img
                      ref={imageRef}
                      src={imageToCrop}
                      style={{ 
                        transform: `translateY(${imageOffsetY}px)`,
                        width: '100%',
                        maxWidth: '100%',
                        height: 'auto',
                        objectFit: 'cover',
                      }}
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
          </div>
        </div>

        {chatVisible && (
          <div className="chat-container chat-container-enter">
            <GeminiChat onClose={() => setShowGeminiChat(false)} />
          </div>
        )}
      </div>
    </div>
  );
}

const style = document.createElement('style');
style.innerHTML = `
  label:focus, label:focus-visible, button:focus {
    outline: none !important;
    border: none !important;
    box-shadow: none !important;
  }
`;
document.head.appendChild(style);

const styleForCss = document.createElement('style');
styleForCss.innerHTML = `
  .editor-main-container {
    height: 100vh;
    overflow-y: auto;
    position: relative;
  }
  
  .no-scrollbar::-webkit-scrollbar {
    display: none;
  }
  
  .no-scrollbar {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
`;
document.head.appendChild(styleForCss);