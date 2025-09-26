import { useState, useEffect } from 'preact/hooks';
import { databaseService } from '../services/database';
import CardComponent from './CardComponent';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Separator } from './ui/separator';
import { Avatar, AvatarFallback } from './ui/avatar';
import type { TimerSession } from '../types/global';

interface TimerOverlayProps {
  time: string;
  mood: string;
  onMoodChange: (mood: string) => void;
  currentSession: TimerSession | null;
  onSessionsLoaded?: (sessions: TimerSession[]) => void;
  isOpen: boolean;
  onToggle: () => void;
  isDraggable?: boolean;
  draggableId?: string | null;
  draggablePosition?: { x: number; y: number } | null;
}

function TimerOverlay({ 
  time, 
  mood, 
  onMoodChange, 
  currentSession, 
  onSessionsLoaded, 
  isOpen, 
  onToggle, 
  isDraggable = false, 
  draggableId = null, 
  draggablePosition = null 
}: TimerOverlayProps) {
  const [recentSessions, setRecentSessions] = useState<TimerSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [switchingMood, setSwitchingMood] = useState<string | null>(null);

  const moods = [
    { id: 'work', label: 'Work' },
    { id: 'pause', label: 'Pause' },
    { id: 'lunch', label: 'Lunch' }
  ];

  // Load recent sessions on component mount
  useEffect(() => {
    loadRecentSessions();
  }, []);

  // Reload sessions when current session changes (after mood switch)
  useEffect(() => {
    // Always reload sessions when currentSession changes, not just when it's null
    // This ensures we see completed sessions immediately after mood switches
    if (currentSession) {
      // Small delay to ensure the previous session has been saved to database
      const timeoutId = setTimeout(() => {
        loadRecentSessions();
      }, 100);
      
      return () => clearTimeout(timeoutId);
    }
  }, [currentSession]);

  const loadRecentSessions = async () => {
    setLoading(true);
    try {
      const sessions = await databaseService.getRecentTimeTrackingSessions();
      setRecentSessions(sessions);
      
      // Notify parent component that sessions were loaded
      if (onSessionsLoaded) {
        onSessionsLoaded(sessions);
      }
    } catch (error) {
      console.error('Error loading recent sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (durationSeconds: number | undefined) => {
    if (!durationSeconds) return '0m';
    
    const hours = Math.floor(durationSeconds / 3600);
    const minutes = Math.floor((durationSeconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const formatSessionTime = (startTime: string) => {
    const date = new Date(startTime);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getMoodIcon = (moodId: string) => {
    switch (moodId) {
      case 'work': return '💼';
      case 'pause': return '⏸️';
      case 'lunch': return '🍽️';
      default: return '📝';
    }
  };

  return (
    <CardComponent 
      title={`⏱️ Timer - ${time}`}
      componentId="timer"
      isOpen={isOpen}
      onToggle={onToggle}
      defaultViewMode="sticky"
      position={isDraggable ? "static" : "center"}
      size="medium"
      className="timer-collapsible"
      hideWhenClosed={true}
      isDraggable={isDraggable}
      draggablePosition={draggablePosition}
    >
      <div className="space-y-6">
        {/* Mood Selection */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider text-center">Current Mode</h3>
          <div className="flex gap-3 justify-center">
            {moods.map(({ id, label }) => (
              <Button
                key={id}
                variant={mood === id ? "default" : "outline"}
                size="sm"
                className={`${
                  mood === id 
                    ? "bg-blue-600 hover:bg-blue-700 text-white" 
                    : "bg-slate-800/50 border-slate-600 hover:bg-slate-700"
                } disabled:cursor-not-allowed disabled:opacity-50`}
                onClick={() => {
                  setSwitchingMood(id);
                  onMoodChange(id);
                  // Clear switching state after a delay
                  setTimeout(() => setSwitchingMood(null), 500);
                }}
                disabled={switchingMood === id}
              >
                {switchingMood === id ? '...' : label}
              </Button>
            ))}
          </div>
        </div>
        
        <Separator />
        
        {/* Recent Sessions */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
            Recent Sessions
          </h3>
          {loading ? (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-center text-gray-400">
                  Loading...
                </div>
              </CardContent>
            </Card>
          ) : recentSessions.length > 0 ? (
            <div className="space-y-3">
              {recentSessions.map((session, index) => (
                <Card key={session.id} className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/20">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-purple-500/20 text-purple-400 text-lg">
                            {getMoodIcon(session.mood)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium text-white capitalize">{session.mood}</div>
                          <div className="text-xs text-gray-400 font-mono">
                            {formatSessionTime(session.start_time)}
                          </div>
                        </div>
                      </div>
                      <Badge variant="secondary" className="bg-blue-500/20 text-blue-300">
                        {formatDuration(session.duration_seconds)}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-center text-gray-400">
                  No recent sessions
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </CardComponent>
  );
}

export default TimerOverlay;
