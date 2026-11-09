# Changelog

All notable changes to this project are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [0.1.0]

### Added

- A worktree created with wtm opens as a Herdr app space, whoever created it (a shell, an agent, `wtm ui`), and the focus stays where it was.
- A worktree removed with `wtm clean` or `wtm prune` closes its space, once its folder is gone; the main checkout's space is never closed.
- A small `wtm` pill, centred in the top bar, shows whether sync runs, and why not when it doesn't; clicking it retries. Where it opens is set in `style.js`.
- `herdr-app do wtm.stop` stops the sync and removes the pill.

[Unreleased]: https://github.com/LucasPcq/herdr-app-wtm/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/LucasPcq/herdr-app-wtm/releases/tag/v0.1.0
