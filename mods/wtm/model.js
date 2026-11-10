import { EVENT, JOB_STATE } from "./constants.js";
import { webUrl } from "./decode.js";

// Every repository's worktrees and jobs, folded from wtm's events. Pure and
// JSON-shaped: the service copy publishes it with setShared.

export const EMPTY_MODEL = { repos: {} };

// The model a previous copy published (shared() persists), or null.
export function seed(stored) {
  const repos = stored?.repos;
  return repos && typeof repos === "object" && !Array.isArray(repos) ? stored : null;
}

const UPSERTS = new Set([EVENT.created, EVENT.updated, EVENT.reparented, EVENT.relocated]);
const JOB_STATES = {
  [EVENT.jobStarted]: JOB_STATE.running,
  [EVENT.jobStopped]: JOB_STATE.stopped,
  [EVENT.jobExited]: JOB_STATE.stopped,
  [EVENT.jobCrashed]: JOB_STATE.crashed,
};

export function reduce({ model, event }) {
  const type = event?.type;
  const commonDir = event?.repo?.common_dir;
  if (!commonDir) return model;
  const repo = model.repos[commonDir] ?? { root: event.repo.root ?? null, commonDir, worktrees: {} };

  if (type === EVENT.snapshot) return withRepo({ model, repo: { ...repo, worktrees: snapshotWorktrees(event.worktrees) } });
  if (type === EVENT.repoAdded) return model.repos[commonDir] ? model : withRepo({ model, repo });
  if (type === EVENT.repoRemoved) return withoutRepo({ model, commonDir });

  const branch = event.worktree?.branch;
  if (!branch) return model;
  if (UPSERTS.has(type)) {
    const current = repo.worktrees[branch];
    return withRepo({ model, repo: withWorktree({ repo, worktree: { ...worktreeOf(event.worktree), jobs: current?.jobs ?? {} } }) });
  }
  if (type === EVENT.removed) {
    const { [branch]: _gone, ...worktrees } = repo.worktrees;
    return withRepo({ model, repo: { ...repo, worktrees } });
  }
  if (!(type in JOB_STATES) || !event.job?.name) return model;
  const job = { ...jobOf(event.job), state: JOB_STATES[type], exitCode: type === EVENT.jobCrashed ? (event.exit_code ?? null) : null };
  const holders = [event.worktree, ...(Array.isArray(event.held_by) ? event.held_by : [])].filter((holder) => holder?.branch);
  return withRepo({ model, repo: holders.reduce((acc, holder) => withJob({ repo: acc, holder, job }), repo) });
}

function snapshotWorktrees(list) {
  if (!Array.isArray(list)) return {};
  return Object.fromEntries(
    list
      .filter((worktree) => worktree?.branch)
      .map((worktree) => [
        worktree.branch,
        { ...worktreeOf(worktree), jobs: Object.fromEntries((Array.isArray(worktree.jobs) ? worktree.jobs : []).filter((job) => job?.name).map((job) => [job.name, jobOf(job)])) },
      ]),
  );
}

function worktreeOf(worktree) {
  return { branch: worktree.branch, path: worktree.path ?? null, parent: worktree.parent || null, isMain: worktree.is_main === true };
}

function jobOf(job) {
  return {
    name: job.name,
    kind: job.kind ?? null,
    state: job.state ?? JOB_STATE.stopped,
    url: webUrl(job.url),
    shared: job.shared === true,
    exitCode: job.exit_code ?? null,
  };
}

function withJob({ repo, holder, job }) {
  const current = repo.worktrees[holder.branch] ?? { branch: holder.branch, path: holder.path ?? null, parent: null, isMain: false, jobs: {} };
  return withWorktree({ repo, worktree: { ...current, jobs: { ...current.jobs, [job.name]: job } } });
}

function withWorktree({ repo, worktree }) {
  return { ...repo, worktrees: { ...repo.worktrees, [worktree.branch]: worktree } };
}

function withRepo({ model, repo }) {
  return { ...model, repos: { ...model.repos, [repo.commonDir]: repo } };
}

function withoutRepo({ model, commonDir }) {
  if (!model.repos[commonDir]) return model;
  const { [commonDir]: _gone, ...repos } = model.repos;
  return { ...model, repos };
}
