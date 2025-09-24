import { useState, useEffect, useCallback } from 'preact/hooks';
import CardComponent from './CardComponent';
import ObjectsSpriteGallery from './ObjectsSpriteGallery';
import { databaseService } from '../services/database';

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
  const [selectedSize, setSelectedSize] = useState(6); // Default size: 6x6

  // Handle object clicks from aquarium
  const handleObjectClick = useCallback((objectData) => {
    console.log('Object clicked from aquarium:', objectData);
    setSelectedObject({
      object_id: objectData.id,
      sprite_url: objectData.spriteUrl,
      grid_x: objectData.gridX,
      grid_y: objectData.gridY,
      size: objectData.size,
      layer: objectData.layer
    });
    setSelectedSprite(null); // Clear sprite selection when object is clicked
  }, []);

  // Enable/disable object selection when panel opens/closes
  useEffect(() => {
    if (isOpen && aquarium) {
      // Enable object selection when panel opens
      console.log('Enabling object selection...');
      aquarium.enableObjectSelection(handleObjectClick);
    } else if (aquarium) {
      // Disable object selection when panel closes
      console.log('Disabling object selection...');
      aquarium.disableObjectSelection();
    }
    
    // Cleanup when component unmounts or dependencies change
    return () => {
      if (aquarium) {
        aquarium.disableObjectSelection();
      }
    };
  }, [isOpen, aquarium, handleObjectClick]);

  // Reset when panel opens/closes
  useEffect(() => {
    if (isOpen) {
      setSelectedSprite(null);
      setSelectedObject(null);
      setError(null);
      loadPlacedObjects();
    } else {
      // Clear selection when closing
      console.log('🔒 Objects Editor closing - clearing all selections and stopping blinking');
      setSelectedObject(null);
      setSelectedSprite(null);
      if (aquarium) {
        aquarium.clearObjectSelection();
      }
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
    
    // Also clear blinking in the aquarium when selecting sprite
    if (aquarium && aquarium.objectManager) {
      aquarium.objectManager.clearSelection();
    }
  };

  const handleObjectSelect = (objectData) => {
    console.log('🖱️ Object selected from UI list:', objectData);
    setSelectedObject(objectData);
    setSelectedSprite(null); // Clear sprite selection when selecting object
    
    // Also show blinking in the aquarium when selecting from UI
    if (aquarium && aquarium.objectManager) {
      console.log('🌟 Triggering aquarium blink for object:', objectData.object_id);
      aquarium.objectManager.selectObjectById(objectData.object_id);
    }
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
    
    // Also clear blinking in the aquarium
    if (aquarium && aquarium.objectManager) {
      aquarium.objectManager.clearSelection();
    }
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
      // Check if the new position is within bounds (allow overlapping)
      if (aquarium.objectManager && aquarium.objectManager.isGridAreaInBounds(newGridX, newGridY, selectedObject.size || 6)) {
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
        setError(`Cannot move ${direction} - position is out of bounds`);
        setTimeout(() => setError(null), 3000);
      }
    } catch (err) {
      console.error('Error moving object:', err);
      setError('Failed to move object');
      setTimeout(() => setError(null), 3000);
    }
  };

  // Layer movement handlers  
  const moveObjectToLayer = async (direction) => {
    if (!selectedObject || !aquarium) return;

    try {
      let updatedObject;
      
      if (direction === 'foreground') {
        // Move to foreground (increase layer)
        updatedObject = await databaseService.moveObjectToForeground(selectedObject.object_id);
        if (aquarium.objectManager) {
          aquarium.objectManager.moveObjectToForeground(selectedObject.object_id);
        }
      } else if (direction === 'background') {
        // Move to background (decrease layer)
        updatedObject = await databaseService.moveObjectToBackground(selectedObject.object_id);
        if (aquarium.objectManager) {
          aquarium.objectManager.moveObjectToBackground(selectedObject.object_id);
        }
      }

      if (updatedObject) {
        // Update local state with new layer
        setSelectedObject(prev => ({
          ...prev,
          layer: updatedObject.layer
        }));
        
        // Refresh placed objects list to show updated layer
        loadPlacedObjects();
        
        console.log(`Moved object ${selectedObject.object_id} to ${direction} (layer ${updatedObject.layer})`);
      } else {
        setError(`Failed to move object to ${direction}`);
        setTimeout(() => setError(null), 3000);
      }
    } catch (err) {
      console.error('Error moving object layer:', err);
      setError(`Failed to move object to ${direction}`);
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
    <CardComponent 
      title="🎨 Objects Manager"
      componentId={draggableId || "objectsManager"}
      isOpen={isOpen}
      onToggle={onToggle}
      defaultViewMode="sticky"
      position={isDraggable ? "static" : "top-left"}
      size="large"
      className="objects-manager-collapsible"
      hideWhenClosed={true}
      isDraggable={isDraggable}
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

        {/* Size Selector */}
        <div className="size-selector-section">
          <h4>Object Size:</h4>
          <div className="size-selector">
            {[6, 7, 8, 9, 10, 12].map(size => (
              <button
                key={size}
                className={`size-option ${selectedSize === size ? 'selected' : ''}`}
                onClick={() => setSelectedSize(size)}
                title={`${size}x${size} tiles`}
              >
                {size}x{size}
              </button>
            ))}
          </div>
          <div className="size-info">
            <small>Selected size: {selectedSize}x{selectedSize} tiles ({selectedSize * 64}x{selectedSize * 64} pixels)</small>
          </div>
        </div>

        <div className="objects-main">
          <ObjectsSpriteGallery
            selectedSpriteUrl={selectedSprite}
            onSpriteSelect={handleSpriteSelect}
            onUploadComplete={handleUploadComplete}
            onError={setError}
            selectedSize={selectedSize}
          />

          {/* Placed Objects Section */}
          <div className="placed-objects-section">
            <h4>Placed Objects in Aquarium:</h4>
            {isLoading && (
              <div className="loading-text">Loading objects...</div>
            )}
            {placedObjects.length === 0 && !isLoading ? (
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
                      <div className="object-layer">
                        Layer: {obj.layer || 0}
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
                  <div>Layer: {selectedObject.layer || 0}</div>
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

              <div className="layer-controls">
                <h5>Layer Controls:</h5>
                <div className="layer-buttons">
                  <button 
                    className="layer-btn layer-background"
                    onClick={() => moveObjectToLayer('background')}
                    title="Move to background (layer -1)"
                  >
                    ↓ Background
                  </button>
                  <button 
                    className="layer-btn layer-foreground"
                    onClick={() => moveObjectToLayer('foreground')}
                    title="Move to foreground (layer +1)"
                  >
                    ↑ Foreground
                  </button>
                </div>
                <div className="layer-info">
                  <small>Layer {selectedObject.layer || 0}: Lower layers render behind higher layers</small>
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
    </CardComponent>
  );
}

export default ObjectsEditor;
