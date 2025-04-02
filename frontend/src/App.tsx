import React, { useState, useEffect } from 'react';
import { Note } from './types';
import { Sidebar } from './components/Sidebar';
import { Editor } from './components/Editor';
import { WelcomeScreen } from './components/WelcomeScreen';
const { ipcRenderer } = window.require('electron');

function App() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [showWelcome, setShowWelcome] = useState(true);

  useEffect(() => {
    const hasSeenWelcome = localStorage.getItem('hasSeenWelcome');
    if (hasSeenWelcome === 'true') {
      setShowWelcome(false);
    }
    
    ipcRenderer.invoke('load-notes').then((savedNotes: Note[]) => {
      setNotes(savedNotes);
      if (savedNotes.length > 0) {
        setActiveNoteId(savedNotes[0].id);
      }
    });
  }, []);

  useEffect(() => {
    ipcRenderer.send('save-notes', notes);
  }, [notes]);

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

  const handleDeleteNote = (id: string) => {
    setNotes(notes.filter((note) => note.id !== id));
    ipcRenderer.send('delete-note', id);
    if (activeNoteId === id) {
      setActiveNoteId(notes[0]?.id || null);
    }
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
        />
      </div>
    </>
  );
}

export default App;
