const TZ=process.env.APP_TIMEZONE||"Australia/Darwin";
const LAT=Number(process.env.APP_WEATHER_LAT||-12.4634);
const LONG=Number(process.env.APP_WEATHER_LONG||130.8456);

async function fetchJson(url:string,init?:RequestInit,timeoutMs=5000){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),timeoutMs);
  try{
    const response=await fetch(url,{...init,signal:controller.signal,next:{revalidate:900}});
    if(!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  }finally{clearTimeout(timer)}
}

export type GatewaySource<T=unknown>={
  source:string;
  status:"ok"|"degraded"|"not_configured";
  updatedAt:string;
  data:T|null;
  note?:string;
};

export async function getAirQuality():Promise<GatewaySource>{
  try{
    const u=new URL("https://air-quality-api.open-meteo.com/v1/air-quality");
    u.searchParams.set("latitude",String(LAT));
    u.searchParams.set("longitude",String(LONG));
    u.searchParams.set("timezone",TZ);
    u.searchParams.set("current","us_aqi,pm2_5,pm10,ozone,nitrogen_dioxide,uv_index");
    u.searchParams.set("forecast_days","2");
    const data=await fetchJson(u.toString());
    return {
      source:"Open-Meteo Air Quality",
      status:"ok",
      updatedAt:new Date().toISOString(),
      data:{current:data.current,current_units:data.current_units},
      note:"Model-based air-quality and UV data for planning; not a substitute for emergency health guidance."
    };
  }catch{
    return {source:"Open-Meteo Air Quality",status:"degraded",updatedAt:new Date().toISOString(),data:null,note:"Air-quality source temporarily unavailable."};
  }
}

export async function searchLocations(query:string):Promise<GatewaySource>{
  const q=query.trim();
  if(q.length<2) return {source:"Open-Meteo Geocoding",status:"ok",updatedAt:new Date().toISOString(),data:{results:[]},note:"Enter at least two characters."};
  try{
    const u=new URL("https://geocoding-api.open-meteo.com/v1/search");
    u.searchParams.set("name",q);
    u.searchParams.set("count","8");
    u.searchParams.set("language","en");
    u.searchParams.set("format","json");
    const data=await fetchJson(u.toString());
    return {source:"Open-Meteo Geocoding / GeoNames",status:"ok",updatedAt:new Date().toISOString(),data:{results:data.results||[]}};
  }catch{
    return {source:"Open-Meteo Geocoding / GeoNames",status:"degraded",updatedAt:new Date().toISOString(),data:null,note:"Location search temporarily unavailable."};
  }
}

export async function searchPlaces(query:string):Promise<GatewaySource>{
  const key=process.env.GOOGLE_MAPS_API_KEY||process.env.GOOGLE_PLACES_API_KEY;
  if(!key){
    return {source:"Google Places",status:"not_configured",updatedAt:new Date().toISOString(),data:null,note:"Add GOOGLE_MAPS_API_KEY to enable place search."};
  }
  const q=query.trim();
  if(q.length<2) return {source:"Google Places",status:"ok",updatedAt:new Date().toISOString(),data:{places:[]}};
  try{
    const data=await fetchJson("https://places.googleapis.com/v1/places:searchText",{
      method:"POST",
      headers:{
        "Content-Type":"application/json",
        "X-Goog-Api-Key":key,
        "X-Goog-FieldMask":"places.id,places.displayName,places.formattedAddress,places.location,places.primaryType,places.googleMapsUri"
      },
      body:JSON.stringify({textQuery:q,pageSize:8,regionCode:"AU"})
    });
    return {source:"Google Places",status:"ok",updatedAt:new Date().toISOString(),data:{places:data.places||[]}};
  }catch{
    return {source:"Google Places",status:"degraded",updatedAt:new Date().toISOString(),data:null,note:"Google Places is configured but temporarily unavailable."};
  }
}

export function getGatewayCapabilities(){
  const placesConfigured=Boolean(process.env.GOOGLE_MAPS_API_KEY||process.env.GOOGLE_PLACES_API_KEY);
  return [
    {id:"environment.air_quality",provider:"Open-Meteo",status:"ready",description:"AQI, PM2.5, PM10, ozone, nitrogen dioxide and UV."},
    {id:"location.search",provider:"Open-Meteo Geocoding",status:"ready",description:"Resolve cities and postal codes into coordinates and timezones."},
    {id:"places.search",provider:"Google Places",status:placesConfigured?"ready":"needs_key",description:"Search real places and businesses with Maps links."},
  ] as const;
}
