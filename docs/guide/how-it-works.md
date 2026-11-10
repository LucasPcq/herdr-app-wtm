# How it works

The mod never changes what wtm does. It follows wtm's event stream, opens or closes spaces as worktrees come and go, and shows your worktrees and their jobs in a pane the button opens.

## The worker

The button starts a hidden herdr-core terminal named `herdr-app-wtm` that runs `wtm events --output json` from `/`, which follows every repository wtm knows. Each event is written as a file in `~/.local/state/herdr-app-wtm/inbox/`; the mod reads it, acts, and deletes it.

The worker keeps running when the window closes or Herdr quits. Events that arrive meanwhile wait in the inbox and are applied when the button comes back, each checked against what is on disk then.

## Which repositories

Only repositories the window shows: a local space whose first terminal (or, without one, its folder) is inside the repository or one of its worktrees. A worktree created in a repository with no space is left alone.

## When a space opens

On `wtm create` (from the popup of herdr-wtm, a shell, an agent, `wtm ui`), a space opens on the new worktree when its folder exists and no space is already inside it. The space you were on stays selected: the new one appears in the sidebar without taking the focus.

## When a space closes

On `wtm clean` or `wtm prune`, a space closes when it was made on the removed worktree (its folder is inside it) and the folder is gone. Never closed:

- the main checkout's space, even if one of its terminals went into the worktree;
- a space whose folder is still on disk;
- a space on another machine.

## Syncing what is already there

Events only cover changes made while the worker runs. To catch up with worktrees created or removed before, click **Resync spaces** in the pane (or run `herdr-app do wtm.sync`):

- every local space whose folder and first terminal's folder are both gone closes — a removed worktree's, but also any other space on a deleted folder;
- the stream restarts, and wtm sends a fresh list of every repository's worktrees: each one without a space opens, under the same rules as `wtm create`.

Nothing is opened on its own when the app starts: only on a resync.

## The button

`wtm` with a branch icon in the top bar, drawn like Files and Changes. **A click opens the pane** on the right of the active tab; a click again closes it. The button is highlighted while the pane is open in the tab you look at.

When sync is down (wtm not found, wtm too old, the stream stopped on an event newer than wtm, or an error), the icon turns red and a notification says why; the pane then shows the reason with a **Retry** button. Rest the pointer on the button for a tooltip saying the state.

A press drags the button; Herdr remembers where you drop it. A drag can end in a click and toggle the pane.

## The pane

A pane beside your terminals, in the tab where you clicked. Top to bottom:

- **Actions**: New, Exec, Env and Prune open the matching wtm command (`wtm create`, `wtm exec`, `wtm env`, `wtm prune`) in a new tab, which stays on a shell once it ends. Prune shows how many worktrees are finished. They act on the repository of the space holding the pane; in a space outside any wtm repository they act on the only repository the window shows, and are greyed out when it shows several. On the right: Resync spaces, and Refresh.
- **This worktree**: the worktree of the space holding the pane (none outside a wtm repository). Its branch, where it came from and its isolation; **Running** when a job runs; the `⋯` menu opens **Reparent** or **Clean** in a tab. Then its commits ahead, uncommitted changes, pull request, and **needs sync** with a **Sync** button (`wtm sync <branch> --yes --no-push`) when its parent moved. Each problem `wtm status` finds, with a **Fix** button that runs its fix in a tab. Its jobs with their state and address. At the bottom, the profile (the one whose jobs all run, else the default), **Up** (`wtm run up <branch> -d --yes --profile <profile>`) or **Down** (`wtm run down <branch>`), and the logs.
- **Stacks**: every repository the window shows, each worktree under the one it came from; a parent with no worktree is greyed. One mark per row: red when a job crashed, amber when it needs sync, green with a count when jobs run. Click a row to go to its space, or open one.
- **Running elsewhere**: worktrees of repositories the window does not show that still run jobs, how long, and a stop button.

Job states change live. The rest (problems, profiles, commits ahead, pull requests, the Prune count, how long jobs have run) is read when the pane opens and when you click Refresh or run an action from it.

## Limits

- The button belongs to the layout it was opened in. On another layout, events wait until you come back, or run `herdr-app do mod.open '{"name":"wtm"}'` there too.
- Local spaces only.
- A worktree moved with `wtm relocate`, or created or removed while the worker was down, is not followed until a resync.
- The pane opens as half of the pane beside it: drag its edge to resize it. Herdr gives a mod no way to set its width.
- Opening a pull request or a job's address uses `open` (macOS).
- A folder reached through a symlink (`/tmp` vs `/private/tmp`) may not match its space.
