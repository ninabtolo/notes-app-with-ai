import React, { useState, useEffect, useCallback } from 'react';
import { Note } from './types';
import { Sidebar } from './components/Sidebar';
import { Editor } from './components/Editor';
import { WelcomeScreen } from './components/WelcomeScreen';
import { ipc } from './utils/ipc';

function App() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [showWelcome, setShowWelcome] = useState(true);

  useEffect(() => {
    const hasSeenWelcome = localStorage.getItem('hasSeenWelcome');
    if (hasSeenWelcome === 'true') {
      setShowWelcome(false);
    }
    
    ipc.invoke('load-notes').then((savedNotes: Note[]) => {
      setNotes(savedNotes);
      if (savedNotes.length > 0) {
        setActiveNoteId(savedNotes[0].id);
      }
    });
  }, []);

  useEffect(() => {
    ipc.send('save-notes', notes);
  }, [notes]);

  useEffect(() => {
    if (window.electron) {
      window.electron.ipcRenderer.on('note-deleted', (deletedId) => {
        setNotes(prevNotes => prevNotes.filter(note => note.id !== deletedId));
        
        if (activeNoteId === deletedId) {
          setActiveNoteId(null);
        }
      });
    }

    return () => {
      if (window.electron && window.electron.ipcRenderer.removeAllListeners) {
        window.electron.ipcRenderer.removeAllListeners('note-deleted');
      }
    };
  }, [activeNoteId]);

  const handleWelcomeComplete = () => {
    setShowWelcome(false);
    localStorage.setItem('hasSeenWelcome', 'true');
  };

  const activeNote = notes.find((note) => note.id === activeNoteId) || null;

  const handleNewNote = () => {
    const newNote: Note = {
      id: crypto.randomUUID(),
      title: '',
      content: '',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setNotes([newNote, ...notes]);
    setActiveNoteId(newNote.id);
  };

  const handleUpdateNote = (updatedNote: Note) => {
    setNotes(notes.map((note) => 
      note.id === updatedNote.id ? updatedNote : note
    ));
  };

  const deleteNote = useCallback((id: string) => {
    ipc.send('delete-note', id);
    
    setNotes(prevNotes => prevNotes.filter(note => note.id !== id));
    
    if (activeNoteId === id) {
      setActiveNoteId(null);
    }
  }, [activeNoteId]);

  const handleDeleteNote = (id: string) => {
    deleteNote(id);
  };

  return (
    <>
      {showWelcome && <WelcomeScreen onComplete={handleWelcomeComplete} />}
      <div className="flex h-screen bg-white">
        <Sidebar
          notes={notes}
          activeNoteId={activeNoteId}
          onNoteSelect={setActiveNoteId}
          onDeleteNote={handleDeleteNote}
          onNewNote={handleNewNote}
        />
        <Editor
          note={activeNote}
          onUpdateNote={handleUpdateNote}
          allNotes={notes} 
        />
      </div>
    </>
  );
}

export default App;
