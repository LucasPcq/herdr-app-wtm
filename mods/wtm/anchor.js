// Where the pill's window opens, from the window's size and style.js's position.
// Herdr places windows by absolute {x, y} only.
export function anchor({ window, pill, position }) {
  const { edge, align, inset, margin } = position;
  const x = align === "start" ? margin : align === "end" ? window.width - pill.width - margin : Math.round((window.width - pill.width) / 2);
  const y = edge === "top" ? inset : window.height - pill.height - inset;
  return { x: Math.max(0, x), y: Math.max(0, y) };
}
