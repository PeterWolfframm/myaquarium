import { useState, useEffect } from 'preact/hooks';
import { useAquariumStore } from '../stores/aquariumStore';
import { useUIStore } from '../stores/uiStore';
import CardComponent from './CardComponent';

function AquariumSettings({ 
  isOpen, 
  onToggle, 
  aquarium, 
  isDraggable = false, 
  draggableId = null, 
  draggablePosition = null 
}: { 
  isOpen: boolean; 
  onToggle: () => void; 
  aquarium: any;
  isDraggable?: boolean;
  draggableId?: string | null;
  draggablePosition?: { x: number; y: number } | null;
}) {
  const {
    tilesHorizontal,
    tilesVertical,
    defaultVisibleVerticalTiles,
    minZoom,
    maxZoom,
    setTilesHorizontal,
    setTilesVertical,
    setDefaultVisibleVerticalTiles,
    setMinZoom,
    setMaxZoom
  } = useAquariumStore();
  
  const {
    brutalistPrimaryColor,
    brutalistSecondaryColor,
    setBrutalistPrimaryColor,
    setBrutalistSecondaryColor
  } = useUIStore();
  
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
    if (isOpen) {
      setLocalValues({
        tilesHorizontal,
        tilesVertical,
        defaultVisibleVerticalTiles
      });
    }
  }, [isOpen, tilesHorizontal, tilesVertical, defaultVisibleVerticalTiles]);

  // Update zoom info when modal is visible
  useEffect(() => {
    if (isOpen && aquarium) {
      const updateZoomInfo = () => {
        const info = aquarium.getZoomInfo();
        setZoomInfo(info);
      };
      
      updateZoomInfo();
      
      // Update zoom info periodically while modal is open
      const interval = setInterval(updateZoomInfo, 100);
      return () => clearInterval(interval);
    }
  }, [isOpen, aquarium]);

  // Remove early return - CardComponent handles visibility

  const handleApply = () => {
    setTilesHorizontal(localValues.tilesHorizontal);
    setTilesVertical(localValues.tilesVertical);
    setDefaultVisibleVerticalTiles(localValues.defaultVisibleVerticalTiles);
    onToggle(); // Close the settings
  };

  const handleReset = () => {
    setLocalValues({
      tilesHorizontal,
      tilesVertical,
      defaultVisibleVerticalTiles
    });
  };

  const updateLocalValue = (key: string, value: any) => {
    setLocalValues(prev => ({ ...prev, [key]: value }));
  };

  const handleResetToDefaultZoom = () => {
    if (aquarium) {
      aquarium.setDefaultZoom();
    }
  };

  const handleCaptureMinZoom = () => {
    if (aquarium) {
      const currentZoom = aquarium.currentZoomLevel;
      setMinZoom(Math.round(currentZoom * 100) / 100); // Round to 2 decimals
    }
  };

  const handleCaptureMaxZoom = () => {
    if (aquarium) {
      const currentZoom = aquarium.currentZoomLevel;
      setMaxZoom(Math.round(currentZoom * 100) / 100); // Round to 2 decimals
    }
  };

  const handleClearZoomBoundaries = () => {
    setMinZoom(null);
    setMaxZoom(null);
  };

  return (
    <CardComponent 
      title="Aquarium Settings"
      componentId={draggableId || "settings"}
      isOpen={isOpen}
      onToggle={onToggle}
      defaultViewMode={isDraggable ? "sticky" : "fullscreen"}
      position={isDraggable ? "static" : "center"}
      size="medium"
      className="settings-modal"
      hideWhenClosed={true}
      isDraggable={isDraggable}
      draggablePosition={draggablePosition}
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
              <span className="zoom-value">{minZoom || 0.1}x - {maxZoom || 4.0}x</span>
            </div>
            <button className="reset-zoom-button" onClick={handleResetToDefaultZoom}>
              Reset to Default Zoom
            </button>
          </div>
        </div>

        <div className="setting-group">
          <h3>Zoom Boundaries</h3>
          <div className="zoom-boundaries">
            <div className="zoom-boundary-status">
              <div className="zoom-info-row">
                <span>Custom Min Zoom:</span>
                <span className="zoom-value">{minZoom ? `${minZoom}x` : 'Not Set'}</span>
              </div>
              <div className="zoom-info-row">
                <span>Custom Max Zoom:</span>
                <span className="zoom-value">{maxZoom ? `${maxZoom}x` : 'Not Set'}</span>
              </div>
            </div>
            <div className="zoom-boundary-controls">
              <button className="capture-zoom-button capture-min" onClick={handleCaptureMinZoom}>
                Capture Min Zoom
              </button>
              <button className="capture-zoom-button capture-max" onClick={handleCaptureMaxZoom}>
                Capture Max Zoom
              </button>
              <button className="clear-boundaries-button" onClick={handleClearZoomBoundaries}>
                Clear Boundaries
              </button>
            </div>
            <div className="info-text">
              <p>Set your current zoom level as the minimum or maximum boundary. Once set, you won't be able to zoom beyond these limits.</p>
            </div>
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
                onChange={(e) => updateLocalValue('defaultVisibleVerticalTiles', parseInt((e.target as HTMLInputElement)?.value) || 0)}
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
                onChange={(e) => updateLocalValue('tilesHorizontal', parseInt((e.target as HTMLInputElement)?.value) || 0)}
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
                onChange={(e) => updateLocalValue('tilesVertical', parseInt((e.target as HTMLInputElement)?.value) || 0)}
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
          <h3>Brutalist Panel Colors</h3>
          <div className="brutalist-color-settings">
            <div className="input-group">
              <label>
                Primary Color (Background):
                <div className="color-input-container">
                  <input
                    type="color"
                    value={brutalistPrimaryColor}
                    onChange={(e) => setBrutalistPrimaryColor((e.target as HTMLInputElement)?.value)}
                    className="color-picker"
                  />
                  <span className="color-value">{brutalistPrimaryColor}</span>
                </div>
              </label>
            </div>
            <div className="input-group">
              <label>
                Secondary Color (Border/Accent):
                <div className="color-input-container">
                  <input
                    type="color"
                    value={brutalistSecondaryColor}
                    onChange={(e) => setBrutalistSecondaryColor((e.target as HTMLInputElement)?.value)}
                    className="color-picker"
                  />
                  <span className="color-value">{brutalistSecondaryColor}</span>
                </div>
              </label>
            </div>
            <div className="color-preview">
              <div 
                className="brutalist-preview" 
                style={{
                  '--brutalist-primary': brutalistPrimaryColor,
                  '--brutalist-secondary': brutalistSecondaryColor,
                  background: 'var(--brutalist-primary)',
                  border: '4px solid var(--brutalist-secondary)',
                  borderRadius: '0',
                  padding: '10px',
                  color: '#FFFFFF',
                  fontWeight: 'bold',
                  textAlign: 'center',
                  textShadow: '1px 1px 0 #000000',
                  boxShadow: '4px 4px 0 #000000'
                }}
              >
                BRUTALIST PREVIEW
              </div>
            </div>
            <div className="info-text">
              <p>Customize the colors for the brutalist UI panel. Changes apply immediately to the panel styling.</p>
            </div>
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
    </CardComponent>
  );
}

export default AquariumSettings;