import { db } from "@/lib/db";
import { getGoogleServices } from "@/lib/google";

const PROFILE_TITLE="Zoro Personal Profile Context";
const CACHE_KEY="zoro_personal_profile_context";
const CACHE_TTL_MS=12*60*60*1000;
const MAX_PROFILE_CHARS=12000;

type CachedProfile={
  content:string;
  fileId:string;
  modifiedTime:string|null;
  syncedAt:string;
};

function readCached(value:unknown):CachedProfile|null{
  if(!value||typeof value!=="object")return null;
  const item=value as Partial<CachedProfile>;
  if(typeof item.content!=="string"||typeof item.fileId!=="string"||typeof item.syncedAt!=="string")return null;
  return {content:item.content,fileId:item.fileId,modifiedTime:typeof item.modifiedTime==="string"?item.modifiedTime:null,syncedAt:item.syncedAt};
}

function cleanProfile(text:string){
  return text.replace(/\u0000/g,"").replace(/\r/g,"").trim().slice(0,MAX_PROFILE_CHARS);
}

export async function syncPersonalProfileFromDrive(userId:string){
  const {drive}=await getGoogleServices(userId);
  const list=await drive.files.list({
    q:`name='${PROFILE_TITLE.replace(/'/g,"\\'")}' and trashed=false`,
    spaces:"drive",
    pageSize:10,
    orderBy:"modifiedTime desc",
    fields:"files(id,name,mimeType,modifiedTime)"
  });
  const file=(list.data.files||[]).find(item=>item.id&&item.mimeType==="application/vnd.google-apps.document");
  if(!file?.id)throw new Error("Zoro Personal Profile Context was not found in Google Drive.");

  const exported=await drive.files.export(
    {fileId:file.id,mimeType:"text/plain"},
    {responseType:"text"}
  );
  const content=cleanProfile(typeof exported.data==="string"?exported.data:String(exported.data||""));
  if(!content)throw new Error("The Zoro personal profile document is empty.");

  const cached:CachedProfile={
    content,
    fileId:file.id,
    modifiedTime:file.modifiedTime||null,
    syncedAt:new Date().toISOString()
  };
  await db.setting.upsert({
    where:{userId_key:{userId,key:CACHE_KEY}},
    create:{userId,key:CACHE_KEY,value:cached},
    update:{value:cached}
  });
  return cached;
}

export async function getPersonalProfileContext(userId:string){
  const setting=await db.setting.findUnique({where:{userId_key:{userId,key:CACHE_KEY}}});
  const cached=readCached(setting?.value);
  const fresh=cached&&Date.now()-Date.parse(cached.syncedAt)<CACHE_TTL_MS;
  if(fresh){
    return {status:"cached" as const,content:cached.content,syncedAt:cached.syncedAt,modifiedTime:cached.modifiedTime};
  }
  try{
    const synced=await syncPersonalProfileFromDrive(userId);
    return {status:"synced" as const,content:synced.content,syncedAt:synced.syncedAt,modifiedTime:synced.modifiedTime};
  }catch(error){
    if(cached){
      return {status:"stale-cache" as const,content:cached.content,syncedAt:cached.syncedAt,modifiedTime:cached.modifiedTime};
    }
    return {
      status:"unavailable" as const,
      content:"",
      syncedAt:null,
      modifiedTime:null,
      reason:error instanceof Error?error.message:"Google Drive profile could not be loaded."
    };
  }
}
