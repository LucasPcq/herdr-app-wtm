import { STATE } from "./constants.js";

// The pill's whole look. Colours are theme names (keys of theme()), so the pill
// follows every theme. Edit this file to restyle it.

const DOT = {
  [STATE.starting]: "muted",
  [STATE.listening]: "accent",
  [STATE.wtmMissing]: "blocked",
  [STATE.wtmTooOld]: "blocked",
  [STATE.streamStopped]: "blocked",
  [STATE.error]: "blocked",
};

// Short like the bar's own buttons: the dot tells the state, the notification why.
const LABELS = {
  [STATE.starting]: "wtm",
  [STATE.listening]: "wtm",
  [STATE.wtmMissing]: "wtm",
  [STATE.wtmTooOld]: "wtm",
  [STATE.streamStopped]: "wtm",
  [STATE.error]: "wtm",
};

// Shown after the pointer rests on the pill: what the dot means and what a click does.
const TOOLTIPS = {
  [STATE.starting]: "wtm: starting worktree sync",
  [STATE.listening]: "wtm: spaces follow worktrees. Double-click to sync what is already there",
  [STATE.wtmMissing]: "wtm: not found on your PATH. Click to retry",
  [STATE.wtmTooOld]: "wtm: too old, run wtm upgrade. Click to retry",
  [STATE.streamStopped]: "wtm: event stream stopped. Click to retry",
  [STATE.error]: "wtm: sync stopped on an error. Click to retry",
};

// Matches Herdr's top-bar buttons (Files, Changes): 26 px high, 8 px padding,
// radius 6, 12 px text, the bar's own background.
export function style(theme) {
  return {
    // Where the pill first opens: in the top bar (42 px), just left of the "+"
    // button, whose left edge is 187 px from the window's right edge in Herdr's
    // main layout on macOS. Drag it anywhere afterwards; Herdr remembers the spot.
    position: { edge: "top", align: "end", inset: 8, margin: 190 },
    // Fixed, so the placement above is exact.
    width: 52,
    height: 26,
    padX: 8,
    gap: 5,
    radius: 6,
    border: 0,
    textSize: 12,
    dotSize: 6,
    background: theme.chrome,
    hoverBackground: theme.hover,
    foreground: theme.muted,
    hoverForeground: theme.foreground,
    borderColor: theme.border,
    dot: Object.fromEntries(Object.entries(DOT).map(([state, name]) => [state, theme[name]])),
    labels: LABELS,
    tooltips: TOOLTIPS,
  };
}
