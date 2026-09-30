import { listNtHolidays } from "@/lib/nt-holidays";

const TZ=process.env.APP_TIMEZONE||"Australia/Darwin";
const LAT=Number(process.env.APP_WEATHER_LAT||-12.4634);
const LONG=Number(process.env.APP_WEATHER_LONG||130.8456);

async function jsonFetch(url:string,ms=4500){
  const c=new AbortController(),timer=setTimeout(()=>c.abort(),ms);
  try{const r=await fetch(url,{signal:c.signal,next:{revalidate:900}});if(!r.ok)throw new Error(String(r.status));return await r.json();}
  finally{clearTimeout(timer)}
}
export type DataSourceState={source:string;status:"ok"|"degraded";updatedAt:string;data:unknown;note?:string};

export async function getDarwinWeather():Promise<DataSourceState>{
  try{
    const u=new URL("https://api.open-meteo.com/v1/forecast");
    u.searchParams.set("latitude",String(LAT));u.searchParams.set("longitude",String(LONG));u.searchParams.set("timezone",TZ);
    u.searchParams.set("current","temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,weather_code,wind_speed_10m,wind_gusts_10m");
    u.searchParams.set("daily","temperature_2m_max,temperature_2m_min,precipitation_probability_max,uv_index_max,sunrise,sunset");
    u.searchParams.set("forecast_days","3");
    const j=await jsonFetch(u.toString());
    return {source:"Open-Meteo",status:"ok",updatedAt:new Date().toISOString(),data:{current:j.current,daily:j.daily},note:"Forecast convenience data; official Australian warnings remain a BOM responsibility."};
  }catch{return {source:"Open-Meteo",status:"degraded",updatedAt:new Date().toISOString(),data:null,note:"Weather source temporarily unavailable."}}
}

export async function getExchangeRates():Promise<DataSourceState>{
  try{
    const j=await jsonFetch("https://api.frankfurter.dev/v2/rates?base=AUD&quotes=USD,EUR,GBP,NZD,INR,JPY,SGD");
    return {source:"Frankfurter",status:"ok",updatedAt:new Date().toISOString(),data:j,note:"Daily reference rates, not live trading quotes."};
  }catch{return {source:"Frankfurter",status:"degraded",updatedAt:new Date().toISOString(),data:null,note:"Exchange-rate source temporarily unavailable."}}
}

export function getNtHolidayFeed():DataSourceState{
  const year=Number(new Intl.DateTimeFormat("en-AU",{timeZone:TZ,year:"numeric"}).format(new Date()));
  return {source:"Zoro NT calendar",status:"ok",updatedAt:new Date().toISOString(),data:{year,holidays:listNtHolidays(year)},note:"Curated NT/Darwin holiday calendar used by Zoro alerts."};
}

export async function getDataHub(){
  const [weather,exchange]=await Promise.all([getDarwinWeather(),getExchangeRates()]);
  const holidays=getNtHolidayFeed();
  return {location:"Darwin, NT",timezone:TZ,generatedAt:new Date().toISOString(),sources:{weather,exchange,holidays}};
}
