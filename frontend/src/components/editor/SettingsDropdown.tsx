import React from 'react';
import { Lightbulb, Download, Check } from 'lucide-react';

interface SettingsDropdownProps {
  settingsDropdownRef: React.RefObject<HTMLDivElement>;
  isSuggestionEnabled: boolean;
  toggleSuggestions: () => void;
  exportToPDF: () => void;
}

const SettingsDropdown: React.FC<SettingsDropdownProps> = ({
  settingsDropdownRef,
  isSuggestionEnabled,
  toggleSuggestions,
  exportToPDF
}) => {
  return (
    <div 
      ref={settingsDropdownRef}
      className="absolute top-full right-0 mt-2 bg-white shadow-lg rounded p-2 z-20 w-48"
    >
      <button 
        onClick={toggleSuggestions} 
        className="w-full flex items-center justify-between px-4 py-2 hover:bg-gray-100 rounded"
      >
        <div className="flex items-center space-x-2">
          <Lightbulb className="w-4 h-4" />
          <span>AI suggestions</span>
        </div>
        {isSuggestionEnabled && <Check className="w-4 h-4 ml-2 text-black" />}
      </button>
      <button 
        onClick={exportToPDF} 
        className="w-full flex items-center space-x-2 px-4 py-2 hover:bg-gray-100 rounded"
      >
        <Download className="w-4 h-4" />
        <span>Export PDF</span>
      </button>
    </div>
  );
};

export default SettingsDropdown;
