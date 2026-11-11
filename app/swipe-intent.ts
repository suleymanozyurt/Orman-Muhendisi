export type TouchPoint = { x: number; y: number };
// Reject vertical movement, short taps and multi-touch. Browser pinch/scroll remain native.
export function horizontalSwipe(start: TouchPoint, end: TouchPoint, viewportScale=1): -1 | 0 | 1 {
  if(viewportScale>1.01)return 0;
  const x = end.x - start.x, y = end.y - start.y;
  return Math.abs(x) >= 42 && Math.abs(x) > Math.abs(y) * 1.6 ? x < 0 ? 1 : -1 : 0;
}
export function downwardDismiss(start: TouchPoint, end: TouchPoint, viewportScale=1, elapsedMs?:number): boolean {
  if(viewportScale>1.01)return false;
  const x=end.x-start.x, y=end.y-start.y;
  const flick=y>=36&&elapsedMs!==undefined&&elapsedMs>0&&elapsedMs<=220&&y/elapsedMs>=.55;
  return (y>=88||flick) && y>Math.abs(x)*1.6;
}
