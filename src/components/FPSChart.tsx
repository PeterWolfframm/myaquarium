import React, { useState, useEffect } from 'react';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, ReferenceLine } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { databaseService } from '../services/database';

interface ChartData {
  timestamp: string;
  time: string;
  fps: number;
  fishCount: number;
  relativeTime?: string; // For 5-minute view
}

interface FPSChartProps {
  className?: string;
  timeRange?: number; // minutes (default: 5)
  showTimeRangeSelector?: boolean;
}

const FPSChart: React.FC<FPSChartProps> = ({
  className = '',
  timeRange = 5, // Default to 5 minutes
  showTimeRangeSelector = false
}) => {
  const [data, setData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTimeRange, setSelectedTimeRange] = useState<number>(timeRange);

  // Available time range options in minutes
  const timeRangeOptions = [
    { label: '5 min', value: 5 },
    { label: '15 min', value: 15 },
    { label: '1 hour', value: 60 },
    { label: '6 hours', value: 360 },
    { label: '24 hours', value: 1440 }
  ];

  useEffect(() => {
    // Initial data fetch
    fetchChartData();

    // Set up refresh interval for real-time updates
    const interval = setInterval(fetchChartData, 30000);

    // Update the live time display every second for short time ranges
    let timeUpdateInterval: NodeJS.Timeout | null = null;
    if (selectedTimeRange <= 15) {
      timeUpdateInterval = setInterval(() => {
        // Force re-render to update the "Now" indicator and live time
        setSelectedTimeRange(prev => prev);
      }, 1000);
    }

    // Cleanup function
    return () => {
      clearInterval(interval);
      if (timeUpdateInterval) clearInterval(timeUpdateInterval);
    };
  }, [selectedTimeRange]);

  const fetchChartData = async () => {
    try {
      setLoading(true);
      setError(null);

      let chartData;

      // Use the dedicated method for 5-minute queries for better reliability
      if (selectedTimeRange === 5) {
        console.log('🔍 FPSChart: Using dedicated method for 5-minute query');
        chartData = await databaseService.getChartDataWithRelativeTimes(5/60, 50);
      } else {
        // Convert minutes to hours for other time ranges
        const hoursForQuery = selectedTimeRange / 60;
        console.log(`🔍 FPSChart: Querying for ${selectedTimeRange} minutes (${hoursForQuery} hours)`);
        chartData = await databaseService.getChartData(hoursForQuery, 50);
      }

      console.log(`📊 FPSChart: Received ${chartData.length} data points`);

      if (chartData.length === 0) {
        console.warn('⚠️ FPSChart: No data found for selected time range');

        // Try to get ANY data to see if there's data in the table at all
        console.log('🔍 FPSChart: Checking for any performance data...');
        try {
          const latestLog = await databaseService.getLatestPerformanceLog();
          if (latestLog) {
            console.log('📊 FPSChart: Found latest log:', latestLog.logged_at);
            console.log('📊 FPSChart: Getting last 24 hours of data...');
            const fallbackData = await databaseService.getChartData(24, 50);
            setData(fallbackData);
          } else {
            console.warn('⚠️ FPSChart: No performance data found in database at all');
            console.log('🔍 FPSChart: This might mean:');
            console.log('  1. FPS tracking is not enabled');
            console.log('  2. User is not authenticated');
            console.log('  3. Database table does not exist');
            console.log('  4. No data has been logged yet');
            setError('No performance data available. Make sure FPS tracking is enabled and try refreshing the page.');
            setData([]);
          }
        } catch (debugError) {
          console.error('Error checking for data:', debugError);
          setData([]);
        }
      } else {
        setData(chartData);
      }
    } catch (err) {
      setError('Failed to load chart data');
      console.error('Error fetching chart data:', err);
    } finally {
      setLoading(false);
    }
  };

  const getCurrentFPS = () => {
    if (data.length === 0) return 0;
    return data[data.length - 1]?.fps || 0;
  };

  const getAverageFPS = () => {
    if (data.length === 0) return 0;
    const sum = data.reduce((acc, item) => acc + item.fps, 0);
    return Math.round(sum / data.length);
  };

  const getMinFPS = () => {
    if (data.length === 0) return 0;
    return Math.min(...data.map(item => item.fps));
  };

  const getMaxFPS = () => {
    if (data.length === 0) return 0;
    return Math.max(...data.map(item => item.fps));
  };

  const getFPSStatus = () => {
    const current = getCurrentFPS();
    if (current >= 55) return { status: 'excellent', color: 'green', text: 'Excellent' };
    if (current >= 45) return { status: 'good', color: 'blue', text: 'Good' };
    if (current >= 30) return { status: 'fair', color: 'yellow', text: 'Fair' };
    return { status: 'poor', color: 'red', text: 'Poor' };
  };

  const getPerformanceTrend = () => {
    if (data.length < 5) return 'stable';

    const recent = data.slice(-5);
    const avg = recent.reduce((acc, item) => acc + item.fps, 0) / recent.length;
    const current = getCurrentFPS();

    if (current > avg + 5) return 'improving';
    if (current < avg - 5) return 'declining';
    return 'stable';
  };

  const handleTimeRangeChange = (minutes: number) => {
    setSelectedTimeRange(minutes);
  };

  const formatTimeRange = (minutes: number): string => {
    if (minutes < 60) {
      return `${minutes} min`;
    } else {
      const hours = Math.floor(minutes / 60);
      return `${hours} hour${hours > 1 ? 's' : ''}`;
    }
  };

  const getCurrentTimeLabel = (): string => {
    return new Date().toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  };

  if (loading) {
    return (
      <Card className={`bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/20 ${className}`}>
        <CardHeader className="pb-2">
          <CardTitle className="text-purple-400">FPS Over Time</CardTitle>
          <CardDescription>Loading chart data...</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="h-[200px] flex items-center justify-center">
            <div className="animate-spin h-8 w-8 border-2 border-purple-400 border-t-transparent rounded-full"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={`bg-gradient-to-br from-red-500/10 to-orange-500/10 border-red-500/20 ${className}`}>
        <CardHeader className="pb-2">
          <CardTitle className="text-red-400">FPS Over Time</CardTitle>
          <CardDescription>Error loading data</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="h-[200px] flex items-center justify-center text-red-400">
            {error}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card className={`bg-gradient-to-br from-gray-500/10 to-slate-500/10 border-gray-500/20 ${className}`}>
        <CardHeader className="pb-2">
          <CardTitle className="text-gray-400">FPS Over Time</CardTitle>
          <CardDescription>No data available</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="h-[200px] flex items-center justify-center text-gray-400">
            Start using your aquarium to see performance trends
          </div>
        </CardContent>
      </Card>
    );
  }

  const fpsStatus = getFPSStatus();

  return (
    <Card className={`bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/20 ${className}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-purple-400">FPS Over Time</CardTitle>
            <CardDescription>
              Performance tracking for the last {formatTimeRange(selectedTimeRange)}
              {selectedTimeRange <= 15 && (
                <span className="text-purple-300"> • Live: {getCurrentTimeLabel()}</span>
              )}
            </CardDescription>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-purple-400">{getCurrentFPS()}</div>
            <Badge 
              variant="secondary" 
              className={`text-xs bg-${fpsStatus.color}-500/20 text-${fpsStatus.color}-300`}
            >
              {fpsStatus.text}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="mb-3 grid grid-cols-3 gap-2 text-xs">
          <div className="text-center">
            <div className="text-gray-400">Avg</div>
            <div className="font-semibold text-purple-300">{getAverageFPS()}</div>
          </div>
          <div className="text-center">
            <div className="text-gray-400">Min</div>
            <div className="font-semibold text-red-300">{getMinFPS()}</div>
          </div>
          <div className="text-center">
            <div className="text-gray-400">Max</div>
            <div className="font-semibold text-green-300">{getMaxFPS()}</div>
          </div>
        </div>

        {showTimeRangeSelector && (
          <div className="mb-3 flex flex-wrap gap-1">
            {timeRangeOptions.map((option) => (
              <Button
                key={option.value}
                variant={selectedTimeRange === option.value ? "default" : "outline"}
                size="sm"
                onClick={() => handleTimeRangeChange(option.value)}
                className={`text-xs px-2 py-1 h-auto ${
                  selectedTimeRange === option.value
                    ? 'bg-purple-600 hover:bg-purple-700'
                    : 'bg-transparent border-purple-500/30 hover:bg-purple-500/10'
                }`}
              >
                {option.label}
              </Button>
            ))}
          </div>
        )}

        {error && (
          <div className="mb-3 flex flex-wrap gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                console.log('🔧 FPSChart: Creating test data...');
                const success = await databaseService.createTestPerformanceLog();
                if (success) {
                  console.log('🔧 FPSChart: Test data created, refreshing...');
                  fetchChartData();
                }
              }}
              className="text-xs px-2 py-1 h-auto bg-red-500/20 border-red-500/30 hover:bg-red-500/30 text-red-300"
            >
              Create Test Data
            </Button>
          </div>
        )}

        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="fpsGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#a855f7" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey={selectedTimeRange === 5 ? "relativeTime" : "time"}
                axisLine={false}
                tickLine={false}
                className="text-xs text-gray-400"
                interval="preserveStartEnd"
                tickFormatter={(value) => {
                  // For 5-minute views with relative times, show as-is
                  if (selectedTimeRange === 5) {
                    return value;
                  }
                  // For longer views, show just minutes (remove seconds)
                  if (value && typeof value === 'string' && value.includes(':')) {
                    return value.replace(/:\d{2}$/, ''); // Remove seconds
                  }
                  return value;
                }}
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                className="text-xs text-gray-400"
                domain={[0, 'dataMax + 10']}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const fps = payload[0].value as number;
                    let status = 'Poor';
                    let statusColor = 'text-red-400';

                    if (fps >= 55) {
                      status = 'Excellent';
                      statusColor = 'text-green-400';
                    } else if (fps >= 45) {
                      status = 'Good';
                      statusColor = 'text-blue-400';
                    } else if (fps >= 30) {
                      status = 'Fair';
                      statusColor = 'text-yellow-400';
                    }

                    // Format the time more clearly
                    const timeLabel = label || '';
                    const isRecent = timeLabel.includes('AM') || timeLabel.includes('PM');
                    const isRelative = timeLabel.includes('ago') || timeLabel.includes('now');

                    return (
                      <div className="bg-gray-900/95 p-3 border border-gray-700 rounded-lg shadow-lg">
                        <p className="text-gray-300 text-sm font-mono">
                          {isRelative ? '🕐 ' + timeLabel : isRecent ? '🕐 ' + timeLabel : '📊 ' + timeLabel}
                        </p>
                        <p className="text-purple-400 font-semibold">
                          ⚡ {fps} FPS
                        </p>
                        <p className={`text-xs ${statusColor}`}>
                          {status} Performance
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              {/* Current time reference line (only for recent views) */}
              {selectedTimeRange <= 15 && (
                <ReferenceLine
                  x={getCurrentTimeLabel()}
                  stroke="#ef4444"
                  strokeDasharray="2 2"
                  label={{ value: "Now", className: "text-xs text-red-400" }}
                />
              )}

              {/* Target FPS reference line */}
              <ReferenceLine
                y={60}
                stroke="#10b981"
                strokeDasharray="5 5"
                label={{ value: "Target 60 FPS", className: "text-xs text-green-400" }}
              />
              <ReferenceLine
                y={30}
                stroke="#f59e0b"
                strokeDasharray="3 3"
                label={{ value: "30 FPS", className: "text-xs text-yellow-400" }}
              />
              <Area
                type="monotone"
                dataKey="fps"
                stroke="#a855f7"
                strokeWidth={2}
                fill="url(#fpsGradient)"
                dot={{ fill: '#a855f7', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, stroke: '#a855f7', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default FPSChart;
