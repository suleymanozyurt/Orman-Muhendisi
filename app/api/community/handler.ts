type DB={prepare:(sql:string)=>{bind:(...values:unknown[])=>{all:<T>()=>Promise<{results:T[]}>;first:<T>()=>Promise<T|null>;run:()=>Promise<unknown>}}};
const reply=(data:unknown,status=200)=>Response.json(data,{status,headers:{"Cache-Control":"no-store"}});
export async function handleCommunity(request:Request,db:DB|undefined){
 const user=request.headers.get("oai-authenticated-user-id");if(!user)return reply({error:"AUTH_REQUIRED"},401);if(!db)return reply({error:"DATABASE_UNAVAILABLE"},503);
 const params=new URL(request.url).searchParams,q=(params.get("q")||"").trim();if(q.length>100)return reply({error:"INVALID_SEARCH"},400);
 try{
  if(request.method==="POST"){
   const origin=request.headers.get("origin");if(origin&&origin!==new URL(request.url).origin)return reply({error:"INVALID_ORIGIN"},403);
   let data:{userId?:unknown;follow?:unknown};try{const raw=await request.text();if(raw.length>1000)return reply({error:"INPUT_TOO_LONG"},413);data=JSON.parse(raw);}catch{return reply({error:"INVALID_INPUT"},400);}
   if(typeof data.userId!=="string"||!/^[a-zA-Z0-9_-]{1,100}$/.test(data.userId)||typeof data.follow!=="boolean"||data.userId===user)return reply({error:"INVALID_USER"},400);
   const target=await db.prepare("SELECT user_id FROM observations WHERE user_id=? AND status='approved' LIMIT 1").bind(data.userId).first();
   if(data.follow&&!target)return reply({error:"USER_NOT_FOUND"},404);
   if(data.follow)await db.prepare("INSERT OR IGNORE INTO follows (follower_id,followed_id,created_at) VALUES (?,?,?)").bind(user,data.userId,new Date().toISOString()).run();
   else await db.prepare("DELETE FROM follows WHERE follower_id=? AND followed_id=?").bind(user,data.userId).run();
   return reply({userId:data.userId,following:data.follow});
  }
  const [edges,count,people,stories]=await Promise.all([
   db.prepare("SELECT followed_id FROM follows WHERE follower_id=?").bind(user).all<{followed_id:string}>(),
   db.prepare("SELECT COUNT(*) AS count FROM follows WHERE followed_id=?").bind(user).first<{count:number}>(),
   db.prepare("SELECT o.user_id AS id,COALESCE(p.display_name,MAX(o.author)) AS name,COUNT(*) AS count,MAX(o.created_at) AS latest FROM observations o LEFT JOIN profiles p ON p.user_id=o.user_id WHERE o.status='approved' AND o.user_id<>? AND (p.display_name LIKE ? OR o.author LIKE ?) GROUP BY o.user_id ORDER BY latest DESC LIMIT 30").bind(user,`%${q}%`,`%${q}%`).all<{id:string;name:string;count:number}>(),
   db.prepare("SELECT id,user_id,author,image_key,created_at,plant_id,text FROM (SELECT o.*,ROW_NUMBER() OVER (PARTITION BY o.user_id ORDER BY o.created_at DESC,o.id DESC) AS position FROM observations o JOIN follows f ON f.followed_id=o.user_id AND f.follower_id=? WHERE o.status='approved' AND o.image_key IS NOT NULL) WHERE position=1 ORDER BY created_at DESC LIMIT 50").bind(user).all<{id:string;user_id:string;author:string;image_key:string;created_at:string;plant_id:string;text:string}>()
  ]);
  const following=edges.results.map(edge=>edge.followed_id);
  return reply({userId:user,following,followingCount:following.length,followerCount:count?.count||0,people:people.results.map(person=>({...person,following:following.includes(person.id)})),stories:stories.results.map(story=>({id:story.id,userId:story.user_id,author:story.author,image:`/api/image/${story.image_key}`,date:story.created_at,plantId:story.plant_id||undefined,note:story.text}))});
 }catch{return reply({error:"COMMUNITY_UNAVAILABLE"},503);}
}
