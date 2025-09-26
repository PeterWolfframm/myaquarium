import React, { useState, useEffect } from 'react';
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend, ReferenceLine } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { databaseService } from '../services/database';

interface ChartData {
  timestamp: string;
  time: string;
  fps: number;
  fishCount: number;
}

interface CombinedPerformanceChartProps {
  className?: string;
  timeRange?: number; // hours
  showFullView?: boolean;
}

const CombinedPerformanceChart: React.FC<CombinedPerformanceChartProps> = ({ 
  className = '', 
  timeRange = 24,
  showFullView = false 
}) => {
  const [data, setData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRange, setSelectedRange] = useState(timeRange);

  useEffect(() => {
    fetchChartData();
    // Refresh data every 30 seconds
    const interval = setInterval(fetchChartData, 30000);
    return () => clearInterval(interval);
  }, [selectedRange]);

  const fetchChartData = async () => {
    try {
      setLoading(true);
      setError(null);
      const chartData = await databaseService.getChartData(selectedRange, 100);
      setData(chartData);
    } catch (err) {
      setError('Failed to load chart data');
      console.error('Error fetching chart data:', err);
    } finally {
      setLoading(false);
    }
  };

  const getCurrentStats = () => {
    if (data.length === 0) return { fps: 0, fishCount: 0 };
    const latest = data[data.length - 1];
    return {
      fps: latest?.fps || 0,
      fishCount: latest?.fishCount || 0
    };
  };

  const getAverageStats = () => {
    if (data.length === 0) return { fps: 0, fishCount: 0 };
    
    const avgFps = data.reduce((acc, item) => acc + item.fps, 0) / data.length;
    const avgFish = data.reduce((acc, item) => acc + item.fishCount, 0) / data.length;
    
    return {
      fps: Math.round(avgFps),
      fishCount: Math.round(avgFish)
    };
  };

  const getCorrelationInsight = () => {
    if (data.length < 10) return "Collecting data...";
    
    // Simple correlation analysis
    const highFishPeriods = data.filter(d => d.fishCount > getAverageStats().fishCount);
    const avgFpsWithHighFish = highFishPeriods.length > 0 
      ? highFishPeriods.reduce((acc, d) => acc + d.fps, 0) / highFishPeriods.length 
      : 0;
    
    const lowFishPeriods = data.filter(d => d.fishCount <= getAverageStats().fishCount);
    const avgFpsWithLowFish = lowFishPeriods.length > 0 
      ? lowFishPeriods.reduce((acc, d) => acc + d.fps, 0) / lowFishPeriods.length 
      : 0;
    
    const fpsDiff = avgFpsWithLowFish - avgFpsWithHighFish;
    
    if (Math.abs(fpsDiff) < 5) {
      return "Fish count has minimal impact on performance";
    } else if (fpsDiff > 5) {
      return `Performance drops by ~${Math.round(fpsDiff)} FPS with more fish`;
    } else {
      return "More fish may actually improve performance (unusual!)";
    }
  };

  const timeRangeOptions = [
    { value: 1, label: '1 Hour' },
    { value: 6, label: '6 Hours' },
    { value: 24, label: '24 Hours' },
    { value: 72, label: '3 Days' },
    { value: 168, label: '1 Week' }
  ];

  if (loading) {
    return (
      <Card className={`bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border-emerald-500/20 ${className}`}>
        <CardHeader className="pb-2">
          <CardTitle className="text-emerald-400">Performance Overview</CardTitle>
          <CardDescription>Loading combined performance data...</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="h-[300px] flex items-center justify-center">
            <div className="animate-spin h-8 w-8 border-2 border-emerald-400 border-t-transparent rounded-full"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={`bg-gradient-to-br from-red-500/10 to-orange-500/10 border-red-500/20 ${className}`}>
        <CardHeader className="pb-2">
          <CardTitle className="text-red-400">Performance Overview</CardTitle>
          <CardDescription>Error loading data</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="h-[300px] flex items-center justify-center text-red-400">
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
          <CardTitle className="text-gray-400">Performance Overview</CardTitle>
          <CardDescription>No data available</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="h-[300px] flex items-center justify-center text-gray-400">
            Start using your aquarium to see performance trends
          </div>
        </CardContent>
      </Card>
    );
  }

  const currentStats = getCurrentStats();
  const averageStats = getAverageStats();

  return (
    <Card className={`bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border-emerald-500/20 ${className}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <CardTitle className="text-emerald-400">Performance Overview</CardTitle>
            <CardDescription>
              FPS and Fish Count correlation over time
            </CardDescription>
          </div>
          
          {showFullView && (
            <div className="flex gap-2 flex-wrap">
              {timeRangeOptions.map(option => (
                <Button
                  key={option.value}
                  variant={selectedRange === option.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedRange(option.value)}
                  className="text-xs"
                >
                  {option.label}
                </Button>
              ))}
            </div>
          )}
        </div>
      </CardHeader>
      
      {showFullView && (
        <CardContent className="pt-0 pb-4">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-emerald-300">Current Values</h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-purple-500/10 p-2 rounded border border-purple-500/20">
                  <div className="text-purple-300">FPS</div>
                  <div className="text-lg font-bold text-purple-400">{currentStats.fps}</div>
                </div>
                <div className="bg-blue-500/10 p-2 rounded border border-blue-500/20">
                  <div className="text-blue-300">Fish</div>
                  <div className="text-lg font-bold text-blue-400">{currentStats.fishCount}</div>
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-emerald-300">Average Values</h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-purple-500/10 p-2 rounded border border-purple-500/20">
                  <div className="text-purple-300">Avg FPS</div>
                  <div className="text-lg font-bold text-purple-400">{averageStats.fps}</div>
                </div>
                <div className="bg-blue-500/10 p-2 rounded border border-blue-500/20">
                  <div className="text-blue-300">Avg Fish</div>
                  <div className="text-lg font-bold text-blue-400">{averageStats.fishCount}</div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mb-4">
            <Badge variant="secondary" className="bg-emerald-500/20 text-emerald-300 text-xs">
              💡 {getCorrelationInsight()}
            </Badge>
          </div>
        </CardContent>
      )}
      
      <CardContent className="pt-0">
        <div className={showFullView ? "h-[400px]" : "h-[250px]"}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <XAxis 
                dataKey="time" 
                axisLine={false}
                tickLine={false}
                className="text-xs text-gray-400"
                interval="preserveStartEnd"
              />
              <YAxis 
                yAxisId="fps"
                orientation="left"
                axisLine={false}
                tickLine={false}
                className="text-xs text-gray-400"
                domain={[0, 'dataMax + 10']}
                label={{ value: 'FPS', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: '#a855f7' } }}
              />
              <YAxis 
                yAxisId="fish"
                orientation="right"
                axisLine={false}
                tickLine={false}
                className="text-xs text-gray-400"
                domain={['dataMin - 1', 'dataMax + 1']}
                label={{ value: 'Fish Count', angle: 90, position: 'insideRight', style: { textAnchor: 'middle', fill: '#60a5fa' } }}
              />
              
              {showFullView && (
                <>
                  <ReferenceLine 
                    yAxisId="fps"
                    y={60} 
                    stroke="#10b981" 
                    strokeDasharray="5 5" 
                    label={{ value: "60 FPS Target", position: "topLeft", className: "text-xs text-green-400" }}
                  />
                  <ReferenceLine 
                    yAxisId="fps"
                    y={30} 
                    stroke="#f59e0b" 
                    strokeDasharray="3 3" 
                    label={{ value: "30 FPS Min", position: "topLeft", className: "text-xs text-yellow-400" }}
                  />
                </>
              )}
              
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const fpsData = payload.find(p => p.dataKey === 'fps');
                    const fishData = payload.find(p => p.dataKey === 'fishCount');
                    
                    return (
                      <div className="bg-gray-900/95 p-3 border border-gray-700 rounded-lg shadow-lg">
                        <p className="text-gray-300 text-sm mb-2">{label}</p>
                        {fpsData && (
                          <p className="text-purple-400 font-semibold">
                            ⚡ {fpsData.value} FPS
                          </p>
                        )}
                        {fishData && (
                          <p className="text-blue-400 font-semibold">
                            🐠 {fishData.value} fish
                          </p>
                        )}
                      </div>
                    );
                  }
                  return null;
                }}
              />
              
              {showFullView && (
                <Legend 
                  verticalAlign="top" 
                  height={36}
                  iconType="line"
                  wrapperStyle={{ paddingBottom: '20px' }}
                />
              )}
              
              <Line
                yAxisId="fps"
                type="monotone"
                dataKey="fps"
                stroke="#a855f7"
                strokeWidth={2}
                dot={{ fill: '#a855f7', strokeWidth: 2, r: 3 }}
                activeDot={{ r: 5, stroke: '#a855f7', strokeWidth: 2 }}
                name="FPS"
              />
              <Line
                yAxisId="fish"
                type="monotone"
                dataKey="fishCount"
                stroke="#60a5fa"
                strokeWidth={2}
                dot={{ fill: '#60a5fa', strokeWidth: 2, r: 3 }}
                activeDot={{ r: 5, stroke: '#60a5fa', strokeWidth: 2 }}
                name="Fish Count"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default CombinedPerformanceChart;
