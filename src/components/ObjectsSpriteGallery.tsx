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
      className={`section-interactive relative cursor-pointer transition-all duration-200 p-3 rounded-lg border ${
        isSelected 
          ? 'border-primary-500 bg-primary-500/20 shadow-lg' 
          : 'border-white/20 bg-white/5 hover:border-primary-400/50 hover:bg-primary-500/10'
      } ${isDragging ? 'opacity-70 rotate-1 scale-105 z-50' : ''}`}
      onClick={() => onSelect(sprite.url)}
      title={`${sprite.name} - Drag to aquarium to place`}
    >
      <div className="flex flex-col items-center gap-2">
        <img 
          src={sprite.url} 
          alt={sprite.name}
          className="w-12 h-12 object-cover rounded border border-white/20"
          onError={(e) => {
            e.target.style.display = 'none';
            e.target.nextSibling.style.display = 'block';
          }}
        />
        <div className="text-xs text-red-400 hidden">
          Failed to load
        </div>
        <div className="text-mono-small text-center">{sprite.name}</div>
        {isDragging && (
          <div className="absolute -top-2 -right-2 bg-primary-500 text-white text-xs px-2 py-1 rounded-full shadow-lg animate-pulse">
            Drop on aquarium
          </div>
        )}
      </div>
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
      <div className="space-y-4">
        <h4 className="text-section-title">Object Sprites</h4>
        <div className="loading-state">Loading object sprites...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h4 className="text-section-title">Object Sprites</h4>

      {/* Upload Section */}
      <div className="section-secondary">
        <div className="section-content">
          <label className={`inline-flex items-center justify-center px-4 py-2 rounded-lg border transition-all duration-200 cursor-pointer ${
            uploading 
              ? 'border-gray-400/50 bg-gray-500/20 text-gray-400 cursor-not-allowed' 
              : 'border-primary-400/50 bg-primary-500/20 text-primary-400 hover:border-primary-500/70 hover:bg-primary-500/30 hover:scale-105 active:scale-95'
          }`}>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              disabled={uploading}
              style={{ display: 'none' }}
            />
            <span className="text-sm font-medium">
              {uploading ? 'Uploading...' : '+ Upload Object Sprite'}
            </span>
          </label>
        </div>
      </div>

      {/* Upload Form */}
      {showUploadForm && (
        <div className="section-secondary">
          <h5 className="text-section-title mb-4">Upload Object Sprite</h5>
          <div className="section-content space-y-4">
            <div>
              <label className="text-label block mb-2">Object Name:</label>
              <input
                type="text"
                value={uploadName}
                onChange={(e) => setUploadName(e.target.value)}
                placeholder="Enter object name (e.g. 'rock', 'seaweed', 'treasure chest')"
                disabled={uploading}
                className="input-primary w-full"
              />
            </div>
            <div>
              <label className="text-label block mb-2">Selected File:</label>
              <div className="text-value p-3 bg-white/5 border border-white/20 rounded-lg">
                {selectedFile ? selectedFile.name : 'No file selected'}
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button 
                className={`flex-1 px-4 py-2 rounded-lg border transition-all duration-200 ${
                  uploading || !uploadName.trim()
                    ? 'border-gray-400/50 bg-gray-500/20 text-gray-400 cursor-not-allowed'
                    : 'border-primary-400/50 bg-primary-500/20 text-primary-400 hover:border-primary-500/70 hover:bg-primary-500/30 hover:scale-105 active:scale-95'
                }`}
                onClick={handleUpload}
                disabled={uploading || !uploadName.trim()}
              >
                {uploading ? 'Uploading...' : 'Upload'}
              </button>
              <button 
                className={`flex-1 px-4 py-2 rounded-lg border transition-all duration-200 ${
                  uploading
                    ? 'border-gray-400/50 bg-gray-500/20 text-gray-400 cursor-not-allowed'
                    : 'border-red-400/50 bg-red-500/20 text-red-400 hover:border-red-500/70 hover:bg-red-500/30 hover:scale-105 active:scale-95'
                }`}
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
        <div className="section-secondary">
          <h5 className="text-section-title mb-3">Current Selection:</h5>
          <div className="section-content">
            <div className="section-interactive border-primary-500 bg-primary-500/20 p-4 relative">
              <div className="flex items-center gap-4">
                <img 
                  src={selectedSpriteUrl} 
                  alt="Current object sprite" 
                  className="w-16 h-16 object-cover rounded border border-white/20"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'block';
                  }}
                />
                <div className="text-xs text-red-400 hidden">
                  Failed to load image
                </div>
                <div className="flex-1">
                  <div className="text-value">Selected for placement</div>
                  <div className="text-mono-small">Size: {selectedSize}x{selectedSize}</div>
                </div>
                <button 
                  className="px-3 py-1 rounded border border-red-400/50 bg-red-500/20 text-red-400 hover:border-red-500/70 hover:bg-red-500/30 transition-all duration-200 hover:scale-105 active:scale-95"
                  onClick={handleRemoveSprite}
                  title="Remove selection"
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Available Sprites */}
      <div className="section-secondary">
        <h5 className="text-section-title mb-3">Available Object Sprites:</h5>
        <div className="section-content">
          {availableSprites.length === 0 ? (
            <div className="empty-state">
              No object sprites available. Upload your first object sprite!
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
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
    </div>
  );
}

export default ObjectsSpriteGallery;
