import {readLinkPreview} from "./link-preview.ts";

type Reader = {prepare(sql:string):{bind(...values:unknown[]):{all<T>():Promise<{results:T[]}>}}};
type Row=Record<string,string|null>;
type Comment={author:string;text:string};
type Suggestion={id:string;plantId:string;author:string};
type Photo={key:string;url:string;organ?:string};
type User={id:string;isAdmin:boolean};
const PAGE_SIZE=150;

function append<T>(map:Map<string,T[]>,id:string,value:T){
 const list=map.get(id);
 if(list)list.push(value);else map.set(id,[value]);
}

export async function readObservationPage(db:Reader,user:User,offset:number,following:boolean,includeExternal:boolean){
 const query=following
  ? db.prepare("SELECT o.* FROM observations o JOIN follows f ON f.followed_id=o.user_id AND f.follower_id=? WHERE o.status='approved' ORDER BY o.created_at DESC,o.id DESC LIMIT ? OFFSET ?").bind(user.id,PAGE_SIZE+1,offset)
  : db.prepare("SELECT * FROM observations WHERE status='approved' OR user_id=? OR (?=1 AND status='pending') ORDER BY created_at DESC,id DESC LIMIT ? OFFSET ?").bind(user.id,user.isAdmin?1:0,PAGE_SIZE+1,offset);
 const {results}=await query.all<Row>();
 const rows=results.slice(0,PAGE_SIZE),ids=JSON.stringify(rows.map(row=>row.id));
 // A single bound JSON array keeps the request under D1's parameter limit.
 // Read attachments only for the returned page, preserving the album order.
 const [photos,comments,suggestions,counts]=await Promise.all([
  rows.length?db.prepare("SELECT observation_id,image_key,organ FROM observation_photos WHERE observation_id IN (SELECT value FROM json_each(?)) ORDER BY observation_id, CAST(position AS INTEGER),image_key").bind(ids).all<Record<string,string>>():{results:[]},
  rows.length||includeExternal?db.prepare("SELECT c.observation_id,c.author,c.text FROM comments c LEFT JOIN observations o ON o.id=c.observation_id WHERE ((o.status='approved' OR o.user_id=?) AND c.observation_id IN (SELECT value FROM json_each(?))) OR (?=1 AND c.observation_id LIKE 'gbif:%') ORDER BY c.created_at DESC,c.id DESC LIMIT 1000").bind(user.id,ids,includeExternal?1:0).all<Record<string,string>>():{results:[]},
  rows.length?db.prepare("SELECT id,observation_id,plant_id,author FROM identifications WHERE status='pending' AND observation_id IN (SELECT value FROM json_each(?)) ORDER BY created_at ASC,id ASC LIMIT 1000").bind(ids).all<Record<string,string>>():{results:[]},
  rows.length||includeExternal?db.prepare("SELECT observation_id,count(*) AS count FROM likes WHERE observation_id IN (SELECT value FROM json_each(?)) OR (?=1 AND observation_id LIKE 'gbif:%') GROUP BY observation_id").bind(ids,includeExternal?1:0).all<{observation_id:string;count:number}>():{results:[]}
 ]);
 const byPost=new Map<string,Comment[]>(),suggestionsByPost=new Map<string,Suggestion[]>(),photosByPost=new Map<string,Photo[]>();
 for(const row of comments.results.reverse())append(byPost,row.observation_id,{author:row.author,text:row.text});
 for(const row of suggestions.results)append(suggestionsByPost,row.observation_id,{id:row.id,plantId:row.plant_id,author:row.author});
 for(const row of photos.results)append(photosByPost,row.observation_id,{key:row.image_key,url:`/api/image/${row.image_key}`,organ:row.organ||undefined});
 const countByPost=new Map(counts.results.map(row=>[row.observation_id,row.count]));
 const externalEngagement=Object.fromEntries([...new Set([...byPost.keys(),...countByPost.keys()])].filter(id=>id.startsWith("gbif:")).map(id=>[id,{comments:byPost.get(id)||[],likeCount:countByPost.get(id)||0}]));
 return {
  hasMore:results.length>PAGE_SIZE,
  externalEngagement,
  posts:rows.map(row=>({
   id:row.id,author:row.author,text:row.text,date:new Date(row.created_at||"").toLocaleDateString("tr-TR"),createdAt:row.created_at,
   plantId:row.plant_id||undefined,image:row.image_key?`/api/image/${row.image_key}`:undefined,linkPreview:readLinkPreview(row.link_preview),
   status:row.status,observedAt:row.observed_at,reviewNote:row.review_note,photos:photosByPost.get(row.id||"")||[],organ:row.organ||undefined,
   position:row.latitude&&row.longitude?{latitude:Number(row.latitude),longitude:Number(row.longitude)}:undefined,
   comments:byPost.get(row.id||"")||[],suggestions:suggestionsByPost.get(row.id||"")||[],likeCount:countByPost.get(row.id||"")||0,
   owner:row.user_id===user.id,authorId:row.user_id
  }))
 };
}
