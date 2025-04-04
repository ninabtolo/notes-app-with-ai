import React from 'react';
import { Check, X } from 'lucide-react';

interface SuggestionPopupProps {
  suggestion: string;
  position: { top: number; left: number } | null;
  onAccept: () => void;
  onReject: () => void;
}

export const SuggestionPopup: React.FC<SuggestionPopupProps> = ({
  suggestion,
  position,
  onAccept,
  onReject,
}) => {
  if (!suggestion || !position) return null;

  return (
    <div
      className="suggestion-container"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
      }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="flex justify-between items-center mb-2">
        <span className="text-xs font-semibold text-gray-500">Sugestão do Gemini</span>
        <div className="flex space-x-2">
          <button
            onClick={onAccept}
            className="p-1 bg-green-500 text-white rounded hover:bg-green-600"
            title="Aceitar sugestão"
          >
            <Check className="w-4 h-4" />
          </button>
          <button
            onClick={onReject}
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
  );
};
