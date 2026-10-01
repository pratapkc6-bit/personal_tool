import Link from "next/link";
import { Compass } from "lucide-react";

export default function NotFound(){
  return <div className="recovery-page">
    <section className="recovery-card">
      <span className="recovery-icon"><Compass size={24}/></span>
      <p className="professional-kicker">404 · LOST SIGNAL</p>
      <h1>This route does not exist.</h1>
      <p>The app is intact. This particular corner of the universe is simply empty.</p>
      <div><Link href="/" className="professional-primary">Command Center</Link><Link href="/search" className="professional-secondary">Search Zoro</Link></div>
    </section>
  </div>;
}