// wtm worktrees as Herdr spaces. Three roles: the launcher (what `mod.open`
// shows, as large as the window so it can measure it) opens the kept window
// where style.js says and closes; the service copy (that window, reopened on
// every start) runs the worker and draws the button; the pane (pane.split
// beside the terminals) shows the worktrees.

import { View, div, svg } from "gpui-kit";
import { h_flex } from "gpui-base";
import { closeOverlay, exec, focused, hc, home, nextCommand, notify, openOverlay, panes, props, run, setShared, shared, theme, watchFolder } from "herdr";
import * as fs from "fs/promises";
import { anchor } from "./anchor.js";
import { COMMAND, EVENT, EXIT_EVENT, FALLBACK_DRAIN_MS, INBOX_DIR, LAUNCH_TIMEOUT_MS, LAUNCHER_SHARE, MIN_EVENTS, MOD, NOTIFY_TITLE, SHARED, STATE, WINDOW_KEY, WTM_BIN } from "./constants.js";
import { EMPTY_MODEL, reduce, seed } from "./model.js";
import { createInbox } from "./inbox.js";
import { BLOCKED, message, Pane } from "./pane.js";
import { button } from "./style.js";
import { decide, replay, sweep } from "./sync.js";
import { paneOpen, toggle } from "./toggle.js";
import { ensureWorker, isFinal, nextBackoff, stopWorker, workerRunning } from "./worker.js";
import { buildSweepWorld, buildWorld } from "./world.js";

// The inbox through the mod's host: fs reads (inside home), exec writes (fs may
// only write under ~/.config/herdr-app). mv fails when another copy took the file.
const hostIo = {
  list: (dir) => fs.readdir(dir),
  read: (path) => fs.readFile(path, "utf8"),
  move: async ({ from, to }) => (await exec("mv", [from, to])).code === 0,
  remove: async (path) => {
    await exec("rm", ["-f", path]);
  },
  now: () => Date.now(),
};

export default class Wtm extends View {
  init(_props, cx) {
    if (props()?.pane) {
      this.pane = new Pane();
      return this.pane.init(cx);
    }
    if (!props()?.service) {
      this.launcher = true;
      this.opened = false;
      // Unmeasured after a second: open the pill where Herdr puts windows by default.
      cx.timer.after(LAUNCH_TIMEOUT_MS, () => this.openPill(null));
      return;
    }
    this.state = STATE.starting;
    this.copyId = Math.random().toString(36).slice(2, 10);
    this.repos = new Map();
    this.backoff = null;
    this.inbox = null;
    this.wtm = null;
    this.runId = null;
    this.watching = false;
    this.draining = false;
    this.drainAgain = false;
    this.resyncing = false;
    // Events written while no copy ran wait in the inbox: the published model plus
    // them is current. With none published, restart the worker for its snapshot.
    const stored = seed(shared(SHARED.model));
    this.model = stored ?? EMPTY_MODEL;
    this.fresh = !stored;
    cx.spawn(async (cx) => this.start(cx));
    cx.spawn(async (cx) => this.listenForCommands(cx));
    cx.timer.every(FALLBACK_DRAIN_MS, (cx) => cx.spawn(async (cx) => this.check(cx)));
  }

  openPill(size) {
    if (this.opened) return;
    this.opened = true;
    const s = button(theme());
    const at = size ? anchor({ window: size, pill: { width: s.width, height: s.height }, position: s.position }) : undefined;
    openOverlay({ mod: MOD, kind: "window", key: WINDOW_KEY, keep: true, frame: "none", at, props: { service: true } });
    const own = props()?.overlay;
    if (own) closeOverlay(own);
  }

  async start(cx) {
    this.set(cx, { state: STATE.starting });
    const wtm = await this.findWtm();
    if (!wtm) return this.set(cx, { state: STATE.wtmMissing });
    if (!(await this.hasEvents(wtm))) return this.set(cx, { state: STATE.wtmTooOld });
    this.wtm = wtm;

    const dir = `${home()}/${INBOX_DIR}`;
    try {
      const made = await exec("mkdir", ["-p", dir]);
      if (made.code !== 0) throw new Error(made.stderr.trim() || `cannot create ${dir}`);
      if (this.fresh) {
        this.fresh = false;
        this.runId = null;
        await stopWorker({ hc });
      }
      this.runId = await ensureWorker({ hc, inbox: dir, wtm, run: Math.random().toString(36).slice(2, 10) });
      this.inbox = createInbox({ dir, copyId: this.copyId, io: hostIo });
      await this.inbox.releaseStale();
    } catch (error) {
      return this.set(cx, { state: STATE.error, detail: error.message ?? String(error) });
    }

    this.set(cx, { state: STATE.listening });
    await this.drain(cx);
    if (!this.watching) cx.spawn(async (cx) => this.watch(cx, dir));
  }

  async findWtm() {
    try {
      const found = await exec("which", [WTM_BIN]);
      return found.code === 0 ? found.stdout.trim() : null;
    } catch {
      return null;
    }
  }

  async hasEvents(wtm) {
    try {
      const version = await exec(wtm, ["version", "--output", "json"]);
      return version.code === 0 && JSON.parse(version.stdout).events >= MIN_EVENTS;
    } catch {
      return false;
    }
  }

  // A worker that died without its exit marker (killed, core lost) is only seen here.
  async check(cx) {
    if (this.state === STATE.listening && !(await workerRunning({ hc, wtm: this.wtm }))) return this.start(cx);
    await this.drain(cx);
  }

  async watch(cx, dir) {
    this.watching = true;
    try {
      for (;;) {
        await watchFolder(dir);
        // Touching cx ends this loop once a reload replaced the copy.
        cx.notify();
        await this.drain(cx);
      }
    } catch (error) {
      this.set(cx, { state: STATE.error, detail: error.message ?? String(error) });
    } finally {
      this.watching = false;
    }
  }

  // Watch batches and the fallback timer both drain: one drain at a time,
  // and a request arriving mid-drain runs one more pass.
  async drain(cx) {
    if (!this.inbox) return;
    if (this.draining) {
      this.drainAgain = true;
      return;
    }
    this.draining = true;
    try {
      do {
        this.drainAgain = false;
        for (const claimed of await this.inbox.take()) {
          await this.handle(claimed.event, cx);
          await this.inbox.done(claimed);
        }
      } while (this.drainAgain);
    } catch (error) {
      this.set(cx, { state: STATE.error, detail: error.message ?? String(error) });
    } finally {
      this.draining = false;
    }
  }

  async handle(event, cx) {
    if (!event) return;
    this.fold(event);
    if (event.type === EXIT_EVENT) return this.exited(event, cx);
    if (event.type === EVENT.snapshot) return this.replaySnapshot(event, cx);
    if (event.type === EVENT.ready) {
      this.backoff = null;
      this.resyncing = false;
      return;
    }
    if ((event.type !== EVENT.created && event.type !== EVENT.removed) || !event.worktree?.path) return;
    try {
      for (const action of decide({ event, world: await buildWorld({ event, cache: this.repos }) })) apply(action);
    } catch (error) {
      console.log(`wtm: ${event.type} ${event.worktree.path}: ${error.message ?? error}`);
    }
  }

  fold(event) {
    const model = reduce({ model: this.model, event });
    if (model === this.model) return;
    this.model = model;
    setShared(SHARED.model, model);
  }

  async replaySnapshot(event, cx) {
    if (!this.resyncing) return;
    for (const created of replay(event)) await this.handle(created, cx);
  }

  // Closes the spaces whose folder is gone, then restarts the stream: wtm opens
  // it on a fresh snapshot of every repository, replayed until its ready line.
  async resync(cx) {
    if (this.state !== STATE.listening) return;
    this.set(cx, { state: STATE.starting });
    try {
      for (const action of sweep({ world: await buildSweepWorld() })) apply(action);
    } catch (error) {
      console.log(`wtm: resync: ${error.message ?? error}`);
    }
    this.resyncing = true;
    // The stopped run's exit marker must not schedule a restart.
    this.runId = null;
    await stopWorker({ hc });
    await this.start(cx);
  }

  async exited(event, cx) {
    // A marker from a run already replaced.
    if (event.run !== this.runId) return;
    if (isFinal(event.code)) return this.set(cx, { state: STATE.streamStopped, detail: event.code });
    this.backoff = nextBackoff(this.backoff);
    this.set(cx, { state: STATE.starting });
    cx.timer.after(this.backoff, (cx) => cx.spawn(async (cx) => this.start(cx)));
  }

  async listenForCommands(cx) {
    for (;;) {
      const command = await nextCommand();
      // Touching cx ends this loop once a reload replaced the copy.
      cx.notify();
      if (command === COMMAND.retry) {
        if (BLOCKED.has(this.state)) cx.spawn(async (cx) => this.start(cx));
        continue;
      }
      if (command === COMMAND.sync) {
        cx.spawn(async (cx) => this.resync(cx));
        continue;
      }
      if (command !== COMMAND.stop) continue;
      await stopWorker({ hc });
      closeOverlay(props().overlay);
      cx.notify();
      return;
    }
  }

  set(cx, { state, detail }) {
    const entering = state !== this.state;
    this.state = state;
    setShared(SHARED.status, { state, detail: detail == null ? null : String(detail) });
    if (entering && BLOCKED.has(state)) notify({ title: NOTIFY_TITLE, body: message({ state, detail }), level: "error" });
    cx.notify();
  }

  render(cx) {
    if (this.pane) return this.pane.render(cx);
    if (this.launcher) {
      return div()
        .id("measure")
        .size_full()
        // The first report can come before layout, with an empty side.
        .on_size_change((size) => size.width > 0 && size.height > 0 && this.openPill({ width: size.width / LAUNCHER_SHARE, height: size.height / LAUNCHER_SHARE }));
    }
    const s = button(theme());
    const on = paneOpen({ focused: focused(), panes: panes(), mod: MOD });
    return h_flex()
      .id("wtm-button")
      .items_center()
      .justify_center()
      .gap(s.gap)
      .w(s.width)
      .h(s.height)
      .px(s.padX)
      .rounded(s.radius)
      .bg(on ? s.onBackground : s.background)
      .text_size(s.textSize)
      .text_color(on ? s.onForeground : s.foreground)
      .hover((el) => el.bg(s.hoverBackground).text_color(s.hoverForeground))
      .tooltip(s.tooltips[this.state])
      .cursor_pointer()
      // No stop_propagation on mouse down: a press still drags the button, and a
      // drag may end in a click that toggles the pane (accepted).
      .on_click(() => togglePane())
      .child(svg(s.icon).size(s.iconSize).when(BLOCKED.has(this.state), (el) => el.text_color(s.blockedIcon)))
      .child(div().child(s.label));
  }
}

function togglePane() {
  const action = toggle({ focused: focused(), panes: panes(), mod: MOD });
  if (!action) return;
  if (action.kind === "close") return run("pane.close", { pane: action.pane });
  run("pane.split", { direction: "right", pane: action.pane, mod: MOD, props: { pane: true, tab: action.tab } });
}

function apply(action) {
  if (action.kind === "close") return run("space.close", { id: action.id, confirmed: true });
  run("space.new", { folder: action.folder });
  // space.new selects the new space: give the focus back.
  if (action.reselect) run("space.select", { id: action.reselect });
}

