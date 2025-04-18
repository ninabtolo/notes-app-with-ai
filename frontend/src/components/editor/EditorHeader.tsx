import React from 'react';
import { MessageSquare, Settings, Image } from 'lucide-react';
import SettingsDropdown from './SettingsDropdown';

interface EditorHeaderProps {
  title: string;
  handleTitleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  showSettingsDropdown: boolean;
  toggleSettingsDropdown: () => void;
  toggleChat: () => void;
  showGeminiChat: boolean;
  isSuggestionEnabled: boolean;
  toggleSuggestions: () => void;
  exportToPDF: () => void;
  settingsButtonRef: React.RefObject<HTMLButtonElement>;
  settingsDropdownRef: React.RefObject<HTMLDivElement>;
  handleCoverImageChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const EditorHeader: React.FC<EditorHeaderProps> = ({
  title,
  handleTitleChange,
  showSettingsDropdown,
  toggleSettingsDropdown,
  toggleChat,
  showGeminiChat,
  isSuggestionEnabled,
  toggleSuggestions,
  exportToPDF,
  settingsButtonRef,
  settingsDropdownRef,
  handleCoverImageChange
}) => {
  return (
    <div className="flex items-center justify-between">
      <input
        type="text"
        value={title}
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
            <SettingsDropdown 
              settingsDropdownRef={settingsDropdownRef}
              isSuggestionEnabled={isSuggestionEnabled}
              toggleSuggestions={toggleSuggestions}
              exportToPDF={exportToPDF}
            />
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
  );
};

export default EditorHeader;
