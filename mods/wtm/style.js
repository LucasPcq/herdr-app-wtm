import { STATE } from "./constants.js";

// The button's and the pane's whole look. Colours are theme names (keys of
// theme()), so both follow every theme. Edit this file to restyle them.

const ICONS = "mods/wtm/icons";
export const ICON = {
  branch: `${ICONS}/git-branch.svg`,
  plus: `${ICONS}/plus.svg`,
  terminal: `${ICONS}/terminal.svg`,
  key: `${ICONS}/key-round.svg`,
  scissors: `${ICONS}/scissors.svg`,
  refresh: `${ICONS}/refresh-cw.svg`,
  resync: `${ICONS}/folder-sync.svg`,
  more: `${ICONS}/ellipsis.svg`,
  alert: `${ICONS}/circle-alert.svg`,
  down: `${ICONS}/chevron-down.svg`,
  right: `${ICONS}/chevron-right.svg`,
  open: `${ICONS}/external-link.svg`,
  stop: `${ICONS}/square.svg`,
  play: `${ICONS}/play.svg`,
  logs: `${ICONS}/list.svg`,
};

// Shown after the pointer rests on the button: what the state means and what a click does.
const TOOLTIPS = {
  [STATE.starting]: "wtm: starting worktree sync. Click to open the worktrees pane",
  [STATE.listening]: "wtm: click to open the worktrees pane",
  [STATE.wtmMissing]: "wtm: not found on your PATH. Click to open the pane and retry",
  [STATE.wtmTooOld]: "wtm: too old, run wtm upgrade. Click to open the pane and retry",
  [STATE.streamStopped]: "wtm: event stream stopped. Click to open the pane and retry",
  [STATE.error]: "wtm: sync stopped on an error. Click to open the pane and retry",
};

// Matches Herdr's top-bar buttons (Files, Changes): 26 px high, 8 px padding,
// gap 5, radius 6, 12 px text, a 14 px icon, the bar's own background.
export function button(theme) {
  return {
    // Where the button first opens: in the top bar (42 px), just left of the "+"
    // button, whose left edge is 187 px from the window's right edge in Herdr's
    // main layout on macOS. Drag it anywhere afterwards; Herdr remembers the spot.
    position: { edge: "top", align: "end", inset: 8, margin: 190 },
    // Fixed, so the placement above is exact.
    width: 60,
    height: 26,
    padX: 8,
    gap: 5,
    radius: 6,
    textSize: 12,
    icon: ICON.branch,
    iconSize: 14,
    label: "wtm",
    background: theme.chrome,
    hoverBackground: theme.hover,
    foreground: theme.muted,
    hoverForeground: theme.foreground,
    onBackground: theme.selected,
    onForeground: theme.foreground,
    blockedIcon: theme.blocked,
    tooltips: TOOLTIPS,
  };
}

// shadcn's rules on a 4 px grid: 16 padding, 24 between sections, 8 inside a
// group, 32 px rows, 14/12 text, radii 6 (rows, badges) 8 (buttons) 12 (card).
export function pane(theme) {
  return {
    padding: 16,
    sectionGap: 24,
    groupGap: 8,
    rowHeight: 32,
    smallButtonHeight: 28,
    tinyButtonHeight: 24,
    labelHeight: 32,
    textSize: 14,
    smallTextSize: 12,
    descriptionSize: 13,
    titleSize: 15,
    rowRadius: 6,
    buttonRadius: 8,
    cardRadius: 12,
    badgeHeight: 20,
    dotSize: 8,
    iconSize: 16,
    smallIconSize: 14,
    indent: 12,
    background: theme.background,
    card: theme.surface,
    border: theme.border,
    input: theme.input,
    hover: theme.hover,
    selected: theme.selected,
    foreground: theme.foreground,
    muted: theme.muted,
    dim: theme.dim,
    primary: theme.solid,
    primaryForeground: theme.solid_foreground,
    running: theme.ansi2,
    starting: theme.ansi3,
    needsSync: theme.ansi3,
    crashed: theme.blocked,
    stopped: theme.dim,
    problem: theme.blocked,
    labels: {
      new: "New",
      exec: "Exec",
      env: "Env",
      prune: "Prune",
      refresh: "Refresh",
      resync: "Resync spaces",
      context: "This worktree",
      stacks: "Stacks",
      elsewhere: "Running elsewhere",
      running: "Running",
      from: "from",
      shared: "shared",
      sharedFrom: "from",
      stopped: "stopped",
      exit: "exit",
      modified: "modified",
      needsSync: "needs sync",
      sync: "Sync",
      fix: "Fix",
      up: "Up",
      down: "Down",
      logs: "Logs",
      reparent: "Reparent",
      clean: "Clean",
      retry: "Retry",
      noRepo: "Open the pane in a space of the repository",
      jobs: (n) => (n === 1 ? "1 job" : `${n} jobs`),
    },
  };
}
