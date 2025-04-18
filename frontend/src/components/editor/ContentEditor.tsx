import React from 'react';
import SuggestionPopup from './SuggestionPopup';

interface ContentEditorProps {
  editorRef: React.RefObject<HTMLDivElement>;
  handleContentChange: () => void;
  showSuggestion: boolean;
  suggestion: string;
  suggestionPosition: { top: number; left: number } | null;
  acceptSuggestion: () => void;
  rejectSuggestion: () => void;
  suggestionRef: React.RefObject<HTMLDivElement>;
}

const ContentEditor: React.FC<ContentEditorProps> = ({
  editorRef,
  handleContentChange,
  showSuggestion,
  suggestion,
  suggestionPosition,
  acceptSuggestion,
  rejectSuggestion,
  suggestionRef
}) => {
  return (
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
          suggestionRef={suggestionRef}
          suggestionPosition={suggestionPosition}
          suggestion={suggestion}
          acceptSuggestion={acceptSuggestion}
          rejectSuggestion={rejectSuggestion}
        />
      )}
    </div>
  );
};

export default ContentEditor;
