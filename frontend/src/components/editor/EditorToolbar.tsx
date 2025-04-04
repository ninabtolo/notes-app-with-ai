import React, { useState, useRef } from 'react';
import { Type, Palette, Bold, Highlighter, Link } from 'lucide-react';

interface EditorToolbarProps {
  onApplyFormatting: (command: string, value?: string) => void;
  onRestoreSelection: () => void;
  onToggleLinkForm: () => void;
}

export const EditorToolbar: React.FC<EditorToolbarProps> = ({
  onApplyFormatting,
  onRestoreSelection,
  onToggleLinkForm,
}) => {
  const [dropdown, setDropdown] = useState<string | null>(null);

  const toggleDropdown = (type: string) => {
    if (dropdown === type) {
      setDropdown(null);
    } else {
      onRestoreSelection();
      setDropdown(type);
    }
  };

  return (
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
            <button onClick={() => onApplyFormatting('fontSize', '2')} className="block px-4 py-2 hover:bg-gray-100">
              Small
            </button>
            <button onClick={() => onApplyFormatting('fontSize', '3')} className="block px-4 py-2 hover:bg-gray-100">
              Normal
            </button>
            <button onClick={() => onApplyFormatting('fontSize', '4')} className="block px-4 py-2 hover:bg-gray-100">
              Large
            </button>
            <button onClick={() => onApplyFormatting('fontSize', '5')} className="block px-4 py-2 hover:bg-gray-100">
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
            <button onClick={() => onApplyFormatting('foreColor', '#000000')} className="w-6 h-6 bg-black rounded" />
            <button onClick={() => onApplyFormatting('foreColor', '#4c51bf')} className="w-6 h-6 bg-indigo-600 rounded" />
            <button onClick={() => onApplyFormatting('foreColor', '#059669')} className="w-6 h-6 bg-teal-600 rounded" />
            <button onClick={() => onApplyFormatting('foreColor', '#b45309')} className="w-6 h-6 bg-orange-600 rounded" />
            <button onClick={() => onApplyFormatting('foreColor', '#9d174d')} className="w-6 h-6 bg-pink-600 rounded" />
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
            <button onClick={() => onApplyFormatting('backColor', '#a5b4fc')} className="w-6 h-6 bg-[#a5b4fc] rounded" />
            <button onClick={() => onApplyFormatting('backColor', '#6ee7b7')} className="w-6 h-6 bg-[#6ee7b7] rounded" />
            <button onClick={() => onApplyFormatting('backColor', '#fbbf24')} className="w-6 h-6 bg-[#fbbf24] rounded" />
            <button onClick={() => onApplyFormatting('backColor', '#f472b6')} className="w-6 h-6 bg-[#f472b6] rounded" />
            <button
              onClick={() => onApplyFormatting('backColor', 'transparent')}
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
            <button onClick={() => onApplyFormatting('bold')} className="block px-4 py-2 hover:bg-gray-100">
              Bold
            </button>
            <button onClick={() => onApplyFormatting('italic')} className="block px-4 py-2 hover:bg-gray-100">
              Italic
            </button>
            <button onClick={() => onApplyFormatting('underline')} className="block px-4 py-2 hover:bg-gray-100">
              Underline
            </button>
          </div>
        )}
      </div>

      <div className="relative">
        <button
          className="flex items-center space-x-1 px-2 py-1 hover:bg-purple-100 rounded add-link-button"
          onClick={onToggleLinkForm}
        >
          <Link className="w-4 h-4" />
          <span>Add Link</span>
        </button>
      </div>
    </div>
  );
};
