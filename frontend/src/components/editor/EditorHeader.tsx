import React from 'react';
import { MessageSquare, Settings, Image, Check } from 'lucide-react';

interface EditorHeaderProps {
  title: string;
  onTitleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onToggleChat: () => void;
  onToggleSettings: () => void;
  showSettingsDropdown: boolean;
  settingsButtonRef: React.RefObject<HTMLButtonElement>;
  settingsDropdownRef: React.RefObject<HTMLDivElement>;
  isSuggestionEnabled: boolean;
  onToggleSuggestions: () => void;
  onExportPDF: () => void;
}

export const EditorHeader: React.FC<EditorHeaderProps> = ({
  title,
  onTitleChange,
  onToggleChat,
  onToggleSettings,
  showSettingsDropdown,
  settingsButtonRef,
  settingsDropdownRef,
  isSuggestionEnabled,
  onToggleSuggestions,
  onExportPDF,
}) => {
  return (
    <div className="flex items-center justify-between">
      <input
        type="text"
        value={title || ''}
        onChange={onTitleChange}
        placeholder="Note title"
        className="flex-1 text-4xl font-bold focus:outline-none leading-relaxed"
      />
      <div className="flex items-center space-x-2 editor-buttons">
        <div className="relative">
          <button
            ref={settingsButtonRef}
            onClick={onToggleSettings}
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
                  onToggleSuggestions();
                }}
                className="w-full flex items-center justify-between px-4 py-2 hover:bg-gray-100 rounded"
              >
                <div className="flex items-center space-x-2">
                  <MessageSquare className="w-4 h-4" />
                  <span>AI suggestions</span>
                </div>
                {isSuggestionEnabled && <Check className="w-4 h-4 ml-2 text-black" />}
              </button>
              <button 
                onClick={onExportPDF} 
                className="w-full flex items-center space-x-2 px-4 py-2 hover:bg-gray-100 rounded"
              >
                <Image className="w-4 h-4" />
                <span>Export PDF</span>
              </button>
            </div>
          )}
        </div>
        <button
          onClick={onToggleChat}
          className="flex items-center justify-center p-2 bg-purple-100 text-gray-700 rounded-full hover:bg-purple-200 transition"
          title="Open AI"
        >
          <MessageSquare className="w-5 h-5" />
        </button>
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
  );
};
