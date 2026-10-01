"use client";

import Link from "next/link";
import { AlertTriangle,RefreshCw } from "lucide-react";

export default function GlobalError({error,reset}:{error:Error&{digest?:string};reset:()=>void}){
  return <div className="recovery-page">
    <section className="recovery-card">
      <span className="recovery-icon"><AlertTriangle size={24}/></span>
      <p className="professional-kicker">ZORO RECOVERY</p>
      <h1>Something interrupted this screen.</h1>
      <p>Zoro kept the failure contained. Retry the page or return to the Command Center.</p>
      {error.digest&&<small>Reference · {error.digest}</small>}
      <div><button className="professional-primary" onClick={reset}><RefreshCw size={15}/> Retry</button><Link href="/" className="professional-secondary">Command Center</Link></div>
    </section>
  </div>;
}