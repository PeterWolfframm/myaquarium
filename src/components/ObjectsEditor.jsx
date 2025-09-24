import { useState, useEffect } from 'preact/hooks';
import Collapsible from './Collapsible.jsx';
import ObjectsSpriteGallery from './ObjectsSpriteGallery.jsx';

function ObjectsEditor({ 
  isOpen, 
  onToggle, 
  isDraggable = false, 
  draggableId = null, 
  draggablePosition = null 
}) {
  const [selectedSprite, setSelectedSprite] = useState(null);
  const [uploadHistory, setUploadHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Reset when panel opens/closes
  useEffect(() => {
    if (isOpen) {
      setSelectedSprite(null);
      setError(null);
    }
  }, [isOpen]);

  const handleSpriteSelect = (spriteUrl) => {
    setSelectedSprite(spriteUrl);
  };

  const handleUploadComplete = (uploadResult) => {
    if (uploadResult) {
      console.log('Object sprite uploaded successfully:', uploadResult);
      
      // Add to upload history
      setUploadHistory(prev => [...prev, {
        ...uploadResult,
        uploadedAt: new Date()
      }]);

      // Auto-select the newly uploaded sprite
      setSelectedSprite(uploadResult.url);
    }
  };

  const handleRemoveSelection = () => {
    setSelectedSprite(null);
  };

  return (
    <Collapsible 
      title="🎨 Objects Manager"
      position={isDraggable ? "static" : "top-left"}
      size="large"
      isOpen={isOpen}
      onToggle={onToggle}
      className="objects-manager-collapsible"
      hideWhenClosed={true}
      isDraggable={isDraggable}
      draggableId={draggableId}
      draggablePosition={draggablePosition}
    >
      {error && (
        <div className="error-message">
          Error: {error}
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}
      
      <div className="objects-editor-content">
        <div className="objects-header">
          <h3>Object Sprites</h3>
          <p>Upload and manage object sprites for your aquarium. Only name input is required for uploads.</p>
        </div>

        <div className="objects-main">
          <ObjectsSpriteGallery
            selectedSpriteUrl={selectedSprite}
            onSpriteSelect={handleSpriteSelect}
            onUploadComplete={handleUploadComplete}
            onError={setError}
          />

          {selectedSprite && (
            <div className="selected-sprite-info">
              <h4>Selected Object Sprite:</h4>
              <div className="sprite-preview-large">
                <img 
                  src={selectedSprite} 
                  alt="Selected object sprite" 
                  className="object-sprite-preview"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'block';
                  }}
                />
                <div className="sprite-error" style={{ display: 'none' }}>
                  Failed to load image
                </div>
              </div>
              <div className="sprite-url">
                <small>{selectedSprite}</small>
              </div>
              <button 
                className="remove-selection-btn"
                onClick={handleRemoveSelection}
              >
                Clear Selection
              </button>
            </div>
          )}

          {uploadHistory.length > 0 && (
            <div className="upload-history">
              <h4>Recent Uploads:</h4>
              <div className="upload-history-list">
                {uploadHistory.slice(-5).reverse().map((upload, index) => (
                  <div key={index} className="upload-history-item">
                    <img 
                      src={upload.url} 
                      alt={upload.fileName}
                      className="history-sprite-thumb"
                    />
                    <div className="upload-info">
                      <div className="upload-name">{upload.fileName}</div>
                      <div className="upload-time">
                        {upload.uploadedAt.toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </Collapsible>
  );
}

export default ObjectsEditor;
