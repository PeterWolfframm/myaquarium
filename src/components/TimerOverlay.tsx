import { useState, useEffect } from 'preact/hooks';
import { databaseService } from '../services/database';
import CardComponent from './CardComponent';

interface TimerSession {
  id: string;
  mood: string;
  start_time: string;
  duration_seconds?: number;
}

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
      <div className="card-content-timer">
        <div className="flex gap-3 justify-center mb-6">
          {moods.map(({ id, label }) => (
            <button
              key={id}
              className={`btn-mood ${mood === id ? 'active' : ''} ${switchingMood === id ? 'switching' : ''} disabled:cursor-not-allowed`}
              onClick={() => {
                setSwitchingMood(id);
                onMoodChange(id);
                // Clear switching state after a delay
                setTimeout(() => setSwitchingMood(null), 500);
              }}
              disabled={switchingMood === id}
            >
              {switchingMood === id ? '...' : label}
            </button>
          ))}
        </div>
        
        {/* Recent Sessions */}
        <div className="section-tertiary">
          <h4 className="text-section-title">
            Recent Sessions
          </h4>
          {loading ? (
            <div className="loading-state">Loading...</div>
          ) : recentSessions.length > 0 ? (
            <div className="flex flex-col gap-2">
              {recentSessions.map((session, index) => (
                <div key={session.id} className="grid-session session-item-base">
                  <span className="session-mood-display">
                    <span className="text-lg">{getMoodIcon(session.mood)}</span>
                    <span className="session-mood-text">{session.mood}</span>
                  </span>
                  <span className="text-mono-small">
                    {formatSessionTime(session.start_time)}
                  </span>
                  <span className="text-duration">
                    {formatDuration(session.duration_seconds)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              No recent sessions
            </div>
          )}
        </div>
      </div>
    </CardComponent>
  );
}

export default TimerOverlay;
