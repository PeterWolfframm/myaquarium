import { useState, useEffect } from 'preact/hooks';
import { databaseService } from '../services/database';
import { FISH_CONFIG } from '../constants/index';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';

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
        <h4 className="text-lg font-semibold text-foreground">Fish Sprites</h4>
        <div className="flex items-center justify-center p-8 text-muted-foreground">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mr-2"></div>
          Loading sprites...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h4 className="text-lg font-semibold text-foreground">Fish Sprites</h4>
      
      {error && (
        <Alert variant="destructive">
          <AlertDescription className="flex items-center justify-between">
            <span>{error}</span>
            <Button 
              variant="ghost"
              size="sm"
              onClick={() => setError(null)}
              className="h-6 w-6 p-0 hover:bg-destructive/30"
            >
              ×
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Upload Section */}
      <Card>
        <CardContent className="pt-6">
          <label className="cursor-pointer">
            <input
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              disabled={uploading || !isOnline}
              style={{ display: 'none' }}
            />
            <Button
              variant="outline"
              disabled={uploading || !isOnline}
              className="w-full"
              asChild
            >
              <span>
                {!isOnline ? 'Upload (offline)' : uploading ? 'Uploading...' : '+ Upload Sprite'}
              </span>
            </Button>
          </label>
          {!isOnline && (
            <div className="text-sm font-mono text-muted-foreground mt-2 text-center">
              Upload is disabled while offline
            </div>
          )}
        </CardContent>
      </Card>

      {/* Current Selection */}
      {selectedSpriteUrl && (
        <Card>
          <CardHeader>
            <CardTitle>Current Sprite</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 p-4 border border-primary-200 dark:border-primary-800 bg-primary-50 dark:bg-primary-950/20 rounded-lg">
              <img 
                src={selectedSpriteUrl} 
                alt="Current sprite" 
                className="w-16 h-16 object-cover rounded border shadow-sm transition-transform duration-200 hover:scale-110"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'block';
                }}
              />
              <div className="text-xs text-destructive hidden">
                Failed to load image
              </div>
              <div className="flex-1">
                <div className="font-semibold text-foreground">Selected sprite</div>
                <div className="text-sm font-mono text-muted-foreground">Ready for new fish</div>
              </div>
              <Button 
                variant="destructive"
                size="sm"
                onClick={handleRemoveSprite}
                title="Remove sprite"
              >
                Remove
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Available Sprites */}
      <Card>
        <CardHeader>
          <CardTitle>Available Sprites</CardTitle>
        </CardHeader>
        <CardContent>
          {!isOnline ? (
            // When offline, only show shark sprite
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              <div 
                className={`relative cursor-pointer transition-all duration-200 p-3 rounded-lg border-2 ${
                  selectedSpriteUrl === sharkSpriteUrl
                    ? 'border-primary-500 bg-primary-100 dark:bg-primary-900/20 shadow-lg' 
                    : 'border-border hover:border-primary-400 bg-card hover:bg-accent'
                }`}
                onClick={() => handleSpriteSelect(sharkSpriteUrl)}
                title="Shark (offline mode)"
              >
                <div className="flex flex-col items-center gap-2">
                  <img 
                    src={sharkSpriteUrl} 
                    alt="Shark"
                    className="w-12 h-12 object-cover rounded border shadow-sm transition-transform duration-200 hover:scale-110"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'block';
                    }}
                  />
                  <div className="text-xs text-red-400 hidden">
                    Failed to load
                  </div>
                  <div className="text-xs font-mono text-muted-foreground text-center">Shark (offline)</div>
                </div>
              </div>
            </div>
          ) : availableSprites.length === 0 ? (
            <Alert>
              <AlertDescription>
                No sprites available. Upload your first sprite!
              </AlertDescription>
            </Alert>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {availableSprites.map((sprite) => (
                <div 
                  key={sprite.name}
                  className={`relative cursor-pointer transition-all duration-200 p-3 rounded-lg border-2 ${
                    selectedSpriteUrl === sprite.url
                      ? 'border-primary-500 bg-primary-100 dark:bg-primary-900/20 shadow-lg' 
                      : 'border-border hover:border-primary-400 bg-card hover:bg-accent'
                  }`}
                  onClick={() => handleSpriteSelect(sprite.url)}
                  title={sprite.name}
                >
                  <div className="flex flex-col items-center gap-2">
                    <img 
                      src={sprite.url} 
                      alt={sprite.name}
                      className="w-12 h-12 object-cover rounded border shadow-sm transition-transform duration-200 hover:scale-110"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'block';
                      }}
                    />
                    <div className="text-xs text-red-400 hidden">
                      Failed to load
                    </div>
                    <div className="text-xs font-mono text-muted-foreground text-center truncate">{sprite.name}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Default Option */}
      <Card>
        <CardHeader>
          <CardTitle>Default</CardTitle>
        </CardHeader>
        <CardContent>
          {!isOnline ? (
            // When offline, default is also shark
            <div 
              className={`cursor-pointer transition-all duration-200 p-4 rounded-lg border-2 ${
                selectedSpriteUrl === sharkSpriteUrl
                  ? 'border-primary-500 bg-primary-100 dark:bg-primary-900/20 shadow-lg' 
                  : 'border-border hover:border-primary-400 bg-card hover:bg-accent'
              }`}
              onClick={() => handleSpriteSelect(sharkSpriteUrl)}
            >
              <div className="flex items-center gap-3">
                <div className="text-2xl">🦈</div>
                <div>
                  <div className="font-semibold text-foreground">Shark (offline default)</div>
                  <div className="text-sm font-mono text-muted-foreground">Built-in sprite for offline use</div>
                </div>
              </div>
            </div>
          ) : (
            <div 
              className={`cursor-pointer transition-all duration-200 p-4 rounded-lg border-2 ${
                selectedSpriteUrl === FISH_CONFIG.DEFAULT_SPRITE_URL
                  ? 'border-primary-500 bg-primary-100 dark:bg-primary-900/20 shadow-lg' 
                  : 'border-border hover:border-primary-400 bg-card hover:bg-accent'
              }`}
              onClick={() => handleSpriteSelect(FISH_CONFIG.DEFAULT_SPRITE_URL)}
            >
              <div className="flex items-center gap-3">
                <div className="text-2xl">🐠</div>
                <div>
                  <div className="font-semibold text-foreground">Default Fish Sprite</div>
                  <div className="text-sm font-mono text-muted-foreground">Standard aquarium fish</div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default SpriteGallery;
