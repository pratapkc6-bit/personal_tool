"use client";
import { FormEvent,useState } from "react";
import { MapPinned,Search } from "lucide-react";

type LocationResult={id?:number;name?:string;admin1?:string;country?:string;latitude?:number;longitude?:number;timezone?:string};
type PlaceResult={id?:string;displayName?:{text?:string};formattedAddress?:string;googleMapsUri?:string};

export function IntelligenceLocationSearch(){
  const [query,setQuery]=useState("");
  const [busy,setBusy]=useState(false);
  const [locations,setLocations]=useState<LocationResult[]>([]);
  const [places,setPlaces]=useState<PlaceResult[]>([]);
  const [placesState,setPlacesState]=useState<"idle"|"ready"|"needs_key"|"degraded">("idle");

  async function run(e:FormEvent){
    e.preventDefault();
    const q=query.trim(); if(q.length<2)return;
    setBusy(true);
    try{
      const [locRes,placeRes]=await Promise.all([
        fetch(`/api/intelligence/locations?q=${encodeURIComponent(q)}`,{cache:"no-store"}),
        fetch(`/api/intelligence/places?q=${encodeURIComponent(q)}`,{cache:"no-store"})
      ]);
      const loc=locRes.ok?await locRes.json():null;
      const plc=placeRes.ok?await placeRes.json():null;
      setLocations(loc?.data?.results||[]);
      setPlaces(plc?.data?.places||[]);
      setPlacesState(plc?.status==="ok"?"ready":plc?.status==="not_configured"?"needs_key":"degraded");
    }finally{setBusy(false)}
  }

  return <section className="professional-card">
    <div className="professional-section-heading">
      <div><p className="professional-kicker">LOCATION INTELLIGENCE</p><h2>Search places and locations</h2></div>
      <MapPinned size={19}/>
    </div>
    <form onSubmit={run} className="professional-location-search">
      <div><Search size={17}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Darwin, pharmacy, airport…" aria-label="Search locations and places"/></div>
      <button className="professional-primary" disabled={busy||query.trim().length<2}>{busy?"Searching…":"Search"}</button>
    </form>

    {(locations.length>0||places.length>0||placesState==="needs_key")&&<div className="professional-location-results">
      <div>
        <strong>Locations</strong>
        {locations.slice(0,5).map((x,i)=><article key={x.id||i}><b>{x.name||"Location"}</b><span>{[x.admin1,x.country].filter(Boolean).join(", ")}</span><small>{x.timezone||""}{x.latitude!=null&&x.longitude!=null?` · ${x.latitude.toFixed(3)}, ${x.longitude.toFixed(3)}`:""}</small></article>)}
        {!locations.length&&<p>No matching locations.</p>}
      </div>
      <div>
        <strong>Places</strong>
        {places.slice(0,5).map((x,i)=><article key={x.id||i}><b>{x.displayName?.text||"Place"}</b><span>{x.formattedAddress||""}</span>{x.googleMapsUri&&<a href={x.googleMapsUri} target="_blank" rel="noreferrer">Open in Maps</a>}</article>)}
        {placesState==="needs_key"&&<p>Google Places is ready in code. Add GOOGLE_MAPS_API_KEY to activate business/place results.</p>}
        {placesState==="ready"&&!places.length&&<p>No matching places.</p>}
      </div>
    </div>}
  </section>;
}
