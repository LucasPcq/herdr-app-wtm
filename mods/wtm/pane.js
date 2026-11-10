// The worktrees pane: a mod pane beside the terminals, opened by the button.
// Live data comes from the service copy's shared model; the rest is loaded
// with wtm on open, on refresh and after an action, never on a timer.

import { div, svg } from "gpui-kit";
import { h_flex, v_flex } from "gpui-base";
import { exec, notify, openOverlay, props, run, shared, spaces, theme } from "herdr";
import { COMMAND, JOB_STATE, LONG_EXEC_MS, MESSAGES, MOD, NOTIFY_TITLE, PS_SETTLE_MS, SHARED, STATE, TOAST_MS, TOASTS, WTM_BIN } from "./constants.js";
import { decodeProfiles, decodePrune, decodePs, decodeStatus, decodeTree } from "./decode.js";
import { EMPTY_MODEL } from "./model.js";
import { actionFolder, actionRepo, activeProfile, age, appsOf, jobsKey, contextOf, elsewhere, forest, indicator, refreshKey, running, splitJobs, upSince } from "./stacks.js";
import { ICON, pane as paneStyle } from "./style.js";
import { shownCommonDirs } from "./world.js";

export const BLOCKED = new Set([STATE.wtmMissing, STATE.wtmTooOld, STATE.streamStopped, STATE.error]);

const UP = new Set([JOB_STATE.running, JOB_STATE.starting]);

export function message({ state, detail }) {
  if (state === STATE.streamStopped) return MESSAGES.stopped(detail);
  if (state === STATE.error) return MESSAGES.error(detail);
  return MESSAGES[state];
}

export class Pane {
  init(_cx) {
    this.cache = new Map();
    this.shown = [];
    this.trees = {};
    this.ps = [];
    this.prune = 0;
    this.status = null;
    this.profiles = [];
    this.profile = null;
    this.profilesOpen = false;
    this.elsewhereOpen = true;
    this.openRepos = new Set();
    this.key = null;
    this.jobsKey = null;
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
    const repo = repoDir ? model.repos[repoDir] : null;
    return { model, context, repo, folder: repo ? actionFolder({ repo, context }) : null };
  }

  refresh(cx) {
    cx.spawn(async (cx) => {
      this.shown = await shownCommonDirs({ cache: this.cache });
      cx.notify();
      const { model, repo, context } = this.view();
      const roots = this.shown.map((dir) => model.repos[dir]).filter(Boolean);
      const [trees, ps, prune, status, profiles] = await Promise.all([
        loadTrees({ repos: roots, withPrs: false }),
        wtm({ args: ["run", "ps", "--output", "json"] }).then(decodePs),
        repo ? wtm({ args: ["prune", "--dry-run", "--no-fetch", "--yes", "--output", "json"], cwd: repo.root, timeout: LONG_EXEC_MS }).then(decodePrune) : 0,
        context ? wtm({ args: ["status", context.branch, "--yes", "--output", "json"], cwd: repo.root }).then(decodeStatus) : null,
        context ? wtm({ args: ["run", "list", "--output", "json"], cwd: repo.root }).then(decodeProfiles) : [],
      ]);
      this.trees = trees;
      this.ps = ps;
      this.prune = prune;
      this.status = status;
      this.profiles = profiles;
      cx.notify();
      // PRs ask GitHub: shown once they come.
      this.trees = await loadTrees({ repos: roots, withPrs: true });
      cx.notify();
    });
  }

  // Job states changed: read `run ps` for the addresses and start times, then once
  // more when a runner's apps have had time to bind.
  reloadPs(cx) {
    const load = async (cx) => {
      this.ps = decodePs(await wtm({ args: ["run", "ps", "--output", "json"] }));
      cx.notify();
    };
    cx.spawn(load);
    cx.timer.after(PS_SETTLE_MS, (cx) => cx.spawn(load));
  }

  // A hidden action with a toast when it starts and one when it ends.
  act({ cx, args, cwd, toast, about }) {
    notify({ title: toast.start(about), body: about.repo, level: "info", timeout: TOAST_MS });
    cx.spawn(async (cx) => {
      const result = await direct({ args, cwd });
      if (result.ok) notify({ title: toast.done(about), body: about.repo, level: "success", timeout: TOAST_MS });
      else notify({ title: toast.failed(about), body: result.detail, level: "error" });
      this.refresh(cx);
    });
  }

  render(cx) {
    const s = paneStyle(theme());
    const status = shared(SHARED.status) ?? null;
    const view = this.view();
    const key = refreshKey({ context: view.context, places: spaces().filter((space) => space.machine == null).map((space) => space.folder) });
    if (key !== this.key) {
      this.key = key;
      this.refresh(cx);
    }
    const jobs = jobsKey({ model: view.model });
    if (jobs !== this.jobsKey) {
      this.jobsKey = jobs;
      this.reloadPs(cx);
    }
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
      .child(this.actions({ s, view }))
      .when(Boolean(view.context), (el) => el.child(this.card({ s, view })))
      .child(this.stacks({ s, view }))
      .when(away.length > 0, (el) => el.child(this.elsewhere({ s, rows: away })));
  }

  actions({ s, view }) {
    const disabled = !view.repo;
    const tooltip = disabled ? s.labels.noRepo : null;
    const open = (args) => () => openTerminal({ args, folder: view.folder });
    return h_flex()
      .gap(s.groupGap)
      .items_center()
      .child(outlineButton({ s, id: "new", label: s.labels.new, icon: ICON.plus, onClick: open(["create"]), disabled, tooltip }))
      .child(outlineButton({ s, id: "exec", label: s.labels.exec, icon: ICON.terminal, onClick: open(["exec"]), disabled, tooltip }))
      .child(outlineButton({ s, id: "env", label: s.labels.env, icon: ICON.key, onClick: open(["env"]), disabled, tooltip }))
      .child(outlineButton({ s, id: "prune", label: s.labels.prune, icon: ICON.scissors, onClick: open(["prune"]), disabled, tooltip, count: disabled ? 0 : this.prune }))
      .child(div().flex_1())
      .child(ghostIcon({ s, id: "resync", icon: ICON.resync, tooltip: s.labels.resync, onClick: () => run(`${MOD}.${COMMAND.sync}`) }))
      .child(ghostIcon({ s, id: "refresh", icon: ICON.refresh, tooltip: s.labels.refresh, onClick: (cx) => this.refresh(cx) }));
  }

  card({ s, view }) {
    const repo = view.repo;
    const worktree = repo.worktrees[view.context.branch];
    const { services, tasks } = splitJobs({ jobs: worktree.jobs });
    const upCount = running({ jobs: worktree.jobs });
    const profile = this.profile ?? activeProfile({ profiles: this.profiles, jobs: worktree.jobs });
    const repoName = basename(repo.root);
    const description = [worktree.isMain ? s.labels.mainCheckout : worktree.parent && s.labels.from(worktree.parent), this.status?.isolation].filter(Boolean).join(" · ");
    const header = h_flex()
      .gap(10)
      .p(s.cardPadding)
      .pb(12)
      .items_start()
      .child(
        v_flex()
          .flex_1()
          .min_w(0)
          .gap(4)
          .child(h_flex().gap(8).items_center().text_size(s.titleSize).font_semibold().child(svg(ICON.branch).size(s.smallIconSize).text_color(s.muted)).child(div().truncate().child(worktree.branch)))
          .child(div().text_size(s.descriptionSize).text_color(s.muted).child(description)),
      )
      .when(upCount > 0, (el) => el.child(chip({ s, text: s.labels.up(profile, upCount), color: s.running, dotted: true })))
      .child(
        ghostIcon({
          s,
          id: "menu",
          icon: ICON.more,
          small: true,
          onClick: () => openOverlay({ mod: MOD, kind: "popup", width: s.menuWidth, props: { menu: true, branch: worktree.branch, folder: view.folder } }),
        }),
      );
    const card = v_flex()
      .rounded(s.cardRadius)
      .border(1)
      .border_color(s.border)
      .bg(s.card)
      .overflow_hidden()
      .child(header)
      .child(this.chips({ s, repo, worktree, repoName }))
      .children((this.status?.problems ?? []).map((problem, index) => problemAlert({ s, problem, index, folder: view.folder })))
      .when(services.length > 0, (el) =>
        el
          .child(div().h(1).bg(s.border))
          .child(subTitle({ s, title: s.labels.services, meta: s.labels.servicesUp(services.filter((job) => UP.has(job.state)).length, services.length) }))
          .child(v_flex().px(6).pb(6).children(services.flatMap((job) => serviceRows({ s, job, apps: appsOf({ ps: this.ps, path: worktree.path, name: job.name }) })))),
      )
      .when(tasks.length > 0, (el) =>
        el
          .child(subTitle({ s, title: s.labels.tasks, meta: s.labels.tasksDone(tasks.filter((job) => job.state === JOB_STATE.stopped).length) }))
          .child(h_flex().flex_wrap().gap(6).px(s.cardPadding).pb(12).children(tasks.map((job) => taskChip({ s, job })))),
      )
      .child(this.footer({ s, repo, worktree, repoName, profile, up: upCount > 0, folder: view.folder }));
    return v_flex().child(sectionHeader({ s, title: s.labels.context, meta: repoName })).child(card);
  }

  chips({ s, repo, worktree, repoName }) {
    const entry = this.trees[repo.commonDir]?.[worktree.path];
    if (!entry || (entry.ahead === 0 && !entry.dirty && !entry.pr && !entry.needsSync)) return div();
    return h_flex()
      .flex_wrap()
      .gap(6)
      .px(s.cardPadding)
      .pb(12)
      .items_center()
      .when(entry.ahead > 0, (el) => el.child(chip({ s, text: s.labels.ahead(entry.ahead) })))
      .when(entry.dirty, (el) => el.child(chip({ s, text: s.labels.modified, color: s.modified, dotted: true })))
      .when(Boolean(entry.pr), (el) => el.child(chip({ s, id: "pr", text: s.labels.pr(entry.pr), onClick: entry.pr.url ? () => openUrl(entry.pr.url) : null })))
      .when(entry.needsSync, (el) =>
        el.child(chip({ s, text: s.labels.needsSync, color: s.needsSync, dotted: true })).child(
          outlineButton({
            s,
            id: "sync",
            label: s.labels.sync,
            onClick: (cx) => this.act({ cx, args: ["sync", worktree.branch, "--yes", "--no-push"], cwd: repo.root, toast: TOASTS.sync, about: { branch: worktree.branch, repo: repoName } }),
          }),
        ),
      );
  }

  footer({ s, repo, worktree, repoName, profile, up, folder }) {
    const about = { branch: worktree.branch, profile, repo: repoName };
    const start = (cx) => this.act({ cx, args: ["run", "up", worktree.branch, "-d", "--yes", ...(profile ? ["--profile", profile] : [])], cwd: repo.root, toast: TOASTS.up, about });
    const stop = (cx) => this.act({ cx, args: ["run", "down", worktree.branch], cwd: repo.root, toast: TOASTS.down, about });
    return v_flex()
      .border_t(1)
      .border_color(s.border)
      .p(s.cardPadding)
      .py(12)
      .gap(s.groupGap)
      .child(
        h_flex()
          .gap(s.groupGap)
          .items_center()
          .when(this.profiles.length > 0, (el) => el.child(this.profileSelect({ s, profile })))
          .when(this.profiles.length === 0, (el) => el.child(div().flex_1()))
          .child(up ? outlineButton({ s, id: "down", label: s.labels.stop, icon: ICON.stop, onClick: stop }) : outlineButton({ s, id: "up", label: s.labels.start, icon: ICON.play, onClick: start, primary: true }))
          .child(ghostIcon({ s, id: "logs", icon: ICON.logs, tooltip: s.labels.logs, onClick: () => openTerminal({ args: ["run", "logs", worktree.branch], folder }) })),
      )
      .when(this.profilesOpen, (el) =>
        el.child(
          v_flex()
            .p(4)
            .rounded(s.buttonRadius)
            .border(1)
            .border_color(s.border)
            .bg(s.popover)
            .children(
              this.profiles.map((option) =>
                h_flex()
                  .id(`wtm-profile-${option.name}`)
                  .h(s.rowHeight)
                  .px(s.rowPadX)
                  .items_center()
                  .rounded(s.rowRadius)
                  .cursor_pointer()
                  .when(option.name === profile, (row) => row.bg(s.selected))
                  .hover((h) => h.bg(s.hover))
                  .on_click((_event, cx) => {
                    this.profile = option.name;
                    this.profilesOpen = false;
                    cx.notify();
                  })
                  .child(option.name),
              ),
            ),
        ),
      );
  }

  profileSelect({ s, profile }) {
    return h_flex()
      .id("wtm-profile")
      .flex_1()
      .min_w(0)
      .h(s.selectHeight)
      .px(s.buttonPadX)
      .gap(6)
      .items_center()
      .rounded(s.buttonRadius)
      .border(1)
      .border_color(s.input)
      .text_size(s.buttonTextSize)
      .cursor_pointer()
      .hover((h) => h.bg(s.hover))
      .on_click((_event, cx) => {
        this.profilesOpen = !this.profilesOpen;
        cx.notify();
      })
      .child(div().flex_none().text_color(s.muted).child(s.labels.profile))
      .child(div().flex_1().min_w(0).truncate().child(profile ?? ""))
      .child(svg(ICON.down).size(s.smallIconSize).text_color(s.muted));
  }

  stacks({ s, view }) {
    const repos = this.shown.map((dir) => view.model.repos[dir]).filter(Boolean);
    const total = repos.reduce((sum, repo) => sum + Object.keys(repo.worktrees).length, 0);
    return v_flex()
      .child(sectionHeader({ s, title: s.labels.stacks, meta: s.labels.stacksMeta(repos.length, total) }))
      .children(repos.map((repo) => this.repoGroup({ s, repo, context: view.context })));
  }

  repoGroup({ s, repo, context }) {
    const worktrees = Object.values(repo.worktrees);
    const up = worktrees.reduce((sum, worktree) => sum + running({ jobs: worktree.jobs }), 0);
    const open = this.openRepos.has(repo.commonDir);
    const header = h_flex()
      .id(`wtm-repo-${repo.commonDir}`)
      .h(s.rowHeight)
      .px(s.rowPadX)
      .gap(8)
      .items_center()
      .rounded(s.rowRadius)
      .font_medium()
      .cursor_pointer()
      .hover((h) => h.bg(s.hover))
      .on_click((_event, cx) => {
        if (open) this.openRepos.delete(repo.commonDir);
        else this.openRepos.add(repo.commonDir);
        cx.notify();
      })
      .child(svg(open ? ICON.down : ICON.right).size(s.tinyIconSize).text_color(s.muted))
      .child(svg(ICON.folder).size(s.smallIconSize).text_color(s.muted))
      .child(div().flex_1().min_w(0).truncate().child(basename(repo.root)))
      .child(
        h_flex()
          .flex_none()
          .gap(8)
          .items_center()
          .text_size(s.smallTextSize)
          .text_color(s.muted)
          .when(up > 0, (el) => el.child(dot({ s, color: s.running })).child(String(up)))
          .child(s.labels.worktrees(worktrees.length)),
      );
    return v_flex()
      .pb(open ? 10 : 2)
      .child(header)
      .when(open, (el) => el.children(forest({ repo }).map((row) => this.treeRow({ s, repo, row, context }))));
  }

  treeRow({ s, repo, row, context }) {
    const worktree = repo.worktrees[row.branch];
    const current = context?.commonDir === repo.commonDir && context.branch === row.branch;
    const mark = worktree ? indicator({ worktree, tree: this.trees[repo.commonDir] }) : null;
    return h_flex()
      .id(`wtm-row-${repo.commonDir}-${row.branch}`)
      .h(s.treeRowHeight)
      .pl(s.rowPadX + s.treeLead)
      .pr(s.rowPadX)
      .items_center()
      .rounded(s.rowRadius)
      .when(current, (el) => el.bg(s.selected).font_medium())
      .when(!row.virtual, (el) => el.cursor_pointer().hover((h) => h.bg(s.hover)).on_click(() => goTo({ repo, branch: row.branch, path: row.path })))
      .children(row.guides.map((continues) => guide({ s, continues })))
      .when(row.depth > 0, (el) => el.child(elbow({ s, last: row.last })))
      .child(div().flex_1().min_w(0).truncate().when(row.virtual, (d) => d.italic().text_color(s.dim)).child(row.branch))
      .when(Boolean(mark), (el) => el.child(indicatorView({ s, mark })));
  }

  elsewhere({ s, rows }) {
    const now = Date.now();
    const total = rows.reduce((sum, row) => sum + row.running, 0);
    const header = h_flex()
      .id("wtm-elsewhere")
      .h(s.sectionTitleHeight)
      .mb(s.groupGap)
      .gap(6)
      .items_center()
      .cursor_pointer()
      .on_click((_event, cx) => {
        this.elsewhereOpen = !this.elsewhereOpen;
        cx.notify();
      })
      .child(svg(this.elsewhereOpen ? ICON.down : ICON.right).size(s.tinyIconSize).text_color(s.muted))
      .child(div().flex_1().text_size(s.sectionTitleSize).font_semibold().text_color(s.muted).child(s.labels.elsewhere))
      .child(countBadge({ s, count: total }));
    return v_flex()
      .child(header)
      .when(this.elsewhereOpen, (el) =>
        el.children(
          rows.map((row) => {
            const meta = [s.labels.jobs(row.running), age({ since: upSince({ ps: this.ps, path: row.path }), now })].filter(Boolean).join(" · ");
            const about = { branch: row.branch, repo: basename(row.root) };
            return h_flex()
              .id(`wtm-else-${row.commonDir}-${row.branch}`)
              .h(s.rowHeight)
              .px(s.rowPadX)
              .gap(8)
              .items_center()
              .rounded(s.rowRadius)
              .hover((h) => h.bg(s.hover))
              .child(dot({ s, color: s.running }))
              .child(div().flex_none().child(basename(row.root)))
              .child(div().flex_1().min_w(0).truncate().text_color(s.muted).child(row.branch))
              .child(div().flex_none().text_size(s.smallTextSize).text_color(s.muted).child(meta))
              .child(ghostIcon({ s, id: `stop-${row.commonDir}-${row.branch}`, icon: ICON.stop, small: true, tooltip: s.labels.stop, onClick: (cx) => this.act({ cx, args: ["run", "down", row.branch], cwd: row.root, toast: TOASTS.down, about }) }));
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

// An action with no questions to ask, run hidden: { ok, detail } for its toast.
async function direct({ args, cwd }) {
  try {
    const result = await exec(WTM_BIN, args, { cwd, timeout: LONG_EXEC_MS });
    return { ok: result.code === 0, detail: result.stderr.trim() || `${WTM_BIN} ${args.join(" ")} exited ${result.code}` };
  } catch (error) {
    return { ok: false, detail: `${WTM_BIN} ${args.join(" ")}: ${error.message ?? error}` };
  }
}

// wtm's wizards ask questions: they run in a tab, which stays on a shell once
// the command ends so its report can be read.
export function openTerminal({ args, folder }) {
  run("terminal.open", { argv: ["sh", "-c", `"$@"; exec "\${SHELL:-sh}"`, "sh", WTM_BIN, ...args], folder, place: "tab" });
}

function openShellLine({ line, folder }) {
  run("terminal.open", { argv: ["sh", "-c", `${line}; exec "\${SHELL:-sh}"`], folder, place: "tab" });
}

function openUrl(url) {
  exec("open", [url]).catch((error) => notify({ title: NOTIFY_TITLE, body: `${url}: ${error.message ?? error}`, level: "error" }));
}

function goTo({ repo, branch, path }) {
  const model = { repos: { [repo.commonDir]: repo } };
  const space = spaces().find((candidate) => candidate.machine == null && contextOf({ model, folder: candidate.folder })?.branch === branch);
  if (space) return run("space.select", { id: space.id });
  if (path) run("space.new", { folder: path });
}

// An address as the pane shows it: without its scheme.
function bare(url) {
  return url.replace(/^https?:\/\//, "");
}

function basename(path) {
  return (path ?? "").replace(/\/+$/, "").split("/").pop();
}

function sectionHeader({ s, title, meta }) {
  return h_flex()
    .h(s.sectionTitleHeight)
    .mb(s.groupGap)
    .items_center()
    .justify_between()
    .child(div().text_size(s.sectionTitleSize).font_semibold().text_color(s.muted).child(title))
    .when(Boolean(meta), (el) => el.child(div().text_size(s.smallTextSize).text_color(s.muted).truncate().child(meta)));
}

function subTitle({ s, title, meta }) {
  return h_flex()
    .px(s.cardPadding)
    .pt(10)
    .pb(4)
    .justify_between()
    .text_size(s.sectionTitleSize)
    .font_semibold()
    .text_color(s.dim)
    .child(title)
    .child(meta);
}

function guide({ s, continues }) {
  return div()
    .flex_none()
    .relative()
    .w(s.guideWidth)
    .h(s.treeRowHeight)
    .when(continues, (el) => el.child(div().absolute().left(8).top(0).h(s.treeRowHeight).border_l(1).border_color(s.guide)));
}

function elbow({ s, last }) {
  const middle = s.treeRowHeight / 2;
  return div()
    .flex_none()
    .relative()
    .w(s.guideWidth)
    .h(s.treeRowHeight)
    .child(div().absolute().left(8).top(0).h(last ? middle : s.treeRowHeight).border_l(1).border_color(s.guide))
    .child(div().absolute().left(8).top(middle).w(8).border_t(1).border_color(s.guide));
}

// A service, then the addresses of the apps it runs (a runner binds none itself).
function serviceRows({ s, job, apps }) {
  return [serviceRow({ s, job }), ...apps.map((app) => appRow({ s, job, app }))];
}

function appRow({ s, job, app }) {
  return h_flex()
    .id(`wtm-app-${job.name}-${app.job}`)
    .h(s.treeRowHeight)
    .pl(s.rowPadX + s.appIndent)
    .pr(s.rowPadX)
    .gap(10)
    .items_center()
    .rounded(s.rowRadius)
    .cursor_pointer()
    .hover((h) => h.bg(s.hover))
    .tooltip(app.url)
    .on_click(() => openUrl(app.url))
    .child(div().flex_none().text_size(s.smallTextSize).text_color(s.muted).child(app.job))
    .child(div().flex_1().min_w(0).truncate().text_right().text_size(s.smallTextSize).text_color(s.foreground).child(bare(app.url)))
    .child(svg(ICON.open).size(s.tinyIconSize).text_color(s.muted));
}

function serviceRow({ s, job }) {
  const color = { [JOB_STATE.running]: s.running, [JOB_STATE.starting]: s.starting, [JOB_STATE.crashed]: s.crashed }[job.state] ?? s.stopped;
  const off = !UP.has(job.state) && job.state !== JOB_STATE.crashed;
  const detail = job.state === JOB_STATE.crashed ? s.labels.exit(job.exitCode) : off ? s.labels.stopped : bare(job.url ?? "");
  return h_flex()
    .id(`wtm-job-${job.name}`)
    .h(s.rowHeight)
    .px(s.rowPadX)
    .gap(10)
    .items_center()
    .rounded(s.rowRadius)
    .hover((h) => h.bg(s.hover))
    .text_color(off ? s.muted : s.foreground)
    .child(dot({ s, color }))
    .child(div().flex_none().child(job.name))
    .when(job.shared, (el) => el.child(chip({ s, text: s.labels.shared })))
    .child(div().flex_1().min_w(0).truncate().text_right().text_size(s.smallTextSize).text_color(job.state === JOB_STATE.crashed ? s.crashed : s.muted).child(detail))
    .when(Boolean(job.url) && !off, (el) => el.child(ghostIcon({ s, id: `open-${job.name}`, icon: ICON.open, small: true, tooltip: job.url, onClick: () => openUrl(job.url) })));
}

function taskChip({ s, job }) {
  const failed = job.state === JOB_STATE.crashed;
  const busy = UP.has(job.state);
  return h_flex()
    .flex_none()
    .h(s.chipHeight + 2)
    .px(s.rowPadX)
    .gap(5)
    .items_center()
    .rounded(s.rowRadius)
    .bg(s.hover)
    .text_size(s.smallTextSize)
    .text_color(failed ? s.crashed : s.muted)
    .when(failed && job.exitCode != null, (el) => el.tooltip(s.labels.exit(job.exitCode)))
    .child(busy ? dot({ s, color: s.starting }) : svg(failed ? ICON.cross : ICON.check).size(s.tinyIconSize).text_color(failed ? s.crashed : s.running))
    .child(job.name);
}

function problemAlert({ s, problem, index, folder }) {
  return h_flex()
    .mx(s.cardPadding)
    .mb(12)
    .px(s.alertPad.x)
    .py(s.alertPad.y)
    .gap(10)
    .items_center()
    .rounded(s.alertRadius)
    .border(1)
    .border_color(s.problem)
    .text_size(s.descriptionSize)
    .child(svg(ICON.alert).size(s.iconSize).text_color(s.problem))
    .child(
      v_flex()
        .flex_1()
        .min_w(0)
        .gap(2)
        .child(div().text_color(s.problem).font_medium().child(problem.message))
        .child(div().truncate().text_color(s.muted).text_size(s.smallTextSize).child(problem.fix)),
    )
    .child(outlineButton({ s, id: `fix-${index}`, label: s.labels.fix, tooltip: problem.fix, onClick: () => openShellLine({ line: problem.fix, folder }) }));
}

function blockedAlert({ s, status }) {
  return h_flex()
    .gap(10)
    .items_center()
    .px(s.alertPad.x)
    .py(s.alertPad.y)
    .rounded(s.alertRadius)
    .border(1)
    .border_color(s.problem)
    .child(svg(ICON.alert).size(s.iconSize).text_color(s.problem))
    .child(div().flex_1().text_size(s.descriptionSize).child(message(status)))
    .child(outlineButton({ s, id: "retry", label: s.labels.retry, onClick: () => run(`${MOD}.${COMMAND.retry}`) }));
}

function dot({ s, color }) {
  return div().flex_none().size(s.dotSize).rounded_full().bg(color);
}

function chip({ s, id, text, color, dotted = false, onClick }) {
  return h_flex()
    .when(Boolean(id), (el) => el.id(`wtm-chip-${id}`))
    .flex_none()
    .h(s.chipHeight)
    .px(7)
    .gap(5)
    .items_center()
    .rounded(s.rowRadius)
    .border(1)
    .border_color(s.border)
    .text_size(s.smallTextSize)
    .text_color(color ?? s.muted)
    .when(dotted, (el) => el.child(dot({ s, color })))
    .when(Boolean(onClick), (el) => el.cursor_pointer().hover((h) => h.text_color(s.foreground)).on_click(() => onClick()))
    .child(text);
}

function countBadge({ s, count }) {
  return div()
    .flex_none()
    .h(s.countHeight)
    .min_w(s.countHeight)
    .px(s.countPad)
    .rounded_full()
    .bg(s.selected)
    .text_size(s.countTextSize)
    .text_color(s.foreground)
    .flex()
    .items_center()
    .justify_center()
    .child(String(count));
}

function indicatorView({ s, mark }) {
  const color = { crashed: s.crashed, needsSync: s.needsSync, running: s.running }[mark.kind];
  const text = { crashed: s.labels.crashed, needsSync: s.labels.needsSync, running: String(mark.count) }[mark.kind];
  return h_flex().flex_none().gap(6).items_center().text_size(s.smallTextSize).text_color(s.muted).child(dot({ s, color })).child(text);
}

function ghostIcon({ s, id, icon, tooltip, onClick, small = false }) {
  return div()
    .id(`wtm-${id}`)
    .flex_none()
    .size(small ? s.smallIconButton : s.iconButton)
    .flex()
    .items_center()
    .justify_center()
    .rounded(s.buttonRadius)
    .text_color(s.muted)
    .cursor_pointer()
    .hover((h) => h.bg(s.hover).text_color(s.foreground))
    .when(Boolean(tooltip), (el) => el.tooltip(tooltip))
    .on_click((_event, cx) => {
      cx.stop_propagation();
      onClick(cx);
    })
    .child(svg(icon).size(small ? s.smallIconSize : s.iconSize));
}

function outlineButton({ s, id, label, icon, onClick, disabled = false, tooltip, count = 0, primary = false }) {
  return h_flex()
    .id(`wtm-${id}`)
    .flex_none()
    .h(s.buttonHeight)
    .px(s.buttonPadX)
    .gap(6)
    .items_center()
    .rounded(s.buttonRadius)
    .text_size(s.buttonTextSize)
    .when(!primary, (el) => el.border(1).border_color(s.input).text_color(disabled ? s.dim : s.foreground))
    .when(primary, (el) => el.bg(s.primary).text_color(s.primaryForeground).font_medium())
    .when(Boolean(tooltip), (el) => el.tooltip(tooltip))
    .when(!disabled, (el) =>
      el
        .cursor_pointer()
        .hover((h) => (primary ? h.opacity(s.pressedOpacity) : h.bg(s.hover)))
        .on_click((_event, cx) => {
          cx.stop_propagation();
          onClick(cx);
        }),
    )
    .when(Boolean(icon), (el) => el.child(svg(icon).size(s.smallIconSize)))
    .child(label)
    .when(count > 0, (el) => el.child(countBadge({ s, count })));
}
