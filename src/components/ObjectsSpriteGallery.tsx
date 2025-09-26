import { useState, useEffect } from 'preact/hooks';
import { useDraggable } from '@dnd-kit/core';
import { databaseService } from '../services/database';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';

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
      className={`relative cursor-pointer p-3 rounded-lg border-2 transition-all duration-200 ${
        isSelected 
          ? 'border-primary-500 bg-primary-100 dark:bg-primary-900/20 shadow-lg' 
          : 'border-border hover:border-primary-400 bg-card hover:bg-accent'
      } ${isDragging ? 'opacity-50 z-50 scale-105 shadow-2xl' : ''}`}
      onClick={() => onSelect(sprite.url)}
      title={`${sprite.name} - Drag to aquarium to place`}
    >
      <div className="flex flex-col items-center gap-2">
        <img 
          src={sprite.url} 
          alt={sprite.name}
          className="w-12 h-12 object-cover rounded border shadow-sm"
          onError={(e) => {
            e.target.style.display = 'none';
            e.target.nextSibling.style.display = 'block';
          }}
        />
        <div className="text-xs text-red-400 hidden">
          Failed to load
        </div>
        <div className="text-xs font-mono text-muted-foreground text-center truncate">{sprite.name}</div>
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
        <h4 className="text-lg font-semibold text-white">Object Sprites</h4>
        <div className="flex items-center justify-center p-8 text-muted-foreground">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mr-2"></div>
          Loading object sprites...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h4 className="text-lg font-semibold text-white">Object Sprites</h4>

      {/* Upload Section */}
      <Card>
        <CardContent className="pt-6">
          <label className="cursor-pointer">
            <input
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              disabled={uploading}
              style={{ display: 'none' }}
            />
            <Button
              variant="outline"
              disabled={uploading}
              className="w-full"
              asChild
            >
              <span>
                {uploading ? 'Uploading...' : '+ Upload Object Sprite'}
              </span>
            </Button>
          </label>
        </CardContent>
      </Card>

      {/* Upload Form */}
      {showUploadForm && (
        <Card>
          <CardHeader>
            <CardTitle>Upload Object Sprite</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="object-name">Object Name:</Label>
              <Input
                id="object-name"
                type="text"
                value={uploadName}
                onChange={(e) => setUploadName(e.target.value)}
                placeholder="Enter object name (e.g. 'rock', 'seaweed', 'treasure chest')"
                disabled={uploading}
              />
            </div>
            <div className="space-y-2">
              <Label>Selected File:</Label>
              <div className="p-3 bg-muted rounded-lg text-sm text-muted-foreground">
                {selectedFile ? selectedFile.name : 'No file selected'}
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <Button 
                className="flex-1"
                onClick={handleUpload}
                disabled={uploading || !uploadName.trim()}
              >
                {uploading ? 'Uploading...' : 'Upload'}
              </Button>
              <Button 
                variant="destructive"
                className="flex-1"
                onClick={handleCancelUpload}
                disabled={uploading}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Current Selection */}
      {selectedSpriteUrl && (
        <Card>
          <CardHeader>
            <CardTitle>Current Selection</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 p-4 border border-primary-200 dark:border-primary-800 bg-primary-50 dark:bg-primary-950/20 rounded-lg">
              <img 
                src={selectedSpriteUrl} 
                alt="Current object sprite" 
                className="w-16 h-16 object-cover rounded border shadow-sm"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'block';
                }}
              />
              <div className="text-xs text-destructive hidden">
                Failed to load image
              </div>
              <div className="flex-1">
                <div className="font-medium text-white">Selected for placement</div>
                <div className="text-sm font-mono text-muted-foreground">Size: {selectedSize}x{selectedSize}</div>
              </div>
              <Button 
                variant="destructive"
                size="sm"
                onClick={handleRemoveSprite}
                title="Remove selection"
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
          <CardTitle>Available Object Sprites</CardTitle>
        </CardHeader>
        <CardContent>
          {availableSprites.length === 0 ? (
            <Alert>
              <AlertDescription>
                No object sprites available. Upload your first object sprite!
              </AlertDescription>
            </Alert>
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
        </CardContent>
      </Card>
    </div>
  );
}

export default ObjectsSpriteGallery;
