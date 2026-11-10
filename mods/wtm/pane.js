// The worktrees pane: a mod pane beside the terminals, opened by the button.
// Live data comes from the service copy's shared model; the rest is loaded
// with wtm on open and on refresh, never on a timer.

import { div, svg } from "gpui-kit";
import { h_flex, v_flex } from "gpui-base";
import { exec, notify, props, run, shared, spaces, theme } from "herdr";
import { COMMAND, LONG_EXEC_MS, MESSAGES, MOD, NOTIFY_TITLE, SHARED, STATE, WTM_BIN } from "./constants.js";
import { decodePrune, decodePs, decodeTree } from "./decode.js";
import { EMPTY_MODEL } from "./model.js";
import { actionRepo, age, contextOf, elsewhere, forest, indicator } from "./stacks.js";
import { ICON, pane as paneStyle } from "./style.js";
import { shownCommonDirs } from "./world.js";

export const BLOCKED = new Set([STATE.wtmMissing, STATE.wtmTooOld, STATE.streamStopped, STATE.error]);

export function message({ state, detail }) {
  if (state === STATE.streamStopped) return MESSAGES.stopped(detail);
  if (state === STATE.error) return MESSAGES.error(detail);
  return MESSAGES[state];
}

export class Pane {
  init(cx) {
    this.cache = new Map();
    this.shown = [];
    this.trees = {};
    this.ps = [];
    this.prune = 0;
    this.elsewhereOpen = true;
    this.refresh(cx);
  }

  folder() {
    const space = spaces().find((candidate) => candidate.machine == null && candidate.tabs.some((tab) => tab.id === props()?.tab));
    return space?.folder || null;
  }

  // What every section reads, computed once per render.
  view() {
    const model = shared(SHARED.model) ?? EMPTY_MODEL;
    const context = contextOf({ model, folder: this.folder() });
    const repoDir = actionRepo({ context, shown: this.shown.filter((dir) => model.repos[dir]) });
    return { model, context, repo: repoDir ? model.repos[repoDir] : null };
  }

  refresh(cx) {
    cx.spawn(async (cx) => {
      this.shown = await shownCommonDirs({ cache: this.cache });
      cx.notify();
      const { model, repo } = this.view();
      const roots = this.shown.map((dir) => model.repos[dir]).filter(Boolean);
      const [trees, ps, prune] = await Promise.all([
        loadTrees({ repos: roots, withPrs: false }),
        wtm({ args: ["run", "ps", "--output", "json"] }).then(decodePs),
        repo ? wtm({ args: ["prune", "--dry-run", "--no-fetch", "--yes", "--output", "json"], cwd: repo.root, timeout: LONG_EXEC_MS }).then(decodePrune) : 0,
      ]);
      this.trees = trees;
      this.ps = ps;
      this.prune = prune;
      cx.notify();
      // PRs ask GitHub: shown once they come.
      this.trees = await loadTrees({ repos: roots, withPrs: true });
      cx.notify();
    });
  }

  render(cx) {
    const s = paneStyle(theme());
    const status = shared(SHARED.status) ?? null;
    const view = this.view();
    const away = elsewhere({ model: view.model, shown: this.shown });
    return v_flex()
      .id("wtm-pane")
      .size_full()
      .bg(s.background)
      .text_color(s.foreground)
      .text_size(s.textSize)
      .p(s.padding)
      .gap(s.sectionGap)
      .overflow_y_scrollbar()
      .when(BLOCKED.has(status?.state), (el) => el.child(blockedAlert({ s, status })))
      .child(this.actions({ s, view, cx }))
      .child(this.stacks({ s, view }))
      .when(away.length > 0, (el) => el.child(this.elsewhere({ s, rows: away })));
  }

  actions({ s, view, cx }) {
    const repo = view.repo;
    const disabled = !repo;
    const tooltip = disabled ? s.labels.noRepo : null;
    const open = (args) => () => openTerminal({ args, folder: repo.root });
    return h_flex()
      .gap(s.groupGap)
      .items_center()
      .child(outlineButton({ s, id: "new", label: s.labels.new, icon: ICON.plus, onClick: open(["create"]), disabled, tooltip }))
      .child(outlineButton({ s, id: "exec", label: s.labels.exec, icon: ICON.terminal, onClick: open(["exec"]), disabled, tooltip }))
      .child(outlineButton({ s, id: "env", label: s.labels.env, icon: ICON.key, onClick: open(["env"]), disabled, tooltip }))
      .child(outlineButton({ s, id: "prune", label: s.labels.prune, icon: ICON.scissors, onClick: open(["prune"]), disabled, tooltip, count: disabled ? 0 : this.prune }))
      .child(div().flex_1())
      .child(ghostIcon({ s, id: "resync", icon: ICON.resync, tooltip: s.labels.resync, onClick: () => run(`${MOD}.${COMMAND.sync}`) }))
      .child(ghostIcon({ s, id: "refresh", icon: ICON.refresh, tooltip: s.labels.refresh, onClick: () => this.refresh(cx) }));
  }

  stacks({ s, view }) {
    const repos = this.shown.map((dir) => view.model.repos[dir]).filter(Boolean);
    const groups = repos.map((repo) =>
      v_flex()
        .gap(2)
        .child(groupLabel({ s, text: basename(repo.root) }))
        .children(forest({ repo }).map((row) => this.stackRow({ s, repo, row, context: view.context }))),
    );
    return v_flex().gap(s.groupGap).child(groupLabel({ s, text: s.labels.stacks })).children(groups);
  }

  stackRow({ s, repo, row, context }) {
    const worktree = repo.worktrees[row.branch];
    const current = context?.commonDir === repo.commonDir && context.branch === row.branch;
    const mark = worktree ? indicator({ worktree, tree: this.trees[repo.commonDir] }) : null;
    return h_flex()
      .id(`wtm-row-${repo.commonDir}-${row.branch}`)
      .h(s.rowHeight)
      .px(8)
      .gap(8)
      .items_center()
      .rounded(s.rowRadius)
      .when(current, (el) => el.bg(s.selected).font_medium())
      .when(!row.virtual, (el) => el.cursor_pointer().hover((h) => h.bg(s.hover)).on_click(() => goTo({ repo, branch: row.branch, path: row.path })))
      .children(Array.from({ length: row.depth }, () => div().flex_none().w(s.indent).h_full().ml(4).border_l(1).border_color(s.border)))
      .child(div().flex_1().min_w(0).truncate().text_color(row.virtual ? s.dim : s.foreground).child(row.branch))
      .when(Boolean(mark), (el) => el.child(indicatorView({ s, mark })));
  }

  elsewhere({ s, rows }) {
    const now = Date.now();
    const header = h_flex()
      .id("wtm-elsewhere")
      .h(s.labelHeight)
      .px(8)
      .gap(6)
      .items_center()
      .cursor_pointer()
      .text_size(s.smallTextSize)
      .font_medium()
      .text_color(s.muted)
      .on_click((_event, cx) => {
        this.elsewhereOpen = !this.elsewhereOpen;
        cx.notify();
      })
      .child(svg(this.elsewhereOpen ? ICON.down : ICON.right).size(s.smallIconSize))
      .child(s.labels.elsewhere)
      .child(div().flex_1())
      .child(countBadge({ s, count: rows.reduce((sum, row) => sum + row.running, 0) }));
    return v_flex()
      .gap(2)
      .child(header)
      .when(this.elsewhereOpen, (el) =>
        el.children(
          rows.map((row) => {
            const since = this.ps.filter((job) => job.path === row.path && job.startedAt != null).reduce((min, job) => Math.min(min, job.startedAt), Infinity);
            const meta = [s.labels.jobs(row.running), age({ since: since === Infinity ? null : since, now })].filter(Boolean).join(" · ");
            return h_flex()
              .id(`wtm-else-${row.commonDir}-${row.branch}`)
              .h(s.rowHeight)
              .px(8)
              .gap(8)
              .items_center()
              .rounded(s.rowRadius)
              .hover((h) => h.bg(s.hover))
              .child(dot({ s, color: s.running }))
              .child(div().flex_none().child(basename(row.root)))
              .child(div().flex_1().min_w(0).truncate().text_color(s.muted).child(`· ${row.branch}`))
              .child(div().flex_none().text_size(s.smallTextSize).text_color(s.muted).child(meta))
              .child(ghostIcon({ s, id: `stop-${row.commonDir}-${row.branch}`, icon: ICON.stop, tooltip: s.labels.down, onClick: () => direct({ args: ["run", "down", row.branch], cwd: row.root }) }));
          }),
        ),
      );
  }
}

async function loadTrees({ repos, withPrs }) {
  const args = ["tree", "--output", "json", ...(withPrs ? ["--with-prs"] : [])];
  const entries = await Promise.all(repos.map(async (repo) => [repo.commonDir, decodeTree(await wtm({ args, cwd: repo.root, timeout: LONG_EXEC_MS }))]));
  return Object.fromEntries(entries);
}

// stdout, or "" when wtm fails or cannot start: every decoder reads "" as empty.
async function wtm({ args, cwd, timeout }) {
  try {
    const result = await exec(WTM_BIN, args, { cwd, timeout });
    return result.code === 0 ? result.stdout : "";
  } catch {
    return "";
  }
}

// An action with no questions to ask: run hidden, say so only when it fails.
export async function direct({ args, cwd, timeout = LONG_EXEC_MS }) {
  try {
    const result = await exec(WTM_BIN, args, { cwd, timeout });
    if (result.code === 0) return true;
    notify({ title: NOTIFY_TITLE, body: result.stderr.trim() || `${WTM_BIN} ${args.join(" ")} exited ${result.code}`, level: "error" });
  } catch (error) {
    notify({ title: NOTIFY_TITLE, body: `${WTM_BIN} ${args.join(" ")}: ${error.message ?? error}`, level: "error" });
  }
  return false;
}

// wtm's wizards ask questions: they run in a tab, which stays on a shell once
// the command ends so its report can be read.
export function openTerminal({ args, folder }) {
  run("terminal.open", { argv: ["sh", "-c", `"$@"; exec "\${SHELL:-sh}"`, "sh", WTM_BIN, ...args], folder, place: "tab" });
}

export function openShellLine({ line, folder }) {
  run("terminal.open", { argv: ["sh", "-c", `${line}; exec "\${SHELL:-sh}"`], folder, place: "tab" });
}

function goTo({ repo, branch, path }) {
  const model = { repos: { [repo.commonDir]: repo } };
  const space = spaces().find((candidate) => candidate.machine == null && contextOf({ model, folder: candidate.folder })?.branch === branch);
  if (space) return run("space.select", { id: space.id });
  if (path) run("space.new", { folder: path });
}

function basename(path) {
  return (path ?? "").replace(/\/+$/, "").split("/").pop();
}

function blockedAlert({ s, status }) {
  return h_flex()
    .gap(10)
    .items_center()
    .px(12)
    .py(10)
    .rounded(10)
    .border(1)
    .border_color(s.problem)
    .child(svg(ICON.alert).size(s.iconSize).text_color(s.problem))
    .child(div().flex_1().text_size(s.descriptionSize).child(message(status)))
    .child(outlineButton({ s, id: "retry", label: s.labels.retry, onClick: () => run(`${MOD}.${COMMAND.retry}`) }));
}

export function groupLabel({ s, text }) {
  return h_flex().h(s.labelHeight).px(8).items_center().text_size(s.smallTextSize).font_medium().text_color(s.muted).child(text);
}

export function dot({ s, color }) {
  return div().flex_none().size(s.dotSize).rounded_full().bg(color);
}

function countBadge({ s, count }) {
  return div().flex_none().h(18).min_w(18).px(5).rounded_full().bg(s.hover).text_size(11).text_color(s.foreground).flex().items_center().justify_center().child(String(count));
}

function indicatorView({ s, mark }) {
  const color = { crashed: s.crashed, needsSync: s.needsSync, running: s.running }[mark.kind];
  return h_flex()
    .flex_none()
    .gap(6)
    .items_center()
    .child(dot({ s, color }))
    .when(mark.kind === "running", (el) => el.child(div().text_size(s.smallTextSize).text_color(s.muted).child(String(mark.count))));
}

export function ghostIcon({ s, id, icon, tooltip, onClick }) {
  return div()
    .id(`wtm-${id}`)
    .flex_none()
    .size(s.tinyButtonHeight + 4)
    .flex()
    .items_center()
    .justify_center()
    .rounded(s.buttonRadius)
    .cursor_pointer()
    .hover((h) => h.bg(s.hover))
    .when(Boolean(tooltip), (el) => el.tooltip(tooltip))
    .on_click((_event, cx) => {
      cx.stop_propagation();
      onClick();
    })
    .child(svg(icon).size(s.iconSize));
}

export function outlineButton({ s, id, label, icon, onClick, disabled = false, tooltip, count = 0, primary = false }) {
  return h_flex()
    .id(`wtm-${id}`)
    .flex_none()
    .h(s.smallButtonHeight)
    .px(10)
    .gap(6)
    .items_center()
    .rounded(s.buttonRadius)
    .when(!primary, (el) => el.border(1).border_color(s.input))
    .when(primary, (el) => el.bg(s.primary).text_color(s.primaryForeground).font_medium())
    .text_size(13)
    .when(!primary, (el) => el.text_color(disabled ? s.dim : s.foreground))
    .when(Boolean(tooltip), (el) => el.tooltip(tooltip))
    .when(!disabled, (el) =>
      el
        .cursor_pointer()
        .hover((h) => (primary ? h.opacity(0.9) : h.bg(s.hover)))
        .on_click((_event, cx) => {
          cx.stop_propagation();
          onClick();
        }),
    )
    .when(Boolean(icon), (el) => el.child(svg(icon).size(s.smallIconSize)))
    .child(label)
    .when(count > 0, (el) => el.child(countBadge({ s, count })));
}
