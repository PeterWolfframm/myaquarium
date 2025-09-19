function TimerOverlay({ time, mood, onMoodChange, visibleCubes, fishInfo, viewportPosition }) {
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
      <div className="info-panel">
        <div className="cube-counter">
          Visible Cubes: {visibleCubes || 0}
        </div>
        <div className="fish-info">
          <div className="fish-counts">
            Fish - H: {fishInfo?.horizontalCount || 0} | V: {fishInfo?.verticalCount || 0} | Total: {fishInfo?.total || 0}
          </div>
        </div>
        <div className="viewport-info">
          <div className="viewport-position">
            Position: Tile ({viewportPosition?.tileX || 0}, {viewportPosition?.tileY || 0}) | 
            {viewportPosition?.percentageX || 0}% H, {viewportPosition?.percentageY || 0}% V
          </div>
        </div>
      </div>
    </div>
  );
}

export default TimerOverlay;
