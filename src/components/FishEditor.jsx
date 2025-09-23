import { useState, useEffect } from 'preact/hooks';
import { useFishStore } from '../stores/fishStore.js';
import Modal from './Modal.jsx';
import SpriteGallery from './SpriteGallery.jsx';

function FishEditor({ isVisible, onClose }) {
  const { 
    fish, 
    updateFish, 
    removeFish, 
    isLoading, 
    isSyncing,
    syncError,
    clearSyncError 
  } = useFishStore();
  
  const [selectedFish, setSelectedFish] = useState(null);
  const [editingColor, setEditingColor] = useState('');
  const [editingName, setEditingName] = useState('');
  const [editingSpriteUrl, setEditingSpriteUrl] = useState(null);

  // Reset when modal opens/closes
  useEffect(() => {
    if (isVisible) {
      setSelectedFish(null);
      setEditingColor('');
      setEditingName('');
      setEditingSpriteUrl(null);
      clearSyncError();
    }
  }, [isVisible, clearSyncError]);

  if (!isVisible) return null;

  const handleFishSelect = (fishData) => {
    setSelectedFish(fishData);
    setEditingColor(fishData.color || '4CAF50');
    setEditingName(fishData.name || '');
    setEditingSpriteUrl(fishData.spriteUrl || null);
  };

  const handleSaveChanges = async () => {
    if (!selectedFish) return;

    const updates = {
      color: editingColor.replace('#', ''), // Remove # if present
      name: editingName || selectedFish.name,
      sprite_url: editingSpriteUrl
    };

    const success = await updateFish(selectedFish.id, updates);
    if (success) {
      setSelectedFish(null);
      setEditingColor('');
      setEditingName('');
      setEditingSpriteUrl(null);
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
      }
    }
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
            <h3>Your Fish ({fish.length})</h3>
            {isLoading ? (
              <div className="loading">Loading fish...</div>
            ) : (
              <div className="fish-grid">
                {fish.map((fishData) => (
                  <div 
                    key={fishData.id} 
                    className={`fish-item ${selectedFish?.id === fishData.id ? 'selected' : ''}`}
                    onClick={() => handleFishSelect(fishData)}
                  >
                    <div 
                      className="fish-color-preview" 
                      style={{ backgroundColor: `#${fishData.color}` }}
                    ></div>
                    <div className="fish-info">
                      <div className="fish-name">{fishData.name || 'Unnamed'}</div>
                      <div className="fish-color">#{fishData.color}</div>
                      {fishData.spriteUrl && <div className="fish-sprite-indicator">🖼️ Custom Sprite</div>}
                    </div>
                    <button 
                      className="delete-fish-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteFish(fishData.id);
                      }}
                    >
                      🗑️
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

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
                <label>Sprite:</label>
                <SpriteGallery
                  selectedSpriteUrl={editingSpriteUrl}
                  onSpriteSelect={setEditingSpriteUrl}
                  onUploadComplete={(result) => {
                    console.log('Sprite uploaded:', result);
                  }}
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
                  onClick={() => {
                    setSelectedFish(null);
                    setEditingColor('');
                    setEditingName('');
                    setEditingSpriteUrl(null);
                  }}
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
