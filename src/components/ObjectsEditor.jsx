import { useState, useEffect } from 'preact/hooks';
import Collapsible from './Collapsible.jsx';
import ObjectsSpriteGallery from './ObjectsSpriteGallery.jsx';
import { databaseService } from '../services/database.js';

function ObjectsEditor({ 
  isOpen, 
  onToggle, 
  isDraggable = false, 
  draggableId = null, 
  draggablePosition = null,
  aquarium = null 
}) {
  const [selectedSprite, setSelectedSprite] = useState(null);
  const [selectedObject, setSelectedObject] = useState(null);
  const [placedObjects, setPlacedObjects] = useState([]);
  const [uploadHistory, setUploadHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Reset when panel opens/closes
  useEffect(() => {
    if (isOpen) {
      setSelectedSprite(null);
      setSelectedObject(null);
      setError(null);
      loadPlacedObjects();
    }
  }, [isOpen]);

  // Load placed objects from database
  const loadPlacedObjects = async () => {
    try {
      setIsLoading(true);
      const objects = await databaseService.getPlacedObjects();
      setPlacedObjects(objects);
    } catch (err) {
      console.error('Error loading placed objects:', err);
      setError('Failed to load placed objects');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSpriteSelect = (spriteUrl) => {
    setSelectedSprite(spriteUrl);
    setSelectedObject(null); // Clear object selection when selecting sprite
  };

  const handleObjectSelect = (objectData) => {
    setSelectedObject(objectData);
    setSelectedSprite(null); // Clear sprite selection when selecting object
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
      setSelectedObject(null);
    }
  };

  const handleRemoveSelection = () => {
    setSelectedSprite(null);
  };

  const handleClearObjectSelection = () => {
    setSelectedObject(null);
  };

  // Movement handlers
  const moveObject = async (direction) => {
    if (!selectedObject || !aquarium) return;

    const deltaMap = {
      up: { x: 0, y: -1 },
      down: { x: 0, y: 1 },
      left: { x: -1, y: 0 },
      right: { x: 1, y: 0 }
    };

    const delta = deltaMap[direction];
    if (!delta) return;

    const newGridX = selectedObject.grid_x + delta.x;
    const newGridY = selectedObject.grid_y + delta.y;

    try {
      // Check if the new position is valid using the aquarium's object manager
      if (aquarium.objectManager && aquarium.objectManager.isGridAreaAvailable(newGridX, newGridY, selectedObject.size || 6, selectedObject.object_id)) {
        // Move the object in the aquarium
        const objectInAquarium = aquarium.objectManager.objects.get(selectedObject.object_id);
        if (objectInAquarium) {
          // Clear old position
          aquarium.objectManager.clearGridArea(selectedObject.grid_x, selectedObject.grid_y, selectedObject.size || 6);
          
          // Update position
          objectInAquarium.updatePosition(newGridX, newGridY);
          
          // Mark new position as occupied
          aquarium.objectManager.markGridAreaOccupied(selectedObject.object_id, newGridX, newGridY, selectedObject.size || 6);
          
          // Update database
          await databaseService.updatePlacedObject(selectedObject.object_id, {
            grid_x: newGridX,
            grid_y: newGridY
          });
          
          // Update local state
          setSelectedObject(prev => ({
            ...prev,
            grid_x: newGridX,
            grid_y: newGridY
          }));
          
          // Refresh placed objects list
          loadPlacedObjects();
          
          console.log(`Moved object ${selectedObject.object_id} to (${newGridX}, ${newGridY})`);
        }
      } else {
        setError(`Cannot move ${direction} - position is occupied or out of bounds`);
        setTimeout(() => setError(null), 3000);
      }
    } catch (err) {
      console.error('Error moving object:', err);
      setError('Failed to move object');
      setTimeout(() => setError(null), 3000);
    }
  };

  const deleteObject = async () => {
    if (!selectedObject || !aquarium) return;
    
    if (!confirm('Are you sure you want to delete this object?')) return;

    try {
      // Remove from aquarium
      if (aquarium.objectManager) {
        aquarium.objectManager.removeObject(selectedObject.object_id);
      }
      
      // Remove from database
      await databaseService.deletePlacedObject(selectedObject.object_id);
      
      // Clear selection and refresh list
      setSelectedObject(null);
      loadPlacedObjects();
      
      console.log(`Deleted object ${selectedObject.object_id}`);
    } catch (err) {
      console.error('Error deleting object:', err);
      setError('Failed to delete object');
      setTimeout(() => setError(null), 3000);
    }
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

          {/* Placed Objects Section */}
          <div className="placed-objects-section">
            <h4>Placed Objects in Aquarium:</h4>
            {isLoading ? (
              <div className="loading-text">Loading objects...</div>
            ) : placedObjects.length === 0 ? (
              <div className="no-objects">
                No objects placed yet. Drag sprites above onto the aquarium!
              </div>
            ) : (
              <div className="placed-objects-list">
                {placedObjects.map((obj) => (
                  <div 
                    key={obj.object_id}
                    className={`placed-object-item ${selectedObject?.object_id === obj.object_id ? 'selected' : ''}`}
                    onClick={() => handleObjectSelect(obj)}
                  >
                    <img 
                      src={obj.sprite_url} 
                      alt="Placed object"
                      className="placed-object-thumb"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'block';
                      }}
                    />
                    <div className="placed-object-error" style={{ display: 'none' }}>
                      Failed to load
                    </div>
                    <div className="placed-object-info">
                      <div className="object-position">
                        Grid: ({obj.grid_x}, {obj.grid_y})
                      </div>
                      <div className="object-size">
                        Size: {obj.size || 6}x{obj.size || 6}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Object Positioning Controls */}
          {selectedObject && (
            <div className="object-positioning-controls">
              <h4>Position Selected Object:</h4>
              <div className="object-info-display">
                <img 
                  src={selectedObject.sprite_url} 
                  alt="Selected object"
                  className="positioning-object-preview"
                />
                <div className="positioning-object-details">
                  <div>Position: ({selectedObject.grid_x}, {selectedObject.grid_y})</div>
                  <div>Size: {selectedObject.size || 6}x{selectedObject.size || 6} tiles</div>
                </div>
              </div>
              
              <div className="movement-controls">
                <div className="movement-grid">
                  <button 
                    className="move-btn move-up"
                    onClick={() => moveObject('up')}
                    title="Move up one tile"
                  >
                    ↑
                  </button>
                  <button 
                    className="move-btn move-left"
                    onClick={() => moveObject('left')}
                    title="Move left one tile"
                  >
                    ←
                  </button>
                  <div className="move-center">
                    <span className="position-display">
                      {selectedObject.grid_x}, {selectedObject.grid_y}
                    </span>
                  </div>
                  <button 
                    className="move-btn move-right"
                    onClick={() => moveObject('right')}
                    title="Move right one tile"
                  >
                    →
                  </button>
                  <button 
                    className="move-btn move-down"
                    onClick={() => moveObject('down')}
                    title="Move down one tile"
                  >
                    ↓
                  </button>
                </div>
              </div>

              <div className="object-actions">
                <button 
                  className="clear-object-selection-btn"
                  onClick={handleClearObjectSelection}
                >
                  Clear Selection
                </button>
                <button 
                  className="delete-object-btn"
                  onClick={deleteObject}
                >
                  Delete Object
                </button>
              </div>
            </div>
          )}

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
