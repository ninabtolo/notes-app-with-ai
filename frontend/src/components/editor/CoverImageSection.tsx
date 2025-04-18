import React from 'react';
import { Save, XCircle } from 'lucide-react';

interface CoverImageSectionProps {
  coverImage: string | null;
  isAdjustingCover: boolean;
  imageOffsetY: number;
  imageToCrop: string | null;
  imageRef: React.RefObject<HTMLImageElement>;
  handleMouseDown: (e: React.MouseEvent) => void;
  saveAdjustedCover: () => void;
  cancelAdjustingCover: () => void;
}

const CoverImageSection: React.FC<CoverImageSectionProps> = ({
  coverImage,
  isAdjustingCover,
  imageOffsetY,
  imageToCrop,
  imageRef,
  handleMouseDown,
  saveAdjustedCover,
  cancelAdjustingCover
}) => {
  if (!coverImage) return null;
  
  return (
    <div className="mb-4 relative">
      {isAdjustingCover ? (
        <div className="cover-adjusting-container">
          <div className="cover-crop-controls">
            <button 
              onClick={saveAdjustedCover}
              className="save-crop-btn"
              title="Save adjustment"
            >
              <Save className="w-5 h-5" />
            </button>
            <button 
              onClick={cancelAdjustingCover}
              className="cancel-crop-btn"
              title="Cancel"
            >
              <XCircle className="w-5 h-5" />
            </button>
          </div>
          
          <div className="drag-instructions">
            Drag image up or down to adjust position
          </div>
          
          <div className="drag-overlay" onMouseDown={handleMouseDown} />
          
          <div className="image-container">
            <img
              ref={imageRef}
              src={imageToCrop || undefined}
              style={{ transform: `translateY(${imageOffsetY}px)` }}
              className="w-full max-w-full h-auto object-cover"
              alt="Adjusting cover"
              draggable="false"
            />
          </div>
        </div>
      ) : (
        <img
          src={coverImage}
          alt="Cover"
          className="w-full h-48 object-cover rounded-lg"
        />
      )}
    </div>
  );
};

export default CoverImageSection;
