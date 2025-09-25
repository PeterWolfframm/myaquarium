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
import CardComponent from './CardComponent';
import { cn } from '@/lib/utils';

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

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: '🏠' },
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
                <p>Feed all fish in the aquarium</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" className="justify-start h-auto p-3 bg-slate-800/50 border-slate-600 hover:bg-slate-700">
                  <div className="text-left">
                    <div className="font-medium">Add Fish</div>
                    <div className="text-xs text-gray-400">12 current</div>
                  </div>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Add a new fish to your aquarium</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
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

  const renderAnalytics = () => (
    <div className="space-y-6">
      {/* Chart Placeholder */}
      <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/20">
        <CardHeader>
          <CardTitle className="text-lg text-purple-300">Fish Activity Over Time</CardTitle>
          <CardDescription>Monitor fish behavior and activity patterns</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-32 bg-slate-800/50 rounded-lg flex items-center justify-center">
            <p className="text-gray-400">📈 Chart would go here</p>
          </div>
        </CardContent>
      </Card>

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
        <Button className="w-full bg-blue-600 hover:bg-blue-700">
          Save Settings
        </Button>
        <Button variant="outline" className="w-full border-slate-600 hover:bg-slate-700">
          Reset to Defaults
        </Button>
      </div>
    </div>
  );


  return (
    <CardComponent
      title="Modern Aquarium Control"
      componentId="modern-ui-showcase"
      isOpen={isOpen}
      onToggle={onToggle}
      position="center"
      size="large"
      isDraggable={isDraggable}
      draggablePosition={draggablePosition}
      className="z-50"
    >
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 bg-slate-800/50 border border-slate-600">
          {tabs.map((tab) => (
            <TabsTrigger
              key={tab.id}
              value={tab.id}
              className="flex items-center gap-2 data-[state=active]:bg-slate-700 data-[state=active]:text-white"
            >
              <span>{tab.icon}</span>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <div className="min-h-[320px]">
          <TabsContent value="dashboard" className="mt-0">
            {renderDashboard()}
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
  );
}

export default CardDesignShowcase2;
