import { EVENT } from "./constants.js";
import { inside } from "./paths.js";

// What a worktree event does to the window's local spaces. Pure: the host builds
// `world` and runs the returned actions.
export function decide(event, world) {
  const worktree = event.worktree;
  if (!worktree?.path || worktree.is_main) return [];
  const there = world.spaces.filter((space) => space.place && inside(space.place, worktree.path));

  if (event.type === EVENT.created) {
    if (!world.pathExists || !world.repoShown || there.length > 0) return [];
    return [{ kind: "open", folder: worktree.path, reselect: world.focusedSpace ?? null }];
  }

  if (event.type === EVENT.removed) {
    if (world.pathExists) return [];
    return there.map((space) => ({ kind: "close", id: space.id }));
  }

  return [];
}
