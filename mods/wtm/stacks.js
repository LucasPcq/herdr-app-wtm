import { JOB_STATE } from "./constants.js";
import { inside, normalize } from "./paths.js";

// What the pane shows, derived from the model and wtm's on-demand outputs. Pure.

const UP = new Set([JOB_STATE.running, JOB_STATE.starting]);

export function running({ jobs }) {
  return Object.values(jobs ?? {}).filter((job) => UP.has(job.state)).length;
}

// Parents before their children, siblings by name. A parent with no worktree is a
// virtual root; worktrees only reachable through a cycle start their own root.
export function forest({ repo }) {
  const worktrees = Object.values(repo.worktrees);
  const byBranch = new Set(worktrees.map((worktree) => worktree.branch));
  const childrenOf = (branch) => worktrees.filter((worktree) => worktree.parent === branch).sort(byName);
  const visited = new Set();
  const walk = ({ worktree, depth }) => {
    if (visited.has(worktree.branch)) return [];
    visited.add(worktree.branch);
    return [{ branch: worktree.branch, path: worktree.path, depth, virtual: false }, ...childrenOf(worktree.branch).flatMap((child) => walk({ worktree: child, depth: depth + 1 }))];
  };

  const roots = worktrees.filter((worktree) => !worktree.parent).sort((a, b) => Number(b.isMain) - Number(a.isMain) || byName(a, b));
  const virtual = [...new Set(worktrees.map((worktree) => worktree.parent).filter((parent) => parent && !byBranch.has(parent)))].sort();
  const rows = [
    ...roots.flatMap((worktree) => walk({ worktree, depth: 0 })),
    ...virtual.flatMap((branch) => [{ branch, path: null, depth: 0, virtual: true }, ...childrenOf(branch).flatMap((child) => walk({ worktree: child, depth: 1 }))]),
  ];
  const cycled = worktrees.filter((worktree) => !visited.has(worktree.branch)).sort(byName);
  return [...rows, ...cycled.flatMap((worktree) => walk({ worktree, depth: 0 }))];
}

function byName(a, b) {
  return a.branch.localeCompare(b.branch);
}

export function indicator({ worktree, tree }) {
  if (Object.values(worktree.jobs ?? {}).some((job) => job.state === JOB_STATE.crashed)) return { kind: "crashed" };
  if (tree?.[worktree.path]?.needsSync) return { kind: "needsSync" };
  const count = running({ jobs: worktree.jobs });
  return count > 0 ? { kind: "running", count } : null;
}

export function contextOf({ model, folder }) {
  if (!folder) return null;
  const matches = Object.values(model.repos).flatMap((repo) =>
    Object.values(repo.worktrees)
      .filter((worktree) => worktree.path && inside({ path: folder, dir: worktree.path }))
      .map((worktree) => ({ commonDir: repo.commonDir, branch: worktree.branch, length: normalize(worktree.path).length })),
  );
  if (matches.length === 0) return null;
  const best = matches.reduce((a, b) => (b.length > a.length ? b : a));
  return { commonDir: best.commonDir, branch: best.branch };
}

export function actionRepo({ context, shown }) {
  if (context) return context.commonDir;
  return shown.length === 1 ? shown[0] : null;
}

export function activeProfile({ profiles, jobs }) {
  const up = profiles.find((profile) => profile.jobs.length > 0 && profile.jobs.every((name) => UP.has(jobs?.[name]?.state)));
  return (up ?? profiles.find((profile) => profile.default) ?? profiles[0])?.name ?? null;
}

export function elsewhere({ model, shown }) {
  const hidden = Object.values(model.repos)
    .filter((repo) => !shown.includes(repo.commonDir))
    .sort((a, b) => (a.root ?? "").localeCompare(b.root ?? ""));
  return hidden.flatMap((repo) =>
    Object.values(repo.worktrees)
      .sort(byName)
      .map((worktree) => ({ commonDir: repo.commonDir, root: repo.root, branch: worktree.branch, path: worktree.path, running: running({ jobs: worktree.jobs }) }))
      .filter((row) => row.running > 0),
  );
}

// How long something has run, the way the pane shows it: "12 min", "6 h", "3 d".
export function age({ since, now }) {
  if (since == null) return null;
  const minutes = Math.max(1, Math.floor((now - since) / 60_000));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  return hours < 24 ? `${hours} h` : `${Math.floor(hours / 24)} d`;
}
