import { useState } from 'preact/hooks';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { Progress } from './ui/progress';
import { Switch } from './ui/switch';
import { Slider } from './ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Separator } from './ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from './ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from './ui/pagination';
import { useToast } from '@/hooks/use-toast';
import CardComponent from './CardComponent';
import { cn } from '@/lib/utils';
import CombinedPerformanceChart from './CombinedPerformanceChart';
import FishCountChart from './FishCountChart';
import FPSChart from './FPSChart';

/**
 * CardDesignShowcase2 Component
 * 
 * A modern UI showcase demonstrating potential designs using shadcn/ui patterns.
 * This showcases clean, production-ready interface patterns that could be implemented.
 */
function CardDesignShowcase2({ 
  isOpen, 
  onToggle, 
  isDraggable = false, 
  draggablePosition = null 
}: {
  isOpen: boolean;
  onToggle: () => void;
  isDraggable?: boolean;
  draggablePosition?: { x: number; y: number } | null;
}) {
  const [selectedTab, setSelectedTab] = useState('dashboard');
  const [autoFeed, setAutoFeed] = useState(true);
  const [notifications, setNotifications] = useState(true);
  const [temperature, setTemperature] = useState([24]);
  const [selectedFishType, setSelectedFishType] = useState('all');
  const [fishViewMode, setFishViewMode] = useState('gallery');
  const [currentPage, setCurrentPage] = useState(1);
  const [feedingSchedule, setFeedingSchedule] = useState('every-8h');
  const { toast } = useToast();
  
  const [notificationsList, setNotificationsList] = useState([
    { id: 1, title: 'Fish fed successfully', time: '2 mins ago', type: 'success' },
    { id: 2, title: 'Water temperature optimal', time: '5 mins ago', type: 'info' },
    { id: 3, title: 'Cleaning reminder', time: '1 hour ago', type: 'warning' }
  ]);

  const [fishStats] = useState({
    totalFish: 12,
    healthyFish: 11,
    feedingSchedule: 'On track',
    waterQuality: 'Excellent',
    waterQualityPercent: 92,
    fishHealthPercent: 91.7,
    feedingSchedulePercent: 88
  });

  // Mock fish data for future-ready components
  const [fishCollection] = useState([
    { id: 1, name: 'Nemo', type: 'Clownfish', health: 95, age: '6 months', feeding: 'Normal' },
    { id: 2, name: 'Dory', type: 'Blue Tang', health: 88, age: '1 year', feeding: 'Light' },
    { id: 3, name: 'Shark', type: 'Shark', health: 98, age: '2 years', feeding: 'Heavy' },
    { id: 4, name: 'Goldie', type: 'Goldfish', health: 91, age: '8 months', feeding: 'Normal' },
    { id: 5, name: 'Angel', type: 'Angelfish', health: 85, age: '5 months', feeding: 'Light' },
    { id: 6, name: 'Tetra', type: 'Neon Tetra', health: 93, age: '3 months', feeding: 'Normal' },
    { id: 7, name: 'Beta', type: 'Betta Fish', health: 97, age: '7 months', feeding: 'Normal' },
    { id: 8, name: 'Guppy', type: 'Guppy', health: 89, age: '4 months', feeding: 'Light' }
  ]);

  const fishTypes = ['all', 'Clownfish', 'Blue Tang', 'Shark', 'Goldfish', 'Angelfish', 'Neon Tetra', 'Betta Fish', 'Guppy'];
  const itemsPerPage = 4;
  const totalPages = Math.ceil(fishCollection.length / itemsPerPage);
  
  const filteredFish = selectedFishType === 'all' 
    ? fishCollection 
    : fishCollection.filter(fish => fish.type === selectedFishType);
  
  const paginatedFish = filteredFish.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: '🏠' },
    { id: 'fish', label: 'Fish', icon: '🐠' },
    { id: 'analytics', label: 'Analytics', icon: '📊' },
    { id: 'settings', label: 'Settings', icon: '⚙️' }
  ];

  const renderDashboard = () => (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-blue-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Total Fish</p>
                <div className="flex items-center gap-2">
                  <p className="text-2xl font-bold text-blue-400">{fishStats.totalFish}</p>
                  <Badge variant="secondary" className="bg-blue-500/20 text-blue-300">
                    Active
                  </Badge>
                </div>
              </div>
              <Avatar className="h-12 w-12">
                <AvatarFallback className="bg-blue-500/20 text-blue-400">🐠</AvatarFallback>
              </Avatar>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Healthy</p>
                <div className="flex items-center gap-2">
                  <p className="text-2xl font-bold text-green-400">{fishStats.healthyFish}</p>
                  <Badge variant="default" className="bg-green-500 text-white">
                    {Math.round((fishStats.healthyFish / fishStats.totalFish) * 100)}%
                  </Badge>
                </div>
              </div>
              <Avatar className="h-12 w-12">
                <AvatarFallback className="bg-green-500/20 text-green-400">💚</AvatarFallback>
              </Avatar>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Quick Actions</h3>
        <div className="grid grid-cols-2 gap-3">
          {/* Feed Fish Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" className="justify-start h-auto p-3 bg-slate-800/50 border-slate-600 hover:bg-slate-700">
                      <div className="text-left">
                        <div className="font-medium">Feed Fish</div>
                        <div className="text-xs text-gray-400">Last: 3 hours ago</div>
                      </div>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Choose feeding option</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56">
              <DropdownMenuLabel>Feeding Options</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => toast({ title: "Fish Fed!", description: "All fish have been fed successfully." })}>
                🍽️ Feed All Fish
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => toast({ title: "Selected Fish Fed!", description: "Only selected fish have been fed." })}>
                🎯 Feed Selected Fish
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => toast({ title: "Auto-feed Scheduled!", description: "Automatic feeding has been scheduled." })}>
                ⏰ Schedule Auto-feed
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          {/* Fish Management Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" className="justify-start h-auto p-3 bg-slate-800/50 border-slate-600 hover:bg-slate-700">
                      <div className="text-left">
                        <div className="font-medium">Manage Fish</div>
                        <div className="text-xs text-gray-400">12 current</div>
                      </div>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Fish management options</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56">
              <DropdownMenuLabel>Fish Management</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => toast({ title: "New Fish Added!", description: "A new fish has been added to your aquarium." })}>
                ➕ Add New Fish
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => toast({ title: "View Fish Gallery", description: "Switched to fish gallery view." })}>
                🖼️ View Gallery
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => toast({ title: "Health Check Started", description: "Running health check on all fish." })}>
                🏥 Health Check
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => toast({ title: "Fish Removed", description: "Selected fish has been removed.", variant: "destructive" })}>
                🗑️ Remove Fish
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <Separator className="my-4" />

      {/* Recent Activity */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Recent Activity</h3>
        <div className="space-y-3">
          {notificationsList.map((notification) => (
            <Alert key={notification.id} className={cn(
              notification.type === 'success' && "border-green-500/50 bg-green-500/10",
              notification.type === 'info' && "border-blue-500/50 bg-blue-500/10",
              notification.type === 'warning' && "border-yellow-500/50 bg-yellow-500/10"
            )}>
              <div className={cn(
                "w-4 h-4 rounded-full",
                notification.type === 'success' && "bg-green-400",
                notification.type === 'info' && "bg-blue-400",
                notification.type === 'warning' && "bg-yellow-400"
              )} />
              <AlertDescription className="flex justify-between items-center">
                <span className="font-medium">{notification.title}</span>
                <span className="text-xs text-gray-400">{notification.time}</span>
              </AlertDescription>
            </Alert>
          ))}
        </div>
      </div>
    </div>
  );

  const renderFish = () => (
    <div className="space-y-6">
      {/* Fish Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <label className="text-sm font-medium text-gray-300 mb-2 block">Filter by Type</label>
          <Select value={selectedFishType} onValueChange={(value) => {
            setSelectedFishType(value);
            setCurrentPage(1);
            toast({ title: "Filter Applied", description: `Showing ${value === 'all' ? 'all fish' : value}` });
          }}>
            <SelectTrigger className="w-full bg-slate-800/50 border-slate-600">
              <SelectValue placeholder="Select fish type" />
            </SelectTrigger>
            <SelectContent>
              {fishTypes.map((type) => (
                <SelectItem key={type} value={type}>
                  {type === 'all' ? 'All Fish Types' : type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex-1">
          <label className="text-sm font-medium text-gray-300 mb-2 block">View Mode</label>
          <Select value={fishViewMode} onValueChange={setFishViewMode}>
            <SelectTrigger className="w-full bg-slate-800/50 border-slate-600">
              <SelectValue placeholder="Select view mode" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="gallery">🖼️ Gallery View</SelectItem>
              <SelectItem value="list">📋 List View</SelectItem>
              <SelectItem value="cards">🎴 Card View</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Fish Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
            Fish Collection ({filteredFish.length} fish)
          </h3>
          <Badge variant="outline" className="text-blue-400 border-blue-400">
            Page {currentPage} of {totalPages}
          </Badge>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {paginatedFish.map((fish) => (
            <Card key={fish.id} className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border-blue-500/20">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-blue-500/20 text-blue-400">
                        {fish.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium text-white">{fish.name}</div>
                      <div className="text-xs text-gray-400">{fish.type}</div>
                    </div>
                  </div>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <span className="sr-only">Open menu</span>
                        ⋮
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => toast({ title: `Feeding ${fish.name}`, description: "Fish is being fed." })}>
                        🍽️ Feed
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => toast({ title: `Health Check`, description: `Checking ${fish.name}'s health.` })}>
                        🏥 Health Check
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => toast({ title: "Fish Details", description: `Viewing details for ${fish.name}.` })}>
                        👁️ View Details
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">Health</span>
                    <span className={cn(
                      "font-medium",
                      fish.health > 90 ? "text-green-400" : fish.health > 80 ? "text-yellow-400" : "text-red-400"
                    )}>
                      {fish.health}%
                    </span>
                  </div>
                  <Progress value={fish.health} className="h-1" />
                  
                  <div className="flex justify-between items-center pt-2">
                    <Badge variant="secondary" className="text-xs">
                      {fish.age}
                    </Badge>
                    <Badge variant={fish.feeding === 'Normal' ? 'default' : fish.feeding === 'Light' ? 'secondary' : 'outline'} className="text-xs">
                      {fish.feeding}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center pt-4 pb-2">
            <Pagination className="w-fit mx-auto">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious 
                    href="#" 
                    onClick={(e) => {
                      e.preventDefault();
                      if (currentPage > 1) {
                        setCurrentPage(currentPage - 1);
                        toast({ title: "Page Changed", description: `Viewing page ${currentPage - 1}` });
                      }
                    }}
                    className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
                  />
                </PaginationItem>
                
                {[...Array(totalPages)].map((_, index) => {
                  const page = index + 1;
                  if (page === currentPage || Math.abs(page - currentPage) <= 1) {
                    return (
                      <PaginationItem key={page}>
                        <PaginationLink 
                          href="#" 
                          onClick={(e) => {
                            e.preventDefault();
                            setCurrentPage(page);
                            toast({ title: "Page Changed", description: `Viewing page ${page}` });
                          }}
                          isActive={page === currentPage}
                        >
                          {page}
                        </PaginationLink>
                      </PaginationItem>
                    );
                  } else if (page === currentPage + 2 || page === currentPage - 2) {
                    return (
                      <PaginationItem key={page}>
                        <PaginationEllipsis />
                      </PaginationItem>
                    );
                  }
                  return null;
                })}
                
                <PaginationItem>
                  <PaginationNext 
                    href="#" 
                    onClick={(e) => {
                      e.preventDefault();
                      if (currentPage < totalPages) {
                        setCurrentPage(currentPage + 1);
                        toast({ title: "Page Changed", description: `Viewing page ${currentPage + 1}` });
                      }
                    }}
                    className={currentPage === totalPages ? "pointer-events-none opacity-50" : ""}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </div>
    </div>
  );

  const renderAnalytics = () => (
    <div className="space-y-6">
      {/* Combined Performance Chart - Full View Only */}
      <CombinedPerformanceChart 
        className="w-full" 
        timeRange={24}
        showFullView={true}
      />

      {/* Individual Charts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FPSChart className="w-full" timeRange={1440} showTimeRangeSelector={true} />
        <FishCountChart className="w-full" timeRange={24} />
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-400">Water Quality</span>
                <Badge variant="outline" className="text-green-400 border-green-400">
                  Excellent
                </Badge>
              </div>
              <span className="text-sm font-medium text-green-400">{fishStats.waterQualityPercent}%</span>
            </div>
            <Progress value={fishStats.waterQualityPercent} className="h-2" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-400">Fish Health</span>
                <Badge variant="outline" className="text-blue-400 border-blue-400">
                  Good
                </Badge>
              </div>
              <span className="text-sm font-medium text-blue-400">{fishStats.fishHealthPercent}%</span>
            </div>
            <Progress value={fishStats.fishHealthPercent} className="h-2" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-400">Feeding Schedule</span>
                <Badge variant="outline" className="text-yellow-400 border-yellow-400">
                  On Track
                </Badge>
              </div>
              <span className="text-sm font-medium text-yellow-400">{fishStats.feedingSchedulePercent}%</span>
            </div>
            <Progress value={fishStats.feedingSchedulePercent} className="h-2" />
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderSettings = () => (
    <div className="space-y-6">
      {/* Preferences */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Preferences</h3>
        
        <div className="space-y-3">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-200">Auto-feed</p>
                    <Badge variant={autoFeed ? "default" : "secondary"} className="h-5">
                      {autoFeed ? "Enabled" : "Disabled"}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-400">Automatically feed fish every 8 hours</p>
                </div>
                <Switch
                  checked={autoFeed}
                  onCheckedChange={setAutoFeed}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-200">Notifications</p>
                    <Badge variant={notifications ? "default" : "secondary"} className="h-5">
                      {notifications ? "On" : "Off"}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-400">Receive alerts for important events</p>
                </div>
                <Switch
                  checked={notifications}
                  onCheckedChange={setNotifications}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Separator />

      {/* Feeding Schedule */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Feeding Schedule</h3>
        
        <Card>
          <CardContent className="p-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-200">Schedule Frequency</label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="w-4 h-4 rounded-full bg-yellow-400 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>How often to feed your fish automatically</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Select value={feedingSchedule} onValueChange={(value) => {
                setFeedingSchedule(value);
                toast({ title: "Feeding Schedule Updated", description: `Schedule set to ${value.replace('-', ' ').replace('h', ' hours')}` });
              }}>
                <SelectTrigger className="w-full bg-slate-800/50 border-slate-600">
                  <SelectValue placeholder="Select feeding schedule" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="every-4h">Every 4 hours</SelectItem>
                  <SelectItem value="every-6h">Every 6 hours</SelectItem>
                  <SelectItem value="every-8h">Every 8 hours (Recommended)</SelectItem>
                  <SelectItem value="every-12h">Every 12 hours</SelectItem>
                  <SelectItem value="daily">Once daily</SelectItem>
                  <SelectItem value="manual">Manual feeding only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* Temperature Control */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Environment</h3>
        
        <Card>
          <CardContent className="p-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-200">Temperature</span>
                  <Badge variant="outline" className="text-blue-400 border-blue-400">
                    {temperature[0]}°C
                  </Badge>
                </div>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="w-4 h-4 rounded-full bg-blue-400 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Optimal range: 22-26°C</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Slider
                value={temperature}
                onValueChange={setTemperature}
                max={28}
                min={20}
                step={0.5}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-400">
                <span>20°C</span>
                <span>Cold</span>
                <span>Optimal</span>
                <span>Warm</span>
                <span>28°C</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="space-y-3">
        <Button 
          className="w-full bg-blue-600 hover:bg-blue-700"
          onClick={() => toast({ title: "Settings Saved!", description: "All aquarium settings have been saved successfully." })}
        >
          Save Settings
        </Button>
        <Button 
          variant="outline" 
          className="w-full border-slate-600 hover:bg-slate-700"
          onClick={() => toast({ title: "Settings Reset", description: "All settings have been reset to default values.", variant: "destructive" })}
        >
          Reset to Defaults
        </Button>
        <Button 
          variant="secondary" 
          className="w-full"
          onClick={() => toast({ title: "Export Successful", description: "Settings exported to aquarium-config.json" })}
        >
          Export Configuration
        </Button>
      </div>
    </div>
  );


  return (
    <>
      <CardComponent
        title="Modern Aquarium Control"
        componentId="cardShowcase2"
        isOpen={isOpen}
        onToggle={onToggle}
        position="center"
        size="large"
        isDraggable={isDraggable}
        draggablePosition={draggablePosition}
        className="z-50"
      >
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 bg-slate-800/50 border border-slate-600">
          {tabs.map((tab) => (
            <TabsTrigger
              key={tab.id}
              value={tab.id}
              className="flex items-center gap-2 data-[state=active]:bg-slate-700 data-[state=active]:text-white text-xs sm:text-sm"
            >
              <span>{tab.icon}</span>
              <span className="hidden sm:inline">{tab.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        <div className="min-h-[400px]">
          <TabsContent value="dashboard" className="mt-0">
            {renderDashboard()}
          </TabsContent>
          <TabsContent value="fish" className="mt-0">
            {renderFish()}
          </TabsContent>
          <TabsContent value="analytics" className="mt-0">
            {renderAnalytics()}
          </TabsContent>
          <TabsContent value="settings" className="mt-0">
            {renderSettings()}
          </TabsContent>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-slate-600 flex items-center justify-between text-xs text-gray-400">
          <span>Last updated: Just now</span>
          <span className="flex items-center gap-1">
            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
            Connected
          </span>
        </div>
      </Tabs>
      </CardComponent>
    </>
  );
}

export default CardDesignShowcase2;
