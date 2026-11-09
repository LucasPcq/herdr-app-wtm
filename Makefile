MOD_DIR = mods/wtm
HERDR_APP_MODS = $(HOME)/.config/herdr-app/mods

.PHONY: test check install release-notes

test:
	node --test

check:
	herdr-app check $(MOD_DIR)

# Replaces the installed copy whole: Herdr reloads the running mod on save.
install:
	rm -rf $(HERDR_APP_MODS)/wtm
	cp -R $(MOD_DIR) $(HERDR_APP_MODS)/wtm

# release-notes prints the CHANGELOG section of VERSION (0.1.0, no v): the
# release workflow publishes it as the GitHub release notes, where a relative
# link would resolve under /releases/tag/, so docs links are pinned to the tag.
NOTES_REF = $(if $(filter Unreleased,$(VERSION)),main,v$(VERSION))

release-notes:
	@test -n "$(VERSION)" || { echo "usage: make release-notes VERSION=x.y.z"; exit 1; }
	@awk -v v="$(VERSION)" 'index($$0, "## [" v "]") == 1 { on = 1; next } on && /^## \[/ { exit } on && /^\[[^]]+\]: / { exit } on' CHANGELOG.md | \
		sed -e '/./,$$!d' -e 's|](docs/|](https://github.com/LucasPcq/herdr-app-wtm/blob/$(NOTES_REF)/docs/|g'
	@grep -q "^## \[$(VERSION)\]" CHANGELOG.md || { echo "no CHANGELOG section for $(VERSION)" >&2; exit 1; }
