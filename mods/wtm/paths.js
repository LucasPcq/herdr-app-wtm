export function normalize(path) {
  const trimmed = path.replace(/\/+$/, "");
  return trimmed === "" && path.startsWith("/") ? "/" : trimmed;
}

export function inside(path, dir) {
  const p = normalize(path);
  const d = normalize(dir);
  return p === d || p.startsWith(d === "/" ? "/" : `${d}/`);
}

// Where a space is now: its first terminal's live folder, else where it was made.
export function placeOf(space, panes) {
  const tabs = new Set((space.tabs ?? []).map((tab) => tab.id));
  return panes.find((pane) => tabs.has(pane.tab) && pane.cwd)?.cwd || space.folder || null;
}
