// All coordinates use the layout viewport, including Safari's visual viewport offset.
export function sectionMenuGeometry({viewportTop, viewportHeight, anchorBottom, bottomInset = 0}: {
  viewportTop: number; viewportHeight: number; anchorBottom: number; bottomInset?: number;
}) {
  const edge = 8;
  const start = viewportTop + edge;
  const end = Math.max(start, viewportTop + viewportHeight - Math.max(0, bottomInset) - edge);
  const belowAnchor = Math.max(start, anchorBottom + edge);
  // A short screen or an open keyboard needs the whole available area.
  const top = end - belowAnchor >= 240 ? belowAnchor : start;
  const height = Math.max(0, end - top);
  return {top, height, compact: height < 360};
}
