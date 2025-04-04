import { Save, XCircle } from 'lucide-react';

interface CoverImageProps {
  coverImage: string | undefined;
  isAdjustingCover: boolean;
  imageToCrop: string | null;
  imageOffsetY: number;
  imageRef: React.RefObject<HTMLImageElement>;
  isDragging: boolean;
  onSaveAdjustedCover: () => void;
  onCancelAdjusting: () => void;
  onMouseDown: (e: React.MouseEvent) => void;
}

export const CoverImage: React.FC<CoverImageProps> = ({
  coverImage,
  isAdjustingCover,
  imageToCrop,
  imageOffsetY,
  imageRef,
  onSaveAdjustedCover,
  onCancelAdjusting,
  onMouseDown,
}) => {
  if (!coverImage && !isAdjustingCover) return null;

  return (
    <div className="mb-4 relative">
      {isAdjustingCover ? (
        <div className="cover-adjusting-container">
          <div className="cover-crop-controls">
            <button 
              onClick={onSaveAdjustedCover}
              className="save-crop-btn"
              title="Save adjustment"
            >
              <Save className="w-5 h-5" />
            </button>
            <button 
              onClick={onCancelAdjusting}
              className="cancel-crop-btn"
              title="Cancel"
            >
              <XCircle className="w-5 h-5" />
            </button>
          </div>
          
          <div className="drag-instructions">
            Drag image up or down to adjust position
          </div>
          
          <div className="drag-overlay" onMouseDown={onMouseDown} />
          
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
