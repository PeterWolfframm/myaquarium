import { useState, useEffect } from 'preact/hooks';
import { useAquariumStore } from '../stores/aquariumStore.js';
import Modal from './Modal.jsx';

function AquariumSettings({ isVisible, onClose, aquarium }) {
  const {
    tilesHorizontal,
    tilesVertical,
    defaultVisibleVerticalTiles,
    setTilesHorizontal,
    setTilesVertical,
    setDefaultVisibleVerticalTiles
  } = useAquariumStore();
  
  const [localValues, setLocalValues] = useState({
    tilesHorizontal,
    tilesVertical,
    defaultVisibleVerticalTiles
  });

  const [zoomInfo, setZoomInfo] = useState({
    currentZoom: 1.0,
    zoomPercentage: 100,
    visibleVerticalTiles: 0,
    defaultVisibleVerticalTiles: 20
  });

  // Sync local state when store values change or modal opens
  useEffect(() => {
    if (isVisible) {
      setLocalValues({
        tilesHorizontal,
        tilesVertical,
        defaultVisibleVerticalTiles
      });
    }
  }, [isVisible, tilesHorizontal, tilesVertical, defaultVisibleVerticalTiles]);

  // Update zoom info when modal is visible
  useEffect(() => {
    if (isVisible && aquarium) {
      const updateZoomInfo = () => {
        const info = aquarium.getZoomInfo();
        setZoomInfo(info);
      };
      
      updateZoomInfo();
      
      // Update zoom info periodically while modal is open
      const interval = setInterval(updateZoomInfo, 100);
      return () => clearInterval(interval);
    }
  }, [isVisible, aquarium]);

  if (!isVisible) return null;

  const handleApply = () => {
    setTilesHorizontal(localValues.tilesHorizontal);
    setTilesVertical(localValues.tilesVertical);
    setDefaultVisibleVerticalTiles(localValues.defaultVisibleVerticalTiles);
    onClose();
  };

  const handleReset = () => {
    setLocalValues({
      tilesHorizontal,
      tilesVertical,
      defaultVisibleVerticalTiles
    });
  };

  const updateLocalValue = (key, value) => {
    setLocalValues(prev => ({ ...prev, [key]: value }));
  };

  const handleResetToDefaultZoom = () => {
    if (aquarium) {
      aquarium.setDefaultZoom();
    }
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
          <h3>Current Zoom Status</h3>
          <div className="zoom-status">
            <div className="zoom-info-row">
              <span>Current Zoom:</span>
              <span className="zoom-value">{zoomInfo.currentZoom}x ({zoomInfo.zoomPercentage}%)</span>
            </div>
            <div className="zoom-info-row">
              <span>Visible Vertical Tiles:</span>
              <span className="zoom-value">{zoomInfo.visibleVerticalTiles}</span>
            </div>
            <div className="zoom-info-row">
              <span>Zoom Range:</span>
              <span className="zoom-value">{zoomInfo.minZoom}x - {zoomInfo.maxZoom}x</span>
            </div>
            <button className="reset-zoom-button" onClick={handleResetToDefaultZoom}>
              Reset to Default Zoom
            </button>
          </div>
        </div>

        <div className="setting-group">
          <h3>Default Zoom Level</h3>
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
            <p>Controls how many tiles you see vertically when the app opens. Currently: {localValues.defaultVisibleVerticalTiles} tiles. Higher values = more tiles visible (smaller zoom).</p>
          </div>
        </div>
        
        <div className="setting-group">
          <h3>Aquarium Size (Fixed 64px Tiles)</h3>
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
          <div className="info-text">
            <p>Each tile is exactly 64 pixels. The aquarium size is defined by the number of tiles.</p>
          </div>
        </div>

        <div className="setting-group preview">
          <h3>Preview</h3>
          <div className="preview-info">
            <p>World Size: {localValues.tilesHorizontal} × {localValues.tilesVertical} tiles</p>
            <p>World Dimensions: {localValues.tilesHorizontal * 64} × {localValues.tilesVertical * 64} pixels</p>
            <p>Default Visible: {localValues.defaultVisibleVerticalTiles} vertical tiles on app start</p>
            <p>Tile Size: 64px (fixed)</p>
          </div>
        </div>

        <div className="setting-group">
          <h3>Navigation Controls</h3>
          <div className="controls-info">
            <p><strong>Arrow Keys:</strong> Move around the aquarium (5 tiles per press)</p>
            <p><strong>+ / =:</strong> Zoom in</p>
            <p><strong>-:</strong> Zoom out</p>
            <p><strong>B:</strong> Toggle bubbles visibility</p>
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