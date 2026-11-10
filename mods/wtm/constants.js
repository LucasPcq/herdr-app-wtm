// Every name, path, code and timing the mod uses, in one place.

export const MOD = "wtm";
export const WINDOW_KEY = "wtm";

export const WORKER_NAME = "herdr-app-wtm";
export const WORKER_LABEL = "herdr-app-wtm.script";
// Bump whenever worker.js's SCRIPT changes, so an updated mod replaces a running worker.
export const SCRIPT_VERSION = "2";
// Each worker run's id, also carried by its exit marker: a marker from another run is stale.
export const RUN_LABEL = "herdr-app-wtm.run";

// Relative to the home folder.
export const STATE_DIR = ".local/state/herdr-app-wtm";
export const INBOX_DIR = `${STATE_DIR}/inbox`;

// wtm's `events` contract version this mod reads.
export const MIN_EVENTS = 1;

export const EVENT = {
  created: "worktree.created",
  removed: "worktree.removed",
  snapshot: "snapshot",
  ready: "ready",
  updated: "worktree.updated",
  reparented: "worktree.reparented",
  relocated: "worktree.relocated",
  repoAdded: "repo.added",
  repoRemoved: "repo.removed",
  jobStarted: "job.started",
  jobStopped: "job.stopped",
  jobExited: "job.exited",
  jobCrashed: "job.crashed",
};

export const JOB_STATE = { starting: "starting", running: "running", crashed: "crashed", stopped: "stopped" };
// Written by the worker after wtm exits: {"type": EXIT_EVENT, "code": n}.
export const EXIT_EVENT = "herdr-app-wtm.exit";
// 2: invalid invocation; 20: an event of a schema newer than this wtm. No retry changes them.
export const FINAL_EXIT_CODES = [2, 20];

export const BACKOFF_MIN_MS = 1_000;
export const BACKOFF_MAX_MS = 30_000;
// A claimed event file older than this was left by a copy that died.
export const STALE_CLAIM_MS = 60_000;
// The launcher's share of the window on each axis: mod.json's overlay width and
// height (1 would read as one pixel). Its measured size divided by this is the window's.
export const LAUNCHER_SHARE = 0.5;
// How long the launcher waits for the window's size before opening the pill unplaced.
export const LAUNCH_TIMEOUT_MS = 1_000;
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

export const COMMAND = { stop: "stop", sync: "sync", retry: "retry" };

// Keys of shared(): what the service copy publishes for the pane.
export const SHARED = { model: "wtm.model", status: "wtm.status" };

export const WTM_BIN = "wtm";
export const NOTIFY_TITLE = "wtm";

// Notification bodies, shown once when the pill enters a blocked state.
export const MESSAGES = {
  [STATE.wtmMissing]: "wtm is not on your PATH, so worktrees do not sync. Install it (brew install LucasPcq/tap/wtm), then click the wtm pill.",
  [STATE.wtmTooOld]: "This wtm has no event stream. Upgrade it (wtm upgrade), then click the wtm pill.",
  stopped: (code) =>
    code === 20
      ? "wtm received an event newer than itself and stopped. Upgrade wtm, then click the wtm pill."
      : `wtm events stopped (exit ${code}). Click the wtm pill to start it again.`,
  error: (detail) => `Worktree sync stopped: ${detail}. Click the wtm pill to retry.`,
};
