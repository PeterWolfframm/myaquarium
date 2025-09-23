import { useAquariumStore } from '../stores/aquariumStore.js';
import Collapsible from './Collapsible.jsx';

function DataPanel({ visibleCubes, fishInfo, viewportPosition, tileDimensions, zoomInfo, aquarium, isOpen, onToggle }) {
  const { showGrid, toggleGrid } = useAquariumStore();

  const handleResetToDefaultZoom = () => {
    if (aquarium) {
      aquarium.setDefaultZoom();
    }
  };

  return (
    <Collapsible 
      title="📊 Stats"
      position="top-right"
      size="medium"
      isOpen={isOpen}
      onToggle={onToggle}
      className="stats-collapsible"
      hideWhenClosed={true}
    >
      <div className="data-section">
        <div className="zoom-section">
          <div className="zoom-info">
            <div className="zoom-line">
              <span className="zoom-label">Zoom:</span>
              <span className="zoom-value">{zoomInfo?.currentZoom || 1.0}x ({zoomInfo?.zoomPercentage || 100}%)</span>
            </div>
            <div className="zoom-line">
              <span className="zoom-label">Visible V-Tiles:</span>
              <span className="zoom-value">{zoomInfo?.visibleVerticalTiles || 0}</span>
            </div>
            <div className="zoom-line">
              <span className="zoom-label">Range:</span>
              <span className="zoom-value">{zoomInfo?.minZoom || 0.1}x - {zoomInfo?.maxZoom || 4.0}x</span>
            </div>
          </div>
          <button className="reset-zoom-compact-button" onClick={handleResetToDefaultZoom}>
            Reset Zoom
          </button>
        </div>
        
        <div className="cube-counter">
          Visible Cubes: {visibleCubes || 0}
        </div>
        <div className="tile-dimensions">
          <div className="tile-counts">
            Tiles - H: {tileDimensions?.horizontalTiles || 0} | V: {tileDimensions?.verticalTiles || 0} | Total: {tileDimensions?.totalTiles || 0}
          </div>
        </div>
        <div className="fish-info">
          <div className="fish-counts">
            Fish - H: {fishInfo?.horizontalCount || 0} | V: {fishInfo?.verticalCount || 0} | Total: {fishInfo?.total || 0}
          </div>
        </div>
        <div className="viewport-info">
          <div className="viewport-position">
            Position: Tile ({viewportPosition?.tileX || 0}, {viewportPosition?.tileY || 0}) | 
            {viewportPosition?.percentageX || 0}% H, {viewportPosition?.percentageY || 0}% V
          </div>
        </div>
        <div className="grid-toggle">
          <label className="grid-toggle-label">
            <input 
              type="checkbox" 
              checked={showGrid} 
              onChange={toggleGrid}
              className="grid-toggle-checkbox"
            />
            <span className="grid-toggle-text">Show Grid</span>
          </label>
        </div>
      </div>
    </Collapsible>
  );
}

export default DataPanel;