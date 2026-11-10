// What a click on the button does to the active tab: open the pane beside the
// focused pane, or close the one already there. Pure.

export function toggle({ focused, panes, mod }) {
  const tab = focused?.tab;
  if (!tab) return null;
  const open = panes.find((pane) => pane.mod === mod && pane.tab === tab);
  if (open) return { kind: "close", pane: open.pane };
  const beside = focused.pane ?? panes.find((pane) => pane.tab === tab)?.pane;
  return beside ? { kind: "open", pane: beside, tab } : null;
}

export function paneOpen({ focused, panes, mod }) {
  return Boolean(focused?.tab) && panes.some((pane) => pane.mod === mod && pane.tab === focused.tab);
}
