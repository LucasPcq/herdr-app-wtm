// The worktree menu the card's ⋯ opens: a Herdr popup, closed once an item runs.

import { div, svg } from "gpui-kit";
import { h_flex, v_flex } from "gpui-base";
import { closeOverlay, props, theme } from "herdr";
import { openTerminal } from "./pane.js";
import { ICON, pane as paneStyle } from "./style.js";

export class Menu {
  render() {
    const s = paneStyle(theme());
    const { branch, folder, overlay } = props() ?? {};
    const item = ({ id, label, icon, args, color }) =>
      h_flex()
        .id(`wtm-menu-${id}`)
        .h(s.rowHeight)
        .px(s.rowPadX)
        .gap(8)
        .items_center()
        .rounded(s.rowRadius)
        .text_size(s.buttonTextSize)
        .text_color(color)
        .cursor_pointer()
        .hover((h) => h.bg(s.hover))
        .on_click(() => {
          openTerminal({ args, folder });
          closeOverlay(overlay);
        })
        .child(svg(icon).size(s.smallIconSize))
        .child(label);
    return v_flex()
      .p(4)
      .bg(s.popover)
      .text_color(s.foreground)
      .child(div().px(s.rowPadX).pt(6).pb(4).text_size(s.sectionTitleSize).text_color(s.dim).truncate().child(branch ?? ""))
      .child(item({ id: "reparent", label: s.labels.reparent, icon: ICON.branch, args: ["reparent", branch], color: s.foreground }))
      .child(item({ id: "logs", label: s.labels.logs, icon: ICON.logs, args: ["run", "logs", branch], color: s.foreground }))
      .child(div().h(1).my(4).bg(s.border))
      .child(item({ id: "clean", label: s.labels.clean, icon: ICON.trash, args: ["clean", branch], color: s.crashed }));
  }
}
