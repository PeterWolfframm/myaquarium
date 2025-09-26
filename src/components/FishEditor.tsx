import { useState, useEffect } from 'preact/hooks';
import { useFishStore } from '../stores/fishStore';
import { useAquariumStore } from '../stores/aquariumStore';
import CardComponent from './CardComponent';
import SpriteGallery from './SpriteGallery';
import { FISH_CONFIG } from '../constants/index';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Separator } from './ui/separator';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Slider } from './ui/slider';
import { Alert, AlertDescription } from './ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Avatar, AvatarFallback } from './ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from './ui/dropdown-menu';

function FishEditor({ 
  isOpen, 
  onToggle, 
  isDraggable = false, 
  draggableId = null, 
  draggablePosition = null 
}: {
  isOpen: boolean;
  onToggle: () => void;
  isDraggable?: boolean;
  draggableId?: string | null;
  draggablePosition?: { x: number; y: number } | null;
}) {
  const { 
    fish, 
    addFish,
    updateFish, 
    removeFish, 
    addRandomFish,
    isLoading, 
    isSyncing,
    syncError,
    clearSyncError 
  } = useFishStore();
  
  const { getWorldDimensions } = useAquariumStore();
  
  const [selectedFish, setSelectedFish] = useState(null);
  const [editingColor, setEditingColor] = useState('');
  const [editingName, setEditingName] = useState('');
  const [editingSpriteUrl, setEditingSpriteUrl] = useState(null);
  const [editingSize, setEditingSize] = useState(1.0);
  
  // Creation form state
  const [isCreating, setIsCreating] = useState(false);
  const [newFishName, setNewFishName] = useState('');
  const [newFishColor, setNewFishColor] = useState('4CAF50');
  const [newFishSpriteUrl, setNewFishSpriteUrl] = useState(FISH_CONFIG.DEFAULT_SPRITE_URL);
  const [newFishSize, setNewFishSize] = useState(1.0);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Shark sprite URL (now used by Fish class for offline mode)
  const sharkSpriteUrl = new URL('../sprites/shark.png', import.meta.url).href;

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

  // Reset when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setSelectedFish(null);
      setEditingColor('');
      setEditingName('');
      setEditingSpriteUrl(null);
      setEditingSize(1.0);
      setIsCreating(false);
      setNewFishName('');
      setNewFishColor('4CAF50');
      // Set default sprite based on online status
      setNewFishSpriteUrl(isOnline ? FISH_CONFIG.DEFAULT_SPRITE_URL : sharkSpriteUrl);
      setNewFishSize(1.0);
      clearSyncError();
    }
  }, [isOpen, clearSyncError, isOnline, sharkSpriteUrl]);

  // Update selected fish when store data changes
  useEffect(() => {
    if (selectedFish && fish.length > 0) {
      const updatedFish = fish.find(f => f.id === selectedFish.id);
      if (updatedFish && (
        updatedFish.color !== selectedFish.color ||
        updatedFish.name !== selectedFish.name ||
        updatedFish.sprite_url !== selectedFish.spriteUrl ||
        updatedFish.size !== selectedFish.size
      )) {
        setSelectedFish({
          ...updatedFish,
          spriteUrl: updatedFish.sprite_url // Convert snake_case to camelCase
        });
        // Only update editing fields if they haven't been modified by user
        if (editingColor === selectedFish.color) {
          setEditingColor(updatedFish.color || '4CAF50');
        }
        if (editingName === selectedFish.name) {
          setEditingName(updatedFish.name || '');
        }
        if (editingSpriteUrl === selectedFish.spriteUrl) {
          setEditingSpriteUrl(updatedFish.sprite_url || null);
        }
        if (editingSize === selectedFish.size) {
          setEditingSize(updatedFish.size || 1.0);
        }
      }
    }
  }, [fish, selectedFish, editingColor, editingName, editingSpriteUrl, editingSize]);

  // Remove early return - CardComponent handles visibility

  const handleFishSelect = (fishData) => {
    // Ensure consistent format (convert snake_case to camelCase if needed)
    const normalizedFishData = {
      ...fishData,
      spriteUrl: fishData.spriteUrl || fishData.sprite_url
    };
    setSelectedFish(normalizedFishData);
    setEditingColor(normalizedFishData.color || '4CAF50');
    setEditingName(normalizedFishData.name || '');
    setEditingSpriteUrl(normalizedFishData.spriteUrl || null);
    setEditingSize(normalizedFishData.size || 1.0);
  };

  const handleSaveChanges = async () => {
    if (!selectedFish) return;

    const updates = {
      color: editingColor.replace('#', ''), // Remove # if present
      name: editingName || selectedFish.name,
      sprite_url: editingSpriteUrl,
      size: editingSize
    };

    // Optimistic update: immediately update the selected fish display
    const optimisticFish = {
      ...selectedFish,
      color: updates.color,
      name: updates.name,
      spriteUrl: updates.sprite_url,
      size: updates.size
    };
    setSelectedFish(optimisticFish);

    const success = await updateFish(selectedFish.id, updates);
    if (success) {
      // Keep the fish selected but with updated data
      // The useEffect above will update selectedFish with the real store data
      console.log('Fish updated successfully');
    } else {
      // Revert optimistic update on failure
      setSelectedFish(selectedFish);
    }
  };

  const handleDeleteFish = async (fishId) => {
    if (confirm('Are you sure you want to delete this fish?')) {
      const success = await removeFish(fishId);
      if (success && selectedFish && selectedFish.id === fishId) {
        setSelectedFish(null);
        setEditingColor('');
        setEditingName('');
        setEditingSpriteUrl(null);
        setEditingSize(1.0);
      }
    }
  };

  const handleAddRandomFish = async () => {
    const { worldWidth, worldHeight } = getWorldDimensions();
    
    // Determine which sprite to use based on current mode
    let spriteToUse = null;
    if (isCreating) {
      spriteToUse = newFishSpriteUrl;
    } else if (selectedFish) {
      spriteToUse = editingSpriteUrl;
    }
    
    // Create random fish, optionally with the currently selected sprite
    const customName = spriteToUse ? `Fish_${Date.now()}` : null;
    const newFish = await addRandomFish(worldWidth, worldHeight, customName);
    
    if (newFish && spriteToUse) {
      // If we have a selected sprite, update the new fish to use it
      await updateFish(newFish.id, { sprite_url: spriteToUse });
      console.log('Random fish created with custom sprite:', newFish);
    } else if (newFish) {
      console.log('Random fish added successfully:', newFish);
    }
  };

  const handleCreateFish = async () => {
    if (!newFishName.trim()) {
      alert('Please enter a name for the fish');
      return;
    }

    const { worldWidth, worldHeight } = getWorldDimensions();
    
    // Create fish data
    const fishData = {
      name: newFishName.trim(),
      color: newFishColor.replace('#', ''), // Remove # if present
      sprite_url: newFishSpriteUrl,
      size: newFishSize,
      baseSpeed: 0.5 + Math.random() * 1.5, // 0.5 to 2.0
      currentSpeed: 1.0,
      direction: Math.random() > 0.5 ? 1 : -1,
      positionX: Math.random() * worldWidth,
      positionY: 50 + Math.random() * (worldHeight - 100),
      targetY: 50 + Math.random() * (worldHeight - 100),
      verticalSpeed: 0.1 + Math.random() * 0.2, // 0.1 to 0.3
      driftInterval: Math.round(3000 + Math.random() * 4000), // 3-7 seconds
      animationSpeed: Math.round(100 + Math.random() * 100), // 100-200ms
      frameCount: 4,
      currentFrame: Math.floor(Math.random() * 4)
    };

    const success = await addFish(fishData);
    if (success) {
      // Reset creation form
      setNewFishName('');
      setNewFishColor('4CAF50');
      setNewFishSpriteUrl(isOnline ? FISH_CONFIG.DEFAULT_SPRITE_URL : sharkSpriteUrl);
      setNewFishSize(1.0);
      setIsCreating(false);
      console.log('Fish created successfully:', success);
    }
  };

  const handleStartCreating = () => {
    setSelectedFish(null);
    setEditingColor('');
    setEditingName('');
    setEditingSpriteUrl(null);
    setEditingSize(1.0);
    setNewFishSpriteUrl(isOnline ? FISH_CONFIG.DEFAULT_SPRITE_URL : sharkSpriteUrl);
    setIsCreating(true);
  };

  const handleCancelCreation = () => {
    setIsCreating(false);
    setNewFishName('');
    setNewFishColor('4CAF50');
    setNewFishSpriteUrl(isOnline ? FISH_CONFIG.DEFAULT_SPRITE_URL : sharkSpriteUrl);
    setNewFishSize(1.0);
  };

  const handleCancelEdit = () => {
    setSelectedFish(null);
    setEditingColor('');
    setEditingName('');
    setEditingSpriteUrl(null);
    setEditingSize(1.0);
  };

  const presetColors = [
    '4CAF50', '2196F3', 'FF9800', 'E91E63', '9C27B0', '00BCD4',
    'FFC107', 'FF5722', '795548', '607D8B', '8BC34A', '4FC3F7',
    'F06292', 'FFB74D', 'A5D6A7', 'F8BBD9', '90CAF9', 'FFCC02',
    'CE93D8', 'FFAB91', 'BCAAA4', 'D7CCC8', '80CBC4', 'C5E1A5'
  ];

  return (
    <CardComponent 
      title="🐠 Fish Editor"
      componentId={draggableId || "fish-editor"}
      isOpen={isOpen}
      onToggle={onToggle}
      defaultViewMode={isDraggable ? "sticky" : "fullscreen"}
      position={isDraggable ? "static" : "center"}
      size="large"
      className="fish-editor-modal"
      hideWhenClosed={true}
      isDraggable={isDraggable}
      draggablePosition={draggablePosition}
    >
      {syncError && (
        <Alert className="border-red-500/50 bg-red-500/10 mb-4">
          <AlertDescription className="flex justify-between items-center">
            <span className="text-red-400">Error: {syncError}</span>
            <Button variant="ghost" size="sm" onClick={clearSyncError} className="text-red-300 hover:text-white h-6 w-6 p-0">
              ×
            </Button>
          </AlertDescription>
        </Alert>
      )}
      
      <Tabs defaultValue="gallery" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 bg-slate-800/50 border border-slate-600">
          <TabsTrigger value="gallery" className="data-[state=active]:bg-slate-700 data-[state=active]:text-white">
            🐟 Fish Gallery
          </TabsTrigger>
          <TabsTrigger value="create" className="data-[state=active]:bg-slate-700 data-[state=active]:text-white">
            ➕ Create Fish
          </TabsTrigger>
          <TabsTrigger value="edit" className="data-[state=active]:bg-slate-700 data-[state=active]:text-white" disabled={!selectedFish}>
            ✏️ Edit Fish
          </TabsTrigger>
        </TabsList>

        <div className="min-h-[400px]">
          <TabsContent value="gallery" className="mt-0 space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold text-gray-300">Your Fish Collection</h3>
                <p className="text-sm text-gray-400">Total fish: <Badge variant="outline" className="text-blue-400 border-blue-400">{fish.length}</Badge></p>
              </div>
              <Button 
                onClick={handleStartCreating}
                disabled={isSyncing}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isSyncing ? 'Creating...' : '+ Create New Fish'}
              </Button>
            </div>
            {isLoading ? (
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-center text-gray-400">
                    Loading fish...
                  </div>
                </CardContent>
              </Card>
            ) : fish.length === 0 ? (
              <Card>
                <CardContent className="p-6">
                  <div className="text-center space-y-3">
                    <div className="text-gray-400">No fish in your aquarium yet</div>
                    <Button onClick={handleStartCreating} className="bg-blue-600 hover:bg-blue-700">
                      Create Your First Fish
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {fish.map((fishData) => (
                  <Card 
                    key={fishData.id} 
                    className={`cursor-pointer transition-all duration-200 ${
                      selectedFish?.id === fishData.id 
                        ? 'bg-gradient-to-br from-blue-500/20 to-purple-500/20 border-blue-500/50' 
                        : 'bg-gradient-to-br from-blue-500/10 to-purple-500/10 border-blue-500/20 hover:border-blue-500/40'
                    } ${isSyncing ? 'opacity-70 animate-pulse' : ''}`}
                    onClick={() => handleFishSelect(fishData)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-12 w-12">
                            <img 
                              src={fishData.spriteUrl || fishData.sprite_url || FISH_CONFIG.DEFAULT_SPRITE_URL}
                              alt={fishData.name || 'Fish sprite'}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.target.src = FISH_CONFIG.DEFAULT_SPRITE_URL;
                              }}
                            />
                            <AvatarFallback className="bg-blue-500/20 text-blue-400">
                              🐟
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium text-white truncate">{fishData.name || 'Unnamed'}</div>
                            <div className="text-xs text-gray-400">#{fishData.color}</div>
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
                            <DropdownMenuLabel>Fish Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation();
                              handleFishSelect(fishData);
                            }}>
                              ✏️ Edit Fish
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteFish(fishData.id);
                              }}
                              disabled={isSyncing}
                              className="text-red-400 focus:text-red-300"
                            >
                              🗑️ Delete Fish
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <Badge variant="secondary" className="text-xs">
                          Size: {(fishData.size || 1.0).toFixed(1)}x
                        </Badge>
                        <Badge variant={selectedFish?.id === fishData.id ? "default" : "outline"} className="text-xs">
                          {selectedFish?.id === fishData.id ? "Selected" : "Click to select"}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="create" className="mt-0 space-y-6">
            <Card className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/20">
              <CardHeader>
                <CardTitle className="text-lg text-green-300">Create New Fish</CardTitle>
              </CardHeader>
              
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="fishName" className="text-sm font-medium text-gray-200">
                    Fish Name
                  </Label>
                  <Input
                    id="fishName"
                    type="text"
                    value={newFishName}
                    onChange={(e) => setNewFishName(e.target.value)}
                    placeholder="Enter fish name"
                    className="bg-slate-800/50 border-green-500/50"
                  />
                </div>

                {/* Color picking functionality commented out - everything is sprites now
                <div>
                  <label className="text-primary-300 font-black text-sm uppercase tracking-wider block mb-3">Color:</label>
                  <div className="flex items-center gap-3 mb-3">
                    <input
                      type="color"
                      value={`#${newFishColor}`}
                      onChange={(e) => setNewFishColor(e.target.value.replace('#', ''))}
                      className="w-12 h-8 border-2 border-primary-400/50 rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      value={newFishColor}
                      onChange={(e) => setNewFishColor(e.target.value.replace('#', ''))}
                      placeholder="FF0000"
                      maxLength={6}
                      className="input-primary flex-1"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-primary-300 font-black text-sm uppercase tracking-wider block mb-3">Preset Colors:</label>
                  <div className="grid grid-cols-8 gap-2">
                    {presetColors.map((color) => (
                      <button
                        key={color}
                        className="w-8 h-8 rounded border-2 border-white/30 hover:border-primary-400 hover:scale-110 transition-all duration-200"
                        style={{ backgroundColor: `#${color}` }}
                        onClick={() => setNewFishColor(color)}
                        title={`#${color}`}
                      />
                    ))}
                  </div>
                </div>
                */}

                <div className="space-y-4">
                  <Label className="text-sm font-medium text-gray-200 block">
                    Fish Size: <Badge variant="outline" className="text-green-400 border-green-400 ml-2">{newFishSize.toFixed(1)}x</Badge>
                  </Label>
                  <div className="space-y-3">
                    <Slider
                      value={[newFishSize]}
                      onValueChange={(value) => setNewFishSize(value[0])}
                      max={3.0}
                      min={0.1}
                      step={0.1}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-gray-400">
                      <span>Tiny (0.1x)</span>
                      <span>Normal (1.0x)</span>
                      <span>Large (3.0x)</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="text-sm font-medium text-gray-200">
                    Fish Sprite
                  </Label>
                  <SpriteGallery
                    selectedSpriteUrl={newFishSpriteUrl}
                    onSpriteSelect={setNewFishSpriteUrl}
                    onUploadComplete={(result) => {
                      console.log('Sprite uploaded:', result);
                    }}
                    onAddRandomFish={handleAddRandomFish}
                    isCreatingFish={isSyncing}
                  />
                </div>

                <Separator />

                <div className="flex gap-3">
                  <Button 
                    onClick={handleCreateFish}
                    disabled={isSyncing || !newFishName.trim()}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    {isSyncing ? 'Creating...' : 'Create Fish'}
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={handleCancelCreation}
                    className="flex-1 border-slate-600 hover:bg-slate-700"
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="edit" className="mt-0 space-y-6">
            {selectedFish ? (
              <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/20">
                <CardHeader>
                  <CardTitle className="text-lg text-purple-300">Edit {selectedFish.name || 'Fish'}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="editFishName" className="text-sm font-medium text-gray-200">
                      Fish Name
                    </Label>
                    <Input
                      id="editFishName"
                      type="text"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      placeholder="Enter fish name"
                      className="bg-slate-800/50 border-purple-500/50"
                    />
                  </div>

                {/* Color picking functionality commented out - everything is sprites now
                <div>
                  <label className="text-primary-300 font-black text-sm uppercase tracking-wider block mb-3">Color:</label>
                  <div className="flex items-center gap-3 mb-3">
                    <input
                      type="color"
                      value={`#${editingColor}`}
                      onChange={(e) => setEditingColor(e.target.value.replace('#', ''))}
                      className="w-12 h-8 border-2 border-primary-400/50 rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      value={editingColor}
                      onChange={(e) => setEditingColor(e.target.value.replace('#', ''))}
                      placeholder="FF0000"
                      maxLength={6}
                      className="input-primary flex-1"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-primary-300 font-black text-sm uppercase tracking-wider block mb-3">Preset Colors:</label>
                  <div className="grid grid-cols-8 gap-2">
                    {presetColors.map((color) => (
                      <button
                        key={color}
                        className="w-8 h-8 rounded border-2 border-white/30 hover:border-primary-400 hover:scale-110 transition-all duration-200"
                        style={{ backgroundColor: `#${color}` }}
                        onClick={() => setEditingColor(color)}
                        title={`#${color}`}
                      />
                    ))}
                  </div>
                </div>
                */}

                  <div className="space-y-4">
                    <Label className="text-sm font-medium text-gray-200 block">
                      Fish Size: <Badge variant="outline" className="text-purple-400 border-purple-400 ml-2">{editingSize.toFixed(1)}x</Badge>
                    </Label>
                    <div className="space-y-3">
                      <Slider
                        value={[editingSize]}
                        onValueChange={(value) => setEditingSize(value[0])}
                        max={3.0}
                        min={0.1}
                        step={0.1}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-gray-400">
                        <span>Tiny (0.1x)</span>
                        <span>Normal (1.0x)</span>
                        <span>Large (3.0x)</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-sm font-medium text-gray-200">
                      Fish Sprite
                    </Label>
                    <SpriteGallery
                      selectedSpriteUrl={editingSpriteUrl}
                      onSpriteSelect={setEditingSpriteUrl}
                      onUploadComplete={(result) => {
                        console.log('Sprite uploaded:', result);
                      }}
                      onAddRandomFish={handleAddRandomFish}
                      isCreatingFish={isSyncing}
                    />
                  </div>

                  <Separator />

                  <div className="flex gap-3">
                    <Button 
                      onClick={handleSaveChanges}
                      disabled={isSyncing}
                      className="flex-1 bg-purple-600 hover:bg-purple-700"
                    >
                      {isSyncing ? 'Saving...' : 'Save Changes'}
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={handleCancelEdit}
                      className="flex-1 border-slate-600 hover:bg-slate-700"
                    >
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-6">
                  <div className="text-center text-gray-400">
                    Select a fish from the gallery to edit it
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </div>
      </Tabs>
    </CardComponent>
  );
}

export default FishEditor;
