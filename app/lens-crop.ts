export type LensCrop = { x: number; y: number; width: number; height: number };
export const fullLensCrop: LensCrop = { x: 0, y: 0, width: 1, height: 1 };
const clamp = (value: number, low: number, high: number) => Math.max(low, Math.min(high, value));
/** Map a centered object-fit: cover preview to the visible sensor pixels. */
export function lensViewfinder(sourceWidth:number,sourceHeight:number,previewWidth:number,previewHeight:number,zoom=1):LensCrop {
  if (![sourceWidth,sourceHeight,previewWidth,previewHeight].every(value=>Number.isFinite(value)&&value>0)) return fullLensCrop;
  const scale=Math.max(previewWidth/sourceWidth,previewHeight/sourceHeight)*clampLensZoom(zoom);
  const width=Math.min(1,previewWidth/(sourceWidth*scale)),height=Math.min(1,previewHeight/(sourceHeight*scale));
  return {x:(1-width)/2,y:(1-height)/2,width,height};
}
export const clampLensZoom = (value:number) => Number.isFinite(value)?clamp(value,1,3):1;
export function focusLensCrop(x: number, y: number): LensCrop {
  if (![x, y].every(Number.isFinite)) return fullLensCrop;
  const size = .64;
  return { x: clamp(x - size / 2, 0, 1 - size), y: clamp(y - size / 2, 0, 1 - size), width: size, height: size };
}
export function drawLensCrop(x: number, y: number, endX: number, endY: number): LensCrop {
  if (![x, y, endX, endY].every(Number.isFinite)) return fullLensCrop;
  const left = clamp(Math.min(x, endX), 0, .88), top = clamp(Math.min(y, endY), 0, .88);
  return { x: left, y: top, width: clamp(Math.abs(endX - x), .12, 1 - left), height: clamp(Math.abs(endY - y), .12, 1 - top) };
}
export function moveLensCrop(start: LensCrop, dx: number, dy: number, corner?: string): LensCrop {
  if (![dx, dy].every(Number.isFinite)) return start;
  if (!corner) return { ...start, x: clamp(start.x + dx, 0, 1 - start.width), y: clamp(start.y + dy, 0, 1 - start.height) };
  const minimum = .12;
  let left = start.x, right = start.x + start.width, top = start.y, bottom = start.y + start.height;
  if (corner.includes("l")) left = clamp(left + dx, 0, right - minimum);
  if (corner.includes("r")) right = clamp(right + dx, left + minimum, 1);
  if (corner.includes("t")) top = clamp(top + dy, 0, bottom - minimum);
  if (corner.includes("b")) bottom = clamp(bottom + dy, top + minimum, 1);
  return { x: left, y: top, width: right - left, height: bottom - top };
}
export function lensCropPixels(crop: LensCrop, width: number, height: number) {
  if (![crop.x, crop.y, crop.width, crop.height, width, height].every(Number.isFinite) || width < 1 || height < 1 || crop.width <= 0 || crop.height <= 0) throw new Error("INVALID_CROP");
  const x = Math.round(clamp(crop.x, 0, 1) * (width - 1)), y = Math.round(clamp(crop.y, 0, 1) * (height - 1));
  return { x, y, width: Math.max(1, Math.min(width - x, Math.round(crop.width * width))), height: Math.max(1, Math.min(height - y, Math.round(crop.height * height))) };
}

/** Provider boxes describe the submitted image, which may itself be a crop. */
export function lensRegionCrop([top,left,bottom,right]:readonly number[], submitted:LensCrop = fullLensCrop):LensCrop {
  const x=submitted.x+left*submitted.width/1000, y=submitted.y+top*submitted.height/1000;
  const width=(right-left)*submitted.width/1000, height=(bottom-top)*submitted.height/1000;
  const padX=width*.08,padY=height*.08;
  return drawLensCrop(Math.max(0,x-padX),Math.max(0,y-padY),Math.min(1,x+width+padX),Math.min(1,y+height+padY));
}
export function mapLensRegionBox([top,left,bottom,right]:[number,number,number,number], submitted:LensCrop):[number,number,number,number]{
  return [top*submitted.height+1000*submitted.y,left*submitted.width+1000*submitted.x,bottom*submitted.height+1000*submitted.y,right*submitted.width+1000*submitted.x];
}
