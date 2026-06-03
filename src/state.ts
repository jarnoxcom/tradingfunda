import { AppState } from "./types";

// Initial state
export const state: AppState = {
  articles: [],
  market: null,
  activeCategory: "all",
  signals: [],
  aiBrief: [],
  lastFetch: 0,
  aiBriefLastUpdated: undefined,
  aiBriefLoading: false,
};

const subscribers: Array<(state: AppState) => void> = [];

export function subscribe(fn: (s: AppState) => void) {
  subscribers.push(fn);
  // Emit immediately to the new subscriber
  fn(state);
  return () => {
    const idx = subscribers.indexOf(fn);
    if (idx !== -1) subscribers.splice(idx, 1);
  };
}

export function setState(patch: Partial<AppState>) {
  Object.assign(state, patch);
  subscribers.forEach(fn => {
    try {
      fn(state);
    } catch (err) {
      console.error("Error in state subscriber callback:", err);
    }
  });
}

export function getState(): AppState {
  return state;
}
