import { useAquariumStore } from '../stores/aquariumStore';
import CardComponent from './CardComponent';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card, CardContent } from './ui/card';
import { Separator } from './ui/separator';
import { Switch } from './ui/switch';
import { Label } from './ui/label';
import FishCountChart from './FishCountChart';
import FPSChart from './FPSChart';
import FPSTrackerStatus from './FPSTrackerStatus';

function DataPanel({ visibleCubes, fishInfo, viewportPosition, tileDimensions, zoomInfo, fps, aquarium, isOpen, onToggle, isDraggable = false, draggableId = null, draggablePosition = null }) {
  const { showGrid, toggleGrid } = useAquariumStore();

  const handleResetToDefaultZoom = () => {
    if (aquarium) {
      aquarium.setDefaultZoom();
    }
  };

  const handleSoftResetAquarium = () => {
    // First attempt: Try to properly destroy and reinitialize the aquarium
    if (aquarium && aquarium.destroy) {
      try {
        console.log('🔄 Attempting soft reset - destroying current aquarium instance...');
        aquarium.destroy();
        
        // Wait a brief moment then reload the page as fallback
        setTimeout(() => {
          console.log('🔄 Reloading page to complete soft reset...');
          window.location.reload();
        }, 100);
      } catch (error) {
        console.error('Error during soft reset, falling back to page reload:', error);
        window.location.reload();
      }
    } else {
      // If aquarium instance is not available, just reload
      console.log('🔄 Aquarium instance not available, reloading page...');
      window.location.reload();
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
      <div className="space-y-6">
        {/* Zoom Section */}
        <Card className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-blue-500/20">
          <CardContent className="p-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Zoom:</span>
                <Badge variant="outline" className="text-blue-400 border-blue-400">
                  {zoomInfo?.currentZoom || 1.0}x ({zoomInfo?.zoomPercentage || 100}%)
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">V-Tiles:</span>
                <span className="text-sm font-medium text-white">{zoomInfo?.visibleVerticalTiles || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Range:</span>
                <span className="text-sm font-medium text-white">{zoomInfo?.minZoom || 0.1}x - {zoomInfo?.maxZoom || 4.0}x</span>
              </div>
            </div>
            <Button 
              className="w-full mt-4 bg-blue-600 hover:bg-blue-700"
              onClick={handleResetToDefaultZoom}
            >
              Reset Zoom
            </Button>
          </CardContent>
        </Card>
        
        {/* Stats Grid */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Statistics</h3>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Visible Cubes:</span>
                <Badge variant="secondary" className="bg-green-500/20 text-green-300">
                  {visibleCubes || 0}
                </Badge>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Framerate:</span>
                <Badge variant="secondary" className="bg-purple-500/20 text-purple-300">
                  {fps || 0} FPS
                </Badge>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Tiles:</span>
                <div className="text-sm font-medium text-white">
                  H:{tileDimensions?.horizontalTiles || 0} | V:{tileDimensions?.verticalTiles || 0} | T:{tileDimensions?.totalTiles || 0}
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Fish:</span>
                <div className="text-sm font-medium text-white">
                  H:{fishInfo?.horizontalCount || 0} | V:{fishInfo?.verticalCount || 0} | T:{fishInfo?.total || 0}
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">Position:</span>
                <div className="text-xs font-medium text-white">
                  ({viewportPosition?.tileX || 0}, {viewportPosition?.tileY || 0}) | {viewportPosition?.percentageX || 0}%H, {viewportPosition?.percentageY || 0}%V
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* FPS Tracker Status */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Real-time Tracking</h3>
          <FPSTrackerStatus className="w-full" />
        </div>

        <Separator />

        {/* Performance Charts */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Performance History</h3>
          
          <div className="space-y-4">
            <FPSChart className="w-full" timeRange={360} showTimeRangeSelector={true} />
            <FishCountChart className="w-full" timeRange={6} />
          </div>
        </div>
        
        <Separator />
        
        {/* Grid Toggle */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="show-grid" className="text-sm font-medium text-gray-200">
                  Show Grid
                </Label>
                <p className="text-xs text-gray-400">Toggle grid overlay on aquarium</p>
              </div>
              <Switch
                id="show-grid"
                checked={showGrid}
                onCheckedChange={toggleGrid}
              />
            </div>
          </CardContent>
        </Card>
        
        {/* Soft Reset */}
        <Card className="bg-gradient-to-br from-red-500/10 to-orange-500/10 border-red-500/20">
          <CardContent className="p-4">
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-sm font-medium text-gray-200">
                  Aquarium Reset
                </Label>
                <p className="text-xs text-gray-400">Reset the entire aquarium by reloading</p>
              </div>
              <Button 
                className="w-full bg-red-600 hover:bg-red-700 border-red-500"
                onClick={handleSoftResetAquarium}
                variant="outline"
              >
                🔄 Soft Reset Aquarium
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </CardComponent>
  );
}

export default DataPanel;