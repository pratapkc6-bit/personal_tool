import Link from "next/link";
import { CloudSun, DatabaseZap, Landmark, MapPin, RefreshCw, Radar } from "lucide-react";
import { getDataHub } from "@/lib/data-hub";
import { ImmersiveSectionArt } from "@/components/immersive-section-art";

export const dynamic="force-dynamic";
function rateRows(data:unknown){return Array.isArray(data)?data as Array<{quote?:string;rate?:number;date?:string}>:[]}

export default async function DataHubPage(){
 const hub=await getDataHub();
 const w=hub.sources.weather.data as any;
 const rates=rateRows(hub.sources.exchange.data);

 return <div className="nexus-page immersive-page immersive-page-intelligence">
   <ImmersiveSectionArt
     src="/assets/zoro-intel-approved.png"
     alt="Zoro Intelligence Dark Realm"
     kind="intel"
     hotspots={[
       {href:"/search",label:"Search",className:"hs-top-search"},
       {href:"/settings",label:"Settings",className:"hs-top-settings"},
       {href:"/inbox",label:"Inbox",className:"hs-intel-inbox"},
       {href:"/intelligence",label:"Insights",className:"hs-intel-insights"},
       {href:"/core",label:"Actions",className:"hs-intel-actions"},
       {href:"/notifications",label:"Watch",className:"hs-intel-watch"},
       {href:"/activity",label:"Archive",className:"hs-intel-archive"},
       {href:"/",label:"Home",className:"hs-nav-home"},
       {href:"/calendar",label:"Timeline",className:"hs-nav-timeline"},
       {href:"/assistant",label:"Zoro",className:"hs-nav-zoro"},
       {href:"/intelligence",label:"Intel",className:"hs-nav-intel"},
       {href:"/settings",label:"More",className:"hs-nav-more"},
     ]}
   />

   <div className="immersive-live-layer intelligence-live-layer">
     <header className="nexus-page-heading">
       <div className="nexus-page-icon"><Radar size={22}/></div>
       <div className="nexus-page-title">
         <p className="nexus-kicker">ZORO INTELLIGENCE</p>
         <h1>Intelligence Nexus</h1>
         <p>Live external signals, local context and source health gathered into one operational view.</p>
       </div>
       <div className="nexus-page-actions">
         <Link href="/inbox" className="nexus-secondary-action">Open Intel Inbox</Link>
         <Link href="/intelligence" className="hub-primary"><RefreshCw className="mr-2 inline" size={15}/>Refresh</Link>
       </div>
     </header>

     <section className="intelligence-realm-grid">
       <article className="zoro-intelligence-card intelligence-weather">
         <CloudSun/>
         <p className="zoro-intelligence-kicker">DARWIN WEATHER</p>
         <h2>{w?.current?.temperature_2m??"—"}°C</h2>
         <p>Feels {w?.current?.apparent_temperature??"—"}° · Wind {w?.current?.wind_speed_10m??"—"} km/h</p>
         <small>{hub.sources.weather.source} · {hub.sources.weather.status}</small>
       </article>

       <article className="zoro-intelligence-card intelligence-rates">
         <Landmark/>
         <p className="zoro-intelligence-kicker">AUD REFERENCE RATES</p>
         <div className="intelligence-rate-grid">
           {rates.slice(0,6).map(x=><div key={x.quote}><b>{x.quote}</b><span>{x.rate??"—"}</span></div>)}
         </div>
         <small>{hub.sources.exchange.source} · daily reference data</small>
       </article>

       <article className="zoro-intelligence-card intelligence-local">
         <MapPin/>
         <p className="zoro-intelligence-kicker">LOCAL INTELLIGENCE</p>
         <h2>Darwin / NT</h2>
         <p>Holiday context and local signals are available to Zoro reminders, briefings and alerts.</p>
         <small>{hub.sources.holidays.source}</small>
       </article>
     </section>

     <section className="zoro-intelligence-card intelligence-policy">
       <DatabaseZap/>
       <div>
         <p className="zoro-intelligence-kicker">SOURCE POLICY</p>
         <h2>Signals with provenance.</h2>
         <p>Zoro keeps source identity and health visible. Forecast data supports planning; official BOM warnings remain authoritative for Australian weather emergencies. Currency values are reference rates, not trading quotes.</p>
       </div>
     </section>

     <div className="intelligence-actions">
       <Link href="/inbox" className="hub-primary">Intel Inbox</Link>
       <Link href="/core" className="nexus-secondary-action">Core Actions</Link>
       <Link href="/settings/system" className="nexus-secondary-action">System Health</Link>
     </div>
   </div>
 </div>;
}
