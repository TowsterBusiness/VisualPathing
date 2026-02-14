import { useEffect, useRef, useCallback, useState } from 'react';
import { useSimulationStore } from '../../store/useSimulationStore';
import { useStore } from '../../store/useStore';
import { formatTime } from '../../utils/timeCalculator';
import './SimulationControls.css';

const SPEED_OPTIONS = [0.25, 0.5, 1, 1.5, 2, 4];

export function SimulationControls() {
  const isPlaying = useSimulationStore((s) => s.isPlaying);
  const currentTime = useSimulationStore((s) => s.currentTime);
  const speedFactor = useSimulationStore((s) => s.speedFactor);
  const prediction = useSimulationStore((s) => s.prediction);
  const robotState = useSimulationStore((s) => s.robotState);
  const settings = useSimulationStore((s) => s.settings);

  const play = useSimulationStore((s) => s.play);
  const pause = useSimulationStore((s) => s.pause);
  const stop = useSimulationStore((s) => s.stop);
  const setCurrentTime = useSimulationStore((s) => s.setCurrentTime);
  const setSpeedFactor = useSimulationStore((s) => s.setSpeedFactor);
  const updateSettings = useSimulationStore((s) => s.updateSettings);
  const recalculate = useSimulationStore((s) => s.recalculate);
  const tick = useSimulationStore((s) => s.tick);

  const [showSettings, setShowSettings] = useState(false);

  // Recalculate whenever nodes/edges change
  const nodes = useStore((s) => s.nodes);
  const edges = useStore((s) => s.edges);
  const setSelectedNodeId = useStore((s) => s.setSelectedNodeId);

  useEffect(() => {
    recalculate();
  }, [nodes, edges, recalculate]);

  // Animation loop
  const lastFrameRef = useRef<number>(0);
  const rafRef = useRef<number>(0);

  const animate = useCallback(
    (timestamp: number) => {
      if (lastFrameRef.current > 0) {
        const delta = timestamp - lastFrameRef.current;
        tick(delta);
      }
      lastFrameRef.current = timestamp;
      rafRef.current = requestAnimationFrame(animate);
    },
    [tick],
  );

  useEffect(() => {
    if (isPlaying) {
      lastFrameRef.current = 0;
      rafRef.current = requestAnimationFrame(animate);
    } else {
      cancelAnimationFrame(rafRef.current);
    }
    return () => cancelAnimationFrame(rafRef.current);
  }, [isPlaying, animate]);

  // Highlight active node in the editor
  useEffect(() => {
    if (isPlaying && robotState?.activeNodeId) {
      setSelectedNodeId(robotState.activeNodeId);
    }
  }, [isPlaying, robotState?.activeNodeId, setSelectedNodeId]);

  const totalTime = prediction?.totalTime ?? 0;
  const totalDistance = prediction?.totalDistance ?? 0;
  const activeSegment =
    prediction && robotState && robotState.activeSegmentIndex >= 0
      ? prediction.segments[robotState.activeSegmentIndex]
      : null;

  return (
    <div className="simulation-panel">
      {/* Transport + Scrubber */}
      <div className="sim-transport">
        <button
          className="sim-btn"
          onClick={stop}
          title="Stop & Reset"
        >
          ⏹
        </button>
        <button
          className={`sim-btn ${isPlaying ? 'playing' : ''}`}
          onClick={isPlaying ? pause : play}
          title={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? '⏸' : '▶'}
        </button>

        <div className="sim-scrubber">
          <span className="sim-time">{formatTime(currentTime)}</span>
          <input
            type="range"
            className="sim-slider"
            min={0}
            max={totalTime || 1}
            step={0.01}
            value={currentTime}
            onChange={(e) => {
              if (isPlaying) pause();
              setCurrentTime(parseFloat(e.target.value));
            }}
          />
          <span className="sim-time total">{formatTime(totalTime)}</span>
        </div>

        <div className="sim-speed">
          {SPEED_OPTIONS.map((sp) => (
            <button
              key={sp}
              className={`speed-btn ${speedFactor === sp ? 'active' : ''}`}
              onClick={() => setSpeedFactor(sp)}
            >
              {sp}x
            </button>
          ))}
        </div>
      </div>

      {/* Info Row */}
      <div className="sim-info">
        <div className="sim-stat">
          <span className="sim-stat-label">Dist:</span>
          <span className="sim-stat-value">{totalDistance.toFixed(1)}&quot;</span>
        </div>
        <div className="sim-stat">
          <span className="sim-stat-label">Segs:</span>
          <span className="sim-stat-value">{prediction?.segments.length ?? 0}</span>
        </div>

        {activeSegment && (
          <div className="sim-segment">
            <span className={`sim-segment-kind ${activeSegment.kind}`}>
              {activeSegment.kind}
            </span>
            {robotState && (
              <span>
                ({robotState.position.x.toFixed(1)}, {robotState.position.y.toFixed(1)})
                &nbsp;{robotState.heading.toFixed(0)}°
              </span>
            )}
          </div>
        )}

        <button
          className="sim-settings-toggle"
          onClick={() => setShowSettings(!showSettings)}
        >
          {showSettings ? '▲ Hide' : '⚙ Settings'}
        </button>
      </div>

      {/* Settings */}
      {showSettings && (
        <div className="sim-settings">
          <div className="sim-setting-field">
            <span className="sim-setting-label">Max Vel</span>
            <input
              type="number"
              className="sim-setting-input"
              value={settings.maxVelocity}
              onChange={(e) =>
                updateSettings({ maxVelocity: parseFloat(e.target.value) || 1 })
              }
            />
            <span className="sim-setting-unit">in/s</span>
          </div>
          <div className="sim-setting-field">
            <span className="sim-setting-label">Max Acc</span>
            <input
              type="number"
              className="sim-setting-input"
              value={settings.maxAcceleration}
              onChange={(e) =>
                updateSettings({ maxAcceleration: parseFloat(e.target.value) || 1 })
              }
            />
            <span className="sim-setting-unit">in/s²</span>
          </div>
          <div className="sim-setting-field">
            <span className="sim-setting-label">Max Dec</span>
            <input
              type="number"
              className="sim-setting-input"
              value={settings.maxDeceleration ?? settings.maxAcceleration}
              onChange={(e) =>
                updateSettings({ maxDeceleration: parseFloat(e.target.value) || 1 })
              }
            />
            <span className="sim-setting-unit">in/s²</span>
          </div>
          <div className="sim-setting-field">
            <span className="sim-setting-label">Ang Vel</span>
            <input
              type="number"
              className="sim-setting-input"
              value={Math.round((settings.angularVelocity * 180) / Math.PI)}
              onChange={(e) =>
                updateSettings({
                  angularVelocity:
                    ((parseFloat(e.target.value) || 1) * Math.PI) / 180,
                })
              }
            />
            <span className="sim-setting-unit">°/s</span>
          </div>
        </div>
      )}
    </div>
  );
}
