import { useState, useEffect } from 'preact/hooks';
import { useAquariumStore } from '../stores/aquariumStore';
import { useUIStore } from '../stores/uiStore';
import CardComponent from './CardComponent';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Separator } from './ui/separator';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Slider } from './ui/slider';
import { Alert, AlertDescription } from './ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';

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
    cardBackgroundStyle,
    setBrutalistPrimaryColor,
    setBrutalistSecondaryColor,
    setCardBackgroundStyle
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
      title="⚙️ Aquarium Settings"
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
      <Tabs defaultValue="display" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 bg-slate-800/50 border border-slate-600">
          <TabsTrigger value="display" className="data-[state=active]:bg-slate-700 data-[state=active]:text-white">
            🖥️ Display
          </TabsTrigger>
          <TabsTrigger value="world" className="data-[state=active]:bg-slate-700 data-[state=active]:text-white">
            🌍 World
          </TabsTrigger>
          <TabsTrigger value="theme" className="data-[state=active]:bg-slate-700 data-[state=active]:text-white">
            🎨 Theme
          </TabsTrigger>
        </TabsList>

        <div className="min-h-[400px]">
          <TabsContent value="display" className="mt-0 space-y-6">
            {/* Current Zoom Status */}
            <Card className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-blue-500/20">
              <CardHeader>
                <CardTitle className="text-lg text-blue-300">Current Zoom Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">Current Zoom:</span>
                    <Badge variant="outline" className="text-blue-400 border-blue-400">
                      {zoomInfo.currentZoom}x ({zoomInfo.zoomPercentage}%)
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">Visible V-Tiles:</span>
                    <span className="text-sm font-medium text-white">{zoomInfo.visibleVerticalTiles}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">Zoom Range:</span>
                  <span className="text-sm font-medium text-white">{minZoom || 0.1}x - {maxZoom || 4.0}x</span>
                </div>
                <Button 
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  onClick={handleResetToDefaultZoom}
                >
                  Reset to Default Zoom
                </Button>
              </CardContent>
            </Card>

            {/* Zoom Boundaries */}
            <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/20">
              <CardHeader>
                <CardTitle className="text-lg text-purple-300">Zoom Boundaries</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">Custom Min Zoom:</span>
                    <Badge variant={minZoom ? "default" : "secondary"} className={minZoom ? "text-purple-300" : ""}>
                      {minZoom ? `${minZoom}x` : 'Not Set'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">Custom Max Zoom:</span>
                    <Badge variant={maxZoom ? "default" : "secondary"} className={maxZoom ? "text-purple-300" : ""}>
                      {maxZoom ? `${maxZoom}x` : 'Not Set'}
                    </Badge>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  <Button variant="outline" className="border-purple-500/50 hover:bg-purple-500/20" onClick={handleCaptureMinZoom}>
                    Capture Min Zoom
                  </Button>
                  <Button variant="outline" className="border-purple-500/50 hover:bg-purple-500/20" onClick={handleCaptureMaxZoom}>
                    Capture Max Zoom
                  </Button>
                  <Button variant="outline" className="border-purple-500/50 hover:bg-purple-500/20" onClick={handleClearZoomBoundaries}>
                    Clear Boundaries
                  </Button>
                </div>
                <Alert className="border-purple-500/50 bg-purple-500/10">
                  <AlertDescription className="text-sm text-gray-300">
                    Set your current zoom level as the minimum or maximum boundary. Once set, you won't be able to zoom beyond these limits.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>

            {/* Default Zoom Level */}
            <Card className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/20">
              <CardHeader>
                <CardTitle className="text-lg text-green-300">Default Zoom Level</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="defaultVisibleTiles" className="text-sm font-medium text-gray-200">
                    Default Visible Vertical Tiles
                  </Label>
                  <Input
                    id="defaultVisibleTiles"
                    type="number"
                    min="5"
                    max="50"
                    value={localValues.defaultVisibleVerticalTiles}
                    onChange={(e) => updateLocalValue('defaultVisibleVerticalTiles', parseInt((e.target as HTMLInputElement)?.value) || 0)}
                    className="bg-slate-800/50 border-green-500/50"
                  />
                </div>
                <Alert className="border-green-500/50 bg-green-500/10">
                  <AlertDescription className="text-sm text-gray-300">
                    Controls how many tiles you see vertically when the app opens. Currently: <Badge variant="outline" className="text-green-400 border-green-400">{localValues.defaultVisibleVerticalTiles}</Badge> tiles. Higher values = more tiles visible (smaller zoom).
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>
        
          <TabsContent value="world" className="mt-0 space-y-6">
            {/* Aquarium Size */}
            <Card className="bg-gradient-to-br from-orange-500/10 to-yellow-500/10 border-orange-500/20">
              <CardHeader>
                <CardTitle className="text-lg text-orange-300">Aquarium Size (Fixed 64px Tiles)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="horizontalTiles" className="text-sm font-medium text-gray-200">
                      Horizontal Tiles
                    </Label>
                    <Input
                      id="horizontalTiles"
                      type="number"
                      min="10"
                      max="1000"
                      value={localValues.tilesHorizontal}
                      onChange={(e) => updateLocalValue('tilesHorizontal', parseInt((e.target as HTMLInputElement)?.value) || 0)}
                      className="bg-slate-800/50 border-orange-500/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="verticalTiles" className="text-sm font-medium text-gray-200">
                      Vertical Tiles
                    </Label>
                    <Input
                      id="verticalTiles"
                      type="number"
                      min="10"
                      max="500"
                      value={localValues.tilesVertical}
                      onChange={(e) => updateLocalValue('tilesVertical', parseInt((e.target as HTMLInputElement)?.value) || 0)}
                      className="bg-slate-800/50 border-orange-500/50"
                    />
                  </div>
                </div>
                <Alert className="border-orange-500/50 bg-orange-500/10">
                  <AlertDescription className="text-sm text-gray-300">
                    Each tile is exactly 64 pixels. The aquarium size is defined by the number of tiles.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>

            {/* Preview */}
            <Card className="bg-gradient-to-br from-slate-500/10 to-gray-500/10 border-slate-500/20">
              <CardHeader>
                <CardTitle className="text-lg text-slate-300">World Preview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">World Size:</span>
                    <Badge variant="outline" className="text-slate-400 border-slate-400">
                      {localValues.tilesHorizontal} × {localValues.tilesVertical} tiles
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">World Dimensions:</span>
                    <Badge variant="outline" className="text-slate-400 border-slate-400">
                      {localValues.tilesHorizontal * 64} × {localValues.tilesVertical * 64}px
                    </Badge>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">Default Visible:</span>
                    <Badge variant="outline" className="text-slate-400 border-slate-400">
                      {localValues.defaultVisibleVerticalTiles} V-tiles
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">Tile Size:</span>
                    <Badge variant="outline" className="text-slate-400 border-slate-400">
                      64px (fixed)
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Navigation Controls */}
            <Card className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border-indigo-500/20">
              <CardHeader>
                <CardTitle className="text-lg text-indigo-300">Navigation Controls</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">Arrow Keys:</span>
                    <Badge variant="outline" className="text-indigo-400 border-indigo-400">
                      Move around (5 tiles/press)
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">+ / =:</span>
                    <Badge variant="outline" className="text-indigo-400 border-indigo-400">
                      Zoom in
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">-:</span>
                    <Badge variant="outline" className="text-indigo-400 border-indigo-400">
                      Zoom out
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="theme" className="mt-0 space-y-6">
            {/* Brutalist Panel Colors */}
            <Card className="bg-gradient-to-br from-pink-500/10 to-red-500/10 border-pink-500/20">
              <CardHeader>
                <CardTitle className="text-lg text-pink-300">Brutalist Panel Colors</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="primaryColor" className="text-sm font-medium text-gray-200">
                      Primary Color (Background)
                    </Label>
                    <div className="flex items-center gap-3">
                      <input
                        id="primaryColor"
                        type="color"
                        value={brutalistPrimaryColor}
                        onChange={(e) => setBrutalistPrimaryColor((e.target as HTMLInputElement)?.value)}
                        className="w-12 h-10 border-2 border-pink-500/50 rounded cursor-pointer"
                      />
                      <Badge variant="outline" className="text-pink-400 border-pink-400 font-mono">
                        {brutalistPrimaryColor}
                      </Badge>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="secondaryColor" className="text-sm font-medium text-gray-200">
                      Secondary Color (Border/Accent)
                    </Label>
                    <div className="flex items-center gap-3">
                      <input
                        id="secondaryColor"
                        type="color"
                        value={brutalistSecondaryColor}
                        onChange={(e) => setBrutalistSecondaryColor((e.target as HTMLInputElement)?.value)}
                        className="w-12 h-10 border-2 border-pink-500/50 rounded cursor-pointer"
                      />
                      <Badge variant="outline" className="text-pink-400 border-pink-400 font-mono">
                        {brutalistSecondaryColor}
                      </Badge>
                    </div>
                  </div>
                </div>
                
                <div className="mt-4">
                  <Label className="text-sm font-medium text-gray-200 mb-3 block">Preview</Label>
                  <div 
                    className="text-center py-6 px-6 font-black text-white rounded-lg" 
                    style={{
                      '--brutalist-primary': brutalistPrimaryColor,
                      '--brutalist-secondary': brutalistSecondaryColor,
                      background: 'var(--brutalist-primary)',
                      border: '4px solid var(--brutalist-secondary)',
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
                
                <Alert className="border-pink-500/50 bg-pink-500/10">
                  <AlertDescription className="text-sm text-gray-300">
                    Customize the colors for the brutalist UI panel. Changes apply immediately to the panel styling.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>

            {/* Card Background Style */}
            <Card className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border-cyan-500/20">
              <CardHeader>
                <CardTitle className="text-lg text-cyan-300">Card Background Style</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-200">Background Style</Label>
                    <div className="flex gap-2">
                      <button
                        className={`flex-1 px-3 py-2 rounded-lg border text-sm font-medium transition-all ${
                          cardBackgroundStyle === 'black-translucent'
                            ? 'bg-cyan-600 border-cyan-400 text-white shadow-lg'
                            : 'bg-slate-800/50 border-slate-600 text-gray-300 hover:bg-slate-700/50'
                        }`}
                        onClick={() => setCardBackgroundStyle('black-translucent')}
                      >
                        Black & Translucent
                      </button>
                      <button
                        className={`flex-1 px-3 py-2 rounded-lg border text-sm font-medium transition-all ${
                          cardBackgroundStyle === 'navy-blue'
                            ? 'bg-cyan-600 border-cyan-400 text-white shadow-lg'
                            : 'bg-slate-800/50 border-slate-600 text-gray-300 hover:bg-slate-700/50'
                        }`}
                        onClick={() => setCardBackgroundStyle('navy-blue')}
                      >
                        Solid Navy
                      </button>
                    </div>
                  </div>
                </div>

                <div className="mt-4">
                  <Label className="text-sm font-medium text-gray-200 mb-3 block">Preview</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <div
                      className="text-center py-4 px-4 rounded-lg border-2 font-medium transition-all"
                      style={{
                        background: cardBackgroundStyle === 'black-translucent' ? 'rgba(0, 0, 0, 0.8)' : 'rgb(15, 23, 42)',
                        borderColor: cardBackgroundStyle === 'black-translucent' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(59, 130, 246, 0.5)',
                        color: '#FFFFFF',
                      }}
                    >
                      {cardBackgroundStyle === 'black-translucent' ? 'BLACK' : 'NAVY'}
                    </div>
                    <div
                      className="text-center py-4 px-4 rounded-lg border-2 font-medium transition-all"
                      style={{
                        background: cardBackgroundStyle === 'black-translucent' ? 'rgba(17, 24, 39, 0.95)' : 'rgb(15, 23, 42)',
                        borderColor: cardBackgroundStyle === 'black-translucent' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(59, 130, 246, 0.5)',
                        color: '#FFFFFF',
                      }}
                    >
                      FULLSCREEN
                    </div>
                  </div>
                </div>

                <Alert className="border-cyan-500/50 bg-cyan-500/10">
                  <AlertDescription className="text-sm text-gray-300">
                    Choose between semi-transparent black or solid navy blue card backgrounds. Changes apply immediately to all card components.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>

            {/* Navigation Controls */}
            <Card className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border-indigo-500/20">
              <CardHeader>
                <CardTitle className="text-lg text-indigo-300">Navigation Controls</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">Arrow Keys:</span>
                    <Badge variant="outline" className="text-indigo-400 border-indigo-400">
                      Move around (5 tiles/press)
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">+ / =:</span>
                    <Badge variant="outline" className="text-indigo-400 border-indigo-400">
                      Zoom in
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">-:</span>
                    <Badge variant="outline" className="text-indigo-400 border-indigo-400">
                      Zoom out
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </div>

        <Separator className="my-4" />

        <div className="flex gap-4 justify-end">
          <Button 
            variant="outline"
            className="border-slate-600 hover:bg-slate-700"
            onClick={handleReset}
          >
            Reset
          </Button>
          <Button 
            className="bg-blue-600 hover:bg-blue-700"
            onClick={handleApply}
          >
            Apply Changes
          </Button>
        </div>
      </Tabs>
    </CardComponent>
  );
}

export default AquariumSettings;