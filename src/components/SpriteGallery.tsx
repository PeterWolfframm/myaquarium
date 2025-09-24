import { useState, useEffect } from 'preact/hooks';
import { databaseService } from '../services/database';
import { FISH_CONFIG } from '../constants/index';

function SpriteGallery({ selectedSpriteUrl, onSpriteSelect, onUploadComplete, onAddRandomFish, isCreatingFish = false }) {
  const [availableSprites, setAvailableSprites] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Shark sprite URL (now used by Fish class for offline mode)
  const sharkSpriteUrl = new URL('../sprites/shark.png', import.meta.url).href;

  useEffect(() => {
    loadSprites();
  }, []);

  // Listen for online/offline events
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const loadSprites = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const sprites = await databaseService.getAvailableSprites();
      setAvailableSprites(sprites);
    } catch (err) {
      console.error('Error loading sprites:', err);
      setError('Failed to load sprites');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      setError('Please upload a valid image file (PNG, JPG, or GIF)');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB');
      return;
    }

    try {
      setUploading(true);
      setError(null);
      
      const uploadResult = await databaseService.uploadSprite(file);
      
      if (uploadResult) {
        // Reload sprites to show the new upload
        await loadSprites();
        
        // Select the newly uploaded sprite
        onSpriteSelect(uploadResult.url);
        
        // Notify parent component
        if (onUploadComplete) {
          onUploadComplete(uploadResult);
        }
      } else {
        setError('Failed to upload sprite');
      }
    } catch (err) {
      console.error('Error uploading sprite:', err);
      setError('Failed to upload sprite');
    } finally {
      setUploading(false);
      // Clear the input
      event.target.value = '';
    }
  };

  const handleSpriteSelect = (spriteUrl) => {
    onSpriteSelect(spriteUrl);
  };

  const handleRemoveSprite = () => {
    onSpriteSelect(null);
  };

  if (isLoading) {
    return (
      <div className="sprite-gallery">
        <h4>Fish Sprites</h4>
        <div className="loading">Loading sprites...</div>
      </div>
    );
  }

  return (
    <div className="sprite-gallery">
      <h4>Fish Sprites</h4>
      
      {error && (
        <div className="error-message">
          {error}
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      {/* Action Buttons Section */}
      <div className="sprite-actions-section">
        <label className={`upload-button ${!isOnline ? 'disabled' : ''}`}>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            disabled={uploading || !isOnline}
            style={{ display: 'none' }}
          />
          {!isOnline ? 'Upload (offline)' : uploading ? 'Uploading...' : '+ Upload Sprite'}
        </label>
        
      </div>

      {/* Current Selection */}
      {selectedSpriteUrl && (
        <div className="current-sprite-section">
          <h5>Current Sprite:</h5>
          <div className="sprite-item selected">
            <img 
              src={selectedSpriteUrl} 
              alt="Current sprite" 
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
              title="Remove sprite"
            >
              Remove
            </button>
          </div>
        </div>
      )}

      {/* Available Sprites */}
      <div className="available-sprites-section">
        <h5>Available Sprites:</h5>
        {!isOnline ? (
          // When offline, only show shark sprite
          <div className="sprites-grid">
            <div 
              className={`sprite-item ${selectedSpriteUrl === sharkSpriteUrl ? 'selected' : ''}`}
              onClick={() => handleSpriteSelect(sharkSpriteUrl)}
              title="Shark (offline mode)"
            >
              <img 
                src={sharkSpriteUrl} 
                alt="Shark"
                className="sprite-preview"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'block';
                }}
              />
              <div className="sprite-error" style={{ display: 'none' }}>
                Failed to load
              </div>
              <div className="sprite-name">Shark (offline)</div>
            </div>
          </div>
        ) : availableSprites.length === 0 ? (
          <div className="no-sprites">
            No sprites available. Upload your first sprite!
          </div>
        ) : (
          <div className="sprites-grid">
            {availableSprites.map((sprite) => (
              <div 
                key={sprite.name}
                className={`sprite-item ${selectedSpriteUrl === sprite.url ? 'selected' : ''}`}
                onClick={() => handleSpriteSelect(sprite.url)}
                title={sprite.name}
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
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Default Option */}
      <div className="default-sprite-section">
        <h5>Default:</h5>
        {!isOnline ? (
          // When offline, default is also shark
          <div 
            className={`sprite-item ${selectedSpriteUrl === sharkSpriteUrl ? 'selected' : ''}`}
            onClick={() => handleSpriteSelect(sharkSpriteUrl)}
          >
            <div className="default-sprite-preview">
              🦈 Shark (offline default)
            </div>
          </div>
        ) : (
          <div 
            className={`sprite-item ${selectedSpriteUrl === FISH_CONFIG.DEFAULT_SPRITE_URL ? 'selected' : ''}`}
            onClick={() => handleSpriteSelect(FISH_CONFIG.DEFAULT_SPRITE_URL)}
          >
            <div className="default-sprite-preview">
              🐠 Default Fish Sprite
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default SpriteGallery;
