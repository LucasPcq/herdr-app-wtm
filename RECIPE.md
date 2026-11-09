# wtm

Spaces follow [wtm](https://github.com/LucasPcq/wtm) worktrees: a worktree created with `wtm create` opens as a space, one removed with `wtm clean` or `wtm prune` closes its space, whoever ran the command — and the focus never moves. A small floating pill says whether sync runs.

![wtm](preview.png)

## What you see

- One floating window, drawn by the mod with `frame: "none"`: a pill 26 px high, 10 px side padding, radius 13, 1 px border in `border`, background `popover`, text `muted` at 11.5 px.
- In it, a 7 px round dot and a label: `accent` dot + `wtm` while syncing; `muted` dot + `wtm` while starting; `blocked` dot + `wtm · not found` / `wtm · upgrade wtm` / `wtm · stopped` / `wtm · error` when sync is down.
- Spaces appear in and leave the regular spaces sidebar; the mod draws nothing else.

## How it behaves

- `worktree.created` in a repository the window shows (a local space's first terminal, or its folder, is in that repository): a space opens on the worktree, then the previously active space is selected again. Nothing happens for the main checkout, a folder already gone, or when a space is already inside the worktree.
- `worktree.removed`: every local space whose first terminal (or folder) is inside the worktree closes, if the folder is gone and it is not the main checkout.
- Entering a blocked state posts one error notification with the cause and the fix. Clicking the pill then retries; otherwise presses drag it.
- `herdr-app do wtm.stop` removes the worker and closes the pill.
- Agent statuses play no part.

## Built from

- `mods/wtm/` only; no layout. `mod.json`: `{ "place": "none", "title": "wtm" }`.
- Launcher copy (shown by `mod.open`, no `props().service`): `openOverlay({ mod: "wtm", kind: "window", key: "wtm", keep: true, frame: "none", props: { service: true } })`, then `closeOverlay(props().overlay)`.
- Service copy (the kept window): `exec("which", ["wtm"])`, `wtm version --output json` (`events >= 1`), `mkdir -p ~/.local/state/herdr-app-wtm/inbox`, then `hc run --bg --name herdr-app-wtm --outlive-parent --label herdr-app-wtm.script=1 -- sh -c <script> sh <inbox> <wtm>`, reused while live with that label.
- The script runs `cd / && wtm events --output json` and writes every non-empty line to `.tmp` then `mv` to `<n>.json` (`n` = seconds × 10⁶ + counter), then `{"type":"herdr-app-wtm.exit","code":N}`.
- The mod `watchFolder`s the inbox (plus a 30 s fallback), claims each `<n>.json` by renaming it to `<n>.json.<copyId>.<ms>` (`mv`), reads it, acts, removes it. Claims older than a minute are released on start.
- `spaces()`, `panes()`, `focused()`, `run("space.new" | "space.select" | "space.close")`, `notify`, `nextCommand` (`stop`), `exec` for `git rev-parse --path-format=absolute --git-common-dir`, `test -e`, `mv`, `rm`.
- Exit codes 2 and 20 stop for good; others restart with 1 s → 30 s backoff, reset on `ready`.

## Watch out

- A mod only runs while shown, and Herdr's shipped layouts are read-only: `place` other than `none` never docks there. The kept window is what keeps the mod alive.
- `exec` does not stream; `watchFolder` sees created and renamed entries but not appends, and seems to skip hidden folders: hence one file per event in a non-hidden folder.
- `fs` writes only under `~/.config/herdr-app` and reads only inside home: use `exec` for the inbox's writes and for `test -e` on worktree paths.
- `space.new` selects the new space: select the previous one right after.
- Two copies can run (two layouts, two clients): the rename-claim makes each event handled once.

## Done when

- `herdr-app check mods/wtm` passes, and `node --test` passes.
- `herdr-app do mod.open '{"name":"wtm"}'` shows the pill with an `accent` dot, and `hc get herdr-app-wtm` is live.
- `wtm create x --yes` in a shell, in a repository the window shows, opens a space named `x` while `herdr-app status` keeps the same `space`.
- `wtm clean x --yes` closes it.
- Quitting and reopening the app brings the pill back, and syncing continues.
- `herdr-app do wtm.stop` removes the pill and the `herdr-app-wtm` terminal.
