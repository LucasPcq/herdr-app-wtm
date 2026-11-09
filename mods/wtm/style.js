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

const LABELS = {
  [STATE.starting]: "wtm",
  [STATE.listening]: "wtm",
  [STATE.wtmMissing]: "wtm · not found",
  [STATE.wtmTooOld]: "wtm · upgrade wtm",
  [STATE.streamStopped]: "wtm · stopped",
  [STATE.error]: "wtm · error",
};

export function style(theme) {
  return {
    height: 26,
    padX: 10,
    gap: 6,
    radius: 13,
    border: 1,
    textSize: 11.5,
    dotSize: 7,
    background: theme.popover,
    foreground: theme.muted,
    borderColor: theme.border,
    dot: Object.fromEntries(Object.entries(DOT).map(([state, name]) => [state, theme[name]])),
    labels: LABELS,
  };
}
