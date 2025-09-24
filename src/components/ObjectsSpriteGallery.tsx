import { useState, useEffect } from 'preact/hooks';
import { useDraggable } from '@dnd-kit/core';
import { databaseService } from '../services/database';

// Draggable sprite item component
function DraggableSpriteItem({ sprite, isSelected, onSelect, selectedSize = 6 }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id: `sprite_${sprite.name}`,
    data: {
      type: 'object-sprite',
      spriteUrl: sprite.url,
      spriteName: sprite.name,
      selectedSize: selectedSize
    }
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    zIndex: isDragging ? 1000 : 'auto',
    opacity: isDragging ? 0.5 : 1,
  } : {};

  return (
    <div 
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`sprite-item draggable-sprite ${isSelected ? 'selected' : ''} ${isDragging ? 'dragging' : ''}`}
      onClick={() => onSelect(sprite.url)}
      title={`${sprite.name} - Drag to aquarium to place`}
    >
      <img 
        src={sprite.url} 
        alt={sprite.name}
        className="sprite-preview"
        onError={(e) => {
          e.target.style.display = 'none';
          e.target.nextSibling.style.display = 'block';
        }}
      />
      <div className="sprite-error" style={{ display: 'none' }}>
        Failed to load
      </div>
      <div className="sprite-name">{sprite.name}</div>
      {isDragging && (
        <div className="drag-hint">Drop on aquarium</div>
      )}
    </div>
  );
}

function ObjectsSpriteGallery({ selectedSpriteUrl, onSpriteSelect, onUploadComplete, onError, selectedSize = 6 }) {
  const [availableSprites, setAvailableSprites] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [uploadName, setUploadName] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);

  useEffect(() => {
    loadSprites();
  }, []);

  const loadSprites = async () => {
    try {
      setIsLoading(true);
      if (onError) onError(null);
      const sprites = await databaseService.getAvailableObjectSprites();
      setAvailableSprites(sprites);
    } catch (err) {
      console.error('Error loading object sprites:', err);
      if (onError) onError('Failed to load object sprites');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      if (onError) onError('Please upload a valid image file (PNG, JPG, or GIF)');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      if (onError) onError('File size must be less than 5MB');
      return;
    }

    setSelectedFile(file);
    
    // Auto-generate name from filename if not provided
    if (!uploadName.trim()) {
      const nameWithoutExt = file.name.split('.').slice(0, -1).join('.');
      setUploadName(nameWithoutExt);
    }
    
    setShowUploadForm(true);
  };

  const handleUpload = async () => {
    if (!selectedFile || !uploadName.trim()) {
      if (onError) onError('Please provide a name for the object sprite');
      return;
    }

    try {
      setUploading(true);
      if (onError) onError(null);
      
      // Create a custom filename with the user-provided name
      const fileExt = selectedFile.name.split('.').pop();
      const customFileName = `${uploadName.trim().replace(/[^a-zA-Z0-9-_]/g, '_')}.${fileExt}`;
      
      const uploadResult = await databaseService.uploadObjectSprite(selectedFile, customFileName);
      
      if (uploadResult) {
        // Reload sprites to show the new upload
        await loadSprites();
        
        // Select the newly uploaded sprite
        if (onSpriteSelect) {
          onSpriteSelect(uploadResult.url);
        }
        
        // Notify parent component
        if (onUploadComplete) {
          onUploadComplete(uploadResult);
        }

        // Reset form
        setSelectedFile(null);
        setUploadName('');
        setShowUploadForm(false);
      } else {
        if (onError) onError('Failed to upload object sprite');
      }
    } catch (err) {
      console.error('Error uploading object sprite:', err);
      if (onError) onError('Failed to upload object sprite');
    } finally {
      setUploading(false);
    }
  };

  const handleCancelUpload = () => {
    setSelectedFile(null);
    setUploadName('');
    setShowUploadForm(false);
  };

  const handleSpriteSelect = (spriteUrl) => {
    if (onSpriteSelect) {
      onSpriteSelect(spriteUrl);
    }
  };

  const handleRemoveSprite = () => {
    if (onSpriteSelect) {
      onSpriteSelect(null);
    }
  };

  if (isLoading) {
    return (
      <div className="sprite-gallery">
        <h4>Object Sprites</h4>
        <div className="loading">Loading object sprites...</div>
      </div>
    );
  }

  return (
    <div className="sprite-gallery objects-sprite-gallery">
      <h4>Object Sprites</h4>

      {/* Upload Section */}
      <div className="sprite-actions-section">
        <label className="upload-button">
          <input
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            disabled={uploading}
            style={{ display: 'none' }}
          />
          {uploading ? 'Uploading...' : '+ Upload Object Sprite'}
        </label>
      </div>

      {/* Upload Form */}
      {showUploadForm && (
        <div className="upload-form">
          <h5>Upload Object Sprite</h5>
          <div className="upload-form-content">
            <div className="form-group">
              <label>Object Name:</label>
              <input
                type="text"
                value={uploadName}
                onChange={(e) => setUploadName(e.target.value)}
                placeholder="Enter object name (e.g. 'rock', 'seaweed', 'treasure chest')"
                disabled={uploading}
              />
            </div>
            <div className="form-group">
              <label>Selected File:</label>
              <div className="selected-file-info">
                {selectedFile ? selectedFile.name : 'No file selected'}
              </div>
            </div>
            <div className="form-actions">
              <button 
                className="upload-confirm-btn"
                onClick={handleUpload}
                disabled={uploading || !uploadName.trim()}
              >
                {uploading ? 'Uploading...' : 'Upload'}
              </button>
              <button 
                className="upload-cancel-btn"
                onClick={handleCancelUpload}
                disabled={uploading}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Current Selection */}
      {selectedSpriteUrl && (
        <div className="current-sprite-section">
          <h5>Current Selection:</h5>
          <div className="sprite-item selected">
            <img 
              src={selectedSpriteUrl} 
              alt="Current object sprite" 
              className="sprite-preview"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'block';
              }}
            />
            <div className="sprite-error" style={{ display: 'none' }}>
              Failed to load image
            </div>
            <button 
              className="remove-sprite-btn"
              onClick={handleRemoveSprite}
              title="Remove selection"
            >
              Remove
            </button>
          </div>
        </div>
      )}

      {/* Available Sprites */}
      <div className="available-sprites-section">
        <h5>Available Object Sprites:</h5>
        {availableSprites.length === 0 ? (
          <div className="no-sprites">
            No object sprites available. Upload your first object sprite!
          </div>
        ) : (
          <div className="sprites-grid">
            {availableSprites.map((sprite) => (
              <DraggableSpriteItem
                key={sprite.name}
                sprite={sprite}
                isSelected={selectedSpriteUrl === sprite.url}
                onSelect={handleSpriteSelect}
                selectedSize={selectedSize}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default ObjectsSpriteGallery;
