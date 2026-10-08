export function petPosition(origin, point, area) {
  return {
    x: Math.round(Math.max(area.x, Math.min(origin.x + point.x - point.startX, area.x + area.width - origin.width))),
    y: Math.round(Math.max(area.y, Math.min(origin.y + point.y - point.startY, area.y + area.height - origin.height)))
  };
}
