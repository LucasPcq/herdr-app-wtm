import { EVENT } from "./constants.js";
import { inside } from "./paths.js";

// What a worktree event does to the window's local spaces. Pure: the host builds
// `world` and runs the returned actions.
export function decide({ event, world }) {
  const worktree = event.worktree;
  if (!worktree?.path || worktree.is_main) return [];
  const there = world.spaces.filter((space) => space.place && inside({ path: space.place, dir: worktree.path }));

  if (event.type === EVENT.created) {
    if (!world.pathExists || !world.repoShown || there.length > 0) return [];
    return [{ kind: "open", folder: worktree.path, reselect: world.focusedSpace ?? null }];
  }

  // Only a space made on the worktree closes: one made elsewhere (the main
  // checkout's, with its agents) whose terminal went into it stays.
  if (event.type === EVENT.removed) {
    if (world.pathExists) return [];
    return there.filter((space) => space.folder && inside({ path: space.folder, dir: worktree.path })).map((space) => ({ kind: "close", id: space.id }));
  }

  return [];
}

// A resync replays each snapshot's worktrees as created events: decide() opens the missing ones.
export function replay(snapshot) {
  if (!Array.isArray(snapshot.worktrees)) return [];
  return snapshot.worktrees.map((worktree) => ({ type: EVENT.created, repo: snapshot.repo, worktree }));
}

// A resync closes every local space whose folder and first terminal's folder are both gone.
export function sweep({ world }) {
  return world.spaces.filter((space) => space.gone).map((space) => ({ kind: "close", id: space.id }));
}
