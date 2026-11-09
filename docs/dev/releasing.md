# Releasing

A release is a `v<version>` tag on `main` with a matching `## [<version>]` section in `CHANGELOG.md`. There is nothing to build: the release is the `mods/wtm/` folder at that tag, which the README's install command copies.

1. Move the `[Unreleased]` entries of `CHANGELOG.md` under `## [x.y.z] - YYYY-MM-DD` (see [changelog.md](changelog.md)), add the link reference at the bottom, and check the section reads well as release notes: `make release-notes VERSION=x.y.z`.
2. Point the README's install command at the new tag (`--branch vx.y.z`).
3. Commit both on `main` (`chore: release vx.y.z`), then tag and push:

   ```bash
   git tag vx.y.z && git push origin main vx.y.z
   ```

The Release workflow runs the tests, refuses a tag without its `CHANGELOG.md` section, and publishes the GitHub release with that section as its notes.

## Betas

A tag with a prerelease part (`v0.2.0-beta.1`) becomes a GitHub pre-release, with the `[Unreleased]` section as its notes. Testers install it with the README's command and `--branch v0.2.0-beta.1`.

## Before tagging

`make test` and `make check` pass, and the manual checks of [`RECIPE.md`](../../RECIPE.md) ("Done when") pass in a running Herdr app with `make install`.
