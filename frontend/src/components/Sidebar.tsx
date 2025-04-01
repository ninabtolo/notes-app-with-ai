import React from 'react';
import { Note } from '../types';
import { Trash2 } from 'lucide-react';

interface SidebarProps {
  notes: Note[];
  activeNoteId: string | null;
  onNoteSelect: (id: string) => void;
  onDeleteNote: (id: string) => void;
  onNewNote: () => void;
}

export function Sidebar({ notes, activeNoteId, onNoteSelect, onDeleteNote, onNewNote }: SidebarProps) {
  return (
    <div className="w-64 bg-gray-50 border-r border-gray-200 h-screen flex flex-col">
      <div className="p-4">
        <button
          onClick={onNewNote}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors mb-4"
        >
          New Note
        </button>
      </div>
      
      <div className="overflow-y-auto flex-1 custom-scrollbar px-4 pb-4">
        <div className="space-y-2">
          {notes.map((note) => {
            const updatedAt = new Date(note.updatedAt);
            const formattedDate = updatedAt instanceof Date && !isNaN(updatedAt.getTime())
              ? updatedAt.toLocaleDateString()
              : 'Invalid date';

            return (
              <div
                key={note.id}
                className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                  activeNoteId === note.id ? 'bg-blue-100' : 'hover:bg-gray-100'
                }`}
                onClick={() => onNoteSelect(note.id)}
              >
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-gray-900 truncate">{note.title || 'Untitled'}</h3>
                  <p className="text-sm text-gray-500 truncate">{formattedDate}</p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteNote(note.id);
                  }}
                  className="p-1 hover:bg-gray-200 rounded-full"
                  title="Delete note"
                >
                  <Trash2 className="w-4 h-4 text-gray-500" />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
