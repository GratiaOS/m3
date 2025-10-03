/**
 * Timeline State Management Module
 *
 * This module manages the state related to the Timeline feature.
 * It provides types, state variables, and functions to get, set,
 * subscribe to changes, and reset the timeline state.
 */

import { TimelineItem } from '../components/Timeline';

export type TimelineState = {
  items: TimelineItem[];
  isLoading: boolean;
  error: string | null;
};

let state: TimelineState = {
  items: [],
  isLoading: false,
  error: null,
};

const listeners = new Set<(state: TimelineState) => void>();

export function getTimelineState(): TimelineState {
  return state;
}

export function setTimelineState(partial: Partial<TimelineState>): void {
  state = { ...state, ...partial };
  listeners.forEach((listener) => listener(state));
}

export function subscribeToTimeline(fn: (state: TimelineState) => void): () => void {
  listeners.add(fn);
  // Immediately call listener with current state
  fn(state);
  return () => {
    listeners.delete(fn);
  };
}

export function resetTimelineState(): void {
  state = {
    items: [],
    isLoading: false,
    error: null,
  };
  listeners.forEach((listener) => listener(state));
}
