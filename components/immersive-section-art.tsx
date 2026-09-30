import Link from "next/link";

type Hotspot={href:string;label:string;className:string};

export function ImmersiveSectionArt({
  src,alt,kind,hotspots,
}:{
  src:string;alt:string;kind:"timeline"|"intel"|"today"|"settings";hotspots:Hotspot[];
}){
  return <section className={"immersive-section-art immersive-"+kind} aria-label={alt}>
    <img src={src} alt={alt} className="immersive-section-image"/>
    <div className="immersive-hotspots">
      {hotspots.map(x=><Link key={x.className+x.href} href={x.href} className={"immersive-hotspot "+x.className} aria-label={x.label} title={x.label}><span>{x.label}</span></Link>)}
    </div>
  </section>
}