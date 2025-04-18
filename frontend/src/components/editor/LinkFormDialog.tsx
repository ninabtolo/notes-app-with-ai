import React from 'react';

interface LinkFormDialogProps {
  linkFormRef: React.RefObject<HTMLDivElement>;
  linkTitle: string;
  setLinkTitle: (title: string) => void;
  linkUrl: string;
  setLinkUrl: (url: string) => void;
  insertLink: () => void;
  setShowLinkForm: (show: boolean) => void;
}

const LinkFormDialog: React.FC<LinkFormDialogProps> = ({
  linkFormRef,
  linkTitle,
  setLinkTitle,
  linkUrl,
  setLinkUrl,
  insertLink,
  setShowLinkForm
}) => {
  return (
    <div 
      ref={linkFormRef}
      className="absolute top-full left-0 mt-2 bg-white shadow-lg rounded p-4 z-10 w-80"
    >
      <div className="space-y-3">
        <div>
          <label htmlFor="linkTitle" className="block text-sm font-medium text-gray-700 mb-1">
            Link Title
          </label>
          <input
            type="text"
            id="linkTitle"
            value={linkTitle}
            onChange={(e) => setLinkTitle(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
            placeholder="Enter title"
          />
        </div>
        
        <div>
          <label htmlFor="linkUrl" className="block text-sm font-medium text-gray-700 mb-1">
            URL
          </label>
          <input
            type="url"
            id="linkUrl"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
            placeholder="https://"
          />
        </div>
        
        <div className="flex justify-end space-x-2 pt-2">
          <button
            onClick={() => setShowLinkForm(false)}
            className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            onClick={insertLink}
            className="px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-700"
            disabled={!linkUrl.trim() || !linkTitle.trim()}
          >
            Insert
          </button>
        </div>
      </div>
    </div>
  );
};

export default LinkFormDialog;
