import { WTM_BIN } from "./constants.js";
import { parse } from "./inbox.js";

// wtm's on-demand JSON outputs, decoded into the shapes the pane reads. Anything
// malformed (a failed command, a notice, an older wtm) decodes to the empty value.

export function decodeStatus(stdout) {
  const status = parse(stdout);
  if (!status) return null;
  return {
    isolation: typeof status.isolation === "string" ? status.isolation : null,
    problems: list(status.problems)
      // A fix runs in a shell when clicked: only wtm's own commands.
      .filter((problem) => typeof problem?.fix === "string" && problem.fix.startsWith(`${WTM_BIN} `))
      .map((problem) => ({ code: problem.code ?? null, message: problem.message ?? "", fix: problem.fix })),
    missingEnv: list(status.env?.missing).filter((name) => typeof name === "string"),
  };
}

export function decodeTree(stdout) {
  const tree = parse(stdout);
  return Object.fromEntries(list(tree?.roots).flatMap(flatten));
}

function flatten(node) {
  const children = list(node?.children).flatMap(flatten);
  if (!node?.path || node.is_virtual) return children;
  const status = node.status ?? {};
  const pr = node.pr?.number ? { number: node.pr.number, state: node.pr.state ?? null, url: webUrl(node.pr.url) } : null;
  return [[node.path, { ahead: status.commits_ahead ?? 0, dirty: status.is_dirty === true, needsSync: status.needs_sync === true, pr }], ...children];
}

export function decodeProfiles(stdout) {
  return list(parse(stdout)?.profile)
    .filter((profile) => profile?.name)
    .map((profile) => ({ name: profile.name, jobs: list(profile.jobs), default: profile.default === true }));
}

export function decodePs(stdout) {
  return list(parseArray(stdout))
    .filter((job) => job?.name && job.branch)
    .map((job) => ({ name: job.name, branch: job.branch, path: job.path ?? null, status: job.status ?? null, startedAt: Number.isNaN(Date.parse(job.started_at)) ? null : Date.parse(job.started_at) }));
}

export function decodePrune(stdout) {
  return list(parse(stdout)?.pruned).length;
}

// An address the pane may hand to `open`: http or https only.
export function webUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? value : null;
  } catch {
    return null;
  }
}

function parseArray(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function list(value) {
  return Array.isArray(value) ? value : [];
}
