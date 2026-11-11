// Keep the selected tab prominent and reveal its neighbour without moving the page vertically.
export function tabScrollTarget(viewport:number, extent:number, left:number, width:number, nextRight?:number) {
  if(viewport<=0)return 0;
  const inset=12;
  let target=left-(viewport-width)/2;
  if(nextRight!==undefined && nextRight-left<=viewport-inset*2)
    target=Math.max(target,nextRight-viewport+inset);
  return Math.min(Math.max(0,extent-viewport),Math.max(0,target));
}
