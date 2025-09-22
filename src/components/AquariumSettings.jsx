import { useState, useEffect } from 'preact/hooks';
import { useAquariumStore } from '../stores/aquariumStore.js';
import Modal from './Modal.jsx';

function AquariumSettings({ isVisible, onClose }) {
  const {
    tilesHorizontal,
    tilesVertical,
    tileSize,
    sizeMode,
    targetVerticalTiles,
    defaultVisibleVerticalTiles,
    setTilesHorizontal,
    setTilesVertical,
    setTileSize,
    setSizeMode,
    setTargetVerticalTiles,
    setDefaultVisibleVerticalTiles
  } = useAquariumStore();
  
  const [localValues, setLocalValues] = useState({
    tilesHorizontal,
    tilesVertical,
    tileSize,
    targetVerticalTiles,
    defaultVisibleVerticalTiles
  });

  // Sync local state when store values change or modal opens
  useEffect(() => {
    if (isVisible) {
      setLocalValues({
        tilesHorizontal,
        tilesVertical,
        tileSize,
        targetVerticalTiles,
        defaultVisibleVerticalTiles
      });
    }
  }, [isVisible, tilesHorizontal, tilesVertical, tileSize, targetVerticalTiles, defaultVisibleVerticalTiles]);

  if (!isVisible) return null;

  const handleApply = () => {
    setTilesHorizontal(localValues.tilesHorizontal);
    setTilesVertical(localValues.tilesVertical);
    setTileSize(localValues.tileSize);
    setTargetVerticalTiles(localValues.targetVerticalTiles);
    setDefaultVisibleVerticalTiles(localValues.defaultVisibleVerticalTiles);
    onClose();
  };

  const handleReset = () => {
    setLocalValues({
      tilesHorizontal,
      tilesVertical,
      tileSize,
      targetVerticalTiles,
      defaultVisibleVerticalTiles
    });
  };

  const updateLocalValue = (key, value) => {
    setLocalValues(prev => ({ ...prev, [key]: value }));
  };

  return (
    <Modal 
      isVisible={isVisible} 
      onClose={onClose} 
      title="Aquarium Settings"
      size="medium"
      className="settings-modal"
    >
      <div className="settings-content">
          <div className="setting-group">
            <h3>Default View</h3>
            <div className="input-group">
              <label>
                Default Visible Vertical Tiles:
                <input
                  type="number"
                  min="5"
                  max="50"
                  value={localValues.defaultVisibleVerticalTiles}
                  onChange={(e) => updateLocalValue('defaultVisibleVerticalTiles', parseInt(e.target.value) || 0)}
                />
              </label>
            </div>
            <div className="info-text">
              <p>Controls how many tiles you see vertically when the app opens. Currently: {localValues.defaultVisibleVerticalTiles} tiles. Higher values = smaller tiles to fit more in view.</p>
            </div>
          </div>
          
          <div className="setting-group">
            <h3>Size Mode</h3>
            <div className="radio-group">
              <label>
                <input
                  type="radio"
                  name="sizeMode"
                  checked={sizeMode === 'fixed'}
                  onChange={() => setSizeMode('fixed')}
                />
                Fixed Tile Size
              </label>
              <label>
                <input
                  type="radio"
                  name="sizeMode"
                  checked={sizeMode === 'adaptive'}
                  onChange={() => setSizeMode('adaptive')}
                />
                Adaptive Tile Size
              </label>
            </div>
          </div>

          {sizeMode === 'fixed' && (
            <div className="setting-group">
              <h3>Fixed Size Settings</h3>
              <div className="input-group">
                <label>
                  Horizontal Tiles:
                  <input
                    type="number"
                    min="10"
                    max="1000"
                    value={localValues.tilesHorizontal}
                    onChange={(e) => updateLocalValue('tilesHorizontal', parseInt(e.target.value) || 0)}
                  />
                </label>
              </div>
              <div className="input-group">
                <label>
                  Vertical Tiles:
                  <input
                    type="number"
                    min="10"
                    max="500"
                    value={localValues.tilesVertical}
                    onChange={(e) => updateLocalValue('tilesVertical', parseInt(e.target.value) || 0)}
                  />
                </label>
              </div>
              <div className="input-group">
                <label>
                  Tile Size (pixels):
                  <input
                    type="number"
                    min="16"
                    max="128"
                    value={localValues.tileSize}
                    onChange={(e) => updateLocalValue('tileSize', parseInt(e.target.value) || 0)}
                  />
                </label>
              </div>
            </div>
          )}

          {sizeMode === 'adaptive' && (
            <div className="setting-group">
              <h3>Adaptive Size Settings</h3>
              <div className="input-group">
                <label>
                  Horizontal Tiles:
                  <input
                    type="number"
                    min="10"
                    max="1000"
                    value={localValues.tilesHorizontal}
                    onChange={(e) => updateLocalValue('tilesHorizontal', parseInt(e.target.value) || 0)}
                  />
                </label>
              </div>
              <div className="input-group">
                <label>
                  Vertical Tiles:
                  <input
                    type="number"
                    min="10"
                    max="500"
                    value={localValues.tilesVertical}
                    onChange={(e) => updateLocalValue('tilesVertical', parseInt(e.target.value) || 0)}
                  />
                </label>
              </div>
              <div className="input-group">
                <label>
                  Target Vertical Tiles in View:
                  <input
                    type="number"
                    min="5"
                    max="50"
                    value={localValues.targetVerticalTiles}
                    onChange={(e) => updateLocalValue('targetVerticalTiles', parseInt(e.target.value) || 0)}
                  />
                </label>
              </div>
              <div className="info-text">
                <p>In adaptive mode, the tile size will automatically adjust based on your viewport height to show approximately {localValues.targetVerticalTiles} tiles vertically.</p>
              </div>
            </div>
          )}

          <div className="setting-group preview">
            <h3>Preview</h3>
            <div className="preview-info">
              <p>World Size: {localValues.tilesHorizontal} × {localValues.tilesVertical} tiles</p>
              <p>Default Visible: {localValues.defaultVisibleVerticalTiles} vertical tiles on app start</p>
              {sizeMode === 'fixed' && (
                <p>World Dimensions: {localValues.tilesHorizontal * localValues.tileSize} × {localValues.tilesVertical * localValues.tileSize} pixels</p>
              )}
              {sizeMode === 'adaptive' && (
                <p>Tile size will adapt to viewport (16-128px range)</p>
              )}
            </div>
          </div>
        </div>

      <div className="settings-actions">
        <button className="reset-button" onClick={handleReset}>Reset</button>
        <button className="apply-button" onClick={handleApply}>Apply</button>
      </div>
    </Modal>
  );
}

export default AquariumSettings;
