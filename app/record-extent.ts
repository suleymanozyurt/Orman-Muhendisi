export function recordExtent(records:{lat:number;lng:number}[]):[[number,number],[number,number]]|null {
 const valid=records.filter(r=>Number.isFinite(r.lat)&&Number.isFinite(r.lng)&&Math.abs(r.lat)<=85&&Math.abs(r.lng)<=180);
 if(!valid.length)return null;
 const south=Math.min(...valid.map(r=>r.lat)),north=Math.max(...valid.map(r=>r.lat)),west=Math.min(...valid.map(r=>r.lng)),east=Math.max(...valid.map(r=>r.lng));
 const y=Math.max(.025,(north-south)*.08),x=Math.max(.025,(east-west)*.08);
 return [[Math.max(-85,south-y),Math.max(-180,west-x)],[Math.min(85,north+y),Math.min(180,east+x)]];
}
