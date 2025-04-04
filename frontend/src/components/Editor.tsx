import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Note } from '../types';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import './Editor.css';
import GeminiChat from './GeminiChat';
import { generateSuggestion } from '../gemini';
import debounce from 'lodash.debounce';
import { ipc } from '../utils/ipc';
import { EditorToolbar } from './editor/EditorToolbar';
import { EditorHeader } from './editor/EditorHeader';
import { CoverImage } from './editor/CoverImage';
import { SuggestionPopup } from './editor/SuggestionPopup';
import { LinkForm } from './editor/LinkForm';

declare global {
  interface Window {
    openExternalLink?: (url: string) => boolean;
  }
}

interface EditorProps {
  note: Note | null;
  onUpdateNote: (note: Note) => void;
}

export function Editor({ note, onUpdateNote }: EditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [savedRange, setSavedRange] = useState<Range | null>(null);
  const [showGeminiChat, setShowGeminiChat] = useState<boolean>(false);
  const [suggestion, setSuggestion] = useState<string>('');
  const [showSuggestion, setShowSuggestion] = useState<boolean>(false);
  const [isGeneratingSuggestion, setIsGeneratingSuggestion] = useState<boolean>(false);
  const [isSuggestionEnabled, setIsSuggestionEnabled] = useState<boolean>(false);
  const lastCursorPosition = useRef<Range | null>(null);
  const [suggestionPosition, setSuggestionPosition] = useState<{ top: number; left: number } | null>(null);
  const [recentlyAcceptedSuggestion, setRecentlyAcceptedSuggestion] = useState<boolean>(false);
  const [showSettingsDropdown, setShowSettingsDropdown] = useState<boolean>(false);
  const settingsButtonRef = useRef<HTMLButtonElement>(null);
  const settingsDropdownRef = useRef<HTMLDivElement>(null);
  const [showLinkForm, setShowLinkForm] = useState<boolean>(false);
  const [linkUrl, setLinkUrl] = useState<string>('');
  const [linkTitle, setLinkTitle] = useState<string>('');
  const linkFormRef = useRef<HTMLDivElement>(null);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [isAdjustingCover, setIsAdjustingCover] = useState(false);
  const [imageOffsetY, setImageOffsetY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const imageRef = useRef<HTMLImageElement>(null);
  const dragStartYRef = useRef<number>(0);
  const [chatClosing, setChatClosing] = useState<boolean>(false);
  const [chatEntering, setChatEntering] = useState<boolean>(false);

  const restoreSelection = () => {
    if (savedRange) {
      const selection = window.getSelection();
      if (selection) {
        selection.removeAllRanges();
        selection.addRange(savedRange);
      }
    }
  };

  const handleContentChange = () => {
    if (editorRef.current && note) {
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

  const applyFormatting = (command: string, value?: string) => {
    restoreSelection();
    
    if (command === 'backColor') {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const selectedText = range.toString();
        
        if (selectedText.trim().length > 0) {
          if (value === 'transparent') {
            document.execCommand(command, false, value);
          } else {
            document.execCommand(command, false, value);
            const newRange = selection.getRangeAt(0);
            newRange.collapse(false);
          }
        } else if (value !== 'transparent') {
          const span = document.createElement('span');
          span.style.backgroundColor = value || '';
          span.setAttribute('data-empty-highlight', 'true');
          span.textContent = '\u200B';
          range.insertNode(span);
          range.selectNodeContents(span);
          range.collapse(true);
          selection.removeAllRanges();
          selection.addRange(range);
        }
      }
    } else {
      document.execCommand(command, false, value);
    }
    
    handleContentChange();
    setSavedRange(null);
  };

  const cleanupEmptyHighlights = (container: HTMLElement | null) => {
    if (!container) return;
    
    const emptySpans = Array.from(container.querySelectorAll('span[style*="background-color"]'))
      .filter(span => {
        if (span.hasAttribute('data-empty-highlight')) {
          return true;
        }
        
        const hasOnlyWhitespace = !span.textContent?.trim();
        
        if (hasOnlyWhitespace) {
          const prev = span.previousSibling;
          const next = span.nextSibling;
          
          const prevHasContent = prev && prev.textContent && prev.textContent.trim() !== '';
          const nextHasContent = next && next.textContent && next.textContent.trim() !== '';
          
          return !(prevHasContent && nextHasContent);
        }
        
        return false;
      });
    
    emptySpans.forEach(span => {
      const textContent = span.textContent || '';
      const text = document.createTextNode(textContent);
      if (span.parentNode) {
        span.parentNode.insertBefore(text, span);
        span.parentNode.removeChild(span);
      }
    });
  };

  useEffect(() => {
    const handleInput = (e: Event) => {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;
      
      const range = selection.getRangeAt(0);
      const node = range.startContainer;
      
      if (node.nodeType === Node.TEXT_NODE && node.parentElement) {
        const parent = node.parentElement;
        
        if (parent.hasAttribute('data-empty-highlight')) {
          if (!node.textContent?.trim()) {
            const content = node.textContent || '';
            const textNode = document.createTextNode(content);
            const parentNode = parent.parentNode;
            if (parentNode) {
              parentNode.insertBefore(textNode, parent);
              parentNode.removeChild(parent);
            }
            
            const newRange = document.createRange();
            newRange.setStart(textNode, content.length);
            newRange.setEnd(textNode, content.length);
            selection.removeAllRanges();
            selection.addRange(newRange);
          } else {
            parent.removeAttribute('data-empty-highlight');
          }
        } else if (parent.style.backgroundColor && !node.textContent?.trim()) {
          const content = node.textContent || '';
          const textNode = document.createTextNode(content);
          const parentNode = parent.parentNode;
          if (parentNode) {
            parentNode.insertBefore(textNode, parent);
            parentNode.removeChild(parent);
          }
          
          const newRange = document.createRange();
          newRange.setStart(textNode, content.length);
          newRange.setEnd(textNode, content.length);
          selection.removeAllRanges();
          selection.addRange(newRange);
        }
      }
    };
    
    if (editorRef.current) {
      editorRef.current.addEventListener('input', handleInput);
    }
    
    return () => {
      if (editorRef.current) {
        editorRef.current.removeEventListener('input', handleInput);
      }
    };
  }, []);

  useEffect(() => {
    const handleEditorInput = () => {
      cleanupEmptyHighlights(editorRef.current);
      handleContentChange();
    };
    
    if (editorRef.current) {
      editorRef.current.addEventListener('input', handleEditorInput);
    }
    
    return () => {
      if (editorRef.current) {
        editorRef.current.removeEventListener('input', handleEditorInput);
      }
    };
  }, []);

  useEffect(() => {
    if (editorRef.current && note) {
      editorRef.current.innerHTML = note.content;
    }
  }, [note?.id]);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!note) return;
    
    onUpdateNote({
      ...note,
      title: e.target.value,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleCoverImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!note || !e.target.files || !e.target.files[0]) return;
    
    const reader = new FileReader();
    reader.onload = () => {
      if (!reader.result || !note) return;
      
      const imageResult = reader.result as string;
      setImageToCrop(imageResult);
      onUpdateNote({
        ...note,
        coverImage: imageResult,
        updatedAt: new Date().toISOString(),
      });
      setTimeout(() => {
        setIsAdjustingCover(true);
      }, 100);
    };
    reader.readAsDataURL(e.target.files[0]);
  };

  const saveAdjustedCover = () => {
    if (!imageToCrop || !imageRef.current || !note) {
      setIsAdjustingCover(false);
      return;
    }

    try {
      const img = new window.Image();
      img.crossOrigin = "anonymous";

      img.onload = () => {
        try {
          if (!imageRef.current || !note) return;
          
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

          ipc.invoke('save-note-sync', updatedNote)
            .then(() => {})
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

  const exportToPDF = () => {
    if (!editorRef.current || !note) return;
    
    const pdfContent = document.createElement('div');
    pdfContent.className = 'pdf-export-container';
    pdfContent.style.padding = '20px';
    pdfContent.style.backgroundColor = 'white';
    pdfContent.style.width = '794px';
    pdfContent.style.maxWidth = '794px';
    pdfContent.style.boxSizing = 'border-box';
    pdfContent.style.position = 'absolute';
    pdfContent.style.left = '-9999px';
    pdfContent.style.top = '0';
    pdfContent.style.fontFamily = 'Arial, sans-serif';
    pdfContent.style.wordWrap = 'break-word';
    
    const contentClone = editorRef.current.cloneNode(true) as HTMLElement;
    
    const linkBoxes = contentClone.querySelectorAll('.link-box');
    linkBoxes.forEach(box => {
      const linkBox = box as HTMLElement;
      const url = linkBox.getAttribute('data-url') || '';
      const title = linkBox.querySelector('.link-title')?.textContent || '';
      
      linkBox.innerHTML = `
        <div style="margin-bottom: 5px; font-weight: bold;">${title}</div>
        <div style="font-size: 0.9em; color: #4361ee;">${url}</div>
      `;
      linkBox.style.border = '1px solid #e2e8f0';
      linkBox.style.padding = '10px';
      linkBox.style.borderRadius = '5px';
      linkBox.style.marginBottom = '10px';
      linkBox.style.backgroundColor = '#f8fafc';
    });
    
    const highlightedElements = contentClone.querySelectorAll('[style*="background-color"]');
    highlightedElements.forEach(el => {
      const element = el as HTMLElement;
      element.style.backgroundColor = '';
    });
    
    pdfContent.innerHTML = `
      <h1 style="font-size: 24px; font-weight: bold; margin-bottom: 16px;">${note.title || 'Untitled'}</h1>
      ${contentClone.innerHTML}
      <div style="height: 20px;"></div> 
    `;
    
    document.body.appendChild(pdfContent);
  
    html2canvas(pdfContent, {
      scale: 1.5,
      useCORS: true,
      logging: false,
      allowTaint: true,
      width: 794, 
      windowWidth: 794
    }).then(canvas => {
      document.body.removeChild(pdfContent);
      
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const canvasRatio = canvas.height / canvas.width;
      const imgWidth = pdfWidth - 20; 
      const imgHeight = imgWidth * canvasRatio;
      const xPos = 10; 
      
      let position = 0;
      let heightLeft = imgHeight;
      
      pdf.addImage(
        imgData, 
        'JPEG', 
        xPos,
        position + 10, 
        imgWidth,
        imgHeight,
        '', 
        'FAST'
      );
      
      heightLeft -= (pdfHeight - 20);
      
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(
          imgData, 
          'JPEG', 
          xPos,
          position + 10, 
          imgWidth, 
          imgHeight,
          '', 
          'FAST'
        );
        heightLeft -= (pdfHeight - 20);
      }
      
      pdf.save(`${note.title || 'note'}.pdf`);
    });
    
    setShowSettingsDropdown(false);
  };

  const toggleSuggestions = () => {
    setIsSuggestionEnabled(!isSuggestionEnabled);
    if (isSuggestionEnabled) {
      setSuggestion('');
      setShowSuggestion(false);
    }
    setShowSettingsDropdown(false);
  };

  const toggleChat = () => {
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
      if (showSuggestion && suggestion) {
        if (e.key === 'Tab' && !e.shiftKey) {
          e.preventDefault();
          acceptSuggestion();
          return;
        } else if (e.key === 'Escape') {
          e.preventDefault();
          rejectSuggestion();
          return;
        }
      }
      
      if (e.key === 'Enter') {
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          const currentNode = range.startContainer;
          
          let highlightSpan = null;
          if (currentNode.nodeType === Node.TEXT_NODE && currentNode.parentElement) {
            if (currentNode.parentElement.style.backgroundColor) {
              highlightSpan = currentNode.parentElement;
            }
          } else if (currentNode.nodeType === Node.ELEMENT_NODE && 
                    (currentNode as HTMLElement).style && 
                    (currentNode as HTMLElement).style.backgroundColor) {
            highlightSpan = currentNode as HTMLElement;
          }
          
          if (highlightSpan) {
            const backgroundColor = highlightSpan.style.backgroundColor;
            
            setTimeout(() => {
              const newSelection = window.getSelection();
              if (newSelection && newSelection.rangeCount > 0) {
                const newRange = newSelection.getRangeAt(0);
                const span = document.createElement('span');
                span.style.backgroundColor = backgroundColor;
                
                newRange.insertNode(span);
                
                newRange.selectNodeContents(span);
                newRange.collapse(true);
                newSelection.removeAllRanges();
                newSelection.addRange(newRange);
                
                handleContentChange();
              }
            }, 0);
          }
        }
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
    window.openExternalLink = (url: string) => {
      ipc.openExternal(url);
      return false;
    };
    
    return () => {
      delete window.openExternalLink;
    };
  }, []);

  const handleLinkClick = useCallback((e: MouseEvent) => {
    const target = e.target as HTMLElement;
    const linkBox = target.closest('.link-box');
    
    if (linkBox) {
      e.preventDefault();
      e.stopPropagation();
      
      const url = linkBox.getAttribute('data-url');
      
      if (url) {
        ipc.openExternal(url);
      }
      
      setTimeout(() => {
        const range = document.createRange();
        const selection = window.getSelection();
        
        if (linkBox.nextSibling) {
          range.setStartAfter(linkBox);
          range.collapse(true);
          
          if (selection) {
            selection.removeAllRanges();
            selection.addRange(range);
          }
        } else if (linkBox.parentNode) {
          const br = document.createElement('br');
          linkBox.parentNode.insertBefore(br, linkBox.nextSibling);
          
          range.setStartAfter(br);
          range.collapse(true);
          
          if (selection) {
            selection.removeAllRanges();
            selection.addRange(range);
          }
        }
      }, 0);
    }
  }, []);

  useEffect(() => {
    const editorElement = editorRef.current;
    if (editorElement) {
      editorElement.removeEventListener('click', handleLinkClick as any);
      editorElement.addEventListener('click', handleLinkClick as any);
    }
    
    return () => {
      if (editorElement) {
        editorElement.removeEventListener('click', handleLinkClick as any);
      }
    };
  }, [handleLinkClick]);

  const insertLink = () => {
    if (!linkUrl.trim() || !linkTitle.trim() || !editorRef.current) return;
  
    let formattedUrl = linkUrl.trim();
    if (!/^https?:\/\//i.test(formattedUrl)) {
      formattedUrl = 'https://' + formattedUrl;
    }
  
    editorRef.current.focus();
    restoreSelection();
  
    const linkBox = document.createElement('div');
    linkBox.className = 'link-box';
    linkBox.setAttribute('data-url', formattedUrl);
    linkBox.setAttribute('role', 'button');
    linkBox.setAttribute('tabindex', '0');
    linkBox.setAttribute('title', `Abrir ${formattedUrl}`);
    linkBox.setAttribute('onclick', `return window.openExternalLink('${formattedUrl.replace(/'/g, "\\'")}')`);
    linkBox.innerHTML = `
      <div class="link-title">${linkTitle}</div>
      <div class="link-url">${formattedUrl}</div>
    `;
  
    if (savedRange) {
      const isRangeInEditor = editorRef.current.contains(savedRange.commonAncestorContainer);
      if (!isRangeInEditor) return; 
  
      savedRange.deleteContents();
      savedRange.insertNode(linkBox);
  
      const br = document.createElement('br');
      linkBox.parentNode?.insertBefore(br, linkBox.nextSibling);
  
      const range = document.createRange();
      range.setStartAfter(br);
      range.collapse(true);
  
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
    } else {
      editorRef.current.appendChild(linkBox);
      editorRef.current.appendChild(document.createElement('br'));
  
      const range = document.createRange();
      range.selectNodeContents(editorRef.current);
      range.collapse(false);
  
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
    }
  
    setLinkUrl('');
    setLinkTitle('');
    setShowLinkForm(false);
    handleContentChange();
  };

  const toggleLinkForm = () => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      setSavedRange(selection.getRangeAt(0));
    }
    setShowLinkForm(!showLinkForm);
  };

  useEffect(() => {
    const handleClickOutsideLinkForm = (event: MouseEvent) => {
      if (
        linkFormRef.current && 
        !linkFormRef.current.contains(event.target as Node) &&
        !(event.target as Element).closest('.add-link-button')
      ) {
        setShowLinkForm(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutsideLinkForm);
    return () => {
      document.removeEventListener('mousedown', handleClickOutsideLinkForm);
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
          <CoverImage 
            coverImage={note.coverImage}
            isAdjustingCover={isAdjustingCover}
            imageToCrop={imageToCrop}
            imageOffsetY={imageOffsetY}
            imageRef={imageRef}
            isDragging={isDragging}
            onSaveAdjustedCover={saveAdjustedCover}
            onCancelAdjusting={cancelAdjustingCover}
            onMouseDown={handleMouseDown}
          />

          <EditorHeader
            title={note.title}
            onTitleChange={handleTitleChange}
            onToggleChat={toggleChat}
            onToggleSettings={toggleSettingsDropdown}
            showSettingsDropdown={showSettingsDropdown}
            settingsButtonRef={settingsButtonRef}
            settingsDropdownRef={settingsDropdownRef}
            isSuggestionEnabled={isSuggestionEnabled}
            onToggleSuggestions={toggleSuggestions}
            onExportPDF={exportToPDF}
          />

          <EditorToolbar 
            onApplyFormatting={applyFormatting}
            onRestoreSelection={restoreSelection}
            onToggleLinkForm={toggleLinkForm}
          />

          <div className="editor-container flex-1">
            <div
              ref={editorRef}
              contentEditable={true}
              onInput={handleContentChange}
              className="w-full h-full focus:outline-none overflow-y-auto custom-scrollbar"
              data-placeholder="Start writing your note..."
            />

            {showSuggestion && suggestion && suggestionPosition && (
              <SuggestionPopup 
                suggestion={suggestion}
                position={suggestionPosition}
                onAccept={acceptSuggestion}
                onReject={rejectSuggestion}
              />
            )}
          </div>
          
          <LinkForm 
            showForm={showLinkForm}
            formRef={linkFormRef}
            linkTitle={linkTitle}
            linkUrl={linkUrl}
            onTitleChange={(e) => setLinkTitle(e.target.value)}
            onUrlChange={(e) => setLinkUrl(e.target.value)}
            onInsert={insertLink}
            onCancel={() => setShowLinkForm(false)}
          />
        </div>

        <input
          type="file"
          accept="image/*"
          onChange={handleCoverImageChange}
          className="hidden"
          id="cover-image-upload"
        />

        {showGeminiChat && (
          <div className={`chat-container ${chatEntering ? 'entering' : ''} ${chatClosing ? 'closing' : ''}`}>
            <GeminiChat onClose={() => {
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

