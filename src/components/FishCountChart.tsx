import React, { useState, useEffect } from 'react';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { databaseService } from '../services/database';
import { useFishStore } from '../stores/fishStore';

interface ChartData {
  timestamp: string;
  time: string;
  fps: number;
  fishCount: number;
}

interface FishCountChartProps {
  className?: string;
  timeRange?: number; // minutes (default: 5)
}

const FishCountChart: React.FC<FishCountChartProps> = ({
  className = '',
  timeRange = 5 // Default to 5 minutes
}) => {
  const [data, setData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Get real-time fish count from store
  const currentFishCount = useFishStore(state => state.getFishCount());

  useEffect(() => {
    fetchChartData();
    // Refresh data every 30 seconds
    const interval = setInterval(fetchChartData, 30000);
    return () => clearInterval(interval);
  }, [timeRange]);

  const fetchChartData = async () => {
    try {
      setLoading(true);
      setError(null);
      // Convert minutes to hours for the database service
      const hoursForQuery = timeRange / 60;
      const chartData = await databaseService.getChartData(hoursForQuery, 50);
      setData(chartData);
    } catch (err) {
      setError('Failed to load chart data');
      console.error('Error fetching chart data:', err);
    } finally {
      setLoading(false);
    }
  };

  const getCurrentFishCount = () => {
    // Use real-time fish count from store if available, fallback to chart data
    if (currentFishCount > 0) return currentFishCount;
    if (data.length === 0) return 0;
    return data[data.length - 1]?.fishCount || 0;
  };

  const getPrevFishCount = () => {
    if (data.length < 2) return 0;
    return data[data.length - 2]?.fishCount || 0;
  };

  const getFishCountTrend = () => {
    const current = getCurrentFishCount();
    const previous = getPrevFishCount();
    if (current > previous) return 'up';
    if (current < previous) return 'down';
    return 'stable';
  };

  const getTrendText = () => {
    const trend = getFishCountTrend();
    const current = getCurrentFishCount();
    const previous = getPrevFishCount();
    const diff = Math.abs(current - previous);
    
    if (trend === 'up') return `+${diff} fish added`;
    if (trend === 'down') return `-${diff} fish removed`;
    return 'No change';
  };

  if (loading) {
    return (
      <Card className={`bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-blue-500/20 ${className}`}>
        <CardHeader className="pb-2">
          <CardTitle className="text-blue-400">Fish Count Over Time</CardTitle>
          <CardDescription>Loading chart data...</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="h-[200px] flex items-center justify-center">
            <div className="animate-spin h-8 w-8 border-2 border-blue-400 border-t-transparent rounded-full"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={`bg-gradient-to-br from-red-500/10 to-orange-500/10 border-red-500/20 ${className}`}>
        <CardHeader className="pb-2">
          <CardTitle className="text-red-400">Fish Count Over Time</CardTitle>
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
          <CardTitle className="text-gray-400">Fish Count Over Time</CardTitle>
          <CardDescription>No data available</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="h-[200px] flex items-center justify-center text-gray-400">
            Start using your aquarium to see fish count trends
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-blue-500/20 ${className}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-blue-400">Fish Count Over Time</CardTitle>
            <CardDescription>
              Showing fish population for the last {timeRange} hours
            </CardDescription>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-blue-400">{getCurrentFishCount()}</div>
            <div className="text-xs text-blue-300 mb-1">
              {currentFishCount > 0 ? 'Live Count' : 'From Chart Data'}
            </div>
            <Badge 
              variant="secondary" 
              className={`text-xs ${
                getFishCountTrend() === 'up' 
                  ? 'bg-green-500/20 text-green-300'
                  : getFishCountTrend() === 'down'
                  ? 'bg-red-500/20 text-red-300'
                  : 'bg-gray-500/20 text-gray-300'
              }`}
            >
              {getTrendText()}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="fishGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#60a5fa" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <XAxis 
                dataKey="time" 
                axisLine={false}
                tickLine={false}
                className="text-xs text-gray-400"
                interval="preserveStartEnd"
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                className="text-xs text-gray-400"
                domain={['dataMin - 1', 'dataMax + 1']}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-gray-900/95 p-3 border border-gray-700 rounded-lg shadow-lg">
                        <p className="text-gray-300 text-sm">{label}</p>
                        <p className="text-blue-400 font-semibold">
                          🐠 {payload[0].value} fish
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area
                type="monotone"
                dataKey="fishCount"
                stroke="#60a5fa"
                strokeWidth={2}
                fill="url(#fishGradient)"
                dot={{ fill: '#60a5fa', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, stroke: '#60a5fa', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default FishCountChart;
