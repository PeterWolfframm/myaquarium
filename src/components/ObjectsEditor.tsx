import { useState, useEffect, useCallback } from 'preact/hooks';
import CardComponent from './CardComponent';
import ObjectsSpriteGallery from './ObjectsSpriteGallery';
import { databaseService } from '../services/database';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Separator } from './ui/separator';
import { Alert, AlertDescription } from './ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Avatar, AvatarFallback } from './ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from './ui/dropdown-menu';

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
        <Alert className="border-red-500/50 bg-red-500/10 mb-4">
          <AlertDescription className="flex justify-between items-center">
            <span className="text-red-400">Error: {error}</span>
            <Button variant="ghost" size="sm" onClick={() => setError(null)} className="text-red-300 hover:text-white h-6 w-6 p-0">
              ×
            </Button>
          </AlertDescription>
        </Alert>
      )}
      
      <Tabs defaultValue="sprites" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 bg-slate-800/50 border border-slate-600">
          <TabsTrigger value="sprites" className="data-[state=active]:bg-slate-700 data-[state=active]:text-white">
            🖼️ Sprites
          </TabsTrigger>
          <TabsTrigger value="placed" className="data-[state=active]:bg-slate-700 data-[state=active]:text-white">
            📍 Placed Objects
          </TabsTrigger>
          <TabsTrigger value="edit" className="data-[state=active]:bg-slate-700 data-[state=active]:text-white" disabled={!selectedObject}>
            ✏️ Edit Object
          </TabsTrigger>
        </TabsList>

        <div className="min-h-[400px]">
          <TabsContent value="sprites" className="mt-0 space-y-6">
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-gray-300">Object Sprites</h3>
              <p className="text-sm text-gray-400">Upload and manage object sprites for your aquarium. Only name input is required for uploads.</p>
            </div>

            {/* Size Selector */}
            <Card className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-blue-500/20">
              <CardHeader>
                <CardTitle className="text-lg text-blue-300">Object Size</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2 justify-center">
                  {[6, 7, 8, 9, 10, 12].map(size => (
                    <Button
                      key={size}
                      variant={selectedSize === size ? "default" : "outline"}
                      size="sm"
                      className={selectedSize === size 
                        ? 'bg-blue-600 text-white border-blue-700 shadow-lg shadow-blue-500/50' 
                        : 'border-blue-500/50 hover:bg-blue-500/20 hover:border-blue-500'
                      }
                      onClick={() => setSelectedSize(size)}
                    >
                      {size}x{size}
                    </Button>
                  ))}
                </div>
                <div className="text-center">
                  <Badge variant="outline" className="text-blue-400 border-blue-400">
                    Selected: {selectedSize}x{selectedSize} tiles ({selectedSize * 64}x{selectedSize * 64} pixels)
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/20">
              <CardHeader>
                <CardTitle className="text-lg text-purple-300">Sprite Gallery</CardTitle>
              </CardHeader>
              <CardContent>
                <ObjectsSpriteGallery
                  selectedSpriteUrl={selectedSprite}
                  onSpriteSelect={handleSpriteSelect}
                  onUploadComplete={handleUploadComplete}
                  onError={setError}
                  selectedSize={selectedSize}
                />
              </CardContent>
            </Card>

          </TabsContent>

          <TabsContent value="placed" className="mt-0 space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold text-gray-300">Placed Objects</h3>
                <p className="text-sm text-gray-400">Objects currently in your aquarium: <Badge variant="outline" className="text-orange-400 border-orange-400">{placedObjects.length}</Badge></p>
              </div>
            </div>
            {isLoading ? (
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-center text-gray-400">
                    Loading objects...
                  </div>
                </CardContent>
              </Card>
            ) : placedObjects.length === 0 ? (
              <Card>
                <CardContent className="p-6">
                  <div className="text-center space-y-3">
                    <div className="text-gray-400">No objects placed yet</div>
                    <p className="text-sm text-gray-500">Drag sprites from the gallery onto the aquarium to place objects!</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
                {placedObjects.map((obj) => (
                  <Card 
                    key={obj.object_id}
                    className={`cursor-pointer transition-all duration-200 ${
                      selectedObject?.object_id === obj.object_id 
                        ? 'bg-gradient-to-br from-orange-500/20 to-red-500/20 border-orange-500/50' 
                        : 'bg-gradient-to-br from-orange-500/10 to-red-500/10 border-orange-500/20 hover:border-orange-500/40'
                    }`}
                    onClick={() => handleObjectSelect(obj)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-12 w-12">
                            <img 
                              src={obj.sprite_url} 
                              alt="Placed object"
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'block';
                              }}
                            />
                            <AvatarFallback className="bg-orange-500/20 text-orange-400">
                              🎯
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium text-white">Object #{obj.object_id}</div>
                            <div className="text-xs text-gray-400">Grid: ({obj.grid_x}, {obj.grid_y})</div>
                          </div>
                        </div>
                        
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={(e) => e.stopPropagation()}>
                              <span className="sr-only">Open menu</span>
                              ⋮
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Object Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation();
                              handleObjectSelect(obj);
                            }}>
                              ✏️ Edit Object
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteObject();
                              }}
                              className="text-red-400 focus:text-red-300"
                            >
                              🗑️ Delete Object
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-2">
                        <Badge variant="secondary" className="text-xs justify-center">
                          {obj.size || 6}x{obj.size || 6}
                        </Badge>
                        <Badge variant="secondary" className="text-xs justify-center">
                          Layer {obj.layer || 0}
                        </Badge>
                        <Badge variant={selectedObject?.object_id === obj.object_id ? "default" : "outline"} className="text-xs justify-center">
                          {selectedObject?.object_id === obj.object_id ? "Selected" : "Select"}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="edit" className="mt-0 space-y-6">
            {selectedObject ? (
              <Card className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/20">
                <CardHeader>
                  <CardTitle className="text-lg text-green-300">Edit Selected Object</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center gap-4 p-4 bg-slate-800/50 rounded-lg border border-green-500/30">
                    <Avatar className="h-16 w-16">
                      <img 
                        src={selectedObject.sprite_url} 
                        alt="Selected object"
                        className="w-full h-full object-cover"
                      />
                      <AvatarFallback className="bg-green-500/20 text-green-400">
                        🎯
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-400">Position:</span>
                        <Badge variant="outline" className="text-green-400 border-green-400">
                          ({selectedObject.grid_x}, {selectedObject.grid_y})
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-400">Size:</span>
                        <Badge variant="outline" className="text-green-400 border-green-400">
                          {selectedObject.size || 6}x{selectedObject.size || 6} tiles
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-400">Layer:</span>
                        <Badge variant="outline" className="text-green-400 border-green-400">
                          {selectedObject.layer || 0}
                        </Badge>
                      </div>
                    </div>
                  </div>
              
                  <div className="space-y-4">
                    <h4 className="text-sm font-semibold text-gray-300 text-center">Movement Controls</h4>
                    <div className="flex justify-center">
                      <div className="grid grid-cols-3 grid-rows-3 gap-2 w-36 h-36">
                        <div></div>
                        <Button 
                          variant="outline"
                          size="sm"
                          className="border-green-500/50 hover:bg-green-500/20 text-lg font-bold h-10"
                          onClick={() => moveObject('up')}
                          title="Move up one tile"
                        >
                          ↑
                        </Button>
                        <div></div>
                        <Button 
                          variant="outline"
                          size="sm"
                          className="border-green-500/50 hover:bg-green-500/20 text-lg font-bold h-10"
                          onClick={() => moveObject('left')}
                          title="Move left one tile"
                        >
                          ←
                        </Button>
                        <div className="flex items-center justify-center bg-slate-800/50 border border-green-500/30 rounded text-xs text-green-400 font-bold">
                          {selectedObject.grid_x}, {selectedObject.grid_y}
                        </div>
                        <Button 
                          variant="outline"
                          size="sm"
                          className="border-green-500/50 hover:bg-green-500/20 text-lg font-bold h-10"
                          onClick={() => moveObject('right')}
                          title="Move right one tile"
                        >
                          →
                        </Button>
                        <div></div>
                        <Button 
                          variant="outline"
                          size="sm"
                          className="border-green-500/50 hover:bg-green-500/20 text-lg font-bold h-10"
                          onClick={() => moveObject('down')}
                          title="Move down one tile"
                        >
                          ↓
                        </Button>
                        <div></div>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h4 className="text-sm font-semibold text-gray-300 text-center">Layer Controls</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <Button 
                        variant="outline"
                        className="border-green-500/50 hover:bg-green-500/20"
                        onClick={() => moveObjectToLayer('background')}
                        title="Move to background (layer -1)"
                      >
                        ↓ Background
                      </Button>
                      <Button 
                        variant="outline"
                        className="border-green-500/50 hover:bg-green-500/20"
                        onClick={() => moveObjectToLayer('foreground')}
                        title="Move to foreground (layer +1)"
                      >
                        ↑ Foreground
                      </Button>
                    </div>
                    <Alert className="border-green-500/50 bg-green-500/10">
                      <AlertDescription className="text-xs text-gray-300 text-center">
                        Layer {selectedObject.layer || 0}: Lower layers render behind higher layers
                      </AlertDescription>
                    </Alert>
                  </div>

                  <Separator />

                  <div className="grid grid-cols-2 gap-3">
                    <Button 
                      variant="outline"
                      onClick={handleClearObjectSelection}
                      className="border-slate-600 hover:bg-slate-700"
                    >
                      Clear Selection
                    </Button>
                    <Button 
                      variant="destructive"
                      onClick={deleteObject}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      Delete Object
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-6">
                  <div className="text-center text-gray-400">
                    Select an object from the placed objects tab to edit it
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

        </div>

        {/* Floating info panels for selected sprite and upload history */}
        {selectedSprite && (
          <div className="mt-6">
            <Card className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border-indigo-500/20">
              <CardHeader>
                <CardTitle className="text-sm text-indigo-300">Selected Sprite</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-center">
                  <Avatar className="h-20 w-20">
                    <img 
                      src={selectedSprite} 
                      alt="Selected object sprite" 
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'block';
                      }}
                    />
                    <AvatarFallback className="bg-indigo-500/20 text-indigo-400">
                      🖼️
                    </AvatarFallback>
                  </Avatar>
                </div>
                <p className="text-xs text-gray-400 text-center break-all font-mono">{selectedSprite}</p>
                <Button 
                  variant="outline"
                  size="sm"
                  className="w-full border-indigo-500/50 hover:bg-indigo-500/20"
                  onClick={handleRemoveSelection}
                >
                  Clear Selection
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {uploadHistory.length > 0 && (
          <div className="mt-6">
            <Card className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border-yellow-500/20">
              <CardHeader>
                <CardTitle className="text-sm text-yellow-300">Recent Uploads</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-2 max-h-32 overflow-y-auto">
                  {uploadHistory.slice(-5).reverse().map((upload, index) => (
                    <div key={index} className="flex items-center gap-3 p-2 bg-slate-800/30 rounded border border-yellow-500/20">
                      <Avatar className="h-8 w-8">
                        <img 
                          src={upload.url} 
                          alt={upload.fileName}
                          className="w-full h-full object-cover"
                        />
                        <AvatarFallback className="bg-yellow-500/20 text-yellow-400 text-xs">
                          📎
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-white truncate">{upload.fileName}</div>
                        <div className="text-xs text-gray-400">
                          {upload.uploadedAt.toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </Tabs>
    </CardComponent>
  );
}

export default ObjectsEditor;
