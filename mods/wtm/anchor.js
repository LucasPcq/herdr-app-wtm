// Where the pill's window opens, from the window's size and style.js's position.
// Herdr places windows by absolute {x, y} only.
export function anchor(size, { width, height, edge, align, inset, margin }) {
  const x = align === "start" ? margin : align === "end" ? size.width - width - margin : Math.round((size.width - width) / 2);
  const y = edge === "top" ? inset : size.height - height - inset;
  return { x: Math.max(0, x), y: Math.max(0, y) };
}
