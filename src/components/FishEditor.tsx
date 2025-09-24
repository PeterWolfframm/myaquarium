import { useState, useEffect } from 'preact/hooks';
import { useFishStore } from '../stores/fishStore';
import { useAquariumStore } from '../stores/aquariumStore';
import CardComponent from './CardComponent';
import SpriteGallery from './SpriteGallery';
import { FISH_CONFIG } from '../constants/index';

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
      title="Fish Editor"
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
        <div className="section-interactive bg-red-500/20 border-red-500/50 text-red-300 p-3 mb-4 rounded flex justify-between items-center">
          Error: {syncError}
          <button className="text-red-300 hover:text-white ml-3" onClick={clearSyncError}>×</button>
        </div>
      )}
      
      <div className="card-content-stats space-y-6">
          <div className="border-2 border-primary-400/60 bg-slate-800/50 p-4 transform hover:scale-[1.02] transition-all duration-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-primary-300 font-black text-base uppercase tracking-wider mb-4 text-center border-b-2 border-primary-400/30 pb-2">Your Fish ({fish.length})</h3>
              <button 
                className="px-6 py-3 border-2 font-black text-sm uppercase tracking-wider transition-all duration-200 ease-out cursor-pointer transform bg-primary-500 text-white border-primary-600 shadow-lg shadow-primary-500/50 hover:bg-primary-600 hover:text-white hover:border-primary-500 hover:-translate-y-1 hover:shadow-xl hover:shadow-primary-500/40 hover:scale-105 hover:-rotate-1 active:scale-95"
                onClick={handleStartCreating}
                disabled={isSyncing}
              >
                + Create New Fish
              </button>
            </div>
            {isLoading ? (
              <div className="text-center text-primary-400 font-bold italic py-4">Loading fish...</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {fish.map((fishData) => (
                  <div 
                    key={fishData.id} 
                    className={`section-interactive p-3 cursor-pointer relative ${selectedFish?.id === fishData.id ? 'border-primary-500 bg-primary-500/20' : ''} ${isSyncing ? 'opacity-70 animate-pulse' : ''}`}
                    onClick={() => handleFishSelect(fishData)}
                  >
                    <div className="flex items-center gap-3">
                      <img 
                        src={fishData.spriteUrl || fishData.sprite_url || FISH_CONFIG.DEFAULT_SPRITE_URL}
                        alt={fishData.name || 'Fish sprite'}
                        className="w-8 h-8 object-cover rounded border-2 border-white/30 flex-shrink-0"
                        onError={(e) => {
                          e.target.src = FISH_CONFIG.DEFAULT_SPRITE_URL;
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-white font-black text-sm font-bold truncate">{fishData.name || 'Unnamed'}</div>
                        <div className="text-mono-small">#{fishData.color}</div>
                        <div className="text-mono-small">Size: {(fishData.size || 1.0).toFixed(1)}x</div>
                      </div>
                      <button 
                        className="absolute top-2 right-2 w-6 h-6 bg-red-500/20 hover:bg-red-500/40 text-red-400 hover:text-red-300 rounded border border-red-500/30 flex items-center justify-center text-xs transition-all duration-200"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteFish(fishData.id);
                        }}
                        disabled={isSyncing}
                        title="Delete fish"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {isCreating && (
            <div className="bg-slate-800/70 border-2 border-primary-400/40 p-3 hover:bg-slate-700/70 hover:border-primary-400/70 transition-all duration-200 transform hover:scale-[1.02]">
              <h3 className="text-primary-300 font-black text-base uppercase tracking-wider mb-4 text-center border-b-2 border-primary-400/30 pb-2">Create New Fish</h3>
              
              <div className="section-content space-y-4">
                <label className="text-primary-300 font-black text-sm uppercase tracking-wider block">
                  Name:
                  <input
                    type="text"
                    value={newFishName}
                    onChange={(e) => setNewFishName(e.target.value)}
                    placeholder="Enter fish name"
                    className="input-primary mt-2 w-full"
                  />
                </label>

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

                <div>
                  <label className="text-primary-300 font-black text-sm uppercase tracking-wider block mb-3">Size:</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min="0.1"
                      max="3.0"
                      step="0.1"
                      value={newFishSize}
                      onChange={(e) => setNewFishSize(parseFloat(e.target.value))}
                      className="flex-1"
                    />
                    <input
                      type="number"
                      min="0.1"
                      max="3.0"
                      step="0.1"
                      value={newFishSize}
                      onChange={(e) => setNewFishSize(parseFloat(e.target.value) || 1.0)}
                      className="w-16 px-2 py-1 text-sm border border-primary-400/50 bg-slate-800/50 text-white rounded"
                    />
                    <span className="text-mono-small min-w-[35px] text-center">{newFishSize.toFixed(1)}x</span>
                  </div>
                </div>

                <div>
                  <label className="text-primary-300 font-black text-sm uppercase tracking-wider block mb-3">Sprite:</label>
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

                <div className="flex gap-3 pt-4">
                  <button 
                    className="px-6 py-3 border-2 font-black text-sm uppercase tracking-wider transition-all duration-200 ease-out cursor-pointer transform bg-primary-500 text-white border-primary-600 shadow-lg shadow-primary-500/50 hover:bg-primary-600 hover:text-white hover:border-primary-500 hover:-translate-y-1 hover:shadow-xl hover:shadow-primary-500/40 hover:scale-105 hover:-rotate-1 active:scale-95 flex-1" 
                    onClick={handleCreateFish}
                    disabled={isSyncing}
                  >
                    {isSyncing ? 'Creating...' : 'Create Fish'}
                  </button>
                  <button 
                    className="px-6 py-3 border-2 font-black text-sm uppercase tracking-wider transition-all duration-200 ease-out cursor-pointer transform bg-slate-800 text-primary-300 border-primary-400/50 hover:bg-primary-600 hover:text-white hover:border-primary-500 hover:-translate-y-1 hover:shadow-xl hover:shadow-primary-500/40 hover:scale-105 hover:-rotate-1 active:scale-95 flex-1" 
                    onClick={handleCancelCreation}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {selectedFish && (
            <div className="bg-slate-800/70 border-2 border-primary-400/40 p-3 hover:bg-slate-700/70 hover:border-primary-400/70 transition-all duration-200 transform hover:scale-[1.02]">
              <h3 className="text-primary-300 font-black text-base uppercase tracking-wider mb-4 text-center border-b-2 border-primary-400/30 pb-2">Edit {selectedFish.name || 'Fish'}</h3>
              
              <div className="section-content space-y-4">
                <label className="text-primary-300 font-black text-sm uppercase tracking-wider block">
                  Name:
                  <input
                    type="text"
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    placeholder="Enter fish name"
                    className="input-primary mt-2 w-full"
                  />
                </label>

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

                <div>
                  <label className="text-primary-300 font-black text-sm uppercase tracking-wider block mb-3">Size:</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min="0.1"
                      max="3.0"
                      step="0.1"
                      value={editingSize}
                      onChange={(e) => setEditingSize(parseFloat(e.target.value))}
                      className="flex-1"
                    />
                    <input
                      type="number"
                      min="0.1"
                      max="3.0"
                      step="0.1"
                      value={editingSize}
                      onChange={(e) => setEditingSize(parseFloat(e.target.value) || 1.0)}
                      className="w-16 px-2 py-1 text-sm border border-primary-400/50 bg-slate-800/50 text-white rounded"
                    />
                    <span className="text-mono-small min-w-[35px] text-center">{editingSize.toFixed(1)}x</span>
                  </div>
                </div>

                <div>
                  <label className="text-primary-300 font-black text-sm uppercase tracking-wider block mb-3">Sprite:</label>
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

                <div className="flex gap-3 pt-4">
                  <button 
                    className="px-6 py-3 border-2 font-black text-sm uppercase tracking-wider transition-all duration-200 ease-out cursor-pointer transform bg-primary-500 text-white border-primary-600 shadow-lg shadow-primary-500/50 hover:bg-primary-600 hover:text-white hover:border-primary-500 hover:-translate-y-1 hover:shadow-xl hover:shadow-primary-500/40 hover:scale-105 hover:-rotate-1 active:scale-95 flex-1" 
                    onClick={handleSaveChanges}
                    disabled={isSyncing}
                  >
                    {isSyncing ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button 
                    className="px-6 py-3 border-2 font-black text-sm uppercase tracking-wider transition-all duration-200 ease-out cursor-pointer transform bg-slate-800 text-primary-300 border-primary-400/50 hover:bg-primary-600 hover:text-white hover:border-primary-500 hover:-translate-y-1 hover:shadow-xl hover:shadow-primary-500/40 hover:scale-105 hover:-rotate-1 active:scale-95 flex-1" 
                    onClick={handleCancelEdit}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
    </CardComponent>
  );
}

export default FishEditor;
