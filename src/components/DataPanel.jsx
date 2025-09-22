import { useAquariumStore } from '../stores/aquariumStore.js';
import Collapsible from './Collapsible.jsx';

function DataPanel({ visibleCubes, fishInfo, viewportPosition, tileDimensions, isOpen, onToggle }) {
  const { showGrid, toggleGrid } = useAquariumStore();

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
