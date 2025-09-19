function TimerOverlay({ time, mood, onMoodChange, visibleCubes }) {
  const moods = [
    { id: 'work', label: 'Work' },
    { id: 'pause', label: 'Pause' },
    { id: 'lunch', label: 'Lunch' }
  ];

  return (
    <div className="timer-overlay">
      <div className="timer">{time}</div>
      <div className="mood-controls">
        {moods.map(({ id, label }) => (
          <button
            key={id}
            className={mood === id ? 'active' : ''}
            onClick={() => onMoodChange(id)}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="cube-counter">
        Visible Cubes: {visibleCubes || 0}
      </div>
    </div>
  );
}

export default TimerOverlay;
