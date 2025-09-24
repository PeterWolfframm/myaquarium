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
        <div className="section-interactive bg-red-500/20 border-red-500/50 text-red-300 p-3 mb-4 rounded flex justify-between items-center">
          Error: {error}
          <button className="text-red-300 hover:text-white ml-3" onClick={() => setError(null)}>×</button>
        </div>
      )}
      
      <div className="card-content-stats space-y-6">
        <div className="section-primary">
          <h3 className="text-section-title">Object Sprites</h3>
          <p className="text-sm text-slate-300 text-center">Upload and manage object sprites for your aquarium. Only name input is required for uploads.</p>
        </div>

        {/* Size Selector */}
        <div className="section-secondary">
          <h4 className="text-section-title">Object Size</h4>
          <div className="section-content space-y-3">
            <div className="flex flex-wrap gap-2 justify-center">
              {[6, 7, 8, 9, 10, 12].map(size => (
                <button
                  key={size}
                  className={`px-4 py-2 border-2 font-bold text-sm transition-all duration-200 ${
                    selectedSize === size 
                      ? 'bg-primary-500 text-white border-primary-600 shadow-lg shadow-primary-500/50 scale-105' 
                      : 'bg-slate-800 text-primary-300 border-primary-400/50 hover:bg-primary-600 hover:text-white hover:border-primary-500 hover:scale-105'
                  }`}
                  onClick={() => setSelectedSize(size)}
                  title={`${size}x${size} tiles`}
                >
                  {size}x{size}
                </button>
              ))}
            </div>
            <p className="text-mono-small text-center">Selected size: {selectedSize}x{selectedSize} tiles ({selectedSize * 64}x{selectedSize * 64} pixels)</p>
          </div>
        </div>

        <div className="section-secondary">
          <ObjectsSpriteGallery
            selectedSpriteUrl={selectedSprite}
            onSpriteSelect={handleSpriteSelect}
            onUploadComplete={handleUploadComplete}
            onError={setError}
            selectedSize={selectedSize}
          />
        </div>

        {/* Placed Objects Section */}
        <div className="section-secondary">
          <h4 className="text-section-title">Placed Objects in Aquarium</h4>
          {isLoading && (
            <div className="loading-state">Loading objects...</div>
          )}
          {placedObjects.length === 0 && !isLoading ? (
            <div className="empty-state">
              No objects placed yet. Drag sprites above onto the aquarium!
            </div>
          ) : (
            <div className="section-content">
              <div className="grid grid-cols-1 gap-3 max-h-48 overflow-y-auto">
                {placedObjects.map((obj) => (
                  <div 
                    key={obj.object_id}
                    className={`section-interactive p-3 cursor-pointer ${selectedObject?.object_id === obj.object_id ? 'border-primary-500 bg-primary-500/20' : ''}`}
                    onClick={() => handleObjectSelect(obj)}
                  >
                    <div className="flex items-center gap-3">
                      <img 
                        src={obj.sprite_url} 
                        alt="Placed object"
                        className="w-12 h-12 object-cover rounded border border-white/20 flex-shrink-0"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'block';
                        }}
                      />
                      <div className="text-xs text-red-400 hidden">
                        Failed to load
                      </div>
                      <div className="flex-1 text-sm">
                        <div className="text-value">Grid: ({obj.grid_x}, {obj.grid_y})</div>
                        <div className="text-mono-small">Size: {obj.size || 6}x{obj.size || 6}</div>
                        <div className="text-mono-small">Layer: {obj.layer || 0}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Object Positioning Controls */}
        {selectedObject && (
          <div className="section-primary">
            <h4 className="text-section-title">Position Selected Object</h4>
            <div className="section-content space-y-4">
              <div className="flex items-center gap-4 p-3 bg-slate-800/50 rounded border border-primary-400/30">
                <img 
                  src={selectedObject.sprite_url} 
                  alt="Selected object"
                  className="w-16 h-16 object-cover rounded border-2 border-primary-400"
                />
                <div className="flex-1 space-y-1">
                  <div className="text-value">Position: ({selectedObject.grid_x}, {selectedObject.grid_y})</div>
                  <div className="text-mono-small">Size: {selectedObject.size || 6}x{selectedObject.size || 6} tiles</div>
                  <div className="text-mono-small">Layer: {selectedObject.layer || 0}</div>
                </div>
              </div>
              
              <div className="flex justify-center">
                <div className="grid grid-cols-3 grid-rows-3 gap-1 w-32 h-32">
                  <div></div>
                  <button 
                    className="btn-primary flex items-center justify-center text-lg font-bold hover:-translate-y-1"
                    onClick={() => moveObject('up')}
                    title="Move up one tile"
                  >
                    ↑
                  </button>
                  <div></div>
                  <button 
                    className="btn-primary flex items-center justify-center text-lg font-bold hover:-translate-x-1"
                    onClick={() => moveObject('left')}
                    title="Move left one tile"
                  >
                    ←
                  </button>
                  <div className="flex items-center justify-center bg-slate-800/50 border border-primary-400/30 rounded">
                    <span className="text-mono-small text-primary-400 font-bold">
                      {selectedObject.grid_x}, {selectedObject.grid_y}
                    </span>
                  </div>
                  <button 
                    className="btn-primary flex items-center justify-center text-lg font-bold hover:translate-x-1"
                    onClick={() => moveObject('right')}
                    title="Move right one tile"
                  >
                    →
                  </button>
                  <div></div>
                  <button 
                    className="btn-primary flex items-center justify-center text-lg font-bold hover:translate-y-1"
                    onClick={() => moveObject('down')}
                    title="Move down one tile"
                  >
                    ↓
                  </button>
                  <div></div>
                </div>
              </div>

              <div className="space-y-3">
                <h5 className="text-label-large text-center">Layer Controls</h5>
                <div className="flex gap-3">
                  <button 
                    className="btn-secondary flex-1"
                    onClick={() => moveObjectToLayer('background')}
                    title="Move to background (layer -1)"
                  >
                    ↓ Background
                  </button>
                  <button 
                    className="btn-secondary flex-1"
                    onClick={() => moveObjectToLayer('foreground')}
                    title="Move to foreground (layer +1)"
                  >
                    ↑ Foreground
                  </button>
                </div>
                <p className="text-mono-small text-center">Layer {selectedObject.layer || 0}: Lower layers render behind higher layers</p>
              </div>

              <div className="flex gap-3 pt-4">
                <button 
                  className="btn-secondary flex-1"
                  onClick={handleClearObjectSelection}
                >
                  Clear Selection
                </button>
                <button 
                  className="btn-secondary flex-1 bg-red-500/20 border-red-500/50 text-red-400 hover:bg-red-500/40 hover:text-red-300"
                  onClick={deleteObject}
                >
                  Delete Object
                </button>
              </div>
            </div>
          </div>
        )}

        {selectedSprite && (
          <div className="section-tertiary">
            <h4 className="text-section-title">Selected Object Sprite</h4>
            <div className="section-content space-y-3">
              <div className="flex justify-center">
                <img 
                  src={selectedSprite} 
                  alt="Selected object sprite" 
                  className="w-20 h-20 object-cover rounded border-2 border-primary-400"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'block';
                  }}
                />
                <div className="text-xs text-red-400 hidden">
                  Failed to load image
                </div>
              </div>
              <p className="text-mono-small text-center break-all">{selectedSprite}</p>
              <button 
                className="btn-secondary w-full"
                onClick={handleRemoveSelection}
              >
                Clear Selection
              </button>
            </div>
          </div>
        )}

        {uploadHistory.length > 0 && (
          <div className="section-tertiary">
            <h4 className="text-section-title">Recent Uploads</h4>
            <div className="section-content">
              <div className="grid grid-cols-1 gap-2 max-h-32 overflow-y-auto">
                {uploadHistory.slice(-5).reverse().map((upload, index) => (
                  <div key={index} className="flex items-center gap-3 p-2 bg-slate-800/30 rounded border border-primary-400/20">
                    <img 
                      src={upload.url} 
                      alt={upload.fileName}
                      className="w-8 h-8 object-cover rounded border border-white/20"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-value text-xs truncate">{upload.fileName}</div>
                      <div className="text-mono-small">
                        {upload.uploadedAt.toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </CardComponent>
  );
}

export default ObjectsEditor;
