export type MapBounds=[number,number,number,number];
export const worldMapView={center:[20,0] as [number,number],zoom:2};
export function readMapBounds(raw:string):MapBounds|null{
 const values=raw.split(',');if(values.length!==4||values.some(v=>!v.trim()))return null;
 const b=values.map(Number) as MapBounds;
 return b.some(v=>!Number.isFinite(v))||Math.abs(b[0])>180||Math.abs(b[2])>180||Math.abs(b[1])>85||Math.abs(b[3])>85||b[0]===b[2]||b[1]>=b[3]?null:b;
}
const wrap=(longitude:number)=>((longitude+180)%360+360)%360-180;
export function viewportMapBounds(west:number,south:number,east:number,north:number):MapBounds|null{
 if(![west,south,east,north].every(Number.isFinite))return null;
 const span=east<west?east-west+360:east-west;
 if(span<=0||south>=north)return null;
 const w=span>=359.999?-180:wrap(west),e=span>=359.999?180:wrap(west+span);
 return readMapBounds([w,Math.max(-85,south),e,Math.min(85,north)].map(v=>v.toFixed(5)).join(','));
}
export function nearbyMapBounds(latitude:number,longitude:number,halfWidthKm=25):MapBounds|null{
 if(!Number.isFinite(latitude)||!Number.isFinite(longitude)||Math.abs(latitude)>85||Math.abs(longitude)>180||!Number.isFinite(halfWidthKm)||halfWidthKm<=0||halfWidthKm>100)return null;
 const dy=halfWidthKm/111.195,dx=dy/Math.max(.087,Math.cos(latitude*Math.PI/180));
 return viewportMapBounds(longitude-dx,latitude-dy,longitude+dx,latitude+dy);
}
export function mapAreaSegments(bounds:MapBounds):MapBounds[]{
 const [w,s,e,n]=bounds;
 if(w>e)return ([[w,s,180,n],[-180,s,e,n]] as MapBounds[]).filter(b=>b[0]<b[2]).flatMap(b=>mapAreaSegments(b));
 if(e-w>180){const mid=(w+e)/2;return [[w,s,mid,n],[mid,s,e,n]];}
 return [bounds];
}
export function mapAreaGeometry(bounds:MapBounds):string[]{
 return mapAreaSegments(bounds).map(([w,s,e,n])=>`POLYGON((${w} ${s},${e} ${s},${e} ${n},${w} ${n},${w} ${s}))`);
}
export function mapFitBounds([w,s,e,n]:MapBounds):[[number,number],[number,number]]{return [[s,w],[n,w>e?e+360:e]];}
