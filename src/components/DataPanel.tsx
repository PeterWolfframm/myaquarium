import { useAquariumStore } from '../stores/aquariumStore';
import CardComponent from './CardComponent';

function DataPanel({ visibleCubes, fishInfo, viewportPosition, tileDimensions, zoomInfo, aquarium, isOpen, onToggle, isDraggable = false, draggableId = null, draggablePosition = null }) {
  const { showGrid, toggleGrid } = useAquariumStore();

  const handleResetToDefaultZoom = () => {
    if (aquarium) {
      aquarium.setDefaultZoom();
    }
  };

  return (
    <CardComponent 
      title="📊 Stats"
      componentId="stats"
      isOpen={isOpen}
      onToggle={onToggle}
      defaultViewMode="sticky"
      position={isDraggable ? "static" : "top-right"}
      size="medium"
      className="stats-collapsible"
      hideWhenClosed={true}
      isDraggable={isDraggable}
      draggablePosition={draggablePosition}
    >
      <div className="card-content-stats">
        {/* Zoom Section */}
        <div className="section-primary">
          <div className="space-y-2 mb-4">
            <div className="grid-data-columns">
              <span className="text-label">Zoom:</span>
              <span className="text-value">{zoomInfo?.currentZoom || 1.0}x ({zoomInfo?.zoomPercentage || 100}%)</span>
            </div>
            <div className="grid-data-columns">
              <span className="text-label">V-Tiles:</span>
              <span className="text-value">{zoomInfo?.visibleVerticalTiles || 0}</span>
            </div>
            <div className="grid-data-columns">
              <span className="text-label">Range:</span>
              <span className="text-value">{zoomInfo?.minZoom || 0.1}x - {zoomInfo?.maxZoom || 4.0}x</span>
            </div>
          </div>
          <button 
            className="btn-action"
            onClick={handleResetToDefaultZoom}
          >
            Reset Zoom
          </button>
        </div>
        
        {/* Stats Grid */}
        <div className="grid-stats">
          <div className="section-secondary">
            <div className="text-label">
              Visible Cubes: <span className="text-value">{visibleCubes || 0}</span>
            </div>
          </div>
          
          <div className="section-secondary">
            <div className="text-label">
              Tiles: <span className="text-value">H:{tileDimensions?.horizontalTiles || 0} | V:{tileDimensions?.verticalTiles || 0} | T:{tileDimensions?.totalTiles || 0}</span>
            </div>
          </div>
          
          <div className="section-secondary">
            <div className="text-label">
              Fish: <span className="text-value">H:{fishInfo?.horizontalCount || 0} | V:{fishInfo?.verticalCount || 0} | T:{fishInfo?.total || 0}</span>
            </div>
          </div>
          
          <div className="section-secondary">
            <div className="text-label text-xs">
              Position: <span className="text-value">({viewportPosition?.tileX || 0}, {viewportPosition?.tileY || 0}) | {viewportPosition?.percentageX || 0}%H, {viewportPosition?.percentageY || 0}%V</span>
            </div>
          </div>
        </div>
        
        {/* Grid Toggle */}
        <div className="section-secondary">
          <label className="flex items-center gap-3 cursor-pointer">
            <input 
              type="checkbox" 
              checked={showGrid} 
              onChange={toggleGrid}
              className="checkbox-primary"
            />
            <span className="text-label select-none">Show Grid</span>
          </label>
        </div>
      </div>
    </CardComponent>
  );
}

export default DataPanel;