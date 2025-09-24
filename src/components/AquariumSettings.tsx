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
      <div className="card-content-stats space-y-6">
        {/* Current Zoom Status */}
        <div className="section-primary">
          <h3 className="text-section-title">Current Zoom Status</h3>
          <div className="grid-stats">
            <div className="section-content">
              <div className="grid-data-columns">
                <span className="text-label">Current Zoom:</span>
                <span className="text-value">{zoomInfo.currentZoom}x ({zoomInfo.zoomPercentage}%)</span>
              </div>
            </div>
            <div className="section-content">
              <div className="grid-data-columns">
                <span className="text-label">Visible V-Tiles:</span>
                <span className="text-value">{zoomInfo.visibleVerticalTiles}</span>
              </div>
            </div>
            <div className="section-content">
              <div className="grid-data-columns">
                <span className="text-label">Zoom Range:</span>
                <span className="text-value">{minZoom || 0.1}x - {maxZoom || 4.0}x</span>
              </div>
            </div>
          </div>
          <button 
            className="btn-action mt-4"
            onClick={handleResetToDefaultZoom}
          >
            Reset to Default Zoom
          </button>
        </div>

        {/* Zoom Boundaries */}
        <div className="section-secondary">
          <h3 className="text-section-title">Zoom Boundaries</h3>
          <div className="grid-stats mb-4">
            <div className="section-content">
              <div className="grid-data-columns">
                <span className="text-label">Custom Min Zoom:</span>
                <span className="text-value">{minZoom ? `${minZoom}x` : 'Not Set'}</span>
              </div>
            </div>
            <div className="section-content">
              <div className="grid-data-columns">
                <span className="text-label">Custom Max Zoom:</span>
                <span className="text-value">{maxZoom ? `${maxZoom}x` : 'Not Set'}</span>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-2 mb-4">
            <button className="btn-secondary" onClick={handleCaptureMinZoom}>
              Capture Min Zoom
            </button>
            <button className="btn-secondary" onClick={handleCaptureMaxZoom}>
              Capture Max Zoom
            </button>
            <button className="btn-secondary" onClick={handleClearZoomBoundaries}>
              Clear Boundaries
            </button>
          </div>
          <div className="section-content">
            <p className="text-sm text-slate-300">Set your current zoom level as the minimum or maximum boundary. Once set, you won't be able to zoom beyond these limits.</p>
          </div>
        </div>

        {/* Default Zoom Level */}
        <div className="section-secondary">
          <h3 className="text-section-title">Default Zoom Level</h3>
          <div className="section-content space-y-3">
            <label className="text-label block">
              Default Visible Vertical Tiles:
              <input
                type="number"
                min="5"
                max="50"
                value={localValues.defaultVisibleVerticalTiles}
                onChange={(e) => updateLocalValue('defaultVisibleVerticalTiles', parseInt((e.target as HTMLInputElement)?.value) || 0)}
                className="input-primary mt-2 w-full"
              />
            </label>
            <p className="text-sm text-slate-300">Controls how many tiles you see vertically when the app opens. Currently: {localValues.defaultVisibleVerticalTiles} tiles. Higher values = more tiles visible (smaller zoom).</p>
          </div>
        </div>
        
        {/* Aquarium Size */}
        <div className="section-secondary">
          <h3 className="text-section-title">Aquarium Size (Fixed 64px Tiles)</h3>
          <div className="section-content space-y-4">
            <label className="text-label block">
              Horizontal Tiles:
              <input
                type="number"
                min="10"
                max="1000"
                value={localValues.tilesHorizontal}
                onChange={(e) => updateLocalValue('tilesHorizontal', parseInt((e.target as HTMLInputElement)?.value) || 0)}
                className="input-primary mt-2 w-full"
              />
            </label>
            <label className="text-label block">
              Vertical Tiles:
              <input
                type="number"
                min="10"
                max="500"
                value={localValues.tilesVertical}
                onChange={(e) => updateLocalValue('tilesVertical', parseInt((e.target as HTMLInputElement)?.value) || 0)}
                className="input-primary mt-2 w-full"
              />
            </label>
            <p className="text-sm text-slate-300">Each tile is exactly 64 pixels. The aquarium size is defined by the number of tiles.</p>
          </div>
        </div>

        {/* Preview */}
        <div className="section-tertiary">
          <h3 className="text-section-title">Preview</h3>
          <div className="section-content space-y-2">
            <p className="text-sm text-slate-300">World Size: <span className="text-value">{localValues.tilesHorizontal} × {localValues.tilesVertical}</span> tiles</p>
            <p className="text-sm text-slate-300">World Dimensions: <span className="text-value">{localValues.tilesHorizontal * 64} × {localValues.tilesVertical * 64}</span> pixels</p>
            <p className="text-sm text-slate-300">Default Visible: <span className="text-value">{localValues.defaultVisibleVerticalTiles}</span> vertical tiles on app start</p>
            <p className="text-sm text-slate-300">Tile Size: <span className="text-value">64px</span> (fixed)</p>
          </div>
        </div>

        {/* Brutalist Panel Colors */}
        <div className="section-secondary">
          <h3 className="text-section-title">Brutalist Panel Colors</h3>
          <div className="section-content space-y-4">
            <label className="text-label block">
              Primary Color (Background):
              <div className="flex items-center gap-3 mt-2">
                <input
                  type="color"
                  value={brutalistPrimaryColor}
                  onChange={(e) => setBrutalistPrimaryColor((e.target as HTMLInputElement)?.value)}
                  className="w-12 h-8 border-2 border-primary-400/50 rounded cursor-pointer"
                />
                <span className="text-mono-small bg-slate-800/50 px-3 py-1 rounded border border-primary-400/30">{brutalistPrimaryColor}</span>
              </div>
            </label>
            <label className="text-label block">
              Secondary Color (Border/Accent):
              <div className="flex items-center gap-3 mt-2">
                <input
                  type="color"
                  value={brutalistSecondaryColor}
                  onChange={(e) => setBrutalistSecondaryColor((e.target as HTMLInputElement)?.value)}
                  className="w-12 h-8 border-2 border-primary-400/50 rounded cursor-pointer"
                />
                <span className="text-mono-small bg-slate-800/50 px-3 py-1 rounded border border-primary-400/30">{brutalistSecondaryColor}</span>
              </div>
            </label>
            <div className="section-content">
              <div 
                className="text-center py-4 px-6 font-black text-white" 
                style={{
                  '--brutalist-primary': brutalistPrimaryColor,
                  '--brutalist-secondary': brutalistSecondaryColor,
                  background: 'var(--brutalist-primary)',
                  border: '4px solid var(--brutalist-secondary)',
                  borderRadius: '0',
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
            <p className="text-sm text-slate-300">Customize the colors for the brutalist UI panel. Changes apply immediately to the panel styling.</p>
          </div>
        </div>

        {/* Navigation Controls */}
        <div className="section-tertiary">
          <h3 className="text-section-title">Navigation Controls</h3>
          <div className="section-content space-y-2">
            <p className="text-sm text-slate-300"><span className="text-label-large">Arrow Keys:</span> Move around the aquarium (5 tiles per press)</p>
            <p className="text-sm text-slate-300"><span className="text-label-large">+ / =:</span> Zoom in</p>
            <p className="text-sm text-slate-300"><span className="text-label-large">-:</span> Zoom out</p>
            <p className="text-sm text-slate-300"><span className="text-label-large">B:</span> Toggle bubbles visibility</p>
          </div>
        </div>
      </div>

      <div className="flex gap-4 justify-end pt-6 border-t-4 border-primary-400/50">
        <button 
          className="btn-secondary-enhanced"
          onClick={handleReset}
        >
          Reset
        </button>
        <button 
          className="btn-primary-enhanced"
          onClick={handleApply}
        >
          Apply
        </button>
      </div>
    </CardComponent>
  );
}

export default AquariumSettings;