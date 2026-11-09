// Every name, path, code and timing the mod uses, in one place.

export const MOD = "wtm";
export const WINDOW_KEY = "wtm";

export const WORKER_NAME = "herdr-app-wtm";
export const WORKER_LABEL = "herdr-app-wtm.script";
// Bump whenever worker.js's SCRIPT changes, so an updated mod replaces a running worker.
export const SCRIPT_VERSION = "1";

// Relative to the home folder.
export const STATE_DIR = ".local/state/herdr-app-wtm";
export const INBOX_DIR = `${STATE_DIR}/inbox`;

// wtm's `events` contract version this mod reads.
export const MIN_EVENTS = 1;

export const EVENT = {
  created: "worktree.created",
  removed: "worktree.removed",
  ready: "ready",
};
// Written by the worker after wtm exits: {"type": EXIT_EVENT, "code": n}.
export const EXIT_EVENT = "herdr-app-wtm.exit";
// 2: invalid invocation; 20: an event of a schema newer than this wtm. No retry changes them.
export const FINAL_EXIT_CODES = [2, 20];

export const BACKOFF_MIN_MS = 1_000;
export const BACKOFF_MAX_MS = 30_000;
// A claimed event file older than this was left by a copy that died.
export const STALE_CLAIM_MS = 60_000;
// Drains even if a watchFolder batch was missed.
export const FALLBACK_DRAIN_MS = 30_000;

export const STATE = {
  starting: "starting",
  listening: "listening",
  wtmMissing: "wtm-missing",
  wtmTooOld: "wtm-too-old",
  streamStopped: "stream-stopped",
  error: "error",
};

export const COMMAND = { stop: "stop" };
