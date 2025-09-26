import React, { useState, useEffect } from 'react';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, ReferenceLine } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { databaseService } from '../services/database';

interface ChartData {
  timestamp: string;
  time: string;
  fps: number;
  fishCount: number;
}

interface FPSChartProps {
  className?: string;
  timeRange?: number; // hours
}

const FPSChart: React.FC<FPSChartProps> = ({ 
  className = '', 
  timeRange = 24 
}) => {
  const [data, setData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      const chartData = await databaseService.getChartData(timeRange, 50);
      setData(chartData);
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
              Performance tracking for the last {timeRange} hours
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
                    
                    return (
                      <div className="bg-gray-900/95 p-3 border border-gray-700 rounded-lg shadow-lg">
                        <p className="text-gray-300 text-sm">{label}</p>
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
              {/* Target FPS reference line */}
              <ReferenceLine 
                y={60} 
                stroke="#10b981" 
                strokeDasharray="5 5" 
                label={{ value: "Target 60 FPS", position: "topRight", className: "text-xs text-green-400" }}
              />
              <ReferenceLine 
                y={30} 
                stroke="#f59e0b" 
                strokeDasharray="3 3" 
                label={{ value: "30 FPS", position: "topRight", className: "text-xs text-yellow-400" }}
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
