import { create } from 'zustand';
import type { RobotSettings, TimePrediction, RobotState } from '../types/simulation';
import { DEFAULT_ROBOT_SETTINGS } from '../types/simulation';
import { calculatePathTime, getRobotStateAtTime } from '../utils/timeCalculator';
import { useStore } from './useStore';

interface SimulationState {
  /** Whether the simulation is currently playing */
  isPlaying: boolean;
  /** Current time in seconds within the simulation */
  currentTime: number;
  /** Playback speed multiplier (1.0 = realtime) */
  speedFactor: number;
  /** Robot motion settings */
  settings: RobotSettings;
  /** Cached time prediction */
  prediction: TimePrediction | null;
  /** The interpolated robot state at currentTime */
  robotState: RobotState | null;

  // Actions
  play: () => void;
  pause: () => void;
  stop: () => void;
  togglePlayPause: () => void;
  setCurrentTime: (time: number) => void;
  setSpeedFactor: (factor: number) => void;
  updateSettings: (settings: Partial<RobotSettings>) => void;
  recalculate: () => void;
  tick: (deltaMs: number) => void;
}

export const useSimulationStore = create<SimulationState>((set, get) => ({
  isPlaying: false,
  currentTime: 0,
  speedFactor: 1.0,
  settings: { ...DEFAULT_ROBOT_SETTINGS },
  prediction: null,
  robotState: null,

  play: () => {
    get().recalculate();
    set({ isPlaying: true });
  },

  pause: () => set({ isPlaying: false }),

  stop: () => {
    set({ isPlaying: false, currentTime: 0 });
    const prediction = get().prediction;
    if (prediction) {
      set({ robotState: getRobotStateAtTime(prediction, 0) });
    }
  },

  togglePlayPause: () => {
    if (get().isPlaying) {
      get().pause();
    } else {
      get().play();
    }
  },

  setCurrentTime: (time) => {
    const prediction = get().prediction;
    const totalTime = prediction?.totalTime ?? 0;
    const clampedTime = Math.max(0, Math.min(time, totalTime));
    set({
      currentTime: clampedTime,
      robotState: prediction ? getRobotStateAtTime(prediction, clampedTime) : null,
    });
  },

  setSpeedFactor: (factor) => set({ speedFactor: factor }),

  updateSettings: (partial) => {
    set({ settings: { ...get().settings, ...partial } });
    get().recalculate();
  },

  recalculate: () => {
    const { nodes, edges } = useStore.getState();
    const settings = get().settings;
    const prediction = calculatePathTime(nodes, edges, settings);
    const currentTime = Math.min(get().currentTime, prediction.totalTime);
    const robotState = getRobotStateAtTime(prediction, currentTime);
    set({ prediction, currentTime, robotState });
  },

  tick: (deltaMs) => {
    const { isPlaying, currentTime, speedFactor, prediction } = get();
    if (!isPlaying || !prediction) return;

    const deltaSec = (deltaMs / 1000) * speedFactor;
    let nextTime = currentTime + deltaSec;

    if (nextTime >= prediction.totalTime) {
      nextTime = prediction.totalTime;
      set({
        currentTime: nextTime,
        isPlaying: false,
        robotState: getRobotStateAtTime(prediction, nextTime),
      });
    } else {
      set({
        currentTime: nextTime,
        robotState: getRobotStateAtTime(prediction, nextTime),
      });
    }
  },
}));
