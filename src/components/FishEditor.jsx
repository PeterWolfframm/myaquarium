import { useState, useEffect } from 'preact/hooks';
import { useFishStore } from '../stores/fishStore.js';
import { useAquariumStore } from '../stores/aquariumStore.js';
import Modal from './Modal.jsx';
import SpriteGallery from './SpriteGallery.jsx';

function FishEditor({ isVisible, onClose }) {
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
  const [newFishSpriteUrl, setNewFishSpriteUrl] = useState(null);
  const [newFishSize, setNewFishSize] = useState(1.0);

  // Reset when modal opens/closes
  useEffect(() => {
    if (isVisible) {
      setSelectedFish(null);
      setEditingColor('');
      setEditingName('');
      setEditingSpriteUrl(null);
      setEditingSize(1.0);
      setIsCreating(false);
      setNewFishName('');
      setNewFishColor('4CAF50');
      setNewFishSpriteUrl(null);
      setNewFishSize(1.0);
      clearSyncError();
    }
  }, [isVisible, clearSyncError]);

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

  if (!isVisible) return null;

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
      setNewFishSpriteUrl(null);
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
    setIsCreating(true);
  };

  const handleCancelCreation = () => {
    setIsCreating(false);
    setNewFishName('');
    setNewFishColor('4CAF50');
    setNewFishSpriteUrl(null);
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
    <Modal 
      isVisible={isVisible} 
      onClose={onClose} 
      title="Fish Editor"
      size="large"
      className="fish-editor-modal"
    >
      {syncError && (
        <div className="error-message">
          Error: {syncError}
          <button onClick={clearSyncError}>×</button>
        </div>
      )}
      
      <div className="fish-editor-content">
          <div className="fish-list">
            <div className="fish-list-header">
              <h3>Your Fish ({fish.length})</h3>
              <button 
                className="create-fish-button"
                onClick={handleStartCreating}
                disabled={isSyncing}
              >
                + Create New Fish
              </button>
            </div>
            {isLoading ? (
              <div className="loading">Loading fish...</div>
            ) : (
              <div className="fish-grid">
                {fish.map((fishData) => (
                  <div 
                    key={fishData.id} 
                    className={`fish-item ${selectedFish?.id === fishData.id ? 'selected' : ''} ${isSyncing ? 'syncing' : ''}`}
                    onClick={() => handleFishSelect(fishData)}
                  >
                    <div 
                      className="fish-color-preview" 
                      style={{ backgroundColor: `#${fishData.color}` }}
                    ></div>
                    <div className="fish-info">
                      <div className="fish-name">{fishData.name || 'Unnamed'}</div>
                      <div className="fish-color">#{fishData.color}</div>
                      <div className="fish-size">Size: {(fishData.size || 1.0).toFixed(1)}x</div>
                      {(fishData.spriteUrl || fishData.sprite_url) && <div className="fish-sprite-indicator">🖼️ Custom Sprite</div>}
                    </div>
                    <button 
                      className="delete-fish-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteFish(fishData.id);
                      }}
                      disabled={isSyncing}
                    >
                      🗑️
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {isCreating && (
            <div className="fish-creator-form">
              <h3>Create New Fish</h3>
              
              <div className="form-group">
                <label>Name:</label>
                <input
                  type="text"
                  value={newFishName}
                  onChange={(e) => setNewFishName(e.target.value)}
                  placeholder="Enter fish name"
                />
              </div>

              <div className="form-group">
                <label>Color:</label>
                <div className="color-input-group">
                  <input
                    type="color"
                    value={`#${newFishColor}`}
                    onChange={(e) => setNewFishColor(e.target.value.replace('#', ''))}
                  />
                  <input
                    type="text"
                    value={newFishColor}
                    onChange={(e) => setNewFishColor(e.target.value.replace('#', ''))}
                    placeholder="FF0000"
                    maxLength={6}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Preset Colors:</label>
                <div className="color-presets">
                  {presetColors.map((color) => (
                    <button
                      key={color}
                      className="color-preset"
                      style={{ backgroundColor: `#${color}` }}
                      onClick={() => setNewFishColor(color)}
                      title={`#${color}`}
                    />
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label>Size:</label>
                <div className="size-input-group">
                  <input
                    type="range"
                    min="0.1"
                    max="3.0"
                    step="0.1"
                    value={newFishSize}
                    onChange={(e) => setNewFishSize(parseFloat(e.target.value))}
                    className="size-slider"
                  />
                  <input
                    type="number"
                    min="0.1"
                    max="3.0"
                    step="0.1"
                    value={newFishSize}
                    onChange={(e) => setNewFishSize(parseFloat(e.target.value) || 1.0)}
                    className="size-number-input"
                  />
                  <span className="size-label">{newFishSize.toFixed(1)}x</span>
                </div>
              </div>

              <div className="form-group">
                <label>Sprite:</label>
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

              <div className="form-actions">
                <button 
                  className="save-button" 
                  onClick={handleCreateFish}
                  disabled={isSyncing}
                >
                  {isSyncing ? 'Creating...' : 'Create Fish'}
                </button>
                <button 
                  className="cancel-button" 
                  onClick={handleCancelCreation}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {selectedFish && (
            <div className="fish-editor-form">
              <h3>Edit {selectedFish.name || 'Fish'}</h3>
              
              <div className="form-group">
                <label>Name:</label>
                <input
                  type="text"
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  placeholder="Enter fish name"
                />
              </div>

              <div className="form-group">
                <label>Color:</label>
                <div className="color-input-group">
                  <input
                    type="color"
                    value={`#${editingColor}`}
                    onChange={(e) => setEditingColor(e.target.value.replace('#', ''))}
                  />
                  <input
                    type="text"
                    value={editingColor}
                    onChange={(e) => setEditingColor(e.target.value.replace('#', ''))}
                    placeholder="FF0000"
                    maxLength={6}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Preset Colors:</label>
                <div className="color-presets">
                  {presetColors.map((color) => (
                    <button
                      key={color}
                      className="color-preset"
                      style={{ backgroundColor: `#${color}` }}
                      onClick={() => setEditingColor(color)}
                      title={`#${color}`}
                    />
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label>Size:</label>
                <div className="size-input-group">
                  <input
                    type="range"
                    min="0.1"
                    max="3.0"
                    step="0.1"
                    value={editingSize}
                    onChange={(e) => setEditingSize(parseFloat(e.target.value))}
                    className="size-slider"
                  />
                  <input
                    type="number"
                    min="0.1"
                    max="3.0"
                    step="0.1"
                    value={editingSize}
                    onChange={(e) => setEditingSize(parseFloat(e.target.value) || 1.0)}
                    className="size-number-input"
                  />
                  <span className="size-label">{editingSize.toFixed(1)}x</span>
                </div>
              </div>

              <div className="form-group">
                <label>Sprite:</label>
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

              <div className="form-actions">
                <button 
                  className="save-button" 
                  onClick={handleSaveChanges}
                  disabled={isSyncing}
                >
                  {isSyncing ? 'Saving...' : 'Save Changes'}
                </button>
                <button 
                  className="cancel-button" 
                  onClick={handleCancelEdit}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
    </Modal>
  );
}

export default FishEditor;
