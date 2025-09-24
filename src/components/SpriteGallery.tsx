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
      <div className="space-y-4">
        <h4 className="text-section-title">Fish Sprites</h4>
        <div className="loading-state">Loading sprites...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h4 className="text-section-title">Fish Sprites</h4>
      
      {error && (
        <div className="bg-red-500/20 border border-red-400/50 text-red-400 p-3 rounded-lg flex items-center justify-between">
          <span>{error}</span>
          <button 
            onClick={() => setError(null)}
            className="ml-3 hover:bg-red-500/30 w-6 h-6 rounded-full flex items-center justify-center transition-colors"
          >
            ×
          </button>
        </div>
      )}

      {/* Upload Section */}
      <div className="section-secondary">
        <div className="section-content">
          <label className={`inline-flex items-center justify-center px-4 py-2 rounded-lg border transition-all duration-200 cursor-pointer ${
            uploading || !isOnline
              ? 'border-gray-400/50 bg-gray-500/20 text-gray-400 cursor-not-allowed' 
              : 'border-primary-400/50 bg-primary-500/20 text-primary-400 hover:border-primary-500/70 hover:bg-primary-500/30 hover:scale-105 active:scale-95'
          }`}>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              disabled={uploading || !isOnline}
              style={{ display: 'none' }}
            />
            <span className="text-sm font-medium">
              {!isOnline ? 'Upload (offline)' : uploading ? 'Uploading...' : '+ Upload Sprite'}
            </span>
          </label>
          {!isOnline && (
            <div className="text-mono-small text-gray-400 mt-2">
              Upload is disabled while offline
            </div>
          )}
        </div>
      </div>

      {/* Current Selection */}
      {selectedSpriteUrl && (
        <div className="section-secondary">
          <h5 className="text-section-title mb-3">Current Sprite:</h5>
          <div className="section-content">
            <div className="section-interactive border-primary-500 bg-primary-500/20 p-4 relative">
              <div className="flex items-center gap-4">
                <img 
                  src={selectedSpriteUrl} 
                  alt="Current sprite" 
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
                  <div className="text-value">Selected sprite</div>
                  <div className="text-mono-small">Ready for new fish</div>
                </div>
                <button 
                  className="px-3 py-1 rounded border border-red-400/50 bg-red-500/20 text-red-400 hover:border-red-500/70 hover:bg-red-500/30 transition-all duration-200 hover:scale-105 active:scale-95"
                  onClick={handleRemoveSprite}
                  title="Remove sprite"
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
        <h5 className="text-section-title mb-3">Available Sprites:</h5>
        <div className="section-content">
          {!isOnline ? (
            // When offline, only show shark sprite
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              <div 
                className={`section-interactive relative cursor-pointer transition-all duration-200 p-3 rounded-lg border ${
                  selectedSpriteUrl === sharkSpriteUrl
                    ? 'border-primary-500 bg-primary-500/20 shadow-lg' 
                    : 'border-white/20 bg-white/5 hover:border-primary-400/50 hover:bg-primary-500/10'
                }`}
                onClick={() => handleSpriteSelect(sharkSpriteUrl)}
                title="Shark (offline mode)"
              >
                <div className="flex flex-col items-center gap-2">
                  <img 
                    src={sharkSpriteUrl} 
                    alt="Shark"
                    className="w-12 h-12 object-cover rounded border border-white/20"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'block';
                    }}
                  />
                  <div className="text-xs text-red-400 hidden">
                    Failed to load
                  </div>
                  <div className="text-mono-small text-center">Shark (offline)</div>
                </div>
              </div>
            </div>
          ) : availableSprites.length === 0 ? (
            <div className="empty-state">
              No sprites available. Upload your first sprite!
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {availableSprites.map((sprite) => (
                <div 
                  key={sprite.name}
                  className={`section-interactive relative cursor-pointer transition-all duration-200 p-3 rounded-lg border ${
                    selectedSpriteUrl === sprite.url
                      ? 'border-primary-500 bg-primary-500/20 shadow-lg' 
                      : 'border-white/20 bg-white/5 hover:border-primary-400/50 hover:bg-primary-500/10'
                  }`}
                  onClick={() => handleSpriteSelect(sprite.url)}
                  title={sprite.name}
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
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Default Option */}
      <div className="section-secondary">
        <h5 className="text-section-title mb-3">Default:</h5>
        <div className="section-content">
          {!isOnline ? (
            // When offline, default is also shark
            <div 
              className={`section-interactive cursor-pointer transition-all duration-200 p-4 rounded-lg border ${
                selectedSpriteUrl === sharkSpriteUrl
                  ? 'border-primary-500 bg-primary-500/20 shadow-lg' 
                  : 'border-white/20 bg-white/5 hover:border-primary-400/50 hover:bg-primary-500/10'
              }`}
              onClick={() => handleSpriteSelect(sharkSpriteUrl)}
            >
              <div className="flex items-center gap-3">
                <div className="text-2xl">🦈</div>
                <div>
                  <div className="text-value">Shark (offline default)</div>
                  <div className="text-mono-small">Built-in sprite for offline use</div>
                </div>
              </div>
            </div>
          ) : (
            <div 
              className={`section-interactive cursor-pointer transition-all duration-200 p-4 rounded-lg border ${
                selectedSpriteUrl === FISH_CONFIG.DEFAULT_SPRITE_URL
                  ? 'border-primary-500 bg-primary-500/20 shadow-lg' 
                  : 'border-white/20 bg-white/5 hover:border-primary-400/50 hover:bg-primary-500/10'
              }`}
              onClick={() => handleSpriteSelect(FISH_CONFIG.DEFAULT_SPRITE_URL)}
            >
              <div className="flex items-center gap-3">
                <div className="text-2xl">🐠</div>
                <div>
                  <div className="text-value">Default Fish Sprite</div>
                  <div className="text-mono-small">Standard aquarium fish</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default SpriteGallery;
