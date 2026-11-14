import { useReducer, useEffect, useRef, useCallback } from 'react';
import {
  ScenarioId,
  NodeId,
  ChaosOptions,
  DEFAULT_CHAOS,
  ResolvedScenario,
  getResolvedScenario,
} from './scenarios';

export type EngineStatus =
  | 'idle'
  | 'launching'
  | 'ready'
  | 'running'
  | 'paused'
  | 'finished'
  | 'error'
  | 'closing';

export type PlaybackSpeed = 0.5 | 1 | 2;

export interface DemoEngineState {
  status: EngineStatus;
  scenarioId: ScenarioId;
  chaos: ChaosOptions;
  scenario: ResolvedScenario;
  speed: PlaybackSpeed;
  elapsedMs: number;
  progress: number; // 0.0 to 1.0
  activeStageIndex: number; // -1 to 4
  completedStageIndices: number[];
  failedStageIndex: number | null;
  selectedStageId: NodeId | null;
  logs: string[];
  firstTimeHintVisible: boolean;
}

type Action =
  | { type: 'LAUNCH' }
  | { type: 'LAUNCH_READY' }
  | { type: 'CLOSE' }
  | { type: 'CLOSE_DONE' }
  | { type: 'SEND_REQUEST' }
  | { type: 'PAUSE' }
  | { type: 'RESUME' }
  | { type: 'STEP' }
  | { type: 'REPLAY' }
  | { type: 'SEEK'; payload: { progress: number } }
  | { type: 'TICK'; payload: { deltaMs: number } }
  | { type: 'SET_SPEED'; payload: { speed: PlaybackSpeed } }
  | { type: 'SET_SCENARIO'; payload: { scenarioId: ScenarioId } }
  | { type: 'TOGGLE_CHAOS'; payload: { key: keyof ChaosOptions; value: ChaosOptions[keyof ChaosOptions] } }
  | { type: 'SELECT_STAGE'; payload: { stageId: NodeId | null } }
  | { type: 'DISMISS_HINT' };

function computeProgressState(
  scenario: ResolvedScenario,
  elapsedMs: number
): {
  progress: number;
  activeStageIndex: number;
  completedStageIndices: number[];
  failedStageIndex: number | null;
  logs: string[];
  isFinished: boolean;
  isError: boolean;
} {
  const total = scenario.totalDurationMs;
  const clampedElapsed = Math.max(0, Math.min(elapsedMs, total));
  const progress = total > 0 ? clampedElapsed / total : 0;

  let accumulated = 0;
  let activeIndex = -1;
  const completed: number[] = [];
  let failedIndex: number | null = null;
  const emittedLogs: string[] = [];

  for (let i = 0; i < scenario.stages.length; i++) {
    const stage = scenario.stages[i];
    const stageStart = accumulated;
    const stageEnd = accumulated + stage.durationMs;

    if (clampedElapsed >= stageEnd) {
      if (stage.status === 'ok') {
        completed.push(i);
        emittedLogs.push(stage.log);
      } else if (stage.status === 'error') {
        failedIndex = i;
        emittedLogs.push(stage.log);
        // Error stops execution
        break;
      }
      // skipped stages don't log or complete
    } else if (clampedElapsed >= stageStart) {
      activeIndex = i;
      emittedLogs.push(stage.log);
      if (stage.status === 'error' && clampedElapsed >= stageEnd - 80) {
        failedIndex = i;
      }
      break;
    }
    accumulated = stageEnd;
  }

  // Check terminal state
  const isError = failedIndex !== null;
  const isFinished = !isError && clampedElapsed >= total;

  return {
    progress,
    activeStageIndex: activeIndex,
    completedStageIndices: completed,
    failedStageIndex: failedIndex,
    logs: emittedLogs,
    isFinished,
    isError,
  };
}

function engineReducer(state: DemoEngineState, action: Action): DemoEngineState {
  switch (action.type) {
    case 'LAUNCH':
      if (state.status !== 'idle' && state.status !== 'closing') return state;
      return {
        ...state,
        status: 'launching',
      };

    case 'LAUNCH_READY':
      return {
        ...state,
        status: 'ready',
      };

    case 'CLOSE':
      return {
        ...state,
        status: 'closing',
      };

    case 'CLOSE_DONE':
      return {
        ...state,
        status: 'idle',
        elapsedMs: 0,
        progress: 0,
        activeStageIndex: -1,
        completedStageIndices: [],
        failedStageIndex: null,
        logs: [],
      };

    case 'SEND_REQUEST': {
      // Start or restart execution
      const resetScenario = getResolvedScenario(state.scenarioId, state.chaos);
      const computed = computeProgressState(resetScenario, 0);
      return {
        ...state,
        scenario: resetScenario,
        status: 'running',
        elapsedMs: 0,
        progress: 0,
        activeStageIndex: computed.activeStageIndex,
        completedStageIndices: computed.completedStageIndices,
        failedStageIndex: null,
        logs: computed.logs,
        firstTimeHintVisible: false,
      };
    }

    case 'PAUSE':
      if (state.status !== 'running') return state;
      return { ...state, status: 'paused' };

    case 'RESUME':
      if (state.status !== 'paused') return state;
      return { ...state, status: 'running' };

    case 'REPLAY': {
      const resetScenario = getResolvedScenario(state.scenarioId, state.chaos);
      const computed = computeProgressState(resetScenario, 0);
      return {
        ...state,
        scenario: resetScenario,
        status: 'running',
        elapsedMs: 0,
        progress: 0,
        activeStageIndex: computed.activeStageIndex,
        completedStageIndices: computed.completedStageIndices,
        failedStageIndex: null,
        logs: computed.logs,
      };
    }

    case 'STEP': {
      // Jump to next stage start boundary
      let currentAcc = 0;
      let nextTargetMs = state.scenario.totalDurationMs;
      for (let i = 0; i < state.scenario.stages.length; i++) {
        currentAcc += state.scenario.stages[i].durationMs;
        if (currentAcc > state.elapsedMs + 20) {
          nextTargetMs = currentAcc;
          break;
        }
      }
      const computed = computeProgressState(state.scenario, nextTargetMs);
      const nextStatus = computed.isError
        ? 'error'
        : computed.isFinished
        ? 'finished'
        : 'paused';

      return {
        ...state,
        status: nextStatus,
        elapsedMs: nextTargetMs,
        progress: computed.progress,
        activeStageIndex: computed.activeStageIndex,
        completedStageIndices: computed.completedStageIndices,
        failedStageIndex: computed.failedStageIndex,
        logs: computed.logs,
        firstTimeHintVisible: false,
      };
    }

    case 'SEEK': {
      const targetProgress = Math.max(0, Math.min(1, action.payload.progress));
      const targetElapsedMs = targetProgress * state.scenario.totalDurationMs;
      const computed = computeProgressState(state.scenario, targetElapsedMs);
      const nextStatus = computed.isError
        ? 'error'
        : computed.isFinished
        ? 'finished'
        : state.status === 'running'
        ? 'running'
        : 'paused';

      return {
        ...state,
        status: nextStatus,
        elapsedMs: targetElapsedMs,
        progress: targetProgress,
        activeStageIndex: computed.activeStageIndex,
        completedStageIndices: computed.completedStageIndices,
        failedStageIndex: computed.failedStageIndex,
        logs: computed.logs,
      };
    }

    case 'TICK': {
      if (state.status !== 'running') return state;
      const nextElapsed = state.elapsedMs + action.payload.deltaMs * state.speed;
      const computed = computeProgressState(state.scenario, nextElapsed);

      if (computed.isError) {
        return {
          ...state,
          status: 'error',
          elapsedMs: nextElapsed,
          progress: computed.progress,
          activeStageIndex: computed.activeStageIndex,
          completedStageIndices: computed.completedStageIndices,
          failedStageIndex: computed.failedStageIndex,
          logs: computed.logs,
        };
      }

      if (computed.isFinished) {
        return {
          ...state,
          status: 'finished',
          elapsedMs: state.scenario.totalDurationMs,
          progress: 1,
          activeStageIndex: 4,
          completedStageIndices: [0, 1, 2, 3, 4],
          failedStageIndex: null,
          logs: computed.logs,
        };
      }

      return {
        ...state,
        elapsedMs: nextElapsed,
        progress: computed.progress,
        activeStageIndex: computed.activeStageIndex,
        completedStageIndices: computed.completedStageIndices,
        failedStageIndex: null,
        logs: computed.logs,
      };
    }

    case 'SET_SPEED':
      return { ...state, speed: action.payload.speed };

    case 'SET_SCENARIO': {
      const nextScenario = getResolvedScenario(action.payload.scenarioId, state.chaos);
      return {
        ...state,
        scenarioId: action.payload.scenarioId,
        scenario: nextScenario,
        status: state.status === 'idle' ? 'idle' : 'ready',
        elapsedMs: 0,
        progress: 0,
        activeStageIndex: -1,
        completedStageIndices: [],
        failedStageIndex: null,
        logs: [],
      };
    }

    case 'TOGGLE_CHAOS': {
      const nextChaos = {
        ...state.chaos,
        [action.payload.key]: action.payload.value,
      };
      const nextScenario = getResolvedScenario(state.scenarioId, nextChaos);
      return {
        ...state,
        chaos: nextChaos,
        scenario: nextScenario,
        status: state.status === 'idle' ? 'idle' : 'ready',
        elapsedMs: 0,
        progress: 0,
        activeStageIndex: -1,
        completedStageIndices: [],
        failedStageIndex: null,
        logs: [],
      };
    }

    case 'SELECT_STAGE':
      return { ...state, selectedStageId: action.payload.stageId };

    case 'DISMISS_HINT':
      return { ...state, firstTimeHintVisible: false };

    default:
      return state;
  }
}

export function useDemoEngine(initialAutoOpen = false) {
  const initialScenario = getResolvedScenario('users', DEFAULT_CHAOS);

  const [state, dispatch] = useReducer(engineReducer, {
    status: initialAutoOpen ? 'launching' : 'idle',
    scenarioId: 'users',
    chaos: DEFAULT_CHAOS,
    scenario: initialScenario,
    speed: 1,
    elapsedMs: 0,
    progress: 0,
    activeStageIndex: -1,
    completedStageIndices: [],
    failedStageIndex: null,
    selectedStageId: null,
    logs: [],
    firstTimeHintVisible: true,
  });

  const lastTimeRef = useRef<number | null>(null);
  const rAFRef = useRef<number | null>(null);

  // RAF loop for timeline progression when 'running'
  useEffect(() => {
    if (state.status !== 'running') {
      if (rAFRef.current) {
        cancelAnimationFrame(rAFRef.current);
        rAFRef.current = null;
      }
      lastTimeRef.current = null;
      return;
    }

    const loop = (timestamp: number) => {
      if (lastTimeRef.current !== null) {
        const delta = timestamp - lastTimeRef.current;
        // Cap max delta at 100ms to prevent huge jumps when switching tabs
        const safeDelta = Math.min(delta, 100);
        dispatch({ type: 'TICK', payload: { deltaMs: safeDelta } });
      }
      lastTimeRef.current = timestamp;
      rAFRef.current = requestAnimationFrame(loop);
    };

    rAFRef.current = requestAnimationFrame(loop);

    return () => {
      if (rAFRef.current) {
        cancelAnimationFrame(rAFRef.current);
        rAFRef.current = null;
      }
      lastTimeRef.current = null;
    };
  }, [state.status, state.speed]);

  // Clean transition timers for launching & closing
  useEffect(() => {
    if (state.status === 'launching') {
      const timer = setTimeout(() => {
        dispatch({ type: 'LAUNCH_READY' });
      }, 1400); // 1.4s cinematic entry transition
      return () => clearTimeout(timer);
    }
    if (state.status === 'closing') {
      const timer = setTimeout(() => {
        dispatch({ type: 'CLOSE_DONE' });
      }, 800); // 0.8s exit transition
      return () => clearTimeout(timer);
    }
  }, [state.status]);

  // Actions
  const launch = useCallback(() => dispatch({ type: 'LAUNCH' }), []);
  const close = useCallback(() => dispatch({ type: 'CLOSE' }), []);
  const sendRequest = useCallback(() => dispatch({ type: 'SEND_REQUEST' }), []);
  const pause = useCallback(() => dispatch({ type: 'PAUSE' }), []);
  const resume = useCallback(() => dispatch({ type: 'RESUME' }), []);
  const togglePlayPause = useCallback(() => {
    if (state.status === 'running') {
      dispatch({ type: 'PAUSE' });
    } else if (state.status === 'paused') {
      dispatch({ type: 'RESUME' });
    } else {
      dispatch({ type: 'SEND_REQUEST' });
    }
  }, [state.status]);
  const step = useCallback(() => dispatch({ type: 'STEP' }), []);
  const replay = useCallback(() => dispatch({ type: 'REPLAY' }), []);
  const seek = useCallback((progress: number) => dispatch({ type: 'SEEK', payload: { progress } }), []);
  const setSpeed = useCallback((speed: PlaybackSpeed) => dispatch({ type: 'SET_SPEED', payload: { speed } }), []);
  const setScenario = useCallback((scenarioId: ScenarioId) => dispatch({ type: 'SET_SCENARIO', payload: { scenarioId } }), []);
  const toggleChaos = useCallback(<K extends keyof ChaosOptions>(key: K, value: ChaosOptions[K]) => dispatch({ type: 'TOGGLE_CHAOS', payload: { key, value } }), []);
  const selectStage = useCallback((stageId: NodeId | null) => dispatch({ type: 'SELECT_STAGE', payload: { stageId } }), []);
  const dismissHint = useCallback(() => dispatch({ type: 'DISMISS_HINT' }), []);

  return {
    state,
    launch,
    close,
    sendRequest,
    pause,
    resume,
    togglePlayPause,
    step,
    replay,
    seek,
    setSpeed,
    setScenario,
    toggleChaos,
    selectStage,
    dismissHint,
  };
}
