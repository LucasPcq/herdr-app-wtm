// The worktrees pane: a mod pane beside the terminals, opened by the button.

import { div, svg } from "gpui-kit";
import { h_flex, v_flex } from "gpui-base";
import { run, shared, theme } from "herdr";
import { COMMAND, MESSAGES, MOD, SHARED, STATE } from "./constants.js";
import { ICON, pane as paneStyle } from "./style.js";

export const BLOCKED = new Set([STATE.wtmMissing, STATE.wtmTooOld, STATE.streamStopped, STATE.error]);

export function message({ state, detail }) {
  if (state === STATE.streamStopped) return MESSAGES.stopped(detail);
  if (state === STATE.error) return MESSAGES.error(detail);
  return MESSAGES[state];
}

export class Pane {
  init(_cx) {}

  render(_cx) {
    const s = paneStyle(theme());
    const status = shared(SHARED.status) ?? null;
    return v_flex()
      .id("wtm-pane")
      .size_full()
      .bg(s.background)
      .text_color(s.foreground)
      .text_size(s.textSize)
      .p(s.padding)
      .gap(s.sectionGap)
      .overflow_y_scrollbar()
      .when(BLOCKED.has(status?.state), (el) => el.child(blockedAlert({ s, status })));
  }
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

export function outlineButton({ s, id, label, icon, onClick, disabled = false, tooltip }) {
  return h_flex()
    .id(`wtm-${id}`)
    .flex_none()
    .h(s.smallButtonHeight)
    .px(10)
    .gap(6)
    .items_center()
    .rounded(s.buttonRadius)
    .border(1)
    .border_color(s.input)
    .text_size(13)
    .text_color(disabled ? s.dim : s.foreground)
    .when(Boolean(tooltip), (el) => el.tooltip(tooltip))
    .when(!disabled, (el) =>
      el
        .cursor_pointer()
        .hover((h) => h.bg(s.hover))
        .on_click((_event, cx) => {
          cx.stop_propagation();
          onClick();
        }),
    )
    .when(Boolean(icon), (el) => el.child(svg(icon).size(s.smallIconSize)))
    .child(label);
}
