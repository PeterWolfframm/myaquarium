import { useState, useEffect } from 'preact/hooks';
import { databaseService } from '../services/database.js';
import Collapsible from './Collapsible.jsx';

function TimerOverlay({ time, mood, onMoodChange, currentSession, onSessionsLoaded, isOpen, onToggle }) {
  const [recentSessions, setRecentSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [switchingMood, setSwitchingMood] = useState(null);

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

  const formatDuration = (durationSeconds) => {
    if (!durationSeconds) return '0m';
    
    const hours = Math.floor(durationSeconds / 3600);
    const minutes = Math.floor((durationSeconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const formatSessionTime = (startTime) => {
    const date = new Date(startTime);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getMoodIcon = (moodId) => {
    switch (moodId) {
      case 'work': return '💼';
      case 'pause': return '⏸️';
      case 'lunch': return '🍽️';
      default: return '📝';
    }
  };

  return (
    <Collapsible 
      title={`⏱️ Timer - ${time}`}
      position="center"
      size="medium"
      isOpen={isOpen}
      onToggle={onToggle}
      className="timer-collapsible"
      hideWhenClosed={true}
    >
      <div className="timer-content">
        <div className="mood-controls">
          {moods.map(({ id, label }) => (
            <button
              key={id}
              className={`${mood === id ? 'active' : ''} ${switchingMood === id ? 'switching' : ''}`}
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
        <div className="recent-sessions">
          <h4>Recent Sessions</h4>
          {loading ? (
            <div className="session-loading">Loading...</div>
          ) : recentSessions.length > 0 ? (
            <div className="sessions-list">
              {recentSessions.map((session, index) => (
                <div key={session.id} className="session-item">
                  <span className="session-mood">
                    {getMoodIcon(session.mood)} {session.mood}
                  </span>
                  <span className="session-time">
                    {formatSessionTime(session.start_time)}
                  </span>
                  <span className="session-duration">
                    {formatDuration(session.duration_seconds)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="no-sessions">No recent sessions</div>
          )}
        </div>
      </div>
    </Collapsible>
  );
}

export default TimerOverlay;
