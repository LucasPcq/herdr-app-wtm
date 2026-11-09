import { exec, focused, panes, spaces } from "herdr";
import { EVENT } from "./constants.js";
import { normalize, placeOf } from "./paths.js";

// What decide() needs to know about the window for one event. `cache` maps a
// folder to its repository's git common dir (null outside git), for the copy's life.
export async function buildWorld(event, cache) {
  const allPanes = panes();
  const local = spaces()
    .filter((space) => space.machine == null)
    .map((space) => ({ id: space.id, folder: space.folder, place: placeOf(space, allPanes) }));
  return {
    spaces: local,
    focusedSpace: focused()?.space ?? null,
    pathExists: await exists(event.worktree.path),
    repoShown: event.type === EVENT.created && (await repoShown(event.repo?.common_dir, local, cache)),
  };
}

// exec, not fs: fs reads only inside the home folder, a worktree may live anywhere.
async function exists(path) {
  return (await exec("test", ["-e", path])).code === 0;
}

async function repoShown(commonDir, local, cache) {
  if (!commonDir) return false;
  for (const { place } of local) {
    if (!place) continue;
    if (!cache.has(place)) cache.set(place, await commonDirOf(place));
    const dir = cache.get(place);
    if (dir && normalize(dir) === normalize(commonDir)) return true;
  }
  return false;
}

async function commonDirOf(folder) {
  try {
    const result = await exec("git", ["rev-parse", "--path-format=absolute", "--git-common-dir"], { cwd: folder });
    return result.code === 0 ? result.stdout.trim() : null;
  } catch {
    return null;
  }
}
