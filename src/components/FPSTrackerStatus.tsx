/**
 * FPS Tracker Status Component
 * Shows real-time status of the FPS tracking system
 */

import React, { useState, useEffect } from 'react';
import { fpsTracker } from '../utils/FPSTracker';
import { Badge } from './ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

interface FPSTrackerStatusProps {
  className?: string;
}

const FPSTrackerStatus: React.FC<FPSTrackerStatusProps> = ({ className = '' }) => {
  const [status, setStatus] = useState({
    isTracking: false,
    measurementCount: 0,
    sessionDuration: 0,
    averageFPS: 0
  });

  useEffect(() => {
    // Update status every second
    const interval = setInterval(() => {
      const trackerStatus = fpsTracker.getStatus();
      setStatus(trackerStatus);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const formatDuration = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };

  const getTrackingStatus = () => {
    if (status.isTracking) {
      return { text: 'Active', color: 'green' };
    } else {
      return { text: 'Stopped', color: 'red' };
    }
  };

  const trackingStatus = getTrackingStatus();

  return (
    <Card className={`bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-blue-500/20 ${className}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-blue-400">FPS Tracker</CardTitle>
          <Badge 
            variant="secondary" 
            className={`text-xs bg-${trackingStatus.color}-500/20 text-${trackingStatus.color}-300`}
          >
            {trackingStatus.text}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-400">Session Duration:</span>
            <span className="text-blue-300">{formatDuration(status.sessionDuration)}</span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-gray-400">Current Buffer:</span>
            <span className="text-blue-300">
              {status.measurementCount}/10 samples
            </span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-gray-400">5s Average FPS:</span>
            <span className="text-blue-300 font-mono">
              {status.averageFPS.toFixed(1)}
            </span>
          </div>
          
          {status.isTracking && (
            <div className="mt-3 text-xs text-gray-500">
              📊 Measuring every 0.5s, logging to Supabase every 5s
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default FPSTrackerStatus;
